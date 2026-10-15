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
  const money = (n) => "₽" + Math.floor(n).toLocaleString("en-US");
  const article = (word) => (/^[AEIOU]/i.test(word) ? "an " : "a ") + word;

  // ---------- Sound (ui/audio.js) ----------
  const GA = window.GameAudio;
  const music = (name) => { if (GA) GA.music(name); };
  const fanfare = (name) => (GA ? GA.fanfare(name) : Promise.resolve());
  const cry = (species, opts) => { if (GA) GA.cry(species, opts); };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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

  // ---------- Party cards ----------

  function bar(pct, cls) {
    return '<div class="bar ' + cls + '"><div style="width:' + Math.round(pct * 100) + '%"></div></div>';
  }
  const genderMark = (r) => (r.gender === "M" ? " ♂" : r.gender === "F" ? " ♀" : "");
  const statusTag = (r) => (r.status ? '<span class="status ' + r.status + '">' + r.status + "</span>" : "");
  const cloakName = (r) => (r.cloak ? r.cloak.charAt(0).toUpperCase() + r.cloak.slice(1) + " Cloak" : "");

  function partyCard(r, i, extra) {
    const max = Party.maxHp(r);
    const hpPct = r.hp / max;
    const hpClass = hpPct <= 0.2 ? "low" : hpPct <= 0.5 ? "mid" : "";
    return '<button type="button" class="card' + (Party.isFainted(r) ? " fainted" : "") + '" data-pick="' + i + '">' +
      spriteTag(r.species, Party.form(r), undefined, r.shiny) +
      '<div class="card-body">' +
        '<div class="card-top"><b>' + escapeHtml(Party.displayName(r)) + genderMark(r) + "</b>" +
          statusTag(r) + "<span>Lv" + r.level + "</span></div>" +
        bar(hpPct, "hp " + hpClass) +
        '<div class="card-hp">' + r.hp + " / " + max + "</div>" +
        bar(Party.expProgress(r), "exp") +
        (extra != null ? '<div class="card-note">' + extra + "</div>" :
          (r.item ? '<div class="card-moves">Holding ' + escapeHtml(Bag.name(r.item)) + "</div>" : "") +
          (r.cloak ? '<div class="card-moves">' + cloakName(r) + "</div>" : "") +
          '<div class="card-moves">' + r.moves.map((m) => escapeHtml(m.name)).join(" · ") + "</div>") +
      "</div></button>";
  }

  const partyHtml = (notes) => '<div class="party">' +
    player.party.map((r, i) => partyCard(r, i, notes ? notes[i] : null)).join("") + "</div>";

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
        save: p && { name: p.name, timeMs: p.playTimeMs, dex: p.flags.pokedex ? p.pokedex.caught.length : null, badges: p.badges.length },
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

  // kind: "wild" or "trainer". opts: { foe: { name, team }, noBlackout }
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

  async function battle(kind, opts) {
    opts = opts || {};
    const wild = kind === "wild";
    const foe = opts.foe || (wild ? { name: "Wild", team: [Encounters.wild(partyLevel())] } : Encounters.trainer(partyLevel()));
    if (!wild) for (const r of foe.team) delete r.shiny;   // trainers' Pokémon are never shiny
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
    const result = await BattleScreen.run({
      p1: { name: player.name, team: player.party.map((r) => Party.toBattleSet(r, here)) },
      p2: { name: foe.name, team: foe.team.map((r) => Party.toBattleSet(r)) },
      wild,
      exp: true,
      expShare: expShareOn(),
      trainer: Player.LOOKS[player.look].back,
      foeTrainer: foe.pic, defeatText: opts.defeatText && opts.defeatText.map((p) => fill(p)),
      victoryMusic: wild ? "mus_victory_wild" : leader ? "mus_victory_gym_leader" : "mus_victory_trainer",
      terrain: battleTerrain(opts),
      bag: player.bag,
      // (The Bag screen: its pockets, and the bag's colours.)
      bagPockets, bagFemale: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl),
      catchContext: { night: Evolution.timeOfDay() === "night", caughtBefore: (s) => Player.hasCaught(player, s) },
      opponent: wild ? randomMove : (b) => OpponentAI.choose(b, "p2"),
      // A new move with four known: the Summary screen picks the one to forget
      // (the record caught up with the battle first: level, moves, PP).
      forgetMove: (i, mon, move) => chooseMoveToForget(Party.syncFromBattle(player.party[i], mon), move),
      // The Summary screen from the party screen in battle: each Pokémon as it
      // is now (HP, status, PP, Exp.), from copies, so nothing changes.
      summary: (i, mons) => {
        const now = player.party.map((r, k) => (mons[k] ? Party.syncFromBattle(JSON.parse(JSON.stringify(r)), mons[k]) : r));
        cry(now[i].species);
        return SummaryScreen.open(now.map(summaryView), i, { frame: GameOptions.get().frame, cry: (sp) => cry(sp) });
      }
    });
    const b = result.battle;
    for (const e of b.events) {
      if ((e[0] === "switch" || e[0] === "drag") && String(e[1]).startsWith("p2")) Player.markSeen(player, String(e[2]).split(", L")[0]);
    }
    const leveledUp = [];
    player.party.forEach((record, i) => {
      const mon = b.sides.p1.pokemon[i];
      Party.syncFromBattle(record, mon);
      if (mon.leveledUp) leveledUp.push(record);
    });

    if (result.outcome === "won" && opts.trainerId) {
      player.flags[opts.trainerId] = true;
      if (player.flags.vsRematch) delete player.flags.vsRematch[opts.trainerId];
    }
    if (result.outcome === "won" && !wild) {
      const prize = opts.prize != null ? opts.prize : Player.prizeMoney(foe.name, foe.team);
      Player.addMoney(player, prize);
      await message("You got " + money(prize) + " for winning!");
    }
    if (result.outcome === "caught") await addCaught(Party.caught(foe.team[0], b.caught, ballUsed(b)));
    if ((result.outcome === "lost" || !canBattle()) && opts.noBlackout) {
      player.party.forEach(Party.heal);
    } else if (result.outcome === "lost" || !canBattle()) {
      await blackout();
    } else {
      for (const record of leveledUp) {
        const evo = Evolution.find(record, { trigger: "level", party: player.party });
        if (evo) await evolve(record, evo, true);
      }
    }
    await persist();
    return result.outcome;
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

  async function blackout() {
    await message("You have no more Pokémon that can fight!");
    const lost = Player.blackoutLoss(player);
    Player.addMoney(player, -lost);
    await message(lost ? "You panicked and dropped " + money(lost) + "..." : "You blacked out!");
    player.party.forEach(Party.heal);
    // Back to the last Pokémon Center you used, or home before you've used one.
    const center = player.flags.lastCenter && Player.CENTERS[player.flags.lastCenter];
    player.location = Object.assign({}, center || Player.HOME);
    show("scene");
    scene.innerHTML = partyHtml();
    await message(center ? "You scurried to a Pokémon Center, protecting your exhausted Pokémon from any further harm."
      : "You hurried to Red's house, and Red's Mom healed your Pokémon.");
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

  const KEY_ITEM_USES = ["exp-share", "town-map", "explorer-kit", "itemfinder", "vs-seeker", "bicycle"];
  // Key items Select can use (registered from the Bag, as in FireRed).
  const REGISTERABLE = ["bicycle", "itemfinder", "vs-seeker", "town-map"];
  const usableFromBag = (item) => Bag.isStone(item) || Bag.isMachine(item) || !!Bag.mintNature(item) ||
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
    if (item === "exp-share") {
      player.flags.expShareOff = !player.flags.expShareOff;
      await message(expShareOn() ? "The Exp. Share was turned on. Your whole party will gain Exp. Points from battles."
        : "The Exp. Share was turned off. Only Pokémon that battle will gain Exp. Points.");
    } else if (item === "town-map") await townMap();
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
  // Every 250 steps, each Pokémon in the party grows a little friendlier
  // (FireRed's UpdateFriendshipStepCounter is every 128 steps, half the time).
  const FRIENDSHIP_STEPS = 250;
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
  // to see its name.
  async function townMap(opts) {
    const T = window.TOWN_MAP, flying = !!(opts && opts.fly);
    const pct = (n, of) => (n / of * 100) + "%";
    const sprite = (x, y) => "left:" + pct(28 + 8 * x, 240) + ";top:" + pct(28 + 8 * y, 160);
    const cellOf = (sec) => {
      for (const layer of [T.map, T.dungeon]) for (let y = 0; y < T.height; y++) for (let x = 0; x < T.width; x++) if (layer[y][x] === sec) return [x, y];
      return null;
    };
    // (Somewhere with no square of its own, the Underground Path or the S.S. Anne:
    // where you came in from outdoors.)
    const here = cellOf(T.mapSections[player.location && player.location.map]) ||
      cellOf(T.mapSections[(player.flags.escapeWarp || {}).map]) || cellOf("PALLET_TOWN");
    let [cx, cy] = here;
    visitSection(player.location && player.location.map);
    // FireRed's small icons on the caves and forests (CreateDungeonIcons): lit
    // once you've been there. Cerulean Cave's shows only after the League, as
    // its entrance opens then. On a town's square the icon sits 2 pixels lower
    // and to the right.
    const visited = player.flags.visitedSections || [];
    let icons = "";
    for (let y = 0; y < T.height; y++) for (let x = 0; x < T.width; x++) {
      const sec = T.dungeon[y][x];
      if (!sec || (sec === "CERULEAN_CAVE" && !player.flags.hallOfFame)) continue;
      const off = T.towns.includes(T.map[y][x]) ? 2 : 0;
      icons += '<div class="tm-dungeon' + (visited.includes(sec) ? " visited" : "") + '" style="left:' + pct(32 + 8 * x + off, 240) +
        ";top:" + pct(32 + 8 * y + off, 160) + '"></div>';
    }
    // Fly's places: visited, with somewhere to land.
    const flyTo = (sec) => (flying && sec && visited.includes(sec) && (T.fly || {})[sec]) || null;
    if (flying) {
      const marked = new Set();
      for (let y = 0; y < T.height; y++) for (let x = 0; x < T.width; x++) {
        const sec = T.map[y][x];
        if (!flyTo(sec) || marked.has(sec)) continue;
        marked.add(sec);
        icons += '<div class="tm-fly" style="left:' + pct(32 + 8 * x, 240) + ";top:" + pct(32 + 8 * y, 160) + '"></div>';
      }
    }
    show("scene");
    scene.innerHTML = '<div class="town-map' + (flying ? " flying" : "") + '"><img class="tm-map" src="assets/town-map/kanto.png" alt="Map of Kanto">' + icons +
      '<div class="tm-name"><b></b><small></small></div>' +
      '<img class="tm-player" src="assets/town-map/player.png" alt="You are here" style="' + sprite(here[0], here[1]) + '">' +
      '<div class="tm-cursor"></div></div>';
    const box = scene.querySelector(".town-map");
    const draw = () => {
      const place = T.map[cy][cx], cave = T.dungeon[cy][cx];
      scene.querySelector(".tm-name b").textContent = T.names[place] || T.names[cave] || (flying ? "Where do you want to fly?" : "");
      scene.querySelector(".tm-name small").textContent = place && cave ? T.names[cave] : "";
      scene.querySelector(".tm-cursor").setAttribute("style", sprite(cx, cy));
    };
    draw();
    const move = (dx, dy) => { cx = Math.max(0, Math.min(T.width - 1, cx + dx)); cy = Math.max(0, Math.min(T.height - 1, cy + dy)); draw(); };
    let picked = null;
    const choose = new Promise((resolve) => { picked = resolve; });
    const onKey = (e) => {
      if (flying && ["z", "Z", " ", "Enter"].includes(e.key)) {
        e.preventDefault(); e.stopPropagation();
        const spot = flyTo(T.map[cy][cx]);
        if (spot) { sfx("se_select"); picked(spot); }
        return;
      }
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      move(d[0], d[1]);
    };
    document.addEventListener("keydown", onKey, true);
    // (no text over the map)
    const r = await Promise.race([ask("", [back(flying ? "Cancel" : "Close")]).then(() => null), choose]);
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
      evs: Object.assign({}, r.evs), ivs: Object.assign({}, r.ivs), nature: r.nature, happiness: r.happiness,
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

  // FireRed's Bag screen (ui/bag-screen.js), with this game's six pockets.
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

  async function pc() {
    const f = player.flags;
    for (;;) {
      Screen.say("Which PC should be accessed?");
      await Screen.printed();
      clearMenu();
      const items = [f.billHelped ? "Bill's PC" : "Someone's PC", player.name + "'s PC"]
        .concat(f.pokedex ? ["Prof. Oak's PC"] : [], ["Log off"]);
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
      } else {
        await say(["Accessed Prof. Oak's PC…", "Accessed the Pokédex Rating\nSystem…"]);
        if (await confirm("Would you like to have your\nPokédex rated?")) {
          await say("Prof. Oak: {PLAYER}, you've seen " + player.pokedex.seen.length + "\nPokémon, and caught " + player.pokedex.caught.length + "!");
        }
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
      cry: (sp) => cry(sp)
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
        "<dt>Pokédex</dt><dd>" + player.pokedex.caught.length + " caught, " + player.pokedex.seen.length + " seen</dd>" +
        "<dt>Badges</dt><dd>" + player.badges.length + "</dd>" +
        "<dt>Mining</dt><dd>Lv. " + Mining.level(miningXp()) + (Mining.toNext(miningXp()) == null ? " (max)"
          : " <small>(" + Mining.toNext(miningXp()) + " XP to the next level)</small>") + "</dd>" +
        "<dt>Play time</dt><dd>" + playTime(player.playTimeMs) + "</dd>" +
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
    exit: "Close this menu window."
  };
  async function startMenu() {
    player.flags.openedMenu = true;   // (FireRed's FLAG_OPENED_START_MENU: the Sign Lady's scene)
    for (;;) {
      show("world");
      Screen.say("");
      clearMenu();
      // POKéDEX once Prof. Oak has given you one, POKéMON once you have one.
      const items = [];
      if (player.flags.pokedex) items.push({ key: "dex", label: "Pokédex" });
      if (player.party.length) items.push({ key: "party", label: "Pokémon" });
      items.push({ key: "bag", label: "Bag" }, { key: "card", label: player.name }, { key: "save", label: "Save" },
        { key: "option", label: "Option" }, { key: "exit", label: "Exit" });
      for (const it of items) it.help = START_HELP[it.key];
      const r = await GbaMenus.startMenu($("#overlay"), { items, cursor: startCursor, frame: GameOptions.get().frame });
      startCursor = r.cursor;
      const v = r.key;
      if (v === "exit") return;
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
    "Route10_PokemonCenter_1F_EventScript_Nurse", "Route10_PokemonCenter_1F_EventScript_Aide", "RockTunnel_B1F_EventScript_RockSlideTutor"
  ].concat(Object.keys(STARTER_BALLS)).concat(Array.from({ length: 15 }, (_, i) => "VermilionCity_Gym_EventScript_TrashCan" + (i + 1))));

  // Which people are around, from FireRed's event flags and this game's story flags.
  // Item balls on the map: picked up once, then gone.
  const ITEM_BALLS = new Set();
  for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people) if (p.item) ITEM_BALLS.add(p.script);
  // Trainers: battle until beaten (a flag named for the trainer, as in FireRed).
  const TRAINER_SCRIPTS = new Set();
  for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people) if (p.trainer && p.trainer.id) TRAINER_SCRIPTS.add(p.script);
  // (or, signalled by the VS Seeker, want a rematch)
  const trainerWaiting = (person) => !!(person.trainer && person.trainer.id &&
    (!player.flags[person.trainer.id] || (player.flags.vsRematch && player.flags.vsRematch[person.trainer.id])));

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
    // Until Bill gives you the S.S. Ticket, the policeman stands in the
    // robbed house's doorway and Slowbro and the Lass are in the way south
    // (FireRed's CeruleanCity_EventScript_BlockExits).
    if (!f.gotSSTicket) {
      if (person.script === "CeruleanCity_EventScript_Policeman") return { x: 30, y: 12 };
      if (person.script === "CeruleanCity_EventScript_Slowbro") return { x: 26, y: 31 };
      if (person.script === "CeruleanCity_EventScript_Lass") return { x: 27, y: 31 };
    }
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
      case "FLAG_HIDE_VERMILION_CITY_OAKS_AIDE": return !!(f.TRAINER_LEADER_LT_SURGE && !f.gotFlash && !f.talkedToVermilionAide);  // in the robbed house's yard until he gives back TM28
      case "FLAG_HIDE_NUGGET_BRIDGE_ROCKET": return !f.gotSSTicket;
      // Bill: a Clefairy until you run his Cell Separator, then himself.
      case "FLAG_HIDE_BILL_CLEFAIRY": return !f.billHelped && !billInTeleporter;
      // (Where his walk out of the Teleporter ended, until you leave.)
      case "FLAG_HIDE_BILL_HUMAN_SEA_COTTAGE": return f.billHelped ? (billJustOut ? { x: 7, y: 6 } : true) : false;
      case "FLAG_HIDE_POSTGAME_GOSSIPERS": return false;
      case "FLAG_HIDE_DOME_FOSSIL": case "FLAG_HIDE_HELIX_FOSSIL": return !f.mtMoonFossil;
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
      sfx("se_pc_on");
      await say("{PLAYER} booted up the PC.");
      await pc();
      return;
    }
    if (ev.type === "trainer") { await trainerBattle(ev.person, ev.approach, ev.facing); return; }
    if (ev.type === "hidden") {
      const h = ev.hidden;
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
    if (script === "Game_EventScript_Leaf") {
      if (!canBattle()) return;
      if (ev.map === "PewterCity") await leafPewter(true); else await leafVermilion();
      return;
    }
    if (TRAINER_SCRIPTS.has(script)) {
      if (trainerWaiting(ev.person)) await trainerBattle(ev.person, null);
      else await say(ev.person.trainer.after || ev.person.text || []);
      return;
    }

    if (ev.person && ev.person.item) {
      const item = ev.person.item;
      Player.addItem(player, item);
      f[ev.person.flag] = true;
      Overworld.removePerson(ev.person);   // (just the ball: everyone else stays where they are)
      await sayWithJingle(itemJingle(item), "{PLAYER} found a " + Bag.name(item) + "!");
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

    const can = /^VermilionCity_Gym_EventScript_TrashCan(\d+)$/.exec(script);
    if (can) { await trashCan(+can[1]); return; }

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
      // Route23_EventScript_BadgeGuardTrigger and BadgeGuard).
      case "Route22_NorthEntrance_EventScript_BoulderBadgeGuardTrigger":
      case "Route22_NorthEntrance_EventScript_BoulderBadgeGuard": {
        const badge = ["Boulder Badge"], trigger = script.endsWith("Trigger");
        if (trigger && f.route23Guard) return;
        if (trigger) await Overworld.act([{ who: "#" + 0, moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
        if (hasBadge("boulder")) {
          await say(T("Text_OhThatsBadgeGoRightAhead"), badge);
          f.route23Guard = true;
        } else {
          await say(T("Text_OnlySkilledTrainersAllowedThrough"), badge);
          await say(T("Text_CantLetYouPass"));
          if (trigger) await Overworld.act([{ who: "player", moves: ["walk_down"] }, { who: "#0", moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
        }
        return;
      }

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
      // The guards in the gates to Saffron City are thirsty and turn you back
      // (FireRed lets you by once you bring them a drink; Saffron isn't here yet).
      case "Route5_SouthEntrance_EventScript_GuardTriggerLeft":
      case "Route5_SouthEntrance_EventScript_GuardTriggerMid":
      case "Route5_SouthEntrance_EventScript_GuardTriggerRight":
        await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
        await say(T("Route5_SouthEntrance_Text_ThirstyOnGuardDuty"));
        await Overworld.act([{ who: "player", moves: ["walk_up"] }]);
        return;
      case "Route6_NorthEntrance_EventScript_GuardTriggerLeft":
      case "Route6_NorthEntrance_EventScript_GuardTriggerMid":
      case "Route6_NorthEntrance_EventScript_GuardTriggerRight":
        await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
        await say(T("Route6_NorthEntrance_Text_ThirstyOnGuardDuty"));
        await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
        return;

      // ---------- Vermilion City ----------
      // The sailor at the pier checks for an S.S. Ticket (once, until you step back).
      case "VermilionCity_EventScript_CheckTicketLeft":
      case "VermilionCity_EventScript_CheckTicketRight":
        if (ticketChecked) return;
        if (f.ssAnneDeparted) {
          await Overworld.act([{ who: "LOCALID_VERMILION_FERRY_SAILOR", moves: M("Common_Movement_WalkInPlaceFasterLeft") },
            { who: "player", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
          await say(T("VermilionCity_Text_TheShipSetSail"));
          await Overworld.act([{ who: "player", moves: ["walk_up"] }]);
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
        const count = player.pokedex.caught.length;
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
        const count = player.pokedex.caught.length;
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
  async function trainerBattle(person, approach, facing) {
    const t = person.trainer, data = window.WORLD_TRAINERS[t.id];
    const who = "#" + person.id;
    music(data.music || "mus_encounter_boy");   // their "eyes meet" theme
    if (approach != null) {
      await Overworld.act([{ who, moves: ["emote_exclamation_mark"].concat(Array(approach).fill("walk_" + facing)) }]);
      await Overworld.act([{ who: "player", moves: ["face_" + World.OPPOSITE[facing]] }]);
    }
    await say(t.intro);
    if (!canBattle()) return;
    const team = trainerTeam(t.id);
    await battle("trainer", { foe: { name: data.className + " " + data.name, team, pic: data.pic }, defeatText: t.defeat, trainerId: t.id });
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
    msNido: { flag: "tradedMsNido", wants: "Nidoran-M", gives: "Nidoran-F", nickname: "Ms. Nido",
      ivs: { hp: 22, atk: 18, def: 25, spe: 19, spa: 15, spd: 22 }, ot: { name: "SAIGE", id: 63184 },
      text: { ask: "Trade_Text_DoYouHaveMonWantToTradeForMon", no: "Trade_Text_ThatsTooBad",
        wrong: "Trade_Text_ThisIsNoMon", thanks: "Trade_Text_ThanksYoureAPal", after: "Trade_Text_HowIsMyOldMon" } }
  };
  async function inGameTrade(trade) {
    const f = player.flags, vars = [trade.wants, trade.gives];
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
  async function moveTutor(move, flag, text, price) {
    const f = player.flags;
    if (f[flag] && !price) { await say(T(text + "Taught")); return; }
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
    await say(T(text + "Taught"));
  }

  // What the Route 4 tutors charge each time.
  const TUTOR_PRICE = 1000;

  // Prof. Oak's Aides (FireRed's Aide_EventScript_*): an item for so many kinds
  // of Pokémon caught.
  async function aideGift(o) {
    const f = player.flags, label = Bag.name(o.item), A = (k) => T(o.text + k), vars = () => [o.needed, label, player.pokedex.caught.length];
    if (f[o.flag]) { await say(A(o.explain), vars()); return; }
    const ask = A(o.ask);
    await say(ask.slice(0, -1), vars());
    if (!(await confirm(fill(ask[ask.length - 1], vars())))) { await say(T("Aide_Text_GetEnoughMonsComeBackForItem"), vars()); return; }
    if (player.pokedex.caught.length < o.needed) { await say(T("Aide_Text_HaventCaughtEnoughMonsForItem"), vars()); return; }
    await say(A("GreatHereYouGo"), vars());
    Player.addItem(player, o.item);
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
  function extraPeople(map) {
    const out = [];
    // The Tradeback Guy, upstairs in every Pokémon Center.
    if (/_PokemonCenter_2F$/.test(map)) {
      out.push(Object.assign({ id: 901, localId: "LOCALID_TRADEBACK_GUY", script: "Game_EventScript_TradebackGuy", x: 12, y: 5,
        movement: "face_down", text: null }, window.WORLD_SPRITES.tradeback));
    }
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
  }

  // The Bicycle (from the Bag, or Select once registered): on and off,
  // where the map allows cycling (FireRed's ItemUseOutOfBattle_Bike).
  async function bicycle() {
    const here = window.WORLD_MAPS[player.location.map] || {};
    const mode = Overworld.avatar();
    if (mode === "bike") { Overworld.setAvatar("walk"); return; }
    if (mode === "surf" || !here.cycling) { await say("Oak: " + player.name + "! This isn't the time to use that!"); return; }
    Overworld.setAvatar("bike");
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
    if (map === "VermilionCity_Gym") {
      if (player.flags.vermilionGymLocksOpen) return ["off"];
      if (gymCans && gymCans.foundFirst) return ["half"];
    }
    return [];
  }
  // Sets a map's collision for the patches on now (the rest as built).
  const baseCollision = {};
  function applyPatches(map) {
    const m = window.WORLD_MAPS[map];
    if (!m || !m.patches) return;
    const base = baseCollision[map] || (baseCollision[map] = m.collision.slice());
    for (const pt of Object.values(m.patches)) for (const [x, y] of pt.collision) m.collision[y * m.width + x] = base[y * m.width + x];
    for (const p of mapPatches(map)) for (const [x, y, c] of m.patches[p].collision) m.collision[y * m.width + x] = c;
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
    leftPallet(to.map);
    visitSection(to.map);
    const a = window.WORLD_MAPS[from.map], b = window.WORLD_MAPS[to.map];
    if (a && b && OUTDOORS.includes(a.type) && !OUTDOORS.includes(b.type)) player.flags.escapeWarp = { map: from.map, x: from.x, y: from.y };
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
    if (script === "enter:PewterCity") { player.flags.museumTicket = false; return leafPewterDue(); }
    // Walking into the Route 4 Pokémon Center makes it where you go after
    // blacking out (FireRed's setrespawn there).
    if (script === "enter:Route4_PokemonCenter_1F") { player.flags.lastCenter = "Route4_PokemonCenter_1F"; return false; }
    // (FireRed's FLAG_TEMP_2 and 3: Bill in the Teleporter, back after the ticket.)
    if (script === "enter:SSAnne_Exterior") return ssAnneDeparting();
    if (script === "enter:Route25_SeaCottage") { billInTeleporter = billJustOut = false; seaCottageReturn = !!player.flags.gotSSTicket; return false; }
    return SPECIAL.has(script) || ITEM_BALLS.has(script) || TRAINER_SCRIPTS.has(script);
  }

  async function explore() {
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
        trainerWaiting, hiddenItem: (h) => !player.flags[h.flag], patches: mapPatches, extraPeople,
        canSurf: () => !!FieldMoves.user(player, "Surf"), strength: () => strengthOn,
        onAvatar: (mode) => music(avatarMusic(mode) || (window.WORLD_MAPS[player.location.map] || {}).music),
        onStep: () => { leftPallet(player.location.map); DayCare.step(player.flags.dayCare); vsSeekerStep(); friendshipStep(); return redForestStep() || leafVermilionStep() || jessieJamesStep() || repelStep(); }, allowWild: repelAllows,
        onMap: (m) => {
          if (m !== tempFlagsMap && m === "VermilionCity_Gym") hideVermilionSwitches();
          if (m !== "VermilionCity") ticketChecked = false;
          if (m !== tempFlagsMap) delete player.flags.vsRematch;   // (rematches last while you stay on the map)
          if (m !== tempFlagsMap) strengthOn = false;
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
      else if (ev.type === "wild") {
        if (!canBattle()) continue;
        // Grass on routes; caves (and other maps) use their own scene.
        const here = window.WORLD_MAPS[player.location.map];
        // (On the water: FireRed's pond or sea.)
        const at = player.location, b = World.blockAt(at.map, at.x, at.y).behavior;
        const terrain = Overworld.avatar() === "surf" ? (b === 0x10 ? "pond" : "water")
          : here && ["route", "town", "city"].includes(here.type) ? "grass" : undefined;
        await battle("wild", { foe: { name: "Wild", team: [Party.create(ev.species, ev.level)] }, terrain });
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
