// Builds Hoenn's music from Pokémon Emerald's sound data (a pret/pokeemerald checkout):
//
//   node tools/build-hoenn-audio.js <path to pret/pokeemerald>   (or set POKEEMERALD)
//
// It needs sound/ checked out (the songs' MIDI files and midi.cfg, the voicegroups, key
// split tables and samples). Emerald's songs are played as FireRed's are, by the same
// sound engine (game/m4a.js), but with their own instruments, so they're a file of their
// own, loaded the first time Hoenn's music is wanted (ui/audio.js):
//
//   assets/audio/hoenn-music.js   window.HOENN_MUSIC_DATA: { bank, songs }, the songs named em_<name>
//                                 (Emerald's mus_<name>; FireRed's own, mus_rg_*, the Battle Frontier's,
//                                 the contests' and the link rooms' aren't in it)
"use strict";

const fs = require("fs");
const path = require("path");

const EM = process.argv.slice(2).find((a) => !a.startsWith("--")) || process.env.POKEEMERALD;
if (!EM || !fs.existsSync(path.join(EM, "sound/voice_groups.inc"))) {
  console.error("Usage: node tools/build-hoenn-audio.js <path to pret/pokeemerald>  (needs sound/ checked out)");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const S = (...p) => path.join(EM, "sound", ...p);

// ---------- WAV samples ----------

// Emerald's samples, as FireRed's (tools/build-audio.js): 8-bit unsigned mono WAVs; "smpl" has the
// loop start, "agbp" the pitch (the rate at key 60, x1024) and "agbl" the length it plays.
function readWav(file) {
  const d = fs.readFileSync(file);
  let rate = 0, data = null, loop = null, agbp = 0, agbl = 0;
  for (let i = 12; i + 8 <= d.length;) {
    const id = d.toString("ascii", i, i + 4), len = d.readUInt32LE(i + 4), body = d.subarray(i + 8, i + 8 + len);
    if (id === "fmt ") rate = body.readUInt32LE(4);
    if (id === "smpl" && body.readUInt32LE(28) > 0 && body.length >= 60) loop = body.readUInt32LE(44);
    if (id === "agbp") agbp = body.readUInt32LE(0);
    if (id === "agbl") agbl = body.readUInt32LE(0);
    if (id === "data") data = Buffer.from(body);
    i += 8 + len + (len & 1);
  }
  if (agbp) rate = agbp / 1024;
  if (agbl && agbl < data.length) data = data.subarray(0, agbl);
  const signed = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) signed[i] = (data[i] - 128) & 255;
  return { rate: Math.round(rate * 1000) / 1000, loop, data: signed };
}

// ---------- Instruments ----------

const labelFile = {};   // DirectSoundWaveData_x -> sound/direct_sound_samples/x.wav
for (const m of fs.readFileSync(S("direct_sound_data.inc"), "utf8").matchAll(/^(\w+)::[^\n]*\n\s*\.incbin "sound\/(.+?)\.bin"/gm)) labelFile[m[1]] = S(m[2].replace(/^\//, "") + ".wav");
const waveFile = {};    // ProgrammableWaveData_n -> .pcm
for (const m of fs.readFileSync(S("programmable_wave_data.inc"), "utf8").matchAll(/^(\w+)::[^\n]*\n\s*\.incbin "sound\/(.+?\.pcm)"/gm)) waveFile[m[1]] = S(m[2]);

// Every .inc under sound/voicegroups: "voice_group name[, first key]" and "keysplit name[, first key]"
// with "split voice, last key" lines.
const incFiles = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.inc$/.test(f)) incFiles.push(p); } })(S("voicegroups"));
incFiles.push(S("keysplit_tables.inc"));
const groups = {}, keysplits = {};
for (const file of incFiles) {
  let group = null, split = null, last = 0;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.replace(/@.*$/, "").trim();
    let m;
    if ((m = /^voice_group\s+(\w+)(?:,\s*(\d+))?/.exec(line))) {
      // (A group that starts at a key, a drum kit: its first voice is that key's.)
      group = groups[m[1]] = new Array(m[2] ? +m[2] : 0).fill(null); split = null; continue;
    }
    if ((m = /^keysplit\s+(\w+)(?:,\s*(\d+))?/.exec(line))) {
      split = keysplits[m[1]] = new Array(128).fill(0); last = m[2] ? +m[2] : 0; group = null; continue;
    }
    if (split && (m = /^split\s+(\d+),\s*(\d+)/.exec(line))) { for (let k = last; k < +m[2]; k++) split[k] = +m[1]; last = +m[2]; continue; }
    if (group && (m = /^(voice_\w+|cry\w*)\s*(.*)$/.exec(line))) group.push([m[1], m[2].split(",").map((s) => s.trim())]);
  }
}
// (A keysplit's keys past its last split are its last voice's.)
for (const t of Object.values(keysplits)) { let end = 127; while (end > 0 && t[end] === 0) end--; for (let k = end; k < 128; k++) if (t[k] === 0 && end > 0) t[k] = t[end]; }

