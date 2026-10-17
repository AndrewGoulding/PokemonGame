// Builds data/evolutions.js from Pokémon Showdown's Gen 6 data (@pkmn/dex).
// Run with: npm install && npm run build:evolutions
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { Dex } = require("@pkmn/dex");

const root = path.join(__dirname, "..");
global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, "data/dex.js"), "utf8"));
vm.runInThisContext(fs.readFileSync(path.join(root, "data/dex-gen7.js"), "utf8"));
vm.runInThisContext(fs.readFileSync(path.join(root, "data/dex-gen8.js"), "utf8"));
window.LEARNSETS_GEN6 = {};
vm.runInThisContext(fs.readFileSync(path.join(root, "data/dex-gen9.js"), "utf8"));
vm.runInThisContext(fs.readFileSync(path.join(root, "data/natures.js"), "utf8"));

const gen6 = Dex.forGen(6), gen7 = Dex.forGen(7), gen8 = Dex.forGen(8), gen9 = Dex.forGen(9);
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const itemId = (s) => String(s).toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-");

// Map a Showdown species name to our DEX key. Some base forms carry a suffix
// here ("Wormadam-Plant", "Aegislash-Shield"); gendered formes like
// "Meowstic-F" fold into the base species.
const dexKeys = Object.keys(window.DEX);
function ourName(name) {
  if (window.DEX[name]) return name;
  const id = toID(name);
  const exact = dexKeys.find((k) => toID(k) === id);
  if (exact) return exact;
  const base = toID(gen6.species.get(name).baseSpecies || name);
  return dexKeys.find((k) => window.DEX[k].id < 10000 && toID(k).startsWith(base)) || null;
}

// Conditions that need things this game doesn't have yet are swapped for the
// closest playable rule, and the original is kept in `note`.
function method(s) {
  const cond = s.evoCondition || "";
  const e = {};
  if (s.gender === "M" || s.gender === "F") e.gender = s.gender;
  if (/at night/.test(cond)) e.time = "night";
  if (/during the day/.test(cond)) e.time = "day";

  switch (s.evoType) {
    case undefined:
      e.method = "level";
      e.level = s.evoLevel;
      if (/Atk stat > its Def/.test(cond)) e.stats = "atk>def";
      if (/Atk stat < its Def/.test(cond)) e.stats = "atk<def";
      if (/Atk stat equal/.test(cond)) e.stats = "atk=def";
      if (/Dark-type in the party/.test(cond)) e.partyType = "Dark";
      if (/during rain/.test(cond)) e.note = "Needs rain in the main games; there is no overworld weather yet.";
      if (/upside-down/.test(cond)) e.note = "Needs the console held upside-down in the main games.";
      break;
    case "levelFriendship":
      e.method = "friendship";
      break;
    case "levelHold":
      e.method = "level-hold";
      e.item = itemId(s.evoItem);
      break;
    case "levelMove":
      e.method = "move";
      e.move = s.evoMove;
      break;
    case "useItem":
      e.method = "item";
      e.item = itemId(s.evoItem);
      break;
    case "trade":
      e.method = "trade";
      if (s.evoItem) e.item = itemId(s.evoItem);
      if (/with a (\w+)/.test(cond)) e.tradeWith = /with a (\w+)/.exec(cond)[1];
      break;
    case "levelExtra":
      if (/Fairy-type move/.test(cond)) {
        e.method = "friendship";
        e.moveType = "Fairy";
        e.note = "Needs Affection in the main games; high friendship stands in for it.";
      } else if (/Remoraid in party/.test(cond)) {
        e.method = "level";
        e.level = 1;
        e.partySpecies = "Remoraid";
      } else if (/Mount Lanakila/.test(cond)) {
        e.method = "item";
        e.item = "ice-stone";
        e.note = "Gen 7 needs Mount Lanakila; later games use the Ice Stone.";
      } else if (s.evoItem || /magnetic field/.test(cond)) {
        e.method = "item";
        e.item = itemId(s.evoItem || "Thunder Stone");
        e.note = "Gen 6 needs a special location (" + cond.replace(/^(near|in) /, "") + "); later games use this item.";
      } else {
        throw new Error("Unhandled levelExtra condition: " + cond);
      }
      break;
    default:
      throw new Error("Unhandled evolution type " + s.evoType + " for " + s.name);
  }
  return e;
}

