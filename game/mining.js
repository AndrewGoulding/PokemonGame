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
//   const dig = Mining.create(rng);
//   Mining.hit(dig, x, y, "pick");    // -> { found: [item ids uncovered by this hit] }
//   dig.over, dig.collapsed, Mining.found(dig)
(function () {
  const WIDTH = 13, HEIGHT = 10;
  const WALL = 50;                          // how much shaking the wall takes
  const SHAKE = { pick: 1, hammer: 2 };

  // What can be buried: item id, how common, and its shape ("x" = a tile of it).
  // Shapes follow Diamond and Pearl's where they're known, and are close otherwise.
  const TREASURES = [
    ["heart-scale", 20, ["x.", "xx"]],
    ["red-shard", 8, ["xxx", "xx.", "x.x"]],
    ["blue-shard", 8, ["xxx", "xxx", "xx."]],
    ["yellow-shard", 8, ["x.x.", "xxx.", "xxxx"]],
    ["green-shard", 8, ["xxxx", "xxxx", "xx.x"]],
    ["fire-stone", 4, ["xxx", "xxx", "xxx"]],
    ["water-stone", 4, ["xxx", "xxx", "xx."]],
    ["thunder-stone", 4, [".xx", "xxx", "xx."]],
    ["leaf-stone", 4, [".x.", "xxx", "xxx", ".x."]],
    ["moon-stone", 3, [".xxx", "xxx."]],
    ["sun-stone", 3, [".x.", "xxx", "xxx"]],
    ["oval-stone", 4, ["xxx", "xxx", "xxx"]],
    ["everstone", 5, ["xxxx", "xxxx"]],
    ["hard-stone", 5, ["xx", "xx"]],
    ["star-piece", 5, [".x.", "xxx", ".x."]],
    ["revive", 5, [".x.", "xxx", ".x."]],
    ["max-revive", 1, ["xxx", "xxx", "xxx"]],
    ["rare-bone", 2, ["x....x", "xxxxxx", "x....x"]],
    ["iron-ball", 2, ["xxx", "xxx", "xxx"]],
    ["light-clay", 2, ["x.x.", "xxx.", "xxxx", ".x.x"]],
    ["damp-rock", 2, ["xxx", "xxx", "x.x"]],
    ["heat-rock", 2, ["x.x.", "xxxx", "xxxx"]],
    ["icy-rock", 2, [".xx.", "xxxx", "xxxx", "x..x"]],
    ["smooth-rock", 2, ["..x.", "xxx.", ".xxx", ".x.."]],
    ["helix-fossil", 1, [".xxx", "xxxx", "xxxx", "xxx."]],
    ["dome-fossil", 1, ["xxxxx", "xxxxx", ".xxx."]],
    ["old-amber", 1, [".xxx", "xxxx", "xxxx", "xxx."]],
    ["root-fossil", 1, ["xxxx.", "xxxxx", "xx.xx", "...xx"]],
    ["claw-fossil", 1, ["..xxx", ".xxxx", "xxxx.", "xx..."]],
    ["skull-fossil", 1, ["xxxx", "xxxx", "xxxx", ".xx."]],
    ["armor-fossil", 1, [".xxx.", ".xxx.", "xxxxx", ".xxx."]]
  ].concat(["flame", "splash", "zap", "meadow", "icicle", "fist", "toxic", "earth", "sky", "mind", "insect",
    "stone", "spooky", "draco", "dread", "iron"].map((p) => [p + "-plate", 0.5, ["xxxx", "xxxx", "xxxx"]]));

  // Bedrock: shapes that can't be dug.
  const BEDROCK = [["xx", "xx"], ["xxx"], ["x", "x", "x"], ["xxx", ".x."], ["xx.", ".xx"], ["xxxx"]];

  const cells = (shape) => {
    const out = [];
    shape.forEach((row, y) => [...row].forEach((c, x) => { if (c === "x") out.push([x, y]); }));
    return out;
  };

  function pickTreasure(rng) {
    const total = TREASURES.reduce((t, [, w]) => t + w, 0);
    let r = rng() * total;
    for (const t of TREASURES) if ((r -= t[1]) < 0) return t;
    return TREASURES[0];
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

  function create(rng) {
    rng = rng || Math.random;
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
      const [item, , shape] = pickTreasure(rng);
      const at = place(shape, taken, rng);
      if (at) treasures.push(Object.assign({ item, found: false }, at));
    }
    const bedrock = new Array(WIDTH * HEIGHT).fill(false);
    const rocks = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < rocks; i++) {
      const at = place(BEDROCK[Math.floor(rng() * BEDROCK.length)], taken, rng);
      if (at) for (const [x, y] of at.cells) bedrock[y * WIDTH + x] = true;
    }
    return { width: WIDTH, height: HEIGHT, rock, bedrock, treasures, shaken: 0, wall: WALL, over: false, collapsed: false };
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

  window.Mining = { WIDTH, HEIGHT, WALL, SHAKE, TREASURES, create, hit, found };
})();
