// Music, fanfares and cries.
//
//   GameAudio.music("mus_pallet")       // switch the music (no-op if it's already playing)
//   await GameAudio.fanfare("mus_heal") // pause the music, play a jingle, then carry on
//   GameAudio.cry("Pikachu", { faint: true })
//   GameAudio.se("se_ball")             // a sound effect over the music
//   GameAudio.setEnabled(false)         // the Sound option (remembered in this browser)
//   GameAudio.setVolume(0.5)            // the Volume option, 0-1 (music, sound effects and cries)
//
// Songs are FireRed's, played by its sound engine (game/m4a.js) from
// assets/audio/music.js, which loads once the game first wants sound. Johto's
// ("gs_" songs: GameAudio.music("gs_t_wakaba")) are HeartGold's, played by the
// DS's sound player (game/nds-sound.js) from assets/audio/johto-music.js; both
// load the first time a gs_ song is wanted. If they can't, a gs_ song plays
// the FireRed song nearest it instead (FALLBACK), or nothing. Browsers
// only allow sound after the player has pressed a key or tapped, so nothing
// plays before that; the music then starts where the game is.
//
// In Johto (GameAudio.setRegion), FireRed's battle, victory, "eyes meet" and
// jingle songs are asked for by their FireRed names and play as HGSS's
// (JOHTO_SONGS).
(function () {
  const KEY = "pokemon-sound";
  let enabled = true, volume = 1;
  const MASTER = 0.7;   // (the mix's level at full volume)
  try { enabled = localStorage.getItem(KEY) !== "off"; } catch (e) { /* storage blocked */ }

  let ctx = null, master = null, dataLoading = null;
  const cache = new Map();          // song -> { buffer, loopStart, loopEnd }
  let current = null;               // { name, source, gain, startedAt, buffer, loopStart, loopEnd }
  let wanted = null;                // the song the game wants (played once sound can start)
  let fanfareDepth = 0;
  let mono = false;                 // the Option screen's SOUND: MONO
  // How long FireRed lets each fanfare play before the music comes back
  // (sFanfares in src/sound.c, in frames at 60 a second). The Poké Flute's
  // song runs on for 51 seconds; FireRed cuts it off after 450 frames.
  const FANFARE_FRAMES = {
    mus_level_up: 80, mus_obtain_item: 160, mus_evolved: 220, mus_obtain_tmhm: 220, mus_heal: 160,
    mus_obtain_badge: 340, mus_move_deleted: 180, mus_obtain_berry: 120, mus_slots_jackpot: 250,
    mus_slots_win: 150, mus_too_bad: 160, mus_poke_flute: 450, mus_obtain_key_item: 170, mus_dex_rating: 196
  };

  // HGSS's songs that stand in for FireRed's in Johto (its battles, their
  // victories, the trainers' "eyes meet" themes, riding and surfing, and its
  // jingles, as HGSS plays them: field_bgm.c, the battle's PlayBGM calls).
  const JOHTO_SONGS = {
    mus_vs_wild: "gs_vs_norapoke", mus_vs_trainer: "gs_vs_trainer", mus_vs_gym_leader: "gs_vs_gymreader",
    mus_vs_champion: "gs_vs_champ", mus_vs_legend: "gs_vs_kodai",
    mus_victory_wild: "gs_win2", mus_victory_trainer: "gs_win1", mus_victory_gym_leader: "gs_win3",
    mus_encounter_boy: "gs_eye_j_shounen", mus_encounter_girl: "gs_eye_j_shoujo", mus_encounter_rocket: "gs_eye_rocket",
    mus_encounter_rival: "gs_e_rival1", mus_encounter_gym_leader: "gs_eye_j_shounen",
    mus_cycling: "gs_bicycle", mus_surf: "gs_naminori",
    mus_level_up: "gs_me_lvup", mus_obtain_item: "gs_me_item", mus_obtain_key_item: "gs_me_keyitem", mus_obtain_tmhm: "gs_me_waza",
    mus_obtain_badge: "gs_me_badge", mus_heal: "gs_me_asa", mus_evolved: "gs_me_shinkaome", mus_obtain_berry: "gs_me_kinomi",
    mus_move_deleted: "gs_me_wasure", mus_caught_intro: "gs_me_pokeget", mus_caught: "gs_win2", mus_evolution: "gs_shinka", mus_evolution_intro: "gs_shinka"
  };
  // The FireRed song a gs_ song falls back to, if Johto's music can't be had:
  // the first whose pattern fits.
  const FALLBACK = [
    [/^gs_vs_norapoke/, "mus_vs_wild"], [/^gs_vs_gymreader/, "mus_vs_gym_leader"], [/^gs_vs_champ/, "mus_vs_champion"],
    [/^gs_vs_(suicune|entei|raikou|houou|lugia|kodai)/, "mus_vs_legend"], [/^gs_vs_/, "mus_vs_trainer"],
    [/^gs_win2/, "mus_victory_wild"], [/^gs_win3/, "mus_victory_gym_leader"], [/^gs_win/, "mus_victory_trainer"],
    [/^gs_eye_rocket/, "mus_encounter_rocket"], [/^gs_eye_.*(shoujo|maiko)/, "mus_encounter_girl"], [/^gs_eye_/, "mus_encounter_boy"],
    [/^gs_e_rival/, "mus_encounter_rival"],
    [/^gs_me_lvup/, "mus_level_up"], [/^gs_me_keyitem/, "mus_obtain_key_item"], [/^gs_me_(item|tamago_get)/, "mus_obtain_item"],
    [/^gs_me_waza/, "mus_obtain_tmhm"], [/^gs_me_badge/, "mus_obtain_badge"], [/^gs_me_asa/, "mus_heal"],
    [/^gs_me_(shinkaome|pokeget)/, "mus_evolved"], [/^gs_me_kinomi/, "mus_obtain_berry"], [/^gs_me_wasure/, "mus_move_deleted"],
    [/^gs_(p?l?_?bicycle)/, "mus_cycling"], [/^gs_naminori/, "mus_surf"], [/^gs_pokesen|^gs_fs$/, "mus_poke_center"],
    [/^gs_gym/, "mus_gym"], [/^gs_(utsugi|ohkido)_?rabo/, "mus_oak_lab"], [/^gs_game/, "mus_game_corner"],
    [/^gs_kousokusen/, "mus_ss_anne"], [/^gs_(d_)?champroad/, "mus_victory_road"], [/^gs_d_ajito/, "mus_rocket_hideout"],
    [/^gs_shinka/, "mus_evolution"], [/^gs_to_/, "mus_poke_tower"], [/^gs_(d_|ryuunoana)/, "mus_mt_moon"],
    [/^gs_r_/, "mus_route1"], [/^gs_t_wakaba|^gs_t_masara/, "mus_pallet"], [/^gs_[tc]_/, "mus_pewter"]
  ];
  const fallback = (name) => { const f = FALLBACK.find(([re]) => re.test(name)); return f ? f[1] : null; };
  let region = () => null;          // (the game's: where the player is)

  const loadScript = (src) => new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);   // no music, but the game goes on
    document.head.appendChild(s);
  });
  function loadData() {
    if (window.MUSIC_DATA) return Promise.resolve();
    if (!dataLoading) dataLoading = loadScript("assets/audio/music.js");
    return dataLoading;
  }
  // Johto's: the DS's player and HGSS's songs, the first time one's wanted.
  let johtoLoading = null, johtoTried = false;
  function loadJohto() {
    if (!johtoLoading) {
      johtoLoading = (window.NDS ? Promise.resolve(true) : loadScript("game/nds-sound.js"))
        .then((ok) => ok && (window.JOHTO_MUSIC_DATA ? true : loadScript("assets/audio/johto-music.js")))
        .then((ok) => !!(ok && window.NDS && window.JOHTO_MUSIC_DATA));
    }
    return johtoLoading;
  }
  const johtoReady = () => !!(window.NDS && window.JOHTO_MUSIC_DATA);
  const inJohto = () => { try { return region() === "johto"; } catch (e) { return false; } };
  // Whether `name` is (or, here, stands for) one of HGSS's songs.
  const wantsJohto = (name) => !!name && (/^gs_/.test(name) || (!!JOHTO_SONGS[name] && inJohto()));
  // The song that plays for `name` (Johto's loaded, or tried): in Johto,
  // HGSS's for FireRed's; a gs_ song that isn't there, what it falls back to.
  function pick(name) {
    let gs = name, fb;
    if (!/^gs_/.test(name)) {
      if (!JOHTO_SONGS[name] || !inJohto()) return name;
      gs = JOHTO_SONGS[name]; fb = name;
    } else fb = fallback(name);
    return johtoReady() && window.JOHTO_MUSIC_DATA.songs[gs] ? gs : fb;
  }

  // The first key press or tap starts the audio.
  function unlock() {
    if (!enabled) return;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = MASTER * volume;
      setChannels();
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    // (Starting the music the game wants, if it isn't on yet; never over a
    // jingle, which plays to its end, A or no A.)
    loadData().then(() => { if (wanted && !fanfareDepth && (!current || current.name !== wanted)) start(wanted); });
  }
  for (const ev of ["keydown", "pointerdown", "touchstart"]) document.addEventListener(ev, unlock, { capture: true, passive: true });

  // MONO mixes both sides together (the speakers then play the same).
  function setChannels() {
    if (!master) return;
    master.channelCount = mono ? 1 : 2;
    master.channelCountMode = "explicit";
    master.channelInterpretation = "speakers";
  }

  const seCache = new Map();        // sound effects: small, and played again and again
  function song(name) {
    const isSe = /^se_/.test(name);
    if (isSe && seCache.has(name)) return seCache.get(name);
    if (cache.has(name)) return cache.get(name);
    let r;
    if (/^gs_/.test(name)) {
      const J = window.JOHTO_MUSIC_DATA, data = J && window.NDS && J.songs[name];
      if (!data || !ctx) return null;
      try { r = window.NDS.render(data, J); } catch (e) { return null; }
    } else {
      const data = window.MUSIC_DATA && window.MUSIC_DATA.songs[name];
      if (!data || !ctx) return null;
      r = window.M4A.render(data, window.MUSIC_DATA.bank);
    }
    const buffer = ctx.createBuffer(2, Math.max(1, r.left.length), r.rate);
    buffer.copyToChannel(r.left, 0);
    buffer.copyToChannel(r.right, 1);
    const s = { buffer, loopStart: r.loopStart != null ? r.loopStart / r.rate : null, loopEnd: r.loopEnd != null ? r.loopEnd / r.rate : null };
    if (isSe) { seCache.set(name, s); return s; }
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
    if (wantsJohto(name) && !johtoReady() && !johtoTried) {
      // (Not loaded yet: it starts once it is, if it's still the one wanted.)
      loadJohto().then(() => {
        johtoTried = true;
        if (enabled && ctx && wanted === name && !fanfareDepth && (!current || current.name !== name || current.play !== pick(name))) start(name);
      });
      return Promise.resolve();
    }
    const play = pick(name), s = play && song(play);
    if (!s) return Promise.resolve();
    stopCurrent(fade != null ? fade : 0.3);
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = s.buffer;
    if (s.loopEnd != null) { source.loop = true; source.loopStart = s.loopStart; source.loopEnd = s.loopEnd; }
    source.connect(gain); gain.connect(master);
    const at = offset || 0;
    source.start(ctx.currentTime, at);
    current = { name, play, source, gain, startedAt: ctx.currentTime - at, loopStart: s.loopStart, loopEnd: s.loopEnd };
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
      // (The same song; unless it stands for a different one now: off to or from Johto on a bike.)
      if (current && current.name === name && (johtoTried || !wantsJohto(name)) && current.play === pick(name)) return;
      start(name);
    },
    // A jingle over the music: the music stops, the jingle plays, the music
    // carries on from where it was. Resolves when the jingle is done.
    async fanfare(name) {
      if (!enabled || !ctx || !window.MUSIC_DATA || ctx.state !== "running") return;
      if (wantsJohto(name) && !johtoTried) { await loadJohto(); johtoTried = true; }
      const before = current && { name: current.name, at: position(current) };
      fanfareDepth++;
      const frames = /^gs_/.test(pick(name)) ? 0 : FANFARE_FRAMES[name];   // (HGSS's play to their end)
      await Promise.race([start(name, 0, 0.05)].concat(frames ? [new Promise((r) => setTimeout(r, frames * 1000 / 60))] : []));
      fanfareDepth--;
      if (fanfareDepth) return;
      const next = wanted || (before && before.name);
      if (next) start(next, before && before.name === next ? before.at : 0, 0.05);
      else if (current && current.name === name) stopCurrent(0.05);
    },
    // A sound effect (one of tools/build-audio.js's SOUND_EFFECTS), over whatever is
    // playing; returns how long it lasts (seconds), or nothing if it isn't played.
    se(name) {
      if (!enabled || !ctx || !window.MUSIC_DATA || ctx.state !== "running") return;
      const s = song(name);
      if (!s) return;
      const source = ctx.createBufferSource();
      source.buffer = s.buffer;
      source.connect(master);
      source.start();
      return s.buffer.duration;   // (seconds)
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
      a.volume = 0.8 * volume;
      if (opts && opts.faint) { a.preservesPitch = false; a.mozPreservesPitch = false; a.playbackRate = 0.75; }
      a.play().catch(() => {});
    },
    enabled: () => enabled,
    setMono(on) { mono = !!on; setChannels(); },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, +v || 0));
      if (master) master.gain.setValueAtTime(MASTER * volume, ctx.currentTime);
    },
    now: () => (current ? current.name : null),   // the song playing (or null)
    // Where the player is: a function giving the region ("johto" there), so
    // FireRed's songs play as HGSS's (JOHTO_SONGS) in Johto.
    setRegion(fn) { region = typeof fn === "function" ? fn : () => fn; },
    setEnabled(on) {
      enabled = !!on;
      try { localStorage.setItem(KEY, enabled ? "on" : "off"); } catch (e) { /* storage blocked */ }
      if (!enabled) { if (current) stopCurrent(0.2); }
      else { unlock(); if (wanted && ctx && window.MUSIC_DATA) start(wanted); }
    }
  };
  window.GameAudio = GameAudio;
})();