const out = {};
for (const s of gen6.species.all()) {
  // isNonstandard skips formes from later games (Alolan Raichu, Hisuian Sliggoo, ...).
  if (!s.exists || s.num < 1 || s.num > 721 || !s.prevo || s.isNonstandard) continue;
  const from = ourName(s.prevo), into = ourName(s.name);
  if (!from || !into) { console.warn("skipping " + s.prevo + " -> " + s.name); continue; }
  // Other alternate formes aren't evolution targets here; Wormadam's three
  // formes are, chosen by Burmy's cloak.
  const cloak = /^Wormadam-(Plant|Sandy|Trash)$/.exec(into);
  if (window.DEX[into].id >= 10000 && !cloak) continue;
  const list = out[from] || (out[from] = []);
  const existing = list.find((e) => e.into === into);
  if (existing) { delete existing.gender; continue; } // Meowstic and Meowstic-F: either gender
  const entry = Object.assign({ into }, method(s));
  if (cloak) entry.cloak = cloak[1].toLowerCase();
  list.push(entry);
}

// Generation 7's (tools/build-gen7.js): the Alola Pokémon and the Alolan
// forms that evolve from Alolan forms. (Not Alola's own evolutions of Kanto
// Pokémon, Pikachu into Alolan Raichu and the like: this is Kanto.)
for (const s of gen7.species.all()) {
  const into = s.name;
  if (!window.DEX[into] || window.DEX[into].gen !== 7 || !s.prevo || s.evoRegion) continue;
  // (Own Tempo Rockruff's Dusk Lycanroc: any Rockruff at dusk, 5pm to 6pm.)
  const from = s.prevo === "Rockruff-Dusk" ? "Rockruff" : s.prevo;
  if (!window.DEX[from]) continue;
  const entry = Object.assign({ into }, method(s));
  // (Sun's evolutions by day, Moon's by night, as in the games' own clocks.)
  if (/in Pokemon Sun/.test(s.evoCondition || "") || into === "Solgaleo") entry.time = "day";
  if (/in Pokemon Moon/.test(s.evoCondition || "") || into === "Lunala") entry.time = "night";
  if (entry.note) entry.note = entry.note.replace(/^Gen 6/, "Gen 7");
  if (s.prevo === "Rockruff-Dusk") { entry.time = "dusk"; entry.note = "Own Tempo Rockruff in the main games, at dusk; here any Rockruff from 5pm to 6pm."; }
  const list = out[from] || (out[from] = []);
  if (s.prevo === "Rockruff-Dusk") list.unshift(entry); else list.push(entry);
}