const samples = {}, waves = {}, usedGroups = {};
const num = (s) => (/^0x/i.test(s) ? parseInt(s, 16) : +s);
function voice([macro, a]) {
  const type = macro.replace(/^voice_/, "");
  if (type === "keysplit") return { t: "split", g: useGroup(a[0].replace(/^voicegroup_/, "")), table: keysplits[a[1].replace(/^keysplit_/, "")] };
  if (type === "keysplit_all") return { t: "drums", g: useGroup(a[0].replace(/^voicegroup_/, "")) };
  if (/^directsound/.test(type)) {
    const name = a[2].replace(/^DirectSoundWaveData_/, "");
    if (!samples[name]) {
      if (!labelFile[a[2]]) throw new Error("no sample file for " + a[2]);
      const w = readWav(labelFile[a[2]]);
      samples[name] = { rate: w.rate, loop: w.loop, data: w.data.toString("base64") };
    }
    return Object.assign({ t: "ds", key: num(a[0]), pan: num(a[1]), s: name, a: num(a[3]), d: num(a[4]), su: num(a[5]), r: num(a[6]) },
      /no_resample/.test(type) ? { fix: 1 } : {}, /reverse/.test(type) ? { rev: 1 } : {});
  }
  if (/^square_1/.test(type)) return { t: "sq1", key: num(a[0]), pan: num(a[1]), sweep: num(a[2]), duty: num(a[3]) & 3, a: num(a[4]) & 7, d: num(a[5]) & 7, su: num(a[6]) & 15, r: num(a[7]) & 7 };
  if (/^square_2/.test(type)) return { t: "sq2", key: num(a[0]), pan: num(a[1]), duty: num(a[2]) & 3, a: num(a[3]) & 7, d: num(a[4]) & 7, su: num(a[5]) & 15, r: num(a[6]) & 7 };
  if (/^programmable_wave/.test(type)) {
    const name = a[2].replace(/^ProgrammableWaveData_/, "");
    if (!waves[name]) waves[name] = fs.readFileSync(waveFile[a[2]]).toString("base64");
    return { t: "wave", key: num(a[0]), pan: num(a[1]), w: name, a: num(a[3]) & 7, d: num(a[4]) & 7, su: num(a[5]) & 15, r: num(a[6]) & 7 };
  }
  if (/^noise/.test(type)) return { t: "noise", key: num(a[0]), pan: num(a[1]), period: num(a[2]) & 1, a: num(a[3]) & 7, d: num(a[4]) & 7, su: num(a[5]) & 15, r: num(a[6]) & 7 };
  return null;
}
function useGroup(label) {
  if (!(label in usedGroups)) {
    if (!groups[label]) throw new Error("no voicegroup " + label);
    usedGroups[label] = null;   // (being built: groups don't nest back)
    usedGroups[label] = groups[label].slice(0, 128).map((v) => (v ? voice(v) : null));
  }
  return label;
}

// ---------- Songs ----------

