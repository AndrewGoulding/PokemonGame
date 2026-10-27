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

// Skills. kind: "phys" (the user's attack times `power`), "magic" (power: [low, high], plus wisdom), "heal" (power:
// [low, high], plus wisdom), "guard" (the user's defence up half again for the battle) or "status" (status:
// "sleep" or "poison", chance). target: "one" foe, "all" foes, "ally" (one of your side), "self". A "phys" or
// "magic" skill can also poison (status, chance) as it hits.
window.REALM_SKILLS = {
  // (anyone's)
  rush:          { name: "Rush",                  mp: 3, element: "Neutral", kind: "phys",  power: 1.5, target: "one" },
  first_aid:     { name: "First Aid",             mp: 4, element: "Neutral", kind: "heal",  power: [25, 35], target: "ally" },
  brace:         { name: "Brace",                 mp: 2, element: "Neutral", kind: "guard", target: "self" },
  patch_up:      { name: "Patch Up",              mp: 8, element: "Neutral", kind: "heal",  power: [70, 90], target: "ally" },
  // (Kiryu's: the Dragon of Dojima)
  fisticuffs:    { name: "Essence of Fisticuffs", mp: 3, element: "Ground",  kind: "phys",  power: 1.6, target: "one" },
  staunch:       { name: "Staunch",               mp: 3, element: "Neutral", kind: "guard", target: "self" },
  dragons_roar:  { name: "Dragon's Roar",         mp: 6, element: "Fire",    kind: "phys",  power: 1.2, target: "all" },
  tiger_drop:    { name: "Tiger Drop",            mp: 8, element: "Ground",  kind: "phys",  power: 2.5, target: "one" },
  dragon_spirit: { name: "Dragon Spirit",         mp: 12, element: "Light",  kind: "phys",  power: 1.8, target: "all" },
  // (Majima's: the Mad Dog of Shimano)
  mad_dog_lunge: { name: "Mad Dog Lunge",         mp: 3, element: "Steel",   kind: "phys",  power: 1.6, target: "one" },
  breaker_spin:  { name: "Breaker Spin",          mp: 5, element: "Air",     kind: "phys",  power: 1.1, target: "all" },
  slugger_swing: { name: "Slugger Swing",         mp: 7, element: "Steel",   kind: "phys",  power: 2.2, target: "one" },
  mad_dog_frenzy:{ name: "Mad Dog Frenzy",        mp: 12, element: "Dark",   kind: "phys",  power: 1.7, target: "all" },
  // (the street's)
  cheap_shot:    { name: "Cheap Shot",            mp: 0, element: "Neutral", kind: "phys",  power: 1.3, target: "one" },
  dirty_kick:    { name: "Dirty Kick",            mp: 0, element: "Poison",  kind: "phys",  power: 1.1, target: "one", status: "poison", chance: 0.3 },
  bottle_smash:  { name: "Bottle Smash",          mp: 0, element: "Earth",   kind: "phys",  power: 1.4, target: "one" },
  slash:         { name: "Knife Slash",           mp: 0, element: "Steel",   kind: "phys",  power: 1.4, target: "one" },
  sweet_talk:    { name: "Sweet Talk",            mp: 0, element: "Psychic", kind: "status", status: "sleep", chance: 0.5, target: "one" },
  headbutt:      { name: "Headbutt",              mp: 0, element: "Ground",  kind: "phys",  power: 1.5, target: "one" },
  haymaker:      { name: "Haymaker",              mp: 0, element: "Ground",  kind: "phys",  power: 2.0, target: "one" },
  revving:       { name: "Rev Up",                mp: 0, element: "Electric", kind: "magic", power: [10, 16], target: "all" }
};

// The party's fighters: elements, stats at level 1 and what they gain each level, and the skills they know by
// level. `sprite`: their sprite in the overworld; `battle`: their picture in battle. "you" is you, by your name.
window.REALM_FIGHTERS = {
  you:    { name: null, elements: ["Neutral"], base: { hp: 30, mp: 10, atk: 14, def: 10, agi: 10, wis: 10 },
            growth: { hp: 5, mp: 2, atk: 2, def: 1.6, agi: 1.5, wis: 1.5 }, skills: [[1, "first_aid"], [3, "rush"], [5, "brace"], [10, "patch_up"]] },
  kiryu:  { name: "Kiryu", elements: ["Ground", "Light"], sprite: "lad_kiryu", battle: "assets/world/sprites/lad_kiryu_battle.png",
            base: { hp: 45, mp: 12, atk: 20, def: 14, agi: 9, wis: 6 }, growth: { hp: 7, mp: 2, atk: 3, def: 2, agi: 1.2, wis: 0.8 },
            skills: [[1, "fisticuffs"], [3, "staunch"], [5, "dragons_roar"], [8, "tiger_drop"], [14, "dragon_spirit"]] },
  majima: { name: "Majima", elements: ["Dark", "Steel"], sprite: "lad_majima", battle: "assets/world/sprites/lad_majima_battle.png",
            base: { hp: 40, mp: 14, atk: 19, def: 11, agi: 16, wis: 6 }, growth: { hp: 6, mp: 2, atk: 2.8, def: 1.5, agi: 2, wis: 0.8 },
            skills: [[1, "mad_dog_lunge"], [1, "breaker_spin"], [6, "slugger_swing"], [12, "mad_dog_frenzy"]] }
};

