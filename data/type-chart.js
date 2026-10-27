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

// ---------- The other realms' battles: the Ultimax system (engine/battle.js's Ultimax, Dragon Quest's way) ----------
// A party of up to four against a group of foes, turn by turn: each of the party picks Attack, a skill (for MP),
// Defend or an item, then everyone acts in order of speed. Elements as REALM_TYPE_CHART says. The stats: HP, MP,
// str (Strength), def (Defence), int (Intelligence), wis (Wisdom) and spd (Speed); the Pokémon system's Attack,
// Defence, Special Attack, Special Defence and Speed.

// Skills: Yakuza 0's Heat Actions, by their names in the game (Kiryu's Brawler, Rush and Beast styles' and Tiger
// Drop, Majima's Thug, Slugger and Breaker styles', and the ones anyone can do); Yakuza 0 has none that heal or guard,
// so yours that do keep names of this game's own. kind: "phys" (the user's strength times `power`), "magic" (power: [low, high], plus the user's
// intelligence, less the target's wisdom), "heal" (power: [low, high], plus intelligence), "guard" (the user's defence up half again for the battle) or "status" (status:
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
  // Namekian
  demon_hand:    { name: "Demon Hand",             mp: 3,  element: "Neutral", kind: "phys",  power: 1.6, target: "one" },
  namek_heal:    { name: "Namekian Healing",       mp: 4,  element: "Grass",   kind: "heal",  power: [30, 40], target: "ally" },
  weighted_cape: { name: "Weighted Cape",          mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  mafuba:        { name: "Evil Containment Wave",  mp: 4,  element: "Psychic", kind: "status", status: "stun", chance: 0.6, target: "one" },
  masenko:       { name: "Masenko",                mp: 8,  element: "Grass",   kind: "magic", power: [36, 46], target: "one" },
  hellzone:      { name: "Hellzone Grenade",       mp: 14, element: "Grass",   kind: "magic", power: [36, 48], target: "all" },
  beam_cannon:   { name: "Special Beam Cannon",    mp: 16, element: "Neutral", kind: "magic", power: [80, 100], target: "one" },
  // Android
  rocket_punch:  { name: "Rocket Punch",           mp: 3,  element: "Steel",   kind: "phys",  power: 1.6, target: "one" },
  barrier:       { name: "Android Barrier",        mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  photon_flash:  { name: "Photon Flash",           mp: 6,  element: "Electric", kind: "magic", power: [28, 36], target: "one" },
  energy_absorb: { name: "Energy Absorption",      mp: 5,  element: "Steel",   kind: "heal",  power: [40, 50], target: "self" },
  power_blitz:   { name: "Power Blitz",            mp: 10, element: "Light",   kind: "magic", power: [40, 50], target: "one" },
  accel_dance:   { name: "Accel Dance",            mp: 14, element: "Neutral", kind: "phys",  power: 2.0, target: "all" },
  hells_flash:   { name: "Hell's Flash",           mp: 16, element: "Steel",   kind: "magic", power: [84, 104], target: "one" },
  // Frieza's race
  death_beam:    { name: "Death Beam",             mp: 2,  element: "Dark",    kind: "magic", power: [10, 14], target: "one" },
  tail_whip:     { name: "Tail Whip",              mp: 4,  element: "Neutral", kind: "phys",  power: 1.7, target: "one" },
  transform:     { name: "Transformation",         mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  psychokinesis: { name: "Psychokinesis",          mp: 4,  element: "Psychic", kind: "status", status: "stun", chance: 0.65, target: "one" },
  death_saucer:  { name: "Death Saucer",           mp: 10, element: "Steel",   kind: "phys",  power: 2.7, target: "one" },
  death_ball:    { name: "Death Ball",             mp: 14, element: "Ice",     kind: "magic", power: [38, 50], target: "all" },
  supernova:     { name: "Supernova",              mp: 16, element: "Fire",    kind: "magic", power: [82, 102], target: "one" },
  // Kai
  telekinesis:   { name: "Telekinesis",            mp: 2,  element: "Psychic", kind: "magic", power: [10, 14], target: "one" },
  restoration:   { name: "Restoration",            mp: 4,  element: "Light",   kind: "heal",  power: [34, 44], target: "ally" },
  kai_kai:       { name: "Kai Kai",                mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  paralysis:     { name: "Divine Paralysis",       mp: 4,  element: "Psychic", kind: "status", status: "stun", chance: 0.7, target: "one" },
  kaioken:       { name: "Kaio-ken Attack",        mp: 9,  element: "Fire",    kind: "phys",  power: 2.5, target: "one" },
  spirit_bomb:   { name: "Spirit Bomb",            mp: 16, element: "Light",   kind: "magic", power: [44, 56], target: "all" },
  z_sword:       { name: "Z Sword Slash",          mp: 14, element: "Steel",   kind: "phys",  power: 3.0, target: "one" },
  // Mushroom Kingdom human
  jump:          { name: "Jump",                   mp: 3,  element: "Neutral", kind: "phys",  power: 1.6, target: "one" },
  mushroom:      { name: "Mushroom",               mp: 4,  element: "Grass",   kind: "heal",  power: [30, 40], target: "ally" },
  superguard:    { name: "Superguard",             mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  fireball:      { name: "Fireball",               mp: 7,  element: "Fire",    kind: "magic", power: [30, 40], target: "one" },
  super_jump:    { name: "Super Jump",             mp: 9,  element: "Neutral", kind: "phys",  power: 2.5, target: "one" },
  fire_flower:   { name: "Fire Flower",            mp: 12, element: "Fire",    kind: "magic", power: [34, 44], target: "all" },
  star_power:    { name: "Super Star",             mp: 18, element: "Light",   kind: "phys",  power: 2.2, target: "all" },
  // Mushroom people
  turnip_toss:   { name: "Turnip Toss",            mp: 2,  element: "Grass",   kind: "phys",  power: 1.4, target: "one" },
  toad_mushroom: { name: "Super Mushroom",         mp: 4,  element: "Grass",   kind: "heal",  power: [35, 45], target: "ally" },
  sleepy_spores: { name: "Sleepy Spores",          mp: 4,  element: "Grass",   kind: "status", status: "sleep", chance: 0.6, target: "one" },
  toad_dash:     { name: "Toad Dash",              mp: 6,  element: "Neutral", kind: "phys",  power: 2.0, target: "one" },
  life_mushroom: { name: "Life Mushroom",          mp: 10, element: "Grass",   kind: "heal",  power: [80, 100], target: "ally" },
  mega_mushroom: { name: "Mega Mushroom",          mp: 13, element: "Grass",   kind: "phys",  power: 1.8, target: "all" },
  toad_brigade:  { name: "Toad Brigade",           mp: 17, element: "Neutral", kind: "phys",  power: 2.2, target: "all" },
  // Pianta
  chuckster:     { name: "Chuckster Toss",         mp: 3,  element: "Neutral", kind: "phys",  power: 1.6, target: "one" },
  sturdy_belly:  { name: "Sturdy Belly",           mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  squirt_nozzle: { name: "Squirt Nozzle",          mp: 6,  element: "Water",   kind: "magic", power: [24, 32], target: "one" },
  durian_drop:   { name: "Durian Drop",            mp: 8,  element: "Grass",   kind: "phys",  power: 2.3, target: "one" },
  shine_sprite:  { name: "Shine Sprite",           mp: 10, element: "Light",   kind: "heal",  power: [70, 90], target: "ally" },
  hover_splash:  { name: "Hover Nozzle Splash",    mp: 13, element: "Water",   kind: "magic", power: [36, 46], target: "all" },
  turbo_nozzle:  { name: "Turbo Nozzle",           mp: 17, element: "Water",   kind: "phys",  power: 3.3, target: "one" },
  // Goomba
  headbonk:      { name: "Headbonk",               mp: 3,  element: "Neutral", kind: "phys",  power: 1.5, target: "one" },
  goomba_huddle: { name: "Goomba Huddle",          mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  multibonk:     { name: "Multibonk",              mp: 6,  element: "Neutral", kind: "phys",  power: 2.0, target: "one" },
  goomba_tower:  { name: "Goomba Tower",           mp: 8,  element: "Ground",  kind: "phys",  power: 1.4, target: "all" },
  paragoomba:    { name: "Paragoomba Dive",        mp: 10, element: "Air",     kind: "phys",  power: 2.6, target: "one" },
  big_goomba:    { name: "Big Goomba Stomp",       mp: 13, element: "Ground",  kind: "phys",  power: 3.0, target: "one" },
  goomboss:      { name: "Goomboss Charge",        mp: 17, element: "Ground",  kind: "phys",  power: 2.1, target: "all" },
  // Koopa
  shell_toss:    { name: "Shell Toss",             mp: 3,  element: "Earth",   kind: "phys",  power: 1.5, target: "one" },
  shell_shield:  { name: "Shell Shield",           mp: 2,  element: "Neutral", kind: "guard", target: "self" },
  shell_spin:    { name: "Shell Spin",             mp: 6,  element: "Earth",   kind: "phys",  power: 1.2, target: "all" },
  power_shell:   { name: "Power Shell",            mp: 9,  element: "Earth",   kind: "phys",  power: 1.6, target: "all" },
  dizzy_shell:   { name: "Dizzy Shell",            mp: 5,  element: "Psychic", kind: "status", status: "stun", chance: 0.6, target: "one" },
  fire_shell:    { name: "Fire Shell",             mp: 11, element: "Fire",    kind: "phys",  power: 2.6, target: "one" },
  shell_slam:    { name: "Shell Slam",             mp: 16, element: "Earth",   kind: "phys",  power: 3.2, target: "one" },
  super_saiyan:  { name: "Super Saiyan Rage",      mp: 18, element: "Light",    kind: "phys",  power: 3.4, target: "one" }
};

// The party's fighters: elements, stats at level 1 and what they gain each level, and the skills they know by
// level. `sprite`: their sprite in the overworld; `battle`: their picture in battle. "you" is you, by your name.
window.REALM_FIGHTERS = {
  you:    { name: null, elements: ["Neutral"], base: { hp: 30, mp: 10, str: 14, def: 10, int: 10, wis: 10, spd: 10 },
            growth: { hp: 5, mp: 2, str: 2, def: 1.6, int: 1.5, wis: 1.6, spd: 1.5 }, skills: [[1, "first_aid"], [3, "rush"], [5, "brace"], [10, "patch_up"]] },
  kiryu:  { name: "Kiryu", elements: ["Fire"], sprite: "lad_kiryu", battle: "assets/world/sprites/lad_kiryu_battle.png",
            base: { hp: 45, mp: 12, str: 20, def: 14, int: 6, wis: 10, spd: 9 }, growth: { hp: 7, mp: 2, str: 3, def: 2, int: 0.8, wis: 1.4, spd: 1.2 },
            skills: [[1, "fisticuffs"], [3, "staunch"], [5, "beast"], [8, "tiger_drop"], [11, "rush_flurry"], [14, "dragon_essence"], [18, "dragon_spirit"]] },
  majima: { name: "Majima", elements: ["Dark"], sprite: "lad_majima", battle: "assets/world/sprites/lad_majima_battle.png",
            base: { hp: 40, mp: 14, str: 19, def: 11, int: 6, wis: 8, spd: 16 }, growth: { hp: 6, mp: 2, str: 2.8, def: 1.5, int: 0.8, wis: 1.1, spd: 2 },
            skills: [[1, "mad_dog_lunge"], [1, "breaker_spin"], [4, "thug_slash"], [6, "slugger_swing"], [9, "mad_dog_grin"], [12, "mad_dog_frenzy"], [16, "mad_dog_shimano"]] },
  // (The races: you, as the race you chose at the start (player.race), instead of "you" above.)
  hylian: { name: null, elements: ["Light"], base: { hp: 30, mp: 13, str: 13, def: 11, int: 13, wis: 12, spd: 10 },
            growth: { hp: 5, mp: 2.2, str: 2, def: 1.7, int: 1.8, wis: 1.8, spd: 1.4 },
            skills: [[1, "spin_attack"], [3, "hylian_shield"], [5, "fairy_blessing"], [8, "dins_fire"], [11, "light_arrow"], [15, "great_spin"], [20, "sword_beam"]] },
  kokiri: { name: null, elements: ["Grass"], base: { hp: 24, mp: 14, str: 11, def: 8, int: 13, wis: 10, spd: 16 },
            growth: { hp: 4, mp: 2.4, str: 1.7, def: 1.3, int: 1.8, wis: 1.6, spd: 2.2 },
            skills: [[1, "slingshot"], [2, "navi_heal"], [4, "deku_nut"], [7, "deku_volley"], [10, "sarias_song"], [13, "jump_attack"], [17, "deku_blessing"]] },
  zora:   { name: null, elements: ["Water"], base: { hp: 28, mp: 16, str: 11, def: 10, int: 16, wis: 13, spd: 12 },
            growth: { hp: 4.6, mp: 2.8, str: 1.6, def: 1.5, int: 2.2, wis: 1.9, spd: 1.6 },
            skills: [[1, "boomerang_fin"], [2, "healing_water"], [4, "zora_scale"], [7, "zora_barrier"], [10, "nayrus_wave"], [13, "miphas_grace"], [18, "tidal_fins"]] },
  gerudo: { name: null, elements: ["Ground"], base: { hp: 32, mp: 10, str: 16, def: 11, int: 9, wis: 10, spd: 12 },
            growth: { hp: 5.4, mp: 1.8, str: 2.5, def: 1.6, int: 1.2, wis: 1.4, spd: 1.6 },
            skills: [[1, "scimitar"], [3, "desert_stance"], [5, "twin_blades"], [8, "sandstorm"], [11, "fire_arrow"], [14, "urbosas_fury"], [19, "gerudo_fang"]] },
  human:  { name: null, elements: ["Neutral"], base: { hp: 28, mp: 14, str: 13, def: 10, int: 12, wis: 11, spd: 13 },
            growth: { hp: 4.8, mp: 2.4, str: 1.9, def: 1.5, int: 1.6, wis: 1.6, spd: 1.8 },
            skills: [[1, "wolf_fang"], [3, "solar_flare"], [5, "afterimage"], [7, "kamehameha"], [10, "destructo_disc"], [14, "tri_beam"], [19, "spirit_ball"]] },
  majin:  { name: null, elements: ["Psychic"], base: { hp: 42, mp: 12, str: 13, def: 13, int: 11, wis: 12, spd: 6 },
            growth: { hp: 7, mp: 2, str: 2, def: 2, int: 1.5, wis: 1.8, spd: 0.9 },
            skills: [[1, "rubber_punch"], [2, "regenerate"], [4, "belly_bounce"], [6, "candy_beam"], [10, "angry_burst"], [14, "absorption"], [19, "vanishing_ball"]] },
  saiyan: { name: null, elements: ["Light"], base: { hp: 32, mp: 10, str: 17, def: 10, int: 8, wis: 9, spd: 12 },
            growth: { hp: 5.4, mp: 1.8, str: 2.7, def: 1.5, int: 1.1, wis: 1.3, spd: 1.7 },
            skills: [[1, "ki_blast"], [3, "meteor_smash"], [5, "saiyan_pride"], [8, "galick_gun"], [11, "big_bang"], [15, "final_flash"], [20, "super_saiyan"]] },
  namekian: { name: null, elements: ["Grass"], base: { hp: 34, mp: 13, str: 14, def: 12, int: 12, wis: 12, spd: 11 },
            growth: { hp: 5.8, mp: 2.2, str: 2.1, def: 1.8, int: 1.6, wis: 1.7, spd: 1.5 },
            skills: [[1, "demon_hand"], [2, "namek_heal"], [4, "weighted_cape"], [6, "mafuba"], [9, "masenko"], [13, "hellzone"], [18, "beam_cannon"]] },
  android: { name: null, elements: ["Steel"], base: { hp: 34, mp: 16, str: 16, def: 15, int: 8, wis: 12, spd: 11 },
            growth: { hp: 5.6, mp: 2.8, str: 2.4, def: 2.2, int: 1.1, wis: 1.7, spd: 1.5 },
            skills: [[1, "rocket_punch"], [3, "barrier"], [5, "photon_flash"], [7, "energy_absorb"], [10, "power_blitz"], [14, "accel_dance"], [19, "hells_flash"]] },
  arcosian: { name: null, elements: ["Ice"], base: { hp: 30, mp: 13, str: 15, def: 12, int: 13, wis: 12, spd: 15 },
            growth: { hp: 5, mp: 2.2, str: 2.3, def: 1.7, int: 1.7, wis: 1.7, spd: 2 },
            skills: [[1, "death_beam"], [3, "tail_whip"], [5, "transform"], [7, "psychokinesis"], [10, "death_saucer"], [14, "death_ball"], [19, "supernova"]] },
  kai:    { name: null, elements: ["Psychic"], base: { hp: 26, mp: 18, str: 10, def: 10, int: 17, wis: 14, spd: 13 },
            growth: { hp: 4.2, mp: 3, str: 1.5, def: 1.5, int: 2.4, wis: 1.9, spd: 1.7 },
            skills: [[1, "telekinesis"], [2, "restoration"], [4, "kai_kai"], [6, "paralysis"], [9, "kaioken"], [13, "spirit_bomb"], [18, "z_sword"]] },
  // (The Mushroom Kingdom's: for the realm to come.)
  mk_human: { name: null, elements: ["Fire"], base: { hp: 30, mp: 12, str: 14, def: 11, int: 11, wis: 11, spd: 12 },
            growth: { hp: 5, mp: 2.1, str: 2.1, def: 1.6, int: 1.5, wis: 1.6, spd: 1.7 },
            skills: [[1, "jump"], [2, "mushroom"], [4, "superguard"], [7, "fireball"], [10, "super_jump"], [14, "fire_flower"], [19, "star_power"]] },
  toad:   { name: null, elements: ["Grass"], base: { hp: 24, mp: 16, str: 10, def: 9, int: 15, wis: 12, spd: 14 },
            growth: { hp: 4.2, mp: 2.7, str: 1.5, def: 1.4, int: 2.1, wis: 1.8, spd: 2 },
            skills: [[1, "turnip_toss"], [2, "toad_mushroom"], [4, "sleepy_spores"], [7, "toad_dash"], [10, "life_mushroom"], [14, "mega_mushroom"], [18, "toad_brigade"]] },
  pianta: { name: null, elements: ["Water"], base: { hp: 44, mp: 10, str: 16, def: 12, int: 9, wis: 10, spd: 6 },
            growth: { hp: 7.2, mp: 1.8, str: 2.4, def: 1.9, int: 1.3, wis: 1.6, spd: 0.9 },
            skills: [[1, "chuckster"], [3, "sturdy_belly"], [5, "squirt_nozzle"], [8, "durian_drop"], [11, "shine_sprite"], [14, "hover_splash"], [19, "turbo_nozzle"]] },
  goomba: { name: null, elements: ["Ground"], base: { hp: 26, mp: 10, str: 13, def: 9, int: 10, wis: 10, spd: 15 },
            growth: { hp: 4.6, mp: 1.8, str: 2.2, def: 1.4, int: 1.3, wis: 1.4, spd: 2.1 },
            skills: [[1, "headbonk"], [3, "goomba_huddle"], [5, "multibonk"], [8, "goomba_tower"], [11, "paragoomba"], [14, "big_goomba"], [19, "goomboss"]] },
  koopa:  { name: null, elements: ["Earth"], base: { hp: 32, mp: 11, str: 12, def: 16, int: 10, wis: 13, spd: 8 },
            growth: { hp: 5.4, mp: 1.9, str: 1.8, def: 2.4, int: 1.4, wis: 1.9, spd: 1.2 },
            skills: [[1, "shell_toss"], [3, "shell_shield"], [5, "shell_spin"], [7, "dizzy_shell"], [10, "power_shell"], [14, "fire_shell"], [19, "shell_slam"]] }
};

// The races you can be, chosen at the start (ui/intro.js's race page; player.race): each is a fighter above, its
// stats and skills yours in the realms' battles. `home`: the realm it's from (Hyrule's will be the Zelda realm's);
// `pic`: a portrait for the page, or `crest`: the emblem drawn there instead.
window.REALM_RACES = [
  { id: "hylian", name: "Hylian", home: "Hyrule", crest: "triforce", color: "#d8b030",
    text: "Hyrule's long-eared folk: sword,\nshield and a little magic.",
    looks: { bodies: ["link", "body_9", "body_0", "body_18", "body_27", "body_36", "body_45", "body_54", "body_63"],
             heads: ["head_64", "head_24", "head_32", "head_40", "head_48", "head_56", "head_72", "head_80", "head_88", "head_96", "head_104",
                     "head_112", "head_120", "head_144", "head_152", "head_0"],
             skin: ["fair", "light", "tan", "brown", "dark"], start: { body: "link", head: "link_head" } } },
  { id: "kokiri", name: "Kokiri", home: "Hyrule", crest: "leaf", color: "#40a040",
    text: "Forest children who never grow\nup: quick, with a fairy to heal.",
    looks: { bodies: ["kidbody_83", "kidbody_0", "kidbody_15", "kidbody_102", "kidbody_111"],
             heads: ["kidhead_25", "kidhead_55", "kidhead_64", "kidhead_72", "kidhead_120", "kidhead_131", "kidhead_139", "kidhead_37"],
             skin: ["fair", "light", "tan", "brown"], start: { body: "kidbody_83", head: "kidhead_120", hair: "green", outfit: "green", trim: "brown" } } },
  { id: "zora", name: "Zora", home: "Hyrule", crest: "fin", color: "#3880d0",
    text: "Graceful river folk: weak fists,\nbut deep wells of magic.",
    looks: { bodies: ["body_36", "body_9", "body_0", "body_45", "body_54", "body_63"], heads: ["zora_fin", "zora_long"],
             skin: ["zora_blue", "zora_silver", "zora_teal", "zora_red"], start: { body: "body_36", head: "zora_long", outfit: "white", trim: "sky", skin: "zora_blue" } } },
  { id: "gerudo", name: "Gerudo", home: "Hyrule", crest: "moon", color: "#c84830",
    text: "Desert warriors who call the\nsandstorm and the lightning.",
    looks: { bodies: ["body_54", "body_45", "body_63", "body_36", "body_9", "body_18"],
             heads: ["head_152", "head_144", "head_104", "head_112", "head_120", "head_32", "head_64", "head_40"],
             skin: ["tan", "brown", "dark", "light"], start: { body: "body_54", head: "head_152", hair: "red", outfit: "purple", trim: "yellow", skin: "brown" } } },
  { id: "human", name: "Human", home: "Dragon World", pic: "assets/dragonball/portraits/BF_103.png", color: "#d07830",
    text: "Earth's martial artists: quick,\nand trained in every technique.",
    looks: { bodies: ["krillin", "yamcha", "tien", "bulma", "chichi", "townsman", "townswoman"],
             skin: ["fair", "light", "tan", "brown", "dark"], start: { body: "krillin" } } },
  { id: "majin", name: "Majin", home: "Dragon World", pic: "assets/dragonball/portraits/BF_084.png", color: "#e070a0",
    text: "Pink, rubbery and slow, but they\nshrug off hits and regenerate.",
    looks: { bodies: ["fat_buu", "kid_buu", "super_buu"], skin: ["majin_pink", "majin_rose", "majin_lilac", "majin_grey", "majin_blue"],
             start: { body: "fat_buu" } } },
  { id: "saiyan", name: "Saiyan", home: "Dragon World", pic: "assets/dragonball/portraits/BF_047.png", color: "#e0c040",
    text: "Proud warriors of Planet Vegeta,\nthe hardest hitters of all.",
    looks: { bodies: ["goku", "vegeta", "gohan", "kid_gohan", "trunks"], skin: ["light", "fair", "tan", "brown", "dark"], start: { body: "goku" } } },
  { id: "namekian", name: "Namekian", home: "Dragon World", pic: "assets/dragonball/portraits/LG2_009.png", color: "#48a028",
    text: "Namek's green warriors: they\nregrow what's lost, and heal.",
    looks: { bodies: ["piccolo", "piccolo_gi", "dende", "nail", "moori", "namekian"], skin: ["namek_green", "namek_olive", "zora_teal", "majin_blue"],
             labels: { trim: "Cape" }, bodyLabels: { piccolo_gi: { trim: "Sash" }, dende: { trim: "Sleeves" }, nail: { trim: "Belt" }, namekian: { trim: "Sash" } },
             start: { body: "piccolo" } } },
  { id: "android", name: "Android", home: "Dragon World", pic: "assets/dragonball/portraits/LG2_020.png", color: "#7888a0",
    text: "Dr. Gero's creations: endless\nenergy, steel bodies, no magic.",
    looks: { bodies: ["android_17", "android_18", "android_16", "android_19", "android_20", "cell"], skin: ["fair", "light", "tan", "brown", "dark", "majin_grey"],
             labels: { outfit: "Clothes" }, bodyLabels: { cell: { outfit: "Face", skin: "Shell" } }, start: { body: "android_17" } } },
  { id: "arcosian", name: "Frieza Race", home: "Dragon World", pic: "assets/dragonball/portraits/LG2_041.png", color: "#8858c0",
    text: "Frieza's cold, cruel kin: quick\nand deadly, rulers of the stars.",
    looks: { bodies: ["frieza", "frieza_first", "mecha_frieza", "king_cold"], skin: ["frost_white", "zora_silver", "majin_lilac", "majin_pink"],
             labels: { trim: "Plates" }, bodyLabels: { frieza_first: { outfit: "Armour" }, king_cold: { outfit: "Cape", trim: "Lining" } },
             start: { body: "frieza" } } },
  { id: "kai", name: "Kai", home: "Dragon World", pic: "assets/dragonball/portraits/BF_076.png", color: "#a060d0",
    text: "Gods of the universe: frail, but\nmighty in magic and healing.",
    looks: { bodies: ["supreme_kai", "kibito", "kibito_kai", "king_kai"], skin: ["kai_purple", "majin_lilac", "majin_pink", "zora_blue"],
             labels: { outfit: "Robe", trim: "Sash" }, bodyLabels: { king_kai: { trim: "Trim" } }, start: { body: "supreme_kai" } } },
  // (The Mushroom Kingdom's looks are Mario & Luigi: Superstar Saga's people, and Paper Mario: The Thousand-Year
  // Door's: its Piantas, Goombas and Koops.)
  { id: "mk_human", name: "Human", home: "Mushroom Kingdom", crest: "star", color: "#d83830",
    text: "Plumbers, princesses and heroes,\ngood at jumping and fireballs.",
    looks: { bodies: ["mario", "luigi", "peach"], skin: ["fair", "light", "tan", "brown", "dark"], start: { body: "mario" } } },
  { id: "toad", name: "Mushroom Person", home: "Mushroom Kingdom", crest: "mushroom", color: "#e05858",
    text: "The Princess's loyal Toads:\nquick, with mushrooms to heal.",
    looks: { bodies: ["toad", "star_toad"], skin: ["fair", "light", "tan", "brown"], labels: { hair: "Spots" }, start: { body: "toad" } } },
  { id: "pianta", name: "Pianta", home: "Mushroom Kingdom", crest: "palm", color: "#3898c8",
    text: "Big, cheerful islanders: slow,\nmighty and handy with a nozzle.",
    looks: { bodies: ["pianta", "don_pianta", "frankie", "francesca"], skin: ["koopa_yellow", "pianta_orange", "majin_blue", "majin_pink", "zora_teal"],
             labels: { hair: "Sprout", trim: "Skirt" }, start: { body: "pianta" } } },
  { id: "goomba", name: "Goomba", home: "Mushroom Kingdom", crest: "goomba", color: "#a86830",
    text: "Stubby, stubborn and everywhere:\nnimble, and they stack up high.",
    looks: { bodies: ["goomba", "goombella"], skin: ["tan", "brown", "dark", "fair", "majin_blue", "majin_grey", "zora_red"],
             labels: { outfit: "Feet", skin: "Head" }, bodyLabels: { goombella: { trim: "Helmet" } }, start: { body: "goomba" } } },
  { id: "koopa", name: "Koopa", home: "Mushroom Kingdom", crest: "shell", color: "#40a048",
    text: "Turtle folk who never leave home\nwithout shells: the toughest.",
    looks: { bodies: ["koops", "bowser"], skin: ["koopa_yellow", "pianta_orange", "tan", "brown", "majin_lilac"], labels: { outfit: "Shell", trim: "Belly" },
             bodyLabels: { koops: { trim: "Hood" } }, start: { body: "koops" } } }
];
// A race's `looks` (the race page's choices; tools/build-player-looks.py made the parts, PLAYER_LOOK_PARTS below):
// the bodies (a "whole" part is a whole character, with no head to choose), the heads, the skin colours, what the
// colours are called (`labels`, and a body's own: `bodyLabels`), and what you start as. You're player.appearance: { body, head, hair, outfit, trim, skin }, each colour a LOOK_COLOURS id
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
    ["majin_blue", "Blue", "#203870", "#4068b0", "#70a0e0", "#b0d8ff"], ["koopa_yellow", "Yellow", "#805000", "#c08800", "#f0c020", "#fff070"],
    ["pianta_orange", "Orange", "#803010", "#c06018", "#f09038", "#ffc878"], ["namek_green", "Namek Green", "#185808", "#289818", "#48c828", "#98f070"],
    ["namek_olive", "Olive", "#384010", "#607020", "#90a038", "#c8d070"], ["frost_white", "Frost White", "#586078", "#98a0c0", "#d0d8f0", "#ffffff"],
    ["kai_purple", "Kai Purple", "#500878", "#8828b0", "#c060e0", "#f0a8ff"]
  ]
};

// Foes: their stats, what beating them gives (EXP, split between the party still standing, and money), and their
// skills (used now and then, instead of attacking). `sprite`: an overworld sheet (its first frame, facing you), or
// `battle`: a picture; `street`: on Kamurocho's streets, Streets of Kamurocho's own (assets/kamurocho/people).
// `boss`: no running away.
window.REALM_FOES = {
  punk:      { name: "Street Punk",     elements: ["Neutral"], street: "punk", sprite: "sc_person_68", hp: 18, mp: 0, str: 14, def: 6, int: 0, wis: 3, spd: 8, exp: 6, money: 120, skills: ["cheap_shot"] },
  drunk:     { name: "Drunk Salaryman", elements: ["Poison"], street: "drunk", sprite: "sc_person_47", hp: 15, mp: 0, str: 11, def: 4, int: 0, wis: 2, spd: 4, exp: 4, money: 200, skills: ["dirty_kick"] },
  thug:      { name: "Thug",            elements: ["Earth"], street: "thug", sprite: "sc_person_71", hp: 30, mp: 0, str: 18, def: 10, int: 0, wis: 5, spd: 6, exp: 12, money: 250, skills: ["bottle_smash"] },
  knife:     { name: "Knife Punk",      elements: ["Steel"], street: "knife", sprite: "sc_person_50", hp: 22, mp: 0, str: 20, def: 6, int: 0, wis: 3, spd: 14, exp: 11, money: 180, skills: ["slash"] },
  host:      { name: "Host",            elements: ["Psychic"], street: "host", sprite: "sc_person_66", hp: 24, mp: 0, str: 15, def: 8, int: 0, wis: 4, spd: 12, exp: 12, money: 400, skills: ["sweet_talk"] },
  biker:     { name: "Biker",           elements: ["Steel", "Electric"], street: "biker", sprite: "sc_person_58", hp: 34, mp: 0, str: 21, def: 12, int: 0, wis: 6, spd: 11, exp: 16, money: 300, skills: ["revving"] },
  grunt:     { name: "Yakuza Grunt",    elements: ["Dark"], street: "grunt", sprite: "sc_person_77", hp: 40, mp: 0, str: 24, def: 14, int: 0, wis: 7, spd: 10, exp: 22, money: 500, skills: ["headbutt"] },
  shakedown: { name: "Mr. Shakedown",   elements: ["Ground", "Earth"], street: "shakedown", sprite: "sc_person_71", big: true, hp: 160, mp: 0, str: 40, def: 22, int: 0, wis: 11, spd: 6, exp: 150, money: 10000, skills: ["haymaker"] },
  majima:    { name: "Goro Majima",     elements: ["Dark"], street: "majima", battle: "assets/world/sprites/lad_majima_battle.png", boss: true,
               hp: 260, mp: 99, str: 34, def: 18, int: 0, wis: 9, spd: 22, exp: 300, money: 0, skills: ["mad_dog_lunge", "breaker_spin", "slugger_swing"] }
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
window.PLAYER_LOOK_PARTS = {"head_0":{"name":"Bald","kind":"head","roles":["skin"],"own":{"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]},"anchor":[[16,24],[16,22],[9,24],[16,25],[16,25],[16,23],[16,23],[9,25],[9,25]]},"head_24":{"name":"Cropped","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#734a31","#a47b62","#d5ac94"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"anchor":[[16,21],[16,21],[14,21],[16,22],[16,22],[16,22],[16,22],[14,22],[14,22]]},"head_32":{"name":"Tousled","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a4a08","#6a4a08","#9c7b20","#d5b45a"],"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]},"anchor":[[16,22],[16,21],[14,21],[16,23],[16,23],[16,22],[16,22],[14,22],[14,22]]},"head_40":{"name":"Headband","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#734a31","#a47b62","#ffdec5"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"anchor":[[16,26],[16,25],[12,25],[16,27],[16,27],[16,26],[16,26],[12,26],[12,26]]},"head_48":{"name":"Spectacles","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#a47b62","#d5ac94","#ffdec5"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"anchor":[[16,21],[16,21],[14,21],[16,22],[16,22],[16,22],[16,22],[14,22],[14,22]]},"head_56":{"name":"Cap","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#734a31","#734a31","#a47b62"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"anchor":[[16,21],[16,21],[13,21],[16,22],[16,22],[16,22],[16,22],[13,22],[13,22]]},"head_64":{"name":"Spiky","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]},"anchor":[[16,21],[16,22],[13,21],[16,22],[16,22],[16,23],[16,23],[13,22],[13,22]]},"head_72":{"name":"Parted","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#734a31","#a47b62","#d5ac94"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"anchor":[[16,21],[16,21],[13,21],[16,22],[16,22],[16,22],[16,22],[13,22],[13,22]]},"head_80":{"name":"Side Part","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#734a31","#a47b62","#d5ac94"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"anchor":[[16,21],[16,22],[20,22],[16,22],[16,22],[16,23],[16,23],[20,23],[20,23]]},"head_88":{"name":"Bobble Hat","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]},"anchor":[[16,22],[16,22],[12,22],[16,23],[16,23],[16,23],[16,23],[12,23],[12,23]]},"head_96":{"name":"Shaggy","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#734a31","#734a31","#a47b62"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"anchor":[[16,21],[16,21],[13,21],[16,22],[16,22],[16,22],[16,22],[13,22],[13,22]]},"head_104":{"name":"Long","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]},"anchor":[[15,21],[15,22],[19,22],[15,22],[15,22],[15,23],[15,23],[19,23],[19,23]]},"head_112":{"name":"Bob","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#a47b62","#d5ac94","#ffdec5"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"anchor":[[15,21],[15,29],[20,28],[15,22],[15,22],[15,30],[15,30],[20,29],[20,29]]},"head_120":{"name":"Fringe","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]},"anchor":[[15,21],[15,22],[19,22],[15,22],[15,22],[15,23],[15,23],[19,23],[19,23]]},"head_144":{"name":"Bun","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]},"anchor":[[16,21],[16,21],[13,21],[16,22],[16,22],[16,22],[16,22],[13,22],[13,22]]},"head_152":{"name":"Top Knot","kind":"head","roles":["hair","skin"],"own":{"hair":["#734a31","#a47b62","#d5ac94","#ffdec5"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"anchor":[[16,21],[16,21],[15,22],[16,22],[16,22],[16,22],[16,22],[15,23],[15,23]]},"zora_fin":{"name":"Tail-Fin","kind":"head","roles":["skin"],"own":{"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]},"anchor":[[16,24],[16,27],[9,24],[16,25],[16,25],[16,28],[16,28],[9,25],[9,25]]},"zora_long":{"name":"Long Tail-Fin","kind":"head","roles":["skin"],"own":{"skin":["#734a31","#a47b62","#d5ac94","#ffdec5"]},"anchor":[[16,24],[16,29],[9,24],[16,25],[16,25],[16,30],[16,30],[9,25],[9,25]]},"body_9":{"name":"Tunic","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"neck":[[16,21],[16,22],[13,22],[16,22],[16,22],[16,23],[16,23],[13,23],[13,23]]},"body_0":{"name":"Smock","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"neck":[[16,21],[16,22],[13,22],[16,22],[16,22],[16,23],[16,23],[13,23],[13,23]]},"body_18":{"name":"Overalls","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"trim":["#625a52","#625a52","#9c8b83","#cdbdb4"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"neck":[[16,21],[16,22],[13,22],[16,22],[16,22],[16,23],[16,23],[13,23],[13,23]]},"body_27":{"name":"Waistcoat","kind":"body","roles":["trim","skin"],"own":{"trim":["#625a52","#625a52","#9c8b83","#cdbdb4"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"neck":[[16,21],[16,22],[13,22],[16,22],[16,22],[16,23],[16,23],[13,23],[13,23]]},"body_36":{"name":"Slim Tunic","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"neck":[[16,21],[16,22],[13,22],[16,22],[16,22],[16,23],[16,23],[13,23],[13,23]]},"body_45":{"name":"Apron","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"trim":["#625a52","#625a52","#9c8b83","#cdbdb4"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"neck":[[16,21],[16,22],[13,22],[16,22],[16,22],[16,23],[16,23],[13,23],[13,23]]},"body_54":{"name":"Skirt","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"trim":["#625a52","#625a52","#9c8b83","#cdbdb4"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"neck":[[16,21],[16,22],[13,22],[16,22],[16,22],[16,23],[16,23],[13,23],[13,23]]},"body_63":{"name":"Pinafore","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#6a4a08","#9c7b20","#d5b45a","#eede83"],"trim":["#625a52","#625a52","#9c8b83","#cdbdb4"],"skin":["#d5ac94","#d5ac94","#d5ac94","#ffdec5"]},"neck":[[16,21],[16,22],[13,22],[16,22],[16,22],[16,23],[16,23],[13,23],[13,23]]},"kidhead_25":{"name":"Mop Top","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a3918","#6a3918","#6a3918","#ac7352"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#ffdebd"]},"anchor":[[16,25],[16,24],[17,25],[16,26],[16,26],[16,25],[16,25],[17,26],[17,26]]},"kidhead_55":{"name":"Bowl Cut","kind":"head","roles":["hair","skin"],"own":{"hair":["#183952","#183952","#183952","#106294"],"skin":["#6a3918","#ac7352","#e6ac8b","#ffdebd"]},"anchor":[[16,25],[16,24],[18,25],[16,26],[16,26],[16,25],[16,25],[18,26],[18,26]]},"kidhead_64":{"name":"Ponytail","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a3918","#6a3918","#ac7352","#e6ac8b"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#ffdebd"]},"anchor":[[16,25],[16,24],[18,25],[16,26],[16,26],[16,25],[16,25],[18,26],[18,26]]},"kidhead_72":{"name":"Pigtails","kind":"head","roles":["hair","skin"],"own":{"hair":["#a45210","#b45252","#de8b10","#ffcd20"],"skin":["#6a3918","#ac7352","#e6ac8b","#ffdebd"]},"anchor":[[16,25],[16,24],[18,25],[16,26],[16,26],[16,25],[16,25],[18,26],[18,26]]},"kidhead_120":{"name":"Cowlick","kind":"head","roles":["hair","skin"],"own":{"hair":["#6a3918","#6a3918","#6a3918","#ac7352"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#ffdebd"]},"anchor":[[16,25],[16,25],[17,25],[16,26],[16,26],[16,26],[16,26],[17,26],[17,26]]},"kidhead_131":{"name":"Swept","kind":"head","roles":["hair","skin"],"own":{"hair":["#a45210","#a45210","#de8b10","#ffcd20"],"skin":["#6a3918","#ac7352","#e6ac8b","#ffdebd"]},"anchor":[[16,25],[16,25],[17,25],[16,26],[16,26],[16,26],[16,26],[17,26],[17,26]]},"kidhead_139":{"name":"Curls","kind":"head","roles":["hair","skin"],"own":{"hair":["#a45210","#a45210","#de8b10","#ffcd20"],"skin":["#6a3918","#ac7352","#e6ac8b","#ffdebd"]},"anchor":[[16,25],[16,26],[10,26],[16,26],[16,26],[16,27],[16,27],[10,27],[10,27]]},"kidhead_37":{"name":"Cap","kind":"head","roles":["trim","skin"],"own":{"trim":["#183952","#183952","#183952","#106294"],"skin":["#6a3918","#ac7352","#e6ac8b","#ffdebd"]},"anchor":[[16,25],[16,24],[18,25],[16,26],[16,26],[16,25],[16,25],[18,26],[18,26]]},"kidbody_0":{"name":"Smock","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#183952","#106294","#4194cd","#7bc5ff"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#ffdebd"]},"neck":[[16,25],[16,24],[18,25],[16,26],[16,26],[16,25],[16,25],[18,26],[18,26]]},"kidbody_15":{"name":"Dress","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#a45210","#a45210","#de8b10","#ffcd20"],"trim":["#b45252","#b45252","#b45252","#b45252"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#ffdebd"]},"neck":[[16,25],[16,24],[18,25],[16,26],[16,26],[16,25],[16,25],[18,26],[18,26]]},"kidbody_83":{"name":"Tunic","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#a45210","#a45210","#de8b10","#ffcd20"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#ffdebd"]},"neck":[[16,25],[16,24],[18,25],[16,26],[16,26],[16,25],[16,25],[18,26],[18,26]]},"kidbody_102":{"name":"Shorts","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#a45210","#a45210","#de8b10","#ffcd20"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#ffdebd"]},"neck":[[16,25],[16,24],[18,25],[16,26],[16,26],[16,25],[16,25],[18,26],[18,26]]},"kidbody_111":{"name":"Jerkin","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#a45210","#a45210","#de8b10","#ffcd20"],"skin":["#e6ac8b","#e6ac8b","#e6ac8b","#ffdebd"]},"neck":[[16,25],[16,24],[18,25],[16,26],[16,26],[16,25],[16,25],[18,26],[18,26]]},"link_head":{"name":"Link","kind":"head","roles":["hair","outfit","skin"],"own":{"hair":["#deac52","#deac52","#deac52","#ffff00"],"outfit":["#107b29","#107b29","#41a429","#10ff08"],"skin":["#734120","#a47b41","#d5b48b","#ffe6bd"]},"anchor":[[16,21],[16,21],[18,21],[16,18],[16,18],[16,19],[16,19],[17,19],[18,19]]},"link":{"name":"Link","kind":"body","roles":["hair","outfit","skin"],"own":{"hair":["#deac52","#deac52","#deac52","#ffff00"],"outfit":["#107b29","#41a429","#10ff08","#bdffa4"],"skin":["#734120","#a47b41","#d5b48b","#ffe6bd"]},"neck":[[16,21],[16,21],[18,21],[16,18],[16,18],[16,19],[16,19],[17,19],[18,19]]},"goku_head":{"name":"Goku","kind":"head","roles":["hair","outfit","skin"],"own":{"hair":["#000000","#000000","#000000","#000000"],"outfit":["#7b3100","#7b3100","#7b3100","#7b3100"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"anchor":[[17,14],[15,14],[18,16],[17,15],[17,15],[15,14],[15,14],[17,16],[17,16]]},"goku":{"name":"Goku","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#7b3100","#ad4a00","#d66300","#ff7300"],"trim":["#210084","#21217b","#3110ad","#4221d6"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"neck":[[17,14],[15,14],[18,16],[17,15],[17,15],[15,14],[15,14],[17,16],[17,16]]},"gohan_head":{"name":"Gohan","kind":"head","roles":["hair","trim","skin"],"own":{"hair":["#000000","#000000","#000000","#000000"],"trim":["#949494","#adadad","#dedede","#ffffff"],"skin":["#b56339","#ce8463","#e79c84","#ffbdad"]},"anchor":[[16,17],[15,17],[17,18],[16,17],[16,17],[15,17],[15,17],[17,18],[17,18]]},"gohan":{"name":"Gohan","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#210084","#210084","#3110ad","#4221d6"],"trim":["#737373","#adadad","#c6c6c6","#ffffff"],"skin":["#b56339","#ce8463","#e79c84","#ffbdad"]},"neck":[[16,17],[15,17],[17,18],[16,17],[16,17],[15,17],[15,17],[17,18],[17,18]]},"kid_gohan_head":{"name":"Kid Gohan","kind":"head","roles":["hair","skin"],"own":{"hair":["#000000","#000000","#000000","#000000"],"skin":["#b56339","#ce8463","#e79c84","#ffbdad"]},"anchor":[[16,16],[15,17],[16,16],[16,17],[16,17],[15,17],[15,17],[16,16],[16,16]]},"kid_gohan":{"name":"Kid Gohan","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#7b0000","#7b0000","#ad0810","#d61029"],"trim":["#210084","#210084","#210084","#3110ad"],"skin":["#b56339","#ce8463","#e79c84","#ffbdad"]},"neck":[[16,16],[15,17],[16,16],[16,17],[16,17],[15,17],[15,17],[16,16],[16,16]]},"vegeta_head":{"name":"Vegeta","kind":"head","roles":["hair","trim","skin"],"own":{"hair":["#000000","#000000","#000000","#000000"],"trim":["#737373","#737373","#c6c6c6","#ffffff"],"skin":["#ad7b39","#c69452","#dead63","#f7c673"]},"anchor":[[16,16],[16,16],[16,17],[16,16],[16,16],[16,16],[16,16],[15,17],[15,17]]},"vegeta":{"name":"Vegeta","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#210084","#210084","#3110ad","#4221d6"],"trim":["#737373","#adadad","#c6c6c6","#ffffff"],"skin":["#ad7b39","#c69452","#dead63","#f7c673"]},"neck":[[16,16],[16,16],[16,17],[16,16],[16,16],[16,16],[16,16],[15,17],[15,17]]},"trunks_head":{"name":"Trunks","kind":"head","roles":["hair","outfit","trim"],"own":{"hair":["#7b217b","#7b217b","#d652ff","#efadff"],"outfit":["#210084","#210084","#3110ad","#4221d6"],"trim":["#c69452","#c69452","#c69452","#f7c673"]},"anchor":[[16,17],[16,15],[15,17],[16,17],[16,14],[16,14],[16,14],[15,17],[15,18]]},"trunks":{"name":"Trunks","kind":"body","roles":["outfit","trim"],"own":{"outfit":["#210084","#3110ad","#4221d6","#2184ff"],"trim":["#c69452","#c69452","#f7c673","#ffd642"]},"neck":[[16,17],[16,15],[15,17],[16,17],[16,14],[16,14],[16,14],[15,17],[15,18]]},"krillin_head":{"name":"Krillin","kind":"head","roles":["outfit","skin"],"own":{"outfit":["#7b3100","#ad4a00","#d66300","#ff9418"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"anchor":[[16,14],[16,14],[16,15],[16,14],[16,14],[16,14],[16,14],[16,19],[16,19]]},"krillin":{"name":"Krillin","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#7b3100","#ad4a00","#d66300","#ff9418"],"trim":["#21217b","#21217b","#21217b","#4221d6"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"neck":[[16,14],[16,14],[16,15],[16,14],[16,14],[16,14],[16,14],[16,19],[16,19]]},"tien_head":{"name":"Tien","kind":"head","roles":["skin"],"own":{"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"anchor":[[16,14],[17,14],[16,14],[16,11],[16,11],[17,14],[17,14],[15,14],[15,14]]},"tien":{"name":"Tien","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#107b00","#107b00","#31ad00","#52d600"],"trim":["#7b0000","#ad0810","#d61029","#ff1839"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"neck":[[16,14],[17,14],[16,14],[16,11],[16,11],[17,14],[17,14],[15,14],[15,14]]},"yamcha_head":{"name":"Yamcha","kind":"head","roles":["hair","outfit","skin"],"own":{"hair":["#000000","#000000","#000000","#424242"],"outfit":["#7b3100","#7b3100","#7b3100","#7b3100"],"skin":["#ad7b39","#c69452","#dead63","#f7c673"]},"anchor":[[16,17],[15,17],[17,20],[15,9],[15,9],[16,9],[16,9],[17,19],[17,19]]},"yamcha":{"name":"Yamcha","kind":"body","roles":["hair","outfit","skin"],"own":{"hair":["#000000","#000000","#000000","#424242"],"outfit":["#7b3100","#7b3100","#ad4a00","#d66300"],"skin":["#ad7b39","#c69452","#dead63","#f7c673"]},"neck":[[16,17],[15,17],[17,20],[15,9],[15,9],[16,9],[16,9],[17,19],[17,19]]},"bulma_head":{"name":"Bulma","kind":"head","roles":["hair","skin"],"own":{"hair":["#21637b","#21637b","#00a5a5","#7bbdce"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"anchor":[[15,15],[16,15],[17,16],[15,15],[15,15],[16,15],[16,15],[17,16],[17,16]]},"bulma":{"name":"Bulma","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#ad4a00","#ad4a00","#d66300","#e7a542"],"trim":["#7b0000","#7b0000","#7b0000","#ad0810"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"neck":[[15,15],[16,15],[17,16],[15,15],[15,15],[16,15],[16,15],[17,16],[17,16]]},"chichi_head":{"name":"Chi-Chi","kind":"head","roles":["hair","skin"],"own":{"hair":["#000000","#000000","#000000","#000000"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"anchor":[[16,14],[16,11],[16,14],[16,12],[16,12],[16,11],[16,11],[16,14],[16,14]]},"chichi":{"name":"Chi-Chi","kind":"body","roles":["hair","outfit","trim","skin"],"own":{"hair":["#000000","#000000","#000000","#000000"],"outfit":["#d66300","#d66300","#ff9418","#ffd642"],"trim":["#00218c","#2163ad","#2184ff","#7ba5ce"],"skin":["#e79c84","#e79c84","#e79c84","#ffbdad"]},"neck":[[16,14],[16,11],[16,14],[16,12],[16,12],[16,11],[16,11],[16,14],[16,14]]},"townsman_head":{"name":"Townsman","kind":"head","roles":["hair","skin"],"own":{"hair":["#6b3110","#6b3110","#7b6342","#ada57b"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"anchor":[[17,14],[16,15],[16,15],[17,13],[17,13],[16,14],[16,14],[16,14],[16,14]]},"townsman":{"name":"Townsman","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#0039b5","#0039b5","#2163ff","#2184ff"],"trim":["#107b00","#107b00","#31ad00","#52d600"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"neck":[[17,14],[16,15],[16,15],[17,13],[17,13],[16,14],[16,14],[16,14],[16,14]]},"townswoman_head":{"name":"Townswoman","kind":"head","roles":["hair","outfit","skin"],"own":{"hair":["#6b3110","#6b3110","#845218","#a56b31"],"outfit":["#007373","#007373","#00a5a5","#00d6d6"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"anchor":[[16,20],[15,20],[18,17],[16,20],[16,20],[15,20],[15,20],[18,17],[18,17]]},"townswoman":{"name":"Townswoman","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#007373","#007373","#00a5a5","#00d6d6"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"neck":[[16,20],[15,20],[18,17],[16,20],[16,20],[15,20],[15,20],[18,17],[18,17]]},"kid_buu_head":{"name":"Kid Buu","kind":"head","roles":["skin"],"own":{"skin":["#bd397b","#de5294","#ff8cbd","#ffa5ce"]},"anchor":[[16,16],[17,16],[16,17],[16,16],[16,16],[17,16],[17,16],[16,17],[16,17]]},"kid_buu":{"name":"Kid Buu","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#a5a5a5","#a5a5a5","#dedede","#ffffff"],"trim":["#ad4a00","#d66300","#ff7300","#ffad00"],"skin":["#9c185a","#de5294","#ff73b5","#ffa5ce"]},"neck":[[16,16],[17,16],[16,17],[16,16],[16,16],[17,16],[17,16],[16,17],[16,17]]},"fat_buu_head":{"name":"Fat Buu","kind":"head","roles":["outfit","skin"],"own":{"outfit":["#420073","#6308ad","#7329bd","#944ace"],"skin":["#bd397b","#de5294","#ff73b5","#ffa5ce"]},"anchor":[[16,15],[16,14],[16,15],[16,13],[15,13],[16,13],[15,12],[16,14],[16,12]]},"fat_buu":{"name":"Fat Buu","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#420073","#6308ad","#7329bd","#944ace"],"trim":["#ad4a00","#ad4a00","#d66300","#ffad00"],"skin":["#9c185a","#de5294","#ff73b5","#ffa5ce"]},"neck":[[16,15],[16,14],[16,15],[16,13],[15,13],[16,13],[15,12],[16,14],[16,12]]},"super_buu_head":{"name":"Super Buu","kind":"head","roles":["skin"],"own":{"skin":["#bd397b","#de5294","#ff8cbd","#ffa5ce"]},"anchor":[[16,11],[15,11],[15,11],[16,10],[16,10],[16,10],[16,10],[15,11],[15,11]]},"super_buu":{"name":"Super Buu","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#a5a5a5","#c6c6c6","#dedede","#ffffff"],"trim":["#ad4a00","#d66300","#ff7300","#ffad00"],"skin":["#bd397b","#de5294","#ff73b5","#ffa5ce"]},"neck":[[16,11],[15,11],[15,11],[16,10],[16,10],[16,10],[16,10],[15,11],[15,11]]},"piccolo_head":{"name":"Piccolo","kind":"head","roles":["trim","skin"],"own":{"trim":["#949494","#adadad","#c6c6c6","#ffffff"],"skin":["#107b00","#107b00","#31ad00","#52d600"]},"anchor":[[15,10],[16,10],[14,13],[15,10],[15,10],[16,10],[16,10],[15,14],[15,14]]},"piccolo":{"name":"Piccolo","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#520084","#520084","#520084","#6308ad"],"trim":["#949494","#adadad","#c6c6c6","#ffffff"],"skin":["#107b00","#107b00","#31ad00","#52d600"]},"neck":[[15,10],[16,10],[14,13],[15,10],[15,10],[16,10],[16,10],[15,14],[15,14]]},"piccolo_gi_head":{"name":"Piccolo (Gi)","kind":"head","roles":["skin"],"own":{"skin":["#107b00","#107b00","#31ad00","#52d600"]},"anchor":[[15,12],[16,12],[15,13],[15,13],[15,13],[16,11],[16,11],[14,14],[14,14]]},"piccolo_gi":{"name":"Piccolo (Gi)","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#520084","#520084","#520084","#6308ad"],"trim":["#0039b5","#0039b5","#2163ce","#2184ff"],"skin":["#107b00","#107b00","#31ad00","#52d600"]},"neck":[[15,12],[16,12],[15,13],[15,13],[15,13],[16,11],[16,11],[14,14],[14,14]]},"dende_head":{"name":"Dende","kind":"head","roles":["trim","skin"],"own":{"trim":["#c6c6c6","#c6c6c6","#c6c6c6","#ffffff"],"skin":["#107b00","#107b00","#31ad00","#52d600"]},"anchor":[[15,11],[15,11],[15,13],[15,11],[15,11],[15,11],[15,11],[15,13],[15,13]]},"dende":{"name":"Dende","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#0039b5","#0039b5","#2163ce","#2184ff"],"trim":["#949494","#949494","#c6c6c6","#ffffff"],"skin":["#107b00","#107b00","#31ad00","#52d600"]},"neck":[[15,11],[15,11],[15,13],[15,11],[15,11],[15,11],[15,11],[15,13],[15,13]]},"nail_head":{"name":"Nail","kind":"head","roles":["outfit","skin"],"own":{"outfit":["#737b7b","#a5adb5","#ced6de","#ffffff"],"skin":["#086310","#086310","#188421","#29ad39"]},"anchor":[[16,13],[16,13],[17,17],[16,13],[16,13],[16,13],[16,13],[17,17],[17,17]]},"nail":{"name":"Nail","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#737b7b","#a5adb5","#ced6de","#ffffff"],"trim":["#7b4200","#7b4200","#7b4200","#b54a00"],"skin":["#086310","#086310","#188421","#29ad39"]},"neck":[[16,13],[16,13],[17,17],[16,13],[16,13],[16,13],[16,13],[17,17],[17,17]]},"moori_head":{"name":"Elder Moori","kind":"head","roles":["trim","skin"],"own":{"trim":["#c6c6c6","#c6c6c6","#c6c6c6","#ffffff"],"skin":["#107b00","#107b00","#31ad00","#52d600"]},"anchor":[[16,13],[16,13],[15,13],[16,13],[16,13],[16,13],[16,13],[15,13],[15,13]]},"moori":{"name":"Elder Moori","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#210084","#210084","#3110ad","#4221d6"],"trim":["#737373","#737373","#c6c6c6","#ffffff"],"skin":["#107b00","#107b00","#31ad00","#52d600"]},"neck":[[16,13],[16,13],[15,13],[16,13],[16,13],[16,13],[16,13],[15,13],[15,13]]},"namekian_head":{"name":"Namekian","kind":"head","roles":["outfit","skin"],"own":{"outfit":["#848c94","#848c94","#c6cece","#ffffff"],"skin":["#086310","#086310","#188421","#29ad39"]},"anchor":[[16,13],[16,13],[16,20],[16,13],[16,13],[16,13],[16,13],[16,20],[16,20]]},"namekian":{"name":"Namekian","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#848c94","#848c94","#c6cece","#ffffff"],"trim":["#000873","#000873","#000873","#0010ad"],"skin":["#086310","#086310","#188421","#29ad39"]},"neck":[[16,13],[16,13],[16,20],[16,13],[16,13],[16,13],[16,13],[16,20],[16,20]]},"android_16_head":{"name":"Android 16","kind":"head","roles":["hair","outfit","skin"],"own":{"hair":["#ad4a00","#ad4a00","#d66300","#ff7300"],"outfit":["#6b6b00","#6b6b00","#9c9c00","#ffff39"],"skin":["#b56339","#b56339","#e79c84","#ffbdad"]},"anchor":[[16,9],[15,9],[16,15],[16,9],[16,9],[15,9],[15,9],[16,16],[16,16]]},"android_16":{"name":"Android 16","kind":"body","roles":["hair","outfit","skin"],"own":{"hair":["#ad4a00","#ad4a00","#ad4a00","#ad4a00"],"outfit":["#6b6b00","#6b6b00","#9c9c00","#ffff39"],"skin":["#b56339","#ce8463","#e79c84","#ffbdad"]},"neck":[[16,9],[15,9],[16,15],[16,9],[16,9],[15,9],[15,9],[16,16],[16,16]]},"android_17_head":{"name":"Android 17","kind":"head","roles":["hair","trim","skin"],"own":{"hair":["#000000","#000000","#000000","#424242"],"trim":["#ad4a00","#ad4a00","#ad4a00","#ad4a00"],"skin":["#ad7b39","#dead63","#f7c673","#f7dead"]},"anchor":[[16,10],[15,14],[17,15],[17,17],[17,17],[17,17],[17,17],[17,17],[17,17]]},"android_17":{"name":"Android 17","kind":"body","roles":["hair","outfit","trim","skin"],"own":{"hair":["#000000","#000000","#000000","#000000"],"outfit":["#21217b","#4221d6","#5a31ff","#7b63e7"],"trim":["#ad4a00","#ad4a00","#ad4a00","#d66300"],"skin":["#ad7b39","#c69452","#dead63","#f7c673"]},"neck":[[16,10],[15,14],[17,15],[17,17],[17,17],[17,17],[17,17],[17,17],[17,17]]},"android_18_head":{"name":"Android 18","kind":"head","roles":["hair","trim","skin"],"own":{"hair":["#e7a542","#e7a542","#ffd642","#ffff7b"],"trim":["#845218","#845218","#845218","#ad7b39"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"anchor":[[16,11],[16,11],[17,17],[16,12],[17,13],[16,11],[16,11],[16,17],[16,17]]},"android_18":{"name":"Android 18","kind":"body","roles":["hair","outfit","trim","skin"],"own":{"hair":["#e7a542","#e7a542","#ffd642","#ffff7b"],"outfit":["#210084","#21217b","#3110ad","#4221d6"],"trim":["#845218","#845218","#845218","#ad7b39"],"skin":["#ce8463","#ce8463","#e79c84","#ffbdad"]},"neck":[[16,11],[16,11],[17,17],[16,12],[17,13],[16,11],[16,11],[16,17],[16,17]]},"android_19_head":{"name":"Android 19","kind":"head","roles":["outfit","trim","skin"],"own":{"outfit":["#946329","#946329","#c69452","#e7bd42"],"trim":["#7b0000","#7b0000","#7b0000","#ad0810"],"skin":["#949494","#949494","#c6c6c6","#ffffff"]},"anchor":[[16,10],[16,10],[16,16],[16,10],[16,10],[16,10],[16,10],[15,16],[15,16]]},"android_19":{"name":"Android 19","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#845218","#c69452","#e7bd42","#e7ef7b"],"trim":["#7b0000","#7b0000","#7b0000","#ad0810"],"skin":["#949494","#949494","#c6c6c6","#ffffff"]},"neck":[[16,10],[16,10],[16,16],[16,10],[16,10],[16,10],[16,10],[15,16],[15,16]]},"android_20_head":{"name":"Android 20","kind":"head","roles":["hair","trim"],"own":{"hair":["#adadad","#adadad","#dedede","#ffffff"],"trim":["#d66300","#d66300","#ff9418","#ffd642"]},"anchor":[[16,17],[16,17],[16,19],[16,17],[16,17],[16,17],[16,17],[16,19],[16,19]]},"android_20":{"name":"Android 20","kind":"body","roles":["outfit","trim"],"own":{"outfit":["#7b0000","#7b0000","#ad0810","#d61029"],"trim":["#d66300","#d66300","#ff9418","#ffd642"]},"neck":[[16,17],[16,17],[16,19],[16,17],[16,17],[16,17],[16,17],[16,19],[16,19]]},"cell_head":{"name":"Cell","kind":"head","roles":["outfit","skin"],"own":{"outfit":["#7b217b","#7b217b","#7b217b","#e7d6ff"],"skin":["#6b6b00","#6b6b00","#7ba542","#ced67b"]},"anchor":[[16,11],[15,11],[14,13],[16,12],[16,12],[16,12],[16,12],[12,14],[12,13]]},"cell":{"name":"Cell","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#5a007b","#7b217b","#ad63ad","#e7d6ff"],"skin":["#6b6b00","#7ba542","#7bbd42","#ced67b"]},"neck":[[16,11],[15,11],[14,13],[16,12],[16,12],[16,12],[16,12],[12,14],[12,13]]},"frieza_head":{"name":"Frieza","kind":"head","roles":["trim","skin"],"own":{"trim":["#5a007b","#7b21ad","#ad21ff","#de84ff"],"skin":["#7ba5ce","#7ba5ce","#adbde7","#ffffff"]},"anchor":[[15,14],[16,14],[14,16],[15,14],[15,14],[16,13],[16,13],[13,15],[13,15]]},"frieza":{"name":"Frieza","kind":"body","roles":["trim","skin"],"own":{"trim":["#5a007b","#5a007b","#5a007b","#7b21ad"],"skin":["#7ba5ce","#7ba5ce","#adbde7","#ffffff"]},"neck":[[15,14],[16,14],[14,16],[15,14],[15,14],[16,13],[16,13],[13,15],[13,15]]},"frieza_first_head":{"name":"Frieza (First Form)","kind":"head","roles":["outfit","trim","skin"],"own":{"outfit":["#732939","#732939","#bd5a73","#de7b94"],"trim":["#421063","#421063","#732994","#de8cf7"],"skin":["#c6c6c6","#c6c6c6","#dec6de","#ffffff"]},"anchor":[[16,12],[16,12],[15,14],[16,11],[16,11],[16,11],[16,11],[15,13],[15,13]]},"frieza_first":{"name":"Frieza (First Form)","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#732939","#8c394a","#bd5a73","#de7b94"],"trim":["#421063","#421063","#732994","#de8cf7"],"skin":["#c6c6c6","#c6c6c6","#dec6de","#ffffff"]},"neck":[[16,12],[16,12],[15,14],[16,11],[16,11],[16,11],[16,11],[15,13],[15,13]]},"mecha_frieza_head":{"name":"Mecha Frieza","kind":"head","roles":["trim","skin"],"own":{"trim":["#210084","#210084","#7b63ad","#7b63e7"],"skin":["#7ba5ce","#7ba5ce","#adbde7","#ffffff"]},"anchor":[[15,14],[15,14],[14,16],[15,14],[15,14],[15,14],[15,14],[15,14],[15,14]]},"mecha_frieza":{"name":"Mecha Frieza","kind":"body","roles":["trim","skin"],"own":{"trim":["#210084","#5a007b","#7b21ad","#7b63ad"],"skin":["#7ba5ce","#7ba5ce","#adbde7","#ffffff"]},"neck":[[15,14],[15,14],[14,16],[15,14],[15,14],[15,14],[15,14],[15,14],[15,14]]},"king_cold_head":{"name":"King Cold","kind":"head","roles":["outfit","trim","skin"],"own":{"outfit":["#7b0000","#7b0000","#ad0810","#d61029"],"trim":["#21637b","#21637b","#00a5a5","#7bffce"],"skin":["#5a007b","#ce29ff","#de84ff","#efadff"]},"anchor":[[14,9],[14,9],[14,9],[15,17],[13,13],[15,17],[13,13],[15,17],[13,13]]},"king_cold":{"name":"King Cold","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#7b0000","#7b0000","#ad0810","#d61029"],"trim":["#7bffce","#7bffce","#7bffce","#7bffce"],"skin":["#5a007b","#9c00d6","#ce29ff","#de84ff"]},"neck":[[14,9],[14,9],[14,9],[15,17],[13,13],[15,17],[13,13],[15,17],[13,13]]},"supreme_kai_head":{"name":"Supreme Kai","kind":"head","roles":["hair","skin"],"own":{"hair":["#d6adef","#d6adef","#dedede","#ffffff"],"skin":["#9c00d6","#ad63ad","#ce63ce","#de84ff"]},"anchor":[[16,15],[17,15],[16,14],[17,15],[16,15],[16,15],[17,15],[16,14],[16,14]]},"supreme_kai":{"name":"Supreme Kai","kind":"body","roles":["hair","outfit","trim","skin"],"own":{"hair":["#ffffff","#ffffff","#ffffff","#ffffff"],"outfit":["#004263","#006b84","#009cb5","#00ced6"],"trim":["#733900","#ad4a00","#d66300","#ff8400"],"skin":["#7b00ad","#ad63ad","#ce63ce","#de84ff"]},"neck":[[16,15],[17,15],[16,14],[17,15],[16,15],[16,15],[17,15],[16,14],[16,14]]},"kibito_head":{"name":"Kibito","kind":"head","roles":["hair","skin"],"own":{"hair":["#7b7b7b","#c6c6c6","#dedede","#ffffff"],"skin":["#9c00d6","#ad63ad","#ce63ce","#de84ff"]},"anchor":[[16,11],[17,11],[18,11],[16,11],[16,11],[17,11],[17,11],[17,11],[17,11]]},"kibito":{"name":"Kibito","kind":"body","roles":["hair","outfit","trim","skin"],"own":{"hair":["#7b7b7b","#c6c6c6","#dedede","#ffffff"],"outfit":["#ad4a00","#d66300","#ff8400","#ffad00"],"trim":["#210084","#210084","#2163ad","#21a5ce"],"skin":["#7b00ad","#ad63ad","#ce63ce","#de84ff"]},"neck":[[16,11],[17,11],[18,11],[16,11],[16,11],[17,11],[17,11],[17,11],[17,11]]},"kibito_kai_head":{"name":"Kibito Kai","kind":"head","roles":["hair","trim","skin"],"own":{"hair":["#7ba5ce","#add6e7","#ceefff","#f7f7f7"],"trim":["#d66300","#d66300","#d66300","#d66300"],"skin":["#9c00d6","#ad63ad","#ce63ce","#de84ff"]},"anchor":[[16,15],[17,10],[16,16],[16,15],[16,15],[16,11],[17,11],[16,17],[16,17]]},"kibito_kai":{"name":"Kibito Kai","kind":"body","roles":["hair","outfit","trim","skin"],"own":{"hair":["#7ba5ce","#add6e7","#ceefff","#f7f7f7"],"outfit":["#004263","#006b84","#009cb5","#00ced6"],"trim":["#733900","#733900","#d66300","#ffb529"],"skin":["#7b00ad","#ad63ad","#ce63ce","#de84ff"]},"neck":[[16,15],[17,10],[16,16],[16,15],[16,15],[16,11],[17,11],[16,17],[16,17]]},"king_kai_head":{"name":"King Kai","kind":"head","roles":["outfit","skin"],"own":{"outfit":["#5a0000","#5a0000","#940000","#c60000"],"skin":["#2184ff","#188cef","#18bdef","#add6ff"]},"anchor":[[16,17],[15,17],[15,18],[16,17],[16,17],[15,17],[15,17],[15,18],[15,18]]},"king_kai":{"name":"King Kai","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#5a0000","#5a0000","#940000","#c60000"],"trim":["#315a00","#315a00","#529c00","#8cce39"],"skin":["#2184ff","#2184ff","#18bdef","#add6ff"]},"neck":[[16,17],[15,17],[15,18],[16,17],[16,17],[15,17],[15,17],[15,18],[15,18]]},"mario_head":{"name":"Mario","kind":"head","roles":["outfit","skin"],"own":{"outfit":["#bd0000","#bd0000","#bd0000","#ff0808"],"skin":["#e67b00","#e67b00","#ff9c18","#ffde9c"]},"anchor":[[16,18],[16,18],[15,19],[16,19],[16,19],[16,19],[16,19],[15,20],[15,19]]},"mario":{"name":"Mario","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#bd0000","#bd0000","#bd0000","#ff0808"],"trim":["#0020d5","#0020d5","#0020d5","#3173ff"],"skin":["#e67b00","#e67b00","#ff9c18","#ffde9c"]},"neck":[[16,18],[16,18],[15,19],[16,19],[16,19],[16,19],[16,19],[15,20],[15,19]]},"luigi_head":{"name":"Luigi","kind":"head","roles":["outfit","skin"],"own":{"outfit":["#00bd00","#00bd00","#00bd00","#18ee00"],"skin":["#ff9c20","#ff9c20","#ffbd4a","#ffe6ac"]},"anchor":[[16,17],[16,16],[16,17],[16,16],[16,16],[16,18],[16,18],[16,19],[16,19]]},"luigi":{"name":"Luigi","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#00bd00","#00bd00","#00bd00","#18ee00"],"trim":["#0018c5","#0018c5","#0018c5","#3173ff"],"skin":["#ff9c20","#ff9c20","#ffbd4a","#ffe6ac"]},"neck":[[16,17],[16,16],[16,17],[16,16],[16,16],[16,18],[16,18],[16,19],[16,19]]},"peach_head":{"name":"Peach","kind":"head","roles":["hair","outfit","trim"],"own":{"hair":["#946200","#946200","#d59400","#ffde00"],"outfit":["#ff187b","#ff187b","#ff7bbd","#ffb4de"],"trim":["#316aff","#316aff","#31a4ff","#94d5ff"]},"anchor":[[16,12],[16,12],[15,12],[16,13],[16,13],[16,13],[16,13],[15,14],[15,14]]},"peach":{"name":"Peach","kind":"body","roles":["hair","outfit","trim","skin"],"own":{"hair":["#946200","#946200","#d59400","#ffde00"],"outfit":["#ff187b","#ff187b","#ff7bbd","#ffb4de"],"trim":["#316aff","#316aff","#31a4ff","#94d5ff"],"skin":["#fff6bd","#fff6bd","#fff6bd","#fff6bd"]},"neck":[[16,12],[16,12],[15,12],[16,13],[16,13],[16,13],[16,13],[15,14],[15,14]]},"toad_head":{"name":"Toad","kind":"head","roles":["hair","skin"],"own":{"hair":["#bd0000","#bd0000","#ff0808","#ff625a"],"skin":["#ffc552","#ffc552","#ffc552","#ffc552"]},"anchor":[[16,22],[16,22],[17,22],[16,24],[16,24],[16,24],[16,24],[16,24],[16,24]]},"toad":{"name":"Toad","kind":"body","roles":["outfit","skin"],"own":{"outfit":["#0073ff","#0073ff","#0073ff","#6ab4ff"],"skin":["#ffc552","#ffc552","#ffc552","#ffeeb4"]},"neck":[[16,22],[16,22],[17,22],[16,24],[16,24],[16,24],[16,24],[16,24],[16,24]]},"star_toad_head":{"name":"Toad Brigade","kind":"head","roles":["hair","skin"],"own":{"hair":["#c51010","#c51010","#c51010","#f61010"],"skin":["#e67b00","#e67b00","#e67b00","#ffd5a4"]},"anchor":[[16,19],[16,17],[16,16],[16,21],[16,21],[16,22],[16,22],[16,18],[16,18]]},"star_toad":{"name":"Toad Brigade","kind":"body","roles":["hair","outfit","skin"],"own":{"hair":["#c51010","#c51010","#c51010","#f61010"],"outfit":["#0020d5","#0020d5","#0020d5","#3173ff"],"skin":["#e67b00","#e67b00","#e67b00","#ffd5a4"]},"neck":[[16,19],[16,17],[16,16],[16,21],[16,21],[16,22],[16,22],[16,18],[16,18]]},"bowser_head":{"name":"Bowser","kind":"head","roles":["hair","outfit","trim","skin"],"own":{"hair":["#ff0000","#ff0000","#ff0000","#ff0000"],"outfit":["#009410","#009410","#009410","#00cd20"],"trim":["#ffffb4","#ffffb4","#ffffb4","#ffffb4"],"skin":["#bd7300","#bd7300","#e69c00","#ffd500"]},"anchor":[[16,14],[16,14],[16,14],[15,15],[16,15],[16,15],[16,15],[16,15],[16,15]]},"bowser":{"name":"Bowser","kind":"body","roles":["hair","outfit","trim","skin"],"own":{"hair":["#ff0000","#ff0000","#ff0000","#ff0000"],"outfit":["#009410","#009410","#009410","#00cd20"],"trim":["#decd83","#decd83","#decd83","#ffffb4"],"skin":["#bd7300","#bd7300","#e69c00","#ffd500"]},"neck":[[16,14],[16,14],[16,14],[15,15],[16,15],[16,15],[16,15],[16,15],[16,15]]},"pianta":{"name":"Pianta","kind":"whole","roles":["hair","outfit","trim","skin"],"own":{"hair":["#2f7817","#388720","#53b934","#64c432"],"outfit":["#373737","#454545","#4f4e4f","#5a595a"],"trim":["#296b10","#317f18","#50ac30","#55c134"],"skin":["#d8c921","#e0d223","#e4d926","#eee229"]}},"don_pianta":{"name":"Don Pianta","kind":"whole","roles":["hair","outfit","trim","skin"],"own":{"hair":["#2c7215","#419827","#4cad2e","#60be31"],"outfit":["#424342","#484848","#4f4e4f","#5c5b5c"],"trim":["#296711","#34851b","#4ea62e","#57c536"],"skin":["#d18522","#d88b26","#e9962f","#ee9931"]}},"frankie":{"name":"Frankie","kind":"whole","roles":["hair","outfit","trim","skin"],"own":{"hair":["#2f7817","#388720","#53b934","#64c432"],"outfit":["#d1d0d5","#d6d5d9","#dcd9dd","#e5e1e5"],"trim":["#296b10","#317f18","#50ac30","#55c134"],"skin":["#84c4d9","#88cce0","#8dd1e5","#94daee"]}},"francesca":{"name":"Francesca","kind":"whole","roles":["hair","outfit","trim","skin"],"own":{"hair":["#ac7a1e","#bf9128","#c49a2e","#dab039"],"outfit":["#c6c8cd","#d6d6db","#dfdde0","#e4e1e6"],"trim":["#7b5010","#9a6915","#bd8a29","#c9a02f"],"skin":["#e3c837","#ebd03d","#efd43f","#f6da41"]}},"goomba":{"name":"Goomba","kind":"whole","roles":["outfit","skin"],"own":{"outfit":["#c63d08","#d84109","#de4208","#e54308"],"skin":["#92632e","#a87235","#b47939","#c8a938"]}},"goombella":{"name":"Goombella","kind":"whole","roles":["hair","outfit","trim","skin"],"own":{"hair":["#6b561b","#c3861e","#da941e","#f5b118"],"outfit":["#4a2410","#5c280f","#6e2a0e","#8f3813"],"trim":["#738564","#738565","#9ba17f","#b3b78c"],"skin":["#ca856a","#d38d72","#d89276","#de997b"]}},"koops_head":{"name":"Koops","kind":"head","roles":["outfit","trim","skin"],"own":{"outfit":["#137620","#0e801d","#346d23","#16941e"],"trim":["#889fba","#9db3ce","#a2b8d2","#a5bad5"],"skin":["#e0bd2a","#e5c42a","#e7c82b","#edce2a"]},"anchor":[[16,19],[15,19],[16,19],[16,18],[16,18],[15,18],[15,18],[16,18],[16,18]]},"koops":{"name":"Koops","kind":"body","roles":["outfit","trim","skin"],"own":{"outfit":["#08781e","#0e801d","#16941e","#0f9d1a"],"trim":["#174f7f","#97aec8","#9db3ce","#a5bad5"],"skin":["#c69d2e","#e0bd2a","#e5c42a","#e7c82b"]},"neck":[[16,19],[15,19],[16,19],[16,18],[16,18],[15,18],[15,18],[16,18],[16,18]]}};
// (End of the character creator's parts.)
