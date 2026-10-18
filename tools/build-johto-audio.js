// Builds Johto's music from HeartGold's own sound archive (pret/pokeheartgold's
// files/data/sound/gs_sound_data.sdat):
//
//   node tools/build-johto-audio.js <path to pokeheartgold>   (or set POKEHEARTGOLD)
//
// Writes:
//
//   assets/audio/johto-music.js  window.JOHTO_MUSIC_DATA: HGSS's songs (its towns,
//                                routes, caves, Gyms, labs and Pokémon Centers, the
//                                bicycle and surfing, its battles, victories, the
//                                trainers' "eyes meet" themes and its jingles), each
//                                track's events as HGSS's sequencer plays them
//                                (tools/lib/sdat.js), with the instrument banks
//                                they use and their waves. game/nds-sound.js plays
//                                them the way the DS's sound player does. Loaded
//                                (with game/nds-sound.js) by ui/audio.js only when
//                                a gs_ song is first wanted.
//   tools/lib/hgss-music.json    each HGSS sequence (SEQ_GS_T_WAKABA) by its song
//                                name here (gs_t_wakaba), for tools/build-johto.js
//                                to give each map its music from its header's
//                                dayMusicId (HGSS's nightMusicId is always the same).
//
// A song is "gs_" + its sequence name without SEQ_GS_ (SEQ_GS_R_1_29 is
// gs_r_1_29), or without SEQ_ for the jingles (SEQ_ME_LVUP is gs_me_lvup).
"use strict";

const fs = require("fs");
const path = require("path");
const { readSdat, readSbnk, readSwar, readSseq, decodeSequence } = require("./lib/sdat");

const pret = process.argv[2] || process.env.POKEHEARTGOLD;
const sdatFile = pret && path.join(pret, "files/data/sound/gs_sound_data.sdat");
if (!sdatFile || !fs.existsSync(sdatFile)) {
  console.error("Usage: node tools/build-johto-audio.js <path to pret/pokeheartgold>  (needs files/data/sound/gs_sound_data.sdat)");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const sdat = readSdat(fs.readFileSync(sdatFile));

// ---------- Which songs ----------

// Every sequence a map header plays, and HGSS's other songs but its title,
// opening and ending, its radio shows, the GB Sounds' versions (_P_) and the
// Pokéwalker's (_PHC), its Pokéathlon, Battle Frontier and Wi-Fi screens; and
// all its jingles (SEQ_ME_*).
const headers = fs.readFileSync(path.join(pret, "src/data/map_headers.h"), "utf8");
const onMaps = new Set([...headers.matchAll(/MusicId = (SEQ_\w+)/g)].map((m) => m[1]));
const SKIP = /_P_|_PHC$|^SEQ_GS_(RADIO_|TITLE|OPENING_|POKEMON_THEME|ENDING|PT_|BF_|BA_BRAIN|WINBRAIN|WIFI|GURUGURU)/;
const wantSeq = (name) => onMaps.has(name) ? /^SEQ_(GS|PL)_/.test(name) : (/^SEQ_GS_/.test(name) && !SKIP.test(name)) || /^SEQ_ME_/.test(name);
const songName = (seq) => "gs_" + seq.replace(/^SEQ_(GS_)?/, "").toLowerCase();

// ---------- Sequences ----------

// Each track's events, flat, with the ticks since the event before:
//   note:  [dt, 0, key, velocity, length]   program: [dt, 1, program]   anything else: [dt, command byte, value]
// and the track's loop (the event it goes back to; -1 if it doesn't loop) and
// end (in ticks). Songs with the same sequence (R_9_03 ... R_17_03, with each
// town's bank) share it.
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
      return { ev, loop: t.loop, loopTick: t.loopTick, end: t.end };
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
    const w = warId + "." + snd.wave;
    if (!waves[w]) {
      // As the archive has it: its type (0 8-bit, 1 16-bit, 2 IMA-ADPCM), its
      // timer (the DS's rate: 16,756,991 / timer Hz), loop start and length in
      // 32-bit words, and the data (game/nds-sound.js decodes it).
      const loopWords = entry.readUInt16LE(6), lenWords = entry.readUInt32LE(8);
      waves[w] = { f: entry[0], loops: entry[1] ? 1 : 0, timer: entry.readUInt16LE(4), loop: loopWords, len: loopWords + lenWords,
        data: entry.subarray(12, 12 + (loopWords + lenWords) * 4).toString("base64") };
    }
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
for (const [id, tracks] of Object.entries(seqs)) sequences[id] = tracks.map((t) => ({ ev: t.ev, loop: t.loop, loopTick: t.loopTick, end: t.end }));
const out = path.join(root, "assets/audio/johto-music.js");
fs.writeFileSync(out,
  "// Auto-generated by tools/build-johto-audio.js from pret/pokeheartgold's sound archive. Do not edit by hand.\n" +
  "window.JOHTO_MUSIC_DATA = " + JSON.stringify({ waves, banks, sequences, songs }) + ";\n");
fs.writeFileSync(path.join(root, "tools/lib/hgss-music.json"), JSON.stringify(table, null, 1) + "\n");

const size = fs.statSync(out).size;
console.log("wrote assets/audio/johto-music.js (" + Object.keys(songs).length + " songs, " + Object.keys(sequences).length + " sequences, " +
  Object.keys(banks).length + " banks, " + Object.keys(waves).length + " waves; " + (size / 1e6).toFixed(1) + " MB) and tools/lib/hgss-music.json");
