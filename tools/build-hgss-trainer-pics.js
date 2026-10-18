// Johto's trainer pictures, HeartGold and SoulSilver's (from a smogon/sprites
// checkout; Diamond and Pearl's for the classes HGSS shares with them), for
// tools/build-johto.js's trainers.
//
//   node tools/build-hgss-trainer-pics.js <path to smogon/sprites>
//
// Writes assets/sprites/trainers/front/hgss_<name>.png (and dp_<name>.png): each on an 80x80
// canvas, as Gen 4 draws them, its feet at the bottom, centred
// (ui/battle-screen.js stands a picture taller than FireRed's 64 at the top of
// the field), and tools/lib/hgss-trainer-pics.json, each HGSS trainer class's picture.
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const SRC = process.argv[2];
const dir = SRC && path.join(SRC, "src/_uncategorized/canonical/trainers/gen4");
if (!dir || !fs.existsSync(dir)) {
  console.error("Usage: node tools/build-hgss-trainer-pics.js <path to smogon/sprites>");
  process.exit(1);
}
const root = path.join(__dirname, "..");

// HGSS's trainer classes (include/constants/trainer_class.h, without
// TRAINERCLASS_) by their picture: "hg/<file>" HGSS's own, "dp/<file>" Diamond
// and Pearl's. (Poké is "Poke__0301" in smogon's file names.)
const PICS = {
  PKMN_TRAINER_ETHAN: "hg/Ethan", PKMN_TRAINER_LYRA: "hg/Lyra", YOUNGSTER: "hg/Youngster", LASS: "hg/Lass", CAMPER: "dp/Camper",
  PICNICKER: "dp/Picnicker", BUG_CATCHER: "hg/Bug_Catcher", AROMA_LADY: "dp/Aroma_Lady", TWINS: "hg/Twins", HIKER: "dp/Hiker",
  BATTLE_GIRL: "dp/Battle_Girl", FISHERMAN: "dp/Fisherman", CYCLIST_M: "dp/Cyclist", CYCLIST_F: "dp/Cyclist~F", BLACK_BELT: "hg/Blackbelt",
  ARTIST: "dp/Artist", PKMN_BREEDER_M: "dp/Poke__0301mon_Breeder", PKMN_BREEDER_F: "dp/Poke__0301mon_Breeder~F", COWGIRL: "dp/Cowgirl",
  JOGGER: "dp/Jogger", POKEFAN_M: "dp/Poke__0301fan", POKEFAN: "dp/Poke__0301fan~F", POKE_KID: "dp/Poke__0301_Kid", RIVAL: "hg/Silver",
  ACE_TRAINER_M: "dp/Ace_Trainer", ACE_TRAINER_F: "dp/Ace_Trainer~F", WAITRESS: "dp/Waitress", VETERAN: "dp/Veteran", NINJA_BOY: "dp/Ninja_Boy",
  DRAGON_TAMER: "dp/Dragon_Tamer", BIRD_KEEPER: "dp/Bird_Keeper", JUGGLER: "hg/Juggler", RICH_BOY: "dp/Rich_Boy", LADY: "dp/Lady",
  GENTLEMAN: "hg/Gentleman", SOCIALITE: "dp/Socialite", BEAUTY: "hg/Beauty", COLLECTOR: "dp/Collector", POLICEMAN: "dp/Policeman",
  PKMN_RANGER_M: "dp/Poke__0301mon_Ranger", PKMN_RANGER_F: "dp/Poke__0301mon_Ranger~F", SCIENTIST: "dp/Scientist", SWIMMER_M: "hg/Swimmer",
  SWIMMER_F: "hg/Swimmer~F", TUBER_M: "dp/tuber", TUBER_F: "dp/Tuber~F", SAILOR: "dp/Sailor", KIMONO_GIRL: "hg/Kimono_Girl",
  RUIN_MANIAC: "dp/Ruin_Maniac", PSYCHIC_M: "dp/Psychic", PSYCHIC_F: "dp/Psychic~F", PI: "dp/PI", GUITARIST: "dp/Guitarist",
  ACE_TRAINER_M_GS: "hg/Ace_Trainer", ACE_TRAINER_F_GS: "hg/Ace_Trainer~F", TEAM_ROCKET: "hg/Rocket_Grunt", SKIER: "hg/Skier",
  ROUGHNECK: "dp/Roughneck", CLOWN: "dp/Clown", WORKER: "dp/Worker", SCHOOL_KID_M: "hg/School_Kid", SCHOOL_KID_F: "dp/School_Kid~F",
  TEAM_ROCKET_F: "hg/Rocket_Grunt~F", BURGLAR: "hg/Burglar", FIREBREATHER: "hg/Firebreather", BIKER: "hg/Biker", LEADER_FALKNER: "hg/Falkner",
  LEADER_BUGSY: "hg/Bugsy", POKE_MANIAC: "hg/Poke__0301_Maniac", BIRD_KEEPER_GS: "hg/Bird_Keeper", LEADER_WHITNEY: "hg/Whitney",
  RANCHER: "dp/Rancher", LEADER_MORTY: "hg/Morty", LEADER_PRYCE: "hg/Pryce", LEADER_JASMINE: "hg/Jasmine", LEADER_CHUCK: "hg/Chuck",
  LEADER_CLAIR: "hg/Clair", TEACHER: "hg/Teacher", SUPER_NERD: "hg/Super_Nerd", SAGE: "hg/Sage", PARASOL_LADY: "dp/Parasol_Lady",
  WAITER: "dp/Waiter", MEDIUM: "hg/Medium", CAMERAMAN: "dp/Cameraman", REPORTER: "dp/Reporter", IDOL: "dp/Idol", CHAMPION: "hg/Lance",
  ELITE_FOUR_WILL: "hg/Will", ELITE_FOUR_KAREN: "hg/Karen", ELITE_FOUR_KOGA: "hg/Koga", PKMN_TRAINER_CHERYL: "dp/Cheryl",
  PKMN_TRAINER_RILEY: "dp/Riley", PKMN_TRAINER_BUCK: "dp/Buck", PKMN_TRAINER_MIRA: "dp/Mira", PKMN_TRAINER_MARLEY: "dp/Marley",
  TOWER_TYCOON: "dp/Palmer", LEADER_BROCK: "hg/Brock", LEADER_MISTY: "hg/Misty", LEADER_LT_SURGE: "hg/Lt._Surge", LEADER_ERIKA: "hg/Erika",
  LEADER_JANINE: "hg/Janine", LEADER_SABRINA: "hg/Sabrina", LEADER_BLAINE: "hg/Blaine", PKMN_TRAINER_RED: "hg/Red", LEADER_BLUE: "hg/Blue",
  ELDER: "hg/Li", ELITE_FOUR_BRUNO: "hg/Bruno", SCIENTIST_GS: "hg/Scientist", EXECUTIVE_ARIANA: "hg/Ariana", BOARDER: "hg/Boarder",
  EXECUTIVE_ARCHER: "hg/Archer", EXECUTIVE_PROTON: "hg/Proton", EXECUTIVE_PETREL: "hg/Petrel", PASSERBY: "hg/Youngster",
  MYSTERY_MAN: "hg/Eusine", DOUBLE_TEAM: "hg/Double_Team", YOUNG_COUPLE: "hg/Young_Couple", PKMN_TRAINER_LANCE: "hg/Lance",
  ROCKET_BOSS: "hg/Giovanni", PKMN_TRAINER_LUCAS_DP: "dp/Lucas", PKMN_TRAINER_DAWN_DP: "dp/Dawn"
};
const DIRS = { hg: "heartgold-soulsilver", dp: "diamond-pearl" };
const SIZE = 80;
const out = {}, done = new Set();
for (const [cls, src] of Object.entries(PICS)) {
  const [d, file] = src.split("/");
  const name = (d === "hg" ? "hgss_" : "dp_") + file.toLowerCase().replace(/poke__0301/g, "poke").replace(/~f/g, "_f").replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
  out[cls] = name;
  if (done.has(name)) continue;
  done.add(name);
  const png = readPng(path.join(dir, DIRS[d], file + ".png"));
  // (Index 0 is transparent, as their tRNS has it.)
  const rgba = new Uint8ClampedArray(SIZE * SIZE * 4);
  const ox = Math.floor((SIZE - png.width) / 2), oy = SIZE - png.height;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const i = png.px[y * png.width + x], u = x + ox, v = y + oy;
    if (!i || u < 0 || v < 0 || u >= SIZE || v >= SIZE) continue;
    rgba.set(png.palette[i].concat(255), (v * SIZE + u) * 4);
  }
  writePng(path.join(root, "assets/sprites/trainers/front", name + ".png"), SIZE, SIZE, rgba);
}
fs.writeFileSync(path.join(root, "tools/lib/hgss-trainer-pics.json"), JSON.stringify(out, null, 1) + "\n");
console.log("wrote " + done.size + " trainer pictures for " + Object.keys(out).length + " classes");
