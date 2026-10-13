// Game flow: starter, party screen, battles and what happens after them
// Depends on: game/*.js, ui/screen.js, ui/battle-screen.js
//
// Progress lives in memory only for now (saving is the next step), so
// reloading the page starts a new game.

(function () {
  "use strict";

  const STARTERS = ["Bulbasaur", "Charmander", "Squirtle"];
  const STARTER_LEVEL = 5;
  const PARTY_SIZE = 6;
  const STARTING_BAG = { "poke-ball": 20, "great-ball": 10, "ultra-ball": 5, "master-ball": 1 };

  const { message, ask, escapeHtml } = window.Screen;
  const $ = (sel) => document.querySelector(sel);
  const field = $("#field"), scene = $("#scene");

  const state = {
    party: [],
    box: [],            // overflow once the party is full (the PC comes later)
    bag: Object.assign({}, STARTING_BAG),
    caught: new Set()   // species caught or owned, for the Repeat Ball
  };

  const spriteUrl = (species) => "assets/sprites/pokemon/" + window.DEX[species].id + ".png";
  const partyLevel = () => Math.max(...state.party.map((r) => r.level));
  const canBattle = () => state.party.some((r) => !Party.isFainted(r));

  function show(which) {
    field.classList.toggle("hidden", which !== "field");
    scene.classList.toggle("hidden", which !== "scene");
  }

  // ---------- Scenes ----------

  function bar(pct, cls) {
    return '<div class="bar ' + cls + '"><div style="width:' + Math.round(pct * 100) + '%"></div></div>';
  }

  function partyCard(r, i) {
    const max = Party.maxHp(r);
    const hpPct = r.hp / max;
    const hpClass = hpPct <= 0.2 ? "low" : hpPct <= 0.5 ? "mid" : "";
    const gender = r.gender === "M" ? " ♂" : r.gender === "F" ? " ♀" : "";
    return '<button type="button" class="card' + (Party.isFainted(r) ? " fainted" : "") + '" data-index="' + i + '"' +
      (i === 0 ? " disabled" : "") + ' title="' + (i === 0 ? "Leads the party" : "Make this Pokémon lead") + '">' +
      '<img src="' + spriteUrl(r.species) + '" alt="">' +
      '<div class="card-body">' +
        '<div class="card-top"><b>' + escapeHtml(Party.displayName(r)) + gender + "</b>" +
          (r.status ? '<span class="status ' + r.status + '">' + r.status + "</span>" : "") +
          "<span>Lv" + r.level + "</span></div>" +
        bar(hpPct, "hp " + hpClass) +
        '<div class="card-hp">' + r.hp + " / " + max + "</div>" +
        bar(Party.expProgress(r), "exp") +
        '<div class="card-moves">' + r.moves.map((m) => escapeHtml(m.name)).join(" · ") + "</div>" +
      "</div></button>";
  }

  function renderParty() {
    const balls = Object.keys(state.bag).map((id) => BattleScreen.ballName(id) + " ×" + state.bag[id]).join(" · ");
    scene.innerHTML = '<div class="party">' + state.party.map(partyCard).join("") + "</div>" +
      '<p class="bag-line">' + escapeHtml(balls) + (state.box.length ? " · PC: " + state.box.length + " Pokémon" : "") +
      " · Tap a Pokémon to make it lead.</p>";
    for (const card of scene.querySelectorAll(".card")) {
      card.addEventListener("click", () => {
        const i = +card.dataset.index;
        state.party.unshift(state.party.splice(i, 1)[0]);
        renderParty();
      });
    }
  }

  function renderSprite(species, extraClass) {
    scene.innerHTML = '<div class="spotlight"><img class="big-sprite ' + (extraClass || "") + '" src="' +
      spriteUrl(species) + '" alt="' + escapeHtml(species) + '"></div>';
    return scene.querySelector(".big-sprite");
  }

  // ---------- Starter ----------

  async function chooseStarter() {
    show("scene");
    scene.innerHTML = '<div class="starters">' + STARTERS.map((s) =>
      '<figure><img src="' + spriteUrl(s) + '" alt=""><figcaption>' + s + "</figcaption></figure>").join("") + "</div>";
    await message("Welcome to the world of Pokémon!");
    const species = await ask("Which Pokémon will you choose as your partner?",
      STARTERS.map((s) => ({ label: s, value: s })));
    const record = Party.create(species, STARTER_LEVEL);
    state.party.push(record);
    state.caught.add(species);
    renderSprite(species);
    await message("You chose " + species + "! Take good care of it.");
  }

  // ---------- Battles ----------

  const randomMove = (battle) => {
    const req = battle.getRequest("p2");
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (req.phase === "switch") return { type: "switch", index: pick(req.switches) };
    if (req.active.forced) return { type: "move", move: 0 };
    if (req.active.struggle) return { type: "move", move: "Struggle" };
    return { type: "move", move: pick(req.active.moves.filter((m) => !m.disabled)).index };
  };

  async function battle(kind) {
    const wild = kind === "wild";
    const foe = wild ? { name: "Wild", team: [Encounters.wild(partyLevel())] } : Encounters.trainer(partyLevel());
    show("field");
    const result = await BattleScreen.run({
      p1: { name: "You", team: state.party.map(Party.toBattleSet) },
      p2: { name: foe.name, team: foe.team.map(Party.toBattleSet) },
      wild,
      exp: true,
      bag: state.bag,
      catchContext: { night: Evolution.timeOfDay() === "night", caughtBefore: (s) => state.caught.has(s) },
      opponent: wild ? randomMove : (b) => OpponentAI.choose(b, "p2")
    });
    const b = result.battle;
    const leveledUp = [];
    state.party.forEach((record, i) => {
      const mon = b.sides.p1.pokemon[i];
      Party.syncFromBattle(record, mon);
      if (mon.leveledUp) leveledUp.push(record);
    });

    if (result.outcome === "caught") await addCaught(Party.caught(foe.team[0], b.caught, ballUsed(b)));
    if (result.outcome === "lost" || !canBattle()) {
      await blackout();
      return;
    }
    for (const record of leveledUp) {
      const evo = Evolution.find(record, { trigger: "level", party: state.party });
      if (evo) await evolve(record, evo);
    }
  }

  function ballUsed(b) {
    const ev = b.events.find((e) => e[0] === "caught");
    return ev ? ev[2] : "poke-ball";
  }

  async function addCaught(record) {
    state.caught.add(record.species);
    if (state.party.length < PARTY_SIZE) {
      state.party.push(record);
      await message(record.species + " was added to your party!");
    } else {
      state.box.push(record);
      await message(record.species + " was sent to the PC.");
    }
  }

  async function blackout() {
    await message("You have no more Pokémon that can fight!");
    await message("You blacked out!");
    state.party.forEach(Party.heal);
    show("scene");
    renderParty();
    await message("You rushed to the Pokémon Center, and your Pokémon were healed.");
  }

  // ---------- Evolution ----------

  async function evolve(record, evo) {
    const name = Party.displayName(record);
    show("scene");
    const img = renderSprite(record.species);
    await message("What? " + name + " is evolving!");
    img.classList.add("evolving");
    // The player can press Stop while the animation plays.
    let stopped = false;
    const stop = ask(name + " is evolving...", [{ label: "Stop", value: true, className: "action", wide: true }])
      .then(() => { stopped = true; });
    await Promise.race([stop, new Promise((r) => setTimeout(r, 3200))]);
    window.Screen.clearMenu();
    img.classList.remove("evolving");
    if (stopped) {
      await message("Huh? " + name + " stopped evolving!");
      return;
    }
    const oldSpecies = record.species;
    const shed = Evolution.shedinja(record);
    const newMoves = Evolution.evolve(record, evo.into, evo);
    renderSprite(record.species, "evolved");
    await message("Congratulations! Your " + (record.nickname || oldSpecies) + " evolved into " + record.species + "!");
    state.caught.add(record.species);
    for (const move of newMoves) await learnMove(record, move);
    if (shed && state.party.length < PARTY_SIZE && state.bag["poke-ball"] > 0) {
      state.bag["poke-ball"]--;
      state.party.push(shed);
      state.caught.add("Shedinja");
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

  // ---------- Party screen ----------

  async function hub() {
    for (;;) {
      show("scene");
      renderParty();
      const action = await ask("What would you like to do?", [
        { label: "Find a wild Pokémon", value: "wild", className: "action" },
        { label: "Battle a trainer", value: "trainer", className: "action" },
        { label: "Pokémon Center", value: "heal", className: "action", wide: true }
      ]);
      if (action === "heal") {
        state.party.forEach(Party.heal);
        renderParty();
        await message("Your Pokémon are fighting fit! We hope to see you again!");
        continue;
      }
      if (!canBattle()) {
        await message("Your Pokémon are too tired to battle. Visit the Pokémon Center first.");
        continue;
      }
      await battle(action);
    }
  }

  async function main() {
    await chooseStarter();
    await hub();
  }

  window.Game = { state };
  main();
})();