// Foes: their stats, what beating them gives (EXP, split between the party still standing, and money), and their
// skills (used now and then, instead of attacking). `sprite`: an overworld sheet (its first frame, facing you), or
// `battle`: a picture. `boss`: no running away.
window.REALM_FOES = {
  punk:      { name: "Street Punk",     elements: ["Neutral"], sprite: "sc_person_68", hp: 18, mp: 0, atk: 14, def: 6, agi: 8, exp: 6, money: 12, skills: ["cheap_shot"] },
  drunk:     { name: "Drunk Salaryman", elements: ["Poison"], sprite: "sc_person_47", hp: 15, mp: 0, atk: 11, def: 4, agi: 4, exp: 4, money: 20, skills: ["dirty_kick"] },
  thug:      { name: "Thug",            elements: ["Earth"], sprite: "sc_person_71", hp: 30, mp: 0, atk: 18, def: 10, agi: 6, exp: 12, money: 25, skills: ["bottle_smash"] },
  knife:     { name: "Knife Punk",      elements: ["Steel"], sprite: "sc_person_50", hp: 22, mp: 0, atk: 20, def: 6, agi: 14, exp: 11, money: 18, skills: ["slash"] },
  host:      { name: "Host",            elements: ["Psychic"], sprite: "sc_person_66", hp: 24, mp: 0, atk: 15, def: 8, agi: 12, exp: 12, money: 40, skills: ["sweet_talk"] },
  biker:     { name: "Biker",           elements: ["Steel", "Electric"], sprite: "sc_person_58", hp: 34, mp: 0, atk: 21, def: 12, agi: 11, exp: 16, money: 30, skills: ["revving"] },
  grunt:     { name: "Yakuza Grunt",    elements: ["Dark"], sprite: "sc_person_77", hp: 40, mp: 0, atk: 24, def: 14, agi: 10, exp: 22, money: 50, skills: ["headbutt"] },
  shakedown: { name: "Mr. Shakedown",   elements: ["Ground", "Earth"], sprite: "sc_person_71", big: true, hp: 160, mp: 0, atk: 40, def: 22, agi: 6, exp: 150, money: 1000, skills: ["haymaker"] },
  majima:    { name: "Goro Majima",     elements: ["Dark", "Steel"], battle: "assets/world/sprites/lad_majima_battle.png", boss: true,
               hp: 260, mp: 99, atk: 34, def: 18, agi: 22, exp: 300, money: 0, skills: ["mad_dog_lunge", "breaker_spin", "slugger_swing"] }
};

// Things to use in battle, bought from the realm's shops; the realm's party keeps them (flags.realmParty[realm].items).
// heal: HP back (or "all"); mp: MP back; revive: back on their feet with this share of their HP.
window.REALM_ITEMS = {
  staminan:        { name: "Staminan",         price: 50,  heal: 50,  text: "A tonic: 50 HP back." },
  staminan_spark:  { name: "Staminan Spark",   price: 300, heal: 150, text: "A strong tonic: 150 HP back." },
  tauriner:        { name: "Tauriner",         price: 200, mp: 20,    text: "An energy drink: 20 MP back." },
  toughness_zero:  { name: "Toughness Zero",   price: 600, revive: 0.5, text: "Gets someone who's down back up, with half their HP." }
};

// Each realm's random fights: the chance a step on its streets starts one, and the groups met (weight, foes).
window.REALM_ENCOUNTERS = {
  Kamurocho: { rate: 1 / 40, groups: [[6, ["punk"]], [5, ["punk", "punk"]], [4, ["drunk", "punk"]], [4, ["thug"]], [3, ["knife", "punk"]],
    [3, ["host", "host"]], [3, ["thug", "knife"]], [2, ["biker", "punk"]], [2, ["grunt"]], [1, ["grunt", "thug", "knife"]], [1, ["shakedown"]]] }
};
