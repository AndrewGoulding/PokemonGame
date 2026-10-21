// Emerald's items this game hasn't got (Devon Goods, the Scanner, the Basement Key, the Letter, the Soot Sack,
// the mails ...), from a pret/pokeemerald checkout, for Hoenn's scripts, shops and balls:
//
//   node tools/build-hoenn-items.js <path to pret/pokeemerald>   (or set POKEEMERALD)
//
// Adds, between marker lines (so it can run again), to data/items.js, data/item-descriptions.js and
// data/item-sprites.js (its pictures' boxes too), and writes their pictures (Emerald's 24x24 bag icons,
// centred in 32x32) to assets/sprites/items/key-item/ and mail/. Needs src/data and graphics/items.
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");
const { cleanText } = require("./lib/text");

const EM = process.argv.slice(2).find((a) => !a.startsWith("--")) || process.env.POKEEMERALD;
if (!EM || !fs.existsSync(path.join(EM, "graphics/items/icons"))) {
  console.error("Usage: node tools/build-hoenn-items.js <path to pret/pokeemerald>  (needs graphics/items checked out)");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const P = (...p) => path.join(EM, ...p);
global.window = global;
// (Our own lines out of the data files first, so "has this game got it" means without them.)
const START = "  // Emerald's items (tools/build-hoenn-items.js).\n", END = "  // (End of Emerald's items.)\n";
for (const f of ["data/items.js", "data/item-descriptions.js", "data/item-sprites.js"]) {
  let text = fs.readFileSync(path.join(root, f), "utf8");
  const a = text.indexOf(START);
  if (a >= 0) fs.writeFileSync(path.join(root, f), text.slice(0, a) + text.slice(text.indexOf(END, a) + END.length));
}
require(path.join(root, "data/items.js"));
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const have = new Set(Object.keys(window.ITEMS).map(toID));

const items = fs.readFileSync(P("src/data/items.h"), "utf8"), descSrc = fs.readFileSync(P("src/data/text/item_descriptions.h"), "utf8");
const descs = {};
for (const m of descSrc.matchAll(/static const u8 (s\w+Desc)\[\] = _\(((?:\s*"(?:[^"\\]|\\.)*"\s*)+)\);/g)) descs[m[1]] = [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]).join("");
const icons = {}, iconFiles = {}, palFiles = {};
for (const m of fs.readFileSync(P("src/data/item_icon_table.h"), "utf8").matchAll(/\[(ITEM_\w+)\]\s*=\s*\{(\w+),\s*(\w+)\}/g)) icons[m[1]] = [m[2], m[3]];
for (const m of fs.readFileSync(P("src/data/graphics/items.h"), "utf8").matchAll(/const u32 (gItemIcon\w+)\[\] = INCGFX_U32\("([^"]+)"/g)) iconFiles[m[1]] = m[2];
for (const m of fs.readFileSync(P("src/data/graphics/items.h"), "utf8").matchAll(/const u32 (gItemIconPalette\w+)\[\] = INCGFX_U32\("([^"]+)"/g)) palFiles[m[1]] = m[2];

// Mixed case, as tools/build-item-descriptions.js has it.
const KEEP = new Set(["HP", "PP", "TM", "HM"]);
const mixedCase = (text) => text.replace(/[A-Zé]{2,}(?:'[A-Z]+)?/g, (w) => (KEEP.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()));
const name = (raw) => mixedCase(raw.replace(/POKé/g, "Poké")).replace(/\bMail\b/, "Mail");

const add = [];
for (const m of items.matchAll(/\[(ITEM_\w+)\] =\s*\{([\s\S]*?)\n    \},/g)) {
  const id = m[1], b = m[2];
  const nm = (/\.name = _\("([^"]*)"\)/.exec(b) || [])[1], pocket = (/\.pocket = (\w+)/.exec(b) || [])[1];
  if (!nm || /^(ITEM_NONE|ITEM_UNUSED|ITEM_(TM|HM)_?\d|ITEM_(TM|HM)_)/.test(id)) continue;
  const key = pocket === "POCKET_KEY_ITEMS", mail = /_MAIL$/.test(id);
  if (!key && !mail) continue;
  // (This game has it, under that name or another: the Mach and Acro Bikes are its Bicycle, the Go-Goggles ...)
  const slug = id.slice(5).toLowerCase().replace(/_/g, "-");
  if (have.has(toID(slug)) || have.has(toID(nm)) || /BIKE|FISHING|ROD|WAILMER_PAIL|TOWN_MAP|ITEMFINDER|COIN_CASE|POKE_FLUTE|CONTEST_PASS|BLUE_ORB|RED_ORB|FRONTIER|BATTLE|POKEBLOCK|GOOD_ROD|SUPER_ROD|OLD_ROD|DEEP_SEA|POKENAV|WAILMER|EON|OLD_SEA_MAP|AURORA|MYSTIC_TICKET|ROOM_|SS_TICKET|DEVON_SCOPE|GO_GOGGLES|FAME_CHECKER|TEACHY_TV|TM_CASE|BERRY_POUCH|COIN|SHARD|OAKS/.test(id) && !/^ITEM_(SCANNER|STORAGE_KEY|BASEMENT_KEY)$/.test(id)) continue;
  const desc = descs[(/\.description = (\w+)/.exec(b) || [])[1]] || "";
  add.push({ id, slug, name: name(nm), key, desc: cleanText(desc.replace(/\\n/g, "\\n"))[0] || "", icon: icons[id] });
}

// ---------- The data files ----------
function insert(file, lines) {
  let text = fs.readFileSync(path.join(root, file), "utf8");
  const at = text.lastIndexOf("\n};");
  // (The entry before ours needs its comma, if the file's last had none.)
  let head = text.slice(0, at);
  if (!/[,{]\s*$/.test(head)) head = head.replace(/\s*$/, ",");
  text = head + text.slice(at);
  fs.writeFileSync(path.join(root, file), text.slice(0, head.length + 1) + START + lines.map((l) => "  " + l + ",\n").join("") + END + text.slice(at + 1));
}
insert("data/items.js", add.map((i) => JSON.stringify(i.slug) + ": " + JSON.stringify({ name: i.slug, category: i.key ? "key-items" : "mail", effect: i.desc.replace(/\n/g, " ") })));
insert("data/item-descriptions.js", add.map((i) => JSON.stringify(i.slug) + ": " + JSON.stringify(i.desc)));

// ---------- The pictures ----------
const boxes = {};
const sprites = [];
for (const i of add) {
  const folder = i.key ? "key-item" : "mail";
  const file = i.icon && iconFiles[i.icon[0]] && P(iconFiles[i.icon[0]]), palFile = i.icon && palFiles[i.icon[1]] && P(palFiles[i.icon[1]].replace(/\.gbapal$/, ""));
  if (!file || !fs.existsSync(file)) { console.warn("no picture for " + i.id); continue; }
  const img = readPng(file), colours = palFile && fs.existsSync(palFile) ? readPal(palFile) : img.palette;
  const rgba = new Uint8ClampedArray(32 * 32 * 4), ox = (32 - img.width) >> 1, oy = (32 - img.height) >> 1;
  let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const v = img.px[y * img.width + x] & 15;
    if (!v) continue;
    rgba.set([...colours[v], 255], ((y + oy) * 32 + x + ox) * 4);
    x0 = Math.min(x0, x + ox); y0 = Math.min(y0, y + oy); x1 = Math.max(x1, x + ox); y1 = Math.max(y1, y + oy);
  }
  fs.mkdirSync(path.join(root, "assets/sprites/items", folder), { recursive: true });
  writePng(path.join(root, "assets/sprites/items", folder, i.slug + ".png"), 32, 32, rgba);
  sprites.push([i.slug, "assets/sprites/items/" + folder + "/" + i.slug + ".png"]);
  boxes[i.slug] = [x0, y0, x1 - x0 + 1, y1 - y0 + 1, 32, 32];
}
insert("data/item-sprites.js", sprites.map(([slug, p]) => JSON.stringify(slug) + ": " + JSON.stringify(p)));
// (The boxes: one line of JSON.)
{
  const file = path.join(root, "data/item-sprites.js");
  let text = fs.readFileSync(file, "utf8");
  const m = /window\.ITEM_SPRITE_BOXES = (\{.*\});/.exec(text);
  if (m) {
    const all = Object.assign(JSON.parse(m[1]), boxes);
    text = text.replace(m[0], "window.ITEM_SPRITE_BOXES = " + JSON.stringify(all) + ";");
    fs.writeFileSync(file, text);
  }
}
console.log("added " + add.length + " items: " + add.map((i) => i.slug).join(" "));
