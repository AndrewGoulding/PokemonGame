// New Bark Town's Pokémon Center (tools/build-new-bark-center.js): Cherrygrove City's, cloned, where Fly lands.
(function () {
  const W = window.WORLD_MAPS, town = W.NewBarkTown, src1 = W.CherrygroveCity_PokemonCenter_1F, src2 = W.CherrygroveCity_PokemonCenter_2F;
  const F1 = "NewBarkTown_PokemonCenter_1F", F2 = "NewBarkTown_PokemonCenter_2F";
  if (!town || !src1 || !src2 || W[F1]) return;
  const clone = (src, name) => Object.assign(JSON.parse(JSON.stringify(src)), { name, title: "New Bark Town", image: src.image || src.name, townMapSection: "NEW_BARK_TOWN" });
  const f1 = clone(src1, F1), f2 = clone(src2, F2);
  // (The building, over the ground south of Elm's lab; its door, solid, walked up into.)
  town.warps.push({ x: 13, y: 23, map: F1, warp: 0 });
  town.patches = Object.assign({}, town.patches, { pokecenter: { x: 11, y: 17, w: 5, h: 7, top: true, collision: [[11,17,1,0],[12,17,1,0],[13,17,1,0],[14,17,1,0],[15,17,1,0],[11,18,1,0],[12,18,1,0],[13,18,1,0],[14,18,1,0],[15,18,1,0],[11,19,1,0],[12,19,1,0],[13,19,1,0],[14,19,1,0],[15,19,1,0],[11,20,1,0],[12,20,1,0],[13,20,1,0],[14,20,1,0],[15,20,1,0],[11,21,1,0],[12,21,1,0],[13,21,1,0],[14,21,1,0],[15,21,1,0],[11,22,1,0],[12,22,1,0],[13,22,1,0],[14,22,1,0],[15,22,1,0],[11,23,1,0],[12,23,1,0],[13,23,1,105],[14,23,1,0],[15,23,1,0]] } });
  // (Its tiles solid in the map's own data too, the patch always on: the door's warp works wherever the map's walked, tests/smoke-test.js's ways round Johto too.)
  for (const [x, y, c, b] of town.patches.pokecenter.collision) { town.collision[y * town.width + x] = c; town.behavior[y * town.width + x] = b; }
  const back = town.warps.length - 1;
  f1.warps = f1.warps.map((w) => (w.map === "CherrygroveCity" ? Object.assign({}, w, { map: "NewBarkTown", warp: back }) : Object.assign({}, w, { map: F2 })));
  f2.warps = f2.warps.map((w) => (w.map === src1.name ? Object.assign({}, w, { map: F1 }) : w));
  // (Its nurse, and the gentleman by the PC; Cherrygrove's others stay there.)
  f1.people = f1.people.filter((p) => /Nurse$/.test(p.script || "") || /gentleman/.test(p.localId || ""))
    .map((p) => (/Nurse$/.test(p.script) ? Object.assign(p, { script: F1 + "_EventScript_Nurse", localId: "LOCALID_NEWBARKTOWN_POKEMONCENTER_1F_NURSE" }) : p));
  W[F1] = f1; W[F2] = f2;
  // (In Cherrygrove's Center's script zones, for its nurse and its gentleman: ui/johto-script.js zoneOf.)
  const J = window.JOHTO_SCRIPTS;
  if (J && J.maps) { J.maps[F1] = J.maps[src1.name]; J.maps[F2] = J.maps[src2.name]; }
  // (Fly: in front of its door, as in every other town, instead of your house.)
  const fly = () => { const M = window.JOHTO_TOWN_MAP; if (M && M.fly && M.fly.NEW_BARK_TOWN) M.fly.NEW_BARK_TOWN = { map: "NewBarkTown", x: 13, y: 24, center: F1 }; if (M && M.mapSections) { M.mapSections[F1] = "NEW_BARK_TOWN"; M.mapSections[F2] = "NEW_BARK_TOWN"; } };
  fly();
})();
