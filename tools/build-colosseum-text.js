// Pokémon Colosseum's text, from your own copy of the game: its .fsys archives
// (extracted from the disc with Dolphin: right-click the game, Properties,
// Filesystem), unpacked and their message tables decoded into
// assets/text/colosseum.json, for Orre's story to use as it's built.
//
//   node tools/build-colosseum-text.js <.fsys files or folders of them>
//   node tools/build-colosseum-text.js      (no disc: colosseum.json again, from itself)
//
// (Message tables already unpacked from the archives, .msg files, can be
// given too.)
//
// (The archives themselves aren't kept in the repository: only the text.)
//
// An .fsys archive: "FSYS", its file count at 0x0C, a table of pointers at
// 0x60 to each file's entry (its id and type, where it starts, its size
// unpacked and packed, where its name is); each file packed with LZSS (a
// 16-byte "LZSS" header, then Okumura's LZSS: a 4096-byte window starting at
// 4078, matches of 3 to 18 bytes). Files of type 0x0A are message tables, and
// common.rel has more inside it. A message table: its string count (u16) at 4,
// "US" for the English game, then from 0x10 each string's id and offset (two
// u32s). A string is UTF-16 (big-endian), ending at 0x0000; 0xFFFF and a byte
// is a control code, some followed by arguments: 00 a new line, 02 the end of
// a page (and 03, the next page of it), 59 the speaker's name, 07 a font and 08 a colour (skipped), 04 05
// 06 a word with its reading (Japanese only); the others put in a name or a
// number (written here as {name} or {xx}).
"use strict";

const fs = require("fs");
const path = require("path");

// ---------- The archives ----------

function lzss(src, size) {
  const N = 4096, F = 18, buf = new Uint8Array(N), out = Buffer.alloc(size);
  let r = N - F, i = 0, o = 0, flags = 0;
  while (o < size && i < src.length) {
    flags >>= 1;
    if (!(flags & 0x100)) flags = src[i++] | 0xff00;
    if (flags & 1) { const c = src[i++]; out[o++] = c; buf[r] = c; r = (r + 1) & (N - 1); continue; }
    if (i + 1 >= src.length) break;
    const a = src[i++], b = src[i++], pos = a | ((b & 0xf0) << 4), len = (b & 0x0f) + 3;
    for (let k = 0; k < len && o < size; k++) { const c = buf[(pos + k) & (N - 1)]; out[o++] = c; buf[r] = c; r = (r + 1) & (N - 1); }
  }
  return out;
}

function unpack(file) {
  const d = fs.readFileSync(file);
  if (d.toString("latin1", 0, 4) !== "FSYS") throw new Error(file + " isn't an .fsys archive");
  const files = [], n = d.readUInt32BE(0x0c);
  for (let k = 0; k < n; k++) {
    const e = d.readUInt32BE(0x60 + 4 * k), type = d[e + 2];
    const start = d.readUInt32BE(e + 4), size = d.readUInt32BE(e + 8), packed = d.readUInt32BE(e + 0x14), nameAt = d.readUInt32BE(e + 0x24);
    const name = d.toString("latin1", nameAt, d.indexOf(0, nameAt));
    const blob = d.subarray(start, start + packed);
    files.push({ name, type, data: blob.toString("latin1", 0, 4) === "LZSS" ? lzss(blob.subarray(16), size) : blob.subarray(0, size) });
  }
  return files;
}

// ---------- The message tables ----------

// Codes followed by arguments (bytes), and the names of those that put something in.
const ARGS = { 0x07: 1, 0x08: 4, 0x09: 1, 0x38: 1, 0x52: 1, 0x53: 1, 0x5b: 1, 0x5c: 1 };
// (59 the speaker, 2B you, 2C your partner; 3D starts a line no one says: left out.)
const NAMES = { 0x59: "speaker", 0x2b: "player", 0x2c: "partner" };

