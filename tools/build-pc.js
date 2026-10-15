// Builds the pictures FireRed's PC screens are drawn with, from pret/pokefirered:
// the Pokémon Storage System (src/pokemon_storage_system_*.c) and the item
// storage list (src/item_pc.c).
//
//   node tools/build-pc.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes assets/pc/:
//   menu.png              BG1: the interface (menu.png, menu.bin; interface.pal), 240x160
//   pkmn-data.png         the "PKMN DATA" strip (pkmn_data.bin): rows 0-15 with a
//                         Pokémon shown, rows 16-31 without (palette 2), 64x32
//   close-box.png         CLOSE BOX (close_box_button.bin): normal, then lit, 72x32
//   party-panel.png       the party panel (party_menu.bin, party_menu.pal), 96x176;
//                         its bottom 16 rows are the PARTY POKéMON button
//   party-slot-empty.png  an empty party slot (party_slot_empty.bin), 32x24
//   scrolling-bg.png,     the drifting backdrop (scrolling_bg.png, .bin), 256x256,
//   scrolling-bg-items.png  and its MOVE ITEMS colours
//   wallpaper-<n>.png     the 16 wallpapers (wallpapers/*/), in FireRed's order, 160x144
//   cursor.png            the hand: 4 frames of 32x32 (bounce, bounce, open, fist), misc2.pal
//   cursor-multi.png      the same in misc1.pal (SELECT's multi-move mode)
//   cursor-shadow.png     16x16
//   box-arrows.png        box_scroll_arrow.png, 8x32 (left, then right)
//   choose-box.png        the "which BOX?" popup: centre (64x64) with its corners, 80x64
//   waveform.png          waveform.png, 16x56 (7 frames of 16x8)
//   item-pc.png           the item storage screen (graphics/item_pc/bg.*), 240x160
//   item-pc-dim.png       its rows 14-19 in palette 2 (while a menu is open), 240x48
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");
const { paletteRam, renderBg } = require("./lib/gba");

