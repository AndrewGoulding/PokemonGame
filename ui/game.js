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

  const partyLevel = () => Math.max(1, ...player.party.map((r) => r.level));
  const canBattle = () => player.party.some((r) => !Party.isFainted(r));
  // Two Pokémon that can fight, for a double battle (FireRed's GetMonsStateToDoubles).
  const canDouble = () => player.party.filter((r) => !Party.isFainted(r)).length >= 2;
  const money = (n) => "₽" + Math.floor(n).toLocaleString("en-US");
  const article = (word) => (/^[AEIOU]/i.test(word) ? "an " : "a ") + word;

  // ---------- Sound (ui/audio.js) ----------
  const GA = window.GameAudio;
  const music = (name) => { if (GA) GA.music(name); };
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
  const back = (label) => ({ label: label || "Back", value: "back", className: "action", wide: true });

  function playTime(ms) {
    const mins = Math.floor(ms / 60000);
    return Math.floor(mins / 60) + ":" + String(mins % 60).padStart(2, "0");
  }

  function show(which) {
    if (which !== "world") Overworld.hide();
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

  async function persist() {
    tick();
    const r = Save.write(player);
    if (!r.ok && saveProblem !== r.error) {
      saveProblem = r.error;
      await message(r.error + " Use “Download save file” on your trainer card to keep your progress.");
    }
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
          await persist();
          return "play";
        }
        continue;
      }
      if (p && !(await confirm("Start a new game? Your saved game in this browser will be overwritten."))) continue;
      await newGame();
      return "play";
    }
  }

  // FireRed's Option screen (GameOptions keeps the settings). From the main
  // menu it also has SAVE FILE: LOAD, to load a downloaded save; returns "load"
  // when that's picked.
  async function optionScreen(fromTitle) {
    const o = GameOptions.get();
    const rows = [
      { name: "TEXT SPEED", key: "textSpeed", values: ["SLOW", "MID", "FAST"], value: o.textSpeed },
      { name: "BATTLE SCENE", key: "battleScene", values: ["ON", "OFF"], value: o.battleScene },
      { name: "BATTLE STYLE", key: "battleStyle", values: ["SHIFT", "SET"], value: o.battleStyle },
      { name: "SOUND", key: "sound", values: ["MONO", "STEREO", "OFF"], value: o.sound },
      { name: "VOLUME", key: "volume", values: [...Array(11).keys()].map(String), value: o.volume },
      { name: "FRAME", key: "frame", frame: true, values: [...Array(10).keys()].map((i) => "TYPE" + (i + 1)), value: o.frame }
    ];
    if (fromTitle) rows.push({ name: "SAVE FILE", values: ["LOAD"], value: 0, action: "load" });
    rows.push({ name: "CANCEL" });
    const wasShowing = !$("#scene").classList.contains("hidden") ? "scene" : null;
    Screen.say("");
    clearMenu();
    show("intro");
    const r = await GbaMenus.optionMenu($("#intro"), rows, (i, value) => GameOptions.set({ [rows[i].key]: value }));
    if (wasShowing) show(wasShowing);
    return r;
  }

  // A new game starts with FireRed's intro: the controls guide, then Prof. Oak
  // asks whether you're a boy or a girl and names you and your rival.
  async function newGame() {
    show("intro");
    const r = await Intro.oakSpeech();
    player = Player.create(r.name, r.look);   // the rival is Gary (Player.RIVAL_NAME)
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

  // opts.safari: a Safari Zone battle (engine/safari.js), with the Safari
  // Balls you have left (player.flags.safari).
  // Double battles: opts.double (FireRed's trainerbattle_double: the whole
  // party, two at a time). A tag battle: opts.partner = { name, team (party
  // records), pic (their back picture) }: you choose three of yours first
  // (FireRed's party screen, ENTER / CONFIRM; or opts.chosen, party indexes),
  // and only those are changed by the battle. opts.foe2 = { name, team, pic,
  // defeatText, prizeClass }: a second opposing trainer beside the first.
  // Returns the outcome ("cancelled" when you back out of choosing).
  async function battle(kind, opts) {
    opts = opts || {};
    const wild = kind === "wild";
    const foe = opts.foe || (wild ? { name: "Wild", team: [Encounters.wild(partyLevel())] } : Encounters.trainer(partyLevel()));
    const foe2 = !wild && opts.foe2 || null;
    const double = !wild && !opts.safari && !!(opts.double || opts.partner || foe2);
    if (!wild) for (const r of foe.team.concat(foe2 ? foe2.team : [])) delete r.shiny;   // trainers' Pokémon are never shiny
    let chosen = null;
    if (opts.partner) {
      chosen = opts.chosen || await chooseBattleTeam(3);
      if (!chosen) return "cancelled";
    }
    const own = DoubleBattle.team(player.party, chosen);
    // The battle theme (wild, trainer, or Gym Leader), and the one for winning.
    const leader = !wild && /^Leader /.test(foe.name);
    music(opts.music || (wild ? "mus_vs_wild" : leader ? "mus_vs_gym_leader" : "mus_vs_trainer"));
    // From the map: FireRed's flash-and-slice into battle.
    if (!world.classList.contains("hidden")) await Overworld.battleTransition();
    show("field");
    const here = player.location && player.location.map;
    // A Gym Leader, the Elite Four or the Champion: the whole party is pleased
    // to be in a battle that matters (FireRed's FRIENDSHIP_EVENT_LEAGUE_BATTLE).
    if (!wild && /^TRAINER_(LEADER|ELITE_FOUR|CHAMPION)/.test(opts.trainerId || "")) {
      for (const r of player.party) Party.adjustFriendship(r, "leagueBattle", here);
    }
    const foeSets = (f) => f.team.map((r) => Object.assign(Party.toBattleSet(r), opts.ghost ? { name: "Ghost" } : {}));
    const result = await BattleScreen.run({
      p1: Object.assign({ name: player.name, team: own.map((r) => Party.toBattleSet(r, here)) },
        opts.partner ? { partner: { name: opts.partner.name, team: opts.partner.team.map((r) => Party.toBattleSet(r)) } } : {}),
      // (Pokémon Tower's unidentified Ghost goes by "Ghost".)
      p2: Object.assign({ name: foe.name, team: foeSets(foe) }, foe2 ? { partner: { name: foe2.name, team: foeSets(foe2) } } : {}),
      format: double ? "doubles" : undefined,
      partnerTrainer: opts.partner && opts.partner.pic,
      foeTrainer2: foe2 && foe2.pic, defeatText2: foe2 && foe2.defeatText && foe2.defeatText.map((p) => fill(p)),
      ghost: !!opts.ghost, noCatch: !!opts.noCatch,
      megaRing: Player.itemCount(player, "mega-ring") > 0,
      safari: opts.safari ? { balls: player.flags.safari.balls } : undefined,
      wild,
      exp: !opts.safari && !opts.noExp,
      expShare: expShareOn(),
      trainer: Player.LOOKS[player.look].back,
      foeTrainer: foe.pic, defeatText: opts.defeatText && opts.defeatText.map((p) => fill(p)),
      victoryMusic: opts.victoryMusic || (wild ? "mus_victory_wild" : leader ? "mus_victory_gym_leader" : "mus_victory_trainer"),
      terrain: battleTerrain(opts),
      bag: player.bag,
      // (The Bag screen: its pockets, and the bag's colours.)
      bagPockets, bagFemale: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl),
      catchContext: { night: Evolution.timeOfDay() === "night", caughtBefore: (s) => Player.hasCaught(player, s) },
      opponent: wild ? randomMove : (b) => OpponentAI.choose(b, "p2"),
      // A new move with four known: the Summary screen picks the one to forget
      // (the record caught up with the battle first: level, moves, PP).
      forgetMove: (i, mon, move) => chooseMoveToForget(Party.syncFromBattle(own[i], mon), move),
      // The Summary screen from the party screen in battle: each Pokémon as it
      // is now (HP, status, PP, Exp.), from copies, so nothing changes.
      // A Mega Evolved Pokémon shows its Mega form: the picture, the stats the
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
    for (const e of b.events) {
      if (opts.ghost) break;   // (an unidentified Ghost isn't seen)
      if ((e[0] === "switch" || e[0] === "drag") && String(e[1]).startsWith("p2")) Player.markSeen(player, String(e[2]).split(", L")[0]);
    }
    // (A tag battle: only the three you chose; your partner's are theirs.)
    const leveledUp = [];
    DoubleBattle.syncBack(player.party, chosen, b.sides.p1.pokemon, (record, mon) => {
      Party.syncFromBattle(record, mon);
      if (mon.leveledUp) leveledUp.push(record);
    });

    if (result.outcome === "won" && opts.trainerId) {
      player.flags[opts.trainerId] = true;
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
    }
    if (opts.safari && player.flags.safari) player.flags.safari.balls = b.safari.balls;
    if (result.outcome === "caught") await addCaught(Party.caught(foe.team[0], b.caught, ballUsed(b)));
    if (opts.safari) {
      // (No one fought: no blacking out, no evolving.)
    } else if ((result.outcome === "lost" || !canBattle()) && opts.noBlackout) {
      player.party.forEach(Party.heal);
    } else if (result.outcome === "lost" || !canBattle()) {
      await blackout(wild ? null : foe);
    } else {
      for (const record of leveledUp) {
        const evo = Evolution.find(record, { trigger: "level", party: player.party });
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
  async function chooseBattleTeam(max) {
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
          return (st === "able" ? [{ label: "ENTER", value: "enter" }] : st === "selected" ? [{ label: "NO ENTRY", value: "noentry" }] : [])
            .concat([{ label: "SUMMARY", value: "summary" }, { label: "CANCEL", value: "cancel" }]);
        } });
      if (!r) {
        PartyMenu.close();
        if (await confirm("Cancel the battle?")) return null;
        continue;
      }
      cursor = r.cursor;
      if (r.action === "confirm") {
        const err = DoubleBattle.confirmError(party, order, max);
        if (err) { sfx("se_failure"); note = err; continue; }
        PartyMenu.close();
        return order;
      }
      if (r.action === "summary") { PartyMenu.close(); await summary(r.slot); continue; }
      if (r.action === "noentry") { order = DoubleBattle.noEntry(order, r.slot); continue; }
      if (r.action === "enter") {
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

  async function addCaught(record) {
    // A new kind: "…'s data was added to the Pokédex." and its page (once you have one).
    if (!Player.hasCaught(player, record.species) && player.flags.pokedex) {
      Player.markCaught(player, record.species);
      await message(Party.speciesName(record.species) + "'s data was\nadded to the Pokédex.");
      Screen.say("");
      await PokedexScreen.open(dexOptions({ register: record.species }));
    }
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
    const center = player.flags.lastCenter && Player.CENTERS[player.flags.lastCenter];
    const to = Object.assign({}, center || Player.HOME);
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
    if (Bag.isStone(item)) {
      const evo = Evolution.find(record, { trigger: "item", item, party: player.party });
      if (!evo) { await message("It won't have any effect."); return; }
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
    if (item === "ability-capsule") {
      // (Gen 6: it asks first.)
      const to = Bag.capsuleAbility(record);
      if (!to) { await message("It won't have any effect."); return; }
      if (!(await confirm("Do you want to change " + name + "'s Ability from " + record.ability + " to " + to + "?"))) return;
      Player.removeItem(player, item);
      Bag.useOn(record, item);
      await message(name + "'s Ability changed to " + to + "!");
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
    if (item === "rare-candy") {
      if (!Bag.canUseOn(record, item)) { await message("It won't have any effect."); return; }
      if (!player.flags.debugCandy) Player.removeItem(player, item);   // the debug menu makes them infinite
      const newMoves = Bag.levelUp(record, { here: player.location && player.location.map });
      await message(name + " grew to Lv. " + record.level + "!");
      for (const move of newMoves) await learnMove(record, move);
      const evo = Evolution.find(record, { trigger: "level", party: player.party });
      if (evo) await evolve(record, evo, true);
      return;
    }
    let move;
    const eff = ItemUse.effect(item);
    if (eff && eff.oneMove) {
      const v = await ask(eff.ppUp ? "Raise the max PP of which move?" : "Restore PP to which move?", record.moves.map((m, i) => ({
        label: m.name + "  PP " + m.pp + "/" + Party.maxPp(m), value: i, disabled: !Bag.canUseOn(record, item, { move: i })
      })).concat([back()]));
      if (v === "back") return;
      move = v;
    }
    if (!Bag.canUseOn(record, item, { move })) { await message("It won't have any effect."); return; }
    Player.removeItem(player, item);
    const r = Bag.useOn(record, item, { move, here: player.location && player.location.map });
    if (r.revived) await message(name + " was revived!");
    if (r.healed) await message(name + "'s HP was restored by " + plural(r.healed, "point") + ".");
    if (r.cured) await message(name + " was cured of its " + ({ psn: "poisoning", tox: "poisoning", par: "paralysis", slp: "sleep", brn: "burn", frz: "freezing" }[r.cured] || "status") + ".");
    if (r.pp) await message(name + "'s PP was restored.");
    if (r.ppUp) await message(record.moves[move].name + "'s PP increased.");
    if (r.ev) await message(name + "'s base stats rose.");
  }

  async function giveItem(record, item) {
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

  const partyMons = (notes) => player.party.map((r, i) => ({
    name: Party.displayName(r), icon: Screen.iconUrl(r.species, Party.form(r)), level: r.level, gender: r.gender,
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
  async function choosePartyFor(message, item) {
    const note = (r) => (Bag.isMachine(item) && Party.knowsMove(r, Bag.machineMove(item)) ? "LEARNED"
      : Bag.canUseOn(r, item, { party: player.party }) ? "ABLE" : "NOT ABLE");
    const notes = item && (Bag.isMachine(item) || Bag.isStone(item)) ? player.party.map(note) : null;
    const r = await openParty({ message, notes });
    PartyMenu.close();
    return r ? player.party[r.slot] : null;
  }

  const RODS = ["old-rod", "good-rod", "super-rod"];
  const KEY_ITEM_USES = ["exp-share", "town-map", "explorer-kit", "itemfinder", "vs-seeker", "bicycle", "poke-flute", "coin-case"].concat(RODS);
  // Key items Select can use (registered from the Bag, as in FireRed).
  const REGISTERABLE = ["bicycle", "itemfinder", "vs-seeker", "town-map"].concat(RODS);
  const STAT_NAMES = { hp: "HP", atk: "Attack", def: "Defense", spa: "Sp. Atk", spd: "Sp. Def", spe: "Speed" };
  const usableFromBag = (item) => Bag.isStone(item) || Bag.isMachine(item) || !!Bag.mintNature(item) ||
    item === "ability-capsule" || item === "bottle-cap" || item === "gold-bottle-cap" ||
    item === "rare-candy" || !!ItemUse.effect(item) || KEY_ITEM_USES.includes(item) || item in REPEL_STEPS || item === "escape-rope";
  // TMs and HMs work like key items: they can't be held, tossed or sold.
  const holdable = (item) => !Bag.isBall(item) && !Bag.isMachine(item) && !Bag.isKeyItem(item);
  const expShareOn = () => Player.itemCount(player, "exp-share") > 0 && !player.flags.expShareOff;

  // Key items used from the bag: the Exp. Share switches on and off; the Town
  // Map opens the map of Kanto; the Explorer Kit digs in a cave wall (and
  // closes the bag afterwards, back to the map: "escaped").
  async function useKeyItem(item) {
    if (item === "explorer-kit") return (await explorerKit()) ? "escaped" : null;
    if (item === "itemfinder") { fieldAction = itemfinder; return "escaped"; }
    if (item === "vs-seeker") { fieldAction = vsSeeker; return "escaped"; }
    if (item === "bicycle") { fieldAction = bicycle; return "escaped"; }
    if (RODS.includes(item)) {
      // (Only facing water: FireRed's FieldUseFunc_Rod.)
      if (!Overworld.ahead().fishable) { await message("Oak: " + player.name + "! This isn't the time to use that!"); return; }
      fieldAction = () => fish(item);
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
  }

  // Something to do on the map once the menus close (the Itemfinder).
  let fieldAction = null;
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
    for (const r of player.party) Party.adjustFriendship(r, "walking", player.location.map);
  }
  function vsSeekerStep() {
    const f = player.flags;
    if (f.vsSeekerSteps != null && f.vsSeekerSteps < VS_SEEKER_CHARGE) f.vsSeekerSteps++;
  }

  // The Town Map (with { fly: true }, for Fly: the places you can fly to are
  // marked, and A on one resolves with where Fly lands there; B, null): FireRed's Kanto map (tools/build-town-map.js) with your
  // icon where you are. Move the cursor with the arrow keys, or tap a place,
  // to see its name. With the Sevii Islands' pages (One Island's Pokémon
  // Center: FLAG_SYS_SEVII_MAP_123, then _4567 with the Rainbow Pass), SWITCH
  // (or R) turns to the Sevii Islands' maps, as FireRed's switch menu does:
  // Kanto, Sevii 1-2-3, 4-5 and 6-7. It opens on the map you're on.
  async function townMap(opts) {
    const T = window.TOWN_MAP, flying = !!(opts && opts.fly), f = player.flags;
    const pct = (n, of) => (n / of * 100) + "%";
    const sprite = (x, y) => "left:" + pct(28 + 8 * x, 240) + ";top:" + pct(28 + 8 * y, 160);
    // The maps you can turn to: Kanto, and the Sevii pages you have.
    const regions = [{ id: "KANTO", label: "Kanto", image: "assets/town-map/kanto.png", map: T.map, dungeon: T.dungeon }]
      .concat((T.sevii || []).filter((r) => r.id === "SEVII_123" ? f.seviiMap123 || f.seviiMap4567 : f.seviiMap4567)
        .map((r) => Object.assign({ label: { SEVII_123: "Sevii Islands 1-2-3", SEVII_45: "Sevii Islands 4-5", SEVII_67: "Sevii Islands 6-7" }[r.id] }, r)));
    const cellIn = (R, sec) => {
      if (!sec) return null;
      for (const layer of [R.map, R.dungeon]) for (let y = 0; y < T.height; y++) for (let x = 0; x < T.width; x++) if (layer[y][x] === sec) return [x, y];
      return null;
    };
    const find = (sec) => { for (let i = 0; i < regions.length; i++) { const c = cellIn(regions[i], sec); if (c) return { region: i, cell: c }; } return null; };
    // (Somewhere with no square of its own, the Underground Path or the S.S. Anne:
    // where you came in from outdoors.)
    const here = find(T.mapSections[player.location && player.location.map]) ||
      find(T.mapSections[(f.escapeWarp || {}).map]) || { region: 0, cell: cellIn(regions[0], "PALLET_TOWN") };
    let region = here.region, [cx, cy] = here.cell;
    visitSection(player.location && player.location.map);
    const visited = f.visitedSections || [];
    // Places not on the map yet (GetDungeonMapsecUnderCursor): Cerulean Cave until it's open.
    const hiddenSection = (sec) => sec === "CERULEAN_CAVE" && !f.canLinkWithRS;
    // Fly's places: visited, with somewhere to land.
    const flyTo = (sec) => (flying && sec && visited.includes(sec) && (T.fly || {})[sec]) || null;
    show("scene");
    const render = () => {
      const R = regions[region];
      // FireRed's small icons on the caves and forests (CreateDungeonIcons): lit
      // once you've been there. Cerulean Cave's shows only once Celio has the
      // Sapphire (FLAG_SYS_CAN_LINK_WITH_RS), as its entrance opens then. On a
      // town's square the icon sits 2 pixels lower and to the right.
      let icons = "";
      for (let y = 0; y < T.height; y++) for (let x = 0; x < T.width; x++) {
        const sec = R.dungeon[y][x];
        if (!sec || hiddenSection(sec)) continue;
        const off = T.towns.includes(R.map[y][x]) ? 2 : 0;
        icons += '<div class="tm-dungeon' + (visited.includes(sec) ? " visited" : "") + '" style="left:' + pct(32 + 8 * x + off, 240) +
          ";top:" + pct(32 + 8 * y + off, 160) + '"></div>';
      }
      if (flying) {
        const marked = new Set();
        for (let y = 0; y < T.height; y++) for (let x = 0; x < T.width; x++) {
          const sec = R.map[y][x];
          if (!flyTo(sec) || marked.has(sec)) continue;
          marked.add(sec);
          icons += '<div class="tm-fly" style="left:' + pct(32 + 8 * x, 240) + ";top:" + pct(32 + 8 * y, 160) + '"></div>';
        }
      }
      scene.innerHTML = '<div class="town-map' + (flying ? " flying" : "") + '"><img class="tm-map" src="' + R.image + '" alt="Map of ' + R.label + '">' + icons +
        '<div class="tm-name"><b></b><small></small></div>' +
        (region === here.region ? '<img class="tm-player" src="assets/town-map/player.png" alt="You are here" style="' + sprite(here.cell[0], here.cell[1]) + '">' : "") +
        '<div class="tm-cursor"></div></div>';
      draw();
    };
    const draw = () => {
      const R = regions[region], place = hiddenSection(R.map[cy][cx]) ? null : R.map[cy][cx], cave = hiddenSection(R.dungeon[cy][cx]) ? null : R.dungeon[cy][cx];
      scene.querySelector(".tm-name b").textContent = T.names[place] || T.names[cave] || (flying ? "Where do you want to fly?" : "");
      scene.querySelector(".tm-name small").textContent = place && cave ? T.names[cave] : "";
      scene.querySelector(".tm-cursor").setAttribute("style", sprite(cx, cy));
    };
    render();
    const move = (dx, dy) => { cx = Math.max(0, Math.min(T.width - 1, cx + dx)); cy = Math.max(0, Math.min(T.height - 1, cy + dy)); draw(); };
    // SWITCH: the next map, the cursor on the place you're at there (or the
    // map's first town).
    const switchMap = () => {
      if (regions.length < 2) return;
      sfx("se_select");
      region = (region + 1) % regions.length;
      const R = regions[region];
      const at = region === here.region ? here.cell : (() => {
        for (let y = 0; y < T.height; y++) for (let x = 0; x < T.width; x++) if (T.towns.includes(R.map[y][x])) return [x, y];
        return [cx, cy];
      })();
      [cx, cy] = at;
      render();
    };
    let picked = null;
    const choose = new Promise((resolve) => { picked = resolve; });
    const onKey = (e) => {
      if (flying && ["z", "Z", " ", "Enter"].includes(e.key)) {
        e.preventDefault(); e.stopPropagation();
        const spot = flyTo(regions[region].map[cy][cx]);
        if (spot) { sfx("se_select"); picked(spot); }
        return;
      }
      if (e.key === "r" || e.key === "R") { e.preventDefault(); e.stopPropagation(); switchMap(); return; }
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      move(d[0], d[1]);
    };
    document.addEventListener("keydown", onKey, true);
    // (no text over the map)
    const buttons = (regions.length > 1 ? [{ label: "Switch", value: "switch", className: "action" }] : []).concat([back(flying ? "Cancel" : "Close")]);
    let r;
    for (;;) {
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
    MiningScreen.clear();
    await persist();
    return true;
  }

  // ---------- Summary ----------
  //
  // FireRed's Summary screen (ui/summary-screen.js): POKéMON INFO, POKéMON
  // SKILLS and KNOWN MOVES for each of `records` (up / down go through them).

  // Where a Pokémon was met, for the Trainer Memo: the Town Map's name for
  // the place (Route 1, Viridian Forest, ...).
  const placeName = (map) => {
    const T = window.TOWN_MAP, sec = T && T.mapSections[map];
    return (sec && T.names[sec]) || null;
  };
  function summaryView(r) {
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
      status: r.status, shiny: !!r.shiny,
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
    if (mon.mega && DEX[mon.species]) {
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
    cry(records[index].species);
    return SummaryScreen.open(records.map(summaryView), index, summaryContext(records));
  }

  // ---------- Bag ----------

  // FireRed's Bag screen (ui/bag-screen.js), with this game's nine pockets.
  // USE and GIVE close it for the party screen or the text box and open it
  // again after; TOSS happens on the bag screen itself.
  let bagPocket = "Medicine";
  function bagPockets() {
    const order = (id) => (Bag.isMachine(id) ? Bag.machines().indexOf(id) : 0);
    return Bag.POCKETS.map((p) => ({
      name: p,
      items: Object.keys(player.bag).filter((id) => Bag.pocket(id) === p)
        .sort((a, b) => order(a) - order(b) || Bag.name(a).localeCompare(Bag.name(b)))
        .map((id) => ({
          id, name: Bag.name(id), icon: Bag.sprite(id),
          qty: Bag.isMachine(id) || Bag.isKeyItem(id) ? null : player.bag[id],
          desc: Bag.description(id) + (id === "exp-share" ? (expShareOn() ? "\nIt's on." : "\nIt's off.") : "")
        }))
    }));
  }
  async function bagScreen() {
    for (;;) {
      Screen.say("");
      clearMenu();
      const r = await BagScreen.open({
        pockets: bagPockets, pocketName: bagPocket,
        female: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl),
        frame: GameOptions.get().frame,
        actions: (it) => {
          const a = [];
          if (usableFromBag(it.id)) a.push({ label: "Use", value: "use" });
          if (holdable(it.id)) a.push({ label: "Give", value: "give" });
          if (!Bag.isMachine(it.id) && !Bag.isKeyItem(it.id)) a.push({ label: "Toss", value: "toss" });
          if (REGISTERABLE.includes(it.id)) a.push({ label: player.flags.registered === it.id ? "Deselect" : "Register", value: "register" });
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
      else if (what === "use" && Bag.isKeyItem(id)) { if ((await useKeyItem(id)) === "escaped") return "escaped"; }
      else if (what === "use" && id in REPEL_STEPS) await useRepel(id);
      else if (what === "use" && id === "escape-rope") { if (await useEscapeRope()) return "escaped"; }
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
      view: (r) => ({
        name: Party.displayName(r), species: r.species, level: r.level, gender: r.gender,
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
      const { index } = await pcMenu(["Item storage", "Mailbox", "Turn off"], { width: 13 });
      if (index === 0) await itemStorage();
      else if (index === 1) await say("There's no mail here.");
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
        const center = player.flags.lastCenter && Player.CENTERS[player.flags.lastCenter];
        player.location = Object.assign({}, center || Player.HOME);
        await persist();
        return "battled";   // (back to the map, at the new place)
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
      areaList: dexAreaList(),
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
  // maps come in (the order you reach them), with the species found there and
  // whether you've been.
  function dexAreaList() {
    const secs = (window.TOWN_MAP || {}).mapSections || {}, names = (window.TOWN_MAP || {}).names || {};
    const visited = player.flags.visitedSections || [], bySec = new Map();
    const walk = (o, out) => {
      if (!o || typeof o !== "object") return;
      if (o.species) out.add(o.species);
      if (o.alt) out.add(o.alt);   // (a slot's LeafGreen Pokémon, as likely as its FireRed one)
      for (const v of Object.values(o)) walk(v, out);
    };
    for (const [name, m] of Object.entries(window.WORLD_MAPS)) {
      const sec = secs[name];
      if (!sec || !m.wild) continue;
      if (!bySec.has(sec)) bySec.set(sec, new Set());
      walk(m.wild, bySec.get(sec));
    }
    return [...bySec].map(([sec, species]) => ({ name: names[sec] || sec, visited: visited.includes(sec), species: [...species] }));
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
        for (const sp of [o.species, o.alt]) if (sp) (areaIndex[sp] = areaIndex[sp] || new Set()).add(sec);
        for (const v of Object.values(o)) walk(v, sec);
      };
      for (const [name, m] of Object.entries(window.WORLD_MAPS)) if (secs[name] && m.wild) walk(m.wild, secs[name]);
    }
    return [...(areaIndex[species] || [])];
  }

  // ---------- Trainer card ----------

  async function trainerCard() {
    for (;;) {
      tick();
      const html = '<div class="trainer-card"><img class="trainer-card-pic" alt="" src="assets/sprites/trainers/front/' +
        Player.LOOKS[player.look].front + '.png"><h2>' + escapeHtml(player.name) + "</h2>" +
        "<dl><dt>Money</dt><dd>" + money(player.money) + "</dd>" +
        "<dt>Pokédex</dt><dd>" + Player.dexCount(player, "caught", !Player.nationalDex(player)) + " caught, " + Player.dexCount(player, "seen", !Player.nationalDex(player)) + " seen</dd>" +
        "<dt>Badges</dt><dd>" + player.badges.length + "</dd>" +
        "<dt>Mining</dt><dd>Lv. " + Mining.level(miningXp()) + (Mining.toNext(miningXp()) == null ? " (max)"
          : " <small>(" + Mining.toNext(miningXp()) + " XP to the next level)</small>") + "</dd>" +
        "<dt>Play time</dt><dd>" + playTime(player.playTimeMs) + "</dd>" +
        // (Four Island's sticker man: the Hall of Fame sticker, one of four by entries.)
        (player.flags.hofBragState ? "<dt>Stickers</dt><dd>Hall of Fame " + "★".repeat(player.flags.hofBragState) + "</dd>" : "") +
        "<dt>Started</dt><dd>" + new Date(player.createdAt).toLocaleDateString() + "</dd>" +
        "<dt>Last saved</dt><dd>" + (player.savedAt ? new Date(player.savedAt).toLocaleString() : "never") + "</dd></dl>" +
        '<p class="bag-line">The game saves automatically in this browser. Download a save file as a backup, or to move your game to another browser.</p></div>';
      const v = await pick("Your trainer card.", html, [
        { label: "Save now", value: "save", className: "action" },
        { label: "Download save file", value: "download", className: "action" },
        { label: "Load save file", value: "load", className: "action" },
        { label: "Debug", value: "debug", className: "action" },
        back()]);
      if (v === "back") return;
      if (v === "debug") { if ((await debugMenu()) === "battled") return "battled"; continue; }
      if (v === "save") {
        const r = (tick(), Save.write(player));
        await message(r.ok ? player.name + " saved the game." : r.error);
      } else if (v === "download") {
        downloadSave();
        await message("Your save file is downloading.");
      } else if (v === "load") {
        const loaded = await loadSaveFile();
        if (loaded && await confirm("Load " + loaded.name + "'s game? Your current game will be replaced.")) {
          player = loaded;
          await persist();
          await message("Loaded " + player.name + "'s game.");
        }
      }
    }
  }

  // ---------- The Start menu's screens ----------

  // The Start menu's POKéMON: FireRed's party screen. A on a Pokémon opens
  // SUMMARY, its field moves, SWITCH / ITEM / CANCEL; SWITCH asks "Move to
  // where?" and swaps the two; ITEM gives or takes a held item. The field
  // moves are the HM moves it knows or could learn (game/field-moves.js);
  // one that works here closes the menus and is used ("escaped").
  async function partyMenu() {
    if (!player.party.length) { await message("You don't have any Pokémon yet."); return; }
    let cursor = 0;
    for (;;) {
      const r = await openParty({ cursor, actions: (slot) => [{ label: "SUMMARY", value: "summary" }]
        .concat(FieldMoves.forMon(player.party[slot]).map((m) =>
          ({ label: m.toUpperCase(), value: "field:" + m, field: true, desc: FieldMoves.info(m).desc })))
        .concat([{ label: "SWITCH", value: "switch" }, { label: "ITEM", value: "item" }, { label: "CANCEL", value: "cancel" }]) });
      if (!r) { PartyMenu.close(); return; }
      cursor = r.cursor;
      const mon = player.party[r.slot];
      if (r.action === "summary") { PartyMenu.close(); await summary(r.slot); continue; }
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
    card: "Check your money and other game data.",
    save: "Save your game with a complete record\nof your progress to take a break.",
    option: "Adjust various game settings such as text\nspeed, game rules, etc.",
    exit: "Close this menu window.",
    retire: "Retire from the Safari Game and return to\nthe registration counter."
  };
  async function startMenu() {
    player.flags.openedMenu = true;   // (FireRed's FLAG_OPENED_START_MENU: the Sign Lady's scene)
    for (;;) {
      show("world");
      Screen.say("");
      clearMenu();
      // POKéDEX once Prof. Oak has given you one, POKéMON once you have one.
      // In the Safari Zone: RETIRE first, and no SAVE (SetUpStartMenu_SafariZone).
      const items = [], safari = player.flags.safari;
      if (safari) items.push({ key: "retire", label: "Retire" });
      if (player.flags.pokedex) items.push({ key: "dex", label: "Pokédex" });
      if (player.party.length) items.push({ key: "party", label: "Pokémon" });
      items.push({ key: "bag", label: "Bag" }, { key: "card", label: player.name });
      if (!safari) items.push({ key: "save", label: "Save" });
      items.push({ key: "option", label: "Option" }, { key: "exit", label: "Exit" });
      for (const it of items) it.help = START_HELP[it.key];
      const stats = safari ? [String(safari.steps).padStart(3, " ") + "/" + Safari.STEPS, "Balls  " + String(safari.balls).padStart(2, " ")] : null;
      const r = await GbaMenus.startMenu($("#overlay"), { items, cursor: startCursor, frame: GameOptions.get().frame, stats });
      startCursor = r.cursor;
      const v = r.key;
      if (v === "exit") return;
      if (v === "retire") {
        if (await confirm(fill(T("SafariZone_Text_WouldYouLikeToExit")[0]))) { await safariOver(null, false); return; }
        continue;
      }
      if (v === "party") { if ((await partyMenu()) === "escaped") return; }
      else if (v === "bag") { if ((await bagScreen()) === "escaped") return; }
      else if (v === "dex") await pokedex();
      else if (v === "card") { if ((await trainerCard()) === "battled") return; }
      else if (v === "option") { await optionScreen(false); continue; }
      else if (v === "save") {
        if (!(await confirm("Would you like to save the game?"))) continue;
        tick();
        const w = Save.write(player);
        await message(w.ok ? player.name + " saved the game." : w.error);
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
  const braille = (s) => [...s].map((c) => String.fromCharCode(0x2800 + (BRAILLE[c] || 0))).join("");
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
    "Game_EventScript_Leaf", "Game_EventScript_TradebackGuy",
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
      "CeruleanCave_B1F_EventScript_Mewtwo"
    ]).concat(Object.keys(BRAILLE_SIGNS)).concat(League.ROOMS.map((r) => "enter:" + r.map), ["enter:" + League.HALL_OF_FAME]).concat(ROUTE23_BADGES.slice(1).flatMap((b) => ["", "Trigger"].map((t) => "Route23_EventScript_" + b + "BadgeGuard" + t))).concat([1, 2, 3, 4, 5, 6].flatMap((n) => ["Left", "Right"].map((s) => "CinnabarIsland_Gym_EventScript_Quiz" + n + s))).concat(CYCLING_ROAD_GATES.flatMap((g) => ["Top", "MidTop", "Mid", "MidBottom", "Bottom"].map((k) => g + "_EventScript_NeedBikeTrigger" + k))));

  // Which people are around, from FireRed's event flags and this game's story flags.
  // Item balls on the map: picked up once, then gone.
  const ITEM_BALLS = new Set();
  for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people) if (p.item) ITEM_BALLS.add(p.script);
  // Trainers: battle until beaten (a flag named for the trainer, as in FireRed).
  const TRAINER_SCRIPTS = new Set();
  for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people) if (p.trainer && p.trainer.id) TRAINER_SCRIPTS.add(p.script);
  // (or, signalled by the VS Seeker, want a rematch)
  // (or, once you're Champion, the Fighting Dojo wants its rematch: dojoRematch())
  const trainerWaiting = (person) => !!(person.trainer && person.trainer.id &&
    (!player.flags[person.trainer.id] || (player.flags.vsRematch && player.flags.vsRematch[person.trainer.id]) ||
      dojoRematch(person.trainer.id)));

  function visible(person, map) {
    const f = player.flags;
    if (person.item) return !f[person.flag];
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
    // (ThreeIsland_DunsparceTunnel_OnTransition: with the National Pokédex,
    // which you have from the start here, it's dug out).
    if (person.script === "TwoIsland_JoyfulGameCorner_EventScript_LostellesDaddy" && f.gotMoonStoneFromDaddy) return { x: 6, y: 2, movement: "face_down" };
    if (person.script === "ThreeIsland_DunsparceTunnel_EventScript_Prospector" && !Player.nationalDex(player)) return { x: 6, y: 3, movement: "face_right" };
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
  const fill = (s, vars) => s.replace(/\{PLAYER\}/g, player.name).replace(/\{RIVAL\}/g, player.rival)
    .replace(/\{STR_VAR_(\d)\}/g, (_, n) => (vars && vars[n - 1] != null ? vars[n - 1] : ""));
  async function say(pages, vars) { for (const p of [].concat(pages)) await window.Screen.read(fill(p, vars)); }

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
      const beaten = !!player.flags[ev.person.trainer.id];
      await trainerBattle(ev.person, ev.approach, ev.facing);
      if (!beaten) await afterRocket(ev.person);
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
      } else await say(dojoAfter(ev.person.trainer.id) || ev.person.trainer.after || ev.person.text || []);
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

    if (SILPH_WORKERS[script]) { await say(T(SILPH_WORKERS[script][silphFreed() ? 1 : 0])); return; }
    if (SILPH_DOORS.includes(script)) { await silphDoor(script); return; }
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
        // (Again and again, for money, like the Route 4 tutors.)
        await moveTutor("Rock Slide", "tutorRockSlide", "Text_RockSlide", TUTOR_PRICE);
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
      case "Common_EventScript_DirectCornerAttendant":
        await say(T("Text_WirelessClubUndergoingAdjustments"));
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
      // The Berry Powder man: without FireRed's Berry Pouch, you've no Berries.
      case "CeruleanCity_House5_EventScript_BerryPowderMan": {
        const q = T("CeruleanCity_House1_Text_AnyInterestInBerries");
        await say(q.slice(0, -1));
        await say(T((await confirm(fill(q[q.length - 1]))) ? "CeruleanCity_House1_Text_WhyMustYouLieNoBerries"
          : "CeruleanCity_House1_Text_TakeInterestInAllSortsOfThings"));
        return;
      }
      case "CeruleanCity_House5_EventScript_BerryCrushRankings":
        await say("BERRY CRUSH rankings.\nNo one has crushed any Berries yet.");
        return;

      case "PewterCity_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map, ev.person);
        return;

      case "MysteryEventClub_EventScript_Woman":   // no Mystery Events here
        await say(T("Text_WirelessClubUndergoingAdjustments"));
        return;

      // ---------- Route 4 and Mt. Moon ----------

      case "Route4_EventScript_MegaPunchTutor":
        await moveTutor("Mega Punch", "tutorMegaPunch", "Text_MegaPunch", TUTOR_PRICE);
        return;
      case "Route4_EventScript_MegaKickTutor":
        await moveTutor("Mega Kick", "tutorMegaKick", "Text_MegaKick", TUTOR_PRICE);
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
      case "CeladonCity_DepartmentStore_5F_EventScript_ClerkVitamins":
        await mart(ev.person.mart);
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
      // teaches Mimic (FireRed's EventScript_MimicTutor), once.
      case "SaffronCity_CopycatsHouse_2F_EventScript_Copycat": {
        const girl = !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl);
        if (!Player.itemCount(player, "poke-doll")) {
          await say(T(girl ? "SaffronCity_CopycatsHouse_2F_Text_MimickingFavoriteHobbyFemale" : "SaffronCity_CopycatsHouse_2F_Text_MimickingFavoriteHobbyMale"));
          return;
        }
        if (await moveTutor("Mimic", "tutorMimic", "Text_Mimic", null, girl ? "Text_MimicTaughtFemale" : "Text_MimicTaughtMale")) Player.removeItem(player, "poke-doll");
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
        }
        await say(tmText(T("SaffronCity_MrPsychicsHouse_Text_ExplainTM29"), 29, tm));
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
        // (Again and again, for a price, like Route 4's and Rock Slide's tutors.)
        await moveTutor("Thunder Wave", "tutorThunderWave", "Text_ThunderWave", TUTOR_PRICE);
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
      // The Fishing Guru's brother: the Super Rod, then the Magikarp record.
      case "Route12_FishingHouse_EventScript_FishingGuruBrother":
        if (f.gotSuperRod) { await magikarpRecord(); return; }
        await rodGift("super-rod", "gotSuperRod", "Route12_FishingHouse_Text_", "TakeThisAndFish", "ReceivedSuperRod", "IfYouCatchBigMagikarpShowMe");
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
      // (with the National Pokédex: from the start here).
      case "ThreeIsland_DunsparceTunnel_EventScript_Prospector": {
        const D = (k) => T("ThreeIsland_DunsparceTunnel_Text_" + k);
        if (f.gotNuggetFromProspector) { await say(D("ThatsANugget")); return; }
        if (!Player.nationalDex(player)) {
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
      case "SixIsland_Mart_EventScript_Clerk": case "SevenIsland_Mart_EventScript_Clerk": case "TrainerTower_Lobby_EventScript_MartClerk":
        await mart(ev.person.mart);
        return;
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
      // The Fishing Guru's other brother: the Good Rod.
      case "FuchsiaCity_House2_EventScript_FishingGurusBrother":
        if (f.gotGoodRod) { await say(T("FuchsiaCity_House2_Text_HowAreTheFishBiting")); return; }
        await rodGift("good-rod", "gotGoodRod", "FuchsiaCity_House2_Text_", "LikeYourStyleTakeThis", "ReceivedGoodRod", "GoodRodCanCatchBetterMons");
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
      // Haunter, and those holding their item: Onix with a Metal Coat, ...).
      case "Game_EventScript_TradebackGuy": {
        await say(["Hi! I'm the Tradeback Guy!", "Some Pokémon only evolve when\nthey're traded. Nobody to trade\nwith? Leave it to me!",
          "I'll trade with you, and then\ntrade your Pokémon right back!"]);
        if (!(await confirm("Want to trade a Pokémon with me?"))) { await say("Okay! Come back anytime!"); return; }
        const mine = await choosePartyFor("Choose a POKéMON.");
        show("world");
        if (!mine) { await say("Okay! Come back anytime!"); return; }
        const name = Party.displayName(mine);
        await say("{PLAYER} traded " + name + "…\n… … … … …\nand got it back!");
        const evo = Evolution.find(mine, { trigger: "trade", party: player.party });
        if (!evo) { await say("Hmm… Nothing happened.\nHere's your " + name + " back!"); return; }
        await evolve(mine, evo, false);
        show("world");
        await Overworld.resume();
        await say("There you go! Come back anytime!");
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
      // The Fishing Guru gives you an Old Rod.
      case "VermilionCity_House1_EventScript_FishingGuru": {
        if (f.gotOldRod) { await say(T("VermilionCity_House1_Text_HowAreTheFishBiting")); return; }
        const q = T("VermilionCity_House1_Text_ImFishingGuruDoYouLikeToFish");
        await say(q.slice(0, -1));
        if (!(await confirm(fill(q[q.length - 1])))) { await say(T("VermilionCity_House1_Text_OhThatsSoDisappointing")); return; }
        await say(T("VermilionCity_House1_Text_TakeThisAndFish"));
        Player.addItem(player, "old-rod");
        f.gotOldRod = true;
        await sayWithJingle(itemJingle("old-rod"), T("VermilionCity_House1_Text_ReceivedOldRodFromFishingGuru"));
        await say(T("VermilionCity_House1_Text_FishingIsAWayOfLife"));
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
    const t = person.trainer, data = window.WORLD_TRAINERS[t.id];
    const who = "#" + person.id;
    if (t.double && approach == null && !canDouble()) {
      await say(t.notEnough || ["You need two Pokémon to battle us!"]);
      return;
    }
    music(data.music || "mus_encounter_boy");   // their "eyes meet" theme
    if (approach != null) {
      await Overworld.act([{ who, moves: ["emote_exclamation_mark"].concat(Array(approach).fill("walk_" + facing)) }]);
      await Overworld.act([{ who: "player", moves: ["face_" + World.OPPOSITE[facing]] }]);
    }
    const re = dojoRematch(t.id);
    await say(re ? re.intro : t.intro);
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
  function trainerTeam(id) {
    const data = window.WORLD_TRAINERS[id];
    return data.party.map((m) => Object.assign(Party.create(m.species, m.level, { ivs: Math.floor(m.iv * 31 / 255), moves: m.moves }),
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
    if (mine.species !== trade.wants) { await say(T(X.wrong), vars); return; }
    const theirs = Party.create(trade.gives, mine.level, { nickname: trade.nickname });
    theirs.ivs = Object.assign({}, trade.ivs);
    if (trade.ot) theirs.ot = Object.assign({}, trade.ot);
    if (trade.item) theirs.item = trade.item;   // (what it holds: FireRed's heldItem)
    theirs.met = { level: theirs.level, map: player.location.map, traded: true };
    theirs.hp = Party.maxHp(theirs);
    player.party[i] = theirs;
    Player.markCaught(player, trade.gives);
    f[trade.flag] = true;
    await say("{PLAYER} sent " + Party.displayName(mine) + " to the trainer.\nThe trainer sent back " + trade.nickname + "!");
    await say(T(X.thanks));
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
    if (Player.CENTERS[mapName]) player.flags.lastCenter = mapName;
    await say(T("Text_RestoredPkmnToFullHealth"));
    await say(T("Text_WeHopeToSeeYouAgain"));
  }

  // The old man north of Viridian shows how to catch a Pokémon.
  async function catchTutorial() {
    await say(T("ViridianCity_Text_ShowYouHowToCatchMons"));
    await say(["The old man weakened a wild Weedle,\nthen threw a Poké Ball…", "Gotcha!\nWeedle was caught!"]);
    await say(T("ViridianCity_Text_WeakenMonsFirstToCatch").slice(-2));
    player.flags.catchTutorial = true;
  }

  // FireRed's move tutors (EventScript_DreamEaterTutor and the like): each
  // teaches its move once, with its own lines (Text_<Move>Teach, ...Declined,
  // ...WhichMon, ...Taught).
  // `price`: this tutor teaches again and again, for that much each time
  // (instead of FireRed's once only).
  // `taught`: the label of what they say once it's taught, if not <text>Taught.
  // True when it's taught this time.
  async function moveTutor(move, flag, text, price, taught) {
    const f = player.flags;
    taught = taught || text + "Taught";
    if (f[flag] && !price) { await say(T(taught)); return false; }
    const teach = T(text + "Teach");
    await say(teach.slice(0, -1));
    const declined = () => say(T(text + "Declined"));
    if (!(await confirm(fill(teach[teach.length - 1])))) { await declined(); return; }
    if (price) {
      if (!(await confirm("It'll cost " + money(price) + ". Is that okay?\n(You have " + money(player.money) + ".)"))) { await declined(); return; }
      if (player.money < price) { await say("You don't have enough money."); return; }
    } else if (!(await confirm(fill(T("Text_MoveCanOnlyBeLearnedOnce").join(" "))))) { await declined(); return; }
    await say(T(text + "WhichMon"));
    const record = await choosePartyFor("Teach which {PKMN}?");
    show("world");
    if (!record) { await declined(); return; }
    const name = Party.displayName(record);
    const set = window.LEARNSETS_GEN6[record.species] || {};
    const learns = [].concat(set.tm || [], set.tutor || [], (set.levelup || []).map((l) => l[1])).includes(move) ||
      ((window.TUTOR_LEARNERS || {})[move] || []).includes(record.species);
    if (Party.knowsMove(record, move)) { await say(name + " already knows " + move + "."); return; }
    if (!learns) { await say(name + " can't learn " + move + "."); return; }
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

  // What the tutors who teach again and again (Route 4's, Rock Slide's,
  // Silph Co.'s Thunder Wave) charge each time.
  const TUTOR_PRICE = 1000;

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
    f.route22Rival = true;
    await say(T("Route22_Text_EarlyRivalPostBattle"));
    music("mus_rival_exit");
    await Overworld.act([{ who: R, moves: ["delay_10"].concat(M(side === "Bottom" ? "Route22_Movement_EarlyRivalExitBottom" : "Route22_Movement_EarlyRivalExit")) }]);
    Overworld.removeObject(R);
  }

  // ---------- Leaf, outside Pewter Gym and in Vermilion City ----------
  //
  // Leaf waits a few steps from Pewter Gym's door once you have the Boulder
  // Badge. Coming out (or talking to her), she sees you ("!"), comes over,
  // happy for you: she has a Pokédex from Prof. Oak too, and wants a battle
  // (healing your Pokémon first). Butterfree (level 14), her starter (level 15,
  // the one weak against yours) and Jigglypuff (level 13). Losing blacks you
  // out and she's waiting again; beat her and she gives you TM54 False Swipe
  // and heads off west, out of sight.
  //
  // In Vermilion City she waits where the road from Route 6 comes in, and
  // battles you as you come down it: Butterfree (18), Wigglytuff (20),
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
  // in the Seafoam Islands, Pinsirite in the Safari Zone, and Mewtwonite X
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
    { map: "CeruleanCave_B1F", x: 5, y: 12, item: "mewtwonite-x", when: (f) => f.foughtMewtwo },
    { map: "CeruleanCave_B1F", x: 9, y: 12, item: "mewtwonite-y", when: (f) => f.foughtMewtwo },
    // (Left behind for a save that beat them before they gave these.)
    { map: "SilphCo_7F", x: 2, y: 6, item: "pidgeotite", when: (f) => f.silphRival },
    { map: "ViridianCity_Gym", x: 2, y: 2, item: "kangaskhanite", when: (f) => f.giovanniLeft }
  ].map((b, i) => Object.assign({ id: 950 + i, script: "Game_EventScript_MegaStone_" + b.item, flag: megaFlag(b.item),
    movement: "face_down", text: null, sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true }, b));
  for (const b of MEGA_STONE_BALLS) ITEM_BALLS.add(b.script);
  const megaStoneBalls = (map) => MEGA_STONE_BALLS.filter((b) => b.map === map && (!b.when || b.when(player.flags)));
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

  function extraPeople(map) {
    const out = megaStoneBalls(map);
    // The Tradeback Guy, upstairs in every Pokémon Center.
    if (/_PokemonCenter_2F$/.test(map)) {
      out.push(Object.assign({ id: 901, localId: "LOCALID_TRADEBACK_GUY", script: "Game_EventScript_TradebackGuy", x: 12, y: 5,
        movement: "face_down", text: null }, window.WORLD_SPRITES.tradeback));
    }
    if (map === "PokemonTower_7F" && megaTowerDue()) out.push(...megaTowerPeople());
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
    const team = [Party.create("Butterfree", 14), Party.create(RIVAL_PICK[f.starter], 15), Party.create("Jigglypuff", 13)];
    const outcome = await battle("trainer", { foe: { name: "Pokémon Trainer " + LAB_RIVAL_NAME, team, pic: "green" },
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
    const team = [Party.create("Butterfree", 18), Party.create("Wigglytuff", 20), Party.create("Nidorina", 21),
      Party.create(STAGE_TWO[RIVAL_PICK[f.starter]], 22)];
    const outcome = await battle("trainer", { foe: { name: "Pokémon Trainer " + LAB_RIVAL_NAME, team, pic: "green" },
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
  // Koffing (level 14). Beaten, they pay ₽750 and blast off; beat you, and
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
    const outcome = await battle("trainer", { foe: { name: "Rocket Jessie & James", team, pic: "jessie_james" },
      defeatText: ["Jessie: We can't lose to a kid\nlike this!"], prize: 750 });
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
    const team = base.slice(0, -1).concat(Party.create("Eevee", last.level, { ivs: last.ivs.hp }));
    const outcome = await battle("trainer", { foe: { name: "Rival " + player.rival, team, pic: "rival_early" },
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
  // Mega Evolution, and tests everyone: Leaf, then Gary, then Red comes over
  // to battle you (healed before each; the others battle off screen), and
  // goes back to their place. Lose one and you black out as usual, and the
  // test starts over when you come back. Win all three and you go up to Oak
  // for the Mega Ring and the Kanto starters' Mega Stones; then Red, Leaf,
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
    return megaReady() && !player.flags.megaAideMet && !!m && OUTDOORS.includes(m.type) && canBattle();
  }
  // He comes from just off the screen (within 10 steps), or else from 5 to 7
  // steps away, along tiles he can walk on (World.walkable), and goes back
  // the way he came.
  function megaAideRoute() {
    const at = Overworld.position();
    const people = Overworld.people();
    const tree = World.walkable(at, (m, x, y) => people.some((q) => q.x === x && q.y === y), 10);
    const offScreen = (t) => t.x < at.x - 7 || t.x > at.x + 7 || t.y < at.y - 4 || t.y > at.y + 5;
    const score = (t) => (offScreen(t) && t.dist >= 5 ? 300 - t.dist : t.dist >= 5 && t.dist <= 7 ? 100 + t.dist : t.dist <= 7 ? t.dist : 0);
    let best = null;
    for (const [key, t] of tree) if (t.dist >= 1 && (!best || score(t) > score(best[1]))) best = [key, t];
    if (!best) return null;
    const toPlayer = World.pathBack(tree, best[0]);   // (the last step would be onto you)
    return { from: best[1], walk: toPlayer.slice(0, -1), face: toPlayer[toPlayer.length - 1] };
  }
  async function megaAide() {
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
  // Who's at the top of the Tower, waiting: Prof. Oak and Mr. Fuji at the
  // top, and Leaf, Gary and Red in a line, facing them, with a place left in
  // the middle for you (MEGA_SPOT), two steps before Oak.
  const MEGA_SPOT = { x: 11, y: 7 };
  const MEGA_PLACES = { oak: [11, 4, "down"], fuji: [12, 4, "down"], leaf: [9, 7, "up"], gary: [10, 7, "up"], red: [12, 7, "up"] };
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
  // In the order you battle them.
  const MEGA_RIVALS = [
    { key: "leaf", name: () => "Pokémon Trainer " + LAB_RIVAL_NAME, pic: "green", music: "mus_encounter_rival",
      team: leafMegaTeam,
      intro: ["Leaf: My turn, {PLAYER}! I've been\ntraining really hard since\nVermilion!", "This time I'm going to win!"],
      defeat: ["Leaf: Aww! You're amazing,\n{PLAYER}!"],
      after: ["Leaf: That was so much fun!\nI can't wait to see what Mega\nEvolution is!"] },
    { key: "gary", name: () => "Rival " + player.rival, pic: "rival_late", music: "mus_encounter_rival",
      team: () => [["Pidgeotto", 27], ["Growlithe", 28], ["Gyarados", 29], ["Exeggutor", 30], ["Umbreon", 31]],
      intro: ["{RIVAL}: Heh! Gramps called you too,\nhuh, {PLAYER}?", "Doesn't matter. I'll pass his test\nby beating you first! Let's go!"],
      defeat: ["{RIVAL}: What!? Not again!"],
      after: ["{RIVAL}: Tch… Fine. You passed.\nBut I'm not done getting stronger!"] },
    { key: "red", name: () => "Pokémon Trainer Red", pic: "red", music: "mus_encounter_rival",
      team: () => [["Pikachu", 27], ["Charmeleon", 28], ["Wartortle", 29], ["Ivysaur", 30], ["Espeon", 31]],
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
    // One at a time, each steps out of the line to battle you, and back.
    for (const r of MEGA_RIVALS) {
      if (beaten[r.key]) continue;
      const who = MEGA_CAST[r.key], [hx, hy] = MEGA_PLACES[r.key];
      player.party.forEach(Party.heal);
      await sayWithJingle("mus_heal", "Prof. Oak healed {PLAYER}'s Pokémon!");
      music(r.music);
      // (Out of the line, to stand in front of you.)
      await walkTo(who, { x: MEGA_SPOT.x, y: MEGA_SPOT.y - 1 }, "down");
      await Overworld.act([{ who: "player", moves: ["face_up"] }]);
      await say(r.intro);
      const team = r.team().map(([sp, lv]) => Party.create(sp, lv));
      const outcome = await battle("trainer", { foe: { name: r.name(), team, pic: r.pic }, defeatText: r.defeat,
        prize: 36 * team[team.length - 1].level });
      // (Blacked out: the whole test again next time.)
      if (outcome !== "won") { delete f.megaBeaten; await persist(); return; }
      show("world");
      await Overworld.resume();
      beaten[r.key] = true;
      await say(r.after);
      music("mus_oak");
      await walkTo(who, { x: hx, y: hy }, "up");
      await Overworld.act([{ who: "player", moves: ["face_up"] }]);
    }
    player.party.forEach(Party.heal);
    music("mus_oak");
    await say(["Oak: Splendid! Simply splendid!",
      "While you were battling, Red, Leaf and\n{RIVAL} had quite the battles among\nthemselves, too.",
      "You've all passed my test! Each of\nyou shares a real bond with your\nPokémon.",
      "And {PLAYER}, you won every one of\nyour battles! I knew I could count\non you.",
      "Come here a moment, {PLAYER}."]);
    // Up to Prof. Oak for the Mega Ring and the Mega Stones, then back.
    const [ox, oy] = MEGA_PLACES.oak;
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
    // Off they go: Red without a word, Leaf and Gary with one.
    const RED = MEGA_CAST.red, LEAF_ = MEGA_CAST.leaf, GARY = MEGA_CAST.gary;
    await Overworld.act([{ who: RED, moves: ["face_player"] }]);
    await say(["Red: …"]);
    await megaLeaves(RED);
    await Overworld.act([{ who: LEAF_, moves: ["face_player"] }]);
    await say(["Leaf: A Mega Ring! Congratulations,\n{PLAYER}! You totally earned it!",
      "I'll keep training with my Pokémon,\ntoo. Maybe one day we'll find some\nMega Stones of our own!",
      "See you around, {PLAYER}! Take\ncare of yourself!"]);
    await megaLeaves(LEAF_);
    music("mus_rival_exit");
    await Overworld.act([{ who: GARY, moves: ["face_player"] }]);
    await say(["{RIVAL}: Hmph! So Gramps gave you\nthe Mega Ring. Enjoy it while you\ncan.",
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
      case "Flash":
        if (!Overworld.isDark()) return "Can't use that here.";
        return async () => { await say(usedMove(mon, "Flash")); sfx("se_m_reflect"); Overworld.flash(); };
      case "Cut": {
        // (Ruin Valley's dotted door, from below: CutMoveRuinValleyCheck.)
        if (Sevii.cutOpensDottedHole(player.flags, Overworld.position())) return () => cutDottedHoleDoor(mon);
        const tree = facingScript("EventScript_CutTree");
        if (!tree) return "There's nothing to Cut.";
        return async () => { await say(usedMove(mon, "Cut")); cutDown(tree); };
      }
      case "Fly":
        if (!OUTDOORS.includes(here.type)) return "Can't use that here.";
        return () => fly();
      case "Strength": {
        if (!facingScript("EventScript_StrengthBoulder")) return "Can't use that here.";
        return () => useStrength(mon);
      }
      case "Surf":
        if (surfing) return "You're already surfing.";
        if (!a.water) return "No surfing here!";
        return () => startSurfing(mon);
      case "Rock Smash": {
        const rock = facingScript("EventScript_RockSmash");
        if (!rock) return "Can't use that here.";
        return async () => { await say(usedMove(mon, "Rock Smash")); await smashRock(rock); };
      }
      case "Waterfall":
        if (!surfing || a.behavior !== World.MB.WATERFALL) return "Can't use that here.";
        return async () => { await say(Party.displayName(mon) + " used Waterfall."); await climbWaterfall(); };
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
      if (w) await battle("wild", { foe: { name: "Wild", team: [Party.create(w.species, w.level)] } });
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

  // Fly: pick a town you've been to on the Town Map, and off you go, landing
  // outside its Pokémon Center (FireRed's heal locations).
  async function fly() {
    const spot = await townMap({ fly: true });
    await Overworld.resume();   // (the map was put away for the Town Map)
    if (!spot) return;
    sfx("se_m_fly");
    Overworld.setAvatar("walk");
    await Overworld.teleport({ map: spot.map, x: spot.x, y: spot.y, facing: "down" });
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
  // Fishing (FireRed's StartFishing, src/field_player_avatar.c). You cast,
  // and dots appear in the text box one every 20 frames (4 to 10 the first
  // time); then half the time it's "Not even a nibble‥" (always, where
  // there's nothing to fish). A bite tugs at the rod and you have 36, 33 or
  // 30 frames (Old, Good, Super Rod) to press A, or "It got away‥". The
  // better rods make you reel in more than once (at least 1, 1-3 or 1-6
  // times, and maybe again: 40% / 10% for the Good Rod, 70% / 30% for the
  // Super Rod), and then "A POKéMON's on the hook!" and a wild battle with
  // the map's fishing Pokémon for that rod (World.fishingEncounter).
  const ROD_INDEX = { "old-rod": 0, "good-rod": 1, "super-rod": 2 };
  // A pressed within `ms` -> true, or false once it's past.
  function pressAWithin(ms) {
    return new Promise((resolve) => {
      const onKey = (e) => {
        if (!["z", "Z", " "].includes(e.key) || e.repeat) return;
        e.preventDefault(); e.stopPropagation();
        done(true);
      };
      const done = (v) => { clearTimeout(t); document.removeEventListener("keydown", onKey, true); resolve(v); };
      const t = setTimeout(() => done(false), ms);
      document.addEventListener("keydown", onKey, true);
    });
  }
  async function fish(rodId) {
    const r = ROD_INDEX[rodId], at = player.location;
    const here = window.WORLD_MAPS[at.map] || {};
    const frames = (n) => sleep(n * 1000 / 60);
    const minRounds = 1 + Math.floor(Math.random() * [1, 3, 6][r]);
    const second = frames(60);
    await Overworld.rod("out");
    await second;
    let rounds = 0, result = null;
    while (!result) {
      // A round of dots.
      let dots = Math.floor(Math.random() * 10) + 1;
      if (rounds === 0) dots += 3;
      dots = Math.min(dots, 10);
      Screen.say(" ");
      for (let n = 1; n <= dots; n++) {
        await frames(20);
        const text = Array(n).fill("·").join("  ");
        Screen.say(text, text.length);
      }
      await frames(20);
      // (Whether anything bites at all is only decided the first time.)
      if (rounds++ === 0 && (!here.fishing || Math.random() < 0.5)) { result = "nibble"; break; }
      Overworld.rod("bite");
      if (!(await pressAWithin([36, 33, 30][r] * 1000 / 60))) { result = "away"; break; }
      if (rounds < minRounds) continue;
      if (rounds < 2 && Math.floor(Math.random() * 100) < [[0, 0], [40, 10], [70, 30]][r][rounds]) continue;
      result = "hooked";
    }
    if (result !== "hooked") {
      Overworld.rod("away");
      await say(result === "nibble" ? "Not even a nibble‥" : "It got away‥");
      Screen.say("");
      Overworld.rod(null);
      return;
    }
    await say("A POKéMON's on the hook!");
    Screen.say("");
    Overworld.rod(null);
    const mon = World.fishingEncounter(at.map, rodId);
    if (!mon) return;
    player.flags.fishingCaptures = (player.flags.fishingCaptures | 0) + 1;
    // (FireRed's pond, or the sea.)
    const ahead = Overworld.ahead();
    const terrain = ahead.behavior === 0x10 ? "pond" : "water";
    if (safariOn()) { await safariBattle(mon.species, mon.level, terrain); return; }
    if (!canBattle()) return;
    await battle("wild", { foe: { name: "Wild", team: [Party.create(mon.species, mon.level)] }, terrain });
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
      const name = Party.displayName(dc.mon), grew = DayCare.levelsGained(dc), cost = DayCare.cost(dc);
      await say(D(grew ? "MonHasGrownByXLevels" : "MonNeedsToSpendMoreTime"), [name, String(grew)]);
      if (!(await confirm(fill(D("OweMeXForMonsReturn").join(" "), [name, cost.toLocaleString("en-US")])))) { await say(D("ComeAnytimeYouLike")); return; }
      if (player.party.length >= Player.PARTY_SIZE) { await say(D("YouveGotNoRoomForIt")); return; }
      if (player.money < cost) { await say(D("DontHaveEnoughMoney")); return; }
      Player.addMoney(player, -cost);
      const mon = DayCare.withdraw(dc);
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
    if (player.party.length === 1) { await say(D("OnlyHaveOneMonWithYou")); return; }
    await say(D("WhichMonShouldIRaise"));
    const mine = await choosePartyFor("Choose a POKéMON.");
    show("world");
    if (!mine) { await say(D("ComeAnytimeYouLike")); return; }
    if (!player.party.some((r) => r !== mine && !Party.isFainted(r))) { await say(D("WhatWillYouBattleWith")); return; }
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
    return [Party.create("Zubat", 11, { ivs: 0 }), geodude, Party.create("Vulpix", 13, { ivs: 0 }), onix];
  }

  // Misty's team: Psyduck (level 18, in Staryu's place), which she leads
  // with, Togepi (level 19, with Dazzling Gleam from a TM, its only real
  // attack besides Metronome), then FireRed's Starmie.
  function mistyTeam() {
    const [, starmie] = trainerTeam("TRAINER_LEADER_MISTY");
    return [Party.create("Psyduck", 18, { ivs: 0 }),
      Party.create("Togepi", 19, { ivs: 0, moves: ["Dazzling Gleam", "Metronome", "Sweet Kiss", "Yawn"] }), starmie];
  }

  // Brock: battle (talking to him), then the Boulder Badge and TM39.
  async function brock(person) {
    const f = player.flags;
    if (!f.TRAINER_LEADER_BROCK) {
      await say(person.trainer.intro);
      if (!canBattle()) return;
      const outcome = await battle("trainer", { foe: { name: "Leader Brock", team: brockTeam(), pic: "leader_brock" },
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
      const outcome = await battle("trainer", { foe: { name: "Leader Misty", team: mistyTeam(), pic: "leader_misty" },
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
  async function ltSurge(person) {
    const f = player.flags, ID = "TRAINER_LEADER_LT_SURGE";
    if (!f[ID]) {
      await say(person.trainer.intro);
      if (!canBattle()) return;
      const outcome = await battle("trainer", { foe: { name: "Leader Lt. Surge", team: trainerTeam(ID), pic: "leader_lt_surge" },
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
  async function erika(person) {
    const f = player.flags, ID = "TRAINER_LEADER_ERIKA";
    if (!f[ID]) {
      await say(person.trainer.intro);
      if (!canBattle()) return;
      const outcome = await battle("trainer", { foe: { name: "Leader Erika", team: trainerTeam(ID), pic: "leader_erika" },
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
  // Coins (in the Coin Case, up to 9,999): bought from the clerk, given by a
  // few gamblers, found on the floor, and won at the slots; spent next door
  // in the Prize Room.
  const MAX_COINS = 9999;
  const coins = () => player.flags.coins || 0;
  const addCoins = (n) => { player.flags.coins = Math.max(0, Math.min(MAX_COINS, coins() + n)); };
  const plainCoins = (n) => n.toLocaleString("en-US");

  // The clerk (CeladonCity_GameCorner_EventScript_CoinsClerk): the money box
  // and coins box at the top left, 50 or 500 Coins in
  // MULTICHOICE_GAME_CORNER_COIN_PURCHASE_COUNTER at the top right.
  async function coinsClerk() {
    const G = (k) => T("CeladonCity_GameCorner_Text_" + k);
    moneyBox(0, 0); coinsBox(0, 5);
    try {
      const q = G("WelcomeBuySomeCoins");
      await say(q.slice(0, -1));
      const i = await multichoice(q[q.length - 1], 13, 0, ["{FONT_SMALL} 50 Coins{CLEAR_TO 69}¥1,000", "{FONT_SMALL}500 Coins{CLEAR_TO 64}¥10,000", "Exit"]);
      if (i < 0 || i > 1) { await say(G("ComePlaySometime")); return; }
      const v = i ? 500 : 50;
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
      const outcome = await battle("trainer", { foe: { name: "Leader Sabrina", team: trainerTeam(ID), pic: "leader_sabrina" },
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
  // Machop and Machoke are Machamps now, Mankey Primeapes) at levels 48-52.
  // Beat the Karate Master again and he gives you the Hitmon you didn't
  // take the first time, at Lv. 50. Each battles you again only once
  // (flags.dojoRematch[trainer id]: won).
  const DOJO_MASTER = "TRAINER_BLACK_BELT_KOICHI";
  const DOJO_SECOND_LEVEL = 50;
  const DOJO_REMATCH = {
    TRAINER_BLACK_BELT_HITOSHI: {
      team: [["Machamp", 49], ["Primeape", 49], ["Primeape", 50]],
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
      team: [["Primeape", 52]],
      intro: ["Hiyah!", "Boulders are too easy now!\nI shatter whole cliffs!", "My Primeape's fury is harder than\nany rock!"],
      defeat: ["Yow!\nStubbed fingers… again!"],
      after: ["Psychic power still frightens us…\nBut now, so do you!"]
    },
    TRAINER_BLACK_BELT_MIKE: {
      team: [["Primeape", 48], ["Primeape", 49], ["Primeape", 50]],
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
  // about FireRed's levels: Pidgeot, Growlithe, Gyarados, Exeggutor, Umbreon
  // (his Eevee) and Alakazam, which holds its Alakazite and Mega Evolves.
  // Then he's off by the warp pad.
  const SILPH_RIVAL_TEAM = [["Pidgeot", 37], ["Growlithe", 35], ["Gyarados", 38], ["Exeggutor", 35], ["Umbreon", 40], ["Alakazam", 35, "alakazite"]];
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
  // X: it Mega Evolves), Snorlax and Pikachu, and Giovanni's Kangaskhan holds
  // its Kangaskhanite. Beaten, Giovanni's gone, and so is Team Rocket, from
  // Silph Co. and from Saffron; and Red goes back the way he came.
  const SILPH_RED = "LOCALID_SILPH_CO_RED";
  // Red's Pokémon now: those he had at the top of Pokémon Tower, all fully
  // evolved, and a Snorlax, all at Lv. 36; for the tag battle he picks three.
  const RED_SILPH_ROSTER = [["Pikachu", 36], ["Charizard", 36, "charizardite-x"], ["Blastoise", 36], ["Venusaur", 36], ["Espeon", 36], ["Snorlax", 36]];
  const RED_SILPH_PICK = ["Charizard", "Snorlax", "Pikachu"];
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
    const from = await walkIn(R, lookOf("red"), { x: 2, y: 5 }, spots, "fast_");
    if (Overworld.personPosition(R)) await faceEachOther(R);
    await say(["Red: …"]);
    await Overworld.act([{ who: R, moves: ["face_up"] }, { who: "player", moves: ["face_" + me.facing] }]);
    await say(["Red joined {PLAYER}, ready\nto battle!",
      "Giovanni: Hm? Another child…\nHow tiresome.",
      "No matter. I'll crush the two of you\ntogether!"]);
    const team = trainerTeam(ID).map((r) => (r.species === "Kangaskhan" ? Object.assign(r, { item: "kangaskhanite" }) : r));
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
    if (from) await walkOut(R, from, "fast_");
    Overworld.removeObject(R);
  }

  // ---------- Route 12 to Fuchsia City ----------

  const isGirl = () => !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl);

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
  async function rodGift(rod, flag, prefix, takeThis, received, explain) {
    const L = (k) => T(prefix + k);
    const like = L("DoYouLikeToFish");
    await say(like.slice(0, -1));
    if (!(await confirm(fill(like[like.length - 1])))) { await say(L("OhThatsDisappointing")); return; }
    await say(L(takeThis));
    Player.addItem(player, rod);
    player.flags[flag] = true;
    await sayWithJingle(itemJingle(rod), L(received));
    await say(L(explain));
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
    if (!player.party.some((r) => r.species === "Magikarp")) { await say(L("TryFishingBringMeMagikarp")); return; }
    await say(L("OhMagikarpAllowMeToSee"));
    const r = await choosePartyFor("Choose a {PKMN}.");
    if (!r) return;
    if (r.species !== "Magikarp") { await say(L("DoesntLookLikeMagikarp")); return; }
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
  async function koga(person) {
    const f = player.flags, ID = "TRAINER_LEADER_KOGA";
    if (!f[ID]) {
      await say(person.trainer.intro);
      if (!canBattle()) return;
      const outcome = await battle("trainer", { foe: { name: "Leader Koga", team: trainerTeam(ID), pic: "leader_koga" },
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

  // The legendary birds: Articuno (SeafoamIslands_B4F_EventScript_Articuno)
  // and Zapdos (PowerPlant_EventScript_Zapdos), wild at Lv. 50, to the
  // legendary battle music. Beaten or caught, it's gone for good; run from,
  // it flies away, and is back the next time you come.
  // (Mewtwo in Cerulean Cave too, `opts` { level, text, music }: Lv. 70,
  // "Mew!", its own battle music: CeruleanCave_B1F_EventScript_Mewtwo.)
  async function legendaryBird(person, species, flag, opts) {
    opts = opts || {};
    if (!canBattle()) return;
    cry(species);
    await say(opts.text || T("Text_Gyaoo"));
    music("mus_encounter_gym_leader");
    await sleep(300);
    const outcome = await battle("wild", { foe: { name: "Wild", team: [Party.create(species, opts.level || 50)] }, music: opts.music || "mus_vs_legend" });
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
      const outcome = await battle("trainer", { foe: { name: "Leader Giovanni", team: trainerTeam(ID), pic: "leader_giovanni" },
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

  // ---------- Route 22's rival, late ----------
  //
  // FireRed's Route22_EventScript_LateRival: once you've beaten Giovanni,
  // Gary comes up from the left on your way to the League. This game's own
  // team for him (as on Silph Co.'s 7F) at FireRed's levels here: Pidgeot,
  // Growlithe, Gyarados (in Rhyhorn's place), Exeggutor, Alakazam (holding
  // its Alakazite: it Mega Evolves) and Umbreon (his Eevee) as his ace.
  const ROUTE22_LATE_RIVAL_TEAM = [["Pidgeot", 47], ["Growlithe", 45], ["Gyarados", 45], ["Exeggutor", 45], ["Umbreon", 53], ["Alakazam", 47, "alakazite"]];
  const route22LateRivalDue = () => !!(player.flags.TRAINER_LEADER_GIOVANNI && !player.flags.route22LateRival);
  async function route22LateRival(side) {
    if (!route22LateRivalDue()) return;
    const f = player.flags, R = "LOCALID_ROUTE22_RIVAL";
    music("mus_encounter_rival");
    Overworld.addObject(R, { x: 25, y: side === "Top" ? 4 : 5, facing: "right" });
    await Overworld.act(side === "Bottom"
      ? [{ who: R, moves: M("Route22_Movement_RivalApproachBottom") }, { who: "player", moves: M("Route22_Movement_PlayerFaceRival") }]
      : [{ who: R, moves: M("Route22_Movement_RivalApproach") }]);
    await say(T("Route22_Text_LateRivalIntro"));
    // (FireRed's IVs: 150, and 250 for his starter, here Umbreon.)
    const team = ROUTE22_LATE_RIVAL_TEAM.map(([sp, lv, item]) => Object.assign(Party.create(sp, lv, { ivs: Math.floor((sp === "Umbreon" ? 250 : 150) * 31 / 255) }),
      item ? { item } : {}));
    const ace = Math.max(...team.map((r) => r.level));
    const outcome = await battle("trainer", { foe: { name: "Rival " + player.rival, team, pic: "rival_late" },
      defeatText: T("Route22_Text_LateRivalDefeat"), trainerId: "TRAINER_RIVAL_ROUTE22_LATE_SQUIRTLE",
      prize: 36 * ace });   // (TRAINER_CLASS_RIVAL_LATE: 9, x4)
    if (outcome !== "won") { if (outcome === "cancelled") Overworld.removeObject(R); return; }
    f.route22LateRival = true;
    show("world");
    await Overworld.resume();
    await say(T("Route22_Text_LateRivalPostBattle"));
    Screen.say("");
    await sleep(170);
    music("mus_rival_exit");
    await Overworld.act([{ who: R, moves: M("Route22_Movement_LateRivalExit") }]);
    Overworld.removeObject(R);
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
  async function eliteFour(k) {
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
    const id = League.trainerId(f, k), data = window.WORLD_TRAINERS[id];
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(id), pic: data.pic },
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

  // Gary, the Champion (PokemonLeague_ChampionsRoom_EventScript_EnterRoom):
  // this game's team for him, as on Silph Co. and Route 22, at FireRed's
  // Champion levels: Pidgeot (59), Arcanine (59: his Growlithe's evolved),
  // Gyarados (59, in Rhydon's place), Exeggutor (61), Umbreon (63: his Eevee,
  // as FireRed's starter, holding its Sitrus Berry) and Alakazam (57, holding
  // its Alakazite: it Mega Evolves). With FLAG_SYS_CAN_LINK_WITH_RS, FireRed's
  // rematch levels (72-75). FireRed's moves for the Pokémon FireRed gives him.
  const CHAMPION_TEAM = [["Pidgeot", 59, 72], ["Arcanine", 59, 73], ["Gyarados", 59, 72], ["Exeggutor", 61, 73], ["Umbreon", 63, 75, "sitrus-berry"], ["Alakazam", 57, 73, "alakazite"]];
  function championTeam(rematch) {
    const fr = window.WORLD_TRAINERS[rematch ? "TRAINER_CHAMPION_REMATCH_SQUIRTLE" : "TRAINER_CHAMPION_FIRST_SQUIRTLE"];
    const frg = window.WORLD_TRAINERS[rematch ? "TRAINER_CHAMPION_REMATCH_BULBASAUR" : "TRAINER_CHAMPION_FIRST_BULBASAUR"];
    const movesOf = (sp) => { const m = fr.party.concat(frg.party).find((x) => x.species === sp); return m && m.moves; };
    return CHAMPION_TEAM.map(([sp, lv, lv2, item]) => Object.assign(Party.create(sp, rematch ? lv2 : lv, { ivs: 31, moves: movesOf(sp) }), item ? { item } : {}));
  }
  async function championsRoom() {
    const f = player.flags, R = "LOCALID_CHAMPIONS_ROOM_RIVAL", O = "LOCALID_CHAMPIONS_ROOM_PROF_OAK";
    if (!League.entryDue(f, player.location.map)) return;
    await Overworld.act([{ who: "player", moves: M("PokemonLeague_ChampionsRoom_Movement_PlayerEnter") }]);
    await sleep(333);
    await say(T(f.gameClear ? "PokemonLeague_ChampionsRoom_Text_RematchIntro" : "PokemonLeague_ChampionsRoom_Text_Intro"));
    if (!canBattle()) return;
    const rematch = !!f.canLinkWithRS, team = championTeam(rematch);
    const outcome = await battle("trainer", { foe: { name: "Champion " + player.rival, team, pic: "champion_rival" },
      defeatText: T("PokemonLeague_ChampionsRoom_Text_Defeat"),
      trainerId: rematch ? "TRAINER_CHAMPION_REMATCH_SQUIRTLE" : "TRAINER_CHAMPION_FIRST_SQUIRTLE",
      prize: 100 * Math.max(...team.map((r) => r.level)),   // (TRAINER_CLASS_CHAMPION: 25, x4)
      music: "mus_vs_champion", victoryMusic: "mus_victory_gym_leader", terrain: "champion" });
    if (outcome !== "won") return;
    League.beat(f, 4);
    show("world");
    await Overworld.resume();
    await say(T("PokemonLeague_ChampionsRoom_Text_PostBattle"));
    // Prof. Oak comes in.
    music("mus_slow_pallet");
    Overworld.addObject(O, { x: 6, y: 15, facing: "up" });
    await say(T("PokemonLeague_ChampionsRoom_Text_OakPlayer"));
    Screen.say("");
    await Overworld.act([{ who: "player", moves: M("PokemonLeague_ChampionsRoom_Movement_PlayerWatchOakEnter") },
      { who: R, moves: M("PokemonLeague_ChampionsRoom_Movement_RivalWatchOakEnter") },
      { who: O, moves: M("PokemonLeague_ChampionsRoom_Movement_OakEnter") }]);
    await sleep(417);
    await say(T("PokemonLeague_ChampionsRoom_Text_OakCongratulations"), [Party.speciesName(f.starter || player.party[0].species)]);
    await Overworld.act([{ who: O, moves: M("Common_Movement_WalkInPlaceFasterRight") }, { who: R, moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
    await say(T("PokemonLeague_ChampionsRoom_Text_OakImDisappointedRival"));
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
    Screen.say("");
    await Overworld.act([{ who: O, moves: M("Common_Movement_WalkInPlaceFasterUp") }, { who: "player", moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    await sleep(333);
    await HallOfFame.recordFlash($("#overlay"));
    await sleep(667);
    League.reset(f);
    delete f.lastCenter;   // (setrespawn HEAL_LOCATION_PALLET_TOWN)
    player.party.forEach(Party.heal);
    const entry = League.record(f, player.party.map((r) => Object.assign({}, r, { form: Party.form(r) })),
      { name: player.name, id: player.trainerId, playTimeMs: player.playTimeMs });
    // Where you'll be after the credits (FireRed's continue warp, at home).
    player.location = Object.assign({}, Player.HOME);
    music(null);
    await Overworld.fadeToBlack();
    // (Whatever goes wrong drawing it, you're Champion and the game goes on.)
    await HallOfFame.show($("#overlay"), entry, {
      cry, sfx, music, player: { name: player.name, id: player.trainerId, playTimeMs: player.playTimeMs, pic: Player.LOOKS[player.look].front },
      save: async () => { await persist(); }
    }).catch((e) => { console.error(e); return persist(); });
    await creditsRoll();
  }

  // The credits (FireRed's IndigoPlateau_Exterior_EventScript_Credits, then
  // DoCredits): out in front of the Indigo Plateau, Gary comes out and runs
  // off, Prof. Oak comes out, looks at you and walks off, and you run off
  // too; then the credits roll over Kanto, with Charizard, Venusaur,
  // Blastoise and Pikachu, to THE END. (The first time all the way; after
  // that, Start skips them.) Then you're at home in Pallet Town.
  async function creditsRoll() {
    const f = player.flags, R = "LOCALID_CREDITS_RIVAL", O = "LOCALID_CREDITS_PROF_OAK";
    const run = (moves) => moves.map((m) => m.replace(/^player_run_/, "walk_fast_"));
    $("#overlay").classList.add("hidden");
    show("world");
    await Overworld.teleport({ map: "IndigoPlateau_Exterior", x: 11, y: 7, facing: "down" });
    music("mus_credits");
    await sleep(1750);
    Overworld.addObject(R, { x: 11, y: 6, facing: "down" });
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
    await HallOfFame.credits($("#overlay"), { skippable: !!f.seenCredits, cry, music, rival: player.rival,
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
    await say(q.slice(0, -1));
    await seagallopMenu("VERMILION_CITY", q, back);
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
  // of you as can be — Frenzy Plant, Blast Burn or Hydro Cannon, each once.
  async function capeBrinkTutor() {
    const f = player.flags, lead = player.party[0];
    if (f.capeBrinkDone) { await say(T("Text_FeelRejuvenated")); return; }
    if (capeBrinkJustTaught) { await say(T("Text_MakeBestUseOfMove")); return; }
    const species = lead ? Party.speciesName(lead.species) : "";
    await say(T("Text_UltimateMoveThatMon"), [species]);
    const m = Sevii.capeBrinkMove(lead, f);
    if (!m) { await say(T("Text_JustMistaken")); return; }
    const vars = [species, m.move];
    await Overworld.act([{ who: "LOCALID_CAPE_BRINK_TUTOR", moves: ["jump_in_place_" + World.OPPOSITE[Overworld.position().facing]] }]);
    const q = T("Text_AllowMeToTeachMonUltimateMove");
    await say(q.slice(0, -1), vars);
    if (!(await confirm(fill(q[q.length - 1], vars)))) { await say(T("Text_YouRejectIt")); return; }
    if (!(await confirm(fill(T("Text_MoveCanOnlyBeLearnedOnce").join(" "))))) { await say(T("Text_YouRejectIt")); return; }
    await say(T("Text_LetMeConferUltimateMove"), vars);
    Screen.say("");
    await Overworld.fadeToBlack();
    await learnMove(lead, m.move);
    show("world");
    await Overworld.fadeFromBlack();
    if (!Party.knowsMove(lead, m.move)) { await say(T("Text_YouRejectIt")); return; }
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
  // says how they're doing. (FireRed's couple also find Eggs when two get on:
  // this game has no Eggs, so they never do.)
  const DC = (k) => T("DayCare_Text_" + k);
  async function yesNo(pages, vars) {
    await say(pages.slice(0, -1), vars);
    return confirm(fill(pages[pages.length - 1], vars));
  }
  async function fourIslandDayCareLady() {
    const f = player.flags, list = f.dayCare2 || (f.dayCare2 = []);
    const comeAgain = () => say(DC("ComeAgain"));
    // FourIsland_PokemonDayCare_GiveMonToRaise, and "one more?" while there's room.
    const give = async () => {
      for (;;) {
        if (player.party.length === 1) { await say(DC("YouHaveJustOneMon")); return; }
        await say(DC("WhichMonShouldWeRaise"));
        const mine = await choosePartyFor("Choose a POKéMON.");
        show("world");
        if (!mine) { await comeAgain(); return; }
        if (!player.party.some((r) => r !== mine && !Party.isFainted(r))) { await say(DC("WhatWillYouBattleWith")); return; }
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
          const i = await multichoice(null, 15, 6, list.map((d) => Party.displayName(d.mon) + " Lv" + (d.mon.level + DayCare.levelsGained(d))).concat(["Exit"]));
          if (i < 0 || i >= list.length) { await comeAgain(); return; }
          dc = list[i];
        }
        const name = Party.displayName(dc.mon), cost = DayCare.cost(dc);
        if (!(await yesNo(DC("ItWillCostX"), [name, cost.toLocaleString("en-US")]))) { await comeAgain(); return; }
        if (player.money < cost) { await say(DC("NotEnoughMoney")); return; }
        Screen.say("");
        await Overworld.act([{ who: "LOCALID_FOUR_ISLAND_DAYCARE_WOMAN", moves: M("FourIsland_PokemonDayCare_Movement_RetrieveMon") }]);
        list.splice(list.indexOf(dc), 1);
        const mon = DayCare.withdraw(dc);
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
      const n = DayCare.levelsGained(dc);
      if (n) await say(DC("YourMonHasGrownXLevels"), [Party.displayName(dc.mon), String(n)]);
    }
    if (list.length === 1 && (await yesNo(DC("WeCanRaiseOneMore")))) { await give(); return; }
    if (await yesNo(DC("TakeYourMonBack"))) { await retrieve(); return; }
    await comeAgain();
  }
  async function fourIslandDayCareMan() {
    const list = player.flags.dayCare2 || [];
    if (!list.length) { await say(DC("ImDaycareManSpeakToMyWife")); return; }
    // (With two, FireRed adds how well they get on, which goes by the Egg
    // groups that decide whether an Egg turns up: there are none here.)
    await say(DC(list.length === 1 ? "YourMonIsDoingFine" : "YourMonsAreDoingFine"), list.map((d) => Party.displayName(d.mon)));
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
  // Pokémon. She asks you to take one of them on; beaten, he won't say where
  // they've taken the Pokémon until her Lapras makes him, then they run off:
  // the Rocket Warehouse on Five Island.
  async function icefallLorelei() {
    const f = player.flags, I = (k) => T("FourIsland_IcefallCave_Back_Text_" + k), Im = (k) => M("FourIsland_IcefallCave_Back_Movement_" + k);
    const L = "LOCALID_ICEFALL_LORELEI", R1 = "LOCALID_ICEFALL_ROCKET1", R2 = "LOCALID_ICEFALL_ROCKET2", R3 = "LOCALID_ICEFALL_ROCKET3";
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
    const id = "TRAINER_TEAM_ROCKET_GRUNT_45", data = window.WORLD_TRAINERS[id];
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(id), pic: data.pic },
      defeatText: I("GruntDefeat"), trainerId: id, prizeClass: data.className });
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

  // The Water Labyrinth's gentleman (FiveIsland_WaterLabyrinth_EventScript_EggGentleman):
  // a lead Pokémon as fond of you as can be, and he gives you the Egg he got
  // on his travels: Togepi. (This game has no Eggs: it hatches there and
  // then, a Lv. 5 Togepi, as FireRed's would.) After, he remembers Daisy
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
      await hatch(Party.create("Togepi", 5));
      // (Just given, FireRed's is still an Egg: he says how glad he is.)
      await say(E("GladIMetSomeoneLikeYou"));
      return;
    }
    const mine = player.party.find((r) => (r.species === "Togepi" || r.species === "Togetic") && r.ot && r.ot.id === player.trainerId);
    if (mine) await say(E("CuteMonRemindsMeOfDaisy"), ["", Party.speciesName(mine.species)]);
    else await say(E("GladIMetSomeoneLikeYou"));
  }
  // An Egg hatching (src/egg_hatch.c's words): "Oh?", the cry, "X hatched
  // from the EGG!" and a nickname.
  async function hatch(record) {
    Player.receive(player, record);
    const name = Party.speciesName(record.species);
    await say("Oh?");
    cry(record.species);
    await sayWithJingle("mus_evolved", name + " hatched from the Egg!");
    if (await confirm(fill("Would you like to nickname the newly hatched " + name + "?"))) {
      const typed = await enterText(name + "'s nickname?", name, 10);
      if (typed && typed !== name) record.nickname = typed;
      show("world");
    }
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
    if (!player.party.some((m) => m.species === r.species)) { await request(); return; }
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
    if (!player.party.some((r) => r.species === "Heracross")) { await say(H("LoveItNeedItHeracross")); return; }
    await say(H("MayIMeasureHeracross"));
    const r = await choosePartyFor("Choose a {PKMN}.");
    show("world");
    if (!r) return;
    if (r.species !== "Heracross") { await say(H("ThisWontDo")); return; }
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
      if (outcome === "won") { show("world"); await Overworld.resume(); return true; }
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
  // clock stops; the prize (once a challenge); your time, a record or not.
  async function towerOwner() {
    const f = player.flags, R = (k) => T("TrainerTower_Roof_Text_" + k);
    tick();
    const t = f.tower || TrainerTower.start(f, 0), rec = TrainerTower.records(f);
    t.running = false;
    const state = (t.spokeToOwner ? 1 : 0) + (rec.prize[t.mode] && t.checkedFinalTime ? 1 : 0);
    t.spokeToOwner = true;
    if (state < 2) {
      if (state === 0) await say(R("ImOwnerBattledPerfectly"));
      if (!rec.prize[t.mode]) {
        const item = TrainerTower.prize(t.mode);
        rec.prize[t.mode] = true;
        Player.addItem(player, item);
        await say(R("ThisIsForYou"));
        await sayWithJingle("mus_level_up", "{PLAYER} obtained the " + Bag.name(item) + "!");
      }
      const r = TrainerTower.finalTime(f);
      if (r === 0) await say(R("DoneItInRecordTime"));
      else if (r === 1) await say(R("TookSweetTimeGettingHere"));
    }
    await say(R("IdLikeToSeeBetterTime"));
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
    await Overworld.act([{ who: "player", moves: ["walk_down", "walk_down"] }]);
    towerCounterOpen = false;
    applyPatches("TrainerTower_Lobby");
    sfx("se_click");
  }

  // ---------- Cinnabar Island ----------

  // Blaine: battle (talking to him), then the Volcano Badge and TM38 Fire
  // Blast. Beating him also beats his Gym's trainers and opens all its doors.
  // Bill's then waiting outside to take you to the Sevii Islands
  // (VAR_MAP_SCENE_CINNABAR_ISLAND 1: flags.cinnabarScene).
  async function blaine(person) {
    const f = player.flags, ID = "TRAINER_LEADER_BLAINE";
    if (!f[ID]) {
      await say(person.trainer.intro);
      if (!canBattle()) return;
      const outcome = await battle("trainer", { foe: { name: "Leader Blaine", team: trainerTeam(ID), pic: "leader_blaine" },
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
    { item: "helix-fossil", species: "Omanyte", has: (f) => f.mtMoonFossil === "helix-fossil", flag: "revivedHelix" },
    { item: "dome-fossil", species: "Kabuto", has: (f) => f.mtMoonFossil === "dome-fossil", flag: "revivedDome" },
    { item: "old-amber", species: "Aerodactyl", has: (f) => !!f.gotOldAmber, flag: "revivedAmber" }
  ];
  async function fossilScientist() {
    const f = player.flags, X = (k) => T("CinnabarIsland_PokemonLab_ExperimentRoom_Text_" + k);
    const mtMoon = FOSSILS.slice(0, 2).find((fo) => fo.has(f));
    if (f.revivedAmber && mtMoon && f[mtMoon.flag]) { await say(X("YouComeAgain")); return; }
    const reviving = f.fossilRevive;
    if (reviving && reviving.ready) {
      const fo = FOSSILS.find((x) => x.item === reviving.item), name = Party.speciesName(fo.species);
      await say(X("FossilMonBackToLife"), [name]);
      const given = await giftMon(fo.species, 5, X("ReceivedMonFromDoctor"), [name], () => { f[fo.flag] = true; delete f.fossilRevive; });
      if (!given) return;
      return;
    }
    if (reviving) { await say(X("TakesTimeGoForWalk")); return; }
    const can = FOSSILS.filter((fo) => fo.has(f) && !f[fo.flag] && Player.itemCount(player, fo.item));
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
  function safariStep() {
    const s = player.flags.safari;
    if (!s || !/^SafariZone_/.test(player.location.map)) return null;
    s.steps = Math.max(0, s.steps - 1);
    return s.steps === 0 ? { type: "safari-over", text: "SafariZone_Text_TimesUp" } : null;
  }
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
      await Overworld.act([{ who: "player", moves: M("FuchsiaCity_SafariZone_Entrance_Movement_Exit") }]);
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
    await Overworld.act([{ who: "player", moves: M(walkIn ? "FuchsiaCity_SafariZone_Entrance_Movement_Exit2" : "FuchsiaCity_SafariZone_Entrance_Movement_Exit") }]);
  }
  // A wild Pokémon in the Safari Zone.
  async function safariBattle(species, level, terrain) {
    const outcome = await battle("wild", { foe: { name: "Wild", team: [Party.create(species, level)] }, terrain, safari: true });
    const s = player.flags.safari;
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
    if (map === "VermilionCity_Gym") {
      if (f.vermilionGymLocksOpen) return ["off"];
      if (gymCans && gymCans.foundFirst) return ["half"];
    }
    if (map === "CeladonCity_GameCorner" && !f.openedRocketHideout) return ["hidden"];
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
    if (map === "ThreeIsland_DunsparceTunnel") return Player.nationalDex(player) ? ["dugout"] : [];
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
  // Pikachu (24), Charmeleon, Wartortle and Ivysaur (25 each). The Captain,
  // seasick, gives you HM01 Cut once you've rubbed his back; the next time you
  // step out onto the dock, the ship sets sail and is gone.
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
    const team = [Party.create("Pikachu", 24), Party.create("Charmeleon", 25), Party.create("Wartortle", 25), Party.create("Ivysaur", 25)];
    const outcome = await battle("trainer", { foe: { name: "Pokémon Trainer Red", team, pic: "red" }, defeatText: ["…"] });
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
    if (a && b && OUTDOORS.includes(a.type) && !OUTDOORS.includes(b.type)) player.flags.escapeWarp = { map: from.map, x: from.x, y: from.y };
    // Into an elevator: its doors open back where you got in until you choose a floor.
    if (/_Elevator$/.test(to.map) && !/_Elevator$/.test(from.map)) setDynamicWarp({ map: from.map, x: from.x, y: from.y });
  }
  async function useEscapeRope() {
    const here = player.location && window.WORLD_MAPS[player.location.map];
    const to = player.flags.escapeWarp;
    if (!here || !here.allowEscaping || !to) { await message("Oak: " + player.name + "! This isn't the time to use that!"); return false; }
    Player.removeItem(player, "escape-rope");
    await message(player.name + " used the Escape Rope.");
    player.location = { map: to.map, x: to.x, y: to.y, facing: "down" };
    await persist();
    return true;
  }

  // ---------- Repels ----------
  //
  // For 100 / 200 / 250 steps, wild Pokémon weaker than the lead Pokémon (the
  // first that can battle) stay away (Gen 3: below its level).

  const REPEL_STEPS = { "repel": 100, "super-repel": 200, "max-repel": 250 };
  function repelStep() {
    if (!(player.repelSteps > 0)) return null;
    player.repelSteps--;
    return player.repelSteps === 0 ? { type: "repel-ended" } : null;
  }
  function repelAllows(wild) {
    if (!(player.repelSteps > 0)) return true;
    const lead = player.party.find((r) => !Party.isFainted(r));
    return !lead || wild.level >= lead.level;
  }
  async function useRepel(item) {
    if (player.repelSteps > 0) { await message("But the effects of a Repel lingered from earlier."); return; }
    Player.removeItem(player, item);
    player.repelSteps = REPEL_STEPS[item];
    player.flags.lastRepel = item;
    await message(player.name + " used the " + Bag.name(item) + ".");
  }
  // When a Repel wears off you're offered another of the same kind, if you
  // have one (as in Black and White).
  async function repelWoreOff() {
    const item = player.flags.lastRepel;
    if (!item || !Player.itemCount(player, item)) { await say("Repel's effect wore off…"); return; }
    if (await confirm("Repel's effect wore off… Would you like to use another " + Bag.name(item) + "? (" +
      Player.itemCount(player, item) + " left)")) await useRepel(item);
    await persist();
  }

  // ---------- Exploring ----------

  function special(script) {
    // Coming back into Pewter City: the Museum ticket was for one visit (FireRed's OnTransition).
    // Coming out of the Gym with the Boulder Badge, Leaf is waiting.
    // Prof. Oak's aide, then his test at the top of Pokémon Tower (this game's own).
    if (/^enter:/.test(script) && megaAideDue(script.slice(6))) return true;
    if ((script === "enter:PokemonTower_7F" || script === "Game_EventScript_MegaTower") && megaTowerDue()) return true;
    if (script === "enter:PewterCity") { player.flags.museumTicket = false; return leafPewterDue(); }
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
    // Back in the Pokémon Lab, a fossil you left with the doctor is ready.
    if (script === "enter:CinnabarIsland_PokemonLab_Entrance") {
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
        hiddenItem: (h) => !player.flags[h.flag], patches: mapPatches, extraPeople,
        canSurf: () => !!FieldMoves.user(player, "Surf"), strength: () => strengthOn,
        boulderFell: (def) => {
          // (3F's boulder through the hole: it's on 2F now.)
          if (def.flag === "FLAG_HIDE_VICTORY_ROAD_3F_BOULDER") LeagueRoad.dropBoulder(player.flags);
          else Seafoam.drop(player.flags, def);
        },
        boulderSwitch: (map, x, y) => tanobySwitch(map, x, y) || victoryRoadSwitch(map, x, y),
        // (The Tanoby Ruins' chambers are dark until the Tanoby Key's solved: EventScript_TryDarkenRuins.)
        weather: (map) => (Sevii.tanobyLocked(player.flags, map) ? "shade" : null),
        onAvatar: (mode) => music(avatarMusic(mode) || (window.WORLD_MAPS[player.location.map] || {}).music),
        onStep: () => {
          leftPallet(player.location.map); DayCare.step(player.flags.dayCare); DayCare.step(player.flags.dayCare2); vsSeekerStep(); friendshipStep();
          Sevii.resortStep(player.flags.resortRequest);   // (Selphy waiting to see a Pokémon)
          return icefallStep() || redForestStep() || leafVermilionStep() || jessieJamesStep() || safariStep() || cinnabarBillStep() || repelStep();
        }, allowWild: (mon) => !Sevii.tanobyLocked(player.flags, player.location.map) && repelAllows(mon),
        onMap: (m) => {
          if (m !== tempFlagsMap && m === "VermilionCity_Gym") hideVermilionSwitches();
          if (m !== "VermilionCity") ticketChecked = false;
          if (m !== tempFlagsMap) delete player.flags.vsRematch;   // (rematches last while you stay on the map)
          if (m !== tempFlagsMap) strengthOn = false;
          // (Flying, blacking out or teleporting out of the Safari Zone ends the
          // Safari Game: Overworld_ResetStateAfterFly and the like.)
          if (player.flags.safari && !/^SafariZone_/.test(m) && m !== SAFARI_GATE) delete player.flags.safari;
          // (And off Cycling Road: VAR_MAP_SCENE_ROUTE16 back to 0.)
          if (player.flags.cyclingRoad && !CYCLING_ROAD_MAPS.includes(m)) delete player.flags.cyclingRoad;
          // The Seafoam Islands' boulders and currents (Route20_OnTransition,
          // SeafoamIslands_B3F/B4F_OnTransition).
          if (m !== tempFlagsMap) { if (m === "Route20") Seafoam.route20(player.flags); Seafoam.transition(player.flags, m); }
          // The Sevii Islands' ON_TRANSITION scripts (game/sevii.js has the flags).
          if (m !== tempFlagsMap) { seviiTransition(m); capeBrinkJustTaught = false; moveManiacMet = false; icefallIce = {}; }
          // Route 23 puts Victory Road back as it was: barriers up, boulders back (Route23_OnTransition).
          if (m !== tempFlagsMap && m === "Route23") LeagueRoad.reset(player.flags);
          forgetTrainerSpots(m); clearTempFlags(m); applyPatches(m); visitSection(m);
          music(avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[m] || {}).music); }
      });
      if (ev.type === "menu") {
        await startMenu();
        if (fieldAction) { const act = fieldAction; fieldAction = null; await act(); }
      }
      else if (ev.type === "select") await useRegistered();
      else if (ev.type === "water") await surfPrompt();
      else if (ev.type === "waterfall") await waterfall();
      else if (ev.type === "repel-ended") await repelWoreOff();
      else if (ev.type === "red-forest") await redForest();
      else if (ev.type === "leaf-vermilion") await leafVermilion();
      else if (ev.type === "jessie-james") await jessieJames();
      else if (ev.type === "safari-over") await safariOver(ev.text, false);
      else if (ev.type === "wild") {
        if (!canBattle() && !safariOn()) continue;
        // Grass on routes; caves (and other maps) use their own scene.
        const here = window.WORLD_MAPS[player.location.map];
        // (On the water: FireRed's pond or sea.)
        const at = player.location, b = World.blockAt(at.map, at.x, at.y).behavior;
        const terrain = Overworld.avatar() === "surf" ? (b === 0x10 ? "pond" : "water")
          : here && ["route", "town", "city"].includes(here.type) ? "grass" : undefined;
        if (safariOn()) await safariBattle(ev.species, ev.level, terrain);
        // (The Tanoby Ruins' Unown: each slot's letter, sUnownLetterSlots.)
        else await battle("wild", { foe: { name: "Wild", team: [Party.create(ev.species, ev.level, { unown: Sevii.unownLetter(at.map, ev.slot) })] },
          terrain, ghost: towerGhost() });
      } else await story(ev);
      await persist();
    }
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
    lastTick = Date.now();
    await explore();
  }

  window.addEventListener("beforeunload", () => { if (player) { tick(); Save.write(player); } });

  window.Game = { get player() { return player; } };
  main();
})();
