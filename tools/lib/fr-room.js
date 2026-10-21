// Draws a HeartGold / SoulSilver room (a house, a lab, a Gym, a tower floor)
// in FireRed's style, as tools/lib/fr-painter.js draws Johto's outdoors: from
// what each of its tiles is, in FireRed's Building tileset (with a secondary
// tileset for the kind of room). tools/lib/hgss-map.js's render of the room
// (with { labels: true }) says what's on each tile: HGSS's texture names
// (yuka: floor, tatami, table, chair, shelf, pc ...), and the painter gives
// each class FireRed's metatile(s), two-tile furniture its two tiles.
//
//   const { paintRoom } = require("./lib/fr-room");
//   const pic = paintRoom(r, { kind: "house" | "lab" | "gym" | "tower" | "pc" | "office" })
//   // -> { below, above, anim, blocks, classes } as fr-painter's compose gives
//
// Walls: a room's solid tiles along its top are its back wall, two rows of it;
// its other edges aren't drawn, as FireRed's rooms have no side walls. What's
// outside the room is left clear (black in the game).
"use strict";

const T = require("./fr-tiles");

// Texture names -> classes (the first that matches wins; HGSS's names, Japanese
// mostly: yuka floor, tatami mats, kabe wall, kaidan stairs, hondana bookshelf,
// tsukue desk, isu chair, reizouko fridge, mado window).
const TEX = [
  ["mat", /^d_mat|doormat|^mat_|genkan|_mat$|_mat\d/],
  ["carpet", /carpet|^rug|ragu|jyuutan|^ma_l|^ma_s|_cloth|nuno/],
  ["stairs", /kaidan|stair|^kd_|esca_|_lad$|slope/],
  ["bed", /^bed|_bed|beddo|futon/],
  ["pc", /^pc_s|^pc$|^pc\d|pasokon|monitor|^tv|terebi|gamen|screen|^msg_pc|^rpc|counter_pc|pc_pcbase/],
  ["bookshelf", /book|hondana|shelf|tana|_lib/],
  ["kitchen", /sink|kitchen|^gas|stove|cook|reizou|^ref|fridge|kama|nabe|sara|_cs\d/],
  ["table", /table|tukue|tsukue|desk|teburu|_tool|memo/],
  ["chair", /chair|isu|sofa|stool|bench|_cou$/],
  ["plant", /plant|hana|flower|^tree|kusa|hachi|tuta/],
  ["counter", /counter|count_|kaunta|reception|^uke|_cou\b/],
  ["machine", /machine|labo|kikai|mecha|device|heal|server|^comp|^gen|kiki|elev|^wtk|^mc_|radio|^rmic|case|globe|scope|bender|keisan|tokei|light|^mg6|^mg08|^mgc|^md48/],
  ["window", /mado|window|_win|winl|glass/],
  ["picture", /^poster|^pic|^e_|^map|^paint|kakejiku|^cal|^d_map|mark|symbol|moji|^name_/],
  ["cabinet", /cabinet|locker|^box|_box|^hako|drawer|dansu|^cup|^ro_|dress|^obj|_obj|_ob$|^aj_box|_pl$|pillar|hasira|hashira|^c_|^bike|ento|maki|bin|baketu|fork|^gant_si|^gant_/],
  ["floor", /yuka|floor|tatami|^f_|_f$|_fl$|_fl\d|^ita|_ita|tile|^tl_|^fl_|^yk_|doma|road|^ro_|_ro$|_r$|_rm$|_rs$|_rx$|_sub$|_base|^d_ro|^droad|_g$|_k$|^black|_fe$|_fc$|wara|spot|_ten$/],
  ["wall", /kabe|wall|^w_|^kb_|yane|roof|_top|^rtop|_kiwa|saku|_h$|_up$|sakai|noren|tekkin|rope|nawa|_w$|_d$|_s$|_n$|_e$|_sw$|_ne$|_wn$|_es$/]
];
// Kinds of room, by the map's name.
const KIND_OF = [["lab", /Lab|School|Kiln|DayCare|Daycare|Radio|Research|NameRater|BillsHouse|Kurt|Charcoal/], ["pc", /PokemonCenter|Wifi|CableClub/],
  ["gym", /Gym|Dojo|League|Elite|Champion|HallOfFame/], ["tower", /Tower|Lighthouse|Well|Ruins|Shrine|Theater|Temple|Cave|Tunnel|Path|Station|Basement/],
  ["office", /Dept|Store|Shop|Mart|Corner|Terminal|Office|Hall|Casino|Park|Frontier|Dome|Factory|Pokeathlon/]];
const kindOf = (name) => (KIND_OF.find(([, re]) => re.test(name)) || ["house"])[0];
const baseName = (n) => n.replace(/[_\d]+$/, "");
const classOfTex = (n) => (TEX.find(([, re]) => re.test(n)) || [null])[0];