// Generation 8's (tools/build-gen8.js): the Galar Pokémon, Legends: Arceus's,
// and the regional forms that evolve from regional forms. (Not Galar's or
// Hisui's own evolutions of other regions' Pokémon, Koffing into Galarian
// Weezing or Quilava into Hisuian Typhlosion: this is Kanto.) Their other
// conditions, as the games word them, become rules this game keeps:
//   Sirfetch'd: 3 critical hits in one battle (crits); Runerigus: level up
//   with 49+ HP lost (hpLost; the Dusty Bowl's arch isn't here); Alcremie:
//   a Sweet (any of the seven, used like a stone; it's spun with one held in
//   the games); Urshifu: Kubfu's scrolls (the games' two towers); Wyrdeer:
//   Lv. 30 (Stantler can't learn Psyshield Bash here); Overqwil: Barb Barrage
//   used 20 times (moveUses); Basculegion: 294 recoil damage taken
//   (recoil); Ursaluna: the Peat Block at night (under a full moon in the
//   games); Toxtricity: by nature (natures).
const AMPED = ["Hardy", "Brave", "Adamant", "Naughty", "Docile", "Impish", "Lax", "Hasty", "Jolly", "Naive", "Rash", "Sassy", "Quirky"];
const OTHER_GEN8 = {
  "Sirfetch’d": { method: "crits", crits: 3 },
  Runerigus: { method: "level", hpLost: 49, note: "Needs the Dusty Bowl's stone arch in the main games." },
  Urshifu: { method: "item", item: "scroll-of-darkness", note: "Needs the Tower of Darkness in the main games; Kubfu reads its scroll here." },
  "Urshifu-Rapid-Strike": { method: "item", item: "scroll-of-waters", note: "Needs the Tower of Waters in the main games; Kubfu reads its scroll here." },
  Wyrdeer: { method: "level", level: 30, note: "Needs Psyshield Bash used 20 times in the agile style in Legends: Arceus; Stantler can't learn it here." },
  Overqwil: { method: "level", moveUses: { "Barb Barrage": 20 }, note: "Legends: Arceus: in the strong style; here any 20 uses." },
  Basculegion: { method: "level", recoil: 294, gender: "M" },
  "Basculegion-F": { method: "level", recoil: 294, gender: "F" },
  Ursaluna: { method: "item", item: "peat-block", time: "night", note: "Needs a full moon in Legends: Arceus; here any night." },
  Kleavor: { method: "item", item: "black-augurite" }
};
for (const [dex, num] of [[gen8, (n) => n >= 810 && n <= 898], [gen9, (n) => n < 810 || n > 898]]) {
  for (const s of dex.species.all()) {
    const into = s.name.replace(/’/g, "'");
    if (!window.DEX[into] || window.DEX[into].gen !== 8 || !s.prevo || s.evoRegion || !num(s.num) && !/-(Galar|Hisui)$/.test(into)) continue;
    if (dex === gen8 && /-Hisui$/.test(into)) continue;
    if (dex === gen9 && !/-Hisui$|^(Wyrdeer|Kleavor|Ursaluna|Basculegion|Basculegion-F|Sneasler|Overqwil|Enamorus)$/.test(into)) continue;
    const from = s.prevo.replace(/’/g, "'");
    if (!window.DEX[from]) continue;
    // (A regional form only from a regional form: Galarian Linoone, Hisuian Zoroark.)
    if (/-(Galar|Hisui)$/.test(into) && window.DEX[from].gen !== 8) continue;
    const list = out[from] || (out[from] = []);
    if (into === "Alcremie") {
      for (const sweet of ["strawberry", "love", "berry", "clover", "flower", "star", "ribbon"]) {
        list.push({ into, method: "item", item: sweet + "-sweet", note: "Spun while holding a Sweet in the main games; here the Sweet is used on it." });
      }
      continue;
    }
    const entry = Object.assign({ into }, OTHER_GEN8[s.name] || method(s));
    if (entry.note) entry.note = entry.note.replace(/^Gen 6/, "Gen 8");
    if (into === "Toxtricity") entry.natures = AMPED;
    if (into === "Toxtricity-Low-Key") entry.natures = Object.keys(window.NATURES).filter((n) => !AMPED.includes(n));
    if (into === "Polteageist") list.push(Object.assign({}, entry, { item: "chipped-pot" }));
    list.push(entry);
  }
}

