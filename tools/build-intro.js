// Builds the FireRed intro graphics (opening movie, title screen, Prof. Oak's
// speech) from a pret/pokefirered checkout into assets/intro/.
//
//   node tools/build-intro.js <path to pokefirered>     (or set POKEFIRERED)
//
// Needs graphics/intro/, graphics/title_screen/ and graphics/oak_speech/ (see
// README "Intro"). GBA backgrounds are drawn from their tile sheets, tilemaps
// and palettes into plain images; sprites are cut into RGBA sheets with
// colour 0 transparent. Timing and placement live in ui/intro.js.
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");
const { parseTextFile, cleanText } = require("./lib/text");
const { paletteRam, renderBg } = require("./lib/gba");

const root = path.join(__dirname, "..");
const pret = process.argv[2] || process.env.POKEFIRERED;
if (!pret || !fs.existsSync(path.join(pret, "graphics/intro"))) {
  console.error("usage: node tools/build-intro.js <path to pokefirered>  (needs graphics/intro, title_screen, oak_speech)");
  process.exit(1);
}
const G = (...p) => path.join(pret, "graphics", ...p);
const out = path.join(root, "assets/intro");
fs.mkdirSync(out, { recursive: true });

// ---------- Helpers ----------

// An indexed sprite sheet -> RGBA with colour 0 transparent, using `colours`
// (a palette) or the PNG's own palette. 8bpp pictures store pixels at their
// palette RAM slot (Oak's at 96+), so indices wrap to the palette's length.
function renderSprite(file, colours) {
  const p = readPng(file);
  const pal = colours || p.palette;
  const rgba = new Uint8ClampedArray(p.width * p.height * 4);
  for (let i = 0; i < p.px.length; i++) {
    const v = p.px[i];
    if (!v) continue;
    const c = pal[colours ? v % colours.length : v] || [v * 17, v * 17, v * 17];
    rgba[i * 4] = c[0]; rgba[i * 4 + 1] = c[1]; rgba[i * 4 + 2] = c[2]; rgba[i * 4 + 3] = 255;
  }
  return { width: p.width, height: p.height, rgba };
}

const save = (name, img) => writePng(path.join(out, name + ".png"), img.width, img.height, img.rgba);
const pal = (...p) => readPal(G(...p));
const pngPal = (...p) => readPng(G(...p)).palette;

// ---------- Prof. Oak's speech (graphics/oak_speech) ----------

// Trainer pictures, 64x96, colour 0 transparent.
for (const who of ["oak", "red", "leaf", "rival"]) save("oak-speech-" + who, renderSprite(G("oak_speech", who, "pic.png"), pal("oak_speech", who, "pal.pal")));

// The platform under the picture: three 32x32 pieces (left, middle, right) side by side.
{
  const p = renderSprite(G("oak_speech/platform.png"), pal("oak_speech/platform.pal"));
  const rgba = new Uint8ClampedArray(96 * 32 * 4);
  for (let f = 0; f < 3; f++) {
    for (let y = 0; y < 32; y++) rgba.set(p.rgba.subarray(((f * 32 + y) * 32) * 4, ((f * 32 + y) * 32 + 32) * 4), (y * 96 + f * 32) * 4);
  }
  save("oak-speech-platform", { width: 96, height: 32, rgba });
}

// Backgrounds use bg_tiles.png's palette (4 x 16 colours, BG palettes 0-3).
const speechRam = paletteRam([[0, pngPal("oak_speech/bg_tiles.png")]]);
save("oak-speech-bg", renderBg({ tiles: G("oak_speech/oak_speech_bg.png"), map: G("oak_speech/oak_speech_bg.bin"),
  widthTiles: 30, heightTiles: 20, ram: speechRam, opaque: true }));

// The controls guide's button icons (5x16 tiles each page) and the Pikachu
// page's ruled-paper panel (rows 2-19), all from bg_tiles.png. Its pixels hold
// their full palette index (8bpp), so the PNG's own palette colours them.
const tilesPal = paletteRam([[0, readPng(G("oak_speech/bg_tiles.png")).palette]]);
for (const page of [2, 3]) {
  save("controls-page-" + page, renderBg({ tiles: G("oak_speech/bg_tiles.png"), map: G("oak_speech/controls_guide_page_" + page + ".bin"),
    widthTiles: 5, heightTiles: 16, ram: tilesPal, bpp: 8, rowWidth: 5 }));
}
save("pikachu-page", renderBg({ tiles: G("oak_speech/bg_tiles.png"), map: G("oak_speech/pikachu_intro/tilemap.bin"),
  widthTiles: 30, heightTiles: 18, ram: tilesPal, bpp: 8, rowWidth: 30 }));

