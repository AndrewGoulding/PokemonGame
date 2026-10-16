// FireRed's Berry Crush (src/berry_crush.c), headless: the game the leader
// runs each frame and the results it works out at the end. FireRed plays it
// over the Wireless Adapter with 2 to 5 people; here the others are the
// computer (BerryCrush.cpuPress), pressing at a steady rhythm of their own.
// No dependencies.
//
//   BerryCrush.BERRIES[name]        -> [difficulty, powder] (gBerryCrush_BerryData)
//   BerryCrush.stats(itemId)        -> { difficulty, powder } ("oran-berry")
//   const g = BerryCrush.create([{ name, berry }, ...])   // you first
//   const fx = BerryCrush.step(g, presses, held)
//     // one frame: presses[i] (A newly pressed), held[i] (A down)
//     // -> { depth (0-32), vibration, impacts: [{ player, big, offset }],
//     //      sparkles: { count, big } or null, sound: "se_mud_ball" |
//     //      "se_breakable_door" | null, done, timeUp }
//   BerryCrush.results(g, rng)      -> the three results pages' numbers, the
//                                      powder made and the pressing speed
//   BerryCrush.cpu(rng) / BerryCrush.cpuPress(cpu, timer) / cpuHeld(cpu, timer)
//   BerryCrush.speedText(q88)       -> "4.25" (a Q8.8 speed as FireRed prints it)
(function () {
  "use strict";

  const MAX_TIME = 10 * 60 * 60;
  // [difficulty, powder]: the A presses a Berry needs, and what it makes.
  const BERRIES = {
    cheri: [50, 20], chesto: [50, 20], pecha: [50, 20], rawst: [50, 20], aspear: [50, 20],
    leppa: [50, 30], oran: [50, 30], persim: [50, 30], lum: [50, 30], sitrus: [50, 30],
    figy: [60, 50], wiki: [60, 50], mago: [60, 50], aguav: [60, 50], iapapa: [60, 50],
    razz: [80, 70], bluk: [80, 70], nanab: [80, 70], wepear: [80, 70], pinap: [80, 70],
    pomeg: [100, 100], kelpsy: [100, 100], qualot: [100, 100], hondew: [100, 100], grepa: [100, 100],
    tamato: [130, 150], cornn: [130, 150], magost: [130, 150], rabuta: [130, 150], nomel: [130, 150],
    spelon: [160, 250], pamtre: [160, 250], watmel: [160, 250], durin: [160, 250], belue: [160, 250],
    liechi: [180, 500], ganlon: [180, 500], salac: [180, 500], petaya: [180, 500], apicot: [180, 500],
    lansat: [200, 750], starf: [200, 750], enigma: [150, 200]
  };
  // (A Berry FireRed hasn't got: the middle of the table.)
  function stats(id) {
    const s = BERRIES[String(id).replace(/-berry$/, "")] || [100, 100];
    return { difficulty: s[0], powder: s[1] };
  }
  const SYNC_BONUS = [0, 1, 2, 3, 5];   // sSyncPressBonus
  const VIBRATION = [[3, 2, 1, 0], [3, 3, 1, 0], [3, 3, 2, 0], [3, 4, 2, 0], [3, 5, 3, 0]];   // sVibrationData
  // sIntroOutroVibrationData: [frames, offsets...] from the strongest (4) down.
  const INTRO_OUTRO = [[4, 1, 0, -1, 0, 0, 0], [4, 2, 0, -1, 0, 0, 0], [4, 2, 0, -2, 0, 0, 0], [6, 3, 1, -1, -3, -1, 0], [6, 4, 1, -2, -4, -2, 0]];
  const SPARKLE_THRESHOLDS = [[2, 4, 6, 7], [3, 5, 8, 11], [3, 7, 11, 15], [4, 8, 12, 17]];
  const BIG_SPARKLE_THRESHOLDS = [5, 7, 9, 12];
  const IMPACT_OFFSETS = [[0, 0], [-1, 0], [1, 1]];   // sImpactCoords

  function create(players) {
    const g = {
      count: players.length, timer: 0, totalAPresses: 0, targetAPresses: 0, powder: 0,
      depth: 0, endGame: false, bigSparkle: false, sparkleAmount: 0,
      bigSparkleCounter: 0, numBigSparkles: 0, numBigSparkleChecks: 0, sparkleCounter: 0,
      vib: { counter: 0, idx: 0, num: 0, on: false }, playedSound: false,
      players: players.map((p) => ({ name: p.name, berry: p.berry, inputTime: 0, neatInputStreak: 0, timeSincePrevInput: 0,
        maxNeatInputStreak: 0, numAPresses: 0, numSyncedAPresses: 0, timePressingA: 0, inputFlags: 0, inputState: 0 }))
    };
    for (const p of g.players) {
      const s = stats(p.berry);
      g.targetAPresses += s.difficulty;
      g.powder += s.powder;
    }
    return g;
  }

  // One frame of Cmd_PlayGame_Leader: HandlePartnerInput, BuildLocalState,
  // HandlePlayerInput (as the leader, every frame) and UpdateInputEffects.
  function step(g, presses, held) {
    g.timer++;
    let n = 0;
    g.players.forEach((p, i) => {
      if (held && held[i] && p.timePressingA < g.timer) p.timePressingA++;
      if (!presses[i]) { p.inputState = 0; return; }
      p.inputState = 1;
      p.numAPresses++;
      n++;
      // A press at the same interval as the last (give or take a frame) is "neat".
      const diff = g.timer - p.inputTime;
      if (diff >= p.timeSincePrevInput - 1 && diff <= p.timeSincePrevInput + 1) {
        p.neatInputStreak++;
        p.timeSincePrevInput = diff;
        p.maxNeatInputStreak = Math.max(p.maxNeatInputStreak, p.neatInputStreak);
      } else { p.neatInputStreak = 0; p.timeSincePrevInput = diff; }
      p.inputTime = g.timer;
      p.inputFlags = p.inputFlags + 1 > 2 ? 0 : p.inputFlags + 1;
    });
    if (n > 1) for (const p of g.players) if (p.inputState) { p.inputState |= 2; p.numSyncedAPresses++; }
    if (n) {
      g.bigSparkleCounter += n;
      const counted = n + SYNC_BONUS[n - 1];
      g.sparkleCounter += counted;
      g.totalAPresses += counted;
      if (g.targetAPresses - g.totalAPresses > 0) g.depth = Math.floor(g.totalAPresses * 32 / g.targetAPresses);
      else { g.depth = 32; g.endGame = true; }
    }
    // The shaking (BerryCrush_BuildLocalState, its comparison and all).
    const v = g.vib;
    if (!n) { if (v.on) v.counter++; }
    else if (v.on) {
      if (n !== v.idx) { v.idx = n - 1; v.num = VIBRATION[n - 1][0]; } else v.counter++;
    } else { v.counter = 0; v.idx = n - 1; v.num = VIBRATION[n - 1][0]; v.on = true; }
    let vibration = 0;
    if (v.on) {
      if (v.counter >= v.num) { v.counter = 0; v.idx = 0; v.num = 0; v.on = false; }
      else vibration = VIBRATION[v.idx][v.counter + 1];
    }
    // Every 30 frames: big sparkles if there were enough presses.
    if (g.timer % 30 === 0) {
      g.bigSparkle = g.bigSparkleCounter > BIG_SPARKLE_THRESHOLDS[g.count - 2];
      if (g.bigSparkle) g.numBigSparkles++;
      g.bigSparkleCounter = 0;
      g.numBigSparkleChecks++;
    }
    // Every 15: how many sparkles (FireRed's bug and all: only 0, 1 or 4 are
    // ever set, the middle two write the counter instead).
    if (g.timer % 15 === 0) {
      const t = SPARKLE_THRESHOLDS[g.count - 2], c = g.sparkleCounter;
      if (c < t[0]) g.sparkleAmount = 0;
      else if (c < t[1]) g.sparkleAmount = 1;
      else if (c >= t[3]) g.sparkleAmount = 4;
      g.sparkleCounter = 0;
    }
    const timeUp = g.timer >= MAX_TIME;
    if (timeUp) g.endGame = true;
    // What shows (UpdateInputEffects).
    const impacts = [];
    g.players.forEach((p, i) => {
      if (!p.inputState) return;
      const flags = (p.inputFlags + 1) | (p.inputState & 2 ? 4 : 0);
      impacts.push({ player: i, big: !!(flags & 4), offset: IMPACT_OFFSETS[(flags % 4) - 1] });
    });
    let sound = null;
    if (!n) g.playedSound = false;
    else if (g.playedSound) g.playedSound = false;
    else { sound = n === 1 ? "se_mud_ball" : "se_breakable_door"; g.playedSound = true; }
    return { depth: g.depth, vibration, impacts, sparkles: n ? { count: g.sparkleAmount * 2 + 3, big: g.bigSparkle } : null,
      sound, done: g.endGame, timeUp };
  }

  // Cmd_TabulateResults and SaveResults: the time, silkiness (how often the
  // presses came fast enough for big sparkles), the powder (everyone's
  // Berries' powder, times the players, times the silkiness), the presses
  // ranking and one of neatness, cooperation or pressing power at random.
  const PAGES = ["neatness", "cooperative", "power"];
  function results(g, rng) {
    rng = rng || Math.random;
    const time = g.timer;
    const silkiness = (Math.floor(Math.floor(g.numBigSparkles * 50 * 256 / Math.max(1, g.numBigSparkleChecks)) / 256) + 50) & 0x7f;
    const powder = Math.floor(g.powder * g.count * Math.floor(silkiness * 256 / 100) / 256);
    const page = PAGES[Math.floor(rng() * 3)];
    const pct = (a, b) => (b ? Math.floor(a * 100 * 256 / b) : 0) >> 4;   // (Q.4)
    const randomStat = (p) => {
      if (!p.numAPresses) return 0;
      if (page === "neatness") return pct(p.maxNeatInputStreak, p.numAPresses);
      if (page === "cooperative") return pct(p.numSyncedAPresses, p.numAPresses);
      return p.timePressingA >= time ? 100 << 4 : pct(p.timePressingA, time);
    };
    const totalAPresses = g.players.reduce((s, p) => s + p.numAPresses, 0);
    // (Stable, highest first, as its bubble sort.)
    const rank = (stat) => g.players.map((p, i) => ({ player: i, stat: stat(p) })).sort((a, b) => b.stat - a.stat || a.player - b.player);
    const timeQ = Math.floor(time * 256 / 60);
    const pressingSpeed = timeQ ? Math.floor(totalAPresses * 65536 / timeQ) & 0xffff : 0;
    return {
      time, silkiness, powder: Math.min(powder, 99999), page, totalAPresses, pressingSpeed,
      presses: rank((p) => p.numAPresses), random: rank(randomStat),
      berries: g.players.map((p) => p.berry)
    };
  }

  // A Q8.8 number as FireRed prints it: whole, then its top 8 fraction bits
  // as hundredths (sPressingSpeedConversionTable).
  const CONVERSION = [50000000, 25000000, 12500000, 6250000, 3125000, 1562500, 781250, 390625];
  function fracDigits(bits, n) {
    let score = 0;
    for (let j = 0; j < n; j++) if ((bits >> (n - 1 - j)) & 1) score += CONVERSION[j];
    return String(Math.floor(score / 1000000)).padStart(2, "0");
  }
  const speedText = (q) => (q >> 8) + "." + fracDigits(q & 0xff, 8);
  const q4Text = (q) => (q >> 4) + "." + fracDigits(q & 15, 4);
  // FramesToMinSec: minutes, seconds and hundredths.
  function minSec(frames) {
    const fracQ = Math.floor((frames % 60) * 256 * Math.floor(0.016666667 * 256) / 256);
    return { min: Math.floor(frames / 3600), sec: Math.floor((frames % 3600) / 60), frac: fracDigits(fracQ & 0xff, 8) };
  }

  // The computer's players: each presses every `period` frames, a frame
  // either way now and then, and holds A for a few frames.
  function cpu(rng) {
    rng = rng || Math.random;
    return { rng, period: 7 + Math.floor(rng() * 4), next: 1 + Math.floor(rng() * 8), hold: 2 + Math.floor(rng() * 3), last: -99 };
  }
  function cpuPress(c, timer) {
    if (timer < c.next) return false;
    const r = c.rng();
    c.next = timer + c.period + (r < 0.15 ? -1 : r > 0.85 ? 1 : 0);
    c.last = timer;
    return true;
  }
  const cpuHeld = (c, timer) => timer - c.last < c.hold;

  window.BerryCrush = { MAX_TIME, BERRIES, INTRO_OUTRO, stats, create, step, results, speedText, q4Text, minSec, cpu, cpuPress, cpuHeld };
})();
