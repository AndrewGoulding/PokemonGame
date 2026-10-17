// The item pictures Gens 7, 8 and 9's additions need (Z-Crystals, Memories, the
// Z-Ring, Dynamax Band and Candy, the Ability Patch, Exp. Candies, Zygarde's Cube and Zygardite, Kubfu's
// scrolls, Dialga's and Palkia's Legends: Arceus items, Gen 9's evolution
// items, Legends: Z-A's Mega Stones, ...), into
// assets/sprites/items/<folder>/<item>.png:
//   from pokesprite (github.com/msikma/pokesprite, where the other item
//   sprites come from: 32x32), downloaded; and, for the ones it hasn't got,
//   pokeemerald-expansion's 24x24 bag icons (graphics/items/icons/*.png with
//   icon_palettes/*.pal) centred in 32x32.
//
//   node tools/build-later-item-sprites.js <path to pokeemerald-expansion>
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const { readPng, writePng, readPal } = require("./lib/png");

const X = (...p) => path.join(process.argv[2] || process.env.POKEEMERALD_EXPANSION || "", ...p);
if (!fs.existsSync(X("graphics/items/icons"))) {
  console.error("Usage: node tools/build-later-item-sprites.js <path to pokeemerald-expansion>");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/sprites/items");

const TYPES = ["bug", "dark", "dragon", "electric", "fairy", "fighting", "fire", "flying", "ghost", "grass", "ground", "ice",
  "poison", "psychic", "rock", "steel", "water"];
const Z = ["normalium", "firium", "waterium", "electrium", "grassium", "icium", "fightinium", "poisonium", "groundium", "flyinium",
  "psychium", "buginium", "rockium", "ghostium", "dragonium", "darkinium", "steelium", "fairium", "aloraichium", "decidium", "eevium",
  "incinium", "kommonium", "lunalium", "lycanium", "marshadium", "mewnium", "mimikium", "pikanium", "primarium", "snorlium",
  "solganium", "tapunium", "ultranecrozium"];
// [our folder/file, pokesprite's path]
const POKESPRITE = [
  ["key-item/zygarde-cube", "key-item/zygarde-cube"], ["key-item/z-ring", "key-item/z-ring"],
  ["key-item/dynamax-band", "key-item/dynamax-band"], ["other-item/dynamax-candy", "other-item/dynamax-candy"],
  ["other-item/ability-patch", "other-item/ability-patch"]
].concat(TYPES.map((t) => ["memory/" + t, "memory/" + t]), Z.map((z) => ["z-crystal/" + z + "-z", "z-crystals/" + z + "-z--bag"]));
// [our folder/file, the expansion's icon]
const EXPANSION = [
  ["evo-item/black-augurite", "black_augurite"], ["evo-item/peat-block", "peat_block"],
  ["evo-item/scroll-of-darkness", "scroll_of_darkness"], ["evo-item/scroll-of-waters", "scroll_of_waters"],
  ["mega-stone/zygardite", "zygardite"], ["hold-item/adamant-crystal", "adamant_crystal"],
  ["hold-item/lustrous-globe", "lustrous_globe"], ["other-item/max-mushrooms", "max_mushrooms"],
  ["key-item/tera-orb", "tera_orb"],
  // Gen 9's evolution items.
  ["evo-item/auspicious-armor", "auspicious_armor"], ["evo-item/malicious-armor", "malicious_armor"],
  ["evo-item/syrupy-apple", "syrupy_apple"], ["evo-item/unremarkable-teacup", "unremarkable_teacup"],
  ["evo-item/metal-alloy", "metal_alloy"],
  // Ogerpon's masks.
  ["hold-item/wellspring-mask", "wellspring_mask"], ["hold-item/hearthflame-mask", "hearthflame_mask"],
  ["hold-item/cornerstone-mask", "cornerstone_mask"], ["hold-item/booster-energy", "booster_energy"],
  // Sword and Shield's Exp. Candies (their icons carry their own palettes).
  ["other-item/exp-candy-xs", "exp_candy_xs"], ["other-item/exp-candy-s", "exp_candy_s"], ["other-item/exp-candy-m", "exp_candy_m"],
  ["other-item/exp-candy-l", "exp_candy_l"], ["other-item/exp-candy-xl", "exp_candy_xl"]
];
// And Legends: Z-A's Mega Stones (data/items-gen9.js): "absolite-z" is the expansion's absolite_z.
{
  global.window = global;
  window.ITEMS = {};
  require("vm").runInThisContext(fs.readFileSync(path.join(__dirname, "..", "data/items-gen9.js"), "utf8"));
  for (const id of Object.keys(window.ITEMS)) EXPANSION.push(["mega-stone/" + id, id.replace(/-/g, "_")]);
}

function get(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) { res.resume(); resolve(null); return; }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", () => resolve(null));
  });
}

(async () => {
  const missing = [];
  for (const [file, src] of POKESPRITE) {
    const buf = await get("https://raw.githubusercontent.com/msikma/pokesprite/master/items/" + src + ".png");
    if (!buf) { missing.push(src); continue; }
    fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true });
    fs.writeFileSync(path.join(out, file + ".png"), buf);
  }
  for (const [file, icon] of EXPANSION) {
    const img = readPng(X("graphics/items/icons", icon + ".png"));
    const pal = X("graphics/items/icon_palettes", icon + ".pal");
    const colours = fs.existsSync(pal) ? readPal(pal) : img.palette;
    const rgba = new Uint8ClampedArray(32 * 32 * 4);
    const ox = (32 - img.width) >> 1, oy = (32 - img.height) >> 1;
    for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
      const v = img.px[y * img.width + x] & 15;
      if (v) rgba.set([...colours[v], 255], ((y + oy) * 32 + x + ox) * 4);
    }
    fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true });
    writePng(path.join(out, file + ".png"), 32, 32, rgba);
  }
  console.log("wrote " + (POKESPRITE.length - missing.length + EXPANSION.length) + " item sprites" + (missing.length ? "; pokesprite hasn't got " + missing.join(", ") : ""));
})();
