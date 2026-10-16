// Minimal NARC reader: readNarc(buf) -> array of Buffers (members).
"use strict";
const fs = require("fs");
function readNarc(buf) {
  if (typeof buf === "string") buf = fs.readFileSync(buf);
  if (buf.toString("ascii", 0, 4) !== "NARC") throw new Error("not a NARC");
  let pos = buf.readUInt16LE(0x0c); // header size
  const chunks = {};
  for (let i = 0; i < 3; i++) {
    const id = buf.toString("ascii", pos, pos + 4), size = buf.readUInt32LE(pos + 4);
    chunks[id] = pos; pos += size;
  }
  const fat = chunks.BTAF, n = buf.readUInt16LE(fat + 8), img = chunks.GMIF + 8;
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = buf.readUInt32LE(fat + 12 + i * 8), e = buf.readUInt32LE(fat + 16 + i * 8);
    out.push(buf.subarray(img + s, img + e));
  }
  return out;
}
module.exports = { readNarc };
