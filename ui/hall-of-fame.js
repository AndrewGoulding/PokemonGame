// FireRed's Hall of Fame screen (src/hall_of_fame.c), its records on the PC,
// and the credits (src/credits.c), drawn at 240x160 onto the overlay canvas
// with FireRed's font (GbaMenus.Surface) and pictures (assets/credits/, made
// by tools/build-credits.js).
//
//   await HallOfFame.recordFlash(canvas)         // the Hall of Fame room's record machine lighting up
//   await HallOfFame.show(canvas, entry, opts)   // a new record: the team one by one, "Welcome to the
//     // HALL OF FAME!", confetti, you and "LEAGUE CHAMPION! CONGRATULATIONS!" (A ends it)
//     // entry: League.record(...)'s; opts: { cry, sfx, music, save (async: saves the game),
//     //   player: { name, id, playTimeMs, pic (front picture) } }
//   await HallOfFame.pc(canvas, records, opts)   // the PC's HALL OF FAME: newest team first,
//     // up / down through its Pokémon, A the team before, B leaves
//   await HallOfFame.credits(canvas, opts)       // the credits roll; opts: { skippable (Start or B
//     // skips), cry, music, rival (his name), player: { look } }
//
// The canvas is left black and showing; the caller hides it.
(function () {
  "use strict";

  const W = 240, H = 160;
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const frames = async (n) => { for (let i = 0; i < n; i++) await nextFrame(); };

  const images = {};
  function image(src) {
    if (!images[src]) {
      const img = new Image();
      img.loaded = new Promise((r) => { img.onload = img.onerror = () => r(img); });
      img.src = src;
      images[src] = img;
    }
    return images[src];
  }
  const ok = (img) => img && img.complete && img.naturalWidth > 0;

  // A 240x160 picture to draw into, then onto the canvas with text in FireRed's font.
  function Layer() {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    return { c, g };
  }
  // `layer` onto `canvas`, with `text(surface)` drawn over it and a fade to
  // black (0..16) of everything. (The text is drawn on a clear surface of its
  // own and laid over the pictures: reading pixels back from a canvas with
  // pictures on it isn't allowed when the game runs from files.)
  function present(canvas, layer, text, fade) {
    const g = canvas.getContext("2d");
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(layer.c, 0, 0, canvas.width, canvas.height);
    if (text) {
      const s = GbaMenus.Surface();
      text(s);
      g.drawImage(s.canvas(), 0, 0, canvas.width, canvas.height);
    }
    if (fade) { g.fillStyle = "rgba(0, 0, 0, " + Math.min(16, fade) / 16 + ")"; g.fillRect(0, 0, canvas.width, canvas.height); }
    g.restore();
  }
  // FireRed's text colours: white on the dark parts (sTextColors[0]: the
  // text box palette's white, shadow dark gray), dark gray on white windows.
  const WHITE = [255, 255, 255], GRAY = [98, 98, 98], DARK = [98, 98, 98], LIGHT = [213, 213, 205];

  // Keys while a screen's up: "a", "b", "start", "up", "down" ... (held: down now).
  function input() {
    const KEY = { z: "a", Z: "a", " ": "a", Enter: "a", x: "b", X: "b", Escape: "b", Start: "start", m: "start", M: "start",
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    const pressed = [], held = new Set();
    const down = (e) => {
      const k = KEY[e.key];
      if (!k) return;
      e.preventDefault(); e.stopImmediatePropagation();
      held.add(k);
      if (!e.repeat) pressed.push(k);
    };
    const up = (e) => { const k = KEY[e.key]; if (k) held.delete(k); };
    document.addEventListener("keydown", down, true);
    document.addEventListener("keyup", up, true);
    return {
      take: () => pressed.splice(0),
      held: (k) => held.has(k),
      close: () => { document.removeEventListener("keydown", down, true); document.removeEventListener("keyup", up, true); }
    };
  }

  // ---------- The Hall of Fame screen ----------

  // FireRed's background: blue stripes (a lighter and a darker row), dark
  // bars along the top (16px) and bottom (from 112px): the stripes seen
  // through black at 7/16 (BLDALPHA_BLEND(16, 7)).
  const STRIPES = [[180, 197, 238], [164, 180, 238]];
  const BG_PAL = [181, 197, 239];   // HALL_OF_FAME_BG_PAL, RGB(22, 24, 29)
  function background(g, bars) {
    for (let y = 0; y < H; y++) {
      const c = STRIPES[y & 1], dark = bars && (y < 16 || y >= 112);
      g.fillStyle = dark ? "rgb(" + c.map((v) => Math.round(v * 7 / 16)).join(",") + ")" : "rgb(" + c.join(",") + ")";
      g.fillRect(0, y, W, 1);
    }
  }
  // sHallOfFame_MonFullTeamPositions / HalfTeamPositions: where each one
  // comes from (off screen) and stops (its centre).
  const FULL = [[120, 210, 120, 40], [326, 220, 56, 40], [-86, 220, 184, 40], [120, -62, 120, 88], [-70, -92, 200, 88], [310, -92, 40, 88]];
  const HALF = [[120, 234, 120, 64], [326, 244, 56, 64], [-86, 244, 184, 64]];

  const dexNumber = (species) => {
    const d = window.DEX[species], base = window.DEX[Party.speciesName(species)] || d;
    return d ? (d.id < 10000 ? d.id : base.id) : 0;
  };
  const pad = (n, w, ch) => String(n).padStart(w, ch || "0");
  const genderMark = (g) => (g === "M" ? "♂" : g === "F" ? "♀" : "");
  const monName = (m) => m.nickname || Party.speciesName(m.species);
  // A Pokémon's picture: FireRed's front sprites are 64x64; this game's are
  // 96x96, drawn at their size round the same centre.
  const monPic = (m) => image(Screen.spriteUrl(m.species, m.form || "", false, m.shiny));

  // HallOfFame_PrintMonInfo: "No. 006" and the nickname / species and gender,
  // then "Lv. 63" and "IDNo. 12345", in the bottom bar (window 0: 16, 120).
  function monInfo(s, m) {
    const x0 = 16, y0 = 120;
    s.text("No. " + pad(dexNumber(m.species), 3), x0 + 16, y0 + 1, WHITE, GRAY);
    const name = monName(m);
    s.text(name, x0 + 128 - s.textWidth(name), y0 + 1, WHITE, GRAY);
    s.text("/" + Party.speciesName(m.species) + genderMark(m.gender), x0 + 128, y0 + 1, WHITE, GRAY);
    s.text("Lv. " + m.level, x0 + 32, y0 + 17, WHITE, GRAY);
    s.text("IDNo. " + pad((m.ot && m.ot.id) || 0, 5), x0 + 96, y0 + 17, WHITE, GRAY);
  }
  // A picture tinted most of the way to the background (BeginNormalPaletteFade(.., 12, 12, HALL_OF_FAME_BG_PAL)).
  function tinted(img, amount) {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = "rgba(" + BG_PAL.join(",") + "," + amount / 16 + ")";
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  const drawCentered = (g, pic, x, y) => {
    const w = pic.naturalWidth || pic.width, h = pic.naturalHeight || pic.height;
    g.drawImage(pic, Math.round(x - w / 2), Math.round(y - h / 2));
  };

  // The confetti (Hof_SpawnConfetti / SpriteCB_Confetti): 17 pieces, falling
  // and swaying, one more every 4 frames.
  function confetti() {
    const pieces = [], sheet = image("assets/credits/confetti.png");
    return {
      spawn() { pieces.push({ x: Math.random() * 240, y: -Math.floor(Math.random() * 8), y2: 0, t: 0, fast: Math.random() < 0.25 ? 1 : 0, frame: Math.floor(Math.random() * 17) }); },
      step() {
        for (const p of pieces) { p.y2 += 1 + p.fast; p.t = (p.t + 4) & 255; p.x2 = (Math.floor(Math.random() * 4) + 8) * Math.sin(p.t / 256 * 2 * Math.PI); }
        for (let i = pieces.length - 1; i >= 0; i--) if (pieces[i].y2 > 120) pieces.splice(i, 1);
      },
      draw(g) { if (ok(sheet)) for (const p of pieces) g.drawImage(sheet, 0, p.frame * 8, 8, 8, Math.round(p.x + (p.x2 || 0) - 4), Math.round(p.y + p.y2 - 4), 8, 8); }
    };
  }

  async function recordFlash(canvas) {
    // (FLDEFF_HALL_OF_FAME_RECORD: the machine's lights blink; here the room
    // flashes a little brighter, a few times.)
    const g = canvas.getContext("2d");
    canvas.classList.remove("hidden");
    for (let n = 0; n < 6; n++) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      if (n % 2 === 0) { g.fillStyle = "rgba(255, 255, 255, 0.35)"; g.fillRect(0, 0, canvas.width, canvas.height); }
      await frames(8);
    }
    g.clearRect(0, 0, canvas.width, canvas.height);
    canvas.classList.add("hidden");
  }

  async function show(canvas, entry, opts) {
    const team = entry.team.filter(Boolean), keys = input();
    const pics = team.map(monPic), player = opts.player || {};
    const playerPic = image("assets/sprites/trainers/front/" + (player.pic || "player_character") + ".png");
    await Promise.all(pics.map((p) => p.loaded).concat([playerPic.loaded, image("assets/credits/confetti.png").loaded]));
    canvas.classList.remove("hidden");
    const L = Layer(), places = team.length > 3 ? FULL : HALF;
    const mons = team.map((m, i) => ({ m, pic: pics[i], faded: tinted(pics[i], 12), x: places[i][0], y: places[i][1], tx: places[i][2], ty: places[i][3], on: false, dim: false }));
    let info = null, welcome = false, playerAt = null, showPlayer = false;
    const fx = confetti();
    const draw = (fade) => {
      background(L.g, true);
      // (The ones already shown behind, faded toward the background; the new one in front.)
      for (const o of mons) if (o.on && o.dim) drawCentered(L.g, o.faded, o.x, o.y);
      for (const o of mons) if (o.on && !o.dim) drawCentered(L.g, ok(o.pic) ? o.pic : o.faded, o.x, o.y);
      if (playerAt != null && ok(playerPic)) drawCentered(L.g, playerPic, playerAt, 72);
      fx.draw(L.g);
      present(canvas, L, (s) => {
        if (info) monInfo(s, info);
        if (welcome) { const t = "Welcome to the HALL OF FAME!"; s.text(t, 16 + Math.floor((208 - s.textWidth(t)) / 2), 121, WHITE, GRAY); }
        if (showPlayer) playerInfo(s);
      }, fade);
    };
    // HallOfFame_PrintPlayerInfo: NAME, IDNo. and TIME in a window (tiles 2, 2; 17 x 6).
    const playerInfo = (s) => {
      const fr = window.GBA_MENUS.frames.std;
      s.frame("std", fr.palette, 2, 2, 17, 6);
      s.fill(16, 16, 136, 48, [255, 255, 255]);
      const right = 16 + 136 - 6;
      s.text("NAME", 16 + 4, 16 + 3, DARK, LIGHT);
      s.text(player.name || "", right - s.textWidth(player.name || ""), 16 + 3, DARK, LIGHT);
      s.text("IDNo.", 16 + 4, 16 + 18, DARK, LIGHT);
      s.text(pad(player.id || 0, 5), right - 30, 16 + 18, DARK, LIGHT);
      const mins = Math.floor((player.playTimeMs || 0) / 60000), hh = Math.min(999, Math.floor(mins / 60));
      s.text("TIME", 16 + 4, 16 + 32, DARK, LIGHT);
      s.text(String(hh).padStart(3, " ") + ":" + pad(mins % 60, 2), right - 36, 16 + 32, DARK, LIGHT);
    };

    // The screen fades in from black, to the Hall of Fame's music.
    if (opts.music) opts.music("mus_hall_of_fame");
    for (let f = 16; f >= 0; f--) { draw(f); await nextFrame(); }
    // Task_Hof_InitTeamSaveData: "SAVING… DON'T TURN OFF THE POWER."
    if (opts.save) {
      Screen.say("Saving…\nDon't turn off the power.");
      await Screen.printed();
      await opts.save();
      if (opts.sfx) opts.sfx("se_save");
      await frames(32);
      Screen.say("");
    }
    // One by one: in from the side, its cry and its details, two seconds.
    for (const o of mons) {
      o.on = true;
      info = null;
      while (o.x !== o.tx || o.y !== o.ty) {
        if (o.x < o.tx) o.x = Math.min(o.tx, o.x + 15); else if (o.x > o.tx) o.x = Math.max(o.tx, o.x - 15);
        if (o.y < o.ty) o.y = Math.min(o.ty, o.y + 10); else if (o.y > o.ty) o.y = Math.max(o.ty, o.y - 10);
        draw(); await nextFrame();
      }
      if (opts.cry) opts.cry(o.m.species);
      info = o.m;
      for (let t = 0; t < 120; t++) { draw(); await nextFrame(); }
      o.dim = true;
    }
    // All of them, "Welcome to the HALL OF FAME!", applause and confetti.
    info = null; welcome = true;
    for (const o of mons) o.dim = false;
    if (opts.sfx) opts.sfx("se_applause");
    for (let t = 400; t > 0; t--) {
      if ((t & 3) === 0 && t > 110) fx.spawn();
      fx.step(); draw(); await nextFrame();
    }
    // Then they fade back, and you're there in the middle, moving over to the right.
    welcome = false;
    for (const o of mons) o.dim = true;
    playerAt = 120;
    for (let t = 0; t < 120; t++) { draw(); await nextFrame(); }
    while (playerAt < 192) { playerAt++; draw(); await nextFrame(); }
    showPlayer = true;
    draw();
    keys.close();
    await Screen.read("LEAGUE CHAMPION!\nCONGRATULATIONS!");
    Screen.say("");
    if (opts.music) opts.music(null);
    for (let f = 0; f <= 16; f++) { draw(f); await nextFrame(); await nextFrame(); }
  }

  // ---------- The PC's HALL OF FAME ----------
  //
  // Task_HofPC_*: the newest team first, all of them up at once, faded but
  // the one picked; "HALL OF FAME No. N" along the top; up / down pick one
  // (its cry and details), A shows the team before it (or leaves after the
  // oldest), B leaves.
  async function pc(canvas, records, opts) {
    canvas.classList.remove("hidden");
    const L = Layer(), keys = input();
    if (!records.length) {
      background(L.g, true);
      present(canvas, L);
      keys.close();
      await Screen.read("The Hall of Fame data is corrupted.");
      Screen.say("");
      return;
    }
    let ti = records.length - 1;
    try {
      for (;;) {
        const entry = records[ti], team = entry.team.filter(Boolean), places = team.length > 3 ? FULL : HALF;
        const pics = team.map(monPic);
        await Promise.all(pics.map((p) => p.loaded));
        const faded = pics.map((p) => tinted(p, 12));
        let cur = 0, next = null;
        const draw = () => {
          background(L.g, true);
          team.forEach((m, i) => { if (i !== cur) drawCentered(L.g, faded[i], places[i][2], places[i][3]); });
          drawCentered(L.g, ok(pics[cur]) ? pics[cur] : faded[cur], places[cur][2], places[cur][3]);
          present(canvas, L, (s) => {
            s.fill(0, 0, W, 16, [255, 255, 255]);
            s.text("HALL OF FAME No. " + entry.number, 2, 1, DARK, LIGHT);
            const help = ti > 0 ? "{DPAD_UPDOWN}Pick {A_BUTTON}Next {B_BUTTON}Back" : "{DPAD_UPDOWN}Pick {A_BUTTON}{B_BUTTON}Cancel";
            s.text(help, W - 2 - s.textWidth(help, "small"), 3, DARK, LIGHT, "small", window.GBA_MENUS.palettes.std2);
            monInfo(s, team[cur]);
          });
        };
        const pick = (i) => { cur = i; if (opts.cry) opts.cry(team[cur].species); draw(); };
        pick(0);
        while (next === null) {
          await nextFrame();
          for (const k of keys.take()) {
            if (k === "up" && cur > 0) pick(cur - 1);
            else if (k === "down" && cur < team.length - 1) pick(cur + 1);
            else if (k === "a") next = ti > 0 ? ti - 1 : -1;
            else if (k === "b") next = -1;
            if (next !== null) break;
          }
        }
        if (next < 0) break;
        ti = next;
      }
    } finally { keys.close(); }
    if (opts.sfx) opts.sfx("se_pc_off");
  }

  // ---------- The credits ----------

  // sCreditsTexts: [title, names], each as FireRed lays it out over seven
  // lines (blank lines placing it).
  const CREDITS = {
    DIRECTOR: ["\n\nDirector\n\n\n\n", "\n\n\nJunichi Masuda\n\n\n"],
    ART_DIRECTOR: ["\nArt Director\n\nBattle Director\n\n\n", "\n\nKen Sugimori\n\nShigeki Morimoto\n\n"],
    LEADERS: ["Program Leader\n\nPlanning Leader\n\nGraphic Design Leader\n\n", "\nTetsuya Watanabe\n\nKoji Nishino\n\nTakao Unno\n"],
    PROGRAMMERS: ["Programmers\n\n\n\n\n", "\nHiroyuki Nakamura\nMasao Taya\nSatoshi Nohara\nMiyuki Iwasawa\nDaisuke Goto\n"],
    SYSTEM_PROGRAMMERS: ["System Programmers\n\n\n\n\n\n", "\nTetsuya Watanabe\nAkito Mori\nHisashi Sogabe\nSousuke Tamada\n\n"],
    GRAPHIC_DESIGNERS: ["Graphic Designers\n\n\n\n\n\n", "\nTakao Unno\nAsuka Iwashita\nKanako Eo\nHiroki Fuchino\n\n"],
    GRAPHIC_DESIGNERS_2: ["\nGraphic Designers\n\n\n\n\n", "\n\nKen Sugimori\nHironobu Yoshida\n\n\n"],
    MUSIC: ["\nMusic Composition\n\n\n\n\n", "\n\nGo Ichinose\nJunichi Masuda\n\n\n"],
    SOUND_EFFECTS: ["\n\nSound Effects\n\n\n\n", "\n\n\nGo Ichinose\n\n\n"],
    GAME_DESIGNERS: ["\nGame Designers\n\n\n\n\n", "\n\nJunichi Masuda\nKoji Nishino\nTetsuji Ohta\n\n"],
    GAME_DESIGNERS_2: ["\nGame Designers\n\n\n\n\n", "\n\nHitomi Sato\nShigeru Ohmori\nTadashi Takahashi\n\n"],
    SCENARIO: ["\nGame Scenario\n\n\n\n\n", "\n\nHitomi Sato\nSatoshi Tajiri\n\n\n"],
    SCRIPT: ["\nScript Designer\n\nMap Designer\n\n\n", "\n\nSatoshi Nohara\n\nShigeru Ohmori\n\n"],
    PARAMETRIC: ["\nParametric Designers\n\n\n\n\n", "\n\nKoji Nishino\nTetsuji Ohta\nShigeki Morimoto\n\n"],
    POKEDEX_TEXT: ["\n\nPokédex Text\n\n\n\n", "\n\n\nKenji Matsushima\n\n\n"],
    MON_DESIGNERS: ["Pokémon Designers\n\n\n\n\n\n", "\nKen Sugimori\nMotofumi Fujiwara\nShigeki Morimoto\nHironobu Yoshida\n\n"],
    MON_DESIGNERS_2: ["Pokémon Designers\n\n\n\n\n\n", "\nSatoshi Ohta\nAsuka Iwashita\nTakao Unno\nKanako Eo\nAimi Tomita\n"],
    MON_DESIGNERS_3: ["Pokémon Designers\n\n\n\n\n\n", "\nAtsuko Nishida\nMuneo Saito\nRena Yoshikawa\nJun Okutani\n\n"],
    SUPPORTING: ["Supporting Programmers\n\n\n\n", "\nTeruyuki Yoshioka\nTakao Nakano\n\nSatoshi Mitsuhara\nDaisuke Hoshino\n"],
    NCL: ["\n\nNCL Product Testing\n\n\n\n", "\n\n\nNCL Super Mario Club\n\n\n"],
    THANKS: ["Special Thanks\n\n\n\n\n\n", "\nHiro Nakamura\nHiroyuki Uesugi\nTeruki Murakawa\n\nKazuya Suyama\n"],
    THANKS_2: ["Special Thanks\n\n\n\n\n\n", "\nKenji Tominaga\n\nKenjiro Ito\nTomotaka Komura\nMichiko Takizawa\n"],
    THANKS_3: ["Special Thanks\n\n\n\n\n\n", "\nMakiko Takada\nMikiko Ohashi\nShusaku Egami\nTakanao Kondo\nRui Kawaguchi\n"],
    BRAILLE: ["\n\nBraille Code Check\n\n\n\n", "\n\n\nJapan Braille Library\n\n\n"],
    SUPERVISORS: ["Information Supervisors\n\n\n\n\n\n", "\nHiroki Enomoto\nKazuyuki Terada\nYuri Sakurai\nYumi Funasaka\nNaoko Yanase\n"],
    COORDINATORS: ["Coordinators\n\n\n\n\n\n", "\nAzusa Tajima\nAkira Kinashi\nKazuki Yoshihara\n\nRetsuji Nomoto\n"],
    TASK_MANAGERS: ["\nTask Managers\n\n\n\n\n", "\n\nHitoshi Yamagami\nGakuji Nomoto\n\n\n"],
    PRODUCERS: ["\nProducers\n\n\n\n\n", "\n\nHiroyuki Jinnai\nTakehiro Izushi\nHiroaki Tsuru\n\n"],
    EXEC_DIRECTOR: ["\n\nExecutive Director\n\n\n\n", "\n\n\nSatoshi Tajiri\n\n\n"],
    EXEC_PRODUCER: ["\n\nExecutive Producer\n\n\n\n", "\n\n\nSatoru Iwata\n\n\n"],
    EXEC_PRODUCER_2: ["\n\nExecutive Producer\n\n\n\n", "\n\n\nTsunekaz Ishihara\n\n\n"],
    ENGLISH: ["\nEnglish Version Coordinators\n\n\n\n\n", "\n\nHiro Nakamura\nSeth McMahill\n\n\n"],
    TRANSLATOR: ["\nTranslator\n\nText Editor\n\n\n", "\n\nNob Ogasawara\n\nTeresa Lillygren\n\n"],
    PROGRAMMERS_2: ["Programmers\n\n\n\n\n\n", "\nTeruki Murakawa\nSouichi Yamamoto\nYuichiro Ito\nAkira Kinashi\n\n"],
    TOOLS: ["\nEnvironment & Tool Programmers\n\n\n\n\n", "\n\nTeruki Murakawa\nSouichi Yamamoto\nKimiko Nakamichi\n\n"],
    NOA: ["NOA Product Testing\n\n\n\n\n\n", "\nThomas Hertzog\nKathy Huguenard\nMika Kurosawa\n\n\n"],
    BRAILLE_2: ["Braille Code Check\n\n\n\n\n\n", "\nNational Federation\n   of the Blind\nPatricia A. Maurer\nJapan Braille Library\nEuropean Blind Union\n"],
    BRAILLE_3: ["\nBraille Code Check\n\n\n\n\n", "\n\nNational Information Library\n      Service\nMargaret Campion\n\n"],
    THANKS_4: ["Special Thanks\n\n\n\n\n\n", "\nTakehiro Izushi\nMotoyasu Tojima\nHitoshi Yamagami\nHiroyuki Uesugi\n\n"],
    THANKS_5: ["Special Thanks\n\n\n\n\n\n", "\nNicola Pratt-Barlow\nShellie Dow\nAnthony Howitt\nNaoko Saeki\nKyoko Onishi\n"],
    BRAILLE_4: ["\nBraille Code Check\n\n\n\n\n", "\n\nThe Royal New Zealand\nFoundation of the Blind\nGreg Moran\n\n"],
    GRAPHIC_DESIGNER: ["\n\nGraphic Designer\n\n\n\n", "\n\n\nAkira Kinashi\n\n\n"],
    DUMMY: ["", ""]
  };
  // sOverworldMapScenes: each map, where the camera starts (its centre, in
  // tiles) and which way it pans.
  const SCENES = {
    ROUTE23: ["Route23", 11, 107, 0, 1], VIRIDIAN: ["ViridianCity", 30, 34, 0, -1], PEWTER: ["PewterCity", 20, 26, 0, -1],
    CERULEAN: ["CeruleanCity", 8, 6, 1, 1], ROUTE25: ["Route25", 25, 6, 1, 0], VERMILION: ["VermilionCity", 9, 7, 1, 1],
    ROUTE10: ["Route10", 11, 68, 0, 1], CELADON: ["CeladonCity", 48, 16, -1, 0], SAFFRON: ["SaffronCity", 39, 5, 0, 1],
    ROUTE17: ["Route17", 7, 43, 0, 1], FUCHSIA: ["FuchsiaCity", 28, 5, 0, 1], CINNABAR: ["CinnabarIsland", 13, 17, 0, -1],
    ROUTE21: ["Route21_North", 8, 20, 0, -1]
  };
  // sCreditsScript: [command, what, frames].
  const SCRIPT = [
    ["mapnext", "ROUTE23", 16], ["print", "DIRECTOR", 300], ["print", "ART_DIRECTOR", 300], ["print", "LEADERS", 300], ["print", "DUMMY", 60],
    ["mapnext", "VIRIDIAN", 0], ["print", "PROGRAMMERS", 211], ["print", "SYSTEM_PROGRAMMERS", 211], ["print", "GRAPHIC_DESIGNERS", 211],
    ["mapnext", "PEWTER", 0], ["print", "GRAPHIC_DESIGNERS_2", 211], ["print", "MUSIC", 210], ["print", "SOUND_EFFECTS", 210],
    ["mon", "charizard"], ["map", "CERULEAN", 16, "player"], ["print", "GAME_DESIGNERS", 211], ["print", "GAME_DESIGNERS_2", 210], ["print", "SCENARIO", 210],
    ["mapnext", "ROUTE25", 16], ["print", "SCRIPT", 211], ["print", "PARAMETRIC", 210], ["print", "POKEDEX_TEXT", 210],
    ["mapnext", "VERMILION", 16], ["print", "MON_DESIGNERS", 211], ["print", "MON_DESIGNERS_2", 210], ["print", "MON_DESIGNERS_3", 210],
    ["mon", "venusaur"], ["map", "ROUTE10", 16, "player"], ["print", "SUPPORTING", 211], ["print", "NCL", 210], ["print", "THANKS", 210],
    ["mapnext", "CELADON", 16], ["print", "THANKS_2", 221], ["print", "THANKS_3", 221], ["print", "BRAILLE", 221], ["print", "SUPERVISORS", 221], ["print", "DUMMY", 51],
    ["mapnext", "SAFFRON", 16], ["print", "COORDINATORS", 211], ["print", "TASK_MANAGERS", 210], ["print", "PRODUCERS", 210],
    ["mon", "blastoise"], ["map", "ROUTE17", 16, "rival"], ["print", "EXEC_DIRECTOR", 331], ["print", "EXEC_PRODUCER", 331], ["print", "EXEC_PRODUCER_2", 331],
    ["mapnext", "FUCHSIA", 16], ["print", "ENGLISH", 221], ["print", "TRANSLATOR", 221], ["print", "PROGRAMMERS_2", 221], ["print", "TOOLS", 221], ["print", "DUMMY", 52],
    ["mapnext", "CINNABAR", 16], ["print", "GRAPHIC_DESIGNER", 210], ["print", "NOA", 210], ["print", "BRAILLE_2", 211],
    ["mon", "pikachu"], ["map", "ROUTE21", 16, "player"], ["print", "BRAILLE_3", 221], ["print", "BRAILLE_4", 221], ["print", "THANKS_4", 221], ["print", "THANKS_5", 221], ["print", "DUMMY", 52],
    ["theend", 224]
  ];
  const MON_SPECIES = { charizard: "Charizard", venusaur: "Venusaur", blastoise: "Blastoise", pikachu: "Pikachu" };
  const HEADER = [255, 189, 115];   // (sTextColor_Header: the std menu palette's orange)

  async function credits(canvas, opts) {
    canvas.classList.remove("hidden");
    const keys = input(), L = Layer();
    let skip = false;
    const tick = async () => {
      await nextFrame();
      for (const k of keys.take()) if (opts.skippable && (k === "start" || k === "b")) skip = true;
    };
    const wait = async (n) => { for (let i = 0; i < n && !skip; i++) { draw(); await tick(); } };
    // What's on screen: a map scene (its camera, panning a pixel every other
    // frame) with the darkened band and text, or nothing.
    let scene = null, text = null, textFade = 16, runner = null, frame = 0;
    const playerRun = image("assets/world/sprites/player_" + ((opts.player && opts.player.look) || "custom") + "_run.png");
    const rivalRun = image("assets/credits/rival.png");
    const draw = (fade) => {
      frame++;
      L.g.fillStyle = "#000"; L.g.fillRect(0, 0, W, H);
      if (scene) {
        const m = window.WORLD_MAPS[scene.map], below = image("assets/world/maps/" + scene.map + ".png"), top = image("assets/world/maps/" + scene.map + "-top.png");
        const border = image("assets/world/maps/" + scene.map + "-border.png");
        if (frame % 2 === 0) { scene.cx += scene.dx; scene.cy += scene.dy; }
        const ox = Math.round(112 - scene.cx), oy = Math.round(64 - scene.cy);
        if (ok(border)) {
          const bw = border.naturalWidth, bh = border.naturalHeight;
          for (let y = ((oy % bh) + bh) % bh - bh; y < H; y += bh) for (let x = ((ox % bw) + bw) % bw - bw; x < W; x += bw) L.g.drawImage(border, x, y);
        }
        // (The map, and the ones joined to it, as the overworld draws them:
        // Route 10's scene runs on down into Lavender Town.)
        const maps = [[scene.map, 0, 0]].concat(((m && m.connections) || []).map((c) => {
          const o = window.WORLD_MAPS[c.map], at = (c.offset || 0) * 16;
          if (!o || !m) return null;
          return c.direction === "down" ? [c.map, at, m.height * 16] : c.direction === "up" ? [c.map, at, -o.height * 16]
            : c.direction === "left" ? [c.map, -o.width * 16, at] : c.direction === "right" ? [c.map, m.width * 16, at] : null;
        }).filter(Boolean));
        for (const [k, x, y] of maps) { const img = k === scene.map ? below : image("assets/world/maps/" + k + ".png"); if (ok(img)) L.g.drawImage(img, ox + x, oy + y); }
        for (const [k, x, y] of maps) {
          const img = k === scene.map ? top : image("assets/world/maps/" + k + "-top.png");
          if ((window.WORLD_MAPS[k] || {}).top && ok(img)) L.g.drawImage(img, ox + x, oy + y);
        }
        // (The darkened band, rows 36 to 124: BLDY 10 toward black.)
        L.g.fillStyle = "rgba(0, 0, 0, " + 10 / 16 + ")";
        L.g.fillRect(0, 36, W, 88);
        // Someone running along the bottom of the band (LoadPlayerOrRivalSprite).
        if (runner === "rival" && ok(rivalRun)) L.g.drawImage(rivalRun, 0, (Math.floor(frame / 8) % 6) * 64, 64, 64, W - 64, 124 - 64, 64, 64);
        if (runner === "player" && ok(playerRun)) {
          const f = [7, 8, 6][Math.floor(frame / 8) % 3] || 6;   // (running left: its stride poses, scaled up)
          L.g.save(); L.g.translate(W - 8, 124 - 64); L.g.scale(-2, 2);
          L.g.drawImage(playerRun, f * 16, 0, 16, 32, 0, 0, 16, 32); L.g.restore();
        }
      }
      present(canvas, L, (s) => {
        if (!scene || !text) return;
        const fadeTo = (c) => c.map((v) => Math.round(v * (16 - textFade) / 16));
        text[0].split("\n").forEach((line, i) => { if (line) s.text(line, 2, 32 + 6 + i * 14, fadeTo(HEADER), fadeTo(GRAY)); });
        text[1].split("\n").forEach((line, i) => { if (line) s.text(line, 8 + 16, 32 + 6 + i * 14, fadeTo(WHITE), fadeTo(GRAY)); });
      }, fade);
    };
    const setScene = (key) => {
      const [map, x, y, dx, dy] = SCENES[key];
      scene = { map, cx: x * 16, cy: y * 16, dx, dy };
      const joined = ((window.WORLD_MAPS[map] || {}).connections || []).map((c) => c.map);
      return Promise.all(["", "-top", "-border"].map((p) => image("assets/world/maps/" + map + p + ".png").loaded)
        .concat(joined.flatMap((k) => ["", "-top"].map((p) => image("assets/world/maps/" + k + p + ".png").loaded))));
    };
    const fadeScreen = async (from, to) => { const st = from < to ? 1 : -1; for (let f = from; f !== to + st && !skip; f += st) { draw(f); await tick(); } };

    // The Pokémon (DoCreditsMonScene): out of black onto its Poké Ball, the
    // small picture, then the big one, its cry, and back to black.
    async function monScene(mon) {
      const ball = image("assets/credits/pokeball_" + mon + ".png"), small = image("assets/credits/" + mon + "_1.png"), big = image("assets/credits/" + mon + "_2.png");
      await Promise.all([ball.loaded, small.loaded, big.loaded]);
      let pic = small, circle = 0;
      const drawMon = (fade) => {
        L.g.fillStyle = "#000"; L.g.fillRect(0, 0, W, H);
        if (pic === big && ok(ball)) L.g.drawImage(ball, 0, 0);
        if (circle) { L.g.fillStyle = "#fff"; L.g.beginPath(); L.g.arc(120, 80, 56 * circle, 0, 2 * Math.PI); L.g.fill(); }
        if (ok(pic)) drawCentered(L.g, pic, 120, 80);
        present(canvas, L, null, fade);
      };
      circle = 0;
      for (let f = 16; f >= 0 && !skip; f--) { drawMon(f); await tick(); }
      for (let t = 0; t < 48 && !skip; t++) { drawMon(); await tick(); }
      for (let c = 1; c <= 16 && !skip; c++) { circle = c / 16; drawMon(); await tick(); }
      for (let t = 0; t < 32 && !skip; t++) { drawMon(); await tick(); }
      circle = 0; pic = big;
      if (opts.cry) opts.cry(MON_SPECIES[mon]);
      for (let t = 0; t < 128 && !skip; t++) { drawMon(); await tick(); }
      for (let f = 0; f <= 16 && !skip; f++) { drawMon(f); await tick(); }
    }

    try {
      if (opts.music) opts.music("mus_credits");
      // The title over the Indigo Plateau (CREDITSSCENE_PRINT_TITLE_STAFF).
      await setScene("ROUTE23");
      scene = Object.assign(scene, { map: "IndigoPlateau_Exterior", cx: 11 * 16, cy: 9 * 16, dx: 0, dy: 0 });
      await Promise.all(["", "-top", "-border"].map((p) => image("assets/world/maps/IndigoPlateau_Exterior" + p + ".png").loaded));
      runner = "player";
      text = ["\n\nPokémon FireRed Version\n\n          Staff\n", ""];
      textFade = 0;
      await fadeScreen(16, 0);
      await wait(100 + 360);
      runner = null;
      for (const [cmd, what, n, who] of SCRIPT) {
        if (skip) break;
        if (cmd === "print") {
          for (textFade = 0; textFade <= 16 && !skip; textFade += 2) { draw(); await tick(); }   // (the old words fade out)
          text = CREDITS[what];
          for (textFade = 16; textFade >= 0 && !skip; textFade -= 2) { draw(); await tick(); }
          await wait(n);
        } else if (cmd === "mapnext" || cmd === "map") {
          if (cmd === "mapnext") await fadeScreen(0, 16);
          text = null;
          await setScene(what);
          runner = who || null;
          await fadeScreen(16, 0);
          await wait(n);
        } else if (cmd === "mon") {
          await fadeScreen(0, 16);
          scene = null; text = null; runner = null;
          await monScene(what);
        } else if (cmd === "theend") {
          await fadeScreen(0, 16);
          scene = null; text = null; runner = null;
          const end = image("assets/credits/the_end.png");
          await end.loaded;
          const drawEnd = (fade) => { L.g.fillStyle = "#000"; L.g.fillRect(0, 0, W, H); if (ok(end)) L.g.drawImage(end, 0, 0); present(canvas, L, null, fade); };
          for (let f = 16; f >= 0 && !skip; f--) { drawEnd(f); await tick(); }
          for (let t = 0; t < 240 && !skip; t++) { drawEnd(); await tick(); }
          // (CREDITSSCENE_WAITBUTTON: A, or ten seconds.)
          for (let t = 0; t < 600 && !skip; t++) {
            drawEnd(); await nextFrame();
            if (keys.take().some((k) => k === "a" || k === "start")) break;
          }
        }
      }
    } finally { keys.close(); }
    if (opts.music) opts.music(null);
    const g = canvas.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#000"; g.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ---------- Emerald's credits (pokeemerald's src/credits.c) ----------
  // You bike through Hoenn while the names roll: along the sea in the morning and at sunset, through
  // the forest at sunset (where your rival catches you up, then you catch them up), and through town at
  // night; between the rides, the Pokémon you caught (71 slides, your starter the last) on Prof.
  // Birch's grass. The pages (data/credits.h: [isTitle, text] a line, 16 apart from row 77, centred):
  // nine scenes, one every sixth page. The pictures: assets/credits/emerald (tools/build-emerald-credits.js).
  const EMERALD_PAGES = [
    [[1, "POKéMON EMERALD VERSION"], [1, "Credits"]],
    [[1, "Director"], [0, "Shigeki Morimoto"]],
    [[1, "Art Director"], [0, "Ken Sugimori"]],
    [[1, "World Director"], [0, "Junichi Masuda"]],
    [[1, "Lead Programmer"], [0, "Hisashi Sogabe"], [1, "Lead Graphic Artist"], [0, "Motofumi Fujiwara"]],
    [[1, "Programmers"], [0, "Hisashi Sogabe"], [0, "Tomomichi Ohta"], [0, "Nozomu Saito"]],
    [[1, "Programmers"], [0, "Akito Mori"], [0, "Hiroyuki Nakamura"], [0, "Masao Taya"]],
    [[1, "Programmers"], [0, "Satoshi Nohara"], [0, "Miyuki Iwasawa"], [0, "Yoshinori Matsuda"], [0, "Keita Kagaya"]],
    [[1, "Programmers"], [0, "Tetsuya Watanabe"], [0, "Sosuke Tamada"], [0, "Takenori Ohta"]],
    [[1, "Graphic Designers"], [0, "Motofumi Fujiwara"], [0, "Satoshi Ohta"]],
    [[1, "Graphic Designers"], [0, "Kenkichi Toyama"], [0, "Asuka Iwashita"], [0, "Takao Unno"]],
    [[1, "Graphic Designers"], [0, "Ken Sugimori"], [0, "Hironobu Yoshida"], [0, "Aimi Tomita"], [0, "Kanako Eo"]],
    [[1, "Music Composition"], [0, "Go Ichinose"], [0, "Junichi Masuda"], [0, "Morikazu Aoki"], [0, "Hitomi Sato"]],
    [[1, "Sound Effects & POKéMON Voices"], [0, "Go Ichinose"], [0, "Morikazu Aoki"]],
    [[1, "Game Designers"], [0, "Shigeki Morimoto"], [0, "Teruyuki Shimoyamada"], [0, "Takeshi Kawachimaru"], [0, "Akihito Tomisawa"]],
    [[1, "Game Designers"], [0, "Suguru Nakatsui"], [0, "Tetsuji Ohta"], [0, "Hitomi Sato"], [0, "Kenji Matsushima"]],
    [[1, "Game Designers"], [0, "Junichi Masuda"], [0, "Koji Nishino"], [0, "Shigeru Ohmori"], [0, "Tadashi Takahashi"]],
    [[1, "Scenario Plot"], [0, "Akihito Tomisawa"], [0, "Junichi Masuda"], [0, "Koji Nishino"]],
    [[1, "Scenario"], [0, "Akihito Tomisawa"], [0, "Hitomi Sato"], [0, "Toshinobu Matsumiya"]],
    [[1, "Script Designers"], [0, "Tomomichi Ohta"], [0, "Satoshi Nohara"]],
    [[1, "Map Designers"], [0, "Suguru Nakatsui"], [0, "Teruyuki Shimoyamada"], [0, "Shigeru Ohmori"], [0, "Tetsuji Ohta"]],
    [[1, "Battle Frontier Data"], [0, "Tetsuji Ohta"]],
    [[1, "Parametric Designers"], [0, "Teruyuki Shimoyamada"], [0, "Shigeki Morimoto"], [0, "Tetsuji Ohta"], [0, "Koji Nishino"]],
    [[1, "POKéDEX Text"], [0, "Kenji Matsushima"]],
    [[1, "Environment & Tool Programmers"], [0, "Hisashi Sogabe"], [0, "Sosuke Tamada"], [0, "Hiroyuki Nakamura"], [0, "Akito Mori"]],
    [[1, "POKéMON Designers"], [0, "Ken Sugimori"], [0, "Motofumi Fujiwara"], [0, "Shigeki Morimoto"]],
    [[1, "POKéMON Designers"], [0, "Hironobu Yoshida"], [0, "Satoshi Ohta"], [0, "Asuka Iwashita"]],
    [[1, "POKéMON Designers"], [0, "Takao Unno"], [0, "Kanako Eo"], [0, "Aimi Tomita"]],
    [[1, "POKéMON Designers"], [0, "Atsuko Nishida"], [0, "Muneo Saito"], [0, "Rena Yoshikawa"], [0, "Jun Okutani"]],
    [[1, "Support Programmers"], [0, "Satoshi Mitsuhara"], [0, "Daisuke Hoshino"]],
    [[1, "NCL Product Testing"], [0, "NCL Super Mario Club"]],
    [[1, "Package & Manual Illustration"], [0, "Ken Sugimori"]],
    [[1, "Special Thanks"], [0, "Kenji Tominaga"], [0, "Hiroki Enomoto"]],
    [[1, "Special Thanks"], [0, "Kazuya Suyama"], [0, "Kenjiro Ito"], [0, "Michiko Takizawa"], [0, "Makiko Takada"]],
    [[1, "Special Thanks"], [0, "Mikiko Ohhashi"], [0, "Takanao Kondo"], [0, "Rui Kawaguchi"]],
    [[1, "Special Thanks"], [0, "Takahiro Ohnishi"], [0, "Norihide Okamura"], [0, "Shunsuke Kohori"]],
    [[1, "Information Supervisors"], [0, "Kazuyuki Terada"], [0, "Yuri Sakurai"], [0, "Yumi Funasaka"], [0, "Naoko Yanase"]],
    [[1, "Artwork"], [0, "Sachiko Nakamichi"], [0, "Fujiko Nomura"]],
    [[1, "Artwork"], [0, "Hideyuki Nakajima"], [0, "Hidenori Saeki"]],
    [[1, "Artwork"], [0, "Yoko Watanabe"], [0, "Sakae Kimura"], [0, "Chiaki Shinkai"]],
    [[1, "Coordinators"], [0, "Kazuki Yoshihara"], [0, "Akira Kinashi"], [0, "Retsuji Nomoto"]],
    [[1, "English Version Coordinators"], [0, "Hiro Nakamura"], [0, "Seth McMahill"]],
    [[1, "Translator"], [0, "Nob Ogasawara"]],
    [[1, "Text Editor"], [0, "Teresa Lillygren"]],
    [[1, "NCL Coordinator"], [0, "Kimiko Nakamichi"]],
    [[1, "Programmers"], [0, "Teruki Murakawa"], [0, "Souichi Yamamoto"], [0, "Yuichiro Ito"], [0, "Akira Kinashi"]],
    [[1, "Graphic Designer"], [0, "Akira Kinashi"]],
    [[1, "Environment & Tool Programmers"], [0, "Teruki Murakawa"], [0, "Souichi Yamamoto"], [0, "Kimiko Nakamichi"]],
    [[1, "NOA Product Testing"], [0, "Thomas Hertzog"], [0, "Erik Johnson"], [0, "Mika Kurosawa"]],
    [[1, "Braille Code Check"], [0, "National Federation of the Blind"], [0, "Patricia A. Maurer"], [0, "Japan Braille Library"], [0, "European Blind Union"]],
    [[1, "Braille Code Check"], [0, "Australian Braille Authority"], [0, "Royal New Zealand Federation for the Blind"]],
    [[1, "Special Thanks"], [0, "Hiroyuki Uesugi"], [0, "Motoyasu Tojima"], [0, "Nicola Pratt-Barlow"], [0, "Shellie Dow"]],
    [[1, "Task Managers"], [0, "Azusa Tajima"], [0, "Shusaku Egami"]],
    [[1, "Producers"], [0, "Hiroyuki Jinnai"], [0, "Hitoshi Yamagami"], [0, "Gakuji Nomoto"], [0, "Hiroaki Tsuru"]],
    [[1, "Executive Director"], [0, "Satoshi Tajiri"]],
    [[1, "Executive Producers"], [0, "Satoru Iwata"]],
    [[1, "Executive Producers"], [0, "Tsunekaz Ishihara"]]
  ];
  // (sCredits_Pal: a title is light yellow on red, a name white on gray; the words fade from the
  // scene's green, COLOR_LIGHT_GREEN on the rides and COLOR_DARK_GREEN among the Pokémon.)
  const EM_TITLE = [[255, 230, 123], [255, 82, 41]], EM_NAME = [[255, 255, 255], [164, 164, 164]];
  const EM_LIGHT_GREEN = [107, 165, 99], EM_DARK_GREEN = [57, 90, 49];
  const EM_SCENES = ["oceanMorning", "oceanSunset", "forestArrive", "forestCatch", "cityNight"];
  // Each ride: its sky (two where Emerald cycles two palette colours), grass, what drifts past, and
  // where you and your rival start (LoadBikeScene): off the right edge is 272, off the left -32.
  const EM_RIDES = {
    oceanMorning: { sky: ["sky-day-a", "sky-day-b"], grass: "grass-day", scenery: "clouds-day", me: 272, rival: 272 },
    oceanSunset: { sky: ["sky-sunset-a", "sky-sunset-b"], grass: "grass-sunset", scenery: "clouds-sunset", me: 120, rival: 272 },
    forestArrive: { sky: ["forest-sunset"], grass: "grass-sunset", scenery: "trees", vertical: true, me: 120, rival: 272, sinIdx: 69 },
    forestCatch: { sky: ["forest-sunset"], grass: "grass-sunset", scenery: "trees", vertical: true, me: 120, rival: -32 },
    cityNight: { sky: ["town-night-a", "town-night-b"], grass: "grass-night", scenery: "houses", vertical: true, me: 88, rival: 152 }
  };
  // (sSpriteMetadata_Clouds/Trees/HouseSilhouette: picture, x, y, how far it drifts a frame in 1/65536 px.)
  const EM_SCENERY = {
    "clouds-day": [[0, 72, 32, 0xc00], [0, 158, 32, 0xc00], [1, 192, 40, 0x800], [1, 56, 40, 0x800], [2, 100, 44, 0x400], [2, 152, 44, 0x400], [3, 8, 46, 0x100], [3, 56, 46, 0x100], [3, 240, 46, 0x100]],
    trees: [[0, 16, 88, 0x2000], [0, 80, 88, 0x2000], [0, 144, 88, 0x2000], [0, 208, 88, 0x2000], [1, 40, 88, 0x1000], [1, 104, 88, 0x1000], [1, 168, 88, 0x1000], [1, 232, 88, 0x1000],
      [2, 56, 88, 0x800], [2, 120, 88, 0x800], [2, 184, 88, 0x800], [2, 248, 88, 0x800]],
    houses: [0, 1, 2, 3, 4, 5].map((i) => ["house", 24 + i * 40, 88, 0x1000])
  };
  EM_SCENERY["clouds-sunset"] = EM_SCENERY["clouds-day"];
  // The riders' animations (sAnims_Player, sAnims_Rival): frames of the sheet and how long each holds; a
  // loop, or the last frame kept.
  const EM_ANIMS = {
    slow: { frames: [[0, 8], [1, 8], [2, 8], [3, 8]], loop: true }, fast: { frames: [[0, 4], [1, 4], [2, 4], [3, 4]], loop: true },
    lookBack: { frames: [[4, 4], [5, 4], [6, 4]] }, lookForward: { frames: [[6, 30], [5, 30], [4, 30], [4, 30]] }, still: { frames: [[0, 4]] }
  };
  const EM_MON_POS = [[104, 36], [120, 36], [136, 36]], EM_MON_BG = [[255, 255, 164], [255, 164, 164], [164, 164, 255]];
  const EM_MON_SLIDES = 71;
  const gbaSin = (i, amp) => Math.round(Math.sin((i & 0xff) * Math.PI / 128) * amp);

  // DeterminePokemonToShow: the Pokémon caught, in a random order, 71 of them (round again if there are
  // fewer), the starter last.
  function emeraldSlides(caught, starter, rng) {
    const pool = caught.slice(), picked = [];
    while (pool.length && picked.length < EM_MON_SLIDES) picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    if (!picked.length) picked.push(starter);
    const n = picked.length;
    for (let i = n; i < EM_MON_SLIDES; i++) picked.push(picked[(i - n) % n]);
    const at = picked.indexOf(starter);
    if (n >= EM_MON_SLIDES && at >= 0 && at < n - 1) picked[at] = picked[EM_MON_SLIDES - 1];
    picked[EM_MON_SLIDES - 1] = starter;
    return picked;
  }

  async function hoennCredits(canvas, opts) {
    canvas.classList.remove("hidden");
    const keys = input(), L = Layer(), rng = opts.rng || Math.random;
    let skip = false;
    const tick = async () => {
      await nextFrame();
      for (const k of keys.take()) if (opts.skippable && (k === "start" || k === "b")) skip = true;
    };
    const A = (n) => image("assets/credits/emerald/" + n + ".png");
    const me = opts.girl ? "may" : "brendan", rival = opts.girl ? "brendan" : "may";
    await Promise.all(["sky-day-a", "sky-day-b", "sky-sunset-a", "sky-sunset-b", "forest-sunset", "town-night-a", "town-night-b", "grass-day", "grass-sunset", "grass-night",
      "birch-grass", "the-end", "brendan", "may", "bicycle-brendan", "bicycle-may", "house", "trees-0", "trees-1", "trees-2"]
      .concat([0, 1, 2, 3].flatMap((i) => ["clouds-day-" + i, "clouds-sunset-" + i])).map((n) => A(n).loaded));
    const slides = emeraldSlides(opts.caught || [], opts.starter || "Treecko", rng);
    const monPics = {};
    const monPic = (species) => monPics[species] || (monPics[species] = image(Screen.spriteUrl(species, "", false, false)));
    slides.slice(0, 8).forEach(monPic);

    let frame = 0, mode = "bike", nextMode = null, sceneNum = 0, endCredits = false;
    // The words: the page task (Task_UpdatePage).
    const page = { state: 0, delay: 0, cur: 0, lines: null, fade: 16, printed: false, changed: false };
    // The ride (Task_BikeScene and the sprites): the scene's bob, the riders and the scenery.
    let ride = null, bob = 0, bg1 = 0, bg3 = 8 * 65536, scenery = [], riders = null;
    const anim = (who, name) => { if (who.anim !== name) { who.anim = name; who.t = 0; } };
    const animFrame = (who) => {
      const a = EM_ANIMS[who.anim], total = a.frames.reduce((s, f) => s + f[1], 0);
      let t = a.loop ? who.t % total : Math.min(who.t, total - 1);
      for (const [f, n] of a.frames) { if (t < n) return f; t -= n; }
      return a.frames[a.frames.length - 1][0];
    };
    const loadRide = (key) => {
      const r = EM_RIDES[key];
      ride = Object.assign({ key, state: 0, sinIdx: r.sinIdx || 0, delay: 0, timer: 0 }, r);
      bob = 0; bg1 = 0; bg3 = 8 * 65536;
      scenery = EM_SCENERY[r.scenery].map(([pic, x, y, xOff]) => ({ img: A(typeof pic === "number" ? r.scenery + "-" + pic : pic), x: x * 65536, y, xOff }));
      riders = { me: { x: r.me, y: 46, y2: 0, state: 0, anim: "slow", t: 0, t7: 0 }, rival: { x: r.rival, y: 46, y2: 0, state: 0, anim: "slow", t: 0, t7: 0 } };
    };
    // The Pokémon interlude (Task_ShowMons): a slide every 51 frames, three positions in turn.
    const mons = { state: 1, delay: 0, counter: 0, shown: 0, nextPos: 0, sprites: [] };

    const stepRide = () => {
      const b = ride, m = riders.me, v = riders.rival;
      // Task_BikeScene.
      switch (b.state) {
        case 0: bob = gbaSin(b.sinIdx >> 1, 12); b.sinIdx++; break;
        case 1: if (bob !== 0) { bob = gbaSin(b.sinIdx >> 1, 12); b.sinIdx++; } else { m.state = 2; b.sinIdx = 0; b.state++; } break;
        case 2: if (b.sinIdx < 64) { b.sinIdx++; bob = gbaSin(b.sinIdx, 20); } else b.state++; break;
        case 3: m.state = 3; v.state = 1; b.delay = 120; b.state++; break;
        case 4: if (b.delay) b.delay--; else { b.sinIdx = 64; b.state++; } break;
        case 5: if (b.sinIdx > 0) { b.sinIdx--; bob = gbaSin(b.sinIdx, 20); } else { m.state = 1; b.state++; } break;
        case 6: b.state = 50; break;
        case 10: v.state = 2; b.state = 50; break;
        case 20: m.state = 4; b.state = 50; break;
        case 30: m.state = 5; v.state = 3; b.state = 50; break;
        case 50: b.state = 0; break;
      }
      // Task_CycleSceneryPalette: what sets the riders off in each scene.
      if (b.timer !== -1) {
        if (b.key === "oceanMorning" && page.cur === 2) { b.state = 20; b.timer = -1; }
        else if (b.key === "forestArrive" && (b.sinIdx & -128) === 640) { b.state = 1; b.timer = -1; }
        else if (b.key === "forestCatch") { if (b.timer === 584) { b.state = 10; b.timer = -1; } else b.timer++; }
      }
      // SpriteCB_Player.
      switch (m.state) {
        case 0: anim(m, "slow"); break;
        case 1: anim(m, "fast"); if (m.x > -32) m.x--; break;
        case 2: anim(m, "lookBack"); break;
        case 3: anim(m, "lookForward"); break;
        case 4: anim(m, "slow"); if (m.x > 120) m.x--; break;
        case 5: anim(m, "slow"); if (m.x > -32) m.x--; break;
      }
      // SpriteCB_Rival.
      switch (v.state) {
        case 0: v.y2 = 0; anim(v, "slow"); break;
        case 1: anim(v, v.x > 200 ? "fast" : "still"); if (v.x > -32) v.x -= 2; v.y2 = -bob; break;
        case 2: v.t7++; anim(v, "slow"); if ((v.t7 & 3) === 0) v.x++; break;
        case 3: anim(v, "slow"); if (v.x > -32) v.x--; break;
      }
      m.t++; v.t++;
      // The scenery drifting by (SpriteCB_MovingScenery) and the backgrounds (Task_BicycleBgAnimation).
      for (const s of scenery) { s.x += s.xOff; if ((s.x >> 16) > 255) s.x = -32 * 65536; }
      bg1 -= 0x2000 << 4; bg3 -= 8 << 4;
    };
    const stepMons = () => {
      switch (mons.state) {
        case 1: if (!(mons.nextPos === 0 && !page.printed)) mons.state++; break;
        case 2: {
          if (mons.counter === EM_MON_SLIDES) break;
          const species = slides[mons.shown], [x, y] = EM_MON_POS[mons.nextPos];
          const sp = { species, pic: monPic(species), pos: mons.nextPos, x, y, scale: 16, state: 0, hold: 50, alpha: 16, t7: 0 };
          if (mons.shown < EM_MON_SLIDES - 1) mons.shown++; else { mons.shown = 0; sp.hold = 512; }
          mons.counter++;
          mons.nextPos = mons.nextPos === 2 ? 0 : mons.nextPos + 1;
          mons.sprites.push(sp);
          if (slides[mons.shown + 1]) monPic(slides[mons.shown + 1]);
          mons.delay = 50; mons.state++;
          break;
        }
        case 3: if (mons.delay) mons.delay--; else mons.state = 1; break;
      }
      // SpriteCB_CreditsMon: out small, growing as it slides to its side, a while, then fading.
      for (const sp of mons.sprites) {
        sp.t7++;
        if (sp.state === 0) { sp.scale = 16; sp.state = 1; }
        else if (sp.state === 1) {
          if (sp.scale < 256) sp.scale += 8; else sp.state = 2;
          if (sp.pos === 0) { if ((sp.t7 & 3) === 0) sp.y++; sp.x -= 2; }
          if (sp.pos === 2) { if ((sp.t7 & 3) === 0) sp.y++; sp.x += 2; }
        } else if (sp.state === 2) { if (sp.hold) sp.hold--; else sp.state = 3; }
        else if (sp.state === 3) { if (sp.alpha) sp.alpha--; else sp.state = 9; }
      }
      mons.sprites = mons.sprites.filter((sp) => sp.state !== 9);
    };
    // CheckChangeScene: one every sixth page, a Pokémon interlude and a ride by turns.
    const checkChangeScene = (p) => {
      const interval = Math.floor(EMERALD_PAGES.length / 9);
      if (p === interval * 1 || p === interval * 3 || p === interval * 5 || p === interval * 7) nextMode = "mons";
      if (p === interval * 2) { sceneNum = 1; nextMode = "bike"; }
      if (p === interval * 4) { sceneNum = 2; nextMode = "bike"; }
      if (p === interval * 6) { sceneNum = 3; nextMode = "bike"; }
      if (p === interval * 8) { sceneNum = 4; nextMode = "bike"; }
      return !!nextMode;
    };
    const stepPage = () => {
      switch (page.state) {
        case 0: page.delay = 72; page.printed = false; page.state = 1; break;
        case 1: if (page.delay) page.delay--; else page.state = 2; break;
        case 2:
          if (page.cur < EMERALD_PAGES.length) { page.lines = EMERALD_PAGES[page.cur++]; page.printed = true; page.fade = 16; page.state = 3; }
          else { endCredits = true; page.state = 10; }
          break;
        case 3: if (page.fade > 0) page.fade--; else { page.delay = 115; page.state = 4; } break;
        case 4:
          if (page.delay) { page.delay--; break; }
          page.changed = checkChangeScene(page.cur);
          page.state = 5;
          break;
        case 5:
          if (page.changed) { page.lines = null; page.state = 2; page.changed = false; break; }
          if (page.fade < 16) page.fade++; else { page.lines = null; page.state = 2; }
          break;
      }
    };

    const step = () => { frame++; if (mode === "bike") stepRide(); else stepMons(); };
    const draw = (fade) => {
      const g = L.g;
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      if (mode === "bike") {
        const sky = A(ride.sky[ride.sky.length > 1 && (frame & 4) ? 1 : 0]), grass = A(ride.grass);
        const h3 = (((-(bg3 >> 16)) % 256) + 256) % 256, v3 = 34;
        for (let x = h3 - 256; x < W; x += 256) if (ok(sky)) g.drawImage(sky, x, -v3);
        for (const s of scenery) {
          const img = s.img; if (!ok(img)) continue;
          const y2 = -(34 + (ride.vertical ? bob : 0));
          g.drawImage(img, (s.x >> 16) - img.naturalWidth / 2, s.y + y2 - img.naturalHeight / 2);
        }
        const h1 = (((-(bg1 >> 16)) % 256) + 256) % 256, v1 = 34 + bob;
        for (let x = h1 - 256; x < W; x += 256) if (ok(grass)) g.drawImage(grass, x, -v1);
        for (const [who, sheet] of [[riders.rival, rival], [riders.me, me]]) {
          const pic = A(sheet), bike = A("bicycle-" + sheet);
          if (ok(bike)) g.drawImage(bike, 0, (Math.floor(frame / 8) % 4) * 32, 64, 32, who.x - 32, who.y + 8 + who.y2 - 16, 64, 32);
          if (ok(pic)) g.drawImage(pic, 0, animFrame(who) * 64, 64, 64, who.x - 32, who.y + who.y2 - 32, 64, 64);
        }
      } else {
        const grass = A("birch-grass");
        if (ok(grass)) { g.drawImage(grass, 0, -32); g.drawImage(grass, 0, 224); }
        for (const sp of mons.sprites) {
          const k = sp.scale / 256, size = 64 * k;
          g.save();
          g.globalAlpha = sp.alpha / 16;
          const c = EM_MON_BG[sp.pos];
          g.fillStyle = "rgb(" + c.join(",") + ")"; g.fillRect(sp.x - size / 2, sp.y - size / 2, size, size);
          // (Emerald's 64x64 pictures fill their square; this game's 96x96 ones have margins, so they're drawn a little over it.)
          const pw = 88 * k;
          if (ok(sp.pic)) g.drawImage(sp.pic, sp.x - pw / 2, sp.y - pw / 2 + 4 * k, pw, pw);
          g.restore();
        }
      }
      present(canvas, L, (s) => {
        if (!page.lines) return;
        const green = mode === "bike" ? EM_LIGHT_GREEN : EM_DARK_GREEN;
        const toward = (c) => c.map((v, i) => Math.round(v + (green[i] - v) * page.fade / 16));
        page.lines.forEach(([title, text], i) => {
          const [fg, sh] = title ? EM_TITLE : EM_NAME;
          s.text(text, Math.floor((W - (s.textWidth(text) + text.length)) / 2), 77 + i * 16, toward(fg), toward(sh), undefined, undefined, 1);
        });
      }, fade);
    };
    const fadeScreen = async (from, to, delay) => {
      const st = from < to ? 1 : -1;
      for (let f = from; f !== to + st && !skip; f += st) for (let d = 0; d <= (delay || 0) && !skip; d++) { step(); draw(f); await tick(); }
    };

    try {
      if (opts.music) opts.music("em_credits");
      loadRide("oceanMorning");
      ride.state = 40;   // (the first ride waits for you: you ride in at the second page)
      await fadeScreen(16, 0);
      while (!skip && !endCredits) {
        step(); stepPage();
        if (nextMode) {
          // (Task_CreditsMain: a change of scene, through black.)
          page.lines = null; page.printed = false;
          await fadeScreen(0, 16);
          const next = nextMode; nextMode = null;
          if (next === "bike") loadRide(EM_SCENES[sceneNum]);
          else { mons.state = 1; mons.delay = 0; mons.nextPos = 0; mons.sprites = []; }
          mode = next;
          await fadeScreen(16, 0);
          continue;
        }
        draw(); await tick();
      }
      if (!skip) {
        // THE END (Task_CreditsTheEnd1..6): you both ride off, the long dark, the words.
        ride.state = 30;
        for (let t = 0; t < 256 && !skip; t++) { step(); draw(); await tick(); }
        await fadeScreen(0, 16, 12);
        for (let t = 0; t < 144 + 235 + 112 && !skip; t++) { draw(16); await tick(); }
        const end = A("the-end");
        const drawEnd = (fade) => { L.g.fillStyle = "#000"; L.g.fillRect(0, 0, W, H); if (ok(end)) L.g.drawImage(end, 0, 0); present(canvas, L, null, fade); };
        for (let t = 0; t < 7200 && !skip; t++) {
          if (t === 56 && opts.music) opts.music(null);
          if (t === 360 && opts.music) opts.music("em_end");
          drawEnd(); await nextFrame();
          if (keys.take().some((k) => k === "a" || k === "start" || k === "b")) break;
        }
      }
    } finally { keys.close(); }
    if (opts.music) opts.music(null);
    const g = canvas.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#000"; g.fillRect(0, 0, canvas.width, canvas.height);
  }

  window.HallOfFame = { recordFlash, show, pc, credits, hoennCredits, emeraldSlides, CREDITS, SCRIPT, EMERALD_PAGES };
})();
