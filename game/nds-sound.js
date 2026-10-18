// The Nintendo DS's sound player (NitroSystem's, as HeartGold's songs use it),
// rendering a song from assets/audio/johto-music.js (tools/build-johto-audio.js)
// into PCM, the way game/m4a.js does FireRed's:
//
//   const out = NDS.render(JOHTO_MUSIC_DATA.songs.gs_t_wakaba, JOHTO_MUSIC_DATA);
//   // { rate, left, right (Float32Array, -1..1), loopStart, loopEnd (in samples; null if it doesn't loop) }
//
// Like the DS: 32,728 Hz output, the sequencer, envelopes and LFOs stepped
// every 2,728 x 64 cycles (192 a second), with the tempo counted against 240;
// 16 channels (the PSG squares only on 8-13), each a wave (8-bit, 16-bit or
// IMA-ADPCM, at its own rate), a square or noise. Volumes are in decibels, as
// the DS's are: an envelope from -72.3 dB up to 0 and back, and velocity,
// volume and expression on a squared curve (NitroSystem's tables).
//
// Loaded by ui/audio.js (with johto-music.js) when a Johto song is first
// wanted. A song that loops is rendered with its loop body twice, as M4A does.
(function () {
  const ARM7 = 33513982;
  const RATE = 32728;                    // (33,513,982 / 1,024 Hz)
  const UPDATE_HZ = ARM7 / (64 * 2728);  // ~191.96 a second
  const PER_UPDATE = RATE / UPDATE_HZ;   // ~170.5 samples
  const SILENT = -723 << 7;              // an envelope at -72.3 dB (in 1/128ths of 0.1 dB)
  const GAIN = 1.3;                      // (to sit near FireRed's loudness)
  const KNEE = 0.7;                      // (and over this, peaks are eased in under 1, not clipped)
  const SEAM = 256;                      // (samples cross-faded where a loop goes round)

  // ---------- Tables ----------

  // Velocity, volume and expression (0-127) in 0.1 dB: 40 log10(x / 127),
  // NitroSystem's "decibel square" table.
  const DB_SQUARE = new Int16Array(128);
  for (let i = 0; i < 128; i++) DB_SQUARE[i] = i ? Math.max(-722, Math.round(400 * Math.log10(i / 127))) : -32768;
  const dbsq = (x) => DB_SQUARE[Math.max(0, Math.min(127, x | 0))];
  // ADSR (NitroSystem's Cnv_Attack, Cnv_Fall, Cnv_Sust).
  const ATTACK_TOP = [0, 1, 5, 14, 26, 38, 51, 63, 73, 84, 92, 100, 109, 116, 123, 127, 132, 137, 143];
  const attackRate = (a) => (a >= 109 ? ATTACK_TOP[127 - a] : 255 - a);
  const fallRate = (f) => (f >= 127 ? 0xffff : f === 126 ? 0x3c00 : f < 50 ? f * 2 + 1 : (0x1e00 / (126 - f)) | 0);
  const sustainLevel = (s) => (s >= 127 ? 0 : Math.max(SILENT, dbsq(s) << 7));
  // A level in 0.1 dB (0 = full) as a multiplier.
  const AMP = new Float32Array(724);
  for (let i = 0; i < 724; i++) AMP[i] = i ? Math.pow(10, (i - 723) / 200) : 0;
  const SINE = new Int8Array(128);   // (the LFO: a sine, a full turn in 128 steps)
  for (let i = 0; i < 128; i++) SINE[i] = Math.round(Math.sin((i / 128) * 2 * Math.PI) * 127);

  // ---------- Data ----------

  function decodeB64(s) {
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(s, "base64"));
    const bin = atob(s), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // IMA-ADPCM as the DS decodes it (low nibble first, clamped at +-0x7fff).
  const IMA_STEP = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97,
    107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
    1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484,
    7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767];
  const IMA_INDEX = [-1, -1, -1, -1, 2, 4, 6, 8];
  function decodeAdpcm(b) {
    let pred = (b[0] | (b[1] << 8)) << 16 >> 16, index = Math.min(88, b[2] & 0x7f);
    const out = new Float32Array((b.length - 4) * 2);
    for (let i = 4, o = 0; i < b.length; i++) {
      for (let n = 0; n < 2; n++) {
        const nib = n ? b[i] >> 4 : b[i] & 15, step = IMA_STEP[index];
        let diff = step >> 3;
        if (nib & 1) diff += step >> 2;
        if (nib & 2) diff += step >> 1;
        if (nib & 4) diff += step;
        pred = nib & 8 ? Math.max(-0x7fff, pred - diff) : Math.min(0x7fff, pred + diff);
        index = Math.max(0, Math.min(88, index + IMA_INDEX[nib & 7]));
        out[o++] = pred / 32768;
      }
    }
    return out;
  }
  function prepare(data) {
    if (data._ready) return;
    for (const w of Object.values(data.waves)) {
      const b = decodeB64(w.data);
      if (w.f === 2) { w.pcm = decodeAdpcm(b); w.loopStart = Math.max(0, (w.loop - 1) * 8); }
      else if (w.f === 1) {
        w.pcm = new Float32Array(b.length >> 1);
        for (let i = 0; i < w.pcm.length; i++) w.pcm[i] = ((b[i * 2] | (b[i * 2 + 1] << 8)) << 16 >> 16) / 32768;
        w.loopStart = w.loop * 2;
      } else {
        w.pcm = new Float32Array(b.length);
        for (let i = 0; i < b.length; i++) w.pcm[i] = ((b[i] << 24) >> 24) / 128;
        w.loopStart = w.loop * 4;
      }
      w.rate = ARM7 / 2 / w.timer;
      if (!w.loops || w.loopStart >= w.pcm.length) w.loopStart = null;
    }
    // Each track's events with their ticks from the start: [tick, kind, a, b, c].
    for (const seq of Object.values(data.sequences)) {
      for (const t of seq) {
        const ev = [];
        for (let i = 0, tick = 0; i < t.ev.length;) {
          tick += t.ev[i];
          if (t.ev[i + 1] === 0) { ev.push([tick, 0, t.ev[i + 2], t.ev[i + 3], t.ev[i + 4]]); i += 5; }
          else { ev.push([tick, t.ev[i + 1], t.ev[i + 2]]); i += 3; }
        }
        t.events = ev;
      }
    }
    data._ready = true;
  }

  // ---------- Rendering ----------

  function render(song, data, opts) {
    opts = opts || {};
    prepare(data);
    const bank = data.banks[song.bank] || [];
    const seq = data.sequences[song.seq];
    const seqVol = dbsq(song.vol == null ? 127 : song.vol);
    const loop = song.loop && song.loop[1] > song.loop[0] ? song.loop : null;
    const gain = opts.gain || GAIN;

    const tracks = seq.map((t) => ({
      events: t.events, i: 0, offset: 0, loop: t.loop, loopTick: t.loopTick, end: t.end, done: !t.events.length,
      prog: 0, vol: 127, expr: 127, master: 127, pan: 64, bend: 0, bendRange: 2,
      modDepth: 0, modSpeed: 16, modType: 0, modRange: 1, modDelay: 0,
      porta: false, portaKey: 60, portaTime: 0, tie: false, tied: null, sweep: 0, a: 255, d: 255, s: 255, r: 255
    }));
    const chans = new Array(16).fill(null);

    // The sound an instrument plays for a key (a key split's range, a drum set's key).
    function region(inst, key) {
      if (!inst) return null;
      if (inst.t === "split") return inst.regions.find((r) => key <= r.top) || null;
      if (inst.t === "drums") return inst.regions[key - inst.lo] || null;
      return inst;
    }
    // A channel for a new note: a free one, else the one that matters least
    // (released first, then the quietest); PSG squares only on 8-13, noise on 14-15.
    function allocate(type) {
      const range = type === "psg" ? [8, 13] : type === "noise" ? [14, 15] : [0, 15];
      let best = -1;
      for (let i = range[0]; i <= range[1]; i++) {
        const c = chans[i];
        if (!c || !c.on) return i;
        if (best < 0) { best = i; continue; }
        const b = chans[best];
        if ((c.state === 3) !== (b.state === 3)) { if (c.state === 3) best = i; }
        else if (c.ampl < b.ampl) best = i;
      }
      return best;
    }
    function noteOn(tr, key, vel, len) {
      const r = region(bank[tr.prog], key);
      if (!r || (r.t === "pcm" && !data.waves[r.w])) return;
      // (Tie: the note goes on in the channel that's playing, at the new key.)
      if (tr.tie && tr.tied && tr.tied.on && tr.tied.tr === tr) {
        const c = tr.tied;
        startSweep(tr, c, key, len);
        c.key = key; c.vel = dbsq(vel); c.length = -1;
        tr.portaKey = key;
        return;
      }
      const i = allocate(r.t);
      if (i < 0) return;
      const c = {
        tr, r, key, vel: dbsq(vel), length: tr.tie ? -1 : len, on: true,
        state: 0, ampl: SILENT,   // (0 attack, 1 decay, 2 sustain, 3 release)
        attack: attackRate(tr.a !== 255 ? tr.a : r.a), decay: fallRate(tr.d !== 255 ? tr.d : r.d),
        sustain: sustainLevel(tr.s !== 255 ? tr.s : r.s), release: fallRate(tr.r !== 255 ? tr.r : r.r),
        wave: r.t === "pcm" ? data.waves[r.w] : null, pos: 0, phase: 0, lfsr: 0x7fff,
        lfo: 0, lfoWait: 0, sweepPitch: 0, sweepLen: 0, sweepCnt: 0, amp: 0, panL: 0.5, panR: 0.5, pitch: 0
      };
      startSweep(tr, c, key, len);
      chans[i] = c;
      if (tr.tie) tr.tied = c;
      tr.portaKey = key;
    }
    // Portamento (from the last key) and pitch sweep: an offset that runs out
    // over the note (or the portamento time).
    function startSweep(tr, c, key, len) {
      let sweep = tr.sweep;
      if (tr.porta) sweep += (tr.portaKey - key) * 64;
      c.sweepPitch = sweep; c.sweepCnt = 0;
      c.sweepLen = !sweep ? 0 : tr.portaTime ? (tr.portaTime * tr.portaTime * Math.abs(sweep)) >> 11 : Math.max(1, Math.round(len * 240 / tempo));
    }
    const releaseAll = (tr) => { for (const c of chans) if (c && c.on && c.tr === tr && c.state !== 3) c.state = 3; tr.tied = null; };

    function event(tr, e) {
      const k = e[1], x = e[2];
      if (k === 0) noteOn(tr, e[2], e[3], e[4]);
      else if (k === 1) tr.prog = x;
      else if (k === 0xc0) tr.pan = x;
      else if (k === 0xc1) tr.vol = x;
      else if (k === 0xc2) tr.master = x;
      else if (k === 0xc4) tr.bend = x;
      else if (k === 0xc5) tr.bendRange = x;
      else if (k === 0xc8) { if (tr.tie !== !!x) releaseAll(tr); tr.tie = !!x; }
      else if (k === 0xc9) { tr.portaKey = x; tr.porta = true; }
      else if (k === 0xca) tr.modDepth = x;
      else if (k === 0xcb) tr.modSpeed = x;
      else if (k === 0xcc) tr.modType = x;
      else if (k === 0xcd) tr.modRange = x;
      else if (k === 0xce) tr.porta = !!x;
      else if (k === 0xcf) tr.portaTime = x;
      else if (k === 0xd0) tr.a = x;
      else if (k === 0xd1) tr.d = x;
      else if (k === 0xd2) tr.s = x;
      else if (k === 0xd3) tr.r = x;
      else if (k === 0xd5) tr.expr = x;
      else if (k === 0xe0) tr.modDelay = x;
      else if (k === 0xe1) tempo = x;
      else if (k === 0xe3) tr.sweep = x;
    }

    // One tick: each track's notes count down, then its events at this tick.
    let tick = 0, tempo = 120, tempoCount = 0;
    function doTick() {
      for (const tr of tracks) {
        for (const c of chans) {
          if (c && c.on && c.tr === tr && c.length > 0 && --c.length === 0 && c.state !== 3) c.state = 3;
        }
        while (!tr.done) {
          if (tr.i >= tr.events.length) {
            // (The end: round again from the loop, or stop.)
            if (tr.loop >= 0 && tr.loop < tr.events.length && tr.end > tr.loopTick) { tr.offset += tr.end - tr.loopTick; tr.i = tr.loop; continue; }
            tr.done = true;
            break;
          }
          const e = tr.events[tr.i];
          if (e[0] + tr.offset > tick) break;
          tr.i++;
          event(tr, e);
        }
      }
      tick++;
    }

    // Each channel, once an update: envelope, LFO, sweep, then its volume, pan and pitch.
    function update(c) {
      const tr = c.tr;
      if (c.state === 0) { c.ampl = -((c.attack * -c.ampl) >> 8); if (c.ampl === 0) c.state = 1; }
      else if (c.state === 1) { c.ampl -= c.decay; if (c.ampl <= c.sustain) { c.ampl = c.sustain; c.state = 2; } }
      else if (c.state === 3) { c.ampl -= c.release; if (c.ampl <= SILENT) { c.on = false; return; } }
      let mod = 0;
      if (tr.modDepth) {
        if (c.lfoWait < tr.modDelay) c.lfoWait++;
        else { c.lfo = (c.lfo + (tr.modSpeed << 6)) & 0x7fff; mod = SINE[c.lfo >> 8] * tr.modDepth * tr.modRange; }
      }
      let v = (c.ampl >> 7) + c.vel + dbsq(tr.vol) + dbsq(tr.expr) + dbsq(tr.master) + seqVol;
      if (tr.modType === 1) v += (mod * 60) >> 14;
      v = Math.max(0, Math.min(723, v + 723));
      let pan = (c.r.pan - 64) + (tr.pan - 64) + (tr.modType === 2 ? mod >> 8 : 0);
      pan = Math.max(-64, Math.min(63, pan)) + 64;
      c.amp = AMP[v] * gain;
      c.panL = (127 - pan) / 127; c.panR = pan / 127;
      let sweep = 0;
      if (c.sweepLen && c.sweepCnt < c.sweepLen) { sweep = c.sweepPitch * (c.sweepLen - c.sweepCnt) / c.sweepLen; c.sweepCnt++; }
      c.pitch = (c.key - c.r.key) * 64 + ((tr.bend * tr.bendRange) >> 1) + sweep + (tr.modType === 0 ? mod >> 8 : 0);   // (1/64 semitone)
    }

    const L = [], R = [];
    let outLen = 0, carry = 0;
    const loopMarks = [];
    const maxUpdates = Math.ceil((opts.maxSeconds || 600) * UPDATE_HZ);
    let tail = 0;
    for (let u = 0; u < maxUpdates; u++) {
      // 1. The sequencer: a tick each time the tempo counts up to 240.
      tempoCount += tempo;
      while (tempoCount >= 240) {
        tempoCount -= 240;
        if (loop && tick === loop[1] + (loop[1] - loop[0]) * loopMarks.length && loopMarks.length < 2) loopMarks.push(outLen);
        if (loop && loopMarks.length >= 2) break;
        doTick();
      }
      if (loop && loopMarks.length >= 2) break;
      if (!loop && tracks.every((t) => t.done)) {
        // (Then the notes still sounding, until they've died away.)
        if (!chans.some((c) => c && c.on && (c.state !== 3 || c.amp > 1e-4)) || ++tail > UPDATE_HZ * 3) break;
      }
      // 2. The channels.
      for (const c of chans) if (c && c.on) update(c);
      // 3. Mix this update's samples.
      const n = Math.floor(PER_UPDATE + carry);
      carry += PER_UPDATE - n;
      const fl = new Float32Array(n), fr = new Float32Array(n);
      for (const c of chans) {
        if (!c || !c.on || !c.amp) continue;
        const gl = c.amp * c.panL, gr = c.amp * c.panR;
        if (c.wave) {
          const w = c.wave, pcm = w.pcm, len = pcm.length;
          const step = (w.rate * Math.pow(2, c.pitch / 768)) / RATE;
          for (let i = 0; i < n; i++) {
            if (c.pos >= len) {
              if (w.loopStart == null) { c.on = false; break; }
              c.pos = w.loopStart + ((c.pos - len) % (len - w.loopStart || 1));
            }
            // (Linear between samples: a little smoother than the DS's.)
            const p = c.pos | 0, f = c.pos - p;
            const a = pcm[p], b = p + 1 < len ? pcm[p + 1] : (w.loopStart != null ? pcm[w.loopStart] : 0);
            const s = a + (b - a) * f;
            fl[i] += s * gl; fr[i] += s * gr;
            c.pos += step;
          }
        } else if (c.r.t === "psg") {
          // A square: duty (n + 1) / 8 high (7: none), at 440 Hz for A4.
          const hz = 440 * Math.pow(2, (c.r.key - 69) / 12 + c.pitch / 768), step = hz / RATE;
          const duty = c.r.duty === 7 ? 0 : (c.r.duty + 1) / 8;
          for (let i = 0; i < n; i++) {
            const s = c.phase < duty ? 1 : -1;
            c.phase = (c.phase + step) % 1;
            fl[i] += s * gl; fr[i] += s * gr;
          }
        } else {
          // Noise: the DS's 15-bit LFSR, clocked at 8 x the note's frequency.
          const step = (8 * 440 * Math.pow(2, (c.r.key - 69) / 12 + c.pitch / 768)) / RATE;
          for (let i = 0; i < n; i++) {
            c.phase += step;
            while (c.phase >= 1) {
              c.phase -= 1;
              const bit = c.lfsr & 1;
              c.lfsr >>= 1;
              if (bit) c.lfsr ^= 0x6000;
              c.out = bit ? -1 : 1;
            }
            const s = c.out || 1;
            fl[i] += s * gl; fr[i] += s * gr;
          }
        }
      }
      for (let i = 0; i < n; i++) {
        fl[i] = limit(fl[i]);
        fr[i] = limit(fr[i]);
      }
      L.push(fl); R.push(fr);
      outLen += n;
    }

    const left = new Float32Array(outLen), right = new Float32Array(outLen);
    for (let f = 0, o = 0; f < L.length; o += L[f].length, f++) { left.set(L[f], o); right.set(R[f], o); }
    const looped = loop && loopMarks.length >= 2;
    // (The second time round ends a little differently from the first, its
    // ticks falling between updates differently: the end fades into what led
    // up to the loop's start, so going round is smooth.)
    if (looped && loopMarks[0] >= SEAM) {
      const [a, b] = loopMarks;
      for (let i = 0; i < SEAM; i++) {
        const f = (i + 1) / SEAM;
        left[b - SEAM + i] += (left[a - SEAM + i] - left[b - SEAM + i]) * f;
        right[b - SEAM + i] += (right[a - SEAM + i] - right[b - SEAM + i]) * f;
      }
    }
    return { rate: RATE, left, right, loopStart: looped ? loopMarks[0] : null, loopEnd: looped ? loopMarks[1] : null };
  }
  // The output: as it is up to the knee, then eased in under 1.
  function limit(x) {
    const a = Math.abs(x);
    if (a <= KNEE) return x;
    const y = KNEE + (1 - KNEE) * Math.tanh((a - KNEE) / (1 - KNEE));
    return x < 0 ? -y : y;
  }

  const NDS = { RATE, UPDATE_HZ, render };
  if (typeof window !== "undefined") window.NDS = NDS;
  if (typeof module !== "undefined") module.exports = NDS;
})();
