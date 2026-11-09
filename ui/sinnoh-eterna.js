// Platinum's second chapter. Scene conditions and rewards persist separately
// from the imported parties/messages and the adapted map coordinates.
(function () {
  "use strict";
  function create(env) {
    const player = () => env.player(), state = () => Sinnoh.state(player());
    const say = (id, buffers) => env.say(Sinnoh.text(id, player(), buffers));
    const event = (script) => ({ type: "trigger", map: player().location.map, trigger: { script: "pt:" + script } });
    const cleared = () => !!state().mars || player().badges.includes("forest");
    const refresh = () => { if (env.refreshMap) env.refreshMap(); else env.refreshPeople(); };
    function foe(id) { const t = PLATINUM_DATA.trainers[id]; return { name: t.className + " " + t.name, team: Sinnoh.team(id), pic: t.pic }; }
    async function fight(id, extra = {}) {
      if (!env.canBattle()) return false;
      const t = PLATINUM_DATA.trainers[id];
      const result = await env.battle("trainer", { foe: foe(id), trainerId: id, defeatText: t.defeat, prizeClass: t.className, ...extra });
      if (result !== "won") return false;
      player().flags[id] = true;
      env.showWorld(); await env.resume(); return true;
    }
    async function jubilife() {
      if (state().jubilifeGalactic) return;
      if (!player().badges.includes("coal")) { await env.say("Rowan: Earn the Coal Badge in\nOreburgh before heading north."); return; }
      await say("JubilifeCity_Text_ThatsOreburghsGymBadge", [player().name, "Dawn"]);
      await say("JubilifeCity_Text_RegretInsultingTeamGalactic");
      await say("JubilifeCity_Text_DawnPlayerLetsBattleTogether", ["Dawn", player().name]);
      const starter = state().starter || "Turtwig";
      const second = "PT_TRAINER_GALACTIC_GRUNT_JUBILIFE_CITY_2";
      if (!await fight("PT_TRAINER_GALACTIC_GRUNT_JUBILIFE_CITY_1", {
        partner: { name: "Dawn", team: Sinnoh.team("PT_TRAINER_DAWN_JUBILIFE_CITY_" + starter.toUpperCase()), pic: "pt_dawn_dp" },
        foe2: { ...foe(second), defeatText: PLATINUM_DATA.trainers[second].defeat, prizeClass: "Galactic Grunt" }
      })) return;
      player().flags[second] = true; state().jubilifeGalactic = true; refresh();
      await say("JubilifeCity_Text_CalledThemselvesTeamGalactic");
      await env.say("Dawn: Route 204 leads north through\nRavaged Path to Floaroma Town.");
    }
    async function guard() {
      if (state().windGuard || cleared()) { await door(); return; }
      if (!state().jubilifeGalactic) { await env.say("Team Galactic is causing trouble\nin northern Jubilife City.\nHelp Professor Rowan there first."); return; }
      await say("ValleyWindworksOutside_Text_BattleMeForIt");
      if (!await fight("PT_TRAINER_GALACTIC_GRUNT_VALLEY_WINDWORKS_1")) return;
      state().windGuard = true; refresh();
      await say("ValleyWindworksOutside_Text_GettingOwnedBySomeKid");
      await say("ValleyWindworksOutside_Text_Kerchunk");
    }
    async function meadow() {
      if (state().worksKey || cleared()) { await env.say("The meadow is peaceful again.\nThe Works Key opens the Windworks."); return; }
      if (!state().windGuard) { await env.say("The Galactic Grunt at Valley\nWindworks has locked out visitors.\nGo east from Floaroma to find him."); return; }
      await say("FloaromaMeadow_Text_HandOverThatHoney");
      for (const n of [1, 2]) {
        const id = "PT_TRAINER_GALACTIC_GRUNT_FLOAROMA_MEADOW_" + n;
        if (player().flags[id]) continue;
        if (n === 2) await say("FloaromaMeadow_Text_ImUpNextHeheheh");
        if (!await fight(id)) return;
      }
      state().worksKey = true;
      Player.addItem(player(), "works-key"); Player.addItem(player(), "honey", 10);
      refresh();
      await say("FloaromaMeadow_Text_KeyMustBeForWindworks");
      await env.say("{PLAYER} received the Works Key\nand 10 jars of Honey!");
    }
    async function door() {
      if (state().worksOpen) { await env.say("The Works Key has unlocked the door."); return; }
      if (!state().worksKey) { await say("ValleyWindworksOutside_Text_ItsLockedFromInside"); return; }
      await say("ValleyWindworksOutside_Text_UseTheWorksKey");
      state().worksOpen = true; refresh();
      env.sfx("se_door"); await say("ValleyWindworksOutside_Text_KerchunkTheDoorOpened");
    }
    async function mars() {
      if (cleared()) { await env.say("Team Galactic has left the Windworks."); return; }
      if (!state().worksOpen) { await env.say("Find the Works Key in Floaroma\nMeadow and unlock the front door."); return; }
      await say("ValleyWindworksBuilding_Text_LetsHaveABattle");
      if (!await fight("PT_TRAINER_COMMANDER_MARS_VALLEY_WINDWORKS")) return;
      state().mars = true; refresh();
      await say("ValleyWindworksBuilding_Text_LeaveForTheTimeBeing");
      await say("ValleyWindworksBuilding_Text_FinallySeeMyDaughterAgain");
      await say("ValleyWindworksBuilding_Text_YuckPapaYoureStinky");
      await say("ValleyWindworksBuilding_Text_BalloonPokemonWillVisitAgain");
      await env.say("The way north on Route 205 is clear.\nContinue through Eterna Forest\nto reach Eterna City.");
    }
    async function cheryl() {
      if (state().cherylDone) { await env.say("Cheryl: Thank you for your help!"); return; }
      if (!cleared()) { await windStop(); return; }
      if (!state().cherylJoined) {
        await say("EternaForest_Text_MayIGoWithYou");
        state().cherylJoined = true; player().party.forEach(Party.heal); refresh();
        await say("EternaForest_Text_PlayerDecidedToGoWithCheryl");
      }
      await say("EternaForest_Text_IllKeepPokemonHealthy");
    }
    async function cherylExit() {
      if (!state().cherylJoined || state().cherylDone) return;
      state().cherylDone = true; player().party.forEach(Party.heal);
      Player.addItem(player(), "soothe-bell"); refresh();
      await say("EternaForest_Text_ThankYouSoMuch");
      await say("EternaForest_Text_TokenOfAppreciation");
      await env.say("{PLAYER} received a Soothe Bell!");
    }
    async function cut() {
      if (!state().cutHM) {
        await say("EternaCity_Text_OhYouHaveAPokedex");
        const hm = FieldMoves.hmFor("Cut");
        if (!Player.itemCount(player(), hm)) Player.addItem(player(), hm);
        state().cutHM = true;
        await env.say("{PLAYER} received " + Bag.name(hm) + "!");
      }
      await say("EternaCity_Text_CutCanBeUsedInField");
    }
    async function clock(n) {
      const stage = state().gardeniaClock | 0, names = ["LassCaroline", "AromaLadyJenna", "AromaLadyAngela"];
      if (player().badges.includes("forest") || stage > n) { await say("EternaGym_Text_" + names[n] + "AfterBattle"); return; }
      if (stage !== n) { await env.say("The clock hand points to a different\nplatform. Follow it and defeat\nthe Trainer waiting there first."); return; }
      await say("EternaGym_Text_" + names[n] + "BeforeBattle");
      if (!await fight(Sinnoh.clockTrainers[n], { terrain: "gym" })) return;
      // Return to the hub before the moving hand removes the old walkway.
      await env.teleport({ map: "EternaCity_Gym", x: 11, y: 18, facing: "up" });
      state().gardeniaClock = n + 1; refresh(); env.sfx("se_door");
      await say("EternaGym_Text_" + names[n] + "AfterBattle");
      await env.say("The clock hand moved to the next\nplatform!");
    }
    async function gardenia() {
      const p = player(), s = state();
      if (!p.badges.includes("forest")) {
        if (!p.badges.includes("coal") || !cleared() || (s.gardeniaClock | 0) < 3) {
          await env.say("Gardenia: Follow the clock hand\nand beat all three Gym Trainers\nbefore challenging me."); return;
        }
        await say("EternaGym_Text_GardeniaIntro");
        if (!await fight("PT_TRAINER_LEADER_GARDENIA", { terrain: "gym" })) return;
        p.badges.push("forest");
        for (const id of Sinnoh.clockTrainers) p.flags[id] = true;
        await say("EternaGym_Text_GardeniaReceiveForestBadge");
        await env.say(Sinnoh.text("EternaGym_Text_GardeniaExplainForestBadge", p).slice(0, 2));
        await env.say("Your Sinnoh level cap is now 26.");
      }
      if (!s.gardeniaTM) {
        const tm = Bag.machines().find(id => Bag.machineMove(id) === "Grass Knot");
        if (!tm) throw new Error("Grass Knot machine missing");
        Player.addItem(p, tm); s.gardeniaTM = true;
        await env.say("{PLAYER} received " + Bag.name(tm) + "!\nGrass Knot is stronger against\nheavier foes. This TM is reusable.");
      } else await say("EternaGym_Text_GardeniaGymBeaten");
    }
    async function windStop() {
      await env.say("Team Galactic is holding a worker\nat Valley Windworks. Help his\ndaughter before continuing north.");
      await env.teleport({ map: "FloaromaTown", x: 33, y: 45, facing: "right" });
    }
    function visible(p) {
      const s = state(), key = (p.script || "").slice(3);
      if (["jubilife-galactic", "jubilife-grunt-2", "jubilife-rowan"].includes(key)) return player().badges.includes("coal") && !s.jubilifeGalactic;
      if (key === "wind-guard") return !s.windGuard && !cleared();
      if (["meadow-grunts", "meadow-grunts-2"].includes(key)) return s.windGuard && !s.worksKey && !cleared();
      if (["mars", "charon"].includes(key) || (p.trainer && /VALLEY_WINDWORKS_[23]$/.test(p.trainer.id))) return !cleared();
      if (key === "wind-daughter") return cleared();
      if (key === "cheryl") return !s.cherylDone;
      return undefined;
    }
    function step() {
      const at = player().location, s = state();
      if (!Sinnoh.owns(at.map)) return null;
      if (at.map === "JubilifeCity" && at.y <= 14 && at.x >= 40 && at.x <= 55 && player().badges.includes("coal") && !s.jubilifeGalactic) return event("jubilife-galactic");
      if (at.map === "Route204" && !s.jubilifeGalactic && !player().badges.includes("forest")) return event(player().badges.includes("coal") ? "jubilife-galactic" : "north-stop");
      if ((at.map === "Route205FloaromaSide" && at.y < 57 || at.map === "EternaForest_2") && !cleared()) return event("wind-stop");
      if (at.map === "ValleyWindworks_Building" && !s.worksOpen) return event("wind-eject");
      if (at.map === "EternaForest_2" && !s.cherylJoined && !s.cherylDone) return event("cheryl");
      if ((at.map === "Route205EternaSide" || at.map === "EternaForest_2" && at.x >= 82 && at.y <= 34) && s.cherylJoined && !s.cherylDone) return event("cheryl-exit");
      return null;
    }
    async function run(script) {
      const key = (script || "").replace(/^pt:/, "");
      if (/^clock-[012]$/.test(key)) { await clock(+key.at(-1)); return true; }
      switch (key) {
        case "jubilife-galactic": case "jubilife-grunt-2": case "jubilife-rowan": await jubilife(); break;
        case "wind-guard": await guard(); break;
        case "wind-door": await door(); break;
        case "meadow-grunts": case "meadow-grunts-2": case "honey-man": await meadow(); break;
        case "mars": await mars(); break;
        case "charon": await say("ValleyWindworksBuilding_Text_WillYouShutIt"); break;
        case "wind-father": await say(cleared() ? "ValleyWindworksBuilding_Text_BalloonPokemonWillVisitAgain" : "ValleyWindworksBuilding_Text_CommanderWillSmooshYou"); break;
        case "wind-daughter": await say("ValleyWindworksBuilding_Text_YuckPapaYoureStinky"); break;
        case "wind-help": await env.say(cleared() ? "Papa is safe! Thank you!" : "Please help my papa!\nTeam Galactic is keeping him\nat Valley Windworks to the east."); break;
        case "wind-stop": await windStop(); break;
        case "wind-eject": await env.teleport({ map: "ValleyWindworks", x: 19, y: 14, facing: "up" }); break;
        case "north-stop": await env.say("Dawn: Oreburgh's Gym comes first.\nHead east along Route 203."); await env.teleport({ map: "JubilifeCity", x: 47, y: 15, facing: "down" }); break;
        case "cheryl": await cheryl(); break;
        case "cheryl-exit": await cherylExit(); break;
        case "cynthia-cut": await cut(); break;
        case "gardenia": await gardenia(); break;
        case "eterna-guide": await env.say("Follow the clock hand to its\nTrainer. Each victory turns it\nto the next platform. Three wins\nopen the way to Gardenia."); break;
        default: return false;
      }
      return true;
    }
    return { run, step, visible };
  }
  window.SinnohEterna = { create };
})();
