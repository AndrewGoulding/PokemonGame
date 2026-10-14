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
    });
  }

  const confirm = (text) => ask(text, [
    { label: "Yes", value: true, className: "action" }, { label: "No", value: false, className: "action" }
  ]);

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
      spriteTag(r.species, Party.form(r)) +
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

  function renderSprite(species, extraClass, form) {
    show("scene");
    scene.innerHTML = '<div class="spotlight">' + spriteTag(species, form,
      'class="big-sprite ' + (extraClass || "") + '" alt="' + escapeHtml(species) + '"') + "</div>";
    return scene.querySelector(".big-sprite");
  }

  const itemRow = (id, right, key) => '<button type="button" class="row" data-pick="' + (key || id) + '">' +
    (Bag.sprite(id) ? '<img src="' + Bag.sprite(id) + '" alt="">' : '<span class="no-sprite"></span>') +
    '<span class="row-main"><b>' + escapeHtml(Bag.name(id)) + "</b><small>" + escapeHtml(Bag.description(id)) + "</small></span>" +
    '<span class="row-right">' + right + "</span></button>";

  // ---------- Title / new game ----------

  async function title() {
    for (;;) {
      const saved = Save.read();
      if (saved.error) await message(saved.error);
      const p = saved.player;
      const html = '<div class="title"><h1>Pokémon Game</h1>' + (p ?
        '<div class="save-card"><b>' + escapeHtml(p.name) + "</b>" +
        '<div class="save-party">' + p.party.map((r) => spriteTag(r.species, Party.form(r))).join("") + "</div>" +
        "<div>Pokédex: " + p.pokedex.caught.length + " · Badges: " + p.badges.length +
        " · Time: " + playTime(p.playTimeMs) + "</div></div>" : "") + "</div>";
      const options = [];
      if (p) options.push({ label: "Continue", value: "continue", className: "action", wide: true });
      options.push({ label: "New game", value: "new", className: "action" });
      options.push({ label: "Load save file", value: "file", className: "action" });
      const v = await pick(p ? "Welcome back, " + p.name + "!" : "Welcome!", html, options);
      if (v === "continue") {
        player = p;
        for (const w of saved.warnings) await message(w);
        return;
      }
      if (v === "file") {
        const loaded = await loadSaveFile();
        if (loaded && (!p || await confirm("Replace the game saved in this browser with this file?"))) {
          player = loaded;
          await persist();
          return;
        }
        continue;
      }
      if (p && !(await confirm("Start a new game? Your saved game in this browser will be overwritten."))) continue;
      await newGame();
      return;
    }
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
    // From the map: FireRed's flash-and-slice into battle.
    if (!world.classList.contains("hidden")) await Overworld.battleTransition();
    show("field");
    const result = await BattleScreen.run({
      p1: { name: player.name, team: player.party.map(Party.toBattleSet) },
      p2: { name: foe.name, team: foe.team.map(Party.toBattleSet) },
      wild,
      exp: true,
      expShare: expShareOn(),
      trainer: Player.LOOKS[player.look].back,
      foeTrainer: foe.pic, defeatText: opts.defeatText && opts.defeatText.map((p) => fill(p)),
      terrain: battleTerrain(opts),
      bag: player.bag,
      catchContext: { night: Evolution.timeOfDay() === "night", caughtBefore: (s) => Player.hasCaught(player, s) },
      opponent: wild ? randomMove : (b) => OpponentAI.choose(b, "p2")
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

    if (result.outcome === "won" && opts.trainerId) player.flags[opts.trainerId] = true;
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

  async function evolve(record, evo, canStop) {
    const name = Party.displayName(record);
    const img = renderSprite(record.species, "", Party.form(record));
    await message("What? " + name + " is evolving!");
    img.classList.add("evolving");
    let stopped = false;
    if (canStop) {
      // As in FireRed, B stops it (A doesn't); the button is for touch and mouse.
      const stop = ask(name + " is evolving...", [{ label: "Stop (B)", value: true, className: "action", wide: true, bOnly: true }])
        .then(() => { stopped = true; });
      await Promise.race([stop, new Promise((r) => setTimeout(r, 3200))]);
      clearMenu();
    } else {
      await message(name + " is evolving...", 3200);
    }
    img.classList.remove("evolving");
    if (stopped) {
      await message("Huh? " + name + " stopped evolving!");
      return;
    }
    const oldSpecies = record.species;
    const shed = Evolution.shedinja(record);
    const newMoves = Evolution.evolve(record, evo.into, evo);
    renderSprite(record.species, "evolved", Party.form(record));
    await message("Congratulations! Your " + (record.nickname || Party.speciesName(oldSpecies)) + " evolved into " +
      Party.speciesName(record.species) + "!");
    Player.markCaught(player, record.species);
    for (const move of newMoves) await learnMove(record, move);
    if (shed && evo.into === "Ninjask" && player.party.length < Player.PARTY_SIZE && Player.removeItem(player, "poke-ball")) {
      Player.receive(player, shed);
      renderSprite("Shedinja");
      await message("Something appeared in the empty Poké Ball... It's Shedinja!");
    }
  }

  async function learnMove(record, move) {
    const name = Party.displayName(record);
    if (Party.teachMove(record, move)) {
      await message(name + " learned " + move + "!");
      return;
    }
    const slot = await window.Screen.learnMovePrompt(name, record.moves.map((m) => m.name), move);
    if (slot != null) Party.teachMove(record, move, slot);
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
      const newMoves = Bag.levelUp(record);
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
    const r = Bag.useOn(record, item, { move });
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

  // Party list for choosing who gets an item; notes say who can use it.
  async function choosePartyFor(text, item) {
    const note = (r) => (Bag.isMachine(item) && Party.knowsMove(r, Bag.machineMove(item)) ? "Learned"
      : Bag.canUseOn(r, item, { party: player.party }) ? "Able" : "Not able");
    const notes = item ? player.party.map(note) : null;
    const v = await pick(text, partyHtml(notes), [back()]);
    return v && v.pick != null ? player.party[+v.pick] : null;
  }

  const KEY_ITEM_USES = ["exp-share", "town-map", "explorer-kit"];
  const usableFromBag = (item) => Bag.isStone(item) || Bag.isMachine(item) || !!Bag.mintNature(item) ||
    item === "rare-candy" || !!ItemUse.effect(item) || KEY_ITEM_USES.includes(item) || item in REPEL_STEPS || item === "escape-rope";
  // TMs and HMs work like key items: they can't be held, tossed or sold.
  const holdable = (item) => !Bag.isBall(item) && !Bag.isMachine(item) && !Bag.isKeyItem(item);
  const expShareOn = () => Player.itemCount(player, "exp-share") > 0 && !player.flags.expShareOff;

  // Key items used from the bag: the Exp. Share switches on and off; the Town
  // Map shows where you are; the Explorer Kit digs in a cave wall (and closes
  // the bag afterwards, back to the map: "escaped").
  async function useKeyItem(item) {
    if (item === "explorer-kit") return (await explorerKit()) ? "escaped" : null;
    if (item === "exp-share") {
      player.flags.expShareOff = !player.flags.expShareOff;
      await message(expShareOn() ? "The Exp. Share was turned on. Your whole party will gain Exp. Points from battles."
        : "The Exp. Share was turned off. Only Pokémon that battle will gain Exp. Points.");
    } else if (item === "town-map") {
      const here = player.location && window.WORLD_MAPS[player.location.map];
      await message("Kanto. You are in " + (here ? here.title.split(" · ")[0] : "Kanto") + ".");
    }
  }

  // Diamond and Pearl's Underground digging (game/mining.js, ui/mining.js), in
  // any cave. Whatever is fully dug out goes in the bag, and counts toward your
  // mining level (flags.miningDug), which decides what can be buried.
  async function explorerKit() {
    const here = player.location && window.WORLD_MAPS[player.location.map];
    if (!here || here.type !== "underground") { await message("Oak: " + player.name + "! This isn't the time to use that!"); return false; }
    await message(player.name + " used the Explorer Kit and started digging into the wall…");
    show("scene");
    clearMenu();
    window.Screen.say("Tap a tile to dig. The Hammer digs wider but shakes the wall more. (Keys: arrows, Z to dig, X to switch tools.)");
    const f = player.flags, before = Mining.level(f.miningDug);
    const found = await MiningScreen.run(scene, Mining.create(Math.random, before, player.location.map));
    for (const id of found) {
      Player.addItem(player, id);
      await message(player.name + " obtained " + article(Bag.name(id)) + "!");
    }
    if (!found.length) await message("Nothing was dug up…");
    // Every treasure dug out counts toward your mining level.
    f.miningDug = (f.miningDug | 0) + found.length;
    const after = Mining.level(f.miningDug);
    if (after > before) await message("Your mining level rose to " + after + "! Rarer treasures may turn up now.");
    await persist();
    return true;
  }

  // ---------- Summary ----------

  const STAT_LABELS = { hp: "HP", atk: "Attack", def: "Defense", spa: "Sp. Atk", spd: "Sp. Def", spe: "Speed" };

  const sum = (o) => Object.keys(STAT_LABELS).reduce((t, k) => t + ((o || {})[k] | 0), 0);

  function summaryHtml(r) {
    const stats = Party.stats(r);
    const nature = NATURES[r.nature] || {};
    const E = Experience;
    const toNext = r.level >= 100 ? 0 : E.expForLevel(E.growthRate(r.species), r.level + 1) - r.exp;
    const types = DEX[r.species].types.join(" / ");
    return '<div class="summary">' +
      '<div class="summary-head">' + spriteTag(r.species, Party.form(r), 'class="summary-sprite" alt=""') +
        "<div><h2>" + escapeHtml(Party.displayName(r)) + genderMark(r) + " " + statusTag(r) + "</h2>" +
        "<div>Lv" + r.level + " · " + escapeHtml(Party.speciesName(r.species)) + " · " + types + "</div>" +
        "<div>" + escapeHtml(r.nature) + " nature · " + escapeHtml(r.ability) + "</div>" +
        "<div>Holding: " + (r.item ? escapeHtml(Bag.name(r.item)) : "nothing") + (r.cloak ? " · " + cloakName(r) : "") + "</div>" +
        "<div>HP " + r.hp + " / " + stats.hp + " · Exp. to next level: " + toNext.toLocaleString("en-US") + "</div>" +
        "<div>Caught in " + article(Bag.name(r.ball || "poke-ball")) + " · Friendship " + r.happiness + "</div>" +
      "</div></div>" +
      '<table class="stats"><tr><th></th><th>Stat</th><th>IVs</th><th>EVs</th></tr>' +
      Object.keys(STAT_LABELS).map((k) => "<tr><td>" + STAT_LABELS[k] +
        (nature.plus === k ? ' <span class="up">▲</span>' : nature.minus === k ? ' <span class="down">▼</span>' : "") +
        "</td><td>" + stats[k] + "</td><td" + ((r.ivs[k] | 0) === 31 ? ' class="max"' : "") + ">" + (r.ivs[k] | 0) +
        "</td><td>" + (r.evs[k] || 0) + "</td></tr>").join("") +
      '<tr class="total"><td>Total</td><td></td><td>' + sum(r.ivs) + "/186</td><td>" + sum(r.evs) + "/510</td></tr></table>" +
      '<div class="summary-moves">' + r.moves.map((m, i) => {
        const d = MOVES[m.name];
        return '<div class="move-card type-' + d.type + '" data-slot="' + i + '"><b>' + escapeHtml(m.name) + "</b><span>" + d.type + " · " +
          (d.cat === "Status" ? "Status" : d.cat + " " + (d.power || "—")) + " · PP " + m.pp + "/" + Party.maxPp(m) + "</span></div>";
      }).join("") + "</div>" +
      (r.moves.length > 1 ? '<p class="bag-line">Drag a move onto another to swap them (on a phone, press and hold first).</p>' : "") +
      "</div>";
  }

  async function summary(index) {
    for (;;) {
      const r = player.party[index];
      const options = [];
      if (index > 0) options.push({ label: "Make lead", value: "lead", className: "action" });
      options.push({ label: "Use item", value: "use", className: "action" });
      options.push({ label: "Give item", value: "give", className: "action" });
      if (r.item) options.push({ label: "Take item", value: "take", className: "action" });
      options.push(back());
      // Dragging one move onto another swaps them (the order in battle).
      let dropped;
      const moved = new Promise((resolve) => { dropped = resolve; });
      const picked = pick(Party.displayName(r) + "'s summary.", summaryHtml(r), options);
      const stop = draggableCards(scene.querySelector(".summary-moves"), (a, b) => dropped([a, b]), ".move-card");
      const v = await Promise.race([picked, moved]);
      stop();
      if (Array.isArray(v)) {
        const [a, b] = v;
        [r.moves[a], r.moves[b]] = [r.moves[b], r.moves[a]];
        await persist();
        continue;
      }
      if (v === "back" || (v && v.pick)) return;
      if (v === "lead") {
        player.party.unshift(player.party.splice(index, 1)[0]);
        await message(Party.displayName(r) + " now leads your party.");
        return;
      }
      if (v === "take") {
        const old = Bag.take(r);
        Player.addItem(player, old);
        await message("Took the " + Bag.name(old) + " from " + Party.displayName(r) + ".");
        continue;
      }
      const items = Object.keys(player.bag).filter((id) => (v === "use" ? usableFromBag(id) : holdable(id)));
      if (!items.length) { await message(v === "use" ? "You don't have anything to use." : "You don't have anything to give."); continue; }
      const choice = await pick(v === "use" ? "Use which item on " + Party.displayName(r) + "?" : "Give which item?",
        '<div class="rows">' + items.map((id) => itemRow(id, "×" + player.bag[id])).join("") + "</div>", [back()]);
      if (!choice || !choice.pick) continue;
      if (v === "use") await useItemOn(r, choice.pick);
      else await giveItem(r, choice.pick);
    }
  }

  // ---------- Bag ----------

  async function bagScreen() {
    let pocket = "Medicine";
    for (;;) {
      const order = (id) => (Bag.isMachine(id) ? Bag.machines().indexOf(id) : 0);
      const items = Object.keys(player.bag).filter((id) => Bag.pocket(id) === pocket)
        .sort((a, b) => order(a) - order(b) || Bag.name(a).localeCompare(Bag.name(b)));
      const html = '<div class="tabs">' + Bag.POCKETS.map((p) =>
        '<button type="button" class="tab' + (p === pocket ? " active" : "") + '" data-pick="tab:' + p + '">' + p + "</button>").join("") + "</div>" +
        '<div class="rows">' + (items.length ? items.map((id) => itemRow(id, Bag.isMachine(id) ? MOVES[Bag.machineMove(id)].type
          : id === "exp-share" ? (expShareOn() ? "On" : "Off") : Bag.isKeyItem(id) ? "" : "×" + player.bag[id], "item:" + id)).join("")
          : '<p class="empty">Nothing in this pocket.</p>') + "</div>";
      const v = await pick("Your bag. " + money(player.money), html, [back("Close bag")]);
      if (v === "back") return;
      const [kind, id] = v.pick.split(/:(.*)/);
      if (kind === "tab") { pocket = id; continue; }
      const options = [];
      if (usableFromBag(id)) options.push({ label: "Use", value: "use", className: "action" });
      if (holdable(id)) options.push({ label: "Give", value: "give", className: "action" });
      if (!Bag.isMachine(id) && !Bag.isKeyItem(id)) options.push({ label: "Toss", value: "toss", className: "action" });
      options.push(back());
      const state = id === "exp-share" ? (expShareOn() ? " (On)" : " (Off)") : "";
      const what = await ask(Bag.name(id) + state + ": " + Bag.description(id), options);
      if (what === "use" && Bag.isKeyItem(id)) { if ((await useKeyItem(id)) === "escaped") return "escaped"; }
      else if (what === "use" && id in REPEL_STEPS) await useRepel(id);
      else if (what === "use" && id === "escape-rope") { if (await useEscapeRope()) return "escaped"; }
      else if (what === "use") {
        const r = await choosePartyFor(Bag.isMachine(id) ? "Teach " + Bag.machineMove(id) + " to which Pokémon?"
          : "Use the " + Bag.name(id) + " on which Pokémon?", id);
        if (r) await useItemOn(r, id);
      } else if (what === "give") {
        const r = await choosePartyFor("Give the " + Bag.name(id) + " to which Pokémon?");
        if (r) await giveItem(r, id);
      } else if (what === "toss") {
        const n = await chooseQuantity("Toss how many?", player.bag[id]);
        if (n && await confirm("Throw away " + n + " × " + Bag.name(id) + "?")) {
          Player.removeItem(player, id, n);
          await message("Threw away " + n + " × " + Bag.name(id) + ".");
        }
      }
      await persist();
    }
  }

  async function chooseQuantity(text, max, unitPrice) {
    const counts = [1, 5, 10, 25].filter((n) => n < max);
    const label = (n) => "×" + n + (unitPrice ? "  " + money(n * unitPrice) : "");
    const options = counts.map((n) => ({ label: label(n), value: n }));
    if (max > 0) options.push({ label: "All " + label(max).slice(1), value: max });
    options.push(back("Cancel"));
    const v = await ask(text, options);
    return v === "back" ? 0 : v;
  }

  // ---------- Poké Mart ----------

  // A Poké Mart, selling `stock` (its FireRed list of item ids).
  async function mart(stock) {
    for (;;) {
      const v = await pick("Welcome to the Poké Mart! How may I serve you?",
        '<div class="spotlight mart-sign"><b>POKé MART</b><div>' + money(player.money) + "</div></div>",
        [{ label: "Buy", value: "buy", className: "action" }, { label: "Sell", value: "sell", className: "action" }, back("Leave")]);
      if (v === "back") { await message("Please come again!"); return; }
      if (v === "buy") await martBuy(stock);
      else await martSell();
      await persist();
    }
  }

  async function martBuy(items) {
    const all = Bag.martStock(items);
    const hasMachines = all.some((x) => Bag.isMachine(x.item));
    let tab = "Items";
    for (;;) {
      const stock = all.filter((x) => (tab === "TMs & HMs") === Bag.isMachine(x.item));
      const owned = (id) => Player.itemCount(player, id) > 0;
      const tabs = hasMachines ? '<div class="tabs">' + ["Items", "TMs & HMs"].map((t) =>
        '<button type="button" class="tab' + (t === tab ? " active" : "") + '" data-pick="tab:' + t + '">' + t + "</button>").join("") + "</div>" : "";
      const html = tabs +
        '<div class="rows">' + (stock.length ? stock.map((x) => itemRow(x.item, money(x.price) + "<small>" +
          (Bag.isMachine(x.item) ? (owned(x.item) ? "Owned" : MOVES[Bag.machineMove(x.item)].type) : "In bag: " + Player.itemCount(player, x.item)) +
          "</small>")).join("") : '<p class="empty">Nothing for sale.</p>') +
        '</div><p class="bag-line">You have ' + money(player.money) + ".</p>";
      const v = await pick("What would you like to buy?", html, [back()]);
      if (v === "back") return;
      if (v.pick.startsWith("tab:")) { tab = v.pick.slice(4); continue; }
      const item = v.pick, price = Bag.price(item);
      if (Bag.isMachine(item) && owned(item)) { await message("You already have that " + Bag.name(item).split(" ")[0] + ". TMs and HMs never run out."); continue; }
      const max = Bag.isMachine(item) ? Math.min(1, Math.floor(player.money / price)) : Math.min(99, Math.floor(player.money / price));
      if (!max) { await message("You don't have enough money."); continue; }
      const n = Bag.isMachine(item) ? 1 : await chooseQuantity(Bag.name(item) + "? Certainly. How many would you like?", max, price);
      if (!n) continue;
      if (!(await confirm(n + " × " + Bag.name(item) + "? That will be " + money(n * price) + ". OK?"))) continue;
      Player.addMoney(player, -n * price);
      Player.addItem(player, item, n);
      await message("Here you are! Thank you!");
      if (item === "poke-ball" && n >= 10) {
        Player.addItem(player, "premier-ball");
        await message("You also get a Premier Ball as an added bonus.");
      }
    }
  }

  async function martSell() {
    for (;;) {
      const items = Object.keys(player.bag).filter((id) => Bag.sellPrice(id) > 0 && !Bag.isMachine(id));
      if (!items.length) { await message("You don't have anything I can buy."); return; }
      const v = await pick("What would you like to sell?", '<div class="rows">' +
        items.map((id) => itemRow(id, money(Bag.sellPrice(id)) + "<small>×" + player.bag[id] + "</small>")).join("") + "</div>", [back()]);
      if (v === "back") return;
      const item = v.pick;
      const n = await chooseQuantity("How many " + Bag.name(item) + " would you like to sell?", player.bag[item], Bag.sellPrice(item));
      if (!n || !(await confirm("I can pay " + money(n * Bag.sellPrice(item)) + ". Would that be OK?"))) continue;
      Player.removeItem(player, item, n);
      Player.addMoney(player, n * Bag.sellPrice(item));
      await message("Turned over the " + Bag.name(item) + " and received " + money(n * Bag.sellPrice(item)) + ".");
    }
  }

  // ---------- PC ----------

  // A PC: Pokémon storage (Bill's PC) and item storage (your own PC).
  async function pc() {
    for (;;) {
      const v = await ask("Which PC should be accessed?", [
        { label: "Bill's PC", value: "boxes", className: "action" },
        { label: player.name + "'s PC", value: "items", className: "action" },
        back("Log off")]);
      if (v === "back") return;
      if (v === "boxes") await pokemonStorage();
      else await itemStorage();
    }
  }

  // Redraws the list just picked from, so what was moved goes right away.
  function showItems(items, empty) {
    const ids = Object.keys(items).filter((id) => items === player.pcItems || (!Bag.isMachine(id) && !Bag.isKeyItem(id)));
    scene.innerHTML = '<div class="rows">' + (ids.length ? ids.map((id) => itemRow(id, "×" + items[id])).join("")
      : '<p class="empty">' + empty + "</p>") + "</div>";
  }

  async function itemStorage() {
    for (;;) {
      const stored = Object.keys(player.pcItems).length;
      const v = await ask("What would you like to do?", [
        { label: "Withdraw item", value: "withdraw", className: "action" },
        { label: "Deposit item", value: "deposit", className: "action" },
        { label: "Toss item", value: "toss", className: "action" },
        back("Log off")]);
      if (v === "back") return;
      if (v === "deposit") {
        const items = Object.keys(player.bag).filter((id) => !Bag.isMachine(id) && !Bag.isKeyItem(id));
        if (!items.length) { await message("There are no items in your bag to store."); continue; }
        const p = await pick("What would you like to deposit?", '<div class="rows">' +
          items.map((id) => itemRow(id, "×" + player.bag[id])).join("") + "</div>", [back()]);
        if (p === "back") continue;
        const n = player.bag[p.pick] > 1 ? await chooseQuantity("Deposit how many?", player.bag[p.pick]) : 1;
        if (!n) continue;
        Player.depositItem(player, p.pick, n);
        showItems(player.bag, "Nothing left in your bag to store.");
        await message("Stored " + n + " × " + Bag.name(p.pick) + " in the PC.");
      } else {
        if (!stored) { await message("There are no items stored in the PC."); continue; }
        const p = await pick(v === "toss" ? "What would you like to toss?" : "What would you like to withdraw?", '<div class="rows">' +
          Object.keys(player.pcItems).map((id) => itemRow(id, "×" + player.pcItems[id])).join("") + "</div>", [back()]);
        if (p === "back") continue;
        const have = player.pcItems[p.pick];
        const n = have > 1 ? await chooseQuantity((v === "toss" ? "Toss" : "Withdraw") + " how many?", have) : 1;
        if (!n) continue;
        if (v === "toss") {
          if (!(await confirm("Throw away " + n + " × " + Bag.name(p.pick) + "?"))) continue;
          player.pcItems[p.pick] -= n;
          if (player.pcItems[p.pick] <= 0) delete player.pcItems[p.pick];
          showItems(player.pcItems, "No items stored in the PC.");
          await message("Threw away " + n + " × " + Bag.name(p.pick) + ".");
        } else {
          Player.withdrawItem(player, p.pick, n);
          showItems(player.pcItems, "No items stored in the PC.");
          await message("Withdrew " + n + " × " + Bag.name(p.pick) + ".");
        }
      }
      await persist();
    }
  }

  async function pokemonStorage() {
    let box = 0;
    for (;;) {
      const slots = player.boxes[box];
      const mini = (r, key) => '<button type="button" class="mini' + (Party.isFainted(r) ? " fainted" : "") + '" data-pick="' + key + '" title="' +
        escapeHtml(Party.displayName(r)) + " Lv" + r.level + '">' + spriteTag(r.species, Party.form(r)) +
        "<span>" + escapeHtml(Party.displayName(r)) + "</span><small>Lv" + r.level + "</small></button>";
      const html = '<div class="pc"><section><h3>Party</h3><div class="pc-grid">' +
        player.party.map((r, i) => mini(r, "party:" + i)).join("") + "</div></section>" +
        "<section><h3>Box " + (box + 1) + " <small>(" + slots.length + "/" + Player.BOX_SIZE + ")</small></h3>" +
        '<div class="pc-grid">' + (slots.length ? slots.map((r, i) => mini(r, "box:" + i)).join("") : '<p class="empty">This box is empty.</p>') +
        "</div></section></div>";
      const v = await pick("Bill's PC. Choose a Pokémon to move it.", html, [
        { label: "◀ Box " + (((box + Player.BOX_COUNT - 1) % Player.BOX_COUNT) + 1), value: "prev", className: "action" },
        { label: "Box " + (((box + 1) % Player.BOX_COUNT) + 1) + " ▶", value: "next", className: "action" },
        back("Log off")
      ]);
      if (v === "back") return;
      if (v === "prev") { box = (box + Player.BOX_COUNT - 1) % Player.BOX_COUNT; continue; }
      if (v === "next") { box = (box + 1) % Player.BOX_COUNT; continue; }
      const [where, iStr] = v.pick.split(":");
      const i = +iStr;
      if (where === "party") {
        const r = player.party[i];
        const what = await ask(Party.displayName(r) + "?", [
          { label: "Deposit in Box " + (box + 1), value: "deposit", className: "action" },
          { label: "Summary", value: "summary", className: "action" }, back()]);
        if (what === "deposit") {
          const err = Player.deposit(player, i, box);
          await message(err || Party.displayName(r) + " was stored in Box " + (box + 1) + ".");
        } else if (what === "summary") await summary(i);
      } else {
        const r = slots[i];
        const what = await ask(Party.displayName(r) + "?", [
          { label: "Withdraw", value: "withdraw", className: "action" },
          { label: "Release", value: "release", className: "action" }, back()]);
        if (what === "withdraw") {
          const err = Player.withdraw(player, box, i);
          await message(err || Party.displayName(r) + " joined your party.");
        } else if (what === "release" && await confirm("Release " + Party.displayName(r) + "? You won't see it again.")) {
          const released = Player.release(player, box, i);
          if (released && released.item) Player.addItem(player, released.item);
          await message(Party.displayName(r) + " was released outside. Bye-bye, " + Party.displayName(r) + "!");
        }
      }
      await persist();
    }
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
    const typed = new Promise((resolve) => scene.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.stopPropagation(); resolve("ok"); } }));
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
      '<label class="name-entry">Level<input id="debug-level" type="number" min="1" max="100" value="50"></label></div>';
    const input = $("#debug-species");
    for (;;) {
      const typed = new Promise((resolve) => scene.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.stopPropagation(); resolve("add"); } }));
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
      const record = Party.create(species, level);
      const where = Player.receive(player, record);
      if (!where) { await message("Your party and PC boxes are full."); continue; }
      await message(species + " (Lv" + level + ") was added to " + (where === "party" ? "your party." : where.replace("box", "Box") + " in the PC."));
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

  async function pokedex() {
    for (;;) {
      const seen = new Set(player.pokedex.seen.map((s) => DEX[s].id));
      const caught = new Set(player.pokedex.caught.map((s) => DEX[s].id));
      const html = '<p class="dex-counts">Seen: <b>' + seen.size + "</b> · Caught: <b>" + caught.size + "</b> of " + dexList().length + "</p>" +
        '<div class="dex">' + dexList().map((e) => {
          const num = "#" + String(e.id).padStart(3, "0");
          if (!seen.has(e.id)) return '<div class="dex-entry unseen"><span>' + num + "</span>?</div>";
          return '<button type="button" class="dex-entry' + (caught.has(e.id) ? " caught" : " seen") + '" data-pick="' + e.species + '">' +
            "<span>" + num + "</span>" + spriteTag(e.species, "", 'loading="lazy" alt=""') +
            "<small>" + window.Screen.ballIcon(caught.has(e.id)) + escapeHtml(Party.speciesName(e.species)) + "</small></button>";
        }).join("") + "</div>";
      const v = await pick("Pokédex. Tap a Pokémon for its entry.", html, [back("Close")]);
      if (v === "back") return;
      const d = DEX[v.pick];
      await message("#" + String(d.id).padStart(3, "0") + " " + Party.speciesName(v.pick) + ": " + d.types.join("/") + " type. " +
        "Height " + d.height + " m, weight " + d.weight + " kg." + (Player.hasCaught(player, v.pick) ? "" : " (Seen, not caught.)"), 2500);
    }
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
        "<dt>Mining</dt><dd>Lv. " + Mining.level(player.flags.miningDug) + (Mining.toNext(player.flags.miningDug) == null ? " (max)"
          : " <small>(" + Mining.toNext(player.flags.miningDug) + " more treasures to the next level)</small>") + "</dd>" +
        "<dt>Play time</dt><dd>" + playTime(player.playTimeMs) + "</dd>" +
        "<dt>Started</dt><dd>" + new Date(player.createdAt).toLocaleDateString() + "</dd>" +
        "<dt>Last saved</dt><dd>" + (player.savedAt ? new Date(player.savedAt).toLocaleString() : "never") + "</dd></dl>" +
        '<p class="bag-line">The game saves automatically in this browser. Download a save file as a backup, or to move your game to another browser.</p></div>';
      const v = await pick("Your trainer card.", html, [
        { label: "Save now", value: "save", className: "action" },
        { label: "Download save file", value: "download", className: "action" },
        { label: "Load save file", value: "load", className: "action" },
        back()]);
      if (v === "back") return;
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

  // ---------- Start menu ----------

  async function partyMenu() {
    for (;;) {
      if (!player.party.length) { await message("You don't have any Pokémon yet."); return; }
      const v = await pickParty("Choose a Pokémon.", partyHtml() +
        '<p class="bag-line">Tap a Pokémon for its summary. Drag one onto another to swap them' +
        " (on a phone, press and hold first).</p>", [back("Close")]);
      if (v === "back") return;
      if (v === "swapped") continue;
      await summary(+v.pick);
    }
  }

  // pick() for screens showing the party cards: dragging one card onto another
  // swaps those Pokémon (and resolves "swapped" so the screen redraws).
  async function pickParty(text, html, options) {
    let dropped;
    const moved = new Promise((resolve) => { dropped = resolve; });
    const picked = pick(text, html, options);
    const cards = scene.querySelector(".party");
    const stop = cards ? draggableCards(cards, (from, to) => dropped([from, to])) : () => {};
    const v = await Promise.race([picked, moved]);
    stop();
    if (Array.isArray(v)) {
      const [a, b] = v;
      [player.party[a], player.party[b]] = [player.party[b], player.party[a]];
      await persist();
      return "swapped";
    }
    return v;
  }

  // Drag a party card onto another to swap them. With a mouse or pen the drag
  // starts once the pointer moves a little; on touch you press and hold first,
  // so ordinary swipes still scroll. A drag doesn't count as a tap. Returns a
  // function that removes the listeners.
  function draggableCards(container, onSwap, selector) {
    selector = selector || ".card";
    const slot = (card) => +(card.dataset.slot != null ? card.dataset.slot : card.dataset.pick);
    const HOLD_MS = 300, START_PX = 8;
    let drag = null, swallowClick = false;
    const cardAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const card = el && el.closest(selector);
      return card && container.contains(card) ? card : null;
    };
    const clearTargets = () => container.querySelectorAll(".drop-target").forEach((c) => c.classList.remove("drop-target"));
    const begin = () => { drag.active = true; drag.card.classList.add("dragging"); container.classList.add("reordering"); };
    const end = () => {
      if (!drag) return;
      clearTimeout(drag.timer);
      drag.card.classList.remove("dragging", "held");
      drag.card.style.transform = "";
      container.classList.remove("reordering");
      clearTargets();
      drag = null;
    };
    const press = (target, x, y, touch) => {
      swallowClick = false;   // a new touch or click: whatever came before is done
      const card = target.closest && target.closest(selector);
      if (!card || !container.contains(card)) return;
      drag = { card, from: slot(card), x, y, active: false, touch, timer: null };
      if (touch) drag.timer = setTimeout(() => { if (drag) { drag.card.classList.add("held"); begin(); } }, HOLD_MS);
    };
    // Returns true while a drag is under way (so the caller can stop scrolling).
    const moveTo = (x, y) => {
      if (!drag) return false;
      const dx = x - drag.x, dy = y - drag.y;
      if (!drag.active) {
        if (Math.hypot(dx, dy) < START_PX) return false;
        if (drag.touch) {                           // moved before the hold: it's a scroll, not a tap
          end();
          swallowClick = true;
          setTimeout(() => { swallowClick = false; }, 600);
          return false;
        }
        begin();
      }
      drag.card.style.transform = "translate(" + dx + "px, " + dy + "px)";
      clearTargets();
      const over = cardAt(x, y);
      if (over && over !== drag.card) over.classList.add("drop-target");
      return true;
    };
    const release = (x, y) => {
      if (!drag) return;
      const d = drag;
      if (!d.active) { end(); return; }
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 0);
      const over = cardAt(x, y);
      end();
      if (over && over !== d.card) onSwap(d.from, slot(over));
    };

    // Mouse and pen.
    const down = (e) => { if (e.pointerType !== "touch" && e.button === 0) press(e.target, e.clientX, e.clientY, false); };
    const move = (e) => { if (e.pointerType !== "touch" && moveTo(e.clientX, e.clientY)) e.preventDefault(); };
    const up = (e) => { if (e.pointerType !== "touch") release(e.clientX, e.clientY); };
    // Touch, with its own events: they let a held drag stop the page scrolling.
    const tStart = (e) => { if (e.touches.length === 1) press(e.target, e.touches[0].clientX, e.touches[0].clientY, true); };
    const tMove = (e) => { if (drag && e.touches.length === 1 && moveTo(e.touches[0].clientX, e.touches[0].clientY)) e.preventDefault(); };
    const tEnd = (e) => { const t = e.changedTouches[0]; if (t) release(t.clientX, t.clientY); else end(); };
    const click = (e) => { if (swallowClick) { e.stopPropagation(); e.preventDefault(); swallowClick = false; } };
    // Pictures and text in a card mustn't start the browser's own drag or menu.
    const noNative = (e) => e.preventDefault();
    const noMenu = (e) => { if (drag) e.preventDefault(); };

    container.addEventListener("pointerdown", down);
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    container.addEventListener("touchstart", tStart, { passive: true });
    document.addEventListener("touchmove", tMove, { passive: false });
    document.addEventListener("touchend", tEnd);
    document.addEventListener("touchcancel", end);
    container.addEventListener("click", click, true);
    container.addEventListener("dragstart", noNative);
    container.addEventListener("contextmenu", noMenu);
    return () => {
      end();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("touchmove", tMove);
      document.removeEventListener("touchend", tEnd);
      document.removeEventListener("touchcancel", end);
    };
  }

  async function startMenu() {
    for (;;) {
      // Tapping a Pokémon card opens its summary; dragging swaps two.
      const v = await pickParty("Menu", (player.party.length ? partyHtml() : '<p class="empty">No Pokémon yet. Prof. Oak’s lab is south of your house.</p>') +
        '<p class="bag-line">' + escapeHtml(player.name) + " · " + money(player.money) +
        (player.flags.pokedex ? " · Pokédex " + player.pokedex.caught.length : "") + "</p>", [
        { label: "Pokémon", value: "party", className: "action" },
        { label: "Bag", value: "bag", className: "action" },
        // Only once Prof. Oak has given you one, as in FireRed.
        ...(player.flags.pokedex ? [{ label: "Pokédex", value: "dex", className: "action" }] : []),
        { label: "Trainer card", value: "card", className: "action" },
        { label: "Save", value: "save", className: "action" },
        { label: "Debug", value: "debug", className: "action" },
        back("Close")]);
      if (v === "back") return;
      if (v === "swapped") continue;
      if (v.pick != null) await summary(+v.pick);
      else if (v === "party") await partyMenu();
      else if (v === "bag") { if ((await bagScreen()) === "escaped") return; }
      else if (v === "dex") await pokedex();
      else if (v === "card") await trainerCard();
      else if (v === "debug") { if ((await debugMenu()) === "battled") return; }
      else if (v === "save") {
        tick();
        const r = Save.write(player);
        await message(r.ok ? player.name + " saved the game." : r.error);
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
    "MtMoon_B2F_EventScript_DomeFossil", "MtMoon_B2F_EventScript_HelixFossil"
  ].concat(Object.keys(STARTER_BALLS)));

  // Which people are around, from FireRed's event flags and this game's story flags.
  // Item balls on the map: picked up once, then gone.
  const ITEM_BALLS = new Set();
  for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people) if (p.item) ITEM_BALLS.add(p.script);
  // Trainers: battle until beaten (a flag named for the trainer, as in FireRed).
  const TRAINER_SCRIPTS = new Set();
  for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people) if (p.trainer && p.trainer.id) TRAINER_SCRIPTS.add(p.script);
  const trainerWaiting = (person) => !!(person.trainer && person.trainer.id && !player.flags[person.trainer.id]);

  function visible(person) {
    const f = player.flags;
    if (person.item) return !f[person.flag];
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
      await say("{PLAYER} booted up the PC.");
      await pc();
      return;
    }
    if (ev.type === "trainer") { await trainerBattle(ev.person, ev.approach, ev.facing); return; }
    if (ev.type === "hidden") {
      const h = ev.hidden;
      Player.addItem(player, h.item, h.quantity);
      player.flags[h.flag] = true;
      await say("{PLAYER} found " + (h.quantity > 1 ? h.quantity + " " : "a ") + Bag.name(h.item) + "!");
      return;
    }
    const script = (ev.person || ev.sign || ev.trigger).script;
    const f = player.flags;

    if (script === "PewterCity_Gym_EventScript_Brock") { await brock(ev.person); return; }
    if (TRAINER_SCRIPTS.has(script)) {
      if (trainerWaiting(ev.person)) await trainerBattle(ev.person, null);
      else await say(ev.person.trainer.after || ev.person.text || []);
      return;
    }

    if (ev.person && ev.person.item) {
      const item = ev.person.item;
      Player.addItem(player, item);
      f[ev.person.flag] = true;
      Overworld.refreshPeople();
      await say("{PLAYER} found a " + Bag.name(item) + "!");
      return;
    }

    if (STARTER_BALLS[script]) {
      const ball = STARTER_BALLS[script];
      if (f.starter) { await say("That's Prof. Oak's last Pokémon."); return; }
      if (!f.oakInLab) { await say(T("PalletTown_ProfessorOaksLab_Text_ThoseArePokeBalls")); return; }
      showPicture(ball.species);
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

    switch (script) {
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
        player.party.forEach(Party.heal);
        await say("Red's Mom: There! You and your Pokémon\nare looking great. Take care now!");
        return;

      case "PalletTown_PlayersHouse_2F_EventScript_PC":
        // Your own PC at home holds items, as in FireRed.
        await say("{PLAYER} booted up the PC.");
        await itemStorage();
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
        await say(T("Text_MayIHelpYou"));
        await mart(ev.person.mart);
        return;

      case "ViridianCity_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map);
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
        await say(T("Text_MayIHelpYou"));
        await mart(ev.person.mart);
        return;

      case "PewterCity_PokemonCenter_1F_EventScript_Nurse":
        await nurse(ev.map);
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
        await nurse(ev.map);
        return;

      // ₽500 for a Magikarp, once.
      case "Route4_PokemonCenter_1F_EventScript_MagikarpSalesman": {
        if (f.boughtMagikarp) { await say(T("Route4_PokemonCenter_1F_Text_IDontGiveRefunds")); return; }
        const pitch = T(Player.LOOKS[player.look].girl ? "Route4_PokemonCenter_1F_Text_SweetieBuyMagikarpForJust500" : "Route4_PokemonCenter_1F_Text_LaddieBuyMagikarpForJust500");
        await say(pitch.slice(0, -1));
        if (!(await confirm(fill(pitch[pitch.length - 1]) + "\n(You have " + money(player.money) + ".)"))) { await say(T("Route4_PokemonCenter_1F_Text_OnlyDoingThisAsFavorToYou")); return; }
        if (player.money < 500) { await say(T("Route4_PokemonCenter_1F_Text_YoullNeedMoreMoney")); return; }
        if (player.party.length >= Player.PARTY_SIZE && !player.boxes.some((b) => b.length < Player.BOX_SIZE)) { await say(T("Route4_PokemonCenter_1F_Text_NoRoomForMorePokemon")); return; }
        Player.addMoney(player, -500);
        f.boughtMagikarp = true;
        await say(T("Route4_PokemonCenter_1F_Text_PaidOutrageouslyForMagikarp"));
        await addCaught(Party.create("Magikarp", 5));
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
    await Overworld.act([
      { who: LAB_RIVAL, moves: M("PalletTown_ProfessorOaksLab_Movement_RivalExitAfterBattle" + side) },
      { who: "player", moves: M("PalletTown_ProfessorOaksLab_Movement_PlayerWatchRivalExitAfterBattle" + (side === "Right" ? "Right" : "")) }]);
    Overworld.removeObject(LAB_RIVAL);
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
    if (approach != null) {
      await Overworld.act([{ who, moves: ["emote_exclamation_mark"].concat(Array(approach).fill("walk_" + facing)) }]);
      await Overworld.act([{ who: "player", moves: ["face_" + World.OPPOSITE[facing]] }]);
    }
    await say(t.intro);
    if (!canBattle()) return;
    const team = trainerTeam(t.id);
    await battle("trainer", { foe: { name: data.className + " " + data.name, team, pic: data.pic }, defeatText: t.defeat, trainerId: t.id });
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
      ivs: { hp: 20, atk: 15, def: 17, spe: 24, spa: 23, spd: 22 } }
  };
  async function inGameTrade(trade) {
    const f = player.flags;
    if (f[trade.flag]) { await say(T("Trade_Text_IsntMyOldMonGreat"), [trade.wants, trade.gives]); return; }
    const ask = T("Trade_Text_LookingForMonWannaTradeForMon");
    await say(ask.slice(0, -1), [trade.wants, trade.gives]);
    if (!(await confirm(fill(ask[ask.length - 1], [trade.wants, trade.gives])))) { await say(T("Trade_Text_AwwOhWell")); return; }
    const v = await pick("Which Pokémon will you trade?", partyHtml(), [back()]);
    show("world");
    if (v === "back") { await say(T("Trade_Text_AwwOhWell")); return; }
    const i = +v.pick, mine = player.party[i];
    if (mine.species !== trade.wants) { await say(T("Trade_Text_WhatThatsNoMon"), [trade.wants, trade.gives]); return; }
    const theirs = Party.create(trade.gives, mine.level, { nickname: trade.nickname });
    theirs.ivs = Object.assign({}, trade.ivs);
    theirs.hp = Party.maxHp(theirs);
    player.party[i] = theirs;
    Player.markCaught(player, trade.gives);
    f[trade.flag] = true;
    await say("{PLAYER} sent " + Party.displayName(mine) + " to the trainer.\nThe trainer sent back " + trade.nickname + "!");
    await say(T("Trade_Text_HeyThanks"));
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
  async function nurse(mapName) {
    const [welcome, ask] = T("Text_WelcomeWantToHealPkmn");
    await say(welcome);
    if (!(await confirm(fill(ask)))) { await say(T("Text_WeHopeToSeeYouAgain")); return; }
    await say(T("Text_TakeYourPkmnForFewSeconds"));
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
    const v = await pick(fill(T(text + "WhichMon").join(" ")), partyHtml(), [back()]);
    show("world");
    if (v === "back") { await declined(); return; }
    const record = player.party[+v.pick];
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

  // ---------- Badges ----------

  const hasBadge = (id) => player.badges.includes(id);

  // ---------- Route 22's rival ----------
  //
  // FireRed's Route22_EventScript_EarlyRival: Gary walks up from the left,
  // battles (Pidgey, level 5, and Eevee, level 7, as in Yellow), and heads off
  // toward Viridian. Losing doesn't black you out.
  async function route22Rival(side) {
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
    await Overworld.act([{ who: R, moves: ["delay_10"].concat(M(side === "Bottom" ? "Route22_Movement_EarlyRivalExitBottom" : "Route22_Movement_EarlyRivalExit")) }]);
    Overworld.removeObject(R);
  }

  // ---------- Leaf, outside Pewter Gym ----------
  //
  // When you come out of the Gym with the Boulder Badge, Leaf comes over,
  // happy for you: she has a Pokédex from Prof. Oak too, and wants a battle.
  // Her starter (level 15, the one weak against yours) and Jigglypuff (level
  // 13). Losing blacks you out, and she's waiting again next time you come
  // out of the Gym; beat her and she heads off.
  function leafPewterDue() {
    const f = player.flags, at = player.location;
    const door = window.WORLD_MAPS.PewterCity.warps.find((w) => w.map === "PewterCity_Gym");
    return !!(f.TRAINER_LEADER_BROCK && f.starter && !f.leafPewter && door && at.x === door.x && at.y === door.y && canBattle());
  }
  async function leafPewter() {
    const f = player.flags, L = "LOCALID_LEAF";
    await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
    const at = Overworld.position();
    Overworld.addObject(L, { x: at.x + 5, y: at.y, facing: "left" }, window.WORLD_SPRITES.leaf);
    await Overworld.act([{ who: L, moves: ["walk_left", "walk_left", "walk_left", "walk_left"] }]);
    await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterRight") }]);
    await say(["Leaf: {PLAYER}! I saw you go into the\nGym. You beat Brock? That's amazing!",
      "Guess what? I went back to see Prof.\nOak, and he gave me a Pokédex too!",
      "I've been filling it in all the way\nhere. Look, I even caught a\nJigglypuff on Route 3!",
      "How about a battle? I want to see\nhow strong your Pokémon have gotten!"]);
    const team = [Party.create(RIVAL_PICK[f.starter], 15), Party.create("Jigglypuff", 13)];
    const outcome = await battle("trainer", { foe: { name: "Pokémon Trainer " + LAB_RIVAL_NAME, team, pic: "green" },
      defeatText: ["Wow! You really are strong,\n{PLAYER}!"] });
    if (outcome !== "won") return;
    f.leafPewter = true;
    show("world");
    await Overworld.resume();
    await say(["Leaf: That was a great battle!\nI'm going to keep working on my\nPokédex.",
      "Let's both try to fill ours in!\nSee you later, {PLAYER}!"]);
    await Overworld.act([{ who: L, moves: ["walk_right", "walk_right", "walk_right", "walk_right", "set_invisible"] }]);
    Overworld.removeObject(L);
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
  // come up from it, recite their motto and battle with Ekans, Meowth and
  // Koffing (level 14). Beaten, they pay ₽750 and blast off; beat you, and
  // they wait there again.
  function jessieJamesStep() {
    const f = player.flags, at = Overworld.position();
    if (f.jessieJames || at.map !== "MtMoon_B2F") return null;
    return at.y === 7 && (at.x === 3 || at.x === 4) && at.facing === "down" && canBattle() ? { type: "jessie-james" } : null;
  }
  async function jessieJames() {
    const f = player.flags, J = "LOCALID_JESSIE", K = "LOCALID_JAMES";
    Overworld.addObject(J, { x: 3, y: 10, facing: "up" }, window.WORLD_SPRITES.jessie);
    Overworld.addObject(K, { x: 4, y: 10, facing: "up" }, window.WORLD_SPRITES.james);
    await Overworld.act([{ who: J, moves: ["walk_up", "walk_up"] }, { who: K, moves: ["walk_up", "walk_up"] }]);
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
    await Overworld.act([{ who: J, moves: ["walk_down", "set_invisible"] }, { who: K, moves: ["walk_down", "set_invisible"] }]);
    Overworld.removeObject(J);
    Overworld.removeObject(K);
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

  // ---------- Escape Rope ----------
  //
  // As in FireRed: it works only where the map allows escaping (caves, Viridian
  // Forest), and takes you back to where you last went from outdoors (a town,
  // city or route) through a door or cave entrance: the "escape warp".

  const OUTDOORS = ["town", "city", "route", "ocean_route"];
  function onWarp(from, to) {
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
    await message(player.name + " used the " + Bag.name(item) + ".");
  }

  // ---------- Exploring ----------

  function special(script) {
    // Coming back into Pewter City: the Museum ticket was for one visit (FireRed's OnTransition).
    // Coming out of the Gym with the Boulder Badge, Leaf is waiting.
    if (script === "enter:PewterCity") { player.flags.museumTicket = false; return leafPewterDue(); }
    // Walking into the Route 4 Pokémon Center makes it where you go after
    // blacking out (FireRed's setrespawn there).
    if (script === "enter:Route4_PokemonCenter_1F") { player.flags.lastCenter = "Route4_PokemonCenter_1F"; return false; }
    return SPECIAL.has(script) || ITEM_BALLS.has(script) || TRAINER_SCRIPTS.has(script);
  }

  async function explore() {
    for (;;) {
      show("world");
      const ev = await Overworld.explore({
        player, rivalName: player.rival, visible,
        special,
        onWarp,
        trainerWaiting, hiddenItem: (h) => !player.flags[h.flag],
        onStep: () => redForestStep() || jessieJamesStep() || repelStep(), allowWild: repelAllows
      });
      if (ev.type === "menu") await startMenu();
      else if (ev.type === "repel-ended") await say("Repel's effect wore off…");
      else if (ev.type === "red-forest") await redForest();
      else if (ev.type === "jessie-james") await jessieJames();
      else if (ev.type === "wild") {
        if (!canBattle()) continue;
        await battle("wild", { foe: { name: "Wild", team: [Party.create(ev.species, ev.level)] }, terrain: "grass" });
      } else await story(ev);
      await persist();
    }
  }

  async function main() {
    // FireRed's opening movie and title screen; left alone, the title goes back to the movie.
    show("intro");
    for (;;) {
      await Intro.movie();
      if ((await Intro.titleScreen()) === "start") break;
    }
    Intro.stop();
    await title();
    lastTick = Date.now();
    await explore();
  }

  window.addEventListener("beforeunload", () => { if (player) { tick(); Save.write(player); } });

  window.Game = { get player() { return player; } };
  main();
})();
