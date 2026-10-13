// Items in the bag: names, pockets, prices, the Poké Mart, and using or
// giving items outside battle (including TMs, PP Ups and mints)
// Depends on: window.ITEMS, window.ITEM_SPRITES, window.ItemUse, window.MOVES,
//             window.Party, window.Evolution, window.Experience
//
//   Bag.name("poke-ball")                 // "Poké Ball"
//   Bag.pocket("oran-berry")              // "Berries"
//   Bag.martStock(partyLevel)             // [{ item, price }]
//   Bag.canUseOn(record, "fire-stone")    // true if it would do something
//   Bag.useOn(record, "potion")           // { healed: 20 } etc.

(function () {
  "use strict";

  const POCKETS = ["Items", "Medicine", "Poké Balls", "TMs & HMs", "Berries"];

  const SPECIAL_NAMES = {
    "poke-ball": "Poké Ball", "kings-rock": "King's Rock", "up-grade": "Up-Grade", "hp-up": "HP Up",
    "pp-up": "PP Up", "pp-max": "PP Max", "never-melt-ice": "Never-Melt Ice", "exp-share": "Exp. Share",
    "x-accuracy": "X Accuracy", "x-attack": "X Attack", "x-defense": "X Defense", "x-speed": "X Speed",
    "x-sp-atk": "X Sp. Atk", "x-sp-def": "X Sp. Def", "poke-doll": "Poké Doll", "oddish-ball": "Oddish Ball"
  };

  // Gen 6 Poké Mart prices. Items sell for half. Anything else can't be bought or sold.
  const PRICES = {
    "poke-ball": 200, "great-ball": 600, "ultra-ball": 1200, "net-ball": 1000, "nest-ball": 1000,
    "dusk-ball": 1000, "quick-ball": 1000, "timer-ball": 1000, "repeat-ball": 1000, "dive-ball": 1000,
    "luxury-ball": 1000, "heal-ball": 300, "premier-ball": 200,
    "potion": 300, "super-potion": 700, "hyper-potion": 1200, "max-potion": 2500, "full-restore": 3000,
    "revive": 1500, "max-revive": 4000, "antidote": 100, "paralyze-heal": 200, "awakening": 250,
    "burn-heal": 250, "ice-heal": 250, "full-heal": 600, "fresh-water": 200, "soda-pop": 300,
    "lemonade": 400, "moomoo-milk": 500, "ether": 1200, "max-ether": 2000, "elixir": 3000,
    "max-elixir": 4500, "rare-candy": 10000,
    "hp-up": 9800, "protein": 9800, "iron": 9800, "calcium": 9800, "zinc": 9800, "carbos": 9800,
    "fire-stone": 2100, "water-stone": 2100, "thunder-stone": 2100, "leaf-stone": 2100,
    "moon-stone": 2100, "sun-stone": 2100, "shiny-stone": 2100, "dusk-stone": 2100,
    "dawn-stone": 2100, "ice-stone": 2100, "everstone": 3000, "lucky-egg": 10000,
    "pp-up": 9800, "pp-max": 29400
  };
  // Not in Gen 6 shops; priced for this game. Mints are from Sword and Shield.
  const MINT_PRICE = 20000;

  // What the Mart sells. The main games unlock stock with badges; until there
  // are gyms, it unlocks with your strongest Pokémon's level.
  const MART = [
    [1, ["poke-ball", "potion", "antidote", "paralyze-heal", "awakening", "burn-heal", "ice-heal"]],
    [10, ["great-ball", "super-potion"]],
    [15, ["revive", "full-heal", "everstone"]],
    [20, ["fire-stone", "water-stone", "thunder-stone", "leaf-stone", "moon-stone", "sun-stone",
          "shiny-stone", "dusk-stone", "dawn-stone", "ice-stone"]],
    [25, ["ultra-ball", "hyper-potion", "net-ball", "nest-ball", "dusk-ball", "quick-ball", "timer-ball", "repeat-ball"]],
    [25, ["pp-up"]],
    [30, ["hp-up", "protein", "iron", "calcium", "zinc", "carbos"]],
    [40, ["max-potion", "full-restore", "pp-max"]]
  ];

  // ---------- TMs and HMs ----------
  // X and Y's TM01-TM100 and HM01-HM05, plus what Omega Ruby and Alpha Sapphire
  // added: Secret Power (ORAS's TM94, which X and Y use for Rock Smash, so it's
  // TM101 here) and HM07 Dive. ORAS's HM06 is Rock Smash again (TM94), so
  // it's left out. Like Gen 5+, TMs are reusable; HMs too, and with no map yet
  // there are no field moves, so HM moves can be forgotten like any other.
  const LEFT_OUT_MACHINES = ["hm06"];
  const isMachine = (item) => (window.ITEMS[item] || {}).category === "all-machines" && !LEFT_OUT_MACHINES.includes(item);
  const machineMove = (item) => {
    const m = isMachine(item) && /^Teaches (.+?) to a compatible/.exec(window.ITEMS[item].effect || "");
    return m ? m[1] : null;
  };
  function machineName(item) {
    const m = /^(tm|hm)(\d+)$/.exec(item);
    return m[1].toUpperCase() + m[2].padStart(2, "0") + " " + machineMove(item);
  }
  // Sorted TM01..TM101, then HMs.
  let machineList = null;
  function machines() {
    if (!machineList) {
      const key = (id) => { const m = /^(tm|hm)(\d+)$/.exec(id); return (m[1] === "hm" ? 1000 : 0) + +m[2]; };
      machineList = Object.keys(window.ITEMS).filter(isMachine).sort((a, b) => key(a) - key(b));
    }
    return machineList;
  }
  // TM prices by the move's strength (Gen 6 shops sold only some TMs); HMs are cheap.
  function machinePrice(item) {
    if (/^hm/.test(item)) return 3000;
    const move = window.MOVES[machineMove(item)];
    const power = move.cat === "Status" ? 0 : move.power;
    return power >= 100 ? 30000 : power >= 80 ? 20000 : 10000;
  }
  // HMs at level 10; TMs as their price tier unlocks (levels 15, 25, 40).
  const machineLevel = (item) => (/^hm/.test(item) ? 10 : { 10000: 15, 20000: 25, 30000: 40 }[machinePrice(item)]);

  // ---------- Mints ----------
  // "adamant-mint" -> "Adamant". Using a mint changes the Pokémon's nature to
  // that one, replacing the old nature for good.
  const mintNature = (item) => {
    const m = /^([a-z]+)-mint$/.exec(item);
    const nature = m && m[1].charAt(0).toUpperCase() + m[1].slice(1);
    return nature && window.NATURES[nature] ? nature : null;
  };

  const titleCase = (id) => id.split("-").filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const name = (item) => SPECIAL_NAMES[item] || (isMachine(item) ? machineName(item) : titleCase(item));
  const description = (item) => (window.ITEMS[item] && window.ITEMS[item].effect) || "";
  const sprite = (item) => (window.ITEM_SPRITES && window.ITEM_SPRITES[item]) || "";
  const price = (item) => PRICES[item] || (isMachine(item) ? machinePrice(item) : mintNature(item) ? MINT_PRICE : 0);
  const sellPrice = (item) => Math.floor(price(item) / 2);

  const isBall = (item) => /balls$/.test((window.ITEMS[item] || {}).category || "") || /-ball$/.test(item);
  const isStone = (item) => Object.values(window.EVOLUTIONS).some((l) => l.some((e) => e.method === "item" && e.item === item));

  function pocket(item) {
    if (isBall(item)) return "Poké Balls";
    if (isMachine(item)) return "TMs & HMs";
    if (/-berry$/.test(item)) return "Berries";
    const cat = (window.ITEMS[item] || {}).category;
    if (window.ItemUse.effect(item) || ["healing", "status-cures", "revival", "pp-recovery", "vitamins"].includes(cat)) return "Medicine";
    return "Items";
  }

  const MINT_LEVEL = 30;

  function martStock(partyLevel) {
    const out = [];
    for (const [level, items] of MART) {
      if (partyLevel >= level) for (const item of items) out.push({ item, price: price(item) });
    }
    if (partyLevel >= MINT_LEVEL) {
      for (const item of Object.keys(window.ITEMS)) if (mintNature(item)) out.push({ item, price: MINT_PRICE });
    }
    for (const item of machines()) if (partyLevel >= machineLevel(item)) out.push({ item, price: price(item) });
    return out;
  }

  // ---------- Using items on party records ----------

  // The shape engine/item-use.js expects, built from a record.
  function view(record) {
    return {
      hp: record.hp, maxhp: window.Party.maxHp(record), status: record.status, fainted: record.hp <= 0,
      confused: false, evs: record.evs, level: record.level,
      moves: record.moves.map((m) => ({ pp: m.pp, maxpp: window.Party.maxPp(m), base: window.MOVES[m.name].pp, ppUps: m.ppUps || 0 }))
    };
  }

  // Would `item` do anything to `record` outside battle? opts: { move, party }
  function canUseOn(record, item, opts) {
    opts = opts || {};
    if (isStone(item)) return !!window.Evolution.find(record, { trigger: "item", item, party: opts.party });
    if (isMachine(item)) return window.Party.canLearnMachine(record, machineMove(item)) && !window.Party.knowsMove(record, machineMove(item));
    if (mintNature(item)) return record.nature !== mintNature(item);
    return window.ItemUse.canUse(view(record), item, { move: opts.move });
  }

  // Applies an HP / status / PP / vitamin item. Evolution stones and Rare Candy
  // go through levelUp() and the evolution flow in the UI instead.
  function useOn(record, item, opts) {
    if (mintNature(item)) {
      const old = record.nature;
      record.nature = mintNature(item);
      return { nature: record.nature, oldNature: old };
    }
    const v = view(record);
    const result = window.ItemUse.apply(v, item, opts);
    record.hp = v.hp;
    record.status = v.status;
    record.moves.forEach((m, i) => {
      m.pp = v.moves[i].pp;
      if (v.moves[i].ppUps) m.ppUps = v.moves[i].ppUps;
    });
    // An HP Up raises max HP; current HP goes up by the same amount.
    if (result.ev && record.hp > 0) record.hp += window.Party.maxHp(record) - v.maxhp;
    return result;
  }

  // Rare Candy: one level, as if from experience. Returns the moves learned at the new level.
  function levelUp(record) {
    const E = window.Experience;
    const oldMax = window.Party.maxHp(record);
    record.level = Math.min(E.MAX_LEVEL, record.level + 1);
    record.exp = Math.max(record.exp, E.expForLevel(E.growthRate(record.species), record.level));
    record.happiness = E.friendshipFromLevelUp(record.happiness);
    if (record.hp > 0) record.hp = Math.min(window.Party.maxHp(record), record.hp + window.Party.maxHp(record) - oldMax);
    return window.Party.movesLearnedAt(record, record.level);
  }

  // Held items: give swaps with whatever the Pokémon held. Returns the item it
  // was holding ("" if none); the caller moves items between bag and Pokémon.
  function give(record, item) {
    const old = record.item || "";
    record.item = item;
    return old;
  }
  function take(record) {
    const old = record.item || "";
    record.item = "";
    return old;
  }

  window.Bag = {
    POCKETS, PRICES, MART, name, description, sprite, price, sellPrice, pocket, isBall, isStone,
    isMachine, machineMove, machines, mintNature,
    martStock, canUseOn, useOn, levelUp, give, take
  };
})();
