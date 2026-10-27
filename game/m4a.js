// FireRed's sound engine (the "m4a" / MusicPlayer2000 engine, as in pret's
// src/m4a.c and src/m4a_1.s), rendering a song from assets/audio/music.js
// (tools/build-audio.js) into PCM:
//
//   const out = M4A.render(MUSIC_DATA.songs.mus_pallet, MUSIC_DATA.bank);
//   // { rate, left, right (Float32Array, -1..1), loopStart, loopEnd (in samples; null if it doesn't loop) }
//
// Like the GBA: 13,379 Hz output, everything stepped once a frame (59.73 Hz):
// the sequencer, envelopes and vibrato. Up to 5 sample ("direct sound")
// channels and the 4 Game Boy channels (two squares, the programmable wave and
// noise), mixed in 8-bit with FireRed's reverb (master volume 12 of 15).
//
// A song that loops is rendered with its loop body twice; loopStart..loopEnd
// is the second time through, so playing that span over and over is seamless
// (notes and echoes from the end run on into the start).
(function () {
  const RATE = 13379;
  const FPS = 59.7275;
  const PER_FRAME = 224;                 // samples per frame at 13,379 Hz
  const MAX_DS = 5, MASTER = 12;         // FireRed's m4aSoundMode
  const CGB_AMP = 24;                    // a Game Boy channel at full volume, in 8-bit sample units

  // ---------- Data ----------

  function decodeB64(s) {
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(s, "base64"));
    const bin = atob(s), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function prepare(bank) {
    if (bank._ready) return;
    for (const s of Object.values(bank.samples)) s.pcm = new Int8Array(decodeB64(s.data).buffer);
    bank._waves = {};
    for (const [k, b64] of Object.entries(bank.waves)) {
      const bytes = decodeB64(b64), w = new Float32Array(32);
      for (let i = 0; i < 16; i++) { w[i * 2] = (bytes[i] >> 4) - 7.5; w[i * 2 + 1] = (bytes[i] & 15) - 7.5; }
      bank._waves[k] = w.map((v) => v / 7.5);
    }
    bank._ready = true;
  }

  // ---------- Pitch ----------

  // Game Boy channels' frequency register for a key (MidiKeyToCgbFreq).
  const CGB_SCALE = []; for (let o = 0; o <= 10; o++) for (let n = 0; n < 12; n++) CGB_SCALE.push((o << 4) | n);
  const CGB_FREQ = [-2004, -1891, -1785, -1685, -1591, -1501, -1417, -1337, -1262, -1192, -1125, -1062];
  const NOISE = [0xD7, 0xD6, 0xD5, 0xD4, 0xC7, 0xC6, 0xC5, 0xC4, 0xB7, 0xB6, 0xB5, 0xB4, 0xA7, 0xA6, 0xA5, 0xA4,
    0x97, 0x96, 0x95, 0x94, 0x87, 0x86, 0x85, 0x84, 0x77, 0x76, 0x75, 0x74, 0x67, 0x66, 0x65, 0x64, 0x57, 0x56, 0x55, 0x54,
    0x47, 0x46, 0x45, 0x44, 0x37, 0x36, 0x35, 0x34, 0x27, 0x26, 0x25, 0x24, 0x17, 0x16, 0x15, 0x14, 0x07, 0x06, 0x05, 0x04,
    0x03, 0x02, 0x01, 0x00];
  function cgbReg(key, fine) {
    if (key <= 35) { key = 0; fine = 0; } else { key -= 36; if (key > 130) { key = 130; fine = 255; } }
    const f = (k) => { const v = CGB_SCALE[Math.min(k, CGB_SCALE.length - 1)]; return CGB_FREQ[v & 15] >> (v >> 4); };
    const a = f(key), b = f(key + 1);
    return a + ((fine * (b - a)) >> 8) + 2048;
  }
  // Tone channels (squares: 131072 / (2048 - x) Hz; the wave channel, 32 steps a cycle: 65536 / (2048 - x)).
  function cgbHz(type, key, fine) {
    const x = cgbReg(key, fine) & 2047;
    return (type === "wave" ? 65536 : 131072) / Math.max(1, 2048 - x);
  }
  // Noise: the LFSR's clock (NR43: shift s, divider r).
  function noiseHz(key) {
    const v = NOISE[key <= 20 ? 0 : Math.min(59, key - 21)];
    const s = v >> 4, r = v & 7;
    return 524288 / (r ? r : 0.5) / Math.pow(2, s + 1);
  }

  // ---------- Rendering ----------

  function render(song, bank, opts) {
    opts = opts || {};
    prepare(bank);
    const groups = bank.groups;
    const ticksPerFrame = (usPerBeat) => (song.division * 1e6 / usPerBeat) / FPS;

    // Tracks.
    const tracks = song.tracks.map((flat) => {
      const ev = [];
      for (let i = 0; i < flat.length;) {
        const t = flat[i], k = flat[i + 1];
        if (k === 0) { ev.push([t, 0, flat[i + 2], flat[i + 3], flat[i + 4]]); i += 5; }
        else if (k === 2) { ev.push([t, 2, flat[i + 2], flat[i + 3]]); i += 4; }
        else { ev.push([t, k, flat[i + 2]]); i += 3; }
      }
      return { ev, i: 0, voice: 0, vol: 127, volSet: false, pan: 0, bend: 0, bendRange: 2, tune: 0,
        mod: 0, modT: 0, modM: 0, lfoSpeed: 22, lfoSpeedC: 0, lfoDelay: 0, lfoDelayC: 0 };
    });
    // A track with no volume before its first note gets full volume (mid2agb).
    for (const tr of tracks) {
      const firstNote = tr.ev.findIndex((e) => e[1] === 0);
      const firstVol = tr.ev.findIndex((e) => e[1] === 2 && e[2] === 7);
      if (firstVol < 0 || (firstNote >= 0 && firstVol > firstNote)) tr.vol = Math.floor(127 * song.vol / 127);
    }
    const tempos = song.tempos.slice().sort((a, b) => a[0] - b[0]);
    const loop = song.loop && song.loop[1] > song.loop[0] ? song.loop : null;

    const ds = [];            // sample channels
    const cgb = [null, null, null, null];   // square 1, square 2, wave, noise
    const L = [], R = [];     // output frames (Float32Array chunks)
    let outLen = 0;
    let ring = [];            // last 7 frames of output, for reverb: [L, R]
    const reverb = song.reverb || 0;

    // Track volume and pitch (TrkVolPitSet).
    function trackMix(tr) {
      let x = tr.vol * 2;
      if (tr.modT === 1) x = (x * (tr.modM + 128)) >> 7;
      let y = 2 * tr.pan;
      if (tr.modT === 2) y += tr.modM;
      y = Math.max(-128, Math.min(127, y));
      const p = (tr.tune + tr.bend * tr.bendRange) * 4 + (tr.modT === 0 ? 16 * tr.modM : 0);
      return { volR: ((y + 128) * x) >> 8, volL: ((127 - y) * x) >> 8, pitch: p };   // pitch: 1/256 semitone
    }
    function chanVolume(c, mix) {
      const rp = c.rhythmPan || 0;
      c.right = Math.min(255, (c.velocity * (128 + rp) * mix.volR) >> 14);
      c.left = Math.min(255, (c.velocity * (127 - rp) * mix.volL) >> 14);
    }

    function noteOn(tr, key, velocity, dur) {
      let v = groups[song.group][tr.voice];
      if (!v) return;
      let playKey = key, rhythmPan = 0;
      if (v.t === "split") { v = groups[v.g][v.table[key]]; }
      else if (v.t === "drums") {
        v = groups[v.g][key];
        if (!v) return;
        playKey = v.key;
        if (v.pan) rhythmPan = ((v.pan | 0x80) - 0xC0) * 2;
      }
      if (!v || v.t === "split" || v.t === "drums") return;
      if (tr.lfoDelay) { tr.lfoDelayC = tr.lfoDelay; tr.modM = 0; }
      const c = { tr, v, key: playKey, velocity, gate: dur, rhythmPan, env: 0, phase: "attack", counter: 0, pos: 0, on: true, age: frame };
      if (v.t === "ds") {
        const s = bank.samples[v.s];
        c.sample = s; c.pos = v.rev ? s.pcm.length - 1 : 0;
        let i = ds.findIndex((d) => !d.on);
        if (i < 0 && ds.length < MAX_DS) i = ds.length;
        if (i < 0) {   // steal: a releasing channel first, else the oldest
          let best = 0;
          for (let j = 1; j < ds.length; j++) {
            const a = ds[j], b = ds[best];
            if ((a.phase === "release") !== (b.phase === "release")) { if (a.phase === "release") best = j; }
            else if (a.age < b.age) best = j;
          }
          i = best;
        }
        ds[i] = c;
      } else {
        const ch = { sq1: 0, sq2: 1, wave: 2, noise: 3 }[v.t];
        c.cgbPhase = 0; c.lfsr = 0x7fff;
        cgb[ch] = c;
      }
      chanVolume(c, trackMix(tr));
    }

    // Envelopes, once a frame.
    function dsEnvelope(c) {
      const v = c.v;
      if (c.phase === "attack") { c.env += v.a; if (c.env >= 255) { c.env = 255; c.phase = "decay"; } }
      else if (c.phase === "decay") {
        c.env = (c.env * v.d) >> 8;
        if (c.env <= v.su) { c.env = v.su; c.phase = "sustain"; if (!v.su) c.on = false; }
      } else if (c.phase === "release") {
        c.env = (c.env * v.r) >> 8;
        if (c.env <= 0) c.on = false;
      }
    }
    function cgbEnvelope(c) {
      const v = c.v;
      const goal = Math.min(15, ((c.left + c.right) >> 4));
      const sustainGoal = (goal * v.su + 15) >> 4;
      if (c.phase === "attack") {
        if (!v.a) { c.env = goal; c.phase = "decay"; c.counter = 0; }
        else if (++c.counter >= v.a) { c.counter = 0; c.env++; if (c.env >= goal) { c.env = goal; c.phase = "decay"; } }
      } else if (c.phase === "decay") {
        if (!v.d) { c.env = sustainGoal; c.phase = "sustain"; }
        else if (++c.counter >= v.d) { c.counter = 0; c.env--; if (c.env <= sustainGoal) { c.env = sustainGoal; c.phase = "sustain"; } }
        if (c.phase === "sustain" && !c.env) c.on = false;
      } else if (c.phase === "sustain") c.env = sustainGoal;
      else if (c.phase === "release") {
        if (!v.r) c.on = false;
        else if (++c.counter >= v.r) { c.counter = 0; c.env--; if (c.env <= 0) c.on = false; }
      }
      // Hard left / right when one side is at least twice the other (CgbPan).
      c.pan = c.right >= c.left ? (c.right >> 1 >= c.left ? "R" : "") : (c.left >> 1 >= c.right ? "L" : "");
    }

    // Sequencer state.
    let frame = 0, tick = 0, tickAcc = 0, tempoIdx = 0, usPerBeat = tempos[0][1];
    let wraps = 0, wrapSamples = [];
    const endTick = loop ? loop[1] : song.end;
    const tickOnce = () => {
      // Events at this tick.
      while (tempoIdx < tempos.length && tempos[tempoIdx][0] <= tick) usPerBeat = tempos[tempoIdx++][1];
      for (const tr of tracks) {
        while (tr.i < tr.ev.length && tr.ev[tr.i][0] <= tick) {
          const e = tr.ev[tr.i++];
          if (e[1] === 0) noteOn(tr, e[2], e[3], e[4]);
          else if (e[1] === 1) tr.voice = e[2];
          else if (e[1] === 3) tr.bend = e[2] - 64;
          else if (e[1] === 2) {
            const [n, val] = [e[2], e[3]];
            if (n === 7) tr.vol = Math.floor(val * song.vol / 127);
            else if (n === 10) tr.pan = val - 64;
            else if (n === 1) { tr.mod = val; if (!val) tr.modM = 0; }
            else if (n === 20) tr.bendRange = val;
            else if (n === 21) tr.lfoSpeed = val;
            else if (n === 22) { tr.modT = val; }
            else if (n === 24) tr.tune = val - 64;
            else if (n === 26) tr.lfoDelay = val;
          }
        }
        // Vibrato (the LFO: a triangle wave).
        if (tr.lfoSpeed && tr.mod) {
          if (tr.lfoDelayC) tr.lfoDelayC--;
          else {
            tr.lfoSpeedC = (tr.lfoSpeedC + tr.lfoSpeed) & 255;
            const r = tr.lfoSpeedC;
            const tri = ((r - 64) & 0x80) ? (r << 24 >> 24) : 128 - r;
            tr.modM = (tr.mod * tri) >> 6;
          }
        }
      }
      // Gate: notes end when their length runs out.
      for (const c of ds.concat(cgb)) {
        if (c && c.on && c.phase !== "release" && c.gate != null && --c.gate <= 0) { c.phase = "release"; c.counter = 0; }
      }
      tick++;
      if (loop && tick >= loop[1]) {
        wrapSamples.push(outLen);
        wraps++;
        tick = loop[0];
        for (const tr of tracks) { tr.i = tr.ev.findIndex((e) => e[0] >= loop[0]); if (tr.i < 0) tr.i = tr.ev.length; }
        tempoIdx = 0; usPerBeat = tempos[0][1];
        while (tempoIdx < tempos.length && tempos[tempoIdx][0] <= tick) usPerBeat = tempos[tempoIdx++][1];
      }
    };

    const maxFrames = Math.ceil((opts.maxSeconds || 600) * FPS);
    let tail = 0;
    for (; frame < maxFrames; frame++) {
      // 1. Sequencer.
      tickAcc += ticksPerFrame(usPerBeat);
      while (tickAcc >= 1) { tickAcc -= 1; tickOnce(); if (loop && wraps >= 2) break; }
      if (loop && wraps >= 2) break;
      if (!loop && tick >= endTick) {
        const busy = ds.some((c) => c.on) || cgb.some((c) => c && c.on);
        if (!busy || ++tail > FPS * 3) break;
      }

      // 2. Volume and pitch from the tracks; 3. envelopes.
      for (const c of ds.concat(cgb)) {
        if (!c || !c.on) continue;
        const mix = trackMix(c.tr);
        chanVolume(c, mix);
        c.pitch = mix.pitch;
        if (c.v.t === "ds") dsEnvelope(c); else cgbEnvelope(c);
      }

      // 4. Mix this frame.
      const fl = new Float32Array(PER_FRAME), fr = new Float32Array(PER_FRAME);
      if (reverb && ring.length >= 7) {
        const [a, b] = [ring[0], ring[1]];   // 7 and 6 frames ago
        for (let i = 0; i < PER_FRAME; i++) {
          const v = ((a[0][i] + a[1][i] + b[0][i] + b[1][i]) * reverb) / 512;
          fl[i] = v; fr[i] = v;
        }
      }
      for (const c of ds) {
        if (!c || !c.on) continue;
        const s = c.sample, pcm = s.pcm, v = c.v;
        const semis = v.fix ? 0 : (c.key - 60) + c.pitch / 256;
        const step = (s.rate * Math.pow(2, semis / 12)) / RATE;
        const env = (c.env * (MASTER + 1)) >> 4;
        const vr = (c.right * env) >> 8, vl = (c.left * env) >> 8;
        const loopStart = s.loop, len = pcm.length;
        for (let i = 0; i < PER_FRAME; i++) {
          const p = c.pos | 0;
          if (v.rev ? p < 0 : p >= len) {
            if (loopStart != null && !v.rev) { c.pos = loopStart + (c.pos - len); if (c.pos >= len) c.pos = loopStart; }
            else { c.on = false; break; }
          }
          const smp = pcm[c.pos | 0];
          fl[i] += (smp * vl) / 256; fr[i] += (smp * vr) / 256;
          c.pos += v.rev ? -step : step;
        }
      }
      for (const c of cgb) {
        if (!c || !c.on || !c.env) continue;
        const v = c.v, amp = (c.env / 15) * CGB_AMP;
        const toL = c.pan !== "R", toR = c.pan !== "L";
        const fine = ((c.pitch % 256) + 256) % 256, keyShift = Math.floor(c.pitch / 256);
        if (v.t === "noise") {
          const hz = noiseHz(c.key + keyShift), step = hz / RATE, narrow = v.period === 1;
          for (let i = 0; i < PER_FRAME; i++) {
            c.cgbPhase += step;
            while (c.cgbPhase >= 1) {
              c.cgbPhase -= 1;
              const bit = (c.lfsr ^ (c.lfsr >> 1)) & 1;
              c.lfsr = (c.lfsr >> 1) | (bit << 14);
              if (narrow) c.lfsr = (c.lfsr & ~0x40) | (bit << 6);
            }
            const o = (c.lfsr & 1 ? -1 : 1) * amp;
            if (toL) fl[i] += o; if (toR) fr[i] += o;
          }
        } else if (v.t === "wave") {
          const w = bank._waves[v.w], hz = cgbHz("wave", c.key + keyShift, fine), step = hz * 32 / RATE;
          const level = [0, 0, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 0.75, 0.75, 0.75, 0.75, 1, 1][c.env] * CGB_AMP;
          for (let i = 0; i < PER_FRAME; i++) {
            const o = w[(c.cgbPhase | 0) & 31] * level;
            c.cgbPhase = (c.cgbPhase + step) % 32;
            if (toL) fl[i] += o; if (toR) fr[i] += o;
          }
        } else {
          const hz = cgbHz("square", c.key + keyShift, fine), step = hz / RATE;
          const duty = [0.125, 0.25, 0.5, 0.75][v.duty];
          for (let i = 0; i < PER_FRAME; i++) {
            const o = (c.cgbPhase < duty ? 1 : -1) * amp;
            c.cgbPhase = (c.cgbPhase + step) % 1;
            if (toL) fl[i] += o; if (toR) fr[i] += o;
          }
        }
      }
      // 8-bit output (what the reverb hears next time).
      for (let i = 0; i < PER_FRAME; i++) {
        fl[i] = Math.max(-128, Math.min(127, Math.round(fl[i])));
        fr[i] = Math.max(-128, Math.min(127, Math.round(fr[i])));
      }
      ring.push([fl, fr]);
      if (ring.length > 7) ring.shift();
      L.push(fl); R.push(fr);
      outLen += PER_FRAME;
    }

    const left = new Float32Array(outLen), right = new Float32Array(outLen);
    for (let f = 0, o = 0; f < L.length; f++, o += PER_FRAME) {
      for (let i = 0; i < PER_FRAME; i++) { left[o + i] = L[f][i] / 128; right[o + i] = R[f][i] / 128; }
    }
    return { rate: RATE, left, right,
      loopStart: loop && wrapSamples.length >= 2 ? wrapSamples[0] : null,
      loopEnd: loop && wrapSamples.length >= 2 ? wrapSamples[1] : null };
  }

  const M4A = { RATE, FPS, render };
  if (typeof window !== "undefined") window.M4A = M4A;
  if (typeof module !== "undefined") module.exports = M4A;
})();
