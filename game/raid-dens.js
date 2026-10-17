// Tera Raid dens (this game's own, after Scarlet and Violet's Tera Raid
// Battles and Sword and Shield's dens): twelve dens around Kanto, each of
// one type. A den sleeps until you use a Lure on it; then it glows with a
// Tera Raid of 1 to 5 stars (the more Badges you have, the more stars it can
// have, and the stronger the Lure, the likelier the higher ones), until you
// win it. The Tera Raid Pokémon is Terastallized into the den's type, with
// more HP the more stars; beaten, it gives money, Exp. Candies, vitamins and
// Berries (more and better the more stars), and you may catch it.
// Depends on: window.WORLD_MAPS, window.DEX, window.ITEMS, window.Party (when used).
//
//   RaidDens.DENS                        // [{ id, map, x, y, type }]
//   RaidDens.byScript(script)            // the den a map person's script is ("RaidDen_<id>"), or null
//   RaidDens.active(flags, id)           // the raid glowing in den `id` ({ stars, species, level }), or null
//   RaidDens.maxStars(badges)            // the most stars a raid can have with that many Badges
//   RaidDens.rollStars(lure, badges, rng)  // a raid's stars, from the Lure used
//   RaidDens.start(flags, den, lure, badges, rng)  // use a Lure on a den: its raid, now glowing
//   RaidDens.boss(den, raid, rng)        // the Tera Raid Pokémon, a party record (Terastallizes as soon as it's out)
//   RaidDens.HP / LEVELS / IVS           // by stars (index 1-5)
//   RaidDens.rewards(stars, rng)         // { money, items: [[id, count], ...] }
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
  // level (and up to 3 more), IVs, and HP (times its usual).
  const BADGES = [0, 0, 2, 4, 6, 8];
  const LEVELS = [0, 12, 20, 35, 50, 65];
  const IVS = [0, 10, 15, 20, 25, 31];
  const HP = [0, 1.5, 2, 2.5, 3, 4];
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

  // The Pokémon each den's raids can bring, by type and stars.
  const POOLS = {
    Normal: [["Rattata", "Meowth", "Eevee", "Lechonk", "Sentret"], ["Raticate", "Furret", "Lickitung", "Teddiursa", "Aipom"],
      ["Persian", "Ursaring", "Zangoose", "Oinkologne", "Kangaskhan"], ["Snorlax", "Tauros", "Porygon2", "Lopunny", "Ursaring"],
      ["Snorlax", "Blissey", "Slaking", "Porygon-Z", "Ursaluna"]],
    Bug: [["Caterpie", "Weedle", "Venonat", "Tarountula", "Nymble"], ["Metapod", "Kakuna", "Paras", "Spinarak", "Pineco"],
      ["Butterfree", "Beedrill", "Parasect", "Venomoth", "Lokix"], ["Scyther", "Pinsir", "Heracross", "Scizor", "Kleavor"],
      ["Scizor", "Heracross", "Volcarona", "Golisopod", "Pinsir"]],
    Ice: [["Snorunt", "Swinub", "Cetoddle", "Spheal", "Snom"], ["Sneasel", "Delibird", "Smoochum", "Bergmite", "Snover"],
      ["Glalie", "Froslass", "Jynx", "Dewgong", "Piloswine"], ["Lapras", "Cloyster", "Weavile", "Avalugg", "Cetitan"],
      ["Mamoswine", "Baxcalibur", "Weavile", "Glaceon", "Lapras"]],
    Electric: [["Pikachu", "Voltorb", "Magnemite", "Pawmi", "Elekid"], ["Magneton", "Mareep", "Joltik", "Pawmo", "Shinx"],
      ["Electrode", "Raichu", "Electabuzz", "Jolteon", "Ampharos"], ["Magnezone", "Electivire", "Ampharos", "Pawmot", "Luxray"],
      ["Electivire", "Magnezone", "Toxtricity", "Kilowattrel", "Jolteon"]],
    Fighting: [["Machop", "Mankey", "Tyrogue", "Riolu", "Makuhita"], ["Primeape", "Croagunk", "Timburr", "Meditite", "Machoke"],
      ["Hitmonlee", "Hitmonchan", "Hitmontop", "Machoke", "Gurdurr"], ["Machamp", "Lucario", "Conkeldurr", "Annihilape", "Hariyama"],
      ["Machamp", "Conkeldurr", "Lucario", "Annihilape", "Kommo-o"]],
    Rock: [["Geodude", "Onix", "Nacli", "Larvitar", "Rolycoly"], ["Graveler", "Omanyte", "Kabuto", "Rockruff", "Naclstack"],
      ["Golem", "Omastar", "Kabutops", "Lycanroc", "Sudowoodo"], ["Aerodactyl", "Rhyperior", "Garganacl", "Golem", "Pupitar"],
      ["Tyranitar", "Rhyperior", "Garganacl", "Aerodactyl", "Coalossal"]],
    Ground: [["Diglett", "Sandshrew", "Cubone", "Phanpy", "Wooper"], ["Dugtrio", "Marowak", "Sandslash", "Rhyhorn", "Trapinch"],
      ["Rhydon", "Donphan", "Flygon", "Hippopotas", "Gligar"], ["Hippowdon", "Excadrill", "Gliscor", "Krookodile", "Donphan"],
      ["Garchomp", "Excadrill", "Krookodile", "Gliscor", "Hippowdon"]],
    Water: [["Magikarp", "Psyduck", "Poliwag", "Horsea", "Wiglett"], ["Staryu", "Krabby", "Seel", "Poliwhirl", "Shellder"],
      ["Golduck", "Kingler", "Starmie", "Seaking", "Vaporeon"], ["Gyarados", "Lapras", "Vaporeon", "Kingdra", "Dondozo"],
      ["Gyarados", "Kingdra", "Milotic", "Dondozo", "Vaporeon"]],
    Flying: [["Pidgey", "Spearow", "Hoothoot", "Starly", "Wattrel"], ["Pidgeotto", "Fearow", "Doduo", "Staravia", "Swablu"],
      ["Farfetch'd", "Dodrio", "Noctowl", "Fearow", "Altaria"], ["Pidgeot", "Staraptor", "Altaria", "Skarmory", "Corviknight"],
      ["Staraptor", "Corviknight", "Dragonite", "Salamence", "Talonflame"]],
    Fire: [["Vulpix", "Growlithe", "Ponyta", "Charcadet", "Litleo"], ["Magby", "Slugma", "Houndour", "Charcadet", "Ponyta"],
      ["Ninetales", "Rapidash", "Magmar", "Houndoom", "Torkoal"], ["Arcanine", "Magmortar", "Flareon", "Armarouge", "Houndoom"],
      ["Arcanine", "Volcarona", "Magmortar", "Ceruledge", "Chandelure"]],
    Ghost: [["Gastly", "Misdreavus", "Shuppet", "Duskull", "Greavard"], ["Haunter", "Drifloon", "Phantump", "Litwick", "Sinistea"],
      ["Haunter", "Banette", "Dusclops", "Drifblim", "Houndstone"], ["Gengar", "Mismagius", "Dusknoir", "Polteageist", "Trevenant"],
      ["Gengar", "Dragapult", "Chandelure", "Mimikyu", "Ceruledge"]],
    Steel: [["Magnemite", "Aron", "Varoom", "Tinkatink", "Klink"], ["Magneton", "Lairon", "Pawniard", "Skarmory", "Tinkatuff"],
      ["Steelix", "Skarmory", "Bronzong", "Klang", "Bisharp"], ["Aggron", "Scizor", "Tinkaton", "Revavroom", "Bronzong"],
      ["Metagross", "Kingambit", "Aggron", "Steelix", "Corviknight"]]
  };

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
    const r = window.Party.create(raid.species, raid.level, { ivs: IVS[raid.stars], rng });
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
  function rewards(stars, rng) {
    rng = rng || Math.random;
    const R = REWARDS[stars], got = {};
    const add = (id, n) => { if (window.ITEMS[id]) got[id] = (got[id] || 0) + n; };
    const pick = (list) => list[Math.floor(rng() * list.length)];
    // (The first kind of candy, one more half the time.)
    R.candies.forEach(([id, n], i) => add(id, n + (i === 0 && rng() < 0.5 ? 1 : 0)));
    for (let i = 0; i < R.vitamins; i++) add(pick(VITAMINS), 1);
    const berries = [].concat(...R.berries[1].map((k) => BERRIES[k]));
    for (let i = 0; i < R.berries[0]; i++) add(pick(berries), 1);
    return { money: R.money, items: Object.entries(got) };
  }

  window.RaidDens = { DENS, byScript, active, maxStars, rollStars, start, finish, boss, rewards, POOLS, BADGES, LEVELS, IVS, HP, LURE_ODDS, REWARDS };
})();