const pret = process.argv[2] || process.env.POKEFIRERED;
const P = (...p) => path.join(pret || "", ...p);
if (!pret || !fs.existsSync(P("graphics/pokemon_storage/menu.bin")) || !fs.existsSync(P("graphics/item_pc/bg.bin"))) {
  console.error("Usage: node tools/build-pc.js <path to pret/pokefirered>  (needs graphics/pokemon_storage/ and graphics/item_pc/)");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/pc");
fs.mkdirSync(out, { recursive: true });
const S = (...p) => P("graphics/pokemon_storage", ...p);
const tmp = path.join(out, ".tmp.bin");
const save = (file, r) => writePng(path.join(out, file), r.width, r.height, r.rgba);

// BG1's palettes (InitPalettesAndSprites, InitSupplementalTilemaps).
const bg1 = paletteRam([[0, readPal(S("interface.pal"))], [1, readPal(S("party_menu.pal"))],
  [2, readPal(S("interface_no_display_mon.pal"))]]);
// A rectangle of a tilemap `w` entries wide, as its own map.
function rect(file, w, x, y, rw, rh) {
  const b = fs.readFileSync(file), o = Buffer.alloc(rw * rh * 2);
  for (let r = 0; r < rh; r++) for (let c = 0; c < rw; c++) o.writeUInt16LE(b.readUInt16LE(((y + r) * w + x + c) * 2), (r * rw + c) * 2);
  fs.writeFileSync(tmp, o);
  return tmp;
}
const menuTiles = S("menu.png");
const bg1Map = (map, w, h, opaque) => renderBg({ tiles: menuTiles, map, widthTiles: w, heightTiles: h, rowWidth: w, ram: bg1, tileOffset: 256, lowNibble: true, opaque });

save("menu.png", bg1Map(rect(S("menu.bin"), 32, 0, 0, 30, 20), 30, 20));
save("pkmn-data.png", bg1Map(S("pkmn_data.bin"), 8, 4));
save("close-box.png", bg1Map(S("close_box_button.bin"), 9, 4));
save("party-panel.png", bg1Map(S("party_menu.bin"), 12, 22));
save("party-slot-empty.png", bg1Map(S("party_slot_empty.bin"), 4, 3));

// The backdrop, palette 3 (its tilemap's).
for (const [file, pal] of [["scrolling-bg.png", readPng(S("scrolling_bg.png")).palette.slice(0, 16)], ["scrolling-bg-items.png", readPal(S("scrolling_bg_move_items.pal"))]]) {
  save(file, renderBg({ tiles: S("scrolling_bg.png"), map: S("scrolling_bg.bin"), widthTiles: 32, heightTiles: 32, ram: paletteRam([[3, pal]]), lowNibble: true, opaque: true }));
}

// Wallpapers: tilemap palettes 1-2 are the wallpaper's own two (BG palettes 4-5:
// DrawWallpaper adds 3); colour 0 shows the backdrop through.
const WALLPAPERS = ["forest", "city", "desert", "savanna", "crag", "volcano", "snow", "cave",
  "beach", "seafloor", "river", "sky", "stars", "pokecenter", "tiles", "simple"];
WALLPAPERS.forEach((name, i) => {
  const tiles = S("wallpapers", name, "tiles.png"), pal = readPng(tiles).palette;
  const ram = paletteRam([[1, pal.slice(0, 16)], [2, pal.slice(16, 32)]]);
  save("wallpaper-" + i + ".png", renderBg({ tiles, map: S("wallpapers", name, "tilemap.bin"), widthTiles: 20, heightTiles: 18, rowWidth: 20, ram, lowNibble: true }));
});

// Sprites, colour 0 clear: in their own palette, or `pal`.
function sprite(file, dest, pal) {
  const img = readPng(file), colours = pal || img.palette;
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  img.px.forEach((v, i) => { v &= 15; if (v) rgba.set([...colours[v], 255], i * 4); });
  writePng(path.join(out, dest), img.width, img.height, rgba);
  return { width: img.width, height: img.height, rgba };
}
const misc1 = readPal(S("misc1.pal")), misc2 = readPal(S("misc2.pal"));
sprite(S("cursor.png"), "cursor.png", misc2);
sprite(S("cursor.png"), "cursor-multi.png", misc1);
sprite(S("cursor_shadow.png"), "cursor-shadow.png", misc2);
sprite(S("box_scroll_arrow.png"), "box-arrows.png", misc2);
sprite(S("waveform.png"), "waveform.png", misc2);
// The popup: the 64x64 centre at (8, 0), and its corner pieces either side
// (8x32 frame 0 and 8x16 frame 4 on the left, 6 and 10 on the right).
{
  const W = 80, H = 64, rgba = new Uint8ClampedArray(W * H * 4);
  const blit = (img, sx, sy, w, h, dx, dy) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = img.px[(sy + y) * img.width + sx + x] & 15;
      if (v) rgba.set([...misc1[v], 255], ((dy + y) * W + dx + x) * 4);
    }
  };
  const centre = readPng(S("choose_box_menu_center.png")), corners = readPng(S("choose_box_menu_corners.png"));
  blit(centre, 0, 0, 64, 64, 8, 0);
  // (corners.png is 16 wide: frames are 8x8 tiles, two to a row.)
  const tile = (n, dx, dy) => blit(corners, (n % 2) * 8, Math.floor(n / 2) * 8, 8, 8, dx, dy);
  for (let k = 0; k < 4; k++) { tile(0 + k, 0, k * 8); tile(6 + k, 72, k * 8); }
  for (let k = 0; k < 2; k++) { tile(4 + k, 0, 32 + k * 8); tile(10 + k, 72, 32 + k * 8); }
  writePng(path.join(out, "choose-box.png"), W, H, rgba);
}

// The item storage screen (item_pc.c: BG1, palettes 0-2 from bg.png).
{
  const tiles = P("graphics/item_pc/bg.png"), map = P("graphics/item_pc/bg.bin"), pal = readPng(tiles).palette;
  const ram = paletteRam([[0, pal.slice(0, 16)], [1, pal.slice(16, 32)], [2, pal.slice(32, 48)]]);
  ram[0] = [0, 0, 0];
  save("item-pc.png", renderBg({ tiles, map, widthTiles: 30, heightTiles: 20, ram, lowNibble: true, opaque: true }));
  const entries = fs.readFileSync(map), dim = Buffer.alloc(32 * 6 * 2);
  for (let i = 0; i < 32 * 6; i++) dim.writeUInt16LE((entries.readUInt16LE((14 * 32 + i) * 2) & 0x0fff) | (2 << 12), i * 2);
  fs.writeFileSync(tmp, dim);
  save("item-pc-dim.png", renderBg({ tiles, map: tmp, widthTiles: 30, heightTiles: 6, rowWidth: 32, ram, lowNibble: true, opaque: true }));
}
fs.unlinkSync(tmp);
console.log("wrote assets/pc/");
