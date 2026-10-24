// Pokémon Emerald's PokéNav (src/pokenav*.c, graphics/pokenav/), for ui/pokegear.js's PokéNav:
//
//   node tools/build-pokenav.js <path to pret/pokeemerald>
//
// Its pictures, put together as the GBA's backgrounds and sprites would show them, into assets/pokenav/:
//   dots.png      the main menu's moving dots (BG3: bg_dots.bin), 256 wide, to scroll
//   device.png    the PokéNav's outline over them (BG2: device_outline_map.bin)
//   message.png   the description box along the bottom (BG1: message.bin)
//   header.png    the bar along the top (BG0: header.bin)
//   options.png   the menu's option labels, 128 x 16 each in OPTIONS order, in their own colours (options.pal)
//   headers.png   the headers at the top left, 128 x 32 each in HEADERS order (left_headers/*, palette.pal)
//   matchcall.png the Match Call screen's panels (BG2: match_call/ui.bin)
//   navicon.png   the spinning PokéNav, a call's picture while you walk (nav_icon.png)
//   condition.png the Condition screen: its graph's panel and the box for who it is (condition/graph.bin)
// And Emerald's Match Call (src/pokenav_match_call_data.c, src/match_call.c) as window.HOENN_MATCH_CALL in
// data/emerald-maps.js: its own contacts (Mom, Norman, the rival, Wally, the Gym Leaders ...) and the lines they
// say by the story's flags; the trainers who register, with the topics their calls draw on; and the rematch
// table's places, for "on Route 102".
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");

const EM = process.argv[2];
if (!EM) { console.error("Usage: node tools/build-pokenav.js <path to pret/pokeemerald>"); process.exit(1); }
const root = path.join(__dirname, "..");
const P = (...p) => path.join(EM, ...p);
const G = (...p) => P("graphics/pokenav", ...p);
const out = path.join(root, "assets/pokenav");
fs.mkdirSync(out, { recursive: true });

// ---------- Pictures ----------
// A tilemap (u16 entries: tile, flips, palette) of `tiles` (an indexed PNG), `w` x `h` tiles, into RGBA; palettes by
// the entries' palette number (else the PNG's own), colour 0 clear unless `opaque`.
function renderMap(bin, tiles, w, h, pals, opaque, base) {
  const rgba = new Uint8ClampedArray(w * 8 * h * 8 * 4), perRow = tiles.width / 8, count = perRow * (tiles.height / 8);
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    const e = bin.readUInt16LE((ty * 32 + tx) * 2), t = (e & 0x3ff) - (base || 0), hf = e & 0x400, vf = e & 0x800, pal = (pals && pals[e >> 12]) || tiles.palette;
    if (t < 0 || t >= count) continue;
    const sx = (t % perRow) * 8, sy = Math.floor(t / perRow) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const c = tiles.px[(sy + (vf ? 7 - y : y)) * tiles.width + sx + (hf ? 7 - x : x)] & 15;
      if (!c && !opaque) continue;
      const o = ((ty * 8 + y) * w * 8 + tx * 8 + x) * 4, rgb = pal[c] || [0, 0, 0];
      rgba[o] = rgb[0]; rgba[o + 1] = rgb[1]; rgba[o + 2] = rgb[2]; rgba[o + 3] = 255;
    }
  }
  return rgba;
}
const pngPal = (f) => readPng(f).palette;

writePng(path.join(out, "dots.png"), 256, 160, renderMap(fs.readFileSync(G("bg_dots.bin")), readPng(G("bg_dots.png")), 32, 20, null, true));
writePng(path.join(out, "device.png"), 240, 160, crop(renderMap(fs.readFileSync(G("device_outline_map.bin")), readPng(G("device_outline.png")), 32, 20, null, false), 256, 240, 160));
writePng(path.join(out, "message.png"), 240, 160, crop(renderMap(fs.readFileSync(G("message.bin")), readPng(G("message.png")), 32, 20, null, false), 256, 240, 160));
writePng(path.join(out, "header.png"), 256, 256, renderMap(fs.readFileSync(G("header.bin")), readPng(G("header.png")), 32, 32, null, false));
// (The Match Call screen: its tiles in palette 2, ui.png's, from its BG's base tile, 0x80; what's left in 0 is clear.)
writePng(path.join(out, "matchcall.png"), 240, 160, crop(renderMap(fs.readFileSync(G("match_call/ui.bin")), readPng(G("match_call/ui.png")), 32, 20,
  { 2: pngPal(G("match_call/ui.png")), 0: [[0, 0, 0]] }, false, 0x80), 256, 240, 160));
