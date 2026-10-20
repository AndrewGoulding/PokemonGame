// What each tile of a HeartGold / SoulSilver map is, in tools/lib/fr-painter.js's
// classes (grass, path, tree, water, ...), from tools/lib/hgss-map.js's render
// of it (with { labels: true }): its tile behaviour and whether it's solid,
// and the textures uppermost on it seen from above. And its buildings: each
// door, the building round it and what kind it is.
//
//   const classes = classify(r, { cave })   // r = renderMap(..., { ground: true, labels: true })
//   const buildings = buildingsOf(r, classes, warps)   // warps: [{ x, y, mapConst | map }]
"use strict";

// Texture names (HGSS's map and building textures) by what they show.
const TEXTURES = [
  ["building", /^ko_h\d|^c1_s03|^ko_depart|^ko_game|^ko_radio|^ko_cycle|^ko_flower|^ko_seimei|^ko_tetora|^ko_chika/],
  ["tree", /tree|^hw_ki/],
  ["waterrock", /^sea_rock|^uzushio/],
  ["water", /^sea|^pond_on|^pond_sub|^swave|puddle/],
  ["fence", /fence|_fe\d|^ko_pole/],
  ["sand", /^beach/],
  ["bridge", /^bridge|kk_bridge/],
  ["pavement", /^ko_land|^ko_road|^ko_roadline|^road05|^overpass|^ar_01|^ar_broken|^ar_suiro|^station|^senro/],
  ["path", /^road|^roadkk|^slope|^d22_fe|^as_ishi|^kk_nakas/],
  ["rock", /^wall|^cliff|peak|^rock|^r_climb|^cave/],
  ["grass", /grass|flower|^field|_kage$|^pond_line|^pond_edge/]
];
const textureClass = (name) => (TEXTURES.find(([, re]) => re.test(name)) || [null])[0];
const LEDGES = { 0x38: "ledge_e", 0x39: "ledge_w", 0x3a: "ledge_n", 0x3b: "ledge_s" };
const WATER = new Set([0x10, 0x13, 0x15, 0x22]);

// (opts.cave: a cave's: its floor is all path, what's solid all rock but
// for rocks in its water.)
function classify(r, opts) {
  const cave = opts && opts.cave;
  return r.perm.map((v, i) => {
    const b = v & 0xff, solid = (v >> 15) & 1, l = r.labels[i];
    if (!solid && (b === 0x02 || b === 0x03)) return "tallgrass";
    if (LEDGES[b]) return LEDGES[b];
    if (b === 0x13) return "waterfall";
    // (A whirlpool: water, its swirl drawn over it: tools/build-johto.js.)
    if (b === 0x11) return "water";
    if (!solid && WATER.has(b)) return "water";
    if (cave) return !solid ? "path" : Object.keys(l.tex).some((n) => textureClass(n) === "water") ? "waterrock" : "rock";
    if (!solid && b === 0x21) return "sand";
    // Votes by class from the textures seen on the tile; a building model's
    // count as "building" (unless it's a tree or such).
    const votes = {};
    for (const [name, n] of Object.entries(l.tex)) {
      const c = textureClass(name);
      if (c) votes[c] = (votes[c] || 0) + n;
    }
    const inBuilding = Object.values(l.building).reduce((a, n) => a + n, 0);
    const top = (exclude) => Object.entries(votes).filter(([c]) => !exclude.includes(c)).sort((a, b) => b[1] - a[1])[0];
    if (!solid) {
      // (Underfoot: what's under a tree's crown or a roof's edge hanging over.)
      const t = top(["tree", "rock", "fence", "waterrock"]);
      // (Flowers: grass, mostly flowers.)
      const flowers = Object.entries(l.tex).filter(([name]) => /^flower/.test(name)).reduce((a, [, n]) => a + n, 0);
      if (t && t[0] === "grass" && flowers >= 8) return "flowers";
      return t ? t[0] : "grass";
    }
    if (inBuilding >= 8 && !(votes.tree >= inBuilding)) return Object.keys(l.building).length && b === 0x69 ? "building" : (votes.fence > 8 ? "fence" : "building");
    const t = top([]);
    if (!t) return "rock";
    if (t[0] === "water") return "waterrock";
    if (["grass", "path", "sand", "pavement"].includes(t[0])) return "object";   // (something small on the ground: a sign, a post)
    return t[0];
  });
}

// Kinds of building, by where the door goes.
const KINDS = [["pokecenter", /POKECENTER|PokemonCenter/i], ["mart", /MART|DEPARTMENT_STORE_1F|DepartmentStore/i], ["gym", /GYM/i],
  ["lab", /LAB|SCHOOL|DAYCARE|KILN|KURT/i], ["tower", /TOWER|RADIO|SPROUT/i],
  ["dept", /STATION|GAME_CORNER|GLOBAL_TERMINAL|SHRINE|RESEARCH|HALL|SAFARI|BIKE|FLOWER/i], ["gate", /GATEHOUSE|Gatehouse/i]];
const kindOf = (dest) => (KINDS.find(([, re]) => re.test(dest || "")) || ["house"])[0];

// Each building with a door: the door's tile and the solid building tiles
// joined to it, and the small things on it (a roof's edge, a sign on its wall).
// (A doorway into a cave isn't one.)
function buildingsOf(r, classes, warps) {
  const w = r.width, h = r.height, out = [], taken = new Set();
  for (const wp of warps) {
    const dest = wp.mapConst || wp.map || "";
    if (/CAVE|DARK_CAVE|UNION|WELL|TOHJO|FALLS|RUINS_OF_ALPH_(?!RESEARCH)|ILEX_FOREST$|UnionCave|TohjoFalls|IlexForest$/.test(dest)) continue;
    // (A way back to where you came from, 4095, as the Safari Zone's exit: no door of its own.)
    if (+dest === 4095) continue;
    const k = wp.y * w + wp.x;
    if (taken.has(k)) continue;
    const tiles = [], seen = new Set([k]), q = [[wp.x, wp.y]];
    while (q.length) {
      const [x, y] = q.pop();
      tiles.push([x, y]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, v = y + dy, i = v * w + u;
        if (u < 0 || v < 0 || u >= w || v >= h || seen.has(i) || (classes[i] !== "building" && classes[i] !== "object")) continue;
        seen.add(i); q.push([u, v]);
      }
    }
    for (const i of seen) taken.add(i);
    const kind = kindOf(dest);
    out.push({ door: [wp.x, wp.y], tiles, kind, dest, anywhere: kind === "gate" });
  }
  return out;
}

// Smooths the ground: a walkable tile of one class with six or more of its
// eight neighbours of another walkable class is that class too (HGSS's
// textures are finer than tiles; the odd tile of path in the grass was a
// stripe's edge, not a path).
const GROUND = new Set(["grass", "flowers", "path", "sand", "pavement"]);
function smooth(classes, w, h) {
  const out = classes.slice();
  for (let i = 0; i < w * h; i++) {
    if (!GROUND.has(classes[i])) continue;
    const x = i % w, y = Math.floor(i / w), votes = {};
    for (const [dx, dy] of [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]) {
      const u = x + dx, v = y + dy;
      if (u < 0 || v < 0 || u >= w || v >= h) continue;
      const c = classes[v * w + u];
      if (GROUND.has(c)) votes[c] = (votes[c] || 0) + 1;
    }
    const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    if (best && best[0] !== classes[i] && best[1] >= 6) out[i] = best[0];
  }
  return out;
}

module.exports = { classify, textureClass, buildingsOf, kindOf, smooth };
