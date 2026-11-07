// Horde encounters (this game's own, after X and Y's): five wild Pokémon at
// once (engine/battle.js's "horde" format), from data/horde-encounters.js.
// Depends on: window.HORDE_ENCOUNTERS
//
//   Hordes.at("Route1")          // the map's hordes, or null
//   Hordes.pick("Route1", rng)   // -> [{ species, level }] x5, or null
//   Hordes.roll("Route1", rng)   // a grass encounter's chance of being one (CHANCE)
//
// As in X and Y: where a map has hordes, one encounter in twenty in its grass
// (or a cave's floor) is a horde, never on the water; Sweet Scent in the
// grass always draws one out.
(function () {
  "use strict";

  const CHANCE = 1 / 20;
  const at = (mapName) => {
    const list = (window.HORDE_ENCOUNTERS || {})[mapName];
    return list && list.length ? list : null;
  };
  // ("Oddish*4" -> four Oddish.)
  const expand = (mons) => mons.flatMap((m) => {
    const [species, n] = String(m).split("*");
    return new Array(Math.max(1, +n || 1)).fill(species);
  }).slice(0, 5);

  function pick(mapName, rng) {
    rng = rng || Math.random;
    const list = at(mapName);
    if (!list) return null;
    const total = list.reduce((t, h) => t + (h.weight || 1), 0);
    let r = rng() * total, h = list[0];
    for (const x of list) { r -= x.weight || 1; if (r < 0) { h = x; break; } }
    const [lo, hi] = h.lv;
    return expand(h.mons).map((species) => ({ species, level: lo + Math.floor(rng() * (hi - lo + 1)) }));
  }

  const roll = (mapName, rng) => !!at(mapName) && (rng || Math.random)() < CHANCE;

  window.Hordes = { CHANCE, at, pick, roll, expand };
})();