// FireRed's Building tileset metatiles for each class (and each kind of room:
// a house's wooden floor, a lab's yellow tiles, a tower's grey). A 2x2 or 2x1
// piece of furniture (a bed, a rug, a table) gets the ids laid out as a grid.
const KINDS = {
  house: { secondary: "gTileset_GenericBuilding1", floor: 2, wall: 32, wallLow: 0 },
  lab: { secondary: "gTileset_Lab", floor: 129, wall: 104, wallLow: 112 },
  gym: { secondary: "gTileset_Lab", floor: 129, wall: 104, wallLow: 112 },
  tower: { secondary: "gTileset_GenericBuilding1", floor: 2, wall: 32, wallLow: 0 },
  office: { secondary: "gTileset_GenericBuilding1", floor: 129, wall: 104, wallLow: 112 },
  pc: { secondary: "gTileset_PokemonCenter", floor: 129, wall: 104, wallLow: 112 }
};
const IDS = {
  mat: 37, carpet: [[19, 20], [27, 28]], stairs: 23, bed: [[16, 17], [24, 25]], pc: [[97], [98]], bookshelf: [[115], [116]],
  kitchen: 48, table: [[84, 85, 86], [92, 93, 94]], chair: 35, plant: 147, counter: 53, machine: 326, window: 42, picture: 261, cabinet: 56
};
const SINGLE = { kitchen: [48, 49, 50], table: 85, pc: 98, bookshelf: 116, carpet: 19, bed: 24 };

// Each room tile's class: "out" (nothing there), "wall", a floor or furniture.
function classify(r) {
  const w = r.width, h = r.height, W = w * 16;
  const drawn = (i) => { const x = (i % w) * 16 + 8, y = Math.floor(i / w) * 16 + 8; return r.below[(y * W + x) * 4 + 3] > 0; };
  const solid = (i) => !!((r.perm[i] >> 15) & 1);
  const beh = (i) => r.perm[i] & 0xff;
  const classes = new Array(w * h).fill("out"), tex = new Array(w * h).fill(null);
  const warps = new Set(((r.events || {}).warps || []).map((p) => p.y * w + p.x));
  for (let i = 0; i < w * h; i++) {
    if (!drawn(i)) continue;
    const l = r.labels[i], names = Object.entries(l.tex).sort((a, b) => b[1] - a[1]);
    let c = null, name = null;
    for (const [n] of names) { const k = classOfTex(n); if (k && k !== "floor" && k !== "wall") { c = k; name = baseName(n); break; } }
    if (!c) { const f = names.find(([n]) => classOfTex(n) === "floor"); if (f) { c = "floor"; name = baseName(f[0]); } }
    if (!c) c = solid(i) ? "wall" : "floor";
    // (Stairs and doors by their behaviour, whatever's drawn: HGSS's 0x5e-0x63 stairs, 0x65-0x6b doors.)
    const b = beh(i);
    if (b >= 0x5e && b <= 0x63) c = "stairs";
    if ((b >= 0x65 && b <= 0x6b) || b === 0x64) c = warps.has(i) ? "mat" : (c === "wall" ? "floor" : c);
    classes[i] = c; tex[i] = name;
  }
  // The room is what you can walk to from its ways in (its warps; or, with
  // none, its largest run of floor), and the solid tiles beside that: a solid
  // tile with floor under it is the back wall (two rows of it at most), one
  // with a piece of furniture on it is that; the rest, the sides and bottom,
  // aren't drawn, as FireRed's rooms have no side walls.
  const walk = (i) => classes[i] !== "out" && !solid(i);
  const reach = new Set();
  // (And from where its people stand and its triggers lie: a Gym's trainers
  // on its platforms, which a lift or a hidden path joins to its door.)
  const ev = r.events || {};
  let seeds = [...warps].concat((ev.people || []).map((p) => p.y * w + p.x), (ev.triggers || []).map((t) => t.y * w + t.x)).filter((i) => i >= 0 && i < w * h && classes[i] !== "out" && !solid(i));
  if (!seeds.length) { const first = classes.findIndex((c, i) => c !== "out" && !solid(i)); if (first >= 0) seeds = [first]; }
  const q = seeds.slice();
  for (const k of q) reach.add(k);
  while (q.length) {
    const k = q.pop(), x = k % w, y = Math.floor(k / w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const u = x + dx, v = y + dy, n = v * w + u;
      if (u < 0 || v < 0 || u >= w || v >= h || reach.has(n) || !walk(n)) continue;
      // (Through a door or stairs too, whatever's beyond.)
      reach.add(n); q.push(n);
    }
  }
  const keep = new Array(w * h).fill(false);
  for (const i of reach) keep[i] = true;
  const FURNITURE = new Set(["carpet", "stairs", "bed", "pc", "bookshelf", "kitchen", "table", "chair", "plant", "counter", "machine", "window", "picture", "cabinet"]);
  for (let i = 0; i < w * h; i++) {
    if (classes[i] === "out" || reach.has(i)) continue;
    const x = i % w, y = Math.floor(i / w);
    const below = y + 1 < h && reach.has(i + w), beside = (x > 0 && reach.has(i - 1)) || (x + 1 < w && reach.has(i + 1)) || (y > 0 && reach.has(i - w));
    const below2 = y + 2 < h && reach.has(i + 2 * w) && y + 1 < h && classes[i + w] !== "out" && solid(i + w);
    if (!below && !beside && !below2) continue;
    if (FURNITURE.has(classes[i]) && (below || beside)) keep[i] = true;
    else if (below || below2) { keep[i] = true; classes[i] = "wall"; }
  }
  for (let i = 0; i < w * h; i++) if (!keep[i]) classes[i] = "out";
  // (A walkable tile that isn't floor or a mat, a chair you can step onto: as it is.)
  // (The two rows: the upper the wall's top, the lower its foot.)
  const rows = new Array(w * h).fill(0);
  for (let i = 0; i < w * h; i++) if (classes[i] === "wall") { const y = Math.floor(i / w); rows[i] = y > 0 && classes[i - w] === "wall" ? 1 : 0; }
  return { classes, tex, rows, solid, beh };
}

