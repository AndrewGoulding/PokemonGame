// Tera Raid dens (this game's own, after Scarlet and Violet's Tera Raid
// Battles and Sword and Shield's dens): eighteen dens around Kanto, one
// of each type. A den sleeps until you use a Lure on it; then it glows with a
// Tera Raid of 1 to 5 stars (the more Badges you have, the more stars it can
// have, and the stronger the Lure, the more: 1-2, 3-4 or 5), until you
// win it. The Tera Raid Pokémon is Terastallized into the den's type, with
// more HP the more stars, and must be beaten within a number of turns;
// beaten, it gives money, Exp. Candies, Wings (1-2 stars) or vitamins (3+), Berries and Tera Shards of
// the den's type (more and better the more stars), and you may catch it.
// Depends on: window.WORLD_MAPS, window.DEX, window.ITEMS, window.Party (when used).
//
//   RaidDens.DENS                        // [{ id, map, x, y, type }]
//   RaidDens.byScript(script)            // the den a map person's script is ("RaidDen_<id>"), or null
//   RaidDens.active(flags, id)           // the raid glowing in den `id` ({ stars, species, level }), or null
//   RaidDens.maxStars(badges)            // the most stars a raid can have with that many Badges
//   RaidDens.rollStars(lure, badges, rng)  // a raid's stars, from the Lure used (LURE_STARS)
//   RaidDens.start(flags, den, lure, badges, rng)  // use a Lure on a den: its raid, now glowing
//   RaidDens.boss(den, raid, rng)        // the Tera Raid Pokémon, a party record (Terastallizes as soon as it's out)
//   RaidDens.HP / LEVELS / IVS / TURNS   // by stars (index 1-5)
//   RaidDens.rewards(stars, rng, type)   // { money, items: [[id, count], ...] } (with the den type's Tera Shards)
//   RaidDens.finish(flags, id)           // won: the den sleeps again
//   RaidDens.leaders(flags)              // the Gym Leaders you could invite to a raid (beaten)
//   RaidDens.allies(den, raid, invited, rng)  // the three on your side: [{ trainer, record, leader }]
//   RaidDens.ALLY_HP                     // the Tera Raid Pokémon's HP, times this again with allies
//
// player.flags.raidDens: { [den id]: { stars, species, level } } while it glows.

