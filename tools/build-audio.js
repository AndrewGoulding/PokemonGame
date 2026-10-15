// Builds the game's music and cries from pret/pokefirered's sound data:
//
//   node tools/build-audio.js <path to pokefirered>   (or set POKEFIRERED)
//
// It needs sound/ (the songs' MIDI files and midi.cfg, the voicegroups, key
// split tables and samples) checked out. Writes:
//
//   assets/audio/music.js      window.MUSIC_DATA: every song (mus_*.mid, and the
//                              few sound effects in SOUND_EFFECTS, as
//                              note and controller events per track, with its
//                              tempo changes, loop and settings from midi.cfg)
//                              and the instruments they play (FireRed's
//                              voicegroups, with the samples and programmable
//                              waves they use). game/m4a.js plays it the way
//                              FireRed's sound engine does. Loaded only once the
//                              game wants sound (ui/audio.js).
//   assets/audio/cries/<n>.wav each Pokémon's cry, by National Dex number (the
//                              first 386; FireRed has no others)
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const pret = process.argv[2] || process.env.POKEFIRERED;
if (!pret || !fs.existsSync(path.join(pret, "sound/voice_groups.inc"))) {
  console.error("Usage: node tools/build-audio.js <path to pret/pokefirered>  (needs sound/ checked out)");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const S = (...p) => path.join(pret, "sound", ...p);
const outDir = path.join(root, "assets/audio");
fs.mkdirSync(path.join(outDir, "cries"), { recursive: true });

// ---------- WAV samples ----------

// FireRed's samples are 8-bit unsigned mono WAVs. "smpl" has the loop start;
// "agbp" is the pitch the game uses (the rate at key 60, x1024) and "agbl" the
// length it plays (wav2agb's chunks).
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
  // To signed 8-bit.
  const signed = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) signed[i] = (data[i] - 128) & 255;
  return { rate: Math.round(rate * 1000) / 1000, loop, data: signed };
}

// ---------- Instruments ----------

const labelFile = {};   // DirectSoundWaveData_x -> sound/direct_sound_samples/x.wav
for (const m of fs.readFileSync(S("direct_sound_data.inc"), "utf8").matchAll(/^(\w+)::[^\n]*\n\s*\.incbin "sound\/(.+?)\.bin"/gm)) {
  labelFile[m[1]] = path.join(pret, "sound", m[2] + ".wav");
}
const waveFile = {};    // ProgrammableWaveData_n -> .pcm
for (const m of fs.readFileSync(S("programmable_wave_data.inc"), "utf8").matchAll(/^(\w+)::[^\n]*\n\s*\.incbin "sound\/(.+?\.pcm)"/gm)) {
  waveFile[m[1]] = path.join(pret, "sound", m[2]);
}

// Key split tables: ".set KeySplitTableN, . - start" then a byte per key.
const keysplits = {};
{
  let current = null, key = 0;
  for (const line of fs.readFileSync(S("keysplit_tables.inc"), "utf8").split("\n")) {
    const set = /^\.set (\w+), \. - (\d+)/.exec(line);
    if (set) { current = keysplits[set[1]] = new Array(128).fill(0); key = +set[2]; continue; }
    const b = /^\s*\.byte (\d+)/.exec(line);
    if (b && current) current[key++] = +b[1];
  }
}

// Voicegroups: 128 voices each (some are shorter and run into the next).
const groups = {};
{
  let current = null, order = [];
  for (const line of fs.readFileSync(S("voice_groups.inc"), "utf8").split("\n")) {
    const label = /^(\w+)::/.exec(line);
    if (label) { current = groups[label[1]] = []; order.push(label[1]); continue; }
    const v = /^\s*(voice_\w+)\s+(.*?)\s*(@.*)?$/.exec(line);
    if (v && current) current.push([v[1], v[2].split(",").map((s) => s.trim())]);
  }
  // A voicegroup shorter than 128 continues into the next one (as in the ROM).
  for (let i = 0; i < order.length; i++) {
    const g = groups[order[i]];
    for (let j = i + 1; g.length < 128 && j < order.length; j++) g.push(...groups[order[j]]);
  }
}