// Generation 9's (tools/build-gen9.js): Paldea's Pokémon, Paldean Wooper's
// Clodsire, and Paldea's evolutions of older Pokémon (Annihilape, Farigiraf,
// Dudunsparce, Kingambit, Dipplin, Archaludon). Their other conditions become
// rules this game keeps:
//   Pawmot, Brambleghast, Rabsca: 1,000 steps walked in your party (steps;
//   following you in Let's Go in the games); Annihilape: Rage Fist used 20
//   times (moveUses); Kingambit: 3 Bisharp knocked out (koSpecies; Bisharp
//   holding a Leader's Crest in the games); Gholdengo: 999 Coins in the Coin
//   Case (coins; 999 Gimmighoul Coins in the games); Maushold's Family of
//   Four and Three-Segment Dudunsparce: 1 in 100, by personality (rare).
const OTHER_GEN9 = {
  Pawmot: { method: "level", steps: 1000, note: "Walk 1,000 steps with it following you in Let's Go in Scarlet and Violet; here in your party." },
  Brambleghast: { method: "level", steps: 1000, note: "Walk 1,000 steps with it following you in Let's Go in Scarlet and Violet; here in your party." },
  Rabsca: { method: "level", steps: 1000, note: "Walk 1,000 steps with it following you in Let's Go in Scarlet and Violet; here in your party." },
  Annihilape: { method: "level", moveUses: { "Rage Fist": 20 } },
  Kingambit: { method: "level", koSpecies: { Bisharp: 3 }, note: "Defeat 3 Bisharp holding a Leader's Crest in Scarlet and Violet; here any 3 Bisharp it knocks out." },
  Gholdengo: { method: "level", coins: 999, note: "999 Gimmighoul Coins in Scarlet and Violet; here 999 Coins in the Coin Case." }
};
for (const s of gen9.species.all()) {
  const into = s.name.replace(/’/g, "'");
  if (!window.DEX[into] || window.DEX[into].gen !== 9 || !s.prevo || window.DEX[into].id >= 10000 && !/^(Oinkologne-F|Dudunsparce-Three-Segment|Maushold-Four)$/.test(into) && into !== "Maushold") continue;
  const from = s.prevo.replace(/’/g, "'");
  if (!window.DEX[from]) continue;
  const list = out[from] || (out[from] = []);
  const entry = Object.assign({ into }, OTHER_GEN9[into] || method(s));
  if (entry.note) entry.note = entry.note.replace(/^Gen 6/, "Gen 9");
  if (/^(Maushold-Four|Dudunsparce-Three-Segment)$/.test(into)) entry.rare = true;
  if (/^(Maushold|Dudunsparce)$/.test(into)) entry.rare = false;
  list.push(entry);
}

// Special cases Showdown doesn't encode as data.
for (const [into, half] of [["Silcoon", "low"], ["Cascoon", "high"]]) {
  const e = out.Wurmple.find((x) => x.into === into);
  e.personality = half; // decided by the personality value, ~50/50
}
const shedinja = out.Nincada.find((e) => e.into === "Shedinja");
Object.assign(shedinja, { method: "shed", level: 20 });
delete shedinja.note;

const sorted = {};
for (const k of Object.keys(out).sort((a, b) => window.DEX[a].id - window.DEX[b].id)) sorted[k] = out[k];

const header = `// Auto-generated by tools/build-evolutions.js from @pkmn/dex (Gen 6, and Gens 7, 8 and 9 for theirs). Do not edit by hand.
//
// window.EVOLUTIONS[species] = [{ into, method, ...conditions }]
//   method: "level"       level up to \`level\` or higher
//           "friendship"  level up with friendship >= 220
//           "level-hold"  level up while holding \`item\`
//           "move"        level up knowing \`move\`
//           "item"        use \`item\` (an evolution stone etc.)
//           "trade"       trade (optionally holding \`item\`, or for \`tradeWith\`)
//           "shed"        Shedinja: appears next to Ninjask if there's room and a Poké Ball
//           "crits"       after a battle in which it landed \`crits\` critical hits (Sirfetch'd)
//   conditions: time ("day"|"night"|"dusk"), gender ("M"|"F"), stats ("atk>def"|"atk<def"|"atk=def"),
//               partyType, partySpecies, moveType, personality ("low"|"high"),
//               cloak ("plant"|"sandy"|"trash", Burmy's cloak), natures (one of them),
//               hpLost (at least that much HP down), recoil (that much recoil
//               damage taken in all), moveUses ({ move: times used, in all }),
//               steps (walked in your party, in all), koSpecies ({ species:
//               knocked out, in all }), coins (in the Coin Case), rare (true:
//               1 in 100 by personality; false: the other 99)
//   note: how a condition this game can't model yet was approximated
`;
const body = "window.EVOLUTIONS = {\n" + Object.entries(sorted)
  .map(([k, v]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(v)).join(",\n") + "\n};\n";
fs.writeFileSync(path.join(root, "data/evolutions.js"), header + "\n" + body);
console.log("wrote data/evolutions.js: " + Object.keys(sorted).length + " species, " +
  Object.values(sorted).reduce((n, v) => n + v.length, 0) + " evolutions");
