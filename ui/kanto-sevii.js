// Sevii Islands scenes and progression.
// Shared state and services are accessed through live env properties.
(function () {
  "use strict";

  function create(env) {
    // ---------- The Sevii Islands: the Seagallop ferries ----------
    //
    // FireRed's EventScript_SetSail (data/scripts/seagallop.inc): "All aboard
    // SEAGALLOP HI-SPEED 7!", the screen goes dark and the ferry crosses the sea
    // (ui/seagallop.js: DoSeagallopFerryScene), and you're at the other harbor.
    // game/sevii.js has the ports, the menus and the story's flags.
    async function setSail(from, to, announce) {
      if (announce !== false) {
        await env.say(from === "VERMILION_CITY" && to !== "CINNABAR_ISLAND" ? env.T("VermilionCity_Text_Seagallop7Departing") : env.T("Text_AllAboardSeagallopNum"),
          [String(Sevii.ferryNumber(from, to))]);
      }
      Screen.say("");
      env.clearMenu();
      await env.sleep(333);
      await Overworld.fadeToBlack();
      const o = env.$("#overlay");
      await Seagallop.ride(o, { eastbound: Sevii.eastbound(from, to), sfx: env.sfx, fadeMusic: () => env.music(null) }).catch((e) => console.error(e));
      o.classList.add("hidden");
      env.sfx("se_exit");
      const p = Sevii.port(to);
      Overworld.setAvatar("walk");
      await Overworld.teleport({ map: p.map, x: p.x, y: p.y, facing: to === "CINNABAR_ISLAND" ? "down" : "up" });
      env.music((window.WORLD_MAPS[p.map] || {}).music);
      // Landing on One Island the first time (OneIsland_Harbor's ON_FRAME), or
      // back on Cinnabar with Bill (CinnabarIsland_EventScript_ReturnFromSeviiIslands).
      if (to === "ONE_ISLAND" && env.player.flags.oneHarborScene === 1) await oneIslandArrival();
      else if (to === "CINNABAR_ISLAND" && env.player.flags.cinnabarScene === 3) await cinnabarBillReturns();
      await env.persist();
    }

    // A Seagallop sailor (a harbor's, or Vermilion's by the dock): where to?
    // `from`: the harbor (SEAGALLOP_*). `question`: what he asks.
    // (A port whose island isn't in the game, the sailor says so: none now.)
    async function seagallopMenu(from, question, onCancel) {
      let page = 0;
      for (;;) {
        const m = Sevii.menu(env.player.flags, from, page);
        const pages = m.items.includes("MORE");
        // (FireRed's windows: the two-page menu at the top right, the others lower down.)
        const [left, top] = pages ? [17, page ? 2 : 0] : [19, m.items.length >= 4 ? 5 : 6];
        const i = await env.multichoice(env.fill(question[question.length - 1]), left, top, m.labels);
        const pick = i < 0 ? "EXIT" : m.items[i];
        if (pick === "MORE") { page = 1 - page; continue; }
        if (pick === "EXIT") { Screen.say(""); if (onCancel) await onCancel(); return; }
        if (!Sevii.built(pick)) {
          await env.say(["Sorry, the Seagallop doesn't sail\nto " + Sevii.port(pick).label + " yet.", "(" + Sevii.port(pick).label + " isn't in\nthis game yet.)"]);
          return;
        }
        await setSail(from, pick);
        return;
      }
    }

    // The harbor sailors on One, Two and Three Island.
    async function harborSailor(from) {
      const q = env.T("Text_WhereDoYouWantToSail");
      await env.say(q.slice(0, -1));
      await seagallopMenu(from, q);
    }

    // Vermilion's dock (VermilionCity_EventScript_CheckSeagallopPresent): once
    // the S.S. Anne's gone, the Seagallop sails from here for whoever has a pass.
    async function vermilionSeagallop(walkBack) {
      const f = env.player.flags, scene = f.celioScene || 0;
      const back = async () => { if (walkBack) await Overworld.act([{ who: "player", moves: ["walk_up"] }]); };
      if (scene < 1) { await env.say(env.T("VermilionCity_Text_TheShipSetSail")); await back(); return; }
      const q = env.T(scene >= 5 ? "VermilionCity_Text_BoardSeagallopRainbowPass" : "VermilionCity_Text_BoardSeagallopTriPass");
      // With the Rainbow Pass, Stadium Island and Hoenn too; and with the Old Sea Map, as FireRed's sailor is with
      // an event ticket (VermilionCity_EventScript_HasMysticTicket): the first time, he's amazed; then Faraway
      // Island, on Seagallop 10.
      if (scene >= 5) {
        const oldMap = Player.itemCount(env.player, "old-sea-map");
        if (oldMap && !f.shownOldSeaMap) {
          f.shownOldSeaMap = true;
          await env.say(["Oh! That's an Old Sea Map!\nNow that is rare.", "We'll be happy to take you to\nFaraway Island anytime."]);
        }
        const dests = ["Sevii Islands", "Stadium Island"].concat(oldMap ? ["Faraway Island"] : [], ["Hoenn", "Exit"]);
        const i = await env.multichoice(env.T("VermilionCity_Text_BoardSeagallopFerry")[0], 17, dests.length >= 5 ? 2 : dests.length === 4 ? 4 : 6, dests);
        const pick = i < 0 ? "Exit" : dests[i];
        if (pick === "Sevii Islands") { await env.say(q.slice(0, -1)); await seagallopMenu("VERMILION_CITY", q, back); return; }
        if (pick === "Stadium Island") { await env.say(["All aboard SEAGALLOP HI-SPEED 8!"]); await ferry({ map: "StadiumIsland", x: 17, y: 25, facing: "up" }, true); return; }
        if (pick === "Faraway Island") {
          await env.say(env.T("VermilionCity_Text_Seagallop10Departing"));
          await ferry({ map: "FarawayIsland_Entrance", x: 13, y: 38, facing: "up" }, false);
          return;
        }
        if (pick === "Hoenn") { await env.sailToHoenn(); return; }
        Screen.say(""); await back(); return;
      }
      await env.say(q.slice(0, -1));
      await seagallopMenu("VERMILION_CITY", q, back);
    }

    // The Seagallop's crossing (as setSail's) to `to` ({ map, x, y, facing }).
    async function ferry(to, eastbound) {
      Screen.say("");
      env.clearMenu();
      await env.sleep(333);
      await Overworld.fadeToBlack();
      const o = env.$("#overlay");
      await Seagallop.ride(o, { eastbound, sfx: env.sfx, fadeMusic: () => env.music(null) }).catch((e) => console.error(e));
      o.classList.add("hidden");
      env.sfx("se_exit");
      Overworld.setAvatar("walk");
      await Overworld.teleport(to);
      env.music((window.WORLD_MAPS[to.map] || {}).music);
      await env.persist();
    }

    // Bill and the boat at Cinnabar (CinnabarIsland_EventScript_BillScene):
    // coming out of the Gym he's right there and walks up; coming out of the
    // Pokémon Center he comes over from the east (FLAG_TEMP_2); anywhere else
    // he walks over to you.
    async function cinnabarBill() {
      const f = env.player.flags, C = (k) => env.T("CinnabarIsland_Text_" + k), Cm = (k) => env.M("CinnabarIsland_Movement_" + k);
      let at = Overworld.position();
      if (at.x === 20 && at.y === 4) { await Overworld.act([{ who: "player", moves: ["walk_down"] }]); at = Overworld.position(); }
      const gym = at.x === 20 && at.y === 5, center = at.x === 14 && at.y === 12;
      if (center) Overworld.addObject(env.CINNABAR_BILL, { x: 18, y: 12, facing: "up" });
      await Overworld.act([{ who: env.CINNABAR_BILL, moves: gym ? env.M("Common_Movement_WalkInPlaceFasterUp") : ["face_player"] }]);
      env.sfx("se_pin");
      await Overworld.act([{ who: env.CINNABAR_BILL, moves: ["emote_exclamation_mark", "delay_16", "delay_16", "delay_16"] }]);
      if (gym) await Overworld.act([{ who: env.CINNABAR_BILL, moves: Cm("BillApproachPlayer1") }]);
      else if (center) {
        await Overworld.act([{ who: env.CINNABAR_BILL, moves: env.M("Common_Movement_WalkInPlaceFasterLeft") }]);
        await Overworld.act([{ who: env.CINNABAR_BILL, moves: Cm("BillApproachPlayer2") }]);
        await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
      } else {
        // (Next to you, whichever side he can get to.)
        const spots = [[1, 0, "left"], [-1, 0, "right"], [0, 1, "up"], [0, -1, "down"]].map(([dx, dy, face]) => ({ x: at.x + dx, y: at.y + dy, face }));
        for (const s of spots) { const path = env.pathTo(env.CINNABAR_BILL, s); if (path) { await env.walkTo(env.CINNABAR_BILL, s, s.face); break; } }
        await Overworld.act([{ who: "player", moves: ["face_" + (() => { const b = Overworld.personPosition(env.CINNABAR_BILL) || at; return b.x > at.x ? "right" : b.x < at.x ? "left" : b.y > at.y ? "down" : "up"; })()] }]);
      }
      await env.say(C("HeyIfItIsntPlayer"));
      const q = C("ComeWithMeToOneIsland");
      await env.say(q.slice(0, -1));
      if (await env.confirm(env.fill(q[q.length - 1]))) {
        await env.say(C("AllRightLetsGo"));
        Screen.say("");
        await cinnabarSailWithBill(gym ? "gym" : center ? "shore" : "walk");
        return;
      }
      await env.say(C("IllBeWaitingInPokeCenter"));
      Screen.say("");
      if (gym) await Overworld.act([{ who: env.CINNABAR_BILL, moves: Cm("BillExitToPokeCenter").concat(["set_invisible"]) }]);
      else if (center) {
        await Overworld.act([{ who: "player", moves: Cm("PlayerWatchBillExit") }, { who: env.CINNABAR_BILL, moves: Cm("BillApproachDoor") }]);
        env.sfx("se_door");
        await Overworld.act([{ who: env.CINNABAR_BILL, moves: Cm("BillReEnterPokeCenter") }]);
      } else {
        await env.walkTo(env.CINNABAR_BILL, { x: 14, y: 12 }, "up");
        env.sfx("se_door");
        await Overworld.act([{ who: env.CINNABAR_BILL, moves: ["walk_up", "set_invisible"] }]);
      }
      Overworld.removeObject(env.CINNABAR_BILL);
      f.cinnabarScene = 2;
      f.cinnabarBillInCenter = true;   // (FLAG_HIDE_CINNABAR_POKECENTER_BILL cleared)
    }

    // CinnabarIsland_EventScript_SailToOneIsland: the Seagallop pulls in, and
    // you board it with Bill. `how`: "gym" (outside the Gym), "shore" (out of
    // the Pokémon Center, along the shore), or "walk" (from anywhere else).
    async function cinnabarSailWithBill(how) {
      const f = env.player.flags, C = (k) => env.T("CinnabarIsland_Text_" + k), Cm = (k) => env.M("CinnabarIsland_Movement_" + k);
      if (how === "shore") await Overworld.act([{ who: env.CINNABAR_BILL, moves: Cm("ApproachShore") }, { who: "player", moves: Cm("ApproachShore") }]);
      if (how === "walk") {
        await env.walkTo(env.CINNABAR_BILL, { x: 21, y: 8 }, "right");
        await env.walkTo("player", { x: 20, y: 8 }, "right");
      }
      const row = how === "shore" ? 12 : 8;
      Overworld.addObject(env.CINNABAR_SEAGALLOP, { x: 30, y: row, facing: "left" });
      await Overworld.act(how === "gym" ? [{ who: env.CINNABAR_BILL, moves: Cm("BillFaceBoat") }, { who: env.CINNABAR_SEAGALLOP, moves: Cm("BoatArrive") }]
        : [{ who: env.CINNABAR_SEAGALLOP, moves: Cm("BoatArrive") }]);
      await env.say(C("MyPalsBoatArrived"));
      Screen.say("");
      if (how === "gym") await Overworld.act([{ who: env.CINNABAR_BILL, moves: Cm("BillBoardBoat") }, { who: "player", moves: Cm("PlayerBoardBoat") }]);
      else if (how === "shore") await Overworld.act([{ who: env.CINNABAR_BILL, moves: Cm("BillBoardBoatFromShore") }, { who: "player", moves: Cm("PlayerBoardBoatFromShore") }]);
      else await Overworld.act([{ who: env.CINNABAR_BILL, moves: ["walk_right", "delay_4", "set_invisible"] }, { who: "player", moves: ["walk_right", "delay_4", "walk_right", "delay_4", "set_invisible"] }]);
      f.cinnabarScene = 2;
      delete f.cinnabarExitWithBill;
      delete f.cinnabarBillInCenter;
      Overworld.removeObject(env.CINNABAR_BILL);
      await env.sleep(667);
      f.oneHarborScene = 1;
      await setSail("CINNABAR_ISLAND", "ONE_ISLAND", false);
    }

    // Bill in Cinnabar's Pokémon Center (..._PokemonCenter_1F_EventScript_Bill):
    // ready? Then out you go together, along the shore to the boat.
    async function cinnabarCenterBill(person) {
      const f = env.player.flags, P = (k) => env.T("CinnabarIsland_PokemonCenter_1F_Text_" + k), Pm = (k) => env.M("CinnabarIsland_PokemonCenter_1F_Movement_" + k);
      const q = P("ReadyToSailToOneIsland");
      await env.say(q.slice(0, -1));
      if (!(await env.confirm(env.fill(q[q.length - 1])))) { await env.say(P("OhNotDoneYet")); return; }
      await env.say(P("LetsGo"));
      Screen.say("");
      env.music("mus_follow_me");
      await env.sleep(333);
      const facing = Overworld.position().facing, id = "LOCALID_CINNABAR_POKEMON_CENTER_BILL";
      // (By the way you face him: from below, from his left or right.)
      const moves = facing === "left" ? [Pm("BillExit"), Pm("PlayerExitWest")] : facing === "right" ? [Pm("BillExitEast"), Pm("PlayerExitEast")] : [Pm("BillExit"), Pm("PlayerExitSouth")];
      await Overworld.act([{ who: id, moves: moves[0] }, { who: "player", moves: moves[1] }]);
      Overworld.removeObject(id);
      delete f.cinnabarBillInCenter;
      f.cinnabarExitWithBill = true;   // VAR_MAP_SCENE_CINNABAR_ISLAND_2, 1
      env.sfx("se_exit");
      await Overworld.teleport({ map: "CinnabarIsland", x: 14, y: 12, facing: "down" });
      env.music("mus_follow_me");
      Overworld.addObject(env.CINNABAR_BILL, { x: 15, y: 12, facing: "left" });
      await env.sleep(333);
      await cinnabarSailWithBill("shore");
    }

    // Back from One Island (CinnabarIsland_EventScript_ReturnFromSeviiIslands):
    // Bill says goodbye and goes home; Lostelle's back home on Three Island.
    async function cinnabarBillReturns() {
      const f = env.player.flags;
      Overworld.addObject(env.CINNABAR_BILL, { x: 21, y: 8, facing: "up" });
      await env.say(env.T("CinnabarIsland_Text_IfYouHaveTriPassYouCanGoAgain"));
      Screen.say("");
      await Overworld.act([{ who: env.CINNABAR_BILL, moves: env.M("CinnabarIsland_Movement_BillExit").concat(["set_invisible"]) }]);
      Overworld.removeObject(env.CINNABAR_BILL);
      f.cinnabarScene = 4;
    }

    async function oneIslandArrival() {
      const f = env.player.flags;
      await Overworld.act([{ who: "player", moves: env.M("OneIsland_Harbor_Movement_PlayerExitHarbor") }]);
      f.oneHarborScene = 2;
      env.sfx("se_exit");
      await Overworld.teleport({ map: "OneIsland", x: 12, y: 18, facing: "up" });
      await billToCelio();
    }

    // OneIsland_EventScript_EnterOneIslandFirstTime: out of the harbor, Bill
    // walks you up to the Pokémon Center.
    async function billToCelio() {
      const f = env.player.flags, O = (k) => env.M("OneIsland_Movement_" + k);
      await Overworld.act([{ who: "player", moves: O("PlayerExitHarbor") }]);
      await env.say(env.T("OneIsland_Text_BillLetsGoSeeCelio"));
      Screen.say("");
      await Overworld.act([{ who: env.ONE_BILL, moves: O("BillWalkToPokeCenter") }, { who: "player", moves: O("PlayerWalkToPokeCenter") }]);
      env.sfx("se_door");
      await Overworld.act([{ who: env.ONE_BILL, moves: O("BillEnterPokeCenter") }, { who: "player", moves: O("PlayerEnterPokeCenter") }]);
      Overworld.removeObject(env.ONE_BILL);
      f.oneHarborScene = 3;
      await Overworld.teleport({ map: "OneIsland_PokemonCenter_1F", x: 9, y: 9, facing: "up" });
      env.player.flags.lastCenter = "OneIsland_PokemonCenter_1F";   // (setrespawn HEAL_LOCATION_ONE_ISLAND)
      await meetCelio();
    }

    async function meetCelio() {
      const f = env.player.flags, X = (k) => env.T("OneIsland_PokemonCenter_1F_Text_" + k), Xm = (k) => env.M("OneIsland_PokemonCenter_1F_Movement_" + k);
      const turn = (who, dir) => Overworld.act([{ who, moves: env.M("Common_Movement_WalkInPlaceFaster" + dir) }]);
      await Overworld.act([{ who: "player", moves: Xm("PlayerWalkToCelio") }, { who: env.PC_BILL, moves: Xm("BillWalkToCelio") }]);
      await env.say(X("BillHeyThereCelio"));
      await turn("player", "Right");
      env.sfx("se_pin");
      await Overworld.act([{ who: env.CELIO, moves: ["emote_exclamation_mark"] }]);
      await turn(env.CELIO, "Left");
      await env.sleep(800);
      await env.say(X("CelioCantBelieveYouCameOut"));
      await env.say(X("BillHowsYourResearchComing"));
      await Overworld.act([{ who: env.PC_BILL, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }, { who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterUp") }]);
      await env.say(X("ThisIsMyBuddyCelio"));
      await turn(env.PC_BILL, "Right");
      await turn("player", "Right");
      await env.say(X(f.gameClear ? "PlayerIsReigningPokemonChamp" : "PlayerIsRisingPokemonChamp"));
      await turn(env.CELIO, "Down");
      await env.say(X("CelioThatsReallyImpressive"));
      await env.say(X("BillBringMeUpToSpeed"));
      await turn(env.CELIO, "Left");
      await env.say(X("CelioPCsCantLinkWithYours"));
      Screen.say("");
      await turn(env.PC_BILL, "Up");
      await env.say(X("BillLetMeHelpYou"));
      await turn(env.PC_BILL, "Down");
      await turn("player", "Up");
      await env.say(X("CanYouDeliverThisMeteoritePlayer"));
      Player.addItem(env.player, "meteorite");
      await env.sayWithJingle("mus_obtain_key_item", X("AcceptedMeteoriteFromBill"));
      await turn(env.CELIO, "Down");
      await env.say(X("CelioPleaseTakeThis"));
      Player.addItem(env.player, "tri-pass");
      await env.sayWithJingle("mus_obtain_key_item", X("ObtainedTriPass"));
      await env.say(X("PassLetsYouTravelBetweenIslands"));
      // The Town Map's page for the islands (or the Town Map, if Daisy hasn't given you one).
      if (f.townMap) await env.sayWithJingle("mus_obtain_key_item", X("ReceivedExtraPageForTownMap"));
      else {
        Player.addItem(env.player, "town-map");
        f.townMap = true;
        await env.sayWithJingle("mus_obtain_key_item", X("ReceivedTownMap"));
      }
      f.seviiMap123 = true;
      await env.say(X("BillCatchYouLater"));
      Screen.say("");
      await turn(env.PC_BILL, "Up");
      await turn(env.CELIO, "Up");
      f.pcStorageDisabled = true;
      f.celioScene = 1;
    }

    // Celio (OneIsland_PokemonCenter_1F_EventScript_Celio): what he says as
    // the story goes on. With the National Pokédex (yours from the start here),
    // once Bill's taken you home (scene 3), he asks you to find a gem for his
    // Network Machine, and Team Rocket turns up on Mt. Ember; bring him the
    // Ruby and he trades your Tri-Pass for the Rainbow Pass and asks for the
    // Sapphire (the Dotted Hole on Six Island; Gideon takes it to the Rocket
    // Warehouse on Five Island, and gives it back once beaten).
    async function celio() {
      const f = env.player.flags, X = (k) => env.T("OneIsland_PokemonCenter_1F_Text_" + k), scene = f.celioScene || 0;
      if (scene >= 6 && !f.gotOldSeaMap) { await giveOldSeaMap(); return; }
      if (scene >= 7) {
        await env.say(X("CelioHearingRumorsAboutYou"));
        await env.say(X(["BillsFirstMonWasAbra", "BillsHometownInGoldenrod", "BillCantStomachMilk"][Math.floor(Math.random() * 3)]));
        return;
      }
      if (scene === 6) { await env.say(X("WishYouBestOfLuck")); return; }
      if (f.recoveredSapphire && Player.itemCount(env.player, "sapphire")) { await celioSapphire(); return; }
      if (scene === 5) { await env.say(X("PassLetYouGetToAllIslands")); return; }
      if (f.gotRuby && Player.itemCount(env.player, "ruby")) { await celioRuby(); return; }
      if (scene === 4) { await env.say(X("TryingToFindGem")); return; }
      // (FireRed asks once you have the National Pokédex, which comes after the
      // Hall of Fame; here you have it from the start, so: once you're Champion.
      // Until then only One, Two and Three Island can be reached: the Rainbow
      // Pass for the rest is his thanks for the Ruby.)
      if (Player.nationalDex(env.player) && env.player.flags.gameClear && scene >= 3) {
        await env.say(X("CelioCaughtMoreMonMaybeICanBeUseful"));
        await Overworld.act([{ who: env.CELIO, moves: env.M("Common_Movement_WalkInPlaceFasterUp") }]);
        await env.say(X("YoullBeTradingFromTrainersFarAway"));
        await Overworld.act([{ who: env.CELIO, moves: ["face_player"] }]);
        await env.say(X("NeedsSpecialGemstone"));
        f.mtEmberScene = 1;
        f.celioScene = 4;
        env.applyPatches("OneIsland_PokemonCenter_1F");
        return;
      }
      if (scene === 3) { await env.say(X("CelioImModifyingMyNetworkMachine")); return; }
      await env.say(X("SorryForBeingPoorHost"));
      Screen.say("");
      await Overworld.act([{ who: env.CELIO, moves: ["face_up"] }]);
    }

    // The Ruby into the machine (..._EventScript_GiveCelioRuby), and one more
    // favour: the Rainbow Pass for your Tri-Pass, and the Town Map's pages for
    // Four to Seven Island.
    async function celioRuby() {
      const f = env.player.flags, X = (k) => env.T("OneIsland_PokemonCenter_1F_Text_" + k);
      await env.say(X("OhThats"));
      await env.sayWithJingle("mus_obtain_tmhm", X("HandedRubyToCelio"));
      Screen.say("");
      await Overworld.act([{ who: env.CELIO, moves: env.M("OneIsland_PokemonCenter_1F_Movement_CelioPutGemInMachine") }]);
      env.sfx("se_select");
      f.celioRubyIn = true;
      env.applyPatches("OneIsland_PokemonCenter_1F");
      await env.sleep(500);
      await Overworld.act([{ who: env.CELIO, moves: ["face_player"] }]);
      const q = X("MayIAskOneMoreFavor");
      await env.say(q.slice(0, -1));
      if (!(await env.confirm(env.fill(q[q.length - 1])))) {
        for (;;) {
          const p = X("PleaseINeedYourHelp");
          await env.say(p.slice(0, -1));
          if (await env.confirm(env.fill(p[p.length - 1]))) break;
        }
      }
      await env.say(X("AnotherGemstoneInSeviiIslands"));
      Player.removeItem(env.player, "ruby");
      Player.removeItem(env.player, "tri-pass");
      f.celioScene = 5;
      Player.addItem(env.player, "rainbow-pass");
      f.seviiMap4567 = true;
      await env.sayWithJingle("mus_obtain_key_item", X("ReturnedTriPassForRainbowPass"));
      await env.sayWithJingle("mus_obtain_key_item", X("ObtainedExtraMapPage"));
      await env.say(X("PassLetYouGetToAllIslands"));
    }

    // The Sapphire (..._EventScript_GiveCelioSapphire): the hook for the rest
    // of the islands. Bring it back (flags.recoveredSapphire, and the item) and
    // the Network Machine links with Hoenn: FLAG_SYS_CAN_LINK_WITH_RS
    // (flags.canLinkWithRS, the League's rematch teams).
    async function celioSapphire() {
      const f = env.player.flags, X = (k) => env.T("OneIsland_PokemonCenter_1F_Text_" + k);
      await env.sayWithJingle("mus_obtain_tmhm", X("HandedSapphireToCelio"));
      Player.removeItem(env.player, "sapphire");
      await env.say(X("ThankYouGiveMeTime"));
      Screen.say("");
      await Overworld.act([{ who: env.CELIO, moves: env.M("OneIsland_PokemonCenter_1F_Movement_CelioPutGemInMachine") }]);
      env.sfx("se_select");
      f.celioSapphireIn = true;
      env.applyPatches("OneIsland_PokemonCenter_1F");
      await env.say(X("OkayThisIsGood"));
      Screen.say("");
      await env.sleep(1000);
      await Overworld.act([{ who: env.CELIO, moves: env.M("OneIsland_PokemonCenter_1F_Movement_CelioCheckMachine") }]);
      await env.sleep(500);
      await Overworld.act([{ who: env.CELIO, moves: env.M("OneIsland_PokemonCenter_1F_Movement_CelioCheckMachine") }]);
      await env.sleep(667);
      env.sfx("se_pc_on");
      f.canLinkWithRS = true;
      env.applyPatches("OneIsland_PokemonCenter_1F");
      await env.say(X("LinkedUpWithLanette"));
      await Overworld.act([{ who: env.CELIO, moves: ["face_player"] }]);
      await env.say(X("ManagedToLinkWithHoennThankYou"));
      f.celioScene = 6;
      await giveOldSeaMap();
    }

    // This game's: with Hoenn linked up, Celio gives you Bill's reward for
    // your help, Emerald's Old Sea Map (its island: Faraway Island, by Seagallop
    // from Vermilion). (Saves that linked up before this get it next time they talk.)
    async function giveOldSeaMap() {
      const f = env.player.flags;
      if (f.gotOldSeaMap) return;
      await env.say(["Oh, and {PLAYER}, Bill wanted me\nto give you this.", "It's a reward for all your help."]);
      Player.addItem(env.player, "old-sea-map");
      f.gotOldSeaMap = true;
      await env.sayWithJingle("mus_obtain_key_item", "{PLAYER} received the " + Bag.name("old-sea-map") + "!");
      await env.say(["It's an old sea chart. It shows an\nisland nobody's been to in a very\nlong time.",
        "The Seagallop sailors in Vermilion\nmight know how to get there."]);
    }

    // Bill, helping Celio (..._EventScript_Bill).
    async function oneIslandCenterBill() {
      const X = (k) => env.T("OneIsland_PokemonCenter_1F_Text_" + k);
      if (env.player.flags.seviiDetourDone) {
        await Overworld.act([{ who: env.PC_BILL, moves: ["face_player"] }]);
        await env.say(X("GotPCWorkingStrollAWhileMore"));
      } else await env.say(X("HmmHowAboutLikeThis"));
    }

    // Lostelle's back and the Meteorite delivered: walking in, Bill's done and
    // takes you back to Kanto (..._EventScript_LeaveOneIslandScene). `row`: 1-4,
    // which of the triggers (top to bottom).
    async function leaveOneIsland(row) {
      const f = env.player.flags, X = (k) => env.T("OneIsland_PokemonCenter_1F_Text_" + k), Xm = (k) => env.M("OneIsland_PokemonCenter_1F_Movement_" + k);
      const turn = (who, dir) => Overworld.act([{ who, moves: env.M("Common_Movement_WalkInPlaceFaster" + dir) }]);
      env.sfx("se_pin");
      await Overworld.act([{ who: env.PC_BILL, moves: ["emote_exclamation_mark"] }]);
      await env.say(X("BillOhHeyPlayer"));
      Screen.say("");
      await Overworld.act([{ who: "player", moves: Xm(["PlayerWalkToBillTop", "PlayerWalkToBillMidTop", "PlayerWalkToBillMidBottom", "PlayerWalkToBillBottom"][row - 1]) }]);
      await env.sleep(167);
      await env.say(X("BillWeGotItDone"));
      await turn("player", "Down");
      await env.say(X("CelioJobWentQuick"));
      await turn(env.PC_BILL, "Down");
      await turn(env.CELIO, "Up");
      await env.say(X("BillYouveLearnedALot"));
      await env.say(X("CelioOhReallyEhehe"));
      Screen.say("");
      await turn(env.PC_BILL, "Left");
      await env.sleep(167);
      await turn("player", "Right");
      await env.sleep(250);
      await env.say(X("BillWeShouldHeadBackToKanto"));
      Screen.say("");
      await turn(env.PC_BILL, "Down");
      await env.sleep(250);
      await turn(env.CELIO, "Left");
      await turn("player", "Down");
      await env.say(X("CelioPromiseIllShowYouAroundSometime"));
      Screen.say("");
      await env.sleep(417);
      await Overworld.act([{ who: "player", moves: Xm("PlayerExit") }, { who: env.PC_BILL, moves: Xm("BillExit") }]);
      env.sfx("se_exit");
      f.celioScene = 3;
      f.cinnabarScene = 3;
      await setSail("ONE_ISLAND", "CINNABAR_ISLAND", false);
    }

    // The Network Machine (..._EventScript_NetworkMachine).
    async function networkMachine() {
      const f = env.player.flags, X = (k) => env.T("OneIsland_PokemonCenter_1F_Text_" + k);
      await env.say(X(f.canLinkWithRS ? "MachineLinkedWithKantoAndHoenn" : f.seviiDetourDone ? "MachineLinkedWithKanto" : "MachineUnderAdjustment"));
    }

    // ---------- Two Island ----------

    // The shop (TwoIsland_EventScript_SetShopState): more for sale as Lostelle's
    // found, you become Champion, and Kanto links with Hoenn.
    function twoIslandShop() {
      const f = env.player.flags;
      if (f.canLinkWithRS) return !f.twoIslandShopIntro ? 1 : !f.twoIslandShop1 ? 2 : !f.twoIslandShop2 ? 3 : 4;
      if (f.gameClear) return !f.twoIslandShopIntro || !f.rescuedLostelle ? 1 : !f.twoIslandShop1 ? 2 : 3;
      if (f.rescuedLostelle) return !f.twoIslandShopIntro ? 1 : 2;
      return 1;
    }

    async function twoIslandClerk() {
      const f = env.player.flags, state = f.twoIslandShopState || twoIslandShop();
      const intro = { 1: ["twoIslandShopIntro", "WelcomeToShopMerchandiseLimited"], 2: ["twoIslandShop1", "AddedMerchandiseForLostelle"],
        3: ["twoIslandShop2", "HopeYouGiveItYourBest"], 4: ["twoIslandShop3", "BringingItemsFromDistantLands"] }[state];
      if (!f[intro[0]]) {
        f[intro[0]] = true;
        await env.say(env.T("TwoIsland_Text_" + intro[1]));
        await env.mart(env.TWO_ISLAND_STOCK[state]);
        return;
      }
      await env.mart(env.TWO_ISLAND_STOCK[state]);
    }

    async function gameCornerHelp() {
      const f = env.player.flags, J = (k) => env.T("TwoIsland_JoyfulGameCorner_Text_" + k), Jm = (k) => env.M("TwoIsland_JoyfulGameCorner_Movement_" + k);
      await Overworld.act([{ who: env.GC_DADDY, moves: Jm("DaddyPacing") }]);
      await env.say(J("WhereHasLostelleGottenTo"));
      Screen.say("");
      await Overworld.act([{ who: env.GC_DADDY, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      env.sfx("se_pin");
      await Overworld.act([{ who: env.GC_DADDY, moves: ["emote_exclamation_mark", "delay_16", "delay_16", "delay_16"] }]);
      await Overworld.act([{ who: env.GC_DADDY, moves: Jm("DaddyApproachPlayer") }]);
      await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
      await env.say(J("PleaseHelpFindLostelle"));
      Screen.say("");
      env.sfx("se_rs_door");
      await env.sleep(300);
      await Overworld.act([{ who: "player", moves: Jm("PlayerFaceDaddy") }]);
      env.music("mus_encounter_boy");
      Overworld.addObject(env.GC_BIKER, { x: 5, y: 8, facing: "up" });
      await Overworld.act([{ who: env.GC_BIKER, moves: Jm("BikerLookAround") }]);
      await env.say(J("IsThisOnlyThreeIsland"));
      await Overworld.act([{ who: env.GC_BIKER, moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
      await env.say(J("ThisIsTwoIslandMoveIt"));
      await env.say(J("TheseIslandsAreConfusing"));
      Screen.say("");
      await Overworld.act([{ who: env.GC_BIKER, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      env.sfx("se_exit");
      Overworld.removeObject(env.GC_BIKER);
      env.music((window.WORLD_MAPS.TwoIsland_JoyfulGameCorner || {}).music);
      await env.sleep(1000);
      await env.say(J("PunkScuffedUpMyFloor"));
      f.threeIslandScene = 2;
      f.gameCornerScene = 1;
    }

    async function gameCornerLostelleHome() {
      const f = env.player.flags, J = (k) => env.T("TwoIsland_JoyfulGameCorner_Text_" + k);
      await env.say(J("YouRescuedLostelle"));
      await env.say(J("LostelleItsOkayDaddy"), env.bigGuy());
      Screen.say("");
      await Overworld.act([{ who: env.GC_LOSTELLE, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      f.gameCornerScene = 3;
    }

    async function lostellesDaddy() {
      const f = env.player.flags, J = (k) => env.T("TwoIsland_JoyfulGameCorner_Text_" + k);
      if ((f.gameCornerScene || 0) >= 4) {
        // (The minigames are played over FireRed's wireless link.)
        await env.say(env.T("Text_WelcomeCanYouWait"));
        await env.say(env.T("Text_AdapterNotConnectedMinigame"));
        return;
      }
      if (f.gotMoonStoneFromDaddy) { await env.say(J("IllGetGameCornerRunning")); return; }
      if (f.gameCornerScene !== 3) { await env.say(J("PleaseGoToThreeIsland")); return; }
      if (!f.noRoomForMoonStone) {
        await env.say(J("ThisIsForMe"));
        f.celioScene = Math.max(f.celioScene || 0, 2);
        Player.removeItem(env.player, "meteorite");
        await env.sayWithJingle("mus_obtain_tmhm", J("HandedMeteoriteToLostellesDaddy"));
        await env.say(J("OhThisIsFromBill"));
      }
      Player.addItem(env.player, "moon-stone");
      f.gotMoonStoneFromDaddy = true;
      delete f.noRoomForMoonStone;
      await env.sayWithJingle("mus_obtain_item", J("ReceivedMoonStoneFromLostellesDaddy"));
    }

    // Cape Brink's tutor (TwoIsland_CapeBrink_House_EventScript_StarterTutor):
    // the ultimate move of a fully evolved starter you lead with that's as fond
    // of you as can be — Frenzy Plant, Blast Burn or Hydro Cannon. In FireRed
    // each once; here the first time free, then again and again for TUTOR_PRICE.
    async function capeBrinkTutor() {
      const f = env.player.flags, lead = env.player.party.find((r) => !r.egg);
      if (env.capeBrinkJustTaught) { await env.say(env.T("Text_MakeBestUseOfMove")); return; }
      const m = Sevii.capeBrinkMove(lead);
      if (!m && f.capeBrinkDone) { await env.say(env.T("Text_FeelRejuvenated")); return; }
      const species = lead ? Party.speciesName(lead.species) : "";
      await env.say(env.T("Text_UltimateMoveThatMon"), [species]);
      if (!m) { await env.say(env.T("Text_JustMistaken")); return; }
      const vars = [species, m.move], again = !!f[m.flag];
      await Overworld.act([{ who: "LOCALID_CAPE_BRINK_TUTOR", moves: ["jump_in_place_" + World.OPPOSITE[Overworld.position().facing]] }]);
      const q = env.T("Text_AllowMeToTeachMonUltimateMove");
      await env.say(q.slice(0, -1), vars);
      if (!(await env.confirm(env.fill(q[q.length - 1], vars)))) { await env.say(env.T("Text_YouRejectIt")); return; }
      if (Party.knowsMove(lead, m.move)) { await env.say(Party.displayName(lead) + " already knows " + m.move + "."); return; }
      if (again) {
        if (!(await env.confirm("It'll cost " + env.money(env.TUTOR_PRICE) + ". Is that okay?\n(You have " + env.money(env.player.money) + ".)"))) { await env.say(env.T("Text_YouRejectIt")); return; }
        if (env.player.money < env.TUTOR_PRICE) { await env.say("You don't have enough money."); return; }
      }
      await env.say(env.T("Text_LetMeConferUltimateMove"), vars);
      Screen.say("");
      await Overworld.fadeToBlack();
      await env.learnMove(lead, m.move);
      env.show("world");
      await Overworld.fadeFromBlack();
      if (!Party.knowsMove(lead, m.move)) { await env.say(env.T("Text_YouRejectIt")); return; }
      if (again) {
        Player.addMoney(env.player, -env.TUTOR_PRICE);
        await env.say(env.player.name + " paid " + env.money(env.TUTOR_PRICE) + ".");
        await env.say(env.T("Text_TaughtMove"));
        env.capeBrinkJustTaught = true;
        return;
      }
      f[m.flag] = true;
      if (Sevii.capeBrinkDone(f)) { await env.say(env.T("Text_PassedOnEverythingIKnow")); f.capeBrinkDone = true; return; }
      await env.say(env.T("Text_TaughtMove"));
      env.capeBrinkJustTaught = true;   // (FLAG_TEMP_2, until you leave)
    }

    async function moveManiac() {
      const H = (k) => env.T("TwoIsland_House_Text_" + k);
      if (!env.moveManiacMet) { await env.say(H("TeachMonMoveForMushroom")); env.moveManiacMet = true; }
      const big = Player.itemCount(env.player, "big-mushroom") >= 1, tiny = Player.itemCount(env.player, "tiny-mushroom") >= 2;
      if (!big && !tiny) { await env.say(H("NeedMushroomOrTwoToLearnMove")); return; }
      const q = H("WantMeToTeachMove");
      await env.say(q.slice(0, -1));
      if (!(await env.confirm(env.fill(q[q.length - 1])))) { await env.say(H("NeedMushroomOrTwoToLearnMove")); return; }
      for (;;) {
        await env.say(H("TutorWhichMon"));
        const r = await env.choosePartyFor("Choose a POKéMON.");
        env.show("world");
        if (!r) { await env.say(H("NeedMushroomOrTwoToLearnMove")); return; }
        if (r.egg) { await env.say(H("CantTeachAnEgg")); continue; }
        const moves = env.relearnable(r);
        if (!moves.length) { await env.say(H("NoMoveICanTeachThatMon")); continue; }
        await env.say(H("TeachWhichMove"));
        Screen.say("");
        env.clearMenu();
        const move = await MoveRelearner.open({
          name: Party.displayName(r), moves, known: r.moves.map((m) => m.name), frame: GameOptions.get().frame,
          forget: (m) => env.chooseMoveToForget(r, m),
          teach: (m, slot) => Party.teachMove(r, m, slot == null ? undefined : slot)
        });
        env.show("world");
        if (!move || !Party.knowsMove(r, move)) continue;
        let useBig = big && !tiny;
        if (big && tiny) {
          // (FireRed's MULTICHOICE_MUSHROOMS ignores B.)
          let i;
          do i = await env.multichoice(H("IllNeedMushroomOrTwo")[0], 0, 0, ["Tinymushroom", "Big Mushroom"]); while (i < 0);
          Screen.say("");
          useBig = i === 1;
        }
        if (useBig) { Player.removeItem(env.player, "big-mushroom"); await env.say(H("HandedOverOneBigMushroom")); }
        else { Player.removeItem(env.player, "tiny-mushroom", 2); await env.say(H("HandedOverTwoTinyMushrooms")); }
        await env.say(H("NeedMushroomOrTwoToLearnMove"));
        return;
      }
    }

    // `who`: 0 the first islander, 1 the second, 2 a biker (VAR_TEMP_1).
    async function bikerArgument(who) {
      const I = (k) => env.T("ThreeIsland_Text_" + k), Im = (k) => env.M("ThreeIsland_Movement_" + k);
      const face = (dir) => Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFaster" + dir) }]);
      const atRight = Overworld.position().x >= 9;
      if (who !== 0) await face("Left");
      await Overworld.act([{ who: env.TB.anti1, moves: Im("SpeakRight") }]);
      await env.say(I("GoBackToKanto"));
      await face(who === 2 ? (atRight ? "Up" : "Right") : "Right");
      await Overworld.act([{ who: env.TB.b1, moves: Im("SpeakLeft") }]);
      await env.say(I("BossIsOnHisWay"));
      await face(who === 2 ? (atRight ? "Left" : "Up") : "Up");
      await Overworld.act([{ who: env.TB.anti2, moves: Im("SpeakRight") }]);
      await env.say(I("GetOffIslandNow"));
      await face(who === 2 ? (atRight ? "Up" : "Right") : "Right");
      await Overworld.act([{ who: env.TB.b3, moves: Im("SpeakLeft") }]);
      await env.say(I("WhosGonnaMakeMe"));
    }

    async function antiBiker(n) {
      const f = env.player.flags, I = (k) => env.T("ThreeIsland_Text_" + k);
      if (n === 1) {
        if (f.gotFullRestoreFromDefender) { await Overworld.act([{ who: env.TB.anti1, moves: ["face_player"] }]); await env.say(I("YouveGotImpressiveMons")); return; }
        if (f.threeIslandScene === 4) {
          await Overworld.act([{ who: env.TB.anti1, moves: ["face_player"] }]);
          await env.say(I("ThankYouOhYourMonGotHurt"));
          Player.addItem(env.player, "full-restore");
          f.gotFullRestoreFromDefender = true;
          await env.sayWithJingle("mus_obtain_item", I("GivenFullRestore"));
          await env.say(I("YouveGotImpressiveMons"));
          return;
        }
        await bikerArgument(0);
        return;
      }
      if (f.threeIslandScene === 4) { await Overworld.act([{ who: env.TB.anti2, moves: ["face_player"] }]); await env.say(I("LostelleWentOffTowardsBondBridge")); return; }
      await bikerArgument(1);
    }

    // Paxton arrives (ThreeIsland_EventScript_BikerBossIntroTrigger).
    async function bikerBossIntro() {
      const I = (k) => env.T("ThreeIsland_Text_" + k), Im = (k) => env.M("ThreeIsland_Movement_" + k);
      const speak = async (who, dir, text) => { await Overworld.act([{ who, moves: Im("Speak" + dir) }]); await env.say(I(text)); };
      await speak(env.TB.anti1, "Right", "AreYouBossGoBackToKanto");
      await speak(env.TB.paxton, "Left", "JustGotHerePal");
      await speak(env.TB.anti1, "Right", "FollowersRaisingHavoc");
      await speak(env.TB.paxton, "Left", "OughtToBeThankingUs");
      await speak(env.TB.anti1, "Right", "YouCowardsToughInPack");
      env.player.flags.threeIslandScene = 3;
    }

    // The gang takes you on (ThreeIsland_EventScript_BattleBikersScene). `col`:
    // 0-4, which trigger (left to right).
    async function bikerBattles(col) {
      const f = env.player.flags, I = (k) => env.T("ThreeIsland_Text_" + k), Im = (k) => env.M("ThreeIsland_Movement_" + k);
      const fight = async (id, who, intro, defeat, post, after) => {
        env.music("mus_encounter_boy");
        if (intro) await env.say(I(intro));
        if (!env.canBattle()) return false;
        const data = window.WORLD_TRAINERS[id];
        const outcome = await env.battle("trainer", { foe: { name: data.className + " " + data.name, team: env.trainerTeam(id), pic: data.pic },
          defeatText: I(defeat), trainerId: id, prizeClass: data.className });
        if (outcome !== "won") return false;
        env.show("world");
        await Overworld.resume();
        if (after) await Overworld.act(after);
        await env.say(I(post));
        Screen.say("");
        return true;
      };
      await Overworld.act([{ who: env.TB.b1, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      env.sfx("se_pin");
      await Overworld.act([{ who: env.TB.b1, moves: ["emote_exclamation_mark", "delay_16", "delay_16", "delay_16"] }]);
      await Overworld.act([{ who: env.TB.b1, moves: Im("BikerApproach") }]);
      env.music("mus_encounter_boy");
      const q = I("WannaMakeSomethingOfYourStaring");
      await env.say(q.slice(0, -1));
      if (!(await env.confirm(env.fill(q[q.length - 1])))) {
        await env.say(I("ThatsSmart"));
        Screen.say("");
        await Overworld.act([{ who: "player", moves: Im("PlayerLeaveBikers") }]);
        await Overworld.act([{ who: env.TB.b1, moves: Im("Biker1ReturnToPack") }]);
        env.music((window.WORLD_MAPS.ThreeIsland || {}).music);
        return;
      }
      if (!(await fight("TRAINER_BIKER_GOON", env.TB.b1, "Biker1Intro", "Biker1Defeat", "Biker1PostBattle", [{ who: env.TB.b1, moves: Im("BikerSpeak") }]))) return;
      await Overworld.act([{ who: env.TB.b2, moves: Im("BikerApproach") }]);
      if (!(await fight("TRAINER_BIKER_GOON_2", env.TB.b2, "Biker2Intro", "Biker2Defeat", "Biker2PostBattle", [{ who: env.TB.b2, moves: Im("BikerSpeak") }]))) return;
      await Overworld.act([{ who: env.TB.b3, moves: Im("BikerApproach") }]);
      if (!(await fight("TRAINER_BIKER_GOON_3", env.TB.b3, "Biker3Intro", "Biker3Defeat", "Biker3PostBattle",
        [{ who: env.TB.b3, moves: env.M("Common_Movement_WalkInPlaceFasterLeft") }, { who: env.TB.b4, moves: env.M("Common_Movement_WalkInPlaceFasterDown") },
          { who: env.TB.b5, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]))) return;
      await env.sleep(750);
      const approach = ["Left", "MidLeft", "Mid", "MidRight", "Right"][col];
      const tracks = [{ who: env.TB.b3, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }, { who: env.TB.paxton, moves: Im("PaxtonApproach" + approach) }];
      if (col >= 2) tracks.push({ who: "player", moves: Im("PlayerFacePaxton") });
      await Overworld.act(tracks);
      if (!(await fight("TRAINER_CUE_BALL_PAXTON", env.TB.paxton, "PaxtonIntro", "PaxtonDefeat", "PaxtonPostBattle"))) return;
      await Overworld.fadeToBlack();
      for (const id of [env.TB.paxton, env.TB.b1, env.TB.b2, env.TB.b3, env.TB.b4, env.TB.b5, env.TB.b6]) Overworld.removeObject(id);
      f.threeIslandScene = 4;
      Overworld.refreshPeople();
      await Overworld.fadeFromBlack();
      env.music((window.WORLD_MAPS.ThreeIsland || {}).music);
    }

    // Lostelle in Berry Forest (ThreeIsland_BerryForest_EventScript_Lostelle):
    // a wild Hypno (Lv. 30) comes for her; then she gives you an Iapapa Berry
    // and you take her home to the Joyful Game Corner.
    async function berryForestLostelle(person) {
      const f = env.player.flags, B = (k) => env.T("ThreeIsland_BerryForest_Text_" + k), L = "LOCALID_BERRY_FOREST_LOSTELLE";
      await env.say(B("HelpScaryPokemon"));
      env.sfx("se_pin");
      await Overworld.act([{ who: L, moves: ["emote_exclamation_mark"] }]);
      await Overworld.act([{ who: L, moves: env.M("ThreeIsland_BerryForest_Movement_LostelleLookAround") }]);
      await env.say(B("HereItComesAgain"));
      if (!env.canBattle()) return;
      env.cry("Hypno");
      await env.sleep(900);
      const outcome = await env.battle("wild", { foe: { name: "Wild", team: [Party.create("Hypno", 30)] } });
      if (outcome === "lost") return;
      env.show("world");
      await Overworld.resume();
      await Overworld.act([{ who: L, moves: ["face_player"] }]);
      await env.say(B("ThankYouHaveThis"));
      Player.addItem(env.player, "iapapa-berry");
      await env.sayWithJingle("mus_obtain_item", "{PLAYER} received an " + Bag.name("iapapa-berry") + "!");
      await env.say(B("LetsGoHome"), env.bigGuy());
      Screen.say("");
      f.rescuedLostelle = true;
      f.gameCornerScene = 2;
      env.sfx("se_exit");
      await Overworld.teleport({ map: "TwoIsland_JoyfulGameCorner", x: 6, y: 6, facing: "up" });
      await gameCornerLostelleHome();
    }

    async function emberPassword() {
      const E = (k) => env.T("MtEmber_Exterior_Text_" + k);
      await env.say(E("PunchedThroughAtLast"));
      const q = E("WhatsPasswordAgain");
      await env.say(q.slice(0, -1));
      env.sfx("se_pin");
      await Overworld.act([{ who: "LOCALID_MT_EMBER_GRUNT2", moves: ["emote_question_mark"] }]);
      await env.say(q.slice(-1));
      await env.say(E("FirstPasswordGoldeen"));
      await Overworld.act([{ who: "LOCALID_MT_EMBER_GRUNT1", moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      env.sfx("se_pin");
      await Overworld.act([{ who: "LOCALID_MT_EMBER_GRUNT1", moves: ["emote_exclamation_mark", "delay_16", "delay_16", "delay_16"] }]);
      await Overworld.act([{ who: "LOCALID_MT_EMBER_GRUNT2", moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      await env.say(E("SnoopsBeenListeningIn"));
      env.player.flags.mtEmberScene = 2;
    }

    async function emberGrunt(n) {
      const f = env.player.flags, E = (k) => env.T("MtEmber_Exterior_Text_" + k), id = env.EMBER_GRUNTS[n - 1], who = "LOCALID_MT_EMBER_GRUNT" + n;
      if (f[id]) { await env.say(E("Grunt" + n + "PostBattle")); return; }
      if (f.celioScene !== 4) {
        if (n === 1) { await env.say(E("WellTryDiggingHere")); return; }
        await env.say(E("YoureInTheWayGetLost"));
        Screen.say("");
        await Overworld.act([{ who, moves: [f.mtEmberScene === 2 ? "face_down" : "face_left"] }]);
        return;
      }
      await Overworld.act([{ who, moves: ["face_player"] }]);
      env.music("mus_encounter_rocket");
      await env.say(E("Grunt" + n + "Intro"));
      if (!env.canBattle()) return;
      const data = window.WORLD_TRAINERS[id];
      const outcome = await env.battle("trainer", { foe: { name: data.className + " " + data.name, team: env.trainerTeam(id), pic: data.pic },
        defeatText: E("Grunt" + n + "Defeat"), trainerId: id, prizeClass: data.className });
      if (outcome !== "won") return;
      env.show("world");
      await Overworld.resume();
      await env.say(E("Grunt" + n + "PostBattle"));
      if (!env.EMBER_GRUNTS.every((t) => f[t])) return;
      await env.say(E("WellRegroupDontStepInsideThere"));
      Screen.say("");
      await Overworld.fadeToBlack();
      Overworld.removeObject("LOCALID_MT_EMBER_GRUNT1");
      Overworld.removeObject("LOCALID_MT_EMBER_GRUNT2");
      await Overworld.fadeFromBlack();
    }

    // The Ember Spa's hot spring (OneIsland_KindleRoad_EmberSpa_EventScript_SpaHeal):
    // stepping in heals your Pokémon, once each visit.
    async function emberSpa() {
      await Overworld.fadeToBlack();
      env.player.party.forEach(Party.heal);
      await Overworld.fadeFromBlack();
      await env.say(env.T("OneIsland_KindleRoad_EmberSpa_Text_WaterExquisiteFullyRefreshed"));
      env.tempFlags.add("OneIsland_KindleRoad_EmberSpa:spa");
    }

    // The islands' ON_TRANSITION scripts, arriving on map `m`.
    function seviiTransition(m) {
      const f = env.player.flags;
      // (Saves from before the islands were built, Blaine already beaten: Bill's waiting.)
      if (m === "CinnabarIsland" && f.TRAINER_LEADER_BLAINE && !f.cinnabarScene) f.cinnabarScene = 1;
      // Three Isle Port: the trip's done, and the PCs work again
      // (ThreeIsland_Port_OnTransition: FLAG_SEVII_DETOUR_FINISHED).
      if (m === "ThreeIsland_Port") { f.seviiDetourDone = true; delete f.pcStorageDisabled; }
      // Two Island's shop (TwoIsland_EventScript_SetShopState).
      if (m === "TwoIsland") { f.twoIslandShopState = twoIslandShop(); f.twoIslandShopMax = Math.max(f.twoIslandShopMax || 1, f.twoIslandShopState); }
      // Lostelle's dad back at the counter, the games on (SetLostelleReturnedPos).
      if (m === "TwoIsland_JoyfulGameCorner" && f.gotMoonStoneFromDaddy) f.gameCornerScene = 4;
      // Celio, his work done (OneIsland_PokemonCenter_1F_EventScript_SetCelioQuestDone).
      if (m === "OneIsland_PokemonCenter_1F" && f.celioScene === 6) f.celioScene = 7;
      // An Escape Rope in Berry Forest takes you to Bond Bridge (setescapewarp).
      if (m === "ThreeIsland_BerryForest") f.escapeWarp = { map: "ThreeIsland_BondBridge", x: 12, y: 6 };
      // ... in Pattern Bush, out to Green Path by the way you came in
      // (SixIsland_PatternBush_OnTransition: the east half's exit or the west's).
      if (m === "SixIsland_PatternBush") {
        const at = Overworld.position();
        f.escapeWarp = at && at.map === m && at.x <= 49 ? { map: "SixIsland_GreenPath", x: 45, y: 10 } : { map: "SixIsland_GreenPath", x: 64, y: 10 };
      }
      // Outside Trainer Tower the challenge is over (SevenIsland_TrainerTower_OnTransition).
      if (m === "SevenIsland_TrainerTower") f.towerScene = 0;
      if (m === "Route40_BattleFrontierGatehouse") f.battleTowerScene = 0;   // (the Battle Tower's counter asks again)
    }

    // Walking about Cinnabar while Bill's waiting there: he comes over.
    function cinnabarBillStep() {
      return env.player.location.map === "CinnabarIsland" && env.player.flags.cinnabarScene === 1
        ? { type: "trigger", trigger: { script: "enter:CinnabarIsland" }, map: "CinnabarIsland" } : null;
    }

    // ---------- The Sevii Islands: Four Island ----------
    //
    // Gary's here the first time you come (FourIsland_EventScript_RivalScene):
    // he's got his Pokémon Egg from the Day-Care and is off again.
    async function fourIslandRival() {
      const R = "LOCALID_FOUR_ISLAND_RIVAL", Fm = (k) => env.M("FourIsland_Movement_" + k);
      await Overworld.act([{ who: R, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      env.music("mus_encounter_rival");
      await Overworld.act([{ who: R, moves: ["emote_exclamation_mark", "delay_16", "delay_16", "delay_16"] }]);
      await env.sleep(417);
      await Overworld.act([{ who: R, moves: Fm("RivalApproach") }]);
      await env.say(env.T("FourIsland_Text_RivalAlreadyGotEggBeSmellingYa"));
      Screen.say("");
      await Overworld.act([{ who: "player", moves: Fm("PlayerWatchRivalExit") }, { who: R, moves: Fm("RivalExit") }]);
      env.music((window.WORLD_MAPS.FourIsland || {}).music);
      env.sfx("se_exit");
      await env.sleep(583);
      Overworld.removeObject(R);
      env.player.flags.fourIslandScene = 1;
    }

    async function yesNo(pages, vars) {
      await env.say(pages.slice(0, -1), vars);
      return env.confirm(env.fill(pages[pages.length - 1], vars));
    }

    async function fourIslandDayCareLady(where) {
      const D = env.DAY_CARES[where || "four"];
      const f = env.player.flags, list = f[D.list] || (f[D.list] = []);
      if (f[D.eggs] && f[D.eggs].eggWaiting && list.length === 2) { await env.say(env.DC("HusbandWasLookingForYou")); return; }
      const comeAgain = () => env.say(env.DC("ComeAgain"));
      // FourIsland_PokemonDayCare_GiveMonToRaise, and "one more?" while there's room.
      const give = async () => {
        for (;;) {
          if (env.player.party.filter((r) => !r.egg).length === 1) { await env.say(env.DC("YouHaveJustOneMon")); return; }
          await env.say(env.DC("WhichMonShouldWeRaise"));
          const mine = await env.choosePartyFor("Choose a POKéMON.");
          env.show("world");
          if (!mine) { await comeAgain(); return; }
          if (mine.egg) { await env.say("We can't raise an Egg!"); return; }
          if (!env.player.party.some((r) => r !== mine && Party.canFight(r))) { await env.say(env.DC("WhatWillYouBattleWith")); return; }
          env.player.party.splice(env.player.party.indexOf(mine), 1);
          list.push(DayCare.deposit(mine));
          env.cry(mine.species);
          await env.say(env.DC("WellRaiseYourMon"), [Party.displayName(mine)]);
          if (list.length !== 1) return;
          if (!(await yesNo(env.DC("WeCanRaiseOneMore")))) { await comeAgain(); return; }
        }
      };
      // FourIsland_PokemonDayCare_TryRetrieveMon: which one (ShowDaycareLevelMenu,
      // with two), what it costs, and the other one too?
      const retrieve = async () => {
        for (;;) {
          if (env.player.party.length >= Player.PARTY_SIZE) { await env.say(env.DC("YourPartyIsFull")); return; }
          let dc = list[0];
          if (list.length > 1) {
            const i = await env.multichoice(null, 15, 6, list.map((d) => Party.displayName(d.mon) + " Lv" + (d.mon.level + DayCare.levelsGained(d, Player.levelCap(env.player)))).concat(["Exit"]));
            if (i < 0 || i >= list.length) { await comeAgain(); return; }
            dc = list[i];
          }
          const name = Party.displayName(dc.mon), cost = DayCare.cost(dc, Player.levelCap(env.player));
          if (!(await yesNo(env.DC("ItWillCostX"), [name, cost.toLocaleString("en-US")]))) { await comeAgain(); return; }
          if (env.player.money < cost) { await env.say(env.DC("NotEnoughMoney")); return; }
          Screen.say("");
          if (D.lady) await Overworld.act([{ who: D.lady, moves: env.M("FourIsland_PokemonDayCare_Movement_RetrieveMon") }]);
          list.splice(list.indexOf(dc), 1);
          const mon = DayCare.withdraw(dc, Player.levelCap(env.player));
          Player.addMoney(env.player, -cost);
          env.player.party.push(mon);
          env.sfx("se_rs_shop");
          await env.say(env.DC("HeresYourMon"));
          env.cry(mon.species);
          await env.say(env.DC("TookBackMon"), [name]);
          if (list.length !== 1) { await comeAgain(); return; }
          if (!(await yesNo(env.DC("TakeOtherOneBackToo")))) { await comeAgain(); return; }
        }
      };
      if (!list.length) {
        if (!(await yesNo(env.DC("WouldYouLikeUsToRaiseMon")))) { await env.say(env.DC("FineThenComeAgain")); return; }
        await give();
        return;
      }
      await env.say(env.DC("GoodToSeeYou"));
      for (const dc of list) {
        const n = DayCare.levelsGained(dc, Player.levelCap(env.player));
        if (n) await env.say(env.DC("YourMonHasGrownXLevels"), [Party.displayName(dc.mon), String(n)]);
      }
      if (list.length === 1 && (await yesNo(env.DC("WeCanRaiseOneMore")))) { await give(); return; }
      if (await yesNo(env.DC("TakeYourMonBack"))) { await retrieve(); return; }
      await comeAgain();
    }

    async function fourIslandDayCareMan(where) {
      const D = env.DAY_CARES[where || "four"];
      const f = env.player.flags, list = f[D.list] || [], eggs = f[D.eggs] || (f[D.eggs] = {});
      // An Egg waiting (FourIsland_EventScript_DaycareEggWaiting): "You do want it, yes?"
      if (eggs.eggWaiting && list.length === 2) {
        if (!(await yesNo(env.DC("DoYouWantEgg"))) && !(await env.confirm(env.fill(env.DC("IWillKeepDoYouWantIt").join(" "))))) {
          await env.say(env.DC("IllKeepIt"));
          eggs.eggWaiting = false;   // (RejectEggFromDayCare)
          return;
        }
        if (env.player.party.length >= Player.PARTY_SIZE) { await env.say(env.DC("YouHaveNoRoomForIt")); return; }
        await env.sayWithJingle("mus_level_up", env.DC("ReceivedEgg"));
        await env.say(env.DC("TakeGoodCareOfIt"));
        // (GiveEggFromDaycare: what's in it is decided now.)
        env.player.party.push(Breeding.makeEgg(list[0].mon, list[1].mon, { map: env.player.location.map, shinyCharm: Player.itemCount(env.player, "shiny-charm") > 0 }));
        eggs.eggWaiting = false;
        return;
      }
      if (!list.length) { await env.say(env.DC("ImDaycareManSpeakToMyWife")); return; }
      await env.say(env.DC(list.length === 1 ? "YourMonIsDoingFine" : "YourMonsAreDoingFine"), list.map((d) => Party.displayName(d.mon)));
      // (With two, how well they get on: SetDaycareCompatibilityString.)
      if (list.length === 2) await env.say(Breeding.compatibilityText(Breeding.compatibility(list[0].mon, list[1].mon)));
    }

    // The sticker man (FourIsland_House2_EventScript_StickerMan): brag about
    // your Hall of Fame entries and he gives your Trainer Card a sticker, a
    // better one each tier (up to 39 entries, 99, 199, 200 on). (FireRed also
    // takes Eggs hatched and link battles won, which this game hasn't got.)
    async function stickerMan() {
      const f = env.player.flags, S = (k) => env.T("FourIsland_House2_Text_" + k), id = "LOCALID_STICKER_MAN", hof = f.hofCount || 0;
      const brag = async (question) => {
        await env.say(question.slice(0, -1));
        const i = await env.multichoice(question[question.length - 1], 15, 8, ["Hall of Fame", "Quit"]);
        Screen.say("");
        if (i !== 0) return;
        const tier = Sevii.hofBrag(hof);
        if (f.hofBragState === tier) { await env.say(S(tier === 4 ? "LivingLegendHoF" : "ComeBackWithBetterStoryHoF")); return; }
        f.hofBragState = tier;
        await env.say(S(["WowHoFLowest", "WowHoFLow", "WowHoFHigh", "WowHoFHighest"][tier - 1]));
        await env.sayWithJingle("mus_level_up", S("HoFStickerApplied"));
      };
      if (!f.metStickerMan) {
        f.metStickerMan = true;
        await env.say(S("WishICouldShowOffStickers"));
        Screen.say("");
        await Overworld.act([{ who: id, moves: ["face_player"] }]);
        env.sfx("se_pin");
        await Overworld.act([{ who: id, moves: ["emote_exclamation_mark", "delay_16", "delay_16", "delay_16"] }]);
        if (!hof) { await env.say(S("GiveYouStickerIfYouBrag")); return; }
        await brag(S("GiveYouStickerIfYouBrag"));
        return;
      }
      await Overworld.act([{ who: id, moves: ["face_player"] }]);
      if (!hof) { await env.say(S("BragAboutSomethingForMe")); return; }
      await brag(S("BragAboutWhatToday"));
    }

    function icefallStep() {
      const at = env.player.location;
      if (!at || at.map !== "FourIsland_IcefallCave_1F") return null;
      const b = World.blockAt(at.map, at.x, at.y).behavior, key = at.x + "," + at.y;
      if (b === World.MB.THIN_ICE) {
        env.icefallIce[key] = 1;
        env.sfx("se_ice_crack");
        env.applyPatches(at.map);
        return null;
      }
      if (b !== World.MB.CRACKED_ICE) return null;
      env.icefallIce[key] = 2;
      env.sfx("se_ice_break");
      env.applyPatches(at.map);
      return {
      type: "trigger",
      trigger: { script: "FourIsland_IcefallCave_1F_EventScript_FallDownHole" },
      map: at.map,
    };
    }

    // FourIsland_IcefallCave_1F_EventScript_FallDownHole: through the ice to
    // the same spot on B1F (warphole).
    async function icefallFall() {
      const at = Overworld.position();
      await env.sleep(333);
      await Overworld.act([{ who: "player", moves: ["set_invisible"] }]);
      env.sfx("se_fall");
      await env.sleep(1000);
      await Overworld.teleport({ map: "FourIsland_IcefallCave_B1F", x: at.x, y: at.y, facing: at.facing });
    }

    async function icefallLorelei() {
      const f = env.player.flags, I = (k) => env.T("FourIsland_IcefallCave_Back_Text_" + k), Im = (k) => env.M("FourIsland_IcefallCave_Back_Movement_" + k);
      const L = "LOCALID_ICEFALL_LORELEI", R1 = "LOCALID_ICEFALL_ROCKET1", R2 = "LOCALID_ICEFALL_ROCKET2", R3 = "LOCALID_ICEFALL_ROCKET3";
      const start = Object.assign({ map: env.player.location.map }, Overworld.position());
      await env.say(I("LoreleiKeepHandsOffMons"));
      await Overworld.act([{ who: R1, moves: Im("WalkInPlaceDown") }]);
      await env.say(I("ShutItLadyLeaveUsBe"));
      Screen.say("");
      env.sfx("se_pin");
      await Overworld.act([{ who: L, moves: ["emote_exclamation_mark"] }]);
      await Overworld.act([{ who: L, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      await Overworld.act([{ who: L, moves: ["delay_16", "delay_16", "delay_16"] }]);
      await env.say(I("LoreleiPlayerHelpMeKickPoachersOut"));
      Screen.say("");
      await Overworld.act([{ who: L, moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
      await env.sleep(300);
      await Overworld.act([{ who: L, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      await env.sleep(583);
      await Overworld.act([{ who: R3, moves: Im("Rocket3FaceLorelei") }, { who: L, moves: Im("LoreleiToRockets") }, { who: "player", moves: Im("PlayerToRockets") }]);
      await Overworld.act([{ who: R2, moves: Im("WalkInPlaceDown") }]);
      env.music("mus_encounter_rocket");
      await env.say(I("GruntIntro"));
      if (!env.canBattle()) return;
      // (This game's own: Lorelei battles beside you, against both Grunts:
      // FireRed's one, and the other with Pokémon of his own.)
      await Overworld.act([{ who: R1, moves: Im("WalkInPlaceDown") }]);
      await env.say(["Hey, this one's mine too!", "Lorelei: Then we'll take you both on.\n{PLAYER}, choose three Pokémon!"]);
      Screen.say("");
      const id = "TRAINER_TEAM_ROCKET_GRUNT_45", data = window.WORLD_TRAINERS[id];
      const outcome = await env.battle("trainer", { foe: { name: data.className + " " + data.name, team: env.trainerTeam(id), pic: data.pic },
        foe2: { name: data.className + " " + data.name, team: env.ICEFALL_GRUNT2.map(([sp, lv]) => Party.create(sp, lv)), pic: data.pic,
          defeatText: ["Gah! Two against two, and\nwe still lost?!"], prizeClass: data.className },
        defeatText: I("GruntDefeat"), trainerId: id, prizeClass: data.className,
        partner: { name: "Lorelei", team: env.ICEFALL_LORELEI.map(([sp, lv]) => Party.create(sp, lv, { ivs: 31 })), pic: "lorelei" } });
      if (outcome === "cancelled") {
        // (Not ready: back where you came in, and it all happens again when you return.)
        await env.say(["Lorelei: Not ready? Then hurry,\n{PLAYER}! I'll hold them here."]);
        await Overworld.fadeToBlack();
        await Overworld.teleport(Object.assign({}, start));
        env.music((window.WORLD_MAPS[env.player.location.map] || {}).music);
        return;
      }
      if (outcome !== "won") return;
      env.show("world");
      await Overworld.resume();
      await Overworld.act([{ who: L, moves: Im("WalkInPlaceUp") }]);
      await env.say(I("LoreleiWhereHaveYouTakenMons"));
      await env.say(I("NotTellingYouThat"));
      const freeze = I("LoreleiWellDeepFreezeYou");
      await env.say(freeze.slice(0, -1));
      env.cry("Lapras");
      await env.say(freeze.slice(-1));
      await Overworld.act([{ who: R1, moves: Im("Rocket1ReactToThreat") }]);
      await env.say(I("OkayRocketWareHouseFiveIsland"));
      Screen.say("");
      await Overworld.act([{ who: L, moves: Im("LoreleiWatchRocketsExit") }, { who: "player", moves: Im("PlayerWatchRocketsExit") },
        { who: R1, moves: Im("Rocket1Exit") }, { who: R2, moves: Im("Rocket2Exit") }, { who: R3, moves: Im("Rocket3Exit") }]);
      for (const r of [R1, R2, R3]) Overworld.removeObject(r);
      await env.sleep(833);
      await Overworld.act([{ who: L, moves: Im("LoreleiWalkToPlayer") }]);
      await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterLeft") }]);
      await env.say(I("ThankYouThisIsAwful"));
      f.icefallScene = 1;   // (Lorelei's at home now: FLAG_HIDE_LORELEI_IN_HER_HOUSE cleared)
      env.tempFlags.add("icefallLorelei");
    }

    // ---------- The Sevii Islands: Five Island ----------
    //
    // The Rocket Warehouse's door in Five Isle Meadow (FiveIsland_Meadow_EventScript_WarehouseDoor):
    // two passwords, "GOLDEEN need log" and "Yes, nah, CHANSEY" (FLAG_LEARNED_YES_NAH_CHANSEY:
    // flags.learnedYesNahChansey, which part 3's Dotted Hole sets).
    async function warehouseDoor() {
      const f = env.player.flags, D = (k) => env.T("FiveIsland_Meadow_Text_" + k);
      if (f.unlockedRocketWarehouse) { await env.say(D("WarehouseDoorAlreadyOpen")); return; }
      if (!f.learnedYesNahChansey) { await env.say(D("EnteredPasswordAnotherNeeded")); return; }
      f.unlockedRocketWarehouse = true;
      await env.say(D("EnteredPasswordDoorOpened"));
      await env.sleep(1000);
      env.applyPatches("FiveIsland_Meadow");
      env.sfx("se_pin");
    }

    // In the Warehouse: the Admin by the arrows turns them round once she's
    // beaten so you can come back through (FiveIsland_RocketWarehouse_EventScript_DefeatedAdmin1);
    // the other Admin, beaten, takes Team Rocket away (..._DefeatedAdmin2:
    // FLAG_DEFEATED_ROCKETS_IN_WAREHOUSE). -> true if it was one of them.
    async function warehouseAdmin(id) {
      const f = env.player.flags, W = (k) => env.T("FiveIsland_RocketWarehouse_Text_" + k);
      if (id === "TRAINER_TEAM_ROCKET_ADMIN") {
        const A = "LOCALID_WAREHOUSE_ADMIN1", at = Overworld.position();
        env.show("world");
        await Overworld.resume();
        if (at.facing === "up" && at.x !== 27) await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
        await env.say(W("Admin1PostBattle"));
        Screen.say("");
        // (To the switch at 27: from wherever she stopped coming at you.)
        const a = Overworld.personPosition(A);
        await Overworld.act([{ who: A, moves: Array(Math.max(0, 27 - (a ? a.x : 27))).fill("walk_right").concat(env.M("Common_Movement_WalkInPlaceFasterUp")) }]);
        env.sfx("se_pin");
        env.applyPatches("FiveIsland_RocketWarehouse");
        await env.sleep(300);
        await Overworld.act([{ who: A, moves: env.M(at.x === 27 ? "Common_Movement_WalkInPlaceFasterDown" : "Common_Movement_WalkInPlaceFasterLeft") }]);
        await env.say(W("MadeItSoYouCanComeBackThrough"));
        if (f.trainerSpots) delete f.trainerSpots[id];   // (back at her post by the switch)
        return true;
      }
      if (id === "TRAINER_TEAM_ROCKET_ADMIN_2") {
        env.show("world");
        await Overworld.resume();
        if (Overworld.position().x <= 24) await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
        await env.say(W("Admin2PostBattle"));
        Screen.say("");
        await Overworld.fadeToBlack();
        for (const who of ["LOCALID_WAREHOUSE_GRUNT2", "LOCALID_WAREHOUSE_GRUNT3", "LOCALID_WAREHOUSE_ADMIN2", "LOCALID_WAREHOUSE_ADMIN1"]) Overworld.removeObject(who);
        f.warehouseScene = 1;
        f.defeatedRocketsInWarehouse = true;   // (and FLAG_HIDE_FIVE_ISLAND_ROCKETS)
        // (Gone for good, wherever they stopped coming at you.)
        for (const t of ["TRAINER_TEAM_ROCKET_ADMIN", "TRAINER_TEAM_ROCKET_ADMIN_2", "TRAINER_TEAM_ROCKET_GRUNT_42", "TRAINER_TEAM_ROCKET_GRUNT_47",
          "TRAINER_TEAM_ROCKET_GRUNT_48", "TRAINER_TEAM_ROCKET_GRUNT_49", "TRAINER_TEAM_ROCKET_GRUNT_50", "TRAINER_TEAM_ROCKET_GRUNT_51"]) if (f.trainerSpots) delete f.trainerSpots[t];
        await Overworld.fadeFromBlack();
        return true;
      }
      return false;
    }

    // Gideon (FiveIsland_RocketWarehouse_EventScript_Gideon): the scientist who
    // stole the Sapphire (part 3: the Dotted Hole) hands it over once beaten.
    async function gideon(person) {
      const f = env.player.flags, W = (k) => env.T("FiveIsland_RocketWarehouse_Text_" + k), id = "TRAINER_SCIENTIST_GIDEON";
      if (f[id]) { await env.say(W(f.canLinkWithRS ? "GiovannisKidHasRedHair" : "GetLostLeaveMeBe")); return; }
      await env.trainerBattle(person, null);
      if (!f[id]) return;
      env.show("world");
      await Overworld.resume();
      await env.say(W("GideonPostBattle"));
      f.recoveredSapphire = true;
      Player.addItem(env.player, "sapphire");
      await env.sayWithJingle("mus_obtain_key_item", "{PLAYER} received the " + Bag.name("sapphire") + "!");
    }

    async function memorialMan() {
      const f = env.player.flags;
      if (f.gotTM42AtMemorialPillar) { await env.say(env.P5("ScrubScrubTectonix")); return; }
      if (f.noRoomForTM42) { await env.say(env.P5("StillHaveThingAsMyThanks")); await memorialTM(); return; }
      await env.say(env.P5("ScrubScrub"));
      Screen.say("");
      await Overworld.act([{ who: env.MEMORIAL_MAN, moves: ["face_player"] }]);
      await env.sleep(750);
      await env.say(env.P5("YourMonsLookHealthy"));
      await Overworld.act([{ who: env.MEMORIAL_MAN, moves: env.M("Common_Movement_WalkInPlaceFasterUp") }]);
      await env.say(env.P5("ThisIsWhereIBuriedMyOnix"));
    }

    async function memorialTM() {
      const tm = env.machineFor("Facade");   // (FireRed's TM42 Facade)
      Player.addItem(env.player, tm);
      await env.sayWithJingle(env.itemJingle(tm), "{PLAYER} received " + Bag.name(tm) + "!");
      await env.say(env.P5("BeGoodToYourMonsToo"));
      await Overworld.act([{ who: env.MEMORIAL_MAN, moves: env.M("Common_Movement_WalkInPlaceFasterUp") }]);
      env.player.flags.gotTM42AtMemorialPillar = true;
      delete env.player.flags.noRoomForTM42;
    }

    async function memorial() {
      const f = env.player.flags;
      if (f.gotTM42AtMemorialPillar || f.noRoomForTM42) { await env.say(env.P5("HereLiesTectonix")); return; }
      await env.say(env.P5("HereLiesTectonixLemonadeOffering"));
      if (!Player.itemCount(env.player, "lemonade")) return;
      if (!(await yesNo(env.P5("LeaveAnotherLemonadeOffering")))) return;
      Player.removeItem(env.player, "lemonade");
      await env.say(env.P5("PlacedCanOfLemonade"));
      Screen.say("");
      await Overworld.act([{ who: env.MEMORIAL_MAN, moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
      await env.sleep(750);
      await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterLeft") }]);
      await env.say(env.P5("ThankYouPleaseTakeThis"));
      await memorialTM();
    }

    // ---------- The Sevii Islands: Six Island ----------
    //
    // Gary's in Six Island's Pokémon Center the first time you come
    // (SixIsland_PokemonCenter_1F_EventScript_RivalScene): he can't find all the
    // Pokémon around here, and he's off; after this he's not on Four Island.
    async function sixIslandRival() {
      const R = "LOCALID_SIX_ISLAND_RIVAL", Sm = (k) => env.M("SixIsland_PokemonCenter_1F_Movement_" + k);
      await Overworld.act([{ who: R, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      env.music("mus_encounter_rival");
      await Overworld.act([{ who: R, moves: ["emote_exclamation_mark"] }]);
      await Overworld.act([{ who: R, moves: ["delay_16", "delay_16", "delay_16"] }]);
      await env.sleep(417);
      await Overworld.act([{ who: R, moves: Sm("RivalApproach") }]);
      await env.say(env.T("SixIsland_PokemonCenter_1F_Text_RivalImpossibleToGetAllMonsAroundHere"));
      Screen.say("");
      await Overworld.act([{ who: "player", moves: Sm("PlayerWatchRivalExit") }, { who: R, moves: Sm("RivalExit") }]);
      env.music((window.WORLD_MAPS.SixIsland_PokemonCenter_1F || {}).music);
      env.sfx("se_exit");
      await env.sleep(583);
      Overworld.removeObject(R);
      env.player.flags.sixCenterScene = 1;
      env.player.flags.fourIslandScene = 1;
    }

    // Ruin Valley: the scientist outside the Dotted Hole (SixIsland_RuinValley_EventScript_Scientist),
    // and its door (..._EventScript_DottedHoleDoor): six dots in Braille, "CUT".
    async function ruinValleyScientist() {
      const S = "LOCALID_RUIN_VALLEY_SCIENTIST";
      await env.say(env.T("SixIsland_RuinValley_Text_CantFigureOutHowToGetInside"));
      await Overworld.act([{ who: S, moves: ["face_player"] }]);
      await env.say(env.T("SixIsland_RuinValley_Text_IFoundThisPlace"));
      await Overworld.act([{ who: S, moves: ["face_up"] }]);
    }

    async function dottedHoleDoor() {
      const R = (k) => env.T("SixIsland_RuinValley_Text_" + k);
      if (env.player.flags.usedCutOnRuinValleyBraille) { await env.say(R("DoorIsOpen")); return; }
      const q = R("CheckDoorMoreThoroughly");
      await env.say(q.slice(0, -1));
      if (!(await env.confirm(env.fill(q[q.length - 1])))) { await env.say(R("LeftDoorAlone")); return; }
      await env.say(R("SeveralDotsOnTheDoor"));
      await env.say(env.braille("CUT"));
    }

    // Cut used on it, from below (CutMoveOpenDottedHoleDoor): it opens.
    async function cutDottedHoleDoor(mon) {
      await env.say(env.usedMove(mon, "Cut"));
      Screen.say("");
      env.player.flags.usedCutOnRuinValleyBraille = true;
      env.applyPatches("SixIsland_RuinValley");
      env.sfx("se_bang");
    }

    // The Dotted Hole's Sapphire room (SixIsland_DottedHole_SapphireRoom_EventScript_Sapphire):
    // you find the Sapphire, and the man who's been following you drops in,
    // snatches it to sell to Team Rocket, and gives away a password to their
    // Warehouse as he runs: "Yes, nah, Chansey." (He's Gideon, in the Warehouse
    // on Five Island.)
    async function dottedHoleSapphire() {
      const f = env.player.flags, D = (k) => env.T("SixIsland_DottedHole_SapphireRoom_Text_" + k), Dm = (k) => env.M("SixIsland_DottedHole_SapphireRoom_Movement_" + k);
      const THIEF = "LOCALID_DOTTED_HOLE_THIEF", facing = Overworld.position().facing, upDown = facing === "up" || facing === "down";
      const face = (dir) => ({ who: "player", moves: env.M("Common_Movement_WalkInPlaceFaster" + dir) });
      await env.sayWithJingle("mus_obtain_key_item", D("FoundSapphire"));
      Screen.say("");
      // (He drops in from above: slide_down, nine tiles to the hole's foot.)
      Overworld.addObject(THIEF, { x: 5, y: 0, facing: "down" });
      env.sfx("se_fall");
      await Overworld.act([{ who: THIEF, moves: ["lock_facing_direction"].concat(Array(9).fill("walk_faster_down"), ["unlock_facing_direction"]) }]);
      env.sfx("se_m_strength");
      await Overworld.act([face(upDown ? "Left" : "Down")]);
      await Overworld.shake(12, { x: 3, y: 0, delay: 3 });
      await env.sleep(1000);
      await Overworld.act([{ who: THIEF, moves: Dm(upDown ? "ThiefLookAtSapphireFromLeft" : "ThiefLookAtSapphireFromBelow") }]);
      await env.say(D("IWasRightInTailingYou"));
      Screen.say("");
      await Overworld.act([{ who: THIEF, moves: Dm(upDown ? "ThiefGetSapphireFromLeft" : "ThiefGetSapphireFromBelow") }]);
      await Overworld.act([face({ up: "Up", down: "Down", right: "Right", left: "Left" }[facing])]);
      Overworld.removeObject("LOCALID_SAPPHIRE");
      await Overworld.act([face(upDown ? "Left" : "Down")]);
      await env.say(D("SellToTeamRocketTellPassword"));
      Screen.say("");
      await Overworld.act([{ who: "player", moves: Dm("PlayerWatchThiefExit") },
        { who: THIEF, moves: Dm(facing === "up" ? "ThiefExitNorth" : facing === "down" ? "ThiefExitSouth" : "ThiefExitEastWest") }]);
      env.sfx("se_exit");
      await env.sleep(583);
      Overworld.removeObject(THIEF);
      f.learnedYesNahChansey = true;   // (and FLAG_HIDE_SAPPHIRE)
    }

    // The Water Path's Heracross fan (SixIsland_WaterPath_House1_EventScript_Beauty):
    // she measures a Heracross (FireRed's size record, as the Magikarp's) and
    // gives you a Nest Ball for the biggest yet.
    async function heracrossFan() {
      const f = env.player.flags, H = (k) => env.T("SixIsland_WaterPath_House1_Text_" + k);
      if (!env.player.party.some((r) => r.species === "Heracross" && !r.egg)) { await env.say(H("LoveItNeedItHeracross")); return; }
      await env.say(H("MayIMeasureHeracross"));
      const r = await env.choosePartyFor("Choose a {PKMN}.");
      env.show("world");
      if (!r) return;
      if (r.species !== "Heracross" || r.egg) { await env.say(H("ThisWontDo")); return; }
      const hash = env.monSizeHash(r), record = f.heracrossRecord || 0;
      const now = env.monSize("Heracross", hash), best = env.monSize("Heracross", record), vars = [null, env.monInches("Heracross", hash), env.monInches("Heracross", record)];
      // (Smaller, or the same, is only a letdown once she's given you the Nest Ball.)
      if (now > best || !f.gotNestBallFromWaterPathHouse1) {
        if (now > best) f.heracrossRecord = hash;
        f.gotNestBallFromWaterPathHouse1 = true;
        await env.say(H("ItsXInchesDeserveReward"), vars);
        Player.addItem(env.player, "nest-ball");
        await env.sayWithJingle(env.itemJingle("nest-ball"), "{PLAYER} received a Nest Ball!");
        await env.say(H("WantToSeeBiggerOne"));
        return;
      }
      await env.say(H(now === best ? "ItsXInchesSameAsBefore" : "ItsXInchesYInchesWasBiggest"), vars);
    }

    async function heracrossChart() {
      const f = env.player.flags, H = (k) => env.T("SixIsland_WaterPath_House1_Text_" + k);
      if (!f.gotNestBallFromWaterPathHouse1) { await env.say(H("BlankChartOfSomeSort")); return; }
      await env.say(H("BiggestHeracrossIsXInches"), [null, null, env.monInches("Heracross", f.heracrossRecord || 0)]);
    }

    async function chanseyDance() {
      const C = (k) => env.T("SevenIsland_SevaultCanyon_House_Text_" + k), man = "LOCALID_CHANSEY_DANCE_MAN", danced = "SevenIsland_SevaultCanyon_House:danced";
      const home = (window.WORLD_MAPS.SevenIsland_SevaultCanyon_House || {}).music;
      if (env.tempFlags.has(danced)) { await Overworld.act([{ who: man, moves: ["face_player"] }]); await env.say(C("ChanseyDanceJoinIn")); return; }
      env.music("mus_school");
      await Overworld.act([{ who: man, moves: env.CHANSEY_DANCE }]);
      env.music(home);
      await env.sleep(500);
      await Overworld.act([{ who: man, moves: ["face_player"] }]);
      await env.say(C("ChanseyDanceJoinIn"));
      const q = C("WouldYouLikeToDance");
      await env.say(q.slice(0, -1));
      if (!(await env.confirm(env.fill(q[q.length - 1])))) { await env.say(C("ComeOnDance")); return; }
      await env.say(C("DancedChanseyDance"));
      Screen.say("");
      if (Overworld.position().facing !== "down") await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      await env.sleep(500);
      env.music("mus_school");
      await Overworld.act([{ who: "player", moves: env.CHANSEY_DANCE }]);
      env.music(home);
      await env.sleep(500);
      await env.outOfCenterHeal();
      await env.say(C("YoureAllChipperNow"));
      env.tempFlags.add(danced);
    }

    function tanobySwitch(map, x, y) {
      if (map !== env.TANOBY_KEY) return null;
      const t = ((window.WORLD_MAPS[map] || {}).triggers || []).find((q) => q.x === x && q.y === y);
      return t ? { type: "trigger", trigger: t, map } : null;
    }

    async function tanobyKeySwitch(script) {
      const key = env.TANOBY_KEY + ":" + script;
      if (env.tempFlags.has(key) || env.player.flags.unlockedTanobyRuins) return;
      env.tempFlags.add(key);
      const pressed = [...env.tempFlags].filter((k) => k.startsWith(env.TANOBY_KEY + ":")).length;
      env.sfx("se_truck_move");
      await Overworld.shake(8, { x: 1, y: 1, delay: 3 });
      await env.sleep(1000);
      if (pressed < 7) return;
      await Overworld.shake(10, { x: 2, y: 2, delay: 3 });
      await env.sleep(1000);
      await Overworld.shake(12, { x: 3, y: 3, delay: 2 });
      await env.sleep(1000);
      env.sfx("se_lavaridge_fall_warp");
      await env.sleep(1000);
      await env.say(env.T("SevenIsland_SevaultCanyon_TanobyKey_Text_MysteriousRumbleFarAway"));
      env.player.flags.unlockedTanobyRuins = true;
    }
     // (the lobby's counter barrier, as you come out of the elevator)
    // Who's on a floor, where, looking like whom (TrainerTower_OnTransition and
    // SetTrainerTowerNPCGraphics); the owner's only on the roof.
    function towerPerson(person, map) {
      if (map === "TrainerTower_Roof") return undefined;
      const n = env.towerFloorNo(map);
      if (!n) return undefined;
      if (!person.localId) return false;   // (the owner)
      const fl = env.towerFloor(n), cleared = TrainerTower.floorCleared(env.player.flags, n), at = (x, y, dir, gfx) => Object.assign(env.towerLook(gfx), { x, y, movement: "face_" + dir });
      if (fl.type === "single") return person.localId === env.TOWER.S && at(15, 13, "left", fl.looks[0]);
      if (fl.type === "double") {
        if (person.localId === env.TOWER.D1) return at(10, 12, cleared ? "down" : "left", fl.looks[0]);
        if (person.localId === env.TOWER.D2) return cleared ? at(11, 12, "down", fl.looks[1]) : at(10, 13, "left", fl.looks[1]);
        return false;
      }
      if (person.localId === env.TOWER.D1) return at(10, 10, "down", fl.looks[1]);
      if (person.localId === env.TOWER.S) return at(14, 13, "left", fl.looks[2]);
      if (person.localId === env.TOWER.K) return at(10, 16, "up", fl.looks[0]);
      return false;
    }

    // The lobby's counter (TrainerTower_Lobby_EventScript_EntryTrigger).
    async function towerEntry() {
      const f = env.player.flags;
      await Overworld.act([{ who: "player", moves: ["face_right"] }]);
      await env.say(env.lobbyText("WelcomeToTrainerTower"));
      // (FireRed's built-in challenges all go up to the eighth floor.)
      await env.say(env.lobbyText("TrainersUpEighthFloor"));
      for (;;) {
        const i = await env.multichoice(env.lobbyText("LikeToChallengeTrainers")[0], 18, 6, ["Yes", "No", "Info"]);
        if (i === 2) { await env.say(env.lobbyText("ExplainTrainerTower")); continue; }
        if (i === 0) {
          const mode = await env.multichoice(null, 13, 3, TrainerTower.MODES.concat(["Exit"]));
          if (mode >= 0 && mode < 4) {
            f.towerScene = 1;
            env.player.party.forEach(Party.heal);
            await env.say(env.lobbyText("StartClockGetSetGo"));
            env.tick();
            TrainerTower.start(f, mode);
            return;
          }
        }
        break;
      }
      await env.say(env.lobbyText("PleaseVisitUsAgain"));
      Screen.say("");
      await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
    }

    // Back in the lobby having lost (TrainerTower_Lobby_EventScript_LostChallenge).
    async function towerLost() {
      const f = env.player.flags;
      await Overworld.act([{ who: "player", moves: ["face_right"] }]);
      await env.say(env.lobbyText("TooBadComeBackTryAgain"));
      Screen.say("");
      await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
      f.towerScene = 0;
      if (f.tower) f.tower.lost = false;
    }

    // The lobby's Time Board (TrainerTower_Lobby_EventScript_ShowRecords: PrintTrainerTowerRecords).
    async function towerTimeBoard() {
      const f = env.player.flags;
      const line = (mode) => TrainerTower.MODES[mode] + ": " + env.fill(env.T("TrainerTower_Text_XMinYZSec")[0], TrainerTower.time(TrainerTower.best(f, mode)));
      await env.say(["Time Board", line(0) + "\n" + line(1), line(2) + "\n" + line(3)]);
    }

    // A floor's battle (TrainerTower_EventScript_TriggerBattle): singles walk
    // up to you; a double battle's pair are waiting by its trigger (and won't
    // battle you without two Pokémon that can fight); in a Knockout the three
    // come one after another, the first from below, then above, then the
    // right. `side`: which of the double battle's triggers (0 top, 1 bottom).
    async function towerBattle(map, side) {
      const f = env.player.flags, n = env.towerFloorNo(map), fl = env.towerFloor(n), t = f.tower;
      const towards = async (who, dir) => {
        // (Up to you: from where they stand to the tile next to yours.)
        const me = Overworld.position(), p = Overworld.personPosition(who);
        const steps = !p ? 0 : dir === "left" ? p.x - me.x - 1 : dir === "up" ? p.y - me.y - 1 : me.y - p.y - 1;
        await Overworld.act([{ who, moves: Array(Math.max(0, steps)).fill("walk_" + dir) }]);
      };
      const spotted = async (who, trainer) => {
        env.music(trainer.music);
        await Overworld.act([{ who, moves: ["emote_exclamation_mark"] }]);
        await Overworld.act([{ who, moves: ["delay_16", "delay_16", "delay_16"] }]);
      };
      const fight = async (team, trainer, double, defeat) => {
        const outcome = await env.battle("trainer", { foe: { name: trainer.className + " " + trainer.name, team, pic: trainer.pic },
          defeatText: defeat, double, noBlackout: true, noExp: true, noPrize: true });
        if (outcome === "won") {
          env.show("world");
          await Overworld.resume();
          // (Battle Points for each trainer beaten: a double battle's two, both.)
          const bp = env.towerBP(n) * (double ? 2 : 1);
          f.bp = (f.bp || 0) + bp;
          await env.say("{PLAYER} earned " + bp + " BP!\n(" + f.bp + " BP in total.)");
          return true;
        }
        // TrainerTower_EventScript_WarpToLobbyLost: healed, and back to the lobby.
        env.player.party.forEach(Party.heal);
        t.lost = true;
        t.running = false;
        env.show("world");
        await Overworld.resume();
        await Overworld.teleport({ map: "TrainerTower_Lobby", x: 9, y: 7, facing: "right" });
        await towerLost();
        return false;
      };
      const level = TrainerTower.partyLevel(env.player.party), lines = (s) => [s];
      if (fl.type === "double") {
        if (!env.canDouble()) {
          env.sfx("se_ding_dong");
          await env.say(env.lobbyText("NeedTwoMonsForDouble"));
          Screen.say("");
          await Overworld.act([{ who: "player", moves: ["walk_left"] }]);
          return;
        }
        await spotted(side ? env.TOWER.D2 : env.TOWER.D1, fl.trainers[side]);
        env.tempFlags.add(map + ":doubles");
        await env.say(lines(fl.trainers[side].intro));
        await env.say(lines(fl.trainers[1 - side].intro));
        const pair = Object.assign({}, fl.trainers[0], { name: fl.trainers[0].name });
        if (!(await fight(TrainerTower.team(fl, 0, t.floorsCleared, level), pair, true, [fl.trainers[0].lose, fl.trainers[1].lose]))) return;
        await Overworld.act([{ who: env.TOWER.D2, moves: ["walk_right", "walk_up", "face_down"] }]);
        await Overworld.act([{ who: env.TOWER.D1, moves: ["face_down"] }]);
        t.floorsCleared++;
        return;
      }
      if (fl.type === "single") {
        await spotted(env.TOWER.S, fl.trainers[0]);
        env.tempFlags.add(map + ":singles");
        await towards(env.TOWER.S, "left");
        await env.say(lines(fl.trainers[0].intro));
        if (!(await fight(TrainerTower.team(fl, 0, t.floorsCleared, level), fl.trainers[0], false, [fl.trainers[0].lose]))) return;
        t.floorsCleared++;
        return;
      }
      // Knockout: below (walk_up), above (walk_down), then the right (walk_left).
      env.tempFlags.add(map + ":singles");
      const order = [[env.TOWER.K, "up"], [env.TOWER.D1, "down"], [env.TOWER.S, "left"]];
      for (let i = 0; i < 3; i++) {
        await spotted(order[i][0], fl.trainers[i]);
        await towards(order[i][0], order[i][1]);
        await env.say(lines(fl.trainers[i].intro));
        if (!(await fight(TrainerTower.team(fl, i, t.floorsCleared, level), fl.trainers[i], false, [fl.trainers[i].lose]))) return;
      }
      await Overworld.act([{ who: env.TOWER.S, moves: ["walk_up", "face_down"] }]);
      t.floorsCleared++;
    }

    // Talking to a floor's trainers after (TrainerTower_EventScript_SpeakTo*):
    // what they say after a battle.
    async function towerTrainerTalk(map, localId) {
      const n = env.towerFloorNo(map);
      if (!n) return;
      const fl = env.towerFloor(n), knockout = fl.type === "knockout";
      const i = { [env.TOWER.D1]: knockout ? 1 : 0, [env.TOWER.S]: knockout ? 2 : 0, [env.TOWER.K]: 0, [env.TOWER.D2]: 1 }[localId] || 0;
      await Overworld.act([{ who: localId, moves: ["face_player"] }]);
      await env.say([(fl.trainers[i] || fl.trainers[0]).after]);
    }

    // The owner, on the roof (TrainerTower_EventScript_SpeakToOwner): the
    // clock stops; the rewards (this game's: items and Battle Points every challenge,
    // by how fast it went, TrainerTower.rewards and finishBP); your time, a record or not.
    async function towerOwner() {
      const f = env.player.flags, R = (k) => env.T("TrainerTower_Roof_Text_" + k);
      env.tick();
      const t = f.tower || TrainerTower.start(f, 0);
      TrainerTower.records(f);
      t.running = false;
      if (!t.spokeToOwner) {
        t.spokeToOwner = true;
        await env.say(R("ImOwnerBattledPerfectly"));
        // (Your time, as the Time Board has it.)
        await env.say("Your time was\n" + env.fill(env.T("TrainerTower_Text_XMinYZSec")[0], TrainerTower.time(t.frames)) + "…");
        const items = TrainerTower.rewards(t.mode, t.frames);
        const pace = TrainerTower.pace(t.mode, t.frames);
        await env.say(pace === 3 ? "And so quickly, too! Here, these are for you." : pace === 2 ? "Not bad at all. Here, these are for you." : R("ThisIsForYou"));
        for (const item of items) {
          Player.addItem(env.player, item);
          await env.sayWithJingle("mus_level_up", "{PLAYER} obtained the " + Bag.name(item) + "!");
        }
        // (And Battle Points, by the same pace: TrainerTower.finishBP.)
        const bp = TrainerTower.finishBP(t.mode, t.frames);
        f.bp = (f.bp || 0) + bp;
        await env.say("{PLAYER} earned " + bp + " BP!\n(" + f.bp + " BP in total.)");
        const r = TrainerTower.finalTime(f);
        if (r === 0) await env.say(R("DoneItInRecordTime"));
        else if (r === 1) await env.say(R("TookSweetTimeGettingHere"));
      }
      else await env.say("Your time was\n" + env.fill(env.T("TrainerTower_Text_XMinYZSec")[0], TrainerTower.time(t.frames)) + "…");
      await env.say(R("IdLikeToSeeBetterTime"));
    }

    return {
      setSail,
      seagallopMenu,
      harborSailor,
      vermilionSeagallop,
      ferry,
      cinnabarBill,
      cinnabarSailWithBill,
      cinnabarCenterBill,
      cinnabarBillReturns,
      oneIslandArrival,
      billToCelio,
      meetCelio,
      celio,
      celioRuby,
      celioSapphire,
      giveOldSeaMap,
      oneIslandCenterBill,
      leaveOneIsland,
      networkMachine,
      twoIslandShop,
      twoIslandClerk,
      gameCornerHelp,
      gameCornerLostelleHome,
      lostellesDaddy,
      capeBrinkTutor,
      moveManiac,
      bikerArgument,
      antiBiker,
      bikerBossIntro,
      bikerBattles,
      berryForestLostelle,
      emberPassword,
      emberGrunt,
      emberSpa,
      seviiTransition,
      cinnabarBillStep,
      fourIslandRival,
      yesNo,
      fourIslandDayCareLady,
      fourIslandDayCareMan,
      stickerMan,
      icefallStep,
      icefallFall,
      icefallLorelei,
      warehouseDoor,
      warehouseAdmin,
      gideon,
      memorialMan,
      memorialTM,
      memorial,
      sixIslandRival,
      ruinValleyScientist,
      dottedHoleDoor,
      cutDottedHoleDoor,
      dottedHoleSapphire,
      heracrossFan,
      heracrossChart,
      chanseyDance,
      tanobySwitch,
      tanobyKeySwitch,
      towerPerson,
      towerEntry,
      towerLost,
      towerTimeBoard,
      towerBattle,
      towerTrainerTalk,
      towerOwner,
    };
  }

  window.KantoSevii = { create };
})();