const samples = {}, waves = {};
const num = (s) => (/^0x/i.test(s) ? parseInt(s, 16) : +s);
function voice([macro, a]) {
  const type = macro.replace(/^voice_/, "");
  if (type === "keysplit") return { t: "split", g: useGroup(a[0]), table: keysplits[a[1]] };
  if (type === "keysplit_all") return { t: "drums", g: useGroup(a[0]) };
  const flags = { fix: /no_resample/.test(type), rev: /reverse/.test(type) };
  if (/^directsound/.test(type)) {
    const name = a[2].replace(/^DirectSoundWaveData_/, "");
    if (!samples[name]) {
      if (!labelFile[a[2]]) throw new Error("no sample file for " + a[2]);
      const w = readWav(labelFile[a[2]]);
      samples[name] = { rate: w.rate, loop: w.loop, data: w.data.toString("base64") };
    }
    return Object.assign({ t: "ds", key: num(a[0]), pan: num(a[1]), s: name, a: num(a[3]), d: num(a[4]), su: num(a[5]), r: num(a[6]) }, flags.fix ? { fix: 1 } : {}, flags.rev ? { rev: 1 } : {});
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
const usedGroups = {};
function useGroup(label) {
  if (!(label in usedGroups)) {
    usedGroups[label] = null;   // (being built: groups don't nest back)
    usedGroups[label] = groups[label].slice(0, 128).map(voice);
  }
  return label;
}

// ---------- Songs ----------

// A MIDI file: tracks of [tick, kind, a, b] (kind: n note on (a key, b
// velocity, c length in ticks), p program, c controller, b bend), tempo
// changes [tick, microseconds per beat], and the loop from "[" / "]" markers.
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

// midi.cfg: "mus_pallet.mid: -E -R50 -G159 -V100"
const cfg = {};
for (const line of fs.readFileSync(S("songs/midi/midi.cfg"), "utf8").split("\n")) {
  const m = /^(\w+)\.mid:\s*(.*)$/.exec(line);
  if (!m) continue;
  const opt = (flag) => { const o = new RegExp("-" + flag + "(\\S+)").exec(m[2]); return o ? o[1] : null; };
  cfg[m[1]] = { group: opt("G"), vol: +(opt("V") || 127), reverb: +(opt("R") || 0), exact: /-E\b/.test(m[2]) };
}

// The sound effects the game plays (se_*.mid): the menus' select sound, the
// Poké Balls (the healing machine, throwing, a Pokémon going in or coming out,
// bouncing and shaking), hits by how effective they are, fainting, running,
// Exp., stat changes, elevators, doors and warp pads, and every move sound FireRed has (se_m_*).
const SOUND_EFFECTS = ["se_ball", "se_select", "se_ball_throw", "se_ball_trade", "se_ball_bounce_1", "se_ball_bounce_2",
  "se_ball_bounce_3", "se_ball_bounce_4", "se_effective", "se_super_effective", "se_not_effective", "se_faint", "se_flee",
  "se_exp", "se_ball_tray_enter", "se_ball_tray_ball", "se_ball_tray_exit", "se_bag_cursor", "se_bag_pocket",
  "se_pc_on", "se_pc_login", "se_pc_off", "se_failure", "se_win_open", "se_exp_max", "se_shop", "se_shiny", "se_pin", "se_unlock",
  "se_elevator", "se_ding_dong", "se_exit", "se_door", "se_warp_in", "se_warp_out", "se_fall", "se_boo",
  "se_rs_door", "se_save", "se_applause", "se_ship", "se_ice_crack", "se_ice_break", "se_rs_shop"];
const isSoundEffect = (name) => SOUND_EFFECTS.includes(name) || /^se_m_/.test(name);

// Flat per-track event lists to keep the file small: [tick, kind, a, b, c] ...
const songs = {};
for (const [name, c] of Object.entries(cfg)) {
  if (!/^mus_/.test(name) && !isSoundEffect(name)) continue;
  const file = S("songs/midi", name + ".mid");
  if (!fs.existsSync(file)) continue;
  const label = "voicegroup" + String(c.group).padStart(3, "0");
  if (!groups[label]) { console.warn("no " + label + " for " + name); continue; }
  const mid = readMidi(file);
  songs[name] = {
    group: useGroup(label), vol: c.vol, reverb: c.reverb, division: mid.division,
    tempos: mid.tempos.length ? mid.tempos : [[0, 500000]], loop: mid.loop, end: mid.end,
    tracks: mid.tracks.map((evs) => evs.flatMap((e) => (e[1] === "n" ? [e[0], 0, e[2], e[3], e[4]] : e[1] === "p" ? [e[0], 1, e[2]] : e[1] === "c" ? [e[0], 2, e[2], e[3]] : [e[0], 3, e[2]])))
  };
}

const bank = { samples, waves, groups: usedGroups };
fs.writeFileSync(path.join(outDir, "music.js"),
  "// Auto-generated by tools/build-audio.js from pret/pokefirered. Do not edit by hand.\n" +
  "window.MUSIC_DATA = " + JSON.stringify({ bank, songs }) + ";\n");

// ---------- Cries ----------

global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, "data/dex.js"), "utf8"));
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const dexByID = {};
for (const [k, d] of Object.entries(window.DEX)) if (d.id <= 386 && !dexByID[toID(k)]) dexByID[toID(k)] = d.id;
// (and by species name without a form: "Deoxys-Normal" is deoxys.wav)
for (const [k, d] of Object.entries(window.DEX)) if (d.id <= 386 && !dexByID[toID(k.split("-")[0])]) dexByID[toID(k.split("-")[0])] = d.id;
let cries = 0;
for (const f of fs.readdirSync(S("direct_sound_samples/cries"))) {
  const id = dexByID[toID(f.replace(/\.wav$/, ""))];
  if (!id) continue;
  fs.copyFileSync(S("direct_sound_samples/cries", f), path.join(outDir, "cries", id + ".wav"));
  cries++;
}

const size = fs.statSync(path.join(outDir, "music.js")).size;
console.log("wrote assets/audio/music.js (" + Object.keys(songs).length + " songs, " + Object.keys(usedGroups).length +
  " voicegroups, " + Object.keys(samples).length + " samples; " + (size / 1e6).toFixed(1) + " MB) and " + cries + " cries");
