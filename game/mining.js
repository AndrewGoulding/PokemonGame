// Digging in a cave wall: Diamond and Pearl's Underground mining game.
//
// The wall is 13 x 10 tiles of rock, each 1-6 layers deep. Two to four
// treasures are buried in it, plus some bedrock that can't be dug. Each hit
// takes layers off: the pickaxe 2 from the tile hit and 1 from the four
// beside it; the hammer 2 from the tile and 1 from all eight around it, but
// it takes twice the energy. A treasure is yours once every tile over it is
// cleared. The dig ends when every treasure is out, or when you run out of
// energy (anything not fully dug out stays buried). The higher your mining
// level, the more energy you have.
//
// Mining XP: 1 for every hit, 10 more for every treasure dug out.
//
//   const dig = Mining.create(rng, Mining.level(xp), mapName);
//   Mining.hit(dig, x, y, "pick");    // -> { found: [item ids uncovered by this hit], xp }
//   dig.over, dig.tired (out of energy), dig.xp, Mining.found(dig)
(function () {
  const WIDTH = 13, HEIGHT = 10;
  const ENERGY_COST = { pick: 1, hammer: 2 };
  const XP_PER_HIT = 1, XP_PER_TREASURE = 10;
  // Energy for a dig: 40 at level 1, and 2 more each level (238 at level 100).
  const maxEnergy = (lv) => 40 + 2 * ((lv || 1) - 1);

  // What can be buried: item id, how common, its shape ("x" = a tile of it),
  // and the mining level it takes to find it. Each shape is its picture's:
  // a tile is part of the treasure where the item's sprite covers at least a
  // fifth of it (so no part of the picture is left buried, or cut off).
  const TREASURES = [
    ["heart-scale", 20, ["xx", "xx"], 1],
    ["red-shard", 8, [".xx", "xxx", "xx."], 1],
    ["blue-shard", 8, [".xx", "xxx", "xx."], 1],
    ["yellow-shard", 8, [".xxx", "xxxx", "xxx."], 1],
    ["green-shard", 8, [".xxx", "xxxx", "xxx."], 1],
    ["fire-stone", 4, ["xxx", "xxx", "xxx"], 20],
    ["water-stone", 4, ["xxx", "xxx", "xx."], 20],
    ["thunder-stone", 4, ["xxx", "xxx", "xxx"], 20],
    ["leaf-stone", 4, ["xxx", "xxx", "xxx", "xxx"], 20],
    ["moon-stone", 3, ["xxxx", "xxxx"], 20],
    ["sun-stone", 3, ["xxx", "xxx", "xxx"], 20],
    ["oval-stone", 4, ["xxx", "xxx", "xxx"], 10],
    ["everstone", 5, ["xxxx", "xxxx"], 5],
    ["hard-stone", 5, ["xx", "xx"], 5],
    ["star-piece", 5, ["xxx", "xxx", "xxx"], 10],
    ["revive", 5, ["xxx", "xxx", "xxx"], 10],
    ["max-revive", 1, ["xxx", "xxx", "xx."], 63],
    ["rare-bone", 2, ["...xxx", ".xxxx.", "xxx..."], 63],
    ["iron-ball", 2, ["xxx", "xxx", "xxx"], 38],
    ["light-clay", 2, ["xxxx", "xxxx", "xxxx", "xxxx"], 51],
    ["damp-rock", 2, ["xxx", "xxx", "xxx"], 38],
    ["heat-rock", 2, ["xxxx", "xxxx", "xxxx"], 51],
    ["icy-rock", 2, [".xx.", ".xxx", "xxxx", "xxxx"], 51],
    ["smooth-rock", 2, ["..xx", "xxxx", "xxxx", ".xxx"], 38],
    ["helix-fossil", 1, ["xxxx", "xxxx", "xxxx", "xxx."], 30],
    ["dome-fossil", 1, [".xxxx", "xxxxx", "xxxxx"], 30],
    ["old-amber", 1, [".xxx", "xxxx", "xxxx", "xxx."], 30],
    ["root-fossil", 1, [".xxx.", "xxxxx", "xxxxx", "xxxxx"], 30],
    ["claw-fossil", 1, ["xxxxx", "xxxxx", "xxxxx", "xxxx."], 30],
    ["skull-fossil", 1, ["xxxx", "xxxx", "xxxx", "xxxx"], 30],
    ["armor-fossil", 1, ["xxxxx", "xxxxx", "xxxxx", "xxxxx"], 30],
    ["bottle-cap", 2, ["xxx", "xxx", "xxx"], 40],
    ["gold-bottle-cap", 0.5, ["xxx", "xxx", "xxx"], 80],
    ["ability-patch", 0.5, ["xxxx", "xxxx"], 70]
  ].concat(["hp-up", "protein", "iron", "calcium", "zinc", "carbos"].map((v) => [v, 2, ["xx", "xx", "xx"], 15])).concat(["flame", "splash", "zap", "meadow", "icicle", "fist", "toxic", "earth", "sky", "mind", "insect",
    "stone", "spooky", "draco", "dread", "iron"].map((p) => [p + "-plate", 0.5, ["xxxx", "xxxx", "xxxx"], 100]));

  // Mining level, 1 to 100, from your mining XP, on a curve: going from
  // level L to L + 1 takes 20 + floor(L² / 20) XP (20 at first, 40 at level
  // 20, 145 at 50, 510 at 99). LEVELS[L - 1] is the XP for level L.
  const MAX_LEVEL = 100;
  const LEVELS = [0];
  for (let L = 1; L < MAX_LEVEL; L++) LEVELS.push(LEVELS[L - 1] + 20 + Math.floor(L * L / 20));
  const level = (xp) => LEVELS.filter((n) => (xp | 0) >= n).length;
  // XP still needed for the next level (null at the top).
  const toNext = (xp) => (level(xp) >= MAX_LEVEL ? null : LEVELS[level(xp)] - (xp | 0));
  // How far into the current level: { level, into, need } (need 0 at the top).
  function progress(xp) {
    const lv = level(xp);
    if (lv >= MAX_LEVEL) return { level: lv, into: 0, need: 0 };
    return { level: lv, into: (xp | 0) - LEVELS[lv - 1], need: LEVELS[lv] - LEVELS[lv - 1] };
  }

  // Fossils are all found from the same level, but each only in its own caves:
  // Kanto's in Mt. Moon. (Later regions' fossils will get their own caves; until
  // then they aren't found anywhere.) Caves are map name prefixes.
  const FOSSIL_CAVES = {
    "helix-fossil": ["MtMoon"], "dome-fossil": ["MtMoon"], "old-amber": ["MtMoon"],
    "root-fossil": [], "claw-fossil": [], "skull-fossil": [], "armor-fossil": []
  };
  const inCave = (map, caves) => caves.some((c) => String(map || "").startsWith(c + "_"));
  // What can be buried at level `lv` in map `map`.
  const available = (lv, map) => TREASURES.filter((t) => t[3] <= lv && (!FOSSIL_CAVES[t[0]] || inCave(map, FOSSIL_CAVES[t[0]])));

  // Bedrock: shapes that can't be dug.
  const BEDROCK = [["xx", "xx"], ["xxx"], ["x", "x", "x"], ["xxx", ".x."], ["xx.", ".xx"], ["xxxx"]];

  const cells = (shape) => {
    const out = [];
    shape.forEach((row, y) => [...row].forEach((c, x) => { if (c === "x") out.push([x, y]); }));
    return out;
  };

  function pickTreasure(rng, lv, map) {
    const pool = available(lv, map);
    const total = pool.reduce((t, [, w]) => t + w, 0);
    let r = rng() * total;
    for (const t of pool) if ((r -= t[1]) < 0) return t;
    return pool[0];
  }

  // Tries to put a shape somewhere it fits; `taken` marks used tiles.
  function place(shape, taken, rng) {
    const w = shape[0].length, h = shape.length;
    for (let tries = 0; tries < 60; tries++) {
      const x = Math.floor(rng() * (WIDTH - w + 1)), y = Math.floor(rng() * (HEIGHT - h + 1));
      const at = cells(shape).map(([cx, cy]) => [x + cx, y + cy]);
      if (at.some(([ax, ay]) => taken[ay * WIDTH + ax])) continue;
      for (const [ax, ay] of at) taken[ay * WIDTH + ax] = true;
      return { x, y, w, h, cells: at };
    }
    return null;
  }

  // A wall to dig at mining level `lv` (1 if left out), in map `map`.
  function create(rng, lv, map) {
    rng = rng || Math.random;
    lv = lv || 1;
    // Rock: 2-4 layers, with a few deeper mounds.
    const rock = Array.from({ length: WIDTH * HEIGHT }, () => 2 + Math.floor(rng() * 3));
    for (let m = 0; m < 4; m++) {
      const cx = rng() * WIDTH, cy = rng() * HEIGHT, r = 1.5 + rng() * 2;
      for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
        if (Math.hypot(x - cx, y - cy) < r) rock[y * WIDTH + x] = Math.min(6, rock[y * WIDTH + x] + 2);
      }
    }
    const taken = [];
    const treasures = [];
    const count = (lv || 1) <= 10 ? 2 : (lv || 1) <= 20 ? 3 : 4;   // more to find as you level up
    for (let i = 0; i < count; i++) {
      const [item, , shape] = pickTreasure(rng, lv, map);
      const at = place(shape, taken, rng);
      if (at) treasures.push(Object.assign({ item, found: false }, at));
    }
    const bedrock = new Array(WIDTH * HEIGHT).fill(false);
    const rocks = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < rocks; i++) {
      const at = place(BEDROCK[Math.floor(rng() * BEDROCK.length)], taken, rng);
      if (at) for (const [x, y] of at.cells) bedrock[y * WIDTH + x] = true;
    }
    const energy = maxEnergy(lv);
    return { width: WIDTH, height: HEIGHT, level: lv, rock, bedrock, treasures, energy, maxEnergy: energy, xp: 0, over: false, tired: false };
  }

  // One hit with "pick" or "hammer" at (x, y).
  function hit(dig, x, y, tool) {
    if (dig.over || x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return { found: [], xp: 0 };
    const around = tool === "hammer"
      ? [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
      : [[0, -1], [-1, 0], [1, 0], [0, 1]];
    const dent = (tx, ty, n) => {
      if (tx < 0 || ty < 0 || tx >= WIDTH || ty >= HEIGHT) return;
      const i = ty * WIDTH + tx;
      if (!dig.bedrock[i]) dig.rock[i] = Math.max(0, dig.rock[i] - n);
    };
    dent(x, y, 2);
    for (const [dx, dy] of around) dent(x + dx, y + dy, 1);
    dig.energy = Math.max(0, dig.energy - ENERGY_COST[tool === "hammer" ? "hammer" : "pick"]);
    const found = [];
    for (const t of dig.treasures) {
      if (!t.found && t.cells.every(([cx, cy]) => dig.rock[cy * WIDTH + cx] === 0)) { t.found = true; found.push(t.item); }
    }
    const xp = XP_PER_HIT + XP_PER_TREASURE * found.length;
    dig.xp += xp;
    if (dig.treasures.every((t) => t.found)) dig.over = true;
    else if (dig.energy <= 0) dig.over = dig.tired = true;
    return { found, xp };
  }

  const found = (dig) => dig.treasures.filter((t) => t.found).map((t) => t.item);

  window.Mining = { WIDTH, HEIGHT, ENERGY_COST, XP_PER_HIT, XP_PER_TREASURE, TREASURES, LEVELS, MAX_LEVEL, FOSSIL_CAVES,
    maxEnergy, level, toNext, progress, available, create, hit, found };
})();