// The Pikachu in the corner of those pages: body (2 frames 32x32), ears
// (2 frames 32x16), eyes (2 frames 16x8), with pikachu.pal.
for (const part of ["body", "ears", "eyes"]) save("pikachu-" + part, renderSprite(G("oak_speech/pikachu_intro", part + ".png"), pal("oak_speech/pikachu_intro/pikachu.pal")));

// ---------- Title screen (graphics/title_screen, FireRed) ----------

const T = (...p) => G("title_screen", ...p);
const bgPal = pal("title_screen/firered/background.pal");
// BG0: the logo, 8bpp, palette banks 0-12 from game_title_logo.pal.
save("title-logo", renderBg({ tiles: T("firered/game_title_logo.png"), map: T("firered/game_title_logo.bin"),
  widthTiles: 30, heightTiles: 20, ram: paletteRam([[0, pal("title_screen/firered/game_title_logo.pal").slice(0, 208)]]), bpp: 8 }));
// BG1: Charizard, palette 13.
save("title-charizard", renderBg({ tiles: T("firered/box_art_mon.png"), map: T("firered/box_art_mon.bin"),
  widthTiles: 30, heightTiles: 20, ram: paletteRam([[13, pal("title_screen/firered/box_art_mon.pal")]]) }));
// Charizard in gray for its fade-in (TintPalette_GrayScale2: luminance of the
// 5-bit colour, snapped to 7 grays).
{
  const steps = [0, 5, 11, 16, 21, 26, 31];
  const grayPal = pal("title_screen/firered/box_art_mon.pal").map(([r, g2, b]) => {
    const lum = Math.min(31, ((r >> 3) * 76 + (g2 >> 3) * 151 + (b >> 3) * 29) >> 8);
    const v = Math.round((steps[Math.min(6, Math.floor(lum / 5))] * 255) / 31);
    return [v, v, v];
  });
  save("title-charizard-gray", renderBg({ tiles: T("firered/box_art_mon.png"), map: T("firered/box_art_mon.bin"),
    widthTiles: 30, heightTiles: 20, ram: paletteRam([[13, grayPal]]) }));
}
// BG2: the black bands, "PRESS START" and the copyright line, palette 15. A
// second copy has "PRESS START" (colours 1-5) blacked out for its blink.
{
  const opts = { tiles: T("copyright_press_start.png"), map: T("copyright_press_start.bin"), widthTiles: 30, heightTiles: 20 };
  save("title-overlay", renderBg(Object.assign({ ram: paletteRam([[15, bgPal]]) }, opts)));
  const hidden = bgPal.map((c, i) => (i >= 1 && i <= 5 ? bgPal[6] : c));
  save("title-overlay-blank", renderBg(Object.assign({ ram: paletteRam([[15, hidden]]) }, opts)));
}
// BG3: the border and teal band, palette 14 (a grayscale sheet, inverted).
save("title-border", renderBg({ tiles: T("border_bg.png"), map: T("firered/border_bg.bin"), widthTiles: 30, heightTiles: 20,
  ram: paletteRam([[14, bgPal]]), invertGray: true, opaque: true }));
// Sprites: the flames (10 frames of 16x16, stacked) and the slash used as a
// mask for the logo's shine.
save("title-flames", renderSprite(T("firered/flames.png")));
save("title-slash", renderSprite(T("slash.png"), pal("title_screen/firered/slash.pal")));

// ---------- Opening movie (graphics/intro) ----------

const I = (...p) => G("intro", ...p);
const own = (...p) => readPng(I(...p)).palette;
// Copyright screen.
save("movie-copyright", renderBg({ tiles: I("copyright.png"), map: I("copyright.bin"), widthTiles: 30, heightTiles: 20,
  ram: paletteRam([[0, own("copyright.png")]]) }));
// Game Freak scene: the name (a grayscale sheet coloured with the logo's
// palette), the logo, "PRESENTS", the shooting star and sparkles.
const logoPal = own("game_freak/logo.png");
{
  const p = readPng(I("game_freak/game_freak.png"));
  const rgba = new Uint8ClampedArray(p.width * p.height * 4);
  p.px.forEach((g, i) => { const v = 15 - g; if (!v) return; const c = logoPal[v]; rgba.set([c[0], c[1], c[2], 255], i * 4); });
  save("movie-gamefreak-name", { width: p.width, height: p.height, rgba });
}
for (const f of ["logo", "presents", "star", "sparkles_small", "sparkles_big"]) save("movie-gf-" + f.replace("_", "-"), renderSprite(I("game_freak", f + ".png")));
// Scene 1: grass and background, three 256x128 animation frames stacked in 256x512 maps.
save("movie-s1-grass", renderBg({ tiles: I("scene_1/grass.png"), map: I("scene_1/grass.bin"), widthTiles: 32, heightTiles: 64,
  ram: paletteRam([[1, own("scene_1/grass.png")]]) }));
