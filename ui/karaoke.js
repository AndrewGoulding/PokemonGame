// Karaoke (Yakuza 0's, in this game's way): in the karaoke box off Theater Square, sing one of its songs
// (data/karaoke-songs.js). The song plays on a Game Boy Advance's kind of sound (its own sequencer, here, so every
// prompt falls exactly on its note); its words run across the box's screen over the street, lit as they're sung;
// and the button for each syllable sung on the beat slides along the lane under them to the ring at its left.
// Press it as it's in the ring: GREAT, GOOD or MISS (a wrong button's a miss). A run of hits is a combo. At the
// end, the score out of 100 (as Yakuza's, GREATs full and GOODs half) and its rank.
//
//   const r = await Karaoke.play(overlay, { song, frame, back })   // song: a KARAOKE_SONGS entry; back: an image
//     // -> { score, rank, great, good, miss, combo } (or null: START to stop)
// The buttons: A (Z), B (X), ◀ and ▶; START pauses (go on, or stop singing).
(function () {
  "use strict";
  const M = () => window.GbaMenus, G = () => window.GBA_MENUS;
  const GREAT = 0.08, GOOD = 0.16, LEAD = 2.2;   // (seconds either side of the note; how long a prompt is on the lane)
  const RING = 36, LANE_Y = 116, SPEED = (240 - RING) / LEAD;
  const BUTTONS = ["a", "b", "left", "right"];
  const LABEL = { a: "A", b: "B", left: "◀", right: "▶" };
  const TINT = { a: [232, 72, 64], b: [64, 120, 232], left: [72, 184, 88], right: [232, 176, 40] };

  // ---------- The song as notes, in seconds ----------
  function chart(song) {
    const spb = 60 / song.bpm, notes = [], lines = [];
    let k = 0;
    for (const [start, syl] of song.lines) {
      let b = start;
      const line = { start: start * spb, words: [] };
      for (const [text, midi, len] of syl) {
        const t = b * spb, w = { text, t, end: (b + len) * spb, midi };
        line.words.push(w);
        notes.push({ t, midi, len: len * spb });
        // (a prompt on every syllable sung on the beat; which button, by turns as the tune goes up, down or holds)
        if (Math.abs(b - Math.round(b)) < 1e-6) w.prompt = { t, button: BUTTONS[(midi + k++ * 3) % 4], hit: null };
        b += len;
      }
      line.end = b * spb;
      lines.push(line);
    }
    const length = song.chords.length * 4 * spb;
    return { spb, notes, lines, length, prompts: lines.flatMap((l) => l.words.map((w) => w.prompt).filter(Boolean)) };
  }

  // ---------- The sound: two squares, a triangle and noise ----------
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function band(out) {
    const AC = window.AudioContext || window.webkitAudioContext;
    const via = window.GameAudio && window.GameAudio.output && window.GameAudio.output();
    if (via) return via;
    if (!AC || (window.GameAudio && window.GameAudio.enabled && !window.GameAudio.enabled())) return null;
    const ctx = new AC(), master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    return { ctx, master, own: true };
  }
  function schedule(out, song, C, t0) {
    const { ctx, master } = out, nodes = [];
    const pulse = ctx.createPeriodicWave(...(() => {
      // (a 25% pulse, the GBA's square channel's)
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * 0.25);
      return [re, im];
    })());
    const tone = (type, f, at, dur, vol, glide) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      if (type === "pulse") o.setPeriodicWave(pulse); else o.type = type;
      o.frequency.setValueAtTime(f, at);
      if (glide) o.frequency.exponentialRampToValueAtTime(glide, at + dur);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + 0.008);
      g.gain.setValueAtTime(vol, at + Math.max(0.01, dur - 0.04)); g.gain.linearRampToValueAtTime(0, at + dur);
      o.connect(g); g.connect(master); o.start(at); o.stop(at + dur + 0.02); nodes.push(o);
    };
    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    { const d = noise.getChannelData(0); let s = 1; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; } }
    const hit = (at, dur, vol, hp) => {
      const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      src.buffer = noise; f.type = "highpass"; f.frequency.value = hp;
      g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
      src.connect(f); f.connect(g); g.connect(master); src.start(at); src.stop(at + dur); nodes.push(src);
    };
    const spb = C.spb;
    // the tune
    for (const n of C.notes) tone("pulse", hz(n.midi), t0 + n.t, Math.max(0.08, n.len * 0.92), 0.11);
    // a bar each: the bass on the root, the chord's notes in turn, the drums
    const Q = { maj: [0, 4, 7], min: [0, 3, 7], "7": [0, 4, 7, 10] };
    song.chords.forEach(([root, q], bar) => {
      const at = t0 + bar * 4 * spb, notes = Q[q];
      for (let b = 0; b < 4; b++) {
        const bt = at + b * spb;
        tone("triangle", hz(root - 12 + (song.drums === "shuffle" && b % 2 ? 7 : 0)), bt, spb * 0.8, 0.2);
        for (let e = 0; e < 2; e++) tone("square", hz(root + 12 + notes[(b * 2 + e) % notes.length]), bt + e * spb / 2, spb * 0.3, 0.025);
        if (song.drums === "dance") { tone("sine", 140, bt, 0.12, 0.5, 40); hit(bt + spb / 2, 0.04, 0.12, 7000); if (b % 2) hit(bt, 0.12, 0.25, 1500); }
        else if (song.drums === "shuffle") { if (b % 2 === 0) tone("sine", 120, bt, 0.12, 0.45, 40); else hit(bt, 0.12, 0.22, 1500); hit(bt + spb * 2 / 3, 0.04, 0.1, 7000); }
        else { if (b === 0) tone("sine", 110, bt, 0.15, 0.4, 40); if (b === 2) hit(bt, 0.15, 0.18, 1500); hit(bt, 0.03, 0.06, 8000); }
      }
    });
    return () => { for (const n of nodes) try { n.stop(); } catch (e) { /* already stopped */ } };
  }

  // ---------- The screen ----------
  const RANKS = [[95, "S", "A legend of the mic!"], [85, "A", "The whole box is cheering!"], [70, "B", "Not bad at all!"],
    [50, "C", "Keep practising..."], [0, "D", "Maybe stick to fighting."]];
  function draw(canvas, o, C, now, st) {
    const s = M().Surface(), frame = "type" + ((o.frame || 0) + 1), fp = G().frames[frame].palette;
    const W = [248, 248, 248], INK = [40, 40, 48], SH = [208, 208, 200];
    s.fill(0, 0, 240, 160, [24, 16, 40]);
    // (the box: its screen's frame, the lane under it, the score box)
    s.fill(6, 6, 228, 92, [8, 8, 16]);
    s.fill(0, 100, 240, 32, [40, 28, 64]);
    s.fill(0, LANE_Y - 9, 240, 18, [24, 18, 40]); s.fill(0, LANE_Y - 10, 240, 1, [96, 80, 140]); s.fill(0, LANE_Y + 9, 240, 1, [96, 80, 140]);
    // (the ring)
    for (let a = 0; a < 64; a++) { const x = Math.round(RING + Math.cos(a / 64 * Math.PI * 2) * 9), y = Math.round(LANE_Y + Math.sin(a / 64 * Math.PI * 2) * 9); s.put(x, y, st.flash > 0 ? [255, 240, 140] : W); }
    // (the prompts coming)
    for (const p of C.prompts) {
      if (p.hit) continue;
      const x = Math.round(RING + (p.t - now) * SPEED);
      if (x > 250 || x < -10) continue;
      const c = TINT[p.button];
      for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
        const r = dx * dx + dy * dy;
        if (r <= 49) s.put(x + dx, LANE_Y + dy, r > 36 ? INK : r < 9 && dx < 0 && dy < 0 ? [255, 255, 255] : c);
      }
      // (A and B their letters; ◀ and ▶ the one arrow, drawn, turned round for ◀)
      if (p.button === "left" || p.button === "right") {
        const dir = p.button === "right" ? 1 : -1;
        for (let k = 0; k <= 4; k++) for (let j = -(4 - k); j <= 4 - k; j++) {
          s.put(x + dir * (k - 1) + 1, LANE_Y + j + 1, INK); s.put(x + dir * (k - 1), LANE_Y + j, W);
        }
      } else {
        const l = LABEL[p.button];
        s.text(l, x - Math.floor(s.textWidth(l, "small") / 2), LANE_Y - 6, W, INK, "small");
      }
    }
    if (st.judge && st.judge.t > 0) { const j = st.judge; s.text(j.text, RING - 16, LANE_Y - 24, j.col, INK, "small"); }
    // (the score)
    s.frame(frame, fp, 1, 17, 28, 2); s.fill(8, 136, 224, 16, W);
    s.text(o.song.title, 10, 137, INK, SH, "small");
    const sc = "SCORE " + String(Math.round(st.points)).padStart(3, " ") + (st.combo > 1 ? "  COMBO " + st.combo : "");
    s.text(sc, 230 - s.textWidth(sc, "small"), 137, [56, 120, 200], SH, "small");
    if (st.pause) {
      s.fill(80, 40, 80, 52, [0, 0, 0]); s.frame(frame, fp, 11, 6, 8, 5); s.fill(88, 48, 64, 40, W);
      s.text("PAUSED", 120 - s.textWidth("PAUSED") / 2, 46, [208, 48, 48], SH);
      ["Resume", "Quit"].forEach((t, k) => s.text((st.pause.at === k ? "▶" : "  ") + t, 96, 60 + k * 13, INK, SH, "small"));
    }
    if (st.done) {
      s.fill(48, 30, 144, 60, [0, 0, 0]); s.frame(frame, fp, 7, 5, 16, 6); s.fill(56, 40, 128, 48, W);
      s.text(st.done.points + " POINTS", 120 - s.textWidth(st.done.points + " POINTS") / 2, 42, INK, SH);
      s.text("RANK " + st.done.rank, 120 - s.textWidth("RANK " + st.done.rank) / 2, 58, [208, 48, 48], SH);
      s.text(st.done.words, 120 - s.textWidth(st.done.words, "small") / 2, 74, INK, SH, "small");
    }
    s.show(canvas);
    // (the box's screen: the street outside, dimmed, its words over it)
    const g = canvas.getContext("2d"), k = canvas.width / 240;
    g.save(); g.scale(k, k); g.imageSmoothingEnabled = false;
    if (st.pause) {
      s.fill(80, 40, 80, 52, [0, 0, 0]); s.frame(frame, fp, 11, 6, 8, 5); s.fill(88, 48, 64, 40, W);
      s.text("PAUSED", 120 - s.textWidth("PAUSED") / 2, 46, [208, 48, 48], SH);
      ["Resume", "Quit"].forEach((t, k) => s.text((st.pause.at === k ? "▶" : "  ") + t, 96, 60 + k * 13, INK, SH, "small"));
    }
    if (st.done || st.pause) { g.restore(); return; }   // (the score, or the pause, over the dark screen)
    if (o.back && o.back.complete && o.back.naturalWidth) {
      const pan = ((now / Math.max(1, C.length)) * (o.back.naturalWidth - 1000)) || 0;
      g.globalAlpha = 0.55; g.drawImage(o.back, Math.max(0, pan), 200, 600, 240, 8, 8, 224, 88); g.globalAlpha = 1;
    }
    // (the line being sung, and the next: each word lit as it's sung, its colour wiping across it)
    const at = C.lines.findIndex((l) => now < l.end + C.spb * 1.5);
    const show = at < 0 ? [] : [C.lines[at], C.lines[at + 1]].filter(Boolean);
    g.font = "bold 9px 'Trebuchet MS', sans-serif"; g.textBaseline = "alphabetic";
    show.forEach((l, row) => {
      const text = l.words.map((w) => w.text).join(""), wd = g.measureText(text).width, x0 = 120 - wd / 2, y = 70 + row * 14;
      let x = x0;
      g.fillStyle = "#000"; g.fillText(text, x0 + 1, y + 1);
      g.fillStyle = row ? "#c8c8d8" : "#ffffff"; g.fillText(text, x0, y);
      if (!row) for (const w of l.words) {
        const ww = g.measureText(w.text).width, f = Math.max(0, Math.min(1, (now - w.t) / Math.max(0.05, w.end - w.t)));
        if (f > 0) { g.save(); g.beginPath(); g.rect(x, y - 10, ww * f, 13); g.clip(); g.fillStyle = "#ffd040"; g.fillText(w.text, x, y); g.restore(); }
        x += ww;
      }
    });
    if (now < (C.lines[0] ? C.lines[0].start : 0) - 0.3) {
      const n = Math.ceil(((C.lines[0].start) - now) / C.spb);
      if (n <= 4) { g.fillStyle = "#ffd040"; g.font = "bold 16px 'Trebuchet MS', sans-serif"; g.textAlign = "center"; g.fillText(String(n), 120, 50); g.textAlign = "left"; }
    }
    g.restore();
  }

  async function play(canvas, o) {
    const C = chart(o.song), st = { points: 0, combo: 0, best: 0, great: 0, good: 0, miss: 0, judge: null, flash: 0, done: null };
    const total = C.prompts.length, per = 100 / Math.max(1, total);
    const out = band();
    if (window.GameAudio) window.GameAudio.music(null);
    // (paused: the sound stopped where it is (its context suspended, its clock with it), or the clock held)
    let held = 0, heldAt = null;
    const raw = out ? () => out.ctx.currentTime : () => performance.now() / 1000;
    const clock = () => (heldAt != null ? heldAt : raw()) - held;
    const t0 = clock() + 1.2;
    const stop = out ? schedule(out, o.song, C, t0) : () => {};
    canvas.classList.remove("hidden");
    const judge = (text, col) => { st.judge = { text, col, t: 30 }; };
    const KEY = { z: "a", Z: "a", " ": "a", Enter: "a", x: "b", X: "b", ArrowLeft: "left", ArrowRight: "right" };
    let quit = false;
    const onKey = (e) => {
      const start = ["Escape", "m", "M", "Start"].includes(e.key);
      if (start || st.pause) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (e.repeat) return;
        // (START pauses, and again goes on; paused, ▲▼ and A: go on, or stop singing)
        const go = () => { st.pause = null; if (out) out.ctx.resume(); else { held += raw() - heldAt; } heldAt = null; };
        if (!st.pause) { if (start) { st.pause = { at: 0 }; if (out) out.ctx.suspend(); else heldAt = raw(); } return; }
        if (start || ["x", "X"].includes(e.key)) go();
        else if (e.key === "ArrowUp" || e.key === "ArrowDown") st.pause.at ^= 1;
        else if (["z", "Z", " ", "Enter"].includes(e.key)) { if (st.pause.at) { quit = true; st.pause = null; if (out) out.ctx.resume(); } else go(); }
        return;
      }
      const b = KEY[e.key];
      if (!b || e.repeat) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const now = clock() - t0;
      // (the nearest prompt not yet taken, within reach of the ring)
      const p = C.prompts.find((q) => !q.hit && Math.abs(q.t - now) <= GOOD);
      if (!p) return;
      const d = Math.abs(p.t - now);
      if (p.button !== b) { p.hit = "miss"; st.miss++; st.combo = 0; judge("MISS", [160, 160, 176]); return; }
      p.hit = d <= GREAT ? "great" : "good";
      st[p.hit]++; st.combo++; st.best = Math.max(st.best, st.combo); st.flash = 6;
      st.points += p.hit === "great" ? per : per / 2;
      judge(p.hit === "great" ? "GREAT" : "GOOD", p.hit === "great" ? [255, 208, 64] : [120, 200, 255]);
    };
    document.addEventListener("keydown", onKey, true);
    await new Promise((resolve) => {
      const tick = () => {
        const now = clock() - t0;
        if (st.pause) { draw(canvas, o, C, now, st); requestAnimationFrame(tick); return; }
        for (const p of C.prompts) if (!p.hit && now - p.t > GOOD) { p.hit = "miss"; st.miss++; st.combo = 0; judge("MISS", [160, 160, 176]); }
        if (st.judge) st.judge.t--;
        if (st.flash) st.flash--;
        draw(canvas, o, C, now, st);
        if (quit || now > C.length + 0.3) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    document.removeEventListener("keydown", onKey, true);
    stop();
    if (out && out.own) out.ctx.close();
    if (quit) { canvas.classList.add("hidden"); return null; }
    const points = Math.round(st.points), r = RANKS.find(([min]) => points >= min);
    st.done = { points, rank: r[1], words: r[2] };
    draw(canvas, o, C, C.length, st);
    await M().keys((k) => (k === "a" || k === "b" ? true : undefined));
    canvas.classList.add("hidden");
    return { score: points, rank: r[1], great: st.great, good: st.good, miss: st.miss, combo: st.best };
  }
  window.Karaoke = { play: (c, o) => M().during("karaoke", play(c, o)), chart };
})();
