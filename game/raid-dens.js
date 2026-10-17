// Tera Raid dens (this game's own, after Scarlet and Violet's Tera Raid
// Battles and Sword and Shield's dens): twelve dens around Kanto, each of
// one type. A den sleeps until you use a Lure on it; then it glows with a
// Tera Raid of 1 to 5 stars (the more Badges you have, the more stars it can
// have, and the stronger the Lure, the likelier the higher ones), until you
// win it. The Tera Raid Pokémon is Terastallized into the den's type, with
// more HP the more stars, and must be beaten within a number of turns;
// beaten, it gives money, Exp. Candies, vitamins, Berries and Tera Shards of
// the den's type (more and better the more stars), and you may catch it.
// Depends on: window.WORLD_MAPS, window.DEX, window.ITEMS, window.Party (when used).
//
//   RaidDens.DENS                        // [{ id, map, x, y, type }]
//   RaidDens.byScript(script)            // the den a map person's script is ("RaidDen_<id>"), or null
//   RaidDens.active(flags, id)           // the raid glowing in den `id` ({ stars, species, level }), or null
//   RaidDens.maxStars(badges)            // the most stars a raid can have with that many Badges
//   RaidDens.rollStars(lure, badges, rng)  // a raid's stars, from the Lure used
//   RaidDens.start(flags, den, lure, badges, rng)  // use a Lure on a den: its raid, now glowing
//   RaidDens.boss(den, raid, rng)        // the Tera Raid Pokémon, a party record (Terastallizes as soon as it's out)
//   RaidDens.HP / LEVELS / IVS / TURNS   // by stars (index 1-5)
//   RaidDens.rewards(stars, rng, type)   // { money, items: [[id, count], ...] } (with the den type's Tera Shards)
//   RaidDens.finish(flags, id)           // won: the den sleeps again
//
// player.flags.raidDens: { [den id]: { stars, species, level } } while it glows.