save("movie-s1-bg", renderBg({ tiles: I("scene_1/bg.png"), map: I("scene_1/bg.bin"), widthTiles: 32, heightTiles: 64,
  ram: paletteRam([[2, own("scene_1/bg.png")]]) }));
// Scene 2: the wide shot (top) and close-up (bottom) background, plants, and the close-ups.
const s2pal = pal("intro/scene_2/bg.pal");
save("movie-s2-bg", renderBg({ tiles: I("scene_2/bg.png"), map: I("scene_2/bg.bin"), widthTiles: 32, heightTiles: 64,
  ram: paletteRam([[1, s2pal.slice(0, 16)], [2, s2pal.slice(16, 32)], [3, s2pal.slice(32, 48)]]), opaque: true }));
save("movie-s2-plants", renderBg({ tiles: I("scene_2/plants.png"), map: I("scene_2/plants.bin"), widthTiles: 32, heightTiles: 20,
  ram: paletteRam([[1, s2pal.slice(0, 16)]]) }));
save("movie-s2-gengar-close", renderBg({ tiles: I("scene_2/gengar_close.png"), map: I("scene_2/gengar_close.bin"), widthTiles: 32, heightTiles: 32,
  ram: paletteRam([[5, pal("intro/gengar.pal")]]) }));
save("movie-s2-nidorino-close", renderBg({ tiles: I("scene_2/nidorino_close.png"), map: I("scene_2/nidorino_close.bin"), widthTiles: 32, heightTiles: 32,
  ram: paletteRam([[6, pal("intro/scene_2/nidorino_close.pal")]]) }));
save("movie-s2-gengar", renderSprite(I("scene_2/gengar.png"), pal("intro/gengar.pal")));
save("movie-s2-nidorino", renderSprite(I("scene_2/nidorino.png"), pal("intro/nidorino.pal")));
// Scene 3: background, Gengar's animated BG (4 frames of 256x128), and sprites.
const s3pal = pal("intro/scene_3/bg.pal");
save("movie-s3-bg", renderBg({ tiles: I("scene_3/bg.png"), map: I("scene_3/bg.bin"), widthTiles: 32, heightTiles: 20,
  ram: paletteRam([[1, s3pal.slice(0, 16)], [2, s3pal.slice(16, 32)]]), opaque: true }));
save("movie-s3-gengar-anim", renderBg({ tiles: I("scene_3/gengar_anim.png"), map: I("scene_3/gengar_anim.bin"), widthTiles: 32, heightTiles: 64,
  ram: paletteRam([[5, pal("intro/gengar.pal")]]) }));
for (const f of ["nidorino", "grass", "swipe", "recoil_dust"]) save("movie-s3-" + f.replace("_", "-"), renderSprite(I("scene_3", f + ".png")));
// Gengar as sprites for the zoom: four pieces in 1D tile order, put back together (96x128).
{
  const p = readPng(I("scene_3/gengar_static.png"));
  const colours = pal("intro/gengar.pal");
  const tilesPerRow = p.width / 8, W = 96, H = 128;
  const rgba = new Uint8ClampedArray(W * H * 4);
  const piece = (firstTile, w, h, ox, oy) => {
    const across = w / 8;
    for (let t = 0; t < (w / 8) * (h / 8); t++) {
      const src = firstTile + t, sx = (src % tilesPerRow) * 8, sy = Math.floor(src / tilesPerRow) * 8;
      const dx = ox + (t % across) * 8, dy = oy + Math.floor(t / across) * 8;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const v = p.px[(sy + y) * p.width + sx + x];
        if (!v) continue;
        const c = colours[v];
        rgba.set([c[0], c[1], c[2], 255], ((dy + y) * W + dx + x) * 4);
      }
    }
  };
  piece(0, 64, 64, 0, 0); piece(64, 32, 64, 64, 0); piece(96, 64, 64, 0, 64); piece(160, 32, 64, 64, 64);
  save("movie-s3-gengar-static", { width: W, height: H, rgba });
}

// ---------- Text ----------
//
// Prof. Oak's speech, the controls guide, the Pikachu pages and the name
// choices, from data/text/new_game_intro.inc, as pages of plain text.
{
  const raw = parseTextFile(path.join(pret, "data/text/new_game_intro.inc"), {});
  const text = {};
  for (const [label, value] of Object.entries(raw)) text[label] = cleanText(value);
  fs.writeFileSync(path.join(root, "data/intro-text.js"),
    "// Auto-generated by tools/build-intro.js from pret/pokefirered. Do not edit by hand.\n" +
    "window.INTRO_TEXT = " + JSON.stringify(text, null, 1) + ";\n");
}

console.log("wrote " + fs.readdirSync(out).length + " images to assets/intro/ and data/intro-text.js");
