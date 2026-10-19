// The Magnet Train between Goldenrod City and Saffron City, as in HeartGold
// and SoulSilver: HGSS's stations and their scripts (tools/build-johto.js,
// tools/build-magnet-train.js: no Pass needed), so the attendant greets you,
// the ticket gate lets you through, you board upstairs, and on the other
// side the platform's attendant sees you off the train ("We have arrived at
// Saffron! Saffron! The accent is on the "a"!"). Goldenrod's always runs;
// Saffron's (FireRed's Saffron has no station: its door is new) only once
// you're the Champion of the Pokémon League. ui/game.js wires it up:
//
//   const T = MagnetTrain.create(ctx)
//   T.enter(map)                          // going into a map (before its OnTransition script)
//   await T.ride(toward, mapConst, x, y)  // HGSS's ScrCmd_722: the ride, then off at (x, y)
//
// ctx: player(), johto (JohtoScript's), music(song), sleep(ms), fadeOut(), warp(mapConst, x, y, facing).
(function () {
  "use strict";

  const SAFFRON = "SaffronCity_MagnetTrainStation_1F";
  // (HGSS's train's theme, SEQ_GS_E_LINEAR, as the ride goes: its frames at 30 a second.)
  const RIDE_MUSIC = "gs_e_linear", RIDE_MS = 4500;

  function create(ctx) {
    // Saffron's station: its train runs (HGSS's FLAG_RESTORED_POWER, once
    // Kanto's Power Plant runs again, which moves its policeman aside) once
    // you're Champion. (Goldenrod's doesn't wait for it: tools/build-magnet-train.js.)
    function enter(map) {
      if (map === SAFFRON) ctx.johto.setFlag("FLAG_RESTORED_POWER", !!ctx.player().flags.gameClear);
    }
    // The ride: the screen fades as the doors close, the train's theme plays
    // a few seconds, and you're on the other station's platform, the doors
    // opening (its frame table's scene then walks you off the train).
    // (toward: 0 for Saffron, 1 for Goldenrod; mapConst: its platform, by HGSS's number.)
    async function ride(toward, mapConst, x, y) {
      await ctx.fadeOut();
      ctx.music(RIDE_MUSIC);
      await ctx.sleep(RIDE_MS);
      await ctx.warp(String(mapConst), x, y, "down");
    }
    return { enter, ride };
  }

  // (Saffron's station on Kanto's Town Map: in Saffron City, its townMapSection.)
  const T = window.TOWN_MAP;
  if (T && T.mapSections) for (const m of Object.values(window.WORLD_MAPS || {})) if (m.townMapSection && !T.mapSections[m.name]) T.mapSections[m.name] = m.townMapSection;

  window.MagnetTrain = { create, SAFFRON };
})();