(function () {
  "use strict";

  // [id, map, x, y, type]. Three are in places made for them (tools/build-raid-dens.js,
  // data/raid-den-rooms.js): the Fighting den in the Fighting Dojo's back
  // room, open once you've beaten its Karate Master; the Psychic den in Mr.
  // Psychic's back room, open once he's given you his TM; and the Grass den
  // in Celadon's Berry Farm (through the trees south of its Gym: tools/build-berry-farm.js).
  const DENS = [
    ["route1", "Route1", 5, 8, "Normal"],
    ["viridianForest", "ViridianForest", 3, 33, "Bug"],   // (the south-west corner, below the grass)
    ["seafoam", "SeafoamIslands_1F", 4, 17, "Ice"],
    ["powerPlant", "PowerPlant", 2, 10, "Electric"],
    ["dojo", "SaffronCity_Dojo_DenRoom", 6, 5, "Fighting"],
    ["rockTunnel", "RockTunnel_1F", 12, 21, "Rock"],
    ["diglettsCave", "DiglettsCave_B1F", 36, 33, "Ground"],
    ["route25", "Route25", 62, 8, "Water"],
    ["route18", "Route18", 44, 13, "Flying"],   // (among the Bird Keepers, out of their sight)
    ["cinnabar", "CinnabarIsland", 18, 13, "Fire"],
    ["lavender", "PokemonTower_1F", 11, 2, "Ghost"],   // (at the top of Pokémon Tower's ground floor)
    ["silph", "SilphCo_1F", 27, 6, "Steel"],
    ["indigo", "IndigoPlateau_Exterior", 14, 12, "Dragon"],   // (in a corner of the plaza, off the way to the door)
    ["berryFarm", "CeladonCity_BerryFarm", 27, 10, "Grass"],
    ["mansion", "PokemonMansion_1F", 3, 30, "Poison"],
    ["mrPsychic", "SaffronCity_MrPsychicsHouse_DenRoom", 5, 4, "Psychic"],
    ["rocketHideout", "RocketHideout_B1F", 14, 15, "Dark"],
    ["mtMoon", "MtMoon_B2F", 16, 4, "Fairy"]
  ].map(([id, map, x, y, type]) => ({ id, map, x, y, type, script: "RaidDen_" + id }));
  const byScript = (script) => DENS.find((d) => d.script === script) || null;

  // Each den on its map: a person who doesn't move or turn (inanimate), drawn as the den
  // (assets/world/sprites/raid_den.png; raid_den_active.png while it glows).
  for (const d of DENS) {
    const m = window.WORLD_MAPS && window.WORLD_MAPS[d.map];
    if (!m || m.people.some((p) => p.script === d.script)) continue;
    m.people.push({ id: 900 + DENS.indexOf(d), x: d.x, y: d.y, movement: "face_down", rangeX: 0, rangeY: 0, script: d.script,
      flag: null, text: null, localId: "LOCALID_RAID_DEN", sprite: "raid_den", width: 16, height: 32, frames: 1, inanimate: true });
  }

  // By stars (1-5; index 0 unused): the Badges a raid needs, its Pokémon's
  // level (and up to 3 more), IVs, HP (times its usual)...
  const BADGES = [0, 0, 2, 4, 6, 8];
  const LEVELS = [0, 12, 20, 35, 45, 75];   // (Scarlet and Violet's)
  const IVS = [0, 10, 15, 20, 25, 31];
  const HP = [0, 2, 3, 4, 6, 8];
  // ...and the turns you have to win it (as Scarlet and Violet's raids have a
  // time limit), more for the bigger ones.
  const TURNS = [0, 10, 12, 15, 20, 25];
  const maxStars = (badges) => BADGES.reduce((n, need, s) => (s && badges >= need ? s : n), 1);

  // The stars each Lure brings: a Lure 1 or 2, a Super Lure 3 or 4, a Max Lure 5,
  // as many as your Badges allow (BADGES); a Lure stronger than they allow
  // brings the most they do.
  const LURE_STARS = { "lure": [1, 2], "super-lure": [3, 4], "max-lure": [5] };
  function rollStars(lure, badges, rng) {
    rng = rng || Math.random;
    const can = (LURE_STARS[lure] || LURE_STARS.lure).filter((s) => s <= maxStars(badges));
    return can.length ? can[Math.floor(rng() * can.length)] : maxStars(badges);
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
      ["Magnezone", "Steelix", "Scizor"]],
    Grass: [["Oddish", "Bellsprout", "Exeggcute", "Tangela"], ["Gloom", "Weepinbell", "Exeggcute", "Tangela", "Paras"],
      ["Vileplume", "Victreebel", "Exeggutor", "Bellossom", "Parasect"], ["Exeggutor", "Tangrowth", "Leafeon", "Vileplume", "Victreebel", "Exeggutor-Alola"],
      ["Tangrowth", "Leafeon", "Exeggutor-Alola", "Bellossom", "Vileplume"]],
    Poison: [["Ekans", "Nidoran-F", "Nidoran-M", "Zubat", "Grimer", "Koffing"], ["Nidorina", "Nidorino", "Golbat", "Grimer", "Koffing", "Tentacool", "Venonat"],
      ["Arbok", "Muk", "Weezing", "Tentacruel", "Venomoth", "Grimer-Alola"], ["Nidoking", "Nidoqueen", "Crobat", "Muk-Alola", "Weezing-Galar", "Gengar"],
      ["Crobat", "Nidoking", "Nidoqueen", "Muk", "Weezing-Galar"]],
    Psychic: [["Abra", "Drowzee", "Slowpoke", "Slowpoke-Galar", "Ponyta-Galar"], ["Kadabra", "Drowzee", "Slowpoke", "Mr. Mime", "Jynx", "Exeggcute"],
      ["Kadabra", "Hypno", "Slowbro", "Mr. Mime", "Jynx", "Rapidash-Galar"], ["Alakazam", "Slowbro", "Slowking", "Espeon", "Exeggutor", "Mr. Mime-Galar"],
      ["Alakazam", "Espeon", "Slowking", "Slowbro-Galar", "Mr. Rime"]],
    // (Kanto has only the Dratini line and its odd Dragons: Horsea and Seadra, which become Kingdra, beside them.)
    Dragon: [["Dratini", "Horsea"], ["Dratini", "Dragonair", "Seadra"],
      ["Dragonair", "Seadra", "Exeggutor-Alola", "Gyarados"], ["Dragonite", "Kingdra", "Exeggutor-Alola", "Aerodactyl", "Dragonair"],
      ["Dragonite", "Kingdra", "Exeggutor-Alola", "Gyarados"]],
    // (Kanto's Dark-types are Umbreon and Alola's forms; no Galarian Moltres.)
    Dark: [["Rattata-Alola", "Meowth-Alola", "Grimer-Alola"], ["Rattata-Alola", "Raticate-Alola", "Meowth-Alola", "Grimer-Alola"],
      ["Raticate-Alola", "Persian-Alola", "Muk-Alola", "Umbreon"], ["Umbreon", "Persian-Alola", "Muk-Alola", "Raticate-Alola"],
      ["Umbreon", "Muk-Alola", "Persian-Alola"]],
    Fairy: [["Clefairy", "Jigglypuff"], ["Clefairy", "Jigglypuff", "Mr. Mime"],
      ["Clefable", "Wigglytuff", "Mr. Mime", "Rapidash-Galar", "Ninetales-Alola", "Weezing-Galar"], ["Clefable", "Wigglytuff", "Sylveon", "Ninetales-Alola", "Rapidash-Galar", "Weezing-Galar"],
      ["Sylveon", "Clefable", "Ninetales-Alola", "Rapidash-Galar"]]
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

  // (A raid left glowing by an older version, from before its den moved or
  // changed type, isn't one of its den's now: it's gone.)
  const active = (flags, id) => {
    const raid = flags.raidDens && flags.raidDens[id], den = DENS.find((d) => d.id === id);
    return raid && den && POOLS[den.type].some((pool) => pool.includes(raid.species)) ? raid : null;
  };
  // ---------- The other three on your side ----------
  // A Tera Raid is four on one, as Scarlet and Violet's are (the engine's
  // raidAllies): you, and three others. Kanto's Gym Leaders you've beaten
  // come if you invite them, each with a Pokémon of their own type from the
  // raid's tier (POOLS: as evolved as the raid's Pokémon are), the one that
  // hits the Tera Raid Pokémon's Tera Type hardest; anyone else is one of the
  // region's own trainers (WORLD_TRAINERS: FireRed's for Kanto, HeartGold and
  // SoulSilver's for Johto), the ones with a Pokémon that hits it hardest
  // first, bringing that Pokémon, grown to the raid's level (EVOLUTIONS).
  // All of them at about the raid's level. (Not Giovanni: Kanto's seven.)
  const LEADERS = [["Brock", "TRAINER_LEADER_BROCK", "Rock"], ["Misty", "TRAINER_LEADER_MISTY", "Water"],
    ["Lt. Surge", "TRAINER_LEADER_LT_SURGE", "Electric"], ["Erika", "TRAINER_LEADER_ERIKA", "Grass"],
    ["Koga", "TRAINER_LEADER_KOGA", "Poison"], ["Sabrina", "TRAINER_LEADER_SABRINA", "Psychic"],
    ["Blaine", "TRAINER_LEADER_BLAINE", "Fire"]].map(([name, id, type]) => ({ name, id, type }));
  // How hard a Pokémon's own types hit `type` (its best), and its base stats in all.
  const hits = (species, type) => Math.max(...(window.DEX[species].types || []).map((t) => window.Damage.typeEffectiveness(t, [type])));
  const total = (species) => { const d = window.DEX[species]; return d.hp + d.atk + d.def + d.spa + d.spd + d.spe; };
  const best = (list, type) => list.filter((sp) => window.DEX[sp]).sort((a, b) => hits(b, type) - hits(a, type) || total(b) - total(a))[0];
  // A species grown to `level`: its level evolutions by then (and the rest
  // from Lv. 40 on), each time the one that hits `type` hardest.
  function grown(species, level, type) {
    for (let n = 0; n < 3; n++) {
      const evos = ((window.EVOLUTIONS || {})[species] || []).filter((e) => window.DEX[e.into] && (e.method === "level" ? e.level <= level : level >= 40));
      if (!evos.length) break;
      species = best(evos.map((e) => e.into), type);
    }
    return species;
  }
  const trainerName = (t) => (t.className ? t.className + " " : "") + t.name;
  const TRAINER_POOL = {
    kanto: (id) => /^TRAINER_/.test(id) && !/LEADER|ELITE|CHAMPION|RIVAL|BOSS|ADMIN|GRUNT|TEAM_ROCKET|TWINS|COUPLE|SIS_AND_BRO|OLD_COUPLE|CRUSH_KIN|PAINTER|_\d+$/.test(id),
    johto: (id) => /^HGSS_TRAINER_/.test(id) && !/LEADER|ELITE|CHAMPION|RIVAL|PASSERBY|ROCKET|EXECUTIVE|GRUNT|TWINS|COUPLE|_\d+$/.test(id)
  };
  // The leaders you could invite: those you've beaten.
  const leaders = (flags) => LEADERS.filter((L) => flags[L.id]);
  // The three on your side: those of `invited` (leaders' names), then the region's trainers.
  function allies(den, raid, invited, rng) {
    rng = rng || Math.random;
    const type = den.type, lv = () => raid.level - 1 + Math.floor(rng() * 3), out = [];
    for (const name of invited || []) {
      const L = LEADERS.find((x) => x.name === name);
      if (!L || out.length >= 3) continue;
      const pool = POOLS[L.type] && POOLS[L.type][raid.stars - 1] || [];
      const sp = best(pool, type);
      if (sp) out.push({ trainer: L.name, leader: true, record: window.Party.create(sp, lv(), { ivs: 31 }) });
    }
    const region = ((window.WORLD_MAPS || {})[den.map] || {}).region === "johto" ? "johto" : "kanto";
    const T = window.WORLD_TRAINERS || {}, seen = new Set(out.map((a) => a.trainer));
    const picks = Object.keys(T).filter((id) => TRAINER_POOL[region](id) && T[id].party && T[id].party.length && T[id].name && !/&/.test(T[id].name))
      .map((id) => { const sp = best(T[id].party.map((m) => m.species), type); return { id, sp, score: sp ? hits(sp, type) : 0, r: rng() }; })
      .filter((x) => x.sp).sort((a, b) => b.score - a.score || a.r - b.r);
    for (const x of picks) {
      if (out.length >= 3) break;
      const name = trainerName(T[x.id]);
      if (seen.has(name)) continue;
      seen.add(name);
      const level = lv();
      out.push({ trainer: name, record: window.Party.create(grown(x.sp, level, type), level, { ivs: 20 }) });
    }
    return out;
  }

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
  const WINGS = ["health-wing", "muscle-wing", "resist-wing", "genius-wing", "clever-wing", "swift-wing"];
  const BERRIES = {
    common: ["oran-berry", "cheri-berry", "chesto-berry", "pecha-berry", "rawst-berry", "aspear-berry", "persim-berry"],
    good: ["sitrus-berry", "leppa-berry", "lum-berry", "figy-berry", "wiki-berry", "mago-berry", "aguav-berry", "iapapa-berry"],
    // (The ones that lower EVs and raise friendship.)
    training: ["pomeg-berry", "kelpsy-berry", "qualot-berry", "hondew-berry", "grepa-berry", "tamato-berry"],
    rare: ["liechi-berry", "ganlon-berry", "salac-berry", "petaya-berry", "apicot-berry", "lansat-berry", "starf-berry"]
  };
  // By stars: money, Exp. Candies, how many Wings (1 and 2 stars) or vitamins
  // (3 stars and up), and how many Berries from which kinds.
  const REWARDS = [null,
    { money: 1500, candies: [["exp-candy-xs", 3]], wings: 5, vitamins: 0, berries: [2, ["common"]] },
    { money: 3000, candies: [["exp-candy-xs", 3], ["exp-candy-s", 2]], wings: 10, vitamins: 0, berries: [3, ["common", "good"]] },
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
    for (let i = 0; i < (R.wings || 0); i++) add(pick(WINGS), 1);
    for (let i = 0; i < R.vitamins; i++) add(pick(VITAMINS), 1);
    const berries = [].concat(...R.berries[1].map((k) => BERRIES[k]));
    for (let i = 0; i < R.berries[0]; i++) add(pick(berries), 1);
    return { money: R.money, items: Object.entries(got) };
  }

  window.RaidDens = { LEADERS, leaders, allies, ALLY_HP: 2.5, DENS, byScript, active, maxStars, rollStars, start, finish, boss, rewards, POOLS, isKanto, RAID_MOVES, BADGES, LEVELS, IVS, HP, TURNS, LURE_STARS, REWARDS, SHARDS };
})();
