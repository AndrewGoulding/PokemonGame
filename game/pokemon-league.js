// The Pokémon League, as in FireRed: the Elite Four's rooms in order, each
// one's way in shutting behind you and its far door opening once its trainer's
// beaten, then the Champion, the Hall of Fame and its records.
// Depends on: nothing (works on player.flags).
//
//   League.room(map)                  // 0..3 for Lorelei .. Lance, 4 the Champion, -1 else
//   League.scene(flags)               // VAR_MAP_SCENE_POKEMON_LEAGUE (0..4)
//   League.entryDue(flags, map)       // walking in starts the room's entry scene?
//   League.enter(flags, map)          // ... and it's done: the way back is shut
//   League.patches(flags, map)        // "closed" / "door" patches on now
//   League.beat(flags, k)             // Elite Four member k beaten: her door opens
//   League.trainerId(flags, k)        // FireRed's first or rematch (_2) team
//   League.reset(flags)               // EventScript_ResetEliteFour (blacking out, the Hall of Fame)
//   League.record(flags, party, trainer) // the Hall of Fame: game clear, this team on record
//
// FireRed keeps the run in VAR_MAP_SCENE_POKEMON_LEAGUE (flags.leagueScene
// here: 1 once you've walked into Lorelei's room, 2 Bruno's, 3 Agatha's, 4
// Lance's) and FLAG_DEFEATED_LORELEI .. _LANCE, _CHAMP (flags.leagueBeat:
// [true, true, ...] by room). FLAG_SYS_GAME_CLEAR is flags.gameClear, and
// FLAG_SYS_CAN_LINK_WITH_RS (set in FireRed once the Sevii Islands' story is
// done, by One Island's Pokémon Center: the Elite Four's rematch teams)
// flags.canLinkWithRS. The Hall of Fame's records (FireRed's SAVE_HALL_OF_FAME,
// up to 50 teams, the oldest dropped) are flags.hallOfFame, and
// GAME_STAT_ENTERED_HOF flags.hofCount.

(function () {
  "use strict";

  const ROOMS = [
    { map: "PokemonLeague_LoreleisRoom", name: "Lorelei", trainer: "TRAINER_ELITE_FOUR_LORELEI" },
    { map: "PokemonLeague_BrunosRoom", name: "Bruno", trainer: "TRAINER_ELITE_FOUR_BRUNO" },
    { map: "PokemonLeague_AgathasRoom", name: "Agatha", trainer: "TRAINER_ELITE_FOUR_AGATHA" },
    { map: "PokemonLeague_LancesRoom", name: "Lance", trainer: "TRAINER_ELITE_FOUR_LANCE" },
    { map: "PokemonLeague_ChampionsRoom", name: "Champion" }
  ];
  const HALL_OF_FAME = "PokemonLeague_HallOfFame";
  const MAX_TEAMS = 50;   // HALL_OF_FAME_MAX_TEAMS

  const room = (map) => ROOMS.findIndex((r) => r.map === map);
  const scene = (flags) => flags.leagueScene || 0;
  const beaten = (flags, k) => !!(flags.leagueBeat && flags.leagueBeat[k]);

  // Each Elite Four room's OnFrame: its entry scene runs while the League's
  // scene is the room's number (0 for Lorelei's). The Champion's runs every
  // time until he's beaten (PokemonLeague_ChampionsRoom_OnResume).
  function entryDue(flags, map) {
    const k = room(map);
    if (k < 0) return false;
    if (k === 4) return !beaten(flags, 4);
    return scene(flags) === k;
  }
  function enter(flags, map) {
    const k = room(map);
    if (k >= 0 && k < 4) flags.leagueScene = k + 1;
  }
  // OnLoad: the way in shut while the League's scene is this room's (it's
  // where you are), the far door open once its trainer's beaten.
  function patches(flags, map) {
    const k = room(map);
    if (k < 0 || k > 3) return [];
    const on = [];
    if (scene(flags) === k + 1) on.push("closed");
    if (beaten(flags, k)) on.push("door");
    return on;
  }
  function beat(flags, k) {
    (flags.leagueBeat || (flags.leagueBeat = []))[k] = true;
  }
  // Lorelei and the rest bring their rematch teams once you can link with
  // Ruby and Sapphire (FLAG_SYS_CAN_LINK_WITH_RS).
  const trainerId = (flags, k) => ROOMS[k].trainer + (flags.canLinkWithRS ? "_2" : "");

  // EventScript_ResetEliteFour: blacking out anywhere, or into the Hall of
  // Fame, and the League starts over from Lorelei.
  function reset(flags) {
    delete flags.leagueScene;
    delete flags.leagueBeat;
    for (const k of Object.keys(flags)) if (/^TRAINER_(ELITE_FOUR|CHAMPION)_/.test(k)) delete flags[k];
  }

  // EnterHallOfFame: FLAG_SYS_GAME_CLEAR, and the party as it is on record
  // (Task_Hof_InitMonData: species, level, nickname, OT ID, personality; here
  // the OT's name and the look too). Returns the new record.
  function record(flags, party, trainer) {
    flags.gameClear = true;
    flags.hofCount = (flags.hofCount || 0) + 1;
    const team = party.slice(0, 6).map((r) => ({
      species: r.species, nickname: r.nickname || null, level: r.level, gender: r.gender || "",
      shiny: !!r.shiny, form: r.form || undefined, personality: r.personality,
      ot: r.ot ? { name: r.ot.name, id: r.ot.id } : { name: trainer.name, id: trainer.id }
    }));
    const entry = { number: flags.hofCount, team, trainer: { name: trainer.name, id: trainer.id }, playTimeMs: trainer.playTimeMs || 0 };
    const list = flags.hallOfFame || (flags.hallOfFame = []);
    list.push(entry);
    while (list.length > MAX_TEAMS) list.shift();
    return entry;
  }

  window.League = { ROOMS, HALL_OF_FAME, MAX_TEAMS, room, scene, beaten, entryDue, enter, patches, beat, trainerId, reset, record };
})();
