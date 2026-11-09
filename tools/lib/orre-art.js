// Small deterministic pixel-art primitives used by the Colosseum map projection.
"use strict";
const { writePng } = require("./png");
const hash = (x, y, seed = 0) => { let n = Math.imul(x + seed, 374761393) ^ Math.imul(y - seed, 668265263); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
function canvas(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  const c = { w, h, data };
  c.p = (x, y, color) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4, a = color[3] == null ? 1 : color[3] / 255; for (let k = 0; k < 3; k++) data[i + k] = data[i + 3] ? data[i + k] * (1 - a) + color[k] * a : color[k]; data[i + 3] = Math.min(255, data[i + 3] + (255 - data[i + 3]) * a); };
  c.rect = (x, y, rw, rh, col) => { for (let j = Math.max(0, y | 0); j < Math.min(h, y + rh); j++) for (let i = Math.max(0, x | 0); i < Math.min(w, x + rw); i++) c.p(i, j, col); };
  c.line = (x0, y0, x1, y1, color, width = 1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) c.rect(Math.round(x0 + (x1 - x0) * i / n) - (width >> 1), Math.round(y0 + (y1 - y0) * i / n) - (width >> 1), width, width, color); };
  c.ellipse = (cx, cy, rx, ry, col, ring = 0) => { for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(h - 1, cy + ry); y++) for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(w - 1, cx + rx); x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d <= 1 && (!ring || ((x - cx) / (rx - ring)) ** 2 + ((y - cy) / (ry - ring)) ** 2 >= 1)) c.p(x, y, col); } };
  c.poly = (points, col) => { const ys = points.map((p) => p[1]); for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(h - 1, Math.max(...ys)); y++) { const xs = []; for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); } xs.sort((a, b) => a - b); for (let i = 0; i + 1 < xs.length; i += 2) c.rect(Math.ceil(xs[i]), y, Math.floor(xs[i + 1]) - Math.ceil(xs[i]) + 1, 1, col); } };
  c.box = (x, y, rw, rh, fill, edge = [46, 36, 34]) => { c.rect(x, y, rw, rh, edge); c.rect(x + 1, y + 1, rw - 2, rh - 2, fill); };
  c.save = (file) => writePng(file, w, h, data);
  return c;
}
const C = {
  sand: [[225, 195, 130], [235, 209, 149], [209, 174, 111]], rock: [[145, 91, 58], [174, 117, 71], [111, 65, 43], [76, 47, 39]],
  stone: [[236, 229, 197], [212, 199, 161], [173, 156, 117], [117, 103, 80]], blue: [[58, 108, 154], [87, 164, 196], [169, 224, 230], [223, 247, 236]],
  rust: [[111, 65, 43], [150, 91, 51], [184, 123, 65], [214, 160, 90]], metal: [[58, 65, 66], [92, 103, 101], [137, 153, 148], [188, 202, 186]],
  grass: [[76, 112, 51], [100, 139, 60], [126, 158, 71], [159, 180, 92]], wood: [[73, 61, 48], [108, 92, 68], [148, 129, 93], [179, 162, 120]],
  dark: [30, 29, 34], cream: [247, 238, 206], gold: [212, 175, 78]
};
function texture(c, rect, colors, seed = 1) {
  const [x0, y0, w, h] = rect;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const n = hash(x, y, seed), wave = (Math.sin(x * .013 + y * .007 + seed) + Math.cos(y * .021 - x * .008)) * .12 + .4;
    const col = colors[0].map((v, k) => Math.round(v * (1 - wave) + colors[1][k] * wave + (n - .5) * 5));
    c.p(x, y, n > .975 ? colors[Math.min(2, colors.length - 1)] : col);
  }
}
function water(c, x, y, w, h, dark = false) { c.rect(x, y, w, h, dark ? [35, 75, 88] : C.blue[1]); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const n = Math.sin(i * .25 + j * .13) + Math.cos(i * .09 - j * .34); if (n > 1.45) c.p(i, j, dark ? [91, 132, 130] : C.blue[2]); else if (n < -1.2) c.p(i, j, dark ? [26, 57, 70] : C.blue[0]); } }
function stairs(c, x, y, w, h, palette = C.stone) { c.rect(x - 2, y, w + 4, h, palette[3]); for (let k = 0; k < h; k += 4) { c.rect(x, y + k, w, 3, palette[k % 8 ? 1 : 0]); c.rect(x, y + k + 3, w, 1, palette[2]); } }
function bridge(c, x, y, w, h, vertical = true) { c.rect(x + 3, y + 4, w, h, [0, 0, 0, 70]); c.rect(x, y, w, h, C.wood[0]); for (let i = 0; i < (vertical ? h : w); i += 5) c.rect(x + (vertical ? 0 : i), y + (vertical ? i : 0), vertical ? w : 4, vertical ? 4 : h, C.wood[(i / 5 | 0) % 2 + 1]); if (vertical) for (const dx of [0, w - 3]) { c.rect(x + dx, y - 4, 3, h + 4, C.wood[0]); c.rect(x + dx, y - 4, 1, h + 4, C.wood[3]); } else for (const dy of [0, h - 3]) c.rect(x, y + dy, w, 3, C.wood[0]); }
function door(c, x, y, w = 12, color = C.blue[0]) { c.box(x - w / 2, y - 23, w, 24, C.dark, C.stone[3]); c.rect(x - w / 2 + 2, y - 21, w - 4, 20, color); c.rect(x + 2, y - 10, 2, 2, C.gold); c.rect(x - w / 2 - 2, y, w + 4, 3, C.stone[1]); }
function palm(c, x, y) { c.ellipse(x + 6, y + 2, 18, 5, [46, 48, 31, 70]); c.line(x + 4, y - 35, x, y, [101, 88, 49], 5); c.line(x + 2, y - 33, x - 1, y - 1, [159, 136, 72], 2); for (const [dx, dy] of [[-24, -8], [23, -8], [-17, -23], [15, -22], [-27, 1], [25, 2]]) { c.line(x + 4, y - 35, x + 4 + dx, y - 35 + dy, C.grass[0], 7); c.line(x + 4, y - 37, x + 4 + dx, y - 36 + dy, C.grass[2], 3); } }
function cylinder(c, x, y, w, h, pal = C.stone, trim = C.blue[0]) { c.ellipse(x + w / 2 + 3, y + h + 4, w / 2 + 4, 6, [0, 0, 0, 65]); c.rect(x, y + 8, w, h - 8, pal[2]); for (let i = 1; i < w - 1; i++) { const t = i / w; c.line(x + i, y + 7, x + i, y + h - 5, t < .15 || t > .85 ? pal[2] : t < .5 ? pal[0] : pal[1]); } c.ellipse(x + w / 2, y + h - 5, w / 2, 7, pal[1]); c.ellipse(x + w / 2, y + 6, w / 2, 10, pal[2]); c.ellipse(x + w / 2, y + 4, w / 2 - 2, 8, pal[0]); c.rect(x + 3, y + h - 15, w - 6, 3, trim); }
function hut(c, x, y, w, h, type = 'tin') { const pal = type === 'root' ? C.stone : C.rust; c.rect(x + 4, y + h, w, 4, [0, 0, 0, 60]); c.box(x, y + h - 27, w, 27, pal[1], pal[3]); c.poly([[x - 3, y + h - 27], [x + 5, y], [x + w - 7, y - 3], [x + w + 3, y + h - 27]], pal[2]); for (let i = 3; i < w - 3; i += type === 'root' ? 14 : 5) c.line(x + i, y + 3, x + i + 2, y + h - 29, pal[0]); if (type !== 'root') for (let i = 0; i < w * h / 70; i++) { const rx = hash(i, 2) * w | 0, ry = hash(i, 3) * (h - 30) | 0; c.rect(x + rx, y + ry, 2, 2, pal[i % pal.length]); } c.box(x + 8, y + h - 20, 14, 10, C.dark); }
function rockface(c, x, y, w, h, pal = C.rock) { texture(c, [x, y, w, h], pal, 4, 3); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((i + Math.floor(Math.sin(j * .3) * 4)) % 17 === 0 || (j + (i >> 4) * 3) % 11 === 0) c.p(x + i, y + j, pal[2]); c.rect(x, y, w, 2, pal[0]); c.rect(x, y + h - 3, w, 3, pal[3]); }
function tree(c, x, y, size = 1) { c.ellipse(x + 3, y + 1, 18 * size, 5 * size, [0, 0, 0, 70]); c.line(x, y - 25 * size, x, y, C.wood[0], 10 * size); c.line(x - 1, y - 24 * size, x - 2, y, C.wood[2], 3 * size); for (const [dx, dy, r] of [[0, -40, 20], [-13, -32, 14], [14, -32, 14], [-5, -50, 15]]) { c.ellipse(x + dx * size, y + dy * size, r * size, r * size * .7, C.grass[0]); c.ellipse(x + (dx - 2) * size, y + (dy - 2) * size, (r - 3) * size, (r - 3) * size * .7, C.grass[1]); c.ellipse(x + (dx - 5) * size, y + (dy - 5) * size, (r - 8) * size, (r - 8) * size * .7, C.grass[2]); } }
const FONT = { A:"010101111101101",B:"110101110101110",C:"011100100100011",D:"110101101101110",E:"111100110100111",F:"111100110100100",G:"011100101101011",H:"101101111101101",I:"111010010010111",J:"001001001101010",K:"101101110101101",L:"100100100100111",M:"101111111101101",N:"101111111111101",O:"010101101101010",P:"110101110100100",Q:"010101101111011",R:"110101110101101",S:"011100010001110",T:"111010010010010",U:"101101101101111",V:"101101101101010",W:"101101111111101",X:"101101010101101",Y:"101101010010010",Z:"111001010100111",0:"111101101101111",1:"010110010010111",2:"110001010100111",3:"110001010001110",4:"101101111001001",5:"111100110001110",6:"011100110101010",7:"111001010010010",8:"010101010101010",9:"010101011001110" };
function text(c, value, x, y, color = C.dark) {
  for (const letter of value) { const glyph = FONT[letter]; if (glyph) for (let i = 0; i < 15; i++) if (glyph[i] === '1') c.p(x + i % 3, y + (i / 3 | 0), color); x += 4; }
}

module.exports = { text, canvas, hash, C, texture, water, stairs, bridge, door, palm, cylinder, hut, rockface, tree };
