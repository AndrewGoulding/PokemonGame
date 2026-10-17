// Picking berries with the Berry Pouch (this game's own): in a forest, you
// shake a berry tree and catch what falls.
//
// A meter's cursor sweeps back and forth across a bar with a sweet spot in
// it (a new one after every shake). A on the sweet spot is a perfect shake:
// three ripe (purple) berries come down, and maybe a gold one; near it, a
// good shake: a ripe and a green (unripe) one; anywhere else, two green
// ones. Shaking again while the tree is still swaying (a second and a half)
// is over-shaking: three green berries and points off. Berries fall from all over the tree: ripe
// ones slowly, green ones faster, gold ones fastest. You move left and right
// along the bottom with your basket to catch them: a ripe one is worth 10, a
// gold one 30, and every good catch in a row adds a combo bonus (2 points a
// catch in the combo, up to 20); a green one caught costs 10 and breaks the
// combo, and so does letting a ripe or gold one drop. A berry is caught if
// it touches you or your basket at all. 30 seconds a game, and every perfect
// shake adds 2 more (up to the full 30 left); when time's up you can't shake
// any more, but you can still move until the last berries are down.
//
// The berries you take home: one, and one more for every 60 points, fewer
// if you caught a lot of green ones or missed a lot; your farming level adds
// up to as many again (all of them again at level 100), and each gold berry
// caught brings one from the best tier you can pick. Which berries: TIERS,
// every berry in the game, each tier from a farming level (the Enigma Berry,
// alone, from 85); the tiers you can pick from come up in turn, each half as
// often as the one below it. Farming XP: 5 a game, and 1 for every 10 points.
// Farming levels go as mining's do (game/mining.js).
//
//   const game = BerryPicking.create(rng, level);
//   BerryPicking.step(game, { left, right, shake })   // once a frame (60 a second); game.events: what happened
//   game.over -> const r = BerryPicking.result(game); BerryPicking.rewards(r, level, rng) -> [berry ids]
(function () {
  const W = 240, H = 160;
  const FRAMES = 30 * 60;
  const CATCH_Y = 124, BASKET_HALF = 12, PLAYER_SPEED = 2.5, PLAYER_MIN = 16, PLAYER_MAX = W - 16;
  // What catches a berry, round your x: the basket (CATCH_Y - 1 to + 7, as
  // ui/berry-picking.js draws it) and you under it (your sprite's body, its
  // head from CATCH_Y + 4 down to your feet); and a berry's radius.
  const BASKET_BOX = { half: BASKET_HALF + 1, y0: CATCH_Y - 1, y1: CATCH_Y + 7 };
  const BODY_BOX = { half: 6, y0: CATCH_Y + 4, y1: CATCH_Y + 25 };
  const BERRY_R = 3;
  const PERFECT_BONUS = 2 * 60;       // a perfect shake's extra time (frames)
  const CANOPY = { x0: 56, x1: 184, y0: 22, y1: 66 };
  const FALL = { ripe: 0.9, green: 1.4, gold: 2.2 };   // pixels a frame
  const POINTS = { ripe: 10, gold: 30, green: -10, overShake: -15 };
  const COMBO_POINTS = 2, COMBO_MAX = 10;
  const METER_FRAMES = 50;            // the cursor's sweep, one way
  const SWEET = 0.07, NEAR = 0.17;    // half-widths of the sweet spot and the zone around it
  const SWAY_FRAMES = 90;             // the tree sways this long after a shake
  const OVER_SHAKE = 0.45;            // shaking with more sway than this left is over-shaking
  const GOLD_CHANCE = 0.3;            // a perfect shake's chance of a gold berry

  // [from farming level, name, berries]: every berry in the game, in tiers.
  const TIERS = [
    [1, "Basic", ["cheri", "chesto", "pecha", "rawst", "aspear", "oran", "persim"]],
    [10, "Restoring", ["leppa", "sitrus", "lum", "figy", "wiki", "mago", "aguav", "iapapa"]],
    [20, "Contest", ["razz", "bluk", "nanab", "wepear", "pinap", "cornn", "magost", "rabuta", "nomel"]],
    [30, "EV-reducing", ["pomeg", "kelpsy", "qualot", "hondew", "grepa", "tamato"]],
    [40, "Rare contest", ["spelon", "pamtre", "watmel", "durin", "belue"]],
    [45, "Type-resisting", ["occa", "passho", "wacan", "rindo", "yache", "chople", "kebia", "shuca", "coba", "payapa",
      "tanga", "charti", "kasib", "haban", "colbur", "babiri", "chilan", "roseli"]],
    [60, "Pinch", ["liechi", "ganlon", "salac", "petaya", "apicot", "lansat", "starf", "micle", "custap"]],
    [70, "Retaliation", ["jaboca", "rowap", "kee", "maranga"]],
    [85, "Legendary", ["enigma"]]
  ].map(([from, name, berries]) => ({ from, name, berries: berries.map((b) => b + "-berry").filter((id) => !window.ITEMS || window.ITEMS[id]) }));
  const tiersAt = (lv) => TIERS.filter((t) => (lv || 1) >= t.from);

  // The meter's cursor, 0-1, at frame `t`: back and forth.
  const meterAt = (t) => { const p = (t % (2 * METER_FRAMES)) / METER_FRAMES; return p <= 1 ? p : 2 - p; };

  function create(rng, level) {
    rng = rng || Math.random;
    return { rng, level: level || 1, t: 0, left: FRAMES, x: W / 2, facing: "up", sway: 0, swayDir: 1,
      sweet: 0.2 + rng() * 0.6, berries: [], score: 0, combo: 0, bestCombo: 0,
      ripe: 0, gold: 0, bad: 0, misses: 0, shakes: 0, over: false, events: [] };
  }

  function drop(g, kind, delay) {
    const rng = g.rng;
    g.berries.push({ kind, x: CANOPY.x0 + rng() * (CANOPY.x1 - CANOPY.x0), y: CANOPY.y0 + rng() * (CANOPY.y1 - CANOPY.y0),
      speed: FALL[kind] * (0.9 + rng() * 0.2), wait: delay });
  }

  // How a shake at the cursor's place goes: "perfect", "good", "bad" or "over".
  function shakeQuality(g) {
    if (g.sway > OVER_SHAKE) return "over";
    const d = Math.abs(meterAt(g.t) - g.sweet);
    return d <= SWEET ? "perfect" : d <= NEAR ? "good" : "bad";
  }
  function shake(g) {
    const q = shakeQuality(g), rng = g.rng;
    g.shakes++;
    const kinds = q === "perfect" ? ["ripe", "ripe", "ripe"].concat(rng() < GOLD_CHANCE ? ["gold"] : [])
      : q === "good" ? ["ripe", "green"] : q === "bad" ? ["green", "green"] : ["green", "green", "green"];
    kinds.forEach((k, i) => drop(g, k, i * 6 + Math.floor(rng() * 6)));
    if (q === "over") { g.score = Math.max(0, g.score + POINTS.overShake); g.combo = 0; }
    g.sway = 1;
    g.swayDir = -g.swayDir;
    g.sweet = 0.15 + rng() * 0.7;
    // (A perfect shake: a little more time.)
    const bonus = q === "perfect" ? Math.min(PERFECT_BONUS, FRAMES - g.left) : 0;
    g.left += bonus;
    g.events.push({ type: "shake", quality: q, bonus });
  }

  // One frame. input: { left, right, shake } (shake: A pressed this frame).
  function step(g, input) {
    input = input || {};
    g.events = [];
    if (g.over) return g;
    g.t++;
    if (g.left > 0) {
      g.left--;
      if (input.shake) shake(g);
    }
    // (You can move until the last berries are down, time up or not.)
    if (input.left && !input.right) { g.x = Math.max(PLAYER_MIN, g.x - PLAYER_SPEED); g.facing = "left"; }
    else if (input.right && !input.left) { g.x = Math.min(PLAYER_MAX, g.x + PLAYER_SPEED); g.facing = "right"; }
    else g.facing = "up";
    g.sway = Math.max(0, g.sway - 1 / SWAY_FRAMES);
    for (const b of g.berries) {
      if (b.wait > 0) { b.wait--; continue; }
      b.y += b.speed;
      if (touches(b, g.x)) {
        b.done = true;
        if (b.kind === "green") {
          g.bad++; g.combo = 0; g.score = Math.max(0, g.score + POINTS.green);
        } else {
          g[b.kind]++;
          g.combo++;
          g.bestCombo = Math.max(g.bestCombo, g.combo);
          g.score += POINTS[b.kind] + COMBO_POINTS * Math.min(g.combo, COMBO_MAX);
        }
        g.events.push({ type: "catch", kind: b.kind, combo: g.combo });
      } else if (b.y > H + 8) {
        b.done = true;
        if (b.kind !== "green") { g.misses++; g.combo = 0; g.events.push({ type: "miss", kind: b.kind }); }
      }
    }
    g.berries = g.berries.filter((b) => !b.done);
    // (Time's up once the last berries have come down.)
    if (g.left === 0 && !g.berries.length) g.over = true;
    return g;
  }

  // Does a falling berry touch you or your basket (at x)? (A berry falls at
  // most 2.4 pixels a frame, less than either box is tall, so none slips through.)
  function touches(b, x) {
    const hit = (box) => Math.abs(b.x - x) <= box.half + BERRY_R && b.y + BERRY_R >= box.y0 && b.y - BERRY_R <= box.y1;
    return hit(BASKET_BOX) || hit(BODY_BOX);
  }

  // What a finished game came to.
  function result(g) {
    const base = 1 + Math.floor(g.score / 60);
    const factor = Math.max(0.5, 1 - 0.05 * Math.max(0, g.bad - 2) - 0.03 * Math.max(0, g.misses - 4));
    return { score: g.score, ripe: g.ripe, gold: g.gold, bad: g.bad, misses: g.misses, bestCombo: g.bestCombo,
      berries: Math.max(1, Math.round(base * factor)), xp: 5 + Math.floor(g.score / 10) };
  }

  // A berry from the tiers at level `lv`: each tier half as likely as the one below it.
  function pickBerry(lv, rng, best) {
    const open = tiersAt(lv);
    let tier = open[open.length - 1];
    if (!best) {
      const weights = open.map((_, i) => 2 ** (open.length - 1 - i)), total = weights.reduce((a, b) => a + b, 0);
      let roll = rng() * total;
      tier = open.find((_, i) => (roll -= weights[i]) < 0) || tier;
    }
    return tier.berries[Math.floor(rng() * tier.berries.length)];
  }
  // The berries a result brings home at farming level `lv`.
  function rewards(r, lv, rng) {
    rng = rng || Math.random;
    lv = lv || 1;
    const bonus = Math.floor(r.berries * Math.min(lv, 100) / 100);
    const out = [];
    for (let i = 0; i < r.berries + bonus; i++) out.push(pickBerry(lv, rng));
    for (let i = 0; i < r.gold; i++) out.push(pickBerry(lv, rng, true));
    return out;
  }

  const M = () => window.Mining;
  window.BerryPicking = { W, H, FRAMES, CATCH_Y, BASKET_HALF, CANOPY, FALL, POINTS, TIERS, SWEET, NEAR, PERFECT_BONUS,
    create, step, touches, meterAt, shakeQuality, result, rewards, pickBerry, tiersAt,
    get MAX_LEVEL() { return M().MAX_LEVEL; },
    level: (xp) => M().level(xp), toNext: (xp) => M().toNext(xp), progress: (xp) => M().progress(xp) };
})();