// Furniture in pieces: contiguous tiles of one class and texture, as a box.
function pieces(classes, tex, w, h) {
  const seen = new Set(), out = [];
  for (let i = 0; i < w * h; i++) {
    const c = classes[i];
    if (seen.has(i) || ["out", "wall", "floor", "mat", "stairs"].includes(c)) continue;
    const cells = [], q = [i]; seen.add(i);
    while (q.length) {
      const k = q.pop(); cells.push(k);
      const x = k % w, y = Math.floor(k / w);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x + dx, v = y + dy, n = v * w + u;
        if (u < 0 || v < 0 || u >= w || v >= h || seen.has(n) || classes[n] !== c || tex[n] !== tex[i]) continue;
        seen.add(n); q.push(n);
      }
    }
    const xs = cells.map((k) => k % w), ys = cells.map((k) => Math.floor(k / w));
    out.push({ cls: c, cells, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
  }
  return out;
}

// The metatile for one cell of a piece: a grid id laid over the piece's box
// (repeating its last row and column), else the class's single id.
function idFor(p, x, y) {
  const id = IDS[p.cls];
  const pw = p.x1 - p.x0 + 1, ph = p.y1 - p.y0 + 1;
  if (Array.isArray(id)) {
    if (pw === 1 && ph === 1 && SINGLE[p.cls] != null) { const s = SINGLE[p.cls]; return Array.isArray(s) ? s[0] : s; }
    const grid = id, gh = grid.length, gw = grid[0].length;
    const j = ph === 1 ? gh - 1 : Math.min(gh - 1, y - p.y0), i = Math.min(gw - 1, x - p.x0);
    return grid[j][i];
  }
  if (Array.isArray(SINGLE[p.cls])) { const s = SINGLE[p.cls]; return s[(x - p.x0) % s.length]; }
  return id;
}

function paintRoom(r, opts) {
  const kind = KINDS[(opts && opts.kind) || "house"] || KINDS.house;
  const w = r.width, h = r.height;
  const { classes, tex, rows } = classify(r);
  const blocks = new Array(w * h).fill(null);
  for (let i = 0; i < w * h; i++) {
    const c = classes[i];
    if (c === "out") continue;
    if (c === "wall") blocks[i] = rows[i] ? kind.wallLow : kind.wall;
    else if (c === "floor") blocks[i] = kind.floor;
    else if (c === "mat") blocks[i] = IDS.mat;
    else if (c === "stairs") blocks[i] = IDS.stairs;
    else blocks[i] = kind.floor;
  }
  for (const p of pieces(classes, tex, w, h)) for (const k of p.cells) blocks[k] = idFor(p, k % w, Math.floor(k / w));
  const primary = T.loadTileset("gTileset_Building"), secondary = T.loadTileset(kind.secondary);
  const ids = blocks.map((b) => (b == null ? 0 : b));
  const pic = T.renderBlocks(ids, w, h, primary, secondary, false);
  // (Outside the room: clear.)
  for (let i = 0; i < w * h; i++) if (blocks[i] == null) {
    const x0 = (i % w) * 16, y0 = Math.floor(i / w) * 16;
    for (let y = 0; y < 16; y++) { const o = ((y0 + y) * w * 16 + x0) * 4; pic.below.fill(0, o, o + 64); pic.above.fill(0, o, o + 64); }
  }
  const anim = T.animCells(ids, w, h, primary, secondary);
  return { below: pic.below, above: pic.above, anim, anims: primary.anims.map((a) => a.name), blocks, classes, tex };
}

module.exports = { paintRoom, classify, classOfTex, kindOf, KINDS, IDS };
