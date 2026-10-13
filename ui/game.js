// Game flow: title screen, new game, the overworld and its story events, the
// Start menu (party, bag, Pokédex, trainer card, and the services that will
// move into towns: Pokémon Center, Poké Mart, PC, practice battles), and what
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

  async function newGame() {
    let name = "";
    while (!name) {
      show("scene");
      scene.innerHTML = '<div class="spotlight"><label class="name-entry">Your name' +
        '<input id="name-input" maxlength="12" value="Red" autocomplete="off"></label></div>';
      const input = $("#name-input");
      input.focus();
      input.select();
      const typed = new Promise((resolve) => input.addEventListener("keydown", (e) => { if (e.key === "Enter") resolve(); }));
      await Promise.race([typed, ask("What's your name?", [{ label: "OK", value: true, className: "action", wide: true }])]);
      clearMenu();
      name = input.value.trim().slice(0, 12);
    }
    scene.innerHTML = '<div class="starters">' +
      '<figure><img class="look" src="assets/world/sprites/player_red.png" alt=""><figcaption>Boy</figcaption></figure>' +
      '<figure><img class="look" src="assets/world/sprites/player_green.png" alt=""><figcaption>Girl</figcaption></figure></div>';
    const look = await ask("Are you a boy or a girl?", [
      { label: "Boy", value: "red", className: "action" }, { label: "Girl", value: "green", className: "action" }]);
    player = Player.create(name, look);
    renderSprite("Pikachu");
    await message("Welcome to the world of Pokémon, " + name + "!");
    await message("Your very own Pokémon legend is about to unfold!");
    await message("PROF. OAK is waiting for you in his lab, south of your house.");
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
  async function battle(kind, opts) {
    opts = opts || {};
    const wild = kind === "wild";
    const foe = opts.foe || (wild ? { name: "Wild", team: [Encounters.wild(partyLevel())] } : Encounters.trainer(partyLevel()));
    show("field");
    const result = await BattleScreen.run({
      p1: { name: player.name, team: player.party.map(Party.toBattleSet) },
      p2: { name: foe.name, team: foe.team.map(Party.toBattleSet) },
      wild,
      exp: true,
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

    if (result.outcome === "won" && !wild) {
      const prize = Player.prizeMoney(foe.name, foe.team);
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
    player.location = Object.assign({}, Player.HOME);
    show("scene");
    scene.innerHTML = partyHtml();
    await message("You hurried home to MOM, and your Pokémon were healed.");
  }

  // ---------- Evolution and moves ----------

  async function evolve(record, evo, canStop) {
    const name = Party.displayName(record);
    const img = renderSprite(record.species, "", Party.form(record));
    await message("What? " + name + " is evolving!");
    img.classList.add("evolving");
    let stopped = false;
    if (canStop) {
      const stop = ask(name + " is evolving...", [{ label: "Stop", value: true, className: "action", wide: true }])
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
      Player.removeItem(player, item);
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

  const usableFromBag = (item) => Bag.isStone(item) || Bag.isMachine(item) || !!Bag.mintNature(item) ||
    item === "rare-candy" || !!ItemUse.effect(item);
  // TMs and HMs work like key items: they can't be held, tossed or sold.
  const holdable = (item) => !Bag.isBall(item) && !Bag.isMachine(item);

  // ---------- Summary ----------

  const STAT_LABELS = { hp: "HP", atk: "Attack", def: "Defense", spa: "Sp. Atk", spd: "Sp. Def", spe: "Speed" };

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
      '<table class="stats"><tr><th></th><th>Stat</th><th>EVs</th></tr>' +
      Object.keys(STAT_LABELS).map((k) => "<tr><td>" + STAT_LABELS[k] +
        (nature.plus === k ? ' <span class="up">▲</span>' : nature.minus === k ? ' <span class="down">▼</span>' : "") +
        "</td><td>" + stats[k] + "</td><td>" + (r.evs[k] || 0) + "</td></tr>").join("") + "</table>" +
      '<div class="summary-moves">' + r.moves.map((m) => {
        const d = MOVES[m.name];
        return '<div class="type-' + d.type + '"><b>' + escapeHtml(m.name) + "</b><span>" + d.type + " · " +
          (d.cat === "Status" ? "Status" : d.cat + " " + (d.power || "—")) + " · PP " + m.pp + "/" + Party.maxPp(m) + "</span></div>";
      }).join("") + "</div></div>";
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
      const v = await pick(Party.displayName(r) + "'s summary.", summaryHtml(r), options);
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
        '<div class="rows">' + (items.length ? items.map((id) => itemRow(id, Bag.isMachine(id) ? MOVES[Bag.machineMove(id)].type : "×" + player.bag[id], "item:" + id)).join("")
          : '<p class="empty">Nothing in this pocket.</p>') + "</div>";
      const v = await pick("Your bag. " + money(player.money), html, [back("Close bag")]);
      if (v === "back") return;
      const [kind, id] = v.pick.split(/:(.*)/);
      if (kind === "tab") { pocket = id; continue; }
      const options = [];
      if (usableFromBag(id)) options.push({ label: "Use", value: "use", className: "action" });
      if (holdable(id)) options.push({ label: "Give", value: "give", className: "action" });
      if (!Bag.isMachine(id)) options.push({ label: "Toss", value: "toss", className: "action" });
      options.push(back());
      const what = await ask(Bag.name(id) + ": " + Bag.description(id), options);
      if (what === "use") {
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

  async function mart() {
    for (;;) {
      const v = await pick("Welcome to the Poké Mart! How may I serve you?",
        '<div class="spotlight mart-sign"><b>POKé MART</b><div>' + money(player.money) + "</div></div>",
        [{ label: "Buy", value: "buy", className: "action" }, { label: "Sell", value: "sell", className: "action" }, back("Leave")]);
      if (v === "back") { await message("Please come again!"); return; }
      if (v === "buy") await martBuy();
      else await martSell();
      await persist();
    }
  }

  async function martBuy() {
    let tab = "Items";
    for (;;) {
      const stock = Bag.martStock(partyLevel()).filter((x) => (tab === "TMs & HMs") === Bag.isMachine(x.item));
      const owned = (id) => Player.itemCount(player, id) > 0;
      const html = '<div class="tabs">' + ["Items", "TMs & HMs"].map((t) =>
        '<button type="button" class="tab' + (t === tab ? " active" : "") + '" data-pick="tab:' + t + '">' + t + "</button>").join("") + "</div>" +
        '<div class="rows">' + (stock.length ? stock.map((x) => itemRow(x.item, money(x.price) + "<small>" +
          (Bag.isMachine(x.item) ? (owned(x.item) ? "Owned" : MOVES[Bag.machineMove(x.item)].type) : "In bag: " + Player.itemCount(player, x.item)) +
          "</small>")).join("") : '<p class="empty">Nothing here yet. Come back when your Pokémon are stronger!</p>') +
        '</div><p class="bag-line">You have ' + money(player.money) + ". More stock arrives as your Pokémon grow stronger.</p>";
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
        const items = Object.keys(player.bag).filter((id) => !Bag.isMachine(id));
        if (!items.length) { await message("There are no items in your bag to store."); continue; }
        const p = await pick("What would you like to deposit?", '<div class="rows">' +
          items.map((id) => itemRow(id, "×" + player.bag[id])).join("") + "</div>", [back()]);
        if (p === "back") continue;
        const n = player.bag[p.pick] > 1 ? await chooseQuantity("Deposit how many?", player.bag[p.pick]) : 1;
        if (!n) continue;
        Player.depositItem(player, p.pick, n);
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
          await message("Threw away " + n + " × " + Bag.name(p.pick) + ".");
        } else {
          Player.withdrawItem(player, p.pick, n);
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
            "<small>" + escapeHtml(Party.speciesName(e.species)) + "</small></button>";
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
      const html = '<div class="trainer-card"><h2>' + escapeHtml(player.name) + "</h2>" +
        "<dl><dt>Money</dt><dd>" + money(player.money) + "</dd>" +
        "<dt>Pokédex</dt><dd>" + player.pokedex.caught.length + " caught, " + player.pokedex.seen.length + " seen</dd>" +
        "<dt>Badges</dt><dd>" + player.badges.length + " <small>(gyms come with the map)</small></dd>" +
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
      const v = await pick("Choose a Pokémon.", partyHtml() + '<p class="bag-line">Tap a Pokémon for its summary.</p>', [back("Close")]);
      if (v === "back") return;
      await summary(+v.pick);
    }
  }

  // The Pokémon Center, Poké Mart and practice battles until those buildings
  // exist on the map.
  async function services() {
    for (;;) {
      const v = await ask("Services (these move into towns as the map grows).", [
        { label: "Pokémon Center", value: "heal", className: "action" },
        { label: "Poké Mart", value: "mart", className: "action" },
        { label: "PC", value: "pc", className: "action" },
        { label: "Practice: wild Pokémon", value: "wild", className: "action" },
        { label: "Practice: trainer", value: "trainer", className: "action" },
        back()]);
      if (v === "back") return;
      if (v === "heal") {
        player.party.forEach(Party.heal);
        await message("Your Pokémon are fighting fit! We hope to see you again!");
      } else if (v === "mart") await mart();
      else if (v === "pc") await pc();
      else if (!canBattle()) await message(player.party.length ? "Your Pokémon are too tired to battle." : "You don't have any Pokémon yet.");
      else { await battle(v); return; }
      await persist();
    }
  }

  async function startMenu() {
    for (;;) {
      show("scene");
      scene.innerHTML = (player.party.length ? partyHtml() : '<p class="empty">No Pokémon yet. PROF. OAK’s lab is south of your house.</p>') +
        '<p class="bag-line">' + escapeHtml(player.name) + " · " + money(player.money) +
        " · Pokédex " + player.pokedex.caught.length + "</p>";
      const v = await ask("Menu", [
        { label: "Pokémon", value: "party", className: "action" },
        { label: "Bag", value: "bag", className: "action" },
        { label: "Pokédex", value: "dex", className: "action" },
        { label: "Trainer card", value: "card", className: "action" },
        { label: "Save", value: "save", className: "action" },
        { label: "Services", value: "services", className: "action" },
        back("Close")]);
      if (v === "back") return;
      if (v === "party") await partyMenu();
      else if (v === "bag") await bagScreen();
      else if (v === "dex") await pokedex();
      else if (v === "card") await trainerCard();
      else if (v === "save") {
        tick();
        const r = Save.write(player);
        await message(r.ok ? player.name + " saved the game." : r.error);
      } else if (v === "services") {
        await services();
        if (scene.classList.contains("hidden")) return; // went into a battle
      }
      await persist();
    }
  }

  // ---------- Pallet Town story ----------
  //
  // Most signs and people in the overworld just say their FireRed text. These
  // scripts do more, so the overworld hands them to us.

  const STARTER_BALLS = {
    PalletTown_ProfessorOaksLab_EventScript_BulbasaurBall: { species: "Bulbasaur", kind: "Grass", flag: "FLAG_HIDE_BULBASAUR_BALL" },
    PalletTown_ProfessorOaksLab_EventScript_SquirtleBall: { species: "Squirtle", kind: "Water", flag: "FLAG_HIDE_SQUIRTLE_BALL" },
    PalletTown_ProfessorOaksLab_EventScript_CharmanderBall: { species: "Charmander", kind: "Fire", flag: "FLAG_HIDE_CHARMANDER_BALL" }
  };
  // The rival takes the starter that beats yours.
  const RIVAL_PICK = { Bulbasaur: "Charmander", Charmander: "Squirtle", Squirtle: "Bulbasaur" };
  const ballOf = (species) => Object.values(STARTER_BALLS).find((b) => b.species === species);

  const SPECIAL = new Set([
    "PalletTown_PlayersHouse_1F_EventScript_Mom",
    "PalletTown_PlayersHouse_2F_EventScript_PC",
    "PalletTown_EventScript_OakTriggerLeft", "PalletTown_EventScript_OakTriggerRight",
    "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerLeft",
    "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerMid",
    "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerRight",
    "Route1_EventScript_MartClerk",
    "PalletTown_ProfessorOaksLab_EventScript_Rival", "PalletTown_ProfessorOaksLab_EventScript_ProfOak"
  ].concat(Object.keys(STARTER_BALLS)));

  // Which people are around, from FireRed's event flags and this game's story flags.
  function visible(person) {
    const f = player.flags;
    switch (person.flag) {
      case "FLAG_HIDE_OAK_IN_PALLET_TOWN": return false;   // no walk-to-the-lab cutscene
      case "FLAG_HIDE_POKEDEX": return false;              // the Pokédex is always yours here
      case "FLAG_HIDE_RIVAL_IN_LAB": return !f.rivalLabBattle;
      case "FLAG_HIDE_BULBASAUR_BALL": case "FLAG_HIDE_SQUIRTLE_BALL": case "FLAG_HIDE_CHARMANDER_BALL":
        return !(f.starter && (ballOf(f.starter).flag === person.flag || ballOf(RIVAL_PICK[f.starter]).flag === person.flag));
      default: return true;
    }
  }

  const fill = (s) => s.replace(/\{PLAYER\}/g, player.name).replace(/\{RIVAL\}/g, player.rival);
  async function say(pages) { for (const p of [].concat(pages)) await window.Screen.read(fill(p)); }

  async function story(ev) {
    const script = (ev.person || ev.sign || ev.trigger).script;
    const f = player.flags;

    if (STARTER_BALLS[script]) {
      const ball = STARTER_BALLS[script];
      if (f.starter) { await say("That's PROF. OAK's last Pokémon."); return; }
      if (!(await confirm("So! You want the " + ball.kind + " Pokémon, " + ball.species + "?"))) return;
      Player.receive(player, Party.create(ball.species, STARTER_LEVEL));
      f.starter = ball.species;
      await say(["{PLAYER} received the " + ball.species + " from PROF. OAK!",
        "{RIVAL}: I'll take this one, then!", "{RIVAL} received the " + RIVAL_PICK[ball.species] + " from PROF. OAK!"]);
      return;
    }

    switch (script) {
      case "PalletTown_PlayersHouse_1F_EventScript_Mom":
        if (!player.party.length) {
          await say(["MOM: …Right.\nAll " + (player.look === "green" ? "girls" : "boys") + " leave home someday.\nIt said so on TV.",
            "Oh, yes. PROF. OAK, next door, was\nlooking for you."]);
          return;
        }
        await say("MOM: {PLAYER}! You should take a quick rest.");
        player.party.forEach(Party.heal);
        await say("MOM: Oh, good! You and your Pokémon are looking great.\nTake care now!");
        return;

      case "PalletTown_PlayersHouse_2F_EventScript_PC":
        // Your own PC at home holds items, as in FireRed.
        await say("{PLAYER} booted up the PC.");
        await itemStorage();
        return;

      case "PalletTown_EventScript_OakTriggerLeft":
      case "PalletTown_EventScript_OakTriggerRight":
        if (player.party.length) return;
        await say(["OAK: Hey! Wait!\nDon't go out!",
          "OAK: It's unsafe!\nWild Pokémon live in tall grass!",
          "You need your own Pokémon for\nyour protection.",
          "Come to my lab, just south of here.\nI'll give you one!"]);
        Overworld.forceStep("down");
        return;

      case "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerLeft":
      case "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerMid":
      case "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerRight": {
        if (!f.starter || f.rivalLabBattle || !player.party.length) return;
        await say(["{RIVAL}: Wait, {PLAYER}!\nLet's check out our Pokémon!", "Come on, I'll take you on!"]);
        f.rivalLabBattle = true;
        const team = [Party.create(RIVAL_PICK[f.starter], STARTER_LEVEL)];
        await battle("trainer", { foe: { name: "Rival " + player.rival, team }, noBlackout: true });
        await say("{RIVAL}: Okay! I'll make my Pokémon battle to toughen it up!\n{PLAYER}! Gramps! Smell you later!");
        return;
      }

      // In the lab, so not "Gramps isn't around" (that's from before Oak walks you there).
      case "PalletTown_ProfessorOaksLab_EventScript_Rival":
        if (!f.starter) await say(["{RIVAL}: Heh, I don't need to be\ngreedy like you. I'm mature!", "Go ahead and choose, {PLAYER}!"]);
        else await say("{RIVAL}: My Pokémon looks a lot\ntougher than yours.");
        return;

      case "PalletTown_ProfessorOaksLab_EventScript_ProfOak":
        if (!f.starter) await say(ev.person.text);
        else if (!f.rivalLabBattle) await say(["OAK: If a wild Pokémon appears,\nyour Pokémon can battle it.", "With it at your side, you should be\nable to reach the next town."]);
        else await say(["OAK: {PLAYER}, raise your young\nPokémon by making it battle.", "It has to battle for it to grow."]);
        return;

      case "Route1_EventScript_MartClerk":
        if (f.route1Potion) { await say("Please come see us if you need\nPoké Balls."); return; }
        await say(ev.person.text);
        Player.addItem(player, "potion");
        f.route1Potion = true;
        await say("{PLAYER} received a Potion.");
        return;
    }
  }

  // ---------- Exploring ----------

  async function explore() {
    for (;;) {
      show("world");
      const ev = await Overworld.explore({
        player, rivalName: player.rival, visible,
        special: (script) => SPECIAL.has(script)
      });
      if (ev.type === "menu") await startMenu();
      else if (ev.type === "wild") {
        if (!canBattle()) continue;
        await battle("wild", { foe: { name: "Wild", team: [Party.create(ev.species, ev.level)] } });
      } else await story(ev);
      await persist();
    }
  }

  async function main() {
    await title();
    lastTick = Date.now();
    await explore();
  }

  window.addEventListener("beforeunload", () => { if (player) { tick(); Save.write(player); } });

  window.Game = { get player() { return player; } };
  main();
})();
