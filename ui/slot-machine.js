// FireRed's Celadon Game Corner slot machine (src/slot_machine.c), drawn at
// 240x160 with FireRed's own pictures (assets/slot-machine/, made by
// tools/build-slot-machine.js) as a full-screen layer over the game.
//
//   const coins = await SlotMachine.play({
//     machineId,        // 0..21: which machine was used (FireRed's VAR_0x8004). As in
//                       // FireRed, the odds don't come from it: GetRandomSlotMachineId
//                       // picks one of the 6 odds tables at random every time you sit down.
//     coins,            // your coins now
//     maxCoins: 9999,
//     sfx,              // (name) => plays a sound effect ("se_shop", "se_pin", ...)
//     fanfare           // (name) => Promise: plays a jingle, resolves when it's done
//   })                  // -> your coins when you get up (B, then YES)
//
// The controls are FireRed's: Down bets 1 coin (on the middle line, then the
// top and bottom, then the diagonals), R (or Up, as the on-screen pad has no
// R) bets up to 3 at once, A starts the reels (3 coins in starts them by
// itself) and stops them left to right, Right shows the payouts (Left puts
// them away), B asks "Quit playing?". While a win is paid out, holding A pays
// faster and Start pays the rest at once.
//
// The rules (reel strips, payouts, and the "bias" that decides each spin
// which win the machine tries to give) are in SlotMachine.logic, which also
// loads in node: require("./ui/slot-machine.js").
(function () {
  "use strict";

  // =====================================================================
  // The rules (no DOM): a straight port of slot_machine.c's game logic.
  // =====================================================================
  const logic = (function () {
    const NUM_REELS = 3, REEL_LENGTH = 21, NUM_MATCH_LINES = 5;
    const ICON = { SEVEN: 0, ROCKET: 1, PIKACHU: 2, PSYDUCK: 3, CHERRIES: 4, MAGNEMITE: 5, SHELLDER: 6 };
    const ICON_NAMES = ["7", "Rocket", "Pikachu", "Psyduck", "Cherries", "Magnemite", "Shellder"];
    const PAYOUT = { NONE: 0, CHERRIES2: 1, CHERRIES3: 2, MAGSHELL: 3, PIKAPSY: 4, ROCKET: 5, SEVEN: 6 };
    const NUM_PAYOUT_TYPES = 7;
    const { SEVEN: S7, ROCKET: RO, PIKACHU: PI, PSYDUCK: PS, CHERRIES: CH, MAGNEMITE: MA, SHELLDER: SH } = ICON;

    // sReelIconAnimByReelAndPos
    const REELS = [
      [S7, PS, CH, RO, PI, SH, PI, MA, S7, SH, PS, RO, CH, PI, SH, S7, MA, PI, RO, SH, PI],
      [S7, MA, CH, PS, RO, MA, CH, PS, PI, MA, CH, PS, S7, MA, CH, RO, PS, SH, MA, PS, CH],
      [S7, PS, SH, MA, PI, PS, SH, MA, PI, PS, MA, SH, PI, PS, MA, SH, PI, PS, MA, SH, RO]
    ];
    // sPayoutTable
    const PAYOUTS = [0, 2, 6, 8, 15, 100, 300];
    // sReelBiasChances: per odds table, the thresholds (of Random() / 4) for each
    // bias; the last entry (PAYOUT_7) is instead the cooldown roll's chance.
    const BIAS_CHANCES = [
      [0x1fa1, 0x2eab, 0x3630, 0x39f3, 0x3bd4, 0x3bfc, 0x0049],
      [0x1f97, 0x2ea2, 0x3627, 0x39e9, 0x3bca, 0x3bf8, 0x0049],
      [0x1f91, 0x2e9b, 0x3620, 0x39e3, 0x3bc4, 0x3bf4, 0x0049],
      [0x1f87, 0x2e92, 0x3617, 0x39d9, 0x3bba, 0x3bef, 0x0050],
      [0x1f7f, 0x2e89, 0x360e, 0x39d1, 0x3bb2, 0x3bea, 0x0050],
      [0x1fc9, 0x2efc, 0x3696, 0x3a63, 0x3c49, 0x3c8b, 0x0073]
    ];
    // field_specials.c sSlotMachineIndices (GetRandomSlotMachineId)
    const SLOT_MACHINE_INDICES = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5];
    // Icons on the 3x3 window are numbered reel * 3 + row (row 0 the top).
    const SECOND_REEL_PAIRS = [[0, 3], [0, 6], [3, 6], [1, 4], [1, 7], [4, 7], [2, 5], [2, 8], [5, 8], [0, 4], [0, 8], [4, 8], [2, 4], [2, 6], [4, 6]];
    const THIRD_REEL_LINES = [[0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    // sRowAttributes: [col1, col2, col3, min bet], in line order TL-BR, top, middle, bottom, BL-TR.
    const LINES = [[0, 4, 8, 3], [0, 3, 6, 2], [1, 4, 7, 1], [2, 5, 8, 2], [2, 4, 6, 3]];
    const LINE_NAMES = ["diagonal \\", "top", "middle", "bottom", "diagonal /"];

    const wrap = (p) => ((p % REEL_LENGTH) + REEL_LENGTH) % REEL_LENGTH;
    const defaultRandom = () => Math.floor(Math.random() * 0x10000);   // like Random(): a u16

    function testIcon(attr, icon) {   // TestReelIconAttribute
      switch (attr) {
        case PAYOUT.NONE: return icon !== CH;
        case PAYOUT.CHERRIES2: case PAYOUT.CHERRIES3: return icon === CH;
        case PAYOUT.MAGSHELL: return icon === MA || icon === SH;
        case PAYOUT.PIKAPSY: return icon === PI || icon === PS;
        case PAYOUT.ROCKET: return icon === RO;
        case PAYOUT.SEVEN: return icon === S7;
        default: return false;
      }
    }
    function iconRank(icon) {   // ReelIconToPayoutRank
      switch (icon) {
        case MA: case SH: return PAYOUT.MAGSHELL;
        case PI: case PS: return PAYOUT.PIKAPSY;
        case RO: return PAYOUT.ROCKET;
        case S7: return PAYOUT.SEVEN;
        default: return PAYOUT.CHERRIES2;
      }
    }

    // The 9 icons showing when the reels are at `positions` (a reel's position
    // is the icon just above the window: rows show position + 1..3).
    function visibleIcons(positions) {
      const v = [];
      for (let r = 0; r < NUM_REELS; r++) for (let i = 0; i < 3; i++) v[r * 3 + i] = REELS[r][wrap(positions[r] + 1 + i)];
      return v;
    }

    // CalcPayout: what the lines bet on pay. -> { rank (the best win, a PAYOUT),
    // payout (coins), winFlags (per line, in LINES order) }
    function evaluate(positions, bet) {
      const icons = visibleIcons(positions), winFlags = [false, false, false, false, false];
      let best = 0, payout = 0;
      LINES.forEach(([c1, c2, c3, minBet], i) => {
        if (bet < minBet) return;
        let m;
        if (testIcon(PAYOUT.CHERRIES2, icons[c1])) m = testIcon(PAYOUT.CHERRIES3, icons[c2]) ? PAYOUT.CHERRIES3 : PAYOUT.CHERRIES2;
        else if (icons[c1] === icons[c2] && icons[c1] === icons[c3]) m = iconRank(icons[c1]);
        else m = 0;
        if (m) { winFlags[i] = true; payout += PAYOUTS[m]; }
        if (m > best) best = m;
      });
      return { rank: best, payout, winFlags };
    }

    // ---------- A machine (struct SlotMachineState) ----------

    function randomMachineIndex(random) {   // GetRandomSlotMachineId
      return SLOT_MACHINE_INDICES[(random || defaultRandom)() % SLOT_MACHINE_INDICES.length];
    }
    function createMachine(machineIdx, random) {
      if (!(machineIdx >= 0 && machineIdx < BIAS_CHANCES.length)) machineIdx = 0;
      return {
        machineIdx, random: random || defaultRandom,
        currentReel: 0, machineBias: 0, slotRewardClass: 0, biasCooldown: 0, bet: 0, payout: 0,
        reelIsSpinning: [false, false, false], reelPositions: [0, 0, 0], reelSubpixel: [0, 0, 0],
        destReelPos: [REEL_LENGTH, REEL_LENGTH, REEL_LENGTH], reelStopOrder: [0, 0, 0],
        reel2BiasInPlay: 0, winFlags: [false, false, false, false, false]
      };
    }

    // CalcSlotBias: before each spin, which win the machine works toward
    // (machineBias, a PAYOUT). A Rocket or 7 bias stays until something is won.
    function calcSlotBias(st) {
      const R = st.random, chances = BIAS_CHANCES[st.machineIdx];
      const rval = (R() & 0xffff) >> 2;
      let i;
      for (i = 0; i < NUM_PAYOUT_TYPES - 1; i++) if (rval < chances[i]) break;
      if (st.machineBias < PAYOUT.ROCKET) {
        if (st.biasCooldown === 0 && (R() & 0x3fff) < chances[PAYOUT.SEVEN]) st.biasCooldown = (R() & 1) ? 5 : 60;
        if (st.biasCooldown !== 0) {
          if (i === 0 && (R() & 0x3fff) < Math.trunc(0.7 * 0x3fff)) st.biasCooldown = (R() & 1) ? 5 : 60;
          st.biasCooldown--;
        }
        st.machineBias = i;
      }
    }
    function startReels(st) { for (let i = 0; i < NUM_REELS; i++) st.reelIsSpinning[i] = true; }

    function nextReelPosition(st, r) {   // GetNextReelPosition
      let p = st.reelPositions[r];
      if (st.reelSubpixel[r] !== 0) { p--; if (p < 0) p = REEL_LENGTH - 1; }
      return p;
    }

    // StopReel1: the first reel slips 0-4 icons, to one that suits the bias.
    function stopReel1(st, which) {
      const R = st.random, nextPos = nextReelPosition(st, which), samples = [];
      if (st.machineBias === 0 && which === 0) {
        // No win wanted: a stop with no cherries showing.
        for (let i = 0; i < 5; i++) {
          let j, p = nextPos - i + 1;
          for (j = 0; j < 3; j++, p++) {
            if (p >= REEL_LENGTH) p = 0;
            if (testIcon(PAYOUT.CHERRIES2, REELS[which][wrap(p)])) break;
          }
          if (j === 3) samples.push(i);
        }
      } else if (st.machineBias !== 1 || which === 0) {
        let p = nextPos + 1;
        for (let i = 0; i < 3; i++, p++) {
          if (p >= REEL_LENGTH) p = 0;
          if (testIcon(st.machineBias, REELS[which][p])) { samples.push(0); break; }
        }
        p = nextPos;
        for (let i = 0; i < 4; i++, p--) {
          if (p < 0) p = REEL_LENGTH - 1;
          if (testIcon(st.machineBias, REELS[which][p])) samples.push(i + 1);
        }
      }
      const slip = samples.length ? samples[R() % samples.length] : R() % 5;
      st.reelStopOrder[0] = which;
      st.destReelPos[which] = wrap(nextPos - slip);
    }

    function twoReelBiasCheck(r0, p0, r1, p1, bias) {
      const icons = [7, 7, 7, 7, 7, 7, 7, 7, 7];
      for (let i = 0; i < 3; i++) {
        icons[3 * r0 + i] = REELS[r0][p0]; icons[3 * r1 + i] = REELS[r1][p1];
        p0 = (p0 + 1) % REEL_LENGTH; p1 = (p1 + 1) % REEL_LENGTH;
      }
      const pairs = SECOND_REEL_PAIRS;
      switch (bias) {
        case 0:
          for (let i = 0; i < 3; i++) if (testIcon(1, icons[i])) return false;
          for (let i = 0; i < 15; i++) if (icons[pairs[i][0]] === icons[pairs[i][1]]) return true;
          return false;
        case 1:
          if (r0 === 0 || r1 === 0) {
            if (r0 === 1 || r1 === 1) for (let i = 0; i < 15; i += 3) if (icons[pairs[i][0]] === icons[pairs[i][1]]) return false;
            for (let i = 0; i < 3; i++) if (testIcon(bias, icons[i])) return true;
            return false;
          }
          return true;
        case 2:
          if (r0 === 2 || r1 === 2) {
            for (let i = 0; i < 9; i++) if (testIcon(bias, icons[i])) return true;
            return false;
          }
      }
      for (let i = 0; i < 15; i++) if (icons[pairs[i][0]] === icons[pairs[i][1]] && testIcon(bias, icons[pairs[i][0]])) return true;
      return false;
    }

    // StopReel2: the first of the next 5 stops that keeps the bias's win possible.
    function stopReel2(st, which) {
      const firstId = st.reelStopOrder[0], firstPos = wrap(st.reelPositions[firstId] + 1);
      const nextPos = nextReelPosition(st, which);
      let pos = wrap(nextPos + 1);
      const possible = [];
      for (let i = 0; i < 5; i++) {
        if (twoReelBiasCheck(firstId, firstPos, which, pos, st.machineBias)) possible.push(i);
        pos--; if (pos < 0) pos = REEL_LENGTH - 1;
      }
      let slip;
      if (!possible.length) { st.reel2BiasInPlay = 0; slip = st.machineBias === PAYOUT.ROCKET || st.machineBias === PAYOUT.SEVEN ? 4 : 0; }
      else { st.reel2BiasInPlay = 1; slip = possible[0]; }
      st.reelStopOrder[1] = which;
      st.destReelPos[which] = wrap(nextPos - slip);
    }

    function oneReelBiasCheck(st, reelId, reelPos, bias) {
      const icons = [];
      const o0 = st.reelStopOrder[0], o1 = st.reelStopOrder[1];
      let p0 = wrap(st.reelPositions[o0] + 1), p1 = wrap(st.reelPositions[o1] + 1);
      reelPos = wrap(reelPos + 1);
      for (let i = 0; i < 3; i++) {
        icons[o0 * 3 + i] = REELS[o0][p0]; icons[o1 * 3 + i] = REELS[o1][p1]; icons[reelId * 3 + i] = REELS[reelId][reelPos];
        p0 = (p0 + 1) % REEL_LENGTH; p1 = (p1 + 1) % REEL_LENGTH; reelPos = (reelPos + 1) % REEL_LENGTH;
      }
      const L = THIRD_REEL_LINES;
      switch (bias) {
        case PAYOUT.NONE:
          for (let i = 0; i < 3; i++) if (testIcon(1, icons[i])) return false;
          for (const [a, b, c] of L) if (icons[a] === icons[b] && icons[a] === icons[c]) return false;
          return true;
        case PAYOUT.CHERRIES2:
          for (const [a, b] of L) if (icons[a] === icons[b] && testIcon(bias, icons[a])) return false;
          for (let i = 0; i < 3; i++) if (testIcon(bias, icons[i])) return true;
          return false;
        case PAYOUT.CHERRIES3:
          for (const [a, b] of L) if (icons[a] === icons[b] && testIcon(bias, icons[a])) return true;
          return false;
      }
      for (const [a, b, c] of L) if (icons[a] === icons[b] && icons[a] === icons[c] && testIcon(bias, icons[a])) return true;
      return false;
    }

    // StopReel3: the first of the next 5 stops that makes the bias's win (or,
    // with no win wanted, makes none).
    function stopReel3(st, which) {
      const nextPos = nextReelPosition(st, which);
      let testPos = nextPos;
      const possible = [];
      for (let i = 0; i < 5; i++) {
        if (oneReelBiasCheck(st, which, testPos, st.machineBias)) possible.push(i);
        testPos--; if (testPos < 0) testPos = REEL_LENGTH - 1;
      }
      const slip = possible.length ? possible[0] : st.machineBias === PAYOUT.ROCKET || st.machineBias === PAYOUT.SEVEN ? 4 : 0;
      st.destReelPos[which] = wrap(nextPos - slip);
    }

    // A pressed: stop the current reel (the n-th to stop decides how it picks).
    function stopReel(st, which, nth) {
      if (nth == null) nth = which;
      if (nth === 0) stopReel1(st, which);
      else if (nth === 1) stopReel2(st, which);
      else stopReel3(st, which);
    }

    // Task_SpinReels: one frame. The reels move 8 pixels a frame, an icon (24
    // pixels) every 3 frames, and stop with an icon square in each row.
    function spinStep(st) {
      for (let i = 0; i < NUM_REELS; i++) {
        if (!(st.reelIsSpinning[i] || st.reelSubpixel[i] !== 0)) continue;
        if (st.reelSubpixel[i] !== 0 || st.reelPositions[i] !== st.destReelPos[i]) {
          st.reelSubpixel[i]++;
          if (st.reelSubpixel[i] > 2) {
            st.reelSubpixel[i] = 0;
            st.reelPositions[i]--;
            if (st.reelPositions[i] < 0) st.reelPositions[i] = REEL_LENGTH - 1;
          }
          if (st.reelPositions[i] !== st.destReelPos[i]) continue;
        }
        st.destReelPos[i] = REEL_LENGTH;
        st.reelIsSpinning[i] = false;
      }
    }

    // CalcPayout on the machine: sets payout and winFlags, returns the rank.
    function calcPayout(st) {
      const r = evaluate(st.reelPositions, st.bet);
      st.payout = r.payout;
      st.winFlags = r.winFlags;
      return r.rank;
    }
    const resetMachineBias = (st) => { st.machineBias = 0; };

    return {
      NUM_REELS, REEL_LENGTH, NUM_MATCH_LINES, ICON, ICON_NAMES, PAYOUT, PAYOUTS, REELS, BIAS_CHANCES,
      SLOT_MACHINE_INDICES, LINES, LINE_NAMES,
      testIcon, visibleIcons, evaluate, randomMachineIndex, createMachine, calcSlotBias, startReels,
      stopReel, spinStep, calcPayout, resetMachineBias
    };
  })();

  if (typeof module !== "undefined" && module.exports) module.exports = logic;
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // =====================================================================
  // The screen
  // =====================================================================
  const W = 240, H = 160, FRAME_MS = 1000 / 60;
  const ASSET = (n) => "assets/slot-machine/" + n + ".png";
  const BACKDROP = "rgb(247,247,255)";   // SetBackdropColor(RGB(30, 30, 31))
  // HBlankCB_SlotMachine, lines 43-126: the reel icons' horizontal scale
  // (sReelIconAffineParams, 0x100 = 1) and the darkening (sReelIconBldY, /16):
  // the reels look round.
  const AFFINE = [
    0x120, 0x11f, 0x11e, 0x11d, 0x11c, 0x11b, 0x11a, 0x119, 0x118, 0x117, 0x116, 0x115, 0x114, 0x113, 0x112, 0x111,
    0x110, 0x10f, 0x10e, 0x10d, 0x10c, 0x10b, 0x10a, 0x109, 0x108, 0x107, 0x106, 0x105, 0x104, 0x103, 0x102, 0x101,
    0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100,
    0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100, 0x100,
    0x101, 0x102, 0x103, 0x104, 0x105, 0x106, 0x107, 0x108, 0x109, 0x10a, 0x10b, 0x10c, 0x10d, 0x10e, 0x10f, 0x110,
    0x111, 0x112, 0x113, 0x114, 0x115, 0x116, 0x117, 0x118, 0x119, 0x11a, 0x11b, 0x11c, 0x11d, 0x11e, 0x11f, 0x120
  ];
  const BLDY = [
    16, 16, 16, 16, 15, 14, 13, 13, 12, 11, 10, 10, 9, 8, 7, 7, 6, 5, 4, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15, 15, 15, 15, 15, 15
  ];
  const HBLANK_TOP = 0x2b;
  // sAnimTable_Clefairy: [frame, duration] loops (neutral, spinning, payout, lose).
  const CLEFAIRY_ANIMS = [[[0, 4]], [[0, 24], [1, 24]], [[2, 28], [3, 28]], [[4, 12], [5, 12]]];
  const BUTTON_X = [72, 112, 152];   // sReelButtonMapTileIdxs (row 17)
  const LINE_NORMAL = 0, LINE_BET = 1, LINE_MATCH = 2;

  const images = {};
  const img = (n) => {
    if (!images[n]) { const i = new Image(); i.src = ASSET(n); images[n] = i; }
    return images[n];
  };
  const ready = (i) => i && i.complete && i.naturalWidth;
  const NAMES = ["bg", "lines", "lines-fixed", "lights", "button-pressed", "reel-icons", "clefairy", "digits", "combos", "dpad-down"];
  const preload = () => Promise.all(NAMES.map((n) => {
    const i = img(n);
    return ready(i) ? null : new Promise((r) => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); });
  }));
  const mk = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });

  let active = null;

  function play(opts) {
    opts = opts || {};
    if (active) return active.promise;
    const maxCoins = opts.maxCoins == null ? 9999 : opts.maxCoins;
    const sfxFn = opts.sfx || ((n) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(n); });
    const fanfareFn = opts.fanfare || ((n) => (window.GameAudio && window.GameAudio.fanfare ? window.GameAudio.fanfare(n) : Promise.resolve()));
    const sfx = (n) => { if (n) try { sfxFn(n); } catch (e) { /* ignore */ } };
    // FireRed's sounds, as this game's audio has them: SE_RS_SHOP (a coin in)
    // is SE_SHOP here, and SE_CONTEST_PLACE (a reel stopping) isn't built, so
    // the reels stop silently.
    const SE = { bet: "se_shop", stop: null, pin: "se_pin", win: "se_win_open", select: "se_select" };

    const random = opts.rng || undefined;   // (testing: a function returning 0..65535)
    const oddsIdx = opts.oddsIndex != null ? opts.oddsIndex : logic.randomMachineIndex(random);
    const m = logic.createMachine(oddsIdx, random);
    let coins = Math.max(0, Math.min(maxCoins, Math.floor(+opts.coins || 0)));
    const addCoins = (n) => { if (coins >= maxCoins) return false; coins = Math.min(maxCoins, coins + n); return true; };
    const removeCoins = (n) => { if (coins >= n) { coins -= n; return true; } return false; };

    // ---------- What's on screen ----------
    const v = {
      fade: 16,                 // 0 (clear) .. 16 (black)
      fadeTo: 16,
      lineStates: [0, 0, 0, 0, 0],
      buttons: [false, false, false],
      clefairy: { anim: 0, step: 0, timer: 0 },
      flash: null,              // Task_FlashWinningLine's data
      help: { x: 0, state: null },   // the combos window sliding in (bg1X)
      message: null,            // window 0's text
      yesNo: null,              // { cursor }
      bg0Dirty: true
    };
    const setClefairy = (anim) => { v.clefairy = { anim, step: 0, timer: 0 }; };
    function setLineStatesByBet() {
      const s = v.lineStates;
      s.fill(LINE_NORMAL);
      if (m.bet >= 1) s[2] = LINE_BET;
      if (m.bet >= 2) { s[1] = LINE_BET; s[3] = LINE_BET; }
      if (m.bet >= 3) { s[0] = LINE_BET; s[4] = LINE_BET; }
    }

    // ---------- The canvas ----------
    const canvas = mk(W * 2, H * 2);
    canvas.className = "slot-machine";
    canvas.setAttribute("aria-label", "Slot machine");
    const screenEl = document.querySelector(".screen") || document.body;
    const overlayEl = document.getElementById("overlay");
    if (overlayEl && overlayEl.parentNode === screenEl) screenEl.insertBefore(canvas, overlayEl.nextSibling);
    else screenEl.appendChild(canvas);
    const out = canvas.getContext("2d");
    const frameBuf = mk(W, H), g = frameBuf.getContext("2d");
    const reelLayer = mk(W, H), rg = reelLayer.getContext("2d");
    const strip = mk(32, H), sg = strip.getContext("2d");
    const lineTmp = mk(W, H), lg = lineTmp.getContext("2d");
    let bg0 = null;

    // ---------- Input ----------
    const KEY = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      z: "a", Z: "a", " ": "a", Enter: "a", x: "b", X: "b", Escape: "b", Backspace: "b",
      r: "r", R: "r", Start: "start", Select: "select", m: "start", M: "start" };
    const pressed = [], held = new Set();
    const onDown = (e) => {
      const k = KEY[e.key];
      if (!k) return;
      e.preventDefault(); e.stopImmediatePropagation();
      held.add(k);
      if (!e.repeat) pressed.push(k);
    };
    const onUp = (e) => {
      const k = KEY[e.key];
      if (!k) return;
      e.preventDefault(); e.stopImmediatePropagation();
      held.delete(k);
    };
    const onBlur = () => held.clear();
    document.addEventListener("keydown", onDown, true);
    document.addEventListener("keyup", onUp, true);
    window.addEventListener("blur", onBlur);
    let newKeys = new Set();
    const isNew = (...ks) => ks.some((k) => newKeys.has(k));
    // (Up stands in for R; Start, outside the payout, for A, as Enter is Start in this game.)
    const isBetMax = () => isNew("r", "up");

    // ---------- The main task (MainTask_*) ----------
    let task = null, data = [0, 0, 0, 0, 0, 0];
    const setTask = (t) => { task = t; data = [0, 0, 0, 0, 0, 0]; };
    let fanfareActive = false;
    const playFanfare = (name) => {
      fanfareActive = true;
      let p;
      try { p = fanfareFn(name); } catch (e) { p = null; }
      Promise.resolve(p).catch(() => {}).then(() => { fanfareActive = false; });
    };
    let resolveDone;
    const promise = new Promise((r) => { resolveDone = r; });

    function gameLoop() {
      switch (data[0]) {
        case 0:   // betting
          if (coins === 0) setTask(noCoins);
          else if (isNew("down")) {
            m.bet++; removeCoins(1); sfx(SE.bet);
            setLineStatesByBet();
            data[0] = 1;
          } else if (isBetMax()) {
            const toAdd = 3 - m.bet;
            if (coins >= toAdd) { m.bet = 3; removeCoins(toAdd); } else { m.bet += coins; coins = 0; }
            sfx(SE.bet);
            setLineStatesByBet();
            data[0] = 1;
          } else if (isNew("a", "start") && m.bet !== 0) data[0] = 2;
          else if (isNew("b")) setTask(confirmExit);
          else if (isNew("right")) setTask(showHelp);
          break;
        case 1:
          data[0] = m.bet === 3 || coins === 0 ? 2 : 0;
          break;
        case 2:   // spin
          logic.calcSlotBias(m);
          logic.startReels(m);
          m.currentReel = 0;
          setClefairy(1);
          data[0] = 3;
          break;
        case 3:
          if (isNew("a", "start")) {
            sfx(SE.stop);
            logic.stopReel(m, m.currentReel, m.currentReel);
            v.buttons[m.currentReel] = true;
            data[0] = 4;
          }
          break;
        case 4:
          if (!m.reelIsSpinning[m.currentReel]) {
            m.currentReel++;
            if (m.currentReel >= logic.NUM_REELS) {
              m.slotRewardClass = logic.calcPayout(m);
              m.bet = 0;
              m.currentReel = 0;
              if (m.slotRewardClass === logic.PAYOUT.NONE) setTask(darnNoPayout);
              else { logic.resetMachineBias(m); setTask(winPayout); }
            } else data[0] = 3;
          }
          break;
      }
    }
    function noCoins() {
      switch (data[0]) {
        case 0: v.message = "You've run out of Coins.\nGame over!"; v.bg0Dirty = true; data[0] = 2; break;
        case 2: if (isNew("a", "b", "up", "down", "left", "right", "start")) setTask(exitSlots); break;
      }
    }
    function showHelp() {
      switch (data[0]) {
        case 0: v.help.state = "in"; v.help.x = 0; sfx(SE.win); data[0] = 1; break;
        case 1: if (v.help.state === "shown") data[0] = 2; break;
        case 2: if (isNew("left")) { v.help.state = "out"; sfx(SE.win); data[0] = 3; } break;
        case 3: if (v.help.state === null) setTask(gameLoop); break;
      }
    }
    function confirmExit() {
      switch (data[0]) {
        case 0: v.message = "Quit playing?"; v.yesNo = { cursor: 0 }; v.bg0Dirty = true; data[0] = 2; break;
        case 2: {
          // Menu_ProcessInputNoWrapClearOnChoose
          const yn = v.yesNo;
          let choice = null;
          if (isNew("up") && yn.cursor > 0) { yn.cursor--; sfx(SE.select); v.bg0Dirty = true; }
          else if (isNew("down") && yn.cursor < 1) { yn.cursor++; sfx(SE.select); v.bg0Dirty = true; }
          else if (isNew("a", "start")) { sfx(SE.select); choice = yn.cursor; }
          else if (isNew("b")) { sfx(SE.select); choice = 1; }
          if (choice === 0) { v.yesNo = null; v.bg0Dirty = true; addCoins(m.bet); m.bet = 0; setTask(exitSlots); }
          else if (choice === 1) { v.yesNo = null; v.message = null; v.bg0Dirty = true; setTask(gameLoop); }
          break;
        }
      }
    }
    function darnNoPayout() {
      switch (data[0]) {
        case 0: setClefairy(3); data[1] = 0; data[0]++; break;
        case 1:
          if (++data[1] > 60) {
            setClefairy(0); setLineStatesByBet(); v.buttons.fill(false);
            setTask(gameLoop);
          }
          break;
      }
    }
    function winPayout() {
      switch (data[0]) {
        case 0:
          playFanfare(m.slotRewardClass === logic.PAYOUT.ROCKET || m.slotRewardClass === logic.PAYOUT.SEVEN ? "mus_slots_jackpot" : "mus_slots_win");
          setClefairy(2);
          v.flash = { state: 0, d1: 0, d2: 0, d4: 0, d5: 0, light: 0 };
          data[1] = 8; data[0]++;
          break;
        case 1:
          if (++data[1] > 120) { data[1] = held.has("a") ? 2 : 8; data[0]++; }
          break;
        case 2:
          if (!fanfareActive && isNew("start")) { addCoins(m.payout); m.payout = 0; }
          else if (--data[1] === 0) {
            if (!fanfareActive) sfx(SE.pin);
            if (m.payout !== 0) { addCoins(1); m.payout--; }
            data[1] = held.has("a") ? 2 : 8;
          }
          if (m.payout === 0) data[0]++;
          break;
        case 3:
          if (!fanfareActive) { if (v.flash) v.flash.state = 2; data[0]++; }
          break;
        case 4:
          if (!v.flash) { setClefairy(0); setLineStatesByBet(); v.buttons.fill(false); setTask(gameLoop); }
          break;
      }
    }
    function exitSlots() {
      switch (data[0]) {
        case 0: v.fadeTo = 16; data[0]++; break;
        case 1: if (v.fade >= 16) { data[0]++; finish(); } break;
      }
    }

    // ---------- Animations (the setup tasks, Task_FlashWinningLine) ----------
    const SIN = (i) => Math.trunc(Math.sin((i & 0xff) / 256 * 2 * Math.PI) * 256);   // gSineTable
    function animate() {
      if (v.fade !== v.fadeTo) v.fade += v.fade < v.fadeTo ? Math.min(2, v.fadeTo - v.fade) : -Math.min(2, v.fade - v.fadeTo);
      // Clefairy
      const c = v.clefairy, seq = CLEFAIRY_ANIMS[c.anim];
      if (seq.length > 1 && ++c.timer >= seq[c.step][1]) { c.timer = 0; c.step = (c.step + 1) % seq.length; }
      // The combos window
      const h = v.help;
      if (h.state === "in") { h.x += 16; if (h.x >= 256) { h.x = 256; h.state = "shown"; } }
      else if (h.state === "out") { h.x -= 16; if (h.x <= 0) { h.x = 0; h.state = null; } }
      // The winning lines flashing and the payout lights
      const f = v.flash;
      if (f) {
        if (f.state === 0) {
          m.winFlags.forEach((w, i) => { if (w) v.lineStates[i] = LINE_MATCH; });
          f.state = 1;
        } else if (f.state === 1) {
          if (f.d1 === 0) { f.light = SIN(f.d2) >> 7; f.d2 = (f.d2 + 32) & 0x7f; f.d1 = 8; } else f.d1--;
          f.d4 = (f.d4 + 8) & 0x7f;
          f.d5 = SIN(f.d4) >> 5;
        } else if (f.state === 2) {
          m.winFlags.forEach((w, i) => { if (w) v.lineStates[i] = LINE_NORMAL; });
          f.state = 3;
        } else v.flash = null;
      }
    }

    // ---------- Drawing ----------
    function drawBg0() {
      const G = window.GBA_MENUS, Surface = window.GbaMenus && window.GbaMenus.Surface;
      v.bg0Dirty = false;
      if (!G || !Surface) { bg0 = null; return; }
      const s = Surface(), std2 = G.palettes.std2, std3 = G.palettes.std3;
      // Window 1: the controls along the top (FONT_SMALL, right-aligned to 236;
      // white on palette 2's colour 15, dark grey shadow).
      s.fill(0, 0, W, 16, std2[15]);
      const before = "{DPAD_LEFTRIGHT}COMBOS ", after = "WAGER {A_BUTTON}STOP {B_BUTTON}EXIT";
      const total = s.textWidth(before, "small") + 8 + s.textWidth(after, "small");
      let x = W - 4 - total;
      x += s.text(before, x, 0, std2[1], std2[2], "small", std2);
      s.downAt = x;
      s.text(after, x + 8, 0, std2[1], std2[2], "small", std2);
      // Window 0 (tiles 5-24 x 15-18) in the standard frame: the message.
      if (v.message) {
        s.frame("std", std3, 5, 15, 20, 4);
        s.fill(40, 120, 160, 32, std3[1]);
        v.message.split("\n").forEach((line, i) => s.text(line, 40 + 1, 120 + 2 + i * 16, std3[2], std3[3]));
      }
      // YES / NO (tiles 19-24 x 9-12) in your frame.
      if (v.yesNo) {
        const fr = "type" + (((opts.frame | 0) % 10) + 1), fp = G.frames[fr] ? G.frames[fr].palette : std2;
        s.frame(G.frames[fr] ? fr : "std", G.frames[fr] ? fp : std3, 19, 9, 6, 4);
        s.fill(152, 72, 48, 32, std2[1]);
        s.text("YES", 152 + 8, 72 + 2, std2[2], std2[3]);
        s.text("NO", 152 + 8, 72 + 2 + 14, std2[2], std2[3]);
        s.text("▶", 152, 72 + 2 + v.yesNo.cursor * 14, std2[2], std2[3]);
      }
      bg0 = s.canvas();
      const dd = img("dpad-down");
      if (ready(dd)) bg0.getContext("2d").drawImage(dd, s.downAt, 0);
    }

    function drawReels() {
      // The backdrop and the reel icons (OBJ priority 3, under BG2).
      rg.globalCompositeOperation = "source-over";
      rg.fillStyle = BACKDROP;
      rg.fillRect(0, 0, W, H);
      const icons = img("reel-icons");
      if (!ready(icons)) return;
      for (let r = 0; r < 3; r++) {
        sg.clearRect(0, 0, 32, H);
        let pos = m.reelPositions[r];
        const y2 = m.reelSubpixel[r] * 8;
        for (let j = 0; j < 5; j++) {
          const icon = logic.REELS[r][pos];
          sg.drawImage(icons, 0, icon * 32, 32, 32, 0, 44 + 24 * j - 16 + y2, 32, 32);
          pos = (pos + 1) % logic.REEL_LENGTH;
        }
        const cx = 80 + 40 * r;
        // Lines outside the HBlank effect, as they are; inside, each line scaled.
        rg.drawImage(strip, 0, 0, 32, HBLANK_TOP, cx - 16, 0, 32, HBLANK_TOP);
        const end = HBLANK_TOP + AFFINE.length;
        rg.drawImage(strip, 0, end, 32, H - end, cx - 16, end, 32, H - end);
        for (let k = 0; k < AFFINE.length; k++) {
          const y = HBLANK_TOP + k, w = 32 * 256 / AFFINE[k];
          rg.drawImage(strip, 0, y, 32, 1, cx - w / 2, y, w, 1);
        }
      }
      // REG_BLDY: darker toward the top and bottom of the window.
      for (let k = 0; k < BLDY.length; k++) {
        if (!BLDY[k]) continue;
        rg.fillStyle = "rgba(0,0,0," + BLDY[k] / 16 + ")";
        rg.fillRect(0, HBLANK_TOP + k, W, 1);
      }
    }

    function render() {
      if (v.bg0Dirty) drawBg0();
      g.imageSmoothingEnabled = false;
      drawReels();
      g.drawImage(reelLayer, 0, 0);
      // BG2: the machine, its lit lines, payout lights and buttons.
      if (ready(img("bg"))) g.drawImage(img("bg"), 0, 0);
      const lines = img("lines"), fixed = img("lines-fixed");
      v.lineStates.forEach((state, i) => {
        if (state === LINE_NORMAL || !ready(lines)) return;
        if (state === LINE_BET) { g.drawImage(lines, 0, i * H, W, H, 0, 0, W, H); return; }
        // A winning line: BlendPalettes toward black by d5/16, but colours 2 and 4.
        lg.globalCompositeOperation = "source-over";
        lg.clearRect(0, 0, W, H);
        lg.drawImage(lines, 0, i * H, W, H, 0, 0, W, H);
        const d5 = v.flash ? v.flash.d5 : 0;
        if (d5) {
          lg.globalCompositeOperation = "source-atop";
          lg.fillStyle = "rgba(0,0,0," + d5 / 16 + ")";
          lg.fillRect(0, 0, W, H);
          lg.globalCompositeOperation = "source-over";
          if (ready(fixed)) lg.drawImage(fixed, 0, i * H, W, H, 0, 0, W, H);
        }
        g.drawImage(lineTmp, 0, 0);
      });
      if (v.flash && v.flash.state === 1 && ready(img("lights"))) g.drawImage(img("lights"), 0, v.flash.light * H, W, H, 0, 0, W, H);
      const btn = img("button-pressed");
      if (ready(btn)) v.buttons.forEach((p, i) => { if (p) g.drawImage(btn, BUTTON_X[i], 136); });
      // OBJ priority 1: the CREDIT and PAYOUT digits, the Clefairy.
      const dg = img("digits");
      if (ready(dg)) {
        let c = Math.min(coins, 9999), p = Math.min(m.payout, 9999), div = 1000;
        for (let i = 0; i < 4; i++) {
          const qc = Math.floor(c / div), qp = Math.floor(p / div);
          g.drawImage(dg, 0, qc * 16, 8, 16, 85 + 7 * i - 4, 30 - 8, 8, 16);
          g.drawImage(dg, 0, qp * 16, 8, 16, 133 + 7 * i - 4, 30 - 8, 8, 16);
          c -= qc * div; p -= qp * div; div /= 10;
        }
      }
      const cl = img("clefairy");
      if (ready(cl)) {
        const fr = CLEFAIRY_ANIMS[v.clefairy.anim][v.clefairy.step][0];
        g.drawImage(cl, 0, fr * 32, 32, 32, 0, 120, 32, 32);
        g.save(); g.translate(W, 0); g.scale(-1, 1);
        g.drawImage(cl, 0, fr * 32, 32, 32, 0, 120, 32, 32);
        g.restore();
      }
      // BG1: the combos window, through window 0 (x < bg1X), scrolled in from the left.
      const hx = v.help.x, combos = img("combos");
      if (hx > 0 && ready(combos)) {
        const wv = Math.min(hx, W), sx = 256 - hx;
        // (BG1 wraps at 256 pixels.)
        const first = Math.min(wv, 256 - sx);
        g.drawImage(combos, sx, 0, first, H, 0, 0, first, H);
        if (first < wv) g.drawImage(combos, 0, 0, wv - first, H, first, 0, wv - first, H);
      }
      // BG0: the controls, the message and YES / NO.
      if (bg0) g.drawImage(bg0, 0, 0);
      if (v.fade > 0) { g.fillStyle = "rgba(0,0,0," + Math.min(1, v.fade / 16) + ")"; g.fillRect(0, 0, W, H); }
      out.save();
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.imageSmoothingEnabled = false;
      out.clearRect(0, 0, canvas.width, canvas.height);
      out.drawImage(frameBuf, 0, 0, canvas.width, canvas.height);
      out.restore();
    }

    // ---------- The frame loop (60 a second, whatever the display's rate) ----------
    let raf = 0, last = 0, acc = 0, done = false;
    function step() {
      newKeys = new Set(pressed.splice(0));
      // (The game starts once the fade in is over.)
      if (starting && v.fade === 0) { starting = false; setTask(gameLoop); }
      if (task) task();
      logic.spinStep(m);
      animate();
    }
    function tick(t) {
      if (done) return;
      if (!last) last = t;
      acc += Math.min(250, t - last);
      last = t;
      let n = 0;
      while (acc >= FRAME_MS && n < 8) { step(); acc -= FRAME_MS; n++; if (done) return; }
      render();
      raf = requestAnimationFrame(tick);
    }
    function finish() {
      done = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onDown, true);
      document.removeEventListener("keyup", onUp, true);
      window.removeEventListener("blur", onBlur);
      canvas.remove();
      active = null;
      resolveDone(coins);
    }

    active = {
      promise,
      state: () => ({ coins, bet: m.bet, payout: m.payout, machineIdx: m.machineIdx, machineId: opts.machineId,
        bias: m.machineBias, reels: m.reelPositions.slice(), spinning: m.reelIsSpinning.slice(),
        visible: logic.visibleIcons(m.reelPositions).map((i) => logic.ICON_NAMES[i]), task: task && task.name, help: v.help.state })
    };
    // Fade in (SlotsTask_GraphicsInit) once the pictures are loaded.
    let starting = false;
    preload().then(() => {
      if (done) return;
      starting = true;
      v.fadeTo = 0;
      v.bg0Dirty = true;
      render();
      raf = requestAnimationFrame(tick);
    });
    render();
    return promise;
  }

  window.SlotMachine = {
    play,
    logic,
    // (For debugging: what the machine is showing now, or null.)
    debugState: () => (active ? active.state() : null)
  };
})();
