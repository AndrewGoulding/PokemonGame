// Kanto League scenes and progression.
// Shared state and services are accessed through live env properties.
(function () {
  "use strict";

  function create(env) {
    async function route22LateRival(side) {
      if (!env.route22LateRivalDue()) return;
      const f = env.player.flags, R = "LOCALID_ROUTE22_RIVAL";
      env.music("mus_encounter_rival");
      Overworld.addObject(R, { x: 25, y: side === "Top" ? 4 : 5, facing: "right" }, window.WORLD_SPRITES.leaf);
      await Overworld.act(side === "Bottom"
        ? [{ who: R, moves: env.M("Route22_Movement_RivalApproachBottom") }, { who: "player", moves: env.M("Route22_Movement_PlayerFaceRival") }]
        : [{ who: R, moves: env.M("Route22_Movement_RivalApproach") }]);
      await env.say(["Leaf: {PLAYER}! I knew I'd catch\nyou here!", "You've got all eight Badges too?\nSo have I!",
        "Before we take on the Pokémon\nLeague… one more battle?", "I've been training really hard.\nThis time I'm going to win!"]);
      const team = env.route22LeafTeam();
      const outcome = await env.battle("trainer", { foe: { name: "Pokémon Trainer " + env.LAB_RIVAL_NAME, team, pic: "green", tera: true },
        defeatText: ["Leaf: Wow… You're amazing,\n{PLAYER}!"], prize: 36 * 53 });
      if (outcome !== "won") { if (outcome === "cancelled") Overworld.removeObject(R); return; }
      f.route22LateRival = true;
      env.show("world");
      await Overworld.resume();
      await env.say(["Leaf: I'll keep training, and one day\nI'll beat you!", "Good luck at the Pokémon League,\n{PLAYER}! I'll be cheering for you!"]);
      Screen.say("");
      await env.sleep(170);
      env.music("mus_rival_exit");
      await Overworld.act([{ who: R, moves: env.M("Route22_Movement_LateRivalExit") }]);
      Overworld.removeObject(R);
      env.music((window.WORLD_MAPS[env.player.location.map] || {}).music);
    }

    async function victoryRoadRival() {
      const f = env.player.flags, R = "LOCALID_VICTORY_ROAD_RIVAL";
      // (A step out of the cave's mouth first, onto the route, where he meets you.)
      await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
      env.music("mus_encounter_rival");
      const from = await env.walkIn(R, env.lookOf("blue"), { x: 21, y: 18 }, [{ x: 19, y: 29, face: "left" }, { x: 18, y: 30, face: "up" }], "fast_");
      if (Overworld.personPosition(R)) await env.faceEachOther(R);
      await env.say(["{RIVAL}: Hey! {PLAYER}!", "So you made it through Victory Road\ntoo. Took you long enough!",
        "I've already seen the Pokémon League.\nAnd I'm going to be its Champion!", "But first, I'll show you how much\nstronger I've gotten! Let's go!"]);
      // (FireRed's Route 22 IVs: 150, and 250 for his starter, here Umbreon.)
      const team = env.VICTORY_ROAD_RIVAL_TEAM.map(([sp, lv, item]) => Object.assign(Party.create(sp, lv, { ivs: Math.floor((sp === "Umbreon" ? 250 : 150) * 31 / 255) }),
        item ? { item } : {}));
      const outcome = await env.battle("trainer", { foe: { name: "Rival " + env.player.rival, team, pic: "rival_late" },
        defeatText: ["{RIVAL}: What!? Again!?", "Tch… I was just warming up!"],
        prize: 100 * Math.max(...team.map((m) => m.level)) });   // (the Champion's rate: 5800 for his Lv. 58 Umbreon; it was 1908)
      if (outcome !== "won") { if (Overworld.personPosition(R)) Overworld.removeObject(R); return; }
      f.victoryRoadRival = true;
      env.show("world");
      await Overworld.resume();
      await env.say(["{RIVAL}: Hmph. Don't get cocky.", "The Pokémon League's Champion is\nstronger than anyone. You'll see!", "Smell ya later, {PLAYER}!"]);
      Screen.say("");
      env.music("mus_rival_exit");
      if (from) await env.walkOut(R, from, "fast_");
      else Overworld.removeObject(R);
      env.music((window.WORLD_MAPS[env.player.location.map] || {}).music);
    }

    async function badgeGuard(k, trigger, who) {
      const f = env.player.flags, name = [env.ROUTE23_BADGES[k - 1] + " Badge"];
      if (trigger && !LeagueRoad.guardStops(f, k)) return;
      if (trigger) await Overworld.act([{ who, moves: env.M("Common_Movement_WalkInPlaceFasterLeft") }]);
      const ok = () => {
        const t = env.T(k === 1 ? "Text_OhThatsBadgeGoRightAhead" : "Text_OnlyPassWithBadgeOhGoAhead");
        // (The "Oh! That is the …" page has the level-up jingle.)
        const at = t.findIndex((p) => /^Oh!/.test(p));
        return env.say(t.slice(0, at), name).then(() => env.sayWithJingle("mus_level_up", env.fill(t[at], name))).then(() => env.say(t.slice(at + 1), name));
      };
      if (!trigger && env.route23Scene() >= k) { await ok(); return; }
      if (LeagueRoad.show(f, env.player.badges, k)) { await ok(); return; }
      if (k === 1) {
        await env.say(env.T("Text_OnlySkilledTrainersAllowedThrough"), name);
        env.sfx("se_boo");
        await env.say(env.T("Text_CantLetYouPass"));
      } else {
        const t = env.T("Text_OnlyPassWithBadgeDontHaveYet");
        await env.say(t.slice(0, -1), name);
        env.sfx("se_boo");
        await env.say(t.slice(-1), name);
      }
      Screen.say("");
      if (trigger) await Overworld.act([{ who: "player", moves: ["walk_down"] }, { who, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
    }

    // ---------- Victory Road ----------
    //
    // Each floor's rock barrier is up until a Strength boulder's pushed onto
    // its floor switch (VictoryRoad_<floor>_EventScript_FloorSwitch, by
    // HandleBoulderActivateVictoryRoadSwitch); the boulders go back where they
    // were whenever you leave the floor, and the barriers stay down until you
    // come back through Route 23 (Route23_OnTransition), which also puts 3F's
    // boulder back that drops through the hole to 2F.
    // (FireRed's VAR_MAP_SCENE_VICTORY_ROAD_1F, .._2F_BOULDER1/2 and .._3F, and
    // FLAG_HIDE_VICTORY_ROAD_2F/3F_BOULDER: flags.victoryRoad here.)
    function victoryRoadSwitch(map, x, y) {
      const t = ((window.WORLD_MAPS[map] || {}).triggers || []).find((q) => q.x === x && q.y === y);
      if (!LeagueRoad.pressSwitch(env.player.flags, map, t)) return;
      env.applyPatches(map);
      env.sfx("se_ice_break");
    }

    // Walking in (each room's OnFrame, while it's that room's turn).
    async function leagueEnter(map) {
      const f = env.player.flags, k = League.room(map);
      if (map === League.HALL_OF_FAME) { await hallOfFame(); return; }
      if (k === 4) { await championsRoom(); return; }
      if (!League.entryDue(f, map)) return;
      // (PokemonLeague_EventScript_EnterRoom; Lance's walk through his corridor.)
      await Overworld.act([{ who: "player", moves: env.M(k === 3 ? "PokemonLeague_LancesRoom_Movement_WalkThroughCorridor" : "Common_Movement_WalkUp5") }]);
      League.enter(f, map);
      env.sfx("se_unlock");
      env.applyPatches(map);
      await env.persist();
    }

    function swappedTeam(id) {
      const team = env.trainerTeam(id);
      for (const [slot, species, extra] of env.TEAM_SWAPS[id] || []) {
        const was = team[slot];
        if (species) team[slot] = Party.create(species, was.level, { ivs: was.ivs.hp });
        if (extra) Object.assign(team[slot], extra);
      }
      return team;
    }

    async function johtoEliteFour(k) {
      const f = env.player.flags, J = window.JOHTO_LEAGUE[k];
      if (League.beaten(f, k)) { await env.say(J.after); return; }
      await env.say(J.intro);
      if (!env.canBattle()) return;
      const id = f.johtoLeagueClear ? J.rematch : J.trainer, data = window.WORLD_TRAINERS[id];
      const outcome = await env.battle("trainer", { foe: { name: data.className + " " + data.name, team: env.trainerTeam(id), pic: data.pic },
        defeatText: data.defeat || ["…"], trainerId: id, prizeClass: "Elite Four", music: "gs_vs_gymreader", victoryMusic: "gs_win3" });
      if (outcome !== "won") return;
      env.show("world");
      await Overworld.resume();
      League.beat(f, k);
      await env.sleep(533);
      env.sfx("se_rs_door");
      env.applyPatches(env.player.location.map);
      await env.persist();
      await env.say(J.after);
    }

    async function eliteFour(k) {
      if (env.johtoLeague()) { await johtoEliteFour(k); return; }
      const f = env.player.flags, X = (label) => env.T(env.LEAGUE_TEXT[k] + label);
      const lookAway = async () => {
        if (k !== 1 && k !== 2) return;
        Screen.say("");
        const facing = Overworld.position().facing;
        const way = facing === "up" ? "Right" : facing === "down" ? "Left" : "Down";
        await Overworld.act([{ who: env.LEAGUE_IDS[k], moves: env.M("Common_Movement_WalkInPlaceFaster" + way) }]);
      };
      if (League.beaten(f, k)) { await env.say(X("PostBattle")); await lookAway(); return; }
      const intro = X((k === 0 ? f.canLinkWithRS : f.gameClear) ? "RematchIntro" : "Intro");
      await env.say(intro.slice(0, -1));
      env.music("mus_encounter_gym_leader");
      await env.say(intro.slice(-1));
      if (!env.canBattle()) return;
      const id = League.trainerId(f, k), data = window.WORLD_TRAINERS[id], team = swappedTeam(id);
      const outcome = await env.battle("trainer", { foe: { name: data.className + " " + data.name, team, pic: data.pic, tera: team.some((r) => r.teraAce) },
        defeatText: X("Defeat"), trainerId: id, prizeClass: "Elite Four",
        music: "mus_vs_gym_leader", victoryMusic: "mus_victory_trainer" });
      if (outcome !== "won") return;
      env.show("world");
      await Overworld.resume();
      // (PokemonLeague_EventScript_OpenDoor: a pause, SE_RS_DOOR, and it's open.)
      League.beat(f, k);
      await env.sleep(533);
      env.sfx("se_rs_door");
      env.applyPatches(env.player.location.map);
      await env.persist();
      // (Lance names the Champion ahead: in this game Red, not your rival.)
      await env.say(k === 3 ? X("PostBattle").map((line) => line.replace("{RIVAL}", "Red")) : X("PostBattle"));
      await lookAway();
    }

    function championTeam(rematch) {
      return env.CHAMPION_TEAM.map(([sp, lv, lv2, item]) => Object.assign(Party.create(sp, rematch ? lv2 : lv, { ivs: 31 }), item ? { item } : {}));
    }

    async function championsRoom() {
      const f = env.player.flags, R = "LOCALID_CHAMPIONS_ROOM_RIVAL", O = "LOCALID_CHAMPIONS_ROOM_PROF_OAK";
      if (!League.entryDue(f, env.player.location.map)) return;
      await Overworld.act([{ who: "player", moves: env.M("PokemonLeague_ChampionsRoom_Movement_PlayerEnter") }]);
      await env.sleep(333);
      if (env.johtoLeague()) { await johtoChampion(); return; }
      await env.say(f.gameClear ? ["Red: …", "Red stepped forward, ready to\nbattle again!"]
        : ["Red: …", "Red, the Pokémon League Champion,\nlooks at {PLAYER} in silence.", "Red stepped forward, ready to battle!"]);
      if (!env.canBattle()) return;
      const rematch = !!f.canLinkWithRS, team = championTeam(rematch);
      const outcome = await env.battle("trainer", { foe: { name: "Champion Red", team, pic: "red" },
        defeatText: ["…"],
        trainerId: rematch ? "TRAINER_CHAMPION_REMATCH_SQUIRTLE" : "TRAINER_CHAMPION_FIRST_SQUIRTLE",
        prize: 100 * Math.max(...team.map((r) => r.level)),   // (TRAINER_CLASS_CHAMPION: 25, x4)
        music: "mus_vs_champion", victoryMusic: "mus_victory_gym_leader", terrain: "champion" });
      if (outcome !== "won") return;
      League.beat(f, 4);
      env.show("world");
      await Overworld.resume();
      await env.say(["Red: …", "Red smiled, and gave a small nod."]);
      // Prof. Oak comes in.
      env.music("mus_slow_pallet");
      Overworld.follower.hide(true);   // (your Pokémon back in its ball: Oak walks up the way it stands)
      Overworld.addObject(O, { x: 6, y: 15, facing: "up" });
      await env.say(env.T("PokemonLeague_ChampionsRoom_Text_OakPlayer"));
      Screen.say("");
      await Overworld.act([{ who: "player", moves: env.M("PokemonLeague_ChampionsRoom_Movement_PlayerWatchOakEnter") },
        { who: R, moves: env.M("PokemonLeague_ChampionsRoom_Movement_RivalWatchOakEnter") },
        { who: O, moves: env.M("PokemonLeague_ChampionsRoom_Movement_OakEnter") }]);
      await env.sleep(417);
      await env.say(env.T("PokemonLeague_ChampionsRoom_Text_OakCongratulations"), [Party.speciesName(f.starter || env.player.party[0].species)]);
      await Overworld.act([{ who: O, moves: env.M("Common_Movement_WalkInPlaceFasterRight") }, { who: R, moves: env.M("Common_Movement_WalkInPlaceFasterLeft") }]);
      await env.say(["Oak: Red… You've been the Champion\nfor a long time.", "But today, {PLAYER} and their\nPokémon were stronger.",
        "Keep training with your Pokémon,\nRed. I'm sure you two will meet\nagain!"]);
      Screen.say("");
      await Overworld.act([{ who: O, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      await env.sleep(333);
      await env.say(env.T("PokemonLeague_ChampionsRoom_Text_OakPlayerComeWithMe"));
      Screen.say("");
      await env.sleep(217);
      // Oak, then you, up the stairs and into the Hall of Fame.
      await Overworld.act([{ who: O, moves: env.M("PokemonLeague_ChampionsRoom_Movement_OakExit") },
        { who: "player", moves: env.M("PokemonLeague_ChampionsRoom_Movement_PlayerExit") }]);
      await Overworld.teleport({ map: League.HALL_OF_FAME, x: 5, y: 12, facing: "up" });
      Overworld.follower.hide(false);
      await hallOfFame();
    }

    // Lance, Johto's Champion (scr_seq_T10R0601): his words (for a boy or a
    // girl), his team, and once he's beaten, he takes you to the Hall of Fame.
    async function johtoChampion() {
      const f = env.player.flags, J = window.JOHTO_LEAGUE[4];
      await env.say(env.isGirl() ? J.introGirl : J.intro);
      if (!env.canBattle()) return;
      const id = f.johtoLeagueClear ? J.rematch : J.trainer, data = window.WORLD_TRAINERS[id];
      const outcome = await env.battle("trainer", { foe: { name: data.className + " " + data.name, team: env.trainerTeam(id), pic: data.pic },
        defeatText: data.defeat || ["…"], trainerId: id, prize: 100 * Math.max(...env.trainerTeam(id).map((r) => r.level)),
        music: "gs_vs_champ", victoryMusic: "gs_win3", terrain: "champion" });
      if (outcome !== "won") return;
      League.beat(f, 4);
      f.johtoLeagueDone = true;
      env.show("world");
      await Overworld.resume();
      await env.say(env.isGirl() ? J.afterGirl : J.after);
      Screen.say("");
      await Overworld.teleport({ map: League.HALL_OF_FAME, x: 5, y: 12, facing: "up" });
      await hallOfFame();
    }

    // The Hall of Fame (PokemonLeague_HallOfFame_EventScript_EnterRoom): you
    // walk up beside Prof. Oak; his words; the record machine flashes
    // (FLDEFF_HALL_OF_FAME_RECORD); then EventScript_SetDefeatedEliteFourFlagsVars
    // (the League starts over), setrespawn at home, and EnterHallOfFame: the
    // party healed, FLAG_SYS_GAME_CLEAR, your team on record, saved, and
    // FireRed's Hall of Fame screen; the credits; and you're home.
    async function hallOfFame() {
      const f = env.player.flags, O = "LOCALID_HALL_OF_FAME_PROF_OAK";
      await Overworld.act([{ who: "player", moves: env.M("PokemonLeague_HallOfFame_Movement_EnterRoom") }]);
      await Overworld.act([{ who: O, moves: env.M("Common_Movement_WalkInPlaceFasterLeft") }, { who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
      await env.sleep(300);
      await env.say(env.T("PokemonLeague_HallOfFame_Text_OakCongratulations"));
      // (Johto's League won, this game's own: Oak has a ticket for the Fast Ship S.S. Aqua's run to Hoenn.)
      if (f.johtoLeagueDone) await env.giveHoennTicket("Oak");
      Screen.say("");
      await Overworld.act([{ who: O, moves: env.M("Common_Movement_WalkInPlaceFasterUp") }, { who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterUp") }]);
      await env.sleep(333);
      await HallOfFame.recordFlash(env.$("#overlay"));
      await env.sleep(667);
      League.reset(f);
      // (Johto's League won: its rematch teams from now on.)
      if (f.johtoLeagueDone) { f.johtoLeagueClear = true; delete f.johtoLeagueDone; env.johto.setFlag("FLAG_GAME_CLEAR", true); }   // (HGSS's, for its scripts after the League)
      // (And the Bug-Catching Contest on offer again: once for each time you beat the Elite Four.)
      { const s = env.johto.state(); s.contestRound = (s.contestRound || 0) + 1; env.johto.setFlag("FLAG_DAILY_DID_BUG_CONTEST", false); }
      delete f.lastCenter;   // (setrespawn HEAL_LOCATION_PALLET_TOWN)
      env.player.party.forEach(Party.heal);
      const entry = League.record(f, env.player.party.filter((r) => !r.egg).map((r) => Object.assign({}, r, { form: Party.form(r) })),
        { name: env.player.name, id: env.player.trainerId, playTimeMs: env.player.playTimeMs });
      // Where you'll be after the credits (FireRed's continue warp, at home).
      env.player.location = Object.assign({}, Player.HOME);
      env.music(null);
      await Overworld.fadeToBlack();
      // (Whatever goes wrong drawing it, you're Champion and the game goes on.)
      await HallOfFame.show(env.$("#overlay"), entry, {
        cry: env.cry, sfx: env.sfx, music: env.music, player: { name: env.player.name, id: env.player.trainerId, playTimeMs: env.player.playTimeMs, pic: Player.LOOKS[env.player.look].front },
        // (FireRed saves the game here, on its own: the one save that isn't asked.)
        save: async () => { env.tick(); Save.write(env.player); env.savePromptAt = env.player.playTimeMs; }
      }).catch((e) => { console.error(e); env.tick(); Save.write(env.player); });
      await creditsRoll();
    }

    // The credits (FireRed's IndigoPlateau_Exterior_EventScript_Credits, then
    // DoCredits): out in front of the Indigo Plateau, Red (FireRed's rival:
    // here the Champion you beat) comes out and runs off, Prof. Oak comes out,
    // looks at you and walks off, and you run off too; then the credits roll
    // over Kanto, with Charizard, Venusaur, Blastoise and Pikachu, to THE END.
    // (Start skips them, the first time too.) Then you're at home in Pallet Town.
    async function creditsRoll() {
      const f = env.player.flags, R = "LOCALID_CREDITS_RIVAL", O = "LOCALID_CREDITS_PROF_OAK";
      const run = (moves) => moves.map((m) => m.replace(/^player_run_/, "walk_fast_"));
      env.$("#overlay").classList.add("hidden");
      env.show("world");
      await Overworld.teleport({ map: "IndigoPlateau_Exterior", x: 11, y: 7, facing: "down" });
      env.music("mus_credits");
      await env.sleep(1750);
      Overworld.addObject(R, { x: 11, y: 6, facing: "down" }, env.lookOf("red"));
      await Overworld.act([{ who: R, moves: env.M("IndigoPlateau_Exterior_Movement_RivalExitBuilding") },
        { who: "player", moves: env.M("IndigoPlateau_Exterior_Movement_PushPlayerOutOfWay") }]);
      await Overworld.act([{ who: "player", moves: env.M("IndigoPlateau_Exterior_Movement_PlayerWatchRivalLeave") },
        { who: R, moves: env.M("IndigoPlateau_Exterior_Movement_RivalLeave") }]);
      Overworld.removeObject(R);
      await env.sleep(1667);
      Overworld.addObject(O, { x: 11, y: 6, facing: "down" });
      await Overworld.act([{ who: O, moves: env.M("IndigoPlateau_Exterior_Movement_OakExitBuilding") }]);
      await env.sleep(2667);
      await Overworld.act([{ who: "player", moves: env.M("IndigoPlateau_Exterior_Movement_PlayerWatchOakLeave") },
        { who: O, moves: env.M("IndigoPlateau_Exterior_Movement_OakLeave") }]);
      Overworld.removeObject(O);
      await env.sleep(1667);
      await Overworld.act([{ who: "player", moves: env.M("IndigoPlateau_Exterior_Movement_PlayerBeginLeave") }]);
      await env.sleep(2583);
      await Overworld.act([{ who: "player", moves: env.M("IndigoPlateau_Exterior_Movement_PlayerFaceLeague") }]);
      await env.sleep(1500);
      await Overworld.act([{ who: "player", moves: env.M("IndigoPlateau_Exterior_Movement_PlayerTurnAround") }]);
      await Overworld.act([{ who: "player", moves: run(env.M("IndigoPlateau_Exterior_Movement_PlayerLeave")) }]);
      await Overworld.fadeToBlack();
      await HallOfFame.credits(env.$("#overlay"), { skippable: true, cry: env.cry, music: env.music, rival: env.player.rival,
        player: { look: env.player.look, name: env.player.name } }).catch((e) => console.error(e));
      f.seenCredits = true;
      env.$("#overlay").classList.add("hidden");
      await Overworld.teleport(Object.assign({}, Player.HOME));
      env.music((window.WORLD_MAPS[Player.HOME.map] || {}).music);
      await env.persist();
    }

    return {
      route22LateRival,
      victoryRoadRival,
      badgeGuard,
      victoryRoadSwitch,
      leagueEnter,
      swappedTeam,
      johtoEliteFour,
      eliteFour,
      championTeam,
      championsRoom,
      johtoChampion,
      hallOfFame,
      creditsRoll,
    };
  }

  window.KantoLeague = { create };
})();