// A MIDI file: tracks of [tick, kind, a, b, c] (n note on: key, velocity, length in ticks; p program;
// c controller; b bend), tempo changes, and the loop from "[" / "]" markers (tools/build-audio.js's).
function readMidi(file) {
  const d = fs.readFileSync(file);
  const division = d.readUInt16BE(12);
  let pos = 14;
  const tracks = [], tempos = [];
  let loop = null, loopStart = null, end = 0;
  while (pos < d.length) {
    const id = d.toString("ascii", pos, pos + 4), len = d.readUInt32BE(pos + 4);
    let i = pos + 8;
    const stop = i + len;
    pos = stop;
    if (id !== "MTrk") continue;
    const events = [], open = {};
    let tick = 0, status = 0;
    const vlq = () => { let v = 0, b; do { b = d[i++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
    while (i < stop) {
      tick += vlq();
      let st = d[i];
      if (st & 0x80) { status = st; i++; } else st = status;
      const kind = st & 0xf0;
      if (st === 0xff) {
        const type = d[i++], l = vlq(), body = d.subarray(i, i + l);
        i += l;
        if (type === 0x51) tempos.push([tick, body.readUIntBE(0, 3)]);
        if (type === 0x06 || type === 0x01) {
          const text = body.toString("latin1");
          if (text === "[") loopStart = tick;
          if (text === "]" && loopStart != null) loop = [loopStart, tick];
        }
        if (type === 0x2f) break;
      } else if (st === 0xf0 || st === 0xf7) {
        i += vlq();
      } else if (kind === 0x90 || kind === 0x80) {
        const key = d[i++], vel = d[i++];
        const k = (st & 15) * 128 + key;
        if (kind === 0x90 && vel > 0) {
          const ev = [tick, "n", key, vel, 0];
          if (open[k]) open[k].push(ev); else open[k] = [ev];
          events.push(ev);
        } else if (open[k] && open[k].length) {
          const ev = open[k].shift();
          ev[4] = tick - ev[0];
        }
      } else if (kind === 0xb0) { events.push([tick, "c", d[i++], d[i++]]); }
      else if (kind === 0xc0) { events.push([tick, "p", d[i++]]); }
      else if (kind === 0xe0) { const lsb = d[i++], msb = d[i++]; events.push([tick, "b", msb]); }
      else if (kind === 0xa0) i += 2;
      else if (kind === 0xd0) i += 1;
    }
    end = Math.max(end, tick);
    if (events.length) tracks.push(events);
  }
  return { division, tracks, tempos, loop, end };
}

// midi.cfg: "mus_littleroot.mid:   -E -R50 -G_littleroot -V100" (the voicegroup is voicegroup_littleroot).
const cfg = {};
for (const line of fs.readFileSync(S("songs/midi/midi.cfg"), "utf8").split("\n")) {
  const m = /^(\w+)\.mid:\s*(.*)$/.exec(line);
  if (!m) continue;
  const opt = (flag) => { const o = new RegExp("-" + flag + "(\\S+)").exec(m[2]); return o ? o[1] : null; };
  cfg[m[1]] = { group: (opt("G") || "").replace(/^_/, ""), vol: +(opt("V") || 127), reverb: +(opt("R") || 0) };
}

const songs = {};
for (const [name, c] of Object.entries(cfg)) {
  if (!/^mus_/.test(name) || /^mus_(rg_|b_|link_|contest|c_|dummy|gsc_|intro_battle|rg)/.test(name)) continue;
  const file = S("songs/midi", name + ".mid");
  if (!fs.existsSync(file) || !groups[c.group]) { if (fs.existsSync(file)) console.warn("no voicegroup " + c.group + " for " + name); continue; }
  const mid = readMidi(file);
  songs["em_" + name.replace(/^mus_/, "")] = {
    group: useGroup(c.group), vol: c.vol, reverb: c.reverb, division: mid.division,
    tempos: mid.tempos.length ? mid.tempos : [[0, 500000]], loop: mid.loop, end: mid.end,
    tracks: mid.tracks.map((evs) => evs.flatMap((e) => (e[1] === "n" ? [e[0], 0, e[2], e[3], e[4]] : e[1] === "p" ? [e[0], 1, e[2]] : e[1] === "c" ? [e[0], 2, e[2], e[3]] : [e[0], 3, e[2]])))
  };
}

const bank = { samples, waves, groups: usedGroups };
fs.writeFileSync(path.join(root, "assets/audio/hoenn-music.js"),
  "// Auto-generated by tools/build-hoenn-audio.js from pret/pokeemerald. Do not edit by hand.\n" +
  "window.HOENN_MUSIC_DATA = " + JSON.stringify({ bank, songs }) + ";\n");
const size = fs.statSync(path.join(root, "assets/audio/hoenn-music.js")).size;
console.log("wrote assets/audio/hoenn-music.js (" + Object.keys(songs).length + " songs, " + Object.keys(usedGroups).length + " voicegroups, " + Object.keys(samples).length + " samples; " + (size / 1e6).toFixed(1) + " MB)");
