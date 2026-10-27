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

// Skills: Heat Actions, as the Like a Dragon games call them ("Essence of ..."). kind: "phys" (the user's attack times `power`), "magic" (power: [low, high], plus wisdom), "heal" (power:
// [low, high], plus wisdom), "guard" (the user's defence up half again for the battle) or "status" (status:
// "sleep" or "poison", chance). target: "one" foe, "all" foes, "ally" (one of your side), "self". A "phys" or
// "magic" skill can also poison (status, chance) as it hits.
window.REALM_SKILLS = {
  // (anyone's)
  rush:          { name: "Essence of Face Smashing",                  mp: 3, element: "Neutral", kind: "phys",  power: 1.5, target: "one" },
  first_aid:     { name: "Essence of Second Wind",             mp: 4, element: "Neutral", kind: "heal",  power: [25, 35], target: "ally" },
  brace:         { name: "Essence of Composure",                 mp: 2, element: "Neutral", kind: "guard", target: "self" },
  patch_up:      { name: "Essence of Recovery",              mp: 8, element: "Neutral", kind: "heal",  power: [70, 90], target: "ally" },
  // (Kiryu's: the Dragon of Dojima, his Heat Actions)
  fisticuffs:    { name: "Essence of Fisticuffs", mp: 3, element: "Neutral", kind: "phys",  power: 1.6, target: "one" },
  staunch:       { name: "Essence of Endurance",               mp: 3, element: "Neutral", kind: "guard", target: "self" },
  beast:         { name: "Essence of the Beast",  mp: 6, element: "Fire",    kind: "phys",  power: 1.3, target: "all" },
  tiger_drop:    { name: "Essence of the Tiger Drop",            mp: 8, element: "Fire",    kind: "phys",  power: 2.5, target: "one" },
  rush_flurry:   { name: "Essence of Extreme Rush",           mp: 5, element: "Neutral", kind: "phys",  power: 1.2, target: "all" },
  dragon_essence:{ name: "Essence of the Dragon", mp: 12, element: "Fire",   kind: "phys",  power: 1.9, target: "all" },
  dragon_spirit: { name: "Essence of Dragon Spirit",         mp: 16, element: "Fire",   kind: "phys",  power: 3.2, target: "one" },
  // (Majima's: the Mad Dog of Shimano)
  mad_dog_lunge: { name: "Essence of the Mad Dog",         mp: 3, element: "Dark",    kind: "phys",  power: 1.6, target: "one" },
  breaker_spin:  { name: "Essence of Breakdancing",          mp: 5, element: "Air",     kind: "phys",  power: 1.1, target: "all" },
  thug_slash:    { name: "Essence of the Thug",            mp: 4, element: "Steel",   kind: "phys",  power: 1.5, target: "one" },
  slugger_swing: { name: "Essence of the Slugger",         mp: 7, element: "Dark",    kind: "phys",  power: 2.2, target: "one" },
  mad_dog_grin:  { name: "Essence of Taunting",          mp: 3, element: "Neutral", kind: "guard", target: "self" },
  mad_dog_frenzy:{ name: "Essence of Rampage",        mp: 12, element: "Dark",   kind: "phys",  power: 1.7, target: "all" },
  mad_dog_shimano:{ name: "Essence of the Mad Dog of Shimano",   mp: 16, element: "Dark",   kind: "phys",  power: 3.2, target: "one" },
  // (the street's)
  cheap_shot:    { name: "Essence of Cheap Shots",            mp: 0, element: "Neutral", kind: "phys",  power: 1.3, target: "one" },
  dirty_kick:    { name: "Essence of Dirty Fighting",            mp: 0, element: "Poison",  kind: "phys",  power: 1.1, target: "one", status: "poison", chance: 0.3 },
  bottle_smash:  { name: "Essence of Bottle Smashing",          mp: 0, element: "Earth",   kind: "phys",  power: 1.4, target: "one" },
  slash:         { name: "Essence of the Knife",           mp: 0, element: "Steel",   kind: "phys",  power: 1.4, target: "one" },
  sweet_talk:    { name: "Essence of Sweet Talk",            mp: 0, element: "Psychic", kind: "status", status: "sleep", chance: 0.5, target: "one" },
  headbutt:      { name: "Essence of Head Crushing",              mp: 0, element: "Ground",  kind: "phys",  power: 1.5, target: "one" },
  haymaker:      { name: "Essence of the Haymaker",              mp: 0, element: "Ground",  kind: "phys",  power: 2.0, target: "one" },
  revving:       { name: "Essence of Revving",                mp: 0, element: "Electric", kind: "magic", power: [10, 16], target: "all" }
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
            skills: [[1, "mad_dog_lunge"], [1, "breaker_spin"], [4, "thug_slash"], [6, "slugger_swing"], [9, "mad_dog_grin"], [12, "mad_dog_frenzy"], [16, "mad_dog_shimano"]] }
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
