// Kanto's Trainers, stronger than FireRed's (this game's own): every Trainer from Brock on has their Pokémon's
// levels raised, more the further into the game they stand, from +1 just past Brock to +5 at the end, and the
// Sevii Islands at +5. Set as the data loads, on FireRed's parties (data/world-maps.js, from pokefirered), so the
// levels are the Trainers' own wherever they're battled (ui/game.js's trainerTeam); Player.LEVEL_CAPS.kanto,
// the next Leader's ace, follows. (This game's own Kanto battles, written in ui/game.js, are raised there.)
//
//   +0  Viridian Forest, Brock; the rival in Oak's lab and on Route 22 the first time
//   +1  Route 3, Mt. Moon, Route 4, Cerulean City, Routes 24 and 25, Misty
//   +2  Routes 6, 9 and 11, Vermilion City, the S.S. Anne, Diglett's Cave, Lt. Surge
//   +3  Route 10, Rock Tunnel, Lavender and Pokémon Tower, Routes 7 and 8, Celadon, the Rocket Hideout, Erika
//   +4  Saffron (the Dojo, Sabrina), Silph Co., Routes 12 to 18, Fuchsia (Koga), the Safari Zone
//   +5  Routes 19 to 21, Cinnabar (Blaine, the Mansion), Giovanni's Gym, Routes 22 and 23, Victory Road,
//       Cerulean Cave, the Sevii Islands (the Elite Four and the Champion, and their rematches, keep FireRed's)
(function () {
  "use strict";
  const T = window.WORLD_TRAINERS, W = window.WORLD_MAPS;
  if (!T || !W) return;
  const AREAS = [
    [/^(ViridianForest|PewterCity.*)$/, 0],
    [/^(Route3|Route4|MtMoon_.*|CeruleanCity(?!_Cave).*|Route24|Route25)$/, 1],
    [/^(Route6|Route9|Route11|VermilionCity.*|SSAnne_.*|DiglettsCave.*)$/, 2],
    [/^(Route10|RockTunnel_.*|LavenderTown.*|PokemonTower_.*|Route7|Route8|CeladonCity.*|RocketHideout_.*)$/, 3],
    [/^(SaffronCity.*|SilphCo_.*|Route1[2-8]|FuchsiaCity.*|SafariZone_.*)$/, 4],
    [/^(Route19|Route20|Route21_.*|CinnabarIsland.*|PokemonMansion_.*|ViridianCity.*|Route22|Route23|VictoryRoad_.*|PokemonLeague_.*|IndigoPlateau.*|CeruleanCave_.*|SeafoamIslands_.*|(One|Two|Three|Four|Five|Six|Seven)Island.*|MtEmber.*)$/, 5]
  ];
  // Those met in a scene rather than standing on a map.
  const BY_ID = [
    [/^TRAINER_RIVAL_(OAKS_LAB|ROUTE22_EARLY)_/, 0],
    [/^TRAINER_(RIVAL_CERULEAN_|SUPER_NERD_MIGUEL$|TEAM_ROCKET_GRUNT_6$)/, 1],
    [/^TRAINER_RIVAL_SS_ANNE_/, 2],
    [/^TRAINER_(RIVAL_POKEMON_TOWER_|BOSS_GIOVANNI$)/, 3],
    [/^TRAINER_(RIVAL_SILPH_|BOSS_GIOVANNI_2$)/, 4],
    // (The Elite Four and the Champion, and their rematches, keep FireRed's levels.)
    [/^TRAINER_(ELITE_FOUR_|CHAMPION_)/, 0],
    [/^TRAINER_(RIVAL_ROUTE22_LATE_|LADY_SELPHY|BIKER_GOON|CUE_BALL_PAXTON|TEAM_ROCKET_GRUNT_4[3-5]$)/, 5]
  ];
  // Where each Trainer stands (FireRed's maps; Kanto's have no region).
  const where = {};
  for (const m of Object.values(W)) if (!m.region) for (const p of m.people) if (p.trainer && /^TRAINER_/.test(p.trainer.id)) where[p.trainer.id] = where[p.trainer.id] || m.name;
  const bonusOf = (id) => {
    for (const [re, n] of BY_ID) if (re.test(id)) return n;
    // (A rematch's party, TRAINER_X_2 and on: as TRAINER_X's.)
    const map = where[id] || where[id.replace(/_\d$/, "")];
    if (!map) return 0;
    for (const [re, n] of AREAS) if (re.test(map)) return n;
    return 0;
  };
  const raised = {};
  for (const [id, t] of Object.entries(T)) {
    if (!/^TRAINER_/.test(id) || !t.party) continue;
    const n = bonusOf(id);
    if (!n) continue;
    for (const m of t.party) m.level = Math.min(100, m.level + n);
    raised[id] = n;
  }
  window.KANTO_TRAINER_RAISE = raised;
})();
