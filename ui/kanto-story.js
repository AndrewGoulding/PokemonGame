// Kanto rival encounters and Jessie & James ambushes.
// Game supplies shared services and a live player getter; this module owns
// the scenes and their step triggers, not battle execution or save storage.
(function () {
  "use strict";

  function create(env) {
    const { music, say, T, M, battle, show, sfx, canBattle, canDouble,
      hasBadge, trainerTeam, STARTER_BALLS, RIVAL_PICK } = env;

    // ---------- Route 22's rival ----------
    //
    // FireRed's Route22_EventScript_EarlyRival: Gary walks up from the left,
    // battles (Pidgey, level 5, and Eevee, level 7, as in Yellow), and heads off
    // toward Viridian. Losing doesn't black you out.
    async function route22Rival(side) {
      music("mus_encounter_rival");
      const f = env.player.flags, R = "LOCALID_ROUTE22_RIVAL";
      Overworld.addObject(R, { x: 25, y: side === "Top" ? 4 : 5, facing: "right" });
      await Overworld.act(side === "Bottom"
        ? [{ who: R, moves: M("Route22_Movement_RivalApproachBottom") }, { who: "player", moves: M("Route22_Movement_PlayerFaceRival") }]
        : [{ who: R, moves: M("Route22_Movement_RivalApproach") }]);
      await Overworld.act([{ who: R, moves: ["delay_6"] }]);
      // FireRed's lines, but he ends with a jab instead of asking about your Pokémon.
      await say(T("Route22_Text_EarlyRivalIntro").slice(0, -1).concat(["Let's see how weak your Pokémon\nare!"]));
      // His team as in Yellow: Pidgey (level 5) and Eevee (level 7).
      const ivs = trainerTeam("TRAINER_RIVAL_ROUTE22_EARLY_SQUIRTLE")[0].ivs.hp;
      const team = [Party.create("Pidgey", 5, { ivs }), Party.create("Eevee", 7, { ivs })];
      const outcome = await battle("trainer", { foe: { name: "Rival " + env.player.rival, team, pic: "rival_early" },
        defeatText: T("Route22_Text_EarlyRivalDefeat"), noBlackout: true });
      show("world");
      await Overworld.resume();
      if (outcome === "lost") await say(T("Text_RivalVictory"));
      // (Only a win counts: lose, and he's back to battle you the next time you come along Route 22.)
      if (outcome !== "lost") f.route22Rival = true;
      await say(T("Route22_Text_EarlyRivalPostBattle"));
      music("mus_rival_exit");
      await Overworld.act([{ who: R, moves: ["delay_10"].concat(M(side === "Bottom" ? "Route22_Movement_EarlyRivalExitBottom" : "Route22_Movement_EarlyRivalExit")) }]);
      Overworld.removeObject(R);
    }

    // (This game's own: until you've beaten your rival on Route 22, the old man stops you on your way north out of
    // Viridian City, towards Viridian Forest, and sends you west to Route 22, where the rival's waiting.)
    function viridianStopStep() {
      const f = env.player.flags, at = env.player.location;
      if (at.map !== "ViridianCity" || at.y !== 4 || at.x < 19 || at.x > 23) return null;
      return f.pokedex && !f.route22Rival && !hasBadge("boulder") ? { type: "viridian-stop" } : null;
    }
    async function viridianOldManStop() {
      sfx("se_pin");
      await Overworld.act([{ who: "player", moves: ["emote_exclamation_mark"] }]);
      await say(["Hold on there, youngster!"]);
      await Overworld.act([{ who: "player", moves: ["face_down"] }]);
      await say(["A young fella came through here a\nlittle while ago. Said his name was\n{RIVAL}.",
        "He went west, to Route 22. Said he'd\nwait for you there, to see how\nstrong your Pokémon are.",
        "You'd best go and see him before you\nhead north to Viridian Forest!"]);
      Screen.say("");
      await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
    }

    // ---------- Red, at the edge of Viridian Forest ----------
    //
    // Walking up the last stretch of the forest toward Pewter, Red catches up
    // with you from behind, says nothing much, and battles: the starter neither
    // you nor Leaf took, the one that beats yours (level 8), and Pikachu (level
    // 10). Then he goes on past you to Pewter. Losing blacks you out, and he
    // catches up with you there again.
    function redForestStep() {
      const f = env.player.flags, at = Overworld.position();
      if (f.redForest || !f.starter || at.map !== "ViridianForest") return null;
      return at.y === 12 && (at.x === 4 || at.x === 5) && at.facing === "up" && canBattle() ? { type: "red-forest" } : null;
    }
    async function redForest() {
      music("mus_encounter_rival");
      const f = env.player.flags, R = "LOCALID_RED", at = Overworld.position();
      Overworld.addObject(R, { x: at.x, y: at.y + 5, facing: "up" }, window.WORLD_SPRITES.red);
      await Overworld.act([{ who: R, moves: ["walk_up", "walk_up", "walk_up", "walk_up"] }]);
      await Overworld.act([{ who: "player", moves: M("Common_Movement_ExclamationMark").concat(M("Common_Movement_WalkInPlaceFasterDown")) }]);
      await say("…");
      const starter = Object.values(STARTER_BALLS).map((b) => b.species).find((sp) => sp !== f.starter && sp !== RIVAL_PICK[f.starter]);
      const team = [Party.create(starter, 8), Party.create("Pikachu", 10)];
      const outcome = await battle("trainer", { foe: { name: "Pokémon Trainer Red", team, pic: "red" }, defeatText: ["…"] });
      if (outcome !== "won") return;
      f.redForest = true;
      show("world");
      await Overworld.resume();
      await say("…");
      // Past you (by the other side of the path) and out toward Pewter.
      await Overworld.act([{ who: R, moves: [at.x === 4 ? "walk_right" : "walk_left", "walk_up", "walk_up", "walk_up", "walk_up", "set_invisible"] }]);
      Overworld.removeObject(R);
    }

    // ---------- Jessie & James, at the end of Mt. Moon ----------
    //
    // As in Yellow: heading down to the last ladder on B2F, Jessie and James
    // climb down it, recite their motto and battle with Ekans, Meowth and
    // Koffing (level 14), a double battle (this game's). Beaten, they pay ₽750 and blast off; beat you, and
    // they wait there again.
    function jessieJamesStep() {
      const f = env.player.flags, at = Overworld.position();
      if (f.jessieJames || at.map !== "MtMoon_B2F") return null;
      return at.y === 7 && (at.x === 3 || at.x === 4) && at.facing === "down" && canBattle() ? { type: "jessie-james" } : null;
    }
    async function jessieJames() {
      music("mus_encounter_rocket");
      const f = env.player.flags, J = "LOCALID_JESSIE", K = "LOCALID_JAMES";
      // Down the ladder (5, 10), one after the other, and round in front of you.
      Overworld.addObject(J, { x: 5, y: 10, facing: "down" }, window.WORLD_SPRITES.jessie);
      await Overworld.act([{ who: J, moves: ["walk_left", "walk_left", "walk_up", "walk_up"] }]);
      Overworld.addObject(K, { x: 5, y: 10, facing: "down" }, window.WORLD_SPRITES.james);
      await Overworld.act([{ who: K, moves: ["walk_left", "walk_up", "walk_up"] }]);
      await Overworld.act([{ who: "player", moves: ["emote_exclamation_mark"] }]);
      await say(["Jessie: Hold it right there!", "James: Those fossils are ours, kid!",
        "Jessie: Prepare for trouble!", "James: Make it double!",
        "Jessie: To protect the world from\ndevastation!", "James: To unite all peoples within\nour nation!",
        "Jessie: To denounce the evils of\ntruth and love!", "James: To extend our reach to the\nstars above!",
        "Jessie: Jessie!", "James: James!",
        "Jessie: Team Rocket, blast off at the\nspeed of light!", "James: Surrender now, or prepare to\nfight!",
        "Meowth: Meowth! That's right!"]);
      const team = [Party.create("Ekans", 15), Party.create("Meowth", 15), Party.create("Koffing", 15)];
      // (A double battle, the two of them together; with only one Pokémon that
      // can fight, a single one.)
      const outcome = await battle("trainer", { foe: { name: "Rocket Jessie & James", team, pic: "jessie_james" },
        defeatText: ["Jessie: We can't lose to a kid\nlike this!"], prize: 750, double: canDouble() });
      if (outcome !== "won") return;
      f.jessieJames = true;
      show("world");
      await Overworld.resume();
      await say(["James: This isn't over, twerp!",
        "Jessie, James & Meowth: Looks like\nTeam Rocket's blasting off again!"]);
      // Back up the ladder.
      await Overworld.act([{ who: K, moves: ["walk_down", "walk_down", "walk_right", "set_invisible"] }]);
      await Overworld.act([{ who: J, moves: ["walk_down", "walk_down", "walk_right", "walk_right", "set_invisible"] }]);
      Overworld.removeObject(J);
      Overworld.removeObject(K);
    }

    // ---------- Jessie & James, later on (as in Yellow) ----------
    //
    // Three more ambushes, each a double battle (a single one with only one
    // Pokémon that can fight): stepping out of the Rocket Hideout's elevator
    // corridor toward Giovanni on B4F (Koffing, Meowth and Ekans, level 28),
    // coming up to Mr. Fuji on Pokémon Tower 7F (Meowth, Arbok and Weezing,
    // 30), and stepping off Silph Co. 7F's warp pad on 11F (Weezing, Arbok and
    // Meowth, 35). Each time they come at you from a few steps off, say their
    // piece and battle; beaten, they blast off back the way they came. Beat
    // you, and they're waiting there again.
    const LATER_JESSIE_JAMES = {
      RocketHideout_B4F: {
        flag: "jessieJamesHideout", team: [["Koffing", 28], ["Meowth", 28], ["Ekans", 28]],
        // (Only before Giovanni's beaten; up the way from the elevator.)
        due: (f, at) => !f.TRAINER_BOSS_GIOVANNI && at.y === 19 && (at.x === 16 || at.x === 17) && at.facing === "up",
        cols: [16, 17], dy: 1, steps: 3,
        // (Out of the elevator behind you, down a step, along and up the corridor to stand behind you.)
        enter: (me, other) => [[me.x, 20], [other, 21]].map(([x], i) => {
          const ex = 20 + i;
          return { start: { x: ex, y: 23, facing: "down" },
            moves: ["walk_down"].concat(Array(ex - x).fill("walk_left"), Array(4).fill("walk_up")) };
        }),
        intro: ["Jessie: Not another step, brat!", "James: How dare you humiliate us\nat Mt. Moon!",
          "Jessie: It's payback time, you brat!"],
        defeat: ["Jessie: Such a dreadful twerp!"],
        after: ["Jessie, James & Meowth: Looks like\nTeam Rocket's blasting off again!"]
      },
      PokemonTower_7F: {
        flag: "jessieJamesTower", team: [["Meowth", 30], ["Arbok", 30], ["Weezing", 30]],
        // (Only while Mr. Fuji's still held there.)
        due: (f, at) => !f.rescuedMrFuji && at.y === 12 && at.x >= 10 && at.x <= 12 && at.facing === "up",
        cols: [10, 12], dy: 1, steps: 3,
        // (Up the stairs from 6F behind you, round and up to stand behind you.)
        enter: (me, other) => [me.x, other].map((x, i, both) => {
          const sx = x <= both[1 - i] ? 11 : 12;
          return { start: { x: sx, y: 16, facing: "up" },
            moves: ["walk_up", "walk_up"].concat(Array(Math.abs(x - sx)).fill(x < sx ? "walk_left" : "walk_right"), ["walk_up"]) };
        }),
        intro: ["Jessie: Stop right there!", "James: Grampa here wanted to\ncomplain, so we're setting him\nstraight.",
          "Jessie: So render yourself invisible,\nor prepare to fight!"],
        defeat: ["James: You will regret this!"],
        after: ["Jessie, James & Meowth: Looks like\nTeam Rocket's blasting off again!"]
      },
      SilphCo_11F: {
        flag: "jessieJamesSilph", team: [["Weezing", 35], ["Arbok", 35], ["Meowth", 35]],
        // (Only before Giovanni's beaten; just off the warp pad from 7F.)
        due: (f, at) => !f.TRAINER_BOSS_GIOVANNI_2 && at.x <= 2 && (at.y === 6 || at.y === 7),
        cols: [0, 2], dy: 1, steps: 3,
        intro: ["Jessie: Hold it right there, brat!", "James: Our Boss is in a meeting!",
          "Jessie: You'd better not disturb\nhim!"],
        defeat: ["James: Like always…"],
        after: ["Jessie: Team Rocket, blast off at\nthe speed of light!", "James: Again…"]
      }
    };
    function laterJessieJamesStep() {
      const f = env.player.flags, at = Overworld.position(), J = LATER_JESSIE_JAMES[at.map];
      return J && !f[J.flag] && J.due(f, at) && canBattle() ? { type: "jessie-james-later" } : null;
    }
    async function laterJessieJames() {
      const f = env.player.flags, me = Overworld.position(), J = LATER_JESSIE_JAMES[me.map];
      const JE = "LOCALID_JESSIE", JA = "LOCALID_JAMES";
      music("mus_encounter_rocket");
      // (They end up side by side in front of you, Jessie face to face with you;
      // they come from `steps` tiles further off, from the side of `dy`.)
      const hi = J.cols[1], other = me.x < hi ? me.x + 1 : me.x - 1;
      const row = me.y + J.dy, from = row + J.dy * J.steps;
      const come = J.dy < 0 ? "down" : "up", back = J.dy < 0 ? "up" : "down";
      await Overworld.act([{ who: "player", moves: ["emote_exclamation_mark"] }]);
      await say(J.intro.slice(0, 1));
      const paths = J.enter ? J.enter(me, other) : null;
      if (paths) {
        // (A way of their own: B4F's, out of the elevator behind you.)
        sfx(me.map === "PokemonTower_7F" ? "se_exit" : "se_door");
        Overworld.follower.hide(true);   // (your Pokémon back in its ball: they stop where it walked)
        Overworld.addObject(JE, paths[0].start, window.WORLD_SPRITES.jessie);
        Overworld.addObject(JA, paths[1].start, window.WORLD_SPRITES.james);
        await Overworld.act([{ who: JE, moves: paths[0].moves }, { who: JA, moves: paths[1].moves }]);
      } else {
        Overworld.addObject(JE, { x: me.x, y: from, facing: come }, window.WORLD_SPRITES.jessie);
        Overworld.addObject(JA, { x: other, y: from, facing: come }, window.WORLD_SPRITES.james);
        const walk = Array(J.steps).fill("walk_" + come);
        await Overworld.act([{ who: JE, moves: walk }, { who: JA, moves: walk }]);
      }
      await Overworld.act([{ who: "player", moves: ["face_" + back] }]);
      await say(J.intro.slice(1));
      const team = J.team.map(([sp, lv]) => Party.create(sp, lv));
      const outcome = await battle("trainer", { foe: { name: "Rocket Jessie & James", team, pic: "jessie_james" },
        defeatText: J.defeat, prize: 54 * J.team[0][1], double: canDouble() });
      if (outcome !== "won") { Overworld.follower.hide(false); return; }
      f[J.flag] = true;
      show("world");
      await Overworld.resume();
      await say(J.after);
      // Back the way they came, and gone.
      if (paths) {
        const undo = { walk_up: "walk_down", walk_down: "walk_up", walk_left: "walk_right", walk_right: "walk_left" };
        const leave = (p) => p.moves.slice().reverse().map((m) => undo[m]).concat(["set_invisible"]);
        await Overworld.act([{ who: JE, moves: leave(paths[0]) }, { who: JA, moves: leave(paths[1]) }]);
      } else {
        const leave = Array(J.steps).fill("walk_" + back).concat(["set_invisible"]);
        await Overworld.act([{ who: JE, moves: leave }, { who: JA, moves: leave }]);
      }
      Overworld.removeObject(JE);
      Overworld.removeObject(JA);
      Overworld.follower.hide(false);
      music((window.WORLD_MAPS[me.map] || {}).music);
    }

    // ---------- Cerulean City: your rival ----------
    //
    // Heading north out of Cerulean, Gary comes down from Nugget Bridge for a
    // battle (CeruleanCity_EventScript_Rival): FireRed's Cerulean team, with
    // his Eevee (this game's rival) in place of a starter. Then he walks off
    // round you, south. (FireRed's Fame Checker, which he'd give you, isn't in
    // this game.) Lose and you black out, and he's waiting next time.
    async function ceruleanRival(side) {
      music("mus_encounter_rival");
      const f = env.player.flags, R = "LOCALID_CERULEAN_RIVAL";
      const x = { Left: 22, Mid: 23, Right: 24 }[side];
      Overworld.addObject(R, { x, y: 0, facing: "down" });
      await Overworld.act([{ who: R, moves: M("CeruleanCity_Movement_RivalEnter") }]);
      await say(T("CeruleanCity_Text_RivalIntro"));
      const base = trainerTeam("TRAINER_RIVAL_CERULEAN_SQUIRTLE");
      const last = base[base.length - 1];
      // (This game's own: his Eevee knows Shadow Ball here, and Terastallizes into a Ghost type.)
      const moves = window.RandomTeam.levelUpMoves("Eevee", last.level).filter((m) => m !== "Shadow Ball").slice(-3).concat(["Shadow Ball"]);
      const eevee = Object.assign(Party.create("Eevee", last.level, { ivs: last.ivs.hp, moves }), { teraType: "Ghost", teraAce: true });
      const team = base.slice(0, -1).concat(eevee);
      const outcome = await battle("trainer", { foe: { name: "Rival " + env.player.rival, team, pic: "rival_early", tera: true },
        defeatText: T("CeruleanCity_Text_RivalDefeat"), trainerId: "TRAINER_RIVAL_CERULEAN_SQUIRTLE" });
      if (outcome !== "won") return;
      f.ceruleanRival = true;
      show("world");
      await Overworld.resume();
      await say(T("CeruleanCity_Text_RivalPostBattle"));
      music("mus_rival_exit");
      // Round you and away south (the first half of FireRed's walk: he'd come
      // back with the Fame Checker).
      const right = side === "Right";
      const walk = M(right ? "CeruleanCity_Movement_RivalStartExitRight" : "CeruleanCity_Movement_RivalStartExit").slice(0, 8);
      await Overworld.act([{ who: "player", moves: M(right ? "CeruleanCity_Movement_PlayerWatchRivalExitRight" : "CeruleanCity_Movement_PlayerWatchRivalExit") },
        { who: R, moves: walk.concat(["walk_down", "walk_down", "set_invisible"]) }]);
      Overworld.removeObject(R);
      music("mus_fuchsia");
    }

    // 2F: Gary (PokemonTower_2F_EventScript_Rival): FireRed's team, with
    // Gyarados in Kadabra's place, and his Eevee, an Umbreon by now, in place of
    // a starter. Then he heads off down the stairs.
    async function towerRival(right) {
      const f = env.player.flags, R = "LOCALID_POKEMON_TOWER_RIVAL";
      music("mus_encounter_rival");
      await Overworld.act([{ who: R, moves: [right ? "walk_in_place_faster_right" : "walk_in_place_faster_down"] },
        { who: "player", moves: [right ? "walk_in_place_faster_left" : "walk_in_place_faster_up"] }]);
      await Overworld.act([{ who: R, moves: ["emote_exclamation_mark", "delay_48"] }]);
      await say(T("PokemonTower_2F_Text_RivalIntro"));
      const base = trainerTeam("TRAINER_RIVAL_POKEMON_TOWER_SQUIRTLE");
      const last = base[base.length - 1];
      const team = base.slice(0, -1).map((r) => (r.species === "Kadabra" ? Party.create("Gyarados", r.level, { ivs: r.ivs.hp }) : r))
        .concat(Party.create("Umbreon", last.level, { ivs: last.ivs.hp }));
      const outcome = await battle("trainer", { foe: { name: "Rival " + env.player.rival, team, pic: "rival_late" },
        defeatText: T("PokemonTower_2F_Text_RivalDefeat"), trainerId: "TRAINER_RIVAL_POKEMON_TOWER_SQUIRTLE",
        prize: 36 * last.level });   // (FireRed's TRAINER_CLASS_RIVAL_LATE: 9, x4 as this game's prizes are)
      if (outcome !== "won") return;
      f.towerRival = true;
      show("world");
      await Overworld.resume();
      await say(T("PokemonTower_2F_Text_RivalPostBattle"));
      music("mus_rival_exit");
      await Overworld.act([{ who: R, moves: M(right ? "PokemonTower_2F_Movement_RivalExitRight" : "PokemonTower_2F_Movement_RivalExitDown").concat(["set_invisible"]) }]);
      sfx("se_exit");
      Overworld.removeObject(R);
      music((window.WORLD_MAPS[env.player.location.map] || {}).music);
    }

    return { route22Rival, viridianStopStep, viridianOldManStop, redForestStep, redForest, jessieJamesStep, jessieJames, laterJessieJamesStep, laterJessieJames, ceruleanRival, towerRival };
  }

  window.KantoStory = { create };
})();
