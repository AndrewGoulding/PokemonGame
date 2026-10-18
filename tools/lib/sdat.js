// Nintendo DS sound archives (SDAT), as HeartGold's gs_sound_data.sdat, in
// plain Node: the archive's names and info, and the files in it decoded.
// Based on the Nitro sound formats as documented by kiwi.ds / Crystal Tile and
// played by Nintendo's NitroSystem sound player (SSEQ, SBNK, SWAR / SWAV).
//
//   const sdat = readSdat(buffer)
//   sdat.seqs[i]   { id, name, fileId, bank, vol, chPrio, plPrio, player }
//   sdat.banks[i]  { id, name, fileId, wars: [4 wave archive ids, -1 for none] }
//   sdat.wars[i]   { id, name, fileId }
//   sdat.file(fileId)  -> Buffer
//   readSbnk(buf)  -> instruments: null, or { t: "pcm" | "psg" | "noise", ... }, { t: "drums", lo, regions }, { t: "split", regions }
//   readSwar(buf)  -> raw wave entries (Buffers)
//   decodeSwav(entry) -> { rate, loop (sample index or null), pcm: Int16Array }
//   readSseq(buf)  -> the sequence's command bytes (Buffer)
"use strict";

// ---------- The archive ----------

function readSdat(buf) {
  if (buf.toString("ascii", 0, 4) !== "SDAT") throw new Error("not an SDAT");
  const symb = buf.readUInt32LE(0x10), info = buf.readUInt32LE(0x18), fat = buf.readUInt32LE(0x20);
  // A record: a count and that many offsets (from the block's start; 0 for none).
  const record = (block, n) => {
    const at = block + buf.readUInt32LE(block + 8 + n * 4), count = buf.readUInt32LE(at), out = [];
    for (let i = 0; i < count; i++) { const o = buf.readUInt32LE(at + 4 + i * 4); out.push(o ? block + o : 0); }
    return out;
  };
  const cstr = (at) => { let e = at; while (buf[e]) e++; return buf.toString("latin1", at, e); };
  const names = (n) => (symb ? record(symb, n).map((at) => (at ? cstr(at) : null)) : []);
  const seqNames = names(0), bankNames = names(2), warNames = names(3);
  const seqs = record(info, 0).map((at, id) => at && {
    id, name: seqNames[id], fileId: buf.readUInt16LE(at), bank: buf.readUInt16LE(at + 4), vol: buf[at + 6],
    chPrio: buf[at + 7], plPrio: buf[at + 8], player: buf[at + 9]
  });
  const banks = record(info, 2).map((at, id) => at && {
    id, name: bankNames[id], fileId: buf.readUInt16LE(at),
    wars: [0, 1, 2, 3].map((k) => { const w = buf.readUInt16LE(at + 4 + k * 2); return w === 0xffff ? -1 : w; })
  });
  const wars = record(info, 3).map((at, id) => at && { id, name: warNames[id], fileId: buf.readUInt32LE(at) & 0xffffff });
  const nFiles = buf.readUInt32LE(fat + 8);
  const file = (n) => {
    if (n >= nFiles) throw new Error("no file " + n);
    const o = buf.readUInt32LE(fat + 12 + n * 16), size = buf.readUInt32LE(fat + 16 + n * 16);
    return buf.subarray(o, o + size);
  };
  return { seqs, banks, wars, file };
}

// ---------- Banks (SBNK) ----------

