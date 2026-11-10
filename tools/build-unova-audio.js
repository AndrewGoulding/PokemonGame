// Import original Black/White SDAT music for Unova; source checkout is read-only.
"use strict";

const fs = require("fs");
const path = require("path");
const { readSdat, readSbnk, readSwar, readSseq, decodeSequence } = require("./lib/sdat");

const pret = process.argv[2] || process.env.POKEBLACK;
const sdatFile = pret && path.join(pret, "files/wb_sound_data.sdat");
if (!sdatFile || !fs.existsSync(sdatFile)) {
  console.error("Usage: node tools/build-unova-audio.js <path to squiddonaut/pokeblack>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const sdat = readSdat(fs.readFileSync(sdatFile));

// The archive supplies BW1's shared regional themes, seasonal arrangements,
// battles and jingles. BW2-exclusive songs need their own source archive.
const wantSeq=name=>/^SEQ_(?:BGM|ME)_/.test(name)&&!/^SEQ_BGM_(?:DUMMY|SILENCE|OPENING_TITLE)/.test(name)&&!/_END$/.test(name);
const songName=seq=>'bw_'+seq.replace(/^SEQ_/,'').toLowerCase();

// ---------- Sequences ----------

// Each track's events, flat, with the ticks since the event before:
//   note:  [dt, 0, key, velocity, length]   program: [dt, 1, program]   anything else: [dt, command byte, value]
// and the track's loop (the event it goes back to; -1 if it doesn't loop) and
// end (in ticks). Songs sharing a sequence retain their own bank and volume.
const seqs = {}, songs = {}, table = {};
const usedPrograms = {};   // bank -> Set of programs its songs play
for (const q of sdat.seqs) {
  if (!q || !q.name || !wantSeq(q.name)) continue;
  const name = songName(q.name);
  if (!seqs[q.fileId]) {
    const tracks = decodeSequence(readSseq(sdat.file(q.fileId)), q.fileId);
    seqs[q.fileId] = tracks.map((t) => {
      const ev = [];
      let last = 0;
      for (const e of t.events) {
        const dt = e[0] - last;
        last = e[0];
        if (e[1] === "note") ev.push(dt, 0, e[2], e[3], e[4]);
        else if (e[1] === "prog") ev.push(dt, 1, e[2]);
        else ev.push(dt, e[1], e[2]);
      }
      return { id: t.id, ev, loop: t.loop, loopTick: t.loopTick, end: t.end };
    });
  }
  const tracks = seqs[q.fileId];
  // The song's loop: from where every looping track has begun its loop, one
  // time round (they all go round together).
  const looping = tracks.filter((t) => t.loop >= 0);
  let loop = null;
  if (looping.length) {
    const len = Math.max(...looping.map((t) => t.end - t.loopTick)), from = Math.max(...looping.map((t) => t.loopTick));
    if (looping.some((t) => t.end - t.loopTick !== len)) console.warn(name + ": its tracks loop at different lengths");
    loop = [from, from + len];
  }
  songs[name] = { seq: String(q.fileId), bank: String(q.bank), vol: q.vol, loop, end: Math.max(...tracks.map((t) => t.end)) };
  table[q.name] = name;
  const progs = usedPrograms[q.bank] || (usedPrograms[q.bank] = new Set());
  for (const t of tracks) for (let i = 0; i < t.ev.length; i += t.ev[i + 1] === 0 ? 5 : 3) if (t.ev[i + 1] === 1) progs.add(t.ev[i + 2]);
  // (A track that never sets its program plays program 0.)
  progs.add(0);
}

// ---------- Banks and waves ----------

// The instruments the songs play, from each bank (SBNK): a sound is
//   { t: "pcm", w: wave, key, a, d, s, r, pan }   (w: "<wave archive>.<n>")
//   { t: "psg", duty, key, a, d, s, r, pan }  or  { t: "noise", key, a, d, s, r, pan }
// an instrument one of those, or { t: "split", regions: [sound + top key] }
// or { t: "drums", lo, regions: [sound per key from lo] }.
const banks = {}, waves = {}, warCache = {};
const war = (id) => warCache[id] || (warCache[id] = readSwar(sdat.file(sdat.wars[id].fileId)));
for (const [bankId, progs] of Object.entries(usedPrograms)) {
  const b = sdat.banks[bankId], insts = readSbnk(sdat.file(b.fileId));
  const conv = (snd) => {
    if (!snd) return null;
    const env = { key: snd.key, a: snd.a, d: snd.d, s: snd.s, r: snd.r, pan: snd.pan };
    if (snd.t === "psg") return Object.assign({ t: "psg", duty: snd.wave & 7 }, env);
    if (snd.t === "noise") return Object.assign({ t: "noise" }, env);
    const warId = b.wars[snd.war];
    const entry = warId >= 0 && war(warId)[snd.wave];
    if (!entry) return null;
    // BW repeats identical samples in separate per-song archives. Deduplicate
    // playback-identical wave data while retaining each instrument's envelope.
    const loopWords=entry.readUInt16LE(6),lenWords=entry.readUInt32LE(8),wave={f:entry[0],loops:entry[1]?1:0,timer:entry.readUInt16LE(4),loop:loopWords,len:loopWords+lenWords,data:entry.subarray(12,12+(loopWords+lenWords)*4).toString('base64')};
    const w='bw_'+require('crypto').createHash('sha256').update(JSON.stringify(wave)).digest('hex').slice(0,24);
    if(!waves[w])waves[w]=wave;
    return Object.assign({ t: "pcm", w }, env);
  };
  banks[bankId] = insts.map((inst, prog) => {
    if (!inst || !progs.has(prog)) return null;
    if (inst.t === "split") return { t: "split", regions: inst.regions.map((r) => Object.assign({ top: r.top }, conv(r))) };
    if (inst.t === "drums") return { t: "drums", lo: inst.lo, regions: inst.regions.map(conv) };
    return conv(inst);
  });
}

// ---------- Out ----------

const sequences = {};
for (const [id, tracks] of Object.entries(seqs)) sequences[id] = tracks.map((t) => ({ id: t.id, ev: t.ev, loop: t.loop, loopTick: t.loopTick, end: t.end }));
const out = path.join(root, "assets/audio/unova-music.js");
fs.writeFileSync(out,
  "// Auto-generated by tools/build-unova-audio.js from squiddonaut/pokeblack's sound archive. Do not edit by hand.\n" +
  "window.UNOVA_MUSIC_DATA = " + JSON.stringify({ waves, banks, sequences, songs, source:{repository:'https://github.com/squiddonaut/pokeblack',commit:require('child_process').execFileSync('git',['-C',pret,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),archive:'files/wb_sound_data.sdat',sha256:require('crypto').createHash('sha256').update(fs.readFileSync(sdatFile)).digest('hex'),scope:'Original Black/White shared music; no BW2-exclusive archive'}}) + ";\n");
fs.writeFileSync(path.join(root, "tools/lib/unova-music.json"), JSON.stringify(table, null, 1) + "\n");

const size = fs.statSync(out).size;
console.log("wrote assets/audio/unova-music.js (" + Object.keys(songs).length + " songs, " + Object.keys(sequences).length + " sequences, " +
  Object.keys(banks).length + " banks, " + Object.keys(waves).length + " waves; " + (size / 1e6).toFixed(1) + " MB) and tools/lib/unova-music.json");