function crop(rgba, w, cw, ch) {
  const o = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) o.set(rgba.subarray(y * w * 4, y * w * 4 + cw * 4), y * cw * 4);
  return o;
}

// A sprite sheet's 8x8 tiles in 1D order (row by row across the PNG), and sprites made of them.
function tilesOf(png) {
  const t = [], perRow = png.width / 8;
  for (let i = 0; i < perRow * (png.height / 8); i++) {
    const sx = (i % perRow) * 8, sy = Math.floor(i / perRow) * 8, px = new Uint8Array(64);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) px[y * 8 + x] = png.px[(sy + y) * png.width + sx + x] & 15;
    t.push(px);
  }
  return t;
}
// (A w x h sprite from `tiles` starting at `first`, at (x0, y0) in an RGBA picture W wide.)
function putSprite(rgba, W, tiles, first, w, h, x0, y0, pal) {
  for (let ty = 0; ty < h / 8; ty++) for (let tx = 0; tx < w / 8; tx++) {
    const px = tiles[first + ty * (w / 8) + tx];
    if (!px) continue;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const c = px[y * 8 + x];
      if (!c) continue;
      const o = ((y0 + ty * 8 + y) * W + x0 + tx * 8 + x) * 4;
      rgba[o] = pal[c][0]; rgba[o + 1] = pal[c][1]; rgba[o + 2] = pal[c][2]; rgba[o + 3] = 255;
    }
  }
}

// The option labels (sOptionsLabelGfx_*): four 32x16 sprites side by side, each 8 tiles on from the last; their
// palettes, options.pal's five (default, blue, pink, beige, red).
const OPTIONS = [["hoenn_map", 0], ["condition", 1], ["match_call", 4], ["ribbons", 2], ["switch_off", 3], ["party", 1], ["search", 1],
  ["cool", 4], ["beauty", 1], ["cute", 2], ["smart", 0], ["tough", 0], ["cancel", 3]];
{
  const pal = readPal(G("options/options.pal")), rgba = new Uint8ClampedArray(128 * 16 * OPTIONS.length * 4);
  OPTIONS.forEach(([name, p], i) => {
    const t = tilesOf(readPng(G("options", name + ".png")));
    for (let j = 0; j < 4; j++) putSprite(rgba, 128, t, 8 * j, 32, 16, 32 * j, 16 * i, pal.slice(16 * p, 16 * p + 16));
  });
  writePng(path.join(out, "options.png"), 128, 16 * OPTIONS.length, rgba);
}
// The headers at the top left (sMenuLeftHeaderSpriteSheets): two 64x32 sprites side by side (the map's second
// one 8 to the left); the submenus' (sPokenavSubMenuLeftHeaderSpriteSheets), two 32x16 ones, under them.
// palette.pal's by each one's tag.
const HEADERS = [["main_menu", 3], ["condition", 1], ["ribbons", 2], ["match_call", 4], ["hoenn_map", 0]];
const SUBHEADERS = [["party", 1], ["search", 1], ["cool", 4], ["beauty", 1], ["cute", 2], ["smart", 0], ["tough", 0]];
{
  const pal = readPal(G("left_headers/palette.pal")), n = HEADERS.length + SUBHEADERS.length, rgba = new Uint8ClampedArray(128 * 32 * n * 4);
  HEADERS.forEach(([name, tag], i) => {
    const t = tilesOf(readPng(G("left_headers", name + ".png"))), p = pal.slice(16 * tag, 16 * tag + 16);
    putSprite(rgba, 128, t, 0, 64, 32, 0, 32 * i, p);
    putSprite(rgba, 128, t, 32, 64, 32, name === "hoenn_map" ? 56 : 64, 32 * i, p);
  });
  SUBHEADERS.forEach(([name, tag], k) => {
    const t = tilesOf(readPng(G("left_headers", name + ".png"))), p = pal.slice(16 * tag, 16 * tag + 16), y = 32 * (HEADERS.length + k);
    putSprite(rgba, 128, t, 0, 32, 16, 0, y, p);
    putSprite(rgba, 128, t, 8, 32, 16, 32, y, p);
  });
  writePng(path.join(out, "headers.png"), 128, 32 * n, rgba);
}
// The Condition screen (src/pokenav_conditions_gfx.c): its backdrop (BG2: graph_data.bin, graph_data.pal) under the
// graph's panel and the box for who it is (BG3: graph.bin of graph.png).
{
  const back = renderMap(fs.readFileSync(G("condition/graph_data.bin")), readPng(G("condition/graph_data.png")), 32, 20, { 3: readPal(G("condition/graph_data.pal")) }, true);
  const graph = renderMap(fs.readFileSync(G("condition/graph.bin")), readPng(G("condition/graph.png")), 32, 20, null, false);
  for (let i = 0; i < back.length; i += 4) if (graph[i + 3]) back.set(graph.subarray(i, i + 4), i);
  writePng(path.join(out, "condition.png"), 240, 160, crop(back, 256, 240, 160));
}