(function () {
  "use strict";

  // [id, map, x, y, type]. The Fighting den is in the Fighting Dojo's back
  // room (tools/build-dojo-den-room.js, data/dojo-den-room.js), which opens
  // once you've beaten its Karate Master.
  const DENS = [
    ["route1", "Route1", 5, 8, "Normal"],
    ["viridianForest", "ViridianForest", 13, 8, "Bug"],
    ["seafoam", "SeafoamIslands_1F", 4, 17, "Ice"],
    ["powerPlant", "PowerPlant", 2, 10, "Electric"],
    ["dojo", "SaffronCity_Dojo_DenRoom", 6, 5, "Fighting"],
    ["mtMoon", "MtMoon_1F", 34, 19, "Rock"],
    ["rockTunnel", "RockTunnel_1F", 12, 21, "Ground"],
    ["route25", "Route25", 62, 8, "Water"],
    ["route18", "Route18", 12, 3, "Flying"],
    ["cinnabar", "CinnabarIsland", 18, 13, "Fire"],
    ["lavender", "LavenderTown", 16, 8, "Ghost"],
    ["indigo", "IndigoPlateau_Exterior", 4, 10, "Steel"]
  ].map(([id, map, x, y, type]) => ({ id, map, x, y, type, script: "RaidDen_" + id }));
  const byScript = (script) => DENS.find((d) => d.script === script) || null;

  // Each den on its map: a person who doesn't move, drawn as the den
  // (assets/world/sprites/raid_den.png; raid_den_active.png while it glows).
  for (const d of DENS) {
    const m = window.WORLD_MAPS && window.WORLD_MAPS[d.map];
    if (!m || m.people.some((p) => p.script === d.script)) continue;
    m.people.push({ id: 900 + DENS.indexOf(d), x: d.x, y: d.y, movement: "face_down", rangeX: 0, rangeY: 0, script: d.script,
      flag: null, text: null, localId: "LOCALID_RAID_DEN", sprite: "raid_den", width: 16, height: 32, frames: 1 });
  }

  // By stars (1-5; index 0 unused): the Badges a raid needs, its Pokémon's
  // level (and up to 3 more), IVs, HP (times its usual)...
  const BADGES = [0, 0, 2, 4, 6, 8];
  const LEVELS = [0, 12, 20, 35, 50, 65];
  const IVS = [0, 10, 15, 20, 25, 31];
  const HP = [0, 1.5, 2, 2.5, 3, 4];
  // ...and the turns you have to win it (as Scarlet and Violet's raids have a
  // time limit), more for the bigger ones.
  const TURNS = [0, 10, 10, 12, 15, 20];
  const maxStars = (badges) => BADGES.reduce((n, need, s) => (s && badges >= need ? s : n), 1);

  // How likely each number of stars is, by Lure (before the Badges rule some out).
  const LURE_ODDS = {
    "lure": [0, 50, 30, 15, 4, 1],
    "super-lure": [0, 20, 35, 28, 12, 5],
    "max-lure": [0, 5, 15, 30, 30, 20]
  };
  function rollStars(lure, badges, rng) {
    rng = rng || Math.random;
    const odds = (LURE_ODDS[lure] || LURE_ODDS.lure).map((w, s) => (s && s <= maxStars(badges) ? w : 0));
    let r = rng() * odds.reduce((a, b) => a + b, 0);
    for (let s = 1; s <= 5; s++) if ((r -= odds[s]) < 0) return s;
    return maxStars(badges);
  }

  // The Pokémon each den's raids can bring, by type and stars: Kanto's own
  // (Bulbasaur to Mew, no legendaries or starters), their regional forms
  // (Alolan Sandshrew, Hisuian Growlithe, ...), and the evolutions later
  // generations gave them (Scizor, Magnezone, Crobat, Perrserker, ...).
  const POOLS = {
    Normal: [["Rattata", "Meowth", "Eevee", "Pidgey", "Jigglypuff"], ["Raticate", "Lickitung", "Doduo", "Farfetch'd", "Chansey"],
      ["Persian", "Kangaskhan", "Tauros", "Wigglytuff", "Porygon"], ["Snorlax", "Porygon2", "Lickilicky", "Kangaskhan", "Dodrio"],
      ["Snorlax", "Blissey", "Porygon-Z", "Tauros", "Lickilicky"]],
    Bug: [["Caterpie", "Weedle", "Paras", "Venonat"], ["Metapod", "Kakuna", "Paras", "Venonat"],
      ["Butterfree", "Beedrill", "Parasect", "Venomoth"], ["Scyther", "Pinsir", "Scizor", "Kleavor"],
      ["Scizor", "Kleavor", "Pinsir"]],
    Ice: [["Seel", "Shellder", "Vulpix-Alola", "Sandshrew-Alola"], ["Dewgong", "Jynx", "Vulpix-Alola", "Sandshrew-Alola"],
      ["Dewgong", "Cloyster", "Jynx", "Sandslash-Alola", "Ninetales-Alola"], ["Lapras", "Cloyster", "Ninetales-Alola", "Glaceon", "Sandslash-Alola"],
      ["Lapras", "Cloyster", "Glaceon", "Ninetales-Alola"]],
    Electric: [["Pikachu", "Voltorb", "Magnemite", "Voltorb-Hisui"], ["Magneton", "Electabuzz", "Pikachu", "Voltorb"],
      ["Raichu", "Electrode", "Electabuzz", "Jolteon", "Raichu-Alola"], ["Magnezone", "Electivire", "Jolteon", "Electrode-Hisui", "Raichu"],
      ["Magnezone", "Electivire", "Raichu-Alola", "Jolteon"]],
    Fighting: [["Machop", "Mankey"], ["Machoke", "Primeape", "Farfetch'd-Galar"],
      ["Hitmonlee", "Hitmonchan", "Primeape", "Machoke", "Poliwrath"], ["Machamp", "Poliwrath", "Hitmonlee", "Hitmonchan", "Annihilape"],
      ["Machamp", "Annihilape", "Poliwrath", "Hitmonlee", "Hitmonchan"]],
    Rock: [["Geodude", "Onix", "Omanyte", "Kabuto"], ["Graveler", "Omanyte", "Kabuto", "Rhyhorn", "Geodude-Alola"],
      ["Golem", "Omastar", "Kabutops", "Rhydon", "Graveler-Alola"], ["Aerodactyl", "Rhyperior", "Golem", "Omastar", "Kabutops"],
      ["Aerodactyl", "Rhyperior", "Golem-Alola", "Omastar", "Kabutops"]],
    Ground: [["Diglett", "Sandshrew", "Cubone", "Rhyhorn"], ["Dugtrio", "Sandslash", "Marowak", "Rhyhorn"],
      ["Rhydon", "Marowak", "Nidoqueen", "Nidoking", "Dugtrio"], ["Rhyperior", "Nidoqueen", "Nidoking", "Golem", "Marowak"],
      ["Rhyperior", "Nidoking", "Nidoqueen", "Golem"]],
    Water: [["Psyduck", "Poliwag", "Horsea", "Goldeen", "Krabby"], ["Staryu", "Krabby", "Seel", "Poliwhirl", "Shellder", "Tentacool"],
      ["Golduck", "Kingler", "Starmie", "Seaking", "Vaporeon", "Tentacruel"], ["Gyarados", "Lapras", "Vaporeon", "Kingdra", "Starmie"],
      ["Gyarados", "Kingdra", "Lapras", "Vaporeon"]],
    Flying: [["Pidgey", "Spearow", "Zubat", "Doduo"], ["Pidgeotto", "Fearow", "Golbat", "Farfetch'd", "Doduo"],
      ["Pidgeotto", "Fearow", "Dodrio", "Golbat", "Farfetch'd"], ["Pidgeot", "Aerodactyl", "Crobat", "Dodrio", "Dragonite"],
      ["Pidgeot", "Dragonite", "Crobat", "Aerodactyl"]],
    Fire: [["Vulpix", "Growlithe", "Ponyta", "Growlithe-Hisui"], ["Ponyta", "Growlithe", "Vulpix", "Magmar", "Growlithe-Hisui"],
      ["Ninetales", "Rapidash", "Magmar", "Flareon", "Marowak-Alola"], ["Arcanine", "Magmortar", "Flareon", "Ninetales", "Arcanine-Hisui"],
      ["Arcanine", "Magmortar", "Arcanine-Hisui", "Rapidash", "Flareon"]],
    // (Kanto has only the Gastly line for Ghost: the eerie ones beside it.)
    Ghost: [["Gastly", "Zubat", "Drowzee", "Cubone"], ["Gastly", "Haunter", "Golbat", "Cubone", "Drowzee"],
      ["Haunter", "Hypno", "Golbat", "Marowak", "Marowak-Alola"], ["Gengar", "Haunter", "Crobat", "Marowak-Alola", "Hypno"],
      ["Gengar", "Crobat", "Marowak-Alola", "Hypno"]],
    Steel: [["Magnemite", "Diglett-Alola", "Sandshrew-Alola", "Onix"], ["Magneton", "Onix", "Dugtrio-Alola", "Sandslash-Alola", "Meowth-Galar"],
      ["Magneton", "Steelix", "Dugtrio-Alola", "Sandslash-Alola", "Perrserker"], ["Magnezone", "Steelix", "Scizor", "Perrserker"],
      ["Magnezone", "Steelix", "Scizor"]]
  };
  // (Kanto's: Bulbasaur to Mew, their regional forms, and their later evolutions.)
  const KANTO_LATER = ["Crobat", "Bellossom", "Politoed", "Slowking", "Steelix", "Scizor", "Kingdra", "Porygon2", "Porygon-Z", "Espeon",
    "Umbreon", "Leafeon", "Glaceon", "Sylveon", "Blissey", "Magnezone", "Lickilicky", "Rhyperior", "Tangrowth", "Electivire", "Magmortar",
    "Kleavor", "Annihilape", "Perrserker", "Sirfetch'd", "Mr. Rime"];
  const isKanto = (sp) => !!window.DEX[sp] && (window.DEX[sp].id <= 151 || KANTO_LATER.includes(sp) ||
    (/-(Alola|Galar|Hisui)$/.test(sp) && (window.DEX[sp.replace(/-(Alola|Galar|Hisui)$/, "")] || {}).id <= 151));
  // A few raid Pokémon whose own moves are too few to make a battle of it:
  // what their pre-evolutions can learn (Caterpie's Tackle, Weedle's Poison Sting).
  const RAID_MOVES = { Metapod: ["Tackle", "String Shot", "Harden"], Kakuna: ["Poison Sting", "String Shot", "Harden"] };

  const active = (flags, id) => (flags.raidDens && flags.raidDens[id]) || null;
  // A Lure on a sleeping den: a raid of rolled stars, a Pokémon from its pool, its level.
  function start(flags, den, lure, badges, rng) {
    rng = rng || Math.random;
    const stars = rollStars(lure, badges, rng), pool = POOLS[den.type][stars - 1];
    const raid = { stars, species: pool[Math.floor(rng() * pool.length)], level: LEVELS[stars] + Math.floor(rng() * 4) };
    (flags.raidDens || (flags.raidDens = {}))[den.id] = raid;
    return raid;
  }
  function finish(flags, id) {
    if (flags.raidDens) delete flags.raidDens[id];
  }
  // The Tera Raid Pokémon: Terastallized into the den's type as soon as it's out.
  function boss(den, raid, rng) {
    const r = window.Party.create(raid.species, raid.level, Object.assign({ ivs: IVS[raid.stars], rng },
      RAID_MOVES[raid.species] ? { moves: RAID_MOVES[raid.species] } : {}));
    return Object.assign(r, { teraType: den.type, teraAce: true });
  }

  // ---------- Rewards ----------

  const VITAMINS = ["hp-up", "protein", "iron", "calcium", "zinc", "carbos"];
  const BERRIES = {
    common: ["oran-berry", "cheri-berry", "chesto-berry", "pecha-berry", "rawst-berry", "aspear-berry", "persim-berry"],
    good: ["sitrus-berry", "leppa-berry", "lum-berry", "figy-berry", "wiki-berry", "mago-berry", "aguav-berry", "iapapa-berry"],
    // (The ones that lower EVs and raise friendship.)
    training: ["pomeg-berry", "kelpsy-berry", "qualot-berry", "hondew-berry", "grepa-berry", "tamato-berry"],
    rare: ["liechi-berry", "ganlon-berry", "salac-berry", "petaya-berry", "apicot-berry", "lansat-berry", "starf-berry"]
  };
  // By stars: money, Exp. Candies, how many vitamins, and how many Berries from which kinds.
  const REWARDS = [null,
    { money: 1500, candies: [["exp-candy-xs", 3]], vitamins: 1, berries: [2, ["common"]] },
    { money: 3000, candies: [["exp-candy-xs", 3], ["exp-candy-s", 2]], vitamins: 1, berries: [3, ["common", "good"]] },
    { money: 6000, candies: [["exp-candy-s", 3], ["exp-candy-m", 2]], vitamins: 2, berries: [4, ["good"]] },
    { money: 10000, candies: [["exp-candy-m", 3], ["exp-candy-l", 2]], vitamins: 3, berries: [5, ["good", "training"]] },
    { money: 20000, candies: [["exp-candy-l", 3], ["exp-candy-xl", 2]], vitamins: 5, berries: [6, ["training", "rare"]] }
  ];
  // ...and Tera Shards of the den's type (`type`), by stars.
  const SHARDS = [0, 4, 6, 10, 15, 25];
  function rewards(stars, rng, type) {
    rng = rng || Math.random;
    const R = REWARDS[stars], got = {};
    if (type) got[type.toLowerCase() + "-tera-shard"] = SHARDS[stars];
    const add = (id, n) => { if (window.ITEMS[id]) got[id] = (got[id] || 0) + n; };
    const pick = (list) => list[Math.floor(rng() * list.length)];
    // (The first kind of candy, one more half the time.)
    R.candies.forEach(([id, n], i) => add(id, n + (i === 0 && rng() < 0.5 ? 1 : 0)));
    for (let i = 0; i < R.vitamins; i++) add(pick(VITAMINS), 1);
    const berries = [].concat(...R.berries[1].map((k) => BERRIES[k]));
    for (let i = 0; i < R.berries[0]; i++) add(pick(berries), 1);
    return { money: R.money, items: Object.entries(got) };
  }

  window.RaidDens = { DENS, byScript, active, maxStars, rollStars, start, finish, boss, rewards, POOLS, isKanto, RAID_MOVES, BADGES, LEVELS, IVS, HP, TURNS, LURE_ODDS, REWARDS, SHARDS };
})();
