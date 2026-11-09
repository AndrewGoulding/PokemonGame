// Colosseum's heart gauge and Hyper Mode, by the numbers: how big each Shadow Pokémon's heart gauge is, how much each
// thing opens it for each nature, its five bars and what each does, and how often it goes into Hyper Mode.
// Depends on: window.Orre (its SHADOW, given each gauge's size here as `heart`).
//
//   OrreHeart.migrate(record)          // an older save's heart (0-100) as this gauge's points (record.heartMax)
//   OrreHeart.snagged(record)          // a just-snagged Shadow Pokémon's heart: full
//   OrreHeart.bars(record)             // how many of the five bars are left (0-5, a fraction)
//   OrreHeart.open(record, way, n)     // the heart opens by `way` ("battle", "call", "walk", "daycare", "scent"), n times
//   OrreHeart.moves(record)            // how many of its own moves it has back (0-3; Shadow Rush always)
//   OrreHeart.natureShown(record)      // its nature known yet?
//   OrreHeart.banks(record)            // Exp. Points (and friendship) kept for it yet?
//   OrreHeart.door(record)             // the Summary's words for its heart
//   OrreHeart.hyperChance(record)      // the chance its Shadow Rush sends it into Hyper Mode
"use strict";

(function () {
  // Each Shadow Pokémon's heart gauge, in points (the user's Shadow Pokémon spreadsheet, Colosseum's exact figures).
  const SIZES = {
    Makuhita: 3000, Bayleef: 3000, Quilava: 3000, Croconaw: 3000, Slugma: 4000, Noctowl: 3000, Flaaffy: 3000,
    Skiploom: 3000, Quagsire: 4000, Misdreavus: 4000, Furret: 5000, Yanma: 5000, Remoraid: 4000, Mantine: 5000,
    Qwilfish: 5000, Meditite: 5000, Dunsparce: 5000, Swablu: 5000, Sudowoodo: 10000, Hitmontop: 6000, Entei: 13000,
    Ledian: 6000, Suicune: 13000, Gligar: 6000, Stantler: 6000, Piloswine: 6000, Sneasel: 6000, Aipom: 6000,
    Murkrow: 6000, Forretress: 6000, Ariados: 6000, Granbull: 6000, Vibrava: 6000, Raikou: 13000, Sunflora: 7000,
    Delibird: 7000, Heracross: 7000, Skarmory: 13000, Miltank: 7000, Absol: 7000, Houndoom: 7000, Tropius: 7000,
    Metagross: 15000, Tyranitar: 20000, Smeargle: 7000, Ursaring: 7000, Shuckle: 7000, Togetic: 5000
  };
  const sizeOf = (species) => SIZES[species] || 5000;
  for (const s of (window.Orre && window.Orre.SHADOW) || []) s.heart = sizeOf(s.species);

  // How far each opens the gauge, by nature, in Colosseum (Smogon's Colosseum/XD mechanics spreadsheet, the Colosseum
  // figures; checked against the LP Archive's table): battling (once a battle, sent out), calling it out of Hyper Mode,
  // walking (every 256 steps), the Day-Care (every 256 steps), and a Joy Scent (an Excite Scent twice it, a Vivid three
  // times).
  const N = (battle, call, walk, daycare, scent) => ({ battle, call, walk, daycare, scent });
  const NATURES = {
    Bashful: N(50, 300, 75, 450, 200), Docile: N(75, 600, 100, 225, 100), Hardy: N(150, 300, 150, 150, 100),
    Quirky: N(200, 225, 50, 600, 75), Serious: N(100, 450, 100, 300, 75),
    Adamant: N(150, 225, 150, 300, 75), Brave: N(200, 225, 150, 225, 75), Lonely: N(50, 450, 150, 150, 200),
    Naughty: N(150, 225, 200, 225, 75), Bold: N(150, 225, 200, 300, 50), Impish: N(200, 300, 150, 150, 75),
    Lax: N(100, 225, 150, 225, 150), Relaxed: N(75, 225, 75, 600, 150), Mild: N(75, 225, 75, 450, 200),
    Modest: N(75, 300, 75, 600, 100), Quiet: N(100, 300, 100, 300, 100), Rash: N(75, 300, 100, 300, 150),
    Calm: N(50, 300, 100, 450, 150), Careful: N(75, 300, 75, 450, 150), Gentle: N(50, 300, 75, 600, 150),
    Sassy: N(200, 150, 150, 225, 100), Hasty: N(200, 300, 75, 150, 150), Jolly: N(150, 300, 100, 150, 150),
    Naive: N(100, 300, 150, 225, 100), Timid: N(50, 450, 50, 600, 150)
  };
  const SCENT_TIMES = { "joy-scent": 1, "excite-scent": 2, "vivid-scent": 3 };
  const STEPS = 256;   // (walking, and the Day-Care: every 256 steps)

  // Hyper Mode: the chance its Shadow Rush sends it into Hyper Mode, by nature and the bars left (5 down to 0;
  // Bulbapedia's Hyper Mode table).
  const HYPER = [
    [["Adamant", "Bashful", "Hardy", "Relaxed"], [0.25, 0.5, 0.7, 0.7, 0.7, 0.3]],
    [["Calm", "Lonely", "Modest", "Timid"], [0.05, 0.1, 0.15, 0.2, 0.25, 0.3]],
    [["Bold", "Brave", "Lax", "Quirky", "Sassy"], [0.05, 0.1, 0.2, 0.3, 0.4, 0.5]],
    [["Hasty", "Impish", "Naughty", "Rash"], [0.12, 0.25, 0.3, 0.4, 0.4, 0.5]],
    [["Careful", "Docile", "Quiet", "Serious"], [0.05, 0.1, 0.15, 0.15, 0.2, 0.2]],
    [["Gentle", "Jolly", "Mild", "Naive"], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]]
  ];

  const max = (r) => r.heartMax || sizeOf(r.species);
  // An older save's heart, 0-100 (how shut, of 100), as this gauge's points.
  function migrate(r) {
    if (!r || !r.shadow || r.heart == null || r.heartMax) return r;
    const size = sizeOf(r.species);
    r.heart = Math.round(Math.max(0, Math.min(100, r.heart | 0)) / 100 * size);
    r.heartMax = size;
    return r;
  }
  function snagged(r) { r.heartMax = sizeOf(r.species); r.heart = r.heartMax; return r; }
  // The bars left, of five (a fraction: 5 is a heart shut tight, 0 one ready to open).
  const bars = (r) => (r && r.shadow && r.heart != null ? 5 * Math.max(0, migrate(r).heart) / max(r) : 0);
  // Opens the heart by `way`, `times` over; returns the points it opened.
  function open(r, way, times) {
    if (!r || !r.shadow || r.heart == null || !(r.heart > 0)) return 0;
    migrate(r);
    const nat = NATURES[r.nature] || NATURES.Quiet;
    const n = Math.round((way === "scent" ? nat.scent : nat[way] || 0) * (times == null ? 1 : times));
    const was = r.heart;
    r.heart = Math.max(0, r.heart - n);
    return was - r.heart;
  }
  const scentTimes = (item) => SCENT_TIMES[item] || 0;
  // (The LP Archive's table of the bars: under 4 left it regains its first own move, under 2 its second, under 1 its
  // third; under 3 its nature shows, and it starts to keep Exp. Points and friendship.)
  const moves = (r) => { const b = bars(r); return b < 1 ? 3 : b < 2 ? 2 : b < 4 ? 1 : 0; };
  const natureShown = (r) => !(r && r.shadow && r.heart != null) || bars(r) < 3;
  const banks = (r) => bars(r) < 3;
  // The Summary's words (Colosseum's pocket_menu #11225-#11231), by the bars left.
  function door(r) {
    const b = bars(r), h = r.heart | 0;
    if (h <= 0) return "The door to its heart is about to open. Undo the final lock!";
    return "The door to its heart is " + (h >= max(r) ? "tightly shut." : b >= 4 ? "starting to open." : b >= 3 ? "opening up."
      : b >= 2 ? "opening wider." : b >= 1 ? "nearly open." : "almost fully open.");
  }
  function hyperChance(r) {
    const left = Math.ceil(bars(r) - 1e-9), row = HYPER.find(([ns]) => ns.includes(r.nature));
    return row ? row[1][Math.max(0, Math.min(5, left))] : 0.15;
  }

  window.OrreHeart = { NATURES, HYPER, STEPS, sizeOf, migrate, snagged, bars, open, scentTimes, moves, natureShown, banks, door, hyperChance };
})();