function decode(d, at) {
  let s = "", reading = false;
  for (let j = at; j + 1 < d.length;) {
    const c = d.readUInt16BE(j); j += 2;
    if (c === 0) break;
    // (The places' own scripts name their speaker with a glyph of the game's font, 0x2031.)
    if (c !== 0xffff) { if (!reading) s += c === 0x2031 ? "{speaker}" : String.fromCharCode(c); continue; }
    const code = d[j++];
    j += ARGS[code] || 0;
    if (code === 0x00) s += "\n";
    else if (code === 0x02 || code === 0x03) s += "\f";
    else if (code === 0x05) reading = true;   // (a word's reading: left out)
    else if (code === 0x06) reading = false;
    else if (code === 0x04 || code === 0x3d || ARGS[code]) continue;
    else s += "{" + (NAMES[code] || code.toString(16).padStart(2, "0")) + "}";
  }
  return s.replace(/\f$/, "");
}

function table(d, at) {
  const n = d.readUInt16BE(at + 4), strings = {};
  for (let i = 0; i < n; i++) {
    const id = d.readUInt32BE(at + 0x10 + 8 * i), off = d.readUInt32BE(at + 0x14 + 8 * i);
    if (at + off >= d.length) continue;
    const s = decode(d, at + off);
    // (The English game still has some Japanese left in: kept out.)
    if (s && !/[　-ヿ一-鿿＀-￯]/.test(s)) strings[id] = s;
  }
  return strings;
}
// Tables inside another file (common.rel): wherever "US" follows a plausible count.
function tablesIn(d) {
  const found = [];
  for (let o = 0; o + 0x18 < d.length; o += 2) {
    if (d[o + 6] !== 0x55 || d[o + 7] !== 0x53 || d.readUInt32BE(o + 8) || d.readUInt32BE(o + 12)) continue;
    const n = d.readUInt16BE(o + 4), first = d.readUInt32BE(o + 0x14);
    if (n && d.readUInt32BE(o) <= 1 && first >= 0x10 + 8 * n && o + first < d.length) found.push(o);
  }
  return found;
}

// ---------- Everything given ----------

const inputs = process.argv.slice(2).flatMap((p) => (fs.statSync(p).isDirectory()
  ? fs.readdirSync(p).filter((f) => /\.(fsys|msg)$/i.test(f)).map((f) => path.join(p, f)) : [p]));
// (With none, no disc: it writes colosseum.json again from what it holds, the text of every archive read before.)
// (Into the repository's assets/text; or, run from a copy of this script on its own, colosseum.json where you are.)
const repoText = path.join(__dirname, "..", "assets/text");
const outFile = fs.existsSync(repoText) ? path.join(repoText, "colosseum.json") : path.resolve("colosseum.json");
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : {};
let count = 0;
for (const file of inputs) {
  // (A message table already unpacked, by QuickBMS or another tool: keyed by its own name.)
  if (/\.msg$/i.test(file)) {
    const strings = table(fs.readFileSync(file), 0);
    out["msg/" + path.basename(file).replace(/\.msg$/i, "")] = strings;
    count += Object.keys(strings).length;
    continue;
  }
  const archive = path.basename(file).replace(/\.fsys$/i, "").replace(/^[0-9a-f]{8}-/, "");   // (an uploaded copy's prefix)
  for (const f of unpack(file)) {
    const offsets = f.type === 0x0a ? [0] : /_rel$/.test(f.name) ? tablesIn(f.data) : [];
    offsets.forEach((o, k) => {
      const strings = table(f.data, o);
      if (!Object.keys(strings).length) return;
      out[archive + "/" + f.name + (offsets.length > 1 ? "#" + k : "")] = strings;
      count += Object.keys(strings).length;
    });
  }
}
// (Many archives carry their own copy of the same table, the battle text or the menus: kept once, under the first
// archive to have it.)
const seen = new Map();
for (const key of Object.keys(out).sort()) {
  const json = JSON.stringify(out[key]);
  if (seen.has(json)) delete out[key]; else seen.set(json, key);
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 0).replace(/("\w[^"]*\/[^"]*":)/g, "\n$1") + "\n");
console.log("wrote " + count + " strings from " + inputs.length + " archives to " + outFile);
