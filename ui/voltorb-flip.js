// HeartGold's Voltorb Flip (src/voltorb_flip/: the international HGSS's
// Goldenrod Game Corner game, at Mr. Game's table), drawn at 240x160 with
// HGSS's own pictures (assets/voltorb-flip/, made by tools/build-voltorb-flip.js)
// as a full-screen layer over the game, FireRed's windows and font for its text.
//
//   const coins = await VoltorbFlip.play({
//     coins,            // your Coins now
//     maxCoins: 50000,
//     name,             // the player's name ("... received 36 Coins!")
//     sfx,              // (name) => plays a sound effect
//     fanfare           // (name) => Promise: plays a jingle, resolves when it's done
//   })                  // -> your Coins when you get up (Quit at the menu)
//
// HGSS's controls, as keys: the arrow keys move the cursor round the 25 cards
// and the Memo and Quit buttons at the side; A (Z, Space or Enter) flips the
// card it's on, or presses the button; B (X or Esc) asks to quit the game;
// Select (Backspace or C: the DS's X) opens and closes the Memo. With the
// Memo open, A on a card goes to the Memo's marks (Voltorb, 1, 2, 3 and back),
// and A on a mark puts it on the card, or takes it off.
//
// The rules (the boards for each level, the levels up and down, the payout)
// are in VoltorbFlip.logic, which also loads in node.
(function () {
  "use strict";

  // =====================================================================
  // The rules (no DOM): src/voltorb_flip/voltorb_flip_game.c.
  // =====================================================================
  const logic = (function () {
    const ONE = 1, TWO = 2, THREE = 3, VOLTORB = 4;
    const NONE = 0, QUIT = 1, WON = 2, LOST = 3;   // (a round's outcome)
    const MAX_PAYOUT = 50000;
    // sBoardConfigs: [Voltorbs, 2s, 3s, most free multipliers in a row or column,
    // most free multipliers on the board], ten to a level (Lv. 1 first). A free
    // multiplier is a 2 or 3 in a row or column with no Voltorb.
    const CONFIGS = [
      [6, 3, 1, 3, 3], [6, 0, 3, 2, 2], [6, 5, 0, 3, 4], [6, 2, 2, 3, 3], [6, 4, 1, 3, 4],
      [6, 3, 1, 3, 3], [6, 0, 3, 2, 2], [6, 5, 0, 3, 4], [6, 2, 2, 3, 3], [6, 4, 1, 3, 4],
      [7, 1, 3, 2, 3], [7, 6, 0, 3, 4], [7, 3, 2, 2, 3], [7, 0, 4, 2, 3], [7, 5, 1, 3, 4],
      [7, 1, 3, 2, 2], [7, 6, 0, 3, 3], [7, 3, 2, 2, 2], [7, 0, 4, 2, 2], [7, 5, 1, 3, 3],
      [8, 2, 3, 2, 3], [8, 7, 0, 3, 4], [8, 4, 2, 3, 4], [8, 1, 4, 2, 3], [8, 6, 1, 4, 3],
      [8, 2, 3, 2, 2], [8, 7, 0, 3, 3], [8, 4, 2, 3, 3], [8, 1, 4, 2, 2], [8, 6, 1, 3, 3],
      [8, 3, 3, 4, 3], [8, 0, 5, 2, 3], [10, 8, 0, 4, 5], [10, 5, 2, 3, 4], [10, 2, 4, 3, 4],
      [8, 3, 3, 3, 3], [8, 0, 5, 2, 2], [10, 8, 0, 4, 4], [10, 5, 2, 3, 3], [10, 2, 4, 3, 3],
      [10, 7, 1, 4, 5], [10, 4, 3, 3, 4], [10, 1, 5, 3, 4], [10, 9, 0, 4, 5], [10, 6, 2, 4, 5],
      [10, 7, 1, 4, 4], [10, 4, 3, 3, 3], [10, 1, 5, 3, 3], [10, 9, 0, 4, 4], [10, 6, 2, 4, 4],
      [10, 3, 4, 3, 4], [10, 0, 6, 3, 4], [10, 8, 1, 4, 5], [10, 5, 3, 4, 5], [10, 2, 5, 3, 4],
      [10, 3, 4, 3, 3], [10, 0, 6, 3, 3], [10, 8, 1, 4, 4], [10, 5, 3, 4, 4], [10, 2, 5, 3, 3],
      [10, 7, 2, 4, 5], [10, 4, 4, 4, 5], [13, 1, 6, 3, 4], [13, 9, 1, 5, 6], [10, 6, 3, 4, 5],
      [10, 7, 2, 4, 4], [10, 4, 4, 4, 4], [13, 1, 6, 3, 3], [13, 9, 1, 5, 5], [10, 6, 3, 4, 4],
      [10, 0, 7, 3, 4], [10, 8, 2, 5, 6], [10, 5, 4, 4, 5], [10, 2, 6, 4, 5], [10, 7, 3, 5, 6],
      [10, 0, 7, 3, 3], [10, 8, 2, 5, 5], [10, 5, 4, 4, 4], [10, 2, 6, 4, 4], [10, 7, 3, 5, 5]
    ];
    const value = (type) => (type >= ONE && type <= THREE ? type : 0);
    const random = (g, n) => Math.floor(g.rand() * n);

    // A game at the table: five rounds' history (a ring, as HGSS keeps it) and the board.
    function create(rand) {
      const g = { rand: rand || Math.random, history: [], head: 0 };
      for (let i = 0; i < 5; i++) g.history.push({ outcome: NONE, flipped: 0, boardId: 0, level: 1 });
      reset(g);
      return g;
    }
    function reset(g) {
      Object.assign(g, { cards: [], payout: 0, maxPayout: 0, multipliers: 0, multipliersFlipped: 0, flipped: 0,
        boardId: 0, level: 1, outcome: NONE, pointsRow: [0, 0, 0, 0, 0], pointsCol: [0, 0, 0, 0, 0], voltorbsRow: [0, 0, 0, 0, 0], voltorbsCol: [0, 0, 0, 0, 0] });
      for (let i = 0; i < 25; i++) g.cards.push({ type: 0, memo: 0, flipped: false });
    }
    // The next round's level (VoltorbFlipGameState_CalcNextLevel), from the last.
    function nextLevel(g) {
      const prev = g.history[(g.head + 4) % 5], won = prev.outcome === WON, n = prev.flipped;
      const at = (lv) => prev.boardId >= 10 * (lv - 1);   // (LEVEL_AT_LEAST)
      if (won && at(8)) return 8;
      // (Lv. 8 too from Lv. 5 or higher, if each of the last five rounds flipped 8 cards and didn't lose.)
      if (at(5) && g.history.every((r) => r.flipped >= 8 && r.outcome !== LOST)) return 8;
      for (let lv = 7; lv >= 2; lv--) if ((at(lv) && n >= lv) || (lv === 2 ? won : at(lv - 1) && won)) return lv;
      return 1;
    }
    // A new board (VoltorbFlipGameState_NewBoard): its level, one of the
    // level's ten boards, and its cards placed until it hasn't too many free multipliers.
    function newBoard(g) {
      reset(g);
      g.level = nextLevel(g);
      g.boardId = (g.level - 1) * 10 + Math.floor(random(g, 100) / 10);
      const [voltorbs, twos, threes, maxPerLine, maxTotal] = CONFIGS[g.boardId];
      for (let attempt = 0; attempt < 1000; attempt++) {
        g.cards.forEach((c) => { c.type = ONE; });
        place(g, VOLTORB, voltorbs); place(g, TWO, twos); place(g, THREE, threes);
        countVoltorbs(g);
        if (!tooManyFree(g, maxPerLine, maxTotal)) break;
      }
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { const v = value(g.cards[r * 5 + c].type); g.pointsRow[r] += v; g.pointsCol[c] += v; }
      g.maxPayout = Math.min(MAX_PAYOUT, g.cards.reduce((p, c) => (c.type === VOLTORB ? p : p * value(c.type)), 1));
      g.multipliers = g.cards.filter((c) => c.type === TWO || c.type === THREE).length;
      return g;
    }
    // (PlaceCardsOnBoard: onto a 1 card at random; after 100 misses, the rest are left out.)
    function place(g, type, n) {
      let misses = 0;
      for (let i = 0; i < n; i++) {
        const c = g.cards[random(g, 25)];
        if (c.type === ONE) c.type = type;
        else if (++misses >= 100) break;
        else i--;
      }
    }
    function countVoltorbs(g) {
      g.voltorbsRow = [0, 0, 0, 0, 0]; g.voltorbsCol = [0, 0, 0, 0, 0];
      g.cards.forEach((c, i) => { if (c.type === VOLTORB) { g.voltorbsRow[Math.floor(i / 5)]++; g.voltorbsCol[i % 5]++; } });
    }
    function tooManyFree(g, maxPerLine, maxTotal) {
      const row = [0, 0, 0, 0, 0], col = [0, 0, 0, 0, 0];
      let total = 0;
      g.cards.forEach((c, i) => {
        const r = Math.floor(i / 5), k = i % 5;
        if ((c.type === TWO || c.type === THREE) && (g.voltorbsRow[r] === 0 || g.voltorbsCol[k] === 0)) { row[r]++; col[k]++; total++; }
      });
      return maxTotal <= total || row.some((n, i) => maxPerLine <= n || maxPerLine <= col[i]);
    }
    // Flipping a card: the payout multiplied by its number (the first one's the payout).
    function flip(g, i) {
      const c = g.cards[i];
      c.flipped = true; c.memo = 0;
      if (c.type === VOLTORB) return c.type;
      g.flipped++;
      if (c.type === TWO || c.type === THREE) g.multipliersFlipped++;
      g.payout = g.payout ? Math.min(MAX_PAYOUT, g.payout * c.type) : c.type;
      return c.type;
    }
    const cleared = (g) => g.payout === g.maxPayout;
    const flippedIn = (g, axis, n) => g.cards.filter((c, i) => c.flipped && (axis === "row" ? Math.floor(i / 5) : i % 5) === n).length;
    // The round over: into the history, and the board cleared (UpdateHistoryAndReset).
    function endRound(g, outcome) {
      g.history[g.head] = { outcome, flipped: g.flipped, boardId: g.boardId, level: g.level };
      g.head = (g.head + 1) % 5;
      reset(g);
    }
    const lastLevel = (g) => g.history[(g.head + 4) % 5].level;
    return { ONE, TWO, THREE, VOLTORB, NONE, QUIT, WON, LOST, MAX_PAYOUT, CONFIGS, create, newBoard, nextLevel, flip, cleared, flippedIn, endRound, lastLevel };
  })();

  // HGSS's words (msg_0039), as this game writes them.
  const TEXT = {
    level: (n) => "VOLTORB Flip Lv. " + n,
    play: (n) => "Play VOLTORB Flip Lv. " + n + "?",
    menu: ["Play", "Game Info", "Quit"],
    whichInfo: "Which set of info?",
    info: ["How to Play", "Hint!", "About Memos", "Return"],
    howToPlay: ["VOLTORB Flip is a game in which you flip over cards to find numbers hidden beneath them.",
      "The cards are hiding the numbers 1 through 3...and VOLTORB as well.",
      "The first number you flip over will give you that many Coins.",
      "From then on, the next number you find will multiply the total amount of Coins you've collected by that number.",
      "If it's a 2, your total will be multiplied by \"x2.\"", "If it's a 3, your total will be multiplied by \"x3.\"",
      "But if you flip over a VOLTORB, it's game over.", "When that happens, you'll lose all the Coins you've collected in the current game.",
      "If you select \"Quit,\" you'll withdraw from the game.", "If you get to a difficult spot, you might want to end the game early.",
      "Once you've found all the hidden 2 and 3 cards, you've cleared the game.",
      "Once you've flipped over all these cards, then you'll advance to the next level.",
      "As you move up in levels, you will be able to receive more Coins. Do your best!"],
    hint: ["The numbers at the side of the board give you a clue about the numbers hidden on the backs of the panels.",
      "The larger the number, the more likely it is that there are many large numbers hidden in that row or column.",
      "In the same way, you can tell how many VOLTORB are hidden in the row or column.",
      "Consider the hidden number totals and the VOLTORB totals carefully as you flip over panels."],
    aboutMemos: ["Select \"Open Memo\" to mark the cards.", "You can mark the cards with the numbers 1 through 3, but also with a VOLTORB mark.",
      "When you have an idea of the numbers hidden on the back of the cards, select \"Open Memo\" and select the cards to mark.",
      "If you want to remove a mark, select the mark again, and it will disappear."],
    expecting: "Is this what you're expecting?!",
    first: (n) => n + "! Received " + n + " Coin" + (n > 1 ? "s" : "") + "!",
    times: (n, total) => "x" + n + "! Received " + total + " Coins!",
    ohNo: "Oh no! You get 0 Coins!",
    clear: ["Game clear!", "You've found all of the hidden x2 and x3 cards.", "This means you've found all the Coins in this game, so the game is now over."],
    quitWith: (n) => ["If you quit now, you will receive " + n + " Coin" + (n === 1 ? "" : "s") + ".", "Will you quit?"],
    quitNone: ["You haven't found any Coins! Are you sure you want to quit?"],
    received: (name, n) => name + " received " + n + " Coin" + (n === 1 ? "" : "s") + "!",
    advanced: (n) => "Advanced to Game Lv. " + n + "!",
    congrats: ["Congratulations!", "You can receive even more Coins in the next game!"],
    dropped: (n) => "Dropped to Game Lv. " + n + ".",
    full: ["You've gathered 50,000 Coins. You cannot gather any more."],
    openMemo: ["Open", "Memo"], closeMemo: ["Close", "Memo"], quit: "Quit"
  };

  // =====================================================================
  // The screen.
  // =====================================================================
  const W = 240, H = 160, FRAME_MS = 1000 / 60;
  const ASSET = (n) => "assets/voltorb-flip/" + n + ".png";
  // The board (tools/build-voltorb-flip.js): cards 26 pixels apart from (2, 2).
  const PITCH = 26, ORIGIN = 2;
  const cardXY = (i) => [ORIGIN + (i % 5) * PITCH, ORIGIN + Math.floor(i / 5) * PITCH];
  // The board's tiles (sCardFaceUpTileIDs: each card type turning, then face up;
  // face down, and the two in between).
  const FACE_UP = [[0x77, 0x17], [0x74, 0x14], [0x71, 0x11], [0x6e, 0x0e], [0x6b, 0x0b]];
  const FACE_DOWN = 23, TURNING = 119, EDGE_ON = 26;
  const MEMO_TILES = [[0x21, 0, 0], [0x22, 2, 0], [0x23, 0, 2], [0x24, 2, 2]];   // (sMemoRenderOverrides: Voltorb, 1, 2, 3)
  const MEMO_FLAGS = [1, 2, 4, 8];
  // The panel at the right: HGSS's buttons (its sprites' cells) and the Memo.
  const PANEL_X = 200, MEMO_BUTTON_Y = 82, QUIT_Y = 144;
  const MEMO_TL = [PANEL_X - 32, MEMO_BUTTON_Y - 32];
  // The Memo's marks (sMemoCursorPos: Voltorb, 1, 2, 3, back), from its top left.
  const MEMO_POS = [[8, 8], [32, 8], [8, 32], [32, 32], [32, 56]];
  const MEMO_OFF = [19, 22, 21, 20], MEMO_ON = [15, 18, 17, 16];   // (sMemoInputGridDrawParam's cells)
  // Sprite animations (voltorb_flip_00000013.NANR): [cell, frames] in turn.
  const ANIMS = {
    sparkle: [[1, 6], [2, 6], [3, 6], [4, 6]],
    explode: [[29, 8], [30, 8], [31, 8], [23, 4], [24, 4], [25, 6], [26, 6], [27, 6], [28, 4], [0, 22]],
    quitPressed: [[7, 4], [6, 4], [7, 4], [6, 4]],
    memoPressed: [[13, 4], [12, 4]],
    memoCursorPressed: [[10, 2], [9, 2], [10, 2], [9, 2]]
  };
  const SLOT = 96, PER_ROW = 8;
  // sDpadButtonSpecs: from each card or button, [up, down, left, right]
  // (27 and 28: the last row's far left or right card).
  const MOVES = [];
  for (let i = 0; i < 25; i++) {
    const r = Math.floor(i / 5), c = i % 5;
    MOVES.push([((r + 4) % 5) * 5 + c, ((r + 1) % 5) * 5 + c, c === 0 ? (r < 3 ? 25 : 26) : i - 1, c === 4 ? (r < 3 ? 25 : 26) : i + 1]);
  }
  MOVES[25] = [25, 26, 27, 28]; MOVES[26] = [25, 26, 27, 28];

  const images = {};
  const img = (n) => { if (!images[n]) { const i = new Image(); i.src = ASSET(n); images[n] = i; } return images[n]; };
  const ready = (i) => i && i.complete && i.naturalWidth;
  const preload = () => Promise.all(["board", "tiles", "sprites"].map((n) => {
    const i = img(n);
    return ready(i) ? null : new Promise((r) => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); });
  }));
  const mk = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });

  // A message's words in lines that fit `width` (FireRed's font), two to a page.
  function pagesOf(texts, width, measure) {
    const pages = [];
    for (const t of [].concat(texts)) {
      const lines = [];
      let line = "";
      for (const word of String(t).split(/\s+/)) {
        const next = line ? line + " " + word : word;
        if (line && measure(next) > width) { lines.push(line); line = word; } else line = next;
      }
      if (line) lines.push(line);
      for (let i = 0; i < lines.length; i += 2) pages.push(lines.slice(i, i + 2).join("\n"));
    }
    return pages;
  }

  let active = null;
  function play(opts) {
    opts = opts || {};
    if (active) return active;
    const maxCoins = opts.maxCoins == null ? logic.MAX_PAYOUT : opts.maxCoins;
    const name = opts.name || "You";
    const sfxFn = opts.sfx || ((n) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(n); });
    const fanfareFn = opts.fanfare || ((n) => (window.GameAudio && window.GameAudio.fanfare ? window.GameAudio.fanfare(n) : Promise.resolve()));
    const sfx = (n) => { try { sfxFn(n); } catch (e) { /* ignore */ } };
    const fanfare = (n) => { try { return Promise.resolve(fanfareFn(n)).catch(() => {}); } catch (e) { return Promise.resolve(); } };
    // HGSS's sounds, as this game's: a card turning (SEQ_SE_GS_PANERU_MEKURU), a
    // Voltorb (SEQ_SE_GS_COIN_HAZURE), Coins counting (SEQ_SE_GS_OKOZUKAI and
    // _COIN_PAYOUT_ONE), the Memo (SEQ_SE_DP_CARD2, _BOX01) and the cursor.
    const SE = { turn: "se_ball_tray_enter", boom: "se_m_explosion", coin: "se_shop", memo: "se_bag_pocket", mark: "se_click",
      no: "se_failure", select: "se_select", up: "se_m_stat_increase", down: "se_m_stat_decrease" };
    let coins = Math.max(0, Math.min(maxCoins, Math.floor(+opts.coins || 0)));
    const g = logic.create(opts.rng);

    // ---------- What's on screen ----------
    const v = {
      fade: 16,
      faces: new Array(25).fill(FACE_DOWN),   // each card's tiles now
      totals: false,                          // the board's totals (0 between rounds)
      payout: 0,                              // the Coins this game, as counted up
      cursor: 0,                              // 0-24 a card, 25 the Memo button, 26 Quit
      showCursor: false,
      memoOpen: false, memoFocused: false, memoButton: 0,
      sprites: [],                            // animations playing: { anim, x, y, t }
      memoAnim: null, quitAnim: null, memoCursorAnim: null,
      dim: false, message: null, menu: null, yesNo: null,
      hudDirty: true
    };
    const dirty = () => { v.hudDirty = true; };

    // ---------- The canvas ----------
    const canvas = mk(W * 2, H * 2);
    canvas.className = "voltorb-flip";
    canvas.setAttribute("aria-label", "Voltorb Flip");
    const screenEl = document.querySelector(".screen") || document.body;
    const overlayEl = document.getElementById("overlay");
    if (overlayEl && overlayEl.parentNode === screenEl) screenEl.insertBefore(canvas, overlayEl.nextSibling);
    else screenEl.appendChild(canvas);
    const out = canvas.getContext("2d");
    const frameBuf = mk(W, H), fg = frameBuf.getContext("2d");
    let hud = null;

    // ---------- Input ----------
    const KEY = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      z: "a", Z: "a", " ": "a", Enter: "a", x: "b", X: "b", Escape: "b",
      Backspace: "memo", Select: "memo", c: "memo", C: "memo", Start: "a", m: "a", M: "a" };
    const pressed = [];
    let waiter = null;
    const onDown = (e) => {
      const k = KEY[e.key];
      if (!k) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.repeat && !/^(up|down|left|right)$/.test(k)) return;
      pressed.push(k);
      if (waiter) { const w = waiter; waiter = null; w(); }
    };
    const onUp = (e) => { if (KEY[e.key]) { e.preventDefault(); e.stopImmediatePropagation(); } };
    document.addEventListener("keydown", onDown, true);
    document.addEventListener("keyup", onUp, true);
    const key = async () => { while (!pressed.length) await new Promise((r) => { waiter = r; }); return pressed.shift(); };
    const anyKeyPressed = () => { const had = pressed.length > 0; pressed.length = 0; return had; };

    // ---------- Time ----------
    const timers = [];
    const frames = (n) => new Promise((r) => timers.push({ n, r }));
    const startAnim = (anim, x, y) => { const s = { anim: ANIMS[anim], x, y, t: 0 }; v.sprites.push(s); return s; };
    const animLength = (anim) => ANIMS[anim].reduce((a, f) => a + f[1], 0);
    function animCell(a, t, loop) {
      const total = a.reduce((s, f) => s + f[1], 0);
      if (!loop && t >= total) return null;
      t %= total;
      for (const [cell, n] of a) { if (t < n) return cell; t -= n; }
      return a[a.length - 1][0];
    }

    // ---------- Drawing ----------
    const G = () => window.GBA_MENUS, Surface = () => window.GbaMenus.Surface();
    function drawHud() {
      v.hudDirty = false;
      if (!G() || !window.GbaMenus) { hud = null; return; }
      const s = Surface(), std = G().palettes.std3, std2 = G().palettes.std2;
      const win = (l, t, w, h) => { s.frame("std", std, l, t, w, h); s.fill(l * 8, t * 8, w * 8, h * 8, std[1]); };
      // The level and the Coins (HGSS's top screen): tiles 21-28 x 1-4.
      win(21, 1, 8, 4);
      const row = (label, val, y) => {
        s.text(label, 168, y, std[2], std[3], "small");
        const t = String(val);
        s.text(t, 232 - s.textWidth(t, "small"), y, std[2], std[3], "small");
      };
      row("Lv.", g.level, 8);
      row("Coins", coins, 18);
      row("This game", v.payout, 28);
      // The buttons' words (HGSS's wMemo and wQuit windows: white, centred).
      const centre = (t, y) => s.text(t, PANEL_X - (s.textWidth(t, "small") >> 1), y, std2[1], std2[2], "small");
      if (!v.memoOpen) TEXT.openMemo.forEach((t, i) => centre(t, MEMO_BUTTON_Y + 2 + i * 10));
      centre(TEXT.quit, QUIT_Y - 6);
      // A message (window tiles 2-27 x 15-18, the standard frame), a menu and YES / NO.
      if (v.message) {
        win(2, 15, 26, 4);
        v.message.split("\n").forEach((line, i) => s.text(line, 16 + 1, 120 + 2 + i * 16, std[2], std[3]));
      }
      const fr = "type" + (((opts.frame | 0) % 10) + 1), frOk = !!G().frames[fr];
      const choices = (items, cursor, left, top, width) => {
        s.frame(frOk ? fr : "std", frOk ? G().frames[fr].palette : std, left, top, width, items.length * 2);
        s.fill(left * 8, top * 8, width * 8, items.length * 16, std2[1]);
        items.forEach((t, i) => s.text(t, left * 8 + 8, top * 8 + 2 + i * 16, std2[2], std2[3]));
        s.text("▶", left * 8, top * 8 + 2 + cursor * 16, std2[2], std2[3]);
      };
      if (v.menu) choices(v.menu.items, v.menu.cursor, 21, 13 - v.menu.items.length * 2, 8);
      if (v.yesNo) choices(["YES", "NO"], v.yesNo.cursor, 23, 9, 6);
      hud = s.canvas();
    }
    const sprites = img("sprites"), tiles = img("tiles");
    function cell(n, x, y) {
      if (n == null || !ready(sprites)) return;
      fg.drawImage(sprites, (n % PER_ROW) * SLOT, Math.floor(n / PER_ROW) * SLOT, SLOT, SLOT, x - SLOT / 2, y - SLOT / 2, SLOT, SLOT);
    }
    const tile = (t, x, y) => fg.drawImage(tiles, (t % 32) * 8, Math.floor(t / 32) * 8, 8, 8, x, y, 8, 8);
    function render() {
      if (v.hudDirty) drawHud();
      fg.imageSmoothingEnabled = false;
      fg.clearRect(0, 0, W, H);
      if (ready(img("board"))) fg.drawImage(img("board"), 0, 0);
      if (ready(tiles)) {
        // The cards (BG0), the memo marks on them (BG2) and the totals.
        for (let i = 0; i < 25; i++) {
          const [x, y] = cardXY(i), f = v.faces[i];
          for (let k = 0; k < 9; k++) tile(f + Math.floor(k / 3) * 32 + (k % 3), x + (k % 3) * 8, y + Math.floor(k / 3) * 8);
          const c = g.cards[i];
          if (f === FACE_DOWN && c && !c.flipped) MEMO_TILES.forEach(([t, dx, dy], m) => { if (c.memo & MEMO_FLAGS[m]) tile(t, x + dx * 8, y + dy * 8); });
        }
        for (let n = 0; n < 10; n++) {
          const isRow = n < 5, k = n % 5;
          const x = isRow ? ORIGIN + 5 * PITCH : ORIGIN + k * PITCH, y = isRow ? ORIGIN + k * PITCH : ORIGIN + 5 * PITCH;
          const points = v.totals ? (isRow ? g.pointsRow : g.pointsCol)[k] : 0, volts = v.totals ? (isRow ? g.voltorbsRow : g.voltorbsCol)[k] : 0;
          tile(Math.floor(points / 10) + 1, x + 8, y); tile((points % 10) + 1, x + 16, y);
          tile(203 + volts, x + 16, y + 8); tile(235 + volts, x + 16, y + 16);
        }
      }
      // The buttons, the Memo and the cursor (OBJ).
      cell(v.memoAnim ? animCell(ANIMS.memoPressed, v.memoAnim.t, false) : null, PANEL_X, MEMO_BUTTON_Y);
      if (!v.memoAnim) cell(v.memoOpen ? null : 12, PANEL_X, MEMO_BUTTON_Y);
      if (v.memoOpen) {
        const [mx, my] = MEMO_TL;
        cell(5, mx + 32, my + 48);
        const c = g.cards[v.cursor];
        // (Its marks, lit for those on the card; its back button; and its cursor, the board's in yellow.)
        if (v.cursor < 25 && c) {
          MEMO_POS.slice(0, 4).forEach(([dx, dy], m) => cell((c.memo & MEMO_FLAGS[m] ? MEMO_ON : MEMO_OFF)[m], mx + dx, my + dy));
          cell(v.memoCursorAnim ? animCell(ANIMS.memoCursorPressed, v.memoCursorAnim.t, true) : 9, mx + MEMO_POS[4][0], my + MEMO_POS[4][1]);
        }
        if (v.memoFocused) cell(40, mx + MEMO_POS[v.memoButton][0], my + MEMO_POS[v.memoButton][1]);
      }
      cell(v.quitAnim ? animCell(ANIMS.quitPressed, v.quitAnim.t, true) : 6, PANEL_X, QUIT_Y);
      if (v.showCursor) {
        if (v.cursor < 25) {
          const [x, y] = cardXY(v.cursor);
          cell(v.memoFocused ? 39 : v.memoOpen ? 38 : 11, x, y);
        } else if (v.cursor === 25) cell(14, PANEL_X, MEMO_BUTTON_Y);
        else cell(8, PANEL_X, QUIT_Y);
      }
      for (const sp of v.sprites) cell(animCell(sp.anim, sp.t, false), sp.x, sp.y);
      if (v.dim) { fg.fillStyle = "rgba(0,0,0,0.375)"; fg.fillRect(0, 0, W, H); }
      if (hud) fg.drawImage(hud, 0, 0);
      if (v.fade > 0) { fg.fillStyle = "rgba(0,0,0," + Math.min(1, v.fade / 16) + ")"; fg.fillRect(0, 0, W, H); }
      out.save();
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.imageSmoothingEnabled = false;
      out.clearRect(0, 0, canvas.width, canvas.height);
      out.drawImage(frameBuf, 0, 0, canvas.width, canvas.height);
      out.restore();
    }

    // ---------- The frame loop (60 a second) ----------
    let raf = 0, last = 0, acc = 0, done = false;
    function step() {
      for (const s of v.sprites) s.t++;
      v.sprites = v.sprites.filter((s) => s.t < s.anim.reduce((a, f) => a + f[1], 0));
      for (const k of ["memoAnim", "quitAnim", "memoCursorAnim"]) if (v[k]) v[k].t++;
      if (v.memoAnim && v.memoAnim.t >= 8) v.memoAnim = null;
      for (let i = timers.length - 1; i >= 0; i--) if (--timers[i].n <= 0) { const t = timers.splice(i, 1)[0]; t.r(); }
    }
    function tick(t) {
      if (done) return;
      if (!last) last = t;
      acc += Math.min(250, t - last);
      last = t;
      let n = 0;
      while (acc >= FRAME_MS && n < 8) { step(); acc -= FRAME_MS; n++; }
      render();
      raf = requestAnimationFrame(tick);
    }

    // ---------- Windows ----------
    const measure = (t) => (window.GbaMenus ? Surface().textWidth(t) : t.length * 6);
    // A message, page by page (A or B after each).
    async function say(texts, opts2) {
      opts2 = opts2 || {};
      const pages = pagesOf(texts, 206, measure);
      for (let i = 0; i < pages.length; i++) {
        v.message = pages[i]; dirty();
        if (opts2.noWait && i === pages.length - 1) return;
        pressed.length = 0;
        for (;;) { const k = await key(); if (k === "a" || k === "b") break; }
      }
      v.message = null; dirty();
    }
    // A menu (the DS's list): A picks, B the last item.
    async function choose(items) {
      v.menu = { items, cursor: 0 }; dirty();
      pressed.length = 0;
      for (;;) {
        const k = await key();
        if (k === "up" || k === "down") { v.menu.cursor = (v.menu.cursor + (k === "up" ? items.length - 1 : 1)) % items.length; sfx(SE.select); dirty(); }
        else if (k === "a" || k === "b") {
          const i = k === "a" ? v.menu.cursor : items.length - 1;
          sfx(SE.select);
          v.menu = null; dirty();
          return i;
        }
      }
    }
    async function yesNo() {
      v.yesNo = { cursor: 0 }; dirty();
      pressed.length = 0;
      for (;;) {
        const k = await key();
        if (k === "up" || k === "down") { v.yesNo.cursor ^= 1; sfx(SE.select); dirty(); }
        else if (k === "a" || k === "b") { const yes = k === "a" && v.yesNo.cursor === 0; v.yesNo = null; dirty(); return yes; }
      }
    }
    async function fadeTo(target) {
      while (v.fade !== target) { v.fade += v.fade < target ? 2 : -2; await frames(1); }
    }

    // ---------- Cards turning (VFCardFlipAnim_Play: a step on two frames of every three) ----------
    async function turn(ids, steps) {
      let frame = 0;
      for (let s = 0; s < steps.length;) {
        if (frame % 3 !== 0) {
          if (s === 0) sfx(SE.turn);
          ids.forEach((i) => { v.faces[i] = steps[s](i); });
          s++;
        }
        frame++;
        await frames(1);
      }
    }
    const typeOf = (i) => g.cards[i].type;
    const FLIP_UP = [() => TURNING, () => EDGE_ON, (i) => FACE_UP[typeOf(i)][0], (i) => FACE_UP[typeOf(i)][1]];
    const FLIP_DOWN = [(i) => FACE_UP[typeOf(i)][0], () => EDGE_ON, () => TURNING, () => FACE_DOWN];

    // Counting the payout up (VoltorbFlip_AddCoinsToPayout): a Coin a frame, all at once on a key.
    async function countPayout() {
      pressed.length = 0;
      while (v.payout < g.payout) {
        if (anyKeyPressed()) { v.payout = g.payout; dirty(); break; }
        if (v.payout % 4 === 0) sfx(SE.coin);
        v.payout++; dirty();
        await frames(1);
      }
    }
    // The payout into your Coin Case (VoltorbFlip_AwardPayoutToPlayer).
    async function award() {
      await say(TEXT.received(name, g.payout), { noWait: true });
      v.dim = true;
      pressed.length = 0;
      while (g.payout > 0) {
        if (anyKeyPressed() || coins >= maxCoins) { coins = Math.min(maxCoins, coins + g.payout); g.payout = 0; }
        else { g.payout--; coins = Math.min(maxCoins, coins + 1); if (g.payout % 4 === 0) sfx(SE.coin); }
        v.payout = g.payout; dirty();
        await frames(1);
      }
      sfx(SE.coin);
      pressed.length = 0;
      for (;;) { const k = await key(); if (k === "a" || k === "b") break; }
      v.message = null; v.dim = false; dirty();
    }
    // The round over: the rest of the cards turned up, then (on a key) all of them down, a column at a time.
    async function reveal(outcome) {
      v.showCursor = false; v.memoOpen = false; v.memoFocused = false; dirty();
      const hidden = g.cards.map((c, i) => i).filter((i) => !g.cards[i].flipped);
      if (hidden.length) await turn(hidden, FLIP_UP);
      pressed.length = 0;
      await key();
      for (let c = 0; c < 5; c++) await turn([c, c + 5, c + 10, c + 15, c + 20], FLIP_DOWN);
      logic.endRound(g, outcome);
      v.totals = false; v.payout = 0; v.cursor = 0; dirty();
    }

    // ---------- A round ----------
    async function flipCard(i) {
      const r = Math.floor(i / 5), c = i % 5, vr = g.voltorbsRow[r], vc = g.voltorbsCol[c];
      // (Suspense: the row and column both hide Voltorb, and most of what's left in one of them is Voltorb.)
      if (vr && vc && (100 * vc / (5 - logic.flippedIn(g, "col", c)) >= 75 || 100 * vr / (5 - logic.flippedIn(g, "row", r)) >= 75)) {
        await say(TEXT.expecting, { noWait: true });
        await fanfare("gs_me_cardgame1");
        v.message = null; dirty();
      }
      await turn([i], FLIP_UP);
      const [x, y] = cardXY(i), before = g.payout, type = logic.flip(g, i);
      if (type === logic.VOLTORB) {
        startAnim("explode", x + 12, y + 12);
        sfx(SE.boom);
        await frames(animLength("explode") - 22);
        v.payout = 0; dirty();
        const jingle = fanfare("gs_me_cardgame2");
        await say(TEXT.ohNo, { noWait: true });
        await jingle;
        v.message = null; dirty();
        await reveal(logic.LOST);
        return "over";
      }
      startAnim("sparkle", x + 12, y + 12);
      if (before === 0 || type !== logic.ONE) {
        await say(before === 0 ? TEXT.first(type) : TEXT.times(type, g.payout), { noWait: true });
        await countPayout();
        pressed.length = 0;
        await key();
        v.message = null; dirty();
      }
      if (logic.cleared(g)) {
        v.dim = true;
        const jingle = fanfare("gs_me_mushitori3");
        await say(TEXT.clear);
        await jingle;
        v.dim = false;
        await award();
        await reveal(logic.WON);
        return "over";
      }
      return null;
    }
    async function quitRound() {
      v.dim = true; dirty();
      const pay = g.payout;
      const q = pay ? TEXT.quitWith(pay) : TEXT.quitNone;
      if (q.length > 1) await say(q.slice(0, -1));
      await say(q[q.length - 1], { noWait: true });
      const yes = await yesNo();
      v.message = null; v.dim = false; dirty();
      if (!yes) return null;
      if (pay) await award();
      await reveal(logic.QUIT);
      return "over";
    }
    function move(k) {
      const to = MOVES[v.cursor][["up", "down", "left", "right"].indexOf(k)];
      // (27, 28: back onto the board, on the row it was last on.)
      const next = to === 27 ? v.row * 5 + 4 : to === 28 ? v.row * 5 : to;
      if (next === v.cursor) return;
      v.cursor = next;
      if (next < 25) v.row = Math.floor(next / 5);
      sfx(SE.select); dirty();
    }
    function setMemo(open) {
      v.memoOpen = open; v.memoFocused = false; v.memoButton = 0;
      v.memoAnim = { t: 0 };
      sfx(SE.memo); dirty();
    }
    async function playRound() {
      v.totals = true; v.showCursor = true; v.cursor = 0; v.row = 0; dirty();
      for (;;) {
        const k = await key();
        if (v.memoFocused) {
          // The Memo's marks (VoltorbFlipInputHandler_HandleDpad): 0-3 the marks, 4 back.
          const b = v.memoButton;
          if (k === "down") v.memoButton = Math.min(4, b + 2);
          else if (k === "up") v.memoButton = b === 4 && (v.lastMemoButton === 2 || v.lastMemoButton === 3) ? v.lastMemoButton : Math.max(0, b - 2);
          else if (k === "left") v.memoButton = Math.max(0, b - 1);
          else if (k === "right") v.memoButton = Math.min(4, b + 1);
          else if (k === "memo") { v.memoFocused = false; setMemo(false); continue; }
          else if (k === "b" || (k === "a" && b === 4)) {
            v.memoButton = 4; sfx(SE.select);
            v.memoCursorAnim = { t: 0 }; dirty();
            await frames(8);
            v.memoCursorAnim = null; v.memoFocused = false; dirty();
            continue;
          } else if (k === "a") {
            const c = g.cards[v.cursor];
            if (c.flipped) { sfx(SE.no); continue; }
            sfx(SE.mark);
            c.memo ^= MEMO_FLAGS[b];
            v.memoFocused = false; dirty();
            continue;
          }
          if (v.memoButton !== b) { v.lastMemoButton = b; sfx(SE.select); dirty(); }
          continue;
        }
        if (/^(up|down|left|right)$/.test(k)) { move(k); continue; }
        if (k === "memo" || (k === "a" && v.cursor === 25)) {
          // (From the buttons, the cursor goes back to the first card.)
          if (v.cursor >= 25) { v.cursor = 0; v.row = 0; }
          setMemo(!v.memoOpen);
          continue;
        }
        if (k === "b" && v.memoOpen) { setMemo(false); continue; }
        if (k === "b" || (k === "a" && v.cursor === 26)) {
          sfx(SE.select);
          v.quitAnim = { t: 0 }; dirty();
          await frames(16);
          v.quitAnim = null;
          if (await quitRound()) return;
          continue;
        }
        if (k === "a") {
          const c = g.cards[v.cursor];
          if (v.memoOpen) { if (c.flipped) sfx(SE.no); else { v.memoFocused = true; v.memoButton = 0; v.lastMemoButton = 0; sfx(SE.select); dirty(); } continue; }
          if (c.flipped) { sfx(SE.no); continue; }
          if (await flipCard(v.cursor)) return;
        }
      }
    }

    // ---------- The game ----------
    async function run() {
      await preload();
      await fadeTo(0);
      if (coins >= maxCoins) { await say(TEXT.full); return; }
      let played = false, congratulated = false;
      for (;;) {
        logic.newBoard(g);
        dirty();
        if (played) {
          const diff = g.level - logic.lastLevel(g);
          if (diff > 0) {
            sfx(SE.up);
            await say(TEXT.advanced(g.level));
            if (!congratulated) { congratulated = true; await say(TEXT.congrats); }
          } else if (diff < 0) { sfx(SE.down); await say(TEXT.dropped(g.level)); }
        }
        for (;;) {
          await say(TEXT.play(g.level), { noWait: true });
          const c = await choose(TEXT.menu);
          v.message = null; dirty();
          if (c === 0) break;
          if (c === 2) return;
          for (;;) {
            await say(TEXT.whichInfo, { noWait: true });
            const i = await choose(TEXT.info);
            v.message = null; dirty();
            if (i === 3) break;
            await say([TEXT.howToPlay, TEXT.hint, TEXT.aboutMemos][i]);
          }
        }
        await playRound();
        played = true;
      }
    }
    function finish() {
      done = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onDown, true);
      document.removeEventListener("keyup", onUp, true);
      canvas.remove();
      active = null;
    }
    raf = requestAnimationFrame(tick);
    active = (async () => {
      try { await run(); await fadeTo(16); } finally { finish(); }
      return coins;
    })();
    // (For testing: the game's state.)
    play.debug = () => ({ game: g, view: v, coins });
    return active;
  }

  const api = { play, logic, pagesOf };
  if (typeof window !== "undefined") window.VoltorbFlip = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