// One sound: a wave (or a PSG duty / noise), its base key, ADSR and pan.
function sound(type, buf, at) {
  const t = { 1: "pcm", 2: "psg", 3: "noise" }[type];
  if (!t) return null;
  return { t, wave: buf.readUInt16LE(at), war: buf.readUInt16LE(at + 2), key: buf[at + 4],
    a: buf[at + 5], d: buf[at + 6], s: buf[at + 7], r: buf[at + 8], pan: buf[at + 9] };
}
function readSbnk(buf) {
  if (buf.toString("ascii", 0, 4) !== "SBNK") throw new Error("not an SBNK");
  const count = buf.readUInt32LE(0x38), out = [];
  for (let i = 0; i < count; i++) {
    const e = 0x3c + i * 4, type = buf[e], at = buf.readUInt16LE(e + 1);
    if (type === 0) out.push(null);
    else if (type < 16) out.push(sound(type, buf, at));
    else if (type === 16) {   // a drum set: a sound per key, lo..hi
      const lo = buf[at], hi = buf[at + 1], regions = [];
      for (let k = 0; k <= hi - lo; k++) { const p = at + 2 + k * 12; regions.push(sound(buf.readUInt16LE(p), buf, p + 2)); }
      out.push({ t: "drums", lo, regions });
    } else if (type === 17) {   // a key split: up to 8 ranges, by their top key
      const regions = [];
      let p = at + 8;
      for (let k = 0; k < 8 && buf[at + k]; k++, p += 12) regions.push(Object.assign({ top: buf[at + k] }, sound(buf.readUInt16LE(p), buf, p + 2)));
      out.push({ t: "split", regions });
    } else out.push(null);
  }
  return out;
}

// ---------- Waves (SWAR, SWAV) ----------

function readSwar(buf) {
  if (buf.toString("ascii", 0, 4) !== "SWAR") throw new Error("not an SWAR");
  const count = buf.readUInt32LE(0x38), out = [];
  for (let i = 0; i < count; i++) {
    const o = buf.readUInt32LE(0x3c + i * 4), end = i + 1 < count ? buf.readUInt32LE(0x40 + i * 4) : buf.length;
    out.push(buf.subarray(o, end));
  }
  return out;
}

// IMA-ADPCM (the DS's: a 4-byte header, the first sample and step index, then
// low nibble first).
const IMA_STEP = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97,
  107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
  1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484,
  7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767];
const IMA_INDEX = [-1, -1, -1, -1, 2, 4, 6, 8];
function decodeAdpcm(data) {
  let pred = data.readInt16LE(0), index = Math.min(88, data[2] & 0x7f);
  const out = new Int16Array((data.length - 4) * 2);
  for (let i = 4, o = 0; i < data.length; i++) {
    for (const nib of [data[i] & 15, data[i] >> 4]) {
      const step = IMA_STEP[index];
      let diff = step >> 3;
      if (nib & 1) diff += step >> 2;
      if (nib & 2) diff += step >> 1;
      if (nib & 4) diff += step;
      pred = nib & 8 ? Math.max(-0x7fff, pred - diff) : Math.min(0x7fff, pred + diff);   // (the DS clamps at -0x7fff)
      index = Math.max(0, Math.min(88, index + IMA_INDEX[nib & 7]));
      out[o++] = pred;
    }
  }
  return out;
}

// A wave: its type (0 PCM8, 1 PCM16, 2 IMA-ADPCM), whether it loops, its
// timer (the rate: 16,756,991 / timer Hz) and loop start / length (in words).
const ARM7_CLOCK = 33513982;
function decodeSwav(e) {
  const type = e[0], loops = !!e[1], timer = e.readUInt16LE(4), loopWords = e.readUInt16LE(6), lenWords = e.readUInt32LE(8);
  const data = e.subarray(12, 12 + (loopWords + lenWords) * 4);
  let pcm, loop;
  if (type === 0) {
    pcm = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) pcm[i] = (data[i] << 24 >> 24) * 256;
    loop = loopWords * 4;
  } else if (type === 1) {
    pcm = new Int16Array(data.length >> 1);
    for (let i = 0; i < pcm.length; i++) pcm[i] = data.readInt16LE(i * 2);
    loop = loopWords * 2;
  } else {
    pcm = decodeAdpcm(data);
    loop = Math.max(0, (loopWords - 1) * 8);   // (the header word holds no samples)
  }
  return { type, rate: ARM7_CLOCK / 2 / timer, timer, loop: loops && loop < pcm.length ? loop : null, pcm };
}

