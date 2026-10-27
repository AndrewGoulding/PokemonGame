// Game flow: title screen, new game, the overworld and its story events, the
// Start menu (party, bag, Pokédex, trainer card, save, debug), and what
// happens after battles (prize money, catching, blacking out, evolution).
// Depends on: game/*.js, ui/screen.js, ui/battle-screen.js
//
// The game saves to this browser after every battle and every change made from
// the party screen, and can download / load a save file as a backup.

(function () {
  "use strict";

  const STARTER_LEVEL = 5;

  const { message, ask, escapeHtml, clearMenu, spriteTag } = window.Screen;
  const $ = (sel) => document.querySelector(sel);
  const field = $("#field"), scene = $("#scene"), world = $("#world"), fileInput = $("#file-input");

  let player = null;
  let lastTick = Date.now();
  let saveProblem = null;   // set when saving fails, so it's reported once

  // ---------- Helpers ----------

  const partyLevel = () => Math.max(1, ...player.party.filter((r) => !r.egg).map((r) => r.level));
  const canBattle = () => player.party.some(Party.canFight);
  // Two Pokémon that can fight, for a double battle (FireRed's GetMonsStateToDoubles).
  const canDouble = () => player.party.filter(Party.canFight).length >= 2;
  const money = (n) => "₽" + Math.floor(n).toLocaleString("en-US");
  const article = (word) => (/^[AEIOU]/i.test(word) ? "an " : "a ") + word;

  // ---------- Sound (ui/audio.js) ----------
  const GA = window.GameAudio;
  const music = (name) => { if (GA) GA.music(name); };
  // In Johto, HGSS's music (ui/audio.js plays FireRed's battle, victory,
  // "eyes meet" and jingle songs as HGSS's there).
  // (Is a map in Johto: `map`, or where you are.)
  const inJohto = (map) => !!(map || (player && player.location)) && (window.WORLD_MAPS[map || player.location.map] || {}).region === "johto";
  if (GA && GA.setRegion) GA.setRegion(() => (inJohto() ? "johto" : ((window.WORLD_MAPS[player && player.location && player.location.map] || {}).region === "hoenn" ? "hoenn" : null)));
  const fanfare = (name) => (GA ? GA.fanfare(name) : Promise.resolve());
  const cry = (species, opts) => { if (GA) GA.cry(species, opts); };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // Cycling Road: Route 16's and Route 18's gates, and the maps you ride in between.
  const CYCLING_ROAD_GATES = ["Route16_NorthEntrance_1F", "Route18_EastEntrance_1F"];
  const CYCLING_ROAD_MAPS = ["Route16", "Route17", "Route18"].concat(CYCLING_ROAD_GATES);
  // The jingle for getting an item: TMs and HMs, key items, or anything else.
  const itemJingle = (item) => (Bag.isMachine(item) ? "mus_obtain_tmhm" : Bag.isKeyItem(item) ? "mus_obtain_key_item" : "mus_obtain_item");
  // A message with a jingle under it; carries on once both are done.
  async function sayWithJingle(jingle, pages) {
    const j = fanfare(jingle);
    await say(pages);
    await j;
  }
  const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");
  // (More than one of an item: "Berries", not "Berrys"; a name already ending in "s" as it is.)
  const itemPlural = (name) => (/s$/i.test(name) ? name : /[^aeiou]y$/i.test(name) ? name.slice(0, -1) + "ies" : name + "s");
  const back = (label) => ({ label: label || "Back", value: "back", className: "action", wide: true });

  function show(which) {
    if (which !== "world") Overworld.hide();
    if (window.Street) Street.show(which === "street");
    if (which !== "intro" && window.Intro) Intro.stop();
    $("#world-pic").classList.add("hidden");
    field.classList.toggle("hidden", which !== "field");
    scene.classList.toggle("hidden", which !== "scene");
    world.classList.toggle("hidden", which !== "world");
  }

  // Shows `html` in the scene and a menu; resolves with a menu value, or
  // { pick } when something with a data-pick attribute in the scene is clicked.
  function pick(text, html, options) {
    show("scene");
    scene.innerHTML = html;
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (done) return; done = true; clearMenu(); resolve(v); };
      for (const el of scene.querySelectorAll("[data-pick]")) {
        el.addEventListener("click", () => finish({ pick: el.dataset.pick }));
      }
      ask(text, options).then(finish);
      // A list (bag, Mart, PC items, the Pokédex): the cursor starts on its
      // first row (or the one marked data-focus), not on Back.
      const row = ["[data-pick][data-focus]", ".rows .row[data-pick]", ".dex [data-pick]"].map((q) => scene.querySelector(q)).find(Boolean);
      if (row) { row.focus(); row.scrollIntoView({ block: "nearest" }); }
    });
  }

  const confirm = (text) => Screen.yesNo(text);
  // Wild Tera Pokémon (in battle()): how often, and the Tera Shards one knocked out gives.
  const WILD_TERA_CHANCE = 0.1, WILD_TERA_SHARDS = 3;
  const TYPES18 = ["Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
    "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"];
  // A wild Pokémon met in the grass, on the water, on a rod, under a rock or in
  // the Safari Zone, holding what it rolls (Encounters.withHeldItem; your lead
  // Pokémon's Compound Eyes helps). (Not the legendaries waiting on the map.)
  // (Your lead Pokémon: Compound Eyes for what it holds, Synchronize for its nature, Cute Charm for its gender.)
  const leadMon = () => player.party.find((r) => !r.egg && r.hp > 0);
  const wildMon = (record) => Encounters.leadRecord(Encounters.withHeldItem(record, leadMon()), leadMon());
  let continued = false;   // (just continued a saved game: the area's name shows)
  const sfx = (name) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(name); };

  // ---------- Saving ----------

  function tick() {
    const now = Date.now();
    if (player) player.playTimeMs += now - lastTick;
    // (Trainer Tower's clock, while a challenge is on.)
    if (player) TrainerTower.tick(player.flags, now - lastTick);
    lastTick = now;
  }

  // (No autosave: the game is saved when you choose to, from the START menu
  // or your trainer card, or when it asks every 5 minutes of play
  // (saveReminderStep). `persist` only keeps the play time up to date.)
  async function persist() { tick(); }
  // Saving, when you've chosen to: "{PLAYER} saved the game."
  async function saveGame() {
    tick();
    const r = Save.write(player);
    savePromptAt = player.playTimeMs;
    if (!r.ok && saveProblem !== r.error) saveProblem = r.error;
    await message(r.ok ? player.name + " saved the game." : r.error + " Use “Download save file” on your trainer card to keep your progress.");
    return r.ok;
  }
  // Every 5 minutes of play, out in the overworld (not in the Safari Zone or
  // the Bug-Catching Contest, where you can't save), the game offers to save.
  const SAVE_PROMPT_MS = 5 * 60 * 1000;
  let savePromptAt = null;
  function saveReminderStep() {
    tick();
    if (savePromptAt == null) savePromptAt = player.playTimeMs;
    if (player.playTimeMs - savePromptAt < SAVE_PROMPT_MS) return null;
    if (player.flags.safari || bugContest.here(player.location.map)) return null;
    return { type: "save-prompt" };
  }
  async function savePrompt() {
    savePromptAt = player.playTimeMs;
    if (await confirm("It's been a while since you saved.\nWould you like to save the game?")) await saveGame();
    else Screen.say("");
  }

  function downloadSave() {
    tick();
    const blob = new Blob([Save.toFile(player)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pokemon-save-" + player.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Lets the player pick a save file. Resolves with a loaded player, or null.
  async function loadSaveFile() {
    fileInput.value = "";
    const chosen = new Promise((resolve) => {
      fileInput.onchange = () => resolve(fileInput.files[0] || null);
    });
    fileInput.click();
    const file = await Promise.race([chosen, ask("Choose a save file to load.", [back("Cancel")]).then(() => null)]);
    clearMenu();
    if (!file) return null;
    try {
      const loaded = Save.fromFile(await file.text());
      for (const w of loaded.warnings) await message(w);
      return loaded.player;
    } catch (e) {
      await message(e.message);
      return null;
    }
  }

  function renderSprite(species, extraClass, form, shiny) {
    show("scene");
    scene.innerHTML = '<div class="spotlight">' + spriteTag(species, form,
      'class="big-sprite ' + (extraClass || "") + '" alt="' + escapeHtml(species) + '"', shiny) + "</div>";
    return scene.querySelector(".big-sprite");
  }

  const itemRow = (id, right, key) => '<button type="button" class="row" data-pick="' + (key || id) + '">' +
    (Bag.sprite(id) ? '<img src="' + Bag.sprite(id) + '" alt="">' : '<span class="no-sprite"></span>') +
    '<span class="row-main"><b>' + escapeHtml(Bag.name(id)) + "</b><small>" + escapeHtml(Bag.description(id)) + "</small></span>" +
    '<span class="row-right">' + right + "</span></button>";

  // ---------- Title / new game ----------

  // FireRed's main menu (CONTINUE / NEW GAME, and OPTION where FireRed has
  // MYSTERY GIFT). Returns "back" when B goes back to the title screen.
  async function title() {
    for (;;) {
      const saved = Save.read();
      if (saved.error) await message(saved.error);
      const p = saved.player;
      Screen.say("");
      clearMenu();
      show("intro");
      const v = await GbaMenus.mainMenu($("#intro"), {
        save: p && { name: p.name, timeMs: p.playTimeMs, dex: p.flags.pokedex ? Player.dexCount(p, "caught", !Player.nationalDex(p)) : null, badges: p.badges.length },
        frame: GameOptions.get().frame
      });
      if (v === "back") return "back";
      if (v === "continue") {
        player = p;
        for (const w of saved.warnings) await message(w);
        continued = true;
        return "play";
      }
      if (v === "option") {
        if ((await optionScreen(true)) !== "load") continue;
        const loaded = await loadSaveFile();
        if (loaded && (!p || await confirm("Replace the game saved in this browser with this file?"))) {
          player = loaded;
          savePromptAt = null;
          tick();
          Save.write(player);   // (the game you loaded is the one saved now)
          return "play";
        }
        continue;
      }
      // (NEW GAME + : from the game saved, what Player.newGamePlus keeps.)
      const plus = v === "newplus" && !!p;
      if (plus && !(await confirm("New Game + keeps your Bag (but not\nthe story's key items or HMs), your\nmoney, your skills and your PC boxes,\nwith your party put in them.\nStart over with New Game +?"))) continue;
      if (p && !plus && !(await confirm("Start a new game? Your saved game\nin this browser will be overwritten."))) continue;
      await newGame(plus ? p : null);
      return "play";
    }
  }

  // FireRed's Option screen (GameOptions keeps the settings). From the main
  // menu it also has SAVE FILE: LOAD, to load a downloaded save; returns "load"
  // when that's picked. In a game it has this game's SAVE NOW, DOWNLOAD SAVE,
  // LOAD SAVE FILE and DEBUG too (once on the Trainer Card): returns "save",
  // "download", "load" or "debug" (optionActions does them).
  async function optionScreen(fromTitle) {
    const o = GameOptions.get();
    const rows = [
      { name: "TEXT SPEED", key: "textSpeed", values: ["SLOW", "MID", "FAST"], value: o.textSpeed },
      { name: "BATTLE SCENE", key: "battleScene", values: ["ON", "OFF"], value: o.battleScene },
      { name: "BATTLE STYLE", key: "battleStyle", values: ["SHIFT", "SET"], value: o.battleStyle },
      { name: "SOUND", key: "sound", values: ["MONO", "STEREO", "OFF"], value: o.sound },
      { name: "VOLUME", key: "volume", values: [...Array(11).keys()].map(String), value: o.volume },
      { name: "FRAME", key: "frame", frame: true, values: [...Array(10).keys()].map((i) => "TYPE" + (i + 1)), value: o.frame },
      // (HGSS's walking Pokémon: in Johto, as in HGSS, everywhere, or not at all.)
      { name: "FOLLOWER", key: "follower", values: ["ON", "OFF"], value: o.follower | 0 },
      // (The Pokégear's phone ringing with Johto's trainers' chatter: off keeps the story's calls.)
      { name: "GEAR CALLS", key: "calls", values: ["ON", "OFF"], value: o.calls | 0 }
    ];
    if (fromTitle) rows.push({ name: "SAVE FILE", values: ["LOAD"], value: 0, action: "load" });
    else rows.push({ name: "SAVE NOW", action: "save" }, { name: "DOWNLOAD SAVE", action: "download" },
      { name: "LOAD SAVE FILE", action: "load" }, { name: "DEBUG", action: "debug" });
    rows.push({ name: "CANCEL" });
    const wasShowing = !$("#scene").classList.contains("hidden") ? "scene" : null;
    Screen.say("");
    clearMenu();
    show("intro");
    const r = await GbaMenus.optionMenu($("#intro"), rows, (i, value) => { if (rows[i].key) GameOptions.set({ [rows[i].key]: value }); });
    if (wasShowing) show(wasShowing);
    return r;
  }
  // The Start menu's OPTION: the screen, then what was picked on it; "battled" if the debug menu started a battle.
  async function optionActions() {
    const v = await optionScreen(false);
    if (v === "debug") return debugMenu();
    if (v === "save") await saveGame();
    else if (v === "download") {
      downloadSave();
      await message("Your save file is downloading.");
    } else if (v === "load") {
      const loaded = await loadSaveFile();
      if (loaded && await confirm("Load " + loaded.name + "'s game? Your current game will be replaced.")) {
        player = loaded;
        savePromptAt = null;
        tick();
        Save.write(player);   // (the game you loaded is the one saved now)
        await applyLook();
        await message("Loaded " + player.name + "'s game.");
      }
    }
    return null;
  }

  // A new game starts with the character creator (your race and your look) and your name, then you're in the
  // Realm Hub, between the realms, with ¥10,000; the red portal is the Pokémon realm's (beside Pallet Town, where
  // Prof. Oak's story starts as ever).
  // (New Game +: from `old`, what Player.newGamePlus keeps.)
  const NEW_GAME_MONEY = 10000;
  async function newGame(old) {
    show("intro");
    const r = await Intro.newCharacter();
    player = old ? Player.newGamePlus(old, r.name) : Player.create(r.name);   // the rival is Gary (Player.RIVAL_NAME)
    player.race = r.race;
    player.appearance = r.appearance;
    player.money = Math.max(old ? player.money : 0, NEW_GAME_MONEY);
    player.location = Object.assign({}, window.TIME_MACHINE.hub);
    player.flags.realmHubVisited = true;
    await persist();
  }

  // Your look from the character creator (player.appearance: ui/intro.js's race page), as you walk about everywhere.
  async function applyLook() {
    Overworld.setPlayerLook(player.appearance ? await Overworld.composeLook(player.appearance) : null);
  }
  // The creator again, from a Time Machine: your race, and how you look. (A new race is who you fight as from now
  // on, at the level you were: realmParty.)
  async function changeLook() {
    show("intro");
    const r = await Intro.chooseRace(player.name, { race: player.race, appearance: player.appearance });
    player.race = r.race; player.appearance = r.appearance;
    await applyLook();
    Screen.say(""); clearMenu();
    show("world");
    await Overworld.resume();
    await persist();
  }

  // ---------- Battles ----------

  const randomMove = (battle) => {
    const req = battle.getRequest("p2");
    const choose = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (req.phase === "switch") return { type: "switch", index: choose(req.switches) };
    if (req.active.forced) return { type: "move", move: 0 };
    if (req.active.struggle) return { type: "move", move: "Struggle" };
    return { type: "move", move: choose(req.active.moves.filter((m) => !m.disabled)).index };
  };

  // kind: "wild" or "trainer". opts: { foe: { name, team }, noBlackout, noExp, noPrize (Trainer Tower's battles) }
  // FireRed's battle background (BattleSetup_GetTerrainId): tall grass for
  // grass encounters, else by the kind of map you're on.
  // A map's own battle scene (a Gym) comes before its kind of map.
  function battleTerrain(opts) {
    if (opts.terrain) return opts.terrain;
    const here = player.location && window.WORLD_MAPS[player.location.map];
    if (here && here.battleScene) return here.battleScene;
    const type = here ? here.type : "";
    return type === "indoor" ? "building" : type === "underground" ? "cave" : "plain";
  }

  // Johto's battle music, as HGSS picks it (its trainer classes' themes,
  // unk_020517A4.s, and victories, battle_controller_player.c): Silver's,
  // Team Rocket's (grunts, Executives, Giovanni), the Gym Leaders' and the
  // Elite Four's, the Champion's, and the legendary Pokémon's own.
  const JOHTO_LEGEND_MUSIC = { Suicune: "gs_vs_suicune", Entei: "gs_vs_entei", Raikou: "gs_vs_raikou", "Ho-Oh": "gs_vs_houou",
    Lugia: "gs_vs_lugia", Groudon: "gs_vs_kodai", Kyogre: "gs_vs_kodai", Rayquaza: "gs_vs_kodai" };
  function johtoBattleMusic(wild, foe, opts) {
    if (wild) return { vs: JOHTO_LEGEND_MUSIC[foe.team[0] && foe.team[0].species] || "gs_vs_norapoke", win: "gs_win2" };
    const t = window.WORLD_TRAINERS[opts.trainerId] || {}, cls = t.className || foe.name.split(" ")[0];
    if (cls === "Rival" || t.pic === "hgss_silver") return { vs: "gs_vs_rival", win: "gs_win1" };
    if (/^(Team Rocket|Executive|Rocket Boss)/.test(cls) || /^Team Rocket|^Executive|^Rocket Boss/.test(foe.name)) return { vs: "gs_vs_rocket", win: "gs_win1" };
    if (cls === "Champion" || foe.name === "Pokémon Trainer Red") return { vs: "gs_vs_champ", win: "gs_win3" };
    if (/^(Leader|Elite Four)/.test(cls) || /^(Leader|Elite Four) /.test(foe.name)) return { vs: "gs_vs_gymreader", win: "gs_win3" };
    return { vs: "gs_vs_trainer", win: "gs_win1" };
  }
  // A Johto trainer's "eyes meet" theme, by class (HGSS's field_bgm.c, Johto's
  // column); Silver's is his own.
  const JOHTO_EYES = { Lass: "k_shoujo", Picnicker: "k_shoujo", Twins: "k_shoujo", Hiker: "k_ayashii", Fisherman: "k_ayashii",
    "Black Belt": "k_ayashii", Gentleman: "k_ayashii", Policeman: "k_shounen", "Swimmer♂": "k_ayashii", Sailor: "k_ayashii",
    Guitarist: "k_ayashii", Firebreather: "k_ayashii", Biker: "k_ayashii", Boarder: "k_ayashii", "Double Team": "k_shounen",
    Beauty: "j_shoujo", "Swimmer♀": "j_shoujo", Skier: "j_shoujo", Teacher: "j_shoujo", "Young Couple": "j_shoujo",
    Juggler: "j_ayashii", Burglar: "j_ayashii", "Poké Maniac": "j_ayashii", "Super Nerd": "j_ayashii",
    "Kimono Girl": "maiko", Sage: "bouzu", Medium: "bouzu", "Team Rocket": "rocket", Scientist: "rocket", Executive: "rocket" };
  function johtoEyes(data) {
    const cls = data.className;
    if (cls === "Rival") return "gs_e_rival1";
    // (Pokéfans and Ace Trainers: the men's, or the women's.)
    if (cls === "Pokéfan" || cls === "Ace Trainer") return data.music === "mus_encounter_girl" ? "gs_eye_j_shoujo" : "gs_eye_k_ayashii";
    return "gs_eye_" + (JOHTO_EYES[cls] || "j_shounen");
  }

  // opts.safari: a Safari Zone battle (engine/safari.js), with the Safari
  // Balls you have left (player.flags.safari). opts.bag: the Bag in the
  // battle, if not yours (the Bug-Catching Contest's Sport Balls);
  // opts.keepCaught(record): where a Pokémon caught goes, if not to you.
  // Double battles: opts.double (FireRed's trainerbattle_double: the whole
  // party, two at a time). A tag battle: opts.partner = { name, team (party
  // records), pic (their back picture) }: you choose three of yours first
  // (FireRed's party screen, ENTER / CONFIRM; or opts.chosen, party indexes),
  // and only those are changed by the battle. opts.foe2 = { name, team, pic,
  // defeatText, prizeClass }: a second opposing trainer beside the first.
  // Returns the outcome ("cancelled" when you back out of choosing).
  let lastRecord = null;   // (the last battle's record, if it was asked for: the Battle Frontier's, for the Frontier Pass)
  async function battle(kind, opts) {
    opts = opts || {};
    const wild = kind === "wild";
    const foe = opts.foe || (wild ? { name: "Wild", team: [wildMon(Encounters.wild(partyLevel()))] } : Encounters.trainer(partyLevel()));
    const foe2 = !wild && opts.foe2 || null;
    const double = !wild && !opts.safari && !!(opts.double || opts.partner || foe2);
    if (!wild) for (const r of foe.team.concat(foe2 ? foe2.team : [])) delete r.shiny;   // trainers' Pokémon are never shiny
    // (This game's own: one wild Pokémon in ten is a Tera Pokémon, of a random
    // Tera Type, already Terastallized when it appears; beat it for Tera Shards,
    // or catch it and it keeps its Tera Type. Not in the Safari Zone, a raid
    // or Pokémon Tower's unidentified Ghost.)
    const wildTera = wild && !opts.safari && !opts.raid && !opts.ghost && Math.random() < WILD_TERA_CHANCE
      ? TYPES18[Math.floor(Math.random() * TYPES18.length)] : null;
    if (wildTera) Object.assign(foe.team[0], { teraType: wildTera, teraAce: true });
    // (Only some of your party: a tag battle's three you choose; a Tera Raid's one, opts.chosen.)
    let chosen = opts.chosen || null;
    if (opts.partner) {
      chosen = opts.chosen || await chooseBattleTeam(3);
      if (!chosen) return "cancelled";
    }
    const own = DoubleBattle.team(player.party, chosen);
    // The battle theme (wild, trainer, or Gym Leader), and the one for winning
    // (in Johto, HGSS's: johtoBattleMusic).
    const leader = !wild && /^Leader /.test(foe.name);
    const johtoMusic = inJohto() ? johtoBattleMusic(wild, foe, opts) : {};
    music(opts.music || johtoMusic.vs || (wild ? "mus_vs_wild" : leader ? "mus_vs_gym_leader" : "mus_vs_trainer"));
    // From the map: FireRed's flash-and-slice into battle.
    if (!world.classList.contains("hidden")) await Overworld.battleTransition();
    show("field");
    const here = player.location && player.location.map;
    // A Gym Leader, the Elite Four or the Champion: the whole party is pleased
    // to be in a battle that matters (FireRed's FRIENDSHIP_EVENT_LEAGUE_BATTLE).
    if (!wild && /^TRAINER_(LEADER|ELITE_FOUR|CHAMPION)/.test(opts.trainerId || "")) {
      for (const r of player.party) if (!r.egg) Party.adjustFriendship(r, "leagueBattle", here);
    }
    // (The Tera Orb: it lets a Pokémon Terastallize once a battle, and
    // recharges itself after every battle.)
    const teraOrb = !opts.noGimmicks && Player.itemCount(player, "tera-orb") > 0;
    // (A Tera Raid's Pokémon: more HP the more stars, RaidDens.HP, and already Terastallized.)
    const foeSets = (f) => f.team.map((r) => Object.assign(Party.toBattleSet(r), opts.ghost ? { name: "Ghost" } : {},
      opts.raid ? { raidHp: RaidDens.HP[opts.raid] * (opts.raidAllies && opts.raidAllies.length ? RaidDens.ALLY_HP : 1), teraStart: true } : {},
      wildTera ? { teraStart: true } : {}));
    const result = await BattleScreen.run({
      p1: Object.assign({ name: player.name, team: own.map((r) => Party.toBattleSet(r, here)), dynamax: !opts.noGimmicks && Player.itemCount(player, "dynamax-band") > 0, tera: teraOrb },
        opts.partner ? { partner: { name: opts.partner.name, team: opts.partner.team.map((r) => Party.toBattleSet(r)) } } : {}),
      // (Pokémon Tower's unidentified Ghost goes by "Ghost".)
      p2: Object.assign({ name: foe.name, team: foeSets(foe), tera: !!foe.tera || !!wildTera }, foe2 ? { partner: { name: foe2.name, team: foeSets(foe2) } } : {}),
      format: double ? "doubles" : undefined,
      partnerTrainer: opts.partner && opts.partner.pic,
      foeTrainer2: foe2 && foe2.pic, defeatText2: foe2 && foe2.defeatText && foe2.defeatText.map((p) => fill(p)),
      ghost: !!opts.ghost, noCatch: !!opts.noCatch, snag: opts.snag || null, raid: opts.raid || 0, raidAllies: opts.raidAllies || null, raidTurns: opts.raid ? RaidDens.TURNS[opts.raid] : 0,
      // (A Tera Raid won: the Balls you could catch it in; not the Master Ball,
      // as in Scarlet and Violet, where a raid's catch never fails anyway.)
      raidBalls: opts.raid ? () => Object.keys(player.bag).filter((id) => Bag.isBall(id) && id !== "master-ball" && Player.itemCount(player, id) > 0).slice(0, 8)
        .map((id) => ({ id, name: Bag.name(id) })) : null,
      megaRing: !opts.noGimmicks && Player.itemCount(player, "mega-ring") > 0,
      zRing: !opts.noGimmicks && Player.itemCount(player, "z-ring") > 0,
      dynamaxBand: !opts.noGimmicks && Player.itemCount(player, "dynamax-band") > 0,
      teraOrb,
      safari: opts.safari ? Object.assign({ balls: player.flags.safari.balls, hgss: !!player.flags.safari.hgss },
        player.flags.safari.hoenn ? { hoenn: true, pokeblocks: () => hoennPokeblock.blocks().map(HoennPokeblock.name), usePokeblock: (i) => hoennPokeblock.blocks().splice(i, 1)[0] } : {}) : undefined,
      wild, weather: opts.weather,
      exp: !opts.safari && !opts.noExp, levelCap: Player.levelCap(player),
      arena: !!opts.arena, palace: !!opts.palace,   // (the Battle Frontier's Arena and Palace rules: engine/battle.js)
      record: !!opts.record,   // (the choices and seed kept, to play it back: a Frontier battle's)
      expShare: expShareOn(),
      trainer: Player.LOOKS[player.look].back,
      foeTrainer: foe.pic, defeatText: opts.defeatText && opts.defeatText.map((p) => fill(p)),
      victoryMusic: opts.victoryMusic || johtoMusic.win || (wild ? "mus_victory_wild" : leader ? "mus_victory_gym_leader" : "mus_victory_trainer"),
      terrain: battleTerrain(opts),
      bag: opts.bag || player.bag,
      // (The Bag screen: its pockets, and the bag's colours.)
      // (Another bag: only its Poké Balls pocket, and the others it has anything in.)
      bagPockets: opts.bag ? () => bagPockets(opts.bag).filter((p) => p.items.length || p.name === "Poké Balls") : bagPockets, bagFemale: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl),
      catchContext: { night: Evolution.timeOfDay() === "night", caughtBefore: (s) => Player.hasCaught(player, s), fishing: !!opts.fishing },
      // (A Tera Raid's Pokémon, or a wild Tera Pokémon, battles as a trainer's does, and Terastallizes.)
      opponent: wild && !opts.raid && !wildTera ? randomMove : (b) => OpponentAI.choose(b, "p2"),
      // A new move with four known: the Summary screen picks the one to forget
      // (the record caught up with the battle first: level, moves, PP).
      forgetMove: (i, mon, move) => chooseMoveToForget(Party.syncFromBattle(own[i], mon), move),
      // The Summary screen from the party screen in battle: each Pokémon as it
      // is now (HP, status, PP, Exp.), from copies, so nothing changes.
      // A Mega Evolved Pokémon (or one in a forme its Ability brought about,
      // Gen 7's Minior Core or Ash-Greninja) shows that form: the picture, the stats the
      // battle worked out for it, its ability and types (the record itself
      // goes back to its own form after the battle).
      summary: (i, mons) => {
        const now = own.map((r, k) => (mons[k] ? Party.syncFromBattle(JSON.parse(JSON.stringify(r)), mons[k]) : r));
        cry(now[i].species);
        const views = now.map((r, k) => battleSummaryView(r, mons[k]));
        return SummaryScreen.open(views, i, { frame: GameOptions.get().frame, cry: (sp) => cry(sp) });
      }
    });
    const b = result.battle;
    lastRecord = result.record || null;
    if (opts.raid) opts.raidBall = result.raidBall || null;   // (the Ball its Pokémon was caught in, if it was)
    for (const e of b.events) {
      if (opts.ghost) break;   // (an unidentified Ghost isn't seen)
      if ((e[0] === "switch" || e[0] === "drag") && String(e[1]).startsWith("p2")) Player.markSeen(player, String(e[2]).split(", L")[0]);
    }
    // (A tag battle: only the three you chose; your partner's are theirs.)
    const leveledUp = [], critical = [];
    DoubleBattle.syncBack(player.party, chosen, b.sides.p1.pokemon, (record, mon) => {
      Party.syncFromBattle(record, mon);
      if (mon.leveledUp) leveledUp.push(record);
      if (mon.critsLanded) critical.push([record, mon.critsLanded]);
    });

    if (result.outcome === "won" && opts.trainerId) {
      player.flags[opts.trainerId] = true;
      // (The League's trainers' flags are cleared each time it starts over: League.reset. This keeps
      // that you've beaten them, for the raids' invitations: game/raid-dens.js.)
      if (/^TRAINER_(ELITE_FOUR|CHAMPION)_/.test(opts.trainerId)) (player.flags.leagueEverBeaten || (player.flags.leagueEverBeaten = {}))[opts.trainerId] = true;
      if (player.flags.vsRematch) delete player.flags.vsRematch[opts.trainerId];
    }
    if (result.outcome === "won" && !wild && !opts.noPrize) {
      // (Each opposing trainer's, doubled in a double battle, as FireRed's.)
      let prize = opts.prize != null ? opts.prize : DoubleBattle.prize([foe].concat(foe2 ? [foe2] : []),
        (f) => Player.prizeMoney(f.name, f.team, f === foe ? opts.prizeClass : f.prizeClass), double);
      // An Amulet Coin held by a Pokémon that battled doubles it (FireRed's moneyMultiplier).
      if (b.sides.p2.pokemon.some((m) => [...(m.expParticipants || [])].some((p) => p.item === "amulet-coin"))) prize *= 2;
      Player.addMoney(player, prize);
      await message("You got " + money(prize) + " for winning!");
      Player.addMoney(player, -gear.savePrize(prize));   // (a quarter for Mom to save, while she is: ui/pokegear.js)
    }
    // (This game's own: a wild Pokémon you knock out drops what it was holding,
    // and it goes in your Bag.)
    const dropped = wild && result.outcome === "won" && b.sides.p2.pokemon[0];
    if (dropped && dropped.fainted && dropped.item && window.ITEMS[dropped.item]) {
      const item = dropped.item, name = Bag.name(item);
      Player.addItem(player, item);
      await message("The wild " + dropped.name + " dropped\n" + article(name) + "!");
      await message(player.name + " put the " + name + "\nin the Bag.");
    }
    // (Pickup, after any battle but a Safari Game's: Encounters.pickup. The
    // games say nothing; this one does.)
    if (!opts.safari && result.outcome !== "lost") {
      for (const [r, item] of Encounters.pickup(player.party)) await message(Party.displayName(r) + " picked up\n" + article(Bag.name(item)) + "!");
    }
    // (A wild Tera Pokémon knocked out: its Tera Type's Tera Shards.)
    if (wildTera && dropped && dropped.fainted) {
      const shard = wildTera.toLowerCase() + "-tera-shard", n = WILD_TERA_SHARDS;
      Player.addItem(player, shard, n);
      await message(player.name + " got " + n + " " + Bag.name(shard) + "s!");
    }
    if (opts.safari && player.flags.safari) player.flags.safari.balls = b.safari.balls;
    // (Snagged from a trainer with the Snag Machine, opts.snag: yours, unless you lost; opts.snagged says which.)
    opts.snagged = [];
    if (b.snagged && b.snagged.length && result.outcome !== "lost") {
      const balls = b.events.filter((e) => e[0] === "caught" && e[3] === "snag").map((e) => e[2]);
      for (let i = 0; i < b.snagged.length; i++) {
        const m = b.snagged[i], record = Party.caught(foe.team[m.teamIndex], m, balls[i] || "poke-ball");
        delete record.teraAce;
        opts.snagged.push(record.species);
        await addCaught(record, opts.keepCaught);
      }
    }
    if (result.outcome === "caught") {
      if (player.flags.johtoRoamers) delete player.flags.johtoRoamers[foe.team[0].species];   // (a roaming beast caught: it roams no more)
      if (player.flags.hoennRoamer === foe.team[0].species) delete player.flags.hoennRoamer;   // (and Hoenn's Latias or Latios)
      const record = Party.caught(foe.team[0], b.caught, ballUsed(b));
      delete record.teraAce;   // (a Tera Pokémon keeps its Tera Type)
      await addCaught(record, opts.keepCaught);
    }
    if (opts.safari) {
      // (No one fought: no blacking out, no evolving.)
    } else if ((result.outcome === "lost" || !canBattle()) && opts.noBlackout) {
      player.party.forEach(Party.heal);
    } else if (result.outcome === "lost" || !canBattle()) {
      await blackout(wild ? null : foe);
    } else {
      for (const record of leveledUp) {
        const evo = Evolution.find(record, { trigger: "level", party: player.party, coins: coins() });
        if (evo) await evolve(record, evo, true);
      }
      // (Galarian Farfetch'd: three critical hits in the battle, levelled up or not.)
      for (const [record, crits] of critical) {
        const evo = Evolution.find(record, { trigger: "battle", crits, party: player.party });
        if (evo) await evolve(record, evo, true);
      }
    }
    await persist();
    return result.outcome;
  }

  // Choosing `max` of your Pokémon for a battle (a tag battle's three):
  // FireRed's party screen for choosing several. A on a Pokémon: ENTER (or NO
  // ENTRY to take it back) / SUMMARY / CANCEL; each chosen one says FIRST,
  // SECOND, THIRD; the last one chosen takes the cursor to CONFIRM ("OK",
  // also START). B or CANCEL: "Cancel the battle?". Returns the party
  // indexes in order, or null.
  async function chooseBattleTeam(max, rules) {
    const party = player.party;
    let order = [], cursor = 0, note = null;
    for (;;) {
      Screen.say("");
      clearMenu();
      // (What went wrong shows in the screen's own message box, as FireRed's
      // DisplayPartyMenuStdMessage, until the next choice.)
      const shown = note;
      note = null;
      const r = await PartyMenu.open({ mons: partyMons(DoubleBattle.descs(party, order)), cursor, chooseMultiple: true,
        frame: GameOptions.get().frame, message: shown || "Choose POKéMON and confirm.",
        actions: (slot) => {
          const st = DoubleBattle.entryStatus(party, order, slot);
          return (st === "able" ? [{ label: "Enter", value: "enter" }] : st === "selected" ? [{ label: "No Entry", value: "noentry" }] : [])
            .concat([{ label: "Summary", value: "summary" }, { label: "Cancel", value: "cancel" }]);
        } });
      if (!r) {
        PartyMenu.close();
        if (await confirm("Cancel the battle?")) return null;
        continue;
      }
      cursor = r.cursor;
      if (r.action === "confirm") {
        const err = rules ? (order.length < max ? ["", "One", "Two", "Three", "Four"][max] + " POKéMON are needed." : null) : DoubleBattle.confirmError(party, order, max);
        if (err) { sfx("se_failure"); note = err; continue; }
        PartyMenu.close();
        return order;
      }
      if (r.action === "summary") { PartyMenu.close(); await summary(r.slot); continue; }
      if (r.action === "noentry") { order = DoubleBattle.noEntry(order, r.slot); continue; }
      if (r.action === "enter") {
        // (A challenge's own rules: not a kind twice, not an item twice ...)
        const rule = rules && !order.includes(r.slot) && order.length < max && rules.check(party, order, r.slot);
        if (rule) { sfx("se_failure"); if (/\n/.test(rule)) await message(rule); else note = rule; continue; }
        const res = DoubleBattle.enter(party, order, r.slot, max);
        if (res.error) { sfx("se_failure"); if (/\n/.test(res.error)) await message(res.error); else note = res.error; continue; }
        order = res.order;
        if (order.length === max) cursor = "confirm";
      }
    }
  }

  function ballUsed(b) {
    const ev = b.events.find((e) => e[0] === "caught");
    return ev ? ev[2] : "poke-ball";
  }

  async function addCaught(record, keep) {
    JohtoAlph.recordCaught(player.flags, record);   // (an Unown's letter, for the Unown Report)
    // A new kind: "…'s data was added to the Pokédex." and its page (once you have one).
    if (!Player.hasCaught(player, record.species) && player.flags.pokedex) {
      Player.markCaught(player, record.species);
      await message(Party.speciesName(record.species) + "'s data was\nadded to the Pokédex.");
      Screen.say("");
      await PokedexScreen.open(dexOptions({ register: record.species }));
    }
    if (keep) { await keep(record); return; }   // (not yours yet: the Bug-Catching Contest's)
    const where = Player.receive(player, record);
    const name = Party.displayName(record);
    if (where === "party") await message(name + " was added to your party!");
    else if (where) await message(name + " was sent to " + where.replace("box", "Box") + " on the PC.");
    else await message("There's no room left in your PC... " + name + " was released.");
  }

  // Losing (FireRed's BattleScript_LocalBattleLost, then
  // Task_RushInjuredPokemonToCenter and EventScript_AfterWhiteOutHeal): in
  // the battle's text box, "… is out of usable Pokémon!" and the money lost
  // (to a trainer: "… lost against …!" and the prize money paid); the screen
  // fades to black, and on the black screen you scurry to the last Pokémon
  // Center you used (or Red's house before you've used one). There, the
  // nurse heals your Pokémon at the counter, or Red's Mom does at home.
  // (`foe`: the trainer you lost to; null in a wild battle.)
  async function blackout(foe) {
    const lost = Player.blackoutLoss(player);
    Player.addMoney(player, -lost);
    await message(fill("{PLAYER} is out of\nusable Pokémon!"));
    if (foe) await message(fill("{PLAYER} lost against\n" + foe.name + "!"));
    if (lost) {
      await message(fill(foe ? "{PLAYER} paid " + money(lost) + " as the prize\nmoney…" : "{PLAYER} panicked and lost " + money(lost) + "…"));
      await message("… … … …");
    }
    await say("{PLAYER} blacked out!");
    // (DoWhiteOut runs EventScript_ResetEliteFourEnd: the League starts over
    // from Lorelei.)
    League.reset(player.flags);
    // (DoWhiteOut heals the party as you go.)
    player.party.forEach(Party.heal);
    // (In Hoenn: its last Pokémon Center, or, before you've used one, your bedroom: setrespawn.)
    const inHoennNow = isHoenn(player.location.map);
    // (In Sinnoh: its last Pokémon Center, or Sandgem Town's.)
    const sinnoh = (map) => (window.WORLD_MAPS[map] || {}).region === "sinnoh", inSinnohNow = sinnoh(player.location.map);
    const center = inSinnohNow ? centerOf(sinnoh(player.flags.lastCenter) ? player.flags.lastCenter : "SandgemTown_PokemonCenter_1F")
      : player.flags.lastCenter && (!inHoennNow || isHoenn(player.flags.lastCenter)) && centerOf(player.flags.lastCenter);
    const hoennHome = inHoennNow && !center ? (player.flags.hoennRespawn || hoennBedroom()) : null;
    const to = Object.assign({}, center || hoennHome || Player.HOME);
    music(null);
    Screen.say("");
    await GbaMenus.blackScreen($("#overlay"), fill(center
      ? "{PLAYER} scurried to a Pokémon Center,\nprotecting the exhausted and fainted\nPokémon from further harm‥"
      : "{PLAYER} scurried back home, protecting\nthe exhausted and fainted Pokémon from\nfurther harm‥"));
    // Back on the map, faded in from black where you wake up.
    show("world");
    await Overworld.resume();
    await Overworld.fadeToBlack();
    $("#overlay").classList.add("hidden");
    await Overworld.teleport(to);
    if (center) await afterBlackoutNurse(to.map);
    else if (hoennHome) player.party.forEach(Party.heal);
    else await afterBlackoutMom();
  }
  // EventScript_AfterWhiteOutHeal: the nurse behind the counter heals them
  // (the machine, as when you ask her), with the advice about Potions until
  // you've beaten Brock.
  async function afterBlackoutNurse(mapName) {
    const nurseDef = ((window.WORLD_MAPS[mapName] || {}).people || []).find((p) => /_EventScript_Nurse$/.test(p.script || ""));
    const id = nurseDef && nurseDef.localId;
    await say(T("Text_FirstShouldRestoreMonsHealth"));
    Screen.say("");
    if (id) await Overworld.act([{ who: id, moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
    await Overworld.pokecenterHeal(player.party.length, () => fanfare("mus_heal"));
    if (id) await Overworld.act([{ who: id, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    player.party.forEach(Party.heal);
    await say(T(player.flags.TRAINER_LEADER_BROCK ? "Text_MonsHealed" : "Text_MonsHealedShouldBuyPotions"));
  }
  // EventScript_AfterWhiteOutMomHeal: (Red's) Mom turns to you, and heals them.
  async function afterBlackoutMom() {
    const mom = (p) => [].concat(p).map((t) => t.replace(/^Mom: /, "Red's Mom: ").replace("Welcome home.", "Welcome back.").replace("Make me proud, honey!", "Make us proud!"));
    await Overworld.act([{ who: "LOCALID_MOM", moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    await say(mom(T("Text_HadQuiteAnExperienceTakeRest")));
    await outOfCenterHeal();
    await say(mom(T("Text_MomExplainHPGetPotions")));
  }

  // ---------- Evolution and moves ----------

  // FireRed's evolution scene (ui/evolution-scene.js). As in FireRed, holding
  // B while the two shapes trade places stops it (when it can be stopped).
  async function evolve(record, evo, canStop) {
    const name = Party.displayName(record);
    const url = (r) => Screen.spriteUrl(r.species, Party.form(r), false, r.shiny);
    show("scene");
    Screen.say("");
    clearMenu();
    const evoScene = await EvolutionScene.open(scene, { from: url(record), into: url(Object.assign({}, record, { species: evo.into })) });
    try {
      music(null);
      await evoScene.fadeIn();
      Screen.say("What? " + name + " is evolving!");
      await Screen.printed();
      cry(record.species);
      await sleep(1000);
      const intro = GA && GA.se("mus_evolution_intro");
      await sleep(intro ? intro * 1000 : 1700);
      music("mus_evolution");
      const evolved = await evoScene.run({ canStop, onStop: () => music(null), onEvolved: () => music(null) });
      if (!evolved) {
        cry(record.species);
        await message("Huh? " + name + " stopped evolving!");
        return;
      }
      const oldSpecies = record.species;
      const shed = Evolution.shedinja(record);
      const newMoves = Evolution.evolve(record, evo.into, evo);
      cry(record.species);
      await sleep(600);
      const jingle = fanfare("mus_evolved");
      await message("Congratulations! Your " + (record.nickname || Party.speciesName(oldSpecies)) + " evolved into " +
        Party.speciesName(record.species) + "!");
      await jingle;
      Player.markCaught(player, record.species);
      for (const move of newMoves) await learnMove(record, move);
      if (shed && evo.into === "Ninjask" && player.party.length < Player.PARTY_SIZE && Player.removeItem(player, "poke-ball")) {
        Player.receive(player, shed);
        await evoScene.show(url(shed));
        await message("Something appeared in the empty Poké Ball... It's Shedinja!");
      }
    } finally {
      evoScene.close();
    }
  }

  async function learnMove(record, move) {
    const name = Party.displayName(record);
    if (Party.teachMove(record, move)) {
      await message(name + " learned " + move + "!");
      return;
    }
    // FireRed's way: the Summary screen's move list to pick one to forget.
    for (;;) {
      await message(name + " is trying to learn " + move + ".");
      await message("But " + name + " can't learn more than four moves.");
      if (await confirm("Delete an older move to make room for " + move + "?")) {
        await say("Which move should be forgotten?");
        const slot = await chooseMoveToForget(record, move);
        if (slot != null) {
          const old = record.moves[slot].name;
          Party.teachMove(record, move, slot);
          await message("1, 2, and… … … Poof!");
          await message(name + " forgot " + old + ".");
          await message("And… " + name + " learned " + move + "!");
          return;
        }
      }
      if (await confirm("Stop learning " + move + "?")) { await message(name + " did not learn " + move + "."); return; }
    }
  }

  // ---------- Using and giving items ----------

  // Uses `item` from the bag on `record`, with whatever follows (evolving, new moves).
  async function useItemOn(record, item) {
    const name = Party.displayName(record);
    if (record.egg) { await message("It won't have any effect."); return; }
    if (Bag.isStone(item)) {
      const evo = Evolution.find(record, { trigger: "item", item, party: player.party });
      if (!evo) { await message("It won't have any effect."); return; }
      // (Milcery: it spins with the Sweet, this way or that, a little or a
      // lot; that and the time of day make Alcremie's cream.)
      if (evo.into === "Alcremie") {
        const way = await multichoice("Which way will " + name + " spin?", 0, 0, ["Clockwise", "Counterclockwise", "Cancel"]);
        if (way !== 0 && way !== 1) return;
        const long = await multichoice("For how long?", 0, 0, ["A little", "A lot", "Cancel"]);
        if (long !== 0 && long !== 1) return;
        record.alcremie = Party.alcremieCream(way === 0, long === 1, Player.gameTime().hour) + "-" + item;
      }
      Player.removeItem(player, item);
      await evolve(record, evo, false);
      return;
    }
    if (Bag.isMachine(item)) {
      // TMs and HMs are reusable, so nothing leaves the bag.
      const move = Bag.machineMove(item);
      if (Party.knowsMove(record, move)) { await message(name + " already knows " + move + "."); return; }
      if (!Party.canLearnMachine(record, move)) { await message(name + " can't learn " + move + "."); return; }
      await message("You booted up the " + Bag.name(item).split(" ")[0] + ".");
      await learnMove(record, move);
      // (Learning from a TM or HM pleases it a little, as in FireRed.)
      if (Party.knowsMove(record, move)) Party.adjustFriendship(record, "tm", player.location && player.location.map);
      return;
    }
    if (Bag.mintNature(item)) {
      if (!Bag.canUseOn(record, item)) { await message("It won't have any effect."); return; }
      Player.removeItem(player, item);
      const r = Bag.useOn(record, item);
      await message(name + "'s nature changed from " + r.oldNature + " to " + r.nature + "!");
      return;
    }
    if (item === "ability-capsule" || item === "ability-patch") {
      // (Gen 6: it asks first.)
      const to = item === "ability-patch" ? Bag.patchAbility(record) : Bag.capsuleAbility(record);
      if (!to) { await message("It won't have any effect."); return; }
      if (!(await confirm("Do you want to change " + name + "'s Ability from " + record.ability + " to " + to + "?"))) return;
      Player.removeItem(player, item);
      Bag.useOn(record, item);
      await message(name + "'s Ability changed to " + to + "!");
      return;
    }
    if (item === "dynamax-candy" || item === "max-mushrooms") {
      if (!Bag.canUseOn(record, item)) { await message("It won't have any effect."); return; }
      Player.removeItem(player, item);
      const r = Bag.useOn(record, item);
      await message(item === "dynamax-candy" ? name + "'s Dynamax Level rose to " + r.level + "!"
        : r.gmax ? name + " ate the Max Soup and gained the G-Max Factor!" : name + " ate the Max Soup and lost the G-Max Factor.");
      return;
    }
    if (item === "zygarde-cube") {
      if (!Bag.canUseOn(record, item)) { await message("It won't have any effect."); return; }
      const v = await multichoice("What would you like to do?", 0, 0, ["Change Forme", "Change Ability", "Cancel"]);
      if (v === 0) {
        const r = Bag.zygardeCube(record, "forme");
        await message(name + " transformed into its " + (r.species === "Zygarde-10%" ? "10%" : "50%") + " Forme!");
      } else if (v === 1) {
        const r = Bag.zygardeCube(record, "ability");
        await message(name + "'s Ability changed to " + r.ability + "!");
      }
      return;
    }
    if (item === "bottle-cap" || item === "gold-bottle-cap") {
      // Hyper Training: a stat's IV acts as 31 (a Gold Bottle Cap: all of them).
      if (record.level < Bag.HYPER_TRAINING_LEVEL) { await message(name + " must be at least Lv. " + Bag.HYPER_TRAINING_LEVEL + " for Hyper Training."); return; }
      if (!Bag.canUseOn(record, item)) { await message(name + " can't be trained any more."); return; }
      let stat;
      if (item === "bottle-cap") {
        const can = Bag.trainableStats(record);
        const v = await multichoice("Which stat should be Hyper Trained?", 21, 0, can.map((k) => STAT_NAMES[k]).concat(["Cancel"]));
        Screen.say("");
        if (v < 0 || v >= can.length) return;
        stat = can[v];
      }
      Player.removeItem(player, item);
      const r = Bag.useOn(record, item, { stat });
      await message(item === "gold-bottle-cap" ? name + " was Hyper Trained in all its stats!"
        : name + "'s " + STAT_NAMES[r.trained[0]] + " was Hyper Trained!");
      return;
    }
    if (item === "tin-bottle-cap") {
      // (A stat's IV down to 0.)
      const can = Bag.lowerableStats(record);
      if (!can.length) { await message("It won't have any effect."); return; }
      const v = await multichoice("Which stat's IV should go down to 0?", 21, 0, can.map((k) => STAT_NAMES[k]).concat(["Cancel"]));
      Screen.say("");
      if (v < 0 || v >= can.length) return;
      Player.removeItem(player, item);
      Bag.useOn(record, item, { stat: can[v] });
      await message(name + "'s " + STAT_NAMES[can[v]] + " IV went down to 0!");
      return;
    }
    // (At the level cap, Rare Candies and Exp. Candies do nothing: Player.levelCap.)
    if ((item === "rare-candy" || (ItemUse.effect(item) || {}).expCandy) && record.level >= Player.levelCap(player)) {
      await message(name + " is at the level cap (Lv. " + Player.levelCap(player) + ").\nIt won't have any effect.");
      return;
    }
    if (item === "rare-candy") {
      if (!Bag.canUseOn(record, item)) { await message("It won't have any effect."); return; }
      if (!player.flags.debugCandy) Player.removeItem(player, item);   // the debug menu makes them infinite
      const newMoves = Bag.levelUp(record, { here: player.location && player.location.map });
      await message(name + " grew to Lv. " + record.level + "!");
      for (const move of newMoves) await learnMove(record, move);
      const evo = Evolution.find(record, { trigger: "level", party: player.party, coins: coins() });
      if (evo) await evolve(record, evo, true);
      return;
    }
    // Tera Shards: fifty of a type change its Tera Type to that type.
    const shardType = Bag.teraShardType(item);
    if (shardType) {
      if (!Bag.canUseOn(record, item)) { await message("It won't have any effect."); return; }
      const need = Bag.TERA_SHARDS_NEEDED, have = Player.itemCount(player, item);
      if (have < need) { await message("It takes " + need + " " + Bag.name(item) + "s to change\na Pokémon's Tera Type. (You have " + have + ".)"); return; }
      if (!(await confirm(name + "'s Tera Type: " + Party.teraType(record) + "\nChange it to " + shardType + "? (" + need + " Shards)"))) return;
      Player.removeItem(player, item, need);
      record.teraType = shardType;
      await message(name + "'s Tera Type changed to " + shardType + "!");
      return;
    }
    if ((ItemUse.effect(item) || {}).expCandy) {
      if (!Bag.canUseOn(record, item)) { await message("It won't have any effect."); return; }
      Player.removeItem(player, item);
      const r = Bag.expCandy(record, item, { here: player.location && player.location.map, cap: Player.levelCap(player) });
      await message(name + " gained " + r.exp.toLocaleString("en-US") + " Exp. Points!");
      for (const lv of r.levels) {
        await message(name + " grew to Lv. " + lv.level + "!");
        for (const move of lv.moves) await learnMove(record, move);
      }
      const evo = r.levels.length && Evolution.find(record, { trigger: "level", party: player.party, coins: coins() });
      if (evo) await evolve(record, evo, true);
      return;
    }
    let move;
    const eff = ItemUse.effect(item);
    if (eff && eff.oneMove) {
      // FireRed's: the question in the text box (gText_BoostPp... "Boost PP of
      // which move?", "Restore which move?") and the moves in a window at the
      // right (ShowMoveSelectWindow); B goes back.
      const v = await multichoice(eff.ppUp ? "Boost PP of which move?" : "Restore which move?", 29, 5, record.moves.map((m) => m.name));
      Screen.say("");
      if (v < 0) return;
      move = v;
    }
    if (!Bag.canUseOn(record, item, { move })) { await message(eff && eff.evDown ? "It would have no effect." : "It won't have any effect."); return; }
    Player.removeItem(player, item);
    const r = Bag.useOn(record, item, { move, here: player.location && player.location.map });
    if (r.revived) await message(name + " was revived!");
    if (r.healed) await message(name + "'s HP was restored by " + plural(r.healed, "point") + ".");
    if (r.cured) await message(name + " was cured of its " + ({ psn: "poisoning", tox: "poisoning", par: "paralysis", slp: "sleep", brn: "burn", frz: "freezing" }[r.cured] || "status") + ".");
    if (r.pp) await message(name + "'s PP was restored.");
    if (r.ppUp) await message(record.moves[move].name + "'s PP increased.");
    if (r.ev) await message(name + "'s base " + STAT_NAMES[eff.ev] + "\nrose.");
    // (An EV-lowering Berry, as Gen 4 says it.)
    if (r.evStat) await message(name + " turned friendly.\nIts base " + STAT_NAMES[r.evStat] + " fell!");
  }

  async function giveItem(record, item) {
    if (record.egg) { await message("An Egg can't hold items."); return; }
    Player.removeItem(player, item);
    const old = Bag.give(record, item);
    if (old) {
      Player.addItem(player, old);
      await message("Swapped " + Party.displayName(record) + "'s " + Bag.name(old) + " for the " + Bag.name(item) + ".");
    } else {
      await message(Party.displayName(record) + " is now holding the " + Bag.name(item) + ".");
    }
  }

  // ---------- FireRed's party screen (ui/party-menu.js) ----------

  // The Egg's pictures (tools/build-eggs.js).
  const EGG_ICON = "assets/sprites/icons/egg.png", EGG_PIC = "assets/sprites/egg.png";
  const iconOf = (r) => (r.egg ? EGG_ICON : Screen.iconUrl(r.species, Party.form(r)));
  const partyMons = (notes) => player.party.map((r, i) => ({
    name: Party.displayNameOrEgg(r), egg: !!r.egg, icon: iconOf(r), level: r.level, gender: r.egg ? "" : r.gender,
    hp: r.hp, maxhp: Party.maxHp(r), status: r.status, item: !!r.item, desc: notes ? notes[i] : null
  }));
  // Opens it on the party (Screen.say("") first: no old text over it).
  function openParty(opts) {
    Screen.say("");
    clearMenu();
    return PartyMenu.open(Object.assign({ mons: partyMons(opts.notes), frame: GameOptions.get().frame }, opts));
  }

  // Choosing a Pokémon for something (an item, a trade, a tutor): FireRed's
  // party screen with `message` ("Use on which POKéMON?"). For a TM or an
  // evolution stone each box says whether it can be used (ABLE / NOT ABLE /
  // LEARNED), as in FireRed. Resolves with the record, or null (B).
  // (A move tutor passes its own notes instead of an item.)
  async function choosePartyFor(message, item, notes) {
    const note = (r) => (Bag.isMachine(item) && Party.knowsMove(r, Bag.machineMove(item)) ? "LEARNED"
      : Bag.canUseOn(r, item, { party: player.party }) ? "ABLE" : "NOT ABLE");
    if (!notes) notes = item && (Bag.isMachine(item) || Bag.isStone(item)) ? player.party.map(note) : null;
    const r = await openParty({ message, notes });
    PartyMenu.close();
    return r ? player.party[r.slot] : null;
  }

  const RODS = ["fishing-rod"];
  const KEY_ITEM_USES = ["exp-share", "town-map", "explorer-kit", "berry-pouch", "itemfinder", "vs-seeker", "bicycle", "poke-flute", "coin-case", "powder-jar", "unown-report", "apricorn-box", "pokeblock-case"].concat(RODS);
  // Key items Select can use (registered from the Bag, as in FireRed).
  const REGISTERABLE = ["bicycle", "itemfinder", "vs-seeker", "town-map", "berry-pouch", "explorer-kit"].concat(RODS);
  const STAT_NAMES = { hp: "HP", atk: "Attack", def: "Defense", spa: "Sp. Atk", spd: "Sp. Def", spe: "Speed" };
  const usableFromBag = (item) => Bag.isStone(item) || Bag.isMachine(item) || !!Bag.mintNature(item) ||
    item === "ability-capsule" || item === "ability-patch" || item === "bottle-cap" || item === "gold-bottle-cap" || item === "tin-bottle-cap" || item === "zygarde-cube" ||
    item === "dynamax-candy" || item === "max-mushrooms" || !!Bag.teraShardType(item) ||
    item === "rare-candy" || !!ItemUse.effect(item) || KEY_ITEM_USES.includes(item) || item in REPEL_STEPS || item in LURE_STEPS || item === "escape-rope";
  // TMs and HMs work like key items: they can't be held, tossed or sold.
  const holdable = (item) => !Bag.isBall(item) && !Bag.isMachine(item) && !Bag.isKeyItem(item);
  const expShareOn = () => Player.itemCount(player, "exp-share") > 0 && !player.flags.expShareOff;

  // Key items used from the bag: the Exp. Share switches on and off; the Town
  // Map opens the map of Kanto; the Explorer Kit digs in a cave wall (and
  // closes the bag afterwards, back to the map: "escaped").
  async function useKeyItem(item) {
    if (item === "explorer-kit") return (await explorerKit()) ? "escaped" : null;
    if (item === "pokeblock-case") { await hoennPokeblock.menu(); return null; }   // (Hoenn's Pokéblocks: ui/hoenn-pokeblock.js)
    if (item === "berry-pouch") return (await berryPouch()) ? "escaped" : null;
    if (item === "itemfinder") { fieldAction = itemfinder; return "escaped"; }
    if (item === "vs-seeker") { fieldAction = vsSeeker; return "escaped"; }
    if (item === "bicycle") { fieldAction = bicycle; return "escaped"; }
    if (RODS.includes(item)) {
      // (Only facing water: FireRed's FieldUseFunc_Rod.)
      if (!Overworld.ahead().fishable) { await message("Oak: " + player.name + "! This isn't the time to use that!"); return; }
      fieldAction = () => fish();
      return "escaped";
    }
    if (item === "poke-flute") {
      // FireRed's Poké Flute outside battle: it wakes your sleeping Pokémon.
      const asleep = player.party.filter((r) => r.status === "slp");
      asleep.forEach((r) => { r.status = ""; });
      await message(asleep.length ? "Played the Poké Flute.\nAll sleeping Pokémon woke up." : "Played the Poké Flute.\nNow, that's a catchy tune!");
      return;
    }
    if (item === "exp-share") {
      player.flags.expShareOff = !player.flags.expShareOff;
      await message(expShareOn() ? "The Exp. Share was turned on. Your whole party will gain Exp. Points from battles."
        : "The Exp. Share was turned off. Only Pokémon that battle will gain Exp. Points.");
    } else if (item === "town-map") await townMap();
    else if (item === "coin-case") await message("Your Coins:\n" + plainCoins(coins()));
    // (The Unown Report: the letters caught, ui/johto-alph.js.)
    else if (item === "unown-report") await alphOverlay((c) => JohtoAlph.report(c, player.flags.unownCaught, { frame: GameOptions.get().frame, sfx,
      level: +johto.getVar("VAR_UNOWN_REPORT_LEVEL") || 0, name: player.name }));
    // (HGSS's Apricorn Box: your Apricorns, ui/apricorn-box.js.)
    else if (item === "apricorn-box") await apricornBox("view");
    // (FieldUseFunc_PowderJar: how much Berry Powder you have.)
    else if (item === "powder-jar") await message("Berry Powder:\n" + (player.flags.berryPowder | 0).toLocaleString("en-US"));
  }

  // Something to do on the map once the menus close (the Itemfinder).
  let fieldAction = null;
  let afterScript = null;   // (run once the event's script is over: sailToSinnoh)
  // The Itemfinder (FireRed's src/itemfinder.c): a hidden item within 7 steps
  // across and 5 up or down makes it respond, and you turn toward the nearest;
  // one right underfoot is dug up.
  async function itemfinder() {
    const at = Overworld.position(), m = window.WORLD_MAPS[at.map] || {};
    const hidden = (m.hidden || []).filter((h) => !player.flags[h.flag]);
    const under = hidden.find((h) => h.x === at.x && h.y === at.y);
    if (under) {
      await say(["Oh!\nThe Itemfinder's shaking wildly!", "There's an item buried underfoot!", "‥ ‥ ‥ ‥ ‥ ‥"]);
      Player.addItem(player, under.item, under.quantity);
      player.flags[under.flag] = true;
      await sayWithJingle(itemJingle(under.item), "{PLAYER} found " + (under.quantity > 1 ? under.quantity + " " : "a ") + Bag.name(under.item) + "!");
      return;
    }
    let best = null;
    for (const h of hidden) {
      const dx = h.x - at.x, dy = h.y - at.y;
      if (Math.abs(dx) <= 7 && Math.abs(dy) <= 5 && (!best || Math.abs(dx) + Math.abs(dy) < Math.abs(best.dx) + Math.abs(best.dy))) best = { dx, dy };
    }
    if (!best) { await say("‥ ‥ ‥ ‥Nope!\nThere's no response."); return; }
    const face = Math.abs(best.dx) >= Math.abs(best.dy) ? (best.dx > 0 ? "right" : "left") : (best.dy > 0 ? "down" : "up");
    await Overworld.act([{ who: "player", moves: ["face_" + face] }]);
    await say(["Huh?\nThe Itemfinder's responding!", "There's an item buried around here!"]);
  }

  // The VS Seeker (FireRed's src/vs_seeker.c, but charged by 50 steps, not
  // 100): it signals the trainers on screen. One you haven't beaten shows
  // "!"; one you have always wants a rematch ("!!") and stays put, facing the
  // way they were, until you beat them or leave the map (with the same team,
  // for now).
  const VS_SEEKER_CHARGE = 50;
  async function vsSeeker() {
    const f = player.flags;
    const steps = f.vsSeekerSteps == null ? VS_SEEKER_CHARGE : f.vsSeekerSteps;
    if (steps < VS_SEEKER_CHARGE) {
      await say(["The battery isn't charged enough.", "No. of steps required to fully\ncharge the battery: " + (VS_SEEKER_CHARGE - steps)]);
      return;
    }
    const at = Overworld.position();
    const near = Overworld.people().filter((p) => p.def.trainer && p.def.trainer.id && TRAINER_SCRIPTS.has(p.def.script) &&
      Math.abs(p.x - at.x) <= 7 && Math.abs(p.y - at.y) <= 5);
    if (!near.length) { await say(["There are no Trainers within range\nwho can battle…", "The VS Seeker was turned off."]); return; }
    const rematch = f.vsRematch || (f.vsRematch = {});
    const tracks = [], ready = [];
    for (const p of near) {
      const id = p.def.trainer.id, who = "#" + p.def.id;
      if (!f[id] || rematch[id]) { tracks.push({ who, moves: [f[id] ? "emote_double_excl_mark" : "emote_exclamation_mark"] }); continue; }
      // (Kept by facing, so they stay that way after a battle or the menu.)
      ready.push(id);
      rematch[id] = p.facing || "down";
      Overworld.lockPerson(p.def.id, rematch[id]);
      tracks.push({ who, moves: ["walk_in_place_faster_" + rematch[id], "emote_double_excl_mark"] });
    }
    sfx("se_pin");
    if (ready.length) f.vsSeekerSteps = 0;
    await Overworld.act(tracks);
    if (!ready.length && !near.some((p) => !f[p.def.trainer.id] || rematch[p.def.trainer.id])) {
      await say(["The other Trainers don't appear\nto be ready for battle.", "Let's wait till later."]);
    }
  }
  // Every 200 steps, each Pokémon in the party grows a little friendlier
  // (FireRed's UpdateFriendshipStepCounter is every 128 steps, half the time).
  const FRIENDSHIP_STEPS = 200;
  function friendshipStep() {
    const f = player.flags;
    f.friendshipSteps = ((f.friendshipSteps | 0) + 1) % FRIENDSHIP_STEPS;
    if (f.friendshipSteps) return;
    for (const r of player.party) if (!r.egg) Party.adjustFriendship(r, "walking", player.location.map);
  }
  function vsSeekerStep() {
    const f = player.flags;
    if (f.vsSeekerSteps != null && f.vsSeekerSteps < VS_SEEKER_CHARGE) f.vsSeekerSteps++;
  }

  // Johto's Town Map (window.JOHTO_TOWN_MAP, at the end of data/johto-maps.js:
  // tools/build-johto-town-map.js): HGSS's Pokégear map drawn in FireRed's
  // region-map tiles, on its own grid (x0, y0: where its first square is).
  // Its maps' sections, their names and its Fly spots join Kanto's in
  // window.TOWN_MAP (Johto's sections are its own: ROUTE_29, VIOLET_CITY, ...),
  // so whatever asks TOWN_MAP where a map is (the area's name as you arrive,
  // the Trainer Memo's "met in", a Pokémon's friendship where it was met, Fly)
  // knows Johto's too.
  const JOHTO_MAP = window.JOHTO_TOWN_MAP || null;
  if (JOHTO_MAP && window.TOWN_MAP && !window.TOWN_MAP.johto) {
    const T = window.TOWN_MAP;
    T.johto = JOHTO_MAP;
    Object.assign(T.mapSections, JOHTO_MAP.mapSections);
    Object.assign(T.names, JOHTO_MAP.names);
    T.fly = Object.assign({}, T.fly, JOHTO_MAP.fly);
  }
  // Hoenn's (window.HOENN_TOWN_MAP, in data/emerald-maps.js: tools/lib/hoenn-town-map.js): Emerald's region map,
  // its maps' sections and names, and Fly's spots (outside each town's Pokémon Center), as Johto's join them.
  const HOENN_MAP = window.HOENN_TOWN_MAP || null;
  if (HOENN_MAP && window.TOWN_MAP && !window.TOWN_MAP.hoenn) {
    const T = window.TOWN_MAP;
    T.hoenn = HOENN_MAP;
    Object.assign(T.mapSections, HOENN_MAP.mapSections);
    Object.assign(T.names, HOENN_MAP.names);
    T.fly = Object.assign({}, T.fly, HOENN_MAP.fly);
  }
  // (Have you been to Hoenn: any of its sections visited.)
  const beenToHoenn = () => !!HOENN_MAP && (player.flags.visitedSections || []).some((sec) => sec in HOENN_MAP.names);
  // (And Kanto's Victory Road, once you've been inside: outside its entrance
  // on Route 23. This game's own; FireRed has no Fly to caves.)
  if (window.TOWN_MAP && window.TOWN_MAP.fly && !window.TOWN_MAP.fly.KANTO_VICTORY_ROAD)
    window.TOWN_MAP.fly.KANTO_VICTORY_ROAD = { map: "Route23", x: 5, y: 29 };
  // (Have you been to Johto: any of its sections visited.)
  const beenToJohto = () => !!JOHTO_MAP && (player.flags.visitedSections || []).some((sec) => sec in JOHTO_MAP.names);

  // The Town Map (with { fly: true }, for Fly: the places you can fly to are
  // marked, and A on one resolves with where Fly lands there; B, null): FireRed's Kanto map (tools/build-town-map.js) with your
  // icon where you are. Move the cursor with the arrow keys, or tap a place,
  // to see its name. With the Sevii Islands' pages (One Island's Pokémon
  // Center: FLAG_SYS_SEVII_MAP_123, then _4567 with the Rainbow Pass), SWITCH
  // (or R) turns to the Sevii Islands' maps, as FireRed's switch menu does:
  // Kanto, Sevii 1-2-3, 4-5 and 6-7. It opens on the map you're on. In Johto
  // it's Johto's map (JOHTO_MAP), and once you've been to Johto SWITCH turns to
  // it from Kanto's too; and Hoenn's once you've been there. Fly goes to any
  // of them, the region you're in first.
  async function townMap(opts) {
    const T = window.TOWN_MAP, flying = !!(opts && opts.fly), f = player.flags;
    const pct = (n, of) => (n / of * 100) + "%";
    const map = player.location && player.location.map, johtoHere = !!JOHTO_MAP && inJohto(map);
    // The maps you can turn to: Kanto, and the Sevii pages you have; Johto's.
    // (Kanto's grid starts 32 pixels in and down, as FireRed's: src/region_map.c.)
    const kanto = [{ id: "KANTO", label: "Kanto", image: "assets/town-map/kanto.png", map: T.map, dungeon: T.dungeon }]
      .concat((T.sevii || []).filter((r) => r.id === "SEVII_123" ? f.seviiMap123 || f.seviiMap4567 : f.seviiMap4567)
        .map((r) => Object.assign({ label: { SEVII_123: "Sevii Islands 1-2-3", SEVII_45: "Sevii Islands 4-5", SEVII_67: "Sevii Islands 6-7" }[r.id] }, r)))
      .map((r) => Object.assign({ x0: 32, y0: 32, width: T.width, height: T.height, towns: T.towns }, r));
    // (Flying too: every map you have, the region you're in first, and SELECT
    // turns through them, so you can fly between Kanto, the Sevii Islands and Johto.)
    const johto = JOHTO_MAP && (johtoHere || beenToJohto()) ? [JOHTO_MAP] : [];
    // (Hoenn's too, once you've been: first when you're there, and to fly to from anywhere, and from it back home.)
    const hoennHere = !!HOENN_MAP && isHoenn(map);
    const hoennMaps = HOENN_MAP && !hoennHere && beenToHoenn() ? [HOENN_MAP] : [];
    const regions = hoennHere ? [HOENN_MAP].concat(kanto, JOHTO_MAP && beenToJohto() ? [JOHTO_MAP] : []) : (johtoHere ? johto.concat(kanto) : kanto.concat(johto)).concat(hoennMaps);
    const sprite = (R, x, y) => "left:" + pct(R.x0 - 4 + 8 * x, 240) + ";top:" + pct(R.y0 - 4 + 8 * y, 160);
    const cellIn = (R, sec) => {
      if (!sec) return null;
      for (const layer of [R.map, R.dungeon]) for (let y = 0; y < R.height; y++) for (let x = 0; x < R.width; x++) if (layer[y][x] === sec) return [x, y];
      return null;
    };
    const find = (sec) => { for (let i = 0; i < regions.length; i++) { const c = cellIn(regions[i], sec); if (c) return { region: i, cell: c }; } return null; };
    // (In Johto, the square you're on: HGSS's world matrix has a square every
    // 32 tiles of a map outdoors; inside, where the building or cave is.)
    const johtoAt = (name, x, y) => {
      // (Hoenn's: the square of its section, or, for a cave with none, of the place it's by.)
      if (HOENN_MAP && HOENN_MAP.at[name] && regions.indexOf(HOENN_MAP) >= 0) return { region: regions.indexOf(HOENN_MAP), cell: HOENN_MAP.at[name].slice(0, 2) };
      const at = JOHTO_MAP && JOHTO_MAP.at[name], R = JOHTO_MAP;
      if (!at || regions.indexOf(R) < 0) return null;
      const cell = at[2] ? [at[0] + Math.floor((x | 0) / 32), at[1] + Math.floor((y | 0) / 32)] : [at[0], at[1]];
      return { region: regions.indexOf(R), cell: [Math.max(0, Math.min(R.width - 1, cell[0])), Math.max(0, Math.min(R.height - 1, cell[1]))] };
    };
    // (Somewhere with no square of its own, the Underground Path or the S.S. Anne:
    // where you came in from outdoors.)
    const loc = player.location || {}, esc = f.escapeWarp || {};
    const here = johtoAt(loc.map, loc.x, loc.y) || find(T.mapSections[loc.map]) || johtoAt(esc.map, esc.x, esc.y) || find(T.mapSections[esc.map]) ||
      (hoennHere ? { region: 0, cell: cellIn(regions[0], "LITTLEROOT_TOWN") } : johtoHere ? { region: 0, cell: cellIn(regions[0], "NEW_BARK_TOWN") } : { region: 0, cell: cellIn(regions[0], "PALLET_TOWN") });
    let region = here.region, [cx, cy] = here.cell;
    visitSection(player.location && player.location.map);
    const visited = f.visitedSections || [];
    // Places not on the map yet (GetDungeonMapsecUnderCursor): Cerulean Cave until it's open.
    const hiddenSection = (sec) => sec === "CERULEAN_CAVE" && !f.canLinkWithRS;
    // Fly's places: visited, with somewhere to land.
    const flyTo = (sec) => (flying && sec && visited.includes(sec) && (T.fly || {})[sec]) || null;
    // (A square's place to fly to: its town's, or else its cave's, Victory Road.)
    const flySec = (R, x, y) => (flyTo(R.map[y][x]) || !R.dungeon || !flyTo(R.dungeon[y][x]) ? R.map[y][x] : R.dungeon[y][x]);
    show("scene");
    const render = () => {
      const R = regions[region];
      // FireRed's small icons on the caves and forests (CreateDungeonIcons): lit
      // once you've been there. Cerulean Cave's shows only once Celio has the
      // Sapphire (FLAG_SYS_CAN_LINK_WITH_RS), as its entrance opens then. On a
      // town's square the icon sits 2 pixels lower and to the right.
      let icons = "";
      for (let y = 0; y < R.height; y++) for (let x = 0; x < R.width; x++) {
        const sec = R.dungeon[y][x];
        if (!sec || hiddenSection(sec)) continue;
        const off = R.towns.includes(R.map[y][x]) ? 2 : 0;
        icons += '<div class="tm-dungeon' + (visited.includes(sec) ? " visited" : "") + '" style="left:' + pct(R.x0 + 8 * x + off, 240) +
          ";top:" + pct(R.y0 + 8 * y + off, 160) + '"></div>';
      }
      if (flying) {
        const marked = new Set();
        for (let y = 0; y < R.height; y++) for (let x = 0; x < R.width; x++) {
          const sec = flySec(R, x, y);
          if (!flyTo(sec) || marked.has(sec)) continue;
          marked.add(sec);
          icons += '<div class="tm-fly" style="' + sprite(R, x, y) + '"></div>';
        }
      }
      scene.innerHTML = '<div class="town-map' + (flying ? " flying" : "") + '"><img class="tm-map" src="' + R.image + '" alt="Map of ' + R.label + '">' + icons +
        '<div class="tm-name"><b></b><small></small></div>' +
        (region === here.region ? '<img class="tm-player" src="assets/town-map/player.png" alt="You are here" style="' + sprite(R, here.cell[0], here.cell[1]) + '">' : "") +
        '<div class="tm-cursor"></div></div>';
      draw();
    };
    const draw = () => {
      const R = regions[region], place = hiddenSection(R.map[cy][cx]) ? null : R.map[cy][cx], cave = hiddenSection(R.dungeon[cy][cx]) ? null : R.dungeon[cy][cx];
      scene.querySelector(".tm-name b").textContent = T.names[place] || T.names[cave] || (flying ? "Where do you want to fly?" : "");
      scene.querySelector(".tm-name small").textContent = place && cave ? T.names[cave] : "";
      scene.querySelector(".tm-cursor").setAttribute("style", sprite(R, cx, cy));
    };
    render();
    const move = (dx, dy) => { const R = regions[region]; cx = Math.max(0, Math.min(R.width - 1, cx + dx)); cy = Math.max(0, Math.min(R.height - 1, cy + dy)); draw(); };
    // SWITCH: the next map, the cursor on the place you're at there (or the
    // map's first town).
    const switchMap = () => {
      if (regions.length < 2) return;
      sfx("se_select");
      region = (region + 1) % regions.length;
      const R = regions[region];
      const at = region === here.region ? here.cell : (() => {
        for (let y = 0; y < R.height; y++) for (let x = 0; x < R.width; x++) if (R.towns.includes(R.map[y][x])) return [x, y];
        return [Math.min(cx, R.width - 1), Math.min(cy, R.height - 1)];
      })();
      [cx, cy] = at;
      render();
    };
    let picked = null;
    const choose = new Promise((resolve) => { picked = resolve; });
    const onKey = (e) => {
      if (flying && ["z", "Z", " ", "Enter"].includes(e.key)) {
        e.preventDefault(); e.stopPropagation();
        const spot = flyTo(flySec(regions[region], cx, cy));
        if (spot) { sfx("se_select"); picked(spot); }
        return;
      }
      // (Flying: no buttons under the map, as in FireRed: B goes back, SELECT
      // or R changes region.)
      if (flying && ["x", "X", "Escape"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); picked(null); return; }
      if (e.key === "r" || e.key === "R" || (flying && (e.key === "Select" || e.key === "Backspace"))) {
        e.preventDefault(); e.stopPropagation();
        if (regions.length > 1) switchMap();
        return;
      }
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      move(d[0], d[1]);
    };
    document.addEventListener("keydown", onKey, true);
    // (no text over the map)
    const buttons = (regions.length > 1 ? [{ label: "Switch", value: "switch", className: "action" }] : []).concat([back("Close")]);
    let r;
    if (flying) r = await choose;
    else for (;;) {
      r = await Promise.race([ask("", buttons).then((v) => (v === "switch" ? "switch" : null)), choose]);
      if (r !== "switch") break;
      switchMap();
    }
    clearMenu();
    document.removeEventListener("keydown", onKey, true);
    if (flying) show("world");
    return r;
  }

  // Diamond and Pearl's Underground digging (game/mining.js, ui/mining.js), in
  // any cave. Whatever is fully dug out goes in the bag. Digging earns mining
  // XP (flags.miningXp): your mining level decides your energy and what can be
  // buried.
  const miningXp = () => {
    const f = player.flags;
    // Saves from when the level counted treasures (each worth 20 XP now: the same level).
    if (f.miningXp == null && f.miningDug) f.miningXp = f.miningDug * 20;
    delete f.miningDug;
    return f.miningXp | 0;
  };
  // Fishing XP (flags.fishingXp, game/fishing.js): every Pokémon hooked earns
  // some, and your fishing level decides what bites.
  const fishingXp = () => player.flags.fishingXp | 0;
  async function explorerKit() {
    const here = player.location && window.WORLD_MAPS[player.location.map];
    if (!here || here.type !== "underground") { await message("Oak: " + player.name + "! This isn't the time to use that!"); return false; }
    show("scene");
    clearMenu();
    const f = player.flags, xp = miningXp(), before = Mining.level(xp);
    const dig = Mining.create(Math.random, before, player.location.map);
    const found = await MiningScreen.run(scene, dig, xp);
    f.miningXp = xp + dig.xp;
    // (In the dig's text box, under the screen.)
    for (const id of found) {
      Player.addItem(player, id);
      await MiningScreen.message(player.name + " obtained " + article(Bag.name(id)) + "!");
    }
    if (!found.length) await MiningScreen.message("Nothing was dug up…");
    await MiningScreen.message("Gained " + dig.xp + " mining XP.");
    const after = Mining.level(f.miningXp);
    if (after > before) await MiningScreen.message("Your mining level rose to " + after + "! You have more energy, and rarer treasures may turn up now.");
    // (A new tool: the Hammer at 5, the Bomb at 10, the Survey Kit at 20.)
    for (const t of Mining.TOOLS) if (t.level > before && t.level <= after) await MiningScreen.message("You can use the " + t.name + " now! SELECT changes tools.");
    MiningScreen.clear();
    await persist();
    return true;
  }

  // Picking berries with the Berry Pouch (game/berry-picking.js,
  // ui/berry-picking.js), in a forest: shake a tree and catch what falls.
  // Playing earns farming XP (flags.farmingXp): your farming level adds
  // berries and decides which kinds you can pick.
  const FORESTS = ["ViridianForest", "ThreeIsland_BerryForest", "SixIsland_PatternBush", "PetalburgWoods"];
  const farmingXp = () => player.flags.farmingXp | 0;
  async function berryPouch() {
    if (!FORESTS.includes(player.location && player.location.map)) {
      await message("There are no berry trees to pick from here. Try using the Berry Pouch in a forest!");
      return false;
    }
    await pickingGame();
    return true;
  }
  // The picking game itself, and what it brings home: the forest's berries by your farming level (the Berry Pouch),
  // or, at a tree of Hoenn's with berries on it (`tree`: its berry, and how many it bore), that tree's berries, as many
  // as you caught and never fewer than it bore, and a gold berry's catch from the best tier you can pick.
  async function pickingGame(tree) {
    show("scene");
    clearMenu();
    const f = player.flags, xp = farmingXp(), before = BerryPicking.level(xp);
    const game = await BerryPickingScreen.run(scene, BerryPicking.create(Math.random, before), xp, player.look || "custom");
    const r = BerryPicking.result(game);
    const berries = tree ? Array(Math.max(tree.n, r.berries + Math.floor(r.berries * Math.min(before, 100) / 100))).fill(tree.berry)
      .concat(Array.from({ length: r.gold }, () => BerryPicking.pickBerry(before, Math.random, true))) : BerryPicking.rewards(r, before);
    f.farmingXp = xp + r.xp;
    const berriesOf = (n, what) => n + " " + what + (n === 1 ? "y" : "ies");
    await BerryPickingScreen.message("Score " + r.score + ": " + berriesOf(r.ripe, "ripe berr") +
      (r.gold ? " and " + berriesOf(r.gold, "gold berr") : "") + " caught" +
      (r.bestCombo > 1 ? ", best combo ×" + r.bestCombo : "") + ".");
    const counts = {};
    for (const id of berries) counts[id] = (counts[id] || 0) + 1;
    for (const [id, n] of Object.entries(counts)) {
      Player.addItem(player, id, n);
      await BerryPickingScreen.message(player.name + " put " + (n > 1 ? n + " " + Bag.name(id).replace(/y$/, "ies") : article(Bag.name(id))) + " in the Berry Pouch!");
    }
    await BerryPickingScreen.message("Gained " + r.xp + " farming XP.");
    const after = BerryPicking.level(f.farmingXp);
    if (after > before) await BerryPickingScreen.message(farmingLevelRose(before, after));
    BerryPickingScreen.clear();
    show("world");
    await Overworld.resume();
    await persist();
  }
  function farmingLevelRose(before, after) {
    const tier = BerryPicking.TIERS.find((t) => t.from > before && t.from <= after);
    return "Your farming level rose to " + after + "!" + (tier ? " " + tier.name + " berries can be picked now." : " More berries will come home now.");
  }
  // Celadon's Berry Farm (ui/berry-farm.js): Emerald's berry trees, grown on
  // the step clock, faster the higher your farming level; planting and
  // picking earn farming XP.
  const berryEnv = {
    player: () => player, say: (pages) => say(pages), confirm: (q) => confirm(q), jingle: (song, pages) => sayWithJingle(song, pages),
    farmingLevel: () => BerryPicking.level(farmingXp()),
    addFarmingXp: async (n) => {
      const before = BerryPicking.level(farmingXp());
      player.flags.farmingXp = farmingXp() + n;
      const after = BerryPicking.level(player.flags.farmingXp);
      if (after > before) await say(farmingLevelRose(before, after));
    },
    chooseBerry: async (label) => {
      Screen.say("");
      clearMenu();
      const r = await BagScreen.open({
        pockets: () => bagPockets().filter((p) => p.name === "Berries"), fresh: true, select: player.flags.lastPlanted,
        female: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl), frame: GameOptions.get().frame,
        actions: () => [{ label: label || "Plant", value: "plant" }]
      });
      BagScreen.close();
      if (r) player.flags.lastPlanted = r.id;   // (the Bag opens on it next time)
      return r ? r.id : null;
    },
    refresh: () => Overworld.refreshPeople(), here: () => player.location && player.location.map
  };
  const berryFarm = BerryFarm.create(berryEnv);
  // Hoenn's trees, along its routes (Emerald's own: the ones its new game starts with are grown): the same engine, another place to keep them.
  // (Picked as the Berry Farm's are, straight into the Bag, for farming XP: no Berry Pouch game.)
  const hoennBerries = BerryFarm.create(berryEnv,
    { key: "hoennBerries", owns: (map) => isHoenn(map), spotRe: /^HoennBerry_Tree_(\d+)$/, initial: () => window.HOENN_SCRIPTS.berryTrees });
  // Sinnoh's (the Essentials project's: tools/build-sinnoh.js), the same again.
  const isSinnoh = (map) => ((window.WORLD_MAPS[map] || {}).region === "sinnoh");
  const sinnohBerries = BerryFarm.create(berryEnv,
    { key: "sinnohBerries", owns: isSinnoh, spotRe: /^SinnohBerry_Tree_(\d+)$/, initial: () => window.SINNOH_BERRY_TREES || {} });
  // Hoenn's decorations (ui/hoenn-decor.js): the ones you own, and those out in your Secret Base and your room.
  const hoennDecor = HoennDecor.create({
    player: () => player, say: (p) => say(p), confirm: (q) => confirm(q), sfx,
    choose: async (q, texts) => { const i = await multichoice(q, 0, 0, texts); Screen.say(""); return i; },
    canvas: () => overlayCanvas(), baseMap: () => (player.flags.secretBase || {}).map || null,
    // (Someone else's base, while you're in it: its decorations, not yours.)
    visitMap: () => { const v = hoennVisiting(); return v && player.location.map === v.room ? v.room : null; }, visitPlaced: () => (hoennVisiting() || {}).placed || [],
    refresh: () => { hoennDecorApply(player.location.map); Overworld.refreshPeople(); }, persist: () => persist(),
    money: () => player.money, addMoney: (n) => Player.addMoney(player, n)
  });
  // ---------- Your Secret Base (src/secret_base.c; the Decoration menu: ui/hoenn-decor.js) ----------
  //
  // A spot in a rock wall, a tree or a bush, found with Secret Power: once it's yours (player.flags.secretBase: { map:
  // the base room it opens on, spot: { map, x, y, id } }) it stands open and A on it takes you in; the base's PC
  // decorates it and packs it up. Other people's bases: hoennNpcBases below.
  const secretBase = () => player.flags.secretBase || null;
  const hoennOwnSpot = (sign) => { const b = secretBase(); return !!b && b.spot.id === sign.spot && b.spot.map === player.location.map; };
  const BASE_ROOM = (id) => "SecretBase_" + id.replace(/^SECRET_BASE_/, "").replace(/_\d+$/, "").split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join("");
  // The spot you're facing.
  function spotAhead() {
    const L = player.location, m = window.WORLD_MAPS[L.map], at = Overworld.position(), d = World.DIRS[Overworld.ahead().facing] || [0, 0];
    return m && (m.signs || []).find((s) => s.spot && s.x === at.x + d[0] && s.y === at.y + d[1]) || null;
  }
  // Your spot opened, when you're on its map; the other people's too.
  function hoennSpotOpen(map) {
    const signs = window.WORLD_MAPS[map].signs || [], open = (id) => { const s = signs.find((q) => q.spot === id); if (s && s.open) hoennMetatileId(map, s.x, s.y, s.open, true); };
    const b = secretBase();
    if (b && b.spot.map === map) open(b.spot.id);
    for (const n of hoennNpcBases()) if (n.map === map) open(n.id);
  }
  // In to a base (room, from its spot), or back out to the spot.
  async function baseGo(room, spot, into) {
    Screen.say("");
    await Overworld.fadeToBlack();
    if (into) {
      const w = (window.WORLD_MAPS[room].warps || [])[0] || { x: 5, y: 7 };
      setDynamicWarp({ map: spot.map, x: spot.x, y: spot.y + 1 });
      await Overworld.teleport({ map: room, x: w.x, y: w.y, facing: "up" });
    } else await Overworld.teleport({ map: spot.map, x: spot.x, y: spot.y + 1, facing: "down" });
    await Overworld.fadeFromBlack();
  }
  async function secretBaseGo(into) { const b = secretBase(); if (b) await baseGo(b.map, b.spot, into); }

  // ---------- Other people's Secret Bases (this game's own: Emerald only has them through record mixing) ----------
  // A dozen of Hoenn's spots are taken. Each base has an owner of one of Emerald's ten kinds (sSecretBaseOwnerGfxIds and
  // sSecretBaseFacilityClasses: five boys, five girls), named after one of the Frontier's trainers, with decorations set out
  // as the rules allow (ui/hoenn-decor.js furnish) and a party of the Frontier's Pokémon at the level you were when you
  // first came to Hoenn's spots, raised to your level each time you battle them (npcBaseBattle). The owner talks and battles as Emerald's record-mixed owners do
  // (SecretBase_EventScript_RecordMixTrainer: once a day, after the Hall of Fame), and the base's PC registers the base.
  // Made once from your trainer ID, and kept: player.flags.hoennNpcBases.
  const NPC_BASE_LOOKS = ["OBJ_EVENT_GFX_YOUNGSTER", "OBJ_EVENT_GFX_BUG_CATCHER", "OBJ_EVENT_GFX_RICH_BOY", "OBJ_EVENT_GFX_CAMPER", "OBJ_EVENT_GFX_MAN_3",
    "OBJ_EVENT_GFX_LASS", "OBJ_EVENT_GFX_GIRL_3", "OBJ_EVENT_GFX_WOMAN_2", "OBJ_EVENT_GFX_PICNICKER", "OBJ_EVENT_GFX_WOMAN_5"];
  const NPC_BASE_CLASSES = ["youngster", "bug_catcher", "rich_boy", "camper", "cooltrainer_m", "lass", "school_kid_f", "lady", "picnicker", "cooltrainer_f"];
  const NPC_BASE_SKIP = ["Route116"], NPC_BASES_ON = false;
  const NPC_BASE_COUNT = 12, GIRL_CLASS = /_f$|^(aroma_lady|beauty|lass|hex_maniac|parasol_lady|battle_girl|picnicker|lady)$/;
  function seededRandom(seed) {
    let a = seed | 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hoennNpcBases() {
    const f = player.flags;
    // (Off for now: no one's bases but the one you make. A save that had them loses them.)
    if (!NPC_BASES_ON) { delete f.hoennNpcBases; return []; }
    // (None on Route 116, by Rustboro: a save that has one there loses it.)
    if (f.hoennNpcBases) return (f.hoennNpcBases = f.hoennNpcBases.filter((b) => !NPC_BASE_SKIP.includes(b.map)));
    const rng = seededRandom((player.trainerId || 0) + 0x5B), F = window.HOENN_FRONTIER || {};
    const trainers = (F.trainers || []).filter(Boolean), mons = (F.mons || []).filter(Boolean), spots = [];
    for (const [map, m] of Object.entries(window.WORLD_MAPS)) if (m.region === "hoenn" && !NPC_BASE_SKIP.includes(map)) for (const s of m.signs || []) if (s.spot) spots.push({ map, x: s.x, y: s.y, id: s.spot });
    const level = Math.max(10, Math.min(100, Math.round(partyLevel()))), bases = [];
    while (bases.length < NPC_BASE_COUNT && spots.length && trainers.length && mons.length) {
      const spot = spots.splice(Math.floor(rng() * spots.length), 1)[0];
      if (secretBase() && secretBase().spot.id === spot.id) continue;
      const t = trainers[Math.floor(rng() * trainers.length)], type = Math.floor(rng() * 5) + (GIRL_CLASS.test(t.cls) ? 5 : 0), party = [];
      const n = 2 + Math.floor(rng() * 3);
      for (let tries = 0; party.length < n && tries < 60; tries++) {
        const fm = mons[Math.floor(rng() * mons.length)];
        if (!fm || !window.DEX[fm.species] || party.some((p) => p.species === fm.species)) continue;
        party.push({ species: fm.species, level, moves: fm.moves.slice(0, 4), item: (fm.item && F.heldItems[fm.item]) || "" });
      }
      const room = BASE_ROOM(spot.id);
      bases.push({ id: spot.id, map: spot.map, x: spot.x, y: spot.y, room, name: t.name, type, party, placed: hoennDecor.furnish(room, rng, 3 + Math.floor(rng() * 6)), registered: false, battledDay: null });
    }
    f.hoennNpcBases = bases;
    return bases;
  }
  const hoennNpcBaseAt = (map, spotId) => hoennNpcBases().find((b) => b.map === map && b.id === spotId) || null;
  // The base you came in to (player.flags.hoennVisit: its spot's id), until you go in to your own.
  const hoennVisiting = () => { const v = player.flags.hoennVisit; return v ? hoennNpcBases().find((b) => b.id === v) || null : null; };
  const dayKey = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  const npcBaseClass = (type) => NPC_BASE_CLASSES[type].replace(/_[mf]$/, "").split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  // The owner's battle (DoSpecialTrainerBattle, SPECIAL_BATTLE_SECRET_BASE): their party, their class's picture, Emerald's words
  // for the loss; no money, and no blacking out, as CB2_EndTrainerBattle has it. VAR_RESULT: 1 won, 2 lost, 3 drew.
  async function npcBaseBattle(api) {
    const v = hoennVisiting(), F = window.HOENN_FRONTIER || {}, T = window.HOENN_SCRIPTS.t, cls = NPC_BASE_CLASSES[v.type];
    // Their party keeps pace with yours: each is raised to your party's level when you meet it (never lowered).
    const lvl = Math.max(10, Math.min(100, Math.round(partyLevel())));
    for (const p of v.party) p.level = Math.max(p.level, lvl);
    const team = v.party.map((p) => { const r = Party.create(p.species, p.level, { moves: p.moves.filter((m) => window.MOVES[m]) }); r.item = p.item || ""; return r; });
    const pic = ((F.trainers || []).find((t) => t && t.cls === cls) || {}).pic || null;
    const outcome = await battle("trainer", { foe: { name: npcBaseClass(v.type) + " " + v.name, team, pic }, defeatText: T["SecretBase_Text_Trainer" + v.type + "Defeated"] || ["…"], noBlackout: true, noPrize: true });
    api.set(outcome === "won" ? 1 : outcome === "lost" ? 2 : 3);
    show("world");
    await Overworld.resume();
  }
  // Packing up: everything back in your inventory, the spot closed.
  function secretBaseClear() {
    const b = secretBase();
    if (!b) return;
    const D = hoennDecor.state();
    for (const p of D.base.splice(0)) D.have[p.id] = (D.have[p.id] || 0) + 1;
    const m = window.WORLD_MAPS[b.spot.map], s = (m.signs || []).find((q) => q.spot === b.spot.id);
    if (s && s.closed) hoennMetatileId(b.spot.map, s.x, s.y, s.closed, true);
    delete player.flags.secretBase;
  }
  if (window.HOENN_DEBUG) window.HoennDebug = Object.assign(window.HoennDebug || {}, { decor: hoennDecor });
  // The ones out on a map keep you out of their tiles.
  function hoennDecorApply(map) {
    const m = window.WORLD_MAPS[map];
    if (!m || m.region !== "hoenn" || !m.decorKind) return;
    const base = baseCollision[map] || (baseCollision[map] = m.collision.slice());
    m.collision = base.slice();
    for (const [x, y] of hoennDecor.overlay(map).solid) if (x >= 0 && y >= 0 && x < m.width && y < m.height) m.collision[y * m.width + x] = 1;
  }

  // ---------- Summary ----------
  //
  // FireRed's Summary screen (ui/summary-screen.js): POKéMON INFO, POKéMON
  // SKILLS and KNOWN MOVES for each of `records` (up / down go through them).

  // Where a Pokémon was met, for the Trainer Memo: the Town Map's name for
  // the place (Route 1, Viridian Forest, ..., and Johto's: Route 29, ...).
  const placeName = (map) => {
    const T = window.TOWN_MAP, sec = T && T.mapSections[map];
    return (sec && T.names[sec]) || null;
  };
  function summaryView(r) {
    if (r.egg) {
      // An Egg (FireRed's summary of one): "EGG", the Egg Watch, where it came from.
      return { egg: true, name: "Egg", species: "Egg", level: 0, gender: "", types: [], memo: Breeding.eggOrigin(r),
        eggWatch: Breeding.eggWatch(r), hp: 1, maxhp: 1, status: "", shiny: false, moves: [], stats: {},
        pic: EGG_PIC, picEmpty: 0, icon: EGG_ICON, ball: "assets/sprites/items/ball/poke.png" };
    }
    const dex = DEX[r.species], stats = Party.stats(r), E = Experience, rate = E.growthRate(r.species);
    const here = E.expForLevel(rate, r.level), next = r.level >= 100 ? here : E.expForLevel(rate, r.level + 1);
    const ot = r.ot || { name: player.name, id: player.trainerId };
    const met = r.met || null, place = met && placeName(met.map);
    const memo = r.nature + " nature." + (met && met.traded ? "\nMet in a trade." :
      met ? "\nMet in " + (place || "a faraway place") + " at {LV}" + met.level + "." : "");
    const ability = (window.ABILITIES[r.ability] || {}).name || r.ability;
    return {
      name: Party.displayName(r), species: Party.speciesName(r.species), dexNo: (DEX[Party.speciesName(r.species)] || dex).id,
      level: r.level, gender: r.gender, types: dex.types, ot: ot.name, otId: ot.id & 0xffff,
      item: r.item ? Bag.name(r.item) : "", memo, hp: r.hp, maxhp: stats.hp,
      evs: Object.assign({}, r.evs), ivs: Object.assign({}, Party.trainedIvs(r)), nature: r.nature, happiness: r.happiness,
      stats: { atk: stats.atk, def: stats.def, spa: stats.spa, spd: stats.spd, spe: stats.spe },
      exp: r.exp, toNext: Math.max(0, next - r.exp), expFrac: next > here ? (r.exp - here) / (next - here) : 0,
      ability, abilityText: (window.SUMMARY_SCREEN.abilityText || {})[ability] || "",
      moves: r.moves.map((m) => ({ name: m.name, pp: m.pp, maxpp: Party.maxPp(m) })),
      status: r.status, shiny: !!r.shiny, teraType: Party.teraType(r),
      pic: Screen.spriteUrl(r.species, Party.form(r), false, r.shiny),
      picEmpty: ((window.SPRITE_METRICS || {}).front || {})[dex.id] || 0,
      icon: Screen.iconUrl(r.species, Party.form(r)),
      ball: "assets/sprites/items/ball/" + (r.ball || "poke-ball").replace(/-ball$/, "") + ".png"
    };
  }
  // summaryView() of a record as it is in battle (`mon`: the battle's
  // Pokémon): its HP and status now, and, Mega Evolved, its Mega form.
  function battleSummaryView(r, mon) {
    const v = summaryView(r);
    if (!mon) return v;
    v.hp = mon.fainted ? 0 : mon.hp;
    v.status = mon.fainted ? "" : mon.status;
    if ((mon.mega || mon.formeChanged) && DEX[mon.species]) {
      const ability = (window.ABILITIES[mon.ability] || {}).name || mon.ability;
      Object.assign(v, {
        maxhp: mon.maxhp, types: DEX[mon.species].types.slice(),
        stats: { atk: mon.stats.atk, def: mon.stats.def, spa: mon.stats.spa, spd: mon.stats.spd, spe: mon.stats.spe },
        ability, abilityText: (window.SUMMARY_SCREEN.abilityText || {})[ability] || "",
        pic: Screen.spriteUrl(mon.species, undefined, false, r.shiny),
        picEmpty: ((window.SPRITE_METRICS || {}).front || {})[DEX[mon.species].id] || 0
      });
    }
    return v;
  }
  // Swapping two moves on KNOWN MOVES' details changes their order in battle.
  function summaryContext(records) {
    return {
      frame: GameOptions.get().frame,
      cry: (species) => cry(species),
      swapMoves: (i, a, b) => {
        const r = records[i];
        [r.moves[a], r.moves[b]] = [r.moves[b], r.moves[a]];
        persist();
        return summaryView(r);
      }
    };
  }
  async function summary(index, records) {
    records = records || player.party;
    Screen.say("");
    clearMenu();
    if (!records[index].egg) cry(records[index].species);
    return SummaryScreen.open(records.map(summaryView), index, summaryContext(records));
  }

  // ---------- Bag ----------

  // FireRed's Bag screen (ui/bag-screen.js), with this game's nine pockets.
  // USE and GIVE close it for the party screen or the text box and open it
  // again after; TOSS happens on the bag screen itself.
  let bagPocket = "Medicine";
  BagScreen.setRegistered(() => player && player.flags.registered);
  // (Berries can be sorted by their tiers, BerryPicking.TIERS, as the berry
  // tree gives them: the Bag's "Sort" on a berry, flags.berrySort "tier".)
  const BERRY_TIER_ORDER = () => BerryPicking.TIERS.flatMap((t) => t.berries);
  // (`bag`: another than yours, as the Bug-Catching Contest's.)
  function bagPockets(bag) {
    bag = bag || player.bag;
    const tiers = player.flags.berrySort === "tier" ? BERRY_TIER_ORDER() : null;
    const order = (id) => (Bag.isMachine(id) ? Bag.machines().indexOf(id)
      : tiers && /-berry$/.test(id) ? (tiers.includes(id) ? tiers.indexOf(id) : tiers.length) : 0);
    // (A pocket you've rearranged (SELECT in the Bag: bagReorder) keeps its
    // order, new items after; sorting the Berries forgets theirs.)
    const kept = (bag === player.bag && player.flags.bagOrder) || {};
    const at = (p, id) => (kept[p] ? (kept[p].indexOf(id) + 1 || kept[p].length + 1) : 0);
    return Bag.POCKETS.map((p) => ({
      name: p,
      items: Object.keys(bag).filter((id) => Bag.pocket(id) === p)
        .sort((a, b) => at(p, a) - at(p, b) || order(a) - order(b) || Bag.name(a).localeCompare(Bag.name(b)))
        .map((id) => ({
          id, name: Bag.name(id), icon: Bag.sprite(id),
          qty: Bag.isMachine(id) || Bag.isKeyItem(id) ? null : bag[id],
          desc: Bag.description(id) + (id === "exp-share" ? (expShareOn() ? "\nIt's on." : "\nIt's off.") : "")
        }))
    }));
  }
  function bagReorder(pocketName, ids) {
    player.flags.bagOrder = Object.assign({}, player.flags.bagOrder, { [pocketName]: ids });
  }
  async function bagScreen() {
    for (;;) {
      Screen.say("");
      clearMenu();
      // (Another realm's bag, the few things in it: open on a pocket with something in it.)
      if (player.flags.bagRealm) {
        const full = bagPockets().filter((p) => p.items.length);
        if (full.length && !full.some((p) => p.name === bagPocket)) bagPocket = full[0].name;
      }
      const r = await BagScreen.open({
        pockets: bagPockets, pocketName: bagPocket, reorder: bagReorder,
        female: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl),
        frame: GameOptions.get().frame,
        actions: (it) => {
          const a = [];
          if (usableFromBag(it.id)) a.push({ label: "Use", value: "use" });
          if (holdable(it.id)) a.push({ label: "Give", value: "give" });
          if (!Bag.isMachine(it.id) && !Bag.isKeyItem(it.id)) a.push({ label: "Toss", value: "toss" });
          if (REGISTERABLE.includes(it.id)) a.push({ label: player.flags.registered === it.id ? "Deselect" : "Register", value: "register" });
          if (/-berry$/.test(it.id)) a.push({ label: "Sort", value: "sort" });
          return a;
        },
        toss: (id, n) => { Player.removeItem(player, id, n); persist(); }
      });
      if (!r) { BagScreen.close(); return; }
      bagPocket = r.pocket;
      const id = r.id, what = r.action;
      BagScreen.close();
      if (what === "register") {
        const on = player.flags.registered !== id;
        player.flags.registered = on ? id : undefined;
        await message(on ? "The " + Bag.name(id) + " was registered to Select." : "The " + Bag.name(id) + " is no longer registered.");
      }
      else if (what === "sort") {
        // Berries: by their tiers (Basic, Restoring, Contest, ...), or back to A to Z.
        const byTier = player.flags.berrySort !== "tier";
        player.flags.berrySort = byTier ? "tier" : "name";
        if (player.flags.bagOrder) delete player.flags.bagOrder.Berries;
        await message("The berries are now sorted.");
      }
      else if (what === "use" && Bag.isKeyItem(id)) { if ((await useKeyItem(id)) === "escaped") return "escaped"; }
      else if (what === "use" && (id in REPEL_STEPS || id in LURE_STEPS)) await useRepel(id);
      else if (what === "use" && id === "escape-rope") { if (await useEscapeRope()) return "escaped"; }
      // (A Water Stone in front of the Ruins of Alph's wall that says WATER opens it.)
      else if (what === "use" && id === "water-stone" && alphReaction("water-stone")) return "escaped";
      else if (what === "use") {
        const t = await choosePartyFor(Bag.isMachine(id) ? "Teach which {PKMN}?" : "Use on which {PKMN}?", id);
        if (t) await useItemOn(t, id);
      } else if (what === "give") {
        const t = await choosePartyFor("Give to which {PKMN}?");
        if (t) await giveItem(t, id);
      }
      await persist();
    }
  }

  // FireRed's "How many?": the question in the text box and the quantity
  // window over the screen (D-pad up / down by one, left / right by ten).
  // Returns the number chosen, or 0.
  async function chooseQuantity(text, max, unitPrice, inBag) {
    Screen.say(text);
    clearMenu();
    return GbaMenus.quantity($("#overlay"), { max, unitPrice, inBag, frame: GameOptions.get().frame });
  }

  // ---------- Cerulean City: the Berry Powder man ----------
  //
  // CeruleanCity_House5_EventScript_BerryPowderMan: interested in Berries,
  // and with some in your Bag (FireRed asks for the Berry Pouch, which this
  // game's Bag has in its place), you get the Powder Jar. Then he trades
  // medicine for Berry Powder, at FireRed's prices. FireRed's powder comes
  // from the Berry Crush, a link game this game hasn't got: here (this
  // game's own) he crushes your Berries himself, each giving what it does in
  // the Berry Crush (gBerryCrush_BerryData's powder).
  const BERRY_POWDER = {
    cheri: 20, chesto: 20, pecha: 20, rawst: 20, aspear: 20, leppa: 30, oran: 30, persim: 30, lum: 30, sitrus: 30,
    figy: 50, wiki: 50, mago: 50, aguav: 50, iapapa: 50, razz: 70, bluk: 70, nanab: 70, wepear: 70, pinap: 70,
    pomeg: 100, kelpsy: 100, qualot: 100, hondew: 100, grepa: 100, tamato: 150, cornn: 150, magost: 150, rabuta: 150, nomel: 150,
    spelon: 250, pamtre: 250, watmel: 250, durin: 250, belue: 250, liechi: 500, ganlon: 500, salac: 500, petaya: 500, apicot: 500,
    lansat: 750, starf: 750, enigma: 200
  };
  // (Berries FireRed hasn't got: the Berry Crush's middle amount.)
  const berryPowderOf = (id) => BERRY_POWDER[id.replace(/-berry$/, "")] || 30;
  // FireRed's exchange list (LISTMENU_BERRY_POWDER) and prices.
  const POWDER_PRIZES = [["energy-powder", 50], ["energy-root", 80], ["heal-powder", 50], ["revival-herb", 300], ["protein", 1000],
    ["iron", 1000], ["carbos", 1000], ["calcium", 1000], ["zinc", 1000], ["hp-up", 1000], ["pp-up", 3000]];
  async function berryPowderMan() {
    const f = player.flags, X = (k) => T("CeruleanCity_House1_Text_" + k);
    const berries = () => Object.keys(player.bag).filter((id) => /-berry$/.test(id) && player.bag[id] > 0);
    if (!f.gotPowderJar) {
      const q = X("AnyInterestInBerries");
      await say(q.slice(0, -1));
      if (!(await confirm(fill(q[q.length - 1])))) { await say(X("TakeInterestInAllSortsOfThings")); return; }
      if (!berries().length) { await say(X("WhyMustYouLieNoBerries")); return; }
      await say(X("HaveJustTheThing"));
      Player.addItem(player, "powder-jar");
      f.gotPowderJar = true;
      await sayWithJingle("mus_obtain_key_item", "{PLAYER} received the " + Bag.name("powder-jar") + "!");
      // (FireRed's lines: the Berry Crush at the Direct Corner, ui/berry-crush.js.)
      await say(X("GoCrushBerriesAtDirectCorner").slice(0, -1));
      await say(["If you'd rather, bring your Berries\nto me and I'll crush them myself."]);
    }
    // Crushing Berries (this game's): a kind, and how many.
    for (;;) {
      const have = berries();
      if (!have.length || !(await confirm("Shall I crush some of your Berries\ninto Berry Powder?"))) break;
      const i = await ask("Which Berries shall I crush?", have.map((id) => ({ label: Bag.name(id) + "  ×" + player.bag[id] + "  (" + berryPowderOf(id) + " each)", value: id }))
        .concat([back()]));
      if (i === "back") break;
      const n = await chooseQuantity("How many shall I crush?", player.bag[i]);
      Screen.say("");
      if (!n) continue;
      Player.removeItem(player, i, n);
      const gained = n * berryPowderOf(i);
      f.berryPowder = Math.min(99999, (f.berryPowder | 0) + gained);
      sfx("se_m_bonemerang");
      await say(gained.toLocaleString("en-US") + " units of Berry Powder\nwent into the Powder Jar.");
    }
    // FireRed's exchange (CeruleanCity_House5_EventScript_AskToExchangePowder).
    await say(X("HaveYouBroughtBerryPowder"));
    for (;;) {
      const v = await ask(T("CeruleanCity_House5_Text_ExchangeWithWhat")[0] + "\n(Berry Powder: " + (f.berryPowder | 0).toLocaleString("en-US") + ")",
        POWDER_PRIZES.map(([id, cost]) => ({ label: Bag.name(id) + "  " + cost, value: id })).concat([back("Exit")]));
      if (v === "back") { await say(X("SeeMeIfYoudLikeToTradePowder")); return; }
      const cost = POWDER_PRIZES.find(([id]) => id === v)[1];
      if (!(await confirm(fill(X("YoullExchangeBerryPowderForItem")[0], [Bag.name(v)])))) continue;
      if ((f.berryPowder | 0) < cost) { await say(X("DontHaveEnoughBerryPowder")); continue; }
      f.berryPowder -= cost;
      Player.addItem(player, v);
      await sayWithJingle(itemJingle(v), "{PLAYER} received the " + Bag.name(v) + "!");
      const more = X("TradeMoreBerryPowder");
      await say(more.slice(0, -1));
      if (!(await confirm(more[more.length - 1]))) { await say(X("HopeToSeeYouAgain")); return; }
    }
  }

  // ---------- The Berry Crush (game/berry-crush.js, ui/berry-crush.js) ----------
  //
  // FireRed's Direct Corner (CableClub_EventScript_DirectCornerAttendant): once
  // you have the Powder Jar it offers the Berry Crush. FireRed plays it with 2
  // to 5 people over the Wireless Adapter; here you choose how many play and
  // the others are the computer. Each puts in a Berry (yours from the Bag,
  // used up), the lid drops, "3 2 1 START", and everyone presses A to push
  // it down; the powder made goes into your Powder Jar, and the pressing
  // speed is kept as a record for that many players (the rankings in the
  // Berry Powder man's house).
  const CRUSH_NAMES = ["Lucas", "Kim", "Chris", "Jody", "Max", "Erin", "Toby", "Mia", "Seth", "Ivy"];
  const hasBerry = () => Object.keys(player.bag).some((id) => /-berry$/.test(id) && player.bag[id] > 0);
  async function directCorner() {
    const f = player.flags;
    if (!f.pokedex || !f.gotPowderJar) { await say(T("Text_WirelessClubUndergoingAdjustments")); return; }
    await say(["Welcome to the Pokémon Wireless\nClub Direct Corner.", "You may interact directly with\nyour friends here."]);
    for (;;) {
      const v = await multichoice("Which room would you like to\nenter?", 0, 0, ["Berry Crush", "Cancel"]);
      if (v !== 0) { Screen.say(""); await say("Please come again!"); return; }
      if (!(await confirm("Would you like to use the\nBerry Crush System?"))) continue;
      if (!hasBerry()) { await say("To use the Berry Crush service,\nyou must have at least one Berry."); continue; }
      const k = await multichoice("How many will play?", 0, 0, ["2 players", "3 players", "4 players", "5 players", "Cancel"]);
      if (k < 0 || k > 3) continue;
      Screen.say("");
      await berryCrush(k + 2);
      return;
    }
  }
  async function chooseCrushBerry() {
    const r = await BagScreen.open({
      pockets: () => bagPockets().filter((p) => p.name === "Berries"), pocketName: "Berries",
      female: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl), frame: GameOptions.get().frame,
      actions: () => [{ label: "Choose", value: "choose" }]
    });
    BagScreen.close();
    return r ? r.id : null;
  }
  async function berryCrush(count) {
    const f = player.flags;
    const names = CRUSH_NAMES.slice().sort(() => Math.random() - 0.5);
    const players = [{ name: player.name, you: true }].concat(names.slice(0, count - 1).map((name) => ({ name, cpu: BerryCrush.cpu() })));
    const kinds = Object.keys(BerryCrush.BERRIES).slice(0, 25);   // (what the others bring: the commoner ones)
    await Overworld.fadeToBlack();
    show("scene");
    clearMenu();
    music("mus_game_corner");
    const bc = await BerryCrushScreen.open(scene, { players, sfx });
    try {
      await bc.fadeIn();
      for (;;) {
        await say(["Are you ready to Berry-Crush?\nPlease pick a Berry for use."]);
        Screen.say("");
        const mine = await chooseCrushBerry();
        if (!mine) break;
        Player.removeItem(player, mine, 1);
        const ids = [mine].concat(players.slice(1).map(() => kinds[Math.floor(Math.random() * kinds.length)] + "-berry"));
        Screen.say("Please wait while each member\nchooses a Berry.");
        await sleep(1000);
        Screen.say("");
        await bc.drop(ids.map((id) => ({ id, icon: Bag.sprite(id), box: (window.ITEM_SPRITE_BOXES || {})[id] })));
        await bc.countdown();
        const { game, timeUp } = await bc.play(ids);
        await bc.finish(timeUp);
        if (timeUp) await say(["Time's up.", "Good Berry Powder could not be\nmade…"]);
        else {
          const res = BerryCrush.results(game);
          // (SaveResults: the pressing speed, a record for this many players.)
          const records = f.berryCrushSpeeds || (f.berryCrushSpeeds = [0, 0, 0, 0]);
          const newRecord = res.pressingSpeed > records[count - 2];
          if (newRecord) records[count - 2] = res.pressingSpeed;
          await bc.results(res, newRecord, (id) => Bag.name(id));
          f.berryPowder = Math.min(99999, (f.berryPowder | 0) + res.powder);
          await sayWithJingle("mus_level_up", "You ended up with " + res.powder + " units of\nsilky-smooth Berry Powder.");
          await say("Your total amount of Berry Powder\nis " + f.berryPowder + ".");
        }
        Screen.say("Recording your game results in the\nsave file.\nPlease wait.");
        await persist();
        await sleep(500);
        if (!(await confirm("Want to play Berry Crush again?"))) break;
        if (!hasBerry()) { await say("You have no Berries.\nThe game will be canceled."); break; }
        bc.reset();
      }
      Screen.say("");
      await bc.fadeOut();
    } finally {
      bc.close();
    }
    show("world");
    music(avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[player.location.map] || {}).music);
    await Overworld.resume();
    await Overworld.fadeFromBlack();
  }
  // The rankings in the Berry Powder man's house (Task_ShowBerryCrushRankings):
  // the best pressing speed for 2 to 5 players, A or B to close.
  async function berryCrushRankings() {
    const speeds = player.flags.berryCrushSpeeds || [0, 0, 0, 0];
    const pal = window.GBA_MENUS.palettes.std3, s = GbaMenus.Surface(), c = overlayCanvas();
    s.frame("std", pal, 3, 4, 24, 13);
    s.fill(24, 32, 192, 104, pal[1]);
    const centre = (t, y) => s.text(t, 24 + 96 - (s.textWidth(t) >> 1), 32 + y, pal[8], pal[9]);
    centre("Berry Crush", 2);
    centre("Pressing-Speed Rankings", 18);
    speeds.forEach((q, i) => {
      s.text((i + 2) + " players", 24 + 4, 32 + 42 + 14 * i, pal[2], pal[3]);
      const t = BerryCrush.speedText(q) + " Times/sec.";
      s.text(t, 24 + 192 - s.textWidth(t), 32 + 42 + 14 * i, pal[2], pal[3]);
    });
    c.classList.remove("hidden");
    s.show(c);
    await GbaMenus.keys((k) => (k === "a" || k === "b" ? true : undefined));
    c.classList.add("hidden");
  }

  // ---------- Poké Mart ----------

  // A Poké Mart (src/shop.c), selling `stock` (its FireRed list of item ids):
  // "Hi, there! May I help you?" with Buy / Sell / See ya! in a window at the
  // top left; Buy opens FireRed's buy screen (ui/shop-screen.js), Sell the Bag.
  async function mart(stock) {
    let text = T("Text_MayIHelpYou")[0];
    for (;;) {
      Screen.say(fill(text));
      await Screen.printed();
      clearMenu();
      const { index } = await pcMenu(["Buy", "Sell", "See ya!"], { left: 2, top: 1, width: 12 });
      if (index === 0) await martBuy(stock);
      else if (index === 1) await martSell();
      else { await say("Please come again!"); return; }
      await persist();
      text = "Is there anything else I can do?";
    }
  }

  // The buy screen: the map round you shows at its left.
  function martBuy(stock) {
    Screen.say("");
    const at = Overworld.position(), d = World.DIRS ? World.DIRS[at.facing] : null;
    const [dx, dy] = d || ({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] })[at.facing] || [0, -1];
    return ShopScreen.open({
      frame: GameOptions.get().frame,
      items: Bag.martStock(stock).map((x) => ({ id: x.item, name: Bag.name(x.item), price: x.price, desc: Bag.description(x.item), icon: Bag.sprite(x.item) })),
      // (A counter of only TMs and HMs, Celadon's 2F: every name in the small
      // font, as the long ones must be, so the list looks the same all down.)
      smallNames: stock.length > 0 && stock.every((id) => /^(tm|hm)\d/.test(id)),
      money: () => player.money,
      inBag: (id) => Player.itemCount(player, id),
      // (TMs and HMs: one each, and never twice.)
      limit: (id) => (!Bag.isMachine(id) ? { max: 99 }
        : Player.itemCount(player, id) > 0 ? { max: 0, why: "You already have that " + Bag.name(id).split(" ")[0] + ".\nTMs and HMs never run out." } : { max: 1 }),
      buy: (id, n) => {
        const price = Bag.price(id) * n;
        if (Player.itemCount(player, id) + n > 999) return { error: "You have no more room for this\nitem." };
        Player.addMoney(player, -price);
        Player.addItem(player, id, n);
        persist();
        // (A Premier Ball with ten Poké Balls, as from Ruby and Sapphire on.)
        if (id === "poke-ball" && n >= 10) {
          Player.addItem(player, "premier-ball");
          return { bonus: "I'll throw in a Premier Ball,\ntoo." };
        }
        return null;
      },
      map: { canvas: $("#world"), x: 112 + 16 * dx, y: 64 + 16 * dy }
    });
  }

  // SELL: the Bag, A on an item to sell it (half its price).
  function martSell() {
    Screen.say("");
    return BagScreen.open({
      pockets: bagPockets, pocketName: bagPocket, frame: GameOptions.get().frame,
      female: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl),
      actions: () => [],
      sell: {
        price: (id) => (Bag.isMachine(id) || Bag.isKeyItem(id) ? 0 : Bag.sellPrice(id)),
        sell: (id, n) => { Player.removeItem(player, id, n); Player.addMoney(player, n * Bag.sellPrice(id)); persist(); },
        money: () => player.money
      }
    }).then((r) => { BagScreen.close(); return r; });
  }

  // ---------- PC ----------
  //
  // FireRed's PC (data/scripts/pc.inc): "Which PC should be accessed?" with
  // SOMEONE'S PC (BILL'S PC once you've met him: the Pokémon Storage System),
  // {PLAYER}'s PC (item storage), PROF. OAK's PC (once you have a Pokédex) and
  // LOG OFF, in a window at the top left with the question in the text box.
  const overlayCanvas = () => $("#overlay");
  const instant = (text) => { Screen.say(text, text.length); clearMenu(); };
  const pcMenu = (items, opts) => GbaMenus.listMenu(overlayCanvas(), Object.assign({ left: 1, top: 1, frame: GameOptions.get().frame, items }, opts));
  // A script's multichoice (FireRed's `multichoice left, top, ...`) after
  // `question` (message + waitmessage, its last two lines staying up):
  // -> the index chosen, or -1 (B).
  async function multichoice(question, left, top, items, opts) {
    if (question != null) await Screen.prompt(fill(question));
    clearMenu();
    return GbaMenus.multichoice(overlayCanvas(), Object.assign({ left, top, items, frame: GameOptions.get().frame }, opts));
  }
  // The money box and coins box (showmoneybox / showcoinsbox x, y; null takes it down).
  const moneyBox = (x, y) => GbaMenus.fieldWindow("money", x == null ? null : { x, y, amount: player.money });
  const coinsBox = (x, y) => GbaMenus.fieldWindow("coins", x == null ? null : { x, y, amount: coins() });

  async function pc() {
    const f = player.flags;
    for (;;) {
      Screen.say("Which PC should be accessed?");
      await Screen.printed();
      clearMenu();
      const items = [f.billHelped ? "Bill's PC" : "Someone's PC", player.name + "'s PC"]
        .concat(f.pokedex ? ["Prof. Oak's PC"] : [], f.gameClear ? ["Hall of Fame"] : [], ["Log off"]);
      const { index } = await pcMenu(items, { width: f.pokedex || player.name.length > 6 ? 14 : 13 });
      const v = index < 0 ? "Log off" : items[index];
      if (v === "Log off") { sfx("se_pc_off"); Screen.say(""); return; }
      sfx("se_pc_login");
      if (index === 0) {
        await say(f.billHelped ? "Accessed Bill's PC." : "Accessed Someone's PC.");
        await say("Pokémon Storage System opened.");
        await billsPc();
      } else if (index === 1) {
        await say("Accessed {PLAYER}'s PC.");
        await playersPc();
      } else if (items[index] === "Hall of Fame") {
        // (FireRed's PC: the Hall of Fame's records, the newest first.)
        Screen.say("");
        await HallOfFame.pc($("#overlay"), f.hallOfFame || [], { cry, sfx });
        $("#overlay").classList.add("hidden");
      } else {
        await say(["Accessed Prof. Oak's PC…", "Accessed the Pokédex Rating\nSystem…"]);
        if (await confirm("Would you like to have your\nPokédex rated?")) await rateDex();
        await say("Closed link to Prof. Oak's PC.");
      }
    }
  }

  // Bill's PC (src/pokemon_storage_system_menu.c): what each choice does, in the
  // text box, as the ▶ moves.
  let billsPcCursor = 0, lastBox = 0;
  const BILLS_PC = [
    ["Withdraw Pokémon", "withdraw", "You can withdraw a Pokémon if you\nhave any in a box."],
    ["Deposit Pokémon", "deposit", "You can deposit your party\nPokémon in any box."],
    ["Move Pokémon", "move", "You can move Pokémon that are\nstored in any box."],
    ["Move items", "items", "You can move items held by any\nPokémon in a box or your party."],
    ["See ya!", null, "See you later!"]
  ];
  async function billsPc() {
    for (;;) {
      const { index, cursor } = await pcMenu(BILLS_PC.map((x) => x[0]), {
        width: 17, cursor: billsPcCursor, wrap: true, onMove: (c) => instant(BILLS_PC[c][2])
      });
      billsPcCursor = cursor;
      const mode = index < 0 ? null : BILLS_PC[index][1];
      if (!mode) { Screen.say(""); return; }
      if (mode === "withdraw" && player.party.length >= Player.PARTY_SIZE) { await say("Can't take any more Pokémon."); continue; }
      if (mode === "deposit" && player.party.length <= 1) { await say("Can't deposit the last Pokémon!"); continue; }
      Screen.say("");
      lastBox = await storage(mode);
      Player.healBoxes(player);
      await persist();
    }
  }

  // The Pokémon Storage System (ui/storage-screen.js).
  function storage(mode) {
    return StorageScreen.open({
      mode, boxes: player.boxes, names: player.boxNames, wallpapers: player.boxWallpapers, party: player.party,
      box: lastBox, frame: GameOptions.get().frame,
      view: (r) => (r.egg ? { egg: true, name: "Egg", species: "Egg", level: 0, gender: "", item: "", icon: EGG_ICON, pic: EGG_PIC, picEmpty: 0 } : {
        name: Party.displayName(r), species: Party.speciesName(r.species), level: r.level, gender: r.gender,
        item: r.item ? Bag.name(r.item) : "", icon: Screen.iconUrl(r.species, Party.form(r)),
        pic: Screen.spriteUrl(r.species, Party.form(r), false, r.shiny),
        picEmpty: ((window.SPRITE_METRICS || {}).front || {})[(window.DEX[r.species] || {}).id] || 0
      }),
      heal: (r) => Party.heal(r),   // (Pokémon in the PC are fully healed)
      itemIcon: (id) => Bag.sprite(id), itemName: (id) => Bag.name(id), itemDesc: (id) => Bag.description(id),
      summary: (records, i) => SummaryScreen.open(records.map(summaryView), i, summaryContext(records)),
      pickItem: async () => {
        const r = await BagScreen.open({
          pockets: bagPockets, pocketName: bagPocket, frame: GameOptions.get().frame,
          female: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl),
          actions: (it) => (holdable(it.id) ? [{ label: "Give", value: "give" }] : [])
        });
        BagScreen.close();
        if (!r) return null;
        Player.removeItem(player, r.id);
        return r.id;
      },
      toBag: (id) => {
        if (Player.itemCount(player, id) >= 999) return false;
        Player.addItem(player, id);
        return true;
      },
      rename: (name) => enterText("Box name?", name, 8),
      changed: () => persist()
    });
  }

  // A line of text typed in the text box (Enter: done, Esc: never mind).
  function enterText(prompt, value, max) {
    Screen.say(prompt, prompt.length);
    const menu = $("#menu");
    menu.innerHTML = '<div class="intro-name"><input id="enter-text" maxlength="' + max + '" autocomplete="off" aria-label="' + escapeHtml(prompt) + '"></div>';
    const input = $("#enter-text");
    input.value = value || "";
    input.focus(); input.select();
    return new Promise((resolve) => {
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== "Escape") return;
        e.preventDefault(); e.stopPropagation();
        const v = input.value.trim();
        menu.innerHTML = "";
        Screen.say("");
        resolve(e.key === "Enter" && v ? v.slice(0, max) : null);
      });
    });
  }

  // {PLAYER}'s PC (src/player_pc.c): ITEM STORAGE / MAILBOX / TURN OFF.
  async function playersPc() {
    for (;;) {
      Screen.say("What would you like to do?");
      await Screen.printed();
      clearMenu();
      // (In Hoenn, your room's PC puts out your dolls and cushions too.)
      const room = isHoenn(player.location.map) && hoennDecor.contextOf(player.location.map) === "room";
      const { index } = await pcMenu(room ? ["Item storage", "Mailbox", "Decoration", "Turn off"] : ["Item storage", "Mailbox", "Turn off"], { width: 13 });
      if (index === 0) await itemStorage();
      else if (index === 1) await say("There's no mail here.");
      else if (room && index === 2) { Screen.say(""); await hoennDecor.menu("room", player.location.map); }
      else { Screen.say(""); return; }
    }
  }

  // ITEM STORAGE: WITHDRAW ITEM (the item list, ui/item-pc-screen.js) and
  // DEPOSIT ITEM (the Bag), each said in the text box under the ▶.
  const ITEM_STORAGE = [["Withdraw item", "Take out items from the PC."], ["Deposit item", "Store items in the PC."],
    ["Cancel", "Go back to the\nprevious menu."]];
  async function itemStorage() {
    let cursor = 0;
    for (;;) {
      const r = await pcMenu(ITEM_STORAGE.map((x) => x[0]), { width: 14, cursor, onMove: (c) => instant(ITEM_STORAGE[c][1]) });
      cursor = r.cursor;
      if (r.index === 0) {
        if (!Object.keys(player.pcItems).length) { await say("There are no items."); continue; }
        await withdrawItems();
      } else if (r.index === 1) await depositItems();
      else return;
      await persist();
    }
  }
  async function withdrawItems() {
    Screen.say("");
    for (;;) {
      sfx("se_pc_login");
      const r = await ItemPcScreen.open({
        frame: GameOptions.get().frame,
        items: () => Object.keys(player.pcItems).map((id) => ({ id, name: Bag.name(id), qty: player.pcItems[id], desc: Bag.description(id), icon: Bag.sprite(id) })),
        withdraw: (id, n) => {
          if (Player.itemCount(player, id) + n > 999) return "There is no more\nroom in the Bag.";
          Player.withdrawItem(player, id, n);
          persist();
          return null;
        }
      });
      ItemPcScreen.close();
      if (!r) return;
      // GIVE: straight from the PC to a Pokémon.
      if (!player.party.length) { await say("There is no\nPokémon."); continue; }
      const mon = await choosePartyFor("Give to which {PKMN}?");
      if (mon) {
        Player.withdrawItem(player, r.id, 1);
        await giveItem(mon, r.id);
      }
      await persist();
      if (!Object.keys(player.pcItems).length) return;
    }
  }
  function depositItems() {
    Screen.say("");
    return BagScreen.open({
      pockets: bagPockets, pocketName: "Items", frame: GameOptions.get().frame,
      female: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl),
      actions: () => [],
      deposit: (id, n) => {
        if ((player.pcItems[id] || 0) + n > 999) return "There's no room to\nstore items.";
        Player.depositItem(player, id, n);
        persist();
        return null;
      }
    }).then(() => BagScreen.close());
  }

  // ---------- Debug ----------
  //
  // For testing: add any Pokémon at any level, infinite Rare Candies, every TM and HM.

  // Species you can add: everything in the Pokédex data except battle-only forms.
  const debugSpecies = () => Object.keys(DEX).filter((s) => !/-(Mega|Primal)/.test(s)).sort();

  // The debug menu asks for a password the first time it's opened each session.
  const DEBUG_PASSWORD = "1324";
  let debugUnlocked = false;
  async function debugPassword() {
    show("scene");
    scene.innerHTML = '<div class="spotlight"><label class="name-entry">Password' +
      '<input id="debug-password" type="password" inputmode="numeric" autocomplete="off"></label></div>';
    const input = $("#debug-password");
    const typed = new Promise((resolve) => scene.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.stopPropagation(); e.preventDefault(); resolve("ok"); } }));
    const asked = ask("The debug menu needs a password.", [{ label: "OK", value: "ok", className: "action" }, back("Cancel")]);
    input.focus();
    const v = await Promise.race([typed, asked]);
    clearMenu();
    if (v !== "ok") return false;
    if (input.value !== DEBUG_PASSWORD) { await message("That's not the password."); return false; }
    return (debugUnlocked = true);
  }

  async function debugMenu() {
    if (!debugUnlocked && !(await debugPassword())) return;
    for (;;) {
      const v = await ask("Debug menu.", [
        { label: "Add a Pokémon", value: "add", className: "action" },
        { label: "Infinite Rare Candies: " + (player.flags.debugCandy ? "On" : "Off"), value: "candy", className: "action" },
        { label: "Give all TMs and HMs", value: "tms", className: "action" },
        { label: "Give Max Repels", value: "repels", className: "action" },
        { label: "Give Master Balls", value: "master", className: "action" },
        { label: "Wild battle", value: "wild", className: "action" },
        { label: "Double battle", value: "double", className: "action" },
        { label: "Tag battle", value: "tag", className: "action" },
        { label: "Go to the last Pokémon Center", value: "center", className: "action" },
        { label: "Visit Johto (New Bark Town)", value: "johto", className: "action" },
        { label: "Visit Hoenn (the moving truck)", value: "hoenn", className: "action" },
        { label: "Visit Sinnoh (Twinleaf Town)", value: "sinnoh", className: "action" },
        { label: "Visit the Realm Hub", value: "hub", className: "action" },
        { label: "Fill the Trunk (3 of every card)", value: "trunk", className: "action" },
        { label: "Clear the Trunk (no cards at all)", value: "clear-trunk", className: "action" },
        { label: "Duel Yugi", value: "duel", className: "action" },
        { label: Orre.inOrre(player.location) ? "Leave Orre" : "Visit Orre (the Air Strip)", value: "orre", className: "action" },
        back()]);
      if (v === "back") return;
      if (v === "add") await debugAddPokemon();
      else if (v === "candy") {
        player.flags.debugCandy = !player.flags.debugCandy;
        if (player.flags.debugCandy) player.bag["rare-candy"] = Math.max(Player.itemCount(player, "rare-candy"), 999);
        await message(player.flags.debugCandy ? "Rare Candies are infinite: using one no longer uses it up."
          : "Rare Candies are used up again.");
      } else if (v === "wild") {
        // A random wild Pokémon near your party's level (back to the map after).
        if (!canBattle()) { await message("Your Pokémon are too tired to battle."); continue; }
        await battle("wild");
        return "battled";
      } else if (v === "double" || v === "tag") {
        // A double battle against one of FireRed's double battle trainers,
        // or a tag battle with Leaf against two trainers (you choose three).
        if (!canBattle()) { await message("Your Pokémon are too tired to battle."); continue; }
        if (v === "double" && !canDouble()) { await message("You need two Pokémon that can fight for a double battle."); continue; }
        if ((v === "double" ? await debugDoubleBattle() : await debugTagBattle()) === "cancelled") continue;
        return "battled";
      } else if (v === "center") {
        // In front of the counter of the Center you last used (home before
        // you've used one), as blacking out takes you.
        const center = player.flags.lastCenter && centerOf(player.flags.lastCenter);
        Orre.leave(player);   // (from Orre: an older save's Wes back to yourself)
        player.location = Object.assign({}, center || Player.HOME);
        await persist();
        return "battled";   // (back to the map, at the new place)
      } else if (v === "trunk") {
        const y = yugioh();
        for (let n = 1; n < window.YUGIOH_CARDS.cards.length; n++) if (window.YUGIOH_RARITY[n] !== "-") y.trunk[n] = 3;
        await persist();
        await message("Your Trunk has three of every card now.");
      } else if (v === "clear-trunk") {
        // (every Duel Monsters card you have: the Trunk's, and so your decks' too; your packs and tokens stay)
        if (!(await confirm("Delete every Duel Monsters card you\nhave, your decks' too?"))) return;
        const y = yugioh();
        for (const n of Object.keys(y.trunk)) delete y.trunk[n];
        for (const d of y.decks) { d.main.length = 0; d.side.length = 0; }
        await persist();
        await message("Your Trunk and your decks are empty now.");
      } else if (v === "duel") {
        await dominoDuel("yugi", null);
        return "battled";
      } else if (v === "hub") {
        // The Realm Hub, by the Time Machine (its machine brings you back beside Pallet Town).
        fieldAction = visitRealmHub;
        return "battled";
      } else if (v === "orre") {
        // Orre: Prof. Oak's plane to the Air Strip, without his briefing (game/orre.js); and back.
        if (Orre.inOrre(player.location)) await leaveOrre();
        else fieldAction = visitOrre;
        return "battled";
      } else if (v === "johto") {
        // Johto isn't joined to Kanto yet (data/johto-maps.js): outside your
        // house in New Bark Town; the debug menu's Pokémon Center trip brings you back.
        Orre.leave(player);
        player.location = Object.assign({ facing: "down" }, window.JohtoCoords ? window.JohtoCoords.toMap("NewBarkTown", 23, 13) : { map: "NewBarkTown", x: 23, y: 13 });
        await persist();
        return "battled";
      } else if (v === "hoenn") {
        // Hoenn isn't joined to anywhere yet (data/emerald-maps.js, tools/build-hoenn.js):
        // in the moving truck, as Emerald begins; the debug menu's Pokémon Center trip brings you back.
        Orre.leave(player);
        player.location = { map: "InsideOfTruck", x: 2, y: 2, facing: "right" };
        await persist();
        return "battled";
      } else if (v === "sinnoh") {
        // Sinnoh's first maps (data/orre-maps.js, tools/build-sinnoh.js), not joined to anywhere yet: Twinleaf
        // Town's crossroads; the debug menu's Pokémon Center trip brings you back.
        Orre.leave(player);
        player.location = { map: "TwinleafTown", x: 17, y: 13, facing: "down" };
        await persist();
        return "battled";
      } else if (v === "repels") {
        Player.addItem(player, "max-repel", 99);
        await message("Added 99 Max Repels to your bag.");
      } else if (v === "master") {
        Player.addItem(player, "master-ball", 99);
        await message("Added 99 Master Balls to your bag.");
      } else if (v === "tms") {
        for (const id of Bag.machines()) if (!Player.itemCount(player, id)) Player.addItem(player, id);
        await message("Added all " + Bag.machines().length + " TMs and HMs to your bag.");
      }
      await persist();
    }
  }

  // FireRed's trainers on the maps built so far: [person's trainer, data].
  function mapTrainers(pick) {
    const out = [], seen = new Set();
    for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people) {
      const t = p.trainer, data = t && window.WORLD_TRAINERS[t.id];
      if (!data || seen.has(t.id) || !pick(t, data)) continue;
      seen.add(t.id);
      out.push([t, data]);
    }
    return out;
  }
  const randomOf = (arr) => arr[Math.floor(Math.random() * arr.length)];
  async function debugDoubleBattle() {
    const [t, data] = randomOf(mapTrainers((t) => t.double));
    await say(t.intro || []);
    return battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(t.id), pic: data.pic },
      defeatText: t.defeat, prizeClass: data.className, double: true, music: "mus_vs_trainer" });
  }
  // Leaf's team as it is about now: her starter (grown with your party),
  // Jigglypuff (Wigglytuff from Vermilion on) and Butterfree, at your
  // party's level.
  function leafTagTeam() {
    const f = player.flags, level = Math.max(10, Math.min(100, partyLevel()));
    const base = RIVAL_PICK[f.starter] || "Bulbasaur";
    const FINAL = { Bulbasaur: "Venusaur", Charmander: "Charizard", Squirtle: "Blastoise" };
    const starter = level >= 32 ? FINAL[base] : level >= 16 ? STAGE_TWO[base] : base;
    return [Party.create(starter, level), Party.create(f.leafVermilion || level >= 20 ? "Wigglytuff" : "Jigglypuff", level - 1),
      Party.create("Butterfree", level - 2)];
  }
  async function debugTagBattle() {
    // Two trainers whose teams are nearest your party's level.
    const lvl = partyLevel(), top = (d) => Math.max(...d.party.map((m) => m.level));
    const all = mapTrainers((t, d) => !t.double && !/^(Leader|Rival|Boss|Pokémon Trainer)/.test(d.className) && /^TRAINER_/.test(t.id))
      .sort((a, b) => Math.abs(top(a[1]) - lvl) - Math.abs(top(b[1]) - lvl)).slice(0, 12);
    const one = randomOf(all), two = randomOf(all.filter((x) => x !== one));
    const foeOf = ([t, d]) => ({ name: d.className + " " + d.name, team: trainerTeam(t.id).slice(0, 3), pic: d.pic,
      defeatText: t.defeat, prizeClass: d.className });
    const foe = foeOf(one), foe2 = foeOf(two);
    await say(["Leaf: {PLAYER}! Two Trainers want\nto battle us together!", "Let's team up! Choose three\nPokémon to bring!"]);
    return battle("trainer", { foe, foe2, defeatText: foe.defeatText, prizeClass: foe.prizeClass, music: "mus_vs_trainer",
      partner: { name: LAB_RIVAL_NAME, team: leafTagTeam(), pic: "leaf" } });
  }

  async function debugAddPokemon() {
    show("scene");
    scene.innerHTML = '<div class="spotlight debug-add">' +
      '<label class="name-entry">Pokémon<input id="debug-species" list="debug-species-list" autocomplete="off" placeholder="e.g. Charizard"></label>' +
      '<datalist id="debug-species-list">' + debugSpecies().map((s) => '<option value="' + escapeHtml(s) + '">').join("") + "</datalist>" +
      '<label class="name-entry">Level<input id="debug-level" type="number" min="1" max="100" value="50"></label>' +
      '<label class="name-entry debug-shiny"><input id="debug-shiny" type="checkbox"> Shiny</label></div>';
    const input = $("#debug-species");
    for (;;) {
      const typed = new Promise((resolve) => scene.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.stopPropagation(); e.preventDefault(); resolve("add"); } }));
      const asked = ask("Which Pokémon, and at what level?", [
        { label: "Add", value: "add", className: "action" }, back("Done")]);
      input.focus();   // ask() highlights its first button; keep typing in the box
      const v = await Promise.race([typed, asked]);
      clearMenu();
      if (v === "back") return;
      const want = input.value.trim().toLowerCase();
      const species = debugSpecies().find((s) => s.toLowerCase() === want);
      if (!species) { await message(input.value.trim() ? "There's no Pokémon called " + input.value.trim() + "." : "Type a Pokémon's name first."); continue; }
      const level = Math.max(1, Math.min(100, parseInt($("#debug-level").value, 10) || 50));
      const record = Party.create(species, level, $("#debug-shiny").checked ? { shiny: true } : {});
      const where = Player.receive(player, record);
      if (!where) { await message("Your party and PC boxes are full."); continue; }
      await message((record.shiny ? "Shiny " : "") + species + " (Lv" + level + ") was added to " + (where === "party" ? "your party." : where.replace("box", "Box") + " in the PC."));
      await persist();
      input.select();
    }
  }

  // ---------- Pokédex ----------

  let dexEntries = null;
  function dexList() {
    if (!dexEntries) {
      const byId = {};
      for (const [name, d] of Object.entries(DEX)) if (d.id < 10000 && !byId[d.id]) byId[d.id] = name;
      dexEntries = Object.keys(byId).map(Number).sort((a, b) => a - b).map((id) => ({ id, species: byId[id] }));
    }
    return dexEntries;
  }

  // FireRed's Pokédex (ui/pokedex-screen.js).
  function dexOptions(extra) {
    const seen = new Set(player.pokedex.seen), caught = new Set(player.pokedex.caught);
    return Object.assign({
      entries: dexList().map((e) => ({ id: e.id, species: e.species, seen: seen.has(e.species), caught: caught.has(e.species) })),
      areas: speciesAreas,
      areaRegions: dexAreaRegions(),
      trainer: "assets/sprites/trainers/front/" + Player.LOOKS[player.look].front + ".png",
      cry: (sp) => cry(sp),
      // (The National Pokédex from the start: Player.nationalDex.)
      national: Player.nationalDex(player)
    }, extra);
  }
  function pokedex() {
    Screen.say("");
    clearMenu();
    return PokedexScreen.open(dexOptions());
  }
  // AREA MODE's places: each map section with wild Pokémon, in the order the
  // maps come in (the order you reach them), with the species found there
  // (in the grass or cave, with a rod, and surfing) and whether you've been.
  const AREA_KINDS = [["Grass", "wild"], ["Fishing", "fishing"], ["Surfing", "water"]];
  // (Not the S.S. Anne: it only has the fishing and surfing of Vermilion's dock,
  // the same Pokémon as Vermilion City's.)
  const AREA_SKIP = ["S_S_ANNE"];
  // (Kanto's, then Johto's and Hoenn's, each with its Town Map for the menu's picture.)
  function dexAreaRegions() {
    const pic = (R) => R && { src: R.image, x: R.x0, y: R.y0, w: 8 * R.width, h: 8 * R.height };
    return [{ label: "Kanto", places: dexAreaList("kanto") }]
      .concat(JOHTO_MAP ? [{ label: "Johto", places: dexAreaList("johto"), map: pic(JOHTO_MAP) }] : [],
        HOENN_MAP ? [{ label: "Hoenn", places: dexAreaList("hoenn"), map: pic(HOENN_MAP) }] : []);
  }
  function dexAreaList(region) {
    const secs = (window.TOWN_MAP || {}).mapSections || {}, names = (window.TOWN_MAP || {}).names || {};
    const visited = player.flags.visitedSections || [], bySec = new Map();
    const walk = (o, out) => {
      if (!o || typeof o !== "object") return;
      // (a slot's LeafGreen Pokémon, as likely as its FireRed one; Johto's by the time of day, and SoulSilver's)
      for (const sp of [o.species, o.alt, o.morning, o.night, o.altMorning, o.altNight]) if (typeof sp === "string") out.add(sp);
      for (const v of Object.values(o)) walk(v, out);
    };
    for (const [name, m] of Object.entries(window.WORLD_MAPS)) {
      const sec = secs[name];
      // (The region's own: Johto's and Hoenn's maps have their sections too, for their Town Maps.)
      if (!sec || (m.region || "kanto") !== region || AREA_SKIP.includes(sec) || !AREA_KINDS.some(([, k]) => m[k])) continue;
      if (!bySec.has(sec)) bySec.set(sec, AREA_KINDS.map(() => new Set()));
      AREA_KINDS.forEach(([, k], i) => walk(m[k], bySec.get(sec)[i]));
    }
    return [...bySec].map(([sec, sets]) => ({
      name: names[sec] || sec, visited: visited.includes(sec),
      groups: AREA_KINDS.map(([title], i) => ({ title, species: [...sets[i]] })).filter((gr) => gr.species.length)
    }));
  }
  // Where a species can be found: the map sections of the maps whose wild
  // Pokémon (grass, water, fishing, rocks) include it.
  let areaIndex = null;
  function speciesAreas(species) {
    if (!areaIndex) {
      areaIndex = {};
      const secs = (window.TOWN_MAP || {}).mapSections || {};
      const walk = (o, sec) => {
        if (!o || typeof o !== "object") return;
        for (const sp of [o.species, o.alt, o.morning, o.night, o.altMorning, o.altNight]) if (sp) (areaIndex[sp] = areaIndex[sp] || new Set()).add(sec);
        for (const v of Object.values(o)) walk(v, sec);
      };
      for (const [name, m] of Object.entries(window.WORLD_MAPS)) if (secs[name] && m.wild) walk(m.wild, secs[name]);
    }
    return [...(areaIndex[species] || [])];
  }

  // ---------- Trainer card ----------

  // The Trainer Card: FireRed's in Kanto (and, for now, Johto, the Sevii Islands and Orre), Emerald's in Hoenn
  // (tools/build-trainer-cards.js: assets/trainer-card/), drawn as src/trainer_card.c lays them out. Its colour
  // goes by its stars; the front has your name, ID No., money, Pokédex, play time and that region's Badges, the
  // back your Battle Points (Kanto's, or the Battle Frontier's on Hoenn's card), your skills and the Hall of Fame.
  // A turns it over, B puts it away. (Saving and loading are on the Option screen.)
  const cardImages = {};
  function cardImage(src) {
    if (!cardImages[src]) {
      const img = new Image();
      img.loaded = new Promise((r) => { img.onload = img.onerror = () => r(img); });
      img.src = src;
      cardImages[src] = img;
    }
    return cardImages[src];
  }
  function cardStars(region) {
    const f = player.flags;
    if (region === "hoenn") {
      const sym = (c) => ["TOWER", "DOME", "PALACE", "ARENA", "FACTORY", "PIKE", "PYRAMID"].every((F) => hoenn.flag("FLAG_SYS_" + F + "_" + c));
      return [hoennCleared(), hoennDexCount("caught", true) >= 202, sym("SILVER") || sym("GOLD"), sym("GOLD")].filter(Boolean).length;
    }
    // (FireRed's: the Hall of Fame, Kanto's Pokédex complete, the Sevii Islands' story done, and the National Pokédex.)
    return [f.gameClear, Player.dexRating(player).complete, f.canLinkWithRS, Player.dexCount(player, "caught", false) >= 386].filter(Boolean).length;
  }
  async function trainerCard() {
    tick();
    const map = player.location && window.WORLD_MAPS[player.location.map];
    const region = map && map.region === "hoenn" ? "hoenn" : "kanto", K = region === "kanto";
    const stars = cardStars(region);
    const dir = "assets/trainer-card/" + region;
    const pics = { front: cardImage(dir + "-front-" + stars + ".png"), back: cardImage(dir + "-back-" + stars + ".png"),
      badges: cardImage(dir + "-badges.png"), star: cardImage(dir + "-star.png"),
      me: cardImage("assets/sprites/trainers/front/" + Player.LOOKS[player.look].front + ".png") };
    await Promise.all(Object.values(pics).map((p) => p.loaded));
    const ok = (img) => img.complete && img.naturalWidth > 0;
    const BADGES = { kanto: ["boulder", "cascade", "thunder", "rainbow", "soul", "marsh", "volcano", "earth"],
      hoenn: ["stone", "knuckle", "dynamo", "heat", "balance", "feather", "mind", "rain"] }[region];
    const DARK = [96, 96, 96], LIGHT = [208, 208, 200], RED = [224, 8, 8], PINK = [248, 184, 184];
    const time = (ms) => { const m = Math.floor((ms || 0) / 60000); return Math.min(999, Math.floor(m / 60)) + ":" + String(m % 60).padStart(2, "0"); };
    const lv = (xp, skill) => "Lv. " + skill.level(xp);
    const debut = (player.flags.hallOfFame || []).find((e) => e.number === 1);
    const bp = K ? player.flags.bp || 0 : (player.flags.hoennFrontier || {}).bp || 0;
    const rows = [
      ["BATTLE POINTS", bp + " BP"],
      // (With Four Island's sticker man's Hall of Fame sticker after it: one of four by entries.)
      ["HALL OF FAME DEBUT", debut ? time(debut.playTimeMs) + (player.flags.hofBragState ? " " + "*".repeat(player.flags.hofBragState) : "") : "---"],
      ["MINING", lv(miningXp(), Mining)],
      ["FARMING", lv(farmingXp(), BerryPicking)],
      ["FISHING", lv(fishingXp(), Fishing)]
    ];
    const canvas = overlayCanvas();
    let side = "front";
    function draw() {
      const s = GbaMenus.Surface();
      const right = (str, x, y, fg, sh) => s.text(str, x - s.textWidth(str), y, fg, sh);
      if (side === "front") {
        const x = K ? 28 : 24, y = K ? 0 : 1, r = K ? 152 : 136;
        const id = "IDNo." + String(player.trainerId).padStart(5, "0");
        s.text(id, 140 + ((80 - s.textWidth(id)) >> 1), 17, DARK, LIGHT);
        s.text(player.name, x, K ? 36 : 41, DARK, LIGHT);
        s.text("MONEY", x, 64 + y, DARK, LIGHT); right("¥" + player.money, r, 64 + y, DARK, LIGHT);
        s.text("POKéDEX", x, 80 + y, DARK, LIGHT); right(String(Player.dexCount(player, "caught", K && !Player.nationalDex(player))), r, 80 + y, DARK, LIGHT);
        s.text("TIME", x, 96 + y, DARK, LIGHT); right(time(player.playTimeMs), r, 96 + y, DARK, LIGHT);
      } else {
        if (K) s.text(player.name, 144, 17, DARK, LIGHT); else right(player.name, 224, 17, DARK, LIGHT);
        rows.forEach(([label, value], i) => {
          s.text(label, K ? 16 : 24, 41 + i * 16, DARK, LIGHT);
          right(value, 224, 41 + i * 16, RED, PINK);
        });
      }
      const g = canvas.getContext("2d");
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.scale(canvas.width / 240, canvas.height / 160);
      if (ok(pics[side])) g.drawImage(pics[side], 0, 0);
      if (side === "front") {
        if (ok(pics.me)) g.drawImage(pics.me, K ? 165 : 153, K ? 44 : 40);
        BADGES.forEach((b, i) => { if (player.badges.includes(b) && ok(pics.badges)) g.drawImage(pics.badges, i * 16, 0, 16, 16, 32 + i * 24, K ? 128 : 120, 16, 16); });
        for (let i = 0; i < stars && ok(pics.star); i++) g.drawImage(pics.star, 120 + i * 8, 56);
      }
      g.drawImage(s.canvas(), 0, 0);
      g.restore();
    }
    canvas.classList.remove("hidden");
    try {
      for (;;) {
        draw();
        const k = await GbaMenus.keys((key) => (key === "a" || key === "b" ? key : undefined));
        sfx("se_select");
        if (k === "b") return;
        side = side === "front" ? "back" : "front";
      }
    } finally { canvas.classList.add("hidden"); Screen.say(""); }
  }

  // ---------- The Start menu's screens ----------

  // The Start menu's POKéMON: FireRed's party screen. A on a Pokémon opens
  // SUMMARY (and this game's EVOLVE, when it could), its field moves, SWITCH / ITEM / CANCEL; SWITCH asks "Move to
  // where?" and swaps the two; ITEM gives or takes a held item. The field
  // moves are the HM moves it knows or could learn (game/field-moves.js);
  // one that works here closes the menus and is used ("escaped").
  async function partyMenu() {
    if (!player.party.length) { await message("You don't have any Pokémon yet."); return; }
    let cursor = 0;
    for (;;) {
      // (An Egg: SUMMARY, SWITCH and CANCEL only. EVOLVE, this game's, under SUMMARY: a Pokémon that could
      // evolve by its level, friendship or the like now, as levelling up would, that didn't: stopped, or kept back.)
      const canEvolve = (r) => !r.egg && Evolution.find(r, { trigger: "level", party: player.party, coins: coins() });
      const r = await openParty({ cursor, actions: (slot) => [{ label: "Summary", value: "summary" }]
        .concat(canEvolve(player.party[slot]) ? [{ label: "Evolve", value: "evolve" }] : [])
        .concat(FieldMoves.forMon(player.party[slot]).map((m) =>
          ({ label: m, value: "field:" + m, field: true, desc: FieldMoves.info(m).desc })))
        .concat([{ label: "Switch", value: "switch" }].concat(player.party[slot].egg ? [] : [{ label: "Item", value: "item" }]), [{ label: "Cancel", value: "cancel" }]) });
      if (!r) { PartyMenu.close(); return; }
      cursor = r.cursor;
      const mon = player.party[r.slot];
      if (r.action === "summary") { PartyMenu.close(); await summary(r.slot); continue; }
      if (r.action === "evolve") {
        const evo = canEvolve(mon);
        PartyMenu.close();
        if (evo) { await evolve(mon, evo, true); await persist(); }
        continue;
      }
      if (r.action.startsWith("field:")) {
        const move = r.action.slice(6);
        const blocked = fieldMoveBlocked(mon, move);
        const act = blocked || fieldMoveHere(move, mon);
        if (typeof act === "string") { await message(act); continue; }
        PartyMenu.close();
        fieldAction = act;
        return "escaped";
      }
      if (r.action === "switch") {
        if (r.to !== r.slot && player.party[r.to]) {
          [player.party[r.slot], player.party[r.to]] = [player.party[r.to], player.party[r.slot]];
          await persist();
        }
        continue;
      }
      if (r.action === "take") {
        if (!mon.item) { await message(Party.displayName(mon) + " isn't holding anything."); continue; }
        const old = Bag.take(mon);
        Player.addItem(player, old);
        await message("Received the " + Bag.name(old) + " from " + Party.displayName(mon) + ".");
        continue;
      }
      if (r.action === "give") {
        PartyMenu.close();
        const items = Object.keys(player.bag).filter(holdable);
        if (!items.length) { await message("You don't have anything to give."); continue; }
        const choice = await pick("Give which item?",
          '<div class="rows">' + items.map((id) => itemRow(id, "×" + player.bag[id])).join("") + "</div>", [back()]);
        if (choice && choice.pick) await giveItem(mon, choice.pick);
      }
    }
  }

  // FireRed's Start menu: a window over the map (GbaMenus.startMenu), with
  // the help bar along the bottom. The cursor stays where it was, as in
  // FireRed. Each choice opens its screen and comes back to the menu.
  let startCursor = 0;
  const START_HELP = {
    dex: "A device that records Pokémon secrets\nupon meeting or catching them.",
    party: "Check and organize Pokémon that are\ntraveling with you in your party.",
    bag: "Equipped with pockets for storing items\nyou bought, received, or found.",
    trunk: "Look through your Duel Monsters cards\nand build your deck.",
    card: "Check your money and other game data.",
    gear: "Use the Pokégear's phone, map and radio.",   // (the PokéNav's, once it is one: navName)
    save: "Save your game with a complete record\nof your progress to take a break.",
    option: "Adjust various game settings such as text\nspeed, game rules, etc.",
    exit: "Close this menu window.",
    retire: "Retire from the Safari Game and return to\nthe registration counter.",
    retirePyramid: "Give up your Battle Pyramid challenge\nand go back to the lobby."
  };
  // The Frontier Pass (Emerald's frontier_pass.c, as a menu): your Battle Points and Symbols, the Trainer Card, and
  // the battle recorded on it played back (PlayRecordedBattle): the same battle, the same choices, from the same seed.
  async function frontierPass() {
    const s = player.flags.hoennFrontier || {}, rec = player.flags.hoennBattleRecord;
    const FACS = ["TOWER", "DOME", "PALACE", "ARENA", "FACTORY", "PIKE", "PYRAMID"];
    const sym = (F) => (hoenn.flag("FLAG_SYS_" + F + "_GOLD") ? "gold" : hoenn.flag("FLAG_SYS_" + F + "_SILVER") ? "silver" : null);
    const have = FACS.filter(sym).map((F) => F.charAt(0) + F.slice(1).toLowerCase() + " (" + sym(F) + ")");
    await message("FRONTIER PASS\nBATTLE PTS: " + (s.bp || 0));
    await message(have.length ? "SYMBOLS: " + have.join(", ") : "No Symbols yet.");
    if (rec) await message("Recorded: " + rec.cfg.p2.name + " at the " + rec.facility.charAt(0) + rec.facility.slice(1).toLowerCase() + ", Lv. " + (rec.lvl ? "Open" : "50") + ".");
    const labels = ["TRAINER CARD"].concat(rec ? ["VIEW RECORDED BATTLE"] : []).concat(["CANCEL"]);
    const i = await multichoice(null, 0, 0, labels);
    Screen.say("");
    if (labels[i] === "TRAINER CARD") return trainerCard();
    if (labels[i] === "VIEW RECORDED BATTLE") await playRecord(rec);
    return null;
  }
  async function playRecord(rec) {
    music("mus_vs_trainer");
    show("field");
    const cfg = JSON.parse(JSON.stringify(rec.cfg));
    try {
      await BattleScreen.run(Object.assign(cfg, { replay: rec.choices, seed: rec.seed, exp: false, bag: {}, bagPockets: () => [], opponent: () => null,
        summary: () => null, forgetMove: () => 0 }));
    } catch (e) { console.error(e); }
    show("world");
    await Overworld.resume();
  }
  async function startMenu() {
    player.flags.openedMenu = true;   // (FireRed's FLAG_OPENED_START_MENU: the Sign Lady's scene)
    // (On Kamurocho's side-on streets, the street stays behind the menu.)
    const onStreet = window.Street && Street.isStreet(player.location.map);
    for (;;) {
      show(onStreet ? "street" : "world");
      Screen.say("");
      clearMenu();
      // POKéDEX once Prof. Oak has given you one, POKéMON once you have one.
      // In the Safari Zone: RETIRE first, and no SAVE (SetUpStartMenu_SafariZone).
      const items = [], safari = player.flags.safari;
      // (In the Bug-Catching Contest's park: RETIRE too, and no BAG or SAVE.)
      const contest = bugContest.here(player.location.map);
      // (In the Battle Pyramid: RETIRE, Emerald's own (SetUpStartMenu_BattlePyramid), before anything else.)
      const pyramid = player.location.map === PYRAMID_FLOOR;
      if (pyramid) items.push({ key: "retirePyramid", label: "Retire" });
      if (safari) items.push({ key: "retire", label: "Retire" });
      if (contest) items.push({ key: "retire", label: "Retire", help: "Finish the Bug-Catching Contest now and\nwait for the judging." });
      // (In the Yu-Gi-Oh! realm: no Pokédex, Pokémon, Bag or Trainer Card; the Trunk instead, your Duel Monsters cards.)
      const ygo = (window.WORLD_MAPS[player.location.map] || {}).realm === "yugioh";
      if (player.flags.pokedex && !ygo) items.push({ key: "dex", label: "Pokédex" });
      if (player.party.length && !ygo) items.push({ key: "party", label: "Pokémon" });
      if (!contest && !ygo) items.push({ key: "bag", label: "Bag" });
      if (ygo) items.push({ key: "trunk", label: "Trunk" });
      if (gear.has()) items.push({ key: "gear", label: hasPokenav() ? "PokéNav" : "Pokégear" });   // (HGSS's, once you have it: ui/pokegear.js)
      // (Emerald's Frontier Pass, once Scott's gate has issued it: it holds the Trainer Card, your Battle Points,
      // Symbols and the battle recorded on it; opened from your name, as the Trainer Card is.)
      const pass = isHoenn(player.location.map) && hoenn.flag("FLAG_SYS_FRONTIER_PASS");
      if (!ygo) items.push({ key: "card", label: player.name, help: pass ? "Check your FRONTIER PASS: your Trainer Card,\nBattle Points, Symbols and recorded battle." : undefined });
      if (!safari && !contest) items.push({ key: "save", label: "Save" });
      items.push({ key: "option", label: "Option" }, { key: "exit", label: "Exit" });
      for (const it of items) it.help = it.help || START_HELP[it.key];
      const stats = safari ? (safari.hgss ? [] : [String(safari.steps).padStart(3, " ") + "/" + (safari.hoenn ? 500 : Safari.STEPS)]).concat("Balls  " + String(safari.balls).padStart(2, " ")) : bugContest.menuStats();
      const r = await GbaMenus.startMenu($("#overlay"), { items, cursor: startCursor, frame: GameOptions.get().frame, stats });
      startCursor = r.cursor;
      const v = r.key;
      if (v === "exit") return;
      if (v === "retire" && contest) { await runJohto(johtoStd("std_bug_contest_retire"), null); return; }
      // (gText_BattlePyramidConfirmRetire, then BattlePyramid_Retire: the challenge lost, back to the lobby.)
      if (v === "retirePyramid") {
        if (!(await confirm("Are you sure you want to quit your\nPYRAMID quest?"))) continue;
        await runHoenn("BattlePyramid_Retire");
        return;
      }
      if (v === "retire") {
        if (safari.hgss) { if (await johtoSafari.retire()) return; continue; }   // (Johto's: std_safari_exit)
        if (safari.hoenn) { await runHoenn("SafariZone_EventScript_RetirePrompt"); return; }   // (Hoenn's: SafariZoneRetirePrompt)
        if (await confirm(fill(T("SafariZone_Text_WouldYouLikeToExit")[0]))) { await safariOver(null, false); return; }
        continue;
      }
      if (v === "party") { if ((await partyMenu()) === "escaped") return; }
      else if (v === "bag") { if ((await bagScreen()) === "escaped") return; }
      else if (v === "trunk") await trunkScreen();
      else if (v === "dex") await pokedex();
      else if (v === "gear") await gear.open();
      else if (v === "card") { if ((await (pass ? frontierPass() : trainerCard())) === "battled") return; }
      else if (v === "option") { if ((await optionActions()) === "battled") return; continue; }
      else if (v === "save") {
        if (!(await confirm("Would you like to save the game?"))) continue;
        await saveGame();
      }
      await persist();
    }
  }


  // ---------- Pallet Town story ----------
  //
  // Most signs and people in the overworld just say their FireRed text. These
  // scripts do more, so the overworld hands them to us.

  const STARTER_BALLS = {
    PalletTown_ProfessorOaksLab_EventScript_BulbasaurBall: { species: "Bulbasaur", kind: "Grass", flag: "FLAG_HIDE_BULBASAUR_BALL", x: 8, id: "LOCALID_BULBASAUR_BALL" },
    PalletTown_ProfessorOaksLab_EventScript_SquirtleBall: { species: "Squirtle", kind: "Water", flag: "FLAG_HIDE_SQUIRTLE_BALL", x: 9, id: "LOCALID_SQUIRTLE_BALL" },
    PalletTown_ProfessorOaksLab_EventScript_CharmanderBall: { species: "Charmander", kind: "Fire", flag: "FLAG_HIDE_CHARMANDER_BALL", x: 10, id: "LOCALID_CHARMANDER_BALL" }
  };
  // Leaf, in the lab, takes the starter that's weak against yours, leaving the
  // one that beats yours for Red (in Viridian Forest).
  const RIVAL_PICK = { Bulbasaur: "Squirtle", Charmander: "Bulbasaur", Squirtle: "Charmander" };
  const ballOf = (species) => Object.values(STARTER_BALLS).find((b) => b.species === species);

  // Silph Co.'s staff: one thing to say while Team Rocket holds the building
  // and another once Giovanni's gone (VAR_MAP_SCENE_SILPH_CO_11F), and the
  // Saffron Center's boy, who hopes for the Elite Four.
  const SILPH_WORKERS = {
    SilphCo_3F_EventScript_WorkerM: ["SilphCo_3F_Text_WhatAmIToDo", "SilphCo_3F_Text_YouAndYourMonsSavedUs"],
    SilphCo_4F_EventScript_WorkerM: ["SilphCo_4F_Text_CantYouSeeImHiding", "SilphCo_4F_Text_TeamRocketIsGone"],
    SilphCo_5F_EventScript_WorkerM: ["SilphCo_5F_Text_RocketsInUproarAboutIntruder", "SilphCo_5F_Text_YoureOurHeroThankYou"],
    SilphCo_6F_EventScript_WorkerM1: ["SilphCo_6F_Text_HelpMePlease", "SilphCo_6F_Text_WeGotEngaged"],
    SilphCo_6F_EventScript_WorkerM2: ["SilphCo_6F_Text_TargetedSilphForOurMonProducts", "SilphCo_6F_Text_ComeWorkForSilphWhenYoureOlder"],
    SilphCo_6F_EventScript_WorkerM3: ["SilphCo_6F_Text_RocketsTookOverBuilding", "SilphCo_6F_Text_BetterGetBackToWork"],
    SilphCo_6F_EventScript_WorkerF1: ["SilphCo_6F_Text_ThatManIsSuchACoward", "SilphCo_6F_Text_NeedsMeToLookAfterHim"],
    SilphCo_6F_EventScript_WorkerF2: ["SilphCo_6F_Text_RocketsTryingToConquerWorld", "SilphCo_6F_Text_RocketsRanAwayBecauseOfYou"],
    SilphCo_7F_EventScript_WorkerM1: ["SilphCo_7F_Text_RocketsAfterMasterBall", "SilphCo_7F_Text_CanceledMasterBallProject"],
    SilphCo_7F_EventScript_WorkerM2: ["SilphCo_7F_Text_BadIfTeamRocketTookOver", "SilphCo_7F_Text_WowYouChasedOffTeamRocket"],
    SilphCo_7F_EventScript_WorkerF: ["SilphCo_7F_Text_ReallyDangerousHere", "SilphCo_7F_Text_ThankYouSoMuch"],
    SilphCo_8F_EventScript_WorkerM: ["SilphCo_8F_Text_WonderIfSilphIsFinished", "SilphCo_8F_Text_ThanksForSavingUs"],
    SilphCo_10F_EventScript_WorkerF: ["SilphCo_10F_Text_WaaaImScared", "SilphCo_10F_Text_KeepMeCryingASecret"],
    SaffronCity_PokemonCenter_1F_EventScript_Youngster: ["SaffronCity_PokemonCenter_1F_Text_GreatIfEliteFourCameBeatRockets",
      "SaffronCity_PokemonCenter_1F_Text_TeamRocketTookOff"]
  };
  // Silph Co.'s card-key doors (the bg events on their barriers).
  const SILPH_DOORS = [];
  for (const [name, m] of Object.entries(window.WORLD_MAPS)) {
    if (/^SilphCo_\d+F$/.test(name)) for (const sg of m.signs) if (/_EventScript_Door\d*$/.test(sg.script) && !SILPH_DOORS.includes(sg.script)) SILPH_DOORS.push(sg.script);
  }
  // Fuchsia City's signs by its Pokémon statues: the Pokémon's picture (and
  // it's seen in the Pokédex) with the sign.
  const FUCHSIA_SIGN_MONS = {
    FuchsiaCity_EventScript_ChanseySign: "Chansey", FuchsiaCity_EventScript_VoltorbSign: "Voltorb",
    FuchsiaCity_EventScript_KangaskhanSign: "Kangaskhan", FuchsiaCity_EventScript_SlowpokeSign: "Slowpoke",
    FuchsiaCity_EventScript_LaprasSign: "Lapras"
  };

  // The Ruby Path's Braille (MtEmber_RubyPath_B4F/B5F): FireRed's braille
  // messages, in Braille (Unicode's Braille patterns).
  const BRAILLE = { A: 1, B: 3, C: 9, D: 25, E: 17, F: 11, G: 27, H: 19, I: 10, J: 26, K: 5, L: 7, M: 13, N: 29, O: 21, P: 15, Q: 31,
    R: 23, S: 14, T: 30, U: 37, V: 39, W: 58, X: 45, Y: 61, Z: 53, ".": 50, ",": 2, " ": 0 };
  const braille = (s) => [...s.toUpperCase()].map((c) => (c === "\n" ? c : String.fromCharCode(0x2800 + (BRAILLE[c] || 0)))).join("");
  const BRAILLE_SIGNS = {
    MtEmber_RubyPath_B4F_EventScript_BrailleABC: ["ABC"], MtEmber_RubyPath_B4F_EventScript_BrailleDEF: ["DEF"],
    MtEmber_RubyPath_B4F_EventScript_BrailleGHI: ["GHI"], MtEmber_RubyPath_B4F_EventScript_BrailleJKL: ["JKL"],
    MtEmber_RubyPath_B4F_EventScript_BrailleMNO: ["MNO"], MtEmber_RubyPath_B4F_EventScript_BraillePQRS: ["PQRS"],
    MtEmber_RubyPath_B4F_EventScript_BrailleTUV: ["TUV"], MtEmber_RubyPath_B4F_EventScript_BrailleWXYZ: ["WXYZ"],
    MtEmber_RubyPath_B4F_EventScript_BraillePeriod: ["."], MtEmber_RubyPath_B4F_EventScript_BrailleComma: [","],
    MtEmber_RubyPath_B5F_EventScript_BrailleMessage: ["EVERYTHING", "HAS MEANING", "EXISTENCE", "HAS MEANING", "BEING ALIVE",
      "HAS MEANING", "HAVE DREAMS", "USE POWER."]
  };

  // The Badges in order, as Route 23's guards (and the League gate's) check them.
  const ROUTE23_BADGES = LeagueRoad.NAMES;
  const SPECIAL = new Set([
    "PalletTown_PlayersHouse_1F_EventScript_Mom",
    "PalletTown_PlayersHouse_2F_EventScript_PC",
    "PalletTown_EventScript_OakTriggerLeft", "PalletTown_EventScript_OakTriggerRight",
    "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerLeft",
    "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerMid",
    "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerRight",
    "Route1_EventScript_MartClerk", "PalletTown_RivalsHouse_EventScript_Daisy", "PalletTown_ProfessorOaksLab_EventScript_LeaveStarterSceneTrigger",
    "PalletTown_ProfessorOaksLab_EventScript_Rival", "PalletTown_ProfessorOaksLab_EventScript_ProfOak",
    "PalletTown_EventScript_SignLady", "PalletTown_EventScript_SignLadyTrigger", "PalletTown_EventScript_TrainerTips",
    "CenterUpstairs_EventScript_MoveRelearner", "CenterUpstairs_EventScript_MoveDeleter",
    "ViridianCity_EventScript_RoadBlocked",
    "ViridianCity_EventScript_TutorialTriggerLeft", "ViridianCity_EventScript_TutorialTriggerRight",
    "ViridianCity_EventScript_TutorialOldMan", "ViridianCity_EventScript_Woman", "ViridianCity_EventScript_Youngster",
    "ViridianCity_EventScript_DreamEaterTutor",
    "enter:ViridianCity_Mart", "ViridianCity_Mart_EventScript_Clerk",
    "ViridianCity_PokemonCenter_1F_EventScript_Nurse",
    "Common_EventScript_UnionRoomAttendant", "Common_EventScript_WirelessClubAttendant", "Common_EventScript_DirectCornerAttendant",
    "Route2_House_EventScript_Reyley", "Route2_EastBuilding_EventScript_Aide",
    "Route22_EventScript_EarlyRivalTriggerTop", "Route22_EventScript_EarlyRivalTriggerMid", "Route22_EventScript_EarlyRivalTriggerBottom",
    "Route22_NorthEntrance_EventScript_BoulderBadgeGuardTrigger", "Route22_NorthEntrance_EventScript_BoulderBadgeGuard",
    "PewterCity_EventScript_GymGuideTriggerTop", "PewterCity_EventScript_GymGuideTriggerMid", "PewterCity_EventScript_GymGuideTriggerBottom",
    "PewterCity_EventScript_GymGuide", "PewterCity_EventScript_MuseumGuide", "PewterCity_EventScript_BugCatcher",
    "PewterCity_Museum_1F_EventScript_EntranceTriggerLeft", "PewterCity_Museum_1F_EventScript_EntranceTriggerMid",
    "PewterCity_Museum_1F_EventScript_EntranceTriggerRight", "PewterCity_Museum_1F_EventScript_Scientist1",
    "PewterCity_Museum_1F_EventScript_OldAmberScientist", "PewterCity_Museum_1F_EventScript_SeismicTossTutor",
    "PewterCity_Museum_1F_EventScript_AerodactylFossil", "PewterCity_Museum_1F_EventScript_KabutopsFossil",
    "PewterCity_Gym_EventScript_Brock", "PewterCity_Gym_EventScript_GymGuy", "PewterCity_Gym_EventScript_GymStatue",
    "PewterCity_Mart_EventScript_Clerk", "PewterCity_PokemonCenter_1F_EventScript_Nurse", "MysteryEventClub_EventScript_Woman",
    "Route4_EventScript_MegaPunchTutor", "Route4_EventScript_MegaKickTutor",
    "Route4_PokemonCenter_1F_EventScript_Nurse", "Route4_PokemonCenter_1F_EventScript_MagikarpSalesman",
    "MtMoon_B2F_EventScript_MiguelTrigger", "MtMoon_B2F_EventScript_Miguel",
    "MtMoon_B2F_EventScript_DomeFossil", "MtMoon_B2F_EventScript_HelixFossil",
    "CeruleanCity_EventScript_RivalTriggerLeft", "CeruleanCity_EventScript_RivalTriggerMid", "CeruleanCity_EventScript_RivalTriggerRight",
    "CeruleanCity_PokemonCenter_1F_EventScript_Nurse",
    "CeruleanCity_Gym_EventScript_Misty", "CeruleanCity_Gym_EventScript_GymGuy", "CeruleanCity_Gym_EventScript_GymStatue",
    "CeruleanCity_Mart_EventScript_Clerk", "CeruleanCity_House1_EventScript_BadgeGuy", "CeruleanCity_House3_EventScript_Dontae",
    "CeruleanCity_BikeShop_EventScript_Clerk", "CeruleanCity_House5_EventScript_BerryPowderMan",
    "CeruleanCity_House5_EventScript_BerryCrushRankings",
    "Route24_EventScript_Rocket", "Route24_EventScript_RocketTriggerLeft", "Route24_EventScript_RocketTriggerRight",
    "Route25_SeaCottage_EventScript_Bill", "Route25_SeaCottage_EventScript_Computer",
    "CeruleanCity_EventScript_Grunt", "CeruleanCity_EventScript_GruntTriggerTop", "CeruleanCity_EventScript_GruntTriggerBottom",
    "EventScript_CutTree", "EventScript_RockSmash", "EventScript_StrengthBoulder", "Route5_PokemonDayCare_EventScript_DaycareMan", "UndergroundPath_NorthEntrance_EventScript_Saige",
    "Route5_SouthEntrance_EventScript_GuardTriggerLeft", "Route5_SouthEntrance_EventScript_GuardTriggerMid",
    "Route5_SouthEntrance_EventScript_GuardTriggerRight",
    "Game_EventScript_Leaf", "Game_EventScript_TradebackGuy", "Game_EventScript_Rejuvenator", "Game_EventScript_SSAquaSailor", "Game_EventScript_PokerDealer", "Game_EventScript_BlackjackDealer",
    "Game_EventScript_PokerTable", "Game_EventScript_BlackjackTable", "Game_EventScript_MahjongPlayer",
    "Route11_EastEntrance_2F_EventScript_Aide", "Route11_EastEntrance_2F_EventScript_Turner",
    "SSAnne_2F_Corridor_EventScript_RivalTriggerLeft", "SSAnne_2F_Corridor_EventScript_RivalTriggerMid",
    "SSAnne_2F_Corridor_EventScript_RivalTriggerRight", "SSAnne_CaptainsOffice_EventScript_Captain",
    "SSAnne_2F_Room1_EventScript_Gentleman", "SSAnne_1F_Room3_EventScript_Wigglytuff", "SSAnne_B1F_Room5_EventScript_Machoke",
    "SSAnne_Kitchen_EventScript_Chef1", "SSAnne_Kitchen_EventScript_Chef2", "SSAnne_Kitchen_EventScript_Chef3",
    "SSAnne_Kitchen_EventScript_Chef4", "Route6_NorthEntrance_EventScript_GuardTriggerLeft", "Route6_NorthEntrance_EventScript_GuardTriggerMid",
    "Route6_NorthEntrance_EventScript_GuardTriggerRight",
    "VermilionCity_EventScript_CheckTicketLeft", "VermilionCity_EventScript_CheckTicketRight",
    "VermilionCity_EventScript_ExitedTicketCheck", "VermilionCity_EventScript_OaksAide",
    "VermilionCity_PokemonCenter_1F_EventScript_Nurse", "VermilionCity_Mart_EventScript_Clerk",
    "VermilionCity_Gym_EventScript_LtSurge", "VermilionCity_Gym_EventScript_GymGuy", "VermilionCity_Gym_EventScript_GymStatue",
    "VermilionCity_House1_EventScript_FishingGuru", "VermilionCity_House2_EventScript_Elyssa",
    "VermilionCity_House3_EventScript_Pidgey", "VermilionCity_PokemonFanClub_EventScript_Pikachu",
    "VermilionCity_PokemonFanClub_EventScript_Seel", "VermilionCity_PokemonFanClub_EventScript_Chairman",
    "SSAnne_1F_Room6_EventScript_Woman", "VermilionCity_PokemonCenter_1F_EventScript_VSSeekerWoman",
    "Route10_PokemonCenter_1F_EventScript_Nurse", "Route10_PokemonCenter_1F_EventScript_Aide", "RockTunnel_B1F_EventScript_RockSlideTutor",
    "LavenderTown_PokemonCenter_1F_EventScript_Nurse", "LavenderTown_Mart_EventScript_Clerk", "LavenderTown_EventScript_LittleGirl",
    "LavenderTown_House2_EventScript_NameRater", "LavenderTown_House1_EventScript_Cubone",
    "LavenderTown_VolunteerPokemonHouse_EventScript_Nidorino", "LavenderTown_VolunteerPokemonHouse_EventScript_Psyduck",
    "PokemonTower_2F_EventScript_RivalTriggerRight", "PokemonTower_2F_EventScript_RivalTriggerDown",
    "PokemonTower_5F_EventScript_PurifiedZone", "PokemonTower_6F_EventScript_MarowakGhost", "PokemonTower_7F_EventScript_MrFuji",
    "LavenderTown_VolunteerPokemonHouse_EventScript_MrFuji",
    "Route8_WestEntrance_EventScript_GuardTriggerTop", "Route8_WestEntrance_EventScript_GuardTriggerMid",
    "Route8_WestEntrance_EventScript_GuardTriggerBottom",
    "CeladonCity_Condominiums_1F_EventScript_Clefairy", "CeladonCity_Condominiums_1F_EventScript_Meowth",
    "CeladonCity_Condominiums_1F_EventScript_Nidoran", "CeladonCity_Condominiums_1F_EventScript_TeaWoman",
    "CeladonCity_Condominiums_3F_EventScript_Designer", "CeladonCity_Condominiums_RoofRoom_EventScript_Blackboard",
    "CeladonCity_Condominiums_RoofRoom_EventScript_EeveeBall", "CeladonCity_DepartmentStore_2F_EventScript_ClerkItems",
    "CeladonCity_DepartmentStore_2F_EventScript_ClerkTMs", "CeladonCity_DepartmentStore_3F_EventScript_CounterTutor",
    "CeladonCity_DepartmentStore_4F_EventScript_Clerk", "CeladonCity_DepartmentStore_5F_EventScript_ClerkVitamins",
    "CeladonCity_DepartmentStore_5F_EventScript_ClerkXItems", "CeladonCity_DepartmentStore_Elevator_EventScript_FloorSelect",
    "CeladonCity_DepartmentStore_Roof_EventScript_ThirstyGirl", "CeladonCity_DepartmentStore_Roof_EventScript_VendingMachine",
    "CeladonCity_EventScript_Poliwrath", "CeladonCity_EventScript_SoftboiledTutor", "CeladonCity_GameCorner_EventScript_BaldingMan",
    "CeladonCity_GameCorner_EventScript_CoinsClerk", "CeladonCity_GameCorner_EventScript_Fisher", "CeladonCity_GameCorner_EventScript_Gentleman",
    "CeladonCity_GameCorner_EventScript_GymGuy", "CeladonCity_GameCorner_EventScript_OldMan", "CeladonCity_GameCorner_EventScript_Poster",
    "CeladonCity_GameCorner_EventScript_Scientist", "CeladonCity_GameCorner_EventScript_Woman1", "CeladonCity_GameCorner_EventScript_Woman2",
    "CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerkItems", "CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerkMons",
    "CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerkTMs", "CeladonCity_Gym_EventScript_GymStatue",
    "CeladonCity_PokemonCenter_1F_EventScript_Nurse", "CeladonCity_Restaurant_EventScript_CoinCaseMan", "RocketHideout_B4F_EventScript_Giovanni",
    "RocketHideout_B4F_EventScript_LiftKey", "RocketHideout_B4F_EventScript_SilphScope", "RocketHideout_Elevator_EventScript_FloorSelect",
    "Route7_EastEntrance_EventScript_GuardTriggerBottom", "Route7_EastEntrance_EventScript_GuardTriggerMid",
    "Route7_EastEntrance_EventScript_GuardTriggerTop", "CeladonCity_Gym_EventScript_Erika",
    "SaffronCity_EventScript_DoorGuardGrunt", "SaffronCity_EventScript_Pidgeot", "SaffronCity_PokemonCenter_1F_EventScript_Nurse",
    "SaffronCity_PokemonCenter_1F_EventScript_Youngster", "SaffronCity_Mart_EventScript_Clerk", "SaffronCity_House_EventScript_Pidgey",
    "SaffronCity_CopycatsHouse_1F_EventScript_Chansey", "SaffronCity_CopycatsHouse_2F_EventScript_Doduo",
    "SaffronCity_CopycatsHouse_2F_EventScript_Copycat", "SaffronCity_MrPsychicsHouse_EventScript_MrPsychic",
    "SaffronCity_Gym_EventScript_Sabrina", "SaffronCity_Gym_EventScript_GymGuy", "SaffronCity_Gym_EventScript_GymStatue",
    "SaffronCity_Dojo_EventScript_HitmonleeBall", "SaffronCity_Dojo_EventScript_HitmonchanBall",
    "SaffronCity_Dojo_EventScript_TriggerMasterBattleLeft", "SaffronCity_Dojo_EventScript_TriggerMasterBattleRight",
    "SaffronCity_PokemonTrainerFanClub_EventScript_CrushGirl", "SaffronCity_PokemonTrainerFanClub_EventScript_LittleGirl",
    "SaffronCity_PokemonTrainerFanClub_EventScript_Youngster", "SaffronCity_PokemonTrainerFanClub_EventScript_Gentleman",
    "SilphCo_Elevator_EventScript_FloorSelect", "SilphCo_2F_EventScript_ThunderWaveTutor", "SilphCo_7F_EventScript_LaprasGuy",
    "SilphCo_7F_EventScript_RivalTriggerTop", "SilphCo_7F_EventScript_RivalTriggerBottom", "SilphCo_9F_EventScript_HealWoman",
    "SilphCo_11F_EventScript_President", "SilphCo_11F_EventScript_GiovanniTriggerLeft", "SilphCo_11F_EventScript_GiovanniTriggerRight"
  ].concat(Object.keys(STARTER_BALLS)).concat(Array.from({ length: 15 }, (_, i) => "VermilionCity_Gym_EventScript_TrashCan" + (i + 1)))
    .concat(Array.from({ length: 22 }, (_, i) => "CeladonCity_GameCorner_EventScript_SlotMachine" + i))
    .concat(Object.keys(SILPH_WORKERS)).concat(SILPH_DOORS)
    .concat(Object.keys(FUCHSIA_SIGN_MONS)).concat([
      "Route12_EventScript_Snorlax", "Route12_NorthEntrance_2F_EventScript_Lass",
      "Route12_FishingHouse_EventScript_FishingGuruBrother", "Route12_FishingHouse_EventScript_MagikarpRecordSign",
      "Route15_WestEntrance_2F_EventScript_Aide", "Route15_WestEntrance_2F_EventScript_LeftBinoculars",
      "FuchsiaCity_EventScript_FossilMonSign", "FuchsiaCity_EventScript_SubstituteTutor",
      "FuchsiaCity_PokemonCenter_1F_EventScript_Nurse", "FuchsiaCity_Mart_EventScript_Clerk",
      "FuchsiaCity_WardensHouse_EventScript_Warden", "FuchsiaCity_House2_EventScript_FishingGurusBrother",
      "FuchsiaCity_House3_EventScript_MoveDeleter", "FuchsiaCity_Gym_EventScript_GymGuy", "FuchsiaCity_Gym_EventScript_GymStatue",
      "FuchsiaCity_SafariZone_Entrance_EventScript_InfoAttendant", "FuchsiaCity_SafariZone_Entrance_EventScript_EntryTriggerMid",
      "FuchsiaCity_SafariZone_Entrance_EventScript_EntryTriggerRight", "FuchsiaCity_SafariZone_Entrance_EventScript_EntryTriggerLeft",
      "enter:FuchsiaCity_SafariZone_Entrance", "SafariZone_SecretHouse_EventScript_Attendant",
      "Route16_EventScript_Snorlax", "Route16_NorthEntrance_2F_EventScript_Aide", "Route16_House_EventScript_Woman",
      "Route16_House_EventScript_Fearow", "Route18_EastEntrance_2F_EventScript_Haden",
      "enter:SeafoamIslands_B3F", "enter:SeafoamIslands_B4F", "SeafoamIslands_B4F_EventScript_Articuno",
      "CinnabarIsland_EventScript_GymDoorLocked", "CinnabarIsland_PokemonCenter_1F_EventScript_Nurse", "CinnabarIsland_Mart_EventScript_Clerk",
      "CinnabarIsland_Gym_EventScript_Blaine", "CinnabarIsland_Gym_EventScript_GymGuy", "CinnabarIsland_Gym_EventScript_GymStatue",
      "CinnabarIsland_PokemonLab_ExperimentRoom_EventScript_Garett", "CinnabarIsland_PokemonLab_ExperimentRoom_EventScript_FossilScientist",
      "CinnabarIsland_PokemonLab_Lounge_EventScript_Clifton", "CinnabarIsland_PokemonLab_Lounge_EventScript_Norma",
      "CinnabarIsland_PokemonLab_ResearchRoom_EventScript_MetronomeTutor",
      "PokemonMansion_1F_EventScript_Statue", "PokemonMansion_2F_EventScript_Statue", "PokemonMansion_3F_EventScript_Statue",
      "PokemonMansion_B1F_EventScript_Statue",
      "PowerPlant_EventScript_Zapdos", "PowerPlant_EventScript_Electrode1", "PowerPlant_EventScript_Electrode2",
      "ViridianCity_EventScript_GymDoorLocked", "ViridianCity_EventScript_OldMan",
      "ViridianCity_Gym_EventScript_Giovanni", "ViridianCity_Gym_EventScript_GymGuy", "ViridianCity_Gym_EventScript_GymStatue",
      "Route22_EventScript_LateRivalTriggerTop", "Route22_EventScript_LateRivalTriggerMid", "Route22_EventScript_LateRivalTriggerBottom",
      "VictoryRoad_2F_EventScript_DoubleEdgeTutor", "enter:IndigoPlateau_PokemonCenter_1F",
      "IndigoPlateau_PokemonCenter_1F_EventScript_Nurse", "IndigoPlateau_PokemonCenter_1F_EventScript_Clerk",
      "IndigoPlateau_PokemonCenter_1F_EventScript_DoorGuard",
      "PokemonLeague_LoreleisRoom_EventScript_Lorelei", "PokemonLeague_BrunosRoom_EventScript_Bruno",
      "PokemonLeague_AgathasRoom_EventScript_Agatha", "PokemonLeague_LancesRoom_EventScript_Lance",
      // The Sevii Islands (part 1).
      "CinnabarIsland_PokemonCenter_1F_EventScript_Bill", "VermilionCity_EventScript_FerrySailor",
      "OneIsland_Harbor_EventScript_Sailor", "TwoIsland_Harbor_EventScript_Sailor", "ThreeIsland_Harbor_EventScript_Sailor",
      "OneIsland_PokemonCenter_1F_EventScript_Nurse", "TwoIsland_PokemonCenter_1F_EventScript_Nurse", "ThreeIsland_PokemonCenter_1F_EventScript_Nurse",
      "OneIsland_PokemonCenter_1F_EventScript_Celio", "OneIsland_PokemonCenter_1F_EventScript_Bill",
      "OneIsland_PokemonCenter_1F_EventScript_NetworkMachine", "OneIsland_PokemonCenter_1F_EventScript_CrushGirl", "OneIsland_EventScript_OldMan",
      "OneIsland_KindleRoad_EmberSpa_EventScript_RockSmashMan", "TwoIsland_EventScript_Clerk",
      "TwoIsland_JoyfulGameCorner_EventScript_LostellesDaddy", "TwoIsland_JoyfulGameCorner_EventScript_InfoMan",
      "TwoIsland_JoyfulGameCorner_EventScript_Lostelle", "TwoIsland_CapeBrink_House_EventScript_StarterTutor",
      "TwoIsland_House_EventScript_MoveManiac", "ThreeIsland_EventScript_Biker", "ThreeIsland_EventScript_AntiBiker1",
      "ThreeIsland_EventScript_AntiBiker2", "ThreeIsland_EventScript_Doduo", "ThreeIsland_Port_EventScript_Woman",
      "ThreeIsland_House1_EventScript_Lostelle", "ThreeIsland_House5_EventScript_LittleGirl", "ThreeIsland_Mart_EventScript_Clerk",
      "ThreeIsland_BerryForest_EventScript_Lostelle", "ThreeIsland_DunsparceTunnel_EventScript_Prospector",
      "MtEmber_Exterior_EventScript_Grunt1", "MtEmber_Exterior_EventScript_Grunt2", "MtEmber_Exterior_EventScript_ExplosionTutor",
      "MtEmber_Summit_EventScript_Moltres", "MtEmber_RubyPath_B5F_EventScript_Ruby",
      // The Sevii Islands (part 2): Four and Five Island.
      "FourIsland_Harbor_EventScript_Sailor", "FiveIsland_Harbor_EventScript_Sailor",
      "FourIsland_PokemonCenter_1F_EventScript_Nurse", "FiveIsland_PokemonCenter_1F_EventScript_Nurse", "FourIsland_Mart_EventScript_Clerk",
      "FourIsland_EventScript_DaycareMan", "FourIsland_PokemonDayCare_EventScript_DaycareWoman", "FourIsland_EventScript_OldWoman",
      "Johto_DaycareMan", "Johto_DaycareLady",
      "FourIsland_House1_EventScript_BodySlamTutor", "FourIsland_House2_EventScript_StickerMan", "FourIsland_LoreleisHouse_EventScript_Lorelei",
      "FourIsland_IcefallCave_Back_EventScript_LoreleiRocketsScene", "FourIsland_IcefallCave_1F_EventScript_FallDownHole",
      "FiveIsland_Meadow_EventScript_WarehouseDoor", "FiveIsland_RocketWarehouse_EventScript_Cage",
      "FiveIsland_RocketWarehouse_EventScript_Admin2Trigger", "FiveIsland_RocketWarehouse_EventScript_Gideon",
      "FiveIsland_MemorialPillar_EventScript_MemorialMan", "FiveIsland_MemorialPillar_EventScript_Memorial",
      "FiveIsland_WaterLabyrinth_EventScript_EggGentleman", "FiveIsland_ResortGorgeous_House_EventScript_Selphy",
      // The Sevii Islands (part 3): Six and Seven Island, Trainer Tower.
      "SixIsland_Harbor_EventScript_Sailor", "SevenIsland_Harbor_EventScript_Sailor",
      "SixIsland_PokemonCenter_1F_EventScript_Nurse", "SevenIsland_PokemonCenter_1F_EventScript_Nurse",
      "SixIsland_Mart_EventScript_Clerk", "SevenIsland_Mart_EventScript_Clerk", "TrainerTower_Lobby_EventScript_MartClerk",
      "SixIsland_RuinValley_EventScript_Scientist", "SixIsland_RuinValley_EventScript_DottedHoleDoor",
      "SixIsland_DottedHole_SapphireRoom_EventScript_Sapphire", "SixIsland_DottedHole_SapphireRoom_EventScript_BrailleMessage",
      "SixIsland_DottedHole_B1F_EventScript_BrailleUp", "SixIsland_DottedHole_B2F_EventScript_BrailleLeft",
      "SixIsland_DottedHole_B3F_EventScript_BrailleRight", "SixIsland_DottedHole_B4F_EventScript_BrailleDown",
      "SixIsland_WaterPath_House1_EventScript_Beauty", "SixIsland_WaterPath_House1_EventScript_SizeRecord",
      "SevenIsland_EventScript_SwordsDanceTutor", "SevenIsland_SevaultCanyon_House_EventScript_ChanseyDanceMan",
      "SevenIsland_SevaultCanyon_House_EventScript_Chansey", "SevenIsland_House_Room1_EventScript_OldWoman",
      "TrainerTower_Lobby_EventScript_Nurse", "TrainerTower_Lobby_EventScript_Receptionist", "TrainerTower_Lobby_EventScript_EntryTrigger",
      "TrainerTower_Lobby_EventScript_ShowRecords", "TrainerTower_Elevator_EventScript_FloorSelect", "TrainerTower_EventScript_Owner",
      "TrainerTower_EventScript_DoublesTrainer1", "TrainerTower_EventScript_SinglesTrainer", "TrainerTower_EventScript_KnockoutTrainer",
      "TrainerTower_EventScript_DoublesTrainer2", "TrainerTower_EventScript_SingleBattleTrigger",
      "TrainerTower_EventScript_DoubleBattleTriggerTop", "TrainerTower_EventScript_DoubleBattleTriggerBottom",
      // Cerulean Cave.
      "CeruleanCave_B1F_EventScript_Mewtwo",
      // Faraway Island (Emerald's; data/emerald-maps.js).
      "FarawayIsland_Entrance_EventScript_Sailor", "FarawayIsland_Interior_EventScript_Mew",
      // Orre (data/orre-maps.js).
      "OutskirtStand_Diner_EventScript_Bartender", "OutskirtStand_Diner_EventScript_Willie",
      "OutskirtStand_Diner_EventScript_TV", "OutskirtStand_Diner_EventScript_Jukebox",
      "OrreAirStrip_EventScript_Pilot", "OrreAirStrip_PokemonCenter_1F_EventScript_Nurse",
      "SnagemHideout_EventScript_Guard1", "SnagemHideout_EventScript_Guard2", "PhenacCity_EventScript_Kodo",
      "PhenacCity_PokemonCenter_1F_EventScript_Nurse"
    ]).concat(Object.keys(BRAILLE_SIGNS)).concat(League.ROOMS.map((r) => "enter:" + r.map), ["enter:" + League.HALL_OF_FAME]).concat(ROUTE23_BADGES.slice(1).flatMap((b) => ["", "Trigger"].map((t) => "Route23_EventScript_" + b + "BadgeGuard" + t))).concat([1, 2, 3, 4, 5, 6].flatMap((n) => ["Left", "Right"].map((s) => "CinnabarIsland_Gym_EventScript_Quiz" + n + s))).concat(CYCLING_ROAD_GATES.flatMap((g) => ["Top", "MidTop", "Mid", "MidBottom", "Bottom"].map((k) => g + "_EventScript_NeedBikeTrigger" + k))));

  for (const d of RaidDens.DENS) SPECIAL.add(d.script);

  // Which people are around, from FireRed's event flags and this game's story flags.
  // Item balls on the map: picked up once, then gone.
  const ITEM_BALLS = new Set();
  for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people) if (p.item) ITEM_BALLS.add(p.script);
  // Trainers: battle until beaten (a flag named for the trainer, as in FireRed).
  // (Hoenn's nurses and clerks: tools/build-hoenn.js.)
  for (const m of Object.values(window.WORLD_MAPS)) if (m.region === "hoenn") for (const p of m.people) if (/_PokemonCenter_1F_EventScript_Nurse$|_Mart_EventScript_Clerk$/.test(p.script || "")) SPECIAL.add(p.script);
  // (Sinnoh's: tools/build-sinnoh.js; and Sandgem's beach's sailor, sinnohSailor.)
  for (const m of Object.values(window.WORLD_MAPS)) if (m.region === "sinnoh") for (const p of m.people) if (/_PokemonCenter_1F_EventScript_Nurse$|_Mart_EventScript_Clerk$/.test(p.script || "")) SPECIAL.add(p.script);
  SPECIAL.add("SandgemTown_EventScript_Sailor");
  // (Domino High's duelists: Yugi, Téa, Joey and Tristan, dominoDuel.)
  const DOMINO_DUELISTS = { DominoHigh_Person12: "yugi", DominoHigh_Person13: "tea", DominoHigh_Person14: "joey", DominoHigh_Person15: "tristan" };
  // (The Time Machine off Pallet Town, and the Realm Hub's portals: timeMachine, realmPortal.)
  for (const sc of ["TimeMachine_EventScript_Machine", "TimeMachine_EventScript_Sign", "TimeMachine_EventScript_Scientist",
    "RealmHub_EventScript_Portal_pokemon", "RealmHub_EventScript_Portal_yugioh", "RealmHub_EventScript_Portal_yakuza", "Kamurocho_TimeMachine", "Kamurocho_Kiryu", "Kamurocho_Majima", "Kamurocho_Clerk", "SacredCards_Fountain", "SacredCards_BackToTown",
    "Domino_WorldMap", "KameGame_Grandpa", "Domino_Manhole", "Domino_ManholeUp", "Domino_TimeMachine", ...Object.keys(DOMINO_DUELISTS)]) SPECIAL.add(sc);
  // (and the other pupils and the teacher, with their boosters' decks: classmate)
  for (let i = 0; i < 12; i++) SPECIAL.add("DominoHigh_Person" + i);
  // (And its ferries, Canalave's to Iron Island and back, and Oreburgh's fossil scientist: sinnohFerry, fossilScientist.)
  for (const m of Object.values(window.WORLD_MAPS)) if (m.region === "sinnoh") for (const p of m.people) if (p.ferry || /_EventScript_FossilScientist$/.test(p.script || "")) SPECIAL.add(p.script);
  SPECIAL.add("SlateportCity_Harbor_EventScript_Sailor"); SPECIAL.add("Route117_PokemonDayCare_EventScript_DaycareWoman");
  SPECIAL.add("LilycoveCity_MoveDeletersHouse_EventScript_MoveDeleter"); SPECIAL.add("FallarborTown_MoveRelearnersHouse_EventScript_MoveRelearner");
  const TRAINER_SCRIPTS = new Set();
  for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people) if (p.trainer && p.trainer.id) TRAINER_SCRIPTS.add(p.script);
  // (or, signalled by the VS Seeker, want a rematch)
  // (or, once you're Champion, the Fighting Dojo wants its rematch: dojoRematch())
  const trainerWaiting = (person) => !!(person.trainer && person.trainer.id &&
    (!player.flags[person.trainer.id] || (player.flags.vsRematch && player.flags.vsRematch[person.trainer.id]) ||
      dojoRematch(person.trainer.id)));

  function visible(person, map) {
    if (isHoenn(map || player.location.map)) { const dv = deltaVisible(person); if (dv !== undefined) return dv; const b = hoennBerries.visible(person, map || player.location.map); return b !== undefined ? b : hoennVisible(person, map || player.location.map); }
    const f = player.flags;
    // (Kamurocho's Kiryu and Majima: gone from the streets once they've joined your party.)
    { const lad = /^Kamurocho_(Kiryu|Majima)$/.exec(person.script || ""); if (lad) return !inRealmParty("yakuza", lad[1].toLowerCase()); }
    // (A Tera Raid den: glowing while its raid is on.)
    { const den = RaidDens.byScript(person.script); if (den) return RaidDens.active(f, den.id) ? { sprite: "raid_den_active" } : true; }
    // (Johto's people: hidden while HGSS's flag for them is set, and where
    // the map's own script puts them this visit.)
    if ((person.hgssFlag && johto.flag(person.hgssFlag)) || person.offstage) return false;
    // (The National Park's Bug-Catching Contest people, HGSS's out of sight at its edge, here outside the fence where
    // they'd stand in the way: there only once the judging lines them up.)
    if ((map || player.location.map) === "NationalPark" && /^hgss:BUG_CONTEST:/.test(person.script || "") && !johto.placed(person.localId)) return false;
    { const g = gear.visible(person); if (g !== undefined) return g; }   // (a Gym Leader at the Dojo: ui/pokegear.js)
    { const b = berryFarm.visible(person, map || player.location.map); if (b !== undefined) return b; }   // (a berry tree: ui/berry-farm.js)
    { const b = sinnohBerries.visible(person, map || player.location.map); if (b !== undefined) return b; }   // (Sinnoh's)
    {
      // (Lyra, or Ethan for a girl: HGSS's friend.)
      const look = person.girlLook && isGirl() ? person.girlLook : null;
      const at = person.localId && !person.trainer && johto.placed(person.localId);
      if (at || look) return Object.assign({}, look, at ? { x: at.x, y: at.y, movement: "face_" + at.facing } : {});
    }
    // (The League gate's guard on the way to Johto: there until you're Champion. data/johto-maps.js)
    if (person.script === "Route22_NorthEntrance_EventScript_JohtoGuard") return !f.gameClear;
    // (The Champion here is Red.)
    // (Johto's League, once you've its eight Badges: HGSS's Elite Four and Lance in their places.)
    if (johtoLeague() && ELITE_FOUR_SCRIPTS.includes(person.script)) return Object.assign({}, window.JOHTO_LEAGUE[ELITE_FOUR_SCRIPTS.indexOf(person.script)].look);
    if (person.localId === "LOCALID_CHAMPIONS_ROOM_RIVAL") return Object.assign({}, johtoLeague() ? window.JOHTO_LEAGUE[4].look : lookOf("red"));
    if (person.item) return !f[person.flag];
    { const o = Orre.visible(person, f); if (o !== undefined) return o; }   // (Orre's people)
    if (person.flag && tempFlags.has((map || player.location.map) + ":" + person.flag)) return false;   // (a tree you've cut)
    const spot = person.trainer && f.trainerSpots && f.trainerSpots[person.trainer.id];
    if (spot) return { x: spot.x, y: spot.y, movement: "face_" + spot.facing };
    // Waiting for a rematch from the VS Seeker: standing still, facing one way.
    const rematchFacing = person.trainer && f.vsRematch && f.vsRematch[person.trainer.id];
    if (rematchFacing) return { movement: "face_" + (rematchFacing === true ? "down" : rematchFacing) };
    // Miguel stays by the fossil he took (FireRed's copyobjectxytoperm).
    if (person.script === "MtMoon_B2F_EventScript_Miguel" && f.mtMoonFossil) return { x: f.mtMoonFossil === "dome-fossil" ? 14 : 13, y: 8, movement: "face_up" };
    // Daisy sits at the table, before and after giving you the Town Map.
    if (person.script === "PalletTown_RivalsHouse_EventScript_Daisy") return { x: 5, y: 4, movement: "face_right" };
    if (person.flag === "FLAG_HIDE_TOWN_MAP") return !f.townMap;
    // Lying across the road north until Oak gets his parcel, then up and about.
    if (person.script === "ViridianCity_EventScript_TutorialOldMan") {
      return f.parcelDelivered ? { x: 21, y: 8, movement: "look_around" }
        : Object.assign({}, person.alt, { x: 21, y: 11, movement: "face_down" });
    }
    if (person.script === "PalletTown_EventScript_SignLady") return signLadyPlace();
    // Fuchsia's fossil Pokémon statue: a Kabuto, or an Omanyte once you've
    // taken the Dome Fossil (FuchsiaCity_OnTransition).
    if (person.alt && person.sprite === "kabuto") return f.mtMoonFossil === "dome-fossil" ? Object.assign({}, person.alt) : true;
    // (Silph 7F's pacing worker stands still once Team Rocket's gone.)
    if (person.script === "SilphCo_7F_EventScript_WorkerM2" && silphFreed()) return { movement: "face_up" };
    // Until Bill gives you the S.S. Ticket, the policeman stands in the
    // robbed house's doorway and Slowbro and the Lass are in the way south
    // (FireRed's CeruleanCity_EventScript_BlockExits).
    if (!f.gotSSTicket) {
      if (person.script === "CeruleanCity_EventScript_Policeman") return { x: 30, y: 12 };
      if (person.script === "CeruleanCity_EventScript_Slowbro") return { x: 26, y: 31 };
      if (person.script === "CeruleanCity_EventScript_Lass") return { x: 27, y: 31 };
    }
    // The Seafoam Islands' boulders: where they are now (game/seafoam.js).
    if (Seafoam.isBoulderFlag(person.flag)) return !Seafoam.hidden(f, person.flag);
    // Lostelle's dad stands by the counter once he's thanked you (TwoIsland_JoyfulGameCorner_OnTransition);
    // the Dunsparce Tunnel's prospector digs at the wall until it's dug out
    // (ThreeIsland_DunsparceTunnel_OnTransition: FireRed's with the National
    // Pokédex; here, once you're Champion, it's dug out).
    // (Only from the next visit on: right after the Moon Stone he stays where he is.)
    if (person.script === "TwoIsland_JoyfulGameCorner_EventScript_LostellesDaddy" && (f.gameCornerScene || 0) >= 4) return { x: 6, y: 2, movement: "face_down" };
    if (person.script === "ThreeIsland_DunsparceTunnel_EventScript_Prospector" && !player.flags.gameClear) return { x: 6, y: 3, movement: "face_right" };
    // Trainer Tower's floors: the challenge's trainers, where and as whom (towerPerson).
    { const tv = towerPerson(person, map || player.location.map); if (tv !== undefined) return tv; }
    // The Tanoby Key's boulders on their switches, once it's solved.
    const solved = Sevii.TANOBY_BOULDERS_SOLVED[person.localId];
    if (solved && f.unlockedTanobyRuins) return { x: solved[0], y: solved[1] };
    // Indigo Plateau's door guard stands in the doorway while Lorelei's away
    // (IndigoPlateau_PokemonCenter_1F_EventScript_CheckBlockDoor: setobjectxyperm 4, 2).
    if (person.localId === "LOCALID_LEAGUE_DOOR_GUARD" && Sevii.leagueClosed(f)) return { x: 4, y: 2 };
    // (Seven Island's house: FireRed's e-Reader trainer, who never visits here.)
    if ((map || player.location.map) === "SevenIsland_House_Room2") return false;
    switch (person.flag) {
      case "FLAG_HIDE_OAK_IN_PALLET_TOWN": return false;   // only appears for his walk to the lab
      case "FLAG_HIDE_OAK_IN_HIS_LAB": return !!(f.oakInLab || f.starter);
      case "FLAG_HIDE_POKEDEX": return !f.pokedex;         // on the desk until Oak hands them out
      case "FLAG_HIDE_MG_DELIVERYMEN": return false;       // no Mystery Gift
      case "FLAG_HIDE_ROUTE_22_RIVAL": return false;       // only for his scene
      case "FLAG_HIDE_PEWTER_CITY_GYM_GUIDE": return !f.TRAINER_LEADER_BROCK;
      // (No Running Shoes delivery: you can run from the start.)
      case "FLAG_HIDE_PEWTER_CITY_RUNNING_SHOES_GUY": return false;
      case "FLAG_HIDE_OLD_AMBER": return !f.gotOldAmber;
      case "FLAG_HIDE_CERULEAN_RIVAL": return false;        // only for his scene
      case "FLAG_HIDE_CERULEAN_ROCKET": return !f.gotTM28;
      case "FLAG_HIDE_SS_ANNE_RIVAL": return false;          // only for his scene (Red, here)
      case "FLAG_HIDE_SS_ANNE": return !f.ssAnneDeparted;
      // Prof. Oak's aide comes to Vermilion after Lt. Surge, to send you to his
      // colleague on Route 2 (unless you've had HM05 Flash from him already).
      // (FireRed has him gone once you've talked to him; here he stays.)
      case "FLAG_HIDE_VERMILION_CITY_OAKS_AIDE": return !!f.TRAINER_LEADER_LT_SURGE;
      case "FLAG_HIDE_NUGGET_BRIDGE_ROCKET": return !f.gotSSTicket;
      // Bill: a Clefairy until you run his Cell Separator, then himself.
      case "FLAG_HIDE_BILL_CLEFAIRY": return !f.billHelped && !billInTeleporter;
      // (Where his walk out of the Teleporter ended, until you leave.)
      case "FLAG_HIDE_BILL_HUMAN_SEA_COTTAGE": return f.billHelped ? (billJustOut ? { x: 7, y: 6 } : true) : false;
      case "FLAG_HIDE_POSTGAME_GOSSIPERS": return false;
      case "FLAG_HIDE_POKEHOUSE_FUJI": return !!f.rescuedMrFuji;   // (in Pokémon Tower until you rescue him)
      case "FLAG_HIDE_TOWER_FUJI": return !f.rescuedMrFuji;
      case "FLAG_HIDE_TOWER_RIVAL": return !f.towerRival;
      // The Rockets on 7F leave once beaten.
      case "FLAG_HIDE_TOWER_ROCKET_1": case "FLAG_HIDE_TOWER_ROCKET_2": case "FLAG_HIDE_TOWER_ROCKET_3":
        return !(person.trainer && f[person.trainer.id]) && !f.rescuedMrFuji;
      case "FLAG_HIDE_DOME_FOSSIL": case "FLAG_HIDE_HELIX_FOSSIL": return !f.mtMoonFossil;
      // Celadon: the Rockets (and the Silph scientist) until Giovanni's beaten
      // in the Hideout, where he leaves the Silph Scope behind; the Lift Key's
      // dropped by the Rocket on B4F; Eevee in its Poké Ball on the roof.
      case "FLAG_HIDE_CELADON_ROCKETS": return !f.TRAINER_BOSS_GIOVANNI;
      case "FLAG_HIDE_GAME_CORNER_ROCKET": return !f.TRAINER_TEAM_ROCKET_GRUNT_7;
      case "FLAG_HIDE_HIDEOUT_GIOVANNI": return !f.TRAINER_BOSS_GIOVANNI;
      case "FLAG_HIDE_SILPH_SCOPE": return !!f.TRAINER_BOSS_GIOVANNI && !f.gotSilphScope;
      case "FLAG_HIDE_LIFT_KEY": return !!f.TRAINER_TEAM_ROCKET_GRUNT_18 && !f.gotLiftKey;
      case "FLAG_HIDE_EEVEE_BALL": return !f.gotEevee;
      // Saffron: Team Rocket in the streets (and in Silph Co.) until Giovanni's
      // beaten on Silph's 11F; then the townsfolk come back out. The guard at
      // Silph's door stands in it until Mr. Fuji's rescued, then dozes off
      // beside it (SaffronCity_OnTransition).
      case "FLAG_HIDE_SAFFRON_ROCKETS":
        if (silphFreed()) return false;
        return person.script === "SaffronCity_EventScript_DoorGuardGrunt" && !f.rescuedMrFuji ? { x: 33, y: 31 } : true;
      case "FLAG_HIDE_SAFFRON_CIVILIANS": return silphFreed();
      case "FLAG_HIDE_SILPH_ROCKETS": return !silphFreed();
      case "FLAG_HIDE_SILPH_RIVAL": return !f.silphRival;
      // (The Fan Club's other members turn up once you're Champion.)
      case "FLAG_HIDE_SAFFRON_FAN_CLUB_BLACK_BELT": case "FLAG_HIDE_SAFFRON_FAN_CLUB_ROCKER":
      case "FLAG_HIDE_SAFFRON_FAN_CLUB_WOMAN": case "FLAG_HIDE_SAFFRON_FAN_CLUB_BEAUTY": return false;
      // The Dojo's prized Pokémon: the one you take goes; the other stays.
      case "FLAG_HIDE_DOJO_HITMONLEE_BALL": return f.dojoHitmon !== "Hitmonlee" && f.dojoHitmon2 !== "Hitmonlee";
      case "FLAG_HIDE_DOJO_HITMONCHAN_BALL": return f.dojoHitmon !== "Hitmonchan" && f.dojoHitmon2 !== "Hitmonchan";
      // The Snorlax asleep across Route 12, until you wake it with the Poké Flute.
      case "FLAG_HIDE_ROUTE_12_SNORLAX": return !f.wokeRoute12Snorlax;
      // And the one on Route 16.
      case "FLAG_HIDE_ROUTE_16_SNORLAX": return !f.wokeRoute16Snorlax;
      // Articuno, deep in the Seafoam Islands, until you've fought it
      // (SeafoamIslands_B4F_OnTransition); if you ran, it flew away until you come back.
      case "FLAG_HIDE_ARTICUNO": return !f.foughtArticuno;
      // In the Power Plant: Zapdos, and the two Electrode that look like item
      // balls, until you've fought them (PowerPlant_OnTransition).
      case "FLAG_HIDE_ZAPDOS": return !f.foughtZapdos;
      case "FLAG_HIDE_POWER_PLANT_ELECTRODE_1": return !f.foughtPowerPlantElectrode1;
      case "FLAG_HIDE_POWER_PLANT_ELECTRODE_2": return !f.foughtPowerPlantElectrode2;
      // Giovanni in Viridian Gym, until he's gone after telling you Team
      // Rocket's finished; then the Rockets left around Kanto are gone too
      // (FLAG_HIDE_MISC_KANTO_ROCKETS, set on beating him).
      case "FLAG_HIDE_VIRIDIAN_GIOVANNI": return !f.giovanniLeft;
      case "FLAG_HIDE_MISC_KANTO_ROCKETS": return !f.TRAINER_LEADER_GIOVANNI;
      // Victory Road: the boulder on 3F until it drops through the hole, and
      // then the one it becomes on 2F (Route23_OnTransition puts them back).
      case "FLAG_HIDE_VICTORY_ROAD_3F_BOULDER": return !LeagueRoad.dropped(f);
      case "FLAG_HIDE_VICTORY_ROAD_2F_BOULDER": return LeagueRoad.dropped(f);
      // (Only for the credits, once you're Champion.)
      case "FLAG_HIDE_CREDITS_RIVAL": case "FLAG_HIDE_CREDITS_OAK": return false;
      // Prof. Oak, until he comes into the Champion's room after the battle.
      case "FLAG_HIDE_OAK_IN_CHAMP_ROOM": return false;
      // Bill waits on Cinnabar after the Volcano Badge to take you to the Sevii
      // Islands (flags.cinnabarScene, FireRed's VAR_MAP_SCENE_CINNABAR_ISLAND:
      // game/sevii.js), or in its Pokémon Center if you weren't ready; the
      // Seagallop comes in only to take you. (Once you're Champion
      // player.flags.gameClear is set (FLAG_SYS_GAME_CLEAR), and
      // FLAG_SYS_CAN_LINK_WITH_RS, set at the end of the islands' story (the
      // Sapphire: celioSapphire()), is player.flags.canLinkWithRS: the
      // League's rematch teams.)
      case "FLAG_HIDE_CINNABAR_BILL": return f.cinnabarScene === 1;
      case "FLAG_HIDE_CINNABAR_SEAGALLOP": return false;
      case "FLAG_HIDE_CINNABAR_POKECENTER_BILL": return !!f.cinnabarBillInCenter;
      // One Island: Bill at the harbor to take you to Celio; in the Pokémon
      // Center, where the scenes put him and Celio, until he goes home.
      case "FLAG_HIDE_ONE_ISLAND_BILL": return f.oneHarborScene === 2;
      case "FLAG_HIDE_ONE_ISLAND_POKECENTER_BILL":
        if ((f.celioScene || 0) >= 3) return false;
        return !f.celioScene ? { x: 9, y: 8, movement: "face_up" } : f.celioScene === 2 ? { x: 14, y: 7, movement: "face_left" } : true;
      case "FLAG_HIDE_ONE_ISLAND_POKECENTER_CELIO": return f.celioScene === 2 ? { x: 14, y: 8, movement: "face_left" } : true;
      // Two Island: more people about as its shop grows (TwoIsland_EventScript_SetShopExpanded*);
      // Lostelle at the Joyful Game Corner once you've found her, at home on
      // Three Island once Bill's gone home; the biker only for his scene.
      case "FLAG_HIDE_TWO_ISLAND_WOMAN": return (f.twoIslandShopMax || 1) >= 2;
      case "FLAG_HIDE_TWO_ISLAND_BEAUTY": return (f.twoIslandShopMax || 1) >= 3;
      case "FLAG_HIDE_TWO_ISLAND_POKE_MANIAC": return (f.twoIslandShopMax || 1) >= 4;
      case "FLAG_HIDE_TWO_ISLAND_GAME_CORNER_BIKER": return false;
      case "FLAG_HIDE_TWO_ISLAND_GAME_CORNER_LOSTELLE":
        if (!f.rescuedLostelle || (f.cinnabarScene || 0) >= 4) return false;
        return f.gotMoonStoneFromDaddy ? { movement: "look_around" } : true;
      case "FLAG_HIDE_LOSTELLE_IN_HER_HOME": return !!f.rescuedLostelle && (f.cinnabarScene || 0) >= 4;
      case "FLAG_HIDE_LOSTELLE_IN_BERRY_FOREST": return !f.rescuedLostelle;
      // Three Island: the bikers until they're beaten (Paxton once a biker's
      // been to Two Island); the islanders standing up to them until Lostelle's found.
      case "FLAG_HIDE_THREE_ISLAND_ANTIBIKERS": return f.rescuedLostelle ? false : f.threeIslandScene === 4 ? { movement: "look_around" } : true;
      case "FLAG_HIDE_THREE_ISLAND_LONE_BIKER": return f.threeIslandScene === 2 || f.threeIslandScene === 3;
      case "FLAG_HIDE_THREE_ISLAND_BIKERS": return (f.threeIslandScene || 0) < 4;
      // Mt. Ember: Team Rocket outside the Ruby Path until both are beaten;
      // Moltres at the summit until you've fought it; the Ruby until you take it.
      case "FLAG_HIDE_MT_EMBER_EXTERIOR_ROCKETS":
        if (EMBER_GRUNTS.every((t) => f[t])) return false;
        return f.mtEmberScene === 2 ? { movement: "face_down" } : true;
      case "FLAG_HIDE_MOLTRES": return !f.foughtMoltres;
      // After the islands: Cerulean Cave's guard steps aside; Mewtwo waits
      // deep inside until caught or beaten (CeruleanCave_B1F_OnTransition).
      case "FLAG_HIDE_CERULEAN_CAVE_GUARD": return !Sevii.ceruleanCaveOpen(f);
      case "FLAG_HIDE_MEWTWO": return !f.foughtMewtwo;
      // Faraway Island's Mew, till it's caught or beaten (FLAG_CAUGHT_MEW, FLAG_DEFEATED_MEW).
      case "FLAG_HIDE_MEW": return !f.foughtMew;
      case "FLAG_HIDE_RUBY": return !f.gotRuby;
      // Four Island: Gary, for his scene the first time you come; the
      // poachers and Lorelei in Icefall Cave until you've run them off, and
      // then Lorelei at home until the Sapphire's in Celio's machine; her
      // dolls, more of them the more often you've entered the Hall of Fame
      // (UpdateLoreleiDollCollection).
      case "FLAG_HIDE_FOUR_ISLAND_RIVAL": return !f.fourIslandScene;
      case "FLAG_HIDE_ICEFALL_CAVE_ROCKETS": return !f.icefallScene;
      // (She stays by you until you leave: FourIsland_IcefallCave_Back_OnTransition.)
      case "FLAG_HIDE_ICEFALL_CAVE_LORELEI": return !f.icefallScene || (tempFlags.has("icefallLorelei") && { x: 12, y: 15, movement: "face_right" });
      case "FLAG_HIDE_LORELEI_IN_HER_HOUSE": return !!f.icefallScene && !f.canLinkWithRS;
      // (The Wigglytuff, Seel, Pikachu, Slowpoke, Slowbro and Psyduck dolls have
      // no flag: always there, as in FireRed. The other eight come one per 25
      // entries: Sevii.loreleiDolls.)
      case "FLAG_HIDE_LORELEI_HOUSE_MEOWTH_DOLL": case "FLAG_HIDE_LORELEI_HOUSE_CHANSEY_DOLL": case "FLAG_HIDE_LORELEIS_HOUSE_NIDORAN_F_DOLL":
      case "FLAG_HIDE_LORELEI_HOUSE_JIGGLYPUFF_DOLL": case "FLAG_HIDE_LORELEIS_HOUSE_NIDORAN_M_DOLL": case "FLAG_HIDE_LORELEIS_HOUSE_FEAROW_DOLL":
      case "FLAG_HIDE_LORELEIS_HOUSE_PIDGEOT_DOLL": case "FLAG_HIDE_LORELEIS_HOUSE_LAPRAS_DOLL":
        return Sevii.loreleiDollShown(person.flag, f.hofCount);
      // Five Island: Team Rocket in the Meadow and the Warehouse until its
      // Admin's beaten; Selphy lost in the Lost Cave, then outside her house
      // as you bring her home, then inside; her butler only comes in to thank you.
      case "FLAG_HIDE_FIVE_ISLAND_ROCKETS": return !f.defeatedRocketsInWarehouse;
      case "FLAG_HIDE_LOST_CAVE_SELPHY": return !f.lostCaveScene;
      case "FLAG_HIDE_RESORT_GORGEOUS_SELPHY": return f.resortScene === 1;
      case "FLAG_HIDE_RESORT_GORGEOUS_INSIDE_SELPHY": return (f.resortScene || 0) >= 2;
      case "FLAG_HIDE_SELPHYS_BUTLER": return false;
      // Six Island: Gary in the Pokémon Center the first time you come; the
      // scientist outside the Dotted Hole until you've been to Icefall Cave
      // (FireRed sets FLAG_HIDE_RUIN_VALLEY_SCIENTIST there); the Sapphire
      // until the thief has it; the thief only for his scene.
      case "FLAG_HIDE_SIX_ISLAND_POKECENTER_RIVAL": return !f.sixCenterScene;
      case "FLAG_HIDE_RUIN_VALLEY_SCIENTIST": return !f.icefallScene;
      case "FLAG_HIDE_SAPPHIRE": return !f.learnedYesNahChansey;
      case "FLAG_HIDE_DOTTED_HOLE_SCIENTIST": return false;
      // After you choose, your rival stands below the Poké Ball he took.
      // Leaf (the lab rival's other look) until she leaves after your battle;
      // after you choose, she stands below the Poké Ball she took.
      case "FLAG_HIDE_RIVAL_IN_LAB":
        if (f.rivalLabBattle) return false;
        return Object.assign({}, person.alt, f.starter ? { x: ballOf(RIVAL_PICK[f.starter]).x, y: 5, movement: "face_up" } : {});
      case "FLAG_HIDE_BULBASAUR_BALL": case "FLAG_HIDE_SQUIRTLE_BALL": case "FLAG_HIDE_CHARMANDER_BALL":
        return !(f.starter && (ballOf(f.starter).flag === person.flag || ballOf(RIVAL_PICK[f.starter]).flag === person.flag));
      default: return true;
    }
  }

  const T = (label) => window.WORLD_TEXT[label];
  // {PLAYER}, {RIVAL}, and {STR_VAR_1..3} from `vars` (["Abra", "Mr. Mime"]).
  // (Once Mr. Stone has made your Pokégear a PokéNav, it's that in everyone's words: "registered in your PokéNav".)
  // ({OLDGEAR}: the Pokégear as it was, by that name still: what Mr. Stone made it from.)
  const fill = (s, vars) => navName(s.replace(/\{PLAYER\}/g, player.name).replace(/\{RIVAL\}/g, player.rival)
    .replace(/\{STR_VAR_(\d)\}/g, (_, n) => (vars && vars[n - 1] != null ? vars[n - 1] : ""))).replace(/\{OLDGEAR\}/g, "Pokégear");
  const navName = (s) => (hasPokenav() ? s.replace(/Pok[ée]gear|POK[ÉéE]GEAR|Pok[ée]Gear/g, "PokéNav") : s);
  // (The PokéNav: Mr. Stone's, in Devon's office, Emerald's FLAG_SYS_POKENAV_GET. It's your Pokégear made over, and
  // does all it does: ui/pokegear.js, in its own colours.)
  const hasPokenav = () => !!(player && player.flags && player.flags.hoenn && player.flags.hoenn.f && player.flags.hoenn.f.FLAG_SYS_POKENAV_GET);
  async function say(pages, vars) { for (const p of [].concat(pages)) await window.Screen.read(fill(p, vars)); }

  // (A scene as you come out of a building: out of its doorway first, as HGSS's and Emerald's step you out
  // before their scenes run; the overworld's own step out waits for the scene, so you'd be left in the door.)
  async function outOfDoorway() {
    const at = Overworld.position(), b = World.blockAt(at.map, at.x, at.y);
    if (b.behavior !== World.MB.WARP_DOOR && b.behavior !== World.MB.CAVE_DOOR) return;
    if (World.step({ map: at.map, x: at.x, y: at.y }, "down", null).ok) await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
  }
  async function story(ev) {
    if (ev.type === "pc") {
      // (While Bill's helping Celio on One Island, the PCs can't reach his storage: FLAG_SYS_PC_STORAGE_DISABLED.)
      if (player.flags.pcStorageDisabled) { await say(T("OneIsland_PokemonCenter_1F_Text_UsualPCServicesUnavailable")); return; }
      sfx("se_pc_on");
      await say("{PLAYER} booted up the PC.");
      await pc();
      return;
    }
    if (ev.type === "trainer") {
      if (ev.second && await pairBattle(ev, ev.second)) return;
      const beaten = !!player.flags[ev.person.trainer.id];
      await trainerBattle(ev.person, ev.approach, ev.facing);
      if (!beaten) await afterRocket(ev.person);
      // (Their number, asked on the map once the battle screen's gone, as HGSS does: ui/pokegear.js.)
      if (!beaten && player.flags[ev.person.trainer.id] && gear.wantsNumber(ev.person)) { show("world"); await Overworld.resume(); await gear.beatTrainer(ev.person); }
      return;
    }
    if (ev.type === "hidden") {
      const h = ev.hidden;
      if (h.item === "coins") { await hiddenCoins(h); return; }
      Player.addItem(player, h.item, h.quantity);
      player.flags[h.flag] = true;
      await sayWithJingle(itemJingle(h.item), "{PLAYER} found " + (h.quantity > 1 ? h.quantity + " " : "a ") + Bag.name(h.item) + "!");
      return;
    }
    const script = (ev.person || ev.sign || ev.trigger).script;
    const f = player.flags;

    // (Mom's deliveryman, and the Gym Leaders' numbers and Dojo rematches: ui/pokegear.js.)
    if (ev.person && await gear.talkPerson(ev.person, ev.map)) return;
    if (ev.person && await berryFarm.talk(ev.person)) return;   // (Celadon's Berry Farm: ui/berry-farm.js)
    if (ev.person && await hoennBerries.talk(ev.person)) return;   // (Hoenn's trees)
    if (ev.person && await sinnohBerries.talk(ev.person)) return;   // (Sinnoh's)
    // (Hoenn's own: a sailor, the bedroom PCs, the Day Care.)
    if (script === "SlateportCity_Harbor_EventScript_Sailor") { await slateportSailor(); return; }
    if (isHoenn(ev.map || player.location.map) && /_EventScript_PC$/.test(script)) { await pc(); return; }
    if (script === "Route117_PokemonDayCare_EventScript_DaycareWoman") { await dayCareMan(); return; }
    if (script === "LilycoveCity_MoveDeletersHouse_EventScript_MoveDeleter") { await moveDeleter(); return; }
    if (script === "FallarborTown_MoveRelearnersHouse_EventScript_MoveRelearner") { await moveRelearner(); return; }
    // (The Delta Episode's scenes and people, and Jirachi's deck: this game's own.)
    if (deltaDue(script)) { await deltaScene(script); return; }
    if (isHoenn(ev.map || player.location.map) && await deltaTalk(script, ev)) return;
    // Hoenn's: Emerald's scripts (ui/hoenn-script.js), and its maps' scenes as you come in.
    if (/^(enter|arrive):/.test(script) && isHoenn(script.replace(/^\w+:/, ""))) {
      const due = hoenn.frameScript(script.replace(/^\w+:/, ""), /^enter:/.test(script));
      if (due) { await outOfDoorway(); await runHoenn(due, null); }
      return;
    }
    { const hs = hoennScriptFor(ev); if (hs) { await runHoenn(hs, ev.person); return; } }

    // Johto's scripts (ui/johto-script.js), and its Apricorn trees.
    if (/^(enter|arrive):/.test(script)) { const due = johto.frameScript(script.replace(/^\w+:/, "")); if (due) { await outOfDoorway(); await runJohto(due, null); return; } }
    // (Ilex Forest's shrine, with the GS Ball: Crystal's Celebi.)
    if (script === "hgss:D36R0101:scr_seq_D36R0101_012" && Player.itemCount(player, "gs-ball") > 0 && !player.flags.gsBallCelebi) { await ilexShrineCelebi(); return; }
    // (Ilex Forest's Headbutt tutor: ui/johto-field.js.)
    if (script === "hgss:D36R0101:scr_seq_D36R0101_002") { await johtoField.headbuttTutor(); return; }
    { const js = johto.scriptOf(ev.person || ev.sign || ev.trigger); if (js) { await runJohto(js, ev.person); return; } }
    { const ap = /^hgss_apricorn:(\d+):(\w+)$/.exec(script || ""); if (ap) { await apricornTree(+ap[1], ap[2]); return; } }
    { const ar = /^Johto_AzaleaRide:(\d+)$/.exec(script || ""); if (ar) { await azaleaRide(+ar[1]); return; } }
    { const gp = /^Johto_GoldenrodPanel:(\d)$/.exec(script || ""); if (gp) { await goldenrodPanel(+gp[1]); return; } }
    if (script === "Johto_MagnetTrain") { await magnetTrainBoard(); return; }
    if (script === "Johto_SSAquaBoard") { await ssAquaBoard(); return; }
    // (Hoenn's Poké Mart clerks: their stock, from Emerald's scripts.)
    if (ev.person && ev.person.mart && /_Mart_EventScript_Clerk$/.test(script || "") && (window.WORLD_MAPS[ev.map] || {}).region === "hoenn") { await mart(ev.person.mart); return; }
    // (Sinnoh's, from the Essentials project: more for more Badges, any region's.)
    if (ev.person && ev.person.mart && /_Mart_EventScript_Clerk$/.test(script || "") && (window.WORLD_MAPS[ev.map] || {}).region === "sinnoh") {
      const tier = (ev.person.martTiers || []).find(([n]) => player.badges.length >= n);
      await mart(tier ? tier[1] : ev.person.mart);
      return;
    }
    if (script === "SandgemTown_EventScript_Sailor") { await sinnohSailor(); return; }
    if (script === "TimeMachine_EventScript_Machine") { await timeMachine(); return; }
    if (script === "TimeMachine_EventScript_Scientist") { await timeMachineScientist(); return; }
    if (script === "TimeMachine_EventScript_Sign") { await say("TIME MACHINE\nTravel beyond the Pokémon realm!"); return; }
    { const rp = /^RealmHub_EventScript_Portal_(\w+)$/.exec(script || ""); if (rp) { await realmPortal(rp[1]); return; } }
    if (script === "SacredCards_Fountain") { await dominoFountain(); return; }
    if (script === "SacredCards_BackToTown") { await dominoBackToTown(); return; }
    if (script === "Domino_WorldMap") { await dominoTravel(); return; }
    if (script === "KameGame_Grandpa") { await kameGameShop(); return; }
    if (script === "Domino_Manhole" || script === "Domino_ManholeUp") { await dominoManhole(script === "Domino_Manhole"); return; }
    if (script === "Domino_TimeMachine") { await dominoTimeMachine(); return; }
    if (script === "Kamurocho_TimeMachine") { await kamurochoTimeMachine(); return; }
    if (script === "Kamurocho_Kiryu") { await kamurochoKiryu(ev.person); return; }
    if (script === "Kamurocho_Majima") { await kamurochoMajima(ev.person); return; }
    if (script === "Kamurocho_Clerk") { await kamurochoShop(); return; }
    if (DOMINO_DUELISTS[script]) { await dominoDuel(DOMINO_DUELISTS[script], ev.person); return; }
    if (/^DominoHigh_Person([0-9]|1[01])$/.test(script || "")) { await dominoDuel(classmate(script), ev.person); return; }
    if (ev.person && ev.person.ferry && isSinnoh(ev.map)) { await sinnohFerry(ev.person); return; }
    if (/_EventScript_FossilScientist$/.test(script || "") && isSinnoh(ev.map)) { await fossilScientist(); return; }
    // (Johto's Pokémon Centers' nurses heal as Kanto's do.)
    if (/_PokemonCenter_1F_EventScript_Nurse$/.test(script || "") && (window.WORLD_MAPS[ev.map] || {}).pokemonCenter) { await nurse(ev.map, ev.person); return; }

    // (Kanto's Gym Leaders' rematches, once you're Champion: leaderRematch.)
    if (KANTO_REMATCH[script] && await leaderRematch(KANTO_REMATCH[script])) return;
    if (script === "PewterCity_Gym_EventScript_Brock") { await brock(ev.person); return; }
    if (script === "CeruleanCity_Gym_EventScript_Misty") { await misty(ev.person); return; }
    if (script === "VermilionCity_Gym_EventScript_LtSurge") { await ltSurge(ev.person); return; }
    if (script === "CeladonCity_Gym_EventScript_Erika") { await erika(ev.person); return; }
    if (script === "SaffronCity_Gym_EventScript_Sabrina") { await sabrina(ev.person); return; }
    if (script === "FuchsiaCity_Gym_EventScript_Koga") { await koga(ev.person); return; }
    if (script === "CinnabarIsland_Gym_EventScript_Blaine") { await blaine(ev.person); return; }
    if (script === "ViridianCity_Gym_EventScript_Giovanni") { await giovanniGym(ev.person); return; }
    if (ELITE_FOUR_SCRIPTS.includes(script)) { await eliteFour(ELITE_FOUR_SCRIPTS.indexOf(script)); return; }
    if (/^enter:PokemonLeague_/.test(script)) { await leagueEnter(script.slice(6)); return; }
    { const g = /^Route23_EventScript_(\w+)BadgeGuard(Trigger)?$/.exec(script); if (g) { await badgeGuard(ROUTE23_BADGES.indexOf(g[1]) + 1, !!g[2], "LOCALID_" + g[1].toUpperCase() + "_BADGE_GUARD"); return; } }
    { const q = /^CinnabarIsland_Gym_EventScript_Quiz(\d)(Left|Right)$/.exec(script); if (q) { await cinnabarQuiz(+q[1], q[2]); return; } }
    if (FUCHSIA_SIGN_MONS[script]) { await monSign(FUCHSIA_SIGN_MONS[script], ev.sign.text); return; }
    if (BRAILLE_SIGNS[script]) { await say(BRAILLE_SIGNS[script].map(braille)); return; }
    if (/^SevenIsland_SevaultCanyon_TanobyKey_EventScript_Switch\d$/.test(script)) { await tanobyKeySwitch(script); return; }
    if (script === "Game_EventScript_Leaf") {
      if (!canBattle()) return;
      if (ev.map === "PewterCity") await leafPewter(true); else await leafVermilion();
      return;
    }
    // The Karate Master, beaten: choose a prized Pokémon (or train with them).
    if (script === "SaffronCity_Dojo_EventScript_MasterKoichi" && !trainerWaiting(ev.person)) {
      await dojoMaster();
      return;
    }
    // Gideon has the Sapphire (his battle's own ending: FiveIsland_RocketWarehouse_EventScript_DefeatedGideon).
    if (script === "FiveIsland_RocketWarehouse_EventScript_Gideon") { await gideon(ev.person); return; }
    if (TRAINER_SCRIPTS.has(script)) {
      if (trainerWaiting(ev.person)) {
        const beaten = !!f[ev.person.trainer.id];
        await trainerBattle(ev.person, null);
        if (!beaten) await afterRocket(ev.person);
        if (!beaten && f[ev.person.trainer.id] && gear.wantsNumber(ev.person)) { show("world"); await Overworld.resume(); await gear.beatTrainer(ev.person); }
        if (ev.person.trainer.id === DOJO_MASTER) await dojoDenDoor();
      } else if (await gear.talkTrainer(ev.person)) return;   // (a Johto trainer on the phone: a rematch, a gift)
      else await say(dojoAfter(ev.person.trainer.id) || ev.person.trainer.after || ev.person.text || []);
      return;
    }

    if (ev.person && ev.person.item) {
      const item = ev.person.item;
      Player.addItem(player, item);
      f[ev.person.flag] = true;
      Overworld.removePerson(ev.person);   // (just the ball: everyone else stays where they are)
      await sayWithJingle(itemJingle(item), /^Game_EventScript_MegaStone_/.test(ev.person.script || "") ? "{PLAYER} found " + article(Bag.name(item)) + "!"
        : "{PLAYER} found a " + Bag.name(item) + "!");
      return;
    }

    if (STARTER_BALLS[script]) {
      const ball = STARTER_BALLS[script];
      if (f.starter) { await say("That's Prof. Oak's last Pokémon."); return; }
      if (!f.oakInLab) { await say(T("PalletTown_ProfessorOaksLab_Text_ThoseArePokeBalls")); return; }
      showPicture(ball.species);
      cry(ball.species);
      const yes = await confirm("So! You want the " + ball.kind + " Pokémon, " + ball.species + "?");
      hidePicture();
      if (!yes) return;
      Player.receive(player, Party.create(ball.species, STARTER_LEVEL));
      Overworld.removeObject(ball.id);
      await say("{PLAYER} received the " + ball.species + " from Prof. Oak!");
      // Leaf walks over to the Poké Ball that's weak against yours and takes it.
      // (FireRed's walk to Squirtle runs along the row you stand in, past
      // Bulbasaur's ball: with you there, she goes round, a row lower.)
      const theirs = RIVAL_PICK[ball.species];
      await say(["Leaf: Then I'll take this one!\nI think we'll get along great."]);
      const walk = theirs === "Squirtle" && ball.species === "Bulbasaur"
        ? ["walk_down", "walk_down", "walk_right", "walk_right", "walk_right", "walk_right", "walk_up"]
        : M("PalletTown_ProfessorOaksLab_Movement_RivalWalksTo" + theirs);
      await Overworld.act([{ who: LAB_RIVAL, moves: walk }]);
      Overworld.removeObject(ballOf(theirs).id);
      f.starter = ball.species;
      await say(LAB_RIVAL_NAME + " received the " + theirs + " from Prof. Oak!");
      return;
    }

    { const den = RaidDens.byScript(script); if (den) { await raidDen(den); return; } }
    if (SILPH_WORKERS[script]) { await say(T(SILPH_WORKERS[script][silphFreed() ? 1 : 0])); return; }
    if (SILPH_DOORS.includes(script)) { await silphDoor(script); return; }
    // (Out of Viridian Forest's north gate with the Tera Orb still to get: the aide comes out after you.)
    if (teraAideDue(script)) { await teraAide(); return; }
    if (script === "enter:Route23" && victoryRoadRivalDue()) { await victoryRoadRival(); return; }
    if (/^enter:/.test(script) && megaAideDue(script.slice(6))) { await megaAide(); return; }
    if ((script === "enter:PokemonTower_7F" || script === "Game_EventScript_MegaTower") && megaTowerDue()) { await megaTower(); return; }
    const can = /^VermilionCity_Gym_EventScript_TrashCan(\d+)$/.exec(script);
    if (can) { await trashCan(+can[1]); return; }
    const slots = /^CeladonCity_GameCorner_EventScript_SlotMachine(\d+)$/.exec(script);
    if (slots) { await slotMachine(+slots[1]); return; }

    switch (script) {
      case "PalletTown_EventScript_SignLady":
        await signLady(ev.person);
        return;
      case "CenterUpstairs_EventScript_MoveRelearner": await moveRelearner(); return;
      case "CenterUpstairs_EventScript_MoveDeleter": await moveDeleter(); return;
      case "PalletTown_EventScript_SignLadyTrigger":
        // Walking past her by the north exit, she shows you what she copied.
        if (!f.starter || f.signLady) return;
        await Overworld.act([{ who: SIGN_LADY, moves: M("Common_Movement_WalkInPlaceFasterRight") },
          { who: "player", moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
        await signLadyShowSign();
        return;
      case "PalletTown_EventScript_TrainerTips":
        await say(ev.sign.text);
        if (!f.signLady) f.signLady = 1;
        return;

      case "PalletTown_PlayersHouse_1F_EventScript_Mom":
        if (!player.party.length) {
          // She's Red's mom: he's already on his way. After the first time,
          // just the last part.
          if (f.metRedsMom) await say(["Red's Mom: If you want a Pokémon of\nyour own, go see Prof. Oak."]);
          else await say(["Red's Mom: …Right.\nAll boys leave home someday.\nIt said so on TV.",
            "My son Red has already begun his\njourney. He should be in Viridian\nForest by now.",
            "If you want a Pokémon of your own,\ngo see Prof. Oak."]);
          f.metRedsMom = true;
          return;
        }
        // (This game's own: home as the new Champion, she's heard. FireRed's
        // Mom has nothing new to say after the Hall of Fame.)
        if (f.gameClear && !f.momHeardChampion) {
          f.momHeardChampion = true;
          await say(["Red's Mom: {PLAYER}! Welcome home!\nI saw it on TV!",
            "You're the new Pokémon League\nChampion! I'm so proud of you!"]);
        }
        // (Once she's on the Pokégear, your savings with her: HGSS's Mom's bank, ui/pokegear.js.)
        if (await gear.momHome()) return;
        await say("Red's Mom: Oh, {PLAYER}! You look worn out.\nYou and your Pokémon should take a\nquick rest.");
        await outOfCenterHeal();
        await say("Red's Mom: There! You and your Pokémon\nare looking great. Take care now!");
        return;

      // The woman on the S.S. Anne who lets you rest.
      case "SSAnne_1F_Room6_EventScript_Woman":
        if (!(await confirm(T("SSAnne_1F_Room6_Text_TakeAShortRest")[0]))) {
          await say(T(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl
            ? "SSAnne_1F_Room6_Text_SorryYouLookLikeMySister" : "SSAnne_1F_Room6_Text_SorryYouLookLikeMyBrother"));
          return;
        }
        await outOfCenterHeal();
        await say(T("SSAnne_1F_Room6_Text_GladEveryoneIsRefreshed"));
        return;

      // The woman in Vermilion's Pokémon Center who gives you the VS Seeker.
      case "VermilionCity_PokemonCenter_1F_EventScript_VSSeekerWoman": {
        const V = (label) => T("VermilionCity_PokemonCenter_1F_Text_" + label);
        if (f.gotVsSeeker) { await say(V("ExplainVSSeeker")); return; }
        await say(V("UrgeToBattleSomeoneAgain"));
        Player.addItem(player, "vs-seeker");
        f.gotVsSeeker = true;
        await sayWithJingle("mus_obtain_key_item", "{PLAYER} received the VS Seeker!");
        await say(V("UseDeviceForRematches"));
        return;
      }

      case "PalletTown_PlayersHouse_2F_EventScript_PC":
        // Your own PC at home holds items, as in FireRed (BedroomPC).
        sfx("se_pc_on");
        await say("{PLAYER} booted up the PC.");
        await playersPc();
        sfx("se_pc_off");
        return;

      case "PalletTown_EventScript_OakTriggerLeft":
      case "PalletTown_EventScript_OakTriggerRight":
        if (player.party.length || f.oakInLab) return;
        await oakWalksYouToTheLab(script.endsWith("Left") ? "Left" : "Right");
        return;

      // Leaving the lab before choosing a Pokémon.
      case "PalletTown_ProfessorOaksLab_EventScript_LeaveStarterSceneTrigger":
        if (f.oakInLab && !f.starter) {
          await say(T("PalletTown_ProfessorOaksLab_Text_OakHeyDontGoAwayYet"));
          Overworld.forceStep("up");
          return;
        }
        // with a Pokémon, the rival battle trigger on the same tile takes over
      // falls through
      case "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerLeft":
      case "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerMid":
      case "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerRight": {
        if (!f.starter || f.rivalLabBattle || !player.party.length) return;
        await rivalLabBattle(ev.trigger.x);
        return;
      }

      // Leaf, waiting in the lab before Oak walks you there: she introduces
      // herself, then wonders where he is.
      case "PalletTown_ProfessorOaksLab_EventScript_Rival":
        if (!f.oakInLab && !f.starter && !f.metLeaf) {
          await say(["Leaf: Oh, hey! What's your name?\n{PLAYER}?",
            "Leaf: My name's Leaf! I'm here to get my\nstarter Pokémon, but Prof. Oak is not\naround."]);
          f.metLeaf = true;
        } else if (!f.oakInLab && !f.starter) await say(["Leaf: I wonder where he is?"]);
        else if (!f.starter) await say(["Leaf: You go ahead and choose first,\n{PLAYER}! I don't mind waiting."]);
        else await say(["Leaf: Your Pokémon looks really\ncute! Mine's pretty great, too."]);
        return;

      case "PalletTown_ProfessorOaksLab_EventScript_ProfOak":
        if (!f.starter) await say(ev.person.text);
        else if (f.orreStory >= 1) await oakOrre();
        else if (f.gameClear && !f.gotGsBall) await oakGsBall();
        else if (f.oaksParcel && !f.parcelDelivered) await pokedexScene();
        else if (f.parcelDelivered) await say(T("PalletTown_ProfessorOaksLab_Text_OakMonsAroundWorldWait"));
        else if (!f.rivalLabBattle) await say(T("PalletTown_ProfessorOaksLab_Text_OakCanReachNextTownWithMon"));
        else await say(T("PalletTown_ProfessorOaksLab_Text_OakBattleMonForItToGrow"));
        return;

      case "PalletTown_RivalsHouse_EventScript_Daisy":
        // The first time you talk, she introduces herself and gives you the
        // Town Map off the wall.
        if (f.townMap) await say(T("PalletTown_RivalsHouse_Text_ExplainTownMap"));
        else {
          await say(["Daisy: Oh, hi! I don't think we've\nmet. I'm Daisy, {RIVAL}'s older\nsister.",
            "Our grandpa is Prof. Oak. His lab\nis just down the road.",
            "Here, take this.\nIt'll help you find your way around."]);
          await Overworld.act([{ who: "LOCALID_DAISY", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
          Overworld.removeObject("LOCALID_TOWN_MAP");
          await Overworld.act([{ who: "LOCALID_DAISY", moves: M("Common_Movement_FacePlayer") }]);
          Player.addItem(player, "town-map");
          f.townMap = true;
          await say(T("PalletTown_RivalsHouse_Text_ReceivedTownMapFromDaisy"));
        }
        return;

      // ---------- Viridian City ----------

      case "ViridianCity_EventScript_RoadBlocked":
        if (f.parcelDelivered) return;
        await say(T("ViridianCity_Text_ThisIsPrivateProperty"));
        Overworld.forceStep("down");
        return;

      // He turns to you and you to him (FireRed's TutorialTriggerLeft/Right).
      case "ViridianCity_EventScript_TutorialTriggerLeft":
      case "ViridianCity_EventScript_TutorialTriggerRight": {
        if (!f.parcelDelivered || f.catchTutorial) return;
        const left = script.endsWith("Left");
        await Overworld.act([{ who: "LOCALID_TUTORIAL_MAN", moves: M(left ? "Common_Movement_WalkInPlaceFasterLeft" : "Common_Movement_WalkInPlaceFasterRight") }]);
        await Overworld.act([{ who: "player", moves: M(left ? "Common_Movement_WalkInPlaceFasterRight" : "Common_Movement_WalkInPlaceFasterLeft") }]);
        await catchTutorial();
        return;
      }

      case "ViridianCity_EventScript_TutorialOldMan":
        if (!f.parcelDelivered) await say(T("ViridianCity_Text_ThisIsPrivateProperty"));
        else if (!f.catchTutorial) await catchTutorial();
        else await say(T("ViridianCity_Text_WeakenMonsFirstToCatch"));
        return;

      case "ViridianCity_EventScript_Woman":
        await say(f.parcelDelivered ? ev.person.text : T("ViridianCity_Text_GrandpaHasntHadCoffeeYet"));
        return;

      case "ViridianCity_EventScript_Youngster":
        await say(T(await confirm(fill(T("ViridianCity_Text_WantToKnowAboutCaterpillarMons").join(" ")))
          ? "ViridianCity_Text_ExplainCaterpieWeedle" : "ViridianCity_Text_OhOkayThen"));
        return;

      case "ViridianCity_EventScript_DreamEaterTutor":
        await moveTutor("Dream Eater", "tutorDreamEater", "Text_DreamEater");
        return;
      // Lavender Town: the girl asking whether you believe in ghosts.
      case "LavenderTown_EventScript_LittleGirl":
        await say(T(await confirm(T("LavenderTown_Text_DoYouBelieveInGhosts")[0])
          ? "LavenderTown_Text_SoThereAreBelievers" : "LavenderTown_Text_JustImaginingWhiteHand"));
        return;
      case "LavenderTown_House2_EventScript_NameRater":
        await nameRater();
        return;
      // Rock Tunnel B1F's Rock Slide tutor.
      case "RockTunnel_B1F_EventScript_RockSlideTutor":
        await moveTutor("Rock Slide", "tutorRockSlide", "Text_RockSlide");
        return;
      // Prof. Oak's Aide in Route 10's Pokémon Center: the Everstone for twenty kinds caught.
      case "Route10_PokemonCenter_1F_EventScript_Aide":
        await aideGift({ needed: 20, item: "everstone", flag: "gotEverstone", text: "Route10_PokemonCenter_1F_Text_",
          ask: "GiveEverstoneIfCaught20Mons", received: "ReceivedEverstoneFromAide", explain: "ExplainEverstone" });
        return;

      // FireRed's parcel scene: the clerk calls out, you walk up to the counter.
      case "enter:PewterCity":
        await leafPewter();
        return;

      case "enter:ViridianCity_Mart": {
        if (f.oaksParcel) return;
        const CLERK = "LOCALID_VIRIDIAN_MART_CLERK";
        await Overworld.act([{ who: CLERK, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
        await say(T("ViridianCity_Mart_Text_YouCameFromPallet"));
        await Overworld.act([
          { who: CLERK, moves: M("ViridianCity_Mart_Movement_FacePlayer") },
          { who: "player", moves: M("ViridianCity_Mart_Movement_ApproachCounter") }]);
        await say(T("ViridianCity_Mart_Text_TakeThisToProfOak"));
        f.oaksParcel = true;
        Player.addItem(player, "oaks-parcel");
        await say(T("ViridianCity_Mart_Text_ReceivedOaksParcelFromClerk"));
        return;
      }

      case "ViridianCity_Mart_EventScript_Clerk":
        if (!f.parcelDelivered) { await say(T("ViridianCity_Mart_Text_SayHiToOakForMe")); return; }
        await mart(ev.person.mart);
        return;

      case "ViridianCity_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;

      case "Common_EventScript_UnionRoomAttendant":
      case "Common_EventScript_WirelessClubAttendant":
        await say(T("Text_WirelessClubUndergoingAdjustments"));
        return;
      case "Common_EventScript_DirectCornerAttendant":
        await directCorner();
        return;

      // ---------- Route 22 ----------

      // Your rival is waiting on Route 22 once you have the Pokédex.
      case "Route22_EventScript_EarlyRivalTriggerTop":
      case "Route22_EventScript_EarlyRivalTriggerMid":
      case "Route22_EventScript_EarlyRivalTriggerBottom":
        if (f.pokedex && !f.route22Rival) await route22Rival(script.replace("Route22_EventScript_EarlyRivalTrigger", ""));
        return;

      // The League gate: the guard checks for the Boulder Badge (FireRed's
      // Route22_NorthEntrance_EventScript_BadgeGuard, as Route 23's guards).
      case "Route22_NorthEntrance_EventScript_BoulderBadgeGuardTrigger":
      case "Route22_NorthEntrance_EventScript_BoulderBadgeGuard":
        await badgeGuard(1, script.endsWith("Trigger"), "#0");
        return;

      // Gary again, on your way to the League with all eight Badges.
      case "Route22_EventScript_LateRivalTriggerTop":
      case "Route22_EventScript_LateRivalTriggerMid":
      case "Route22_EventScript_LateRivalTriggerBottom":
        await route22LateRival(script.replace("Route22_EventScript_LateRivalTrigger", ""));
        return;

      // ---------- Viridian City's Gym ----------
      // Locked until you have the other Badges (ViridianCity_OnTransition's
      // TryUnlockGym: the Cascade to the Volcano Badge).
      case "ViridianCity_EventScript_GymDoorLocked":
        await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
        await sleep(333);
        await say(T("ViridianCity_Text_GymDoorsAreLocked"));
        Screen.say("");
        await Overworld.act([{ who: "player", moves: M("ViridianCity_Movement_JumpDownLedge") }]);
        return;
      case "ViridianCity_EventScript_OldMan":
        if (viridianGymOpen()) { await say(T("ViridianCity_Text_ViridiansGymLeaderReturned")); return; }
        await say(T("ViridianCity_Text_GymClosedWonderWhoLeaderIs"));
        Screen.say("");
        await faceBack(ev.person);
        return;
      case "ViridianCity_Gym_EventScript_GymGuy":
        await say(T(f.TRAINER_LEADER_GIOVANNI ? "ViridianCity_Gym_Text_GymGuyPostVictory" : "ViridianCity_Gym_Text_GymGuyAdvice"));
        return;
      case "ViridianCity_Gym_EventScript_GymStatue":
        await say(T(hasBadge("earth") ? "ViridianCity_Gym_Text_GymStatuePlayerWon" : "ViridianCity_Gym_Text_GymStatue"));
        return;

      // ---------- The Power Plant ----------
      case "PowerPlant_EventScript_Zapdos":
        await legendaryBird(ev.person, "Zapdos", "foughtZapdos");
        return;
      case "PowerPlant_EventScript_Electrode1":
      case "PowerPlant_EventScript_Electrode2":
        await powerPlantElectrode(ev.person, script.slice(-1));
        return;

      // ---------- Victory Road and Indigo Plateau ----------
      case "VictoryRoad_2F_EventScript_DoubleEdgeTutor":
        await moveTutor("Double-Edge", "tutorDoubleEdge", "Text_DoubleEdge");
        return;
      case "IndigoPlateau_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;
      case "IndigoPlateau_PokemonCenter_1F_EventScript_Clerk":
        await mart(ev.person.mart);
        return;
      // The Elite Four's door: once you're Champion, it's closed until the
      // Sapphire's in Celio's machine (Sevii.leagueClosed).
      case "IndigoPlateau_PokemonCenter_1F_EventScript_DoorGuard":
        await say(T(Sevii.leagueClosed(f) ? "IndigoPlateau_PokemonCenter_1F_Text_LoreleiIsAbsentClosedForTimeBeing"
          : "IndigoPlateau_PokemonCenter_1F_Text_FaceEliteFourGoodLuck"));
        return;

      // ---------- Pewter City ----------

      // Before you have Brock's badge, a boy marches you to the Gym if you
      // head for the east exit, or if you talk to him.
      case "PewterCity_EventScript_GymGuideTriggerTop":
      case "PewterCity_EventScript_GymGuideTriggerMid":
      case "PewterCity_EventScript_GymGuideTriggerBottom":
        if (!f.TRAINER_LEADER_BROCK) await gymGuide(script.replace("PewterCity_EventScript_GymGuideTrigger", ""));
        return;
      case "PewterCity_EventScript_GymGuide":
        await gymGuide(Overworld.position().facing === "right" ? "East" : "Top", true);
        return;

      case "PewterCity_EventScript_MuseumGuide": {
        if (await confirm(fill(T("PewterCity_Text_DidYouCheckOutMuseum")[0]))) { await say(T("PewterCity_Text_WerentThoseFossilsAmazing")); return; }
        await say(T("PewterCity_Text_ReallyYouHaveToGo"));
        const side = { up: "North", down: "South", left: "West", right: "East" }[Overworld.position().facing];
        const GUIDE = "LOCALID_PEWTER_MUSEUM_GUIDE";
        await Overworld.act([{ who: GUIDE, moves: ["delay_10"].concat(M("PewterCity_Movement_GuideWalkToMuseum" + side)) },
          { who: "player", moves: ["delay_10"].concat(M("PewterCity_Movement_PlayerWalkToMuseum" + side)) }]);
        await say(T("PewterCity_Text_ThisIsTheMuseum"));
        await Overworld.act([{ who: GUIDE, moves: ["delay_10"].concat(M("PewterCity_Movement_MuseumGuideExit")) }]);
        Overworld.removeObject(GUIDE);
        return;
      }

      case "PewterCity_EventScript_BugCatcher":
        await say(T((await confirm(fill(T("PewterCity_Text_DoYouKnowWhatImDoing").join(" "))))
          ? "PewterCity_Text_ThatsRightItsHardWork" : "PewterCity_Text_SprayingRepelToKeepWildMonsOut"));
        return;

      // The Museum: ₽50 a visit, paid at the counter as you walk in.
      case "PewterCity_Museum_1F_EventScript_EntranceTriggerLeft":
      case "PewterCity_Museum_1F_EventScript_EntranceTriggerMid":
      case "PewterCity_Museum_1F_EventScript_EntranceTriggerRight": {
        if (f.museumTicket) return;
        await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
        const ask_ = T("PewterCity_Museum_1F_Text_Its50YForChildsTicket");
        await say(ask_.slice(0, -1));
        const yes = await confirm(fill(ask_[ask_.length - 1]) + "\n(You have " + money(player.money) + ".)");
        if (yes && player.money >= 50) {
          const side = script.replace("PewterCity_Museum_1F_EventScript_EntranceTrigger", "");
          await Overworld.act([{ who: "player", moves: M("PewterCity_Museum_1F_Movement_ApproachCounter" + side) }]);
          Player.addMoney(player, -50);
          f.museumTicket = true;
          await say(T("PewterCity_Museum_1F_Text_Right50YThankYou"));
        } else {
          await say(T(yes ? "PewterCity_Museum_1F_Text_DontHaveEnoughMoney" : "PewterCity_Museum_1F_Text_ComeAgain"));
          await Overworld.act([{ who: "player", moves: M("PewterCity_Museum_1F_Movement_ForcePlayerExit") }]);
        }
        return;
      }

      // Behind the counter he tells you about Amber; at the counter, enjoy yourself.
      case "PewterCity_Museum_1F_EventScript_Scientist1":
        if (Overworld.position().facing === "right") { await say(T("PewterCity_Museum_1F_Text_PleaseEnjoyYourself")); return; }
        await say(T("PewterCity_Museum_1F_Text_DoYouKnowWhatAmberIs").slice(0, -1));
        await say(T((await confirm(fill(T("PewterCity_Museum_1F_Text_DoYouKnowWhatAmberIs").slice(-1)[0])))
          ? "PewterCity_Museum_1F_Text_AmberContainsGeneticMatter" : "PewterCity_Museum_1F_Text_AmberIsFossilizedSap"));
        await Overworld.act([{ who: "LOCALID_MUSEUM_SCIENTIST1", moves: ["face_left"] }]);
        return;

      case "PewterCity_Museum_1F_EventScript_OldAmberScientist":
        if (f.gotOldAmber) { await say(T("PewterCity_Museum_1F_Text_GetOldAmberChecked")); return; }
        await say(T("PewterCity_Museum_1F_Text_WantYouToGetAmberExamined"));
        f.gotOldAmber = true;
        Overworld.removeObject("LOCALID_OLD_AMBER");
        Player.addItem(player, "old-amber");
        await say(T("PewterCity_Museum_1F_Text_ReceivedOldAmberFromMan"));
        return;

      case "PewterCity_Museum_1F_EventScript_SeismicTossTutor":
        await moveTutor("Seismic Toss", "tutorSeismicToss", "Text_SeismicToss");
        return;

      // The fossils, shown as FireRed does (OpenMuseumFossilPic).
      case "PewterCity_Museum_1F_EventScript_AerodactylFossil":
      case "PewterCity_Museum_1F_EventScript_KabutopsFossil": {
        const species = script.endsWith("AerodactylFossil") ? "Aerodactyl" : "Kabutops";
        showPicture(species);
        await say(ev.sign.text);
        hidePicture();
        return;
      }

      case "PewterCity_Gym_EventScript_GymGuy":
        if (f.TRAINER_LEADER_BROCK) { await say(T("PewterCity_Gym_Text_YoureChampMaterial")); return; }
        await say(T("PewterCity_Gym_Text_LetMeTakeYouToTheTop").slice(0, -1));
        await say(T((await confirm(fill(T("PewterCity_Gym_Text_LetMeTakeYouToTheTop").slice(-1)[0])))
          ? "PewterCity_Gym_Text_LetsGetHappening" : "PewterCity_Gym_Text_ItsFreeLetsGetHappening"));
        await say(T("PewterCity_Gym_Text_TryDifferentPartyOrders"));
        return;

      case "PewterCity_Gym_EventScript_GymStatue":
        await say(T(hasBadge("boulder") ? "PewterCity_Gym_Text_GymStatuePlayerWon" : "PewterCity_Gym_Text_GymStatue"));
        return;

      case "PewterCity_Mart_EventScript_Clerk":
        await mart(ev.person.mart);
        return;

      // ---------- Cerulean City ----------

      case "CeruleanCity_Gym_EventScript_GymGuy":
        await say(T(f.TRAINER_LEADER_MISTY ? "CeruleanCity_Gym_Text_WeMakePrettyGoodTeam" : "CeruleanCity_Gym_Text_GymGuyAdvice"));
        return;
      case "CeruleanCity_Gym_EventScript_GymStatue":
        await say(T(hasBadge("cascade") ? "CeruleanCity_Gym_Text_GymStatuePlayerWon" : "CeruleanCity_Gym_Text_GymStatue"));
        return;
      case "CeruleanCity_Mart_EventScript_Clerk":
        await mart(ev.person.mart);
        return;
      // The Badge guy: which of the eight Badges should he describe?
      case "CeruleanCity_House1_EventScript_BadgeGuy": {
        await say(T("CeruleanCity_House1_Text_BadgesHaveAmazingSecrets"));
        const BADGES = [["Boulder", "AttackStatFlash"], ["Cascade", "ObeyLv30Cut"], ["Thunder", "SpeedStatFly"],
          ["Rainbow", "ObeyLv50Strength"], ["Soul", "DefenseStatSurf"], ["Marsh", "ObeyLv70RockSmash"],
          ["Volcano", "SpStatsWaterfall"], ["Earth", "AllMonsWillObeyYou"]];
        const which = T("CeruleanCity_House1_Text_DescribeWhichBadge");
        await say(which.slice(0, -1));
        for (;;) {
          const v = await ask(which[which.length - 1], BADGES.map(([b], i) => ({ label: b + " Badge", value: i }))
            .concat([{ label: "Cancel", value: "back", className: "action", wide: true }]));
          if (v === "back") break;
          await say(T("CeruleanCity_House1_Text_" + BADGES[v][1]));
        }
        await say(T("CeruleanCity_House1_Text_ComeVisitAnytime"));
        return;
      }
      case "CeruleanCity_House3_EventScript_Dontae":
        await inGameTrade(TRADES.zynx);
        return;
      // The Bike Shop: a Bicycle is ¥1,000,000 (and FireRed never sells you one).
      case "CeruleanCity_BikeShop_EventScript_Clerk": {
        if (f.gotBicycle) { await say(T("CeruleanCity_BikeShop_Text_HowDoYouLikeNewBicycle")); return; }
        // With the Fan Club Chairman's Bike Voucher, it's free.
        if (Player.itemCount(player, "bike-voucher")) {
          await say(T("CeruleanCity_BikeShop_Text_OhBikeVoucherHereYouGo"));
          Player.removeItem(player, "bike-voucher");
          Player.addItem(player, "bicycle");
          f.gotBicycle = true;
          await sayWithJingle("mus_obtain_key_item", T("CeruleanCity_BikeShop_Text_ExchangedVoucherForBicycle"));
          await say(T("CeruleanCity_BikeShop_Text_ThankYouComeAgain"));
          return;
        }
        await say(T("CeruleanCity_BikeShop_Text_WelcomeToBikeShop"));
        const v = await ask("", [{ label: "Bicycle  ¥1,000,000", value: "bike", className: "action", wide: true },
          { label: "Cancel", value: "back", className: "action", wide: true }]);
        if (v === "bike") await say(T("CeruleanCity_BikeShop_Text_SorryYouCantAffordIt"));
        await say(T("CeruleanCity_BikeShop_Text_ThankYouComeAgain"));
        return;
      }
      case "CeruleanCity_House5_EventScript_BerryPowderMan": await berryPowderMan(); return;
      case "CeruleanCity_House5_EventScript_BerryCrushRankings":
        await berryCrushRankings();
        return;

      case "PewterCity_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;

      case "MysteryEventClub_EventScript_Woman":   // no Mystery Events here
        await say(T("Text_WirelessClubUndergoingAdjustments"));
        return;

      // ---------- Route 4 and Mt. Moon ----------

      case "Route4_EventScript_MegaPunchTutor":
        await moveTutor("Mega Punch", "tutorMegaPunch", "Text_MegaPunch");
        return;
      case "Route4_EventScript_MegaKickTutor":
        await moveTutor("Mega Kick", "tutorMegaKick", "Text_MegaKick");
        return;

      case "Route4_PokemonCenter_1F_EventScript_Nurse":
      case "Route10_PokemonCenter_1F_EventScript_Nurse":
      case "LavenderTown_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;

      // ₽500 for a Magikarp, once.
      case "Route4_PokemonCenter_1F_EventScript_MagikarpSalesman": {
        if (f.boughtMagikarp) { await say(T("Route4_PokemonCenter_1F_Text_IDontGiveRefunds")); return; }
        const pitch = T(Player.LOOKS[player.look].girl ? "Route4_PokemonCenter_1F_Text_SweetieBuyMagikarpForJust500" : "Route4_PokemonCenter_1F_Text_LaddieBuyMagikarpForJust500");
        await say(pitch.slice(0, -1));
        if (!(await confirm(fill(pitch[pitch.length - 1]) + "\n(You have " + money(player.money) + ".)"))) { await say(T("Route4_PokemonCenter_1F_Text_OnlyDoingThisAsFavorToYou")); return; }
        if (player.money < 500) { await say(T("Route4_PokemonCenter_1F_Text_YoullNeedMoreMoney")); return; }
        if (player.party.length >= Player.PARTY_SIZE && !player.boxes.some((b) => Player.firstEmpty(b) >= 0)) { await say(T("Route4_PokemonCenter_1F_Text_NoRoomForMorePokemon")); return; }
        Player.addMoney(player, -500);
        f.boughtMagikarp = true;
        await say(T("Route4_PokemonCenter_1F_Text_PaidOutrageouslyForMagikarp"));
        await addCaught(Party.create("Magikarp", 5));
        return;
      }

      // ---------- Cerulean City, Routes 24 and 25 ----------
      case "CeruleanCity_EventScript_RivalTriggerLeft":
      case "CeruleanCity_EventScript_RivalTriggerMid":
      case "CeruleanCity_EventScript_RivalTriggerRight":
        if (!f.ceruleanRival && canBattle()) await ceruleanRival(script.replace("CeruleanCity_EventScript_RivalTrigger", ""));
        return;
      case "CeruleanCity_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;
      case "Route24_EventScript_Rocket":
        if (f.nuggetBridgeRocket) await say(T("Route24_Text_YoudBecomeTopRocketLeader"));
        else await nuggetBridgeRocket(null);
        return;
      case "Route24_EventScript_RocketTriggerLeft":
      case "Route24_EventScript_RocketTriggerRight":
        if (!f.nuggetBridgeRocket && canBattle()) await nuggetBridgeRocket(/Left$/.test(script) ? "left" : "right");
        return;
      case "Route25_SeaCottage_EventScript_Bill":
        await bill(ev.person);
        return;
      case "Route25_SeaCottage_EventScript_Computer":
        await billsComputer();
        return;

      // ---------- Cerulean's robbed house, Routes 5 and 9 ----------
      case "CeruleanCity_EventScript_Grunt":
        await ceruleanGrunt(null);
        return;
      case "CeruleanCity_EventScript_GruntTriggerTop":
      case "CeruleanCity_EventScript_GruntTriggerBottom":
        if (!f.gotTM28 && canBattle()) await ceruleanGrunt(/Top$/.test(script) ? "top" : "bottom");
        return;
      case "EventScript_CutTree":
        await cutTree(ev.person);
        return;
      case "EventScript_RockSmash":
        await rockSmash(ev.person);
        return;
      case "EventScript_StrengthBoulder":
        await strengthBoulder();
        return;
      case "Route5_PokemonDayCare_EventScript_DaycareMan":
        await dayCareMan();
        return;
      case "UndergroundPath_NorthEntrance_EventScript_Saige":
        await inGameTrade(TRADES.msNido);
        return;
      // ---------- Pokémon Tower ----------
      case "PokemonTower_2F_EventScript_RivalTriggerRight":
      case "PokemonTower_2F_EventScript_RivalTriggerDown":
        await towerRival(script.endsWith("Right"));
        return;
      // 5F: the purified zone heals your party (each time you step back in).
      case "PokemonTower_5F_EventScript_PurifiedZone":
        inPurifiedZone = true;
        Screen.say("");
        await Overworld.fadeToBlack();
        player.party.forEach(Party.heal);
        await Overworld.fadeFromBlack();
        await say(T("PokemonTower_5F_Text_PurifiedZoneMonsFullyHealed"));
        return;
      case "PokemonTower_6F_EventScript_MarowakGhost":
        await marowakGhost();
        return;
      case "PokemonTower_7F_EventScript_MrFuji":
        await say(T("PokemonTower_7F_Text_MrFujiThankYouFollowMe"));
        f.rescuedMrFuji = true;
        await Overworld.teleport({ map: "LavenderTown_VolunteerPokemonHouse", x: 4, y: 7, facing: "up" });
        return;
      // Back home, Mr. Fuji gives you the Poké Flute.
      case "LavenderTown_VolunteerPokemonHouse_EventScript_MrFuji": {
        const V = (k) => T("LavenderTown_VolunteerPokemonHouse_Text_" + k);
        if (f.gotPokeFlute) { await say(V("HasPokeFluteHelpedYou")); return; }
        await say(V("IdLikeYouToHaveThis"));
        Player.addItem(player, "poke-flute");
        f.gotPokeFlute = true;
        await sayWithJingle("mus_obtain_key_item", V("ReceivedPokeFluteFromMrFuji"));
        await say(V("ExplainPokeFlute"));
        return;
      }


      // ---------- Route 7 and the Saffron gates ----------
      // The guards are thirsty: give one the Tea and all four let you through
      // (FireRed's VAR_MAP_SCENE_ROUTE5_ROUTE6_ROUTE7_ROUTE8_GATES).
      case "Route5_SouthEntrance_EventScript_GuardTriggerLeft":
      case "Route5_SouthEntrance_EventScript_GuardTriggerMid":
      case "Route5_SouthEntrance_EventScript_GuardTriggerRight":
      case "Route6_NorthEntrance_EventScript_GuardTriggerLeft":
      case "Route6_NorthEntrance_EventScript_GuardTriggerMid":
      case "Route6_NorthEntrance_EventScript_GuardTriggerRight":
      case "Route7_EastEntrance_EventScript_GuardTriggerTop":
      case "Route7_EastEntrance_EventScript_GuardTriggerMid":
      case "Route7_EastEntrance_EventScript_GuardTriggerBottom":
      case "Route8_WestEntrance_EventScript_GuardTriggerTop":
      case "Route8_WestEntrance_EventScript_GuardTriggerMid":
      case "Route8_WestEntrance_EventScript_GuardTriggerBottom": {
        const [, gate, side] = /^(\w+?)_EventScript_GuardTrigger(\w+)$/.exec(script);
        const face = { Route5_SouthEntrance: "Left", Route6_NorthEntrance: "Right", Route7_EastEntrance: "Up", Route8_WestEntrance: "Up" }[gate];
        await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFaster" + face) }]);
        if (f.gotTea && Player.itemCount(player, "tea")) {
          Player.removeItem(player, "tea");
          await say(T(gate + "_Text_ThatTeaLooksTasty"));
          await Overworld.act([{ who: "player", moves: M(gate + "_Movement_WalkToGuard" + side) }]);
          await say(T(gate + "_Text_ThanksIllShareTeaWithGuards"));
          f.gatesOpen = true;
          return;
        }
        await say(T(gate + "_Text_ThirstyOnGuardDuty"));
        await Overworld.act([{ who: "player", moves: M(gate + "_Movement_BlockPlayerEntry") }]);
        return;
      }

      // ---------- Celadon City ----------
      case "CeladonCity_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;
      case "CeladonCity_DepartmentStore_2F_EventScript_ClerkItems":
      case "CeladonCity_DepartmentStore_2F_EventScript_ClerkTMs":
      case "CeladonCity_DepartmentStore_4F_EventScript_Clerk":
      case "CeladonCity_DepartmentStore_5F_EventScript_ClerkXItems":
        await mart(ev.person.mart);
        return;
      // (Beside the vitamins, this game's Wings.)
      case "CeladonCity_DepartmentStore_5F_EventScript_ClerkVitamins":
        await mart(ev.person.mart.concat(["health-wing", "muscle-wing", "resist-wing", "genius-wing", "clever-wing", "swift-wing"]));
        return;
      case "CeladonCity_EventScript_SoftboiledTutor":
        await moveTutor("Soft-Boiled", "tutorSoftboiled", "Text_Softboiled");
        return;
      case "CeladonCity_DepartmentStore_3F_EventScript_CounterTutor":
        await moveTutor("Counter", "tutorCounter", "Text_Counter");
        return;
      case "CeladonCity_EventScript_Poliwrath":
      case "CeladonCity_Condominiums_1F_EventScript_Meowth":
      case "CeladonCity_Condominiums_1F_EventScript_Clefairy":
        cry(/_EventScript_(\w+)$/.exec(script)[1]);
        await say(ev.person.text || []);
        return;
      case "CeladonCity_Condominiums_1F_EventScript_Nidoran":
        cry("Nidoran-F");
        await say(ev.person.text || []);
        return;
      case "CeladonCity_DepartmentStore_Elevator_EventScript_FloorSelect":
        await elevator(["5F", "4F", "3F", "2F", "1F"].map((n) => ({ label: n, map: "CeladonCity_DepartmentStore_" + n, x: 6, y: 1 })));
        return;
      // The little girl on the roof swaps a TM for a drink she hasn't had.
      case "CeladonCity_DepartmentStore_Roof_EventScript_ThirstyGirl":
        await thirstyGirl();
        return;
      case "CeladonCity_DepartmentStore_Roof_EventScript_VendingMachine":
        await vendingMachine();
        return;
      case "CeladonCity_Condominiums_1F_EventScript_TeaWoman":
        if (f.gotTea) { await say(T("CeladonCity_Condominiums_1F_Text_MyDearMonsKeepMeCompany")); return; }
        await say(T("CeladonCity_Condominiums_1F_Text_TryThisDrinkInstead"));
        Player.addItem(player, "tea");
        f.gotTea = true;
        await sayWithJingle("mus_obtain_key_item", "{PLAYER} received the Tea.");
        await say(T("CeladonCity_Condominiums_1F_Text_NothingBeatsThirstLikeTea"));
        return;
      // The game designer: a diploma for a complete Kanto Pokédex (Mew aside).
      case "CeladonCity_Condominiums_3F_EventScript_Designer": {
        const caught = new Set(player.pokedex.caught.map((s) => (window.DEX[s] || {}).id));
        if (!Array.from({ length: 150 }, (_, i) => i + 1).every((id) => caught.has(id))) {
          await say(T("CeladonCity_Condominiums_3F_Text_ImGameDesignerShowMeFinishedPokedex"));
          return;
        }
        await say(T("CeladonCity_Condominiums_3F_Text_CompletedPokedexCongratulations"));
        await say(["Diploma", "{PLAYER}\nCongratulations! This diploma\ncertifies that you have completed\nyour Pokédex.", "Game Freak"]);
        return;
      }
      case "CeladonCity_Condominiums_RoofRoom_EventScript_EeveeBall":
        await giftMon("Eevee", 25, T("CeladonCity_Condominiums_RoofRoom_Text_ObtainedAnEevee"), null, () => {
          Overworld.removePerson(ev.person);
          f.gotEevee = true;
        });
        return;
      case "CeladonCity_Condominiums_RoofRoom_EventScript_Blackboard": {
        const R = (k) => T("CeladonCity_Condominiums_RoofRoom_Text_" + k);
        await say(R("WirelessAdapterLecture"));
        // (MULTICHOICE_LINKED_DIRECT_UNION: LINKED GAME PLAY / DIRECT CORNER / UNION ROOM / QUIT.)
        for (;;) {
          const v = await multichoice(R("ReadWhichHeading")[0], 0, 0, ["Linked Game Play", "Direct Corner", "Union Room", "Quit"]);
          if (v < 0 || v > 2) break;
          await say(R(["ExplainWirelessClub", "ExplainDirectCorner", "ExplainUnionRoom"][v]));
        }
        Screen.say("");
        return;
      }
      case "CeladonCity_Restaurant_EventScript_CoinCaseMan":
        if (f.gotCoinCase) { await say(T("CeladonCity_Restaurant_Text_ThoughtIdWinItBack")); return; }
        await say(T("CeladonCity_Restaurant_Text_TakeThisImBusted"));
        Player.addItem(player, "coin-case");
        f.gotCoinCase = true;
        await sayWithJingle("mus_obtain_key_item", T("CeladonCity_Restaurant_Text_ReceivedCoinCaseFromMan"));
        return;
      case "CeladonCity_Gym_EventScript_GymStatue":
        await say(T(hasBadge("rainbow") ? "CeladonCity_Gym_Text_GymStatuePlayerWon" : "CeladonCity_Gym_Text_GymStatue"));
        return;

      // ---------- Celadon Game Corner ----------
      case "CeladonCity_GameCorner_EventScript_CoinsClerk":
        await coinsClerk();
        return;
      // Three gamblers give you a few Coins, once each.
      case "CeladonCity_GameCorner_EventScript_Fisher":
        await gambler(ev.person, { flag: "got10CoinsFromGambler", coins: 10, ask: "DoYouWantToPlay", got: "Received10CoinsFromMan",
          full: "DontNeedMyCoins", after: "WinsComeAndGo" });
        return;
      case "CeladonCity_GameCorner_EventScript_Scientist":
        await gambler(ev.person, { flag: "got20CoinsFromGambler", coins: 20, ask: "WantSomeCoins", got: "Received20CoinsFromNiceGuy",
          full: "YouHaveLotsOfCoins", after: "NeedMoreCoinsForMonIWant" });
        return;
      case "CeladonCity_GameCorner_EventScript_Gentleman":
        await gambler(ev.person, { flag: "got20CoinsFromGambler2", coins: 20, ask: "HereAreSomeCoinsShoo", got: "Received20CoinsFromMan",
          full: "YouveGotPlentyCoins", after: "WatchReelsClosely" });
        return;
      case "CeladonCity_GameCorner_EventScript_GymGuy":
        await say(T(f.TRAINER_LEADER_ERIKA ? "CeladonCity_GameCorner_Text_RareMonsForCoins" : "CeladonCity_GameCorner_Text_GymGuyAdvice"));
        await faceBack(ev.person);
        return;
      case "CeladonCity_GameCorner_EventScript_BaldingMan":
      case "CeladonCity_GameCorner_EventScript_Woman1":
      case "CeladonCity_GameCorner_EventScript_Woman2":
      case "CeladonCity_GameCorner_EventScript_OldMan":
        await say(ev.person.text || []);
        await faceBack(ev.person);
        return;
      case "CeladonCity_GameCorner_EventScript_Poster":
        await say(T("CeladonCity_GameCorner_Text_SwitchBehindPosterPushIt"));
        if (!f.openedRocketHideout) {
          sfx("se_unlock");
          f.openedRocketHideout = true;
          applyPatches("CeladonCity_GameCorner");
        }
        return;
      case "CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerkMons":
      case "CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerkTMs":
      case "CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerkItems":
        await prizeClerk(script.replace("CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerk", ""));
        return;

      // ---------- Rocket Hideout ----------
      case "RocketHideout_Elevator_EventScript_FloorSelect":
        if (!Player.itemCount(player, "lift-key")) { await say(T("RocketHideout_Elevator_Text_AppearsToNeedAKey")); return; }
        await elevator([{ label: "B1F", map: "RocketHideout_B1F", x: 24, y: 25 }, { label: "B2F", map: "RocketHideout_B2F", x: 28, y: 16 },
          { label: "B4F", map: "RocketHideout_B4F", x: 20, y: 23 }]);
        return;
      case "RocketHideout_B4F_EventScript_Giovanni":
        await giovanniHideout(ev.person);
        return;
      case "RocketHideout_B4F_EventScript_LiftKey":
      case "RocketHideout_B4F_EventScript_SilphScope": {
        const item = script.endsWith("LiftKey") ? "lift-key" : "silph-scope";
        Overworld.removePerson(ev.person);
        Player.addItem(player, item);
        f[item === "lift-key" ? "gotLiftKey" : "gotSilphScope"] = true;
        await sayWithJingle("mus_obtain_key_item", "{PLAYER} found a " + Bag.name(item) + "!");
        return;
      }

      // ---------- Saffron City ----------
      case "SaffronCity_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;
      case "SaffronCity_Mart_EventScript_Clerk":
        await mart(ev.person.mart);
        return;
      case "SaffronCity_EventScript_Pidgeot":
      case "SaffronCity_House_EventScript_Pidgey":
      case "SaffronCity_CopycatsHouse_1F_EventScript_Chansey":
      case "SaffronCity_CopycatsHouse_2F_EventScript_Doduo":
        cry(/_EventScript_(\w+)$/.exec(script)[1]);
        await say(ev.person.text || []);
        return;
      // Silph Co.'s "security guard": asleep once Mr. Fuji's safe.
      case "SaffronCity_EventScript_DoorGuardGrunt":
        if (!f.rescuedMrFuji) { await say(T("SaffronCity_Text_ImASecurityGuard")); return; }
        await faceBack(ev.person);
        await say(T("SaffronCity_Text_HesTakingASnooze"));
        return;
      // The Copycat mimics you, unless you've a Poké Doll for her: then she
      // teaches Mimic (FireRed's EventScript_MimicTutor); after that, again
      // and again for money.
      case "SaffronCity_CopycatsHouse_2F_EventScript_Copycat": {
        const girl = !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl);
        if (!f.tutorMimic && !Player.itemCount(player, "poke-doll")) {
          await say(T(girl ? "SaffronCity_CopycatsHouse_2F_Text_MimickingFavoriteHobbyFemale" : "SaffronCity_CopycatsHouse_2F_Text_MimickingFavoriteHobbyMale"));
          return;
        }
        // (The first time for a Poké Doll; after that, for money, as the other tutors.)
        const doll = !f.tutorMimic;
        if (await moveTutor("Mimic", "tutorMimic", "Text_Mimic", doll ? null : undefined, girl ? "Text_MimicTaughtFemale" : "Text_MimicTaughtMale") && doll) {
          Player.removeItem(player, "poke-doll");
        }
        return;
      }
      // Mr. Psychic: FireRed's TM29, Psychic (the TM with that move here).
      case "SaffronCity_MrPsychicsHouse_EventScript_MrPsychic": {
        const tm = machineFor("Psychic");
        if (!f.gotTM29) {
          await say(T("SaffronCity_MrPsychicsHouse_Text_YouWantedThis"));
          Player.addItem(player, tm);
          f.gotTM29 = true;
          await sayWithJingle(itemJingle(tm), tmText(T("SaffronCity_MrPsychicsHouse_Text_ReceivedTM29FromMrPsychic"), 29, tm));
          await say(tmText(T("SaffronCity_MrPsychicsHouse_Text_ExplainTM29"), 29, tm));
          // (This game's own: his back room, and the Tera Raid den in it.)
          await say(["And I sensed you'd want this, too…", "The door behind me leads to my back\nroom. A Tera Raid den sleeps there.",
            "Use a Lure on it, and a Tera\nPsychic-type Pokémon will rise.", "Go on in, as often as you like."]);
          Screen.say("");
          sfx("se_rs_door");
          applyPatches("SaffronCity_MrPsychicsHouse");
          await persist();
          return;
        }
        await say(tmText(T("SaffronCity_MrPsychicsHouse_Text_ExplainTM29"), 29, tm));
        await say(["My back room's Tera Raid den…\nI sense it awaits your Lure."]);
        return;
      }
      case "SaffronCity_Gym_EventScript_GymGuy":
        await say(T(f.TRAINER_LEADER_SABRINA ? "SaffronCity_Gym_Text_GymGuyPostVictory" : "SaffronCity_Gym_Text_GymGuyAdvice"));
        return;
      case "SaffronCity_Gym_EventScript_GymStatue":
        await say(T(hasBadge("marsh") ? "SaffronCity_Gym_Text_GymStatuePlayerWon" : "SaffronCity_Gym_Text_GymStatue"));
        return;
      // The Fighting Dojo: walk up beside the Karate Master and he turns to
      // face you, and fights; beaten, he lets you take one of his two prized
      // Pokémon.
      case "SaffronCity_Dojo_EventScript_TriggerMasterBattleLeft":
      case "SaffronCity_Dojo_EventScript_TriggerMasterBattleRight": {
        const master = window.WORLD_MAPS.SaffronCity_Dojo.people.find((p) => p.localId === "LOCALID_KARATE_MASTER");
        await Overworld.act([{ who: "LOCALID_KARATE_MASTER", moves: M(script.endsWith("Left") ? "Common_Movement_WalkInPlaceFasterLeft" : "Common_Movement_WalkInPlaceFasterRight") }]);
        await Overworld.act([{ who: "player", moves: [script.endsWith("Left") ? "face_right" : "face_left"] }]);
        await trainerBattle(master, null);
        await dojoDenDoor();
        return;
      }
      case "SaffronCity_Dojo_EventScript_HitmonleeBall":
      case "SaffronCity_Dojo_EventScript_HitmonchanBall":
        await dojoBall(ev.person, script.includes("Hitmonlee") ? "Hitmonlee" : "Hitmonchan");
        return;
      // The Fan Club, before you're Champion: everyone's a fan of someone else.
      case "SaffronCity_PokemonTrainerFanClub_EventScript_CrushGirl":
        await say(T("SaffronCity_PokemonTrainerFanClub_Text_TrainersCoolWhenBattling"));
        return;
      case "SaffronCity_PokemonTrainerFanClub_EventScript_LittleGirl":
        await say(T("SaffronCity_PokemonTrainerFanClub_Text_CanIBecomeCoolTrainerOneDay"));
        return;
      case "SaffronCity_PokemonTrainerFanClub_EventScript_Youngster":
        await say(T("SaffronCity_PokemonTrainerFanClub_Text_BrocksLastWordOnCool"));
        return;
      case "SaffronCity_PokemonTrainerFanClub_EventScript_Gentleman":
        await say(T("SaffronCity_PokemonTrainerFanClub_Text_YoullBeTalkedAboutIfYouKeepWinning"));
        return;

      // ---------- Silph Co. ----------
      case "SilphCo_Elevator_EventScript_FloorSelect":
        await elevator(SILPH_FLOORS.map(([label, x]) => ({ label, map: "SilphCo_" + label, x, y: 3 })), true);
        return;
      case "SilphCo_2F_EventScript_ThunderWaveTutor":
        await moveTutor("Thunder Wave", "tutorThunderWave", "Text_ThunderWave");
        return;
      case "SilphCo_7F_EventScript_RivalTriggerTop":
      case "SilphCo_7F_EventScript_RivalTriggerBottom":
        await silphRival(script.endsWith("Top"));
        return;
      // A Lapras, from the worker you rescue on 7F.
      case "SilphCo_7F_EventScript_LaprasGuy":
        if (f.gotLapras) { await say(T("SilphCo_7F_Text_RocketBossWentToBoardroom")); return; }
        await say(T("SilphCo_7F_Text_HaveMonForSavingUs"));
        if (await giftMon("Lapras", 25, T("SilphCo_7F_Text_ObtainedLaprasFromEmployee"), null, () => { f.gotLapras = true; })) {
          await say(T("SilphCo_7F_Text_ExplainLapras"));
        }
        return;
      // 9F: a nap on the bed while Team Rocket's about.
      case "SilphCo_9F_EventScript_HealWoman":
        if (silphFreed()) { await say(T("SilphCo_9F_Text_ThankYouSoMuch")); return; }
        await say(T("SilphCo_9F_Text_YouShouldTakeQuickNap"));
        await outOfCenterHeal();
        await say(T("SilphCo_9F_Text_DontGiveUp"));
        return;
      case "SilphCo_11F_EventScript_GiovanniTriggerLeft":
      case "SilphCo_11F_EventScript_GiovanniTriggerRight":
        await giovanniSilph(script.endsWith("Left"));
        return;
      // The President's thanks: the Master Ball.
      case "SilphCo_11F_EventScript_President": {
        if (f.gotMasterBall) { await say(T("SilphCo_11F_Text_ThatsOurSecretPrototype")); return; }
        const girl = !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl);
        await say(T(girl ? "SilphCo_11F_Text_ThanksForSavingMeDearGirl" : "SilphCo_11F_Text_ThanksForSavingMeDearBoy"));
        Player.addItem(player, "master-ball");
        f.gotMasterBall = true;
        await sayWithJingle("mus_obtain_key_item", T("SilphCo_11F_Text_ObtainedMasterBallFromPresident"));
        await say(T("SilphCo_11F_Text_ThatsOurSecretPrototype"));
        return;
      }

      // ---------- Route 12 to Route 15 ----------
      case "Route12_EventScript_Snorlax":
        await snorlax(ev.person, 12);
        return;
      // The girl upstairs in the gate: FireRed's TM27 (Return).
      case "Route12_NorthEntrance_2F_EventScript_Lass": {
        const tm = machineFor("Return"), L = (k) => T("Route12_NorthEntrance_2F_Text_" + k);
        if (!f.gotTM27) {
          await say(L(isGirl() ? "TakeTMDontNeedAnymoreFemale" : "TakeTMDontNeedAnymoreMale"));
          Player.addItem(player, tm);
          f.gotTM27 = true;
          await sayWithJingle(itemJingle(tm), tmText(L("ReceivedTM27FromLittleGirl"), 27, tm));
        }
        await say(tmText(L("ExplainTM27"), 27, tm));
        return;
      }
      // The Fishing Guru's brother: (FireRed's Super Rod) the Fishing Rod if you
      // haven't one, and his request; then the Magikarp record.
      case "Route12_FishingHouse_EventScript_FishingGuruBrother":
        if (f.gotSuperRod) { await magikarpRecord(); return; }
        if (!hasFishingRod()) {
          if (await rodGift("Route12_FishingHouse_Text_", "TakeThisAndFish", "IfYouCatchBigMagikarpShowMe")) f.gotSuperRod = true;
          return;
        }
        await say(fishingLevelTalk("Route12"));
        await say(T("Route12_FishingHouse_Text_IfYouCatchBigMagikarpShowMe").slice(2));
        f.gotSuperRod = true;
        return;
      case "Route12_FishingHouse_EventScript_MagikarpRecordSign":
        await say(f.magikarpRecord != null ? T("Route12_FishingHouse_Text_MostGiganticMagikarpXInches")
          : T("Route12_FishingHouse_Text_BlankChartOfSomeSort"), [null, null, f.magikarpRecord != null ? magikarpInches(f.magikarpRecord) : ""]);
        return;
      // Prof. Oak's Aide in Route 15's gate: the Exp. Share for fifty kinds caught.
      case "Route15_WestEntrance_2F_EventScript_Aide":
        await aideGift({ needed: 50, item: "exp-share", flag: "gotExpShareFromAide", text: "Route15_WestEntrance_2F_Text_",
          ask: "GiveItemIfCaughtEnough", received: "ReceivedItemFromAide", explain: "ExplainExpShare" });
        return;
      // The binoculars: a large, shining bird (Articuno, seen in the Pokédex).
      case "Route15_WestEntrance_2F_EventScript_LeftBinoculars":
        await monSign("Articuno", T("Route15_WestEntrance_2F_Text_LargeShiningBird"));
        return;

      // ---------- Routes 16, 17 and 18: Cycling Road ----------
      case "Route16_EventScript_Snorlax":
        await snorlax(ev.person, 16);
        return;
      // Prof. Oak's Aide upstairs in Route 16's gate: the Amulet Coin for forty kinds caught.
      case "Route16_NorthEntrance_2F_EventScript_Aide":
        await aideGift({ needed: 40, item: "amulet-coin", flag: "gotAmuletCoinFromAide", text: "Route16_NorthEntrance_2F_Text_",
          ask: "GiveAmuletCoinIfCaught40", received: "ReceivedAmuletCoinFromAide", explain: "ExplainAmuletCoin" });
        return;
      // The girl in her secret retreat behind the tree: HM02 Fly.
      case "Route16_House_EventScript_Woman":
        if (!f.gotHM02) {
          await say(T("Route16_House_Text_FoundMySecretRetreat"));
          Player.addItem(player, "hm02");
          f.gotHM02 = true;
          await sayWithJingle(itemJingle("hm02"), T("Route16_House_Text_ReceivedHM02FromGirl"));
        }
        await say(T("Route16_House_Text_ExplainHM02"));
        return;
      case "Route16_House_EventScript_Fearow":
        cry("Fearow");
        await say(T("Route16_House_Text_Fearow"));
        return;
      // The Cycling Road gates: without a Bicycle, the guard calls you back
      // to the counter and turns you away.
      case "Route16_NorthEntrance_1F_EventScript_NeedBikeTriggerTop":
      case "Route16_NorthEntrance_1F_EventScript_NeedBikeTriggerMidTop":
      case "Route16_NorthEntrance_1F_EventScript_NeedBikeTriggerMid":
      case "Route16_NorthEntrance_1F_EventScript_NeedBikeTriggerMidBottom":
      case "Route16_NorthEntrance_1F_EventScript_NeedBikeTriggerBottom":
      case "Route18_EastEntrance_1F_EventScript_NeedBikeTriggerTop":
      case "Route18_EastEntrance_1F_EventScript_NeedBikeTriggerMidTop":
      case "Route18_EastEntrance_1F_EventScript_NeedBikeTriggerMid":
      case "Route18_EastEntrance_1F_EventScript_NeedBikeTriggerMidBottom":
      case "Route18_EastEntrance_1F_EventScript_NeedBikeTriggerBottom":
        await needBike(script);
        return;
      // Upstairs in Route 18's gate, Haden trades his Lickitung, Marc, for a Golduck.
      case "Route18_EastEntrance_2F_EventScript_Haden":
        await inGameTrade(TRADES.marc);
        return;

      // ---------- The Seafoam Islands ----------
      // Fallen through a hole onto B3F's or B4F's water: the current may carry you off.
      case "enter:SeafoamIslands_B3F":
      case "enter:SeafoamIslands_B4F":
        await seafoamFall(ev.map);
        return;
      case "SeafoamIslands_B4F_EventScript_Articuno":
        await legendaryBird(ev.person, "Articuno", "foughtArticuno");
        return;

      // ---------- The Sevii Islands ----------
      case "enter:CinnabarIsland": case "arrive:CinnabarIsland":
        if (f.cinnabarScene === 1) await cinnabarBill();
        return;
      case "CinnabarIsland_PokemonCenter_1F_EventScript_Bill": await cinnabarCenterBill(ev.person); return;
      // The Seagallop: Vermilion's dock and the islands' harbors.
      case "VermilionCity_EventScript_FerrySailor":
        if (!f.ssAnneDeparted) { await say(T("VermilionCity_Text_WelcomeToTheSSAnne")); return; }
        await vermilionSeagallop(Overworld.position().x < 24);
        return;
      case "OneIsland_Harbor_EventScript_Sailor": await harborSailor("ONE_ISLAND"); return;
      case "TwoIsland_Harbor_EventScript_Sailor": await harborSailor("TWO_ISLAND"); return;
      case "ThreeIsland_Harbor_EventScript_Sailor": await harborSailor("THREE_ISLAND"); return;
      case "OneIsland_PokemonCenter_1F_EventScript_Nurse": case "TwoIsland_PokemonCenter_1F_EventScript_Nurse":
      case "ThreeIsland_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;
      case "enter:OneIsland_PokemonCenter_1F": await meetCelio(); return;
      case "enter:OneIsland": await billToCelio(); return;
      case "OneIsland_PokemonCenter_1F_EventScript_Celio": await celio(); return;
      case "OneIsland_PokemonCenter_1F_EventScript_Bill": await oneIslandCenterBill(); return;
      case "OneIsland_PokemonCenter_1F_EventScript_NetworkMachine": await networkMachine(); return;
      case "OneIsland_PokemonCenter_1F_EventScript_CrushGirl":
        await say(T(f.canLinkWithRS ? "OneIsland_PokemonCenter_1F_Text_TradedWithFarAwayBoyfriend" : "OneIsland_PokemonCenter_1F_Text_WishICouldTradeWithBoyfriend"));
        return;
      case "OneIsland_EventScript_OldMan":
        await say(T(f.canLinkWithRS ? "OneIsland_Text_HavePCLinkageWithHoenn" : f.seviiDetourDone ? "OneIsland_Text_HavePCLinkageWithKanto" : "OneIsland_Text_LuckyToHaveCelioHere"));
        return;
      case "OneIsland_PokemonCenter_1F_EventScript_LeaveOneIslandTriggerTop": await leaveOneIsland(1); return;
      case "OneIsland_PokemonCenter_1F_EventScript_LeaveOneIslandTriggerMidTop": await leaveOneIsland(2); return;
      case "OneIsland_PokemonCenter_1F_EventScript_LeaveOneIslandTriggerMidBottom": await leaveOneIsland(3); return;
      case "OneIsland_PokemonCenter_1F_EventScript_LeaveOneIslandTriggerBottom": await leaveOneIsland(4); return;
      // The Ember Spa: the man who made it with Rock Smash gives you the HM
      // (FireRed's HM06; HM08 here); the hot spring heals.
      case "OneIsland_KindleRoad_EmberSpa_EventScript_RockSmashMan": {
        const E = (k) => T("OneIsland_KindleRoad_EmberSpa_Text_" + k), hm = FieldMoves.hmFor("Rock Smash");
        if (!f.gotHM06) {
          await say(E("UsedThisToMakeEmberSpa"));
          Player.addItem(player, hm);
          f.gotHM06 = true;
          await sayWithJingle(itemJingle(hm), "{PLAYER} received " + Bag.name(hm) + "!");
        }
        await say(E("ExplainHM06").map((p) => p.replace(/HM06/g, Bag.name(hm).split(" ")[0])));
        return;
      }
      case "OneIsland_KindleRoad_EmberSpa_EventScript_SpaHeal": await emberSpa(); return;
      case "MtEmber_Exterior_EventScript_ExplosionTutor": await moveTutor("Explosion", "tutorExplosion", "Text_Explosion"); return;
      case "MtEmber_Exterior_EventScript_RocketPasswordScene": await emberPassword(); return;
      case "MtEmber_Exterior_EventScript_Grunt1": await emberGrunt(1); return;
      case "MtEmber_Exterior_EventScript_Grunt2": await emberGrunt(2); return;
      case "MtEmber_Summit_EventScript_Moltres": await legendaryBird(ev.person, "Moltres", "foughtMoltres"); return;
      // ---------- Cerulean Cave ----------
      // ---------- Faraway Island ----------
      // ---------- Orre ----------
      case "enter:OutskirtStand": await willieChallenge(); return;
      case "OutskirtStand_Diner_EventScript_Bartender": await orreBartender(); return;
      case "arrive:OutskirtStand": case "enter:OutskirtStand": if (!(f.orre | 0)) await orreArrival(); return;
      case "OrreAirStrip_EventScript_Pilot": await orrePilot(); return;
      case "Orre_WorldMap": await orreTravel(); return;
      case "SnagemHideout_EventScript_Guard1": case "SnagemHideout_EventScript_Guard2": await snagemGuard(ev.person); return;
      case "PhenacCity_EventScript_Kodo": await phenacKodo(); return;
      case "OutskirtStand_Diner_EventScript_Willie":
        await say(["Willie: That bike out front yours?\nShe's a beauty.",
          "And those two Pokémon of yours… Tell you\nwhat, when you head out, I'll follow you."]);
        return;
      case "OutskirtStand_Diner_EventScript_TV":
        await say(["It's the news.", "\"…and the Colosseums of Orre are packed\nas ever this week…\"", "The picture fizzles into static."]);
        return;
      case "OutskirtStand_Diner_EventScript_Jukebox": await orreJukebox(); return;
      case "FarawayIsland_Entrance_EventScript_Sailor": await farawaySailor(ev.person); return;
      case "enter:FarawayIsland_Interior": await findMew(); return;
      case "FarawayIsland_Interior_EventScript_Mew": await mewFound(ev.person); return;
      case "CeruleanCave_B1F_EventScript_Mewtwo":
        await legendaryBird(ev.person, "Mewtwo", "foughtMewtwo", { level: 70, text: T("CeruleanCave_B1F_Text_Mew"), music: "mus_vs_mewtwo" });
        return;
      case "MtEmber_RubyPath_B5F_EventScript_Ruby":
        f.gotRuby = true;
        Overworld.removePerson(ev.person);
        Player.addItem(player, "ruby");
        await sayWithJingle("mus_obtain_key_item", T("MtEmber_RubyPath_B3F_Text_FoundARuby"));
        return;
      // Two Island.
      case "TwoIsland_EventScript_Clerk": await twoIslandClerk(); return;
      case "enter:TwoIsland_JoyfulGameCorner": await gameCornerHelp(); return;
      case "TwoIsland_JoyfulGameCorner_EventScript_LostellesDaddy": await lostellesDaddy(); return;
      case "TwoIsland_JoyfulGameCorner_EventScript_InfoMan":
        if ((f.gameCornerScene || 0) >= 4) { await say(T("Text_WelcomeCanYouWait")); await say(T("Text_AdapterNotConnectedMinigame")); return; }
        await say(T(f.rescuedLostelle ? "TwoIsland_JoyfulGameCorner_Text_GetGamesGoingSoon" : "TwoIsland_JoyfulGameCorner_Text_NotRunningAnyGamesToday"));
        return;
      case "TwoIsland_JoyfulGameCorner_EventScript_Lostelle": await say(T("TwoIsland_JoyfulGameCorner_Text_PleaseShowMeYouBeingCool")); return;
      case "TwoIsland_CapeBrink_House_EventScript_StarterTutor": await capeBrinkTutor(); return;
      case "TwoIsland_House_EventScript_MoveManiac": await moveManiac(); return;
      // Three Island.
      case "ThreeIsland_EventScript_Biker": await bikerArgument(2); return;
      case "ThreeIsland_EventScript_AntiBiker1": await antiBiker(1); return;
      case "ThreeIsland_EventScript_AntiBiker2": await antiBiker(2); return;
      case "ThreeIsland_EventScript_BikerBossIntroTrigger": await bikerBossIntro(); return;
      case "ThreeIsland_EventScript_BattleBikersTriggerLeft": await bikerBattles(0); return;
      case "ThreeIsland_EventScript_BattleBikersTriggerMidLeft": await bikerBattles(1); return;
      case "ThreeIsland_EventScript_BattleBikersTriggerMid": await bikerBattles(2); return;
      case "ThreeIsland_EventScript_BattleBikersTriggerMidRight": await bikerBattles(3); return;
      case "ThreeIsland_EventScript_BattleBikersTriggerRight": await bikerBattles(4); return;
      case "ThreeIsland_EventScript_Doduo": cry("Doduo"); await say(T("ThreeIsland_Text_Doduo")); return;
      case "ThreeIsland_Port_EventScript_Woman":
        await say(T((f.gameCornerScene || 0) >= 2 ? "ThreeIsland_Port_Text_EverythingTurnedOutForBest"
          : f.threeIslandScene === 4 ? "ThreeIsland_Port_Text_ThankGoodnessBikersGone" : "ThreeIsland_Port_Text_IllCallThePolice"));
        return;
      case "ThreeIsland_House1_EventScript_Lostelle": await say(T("ThreeIsland_House1_Text_YoureAlwaysSoCool"), bigGuy()); return;
      case "ThreeIsland_House5_EventScript_LittleGirl":
        await say(T(f.rescuedLostelle ? "ThreeIsland_House5_Text_IllGoPlayWithLostelle" : "ThreeIsland_House5_Text_ImNotLostelle"));
        return;
      case "ThreeIsland_Mart_EventScript_Clerk": await mart(ev.person.mart); return;
      case "ThreeIsland_BerryForest_EventScript_Lostelle": await berryForestLostelle(ev.person); return;
      // The Dunsparce Tunnel's prospector strikes gold once it's dug out
      // (once you're Champion, FLAG_SYS_GAME_CLEAR: FireRed's goes by the National Pokédex).
      case "ThreeIsland_DunsparceTunnel_EventScript_Prospector": {
        const D = (k) => T("ThreeIsland_DunsparceTunnel_Text_" + k);
        if (f.gotNuggetFromProspector) { await say(D("ThatsANugget")); return; }
        if (!f.gameClear) {
          await say(D("ProspectingForGold"));
          Screen.say("");
          await Overworld.act([{ who: "LOCALID_PROSPECTOR", moves: ["face_right"] }]);
          return;
        }
        await say(D("StruckGoldThisIsForYou"));
        Player.addItem(player, "nugget");
        f.gotNuggetFromProspector = true;
        await sayWithJingle("mus_obtain_item", "{PLAYER} received a " + Bag.name("nugget") + "!");
        await say(D("ThatsANugget"));
        return;
      }

      // ---------- The Sevii Islands: Four Island ----------
      case "FourIsland_Harbor_EventScript_Sailor": await harborSailor("FOUR_ISLAND"); return;
      case "FiveIsland_Harbor_EventScript_Sailor": await harborSailor("FIVE_ISLAND"); return;
      case "FourIsland_PokemonCenter_1F_EventScript_Nurse": case "FiveIsland_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;
      case "FourIsland_Mart_EventScript_Clerk": await mart(ev.person.mart); return;
      case "enter:FourIsland": await fourIslandRival(); return;
      case "FourIsland_EventScript_DaycareMan": await fourIslandDayCareMan(); return;
      // (Route 34's Day-Care, HGSS's std_daycare_man and std_daycare_lady: tools/build-johto.js.)
      case "Johto_DaycareMan": await fourIslandDayCareMan("johto"); return;
      case "Johto_DaycareLady": await fourIslandDayCareLady("johto"); return;
      case "FourIsland_PokemonDayCare_EventScript_DaycareWoman": await fourIslandDayCareLady(); return;
      case "FourIsland_EventScript_OldWoman":
        await say(T(f.canLinkWithRS ? "FourIsland_Text_LoreleiMetLaprasAsChild" : "FourIsland_Text_LoreleiHasReturned"));
        return;
      case "FourIsland_House1_EventScript_BodySlamTutor": await moveTutor("Body Slam", "tutorBodySlam", "Text_BodySlam"); return;
      case "FourIsland_House2_EventScript_StickerMan": await stickerMan(); return;
      case "FourIsland_LoreleisHouse_EventScript_Lorelei": {
        const L = (k) => T("FourIsland_LoreleisHouse_Text_" + k);
        if (f.talkedToLoreleiAfterWarehouse) await say(L("WillDoWhatICanHereAndNow"));
        else if (f.defeatedRocketsInWarehouse) { f.talkedToLoreleiAfterWarehouse = true; await say(L("IllReturnToLeagueInShortWhile")); }
        else await say(L("IfAnythingWereToHappenToIsland"));
        return;
      }
      case "FourIsland_IcefallCave_Back_EventScript_LoreleiRocketsScene": await icefallLorelei(); return;
      case "FourIsland_IcefallCave_1F_EventScript_FallDownHole": await icefallFall(); return;
      // ---------- Five Island ----------
      case "FiveIsland_Meadow_EventScript_WarehouseDoor": await warehouseDoor(); return;
      case "FiveIsland_RocketWarehouse_EventScript_Cage":
        await say(T(f.defeatedRocketsInWarehouse ? "FiveIsland_RocketWarehouse_Text_PenUnlockedMonsFled" : "FiveIsland_RocketWarehouse_Text_ManyMonsLockedInPen"));
        return;
      case "FiveIsland_RocketWarehouse_EventScript_Admin2Trigger": {
        await Overworld.act([{ who: "LOCALID_WAREHOUSE_ADMIN2", moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
        f.warehouseScene = 1;
        // (Turned your way, he sees you at once: FireRed checks trainers' sight every frame.)
        const admin = window.WORLD_MAPS[ev.map].people.find((q) => q.localId === "LOCALID_WAREHOUSE_ADMIN2"), at = Overworld.position();
        const a = Overworld.personPosition("LOCALID_WAREHOUSE_ADMIN2");
        if (admin && a && trainerWaiting(admin) && at.y === a.y && a.x - at.x >= 1 && a.x - at.x <= admin.trainer.sight) {
          await trainerBattle(admin, a.x - at.x - 1, "left");
          await afterRocket(admin);
        }
        return;
      }
      case "FiveIsland_MemorialPillar_EventScript_MemorialMan": await memorialMan(); return;
      case "FiveIsland_MemorialPillar_EventScript_Memorial": await memorial(); return;
      case "FiveIsland_WaterLabyrinth_EventScript_EggGentleman": await eggGentleman(); return;
      case "FiveIsland_ResortGorgeous_House_EventScript_Selphy": await selphy(); return;
      case "enter:FiveIsland_LostCave_Room10": await lostSelphy(); return;
      case "enter:FiveIsland_ResortGorgeous": await selphyHome(); return;
      // ---------- Six Island ----------
      case "SixIsland_Harbor_EventScript_Sailor": await harborSailor("SIX_ISLAND"); return;
      case "SevenIsland_Harbor_EventScript_Sailor": await harborSailor("SEVEN_ISLAND"); return;
      case "SixIsland_PokemonCenter_1F_EventScript_Nurse": case "SevenIsland_PokemonCenter_1F_EventScript_Nurse":
      case "TrainerTower_Lobby_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;
      case "SixIsland_Mart_EventScript_Clerk": case "SevenIsland_Mart_EventScript_Clerk":
        await mart(ev.person.mart);
        return;
      case "TrainerTower_Lobby_EventScript_MartClerk": await bpShop(); return;
      case "enter:SixIsland_PokemonCenter_1F": await sixIslandRival(); return;
      case "SixIsland_RuinValley_EventScript_Scientist": await ruinValleyScientist(); return;
      case "SixIsland_RuinValley_EventScript_DottedHoleDoor": await dottedHoleDoor(); return;
      case "SixIsland_DottedHole_B1F_EventScript_BrailleUp": await say(braille("UP")); return;
      case "SixIsland_DottedHole_B2F_EventScript_BrailleLeft": await say(braille("LEFT")); return;
      case "SixIsland_DottedHole_B3F_EventScript_BrailleRight": await say(braille("RIGHT")); return;
      case "SixIsland_DottedHole_B4F_EventScript_BrailleDown": await say(braille("DOWN")); return;
      case "SixIsland_DottedHole_SapphireRoom_EventScript_BrailleMessage":
        await say(["LET THE TWO", "GLITTERING", "STONES", "ONE IN RED", "ONE IN BLUE", "CONNECT THE", "PAST.", "TWO FRIENDS", "SHARING",
          "POWER OPEN", "A WINDOW TO", "A NEW WORLD", "THAT GLOWS.", "THE NEXT", "WORLD WAITS", "FOR YOU."].map(braille));
        return;
      case "SixIsland_DottedHole_SapphireRoom_EventScript_Sapphire": await dottedHoleSapphire(); return;
      case "SixIsland_WaterPath_House1_EventScript_Beauty": await heracrossFan(); return;
      case "SixIsland_WaterPath_House1_EventScript_SizeRecord": await heracrossChart(); return;
      // ---------- Seven Island ----------
      case "SevenIsland_EventScript_SwordsDanceTutor": await moveTutor("Swords Dance", "tutorSwordsDance", "Text_SwordsDance"); return;
      case "SevenIsland_SevaultCanyon_House_EventScript_ChanseyDanceMan": await chanseyDance(); return;
      case "SevenIsland_SevaultCanyon_House_EventScript_Chansey":
        cry("Chansey");
        await say(T("SevenIsland_SevaultCanyon_House_Text_Chansey"));
        return;
      // (FireRed's e-Reader trainer, the old woman's visitor, never comes here.)
      case "SevenIsland_House_Room1_EventScript_OldWoman": await say(T("SevenIsland_House_Room1_Text_OnlyEnjoymentWatchingBattles")); return;
      // ---------- Trainer Tower ----------
      case "TrainerTower_Lobby_EventScript_EntryTrigger": await towerEntry(); return;
      case "enter:TrainerTower_Lobby": await towerLost(); return;
      case "TrainerTower_Lobby_EventScript_Receptionist":
        await say(lobbyText(f.tower && f.tower.spokeToOwner ? "ThanksForCompeting" : "GiveItYourBest"));
        return;
      case "TrainerTower_Lobby_EventScript_ShowRecords": await towerTimeBoard(); return;
      case "TrainerTower_Elevator_EventScript_FloorSelect": await towerElevator(); return;
      case "TrainerTower_EventScript_Owner": await towerOwner(); return;
      case "TrainerTower_Lobby_EventScript_BPTutor": await bpTutor(); return;
      case BT_ENTRY: await battleTowerEntry(); return;
      case BT_RECEPTION: await battleTowerReception(); return;
      case BT_NURSE: await nurse(ev.map, ev.person); return;
      case BT_SIGN: await battleTowerSign(); return;
      case ST_CUPS: await stadiumCups(); return;
      case ST_CASTLE: await stadiumCastle(); return;
      case ST_NURSE: await nurse(ev.map, ev.person); return;
      case ST_SIGN: await stadiumSign(); return;
      case "StadiumIsland_EventScript_Sailor": await stadiumSailor(); return;
      case "StadiumIsland_EventScript_StadiumSign": await say(["Pokémon Stadium", "Cups and the Gym Leader Castle!\nOpen to all Trainers."]); return;
      case "StadiumIsland_EventScript_PierSign": await say("Stadium Island\nThe Seagallop sails for Vermilion."); return;
      case "StadiumIsland_EventScript_Spectator": await stadiumSpectator(ev.person); return;
      case "TrainerTower_Lobby_EventScript_BPEggTutor": await bpEggTutor(); return;
      case "TrainerTower_EventScript_SingleBattleTrigger": await towerBattle(ev.map, 0); return;
      case "TrainerTower_EventScript_DoubleBattleTriggerTop": await towerBattle(ev.map, 0); return;
      case "TrainerTower_EventScript_DoubleBattleTriggerBottom": await towerBattle(ev.map, 1); return;
      case "TrainerTower_EventScript_DoublesTrainer1": case "TrainerTower_EventScript_SinglesTrainer":
      case "TrainerTower_EventScript_KnockoutTrainer": case "TrainerTower_EventScript_DoublesTrainer2":
        await towerTrainerTalk(ev.map, ev.person.localId);
        return;

      // ---------- Cinnabar Island ----------
      // The Gym's door, locked until you have the Secret Key (VAR_TEMP_1, from
      // FLAG_HIDE_POKEMON_MANSION_B1F_SECRET_KEY: CinnabarIsland_EventScript_CheckUnlockGym).
      case "CinnabarIsland_EventScript_GymDoorLocked":
        await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
        await sleep(333);
        await say(T("CinnabarIsland_Text_DoorIsLocked"));
        Screen.say("");
        await Overworld.act([{ who: "player", moves: M("CinnabarIsland_Movement_ForcePlayerFromDoor") }]);
        return;
      case "CinnabarIsland_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;
      case "CinnabarIsland_Mart_EventScript_Clerk":
        await mart(ev.person.mart);
        return;
      case "CinnabarIsland_Gym_EventScript_GymGuy":
        await say(T(f.TRAINER_LEADER_BLAINE ? "CinnabarIsland_Gym_Text_GymGuyPostVictory" : "CinnabarIsland_Gym_Text_GymGuyAdvice"));
        return;
      case "CinnabarIsland_Gym_EventScript_GymStatue":
        await say(T(hasBadge("volcano") ? "CinnabarIsland_Gym_Text_GymStatuePlayerWon" : "CinnabarIsland_Gym_Text_GymStatue"));
        return;
      // The Pokémon Lab: Garett's Seel (for a Ponyta), Clifton's Electrode (for
      // a Raichu), Norma's Tangela (for a Venonat), the fossil doctor and the
      // Metronome tutor.
      case "CinnabarIsland_PokemonLab_ExperimentRoom_EventScript_Garett":
        await inGameTrade(TRADES.seelor);
        return;
      case "CinnabarIsland_PokemonLab_Lounge_EventScript_Clifton":
        await inGameTrade(TRADES.esphere);
        return;
      case "CinnabarIsland_PokemonLab_Lounge_EventScript_Norma":
        await inGameTrade(TRADES.tangeny);
        return;
      case "CinnabarIsland_PokemonLab_ExperimentRoom_EventScript_FossilScientist":
      case PEWTER_FOSSIL_SCIENTIST:
        await fossilScientist();
        return;
      case "CinnabarIsland_PokemonLab_ResearchRoom_EventScript_MetronomeTutor":
        await moveTutor("Metronome", "tutorMetronome", "Text_Metronome");
        return;
      // The Pokémon Mansion's statues: each hides the switch for its doors.
      case "PokemonMansion_1F_EventScript_Statue":
      case "PokemonMansion_2F_EventScript_Statue":
      case "PokemonMansion_3F_EventScript_Statue":
      case "PokemonMansion_B1F_EventScript_Statue":
        await mansionSwitch();
        return;

      // ---------- Fuchsia City ----------
      case "FuchsiaCity_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;
      case "FuchsiaCity_Mart_EventScript_Clerk":
        await mart(ev.person.mart);
        return;
      case "FuchsiaCity_EventScript_FossilMonSign":
        if (f.mtMoonFossil === "dome-fossil") await monSign("Omanyte", T("FuchsiaCity_Text_OmanyteSign"));
        else await monSign("Kabuto", T("FuchsiaCity_Text_KabutoSign"));
        return;
      case "FuchsiaCity_EventScript_SubstituteTutor":
        await moveTutor("Substitute", "tutorSubstitute", "Text_Substitute");
        return;
      case "FuchsiaCity_WardensHouse_EventScript_Warden":
        await warden();
        return;
      // The Fishing Guru's other brother: (FireRed's Good Rod) the Fishing Rod if
      // you haven't one; then how your fishing is going.
      case "FuchsiaCity_House2_EventScript_FishingGurusBrother":
        if (!hasFishingRod()) { await rodGift("FuchsiaCity_House2_Text_", "LikeYourStyleTakeThis"); return; }
        await say(T("FuchsiaCity_House2_Text_HowAreTheFishBiting"));
        await say(fishingLevelTalk("Fuchsia"));
        return;
      case "FuchsiaCity_House3_EventScript_MoveDeleter":
        await fuchsiaMoveDeleter();
        return;
      case "FuchsiaCity_Gym_EventScript_GymGuy":
        await say(T(f.TRAINER_LEADER_KOGA ? "FuchsiaCity_Gym_Text_GymGuyPostVictory" : "FuchsiaCity_Gym_Text_GymGuyAdvice"));
        return;
      case "FuchsiaCity_Gym_EventScript_GymStatue":
        await say(T(hasBadge("soul") ? "FuchsiaCity_Gym_Text_GymStatuePlayerWon" : "FuchsiaCity_Gym_Text_GymStatue"));
        return;

      // ---------- The Safari Zone ----------
      case "FuchsiaCity_SafariZone_Entrance_EventScript_InfoAttendant":
        await say(T(await confirm(fill(T("FuchsiaCity_SafariZone_Entrance_Text_FirstTimeAtSafariZone")[0]))
          ? "FuchsiaCity_SafariZone_Entrance_Text_ExplainSafariZone" : "FuchsiaCity_SafariZone_Entrance_Text_SorryYoureARegularHere"));
        return;
      case "FuchsiaCity_SafariZone_Entrance_EventScript_EntryTriggerMid":
      case "FuchsiaCity_SafariZone_Entrance_EventScript_EntryTriggerRight":
      case "FuchsiaCity_SafariZone_Entrance_EventScript_EntryTriggerLeft":
        await safariEntry(script.replace("FuchsiaCity_SafariZone_Entrance_EventScript_EntryTrigger", ""));
        return;
      case "enter:FuchsiaCity_SafariZone_Entrance":
        await safariGateArrival();
        return;
      case "SafariZone_SecretHouse_EventScript_Attendant":
        if (!f.gotHM03) {
          await say(T("SafariZone_SecretHouse_Text_CongratsYouveWon"));
          Player.addItem(player, "hm03");
          f.gotHM03 = true;
          await sayWithJingle(itemJingle("hm03"), T("SafariZone_SecretHouse_Text_ReceivedHM03FromAttendant"));
        }
        await say(T("SafariZone_SecretHouse_Text_ExplainSurf"));
        return;

      // ---------- Vermilion City ----------
      // The sailor at the pier checks for an S.S. Ticket (once, until you step back).
      case "VermilionCity_EventScript_CheckTicketLeft":
      case "VermilionCity_EventScript_CheckTicketRight":
        if (ticketChecked) return;
        if (f.ssAnneDeparted) {
          // (Then the Seagallop sails from here, with a Tri-Pass or Rainbow Pass:
          // VermilionCity_EventScript_CheckSeagallopPresentTrigger.)
          await Overworld.act([{ who: "LOCALID_VERMILION_FERRY_SAILOR", moves: M("Common_Movement_WalkInPlaceFasterLeft") },
            { who: "player", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
          await vermilionSeagallop(true);
          return;
        }
        await Overworld.act([{ who: "LOCALID_VERMILION_FERRY_SAILOR", moves: M("Common_Movement_WalkInPlaceFasterLeft") },
          { who: "player", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
        await say(T("VermilionCity_Text_DoYouHaveATicket"));
        if (!f.gotSSTicket || !Player.itemCount(player, "ss-ticket")) {
          await say(T("VermilionCity_Text_DontHaveNeededSSTicket"));
          await Overworld.act([{ who: "player", moves: ["walk_up"] }]);
          return;
        }
        await say(T("VermilionCity_Text_FlashedSSTicket"));
        ticketChecked = true;
        return;
      case "VermilionCity_EventScript_ExitedTicketCheck":
        ticketChecked = false;
        return;
      // The Tradeback Guy (this game's): he trades with you and straight back,
      // so a Pokémon that evolves by trading does (Kadabra, Machoke, Graveler,
      // Haunter, and those holding their item: Onix with a Metal Coat, ...);
      // he won't take one that wouldn't.
      case "Game_EventScript_PokerDealer": await pokerTable(); return;
      case "Game_EventScript_BlackjackDealer": await blackjackTable(); return;
      case "Game_EventScript_PokerTable": await pokerTable(); return;
      case "Game_EventScript_BlackjackTable": await blackjackTable(); return;
      case "Game_EventScript_MahjongPlayer": await mahjongTable(); return;
      case "Game_EventScript_Rejuvenator": await rejuvenator(); return;
      case "Game_EventScript_SSAquaSailor": await ssAquaToOlivine(); return;
      case "Game_EventScript_TradebackGuy": {
        await say(["Hi! I'm the Tradeback Guy!", "Some Pokémon only evolve when\nthey're traded. Nobody to trade\nwith? Leave it to me!",
          "I'll trade you my Rattata, and then\ntrade your Pokémon right back!"]);
        if (!(await confirm("Want to trade a Pokémon with me?"))) { await say("Okay! Come back anytime!"); return; }
        // (Only a Pokémon that would evolve by it: each box says ABLE or NOT ABLE.)
        const evolves = (r) => !r.egg && !!Evolution.find(r, { trigger: "trade", party: player.party });
        const mine = await choosePartyFor("Choose a POKéMON.", null, player.party.map((r) => (evolves(r) ? "ABLE" : "NOT ABLE")));
        show("world");
        if (!mine) { await say("Okay! Come back anytime!"); return; }
        if (mine.egg) { await say("An Egg can't be traded!"); return; }
        if (!evolves(mine)) {
          await say(["Hmm… " + Party.displayName(mine) + " won't evolve by\ntrading.", "I only trade Pokémon that evolve\nwhen they're traded. Sorry!"]);
          return;
        }
        // Your Pokémon for his Lv. 5 Rattata, and back again: two trades, as
        // FireRed shows them (ui/trade-scene.js), then the trade evolution.
        const rattata = Party.create("Rattata", 5);
        rattata.hp = Party.maxHp(rattata);
        rattata.ot = { name: "TRADEBACK", id: 1 };
        await tradeScene(mine, rattata, "Tradeback Guy");
        show("world");
        await Overworld.resume();
        await say("Great! Now let's trade back!");
        await tradeScene(rattata, mine, "Tradeback Guy");
        const name = Party.displayName(mine);
        const evo = Evolution.find(mine, { trigger: "trade", party: player.party });
        if (evo) await evolve(mine, evo, false);
        show("world");
        music(avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[player.location.map] || {}).music);
        await Overworld.resume();
        await say(evo ? "There you go! Come back anytime!" : "Here's your " + name + " back!\nCome back anytime!");
        return;
      }
      // ---------- The S.S. Anne ----------
      case "SSAnne_2F_Corridor_EventScript_RivalTriggerLeft":
      case "SSAnne_2F_Corridor_EventScript_RivalTriggerMid":
      case "SSAnne_2F_Corridor_EventScript_RivalTriggerRight":
        if (!f.ssAnneRed && canBattle()) await ssAnneRed(script.replace("SSAnne_2F_Corridor_EventScript_RivalTrigger", ""));
        return;
      case "SSAnne_CaptainsOffice_EventScript_Captain":
        await ssAnneCaptain();
        return;
      // A gentleman shows you the sleeping Pokémon he saw: Snorlax (seen in the Pokédex).
      case "SSAnne_2F_Room1_EventScript_Gentleman":
        Player.markSeen(player, "Snorlax");
        showPicture("Snorlax");
        await say(T("SSAnne_2F_Room1_Text_SleepingMonLookedLikeThis"));
        hidePicture();
        return;
      // The head chef: tonight's main course is one of three.
      case "SSAnne_Kitchen_EventScript_Chef1": case "SSAnne_Kitchen_EventScript_Chef2":
      case "SSAnne_Kitchen_EventScript_Chef3": case "SSAnne_Kitchen_EventScript_Chef4": {
        await say(T("SSAnne_Kitchen_Text_IAmLeChefMainCourseIs"));
        await say(T(["SSAnne_Kitchen_Text_SalmonDuSalad", "SSAnne_Kitchen_Text_EelsAuBarbecue", "SSAnne_Kitchen_Text_PrimeBeefsteak"][Math.floor(Math.random() * 3)]));
        return;
      }
      case "enter:SSAnne_Exterior":
        await ssAnneDeparts();
        return;
      case "VermilionCity_EventScript_OaksAide":
        f.talkedToVermilionAide = true;
        await say(T("VermilionCity_Text_Route2AideHasPackageForYou"));
        return;
      case "VermilionCity_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;
      case "VermilionCity_Mart_EventScript_Clerk":
      case "LavenderTown_Mart_EventScript_Clerk":
        await mart(ev.person.mart);
        return;
      case "VermilionCity_Gym_EventScript_LtSurge":
        await ltSurge(ev.person);
        return;
      case "VermilionCity_Gym_EventScript_GymGuy":
        await say(T(f.TRAINER_LEADER_LT_SURGE ? "VermilionCity_Gym_Text_GymGuyPostVictory" : "VermilionCity_Gym_Text_GymGuyAdvice"));
        return;
      case "VermilionCity_Gym_EventScript_GymStatue":
        await say(T(hasBadge("thunder") ? "VermilionCity_Gym_Text_GymStatuePlayerWon" : "VermilionCity_Gym_Text_GymStatue"));
        return;
      // The Fishing Guru gives you (FireRed's Old Rod) the Fishing Rod.
      case "VermilionCity_House1_EventScript_FishingGuru": {
        if (hasFishingRod()) {
          await say(T("VermilionCity_House1_Text_HowAreTheFishBiting"));
          await say(fishingLevelTalk("Vermilion"));
          return;
        }
        const q = T("VermilionCity_House1_Text_ImFishingGuruDoYouLikeToFish");
        await say(q.slice(0, -1));
        if (!(await confirm(fill(q[q.length - 1])))) { await say(T("VermilionCity_House1_Text_OhThatsSoDisappointing")); return; }
        await say(T("VermilionCity_House1_Text_TakeThisAndFish"));
        await giveFishingRod("the Fishing Guru");
        f.gotOldRod = true;
        await say(T("VermilionCity_House1_Text_FishingIsAWayOfLife"));
        await say(FISHING_LEVELS_EXPLAINED);
        return;
      }
      case "VermilionCity_House2_EventScript_Elyssa":
        await inGameTrade(TRADES.chDing);
        return;
      // Pokémon that cry when you talk to them.
      case "VermilionCity_House3_EventScript_Pidgey":
      case "LavenderTown_House1_EventScript_Cubone":
      case "LavenderTown_VolunteerPokemonHouse_EventScript_Nidorino":
      case "LavenderTown_VolunteerPokemonHouse_EventScript_Psyduck":
      case "VermilionCity_PokemonFanClub_EventScript_Pikachu":
      case "VermilionCity_PokemonFanClub_EventScript_Seel":
      case "SSAnne_1F_Room3_EventScript_Wigglytuff":
      case "SSAnne_B1F_Room5_EventScript_Machoke":
        cry(/_EventScript_(\w+)$/.exec(script)[1]);
        await say(ev.person.text || []);
        return;
      // The Fan Club's Chairman: hear him out about his Rapidash and get a Bike Voucher.
      case "VermilionCity_PokemonFanClub_EventScript_Chairman": {
        const C = (k) => T("VermilionCity_PokemonFanClub_Text_" + k);
        if (f.gotBikeVoucher) { await say(C("DidntComeToSeeAboutMonsAgain")); return; }
        const q = C("DidYouComeToHearAboutMyMons");
        await say(q.slice(0, -1));
        if (!(await confirm(fill(q[q.length - 1])))) { await say(C("ComeBackToHearStory")); return; }
        await say(C("ChairmansStory"));
        Player.addItem(player, "bike-voucher");
        f.gotBikeVoucher = true;
        await sayWithJingle("mus_obtain_key_item", C("ReceivedBikeVoucherFromChairman"));
        await say(C("ExplainBikeVoucher"));
        return;
      }

      // Super Nerd Miguel guards the fossils: beat him, then each of you takes one.
      case "MtMoon_B2F_EventScript_MiguelTrigger":
        if (f.TRAINER_SUPER_NERD_MIGUEL) return;
        await Overworld.act([{ who: "LOCALID_MIGUEL", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
        await miguelBattle();
        return;
      case "MtMoon_B2F_EventScript_Miguel":
        if (f.mtMoonFossil) await say(T("MtMoon_B2F_Text_LabOnCinnabarRegeneratesFossils"));
        else if (f.TRAINER_SUPER_NERD_MIGUEL) await say(T("MtMoon_B2F_Text_WellEachTakeAFossil"));
        else await miguelBattle();
        return;
      case "MtMoon_B2F_EventScript_DomeFossil":
      case "MtMoon_B2F_EventScript_HelixFossil": {
        if (f.mtMoonFossil || !f.TRAINER_SUPER_NERD_MIGUEL) { if (!f.TRAINER_SUPER_NERD_MIGUEL) await say(T("MtMoon_B2F_Text_MiguelIntro")); return; }
        const dome = script.endsWith("DomeFossil"), name = dome ? "Dome" : "Helix";
        if (!(await confirm(fill(T("MtMoon_B2F_Text_YouWant" + name + "Fossil")[0])))) return;
        Overworld.removeObject(dome ? "LOCALID_DOME_FOSSIL" : "LOCALID_HELIX_FOSSIL");
        Player.addItem(player, dome ? "dome-fossil" : "helix-fossil");
        f.mtMoonFossil = dome ? "dome-fossil" : "helix-fossil";
        await say(T("MtMoon_B2F_Text_Obtained" + name + "Fossil"));
        // He takes the other one.
        await Overworld.act([{ who: "LOCALID_MIGUEL", moves: ["delay_10"].concat(M(dome ? "MtMoon_B2F_Movement_MiguelToHelixFossil" : "MtMoon_B2F_Movement_MiguelToDomeFossil")) }]);
        await say(T("MtMoon_B2F_Text_ThenThisFossilIsMine"));
        Overworld.removeObject(dome ? "LOCALID_HELIX_FOSSIL" : "LOCALID_DOME_FOSSIL");
        return;
      }

      // ---------- Route 2 ----------

      case "Route2_House_EventScript_Reyley":
        await inGameTrade(TRADES.mimien);
        return;

      // Prof. Oak's Aide in Route 11's gate: the Itemfinder for thirty kinds caught.
      case "Route11_EastEntrance_2F_EventScript_Aide": {
        const NEEDED = 30, item = "itemfinder", label = "Itemfinder", A = (k) => T("Route11_EastEntrance_2F_Text_" + k);
        if (f.gotItemfinder) { await say(A("ExplainItemfinder"), [NEEDED, label]); return; }
        const ask = A("GiveItemfinderIfCaught30");
        await say(ask.slice(0, -1), [NEEDED, label]);
        if (!(await confirm(fill(ask[ask.length - 1], [NEEDED, label])))) { await say(T("Aide_Text_GetEnoughMonsComeBackForItem"), [NEEDED, label]); return; }
        const count = Player.dexCount(player, "caught", true);   // (Kanto's: GetPokedexCount)
        if (count < NEEDED) { await say(T("Aide_Text_HaventCaughtEnoughMonsForItem"), [NEEDED, label, count]); return; }
        await say(A("GreatHereYouGo"), [NEEDED, label, count]);
        Player.addItem(player, item);
        f.gotItemfinder = true;
        await sayWithJingle("mus_obtain_key_item", A("ReceivedItemfinderFromAide").map((p) => fill(p, [NEEDED, label])));
        await say(A("ExplainItemfinder"), [NEEDED, label]);
        return;
      }
      case "Route11_EastEntrance_2F_EventScript_Turner":
        await inGameTrade(TRADES.nina);
        return;
      // Prof. Oak's Aide: HM05 Flash for ten kinds of Pokémon caught.
      case "Route2_EastBuilding_EventScript_Aide": {
        const NEEDED = 10, item = "hm05", label = "HM05";
        if (f.gotFlash) { await say(T("Route2_EastBuilding_Text_ExplainHM05")); return; }
        const ask = T("Route2_EastBuilding_Text_GiveHM05IfSeen10Mons");
        await say(ask.slice(0, -1));
        if (!(await confirm(fill(ask[ask.length - 1])))) { await say(T("Aide_Text_GetEnoughMonsComeBackForItem"), [NEEDED, label]); return; }
        const count = Player.dexCount(player, "caught", true);   // (Kanto's: GetPokedexCount)
        if (count < NEEDED) { await say(T("Aide_Text_HaventCaughtEnoughMonsForItem"), [NEEDED, label, count]); return; }
        await say(T("Route2_EastBuilding_Text_GreatHereYouGo"), [NEEDED, label, count]);
        Player.addItem(player, item);
        f.gotFlash = true;
        await say(T("Route2_EastBuilding_Text_ReceivedHM05FromAide"));
        await say(T("Route2_EastBuilding_Text_ExplainHM05"));
        return;
      }

      case "Route1_EventScript_MartClerk":
        if (f.route1Potion) { await say("Please come see us if you need\nPoké Balls."); return; }
        await say(ev.person.text);
        Player.addItem(player, "potion");
        f.route1Potion = true;
        await say("{PLAYER} received a Potion.");
        return;
    }
  }

  // A Pokémon's picture in a box over the map, as FireRed shows the starters.
  function showPicture(species) {
    const box = $("#world-pic");
    box.querySelector("img").src = window.Screen.spriteUrl(species, "");
    box.querySelector("img").alt = species;
    box.classList.remove("hidden");
  }
  const hidePicture = () => $("#world-pic").classList.add("hidden");

  // ---------- Prof. Oak's walk to the lab ----------
  //
  // FireRed's scene: stepping into the grass north of Pallet Town without a
  // Pokémon, Oak calls out, walks up, and leads you to his lab, where your
  // rival is waiting. Movements are FireRed's (window.WORLD_MOVEMENTS).

  const M = (label) => window.WORLD_MOVEMENTS[label];
  const OAK = "LOCALID_PALLET_PROF_OAK", LAB_OAK = "LOCALID_OAKS_LAB_PROF_OAK", LAB_RIVAL = "LOCALID_OAKS_LAB_RIVAL";

  // At the start, Leaf is in Oak's lab instead of Gary: she waits for her
  // Pokémon, takes the one that beats yours and battles you. Gary's FireRed
  // lines, with her name, "Prof. Oak" for his "Gramps" (she isn't Oak's
  // grandchild), and without his "Smell you later!".
  const LAB_RIVAL_NAME = "Leaf";
  const leafT = (label) => [].concat(T(label)).map((p) => p.replace(/\{RIVAL\}/g, LAB_RIVAL_NAME)
    .replace(/Gramps/g, "Prof. Oak").replace(/Smell you later!/g, "See you later!"));

  async function oakWalksYouToTheLab(side) {
    music("mus_oak");
    await say(T("PalletTown_Text_OakDontGoOut"));
    await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    await Overworld.act([{ who: "player", moves: M("Common_Movement_ExclamationMark") }]);
    Overworld.addObject(OAK, { x: 10, y: 8, facing: "up" });
    await Overworld.act([{ who: OAK, moves: M("PalletTown_Movement_OakEnter" + side) }]);
    await say(T("PalletTown_Text_OakGrassUnsafeNeedMon"));
    await Overworld.act([
      { who: OAK, moves: M("PalletTown_Movement_OakWalkToLab" + side) },
      { who: "player", moves: M("PalletTown_Movement_PlayerWalkToLab" + side) }]);
    await Overworld.act([
      { who: OAK, moves: M("PalletTown_Movement_OakEnterLab") },
      { who: "player", moves: M("PalletTown_Movement_PlayerEnterLab") }]);
    player.flags.oakInLab = true;
    await Overworld.teleport({ map: "PalletTown_ProfessorOaksLab", x: 6, y: 12, facing: "up" });

    // In the lab: Oak walks in ahead of you to his desk.
    Overworld.removeObject(LAB_OAK);
    Overworld.addObject(LAB_OAK, { x: 6, y: 11, facing: "up" });
    await Overworld.act([{ who: LAB_OAK, moves: M("PalletTown_ProfessorOaksLab_Movement_OakEnter") }]);
    Overworld.removeObject(LAB_OAK);
    Overworld.refreshPeople();
    await Overworld.act([{ who: "player", moves: M("PalletTown_ProfessorOaksLab_Movement_PlayerEnter") }]);
    await Overworld.act([{ who: LAB_RIVAL, moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    // Leaf is friendlier than FireRed's rival: glad to see you both, and
    // happy to wait her turn.
    await say(["Leaf: Prof. Oak! There you are!", player.flags.metLeaf ? "Oh, and you brought {PLAYER}, too!\nHi again!"
      : "Oh, hi! I'm Leaf. Nice to meet you,\n{PLAYER}!"]);
    await say(leafT("PalletTown_ProfessorOaksLab_Text_OakThreeMonsChooseOne"));
    await Overworld.act([{ who: LAB_RIVAL, moves: M("PalletTown_ProfessorOaksLab_Movement_RivalReact") }]);
    await say(["Leaf: Um, Prof. Oak?\nCould I have one, too?"]);
    await say(["Oak: Of course, Leaf!\nYou can have one, too!"]);
  }

  // Leaf stops you on the way out of the lab (FireRed's RivalBattle): she
  // turns, calls out, walks down to you from her Poké Ball, battles, then
  // leaves. Which path she takes depends on where you are (x 5, 6 or 7) and
  // which Pokémon she has.
  async function rivalLabBattle(x) {
    music("mus_encounter_rival");
    const f = player.flags;
    const side = { 5: "Left", 6: "Mid", 7: "Right" }[x] || "Mid";
    const theirs = RIVAL_PICK[f.starter];
    await Overworld.act([{ who: LAB_RIVAL, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    await say(["Leaf: Wait, {PLAYER}!\nHow about a practice battle?", "Let's see what our Pokémon\ncan do!"]);
    const approach = theirs === "Charmander" ? "PalletTown_ProfessorOaksLab_Movement_ApproachForBattleCharmander" + side
      : "PalletTown_ProfessorOaksLab_Movement_RivalApproachForBattle" + theirs + side;
    await Overworld.act([{ who: LAB_RIVAL, moves: M(approach) }]);
    f.rivalLabBattle = true;
    const team = [Party.create(theirs, STARTER_LEVEL)];
    const outcome = await battle("trainer", { foe: { name: "Pokémon Trainer " + LAB_RIVAL_NAME, team, pic: "green" },
      defeatText: ["Wow, you're really good!\nThat was fun!"], noBlackout: true });
    // Back to the lab: everyone's healed, and she heads out.
    player.party.forEach(Party.heal);
    show("world");
    await Overworld.resume();
    if (outcome === "lost") await say(["Leaf: Yay, I won!\nGood battle, {PLAYER}!"]);
    await say(["Leaf: I'm going to train my Pokémon\nso we both get stronger!", "Thanks, Prof. Oak!\nSee you later, {PLAYER}!"]);
    music("mus_rival_exit");
    await Overworld.act([
      { who: LAB_RIVAL, moves: M("PalletTown_ProfessorOaksLab_Movement_RivalExitAfterBattle" + side) },
      { who: "player", moves: M("PalletTown_ProfessorOaksLab_Movement_PlayerWatchRivalExitAfterBattle" + (side === "Right" ? "Right" : "")) }]);
    Overworld.removeObject(LAB_RIVAL);
  }

  // EventScript_OutOfCenterPartyHeal: the screen goes black while the healing
  // jingle plays, and the party is healed.
  async function outOfCenterHeal() {
    Screen.say("");
    await Overworld.fadeToBlack();
    // (as long as the jingle, and a moment at least, for when the sound is off)
    await Promise.all([fanfare("mus_heal"), new Promise((r) => setTimeout(r, 1500))]);
    player.party.forEach(Party.heal);
    await Overworld.fadeFromBlack();
  }

  // ---------- Trainers ----------
  //
  // A trainer who sees you: "!", walks up to you, you turn to face them, they
  // speak, and battle. One you talk to just speaks and battles. Their party is
  // FireRed's (data/world-maps.js, WORLD_TRAINERS), with FireRed's fixed IVs
  // (0-255 there, so 0-31 here).
  // A double battle's trainers (FireRed's trainerbattle_double: Route 8's
  // twins Eli & Anne, the couples, Sis and Bro) fight with two Pokémon each
  // side, after one of them speaks; without two Pokémon that can fight you
  // hear why not instead (EventScript_NotEnoughMonsForDoubleBattle), and
  // they don't come after you.
  async function trainerBattle(person, approach, facing) {
    if (person.pyramid != null) return pyramidFight(person, approach, facing);
    const t = person.trainer, data = window.WORLD_TRAINERS[t.id];
    const who = "#" + person.id;
    if (t.double && approach == null && !canDouble()) {
      await say(t.notEnough || ["You need two Pokémon to battle us!"]);
      return;
    }
    music(inJohto() ? johtoEyes(data) : data.music || "mus_encounter_boy");   // their "eyes meet" theme
    // (Emerald's buried trainers burst up out of the sand: shown, a hop and "!", where they were.)
    if (t.buried && approach != null) {
      Overworld.unbury(person);
      sfx("se_m_sand_attack");
      await Overworld.act([{ who, moves: ["face_" + World.OPPOSITE[facing], "walk_in_place_fast_" + World.OPPOSITE[facing]] }]);
    }
    if (approach != null) {
      await Overworld.act([{ who, moves: ["emote_exclamation_mark"].concat(Array(approach).fill("walk_" + facing)) }]);
      await Overworld.act([{ who: "player", moves: ["face_" + World.OPPOSITE[facing]] }]);
    }
    // (Hoenn's: their own script, Emerald's trainerbattle, says what they say before and after, and goes on to
    // whatever follows: a rematch's registration, a Gym's, ...)
    if (/^EM_/.test(t.id) && isHoenn(player.location.map) && window.HOENN_SCRIPTS.s[person.script]) {
      await runHoenn(person.script, person);
      if (approach && player.flags[t.id]) {
        const [dx, dy] = World.DIRS[facing];
        (player.flags.trainerSpots || (player.flags.trainerSpots = {}))[t.id] = { map: player.location.map, x: person.x + dx * approach, y: person.y + dy * approach, facing };
      }
      return;
    }
    const re = dojoRematch(t.id);
    // (Nothing to say, straight to the battle: no waiting on an empty message.)
    const intro = re ? re.intro : t.intro;
    if (intro && [].concat(intro).length) await say(intro);
    if (!canBattle()) return;
    const team = re ? re.team() : trainerTeam(t.id);
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team, pic: data.pic },
      defeatText: re ? re.defeat : t.defeat, trainerId: t.id, prizeClass: data.className, double: !!t.double });
    if (re && outcome === "won") {
      (player.flags.dojoRematch || (player.flags.dojoRematch = {}))[t.id] = true;
      if (t.id === DOJO_MASTER) { show("world"); await Overworld.resume(); await dojoMaster(); }
    }
    // A beaten trainer who walked over to you stays where they stopped (see
    // visible()) while you're on the map: back in their spot they could shut
    // you in, as Route 25's Hiker Flint does the TM43 corner. Leave the map
    // and come back and they're home again, doing what they did before, as
    // in FireRed.
    if (approach && player.flags[t.id]) {
      const [dx, dy] = World.DIRS[facing];
      (player.flags.trainerSpots || (player.flags.trainerSpots = {}))[t.id] =
        { map: player.location.map, x: person.x + dx * approach, y: person.y + dy * approach, facing };
    }
  }
  // Two trainers who see you at once (Overworld's `second`): both walk up, one then the other, as Emerald's do, and
  // it's a double battle against the two of them, in every region but Orre (where every battle is a double). Not
  // for a trainer who battles two on their own, a rematch, the Battle Pyramid's or one buried in the sand; nor with
  // fewer than two Pokémon able to battle. Then (false) the first one comes alone, and the other after.
  function pairText(person) {
    const t = person.trainer, data = t && window.WORLD_TRAINERS[t.id];
    if (!data || data.double || t.double || t.buried || person.pyramid != null || dojoRematch(t.id) ||
      (player.flags.vsRematch && player.flags.vsRematch[t.id])) return null;
    if (!/^EM_/.test(t.id)) return { intro: t.intro || [], defeat: t.defeat || ["…"] };
    // (Hoenn's: what its trainerbattle says, from Emerald's script.)
    const c = (window.HOENN_SCRIPTS.s[person.script] || []).find((op) => /^trainerbattle/.test(op[0]));
    const labels = !c ? null : c[0] === "trainerbattle_single" ? [c[2], c[3]]
      : c[0] === "trainerbattle" && !/DOUBLE|NO_INTRO/.test(String(c[1])) ? [c[4], c[5]] : null;
    const D = window.HOENN_SCRIPTS.t;
    return labels && { intro: D[labels[0]] || [], defeat: D[labels[1]] || ["…"] };
  }
  async function pairBattle(one, two) {
    if ((window.WORLD_MAPS[player.location.map] || {}).region === "orre" || !canDouble()) return false;
    const tx1 = pairText(one.person), tx2 = pairText(two.person);
    if (!tx1 || !tx2) return false;
    const [d1, d2] = [one, two].map((ev) => window.WORLD_TRAINERS[ev.person.trainer.id]);
    music(inJohto() ? johtoEyes(d1) : d1.music || "mus_encounter_boy");
    for (const ev of [one, two]) {
      await Overworld.act([{ who: "#" + ev.person.id, moves: ["emote_exclamation_mark"].concat(Array(ev.approach).fill("walk_" + ev.facing)) }]);
      await Overworld.act([{ who: "player", moves: ["face_" + World.OPPOSITE[ev.facing]] }]);
    }
    await say(tx1.intro);
    await Overworld.act([{ who: "player", moves: ["face_" + World.OPPOSITE[one.facing]] }]);
    await say(tx2.intro);
    if (!canBattle()) return true;
    const foeOf = (ev, d) => ({ name: d.className + " " + d.name, team: trainerTeam(ev.person.trainer.id), pic: d.pic });
    const outcome = await battle("trainer", { foe: foeOf(one, d1), defeatText: tx1.defeat, trainerId: one.person.trainer.id, prizeClass: d1.className,
      foe2: Object.assign(foeOf(two, d2), { defeatText: tx2.defeat, prizeClass: d2.className }) });
    if (outcome !== "won") return true;
    player.flags[two.person.trainer.id] = true;
    for (const ev of [one, two]) {
      // (Where they stopped, as one who walked up alone: trainerBattle.)
      const [dx, dy] = World.DIRS[ev.facing];
      if (ev.approach) (player.flags.trainerSpots || (player.flags.trainerSpots = {}))[ev.person.trainer.id] =
        { map: player.location.map, x: ev.person.x + dx * ev.approach, y: ev.person.y + dy * ev.approach, facing: ev.facing };
      await afterRocket(ev.person);
      if (gear.wantsNumber(ev.person)) { show("world"); await Overworld.resume(); await gear.beatTrainer(ev.person); }
    }
    return true;
  }
  // FireRed's temporary flags (FLAG_TEMP_*: the trees you've cut, as
  // "map:flag"), cleared when you go to another map.
  const tempFlags = new Set();
  let tempFlagsMap = null;
  function clearTempFlags(map) {
    if (map !== tempFlagsMap) tempFlags.clear();
    tempFlagsMap = map;
  }
  function forgetTrainerSpots(map) {
    const spots = player.flags.trainerSpots;
    if (!spots) return;
    // (Spots saved before they named their map: the trainer's own map.)
    const mapOf = (id) => Object.keys(window.WORLD_MAPS).find((m) => window.WORLD_MAPS[m].people.some((p) => p.trainer && p.trainer.id === id));
    for (const id of Object.keys(spots)) if ((spots[id].map || mapOf(id)) !== map) delete spots[id];
  }

  // A FireRed trainer's party as party records.
  // (Their moves: the last four each learns by its level, not FireRed's sets.)
  function trainerTeam(id) {
    const data = window.WORLD_TRAINERS[id];
    return data.party.map((m) => Object.assign(Party.create(m.species, m.level, { ivs: Math.floor(m.iv * 31 / 255) }),
      m.item ? { item: m.item } : {}));
  }

  // ---------- In-game trades ----------
  //
  // FireRed's sInGameTrades: what they want, what they give (nicknamed, with set
  // IVs: HP, Attack, Defense, Speed, Sp. Atk, Sp. Def), at your Pokémon's level.
  const TRADES = {
    mimien: { flag: "tradedMimien", wants: "Abra", gives: "Mr. Mime", nickname: "Mimien",
      ivs: { hp: 20, atk: 15, def: 17, spe: 24, spa: 23, spd: 22 }, ot: { name: "REYLEY", id: 1985 } },
    // Dontae, in Cerulean (FireRed's INGAME_TRADE_JYNX), with the other trade texts.
    zynx: { flag: "tradedZynx", wants: "Poliwhirl", gives: "Jynx", nickname: "Zynx",
      ivs: { hp: 18, atk: 17, def: 18, spe: 22, spa: 25, spd: 21 }, ot: { name: "DONTAE", id: 36728 },
      text: { ask: "Trade_Text_DoYouHaveMonWouldYouTradeForMon", no: "Trade_Text_WellIfYouDontWantTo",
        wrong: "Trade_Text_ThisIsntMon", thanks: "Trade_Text_Thanks", after: "Trade_Text_HasTradedMonGrownStronger" } },
    // Saige, at the Underground Path's north entrance on Route 5 (FireRed's
    // INGAME_TRADE_NIDORAN; FireRed's holds a Tiny Mushroom, which this game hasn't got).
    // Elyssa, in Vermilion City (FireRed's INGAME_TRADE_FARFETCHD).
    chDing: { flag: "tradedChDing", wants: "Spearow", gives: "Farfetch'd", nickname: "Ch'Ding",
      ivs: { hp: 20, atk: 25, def: 21, spe: 24, spa: 15, spd: 20 }, ot: { name: "ELYSSA", id: 8810 },
      text: { ask: "VermilionCity_House2_Text_DoYouHaveMonWantToTradeForMyMon", no: "VermilionCity_House2_Text_ThatsTooBad",
        wrong: "VermilionCity_House2_Text_ThisIsNoMon", thanks: "VermilionCity_House2_Text_ThankYou",
        after: "VermilionCity_House2_Text_HowIsMyOldMon" } },
    // Turner, upstairs in Route 11's gate (FireRed's INGAME_TRADE_NIDORINOA).
    nina: { flag: "tradedNina", wants: "Nidorino", gives: "Nidorina", nickname: "Nina",
      ivs: { hp: 22, atk: 25, def: 18, spe: 19, spa: 22, spd: 15 }, ot: { name: "TURNER", id: 13637 } },
    // Haden, upstairs in Route 18's gate (FireRed's INGAME_TRADE_LICKITUNG).
    marc: { flag: "tradedMarc", wants: "Golduck", gives: "Lickitung", nickname: "Marc",
      ivs: { hp: 24, atk: 19, def: 21, spe: 15, spa: 23, spd: 21 }, ot: { name: "HADEN", id: 1239 } },
    // In the Pokémon Lab on Cinnabar Island: Garett (FireRed's INGAME_TRADE_SEEL),
    // Clifton (INGAME_TRADE_ELECTRODE) and Norma (INGAME_TRADE_TANGELA, holding Stardust).
    seelor: { flag: "tradedSeelor", wants: "Ponyta", gives: "Seel", nickname: "Seelor",
      ivs: { hp: 24, atk: 15, def: 22, spe: 16, spa: 23, spd: 22 }, ot: { name: "GARETT", id: 9853 } },
    esphere: { flag: "tradedEsphere", wants: "Raichu", gives: "Electrode", nickname: "Esphere",
      ivs: { hp: 19, atk: 16, def: 18, spe: 25, spa: 25, spd: 19 }, ot: { name: "CLIFTON", id: 50298 },
      text: { ask: "Trade_Text_DoYouHaveMonWouldYouTradeForMon", no: "Trade_Text_WellIfYouDontWantTo",
        wrong: "Trade_Text_ThisIsntMon", thanks: "Trade_Text_Thanks", after: "Trade_Text_HasTradedMonGrownStronger" } },
    tangeny: { flag: "tradedTangeny", wants: "Venonat", gives: "Tangela", nickname: "Tangeny", item: "stardust",
      ivs: { hp: 22, atk: 17, def: 25, spe: 16, spa: 23, spd: 20 }, ot: { name: "NORMA", id: 60042 },
      text: { ask: "Trade_Text_DoYouHaveMonWantToTradeForMon", no: "Trade_Text_ThatsTooBad",
        wrong: "Trade_Text_ThisIsNoMon", thanks: "Trade_Text_ThanksYoureAPal", after: "Trade_Text_HowIsMyOldMon" } },
    msNido: { flag: "tradedMsNido", wants: "Nidoran-M", gives: "Nidoran-F", nickname: "Ms. Nido",
      ivs: { hp: 22, atk: 18, def: 25, spe: 19, spa: 15, spd: 22 }, ot: { name: "SAIGE", id: 63184 },
      text: { ask: "Trade_Text_DoYouHaveMonWantToTradeForMon", no: "Trade_Text_ThatsTooBad",
        wrong: "Trade_Text_ThisIsNoMon", thanks: "Trade_Text_ThanksYoureAPal", after: "Trade_Text_HowIsMyOldMon" } }
  };
  // FireRed's trade sequence (ui/trade-scene.js): `mine` leaves for `partner`
  // and `theirs` arrives, from the black and back to it.
  async function tradeScene(mine, theirs, partner) {
    show("scene");
    Screen.say("");
    clearMenu();
    music(null);
    const pic = (r) => ({ url: Screen.spriteUrl(r.species, Party.form(r), false, r.shiny), species: r.species, name: Party.displayName(r) });
    const t = await TradeScene.open(scene, {
      send: pic(mine), receive: pic(theirs), partner,
      say: (text) => Screen.say(fill(text)), cry: (sp) => cry(sp), music, fanfare,
      waitA: () => Screen.printed().then(() => Screen.waitForA())
    });
    try { await t.run(); } finally { t.close(); }
    Screen.say("");
  }
  async function inGameTrade(trade) {
    const f = player.flags, vars = [Party.speciesName(trade.wants), Party.speciesName(trade.gives)];
    const X = Object.assign({ ask: "Trade_Text_LookingForMonWannaTradeForMon", no: "Trade_Text_AwwOhWell",
      wrong: "Trade_Text_WhatThatsNoMon", thanks: "Trade_Text_HeyThanks", after: "Trade_Text_IsntMyOldMonGreat" }, trade.text);
    if (f[trade.flag]) { await say(T(X.after), vars); return; }
    const ask = T(X.ask);
    await say(ask.slice(0, -1), vars);
    if (!(await confirm(fill(ask[ask.length - 1], vars)))) { await say(T(X.no)); return; }
    const mine = await choosePartyFor("Choose a POKéMON.");
    show("world");
    if (!mine) { await say(T(X.no)); return; }
    const i = player.party.indexOf(mine);
    if (mine.species !== trade.wants || mine.egg) { await say(T(X.wrong), vars); return; }
    const theirs = Party.create(trade.gives, mine.level, { nickname: trade.nickname });
    theirs.ivs = Object.assign({}, trade.ivs);
    if (trade.ot) theirs.ot = Object.assign({}, trade.ot);
    if (trade.item) theirs.item = trade.item;   // (what it holds: FireRed's heldItem)
    theirs.met = { level: theirs.level, map: player.location.map, traded: true };
    theirs.hp = Party.maxHp(theirs);
    // (Their trainer, FireRed's OT name in capitals: "REYLEY" -> "Reyley".)
    await tradeFor(i, theirs, trade.ot ? trade.ot.name.charAt(0) + trade.ot.name.slice(1).toLowerCase() : "the trainer");
    f[trade.flag] = true;
    await say(T(X.thanks));
  }
  // Your Pokémon in party slot `i` for `theirs`, as FireRed shows it; then back to the map.
  async function tradeFor(i, theirs, partner) {
    await tradeScene(player.party[i], theirs, partner);
    player.party[i] = theirs;
    Player.markCaught(player, theirs.species);
    // (Back to the map: FireRed's CB2_ReturnToField, the map's music again.)
    show("world");
    music(avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[player.location.map] || {}).music);
    await Overworld.resume();
  }

  // ---------- Oak's parcel and the Pokédex ----------
  //
  // FireRed's PalletTown_ProfessorOaksLab_EventScript_ReceiveDexScene: you hand
  // over the parcel, your rival comes in, Oak fetches the two Pokédexes from
  // the desk at the back and gives you one and five Poké Balls, and your rival
  // heads off. Who moves where depends on which side of Oak you're standing
  // (the way you face him: up, down, left or right).
  async function pokedexScene() {
    const f = player.flags;
    const L = (name) => M("PalletTown_ProfessorOaksLab_Movement_" + name);
    const facing = Overworld.position().facing;
    const north = facing === "up", south = facing === "down", east = facing === "right";
    await say(T("PalletTown_ProfessorOaksLab_Text_OakHaveSomethingForMe"));
    Player.removeItem(player, "oaks-parcel");   // (a save made mid-scene gets it back: see Player.load)
    await say(T("PalletTown_ProfessorOaksLab_Text_DeliveredOaksParcel"));
    await say(T("PalletTown_ProfessorOaksLab_Text_OakCustomBallIOrdered"));
    // In comes Gary, from the door.
    Overworld.addObject(LAB_RIVAL, { x: north ? 5 : 6, y: 10, facing: "up" });
    await Overworld.act(north
      ? [{ who: "player", moves: L("WatchRivalEnterNorth") }, { who: LAB_RIVAL, moves: L("RivalEnter") }]
      : [{ who: LAB_OAK, moves: M("Common_Movement_WalkInPlaceFasterDown") },
        { who: LAB_RIVAL, moves: L("RivalEnter") }].concat(south ? [] : [{ who: "player", moves: L("WatchRivalEnterEastWest") }]));
    // He hasn't met you: Oak introduces you.
    await say(["{RIVAL}: Gramps! I almost forgot!\nWhat did you call me for?", "Wait? Who's this?"]);
    await Overworld.act([{ who: LAB_OAK, moves: ["delay_30"].concat(M("Common_Movement_ExclamationMark"), M("Common_Movement_Delay48")) }]);
    // Oak looks at you, then at your rival.
    if (north) await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    else {
      await Overworld.act([{ who: LAB_OAK, moves: M("Common_Movement_FacePlayer").concat("delay_15") }]);
      await Overworld.act([{ who: LAB_OAK, moves: M("Common_Movement_WalkInPlaceFasterDown") }]
        .concat(south ? [] : [{ who: "player", moves: M(east ? "Common_Movement_WalkInPlaceFasterRight" : "Common_Movement_WalkInPlaceFasterLeft") }]));
    }
    await say(["Oak: This is {PLAYER}. He's starting\nhis Pokémon journey."]);
    await say(T("PalletTown_ProfessorOaksLab_Text_OakHaveRequestForYouTwo"));
    // To the desk at the back, where the Pokédexes are.
    await Overworld.act(south
      ? [{ who: LAB_OAK, moves: L("OakWalkToDeskSouth") }, { who: "player", moves: L("WatchOakWalkToDesk") }, { who: LAB_RIVAL, moves: L("WatchOakWalkToDesk") }]
      : [{ who: LAB_OAK, moves: L("OakWalkToDesk") }].concat(east ? [{ who: "player", moves: L("WatchOakWalkToDeskEast") }] : []));
    await say(T("PalletTown_ProfessorOaksLab_Text_OakPokedexOnDesk"));
    await Overworld.act([{ who: LAB_OAK, moves: ["delay_40"] }]);
    await say(T("PalletTown_ProfessorOaksLab_Text_OakTakeTheseWithYou"));
    await Overworld.act([{ who: LAB_OAK, moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    Overworld.removeObject("LOCALID_POKEDEX_1");
    await Overworld.act([{ who: LAB_OAK, moves: ["delay_10"] }]);
    Overworld.removeObject("LOCALID_POKEDEX_2");
    await Overworld.act([{ who: LAB_OAK, moves: ["delay_25"] }]);
    await Overworld.act([{ who: LAB_OAK, moves: L(south ? "OakBringDexesOverSouth" : "OakBringDexesOver") }]
      .concat(east ? [{ who: "player", moves: L("PlayerFaceOakForDexEast") }] : []));
    await Overworld.act([{ who: LAB_OAK, moves: ["delay_10"] }]);
    f.pokedex = f.parcelDelivered = true;
    await say(T("PalletTown_ProfessorOaksLab_Text_ReceivedPokedexFromOak"));
    await say(T("PalletTown_ProfessorOaksLab_Text_OakCatchMonsForDataTakeThese"));
    Player.addItem(player, "poke-ball", 5);
    await say(T("PalletTown_ProfessorOaksLab_Text_ReceivedFivePokeBalls"));
    await say(T("PalletTown_ProfessorOaksLab_Text_OakExplainCatching"));
    await say(T("PalletTown_ProfessorOaksLab_Text_OakCompleteMonGuideWasMyDream"));
    await say(T("PalletTown_ProfessorOaksLab_Text_RivalLeaveItToMeGramps"));
    await Overworld.act(north ? [{ who: LAB_RIVAL, moves: M("Common_Movement_FacePlayer") }, { who: "player", moves: M("Common_Movement_WalkInPlaceFasterLeft") }]
      : south ? [{ who: LAB_RIVAL, moves: M("Common_Movement_WalkInPlaceFasterUp") }, { who: "player", moves: M("Common_Movement_WalkInPlaceFasterDown") }]
        : [{ who: LAB_RIVAL, moves: M("Common_Movement_FacePlayer") }, { who: "player", moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    await say(["{RIVAL}: I'll be at Route 22.\nLet me see how weak your Pokémon\nare."]);
    await Overworld.act([{ who: LAB_RIVAL, moves: L("RivalExit") }].concat(north ? [{ who: "player", moves: L("WatchRivalEnterEastWest") }] : []));
    Overworld.removeObject(LAB_RIVAL);
  }

  // A Pokémon Center nurse. Blacking out later brings you back to this one.
  // She turns to the machine behind her, your Poké Balls go in and it heals
  // them (FLDEFF_POKECENTER_HEAL), and she turns back.
  async function nurse(mapName, who) {
    const [welcome, ask] = T("Text_WelcomeWantToHealPkmn");
    await say(welcome);
    if (!(await confirm(fill(ask)))) { await say(T("Text_WeHopeToSeeYouAgain")); return; }
    await say(T("Text_TakeYourPkmnForFewSeconds"));
    Screen.say("");
    const id = who && who.localId;
    if (id) await Overworld.act([{ who: id, moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
    await Overworld.pokecenterHeal(player.party.length, () => fanfare("mus_heal"));
    if (id) await Overworld.act([{ who: id, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    player.party.forEach(Party.heal);
    if (centerOf(mapName)) player.flags.lastCenter = mapName;
    await say(T("Text_RestoredPkmnToFullHealth"));
    await say(T("Text_WeHopeToSeeYouAgain"));
  }

  // The old man north of Viridian shows how to catch a Pokémon.
  // FireRed's ViridianCity_EventScript_DoTutorialBattle: his words, then the
  // catching demo (StartOldManTutorialBattle: the slice transition into a
  // battle with a wild Lv. 5 Weedle, BattleScreen.oldManTutorial), then
  // "There! Now tell me, that was educational, was it not?" (FireRed gives
  // the Teachy TV with it; this game has none.)
  async function catchTutorial() {
    await say(T("ViridianCity_Text_ShowYouHowToCatchMons"));
    music("mus_vs_wild");
    await Overworld.battleTransition();
    show("field");
    const weedle = Party.create("Weedle", 5);
    weedle.gender = "M";   // (CreateMaleMon)
    weedle.hp = Party.maxHp(weedle);
    await BattleScreen.oldManTutorial({
      mon: { name: Party.speciesName("Weedle"), species: "Weedle", level: 5, hp: weedle.hp, maxhp: weedle.hp, gender: "M" },
      terrain: battleTerrain({}), bagFemale: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl)
    });
    player.flags.catchTutorial = true;
    show("world");
    await Overworld.resume();
    await say([T("ViridianCity_Text_ThatWasEducationalTakeThis")[0]]);
  }

  // FireRed's move tutors (EventScript_DreamEaterTutor and the like), with
  // their own lines (Text_<Move>Teach, ...Declined, ...WhichMon, ...Taught).
  // In FireRed each teaches its move once; here they all teach it again and
  // again, for `price` each time (TUTOR_PRICE unless given; null: free).
  // `taught`: the label of what they say once it's taught, if not <text>Taught.
  // True when it's taught this time.
  function tutorCanLearn(record, move) {
    const set = window.LEARNSETS_GEN6[record.species] || {};
    return [].concat(set.tm || [], set.tutor || [], (set.levelup || []).map((l) => l[1])).includes(move) ||
      ((window.TUTOR_LEARNERS || {})[move] || []).includes(record.species);
  }
  async function moveTutor(move, flag, text, price, taught) {
    const f = player.flags;
    taught = taught || text + "Taught";
    if (price === undefined) price = TUTOR_PRICE;
    const teach = T(text + "Teach");
    await say(teach.slice(0, -1));
    const declined = () => say(T(text + "Declined"));
    if (!(await confirm(fill(teach[teach.length - 1])))) { await declined(); return; }
    if (price) {
      if (!(await confirm("It'll cost " + money(price) + ". Is that okay?\n(You have " + money(player.money) + ".)"))) { await declined(); return; }
      if (player.money < price) { await say("You don't have enough money."); return; }
    }
    await say(T(text + "WhichMon"));
    // (Each box says whether it can learn the move, as FireRed's tutors' party screen does.)
    const notes = player.party.map((r) => (r.egg || !tutorCanLearn(r, move) ? "NOT ABLE" : Party.knowsMove(r, move) ? "LEARNED" : "ABLE"));
    const record = await choosePartyFor("Teach which {PKMN}?", null, notes);
    show("world");
    if (!record) { await declined(); return; }
    if (record.egg) { await say(T("TwoIsland_House_Text_CantTeachAnEgg")); return; }
    const name = Party.displayName(record);
    if (Party.knowsMove(record, move)) { await say(name + " already knows " + move + "."); return; }
    if (!tutorCanLearn(record, move)) { await say(name + " can't learn " + move + "."); return; }
    await learnMove(record, move);
    if (!Party.knowsMove(record, move)) { await declined(); return; }
    if (price) {
      Player.addMoney(player, -price);
      await say(player.name + " paid " + money(price) + ".");
    }
    f[flag] = true;
    await say(T(taught));
    return true;
  }

  // What the move tutors charge each time they teach.
  const TUTOR_PRICE = 10000;

  // Lavender Town's Name Rater (LavenderTown_House2_EventScript_NameRater):
  // renames a Pokémon you caught yourself; one from a trade keeps its name.
  async function nameRater() {
    const N = (k) => T("LavenderTown_House2_Text_" + k);
    const q = N("WantMeToRateNicknames");
    await say(q.slice(0, -1));
    if (!(await confirm(q[q.length - 1]))) { await say(N("ISeeComeVisitAgain")); return; }
    await say(N("CritiqueWhichMonsNickname"));
    const r = await choosePartyFor("Rate which {PKMN}'s nickname?");
    show("world");
    if (!r) { await say(N("ISeeComeVisitAgain")); return; }
    if (r.egg) { await say(N("ThatIsMerelyAnEgg")); return; }
    const name = Party.displayName(r);
    const traded = (r.met && r.met.traded) || (r.ot && (r.ot.id !== player.trainerId || r.ot.name !== player.name));
    if (traded) { await say(N("TrulyImpeccableName"), [name]); return; }
    const g = N("GiveItANicerName");
    await say(g.slice(0, -1), [name]);
    if (!(await confirm(fill(g[g.length - 1], [name])))) { await say(N("ISeeComeVisitAgain")); return; }
    await say(N("WhatShallNewNicknameBe"));
    const typed = await enterText(Party.speciesName(r.species) + "'s nickname?", name, 10);
    const next = typed || name;
    if (next === Party.speciesName(r.species)) delete r.nickname; else r.nickname = next;
    await say(N(next === name ? "FromNowOnShallBeKnownAsSameName" : "FromNowOnShallBeKnownAsName"), [next]);
  }

  // Prof. Oak's Pokédex rating (PokedexRating_EventScript_Rate): Kanto's seen
  // and owned and his rating, to its fanfare; then the National Pokédex's
  // (which you always have here) and whether it's complete (HasAllMons).
  async function rateDex() {
    const R = (k) => T("PokedexRating_Text_" + k), n = (which, kanto) => String(Player.dexCount(player, which, kanto));
    await say(R("SeenXOwnedY"), [n("seen", true), n("caught", true)]);
    const rating = Player.dexRating(player);
    await sayWithJingle(rating.complete ? "mus_evolved" : "mus_dex_rating", R(rating.text));
    if (!Player.nationalDex(player)) return;
    await say(R("NationalDexSeenXOwnedY"), [n("seen", false), n("caught", false)]);
    if (Player.hasAllMons(player)) { player.flags.oakSawDexCompletion = true; await say(R("YouveCompletedDex")); }
    else await say(R("LookForwardToFilledNationalDex"));
  }

  // Prof. Oak's Aides (FireRed's Aide_EventScript_*): an item for so many kinds
  // of Pokémon caught (GetPokedexCount with VAR_0x8004 0: Kanto's, National
  // Pokédex or not).
  async function aideGift(o) {
    const f = player.flags, label = Bag.name(o.item), A = (k) => T(o.text + k), vars = () => [o.needed, label, Player.dexCount(player, "caught", true)];
    if (f[o.flag]) { await say(A(o.explain), vars()); return; }
    const ask = A(o.ask);
    await say(ask.slice(0, -1), vars());
    if (!(await confirm(fill(ask[ask.length - 1], vars())))) { await say(T("Aide_Text_GetEnoughMonsComeBackForItem"), vars()); return; }
    if (Player.dexCount(player, "caught", true) < o.needed) { await say(T("Aide_Text_HaventCaughtEnoughMonsForItem"), vars()); return; }
    await say(A("GreatHereYouGo"), vars());
    // (A key item you have already stays one: the Exp. Share, which this game starts you with.)
    if (!(Bag.isKeyItem(o.item) && Player.itemCount(player, o.item))) Player.addItem(player, o.item);
    f[o.flag] = true;
    await sayWithJingle(itemJingle(o.item), A(o.received).map((p) => fill(p, vars())));
    await say(A(o.explain), vars());
  }

  // ---------- Badges ----------

  const hasBadge = (id) => player.badges.includes(id);

  // ---------- Route 22's rival ----------
  //
  // FireRed's Route22_EventScript_EarlyRival: Gary walks up from the left,
  // battles (Pidgey, level 5, and Eevee, level 7, as in Yellow), and heads off
  // toward Viridian. Losing doesn't black you out.
  async function route22Rival(side) {
    music("mus_encounter_rival");
    const f = player.flags, R = "LOCALID_ROUTE22_RIVAL";
    Overworld.addObject(R, { x: 25, y: side === "Top" ? 4 : 5, facing: "right" });
    await Overworld.act(side === "Bottom"
      ? [{ who: R, moves: M("Route22_Movement_RivalApproachBottom") }, { who: "player", moves: M("Route22_Movement_PlayerFaceRival") }]
      : [{ who: R, moves: M("Route22_Movement_RivalApproach") }]);
    await Overworld.act([{ who: R, moves: ["delay_6"] }]);
    // FireRed's lines, but he ends with a jab instead of asking about your Pokémon.
    await say(T("Route22_Text_EarlyRivalIntro").slice(0, -1).concat(["Let's see how weak your Pokémon\nare!"]));
    // His team as in Yellow: Pidgey (level 5) and Eevee (level 7).
    const ivs = trainerTeam("TRAINER_RIVAL_ROUTE22_EARLY_SQUIRTLE")[0].ivs.hp;
    const team = [Party.create("Pidgey", 5, { ivs }), Party.create("Eevee", 7, { ivs })];
    const outcome = await battle("trainer", { foe: { name: "Rival " + player.rival, team, pic: "rival_early" },
      defeatText: T("Route22_Text_EarlyRivalDefeat"), noBlackout: true });
    show("world");
    await Overworld.resume();
    if (outcome === "lost") await say(T("Text_RivalVictory"));
    // (Only a win counts: lose, and he's back to battle you the next time you come along Route 22.)
    if (outcome !== "lost") f.route22Rival = true;
    await say(T("Route22_Text_EarlyRivalPostBattle"));
    music("mus_rival_exit");
    await Overworld.act([{ who: R, moves: ["delay_10"].concat(M(side === "Bottom" ? "Route22_Movement_EarlyRivalExitBottom" : "Route22_Movement_EarlyRivalExit")) }]);
    Overworld.removeObject(R);
  }

  // (This game's own: until you've beaten your rival on Route 22, the old man stops you on your way north out of
  // Viridian City, towards Viridian Forest, and sends you west to Route 22, where the rival's waiting.)
  function viridianStopStep() {
    const f = player.flags, at = player.location;
    if (at.map !== "ViridianCity" || at.y !== 4 || at.x < 19 || at.x > 23) return null;
    return f.pokedex && !f.route22Rival && !hasBadge("boulder") ? { type: "viridian-stop" } : null;
  }
  async function viridianOldManStop() {
    sfx("se_pin");
    await Overworld.act([{ who: "player", moves: ["emote_exclamation_mark"] }]);
    await say(["Hold on there, youngster!"]);
    await Overworld.act([{ who: "player", moves: ["face_down"] }]);
    await say(["A young fella came through here a\nlittle while ago. Said his name was\n{RIVAL}.",
      "He went west, to Route 22. Said he'd\nwait for you there, to see how\nstrong your Pokémon are.",
      "You'd best go and see him before you\nhead north to Viridian Forest!"]);
    Screen.say("");
    await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
  }

  // ---------- Leaf, outside Pewter Gym and in Vermilion City ----------
  //
  // Leaf waits a few steps from Pewter Gym's door once you have the Boulder
  // Badge. Coming out (or talking to her), she sees you ("!"), comes over,
  // happy for you: she has a Pokédex from Prof. Oak too, and wants a battle
  // (healing your Pokémon first). Butterfree (level 14: it Terastallizes into
  // a pure Flying type), her starter (level 15, the one weak against yours)
  // and Jigglypuff (level 13). Losing blacks you
  // out and she's waiting again; beat her and she gives you TM54 False Swipe
  // and heads off west, out of sight.
  //
  // In Vermilion City she waits where the road from Route 6 comes in, and
  // battles you as you come down it: Butterfree (18, Terastallizing into a
  // Flying type again), Wigglytuff (20),
  // Nidorina (21) and her starter's evolution (22).
  const LEAF = "LOCALID_LEAF";
  const LEAF_SPOTS = { PewterCity: { x: 19, y: 17, facing: "left" }, VermilionCity: { x: 23, y: 10, facing: "up" } };
  function leafWaiting(map) {
    const f = player.flags;
    if (!f.starter) return false;
    if (map === "PewterCity") return !!(f.TRAINER_LEADER_BROCK && !f.leafPewter);
    if (map === "VermilionCity") return !f.leafVermilion;
    return false;
  }
  // People the game's scenes add to a map (Overworld's ctx.extraPeople).
  // ---------- Mega Stones ----------
  //
  // (This game's own.) Mega Stones lying about Kanto as item balls, each
  // with its own flag (flags["megaStone:<item>"]): Beedrillite in Viridian
  // Forest, Aerodactylite in Mt. Moon, Gyaradosite on Route 25, Slowbronite
  // in the Seafoam Islands, Pinsirite and Scizorite in the Safari Zone (its
  // Center and East areas), and Mewtwonite X
  // and Y beside Mewtwo's spot in Cerulean Cave once it's caught or beaten.
  // Others are gifts (megaStoneGift): Gary's Pidgeotite on Silph Co. 7F,
  // Sabrina's Alakazite and Giovanni's Kangaskhanite with their badges. A
  // save from before these gifts finds Gary's and Giovanni's (who have gone)
  // as item balls where they stood, and Sabrina gives hers when you talk to
  // her again.
  const megaFlag = (item) => "megaStone:" + item;
  const MEGA_STONE_BALLS = [
    { map: "ViridianForest", x: 3, y: 55, item: "beedrillite" },
    { map: "MtMoon_B2F", x: 46, y: 22, item: "aerodactylite" },
    { map: "Route25", x: 41, y: 2, item: "gyaradosite" },
    { map: "SeafoamIslands_1F", x: 3, y: 18, item: "slowbronite" },
    { map: "SafariZone_Center", x: 9, y: 29, item: "pinsirite" },
    { map: "SafariZone_East", x: 44, y: 13, item: "scizorite" },
    { map: "CeruleanCave_B1F", x: 5, y: 12, item: "mewtwonite-x", when: (f) => f.foughtMewtwo },
    { map: "CeruleanCave_B1F", x: 9, y: 12, item: "mewtwonite-y", when: (f) => f.foughtMewtwo },
    // (Left behind for a save that beat them before they gave these.)
    { map: "SilphCo_7F", x: 2, y: 6, item: "pidgeotite", when: (f) => f.silphRival },
    { map: "ViridianCity_Gym", x: 2, y: 2, item: "kangaskhanite", when: (f) => f.giovanniLeft },
    // Legends: Z-A's, for Kanto's Pokémon: where each lives.
    { map: "MtMoon_1F", x: 45, y: 37, item: "clefablite" },
    { map: "Route25", x: 16, y: 6, item: "victreebelite" },
    { map: "PowerPlant", x: 11, y: 38, item: "raichunite-x" },
    { map: "PowerPlant", x: 47, y: 9, item: "raichunite-y" },
    { map: "SeafoamIslands_B4F", x: 33, y: 5, item: "starminite" },
    { map: "SafariZone_West", x: 7, y: 15, item: "dragoninite" }
  ].map((b, i) => Object.assign({ id: 950 + i, script: "Game_EventScript_MegaStone_" + b.item, flag: megaFlag(b.item),
    movement: "face_down", text: null, sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true }, b));
  for (const b of MEGA_STONE_BALLS) ITEM_BALLS.add(b.script);
  const megaStoneBalls = (map) => MEGA_STONE_BALLS.filter((b) => b.map === map && (!b.when || b.when(player.flags)));
  // ---------- Item balls of the older games (this game's own) ----------
  //
  // Every TM lying about as an item ball in Red, Blue and Yellow, or in Gold,
  // Silver and Crystal, is one here too, where those games had it: beside the
  // ball FireRed or HeartGold put in its place (FireRed's Mt. Moon Bullet Seed
  // where Water Gun was), unless that map already has a ball of the same TM.
  // Each spot is open floor you can reach and face, blocking no way through,
  // no ladder or door, no boulder's path and no spinner's or ice's slide.
  // And a Metal Coat in Rock Tunnel. Each has its own flag (flags["itemBall:<map>:<item>"]).
  const OLD_GAME_BALLS = [
    // Red, Blue and Yellow's:
    { map: "MtMoon_1F", x: 11, y: 34, item: "tm123" },   // (Water Gun)
    { map: "MtMoon_B2F", x: 34, y: 5, item: "tm114" },   // (Mega Punch)
    { map: "PowerPlant", x: 41, y: 22, item: "tm33" },   // (Reflect)
    { map: "RocketHideout_B2F", x: 5, y: 8, item: "tm118" },   // (Horn Drill)
    { map: "RocketHideout_B3F", x: 20, y: 14, item: "tm121" },   // (Double-Edge)
    { map: "RocketHideout_B4F", x: 2, y: 6, item: "tm115" },   // (Razor Wind)
    { map: "Route12", x: 18, y: 35, item: "tm124" },   // (Pay Day)
    { map: "Route15", x: 20, y: 5, item: "tm128" },   // (Rage)
    { map: "Route24", x: 11, y: 3, item: "tm72" },   // (Thunder Wave)
    { map: "Route25", x: 27, y: 2, item: "tm127" },   // (Seismic Toss)
    { map: "Route4", x: 67, y: 4, item: "tm116" },   // (Whirlwind)
    { map: "Route9", x: 12, y: 16, item: "tm132" },   // (Teleport)
    { map: "SSAnne_1F_Room2", x: 5, y: 6, item: "tm119" },   // (Body Slam)
    { map: "SafariZone_East", x: 30, y: 18, item: "tm137" },   // (Egg Bomb)
    { map: "SafariZone_North", x: 27, y: 9, item: "tm139" },   // (Skull Bash)
    { map: "SilphCo_10F", x: 2, y: 13, item: "tm26" },   // (Earthquake)
    { map: "SilphCo_5F", x: 0, y: 18, item: "tm120" },   // (Take Down)
    { map: "SilphCo_7F", x: 30, y: 10, item: "tm74" },   // (Swords Dance)
    { map: "VictoryRoad_1F", x: 17, y: 1, item: "tm141" },   // (Sky Attack)
    { map: "VictoryRoad_2F", x: 41, y: 9, item: "tm125" },   // (Submission)
    { map: "VictoryRoad_2F", x: 2, y: 18, item: "tm117" },   // (Mega Kick)
    { map: "VictoryRoad_3F", x: 12, y: 15, item: "tm64" },   // (Explosion)
    // Gold, Silver and Crystal's:
    { map: "BurnedTower_B1F", x: 9, y: 6, item: "tm152" },   // (Endure)
    { map: "DarkCave_Route45Side", x: 13, y: 49, item: "tm150" },   // (Snore)
    { map: "IcePath_B2F", x: 57, y: 10, item: "tm44" },   // (Rest)
    { map: "LakeOfRage", x: 25, y: 2, item: "tm158" },   // (Detect)
    { map: "MtMortar_2F", x: 29, y: 33, item: "tm156" },   // (Defense Curl)
    { map: "RockTunnel_1F", x: 16, y: 29, item: "tm51" },   // (Steel Wing)
    { map: "Route27", x: 88, y: 23, item: "tm22" },   // (Solar Beam)
    { map: "Route35", x: 28, y: 60, item: "tm147" },   // (Rollout)
    { map: "UnionCave_B1F", x: 12, y: 42, item: "tm138" },   // (Swift)
    { map: "VictoryRoad_3F", x: 38, y: 9, item: "tm26" },   // (Earthquake)
    { map: "RockTunnel_B1F", x: 24, y: 19, item: "metal-coat" },   // (Metal Coat)
  // (Johto's are at HGSS's tiles: on its maps as they are now, Heart & Soul's, ui/johto-coords.js. Their scripts and
  // flags keep the HGSS map's name, so one picked up stays picked up.)
  ].map((b) => (window.JohtoCoords && ((window.JOHTO_COORDS || {}).where || {})[b.map] ? Object.assign({ hgssMap: b.map }, b, window.JohtoCoords.toMapFree(b.map, b.x, b.y)) : b))
  .map((b, i) => Object.assign({ id: 1100 + i, script: "Game_EventScript_ItemBall_" + (b.hgssMap || b.map) + "_" + b.item, flag: "itemBall:" + (b.hgssMap || b.map) + ":" + b.item,
    movement: "face_down", text: null, sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true }, b));
  for (const b of OLD_GAME_BALLS) ITEM_BALLS.add(b.script);
  // A Mega Stone handed over: `lines` first, then "… received …!" with the jingle; once.
  async function megaStoneGift(item, lines, from) {
    const f = player.flags;
    if (f[megaFlag(item)]) return false;
    if (lines) await say(lines);
    Player.addItem(player, item);
    f[megaFlag(item)] = true;
    await sayWithJingle(itemJingle(item), fill("{PLAYER} received the " + Bag.name(item) + "\nfrom " + from + "!"));
    return true;
  }

  // Azalea's Gym's Ariados (Heart & Soul's AzaleaTown_Gym_EventScript_Trigger_1-12; HGSS's Spinarak carts ride
  // the same webs): step on a station beside one of the pits' pads and an Ariados comes up the web to the pad;
  // you hop on and it carries you along the web, down the middle of the pit and across, to the station it pairs
  // with, where you hop off. Stations 1-3 below the lower pit, 4-6 above it, 7-9 below the upper one, 10-12 above
  // it, each in the left, middle and right columns; Heart & Soul's pairs: 1-5, 2-6, 3-4, 7-10, 8-12, 9-11.
  const AZALEA_RIDE = { cols: [6, 11, 16], rows: [39, 27, 23, 11], pads: [38, 28, 22, 12], webs: [33, 33, 17, 17],
    pairs: { 1: 5, 5: 1, 2: 6, 6: 2, 3: 4, 4: 3, 7: 10, 10: 7, 8: 12, 12: 8, 9: 11, 11: 9 } };
  async function azaleaRide(n) {
    const R = AZALEA_RIDE, to = R.pairs[n];
    if (!to) return;
    const row = Math.floor((n - 1) / 3), col = (n - 1) % 3, row2 = Math.floor((to - 1) / 3), col2 = (to - 1) % 3;
    const x = R.cols[col], pad = R.pads[row], web = R.webs[row], x2 = R.cols[col2], pad2 = R.pads[row2], stop = R.rows[row2];
    const into = pad < R.rows[row] ? "up" : "down", out = pad2 < stop ? "down" : "up";
    const steps = (from, to, up, down) => Array(Math.abs(to - from)).fill(to < from ? up : down);
    const ARIADOS = "LOCALID_AZALEA_ARIADOS";
    const look = { sprite: "follow/168", width: 32, height: 32, frames: 9, offsetX: -8, inanimate: true };
    await Overworld.act([{ who: "player", moves: ["face_" + into] }]);
    // (It comes up the web to the pad.)
    Overworld.addObject(ARIADOS, { x, y: web, facing: into === "up" ? "down" : "up" }, look);
    await Overworld.act([{ who: ARIADOS, moves: steps(web, pad, "walk_up", "walk_down").concat(["face_" + into]) }]);
    await Overworld.act([{ who: "player", moves: ["delay_16", "delay_16", "jump_" + into] }]);
    sfx("se_bike_hop");
    // (Along the web: to the middle of the pit, across, and on to the far pad.)
    const ride = steps(pad, web, "walk_up", "walk_down").concat(steps(x, x2, "walk_left", "walk_right"), steps(web, pad2, "walk_up", "walk_down"));
    await Overworld.act([{ who: ARIADOS, moves: ride }, { who: "player", moves: ride }]);
    await Overworld.act([{ who: "player", moves: ["jump_" + out] }]);
    sfx("se_bike_hop");
    await Overworld.act([{ who: ARIADOS, moves: steps(pad2, R.webs[row2], "walk_up", "walk_down") }]);
    Overworld.removeObject(ARIADOS);
  }

  // The Magnet Train's doors (Heart & Soul's stations, tools/build-magnet-train.js): walked up into from the
  // platform, past the ticket gate, the ride (ui/magnet-train.js), and you're at the other station's door, off
  // the train and down through its gate (Heart & Soul's ExitTrain). Saffron's runs once you're the Champion.
  const MAGNET_DOORS = {
    GoldenrodCity_MagnetTrainStation_1F: { x: 19, y: 5, to: "SaffronCity_MagnetTrainStation_1F" },
    SaffronCity_MagnetTrainStation_1F: { x: 30, y: 5, to: "GoldenrodCity_MagnetTrainStation_1F" }
  };
  async function magnetTrainBoard() {
    const from = MAGNET_DOORS[player.location.map], to = from && MAGNET_DOORS[from.to];
    if (!to || (from.to === "GoldenrodCity_MagnetTrainStation_1F" && !player.flags.gameClear)) {
      await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
      return;
    }
    sfx("se_exit");
    await magnetTrain.ride(from.to === MagnetTrain.SAFFRON ? 0 : 1, from.to, to.x, to.y);
    await Overworld.act([{ who: "player", moves: ["walk_down", "walk_left", "walk_left", "walk_left", "walk_down", "walk_down", "walk_down"] }]);
  }

  // Goldenrod Underground's switch room (Heart & Soul's GoldenrodCity_UndergroundSwitches, in place of HGSS's
  // gates): three panels on its top wall, each on or off, open and shut its six walls (3 across the top row, 3 the
  // middle); 3, then 2, then 1 opens the way to the warehouse (2, 3 and 5), for good. The walls are shut each time
  // you come in, until then (GoldenrodUnderground1_OnLoad). The walls: the map's patches open1-6.
  const GOLDENROD_SWITCHES = "GoldenrodCity_Tunnel_B2F";
  let goldenrodSw = { on: {}, order: false, open: [] };
  function goldenrodSwitchesEnter() { goldenrodSw = { on: {}, order: false, open: player.flags.goldenrodSwitchesDone ? [2, 3, 5] : [] }; }
  async function goldenrodPanel(n) {
    const S = goldenrodSw;
    let open = [], sound = "se_bang";
    if (S.on[n]) {
      S.on[n] = false;
      if (n !== 1) S.order = false;
    } else {
      S.on[n] = true;
      if (n === 3) { S.order = false; open = [1, 4]; sound = "se_click"; }
      else if (n === 2) {
        if (S.on[1]) { S.order = false; open = [1, 2, 3]; }
        else if (S.on[3]) { S.order = true; open = [2, 3]; sound = "se_click"; }
        else open = [1, 2, 3];
      } else if (S.order) { player.flags.goldenrodSwitchesDone = true; open = [2, 3, 5]; sound = "se_click"; }
      else open = [1, 2, 3];
    }
    sfx(sound);
    await say("SWITCH " + n + (S.on[n] ? " activated." : " deactivated."));
    S.open = open;
    applyPatches(GOLDENROD_SWITCHES);
  }

  function extraPeople(map) {
    const out = megaStoneBalls(map).concat(OLD_GAME_BALLS.filter((b) => b.map === map), isHoenn(map) ? hoennDecor.overlay(map).people : [], map === PYRAMID_FLOOR ? pyramidPeople() : []);
    // The Tradeback Guy, upstairs in every Pokémon Center.
    if (/_PokemonCenter_2F$/.test(map)) {
      out.push(Object.assign({ id: 901, localId: "LOCALID_TRADEBACK_GUY", script: "Game_EventScript_TradebackGuy", x: 12, y: 5,
        movement: "face_down", text: null }, window.WORLD_SPRITES.tradeback));
    }
    // The S.S. Aqua's sailor on Vermilion's dock, once the S.S. Anne's gone and you've been to Johto.
    if (map === "SSAnne_Exterior" && player.flags.ssAnneDeparted && player.flags.johto) {
      out.push(Object.assign({ id: 903, localId: "LOCALID_SS_AQUA_SAILOR", script: "Game_EventScript_SSAquaSailor", x: 33, y: 7,
        movement: "face_left", text: null }, lookOf("sailor")));
    }
    // The Rejuvenator, upstairs in every Pokémon Center too (rejuvenator()).
    if (/_PokemonCenter_2F$/.test(map)) {
      out.push(Object.assign({ id: 902, localId: "LOCALID_REJUVENATOR", script: "Game_EventScript_Rejuvenator", x: 3, y: 5,
        movement: "face_down", text: null }, lookOf("scientist")));
    }
    if (map === "PokemonTower_7F" && megaTowerDue()) out.push(...megaTowerPeople());
    if (map === "CeladonCity_GameCorner_CardRoom") out.push(...cardRoomCrowd());
    if (leafWaiting(map)) {
      const at = LEAF_SPOTS[map];
      out.push(Object.assign({ id: 900, localId: LEAF, script: "Game_EventScript_Leaf", x: at.x, y: at.y,
        movement: "face_" + at.facing, text: null }, window.WORLD_SPRITES.leaf));
    }
    return out;
  }
  function leafPewterDue() {
    const at = player.location;
    const door = window.WORLD_MAPS.PewterCity.warps.find((w) => w.map === "PewterCity_Gym");
    return !!(leafWaiting("PewterCity") && door && at.x === door.x && at.y === door.y && canBattle());
  }
  // Coming down the road from Route 6 into Vermilion City, she sees you.
  function leafVermilionStep() {
    const at = Overworld.position();
    return at.map === "VermilionCity" && leafWaiting("VermilionCity") && at.x >= 22 && at.x <= 24 && at.y >= 4 && at.y <= 7 &&
      canBattle() ? { type: "leaf-vermilion" } : null;
  }
  // Leaf sees you ("!") and walks over to stand next to you.
  async function leafComesOver() {
    const me = Overworld.position(), leaf = Overworld.personPosition(LEAF);
    if (!leaf) return;
    await Overworld.act([{ who: LEAF, moves: M("Common_Movement_ExclamationMark") }]);
    const moves = [];
    let x = leaf.x, y = leaf.y;
    // Along the row first, then the column, to the tile beside you.
    const target = Math.abs(leaf.y - me.y) <= Math.abs(leaf.x - me.x) && leaf.y === me.y
      ? { x: me.x + Math.sign(leaf.x - me.x), y: me.y } : { x: me.x, y: me.y + Math.sign(leaf.y - me.y || 1) };
    while (x !== target.x) { moves.push(x < target.x ? "walk_right" : "walk_left"); x += Math.sign(target.x - x); }
    while (y !== target.y) { moves.push(y < target.y ? "walk_down" : "walk_up"); y += Math.sign(target.y - y); }
    if (moves.length) await Overworld.act([{ who: LEAF, moves }]);
    const face = target.x > me.x ? "right" : target.x < me.x ? "left" : target.y > me.y ? "down" : "up";
    await Overworld.act([{ who: LEAF, moves: ["face_" + World.OPPOSITE[face]] }, { who: "player", moves: ["face_" + face] }]);
  }
  async function leafPewter(talked) {
    music("mus_encounter_rival");
    const f = player.flags;
    if (!talked) await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
    await leafComesOver();
    await say(["Leaf: {PLAYER}! I saw you go into the\nGym. You beat Brock? That's amazing!",
      "Guess what? I went back to see Prof.\nOak, and he gave me a Pokédex too!",
      "I've been filling it in all the way\nhere. Look, I even caught a\nJigglypuff on Route 3!",
      "How about a battle? I want to see\nhow strong your Pokémon have gotten!",
      "But your Pokémon must be tired after\nthe Gym. Let me heal them first!"]);
    player.party.forEach(Party.heal);
    await sayWithJingle("mus_heal", "{PLAYER}'s Pokémon were fully healed!");
    await say("Leaf: There! Now let's battle!");
    // (Her Butterfree, her ace, Terastallizes into a pure Flying type: she has a Tera Orb too.)
    const team = [Object.assign(Party.create("Butterfree", 14), { teraType: "Flying", teraAce: true }), Party.create(RIVAL_PICK[f.starter], 15),
      Party.create("Jigglypuff", 13)];
    const outcome = await battle("trainer", { foe: { name: "Pokémon Trainer " + LAB_RIVAL_NAME, team, pic: "green", tera: true },
      defeatText: ["Wow! You really are strong,\n{PLAYER}!"] });
    if (outcome !== "won") return;
    f.leafPewter = true;
    show("world");
    await Overworld.resume();
    await say(["Leaf: That was a great battle!\nHere, I want you to have this.",
      "It'll help you catch Pokémon for\nyour Pokédex!"]);
    Player.addItem(player, "tm54");
    await sayWithJingle(itemJingle("tm54"), "{PLAYER} received TM54\nfrom Leaf.");
    await say(["Leaf: TM54 is False Swipe! It never\nknocks a Pokémon out. It always\nleaves it with at least 1 HP.",
      "I'm going to keep working on my\nPokédex. Let's both try to fill ours in!",
      "See you later, {PLAYER}!"]);
    await leafLeaves();
  }
  // Off the way she came (west, round you, in Pewter; back up the road in
  // Vermilion), until she's out of sight.
  async function leafLeaves() {
    music("mus_rival_exit");
    const me = Overworld.position(), leaf = Overworld.personPosition(LEAF);
    const away = me.map === "PewterCity" ? ["walk_down"].concat(Array(9).fill("walk_left"), ["walk_up", "walk_up"])
      : (leaf && leaf.x === me.x ? [leaf.x < 24 ? "walk_right" : "walk_left"] : []).concat(Array(8).fill("walk_down"));
    await Overworld.act([{ who: LEAF, moves: away.concat(["set_invisible"]) }]);
    Overworld.removeObject(LEAF);
  }
  // The second-stage starter her lab Pokémon has become by Vermilion.
  const STAGE_TWO = { Bulbasaur: "Ivysaur", Charmander: "Charmeleon", Squirtle: "Wartortle" };
  async function leafVermilion() {
    music("mus_encounter_rival");
    const f = player.flags;
    await leafComesOver();
    await say(["Leaf: {PLAYER}! Over here!",
      "I came through the Underground\nPath too. Isn't Vermilion pretty?\nYou can smell the sea!",
      "My Pokémon have gotten a lot\nstronger since Pewter. Want to see?"]);
    // (Her Butterfree Terastallizes into a pure Flying type again.)
    const team = [Object.assign(Party.create("Butterfree", 18), { teraType: "Flying", teraAce: true }), Party.create("Wigglytuff", 20),
      Party.create("Nidorina", 21), Party.create(STAGE_TWO[RIVAL_PICK[f.starter]], 22)];
    const outcome = await battle("trainer", { foe: { name: "Pokémon Trainer " + LAB_RIVAL_NAME, team, pic: "green", tera: true },
      defeatText: ["Oh, no! You're still a step ahead\nof me, {PLAYER}!"] });
    if (outcome !== "won") return;
    f.leafVermilion = true;
    show("world");
    await Overworld.resume();
    await say(["Leaf: You're really something,\n{PLAYER}!",
      "I heard Lt. Surge's Gym is here.\nHe uses Electric Pokémon, so be\ncareful!",
      "I'm going to go look at the big\nship in the harbor. See you!"]);
    await leafLeaves();
  }

  // ---------- Move Relearner and Move Deleter (each Poké Mart's 2F) ----------
  //
  // The Relearner teaches a Pokémon a move it could have learned by its level,
  // for a Heart Scale (as in Gen 6); the Deleter makes it forget one, free.

  // Level-up moves a Pokémon could know by now but doesn't: its own, and (so
  // no move is missed by evolving early) those its earlier forms learn by its
  // level, e.g. a level 30 Venusaur can relearn Ivysaur's moves up to level 30.
  let preEvolutions = null;
  function evolutionLine(species) {
    if (!preEvolutions) {
      preEvolutions = {};
      for (const [from, list] of Object.entries(window.EVOLUTIONS || {})) for (const e of list) preEvolutions[e.into] = preEvolutions[e.into] || from;
    }
    const line = [species];
    for (let sp = species; preEvolutions[sp] && !line.includes(preEvolutions[sp]); sp = preEvolutions[sp]) line.push(preEvolutions[sp]);
    return line;
  }
  function relearnable(record) {
    const sets = window.LEARNSETS_GEN6 || {};
    const known = new Set(record.moves.map((m) => m.name));
    const out = [];
    for (const species of evolutionLine(record.species)) {
      const set = sets[species] || sets[String(species).split("-")[0]];
      for (const [lvl, move] of (set && set.levelup) || []) {
        if (lvl <= record.level && window.MOVES[move] && !known.has(move) && !out.includes(move)) out.push(move);
      }
    }
    return out;
  }
  async function moveRelearner() {
    await say(["I'm the Move Relearner.", "I can make your Pokémon remember a\nmove it has forgotten, in exchange\nfor a Heart Scale."]);
    if (!Player.itemCount(player, "heart-scale")) { await say("If you bring me a Heart Scale, I'll\nteach your Pokémon a move."); return; }
    for (;;) {
      if (!(await confirm("Shall I teach a Pokémon a move for a Heart Scale? (You have " + Player.itemCount(player, "heart-scale") + ".)"))) return;
      const r = await choosePartyFor("Choose a POKéMON.");
      if (!r) continue;
      if (r.egg) { await say(T("TwoIsland_House_Text_CantTeachAnEgg")); continue; }
      const moves = relearnable(r);
      if (!moves.length) { await say("Sorry… There's no move I can teach\nthat Pokémon."); continue; }
      // FireRed's Move Relearner screen (ui/move-relearner.js); forgetting a
      // move picks it on the Summary screen's move list.
      Screen.say("");
      clearMenu();
      const move = await MoveRelearner.open({
        name: Party.displayName(r), moves, known: r.moves.map((m) => m.name), frame: GameOptions.get().frame,
        forget: (m) => chooseMoveToForget(r, m),
        teach: (m, slot) => Party.teachMove(r, m, slot == null ? undefined : slot)
      });
      if (move && Party.knowsMove(r, move)) {
        Player.removeItem(player, "heart-scale");
        await say("{PLAYER} handed over a Heart Scale\nin exchange.");
        await persist();
      }
      return;
    }
  }
  // Which of `record`'s moves to forget for `move`: FireRed's Summary screen
  // in its move-choosing mode (the new move below the four). -> slot or null.
  function chooseMoveToForget(record, move) {
    Screen.say("");
    clearMenu();
    return SummaryScreen.chooseMove(summaryView(record), move, { frame: GameOptions.get().frame });
  }

  async function moveDeleter() {
    await say(["Uh… Oh, yes, I'm the Move Deleter.", "I can make Pokémon forget their\nmoves."]);
    for (;;) {
      if (!(await confirm("Would you like me to make a Pokémon forget a move?"))) return;
      const r = await choosePartyFor("Choose a POKéMON.");
      if (!r) continue;
      if (r.egg) { await say(T("FuchsiaCity_House3_Text_NoEggShouldKnowMoves")); continue; }
      if (r.moves.length <= 1) { await say(Party.displayName(r) + " seems to know only\none move…"); continue; }
      const i = await ask("Which move should be forgotten?", r.moves.map((m, k) => ({ label: m.name, value: k, className: "type-" + MOVES[m.name].type }))
        .concat([back()]));
      if (i === "back") continue;
      const name = r.moves[i].name;
      if (!(await confirm("Hm! " + Party.displayName(r) + "'s " + name + "? That move should be forgotten?"))) continue;
      r.moves.splice(i, 1);
      await say(["It worked to perfection!", Party.displayName(r) + " has forgotten\n" + name + " completely."]);
      await persist();
      return;
    }
  }

  // ---------- Pallet Town's Sign Lady ----------
  //
  // FireRed's: at first she stands in front of the Trainer Tips sign, reading
  // it ("Hmm… Is that right…"). Talk to her and she notices you ("Oh! Look,
  // look!") and steps aside; until you read it, "Read it, read it!". Once you
  // have, "Signs are useful, aren't they?", and next time you come to Pallet
  // Town she's done: she wanders, raising Pokémon. If you get your starter
  // without having read the sign or opened the menu, she waits by the north
  // exit and recites it to you. flags.signLady: 0 (or none), 1 just read, 2 done.
  const SIGN_LADY = "LOCALID_PALLET_SIGN_LADY";
  let signLadyAside = false;   // stepped aside this visit (FireRed's FLAG_TEMP_2)
  // Where she is is decided when you arrive in Pallet Town (FireRed's
  // OnTransition) and kept for the whole visit, so she stays put after her
  // scene; signLadyVisit is cleared once you're on another map.
  let signLadyVisit = null;
  const leftPallet = (map) => { if (map !== "PalletTown") signLadyVisit = null; };
  function signLadyPlace() {
    if (signLadyVisit) return signLadyVisit;
    const f = player.flags;
    signLadyAside = false;   // (a fresh visit: back in front of the sign)
    if (!f.signLady && f.starter && f.openedMenu) f.signLady = 1;
    if (f.signLady === 1) f.signLady = 2;
    signLadyVisit = f.signLady >= 2 ? true                       // wandering, as on the map
      : f.starter ? { x: 12, y: 2, movement: "face_down" }       // by the north exit
        : { x: 5, y: 15, movement: "face_up" };                  // in front of the sign
    return signLadyVisit;
  }
  async function signLadyShowSign() {
    await say(T("PalletTown_Text_LookCopiedTrainerTipsSign"));
    await say(T("PalletTown_Text_PressStartToOpenMenuCopy"));
    player.flags.openedMenu = true;
    player.flags.signLady = 1;
  }
  async function signLady(person) {
    const f = player.flags;
    const facePlayer = () => Overworld.act([{ who: SIGN_LADY, moves: M("Common_Movement_FacePlayer") }]);
    if (f.signLady >= 2) { await facePlayer(); await say(T("PalletTown_Text_RaisingMonsToo")); return; }
    if (f.signLady === 1) { await facePlayer(); await say(T("PalletTown_Text_SignsAreUsefulArentThey")); return; }
    if (f.starter) { await facePlayer(); await signLadyShowSign(); return; }
    if (signLadyAside) { await facePlayer(); await say(T("PalletTown_Text_ReadItReadIt")); return; }
    await say(person.text);
    await facePlayer();
    await Overworld.act([{ who: SIGN_LADY, moves: M("Common_Movement_ExclamationMark").concat(M("Common_Movement_Delay48")) }]);
    await say(T("PalletTown_Text_OhLookLook"));
    // Out of your way: to the right if you're facing right, otherwise left.
    const right = Overworld.position().facing === "right";
    await Overworld.act([{ who: SIGN_LADY, moves: right ? ["walk_right", "walk_in_place_faster_left"] : ["walk_left", "walk_in_place_faster_right"] }]);
    signLadyAside = true;
  }

  // ---------- Red, at the edge of Viridian Forest ----------
  //
  // Walking up the last stretch of the forest toward Pewter, Red catches up
  // with you from behind, says nothing much, and battles: the starter neither
  // you nor Leaf took, the one that beats yours (level 8), and Pikachu (level
  // 10). Then he goes on past you to Pewter. Losing blacks you out, and he
  // catches up with you there again.
  function redForestStep() {
    const f = player.flags, at = Overworld.position();
    if (f.redForest || !f.starter || at.map !== "ViridianForest") return null;
    return at.y === 12 && (at.x === 4 || at.x === 5) && at.facing === "up" && canBattle() ? { type: "red-forest" } : null;
  }
  async function redForest() {
    music("mus_encounter_rival");
    const f = player.flags, R = "LOCALID_RED", at = Overworld.position();
    Overworld.addObject(R, { x: at.x, y: at.y + 5, facing: "up" }, window.WORLD_SPRITES.red);
    await Overworld.act([{ who: R, moves: ["walk_up", "walk_up", "walk_up", "walk_up"] }]);
    await Overworld.act([{ who: "player", moves: M("Common_Movement_ExclamationMark").concat(M("Common_Movement_WalkInPlaceFasterDown")) }]);
    await say("…");
    const starter = Object.values(STARTER_BALLS).map((b) => b.species).find((sp) => sp !== f.starter && sp !== RIVAL_PICK[f.starter]);
    const team = [Party.create(starter, 8), Party.create("Pikachu", 10)];
    const outcome = await battle("trainer", { foe: { name: "Pokémon Trainer Red", team, pic: "red" }, defeatText: ["…"] });
    if (outcome !== "won") return;
    f.redForest = true;
    show("world");
    await Overworld.resume();
    await say("…");
    // Past you (by the other side of the path) and out toward Pewter.
    await Overworld.act([{ who: R, moves: [at.x === 4 ? "walk_right" : "walk_left", "walk_up", "walk_up", "walk_up", "walk_up", "set_invisible"] }]);
    Overworld.removeObject(R);
  }

  // ---------- Jessie & James, at the end of Mt. Moon ----------
  //
  // As in Yellow: heading down to the last ladder on B2F, Jessie and James
  // climb down it, recite their motto and battle with Ekans, Meowth and
  // Koffing (level 14), a double battle (this game's). Beaten, they pay ₽750 and blast off; beat you, and
  // they wait there again.
  function jessieJamesStep() {
    const f = player.flags, at = Overworld.position();
    if (f.jessieJames || at.map !== "MtMoon_B2F") return null;
    return at.y === 7 && (at.x === 3 || at.x === 4) && at.facing === "down" && canBattle() ? { type: "jessie-james" } : null;
  }
  async function jessieJames() {
    music("mus_encounter_rocket");
    const f = player.flags, J = "LOCALID_JESSIE", K = "LOCALID_JAMES";
    // Down the ladder (5, 10), one after the other, and round in front of you.
    Overworld.addObject(J, { x: 5, y: 10, facing: "down" }, window.WORLD_SPRITES.jessie);
    await Overworld.act([{ who: J, moves: ["walk_left", "walk_left", "walk_up", "walk_up"] }]);
    Overworld.addObject(K, { x: 5, y: 10, facing: "down" }, window.WORLD_SPRITES.james);
    await Overworld.act([{ who: K, moves: ["walk_left", "walk_up", "walk_up"] }]);
    await Overworld.act([{ who: "player", moves: ["emote_exclamation_mark"] }]);
    await say(["Jessie: Hold it right there!", "James: Those fossils are ours, kid!",
      "Jessie: Prepare for trouble!", "James: Make it double!",
      "Jessie: To protect the world from\ndevastation!", "James: To unite all peoples within\nour nation!",
      "Jessie: To denounce the evils of\ntruth and love!", "James: To extend our reach to the\nstars above!",
      "Jessie: Jessie!", "James: James!",
      "Jessie: Team Rocket, blast off at the\nspeed of light!", "James: Surrender now, or prepare to\nfight!",
      "Meowth: Meowth! That's right!"]);
    const team = [Party.create("Ekans", 14), Party.create("Meowth", 14), Party.create("Koffing", 14)];
    // (A double battle, the two of them together; with only one Pokémon that
    // can fight, a single one.)
    const outcome = await battle("trainer", { foe: { name: "Rocket Jessie & James", team, pic: "jessie_james" },
      defeatText: ["Jessie: We can't lose to a kid\nlike this!"], prize: 750, double: canDouble() });
    if (outcome !== "won") return;
    f.jessieJames = true;
    show("world");
    await Overworld.resume();
    await say(["James: This isn't over, twerp!",
      "Jessie, James & Meowth: Looks like\nTeam Rocket's blasting off again!"]);
    // Back up the ladder.
    await Overworld.act([{ who: K, moves: ["walk_down", "walk_down", "walk_right", "set_invisible"] }]);
    await Overworld.act([{ who: J, moves: ["walk_down", "walk_down", "walk_right", "walk_right", "set_invisible"] }]);
    Overworld.removeObject(J);
    Overworld.removeObject(K);
  }

  // ---------- Jessie & James, later on (as in Yellow) ----------
  //
  // Three more ambushes, each a double battle (a single one with only one
  // Pokémon that can fight): stepping out of the Rocket Hideout's elevator
  // corridor toward Giovanni on B4F (Koffing, Meowth and Ekans, level 25),
  // coming up to Mr. Fuji on Pokémon Tower 7F (Meowth, Arbok and Weezing,
  // 27), and stepping off Silph Co. 7F's warp pad on 11F (Weezing, Arbok and
  // Meowth, 31). Each time they come at you from a few steps off, say their
  // piece and battle; beaten, they blast off back the way they came. Beat
  // you, and they're waiting there again.
  const LATER_JESSIE_JAMES = {
    RocketHideout_B4F: {
      flag: "jessieJamesHideout", team: [["Koffing", 25], ["Meowth", 25], ["Ekans", 25]],
      // (Only before Giovanni's beaten; up the way from the elevator.)
      due: (f, at) => !f.TRAINER_BOSS_GIOVANNI && at.y === 19 && (at.x === 16 || at.x === 17) && at.facing === "up",
      cols: [16, 17], dy: -1, steps: 3,
      intro: ["Jessie: Not another step, brat!", "James: How dare you humiliate us\nat Mt. Moon!",
        "Jessie: It's payback time, you brat!"],
      defeat: ["Jessie: Such a dreadful twerp!"],
      after: ["Jessie, James & Meowth: Looks like\nTeam Rocket's blasting off again!"]
    },
    PokemonTower_7F: {
      flag: "jessieJamesTower", team: [["Meowth", 27], ["Arbok", 27], ["Weezing", 27]],
      // (Only while Mr. Fuji's still held there.)
      due: (f, at) => !f.rescuedMrFuji && at.y === 12 && at.x >= 10 && at.x <= 12 && at.facing === "up",
      cols: [10, 12], dy: -1, steps: 3,
      intro: ["Jessie: Stop right there!", "James: Grampa here wanted to\ncomplain, so we're setting him\nstraight.",
        "Jessie: So render yourself invisible,\nor prepare to fight!"],
      defeat: ["James: You will regret this!"],
      after: ["Jessie, James & Meowth: Looks like\nTeam Rocket's blasting off again!"]
    },
    SilphCo_11F: {
      flag: "jessieJamesSilph", team: [["Weezing", 31], ["Arbok", 31], ["Meowth", 31]],
      // (Only before Giovanni's beaten; just off the warp pad from 7F.)
      due: (f, at) => !f.TRAINER_BOSS_GIOVANNI_2 && at.x <= 2 && (at.y === 6 || at.y === 7),
      cols: [0, 2], dy: 1, steps: 3,
      intro: ["Jessie: Hold it right there, brat!", "James: Our Boss is in a meeting!",
        "Jessie: You'd better not disturb\nhim!"],
      defeat: ["James: Like always…"],
      after: ["Jessie: Team Rocket, blast off at\nthe speed of light!", "James: Again…"]
    }
  };
  function laterJessieJamesStep() {
    const f = player.flags, at = Overworld.position(), J = LATER_JESSIE_JAMES[at.map];
    return J && !f[J.flag] && J.due(f, at) && canBattle() ? { type: "jessie-james-later" } : null;
  }
  async function laterJessieJames() {
    const f = player.flags, me = Overworld.position(), J = LATER_JESSIE_JAMES[me.map];
    const JE = "LOCALID_JESSIE", JA = "LOCALID_JAMES";
    music("mus_encounter_rocket");
    // (They end up side by side in front of you, Jessie face to face with you;
    // they come from `steps` tiles further off, from the side of `dy`.)
    const hi = J.cols[1], other = me.x < hi ? me.x + 1 : me.x - 1;
    const row = me.y + J.dy, from = row + J.dy * J.steps;
    const come = J.dy < 0 ? "down" : "up", back = J.dy < 0 ? "up" : "down";
    await Overworld.act([{ who: "player", moves: ["emote_exclamation_mark"] }]);
    await say(J.intro.slice(0, 1));
    Overworld.addObject(JE, { x: me.x, y: from, facing: come }, window.WORLD_SPRITES.jessie);
    Overworld.addObject(JA, { x: other, y: from, facing: come }, window.WORLD_SPRITES.james);
    const walk = Array(J.steps).fill("walk_" + come);
    await Overworld.act([{ who: JE, moves: walk }, { who: JA, moves: walk }]);
    await Overworld.act([{ who: "player", moves: ["face_" + back] }]);
    await say(J.intro.slice(1));
    const team = J.team.map(([sp, lv]) => Party.create(sp, lv));
    const outcome = await battle("trainer", { foe: { name: "Rocket Jessie & James", team, pic: "jessie_james" },
      defeatText: J.defeat, prize: 54 * J.team[0][1], double: canDouble() });
    if (outcome !== "won") return;
    f[J.flag] = true;
    show("world");
    await Overworld.resume();
    await say(J.after);
    // Back the way they came, and gone.
    const leave = Array(J.steps).fill("walk_" + back).concat(["set_invisible"]);
    await Overworld.act([{ who: JE, moves: leave }, { who: JA, moves: leave }]);
    Overworld.removeObject(JE);
    Overworld.removeObject(JA);
    music((window.WORLD_MAPS[me.map] || {}).music);
  }

  // ---------- Cerulean City: your rival ----------
  //
  // Heading north out of Cerulean, Gary comes down from Nugget Bridge for a
  // battle (CeruleanCity_EventScript_Rival): FireRed's Cerulean team, with
  // his Eevee (this game's rival) in place of a starter. Then he walks off
  // round you, south. (FireRed's Fame Checker, which he'd give you, isn't in
  // this game.) Lose and you black out, and he's waiting next time.
  async function ceruleanRival(side) {
    music("mus_encounter_rival");
    const f = player.flags, R = "LOCALID_CERULEAN_RIVAL";
    const x = { Left: 22, Mid: 23, Right: 24 }[side];
    Overworld.addObject(R, { x, y: 0, facing: "down" });
    await Overworld.act([{ who: R, moves: M("CeruleanCity_Movement_RivalEnter") }]);
    await say(T("CeruleanCity_Text_RivalIntro"));
    const base = trainerTeam("TRAINER_RIVAL_CERULEAN_SQUIRTLE");
    const last = base[base.length - 1];
    // (This game's own: his Eevee knows Shadow Ball here, and Terastallizes into a Ghost type.)
    const moves = window.RandomTeam.levelUpMoves("Eevee", last.level).filter((m) => m !== "Shadow Ball").slice(-3).concat(["Shadow Ball"]);
    const eevee = Object.assign(Party.create("Eevee", last.level, { ivs: last.ivs.hp, moves }), { teraType: "Ghost", teraAce: true });
    const team = base.slice(0, -1).concat(eevee);
    const outcome = await battle("trainer", { foe: { name: "Rival " + player.rival, team, pic: "rival_early", tera: true },
      defeatText: T("CeruleanCity_Text_RivalDefeat"), trainerId: "TRAINER_RIVAL_CERULEAN_SQUIRTLE" });
    if (outcome !== "won") return;
    f.ceruleanRival = true;
    show("world");
    await Overworld.resume();
    await say(T("CeruleanCity_Text_RivalPostBattle"));
    music("mus_rival_exit");
    // Round you and away south (the first half of FireRed's walk: he'd come
    // back with the Fame Checker).
    const right = side === "Right";
    const walk = M(right ? "CeruleanCity_Movement_RivalStartExitRight" : "CeruleanCity_Movement_RivalStartExit").slice(0, 8);
    await Overworld.act([{ who: "player", moves: M(right ? "CeruleanCity_Movement_PlayerWatchRivalExitRight" : "CeruleanCity_Movement_PlayerWatchRivalExit") },
      { who: R, moves: walk.concat(["walk_down", "walk_down", "set_invisible"]) }]);
    Overworld.removeObject(R);
    music("mus_fuchsia");
  }

  // ---------- Pokémon Tower ----------
  //
  // Without the Silph Scope, the wild Pokémon in Pokémon Tower are ghosts
  // nobody can identify (FireRed's CheckSilphScopeInPokemonTower): your
  // Pokémon are too scared to fight, so you run.
  let inPurifiedZone = false;
  const towerGhost = () => /^PokemonTower_/.test(player.location.map) && !Player.itemCount(player, "silph-scope");

  // 2F: Gary (PokemonTower_2F_EventScript_Rival): FireRed's team, with
  // Gyarados in Kadabra's place, and his Eevee, an Umbreon by now, in place of
  // a starter. Then he heads off down the stairs.
  async function towerRival(right) {
    const f = player.flags, R = "LOCALID_POKEMON_TOWER_RIVAL";
    music("mus_encounter_rival");
    await Overworld.act([{ who: R, moves: [right ? "walk_in_place_faster_right" : "walk_in_place_faster_down"] },
      { who: "player", moves: [right ? "walk_in_place_faster_left" : "walk_in_place_faster_up"] }]);
    await Overworld.act([{ who: R, moves: ["emote_exclamation_mark", "delay_48"] }]);
    await say(T("PokemonTower_2F_Text_RivalIntro"));
    const base = trainerTeam("TRAINER_RIVAL_POKEMON_TOWER_SQUIRTLE");
    const last = base[base.length - 1];
    const team = base.slice(0, -1).map((r) => (r.species === "Kadabra" ? Party.create("Gyarados", r.level, { ivs: r.ivs.hp }) : r))
      .concat(Party.create("Umbreon", last.level, { ivs: last.ivs.hp }));
    const outcome = await battle("trainer", { foe: { name: "Rival " + player.rival, team, pic: "rival_late" },
      defeatText: T("PokemonTower_2F_Text_RivalDefeat"), trainerId: "TRAINER_RIVAL_POKEMON_TOWER_SQUIRTLE",
      prize: 36 * last.level });   // (FireRed's TRAINER_CLASS_RIVAL_LATE: 9, x4 as this game's prizes are)
    if (outcome !== "won") return;
    f.towerRival = true;
    show("world");
    await Overworld.resume();
    await say(T("PokemonTower_2F_Text_RivalPostBattle"));
    music("mus_rival_exit");
    await Overworld.act([{ who: R, moves: M(right ? "PokemonTower_2F_Movement_RivalExitRight" : "PokemonTower_2F_Movement_RivalExitDown").concat(["set_invisible"]) }]);
    sfx("se_exit");
    Overworld.removeObject(R);
    music((window.WORLD_MAPS[player.location.map] || {}).music);
  }

  // ---------- Prof. Oak's Mega Evolution test (this game's own) ----------
  //
  // With four badges and Pokémon Tower put to rest, one of Prof. Oak's aides
  // finds you as you come out (of the Gym or the Volunteer House, whichever
  // came second) and sends you up the Tower, where Oak and Mr. Fuji wait at
  // the top, and Leaf, Gary and Red in a line before them. Oak is studying
  // Mega Evolution, and tests everyone: Leaf, then Gary, then Red steps away
  // from the others with you, down the floor, to battle you (their aces
  // Terastallize; the others battle off screen), and goes back to their
  // place; after each, Oak comes down to heal your Pokémon and goes back to
  // his. Lose one and you black out as usual, and the
  // test starts over when you come back. Win all three and you go up to Oak
  // for the Mega Ring and the Kanto starters' Mega Stones, and Leaf, Gary and
  // Red each step up for a Mega Ring of their own; then Red, Leaf,
  // Gary and Oak leave down the stairs, and Mr. Fuji, last, comes over with
  // the Gengarite.
  const MEGA_AIDE = "LOCALID_MEGA_AIDE";
  const MEGA_CAST = { oak: "LOCALID_MEGA_OAK", fuji: "LOCALID_MEGA_FUJI", gary: "LOCALID_MEGA_GARY", red: "LOCALID_MEGA_RED", leaf: "LOCALID_MEGA_LEAF" };
  // An overworld look (sprite, size, frames) someone on some map already has.
  function lookOf(sprite) {
    if (window.WORLD_SPRITES[sprite]) return window.WORLD_SPRITES[sprite];
    for (const m of Object.values(window.WORLD_MAPS)) {
      const p = m.people.find((q) => q.sprite === sprite);
      if (p) return { sprite: p.sprite, width: p.width, height: p.height, frames: p.frames };
    }
    return null;
  }
  // The steps for someone ("player" or a local id) to walk from where they
  // stand to `to`, along tiles anyone can walk on (World.walkable) and round
  // everyone else; null when there's no way there.
  function pathTo(who, to) {
    const me = Overworld.position(), from = who === "player" ? me : Overworld.personPosition(who);
    if (!from) return null;
    const others = Overworld.people().filter((q) => who === "player" || q.def.localId !== who);
    const occupied = (m, x, y) => (who !== "player" && me.x === x && me.y === y) || others.some((q) => q.x === x && q.y === y);
    const tree = World.walkable({ map: me.map, x: from.x, y: from.y }, occupied, 80), key = to.x + "," + to.y;
    if (!tree.has(key)) return null;
    return World.pathBack(tree, key).reverse().map((d) => World.OPPOSITE[d]);
  }
  // Walks someone there (`speed`: "" or "fast_"), and turns them to `face`.
  async function walkTo(who, to, face, speed) {
    const path = pathTo(who, to) || [];
    await Overworld.act([{ who, moves: path.map((d) => "walk_" + (speed || "") + d).concat(face ? ["face_" + face] : []) }]);
  }
  // Someone not on the map comes from `from` (out of sight) to the first of
  // `spots` ({ x, y, face }) they can reach, and faces that way: they appear
  // on the last tile of the way there that's off the screen. Returns that
  // tile (to go back out by), or null.
  async function walkIn(who, look, from, spots, speed) {
    const me = Overworld.position();
    Overworld.addObject(who, { x: from.x, y: from.y, facing: "down" }, look);
    let path = null, face = null;
    for (const s of spots) if (s && (path = pathTo(who, s))) { face = s.face; break; }
    if (!path) { Overworld.removeObject(who); return null; }
    const tiles = [{ x: from.x, y: from.y }];
    for (const d of path) { const t = tiles[tiles.length - 1], [dx, dy] = World.DIRS[d]; tiles.push({ x: t.x + dx, y: t.y + dy }); }
    // (A person's picture is two tiles tall: one just below the screen still shows.)
    const offScreen = (t) => t.x < me.x - 7 || t.x > me.x + 7 || t.y < me.y - 4 || t.y > me.y + 6;
    let k = 0;
    tiles.forEach((t, i) => { if (i < tiles.length - 1 && offScreen(t)) k = i; });
    Overworld.addObject(who, { x: tiles[k].x, y: tiles[k].y, facing: path[k] || face }, look);
    await Overworld.act([{ who, moves: path.slice(k).map((d) => "walk_" + (speed || "") + d).concat(["face_" + face]) }]);
    return tiles[k];
  }
  // ... and back out that way, out of sight.
  async function walkOut(who, to, speed) {
    await walkTo(who, to, null, speed);
    await Overworld.act([{ who, moves: ["set_invisible"] }]);
    Overworld.removeObject(who);
  }
  const megaReady = () => player.badges.length >= 4 && !!player.flags.rescuedMrFuji;
  // Stepping out of a building onto a town or route, once both are done.
  function megaAideDue(map) {
    const m = window.WORLD_MAPS[map];
    return megaReady() && !player.flags.megaAideMet && !!m && OUTDOORS.includes(m.type) && !m.realm && canBattle();
  }
  // He comes from just off the screen (within 10 steps), or else from 5 to 7
  // steps away, along tiles he can walk on (World.walkable), and goes back
  // the way he came.
  // (`behind`: from behind you if he can, his last step the way you face,
  // else at least from the side of you your back is to; "only": from behind
  // you or not at all.)
  function megaAideRoute(behind) {
    const at = Overworld.position();
    const people = Overworld.people();
    const tree = World.walkable(at, (m, x, y) => people.some((q) => q.x === x && q.y === y), 10);
    const offScreen = (t) => t.x < at.x - 7 || t.x > at.x + 7 || t.y < at.y - 4 || t.y > at.y + 5;
    const score = (t) => (offScreen(t) && t.dist >= 5 ? 300 - t.dist : t.dist >= 5 && t.dist <= 7 ? 100 + t.dist : t.dist <= 7 ? t.dist : 0);
    const [fx, fy] = World.DIRS[at.facing] || [0, 0];
    const backSide = (t) => (t.x - at.x) * fx + (t.y - at.y) * fy < 0;
    const fromBehind = (key) => World.pathBack(tree, key).slice(-1)[0] === at.facing;
    const pick = (ok) => {
      let best = null;
      for (const [key, t] of tree) if (t.dist >= 1 && ok(key, t) && (!best || score(t) > score(best[1]))) best = [key, t];
      return best;
    };
    const best = behind === "only" ? pick((key, t) => backSide(t) && fromBehind(key) && t.dist >= 3)
      : (behind && (pick((key, t) => backSide(t) && fromBehind(key)) || pick((key, t) => backSide(t)))) || pick(() => true);
    if (!best) return null;
    const toPlayer = World.pathBack(tree, best[0]);   // (the last step would be onto you)
    return { from: best[1], walk: toPlayer.slice(0, -1), face: toPlayer[toPlayer.length - 1] };
  }
  // Coming out of a door, the scenes that start as you walk out ("enter:")
  // begin before you step out onto the street: step out first.
  async function stepOutOfDoor() {
    const at = Overworld.position(), b = World.blockAt(at.map, at.x, at.y).behavior;
    if (b !== World.MB.WARP_DOOR && b !== World.MB.CAVE_DOOR) return;
    const people = Overworld.people();
    const r = World.step({ map: at.map, x: at.x, y: at.y }, "down", (m, x, y) => people.some((q) => q.x === x && q.y === y));
    if (r.ok && !r.warp) await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
  }
  async function megaAide() {
    await stepOutOfDoor();
    const route = megaAideRoute();
    if (!route) return;
    const back = route.walk.slice().reverse().map((d) => "walk_fast_" + World.OPPOSITE[d]);
    Overworld.addObject(MEGA_AIDE, { x: route.from.x, y: route.from.y, facing: route.walk[0] || route.face }, lookOf("scientist"));
    await say("Hey! {PLAYER}! Wait up!");
    await Overworld.act([{ who: MEGA_AIDE, moves: route.walk.map((d) => "walk_fast_" + d).concat(["face_" + route.face]) }]);
    await Overworld.act([{ who: "player", moves: ["face_" + World.OPPOSITE[route.face]] }]);
    await say(["Phew… I've been looking all over\nfor you!",
      "I'm one of Prof. Oak's aides.\nThe Professor has a message for you.",
      "He says he's waiting for you at the\ntop of Pokémon Tower in Lavender\nTown.",
      "He said it was important, so please\nhurry! I'll let him know you're\non your way!"]);
    player.flags.megaAideMet = true;
    await Overworld.act([{ who: MEGA_AIDE, moves: back.concat(["set_invisible"]) }]);
    Overworld.removeObject(MEGA_AIDE);
  }
  const megaTowerDue = () => !!player.flags.megaAideMet && !player.flags.megaTowerDone;

  // The Tera Orb (this game's own): the first time you come out of Viridian Forest's north gate onto Route 2,
  // another of Prof. Oak's aides comes out of the gate behind you, calling after you; he gives you the Tera Orb and
  // goes back the way he came, into the gate, towards the forest.
  const TERA_AIDE = "LOCALID_TERA_AIDE";
  const TERA_GATE_DOORS = [5, 6];   // (Route 2's tiles out of the gate, y 13)
  const teraAideDue = (script) => script === "enter:Route2" && !player.flags.gotTeraOrb && (() => {
    const at = Overworld.position();
    return at.map === "Route2" && at.y === 13 && TERA_GATE_DOORS.includes(at.x);
  })();
  async function teraAide() {
    const at = Overworld.position(), door = TERA_GATE_DOORS.find((x) => x !== at.x);
    // Out of the gate a step, then he calls after you, comes out of the gate too and up beside you.
    await Overworld.act([{ who: "player", moves: ["walk_up"] }]);
    await say("Hey! {PLAYER}! Wait up!");
    Screen.say("");
    sfx("se_door");
    Overworld.addObject(TERA_AIDE, { x: door, y: 13, facing: "up" }, lookOf("scientist"));
    await Overworld.act([{ who: TERA_AIDE, moves: ["walk_fast_up", door < at.x ? "face_right" : "face_left"] }]);
    await Overworld.act([{ who: "player", moves: [door < at.x ? "face_left" : "face_right"] }]);
    await say(["Phew… You're a hard one to\ncatch up with! I came all the way\nthrough the forest after you!",
      "I'm one of Prof. Oak's aides.\nThe Professor has been studying\nTerastallization, from far-off Paldea.",
      "He wanted you to have this Tera Orb!"]);
    Player.addItem(player, "tera-orb");
    player.flags.gotTeraOrb = true;
    await sayWithJingle("mus_obtain_key_item", "{PLAYER} received the Tera Orb\nfrom Prof. Oak's aide!");
    await say(["With it, START on the move menu\nlets one of your Pokémon\nTerastallize, once a battle.",
      "It becomes its Tera Type, and moves\nof that type get stronger!",
      "Using it empties the Orb, but it\nrecharges itself after every\nbattle.", "Good luck, {PLAYER}! I'd better get\nback through the forest."]);
    Screen.say("");
    // Back into the gate, towards Viridian Forest.
    await Overworld.act([{ who: TERA_AIDE, moves: ["walk_down", "set_invisible"] }]);
    sfx("se_door");
    Overworld.removeObject(TERA_AIDE);
  }
  // Who's at the top of the Tower, waiting: Prof. Oak and Mr. Fuji at the
  // top, and Leaf, Gary and Red in a line, facing them, with a place left in
  // the middle for you (MEGA_SPOT), two steps before Oak.
  const MEGA_SPOT = { x: 11, y: 7 };
  const MEGA_PLACES = { oak: [11, 4, "down"], fuji: [12, 4, "down"], leaf: [9, 7, "up"], gary: [10, 7, "up"], red: [12, 7, "up"] };
  // Where you and the one you're battling stand, apart from the others: down
  // the floor, face to face.
  const MEGA_ARENA = { you: { x: 11, y: 11 }, them: { x: 11, y: 9 } };
  function megaTowerPeople() {
    const sprites = { oak: "prof_oak", fuji: "mr_fuji", gary: "blue", red: "red", leaf: "leaf" };
    return Object.entries(MEGA_PLACES).map(([who, [x, y, facing]], i) => Object.assign({ id: 910 + i, localId: MEGA_CAST[who],
      script: "Game_EventScript_MegaTower", x, y, movement: "face_" + facing, text: null }, lookOf(sprites[who])));
  }
  // Leaf's team: her lab starter (second stage) and the Pokémon that covers its weakness.
  const LEAF_FOURTH = { Bulbasaur: "Vulpix", Squirtle: "Gloom", Charmander: "Poliwhirl" };
  const leafMegaTeam = () => {
    const starter = RIVAL_PICK[player.flags.starter] || "Bulbasaur";
    return [["Butterfree", 27], ["Wigglytuff", 28], ["Nidorina", 29], [LEAF_FOURTH[starter], 30], [STAGE_TWO[starter], 31]];
  };
  // In the order you battle them. Each one's ace Terastallizes, as it has
  // before (`tera`): Leaf's Butterfree into a Flying type, Gary's Eevee, now
  // an Umbreon, into a Ghost type, and Red's Pikachu (knowing Surf) into a
  // Water type.
  const MEGA_RIVALS = [
    { key: "leaf", name: () => "Pokémon Trainer " + LAB_RIVAL_NAME, pic: "green", music: "mus_encounter_rival",
      team: leafMegaTeam, tera: ["Butterfree", "Flying"],
      intro: ["Leaf: My turn, {PLAYER}! I've been\ntraining really hard since\nVermilion!", "This time I'm going to win!"],
      defeat: ["Leaf: Aww! You're amazing,\n{PLAYER}!"],
      after: ["Leaf: That was so much fun!\nI can't wait to see what Mega\nEvolution is!"] },
    { key: "gary", name: () => "Rival " + player.rival, pic: "rival_late", music: "mus_encounter_rival",
      team: () => [["Pidgeotto", 27], ["Growlithe", 28], ["Gyarados", 29], ["Exeggutor", 30], ["Umbreon", 31]], tera: ["Umbreon", "Ghost"],
      intro: ["{RIVAL}: Heh! Gramps called you too,\nhuh, {PLAYER}?", "Doesn't matter. I'll pass his test\nby beating you first! Let's go!"],
      defeat: ["{RIVAL}: What!? Not again!"],
      after: ["{RIVAL}: Tch… Fine. You passed.\nBut I'm not done getting stronger!"] },
    { key: "red", name: () => "Pokémon Trainer Red", pic: "red", music: "mus_encounter_rival",
      team: () => [["Pikachu", 27], ["Charmeleon", 28], ["Wartortle", 29], ["Ivysaur", 30], ["Espeon", 31]], tera: ["Pikachu", "Water"],
      intro: ["Red: …", "Red stepped forward, ready to battle!"],
      defeat: ["…"],
      after: ["Red: …", "Red gave a small nod."] }
  ];
  // Someone at the top of the Tower walks down to the stairs and is gone.
  async function megaLeaves(who) {
    await walkTo(who, { x: 11, y: 15 });
    await Overworld.act([{ who, moves: ["walk_down", "set_invisible"] }]);
    sfx("se_exit");
    Overworld.removeObject(who);
  }
  async function megaTower() {
    const f = player.flags, beaten = f.megaBeaten || (f.megaBeaten = {});
    const OAK_ = MEGA_CAST.oak, FUJI = MEGA_CAST.fuji;
    music("mus_oak");
    // Up the aisle, to stand before Prof. Oak, and everyone looks to him.
    await walkTo("player", MEGA_SPOT, "up");
    await Overworld.act(MEGA_RIVALS.map((r) => ({ who: MEGA_CAST[r.key], moves: ["face_up"] })));
    if (!f.megaTalked) {
      await say(["Oak: Ah, {PLAYER}! There you are!\nThank you for coming.",
        "Mr. Fuji was kind enough to let us\nmeet here, at the top of the Tower.",
        "Now then! Have you ever heard of\nsomething called Mega Evolution?",
        "It's a phenomenon beyond ordinary\nevolution. When a Trainer and their\nPokémon share a truly deep bond…",
        "…and the right mysterious stones are\nat hand, a Pokémon can transform\nfor the length of a battle!",
        "I've been studying it for some time,\nand I need everyone's help to\nunlock its secrets.",
        "But first, I have to test you all!\nYou'll each battle one another.",
        "Don't worry, I'll heal your Pokémon\nbetween battles. Show me what you\ncan do!"]);
      await say(["Mr. Fuji: Heh heh… The bond between\npeople and Pokémon…",
        "That is the heart of all of this.\nI am eager to see it."]);
      f.megaTalked = true;
    } else {
      await say(["Oak: Ah, {PLAYER}! Ready to try my\ntest again?", "You'll have to win all three battles.\nI'll heal your Pokémon. Good luck!"]);
    }
    player.party.forEach(Party.heal);
    await sayWithJingle("mus_heal", "Prof. Oak healed {PLAYER}'s Pokémon!");
    // One at a time: you and the next one step away from the others, down
    // the floor, to battle (MEGA_ARENA); then they go back to their place,
    // Prof. Oak comes down to heal your Pokémon and goes back to his, and
    // you go back to yours.
    const [ox, oy] = MEGA_PLACES.oak;
    for (const r of MEGA_RIVALS) {
      if (beaten[r.key]) continue;
      const who = MEGA_CAST[r.key], [hx, hy] = MEGA_PLACES[r.key];
      music(r.music);
      await walkTo("player", MEGA_ARENA.you, "up");
      await walkTo(who, MEGA_ARENA.them, "down");
      await say(r.intro);
      const team = r.team().map(([sp, lv]) => Party.create(sp, lv));
      if (r.tera) {
        const i = team.findIndex((m) => m.species === r.tera[0]);
        if (i >= 0) team[i] = r.tera[0] === "Pikachu" ? surfingPikachu(team[i].level) : Object.assign(team[i], { teraType: r.tera[1], teraAce: true });
      }
      const outcome = await battle("trainer", { foe: { name: r.name(), team, pic: r.pic, tera: !!r.tera }, defeatText: r.defeat,
        prize: 36 * team[team.length - 1].level });
      // (Blacked out: the whole test again next time.)
      if (outcome !== "won") { delete f.megaBeaten; await persist(); return; }
      show("world");
      await Overworld.resume();
      beaten[r.key] = true;
      await say(r.after);
      music("mus_oak");
      await walkTo(who, { x: hx, y: hy }, "up");
      await walkTo(OAK_, { x: MEGA_ARENA.you.x, y: MEGA_ARENA.you.y - 1 }, "down");
      await Overworld.act([{ who: "player", moves: ["face_up"] }]);
      player.party.forEach(Party.heal);
      await sayWithJingle("mus_heal", "Prof. Oak healed {PLAYER}'s Pokémon!");
      await walkTo(OAK_, { x: ox, y: oy }, "down");
      await walkTo("player", MEGA_SPOT, "up");
    }
    music("mus_oak");
    await say(["Oak: Splendid! Simply splendid!",
      "While you were battling, Red, Leaf and\n{RIVAL} had quite the battles among\nthemselves, too.",
      "You've all passed my test! Each of\nyou shares a real bond with your\nPokémon.",
      "And {PLAYER}, you won every one of\nyour battles! I knew I could count\non you.",
      "Come here a moment, {PLAYER}."]);
    // Up to Prof. Oak for the Mega Ring and the Mega Stones, then back.
    await walkTo("player", { x: ox, y: oy + 1 }, "up");
    await say(["Oak: Here! I want you to have this.\nIt's a Mega Ring."]);
    Player.addItem(player, "mega-ring");
    await sayWithJingle("mus_obtain_key_item", "{PLAYER} received the Mega Ring\nfrom Prof. Oak!");
    await say(["Oak: The Key Stone set in the ring\nresonates with a Mega Stone held\nby a Pokémon.",
      "When the bond between you is strong\nenough, that Pokémon can Mega\nEvolve in battle! Once a battle.",
      "And these are the Mega Stones for\nthe three Pokémon I give to new\nTrainers in Pallet Town."]);
    for (const stone of ["venusaurite", "charizardite-x", "charizardite-y", "blastoisinite"]) {
      Player.addItem(player, stone);
      await sayWithJingle("mus_obtain_item", "{PLAYER} received " + article(Bag.name(stone)) + "!");
    }
    await say(["Oak: Venusaurite for Venusaur,\nCharizardite X and Y for Charizard,\nand Blastoisinite for Blastoise.",
      "Have your Pokémon hold one, and\npress START when you choose a move\nto Mega Evolve!"]);
    const back = Array(MEGA_SPOT.y - oy - 1).fill("walk_down");
    await Overworld.act([{ who: "player", moves: ["lock_facing_direction"].concat(back, ["unlock_facing_direction"]) }]);
    // Then a Mega Ring for each of the others: one at a time, they step up
    // to him, and back to their place.
    await say(["Oak: And you three passed my test,\ntoo! Leaf, {RIVAL}, Red!", "I have a Mega Ring for each of you\nas well. Come here!"]);
    for (const r of MEGA_RIVALS) {
      const who = MEGA_CAST[r.key], [hx, hy] = MEGA_PLACES[r.key];
      await walkTo(who, { x: ox, y: oy + 1 }, "up");
      await sayWithJingle("mus_obtain_key_item", (r.key === "gary" ? "{RIVAL}" : r.key === "red" ? "Red" : LAB_RIVAL_NAME) + " received a Mega Ring\nfrom Prof. Oak!");
      await walkTo(who, { x: hx, y: hy }, "up");
    }
    // Off they go: Red without a word, Leaf and Gary with one.
    const RED = MEGA_CAST.red, LEAF_ = MEGA_CAST.leaf, GARY = MEGA_CAST.gary;
    await Overworld.act([{ who: RED, moves: ["face_player"] }]);
    await say(["Red: …"]);
    await megaLeaves(RED);
    await Overworld.act([{ who: LEAF_, moves: ["face_player"] }]);
    await say(["Leaf: We all got Mega Rings! You\ntotally earned yours, {PLAYER}!",
      "I'll keep training with my Pokémon,\ntoo. Now I just need to find a\nMega Stone of my own!",
      "See you around, {PLAYER}! Take\ncare of yourself!"]);
    await megaLeaves(LEAF_);
    music("mus_rival_exit");
    await Overworld.act([{ who: GARY, moves: ["face_player"] }]);
    await say(["{RIVAL}: Hmph! So Gramps gave us\nall Mega Rings. Doesn't matter.", "I'll be the one who masters Mega\nEvolution first!",
      "Next time we battle, I'll be the one\nwho comes out on top. Count on it!",
      "Smell ya later, {PLAYER}!"]);
    await megaLeaves(GARY);
    music("mus_oak");
    await say(["Oak: Well! I must get back to my\nresearch. There's still so much to\nlearn about Mega Evolution!",
      "{PLAYER}, keep training, and keep\nfilling in that Pokédex! I'll be\ncalling on you again.",
      "Oh! And let me heal your Pokémon\nbefore I go."]);
    player.party.forEach(Party.heal);
    await sayWithJingle("mus_heal", "Prof. Oak healed {PLAYER}'s Pokémon!");
    await megaLeaves(OAK_);
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    // Mr. Fuji, last: he comes over to you.
    const [fx, fy] = [MEGA_SPOT.x, MEGA_SPOT.y - 1];
    await walkTo(FUJI, { x: fx, y: fy }, "down");
    await Overworld.act([{ who: "player", moves: ["face_up"] }]);
    await say(["Mr. Fuji: Young one… I have watched\nmany Trainers come and go from\nthis Tower.",
      "But the way you battle alongside your\nPokémon… I was truly impressed.",
      "Please, take this. A Pokémon that\nonce called this Tower home would\nsurely want you to have it."]);
    Player.addItem(player, "gengarite");
    await sayWithJingle("mus_obtain_item", "{PLAYER} received the Gengarite\nfrom Mr. Fuji!");
    await say(["Mr. Fuji: It is the Mega Stone for\nGengar. Treat it kindly.",
      "Now, I must return to the Pokémon\nHouse. The little ones will be\nwaiting for me."]);
    await megaLeaves(FUJI);
    f.megaTowerDone = true;
    await persist();
  }

  // 6F: the restless ghost (PokemonTower_6F_EventScript_MarowakGhost). Without
  // the Silph Scope it's a Ghost you can only run from, and it pushes you
  // back; with it, it's Cubone's mother, a Marowak (Lv. 30): beat it and its
  // spirit is calmed. (This game's own: she can be caught, too, as any wild
  // Pokémon; caught, she's at rest all the same, and the way up is clear.)
  async function marowakGhost() {
    const f = player.flags, scope = !!Player.itemCount(player, "silph-scope");
    await say(T("PokemonTower_6F_Text_BeGoneIntruders"));
    if (!canBattle()) return;
    if (scope) await say(["Silph Scope unveiled the Ghost's\nidentity!", "The Ghost was Marowak!"]);
    const mon = Party.create("Marowak", 30);
    const outcome = await battle("wild", { foe: { name: "Wild", team: [mon] }, ghost: !scope, noBlackout: false });
    show("world");
    await Overworld.resume();
    if (scope && (outcome === "won" || outcome === "caught")) {
      await say(T("PokemonTower_6F_Text_GhostWasCubonesMother"));
      if (outcome === "won") {
        cry("Marowak");
        await say(T("PokemonTower_6F_Text_MothersSpiritWasCalmed"));
      }
      f.marowakCalmed = true;
      return;
    }
    if (outcome !== "lost") await Overworld.act([{ who: "player", moves: ["walk_up"] }]);
  }

  // ---------- Route 24: Nugget Bridge ----------
  //
  // At the end of the bridge a man congratulates you on beating the five
  // contest Trainers, gives you a Nugget, then asks you to join Team Rocket,
  // and won't take no for an answer (Route24_EventScript_BattleRocket).
  // `side`: the trigger you stepped on ("left": he walks over to you), or null
  // when you talked to him.
  async function nuggetBridgeRocket(side) {
    const f = player.flags, R = "LOCALID_ROUTE24_ROCKET";
    if (side === "left") await Overworld.act([{ who: R, moves: M("Route24_Movement_RocketApproachPlayer") }]);
    else if (side === "right") await Overworld.act([{ who: R, moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
    if (side) await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
    await say(T("Route24_Text_JustEarnedFabulousPrize"));
    if (!f.gotNugget) {
      Player.addItem(player, "nugget");
      f.gotNugget = true;
      await sayWithJingle(itemJingle("nugget"), T("Route24_Text_ReceivedNuggetFromMysteryTrainer"));
    }
    music("mus_encounter_rocket");
    await say(T("Route24_Text_JoinTeamRocket"));
    if (!canBattle()) return;
    const data = window.WORLD_TRAINERS.TRAINER_TEAM_ROCKET_GRUNT_6;
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam("TRAINER_TEAM_ROCKET_GRUNT_6"), pic: data.pic },
      defeatText: T("Route24_Text_RocketDefeat"), trainerId: "TRAINER_TEAM_ROCKET_GRUNT_6" });
    if (outcome !== "won") return;
    f.nuggetBridgeRocket = true;
    show("world");
    await Overworld.resume();
    await say(T("Route24_Text_YoudBecomeTopRocketLeader"));
  }

  // ---------- Cerulean City: the robbed house's yard ----------
  //
  // The Rocket who robbed the house waits in its yard (out through the hole in
  // its back wall). Beat him and he gives back TM28 (Dig) and runs off
  // (CeruleanCity_EventScript_Grunt). `side`: the trigger you stepped on
  // ("top" or "bottom", he turns to you), or null when you talked to him.
  async function ceruleanGrunt(side) {
    const f = player.flags, G = "LOCALID_CERULEAN_GRUNT", ID = "TRAINER_TEAM_ROCKET_GRUNT_5";
    if (side) {
      await Overworld.act([{ who: G, moves: M(side === "top" ? "Common_Movement_WalkInPlaceFasterUp" : "Common_Movement_WalkInPlaceFasterDown") }]);
      await Overworld.act([{ who: "player", moves: M(side === "top" ? "Common_Movement_WalkInPlaceFasterDown" : "Common_Movement_WalkInPlaceFasterUp") }]);
    }
    if (!f[ID]) {
      music("mus_encounter_rocket");
      await say(T("CeruleanCity_Text_GruntIntro"));
      if (!canBattle()) return;
      const data = window.WORLD_TRAINERS[ID];
      const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(ID), pic: data.pic },
        defeatText: T("CeruleanCity_Text_GruntDefeat"), trainerId: ID });
      if (outcome !== "won") return;
      show("world");
      await Overworld.resume();
    }
    await say(T("CeruleanCity_Text_OkayIllReturnStolenTM"));
    Player.addItem(player, "tm28");
    f.gotTM28 = true;
    await sayWithJingle(itemJingle("tm28"), T("CeruleanCity_Text_RecoveredTM28FromGrunt"));
    await say(T("CeruleanCity_Text_BetterGetMovingBye"));
    Overworld.removeObject(G);
  }

  // ---------- HMs outside battle (game/field-moves.js) ----------
  //
  // A field move can be used by a Pokémon that knows it, or that could learn
  // it from its HM while you have the HM, once you have the badge it needs
  // (FireRed's sFieldMoves). From the party screen, or by A in front of a
  // tree, a rock, a boulder, the water or a waterfall (FireRed's scripts).
  const usedMove = (mon, move) => Party.displayName(mon) + " used " + move + "!";
  const facingScript = (script) => { const a = Overworld.ahead(); return a.person && a.person.script === script ? a.person : null; };
  let strengthOn = false;   // (FLAG_SYS_USE_STRENGTH: until you leave the map)

  // From the party screen: why it can't be used here (FireRed's messages), or
  // what to do once the menus close.
  function fieldMoveHere(move, mon) {
    const here = window.WORLD_MAPS[player.location.map] || {}, a = Overworld.ahead(), surfing = Overworld.avatar() === "surf";
    switch (move) {
      case "Flash": {
        // (In the middle of the Ancient Tomb: Registeel's doorway opens.)
        const tomb = braillePuzzle("Flash");
        if (tomb) return async () => { await say(usedMove(mon, "Flash")); await tomb(); };
        // (In front of the Ruins of Alph's wall that says LIGHT: Task_UseFlashInField.)
        const js = JohtoAlph.chamberReaction(player.location.map, Overworld.position(), "flash");
        if (js) return async () => { await say(usedMove(mon, "Flash")); sfx("se_m_reflect"); johto.setVar("VAR_SPECIAL_RESULT", 0); await runJohto(js); };
        if (!Overworld.isDark()) return "Can't use that here.";
        return async () => { await say(usedMove(mon, "Flash")); sfx("se_m_reflect"); Overworld.flash(); };
      }
      case "Cut": {
        // (Ruin Valley's dotted door, from below: CutMoveRuinValleyCheck.)
        if (Sevii.cutOpensDottedHole(player.flags, Overworld.position())) return () => cutDottedHoleDoor(mon);
        const tree = facingScript("EventScript_CutTree");
        if (!tree) return "There's nothing to Cut.";
        return async () => { await say(usedMove(mon, "Cut")); cutDown(tree); };
      }
      case "Fly":
        // (Nor out of the Pokémon realm: the Realm Hub, Domino City.)
        if (!OUTDOORS.includes(here.type) || here.realm) return "Can't use that here.";
        return () => fly(mon);
      case "Strength": {
        if (!facingScript("EventScript_StrengthBoulder")) return "Can't use that here.";
        return () => useStrength(mon);
      }
      case "Surf":
        if (surfing) return "You're already surfing.";
        if (!a.water) return "No surfing here!";
        return () => startSurfing(mon);
      case "Dive":
        if (!diveTarget(Overworld.avatar())) return "Can't use that here.";
        return () => dive(true);
      case "Rock Smash": {
        // (Before the Desert Ruins' braille: Regirock's doorway opens.)
        const ruins = braillePuzzle("Rock Smash");
        if (ruins) return async () => { await say(usedMove(mon, "Rock Smash")); await ruins(); };
        const rock = facingScript("EventScript_RockSmash");
        if (!rock) return "Can't use that here.";
        return async () => { await say(usedMove(mon, "Rock Smash")); await smashRock(rock); };
      }
      case "Waterfall":
        if (!surfing || a.behavior !== World.MB.WATERFALL) return "Can't use that here.";
        return async () => { await say(Party.displayName(mon) + " used Waterfall."); await climbWaterfall(); };
      case "Whirlpool":
        if (!surfing || a.behavior !== World.MB.WHIRLPOOL) return "Can't use that here.";
        return async () => { await say(Party.displayName(mon) + " used Whirlpool."); await crossWhirlpool(); };
      case "Rock Climb":
        if (surfing || !World.climbable(a.behavior, a.facing)) return "Can't use that here.";
        return async () => { await say(usedMove(mon, "Rock Climb")); await climbRocks(); };
      // FireRed's FldEff_TeleportWarpOut: from where Fly could go, back to the last Pokémon Center you were in (outside
      // it, where Fly lands), as blacking out would take you (in Hoenn, only to Hoenn's; or your room there, or home).
      case "Teleport": {
        if (!OUTDOORS.includes(here.type) || here.realm) return "Can't use that here.";
        const to = teleportTarget();
        if (!to || (to.map === player.location.map && to.x === Overworld.position().x && to.y === Overworld.position().y)) return "Can't use that here.";
        return async () => {
          await say(usedMove(mon, "Teleport"));
          Screen.say("");
          Overworld.setAvatar("walk");
          await Overworld.escapeRopeOut();
          await Overworld.escapeRopeIn(Object.assign({ facing: "down" }, to));
          await persist();
        };
      }
      case "Dig": {
        // (Under the Sealed Chamber's DIG HERE: its wall gives way.)
        const wall = braillePuzzle("Dig");
        if (wall) return async () => { await say(usedMove(mon, "Dig")); await wall(); };
        // (Anywhere else you could use an Escape Rope, out as it takes you: FireRed's FldEff_UseDig.)
        const to = player.flags.escapeWarp;
        if (!here.allowEscaping || !to) return "Can't use that here.";
        return async () => {
          await say(usedMove(mon, "Dig"));
          Screen.say("");
          await Overworld.escapeRopeOut();
          await Overworld.escapeRopeIn({ map: to.map, x: to.x, y: to.y, facing: "down" });
          await persist();
        };
      }
    }
    return "Can't use that here.";
  }
  // The party screen's answer when a Pokémon can't use it at all yet.
  function fieldMoveBlocked(mon, move) {
    const why = FieldMoves.check(player, mon, move);
    if (why === "badge") return "This can't be used until a new\nBadge is obtained.";
    if (why === "hm") return "You need " + Bag.name(FieldMoves.hmFor(move)) + " to use " + move + ".";
    if (why) return Party.displayName(mon) + " can't use " + move + ".";
    return null;
  }

  // Cut: a small tree, cut down; it grows back when you come back to the
  // map, as in FireRed (EventScript_CutTree).
  async function cutTree(person) {
    const mon = FieldMoves.user(player, "Cut");
    if (!mon) { await say(T("Text_TreeCanBeCutDown")); return; }
    const q = T("Text_CutTreeDown");
    await say(q.slice(0, -1));
    if (!(await confirm(fill(q[q.length - 1])))) return;
    await say(usedMove(mon, "Cut"));
    cutDown(person);
  }
  function cutDown(person) {
    sfx("se_m_cut");
    if (person.flag) tempFlags.add(player.location.map + ":" + person.flag);
    Overworld.removePerson(person);
  }

  // Rock Smash (EventScript_RockSmash): the rock breaks (back when you return),
  // and a Pokémon may be hiding under it (RockSmashWildEncounter: the map's
  // Rock Smash Pokémon, at its rate out of 100).
  async function rockSmash(person) {
    const mon = FieldMoves.user(player, "Rock Smash");
    if (!mon) { await say("It's a rugged rock, but a Pokémon\nmay be able to smash it."); return; }
    if (!(await confirm("This rock appears to be breakable.\nWould you like to use Rock Smash?"))) return;
    await say(usedMove(mon, "Rock Smash"));
    await smashRock(person);
  }
  async function smashRock(person) {
    sfx("se_m_rock_throw");
    if (person.flag) tempFlags.add(player.location.map + ":" + person.flag);
    Overworld.removePerson(person);
    const m = window.WORLD_MAPS[player.location.map];
    if (m && m.rockSmash && Math.floor(Math.random() * 1600) < m.rockSmash.rate * 16 && canBattle()) {
      const w = World.pickWild(m, Math.random, m.rockSmash);
      if (w) await battle("wild", { foe: { name: "Wild", team: [wildMon(Party.create(w.species, w.level))] } });
    }
  }

  // Strength (EventScript_StrengthBoulder): once used, boulders on the map
  // can be pushed until you leave it.
  async function strengthBoulder() {
    const mon = FieldMoves.user(player, "Strength");
    if (!mon) { await say(["It's a big boulder, but a Pokémon\nmay be able to push it aside."]); return; }
    if (strengthOn) { await say("Strength made it possible to move\nboulders around."); return; }
    await say("It's a big boulder, but a Pokémon\nmay be able to push it aside.");
    if (!(await confirm("Would you like to use Strength?"))) return;
    await useStrength(mon);
  }
  async function useStrength(mon) {
    strengthOn = true;
    cry(mon.species);
    await say([usedMove(mon, "Strength"), Party.displayName(mon) + "'s Strength made it\npossible to move boulders around!"]);
  }

  // Dive (Hoenn: EventScript_UseDive and EventScript_UseDiveUnderwater, src/field_control_avatar.c's TrySetDiveWarp): on
  // deep water, A goes down, to the map's dive connection (the same tile) or the fixed warp its scripts set; under it,
  // anywhere but where you can't surface, A comes up.
  const DIVEABLE = [0x11, 0x12];
  function diveTarget(avatar) {
    const L = player.location, m = window.WORLD_MAPS[L.map], pos = Overworld.position();
    if (!m || m.region !== "hoenn") return null;
    const beh = window.World.blockAt(L.map, pos.x, pos.y).behavior;
    const down = avatar === "surf";
    if (down ? !DIVEABLE.includes(beh) : (m.type !== "underwater" || beh === 0x19 || beh === 0x2a || beh === 0x69)) return null;
    const c = (m.connections || []).find((q) => q.direction === (down ? "dive" : "emerge") && q.map);
    if (c) return { map: c.map, x: pos.x, y: pos.y, down };
    const w = hoenn.diveWarp(L.map), dest = w && window.HOENN_SCRIPTS.consts[w.map];
    return dest ? { map: dest, x: w.x, y: w.y, down } : null;
  }
  const diveHere = (avatar) => !!diveTarget(avatar) && !!FieldMoves.user(player, "Dive");
  async function dive(asked) {
    const t = diveTarget(Overworld.avatar()), mon = FieldMoves.user(player, "Dive");
    if (!t || !mon) { await say(t ? "The sea is deep here. A POKéMON\nmight be able to go underwater." : "Can't use that here."); return; }
    if (!asked && !(await confirm(t.down ? "The sea is deep here.\nWould you like to use Dive?" : "Light is filtering down from above.\nWould you like to use Dive?"))) return;
    await say(usedMove(mon, "Dive"));
    Screen.say("");
    sfx("se_m_dive");
    await Overworld.fadeToBlack();
    await Overworld.teleport({ map: t.map, x: t.x, y: t.y, facing: player.location.facing || "down" });
    Overworld.setAvatar(t.down ? "dive" : "surf");
    await Overworld.fadeFromBlack();
  }

  // Surf (EventScript_UseSurf): A in front of the water with a Pokémon that
  // can; you hop on and the surfing music plays.
  async function surfPrompt() {
    const mon = FieldMoves.user(player, "Surf");
    if (!mon) return;
    if (!(await confirm("The water is dyed a deep blue…\nWould you like to Surf?"))) return;
    await startSurfing(mon);
  }
  async function startSurfing(mon) {
    await say(usedMove(mon, "Surf"));
    Screen.say("");
    cry(mon.species);
    sfx("se_m_surf");
    const dir = Overworld.ahead().facing;
    Overworld.setAvatar("surf");
    await Overworld.act([{ who: "player", moves: ["jump_" + dir] }]);
  }

  // Waterfall (EventScript_Waterfall): surfing, up the falls to the top.
  async function waterfall() {
    const mon = FieldMoves.user(player, "Waterfall");
    if (!mon) { await say("A wall of water is crashing down\nwith a mighty roar."); return; }
    if (!(await confirm("It's a large waterfall.\nWould you like to use Waterfall?"))) return;
    await say(Party.displayName(mon) + " used Waterfall.");
    await climbWaterfall();
  }
  async function climbWaterfall() {
    const a = Overworld.ahead(), [dx, dy] = World.DIRS[a.facing];
    let n = 0;
    while (World.blockAt(a.map, a.x + dx * n, a.y + dy * n).behavior === World.MB.WATERFALL) n++;
    sfx("se_m_waterfall");
    await Overworld.act([{ who: "player", moves: Array(n + 1).fill("walk_slow_" + a.facing) }]);
  }

  // Whirlpool (HGSS's std_menu_whirlpool): surfing, through the whirlpool
  // ahead to the water beyond it (CallFieldTask_Whirlpool); it stays.
  async function whirlpool() {
    const mon = FieldMoves.user(player, "Whirlpool");
    if (!mon) { await say("The water is swirling and spinning\naround with a mighty roar."); return; }
    if (!(await confirm("It's a huge swirl of water.\nWould you like to use Whirlpool?"))) return;
    await say(Party.displayName(mon) + " used Whirlpool.");
    await crossWhirlpool();
  }
  async function crossWhirlpool() {
    const a = Overworld.ahead(), [dx, dy] = World.DIRS[a.facing];
    let n = 0;
    while (World.blockAt(a.map, a.x + dx * n, a.y + dy * n).behavior === World.MB.WHIRLPOOL) n++;
    sfx("se_m_whirlpool");
    await Overworld.act([{ who: "player", moves: Array(n + 1).fill("walk_" + a.facing) }]);
  }

  // Rock Climb (HGSS's std_menu_rock_climb): up, down or along the rocky
  // wall ahead, the way it goes, to the ground at its other end (CallFieldTask_RockClimb).
  async function rockClimb() {
    const mon = FieldMoves.user(player, "Rock Climb");
    if (!mon) { await say("The wall is very rocky…\nWill a Pokémon's move scale it?"); return; }
    if (!(await confirm("The wall is very rocky…\nWould you like to use Rock Climb?"))) return;
    await say(usedMove(mon, "Rock Climb"));
    await climbRocks();
  }
  async function climbRocks() {
    const a = Overworld.ahead(), [dx, dy] = World.DIRS[a.facing];
    let n = 0;
    while (World.climbable(World.blockAt(a.map, a.x + dx * n, a.y + dy * n).behavior, a.facing)) n++;
    sfx("se_m_rock_throw");
    await Overworld.act([{ who: "player", moves: Array(n + 1).fill("walk_" + a.facing) }]);
  }

  // Fly: pick a town you've been to on the Town Map, and off you go, landing
  // outside its Pokémon Center (FireRed's heal locations). `mon` flies you:
  // FireRed's Fly out of battle (Overworld.flyOut, flyIn), unless you're
  // surfing (then just the sound and a fade).
  async function fly(mon) {
    let spot = await townMap({ fly: true });
    await Overworld.resume();   // (the map was put away for the Town Map)
    if (!spot) return;
    // (Littleroot's: outside your own house.)
    if (spot.girl && isGirl()) spot = Object.assign({}, spot, spot.girl);
    if (Overworld.avatar() === "surf" || !mon) sfx("se_m_fly");
    else {
      Overworld.setAvatar("walk");
      await Overworld.flyOut({ species: mon.species, form: Party.form(mon), shiny: !!mon.shiny });
    }
    Overworld.setAvatar("walk");
    await Overworld.teleport({ map: spot.map, x: spot.x, y: spot.y, facing: "down", hidden: true });
    await Overworld.flyIn();
    // (A scene that starts on arriving: Bill waiting on Cinnabar Island.)
    if (spot.map === "CinnabarIsland" && special("enter:" + spot.map)) await story({ type: "trigger", trigger: { script: "enter:" + spot.map }, map: spot.map });
  }

  // The Bicycle (from the Bag, or Select once registered): on and off,
  // where the map allows cycling (FireRed's ItemUseOutOfBattle_Bike).
  async function bicycle() {
    const here = window.WORLD_MAPS[player.location.map] || {};
    const mode = Overworld.avatar();
    if (mode === "bike" && onCyclingRoad()) { await say("You can't dismount your Bike here."); return; }
    if (mode === "bike") { Overworld.setAvatar("walk"); return; }
    if (mode === "surf" || !here.cycling) { await say("Oak: " + player.name + "! This isn't the time to use that!"); return; }
    Overworld.setAvatar("bike");
  }
  // Fishing (FireRed's StartFishing, src/field_player_avatar.c, Task_Fishing).
  // You cast, and a second later dots appear in the text box, one every 20
  // frames, 4 to 10 of them; then either nothing bites, "Not even a nibble‥"
  // (always, where there's nothing to fish), or something does: the rod
  // bends, a "!" pops up over your head, and "A POKéMON's on the hook!", then
  // a wild battle with the map's fishing Pokémon for your fishing level
  // (game/fishing.js), and the fishing XP it's worth. As in FireRed and LeafGreen there's no button
  // to press in time and only the one round of dots (Fishing7 goes straight
  // to the hook; the reeling of Ruby and Sapphire, Fishing8 and Fishing9, is
  // left behind, never reached). FireRed's bite is Random() & 1, one cast in
  // two; here it's twice that, every cast where there's something to catch.
  const BITE_CHANCE = 1;
  // Feebas (Emerald's CheckFeebas): six of Route 119's fishing spots, where half the bites are Feebas, Lv. 20 to 25.
  // Which six is your own (Emerald's go by Dewford's trendy phrase; here by your Trainer ID).
  let feebasCache = null;
  function feebasSpots() {
    if (feebasCache && feebasCache.id === player.trainerId) return feebasCache.spots;
    const m = window.WORLD_MAPS.Route119, water = [];
    for (let i = 0; m && i < m.width * m.height; i++)
      if (World.isSurfable(m.behavior[i]) && m.behavior[i] !== World.MB.WATERFALL && !m.collision[i]) water.push((i % m.width) + "," + Math.floor(i / m.width));
    let seed = (player.trainerId | 0) || 1;
    const spots = new Set();
    while (spots.size < Math.min(6, water.length)) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; spots.add(water[(seed >>> 16) % water.length]); }
    feebasCache = { id: player.trainerId, spots };
    return spots;
  }
  if (window.HOENN_DEBUG) window.HoennDebug = Object.assign(window.HoennDebug || {}, { feebasSpots: () => [...feebasSpots()] });
  async function fish() {
    const at = player.location;
    const here = window.WORLD_MAPS[at.map] || {};
    const frames = (n) => sleep(n * 1000 / 60);
    const second = frames(60);
    await Overworld.rod("out");
    await second;
    // The dots (Fishing4, Fishing5).
    const dots = Math.min(10, Math.floor(Math.random() * 10) + 4);
    Screen.say(" ");
    for (let n = 1; n <= dots; n++) {
      await frames(20);
      const text = Array(n).fill("·").join("  ");
      Screen.say(text, text.length);
    }
    await frames(20);
    // Whether it bites (Fishing6).
    if (!here.fishing || Math.random() >= BITE_CHANCE) {
      Overworld.rod("away");
      await say("Not even a nibble‥");
      Screen.say("");
      Overworld.rod(null);
      return;
    }
    Overworld.rod("bite");
    Overworld.emote("!");
    sfx("se_pin");
    await say("A POKéMON's on the hook!");
    Screen.say("");
    Overworld.emote(null);
    Overworld.rod(null);
    const spot = Overworld.ahead(), before = Fishing.level(fishingXp());
    const mon = at.map === "Route119" && feebasSpots().has(spot.x + "," + spot.y) && Math.random() < 0.5
      ? { species: "Feebas", level: 20 + Math.floor(Math.random() * 6), xp: Fishing.XP[Fishing.pickRod(before)] } : Fishing.encounter(at.map, before);
    if (!mon) return;
    player.flags.fishingCaptures = (player.flags.fishingCaptures | 0) + 1;
    await gainFishingXp(mon.xp);
    Screen.say("");
    // (FireRed's pond, or the sea.)
    const ahead = Overworld.ahead();
    const terrain = ahead.behavior === 0x10 ? "pond" : "water";
    if (safariOn()) { await safariBattle(mon.species, mon.level, terrain); return; }
    if (!canBattle()) return;
    const outcome = await battle("wild", { foe: { name: "Wild", team: [wildMon(Party.create(mon.species, mon.level))] }, terrain, fishing: true });
    // (This game's own: more fishing XP for landing it, catching it (as much again as the bite) or beating it (half).)
    const bonus = outcome === "caught" ? mon.xp : outcome === "won" ? Math.ceil(mon.xp / 2) : 0;
    if (bonus) {
      show("world");
      await Overworld.resume();
      await gainFishingXp(bonus, outcome === "caught" ? "for catching it" : "for beating it");
      Screen.say("");
    }
  }
  // Fishing XP, and the fishing level it brings (game/fishing.js).
  async function gainFishingXp(n, why) {
    const before = Fishing.level(fishingXp());
    player.flags.fishingXp = fishingXp() + n;
    const after = Fishing.level(player.flags.fishingXp);
    await say("Gained " + n + " fishing XP" + (why ? " " + why : "") + ".");
    const rarer = Fishing.TIERS.some(([from]) => from > before && from <= after);
    if (after > before) await say("Your fishing level rose to " + after + "!" + (rarer ? "\nRarer Pokémon may bite now." : ""));
  }

  // ---------- Cycling Road ----------
  //
  // (Route 16's and Route 18's gates, and the maps between: CYCLING_ROAD_MAPS.)
  // FireRed's FLAG_SYS_ON_CYCLING_ROAD: out on the road (not in a gate), where
  // you can't get off the Bicycle.
  const onCyclingRoad = () => !!player.flags.cyclingRoad && ["Route16", "Route17", "Route18"].includes(player.location.map);
  // A gate's guard without a Bicycle (FireRed's NeedBikeTrigger): "Excuse me!",
  // you face him, walk up to the counter, and are turned back the way you came.
  async function needBike(script) {
    const [, gate, row] = /^(\w+_1F)_EventScript_NeedBikeTrigger(\w+)$/.exec(script);
    await say(T(gate + (gate === "Route16_NorthEntrance_1F" ? "_Text_ExcuseMeWaitUp" : "_Text_ExcuseMe")));
    await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    await sleep(333);
    const up = { MidTop: "WalkUp", Mid: "WalkUp2", MidBottom: "WalkUp3", Bottom: "WalkUp4" }[row];
    if (up) await Overworld.act([{ who: "player", moves: M(gate + "_Movement_" + up) }]);
    await say(T(gate + (gate === "Route16_NorthEntrance_1F" ? "_Text_NoPedestriansOnCyclingRoad" : "_Text_NeedBicycleForCyclingRoad")));
    Screen.say("");
    await Overworld.act([{ who: "player", moves: M(gate + "_Movement_WalkRight") }]);
  }

  // Getting on or off the Bicycle or the water: its music, or the map's again.
  function avatarMusic(mode) {
    return mode === "bike" ? "mus_cycling" : mode === "surf" ? "mus_surf" : null;
  }

  // Select: the key item registered from the Bag (FireRed's registered item).
  async function useRegistered() {
    const id = player.flags.registered;
    if (!id || !Player.itemCount(player, id)) { await say("An item in the Bag can be\nregistered to Select for easy use."); return; }
    await useKeyItem(id);
    if (fieldAction) { const act = fieldAction; fieldAction = null; await act(); }
  }

  // ---------- Route 5: the Day-Care (game/daycare.js) ----------
  async function dayCareMan() {
    const f = player.flags, D = (k) => T("Route5_PokemonDayCare_Text_" + k);
    const dc = f.dayCare;
    if (dc) {
      const name = Party.displayName(dc.mon), grew = DayCare.levelsGained(dc, Player.levelCap(player)), cost = DayCare.cost(dc, Player.levelCap(player));
      await say(D(grew ? "MonHasGrownByXLevels" : "MonNeedsToSpendMoreTime"), [name, String(grew)]);
      if (!(await confirm(fill(D("OweMeXForMonsReturn").join(" "), [name, cost.toLocaleString("en-US")])))) { await say(D("ComeAnytimeYouLike")); return; }
      if (player.party.length >= Player.PARTY_SIZE) { await say(D("YouveGotNoRoomForIt")); return; }
      if (player.money < cost) { await say(D("DontHaveEnoughMoney")); return; }
      Player.addMoney(player, -cost);
      const mon = DayCare.withdraw(dc, Player.levelCap(player));
      f.dayCare = null;
      player.party.push(mon);
      await say(D("ThankYouHeresMon"));
      cry(mon.species);
      await say(D("PlayerGotMonBack"), [name]);
      return;
    }
    const q = D("WantMeToRaiseMon");
    await say(q.slice(0, -1));
    if (!(await confirm(fill(q[q.length - 1])))) { await say(D("ComeAgain")); return; }
    if (player.party.filter((r) => !r.egg).length === 1) { await say(D("OnlyHaveOneMonWithYou")); return; }
    await say(D("WhichMonShouldIRaise"));
    const mine = await choosePartyFor("Choose a POKéMON.");
    show("world");
    if (!mine) { await say(D("ComeAnytimeYouLike")); return; }
    if (mine.egg) { await say("I can't raise an Egg!"); return; }
    if (!player.party.some((r) => r !== mine && Party.canFight(r))) { await say(D("WhatWillYouBattleWith")); return; }
    player.party.splice(player.party.indexOf(mine), 1);
    f.dayCare = DayCare.deposit(mine);
    await say(D("LookAfterMonForAWhile"), [Party.displayName(mine)]);
    cry(mine.species);
    await say(D("ComeSeeMeInAWhile"));
  }

  // ---------- Route 25: Bill's Sea Cottage ----------
  //
  // Bill has got himself mixed up with a Clefairy. He walks into his
  // Teleporter; you run the Cell Separation System on his PC; out he comes as
  // himself, and gives you the S.S. Ticket (Route25_SeaCottage_EventScript_*).
  // Afterwards his PC shows his favourite Pokémon. (Leaving while he's in the
  // Teleporter, he's a Clefairy again when you come back, as in FireRed.)
  let billInTeleporter = false, seaCottageReturn = false, billJustOut = false;
  async function bill(person) {
    const f = player.flags;
    if (f.gotSSTicket) {
      await say(T(seaCottageReturn ? "Route25_SeaCottage_Text_CheckOutRareMonsOnPC" : "Route25_SeaCottage_Text_SSAnnePartyYouGoInstead"));
      return;
    }
    if (f.billHelped) {
      await say(T("Route25_SeaCottage_Text_ThanksBudTakeThis"));
      Player.addItem(player, "ss-ticket");
      f.gotSSTicket = true;
      await sayWithJingle(itemJingle("ss-ticket"), T("Route25_SeaCottage_Text_ReceivedSSTicketFromBill"));
      await say(T("Route25_SeaCottage_Text_SSAnnePartyYouGoInstead"));
      return;
    }
    if (billInTeleporter) return;
    const ask = T("Route25_SeaCottage_Text_ImBillHelpMeOutPal");
    await say(ask.slice(0, -1));
    if (!(await confirm(fill(ask[ask.length - 1])))) await say(T("Route25_SeaCottage_Text_NoPleaseChief"));
    await say(T("Route25_SeaCottage_Text_RunCellSeparationOnPC"));
    // Into the Teleporter (round you, if you're in the way above him).
    const C = "LOCALID_BILL_CLEFAIRY", at = Overworld.position();
    await Overworld.act([{ who: C, moves: M(at.facing === "down" ? "Route25_SeaCottage_Movement_BillWalkToTeleporterSouth" : "Route25_SeaCottage_Movement_BillWalkToTeleporter") }]);
    await Overworld.act([{ who: C, moves: M("Route25_SeaCottage_Movement_BillEnterTeleporter").concat(["set_invisible"]) }]);
    Overworld.removeObject(C);
    billInTeleporter = true;
  }
  async function billsComputer() {
    const f = player.flags;
    if (f.gotSSTicket && seaCottageReturn) {
      await say(T("Route25_SeaCottage_Text_BillsFavoriteMonList"));
      for (;;) {
        const species = await ask(T("Route25_SeaCottage_Text_SeeWhichMon")[0],
          ["Eevee", "Flareon", "Jolteon", "Vaporeon"].map((s) => ({ label: s, value: s, className: "action" })).concat([back("Cancel")]));
        if (species === "back") return;
        Player.markSeen(player, species);
        showPicture(species);
        await say(" ");
        hidePicture();
      }
    }
    if (!billInTeleporter) { await say(T("Route25_SeaCottage_Text_TeleporterIsDisplayed")); return; }
    // The Cell Separator: the Teleporter beeps away, and out comes Bill.
    music(null);
    await say(T("Route25_SeaCottage_Text_InitiatedTeleportersCellSeparator"));
    billInTeleporter = false;
    f.billHelped = true;
    const beep = () => new Promise((r) => { if (window.GameAudio) window.GameAudio.se("se_ball"); setTimeout(r, 500); });
    for (let i = 0; i < 12; i++) await beep();
    music("mus_fuchsia");
    const B = "LOCALID_BILL_HUMAN";
    Overworld.addObject(B, { x: 3, y: 3, facing: "down" });
    const jingle = fanfare("mus_level_up");
    await Overworld.act([{ who: B, moves: M("Route25_SeaCottage_Movement_BillExitTeleporter") }]);
    await jingle;
    await Overworld.act([{ who: B, moves: M("Route25_SeaCottage_Movement_BillWalkToMiddleOfRoom") }]);
    billJustOut = true;
  }

  // Super Nerd Miguel (trainerbattle_no_intro: his lines come first).
  async function miguelBattle() {
    await say(T("MtMoon_B2F_Text_MiguelIntro"));
    if (!canBattle()) return;
    const outcome = await battle("trainer", { foe: { name: "Super Nerd Miguel", team: trainerTeam("TRAINER_SUPER_NERD_MIGUEL"), pic: "super_nerd" },
      defeatText: T("MtMoon_B2F_Text_MiguelDefeat"), trainerId: "TRAINER_SUPER_NERD_MIGUEL" });
    if (outcome !== "won") return;
    show("world");
    await Overworld.resume();
    await say(T("MtMoon_B2F_Text_WellEachTakeAFossil"));
  }

  // ---------- Pewter City ----------

  // The boy who takes you to the Gym (FireRed's GymGuideTrigger, or talking to
  // him from beside him: "East"). He leads, you follow, then he leaves.
  async function gymGuide(side, talked) {
    const G = "LOCALID_PEWTER_GYM_GUIDE";
    await say(T("PewterCity_Text_BrocksLookingForChallengersFollowMe"));
    if (side === "East") {
      await Overworld.act([{ who: "player", moves: M("PewterCity_Movement_PlayerWaitForGuideEast") }, { who: G, moves: M("PewterCity_Movement_GuideMoveToLeadEast") }]);
      await Overworld.act([{ who: "player", moves: M("PewterCity_Movement_PlayerWalkToGymEast") }, { who: G, moves: M("PewterCity_Movement_GuideWalkToGymEast") }]);
    } else {
      await Overworld.act([{ who: G, moves: M("PewterCity_Movement_GuideMoveToLead" + side) }]);
      await Overworld.act([{ who: "player", moves: M("PewterCity_Movement_PlayerWalkToGym" + side) }, { who: G, moves: M("PewterCity_Movement_GuideWalkToGym" + side) }]);
    }
    await say(T("PewterCity_Text_GoTakeOnBrock"));
    await Overworld.act([{ who: G, moves: M("PewterCity_Movement_GymGuideExit") }]);
    Overworld.removeObject(G);
  }

  // Brock's team: FireRed's Geodude and Onix, plus Zubat (level 11), which he
  // leads with, and Vulpix (level 13).
  function brockTeam() {
    const [geodude, onix] = trainerTeam("TRAINER_LEADER_BROCK");
    // (His ace, Onix, Terastallizes into a Dragon type as soon as it's out.)
    Object.assign(onix, { teraType: "Dragon", teraAce: true });
    return [Party.create("Zubat", 11, { ivs: 0 }), geodude, Party.create("Vulpix", 13, { ivs: 0 }), onix];
  }

  // Misty's team: Psyduck (level 18, in Staryu's place), which she leads
  // with, Togepi (level 19), then FireRed's Starmie.
  function mistyTeam() {
    const [, starmie] = trainerTeam("TRAINER_LEADER_MISTY");
    // (Her ace, Starmie, Terastallizes into a pure Psychic type as soon as it's out.)
    Object.assign(starmie, { teraType: "Psychic", teraAce: true });
    return [Party.create("Psyduck", 18, { ivs: 0 }),
      Party.create("Togepi", 19, { ivs: 0 }), starmie];
  }

  // Brock: battle (talking to him), then the Boulder Badge and TM39.
  async function brock(person) {
    const f = player.flags;
    if (!f.TRAINER_LEADER_BROCK) {
      await say(person.trainer.intro);
      if (!canBattle()) return;
      const outcome = await battle("trainer", { foe: { name: "Leader Brock", team: brockTeam(), pic: "leader_brock", tera: true },
        defeatText: person.trainer.defeat, trainerId: "TRAINER_LEADER_BROCK", terrain: "leader" });
      if (outcome !== "won") return;
      if (!hasBadge("boulder")) player.badges.push("boulder");
      show("world");
      await Overworld.resume();
    }
    if (!f.gotTM39) {
      await say(T("PewterCity_Gym_Text_TakeThisWithYou"));
      Player.addItem(player, "tm39");
      f.gotTM39 = true;
      await say(T("PewterCity_Gym_Text_ReceivedTM39FromBrock"));
      await say(T("PewterCity_Gym_Text_ExplainTM39"));
      return;
    }
    await say(T("PewterCity_Gym_Text_BrockPostBattle"));
  }

  // Misty: battle (talking to her), then the Cascade Badge and TM03 Water
  // Pulse (this game's TM101). Beating her also beats her Gym's trainers
  // (FireRed's set_gym_trainers).
  async function misty(person) {
    const f = player.flags;
    if (!f.TRAINER_LEADER_MISTY) {
      await say(person.trainer.intro);
      if (!canBattle()) return;
      const outcome = await battle("trainer", { foe: { name: "Leader Misty", team: mistyTeam(), pic: "leader_misty", tera: true },
        defeatText: person.trainer.defeat, trainerId: "TRAINER_LEADER_MISTY", terrain: "leader" });
      if (outcome !== "won") return;
      if (!hasBadge("cascade")) player.badges.push("cascade");
      f.TRAINER_PICNICKER_DIANA = f.TRAINER_SWIMMER_MALE_LUIS = true;
      player.flags.lastCenter = "CeruleanCity_PokemonCenter_1F";
      show("world");
      await Overworld.resume();
    }
    if (!f.gotTM03) {
      await say(T("CeruleanCity_Gym_Text_ExplainCascadeBadge"));
      Player.addItem(player, "tm101");
      f.gotTM03 = true;
      await sayWithJingle(itemJingle("tm101"), "{PLAYER} received TM101\nfrom Misty.");
    }
    await say(T("CeruleanCity_Gym_Text_ExplainTM03").map((p) => p.replace(/TM03/g, "TM101")));
  }

  // Lt. Surge: battle (talking to him), then the Thunder Badge and TM34 Shock
  // Wave (this game's TM102). Beating him also beats his Gym's trainers.
  // His team: FireRed's, his ace Raichu Terastallizing into a Water type as soon as it's out.
  function surgeTeam() {
    const team = trainerTeam("TRAINER_LEADER_LT_SURGE");
    Object.assign(team.find((r) => r.species === "Raichu"), { teraType: "Water", teraAce: true });
    return team;
  }
  async function ltSurge(person) {
    const f = player.flags, ID = "TRAINER_LEADER_LT_SURGE";
    if (!f[ID]) {
      await say(person.trainer.intro);
      if (!canBattle()) return;
      const outcome = await battle("trainer", { foe: { name: "Leader Lt. Surge", team: surgeTeam(), pic: "leader_lt_surge", tera: true },
        defeatText: person.trainer.defeat, trainerId: ID, terrain: "leader" });
      if (outcome !== "won") return;
      if (!hasBadge("thunder")) player.badges.push("thunder");
      f.TRAINER_ENGINEER_BAILY = f.TRAINER_SAILOR_DWAYNE = f.TRAINER_GENTLEMAN_TUCKER = true;
      player.flags.lastCenter = "VermilionCity_PokemonCenter_1F";
      show("world");
      await Overworld.resume();
    }
    if (!f.gotTM34) {
      await say(T("VermilionCity_Gym_Text_ExplainThunderBadgeTakeThis"));
      Player.addItem(player, "tm102");
      f.gotTM34 = true;
      await sayWithJingle(itemJingle("tm102"), "{PLAYER} received TM102\nfrom Lt. Surge.");
      await say(T("VermilionCity_Gym_Text_ExplainTM34").map((p) => p.replace(/TM34/g, "TM102")));
      return;
    }
    await say(T("VermilionCity_Gym_Text_LtSurgePostBattle"));
  }

  // Erika: battle (talking to her), then the Rainbow Badge and TM19 Giga
  // Drain (this game's TM103). Beating her also beats her Gym's trainers.
  // Her team: FireRed's, her ace Vileplume Terastallizing into a Poison type as soon as it's out.
  function erikaTeam() {
    const team = trainerTeam("TRAINER_LEADER_ERIKA");
    Object.assign(team.find((r) => r.species === "Vileplume"), { teraType: "Poison", teraAce: true });
    return team;
  }
  async function erika(person) {
    const f = player.flags, ID = "TRAINER_LEADER_ERIKA";
    if (!f[ID]) {
      await say(person.trainer.intro);
      if (!canBattle()) return;
      const outcome = await battle("trainer", { foe: { name: "Leader Erika", team: erikaTeam(), pic: "leader_erika", tera: true },
        defeatText: person.trainer.defeat, trainerId: ID, terrain: "leader" });
      if (outcome !== "won") return;
      if (!hasBadge("rainbow")) player.badges.push("rainbow");
      for (const t of ["LASS_KAY", "LASS_LISA", "PICNICKER_TINA", "BEAUTY_BRIDGET", "BEAUTY_TAMIA", "BEAUTY_LORI", "COOLTRAINER_MARY"]) f["TRAINER_" + t] = true;
      player.flags.lastCenter = "CeladonCity_PokemonCenter_1F";
      show("world");
      await Overworld.resume();
    }
    if (!f.gotTM19) {
      await say(T("CeladonCity_Gym_Text_ExplainRainbowBadgeTakeThis"));
      Player.addItem(player, "tm103");
      f.gotTM19 = true;
      await sayWithJingle(itemJingle("tm103"), "{PLAYER} received TM103\nfrom Erika.");
      await say(T("CeladonCity_Gym_Text_ExplainTM19").map((p) => p.replace(/TM19/g, "TM103")));
      return;
    }
    await say(T("CeladonCity_Gym_Text_ErikaPostBattle"));
  }

  // ---------- Celadon City ----------

  // An elevator's floor select (FireRed's ..._EventScript_FloorSelect): the
  // "Now on:" window at the top right (DrawElevatorCurrentFloorWindow), "Which
  // floor do you want?" and the floors in a multichoice at the top left (the
  // floor you're on chosen to begin with; Silph Co.'s eleven floors are a
  // list of seven at a time, `list`). Another floor: the window closes, the
  // car shakes while SE_ELEVATOR plays (AnimateElevator: longer the further it
  // goes), then SE_DING_DONG; its doors open onto that floor (the dynamic
  // warp, World.setDynamicWarp).
  // FireRed's floor numbers (sFloorNamePointers: B4F is 0, 1F is 4).
  const floorNumber = (label) => { const m = /^(B?)(\d+)F$/.exec(label); return m ? (m[1] ? 4 - +m[2] : 3 + +m[2]) : 4; };
  const ELEVATOR_SHAKES = [8, 16, 24, 32, 38, 46, 53, 56, 57];   // sElevatorAnimationDuration
  async function elevator(floors, list) {
    const f = player.flags, here = floors.findIndex((fl) => f.dynamicWarp && fl.map === f.dynamicWarp.map);
    if (here >= 0) GbaMenus.fieldWindow("floor", { label: floors[here].label });
    await Screen.prompt(T("Text_WantWhichFloor")[0]);
    const v = await GbaMenus.multichoice($("#overlay"), { left: 0, top: 0, items: floors.map((fl) => fl.label).concat(["Exit"]),
      cursor: Math.max(0, here), frame: GameOptions.get().frame, shown: list ? 7 : undefined });
    GbaMenus.fieldWindow("floor", null);
    Screen.say("");
    if (v < 0 || v >= floors.length || v === here) return;
    setDynamicWarp({ map: floors[v].map, x: floors[v].x, y: floors[v].y });
    const from = here >= 0 ? floorNumber(floors[here].label) : floorNumber(floors[v].label);
    const n = Math.min(8, Math.abs(floorNumber(floors[v].label) - from));
    sfx("se_elevator");
    await Overworld.shake(ELEVATOR_SHAKES[n]);
    sfx("se_ding_dong");
  }
  // Where an elevator's doors let out (FireRed's dynamic warp): the floor you
  // got in on, or the one you chose. Saved, so it survives a reload.
  function setDynamicWarp(t) {
    player.flags.dynamicWarp = t;
    World.setDynamicWarp(t);
  }

  // A Pokémon given to you (FireRed's givemon): the fanfare, then a nickname
  // if you like. False when there's no room for it anywhere.
  // `given` runs once it's yours (before the nickname): paying for it, the
  // Poké Ball it was in going.
  async function giftMon(species, level, obtained, vars, given) {
    const room = player.party.length < Player.PARTY_SIZE || player.boxes.some((b) => Player.firstEmpty(b) >= 0);
    if (!room) { await say(T("Text_NoMoreRoomForPokemon")); return false; }
    const record = Party.create(species, level);
    const where = Player.receive(player, record);
    if (given) given();
    Player.markSeen(player, species);
    await sayWithJingle("mus_level_up", [].concat(obtained).map((p) => fill(p, vars)));
    const name = Party.speciesName(species);
    if (await confirm(fill(T("Text_GiveNicknameToThisMon")[0], [name]))) {
      const typed = await enterText(name + "'s nickname?", name, 10);
      if (typed && typed !== name) record.nickname = typed;
      show("world");
    }
    if (where !== "party") await say(Party.displayName(record) + " was transferred to " + where.replace("box", "Box") + " on the PC.");
    return true;
  }

  // Back to the way they faced before you spoke to them (Common_Movement_FaceOriginalDirection).
  async function faceBack(person) {
    if (/^face_/.test(person.movement || "")) await Overworld.act([{ who: "#" + person.id, moves: [person.movement] }]);
  }

  // ---------- The Department Store roof ----------

  const DRINKS = [["fresh-water", "tm16", "gotTM16FromThirstyGirl", "YayFreshWaterHaveThis", "ExplainTM16", 200],
    ["soda-pop", "tm20", "gotTM20FromThirstyGirl", "YaySodaPopHaveThis", "ExplainTM20", 300],
    ["lemonade", "tm33", "gotTM33FromThirstyGirl", "YayLemonadeHaveThis", "ExplainTM33", 350]];
  async function thirstyGirl() {
    const f = player.flags, R = (k) => T("CeladonCity_DepartmentStore_Roof_Text_" + k);
    const have = DRINKS.filter(([drink]) => Player.itemCount(player, drink));
    if (!have.length) { await say(R("ImThirstyIWantDrink")); return; }
    const q = R("ImThirstyGiveHerDrink");
    await say(q.slice(0, -1));
    if (!(await confirm(fill(q[q.length - 1])))) return;
    // (MULTICHOICE_THIRSTY_GIRL_...: the drinks you have, then EXIT.)
    const v = await multichoice(R("GiveWhichDrink")[0], 0, 0, have.map(([drink]) => Bag.name(drink)).concat(["Exit"]));
    Screen.say("");
    if (v < 0 || v >= have.length) return;
    const [drink, tm, flag, yay, explain] = have[v];
    if (f[flag]) { await say(R("ImNotThirstyAfterAll")); return; }
    await say(R(yay));
    Player.removeItem(player, drink);
    Player.addItem(player, tm);
    f[flag] = true;
    await sayWithJingle("mus_level_up", "{PLAYER} received a " + Bag.name(tm) + "\nfrom the little girl.");
    await say(R(explain));
  }
  // Fresh Water ₽200, Soda Pop ₽300, Lemonade ₽350, as many as you like:
  // the money box at the top left, the drinks in MULTICHOICE_CELADON_VENDING_MACHINE.
  async function vendingMachine() {
    const R = (k) => T("CeladonCity_DepartmentStore_Roof_Text_" + k);
    await Screen.prompt(R("VendingMachineWhatDoesItHave")[0]);
    moneyBox(0, 0);
    try {
      for (;;) {
        const v = await multichoice(null, 12, 0, DRINKS.map(([drink, , , , , price]) => Bag.name(drink) + "{CLEAR_TO 87}{FONT_SMALL}¥" + price).concat(["Exit"]));
        if (v < 0 || v >= DRINKS.length) { await say(R("NotThirsty")); return; }
        const [drink, , , , , price] = DRINKS[v];
        if (player.money < price) { await say(R("NotEnoughMoney")); return; }
        Player.addMoney(player, -price);
        moneyBox(0, 0);
        sfx("se_shop");
        await say(R("DrinkCanPoppedOut"), [Bag.name(drink)]);
        Player.addItem(player, drink);
        await Screen.prompt(R("VendingMachineWhatDoesItHave")[0]);
      }
    } finally { moneyBox(null); }
  }

  // ---------- The Game Corner ----------
  //
  // Coins (in the Coin Case, up to 50,000: HGSS's): bought from the clerk, given by a
  // few gamblers, found on the floor, and won at the slots; spent next door
  // in the Prize Room. (Goldenrod's Game Corner: Voltorb Flip, below.)
  const MAX_COINS = 50000;
  const coins = () => player.flags.coins || 0;
  const addCoins = (n) => { player.flags.coins = Math.max(0, Math.min(MAX_COINS, coins() + n)); };
  const plainCoins = (n) => n.toLocaleString("en-US");

  // The clerk (CeladonCity_GameCorner_EventScript_CoinsClerk): the money box
  // and coins box at the top left, and (this game's own) 100, 500 or 1,000
  // Coins (FireRed's 50 or 500, MULTICHOICE_GAME_CORNER_COIN_PURCHASE_COUNTER) at the top right.
  async function coinsClerk() {
    const G = (k) => T("CeladonCity_GameCorner_Text_" + k);
    moneyBox(0, 0); coinsBox(0, 5);
    try {
      const q = G("WelcomeBuySomeCoins");
      await say(q.slice(0, -1));
      // (This game's: 100, 500 or 1,000 Coins, at FireRed's ¥20 a Coin.)
      const i = await multichoice(q[q.length - 1], 12, 0, ["{FONT_SMALL}  100 Coins{CLEAR_TO 74}¥2,000", "{FONT_SMALL}  500 Coins{CLEAR_TO 69}¥10,000",
        "{FONT_SMALL}1,000 Coins{CLEAR_TO 69}¥20,000", "Exit"]);
      if (i < 0 || i > 2) { await say(G("ComePlaySometime")); return; }
      const v = [100, 500, 1000][i];
      if (!player.flags.gotCoinCase) { await say(G("SorryDontHaveCoinCase")); return; }
      if (coins() + v > MAX_COINS) { await say(G("CoinCaseIsFull")); return; }
      if (player.money < v * 20) { await say(G("CantAffordCoins")); return; }
      addCoins(v);
      Player.addMoney(player, -v * 20);
      moneyBox(0, 0); coinsBox(0, 5);
      sfx("se_shop");
      await say(G("HereAreYourCoins"));
    } finally { moneyBox(null); coinsBox(null); }
  }
  async function gambler(person, o) {
    const f = player.flags, G = (k) => T("CeladonCity_GameCorner_Text_" + k);
    if (f[o.flag]) { await say(G(o.after)); await faceBack(person); return; }
    await say(G(o.ask));
    if (!f.gotCoinCase) await say(G("DontHaveCoinCase"));
    else if (coins() + o.coins > MAX_COINS) await say(G(o.full));
    else {
      addCoins(o.coins);
      await say(G(o.got));
      sfx("se_shop");
      f[o.flag] = true;
    }
    await faceBack(person);
  }
  // Coins found on the floor go in the Coin Case (FireRed's EventScript_TryPickUpHiddenCoins).
  async function hiddenCoins(h) {
    const found = "{PLAYER} found\n" + h.quantity + " Coins!";
    if (!player.flags.gotCoinCase) { await say([found, "But {PLAYER} has nothing to put\nthem in."]); return; }
    if (coins() + h.quantity > MAX_COINS) { await say([found, "Too bad!\nThe Coin Case is full…"]); return; }
    addCoins(h.quantity);
    player.flags[h.flag] = true;
    await sayWithJingle("mus_obtain_item", found);
    await say("{PLAYER} put the Coins away in\nthe Coin Case.");
  }
  // A slot machine (ui/slot-machine.js): FireRed picks how generous it is.
  async function slotMachine(id) {
    const G = (k) => T("CeladonCity_GameCorner_Text_" + k);
    if (!player.flags.gotCoinCase) { await say(G("CoinCaseIsRequired")); return; }
    if (!(await confirm(fill(G("SlotMachineWantToPlay").join("\n"))))) return;
    Screen.say("");
    player.flags.coins = await window.SlotMachine.play({ machineId: id, coins: coins(), maxCoins: MAX_COINS, sfx, fanfare });
    show("world");
    await Overworld.resume();
  }
  // Voltorb Flip (ui/voltorb-flip.js), at Mr. Game's table in Goldenrod's
  // Game Corner (HGSS's CasinoGame): the script fades out and back in round it.
  async function voltorbFlip() {
    Screen.say("");
    player.flags.coins = await window.VoltorbFlip.play({ coins: coins(), maxCoins: MAX_COINS, name: player.name, sfx, fanfare });
    show("world");
    await Overworld.resume();
    await persist();
  }

  // The card tables' stars (game/table-players.js): besides the Gym Leaders
  // and the Elite Four, Red, Leaf and your rival now and then sit in.
  function tableStars() {
    TablePlayers.setStars([
      { name: "Pokémon Trainer Red", pic: "red", style: "steady", sprite: "red" },
      { name: "Pokémon Trainer " + LAB_RIVAL_NAME, pic: "green", style: "loose", sprite: "leaf" },
      { name: "Rival " + player.rival, pic: "rival_late", style: "loose", sprite: "blue" }]);
  }
  // A star at the table gets a mention before the game.
  async function starNotice(players) {
    const stars = players.filter((p) => p && p.star);
    if (stars.length) await say("Whoa! " + stars.map((p) => p.name).join(" and ") + (stars.length > 1 ? "\nare" : "\nis") + " at the table today!");
  }

  // Texas Hold'em (game/poker.js, ui/poker.js; this game's own): the dealer
  // seats you with the three regulars for a buy-in of coins (your chips), and
  // what you have left when you get up goes back in your Coin Case.
  // The stakes (Poker.STAKES): low (200 Coins in, blinds 1 and 2), mid
  // (1,000; 5 and 10) or high (3,000; 15 and 30); the other players buy in the same.
  async function pokerTable() {
    if (!player.flags.gotCoinCase) { await say(T("CeladonCity_GameCorner_Text_CoinCaseIsRequired")); return; }
    await say(["Welcome to the poker table!\nWe play Texas Hold'em, fixed limit.",
      "Bets are the big blind, and twice that\non the turn and river."]);
    coinsBox(0, 0);
    let v;
    try {
      v = await multichoice("Which stakes will you play?", 14, 0, Poker.STAKES.map((st) =>
        "{FONT_SMALL}" + st.name + "{CLEAR_TO 62}" + plainCoins(st.buyIn) + " in, " + st.sb + "/" + st.bb).concat(["Cancel"]));
    } finally { coinsBox(null); }
    if (v < 0 || v >= Poker.STAKES.length) { await say("Maybe next time, then."); return; }
    const stakes = Poker.STAKES[v];
    if (coins() < stakes.buyIn) { await say("The buy-in at " + stakes.name.toLowerCase() + " is " + plainCoins(stakes.buyIn) + " Coins.\nCome back with more!"); return; }
    const buyIn = stakes.buyIn;
    addCoins(-buyIn);
    tableStars();
    const table = Poker.create({ chips: buyIn, stakes, name: player.name, pic: Player.LOOKS[player.look].front });
    await say("Here are your chips. Good luck!");
    await starNotice(table.seats.slice(1).map((st) => TablePlayers.stars().find((p) => p.name === st.name)));
    Screen.say("");
    show("scene");
    clearMenu();
    const chips = await PokerScreen.run(scene, table);
    show("world");
    await Overworld.resume();
    addCoins(chips);
    const diff = chips - buyIn;
    await say(diff > 0 ? "You cashed out " + chips + " Coins: " + diff + " up!\nCome back anytime." : diff < 0 ? (chips ? "You cashed out " + chips + " Coins.\nBetter luck next time!" : "Better luck next time!")
      : "You broke even! Come back anytime.");
    await persist();
  }

  // Blackjack (game/blackjack.js, ui/blackjack.js; this game's own): bets
  // straight from your Coin Case.
  async function blackjackTable() {
    if (!player.flags.gotCoinCase) { await say(T("CeladonCity_GameCorner_Text_CoinCaseIsRequired")); return; }
    await say(["Welcome to the blackjack table!", "Bets are " + Blackjack.BETS[0] + " to " + Blackjack.BETS[Blackjack.BETS.length - 1] +
      " Coins. Blackjack pays\n3 to 2, and I stand on all 17s."]);
    if (coins() < Blackjack.BETS[0]) { await say("You'll need at least " + Blackjack.BETS[0] + " Coins to play.\nCome back with more!"); return; }
    if (!(await confirm("Care to play a few hands?"))) { await say("Maybe next time, then."); return; }
    tableStars();
    const others = TablePlayers.pick(2);
    await starNotice(others);
    Screen.say("");
    show("scene");
    clearMenu();
    const before = coins();
    // (Your Coin Case keeps up with every bet and payout, up to 50,000, and the game saves after each hand.)
    const keep = (n) => { player.flags.coins = 0; addCoins(n); persist(); return coins(); };
    const after = await BlackjackScreen.run(scene, Blackjack.create({ coins: before, name: player.name, pic: Player.LOOKS[player.look].front,
      others }), keep);
    show("world");
    await Overworld.resume();
    keep(after);
    const diff = after - before;
    await say(diff > 0 ? "You're " + diff + " Coins up!\nCome back anytime." : diff < 0 ? "Better luck next time!" : "You broke even! Come back anytime.");
    await persist();
  }

  // The card room's regulars (this game's own; data/card-room.js): people
  // in the chairs. Three at the poker table (a chair left for you) and two at
  // blackjack, the same all day; three round the mahjong table, a chair free,
  // new ones after every game you play with them. Each a trainer from around
  // the game (TablePlayers) in someone's clothes.
  const CROWD_SPRITES = ["woman_1", "fat_man", "boy", "old_man_1", "woman_3", "youngster", "balding_man", "woman_2", "lass", "gentleman",
    "old_man_2", "bug_catcher", "cooltrainer_f", "rocker", "man", "camper", "black_belt", "hiker", "cooltrainer_m", "picnicker",
    "old_woman", "beauty", "sailor", "fisher", "poke_maniac", "channeler", "crush_girl", "scientist"];
  const CROWD_FACING = { poker: ["right", "left", "up", "up"], blackjack: ["up", "up", "up", "up"], mahjong: ["down", "up", "right", "left"] };
  const CROWD_SAYS = [
    ["I'm on a hot streak today!"], ["Don't tell my wife how much\nI've lost here..."], ["Shh! I'm counting."],
    ["The house always wins, they say.\nNot today!"], ["One more hand, then I'll go home."],
    ["I came for the slots, but\nthe cards are where it's at."], ["Bah! Another bad beat!"]];
  // (The mahjong chairs they take: the one nearest the door, 1, is yours.)
  const MAHJONG_CHAIRS = [0, 2, 3];
  let crowdCache = null, mahjongCrowd = null;
  function crowdLooks() {
    const looks = {};
    for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people || []) if (!looks[p.sprite]) looks[p.sprite] = p;
    return { looks, sprites: CROWD_SPRITES.filter((s) => looks[s]) };
  }
  function cardRoomCrowd() {
    const day = Player.gameTime().day;
    if (!crowdCache || crowdCache.day !== day) {
      let seed = day * 2654435761 >>> 0;
      const rng = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const { looks, sprites } = crowdLooks();
      tableStars();
      const room = window.WORLD_MAPS.CeladonCity_GameCorner_CardRoom, players = TablePlayers.pick(5, rng);
      const people = [];
      const seat = (table, i) => {
        // (A star in their own clothes.)
        const [x, y] = room.seats[table][i], who = players[people.length], random = looks[sprites[Math.floor(rng() * sprites.length)]];
        const look = (who.star && (looks[who.sprite] || window.WORLD_SPRITES[who.sprite])) || random;
        const says = who.star ? ["Shh! I'm just here for a quiet game.\nDon't tell anyone!"] : CROWD_SAYS[Math.floor(rng() * CROWD_SAYS.length)];
        people.push({ id: 910 + people.length, localId: "LOCALID_CARD_PLAYER_" + people.length, script: null, x, y, movement: "face_" + CROWD_FACING[table][i],
          rangeX: 0, rangeY: 0, flag: null, text: [who.name + ": " + says[0]].concat(says.slice(1)),
          sprite: look.sprite, width: look.width, height: look.height, frames: look.frames, who });
      };
      [0, 1, 2].forEach((i) => seat("poker", i));
      [0, 2].forEach((i) => seat("blackjack", i));
      crowdCache = { day, people };
    }
    return crowdCache.people.concat(mahjongPlayers());
  }
  // The three at the mahjong table, each a way to sit in with them.
  function mahjongPlayers() {
    if (!mahjongCrowd) {
      tableStars();
      const { looks, sprites } = crowdLooks();
      const room = window.WORLD_MAPS.CeladonCity_GameCorner_CardRoom;
      const away = crowdCache ? crowdCache.people.map((p) => p.who.name) : [];
      mahjongCrowd = TablePlayers.pick(3, Math.random, away).map((who, k) => {
        const i = MAHJONG_CHAIRS[k], [x, y] = room.seats.mahjong[i];
        const look = (who.star && (looks[who.sprite] || window.WORLD_SPRITES[who.sprite])) || looks[sprites[Math.floor(Math.random() * sprites.length)]];
        return { id: 920 + k, localId: "LOCALID_MAHJONG_PLAYER_" + k, script: "Game_EventScript_MahjongPlayer", x, y, movement: "face_" + CROWD_FACING.mahjong[i],
          rangeX: 0, rangeY: 0, flag: null, text: null, sprite: look.sprite, width: look.width, height: look.height, frames: look.frames, who };
      });
    }
    return mahjongCrowd;
  }

  // Mahjong (game/mahjong.js, ui/mahjong.js; this game's own): Riichi, an
  // East round. 250 Coins buys you in for 25,000 points; when you get up (or
  // the game's over) every 100 points left is a Coin; quitting mid-game
  // with Select forfeits it all. Any of the three at the table asks you to
  // sit in; you play them, and three others sit down after.
  const MAHJONG_BUY_IN = 250;
  async function mahjongTable() {
    if (!player.flags.gotCoinCase) { await say(T("CeladonCity_GameCorner_Text_CoinCaseIsRequired")); return; }
    const others = mahjongPlayers().map((p) => p.who);
    if (!(await confirm("Want to play with us?\nIt costs " + MAHJONG_BUY_IN + " Coins for the buy-in."))) { await say("Maybe next time, then."); return; }
    if (coins() < MAHJONG_BUY_IN) { await say("You'll need " + MAHJONG_BUY_IN + " Coins to sit in.\nCome back with more!"); return; }
    addCoins(-MAHJONG_BUY_IN);
    await say(["We play Riichi: an East round,\n25,000 points each. Every 100 points\nyou have when you get up is a Coin.",
      "You can get up between hands, or\nany time with SELECT, but then you\nforfeit your buy-in."]);
    await starNotice(others);
    Screen.say("");
    show("scene");
    clearMenu();
    const game = Mahjong.create({ names: [player.name].concat(others.map((p) => p.name)) });
    const points = await MahjongScreen.run(scene, game, { pics: [Player.LOOKS[player.look].front].concat(others.map((p) => p.pic)) });
    // (New players at the table for next time.)
    mahjongCrowd = null;
    show("world");
    if (Overworld.refreshPeople) Overworld.refreshPeople();
    await Overworld.resume();
    if (points == null) { await say("You got up mid-game and forfeited\nyour buy-in. Come back anytime!"); await persist(); return; }
    const won = Math.max(0, Math.floor(points / 100));
    addCoins(won);
    const diff = won - MAHJONG_BUY_IN;
    await say(diff > 0 ? "You cashed out " + won + " Coins: " + diff + " up!" : diff < 0 ? (won ? "You cashed out " + won + " Coins.\nBetter luck next time!" : "Better luck next time!")
      : "You broke even!");
    await persist();
  }

  // The Prize Room's three counters (FireRed's prizes and prices). A TM
  // prize is the TM of this game with that move.
  const PRIZES = {
    Mons: [["Abra", 180, 9], ["Clefairy", 500, 8], ["Dratini", 2800, 18], ["Scyther", 5500, 25], ["Porygon", 9999, 26]],
    TMs: [["Ice Beam", 4000], ["Iron Tail", 3500], ["Thunderbolt", 4000], ["Shadow Ball", 4500], ["Flamethrower", 4000]],
    Items: [["smoke-ball", 800], ["miracle-seed", 1000], ["charcoal", 1000], ["mystic-water", 1000], ["yellow-flute", 1600]]
  };
  const machineFor = (move) => Bag.machines().find((m) => Bag.machineMove(m) === move);
  // Each counter's multichoice (MULTICHOICE_GAME_CORNER_POKEMON_PRIZES,
  // _TMPRIZES, _BATTLE_ITEM_PRIZES: where FireRed puts each one and its
  // prices' column), with the coins box at the top left.
  const PRIZE_MENU = { Mons: { left: 11, at: (i) => (i < 2 ? 85 : 75) }, TMs: { left: 11, at: () => 72 }, Items: { left: 10, at: (i) => (i ? 80 : 90) } };
  async function prizeClerk(counter) {
    const P = (k) => T("CeladonCity_GameCorner_PrizeRoom_Text_" + k);
    if (!player.flags.gotCoinCase) { await say(P("CoinCaseRequired")); return; }
    coinsBox(0, 0);
    try {
      await say(P("WeExchangeCoinsForPrizes"));
      const list = PRIZES[counter], menu = PRIZE_MENU[counter];
      const label = ([what]) => counter === "Mons" ? Party.speciesName(what) : counter === "TMs" ? Bag.name(machineFor(what)) : Bag.name(what);
      const short = (p) => (counter === "TMs" ? label(p).split(" ")[0] : label(p));
      const v = await multichoice(P("WhichPrize")[0], menu.left, 0, list.map((p, i) => short(p) + "{CLEAR_TO " + menu.at(i) + "}{FONT_SMALL}" +
        (counter === "Mons" ? " " : "") + plainCoins(p[1]) + " Coins").concat(["No thanks"]));
      Screen.say("");
      if (v < 0 || v >= list.length) return;
      const [what, price, level] = list[v];
      const name = label(list[v]);
      const ok = counter === "TMs" ? await confirm(fill(P("YouWantTM")[0], ["", what])) : await confirm(fill(P("YouWantPrize")[0], [name]));
      if (!ok) return;
      if (coins() < price) { await say(P("NeedMoreCoins")); return; }
      if (counter === "Mons") {
        await giftMon(what, level, T("Text_PlayerObtainedTheMon"), [name], () => { addCoins(-price); coinsBox(0, 0); });
        return;
      }
      const item = counter === "TMs" ? machineFor(what) : what;
      addCoins(-price);
      coinsBox(0, 0);
      Player.addItem(player, item);
      await sayWithJingle(itemJingle(item), "{PLAYER} received " + article(Bag.name(item)) + "!");
    } finally { coinsBox(null); }
  }

  // ---------- The Rocket Hideout ----------
  //
  // Giovanni, on B4F (this game's own: a tag battle). As you speak to him,
  // Leaf comes in from the elevator's side to battle him with you: her
  // Butterfree, Wigglytuff and starter as at the top of Pokémon Tower, and
  // three of yours. Beaten, he leaves, and the Silph Scope is left behind;
  // then Leaf goes back the way she came.
  const HIDEOUT_LEAF = "LOCALID_HIDEOUT_LEAF";
  // FireRed's team (Onix, Rhyhorn, Kangaskhan), with three more (his
  // Dugtrio, Nidorino and Persian) against the two of you.
  const HIDEOUT_GIOVANNI_EXTRA = [["Dugtrio", 26], ["Nidorino", 26], ["Persian", 28]];
  let hideoutLeafFrom = null;   // (the tile Leaf came in by, to leave by)
  // Which way to face from one tile to look at another.
  const toward = (from, to) => (to.x < from.x ? "left" : to.x > from.x ? "right" : to.y < from.y ? "up" : "down");
  // Someone and you turn to each other.
  const faceEachOther = (who) => Overworld.act([{ who, moves: ["face_player"] },
    { who: "player", moves: ["face_" + toward(Overworld.position(), Overworld.personPosition(who))] }]);
  // The free tiles beside you (not in front): to your sides, then behind.
  function besideYou(skip) {
    const out = [];
    const me = Overworld.position(), people = Overworld.people();
    const order = { up: ["left", "right", "down"], down: ["right", "left", "up"], left: ["up", "down", "right"], right: ["up", "down", "left"] }[me.facing];
    for (const d of order) {
      const [dx, dy] = World.DIRS[d], t = { x: me.x + dx, y: me.y + dy };
      if ((skip || []).some((q) => q.x === t.x && q.y === t.y)) continue;
      const r = World.step({ map: me.map, x: me.x, y: me.y }, d, (m, x, y) => people.some((q) => q.x === x && q.y === y));
      if (r.ok && !r.warp && !r.jump && r.x === t.x && r.y === t.y) out.push(t);
    }
    return out;
  }
  async function giovanniHideout(person) {
    const f = player.flags, ID = "TRAINER_BOSS_GIOVANNI", L = HIDEOUT_LEAF;
    if (!canBattle()) {
      music("mus_encounter_rocket");
      await say(T("RocketHideout_B4F_Text_GiovanniIntro"));
      return;
    }
    // Leaf comes running in, from the elevator's side.
    music("mus_encounter_rival");
    await say(["{PLAYER}! Wait!"]);
    const me = Overworld.position();
    // (Beside you, not where the Silph Scope will be.)
    hideoutLeafFrom = await walkIn(L, lookOf("leaf"), { x: 20, y: 24 }, besideYou([{ x: 20, y: 5 }]).map((t) => Object.assign(t, { face: me.facing })), "fast_");
    const spot = Overworld.personPosition(L);
    if (spot) await Overworld.act([{ who: "player", moves: ["face_" + toward(me, spot)] }]);
    if (!f.leafHideout) {
      await say(["Leaf: Phew, I made it! {PLAYER}!\nYou found their hideout, too?",
        "I've been looking into Team Rocket\never since I heard rumors about the\nGame Corner.",
        "They've been stealing people's\nPokémon… I couldn't just sit back\nand do nothing!",
        "So that's their boss… Let's take\nhim on together, {PLAYER}!"]);
      f.leafHideout = true;
    } else {
      await say(["Leaf: Ready this time, {PLAYER}?\nWe can beat him if we work\ntogether!"]);
    }
    await Overworld.act([{ who: "player", moves: ["face_" + me.facing] }]);
    music("mus_encounter_rocket");
    await say(T("RocketHideout_B4F_Text_GiovanniIntro"));
    await say(["Leaf: Choose three of your Pokémon,\n{PLAYER}! I'm with you!"]);
    const own = trainerTeam(ID);
    const extra = HIDEOUT_GIOVANNI_EXTRA.map(([sp, lv]) => Party.create(sp, lv, { ivs: own[0].ivs.hp }));
    const team = own.slice(0, 2).concat(extra, own.slice(2));
    const starter = RIVAL_PICK[f.starter] || "Bulbasaur";
    const leafTeam = leafMegaTeam().filter(([sp]) => sp === "Butterfree" || sp === "Wigglytuff" || sp === STAGE_TWO[starter])
      .map(([sp, lv]) => Party.create(sp, lv));
    const outcome = await battle("trainer", { foe: { name: "Boss Giovanni", team, pic: "leader_giovanni" },
      defeatText: T("RocketHideout_B4F_Text_GiovanniDefeat"), trainerId: ID, prizeClass: "Boss",
      prize: Player.prizeMoney("Boss Giovanni", team, "Boss"),
      partner: { name: LAB_RIVAL_NAME, team: leafTeam, pic: "leaf" } });
    if (outcome === "cancelled") {
      // (She keeps watch out of sight, and comes back when you speak to him again.)
      await faceEachOther(L);
      await say(["Leaf: Not ready yet? That's OK!\nI'll keep watch nearby.", "Just talk to him again when you're\nready, and I'll be right there!"]);
      if (hideoutLeafFrom) await walkOut(L, hideoutLeafFrom, "fast_");
      Overworld.removeObject(L);
      music((window.WORLD_MAPS[player.location.map] || {}).music);
      return;
    }
    if (outcome !== "won") return;
    show("world");
    await Overworld.resume();
    await say(T("RocketHideout_B4F_Text_GiovanniPostBattle"));
    const at = Overworld.personPosition(L);
    await Overworld.fadeToBlack();
    Overworld.removePerson(person);
    Overworld.refreshPeople();
    if (at) Overworld.addObject(L, at, lookOf("leaf"));
    await Overworld.fadeFromBlack();
    music("mus_encounter_rival");
    if (at) await faceEachOther(L);
    await say(["Leaf: We did it, {PLAYER}! We beat\nthe boss of Team Rocket!",
      "Huh? He left something behind…\nYou should take it, {PLAYER}!",
      "I'm going to go and make sure the\nPokémon they stole get back to\ntheir Trainers.",
      "Thanks for having my back! See\nyou later, {PLAYER}!"]);
    music("mus_rival_exit");
    if (at && hideoutLeafFrom) await walkOut(L, hideoutLeafFrom, "fast_");
    Overworld.removeObject(L);
    hideoutLeafFrom = null;
    music((window.WORLD_MAPS[player.location.map] || {}).music);
  }
  // What happens once you've beaten some of the Game Corner's and Hideout's
  // Rockets: the poster guard leaves; the barriers on B1F and B4F open; the
  // Lift Key's dropped.
  async function afterRocket(person) {
    const f = player.flags, id = person.trainer.id;
    // A Cinnabar Gym trainer beaten opens the door by their quiz machine
    // (CinnabarIsland_Gym_EventScript_DefeatedQuinn and the like).
    const quiz = Object.keys(CINNABAR_QUIZ).find((n) => CINNABAR_QUIZ[n].trainer === id);
    if (quiz && f[id]) { show("world"); await Overworld.resume(); openQuizDoor(+quiz); return; }
    // The Rocket Warehouse's Admins (FiveIsland_RocketWarehouse_EventScript_DefeatedAdmin1/2).
    if (f[id] && (await warehouseAdmin(id))) return;
    if (!f[id] || !/^TRAINER_TEAM_ROCKET_GRUNT_(7|12|16|17|18)$/.test(id)) return;
    show("world");
    await Overworld.resume();
    if (id === "TRAINER_TEAM_ROCKET_GRUNT_7") {
      await say(T("CeladonCity_GameCorner_Text_GruntPostBattle"));
      const west = Overworld.position().facing === "left";
      await Overworld.act([{ who: "#" + person.id, moves: M(west ? "CeladonCity_GameCorner_Movement_GruntExitWest" : "CeladonCity_GameCorner_Movement_GruntExit") }]);
      Overworld.removePerson(person);
    } else if (id === "TRAINER_TEAM_ROCKET_GRUNT_12" ||
      ((id === "TRAINER_TEAM_ROCKET_GRUNT_16" || id === "TRAINER_TEAM_ROCKET_GRUNT_17") && f.TRAINER_TEAM_ROCKET_GRUNT_16 && f.TRAINER_TEAM_ROCKET_GRUNT_17)) {
      applyPatches(player.location.map);
      sfx("se_unlock");
    } else if (id === "TRAINER_TEAM_ROCKET_GRUNT_18") {
      await say(T("RocketHideout_B4F_Text_Grunt1PostBattle"));
      Overworld.refreshPeople();
    }
  }

  // ---------- Saffron City ----------

  // Team Rocket's out of Saffron once Giovanni's beaten on Silph Co.'s 11F
  // (FireRed's VAR_MAP_SCENE_SILPH_CO_11F, FLAG_HIDE_SAFFRON_ROCKETS).
  const silphFreed = () => !!player.flags.TRAINER_BOSS_GIOVANNI_2;

  // FireRed's text about one of its TMs, with this game's number for the TM
  // with that move ("TM29" -> "TM29" or whatever it is here).
  const tmText = (pages, frNumber, item) => [].concat(pages).map((p) =>
    p.replace(new RegExp("TM" + String(frNumber).padStart(2, "0"), "g"), Bag.name(item).split(" ")[0]));

  // Sabrina: battle (talking to her), then the Marsh Badge and TM04 Calm
  // Mind (FireRed's TM04: the TM with Calm Mind here). Beating her also beats
  // her Gym's trainers.
  async function sabrina(person) {
    const f = player.flags, ID = "TRAINER_LEADER_SABRINA";
    if (!f[ID]) {
      await say(person.trainer.intro);
      if (!canBattle()) return;
      // (This game's: her Alakazam holds its Alakazite, Mega Evolves, then
      // Terastallizes into a Dark type.)
      const team = swappedTeam(ID).map((r) => (r.species === "Alakazam" ? Object.assign(r, { item: "alakazite", teraType: "Dark", teraAce: true }) : r));
      const outcome = await battle("trainer", { foe: { name: "Leader Sabrina", team, pic: "leader_sabrina", tera: true },
        defeatText: person.trainer.defeat, trainerId: ID, terrain: "leader" });
      if (outcome !== "won") return;
      if (!hasBadge("marsh")) player.badges.push("marsh");
      for (const t of ["PSYCHIC_JOHAN", "PSYCHIC_TYRON", "PSYCHIC_CAMERON", "PSYCHIC_PRESTON", "CHANNELER_AMANDA", "CHANNELER_STACY",
        "CHANNELER_TASHA"]) f["TRAINER_" + t] = true;
      player.flags.lastCenter = "SaffronCity_PokemonCenter_1F";
      show("world");
      await Overworld.resume();
    }
    const tm = machineFor("Calm Mind");
    if (!f.gotTM04) {
      await say(T("SaffronCity_Gym_Text_ExplainMarshBadgeTakeThis"));
      Player.addItem(player, tm);
      f.gotTM04 = true;
      await sayWithJingle(itemJingle(tm), tmText(T("SaffronCity_Gym_Text_ReceivedTM04FromSabrina"), 4, tm));
      await sabrinaAlakazite();
      await say(T("SaffronCity_Gym_Text_SabrinaPostBattle"));
      return;
    }
    if (await sabrinaAlakazite()) return;
    await say(tmText(T("SaffronCity_Gym_Text_ExplainTM04"), 4, tm));
  }

  // (This game's own: her Alakazam's Mega Stone, after the badge and TM.)
  const sabrinaAlakazite = () => megaStoneGift("alakazite", ["I foresaw that you would win…\nand that you would need this.",
    "An Alakazite. Held by Alakazam, it\nawakens a power beyond the mind's."], "Sabrina");

  // The Fighting Dojo's prized Pokémon (SaffronCity_Dojo_EventScript_HitmonleeBall):
  // its picture, the Karate Master looks up, and it's yours if you like
  // (Lv. 25); its Poké Ball goes, and the other's yours no longer to take.
  // (This game's own: once you've beaten the Karate Master's rematch, the
  // other is yours too, at Lv. 50; see dojoMaster().)
  async function dojoBall(person, species) {
    const f = player.flags;
    const second = !!f.dojoHitmon && dojoMasterRematchWon() && !f.dojoHitmon2;
    if (f.dojoHitmon && !second) { await say(T("SaffronCity_Dojo_Text_BetterNotGetGreedy")); return; }
    showPicture(species);
    cry(species);
    await Overworld.act([{ who: "LOCALID_KARATE_MASTER", moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    const yes = await confirm(fill(T("SaffronCity_Dojo_Text_YouWant" + species)[0]));
    hidePicture();
    if (!yes) return;
    await giftMon(species, second ? DOJO_SECOND_LEVEL : 25, T("SaffronCity_Dojo_Text_ReceivedMonFromKarateMaster"), [Party.speciesName(species)], () => {
      Overworld.removePerson(person);
      if (second) f.dojoHitmon2 = species; else f.dojoHitmon = species;
    });
  }

  // ---------- The Fighting Dojo's rematch ----------
  //
  // (This game's own.) Once you're Champion (flags.gameClear), the Dojo has
  // trained hard: each of its Black Belts and the Karate Master battles you
  // once more, their Pokémon fully evolved (FireRed's teams' species lines:
  // Machop and Machoke are Machamps now, Mankey and Primeape Annihilapes) at levels 48-52.
  // Beat the Karate Master again and he gives you the Hitmon you didn't
  // take the first time, at Lv. 50. Each battles you again only once
  // (flags.dojoRematch[trainer id]: won).
  const DOJO_MASTER = "TRAINER_BLACK_BELT_KOICHI";
  const DOJO_SECOND_LEVEL = 50;
  const DOJO_REMATCH = {
    TRAINER_BLACK_BELT_HITOSHI: {
      team: [["Machamp", 49], ["Annihilape", 49], ["Annihilape", 50]],
      intro: ["Hwaah!", "So the Champion comes back to our\nFighting Dojo!", "A title means nothing on these\nmats! Fight me!"],
      defeat: ["Oof!\nThe Champion's the real thing!"],
      after: ["Even the Champion comes here to\ntrain! I'll have to work twice as hard!"]
    },
    TRAINER_BLACK_BELT_HIDEKI: {
      team: [["Machamp", 50], ["Machamp", 51]],
      intro: ["My Machop and Machoke have grown\nup since you were last here.", "Four arms each now!\nShow me what you've got!"],
      defeat: ["Judge!\nIppon! A clean point to you!"],
      after: ["Our Master has waited a long time\nfor this rematch. Be ready!"]
    },
    TRAINER_BLACK_BELT_AARON: {
      team: [["Annihilape", 52]],
      intro: ["Hiyah!", "Boulders are too easy now!\nI shatter whole cliffs!", "My Annihilape's fury is harder than\nany rock!"],
      defeat: ["Yow!\nStubbed fingers… again!"],
      after: ["Psychic power still frightens us…\nBut now, so do you!"]
    },
    TRAINER_BLACK_BELT_MIKE: {
      team: [["Annihilape", 48], ["Annihilape", 49], ["Annihilape", 50]],
      intro: ["Hoargh!", "Champion or not, rules are rules!\nTake your shoes off!"],
      defeat: ["I give up!\nYou're even stronger than before!"],
      after: ["I'm still a small fry next to our\nMaster. Next time, I'll be bigger!"]
    },
    [DOJO_MASTER]: {
      team: [["Hitmonlee", 52], ["Hitmonchan", 52]],
      intro: ["Grunt!", "The Champion of the Pokémon League\nreturns to my Dojo!", "Since the day you beat us, we have\ntrained from dawn till dusk!",
        "Show me the fighting spirit of a\nChampion! I hold nothing back!", "Fwaaa!"],
      defeat: ["Hwa!\nArrgh! Beaten once more!"],
      after: ["Grunt!", "Your strength is beyond doubt.\nWe will train even harder!"]
    }
  };
  // A trainer's rematch, while it's waiting: { intro, defeat, team() }, or null.
  function dojoRematch(id) {
    const f = player.flags, re = DOJO_REMATCH[id];
    if (!re || !f.gameClear || !f[id] || (f.dojoRematch && f.dojoRematch[id])) return null;
    const fr = window.WORLD_TRAINERS[id].party;
    return Object.assign({}, re, {
      team: () => re.team.map(([sp, lv], i) => Party.create(sp, lv, { ivs: Math.floor(((fr[i] || fr[0]).iv || 0) * 31 / 255) }))
    });
  }
  const dojoAfter = (id) => (DOJO_REMATCH[id] && player.flags.dojoRematch && player.flags.dojoRematch[id] ? DOJO_REMATCH[id].after : null);
  const dojoMasterRematchWon = () => !!(player.flags.dojoRematch && player.flags.dojoRematch[DOJO_MASTER]);
  // The Karate Master, beaten: choose a prized Pokémon (or train with them);
  // beaten again, the Hitmon you left behind, once (if the party and boxes
  // are full, he keeps it for you until you come back).
  async function dojoMaster() {
    const f = player.flags;
    if (dojoMasterRematchWon() && f.dojoHitmon && !f.dojoHitmon2) {
      const species = f.dojoHitmon === "Hitmonlee" ? "Hitmonchan" : "Hitmonlee";
      const name = Party.speciesName(species);
      await say(["Indeed, I have lost once more!", "When you came before, you took our\n" + f.dojoHitmon + " and left " + name + " here.",
        name + " has trained hard ever since,\nand it wishes to go with you!", "Take it! Let the two of them train\ntogether at your side!"]);
      const ball = window.WORLD_MAPS.SaffronCity_Dojo.people.find((p) => p.script === "SaffronCity_Dojo_EventScript_" + species + "Ball");
      showPicture(species);
      cry(species);
      const got = await giftMon(species, DOJO_SECOND_LEVEL, T("SaffronCity_Dojo_Text_ReceivedMonFromKarateMaster"), [name], () => {
        f.dojoHitmon2 = species;
        hidePicture();
        if (ball) Overworld.removePerson(ball);
      });
      hidePicture();
      if (got) await say(["Grunt!", "Stay and train at karate with us,\nall three of you!"]);
      return;
    }
    if (dojoMasterRematchWon() && f.dojoHitmon) { await say(DOJO_REMATCH[DOJO_MASTER].after); return; }
    await say(T(f.dojoHitmon ? "SaffronCity_Dojo_Text_StayAndTrainWithUs" : "SaffronCity_Dojo_Text_ChoosePrizedFightingMon"));
    if (!f.dojoDenDoor) await dojoDenDoor();
    else if (f.dojoHitmon) await say(["Our training room is through the\ndoor at the back. Its den awaits\nyour Lure!"]);
  }
  // (This game's own.) Beaten, the Karate Master opens the door to the
  // Dojo's back room and its Tera Raid den (game/raid-dens.js), once.
  async function dojoDenDoor() {
    const f = player.flags;
    if (!f[DOJO_MASTER] || f.dojoDenDoor) return;
    show("world");
    await Overworld.resume();
    await say(["Grunt! One thing more!", "Behind the door at the back of my\nDojo is our training room.",
      "A Tera Raid den sleeps there. Use a\nLure on it, and a Tera Fighting-type\nPokémon will rise to face you!",
      "I shall open it for you. Train\nthere as often as you like!"]);
    Screen.say("");
    f.dojoDenDoor = true;
    sfx("se_rs_door");
    applyPatches("SaffronCity_Dojo");
    await persist();
  }

  // ---------- Silph Co. ----------

  // The elevator's floors, top down, and where its doors open on each
  // (SilphCo_Elevator_EventScript_To<n>F's setdynamicwarp).
  const SILPH_FLOORS = [["11F", 13], ["10F", 13], ["9F", 24], ["8F", 22], ["7F", 23], ["6F", 20], ["5F", 22], ["4F", 22],
    ["3F", 22], ["2F", 22], ["1F", 22]];

  // A card-key door (FireRed's SilphCo_<n>F_EventScript_Door<k>): with the
  // Card Key from 5F it opens for good (FLAG_SILPH_<n>F_DOOR_<k>).
  const silphDoorFlag = (n, k, single) => "FLAG_SILPH_" + n + "F_DOOR" + (single ? "" : "_" + k);
  async function silphDoor(script) {
    const f = player.flags, [, n, k] = /^SilphCo_(\d+)F_EventScript_Door(\d*)$/.exec(script);
    const flag = silphDoorFlag(n, k || 1, !k);
    if (f[flag]) { await say(T("Text_TheDoorIsOpen")); return; }
    if (!f.FLAG_HIDE_SILPH_CO_5F_CARD_KEY) { await say(T("Text_ItNeedsCardKey")); return; }
    await sayWithJingle("mus_level_up", T("Text_CardKeyOpenedDoor"));
    f[flag] = true;
    applyPatches(player.location.map);
    sfx("se_unlock");
  }

  // 7F: Gary (SilphCo_7F_EventScript_RivalScene). This game's own team, at
  // about FireRed's levels: Pidgeot, Growlithe, Gyarados (which holds its
  // Gyaradosite and Mega Evolves), Exeggutor, Umbreon (his Eevee) and Alakazam.
  // Then he's off by the warp pad.
  const SILPH_RIVAL_TEAM = [["Pidgeot", 37], ["Growlithe", 35], ["Gyarados", 38, "gyaradosite"], ["Exeggutor", 35], ["Umbreon", 40], ["Alakazam", 35]];
  async function silphRival(top) {
    const f = player.flags, R = "LOCALID_SILPH_CO_RIVAL";
    music("mus_encounter_rival");
    await Overworld.act([{ who: R, moves: M("Common_Movement_ExclamationMark") }]);
    await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterDown") }, { who: R, moves: M("Common_Movement_Delay48") }]);
    await say(T("SilphCo_7F_Text_RivalWhatKeptYou"));
    if (top) await Overworld.act([{ who: R, moves: M("SilphCo_7F_Movement_RivalApproachTop") }]);
    await say(T("SilphCo_7F_Text_RivalIntro"));
    // (FireRed's IVs: 100, and 150 for his starter, here Umbreon.)
    const team = SILPH_RIVAL_TEAM.map(([sp, lv, item]) => Object.assign(Party.create(sp, lv, { ivs: Math.floor((sp === "Umbreon" ? 150 : 100) * 31 / 255) }),
      item ? { item } : {}));
    const ace = Math.max(...team.map((r) => r.level));
    const outcome = await battle("trainer", { foe: { name: "Rival " + player.rival, team, pic: "rival_late" },
      defeatText: T("SilphCo_7F_Text_RivalDefeat"), trainerId: "TRAINER_RIVAL_SILPH_SQUIRTLE",
      prize: 36 * ace });   // (FireRed's TRAINER_CLASS_RIVAL_LATE: 9, x4 as this game's prizes are)
    if (outcome !== "won") return;
    f.silphRival = true;
    show("world");
    await Overworld.resume();
    // (This game's own: before his "Smell ya!", a Mega Stone from Silph's labs.)
    const bye = T("SilphCo_7F_Text_RivalPostBattle");
    await say(bye.slice(0, -1));
    await megaStoneGift("pidgeotite", ["Oh, and here. Silph was making these.\nI grabbed a spare: a Pidgeotite.",
      "Not that it'll help you keep up\nwith me!"], player.rival);
    await say(bye.slice(-1));
    music("mus_rival_exit");
    await Overworld.act([{ who: R, moves: M(top ? "SilphCo_7F_Movement_RivalExitTop" : "SilphCo_7F_Movement_RivalExitBottom") }]);
    sfx("se_warp_in");
    await Overworld.act([{ who: R, moves: ["set_invisible"] }]);
    Overworld.removeObject(R);
    music((window.WORLD_MAPS[player.location.map] || {}).music);
  }

  // 11F: Giovanni (SilphCo_11F_EventScript_BattleGiovanni). This game's
  // own: a tag battle. Red comes down by the warp pad from 7F and stands
  // beside you, without a word; he brings Charizard (holding its Charizardite
  // X: it Mega Evolves), Snorlax and Pikachu; Giovanni has six, and his
  // Kangaskhan holds its Kangaskhanite. Beaten, Giovanni's gone, and so is Team Rocket, from
  // Silph Co. and from Saffron; and Red goes back the way he came.
  const SILPH_RED = "LOCALID_SILPH_CO_RED";
  // Red's Pokémon now: those he had at the top of Pokémon Tower, all fully
  // evolved, and a Snorlax, all at Lv. 36; for the tag battle he picks three.
  const RED_SILPH_ROSTER = [["Pikachu", 36], ["Charizard", 36, "charizardite-x"], ["Blastoise", 36], ["Venusaur", 36], ["Espeon", 36], ["Snorlax", 36]];
  const RED_SILPH_PICK = ["Charizard", "Snorlax", "Pikachu"];
  // FireRed's team for him (Nidorino, Kangaskhan, Rhyhorn, Nidoqueen), with
  // two more (his Dugtrio and Persian), six against the two of you.
  const SILPH_GIOVANNI_EXTRA = [["Dugtrio", 38], ["Persian", 39]];
  async function giovanniSilph(left) {
    const G = "LOCALID_SILPH_CO_GIOVANNI", ID = "TRAINER_BOSS_GIOVANNI_2", R = SILPH_RED;
    await Overworld.act([{ who: G, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    await sleep(400);
    await say(T("SilphCo_11F_Text_GiovanniIntro"));
    Screen.say("");
    const approach = [{ who: G, moves: M(left ? "SilphCo_11F_Movement_GiovanniApproachLeft" : "SilphCo_11F_Movement_GiovanniApproachRight") }];
    if (left) approach.push({ who: "player", moves: M("SilphCo_11F_Movement_PlayerFaceGiovanni") });
    await Overworld.act(approach);
    if (!canBattle()) return;
    // Red, from the warp pad.
    const me = Overworld.position();
    // (Beside you; or, coming at you from the left, the way round to you
    // is past Giovanni: below him, then.)
    const spots = left ? [{ x: 6, y: 16, face: "up" }] : besideYou().map((t) => Object.assign(t, { face: me.facing }));
    sfx("se_warp_in");
    // (He walks, there and back: he's in no hurry.)
    const from = await walkIn(R, lookOf("red"), { x: 2, y: 5 }, spots);
    if (Overworld.personPosition(R)) await faceEachOther(R);
    await say(["Red: …"]);
    await Overworld.act([{ who: R, moves: ["face_up"] }, { who: "player", moves: ["face_" + me.facing] }]);
    await say(["Red joined {PLAYER}, ready\nto battle!",
      "Giovanni: Hm? Another child…\nHow tiresome.",
      "No matter. I'll crush the two of you\ntogether!"]);
    const own = trainerTeam(ID).map((r) => (r.species === "Kangaskhan" ? Object.assign(r, { item: "kangaskhanite" }) : r));
    const extra = SILPH_GIOVANNI_EXTRA.map(([sp, lv]) => Party.create(sp, lv, { ivs: own[0].ivs.hp }));
    const team = own.slice(0, -1).concat(extra, own.slice(-1));   // (Nidoqueen, his ace, still last)
    const redTeam = RED_SILPH_PICK.map((sp) => RED_SILPH_ROSTER.find((m) => m[0] === sp))
      .map(([sp, lv, item]) => Object.assign(Party.create(sp, lv), item ? { item } : {}));
    const outcome = await battle("trainer", { foe: { name: "Boss Giovanni", team, pic: "leader_giovanni" },
      defeatText: T("SilphCo_11F_Text_GiovanniDefeat"), trainerId: ID, prizeClass: "Boss",
      prize: Player.prizeMoney("Boss Giovanni", team, "Boss"),
      partner: { name: "Red", team: redTeam, pic: "red" } });
    if (outcome === "cancelled") {
      // (Backed out: Giovanni goes back to his place, and Red with him out of sight.)
      await say(["Giovanni: Hmph. Lost your nerve?\nI'll be waiting."]);
      await Overworld.fadeToBlack();
      Overworld.refreshPeople();
      await Overworld.fadeFromBlack();
      return;
    }
    if (outcome !== "won") return;
    show("world");
    await Overworld.resume();
    await say(T("SilphCo_11F_Text_GiovanniPostBattle"));
    Screen.say("");
    const at = Overworld.personPosition(R);
    await Overworld.fadeToBlack();
    Overworld.refreshPeople();
    if (at) Overworld.addObject(R, at, lookOf("red"));
    await Overworld.fadeFromBlack();
    if (!at) return;
    await faceEachOther(R);
    await say(["Red: …", "Red gave a small nod."]);
    if (from) await walkOut(R, from);
    Overworld.removeObject(R);
  }

  // ---------- Route 12 to Fuchsia City ----------

  const isGirl = () => !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl);
  // (Your room in Littleroot, until a Pokémon Center's your place to come back to: Brendan's house, or May's for a girl, as
  // the truck's step-off has it, ui/hoenn-changes.js.)
  const hoennBedroom = () => ({ map: isGirl() ? "LittlerootTown_MaysHouse_2F" : "LittlerootTown_BrendansHouse_2F", x: 4, y: 2 });

  // A sign by a Pokémon statue: its picture with the sign's words (and it's
  // seen in the Pokédex).
  async function monSign(species, text) {
    Player.markSeen(player, species);
    showPicture(species);
    await say(text);
    hidePicture();
  }

  // The Snorlax asleep across Route 12 (Route12_EventScript_Snorlax): with
  // the Poké Flute it wakes up and attacks, a wild Snorlax (Lv. 30) you can
  // catch. Beaten, run from or not, it's gone; it lumbers back to the
  // mountains if you didn't catch it.
  // (Route 16's is the same: Route16_EventScript_Snorlax.)
  async function snorlax(person, route) {
    const f = player.flags;
    if (!f.gotPokeFlute) { await say(T("Route" + route + "_Text_MonSprawledOutInSlumber")); return; }
    if (!canBattle()) return;
    if (!(await confirm(fill(T("Text_WantToUsePokeFlute")[0])))) return;
    await sayWithJingle("mus_poke_flute", T("Text_PlayedPokeFlute"));
    await say(T("Text_SnorlaxWokeUp"));
    cry("Snorlax");
    await sleep(700);
    f["wokeRoute" + route + "Snorlax"] = true;
    Overworld.removePerson(person);
    const outcome = await battle("wild", { foe: { name: "Wild", team: [Party.create("Snorlax", 30)] }, terrain: "grass" });
    if (outcome === "lost") return;
    show("world");
    await Overworld.resume();
    // (Caught, it's in your party; otherwise it lumbers off.)
    if (outcome !== "caught") await say(T("Text_SnorlaxReturnedToMountains"));
  }

  // A fishing rod from one of the Fishing Guru's brothers ("Do you like to fish?").
  // The Fishing Guru's brothers, if you haven't the Fishing Rod yet: it's
  // theirs to give then (`explain`: what's said after, if anything). -> given?
  async function rodGift(prefix, takeThis, explain) {
    const L = (k) => T(prefix + k);
    const like = L("DoYouLikeToFish");
    await say(like.slice(0, -1));
    if (!(await confirm(fill(like[like.length - 1])))) { await say(L("OhThatsDisappointing")); return false; }
    await say(L(takeThis));
    await giveFishingRod("the Fishing Guru's brother");
    await say(explain ? L(explain) : FISHING_LEVELS_EXPLAINED);
    return true;
  }
  const hasFishingRod = () => Player.itemCount(player, "fishing-rod") > 0;
  async function giveFishingRod(from) {
    Player.addItem(player, "fishing-rod");
    await sayWithJingle(itemJingle("fishing-rod"), fill("{PLAYER} received a Fishing Rod from\n" + from + "."));
  }
  // (This game's own words: fishing levels, game/fishing.js.)
  const FISHING_LEVELS_EXPLAINED = ["The more Pokémon you hook, the\nbetter you get at fishing.",
    "And the better you fish, the rarer\nthe Pokémon that bite!"];
  // The Fishing Guru and his brothers on how your fishing is going.
  function fishingLevelTalk(who) {
    const lv = Fishing.level(fishingXp());
    const next = Fishing.TIERS.find(([from]) => from > lv);
    const said = ["Your fishing level is " + lv + "!"];
    if (lv >= Fishing.MAX_LEVEL) said.push("There's nothing left for me to teach\nyou. You're a true Fishing Guru!");
    else if (lv < 10) said.push("Keep at it! Better Pokémon bite\nonce you reach level 10.");
    else if (lv < 25) said.push("Not bad! Reach level 25 and the\nrarest Pokémon start biting.");
    else said.push(next ? "Splendid! Rare Pokémon bite even\nmore often from level " + next[0] + "." : "Splendid! You land the rare ones\nas often as anyone can.");
    if (who === "Vermilion") said.push("Fishing is a way of life!");
    return said;
  }

  // The Magikarp size record (src/pokemon_size_record.c): a Magikarp's size
  // comes from its personality and IVs (GetMonSizeHash), through
  // sBigMonSizeTable, times its Pokédex height; shown in inches, to a tenth.
  const BIG_MON_SIZES = [[290, 1, 0], [300, 1, 10], [400, 2, 110], [500, 4, 310], [600, 20, 710], [700, 50, 2710],
    [800, 100, 7710], [900, 150, 17710], [1000, 150, 32710], [1100, 100, 47710], [1200, 50, 57710], [1300, 20, 62710],
    [1400, 5, 64710], [1500, 2, 65210], [1600, 1, 65410], [1700, 1, 65510]];
  function monSizeHash(r) {
    const p = (r.personality >>> 0) & 0xffff, iv = (k) => ((r.ivs && r.ivs[k]) | 0) & 0xf;
    const hi = ((iv("atk") ^ iv("def")) * iv("hp")) ^ (p & 0xff);
    const lo = ((iv("spa") ^ iv("spd")) * iv("spe")) ^ (p >> 8);
    return ((hi << 8) + lo) & 0xffff;
  }
  // (Heracross's too, for the Water Path's Heracross fan.)
  function monSize(species, hash) {
    let i = 1;
    while (i < 15 && !(hash < BIG_MON_SIZES[i][2])) i++;
    const [base, div, from] = BIG_MON_SIZES[i < 15 ? i - 1 : 15];
    const height = Math.round(window.DEX[species].height * 10);
    return Math.floor(height * (base + Math.floor((hash - from) / div)) / 10);
  }
  const monInches = (species, hash) => { const n = Math.floor(monSize(species, hash) * 100 / 254); return Math.floor(n / 10) + "." + (n % 10); };
  const magikarpSizeHash = monSizeHash, magikarpSize = (hash) => monSize("Magikarp", hash), magikarpInches = (hash) => monInches("Magikarp", hash);
  async function magikarpRecord() {
    const f = player.flags, L = (k) => T("Route12_FishingHouse_Text_" + k);
    if (!player.party.some((r) => r.species === "Magikarp" && !r.egg)) { await say(L("TryFishingBringMeMagikarp")); return; }
    await say(L("OhMagikarpAllowMeToSee"));
    const r = await choosePartyFor("Choose a {PKMN}.");
    if (!r) return;
    if (r.species !== "Magikarp" || r.egg) { await say(L("DoesntLookLikeMagikarp")); return; }
    const hash = magikarpSizeHash(r), record = f.magikarpRecord != null ? f.magikarpRecord : 0;
    const now = magikarpSize(hash), best = magikarpSize(record), vars = [null, magikarpInches(hash), magikarpInches(record)];
    if (f.magikarpRecord == null || now > best) {
      f.magikarpRecord = hash;
      await say(L("WhoaXInchesTakeThis"), vars);
      Player.addItem(player, "net-ball");
      await sayWithJingle(itemJingle("net-ball"), "{PLAYER} received a Net Ball!");
      await say(L("LookForwardToGreaterRecords"));
      return;
    }
    await say(L(now === best ? "HuhXInchesSameSizeAsLast" : "HmmXInchesDoesntMeasureUp"), vars);
  }

  // The Move Deleter in Fuchsia City (FuchsiaCity_House3_EventScript_MoveDeleter).
  async function fuchsiaMoveDeleter() {
    const D = (k) => T("FuchsiaCity_House3_Text_" + k);
    const intro = D("WouldYouLikeToForgetMove");
    await say(intro.slice(0, -1));
    if (!(await confirm(fill(intro[intro.length - 1])))) { await say(D("ComeAgainToForgetOtherMoves")); return; }
    for (;;) {
      await say(D("WhichMonShouldForgetMove"));
      const r = await choosePartyFor("Choose a {PKMN}.");
      if (!r) { await say(D("ComeAgainToForgetOtherMoves")); return; }
      if (r.egg) { await say(T("FuchsiaCity_House3_Text_NoEggShouldKnowMoves")); return; }
      const name = Party.displayName(r);
      if (r.moves.length <= 1) { await say(D("MonOnlyKnowsOneMove"), [name]); return; }
      const i = await ask(fill(D("WhichMoveShouldBeForgotten")[0]), r.moves.map((m, k) => ({ label: m.name, value: k, className: "type-" + MOVES[m.name].type }))
        .concat([back()]));
      if (i === "back") continue;
      const move = r.moves[i].name;
      if (!(await confirm(fill(D("MonsMoveShouldBeForgotten")[0], [name, move])))) { await say(D("ComeAgainToForgetOtherMoves")); return; }
      r.moves.splice(i, 1);
      await sayWithJingle("mus_move_deleted", D("MonHasForgottenMoveCompletely").map((p) => fill(p, [name, move])));
      await persist();
      return;
    }
  }

  // The Safari Zone's Warden: without his teeth no one understands him; give
  // them back (the Gold Teeth from the Safari Zone's west area) and he gives
  // you HM04 Strength.
  async function warden() {
    const f = player.flags, W = (k) => T("FuchsiaCity_WardensHouse_Text_" + k);
    if (f.gotHM04) { await say(W("ExplainStrength")); return; }
    if (!Player.itemCount(player, "gold-teeth")) {
      const huh = W("HifFuffHefifoo");
      await say(huh.slice(0, -1));
      await say(W(await confirm(fill(huh[huh.length - 1])) ? "AhHowheeHoHoo" : "HeOhayHeHaHoo"));
      return;
    }
    await sayWithJingle("mus_obtain_tmhm", W("GaveGoldTeethToWarden"));
    Player.removeItem(player, "gold-teeth");
    await say(W("WardenPoppedInHisTeeth"));
    await say(W(isGirl() ? "ThanksLassieGiveYouSomething" : "ThanksSonGiveYouSomething"));
    Player.addItem(player, "hm04");
    f.gotHM04 = true;
    await sayWithJingle(itemJingle("hm04"), W("ReceivedHM04FromWarden"));
  }

  // Koga: battle (talking to him), then the Soul Badge and TM06 Toxic
  // (FireRed's TM06: the TM with Toxic here). Beating him also beats his
  // Gym's trainers.
  // His team (this game's): Weezing, Muk (FireRed's), Arbok, and his ace,
  // Beedrill, holding its Beedrillite: it Mega Evolves, then Terastallizes
  // into a Ground type (in the rematch too).
  function kogaTeam() {
    const fr = trainerTeam("TRAINER_LEADER_KOGA");
    const weezing = fr.find((r) => r.species === "Weezing"), muk = fr.find((r) => r.species === "Muk");
    return [weezing, muk, Party.create("Arbok", 40, { ivs: 0 }),
      Object.assign(Party.create("Beedrill", 44, { ivs: 0 }),
        { item: "beedrillite", teraType: "Ground", teraAce: true })];
  }
  async function koga(person) {
    const f = player.flags, ID = "TRAINER_LEADER_KOGA";
    if (!f[ID]) {
      await say(person.trainer.intro);
      if (!canBattle()) return;
      const outcome = await battle("trainer", { foe: { name: "Leader Koga", team: kogaTeam(), pic: "leader_koga", tera: true },
        defeatText: person.trainer.defeat, trainerId: ID, terrain: "leader" });
      if (outcome !== "won") return;
      if (!hasBadge("soul")) player.badges.push("soul");
      for (const t of ["TAMER_PHIL", "TAMER_EDGAR", "JUGGLER_KIRK", "JUGGLER_SHAWN", "JUGGLER_KAYDEN", "JUGGLER_NATE"]) f["TRAINER_" + t] = true;
      player.flags.lastCenter = "FuchsiaCity_PokemonCenter_1F";
      show("world");
      await Overworld.resume();
    }
    const tm = machineFor("Toxic");
    if (!f.gotTM06FromKoga) {
      await say(T("FuchsiaCity_Gym_Text_KogaExplainSoulBadge"));
      Player.addItem(player, tm);
      f.gotTM06FromKoga = true;
      await sayWithJingle(itemJingle(tm), tmText(T("FuchsiaCity_Gym_Text_ReceivedTM06FromKoga"), 6, tm));
      await say(tmText(T("FuchsiaCity_Gym_Text_KogaExplainTM06"), 6, tm));
      return;
    }
    await say(T("FuchsiaCity_Gym_Text_KogaPostBattle"));
  }

  // ---------- The Seafoam Islands ----------
  //
  // (game/seafoam.js has the boulders and currents.) Through a hole onto the
  // water of B3F or B4F, you're surfing (FallWarpEffect_7) and, unless both of
  // the floor's boulders block it, the current carries you off: from B3F
  // down to B4F, where you come up its current from below; on B4F to the
  // shore, where you climb out.
  let seafoamFell = null;   // (FireRed's VAR_TEMP_1 on B3F and B4F: arrived by falling)
  async function seafoamFall(map) {
    seafoamFell = null;
    const at = Overworld.position();
    Overworld.setAvatar("surf");
    const ride = Seafoam.fallRide(player.flags, map, at.x);
    if (!ride) return;
    await Overworld.act([{ who: "player", moves: ride.moves }]);
    if (ride.warp) {
      await Overworld.teleport(Object.assign({ facing: "up" }, ride.warp));
      Overworld.setAvatar("surf");
      await Overworld.act([{ who: "player", moves: Seafoam.ENTER_B4F_ON_CURRENT }]);
      return;
    }
    if (ride.dismount) {
      await Overworld.act([{ who: "player", moves: ["jump_" + ride.dismount] }]);
      Overworld.setAvatar("walk");
    }
  }

  // ---------- Johto's roaming beasts ----------
  //
  // HGSS's CreateRoamer, after the Burned Tower (Raikou and Entei; Suicune
  // waits at the Bell Tower, as in HGSS): each roams Johto until you catch it.
  // Here one of them is the Pokémon in 1 of 16 wild battles in Johto's grass
  // outdoors, at Lv. 40, as likely either; run from it, or knock it out, and it
  // roams on.
  const JOHTO_ROAMERS = ["Raikou", "Entei"];
  function roamerWild(mon, table) {
    // (A save from past the Burned Tower before the beasts roamed: off they go.)
    if (!player.flags.johtoRoamers && johto.flag("FLAG_HIDE_BURNED_TOWER_B1F_RAIKOU")) player.flags.johtoRoamers = { Raikou: true, Entei: true };
    const r = player.flags.johtoRoamers, m = window.WORLD_MAPS[player.location.map] || {};
    // (Hoenn's Latias or Latios, from the news flash on, in the grass or on the water of its routes: InitRoamer.)
    if (mon && player.flags.hoennRoamer && m.region === "hoenn" && /route/.test(m.type || "") && (table === m.wild || table === m.water) && Math.random() < 1 / 16)
      return { species: player.flags.hoennRoamer, level: 40 };
    if (!mon || table !== m.wild || !r || m.region !== "johto" || m.type === "indoor" || m.type === "underground") return mon;
    const out = JOHTO_ROAMERS.filter((sp) => r[sp]);
    if (!out.length || Math.random() >= 1 / 16) return mon;
    return { species: out[Math.floor(Math.random() * out.length)], level: 40 };
  }

  // ---------- The Delta Episode (this game's own, after Omega Ruby and Alpha Sapphire's) ----------
  //
  // After Hoenn's Hall of Fame (FLAG_SYS_GAME_CLEAR): a meteoroid is falling on Hoenn. player.flags.delta:
  //   0 (not yet)  Mossdeep's Space Center, 1F, as you come in: its director and Steven tell you of it,
  //                and Zinnia, the Draconids' lorekeeper, comes in and battles you; then she's off
  //   1            Meteor Falls: a Draconid elder tells the old story (the sky's protector, Rayquaza)
  //                and sends you up the Sky Pillar
  //   2            the Sky Pillar's top: Zinnia again, a battle; Rayquaza answers her call (yours, if
  //                you have one), and carries you up into space (ui/rayquaza-scene.js's flight),
  //                into the meteoroid, where Deoxys waits: Lv. 80, in the meteoroid's heart; the
  //                meteoroid breaks apart and you're back at the Space Center
  //   3            done; 2F's researcher has found a strange energy signature in the sealed
  //                observation room, and unseals its door (4): Jirachi, below
  // Zinnia's picture and sheet are Emerald's Hex Maniac's recoloured (tools/build-delta-episode.js).
  const DELTA = { SC1: "MossdeepCity_SpaceCenter_1F", SC2: "MossdeepCity_SpaceCenter_2F", DECK: "MossdeepCity_SpaceCenter_ObservationDeck",
    FALLS: "MeteorFalls_1F_1R", TOP: "SkyPillar_Top" };
  const DELTA_PEOPLE = [
    [DELTA.SC1, { id: 960, localId: "LOCALID_DELTA_STEVEN", x: 9, y: 3, movement: "face_down", script: "Delta_EventScript_Steven", sprite: "em_steven" }],
    [DELTA.FALLS, { id: 961, localId: "LOCALID_DELTA_ELDER", x: 24, y: 18, movement: "face_right", script: "Delta_EventScript_Elder", sprite: "em_old_woman" }],
    [DELTA.TOP, { id: 962, localId: "LOCALID_DELTA_ZINNIA", x: 12, y: 11, movement: "face_down", script: "Delta_EventScript_Zinnia", sprite: "em_zinnia" }]];
  for (const [map, p] of DELTA_PEOPLE) {
    const m = window.WORLD_MAPS[map];
    if (!m || m.people.some((q) => q.localId === p.localId)) continue;
    const look = lookOf(p.sprite) || { sprite: p.sprite, width: 16, height: 32, frames: 9 };
    m.people.push(Object.assign({ rangeX: 0, rangeY: 0, flag: null, text: null }, p, { width: look.width, height: look.height, frames: look.frames }));
  }
  ["Delta_EventScript_Steven", "Delta_EventScript_Elder", "Delta_EventScript_Zinnia", "SpaceCenter_EventScript_DeckDoor", "SpaceCenter_EventScript_WishRock"].forEach((n) => SPECIAL.add(n));
  const hoennCleared = () => hoenn.flag("FLAG_SYS_GAME_CLEAR") || hoenn.flag("FLAG_IS_CHAMPION");
  const deltaStage = () => player.flags.delta | 0;
  const ownsSpecies = (sp) => player.party.concat(...(player.boxes || [])).some((r) => r && !r.egg && r.species === sp);
  // (Who's there: Steven at the Space Center but while you're off after the meteoroid; the elder from the
  // telling on; Zinnia at the Sky Pillar's top while she waits for you there.)
  function deltaVisible(person) {
    if (person.localId === "LOCALID_DELTA_STEVEN") return hoennCleared() && deltaStage() !== 1 && deltaStage() !== 2;
    if (person.localId === "LOCALID_DELTA_ELDER") return deltaStage() >= 1;
    if (person.localId === "LOCALID_DELTA_ZINNIA") return deltaStage() === 2;
    return undefined;
  }
  // The scenes as you come in: 1F's at the start, the Sky Pillar's top, 2F's after Jirachi.
  function deltaDue(script) {
    script = String(script || "").replace(/^enter:/, "arrive:");   // (through a door, or over a map's edge, the same)
    if (script === "arrive:" + DELTA.SC1) return hoennCleared() && !deltaStage();
    if (script === "arrive:" + DELTA.TOP) return deltaStage() === 2;
    if (script === "arrive:" + DELTA.SC2) return !!player.flags.jirachiMet && !player.flags.jirachiAfter;
    return false;
  }
  // Zinnia's teams: Omega Ruby and Alpha Sapphire's Pokémon, at the post-game's levels; her ace a Mega Salamence.
  const zinniaTeam = (second) => (second
    ? [["Tyrantrum", 70], ["Noivern", 70], ["Goodra", 71], ["Altaria", 71], ["Salamence", 74, { item: "salamencite", teraType: "Dragon", teraAce: true }]]
    : [["Tyrunt", 62], ["Shelgon", 62], ["Altaria", 63], ["Salamence", 65, { item: "salamencite" }]])
    .map(([sp, lv, extra]) => Object.assign(Party.create(sp, lv, { ivs: 31 }), extra || {}));
  async function zinniaBattle(second) {
    const team = zinniaTeam(second);
    const outcome = await battle("trainer", { foe: { name: "Lorekeeper Zinnia", team, pic: "zinnia", tera: second },
      defeatText: second ? ["Zinnia: Hah… So that's how strong you are.", "Then the sky's protector will listen to you, too."]
        : ["Zinnia: Not bad. Not bad at all!"], prize: 200 * Math.max(...team.map((r) => r.level)),
      music: second ? "em_vs_champion" : "em_vs_elite_four" });
    if (outcome === "won") { show("world"); await Overworld.resume(); }
    return outcome;
  }
  async function deltaScene(script) {
    script = script.replace(/^enter:/, "arrive:");
    const f = player.flags, Z = "LOCALID_DELTA_ZINNIA_1F", D = "LOCALID_SPACE_CENTER_1F_SCIENTIST_1";
    if (script === "arrive:" + DELTA.SC1) {
      await Overworld.act([{ who: D, moves: ["face_down", "emote_exclamation_mark"] }]);
      await say(["Director: You're the Champion,\naren't you? Thank goodness!", "Our telescopes have found a\nmeteoroid. A huge one.",
        "It's falling toward Hoenn.\nIf nothing changes, it will strike\nin a matter of days."]);
      await say(["Steven: Devon is working on a way\nto send it somewhere else, but\nthere isn't time to finish it.",
        "We need another answer, " + player.name + "."]);
      music("mus_encounter_girl");
      const from = await walkIn(Z, lookOf("em_zinnia"), { x: 7, y: 9 }, [{ x: 7, y: 6, face: "up" }, { x: 8, y: 6, face: "up" }]);
      await say(["???: There is another answer.\nThere always was.", "Zinnia: I'm Zinnia. My people, the\nDraconids, have watched the sky\nfor a thousand years.",
        "The one who guards Hoenn's sky\ncan stop that rock. But only if\nsomeone strong enough asks it.", "So. Let's see how strong the\nChampion really is!"]);
      Screen.say("");
      if (await zinniaBattle(false) !== "won") { if (Overworld.personPosition(Z)) Overworld.removeObject(Z); return; }
      await say(["Zinnia: You'll do.", "Come to Meteor Falls. My people's\nstory is told there. You'd better\nhear it before the sky falls."]);
      if (from) await walkOut(Z, from); else Overworld.removeObject(Z);
      await say(["Steven: Rayquaza… Is that what\nshe means?", "Go, " + player.name + ". I'll help the\nSpace Center here."]);
      f.delta = 1;
      music((window.WORLD_MAPS[player.location.map] || {}).music);
      await persist();
      return;
    }
    if (script === "arrive:" + DELTA.TOP) {
      if (!f.deltaZinnia) {
        await say(["Zinnia: So you climbed all the way\nup. Good.", "Up there, past the clouds, the\nmeteoroid is coming.",
          "When the sky's protector rises, it\nwill only carry someone it trusts.\nShow me you're that someone!"]);
        Screen.say("");
        if (await zinniaBattle(true) !== "won") return;
        f.deltaZinnia = true;
        await persist();
      }
      await deltaRide();
      return;
    }
    if (script === "arrive:" + DELTA.SC2) {
      // After Jirachi: the readings settle; the instruments glitch. (Out of the doorway first: the scene comes before the step out.)
      const R = "LOCALID_SPACE_CENTER_2F_SCIENTIST";
      if (Overworld.position().y === 1) await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
      await Overworld.act([{ who: R, moves: ["emote_exclamation_mark"] }]);
      await say(["Researcher: The energy readings\nfrom the observation room…", "They've settled. Whatever it was,\nit's gone quiet."]);
      sfx("se_pc_off");
      await Overworld.shake(16, { x: 1, y: 0, delay: 1 });
      await screenFlash([255, 255, 255], 3);
      await say(["Researcher: Wh-what?! The\ninstruments just…", "For a moment there, they recorded\nsomething impossible.",
        "A wish… granted? Ha… ha ha. I must\nbe working too hard."]);
      f.jirachiAfter = true;
      await persist();
    }
  }
  // Rayquaza carries you up, into the meteoroid; Deoxys; the meteoroid breaks apart; back to the Space Center.
  async function deltaRide() {
    const f = player.flags, yours = ownsSpecies("Rayquaza");
    await say(["Zinnia: Lord Rayquaza! Protector of\nthe sky! Hear us!"].concat(yours
      ? ["{PLAYER}'s Rayquaza let out a\ngreat roar!", "Zinnia: It answers you. Of course it\ndoes. Go on, Champion. Ride it!"]
      : ["A roar came down from beyond the\nclouds, and Rayquaza descended!", "Zinnia: It came… Go on, Champion.\nIt will carry you. Ride it!"]));
    cry("Rayquaza");
    await sleep(600);
    Screen.say("");
    await Overworld.fadeToBlack();
    await RayquazaScene.play($("#overlay"), 2, { cry, sfx, music });
    $("#overlay").classList.add("hidden");
    show("world");
    await say(["Rayquaza tore up through the sky,\npast the clouds, into the black of\nspace…", "…and smashed into the meteoroid!",
      "Deep in the meteoroid's heart,\nsomething stirred…"]);
    if (!canBattle()) return;
    const outcome = await battle("wild", { foe: { name: "Wild", team: [Party.create("Deoxys-Normal", 80)] }, music: "mus_vs_deoxys", terrain: "space" });
    if (outcome === "lost") return;
    show("world");
    await Overworld.resume();
    await Overworld.fadeToBlack();
    await say(["The meteoroid broke apart into a\nshower of shooting stars!", "Rayquaza carried {PLAYER} back down\nto Hoenn…"]);
    f.delta = 3;
    delete f.deltaZinnia;
    await Overworld.teleport({ map: DELTA.SC1, x: 7, y: 6, facing: "up" });
    await Overworld.fadeFromBlack();
    await say(["Director: The meteoroid… It's gone!\nIt simply broke apart!", "Hoenn is safe. You've saved us all,\n" + player.name + "!",
      "Ah, and one more thing. Our\nresearcher upstairs has found\nsomething odd. Would you see him?"]);
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    await persist();
  }
  async function deltaTalk(script, ev) {
    const f = player.flags, st = deltaStage();
    if (script === "Delta_EventScript_Steven") {
      await say(st >= 3 ? ["Steven: The sky over Hoenn is clear\nagain, thanks to you.", "I'll never forget it, " + player.name + "."]
        : ["Steven: A meteoroid… Hoenn has seen\nfalling stars before, but never one\nlike this."]);
      return true;
    }
    if (script === "Delta_EventScript_Elder") {
      if (st === 1) {
        await say(["Elder: So you are the one Zinnia\nspoke of. Listen, then.", "Long ago a great rock fell from\nthe sky. Our people's ancestors\nfeared the end of the world.",
          "But the sky's protector, Lord\nRayquaza, came down and broke the\nrock apart before it could fall.", "We Draconids have told that story\never since, so we'd be ready if a\nstar ever fell again.",
          "Zinnia has gone up the Sky Pillar\nto call Lord Rayquaza.", "Go to her, child. Hurry."]);
        f.delta = 2;
        await persist();
      } else await say(st >= 3 ? ["Elder: The star broke apart over\nthe sea. The story ends well, this\ntime.", "Thank you, child."] : ["Elder: Hurry to the Sky Pillar."]);
      return true;
    }
    if (script === "Delta_EventScript_Zinnia") { await deltaScene("arrive:" + DELTA.TOP); return true; }
    if (script === "MossdeepCity_SpaceCenter_2F_EventScript_Scientist" && st === 3) {
      await say(["Researcher: Ah, the hero of the hour!", "Ever since the meteoroid broke up,\nwe've been picking up a strange\nenergy signature.",
        "It's coming from the observation\nroom up here. That room's been\nsealed for years.", "I've unsealed the door. Would you\ntake a look? I can't explain it."]);
      f.delta = 4;
      sfx("se_door");
      applyPatches(player.location.map);
      await persist();
      return true;
    }
    if (script === "SpaceCenter_EventScript_DeckDoor") {
      await say(st >= 4 ? ["The observation room's door is open."] : ["OBSERVATION ROOM", "The door is sealed.\nAUTHORIZED PERSONNEL ONLY."]);
      return true;
    }
    if (script === "SpaceCenter_EventScript_WishRock") { await wishRock(); return true; }
    return false;
  }

  // ---------- Jirachi (this game's own: the Space Center's observation deck) ----------
  //
  // Once the 2F researcher has unsealed it: a small observation deck, a wide window on the night sky, a
  // white rock in the middle (tools/build-delta-episode.js). Check the rock and make a wish (only words);
  // it glows, the stars outside line up, and Jirachi appears, to test you: a wild Jirachi, Lv. 50. Caught
  // or beaten it's gone for good (and 2F's researcher sees the readings settle); run from it, and it's back
  // the next time you wish.
  const deckFx = new Set();
  async function screenFlash(rgb, times) {
    const c = $("#overlay"), g = c.getContext("2d");
    c.classList.remove("hidden");
    for (let n = 0; n < (times || 1); n++) for (let a = 0; a <= 8; a++) {
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = "rgba(" + rgb.join(",") + "," + (1 - Math.abs(a - 4) / 4) + ")";
      g.fillRect(0, 0, c.width, c.height);
      await sleep(30);
    }
    g.clearRect(0, 0, c.width, c.height);
    c.classList.add("hidden");
  }
  async function wishRock() {
    const f = player.flags, J = "LOCALID_DECK_JIRACHI";
    if (f.jirachiMet) { await say(["It's a white rock.", "Its warmth has faded."]); return; }
    await say(["It's a strange white rock.", "It feels warm… as if it's listening."]);
    if (!(await confirm("Make a wish?"))) return;
    await say("{PLAYER} closed their eyes and made\na wish…");
    Screen.say("");
    music(null);
    await sleep(500);
    deckFx.add("glow"); sfx("se_m_heal_bell");
    await sleep(1200);
    deckFx.add("stars"); sfx("se_m_moonlight");
    await say("Outside the window, the stars drew\ninto a line across the sky…");
    Screen.say("");
    await screenFlash([255, 250, 210], 1);
    Overworld.addObject(J, { x: 4, y: 2, facing: "down" }, { sprite: "follow/385", width: 32, height: 32, frames: 9, offsetX: -8 });
    cry("Jirachi");
    await sleep(700);
    await say(["Jirachi: …", "A wish only holds power if the one\nwho makes it is strong enough to\nprotect it."]);
    Screen.say("");
    const outcome = canBattle() ? await battle("wild", { foe: { name: "Wild", team: [Party.create("Jirachi", 50)] }, music: "mus_vs_legend" }) : "ran";
    if (outcome === "lost") { deckFx.clear(); Overworld.removeObject(J); return; }
    show("world");
    await Overworld.resume();
    if (Overworld.personPosition(J)) Overworld.removeObject(J);
    deckFx.clear();
    if (outcome === "ran") { await say(["Jirachi vanished into the starlight…", "Maybe it will come again for\nanother wish."]); return; }
    if (outcome === "won") await say("Jirachi faded back into the stars…");
    f.jirachiMet = true;
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    await persist();
  }

  // ---------- The GS Ball (Pokémon Crystal's) ----------
  //
  // This game's way to it: once you've been through the Hall of Fame, Prof.
  // Oak in his lab gives you the GS Ball (Crystal's came from Goldenrod's
  // Pokémon Center, and Kurt looked it over first). Put it in Ilex Forest's
  // shrine (Crystal's IlexForestShrineScript, its words) and Celebi appears,
  // wild at Lv. 50 (Crystal's was 30). Catch it and the GS Ball is spent;
  // run, or knock it out, and the Ball is still yours to try again.
  async function oakGsBall() {
    const f = player.flags;
    await say(["Oak: Ah, {PLAYER}! Our new\nChampion! Ho ho!", "I have something for you.",
      "A friend sent me this mysterious\nPoké Ball. It's called the GS Ball.", "I've studied it for months, but I\ncan't make heads or tails of it!",
      "Kurt, the Ball maker in Johto's\nAzalea Town, says there's a shrine\nin Ilex Forest…", "Perhaps the GS Ball has something\nto do with it. Will you take it\nthere for me?"]);
    Player.addItem(player, "gs-ball");
    f.gotGsBall = true;
    await sayWithJingle("mus_obtain_key_item", "{PLAYER} received the GS Ball\nfrom Prof. Oak!");
    await say(["Oak: Let me know what you find\nat the shrine!"]);
    await persist();
  }
  async function ilexShrineCelebi() {
    const f = player.flags;
    await say(["Ilex Forest Shrine…", "It's in honor of the forest's\nprotector…", "Oh? What is this?", "It's a hole.\nIt looks like the GS Ball would fit\ninside it."]);
    if (!(await confirm("Want to put the GS Ball here?"))) return;
    await say("{PLAYER} put in the GS Ball.");
    Screen.say("");
    if (!canBattle()) return;
    await sleep(333);
    music(null);
    await Overworld.act([{ who: "player", moves: ["face_down"] }]);
    await sleep(500);
    await Overworld.fadeToBlack();
    cry("Celebi");
    await Overworld.fadeFromBlack();
    await sleep(300);
    const outcome = await battle("wild", { foe: { name: "Wild", team: [Party.create("Celebi", 50)] }, music: "mus_vs_legend", terrain: "grass" });
    if (outcome === "lost") return;
    show("world");
    await Overworld.resume();
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    if (outcome === "ran" || outcome === "won") { await say(["Celebi vanished into the forest…", "The GS Ball rolled back out of\nthe shrine."]); return; }
    Player.removeItem(player, "gs-ball");
    f.gsBallCelebi = true;
    await persist();
  }

  // The legendary birds: Articuno (SeafoamIslands_B4F_EventScript_Articuno)
  // and Zapdos (PowerPlant_EventScript_Zapdos), wild at Lv. 50, to the
  // legendary battle music. Beaten or caught, it's gone for good; run from,
  // it flies away, and is back the next time you come.
  // (Mewtwo in Cerulean Cave too, `opts` { level, text, music, moves }: Lv. 70,
  // "Mew!", its own battle music: CeruleanCave_B1F_EventScript_Mewtwo.)
  async function legendaryBird(person, species, flag, opts) {
    opts = opts || {};
    if (!canBattle()) return;
    cry(species);
    await say(opts.text || T("Text_Gyaoo"));
    music("mus_encounter_gym_leader");
    await sleep(300);
    const outcome = await battle("wild", { foe: { name: "Wild", team: [Party.create(species, opts.level || 50, opts.moves ? { moves: opts.moves } : {})] }, music: opts.music || "mus_vs_legend" });
    if (outcome === "lost") return;
    show("world");
    await Overworld.resume();
    if (outcome === "ran") {
      await Overworld.fadeToBlack();
      tempFlags.add(player.location.map + ":" + person.flag);
      Overworld.removePerson(person);
      await Overworld.fadeFromBlack();
      await say(T("Text_MonFlewAway"), [species]);
      return;
    }
    player.flags[flag] = true;
    if (outcome === "won") { await Overworld.fadeToBlack(); Overworld.removePerson(person); await Overworld.fadeFromBlack(); }
    else Overworld.removePerson(person);
    // (Mewtwo gone, its Mega Stones are there beside its spot.)
    if (species === "Mewtwo") Overworld.refreshPeople();
  }

  // ---------- The Power Plant ----------
  //
  // The two "item balls" that are Electrode (PowerPlant_EventScript_Electrode1
  // and 2): a wild Lv. 34 Electrode, with its cry and no words. Whatever
  // happens (but blacking out), it's gone for good.
  async function powerPlantElectrode(person, n) {
    if (!canBattle()) return;
    cry("Electrode");
    await sleep(900);
    const outcome = await battle("wild", { foe: { name: "Wild", team: [Party.create("Electrode", 34)] } });
    if (outcome === "lost") return;
    player.flags["foughtPowerPlantElectrode" + n] = true;
    show("world");
    await Overworld.resume();
    if (outcome === "caught") { Overworld.removePerson(person); return; }
    await Overworld.fadeToBlack();
    Overworld.removePerson(person);
    await Overworld.fadeFromBlack();
  }

  // ---------- Viridian City's Gym ----------

  // Open once you have the Cascade, Thunder, Rainbow, Soul, Marsh and Volcano
  // Badges (ViridianCity_EventScript_TryUnlockGym: FireRed doesn't check the
  // Boulder Badge).
  const viridianGymOpen = () => LeagueRoad.gymOpen(player.badges);

  // Giovanni (ViridianCity_Gym_EventScript_Giovanni): back at his Gym, the
  // Leader all along. Battle, then the Earth Badge and TM26 Earthquake;
  // beating him also beats his Gym's trainers, sends Gary to wait on Route 22
  // (VAR_MAP_SCENE_ROUTE22, 3) and the Rockets left around Kanto away. Talk
  // to him again and he tells you Team Rocket is finished, and he's gone.
  async function giovanniGym(person) {
    const f = player.flags, ID = "TRAINER_LEADER_GIOVANNI";
    const tm = machineFor("Earthquake");
    if (!f[ID]) {
      const intro = person.trainer.intro;
      await say(intro.slice(0, -1));
      music("mus_encounter_rocket");
      await say(intro.slice(-1));
      if (!canBattle()) return;
      const outcome = await battle("trainer", { foe: { name: "Leader Giovanni", team: swappedTeam(ID), pic: "leader_giovanni", tera: true },
        defeatText: person.trainer.defeat, trainerId: ID, terrain: "leader" });
      if (outcome !== "won") return;
      if (!hasBadge("earth")) player.badges.push("earth");
      for (const t of ["TAMER_JASON", "TAMER_COLE", "BLACK_BELT_ATSUSHI", "BLACK_BELT_KIYO", "BLACK_BELT_TAKASHI",
        "COOLTRAINER_SAMUEL", "COOLTRAINER_YUJI", "COOLTRAINER_WARREN"]) f["TRAINER_" + t] = true;
      player.flags.lastCenter = "ViridianCity_PokemonCenter_1F";
      show("world");
      await Overworld.resume();
    }
    if (!f.gotTM26FromGiovanni) {
      await say(T("ViridianCity_Gym_Text_ExplainEarthBadgeTakeThis"));
      Player.addItem(player, tm);
      f.gotTM26FromGiovanni = true;
      await sayWithJingle(itemJingle(tm), tmText(T("ViridianCity_Gym_Text_ReceivedTM26FromGiovanni"), 26, tm));
      await say(tmText(T("ViridianCity_Gym_Text_ExplainTM26"), 26, tm));
      await giovanniKangaskhanite();
      return;
    }
    if (await giovanniKangaskhanite()) return;
    await say(T("ViridianCity_Gym_Text_GiovanniPostBattle"));
    Screen.say("");
    await Overworld.fadeToBlack();
    f.giovanniLeft = true;
    Overworld.removePerson(person);
    await Overworld.fadeFromBlack();
  }

  // (This game's own: his Kangaskhan's Mega Stone, after the badge and TM.)
  const giovanniKangaskhanite = () => megaStoneGift("kangaskhanite", ["And take this. A Kangaskhanite.",
    "Team Rocket has no more use for it.\nPerhaps you can master its power."], "Giovanni");

  // ---------- Route 22, on the way to the League: Leaf ----------
  //
  // Where FireRed's Route22_EventScript_LateRival has Gary (this game's own:
  // Leaf), once you've beaten Giovanni: she comes up from the left on your
  // way to the League. Butterfree, Wigglytuff, Nidoqueen, Politoed, her
  // starter (fully evolved) and her ace, Dragonite, holding its Dragoninite:
  // it Mega Evolves and Terastallizes into a Flying type (she has a Tera Orb).
  const FINAL_STAGE = { Bulbasaur: "Venusaur", Charmander: "Charizard", Squirtle: "Blastoise" };
  const route22LeafTeam = () => {
    const starter = FINAL_STAGE[RIVAL_PICK[player.flags.starter] || "Bulbasaur"];
    return [Party.create("Butterfree", 47, { ivs: 20 }), Party.create("Wigglytuff", 47, { ivs: 20 }), Party.create("Nidoqueen", 48, { ivs: 20 }),
      Party.create("Politoed", 48, { ivs: 20 }), Party.create(starter, 50, { ivs: 25 }),
      Object.assign(Party.create("Dragonite", 53, { ivs: 31 }), { item: "dragoninite", teraType: "Flying", teraAce: true })];
  };
  const route22LateRivalDue = () => !!(player.flags.TRAINER_LEADER_GIOVANNI && !player.flags.route22LateRival);
  async function route22LateRival(side) {
    if (!route22LateRivalDue()) return;
    const f = player.flags, R = "LOCALID_ROUTE22_RIVAL";
    music("mus_encounter_rival");
    Overworld.addObject(R, { x: 25, y: side === "Top" ? 4 : 5, facing: "right" }, window.WORLD_SPRITES.leaf);
    await Overworld.act(side === "Bottom"
      ? [{ who: R, moves: M("Route22_Movement_RivalApproachBottom") }, { who: "player", moves: M("Route22_Movement_PlayerFaceRival") }]
      : [{ who: R, moves: M("Route22_Movement_RivalApproach") }]);
    await say(["Leaf: {PLAYER}! I knew I'd catch\nyou here!", "You've got all eight Badges too?\nSo have I!",
      "Before we take on the Pokémon\nLeague… one more battle?", "I've been training really hard.\nThis time I'm going to win!"]);
    const team = route22LeafTeam();
    const outcome = await battle("trainer", { foe: { name: "Pokémon Trainer " + LAB_RIVAL_NAME, team, pic: "green", tera: true },
      defeatText: ["Leaf: Wow… You're amazing,\n{PLAYER}!"], prize: 36 * 53 });
    if (outcome !== "won") { if (outcome === "cancelled") Overworld.removeObject(R); return; }
    f.route22LateRival = true;
    show("world");
    await Overworld.resume();
    await say(["Leaf: I'll keep training, and one day\nI'll beat you!", "Good luck at the Pokémon League,\n{PLAYER}! I'll be cheering for you!"]);
    Screen.say("");
    await sleep(170);
    music("mus_rival_exit");
    await Overworld.act([{ who: R, moves: M("Route22_Movement_LateRivalExit") }]);
    Overworld.removeObject(R);
    music((window.WORLD_MAPS[player.location.map] || {}).music);
  }

  // ---------- Kanto's Gym Leaders' rematches ----------
  //
  // This game's own: once you're the Champion (and each has given you their
  // TM), Kanto's Gym Leaders battle you again in their Gyms, once a day (the
  // game's clock: Player.gameTime), with stronger teams: HeartGold and
  // SoulSilver's rematch teams where they have them (TRAINER_LEADER_*_2:
  // Brock, Misty, Lt. Surge, Erika, Sabrina, Blaine) and Koga's from HGSS's
  // Elite Four rematch (Giovanni's Gym has none). Each one's ace Terastallizes
  // as in your first battle, and Koga's Beedrill, Sabrina's Alakazam and
  // Blaine's Houndoom Mega Evolve again. Lose, and they'll take you on again today.
  const KANTO_REMATCH = {
    PewterCity_Gym_EventScript_Brock: { id: "TRAINER_LEADER_BROCK", tm: "gotTM39", name: "Brock", pic: "leader_brock",
      team: () => leaderTeam("HGSS_TRAINER_LEADER_BROCK_BROCK_2", "Onix", { teraType: "Dragon" }),
      intro: ["Brock: You're the Champion now?", "My rock-hard will is stronger than\never. Let's see if you can crack it!"],
      defeat: ["Brock: Your strength is solid as a\nrock. Come back anytime!"] },
    CeruleanCity_Gym_EventScript_Misty: { id: "TRAINER_LEADER_MISTY", tm: "gotTM03", name: "Misty", pic: "leader_misty",
      team: () => leaderTeam("HGSS_TRAINER_LEADER_MISTY_MISTY_2", "Starmie", { teraType: "Psychic" }),
      intro: ["Misty: The Champion, back at my Gym!", "My water Pokémon have gotten tougher.\nReady to get soaked?"],
      defeat: ["Misty: Wow… You're still way too\nstrong. Come by again tomorrow!"] },
    VermilionCity_Gym_EventScript_LtSurge: { id: "TRAINER_LEADER_LT_SURGE", tm: "gotTM34", name: "Lt. Surge", pic: "leader_lt_surge",
      team: () => leaderTeam("HGSS_TRAINER_LEADER_LT_SURGE_LT__SURGE_2", "Raichu", { teraType: "Water" }),
      intro: ["Lt. Surge: Hey, kid! The Champion!", "My electric soldiers have been drilling\nday and night! Let's battle!"],
      defeat: ["Lt. Surge: Whoa! You're the real deal,\nkid! Come back for another round!"] },
    CeladonCity_Gym_EventScript_Erika: { id: "TRAINER_LEADER_ERIKA", tm: "gotTM19", name: "Erika", pic: "leader_erika",
      team: () => leaderTeam("HGSS_TRAINER_LEADER_ERIKA_ERIKA_2", "Tangrowth", { teraType: "Poison" }),
      intro: ["Erika: Oh, the Champion… How lovely.", "My Pokémon have grown, as flowers do.\nShall we battle?"],
      defeat: ["Erika: Such splendid strength…\nPlease, visit again."] },
    FuchsiaCity_Gym_EventScript_Koga: { id: "TRAINER_LEADER_KOGA", tm: "gotTM06FromKoga", name: "Koga", pic: "leader_koga",
      team: () => leaderTeam("HGSS_TRAINER_ELITE_FOUR_KOGA_KOGA_2", null, null, [["Skuntank", "Beedrill", { item: "beedrillite", teraType: "Ground" }]]),
      intro: ["Koga: Fwahahaha! The Champion!", "My ninja techniques have only grown\nsharper. Witness them!"],
      defeat: ["Koga: Humph! Your skill is beyond\ndoubt. I shall train harder still."] },
    SaffronCity_Gym_EventScript_Sabrina: { id: "TRAINER_LEADER_SABRINA", tm: "gotTM04", name: "Sabrina", pic: "leader_sabrina",
      team: () => leaderTeam("HGSS_TRAINER_LEADER_SABRINA_SABRINA_2", "Alakazam", { item: "alakazite", teraType: "Dark" }),
      intro: ["Sabrina: I knew you would come.", "I foresaw this battle… but not how\nit ends. Show me."],
      defeat: ["Sabrina: Even my visions could not\nforesee such power. Come again."] },
    CinnabarIsland_Gym_EventScript_Blaine: { id: "TRAINER_LEADER_BLAINE", tm: "gotTM38FromBlaine", name: "Blaine", pic: "leader_blaine",
      team: () => leaderTeam("HGSS_TRAINER_LEADER_BLAINE_BLAINE_2", "Houndoom", { item: "houndoominite", teraType: "Dark", level: 62 }),
      intro: ["Blaine: Hah! The Champion returns!", "My fire burns hotter than ever!\nCan you stand the heat?"],
      defeat: ["Blaine: I've burned out! You're\na blazing talent. Come again!"] }
  };
  // A rematch team from a trainer's party: its ace (by species) given its
  // Tera Type and anything else in `ace` (a level: raised to it); `swap`:
  // [species, for species, extras], the new one the ace.
  function leaderTeam(id, aceSpecies, ace, swap) {
    const team = trainerTeam(id);
    for (const [from, to, extra] of swap || []) {
      const i = team.findIndex((r) => r.species === from);
      if (i >= 0) team.push(Object.assign(Party.create(to, team.splice(i, 1)[0].level + 1, { ivs: 31 }), extra || {}, { teraAce: true }));   // (last: the ace)
    }
    const r = aceSpecies && team.find((m) => m.species === aceSpecies);
    if (r) {
      const { level, ...rest } = ace;
      if (level) Object.assign(r, Party.create(r.species, level, { ivs: 31 }), { item: r.item });
      Object.assign(r, rest, { teraAce: true });
    }
    return team;
  }
  async function leaderRematch(L) {
    const f = player.flags;
    if (!f.gameClear || !f[L.id] || !f[L.tm]) return false;
    const days = f.leaderRematchDay || (f.leaderRematchDay = {}), today = Player.gameTime().today;
    if (days[L.id] === today) return false;   // (beaten today: their usual words)
    await say(L.intro);
    if (!(await confirm(L.name + ": Will you battle me again?"))) { await say([L.name + ": Very well. Come back anytime."]); return true; }
    if (!canBattle()) return true;
    const team = L.team(), top = Math.max(...team.map((r) => r.level));
    const outcome = await battle("trainer", { foe: { name: "Leader " + L.name, team, pic: L.pic, tera: true }, defeatText: L.defeat, terrain: "leader", prize: top * 200 });
    if (outcome !== "won") return true;
    days[L.id] = today;
    show("world");
    await Overworld.resume();
    await say([L.name + ": Come back tomorrow, Champion,\nand we'll battle again!"]);
    return true;
  }

  // ---------- The end of Victory Road: Gary ----------
  //
  // This game's own: coming out of Victory Road onto Route 23 (its 2F's way
  // out, at (18, 28)), Gary comes down from the Indigo Plateau to meet you,
  // with his team from Silph Co. (his Growlithe an Arcanine now) at about
  // level 50: Pidgeot, Arcanine, Gyarados (holding its Gyaradosite: it Mega
  // Evolves), Exeggutor, Alakazam and Umbreon (his Eevee) as his ace. Then he
  // heads back up to the League.
  const VICTORY_ROAD_RIVAL_TEAM = [["Pidgeot", 50], ["Arcanine", 50], ["Gyarados", 50, "gyaradosite"], ["Exeggutor", 49], ["Alakazam", 50], ["Umbreon", 53]];
  const victoryRoadRivalDue = () => {
    const at = Overworld.position();
    return !!(player.flags.TRAINER_LEADER_GIOVANNI && !player.flags.victoryRoadRival && at.map === "Route23" && at.x === 18 && at.y === 28 && canBattle());
  };
  async function victoryRoadRival() {
    const f = player.flags, R = "LOCALID_VICTORY_ROAD_RIVAL";
    // (A step out of the cave's mouth first, onto the route, where he meets you.)
    await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
    music("mus_encounter_rival");
    const from = await walkIn(R, lookOf("blue"), { x: 21, y: 18 }, [{ x: 19, y: 29, face: "left" }, { x: 18, y: 30, face: "up" }], "fast_");
    if (Overworld.personPosition(R)) await faceEachOther(R);
    await say(["{RIVAL}: Hey! {PLAYER}!", "So you made it through Victory Road\ntoo. Took you long enough!",
      "I've already seen the Pokémon League.\nAnd I'm going to be its Champion!", "But first, I'll show you how much\nstronger I've gotten! Let's go!"]);
    // (FireRed's Route 22 IVs: 150, and 250 for his starter, here Umbreon.)
    const team = VICTORY_ROAD_RIVAL_TEAM.map(([sp, lv, item]) => Object.assign(Party.create(sp, lv, { ivs: Math.floor((sp === "Umbreon" ? 250 : 150) * 31 / 255) }),
      item ? { item } : {}));
    const outcome = await battle("trainer", { foe: { name: "Rival " + player.rival, team, pic: "rival_late" },
      defeatText: ["{RIVAL}: What!? Again!?", "Tch… I was just warming up!"], prize: 36 * 53 });
    if (outcome !== "won") { if (Overworld.personPosition(R)) Overworld.removeObject(R); return; }
    f.victoryRoadRival = true;
    show("world");
    await Overworld.resume();
    await say(["{RIVAL}: Hmph. Don't get cocky.", "The Pokémon League's Champion is\nstronger than anyone. You'll see!", "Smell ya later, {PLAYER}!"]);
    Screen.say("");
    music("mus_rival_exit");
    if (from) await walkOut(R, from, "fast_");
    else Overworld.removeObject(R);
    music((window.WORLD_MAPS[player.location.map] || {}).music);
  }

  // ---------- Route 23's badge guards ----------
  //
  // FireRed's Route23_EventScript_BadgeGuard and ..Trigger (and the League
  // gate's on Route 22): each guard checks one Badge, in order from the
  // Boulder Badge at the gate to the Earth Badge by Victory Road; walking up
  // to the next guard stops you until he's seen his (VAR_MAP_SCENE_ROUTE23,
  // the last Badge shown). Talking to one, he checks his Badge whatever
  // you've shown before.
  const route23Scene = () => LeagueRoad.scene(player.flags);
  async function badgeGuard(k, trigger, who) {
    const f = player.flags, name = [ROUTE23_BADGES[k - 1] + " Badge"];
    if (trigger && !LeagueRoad.guardStops(f, k)) return;
    if (trigger) await Overworld.act([{ who, moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
    const ok = () => {
      const t = T(k === 1 ? "Text_OhThatsBadgeGoRightAhead" : "Text_OnlyPassWithBadgeOhGoAhead");
      // (The "Oh! That is the …" page has the level-up jingle.)
      const at = t.findIndex((p) => /^Oh!/.test(p));
      return say(t.slice(0, at), name).then(() => sayWithJingle("mus_level_up", fill(t[at], name))).then(() => say(t.slice(at + 1), name));
    };
    if (!trigger && route23Scene() >= k) { await ok(); return; }
    if (LeagueRoad.show(f, player.badges, k)) { await ok(); return; }
    if (k === 1) {
      await say(T("Text_OnlySkilledTrainersAllowedThrough"), name);
      sfx("se_boo");
      await say(T("Text_CantLetYouPass"));
    } else {
      const t = T("Text_OnlyPassWithBadgeDontHaveYet");
      await say(t.slice(0, -1), name);
      sfx("se_boo");
      await say(t.slice(-1), name);
    }
    Screen.say("");
    if (trigger) await Overworld.act([{ who: "player", moves: ["walk_down"] }, { who, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
  }

  // ---------- Victory Road ----------
  //
  // Each floor's rock barrier is up until a Strength boulder's pushed onto
  // its floor switch (VictoryRoad_<floor>_EventScript_FloorSwitch, by
  // HandleBoulderActivateVictoryRoadSwitch); the boulders go back where they
  // were whenever you leave the floor, and the barriers stay down until you
  // come back through Route 23 (Route23_OnTransition), which also puts 3F's
  // boulder back that drops through the hole to 2F.
  // (FireRed's VAR_MAP_SCENE_VICTORY_ROAD_1F, .._2F_BOULDER1/2 and .._3F, and
  // FLAG_HIDE_VICTORY_ROAD_2F/3F_BOULDER: flags.victoryRoad here.)
  function victoryRoadSwitch(map, x, y) {
    const t = ((window.WORLD_MAPS[map] || {}).triggers || []).find((q) => q.x === x && q.y === y);
    if (!LeagueRoad.pressSwitch(player.flags, map, t)) return;
    applyPatches(map);
    sfx("se_ice_break");
  }


  // ---------- The Pokémon League ----------
  //
  // FireRed's PokemonLeague_* scripts (the rules are in game/pokemon-league.js).
  // Through the Indigo Plateau's back door: walking into each Elite Four
  // room, you walk up to its trainer and the way in shuts behind you (SE_UNLOCK);
  // there's no way out but on, through the door that opens once they're beaten,
  // or blacking out, back to the Indigo Plateau's Pokémon Center, and the League
  // starts over from Lorelei. Lance's room has its long corridor. Then Gary,
  // the Champion; Prof. Oak; the Hall of Fame, its record, and the credits;
  // and you're home in Pallet Town.
  const ELITE_FOUR_SCRIPTS = ["PokemonLeague_LoreleisRoom_EventScript_Lorelei", "PokemonLeague_BrunosRoom_EventScript_Bruno",
    "PokemonLeague_AgathasRoom_EventScript_Agatha", "PokemonLeague_LancesRoom_EventScript_Lance"];
  const LEAGUE_TEXT = ["PokemonLeague_LoreleisRoom_Text_", "PokemonLeague_BrunosRoom_Text_", "PokemonLeague_AgathasRoom_Text_", "PokemonLeague_LancesRoom_Text_"];
  const LEAGUE_IDS = [null, "LOCALID_BRUNO", "#0", "LOCALID_LANCE"];

  // Walking in (each room's OnFrame, while it's that room's turn).
  async function leagueEnter(map) {
    const f = player.flags, k = League.room(map);
    if (map === League.HALL_OF_FAME) { await hallOfFame(); return; }
    if (k === 4) { await championsRoom(); return; }
    if (!League.entryDue(f, map)) return;
    // (PokemonLeague_EventScript_EnterRoom; Lance's walk through his corridor.)
    await Overworld.act([{ who: "player", moves: M(k === 3 ? "PokemonLeague_LancesRoom_Movement_WalkThroughCorridor" : "Common_Movement_WalkUp5") }]);
    League.enter(f, map);
    sfx("se_unlock");
    applyPatches(map);
    await persist();
  }

  // An Elite Four member (PokemonLeague_<name>sRoom_EventScript_<name>):
  // FireRed's team (the rematch team, _2, once FLAG_SYS_CAN_LINK_WITH_RS is
  // set), to the Gym Leader battle music; beaten, the door behind them opens.
  // Bruno and Agatha look away when they've had their say. (Lorelei's
  // rematch words go by FLAG_SYS_CAN_LINK_WITH_RS, the others' by
  // FLAG_SYS_GAME_CLEAR, as in FireRed.)
  // This game's changes to FireRed's teams, the same for the first battle
  // and the rematch (_2): [slot, species in its place (null: keep it), extras]
  // at that slot's level. A Tera ace (teraAce) Terastallizes as soon as it's
  // out, its trainer having a Tera Orb.
  const TEAM_SWAPS = {
    // Giovanni (Viridian Gym): Rhydon, Persian, and his ace, Mega Kangaskhan (Tera Fighting).
    TRAINER_LEADER_GIOVANNI: [[0, "Rhydon"], [1, "Persian"], [4, "Kangaskhan", { item: "kangaskhanite", teraType: "Fighting", teraAce: true }]],
    // Sabrina (Saffron Gym): Jynx in Kadabra's place.
    TRAINER_LEADER_SABRINA: [[0, "Jynx"]],
    // Bruno: Hitmontop in his second Onix's (Steelix's) place.
    TRAINER_ELITE_FOUR_BRUNO: [[3, "Hitmontop"]], TRAINER_ELITE_FOUR_BRUNO_2: [[3, "Hitmontop"]],
    // Agatha: Hisuian Typhlosion, Cursola, Alolan Marowak, Mismagius and her ace, Mega Gengar (Tera Dark).
    TRAINER_ELITE_FOUR_AGATHA: [[0, "Typhlosion-Hisui"], [1, "Cursola"], [2, "Marowak-Alola"], [3, "Mismagius"], [4, null, { item: "gengarite", teraType: "Dark", teraAce: true }]],
    TRAINER_ELITE_FOUR_AGATHA_2: [[0, "Typhlosion-Hisui"], [1, "Cursola"], [2, "Marowak-Alola"], [3, "Mismagius"], [4, null, { item: "gengarite", teraType: "Dark", teraAce: true }]],
    // Lance: Kingdra and Mega Charizard X in his Dragonairs' places, and his ace, Dragonite (Tera Flying).
    TRAINER_ELITE_FOUR_LANCE: [[1, "Kingdra"], [2, "Charizard", { item: "charizardite-x" }], [4, null, { teraType: "Flying", teraAce: true }]],
    TRAINER_ELITE_FOUR_LANCE_2: [[1, "Kingdra"], [2, "Charizard", { item: "charizardite-x" }], [4, null, { teraType: "Flying", teraAce: true }]]
  };
  function swappedTeam(id) {
    const team = trainerTeam(id);
    for (const [slot, species, extra] of TEAM_SWAPS[id] || []) {
      const was = team[slot];
      if (species) team[slot] = Party.create(species, was.level, { ivs: was.ivs.hp });
      if (extra) Object.assign(team[slot], extra);
    }
    return team;
  }
  // Johto's League (this game's): once you've Johto's eight Badges, HGSS's
  // Elite Four, Will, Koga, Bruno and Karen, and Champion Lance take the
  // League's rooms (data/johto-maps.js's JOHTO_LEAGUE, from HGSS's T10R0201-0601),
  // with their HGSS teams, their rematch teams once you've beaten them, and
  // their lines. (Its rooms and Hall of Fame are FireRed's as before.)
  const johtoLeague = () => !!window.JOHTO_LEAGUE && Player.REGION_BADGES.johto.every((b) => player.badges.includes(b));
  async function johtoEliteFour(k) {
    const f = player.flags, J = window.JOHTO_LEAGUE[k];
    if (League.beaten(f, k)) { await say(J.after); return; }
    await say(J.intro);
    if (!canBattle()) return;
    const id = f.johtoLeagueClear ? J.rematch : J.trainer, data = window.WORLD_TRAINERS[id];
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(id), pic: data.pic },
      defeatText: data.defeat || ["…"], trainerId: id, prizeClass: "Elite Four", music: "gs_vs_gymreader", victoryMusic: "gs_win3" });
    if (outcome !== "won") return;
    show("world");
    await Overworld.resume();
    League.beat(f, k);
    await sleep(533);
    sfx("se_rs_door");
    applyPatches(player.location.map);
    await persist();
    await say(J.after);
  }
  async function eliteFour(k) {
    if (johtoLeague()) { await johtoEliteFour(k); return; }
    const f = player.flags, X = (label) => T(LEAGUE_TEXT[k] + label);
    const lookAway = async () => {
      if (k !== 1 && k !== 2) return;
      Screen.say("");
      const facing = Overworld.position().facing;
      const way = facing === "up" ? "Right" : facing === "down" ? "Left" : "Down";
      await Overworld.act([{ who: LEAGUE_IDS[k], moves: M("Common_Movement_WalkInPlaceFaster" + way) }]);
    };
    if (League.beaten(f, k)) { await say(X("PostBattle")); await lookAway(); return; }
    const intro = X((k === 0 ? f.canLinkWithRS : f.gameClear) ? "RematchIntro" : "Intro");
    await say(intro.slice(0, -1));
    music("mus_encounter_gym_leader");
    await say(intro.slice(-1));
    if (!canBattle()) return;
    const id = League.trainerId(f, k), data = window.WORLD_TRAINERS[id], team = swappedTeam(id);
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team, pic: data.pic, tera: team.some((r) => r.teraAce) },
      defeatText: X("Defeat"), trainerId: id, prizeClass: "Elite Four",
      music: "mus_vs_gym_leader", victoryMusic: "mus_victory_trainer" });
    if (outcome !== "won") return;
    show("world");
    await Overworld.resume();
    // (PokemonLeague_EventScript_OpenDoor: a pause, SE_RS_DOOR, and it's open.)
    League.beat(f, k);
    await sleep(533);
    sfx("se_rs_door");
    applyPatches(player.location.map);
    await persist();
    await say(X("PostBattle"));
    await lookAway();
  }

  // Red, the Champion (this game's own; FireRed has Gary,
  // PokemonLeague_ChampionsRoom_EventScript_EnterRoom): Pikachu, Espeon,
  // Blastoise, Venusaur, Snorlax and his ace, Charizard, holding its
  // Charizardite Y: it Mega Evolves. Levels about FireRed's Champion's (57-63),
  // and with FLAG_SYS_CAN_LINK_WITH_RS its rematch ones (72-75).
  const CHAMPION_TEAM = [["Pikachu", 58, 72], ["Espeon", 59, 72], ["Blastoise", 60, 73], ["Venusaur", 60, 73], ["Snorlax", 61, 74], ["Charizard", 63, 75, "charizardite-y"]];
  function championTeam(rematch) {
    return CHAMPION_TEAM.map(([sp, lv, lv2, item]) => Object.assign(Party.create(sp, rematch ? lv2 : lv, { ivs: 31 }), item ? { item } : {}));
  }
  async function championsRoom() {
    const f = player.flags, R = "LOCALID_CHAMPIONS_ROOM_RIVAL", O = "LOCALID_CHAMPIONS_ROOM_PROF_OAK";
    if (!League.entryDue(f, player.location.map)) return;
    await Overworld.act([{ who: "player", moves: M("PokemonLeague_ChampionsRoom_Movement_PlayerEnter") }]);
    await sleep(333);
    if (johtoLeague()) { await johtoChampion(); return; }
    await say(f.gameClear ? ["Red: …", "Red stepped forward, ready to\nbattle again!"]
      : ["Red: …", "Red, the Pokémon League Champion,\nlooks at {PLAYER} in silence.", "Red stepped forward, ready to battle!"]);
    if (!canBattle()) return;
    const rematch = !!f.canLinkWithRS, team = championTeam(rematch);
    const outcome = await battle("trainer", { foe: { name: "Champion Red", team, pic: "red" },
      defeatText: ["…"],
      trainerId: rematch ? "TRAINER_CHAMPION_REMATCH_SQUIRTLE" : "TRAINER_CHAMPION_FIRST_SQUIRTLE",
      prize: 100 * Math.max(...team.map((r) => r.level)),   // (TRAINER_CLASS_CHAMPION: 25, x4)
      music: "mus_vs_champion", victoryMusic: "mus_victory_gym_leader", terrain: "champion" });
    if (outcome !== "won") return;
    League.beat(f, 4);
    show("world");
    await Overworld.resume();
    await say(["Red: …", "Red smiled, and gave a small nod."]);
    // Prof. Oak comes in.
    music("mus_slow_pallet");
    Overworld.follower.hide(true);   // (your Pokémon back in its ball: Oak walks up the way it stands)
    Overworld.addObject(O, { x: 6, y: 15, facing: "up" });
    await say(T("PokemonLeague_ChampionsRoom_Text_OakPlayer"));
    Screen.say("");
    await Overworld.act([{ who: "player", moves: M("PokemonLeague_ChampionsRoom_Movement_PlayerWatchOakEnter") },
      { who: R, moves: M("PokemonLeague_ChampionsRoom_Movement_RivalWatchOakEnter") },
      { who: O, moves: M("PokemonLeague_ChampionsRoom_Movement_OakEnter") }]);
    await sleep(417);
    await say(T("PokemonLeague_ChampionsRoom_Text_OakCongratulations"), [Party.speciesName(f.starter || player.party[0].species)]);
    await Overworld.act([{ who: O, moves: M("Common_Movement_WalkInPlaceFasterRight") }, { who: R, moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
    await say(["Oak: Red… You've been the Champion\nfor a long time.", "But today, {PLAYER} and their\nPokémon were stronger.",
      "Keep training with your Pokémon,\nRed. I'm sure you two will meet\nagain!"]);
    Screen.say("");
    await Overworld.act([{ who: O, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    await sleep(333);
    await say(T("PokemonLeague_ChampionsRoom_Text_OakPlayerComeWithMe"));
    Screen.say("");
    await sleep(217);
    // Oak, then you, up the stairs and into the Hall of Fame.
    await Overworld.act([{ who: O, moves: M("PokemonLeague_ChampionsRoom_Movement_OakExit") },
      { who: "player", moves: M("PokemonLeague_ChampionsRoom_Movement_PlayerExit") }]);
    await Overworld.teleport({ map: League.HALL_OF_FAME, x: 5, y: 12, facing: "up" });
    Overworld.follower.hide(false);
    await hallOfFame();
  }

  // Lance, Johto's Champion (scr_seq_T10R0601): his words (for a boy or a
  // girl), his team, and once he's beaten, he takes you to the Hall of Fame.
  async function johtoChampion() {
    const f = player.flags, J = window.JOHTO_LEAGUE[4];
    await say(isGirl() ? J.introGirl : J.intro);
    if (!canBattle()) return;
    const id = f.johtoLeagueClear ? J.rematch : J.trainer, data = window.WORLD_TRAINERS[id];
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(id), pic: data.pic },
      defeatText: data.defeat || ["…"], trainerId: id, prize: 100 * Math.max(...trainerTeam(id).map((r) => r.level)),
      music: "gs_vs_champ", victoryMusic: "gs_win3", terrain: "champion" });
    if (outcome !== "won") return;
    League.beat(f, 4);
    f.johtoLeagueDone = true;
    show("world");
    await Overworld.resume();
    await say(isGirl() ? J.afterGirl : J.after);
    Screen.say("");
    await Overworld.teleport({ map: League.HALL_OF_FAME, x: 5, y: 12, facing: "up" });
    await hallOfFame();
  }

  // The Hall of Fame (PokemonLeague_HallOfFame_EventScript_EnterRoom): you
  // walk up beside Prof. Oak; his words; the record machine flashes
  // (FLDEFF_HALL_OF_FAME_RECORD); then EventScript_SetDefeatedEliteFourFlagsVars
  // (the League starts over), setrespawn at home, and EnterHallOfFame: the
  // party healed, FLAG_SYS_GAME_CLEAR, your team on record, saved, and
  // FireRed's Hall of Fame screen; the credits; and you're home.
  async function hallOfFame() {
    const f = player.flags, O = "LOCALID_HALL_OF_FAME_PROF_OAK";
    await Overworld.act([{ who: "player", moves: M("PokemonLeague_HallOfFame_Movement_EnterRoom") }]);
    await Overworld.act([{ who: O, moves: M("Common_Movement_WalkInPlaceFasterLeft") }, { who: "player", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
    await sleep(300);
    await say(T("PokemonLeague_HallOfFame_Text_OakCongratulations"));
    // (Johto's League won, this game's own: Oak has a ticket for the Fast Ship S.S. Aqua's run to Hoenn.)
    if (f.johtoLeagueDone) await giveHoennTicket("Oak");
    Screen.say("");
    await Overworld.act([{ who: O, moves: M("Common_Movement_WalkInPlaceFasterUp") }, { who: "player", moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    await sleep(333);
    await HallOfFame.recordFlash($("#overlay"));
    await sleep(667);
    League.reset(f);
    // (Johto's League won: its rematch teams from now on.)
    if (f.johtoLeagueDone) { f.johtoLeagueClear = true; delete f.johtoLeagueDone; johto.setFlag("FLAG_GAME_CLEAR", true); }   // (HGSS's, for its scripts after the League)
    // (And the Bug-Catching Contest on offer again: once for each time you beat the Elite Four.)
    { const s = johto.state(); s.contestRound = (s.contestRound || 0) + 1; johto.setFlag("FLAG_DAILY_DID_BUG_CONTEST", false); }
    delete f.lastCenter;   // (setrespawn HEAL_LOCATION_PALLET_TOWN)
    player.party.forEach(Party.heal);
    const entry = League.record(f, player.party.filter((r) => !r.egg).map((r) => Object.assign({}, r, { form: Party.form(r) })),
      { name: player.name, id: player.trainerId, playTimeMs: player.playTimeMs });
    // Where you'll be after the credits (FireRed's continue warp, at home).
    player.location = Object.assign({}, Player.HOME);
    music(null);
    await Overworld.fadeToBlack();
    // (Whatever goes wrong drawing it, you're Champion and the game goes on.)
    await HallOfFame.show($("#overlay"), entry, {
      cry, sfx, music, player: { name: player.name, id: player.trainerId, playTimeMs: player.playTimeMs, pic: Player.LOOKS[player.look].front },
      // (FireRed saves the game here, on its own: the one save that isn't asked.)
      save: async () => { tick(); Save.write(player); savePromptAt = player.playTimeMs; }
    }).catch((e) => { console.error(e); tick(); Save.write(player); });
    await creditsRoll();
  }

  // The credits (FireRed's IndigoPlateau_Exterior_EventScript_Credits, then
  // DoCredits): out in front of the Indigo Plateau, Red (FireRed's rival:
  // here the Champion you beat) comes out and runs off, Prof. Oak comes out,
  // looks at you and walks off, and you run off too; then the credits roll
  // over Kanto, with Charizard, Venusaur, Blastoise and Pikachu, to THE END.
  // (Start skips them, the first time too.) Then you're at home in Pallet Town.
  async function creditsRoll() {
    const f = player.flags, R = "LOCALID_CREDITS_RIVAL", O = "LOCALID_CREDITS_PROF_OAK";
    const run = (moves) => moves.map((m) => m.replace(/^player_run_/, "walk_fast_"));
    $("#overlay").classList.add("hidden");
    show("world");
    await Overworld.teleport({ map: "IndigoPlateau_Exterior", x: 11, y: 7, facing: "down" });
    music("mus_credits");
    await sleep(1750);
    Overworld.addObject(R, { x: 11, y: 6, facing: "down" }, lookOf("red"));
    await Overworld.act([{ who: R, moves: M("IndigoPlateau_Exterior_Movement_RivalExitBuilding") },
      { who: "player", moves: M("IndigoPlateau_Exterior_Movement_PushPlayerOutOfWay") }]);
    await Overworld.act([{ who: "player", moves: M("IndigoPlateau_Exterior_Movement_PlayerWatchRivalLeave") },
      { who: R, moves: M("IndigoPlateau_Exterior_Movement_RivalLeave") }]);
    Overworld.removeObject(R);
    await sleep(1667);
    Overworld.addObject(O, { x: 11, y: 6, facing: "down" });
    await Overworld.act([{ who: O, moves: M("IndigoPlateau_Exterior_Movement_OakExitBuilding") }]);
    await sleep(2667);
    await Overworld.act([{ who: "player", moves: M("IndigoPlateau_Exterior_Movement_PlayerWatchOakLeave") },
      { who: O, moves: M("IndigoPlateau_Exterior_Movement_OakLeave") }]);
    Overworld.removeObject(O);
    await sleep(1667);
    await Overworld.act([{ who: "player", moves: M("IndigoPlateau_Exterior_Movement_PlayerBeginLeave") }]);
    await sleep(2583);
    await Overworld.act([{ who: "player", moves: M("IndigoPlateau_Exterior_Movement_PlayerFaceLeague") }]);
    await sleep(1500);
    await Overworld.act([{ who: "player", moves: M("IndigoPlateau_Exterior_Movement_PlayerTurnAround") }]);
    await Overworld.act([{ who: "player", moves: run(M("IndigoPlateau_Exterior_Movement_PlayerLeave")) }]);
    await Overworld.fadeToBlack();
    await HallOfFame.credits($("#overlay"), { skippable: true, cry, music, rival: player.rival,
      player: { look: player.look, name: player.name } }).catch((e) => console.error(e));
    f.seenCredits = true;
    $("#overlay").classList.add("hidden");
    await Overworld.teleport(Object.assign({}, Player.HOME));
    music((window.WORLD_MAPS[Player.HOME.map] || {}).music);
    await persist();
  }

  // ---------- The Sevii Islands: the Seagallop ferries ----------
  //
  // FireRed's EventScript_SetSail (data/scripts/seagallop.inc): "All aboard
  // SEAGALLOP HI-SPEED 7!", the screen goes dark and the ferry crosses the sea
  // (ui/seagallop.js: DoSeagallopFerryScene), and you're at the other harbor.
  // game/sevii.js has the ports, the menus and the story's flags.
  async function setSail(from, to, announce) {
    if (announce !== false) {
      await say(from === "VERMILION_CITY" && to !== "CINNABAR_ISLAND" ? T("VermilionCity_Text_Seagallop7Departing") : T("Text_AllAboardSeagallopNum"),
        [String(Sevii.ferryNumber(from, to))]);
    }
    Screen.say("");
    clearMenu();
    await sleep(333);
    await Overworld.fadeToBlack();
    const o = $("#overlay");
    await Seagallop.ride(o, { eastbound: Sevii.eastbound(from, to), sfx, fadeMusic: () => music(null) }).catch((e) => console.error(e));
    o.classList.add("hidden");
    sfx("se_exit");
    const p = Sevii.port(to);
    Overworld.setAvatar("walk");
    await Overworld.teleport({ map: p.map, x: p.x, y: p.y, facing: to === "CINNABAR_ISLAND" ? "down" : "up" });
    music((window.WORLD_MAPS[p.map] || {}).music);
    // Landing on One Island the first time (OneIsland_Harbor's ON_FRAME), or
    // back on Cinnabar with Bill (CinnabarIsland_EventScript_ReturnFromSeviiIslands).
    if (to === "ONE_ISLAND" && player.flags.oneHarborScene === 1) await oneIslandArrival();
    else if (to === "CINNABAR_ISLAND" && player.flags.cinnabarScene === 3) await cinnabarBillReturns();
    await persist();
  }

  // A Seagallop sailor (a harbor's, or Vermilion's by the dock): where to?
  // `from`: the harbor (SEAGALLOP_*). `question`: what he asks.
  // (A port whose island isn't in the game, the sailor says so: none now.)
  async function seagallopMenu(from, question, onCancel) {
    let page = 0;
    for (;;) {
      const m = Sevii.menu(player.flags, from, page);
      const pages = m.items.includes("MORE");
      // (FireRed's windows: the two-page menu at the top right, the others lower down.)
      const [left, top] = pages ? [17, page ? 2 : 0] : [19, m.items.length >= 4 ? 5 : 6];
      const i = await multichoice(fill(question[question.length - 1]), left, top, m.labels);
      const pick = i < 0 ? "EXIT" : m.items[i];
      if (pick === "MORE") { page = 1 - page; continue; }
      if (pick === "EXIT") { Screen.say(""); if (onCancel) await onCancel(); return; }
      if (!Sevii.built(pick)) {
        await say(["Sorry, the Seagallop doesn't sail\nto " + Sevii.port(pick).label + " yet.", "(" + Sevii.port(pick).label + " isn't in\nthis game yet.)"]);
        return;
      }
      await setSail(from, pick);
      return;
    }
  }
  // The harbor sailors on One, Two and Three Island.
  async function harborSailor(from) {
    const q = T("Text_WhereDoYouWantToSail");
    await say(q.slice(0, -1));
    await seagallopMenu(from, q);
  }
  // Vermilion's dock (VermilionCity_EventScript_CheckSeagallopPresent): once
  // the S.S. Anne's gone, the Seagallop sails from here for whoever has a pass.
  async function vermilionSeagallop(walkBack) {
    const f = player.flags, scene = f.celioScene || 0;
    const back = async () => { if (walkBack) await Overworld.act([{ who: "player", moves: ["walk_up"] }]); };
    if (scene < 1) { await say(T("VermilionCity_Text_TheShipSetSail")); await back(); return; }
    const q = T(scene >= 5 ? "VermilionCity_Text_BoardSeagallopRainbowPass" : "VermilionCity_Text_BoardSeagallopTriPass");
    // With the Rainbow Pass, Stadium Island and Hoenn too; and with the Old Sea Map, as FireRed's sailor is with
    // an event ticket (VermilionCity_EventScript_HasMysticTicket): the first time, he's amazed; then Faraway
    // Island, on Seagallop 10.
    if (scene >= 5) {
      const oldMap = Player.itemCount(player, "old-sea-map");
      if (oldMap && !f.shownOldSeaMap) {
        f.shownOldSeaMap = true;
        await say(["Oh! That's an Old Sea Map!\nNow that is rare.", "We'll be happy to take you to\nFaraway Island anytime."]);
      }
      const dests = ["Sevii Islands", "Stadium Island"].concat(oldMap ? ["Faraway Island"] : [], ["Hoenn", "Exit"]);
      const i = await multichoice(T("VermilionCity_Text_BoardSeagallopFerry")[0], 17, dests.length >= 5 ? 2 : dests.length === 4 ? 4 : 6, dests);
      const pick = i < 0 ? "Exit" : dests[i];
      if (pick === "Sevii Islands") { await say(q.slice(0, -1)); await seagallopMenu("VERMILION_CITY", q, back); return; }
      if (pick === "Stadium Island") { await say(["All aboard SEAGALLOP HI-SPEED 8!"]); await ferry({ map: "StadiumIsland", x: 17, y: 25, facing: "up" }, true); return; }
      if (pick === "Faraway Island") {
        await say(T("VermilionCity_Text_Seagallop10Departing"));
        await ferry({ map: "FarawayIsland_Entrance", x: 13, y: 38, facing: "up" }, false);
        return;
      }
      if (pick === "Hoenn") { await sailToHoenn(); return; }
      Screen.say(""); await back(); return;
    }
    await say(q.slice(0, -1));
    await seagallopMenu("VERMILION_CITY", q, back);
  }
  // The Seagallop's crossing (as setSail's) to `to` ({ map, x, y, facing }).
  async function ferry(to, eastbound) {
    Screen.say("");
    clearMenu();
    await sleep(333);
    await Overworld.fadeToBlack();
    const o = $("#overlay");
    await Seagallop.ride(o, { eastbound, sfx, fadeMusic: () => music(null) }).catch((e) => console.error(e));
    o.classList.add("hidden");
    sfx("se_exit");
    Overworld.setAvatar("walk");
    await Overworld.teleport(to);
    music((window.WORLD_MAPS[to.map] || {}).music);
    await persist();
  }

  // ---------- Hoenn: by Seagallop from Vermilion (this game's own) ----------
  //
  // The first time, the Seagallop takes you, and a moving truck, to Hoenn: the truck's inside, as Emerald
  // begins (data/emerald-maps.js; ui/hoenn-script.js plays Emerald's scripts from there). After that, the
  // Seagallop lands at Slateport's harbor, whose sailor sails you back to Vermilion.
  const hoennStarted = () => hoenn.getVar("VAR_LITTLEROOT_INTRO_STATE") > 0;
  async function sailToHoenn(aqua) {
    const ship = aqua ? "the S.S. Aqua" : "SEAGALLOP HI-SPEED 9";
    await say(hoennStarted() ? ["All aboard " + ship + "!", "Next stop, Slateport City in Hoenn!"]
      : ["All aboard " + ship + "!", "It's a long way to Hoenn. You can\nride in the moving truck we're taking."]);
    if (hoennStarted()) await ferry({ map: "SlateportCity_Harbor", x: 6, y: 11, facing: "down" }, false);
    else await ferry({ map: "InsideOfTruck", x: 2, y: 2, facing: "right" }, false);
  }
  async function slateportSailor() {
    // (Olivine too, by the S.S. Aqua, once you've beaten Johto's League.)
    const dests = ["Vermilion City"].concat(player.flags.johtoLeagueClear ? ["Olivine City"] : [], ["Cancel"]);
    const i = await multichoice("Ahoy! Where are you sailing?", 17, 12 - 2 * dests.length, dests);
    const pick = dests[i];
    if (!pick || pick === "Cancel") { await say("Come back any time."); return; }
    if (pick === "Olivine City") {
      await say(["All aboard the S.S. Aqua!"]);
      const port = window.WORLD_MAPS.SSAqua_OlivinePortExterior, plank = port.warps.find((w) => w.map === "SSAqua_1F");
      await ferry({ map: port.name, x: plank.x, y: plank.y + 1, facing: "down" }, false);
      return;
    }
    await say(["All aboard SEAGALLOP HI-SPEED 9!"]);
    await ferry({ map: "VermilionCity", x: 23, y: 32, facing: "up" }, true);
  }

  // ---------- Faraway Island (Emerald's Old Sea Map event) ----------
  //
  // From Pokémon Emerald (data/maps/FarawayIsland_*, src/faraway_island.c;
  // the maps in data/emerald-maps.js). The Seagallop's sailor waits at the
  // shore to take you home; inside, in the long grass, Mew plays hide and
  // seek (game/faraway.js): it hides as you come in, moves as you do, away
  // from you, shows itself every 8th step, and is found by walking up to it,
  // seen or not. A wild Mew, Lv. 50 (Emerald's is Lv. 30): caught or beaten it's gone for good; run
  // from, it flies away and is back the next time you come in.
  const MEW = "LOCALID_FARAWAY_ISLAND_MEW";
  // FarawayIsland_Entrance_EventScript_Sailor ("Do you want to return to Lilycove?" in Emerald).
  async function farawaySailor(person) {
    const q = ["The captain can be so maddeningly\nfickle…", "Do you want to return to Vermilion?"];
    await say(q.slice(0, -1));
    if (!(await confirm(q[q.length - 1]))) { await say("Aye, right, as you like, then."); return; }
    await say(["Aye, right, then!\nSail home we will!"]);
    Screen.say("");
    await Overworld.act([{ who: "LOCALID_FARAWAY_ISLAND_SAILOR", moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    await sleep(500);
    const p = Sevii.port("VERMILION_CITY");
    await ferry({ map: p.map, x: p.x, y: p.y, facing: "up" }, true);
  }
  // FarawayIsland_Interior_EventScript_FindMew: coming in, "!" over Mew,
  // and it darts three steps up into the grass and is gone from sight.
  async function findMew() {
    sfx("se_pin");
    await Overworld.act([{ who: MEW, moves: ["emote_exclamation_mark"] }]);
    await sleep(800);
    await Overworld.act([{ who: MEW, moves: ["walk_up", "walk_up", "walk_up", "walk_in_place_faster_down", "set_invisible"] }]);
  }
  // Each step inside: Mew's (UpdateFarawayIslandStepCounter, GetMewMoveDirection).
  function farawayStep() {
    const f = player.flags;
    if (player.location.map !== "FarawayIsland_Interior" || f.foughtMew) return;
    const mew = Overworld.personPosition(MEW);
    if (!mew) return;
    f.farawaySteps = ((f.farawaySteps | 0) + 1) % 9999;
    const cur = Overworld.position(), [dx, dy] = World.DIRS[cur.facing];
    const r = Faraway.mewStep({ mew, prev: { x: cur.x - dx, y: cur.y - dy }, cur, steps: f.farawaySteps, isGrass: Faraway.isGrass(cur.map) });
    if (r.visible != null) Overworld.setPersonHidden(MEW, !r.visible);
    if (r.dir) Overworld.stepPerson(MEW, r.dir);
  }
  // FarawayIsland_Interior_EventScript_Mew: found! It shows itself, "Myuu…",
  // and the battle. (This game's own: it knows Psychic, Nasty Plot, Aura
  // Sphere and Ice Beam.)
  const FARAWAY_MEW_MOVES = ["Psychic", "Nasty Plot", "Aura Sphere", "Ice Beam"];
  async function mewFound(person) {
    if (!canBattle()) return;
    Overworld.setPersonHidden(MEW, false);
    await Overworld.act([{ who: MEW, moves: ["face_player"] }]);
    await legendaryBird(person, "Mew", "foughtMew", { level: 50, text: ["Myuu…"], moves: FARAWAY_MEW_MOVES });
  }

  // ---------- Orre: the Outskirt Stand (Pokémon Colosseum's opening) ----------
  //
  // Up the road from the Air Strip (Prof. Oak's plane: below) is the Outskirt
  // Stand, an old locomotive made a diner (the maps in data/orre-maps.js).
  // The first time you come, two men come out of the diner, Folly and Trudly,
  // talking about their meal and the sack in their truck; seeing you, they
  // tell you to get lost and drive off north with it. Inside, Rider Willie, at
  // the back, wants a look at your Pokémon: coming out again, Willie follows
  // and challenges you to a double battle (every battle in Colosseum is one),
  // and after it points you on to Phenac City; the bar sells to you from then
  // on. (The words are this game's own: Colosseum's script isn't to hand.)
  const ORRE = (k) => "LOCALID_ORRE_" + k;
  // (The debug menu's way there: Prof. Oak's plane, without his briefing.)
  // ---------- Sinnoh: the S.S. Tidal's run (this game's own) ----------
  //
  // From Lilycove's harbor, with the Sinnoh Ticket (Norman's, after Hoenn's Hall of Fame): across the sea to Sinnoh,
  // where the ship drops anchor off Sandgem Town's beach; its sailor there rows you out to it again, back to Lilycove.
  const SANDGEM_BEACH = { map: "SandgemTown", x: 25, y: 29, facing: "down" };
  const LILYCOVE_HARBOR = { map: "LilycoveCity_Harbor", x: 8, y: 11, facing: "down" };
  async function voyage(to, lines, sound) {
    // (Out of Kamurocho's streets the map isn't running: straight to the black screens, and the map picks up from
    // player.location when exploring starts again.)
    const fromStreet = Street.isStreet(player.location.map);
    if (!fromStreet) await Overworld.fadeToBlack();
    music(null);
    Overworld.setAvatar("walk");
    Orre.leave(player);
    const o = $("#overlay");
    sfx(sound || "se_ship");
    for (const l of lines) await GbaMenus.blackScreen(o, l);
    o.classList.add("hidden");
    player.location = Object.assign({}, to);
    // (Into Kamurocho: its streets, by the Time Machine; ui/street.js takes over from there.)
    if (Street.isStreet(to.map)) { delete player.location.street; Street.place(null); show("street"); }
    else if (fromStreet) show("world");
    else await Overworld.teleport(player.location);
    await persist();
  }
  async function sailToSinnoh() {
    Screen.say("");
    show("world");
    Overworld.resume();
    await voyage(SANDGEM_BEACH, ["The S.S. Tidal sets sail from Lilycove,\nout across the open sea…", "Days later, a new land comes into\nview: the Sinnoh region."]);
    player.flags.sinnohLanded = true;
    await say(["Sailor: Here we are: Sandgem Town,\nin the Sinnoh region!", "The ship's anchored offshore. Come\nand see me when you want to sail\nback to Hoenn."]);
  }
  // A ferryman in Sinnoh (Canalave's Eldritch, to Iron Island; and back): his question, then off.
  async function sinnohFerry(person) {
    // (His question, what he says before it, and after you say yes.)
    const text = [].concat(person.text || []), q = Math.max(0, text.map((t) => /\?/.test(t)).lastIndexOf(true));
    if (q > 0) await say(text.slice(0, q));
    if (!(await confirm(fill(text[q] || "Shall we set sail?")))) return;
    if (text.length > q + 1) await say(text.slice(q + 1));
    const to = window.WORLD_MAPS[person.ferry.map];
    await voyage({ map: person.ferry.map, x: person.ferry.x, y: person.ferry.y, facing: "down" }, ["The boat sets out across the water…"]);
    await say("We've arrived at " + (to ? to.title : "our stop") + "!");
  }
  async function sinnohSailor() {
    await say(["Sailor: Ahoy! The S.S. Tidal's\nanchored just offshore."]);
    if (!(await confirm("Shall we sail back to Lilycove City\nin Hoenn?"))) { await say("Enjoy Sinnoh! I'll be right here."); return; }
    await say("All aboard!");
    await voyage(LILYCOVE_HARBOR, ["The S.S. Tidal sets sail from Sinnoh,\nback across the sea to Hoenn…"]);
    await say("The S.S. Tidal has arrived in\nLilycove City.");
  }

  // ---------- The Time Machine and the Realm Hub (this game's own) ----------
  //
  // Everything so far happens in one realm, the Pokémon realm. Through the gap in the trees on Pallet Town's west
  // edge, a scientist's Time Machine (tools/build-time-machine.js) takes you beyond it, once you have a Pokémon of
  // your own, to the Realm Hub: a platform in the void between the realms, with the realms' portals along its north:
  // the Pokémon realm's (back out beside the Time Machine off Pallet Town), the Yu-Gi-Oh! realm's and the Like a
  // Dragon realm's (Kamurocho: its streets side on, ui/street.js, its Time Machine under a manhole). Each realm's Time Machine (Pallet's, and the one under the Kame Game shop's street) takes you
  // to the Realm Hub; its portals take you out. The Yu-Gi-Oh! realm's portal comes out by the fountain in Domino City's square:
  // its screens are Yu-Gi-Oh! The Sacred Cards' (tools/build-sacred-cards.py), and its fountain takes you back, or
  // round the city's other places (window.SACRED_CARDS.areas). Your Pokémon stay in their balls in the Yu-Gi-Oh!
  // realm (ui/follower.js), and Fly and Teleport don't work out of the Pokémon realm.
  const HUB_YUGIOH_PORTAL = { map: "RealmHub", x: 10, y: 5, facing: "down" }, HUB_YAKUZA_PORTAL = { map: "RealmHub", x: 16, y: 5, facing: "down" };
  async function timeMachine() {
    const to = window.TIME_MACHINE;
    if (!player.flags.starter && !player.flags.realmHubVisited) { await say(["It's a strange machine with a clock\non its dome.", "Its door won't open."]); return; }
    await say("It's the Time Machine!\nIts door glows with a strange light.");
    // (Its mirror: the character creator again.)
    const v = ["go", "look", "back"][await multichoice("What will you do?", 17, 6, ["Travel", "Change Look", "Leave"])] || "back";
    if (v === "look") { await changeLook(); return; }
    if (v !== "go" || !(await confirm("Step inside and travel beyond\nthe Pokémon realm?"))) return;
    await voyage(to.hub, ["The Time Machine whirs to life…", "The years spin past in a blur\nof light…", "Beyond time itself, the machine\ncomes to rest."], "se_warp_in");
    player.flags.realmHubVisited = true;
    await say(["You've arrived at the Realm Hub,\nthe place between the realms!"]);
  }
  async function timeMachineScientist() {
    const f = player.flags;
    if (f.realmHubVisited) {
      await say(["Scientist: Welcome back! How was\nthe Realm Hub?", "The golden portal there leads to\nthe Yu-Gi-Oh! realm,", "to a city called Domino, where\neveryone plays Duel Monsters!"]);
      return;
    }
    await say(["Scientist: Ah, a visitor! This is my\nTime Machine.", "Every Pokémon and every region you\nknow lies in one realm: the\nPokémon realm.",
      "But there are other realms out\nthere, worlds all their own!", "My machine travels beyond time\nto the Realm Hub, the place\nbetween them all."]
      .concat(f.starter ? ["Step inside whenever you like!", "From the Realm Hub, the red portal\nbrings you back here."] : ["It's no place to go alone, though.\nCome back with a Pokémon partner!"]));
  }
  async function realmPortal(id) {
    if (id === "yugioh") {
      await say(["A portal of swirling golden light.\nA pyramid shines above it.", "Beyond it lies the Yu-Gi-Oh! realm,\nthe world of Duel Monsters…"]);
      if (!(await confirm("Step through the portal?"))) return;
      // (out beside the Time Machine, in the room under the Kame Game shop's street)
      await voyage(window.TIME_MACHINE.under, ["You step into the golden light…", "The world turns inside out…"], "se_warp_in");
      if (!player.flags.dominoVisited) await say(["You've arrived in Domino City,\nin the Yu-Gi-Oh! realm!", "Your Bag stays behind in the\nPokémon realm. Here you have\na bag of this realm's own.", "Climb the ladder up to the street\nby the Kame Game shop."]);
      player.flags.dominoVisited = true;
      await persist();
      return;
    }
    if (id === "pokemon") {
      await say(["A portal of swirling red light.\nA Poké Ball shines above it.", "Beyond it lies the Pokémon realm…"]);
      if (!(await confirm("Step through the portal?"))) return;
      // (out beside the Time Machine, in its clearing off Pallet Town)
      await voyage(window.TIME_MACHINE.lane, ["You step into the red light…", "Time and space twist around you…", "…and settle back into place."], "se_warp_in");
      await say(player.flags.pokemonVisited || player.flags.starter ? "You're back in the Pokémon realm,\nbeside Pallet Town." : ["You've arrived in the Pokémon realm,\nbeside Pallet Town!", "Prof. Oak's lab is in the town,\njust to the south."]);
      player.flags.pokemonVisited = true;
      await persist();
      return;
    }
    if (id === "yakuza") {
      await say(["A portal of swirling crimson light.\nA dragon's crest shines above it.", "Beyond it lies the Like a Dragon\nrealm, the city that never sleeps…"]);
      if (!(await confirm("Step through the portal?"))) return;
      // (out beside the Time Machine, under the manhole in Serena's backlot)
      const to = window.KAMUROCHO.arrive;
      await voyage({ map: to.map, x: to.x, y: to.y, facing: to.facing }, ["You step into the crimson light…", "Neon blurs past you…"], "se_warp_in");
      if (!player.flags.kamurochoVisited) await say(["You've arrived in Kamurocho,\nin the Like a Dragon realm!", "It's 1988. The streets are packed,\nthe money's flowing, and the\nTojo Clan runs the town.",
        "Your Bag stays behind in the\nPokémon realm. Here you have\na bag of this realm's own."]);
      player.flags.kamurochoVisited = true;
      await persist();
      return;
    }
    await say(["A portal of cold stone. Its light\nhas gone out.", "Another realm may open here\nsomeday…"]);
  }
  // The Time Machine, under the manhole in Serena's backlot, off Kamurocho's street: back to the Realm Hub, by the crimson portal; or a rest beside it
  // (the party's HP and MP back), a look at the party, or a Pokémon of yours to fight beside you (realmPokemon).
  async function kamurochoTimeMachine() {
    await say("It's the Time Machine, hidden down\nhere under the street.");
    for (;;) {
      // (FireRed's multichoice window, at the right over the street.)
      const v = ["rest", "party", "pokemon", "look", "hub", "back"][await multichoice("What will you do?", 19, 0, ["Rest", "Party", "Pokémon", "Look", "Realm Hub", "Leave"])] || "back";
      if (v === "look") { await changeLook(); continue; }
      if (v === "pokemon") { await realmPokemon("yakuza"); continue; }
      if (v === "rest") {
        realmRestore(realmParty("yakuza"));
        await fanfare("mus_heal");
        await say("You rest a while in the shadow of\nthe Time Machine. Everyone's\nback to full strength!");
        continue;
      }
      if (v === "party") { await realmPartyScreen("yakuza"); continue; }
      if (v === "hub") {
        if (!(await confirm("Travel back to the Realm Hub?"))) continue;
        await voyage(HUB_YAKUZA_PORTAL, ["The Time Machine whirs to life…", "Kamurocho's lights fade away…", "…and you come out in the Realm Hub."], "se_warp_in");
      }
      return;
    }
  }

  // ---------- The other realms' battles (Dragon Quest's way: engine/battle.js's Ultimax) ----------
  //
  // Out of the Pokémon realm you fight in a party, as in Dragon Quest: you and up to three companions
  // (data/type-chart.js's REALM_FIGHTERS), each with HP, MP, a level and skills, against a group of foes. Each
  // realm's party and its items: flags.realmParty[realm] = { party: [{ id, lv, exp, hp, mp }], items: { id: n } }.
  // In Kamurocho you start alone; Kiryu joins when you ask him, and Majima once you've beaten him. Walking its streets
  // (not in the alley, the bars, the shops, the backlot or under the street) gangs walk about in plain sight, as in the
  // Yakuza games (ui/street.js, REALM_ENCOUNTERS' groups): one that spots you walks up and picks a fight; keep away and
  // it gives up. Fall, and you wake by the Time Machine with half your money gone.
  // You fight as your race (player.race: REALM_RACES); a party saved before that had you as plain "you", and
  // becomes your race at the same level and EXP (as does a party you've changed race since, at a Time Machine).
  // Four fight (party), four more wait to come in (reserve: in battle, Swap brings one in, and one replaces anyone
  // who falls), and anyone else waits at the Time Machine (stored); realmJoin puts whoever joins in the first with
  // room.
  function realmParty(realm) {
    const all = player.flags.realmParty = player.flags.realmParty || {};
    const me = player.race && window.REALM_FIGHTERS[player.race] ? player.race : "you";
    if (!all[realm]) all[realm] = { party: [Ultimax.recruit(me, 1)], items: { staminan: 3 } };
    const P = all[realm];
    P.reserve = P.reserve || []; P.stored = P.stored || [];
    // (A Pokémon brought along who's no longer in your party, left in a box or traded, goes back.)
    for (const k of ["party", "reserve", "stored"]) P[k] = P[k].filter((r) => !r.pokemon || realmMon(r));
    // (HP saved before Ultimax.HP_SCALE: as much of the new maximum.)
    for (const r of P.party.concat(P.reserve, P.stored)) Ultimax.rescale(r);
    // (Four at most fighting, four in reserve.)
    while (P.party.length > 4) P.reserve.unshift(P.party.pop());
    while (P.reserve.length > 4) P.stored.unshift(P.reserve.pop());
    const rec = realmMe(P);
    if (rec && (rec.id === "you" || (window.REALM_RACES || []).some((r) => r.id === rec.id)) && rec.id !== me && me !== "you") {
      rec.id = me;
      const s = Ultimax.statsOf(rec);
      rec.hp = Math.min(rec.hp, s.hp); rec.mp = Math.min(rec.mp, s.mp);
    }
    return all[realm];
  }
  // A Pokémon in a realm's party: { pokemon: its personality }, the record itself staying in your party (so its HP,
  // PP and EXP are the same in both realms). It fights by the Ultimax system's rules (engine/battle.js's
  // Ultimax.pokemon): its stats as theirs, its types as elements, its moves as skills that cost PP.
  const realmAll = (P) => P.party.concat(P.reserve || [], P.stored || []);
  // (You: your race's record, wherever you are in the party.)
  const realmMe = (P) => realmAll(P).find((r) => r.id === "you" || (window.REALM_RACES || []).some((x) => x.id === r.id)) || P.party[0];
  function realmJoin(P, rec) {
    const k = P.party.length < 4 ? "party" : P.reserve.length < 4 ? "reserve" : "stored";
    P[k].push(rec);
    return k;
  }
  const JOINED = { party: "", reserve: " (in reserve)", stored: " They'll wait at the Time Machine." };
  const realmMon = (rec) => rec.pokemon != null ? (player.party || []).find((m) => !m.egg && m.personality === rec.pokemon) || null : null;
  const realmMember = (rec) => {
    const mon = realmMon(rec);
    return mon ? Object.assign(Ultimax.pokemon(mon, Party.stats(mon), Party.displayName(mon)), { rec }) : Ultimax.member(rec, player.name);
  };
  // Everyone's HP and MP back (a Pokémon's HP and PP, as at a Pokémon Center).
  function realmRestore(P) {
    for (const rec of realmAll(P)) {
      const mon = realmMon(rec);
      if (mon) Party.heal(mon);
      else { const s = Ultimax.statsOf(rec); rec.hp = s.hp; rec.mp = s.mp; rec.hpScale = Ultimax.HP_SCALE; }
    }
  }
  // Bringing a Pokémon from your party into the realm's (as anyone joins: realmJoin), or sending one back.
  async function realmPokemon(realm) {
    const P = realmParty(realm);
    for (;;) {
      const here = realmAll(P).filter((r) => realmMon(r)).map(realmMon);
      const can = (player.party || []).filter((m) => !m.egg && !here.includes(m));
      const v = await ask("Pokémon fight here by this realm's\nrules. Bring one, or send one back?", [
        { label: "Bring one", value: "bring", className: "action", disabled: !can.length },
        { label: "Send back", value: "send", className: "action", disabled: !here.length }, back()]);
      if (v === "back") return;
      const list = v === "bring" ? can : here;
      const pick = await ask(v === "bring" ? "Bring which Pokémon?" : "Send which one back?",
        list.map((m, i) => ({ label: Party.displayName(m) + "  Lv " + m.level, value: i })).concat([back()]));
      if (pick === "back") continue;
      const mon = list[pick], f = Ultimax.pokemon(mon, Party.stats(mon), Party.displayName(mon));
      if (v === "bring") {
        const where = realmJoin(P, { pokemon: mon.personality });
        await say([realmWrap(Party.displayName(mon) + " joins the party!" + JOINED[where]), realmWrap("Here it's " + f.elements.join("/") + ", with STR " + f.str + ", DEF " + f.def + ", INT " + f.int + ", WIS " + f.wis + " and SPD " + f.spd + "."),
          realmWrap(f.skills.length ? "Its moves here: " + f.skills.map((id) => f.own[id].name).join(", ") + "." : "None of its moves work here: it can only attack.")]);
      } else {
        for (const k of ["party", "reserve", "stored"]) { const i = P[k].findIndex((r) => realmMon(r) === mon); if (i >= 0) P[k].splice(i, 1); }
        await say(Party.displayName(mon) + " goes back to your party.");
      }
      await persist();
    }
  }
  const raceName = () => { const r = (window.REALM_RACES || []).find((x) => x.id === player.race); return r ? r.name : null; };
  const inRealmParty = (realm, id) => !!(player.flags.realmParty && player.flags.realmParty[realm] && realmAll(realmParty(realm)).some((m) => m.id === id));
  const realmName = (rec) => (realmMon(rec) ? Party.displayName(realmMon(rec)) : window.REALM_FIGHTERS[rec.id].name || player.name);
  let realmQuiet = 0;   // (steps before the next fight can start: a few after each one)
  // (A battle's line, broken into the text box's lines at the spaces.)
  function realmWrap(text) {
    const out = [];
    for (const para of String(text).split("\n")) {
      let line = "";
      for (const w of para.split(" ")) {
        if (line && (line + " " + w).length > 30) { out.push(line); line = w; } else line = line ? line + " " + w : w;
      }
      out.push(line);
    }
    return out.join("\n");
  }
  function realmEncounterStep() {
    const m = player.location.map, enc = window.REALM_ENCOUNTERS && window.REALM_ENCOUNTERS[m];
    if (!enc) return null;
    if (realmQuiet > 0) { realmQuiet--; return null; }
    return Math.random() < enc.rate ? { type: "realm-battle" } : null;
  }
  // (On Kamurocho's street: a step's chance of a fight, its rate as the map's; never in the alley or the bar.)
  function realmStreetStep() {
    const enc = window.REALM_ENCOUNTERS && window.REALM_ENCOUNTERS.Kamurocho;
    if (!enc) return null;
    if (realmQuiet > 0) { realmQuiet--; return null; }
    return Math.random() < enc.rate ? { type: "realm-battle" } : null;
  }
  // The party's best level (a Pokémon's or a fighter's): which of the street's gangs come out.
  function realmBestLevel() {
    const P = realmParty((window.WORLD_MAPS[player.location.map] || {}).realm || "yakuza");
    return Math.max(1, ...P.party.map((rec) => (realmMon(rec) ? realmMon(rec).level : rec.lv || 1)));
  }
  async function realmEncounter() {
    // (Only the groups your party's level has come to: its best's, a Pokémon's or a fighter's.)
    const lv = realmBestLevel();
    const groups = Ultimax.groupsFor(window.REALM_ENCOUNTERS[player.location.map], lv), total = groups.reduce((s, [w]) => s + w, 0);
    let r = Math.random() * total, group = groups[0][1];
    for (const [w, g] of groups) if ((r -= w) < 0) { group = g; break; }
    await realmFight(group);
  }
  // A foe's picture: its battle picture, or its overworld sheet's first frame (facing you).
  function realmFoePic(f) {
    const d = window.REALM_FOES[f.id];
    // (Kamurocho's own, side on: Streets of Kamurocho's, facing you from the right, as tall as on its streets)
    if (d.street && Street.isStreet(player.location.map)) return '<img class="rb-street" alt="" onload="this.style.height=(this.naturalHeight/2.24*' + (d.big ? 1.4 : 1) + ')+\'cqh\'" src="assets/kamurocho/people/' + d.street + '.png">';
    if (d.battle) return '<div class="rb-pic big" style="background-image:url(' + d.battle + ')"></div>';
    return '<div class="rb-pic sheet' + (d.big ? " big" : "") + '" style="background-image:url(assets/world/sprites/' + d.sprite + '.png)"></div>';
  }
  // The screen (ui/ultimax-screen.js, FireRed's double battle's way): the street where you stand behind it, the foes
  // at the left with their HP bars, the party's healthboxes down the right.
  function realmDraw(b) {
    const m = window.WORLD_MAPS[player.location.map];
    let back;
    // (On Kamurocho's streets, the street behind you.)
    if (Street.isStreet(m.name)) { const k = Street.backdrop(); back = "background-image:url(" + k.url + ");background-size:" + k.size + ";background-position:" + k.position; }
    else {
      const at = Overworld.position();
      const W = m.width * 16, H = m.height * 16, cx = Math.max(0, Math.min(W - 240, at.x * 16 - 112)), cy = Math.max(0, Math.min(H - 160, at.y * 16 - 72));
      back = 'background-image:url(assets/world/maps/' + m.name + '.png);background-size:' + (W / 2.4) + '% ' + (H / 1.6) + '%;background-position:' +
        (cx / (W - 240) * 100) + '% ' + (cy / (H - 160) * 100) + '%';
    }
    show("scene");
    scene.classList.add("evo");
    UltimaxScreen.build(scene, b, { back, pic: realmFoePic });
  }
  // Each of the party's choices for the turn, or "run": for each in turn, FireRed's FIGHT / BAG / PARTY / RUN (B on
  // the second and after goes back to the one before). FIGHT: Attack, Defend and their skills (a Pokémon's moves) in
  // FireRed's move box, what each costs and its element at the right; BAG: the items; PARTY: one of the reserve in.
  // Whom it's for: the ▼ over a foe, or one of the party's boxes bobbing.
  async function realmChoices(b) {
    const choices = b.allies.map(() => null), P = b.items || {}, I = window.REALM_ITEMS;
    const ov = $("#overlay"), frame = GameOptions.get().frame, cursor = b.cursors || (b.cursors = {});
    const who = b.allies.map((f, i) => i).filter((i) => b.allies[i].hp > 0);
    const element = (e) => "TYPE/" + String(e || "Neutral").toUpperCase();
    // (Whom: the foe or one of the party, said in the message box as you move; the last one picked first.)
    const target = async (kind, text) => {
      if (kind === "all" || kind === "self" || kind === "party") return 0;
      const ally = kind === "ally", list = ally ? b.allies : b.foes;
      const at = await UltimaxScreen.pick(ally ? "ally" : "foe", b, cursor[kind] || 0,
        (i) => instant(text + "\n" + list[i].name + (ally ? "   HP " + list[i].hp + "/" + list[i].maxHp : "")));
      instant("");
      if (at != null) cursor[kind] = at;
      return at;
    };
    const box = (moves, at) => GbaMenus.battleMoves(ov, { moves, cursor: at || 0, frame });
    for (let k = 0; k < who.length;) {
      const i = who[k], f = b.allies[i];
      instant("");
      const a = await GbaMenus.battleAction(ov, { prompt: ["What will", f.name + " do?"], labels: ["FIGHT", "BAG", "PARTY", "RUN"],
        cursor: cursor["act" + i] || 0, frame, canBack: k > 0 });
      cursor["act" + i] = a.cursor;
      if (a.action === "back") { k--; continue; }
      if (a.action === "run") return "run";
      if (a.action === "pokemon") {
        // (Swap: one of the reserve comes in, this one's turn; each of them once a turn.)
        const bench = b.reserve.map((x, j) => [x, j]).filter(([x, j]) => x.hp > 0 && !choices.some((c, ci) => ci !== i && c && c.act === "swap" && c.reserve === j));
        if (!bench.length) { await message(b.reserve.length ? "There's no one else who can fight!" : "There's no one in reserve!"); continue; }
        const r = await box(bench.map(([x]) => ({ name: x.name, info: [["Lv " + x.lv], ["HP " + x.hp + "/" + x.maxHp]] })));
        if (!r) continue;
        choices[i] = { act: "swap", reserve: bench[r.index][1] }; k++; continue;
      }
      if (a.action === "bag") {
        const ids = Object.keys(P).filter((x) => P[x] > 0 && I[x]);
        if (!ids.length) { await message("There are no items!"); continue; }
        const what = (it) => [it.heal ? "HP+" + (it.heal === "all" ? "all" : it.heal * Ultimax.HP_SCALE) : "", it.mp ? "MP+" + it.mp : "", it.revive ? "Revives" : ""].filter(Boolean);
        const r = await box(ids.map((x) => { const w = what(I[x]); return { name: I[x].name, info: [["×" + P[x] + "  " + (w[0] || "")], [w.slice(1).join(" ")]] }; }), cursor.item);
        if (!r) continue;
        cursor.item = r.cursor;
        const t = await target("ally", "Use " + I[ids[r.index]].name + " on whom?");
        if (t == null) continue;
        choices[i] = { act: "item", item: ids[r.index], target: t }; k++; continue;
      }
      // FIGHT: Attack, Defend, then the skills.
      const sk = (id) => Ultimax.skillOf(f, id);
      // (Each one's category, as a Pokémon move's: Physical, Magical or Status; then its cost and its element.)
      const moves = [{ name: "Attack", info: [["PHYSICAL"], [f.mon ? "No PP" : "No MP"], [element((f.elements || [])[0])]] },
        { name: "Defend", info: [["STATUS"], [f.mon ? "No PP" : "No MP"], ["Halves damage"]] }]
        .concat(f.skills.map((id) => {
          const s2 = sk(id), short = f.mon ? !(f.pp[id] > 0) : s2.mp > f.mp;
          return { name: s2.name, dim: short, info: [[Ultimax.category(s2).toUpperCase()],
            [f.mon ? "PP " + f.pp[id] + "/" + ((f.mon.moves || []).find((m) => "move:" + m.name === id) || {}).maxpp : "MP " + s2.mp + " of " + f.mp, short], [element(s2.element)]] };
        }));
      const r = await box(moves, cursor["fight" + i]);
      if (!r) continue;
      cursor["fight" + i] = r.cursor;
      if (r.index === 1) { choices[i] = { act: "defend" }; k++; continue; }
      if (r.index === 0) {
        const t = await target("one", "Attack whom?");
        if (t == null) continue;
        choices[i] = { act: "attack", target: t }; k++; continue;
      }
      const id = f.skills[r.index - 2], s2 = sk(id);
      if (moves[r.index].dim) { await message(f.mon ? "There's no PP left for this move!" : "Not enough MP!"); continue; }
      const t = await target(s2.target, s2.name + ": on whom?");
      if (t == null) continue;
      choices[i] = { act: "skill", skill: id, target: s2.target === "self" ? i : t }; k++;
    }
    return choices;
  }
  // A whole fight: "won", "lost" or "ran". opts: intro (what's said first), after a loss you wake by the Time
  // Machine (unless opts.keepGoing: the fight just ends).
  async function realmFight(foeIds, opts) {
    opts = opts || {};
    const realm = (window.WORLD_MAPS[player.location.map] || {}).realm, P = realmParty(realm);
    const b = Ultimax.create(P.party.map(realmMember), foeIds, { reserve: P.reserve.map(realmMember) });
    b.items = P.items;
    music(b.boss ? "mus_vs_gym_leader" : "mus_vs_wild");
    realmDraw(b);
    const names = b.foes.map((f) => f.name);
    await message(realmWrap(opts.intro || (names.length === 1 ? names[0] + " picks a fight!" : names.slice(0, -1).join(", ") + " and " + names[names.length - 1] + " pick a fight!")));
    while (!b.over) {
      const choices = await realmChoices(b);
      for (const st of Ultimax.turn(b, choices)) { UltimaxScreen.show(b, st.snap); UltimaxScreen.fx(st.fx); await message(realmWrap(st.text)); }
    }
    Ultimax.keep(b);
    for (const k of Object.keys(P.items)) if (!(P.items[k] > 0)) delete P.items[k];
    if (b.over === "won") {
      const { exp, money } = Ultimax.spoils(b);
      music(b.boss ? "mus_victory_gym_leader" : "mus_victory_wild");
      Player.addMoney(player, money);
      await message(realmWrap(b.allies.filter((f) => f.hp > 0).length > 1 ? "Each of you gets " + exp + " EXP." : player.name + " gets " + exp + " EXP."));
      if (money) await message("You picked up ¥" + money + ".");
      // (the reserve too, as in Dragon Quest XI)
      for (const f of b.allies.concat(b.reserve)) {
        if (f.hp <= 0) continue;
        if (f.mon) { await realmMonExp(f.mon, exp); continue; }
        const levels = Ultimax.gainExp(f.rec, exp);
        for (const l of levels) {
          await fanfare("mus_level_up");
          await message(realmName(f.rec) + " is now level " + l.lv + "!");
          for (const s of l.learned) await message(realmWrap(realmName(f.rec) + " learned " + window.REALM_SKILLS[s].name + "!"));
        }
        if (levels.length) await realmPoints(f.rec);
      }
    }
    // (Anyone who fell gets up with 1 HP, as after a won fight in Dragon Quest you'd have to revive them; here they
    // walk it off.)
    // (Who's fighting and who's in reserve, as the swaps left them.)
    P.party = b.allies.map((f) => f.rec); P.reserve = b.reserve.map((f) => f.rec);
    if (b.over !== "lost") for (const rec of realmAll(P)) { const r = realmMon(rec) || rec; if (r.hp <= 0) r.hp = 1; }
    realmQuiet = 10;
    const here = window.WORLD_MAPS[player.location.map];
    UltimaxScreen.stop();
    scene.classList.remove("evo");
    Screen.say(""); clearMenu();
    if (Street.isStreet(player.location.map)) show("street");
    else { show("world"); await Overworld.resume(); }
    if (b.over === "lost" && !opts.keepGoing) {
      const lost = Math.floor(player.money / 2);
      player.money -= lost;
      realmRestore(P);
      const to = window.KAMUROCHO.arrive;
      await voyage({ map: to.map, x: to.x, y: to.y, facing: to.facing }, ["Everything goes black…", "You come to by the Time Machine,\nyour wallet ¥" + lost + " lighter."], "se_faint");
      return b.over;
    }
    if (b.over === "lost") for (const rec of realmAll(P)) { const r = realmMon(rec) || rec; if (r.hp <= 0) r.hp = 1; }
    music(here.music);
    return b.over;
  }
  // The party, out of battle: each one's level, HP, MP, stats, elements, skills and EXP to the next level.
  async function realmPartyScreen(realm) {
    const P = realmParty(realm);
    for (;;) {
      const all = realmAll(P), where = (rec) => (P.party.includes(rec) ? "Fighting" : P.reserve.includes(rec) ? "Reserve" : "Time Machine");
      const v = await ask(realmWrap("Fighting " + P.party.length + "/4, in reserve " + P.reserve.length + "/4, at the Time Machine " + P.stored.length + "."),
        [{ label: "Look", value: "look", className: "action" }, { label: "Stat points", value: "points", className: "action", disabled: !all.some((rec) => !realmMon(rec) && Ultimax.pointsOf(rec).points > 0) },
          { label: "Arrange", value: "arrange", className: "action", disabled: all.length < 2 }, back()]);
      if (v === "back") return;
      if (v === "look") { await realmPartyLook(P); continue; }
      if (v === "points") {
        const has = all.filter((rec) => !realmMon(rec) && rec.points > 0);
        const i = has.length === 1 ? 0 : await ask("Whose stat points?", has.map((rec, k) => ({ label: realmName(rec) + "  " + rec.points, value: k })).concat([back()]));
        if (i !== "back") await realmPoints(has[i]);
        await persist();
        continue;
      }
      // (Arranging: who fights, who waits in reserve and who at the Time Machine; you always fight.)
      const pick = await ask("Move whom?", all.map((rec, i) => ({ label: realmName(rec) + "  Lv " + (realmMon(rec) ? realmMon(rec).level : rec.lv) + "  (" + where(rec) + ")", value: i, disabled: rec === realmMe(P) })).concat([back()]));
      if (pick === "back") continue;
      const rec = all[pick], from = P.party.includes(rec) ? "party" : P.reserve.includes(rec) ? "reserve" : "stored";
      const to = await ask(realmName(rec) + ": where?", [
        { label: "Fighting", value: "party", className: "action", disabled: from === "party" || P.party.length >= 4 },
        { label: "Reserve", value: "reserve", className: "action", disabled: from === "reserve" || P.reserve.length >= 4 },
        { label: "Time Machine", value: "stored", className: "action", disabled: from === "stored" }, back()]);
      if (to === "back") continue;
      P[from].splice(P[from].indexOf(rec), 1); P[to].push(rec);
      await persist();
    }
  }
  // Putting a member's stat points in (Ultimax.spend): each stat as it is and what a point adds, until they're all in
  // or "Later" keeps the rest for the party screen.
  async function realmPoints(rec) {
    const NAMES = { hp: "HP", mp: "MP", str: "Strength", def: "Defence", int: "Intelligence", wis: "Wisdom", spd: "Speed" };
    const ADDS = { hp: 2 * Ultimax.HP_SCALE, mp: 2 };
    while (Ultimax.pointsOf(rec).points > 0) {
      const s = Ultimax.statsOf(rec);
      const v = await ask(realmName(rec) + " has " + rec.points + " stat point" + (rec.points > 1 ? "s" : "") + ".\nWhich stat goes up?",
        Ultimax.POINT_STATS.map((k) => ({ label: NAMES[k] + "  " + s[k] + " +" + (ADDS[k] || 1), value: k })).concat([back("Later")]));
      if (v === "back") return;
      Ultimax.spend(rec, v);
      sfx("se_select");
    }
  }
  async function realmPartyLook(P) {
    const S = window.REALM_SKILLS, F = window.REALM_FIGHTERS;
    for (const rec of realmAll(P)) {
      const mon = realmMon(rec);
      if (mon) {
        const f = realmMember(rec);
        await say([f.name + "  Lv " + f.lv + "  (" + f.elements.join("/") + ")\nHP " + f.hp + "/" + f.maxHp,
          "STR " + f.str + "  DEF " + f.def + "  INT " + f.int + "\nWIS " + f.wis + "  SPD " + f.spd,
          realmWrap("Moves: " + (f.skills.map((id) => f.own[id].name + " (" + f.pp[id] + " PP)").join(", ") || "none that work here"))]);
        continue;
      }
      const s = Ultimax.statsOf(rec);
      const race = F[rec.id].name || !raceName() ? "" : " the " + raceName();
      await say([realmName(rec) + race + "  Lv " + rec.lv + (race ? "\n" + F[rec.id].elements.join("/") + "  " : "  (" + F[rec.id].elements.join("/") + ")\n") +
        "HP " + rec.hp + "/" + s.hp + "  MP " + rec.mp + "/" + s.mp,
        "STR " + s.str + "  DEF " + s.def + "  INT " + s.int + "\nWIS " + s.wis + "  SPD " + s.spd,
        realmWrap("Skills: " + (Ultimax.skillsAt(rec.id, rec.lv).map((k) => S[k].name + " (" + Ultimax.category(S[k]) + ")").join(", ") || "none")),
        "Next level: " + (Ultimax.expFor(rec.lv + 1) - rec.exp) + " EXP" + (rec.points ? "\nStat points to put in: " + rec.points : "")]);
    }
    const items = Object.keys(P.items).filter((k) => P.items[k] > 0);
    await say("Items: " + (items.map((k) => window.REALM_ITEMS[k].name + " ×" + P.items[k]).join(", ") || "none"));
  }
  // A Pokémon's share of a won fight: Ultimax EXP as its own (Ultimax.pokemonExp), and its levels, new moves and
  // evolving as from Exp. Candies (to the level cap).
  async function realmMonExp(mon, exp) {
    const E = Experience, rate = E.growthRate(mon.species), top = Math.min(E.MAX_LEVEL, Player.levelCap(player)), name = Party.displayName(mon);
    if (mon.level >= top) return;
    const before = mon.exp;
    mon.exp = Math.min(E.expForLevel(rate, top), mon.exp + Ultimax.pokemonExp(mon, exp));
    await message(name + " gained " + (mon.exp - before).toLocaleString("en-US") + " Exp. Points!");
    let grew = false;
    while (mon.level < top && mon.exp >= E.expForLevel(rate, mon.level + 1)) {
      const moves = Bag.levelUp(mon, { here: player.location && player.location.map });
      grew = true;
      await fanfare("mus_level_up");
      await message(name + " grew to Lv. " + mon.level + "!");
      for (const move of moves) await learnMove(mon, move);
    }
    const evo = grew && Evolution.find(mon, { trigger: "level", party: player.party, coins: coins() });
    if (evo) await evolve(mon, evo, true);
  }
  // Kiryu: joins you when you ask, at level 3 or yours, whichever's higher.
  async function kamurochoKiryu(person) {
    await say(person.text);
    if (!(await confirm("Kiryu: You look like you can handle\nyourself. Want to walk with me?"))) { await say("Kiryu: Suit yourself."); return; }
    const P = realmParty("yakuza");
    const where = realmJoin(P, Ultimax.recruit("kiryu", Math.max(3, realmMe(P).lv)));
    await fanfare("mus_obtain_key_item");
    await say([realmWrap("Kazuma Kiryu joined the party!" + JOINED[where]), "Kiryu: Let's go. This town doesn't\nsleep, and neither do its punks."]);
    await Overworld.refreshPeople();
  }
  // Majima: a fight, and once he's beaten, he tags along (at level 8 or more).
  async function kamurochoMajima(person) {
    await say(person.text);
    if (!(await confirm("Majima: So whaddya say? You an' me,\nright here, right now!"))) { await say("Majima: Aww, ya chicken! I'll be\nwaitin'!"); return; }
    const r = await realmFight(["majima"], { intro: "Goro Majima wants to fight!", keepGoing: true });
    if (r !== "won") { await say("Majima: Hee hee! Come back when\nya've got some more fight in ya!"); return; }
    const P = realmParty("yakuza");
    const where = realmJoin(P, Ultimax.recruit("majima", Math.max(8, realmMe(P).lv)));
    await fanfare("mus_obtain_key_item");
    await say(["Majima: Hee hee hee! That was the\nmost fun I've had all year!", "I'm stickin' with you! Ain't\nnobody gonna stop me!", realmWrap("Goro Majima joined the party!" + JOINED[where])]);
    await Overworld.refreshPeople();
  }
  // Poppo's clerk: the realm's items (REALM_ITEMS), for your money.
  // Poppo's counter: FireRed's Poké Mart buy screen (ui/shop-screen.js), the realm's items (a Pokémon item's picture
  // standing in for each, REALM_ITEMS' icon) for the realm's party, the shop round you at its left.
  async function kamurochoShop() {
    await say("Clerk: Welcome to Poppo!");
    const P = realmParty("yakuza"), I = window.REALM_ITEMS;
    // (the street's screen, 336x224, as the 240x160 the shop screen shows a corner of)
    const street = $("#street"), map = Object.assign(document.createElement("canvas"), { width: 240, height: 160 });
    if (street) { const g = map.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(street, 0, 0, 240, 160); }
    Screen.say("");
    clearMenu();
    await ShopScreen.open({
      frame: GameOptions.get().frame,
      items: Object.keys(I).map((id) => ({ id, name: I[id].name, price: I[id].price, desc: Ultimax.itemText(id), icon: Bag.sprite(I[id].icon) })),
      money: () => player.money,
      inBag: (id) => P.items[id] || 0,
      limit: (id) => ({ max: Math.max(0, 99 - (P.items[id] || 0)), why: "You can't carry any more of\nthose." }),
      buy: (id, n) => {
        Player.addMoney(player, -I[id].price * n);
        P.items[id] = (P.items[id] || 0) + n;
        persist();
        return null;
      },
      map: { canvas: map, x: 136, y: 80 }
    });
    ShopScreen.close();
    show("street");
    await say("Clerk: Thank you! Come again!");
  }
  // Domino Square's fountain (and Clock Tower Square's): back through the portal to the Realm Hub, or off round the
  // realm: Battle City's places (The Sacred Cards'), Domino City's and the world's (Reshef of Destruction's:
  // tools/build-reshef.py).
  const RESHEF_DOMINO = ["Clock Tower Square", "Domino High School", "Your House", "Domino Station", "Egypt Exhibition", "Domino Pier", "KaibaLand"];
  async function dominoFountain() {
    await say("The fountain's water shimmers with\na golden light.");
    const SC = window.SACRED_CARDS, RD = window.RESHEF;
    const groups = [{ label: "Battle City", areas: SC.areas }];
    if (RD) {
      groups.push({ label: "Domino City", areas: RD.areas.filter((a) => RESHEF_DOMINO.includes(a.title)) });
      groups.push({ label: "Around the world", areas: RD.areas.filter((a) => !RESHEF_DOMINO.includes(a.title)) });
    }
    for (;;) {
      const v = await ask("Where would you like to go?", [{ label: "The Realm Hub", value: "hub", className: "action" }]
        .concat(groups.map((g, i) => ({ label: g.label, value: String(i), className: "action" })), [back()]));
      if (v === "hub") { await voyage(HUB_YUGIOH_PORTAL, ["You step into the golden light…"], "se_warp_in"); return; }
      const g = groups[+v];
      if (!g) return;
      const w = await ask(g.label + ": where to?", g.areas.map((a, i) => ({ label: a.title, value: String(i), className: "action" })).concat([back()]));
      const a = g.areas[+w];
      if (!a) continue;
      await voyage({ map: a.map, x: a.x, y: a.y, facing: a.facing || "down" }, [g.label === "Around the world" ? "You set off on a long journey…" : "You set off across Domino City…"], "se_door");
      return;
    }
  }
  // (Somewhere with no way back of its own: back to its square.)
  async function dominoBackToTown() {
    const rd = /^RD_/.test(player.location.map) && window.RESHEF;
    const to = rd ? Object.assign({ facing: "down" }, rd.areas.find((a) => a.title === "Clock Tower Square")) : window.SACRED_CARDS.arrive;
    if (!(await confirm(rd ? "Head back to Clock Tower Square?" : "Head back to Domino Square?"))) return;
    await voyage({ map: to.map, x: to.x, y: to.y, facing: to.facing || "down" }, ["You head back across Domino City…"], "se_door");
  }
  // ---------- Domino City's map ----------
  //
  // As in The Sacred Cards, you go from place to place in Domino City on its map screen, the game's own
  // (tools/build-domino-map.py): the city from above, a red marker on each place, the gold cursor over the one you're
  // on, and at the bottom its picture and name. Step through the Realm Hub's golden portal and it comes up, and so it
  // does as you walk out of a place (its way out: the "Domino_WorldMap" steps, tools/build-domino-high.py). There are
  // two places on it, Domino High and the Kame Game shop, each on one of the game's own markers' spots (x, y: the
  // marker's corner, in pixels of the 240 by 160 map), and once Yugi has sent you there (player.flags.kaibaStory),
  // Kaiba Corporation, The Sacred Cards' (on a spot of this game's own); back to the Realm Hub is a choice below the
  // map. (`maps`: the maps that count as being at the place.)
  const DOMINO_PLACES = [
    { map: "DH_00", name: "Domino High School", x: 44, y: 57, arrive: { x: 7, y: 8, facing: "up" }, maps: /^DH_/ },
    { map: "RD_06", name: "Kame Game Shop", x: 106, y: 69, arrive: { x: 13, y: 6, facing: "left" }, maps: /^RD_0[67]$/ },
    { map: "SC_22", name: "Kaiba Corporation", x: 164, y: 44, arrive: { x: 7, y: 8, facing: "up" }, maps: /^SC_(22|23|40|41)$/, flag: "kaibaStory" }
  ];
  // (the places on the map now, and the one you're at)
  const dominoPlaces = (here) => DOMINO_PLACES.filter((p) => !p.flag || player.flags[p.flag] || p.map === here);
  // (The arrows go to the nearest place that way, A sets off, B stays; "hub" back to the Realm Hub.)
  async function dominoMap(here, fromHub) {
    const PLACES = dominoPlaces(here);
    let at = Math.max(0, PLACES.findIndex((p) => p.map === here));
    const spot = (x, y) => "left:" + (x / 2.4) + "%;top:" + (y / 1.6) + "%";
    show("scene");
    clearMenu();
    Screen.say("");
    scene.innerHTML = '<div class="town-map domino-map"><img class="tm-map" src="assets/town-map/domino.png" alt="Map of Domino City">' +
      PLACES.map((p) => '<img class="dm-marker" src="assets/town-map/domino-marker.png" alt="" style="' + spot(p.x, p.y) + '">').join("") +
      '<img class="dm-cursor" src="assets/town-map/domino-cursor.png" alt="">' +
      '<div class="dm-inset"><img class="dm-pic" alt=""><img class="dm-frame" src="assets/town-map/domino-frame.png" alt=""></div>' +
      '<div class="dm-name"></div></div>';
    const draw = () => {
      const p = PLACES[at];
      scene.querySelector(".dm-cursor").setAttribute("style", spot(p.x, p.y - 10));
      scene.querySelector(".dm-pic").src = "assets/town-map/domino-" + p.map + ".png";
      scene.querySelector(".dm-name").textContent = p.name;
    };
    draw();
    let picked = null;
    const choose = new Promise((resolve) => { picked = resolve; });
    // (Down from the lowest place goes to the choices below the map, where A and B are the menu's; up, back to it.)
    const menuBox = document.getElementById("menu");
    const onKey = (e) => {
      const onChoice = menuBox.contains(document.activeElement) && document.activeElement.tagName === "BUTTON";
      if (onChoice) {
        if (e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); document.activeElement.blur(); }
        return;
      }
      if (["z", "Z", " ", "Enter"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); sfx("se_select"); picked(PLACES[at]); return; }
      if (["x", "X", "Escape"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); picked(null); return; }
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      const best = nearestPlace(PLACES, at, d);
      if (best >= 0) { at = best; sfx("se_select"); draw(); }
      else if (e.key === "ArrowDown") { const first = menuBox.querySelector("button"); if (first) first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    // (No choices below it: B closes it. The way back to the Realm Hub is the Time Machine under the manhole by the
    // Kame Game shop.)
    void fromHub;
    const r = await choose;
    clearMenu();
    document.removeEventListener("keydown", onKey, true);
    return r === "hub" || (r && r.map !== here) ? r : null;
  }
  async function dominoTravel() {
    const loc = player.location, m = window.WORLD_MAPS[loc.map], from = DOMINO_PLACES.find((p) => p.maps.test(loc.map));
    const fromHub = (m || {}).realm === "hub";
    const to = await dominoMap(from ? from.map : null, fromHub);
    show("world");
    await Overworld.resume();
    if (!to) { if (!fromHub) await stepBackIn(loc, m); return; }
    if (to === "hub") {
      await voyage(HUB_YUGIOH_PORTAL, ["You step into the golden light…", "…and come out in the Realm Hub."], "se_warp_in");
      return;
    }
    if (fromHub) {
      await voyage(Object.assign({ map: to.map }, to.arrive), ["You step into the golden light…", "The world turns inside out…"], "se_warp_in");
      if (!player.flags.dominoVisited) await say(["You've arrived in Domino City,\nin the Yu-Gi-Oh! realm!", "Your Bag stays behind in the\nPokémon realm. Here you have\na bag of this realm's own."]);
      player.flags.dominoVisited = true;
      await persist();
      return;
    }
    await Overworld.fadeToBlack();
    player.location = Object.assign({ map: to.map }, to.arrive);
    await Overworld.teleport(player.location);
    music(window.WORLD_MAPS[to.map].music);
    await persist();
  }
  // The manhole in the Kame Game shop's street, down to the room under it (tools/build-time-machine.js), where the
  // Time Machine takes you back to the Realm Hub; and the ladder back up.
  async function dominoManhole(down) {
    const to = window.TIME_MACHINE;
    if (down) {
      await say("It's a manhole. Its cover's loose,\nand there's a ladder going down…");
      if (!(await confirm("Climb down the ladder?"))) return;
    } else if (!(await confirm("Climb back up to the street?"))) return;
    await Overworld.fadeToBlack();
    sfx("se_exit");
    player.location = Object.assign({}, down ? to.under : to.street);
    await Overworld.teleport(player.location);
    music(window.WORLD_MAPS[player.location.map].music);
    await persist();
  }
  async function dominoTimeMachine() {
    await say("It's the Time Machine! It hums\nsoftly in the dark.");
    if (!(await confirm("Travel back to the Realm Hub?"))) return;
    await voyage(window.TIME_MACHINE.hub, ["The Time Machine whirs to life…", "Domino City fades away…", "…and you come out in the Realm Hub."], "se_warp_in");
  }
  // The Kame Game shop: Yugi's grandpa, Solomon Muto, on GX Duel Academy's shop screen (ui/bag-screen.js's CardShop).
  // He sells the booster packs your duelist level has opened (window.YUGIOH_SETS, PACK_LEVEL), 300 a pack (game/bag.js's price), into your bag,
  // opened from the Trunk's Inventory, their cards into your Trunk; he dismantles your spare cards (those not in your deck, several at once) for tokens of their
  // rarity (window.YUGIOH_RARITY: Common, Rare, Super Rare, Ultra Rare, Secret Rare), and trades any card whose
  // pack you've opened (only those are listed) for TOKENS_PER_CARD tokens of its rarity. (Packs of the old sets still in your bag he swaps for Pack Tokens.)
  const PACK_SETS = ["darkhole", "spellbinding", "redeyes", "darkmagician", "trihorned", "blueeyes", "raigeki", "traphole", "necrofear", "skull", "jinzo"],
    PACK_CARDS = 9, TOKENS_PER_CARD = 3, TOKEN_UP = { c: 50, r: 15, s: 10, u: 5 };
  // (the duelist level each pack's sold from: the weaker Spells', Traps' and monsters' from the start; the rest as you
  // rise, the stronger Spells and Traps with Blue-Eyes White Dragon's)
  const PACK_LEVEL = { darkhole: 1, spellbinding: 1, redeyes: 1, darkmagician: 5, trihorned: 10, raigeki: 15, traphole: 15, blueeyes: 20, necrofear: 25, skull: 30, jinzo: 35 };
  // (the packs before these, a save's: each a Pack Token, for one of these)
  const OLD_PACK_ITEMS = ["legend-of-blue-eyes-pack", "metal-raiders-pack", "spell-ruler-pack", "pharaohs-servant-pack", "labyrinth-of-nightmare-pack",
    "ultimate-great-moth-pack", "gate-guardian-pack", "des-gardius-pack", "dark-ruler-ha-des-pack", "gilford-pack", "berserk-dragon-pack",
    "dark-magician-of-chaos-pack", "horus-pack", "blue-eyes-shining-pack", "wicked-dreadroot-pack"];
  // ---------- Your duelist level ----------
  // EXP after every duel (dominoDuel): 100 for beating Yugi, Téa, Joey or Tristan, 60 for one of the pupils, 25 for a
  // loss; each level takes 10 more than the one before (50 from level 1 to 2). It opens the Kame Game shop's packs
  // (PACK_LEVEL); the Trunk's Inventory shows it.
  const expToNext = (lv) => 50 + 10 * (lv - 1);
  function duelistLevel(y) {
    let lv = 1, e = y.exp || 0;
    while (lv < 99 && e >= expToNext(lv)) { e -= expToNext(lv); lv++; }
    return { lv, into: e, next: expToNext(lv) };
  }
  const packsSold = (y) => PACK_SETS.filter((k) => duelistLevel(y).lv >= PACK_LEVEL[k]);
  const RARITY_NAME = { c: "Common", r: "Rare", s: "Super Rare", u: "Ultra Rare", x: "Secret Rare" };
  const rarityOf = (no) => window.YUGIOH_RARITY[no] || "c";
  // (each card's pack, by number: its Duelist Level unlocks trading for it too)
  let packIndex = null;
  function packOf(no) {
    if (!packIndex) {
      packIndex = {};
      for (const k of PACK_SETS) for (const [field, names] of Object.entries(window.YUGIOH_SETS[k]))
        if (Array.isArray(names)) for (const n of names) { const m = window.DuelMonsters.numberOf(n); if (m && !packIndex[m]) packIndex[m] = k; }
    }
    return packIndex[no];
  }
  // A pack's nine cards: eight Commons and a Rare, or now and then a Super (1 in 6), an Ultra (1 in 12) or a Secret
  // Rare (1 in 72) instead, as the sets' packs were.
  function pullPack(set, rng) {
    const pick = (a) => a[Math.floor(rng() * a.length)];
    const out = [];
    for (let j = 0; j < PACK_CARDS - 1; j++) out.push(pick(set.common));
    const r = rng();
    out.push(pick(r < 1 / 72 && set.secret.length ? set.secret : r < 1 / 12 && set.ultra.length ? set.ultra : r < 1 / 4 && set.super.length ? set.super : set.rare));
    return out;
  }
  // (cards into your Trunk, each marked NEW if you had none)
  function gainCards(nos) {
    const y = yugioh();
    return nos.map((no) => { const isNew = !(y.trunk[no] > 0); y.trunk[no] = (y.trunk[no] || 0) + 1; return { no, isNew }; });
  }
  function setCompletion(key) {
    const set = window.YUGIOH_SETS[key], y = yugioh(), DM = window.DuelMonsters;
    const all = ["common", "rare", "super", "ultra", "secret"].reduce((a, k) => a.concat(set[k]), []).map((n) => DM.numberOf(n)).filter(Boolean);
    return all.length ? Math.floor(100 * all.filter((no) => y.trunk[no] > 0).length / all.length) : 0;
  }
  function openPacks(key, n) {
    const set = window.YUGIOH_SETS[key], DM = window.DuelMonsters, packs = [];
    for (let k = 0; k < n; k++) packs.push(gainCards(pullPack(set, Math.random).map((name) => DM.numberOf(name)).filter(Boolean)));
    return packs;
  }
  async function kameGameShop() {
    const y = yugioh(), C = window.YUGIOH_CARDS.cards;
    y.tokens = y.tokens || {};
    const price = Bag.price(window.YUGIOH_SETS.darkhole.item) || 300;
    Screen.say(""); clearMenu();
    CardShop.setup({ money: () => player.money, sets: window.YUGIOH_SETS });
    if (!y.gotPackTokens) {
      // (the first time: 10 Pack Tokens, a booster pack of your choice each, to build your first deck from)
      await CardShop.say(["Grandpa: Welcome to the Kame Game\nshop! I'm Solomon Muto, Yugi's\ngrandpa.", "So you want to be a duelist? Then\nyou'll need a deck of your own!",
        "Here, take these: 10 Pack Tokens.\nTrade them in for any booster packs\nyou like, one pack a token.", player.name + " got 10 Pack Tokens!",
        "Open your packs from your Trunk's\nInventory, then build a deck of 40\ncards or more. Good luck!",
        "Duel, and your Duelist Level will\nrise. The higher it is, the more\npacks I'll have for you!"]);
      y.gotPackTokens = true; y.packTokens = (y.packTokens || 0) + 10;
      await persist();
    } else await CardShop.say(["Grandpa: Welcome back to the Kame\nGame shop!"]);
    for (;;) {
      const options = ["Buy booster packs.", "Dismantle cards.", "Trade in tokens."].concat(y.packTokens ? ["Trade in Pack Tokens."] : []);
      const i = await CardShop.choose("Grandpa: What'll it be?", options);
      if (i < 0) break;
      if (i === 3) {
        // (Pack Tokens for packs: a token a pack, into your bag, to open from your Trunk's Inventory)
        await CardShop.picker({ sets: window.YUGIOH_SETS, order: packsSold(y), money: () => y.packTokens || 0, price: 1, perPack: PACK_CARDS, comp: setCompletion, trunk: () => y.trunk,
          buy: (basket) => {
            const n = basket.reduce((a, b) => a + b.n, 0);
            if ((y.packTokens || 0) < n) return { error: "Grandpa: You haven't that many\nPack Tokens." };
            y.packTokens -= n;
            for (const b of basket) Player.addItem(player, window.YUGIOH_SETS[b.key].item, b.n);
            return { message: "Grandpa: Here you are, " + n + " pack" + (n > 1 ? "s" : "") + "!\nOpen them from your Trunk's\nInventory." };
          } });
        CardShop.setup({ money: () => player.money, sets: window.YUGIOH_SETS });
        await persist();
      } else if (i === 0) {
        await CardShop.picker({ sets: window.YUGIOH_SETS, order: packsSold(y), money: () => player.money, price, perPack: PACK_CARDS, comp: setCompletion, trunk: () => y.trunk,
          buy: (basket) => {
            const n = basket.reduce((a, b) => a + b.n, 0);
            if (player.money < n * price) return { error: "Grandpa: You can't quite afford that." };
            Player.addMoney(player, -n * price);
            // (into your bag: every pack opens from the Trunk's Inventory)
            for (const b of basket) Player.addItem(player, window.YUGIOH_SETS[b.key].item, b.n);
            return { message: "Grandpa: Thank you! Here " + (n > 1 ? "are your " + n + " packs" : "is your pack") + ".\nOpen " + (n > 1 ? "them" : "it") + " from your Trunk's\nInventory." };
          } });
        await persist();
      } else if (i === 1) {
        await CardShop.say("Grandpa: Dismantle the cards you\ndon't need, and you'll get a token\nof the card's rarity for each.");
        await CardShop.say("(SELECT sorts your cards.)");
        CardShop.close();
        // (a card's copies in use: as many as the deck with the most of it has)
        const inDeck = (no) => Math.max(...y.decks.map((d) => d.main.filter((m) => m === no).length + d.side.filter((m) => m === no).length));
        await TrunkScreen.open({ cards: window.YUGIOH_CARDS, trunk: y.trunk, deck: y.deck, mode: "dismantle", title: "Dismantle", tokens: () => y.tokens,
          action: (no) => {
            const spare = (y.trunk[no] || 0) - inDeck(no), r = rarityOf(no);
            if (spare <= 0) return { error: "That card's in one of your decks.\nTake it out first to dismantle it." };
            const take = (n) => { y.trunk[no] -= n; if (!y.trunk[no]) delete y.trunk[no]; y.tokens[r] = (y.tokens[r] || 0) + n; };
            if (spare > 1) return { most: spare, many: () => "Dismantle how many?",
              run: (n) => { take(n); return "You got " + n + " " + RARITY_NAME[r] + " Token" + (n > 1 ? "s" : "") + "!"; } };
            return { ask: "Dismantle " + C[no][0] + "?\nYou'll get " + (r === "u" ? "an " : "a ") + RARITY_NAME[r] + " Token.",
              run: () => { take(1); return null; } };
          } });
        await persist();
      } else {
        await CardShop.say("Grandpa: Bring me " + TOKENS_PER_CARD + " tokens of a\ncard's rarity, and the card's yours!");
        await CardShop.say("(SELECT sorts the cards.)");
        CardShop.close();
        // (only the cards of the packs your Duelist Level has opened)
        const opened = packsSold(y), tradeable = window.YUGIOH_CARDS.cards.map((c, no) => no).filter((no) => no && opened.includes(packOf(no)));
        await TrunkScreen.open({ cards: window.YUGIOH_CARDS, trunk: y.trunk, deck: y.deck, mode: "trade", title: "Trade", tokens: () => y.tokens, only: tradeable,
          action: (no) => {
            const r = rarityOf(no);
            if ((y.tokens[r] || 0) < TOKENS_PER_CARD) return { error: "You need " + TOKENS_PER_CARD + " " + RARITY_NAME[r] + " Tokens\nfor this card." };
            return { ask: "Trade " + TOKENS_PER_CARD + " " + RARITY_NAME[r] + " Tokens\nfor " + C[no][0] + "?",
              run: () => { y.tokens[r] -= TOKENS_PER_CARD; y.trunk[no] = (y.trunk[no] || 0) + 1; return null; } };
          } });
        await persist();
      }
    }
    await CardShop.say("Grandpa: Come again! And may the\nheart of the cards guide you!");
    CardShop.close();
    show("world");
    await persist();
  }
  // ---------- Your Duel Monsters cards ----------
  //
  // The Yu-Gi-Oh! realm's cards (window.YUGIOH_CARDS: Yu-Gi-Oh! GX Duel Academy's 1200, tools/build-gx-trunk.py):
  // the ones you have (player.flags.yugioh.trunk: how many of each, by card number) and your decks, DECK_SLOTS of
  // them as GX Duel Academy keeps several (flags.yugioh.decks: each { name, main deck with any Fusion Monsters,
  // side deck }; flags.yugioh.deckSlot the one you duel with, y.deck), looked through and built in the Trunk
  // (ui/bag-screen.js's TrunkScreen, GX Duel Academy's), from the START menu in the Yu-Gi-Oh! realm.
  const DECK_SLOTS = 20;
  function yugioh() {
    const y = player.flags.yugioh = player.flags.yugioh || {};
    y.trunk = y.trunk || {};
    // (a save from before the slots: its one deck, and its name, the first)
    if (!Array.isArray(y.decks)) y.decks = [y.deck && y.deck.main ? Object.assign({ name: y.deckName }, y.deck) : null];
    delete y.deck; delete y.deckName;
    for (let i = 0; i < DECK_SLOTS; i++) {
      const d = y.decks[i] = y.decks[i] || {};
      d.name = d.name || "Deck " + (i + 1); d.main = d.main || []; d.side = d.side || [];
    }
    y.deckSlot = Math.max(0, Math.min(DECK_SLOTS - 1, y.deckSlot | 0));
    // (y.deck: the one you duel with; not saved, the slots are)
    Object.defineProperty(y, "deck", { get: () => y.decks[y.deckSlot], configurable: true, enumerable: false });
    // (packs from before the packs were rewritten, in this realm's bag: a Pack Token each)
    const ygoBag = player.flags.bagRealm === "yugioh" ? player.bag : (player.flags.realmBags || {}).yugioh;
    if (ygoBag) for (const it of OLD_PACK_ITEMS) if (ygoBag[it]) { y.packTokens = (y.packTokens || 0) + ygoBag[it]; delete ygoBag[it]; }
    // (the six cards GX made up, not in the game: gone from your Trunk and decks if you had any)
    const gone = (no) => window.YUGIOH_RARITY[no] === "-";
    for (const no of Object.keys(y.trunk)) if (gone(+no)) delete y.trunk[no];
    for (const d of y.decks) for (const k of ["main", "side"]) if (d[k].some(gone)) d[k] = d[k].filter((no) => !gone(no));
    return y;
  }
  async function trunkScreen() {
    const y = yugioh();
    Screen.say("");
    clearMenu();
    // (its INVENTORY: your booster packs, in this realm's bag, to open there; your Pack Tokens and your cards' tokens)
    const S = window.YUGIOH_SETS;
    await TrunkScreen.open({ cards: window.YUGIOH_CARDS, trunk: y.trunk, decks: y.decks, slot: y.deckSlot, selectDeck: (i) => { y.deckSlot = i; },
      inventory: () => [(() => { const L = duelistLevel(y); return { label: "Duelist Level " + L.lv, count: L.into + "/" + L.next + " EXP" }; })()]
        .concat(PACK_SETS.map((k) => ({ label: S[k].name + " Pack", count: Player.itemCount(player, S[k].item), pack: k })))
        .concat([{ label: "Pack Tokens", count: y.packTokens || 0 }])
        .concat(["c", "r", "s", "u", "x"].map((r) => ({ label: RARITY_NAME[r] + " Tokens", count: (y.tokens || {})[r] || 0, token: r }))),
      // (a rarity's tokens for one of the next's: 50 Common for a Rare, 15 Rare for a Super Rare, 10 Super Rare for an
      // Ultra Rare, 5 Ultra Rare for a Secret Rare)
      tokenCost: TOKEN_UP,
      tradeTokens: (r, n) => {
        const next = "crsux"["crsux".indexOf(r) + 1];
        y.tokens = y.tokens || {};
        n = Math.min(n, Math.floor((y.tokens[r] || 0) / TOKEN_UP[r]));
        y.tokens[r] -= TOKEN_UP[r] * n; y.tokens[next] = (y.tokens[next] || 0) + n;
        return "You got " + n + " " + RARITY_NAME[next] + " Token" + (n > 1 ? "s" : "") + ".";
      },
      openPack: async (key, n) => {
        n = Math.min(n || 1, Player.itemCount(player, S[key].item));
        if (!n || !Player.removeItem(player, S[key].item, n)) return;
        CardShop.setup({ money: () => player.money, sets: S });
        // (every pack at once: all their cards into the Trunk, one opening with all of them, then one list of them all,
        // the rarest first, each card once with how many came out)
        const all = openPacks(key, n).flat(), list = [], RANK = "xusrc";
        await CardShop.opening(key, all, n);
        for (const c of all) {
          const m = list.find((x) => x.no === c.no);
          if (m) m.count++; else list.push({ no: c.no, isNew: c.isNew, count: 1 });
        }
        list.sort((a, b) => RANK.indexOf(rarityOf(a.no)) - RANK.indexOf(rarityOf(b.no)) || a.no - b.no);
        await CardShop.results({ sets: S, title: S[key].name + (n > 1 ? " x" + n : ""), cards: list, comp: setCompletion(key), packKey: key });
        CardShop.close();
        await persist();
      } });
    await persist();
  }
  // Duels (ui/bag-screen.js's DuelScreen, GX Duel Academy's field, on DuelMonsters' rules): Yugi, Téa, Joey and
  // Tristan in Domino High's classroom, each with their own deck (window.YUGIOH_DUELISTS). Your deck is your
  // Trunk's, of 40 cards at least (there's no deck to borrow: you build your first from booster packs). Beat one of them and they give
  // you a card from their deck.
  // (A deck by its cards' names: those the game has, filled to 40 with second and third copies.)
  function duelDeck(names) {
    const DM = window.DuelMonsters, C = window.YUGIOH_CARDS.cards;
    const nos = names.map((n) => DM.numberOf(n)).filter((no) => no && DM.playable(no));
    const main = nos.filter((no) => C[no][2] !== "fusion"), deck = nos.slice();
    for (let copy = 1; copy < 3 && deck.filter((no) => C[no][2] !== "fusion").length < 40; copy++)
      for (const no of main) { if (deck.filter((no2) => C[no2][2] !== "fusion").length >= 40) break; deck.push(no); }
    return deck;
  }
  // Domino High's three other pupils: each duels with a deck of the few boosters they've opened, the beginner's
  // packs (window.YUGIOH_SETS): four Red-Eyes Black Dragon packs, a Dark Hole and a Spellbinding Circle, nine cards a
  // pack, their Commons and Rares only (they've traded the rest away), 40 of them as they came (three of a card at
  // most, about two dozen monsters, Commons that need no Tribute, 700 ATK and 900 DEF at most), filled with more Commons from the same sets. Weaker than Yugi's and
  // his friends' decks, as a beginner's is. Each pupil's packs are their own (seeded by who they are), so their deck
  // is the same every time.
  function boosterDeck(seedText) {
    let h = 2166136261;
    for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    const rng = () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const DM = window.DuelMonsters, C = window.YUGIOH_CARDS.cards, S = window.YUGIOH_SETS;
    const pulled = [];
    for (const key of ["redeyes", "redeyes", "redeyes", "redeyes", "darkhole", "spellbinding"]) pulled.push(...pullPack(S[key], rng));
    // (more Commons, to fill the deck with if the packs come up short)
    for (let k = 0; k < 30; k++) { const s = S[k % 6 < 4 ? "redeyes" : k % 6 === 4 ? "darkhole" : "spellbinding"]; pulled.push(s.common[Math.floor(rng() * s.common.length)]); }
    const R = window.YUGIOH_RARITY;
    const nos = pulled.map((n) => DM.numberOf(n)).filter((no) => no && C[no] && DM.playable(no) && "cr".includes(R[no]) && C[no][2] !== "fusion");
    const count = {}, deck = [];
    const lv = (no) => C[no][5] || 0;
    const isMon = (no) => ["normal", "effect", "ritual"].includes(C[no][2]) && !(DM.effectOf(no) || {}).specialOnly;
    const take = (no) => { if ((count[no] || 0) >= 3 || deck.length >= 40) return false; count[no] = (count[no] || 0) + 1; deck.push(no); return true; };
    // (the monsters as they came, Commons that need no Tribute, 700 ATK and 900 DEF at most; then the Spells and Traps,
    // and more monsters to make 40)
    const weak = (no) => isMon(no) && lv(no) <= 4 && R[no] === "c" && C[no][6] <= 700 && C[no][7] <= 900;
    for (const no of nos.filter(weak)) { if (deck.length >= 24) break; take(no); }
    for (const no of nos.filter((no) => !isMon(no))) take(no);
    for (const no of nos.filter(weak)) take(no);
    return deck;
  }
  // (how likely each card of their deck is to be a prize, by its rarity)
  const DUEL_DROP = { c: 30, r: 10, s: 4, u: 2, x: 1 };
  function classmate(script) {
    const c = window.YUGIOH_DUELISTS.classmates, name = c.name;
    return { name, ask: c.ask, win: name + ": " + c.win, lose: name + ": " + c.lose, nos: boosterDeck(script) };
  }
  async function dominoDuel(key, person) {
    const foe = typeof key === "string" ? window.YUGIOH_DUELISTS[key] : key, y = yugioh(), C = window.YUGIOH_CARDS.cards;
    if (person && person.text) await say(person.text);
    if (!(await confirm(foe.name + ": " + (foe.ask || "How about a duel?")))) return;
    // (your own deck: 40 cards at least, built in the Trunk from your packs)
    const deck = y.deck.main.filter((no) => C[no]);
    if (deck.filter((no) => C[no][2] !== "fusion").length < 40) {
      await say(["Your deck has fewer than 40 cards.", "Open booster packs and build a deck\nin your Trunk first!"]);
      return;
    }
    Screen.say("");
    clearMenu();
    const foeDeck = foe.nos || duelDeck(foe.deck);
    const r = await DuelScreen.open({ cards: window.YUGIOH_CARDS, deck, foe: { name: foe.name, deck: foeDeck }, you: player.name });
    show("world");
    if (r.winner === 0) {
      // (Yugi and his friends: who you've beaten, for the story: kaibaScene)
      if (typeof key === "string") y.beaten = Object.assign({}, y.beaten, { [key]: true });
      // (the prizes: money, and three cards from their deck, the rarer the rarer: DUEL_DROP's weights)
      const money = foe.nos ? 800 : 2000;
      Player.addMoney(player, money);
      const weighted = foeDeck.map((no) => [no, DUEL_DROP[rarityOf(no)]]), total = weighted.reduce((a, w) => a + w[1], 0);
      const won = [];
      for (let k = 0; k < 3; k++) { let t = Math.random() * total; const w = weighted.find((x) => (t -= x[1]) < 0) || weighted[0]; won.push(w[0]); }
      await say([foe.lose, player.name + " got ¥" + money + "!"]);
      const cards = gainCards(won), merged = [];
      for (const c of cards) { const m = merged.find((x) => x.no === c.no); if (m) { m.count++; m.isNew = m.isNew || c.isNew; } else merged.push(Object.assign({ count: 1 }, c)); }
      Screen.say(""); clearMenu();
      await CardShop.results({ title: foe.name + "'s cards", cards: merged });
      CardShop.close();
      show("world");
      await say(player.name + " got " + merged.map((c) => C[c.no][0] + (c.count > 1 ? " x" + c.count : "")).join(", ") + "!");
    } else await say(foe.win);
    // (EXP, and the packs a new duelist level opens)
    const was = duelistLevel(y).lv, exp = r.winner === 0 ? (foe.nos ? 60 : 100) : 25;
    y.exp = (y.exp || 0) + exp;
    const L = duelistLevel(y);
    await say(player.name + " got " + exp + " EXP!");
    if (L.lv > was) {
      const opened = PACK_SETS.filter((k) => PACK_LEVEL[k] > was && PACK_LEVEL[k] <= L.lv);
      await say(["Your Duelist Level went up to " + L.lv + "!"].concat(opened.length ? ["New packs at the Kame Game shop:\n" + opened.map((k) => window.YUGIOH_SETS[k].name).join(",\n") + "!"] : []));
    }
    await persist();
    if (!player.flags.kaibaStory && ["yugi", "tea", "joey", "tristan"].every((k) => y.beaten && y.beaten[k])) await kaibaScene();
  }
  // ---------- Kaiba and the Blue-Eyes White Dragon (this game's own, after the anime's first episode) ----------
  //
  // Once you've beaten Yugi, Téa, Joey and Tristan, each at least once: meanwhile, at the Kame Game shop, Seto Kaiba
  // walks in wanting Grandpa's Blue-Eyes White Dragon. Grandpa won't trade it, so Kaiba duels him for it, and wins
  // with a Blue-Eyes of his own; Grandpa collapses, and Kaiba tears the Blue-Eyes in two and leaves. Back in Domino
  // High's classroom, Yugi tells you what happened: meet them at Kaiba Corporation's headquarters, to defeat Kaiba.
  // Kaiba Corporation is on Domino City's map from then on (player.flags.kaibaStory).
  async function kaibaScene() {
    const back = Object.assign({}, Overworld.position()), GRANDPA = "LOCALID_KAME_GAME_GRANDPA", KAIBA = "LOCALID_KAIBA";
    const KAIBA_LOOK = { sprite: "rd_kaiba", width: 32, height: 32, frames: 9 };
    await Overworld.fadeToBlack();
    await say("Meanwhile, at the Kame Game shop…");
    // (the shop, you not in it: Kaiba in at the door, up to the counter)
    await Overworld.teleport({ map: "RD_07", x: 7, y: 8, facing: "up", hidden: true });
    music("mus_encounter_rival");
    Overworld.addObject(KAIBA, { x: 7, y: 9, facing: "up" }, KAIBA_LOOK);
    await Overworld.act([{ who: KAIBA, moves: ["walk_up", "walk_up", "walk_up", "walk_left", "walk_left", "face_up"] },
      { who: GRANDPA, moves: ["delay_16", "face_down"] }]);
    await Overworld.act([{ who: GRANDPA, moves: ["emote_exclamation_mark"] }]);
    await say(["Grandpa: Welcome! Oh… Seto Kaiba.", "Kaiba: Spare me the welcome, old man.\nI hear you have a Blue-Eyes White\nDragon. Show it to me.",
      "Grandpa: …Here it is. A friend gave\nit to me long ago. There are only\nfour in the whole world.",
      "Kaiba: I'll trade you for it. This case\nholds the rarest cards there are.\nTake them all.",
      "Grandpa: I'm sorry, but this card isn't\nfor trade. It means more to me than\nany card could.",
      "Kaiba: Then I'll win it from you.\nA duel, old man: your Blue-Eyes\nagainst my case of cards.",
      "Grandpa: …Very well. A duelist never\nbacks down from a challenge."]);
    // (the duel, Kaiba's way)
    sfx("se_select");
    await say("Kaiba and Grandpa duel!");
    await say("Kaiba: I summon Blue-Eyes White\nDragon!");
    await say("Grandpa: What?! You have one too?!");
    await say("Kaiba: Blue-Eyes, attack!\nWhite Lightning!");
    Overworld.flash();
    await Overworld.shake(8, { y: 2 });
    await say(["Grandpa's Life Points fell to 0!", "Kaiba: Pathetic. The Blue-Eyes is mine."]);
    await Overworld.act([{ who: GRANDPA, moves: ["emote_x"] }]);
    await Overworld.shake(3, { y: 1 });
    await say(["Grandpa clutched his chest…", "…and collapsed!"]);
    await say("Kaiba: With this, no one will ever use\na Blue-Eyes White Dragon against me.");
    await Overworld.shake(2, { x: 1, y: 0 });
    await say(["Kaiba tore the Blue-Eyes White Dragon\nin two!", "Kaiba: The only Blue-Eyes in this world\nwill be mine."]);
    await Overworld.act([{ who: KAIBA, moves: ["walk_right", "walk_right", "walk_down", "walk_down", "walk_down", "set_invisible"] }]);
    Overworld.removeObject(KAIBA);
    // (back to the classroom, Yugi and his friends)
    await Overworld.fadeToBlack();
    await say("Later…");
    await Overworld.teleport({ map: back.map, x: back.x, y: back.y, facing: back.facing });
    music(window.WORLD_MAPS[back.map].music);
    await Overworld.act([{ who: "player", moves: ["emote_exclamation_mark"] }]);
    await say(["Yugi: " + player.name + "! Something terrible's\nhappened!",
      "Yugi: Seto Kaiba went to my grandpa's\nshop. He wanted Grandpa's Blue-Eyes\nWhite Dragon.",
      "Yugi: Grandpa wouldn't trade it, so\nKaiba challenged him to a duel…\nand won.",
      "Yugi: Grandpa collapsed. He's resting\nnow… but then Kaiba tore the\nBlue-Eyes in half!",
      "Joey: That creep! Who does Kaiba think\nhe is?!", "Téa: Your grandpa's going to be all\nright, Yugi.",
      "Tristan: So what do we do now?", "Yugi: We go to Kaiba Corporation.\nI'll duel Kaiba, for Grandpa!",
      "Yugi: " + player.name + ", meet us at Kaiba\nCorporation's headquarters. Together,\nwe'll defeat Kaiba!"]);
    player.flags.kaibaStory = 1;
    await say("Kaiba Corporation is now on\nDomino City's map!");
    await persist();
  }
  async function visitRealmHub() {
    Screen.say("");
    show("world");
    Overworld.resume();
    await voyage(window.TIME_MACHINE.hub, ["The Time Machine whirs to life…"], "se_warp_in");
    player.flags.realmHubVisited = true;
  }

  async function visitOrre() {
    Screen.say("");
    show("world");
    Overworld.resume();
    await flyToOrre();
  }

  // ---------- Orre: how you come to be there (this game's own) ----------
  //
  // Once you've beaten Hoenn's Pokémon League (Emerald's FLAG_SYS_GAME_CLEAR), the next step you take Prof. Oak calls
  // on your PokéNav: something's wrong in Orre, far away, and he'd like to see you at his lab in Pallet Town
  // (player.flags.orreStory 1). There he tells you of Orre's two evil teams, Cipher and Team Snagem, and the Shadow
  // Pokémon, and asks you to go undercover in Team Snagem to find out what they're planning and stop it. Say yes and
  // his plane takes you to the Orre Air Strip (orreStory 2); say no and he asks again next time. In Orre you're
  // yourself, with your own Pokémon (game/orre.js); the pilot at the Air Strip flies you back to Kanto, and Oak sends
  // you to Orre again whenever you ask him. He gives you the Orre Map, Team Snagem's hideout marked on it: you go
  // from place to place in Orre on its map (orreWorldMap()), at first only the Air Strip and the hideout. (The other
  // way on after Hoenn is the S.S. Tidal's to Sinnoh.)
  function orreCallStep() {
    const f = player.flags;
    if (f.orreStory || !hasPokenav() || !hoenn.flag("FLAG_SYS_GAME_CLEAR")) return null;
    // (Out and about, not inside: the League's rooms or the Hall of Fame.)
    const here = window.WORLD_MAPS[player.location.map] || {};
    return OUTDOORS.includes(here.type) && !here.realm ? { type: "orre-call" } : null;
  }
  async function orreOakCall() {
    player.flags.orreStory = 1;
    await gear.storyCall(["Prof. Oak: Hello, {PLAYER}! It's me,\nProf. Oak!",
      "Congratulations on becoming the\nChampion of Hoenn! Splendid work!",
      "But I'm afraid I'm not only calling\nto celebrate…",
      "Something troubling is going on in a\nregion far away from here: Orre.",
      "I'd rather not say more over the\nPokéNav. Could you come and see me\nat my lab in Pallet Town, in Kanto?",
      "I'll be waiting for you!"].map((p) => fill(p)));
    await persist();
  }
  // Prof. Oak in his lab: the briefing and his question; or, once you've been, the plane back.
  async function oakOrre() {
    const f = player.flags;
    if (f.orreStory >= 2) {
      if (!(await confirm(fill("Oak: {PLAYER}! How goes your mission\nin Orre? Shall I have my plane take\nyou back there?")))) { await say("Oak: Rest up, then. Orre is counting\non you."); return; }
      await say("Oak: Good luck, {PLAYER}!");
      await flyToOrre();
      return;
    }
    if (!f.orreBriefed) {
      await say(["Oak: Ah, {PLAYER}! You came!\nThank you.",
        "Let me tell you why I called.\nHave you heard of the Orre region?",
        "It's a vast desert land, very far\nfrom Kanto. Few wild Pokémon live\nthere.",
        "So Orre's Trainers battle with the\nPokémon they've raised themselves,\ntwo against two.",
        "Lately, terrible reports have been\ncoming out of Orre.",
        "Two evil teams are wreaking havoc\nthere: Team Snagem and Cipher.",
        "Team Snagem is a gang of thieves.\nThey steal other Trainers' Pokémon\nwith a machine that can snag them!",
        "Cipher is more mysterious. No one\nknows who leads it, or what it truly\nwants…",
        "But we do know this: Cipher has\nbeen turning Pokémon into something\ncalled Shadow Pokémon.",
        "Shadow Pokémon have had the doors\nto their hearts shut tight. They feel\nnothing for anyone.",
        "They battle like fighting machines,\nand will even attack people!",
        "It's a cruel thing to do to a\nPokémon. And I fear the two teams are\nworking together somehow.",
        "So here is what I'd ask of you,\n{PLAYER}.",
        "Join Team Snagem as an undercover\nagent, and find out what they and\nCipher are planning.",
        "Then put a stop to it!",
        "It will be dangerous. You'll be far\nfrom home, and no one must find out\nwho you really are."]);
      f.orreBriefed = true;
    } else await say(["Oak: {PLAYER}, have you thought about\nwhat I asked?"]);
    if (!(await confirm(fill("Oak: Will you go to Orre and help,\n{PLAYER}?")))) {
      await say(["Oak: I see… It's a lot to ask of you.", "Come and talk to me again when\nyou're ready."]);
      return;
    }
    await say(["Oak: I knew I could count on you!", "My plane is waiting to fly you to\nthe Orre Air Strip.",
      "Team Snagem's hideout is out in\nEclo Canyon, in the north-east of\nOrre.",
      "I've had it marked on a map of Orre\nfor you. Here!"]);
    await sayWithJingle("mus_obtain_key_item", fill("{PLAYER} received the Orre Map!"));
    await say(["Oak: Places in Orre are far apart.\nWhen you leave one, pick where to\ngo next on the map.",
      "Go to Team Snagem's hideout. That's\nwhere your mission begins.",
      "And remember: in Orre, every battle\nis a double battle. Take at least\ntwo Pokémon you can trust!",
      "Good luck, {PLAYER}!"]);
    f.orreStory = 2;
    await flyToOrre(true);
  }
  // The flight: the screen goes black, the plane's engine and the words of the trip, and you're on the Air Strip by
  // the plane's door; the first time, the pilot welcomes you to Orre.
  async function flyToOrre(fromOak) {
    const first = !player.flags.orreLanded;
    await Overworld.fadeToBlack();
    music(null);
    Overworld.setAvatar("walk");
    Orre.leave(player);   // (an older save's Wes, back to yourself first)
    Orre.enter(player);
    if (first) {
      const o = $("#overlay");
      sfx("se_m_fly");
      await GbaMenus.blackScreen(o, fromOak ? fill("Prof. Oak's little plane takes off\nfrom Kanto, and flies far, far away…") : "A little plane flies far, far away…");
      await GbaMenus.blackScreen(o, "Over the sea, and on over a land of\nendless desert: the Orre region.");
      o.classList.add("hidden");
    }
    await Overworld.teleport(player.location);
    player.flags.orreLanded = true;
    if (first) {
      await sleep(300);
      await Overworld.act([{ who: ORRE("PILOT"), moves: ["face_left", "walk_in_place_faster_left"] }]);
      await say(["Pilot: Here we are: the Orre Air\nStrip! Welcome to Orre.",
        "Head out through the gate, and pick\nwhere to go on your map of Orre.",
        "Whenever you want to go back to\nKanto, come and see me. I'll be\nwaiting here with the plane."]);
    }
    await persist();
  }
  // ---------- Orre's map (Colosseum's) ----------
  //
  // Places in Orre are far apart, across the desert: walk out of one (its way out: the map's "Orre_WorldMap"
  // triggers, tools/build-orre.js) and the map of Orre comes up, a marker on each place you can go (game/orre.js:
  // at first the Air Strip and Team Snagem's hideout). The arrows go to the nearest place that way, A sets off (your
  // icon slides across to it, then you're there, by its way in), B stays (a step back in from the edge).
  function orreWorldMap() {
    return placeMap({ image: "assets/town-map/orre.png", cls: "orre-map", alt: "Map of Orre", places: Orre.openPlaces(player.flags), here: player.location.map });
  }
  // (The nearest place to places[at] the way `d` goes: distance, with places off to the side counting for more.)
  function nearestPlace(places, at, d) {
    const cur = places[at];
    let best = -1, bestScore = Infinity;
    places.forEach((p, k) => {
      const dx = p.x - cur.x, dy = p.y - cur.y, along = dx * d[0] + dy * d[1];
      if (k === at || along <= 0) return;
      const score = along + 2 * Math.abs(dx * d[1] + dy * d[0]);
      if (score < bestScore) { bestScore = score; best = k; }
    });
    return best;
  }
  // (A map of places, Orre's: `places` [{ map, name, x, y }], where each is in pixels of its 240 by
  // 160 `image`; `here` the place you're at. The place picked, or null.)
  async function placeMap({ image, cls, alt, places, here }) {
    let at = Math.max(0, places.findIndex((p) => p.map === here));
    const from = places[at];
    const pos = (p) => "left:" + (p.x / 2.4) + "%;top:" + (p.y / 1.6) + "%";
    const icon = (p) => "left:" + ((p.x - 8) / 2.4) + "%;top:" + ((p.y - 8) / 1.6) + "%";
    show("scene");
    clearMenu();
    Screen.say("");
    scene.innerHTML = '<div class="town-map ' + cls + '"><img class="tm-map" src="' + image + '" alt="' + alt + '">' +
      places.map((p) => '<div class="om-place' + (p.map === here ? " here" : "") + '" style="' + pos(p) + '"></div>').join("") +
      '<img class="tm-player" src="assets/town-map/player.png" alt="You are here" style="' + icon(from) + '">' +
      '<div class="tm-name"><b></b><small></small></div><div class="tm-cursor"></div></div>';
    const draw = () => {
      const p = places[at];
      scene.querySelector(".tm-name b").textContent = p.name;
      scene.querySelector(".tm-name small").textContent = p.map === here ? "You are here" : "Where do you want to go?";
      scene.querySelector(".tm-cursor").setAttribute("style", icon(p));
    };
    draw();
    let picked = null;
    const choose = new Promise((resolve) => { picked = resolve; });
    const onKey = (e) => {
      if (["z", "Z", " ", "Enter"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); sfx("se_select"); picked(places[at]); return; }
      if (["x", "X", "Escape"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); picked(null); return; }
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      const best = nearestPlace(places, at, d);
      if (best >= 0) { at = best; sfx("se_select"); draw(); }
    };
    document.addEventListener("keydown", onKey, true);
    const r = await Promise.race([ask("", [back("Stay")]).then(() => null), choose]);
    clearMenu();
    document.removeEventListener("keydown", onKey, true);
    if (r && r.map !== here) {
      scene.querySelector(".tm-cursor").remove();
      scene.querySelector(".tm-name small").textContent = "";
      const me = scene.querySelector(".tm-player");
      me.getBoundingClientRect();
      me.setAttribute("style", icon(r));
      await sleep(1000);
    }
    return r && r.map !== here ? r : null;
  }
  async function orreTravel() {
    const to = await orreWorldMap();
    show("world");
    await Overworld.resume();
    const loc = player.location, m = window.WORLD_MAPS[loc.map];
    if (!to) { await stepBackIn(loc, m); return; }
    await Overworld.fadeToBlack();
    Overworld.setAvatar("walk");
    player.location = Object.assign({ map: to.map }, to.arrive);
    await Overworld.teleport(player.location);
    music(window.WORLD_MAPS[to.map].music);
    // (A scene as you get there: Folly and Trudly at the Outskirt Stand.)
    if (special("arrive:" + to.map)) await story({ type: "trigger", trigger: { script: "arrive:" + to.map }, map: to.map });
    await persist();
  }
  // (Back in from the edge you were leaving by.)
  async function stepBackIn(loc, m) {
    const dir = loc.y === 0 ? "down" : loc.y === m.height - 1 ? "up" : loc.x === 0 ? "right" : "left";
    await Overworld.act([{ who: "player", moves: ["walk_" + dir] }]);
  }
  // Team Snagem's guards at the hideout's gate. Talk to one and you can ask to join Team Snagem, as Prof. Oak asked
  // (player.flags.orreStory 3 once you have): they laugh, then give you the Snag Machine and Snagem's tests for a new
  // recruit. The first: go to Phenac City (it opens on Orre's map) and snag a Trainer's Makuhita (phenacKodo); come
  // back with it (orreStory 4) and the guards report to Master Gonzap. Fail, by losing or without snagging it, and
  // you're brought back to the guards to try again. (What comes after is for later.)
  const SNAGEM_GUARDS = [ORRE("GUARD_1"), ORRE("GUARD_2")];
  async function snagemGuard(person) {
    const f = player.flags;
    // (A save from before the Snag Machine, when 3 and 4 were the guard's battle: asked again.)
    if ((f.orreStory === 3 || f.orreStory === 4) && !Player.itemCount(player, "snag-machine")) f.orreStory = 2;
    const step = f.orreStory | 0;
    const me = (person && person.localId) || SNAGEM_GUARDS[0], other = SNAGEM_GUARDS.find((g) => g !== me);
    if (step >= 5) {
      await say(["Grunt: Master Gonzap's heard about\nyou, recruit.", "Hang around. There'll be another test\nfor you soon enough."]);
      return;
    }
    if (step === 4) {
      await say(fill("Grunt: Well? Let's see it, then.\nYou got that Makuhita?"));
      await say(["Grunt: Hah! You really snagged it!", "Other grunt: Not bad for a rookie!"]);
      await say(["Grunt: That's test one passed.\nI'll tell Master Gonzap about you.",
        "But don't get cocky. A Snagem's got a\nlot more to prove than that.", "Hang around. We'll have your next\ntest ready soon."]);
      f.orreStory = 5;
      await persist();
      return;
    }
    if (step === 3) {
      await say(["Grunt: What're you doing back here?", "Your test's in Phenac City! A Trainer\nthere has a Makuhita.",
        "Snag it, and bring it back here!"]);
      return;
    }
    await say(["Grunt: Hey! Who are you? This is\nTeam Snagem's hideout!", "Nobody gets through this gate without\nthe boss's say-so."]);
    if (!(await confirm("Ask to join Team Snagem?"))) { await say("Grunt: Then beat it, kid!"); return; }
    await say([fill("{PLAYER}: I want to join Team Snagem!")]);
    Screen.say("");
    sfx("se_pin");
    await Overworld.act([{ who: me, moves: ["emote_exclamation_mark"] }, { who: other, moves: ["emote_exclamation_mark"] }]);
    await say(["Grunt: Huh?! You want to join\nTeam Snagem?"]);
    await say(["Other grunt: Gahahaha! You hear that?\nThe kid wants to be a Snagem!"]);
    await say(["Grunt: Team Snagem's no playground,\nkid. We snag other Trainers' Pokémon\nfor a living.",
      "…Then again, Master Gonzap's always\nsaying we need more hands.", "Fine. You want in? You pass our tests.",
      "And for those, you'll need this."]);
    Player.addItem(player, "snag-machine", 1);
    await sayWithJingle("mus_obtain_key_item", fill("{PLAYER} received the Snag Machine!"));
    await say(["Grunt: That's a Snag Machine. Put it on\nand your Poké Balls become Snag Balls.",
      "With those, you can catch another\nTrainer's Pokémon right out from\nunder their nose!",
      "Test one: Phenac City, the city of\nwater, west of here.", "There's a Trainer there with a\nMakuhita. Snag it, and bring it back!",
      "Lose, or come back empty-handed, and\nyou'll be starting over. Got it?"]);
    f.orreStory = 3;
    Orre.unlock(f, "PhenacCity");
    await persist();
  }
  // The Trainer in Phenac City with the Makuhita (Snagem's first test): a double battle, his Makuhita (Lv. 7) to be
  // snagged and his Machop (Lv. 7). Snag it and keep it (orreStory 4); lose, or knock it out without snagging it,
  // and you're taken back to the guards to try again.
  const KODO_TEAM = () => [Party.create("Makuhita", 7), Party.create("Machop", 7)];
  async function phenacKodo() {
    const f = player.flags, step = f.orreStory | 0;
    if (step >= 4) { await say(["Black Belt Kodo: My Makuhita…", "I'll get stronger, and get it back\nfrom you. You'll see!"]); return; }
    if (step < 3) { await say(["Black Belt Kodo: My Makuhita and\nMachop are training by the fountain.", "We'll be the toughest Trainers in\nPhenac City!"]); return; }
    await say(["Black Belt Kodo: Hey, you! You look\nlike you can handle yourself.",
      "My Makuhita and Machop have been\ntraining all morning. Battle us!"]);
    const opts = { foe: { name: "Black Belt Kodo", team: KODO_TEAM(), pic: "black_belt" }, double: true, prizeClass: "Black Belt",
      noBlackout: true, snag: ["Makuhita"], music: "mus_vs_trainer", defeatText: ["Hwaah! You're strong!"] };
    const outcome = await battle("trainer", opts);
    show("world");
    await Overworld.resume();
    music(window.WORLD_MAPS.PhenacCity.music);
    if (outcome !== "lost" && (opts.snagged || []).includes("Makuhita")) {
      await say(["Black Belt Kodo: My Makuhita…\nYou snagged it!", "You… You're with Team Snagem?!"]);
      f.orreStory = 4;
      await persist();
      return;
    }
    // (Failed: back to the hideout's guards.)
    await say(outcome === "lost" ? ["Black Belt Kodo: Hah! Not so tough\nafter all!"] : ["Black Belt Kodo: That was a great\nbattle! My Makuhita needs a rest."]);
    Screen.say("");
    await Overworld.fadeToBlack();
    player.party.forEach(Party.heal);
    player.location = { map: "SnagemHideout", x: 11, y: 7, facing: "up" };
    await Overworld.teleport(player.location);
    music(window.WORLD_MAPS.SnagemHideout.music);
    await say(["Grunt: You call that a snag?\nYou came back empty-handed!", "Pathetic. Get back to Phenac City\nand try again!",
      "And this time, snag that Makuhita\nbefore it goes down!"]);
    await persist();
  }
  // The pilot: back to Kanto, outside Prof. Oak's lab.
  async function orrePilot() {
    if (!(await confirm("Pilot: Want me to fly you back to\nKanto?"))) { await say("Pilot: Just say the word when you\nwant to go."); return; }
    await say("Pilot: Hop in! Next stop, Pallet Town.");
    await Overworld.fadeToBlack();
    music(null);
    Orre.leave(player, { map: "PalletTown", x: 16, y: 14, facing: "down" });
    await Overworld.teleport(player.location);
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    await persist();
  }
  async function leaveOrre(to) {
    Orre.leave(player, to);
    await persist();
  }
  // Coming up the road from the Air Strip the first time: Folly and Trudly come out of the diner.
  async function orreArrival() {
    player.flags.orre = 1;
    Overworld.refreshPeople();
    music(window.WORLD_MAPS.OutskirtStand.music);
    await sleep(400);
    await follyAndTrudly();
  }
  // Folly and Trudly come out of the diner, and drive off north with their sack.
  async function follyAndTrudly() {
    const door = window.WORLD_MAPS.OutskirtStand.warps[0];
    sfx("se_door");
    Overworld.addObject(ORRE("TRUDLY"), { x: door.x, y: door.y, facing: "down" });
    await Overworld.act([{ who: ORRE("TRUDLY"), moves: ["walk_down", "walk_right", "walk_right"] }]);
    sfx("se_door");
    Overworld.addObject(ORRE("FOLLY"), { x: door.x, y: door.y, facing: "down" });
    await Overworld.act([{ who: ORRE("FOLLY"), moves: ["walk_down", "walk_right"] }, { who: ORRE("TRUDLY"), moves: ["delay_16", "face_left"] }]);
    await say(["Trudly: Burp! Ahh, I'm stuffed!\nNothing beats a hot meal after a drive."]);
    await say(["Folly: Quit yapping, Trudly. The boss is\nwaiting on this delivery, remember?"]);
    await say(["Trudly: Yeah, yeah… That sack in the\ntruck isn't going anywhere, Folly."]);
    sfx("se_pin");
    await Overworld.act([{ who: ORRE("FOLLY"), moves: ["face_down", "emote_exclamation_mark"] }]);
    await say(["Folly: …Huh? What are you gawking at?", "Mind your own business, kid!\nCome on, Trudly. We're going."]);
    Screen.say("");
    // (Along to the truck out front, and in: Trudly at the wheel, Folly beside him.)
    const truck = window.WORLD_MAPS.OutskirtStand.patches.truck, right = (n) => Array(n).fill("walk_right");
    await Overworld.act([{ who: ORRE("TRUDLY"), moves: right(truck.x + 1 - door.x - 2).concat(["walk_down", "set_invisible"]) },
      { who: ORRE("FOLLY"), moves: right(truck.x - door.x - 1).concat(["walk_down", "set_invisible"]) }]);
    sfx("se_door");
    await sleep(500);
    await say(["The sack in the back of the truck…\nDid it just move?"]);
    Screen.say("");
    player.flags.orre = 2;
    applyPatches("OutskirtStand");
    sfx("se_truck_move");
    await Overworld.act([{ who: ORRE("TRUCK"), moves: ["delay_16"].concat(Array(12).fill("walk_fast_right"), ["set_invisible"]) }]);
    Overworld.removeObject(ORRE("FOLLY")); Overworld.removeObject(ORRE("TRUDLY"));
  }
  // Coming back out of the diner, Willie follows.
  async function willieChallenge() {
    const door = window.WORLD_MAPS.OutskirtStand.warps[0];
    await Overworld.act([{ who: "player", moves: ["walk_down", "walk_down"] }]);
    await say(["Hey! Wait up!"]);
    sfx("se_door");
    Overworld.addObject(ORRE("WILLIE"), { x: door.x, y: door.y, facing: "down" });
    await Overworld.act([{ who: ORRE("WILLIE"), moves: ["walk_down"] }, { who: "player", moves: ["face_up"] }]);
    await say(["Willie: Name's Willie. I ride these roads\nall day, and I've never seen you before.",
      "Those two of yours look like they've been\nthrough a lot. Let's see what they can do!",
      "Two on two, the way we battle in Orre!"]);
    const outcome = await battle("trainer", { foe: { name: "Rider Willie", team: Orre.willieTeam(), pic: "rider_willie" },
      double: true, prizeClass: "Rider", noBlackout: true, music: "mus_rs_vs_trainer",
      defeatText: ["Whoa! You're the real deal!"] });
    show("world");
    await Overworld.resume();
    music(window.WORLD_MAPS.OutskirtStand.music);
    if (outcome === "won") {
      player.flags.orre = 3;
      await say(["Willie: Man, you've got skills!",
        "If you're looking for Trainers, head up\nthe road north to Phenac City.",
        "It's a nice town. Fountains everywhere!\nSee you around!"]);
    } else await say(["Willie: Ha! Not bad, but not good\nenough. Come find me any time!"]);
    Screen.say("");
    await Overworld.act([{ who: ORRE("WILLIE"), moves: ["walk_up", "set_invisible"] }]);
    sfx("se_door");
    Overworld.removeObject(ORRE("WILLIE"));
  }
  // The bartender: a hot meal (the party rested) any time, and the bar's
  // stock once Willie's been battled.
  async function orreBartender() {
    await say(["Welcome to the Outskirt Stand!"]);
    if (await confirm("You look beat. How about a hot meal?\nOn the house, for a new face.")) {
      player.party.forEach(Party.heal);
      await sayWithJingle("mus_heal", "{PLAYER} and the Pokémon ate their fill.\nEveryone's rested!");
    }
    if ((player.flags.orre | 0) < 3) { await say(["Sorry, kid, the shop's shut till I've\nsorted out the morning's delivery."]); return; }
    await mart(Orre.SHOP);
  }
  // The jukebox: another song.
  const JUKEBOX = ["mus_game_corner", "mus_celadon", "mus_sevii_123", "mus_route24", "mus_cinnabar"];
  async function orreJukebox() {
    if (!(await confirm("It's a jukebox, lit up in every colour.\nPlay a song?"))) return;
    const f = player.flags;
    f.orreJukebox = ((f.orreJukebox | 0) + 1) % JUKEBOX.length;
    music(JUKEBOX[f.orreJukebox]);
    await say(["♪ A twangy tune starts up…"]);
  }

  // ---------- The Sevii Islands: Bill's trip ----------
  //
  // Beat Blaine and Bill's waiting outside his Gym (VAR_MAP_SCENE_CINNABAR_ISLAND
  // 1: flags.cinnabarScene): he'd like you to come with him to One Island. Say
  // no and he waits in Cinnabar's Pokémon Center. His pal's Seagallop takes
  // you to One Island, where he introduces you to Celio; you take a Meteorite
  // to Lostelle's dad on Two Island, find Lostelle in Three Island's Berry
  // Forest past the bikers, and Bill takes you home to Cinnabar.
  const CINNABAR_BILL = "LOCALID_CINNABAR_BILL", CINNABAR_SEAGALLOP = "LOCALID_CINNABAR_SEAGALLOP";
  // Bill and the boat at Cinnabar (CinnabarIsland_EventScript_BillScene):
  // coming out of the Gym he's right there and walks up; coming out of the
  // Pokémon Center he comes over from the east (FLAG_TEMP_2); anywhere else
  // he walks over to you.
  async function cinnabarBill() {
    const f = player.flags, C = (k) => T("CinnabarIsland_Text_" + k), Cm = (k) => M("CinnabarIsland_Movement_" + k);
    let at = Overworld.position();
    if (at.x === 20 && at.y === 4) { await Overworld.act([{ who: "player", moves: ["walk_down"] }]); at = Overworld.position(); }
    const gym = at.x === 20 && at.y === 5, center = at.x === 14 && at.y === 12;
    if (center) Overworld.addObject(CINNABAR_BILL, { x: 18, y: 12, facing: "up" });
    await Overworld.act([{ who: CINNABAR_BILL, moves: gym ? M("Common_Movement_WalkInPlaceFasterUp") : ["face_player"] }]);
    sfx("se_pin");
    await Overworld.act([{ who: CINNABAR_BILL, moves: ["emote_exclamation_mark", "delay_16", "delay_16", "delay_16"] }]);
    if (gym) await Overworld.act([{ who: CINNABAR_BILL, moves: Cm("BillApproachPlayer1") }]);
    else if (center) {
      await Overworld.act([{ who: CINNABAR_BILL, moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
      await Overworld.act([{ who: CINNABAR_BILL, moves: Cm("BillApproachPlayer2") }]);
      await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
    } else {
      // (Next to you, whichever side he can get to.)
      const spots = [[1, 0, "left"], [-1, 0, "right"], [0, 1, "up"], [0, -1, "down"]].map(([dx, dy, face]) => ({ x: at.x + dx, y: at.y + dy, face }));
      for (const s of spots) { const path = pathTo(CINNABAR_BILL, s); if (path) { await walkTo(CINNABAR_BILL, s, s.face); break; } }
      await Overworld.act([{ who: "player", moves: ["face_" + (() => { const b = Overworld.personPosition(CINNABAR_BILL) || at; return b.x > at.x ? "right" : b.x < at.x ? "left" : b.y > at.y ? "down" : "up"; })()] }]);
    }
    await say(C("HeyIfItIsntPlayer"));
    const q = C("ComeWithMeToOneIsland");
    await say(q.slice(0, -1));
    if (await confirm(fill(q[q.length - 1]))) {
      await say(C("AllRightLetsGo"));
      Screen.say("");
      await cinnabarSailWithBill(gym ? "gym" : center ? "shore" : "walk");
      return;
    }
    await say(C("IllBeWaitingInPokeCenter"));
    Screen.say("");
    if (gym) await Overworld.act([{ who: CINNABAR_BILL, moves: Cm("BillExitToPokeCenter").concat(["set_invisible"]) }]);
    else if (center) {
      await Overworld.act([{ who: "player", moves: Cm("PlayerWatchBillExit") }, { who: CINNABAR_BILL, moves: Cm("BillApproachDoor") }]);
      sfx("se_door");
      await Overworld.act([{ who: CINNABAR_BILL, moves: Cm("BillReEnterPokeCenter") }]);
    } else {
      await walkTo(CINNABAR_BILL, { x: 14, y: 12 }, "up");
      sfx("se_door");
      await Overworld.act([{ who: CINNABAR_BILL, moves: ["walk_up", "set_invisible"] }]);
    }
    Overworld.removeObject(CINNABAR_BILL);
    f.cinnabarScene = 2;
    f.cinnabarBillInCenter = true;   // (FLAG_HIDE_CINNABAR_POKECENTER_BILL cleared)
  }
  // CinnabarIsland_EventScript_SailToOneIsland: the Seagallop pulls in, and
  // you board it with Bill. `how`: "gym" (outside the Gym), "shore" (out of
  // the Pokémon Center, along the shore), or "walk" (from anywhere else).
  async function cinnabarSailWithBill(how) {
    const f = player.flags, C = (k) => T("CinnabarIsland_Text_" + k), Cm = (k) => M("CinnabarIsland_Movement_" + k);
    if (how === "shore") await Overworld.act([{ who: CINNABAR_BILL, moves: Cm("ApproachShore") }, { who: "player", moves: Cm("ApproachShore") }]);
    if (how === "walk") {
      await walkTo(CINNABAR_BILL, { x: 21, y: 8 }, "right");
      await walkTo("player", { x: 20, y: 8 }, "right");
    }
    const row = how === "shore" ? 12 : 8;
    Overworld.addObject(CINNABAR_SEAGALLOP, { x: 30, y: row, facing: "left" });
    await Overworld.act(how === "gym" ? [{ who: CINNABAR_BILL, moves: Cm("BillFaceBoat") }, { who: CINNABAR_SEAGALLOP, moves: Cm("BoatArrive") }]
      : [{ who: CINNABAR_SEAGALLOP, moves: Cm("BoatArrive") }]);
    await say(C("MyPalsBoatArrived"));
    Screen.say("");
    if (how === "gym") await Overworld.act([{ who: CINNABAR_BILL, moves: Cm("BillBoardBoat") }, { who: "player", moves: Cm("PlayerBoardBoat") }]);
    else if (how === "shore") await Overworld.act([{ who: CINNABAR_BILL, moves: Cm("BillBoardBoatFromShore") }, { who: "player", moves: Cm("PlayerBoardBoatFromShore") }]);
    else await Overworld.act([{ who: CINNABAR_BILL, moves: ["walk_right", "delay_4", "set_invisible"] }, { who: "player", moves: ["walk_right", "delay_4", "walk_right", "delay_4", "set_invisible"] }]);
    f.cinnabarScene = 2;
    delete f.cinnabarExitWithBill;
    delete f.cinnabarBillInCenter;
    Overworld.removeObject(CINNABAR_BILL);
    await sleep(667);
    f.oneHarborScene = 1;
    await setSail("CINNABAR_ISLAND", "ONE_ISLAND", false);
  }
  // Bill in Cinnabar's Pokémon Center (..._PokemonCenter_1F_EventScript_Bill):
  // ready? Then out you go together, along the shore to the boat.
  async function cinnabarCenterBill(person) {
    const f = player.flags, P = (k) => T("CinnabarIsland_PokemonCenter_1F_Text_" + k), Pm = (k) => M("CinnabarIsland_PokemonCenter_1F_Movement_" + k);
    const q = P("ReadyToSailToOneIsland");
    await say(q.slice(0, -1));
    if (!(await confirm(fill(q[q.length - 1])))) { await say(P("OhNotDoneYet")); return; }
    await say(P("LetsGo"));
    Screen.say("");
    music("mus_follow_me");
    await sleep(333);
    const facing = Overworld.position().facing, id = "LOCALID_CINNABAR_POKEMON_CENTER_BILL";
    // (By the way you face him: from below, from his left or right.)
    const moves = facing === "left" ? [Pm("BillExit"), Pm("PlayerExitWest")] : facing === "right" ? [Pm("BillExitEast"), Pm("PlayerExitEast")] : [Pm("BillExit"), Pm("PlayerExitSouth")];
    await Overworld.act([{ who: id, moves: moves[0] }, { who: "player", moves: moves[1] }]);
    Overworld.removeObject(id);
    delete f.cinnabarBillInCenter;
    f.cinnabarExitWithBill = true;   // VAR_MAP_SCENE_CINNABAR_ISLAND_2, 1
    sfx("se_exit");
    await Overworld.teleport({ map: "CinnabarIsland", x: 14, y: 12, facing: "down" });
    music("mus_follow_me");
    Overworld.addObject(CINNABAR_BILL, { x: 15, y: 12, facing: "left" });
    await sleep(333);
    await cinnabarSailWithBill("shore");
  }
  // Back from One Island (CinnabarIsland_EventScript_ReturnFromSeviiIslands):
  // Bill says goodbye and goes home; Lostelle's back home on Three Island.
  async function cinnabarBillReturns() {
    const f = player.flags;
    Overworld.addObject(CINNABAR_BILL, { x: 21, y: 8, facing: "up" });
    await say(T("CinnabarIsland_Text_IfYouHaveTriPassYouCanGoAgain"));
    Screen.say("");
    await Overworld.act([{ who: CINNABAR_BILL, moves: M("CinnabarIsland_Movement_BillExit").concat(["set_invisible"]) }]);
    Overworld.removeObject(CINNABAR_BILL);
    f.cinnabarScene = 4;
  }

  // Off the boat at One Island (OneIsland_Harbor's and OneIsland's ON_FRAME
  // scenes): up out of the harbor, and Bill takes you to the Pokémon Center.
  const ONE_BILL = "LOCALID_ONE_ISLAND_BILL";
  async function oneIslandArrival() {
    const f = player.flags;
    await Overworld.act([{ who: "player", moves: M("OneIsland_Harbor_Movement_PlayerExitHarbor") }]);
    f.oneHarborScene = 2;
    sfx("se_exit");
    await Overworld.teleport({ map: "OneIsland", x: 12, y: 18, facing: "up" });
    await billToCelio();
  }
  // OneIsland_EventScript_EnterOneIslandFirstTime: out of the harbor, Bill
  // walks you up to the Pokémon Center.
  async function billToCelio() {
    const f = player.flags, O = (k) => M("OneIsland_Movement_" + k);
    await Overworld.act([{ who: "player", moves: O("PlayerExitHarbor") }]);
    await say(T("OneIsland_Text_BillLetsGoSeeCelio"));
    Screen.say("");
    await Overworld.act([{ who: ONE_BILL, moves: O("BillWalkToPokeCenter") }, { who: "player", moves: O("PlayerWalkToPokeCenter") }]);
    sfx("se_door");
    await Overworld.act([{ who: ONE_BILL, moves: O("BillEnterPokeCenter") }, { who: "player", moves: O("PlayerEnterPokeCenter") }]);
    Overworld.removeObject(ONE_BILL);
    f.oneHarborScene = 3;
    await Overworld.teleport({ map: "OneIsland_PokemonCenter_1F", x: 9, y: 9, facing: "up" });
    player.flags.lastCenter = "OneIsland_PokemonCenter_1F";   // (setrespawn HEAL_LOCATION_ONE_ISLAND)
    await meetCelio();
  }

  // One Island's Pokémon Net Center (OneIsland_PokemonCenter_1F_EventScript_MeetCelioScene):
  // Bill introduces you to Celio, who can't get his PCs to link with Kanto's.
  // Bill stays to help, and gives you the Meteorite for Lostelle's dad on Two
  // Island; Celio gives you the Tri-Pass, and the Town Map's page of the
  // Sevii Islands. The PCs can't reach Bill's storage meanwhile.
  const PC_BILL = "LOCALID_ONE_ISLAND_POKEMON_CENTER_BILL", CELIO = "LOCALID_CELIO";
  async function meetCelio() {
    const f = player.flags, X = (k) => T("OneIsland_PokemonCenter_1F_Text_" + k), Xm = (k) => M("OneIsland_PokemonCenter_1F_Movement_" + k);
    const turn = (who, dir) => Overworld.act([{ who, moves: M("Common_Movement_WalkInPlaceFaster" + dir) }]);
    await Overworld.act([{ who: "player", moves: Xm("PlayerWalkToCelio") }, { who: PC_BILL, moves: Xm("BillWalkToCelio") }]);
    await say(X("BillHeyThereCelio"));
    await turn("player", "Right");
    sfx("se_pin");
    await Overworld.act([{ who: CELIO, moves: ["emote_exclamation_mark"] }]);
    await turn(CELIO, "Left");
    await sleep(800);
    await say(X("CelioCantBelieveYouCameOut"));
    await say(X("BillHowsYourResearchComing"));
    await Overworld.act([{ who: PC_BILL, moves: M("Common_Movement_WalkInPlaceFasterDown") }, { who: "player", moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    await say(X("ThisIsMyBuddyCelio"));
    await turn(PC_BILL, "Right");
    await turn("player", "Right");
    await say(X(f.gameClear ? "PlayerIsReigningPokemonChamp" : "PlayerIsRisingPokemonChamp"));
    await turn(CELIO, "Down");
    await say(X("CelioThatsReallyImpressive"));
    await say(X("BillBringMeUpToSpeed"));
    await turn(CELIO, "Left");
    await say(X("CelioPCsCantLinkWithYours"));
    Screen.say("");
    await turn(PC_BILL, "Up");
    await say(X("BillLetMeHelpYou"));
    await turn(PC_BILL, "Down");
    await turn("player", "Up");
    await say(X("CanYouDeliverThisMeteoritePlayer"));
    Player.addItem(player, "meteorite");
    await sayWithJingle("mus_obtain_key_item", X("AcceptedMeteoriteFromBill"));
    await turn(CELIO, "Down");
    await say(X("CelioPleaseTakeThis"));
    Player.addItem(player, "tri-pass");
    await sayWithJingle("mus_obtain_key_item", X("ObtainedTriPass"));
    await say(X("PassLetsYouTravelBetweenIslands"));
    // The Town Map's page for the islands (or the Town Map, if Daisy hasn't given you one).
    if (f.townMap) await sayWithJingle("mus_obtain_key_item", X("ReceivedExtraPageForTownMap"));
    else {
      Player.addItem(player, "town-map");
      f.townMap = true;
      await sayWithJingle("mus_obtain_key_item", X("ReceivedTownMap"));
    }
    f.seviiMap123 = true;
    await say(X("BillCatchYouLater"));
    Screen.say("");
    await turn(PC_BILL, "Up");
    await turn(CELIO, "Up");
    f.pcStorageDisabled = true;
    f.celioScene = 1;
  }

  // Celio (OneIsland_PokemonCenter_1F_EventScript_Celio): what he says as
  // the story goes on. With the National Pokédex (yours from the start here),
  // once Bill's taken you home (scene 3), he asks you to find a gem for his
  // Network Machine, and Team Rocket turns up on Mt. Ember; bring him the
  // Ruby and he trades your Tri-Pass for the Rainbow Pass and asks for the
  // Sapphire (the Dotted Hole on Six Island; Gideon takes it to the Rocket
  // Warehouse on Five Island, and gives it back once beaten).
  async function celio() {
    const f = player.flags, X = (k) => T("OneIsland_PokemonCenter_1F_Text_" + k), scene = f.celioScene || 0;
    if (scene >= 6 && !f.gotOldSeaMap) { await giveOldSeaMap(); return; }
    if (scene >= 7) {
      await say(X("CelioHearingRumorsAboutYou"));
      await say(X(["BillsFirstMonWasAbra", "BillsHometownInGoldenrod", "BillCantStomachMilk"][Math.floor(Math.random() * 3)]));
      return;
    }
    if (scene === 6) { await say(X("WishYouBestOfLuck")); return; }
    if (f.recoveredSapphire && Player.itemCount(player, "sapphire")) { await celioSapphire(); return; }
    if (scene === 5) { await say(X("PassLetYouGetToAllIslands")); return; }
    if (f.gotRuby && Player.itemCount(player, "ruby")) { await celioRuby(); return; }
    if (scene === 4) { await say(X("TryingToFindGem")); return; }
    // (FireRed asks once you have the National Pokédex, which comes after the
    // Hall of Fame; here you have it from the start, so: once you're Champion.
    // Until then only One, Two and Three Island can be reached: the Rainbow
    // Pass for the rest is his thanks for the Ruby.)
    if (Player.nationalDex(player) && player.flags.gameClear && scene >= 3) {
      await say(X("CelioCaughtMoreMonMaybeICanBeUseful"));
      await Overworld.act([{ who: CELIO, moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
      await say(X("YoullBeTradingFromTrainersFarAway"));
      await Overworld.act([{ who: CELIO, moves: ["face_player"] }]);
      await say(X("NeedsSpecialGemstone"));
      f.mtEmberScene = 1;
      f.celioScene = 4;
      applyPatches("OneIsland_PokemonCenter_1F");
      return;
    }
    if (scene === 3) { await say(X("CelioImModifyingMyNetworkMachine")); return; }
    await say(X("SorryForBeingPoorHost"));
    Screen.say("");
    await Overworld.act([{ who: CELIO, moves: ["face_up"] }]);
  }
  // The Ruby into the machine (..._EventScript_GiveCelioRuby), and one more
  // favour: the Rainbow Pass for your Tri-Pass, and the Town Map's pages for
  // Four to Seven Island.
  async function celioRuby() {
    const f = player.flags, X = (k) => T("OneIsland_PokemonCenter_1F_Text_" + k);
    await say(X("OhThats"));
    await sayWithJingle("mus_obtain_tmhm", X("HandedRubyToCelio"));
    Screen.say("");
    await Overworld.act([{ who: CELIO, moves: M("OneIsland_PokemonCenter_1F_Movement_CelioPutGemInMachine") }]);
    sfx("se_select");
    f.celioRubyIn = true;
    applyPatches("OneIsland_PokemonCenter_1F");
    await sleep(500);
    await Overworld.act([{ who: CELIO, moves: ["face_player"] }]);
    const q = X("MayIAskOneMoreFavor");
    await say(q.slice(0, -1));
    if (!(await confirm(fill(q[q.length - 1])))) {
      for (;;) {
        const p = X("PleaseINeedYourHelp");
        await say(p.slice(0, -1));
        if (await confirm(fill(p[p.length - 1]))) break;
      }
    }
    await say(X("AnotherGemstoneInSeviiIslands"));
    Player.removeItem(player, "ruby");
    Player.removeItem(player, "tri-pass");
    f.celioScene = 5;
    Player.addItem(player, "rainbow-pass");
    f.seviiMap4567 = true;
    await sayWithJingle("mus_obtain_key_item", X("ReturnedTriPassForRainbowPass"));
    await sayWithJingle("mus_obtain_key_item", X("ObtainedExtraMapPage"));
    await say(X("PassLetYouGetToAllIslands"));
  }
  // The Sapphire (..._EventScript_GiveCelioSapphire): the hook for the rest
  // of the islands. Bring it back (flags.recoveredSapphire, and the item) and
  // the Network Machine links with Hoenn: FLAG_SYS_CAN_LINK_WITH_RS
  // (flags.canLinkWithRS, the League's rematch teams).
  async function celioSapphire() {
    const f = player.flags, X = (k) => T("OneIsland_PokemonCenter_1F_Text_" + k);
    await sayWithJingle("mus_obtain_tmhm", X("HandedSapphireToCelio"));
    Player.removeItem(player, "sapphire");
    await say(X("ThankYouGiveMeTime"));
    Screen.say("");
    await Overworld.act([{ who: CELIO, moves: M("OneIsland_PokemonCenter_1F_Movement_CelioPutGemInMachine") }]);
    sfx("se_select");
    f.celioSapphireIn = true;
    applyPatches("OneIsland_PokemonCenter_1F");
    await say(X("OkayThisIsGood"));
    Screen.say("");
    await sleep(1000);
    await Overworld.act([{ who: CELIO, moves: M("OneIsland_PokemonCenter_1F_Movement_CelioCheckMachine") }]);
    await sleep(500);
    await Overworld.act([{ who: CELIO, moves: M("OneIsland_PokemonCenter_1F_Movement_CelioCheckMachine") }]);
    await sleep(667);
    sfx("se_pc_on");
    f.canLinkWithRS = true;
    applyPatches("OneIsland_PokemonCenter_1F");
    await say(X("LinkedUpWithLanette"));
    await Overworld.act([{ who: CELIO, moves: ["face_player"] }]);
    await say(X("ManagedToLinkWithHoennThankYou"));
    f.celioScene = 6;
    await giveOldSeaMap();
  }
  // This game's: with Hoenn linked up, Celio gives you Bill's reward for
  // your help, Emerald's Old Sea Map (its island: Faraway Island, by Seagallop
  // from Vermilion). (Saves that linked up before this get it next time they talk.)
  async function giveOldSeaMap() {
    const f = player.flags;
    if (f.gotOldSeaMap) return;
    await say(["Oh, and {PLAYER}, Bill wanted me\nto give you this.", "It's a reward for all your help."]);
    Player.addItem(player, "old-sea-map");
    f.gotOldSeaMap = true;
    await sayWithJingle("mus_obtain_key_item", "{PLAYER} received the " + Bag.name("old-sea-map") + "!");
    await say(["It's an old sea chart. It shows an\nisland nobody's been to in a very\nlong time.",
      "The Seagallop sailors in Vermilion\nmight know how to get there."]);
  }
  // Bill, helping Celio (..._EventScript_Bill).
  async function oneIslandCenterBill() {
    const X = (k) => T("OneIsland_PokemonCenter_1F_Text_" + k);
    if (player.flags.seviiDetourDone) {
      await Overworld.act([{ who: PC_BILL, moves: ["face_player"] }]);
      await say(X("GotPCWorkingStrollAWhileMore"));
    } else await say(X("HmmHowAboutLikeThis"));
  }
  // Lostelle's back and the Meteorite delivered: walking in, Bill's done and
  // takes you back to Kanto (..._EventScript_LeaveOneIslandScene). `row`: 1-4,
  // which of the triggers (top to bottom).
  async function leaveOneIsland(row) {
    const f = player.flags, X = (k) => T("OneIsland_PokemonCenter_1F_Text_" + k), Xm = (k) => M("OneIsland_PokemonCenter_1F_Movement_" + k);
    const turn = (who, dir) => Overworld.act([{ who, moves: M("Common_Movement_WalkInPlaceFaster" + dir) }]);
    sfx("se_pin");
    await Overworld.act([{ who: PC_BILL, moves: ["emote_exclamation_mark"] }]);
    await say(X("BillOhHeyPlayer"));
    Screen.say("");
    await Overworld.act([{ who: "player", moves: Xm(["PlayerWalkToBillTop", "PlayerWalkToBillMidTop", "PlayerWalkToBillMidBottom", "PlayerWalkToBillBottom"][row - 1]) }]);
    await sleep(167);
    await say(X("BillWeGotItDone"));
    await turn("player", "Down");
    await say(X("CelioJobWentQuick"));
    await turn(PC_BILL, "Down");
    await turn(CELIO, "Up");
    await say(X("BillYouveLearnedALot"));
    await say(X("CelioOhReallyEhehe"));
    Screen.say("");
    await turn(PC_BILL, "Left");
    await sleep(167);
    await turn("player", "Right");
    await sleep(250);
    await say(X("BillWeShouldHeadBackToKanto"));
    Screen.say("");
    await turn(PC_BILL, "Down");
    await sleep(250);
    await turn(CELIO, "Left");
    await turn("player", "Down");
    await say(X("CelioPromiseIllShowYouAroundSometime"));
    Screen.say("");
    await sleep(417);
    await Overworld.act([{ who: "player", moves: Xm("PlayerExit") }, { who: PC_BILL, moves: Xm("BillExit") }]);
    sfx("se_exit");
    f.celioScene = 3;
    f.cinnabarScene = 3;
    await setSail("ONE_ISLAND", "CINNABAR_ISLAND", false);
  }

  // The Network Machine (..._EventScript_NetworkMachine).
  async function networkMachine() {
    const f = player.flags, X = (k) => T("OneIsland_PokemonCenter_1F_Text_" + k);
    await say(X(f.canLinkWithRS ? "MachineLinkedWithKantoAndHoenn" : f.seviiDetourDone ? "MachineLinkedWithKanto" : "MachineUnderAdjustment"));
  }

  // ---------- Two Island ----------

  // The shop (TwoIsland_EventScript_SetShopState): more for sale as Lostelle's
  // found, you become Champion, and Kanto links with Hoenn.
  function twoIslandShop() {
    const f = player.flags;
    if (f.canLinkWithRS) return !f.twoIslandShopIntro ? 1 : !f.twoIslandShop1 ? 2 : !f.twoIslandShop2 ? 3 : 4;
    if (f.gameClear) return !f.twoIslandShopIntro || !f.rescuedLostelle ? 1 : !f.twoIslandShop1 ? 2 : 3;
    if (f.rescuedLostelle) return !f.twoIslandShopIntro ? 1 : 2;
    return 1;
  }
  const TWO_ISLAND_STOCK = {
    1: ["great-ball", "fresh-water"],
    2: ["ultra-ball", "great-ball", "soda-pop", "fresh-water"],
    3: ["ultra-ball", "great-ball", "lemonade", "soda-pop", "fresh-water", "moomoo-milk"],
    4: ["ultra-ball", "repeat-ball", "timer-ball", "lemonade", "soda-pop", "fresh-water", "moomoo-milk", "lava-cookie"]
  };
  async function twoIslandClerk() {
    const f = player.flags, state = f.twoIslandShopState || twoIslandShop();
    const intro = { 1: ["twoIslandShopIntro", "WelcomeToShopMerchandiseLimited"], 2: ["twoIslandShop1", "AddedMerchandiseForLostelle"],
      3: ["twoIslandShop2", "HopeYouGiveItYourBest"], 4: ["twoIslandShop3", "BringingItemsFromDistantLands"] }[state];
    if (!f[intro[0]]) {
      f[intro[0]] = true;
      await say(T("TwoIsland_Text_" + intro[1]));
      await mart(TWO_ISLAND_STOCK[state]);
      return;
    }
    await mart(TWO_ISLAND_STOCK[state]);
  }

  // The Joyful Game Corner: Lostelle's dad, the biker, and Lostelle home.
  const GC_DADDY = "LOCALID_JOYFUL_GAME_CORNER_DADDY", GC_BIKER = "LOCALID_JOYFUL_GAME_CORNER_BIKER", GC_LOSTELLE = "LOCALID_JOYFUL_GAME_CORNER_LOSTELLE";
  const bigGuy = () => [Player.LOOKS[player.look] && Player.LOOKS[player.look].girl ? "big girl" : "big guy"];
  async function gameCornerHelp() {
    const f = player.flags, J = (k) => T("TwoIsland_JoyfulGameCorner_Text_" + k), Jm = (k) => M("TwoIsland_JoyfulGameCorner_Movement_" + k);
    await Overworld.act([{ who: GC_DADDY, moves: Jm("DaddyPacing") }]);
    await say(J("WhereHasLostelleGottenTo"));
    Screen.say("");
    await Overworld.act([{ who: GC_DADDY, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    sfx("se_pin");
    await Overworld.act([{ who: GC_DADDY, moves: ["emote_exclamation_mark", "delay_16", "delay_16", "delay_16"] }]);
    await Overworld.act([{ who: GC_DADDY, moves: Jm("DaddyApproachPlayer") }]);
    await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
    await say(J("PleaseHelpFindLostelle"));
    Screen.say("");
    sfx("se_rs_door");
    await sleep(300);
    await Overworld.act([{ who: "player", moves: Jm("PlayerFaceDaddy") }]);
    music("mus_encounter_boy");
    Overworld.addObject(GC_BIKER, { x: 5, y: 8, facing: "up" });
    await Overworld.act([{ who: GC_BIKER, moves: Jm("BikerLookAround") }]);
    await say(J("IsThisOnlyThreeIsland"));
    await Overworld.act([{ who: GC_BIKER, moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
    await say(J("ThisIsTwoIslandMoveIt"));
    await say(J("TheseIslandsAreConfusing"));
    Screen.say("");
    await Overworld.act([{ who: GC_BIKER, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    sfx("se_exit");
    Overworld.removeObject(GC_BIKER);
    music((window.WORLD_MAPS.TwoIsland_JoyfulGameCorner || {}).music);
    await sleep(1000);
    await say(J("PunkScuffedUpMyFloor"));
    f.threeIslandScene = 2;
    f.gameCornerScene = 1;
  }
  async function gameCornerLostelleHome() {
    const f = player.flags, J = (k) => T("TwoIsland_JoyfulGameCorner_Text_" + k);
    await say(J("YouRescuedLostelle"));
    await say(J("LostelleItsOkayDaddy"), bigGuy());
    Screen.say("");
    await Overworld.act([{ who: GC_LOSTELLE, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    f.gameCornerScene = 3;
  }
  async function lostellesDaddy() {
    const f = player.flags, J = (k) => T("TwoIsland_JoyfulGameCorner_Text_" + k);
    if ((f.gameCornerScene || 0) >= 4) {
      // (The minigames are played over FireRed's wireless link.)
      await say(T("Text_WelcomeCanYouWait"));
      await say(T("Text_AdapterNotConnectedMinigame"));
      return;
    }
    if (f.gotMoonStoneFromDaddy) { await say(J("IllGetGameCornerRunning")); return; }
    if (f.gameCornerScene !== 3) { await say(J("PleaseGoToThreeIsland")); return; }
    if (!f.noRoomForMoonStone) {
      await say(J("ThisIsForMe"));
      f.celioScene = Math.max(f.celioScene || 0, 2);
      Player.removeItem(player, "meteorite");
      await sayWithJingle("mus_obtain_tmhm", J("HandedMeteoriteToLostellesDaddy"));
      await say(J("OhThisIsFromBill"));
    }
    Player.addItem(player, "moon-stone");
    f.gotMoonStoneFromDaddy = true;
    delete f.noRoomForMoonStone;
    await sayWithJingle("mus_obtain_item", J("ReceivedMoonStoneFromLostellesDaddy"));
  }

  // Cape Brink's tutor (TwoIsland_CapeBrink_House_EventScript_StarterTutor):
  // the ultimate move of a fully evolved starter you lead with that's as fond
  // of you as can be — Frenzy Plant, Blast Burn or Hydro Cannon. In FireRed
  // each once; here the first time free, then again and again for TUTOR_PRICE.
  async function capeBrinkTutor() {
    const f = player.flags, lead = player.party.find((r) => !r.egg);
    if (capeBrinkJustTaught) { await say(T("Text_MakeBestUseOfMove")); return; }
    const m = Sevii.capeBrinkMove(lead);
    if (!m && f.capeBrinkDone) { await say(T("Text_FeelRejuvenated")); return; }
    const species = lead ? Party.speciesName(lead.species) : "";
    await say(T("Text_UltimateMoveThatMon"), [species]);
    if (!m) { await say(T("Text_JustMistaken")); return; }
    const vars = [species, m.move], again = !!f[m.flag];
    await Overworld.act([{ who: "LOCALID_CAPE_BRINK_TUTOR", moves: ["jump_in_place_" + World.OPPOSITE[Overworld.position().facing]] }]);
    const q = T("Text_AllowMeToTeachMonUltimateMove");
    await say(q.slice(0, -1), vars);
    if (!(await confirm(fill(q[q.length - 1], vars)))) { await say(T("Text_YouRejectIt")); return; }
    if (Party.knowsMove(lead, m.move)) { await say(Party.displayName(lead) + " already knows " + m.move + "."); return; }
    if (again) {
      if (!(await confirm("It'll cost " + money(TUTOR_PRICE) + ". Is that okay?\n(You have " + money(player.money) + ".)"))) { await say(T("Text_YouRejectIt")); return; }
      if (player.money < TUTOR_PRICE) { await say("You don't have enough money."); return; }
    }
    await say(T("Text_LetMeConferUltimateMove"), vars);
    Screen.say("");
    await Overworld.fadeToBlack();
    await learnMove(lead, m.move);
    show("world");
    await Overworld.fadeFromBlack();
    if (!Party.knowsMove(lead, m.move)) { await say(T("Text_YouRejectIt")); return; }
    if (again) {
      Player.addMoney(player, -TUTOR_PRICE);
      await say(player.name + " paid " + money(TUTOR_PRICE) + ".");
      await say(T("Text_TaughtMove"));
      capeBrinkJustTaught = true;
      return;
    }
    f[m.flag] = true;
    if (Sevii.capeBrinkDone(f)) { await say(T("Text_PassedOnEverythingIKnow")); f.capeBrinkDone = true; return; }
    await say(T("Text_TaughtMove"));
    capeBrinkJustTaught = true;   // (FLAG_TEMP_2, until you leave)
  }
  let capeBrinkJustTaught = false;

  // The Move Maniac (TwoIsland_House_EventScript_MoveManiac): a move a
  // Pokémon has forgotten (or could have learned by now), for two Tiny
  // Mushrooms or a Big Mushroom.
  let moveManiacMet = false;
  async function moveManiac() {
    const H = (k) => T("TwoIsland_House_Text_" + k);
    if (!moveManiacMet) { await say(H("TeachMonMoveForMushroom")); moveManiacMet = true; }
    const big = Player.itemCount(player, "big-mushroom") >= 1, tiny = Player.itemCount(player, "tiny-mushroom") >= 2;
    if (!big && !tiny) { await say(H("NeedMushroomOrTwoToLearnMove")); return; }
    const q = H("WantMeToTeachMove");
    await say(q.slice(0, -1));
    if (!(await confirm(fill(q[q.length - 1])))) { await say(H("NeedMushroomOrTwoToLearnMove")); return; }
    for (;;) {
      await say(H("TutorWhichMon"));
      const r = await choosePartyFor("Choose a POKéMON.");
      show("world");
      if (!r) { await say(H("NeedMushroomOrTwoToLearnMove")); return; }
      if (r.egg) { await say(H("CantTeachAnEgg")); continue; }
      const moves = relearnable(r);
      if (!moves.length) { await say(H("NoMoveICanTeachThatMon")); continue; }
      await say(H("TeachWhichMove"));
      Screen.say("");
      clearMenu();
      const move = await MoveRelearner.open({
        name: Party.displayName(r), moves, known: r.moves.map((m) => m.name), frame: GameOptions.get().frame,
        forget: (m) => chooseMoveToForget(r, m),
        teach: (m, slot) => Party.teachMove(r, m, slot == null ? undefined : slot)
      });
      show("world");
      if (!move || !Party.knowsMove(r, move)) continue;
      let useBig = big && !tiny;
      if (big && tiny) {
        // (FireRed's MULTICHOICE_MUSHROOMS ignores B.)
        let i;
        do i = await multichoice(H("IllNeedMushroomOrTwo")[0], 0, 0, ["Tinymushroom", "Big Mushroom"]); while (i < 0);
        Screen.say("");
        useBig = i === 1;
      }
      if (useBig) { Player.removeItem(player, "big-mushroom"); await say(H("HandedOverOneBigMushroom")); }
      else { Player.removeItem(player, "tiny-mushroom", 2); await say(H("HandedOverTwoTinyMushrooms")); }
      await say(H("NeedMushroomOrTwoToLearnMove"));
      return;
    }
  }

  // ---------- Three Island ----------
  //
  // The bikers (ThreeIsland_EventScript_BikerArgumentScene and the rest): two
  // islanders face down a gang of bikers in the road north. Once a biker's
  // been to Two Island (the Joyful Game Corner), their boss Paxton turns up;
  // walk past and the gang takes you on, three bikers and then Paxton, and
  // they leave the island.
  const TB = { anti1: "LOCALID_THREE_ISLAND_ANTIBIKER1", anti2: "LOCALID_THREE_ISLAND_ANTIBIKER2", paxton: "LOCALID_PAXTON",
    b1: "LOCALID_THREE_ISLAND_BIKER1", b2: "LOCALID_THREE_ISLAND_BIKER2", b3: "LOCALID_THREE_ISLAND_BIKER3",
    b4: "LOCALID_THREE_ISLAND_BIKER4", b5: "LOCALID_THREE_ISLAND_BIKER5", b6: "LOCALID_THREE_ISLAND_BIKER6" };
  // `who`: 0 the first islander, 1 the second, 2 a biker (VAR_TEMP_1).
  async function bikerArgument(who) {
    const I = (k) => T("ThreeIsland_Text_" + k), Im = (k) => M("ThreeIsland_Movement_" + k);
    const face = (dir) => Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFaster" + dir) }]);
    const atRight = Overworld.position().x >= 9;
    if (who !== 0) await face("Left");
    await Overworld.act([{ who: TB.anti1, moves: Im("SpeakRight") }]);
    await say(I("GoBackToKanto"));
    await face(who === 2 ? (atRight ? "Up" : "Right") : "Right");
    await Overworld.act([{ who: TB.b1, moves: Im("SpeakLeft") }]);
    await say(I("BossIsOnHisWay"));
    await face(who === 2 ? (atRight ? "Left" : "Up") : "Up");
    await Overworld.act([{ who: TB.anti2, moves: Im("SpeakRight") }]);
    await say(I("GetOffIslandNow"));
    await face(who === 2 ? (atRight ? "Up" : "Right") : "Right");
    await Overworld.act([{ who: TB.b3, moves: Im("SpeakLeft") }]);
    await say(I("WhosGonnaMakeMe"));
  }
  async function antiBiker(n) {
    const f = player.flags, I = (k) => T("ThreeIsland_Text_" + k);
    if (n === 1) {
      if (f.gotFullRestoreFromDefender) { await Overworld.act([{ who: TB.anti1, moves: ["face_player"] }]); await say(I("YouveGotImpressiveMons")); return; }
      if (f.threeIslandScene === 4) {
        await Overworld.act([{ who: TB.anti1, moves: ["face_player"] }]);
        await say(I("ThankYouOhYourMonGotHurt"));
        Player.addItem(player, "full-restore");
        f.gotFullRestoreFromDefender = true;
        await sayWithJingle("mus_obtain_item", I("GivenFullRestore"));
        await say(I("YouveGotImpressiveMons"));
        return;
      }
      await bikerArgument(0);
      return;
    }
    if (f.threeIslandScene === 4) { await Overworld.act([{ who: TB.anti2, moves: ["face_player"] }]); await say(I("LostelleWentOffTowardsBondBridge")); return; }
    await bikerArgument(1);
  }
  // Paxton arrives (ThreeIsland_EventScript_BikerBossIntroTrigger).
  async function bikerBossIntro() {
    const I = (k) => T("ThreeIsland_Text_" + k), Im = (k) => M("ThreeIsland_Movement_" + k);
    const speak = async (who, dir, text) => { await Overworld.act([{ who, moves: Im("Speak" + dir) }]); await say(I(text)); };
    await speak(TB.anti1, "Right", "AreYouBossGoBackToKanto");
    await speak(TB.paxton, "Left", "JustGotHerePal");
    await speak(TB.anti1, "Right", "FollowersRaisingHavoc");
    await speak(TB.paxton, "Left", "OughtToBeThankingUs");
    await speak(TB.anti1, "Right", "YouCowardsToughInPack");
    player.flags.threeIslandScene = 3;
  }
  // The gang takes you on (ThreeIsland_EventScript_BattleBikersScene). `col`:
  // 0-4, which trigger (left to right).
  async function bikerBattles(col) {
    const f = player.flags, I = (k) => T("ThreeIsland_Text_" + k), Im = (k) => M("ThreeIsland_Movement_" + k);
    const fight = async (id, who, intro, defeat, post, after) => {
      music("mus_encounter_boy");
      if (intro) await say(I(intro));
      if (!canBattle()) return false;
      const data = window.WORLD_TRAINERS[id];
      const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(id), pic: data.pic },
        defeatText: I(defeat), trainerId: id, prizeClass: data.className });
      if (outcome !== "won") return false;
      show("world");
      await Overworld.resume();
      if (after) await Overworld.act(after);
      await say(I(post));
      Screen.say("");
      return true;
    };
    await Overworld.act([{ who: TB.b1, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    sfx("se_pin");
    await Overworld.act([{ who: TB.b1, moves: ["emote_exclamation_mark", "delay_16", "delay_16", "delay_16"] }]);
    await Overworld.act([{ who: TB.b1, moves: Im("BikerApproach") }]);
    music("mus_encounter_boy");
    const q = I("WannaMakeSomethingOfYourStaring");
    await say(q.slice(0, -1));
    if (!(await confirm(fill(q[q.length - 1])))) {
      await say(I("ThatsSmart"));
      Screen.say("");
      await Overworld.act([{ who: "player", moves: Im("PlayerLeaveBikers") }]);
      await Overworld.act([{ who: TB.b1, moves: Im("Biker1ReturnToPack") }]);
      music((window.WORLD_MAPS.ThreeIsland || {}).music);
      return;
    }
    if (!(await fight("TRAINER_BIKER_GOON", TB.b1, "Biker1Intro", "Biker1Defeat", "Biker1PostBattle", [{ who: TB.b1, moves: Im("BikerSpeak") }]))) return;
    await Overworld.act([{ who: TB.b2, moves: Im("BikerApproach") }]);
    if (!(await fight("TRAINER_BIKER_GOON_2", TB.b2, "Biker2Intro", "Biker2Defeat", "Biker2PostBattle", [{ who: TB.b2, moves: Im("BikerSpeak") }]))) return;
    await Overworld.act([{ who: TB.b3, moves: Im("BikerApproach") }]);
    if (!(await fight("TRAINER_BIKER_GOON_3", TB.b3, "Biker3Intro", "Biker3Defeat", "Biker3PostBattle",
      [{ who: TB.b3, moves: M("Common_Movement_WalkInPlaceFasterLeft") }, { who: TB.b4, moves: M("Common_Movement_WalkInPlaceFasterDown") },
        { who: TB.b5, moves: M("Common_Movement_WalkInPlaceFasterDown") }]))) return;
    await sleep(750);
    const approach = ["Left", "MidLeft", "Mid", "MidRight", "Right"][col];
    const tracks = [{ who: TB.b3, moves: M("Common_Movement_WalkInPlaceFasterDown") }, { who: TB.paxton, moves: Im("PaxtonApproach" + approach) }];
    if (col >= 2) tracks.push({ who: "player", moves: Im("PlayerFacePaxton") });
    await Overworld.act(tracks);
    if (!(await fight("TRAINER_CUE_BALL_PAXTON", TB.paxton, "PaxtonIntro", "PaxtonDefeat", "PaxtonPostBattle"))) return;
    await Overworld.fadeToBlack();
    for (const id of [TB.paxton, TB.b1, TB.b2, TB.b3, TB.b4, TB.b5, TB.b6]) Overworld.removeObject(id);
    f.threeIslandScene = 4;
    Overworld.refreshPeople();
    await Overworld.fadeFromBlack();
    music((window.WORLD_MAPS.ThreeIsland || {}).music);
  }

  // Lostelle in Berry Forest (ThreeIsland_BerryForest_EventScript_Lostelle):
  // a wild Hypno (Lv. 30) comes for her; then she gives you an Iapapa Berry
  // and you take her home to the Joyful Game Corner.
  async function berryForestLostelle(person) {
    const f = player.flags, B = (k) => T("ThreeIsland_BerryForest_Text_" + k), L = "LOCALID_BERRY_FOREST_LOSTELLE";
    await say(B("HelpScaryPokemon"));
    sfx("se_pin");
    await Overworld.act([{ who: L, moves: ["emote_exclamation_mark"] }]);
    await Overworld.act([{ who: L, moves: M("ThreeIsland_BerryForest_Movement_LostelleLookAround") }]);
    await say(B("HereItComesAgain"));
    if (!canBattle()) return;
    cry("Hypno");
    await sleep(900);
    const outcome = await battle("wild", { foe: { name: "Wild", team: [Party.create("Hypno", 30)] } });
    if (outcome === "lost") return;
    show("world");
    await Overworld.resume();
    await Overworld.act([{ who: L, moves: ["face_player"] }]);
    await say(B("ThankYouHaveThis"));
    Player.addItem(player, "iapapa-berry");
    await sayWithJingle("mus_obtain_item", "{PLAYER} received an " + Bag.name("iapapa-berry") + "!");
    await say(B("LetsGoHome"), bigGuy());
    Screen.say("");
    f.rescuedLostelle = true;
    f.gameCornerScene = 2;
    sfx("se_exit");
    await Overworld.teleport({ map: "TwoIsland_JoyfulGameCorner", x: 6, y: 6, facing: "up" });
    await gameCornerLostelleHome();
  }

  // ---------- Mt. Ember ----------
  //
  // Team Rocket's two grunts outside the Ruby Path: "We'll try digging here"
  // until Celio asks for the Ruby; then you overhear the Rocket Warehouse's
  // passwords ("Goldeen need log", "Yes, nah, Chansey") and they battle you,
  // and the way in opens. Moltres waits at the summit.
  const EMBER_GRUNTS = ["TRAINER_TEAM_ROCKET_GRUNT_43", "TRAINER_TEAM_ROCKET_GRUNT_44"];
  async function emberPassword() {
    const E = (k) => T("MtEmber_Exterior_Text_" + k);
    await say(E("PunchedThroughAtLast"));
    const q = E("WhatsPasswordAgain");
    await say(q.slice(0, -1));
    sfx("se_pin");
    await Overworld.act([{ who: "LOCALID_MT_EMBER_GRUNT2", moves: ["emote_question_mark"] }]);
    await say(q.slice(-1));
    await say(E("FirstPasswordGoldeen"));
    await Overworld.act([{ who: "LOCALID_MT_EMBER_GRUNT1", moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    sfx("se_pin");
    await Overworld.act([{ who: "LOCALID_MT_EMBER_GRUNT1", moves: ["emote_exclamation_mark", "delay_16", "delay_16", "delay_16"] }]);
    await Overworld.act([{ who: "LOCALID_MT_EMBER_GRUNT2", moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    await say(E("SnoopsBeenListeningIn"));
    player.flags.mtEmberScene = 2;
  }
  async function emberGrunt(n) {
    const f = player.flags, E = (k) => T("MtEmber_Exterior_Text_" + k), id = EMBER_GRUNTS[n - 1], who = "LOCALID_MT_EMBER_GRUNT" + n;
    if (f[id]) { await say(E("Grunt" + n + "PostBattle")); return; }
    if (f.celioScene !== 4) {
      if (n === 1) { await say(E("WellTryDiggingHere")); return; }
      await say(E("YoureInTheWayGetLost"));
      Screen.say("");
      await Overworld.act([{ who, moves: [f.mtEmberScene === 2 ? "face_down" : "face_left"] }]);
      return;
    }
    await Overworld.act([{ who, moves: ["face_player"] }]);
    music("mus_encounter_rocket");
    await say(E("Grunt" + n + "Intro"));
    if (!canBattle()) return;
    const data = window.WORLD_TRAINERS[id];
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(id), pic: data.pic },
      defeatText: E("Grunt" + n + "Defeat"), trainerId: id, prizeClass: data.className });
    if (outcome !== "won") return;
    show("world");
    await Overworld.resume();
    await say(E("Grunt" + n + "PostBattle"));
    if (!EMBER_GRUNTS.every((t) => f[t])) return;
    await say(E("WellRegroupDontStepInsideThere"));
    Screen.say("");
    await Overworld.fadeToBlack();
    Overworld.removeObject("LOCALID_MT_EMBER_GRUNT1");
    Overworld.removeObject("LOCALID_MT_EMBER_GRUNT2");
    await Overworld.fadeFromBlack();
  }

  // The Ember Spa's hot spring (OneIsland_KindleRoad_EmberSpa_EventScript_SpaHeal):
  // stepping in heals your Pokémon, once each visit.
  async function emberSpa() {
    await Overworld.fadeToBlack();
    player.party.forEach(Party.heal);
    await Overworld.fadeFromBlack();
    await say(T("OneIsland_KindleRoad_EmberSpa_Text_WaterExquisiteFullyRefreshed"));
    tempFlags.add("OneIsland_KindleRoad_EmberSpa:spa");
  }

  // The islands' ON_TRANSITION scripts, arriving on map `m`.
  function seviiTransition(m) {
    const f = player.flags;
    // (Saves from before the islands were built, Blaine already beaten: Bill's waiting.)
    if (m === "CinnabarIsland" && f.TRAINER_LEADER_BLAINE && !f.cinnabarScene) f.cinnabarScene = 1;
    // Three Isle Port: the trip's done, and the PCs work again
    // (ThreeIsland_Port_OnTransition: FLAG_SEVII_DETOUR_FINISHED).
    if (m === "ThreeIsland_Port") { f.seviiDetourDone = true; delete f.pcStorageDisabled; }
    // Two Island's shop (TwoIsland_EventScript_SetShopState).
    if (m === "TwoIsland") { f.twoIslandShopState = twoIslandShop(); f.twoIslandShopMax = Math.max(f.twoIslandShopMax || 1, f.twoIslandShopState); }
    // Lostelle's dad back at the counter, the games on (SetLostelleReturnedPos).
    if (m === "TwoIsland_JoyfulGameCorner" && f.gotMoonStoneFromDaddy) f.gameCornerScene = 4;
    // Celio, his work done (OneIsland_PokemonCenter_1F_EventScript_SetCelioQuestDone).
    if (m === "OneIsland_PokemonCenter_1F" && f.celioScene === 6) f.celioScene = 7;
    // An Escape Rope in Berry Forest takes you to Bond Bridge (setescapewarp).
    if (m === "ThreeIsland_BerryForest") f.escapeWarp = { map: "ThreeIsland_BondBridge", x: 12, y: 6 };
    // ... in Pattern Bush, out to Green Path by the way you came in
    // (SixIsland_PatternBush_OnTransition: the east half's exit or the west's).
    if (m === "SixIsland_PatternBush") {
      const at = Overworld.position();
      f.escapeWarp = at && at.map === m && at.x <= 49 ? { map: "SixIsland_GreenPath", x: 45, y: 10 } : { map: "SixIsland_GreenPath", x: 64, y: 10 };
    }
    // Outside Trainer Tower the challenge is over (SevenIsland_TrainerTower_OnTransition).
    if (m === "SevenIsland_TrainerTower") f.towerScene = 0;
    if (m === "Route40_BattleFrontierGatehouse") f.battleTowerScene = 0;   // (the Battle Tower's counter asks again)
  }
  // Walking about Cinnabar while Bill's waiting there: he comes over.
  function cinnabarBillStep() {
    return player.location.map === "CinnabarIsland" && player.flags.cinnabarScene === 1
      ? { type: "trigger", trigger: { script: "enter:CinnabarIsland" }, map: "CinnabarIsland" } : null;
  }

  // ---------- The Sevii Islands: Four Island ----------
  //
  // Gary's here the first time you come (FourIsland_EventScript_RivalScene):
  // he's got his Pokémon Egg from the Day-Care and is off again.
  async function fourIslandRival() {
    const R = "LOCALID_FOUR_ISLAND_RIVAL", Fm = (k) => M("FourIsland_Movement_" + k);
    await Overworld.act([{ who: R, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    music("mus_encounter_rival");
    await Overworld.act([{ who: R, moves: ["emote_exclamation_mark", "delay_16", "delay_16", "delay_16"] }]);
    await sleep(417);
    await Overworld.act([{ who: R, moves: Fm("RivalApproach") }]);
    await say(T("FourIsland_Text_RivalAlreadyGotEggBeSmellingYa"));
    Screen.say("");
    await Overworld.act([{ who: "player", moves: Fm("PlayerWatchRivalExit") }, { who: R, moves: Fm("RivalExit") }]);
    music((window.WORLD_MAPS.FourIsland || {}).music);
    sfx("se_exit");
    await sleep(583);
    Overworld.removeObject(R);
    player.flags.fourIslandScene = 1;
  }

  // Four Island's Day-Care (FourIsland_PokemonDayCare_EventScript_DaycareWoman
  // and FourIsland_EventScript_DaycareMan): FireRed's two-Pokémon Day-Care.
  // The lady takes up to two Pokémon to raise (game/daycare.js: a point of
  // Exp. a step, ¥100 and ¥100 a level to take one back); her husband outside
  // says how they're doing, and has the Eggs the two of them find
  // (game/breeding.js).
  const DC = (k) => T("DayCare_Text_" + k);
  async function yesNo(pages, vars) {
    await say(pages.slice(0, -1), vars);
    return confirm(fill(pages[pages.length - 1], vars));
  }
  // (Route 34's in Johto is the same Day-Care, its own: player.flags.johtoDayCare and johtoDayCareEggs.)
  const DAY_CARES = { four: { list: "dayCare2", eggs: "dayCareEggs", lady: "LOCALID_FOUR_ISLAND_DAYCARE_WOMAN" }, johto: { list: "johtoDayCare", eggs: "johtoDayCareEggs", lady: null } };
  async function fourIslandDayCareLady(where) {
    const D = DAY_CARES[where || "four"];
    const f = player.flags, list = f[D.list] || (f[D.list] = []);
    if (f[D.eggs] && f[D.eggs].eggWaiting && list.length === 2) { await say(DC("HusbandWasLookingForYou")); return; }
    const comeAgain = () => say(DC("ComeAgain"));
    // FourIsland_PokemonDayCare_GiveMonToRaise, and "one more?" while there's room.
    const give = async () => {
      for (;;) {
        if (player.party.filter((r) => !r.egg).length === 1) { await say(DC("YouHaveJustOneMon")); return; }
        await say(DC("WhichMonShouldWeRaise"));
        const mine = await choosePartyFor("Choose a POKéMON.");
        show("world");
        if (!mine) { await comeAgain(); return; }
        if (mine.egg) { await say("We can't raise an Egg!"); return; }
        if (!player.party.some((r) => r !== mine && Party.canFight(r))) { await say(DC("WhatWillYouBattleWith")); return; }
        player.party.splice(player.party.indexOf(mine), 1);
        list.push(DayCare.deposit(mine));
        cry(mine.species);
        await say(DC("WellRaiseYourMon"), [Party.displayName(mine)]);
        if (list.length !== 1) return;
        if (!(await yesNo(DC("WeCanRaiseOneMore")))) { await comeAgain(); return; }
      }
    };
    // FourIsland_PokemonDayCare_TryRetrieveMon: which one (ShowDaycareLevelMenu,
    // with two), what it costs, and the other one too?
    const retrieve = async () => {
      for (;;) {
        if (player.party.length >= Player.PARTY_SIZE) { await say(DC("YourPartyIsFull")); return; }
        let dc = list[0];
        if (list.length > 1) {
          const i = await multichoice(null, 15, 6, list.map((d) => Party.displayName(d.mon) + " Lv" + (d.mon.level + DayCare.levelsGained(d, Player.levelCap(player)))).concat(["Exit"]));
          if (i < 0 || i >= list.length) { await comeAgain(); return; }
          dc = list[i];
        }
        const name = Party.displayName(dc.mon), cost = DayCare.cost(dc, Player.levelCap(player));
        if (!(await yesNo(DC("ItWillCostX"), [name, cost.toLocaleString("en-US")]))) { await comeAgain(); return; }
        if (player.money < cost) { await say(DC("NotEnoughMoney")); return; }
        Screen.say("");
        if (D.lady) await Overworld.act([{ who: D.lady, moves: M("FourIsland_PokemonDayCare_Movement_RetrieveMon") }]);
        list.splice(list.indexOf(dc), 1);
        const mon = DayCare.withdraw(dc, Player.levelCap(player));
        Player.addMoney(player, -cost);
        player.party.push(mon);
        sfx("se_rs_shop");
        await say(DC("HeresYourMon"));
        cry(mon.species);
        await say(DC("TookBackMon"), [name]);
        if (list.length !== 1) { await comeAgain(); return; }
        if (!(await yesNo(DC("TakeOtherOneBackToo")))) { await comeAgain(); return; }
      }
    };
    if (!list.length) {
      if (!(await yesNo(DC("WouldYouLikeUsToRaiseMon")))) { await say(DC("FineThenComeAgain")); return; }
      await give();
      return;
    }
    await say(DC("GoodToSeeYou"));
    for (const dc of list) {
      const n = DayCare.levelsGained(dc, Player.levelCap(player));
      if (n) await say(DC("YourMonHasGrownXLevels"), [Party.displayName(dc.mon), String(n)]);
    }
    if (list.length === 1 && (await yesNo(DC("WeCanRaiseOneMore")))) { await give(); return; }
    if (await yesNo(DC("TakeYourMonBack"))) { await retrieve(); return; }
    await comeAgain();
  }
  async function fourIslandDayCareMan(where) {
    const D = DAY_CARES[where || "four"];
    const f = player.flags, list = f[D.list] || [], eggs = f[D.eggs] || (f[D.eggs] = {});
    // An Egg waiting (FourIsland_EventScript_DaycareEggWaiting): "You do want it, yes?"
    if (eggs.eggWaiting && list.length === 2) {
      if (!(await yesNo(DC("DoYouWantEgg"))) && !(await confirm(fill(DC("IWillKeepDoYouWantIt").join(" "))))) {
        await say(DC("IllKeepIt"));
        eggs.eggWaiting = false;   // (RejectEggFromDayCare)
        return;
      }
      if (player.party.length >= Player.PARTY_SIZE) { await say(DC("YouHaveNoRoomForIt")); return; }
      await sayWithJingle("mus_level_up", DC("ReceivedEgg"));
      await say(DC("TakeGoodCareOfIt"));
      // (GiveEggFromDaycare: what's in it is decided now.)
      player.party.push(Breeding.makeEgg(list[0].mon, list[1].mon, { map: player.location.map }));
      eggs.eggWaiting = false;
      return;
    }
    if (!list.length) { await say(DC("ImDaycareManSpeakToMyWife")); return; }
    await say(DC(list.length === 1 ? "YourMonIsDoingFine" : "YourMonsAreDoingFine"), list.map((d) => Party.displayName(d.mon)));
    // (With two, how well they get on: SetDaycareCompatibilityString.)
    if (list.length === 2) await say(Breeding.compatibilityText(Breeding.compatibility(list[0].mon, list[1].mon)));
  }

  // The sticker man (FourIsland_House2_EventScript_StickerMan): brag about
  // your Hall of Fame entries and he gives your Trainer Card a sticker, a
  // better one each tier (up to 39 entries, 99, 199, 200 on). (FireRed also
  // takes Eggs hatched and link battles won, which this game hasn't got.)
  async function stickerMan() {
    const f = player.flags, S = (k) => T("FourIsland_House2_Text_" + k), id = "LOCALID_STICKER_MAN", hof = f.hofCount || 0;
    const brag = async (question) => {
      await say(question.slice(0, -1));
      const i = await multichoice(question[question.length - 1], 15, 8, ["Hall of Fame", "Quit"]);
      Screen.say("");
      if (i !== 0) return;
      const tier = Sevii.hofBrag(hof);
      if (f.hofBragState === tier) { await say(S(tier === 4 ? "LivingLegendHoF" : "ComeBackWithBetterStoryHoF")); return; }
      f.hofBragState = tier;
      await say(S(["WowHoFLowest", "WowHoFLow", "WowHoFHigh", "WowHoFHighest"][tier - 1]));
      await sayWithJingle("mus_level_up", S("HoFStickerApplied"));
    };
    if (!f.metStickerMan) {
      f.metStickerMan = true;
      await say(S("WishICouldShowOffStickers"));
      Screen.say("");
      await Overworld.act([{ who: id, moves: ["face_player"] }]);
      sfx("se_pin");
      await Overworld.act([{ who: id, moves: ["emote_exclamation_mark", "delay_16", "delay_16", "delay_16"] }]);
      if (!hof) { await say(S("GiveYouStickerIfYouBrag")); return; }
      await brag(S("GiveYouStickerIfYouBrag"));
      return;
    }
    await Overworld.act([{ who: id, moves: ["face_player"] }]);
    if (!hof) { await say(S("BragAboutSomethingForMe")); return; }
    await brag(S("BragAboutWhatToday"));
  }

  // Icefall Cave 1F's thin ice (IcefallCaveIcePerStepCallback): a step on it
  // cracks it, the next breaks it and you fall through to B1F. Whole again
  // once you've left (FireRed's FLAG_TEMP_1..9). { "x,y": 1 cracked, 2 broken }
  let icefallIce = {};
  function icefallStep() {
    const at = player.location;
    if (!at || at.map !== "FourIsland_IcefallCave_1F") return null;
    const b = World.blockAt(at.map, at.x, at.y).behavior, key = at.x + "," + at.y;
    if (b === World.MB.THIN_ICE) {
      icefallIce[key] = 1;
      sfx("se_ice_crack");
      applyPatches(at.map);
      return null;
    }
    if (b !== World.MB.CRACKED_ICE) return null;
    icefallIce[key] = 2;
    sfx("se_ice_break");
    applyPatches(at.map);
    return { type: "trigger", trigger: { script: "FourIsland_IcefallCave_1F_EventScript_FallDownHole" }, map: at.map };
  }
  // FourIsland_IcefallCave_1F_EventScript_FallDownHole: through the ice to
  // the same spot on B1F (warphole).
  async function icefallFall() {
    const at = Overworld.position();
    await sleep(333);
    await Overworld.act([{ who: "player", moves: ["set_invisible"] }]);
    sfx("se_fall");
    await sleep(1000);
    await Overworld.teleport({ map: "FourIsland_IcefallCave_B1F", x: at.x, y: at.y, facing: at.facing });
  }

  // Icefall Cave's back (FourIsland_IcefallCave_Back_EventScript_LoreleiRocketsScene):
  // Lorelei, home on Four Island, catches Team Rocket poaching the cave's
  // Pokémon. She asks you to help, and battles two of them beside you (a
  // tag battle: this game's own; FireRed's is you against one); beaten, he won't say where
  // they've taken the Pokémon until her Lapras makes him, then they run off:
  // the Rocket Warehouse on Five Island.
  const ICEFALL_LORELEI = [["Dewgong", 40], ["Jynx", 40], ["Lapras", 42]];
  const ICEFALL_GRUNT2 = [["Sneasel", 38], ["Koffing", 38], ["Golbat", 39]];
  async function icefallLorelei() {
    const f = player.flags, I = (k) => T("FourIsland_IcefallCave_Back_Text_" + k), Im = (k) => M("FourIsland_IcefallCave_Back_Movement_" + k);
    const L = "LOCALID_ICEFALL_LORELEI", R1 = "LOCALID_ICEFALL_ROCKET1", R2 = "LOCALID_ICEFALL_ROCKET2", R3 = "LOCALID_ICEFALL_ROCKET3";
    const start = Object.assign({ map: player.location.map }, Overworld.position());
    await say(I("LoreleiKeepHandsOffMons"));
    await Overworld.act([{ who: R1, moves: Im("WalkInPlaceDown") }]);
    await say(I("ShutItLadyLeaveUsBe"));
    Screen.say("");
    sfx("se_pin");
    await Overworld.act([{ who: L, moves: ["emote_exclamation_mark"] }]);
    await Overworld.act([{ who: L, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    await Overworld.act([{ who: L, moves: ["delay_16", "delay_16", "delay_16"] }]);
    await say(I("LoreleiPlayerHelpMeKickPoachersOut"));
    Screen.say("");
    await Overworld.act([{ who: L, moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
    await sleep(300);
    await Overworld.act([{ who: L, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    await sleep(583);
    await Overworld.act([{ who: R3, moves: Im("Rocket3FaceLorelei") }, { who: L, moves: Im("LoreleiToRockets") }, { who: "player", moves: Im("PlayerToRockets") }]);
    await Overworld.act([{ who: R2, moves: Im("WalkInPlaceDown") }]);
    music("mus_encounter_rocket");
    await say(I("GruntIntro"));
    if (!canBattle()) return;
    // (This game's own: Lorelei battles beside you, against both Grunts:
    // FireRed's one, and the other with Pokémon of his own.)
    await Overworld.act([{ who: R1, moves: Im("WalkInPlaceDown") }]);
    await say(["Hey, this one's mine too!", "Lorelei: Then we'll take you both on.\n{PLAYER}, choose three Pokémon!"]);
    Screen.say("");
    const id = "TRAINER_TEAM_ROCKET_GRUNT_45", data = window.WORLD_TRAINERS[id];
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(id), pic: data.pic },
      foe2: { name: data.className + " " + data.name, team: ICEFALL_GRUNT2.map(([sp, lv]) => Party.create(sp, lv)), pic: data.pic,
        defeatText: ["Gah! Two against two, and\nwe still lost?!"], prizeClass: data.className },
      defeatText: I("GruntDefeat"), trainerId: id, prizeClass: data.className,
      partner: { name: "Lorelei", team: ICEFALL_LORELEI.map(([sp, lv]) => Party.create(sp, lv, { ivs: 31 })), pic: "lorelei" } });
    if (outcome === "cancelled") {
      // (Not ready: back where you came in, and it all happens again when you return.)
      await say(["Lorelei: Not ready? Then hurry,\n{PLAYER}! I'll hold them here."]);
      await Overworld.fadeToBlack();
      await Overworld.teleport(Object.assign({}, start));
      music((window.WORLD_MAPS[player.location.map] || {}).music);
      return;
    }
    if (outcome !== "won") return;
    show("world");
    await Overworld.resume();
    await Overworld.act([{ who: L, moves: Im("WalkInPlaceUp") }]);
    await say(I("LoreleiWhereHaveYouTakenMons"));
    await say(I("NotTellingYouThat"));
    const freeze = I("LoreleiWellDeepFreezeYou");
    await say(freeze.slice(0, -1));
    cry("Lapras");
    await say(freeze.slice(-1));
    await Overworld.act([{ who: R1, moves: Im("Rocket1ReactToThreat") }]);
    await say(I("OkayRocketWareHouseFiveIsland"));
    Screen.say("");
    await Overworld.act([{ who: L, moves: Im("LoreleiWatchRocketsExit") }, { who: "player", moves: Im("PlayerWatchRocketsExit") },
      { who: R1, moves: Im("Rocket1Exit") }, { who: R2, moves: Im("Rocket2Exit") }, { who: R3, moves: Im("Rocket3Exit") }]);
    for (const r of [R1, R2, R3]) Overworld.removeObject(r);
    await sleep(833);
    await Overworld.act([{ who: L, moves: Im("LoreleiWalkToPlayer") }]);
    await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
    await say(I("ThankYouThisIsAwful"));
    f.icefallScene = 1;   // (Lorelei's at home now: FLAG_HIDE_LORELEI_IN_HER_HOUSE cleared)
    tempFlags.add("icefallLorelei");
  }

  // ---------- The Sevii Islands: Five Island ----------
  //
  // The Rocket Warehouse's door in Five Isle Meadow (FiveIsland_Meadow_EventScript_WarehouseDoor):
  // two passwords, "GOLDEEN need log" and "Yes, nah, CHANSEY" (FLAG_LEARNED_YES_NAH_CHANSEY:
  // flags.learnedYesNahChansey, which part 3's Dotted Hole sets).
  async function warehouseDoor() {
    const f = player.flags, D = (k) => T("FiveIsland_Meadow_Text_" + k);
    if (f.unlockedRocketWarehouse) { await say(D("WarehouseDoorAlreadyOpen")); return; }
    if (!f.learnedYesNahChansey) { await say(D("EnteredPasswordAnotherNeeded")); return; }
    f.unlockedRocketWarehouse = true;
    await say(D("EnteredPasswordDoorOpened"));
    await sleep(1000);
    applyPatches("FiveIsland_Meadow");
    sfx("se_pin");
  }
  // In the Warehouse: the Admin by the arrows turns them round once she's
  // beaten so you can come back through (FiveIsland_RocketWarehouse_EventScript_DefeatedAdmin1);
  // the other Admin, beaten, takes Team Rocket away (..._DefeatedAdmin2:
  // FLAG_DEFEATED_ROCKETS_IN_WAREHOUSE). -> true if it was one of them.
  async function warehouseAdmin(id) {
    const f = player.flags, W = (k) => T("FiveIsland_RocketWarehouse_Text_" + k);
    if (id === "TRAINER_TEAM_ROCKET_ADMIN") {
      const A = "LOCALID_WAREHOUSE_ADMIN1", at = Overworld.position();
      show("world");
      await Overworld.resume();
      if (at.facing === "up" && at.x !== 27) await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
      await say(W("Admin1PostBattle"));
      Screen.say("");
      // (To the switch at 27: from wherever she stopped coming at you.)
      const a = Overworld.personPosition(A);
      await Overworld.act([{ who: A, moves: Array(Math.max(0, 27 - (a ? a.x : 27))).fill("walk_right").concat(M("Common_Movement_WalkInPlaceFasterUp")) }]);
      sfx("se_pin");
      applyPatches("FiveIsland_RocketWarehouse");
      await sleep(300);
      await Overworld.act([{ who: A, moves: M(at.x === 27 ? "Common_Movement_WalkInPlaceFasterDown" : "Common_Movement_WalkInPlaceFasterLeft") }]);
      await say(W("MadeItSoYouCanComeBackThrough"));
      if (f.trainerSpots) delete f.trainerSpots[id];   // (back at her post by the switch)
      return true;
    }
    if (id === "TRAINER_TEAM_ROCKET_ADMIN_2") {
      show("world");
      await Overworld.resume();
      if (Overworld.position().x <= 24) await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
      await say(W("Admin2PostBattle"));
      Screen.say("");
      await Overworld.fadeToBlack();
      for (const who of ["LOCALID_WAREHOUSE_GRUNT2", "LOCALID_WAREHOUSE_GRUNT3", "LOCALID_WAREHOUSE_ADMIN2", "LOCALID_WAREHOUSE_ADMIN1"]) Overworld.removeObject(who);
      f.warehouseScene = 1;
      f.defeatedRocketsInWarehouse = true;   // (and FLAG_HIDE_FIVE_ISLAND_ROCKETS)
      // (Gone for good, wherever they stopped coming at you.)
      for (const t of ["TRAINER_TEAM_ROCKET_ADMIN", "TRAINER_TEAM_ROCKET_ADMIN_2", "TRAINER_TEAM_ROCKET_GRUNT_42", "TRAINER_TEAM_ROCKET_GRUNT_47",
        "TRAINER_TEAM_ROCKET_GRUNT_48", "TRAINER_TEAM_ROCKET_GRUNT_49", "TRAINER_TEAM_ROCKET_GRUNT_50", "TRAINER_TEAM_ROCKET_GRUNT_51"]) if (f.trainerSpots) delete f.trainerSpots[t];
      await Overworld.fadeFromBlack();
      return true;
    }
    return false;
  }
  // Gideon (FiveIsland_RocketWarehouse_EventScript_Gideon): the scientist who
  // stole the Sapphire (part 3: the Dotted Hole) hands it over once beaten.
  async function gideon(person) {
    const f = player.flags, W = (k) => T("FiveIsland_RocketWarehouse_Text_" + k), id = "TRAINER_SCIENTIST_GIDEON";
    if (f[id]) { await say(W(f.canLinkWithRS ? "GiovannisKidHasRedHair" : "GetLostLeaveMeBe")); return; }
    await trainerBattle(person, null);
    if (!f[id]) return;
    show("world");
    await Overworld.resume();
    await say(W("GideonPostBattle"));
    f.recoveredSapphire = true;
    Player.addItem(player, "sapphire");
    await sayWithJingle("mus_obtain_key_item", "{PLAYER} received the " + Bag.name("sapphire") + "!");
  }

  // The Memorial Pillar: a man scrubbing his Onix's grave. Leave a Lemonade
  // there and he gives you TM42 Facade (FiveIsland_MemorialPillar_EventScript_*).
  const MEMORIAL_MAN = "LOCALID_MEMORIAL_MAN", P5 = (k) => T("FiveIsland_MemorialPillar_Text_" + k);
  async function memorialMan() {
    const f = player.flags;
    if (f.gotTM42AtMemorialPillar) { await say(P5("ScrubScrubTectonix")); return; }
    if (f.noRoomForTM42) { await say(P5("StillHaveThingAsMyThanks")); await memorialTM(); return; }
    await say(P5("ScrubScrub"));
    Screen.say("");
    await Overworld.act([{ who: MEMORIAL_MAN, moves: ["face_player"] }]);
    await sleep(750);
    await say(P5("YourMonsLookHealthy"));
    await Overworld.act([{ who: MEMORIAL_MAN, moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    await say(P5("ThisIsWhereIBuriedMyOnix"));
  }
  async function memorialTM() {
    const tm = machineFor("Facade");   // (FireRed's TM42 Facade)
    Player.addItem(player, tm);
    await sayWithJingle(itemJingle(tm), "{PLAYER} received " + Bag.name(tm) + "!");
    await say(P5("BeGoodToYourMonsToo"));
    await Overworld.act([{ who: MEMORIAL_MAN, moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    player.flags.gotTM42AtMemorialPillar = true;
    delete player.flags.noRoomForTM42;
  }
  async function memorial() {
    const f = player.flags;
    if (f.gotTM42AtMemorialPillar || f.noRoomForTM42) { await say(P5("HereLiesTectonix")); return; }
    await say(P5("HereLiesTectonixLemonadeOffering"));
    if (!Player.itemCount(player, "lemonade")) return;
    if (!(await yesNo(P5("LeaveAnotherLemonadeOffering")))) return;
    Player.removeItem(player, "lemonade");
    await say(P5("PlacedCanOfLemonade"));
    Screen.say("");
    await Overworld.act([{ who: MEMORIAL_MAN, moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
    await sleep(750);
    await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
    await say(P5("ThankYouPleaseTakeThis"));
    await memorialTM();
  }

  let stepEvolvers = null;
  const STEP_EVOLVERS = () => stepEvolvers || (stepEvolvers = new Set(Object.keys(window.EVOLUTIONS).filter((sp) => window.EVOLUTIONS[sp].some((e) => e.steps))));

  // ---------- Eggs (game/breeding.js) ----------
  //
  // Each step: the Four Island Day-Care's couple may find an Egg (it waits
  // with the Day-Care Man), and the Eggs in your party get nearer hatching.
  function eggStep() {
    const f = player.flags;
    // (And the steps Gen 9's walkers count: Pawmo, Bramblin and Rellor, up to the 1,000 they need.)
    for (const r of player.party) if (!r.egg && STEP_EVOLVERS().has(r.species) && (r.steps | 0) < 1000) r.steps = (r.steps | 0) + 1;
    if (f.dayCare2 && f.dayCare2.length === 2) Breeding.dayCareStep(f.dayCareEggs || (f.dayCareEggs = {}), f.dayCare2);
    if (f.johtoDayCare && f.johtoDayCare.length === 2) Breeding.dayCareStep(f.johtoDayCareEggs || (f.johtoDayCareEggs = {}), f.johtoDayCare);
    const egg = Breeding.hatchStep(f.eggHatch || (f.eggHatch = {}), player.party);
    return egg ? { type: "egg-hatch", record: egg } : null;
  }
  // An Egg hatching (EventScript_EggHatch, then FireRed's egg hatch scene,
  // ui/egg-hatch.js): "Huh?", the screen fades, the Egg wobbles and bursts to
  // the evolution music, its cry, "X hatched from the Egg!" to its fanfare,
  // and a nickname if you like.
  async function eggHatches(egg) {
    await say("Huh?");
    Screen.say("");
    await Overworld.fadeToBlack();
    Breeding.hatch(egg, player.location.map);
    Player.markCaught(player, egg.species);   // (AddHatchedMonToParty)
    // (Elm's Mystery Egg: he'll call about it, CALL_TRIGGER_ELM_EGG_HATCHED.)
    if (egg.species === "Togepi" && johto.flag("FLAG_GOT_EGG_FROM_ELMS_ASSISTANT") && !johto.flag("FLAG_SYS_HATCHED_TOGEPI_EGG")) {
      johto.setFlag("FLAG_SYS_HATCHED_TOGEPI_EGG", true);
      gear.setTrigger(0, true);
    }
    const name = Party.speciesName(egg.species);
    show("scene");
    clearMenu();
    music(null);
    const s = await EggHatchScene.open(scene, { mon: Screen.spriteUrl(egg.species, Party.form(egg), false, egg.shiny) });
    try {
      // (Task_EggHatchPlayBGM: the evolution intro, then a second later the evolution music.)
      const intro = GA && GA.se("mus_evolution_intro");
      setTimeout(() => music("mus_evolution"), intro ? intro * 1000 : 1000);
      await s.run();
      cry(egg.species);
      await sleep(1000);
      const jingle = fanfare("mus_evolved");
      await message(name + " hatched from the Egg!");
      await jingle;
      if (await confirm("Would you like to nickname the newly\nhatched " + name + "?")) {
        const typed = await enterText(name + "'s nickname?", name, 10);
        if (typed && typed !== name) egg.nickname = typed;
      } else await s.fadeOut();
    } finally {
      s.close();
    }
    Screen.say("");
    music(avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[player.location.map] || {}).music);
    await persist();
  }

  // The Water Labyrinth's gentleman (FiveIsland_WaterLabyrinth_EventScript_EggGentleman):
  // a lead Pokémon as fond of you as can be, and he gives you the Egg he got
  // on his travels: a Togepi Egg (FireRed's giveegg SPECIES_TOGEPI). After, he remembers Daisy
  // when you have a Togepi or Togetic of your own with you.
  async function eggGentleman() {
    const f = player.flags, E = (k) => T("FiveIsland_WaterLabyrinth_Text_" + k);
    if (!f.gotTogepiEgg) {
      if (!f.noRoomForTogepiEgg) {
        await say(E("LetMeTakeLookAtMons"));
        if (!Sevii.leadFriendshipMax(player.party)) { await say(E("HmmISeeIsee")); return; }
        await say(E("TreatMonRightHaveThis"));
      }
      if (player.party.length >= Player.PARTY_SIZE) { f.noRoomForTogepiEgg = true; await say(E("DontHaveSpaceInYourParty")); return; }
      f.gotTogepiEgg = true;
      delete f.noRoomForTogepiEgg;
      await sayWithJingle("mus_level_up", E("ReceivedEggFromMan"));
      player.party.push(Breeding.giftEgg("Togepi", { map: player.location.map, from: "traveling-man" }));
      await say(E("GladIMetSomeoneLikeYou"));
      return;
    }
    const mine = player.party.find((r) => !r.egg && (r.species === "Togepi" || r.species === "Togetic") && r.ot && r.ot.id === player.trainerId);
    if (mine) await say(E("CuteMonRemindsMeOfDaisy"), ["", Party.speciesName(mine.species)]);
    else await say(E("GladIMetSomeoneLikeYou"));
  }

  // Resort Gorgeous: Selphy, lost in the Lost Cave (FiveIsland_LostCave_Room10_EventScript_FindSelphyScene),
  // battles you and asks you to take her home; at home she wants to see a
  // Pokémon (FiveIsland_ResortGorgeous_House_EventScript_Selphy) and her
  // butler thanks you for it.
  async function lostSelphy() {
    const f = player.flags, L = (k) => T("FiveIsland_LostCave_Room10_Text_" + k), S = "LOCALID_LOST_CAVE_SELPHY", id = "TRAINER_LADY_SELPHY";
    await Overworld.act([{ who: S, moves: M("FiveIsland_LostCave_Room10_Movement_SelphyWander") }]);
    await sleep(1667);
    await Overworld.act([{ who: S, moves: M("FiveIsland_LostCave_Room10_Movement_SelphyApproach") }]);
    await say(L("SelphyIntro"));
    if (!canBattle()) return;
    const data = window.WORLD_TRAINERS[id];
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(id), pic: data.pic },
      defeatText: L("SelphyDefeat"), trainerId: id, prizeClass: data.className });
    if (outcome !== "won") return;
    show("world");
    await Overworld.resume();
    await say(L("MayIAskYouToTakeMeHome"));
    Screen.say("");
    f.lostCaveScene = 1;
    f.resortScene = 1;
    await Overworld.teleport({ map: "FiveIsland_ResortGorgeous", x: 39, y: 10, facing: "up" });
    await selphyHome();
  }
  // FiveIsland_ResortGorgeous_EventScript_SelphyReturnHomeScene.
  async function selphyHome() {
    const S = "LOCALID_RESORT_GORGEOUS_SELPHY";
    await say(T("FiveIsland_ResortGorgeous_Text_SelphyThanksYouMayGoNow"));
    Screen.say("");
    await Overworld.act([{ who: S, moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    sfx("se_door");
    await Overworld.act([{ who: S, moves: M("FiveIsland_ResortGorgeous_Movement_SelphyEnterHome") }]);
    Overworld.removeObject(S);
    player.flags.resortScene = 2;
  }
  async function selphy() {
    const f = player.flags, H = (k) => T("FiveIsland_ResortGorgeous_House_Text_" + k), Hm = (k) => M("FiveIsland_ResortGorgeous_House_Movement_" + k);
    const S = "LOCALID_RESORT_GORGEOUS_HOUSE_SELPHY", B = "LOCALID_RESORT_GORGEOUS_HOUSE_BUTLER", shown = "FiveIsland_ResortGorgeous_House:shown";
    const facing = Overworld.position().facing, turn = (who, dir) => ({ who, moves: M("Common_Movement_WalkInPlaceFaster" + dir) });
    if (tempFlags.has(shown)) { await say(H("SelphyWishYouBestOfLuck")); return; }
    const request = async () => {
      if (!f.resortRequest || f.resortRequest.expired) f.resortRequest = Sevii.resortRequest(player.pokedex.seen);
      await say(H("WishToSeeMonPlease"), [Party.speciesName(f.resortRequest.species)]);
    };
    const r = f.resortRequest;
    if (r && r.expired) { await say(H("OhImTiredOfWaiting")); await request(); return; }
    if (!r) { await say(H("PleaseHearMyWish")); await request(); return; }
    if (!player.party.some((m) => m.species === r.species && !m.egg)) { await request(); return; }
    await say(H("MonYouCaughtForMeThankYou"), [Party.speciesName(r.species)]);
    Overworld.addObject(B, { x: 6, y: 2, facing: "down" });
    await Overworld.act([{ who: B, moves: Hm("ButlerEnter") }]);
    await say(H("ButlerYesMyLady"));
    await Overworld.act([turn(S, "Up")]);
    await say(H("SelphyGiveTokenOfAppreciation"));
    await say(H("ButlerIShallDoAsYouBid"));
    Screen.say("");
    if (facing === "up") { await Overworld.act([turn(S, "Down"), { who: B, moves: Hm("ButlerApproachPlayerNorth") }]); await Overworld.act([turn("player", "Left")]); }
    else if (facing === "down") { await Overworld.act([{ who: B, moves: Hm("ButlerApproachPlayerSouth") }]); await Overworld.act([turn("player", "Up")]); }
    else if (facing === "right") { await Overworld.act([turn(S, "Left"), { who: B, moves: Hm("ButlerApproachPlayerEast") }]); await Overworld.act([turn("player", "Up")]); }
    else await Overworld.act([{ who: B, moves: Hm("ButlerApproachPlayerWest") }]);
    await say(H("ButlerPleaseAcceptThisAsHerThanks"));
    Player.addItem(player, r.reward);
    await sayWithJingle(itemJingle(r.reward), "{PLAYER} received " + article(Bag.name(r.reward)) + "!");
    tempFlags.add(shown);   // (FLAG_TEMP_2)
    delete f.resortRequest;
  }

  // ---------- The Sevii Islands: Six Island ----------
  //
  // Gary's in Six Island's Pokémon Center the first time you come
  // (SixIsland_PokemonCenter_1F_EventScript_RivalScene): he can't find all the
  // Pokémon around here, and he's off; after this he's not on Four Island.
  async function sixIslandRival() {
    const R = "LOCALID_SIX_ISLAND_RIVAL", Sm = (k) => M("SixIsland_PokemonCenter_1F_Movement_" + k);
    await Overworld.act([{ who: R, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    music("mus_encounter_rival");
    await Overworld.act([{ who: R, moves: ["emote_exclamation_mark"] }]);
    await Overworld.act([{ who: R, moves: ["delay_16", "delay_16", "delay_16"] }]);
    await sleep(417);
    await Overworld.act([{ who: R, moves: Sm("RivalApproach") }]);
    await say(T("SixIsland_PokemonCenter_1F_Text_RivalImpossibleToGetAllMonsAroundHere"));
    Screen.say("");
    await Overworld.act([{ who: "player", moves: Sm("PlayerWatchRivalExit") }, { who: R, moves: Sm("RivalExit") }]);
    music((window.WORLD_MAPS.SixIsland_PokemonCenter_1F || {}).music);
    sfx("se_exit");
    await sleep(583);
    Overworld.removeObject(R);
    player.flags.sixCenterScene = 1;
    player.flags.fourIslandScene = 1;
  }

  // Ruin Valley: the scientist outside the Dotted Hole (SixIsland_RuinValley_EventScript_Scientist),
  // and its door (..._EventScript_DottedHoleDoor): six dots in Braille, "CUT".
  async function ruinValleyScientist() {
    const S = "LOCALID_RUIN_VALLEY_SCIENTIST";
    await say(T("SixIsland_RuinValley_Text_CantFigureOutHowToGetInside"));
    await Overworld.act([{ who: S, moves: ["face_player"] }]);
    await say(T("SixIsland_RuinValley_Text_IFoundThisPlace"));
    await Overworld.act([{ who: S, moves: ["face_up"] }]);
  }
  async function dottedHoleDoor() {
    const R = (k) => T("SixIsland_RuinValley_Text_" + k);
    if (player.flags.usedCutOnRuinValleyBraille) { await say(R("DoorIsOpen")); return; }
    const q = R("CheckDoorMoreThoroughly");
    await say(q.slice(0, -1));
    if (!(await confirm(fill(q[q.length - 1])))) { await say(R("LeftDoorAlone")); return; }
    await say(R("SeveralDotsOnTheDoor"));
    await say(braille("CUT"));
  }
  // Cut used on it, from below (CutMoveOpenDottedHoleDoor): it opens.
  async function cutDottedHoleDoor(mon) {
    await say(usedMove(mon, "Cut"));
    Screen.say("");
    player.flags.usedCutOnRuinValleyBraille = true;
    applyPatches("SixIsland_RuinValley");
    sfx("se_bang");
  }

  // The Dotted Hole's Sapphire room (SixIsland_DottedHole_SapphireRoom_EventScript_Sapphire):
  // you find the Sapphire, and the man who's been following you drops in,
  // snatches it to sell to Team Rocket, and gives away a password to their
  // Warehouse as he runs: "Yes, nah, Chansey." (He's Gideon, in the Warehouse
  // on Five Island.)
  async function dottedHoleSapphire() {
    const f = player.flags, D = (k) => T("SixIsland_DottedHole_SapphireRoom_Text_" + k), Dm = (k) => M("SixIsland_DottedHole_SapphireRoom_Movement_" + k);
    const THIEF = "LOCALID_DOTTED_HOLE_THIEF", facing = Overworld.position().facing, upDown = facing === "up" || facing === "down";
    const face = (dir) => ({ who: "player", moves: M("Common_Movement_WalkInPlaceFaster" + dir) });
    await sayWithJingle("mus_obtain_key_item", D("FoundSapphire"));
    Screen.say("");
    // (He drops in from above: slide_down, nine tiles to the hole's foot.)
    Overworld.addObject(THIEF, { x: 5, y: 0, facing: "down" });
    sfx("se_fall");
    await Overworld.act([{ who: THIEF, moves: ["lock_facing_direction"].concat(Array(9).fill("walk_faster_down"), ["unlock_facing_direction"]) }]);
    sfx("se_m_strength");
    await Overworld.act([face(upDown ? "Left" : "Down")]);
    await Overworld.shake(12, { x: 3, y: 0, delay: 3 });
    await sleep(1000);
    await Overworld.act([{ who: THIEF, moves: Dm(upDown ? "ThiefLookAtSapphireFromLeft" : "ThiefLookAtSapphireFromBelow") }]);
    await say(D("IWasRightInTailingYou"));
    Screen.say("");
    await Overworld.act([{ who: THIEF, moves: Dm(upDown ? "ThiefGetSapphireFromLeft" : "ThiefGetSapphireFromBelow") }]);
    await Overworld.act([face({ up: "Up", down: "Down", right: "Right", left: "Left" }[facing])]);
    Overworld.removeObject("LOCALID_SAPPHIRE");
    await Overworld.act([face(upDown ? "Left" : "Down")]);
    await say(D("SellToTeamRocketTellPassword"));
    Screen.say("");
    await Overworld.act([{ who: "player", moves: Dm("PlayerWatchThiefExit") },
      { who: THIEF, moves: Dm(facing === "up" ? "ThiefExitNorth" : facing === "down" ? "ThiefExitSouth" : "ThiefExitEastWest") }]);
    sfx("se_exit");
    await sleep(583);
    Overworld.removeObject(THIEF);
    f.learnedYesNahChansey = true;   // (and FLAG_HIDE_SAPPHIRE)
  }

  // The Water Path's Heracross fan (SixIsland_WaterPath_House1_EventScript_Beauty):
  // she measures a Heracross (FireRed's size record, as the Magikarp's) and
  // gives you a Nest Ball for the biggest yet.
  async function heracrossFan() {
    const f = player.flags, H = (k) => T("SixIsland_WaterPath_House1_Text_" + k);
    if (!player.party.some((r) => r.species === "Heracross" && !r.egg)) { await say(H("LoveItNeedItHeracross")); return; }
    await say(H("MayIMeasureHeracross"));
    const r = await choosePartyFor("Choose a {PKMN}.");
    show("world");
    if (!r) return;
    if (r.species !== "Heracross" || r.egg) { await say(H("ThisWontDo")); return; }
    const hash = monSizeHash(r), record = f.heracrossRecord || 0;
    const now = monSize("Heracross", hash), best = monSize("Heracross", record), vars = [null, monInches("Heracross", hash), monInches("Heracross", record)];
    // (Smaller, or the same, is only a letdown once she's given you the Nest Ball.)
    if (now > best || !f.gotNestBallFromWaterPathHouse1) {
      if (now > best) f.heracrossRecord = hash;
      f.gotNestBallFromWaterPathHouse1 = true;
      await say(H("ItsXInchesDeserveReward"), vars);
      Player.addItem(player, "nest-ball");
      await sayWithJingle(itemJingle("nest-ball"), "{PLAYER} received a Nest Ball!");
      await say(H("WantToSeeBiggerOne"));
      return;
    }
    await say(H(now === best ? "ItsXInchesSameAsBefore" : "ItsXInchesYInchesWasBiggest"), vars);
  }
  async function heracrossChart() {
    const f = player.flags, H = (k) => T("SixIsland_WaterPath_House1_Text_" + k);
    if (!f.gotNestBallFromWaterPathHouse1) { await say(H("BlankChartOfSomeSort")); return; }
    await say(H("BiggestHeracrossIsXInches"), [null, null, monInches("Heracross", f.heracrossRecord || 0)]);
  }

  // ---------- Seven Island ----------
  //
  // Sevault Canyon's Chansey dance (SevenIsland_SevaultCanyon_House_EventScript_ChanseyDanceMan):
  // dance along and your Pokémon are healed, once a visit.
  const CHANSEY_DANCE = ["walk_in_place_down", "delay_16", "walk_in_place_down", "delay_16", "walk_in_place_down", "delay_16",
    "walk_in_place_down", "delay_16", "walk_in_place_faster_right", "delay_4", "walk_in_place_faster_up", "delay_4",
    "walk_in_place_faster_left", "delay_4", "walk_in_place_faster_down", "delay_4"];
  async function chanseyDance() {
    const C = (k) => T("SevenIsland_SevaultCanyon_House_Text_" + k), man = "LOCALID_CHANSEY_DANCE_MAN", danced = "SevenIsland_SevaultCanyon_House:danced";
    const home = (window.WORLD_MAPS.SevenIsland_SevaultCanyon_House || {}).music;
    if (tempFlags.has(danced)) { await Overworld.act([{ who: man, moves: ["face_player"] }]); await say(C("ChanseyDanceJoinIn")); return; }
    music("mus_school");
    await Overworld.act([{ who: man, moves: CHANSEY_DANCE }]);
    music(home);
    await sleep(500);
    await Overworld.act([{ who: man, moves: ["face_player"] }]);
    await say(C("ChanseyDanceJoinIn"));
    const q = C("WouldYouLikeToDance");
    await say(q.slice(0, -1));
    if (!(await confirm(fill(q[q.length - 1])))) { await say(C("ComeOnDance")); return; }
    await say(C("DancedChanseyDance"));
    Screen.say("");
    if (Overworld.position().facing !== "down") await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    await sleep(500);
    music("mus_school");
    await Overworld.act([{ who: "player", moves: CHANSEY_DANCE }]);
    music(home);
    await sleep(500);
    await outOfCenterHeal();
    await say(C("YoureAllChipperNow"));
    tempFlags.add(danced);
  }

  // The Tanoby Key (SevenIsland_SevaultCanyon_TanobyKey_EventScript_Switch1-7):
  // a boulder pushed onto each of its seven switches; the seventh, and far
  // away the Tanoby Ruins rumble open (FLAG_SYS_UNLOCKED_TANOBY_RUINS).
  const TANOBY_KEY = "SevenIsland_SevaultCanyon_TanobyKey";
  function tanobySwitch(map, x, y) {
    if (map !== TANOBY_KEY) return null;
    const t = ((window.WORLD_MAPS[map] || {}).triggers || []).find((q) => q.x === x && q.y === y);
    return t ? { type: "trigger", trigger: t, map } : null;
  }
  async function tanobyKeySwitch(script) {
    const key = TANOBY_KEY + ":" + script;
    if (tempFlags.has(key) || player.flags.unlockedTanobyRuins) return;
    tempFlags.add(key);
    const pressed = [...tempFlags].filter((k) => k.startsWith(TANOBY_KEY + ":")).length;
    sfx("se_truck_move");
    await Overworld.shake(8, { x: 1, y: 1, delay: 3 });
    await sleep(1000);
    if (pressed < 7) return;
    await Overworld.shake(10, { x: 2, y: 2, delay: 3 });
    await sleep(1000);
    await Overworld.shake(12, { x: 3, y: 3, delay: 2 });
    await sleep(1000);
    sfx("se_lavaridge_fall_warp");
    await sleep(1000);
    await say(T("SevenIsland_SevaultCanyon_TanobyKey_Text_MysteriousRumbleFarAway"));
    player.flags.unlockedTanobyRuins = true;
  }

  // ---------- Trainer Tower ----------
  //
  // FireRed's Trainer Tower (data/scripts/trainer_tower.inc, src/trainer_tower.c;
  // the rules are in game/trainer-tower.js). At the lobby's counter you choose
  // a challenge, Single, Double, Knockout or Mixed, and the clock starts: up
  // the stairs, a battle on each of eight floors (two Pokémon a side, a double
  // battle, or three trainers one after another), at your best Pokémon's
  // level, with no Exp. or money for winning and no healing on the way but
  // the lobby's. Lose and you're back in the lobby. The tower's owner waits
  // on the roof with the challenge's prize (once each) and your time, the
  // best of them on the lobby's Time Board.
  const TOWER = { D1: "LOCALID_TOWER_TRAINER_DOUBLES1", S: "LOCALID_TOWER_TRAINER_SINGLES", K: "LOCALID_TOWER_TRAINER_KNOCKOUT",
    D2: "LOCALID_TOWER_TRAINER_DOUBLES2" };
  const towerFloorNo = (map) => { const m = /^TrainerTower_(\d)F$/.exec(map || ""); return m ? +m[1] : 0; };
  const towerMode = () => (player.flags.tower ? player.flags.tower.mode : 0);
  const towerFloor = (n) => TrainerTower.floor(towerMode(), n);
  const towerLook = (gfx) => Object.assign({}, (window.WORLD_SPRITES || {})[gfx] || {});
  const lobbyText = (k) => T("TrainerTower_Lobby_Text_" + k);
  let towerCounterOpen = false;   // (the lobby's counter barrier, as you come out of the elevator)
  // Who's on a floor, where, looking like whom (TrainerTower_OnTransition and
  // SetTrainerTowerNPCGraphics); the owner's only on the roof.
  function towerPerson(person, map) {
    if (map === "TrainerTower_Roof") return undefined;
    const n = towerFloorNo(map);
    if (!n) return undefined;
    if (!person.localId) return false;   // (the owner)
    const fl = towerFloor(n), cleared = TrainerTower.floorCleared(player.flags, n), at = (x, y, dir, gfx) => Object.assign(towerLook(gfx), { x, y, movement: "face_" + dir });
    if (fl.type === "single") return person.localId === TOWER.S && at(15, 13, "left", fl.looks[0]);
    if (fl.type === "double") {
      if (person.localId === TOWER.D1) return at(10, 12, cleared ? "down" : "left", fl.looks[0]);
      if (person.localId === TOWER.D2) return cleared ? at(11, 12, "down", fl.looks[1]) : at(10, 13, "left", fl.looks[1]);
      return false;
    }
    if (person.localId === TOWER.D1) return at(10, 10, "down", fl.looks[1]);
    if (person.localId === TOWER.S) return at(14, 13, "left", fl.looks[2]);
    if (person.localId === TOWER.K) return at(10, 16, "up", fl.looks[0]);
    return false;
  }
  // The lobby's counter (TrainerTower_Lobby_EventScript_EntryTrigger).
  async function towerEntry() {
    const f = player.flags;
    await Overworld.act([{ who: "player", moves: ["face_right"] }]);
    await say(lobbyText("WelcomeToTrainerTower"));
    // (FireRed's built-in challenges all go up to the eighth floor.)
    await say(lobbyText("TrainersUpEighthFloor"));
    for (;;) {
      const i = await multichoice(lobbyText("LikeToChallengeTrainers")[0], 18, 6, ["Yes", "No", "Info"]);
      if (i === 2) { await say(lobbyText("ExplainTrainerTower")); continue; }
      if (i === 0) {
        const mode = await multichoice(null, 13, 3, TrainerTower.MODES.concat(["Exit"]));
        if (mode >= 0 && mode < 4) {
          f.towerScene = 1;
          player.party.forEach(Party.heal);
          await say(lobbyText("StartClockGetSetGo"));
          tick();
          TrainerTower.start(f, mode);
          return;
        }
      }
      break;
    }
    await say(lobbyText("PleaseVisitUsAgain"));
    Screen.say("");
    await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
  }
  // Back in the lobby having lost (TrainerTower_Lobby_EventScript_LostChallenge).
  async function towerLost() {
    const f = player.flags;
    await Overworld.act([{ who: "player", moves: ["face_right"] }]);
    await say(lobbyText("TooBadComeBackTryAgain"));
    Screen.say("");
    await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
    f.towerScene = 0;
    if (f.tower) f.tower.lost = false;
  }
  // The lobby's Time Board (TrainerTower_Lobby_EventScript_ShowRecords: PrintTrainerTowerRecords).
  async function towerTimeBoard() {
    const f = player.flags;
    const line = (mode) => TrainerTower.MODES[mode] + ": " + fill(T("TrainerTower_Text_XMinYZSec")[0], TrainerTower.time(TrainerTower.best(f, mode)));
    await say(["Time Board", line(0) + "\n" + line(1), line(2) + "\n" + line(3)]);
  }
  // A floor's battle (TrainerTower_EventScript_TriggerBattle): singles walk
  // up to you; a double battle's pair are waiting by its trigger (and won't
  // battle you without two Pokémon that can fight); in a Knockout the three
  // come one after another, the first from below, then above, then the
  // right. `side`: which of the double battle's triggers (0 top, 1 bottom).
  async function towerBattle(map, side) {
    const f = player.flags, n = towerFloorNo(map), fl = towerFloor(n), t = f.tower;
    const towards = async (who, dir) => {
      // (Up to you: from where they stand to the tile next to yours.)
      const me = Overworld.position(), p = Overworld.personPosition(who);
      const steps = !p ? 0 : dir === "left" ? p.x - me.x - 1 : dir === "up" ? p.y - me.y - 1 : me.y - p.y - 1;
      await Overworld.act([{ who, moves: Array(Math.max(0, steps)).fill("walk_" + dir) }]);
    };
    const spotted = async (who, trainer) => {
      music(trainer.music);
      await Overworld.act([{ who, moves: ["emote_exclamation_mark"] }]);
      await Overworld.act([{ who, moves: ["delay_16", "delay_16", "delay_16"] }]);
    };
    const fight = async (team, trainer, double, defeat) => {
      const outcome = await battle("trainer", { foe: { name: trainer.className + " " + trainer.name, team, pic: trainer.pic },
        defeatText: defeat, double, noBlackout: true, noExp: true, noPrize: true });
      if (outcome === "won") {
        show("world");
        await Overworld.resume();
        // (Battle Points for each trainer beaten: a double battle's two, both.)
        const bp = towerBP(n) * (double ? 2 : 1);
        f.bp = (f.bp || 0) + bp;
        await say("{PLAYER} earned " + bp + " BP!\n(" + f.bp + " BP in total.)");
        return true;
      }
      // TrainerTower_EventScript_WarpToLobbyLost: healed, and back to the lobby.
      player.party.forEach(Party.heal);
      t.lost = true;
      t.running = false;
      show("world");
      await Overworld.resume();
      await Overworld.teleport({ map: "TrainerTower_Lobby", x: 9, y: 7, facing: "right" });
      await towerLost();
      return false;
    };
    const level = TrainerTower.partyLevel(player.party), lines = (s) => [s];
    if (fl.type === "double") {
      if (!canDouble()) {
        sfx("se_ding_dong");
        await say(lobbyText("NeedTwoMonsForDouble"));
        Screen.say("");
        await Overworld.act([{ who: "player", moves: ["walk_left"] }]);
        return;
      }
      await spotted(side ? TOWER.D2 : TOWER.D1, fl.trainers[side]);
      tempFlags.add(map + ":doubles");
      await say(lines(fl.trainers[side].intro));
      await say(lines(fl.trainers[1 - side].intro));
      const pair = Object.assign({}, fl.trainers[0], { name: fl.trainers[0].name });
      if (!(await fight(TrainerTower.team(fl, 0, t.floorsCleared, level), pair, true, [fl.trainers[0].lose, fl.trainers[1].lose]))) return;
      await Overworld.act([{ who: TOWER.D2, moves: ["walk_right", "walk_up", "face_down"] }]);
      await Overworld.act([{ who: TOWER.D1, moves: ["face_down"] }]);
      t.floorsCleared++;
      return;
    }
    if (fl.type === "single") {
      await spotted(TOWER.S, fl.trainers[0]);
      tempFlags.add(map + ":singles");
      await towards(TOWER.S, "left");
      await say(lines(fl.trainers[0].intro));
      if (!(await fight(TrainerTower.team(fl, 0, t.floorsCleared, level), fl.trainers[0], false, [fl.trainers[0].lose]))) return;
      t.floorsCleared++;
      return;
    }
    // Knockout: below (walk_up), above (walk_down), then the right (walk_left).
    tempFlags.add(map + ":singles");
    const order = [[TOWER.K, "up"], [TOWER.D1, "down"], [TOWER.S, "left"]];
    for (let i = 0; i < 3; i++) {
      await spotted(order[i][0], fl.trainers[i]);
      await towards(order[i][0], order[i][1]);
      await say(lines(fl.trainers[i].intro));
      if (!(await fight(TrainerTower.team(fl, i, t.floorsCleared, level), fl.trainers[i], false, [fl.trainers[i].lose]))) return;
    }
    await Overworld.act([{ who: TOWER.S, moves: ["walk_up", "face_down"] }]);
    t.floorsCleared++;
  }
  // Talking to a floor's trainers after (TrainerTower_EventScript_SpeakTo*):
  // what they say after a battle.
  async function towerTrainerTalk(map, localId) {
    const n = towerFloorNo(map);
    if (!n) return;
    const fl = towerFloor(n), knockout = fl.type === "knockout";
    const i = { [TOWER.D1]: knockout ? 1 : 0, [TOWER.S]: knockout ? 2 : 0, [TOWER.K]: 0, [TOWER.D2]: 1 }[localId] || 0;
    await Overworld.act([{ who: localId, moves: ["face_player"] }]);
    await say([(fl.trainers[i] || fl.trainers[0]).after]);
  }
  // The owner, on the roof (TrainerTower_EventScript_SpeakToOwner): the
  // clock stops; the rewards (this game's: items and Battle Points every challenge,
  // by how fast it went, TrainerTower.rewards and finishBP); your time, a record or not.
  async function towerOwner() {
    const f = player.flags, R = (k) => T("TrainerTower_Roof_Text_" + k);
    tick();
    const t = f.tower || TrainerTower.start(f, 0);
    TrainerTower.records(f);
    t.running = false;
    if (!t.spokeToOwner) {
      t.spokeToOwner = true;
      await say(R("ImOwnerBattledPerfectly"));
      // (Your time, as the Time Board has it.)
      await say("Your time was\n" + fill(T("TrainerTower_Text_XMinYZSec")[0], TrainerTower.time(t.frames)) + "…");
      const items = TrainerTower.rewards(t.mode, t.frames);
      const pace = TrainerTower.pace(t.mode, t.frames);
      await say(pace === 3 ? "And so quickly, too! Here, these are for you." : pace === 2 ? "Not bad at all. Here, these are for you." : R("ThisIsForYou"));
      for (const item of items) {
        Player.addItem(player, item);
        await sayWithJingle("mus_level_up", "{PLAYER} obtained the " + Bag.name(item) + "!");
      }
      // (And Battle Points, by the same pace: TrainerTower.finishBP.)
      const bp = TrainerTower.finishBP(t.mode, t.frames);
      f.bp = (f.bp || 0) + bp;
      await say("{PLAYER} earned " + bp + " BP!\n(" + f.bp + " BP in total.)");
      const r = TrainerTower.finalTime(f);
      if (r === 0) await say(R("DoneItInRecordTime"));
      else if (r === 1) await say(R("TookSweetTimeGettingHere"));
    }
    else await say("Your time was\n" + fill(T("TrainerTower_Text_XMinYZSec")[0], TrainerTower.time(t.frames)) + "…");
    await say(R("IdLikeToSeeBetterTime"));
  }
  // ---------- Battle Points and the lobby's BP tutor (this game's own) ----------
  //
  // Each trainer beaten in Trainer Tower earns Battle Points (player.flags.bp):
  // 1 on floors 1-3, 2 on 4-6, 3 on 7 and 8. The man by the lobby's right-hand
  // counter teaches a Pokémon any of its tutor moves (every game's: its
  // learnset's tutor list, and FireRed's tutors' moves it can learn) for BP:
  // 16 for a status move, else by power: 8 up to 60, 16 up to 80, 24 up to
  // 100, 32 above.
  const towerBP = (floor) => (floor <= 3 ? 1 : floor <= 6 ? 2 : 3);
  function bpTutorPrice(move) {
    const m = window.MOVES[move];
    if (!m || m.cat === "Status" || !(m.power > 1)) return 16;
    return m.power <= 60 ? 8 : m.power <= 80 ? 16 : m.power <= 100 ? 24 : 32;
  }
  // (And Pokémon XD's: the four moves each of its Shadow Pokémon has on being
  // purified, window.XD_PURIFICATION_MOVES, Serebii's "Special Attacks".)
  function bpTutorMoves(record) {
    const set = window.LEARNSETS_GEN6[record.species] || window.LEARNSETS_GEN6[String(record.species).split("-")[0]] || {};
    const fr = Object.keys(window.TUTOR_LEARNERS || {}).filter((m) => window.TUTOR_LEARNERS[m].includes(record.species));
    const xd = window.XD_PURIFICATION_MOVES[Party.speciesName(record.species)] || [];
    return [...new Set((set.tutor || []).concat(fr, xd))].filter((m) => window.MOVES[m] && !Party.knowsMove(record, m)).sort();
  }
  const BP_TUTOR = "TrainerTower_Lobby_EventScript_BPTutor";
  {
    const m = window.WORLD_MAPS.TrainerTower_Lobby;
    if (m && !m.people.some((p) => p.script === BP_TUTOR)) {
      m.people.push({ id: 951, x: 17, y: 12, movement: "face_left", rangeX: 0, rangeY: 0, script: BP_TUTOR, flag: null,
        text: null, localId: "LOCALID_TOWER_BP_TUTOR", sprite: "gentleman", width: 16, height: 32, frames: 10 });
    }
    SPECIAL.add(BP_TUTOR);
  }
  // ---------- Route 40's Battle Tower (Crystal's; this game's own) ----------
  //
  // Crystal's Battle Tower stands north of Route 40, through the gatehouse
  // where HGSS has its Battle Frontier (which this game hasn't got): FireRed's
  // Trainer Tower lobby, drawn again here, stands in for Crystal's. At the
  // counter (or its receptionist) choose a level, 10 to 100 by tens, and three
  // Pokémon at or under it, no two of one species, none holding the same item
  // as another, no Eggs (Crystal's rules); then seven battles in a row against
  // the Trainer Tower's trainers (three of their six Pokémon each, FireRed's
  // sets, at the chosen level), your three healed between battles, no Exp. or
  // money, and you may stop between them. The battles are in a room of their
  // own (Emerald's Battle Tower's battle room): each Trainer walks in, and out
  // again once beaten, and the next walks in. Battle Points for each win, and
  // a bonus for all seven with the level's prize (Crystal's vitamins and PP
  // Ups at the lower levels, Rare Candies and better above); lose and the
  // challenge ends. The nurse heals, the clerk is the BP Shop, and the BP
  // tutors (the Trainer Tower's) teach for BP. The stairs up are gone (no
  // floors above). The sign keeps your best streak at each level.
  const BATTLE_TOWER = "BattleTower_Lobby", BT_ENTRY = "BattleTower_Lobby_EventScript_EntryTrigger", BT_RECEPTION = "BattleTower_Lobby_EventScript_Receptionist",
    BT_NURSE = "BattleTower_Lobby_EventScript_Nurse", BT_SIGN = "BattleTower_Lobby_EventScript_Sign";
  const BT_BATTLES = 7;
  // (The level: your three's highest, the trainers' Pokémon scaled to it; the
  // BP by it, and the prizes Trainer Tower's, more of them the higher.)
  const btBP = (level) => 3 + Math.floor(level / 20), btWinBP = (level) => 1 + Math.floor(level / 50);
  const BT_ROOM = "BattleTower_BattleRoom", BT_FOE = "LOCALID_BATTLE_TOWER_OPPONENT";
  const btLevel = (team) => Math.max(...team.map((r) => r.level));
  const btRewards = (level) => TrainerTower.rewardsAt(level < 40 ? 1 : level < 70 ? 2 : 3, 2);
  {
    const src = window.WORLD_MAPS.TrainerTower_Lobby, gate = window.WORLD_MAPS.Route40_BattleFrontierGatehouse;
    if (src && gate && !window.WORLD_MAPS[BATTLE_TOWER]) {
      const m = JSON.parse(JSON.stringify(src));
      const person = (localId, script) => Object.assign({}, src.people.find((p) => p.localId === localId), { script, localId: localId.replace("TOWER", "BATTLE_TOWER") });
      Object.assign(m, { name: BATTLE_TOWER, title: "Battle Tower", region: "johto", image: "TrainerTower_Lobby", patches: {}, showName: true,
        warps: [{ x: 9, y: 15, map: "Route40_BattleFrontierGatehouse", warp: 1 }],
        signs: [{ x: 8, y: 10, script: BT_SIGN, text: null }],
        triggers: [{ x: 9, y: 7, script: BT_ENTRY }],
        people: [person("LOCALID_TOWER_NURSE", BT_NURSE), person("LOCALID_TOWER_MART_CLERK", "TrainerTower_Lobby_EventScript_MartClerk"),
          person("LOCALID_TOWER_RECEPTIONIST", BT_RECEPTION),
          // (The BP tutors, the Trainer Tower's: their moves, and the Egg moves.)
          { id: 951, x: 17, y: 12, movement: "face_left", rangeX: 0, rangeY: 0, script: "TrainerTower_Lobby_EventScript_BPTutor", flag: null,
            text: null, localId: "LOCALID_BATTLE_TOWER_BP_TUTOR", sprite: "gentleman", width: 16, height: 32, frames: 10 },
          { id: 952, x: 17, y: 14, movement: "face_left", rangeX: 0, rangeY: 0, script: "TrainerTower_Lobby_EventScript_BPEggTutor", flag: null,
            text: null, localId: "LOCALID_BATTLE_TOWER_BP_EGG_TUTOR", sprite: "old_woman", width: 16, height: 32, frames: 9 }] });
      // (No floors above: the stairs are walled over, the corridor's wall and floor drawn on, as the patch "nostairs"
      // (assets/world/maps/TrainerTower_Lobby-patch-nostairs.png: the corridor's column beside them); no elevator.)
      m.patches = { nostairs: { x: 9, y: 0, w: 3, h: 4, top: false, collision: [[10, 2, 0], [11, 2, 0], [10, 3, 0], [11, 3, 0]] } };
      m.collision[8 * m.width + 17] = 1;
      window.WORLD_MAPS[BATTLE_TOWER] = m;
      // (The battle room: Emerald's Battle Tower's, its attendant at the side.)
      const room = window.WORLD_MAPS.BattleFrontier_BattleTowerBattleRoom;
      if (room) window.WORLD_MAPS[BT_ROOM] = Object.assign(JSON.parse(JSON.stringify(room)), { name: BT_ROOM, title: "Battle Tower", region: "johto",
        image: room.name, music: m.music, showName: false, warps: [], signs: [], triggers: [], townMapSection: m.townMapSection,
        people: room.people.filter((p) => p.localId === "LOCALID_TOWER_BATTLE_ATTENDANT_1").map((p) => Object.assign({}, p, { script: null, flag: null })) });
      // (The gatehouse's door to the Battle Frontier's way in: HGSS's second, at its north wall; on the gatehouse
      // drawn from Pokémon Heart & Soul's, the door that leads there, where it is.)
      const fi = gate.warps.findIndex((w) => w.map === "BattleFrontier_FrontierAccess"), gi = gate.hgss && fi >= 0 ? fi : 1;
      gate.warps[gi] = Object.assign(gate.hgss && fi >= 0 ? { x: gate.warps[gi].x, y: gate.warps[gi].y } : { x: 4, y: 1 }, { map: BATTLE_TOWER, warp: 0 });
      m.warps[0].warp = gi;
    }
    for (const sc of [BT_ENTRY, BT_RECEPTION, BT_NURSE, BT_SIGN]) SPECIAL.add(sc);
  }
  const btRecords = () => player.flags.battleTower || (player.flags.battleTower = { best: {} });
  // Every Trainer Tower trainer who battles alone (the singles' and the
  // knockout trios'; the double battles' pairs share a name).
  const btTrainers = () => Object.values(window.TRAINER_TOWER.floors).flatMap((fl) => fl.trainers).filter((t) => !/&/.test(t.name));
  async function battleTowerEntry() {
    player.flags.battleTowerScene = 1;
    await Overworld.act([{ who: "player", moves: ["face_right"] }]);
    await say(["Welcome to the Battle Tower!", "Here, Trainers from far and wide take\non seven battles in a row, against\nPokémon as strong as their own."]);
    await battleTowerChallenge();
  }
  async function battleTowerReception() {
    await say("Welcome to the Battle Tower!");
    await battleTowerChallenge();
  }
  async function battleTowerSign() {
    const best = btRecords().best.open || 0;
    await say(["Battle Tower\nSeven battles in a row, against Pokémon\nas strong as your own."].concat(best ? ["Your best: " + best + " win" + (best > 1 ? "s" : "") + " in a row."] : ["No records yet."]));
  }
  // Why three Pokémon can't enter at `level` (Crystal's rules), or null.
  function btTeamProblem(team) {
    if (team.some((r) => r.egg)) return "An Egg can't enter.";
    const species = team.map((r) => Party.speciesName(r.species));
    if (new Set(species).size < species.length) return "No two of the same Pokémon\nmay enter.";
    const items = team.map((r) => r.item).filter(Boolean);
    if (new Set(items).size < items.length) return "No two may hold the same item.";
    return null;
  }
  async function battleTowerChallenge() {
    for (;;) {
      const i = await multichoice("Would you like to take the\nBattle Tower challenge?", 18, 6, ["Yes", "No", "Info"]);
      if (i === 2) {
        await say(["Choose three Pokémon. The Trainers'\nPokémon will be as strong as your\nstrongest.", "No two of the same Pokémon, and no\ntwo holding the same item.",
          "Every win earns Battle Points. Beat\nall seven Trainers in a row for\nprizes and bonus BP!", "Your Pokémon are healed between\nbattles."]);
        continue;
      }
      if (i !== 0) break;
      if (player.party.filter((r) => !r.egg).length < 3) { await say("You need three Pokémon to enter."); continue; }
      const chosen = await chooseBattleTeam(3);
      if (!chosen) continue;
      const team = chosen.map((k) => player.party[k]);
      const problem = btTeamProblem(team);
      if (problem) { await say(problem); continue; }
      await say("Then let the Battle Tower challenge\nbegin! Good luck!");
      Screen.say("");
      await battleTowerStreak(btLevel(team), chosen);
      return;
    }
    await say("Please come again!");
    Screen.say("");
  }
  // (The Trainer Tower's trainers, on the map: FireRed's people dressed as their class.)
  const BT_LOOKS = { biker: "rocker", fisherman: "fisher", engineer: "worker_m", aroma_lady: "woman_1", lady: "woman_2", pokemon_breeder: "woman_2",
    swimmer_m: "swimmer_m_land", swimmer_f: "swimmer_f_land", tuber_f: "lass", burglar: "balding_man", cue_ball: "balding_man", juggler: "man",
    psychic_m: "channeler", super_nerd: "poke_maniac", pokemon_ranger_f: "cooltrainer_f", pokemon_ranger_m: "cooltrainer_m" };
  const btLook = (pic) => ({ sprite: BT_LOOKS[pic] || (["sailor", "bug_catcher", "youngster", "camper", "hiker", "black_belt", "picnicker", "cooltrainer_f",
    "cooltrainer_m", "gentleman", "beauty", "lass", "rocker", "scientist", "crush_girl"].includes(pic) ? pic : "boy"), width: 16, height: 32, frames: 10 });
  async function battleTowerStreak(level, chosen) {
    const f = player.flags, team = chosen.map((k) => player.party[k]);
    team.forEach(Party.heal);
    const pool = btTrainers().slice();
    let wins = 0;
    const noteBest = () => { const best = btRecords().best; if (wins > (best.open || 0)) best.open = wins; };
    const earn = async (bp) => { f.bp = (f.bp || 0) + bp; await say("{PLAYER} earned " + bp + " BP!\n(" + f.bp + " BP in total.)"); };
    // (In: through the room's door, up to the court; out: back to the lobby, at the corridor's top.)
    sfx("se_exit");
    await Overworld.teleport({ map: BT_ROOM, x: 4, y: 8, facing: "up" });
    await Overworld.act([{ who: "player", moves: ["walk_up", "walk_up", "walk_up", "face_right"] }]);
    const leave = async () => {
      Screen.say("");
      sfx("se_exit");
      await Overworld.teleport({ map: BATTLE_TOWER, x: 9, y: 3, facing: "down" });
      await persist();
    };
    for (let n = 1; n <= BT_BATTLES; n++) {
      const t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      const mons = t.mons.slice().sort(() => Math.random() - 0.5).slice(0, 3).map((m) => TrainerTower.mon(m, level));
      Overworld.addObject(BT_FOE, { x: 5, y: 1, facing: "down" }, btLook(t.pic));
      await Overworld.act([{ who: BT_FOE, moves: ["walk_down", "walk_down", "walk_down", "walk_down", "face_left"] }]);
      await say("Battle " + n + " of " + BT_BATTLES + ":\n" + t.className + " " + t.name + "!");
      await say([t.intro]);
      const outcome = await battle("trainer", { foe: { name: t.className + " " + t.name, team: mons, pic: t.pic }, defeatText: [t.lose],
        noBlackout: true, noExp: true, noPrize: true, chosen });
      show("world");
      await Overworld.resume();
      if (outcome !== "won") {
        player.party.forEach(Party.heal);
        noteBest();
        await say(["Too bad... Your challenge ends at\n" + wins + " win" + (wins === 1 ? "" : "s") + ".", "Please try again!"]);
        Overworld.removeObject(BT_FOE);
        await leave();
        return;
      }
      wins++;
      team.forEach(Party.heal);
      await Overworld.act([{ who: BT_FOE, moves: ["walk_up", "walk_up", "walk_up", "walk_up"] }]);
      Overworld.removeObject(BT_FOE);
      await earn(btWinBP(level));
      if (n < BT_BATTLES) {
        await say("That's " + wins + " in a row! Your Pokémon\nhave been healed.");
        if (!(await confirm("Go on to the next battle?"))) {
          noteBest();
          await say("Then your challenge ends at\n" + wins + " win" + (wins === 1 ? "" : "s") + ". Well done!");
          await leave();
          return;
        }
        Screen.say("");
      }
    }
    noteBest();
    await say(["Congratulations! You've beaten all\nseven Trainers!", "Here are your prizes."]);
    for (const prize of btRewards(level)) {
      Player.addItem(player, prize);
      await sayWithJingle("mus_level_up", "{PLAYER} received the " + Bag.name(prize) + "!");
    }
    await earn(btBP(level));
    await leave();
  }

  // ---------- Stadium Island (this game's own: Pokémon Stadium's Cups and Gym Leader Castle) ----------
  //
  // A Sevii island, by Seagallop from Vermilion with the Rainbow Pass (the
  // sailor offers it beside the Sevii Islands). Its Stadium's lobby is the
  // Trainer Tower's, cloned at load (the receptionist's counter is the Cups',
  // the clerk's the Gym Leader Castle's, and the nurse heals).
  //
  // The Cups (Pokémon Stadium's): the Pika Cup (Lv. 15-20, 50 in all, Pokémon
  // that can still evolve), the Petit Cup (Lv. 25-30, 80 in all, under 2 m and
  // 20 kg), the Poké Cup (Lv. 50-55, 155 in all, no Legendaries) and the Prime
  // Cup (Lv. 100, anything). Choose three; they're set to the level the rules
  // allow (copies: yours aren't touched), and eight Trainers in a row, three
  // Pokémon each, better and better ones; your three are healed between
  // battles and you may stop. Win all eight for the Cup's prize, Battle Points
  // and its trophy. The Gym Leader Castle: Kanto's eight Gym Leaders, then,
  // once you've beaten them, the Elite Four and the Champion, at your best's
  // level, your three as they are. game/trainer-tower.js's Stadium has the rules.
  const STADIUM_LOBBY = "StadiumIsland_Stadium", ST_CUPS = "StadiumIsland_Stadium_EventScript_Cups", ST_CASTLE = "StadiumIsland_Stadium_EventScript_Castle",
    ST_NURSE = "StadiumIsland_Stadium_EventScript_Nurse", ST_SIGN = "StadiumIsland_Stadium_EventScript_Sign";
  {
    const src = window.WORLD_MAPS.TrainerTower_Lobby, isle = window.WORLD_MAPS.StadiumIsland;
    if (src && isle && !window.WORLD_MAPS[STADIUM_LOBBY]) {
      const m = JSON.parse(JSON.stringify(src));
      const person = (localId, script) => Object.assign({}, src.people.find((p) => p.localId === localId), { script, localId: localId.replace("TOWER", "STADIUM") });
      Object.assign(m, { name: STADIUM_LOBBY, title: "Pokémon Stadium", image: "TrainerTower_Lobby", patches: {}, showName: true, townMapSection: "SEVEN_ISLAND",
        warps: [{ x: 9, y: 15, map: "StadiumIsland", warp: 0 }],
        signs: [{ x: 8, y: 10, script: ST_SIGN, text: null }], triggers: [],
        people: [person("LOCALID_TOWER_NURSE", ST_NURSE), person("LOCALID_TOWER_RECEPTIONIST", ST_CUPS), person("LOCALID_TOWER_MART_CLERK", ST_CASTLE)] });
      m.collision[2 * m.width + 9] = 1;
      m.collision[8 * m.width + 17] = 1;
      window.WORLD_MAPS[STADIUM_LOBBY] = m;
    }
    for (const sc of [ST_CUPS, ST_CASTLE, ST_NURSE, ST_SIGN, "StadiumIsland_EventScript_Sailor", "StadiumIsland_EventScript_StadiumSign",
      "StadiumIsland_EventScript_PierSign", "StadiumIsland_EventScript_Spectator"]) SPECIAL.add(sc);
  }
  const STADIUM_BANTER = ["I come here every week! The Cups are\nsomething else.", "They say the Prime Cup's trainers\nare ruthless.", "The Gym Leader Castle! I'd love to see\nthe Elite Four battle.",
    "The Stadium's so big! I got lost\ninside for ten minutes.", "Bring three Pokémon you trust.\nThat's the first rule here."];
  async function stadiumSpectator(person) {
    const k = ((person && person.id) | 0) % STADIUM_BANTER.length;
    await say(STADIUM_BANTER[k]);
  }
  // The Seagallop's sailor: home to Vermilion.
  async function stadiumSailor() {
    await say("Welcome to Stadium Island!\nWant to sail back to Vermilion?");
    if (!(await confirm("Sail to Vermilion City?"))) { await say("Take your time. The Cups aren't\ngoing anywhere."); return; }
    await say("Aye, aye! All aboard!");
    Screen.say("");
    const p = Sevii.port("VERMILION_CITY");
    await ferry({ map: p.map, x: p.x, y: p.y, facing: "up" }, true);
  }
  async function stadiumSign() {
    const r = Stadium.records(player.flags), keys = Object.keys(Stadium.CUPS);
    const lines = keys.map((k) => Stadium.CUPS[k].name + ": " + (r.cups[k] && r.cups[k].cleared ? "won x" + r.cups[k].cleared : "not won yet"));
    await say(["Pokémon Stadium\nHall of Trophies", lines.slice(0, 2).join("\n"), lines.slice(2).join("\n"),
      "Gym Leader Castle: " + (r.castle[0] ? "Round 1 cleared" : "Round 1 to win") + "\n" + (r.castle[1] ? "Round 2 cleared" : r.castle[0] ? "Round 2 open" : "Round 2 locked")]);
  }
  // Three of your Pokémon for a Stadium challenge (null: backed out).
  async function stadiumTeam(problemOf) {
    for (;;) {
      if (player.party.filter((r) => !r.egg).length < 3) { await say("You need three Pokémon to enter."); return null; }
      const chosen = await chooseBattleTeam(3);
      if (!chosen) return null;
      const problem = problemOf(chosen.map((k) => player.party[k]));
      if (problem) { await say(problem); continue; }
      return chosen;
    }
  }
  async function stadiumCups() {
    const f = player.flags, rec = Stadium.records(f), keys = Object.keys(Stadium.CUPS);
    await say("Welcome to the Pokémon Stadium!\nThe Cups are held right here.");
    for (;;) {
      const i = await multichoice("Which Cup will you enter?", 14, 2, keys.map((k) => Stadium.CUPS[k].name).concat(["Rules", "Exit"]));
      if (i < 0 || i === keys.length + 1) break;
      if (i === keys.length) { await say(keys.map((k) => Stadium.CUPS[k].name + "\n" + Stadium.CUPS[k].text)); continue; }
      const key = keys[i], cup = Stadium.CUPS[key];
      await say([cup.name + "!\n" + cup.text, "Eight Trainers in a row. Your Pokémon\nare set to Lv. " + Stadium.cupLevel(key) + " for it."]);
      if (!(await confirm("Enter the " + cup.name + "?"))) continue;
      const chosen = await stadiumTeam((team) => Stadium.cupProblem(key, team));
      if (!chosen) continue;
      await say("Then let the " + cup.name + "\nbegin! Good luck!");
      Screen.say("");
      await stadiumCup(key, chosen);
      return;
    }
    await say("Come back for the Cups anytime!");
    Screen.say("");
  }
  // Your three, scaled copies, as your party while the Cup lasts.
  async function stadiumCup(key, chosen) {
    const f = player.flags, rec = Stadium.records(f), cup = Stadium.CUPS[key], R = window.STADIUM.rounds;
    const orig = player.party;
    const clones = chosen.map((k) => Stadium.scaled(key, orig[k]));
    f.stadiumParty = orig;
    player.party = clones;
    let wins = 0;
    try {
      const personas = Stadium.rivals();
      for (let n = 1; n <= R; n++) {
        const foe = Stadium.opponent(key, n, personas[n - 1]);
        await say("Round " + n + " of " + R + ":\n" + foe.className + " " + foe.name + "!");
        await say([foe.intro]);
        const outcome = await battle("trainer", { foe: { name: foe.className + " " + foe.name, team: foe.mons, pic: foe.pic }, defeatText: [foe.lose],
          noBlackout: true, noExp: true, noPrize: true, chosen: [0, 1, 2], music: "mus_vs_gym_leader" });
        show("world");
        await Overworld.resume();
        if (outcome !== "won") { await say(["Too bad... Your " + cup.name + " ends at\n" + wins + " win" + (wins === 1 ? "" : "s") + ".", "Please try again!"]); break; }
        wins++;
        clones.forEach(Party.heal);
        if (n < R) {
          await say("That's " + wins + " in a row! Your Pokémon\nhave been healed.");
          if (!(await confirm("Go on to the next round?"))) { await say("Then your " + cup.name + " ends at\n" + wins + " wins. Well done!"); break; }
        }
      }
    } finally {
      player.party = orig;
      delete f.stadiumParty;
    }
    const best = rec.cups[key] || (rec.cups[key] = { best: 0, cleared: 0 });
    if (wins > best.best) best.best = wins;
    if (wins < R) { await persist(); return; }
    best.cleared++;
    await say(["Congratulations! You've won the\n" + cup.name + "!", "Here are your prizes."]);
    for (const prize of TrainerTower.rewardsAt(cup.tier, cup.tier + 1)) {
      Player.addItem(player, prize);
      await sayWithJingle("mus_level_up", "{PLAYER} received the " + Bag.name(prize) + "!");
    }
    f.bp = (f.bp || 0) + cup.bp;
    await say("{PLAYER} earned " + cup.bp + " BP!\n(" + f.bp + " BP in total.)");
    await persist();
  }
  async function stadiumCastle() {
    const f = player.flags, rec = Stadium.records(f);
    await say("This is the Gym Leader Castle!\nBattle Kanto's Gym Leaders here.");
    for (;;) {
      const items = ["Round 1: Gym Leaders", rec.castle[0] ? "Round 2: Elite Four" : "Round 2 (locked)", "Info", "Exit"];
      const i = await multichoice("Which round will you challenge?", 11, 4, items);
      if (i < 0 || i === 3) break;
      if (i === 2) { await say(["Round 1: Brock, Misty, Lt. Surge, Erika,\nKoga, Sabrina, Blaine and Giovanni.", "Round 2, once Round 1's won: the Elite Four\nand the Champion.", "Choose three Pokémon. The Trainers'\nPokémon match your strongest's level."]); continue; }
      const round = i;
      if (round === 1 && !rec.castle[0]) { await say("Win Round 1 first!"); continue; }
      const chosen = await stadiumTeam(() => null);
      if (!chosen) continue;
      await say("Then let the battles begin!\nGood luck!");
      Screen.say("");
      await stadiumCastleRound(round, chosen);
      return;
    }
    await say("Come back anytime!");
    Screen.say("");
  }
  async function stadiumCastleRound(round, chosen) {
    const f = player.flags, rec = Stadium.records(f), team = chosen.map((k) => player.party[k]);
    team.forEach(Party.heal);
    const level = Math.min(100, Math.max(30, Math.max(...team.map((r) => r.level))) + (round ? 3 : 0));
    const list = window.STADIUM.castle[round];
    let wins = 0;
    for (let n = 0; n < list.length; n++) {
      const foe = Stadium.castleFoe(round, n, level);
      await say([foe.className + " " + foe.name + " waits!", foe.intro]);
      const outcome = await battle("trainer", { foe: { name: foe.className + " " + foe.name, team: foe.mons, pic: foe.pic }, defeatText: [foe.lose],
        noBlackout: true, noExp: true, noPrize: true, chosen, music: round ? "mus_vs_champion" : "mus_vs_gym_leader" });
      show("world");
      await Overworld.resume();
      if (outcome !== "won") {
        player.party.forEach(Party.heal);
        await say(["Too bad... Round " + (round + 1) + " ends at\n" + wins + " win" + (wins === 1 ? "" : "s") + ".", "Please try again!"]);
        return;
      }
      wins++;
      team.forEach(Party.heal);
      if (n < list.length - 1) {
        await say("That's " + wins + " in a row! Your Pokémon\nhave been healed.");
        if (!(await confirm("Go on to the next battle?"))) { await say("Then your challenge ends at\n" + wins + " wins. Well done!"); return; }
      }
    }
    const first = !rec.castle[round];
    rec.castle[round] = true;
    await say(round ? ["Congratulations! You've beaten the Elite Four\nand the Champion!", "Here are your prizes."] : ["Congratulations! You've beaten all\neight Gym Leaders!", "Here are your prizes."]);
    for (const prize of TrainerTower.rewardsAt(3, 3)) {
      Player.addItem(player, prize);
      await sayWithJingle("mus_level_up", "{PLAYER} received the " + Bag.name(prize) + "!");
    }
    if (round && first && window.STADIUM.castlePrizes.masterBall) {
      Player.addItem(player, "master-ball");
      await sayWithJingle("mus_level_up", "{PLAYER} received the " + Bag.name("master-ball") + "!");
    }
    const bp = window.STADIUM.castlePrizes.bp[round];
    f.bp = (f.bp || 0) + bp;
    await say("{PLAYER} earned " + bp + " BP!\n(" + f.bp + " BP in total.)");
    await persist();
  }
  // Its Egg moves (every game's): its own Egg list and its evolution line's,
  // the first stage's being where they're kept.
  function bpEggMoves(record) {
    const sets = window.LEARNSETS_GEN6, out = [];
    for (const sp of evolutionLine(record.species)) {
      const set = sets[sp] || sets[String(sp).split("-")[0]] || {};
      for (const m of set.egg || []) if (window.MOVES[m] && !Party.knowsMove(record, m) && !out.includes(m)) out.push(m);
    }
    return out.sort();
  }
  const BP_EGG_TUTOR = "TrainerTower_Lobby_EventScript_BPEggTutor";
  {
    const m = window.WORLD_MAPS.TrainerTower_Lobby;
    if (m && !m.people.some((p) => p.script === BP_EGG_TUTOR)) {
      m.people.push({ id: 952, x: 17, y: 14, movement: "face_left", rangeX: 0, rangeY: 0, script: BP_EGG_TUTOR, flag: null,
        text: null, localId: "LOCALID_TOWER_BP_EGG_TUTOR", sprite: "old_woman", width: 16, height: 32, frames: 9 });
    }
    SPECIAL.add(BP_EGG_TUTOR);
  }
  const bpTutor = () => bpTeacher(bpTutorMoves, ["I teach Pokémon moves from tutors\nall over the world.", "In exchange, I ask for the Battle\nPoints you earn in battle."]);
  // (The lady beside him: the Egg moves a Pokémon could have hatched knowing.)
  const bpEggTutor = () => bpTeacher(bpEggMoves, ["I teach Pokémon the moves they\ncould have hatched knowing.", "In exchange, I ask for the Battle\nPoints you earn in battle."]);
  async function bpTeacher(movesOf, intro) {
    const f = player.flags, bpTutorMoves = movesOf;
    await say(intro);
    for (;;) {
      if (!(await confirm("Shall I teach a Pokémon a move?\n(You have " + (f.bp || 0) + " BP.)"))) break;
      const notes = player.party.map((r) => (r.egg || !bpTutorMoves(r).length ? "NOT ABLE" : "ABLE"));
      const r = await choosePartyFor("Teach which {PKMN}?", null, notes);
      show("world");
      if (!r) continue;
      if (r.egg) { await say(T("TwoIsland_House_Text_CantTeachAnEgg")); continue; }
      const moves = bpTutorMoves(r);
      if (!moves.length) { await say("Sorry… There's no move I can teach\nthat Pokémon."); continue; }
      Screen.say("");
      clearMenu();
      // (The Move Relearner's screen, each move's price in BP.)
      const move = await MoveRelearner.open({
        name: Party.displayName(r), moves, known: r.moves.map((m) => m.name), frame: GameOptions.get().frame,
        note: (m) => (m ? bpTutorPrice(m) + " BP (you have " + (f.bp || 0) + ")" : ""),
        price: (m) => bpTutorPrice(m) + " BP",
        afford: (m) => (f.bp || 0) >= bpTutorPrice(m), short: "You don't have enough BP.",
        forget: (m) => chooseMoveToForget(r, m),
        teach: (m, slot) => Party.teachMove(r, m, slot == null ? undefined : slot)
      });
      if (move && Party.knowsMove(r, move)) {
        f.bp -= bpTutorPrice(move);
        await say("{PLAYER} handed over " + bpTutorPrice(move) + " BP.\n(" + f.bp + " BP left.)");
        await persist();
      }
    }
    await say("Earn more BP in the tower, and\ncome back anytime.");
  }
  // The lobby's shop takes BP instead of money (this game's own): Bottle Caps
  // (Gold, and Tin), every mint, the six vitamins and the competitive held
  // items (as the Battle Frontier's BP shops had them): 48 BP the staples,
  // 32 the rest, 16 the small ones.
  const BP_HELD = [
    ["choice-band", 48], ["choice-specs", 48], ["choice-scarf", 48], ["leftovers", 48], ["life-orb", 48], ["assault-vest", 48],
    ["rocky-helmet", 48], ["eviolite", 48], ["focus-sash", 48], ["eject-button", 32], ["red-card", 32], ["expert-belt", 32],
    ["weakness-policy", 32], ["shell-bell", 32], ["black-sludge", 32], ["light-clay", 32], ["big-root", 32], ["air-balloon", 32],
    ["safety-goggles", 32], ["destiny-knot", 32], ["ability-capsule", 32], ["ability-patch", 64],
    ["flame-orb", 16], ["toxic-orb", 16], ["scope-lens", 16], ["wide-lens", 16], ["muscle-band", 16], ["wise-glasses", 16],
    ["quick-claw", 16], ["razor-claw", 16], ["focus-band", 16], ["power-herb", 16], ["white-herb", 16],
    ["sitrus-berry", 16], ["lum-berry", 16]
  ].filter(([id]) => window.ITEMS[id]);
  const BP_SHOP = [["bottle-cap", 25], ["gold-bottle-cap", 75], ["tin-bottle-cap", 10]]
    .concat(Object.keys(window.ITEMS).filter((id) => Bag.mintNature(id)).sort().map((id) => [id, 25]))
    .concat(["hp-up", "protein", "iron", "calcium", "zinc", "carbos"].map((id) => [id, 2]))
    .concat(BP_HELD);
  async function bpShop() {
    const f = player.flags, at = Overworld.position(), [dx, dy] = (World.DIRS || {})[at.facing] || [1, 0];
    await say(["Welcome to the BP Shop!", "Battle Points from the tower buy\nthings here. (You have " + (f.bp || 0) + " BP.)"]);
    Screen.say("");
    clearMenu();
    await ShopScreen.open({
      frame: GameOptions.get().frame,
      items: BP_SHOP.map(([id, price]) => ({ id, name: Bag.name(id), price, desc: Bag.description(id), icon: Bag.sprite(id) })),
      money: () => f.bp || 0,
      currency: { label: "BP", unit: (n) => n + " BP", short: "You don't have enough BP." },
      inBag: (id) => Player.itemCount(player, id),
      limit: () => ({ max: 99 }),
      buy: (id, n) => {
        if (Player.itemCount(player, id) + n > 999) return { error: "You have no more room for this\nitem." };
        f.bp = (f.bp || 0) - BP_SHOP.find((x) => x[0] === id)[1] * n;
        Player.addItem(player, id, n);
        persist();
        return null;
      },
      map: { canvas: $("#world"), x: 112 + 16 * dx, y: 64 + 16 * dy }
    });
    ShopScreen.close();
    show("world");
    await say("Please come again!");
  }
  // The elevator down from the roof (TrainerTower_Elevator_EventScript_FloorSelect):
  // Rooftop or B1F (FireRed's names); down it goes, and out at the lobby's
  // counter, its barrier opening and shutting behind you
  // (TrainerTower_Lobby_EventScript_ExitElevator).
  async function towerElevator() {
    const f = player.flags, here = f.dynamicWarp && f.dynamicWarp.map === "TrainerTower_Lobby" ? 1 : 0, labels = ["Rooftop", "B1F"];
    GbaMenus.fieldWindow("floor", { label: labels[here] });
    await Screen.prompt(T("Text_WantWhichFloor")[0]);
    const v = await GbaMenus.multichoice($("#overlay"), { left: 0, top: 0, items: labels.concat(["Exit"]), cursor: here, frame: GameOptions.get().frame });
    GbaMenus.fieldWindow("floor", null);
    Screen.say("");
    if (v !== 1 || here === 1) return;
    setDynamicWarp({ map: "TrainerTower_Lobby", x: 17, y: 8 });
    sfx("se_elevator");
    await Overworld.shake(ELEVATOR_SHAKES[1]);
    sfx("se_ding_dong");
    await sleep(417);
    await Overworld.act([{ who: "player", moves: ["walk_in_place_faster_down", "delay_16", "walk_down", "walk_right", "walk_right"] }]);
    towerCounterOpen = true;
    await Overworld.teleport({ map: "TrainerTower_Lobby", x: 17, y: 8, facing: "down" });
    // (Out past the counter: FireRed's two steps leave you on its flap, (17, 10),
    // as it shuts; a third takes you clear of it.)
    await Overworld.act([{ who: "player", moves: ["walk_down", "walk_down", "walk_down"] }]);
    towerCounterOpen = false;
    applyPatches("TrainerTower_Lobby");
    sfx("se_click");
  }

  // ---------- Cinnabar Island ----------

  // Blaine: battle (talking to him), then the Volcano Badge and TM38 Fire
  // Blast. Beating him also beats his Gym's trainers and opens all its doors.
  // Bill's then waiting outside to take you to the Sevii Islands
  // (VAR_MAP_SCENE_CINNABAR_ISLAND 1: flags.cinnabarScene).
  // His team (this game's): Magmortar and Magcargo in place of FireRed's
  // Growlithe and Ponyta, FireRed's Rapidash and Arcanine, and his ace,
  // Houndoom with its Houndoominite: it Mega Evolves and Terastallizes into a Dark type.
  function blaineTeam() {
    const [, , rapidash, arcanine] = trainerTeam("TRAINER_LEADER_BLAINE");
    return [Party.create("Magmortar", 43, { ivs: 0 }), Party.create("Magcargo", 42, { ivs: 0 }),
      rapidash, arcanine, Object.assign(Party.create("Houndoom", 48, { ivs: 0 }), { item: "houndoominite", teraType: "Dark", teraAce: true })];
  }
  async function blaine(person) {
    const f = player.flags, ID = "TRAINER_LEADER_BLAINE";
    if (!f[ID]) {
      await say(person.trainer.intro);
      if (!canBattle()) return;
      const outcome = await battle("trainer", { foe: { name: "Leader Blaine", team: blaineTeam(), pic: "leader_blaine", tera: true },
        defeatText: person.trainer.defeat, trainerId: ID, terrain: "leader" });
      if (outcome !== "won") return;
      if (!hasBadge("volcano")) player.badges.push("volcano");
      for (const t of ["SUPER_NERD_ERIK", "SUPER_NERD_AVERY", "SUPER_NERD_DEREK", "SUPER_NERD_ZAC", "BURGLAR_QUINN", "BURGLAR_RAMON", "BURGLAR_DUSTY"]) f["TRAINER_" + t] = true;
      player.flags.lastCenter = "CinnabarIsland_PokemonCenter_1F";
      if (!f.cinnabarScene) f.cinnabarScene = 1;
      applyPatches("CinnabarIsland_Gym");
      show("world");
      await Overworld.resume();
    }
    const tm = machineFor("Fire Blast");
    if (!f.gotTM38FromBlaine) {
      await say(T("CinnabarIsland_Gym_Text_ExplainVolcanoBadge"));
      Player.addItem(player, tm);
      f.gotTM38FromBlaine = true;
      await sayWithJingle(itemJingle(tm), tmText(T("CinnabarIsland_Gym_Text_ReceivedTM38FromBlaine"), 38, tm));
      await say(tmText(T("CinnabarIsland_Gym_Text_FireBlastIsUltimateFireMove"), 38, tm));
      return;
    }
    await say(tmText(T("CinnabarIsland_Gym_Text_BlainePostBattle"), 38, tm));
  }

  // The Gym's quiz machines (CinnabarIsland_Gym_EventScript_Quiz1..6): answer
  // right and the door past them opens; wrong, and the trainer guarding it
  // comes over to battle (once beaten, nobody comes), and beating them opens it too.
  // Each machine's answer (YES or NO), the trainer by it, and how they come over
  // from the left machine or the right one.
  const CINNABAR_QUIZ = {
    1: { yes: true, trainer: "TRAINER_BURGLAR_QUINN", who: "LOCALID_QUINN", name: "Quinn" },
    2: { yes: false, trainer: "TRAINER_SUPER_NERD_AVERY", who: "LOCALID_AVERY", name: "Avery" },
    3: { yes: false, trainer: "TRAINER_BURGLAR_RAMON", who: "LOCALID_RAMON", name: "Ramon" },
    4: { yes: false, trainer: "TRAINER_SUPER_NERD_DEREK", who: "LOCALID_DEREK", name: "Derek" },
    5: { yes: true, trainer: "TRAINER_BURGLAR_DUSTY", who: "LOCALID_DUSTY", name: "Dusty" },
    6: { yes: false, trainer: "TRAINER_SUPER_NERD_ZAC", who: "LOCALID_ZAC", name: "Zac" }
  };
  const quizDoorOpen = (n) => !!(player.flags.cinnabarQuiz && player.flags.cinnabarQuiz[n]);
  function openQuizDoor(n) {
    if (quizDoorOpen(n)) return;
    sfx("se_unlock");
    (player.flags.cinnabarQuiz || (player.flags.cinnabarQuiz = {}))[n] = true;
    applyPatches("CinnabarIsland_Gym");
  }
  async function cinnabarQuiz(n, side) {
    const q = CINNABAR_QUIZ[n], G = (k) => T("CinnabarIsland_Gym_Text_" + k);
    await say(G("PokemonQuizRules"));
    const answer = await confirm(G("QuizQuestion" + n).join("\n"));
    if (answer === q.yes) {
      await sayWithJingle("mus_level_up", G("CorrectGoOnThrough"));
      openQuizDoor(n);
      return;
    }
    sfx("se_boo");
    await say(G("SorryBadCall"));
    Screen.say("");
    if (player.flags[q.trainer]) return;
    // (Avery comes round the machine; the others walk over.)
    const L = (k) => M("CinnabarIsland_Gym_Movement_" + k);
    await Overworld.act([{ who: "player", moves: n === 2 ? L("PlayerFaceAvery") : M("Common_Movement_WalkInPlaceFasterRight") },
      { who: q.who, moves: L(q.name + "Approach" + side) }]);
    const data = window.WORLD_TRAINERS[q.trainer];
    music(data.music || "mus_encounter_boy");
    await say(G(q.name + "Intro"));
    if (!canBattle()) return;
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(q.trainer), pic: data.pic },
      defeatText: G(q.name + "Defeat"), trainerId: q.trainer, prizeClass: data.className });
    if (outcome !== "won") return;
    show("world");
    await Overworld.resume();
    openQuizDoor(n);
  }

  // The fossil doctor in the Lab's experiment room
  // (..._ExperimentRoom_EventScript_FossilScientist): show him a fossil (the
  // Helix or Dome Fossil from Mt. Moon, or the Old Amber) and he revives it;
  // it's ready once you've left and come back to the Lab (the entrance's
  // OnTransition: VAR_MAP_SCENE_..._REVIVE_STATE 1 -> 2). A Lv. 5 Omanyte,
  // Kabuto or Aerodactyl.
  const FOSSILS = [
    { item: "helix-fossil", species: "Omanyte", flag: "revivedHelix" },
    { item: "dome-fossil", species: "Kabuto", flag: "revivedDome" },
    { item: "old-amber", species: "Aerodactyl", flag: "revivedAmber" },
    // (And the fossils dug up mining, game/mining.js: Hoenn's and Sinnoh's too.)
    { item: "root-fossil", species: "Lileep", flag: "revivedRoot" },
    { item: "claw-fossil", species: "Anorith", flag: "revivedClaw" },
    { item: "skull-fossil", species: "Cranidos", flag: "revivedSkull" },
    { item: "armor-fossil", species: "Shieldon", flag: "revivedArmor" }
  ];
  // (This game's own: another such doctor in Pewter's Museum, in the Old
  // Amber's room, the same at it as Cinnabar's; a fossil left with either is
  // ready from either once you've left and come back.)
  const PEWTER_FOSSIL_SCIENTIST = "PewterCity_Museum_1F_EventScript_FossilScientist";
  {
    const m = window.WORLD_MAPS.PewterCity_Museum_1F;
    if (m && !m.people.some((p) => p.script === PEWTER_FOSSIL_SCIENTIST)) {
      m.people.push({ id: 950, x: 24, y: 3, movement: "face_down", rangeX: 0, rangeY: 0, script: PEWTER_FOSSIL_SCIENTIST, flag: null,
        text: null, localId: "LOCALID_PEWTER_FOSSIL_SCIENTIST", sprite: "scientist", width: 16, height: 32, frames: 10 });
    }
    SPECIAL.add(PEWTER_FOSSIL_SCIENTIST);
  }
  async function fossilScientist() {
    const f = player.flags, X = (k) => T("CinnabarIsland_PokemonLab_ExperimentRoom_Text_" + k);
    const reviving = f.fossilRevive;
    if (reviving && reviving.ready) {
      const fo = FOSSILS.find((x) => x.item === reviving.item), name = Party.speciesName(fo.species);
      await say(X("FossilMonBackToLife"), [name]);
      const given = await giftMon(fo.species, 5, X("ReceivedMonFromDoctor"), [name], () => { f[fo.flag] = true; delete f.fossilRevive; });
      if (!given) return;
      return;
    }
    if (reviving) { await say(X("TakesTimeGoForWalk")); return; }
    // (Any fossil in your Bag, however you came by it: Mt. Moon's, the Old
    // Amber, or one dug up mining, as many times as you bring one.)
    const can = FOSSILS.filter((fo) => Player.itemCount(player, fo.item));
    const ask1 = X("HaveYouAFossilForMe");
    if (!can.length) { await say(ask1); await say(X("NoIsTooBad")); return; }
    await say(ask1.slice(0, -1));
    const v = await ask(fill(ask1[ask1.length - 1]), can.map((fo) => ({ label: Bag.name(fo.item), value: fo.item })).concat([back("Cancel")]));
    Screen.say("");
    if (v === "back") { await say(X("NoIsTooBad")); return; }
    const fo = FOSSILS.find((x) => x.item === v), vars = [Party.speciesName(fo.species), Bag.name(fo.item)];
    const make = X("ThatFossilIsOfMonMakeItLiveAgain");
    await say(make.slice(0, -1), vars);
    if (!(await confirm(fill(make[make.length - 1], vars)))) { await say(X("YouComeAgain")); return; }
    await say(X("HandedFossilToWeirdDoctor"), vars);
    Player.removeItem(player, fo.item);
    f.fossilRevive = { item: fo.item };
    await say(X("TakesTimeGoForWalk"));
  }

  // The Pokémon Mansion's statues (PokemonMansion_EventScript_SecretSwitch):
  // one switch for the whole house (FLAG_POKEMON_MANSION_SWITCH_STATE), which
  // swaps which of its doors are open on every floor (the "pressed" patches).
  async function mansionSwitch() {
    const q = T("PokemonMansion_Text_PressSecretSwitch");
    await say(q.slice(0, -1));
    if (!(await confirm(q[q.length - 1]))) { await say(T("PokemonMansion_Text_NotQuiteYet")); return; }
    await say(T("PokemonMansion_Text_WhoWouldnt"));
    Screen.say("");
    if (player.flags.mansionSwitch) delete player.flags.mansionSwitch; else player.flags.mansionSwitch = true;
    applyPatches(player.location.map);
    sfx("se_unlock");
  }

  // ---------- The Safari Game ----------
  //
  // FireRed's (src/safari_zone.c, FuchsiaCity_SafariZone_Entrance's scripts):
  // ₽500 at the gate for 30 Safari Balls and 600 steps in the Safari Zone.
  // While it lasts (player.flags.safari: { balls, steps }, FLAG_SYS_SAFARI_MODE)
  // every wild Pokémon is a Safari battle (engine/safari.js), and the Start
  // menu can RETIRE. Out of steps or balls, the PA calls time and you're
  // back at the gate; walking back into the gate, you're asked if you're
  // leaving early.
  const SAFARI_GATE = "FuchsiaCity_SafariZone_Entrance";
  const safariOn = () => !!player.flags.safari;
  const G = (k) => T("FuchsiaCity_SafariZone_Entrance_Text_" + k);
  // On your way out from the counter: FireRed's two steps down leave you on
  // the entry trigger's row, where walking back up skips the attendant (a
  // scripted step onto a trigger doesn't set it off); this game's one step
  // more puts you below it, so going back in means paying again.
  const SAFARI_EXIT = () => M("FuchsiaCity_SafariZone_Entrance_Movement_Exit").concat("walk_down");
  function safariStep() {
    const s = player.flags.safari;
    if (!s || s.hgss) return null;   // (Johto's has no steps: ui/johto-safari.js)
    // (Hoenn's: 500 steps in its areas, and its Pokéblock feeders' blocks last 100: SafariZoneTakeStep.)
    if (s.hoenn) {
      if (!/^HoennSafariZone_/.test(player.location.map)) return null;
      hoennSafari.step();
      s.steps = Math.max(0, s.steps - 1);
      return s.steps === 0 ? { type: "safari-over", hoenn: true } : null;
    }
    if (!/^SafariZone_/.test(player.location.map)) return null;
    s.steps = Math.max(0, s.steps - 1);
    return s.steps === 0 ? { type: "safari-over", text: "SafariZone_Text_TimesUp" } : null;
  }
  // Hoenn's Safari Zone (Emerald's src/safari_zone.c): entered at Route 121's gate for ₽500 with the Pokéblock Case, 30
  // Safari Balls and 500 steps; its scripts are Emerald's own (EnterSafariMode and ExitSafariMode below, SafariZone_EventScript_*),
  // and its Pokéblock feeders take a block from the case, which draws Pokémon that like it (a nature that does, four times in
  // five) for 100 steps and five tiles round.
  const hoennSafari = {
    feeders: () => { const s = player.flags.safari; return s && s.hoenn ? (s.feeders || (s.feeders = [])) : []; },
    front: () => { const at = Overworld.position(), [dx, dy] = World.DIRS[at.facing || "down"]; return { map: player.location.map, x: at.x + dx, y: at.y + dy }; },
    feederInFront: () => { const f = hoennSafari.front(), i = hoennSafari.feeders().findIndex((d) => d.map === f.map && d.x === f.x && d.y === f.y); return i < 0 ? 65535 : i; },
    placeOnFeeder: (block) => { const f = hoennSafari.front(); hoennSafari.feeders().push({ map: f.map, x: f.x, y: f.y, block, steps: 100 }); },
    activeBlock: () => { const at = player.location, d = hoennSafari.feeders().find((f) => f.map === at.map && Math.abs(f.x - at.x) + Math.abs(f.y - at.y) <= 5); return d ? d.block : null; },
    step: () => { const list = hoennSafari.feeders(); for (let i = list.length - 1; i >= 0; i--) if (--list[i].steps <= 0) list.splice(i, 1); },
    // (PickWildMonNature: by a feeder's block, a nature that likes it, four times in five.)
    nature: () => {
      const b = hoennSafari.activeBlock();
      if (!b || Math.random() >= 0.8) return null;
      const liked = Object.keys(window.NATURES).filter((n) => HoennPokeblock.gain(n, b) > 0);
      return liked.length ? liked[Math.floor(Math.random() * liked.length)] : null;
    }
  };
  // Talking to the attendant as you step up to the counter.
  async function safariEntry(side) {
    if (safariOn()) return;
    const back = async () => { Screen.say(""); await Overworld.act([{ who: "player", moves: M("FuchsiaCity_SafariZone_Entrance_Movement_ForceBack") }]); };
    await say(G("WelcomeToSafariZone"));
    await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
    const pitch = G("PlaySafariGameFor500");
    await say(pitch.slice(0, -1));
    if (!(await confirm(fill(pitch[pitch.length - 1]) + "\n(You have " + money(player.money) + ".)"))) {
      await say(G("OkayPleaseComeAgain"));
      await back();
      return;
    }
    if (player.party.length >= Player.PARTY_SIZE && !player.boxes.some((b) => Player.firstEmpty(b) >= 0)) {
      await say(T("SafariZone_Text_ExcuseMeYourPCBoxIsFull"));
      await back();
      return;
    }
    if (player.money < Safari.ENTRY_FEE) { await say(G("OopsNotEnoughMoney")); await back(); return; }
    Player.addMoney(player, -Safari.ENTRY_FEE);
    await say(G("ThatllBe500WeOnlyUseSpecialBalls"));
    await sayWithJingle("mus_level_up", G("PlayerReceived30SafariBalls"));
    await say(G("CallYouOnPAWhenYouRunOut"));
    Screen.say("");
    await Overworld.act([{ who: "player", moves: M("FuchsiaCity_SafariZone_Entrance_Movement_EnterSafariZone" + side) }]);
    player.flags.safari = { balls: Safari.BALLS, steps: Safari.STEPS };
    await Overworld.teleport({ map: "SafariZone_Center", x: 26, y: 30, facing: "up" });
  }
  // Back in the gate: leaving early? (Or, sent back, on your way out.)
  async function safariGateArrival() {
    if (!safariOn()) return;
    if (await confirm(fill(G("GoingToLeaveSafariZoneEarly")[0]))) {
      await say(G("PleaseReturnSafariBalls"));
      Screen.say("");
      delete player.flags.safari;
      await Overworld.act([{ who: "player", moves: SAFARI_EXIT() }]);
      return;
    }
    await say(G("GoodLuck"));
    Screen.say("");
    await Overworld.act([{ who: "player", moves: M("FuchsiaCity_SafariZone_Entrance_Movement_ReEnter") }]);
    await Overworld.teleport({ map: "SafariZone_Center", x: 26, y: 30, facing: "up" });
  }
  // The game's over: the PA (`text`, if any), then you're at the gate's
  // counter and on your way out. `walkIn`: the last Safari Ball missed in a
  // battle (FireRed's ExitWalkIn: you come in a step first).
  async function safariOver(text, walkIn) {
    if (text) { sfx("se_ding_dong"); await say(T(text)); }
    Screen.say("");
    delete player.flags.safari;
    await Overworld.teleport({ map: SAFARI_GATE, x: 4, y: 1, facing: "down" });
    if (walkIn) await Overworld.act([{ who: "player", moves: M("FuchsiaCity_SafariZone_Entrance_Movement_ApproachCounter") }]);
    await say(G("CatchFairShareComeAgain"));
    Screen.say("");
    await Overworld.act([{ who: "player", moves: walkIn ? M("FuchsiaCity_SafariZone_Entrance_Movement_Exit2") : SAFARI_EXIT() }]);
  }
  // A wild Pokémon in the Safari Zone.
  async function safariBattle(species, level, terrain, nature) {
    const outcome = await battle("wild", { foe: { name: "Wild", team: [wildMon(Party.create(species, level, nature ? { nature } : {}))] }, terrain, safari: true });
    const s = player.flags.safari;
    // (Johto's, HGSS's: ui/johto-safari.js.)
    if (s && s.hgss) { show("world"); await Overworld.resume(); await johtoSafari.afterBattle(outcome); return; }
    // (Hoenn's: Emerald's own scripts take you out when the Balls run out: CB2_EndSafariBattle.)
    if (s && s.hoenn) {
      if (outcome === "caught") s.caught = (s.caught || 0) + 1;
      if (outcome === "noballs" || s.balls <= 0) { show("world"); await Overworld.resume(); await runHoenn(outcome === "noballs" ? "SafariZone_EventScript_OutOfBallsMidBattle" : "SafariZone_EventScript_OutOfBalls"); }
      return;
    }
    if (outcome === "noballs") {
      show("world");
      await Overworld.resume();
      await safariOver(null, true);
    } else if (s && s.balls <= 0) {
      show("world");
      await Overworld.resume();
      await safariOver("SafariZone_Text_OutOfBalls", false);
    }
  }

  // Vermilion Gym's trash cans (VermilionCity_Gym_EventScript_TrashCan): a
  // switch is under one of the fifteen, and the second under one next to it
  // (SetVermilionTrashCans). Find the first and one beam goes off; then the
  // second, or both are hidden somewhere new. Both found, the way to Lt. Surge
  // stays open. Leaving the Gym hides them again.
  let gymCans = null, ticketChecked = false;
  function hideVermilionSwitches() {
    // Cans 1-15, five a row in three rows: the second is a neighbour of the first.
    const first = 1 + Math.floor(Math.random() * 15), col = (first - 1) % 5;
    const next = [first - 5, first + 5, col > 0 ? first - 1 : 0, col < 4 ? first + 1 : 0].filter((c) => c >= 1 && c <= 15);
    gymCans = { first, second: next[Math.floor(Math.random() * next.length)], foundFirst: false };
  }
  async function trashCan(n) {
    const f = player.flags;
    if (!gymCans) hideVermilionSwitches();
    if (f.vermilionGymLocksOpen) { await say(T("VermilionCity_Gym_Text_NopeOnlyTrashHere")); return; }
    if (!gymCans.foundFirst) {
      if (n !== gymCans.first) { await say(T("VermilionCity_Gym_Text_NopeOnlyTrashHere")); return; }
      await say(T("VermilionCity_Gym_Text_SwitchUnderTrashFirstLockOpened"));
      sfx("se_pin");
      gymCans.foundFirst = true;
      applyPatches("VermilionCity_Gym");
      return;
    }
    if (n !== gymCans.second) {
      await say(T("VermilionCity_Gym_Text_OnlyTrashLocksWereReset"));
      hideVermilionSwitches();
      applyPatches("VermilionCity_Gym");
      return;
    }
    await say(T("VermilionCity_Gym_Text_SecondLockOpened"));
    f.vermilionGymLocksOpen = true;
    applyPatches("VermilionCity_Gym");
    sfx("se_unlock");
  }
  // Which of a map's patches (WORLD_MAPS[..].patches) are on now.
  function mapPatches(map) {
    const f = player.flags;
    if (map === GOLDENROD_SWITCHES) return goldenrodSw.open.map((n) => "open" + n);
    // (The Space Center's sealed door, open once the Delta Episode's done and 2F's researcher has unsealed it;
    // its observation deck's rock aglow and stars in line while you wish.)
    if (map === "MossdeepCity_SpaceCenter_2F") return [(f.delta | 0) >= 4 ? "open" : "sealed"];
    if (map === "MossdeepCity_SpaceCenter_ObservationDeck") return [...deckFx];
    if (map === "OutskirtStand") return Orre.patches(map, f);
    if (map === "VermilionCity_Gym") {
      if (f.vermilionGymLocksOpen) return ["off"];
      if (gymCans && gymCans.foundFirst) return ["half"];
    }
    // (The Dojo's back room, once its Karate Master's beaten and has opened it: data/raid-den-rooms.js.)
    if (map === "SaffronCity_Dojo") return f.TRAINER_BLACK_BELT_KOICHI && f.dojoDenDoor ? ["denroom"] : [];
    // (Mr. Psychic's back room, once he's given you his TM; the way to Celadon's Berry Farm, always: the same file.)
    if (map === "SaffronCity_MrPsychicsHouse") return f.gotTM29 ? ["denroom"] : [];
    if (map === "CeladonCity") return ["farmpath"];
    // (Pallet Town's gap in its west trees, to the Time Machine, always: tools/build-time-machine.js.)
    if (map === "PalletTown") return ["timegap"];
    if (map === "RD_06") return ["manhole"];   // (the manhole by the Kame Game shop: tools/build-time-machine.js)
    // (Route 40's Battle Tower: no stairs.)
    if (map === "BattleTower_Lobby") return ["nostairs"];
    // (The League gate's ways west and east, to Johto's Routes 26 and 28: data/johto-maps.js.)
    if (map === "Route22_NorthEntrance") return ["johto", "johto-east"];
    // (Cianwood's Gym, its falls stopped once the winch is turned: ui/johto-gymmicks.js.)
    if (map === "CianwoodCity_Gym") return gymmicks.patches(map);
    // (Johto's Safari Zone: its Areas where the layout has them, ui/johto-safari.js.)
    if (map === JohtoSafari.MAP) return johtoSafari.patches(map);
    if (map === "CeladonCity_GameCorner") return (f.openedRocketHideout ? [] : ["hidden"]).concat(["cardroom"]);
    if (map === "RocketHideout_B1F" && !f.TRAINER_TEAM_ROCKET_GRUNT_12) return ["barrier"];
    if (map === "RocketHideout_B4F" && !(f.TRAINER_TEAM_ROCKET_GRUNT_16 && f.TRAINER_TEAM_ROCKET_GRUNT_17)) return ["barrier"];
    // The Seafoam Islands' currents (game/seafoam.js).
    if (/^SeafoamIslands_B[34]F$/.test(map)) return Seafoam.patches(f, map);
    // The Pokémon League's doors: the way in shut behind you, the way on open
    // once that room's trainer's beaten.
    if (/^PokemonLeague_/.test(map)) return League.patches(f, map);
    // Victory Road's rock barriers, until their floor switches are pressed.
    if (/^VictoryRoad_\dF$/.test(map)) return LeagueRoad.barriers(f, map, Object.keys((window.WORLD_MAPS[map] || {}).patches || {}));
    // One Island's Network Machine: the Ruby in it (OneIsland_PokemonCenter_1F_OnLoad),
    // then the Sapphire and its screens on. Mt. Ember's Ruby Path opens once
    // Celio's asked for the Ruby; the Dunsparce Tunnel's dug out once you're Champion.
    if (map === "OneIsland_PokemonCenter_1F") {
      return [].concat((f.celioScene || 0) >= 5 || f.celioRubyIn ? ["ruby"] : [], f.canLinkWithRS || f.celioSapphireIn ? ["sapphire"] : [],
        f.canLinkWithRS ? ["on"] : []);
    }
    if (map === "MtEmber_Exterior") return (f.celioScene || 0) >= 4 ? ["cave"] : [];
    if (map === "ThreeIsland_DunsparceTunnel") return f.gameClear ? ["dugout"] : [];
    // (Saffron's Magnet Train station's door, always there: tools/build-magnet-train.js.)
    if (map === "SaffronCity") return ["magnettrain"];
    // (New Bark Town's Pokémon Center, this game's own: tools/build-new-bark-center.js.)
    if (map === "NewBarkTown") return ["pokecenter"];
    // Five Island: the Rocket Warehouse's door open (FiveIsland_Meadow_OnLoad),
    // its arrows turned round once the Admin by them is beaten
    // (FiveIsland_RocketWarehouse_OnLoad); Icefall Cave 1F's ice, cracked or broken.
    if (map === "FiveIsland_Meadow") return f.unlockedRocketWarehouse ? ["unlocked"] : [];
    if (map === "FiveIsland_RocketWarehouse") return f.TRAINER_TEAM_ROCKET_ADMIN ? ["arrows"] : [];
    if (map === "FourIsland_IcefallCave_1F") return Sevii.icefallPatches(icefallIce);
    // Six Island: the Dotted Hole's door, open once Cut's been used on it
    // (SixIsland_RuinValley_OnLoad). Trainer Tower: each floor laid out for
    // the challenge's kind of battle (sFloorLayouts); the lobby's counter open
    // as you come out of the elevator.
    if (map === "SixIsland_RuinValley") return f.usedCutOnRuinValleyBraille ? ["open"] : [];
    if (towerFloorNo(map)) { const type = towerFloor(towerFloorNo(map)).type; return type === "double" ? ["doubles"] : type === "knockout" ? ["knockout"] : []; }
    if (map === "TrainerTower_Lobby") return towerCounterOpen ? ["counter"] : [];
    // The Pokémon Mansion's doors, by its switch.
    if (/^PokemonMansion_/.test(map)) return f.mansionSwitch ? ["pressed"] : [];
    // Cinnabar Gym's quiz doors: each open once answered (or its trainer
    // beaten); all of them once Blaine's beaten (CinnabarIsland_Gym_OnLoad).
    if (map === "CinnabarIsland_Gym") return [1, 2, 3, 4, 5, 6].filter((n) => f.TRAINER_LEADER_BLAINE || quizDoorOpen(n)).map((n) => "door" + n);
    // Silph Co.: each card-key door shut until you open it.
    const silph = /^SilphCo_(\d+)F$/.exec(map), patches = (window.WORLD_MAPS[map] || {}).patches;
    if (silph && patches) {
      const doors = Object.keys(patches).filter((p) => /^close\d+$/.test(p)).map((p) => +p.slice(5));
      return doors.map((k) => (f[silphDoorFlag(silph[1], k, doors.length === 1)] ? "open" : "close") + k);
    }
    return [];
  }
  // Sets a map's collision and behaviours for the patches on now (the rest as built).
  const baseCollision = {}, baseBehavior = {};
  function applyPatches(map) {
    const m = window.WORLD_MAPS[map];
    if (!m || !m.patches) return;
    const base = baseCollision[map] || (baseCollision[map] = m.collision.slice());
    const baseB = baseBehavior[map] || (baseBehavior[map] = m.behavior.slice());
    for (const pt of Object.values(m.patches)) for (const [x, y] of pt.collision) {
      m.collision[y * m.width + x] = base[y * m.width + x];
      m.behavior[y * m.width + x] = baseB[y * m.width + x];
    }
    for (const p of mapPatches(map)) for (const [x, y, c, b] of m.patches[p].collision) {
      m.collision[y * m.width + x] = c;
      if (b != null) m.behavior[y * m.width + x] = b;
    }
  }

  // ---------- The S.S. Anne ----------
  //
  // Red (where FireRed has Gary) comes out of a cabin on 2F and battles you:
  // Pikachu (24, knowing Surf and Terastallizing into a Water type),
  // Charmeleon, Wartortle and Ivysaur (25 each). The Captain,
  // seasick, gives you HM01 Cut once you've rubbed his back; the next time you
  // step out onto the dock, the ship sets sail and is gone.
  // Red's Pikachu (this game's own): it knows Surf, and Terastallizes into a Water type.
  function surfingPikachu(level) {
    const moves = window.RandomTeam.levelUpMoves("Pikachu", level).filter((m) => m !== "Surf").slice(-3).concat(["Surf"]);
    return Object.assign(Party.create("Pikachu", level, { moves }), { teraType: "Water", teraAce: true });
  }
  async function ssAnneRed(side) {
    const f = player.flags, R = "LOCALID_SS_ANNE_RIVAL";
    sfx("se_exit");
    music("mus_encounter_rival");
    Overworld.addObject(R, { x: 30, y: 2, facing: "down" }, window.WORLD_SPRITES.red);
    await Overworld.act([{ who: R, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    const approach = [{ who: R, moves: M("SSAnne_2F_Corridor_Movement_RivalApproach" + side) }];
    if (side !== "Left") approach.push({ who: "player", moves: M("SSAnne_2F_Corridor_Movement_PlayerFaceRival" + side) });
    await Overworld.act(approach);
    if (side === "Left") await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    await say("…");
    // (His Pikachu knows Surf, and Terastallizes into a Water type.)
    const team = [surfingPikachu(24), Party.create("Charmeleon", 25), Party.create("Wartortle", 25), Party.create("Ivysaur", 25)];
    const outcome = await battle("trainer", { foe: { name: "Pokémon Trainer Red", team, pic: "red", tera: true }, defeatText: ["…"] });
    if (outcome !== "won") return;
    f.ssAnneRed = true;
    show("world");
    await Overworld.resume();
    await say(["…", "Red nodded, and headed off."]);
    music("mus_rival_exit");
    await Overworld.act([{ who: R, moves: M("SSAnne_2F_Corridor_Movement_RivalExit" + side).concat(["set_invisible"]) }]);
    Overworld.removeObject(R);
    music((window.WORLD_MAPS.SSAnne_2F_Corridor || {}).music);
  }
  async function ssAnneCaptain() {
    const f = player.flags, C = "SSAnne_CaptainsOffice_Text_";
    if (f.gotHM01) {
      await Overworld.act([{ who: "LOCALID_SS_ANNE_CAPTAIN", moves: ["face_player"] }]);
      await say(T(C + "SSAnneWillSetSailSoon"));
      return;
    }
    await say(T(C + "CaptainIFeelSeasick"));
    await sayWithJingle("mus_heal", T(C + "RubbedCaptainsBack"));
    await Overworld.act([{ who: "LOCALID_SS_ANNE_CAPTAIN", moves: ["face_player"] }]);
    await say(T(C + "ThankYouHaveHMForCut"));
    Player.addItem(player, "hm01");
    f.gotHM01 = true;
    await sayWithJingle("mus_obtain_key_item", T(C + "ObtainedHM01FromCaptain"));
    await say(T(C + "ExplainCut"));
  }
  // Out on the dock with HM01: the ship sails off, and you head back up the pier.
  function ssAnneDeparting() { return !!(player.flags.gotHM01 && !player.flags.ssAnneDeparted); }
  async function ssAnneDeparts() {
    const f = player.flags, at = Overworld.position();
    await Overworld.act([{ who: "player", moves: at.y <= 6 ? M("SSAnne_Exterior_Movement_WalkDown") : M("Common_Movement_WalkInPlaceFasterDown") }]);
    music("mus_surf");
    await new Promise((r) => setTimeout(r, 800));
    await Overworld.act([{ who: "LOCALID_SS_ANNE", moves: Array(12).fill("walk_slow_left") }]);
    Overworld.removeObject("LOCALID_SS_ANNE");
    f.ssAnneDeparted = true;
    await Overworld.act([{ who: "player", moves: M("SSAnne_Exterior_Movement_Exit") }]);
    await Overworld.teleport({ map: "VermilionCity", x: 23, y: 34, facing: "up" });
    await Overworld.act([{ who: "player", moves: M("VermilionCity_Movement_ExitSSAnne") }]);
  }

  // ---------- The S.S. Aqua ----------
  //
  // HGSS's ship between Olivine and Vermilion: Olivine's port boards you
  // (its scripts: VAR_BOAT_DIRECTION 1, sailing for Vermilion) and the voyage
  // goes as HGSS has it; once it's arrived (FLAG_BOAT_ARRIVED) the ship's way
  // off is to Vermilion: FireRed's dock, where the S.S. Anne was. Back from
  // Vermilion, its sailor on the dock takes you (with the S.S. Ticket) to
  // Olivine's port.
  function ssAquaExit() {
    const m = window.WORLD_MAPS.SSAqua_1F, w = m && m.warps[0];
    if (!w) return;
    const vermilion = +johto.getVar("VAR_BOAT_DIRECTION") === 1 && johto.flag("FLAG_BOAT_ARRIVED");
    // (Off at Olivine: where the ship's door leads, HGSS's port outside, or on the ship drawn from Pokémon Heart &
    // Soul's, its port building, as it's built: kept the first time.)
    if (!w.olivine) w.olivine = w.map === "SSAnne_Exterior" ? { map: "SSAqua_OlivinePortExterior", warp: 1 } : { map: w.map, warp: w.warp };
    Object.assign(w, vermilion ? { map: "SSAnne_Exterior", warp: 0 } : w.olivine);
    // (Off in Vermilion, the ship's next voyage is back to Olivine.)
    if (vermilion) johto.setVar("VAR_BOAT_DIRECTION", 0);
  }
  // Olivine's port: the S.S. Aqua's gangway (and the port's sailor) ask where you're sailing, once you've beaten
  // Johto's Pokémon League: Vermilion City (HGSS's voyage, as its port's sailor sets it going) or, this game's own,
  // Slateport City in Hoenn (the first time, the moving truck's inside, as Emerald begins: sailToHoenn).
  // The Hoenn Ticket (this game's own), for the S.S. Aqua's run to Slateport: from Oak in the Hall of Fame once you've
  // beaten Johto's League, or from the S.S. Aqua's clerk if you'd beaten it before there was one.
  async function giveHoennTicket(from) {
    if (Player.itemCount(player, "hoenn-ticket")) return;
    await say(from === "Oak" ? ["Oak: Oh, and {PLAYER}…", "This came for Johto's new Champion.\nIt's from the Fast Ship S.S. Aqua!", "A ticket to sail from Olivine City\nto Slateport City, in Hoenn."]
      : ["Ah, Champion! This was left for you.", "A ticket for our run to Slateport City,\nin Hoenn."]);
    Player.addItem(player, "hoenn-ticket", 1);
    await sayWithJingle("mus_obtain_key_item", fill("{PLAYER} received the " + Bag.name("hoenn-ticket") + "!"));
  }
  async function ssAquaBoard() {
    if (Overworld.position().facing === "down") return;   // (off the ship, down the gangway)
    const away = async () => { if (player.location.map === "SSAqua_OlivinePortExterior") await Overworld.act([{ who: "player", moves: ["walk_down"] }]); };
    if (!player.flags.johtoLeagueClear) {
      await say(["Welcome to Fast Ship S.S. Aqua.", "I'm sorry, but the S.S. Aqua sails\nonly for Trainers who have beaten", "the Pokémon League here in Johto."]);
      await away();
      return;
    }
    // (Slateport City with the Hoenn Ticket: Oak's, from the Hall of Fame; a save already past it gets it here.)
    if (!Player.itemCount(player, "hoenn-ticket")) await giveHoennTicket("the S.S. Aqua's clerk");
    const dests = ["Vermilion City"].concat(Player.itemCount(player, "hoenn-ticket") ? ["Slateport City"] : [], ["Cancel"]);
    const i = await multichoice("Welcome to Fast Ship S.S. Aqua.\nWhere would you like to sail?", 17, 12 - 2 * dests.length, dests);
    if (i < 0 || dests[i] === "Cancel") { await say("We hope to see you again!"); await away(); return; }
    Screen.say("");
    if (dests[i] === "Slateport City") { await say("{PLAYER} flashed the Hoenn Ticket."); await sailToHoenn(true); return; }
    await say(["Welcome aboard the S.S. Aqua!", "We sail for Vermilion City in Kanto."]);
    Screen.say("");
    johto.setVar("VAR_BOAT_DIRECTION", 1);
    johto.setVar("VAR_UNK_40DC", 0);
    johto.setFlag("FLAG_BOAT_ARRIVED", false);
    johto.setFlag("FLAG_UNK_22C", true);
    johto.setFlag("FLAG_UNK_22B", true);
    sfx("se_exit");
    // (Aboard at the ship's door, where its scene walks you in.)
    const door = window.WORLD_MAPS.SSAqua_1F.warps[0];
    await Overworld.teleport({ map: "SSAqua_1F", x: door.x, y: door.y, facing: "down" });
    const js = johto.frameScript("SSAqua_1F");
    if (js) await runJohto(js, null);
  }
  async function ssAquaToOlivine() {
    if (!Player.itemCount(player, "ss-ticket")) { await say(["This is the S.S. Aqua's dock.", "You'll need an S.S. Ticket to sail\nto Olivine City in Johto."]); return; }
    if (!(await confirm("The S.S. Aqua sails for Olivine City.\nWould you like to board?"))) { await say("We hope to see you again!"); return; }
    await say(["{PLAYER} flashed the S.S. Ticket.", "Welcome aboard the S.S. Aqua!"]);
    Screen.say("");
    sfx("se_ship");
    // (Off at the gangway: HGSS's, below the ship; on the port drawn from Pokémon Heart & Soul's, at the pier's end,
    // the step off the boat's way aboard.)
    const port = window.WORLD_MAPS.SSAqua_OlivinePortExterior, plank = port && port.hgss && port.warps.find((w) => w.map === "SSAqua_1F");
    await Overworld.teleport(plank ? { map: "SSAqua_OlivinePortExterior", x: plank.x, y: plank.y + 1, facing: "down" } : { map: "SSAqua_OlivinePortExterior", x: 27, y: 21, facing: "down" });
    await say("We've arrived in Olivine City.\nWe hope to see you again!");
  }

  // ---------- Escape Rope ----------
  //
  // As in FireRed: it works only where the map allows escaping (caves, Viridian
  // Forest), and takes you back to where you last went from outdoors (a town,
  // city or route) through a door or cave entrance: the "escape warp".

  const OUTDOORS = ["town", "city", "route", "ocean_route"];
  // The Town Map's sections you've been to (for its dungeon icons and the
  // Pokédex's AREA MODE).
  function visitSection(map) {
    const sec = window.TOWN_MAP && window.TOWN_MAP.mapSections[map];
    if (!sec) return;
    const list = player.flags.visitedSections || (player.flags.visitedSections = []);
    if (!list.includes(sec)) list.push(sec);
    // (Going into a place's Pokémon Center counts for Fly: Route 4's.)
    for (const [k, spot] of Object.entries(window.TOWN_MAP.fly || {})) if (spot.center === map && !list.includes(k)) list.push(k);
  }
  function onWarp(from, to) {
    // (Through a hole: FireRed's fall warp.)
    seafoamFell = World.blockAt(from.map, from.x, from.y).behavior === World.MB.FALL_WARP ? to.map : null;
    leftPallet(to.map);
    visitSection(to.map);
    const a = window.WORLD_MAPS[from.map], b = window.WORLD_MAPS[to.map];
    // (FireRed's UpdateEscapeWarp: where an Escape Rope or Dig brings you out,
    // a tile south of the entrance, unless you went in facing south. Standing
    // in front of a door you're already off it.)
    if (a && b && OUTDOORS.includes(a.type) && !OUTDOORS.includes(b.type)) {
      const onWarp = !!World.warpAt(from.map, from.x, from.y), facing = Overworld.position().facing;
      player.flags.escapeWarp = { map: from.map, x: from.x, y: from.y + (onWarp && facing !== "down" ? 1 : 0) };
    }
    // Into an elevator: its doors open back where you got in until you choose a floor.
    if (/_Elevator$/.test(to.map) && !/_Elevator$/.test(from.map)) setDynamicWarp({ map: from.map, x: from.x, y: from.y });
  }
  async function useEscapeRope() {
    const here = player.location && window.WORLD_MAPS[player.location.map];
    const to = player.flags.escapeWarp;
    // (In front of the Ruins of Alph's wall that says ESCAPE: it opens, and the rope's kept.)
    if (alphReaction("escape-rope")) return true;
    if (!here || !here.allowEscaping || !to) { await message("Oak: " + player.name + "! This isn't the time to use that!"); return false; }
    Player.removeItem(player, "escape-rope");
    await message(player.name + " used the Escape Rope.");
    // (Back on the map, FireRed's Escape Rope warp: spinning up and away, and
    // down again at the way in.)
    fieldAction = async () => {
      Screen.say("");
      await Overworld.escapeRopeOut();
      await Overworld.escapeRopeIn({ map: to.map, x: to.x, y: to.y, facing: "down" });
      await persist();
    };
    return true;
  }

  // Where Teleport takes you: outside the last Pokémon Center (its Town Map Fly spot, else inside it), as blacking out
  // goes (in Hoenn, Hoenn's only), or else your room in Littleroot (in Hoenn) or home.
  function teleportTarget() {
    const inHoennNow = isHoenn(player.location.map), last = player.flags.lastCenter;
    const ok = last && (!inHoennNow || isHoenn(last)) && centerOf(last);
    if (ok) {
      const spot = Object.values(window.TOWN_MAP.fly || {}).find((s) => s.center === last);
      return spot ? { map: spot.map, x: spot.x, y: spot.y } : { map: ok.map, x: ok.x, y: ok.y };
    }
    return inHoennNow ? (player.flags.hoennRespawn || hoennBedroom()) : Object.assign({}, Player.HOME);
  }

  // Where you come to in a Pokémon Center after blacking out: Kanto's
  // (Player.CENTERS), or one of Johto's, FireRed's own room (data/johto-maps.js).
  // (A map's own `center`, where its counter is: Sinnoh's, from the Essentials project.)
  const centerOf = (map) => Player.CENTERS[map] || ((window.WORLD_MAPS[map] || {}).pokemonCenter ? Object.assign({ map, x: 7, y: 4, facing: "up" }, window.WORLD_MAPS[map].center) : null);

  // ---------- The Rejuvenator (this game's own) ----------
  //
  // In the Indigo Plateau's Pokémon Center: off to a new region, where the
  // level caps (Player.levelCap) start again at 15, a Pokémon can be made Lv. 5
  // again, keeping everything else: what it's evolved into, its moves, its
  // EVs and IVs, its nature and ability. It's fully healed, too.
  const REJUVENATED_LEVEL = 5;
  function rejuvenate(record) {
    record.level = REJUVENATED_LEVEL;
    record.exp = Experience.expForLevel(Experience.growthRate(record.species), REJUVENATED_LEVEL);
    Party.heal(record);
  }
  async function rejuvenator() {
    await say(["I'm the Rejuvenator!", "Off to a new region? Your Pokémon\nwill have to grow up all over again\nthere.",
      "I can make a Pokémon young again:\nback to Lv. 5!", "It keeps everything else: its moves,\nits training, even what it's evolved\ninto."]);
    for (;;) {
      if (!(await confirm("Shall I rejuvenate one of\nyour Pokémon?"))) { await say("Come back any time!"); return; }
      const notes = player.party.map((r) => (!r.egg && r.level > REJUVENATED_LEVEL ? "ABLE" : "NOT ABLE"));
      const r = await choosePartyFor("Rejuvenate which {PKMN}?", null, notes);
      show("world");
      if (!r) { await say("Come back any time!"); return; }
      const name = Party.displayName(r);
      if (r.egg) { await say("An Egg is as young as it gets!"); continue; }
      if (r.level <= REJUVENATED_LEVEL) { await say(name + " is young enough already!"); continue; }
      if (!(await confirm("Make " + name + " Lv. " + REJUVENATED_LEVEL + " again?"))) continue;
      rejuvenate(r);
      await sayWithJingle("mus_heal", name + " became Lv. " + REJUVENATED_LEVEL + " again!");
      await persist();
    }
  }

  // ---------- Johto's field scripts (ui/johto-script.js) ----------
  //
  // Johto's maps run HeartGold's own scripts (compiled into data/johto-maps.js
  // by tools/build-johto.js): what its people say and do, its signs, the
  // scenes its steps start and its maps' own scripts, with HGSS's flags and
  // vars, starting where a new HGSS game starts. Its trainers battle as
  // Kanto's do (their HGSS parties and lines), and its item balls, small
  // trees and breakable rocks work as Kanto's; its Apricorn trees bear an
  // Apricorn a day.
  const KANTO_BADGES = ["boulder", "cascade", "thunder", "rainbow", "soul", "marsh", "volcano", "earth"];
  const gymmicks = JohtoGymmicks.create({ sfx: (name) => sfx(name), shake: (n, opts) => Overworld.shake(n, opts),
    people: () => Overworld.people(), beaten: (id) => !!player.flags[id] });
  // The Bug-Catching Contest (ui/bug-contest.js): HGSS's, in the National Park.
  const bugContest = BugContest.create({
    player: () => player, party: Party, receive: (r) => Player.receive(player, r), national: () => Player.nationalDex(player),
    battle: (opts) => battle("wild", opts), wildMon, say: (pages) => say(pages), confirm: (question) => confirm(question),
    resume: async () => { show("world"); await Overworld.resume(); },
    setFlag: (name, on) => johto.setFlag(name, on), setVar: (name, val) => johto.setVar(name, val),
    runStd: (name) => runJohto(johtoStd(name), null),
    judging: async () => { await Overworld.teleport(Object.assign({ facing: "up" }, window.JohtoCoords ? window.JohtoCoords.toMap("NationalPark", 46, 50) : { map: "NationalPark", x: 46, y: 50 })); await runJohto(johto.frameScript("NationalPark"), null); }
  });
  // (A std script by name, compiled as a zone of its own: { zone, label }.)
  const johtoStd = (name) => { const s = (window.JOHTO_SCRIPTS.std || {})[name]; return s ? { zone: s[0], label: s[1] } : null; };
  // (Only to Johto's maps that are built: HGSS's world coordinates, as theirs.
  // Into one that isn't, as Route 34's Day Care, you stay where you are.)
  async function johtoWarp(mapConst, x, y, facing) {
    // (A map by its number, as the scripts' Warp has it: J.mapIds.)
    const J = window.JOHTO_SCRIPTS, name = J.mapConsts[typeof mapConst === "number" ? (J.mapIds || {})[mapConst] : mapConst], o = name && J.origins[J.maps[name]];
    if (!o) { await Overworld.fadeFromBlack(); return; }
    // (HGSS's map and tile: where they are now, Heart & Soul's, ui/johto-coords.js.)
    const to = window.JohtoCoords ? window.JohtoCoords.toMap(name, x - o.x, y - o.y) : { map: name, x: x - o.x, y: y - o.y };
    if (!window.WORLD_MAPS[to.map]) { await Overworld.fadeFromBlack(); return; }
    await Overworld.teleport({ map: to.map, x: to.x, y: to.y, facing });
  }
  // Johto's scripts' coordinates, HGSS's, on this map (Heart & Soul's, ui/johto-coords.js), and back; an HGSS
  // map's door, by its number there, here.
  const johtoMapOfZone = (zone) => { const J = window.JOHTO_SCRIPTS; for (const [m, z] of Object.entries(J.maps)) if (z === zone) return m; return null; };
  const johtoHere = (zone, x, y) => {
    const S = johtoMapOfZone(zone);
    if (!S || !window.JohtoCoords) return { x, y };
    const t = window.JohtoCoords.toMap(S, x, y);
    return { x: t.x, y: t.y };
  };
  const johtoThere = (zone, x, y) => {
    const map = player.location.map, m = window.WORLD_MAPS[map];
    if (!m || !m.hgss || !window.JohtoCoords) return { x, y };
    const t = window.JohtoCoords.toHgss(map, x, y, johtoMapOfZone(zone));
    return { x: t.x, y: t.y };
  };
  const johtoWarpIndex = (zone, i) => {
    const list = ((window.JOHTO_COORDS || {}).warps || {})[johtoMapOfZone(zone)];
    return list && list[i] != null ? list[i] : i;
  };
  // (A scene's walks re-planned for the map, where it's Heart & Soul's: ui/johto-coords.js retarget.)
  const johtoAct = (tracks) => {
    const map = player.location.map;
    if (!window.JohtoCoords || !(window.WORLD_MAPS[map] || {}).hgss) return Overworld.act(tracks);
    const at = (who) => (who === "player" ? Overworld.position() : who === "obj_partner_poke" ? Overworld.follower.position()
      : who === 253 || /^#/.test(String(who)) ? null : Overworld.personPosition(who));
    const others = (who) => [Overworld.position()].concat(tracks.filter((t) => t.who !== who && t.who !== "player").map((t) => at(t.who)).filter(Boolean));
    // (A scene the map's table walks its own way on Heart & Soul's ground: sceneMoves, tools/data/hns-johto-maps.json.)
    // (A key may say where you are, "@x>=14": Goldenrod's Underground has a room at each entrance.)
    const own = (window.WORLD_MAPS[map].sceneMoves || {}), you = Overworld.position();
    const where = (c) => { const r = /^@([xy])(>=|<)(\d+)$/.exec(c); return r && (r[2] === ">=" ? you[r[1]] >= +r[3] : you[r[1]] < +r[3]); };
    const mine = (t) => {
      const k = t.who + " " + String(t.label || "").replace(/^\w+:/, "");
      const c = Object.keys(own).find((n) => n.startsWith(k + " @") && where(n.slice(k.length + 1)));
      return own[c || k];
    };
    const planned = window.JohtoCoords.retarget(tracks.filter((t) => !mine(t)), {
      map, at, free: (x, y, who) => !others(who).some((p) => p && p.x === x && p.y === y && who !== "player")
    }).map((t) => (t.who === "obj_partner_poke" ? followerWalk(map, tracks.find((u) => u.who === t.who)) : t));
    return Overworld.act(tracks.map((t) => (mine(t) ? Object.assign({}, t, { moves: sceneWalk(map, t.who, mine(t), tracks) }) : planned.shift())));
  };
  // (Its steps, with "to:x,y" for the shortest way to a tile, round walls and everyone standing about, and "at:x,y".)
  function sceneWalk(map, who, moves, tracks) {
    const m = window.WORLD_MAPS[map];
    let at = who === "player" ? Overworld.position() : Overworld.personPosition(who);
    const out = [];
    for (const mv of moves) {
      // ("at:x,y": there now, as Lyra coming up the stairs of the room you're in.)
      const a = /^at:(-?\d+),(-?\d+)$/.exec(mv);
      if (a && who !== "player") { at = { x: +a[1], y: +a[2] }; Overworld.addObject(who, { x: at.x, y: at.y, facing: "down" }); continue; }
      // ("face:<who>": turned to someone where they are now, as you to Kurt's granddaughter come over to you.)
      const fc = /^face:(.+)$/.exec(mv);
      if (fc) {
        const them = fc[1] === "player" ? Overworld.position() : Overworld.personPosition(fc[1]);
        if (them && at) { const dx = them.x - at.x, dy = them.y - at.y; out.push("face_" + (Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down"))); }
        continue;
      }
      const r = /^to:(-?\d+),(-?\d+)$/.exec(mv), toYou = mv === "to:player";
      if (!r && !toYou) { out.push(mv); continue; }
      if (!at) continue;
      const me = Overworld.position(), crowd = Overworld.people().filter((p) => p.def.localId !== who && !tracks.some((t) => t.who === p.def.localId));
      const taken = (x, y) => (who !== "player" && x === me.x && y === me.y) || crowd.some((p) => p.x === x && p.y === y);
      const ok = (x, y) => x >= 0 && y >= 0 && x < m.width && y < m.height && !m.collision[y * m.width + x] && !taken(x, y);
      // ("to:player": the shortest way to a tile beside you, then facing you: Kurt's granddaughter with his number.)
      if (toYou) {
        let best = null;
        for (const [d, dx, dy] of [["up", 0, 1], ["down", 0, -1], ["left", 1, 0], ["right", -1, 0]]) {
          const t = { x: me.x + dx, y: me.y + dy };
          const here = t.x === at.x && t.y === at.y, steps = here ? [] : ok(t.x, t.y) ? window.JohtoCoords.path(m, at, t, ok) : null;
          if (steps && (here || steps.length) && (!best || steps.length < best.steps.length)) best = { t, steps, d };
        }
        if (!best) continue;
        for (const d of best.steps) out.push("walk_" + d);
        out.push("face_" + best.d);
        at = best.t;
        continue;
      }
      const to = { x: +r[1], y: +r[2] };
      for (const d of window.JohtoCoords.path(m, at, to, ok)) out.push("walk_" + d);
      at = to;
    }
    return out;
  }
  // (Your walking Pokémon in a scene, on Heart & Soul's ground: HGSS's walk ends facing someone, as Ilex Forest's
  // Kimono Girl, so it goes the shortest way round to the tile beside whoever it faces, no one in its way; with no one
  // near, back behind you. Then what it does there: HGSS's steps in place.)
  function followerWalk(map, t) {
    const m = window.WORLD_MAPS[map], from = Overworld.follower.position();
    if (!from) return t;
    const moves = [].concat(t.moves), lastWalk = moves.map((mv) => /^walk(_slow|_fast|_faster)?_(up|down|left|right)$/.test(mv)).lastIndexOf(true);
    const after = moves.slice(lastWalk + 1), faced = /^(?:walk_in_place(?:_fast)?|face)_(up|down|left|right)$/.exec(after[0] || "");
    const me = Overworld.position(), D = World.DIRS, crowd = Overworld.people().filter((p) => !p.def.inanimate);
    const near = faced && crowd.map((p) => ({ p, d: Math.abs(p.x - from.x) + Math.abs(p.y - from.y) })).filter((c) => c.d <= 10).sort((a, b) => a.d - b.d)[0];
    const to = near ? { x: near.p.x - D[faced[1]][0], y: near.p.y - D[faced[1]][1] } : { x: me.x - D[me.facing][0], y: me.y - D[me.facing][1] };
    const taken = (x, y) => (x === me.x && y === me.y) || crowd.some((p) => p.x === x && p.y === y);
    if (m.collision[to.y * m.width + to.x] || taken(to.x, to.y)) return Object.assign({}, t, { moves: after });
    const steps = window.JohtoCoords.path(m, from, to, (x, y) => !m.collision[y * m.width + x] && !taken(x, y));
    return Object.assign({}, t, { moves: steps.map((d) => "walk_" + d).concat(after) });
  }
  // The Magnet Train between Goldenrod and Saffron (ui/magnet-train.js).
  const magnetTrain = MagnetTrain.create({
    player: () => player, johto: { setFlag: (name, on) => johto.setFlag(name, on) }, music: (song) => music(song),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)), fadeOut: () => Overworld.fadeToBlack(), warp: johtoWarp,
    teleport: (loc) => Overworld.teleport(loc)
  });
  const johtoEnv = {
    player: () => player,
    bugContest,
    pcSpace: () => player.boxes.reduce((n, box) => n + box.filter((r) => !r).length, 0),
    say: (pages) => say(pages),
    confirm: (question) => confirm(fill(question)),   // (its {PLAYER}, as say()'s)
    choose: async (texts, question) => { const i = await multichoice(question || null, 0, 0, texts); Screen.say(""); return i; },
    close: () => Screen.say(""),
    facePlayer: (person) => Overworld.act([{ who: person.localId || "#" + person.id, moves: ["face_player"] }]),
    act: (tracks) => johtoAct(tracks),
    here: johtoHere, there: johtoThere, warpIndex: johtoWarpIndex,
    // (Someone a flag hid, onto the map where it has them, or where the map's script put them.)
    show: (id) => {
      const def = (window.WORLD_MAPS[player.location.map] || { people: [] }).people.find((p) => p.localId === id);
      if (!def) return;
      const at = johto.placed(id) || { x: def.x, y: def.y, facing: (/^face_(\w+)/.exec(def.movement || "") || [, "down"])[1] };
      Overworld.addObject(id, { x: at.x, y: at.y, facing: at.facing });
    },
    hide: (id) => Overworld.removeObject(id),
    // (Beyond the map's edge too: Silver comes into Cherrygrove from Route 29's side, off its east edge.)
    place: (id, x, y, facing) => {
      const map = window.WORLD_MAPS[player.location.map], at = Overworld.personPosition(id);
      if (at && x >= -16 && y >= -16 && x < map.width + 16 && y < map.height + 16) Overworld.addObject(id, { x, y, facing: facing || at.facing });
    },
    // (253: HGSS's follower Pokémon, obj_partner_poke.)
    personAt: (id) => (id === "player" ? Overworld.position() : id === 253 ? Overworld.follower.position() : Overworld.personPosition(id)),
    origin: (zone) => window.JOHTO_SCRIPTS.origins[zone],
    giveItem: async (id, n, verb) => {
      if (!window.ITEMS[id]) return false;   // (one the game hasn't got)
      Player.addItem(player, id, n);
      if (id === "coin-case") player.flags.gotCoinCase = true;   // (Mr. Game's: Kanto's Game Corner takes it too)
      if (!verb) return true;   // (GiveItem: the script says so itself)
      const name = Bag.name(id);
      await sayWithJingle(itemJingle(id), "{PLAYER} " + verb + " " + (n > 1 ? n + " " + itemPlural(name) : Bag.isKeyItem(id) ? "the " + name : article(name)) + "!");
    },
    hasItem: (id, n) => Player.itemCount(player, id) >= n,
    takeItem: (id, n) => Player.removeItem(player, id, n),
    itemCount: (id) => Player.itemCount(player, id),
    cry: (species) => { if (window.DEX[species]) cry(species); },
    fade: (out) => (out ? Overworld.fadeToBlack() : Overworld.fadeFromBlack()),
    trainerBattle: (id) => johtoBattle("trainer", id),
    wildBattle: (species, level) => johtoBattle("wild", species, level),
    createRoamer: (i) => { const sp = JOHTO_ROAMERS[i]; if (sp) (player.flags.johtoRoamers || (player.flags.johtoRoamers = {}))[sp] = true; },
    warp: johtoWarp,
    // (The Magnet Train's ride, ScrCmd_722: ui/magnet-train.js.)
    magnetTrain: (toward, mapConst, x, y) => magnetTrain.ride(toward, mapConst, x, y),
    // (Kanto's Badges count once Johto's League is won: HGSS's scripts take a
    // Kanto Badge to mean that, as the Gym Leaders' days off do, and here you
    // come to Johto with all eight.)
    hasBadge: (n) => (n >= 8 ? !!player.flags.johtoLeagueClear && player.badges.includes(KANTO_BADGES[n - 8]) : player.badges.includes(Player.REGION_BADGES.johto[n])),
    giveBadge: (n) => {
      const b = n >= 8 ? KANTO_BADGES[n - 8] : Player.REGION_BADGES.johto[n];
      if (b && !player.badges.includes(b)) player.badges.push(b);
      if (b === "rising") player.flags.rockClimbDue = true;
    },
    givePokedex: () => { player.flags.pokedex = true; },
    itemName: (id) => (window.ITEMS[id] ? Bag.name(id) : String(id)),
    giveMon: async (species, level, item) => {
      if (!window.DEX[species]) return false;
      let record = null;
      const ok = await giftMon(species, level, ["{PLAYER} received " + Party.speciesName(species) + "!"], [], () => {
        record = player.party[player.party.length - 1];
      });
      // (Holding its item, if it joined your party.)
      if (ok && item && window.ITEMS[item] && record && record.species === species && !record.item) record.item = item;
      return ok;
    },
    setDynamicWarp: (mapConst, x, y) => { const name = window.JOHTO_SCRIPTS.mapConsts[mapConst]; if (name) setDynamicWarp({ map: name, x, y }); },
    dynamicWarpMap: () => (player.flags.dynamicWarp || {}).map,
    money: () => player.money,
    addMoney: (n) => { player.money = Math.max(0, Math.min(999999, player.money + n)); },
    coins: () => coins(),
    addCoins: (n) => addCoins(n),
    // (The Game Corner: the Coins window at the top right, Voltorb Flip, a prize's pocket.)
    coinsBox: (on) => coinsBox(on ? 20 : null, 0),
    casinoGame: () => voltorbFlip(),
    itemPocket: (id) => (window.ITEMS[id] ? Bag.pocket(id) : ""),
    beaten: (id) => !!player.flags["HGSS_" + String(id).replace(/^HGSS_/, "")],
    setBeaten: (id, on) => { const k = "HGSS_" + String(id).replace(/^HGSS_/, ""); if (on) player.flags[k] = true; else delete player.flags[k]; },
    sleep, isGirl, onBike: () => Overworld.avatar() === "bike",
    chooseStarter: johtoStarter,
    nickname: async (i) => {
      const r = typeof i === "object" ? i : player.party[i];   // (or a Pokémon not in your party: the contest's bug)
      if (!r) return;
      const typed = await enterText(Party.speciesName(r.species) + "'s nickname?", Party.displayName(r), 10);
      if (typed && typed !== Party.speciesName(r.species)) r.nickname = typed;
    },
    nameRival: async (name) => (await enterText("His name?", name, 7)) || name,
    healParty: () => player.party.forEach(Party.heal),
    // (The Gyms' gimmicks: ui/johto-gymmicks.js.)
    violetLift: () => gymmicks.violetLift(),
    turnWinch: () => { const turned = gymmicks.turnWinch(); applyPatches(player.location.map); return turned; },
    // (The Ruins of Alph: ui/johto-alph.js.)
    shake: (n, opts) => Overworld.shake(n, opts),
    alphPuzzle: (n) => alphPuzzle(n),
    alphWall: (n) => alphOverlay((c) => JohtoAlph.wall(c, n)),
    unownCaught: () => player.flags.unownCaught || [],
    // (The Safari Zone: ui/johto-safari.js.)
    safariAction: (n) => johtoSafari.action(n), safariChallenge: (n) => johtoSafari.challenge(n), areaCustomizer: () => johtoSafari.customizer(), safariStamp: () => johtoSafari.stamp(),
    giveEgg: async (species) => { Player.receive(player, Breeding.giftEgg(species, { map: player.location.map })); },
    mart: (stock) => mart(stock),
    kurt: (op) => johtoField.kurt(op), followerIdle: () => Overworld.follower.idle(), followerHide: (on) => Overworld.follower.hide(on),
    // (The Pokégear: ui/pokegear.js.)
    phoneCall: (who, kind, n) => gear.call(who, kind, n), registerCard: (n) => gear.registerCard(n),
    phoneRematch: (n) => gear.rematch(n), phoneTrigger: (n, on) => gear.setTrigger(n, on), buenaPassword: () => gear.passwordSet(),
    // (HGSS's tiers: none with no Badges, then by twos; Johto's Badges here.)
    martStock: (list) => {
      const n = Player.REGION_BADGES.johto.filter((b) => player.badges.includes(b)).length;
      const tier = n === 0 ? 1 : n <= 2 ? 2 : n <= 4 ? 3 : n <= 6 ? 4 : n === 7 ? 5 : 6;
      return list.filter(([, t]) => tier >= t).map(([id]) => id);
    },
    // (Choosing a Pokémon, its trades and loans, its moves: below.)
    choosePartyMon: async (message) => { const r = await choosePartyFor(message); show("world"); return r ? player.party.indexOf(r) : -1; },
    npcTrade: (trade, i) => tradeFor(i, johtoTradeMon(trade, player.party[i].level), trade.ot.name),
    giveLoanMon: async (trade, level, n) => {
      const r = Object.assign(johtoTradeMon(trade, level), { loan: n }, n === 7 ? { mail: "kenya" } : {});
      Player.receive(player, r);
    },
    setMove: (i, slot, move) => { if (window.MOVES[move]) Party.teachMove(player.party[i], move, slot); },
    chooseMoveToForget: async (i, move) => {
      const r = player.party[i];
      // (The Move Deleter's: which move, as Kanto's asks.)
      const k = move ? await chooseMoveToForget(r, move) : await ask("Which move should be forgotten?",
        r.moves.map((m, j) => ({ label: m.name, value: j, className: "type-" + MOVES[m.name].type })).concat([back()]));
      show("world");
      return k == null || k === "back" ? -1 : k;
    },
    canLearnTutor: (i, move) => tutorCanLearn(player.party[i], move),
    relearnable: (i) => relearnable(player.party[i]).length,
    relearn: async (i, moves) => {
      const r = player.party[i];
      Screen.say("");
      clearMenu();
      const move = await MoveRelearner.open({
        name: Party.displayName(r), moves: moves || relearnable(r), known: r.moves.map((m) => m.name), frame: GameOptions.get().frame,
        forget: (m) => chooseMoveToForget(r, m), teach: (m, slot) => Party.teachMove(r, m, slot == null ? undefined : slot)
      });
      show("world");
      return !!(move && Party.knowsMove(r, move));
    },
    // (A song, or the map's own again, or none.)
    music: (song) => music(song === null ? avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[player.location.map] || {}).music : song || null),
    fanfare: (song) => (song ? fanfare(song) : Promise.resolve()),
    se: (name) => sfx(name),
    shake: (n, opts) => Overworld.shake(n, opts),
    moneyBox: (on) => moneyBox(on ? 0 : null, 0),
    moveWarp: (map, i, x, y) => { const w = ((window.WORLD_MAPS[map || player.location.map] || {}).warps || [])[i]; if (w) Object.assign(w, { x, y }); },
    pcSpace: () => player.boxes.reduce((n, box) => n + box.filter((r) => !r).length, 0),
    itemPocket: (id) => (window.ITEMS[id] ? Bag.pocket(id) : "Items")
  };
  const johto = JohtoScript.create(johtoEnv);

  // ---------- Hoenn (Emerald's scripts: ui/hoenn-script.js, tools/build-hoenn.js) ----------
  //
  // Its maps are data/emerald-maps.js's, with `region: "hoenn"`; its people say and do what
  // Emerald's scripts say (window.HOENN_SCRIPTS), with this game's own battles, shops and menus.
  const isHoenn = (map) => (window.WORLD_MAPS[map] || {}).region === "hoenn";
  let hoennEntering = null;
  const hoennEnv = Object.assign({}, johtoEnv, {
    // (While a map you're coming into runs its OnTransition and OnLoad, it's that map, not the one you left.)
    map: () => hoennEntering || player.location.map,
    // (Someone a flag hid, onto the map where it has them, or where the script put them.)
    show: (id) => {
      const map = player.location.map, def = (window.WORLD_MAPS[map] || { people: [] }).people.find((p) => p.localId === id);
      if (!def) return;
      hoenn.setShown(map, id, true);
      const at = hoenn.placed(map, id) || { x: def.x, y: def.y }, v = hoennVisible(def, map);
      Overworld.addObject(id, { x: at.x, y: at.y, facing: (/^face_(\w+)/.exec((v && v.movement) || def.movement || "") || [, "down"])[1] }, v && v !== true ? v : null);
    },
    // (Emerald's removeobject sets the person's flag too, so they're gone for good: May off Route 103 once beaten.)
    hide: (id) => {
      const def = ((window.WORLD_MAPS[player.location.map] || {}).people || []).find((p) => p.localId === id);
      if (def && def.flag && !def.item && /^FLAG_/.test(def.flag)) hoenn.setFlag(def.flag, true);
      hoenn.setShown(player.location.map, id, false); Overworld.removeObject(id);
    },
    place: (id, x, y, facing) => {
      const at = Overworld.personPosition(id);
      if (at) Overworld.addObject(id, { x, y, facing: facing || at.facing });
    },
    setMovement: (id, movement) => Overworld.setPersonMovement(id, movement),
    // Mr. Briney's boat (ui/hoenn-script.js voyage): aboard, out of sight, your Pokémon back in its Ball; the sea on
    // screen (the map you set out from and those joined to it); and landing on another map, on its boat.
    boardBoat: async () => {
      const at = Overworld.position(), m = window.WORLD_MAPS[at.map];
      if (!m || !m.people.some((p) => /_BOAT$/.test(p.localId || "") && /BRINEY/.test(p.flag || ""))) return null;
      Overworld.follower.hide(true);
      await Overworld.act([{ who: "player", moves: ["set_invisible"] }]);
      return at;
    },
    sailable: (map, x, y) => {
      const m = window.WORLD_MAPS[map];
      if (x >= 0 && y >= 0 && x < m.width && y < m.height) return true;
      return m.connections.some((c) => {
        const n = c.map && window.WORLD_MAPS[c.map];
        if (!n) return false;
        const [ox, oy] = World.connectionOrigin(m, c);
        return x >= ox && y >= oy && x < ox + n.width && y < oy + n.height;
      });
    },
    landBoat: async (v, mapConst) => {
      const name = mapConst && window.HOENN_SCRIPTS.consts[mapConst];
      let x = v.x, y = v.y;
      if (name && name !== v.map) {
        // (Where you are on that map: the maps' places from the joins between them, out from the one you set out from.)
        const at = { [v.map]: [0, 0] }, queue = [v.map];
        while (queue.length && !at[name]) {
          const mn = queue.shift(), m = window.WORLD_MAPS[mn];
          for (const c of m.connections || []) {
            if (!c.map || at[c.map] || !window.WORLD_MAPS[c.map]) continue;
            const [ox, oy] = World.connectionOrigin(m, c);
            at[c.map] = [at[mn][0] + ox, at[mn][1] + oy];
            queue.push(c.map);
          }
        }
        if (at[name]) { x -= at[name][0]; y -= at[name][1]; }
        if (!v.dark) await Overworld.fadeToBlack();
        Screen.say("");
        await Overworld.teleport({ map: name, x, y, facing: "down", hidden: true });
        // (Its boat under you, as you came in on it.)
        const boat = (window.WORLD_MAPS[name].people || []).find((p) => /_BOAT$/.test(p.localId || "") && /BRINEY/.test(p.flag || ""));
        if (boat) { hoenn.setShown(name, boat.localId, true); Overworld.addObject(boat.localId, { x, y: y + 1, facing: "down" }); }
        await Overworld.act([{ who: "player", moves: ["set_visible"] }]);
        await Overworld.fadeFromBlack();
      } else {
        await Overworld.act([{ who: "player", moves: ["set_visible"] }]);
        if (v.dark) await Overworld.fadeFromBlack();
      }
      Overworld.follower.hide(false);
    },
    personAt: (id) => (id === "player" ? Overworld.position() : Overworld.personPosition(id)),
    moveTo: (x, y) => Overworld.moveTo(x, y),
    giveItem: async (id, n, verb) => {
      if (!window.ITEMS[id]) return false;
      Player.addItem(player, id, n);
      if (!verb) return true;
      const name = Bag.name(id);
      await sayWithJingle(itemJingle(id), "{PLAYER} " + (verb === "found" ? "found " : "obtained ") + (n > 1 ? n + " " + itemPlural(name) : Bag.isKeyItem(id) ? "the " + name : article(name)) + "!");
    },
    beaten: (id) => !!player.flags[id],
    // (The PokéNav's Match Call: the Hoenn trainers registered, in Emerald's state: ui/pokegear.js.)
    registerMatchCall: (id) => { const s = hoenn.state(), mc = s.mc || (s.mc = []); if (mc.includes(id)) return false; mc.push(id); return true; },
    matchCallRegistered: (id) => ((hoenn.state().mc || []).includes(id)),
    setBeaten: (id, on) => { if (on) player.flags[id] = true; else delete player.flags[id]; },
    trainerBattle: (id, o) => hoennBattle(id, o),
    // (The weather the legendaries bring: Kyogre's rain, Groudon's sun, Rayquaza's winds.)
    wildBattle: (species, level, item) => johtoBattle("wild", species, level, { weather: ({ Kyogre: "PrimordialSea", Groudon: "DesolateLand", Rayquaza: "DeltaStream" })[species] }),
    warp: (mapConst, at) => hoennWarp(mapConst, at),
    setWeather: (name) => { hoennSaved = hoennKind(name); },
    decorMart: (keys) => hoennDecor.mart(keys),
    decorAdd: (key) => { const d = hoennDecor.byKey(key); return !!d && hoennDecor.give(d.id); },
    decorSpace: (key) => { const d = hoennDecor.byKey(key); return !!d && hoennDecor.count(d.cat) < HoennDecor.CAPACITY[d.cat]; },
    decorGive: async (key) => {
      const d = hoennDecor.byKey(key);
      if (!d || !hoennDecor.give(d.id)) return 0;
      await sayWithJingle("mus_obtain_item", "{PLAYER} obtained the " + d.name + "!");
      return 1;
    },
    metatileAt: (map, x, y) => metatileAt(map, x, y),
    setLayout: (map, layout) => hoennLayout(map, layout),
    syncSpecial: (name, api) => hoennSyncSpecial(name, api),
    fieldEffect: async (name) => { if (name === "FLDEFF_HALL_OF_FAME_RECORD") await HallOfFame.recordFlash($("#overlay")); },
    badge: (n, on) => {
      const b = Player.REGION_BADGES.hoenn[n];
      if (!b) return;
      if (on && !player.badges.includes(b)) player.badges.push(b);
      else if (!on) player.badges = player.badges.filter((x) => x !== b);
    },
    hasBadge: (n) => player.badges.includes(Player.REGION_BADGES.hoenn[n]),
    save: () => persist(),
    // (Emerald's system flags, as this game's: the Pokédex Birch gives you.)
    onFlag: (name, on) => { if (name === "FLAG_SYS_POKEDEX_GET") player.flags.pokedex = on; },
    // (The Game Corner's slot machines: ui/slot-machine.js.)
    slotMachine: async (id) => {
      Screen.say("");
      player.flags.coins = await window.SlotMachine.play({ machineId: id, coins: coins(), maxCoins: MAX_COINS, sfx, fanfare });
      show("world");
      await Overworld.resume();
    },
    showPicture: (species) => showPicture(species), hidePicture: () => hidePicture(),
    setMetatile: (map, x, y, id, impassable) => hoennMetatile(map, x, y, id, impassable),
    braille: (s) => braille(s),
    setDynamicWarp: (mapConst, x, y) => { const name = window.HOENN_SCRIPTS.consts[mapConst]; if (name) setDynamicWarp({ map: name, x, y }); },
    respawn: (id) => { const h = window.HOENN_SCRIPTS.heal[id]; if (h) player.flags.hoennRespawn = h; },
    special: (name, api) => hoennSpecial(name, api)
  });
  const hoenn = HoennScript.create(hoennEnv);
  // The Battle Frontier (ui/hoenn-frontier.js): Emerald's lobbies and battle rooms run their own scripts; this is what they ask for.
  const hoennFrontier = HoennFrontier.create({
    player: () => player, map: () => player.location.map, pyramidApply: () => pyramidApply(), getVar: (n) => hoenn.getVar(n), flag: (n) => hoenn.flag(n),
    createMon: (species, level, o) => Party.create(species, level, o),
    say: (t) => say(t), caught: (sp) => Player.hasCaught(player, sp), itemName: (id) => Bag.name(id),
    itemConst: (id) => "ITEM_" + String(id).toUpperCase().replace(/-/g, "_"),
    giveItem: async (id) => { if (!window.ITEMS[id]) return false; Player.addItem(player, id, 1); return true; },
    chooseParty: async ({ max, check, party }) => {
      // (Choosing among some of them: those stand in for your party while you choose.)
      const real = player.party;
      if (party) player.party = party;
      try { return await chooseBattleTeam(max, { check }); } finally { player.party = real; }
    },
    pick: async (title, labels) => { const i = await multichoice(title, 0, 0, labels); Screen.say(""); return i; },
    battle: (spec) => frontierBattle(spec),
    lastRecord: () => lastRecord, saveRecord: (rec) => { player.flags.hoennBattleRecord = rec; lastRecord = null; },
    // (The Apprentice asks what a Pokémon should hold: the Bag, for an item to suggest, which stays yours.)
    chooseItem: async () => {
      const r = await BagScreen.open({ pockets: bagPockets, pocketName: bagPocket, frame: GameOptions.get().frame, female: isGirl(),
        actions: (it) => (holdable(it.id) ? [{ label: "Suggest", value: "give" }] : []) });
      BagScreen.close();
      show("world");
      return r ? r.id : null;
    },
    bpBox: (on, n) => GbaMenus.fieldWindow("bp", on ? { x: 0, y: 0, amount: n, label: "BP", text: String(n || 0) } : null),
    // (The Factory's rental and swap screens and the Dome's tourney tree: ui/hoenn-frontier-screens.js.)
    factorySelect: async (mons) => { Screen.say(""); const r = await HoennFrontierScreens.factorySelect($("#overlay"), { mons, summary: (i) => summary(i, mons) }); show("world"); await Overworld.resume(); return r; },
    factorySwap: async (mine, theirs) => { Screen.say(""); const r = await HoennFrontierScreens.factorySwap($("#overlay"), { mine, theirs, summary: (which, i) => summary(i, which ? theirs : mine) }); show("world"); await Overworld.resume(); return r; },
    domeTree: async (d) => { Screen.say(""); await HoennFrontierScreens.tourneyTree($("#overlay"), d); show("world"); await Overworld.resume(); },
    // (A challenge you pause is saved where you started it: the lobby. Then the game starts over, as Emerald's soft reset.)
    markHome: () => { const at = Overworld.position(); hoennFrontier.state().home = { map: player.location.map, x: at.x, y: at.y, facing: at.facing || "down" }; },
    save: async (paused) => {
      tick();
      const s = hoennFrontier.state(), here = player.location;
      if (paused && s.home) player.location = Object.assign({}, s.home);
      try { Save.write(player); } finally { player.location = here; }
    },
    softReset: async () => { window.location.reload(); await new Promise(() => {}); }
  });
  hoennEnv.frontierOp = (op, a, api) => hoennFrontier.op(op, a, api);
  // The Contests (ui/hoenn-contest.js).
  const hoennContest = HoennContest.create({
    player: () => player, say: (t) => say(t), gameClear: () => !!player.flags.gameClear,
    pick: async (title, labels) => { const i = await multichoice(title, 0, 0, labels); Screen.say(""); return i; },
    choosePartyMon: (prompt) => hoennEnv.choosePartyMon(prompt)
  });
  hoennEnv.contestOp = (op, a, api) => hoennContest.op(op, a, api);
  // Pokéblocks (ui/hoenn-pokeblock.js): the Berry Blender (ui/berry-blender.js), the Pokéblock Case, feeding them.
  const hoennPokeblock = HoennPokeblock.create({
    player: () => player, say: (t) => say(t), confirm: (q) => confirm(q), flag: (n) => hoenn.flag(n), itemName: (id) => Bag.name(id), fanfare, sfx, rand: Math.random,
    pick: async (title, labels) => { const i = await multichoice(title, 0, 0, labels); Screen.say(""); return i; },
    chooseBerry: () => berryEnv.chooseBerry("Use"), choosePartyMon: (prompt) => hoennEnv.choosePartyMon(prompt),
    blender: async (players) => { show("scene"); clearMenu(); Screen.say(""); const r = await BerryBlender.run(scene, { players }); show("world"); await Overworld.resume(); return r; },
    feederInFront: () => hoennFeederInFront(), placeOnFeeder: (b) => hoennPlaceOnFeeder(b)
  });
  hoennEnv.healParty = () => { player.party.forEach(Party.heal); hoennFrontier.healTeam(); };
  // (The Safari Zone's Pokéblock feeders: hoennSafari below.)
  const hoennFeederInFront = () => (typeof hoennSafari !== "undefined" && hoennSafari.feederInFront ? hoennSafari.feederInFront() : 65535);
  const hoennPlaceOnFeeder = (b) => { if (typeof hoennSafari !== "undefined" && hoennSafari.placeOnFeeder) hoennSafari.placeOnFeeder(b); };
  // ---------- The Battle Pyramid's floor ----------
  const PYRAMID_FLOOR = "BattleFrontier_BattlePyramidFloor";
  // Its walls (and the way out, with its step) in place of the plain floor the map's drawn as.
  function pyramidApply() {
    const m = window.WORLD_MAPS[PYRAMID_FLOOR], F = hoennFrontier.pyramidLayout();
    if (!m || !F) return;
    restoreMetatiles(PYRAMID_FLOOR);
    for (const t of F.tiles) hoennMetatile(PYRAMID_FLOOR, t.x, t.y, "#" + t.m, !!t.c);
    m.triggers = F.exit ? [{ x: F.exit.x, y: F.exit.y, script: "hoenn:BattlePyramid_WarpToNextFloor", var: "VAR_TEMP_0", value: 0 }] : [];
  }
  // Its trainers and items, looking as Emerald's classes do.
  function pyramidPeople() {
    return hoennFrontier.pyramidPeople().map((p) => {
      if (p.pyramid == null) return p;
      const look = window.HOENN_SCRIPTS.gfx[p.look] || window.HOENN_SCRIPTS.gfx.OBJ_EVENT_GFX_BOY_1;
      window.WORLD_TRAINERS[p.trainer.id] = { className: p.className, name: p.name, pic: p.pic, party: [], music: "em_encounter_male", double: false, intro: p.trainer.intro, defeat: p.trainer.defeat };
      return Object.assign({}, look, p);
    });
  }
  TRAINER_SCRIPTS.add("Game_EventScript_PyramidTrainer");
  // A trainer on the floor: the same walk up and word as anyone's, then a battle for the challenge's three, and the floor's scripts see how it went.
  async function pyramidFight(person, approach, facing) {
    const t = person.trainer, who = "#" + person.id, map = player.location.map, s = hoennFrontier.state();
    const spec = hoennFrontier.pyramidTrainer(person.pyramid);
    if (!spec) return;
    music("em_encounter_male");
    if (approach != null) {
      await Overworld.act([{ who, moves: ["emote_exclamation_mark"].concat(Array(approach).fill("walk_" + facing)) }]);
      await Overworld.act([{ who: "player", moves: ["face_" + World.OPPOSITE[facing]] }]);
    }
    await say(t.intro);
    const outcome = await frontierBattle(spec);
    if (outcome === "won") player.flags[t.id] = true;
    s.outcome = outcome === "won" ? 1 : 2;
    if (outcome === "lost") show("world");
    await hoenn.resume(map);
    const label = hoenn.frameScript(player.location.map, false);
    if (label) await runHoenn(label);
    if (outcome === "won") await say(hoennFrontier.pyramidHint(person.pyramid, Overworld.position()));
  }
  async function pikeWildBattle(ev) {
    const s = hoennFrontier.state(), real = player.party, map = player.location.map;
    player.party = s.team;
    let outcome;
    try {
      outcome = await battle("wild", { foe: { name: "Wild", team: [wildMon(Party.create(ev.species, ev.level, ev.moves ? { moves: ev.moves } : {}))] }, noExp: true, noBlackout: true, noGimmicks: true, noCatch: true });
    } finally { player.party = real; }
    s.outcome = ({ won: 1, lost: 2, ran: 4 })[outcome] || 1;
    show("world"); await Overworld.resume();
    await hoenn.resume(map);
    const label = hoenn.frameScript(player.location.map, false);
    if (label) await runHoenn(label);
  }
  // A challenge's battle: the challenge's own Pokémon stand in for your party for its length.
  async function frontierBattle(spec) {
    if (!canBattle()) return "lost";
    // (For the bots that play-test it: HOENN_FORCE_WIN = "won" | "lost" settles each battle at once.)
    if (window.HOENN_DEBUG && window.HOENN_FORCE_WIN) return window.HOENN_FORCE_WIN;
    const real = player.party;
    player.party = spec.team;
    let outcome;
    try {
      const opts = { foe: spec.foe, defeatText: spec.defeatText, double: !!spec.double, noExp: true, noPrize: true, noBlackout: true, noGimmicks: true, arena: !!spec.arena, palace: !!spec.palace, record: true };
      if (spec.partner) { opts.partner = spec.partner; opts.chosen = spec.team.map((r, i) => i).slice(0, 2); }
      if (spec.foe2) opts.foe2 = spec.foe2;
      outcome = await battle("trainer", opts);
    } finally { player.party = real; }
    if (outcome !== "lost") { show("world"); await Overworld.resume(); }
    return outcome;
  }
  // The label of Emerald's script for what you've come to (a person, a sign, a step), unless this game has its own:
  // the nurses and clerks, the trainers on their sight lines, item balls, trees and rocks.
  function hoennScriptFor(ev) {
    const thing = ev.person || ev.sign || ev.trigger;
    if (!thing || !isHoenn(ev.map || player.location.map)) return null;
    const script = thing.script || "";
    // (A secret base spot: the way into your base once it's yours, into someone else's if it's theirs, the way to make one if not.)
    if (ev.sign && ev.sign.spot) {
      const npc = !hoennOwnSpot(ev.sign) && hoennNpcBaseAt(ev.map || player.location.map, ev.sign.spot);
      if (npc) { player.flags.hoennVisit = npc.id; return hoenn.scriptOf({ script: "SecretBase_EventScript_Enter" }); }
      return hoenn.scriptOf({ script: hoennOwnSpot(ev.sign) ? "SecretBase_EventScript_Enter" : "SecretBase_EventScript_CheckEntrance" });
    }
    // (The PC in someone else's base registers it: SecretBase_EventScript_RecordMixingPC.)
    if (ev.sign && script === "SecretBase_EventScript_PC" && hoennVisiting() && player.location.map === hoennVisiting().room) return hoenn.scriptOf({ script: "SecretBase_EventScript_RecordMixingPC" });
    if (SPECIAL.has(script) || /^EventScript_(CutTree|RockSmash|StrengthBoulder)$/.test(script)) return null;
    if (ev.person && ((ev.person.trainer && ev.person.trainer.id) || ev.person.item)) return null;
    return hoenn.scriptOf(thing);
  }
  // Whether someone's on a Hoenn map now: Emerald's flag for them (FLAG_HIDE_*), where a script put them, how they look.
  function hoennVisible(person, map) {
    if (map === PYRAMID_FLOOR && /^LOCALID_BATTLE_FRONTIER_BATTLE_PYRAMID_FLOOR_\d+$/.test(person.localId || "")) return false;   // (the floor's own people are put there as it's made: pyramidPeople)
    const f = player.flags, id = person.localId, shown = hoenn.shown(map, id);
    if (shown === false) return false;
    // (A tree you've cut or a rock you've smashed, till you leave the map: cutDown, smashRock.)
    if (person.flag && tempFlags.has(map + ":" + person.flag)) return false;
    if (person.item) { if (f[person.flag]) return false; }
    else if (person.flag && hoenn.flag(person.flag) && shown !== true) return false;
    const out = {};
    if (person.gfxVar) {
      const look = window.HOENN_SCRIPTS.gfx[hoenn.getVar(person.gfxVar)];
      if (!look) return false;
      Object.assign(out, look);
    }
    const at = hoenn.placed(map, id), mv = hoenn.movement(map, id);
    if (at) { out.x = at.x; out.y = at.y; }
    if (mv) out.movement = mv;
    return Object.keys(out).length ? out : true;
  }
  // Prof. Birch's rating on the PokéNav (Match Call's MC_TYPE_BIRCH: BufferPokedexRatingForMatchCall): Hoenn's seen and
  // caught, and what he says of it.
  function birchRatingPages() {
    const T = window.HOENN_SCRIPTS.t, seen = hoennDexCount("seen", true), caught = hoennDexCount("caught", true);
    const head = (T.gBirchDexRatingText_SoYouveSeenAndCaught || []).map((p) => fill(p, [String(seen), String(caught)]));
    const done = caught >= 200;
    return head.concat((T[done ? "gBirchDexRatingText_DexCompleted" : "gBirchDexRatingText_LessThan" + Math.min(200, (Math.floor(caught / 10) + 1) * 10)] || []).map((p) => fill(p)));
  }
  // A Pokémon from a map's grass (a registered trainer's call: STR_SPECIES_IN_ROUTE), by its constant.
  function wildOnMap(mapConst) {
    const m = window.WORLD_MAPS[(window.HOENN_SCRIPTS.consts || {})[mapConst]], slots = m && m.wild && m.wild.slots;
    return slots && slots.length ? Party.speciesName(slots[Math.floor(Math.random() * slots.length)].species) : null;
  }
  // A trainer's battle in a script (EM_ ids: data/emerald-maps.js): "won" or "lost".
  async function hoennBattle(id, o) {
    if (!canBattle()) return "lost";
    const data = window.WORLD_TRAINERS[id];
    if (!data) return "won";
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(id), pic: data.pic },
      defeatText: (o && o.defeat) || data.defeat || ["…"], trainerId: id, prizeClass: data.className, double: !!((o && o.double) || data.double) && canDouble() });
    if (outcome !== "lost") { show("world"); await Overworld.resume(); }
    return outcome;
  }
  // warp MAP, x, y (or a warp's number): out of the way you were, into the map.
  async function hoennWarp(mapConst, at) {
    const name = window.HOENN_SCRIPTS.consts[mapConst], dest = name && window.WORLD_MAPS[name];
    if (!dest) { await Overworld.fadeFromBlack(); return; }
    let x, y;
    if (at && at.warp != null && at.warp !== 255 && dest.warps[at.warp]) ({ x, y } = dest.warps[at.warp]);
    else if (at && at.x != null && at.x >= 0) ({ x, y } = at);
    else ({ x, y } = dest.warps[0] || { x: 0, y: 0 });
    // (A Battle Pyramid floor: made as you go in, and you start where its way in is.)
    if (name === PYRAMID_FLOOR && hoennFrontier.pyramidLayout) { ({ x, y } = hoennFrontier.pyramidLayout().start); pyramidApply(); }
    Screen.say("");
    await Overworld.teleport({ map: name, x, y, facing: "down" });
  }
  // Emerald's setmetatile: the tile is drawn over the map (from its sheet: assets/world/maps/<Map>-mt.png) and
  // opens or closes the way, until you leave the map (its scripts put them back as you come in).
  // A Gym's puzzle reads the metatiles too (src/field_specials.c): those maps keep theirs (`blocks`).
  const metatileSet = {}, metatileNow = {};
  function hoennMetatile(map, x, y, label, impassable) {
    const m = window.WORLD_MAPS[map];
    if (!m || x < 0 || y < 0 || x >= m.width || y >= m.height) return;
    const i = y * m.width + x, t = m.mt && m.mt[label];
    const base = baseCollision[map] || (baseCollision[map] = m.collision.slice()), baseB = baseBehavior[map] || (baseBehavior[map] = m.behavior.slice());
    void base; void baseB;
    m.collision[i] = impassable ? 1 : 0;
    if (t) {
      m.behavior[i] = t[1]; (metatileSet[map] = metatileSet[map] || {})[i] = t[0];
      if (m.blocks) (metatileNow[map] = metatileNow[map] || m.blocks.slice())[i] = t[2];
    }
  }
  // The metatile at a tile now (its number), and one set by its number (a Gym's special: the sheet has it, by label or "#number").
  const metatileAt = (map, x, y) => { const m = window.WORLD_MAPS[map]; return ((metatileNow[map] || m.blocks || [])[y * m.width + x]); };
  function hoennMetatileId(map, x, y, id, impassable) {
    const m = window.WORLD_MAPS[map], key = Object.keys(m.mt || {}).find((k) => m.mt[k][2] === id);
    if (key) hoennMetatile(map, x, y, key, impassable);
    else { m.collision[y * m.width + x] = impassable ? 1 : 0; if (m.blocks) (metatileNow[map] = metatileNow[map] || m.blocks.slice())[y * m.width + x] = id; }
  }
  // A layout a script swaps in (setmaplayoutindex): the tiles it changes, as setmetatile would (tools/build-hoenn.js has the differences).
  function hoennLayout(map, layout) {
    const m = window.WORLD_MAPS[map], list = m && m.layouts && m.layouts[layout];
    if (list) for (const [x, y, id, col] of list) hoennMetatileId(map, x, y, id, !!col);
  }
  // Coming into a Hoenn map: its own tiles again, before its scripts change them.
  function restoreMetatiles(map) {
    const m = window.WORLD_MAPS[map];
    if (!m || !baseCollision[map]) return;
    m.collision = baseCollision[map].slice(); m.behavior = baseBehavior[map].slice();
    delete metatileSet[map]; delete metatileNow[map];
  }
  const hoennOverlay = (map) => {
    const set = metatileSet[map], m = window.WORLD_MAPS[map];
    return set ? Object.keys(set).map((i) => [i % m.width, Math.floor(i / m.width), set[i]]) : null;
  };
  // Petalburg Gym's sliding doors (PetalburgGymSetDoorMetatiles): a room's doors, by Norman's rooms' numbers.
  const PETALBURG_DOORS = { 1: [[1, 104], [7, 104]], 2: [[1, 78], [7, 78]], 3: [[1, 91], [7, 91]], 4: [[7, 39]], 5: [[1, 52], [7, 52]], 6: [[1, 65]], 7: [[7, 13]], 8: [[1, 26]] };
  function petalburgDoors(room, frame) {
    const map = "PetalburgCity_Gym", m = window.WORLD_MAPS[map], id = m.mt["METATILE_PetalburgGym_SlidingDoor_Frame" + frame][2];
    for (const [x, y] of PETALBURG_DOORS[room] || []) { hoennMetatileId(map, x, y, id, frame < 4); hoennMetatileId(map, x, y + 1, id + 8, frame < 4); }   // (Open at the last frame.)
  }
  // Mauville Gym's beams and switches (MauvilleGymSetDefaultBarriers and MauvilleGymDeactivatePuzzle, which turn the
  // whole puzzle over, or off), by the tiles' names; MauvilleGymPressSwitch (the switch you stepped on is pressed).
  function mauvilleGym(what, switchNo) {
    const map = "MauvilleCity_Gym", m = window.WORLD_MAPS[map], L = (n) => m.mt["METATILE_MauvilleGym_" + n][2];
    const name = (id) => { const k = Object.keys(m.mt).find((q) => m.mt[q][2] === id); return k ? k.replace("METATILE_MauvilleGym_", "") : null; };
    const SWITCHES = [[0, 15], [4, 12], [3, 9], [8, 9]];
    if (what === "press") {
      SWITCHES.forEach(([x, y], i) => hoennMetatileId(map, x, y, L(i === switchNo ? "PressedSwitch" : "RaisedSwitch"), false));
      return;
    }
    const set = (x, y, n, imp) => hoennMetatileId(map, x, y, L(n), !!imp);
    if (what === "off") SWITCHES.forEach(([x, y]) => hoennMetatileId(map, x, y, L("PressedSwitch"), false));
    for (let y = 5; y < 17; y++) for (let x = 0; x < 9; x++) {
      const n = name(metatileAt(map, x, y)), beam = /^(Green|Red)BeamH(\d)_(On|Off)$/.exec(n || "");
      if (beam) {
        // (Each horizontal beam is turned over: on to off, and off to on, where its two top-most are walls: H3 and H4.)
        if (beam[3] === "On") set(x, y, beam[1] + "BeamH" + beam[2] + "_Off");
        else if (what === "flip") set(x, y, beam[1] + "BeamH" + beam[2] + "_On", beam[2] >= 3);
        continue;
      }
      switch (n) {
        case "GreenBeamV1_On": set(x, y, "PoleBottom_On", true); break;
        case "RedBeamV1_On": set(x, y, "PoleBottom_Off", true); break;
        case "GreenBeamV2_On": case "RedBeamV2_On": set(x, y, "FloorTile"); break;
        case "PoleTop_On": set(x, y, "PoleTop_Off"); break;
        case "PoleBottom_On": if (what === "flip") set(x, y, "GreenBeamV1_On", true); break;
        case "PoleBottom_Off": if (what === "flip") set(x, y, "RedBeamV1_On", true); break;
        case "PoleTop_Off": if (what === "flip") set(x, y, "PoleTop_On", true); break;
        case "FloorTile":
          if (what === "flip") set(x, y, name(metatileAt(map, x, y - 1)) === "GreenBeamV1_On" ? "GreenBeamV2_On" : "RedBeamV2_On", true);
          break;
      }
    }
  }
  if (window.HOENN_DEBUG) window.HoennDebug = Object.assign(window.HoennDebug || {}, { petalburgDoors, mauvilleGym, metatileAt, setWeather: (k) => { hoennSaved = k; } });
  // Runs a script; then whatever the map's frame table has due (a scene it set going).
  async function runHoenn(label, person) {
    const seen = new Set();
    for (let n = 0; label && n < 8; n++) {
      seen.add(label);
      await hoenn.run(label, { person });
      person = null;
      Screen.say("");
      label = hoenn.frameScript(player.location.map, false);
      if (label && seen.has(label)) break;
    }
    await persist();
  }
  // ---------- Hoenn's weather (src/field_weather.c; ui/weather.js draws it) ----------
  //
  // The map's own as you come in (its header: SetSavedWeatherFromCurrMapHeader), then what its scripts and the steps
  // you take put on it (setweather; src/coord_event_weather.c). Routes 119 and 123's cycle with the game's days, and the
  // abnormal weather of Kyogre and Groudon's fight swings between a downpour and a drought.
  const WEATHER_CYCLES = { route119_cycle: ["sunny", "rain", "thunderstorm", "rain"], route123_cycle: ["sunny", "sunny", "rain", "sunny"] };
  const WEATHER_ALIASES = { rain_thunderstorm: "thunderstorm", underwater_bubbles: "underwater" };
  let hoennSaved = "", hoennLastType = "", hoennCameFrom = "";   // (hoennCameFrom: the last map's type, while a map's scripts run as you come in)
  const hoennKind = (c) => {
    const k = String(c || "").replace(/^(COORD_EVENT_)?WEATHER_/, "").toLowerCase();
    return !k || k === "none" ? "" : WEATHER_ALIASES[k] || k;
  };
  const hoennOutdoors = (type) => /^(town|city|route|ocean_route|underwater)$/.test(type || "");
  function hoennWeatherNow() {
    let k = hoennSaved;
    if (WEATHER_CYCLES[k]) k = WEATHER_CYCLES[k][Player.gameTime(player).day % 4];
    else if (k === "abnormal") k = Math.floor(performance.now() / 25000) % 2 ? "drought" : "downpour";
    return k || "none";
  }
  // Coming into a map: its header's weather (before its scripts change it).
  function hoennWeatherEnter(name) {
    const m = window.WORLD_MAPS[name];
    hoennSaved = (m && m.weatherHeader) || "";
    return m;
  }
  // The steps that change it.
  function hoennWeatherStep() {
    const m = window.WORLD_MAPS[player.location.map];
    if (!m || m.region !== "hoenn" || !m.weatherSteps || !m.weatherSteps.length) return;
    const at = Overworld.position(), s = m.weatherSteps.find((q) => q.x === at.x && q.y === at.y);
    if (s) hoennSaved = s.weather;
  }
  // Hoenn's braille puzzles (Emerald's src/braille_puzzles.c): where the field move opens a way in, and the flag
  // that says it's open. Dig under the Sealed Chamber's DIG HERE; Rock Smash before the Desert Ruins' braille
  // (Regirock); Flash in the middle of the Ancient Tomb (Registeel). Island Cave's (Regice) is a lap of its room:
  // hoennRegiceStep.
  const BRAILLE_PUZZLES = {
    Dig: { map: "SealedChamber_OuterRoom", at: [[9, 3], [10, 3], [11, 3]], door: [9, 1], flag: "FLAG_SYS_BRAILLE_DIG" },
    "Rock Smash": { map: "DesertRuins", at: [[5, 23], [6, 23], [7, 23]], door: [7, 19], flag: "FLAG_SYS_REGIROCK_PUZZLE_COMPLETED" },
    Flash: { map: "AncientTomb", at: [[8, 25]], door: [7, 19], flag: "FLAG_SYS_REGISTEEL_PUZZLE_COMPLETED" }
  };
  function braillePuzzle(move) {
    const p = BRAILLE_PUZZLES[move], at = Overworld.position();
    if (!p || at.map !== p.map || hoenn.flag(p.flag) || !p.at.some(([x, y]) => x === at.x && y === at.y)) return null;
    return async () => {
      // (The doorway, its middle below the way in: DoBrailleRegirockEffect and the like.)
      const [x, y] = p.door;
      ["TopLeft", "TopMid", "TopRight", "BottomLeft", "BottomMid", "BottomRight"].forEach((part, i) =>
        hoennMetatile(p.map, x + (i % 3), y + (i < 3 ? 0 : 1), "METATILE_Cave_SealedChamberEntrance_" + part, i !== 4));
      sfx("se_bang");
      hoenn.setFlag(p.flag, true);
    };
  }
  // Island Cave (ShouldDoBrailleRegicePuzzle): once you've read its braille, a lap of the room along its wall, each
  // of these steps, then back to the braille; a step anywhere else and it's to start again (from the braille).
  const REGICE_PATH = [[4, 21], [5, 21], [6, 21], [7, 21], [8, 21], [9, 21], [10, 21], [11, 21], [12, 21], [12, 22], [12, 23], [13, 23],
    [13, 24], [13, 25], [13, 26], [13, 27], [12, 27], [12, 28], [4, 29], [5, 29], [6, 29], [7, 29], [8, 29], [9, 29], [10, 29], [11, 29],
    [12, 29], [4, 28], [4, 27], [3, 27], [3, 26], [3, 25], [3, 24], [3, 23], [4, 23], [4, 22]];
  // The S.S. Tidal's cruise (CountSSTidalStep): 205 steps on board and it's halfway, or there.
  function hoennCruiseStep() {
    if (!hoenn.flag("FLAG_SYS_CRUISE_MODE")) return null;
    const n = hoenn.getVar("VAR_CRUISE_STEP_COUNT") + 1;
    hoenn.setVar("VAR_CRUISE_STEP_COUNT", n);
    return n >= 205 ? { type: "hoenn-script", label: "SSTidalCorridor_EventScript_ReachedStepCount" } : null;
  }
  function hoennRegiceStep() {
    const at = Overworld.position();
    if (at.map !== "IslandCave" || hoenn.flag("FLAG_SYS_BRAILLE_REGICE_COMPLETED") || !hoenn.flag("FLAG_TEMP_REGICE_PUZZLE_STARTED") || hoenn.flag("FLAG_TEMP_REGICE_PUZZLE_FAILED")) return null;
    const i = REGICE_PATH.findIndex(([x, y]) => x === at.x && y === at.y);
    if (i < 0) { hoenn.setFlag("FLAG_TEMP_REGICE_PUZZLE_FAILED", true); hoenn.setFlag("FLAG_TEMP_REGICE_PUZZLE_STARTED", false); return null; }
    const v = "VAR_REGICE_STEPS_" + (1 + (i >> 4));
    hoenn.setVar(v, hoenn.getVar(v) | (1 << (i & 15)));
    if (hoenn.getVar("VAR_REGICE_STEPS_1") !== 0xffff || hoenn.getVar("VAR_REGICE_STEPS_2") !== 0xffff || hoenn.getVar("VAR_REGICE_STEPS_3") !== 0xf) return null;
    if (at.x !== 8 || at.y !== 21) return null;
    return { type: "hoenn-script", label: "IslandCave_EventScript_OpenRegiEntrance" };
  }
  // Cracked floors (Emerald's CrackedFloorPerStepCallback): the floor gives way under you and you fall to the floor
  // below (where the map's OnResume's setholewarp says), unless the Bicycle's going flat out: then it gives way
  // behind you. A hole stays a hole till you come back.
  const HOLE_WARPS = { GraniteCave_B1F: "GraniteCave_B2F", SkyPillar_2F: "SkyPillar_1F", SkyPillar_4F: "SkyPillar_3F", MirageTower_2F: "MirageTower_1F", MirageTower_3F: "MirageTower_2F" };
  function hoennCrackedStep() {
    const at = Overworld.position(), m = window.WORLD_MAPS[at.map];
    const c = m && m.cracked && HOLE_WARPS[at.map] && m.cracked.find((q) => q[0] === at.x && q[1] === at.y);
    if (!c) return null;
    const now = metatileSet[at.map] && metatileSet[at.map][at.y * m.width + at.x], hole = m.mt[c[2]][0];
    if (now != null && now !== hole) return null;   // (a sound floor laid over it: Sky Pillar's, before Rayquaza wakes)
    hoennMetatile(at.map, at.x, at.y, c[2], false);
    if (now == null && Overworld.bikeFastest()) return null;
    return { type: "hoenn-fall", map: HOLE_WARPS[at.map] };
  }
  // EventScript_FallDownHole: down to the same spot on the floor below (warphole).
  async function hoennFall(to) {
    const at = Overworld.position();
    await sleep(333);
    await Overworld.act([{ who: "player", moves: ["set_invisible"] }]);
    sfx("se_fall");
    await sleep(1000);
    await Overworld.teleport({ map: to, x: at.x, y: at.y, facing: at.facing });
  }
  // Ash on Route 113's and Jagged Pass's grass (Emerald's AshGrassPerStepCallback): walk through it and it falls off,
  // the grass under it showing till you come back, and with the Soot Sack it's gathered (VAR_ASH_GATHER_COUNT, to
  // 9,999: the Glass Workshop's).
  function hoennAshStep() {
    const map = player.location.map, m = window.WORLD_MAPS[map];
    if (!m || !m.ash) return;
    const at = Overworld.position(), a = m.ash.find((q) => q[0] === at.x && q[1] === at.y);
    if (!a || (metatileSet[map] && metatileSet[map][at.y * m.width + at.x] != null)) return;
    hoennMetatile(map, at.x, at.y, a[2], false);
    if (Player.itemCount(player, "soot-sack") > 0) hoenn.setVar("VAR_ASH_GATHER_COUNT", Math.min(9999, hoenn.getVar("VAR_ASH_GATHER_COUNT") + 1));
  }
  // Specials of Route 119 and 123's transitions: the cycle, unless you walked in from another route.
  function hoennSyncSpecial(name, api) {
    if (name === "SetRoute119Weather" || name === "SetRoute123Weather") {
      if (!hoennOutdoors(hoennCameFrom)) hoennSaved = name === "SetRoute119Weather" ? "route119_cycle" : "route123_cycle";
      return true;
    }
    // The Mirage Tower shows itself on half the days, until its event is done (src/mirage_tower.c).
    if (name === "SetMirageTowerVisibility") {
      const done = hoenn.getVar("VAR_MIRAGE_TOWER_STATE");
      hoenn.setFlag("FLAG_MIRAGE_TOWER_VISIBLE", !done && (hoenn.flag("FLAG_FORCE_MIRAGE_TOWER_VISIBLE") || Math.random() < 0.5));
      return true;
    }
    // Mirage Island is there on the days one of your Pokémon's personality matches the day's number (src/field_specials.c).
    if (name === "IsMirageIslandPresent") {
      const f = player.flags, day = Player.gameTime(player).day;
      if (f.mirageDay !== day) { f.mirageDay = day; f.mirageRnd = Math.floor(Math.random() * 0x10000); }
      api.set(player.party.some((r) => !r.egg && r.personality != null && (r.personality & 0xffff) === f.mirageRnd) ? 1 : 0);
      return true;
    }
    return false;
  }
  // Emerald's tutors' moves, in TUTOR_MOVE_ order (include/constants/party_menu.h).
  const HOENN_TUTOR_MOVES = ["Mega Punch", "Swords Dance", "Mega Kick", "Body Slam", "Double-Edge", "Counter", "Seismic Toss", "Mimic", "Metronome", "Soft-Boiled",
    "Dream Eater", "Thunder Wave", "Explosion", "Rock Slide", "Substitute", "Dynamic Punch", "Rollout", "Psych Up", "Snore", "Icy Wind", "Endure", "Mud-Slap",
    "Ice Punch", "Swagger", "Sleep Talk", "Swift", "Defense Curl", "Thunder Punch", "Fire Punch", "Fury Cutter"];
  let hoennTradeMon = null;
  const speciesNumber = (name) => Object.keys(window.DEX).indexOf(name) + 1;
  // The specials Emerald's scripts call that this game answers itself.
  let ssTidalPick = 127;   // (the S.S. Tidal's sailing just picked at Lilycove: ScriptMenu_CreateLilycoveSSTidalMultichoice)
  // How much of the Hoenn Pokédex you've seen or caught (`noMythicals`: but Jirachi and Deoxys, its last two).
  function hoennDexCount(which, noMythicals) {
    const list = (window.HOENN_SCRIPTS.hoennDex || []).slice(0, noMythicals ? -2 : undefined);
    const have = new Set(player.pokedex[which === "seen" ? "seen" : "caught"].map(Player.dexNumber));
    return list.filter((s) => have.has(Player.dexNumber(s))).length;
  }
  async function hoennSpecial(name, api) {
    // (The Safari Zone: in and out, Emerald's EnterSafariMode and ExitSafariMode.)
    if (name === "EnterSafariMode") { player.flags.safari = { balls: 30, steps: 500, hoenn: true, feeders: [], caught: 0 }; return true; }
    if (name === "ExitSafariMode") { delete player.flags.safari; return true; }
    // (A Secret Base owner's battle: SPECIAL_BATTLE_SECRET_BASE, in their base.)
    if (name === "DoSpecialTrainerBattle" && hoennVisiting() && player.location.map === hoennVisiting().room && /SECRET_BASE|^1$/.test(String(api.getVar("VAR_0x8004")))) { await api.flush(); await npcBaseBattle(api); return true; }
    if (await hoennFrontier.special(name, api)) return true;
    if (await hoennContest.special(name, api)) return true;
    if (await hoennPokeblock.special(name, api)) return true;
    switch (name) {
      // The Gyms' puzzles (src/field_specials.c).
      case "PetalburgGymSlideOpenRoomDoors": {
        await api.flush();
        sfx("se_unlock");
        for (let frame = 0; frame < 5; frame++) { petalburgDoors(+api.getVar("VAR_0x8004"), frame); await sleep(frame ? 70 : 20); }
        return true;
      }
      case "PetalburgGymUnlockRoomDoors": petalburgDoors(+api.getVar("VAR_0x8004"), 4); return true;
      case "MauvilleGymPressSwitch": mauvilleGym("press", +api.getVar("VAR_0x8004")); return true;
      case "MauvilleGymSetDefaultBarriers": mauvilleGym("flip"); return true;
      case "MauvilleGymDeactivatePuzzle": mauvilleGym("off"); return true;
      // The move tutors (src/data/move_tutors? Emerald's own list, party_menu.h): VAR_0x8005 is which, and VAR_RESULT says if it was taught.
      case "ChooseMonForMoveTutor": {
        await api.flush();
        const move = HOENN_TUTOR_MOVES[+api.getVar("VAR_0x8005")];
        api.setVar("VAR_RESULT", 0);
        if (!move) return true;
        const notes = player.party.map((r) => (r.egg || !tutorCanLearn(r, move) ? "NOT ABLE" : Party.knowsMove(r, move) ? "LEARNED" : "ABLE"));
        for (;;) {
          const record = await choosePartyFor("Teach which {PKMN}?", null, notes);
          show("world");
          if (!record) return true;
          const nm = Party.displayName(record);
          if (record.egg || !tutorCanLearn(record, move)) { await say(nm + " can't learn " + move + "."); continue; }
          if (Party.knowsMove(record, move)) { await say(nm + " already knows " + move + "."); continue; }
          await learnMove(record, move);
          if (Party.knowsMove(record, move)) api.setVar("VAR_RESULT", 1);
          return true;
        }
      }
      // In-game trades (src/trade.c): what they ask for, a Pokémon of yours, and what you get.
      case "GetInGameTradeSpeciesInfo": {
        const t = window.HOENN_SCRIPTS.trades[api.getVar("VAR_0x8004")];
        if (!t) { api.set(0); return true; }
        api.setBuffer(1, t.requested); api.setBuffer(2, t.species);
        api.set(speciesNumber(t.requested));
        return true;
      }
      case "GetTradeSpecies": { const r = player.party[+api.getVar("VAR_0x8005")]; api.set(!r || r.egg ? 0 : speciesNumber(r.species)); return true; }
      case "CreateInGameTradePokemon": {
        const t = window.HOENN_SCRIPTS.trades[api.getVar("VAR_0x8004")], mine = player.party[+api.getVar("VAR_0x8005")];
        if (!t || !mine) return true;
        const r = Party.create(t.species, mine.level, { nickname: t.nickname, shiny: false });
        const [hp, atk, def, spe, spa, spd] = t.ivs;
        Object.assign(r, { ivs: { hp, atk, def, spa, spd, spe }, personality: t.personality, ot: { name: t.otName, id: t.otId }, met: { level: mine.level, map: player.location.map, traded: true } });
        const dex = window.DEX[t.species], ab = dex.abilities[t.ability] || dex.abilities[0];
        if (ab) r.ability = ab;
        if (t.item && window.ITEMS[t.item]) r.item = t.item;
        r.hp = Party.maxHp(r);
        hoennTradeMon = r;
        return true;
      }
      case "DoInGameTradeScene": {
        await api.flush();
        const slot = +api.getVar("VAR_0x8005"), mine = player.party[slot];
        if (!mine || !hoennTradeMon) return true;
        await say(["Sending off " + Party.displayName(mine) + "…", "Please take good care of it!"]);
        sfx("se_ball");
        player.party[slot] = hoennTradeMon;
        Player.markSeen(player, hoennTradeMon.species);
        Player.markCaught(player, hoennTradeMon.species);
        await say([Party.displayName(hoennTradeMon) + " was received!"]);
        hoennTradeMon = null;
        await persist();
        return true;
      }
      // Naming a Pokémon you've been given (Common_EventScript_NameReceivedPartyMon, the Name Rater's).
      case "ChangePokemonNickname": {
        await api.flush();
        const r = player.party[+api.getVar("VAR_0x8004")];
        if (r) {
          const typed = await enterText(Party.speciesName(r.species) + "'s nickname?", Party.displayName(r), 10);
          if (typed && typed !== Party.speciesName(r.species)) r.nickname = typed;
          else if (typed === Party.speciesName(r.species)) delete r.nickname;
        }
        show("world");
        return true;
      }
      case "IsMonOTIDNotPlayers": { const r = player.party[+api.getVar("VAR_0x8004")]; api.set(r && r.ot && (r.ot.id !== player.trainerId || r.ot.name !== player.name) ? 1 : 0); return true; }
      // (Shoal Cave's tide, by the clock, as you come in from outside: high from 21:00 to 2:59 and 9:00 to 14:59.)
      case "UpdateShoalTideFlag": {
        if (hoennOutdoors(hoennCameFrom)) { const h = Player.gameTime(player).hour; hoenn.setFlag("FLAG_SYS_SHOAL_TIDE", h < 3 || (h >= 9 && h < 15) || h >= 21); }
        return true;
      }
      // Birch's Pokédex rating (src/birch_pc.c): the Hoenn Pokédex's seen and caught (VAR_0x8004 0), or the National's
      // (1, and yours is), and what he makes of the Hoenn count; and the Game Designer's diploma (all of the Hoenn
      // Pokédex but Jirachi and Deoxys).
      case "ScriptGetPokedexInfo": {
        const national = +api.getVar("VAR_0x8004") !== 0;
        api.setVar("VAR_0x8005", national ? Player.dexCount(player, "seen") : hoennDexCount("seen"));
        api.setVar("VAR_0x8006", national ? Player.dexCount(player, "caught") : hoennDexCount("caught"));
        api.set(1);
        return true;
      }
      case "ShowPokedexRatingMessage": {
        await api.flush();
        const n = +api.getVar("VAR_0x8004"), T = window.HOENN_SCRIPTS.t;
        const done = n >= 200 && hoennDexCount("caught", true) >= 200;
        await say((T[done ? "gBirchDexRatingText_DexCompleted" : "gBirchDexRatingText_LessThan" + Math.min(200, (Math.floor(n / 10) + 1) * 10)] || []).map(fill));
        return true;
      }
      // The news flash's Pokémon (src/roamer.c's InitRoamer): red, Latias; blue, Latios. It roams Hoenn till caught.
      case "InitRoamer": player.flags.hoennRoamer = +api.getVar("VAR_0x8004") === 1 ? "Latios" : "Latias"; return true;
      // The S.S. Tidal's sailings from Lilycove (src/script_menu.c's CreateLilycoveSSTidalMultichoice; its
      // GetLilycoveSSTidalSelection is done here too): Slateport, the Battle Frontier once you've met Scott on board,
      // and an island for a ticket (or the Old Sea Map) that's good (VAR_0x8004 1: only those just shown).
      case "ScriptMenu_CreateLilycoveSSTidalMultichoice": {
        await api.flush();
        const shown = +api.getVar("VAR_0x8004") === 1, sel = [];
        if (!shown) { sel.push(0); if (hoenn.flag("FLAG_MET_SCOTT_ON_SS_TIDAL")) sel.push(1); }
        // (Not Navel Rock's or Birth Island's: this game hasn't them.)
        for (const [i, item, on, seen] of [[2, "eon-ticket", "FLAG_ENABLE_SHIP_SOUTHERN_ISLAND", "FLAG_SHOWN_EON_TICKET"], [5, "old-sea-map", "FLAG_ENABLE_SHIP_FARAWAY_ISLAND", "FLAG_SHOWN_OLD_SEA_MAP"]]) {
          if (!Player.itemCount(player, item) || !hoenn.flag(on)) continue;
          if (!shown) sel.push(i); else if (!hoenn.flag(seen)) { sel.push(i); hoenn.setFlag(seen, true); }
        }
        // (This game's own: Sinnoh, with Norman's ticket from after the Hall of Fame; a save already past him gets it
        // here. Its run isn't sailing yet: it's back to the desk.)
        if (!shown && hoenn.flag("FLAG_SYS_GAME_CLEAR") && hoenn.flag("FLAG_RECEIVED_SS_TICKET") && !Player.itemCount(player, "sinnoh-ticket")) {
          await say(fill("Oh, {PLAYER}! The ferry company left\nthis for Hoenn's new Champion."));
          Player.addItem(player, "sinnoh-ticket", 1);
          await sayWithJingle("mus_obtain_key_item", fill("{PLAYER} received the " + Bag.name("sinnoh-ticket") + "!"));
        }
        if (!shown && Player.itemCount(player, "sinnoh-ticket")) sel.push(7);
        sel.push(6);
        const k = await hoennEnv.choose(sel.map((i) => ({ 0: "Slateport City", 1: "Battle Frontier", 2: "Southern Island", 5: "Faraway Island", 6: "Exit", 7: "Sinnoh" })[i]), null);
        // (Sinnoh: off at once, to Sandgem Town's beach: sailToSinnoh.)
        if (sel[k] === 7) {
          await say(["The S.S. Tidal for Sinnoh.\nYou have your Sinnoh Ticket?", "All aboard! We'll be setting sail\nshortly."]);
          afterScript = sailToSinnoh;
          api.cut();
          return true;
        }
        ssTidalPick = k < 0 ? 127 : sel[k];
        return true;
      }
      // (The script's switch reads it from here: the menu's pick, as Emerald's GetLilycoveSSTidalSelection gives it.)
      case "GetLilycoveSSTidalSelection": api.set(ssTidalPick); return true;
      // A scrollable menu (src/field_specials.c's ShowScrollableMultichoice), VAR_0x8004's: the Battle Frontier's prize
      // desks and move tutors, Slateport's Berry Powder shop.
      case "ShowScrollableMultichoice": {
        const items = (window.HOENN_SCRIPTS.scrollMulti || [])[+api.getVar("VAR_0x8004")];
        if (!items) { api.set(127); return true; }
        await api.flush();
        const k = await hoennEnv.choose(items, null);
        api.set(k < 0 ? 127 : k);
        return true;
      }
      // (On board, the voyage goes on as you walk about the ship: src/field_specials.c's cruise steps, 205 of them.)
      case "SetSSTidalFlag": hoenn.setFlag("FLAG_SYS_CRUISE_MODE", true); hoenn.setVar("VAR_CRUISE_STEP_COUNT", 0); return true;
      case "ResetSSTidalFlag": hoenn.setFlag("FLAG_SYS_CRUISE_MODE", false); return true;
      // (The Match Call tutorial in Rustboro: this game's Start menu has no PokéNav to pick, so it's picked for you.)
      case "ScriptMenu_CreateStartMenuForPokenavTutorial": api.set(3); return true;
      case "OpenPokenavForTutorial": return true;
      case "HasAllHoennMons": api.set(hoennDexCount("caught", true) >= 200 ? 1 : 0); return true;
      // (The Sealed Chamber: Wailord first in the party, and Relicanth last.)
      case "CheckRelicanthWailord": { const p = player.party, last = p[p.length - 1]; api.set(p[0] && !p[0].egg && p[0].species === "Wailord" && last && !last.egg && last.species === "Relicanth" ? 1 : 0); return true; }
      case "MonOTNameNotPlayer": { const r = player.party[+api.getVar("VAR_0x8004")]; api.set(r && r.ot && r.ot.name !== player.name ? 1 : 0); return true; }
      // The Hall of Fame (ending the story: EverGrandeCity_HallOfFame): the team on record, the Hall of Fame screen, then home.
      case "GameClear": {
        await api.flush();
        hoenn.setFlag("FLAG_SYS_GAME_CLEAR", true);   // (Emerald's GameClear sets it, for the post-game's scripts, and the Delta Episode)
        const f = player.flags, h = f.hoennRespawn || hoennBedroom();
        League.reset(f);
        player.party.forEach(Party.heal);
        const entry = League.record(f, player.party.filter((r) => !r.egg).map((r) => Object.assign({}, r, { form: Party.form(r) })),
          { name: player.name, id: player.trainerId, playTimeMs: player.playTimeMs });
        player.location = Object.assign({ facing: "down" }, h);
        music(null);
        await Overworld.fadeToBlack();
        await HallOfFame.show($("#overlay"), entry, {
          cry, sfx, music, player: { name: player.name, id: player.trainerId, playTimeMs: player.playTimeMs, pic: Player.LOOKS[player.look].front },
          save: async () => { tick(); Save.write(player); savePromptAt = player.playTimeMs; }
        }).catch((e) => { console.error(e); tick(); Save.write(player); });
        // Then Emerald's credits: you and your rival biking through Hoenn, the Pokémon you caught between.
        await HallOfFame.hoennCredits($("#overlay"), { skippable: true, music, girl: isGirl(), caught: player.pokedex.caught.slice(),
          starter: ["Treecko", "Torchic", "Mudkip"][+api.getVar("VAR_STARTER_MON")] || "Treecko" }).catch((e) => console.error(e));
        $("#overlay").classList.add("hidden");
        show("world");
        await Overworld.teleport({ map: h.map, x: h.x, y: h.y, facing: "down" });
        await Overworld.fadeFromBlack();
        return true;
      }
      // Mt. Chimney's cable car: across to the other station (the ride's scene isn't built).
      case "CableCarWarp": return true;
      case "CableCar": {
        await api.flush();
        const to = +api.getVar("VAR_0x8004") ? "Route112_CableCarStation" : "MtChimney_CableCarStation";
        Screen.say("");
        await Overworld.fadeToBlack();
        await Overworld.teleport({ map: to, x: 6, y: 4, facing: "up" });
        await Overworld.fadeFromBlack();
        return true;
      }
      // Sootopolis' sky: Groudon and Kyogre's fight, then Rayquaza's coming (src/rayquaza_scene.c; ui/rayquaza-scene.js).
      case "Script_DoRayquazaScene": {
        await api.flush();
        Screen.say("");
        await RayquazaScene.play($("#overlay"), +api.getVar("VAR_0x8004") ? 1 : 0, { cry, sfx, music });
        $("#overlay").classList.add("hidden");
        show("world");
        return true;
      }
      // The Mirage Tower's end (Route 111): the ground shakes, you fall, the tower comes apart a row at a time.
      case "StartMirageTowerShake": await api.flush(); sfx("se_ice_crack"); await Overworld.shake(40, { x: 1, y: 1, delay: 2 }); return true;
      case "StartPlayerDescendMirageTower": await sleep(700); return true;
      case "StartMirageTowerDisintegration": {
        const list = ((window.WORLD_MAPS.Route111.layouts || {}).LAYOUT_ROUTE111_NO_MIRAGE_TOWER || []).slice().sort((a, b) => b[1] - a[1] || a[0] - b[0]);
        for (let i = 0; i < list.length; i += 3) {
          for (const [x, y, id, col] of list.slice(i, i + 3)) hoennMetatileId("Route111", x, y, id, !!col);
          sfx("se_ball_throw");
          await sleep(160);
        }
        return true;
      }
      case "StartMirageTowerFossilFallAndSink": sfx("se_fall"); await sleep(900); return true;
      case "DoMirageTowerCeilingCrumble": await api.flush(); sfx("se_ice_crack"); await Overworld.shake(30, { x: 1, y: 1, delay: 2 }); return true;
      // The Secret Base (data/scripts/secret_base.inc).
      case "GetSecretBaseTypeInFrontOfPlayer": {
        const s = spotAhead();
        if (s) api.setVar("VAR_0x8007", window.HOENN_SCRIPTS.numConsts["SECRET_BASE_" + s.spot.replace(/^SECRET_BASE_/, "").replace(/\d+_\d+$/, "")] || 0);
        return true;
      }
      case "CheckPlayerHasSecretBase": api.set(secretBase() ? 1 : 0); return true;
      case "SetPlayerSecretBase": {
        const s = spotAhead();
        if (s) player.flags.secretBase = { map: BASE_ROOM(s.spot), spot: { map: player.location.map, x: s.x, y: s.y, id: s.spot } };
        return true;
      }
      case "EnterSecretBase": {
        await api.flush();
        const v = hoennVisiting(), s = spotAhead();
        hoennSpotOpen(player.location.map);
        if (v && s && s.spot === v.id && !hoennOwnSpot(s)) await baseGo(v.room, v, true);
        else { delete player.flags.hoennVisit; await secretBaseGo(true); }
        return true;
      }
      case "EnterNewlyCreatedSecretBase": await api.flush(); hoennSpotOpen(secretBase().spot.map); await persist(); return true;
      case "ClearAndLeaveSecretBase": await api.flush(); await secretBaseGo(false); secretBaseClear(); await persist(); return true;
      case "MoveOutOfSecretBase": await api.flush(); await secretBaseGo(false); secretBaseClear(); await persist(); return true;
      case "MoveOutOfSecretBaseFromOutside": secretBaseClear(); await persist(); return true;
      case "GetSecretBaseNearbyMapName": { const b = secretBase(); api.setBuffer(1, b ? (window.WORLD_MAPS[b.spot.map] || {}).title || "" : ""); return true; }
      case "IsCurSecretBaseOwnedByAnotherPlayer": { const s = spotAhead(); api.set(s && !hoennOwnSpot(s) && hoennNpcBaseAt(player.location.map, s.spot) ? 1 : 0); return true; }
      // Someone else's base: its owner (secret_base.c's GetSecretBaseOwnerAndState and the rest), once a day.
      case "SetSecretBaseOwnerGfxId": { const v = hoennVisiting(); if (v) api.setVar("VAR_OBJ_GFX_ID_F", NPC_BASE_LOOKS[v.type]); return true; }
      case "GetSecretBaseOwnerAndState": { const v = hoennVisiting(); api.setVar("VAR_0x8004", v ? v.type : 0); api.set(v && v.battledDay === dayKey() ? 1 : 0); return true; }
      case "SetBattledOwnerFromResult": { const v = hoennVisiting(); if (v) v.battledDay = +api.getVar("VAR_RESULT") ? dayKey() : null; return true; }
      case "CopyCurSecretBaseOwnerName_StrVar1": { const v = hoennVisiting(); api.setBuffer(1, v ? v.name : ""); return true; }
      case "GetCurSecretBaseRegistrationValidity": { const v = hoennVisiting(); api.set(!v ? 2 : v.registered ? 1 : hoennNpcBases().filter((b) => b.registered).length >= 10 ? 2 : 0); return true; }
      case "ToggleCurSecretBaseRegistry": { const v = hoennVisiting(); if (v) v.registered = !v.registered; return true; }
      case "PrepSecretBaseBattleFlags": case "DeclinedSecretBaseBattle": case "WonSecretBaseBattle": case "LostSecretBaseBattle": case "DrewSecretBaseBattle":
      case "CheckInteractedWithFriendsDollDecor": case "CheckInteractedWithFriendsCushionDecor": return true;
      case "ShowSecretBaseDecorationMenu": await api.flush(); Screen.say(""); await hoennDecor.menu("base", player.location.map); return true;
      case "InitSecretBaseDecorationSprites": case "InitSecretBaseVars": case "DoSecretBasePCTurnOffEffect": case "DoPCTurnOnEffect": case "DoPCTurnOffEffect": case "ShowSecretBaseRegistryMenu": return true;
      // The red and blue orbs' light.
      case "DoOrbEffect": await api.flush(); sfx("se_orb"); await sleep(700); return true;
      case "FadeOutOrbEffect": await sleep(400); return true;
      case "FieldShowRegionMap": await api.flush(); await townMap(); show("world"); return true;
      // Wally's catching lesson (Petalburg's OnFrame; Emerald's StartWallyTutorialBattle and LoadWallyZigzagoon): a
      // wild Ralts, Lv. 5, and Wally with Norman's Zigzagoon, Lv. 7, knowing only Tackle; the battle plays itself
      // (ui/battle-screen.js's wallyLoop) and the Ralts is caught. Your own party isn't touched.
      case "LoadWallyZigzagoon": case "SavePlayerParty": case "LoadPlayerParty": return true;
      case "StartWallyTutorialBattle": {
        await api.flush();
        const zig = Party.create("Zigzagoon", 7);
        zig.moves = zig.moves.filter((m) => m.name === "Tackle").slice(0, 1);
        if (!zig.moves.length) zig.moves = [{ name: "Tackle", pp: 35 }];
        const ralts = Party.create("Ralts", 5);
        ralts.gender = "M";   // (CreateMaleMon)
        music("em_vs_wild");
        await Overworld.battleTransition();
        show("field");
        await BattleScreen.run({
          p1: { name: "Wally", team: [Party.toBattleSet(zig)] }, p2: { name: "Wild", team: [Party.toBattleSet(ralts)] }, wild: true, wally: true,
          trainer: "wally", exp: false, levelCap: 100, terrain: battleTerrain({}), bag: {}, bagPockets: () => [],
          opponent: randomMove, forgetMove: () => 0, summary: () => null
        }).catch((e) => console.error(e));
        show("world");
        await Overworld.resume();
        music(null);
        return true;
      }
      case "ChooseStarter": {
        await api.flush();
        const picks = ["Treecko", "Torchic", "Mudkip"];
        for (;;) {
          const i = await multichoice("Which Pokémon will you choose?", 0, 0, picks);
          Screen.say("");
          if (i < 0 || i >= picks.length) continue;
          showPicture(picks[i]);
          cry(picks[i]);
          const yes = await confirm("You'll take " + picks[i] + ", the " + ["Grass", "Fire", "Water"][i] + "-type Pokémon?");
          hidePicture();
          if (!yes) continue;
          api.setVar("VAR_STARTER_MON", i);
          api.setVar("VAR_HOENN_STARTER_SPECIES", picks[i]);   // (Birch's "{PLAYER} received the ...": ui/hoenn-changes.js)
          const record = Party.create(picks[i], 5);
          // (Birch's first battle, a wild Poochyena, Lv. 2, is the Pokémon's own, whoever leads your party; with your
          // party full, it's with you for the battle and goes to the PC after.)
          const full = player.party.length >= 6;
          if (full) player.party.push(record); else Player.receive(player, record);
          await say("{PLAYER} received " + picks[i] + "!");
          await johtoBattle("wild", "Poochyena", 2, { chosen: [player.party.indexOf(record)] });
          if (full) {
            player.party.splice(player.party.indexOf(record), 1);
            const to = Player.receive(player, record);
            if (to) await say(Party.displayName(record) + " was sent to the PC" + (to.startsWith("box ") ? " (Box " + to.slice(4) + ")" : "") + ".");
          }
          // (Back from the battle to Route 101, faded in: Emerald's ChooseStarter returns to the field so.)
          await Overworld.fadeFromBlack();
          return true;
        }
      }
    }
    return false;
  }
  // HGSS's walking Pokémon (ui/follower.js), and Johto's Headbutt trees and
  // Kurt's Apricorn Balls (ui/johto-field.js).
  const follower = Follower.create({
    player: () => player, say: (pages) => say(pages), confirm: (q) => confirm(q), cry: (species) => cry(species),
    hop: () => Overworld.follower.hop(),
    giveItem: async (id) => { Player.addItem(player, id); await sayWithJingle(itemJingle(id), "{PLAYER} received " + article(Bag.name(id)) + "!"); },
    here: () => {
      const at = Overworld.position(), ahead = Overworld.ahead();
      return { map: at.map, grass: World.isGrass(World.blockAt(at.map, at.x, at.y)), water: !!ahead.water };
    }
  });
  const johtoField = JohtoField.create({
    player: () => player, say: (pages) => say(pages), confirm: (q) => confirm(q),
    choose: async (texts) => { const i = await multichoice(null, 0, 0, texts); Screen.say(""); return i; },
    quantity: async (text, max) => { const n = await chooseQuantity(text, max); Screen.say(""); return n; },
    apricornBox: () => apricornBox("give"),
    itemName: (id) => Bag.name(id), text: (id) => window.JOHTO_SCRIPTS.messages[id] || null,
    choosePartyFor: async (message, notes) => { const r = await choosePartyFor(message, null, notes); show("world"); return r; },
    learnMove: (record, move) => learnMove(record, move),
    wildBattle: (species, level) => johtoBattle("wild", species, level),
    shake: () => { Screen.say(""); return Overworld.shake(8, { x: 1, y: 0, delay: 3 }); },
    johtoState: () => johto.state(), takeItem: (id, n) => Player.removeItem(player, id, n)
  });

  // An in-game trade's Pokémon (JOHTO_SCRIPTS.trades, HGSS's NPCTrade): its
  // nickname, trainer, IVs, nature, ability, gender and held item, never shiny.
  function johtoTradeMon(t, level) {
    const r = Party.create(t.gives, level, { nickname: t.nickname, shiny: false });
    Object.assign(r, { ivs: Object.assign({}, t.ivs), nature: t.nature, gender: t.gender, personality: t.personality, ot: { name: t.ot.name, id: t.ot.id },
      met: { level, map: player.location.map, traded: true } });
    const dex = window.DEX[t.gives];
    if (t.ability && (dex.abilities.includes(t.ability) || dex.hiddenAbility === t.ability)) r.ability = t.ability;
    if (t.item && window.ITEMS[t.item]) r.item = t.item;
    r.hp = Party.maxHp(r);
    return r;
  }
  // HeartGold's Pokégear (ui/pokegear.js): its phone (HGSS's people and
  // their calls, and the trainers' rematches), the Town Map and the radio.
  const gear = Pokegear.create({
    player: () => player, johto: () => johto, map: () => player.location.map, isGirl, sfx, music, fanfare, pokenav: () => hasPokenav(),
    // (The PokéNav's: Emerald's flags and state, its words filled in, Prof. Birch's rating, a map's wild Pokémon, your battles.)
    hoenn: () => hoenn, fill: (s, vars) => fill(s, vars), birchCall: () => birchRatingPages(), wildOn: (mapConst) => wildOnMap(mapConst),
    trainerBattles: () => Object.keys(player.flags).filter((k) => /^(EM_|HGSS_)?TRAINER_/.test(k) && player.flags[k] === true).length,
    mapMusic: () => music(avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[player.location.map] || {}).music),
    townMap: () => townMap(), say: (pages) => say(pages), confirm: (q) => confirm(q),
    choose: async (texts, question) => { const i = await multichoice(question || null, 0, 0, texts); Screen.say(""); return i; },
    amount: async (text, max, o) => { Screen.say(text); clearMenu(); const n = await Pokegear.amount($("#overlay"), Object.assign({ max, frame: GameOptions.get().frame }, o)); Screen.say(""); return n; },
    giveItem: async (id, n) => {
      if (!window.ITEMS[id]) return;
      Player.addItem(player, id, n || 1);
      const name = Bag.name(id);
      await sayWithJingle(itemJingle(id), "{PLAYER} received " + (n > 1 ? n + " " + itemPlural(name) : article(name)) + "!");
    },
    hasItem: (id) => Player.itemCount(player, id) > 0,
    money: () => player.money, addMoney: (n) => Player.addMoney(player, n), removePerson: (person) => Overworld.removePerson(person),
    gameClear: () => !!player.flags.johtoLeagueClear || johto.flag("FLAG_GAME_CLEAR"),
    beaten: (id) => !!player.flags[id], setBeaten: (id, on) => { if (on) player.flags[id] = true; else delete player.flags[id]; },
    rematch: async (person, id, intro) => {
      const data = window.WORLD_TRAINERS[id];
      if (!data || !canBattle()) return "lost";
      music(johtoEyes(data));
      await say(intro);
      return johtoBattle("trainer", id);
    },
    badges: () => ({ johto: Player.REGION_BADGES.johto.filter((b) => player.badges.includes(b)).length, all: player.badges.length }),
    dex: () => ({ seen: Player.dexCount(player, "seen"), caught: Player.dexCount(player, "caught") }),
    caught: (species) => Player.hasCaught(player, species),
    dayCare: () => [].concat(player.flags.johtoDayCare || []).map((r) => r && Party.displayName(r.mon || r)).filter(Boolean),
    frame: () => GameOptions.get().frame,
    baobaCall: (script) => johtoSafari.phoneCall(script)   // (Baoba's calls: ui/johto-safari.js)
  });
  // The Pokéathlon Dome's courses, Athlete Points and Athlete Shop (ui/pokeathlon.js), for its scripts.
  Pokeathlon.attach({
    player: () => player, say: (pages) => say(pages), sfx, music, fanfare, persist, show, scene: () => scene,
    choosePartyFor: async (message, notes, cursor) => { const r = await openParty({ message, notes, cursor }); PartyMenu.close(); return r ? player.party[r.slot] : null; },
    displayName: (r) => Party.displayName(r),
    resume: () => Overworld.resume(), setFlag: (name, on) => johto.setFlag(name, on), frame: () => GameOptions.get().frame,
    mapView: () => ({ canvas: $("#world"), x: 112, y: 48 }), fieldWindow: (name, spec) => GbaMenus.fieldWindow(name, spec),
    moneyBox: (on) => (on ? moneyBox(20, 1) : moneyBox()), boxCount: () => Player.boxed(player).length, nationalDex: () => Player.nationalDex(player)
  });
  // Johto's Safari Zone (ui/johto-safari.js): its Areas and their Pokémon, the
  // Safari Game, Baoba's tests and the Area Customizer.
  const johtoSafari = JohtoSafari.create({
    player: () => player, say: (pages) => say(pages), confirm: (question) => confirm(question),
    choose: async (texts, o) => { const i = await multichoice(o.question, 0, 0, texts, o.shown ? { shown: o.shown } : {}); Screen.say(""); return i; },
    teleport: (to) => Overworld.teleport(to), getVar: (name) => johto.getVar(name), setVar: (name, v) => johto.setVar(name, v),
    applyPatches: (map) => applyPatches(map), sfx: (name) => sfx(name),
    // (The scene the room's frame table has due once you're there: the attendant seeing you out.)
    frameScript: async () => { const js = johto.frameScript(player.location.map); if (js) await runJohto(js, null); },
    roomFor: () => player.party.length < Player.PARTY_SIZE || player.boxes.some((b) => Player.firstEmpty(b) >= 0),
    // (Object Arrangement: Baoba's calls on the Pokégear, and the arranging screen, ui/johto-safari-objects.js.)
    isGirl, phone: () => gear.has(), phoneTrigger: (n, on) => gear.setTrigger(n, on), nationalDex: () => Player.nationalDex(player),
    here: () => ({ x: player.location.x, y: player.location.y }),
    arrange: (api) => JohtoSafariObjects.open(api, { frame: GameOptions.get().frame })
  });
  // Prof. Elm's three Pokémon (HGSS's ChooseStarter): each one's picture, and
  // "Will you take it?", until you choose. It joins your party (or the PC);
  // returns where it is in the party, or -1.
  const JOHTO_STARTERS = ["Chikorita", "Cyndaquil", "Totodile"];
  const JOHTO_STARTER_LEVEL = 5;
  async function johtoStarter() {
    for (;;) {
      const i = await multichoice("Which Pokémon will you choose?", 0, 0, JOHTO_STARTERS);
      Screen.say("");
      if (i < 0 || i >= JOHTO_STARTERS.length) continue;
      const species = JOHTO_STARTERS[i];
      showPicture(species);
      cry(species);
      const yes = await confirm("You'll take " + species + ", the " + ["Grass", "Fire", "Water"][i] + "-type Pokémon?");
      hidePicture();
      if (!yes) continue;
      const record = Party.create(species, JOHTO_STARTER_LEVEL);
      const where = Player.receive(player, record);
      return where === "party" ? player.party.indexOf(record) : -1;
    }
  }
  // A battle a script starts: a trainer (HGSS's, window.WORLD_TRAINERS) or a wild Pokémon.
  async function johtoBattle(kind, id, level, extra) {
    if (!canBattle()) return "lost";
    let outcome;
    if (kind === "trainer") {
      const data = window.WORLD_TRAINERS[id];
      if (!data) return "won";
      outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(id), pic: data.pic },
        defeatText: data.defeat || ["…"], trainerId: id, prizeClass: data.className, double: !!data.double && canDouble() });
    } else {
      if (!window.DEX[id]) return "won";
      outcome = await battle("wild", Object.assign({ foe: { name: "Wild", team: [wildMon(Party.create(id, level))] } }, extra));
    }
    if (outcome !== "lost") { show("world"); await Overworld.resume(); }
    return outcome;
  }
  // Runs a script; then whatever the map's frame table has due (a scene it set going).
  async function runJohto(js, person) {
    const seen = new Set();
    for (let n = 0; js && n < 5; n++) {
      seen.add(js.zone + ":" + js.label);
      await johto.run(js.zone, js.label, { person });
      person = null;
      Screen.say("");
      js = johto.frameScript(player.location.map);
      if (js && seen.has(js.zone + ":" + js.label)) break;
    }
    await oakRockClimb();
    await persist();
  }
  // HGSS's Prof. Oak gives you HM08 Rock Climb in his lab once you've all
  // sixteen Badges (scr_seq_T01R0301); here, as you come to Johto with
  // Kanto's eight, he calls on the Pokégear as you get the Rising Badge, and
  // it's this game's HM11.
  async function oakRockClimb() {
    if (!player.flags.rockClimbDue) return;
    delete player.flags.rockClimbDue;
    if (Player.itemCount(player, "hm11")) return;
    await say(["Professor Oak is calling on the Pokégear…", "Professor Oak: Good to see you!\nThis is what I've wanted to give to you!"]);
    Player.addItem(player, "hm11");
    await sayWithJingle(itemJingle("hm11"), "{PLAYER} received " + Bag.name("hm11") + "!");
    await say(["Professor Oak: That Hidden Machine\ncontains the move Rock Climb!", "When you teach it to a Pokémon,\nyou can go up rock walls that have\nsteps carved in them."]);
  }
  // The Ruins of Alph (ui/johto-alph.js): a chamber's stone panel, the words
  // on its wall and the Unown Report, on the overlay canvas.
  async function alphOverlay(screen) {
    const c = overlayCanvas();
    c.classList.remove("hidden");
    try { return await screen(c); } finally { c.classList.add("hidden"); Screen.say(""); }
  }
  // HGSS's Apricorn Box (ui/apricorn-box.js): "view" from the Bag, "give" for Kurt.
  const apricornBox = (mode) => alphOverlay((c) => ApricornBox.open(c, { bag: player.bag, mode, frame: GameOptions.get().frame, sfx,
    itemName: (id) => Bag.name(id), confirm: async (q) => { const yes = await confirm(q); Screen.say(""); return yes; } }));
  // (Put together: the flag the script's to set, FLAG_SYS_ALPH_PUZZLE_*.)
  const alphPuzzle = (n) => alphOverlay(async (c) => ((await JohtoAlph.puzzle(c, n, { frame: GameOptions.get().frame, sfx,
    confirm: async (q) => { const yes = await confirm(q); Screen.say(""); return yes; } })) ? JohtoAlph.PUZZLE_FLAGS[n] : null));
  const alphSolved = () => JohtoAlph.PUZZLE_FLAGS.map((f) => johto.flag(f));
  // A wall in front of you that an Escape Rope, Flash or a Water Stone opens
  // (src/alph_checks.c): its script, once the menus close; true if it's that wall.
  function alphReaction(what, before) {
    const js = JohtoAlph.chamberReaction(player.location.map, Overworld.position(), what);
    if (!js) return false;
    fieldAction = async () => { Screen.say(""); if (before) await before(); await runJohto(js); };
    return true;
  }
  // An Apricorn tree: an Apricorn of its colour, once a day (the game's clock's).
  async function apricornTree(tree, colour) {
    const s = johto.state(), today = Player.gameTime().today;
    const picked = s.apricorns || (s.apricorns = {});
    if (picked[tree] === today) { await say(["There's nothing on this Apricorn\ntree right now.", "It should bear fruit again tomorrow."]); return; }
    const item = colour + "-apricorn";
    await say("It's an Apricorn tree, bearing\n" + article(Bag.name(item)) + "!");
    picked[tree] = today;
    Player.addItem(player, item);
    await sayWithJingle("mus_obtain_item", "{PLAYER} found " + article(Bag.name(item)) + "!");
    await persist();
  }

  // ---------- Tera Raid dens (game/raid-dens.js) ----------
  //
  // A den sleeps until you use a Lure on it; then it glows with a raid of 1
  // to 5 stars until you win it. The raid: a wild battle with one Pokémon you
  // choose (no catching mid-way) against its Pokémon, Terastallized into the den's type with more HP,
  // won within its turns (RaidDens.TURNS) or you're blown out of the den;
  // losing, you're thrown out of the den (your Pokémon are fine) and it keeps
  // glowing. Won: the battle goes on, to catch it in any Ball if you like (it
  // can't miss); then the rewards (money, Exp. Candies, vitamins, Berries and
  // Tera Shards) on their own screen (ui/raid-rewards.js).
  // Inviting Gym Leaders you've beaten to a raid, up to three: A on a name
  // invites them, B takes back the last one invited (B with nobody invited
  // leaves with nobody), "Done" when you're ready (the rest are the region's
  // trainers).
  // (Each brings a Pokémon from their highest-levelled team as this game battles them: RaidDens.setTeams.)
  {
    const team = (id) => (window.WORLD_TRAINERS[id] ? swappedTeam(id) : []);
    const listed = (list) => list.map(([sp, lv]) => ({ species: sp, level: lv }));
    const johto = (name) => (window.JOHTO_LEAGUE || []).flatMap((J) => [J.trainer, J.rematch])
      .filter((id) => id && window.WORLD_TRAINERS[id] && window.WORLD_TRAINERS[id].name === name).map(team);
    const teams = {};
    for (const L of RaidDens.LEADERS) {
      const re = Object.values(KANTO_REMATCH).find((k) => k.id === L.id);
      teams[L.name] = () => [team(L.id)].concat(re ? [re.team()] : []);
    }
    for (const o of RaidDens.OTHERS) if (o.ids && /^(Lorelei|Bruno|Agatha|Lance)$/.test(o.name))
      teams[o.name] = () => o.ids.filter((id) => /^TRAINER_/.test(id)).map(team).concat(johto(o.name), o.name === "Lance" ? ["HGSS_TRAINER_CHAMPION_LANCE", "HGSS_TRAINER_CHAMPION_LANCE_2"].map(team) : []);
    const mega = (key) => listed(MEGA_RIVALS.find((r) => r.key === key).team());
    teams.Blue = () => [listed(VICTORY_ROAD_RIVAL_TEAM), mega("gary")];
    teams.Red = () => [championTeam(false), championTeam(true), team("HGSS_TRAINER_PKMN_TRAINER_RED_RED"), mega("red")];
    teams.Leaf = () => [route22LeafTeam(), mega("leaf")];
    RaidDens.setTeams(teams, { Blue: () => player.rival });
  }
  async function inviteLeaders() {
    const who = RaidDens.leaders(player.flags), can = who.map((L) => L.name), shown = who.map((L) => L.label);
    if (!can.length || !(await confirm("Invite others to the raid?"))) return [];
    const picked = [];
    let cursor = 0;
    for (;;) {
      // ("+" before those coming; the ▶ stays where it was.)
      // (A list that scrolls, six rows, so it stays clear of the text box.)
      const v = await multichoice("Invite whom? (" + picked.length + "/3)", 0, 0,
        can.map((n, i) => (picked.includes(n) ? "+" : " ") + shown[i]).concat([" Done"]), { cursor, shown: 6 });
      Screen.say("");
      if (v < 0) {
        if (!picked.length) return [];
        cursor = can.indexOf(picked.pop());   // (the ▶ goes back to them)
        continue;
      }
      if (v >= can.length) return picked;
      cursor = v;
      const n = can[v];
      if (picked.includes(n) || picked.length >= 3) { sfx("se_failure"); continue; }
      picked.push(n);
      if (picked.length === 3) cursor = can.length;   // (full: the ▶ moves to "Done")
    }
  }
  const LURES = ["lure", "super-lure", "max-lure"];
  const RAID_MUSIC = [null, "mus_vs_wild", "mus_vs_wild", "mus_vs_trainer", "mus_vs_legend", "mus_vs_legend"];
  async function raidDen(den) {
    const f = player.flags;
    let raid = RaidDens.active(f, den.id);
    if (!raid) {
      await say(["It's " + article(den.type) + "-type Tera Raid den.", "It's quiet… Something seems to be\nsleeping deep inside it."]);
      const have = LURES.filter((id) => Player.itemCount(player, id) > 0);
      if (!have.length) { await say("Maybe a Lure would wake it…"); return; }
      let lure = have[0];
      if (have.length > 1) {
        const v = await multichoice("Use a Lure on the den?", 0, 0, have.map((id) => Bag.name(id)).concat(["Cancel"]));
        Screen.say("");
        if (v < 0 || v >= have.length) return;
        lure = have[v];
      } else if (!(await confirm("Use " + article(Bag.name(lure)) + " on the den?"))) return;
      Player.removeItem(player, lure);
      raid = RaidDens.start(f, den, lure, player.badges.length);
      await say(player.name + " used the " + Bag.name(lure) + "!");
      Screen.say("");
      sfx("se_m_cosmic_power");
      Overworld.refreshPeople();
      await sleep(600);
      await persist();
      await say("The den began to glow!");
    }
    const name = Party.speciesName(raid.species);
    await say(["It's a " + raid.stars + "-star Tera Raid!", "A Tera " + den.type + "-type " + name + " (Lv. " + raid.level + ")\nis waiting in the den!"]);
    if (!canBattle()) return;
    if (!(await confirm("Will you take on the Tera Raid?"))) { await say("The den keeps glowing…"); return; }
    // (One Pokémon only, as in Scarlet and Violet: you choose which.)
    let pick;
    for (;;) {
      pick = await choosePartyFor("Send which POKéMON?");
      show("world");
      if (!pick) { await say("The den keeps glowing…"); return; }
      if (Party.canFight(pick)) break;
      await say(pick.egg ? "An Egg can't battle!" : Party.displayName(pick) + " is in no condition\nto battle!");
    }
    const chosen = [player.party.indexOf(pick)];
    // The other three: the Gym Leaders you invite, then the region's trainers (RaidDens.allies).
    const allies = RaidDens.allies(den, raid, await inviteLeaders());
    await say(RaidDens.joinedText(allies.map((a) => a.trainer)));
    const boss = RaidDens.boss(den, raid);
    const ro = { foe: { name: "Wild", team: [boss], tera: true }, raid: raid.stars, noCatch: true, noBlackout: true,
      music: RAID_MUSIC[raid.stars], chosen, raidAllies: allies.map((a) => ({ set: Party.toBattleSet(a.record), trainer: a.trainer })) };
    const outcome = await battle("wild", ro);
    if (outcome !== "won") {
      show("world");
      await Overworld.resume();
      if (outcome === "lost") await say(["You were blown out of the den…", "Your Pokémon were restored."]);
      // (Out of turns: blown out too, the den still glowing.)
      else if (outcome === "timeout") {
        player.party.forEach(Party.heal);
        await say(["The den is still glowing…", "Your Pokémon were restored."]);
      }
      return;
    }
    RaidDens.finish(f, den.id);
    // Caught in the battle (it keeps the den's Tera Type).
    if (ro.raidBall) {
      Player.removeItem(player, ro.raidBall);
      delete boss.teraAce;
      Object.assign(boss, { ball: ro.raidBall, status: "" });
      Party.heal(boss);
      await addCaught(boss);
    }
    // The rewards, and FireRed's style of screen for them.
    const r = RaidDens.rewards(raid.stars, Math.random, den.type);
    Player.addMoney(player, r.money);
    for (const [id, n] of r.items) Player.addItem(player, id, n);
    await persist();
    Screen.say("");
    show("world");
    await RaidRewardsScreen.show({ stars: raid.stars, type: den.type, name, level: raid.level, money: r.money, items: r.items,
      caught: !!ro.raidBall, frame: GameOptions.get().frame });
    Overworld.refreshPeople();
    await Overworld.resume();
    music((window.WORLD_MAPS[player.location.map] || {}).music);
  }

  // ---------- Repels and Lures ----------
  //
  // For 100 / 200 / 250 steps, wild Pokémon weaker than the lead Pokémon (the
  // first that can battle) stay away (Gen 3: below its level). A Lure (Let's
  // Go, Pikachu! and Eevee!'s, this game's way: as long as a Repel of its
  // kind, and sold beside it) does the opposite: wild Pokémon turn up twice
  // as often. One or the other at a time.

  const REPEL_STEPS = { "repel": 100, "super-repel": 200, "max-repel": 250 };
  const LURE_STEPS = { "lure": 100, "super-lure": 200, "max-lure": 250 };
  function repelStep() {
    if (player.lureSteps > 0) {
      player.lureSteps--;
      return player.lureSteps === 0 ? { type: "lure-ended" } : null;
    }
    if (!(player.repelSteps > 0)) return null;
    player.repelSteps--;
    return player.repelSteps === 0 ? { type: "repel-ended" } : null;
  }
  function repelAllows(wild) {
    if (!(player.repelSteps > 0)) return true;
    const lead = player.party.find(Party.canFight);
    return !lead || wild.level >= lead.level;
  }
  // A Repel or a Lure, from the Bag.
  async function useRepel(item) {
    const lure = item in LURE_STEPS;
    if (player.repelSteps > 0 || player.lureSteps > 0) {
      await message("But the effects of a " + (player.lureSteps > 0 ? "Lure" : "Repel") + " lingered from earlier.");
      return;
    }
    Player.removeItem(player, item);
    if (lure) { player.lureSteps = LURE_STEPS[item]; player.flags.lastLure = item; }
    else { player.repelSteps = REPEL_STEPS[item]; player.flags.lastRepel = item; }
    await message(player.name + " used the " + Bag.name(item) + ".");
  }
  // When a Repel (or a Lure) wears off you're offered another of the same
  // kind, if you have one (as in Black and White).
  async function repelWoreOff(lure) {
    const item = player.flags[lure ? "lastLure" : "lastRepel"], what = lure ? "Lure" : "Repel";
    if (!item || !Player.itemCount(player, item)) { await say(what + "'s effect wore off…"); return; }
    if (await confirm(what + "'s effect wore off… Would you like to use another " + Bag.name(item) + "? (" +
      Player.itemCount(player, item) + " left)")) await useRepel(item);
    await persist();
  }

  // ---------- Exploring ----------

  function special(script) {
    if (deltaDue(script)) return true;   // (the Delta Episode's scenes as you come in)
    // (Orre: up the road from the Air Strip to the Outskirt Stand the first time, Folly and Trudly come out.)
    if ((script === "arrive:OutskirtStand" || script === "enter:OutskirtStand") && !(player.flags.orre | 0)) return true;
    if (script === "Orre_WorldMap") return true;   // (Orre: out of a place, its map: orreTravel())
    // Johto: its scripts (a step's, while its var has its value), its
    // Apricorn trees, and its maps' frame tables as you come in.
    // Hoenn: a step's scene while its var has its value, and its maps' frame tables as you come in.
    if (/^hoenn:/.test(script || "")) return hoenn.triggerDue(script);
    // (Anyone or any sign in Hoenn that has an Emerald script, unless this game has its own for it.)
    if (isHoenn(player.location.map) && hoenn.hasScript(script) && !SPECIAL.has(script) && !TRAINER_SCRIPTS.has(script) && !ITEM_BALLS.has(script)) return true;
    if (/^(enter|arrive):/.test(script || "") && isHoenn(script.replace(/^\w+:/, ""))) return !!hoenn.frameScript(script.replace(/^\w+:/, ""), /^enter:/.test(script));
    if (/^hgss:/.test(script || "")) return johto.triggerDue(script);
    if (/^hgss_apricorn:/.test(script || "")) return true;
    if (/^Johto_AzaleaRide:\d+$/.test(script || "")) return true;   // (Azalea's Gym's Ariados: azaleaRide())
    if (/^Johto_GoldenrodPanel:\d$/.test(script || "")) return true;   // (Goldenrod Underground's switches: goldenrodPanel())
    if (script === "Johto_MagnetTrain") return true;   // (the Magnet Train's doors: magnetTrainBoard())
    if (script === "Johto_SSAquaBoard") return true;   // (Olivine's port: ssAquaBoard())
    if (/^(BerryFarm_(Caretaker|Tree_\d+)|HoennBerry_Tree_\d+)$/.test(script || "")) return true;   // (Celadon's Berry Farm: ui/berry-farm.js)
    if (/_PokemonCenter_1F_EventScript_Nurse$/.test(script || "") && johto.zoneOf(player.location.map)) return true;
    if (/^(enter|arrive):/.test(script || "") && johto.frameScript(script.replace(/^\w+:/, ""))) return true;
    // Coming back into Pewter City: the Museum ticket was for one visit (FireRed's OnTransition).
    // Coming out of the Gym with the Boulder Badge, Leaf is waiting.
    // Prof. Oak's aide, then his test at the top of Pokémon Tower (this game's own).
    if (script === "enter:Route23" && victoryRoadRivalDue()) return true;
    if (/^enter:/.test(script) && megaAideDue(script.slice(6))) return true;
    if ((script === "enter:PokemonTower_7F" || script === "Game_EventScript_MegaTower") && megaTowerDue()) return true;
    if (script === "enter:PewterCity") player.flags.museumTicket = false;
    if (teraAideDue(script)) return true;
    if (script === "enter:PewterCity") return leafPewterDue();
    // Into Faraway Island's grass (FarawayIsland_Interior_OnTransition): the
    // step count starts again, and Mew, if it's there, is spotted and hides.
    if (script === "enter:FarawayIsland_Interior") { player.flags.farawaySteps = 0; return !player.flags.foughtMew; }
    // Orre: in the diner after the truck's gone, Willie follows you out.
    if (script === "enter:OutskirtStand_Diner") { if ((player.flags.orre | 0) === 2) player.flags.orreInside = true; return false; }
    if (script === "enter:OutskirtStand") return (player.flags.orre | 0) === 2 && !!player.flags.orreInside;
    // Walking into the Route 4 Pokémon Center makes it where you go after
    // blacking out (FireRed's setrespawn there).
    if (script === "enter:Route4_PokemonCenter_1F") { player.flags.lastCenter = "Route4_PokemonCenter_1F"; return false; }
    // (FireRed's FLAG_TEMP_2 and 3: Bill in the Teleporter, back after the ticket.)
    if (script === "enter:SSAnne_Exterior") return ssAnneDeparting();
    if (script === "enter:Route25_SeaCottage") { billInTeleporter = billJustOut = false; seaCottageReturn = !!player.flags.gotSSTicket; return false; }
    // Pokémon Tower: Gary on 2F until you've battled him, the ghost on 6F
    // until it's at rest, and 5F's purified zone each time you step in.
    if (/^PokemonTower_2F_EventScript_RivalTrigger/.test(script)) return !player.flags.towerRival;
    if (script === "PokemonTower_6F_EventScript_MarowakGhost") return !player.flags.marowakCalmed;
    if (script === "PokemonTower_5F_EventScript_PurifiedZone") return !inPurifiedZone;
    if (script === "PokemonTower_5F_EventScript_ExitPurifiedZone") { inPurifiedZone = false; return false; }
    // The Karate Master turns to you until he's beaten; Gary waits on Silph's
    // 7F, and Giovanni on 11F, until you've battled them.
    if (/^SaffronCity_Dojo_EventScript_TriggerMasterBattle/.test(script)) return !player.flags.TRAINER_BLACK_BELT_KOICHI || !!dojoRematch(DOJO_MASTER);
    if (/^SilphCo_7F_EventScript_RivalTrigger/.test(script)) return !player.flags.silphRival;
    if (/^SilphCo_11F_EventScript_GiovanniTrigger/.test(script)) return !silphFreed();
    // Back in the Safari Zone's gate during the Safari Game: leaving early?
    if (script === "enter:" + SAFARI_GATE) return safariOn();
    // Cycling Road (FireRed's VAR_MAP_SCENE_ROUTE16): which side of a gate's
    // guard you're on; coming out onto Route 16 or 18 on the Cycling Road
    // side, you're put on your Bicycle (ForcePlayerOntoBike).
    if (script === "EventScript_SetEnteringCyclingRoad") { player.flags.cyclingRoad = true; return false; }
    if (script === "EventScript_SetExitingCyclingRoad") { delete player.flags.cyclingRoad; return false; }
    if (script === "enter:Route16" || script === "enter:Route18") {
      if (player.flags.cyclingRoad && Overworld.avatar() === "walk") Overworld.setAvatar("bike");
      return false;
    }
    // The Seafoam Islands: fallen onto B3F's or B4F's water (FallWarpEffect_7).
    if (script === "enter:SeafoamIslands_B3F" || script === "enter:SeafoamIslands_B4F") {
      const at = player.location;
      return seafoamFell === at.map && World.isSurfable(World.blockAt(at.map, at.x, at.y).behavior);
    }
    // Viridian Gym's door, locked until you've the other Badges.
    if (script === "ViridianCity_EventScript_GymDoorLocked") return !viridianGymOpen();
    // Route 22: Gary, once Giovanni's beaten; the gate's and Route 23's
    // guards stop you at the next one whose Badge you haven't shown.
    if (/^Route22_EventScript_EarlyRivalTrigger/.test(script)) return !!(player.flags.pokedex && !player.flags.route22Rival);
    if (/^Route22_EventScript_LateRivalTrigger/.test(script)) return route22LateRivalDue();
    if (script === "Route22_NorthEntrance_EventScript_BoulderBadgeGuardTrigger") return LeagueRoad.guardStops(player.flags, 1);
    { const g = /^Route23_EventScript_(\w+)BadgeGuardTrigger$/.exec(script); if (g) return LeagueRoad.guardStops(player.flags, ROUTE23_BADGES.indexOf(g[1]) + 1); }
    // The Pokémon League's rooms: their entry scenes, while it's their turn;
    // the Hall of Fame's, always.
    if (/^enter:PokemonLeague_/.test(script)) { const m = script.slice(6); return m === League.HALL_OF_FAME || League.entryDue(player.flags, m); }
    // Walking into the Indigo Plateau's Pokémon Center makes it where you go
    // after blacking out (FireRed's setrespawn there).
    if (script === "enter:IndigoPlateau_PokemonCenter_1F") { player.flags.lastCenter = "IndigoPlateau_PokemonCenter_1F"; return false; }
    // Cinnabar Gym's door, locked until you've the Secret Key.
    if (script === "CinnabarIsland_EventScript_GymDoorLocked") return !player.flags.FLAG_HIDE_POKEMON_MANSION_B1F_SECRET_KEY;
    // Back in the Pokémon Lab (or Pewter's Museum), a fossil you left with the doctor is ready.
    // (Or Sinnoh's: Oreburgh's, the Essentials project's.)
    const fossilHere = /^enter:/.test(script || "") && isSinnoh(script.slice(6)) && (window.WORLD_MAPS[script.slice(6)].people || []).some((p) => /_EventScript_FossilScientist$/.test(p.script || ""));
    if (script === "enter:CinnabarIsland_PokemonLab_Entrance" || script === "enter:PewterCity_Museum_1F" || fossilHere) {
      if (player.flags.fossilRevive) player.flags.fossilRevive.ready = true;
      return false;
    }
    // The Sevii Islands: Bill waiting outside Blaine's Gym (on arriving
    // however you come, or walking about); the Pokémon Centers where you'll
    // be after blacking out (FireRed's setrespawn on entering them); the
    // Joyful Game Corner's scene; Bill ready to leave One Island; the Ember
    // Spa's spring, once a visit; the bikers; the Rockets' password.
    if (script === "enter:CinnabarIsland" || script === "arrive:CinnabarIsland") return player.flags.cinnabarScene === 1;
    if (/^enter:(One|Two|Three|Four|Five|Six|Seven)Island_PokemonCenter_1F$/.test(script)) {
      player.flags.lastCenter = script.slice(6);
      // (Gary's there the first time you come to Six Island's: SixIsland_PokemonCenter_1F_OnFrame.)
      if (script === "enter:SixIsland_PokemonCenter_1F") return !player.flags.sixCenterScene;
      // (Celio's not been met: OneIsland_PokemonCenter_1F_OnFrame.)
      return script === "enter:OneIsland_PokemonCenter_1F" && !player.flags.celioScene && (player.flags.oneHarborScene || 0) >= 2;
    }
    // Trainer Tower: its counter while no challenge is on; back in the lobby
    // having lost (TrainerTower_Lobby_EventScript_Enter); a floor's battle
    // while it's the next to clear, and its trainers haven't come for you yet.
    if (script === "TrainerTower_Lobby_EventScript_EntryTrigger") return !player.flags.towerScene;
    if (script === BT_ENTRY) return !player.flags.battleTowerScene;
    if (script === "enter:TrainerTower_Lobby") return !!(player.flags.tower && player.flags.tower.lost);
    if (/^TrainerTower_EventScript_(Single|Double)BattleTrigger/.test(script)) {
      const map = player.location.map, n = towerFloorNo(map);
      if (!n || !player.flags.tower || TrainerTower.floorCleared(player.flags, n)) return false;
      const type = towerFloor(n).type, double = /Double/.test(script);
      if (double ? type !== "double" : type === "double") return false;
      return !tempFlags.has(map + (double ? ":doubles" : ":singles"));
    }
    if (script === "enter:TwoIsland_JoyfulGameCorner") return !player.flags.gameCornerScene;
    if (script === "enter:OneIsland") return player.flags.oneHarborScene === 2;
    if (/^OneIsland_PokemonCenter_1F_EventScript_LeaveOneIslandTrigger/.test(script)) return player.flags.celioScene === 2;
    if (script === "OneIsland_KindleRoad_EmberSpa_EventScript_SpaHeal") return !tempFlags.has("OneIsland_KindleRoad_EmberSpa:spa");
    if (script === "ThreeIsland_EventScript_BikerBossIntroTrigger") return player.flags.threeIslandScene === 2;
    if (/^ThreeIsland_EventScript_BattleBikersTrigger/.test(script)) return player.flags.threeIslandScene === 3;
    if (script === "MtEmber_Exterior_EventScript_RocketPasswordScene") return player.flags.mtEmberScene === 1;
    // Four Island: Gary the first time you come; Lorelei and the poachers in
    // Icefall Cave. Five Island: the Warehouse Admin turning round; Selphy
    // lost in the Lost Cave (until she's beaten: ..._Room10_OnResume), and
    // brought home to Resort Gorgeous.
    if (script === "enter:FourIsland") return !player.flags.fourIslandScene;
    if (script === "FourIsland_IcefallCave_Back_EventScript_LoreleiRocketsScene") return !player.flags.icefallScene;
    if (script === "FiveIsland_RocketWarehouse_EventScript_Admin2Trigger") return !player.flags.warehouseScene;
    if (script === "enter:FiveIsland_LostCave_Room10") return !player.flags.lostCaveScene && !player.flags.TRAINER_LADY_SELPHY;
    if (script === "enter:FiveIsland_ResortGorgeous") return player.flags.resortScene === 1;
    // The guards stop you only until you have a Bicycle (VAR_TEMP_1).
    if (/_EventScript_NeedBikeTrigger/.test(script)) return !Player.itemCount(player, "bicycle");
    // The Saffron gates' guards, until they've had the Tea.
    if (/^Route[5-8]_\w+Entrance_EventScript_GuardTrigger/.test(script)) return !player.flags.gatesOpen;
    return SPECIAL.has(script) || ITEM_BALLS.has(script) || TRAINER_SCRIPTS.has(script);
  }

  async function explore() {
    World.setDynamicWarp(player.flags.dynamicWarp);
    for (;;) {
      // (Kamurocho, side on: its streets, ui/street.js, while you're there.)
      if (Street.isStreet(player.location.map)) { await exploreStreet(); continue; }
      show("world");
      // (Continuing a save, the area's name shows: FieldCB_ShowMapNameOnContinue.)
      if (continued) {
        continued = false;
        if ((window.WORLD_MAPS[player.location.map] || {}).showName) Overworld.showAreaName(player.location.map);
      }
      const ev = await Overworld.explore({
        player, rivalName: player.rival, visible,
        special,
        onWarp,
        // (A double battle's trainers don't see you without two Pokémon that
        // can fight: FireRed's CheckTrainer.)
        trainerWaiting: (person) => trainerWaiting(person) && !(person.trainer.double && !canDouble()),
        hiddenItem: (h) => !player.flags[h.flag], patches: mapPatches, metatiles: hoennOverlay, decor: (map) => hoennDecor.overlay(map).tiles, extraPeople,
        // (HGSS's: the Pokémon walking behind you, and Johto's Headbutt trees.)
        follower: (map) => follower.look(map), headbuttTree: (map, x, y) => johtoField.headbuttTree(map, x, y),
        diveHere: (avatar) => diveHere(avatar),
        canSurf: () => !!FieldMoves.user(player, "Surf"), strength: () => strengthOn,
        // (Johto's Gyms: Ecruteak's darkness, Violet's lift.)
        darkness: (map) => (map === PYRAMID_FLOOR ? hoennFrontier.pyramidDark() : gymmicks.darkness(map)), drawMap: (g, map, x, y) => { gymmicks.drawMap(g, map, x, y); johtoSafari.drawMap(g, map, x, y); },
        faced: (map, x, y, surfing) => johtoSafari.faced(map, x, y, surfing),
        boulderFell: (def) => {
          // (3F's boulder through the hole: it's on 2F now.)
          if (def.flag === "FLAG_HIDE_VICTORY_ROAD_3F_BOULDER") LeagueRoad.dropBoulder(player.flags);
          else Seafoam.drop(player.flags, def);
        },
        boulderSwitch: (map, x, y) => tanobySwitch(map, x, y) || victoryRoadSwitch(map, x, y),
        // (The Tanoby Ruins' chambers are dark until the Tanoby Key's solved: EventScript_TryDarkenRuins.)
        weather: (map) => (isHoenn(map) ? hoennWeatherNow() : Sevii.tanobyLocked(player.flags, map) ? "shade" : null),
        // (Off the water: on foot, or back on the Bicycle on Cycling Road, where you can't walk.)
        landAvatar: () => (onCyclingRoad() ? "bike" : "walk"),
        onAvatar: (mode) => music(avatarMusic(mode) || (window.WORLD_MAPS[player.location.map] || {}).music),
        onStep: () => {
          Player.advanceClock(player);   // (the game's clock: Player.gameTime)
          leftPallet(player.location.map); DayCare.step(player.flags.dayCare); DayCare.step(player.flags.dayCare2); DayCare.step(player.flags.johtoDayCare); vsSeekerStep(); friendshipStep();
          Sevii.resortStep(player.flags.resortRequest);   // (Selphy waiting to see a Pokémon)
          farawayStep();
          johtoSafari.tick();   // (the Safari Zone's days, Baoba's calls)
          hoennWeatherStep(); hoennAshStep(); berryFarm.step(); hoennBerries.step(); sinnohBerries.step();     // (the berry trees growing: Celadon's Berry Farm's, Hoenn's)
          return orreCallStep() || viridianStopStep() || hoennRegiceStep() || hoennCrackedStep() || hoennCruiseStep() || icefallStep() || redForestStep() || leafVermilionStep() || jessieJamesStep() || laterJessieJamesStep() || safariStep() || bugContest.step() || cinnabarBillStep() || eggStep() || repelStep() || gear.step() || realmEncounterStep() || saveReminderStep();
        }, encounterScale: () => gear.encounterRate() * Encounters.leadRateScale(leadMon()),
        adjustWild: (mon, table) => { const m = roamerWild(Encounters.leadWild(mon, leadMon(), table), table); return !m ? m : player.location.map === "BattleFrontier_BattlePikeRoomWildMons" ? hoennFrontier.pikeWild(m) : player.location.map === PYRAMID_FLOOR ? hoennFrontier.pyramidWild(m) : m; }, allowWild: (mon) => !Sevii.tanobyLocked(player.flags, player.location.map) &&
          !JohtoAlph.locked(player.location.map, alphSolved()) && repelAllows(mon),
        onMap: (m) => {
          Player.enterRealm(player, (window.WORLD_MAPS[m] || {}).realm);   // (each realm's own bag)
          if (m !== tempFlagsMap && m === "VermilionCity_Gym") hideVermilionSwitches();
          if (m !== "VermilionCity") ticketChecked = false;
          if (m !== tempFlagsMap) delete player.flags.vsRematch;   // (rematches last while you stay on the map)
          if (m !== tempFlagsMap) strengthOn = false;
          // (Flying, blacking out or teleporting out of the Safari Zone ends the
          // Safari Game: Overworld_ResetStateAfterFly and the like.)
          if (player.flags.safari && !player.flags.safari.hoenn && !/^SafariZone_/.test(m) && m !== SAFARI_GATE) delete player.flags.safari;
          if (player.flags.safari && player.flags.safari.hoenn && !/^HoennSafariZone_/.test(m) && m !== "Route121_SafariZoneEntrance") delete player.flags.safari;
          bugContest.onMap(m);   // (and away from the National Park, the Bug-Catching Contest)
          // (And off Cycling Road: VAR_MAP_SCENE_ROUTE16 back to 0.)
          if (player.flags.cyclingRoad && !CYCLING_ROAD_MAPS.includes(m)) delete player.flags.cyclingRoad;
          // The Seafoam Islands' boulders and currents (Route20_OnTransition,
          // SeafoamIslands_B3F/B4F_OnTransition).
          if (m !== tempFlagsMap) { if (m === "Route20") Seafoam.route20(player.flags); Seafoam.transition(player.flags, m); }
          // The Sevii Islands' ON_TRANSITION scripts (game/sevii.js has the flags).
          if (m !== tempFlagsMap) { seviiTransition(m); capeBrinkJustTaught = false; moveManiacMet = false; icefallIce = {}; }
          // Route 23 puts Victory Road back as it was: barriers up, boulders back (Route23_OnTransition).
          if (m !== tempFlagsMap && m === "Route23") LeagueRoad.reset(player.flags);
          // (Into a Johto map: its OnTransition script, before its people are placed.)
          if (m !== tempFlagsMap && m === GOLDENROD_SWITCHES) goldenrodSwitchesEnter();
          if (m !== tempFlagsMap) { hoennCameFrom = hoennLastType; magnetTrain.enter(m); johto.transition(m); gymmicks.enter(m); johtoSafari.arrive(m); if (isHoenn(m)) { restoreMetatiles(m); hoennWeatherEnter(m); hoennDecorApply(m); hoennSpotOpen(m); hoennEntering = m; hoenn.transition(m).then(() => { if (hoennEntering === m) hoennEntering = null; }); } hoennLastType = (window.WORLD_MAPS[m] || {}).type; }
          if (m === "SSAqua_1F") ssAquaExit();
          forgetTrainerSpots(m); clearTempFlags(m); applyPatches(m); visitSection(m);
          if (!gear.radioOn(m)) music(avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[m] || {}).music); }   // (the Pokégear's radio plays on)
      });
      if (ev.type === "menu") {
        await startMenu();
        if (fieldAction) { const act = fieldAction; fieldAction = null; await act(); }
      }
      else if (ev.type === "select") await useRegistered();
      else if (ev.type === "water") await surfPrompt();
      else if (ev.type === "dive") await dive();
      else if (ev.type === "waterfall") await waterfall();
      else if (ev.type === "whirlpool") await whirlpool();
      else if (ev.type === "rockclimb") await rockClimb();
      else if (ev.type === "follower") await follower.talk();
      else if (ev.type === "headbutt") await johtoField.headbutt(ev.map, ev.x, ev.y);
      else if (ev.type === "safari-object") await johtoSafari.fieldObject(ev.x, ev.y);
      else if (ev.type === "repel-ended" || ev.type === "lure-ended") await repelWoreOff(ev.type === "lure-ended");
      else if (ev.type === "egg-hatch") await eggHatches(ev.record);
      else if (ev.type === "phone") await gear.ring();
      else if (ev.type === "orre-call") await orreOakCall();
      else if (ev.type === "viridian-stop") await viridianOldManStop();
      else if (ev.type === "red-forest") await redForest();
      else if (ev.type === "leaf-vermilion") await leafVermilion();
      else if (ev.type === "save-prompt") await savePrompt();
      else if (ev.type === "realm-battle") await realmEncounter();
      else if (ev.type === "jessie-james") await jessieJames();
      else if (ev.type === "jessie-james-later") await laterJessieJames();
      else if (ev.type === "safari-over") { if (ev.hoenn) await runHoenn("SafariZone_EventScript_TimesUp"); else await safariOver(ev.text, false); }
      else if (ev.type === "johto-script") await runJohto(ev.js, null);
      else if (ev.type === "hoenn-script") await runHoenn(ev.label);
      else if (ev.type === "hoenn-fall") await hoennFall(ev.map);
      else if (ev.type === "wild") {
        if (!canBattle() && !safariOn()) continue;
        // Grass on routes; caves (and other maps) use their own scene.
        const here = window.WORLD_MAPS[player.location.map];
        // (On the water: FireRed's pond or sea.)
        const at = player.location, b = World.blockAt(at.map, at.x, at.y).behavior;
        const terrain = Overworld.avatar() === "surf" ? (b === 0x10 ? "pond" : "water")
          : here && ["route", "town", "city"].includes(here.type) ? "grass" : undefined;
        if (safariOn()) await safariBattle(ev.species, ev.level, terrain, player.flags.safari.hoenn ? hoennSafari.nature() : null);
        // (The Bug-Catching Contest's own wild Pokémon, in its park.)
        else if (bugContest.here(at.map)) await bugContest.battle(terrain);
        // (The Tanoby Ruins' Unown: each slot's letter, sUnownLetterSlots; the
        // Ruins of Alph's, a letter its solved puzzles have woken.)
        // (The Battle Pike's hall of wild Pokémon: your challenge's three fight it, and the room's own scripts see how it went.)
        else if (at.map === "BattleFrontier_BattlePikeRoomWildMons" || at.map === PYRAMID_FLOOR) await pikeWildBattle(ev);
        else await battle("wild", { foe: { name: "Wild", team: [wildMon(Party.create(ev.species, ev.level,
          { unown: Sevii.unownLetter(at.map, ev.slot) || JohtoAlph.unownLetter(at.map, alphSolved()) }))] },
          terrain, ghost: towerGhost() });
      } else {
        await story(ev);
        // (A voyage a script set off, once it's done: the S.S. Tidal to Sinnoh, from Lilycove's harbor.)
        if (afterScript) { const act = afterScript; afterScript = null; await act(); }
      }
      await persist();
    }
  }

  // A turn of Kamurocho's streets: what happened there, as the overworld's (the menu, someone to talk to, a fight).
  async function exploreStreet() {
    Player.enterRealm(player, "yakuza");
    music((window.WORLD_MAPS.Kamurocho || {}).music);
    const ev = await Street.explore({ player, look: () => Overworld.playerLook(), special, visible: (p) => visible(p, "Kamurocho"), level: realmBestLevel,
      onStep: (fights) => { Player.advanceClock(player); return fights ? realmStreetStep() : saveReminderStep(); } });
    if (ev.type === "menu") {
      await startMenu();
      if (fieldAction) { const act = fieldAction; fieldAction = null; await act(); }
    } else if (ev.type === "say") await say(ev.pages);
    else if (ev.type === "talk") await story({ type: "talk", person: ev.person, map: "Kamurocho" });
    else if (ev.type === "spot") await story({ type: "talk", person: { script: ev.script }, map: "Kamurocho" });
    // (A gang that walked up to you: that gang, its leader's line first.)
    else if (ev.type === "realm-battle") { if (ev.foes) await realmFight(ev.foes, ev.bark ? { intro: ev.bark } : {}); else await realmEncounter(); }
    else if (ev.type === "save-prompt") await savePrompt();
    if (afterScript) { const act = afterScript; afterScript = null; await act(); }
    await persist();
  }

  async function main() {
    // FireRed's opening movie and title screen; left alone, the title goes back to the movie.
    // B on the main menu goes back to the title screen.
    show("intro");
    play: for (;;) {
      await Intro.movie();
      for (;;) {
        if ((await Intro.titleScreen()) !== "start") continue play;
        Intro.stop();
        if ((await title()) !== "back") break play;
        show("intro");
      }
    }
    // (A game saved before there were races or looks: choose yours now.)
    if (!player.race || !player.appearance) {
      show("intro");
      const r = await Intro.chooseRace(player.name, { race: player.race });
      player.race = r.race; player.appearance = r.appearance;
      await persist();
    }
    await applyLook();
    lastTick = Date.now();
    await explore();
  }


  window.Game = { get player() { return player; }, get pokegear() { return gear; }, get hoenn() { return hoenn; }, runHoenn: (label) => runHoenn(label),
    // (for the browser tests: a wild battle with this species, then back to the map)
    wildBattle: async (species, level) => { await battle("wild", { foe: { name: "Wild", team: [wildMon(Party.create(species, level))] } }); show("world"); await Overworld.resume(); }, townMap: (o) => townMap(o), sailToHoenn: () => sailToHoenn(), slateportSailor: () => slateportSailor(),
    // (and an Ultimax fight with these foes where you stand)
    realmFight: (foes) => realmFight(foes) };
  main();
})();
