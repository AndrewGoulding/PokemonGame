// The Battle Pyramid's floors (src/battle_pyramid.c): a floor is a 4 x 4 of 8 x 8 squares, each picked from the
// squares its template allows, with a way in, a way out and the trainers and items scattered over it. Built from
// the four numbers the floor's seeded with, so a floor you come back to (a saved game) is the one you left.
//
//   HoennPyramid.floor(window.HOENN_PYRAMID, seed [4 numbers 0-65535], floorNumber 0-6)
//     -> { template, offsets: [16], entrance, exit: { x, y, sq }, start: { x, y },
//          tiles: [{ x, y, m, c }]  (the metatiles that aren't plain floor), trainers: [{ x, y, facing }], items: [{ x, y }], run }
"use strict";

(function () {
  const SIDE = 8, SQUARES = 4, WIDTH = SIDE * SQUARES, FLOOR = 0x28d, EXIT = 0x28e;

  function rng(a) {
    a = a >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // GetPyramidFloorTemplateId: the floor's template by the last number.
  function templateId(Y, seed, floor) {
    const rand = seed[3] % 100;
    for (let i = Y.optionStart[floor]; i < Y.options.length; i++) if (rand < Y.options[i][0]) return Y.options[i][1];
    return 0;
  }
  // GetPyramidFloorLayoutOffsets: which square (0 the plain floor, 1-16 the squares) goes in each of the sixteen places.
  function layoutOffsets(Y, seed, template) {
    let rand = (seed[0] | (seed[1] << 16)) | 0;
    const out = [];
    for (let i = 0; i < 16; i++) {
      out.push(Y.templates[template].offsets[rand & 7]);
      rand >>= 3;
      if (i === 7) { rand = ((seed[2] | (seed[3] << 16)) | 0) >> 8; }
    }
    return out;
  }

  function floor(Y, seed, floorNum) {
    const template = templateId(Y, seed, floorNum), T = Y.templates[template], offsets = layoutOffsets(Y, seed, template);
    const hasExit = (sq) => Y.squares[offsets[sq]].some((t) => t.m === EXIT);
    // GetPyramidEntranceAndExitSquareIds (a square with no exit tile can't be the way out, and the way in isn't the way out).
    let entrance = seed[3] % 16, exit = seed[0] % 16;
    if (entrance === exit) { entrance = (seed[3] + 1) % 16; exit = (seed[0] + 15) % 16; }
    for (let k = 0; k < 16 && !hasExit(exit); k++) exit = (exit + 1) % 16;
    if (exit === entrance) entrance = (entrance + 1) % 16;

    const grid = new Array(WIDTH * WIDTH), tiles = [];
    let start = null, exitAt = null;
    for (let sq = 0; sq < 16; sq++) {
      const layout = Y.squares[offsets[sq]], ox = (sq % SQUARES) * SIDE, oy = Math.floor(sq / SQUARES) * SIDE;
      for (let i = 0; i < 64; i++) {
        const x = ox + (i % SIDE), y = oy + Math.floor(i / SIDE);
        let t = layout[i], m = t.m;
        if (m === EXIT && sq !== exit) {
          if (sq === entrance) start = { x, y };
          m = FLOOR;
        } else if (m === EXIT) exitAt = { x, y, sq };
        grid[y * WIDTH + x] = { m, c: t.c };
        if (m !== FLOOR) tiles.push({ x, y, m, c: t.c });
      }
    }
    const r = rng((seed[0] * 65537) ^ (seed[1] * 31) ^ (seed[2] * 7) ^ seed[3] ^ (floorNum * 977));
    const free = (x, y) => x >= 0 && y >= 0 && x < WIDTH && y < WIDTH && grid[y * WIDTH + x].m === FLOOR && !grid[y * WIDTH + x].c;
    if (!start) {
      // (The entrance's square has no tile marking where: the middle of it.)
      const ox = (entrance % SQUARES) * SIDE, oy = Math.floor(entrance / SQUARES) * SIDE;
      for (let k = 0; k < 64 && !start; k++) { const x = ox + 3 + (k % 3) - 1, y = oy + 3 + Math.floor(k / 3) % 3 - 1; if (free(x, y)) start = { x, y }; }
      start = start || { x: ox + 1, y: oy + 1 };
    }
    // The people and items: spread over the squares a turn each, on open floor in a square's middle, apart from each other and from the way in.
    const taken = [start];
    const place = (n) => {
      const out = [], order = Array.from({ length: 16 }, (_, i) => i).sort(() => r() - 0.5);
      for (let k = 0; out.length < n && k < n * 40; k++) {
        const sq = order[k % 16], ox = (sq % SQUARES) * SIDE, oy = Math.floor(sq / SQUARES) * SIDE;
        const x = ox + 1 + Math.floor(r() * 6), y = oy + 1 + Math.floor(r() * 6);
        if (!free(x, y) || taken.some((q) => Math.abs(q.x - x) < 2 && Math.abs(q.y - y) < 2)) continue;
        if (exitAt && Math.abs(exitAt.x - x) + Math.abs(exitAt.y - y) < 2) continue;
        taken.push({ x, y }); out.push({ x, y });
      }
      return out;
    };
    const trainers = place(T.trainers).map((p) => Object.assign(p, { facing: ["up", "down", "left", "right"][Math.floor(r() * 4)] }));
    const items = place(T.items);
    return { template, offsets, entrance, exit: exitAt, start, tiles, trainers, items, run: T.run, width: WIDTH };
  }

  window.HoennPyramid = { floor, FLOOR, EXIT, WIDTH };
})();
