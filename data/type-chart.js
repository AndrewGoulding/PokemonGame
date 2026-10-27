// Gen 6 type chart
// Missing entries are 1x.
window.TYPE_CHART = {
  Normal:   { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire:     { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water:    { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass:    { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice:      { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
  Poison:   { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground:   { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying:   { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic:  { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug:      { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
  Rock:     { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost:    { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon:   { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark:     { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel:    { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
  Fairy:    { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 }
};

// The other realms' elements (Dragon Ball and on): their turn-based, party-of-four battles only. The Pokémon realm
// uses TYPE_CHART above and never this one. Attacking element -> defending element; missing entries are 1x.
// Neutral is never super effective, never resisted and has no weaknesses; characters are one element or two
// (never Neutral and another), and two elements multiply.
window.REALM_ELEMENTS = ["Neutral", "Light", "Dark", "Fire", "Water", "Grass", "Earth", "Ice", "Steel", "Ground",
  "Poison", "Psychic", "Electric", "Air"];
window.REALM_TYPE_CHART = {
  Neutral:  {},
  Light:    { Light: 0.5, Dark: 2, Steel: 0.5, Poison: 2 },
  Dark:     { Light: 2, Dark: 0.5, Ground: 0.5, Psychic: 2 },
  Fire:     { Fire: 0.5, Water: 0.5, Grass: 2, Earth: 0.5, Ice: 2, Steel: 2 },
  Water:    { Fire: 2, Water: 0.5, Grass: 0.5, Earth: 2, Ground: 2 },
  Grass:    { Fire: 0.5, Water: 2, Grass: 0.5, Earth: 2, Steel: 0.5, Ground: 2, Poison: 0.5, Air: 0.5 },
  Earth:    { Fire: 2, Ice: 2, Steel: 0.5, Ground: 0.5, Electric: 2, Air: 2 },
  Ice:      { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Steel: 0.5, Ground: 2, Air: 2 },
  Steel:    { Fire: 0.5, Water: 0.5, Earth: 2, Ice: 2, Steel: 0.5, Electric: 0.5 },
  Ground:   { Fire: 2, Grass: 0.5, Earth: 0.5, Steel: 2, Poison: 2, Electric: 2, Air: 0 },
  Poison:   { Light: 2, Grass: 2, Earth: 0.5, Steel: 0.5, Ground: 0.5, Poison: 0.5 },
  Psychic:  { Dark: 0, Steel: 0.5, Ground: 2, Poison: 2, Psychic: 0.5 },
  Electric: { Water: 2, Grass: 0.5, Earth: 0.5, Steel: 2, Ground: 0, Electric: 0.5, Air: 2 },
  Air:      { Grass: 2, Earth: 0.5, Steel: 0.5, Ground: 2, Poison: 2, Electric: 0.5 }
};

// ---------- The other realms' battles (engine/battle.js's RealmBattle, Dragon Quest's way) ----------
// A party of up to four against a group of foes, turn by turn: each of the party picks Attack, a skill (for MP),
// Defend or an item, then everyone acts in order of agility. Elements as REALM_TYPE_CHART says.

// Skills: Yakuza 0's Heat Actions, by their names in the game (Kiryu's Brawler, Rush and Beast styles' and Tiger
// Drop, Majima's Thug, Slugger and Breaker styles', and the ones anyone can do); Yakuza 0 has none that heal or guard,
// so yours that do keep names of this game's own. kind: "phys" (the user's attack times `power`), "magic" (power: [low, high], plus wisdom), "heal" (power:
// [low, high], plus wisdom), "guard" (the user's defence up half again for the battle) or "status" (status:
// "sleep", "stun" (as sleep, but a flash or a blinding: a turn or two) or "poison", chance). target: "one" foe, "all" foes, "ally" (one of your side), "self". A "phys" or
// "magic" skill can also poison (status, chance) as it hits.
window.REALM_SKILLS = {
  // (anyone's)
  rush:          { name: "Essence of Face Twisting",                  mp: 3, element: "Neutral", kind: "phys",  power: 1.5, target: "one" },
  first_aid:     { name: "Essence of Second Wind",             mp: 4, element: "Neutral", kind: "heal",  power: [25, 35], target: "ally" },
  brace:         { name: "Essence of Composure",                 mp: 2, element: "Neutral", kind: "guard", target: "self" },
  patch_up:      { name: "Essence of Recovery",              mp: 8, element: "Neutral", kind: "heal",  power: [70, 90], target: "ally" },
  // (Kiryu's: the Dragon of Dojima, his Heat Actions)
  fisticuffs:    { name: "Essence of Brawling", mp: 3, element: "Neutral", kind: "phys",  power: 1.6, target: "one" },
  staunch:       { name: "Essence of Steadfast Counter",               mp: 3, element: "Neutral", kind: "guard", target: "self" },
  beast:         { name: "Essence of the Beast: Swing",  mp: 6, element: "Fire",    kind: "phys",  power: 1.3, target: "all" },
  tiger_drop:    { name: "Tiger Drop",            mp: 8, element: "Fire",    kind: "phys",  power: 2.5, target: "one" },
  rush_flurry:   { name: "Essence of Relentless Barrage",           mp: 5, element: "Neutral", kind: "phys",  power: 1.2, target: "all" },
  dragon_essence:{ name: "Essence of the Beast: Lob Crush", mp: 12, element: "Fire",   kind: "phys",  power: 1.9, target: "all" },
  dragon_spirit: { name: "Essence of the Flying Fist",         mp: 16, element: "Fire",   kind: "phys",  power: 3.2, target: "one" },
  // (Majima's: the Mad Dog of Shimano)
  mad_dog_lunge: { name: "Essence of the Thug: Pursuit",         mp: 3, element: "Dark",    kind: "phys",  power: 1.6, target: "one" },
  breaker_spin:  { name: "Essence of Aerial Whirl",          mp: 5, element: "Air",     kind: "phys",  power: 1.1, target: "all" },
  thug_slash:    { name: "Essence of Dagger Deflection",            mp: 4, element: "Steel",   kind: "phys",  power: 1.5, target: "one" },
  slugger_swing: { name: "Essence of the Slugger",         mp: 7, element: "Dark",    kind: "phys",  power: 2.2, target: "one" },
  mad_dog_grin:  { name: "Essence of the Last Stand",          mp: 3, element: "Neutral", kind: "guard", target: "self" },
  mad_dog_frenzy:{ name: "Essence of Pole Pandemonium",        mp: 12, element: "Dark",   kind: "phys",  power: 1.7, target: "all" },
  mad_dog_shimano:{ name: "Essence of the Thug: Finisher",   mp: 16, element: "Dark",   kind: "phys",  power: 3.2, target: "one" },
  // (the street's)
  cheap_shot:    { name: "Essence of Ass Crushing",            mp: 0, element: "Neutral", kind: "phys",  power: 1.3, target: "one" },
  dirty_kick:    { name: "Essence of Self-Destruct",            mp: 0, element: "Poison",  kind: "phys",  power: 1.1, target: "one", status: "poison", chance: 0.3 },
  bottle_smash:  { name: "Essence of Wreckage",          mp: 0, element: "Earth",   kind: "phys",  power: 1.4, target: "one" },
  slash:         { name: "Essence of Back Breaking",           mp: 0, element: "Steel",   kind: "phys",  power: 1.4, target: "one" },
  sweet_talk:    { name: "Essence of Door Slamming",            mp: 0, element: "Psychic", kind: "status", status: "sleep", chance: 0.5, target: "one" },
  headbutt:      { name: "Essence of Wall Smashing",              mp: 0, element: "Ground",  kind: "phys",  power: 1.5, target: "one" },
  haymaker:      { name: "Essence of No Mercy",              mp: 0, element: "Ground",  kind: "phys",  power: 2.0, target: "one" },
  revving:       { name: "Essence of Throwing",                mp: 0, element: "Electric", kind: "magic", power: [10, 16], target: "all" },
  // (the races' own: yours, by the race you chose at the start, REALM_RACES below)
  // Hylian
  spin_attack:   { name: "Spin Attack",            mp: 4,  element: "Neutral", kind: "phys",  power: 1.1, target: "all" },
  hylian_shield: { name: "Hylian Shield",          mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  fairy_blessing:{ name: "Fairy's Blessing",       mp: 5,  element: "Light",   kind: "heal",  power: [30, 40], target: "ally" },
  dins_fire:     { name: "Din's Fire",             mp: 8,  element: "Fire",    kind: "magic", power: [20, 28], target: "all" },
  light_arrow:   { name: "Light Arrow",            mp: 10, element: "Light",   kind: "phys",  power: 2.6, target: "one" },
  great_spin:    { name: "Great Spin Attack",      mp: 12, element: "Neutral", kind: "phys",  power: 1.8, target: "all" },
  sword_beam:    { name: "Master Sword Beam",      mp: 16, element: "Light",   kind: "phys",  power: 3.2, target: "one" },
  // Kokiri
  slingshot:     { name: "Fairy Slingshot",        mp: 2,  element: "Grass",   kind: "phys",  power: 1.4, target: "one" },
  deku_nut:      { name: "Deku Nut",               mp: 3,  element: "Light",   kind: "status", status: "stun", chance: 0.6, target: "one" },
  navi_heal:     { name: "Fairy Companion",        mp: 4,  element: "Neutral", kind: "heal",  power: [25, 35], target: "ally" },
  deku_volley:   { name: "Deku Seed Volley",       mp: 6,  element: "Grass",   kind: "phys",  power: 1.2, target: "all" },
  sarias_song:   { name: "Saria's Song",           mp: 5,  element: "Psychic", kind: "status", status: "sleep", chance: 0.7, target: "one" },
  jump_attack:   { name: "Kokiri Jump Attack",     mp: 9,  element: "Grass",   kind: "phys",  power: 2.5, target: "one" },
  deku_blessing: { name: "Great Deku Tree's Blessing", mp: 12, element: "Grass", kind: "heal", power: [80, 100], target: "ally" },
  // Zora
  boomerang_fin: { name: "Boomerang Fins",         mp: 3,  element: "Water",   kind: "phys",  power: 1.5, target: "one" },
  zora_scale:    { name: "Zora Scale",             mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  healing_water: { name: "Healing Waters",         mp: 4,  element: "Water",   kind: "heal",  power: [30, 40], target: "ally" },
  zora_barrier:  { name: "Electric Barrier",       mp: 8,  element: "Electric", kind: "magic", power: [20, 28], target: "all" },
  nayrus_wave:   { name: "Nayru's Wave",           mp: 9,  element: "Water",   kind: "magic", power: [44, 56], target: "one" },
  miphas_grace:  { name: "Mipha's Grace",          mp: 12, element: "Water",   kind: "heal",  power: [90, 110], target: "ally" },
  tidal_fins:    { name: "Tidal Fins",             mp: 16, element: "Water",   kind: "magic", power: [44, 56], target: "all" },
  // Gerudo
  scimitar:      { name: "Scimitar Slash",         mp: 3,  element: "Steel",   kind: "phys",  power: 1.6, target: "one" },
  desert_stance: { name: "Desert Stance",          mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  twin_blades:   { name: "Twin Scimitars",         mp: 6,  element: "Steel",   kind: "phys",  power: 1.2, target: "all" },
  sandstorm:     { name: "Sandstorm",              mp: 7,  element: "Ground",  kind: "magic", power: [18, 26], target: "all" },
  fire_arrow:    { name: "Fire Arrow",             mp: 9,  element: "Fire",    kind: "phys",  power: 2.6, target: "one" },
  urbosas_fury:  { name: "Urbosa's Fury",          mp: 14, element: "Electric", kind: "magic", power: [36, 46], target: "all" },
  gerudo_fang:   { name: "Gerudo Fang",            mp: 16, element: "Ground",  kind: "phys",  power: 3.3, target: "one" },
  // Human
  wolf_fang:     { name: "Wolf Fang Fist",         mp: 3,  element: "Neutral", kind: "phys",  power: 1.6, target: "one" },
  solar_flare:   { name: "Solar Flare",            mp: 3,  element: "Light",   kind: "status", status: "stun", chance: 0.7, target: "one" },
  afterimage:    { name: "Afterimage",             mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  kamehameha:    { name: "Kamehameha",             mp: 8,  element: "Neutral", kind: "magic", power: [34, 44], target: "one" },
  destructo_disc:{ name: "Destructo Disc",         mp: 10, element: "Steel",   kind: "phys",  power: 2.7, target: "one" },
  tri_beam:      { name: "Tri-Beam",               mp: 14, element: "Neutral", kind: "magic", power: [36, 48], target: "all" },
  spirit_ball:   { name: "Spirit Ball",            mp: 16, element: "Light",   kind: "magic", power: [80, 100], target: "one" },
  // Majin
  rubber_punch:  { name: "Rubber Punch",           mp: 3,  element: "Neutral", kind: "phys",  power: 1.5, target: "one" },
  regenerate:    { name: "Regeneration",           mp: 4,  element: "Psychic", kind: "heal",  power: [30, 40], target: "self" },
  candy_beam:    { name: "Candy Beam",             mp: 6,  element: "Psychic", kind: "magic", power: [28, 36], target: "one" },
  belly_bounce:  { name: "Belly Bounce",           mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  angry_burst:   { name: "Angry Explosion",        mp: 10, element: "Psychic", kind: "magic", power: [24, 32], target: "all" },
  absorption:    { name: "Absorption",             mp: 12, element: "Dark",    kind: "heal",  power: [90, 110], target: "self" },
  vanishing_ball:{ name: "Vanishing Ball",         mp: 18, element: "Dark",    kind: "magic", power: [50, 64], target: "all" },
  // Saiyan
  ki_blast:      { name: "Ki Blast",               mp: 2,  element: "Light",    kind: "magic", power: [10, 14], target: "one" },
  meteor_smash:  { name: "Meteor Smash",           mp: 4,  element: "Neutral", kind: "phys",  power: 1.7, target: "one" },
  saiyan_pride:  { name: "Saiyan Pride",           mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  galick_gun:    { name: "Galick Gun",             mp: 9,  element: "Dark",    kind: "magic", power: [38, 48], target: "one" },
  big_bang:      { name: "Big Bang Attack",        mp: 12, element: "Fire",    kind: "magic", power: [34, 44], target: "all" },
  final_flash:   { name: "Final Flash",            mp: 16, element: "Light",   kind: "magic", power: [80, 100], target: "one" },
  super_saiyan:  { name: "Super Saiyan Rage",      mp: 18, element: "Light",    kind: "phys",  power: 3.4, target: "one" }
};

// The party's fighters: elements, stats at level 1 and what they gain each level, and the skills they know by
// level. `sprite`: their sprite in the overworld; `battle`: their picture in battle. "you" is you, by your name.
window.REALM_FIGHTERS = {
  you:    { name: null, elements: ["Neutral"], base: { hp: 30, mp: 10, atk: 14, def: 10, agi: 10, wis: 10 },
            growth: { hp: 5, mp: 2, atk: 2, def: 1.6, agi: 1.5, wis: 1.5 }, skills: [[1, "first_aid"], [3, "rush"], [5, "brace"], [10, "patch_up"]] },
  kiryu:  { name: "Kiryu", elements: ["Fire"], sprite: "lad_kiryu", battle: "assets/world/sprites/lad_kiryu_battle.png",
            base: { hp: 45, mp: 12, atk: 20, def: 14, agi: 9, wis: 6 }, growth: { hp: 7, mp: 2, atk: 3, def: 2, agi: 1.2, wis: 0.8 },
            skills: [[1, "fisticuffs"], [3, "staunch"], [5, "beast"], [8, "tiger_drop"], [11, "rush_flurry"], [14, "dragon_essence"], [18, "dragon_spirit"]] },
  majima: { name: "Majima", elements: ["Dark"], sprite: "lad_majima", battle: "assets/world/sprites/lad_majima_battle.png",
            base: { hp: 40, mp: 14, atk: 19, def: 11, agi: 16, wis: 6 }, growth: { hp: 6, mp: 2, atk: 2.8, def: 1.5, agi: 2, wis: 0.8 },
            skills: [[1, "mad_dog_lunge"], [1, "breaker_spin"], [4, "thug_slash"], [6, "slugger_swing"], [9, "mad_dog_grin"], [12, "mad_dog_frenzy"], [16, "mad_dog_shimano"]] },
  // (The races: you, as the race you chose at the start (player.race), instead of "you" above.)
  hylian: { name: null, elements: ["Light"], base: { hp: 30, mp: 13, atk: 13, def: 11, agi: 10, wis: 13 },
            growth: { hp: 5, mp: 2.2, atk: 2, def: 1.7, agi: 1.4, wis: 1.8 },
            skills: [[1, "spin_attack"], [3, "hylian_shield"], [5, "fairy_blessing"], [8, "dins_fire"], [11, "light_arrow"], [15, "great_spin"], [20, "sword_beam"]] },
  kokiri: { name: null, elements: ["Grass"], base: { hp: 24, mp: 14, atk: 11, def: 8, agi: 16, wis: 13 },
            growth: { hp: 4, mp: 2.4, atk: 1.7, def: 1.3, agi: 2.2, wis: 1.8 },
            skills: [[1, "slingshot"], [2, "navi_heal"], [4, "deku_nut"], [7, "deku_volley"], [10, "sarias_song"], [13, "jump_attack"], [17, "deku_blessing"]] },
  zora:   { name: null, elements: ["Water"], base: { hp: 28, mp: 16, atk: 11, def: 10, agi: 12, wis: 16 },
            growth: { hp: 4.6, mp: 2.8, atk: 1.6, def: 1.5, agi: 1.6, wis: 2.2 },
            skills: [[1, "boomerang_fin"], [2, "healing_water"], [4, "zora_scale"], [7, "zora_barrier"], [10, "nayrus_wave"], [13, "miphas_grace"], [18, "tidal_fins"]] },
  gerudo: { name: null, elements: ["Ground"], base: { hp: 32, mp: 10, atk: 16, def: 11, agi: 12, wis: 9 },
            growth: { hp: 5.4, mp: 1.8, atk: 2.5, def: 1.6, agi: 1.6, wis: 1.2 },
            skills: [[1, "scimitar"], [3, "desert_stance"], [5, "twin_blades"], [8, "sandstorm"], [11, "fire_arrow"], [14, "urbosas_fury"], [19, "gerudo_fang"]] },
  human:  { name: null, elements: ["Neutral"], base: { hp: 28, mp: 14, atk: 13, def: 10, agi: 13, wis: 12 },
            growth: { hp: 4.8, mp: 2.4, atk: 1.9, def: 1.5, agi: 1.8, wis: 1.6 },
            skills: [[1, "wolf_fang"], [3, "solar_flare"], [5, "afterimage"], [7, "kamehameha"], [10, "destructo_disc"], [14, "tri_beam"], [19, "spirit_ball"]] },
  majin:  { name: null, elements: ["Psychic"], base: { hp: 42, mp: 12, atk: 13, def: 13, agi: 6, wis: 11 },
            growth: { hp: 7, mp: 2, atk: 2, def: 2, agi: 0.9, wis: 1.5 },
            skills: [[1, "rubber_punch"], [2, "regenerate"], [4, "belly_bounce"], [6, "candy_beam"], [10, "angry_burst"], [14, "absorption"], [19, "vanishing_ball"]] },
  saiyan: { name: null, elements: ["Light"], base: { hp: 32, mp: 10, atk: 17, def: 10, agi: 12, wis: 8 },
            growth: { hp: 5.4, mp: 1.8, atk: 2.7, def: 1.5, agi: 1.7, wis: 1.1 },
            skills: [[1, "ki_blast"], [3, "meteor_smash"], [5, "saiyan_pride"], [8, "galick_gun"], [11, "big_bang"], [15, "final_flash"], [20, "super_saiyan"]] }
};

// The races you can be, chosen at the start (ui/intro.js's race page; player.race): each is a fighter above, its
// stats and skills yours in the realms' battles. `home`: the realm it's from (Hyrule's will be the Zelda realm's);
// `pic`: a portrait for the page, or `crest`: the emblem drawn there instead.
window.REALM_RACES = [
  { id: "hylian", name: "Hylian", home: "Hyrule", crest: "triforce", color: "#d8b030",
    text: "Hyrule's own people, long-eared\nand blessed by the goddesses.\nSword, shield and a little magic.",
    looks: { bodies: ["link", "body_9", "body_0", "body_18", "body_27", "body_36", "body_45", "body_54", "body_63"],
             heads: ["head_64", "head_24", "head_32", "head_40", "head_48", "head_56", "head_72", "head_80", "head_88", "head_96", "head_104",
                     "head_112", "head_120", "head_144", "head_152", "head_0"],
             skin: ["fair", "light", "tan", "brown", "dark"], start: { body: "link", head: "head_64" } } },
  { id: "kokiri", name: "Kokiri", home: "Hyrule", crest: "leaf", color: "#40a040",
    text: "Children of the forest who never\ngrow up. Quick and light, with a\nfairy at their side to heal them.",
    looks: { bodies: ["kidbody_83", "kidbody_0", "kidbody_15", "kidbody_102", "kidbody_111"],
             heads: ["kidhead_25", "kidhead_55", "kidhead_64", "kidhead_72", "kidhead_120", "kidhead_131", "kidhead_139", "kidhead_37"],
             skin: ["fair", "light", "tan", "brown"], start: { body: "kidbody_83", head: "kidhead_120", hair: "green", outfit: "green", trim: "brown" } } },
  { id: "zora", name: "Zora", home: "Hyrule", crest: "fin", color: "#3880d0",
    text: "The graceful river folk. Frail\nfists, but deep wells of magic\nfor healing and the tides.",
    looks: { bodies: ["body_36", "body_9", "body_0", "body_45", "body_54", "body_63"], heads: ["zora_fin", "zora_long"],
             skin: ["zora_blue", "zora_silver", "zora_teal", "zora_red"], start: { body: "body_36", head: "zora_long", outfit: "white", trim: "sky", skin: "zora_blue" } } },
  { id: "gerudo", name: "Gerudo", home: "Hyrule", crest: "moon", color: "#c84830",
    text: "Desert warriors, fierce with the\nscimitar and the bow, who call\nthe sandstorm and the lightning.",
    looks: { bodies: ["body_54", "body_45", "body_63", "body_36", "body_9", "body_18"],
             heads: ["head_152", "head_144", "head_104", "head_112", "head_120", "head_32", "head_64", "head_40"],
             skin: ["tan", "brown", "dark", "light"], start: { body: "body_54", head: "head_152", hair: "red", outfit: "purple", trim: "yellow", skin: "brown" } } },
  { id: "human", name: "Human", home: "Dragon World", pic: "assets/dragonball/portraits/BF_103.png", color: "#d07830",
    text: "Earth's martial artists. No great\nstrength, but quick, and trained\nin every technique there is.",
    looks: { bodies: ["krillin", "yamcha", "tien", "bulma", "chichi", "townsman", "townswoman"],
             skin: ["fair", "light", "tan", "brown", "dark"], start: { body: "krillin" } } },
  { id: "majin", name: "Majin", home: "Dragon World", pic: "assets/dragonball/portraits/BF_084.png", color: "#e070a0",
    text: "Pink, rubbery and hard to put\ndown. Slow, but they shrug off\nhits and regenerate.",
    looks: { bodies: ["fat_buu", "kid_buu", "super_buu"], skin: ["majin_pink", "majin_rose", "majin_lilac", "majin_grey", "majin_blue"],
             start: { body: "fat_buu" } } },
  { id: "saiyan", name: "Saiyan", home: "Dragon World", pic: "assets/dragonball/portraits/BF_047.png", color: "#e0c040",
    text: "A warrior race from Planet\nVegeta. The hardest hitters of\nall, and the proudest.",
    looks: { bodies: ["goku", "vegeta", "gohan", "kid_gohan", "trunks"], skin: ["light", "fair", "tan", "brown", "dark"], start: { body: "goku" } } }
];
// A race's `looks` (the race page's choices; tools/build-player-looks.py made the parts, PLAYER_LOOK_PARTS below):
// the bodies (a "whole" part is a whole character, with no head to choose), the heads, the skin colours, and what
// you start as. You're player.appearance: { body, head, hair, outfit, trim, skin }, each colour a LOOK_COLOURS id
// ("own": the part's own colours).

// The colours you can choose: each four shades, darkest first. `cloth` is for clothes and trim both.
window.LOOK_COLOURS = {
  hair: [
    ["black", "Black", "#101018", "#282838", "#404058", "#606880"], ["brown", "Brown", "#382010", "#603818", "#905830", "#c08850"],
    ["chestnut", "Chestnut", "#401808", "#702810", "#a04820", "#d07840"], ["blonde", "Blonde", "#705010", "#b08820", "#e0c040", "#f8f0a0"],
    ["gold", "Golden", "#906000", "#d0a000", "#f8e020", "#ffffa0"], ["red", "Red", "#500808", "#901810", "#d03820", "#f87850"],
    ["orange", "Orange", "#602000", "#a04000", "#e07010", "#ffb050"], ["white", "White", "#585860", "#9898a8", "#d0d0d8", "#ffffff"],
    ["silver", "Silver", "#404858", "#707888", "#a0a8b8", "#d0d8e8"], ["blue", "Blue", "#102048", "#203888", "#3860c8", "#70a0f0"],
    ["teal", "Teal", "#083838", "#106868", "#20a0a0", "#70d8d0"], ["green", "Green", "#183810", "#306820", "#50a030", "#90d860"],
    ["purple", "Purple", "#301848", "#583080", "#8858c0", "#c098f0"], ["lavender", "Lavender", "#502860", "#9050b0", "#c888e8", "#f0c8ff"],
    ["pink", "Pink", "#601838", "#a03068", "#e060a0", "#ffa8d0"]
  ],
  cloth: [
    ["green", "Green", "#103010", "#206820", "#38a030", "#78d858"], ["forest", "Forest", "#102010", "#204020", "#306030", "#509050"],
    ["orange", "Orange", "#602000", "#b04800", "#f07800", "#ffb048"], ["red", "Red", "#500808", "#981010", "#d82820", "#ff7060"],
    ["crimson", "Crimson", "#380010", "#680020", "#a01038", "#d04868"], ["yellow", "Yellow", "#605000", "#a89000", "#e8d020", "#fff890"],
    ["blue", "Blue", "#081850", "#103098", "#2058e0", "#70a0ff"], ["navy", "Navy", "#080828", "#101848", "#203070", "#4058a0"],
    ["sky", "Sky", "#204870", "#4078b0", "#70b0e8", "#b8e0ff"], ["teal", "Teal", "#003838", "#006868", "#10a0a0", "#60e0d8"],
    ["purple", "Purple", "#280848", "#501888", "#8038c8", "#b880f8"], ["pink", "Pink", "#601838", "#a83070", "#f060a8", "#ffb0d8"],
    ["white", "White", "#707078", "#a8a8b0", "#d8d8e0", "#ffffff"], ["grey", "Grey", "#303038", "#585860", "#888890", "#b8b8c0"],
    ["black", "Black", "#080808", "#202028", "#383848", "#585868"], ["brown", "Brown", "#301808", "#583018", "#885030", "#b88058"],
    ["tan", "Tan", "#584020", "#887040", "#b8a068", "#e8d8a8"]
  ],
  skin: [
    ["fair", "Fair", "#a06848", "#d09878", "#f8c8a8", "#fff0e0"], ["light", "Light", "#905838", "#c08060", "#e8b088", "#ffd8b8"],
    ["tan", "Tan", "#704020", "#a06838", "#d09858", "#f0c888"], ["brown", "Brown", "#502810", "#784028", "#a06040", "#c88860"],
    ["dark", "Dark", "#301808", "#502818", "#704030", "#986048"],
    ["zora_blue", "River Blue", "#284878", "#4878b8", "#78a8e0", "#b8d8ff"], ["zora_silver", "Silver", "#506078", "#8898b0", "#b8c8d8", "#e8f0ff"],
    ["zora_teal", "Sea Green", "#205858", "#408880", "#70b8b0", "#b0e8e0"], ["zora_red", "Coral", "#702830", "#b04850", "#e07880", "#ffc0c0"],
    ["majin_pink", "Pink", "#901848", "#d04880", "#f880b8", "#ffc0e0"], ["majin_rose", "Rose", "#701030", "#b02850", "#e05878", "#ff98b0"],
    ["majin_lilac", "Lilac", "#583878", "#9068b0", "#c098e0", "#f0d0ff"], ["majin_grey", "Grey", "#404048", "#707078", "#a8a8b0", "#e0e0e8"],
    ["majin_blue", "Blue", "#203870", "#4068b0", "#70a0e0", "#b0d8ff"]
  ]
};

// Foes: their stats, what beating them gives (EXP, split between the party still standing, and money), and their
// skills (used now and then, instead of attacking). `sprite`: an overworld sheet (its first frame, facing you), or
// `battle`: a picture. `boss`: no running away.
window.REALM_FOES = {
  punk:      { name: "Street Punk",     elements: ["Neutral"], sprite: "sc_person_68", hp: 18, mp: 0, atk: 14, def: 6, agi: 8, exp: 6, money: 120, skills: ["cheap_shot"] },
  drunk:     { name: "Drunk Salaryman", elements: ["Poison"], sprite: "sc_person_47", hp: 15, mp: 0, atk: 11, def: 4, agi: 4, exp: 4, money: 200, skills: ["dirty_kick"] },
  thug:      { name: "Thug",            elements: ["Earth"], sprite: "sc_person_71", hp: 30, mp: 0, atk: 18, def: 10, agi: 6, exp: 12, money: 250, skills: ["bottle_smash"] },
  knife:     { name: "Knife Punk",      elements: ["Steel"], sprite: "sc_person_50", hp: 22, mp: 0, atk: 20, def: 6, agi: 14, exp: 11, money: 180, skills: ["slash"] },
  host:      { name: "Host",            elements: ["Psychic"], sprite: "sc_person_66", hp: 24, mp: 0, atk: 15, def: 8, agi: 12, exp: 12, money: 400, skills: ["sweet_talk"] },
  biker:     { name: "Biker",           elements: ["Steel", "Electric"], sprite: "sc_person_58", hp: 34, mp: 0, atk: 21, def: 12, agi: 11, exp: 16, money: 300, skills: ["revving"] },
  grunt:     { name: "Yakuza Grunt",    elements: ["Dark"], sprite: "sc_person_77", hp: 40, mp: 0, atk: 24, def: 14, agi: 10, exp: 22, money: 500, skills: ["headbutt"] },
  shakedown: { name: "Mr. Shakedown",   elements: ["Ground", "Earth"], sprite: "sc_person_71", big: true, hp: 160, mp: 0, atk: 40, def: 22, agi: 6, exp: 150, money: 10000, skills: ["haymaker"] },
  majima:    { name: "Goro Majima",     elements: ["Dark"], battle: "assets/world/sprites/lad_majima_battle.png", boss: true,
               hp: 260, mp: 99, atk: 34, def: 18, agi: 22, exp: 300, money: 0, skills: ["mad_dog_lunge", "breaker_spin", "slugger_swing"] }
};

// Things to use in battle, bought from the realm's shops (Poppo's, in Kamurocho, sells them all); the realm's party
// keeps them (flags.realmParty[realm].items). As in the Like a Dragon games, Heat is MP here: Staminan gives back
// health and Heat, Toughness health, Tauriner Heat, and the food a little health.
// heal: HP back ("all": all of it); mp: MP back ("all"); revive: gets someone who's down back up as well.
window.REALM_ITEMS = {
  staminan:           { name: "Staminan",           price: 300,  heal: 40,    mp: 10,    text: "An energy tonic: 40 HP and\n10 MP back." },
  staminan_spark:     { name: "Staminan Spark",     price: 1000, heal: 100,   mp: 25,    text: "A strong energy tonic: 100 HP\nand 25 MP back." },
  staminan_royale:    { name: "Staminan Royale",    price: 5000, heal: "all", mp: "all", text: "The finest tonic there is: all\nHP and MP back." },
  toughness_zero:     { name: "Toughness Zero",     price: 500,  heal: 80,               text: "A health drink: 80 HP back." },
  toughness_infinity: { name: "Toughness Infinity", price: 3000, heal: "all", revive: true, text: "All HP back, even for someone\nwho's down." },
  tauriner:           { name: "Tauriner",           price: 300,  mp: 15,                 text: "A Heat drink: 15 MP back." },
  tauriner_plus:      { name: "Tauriner+",          price: 800,  mp: 40,                 text: "A stronger Heat drink: 40 MP\nback." },
  tauriner_maxx:      { name: "Tauriner Maxx",      price: 2000, mp: "all",              text: "The strongest Heat drink: all\nMP back." },
  rice_ball:          { name: "Rice Ball",          price: 100,  heal: 20,               text: "A salmon rice ball: 20 HP\nback." },
  sandwich:           { name: "Sandwich",           price: 150,  heal: 25,               text: "A mixed sandwich: 25 HP back." },
  hot_dog:            { name: "Hot Dog",            price: 200,  heal: 30,               text: "A hot dog: 30 HP back." },
  fried_chicken:      { name: "Fried Chicken",      price: 250,  heal: 40,               text: "Poppo's fried chicken: 40 HP\nback." },
  bento:              { name: "Bento Box",          price: 500,  heal: 60,               text: "A boxed lunch: 60 HP back." },
  pudding:            { name: "Pudding",            price: 150,  heal: 10,    mp: 5,     text: "A custard pudding: 10 HP and\n5 MP back." }
};

// Each realm's random fights: the chance a step on its streets starts one, and the groups met (weight, foes).
window.REALM_ENCOUNTERS = {
  Kamurocho: { rate: 1 / 40, groups: [[6, ["punk"]], [5, ["punk", "punk"]], [4, ["drunk", "punk"]], [4, ["thug"]], [3, ["knife", "punk"]],
    [3, ["host", "host"]], [3, ["thug", "knife"]], [2, ["biker", "punk"]], [2, ["grunt"]], [1, ["grunt", "thug", "knife"]], [1, ["shakedown"]]] }
};

// The character creator's parts (tools/build-player-looks.py):
window.PLAYER_LOOK_PARTS = {"head_0":{"name":"Bald","kind":"head","roles":["skin"],"own":{"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]}},"head_24":{"name":"Cropped","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#a47b62","#d5ac94","#ffdec5"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"head_32":{"name":"Tousled","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a4a08","#6a4a08","#9c7b20","#d5b45a"],"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]}},"head_40":{"name":"Headband","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#734a31","#a47b62","#ffdec5"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"head_48":{"name":"Spectacles","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#a47b62","#d5ac94","#ffdec5"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"head_56":{"name":"Cap","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#a47b62","#d5ac94","#ffdec5"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"head_64":{"name":"Spiky","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]}},"head_72":{"name":"Parted","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#734a31","#a47b62","#d5ac94"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"head_80":{"name":"Side Part","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#a47b62","#d5ac94","#ffdec5"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"head_88":{"name":"Bobble Hat","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]}},"head_96":{"name":"Shaggy","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#734a31","#734a31","#a47b62"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"head_104":{"name":"Long","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]}},"head_112":{"name":"Bob","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#a47b62","#d5ac94","#ffdec5"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"head_120":{"name":"Fringe","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]}},"head_144":{"name":"Bun","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]}},"head_152":{"name":"Top Knot","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#a47b62","#d5ac94","#ffdec5"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"zora_fin":{"name":"Tail-Fin","kind":"head","roles":["skin"],"own":{"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]}},"zora_long":{"name":"Long Tail-Fin","kind":"head","roles":["skin"],"own":{"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]}},"body_9":{"name":"Tunic","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"body_0":{"name":"Smock","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"body_18":{"name":"Overalls","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"trim":["#625a52","#625a52","#9c8b83","#cdbdb4"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"body_27":{"name":"Waistcoat","kind":"body","roles":["trim","skin"],"own":{"trim":["#625a52","#625a52","#9c8b83","#cdbdb4"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"body_36":{"name":"Slim Tunic","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"body_45":{"name":"Apron","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"trim":["#625a52","#625a52","#9c8b83","#cdbdb4"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"body_54":{"name":"Skirt","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"trim":["#625a52","#625a52","#9c8b83","#cdbdb4"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"body_63":{"name":"Pinafore","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"trim":["#625a52","#625a52","#9c8b83","#cdbdb4"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]}},"kidhead_25":{"name":"Mop Top","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a3918","#ac7352","#e6ac8b","#ffdebd"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#e6ac8b"]}},"kidhead_55":{"name":"Bowl Cut","kind":"head","roles":["hair","skin"],"own":{"hair":["#183952","#183952","#183952","#106294"],"skin":["#6a3918","#ac7352","#e6ac8b","#ffdebd"]}},"kidhead_64":{"name":"Ponytail","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a3918","#ac7352","#e6ac8b","#ffdebd"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#e6ac8b"]}},"kidhead_72":{"name":"Pigtails","kind":"head","roles":["hair","skin"],"own":{"hair":["#a45210","#b45252","#de8b10","#ffcd20"],"skin":["#6a3918","#ac7352","#e6ac8b","#ffdebd"]}},"kidhead_120":{"name":"Cowlick","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a3918","#ac7352","#e6ac8b","#ffdebd"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#e6ac8b"]}},"kidhead_131":{"name":"Swept","kind":"head","roles":["hair","skin"],"own":{"hair":["#a45210","#a45210","#de8b10","#ffcd20"],"skin":["#6a3918","#ac7352","#e6ac8b","#ffdebd"]}},"kidhead_139":{"name":"Curls","kind":"head","roles":["hair","skin"],"own":{"hair":["#a45210","#a45210","#de8b10","#ffcd20"],"skin":["#6a3918","#ac7352","#e6ac8b","#ffdebd"]}},"kidhead_37":{"name":"Cap","kind":"head","roles":["trim","skin"],"own":{"trim":["#183952","#183952","#183952","#106294"],"skin":["#6a3918","#ac7352","#e6ac8b","#ffdebd"]}},"kidbody_0":{"name":"Smock","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#183952","#106294","#4194cd","#7bc5ff"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#ffdebd"]}},"kidbody_15":{"name":"Dress","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#a45210","#a45210","#de8b10","#ffcd20"],"trim":["#b45252","#b45252","#b45252","#b45252"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#ffdebd"]}},"kidbody_83":{"name":"Tunic","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#a45210","#a45210","#de8b10","#ffcd20"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#ffdebd"]}},"kidbody_102":{"name":"Shorts","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#a45210","#a45210","#de8b10","#ffcd20"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#ffdebd"]}},"kidbody_111":{"name":"Jerkin","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#a45210","#a45210","#de8b10","#ffcd20"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#ffdebd"]}},"link":{"name":"Link","kind":"whole","roles":["hair","outfit","skin"],"own":{"hair":["#deac52","#deac52","#deac52","#ffff00"],"outfit":["#107b29","#41a429","#10ff08","#bdffa4"],"skin":["#734120","#a47b41","#d5b48b","#ffe6bd"]}},"goku":{"name":"Goku","kind":"whole","roles":["hair","outfit","trim","skin"],"own":{"hair":["#000000","#000000","#000000","#000000"],"outfit":["#7b3100","#ad4a00","#d66300","#ff7300"],"trim":["#210084","#21217b","#3110ad","#4221d6"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]}},"gohan":{"name":"Gohan","kind":"whole","roles":["hair","outfit","trim","skin"],"own":{"hair":["#000000","#000000","#000000","#000000"],"outfit":["#210084","#210084","#3110ad","#4221d6"],"trim":["#737373","#adadad","#c6c6c6","#ffffff"],"skin":["#b56339","#ce8463","#e79c84","#ffbdad"]}},"kid_gohan":{"name":"Kid Gohan","kind":"whole","roles":["hair","outfit","trim","skin"],"own":{"hair":["#000000","#000000","#000000","#000000"],"outfit":["#7b0000","#7b0000","#ad0810","#d61029"],"trim":["#210084","#210084","#210084","#3110ad"],"skin":["#b56339","#ce8463","#e79c84","#ffbdad"]}},"vegeta":{"name":"Vegeta","kind":"whole","roles":["hair","outfit","trim","skin"],"own":{"hair":["#000000","#000000","#000000","#000000"],"outfit":["#210084","#210084","#3110ad","#4221d6"],"trim":["#737373","#adadad","#c6c6c6","#ffffff"],"skin":["#ad7b39","#c69452","#dead63","#f7c673"]}},"trunks":{"name":"Trunks","kind":"whole","roles":["hair","outfit","trim"],"own":{"hair":["#7b217b","#7b217b","#d652ff","#efadff"],"outfit":["#210084","#3110ad","#4221d6","#2184ff"],"trim":["#c69452","#c69452","#f7c673","#ffd642"]}},"krillin":{"name":"Krillin","kind":"whole","roles":["outfit","trim","skin"],"own":{"outfit":["#7b3100","#ad4a00","#d66300","#ff9418"],"trim":["#21217b","#21217b","#21217b","#4221d6"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]}},"tien":{"name":"Tien","kind":"whole","roles":["outfit","trim","skin"],"own":{"outfit":["#107b00","#107b00","#31ad00","#52d600"],"trim":["#7b0000","#ad0810","#d61029","#ff1839"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]}},"yamcha":{"name":"Yamcha","kind":"whole","roles":["hair","outfit","skin"],"own":{"hair":["#000000","#000000","#000000","#424242"],"outfit":["#7b3100","#7b3100","#ad4a00","#d66300"],"skin":["#ad7b39","#c69452","#dead63","#f7c673"]}},"bulma":{"name":"Bulma","kind":"whole","roles":["hair","outfit","trim","skin"],"own":{"hair":["#21637b","#21637b","#00a5a5","#7bbdce"],"outfit":["#ad4a00","#ad4a00","#d66300","#e7a542"],"trim":["#7b0000","#7b0000","#7b0000","#ad0810"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]}},"chichi":{"name":"Chi-Chi","kind":"whole","roles":["hair","outfit","trim","skin"],"own":{"hair":["#000000","#000000","#000000","#000000"],"outfit":["#d66300","#d66300","#ff9418","#ffd642"],"trim":["#00218c","#2163ad","#2184ff","#7ba5ce"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]}},"townsman":{"name":"Townsman","kind":"whole","roles":["hair","outfit","trim","skin"],"own":{"hair":["#6b3110","#6b3110","#7b6342","#ada57b"],"outfit":["#0039b5","#0039b5","#2163ff","#2184ff"],"trim":["#107b00","#107b00","#31ad00","#52d600"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]}},"townswoman":{"name":"Townswoman","kind":"whole","roles":["hair","outfit","skin"],"own":{"hair":["#6b3110","#6b3110","#845218","#a56b31"],"outfit":["#007373","#007373","#00a5a5","#00d6d6"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]}},"kid_buu":{"name":"Kid Buu","kind":"whole","roles":["outfit","trim","skin"],"own":{"outfit":["#a5a5a5","#a5a5a5","#dedede","#ffffff"],"trim":["#ad4a00","#d66300","#ff7300","#ffad00"],"skin":["#bd397b","#de5294","#ff73b5","#ffa5ce"]}},"fat_buu":{"name":"Fat Buu","kind":"whole","roles":["outfit","trim","skin"],"own":{"outfit":["#420073","#6308ad","#7329bd","#944ace"],"trim":["#ad4a00","#ad4a00","#d66300","#ffad00"],"skin":["#bd397b","#de5294","#ff73b5","#ffa5ce"]}},"super_buu":{"name":"Super Buu","kind":"whole","roles":["outfit","trim","skin"],"own":{"outfit":["#a5a5a5","#c6c6c6","#dedede","#ffffff"],"trim":["#ad4a00","#d66300","#ff7300","#ffad00"],"skin":["#bd397b","#de5294","#ff73b5","#ffa5ce"]}}};
// (End of the character creator's parts.)
