// Wild Pokémon and trainers, scaled to the player's party
// Depends on: window.DEX, window.EVOLUTIONS, window.LEARNSETS_GEN6, window.Party
//
//   Encounters.wild(partyLevel)       // -> a party record for a wild Pokémon
//   Encounters.trainer(partyLevel)    // -> { name, team: [records] }
//   Encounters.withHeldItem(record, lead)   // a wild Pokémon holding what it rolls (data/wild-items.js)
//
// A species can appear from its "minimum level": 1 for a base form, its
// evolution level for level-up evolutions, the same as its pre-evolution for
// friendship evolutions (so Pikachu shows up as early as Pichu), and 20 levels
// later for stone, trade and other evolutions. Legendary and mythical Pokémon
// never appear.

(function () {
  "use strict";

  const LEGENDARY_EGG_STEPS = 20480;   // every legendary and mythical has at least this
  const LATE_EVOLUTION_GAP = 20;
  const TRAINER_NAMES = [
    "Youngster Ben", "Lass Amy", "Bug Catcher Rick", "Hiker Doug", "Fisherman Ned",
    "Picnicker Rosa", "Camper Leo", "Ace Trainer Vera", "Swimmer Kai", "Psychic Iris"
  ];

  let minLevels = null;

  function buildMinLevels() {
    const prevo = {};
    for (const [from, list] of Object.entries(window.EVOLUTIONS)) {
      for (const e of list) if (!prevo[e.into]) prevo[e.into] = { from, e };
    }
    const memo = {};
    const minLevel = (species) => {
      if (memo[species] != null) return memo[species];
      const p = prevo[species];
      let lvl = 1;
      if (p) {
        const base = minLevel(p.from);
        if (p.e.method === "level" || p.e.method === "shed") lvl = Math.max(base, p.e.level || 1);
        else if (p.e.method === "friendship") lvl = base;
        else lvl = base + LATE_EVOLUTION_GAP;
      }
      return (memo[species] = lvl);
    };
    const out = {};
    for (const [name, dex] of Object.entries(window.DEX)) {
      // Alternate formes only when something evolves into them (Wormadam's cloaks).
      if ((dex.id >= 10000 && !prevo[name]) || dex.baseEggSteps >= LEGENDARY_EGG_STEPS) continue;
      if (!window.LEARNSETS_GEN6[name]) continue;
      out[name] = minLevel(name);
    }
    return out;
  }

  // Species that can appear at `level`.
  function speciesFor(level) {
    if (!minLevels) minLevels = buildMinLevels();
    return Object.keys(minLevels).filter((s) => minLevels[s] <= level);
  }

  const clampLevel = (n) => Math.max(2, Math.min(100, n));
  const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

  // A wild Pokémon a little below the party's level.
  function wild(partyLevel, rng) {
    rng = rng || Math.random;
    const level = clampLevel(partyLevel - randInt(rng, 0, 3));
    return window.Party.create(pick(speciesFor(level), rng), level, { rng });
  }

  // A trainer with 1-3 Pokémon around the party's level.
  function trainer(partyLevel, rng) {
    rng = rng || Math.random;
    const size = randInt(rng, 1, 3);
    const team = [];
    while (team.length < size) {
      const level = clampLevel(partyLevel + randInt(rng, -2, 0));
      const species = pick(speciesFor(level), rng);
      if (team.some((r) => r.species === species)) continue;
      team.push(window.Party.create(species, level, { rng }));
    }
    return { name: pick(TRAINER_NAMES, rng), team };
  }

  // What a wild Pokémon is holding (data/wild-items.js: FireRed's, else
  // Emerald's): as SetWildMonHeldItem, 45% nothing, 50% the common item and
  // 5% the rare one; with a lead Pokémon with Compound Eyes (as in Emerald),
  // 20% nothing, 60% common and 20% rare; both the same item, always that.
  // -> an item id, or "".
  function heldItem(species, rng, compoundEyes) {
    const items = (window.WILD_ITEMS || {})[species];
    if (!items) return "";
    const [common, rare] = items;
    if (common === rare) return common || "";
    const r = Math.floor((rng || Math.random)() * 100);
    const none = compoundEyes ? 20 : 45, notRare = compoundEyes ? 80 : 95;
    return (r < none ? "" : r < notRare ? common : rare) || "";
  }
  // A wild Pokémon's record, holding what it rolls (`lead`: your lead Pokémon's record, for Compound Eyes).
  function withHeldItem(record, lead, rng) {
    record.item = heldItem(record.species, rng, !!lead && lead.ability === "Compound Eyes");
    return record;
  }

  // ---------- The lead Pokémon's abilities outside of battle ----------
  //
  // As the latest games that have them (Sword and Shield, Scarlet and Violet)
  // do: `lead` is your first Pokémon that's neither an Egg nor fainted.
  //
  // How often wild Pokémon appear: Stench, White Smoke, Quick Feet and
  // Infiltrator halve it; Illuminate, Arena Trap and No Guard double it.
  const RATE_HALF = ["Stench", "White Smoke", "Quick Feet", "Infiltrator"];
  const RATE_DOUBLE = ["Illuminate", "Arena Trap", "No Guard"];
  function leadRateScale(lead) {
    if (!lead) return 1;
    return RATE_HALF.includes(lead.ability) ? 0.5 : RATE_DOUBLE.includes(lead.ability) ? 2 : 1;
  }
  // Which wild Pokémon turns up (`mon`: World.pickWild's { species, level,
  // slot }; `table`: the map's table it came from, { slots }): Static and
  // Lightning Rod make it an Electric type half the time, Magnet Pull a Steel
  // type, Flash Fire a Fire type, Storm Drain a Water type, Harvest a Grass
  // type, if the table has one; Keen Eye and Intimidate turn away half the
  // Pokémon five or more levels below the lead's; Hustle, Pressure and Vital
  // Spirit make it its slot's highest level half the time. -> mon or null.
  const TYPE_LURES = { "Static": "Electric", "Lightning Rod": "Electric", "Magnet Pull": "Steel", "Flash Fire": "Fire", "Storm Drain": "Water", "Harvest": "Grass" };
  const slotSpecies = (s) => [s.species, s.morning, s.night, s.alt, s.altMorning, s.altNight].filter((k, i, all) => k && all.indexOf(k) === i);
  const hasType = (species, type) => !!window.DEX[species] && window.DEX[species].types.includes(type);
  function leadWild(mon, lead, table, rng) {
    if (!mon || !lead) return mon;
    rng = rng || Math.random;
    const a = lead.ability, slots = (table && table.slots) || [];
    if (TYPE_LURES[a] && rng() < 0.5) {
      const found = [];
      slots.forEach((s, i) => slotSpecies(s).forEach((sp) => { if (hasType(sp, TYPE_LURES[a])) found.push([i, sp]); }));
      if (found.length) {
        const [slot, species] = found[Math.floor(rng() * found.length)], s = slots[slot];
        mon = { species, level: s.min + Math.floor(rng() * (s.max - s.min + 1)), slot };
      }
    }
    if ((a === "Keen Eye" || a === "Intimidate") && mon.level <= lead.level - 5 && rng() < 0.5) return null;
    if ((a === "Hustle" || a === "Pressure" || a === "Vital Spirit") && slots[mon.slot] && rng() < 0.5) mon.level = slots[mon.slot].max;
    return mon;
  }
  // What it's like (`record`: its Party record): Synchronize gives it the
  // lead's nature; Cute Charm makes it the opposite gender two times in three.
  function leadRecord(record, lead, rng) {
    if (!record || !lead) return record;
    rng = rng || Math.random;
    if (lead.ability === "Synchronize" && window.NATURES[lead.nature]) record.nature = lead.nature;
    if (lead.ability === "Cute Charm" && record.gender !== "N" && (lead.gender === "M" || lead.gender === "F") && rng() < 2 / 3)
      record.gender = lead.gender === "M" ? "F" : "M";
    return record;
  }

  // Pickup, as Scarlet and Violet have it: after a battle, each of your
  // Pokémon with Pickup that holds nothing has a one-in-ten chance of picking
  // up an item, by its level. (Only the first row, Lv. 1-10, is checked against
  // Serebii's; the others are this game's own rendering of theirs, to be checked.)
  const PICKUP = [
    [["potion", 35], ["tiny-mushroom", 20], ["super-potion", 15], ["poke-doll", 10], ["full-heal", 10], ["revive", 3], ["hyper-potion", 3], ["ether", 1], ["big-mushroom", 3]],   // (Lv. 1-10: Serebii's, checked)
    [["full-heal", 20], ["super-potion", 20], ["potion", 15], ["big-mushroom", 15], ["tiny-mushroom", 10], ["hyper-potion", 7], ["ether", 5], ["revive", 4], ["nugget", 3], ["rare-candy", 1]],
    [["full-heal", 20], ["super-potion", 15], ["hyper-potion", 15], ["big-mushroom", 10], ["ether", 10], ["revive", 10], ["max-ether", 8], ["nugget", 6], ["max-potion", 5], ["rare-candy", 1]],
    [["full-heal", 20], ["hyper-potion", 20], ["super-potion", 10], ["big-mushroom", 10], ["revive", 10], ["max-ether", 10], ["nugget", 8], ["max-potion", 7], ["rare-candy", 3], ["pp-up", 2]],
    [["hyper-potion", 20], ["full-heal", 15], ["max-potion", 15], ["revive", 10], ["max-ether", 10], ["big-mushroom", 10], ["nugget", 8], ["elixir", 7], ["rare-candy", 3], ["pp-up", 2]],
    [["max-potion", 20], ["hyper-potion", 15], ["full-heal", 15], ["max-ether", 10], ["revive", 10], ["elixir", 10], ["nugget", 8], ["full-restore", 5], ["rare-candy", 4], ["pp-up", 3]],
    [["max-potion", 20], ["full-restore", 15], ["full-heal", 10], ["max-ether", 10], ["revive", 10], ["elixir", 10], ["nugget", 10], ["max-revive", 5], ["rare-candy", 5], ["pp-up", 5]],
    [["full-restore", 20], ["max-potion", 15], ["elixir", 15], ["max-revive", 10], ["revive", 10], ["nugget", 10], ["max-elixir", 5], ["pp-max", 5], ["rare-candy", 5], ["pp-up", 5]],
    [["full-restore", 25], ["max-revive", 15], ["elixir", 10], ["max-elixir", 10], ["max-potion", 10], ["nugget", 10], ["pp-max", 5], ["rare-candy", 5], ["pp-up", 5], ["big-mushroom", 5]],
    [["full-restore", 25], ["max-revive", 15], ["max-elixir", 15], ["nugget", 15], ["rare-candy", 10], ["elixir", 5], ["pp-up", 5], ["pp-max", 5], ["max-potion", 5]]
  ];
  const PICKUP_CHANCE = 0.1;
  function pickupItem(level, rng) {
    const row = PICKUP[Math.min(PICKUP.length - 1, Math.max(0, Math.floor((level - 1) / 10)))];
    let roll = (rng || Math.random)() * 100;
    for (const [item, pct] of row) { if (roll < pct) return item; roll -= pct; }
    return row[0][0];
  }
  // -> [[record, item]] for each of `party` that picked something up (it holds it now).
  function pickup(party, rng) {
    rng = rng || Math.random;
    const out = [];
    for (const r of party || []) {
      if (r.egg || r.ability !== "Pickup" || r.item || rng() >= PICKUP_CHANCE) continue;
      r.item = pickupItem(r.level, rng);
      out.push([r, r.item]);
    }
    return out;
  }

  window.Encounters = { speciesFor, wild, trainer, heldItem, withHeldItem, minLevel: (s) => (minLevels || (minLevels = buildMinLevels()))[s],
    leadRateScale, leadWild, leadRecord, pickup, pickupItem, PICKUP, PICKUP_CHANCE, RATE_HALF, RATE_DOUBLE, TYPE_LURES };
})();
