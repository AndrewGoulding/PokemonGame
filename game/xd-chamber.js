// Pokémon XD's Purify Chamber (the Pokémon HQ Lab's lobby, once it's finished: player.flags.xdChamber). Nine Sets,
// each a Shadow Pokémon in the middle and up to four other Pokémon in a ring round it. The ring "flows" when each
// Pokémon is super effective against the next one round it (Normal counts as super effective against Normal, as the
// LP Archive's XD guide has it); four in a full ring that flows all the way round is a perfect circle. As you walk,
// every STEPS steps, each Set opens its Shadow Pokémon's heart by its tempo: a base by how many are in the ring, more
// for each pair round the ring that flows and less for each that's resisted (twice that with four), then a third
// more if the Shadow Pokémon is super effective against the first of the ring, a third less if it's resisted. Once
// its heart is open it can be purified there. (Every figure here is Bulbapedia's "Purify Chamber" as search engines
// quote it, not read in full: 161 steps; 10, 27, 49, 96 for one to four; +6 and -3 a pair; 4/3 and 2/3.)
// Pokémon on the Sets are out of your party and PC: player.flags.xdChamberSets, nine { shadow, ring: [] }.
//
//   XDChamber.SETS, XDChamber.STEPS
//   XDChamber.sets(flags)             // the nine Sets (made if there were none)
//   XDChamber.tempo(set)              // { amount, flows, resisted, perfect }: how far it opens the heart each STEPS steps
//   XDChamber.step(flags)             // a step: the Shadow Pokémon whose hearts it's just opened all the way, if any
"use strict";

(function () {
  const SETS = 9, STEPS = 161;
  const BASE = [0, 10, 27, 49, 96];
  function sets(flags) {
    if (!Array.isArray(flags.xdChamberSets) || flags.xdChamberSets.length !== SETS) {
      const old = Array.isArray(flags.xdChamberSets) ? flags.xdChamberSets : [];
      flags.xdChamberSets = Array.from({ length: SETS }, (_, i) => old[i] || { shadow: null, ring: [] });
    }
    return flags.xdChamberSets;
  }
  const typesOf = (r) => ((window.DEX[r.species] || {}).types || ["Normal"]);
  // How one Pokémon's types fare against another's: the best of its types (2 super effective, below 1 resisted).
  function versus(a, b) {
    let best = 0;
    for (const t of typesOf(a)) {
      if (t === "Normal" && typesOf(b).includes("Normal")) { best = Math.max(best, 2); continue; }
      const m = typesOf(b).reduce((n, d) => n * (((window.TYPE_CHART || {})[t] || {})[d] ?? 1), 1);
      best = Math.max(best, m);
    }
    return best;
  }
  function tempo(set) {
    const ring = (set && set.ring || []).filter(Boolean), n = ring.length;
    if (!set || !set.shadow || !n) return { amount: 0, flows: 0, resisted: 0, perfect: false };
    // (Each Pokémon against the next round the ring: two make one pair, three or four a full circle.)
    const pairs = n < 2 ? [] : n === 2 ? [[ring[0], ring[1]]] : ring.map((r, i) => [r, ring[(i + 1) % n]]);
    let flows = 0, resisted = 0;
    for (const [a, b] of pairs) { const m = versus(a, b); if (m > 1) flows++; else if (m < 1) resisted++; }
    let amount = BASE[n] + (6 * flows - 3 * resisted) * (n === 4 ? 2 : 1);
    const lead = versus(set.shadow, ring[0]);
    if (lead > 1) amount = Math.ceil(amount * 4 / 3); else if (lead < 1) amount = Math.ceil(amount * 2 / 3);
    return { amount: Math.max(1, amount), flows, resisted, perfect: n === 4 && flows === 4 };
  }
  function step(flags) {
    flags.xdChamberSteps = (flags.xdChamberSteps | 0) + 1;
    if (flags.xdChamberSteps < STEPS) return [];
    flags.xdChamberSteps = 0;
    const opened = [];
    for (const set of sets(flags)) {
      const r = set.shadow;
      if (!r || !r.shadow || !(r.heart > 0)) continue;
      r.heart = Math.max(0, r.heart - tempo(set).amount);
      if (r.heart === 0) opened.push(r);
    }
    return opened;
  }
  window.XDChamber = { SETS, STEPS, sets, tempo, step, versus };
})();