// The spinning PokéNav (nav_icon.png: eight 32x32 frames, one under the other), for a call while you walk.
{
  const n = readPng(G("nav_icon.png")), rgba = new Uint8ClampedArray(n.width * n.height * 4);
  for (let i = 0; i < n.px.length; i++) { const c = n.px[i] & 15, rgb = n.palette[c]; rgba.set([rgb[0], rgb[1], rgb[2], c ? 255 : 0], i * 4); }
  writePng(path.join(out, "navicon.png"), n.width, n.height, rgba);
}

// ---------- Match Call ----------
const data = fs.readFileSync(P("src/pokenav_match_call_data.c"), "utf8");
const strings = fs.readFileSync(P("src/strings.c"), "utf8");
// (A gText_ in src/strings.c: its words.)
const str = (label) => {
  const m = new RegExp("\\b" + label + "\\[\\]\\s*=\\s*_\\(([\\s\\S]*?)\\);").exec(strings);
  return m ? [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((q) => q[1]).join("").replace(/\\n/g, " ").replace(/\{[A-Z_0-9 ]+\}/g, "").trim() : label;
};
// The lines' tables: [text label, the flag that makes it current ("" always; "REMATCH" a Gym Leader's rematch
// calls start), the flag it sets].
const tables = {};
for (const m of data.matchAll(/static const match_call_text_data_t (\w+)\[\] = \{([\s\S]*?)\};/g))
  tables[m[1]] = [...m[2].matchAll(/\{\s*(\w+),\s*(\w+),\s*(\w+)\s*\}/g)].filter((r) => r[1] !== "NULL")
    .map((r) => [r[1], r[2] === "ALWAYS_AVAILABLE" ? "" : r[2] === "REMATCH_CALL_START" ? "REMATCH" : r[2], r[3] === "NO_FLAG_TO_SET" ? "" : r[3]]);
// Wally's places by the story (sWallyLocationData).
const wallyAt = [...((/sWallyLocationData\[\] = \{([\s\S]*?)\};/.exec(data) || [])[1] || "").matchAll(/\{\s*(\w+),\s*(\w+)\s*\}/g)]
  .filter((r) => r[1] !== "0xFFFF").map((r) => [r[1], r[2]]);
const headers = {};
for (const m of data.matchAll(/static const struct (MatchCall\w+) (s\w+MatchCallHeader) =\s*\{([\s\S]*?)\};/g)) {
  const f = {};
  for (const r of m[3].matchAll(/\.(\w+)\s*=\s*([^,\n]+)/g)) f[r[1]] = r[2].trim();
  headers[m[2]] = {
    type: { 0: "npc", MC_TYPE_NPC: "npc", MC_TYPE_TRAINER: "trainer", MC_TYPE_WALLY: "wally", MC_TYPE_BIRCH: "birch", MC_TYPE_RIVAL: "rival", MC_TYPE_LEADER: "leader" }[f.type],
    flag: f.flag === "0xFFFF" ? "" : f.flag, mapSec: f.mapSec && f.mapSec !== "0" ? f.mapSec : "",
    name: f.name && f.name !== "NULL" ? str(f.name) : f.type === "MC_TYPE_WALLY" ? "WALLY" : "", desc: f.desc && f.desc !== "NULL" ? str(f.desc) : "",
    gender: f.playerGender || undefined, rematch: f.rematchTableIdx || undefined,
    lines: f.textData ? tables[f.textData] || [] : [],
    at: f.type === "MC_TYPE_WALLY" ? wallyAt : undefined
  };
}
// Their order in the list (sMatchCallHeaders).
const order = [...((/sMatchCallHeaders\[\] = \{([\s\S]*?)\};/.exec(data) || [])[1] || "").matchAll(/=\s*\{\s*\.\w+\s*=\s*&(s\w+MatchCallHeader)/g)].map((r) => r[1]);
const contacts = (order.length ? order : Object.keys(headers)).map((k) => Object.assign({ key: k.replace(/^s|MatchCallHeader$/g, "") }, headers[k]));

// The trainers who register (sMatchCallTrainers) and the topics their calls draw on (TEXT_ID(topic, n)).
const mc = fs.readFileSync(P("src/match_call.c"), "utf8");
const textId = (s) => { const r = /TEXT_ID\((\w+),\s*(\d+)\)/.exec(s); return r ? [r[1], +r[2]] : null; };
const trainers = [];
for (const part of ((/sMatchCallTrainers\[\] =\s*\{([\s\S]*?)\n\};/.exec(mc) || [])[1] || "").split(/(?=\.trainerId = )/)) {
  const m = [null, part], id = /\.trainerId = (\w+)/.exec(m[1]);
  if (!id) continue;
  const b = /BATTLE_TEXT_IDS\((\d+)\)/.exec(m[1]);
  trainers.push({ id: "EM_" + id[1], battle: b ? +b[1] : 1, general: textId((/\.generalTextId = ([^\n]+)/.exec(m[1]) || [])[1] || ""),
    record: +((/battleFrontierRecordStreakTextIndex = (\d+)/.exec(m[1]) || [])[1] || 1),
    same: textId((/sameRouteMatchCallTextId = ([^\n]+)/.exec(m[1]) || [])[1] || ""), diff: textId((/differentRouteMatchCallTextId = ([^\n]+)/.exec(m[1]) || [])[1] || "") });
}
// The texts of each topic, with what goes in STR_VAR_1..3 (STRS_*).
const STRS = {};
for (const m of mc.matchAll(/#define (STRS_\w+)\s*\{([^}]*)\}/g)) STRS[m[1]] = m[2].split(",").map((s) => s.trim().replace(/^STR_/, "").toLowerCase());
const topic = (name) => [...((new RegExp(name + "\\[\\] =\\s*\\{([\\s\\S]*?)\\};").exec(mc) || [])[1] || "").matchAll(/\.text = (\w+),\s*\.stringVarFuncIds = (\w+)/g)]
  .map((r) => [r[1], STRS[r[2]] || []]);
const topics = {
  B_TOPIC_WILD: topic("sMatchCallWildBattleTexts"), B_TOPIC_NEGATIVE: topic("sMatchCallNegativeBattleTexts"), B_TOPIC_POSITIVE: topic("sMatchCallPositiveBattleTexts"),
  REQ_TOPIC_SAME_ROUTE: topic("sMatchCallSameRouteBattleRequestTexts"), REQ_TOPIC_DIFF_ROUTE: topic("sMatchCallDifferentRouteBattleRequestTexts"),
  GEN_TOPIC_PERSONAL: topic("sMatchCallPersonalizedTexts")
};
// Where each registered trainer is (gRematchTable: the map they're on), by its first trainer.
const setup = fs.readFileSync(P("src/battle_setup.c"), "utf8");
const places = {};
for (const m of setup.matchAll(/\[REMATCH_\w+\]\s*=\s*REMATCH\((\w+),[^)]*?(MAP_\w+)\)/g)) places["EM_" + m[1]] = m[2];
// (And who they become, rematch by rematch: TRAINER_X_1 .. _5.)
// (And the rematch table by its own names, REMATCH_ROXANNE: a Gym Leader's contact names theirs.)
const teams = {}, rematches = {};
for (const m of setup.matchAll(/\[(REMATCH_\w+)\]\s*=\s*REMATCH\(([^)]*)\)/g)) {
  const ids = m[2].split(",").map((s) => s.trim()).filter((s) => /^TRAINER_/.test(s)).map((s) => "EM_" + s);
  teams[ids[0]] = ids; rematches[m[1]] = ids[0];
}

const MC = { contacts, trainers, topics, places, teams, rematches };
const file = path.join(root, "data/emerald-maps.js");
let js = fs.readFileSync(file, "utf8");
const line = "window.HOENN_MATCH_CALL = " + JSON.stringify(MC) + ";";
js = /^window\.HOENN_MATCH_CALL = .*;$/m.test(js) ? js.replace(/^window\.HOENN_MATCH_CALL = .*;$/m, () => line) : js.replace(/\n?$/, "\n" + line + "\n");
fs.writeFileSync(file, js);
console.log("PokéNav: " + contacts.length + " contacts, " + trainers.length + " trainers, " + Object.keys(places).length + " places");
