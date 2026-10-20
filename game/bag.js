// Items in the bag: names, pockets, prices, the Poké Mart, and using or
// giving items outside battle (including TMs, PP Ups and mints)
// Depends on: window.ITEMS, window.ITEM_SPRITES, window.ItemUse, window.MOVES,
//             window.Party, window.Evolution, window.Experience
//
//   Bag.name("poke-ball")                 // "Poké Ball"
//   Bag.pocket("oran-berry")              // "Berries"
//   Bag.BATTLE_POCKETS                    // the pockets the Bag shows in battle
//   Bag.martStock(["poke-ball", ...])     // [{ item, price }] for a Mart's list
//   Bag.canUseOn(record, "fire-stone")    // true if it would do something
//   Bag.useOn(record, "potion")           // { healed: 20 } etc.

(function () {
  "use strict";

  // FireRed's Bag has three pockets; this game's has nine. Power-up holds
  // what makes a Pokémon stronger for good (vitamins, Wings, PP Ups, mints,
  // Rare Candy, Exp. Candies, Ability Capsules, Bottle Caps), Held Items what
  // a Pokémon holds to do its job (Leftovers, Choice items, type boosters,
  // weather rocks...), Mega Stones the stones. Old saves just sort again:
  // the bag is one list of items; the pockets are worked out from it.
  const POCKETS = ["Items", "Medicine", "Power-up", "Poké Balls", "TMs & HMs", "Berries", "Held Items", "Mega Stones", "Key Items"];

  const SPECIAL_NAMES = {
    "poke-ball": "Poké Ball", "kings-rock": "King's Rock", "up-grade": "Up-Grade", "hp-up": "HP Up",
    "pp-up": "PP Up", "pp-max": "PP Max", "never-melt-ice": "Never-Melt Ice", "exp-share": "Exp. Share", "oaks-parcel": "Oak's Parcel", "ss-ticket": "S.S. Ticket", "vs-seeker": "VS Seeker", "poke-flute": "Poké Flute", "guard-spec": "Guard Spec.",
    "x-accuracy": "X Accuracy", "x-attack": "X Attack", "x-defense": "X Defense", "x-speed": "X Speed",
    "x-sp-atk": "X Sp. Atk", "x-sp-def": "X Sp. Def", "poke-doll": "Poké Doll", "oddish-ball": "Oddish Ball",
    "exp-candy-xs": "Exp. Candy XS", "exp-candy-s": "Exp. Candy S", "exp-candy-m": "Exp. Candy M", "exp-candy-l": "Exp. Candy L",
    "exp-candy-xl": "Exp. Candy XL"
  };

  // Gen 6 Poké Mart prices. Items sell for half. Anything else can't be bought or sold.
  const PRICES = {
    "poke-ball": 200, "great-ball": 600, "ultra-ball": 1200, "net-ball": 1000, "nest-ball": 1000,
    "dusk-ball": 1000, "quick-ball": 1000, "timer-ball": 1000, "repeat-ball": 1000, "dive-ball": 1000,
    "luxury-ball": 1000, "heal-ball": 300, "premier-ball": 200,
    "x-attack": 500, "x-defense": 550, "x-sp-atk": 350, "x-sp-def": 350, "x-speed": 350, "x-accuracy": 950, "stardust": 2000,
    "potion": 300, "super-potion": 700, "hyper-potion": 1200, "max-potion": 2500, "full-restore": 3000,
    "revive": 1500, "max-revive": 4000, "antidote": 100, "paralyze-heal": 200, "awakening": 250,
    "burn-heal": 250, "ice-heal": 250, "full-heal": 600, "fresh-water": 200, "soda-pop": 300,
    "lemonade": 400, "moomoo-milk": 500, "ether": 1200, "max-ether": 2000, "elixir": 3000,
    "max-elixir": 4500, "rare-candy": 10000,
    "hp-up": 9800, "protein": 9800, "iron": 9800, "calcium": 9800, "zinc": 9800, "carbos": 9800,
    // (This game's own: Wings, from Celadon's vitamin counter, and Exp. Candies, from Tera Raids.)
    "health-wing": 300, "muscle-wing": 300, "resist-wing": 300, "genius-wing": 300, "clever-wing": 300, "swift-wing": 300,
    "exp-candy-xs": 200, "exp-candy-s": 1000, "exp-candy-m": 3000, "exp-candy-l": 10000, "exp-candy-xl": 30000,
    "fire-stone": 2100, "water-stone": 2100, "thunder-stone": 2100, "leaf-stone": 2100,
    "moon-stone": 2100, "sun-stone": 2100, "shiny-stone": 2100, "dusk-stone": 2100,
    "dawn-stone": 2100, "ice-stone": 2100, "everstone": 3000, "lucky-egg": 10000,
    "pp-up": 9800, "pp-max": 29400,
    // (FireRed's: without a price an item can't be bought, so a Mart that
    // stocks it leaves it out.)
    "guard-spec": 700, "dire-hit": 650,
    "repel": 350, "super-repel": 500, "max-repel": 700, "lure": 400, "super-lure": 700, "max-lure": 900, "escape-rope": 550, "poke-doll": 1000, "lava-cookie": 200,
    // Treasures from digging (they sell for half, as in Gen 6).
    "star-piece": 9800, "rare-bone": 10000, "heart-scale": 200, "red-shard": 400, "blue-shard": 400,
    "yellow-shard": 400, "green-shard": 400, "hard-stone": 200, "oval-stone": 2100,
    "nugget": 10000, "pearl": 1400, "big-pearl": 7500, "tiny-mushroom": 500, "big-mushroom": 5000, "razz-berry": 20, "nanab-berry": 20, "bluk-berry": 20,
    // Held items no shop sells, priced so they sell for Gen 6's ₽100.
    "smooth-rock": 200, "heat-rock": 200, "damp-rock": 200, "icy-rock": 200, "iron-ball": 200, "light-clay": 200,
    // Generation 8's evolution items, at Sword and Shield's prices (Legends:
    // Arceus's items and the scrolls, priced as the stones).
    "tart-apple": 2200, "sweet-apple": 2200, "cracked-pot": 1600, "chipped-pot": 38000, "galarica-cuff": 6000,
    "galarica-wreath": 6000, "strawberry-sweet": 500, "love-sweet": 500, "berry-sweet": 500, "clover-sweet": 500,
    "flower-sweet": 500, "star-sweet": 500, "ribbon-sweet": 500, "black-augurite": 2100, "peat-block": 2100,
    "scroll-of-darkness": 2100, "scroll-of-waters": 2100,
    // Generation 9's, at Scarlet and Violet's prices (the armors and Metal Alloy as the stones).
    "auspicious-armor": 3000, "malicious-armor": 3000, "syrupy-apple": 2200, "unremarkable-teacup": 1600, "metal-alloy": 3000
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
  // Berries sell by their tier (game/berry-picking.js's nine, Basic to
  // Legendary): from ₽50 up to ₽500 (this game's own; Poké Marts don't sell them).
  const BERRY_SELL = [50, 100, 150, 200, 250, 300, 350, 425, 500];
  function berrySellPrice(item) {
    const tiers = window.BerryPicking && window.BerryPicking.TIERS, i = tiers ? tiers.findIndex((t) => t.berries.includes(item)) : -1;
    return i >= 0 ? BERRY_SELL[i] : 0;
  }
  // Tera Shards (not sold anywhere): ₽1,000 each to a Poké Mart (this game's own).
  const TERA_SHARD_SELL = 500;
  const sellPrice = (item) => (/-berry$/.test(item) && berrySellPrice(item) ? berrySellPrice(item)
    : /-tera-shard$/.test(item) ? TERA_SHARD_SELL : Math.floor(price(item) / 2));

  // (By category: an Iron Ball, Light Ball or Smoke Ball is held, not thrown.)
  const isBall = (item) => /balls$/.test((window.ITEMS[item] || {}).category || "");
  const isStone = (item) => Object.values(window.EVOLUTIONS).some((l) => l.some((e) => e.method === "item" && e.item === item));

  const isKeyItem = (item) => (window.ITEMS[item] || {}).category === "key-items";

  const POWER_UP = ["vitamins", "nature-mints", "exp-candy", "dynamax-candy", "tera-shards"];
  const HELD = ["held-items", "type-enhancement", "choice", "plates", "jewels", "bad-held-items", "effort-training", "species-specific", "training",
    "z-crystals", "memories"];
  const isPowerUp = (item) => POWER_UP.includes((window.ITEMS[item] || {}).category) || /bottle-cap$/.test(item) || item === "ability-capsule" || item === "ability-patch";

  function pocket(item) {
    if (isKeyItem(item)) return "Key Items";
    if (isBall(item)) return "Poké Balls";
    if (isMachine(item)) return "TMs & HMs";
    if (/-berry$/.test(item)) return "Berries";
    const cat = (window.ITEMS[item] || {}).category;
    if (cat === "mega-stones") return "Mega Stones";
    if (isPowerUp(item)) return "Power-up";
    const eff = window.ItemUse.effect(item) || {};
    if (eff.boost || eff.battleEffect) return "Items";   // (the X items, Dire Hit, Guard Spec.)
    if (window.ItemUse.effect(item) || ["healing", "status-cures", "revival", "pp-recovery"].includes(cat)) return "Medicine";
    if (HELD.includes(cat)) return "Held Items";
    return "Items";
  }
  // In battle the Bag shows only the pockets with something that can be used
  // there (Items for the X items, Medicine, Poké Balls, Berries).
  const usableInBattle = (item) => isBall(item) || (!!window.ItemUse.effect(item) && !window.ItemUse.effect(item).outOfBattle);
  let battlePockets = null;
  const BATTLE_POCKETS = () => battlePockets ||
    (battlePockets = POCKETS.filter((p) => Object.keys(window.ITEMS).some((id) => usableInBattle(id) && pocket(id) === p)));

  // A Poké Mart's shelves: each Mart sells its fixed FireRed list (from the
  // clerk's script, see tools/build-maps.js), at Gen 6 prices; and where it
  // sells a Repel, the Lure of the same kind beside it (this game's own).
  const LURES = { "repel": "lure", "super-repel": "super-lure", "max-repel": "max-lure" };
  function martStock(items) {
    items = [].concat(...(items || []).map((item) => (LURES[item] && !items.includes(LURES[item]) ? [item, LURES[item]] : [item])));
    return items.filter((item) => price(item) > 0).map((item) => ({ item, price: price(item) }));
  }

  // ---------- Using items on party records ----------

  // The shape engine/item-use.js expects, built from a record.
  function view(record) {
    return {
      hp: record.hp, maxhp: window.Party.maxHp(record), status: record.status, fainted: record.hp <= 0,
      confused: false, evs: record.evs, level: record.level, happiness: record.happiness,
      moves: record.moves.map((m) => ({ pp: m.pp, maxpp: window.Party.maxPp(m), base: window.MOVES[m.name].pp, ppUps: m.ppUps || 0 }))
    };
  }

  // The Ability Capsule (Gen 6): the other of a species' two ordinary
  // Abilities, or null (one Ability only, or its Hidden Ability).
  function capsuleAbility(record) {
    const abilities = (window.DEX[record.species] || {}).abilities || [];
    if (abilities.length < 2 || !abilities.includes(record.ability)) return null;
    return abilities.find((a) => a !== record.ability) || null;
  }
  // The Ability Patch (as in Scarlet and Violet): from an ordinary Ability to
  // the species' Hidden Ability, or from the Hidden Ability back to its first
  // ordinary one. Null if it has no Hidden Ability (or only that one).
  function patchAbility(record) {
    const dex = window.DEX[record.species] || {};
    const hidden = dex.hiddenAbility, abilities = dex.abilities || [];
    if (!hidden || abilities.includes(hidden)) return null;
    if (record.ability === hidden) return abilities[0] || null;
    return abilities.includes(record.ability) ? hidden : null;
  }
  // The Zygarde Cube (Sun and Moon): Zygarde between its 10% and 50% Formes
  // ("forme"), or Aura Break and Power Construct ("ability").
  const ZYGARDE = { Zygarde: "Zygarde-10%", "Zygarde-10%": "Zygarde" };
  function zygardeCube(record, what) {
    if (!ZYGARDE[record.species]) return null;
    if (what === "ability") {
      record.ability = record.ability === "Power Construct" ? "Aura Break" : "Power Construct";
      return { ability: record.ability };
    }
    const oldMax = window.Party.maxHp(record);
    record.species = ZYGARDE[record.species];
    // (The HP it's down stays down, as an evolution keeps it.)
    if (record.hp > 0) record.hp = Math.max(1, window.Party.maxHp(record) - (oldMax - record.hp));
    return { species: record.species };
  }
  // Bottle Caps (Hyper Training, as in Sword and Shield and Scarlet and
  // Violet: from Lv. 50): a stat's IV is 31 from then on (in those games it only
  // acts as 31; here the IV itself changes). A Bottle Cap
  // trains one stat, a Gold Bottle Cap all six. The stats a cap would train.
  const HYPER_TRAINING_LEVEL = 50;
  function trainableStats(record) {
    if (record.level < HYPER_TRAINING_LEVEL) return [];
    return window.Party.STAT_KEYS.filter((k) => (record.ivs[k] | 0) < 31 && !(record.hyper || []).includes(k));
  }
  // A Tin Bottle Cap (Legends: Z-A's): a stat's IV down to 0 (for Trick Room
  // and Gyro Ball), at any level. The stats it would lower.
  const lowerableStats = (record) => window.Party.STAT_KEYS.filter((k) => (record.ivs[k] | 0) > 0);

  // Tera Shards (Scarlet and Violet's): TERA_SHARDS_NEEDED of a type change a
  // Pokémon's Tera Type to it (not Ogerpon's or Terapagos's). The type, or null.
  const TERA_SHARDS_NEEDED = 50;
  const teraShardType = (item) => { const m = /^([a-z]+)-tera-shard$/.exec(item); return m ? m[1][0].toUpperCase() + m[1].slice(1) : null; };

  // Would `item` do anything to `record` outside battle? opts: { move, party, stat }
  function canUseOn(record, item, opts) {
    opts = opts || {};
    if (record.egg) return false;
    if (teraShardType(item)) return !/^(Ogerpon|Terapagos)/.test(record.species) && window.Party.teraType(record) !== teraShardType(item);
    if (item === "ability-capsule") return !!capsuleAbility(record);
    if (item === "ability-patch") return !!patchAbility(record);
    if (item === "zygarde-cube") return !!ZYGARDE[record.species];
    if (item === "dynamax-candy") return (record.dynamaxLevel || 0) < 10;
    if (item === "max-mushrooms") return !!window.DEX[record.species + "-Gmax"];
    if (item === "bottle-cap") return opts.stat ? trainableStats(record).includes(opts.stat) : trainableStats(record).length > 0;
    if (item === "gold-bottle-cap") return trainableStats(record).length > 0;
    if (item === "tin-bottle-cap") return opts.stat ? lowerableStats(record).includes(opts.stat) : lowerableStats(record).length > 0;
    if (isStone(item)) return !!window.Evolution.find(record, { trigger: "item", item, party: opts.party });
    if (isMachine(item)) return window.Party.canLearnMachine(record, machineMove(item)) && !window.Party.knowsMove(record, machineMove(item));
    if (mintNature(item)) return record.nature !== mintNature(item);
    return window.ItemUse.canUse(view(record), item, { move: opts.move });
  }

  // Applies an HP / status / PP / vitamin item. Evolution stones and Rare Candy
  // go through levelUp() and the evolution flow in the UI instead.
  function useOn(record, item, opts) {
    if (item === "dynamax-candy") { record.dynamaxLevel = (record.dynamaxLevel || 0) + 1; return { level: record.dynamaxLevel }; }
    if (item === "max-mushrooms") { record.gmax = !record.gmax; return { gmax: record.gmax }; }
    if (item === "ability-capsule") {
      const old = record.ability;
      record.ability = capsuleAbility(record);
      return { ability: record.ability, oldAbility: old };
    }
    if (item === "ability-patch") {
      const old = record.ability;
      record.ability = patchAbility(record);
      return { ability: record.ability, oldAbility: old };
    }
    if (item === "bottle-cap" || item === "gold-bottle-cap") {
      const oldMax = window.Party.maxHp(record);
      const stats = item === "gold-bottle-cap" ? trainableStats(record) : [opts.stat];
      // (The IV itself becomes 31 too, breeding and all: this game's own.)
      record.hyper = (record.hyper || []).concat(stats);
      for (const k of stats) record.ivs[k] = 31;
      // (A trained HP raises max HP; current HP goes up by the same amount.)
      if (record.hp > 0) record.hp += window.Party.maxHp(record) - oldMax;
      return { trained: stats };
    }
    if (item === "tin-bottle-cap") {
      const oldMax = window.Party.maxHp(record);
      record.ivs[opts.stat] = 0;
      record.hyper = (record.hyper || []).filter((k) => k !== opts.stat);
      if (record.hp > 0) record.hp = Math.max(1, record.hp + window.Party.maxHp(record) - oldMax);
      return { lowered: opts.stat };
    }
    if (mintNature(item)) {
      const old = record.nature;
      record.nature = mintNature(item);
      return { nature: record.nature, oldNature: old };
    }
    const v = view(record);
    const result = window.ItemUse.apply(v, item, opts);
    // (Vitamins and PP Ups please it; the bitter herbs don't.)
    if (result.friendship) window.Party.adjustFriendship(record, result.friendship, opts && opts.here);
    record.hp = v.hp;
    record.status = v.status;
    record.moves.forEach((m, i) => {
      m.pp = v.moves[i].pp;
      if (v.moves[i].ppUps) m.ppUps = v.moves[i].ppUps;
    });
    // An HP Up raises max HP; current HP goes up by the same amount (a Pomeg
    // Berry lowers it, down by as much, but not to fainting).
    if ((result.ev || result.evDown) && record.hp > 0) record.hp = Math.max(1, record.hp + window.Party.maxHp(record) - v.maxhp);
    return result;
  }

  // Rare Candy: one level, as if from experience. Returns the moves learned at the new level.
  // opts: { here (the map you're on, for friendship), noFriendship (the Day-Care's levels) }
  function levelUp(record, opts) {
    opts = opts || {};
    const E = window.Experience;
    const oldMax = window.Party.maxHp(record);
    record.level = Math.min(E.MAX_LEVEL, record.level + 1);
    record.exp = Math.max(record.exp, E.expForLevel(E.growthRate(record.species), record.level));
    if (!opts.noFriendship) window.Party.adjustFriendship(record, "levelUp", opts.here);
    if (record.hp > 0) record.hp = Math.min(window.Party.maxHp(record), record.hp + window.Party.maxHp(record) - oldMax);
    return window.Party.movesLearnedAt(record, record.level);
  }

  // An Exp. Candy: its Exp. Points, and the levels they bring, each as if
  // from Rare Candy. Returns { exp, levels: [{ level, moves }] }.
  // (opts.cap: no further than that level, the level caps' Player.levelCap.)
  function expCandy(record, item, opts) {
    opts = opts || {};
    const E = window.Experience, rate = E.growthRate(record.species), top = Math.min(E.MAX_LEVEL, opts.cap || E.MAX_LEVEL);
    const before = record.exp;
    record.exp = Math.min(E.expForLevel(rate, top), record.exp + window.ItemUse.effect(item).expCandy);
    const levels = [];
    while (record.level < top && record.exp >= E.expForLevel(rate, record.level + 1)) {
      levels.push({ level: record.level + 1, moves: levelUp(record, opts) });
    }
    return { exp: record.exp - before, levels };
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
    POCKETS, get BATTLE_POCKETS() { return BATTLE_POCKETS(); }, PRICES, name, description, sprite, price, sellPrice, pocket, isBall, isStone, isKeyItem,
    isMachine, machineMove, machines, mintNature, capsuleAbility, patchAbility, trainableStats, lowerableStats, HYPER_TRAINING_LEVEL, zygardeCube,
    martStock, canUseOn, useOn, levelUp, expCandy, give, take, teraShardType, TERA_SHARDS_NEEDED
  };
})();
