// Music, fanfares and cries.
//
//   GameAudio.music("mus_pallet")       // switch the music (no-op if it's already playing)
//   await GameAudio.fanfare("mus_heal") // pause the music, play a jingle, then carry on
//   GameAudio.cry("Pikachu", { faint: true })
//   GameAudio.se("se_ball")             // a sound effect over the music
//   GameAudio.setEnabled(false)         // the Sound option (remembered in this browser)
//
// Songs are FireRed's, played by its sound engine (game/m4a.js) from
// assets/audio/music.js, which loads once the game first wants sound. Browsers
// only allow sound after the player has pressed a key or tapped, so nothing
// plays before that; the music then starts where the game is.
(function () {
  const KEY = "pokemon-sound";
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== "off"; } catch (e) { /* storage blocked */ }

  let ctx = null, master = null, dataLoading = null;
  const cache = new Map();          // song -> { buffer, loopStart, loopEnd }
  let current = null;               // { name, source, gain, startedAt, buffer, loopStart, loopEnd }
  let wanted = null;                // the song the game wants (played once sound can start)
  let fanfareDepth = 0;
  let mono = false;                 // the Option screen's SOUND: MONO

  function loadData() {
    if (window.MUSIC_DATA) return Promise.resolve();
    if (!dataLoading) {
      dataLoading = new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = "assets/audio/music.js";
        s.onload = () => resolve();
        s.onerror = () => resolve();   // no music, but the game goes on
        document.head.appendChild(s);
      });
    }
    return dataLoading;
  }

  // The first key press or tap starts the audio.
  function unlock() {
    if (!enabled) return;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.7;
      setChannels();
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    loadData().then(() => { if (wanted && (!current || current.name !== wanted)) start(wanted); });
  }
  for (const ev of ["keydown", "pointerdown", "touchstart"]) document.addEventListener(ev, unlock, { capture: true, passive: true });

  // MONO mixes both sides together (the speakers then play the same).
  function setChannels() {
    if (!master) return;
    master.channelCount = mono ? 1 : 2;
    master.channelCountMode = "explicit";
    master.channelInterpretation = "speakers";
  }

  function song(name) {
    if (cache.has(name)) return cache.get(name);
    const data = window.MUSIC_DATA && window.MUSIC_DATA.songs[name];
    if (!data || !ctx) return null;
    const r = window.M4A.render(data, window.MUSIC_DATA.bank);
    const buffer = ctx.createBuffer(2, Math.max(1, r.left.length), r.rate);
    buffer.copyToChannel(r.left, 0);
    buffer.copyToChannel(r.right, 1);
    const s = { buffer, loopStart: r.loopStart != null ? r.loopStart / r.rate : null, loopEnd: r.loopEnd != null ? r.loopEnd / r.rate : null };
    cache.set(name, s);
    if (cache.size > 10) cache.delete(cache.keys().next().value);
    return s;
  }

  function stopCurrent(fade) {
    if (!current) return;
    const c = current;
    current = null;
    const t = ctx.currentTime;
    c.gain.gain.cancelScheduledValues(t);
    c.gain.gain.setValueAtTime(c.gain.gain.value, t);
    c.gain.gain.linearRampToValueAtTime(0, t + (fade || 0.01));
    try { c.source.stop(t + (fade || 0.01) + 0.02); } catch (e) { /* already stopped */ }
  }

  // Plays `name` from `offset` seconds (looping if it loops). Resolves when a
  // song that doesn't loop has finished.
  function start(name, offset, fade) {
    const s = song(name);
    if (!s) return Promise.resolve();
    stopCurrent(fade != null ? fade : 0.3);
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = s.buffer;
    if (s.loopEnd != null) { source.loop = true; source.loopStart = s.loopStart; source.loopEnd = s.loopEnd; }
    source.connect(gain); gain.connect(master);
    const at = offset || 0;
    source.start(ctx.currentTime, at);
    current = { name, source, gain, startedAt: ctx.currentTime - at, loopStart: s.loopStart, loopEnd: s.loopEnd };
    return new Promise((resolve) => { source.onended = () => resolve(); });
  }

  // Where the music is now, in seconds into its buffer.
  function position(c) {
    let t = ctx.currentTime - c.startedAt;
    if (c.loopEnd != null && t > c.loopEnd) t = c.loopStart + ((t - c.loopStart) % (c.loopEnd - c.loopStart));
    return t;
  }

  const GameAudio = {
    music(name) {
      wanted = name || null;
      if (!enabled || !ctx || !window.MUSIC_DATA || fanfareDepth) return;
      if (!name) { stopCurrent(0.5); return; }
      if (current && current.name === name) return;
      start(name);
    },
    // A jingle over the music: the music stops, the jingle plays, the music
    // carries on from where it was. Resolves when the jingle is done.
    async fanfare(name) {
      if (!enabled || !ctx || !window.MUSIC_DATA || ctx.state !== "running") return;
      const before = current && { name: current.name, at: position(current) };
      fanfareDepth++;
      await start(name, 0, 0.05);
      fanfareDepth--;
      if (fanfareDepth) return;
      const next = wanted || (before && before.name);
      if (next) start(next, before && before.name === next ? before.at : 0, 0.05);
    },
    // A sound effect (one of tools/build-audio.js's SOUND_EFFECTS), over whatever is playing.
    se(name) {
      if (!enabled || !ctx || !window.MUSIC_DATA || ctx.state !== "running") return;
      const s = song(name);
      if (!s) return;
      const source = ctx.createBufferSource();
      source.buffer = s.buffer;
      source.connect(master);
      source.start();
    },
    cry(species, opts) {
      if (!enabled || !ctx) return;
      // A form (Deoxys-Attack, id 10001) cries as its species (Deoxys-Normal, 386).
      const dex = window.DEX || {};
      let id = dex[species] && dex[species].id;
      if (id >= 10000) {
        const base = String(species).split("-")[0];
        const k = Object.keys(dex).find((n) => dex[n].id < 10000 && (n === base || n.split("-")[0] === base));
        id = k && dex[k].id;
      }
      if (!id || id > 386) return;   // FireRed only has the first 386
      const a = new window.Audio("assets/audio/cries/" + id + ".wav");
      a.volume = 0.8;
      if (opts && opts.faint) { a.preservesPitch = false; a.mozPreservesPitch = false; a.playbackRate = 0.75; }
      a.play().catch(() => {});
    },
    enabled: () => enabled,
    setMono(on) { mono = !!on; setChannels(); },
    now: () => (current ? current.name : null),   // the song playing (or null)
    setEnabled(on) {
      enabled = !!on;
      try { localStorage.setItem(KEY, enabled ? "on" : "off"); } catch (e) { /* storage blocked */ }
      if (!enabled) { if (current) stopCurrent(0.2); }
      else { unlock(); if (wanted && ctx && window.MUSIC_DATA) start(wanted); }
    }
  };
  window.GameAudio = GameAudio;
})();