// ---------- Sequences (SSEQ) ----------

function readSseq(buf) {
  if (buf.toString("ascii", 0, 4) !== "SSEQ") throw new Error("not an SSEQ");
  const start = buf.readUInt32LE(0x18);
  return buf.subarray(start);
}

// A sequence played out into each track's timeline: what the track does, tick
// by tick, with its calls, counted loops, transposition, random and variable
// arguments and conditions worked out, up to where it ends or loops (its jump
// back to somewhere it has been, or an endless loop). Returns
//
//   [{ events: [[tick, kind, ...]], loop: index of the event the loop goes back to (or -1), loopTick, end }]
//
// kinds: "note" (key, velocity, length in ticks), "prog" (program), or a
// command byte with its value (0xC0 pan, 0xC1 volume, 0xE1 tempo, ...: the
// SSEQ command, as the player handles it).
const MAX_TICKS = 48 * 4 * 1000;   // (a bar of 4/4 is 192 ticks: a thousand bars is surely stuck)
function decodeSequence(data, seed) {
  const vars = new Int16Array(32).fill(-1);   // (NitroSystem's variables start at -1)
  let rnd = seed || 1;
  const random = (lo, hi) => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return lo + (rnd % (hi - lo + 1)); };
  const tracks = [];
  const starts = [[0, 0]];   // [track number, offset]
  // (Track 0 opens the others first: 0xFE, then 0x93s.)
  for (let i = 0; i < starts.length; i++) tracks.push(decodeTrack(data, starts[i][1], i === 0 ? starts : null, vars, random));
  return tracks;
}
function decodeTrack(data, start, opens, vars, random) {
  let pc = start, tick = 0, transpose = 0, noteWait = true, cond = true;
  const events = [], calls = [], loops = [];
  const seen = new Map();   // where the track has been (pc + calls + loops) -> [tick, event index]
  const u8 = () => data[pc++], s8 = () => (data[pc++] << 24) >> 24;
  const s16 = () => { const v = data.readInt16LE(pc); pc += 2; return v; };
  const u16 = () => { const v = data.readUInt16LE(pc); pc += 2; return v; };
  const u24 = () => { const v = data[pc] | (data[pc + 1] << 8) | (data[pc + 2] << 16); pc += 3; return v; };
  const vlq = () => { let v = 0, b; do { b = data[pc++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
  const where = () => pc + "|" + calls.join(",") + "|" + loops.map((l) => l.pc + ":" + l.left).join(",");
  // The last argument of a command: its own, or random (0xA0) or a variable's (0xA1).
  let argMode = 0;
  const lastArg = (read) => {
    if (argMode === 1) { const lo = s16(), hi = s16(); return random(lo, hi); }
    if (argMode === 2) return vars[u8() & 31];
    return read();
  };
  let loopTo = -1, loopTick = 0;
  for (let steps = 0; pc < data.length && tick < MAX_TICKS && steps < 200000; steps++) {
    if (!argMode && !calls.length) {
      // (Here before, at the top level: a jump back here is the loop.)
      const k = where();
      if (!seen.has(k)) seen.set(k, [tick, events.length]);
    }
    let cmd = u8();
    argMode = 0;
    if (cmd === 0xa0 || cmd === 0xa1) { argMode = cmd === 0xa0 ? 1 : 2; cmd = u8(); }
    if (cmd === 0xa2) { const run = cond; if (!run) skipCommand(); continue; }
    const back = (to) => {   // a jump: back to somewhere the track's been, the loop
      pc = to;
      const k = where(), at = seen.get(k);
      if (at) { loopTo = at[1]; loopTick = at[0]; return true; }
      return false;
    };
    if (cmd < 0x80) {
      const vel = u8(), len = lastArg(vlq);
      events.push([tick, "note", Math.max(0, Math.min(127, cmd + transpose)), vel, len]);
      if (noteWait) tick += len;
    } else if (cmd === 0x80) tick += lastArg(vlq);
    else if (cmd === 0x81) events.push([tick, "prog", lastArg(vlq)]);
    else if (cmd === 0x93) { const n = u8(), o = u24(); if (opens) opens.push([n, o]); }
    else if (cmd === 0x94) { if (back(u24())) break; }
    else if (cmd === 0x95) { const o = u24(); calls.push(pc); pc = o; }
    else if (cmd >= 0xb0 && cmd <= 0xbd) {
      const v = u8() & 31, x = lastArg(s16);
      switch (cmd) {
        case 0xb0: vars[v] = x; break;
        case 0xb1: vars[v] += x; break;
        case 0xb2: vars[v] -= x; break;
        case 0xb3: vars[v] *= x; break;
        case 0xb4: if (x) vars[v] = (vars[v] / x) | 0; break;
        case 0xb5: vars[v] = x >= 0 ? vars[v] << x : vars[v] >> -x; break;
        case 0xb6: vars[v] = x >= 0 ? random(0, x) : -random(0, -x); break;
        case 0xb8: cond = vars[v] === x; break;
        case 0xb9: cond = vars[v] >= x; break;
        case 0xba: cond = vars[v] > x; break;
        case 0xbb: cond = vars[v] <= x; break;
        case 0xbc: cond = vars[v] < x; break;
        case 0xbd: cond = vars[v] !== x; break;
      }
    } else if (cmd >= 0xc0 && cmd <= 0xdf) {
      const x = lastArg(cmd === 0xc3 || cmd === 0xc4 ? s8 : u8);
      if (cmd === 0xc3) transpose = x;
      else if (cmd === 0xc7) noteWait = !!x;   // (1: mono, each note waits; 0: poly)
      else if (cmd === 0xd4) loops.push({ pc, left: x, tick });   // (a loop, x times; 0 for ever)
      else if (cmd !== 0xc6 && cmd !== 0xd6) events.push([tick, cmd, x]);
    } else if (cmd === 0xe0 || cmd === 0xe1 || cmd === 0xe3) {
      events.push([tick, cmd, lastArg(cmd === 0xe1 ? u16 : s16)]);
    } else if (cmd === 0xfc) {
      const l = loops[loops.length - 1];
      if (!l) continue;
      if (l.left === 0) {   // for ever: the track's loop
        if (back(l.pc)) break;
      } else if (--l.left > 0) pc = l.pc;
      else loops.pop();
    } else if (cmd === 0xfd) { if (!calls.length) break; pc = calls.pop(); }
    else if (cmd === 0xfe) u16();
    else if (cmd === 0xff) break;
    else if (cmd === 0xe2) u16();   // (unused here)
    else break;   // (unknown: stop)
  }
  return { events, loop: loopTo, loopTick, end: tick };

  // (0xA2's command, not run: its arguments skipped.)
  function skipCommand() {
    let c = u8(), mode = 0;
    if (c === 0xa0 || c === 0xa1) { mode = c === 0xa0 ? 1 : 2; c = u8(); }
    const last = (n) => { pc += mode === 1 ? 4 : mode === 2 ? 1 : n; };
    if (c < 0x80) { pc++; if (mode) last(0); else vlq(); }
    else if (c === 0x80 || c === 0x81) { if (mode) last(0); else vlq(); }
    else if (c === 0x93) pc += 4;
    else if (c === 0x94 || c === 0x95) pc += 3;
    else if (c >= 0xb0 && c <= 0xbd) { pc++; last(2); }
    else if (c >= 0xc0 && c <= 0xdf) last(1);
    else if (c >= 0xe0 && c <= 0xe3) last(2);
    else if (c === 0xfe) pc += 2;
  }
}

module.exports = { readSdat, readSbnk, readSwar, decodeSwav, readSseq, decodeSequence, ARM7_CLOCK };
