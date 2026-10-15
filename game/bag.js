// Items in the bag: names, pockets, prices, the Poké Mart, and using or
// giving items outside battle (including TMs, PP Ups and mints)
// Depends on: window.ITEMS, window.ITEM_SPRITES, window.ItemUse, window.MOVES,
//             window.Party, window.Evolution, window.Experience
//
//   Bag.name("poke-ball")                 // "Poké Ball"
//   Bag.pocket("oran-berry")              // "Berries"
//   Bag.martStock(["poke-ball", ...])     // [{ item, price }] for a Mart's list
//   Bag.canUseOn(record, "fire-stone")    // true if it would do something
//   Bag.useOn(record, "potion")           // { healed: 20 } etc.

(function () {
  "use strict";

  const POCKETS = ["Items", "Medicine", "Poké Balls", "TMs & HMs", "Berries", "Key Items"];

  const SPECIAL_NAMES = {
    "poke-ball": "Poké Ball", "kings-rock": "King's Rock", "up-grade": "Up-Grade", "hp-up": "HP Up",
    "pp-up": "PP Up", "pp-max": "PP Max", "never-melt-ice": "Never-Melt Ice", "exp-share": "Exp. Share", "oaks-parcel": "Oak's Parcel", "ss-ticket": "S.S. Ticket",
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
    "pp-up": 9800, "pp-max": 29400,
    // Treasures from digging (they sell for half, as in Gen 6).
    "star-piece": 9800, "rare-bone": 10000, "heart-scale": 200, "red-shard": 400, "blue-shard": 400,
    "yellow-shard": 400, "green-shard": 400, "hard-stone": 200, "oval-stone": 2100,
    "nugget": 10000, "bluk-berry": 20
  };
  // Not in Gen 6 shops; priced for this game. Mints are from Sword and Shield.
  const MINT_PRICE = 20000;

  // ---------- TMs and HMs ----------
  // HMs cover every region's field moves: HM01 Cut, HM02 Fly, HM03 Surf,
  // HM04 Strength, HM05 Flash, HM06 Whirlpool, HM07 Waterfall, HM08 Rock Smash,
  // HM09 Dive, HM10 Defog, HM11 Rock Climb. TMs are X and Y's TM01-TM100 in
  // order, without the two that are HMs here (Flash, Rock Smash), then
  // Secret Power from Omega Ruby and Alpha Sapphire: TM01-TM99; then TM100 Bullet
  // Seed (FireRed's TM09, found in Mt. Moon), TM101 Water Pulse (FireRed's
  // TM03, Misty's) and TM102 Shock Wave (FireRed's TM34, Lt. Surge's). Which species can use a machine:
  // data/machine-learners.js adds other generations to X and Y's.
  // Like Gen 5+, TMs are reusable; HMs too, and with no field moves yet, HM
  // moves can be forgotten like any other.
  const isMachine = (item) => (window.ITEMS[item] || {}).category === "all-machines";
  const machineMove = (item) => {
    const m = isMachine(item) && /^Teaches (.+?) to a compatible/.exec(window.ITEMS[item].effect || "");
    return m ? m[1] : null;
  };
  function machineName(item) {
    const m = /^(tm|hm)(\d+)$/.exec(item);
    return m[1].toUpperCase() + m[2].padStart(2, "0") + " " + machineMove(item);
  }
  // Sorted TM01..TM100, then HM01..HM11.
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
  // Evolution stones and items all say the same; otherwise FireRed's own text
  // where it has the item (data/item-descriptions.js, its lines broken as
  // FireRed breaks them), else data/items.js's.
  const EVOLUTION_ITEM_TEXT = "Evolves certain Pok\u00e9mon\nwhen used.";
  const description = (item) => ((window.ITEMS[item] || {}).category === "evolution" ? EVOLUTION_ITEM_TEXT : "") ||
    (window.ITEM_DESCRIPTIONS && window.ITEM_DESCRIPTIONS[item]) ||
    (window.ITEMS[item] && window.ITEMS[item].effect) || "";
  const sprite = (item) => (window.ITEM_SPRITES && window.ITEM_SPRITES[item]) || "";
  const price = (item) => PRICES[item] || (isMachine(item) ? machinePrice(item) : mintNature(item) ? MINT_PRICE : 0);
  const sellPrice = (item) => Math.floor(price(item) / 2);

  const isBall = (item) => /balls$/.test((window.ITEMS[item] || {}).category || "") || /-ball$/.test(item);
  const isStone = (item) => Object.values(window.EVOLUTIONS).some((l) => l.some((e) => e.method === "item" && e.item === item));

  const isKeyItem = (item) => (window.ITEMS[item] || {}).category === "key-items";

  function pocket(item) {
    if (isKeyItem(item)) return "Key Items";
    if (isBall(item)) return "Poké Balls";
    if (isMachine(item)) return "TMs & HMs";
    if (/-berry$/.test(item)) return "Berries";
    const cat = (window.ITEMS[item] || {}).category;
    if (window.ItemUse.effect(item) || ["healing", "status-cures", "revival", "pp-recovery", "vitamins"].includes(cat)) return "Medicine";
    return "Items";
  }

  // A Poké Mart's shelves: each Mart sells its fixed FireRed list (from the
  // clerk's script, see tools/build-maps.js), at Gen 6 prices.
  function martStock(items) {
    return (items || []).filter((item) => price(item) > 0).map((item) => ({ item, price: price(item) }));
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
    POCKETS, PRICES, name, description, sprite, price, sellPrice, pocket, isBall, isStone, isKeyItem,
    isMachine, machineMove, machines, mintNature,
    martStock, canUseOn, useOn, levelUp, give, take
  };
})();
