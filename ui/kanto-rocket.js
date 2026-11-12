// Kanto rocket scenes and progression.
// Shared state and services are accessed through live env properties.
(function () {
  "use strict";

  function create(env) {
    // The free tiles beside you (not in front): to your sides, then behind.
    function besideYou(skip) {
      const out = [];
      const me = Overworld.position(), people = Overworld.people();
      const order = { up: ["left", "right", "down"], down: ["right", "left", "up"], left: ["up", "down", "right"], right: ["up", "down", "left"] }[me.facing];
      for (const d of order) {
        const [dx, dy] = World.DIRS[d], t = { x: me.x + dx, y: me.y + dy };
        if ((skip || []).some((q) => q.x === t.x && q.y === t.y)) continue;
        const r = World.step({ map: me.map, x: me.x, y: me.y }, d, (m, x, y) => people.some((q) => q.x === x && q.y === y));
        if (r.ok && !r.warp && !r.jump && r.x === t.x && r.y === t.y) out.push(t);
      }
      return out;
    }

    async function giovanniHideout(person) {
      const f = env.player.flags, ID = "TRAINER_BOSS_GIOVANNI", L = env.HIDEOUT_LEAF;
      if (!env.canBattle()) {
        env.music("mus_encounter_rocket");
        await env.say(env.T("RocketHideout_B4F_Text_GiovanniIntro"));
        return;
      }
      // Leaf comes running in, from the elevator's side.
      env.music("mus_encounter_rival");
      await env.say(["{PLAYER}! Wait!"]);
      const me = Overworld.position();
      // (Beside you, not where the Silph Scope will be.)
      env.hideoutLeafFrom = await env.walkIn(L, env.lookOf("leaf"), { x: 20, y: 24 }, besideYou([{ x: 20, y: 5 }]).map((t) => Object.assign(t, { face: me.facing })), "fast_");
      const spot = Overworld.personPosition(L);
      if (spot) await Overworld.act([{ who: "player", moves: ["face_" + env.toward(me, spot)] }]);
      if (!f.leafHideout) {
        await env.say(["Leaf: Phew, I made it! {PLAYER}!\nYou found their hideout, too?",
          "I've been looking into Team Rocket\never since I heard rumors about the\nGame Corner.",
          "They've been stealing people's\nPokémon… I couldn't just sit back\nand do nothing!",
          "So that's their boss… Let's take\nhim on together, {PLAYER}!"]);
        f.leafHideout = true;
      } else {
        await env.say(["Leaf: Ready this time, {PLAYER}?\nWe can beat him if we work\ntogether!"]);
      }
      await Overworld.act([{ who: "player", moves: ["face_" + me.facing] }]);
      env.music("mus_encounter_rocket");
      await env.say(env.T("RocketHideout_B4F_Text_GiovanniIntro"));
      await env.say(["Leaf: Choose three of your Pokémon,\n{PLAYER}! I'm with you!"]);
      const own = env.trainerTeam(ID);
      const extra = env.HIDEOUT_GIOVANNI_EXTRA.map(([sp, lv]) => Party.create(sp, lv, { ivs: own[0].ivs.hp }));
      const team = own.slice(0, 2).concat(extra, own.slice(2));
      const starter = env.RIVAL_PICK[f.starter] || "Bulbasaur";
      const leafTeam = env.leafMegaTeam().filter(([sp]) => sp === "Butterfree" || sp === "Wigglytuff" || sp === env.STAGE_TWO[starter])
        .map(([sp, lv]) => Party.create(sp, lv));
      const outcome = await env.battle("trainer", { foe: { name: "Boss Giovanni", team, pic: "leader_giovanni" },
        defeatText: env.T("RocketHideout_B4F_Text_GiovanniDefeat"), trainerId: ID, prizeClass: "Boss",
        prize: Player.prizeMoney("Boss Giovanni", team, "Boss"),
        partner: { name: env.LAB_RIVAL_NAME, team: leafTeam, pic: "leaf" } });
      if (outcome === "cancelled") {
        // (She keeps watch out of sight, and comes back when you speak to him again.)
        await env.faceEachOther(L);
        await env.say(["Leaf: Not ready yet? That's OK!\nI'll keep watch nearby.", "Just talk to him again when you're\nready, and I'll be right there!"]);
        if (env.hideoutLeafFrom) await env.walkOut(L, env.hideoutLeafFrom, "fast_");
        Overworld.removeObject(L);
        env.music((window.WORLD_MAPS[env.player.location.map] || {}).music);
        return;
      }
      if (outcome !== "won") return;
      env.show("world");
      await Overworld.resume();
      await env.say(env.T("RocketHideout_B4F_Text_GiovanniPostBattle"));
      const at = Overworld.personPosition(L);
      await Overworld.fadeToBlack();
      Overworld.removePerson(person);
      Overworld.refreshPeople();
      if (at) Overworld.addObject(L, at, env.lookOf("leaf"));
      await Overworld.fadeFromBlack();
      env.music("mus_encounter_rival");
      if (at) await env.faceEachOther(L);
      await env.say(["Leaf: We did it, {PLAYER}! We beat\nthe boss of Team Rocket!",
        "Huh? He left something behind…\nYou should take it, {PLAYER}!",
        "I'm going to go and make sure the\nPokémon they stole get back to\ntheir Trainers.",
        "Thanks for having my back! See\nyou later, {PLAYER}!"]);
      env.music("mus_rival_exit");
      if (at && env.hideoutLeafFrom) await env.walkOut(L, env.hideoutLeafFrom, "fast_");
      Overworld.removeObject(L);
      env.hideoutLeafFrom = null;
      env.music((window.WORLD_MAPS[env.player.location.map] || {}).music);
    }

    // What happens once you've beaten some of the Game Corner's and Hideout's
    // Rockets: the poster guard leaves; the barriers on B1F and B4F open; the
    // Lift Key's dropped.
    async function afterRocket(person) {
      const f = env.player.flags, id = person.trainer.id;
      // A Cinnabar Gym trainer beaten opens the door by their quiz machine
      // (CinnabarIsland_Gym_EventScript_DefeatedQuinn and the like).
      const quiz = Object.keys(env.CINNABAR_QUIZ).find((n) => env.CINNABAR_QUIZ[n].trainer === id);
      if (quiz && f[id]) { env.show("world"); await Overworld.resume(); env.openQuizDoor(+quiz); return; }
      // The Rocket Warehouse's Admins (FiveIsland_RocketWarehouse_EventScript_DefeatedAdmin1/2).
      if (f[id] && (await env.warehouseAdmin(id))) return;
      if (!f[id] || !/^TRAINER_TEAM_ROCKET_GRUNT_(7|12|16|17|18)$/.test(id)) return;
      env.show("world");
      await Overworld.resume();
      if (id === "TRAINER_TEAM_ROCKET_GRUNT_7") {
        await env.say(env.T("CeladonCity_GameCorner_Text_GruntPostBattle"));
        const west = Overworld.position().facing === "left";
        await Overworld.act([{ who: "#" + person.id, moves: env.M(west ? "CeladonCity_GameCorner_Movement_GruntExitWest" : "CeladonCity_GameCorner_Movement_GruntExit") }]);
        Overworld.removePerson(person);
      } else if (id === "TRAINER_TEAM_ROCKET_GRUNT_12" ||
        ((id === "TRAINER_TEAM_ROCKET_GRUNT_16" || id === "TRAINER_TEAM_ROCKET_GRUNT_17") && f.TRAINER_TEAM_ROCKET_GRUNT_16 && f.TRAINER_TEAM_ROCKET_GRUNT_17)) {
        env.applyPatches(env.player.location.map);
        env.sfx("se_unlock");
      } else if (id === "TRAINER_TEAM_ROCKET_GRUNT_18") {
        await env.say(env.T("RocketHideout_B4F_Text_Grunt1PostBattle"));
        Overworld.refreshPeople();
      }
    }

    // The Fighting Dojo's prized Pokémon (SaffronCity_Dojo_EventScript_HitmonleeBall):
    // its picture, the Karate Master looks up, and it's yours if you like
    // (Lv. 25); its Poké Ball goes, and the other's yours no longer to take.
    // (This game's own: once you've beaten the Karate Master's rematch, the
    // other is yours too, at Lv. 50; see dojoMaster().)
    async function dojoBall(person, species) {
      const f = env.player.flags;
      const second = !!f.dojoHitmon && env.dojoMasterRematchWon() && !f.dojoHitmon2;
      if (f.dojoHitmon && !second) { await env.say(env.T("SaffronCity_Dojo_Text_BetterNotGetGreedy")); return; }
      env.showPicture(species);
      env.cry(species);
      await Overworld.act([{ who: "LOCALID_KARATE_MASTER", moves: env.M("Common_Movement_WalkInPlaceFasterUp") }]);
      const yes = await env.confirm(env.fill(env.T("SaffronCity_Dojo_Text_YouWant" + species)[0]));
      env.hidePicture();
      if (!yes) return;
      await env.giftMon(species, second ? env.DOJO_SECOND_LEVEL : 25, env.T("SaffronCity_Dojo_Text_ReceivedMonFromKarateMaster"), [Party.speciesName(species)], () => {
        Overworld.removePerson(person);
        if (second) f.dojoHitmon2 = species; else f.dojoHitmon = species;
      });
    }

    // A trainer's rematch, while it's waiting: { intro, defeat, team() }, or null.
    function dojoRematch(id) {
      const f = env.player.flags, re = env.DOJO_REMATCH[id];
      if (!re || !f.gameClear || !f[id] || (f.dojoRematch && f.dojoRematch[id])) return null;
      const fr = window.WORLD_TRAINERS[id].party;
      return Object.assign({}, re, {
        team: () => re.team.map(([sp, lv], i) => Party.create(sp, lv, { ivs: Math.floor(((fr[i] || fr[0]).iv || 0) * 31 / 255) }))
      });
    }

    // The Karate Master, beaten: choose a prized Pokémon (or train with them);
    // beaten again, the Hitmon you left behind, once (if the party and boxes
    // are full, he keeps it for you until you come back).
    async function dojoMaster() {
      const f = env.player.flags;
      if (env.dojoMasterRematchWon() && f.dojoHitmon && !f.dojoHitmon2) {
        const species = f.dojoHitmon === "Hitmonlee" ? "Hitmonchan" : "Hitmonlee";
        const name = Party.speciesName(species);
        await env.say(["Indeed, I have lost once more!", "When you came before, you took our\n" + f.dojoHitmon + " and left " + name + " here.",
          name + " has trained hard ever since,\nand it wishes to go with you!", "Take it! Let the two of them train\ntogether at your side!"]);
        const ball = window.WORLD_MAPS.SaffronCity_Dojo.people.find((p) => p.script === "SaffronCity_Dojo_EventScript_" + species + "Ball");
        env.showPicture(species);
        env.cry(species);
        const got = await env.giftMon(species, env.DOJO_SECOND_LEVEL, env.T("SaffronCity_Dojo_Text_ReceivedMonFromKarateMaster"), [name], () => {
          f.dojoHitmon2 = species;
          env.hidePicture();
          if (ball) Overworld.removePerson(ball);
        });
        env.hidePicture();
        if (got) await env.say(["Grunt!", "Stay and train at karate with us,\nall three of you!"]);
        return;
      }
      if (env.dojoMasterRematchWon() && f.dojoHitmon) { await env.say(env.DOJO_REMATCH[env.DOJO_MASTER].after); return; }
      await env.say(env.T(f.dojoHitmon ? "SaffronCity_Dojo_Text_StayAndTrainWithUs" : "SaffronCity_Dojo_Text_ChoosePrizedFightingMon"));
      if (!f.dojoDenDoor) await dojoDenDoor();
      else if (f.dojoHitmon) await env.say(["Our training room is through the\ndoor at the back. Its den awaits\nyour Lure!"]);
    }

    // (This game's own.) Beaten, the Karate Master opens the door to the
    // Dojo's back room and its Tera Raid den (game/raid-dens.js), once.
    async function dojoDenDoor() {
      const f = env.player.flags;
      if (!f[env.DOJO_MASTER] || f.dojoDenDoor) return;
      env.show("world");
      await Overworld.resume();
      await env.say(["Grunt! One thing more!", "Behind the door at the back of my\nDojo is our training room.",
        "A Tera Raid den sleeps there. Use a\nLure on it, and a Tera Fighting-type\nPokémon will rise to face you!",
        "I shall open it for you. Train\nthere as often as you like!"]);
      Screen.say("");
      f.dojoDenDoor = true;
      env.sfx("se_rs_door");
      env.applyPatches("SaffronCity_Dojo");
      await env.persist();
    }

    async function silphDoor(script) {
      const f = env.player.flags, [, n, k] = /^SilphCo_(\d+)F_EventScript_Door(\d*)$/.exec(script);
      const flag = env.silphDoorFlag(n, k || 1, !k);
      if (f[flag]) { await env.say(env.T("Text_TheDoorIsOpen")); return; }
      if (!f.FLAG_HIDE_SILPH_CO_5F_CARD_KEY) { await env.say(env.T("Text_ItNeedsCardKey")); return; }
      await env.sayWithJingle("mus_level_up", env.T("Text_CardKeyOpenedDoor"));
      f[flag] = true;
      env.applyPatches(env.player.location.map);
      env.sfx("se_unlock");
    }

    async function silphRival(top) {
      const f = env.player.flags, R = "LOCALID_SILPH_CO_RIVAL";
      env.music("mus_encounter_rival");
      await Overworld.act([{ who: R, moves: env.M("Common_Movement_ExclamationMark") }]);
      await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterDown") }, { who: R, moves: env.M("Common_Movement_Delay48") }]);
      await env.say(env.T("SilphCo_7F_Text_RivalWhatKeptYou"));
      if (top) await Overworld.act([{ who: R, moves: env.M("SilphCo_7F_Movement_RivalApproachTop") }]);
      await env.say(env.T("SilphCo_7F_Text_RivalIntro"));
      // (FireRed's IVs: 100, and 150 for his starter, here Umbreon.)
      const team = env.SILPH_RIVAL_TEAM.map(([sp, lv, item]) => Object.assign(Party.create(sp, lv, { ivs: Math.floor((sp === "Umbreon" ? 150 : 100) * 31 / 255) }),
        item ? { item } : {}));
      const ace = Math.max(...team.map((r) => r.level));
      const outcome = await env.battle("trainer", { foe: { name: "Rival " + env.player.rival, team, pic: "rival_late" },
        defeatText: env.T("SilphCo_7F_Text_RivalDefeat"), trainerId: "TRAINER_RIVAL_SILPH_SQUIRTLE",
        prize: 36 * ace });   // (FireRed's TRAINER_CLASS_RIVAL_LATE: 9, x4 as this game's prizes are)
      if (outcome !== "won") return;
      f.silphRival = true;
      env.show("world");
      await Overworld.resume();
      // (This game's own: before his "Smell ya!", a Mega Stone from Silph's labs.)
      const bye = env.T("SilphCo_7F_Text_RivalPostBattle");
      await env.say(bye.slice(0, -1));
      await env.megaStoneGift("pidgeotite", ["Oh, and here. Silph was making these.\nI grabbed a spare: a Pidgeotite.",
        "Not that it'll help you keep up\nwith me!"], env.player.rival);
      await env.say(bye.slice(-1));
      env.music("mus_rival_exit");
      await Overworld.act([{ who: R, moves: env.M(top ? "SilphCo_7F_Movement_RivalExitTop" : "SilphCo_7F_Movement_RivalExitBottom") }]);
      env.sfx("se_warp_in");
      await Overworld.act([{ who: R, moves: ["set_invisible"] }]);
      Overworld.removeObject(R);
      env.music((window.WORLD_MAPS[env.player.location.map] || {}).music);
    }

    async function giovanniSilph(left) {
      const G = "LOCALID_SILPH_CO_GIOVANNI", ID = "TRAINER_BOSS_GIOVANNI_2", R = env.SILPH_RED;
      await Overworld.act([{ who: G, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      await env.sleep(400);
      await env.say(env.T("SilphCo_11F_Text_GiovanniIntro"));
      Screen.say("");
      const approach = [{ who: G, moves: env.M(left ? "SilphCo_11F_Movement_GiovanniApproachLeft" : "SilphCo_11F_Movement_GiovanniApproachRight") }];
      if (left) approach.push({ who: "player", moves: env.M("SilphCo_11F_Movement_PlayerFaceGiovanni") });
      await Overworld.act(approach);
      if (!env.canBattle()) return;
      // Red, from the warp pad.
      const me = Overworld.position();
      // (Beside you; or, coming at you from the left, the way round to you
      // is past Giovanni: below him, then.)
      const spots = left ? [{ x: 6, y: 16, face: "up" }] : besideYou().map((t) => Object.assign(t, { face: me.facing }));
      env.sfx("se_warp_in");
      // (He walks, there and back: he's in no hurry.)
      const from = await env.walkIn(R, env.lookOf("red"), { x: 2, y: 5 }, spots);
      if (Overworld.personPosition(R)) await env.faceEachOther(R);
      await env.say(["Red: …"]);
      await Overworld.act([{ who: R, moves: ["face_up"] }, { who: "player", moves: ["face_" + me.facing] }]);
      await env.say(["Red joined {PLAYER}, ready\nto battle!",
        "Giovanni: Hm? Another child…\nHow tiresome.",
        "No matter. I'll crush the two of you\ntogether!"]);
      const own = env.trainerTeam(ID).map((r) => (r.species === "Kangaskhan" ? Object.assign(r, { item: "kangaskhanite" }) : r));
      const extra = env.SILPH_GIOVANNI_EXTRA.map(([sp, lv]) => Party.create(sp, lv, { ivs: own[0].ivs.hp }));
      const team = own.slice(0, -1).concat(extra, own.slice(-1));   // (Nidoqueen, his ace, still last)
      // (Red's three fight at Giovanni's level: the average of his six, as they are after Kanto's level raise.)
      const redLevel = Math.round(team.reduce((n, m) => n + m.level, 0) / team.length);
      const redTeam = env.RED_SILPH_PICK.map((sp) => env.RED_SILPH_ROSTER.find((m) => m[0] === sp))
        .map(([sp, , item]) => Object.assign(Party.create(sp, redLevel), item ? { item } : {}));
      const outcome = await env.battle("trainer", { foe: { name: "Boss Giovanni", team, pic: "leader_giovanni" },
        defeatText: env.T("SilphCo_11F_Text_GiovanniDefeat"), trainerId: ID, prizeClass: "Boss",
        prize: Player.prizeMoney("Boss Giovanni", team, "Boss"),
        partner: { name: "Red", team: redTeam, pic: "red" } });
      if (outcome === "cancelled") {
        // (Backed out: Giovanni goes back to his place, and Red with him out of sight.)
        await env.say(["Giovanni: Hmph. Lost your nerve?\nI'll be waiting."]);
        await Overworld.fadeToBlack();
        Overworld.refreshPeople();
        await Overworld.fadeFromBlack();
        return;
      }
      if (outcome !== "won") return;
      env.show("world");
      await Overworld.resume();
      await env.say(env.T("SilphCo_11F_Text_GiovanniPostBattle"));
      Screen.say("");
      const at = Overworld.personPosition(R);
      await Overworld.fadeToBlack();
      Overworld.refreshPeople();
      if (at) Overworld.addObject(R, at, env.lookOf("red"));
      await Overworld.fadeFromBlack();
      if (!at) return;
      await env.faceEachOther(R);
      await env.say(["Red: …", "Red gave a small nod."]);
      if (from) await env.walkOut(R, from);
      Overworld.removeObject(R);
    }

    return {
      besideYou,
      giovanniHideout,
      afterRocket,
      dojoBall,
      dojoRematch,
      dojoMaster,
      dojoDenDoor,
      silphDoor,
      silphRival,
      giovanniSilph,
    };
  }

  window.KantoRocket = { create };
})();
