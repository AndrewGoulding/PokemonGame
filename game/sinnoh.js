// Platinum campaign data adapted onto the existing Sinnoh maps. Imported
// parties and dialogue remain separate from presentation and story state.
(function () {
  "use strict";
  const D = window.PLATINUM_DATA;
  Object.assign(window.WORLD_TRAINERS, D.trainers);
  window.WORLD_MAPS.OreburghCity_Gym = D.gym;
  for (const [map, people] of Object.entries(D.additions)) {
    const m = window.WORLD_MAPS[map];
    if (!m) throw new Error("Platinum overlay needs " + map);
    if (map === "SandgemTown_RowansLab") m.people = []; // replace the old placeholder lab actors and balls
    m.people.push(...people.map((p, i) => Object.assign({ id: "platinum-" + i }, p)));
  }
  const city = window.WORLD_MAPS.OreburghCity, gym = window.WORLD_MAPS.OreburghCity_Gym;
  const door = city.warps.length;
  city.warps.push({ x: 31, y: 17, map: "OreburghCity_Gym", warp: 0 });
  city.collision[17 * city.width + 31] = 0;
  city.behavior[17 * city.width + 31] = 0x69;
  gym.warps[0].warp = door;
  const starters = ["Turtwig", "Chimchar", "Piplup"];
  const state = (p) => p.flags.sinnoh || (p.flags.sinnoh = {});
  const owns = (map) => (window.WORLD_MAPS[map] || {}).region === "sinnoh";
  function team(id) {
    const t = D.trainers[id];
    if (!t) throw new Error("Unknown Platinum trainer: " + id);
    return t.party.map((m) => Party.create(m.species, m.level, { ivs: Math.floor(m.iv * 31 / 255), ...(m.moves ? { moves: m.moves } : {}) }));
  }
  // Explicit buffer substitution: Platinum's rival is Barry, not Kanto's Gary.
  function text(id, player, buffers) {
    const pages = D.texts[id];
    if (!pages) throw new Error("Missing Platinum message: " + id);
    const values = buffers || [player.name];
    return pages.map((s) => s.replace(/\{STRVAR_\d+ \d+, (\d+)(?:,\s*\d+)*\}/g, (_, n) => values[n] == null ? "" : values[n])
      .replace(/\{[^}]*\}/g, ""));
  }
  window.Sinnoh = { state, owns, starters, team, text };
})();
