// Digging in a cave wall: Diamond and Pearl's Underground mining game.
//
// The wall is 13 x 10 tiles of rock, each 1-6 layers deep. Two to four
// treasures are buried in it, plus some bedrock that can't be dug. Each hit
// takes layers off: the pickaxe 2 from the tile hit and 1 from the four
// beside it; the hammer 2 from the tile and 1 from all eight around it, but
// it shakes the wall twice as much. A treasure is yours once every tile over
// it is cleared. When the wall has taken too much, it collapses and the dig
// is over; anything not fully dug out stays buried.
//
//   const dig = Mining.create(rng, Mining.level(treasuresDugSoFar), mapName);
//   Mining.hit(dig, x, y, "pick");    // -> { found: [item ids uncovered by this hit] }
//   dig.over, dig.collapsed, Mining.found(dig)
(function () {
  const WIDTH = 13, HEIGHT = 10;
  const WALL = 50;                          // how much shaking the wall takes
  const SHAKE = { pick: 1, hammer: 2 };

  // What can be buried: item id, how common, its shape ("x" = a tile of it),
  // and the mining level it takes to find it. Shapes follow Diamond and
  // Pearl's where they're known, and are close otherwise.
  const TREASURES = [
    ["heart-scale", 20, ["x.", "xx"], 1],
    ["red-shard", 8, ["xxx", "xx.", "x.x"], 1],
    ["blue-shard", 8, ["xxx", "xxx", "xx."], 1],
    ["yellow-shard", 8, ["x.x.", "xxx.", "xxxx"], 1],
    ["green-shard", 8, ["xxxx", "xxxx", "xx.x"], 1],
    ["fire-stone", 4, ["xxx", "xxx", "xxx"], 20],
    ["water-stone", 4, ["xxx", "xxx", "xx."], 20],
    ["thunder-stone", 4, [".xx", "xxx", "xx."], 20],
    ["leaf-stone", 4, [".x.", "xxx", "xxx", ".x."], 20],
    ["moon-stone", 3, [".xxx", "xxx."], 20],
    ["sun-stone", 3, [".x.", "xxx", "xxx"], 20],
    ["oval-stone", 4, ["xxx", "xxx", "xxx"], 10],
    ["everstone", 5, ["xxxx", "xxxx"], 1],
    ["hard-stone", 5, ["xx", "xx"], 1],
    ["star-piece", 5, [".x.", "xxx", ".x."], 10],
    ["revive", 5, [".x.", "xxx", ".x."], 10],
    ["max-revive", 1, ["xxx", "xxx", "xxx"], 63],
    ["rare-bone", 2, ["x....x", "xxxxxx", "x....x"], 63],
    ["iron-ball", 2, ["xxx", "xxx", "xxx"], 38],
    ["light-clay", 2, ["x.x.", "xxx.", "xxxx", ".x.x"], 51],
    ["damp-rock", 2, ["xxx", "xxx", "x.x"], 38],
    ["heat-rock", 2, ["x.x.", "xxxx", "xxxx"], 51],
    ["icy-rock", 2, [".xx.", "xxxx", "xxxx", "x..x"], 51],
    ["smooth-rock", 2, ["..x.", "xxx.", ".xxx", ".x.."], 38],
    ["helix-fossil", 1, [".xxx", "xxxx", "xxxx", "xxx."], 30],
    ["dome-fossil", 1, ["xxxxx", "xxxxx", ".xxx."], 30],
    ["old-amber", 1, [".xxx", "xxxx", "xxxx", "xxx."], 30],
    ["root-fossil", 1, ["xxxx.", "xxxxx", "xx.xx", "...xx"], 30],
    ["claw-fossil", 1, ["..xxx", ".xxxx", "xxxx.", "xx..."], 30],
    ["skull-fossil", 1, ["xxxx", "xxxx", "xxxx", ".xx."], 30],
    ["armor-fossil", 1, [".xxx.", ".xxx.", "xxxxx", ".xxx."], 30]
  ].concat(["flame", "splash", "zap", "meadow", "icicle", "fist", "toxic", "earth", "sky", "mind", "insect",
    "stone", "spooky", "draco", "dread", "iron"].map((p) => [p + "-plate", 0.5, ["xxxx", "xxxx", "xxxx"], 100]));

  // Mining level, 1 to 100: it starts at 1 and rises with the treasures you've
  // dug out. Going from level L to L + 1 takes 1 + floor(L / 20) more (1 each
  // up to level 20, then 2, 3, 4 and 5; 299 in all for level 100). LEVELS[L - 1]
  // is the total needed for level L.
  const MAX_LEVEL = 100;
  const LEVELS = [0];
  for (let L = 1; L < MAX_LEVEL; L++) LEVELS.push(LEVELS[L - 1] + 1 + Math.floor(L / 20));
  const level = (dug) => LEVELS.filter((n) => (dug | 0) >= n).length;
  // Treasures dug out to reach the next level (null at the top).
  const toNext = (dug) => (level(dug) >= MAX_LEVEL ? null : LEVELS[level(dug)] - (dug | 0));

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
    const count = 2 + Math.floor(rng() * 3);
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
    return { width: WIDTH, height: HEIGHT, level: lv, rock, bedrock, treasures, shaken: 0, wall: WALL, over: false, collapsed: false };
  }

  // One hit with "pick" or "hammer" at (x, y).
  function hit(dig, x, y, tool) {
    if (dig.over || x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return { found: [] };
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
    dig.shaken = Math.min(dig.wall, dig.shaken + SHAKE[tool === "hammer" ? "hammer" : "pick"]);
    const found = [];
    for (const t of dig.treasures) {
      if (!t.found && t.cells.every(([cx, cy]) => dig.rock[cy * WIDTH + cx] === 0)) { t.found = true; found.push(t.item); }
    }
    if (dig.treasures.every((t) => t.found)) dig.over = true;
    else if (dig.shaken >= dig.wall) dig.over = dig.collapsed = true;
    return { found };
  }

  const found = (dig) => dig.treasures.filter((t) => t.found).map((t) => t.item);

  window.Mining = { WIDTH, HEIGHT, WALL, SHAKE, TREASURES, LEVELS, MAX_LEVEL, FOSSIL_CAVES, level, toNext, available, create, hit, found };
})();
