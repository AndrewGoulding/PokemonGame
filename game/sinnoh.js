// Platinum campaign data adapted onto the existing Sinnoh maps. Imported
// parties and dialogue remain separate from presentation and story state.
(function () {
  "use strict";
  const D = window.PLATINUM_DATA;
  window.ITEMS["works-key"] = { name: "works-key", category: "key-items", effect: "Opens the locked door at Valley Windworks." };
  Object.assign(window.WORLD_TRAINERS, D.trainers);
  window.WORLD_MAPS.OreburghCity_Gym = D.gym;
  Object.assign(window.WORLD_MAPS, D.maps || {});
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
  for (const d of D.doors || []) {
    const outside = window.WORLD_MAPS[d.outside], inside = window.WORLD_MAPS[d.inside];
    inside.warps[0].warp = d.existing == null ? outside.warps.length : d.existing;
    const warp = { x: d.x, y: d.y, map: d.inside, warp: 0 };
    if (d.existing == null) outside.warps.push(warp); else outside.warps[d.existing] = warp;
    outside.collision[d.y * outside.width + d.x] = 0;
    outside.behavior[d.y * outside.width + d.x] = 0x69;
  }
  // The Works Key locks the entrance until the meadow rescue. A floor patch
  // uses the same collision/behaviour mechanism as the other regions.
  const wind = window.WORLD_MAPS.ValleyWindworks;
  wind.patches = Object.assign({}, wind.patches, { locked: { x: 19, y: 13, w: 1, h: 1, top: false, collision: [[19, 13, 1, 0]] } });
  wind.signs.push({ x: 19, y: 13, script: "pt:wind-door" });
  const starters = ["Turtwig", "Chimchar", "Piplup"];
  const state = (p) => p.flags.sinnoh || (p.flags.sinnoh = {});
  const owns = (map) => (window.WORLD_MAPS[map] || {}).region === "sinnoh";
  function team(id) {
    const t = D.trainers[id];
    if (!t) throw new Error("Unknown Platinum trainer: " + id);
    return t.party.map((m) => Object.assign(Party.create(m.species, m.level, { ivs: Math.floor(m.iv * 31 / 255), ...(m.moves ? { moves: m.moves } : {}) }), m.item ? { item: m.item } : {}));
  }
  // Explicit buffer substitution: Platinum's rival is Barry, not Kanto's Gary.
  function text(id, player, buffers) {
    const pages = D.texts[id];
    if (!pages) throw new Error("Missing Platinum message: " + id);
    const values = buffers || [player.name];
    return pages.map((s) => s.replace(/\{STRVAR_\d+ \d+, (\d+)(?:,\s*\d+)*\}/g, (_, n) => values[n] == null ? "" : values[n])
      .replace(/\{[^}]*\}/g, ""));
  }
  const clockTrainers = ["PT_TRAINER_LASS_CAROLINE", "PT_TRAINER_AROMA_LADY_JENNA", "PT_TRAINER_AROMA_LADY_ANGELA"];
  function patches(map, player) {
    if (map !== "ValleyWindworks" && map !== "EternaCity_Gym") return null;
    const s = state(player);
    if (map === "ValleyWindworks") return s.worksOpen ? [] : ["locked"];
    if (map === "EternaCity_Gym") return ["clock" + (player.badges.includes("forest") ? 3 : Math.min(3, s.gardeniaClock | 0))];
    return null;
  }
  function forestPartner(player) {
    if (player.location.map !== "EternaForest_2") return null;
    const s = state(player);
    return s.cherylJoined && !s.cherylDone
      ? { name: "Cheryl", team: team("PT_TRAINER_CHERYL_ETERNA_FOREST"), pic: "pt_cheryl" } : null;
  }
  function forestBattle(player, kind, opts, anotherWild) {
    const partner = forestPartner(player);
    if (!partner || opts.partner || opts.safari || opts.horde) return opts;
    const chosen = player.party.map((m, i) => Party.canFight(m) ? i : -1).filter(i => i >= 0).slice(0, 3);
    if (!chosen.length) return opts;
    const out = { ...opts, partner, chosen };
    if (kind === "wild" && opts.foe && opts.foe.team.length === 1) {
      out.foe = { ...opts.foe, team: [...opts.foe.team, anotherWild()] }; out.wildDouble = true;
    }
    return out;
  }
  // Only the raised deck and the gates require a bicycle. Route 206 below
  // the deck remains walkable; these maps must not share the same rule.
  const cyclingRequired = at => at.map === "CyclingRoad" || at.map === "CyclingRoadNorth_Gate" && at.y >= 10 || at.map === "CyclingRoadSouth_Gate" && at.y <= 5;
  const cyclingAllowed = player => player.badges.includes("forest") && !!state(player).jupiter && Player.itemCount(player, "bicycle") > 0;
  window.Sinnoh = { state, owns, starters, team, text, clockTrainers, patches, forestPartner, forestBattle, cyclingRequired, cyclingAllowed };
})();
