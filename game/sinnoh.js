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
    const insideWarp = d.insideWarp || 0;
    inside.warps[insideWarp].warp = d.existing == null ? outside.warps.length : d.existing;
    const warp = { x: d.x, y: d.y, map: d.inside, warp: insideWarp };
    if (d.existing == null) outside.warps.push(warp); else outside.warps[d.existing] = warp;
    outside.collision[d.y * outside.width + d.x] = 0;
    outside.behavior[d.y * outside.width + d.x] = d.behavior == null ? 0x69 : d.behavior;
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
    const m = WORLD_MAPS[map];
    if (map === "Route213") return ["shore"];
    if (m && m.haunt) return ["rune" + hauntShape(player, m.haunt.room)];
    if (map === "VeilstoneCity_Gym") return ["bags" + Math.min(3, state(player).mayleneBags | 0)];
    if (map === "PastoriaCity_Gym") return ["water" + Math.min(3, state(player).wakeWater | 0)];
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
  function hauntShape(player, room) { return Math.floor((player.trainerId >>> 0) / (room === 1 ? 1 : 3)) % (room === 1 ? 3 : 5); }
  function darkness(map) {
    const m = WORLD_MAPS[map];
    return m && m.haunt ? {radius:4, lights:[{x:m.haunt.rune.x+.5,y:m.haunt.rune.y+.5,r:1}],rects:[]} : null;
  }
  const flyTowns = ["SandgemTown", "JubilifeCity", "OreburghCity", "FloaromaTown", "EternaCity", "HearthomeCity", "VeilstoneCity", "PastoriaCity", "SolaceonTown"];
  function visit(player, map) {
    if (typeof map !== "string") return;
    const city = map.replace(/_PokemonCenter_1F$/, "");
    if (!flyTowns.includes(city)) return;
    const list = state(player).visitedCities || (state(player).visitedCities = []);
    if (!list.includes(city)) list.push(city);
  }
  function flySpots(player) {
    return (state(player).visitedCities || []).flatMap(city => {
      const m = WORLD_MAPS[city], w = m && m.warps.find(w => w.map === city + "_PokemonCenter_1F");
      if (!w || m.collision[(w.y + 1) * m.width + w.x]) return [];
      return [{ map: city, x: w.x, y: w.y + 1, center: w.map, name: city.replace(/([a-z])([A-Z])/g, "$1 $2") }];
    });
  }
  window.Sinnoh = { state, owns, starters, team, text, clockTrainers, patches, forestPartner, forestBattle, cyclingRequired, cyclingAllowed, hauntShape, darkness, visit, flySpots };
})();
