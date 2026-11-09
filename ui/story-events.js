// Shared story dispatch, NPC visibility and trigger eligibility.
// Shared state and services are accessed through live env properties.
(function () {
  "use strict";

  function create(env) {
    function visible(person, map) {
      const platinum = env.sinnohStory.visible(person);
      if (platinum !== undefined) return platinum;
      if (env.isHoenn(map || env.player.location.map)) { const dv = env.deltaVisible(person); if (dv !== undefined) return dv; const b = env.hoennBerries.visible(person, map || env.player.location.map); return b !== undefined ? b : env.hoennVisible(person, map || env.player.location.map); }
      const f = env.player.flags;
      // (A Tera Raid den: glowing while its raid is on.)
      { const den = RaidDens.byScript(person.script); if (den) return RaidDens.active(f, den.id) ? { sprite: "raid_den_active" } : true; }
      // (Johto's people: hidden while HGSS's flag for them is set, and where
      // the map's own script puts them this visit.)
      if ((person.hgssFlag && env.johto.flag(person.hgssFlag)) || person.offstage) return false;
      // (The National Park's Bug-Catching Contest people, HGSS's out of sight at its edge, here outside the fence where
      // they'd stand in the way: there only once the judging lines them up.)
      if ((map || env.player.location.map) === "NationalPark" && /^hgss:BUG_CONTEST:/.test(person.script || "") && !env.johto.placed(person.localId)) return false;
      { const g = env.gear.visible(person); if (g !== undefined) return g; }   // (a Gym Leader at the Dojo: ui/pokegear.js)
      { const b = env.berryFarm.visible(person, map || env.player.location.map); if (b !== undefined) return b; }   // (a berry tree: ui/berry-farm.js)
      { const b = env.sinnohBerries.visible(person, map || env.player.location.map); if (b !== undefined) return b; }   // (Sinnoh's)
      {
        // (Lyra, or Ethan for a girl: HGSS's friend.)
        const look = person.girlLook && env.isGirl() ? person.girlLook : null;
        const at = person.localId && !person.trainer && env.johto.placed(person.localId);
        if (at || look) return Object.assign({}, look, at ? { x: at.x, y: at.y, movement: "face_" + at.facing } : {});
      }
      // (The League gate's guard on the way to Johto: there until you're Champion. data/johto-maps.js)
      if (person.script === "Route22_NorthEntrance_EventScript_JohtoGuard") return !f.gameClear;
      // (The Champion here is Red.)
      // (Johto's League, once you've its eight Badges: HGSS's Elite Four and Lance in their places.)
      if (env.johtoLeague() && env.ELITE_FOUR_SCRIPTS.includes(person.script)) return Object.assign({}, window.JOHTO_LEAGUE[env.ELITE_FOUR_SCRIPTS.indexOf(person.script)].look);
      if (person.localId === "LOCALID_CHAMPIONS_ROOM_RIVAL") return Object.assign({}, env.johtoLeague() ? window.JOHTO_LEAGUE[4].look : env.lookOf("red"));
      if (person.item) return !f[person.flag];
      { const o = Orre.visible(person, f); if (o !== undefined) return o; }   // (Orre's people)
      if (person.flag && env.tempFlags.has((map || env.player.location.map) + ":" + person.flag)) return false;   // (a tree you've cut)
      const spot = person.trainer && f.trainerSpots && f.trainerSpots[person.trainer.id];
      if (spot) return { x: spot.x, y: spot.y, movement: "face_" + spot.facing };
      // Miguel stays by the fossil he took (FireRed's copyobjectxytoperm).
      if (person.script === "MtMoon_B2F_EventScript_Miguel" && f.mtMoonFossil) return { x: f.mtMoonFossil === "dome-fossil" ? 14 : 13, y: 8, movement: "face_up" };
      // Daisy sits at the table, before and after giving you the Town Map.
      if (person.script === "PalletTown_RivalsHouse_EventScript_Daisy") return { x: 5, y: 4, movement: "face_right" };
      if (person.flag === "FLAG_HIDE_TOWN_MAP") return !f.townMap;
      // Lying across the road north until Oak gets his parcel, then up and about.
      if (person.script === "ViridianCity_EventScript_TutorialOldMan") {
        return f.parcelDelivered ? { x: 21, y: 8, movement: "look_around" }
          : Object.assign({}, person.alt, { x: 21, y: 11, movement: "face_down" });
      }
      if (person.script === "PalletTown_EventScript_SignLady") return env.signLadyPlace();
      // Fuchsia's fossil Pokémon statue: a Kabuto, or an Omanyte once you've
      // taken the Dome Fossil (FuchsiaCity_OnTransition).
      if (person.alt && person.sprite === "kabuto") return f.mtMoonFossil === "dome-fossil" ? Object.assign({}, person.alt) : true;
      // (Silph 7F's pacing worker stands still once Team Rocket's gone.)
      if (person.script === "SilphCo_7F_EventScript_WorkerM2" && env.silphFreed()) return { movement: "face_up" };
      // Until Bill gives you the S.S. Ticket, the policeman stands in the
      // robbed house's doorway and Slowbro and the Lass are in the way south
      // (FireRed's CeruleanCity_EventScript_BlockExits).
      if (!f.gotSSTicket) {
        if (person.script === "CeruleanCity_EventScript_Policeman") return { x: 30, y: 12 };
        if (person.script === "CeruleanCity_EventScript_Slowbro") return { x: 26, y: 31 };
        if (person.script === "CeruleanCity_EventScript_Lass") return { x: 27, y: 31 };
      }
      // The Seafoam Islands' boulders: where they are now (game/seafoam.js).
      if (Seafoam.isBoulderFlag(person.flag)) return !Seafoam.hidden(f, person.flag);
      // Lostelle's dad stands by the counter once he's thanked you (TwoIsland_JoyfulGameCorner_OnTransition);
      // the Dunsparce Tunnel's prospector digs at the wall until it's dug out
      // (ThreeIsland_DunsparceTunnel_OnTransition: FireRed's with the National
      // Pokédex; here, once you're Champion, it's dug out).
      // (Only from the next visit on: right after the Moon Stone he stays where he is.)
      if (person.script === "TwoIsland_JoyfulGameCorner_EventScript_LostellesDaddy" && (f.gameCornerScene || 0) >= 4) return { x: 6, y: 2, movement: "face_down" };
      if (person.script === "ThreeIsland_DunsparceTunnel_EventScript_Prospector" && !env.player.flags.gameClear) return { x: 6, y: 3, movement: "face_right" };
      // Trainer Tower's floors: the challenge's trainers, where and as whom (towerPerson).
      { const tv = env.towerPerson(person, map || env.player.location.map); if (tv !== undefined) return tv; }
      // The Tanoby Key's boulders on their switches, once it's solved.
      const solved = Sevii.TANOBY_BOULDERS_SOLVED[person.localId];
      if (solved && f.unlockedTanobyRuins) return { x: solved[0], y: solved[1] };
      // Indigo Plateau's door guard stands in the doorway while Lorelei's away
      // (IndigoPlateau_PokemonCenter_1F_EventScript_CheckBlockDoor: setobjectxyperm 4, 2).
      if (person.localId === "LOCALID_LEAGUE_DOOR_GUARD" && Sevii.leagueClosed(f)) return { x: 4, y: 2 };
      // (Seven Island's house: FireRed's e-Reader trainer, who never visits here.)
      if ((map || env.player.location.map) === "SevenIsland_House_Room2") return false;
      switch (person.flag) {
        case "FLAG_HIDE_OAK_IN_PALLET_TOWN": return false;   // only appears for his walk to the lab
        case "FLAG_HIDE_OAK_IN_HIS_LAB": return !!(f.oakInLab || f.starter);
        case "FLAG_HIDE_POKEDEX": return !f.pokedex;         // on the desk until Oak hands them out
        case "FLAG_HIDE_MG_DELIVERYMEN": return false;       // no Mystery Gift
        case "FLAG_HIDE_ROUTE_22_RIVAL": return false;       // only for his scene
        case "FLAG_HIDE_PEWTER_CITY_GYM_GUIDE": return !f.TRAINER_LEADER_BROCK;
        // (No Running Shoes delivery: you can run from the start.)
        case "FLAG_HIDE_PEWTER_CITY_RUNNING_SHOES_GUY": return false;
        case "FLAG_HIDE_OLD_AMBER": return !f.gotOldAmber;
        case "FLAG_HIDE_CERULEAN_RIVAL": return false;        // only for his scene
        case "FLAG_HIDE_CERULEAN_ROCKET": return !f.gotTM28;
        case "FLAG_HIDE_SS_ANNE_RIVAL": return false;          // only for his scene (Red, here)
        case "FLAG_HIDE_SS_ANNE": return !f.ssAnneDeparted;
        // Prof. Oak's aide comes to Vermilion after Lt. Surge, to send you to his
        // colleague on Route 2 (unless you've had HM05 Flash from him already).
        // (FireRed has him gone once you've talked to him; here he stays.)
        case "FLAG_HIDE_VERMILION_CITY_OAKS_AIDE": return !!f.TRAINER_LEADER_LT_SURGE;
        case "FLAG_HIDE_NUGGET_BRIDGE_ROCKET": return !f.gotSSTicket;
        // Bill: a Clefairy until you run his Cell Separator, then himself.
        case "FLAG_HIDE_BILL_CLEFAIRY": return !f.billHelped && !env.billInTeleporter;
        // (Where his walk out of the Teleporter ended, until you leave.)
        case "FLAG_HIDE_BILL_HUMAN_SEA_COTTAGE": return f.billHelped ? (env.billJustOut ? { x: 7, y: 6 } : true) : false;
        case "FLAG_HIDE_POSTGAME_GOSSIPERS": return false;
        case "FLAG_HIDE_POKEHOUSE_FUJI": return !!f.rescuedMrFuji;   // (in Pokémon Tower until you rescue him)
        case "FLAG_HIDE_TOWER_FUJI": return !f.rescuedMrFuji;
        case "FLAG_HIDE_TOWER_RIVAL": return !f.towerRival;
        // The Rockets on 7F leave once beaten.
        case "FLAG_HIDE_TOWER_ROCKET_1": case "FLAG_HIDE_TOWER_ROCKET_2": case "FLAG_HIDE_TOWER_ROCKET_3":
          return !(person.trainer && f[person.trainer.id]) && !f.rescuedMrFuji;
        case "FLAG_HIDE_DOME_FOSSIL": case "FLAG_HIDE_HELIX_FOSSIL": return !f.mtMoonFossil;
        // Celadon: the Rockets (and the Silph scientist) until Giovanni's beaten
        // in the Hideout, where he leaves the Silph Scope behind; the Lift Key's
        // dropped by the Rocket on B4F; Eevee in its Poké Ball on the roof.
        case "FLAG_HIDE_CELADON_ROCKETS": return !f.TRAINER_BOSS_GIOVANNI;
        case "FLAG_HIDE_GAME_CORNER_ROCKET": return !f.TRAINER_TEAM_ROCKET_GRUNT_7;
        case "FLAG_HIDE_HIDEOUT_GIOVANNI": return !f.TRAINER_BOSS_GIOVANNI;
        case "FLAG_HIDE_SILPH_SCOPE": return !!f.TRAINER_BOSS_GIOVANNI && !f.gotSilphScope;
        case "FLAG_HIDE_LIFT_KEY": return !!f.TRAINER_TEAM_ROCKET_GRUNT_18 && !f.gotLiftKey;
        case "FLAG_HIDE_EEVEE_BALL": return !f.gotEevee;
        // Saffron: Team Rocket in the streets (and in Silph Co.) until Giovanni's
        // beaten on Silph's 11F; then the townsfolk come back out. The guard at
        // Silph's door stands in it until Mr. Fuji's rescued, then dozes off
        // beside it (SaffronCity_OnTransition).
        case "FLAG_HIDE_SAFFRON_ROCKETS":
          if (env.silphFreed()) return false;
          return person.script === "SaffronCity_EventScript_DoorGuardGrunt" && !f.rescuedMrFuji ? { x: 33, y: 31 } : true;
        case "FLAG_HIDE_SAFFRON_CIVILIANS": return env.silphFreed();
        case "FLAG_HIDE_SILPH_ROCKETS": return !env.silphFreed();
        case "FLAG_HIDE_SILPH_RIVAL": return !f.silphRival;
        // (The Fan Club's other members turn up once you're Champion.)
        case "FLAG_HIDE_SAFFRON_FAN_CLUB_BLACK_BELT": case "FLAG_HIDE_SAFFRON_FAN_CLUB_ROCKER":
        case "FLAG_HIDE_SAFFRON_FAN_CLUB_WOMAN": case "FLAG_HIDE_SAFFRON_FAN_CLUB_BEAUTY": return false;
        // The Dojo's prized Pokémon: the one you take goes; the other stays.
        case "FLAG_HIDE_DOJO_HITMONLEE_BALL": return f.dojoHitmon !== "Hitmonlee" && f.dojoHitmon2 !== "Hitmonlee";
        case "FLAG_HIDE_DOJO_HITMONCHAN_BALL": return f.dojoHitmon !== "Hitmonchan" && f.dojoHitmon2 !== "Hitmonchan";
        // The Snorlax asleep across Route 12, until you wake it with the Poké Flute.
        case "FLAG_HIDE_ROUTE_12_SNORLAX": return !f.wokeRoute12Snorlax;
        // And the one on Route 16.
        case "FLAG_HIDE_ROUTE_16_SNORLAX": return !f.wokeRoute16Snorlax;
        // Articuno, deep in the Seafoam Islands, until you've fought it
        // (SeafoamIslands_B4F_OnTransition); if you ran, it flew away until you come back.
        case "FLAG_HIDE_ARTICUNO": return !f.foughtArticuno;
        // In the Power Plant: Zapdos, and the two Electrode that look like item
        // balls, until you've fought them (PowerPlant_OnTransition).
        case "FLAG_HIDE_ZAPDOS": return !f.foughtZapdos;
        case "FLAG_HIDE_POWER_PLANT_ELECTRODE_1": return !f.foughtPowerPlantElectrode1;
        case "FLAG_HIDE_POWER_PLANT_ELECTRODE_2": return !f.foughtPowerPlantElectrode2;
        // Giovanni in Viridian Gym, until he's gone after telling you Team
        // Rocket's finished; then the Rockets left around Kanto are gone too
        // (FLAG_HIDE_MISC_KANTO_ROCKETS, set on beating him).
        case "FLAG_HIDE_VIRIDIAN_GIOVANNI": return !f.giovanniLeft;
        case "FLAG_HIDE_MISC_KANTO_ROCKETS": return !f.TRAINER_LEADER_GIOVANNI;
        // Victory Road: the boulder on 3F until it drops through the hole, and
        // then the one it becomes on 2F (Route23_OnTransition puts them back).
        case "FLAG_HIDE_VICTORY_ROAD_3F_BOULDER": return !LeagueRoad.dropped(f);
        case "FLAG_HIDE_VICTORY_ROAD_2F_BOULDER": return LeagueRoad.dropped(f);
        // (Only for the credits, once you're Champion.)
        case "FLAG_HIDE_CREDITS_RIVAL": case "FLAG_HIDE_CREDITS_OAK": return false;
        // Prof. Oak, until he comes into the Champion's room after the battle.
        case "FLAG_HIDE_OAK_IN_CHAMP_ROOM": return false;
        // Bill waits on Cinnabar after the Volcano Badge to take you to the Sevii
        // Islands (flags.cinnabarScene, FireRed's VAR_MAP_SCENE_CINNABAR_ISLAND:
        // game/sevii.js), or in its Pokémon Center if you weren't ready; the
        // Seagallop comes in only to take you. (Once you're Champion
        // player.flags.gameClear is set (FLAG_SYS_GAME_CLEAR), and
        // FLAG_SYS_CAN_LINK_WITH_RS, set at the end of the islands' story (the
        // Sapphire: celioSapphire()), is player.flags.canLinkWithRS: the
        // League's rematch teams.)
        case "FLAG_HIDE_CINNABAR_BILL": return f.cinnabarScene === 1;
        case "FLAG_HIDE_CINNABAR_SEAGALLOP": return false;
        case "FLAG_HIDE_CINNABAR_POKECENTER_BILL": return !!f.cinnabarBillInCenter;
        // One Island: Bill at the harbor to take you to Celio; in the Pokémon
        // Center, where the scenes put him and Celio, until he goes home.
        case "FLAG_HIDE_ONE_ISLAND_BILL": return f.oneHarborScene === 2;
        case "FLAG_HIDE_ONE_ISLAND_POKECENTER_BILL":
          if ((f.celioScene || 0) >= 3) return false;
          return !f.celioScene ? { x: 9, y: 8, movement: "face_up" } : f.celioScene === 2 ? { x: 14, y: 7, movement: "face_left" } : true;
        case "FLAG_HIDE_ONE_ISLAND_POKECENTER_CELIO": return f.celioScene === 2 ? { x: 14, y: 8, movement: "face_left" } : true;
        // Two Island: more people about as its shop grows (TwoIsland_EventScript_SetShopExpanded*);
        // Lostelle at the Joyful Game Corner once you've found her, at home on
        // Three Island once Bill's gone home; the biker only for his scene.
        case "FLAG_HIDE_TWO_ISLAND_WOMAN": return (f.twoIslandShopMax || 1) >= 2;
        case "FLAG_HIDE_TWO_ISLAND_BEAUTY": return (f.twoIslandShopMax || 1) >= 3;
        case "FLAG_HIDE_TWO_ISLAND_POKE_MANIAC": return (f.twoIslandShopMax || 1) >= 4;
        case "FLAG_HIDE_TWO_ISLAND_GAME_CORNER_BIKER": return false;
        case "FLAG_HIDE_TWO_ISLAND_GAME_CORNER_LOSTELLE":
          if (!f.rescuedLostelle || (f.cinnabarScene || 0) >= 4) return false;
          return f.gotMoonStoneFromDaddy ? { movement: "look_around" } : true;
        case "FLAG_HIDE_LOSTELLE_IN_HER_HOME": return !!f.rescuedLostelle && (f.cinnabarScene || 0) >= 4;
        case "FLAG_HIDE_LOSTELLE_IN_BERRY_FOREST": return !f.rescuedLostelle;
        // Three Island: the bikers until they're beaten (Paxton once a biker's
        // been to Two Island); the islanders standing up to them until Lostelle's found.
        case "FLAG_HIDE_THREE_ISLAND_ANTIBIKERS": return f.rescuedLostelle ? false : f.threeIslandScene === 4 ? { movement: "look_around" } : true;
        case "FLAG_HIDE_THREE_ISLAND_LONE_BIKER": return f.threeIslandScene === 2 || f.threeIslandScene === 3;
        case "FLAG_HIDE_THREE_ISLAND_BIKERS": return (f.threeIslandScene || 0) < 4;
        // Mt. Ember: Team Rocket outside the Ruby Path until both are beaten;
        // Moltres at the summit until you've fought it; the Ruby until you take it.
        case "FLAG_HIDE_MT_EMBER_EXTERIOR_ROCKETS":
          if (env.EMBER_GRUNTS.every((t) => f[t])) return false;
          return f.mtEmberScene === 2 ? { movement: "face_down" } : true;
        case "FLAG_HIDE_MOLTRES": return !f.foughtMoltres;
        // After the islands: Cerulean Cave's guard steps aside; Mewtwo waits
        // deep inside until caught or beaten (CeruleanCave_B1F_OnTransition).
        case "FLAG_HIDE_CERULEAN_CAVE_GUARD": return !Sevii.ceruleanCaveOpen(f);
        case "FLAG_HIDE_MEWTWO": return !f.foughtMewtwo;
        // Faraway Island's Mew, till it's caught or beaten (FLAG_CAUGHT_MEW, FLAG_DEFEATED_MEW).
        case "FLAG_HIDE_MEW": return !f.foughtMew;
        case "FLAG_HIDE_RUBY": return !f.gotRuby;
        // Four Island: Gary, for his scene the first time you come; the
        // poachers and Lorelei in Icefall Cave until you've run them off, and
        // then Lorelei at home until the Sapphire's in Celio's machine; her
        // dolls, more of them the more often you've entered the Hall of Fame
        // (UpdateLoreleiDollCollection).
        case "FLAG_HIDE_FOUR_ISLAND_RIVAL": return !f.fourIslandScene;
        case "FLAG_HIDE_ICEFALL_CAVE_ROCKETS": return !f.icefallScene;
        // (She stays by you until you leave: FourIsland_IcefallCave_Back_OnTransition.)
        case "FLAG_HIDE_ICEFALL_CAVE_LORELEI": return !f.icefallScene || (env.tempFlags.has("icefallLorelei") && { x: 12, y: 15, movement: "face_right" });
        case "FLAG_HIDE_LORELEI_IN_HER_HOUSE": return !!f.icefallScene && !f.canLinkWithRS;
        // (The Wigglytuff, Seel, Pikachu, Slowpoke, Slowbro and Psyduck dolls have
        // no flag: always there, as in FireRed. The other eight come one per 25
        // entries: Sevii.loreleiDolls.)
        case "FLAG_HIDE_LORELEI_HOUSE_MEOWTH_DOLL": case "FLAG_HIDE_LORELEI_HOUSE_CHANSEY_DOLL": case "FLAG_HIDE_LORELEIS_HOUSE_NIDORAN_F_DOLL":
        case "FLAG_HIDE_LORELEI_HOUSE_JIGGLYPUFF_DOLL": case "FLAG_HIDE_LORELEIS_HOUSE_NIDORAN_M_DOLL": case "FLAG_HIDE_LORELEIS_HOUSE_FEAROW_DOLL":
        case "FLAG_HIDE_LORELEIS_HOUSE_PIDGEOT_DOLL": case "FLAG_HIDE_LORELEIS_HOUSE_LAPRAS_DOLL":
          return Sevii.loreleiDollShown(person.flag, f.hofCount);
        // Five Island: Team Rocket in the Meadow and the Warehouse until its
        // Admin's beaten; Selphy lost in the Lost Cave, then outside her house
        // as you bring her home, then inside; her butler only comes in to thank you.
        case "FLAG_HIDE_FIVE_ISLAND_ROCKETS": return !f.defeatedRocketsInWarehouse;
        case "FLAG_HIDE_LOST_CAVE_SELPHY": return !f.lostCaveScene;
        case "FLAG_HIDE_RESORT_GORGEOUS_SELPHY": return f.resortScene === 1;
        case "FLAG_HIDE_RESORT_GORGEOUS_INSIDE_SELPHY": return (f.resortScene || 0) >= 2;
        case "FLAG_HIDE_SELPHYS_BUTLER": return false;
        // Six Island: Gary in the Pokémon Center the first time you come; the
        // scientist outside the Dotted Hole until you've been to Icefall Cave
        // (FireRed sets FLAG_HIDE_RUIN_VALLEY_SCIENTIST there); the Sapphire
        // until the thief has it; the thief only for his scene.
        case "FLAG_HIDE_SIX_ISLAND_POKECENTER_RIVAL": return !f.sixCenterScene;
        case "FLAG_HIDE_RUIN_VALLEY_SCIENTIST": return !f.icefallScene;
        case "FLAG_HIDE_SAPPHIRE": return !f.learnedYesNahChansey;
        case "FLAG_HIDE_DOTTED_HOLE_SCIENTIST": return false;
        // After you choose, your rival stands below the Poké Ball he took.
        // Leaf (the lab rival's other look) until she leaves after your battle;
        // after you choose, she stands below the Poké Ball she took.
        case "FLAG_HIDE_RIVAL_IN_LAB":
          if (f.rivalLabBattle) return false;
          return Object.assign({}, person.alt, f.starter ? { x: env.ballOf(env.RIVAL_PICK[f.starter]).x, y: 5, movement: "face_up" } : {});
        case "FLAG_HIDE_BULBASAUR_BALL": case "FLAG_HIDE_SQUIRTLE_BALL": case "FLAG_HIDE_CHARMANDER_BALL":
          return !(f.starter && (env.ballOf(f.starter).flag === person.flag || env.ballOf(env.RIVAL_PICK[f.starter]).flag === person.flag));
        default: return true;
      }
    }

    async function story(ev) {
      if (ev.type === "pc") {
        // (While Bill's helping Celio on One Island, the PCs can't reach his storage: FLAG_SYS_PC_STORAGE_DISABLED.)
        if (env.player.flags.pcStorageDisabled) { await env.say(env.T("OneIsland_PokemonCenter_1F_Text_UsualPCServicesUnavailable")); return; }
        env.sfx("se_pc_on");
        await env.say("{PLAYER} booted up the PC.");
        await env.pc();
        return;
      }
      if (ev.type === "trainer") {
        if (ev.second && await env.pairBattle(ev, ev.second)) return;
        const beaten = !!env.player.flags[ev.person.trainer.id];
        await env.trainerBattle(ev.person, ev.approach, ev.facing);
        if (!beaten) await env.afterRocket(ev.person);
        // (Their number, asked on the map once the battle screen's gone, as HGSS does: ui/pokegear.js.)
        if (!beaten && env.player.flags[ev.person.trainer.id] && env.gear.wantsNumber(ev.person)) { env.show("world"); await Overworld.resume(); await env.gear.beatTrainer(ev.person); }
        return;
      }
      if (ev.type === "hidden") {
        const h = ev.hidden;
        if (h.item === "coins") { await env.hiddenCoins(h); return; }
        Player.addItem(env.player, h.item, h.quantity);
        env.player.flags[h.flag] = true;
        await env.sayWithJingle(env.itemJingle(h.item), "{PLAYER} found " + (h.quantity > 1 ? h.quantity + " " : "a ") + Bag.name(h.item) + "!");
        return;
      }
      const script = (ev.person || ev.sign || ev.trigger).script;
      const f = env.player.flags;
      // (Orre: an e-mail due as you come in, Colosseum's: special() below found it, game/orre-mail.js.)
      if (ev.trigger && /^(arrive|enter):/.test(script || "") && env.orreMailWaiting) { await env.orreMail(); return; }
      if (await env.sinnohStory.run(script)) return;

      // (Mom's deliveryman, and the Gym Leaders' numbers and Dojo rematches: ui/pokegear.js.)
      if (ev.person && await env.gear.talkPerson(ev.person, ev.map)) return;
      if (ev.person && await env.berryFarm.talk(ev.person)) return;   // (Celadon's Berry Farm: ui/berry-farm.js)
      if (ev.person && await env.hoennBerries.talk(ev.person)) return;   // (Hoenn's trees)
      if (ev.person && await env.sinnohBerries.talk(ev.person)) return;   // (Sinnoh's)
      // (Hoenn's own: a sailor, the bedroom PCs, the Day Care.)
      if (script === "SlateportCity_Harbor_EventScript_Sailor") { await env.slateportSailor(); return; }
      if (env.isHoenn(ev.map || env.player.location.map) && /_EventScript_PC$/.test(script)) { await env.pc(); return; }
      if (script === "Route117_PokemonDayCare_EventScript_DaycareWoman") { await env.dayCareMan(); return; }
      if (script === "LilycoveCity_MoveDeletersHouse_EventScript_MoveDeleter") { await env.moveDeleter(); return; }
      if (script === "FallarborTown_MoveRelearnersHouse_EventScript_MoveRelearner") { await env.moveRelearner(); return; }
      // (The Delta Episode's scenes and people, and Jirachi's deck: this game's own.)
      if (env.deltaDue(script)) { await env.deltaScene(script); return; }
      if (env.isHoenn(ev.map || env.player.location.map) && await env.deltaTalk(script, ev)) return;
      if (await env.southernIsland(script)) return;
      // Hoenn's: Emerald's scripts (ui/hoenn-script.js), and its maps' scenes as you come in.
      if (/^(enter|arrive):/.test(script) && env.isHoenn(script.replace(/^\w+:/, ""))) {
        const due = env.hoenn.frameScript(script.replace(/^\w+:/, ""), /^enter:/.test(script));
        if (due) { await env.outOfDoorway(); await env.runHoenn(due, null); }
        return;
      }
      { const hs = env.hoennScriptFor(ev); if (hs) {
        // (A Hoenn Trainer you'd beaten: after what their script says, if it battled nothing (Emerald's own rematches
        // do), the rematch offer.)
        const t = ev.person && ev.person.trainer, was = t && !!env.player.flags[t.id], n = env.battleCount;
        await env.runHoenn(hs, ev.person);
        if (was && env.battleCount === n && env.TRAINER_SCRIPTS.has(script)) await env.trainerRematch(ev.person);
        return;
      } }

      // Johto's scripts (ui/johto-script.js), and its Apricorn trees.
      if (/^(enter|arrive):/.test(script)) { const due = env.johto.frameScript(script.replace(/^\w+:/, "")); if (due) { await env.outOfDoorway(); await env.runJohto(due, null); return; } }
      // (Ilex Forest's shrine, with the GS Ball: Crystal's Celebi.)
      if (script === "hgss:D36R0101:scr_seq_D36R0101_012" && Player.itemCount(env.player, "gs-ball") > 0 && !env.player.flags.gsBallCelebi) { await env.ilexShrineCelebi(); return; }
      // (Ilex Forest's Headbutt tutor: ui/johto-field.js.)
      if (script === "hgss:D36R0101:scr_seq_D36R0101_002") { await env.johtoField.headbuttTutor(); return; }
      { const js = env.johto.scriptOf(ev.person || ev.sign || ev.trigger); if (js) { await env.runJohto(js, ev.person); return; } }
      { const ap = /^hgss_apricorn:(\d+):(\w+)$/.exec(script || ""); if (ap) { await env.apricornTree(+ap[1], ap[2]); return; } }
      { const ar = /^Johto_AzaleaRide:(\d+)$/.exec(script || ""); if (ar) { await env.azaleaRide(+ar[1]); return; } }
      { const gp = /^Johto_GoldenrodPanel:(\d)$/.exec(script || ""); if (gp) { await env.goldenrodPanel(+gp[1]); return; } }
      if (script === "Johto_MagnetTrain") { await env.magnetTrainBoard(); return; }
      if (script === "Johto_SSAquaBoard") { await env.ssAquaBoard(); return; }
      // (Hoenn's Poké Mart clerks: their stock, from Emerald's scripts.)
      if (ev.person && ev.person.mart && /_Mart_EventScript_Clerk$/.test(script || "") && (window.WORLD_MAPS[ev.map] || {}).region === "hoenn") { await env.mart(ev.person.mart); return; }
      // (Sinnoh's, from the Essentials project: more for more Badges, any region's.)
      if (ev.person && ev.person.mart && /_Mart_EventScript_Clerk$/.test(script || "") && (window.WORLD_MAPS[ev.map] || {}).region === "sinnoh") {
        const tier = (ev.person.martTiers || []).find(([n]) => env.player.badges.length >= n);
        await env.mart(tier ? tier[1] : ev.person.mart);
        return;
      }
      if (script === "SandgemTown_EventScript_Sailor") { await env.sinnohSailor(); return; }
      if (ev.person && ev.person.ferry && env.isSinnoh(ev.map)) { await env.sinnohFerry(ev.person); return; }
      if (/_EventScript_FossilScientist$/.test(script || "") && env.isSinnoh(ev.map)) { await env.fossilScientist(); return; }
      // (Johto's Pokémon Centers' nurses heal as Kanto's do.)
      if (/_PokemonCenter_1F_EventScript_Nurse$/.test(script || "") && (window.WORLD_MAPS[ev.map] || {}).pokemonCenter) { await env.nurse(ev.map, ev.person); return; }

      // (Kanto's Gym Leaders' rematches, once you're Champion: leaderRematch.)
      if (env.KANTO_REMATCH[script] && await env.leaderRematch(env.KANTO_REMATCH[script])) return;
      if (script === "PewterCity_Gym_EventScript_Brock") { await env.brock(ev.person); return; }
      if (script === "CeruleanCity_Gym_EventScript_Misty") { await env.misty(ev.person); return; }
      if (script === "VermilionCity_Gym_EventScript_LtSurge") { await env.ltSurge(ev.person); return; }
      if (script === "CeladonCity_Gym_EventScript_Erika") { await env.erika(ev.person); return; }
      if (script === "SaffronCity_Gym_EventScript_Sabrina") { await env.sabrina(ev.person); return; }
      if (script === "FuchsiaCity_Gym_EventScript_Koga") { await env.koga(ev.person); return; }
      if (script === "CinnabarIsland_Gym_EventScript_Blaine") { await env.blaine(ev.person); return; }
      if (script === "ViridianCity_Gym_EventScript_Giovanni") { await env.giovanniGym(ev.person); return; }
      if (env.ELITE_FOUR_SCRIPTS.includes(script)) { await env.eliteFour(env.ELITE_FOUR_SCRIPTS.indexOf(script)); return; }
      if (/^enter:PokemonLeague_/.test(script)) { await env.leagueEnter(script.slice(6)); return; }
      { const g = /^Route23_EventScript_(\w+)BadgeGuard(Trigger)?$/.exec(script); if (g) { await env.badgeGuard(env.ROUTE23_BADGES.indexOf(g[1]) + 1, !!g[2], "LOCALID_" + g[1].toUpperCase() + "_BADGE_GUARD"); return; } }
      { const q = /^CinnabarIsland_Gym_EventScript_Quiz(\d)(Left|Right)$/.exec(script); if (q) { await env.cinnabarQuiz(+q[1], q[2]); return; } }
      if (env.FUCHSIA_SIGN_MONS[script]) { await env.monSign(env.FUCHSIA_SIGN_MONS[script], ev.sign.text); return; }
      if (env.BRAILLE_SIGNS[script]) { await env.say(env.BRAILLE_SIGNS[script].map(env.braille)); return; }
      if (/^SevenIsland_SevaultCanyon_TanobyKey_EventScript_Switch\d$/.test(script)) { await env.tanobyKeySwitch(script); return; }
      if (script === "Game_EventScript_Leaf") {
        if (!env.canBattle()) return;
        if (ev.map === "PewterCity") await env.leafPewter(true); else await env.leafVermilion();
        return;
      }
      // The Karate Master, beaten: choose a prized Pokémon (or train with them).
      if (script === "SaffronCity_Dojo_EventScript_MasterKoichi" && !env.trainerWaiting(ev.person)) {
        await env.dojoMaster();
        return;
      }
      // Gideon has the Sapphire (his battle's own ending: FiveIsland_RocketWarehouse_EventScript_DefeatedGideon).
      if (script === "FiveIsland_RocketWarehouse_EventScript_Gideon") { await env.gideon(ev.person); return; }
      if (env.TRAINER_SCRIPTS.has(script)) {
        if (env.trainerWaiting(ev.person)) {
          const beaten = !!f[ev.person.trainer.id];
          await env.trainerBattle(ev.person, null);
          if (!beaten) await env.afterRocket(ev.person);
          if (!beaten && f[ev.person.trainer.id] && env.gear.wantsNumber(ev.person)) { env.show("world"); await Overworld.resume(); await env.gear.beatTrainer(ev.person); }
          if (ev.person.trainer.id === env.DOJO_MASTER) await env.dojoDenDoor();
        } else {
          // (A Johto trainer with a phone: a rematch they called for, a gift, or asking for your number, then
          // "Rematch?" as anyone's.)
          const phone = await env.gear.talkTrainer(ev.person);
          if (phone === "asked") { await env.trainerRematch(ev.person); return; }
          if (phone) return;
          await env.say(env.dojoAfter(ev.person.trainer.id) || ev.person.trainer.after || ev.person.text || []);
          await env.trainerRematch(ev.person);
        }
        return;
      }

      if (ev.person && ev.person.item) {
        const item = ev.person.item;
        Player.addItem(env.player, item);
        f[ev.person.flag] = true;
        Overworld.removePerson(ev.person);   // (just the ball: everyone else stays where they are)
        await env.sayWithJingle(env.itemJingle(item), /^Game_EventScript_MegaStone_/.test(ev.person.script || "") ? "{PLAYER} found " + env.article(Bag.name(item)) + "!"
          : "{PLAYER} found " + env.article(Bag.name(item)) + "!");
        return;
      }

      if (env.STARTER_BALLS[script]) {
        const ball = env.STARTER_BALLS[script];
        if (f.starter) { await env.say("That's Prof. Oak's last Pokémon."); return; }
        if (!f.oakInLab) { await env.say(env.T("PalletTown_ProfessorOaksLab_Text_ThoseArePokeBalls")); return; }
        env.showPicture(ball.species);
        env.cry(ball.species);
        const yes = await env.confirm("So! You want the " + ball.kind + " Pokémon, " + ball.species + "?");
        env.hidePicture();
        if (!yes) return;
        Player.receive(env.player, Party.create(ball.species, env.STARTER_LEVEL));
        Overworld.removeObject(ball.id);
        await env.say("{PLAYER} received the " + ball.species + " from Prof. Oak!");
        // Leaf walks over to the Poké Ball that's weak against yours and takes it.
        // (FireRed's walk to Squirtle runs along the row you stand in, past
        // Bulbasaur's ball: with you there, she goes round, a row lower.)
        const theirs = env.RIVAL_PICK[ball.species];
        await env.say(["Leaf: Then I'll take this one!\nI think we'll get along great."]);
        const walk = theirs === "Squirtle" && ball.species === "Bulbasaur"
          ? ["walk_down", "walk_down", "walk_right", "walk_right", "walk_right", "walk_right", "walk_up"]
          : env.M("PalletTown_ProfessorOaksLab_Movement_RivalWalksTo" + theirs);
        await Overworld.act([{ who: env.LAB_RIVAL, moves: walk }]);
        Overworld.removeObject(env.ballOf(theirs).id);
        f.starter = ball.species;
        await env.say(env.LAB_RIVAL_NAME + " received the " + theirs + " from Prof. Oak!");
        return;
      }

      { const den = RaidDens.byScript(script); if (den) { await env.raidDen(den); return; } }
      if (env.SILPH_WORKERS[script]) { await env.say(env.T(env.SILPH_WORKERS[script][env.silphFreed() ? 1 : 0])); return; }
      if (env.SILPH_DOORS.includes(script)) { await env.silphDoor(script); return; }
      // (Out of Viridian Forest's north gate with the Tera Orb still to get: the aide comes out after you.)
      if (env.teraAideDue(script)) { await env.teraAide(); return; }
      if (script === "enter:Route23" && env.victoryRoadRivalDue()) { await env.victoryRoadRival(); return; }
      if (/^enter:/.test(script) && env.megaAideDue(script.slice(6))) { await env.megaAide(); return; }
      if ((script === "enter:PokemonTower_7F" || script === "Game_EventScript_MegaTower") && env.megaTowerDue()) { await env.megaTower(); return; }
      const can = /^VermilionCity_Gym_EventScript_TrashCan(\d+)$/.exec(script);
      if (can) { await env.trashCan(+can[1]); return; }
      const slots = /^CeladonCity_GameCorner_EventScript_SlotMachine(\d+)$/.exec(script);
      if (slots) { await env.slotMachine(+slots[1]); return; }

      if (Orre.FILLERS[script]) { await env.orreTrainer(script); return; }
      if (Orre.SHADOW_TRAINERS[script]) { await env.shadowTrainer(script); return; }
      if (Orre.PYRITE_SCRIPTS.includes(script)) { await env.pyriteExtra(script, ev); return; }
      if (Orre.COLO_TRAINERS[script]) { await env.coloTrainer(script); return; }
      if (Orre.LAB && Orre.LAB.scripts.has(script)) { await env.labObject(script); return; }
      if (script === "PhenacCity_PreGym_EventScript_Justy") { await env.preGymJusty(); return; }
      if (Orre.TOURNAMENTS[script]) { await env.orreTournament(script); return; }
      switch (script) {
        case "PalletTown_EventScript_SignLady":
          await env.signLady(ev.person);
          return;
        case "CenterUpstairs_EventScript_MoveRelearner": await env.moveRelearner(); return;
        case "CenterUpstairs_EventScript_MoveDeleter": await env.moveDeleter(); return;
        case "PalletTown_EventScript_SignLadyTrigger":
          // Walking past her by the north exit, she shows you what she copied.
          if (!f.starter || f.signLady) return;
          await Overworld.act([{ who: env.SIGN_LADY, moves: env.M("Common_Movement_WalkInPlaceFasterRight") },
            { who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterLeft") }]);
          await env.signLadyShowSign();
          return;
        case "PalletTown_EventScript_TrainerTips":
          await env.say(ev.sign.text);
          if (!f.signLady) f.signLady = 1;
          return;

        case "PalletTown_PlayersHouse_1F_EventScript_Mom":
          if (!env.player.party.length) {
            // She's Red's mom: he's already on his way. After the first time,
            // just the last part.
            if (f.metRedsMom) await env.say(["Red's Mom: If you want a Pokémon of\nyour own, go see Prof. Oak."]);
            else await env.say(["Red's Mom: …Right.\nAll boys leave home someday.\nIt said so on TV.",
              "My son Red has already begun his\njourney. He should be in Viridian\nForest by now.",
              "If you want a Pokémon of your own,\ngo see Prof. Oak."]);
            f.metRedsMom = true;
            return;
          }
          // (This game's own: home as the new Champion, she's heard. FireRed's
          // Mom has nothing new to say after the Hall of Fame.)
          if (f.gameClear && !f.momHeardChampion) {
            f.momHeardChampion = true;
            await env.say(["Red's Mom: {PLAYER}! Welcome home!\nI saw it on TV!",
              "You're the new Pokémon League\nChampion! I'm so proud of you!"]);
          }
          // (Once she's on the Pokégear, your savings with her: HGSS's Mom's bank, ui/pokegear.js.)
          if (await env.gear.momHome()) return;
          await env.say("Red's Mom: Oh, {PLAYER}! You look worn out.\nYou and your Pokémon should take a\nquick rest.");
          await env.outOfCenterHeal();
          await env.say("Red's Mom: There! You and your Pokémon\nare looking great. Take care now!");
          return;

        // The woman on the S.S. Anne who lets you rest.
        case "SSAnne_1F_Room6_EventScript_Woman":
          if (!(await env.confirm(env.T("SSAnne_1F_Room6_Text_TakeAShortRest")[0]))) {
            await env.say(env.T(Player.LOOKS[env.player.look] && Player.LOOKS[env.player.look].girl
              ? "SSAnne_1F_Room6_Text_SorryYouLookLikeMySister" : "SSAnne_1F_Room6_Text_SorryYouLookLikeMyBrother"));
            return;
          }
          await env.outOfCenterHeal();
          await env.say(env.T("SSAnne_1F_Room6_Text_GladEveryoneIsRefreshed"));
          return;

        // The woman in Vermilion's Pokémon Center who gave you FireRed's VS Seeker: there's none in this game, a
        // Trainer you've beaten offers a rematch when you talk to them (trainerRematch).
        case "VermilionCity_PokemonCenter_1F_EventScript_VSSeekerWoman":
          await env.say(["Do you ever get the urge to battle a\nTrainer you've beaten before?", "Just go and talk to them! Trainers love\na rematch. They'll battle you again\nany time you ask."]);
          return;

        case "PalletTown_PlayersHouse_2F_EventScript_PC":
          // Your own PC at home holds items, as in FireRed (BedroomPC).
          env.sfx("se_pc_on");
          await env.say("{PLAYER} booted up the PC.");
          await env.playersPc();
          env.sfx("se_pc_off");
          return;

        case "PalletTown_EventScript_OakTriggerLeft":
        case "PalletTown_EventScript_OakTriggerRight":
          if (env.player.party.length || f.oakInLab) return;
          await env.oakWalksYouToTheLab(script.endsWith("Left") ? "Left" : "Right");
          return;

        // Leaving the lab before choosing a Pokémon.
        case "PalletTown_ProfessorOaksLab_EventScript_LeaveStarterSceneTrigger":
          if (f.oakInLab && !f.starter) {
            await env.say(env.T("PalletTown_ProfessorOaksLab_Text_OakHeyDontGoAwayYet"));
            Overworld.forceStep("up");
            return;
          }
          // with a Pokémon, the rival battle trigger on the same tile takes over
        // falls through
        case "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerLeft":
        case "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerMid":
        case "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerRight": {
          if (!f.starter || f.rivalLabBattle || !env.player.party.length) return;
          await env.rivalLabBattle(ev.trigger.x);
          return;
        }

        // Leaf, waiting in the lab before Oak walks you there: she introduces
        // herself, then wonders where he is.
        case "PalletTown_ProfessorOaksLab_EventScript_Rival":
          if (!f.oakInLab && !f.starter && !f.metLeaf) {
            await env.say(["Leaf: Oh, hey! What's your name?\n{PLAYER}?",
              "Leaf: My name's Leaf! I'm here to get my\nstarter Pokémon, but Prof. Oak is not\naround."]);
            f.metLeaf = true;
          } else if (!f.oakInLab && !f.starter) await env.say(["Leaf: I wonder where he is?"]);
          else if (!f.starter) await env.say(["Leaf: You go ahead and choose first,\n{PLAYER}! I don't mind waiting."]);
          else await env.say(["Leaf: Your Pokémon looks really\ncute! Mine's pretty great, too."]);
          return;

        case "PalletTown_ProfessorOaksLab_EventScript_ProfOak":
          if (!f.starter) await env.say(ev.person.text);
          else if (f.orreStory >= 1) await env.oakOrre();
          else if (f.gameClear && !f.gotGsBall) await env.oakGsBall();
          else if (f.oaksParcel && !f.parcelDelivered) await env.pokedexScene();
          else if (f.parcelDelivered) await env.say(env.T("PalletTown_ProfessorOaksLab_Text_OakMonsAroundWorldWait"));
          else if (!f.rivalLabBattle) await env.say(env.T("PalletTown_ProfessorOaksLab_Text_OakCanReachNextTownWithMon"));
          else await env.say(env.T("PalletTown_ProfessorOaksLab_Text_OakBattleMonForItToGrow"));
          return;

        case "PalletTown_RivalsHouse_EventScript_Daisy":
          // The first time you talk, she introduces herself and gives you the
          // Town Map off the wall.
          if (f.townMap) await env.say(env.T("PalletTown_RivalsHouse_Text_ExplainTownMap"));
          else {
            await env.say(["Daisy: Oh, hi! I don't think we've\nmet. I'm Daisy, {RIVAL}'s older\nsister.",
              "Our grandpa is Prof. Oak. His lab\nis just down the road.",
              "Here, take this.\nIt'll help you find your way around."]);
            await Overworld.act([{ who: "LOCALID_DAISY", moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
            Overworld.removeObject("LOCALID_TOWN_MAP");
            await Overworld.act([{ who: "LOCALID_DAISY", moves: env.M("Common_Movement_FacePlayer") }]);
            Player.addItem(env.player, "town-map");
            f.townMap = true;
            await env.say(env.T("PalletTown_RivalsHouse_Text_ReceivedTownMapFromDaisy"));
          }
          return;

        // ---------- Viridian City ----------

        case "ViridianCity_EventScript_RoadBlocked":
          if (f.parcelDelivered) return;
          await env.say(env.T("ViridianCity_Text_ThisIsPrivateProperty"));
          Overworld.forceStep("down");
          return;

        // He turns to you and you to him (FireRed's TutorialTriggerLeft/Right).
        case "ViridianCity_EventScript_TutorialTriggerLeft":
        case "ViridianCity_EventScript_TutorialTriggerRight": {
          if (!f.parcelDelivered || f.catchTutorial) return;
          const left = script.endsWith("Left");
          await Overworld.act([{ who: "LOCALID_TUTORIAL_MAN", moves: env.M(left ? "Common_Movement_WalkInPlaceFasterLeft" : "Common_Movement_WalkInPlaceFasterRight") }]);
          await Overworld.act([{ who: "player", moves: env.M(left ? "Common_Movement_WalkInPlaceFasterRight" : "Common_Movement_WalkInPlaceFasterLeft") }]);
          await env.catchTutorial();
          return;
        }

        case "ViridianCity_EventScript_TutorialOldMan":
          if (!f.parcelDelivered) await env.say(env.T("ViridianCity_Text_ThisIsPrivateProperty"));
          else if (!f.catchTutorial) await env.catchTutorial();
          else await env.say(env.T("ViridianCity_Text_WeakenMonsFirstToCatch"));
          return;

        case "ViridianCity_EventScript_Woman":
          await env.say(f.parcelDelivered ? ev.person.text : env.T("ViridianCity_Text_GrandpaHasntHadCoffeeYet"));
          return;

        case "ViridianCity_EventScript_Youngster":
          await env.say(env.T(await env.confirm(env.fill(env.T("ViridianCity_Text_WantToKnowAboutCaterpillarMons").join(" ")))
            ? "ViridianCity_Text_ExplainCaterpieWeedle" : "ViridianCity_Text_OhOkayThen"));
          return;

        case "ViridianCity_EventScript_DreamEaterTutor":
          await env.moveTutor("Dream Eater", "tutorDreamEater", "Text_DreamEater");
          return;
        // Lavender Town: the girl asking whether you believe in ghosts.
        case "LavenderTown_EventScript_LittleGirl":
          await env.say(env.T(await env.confirm(env.T("LavenderTown_Text_DoYouBelieveInGhosts")[0])
            ? "LavenderTown_Text_SoThereAreBelievers" : "LavenderTown_Text_JustImaginingWhiteHand"));
          return;
        case "LavenderTown_House2_EventScript_NameRater":
          await env.nameRater();
          return;
        // Rock Tunnel B1F's Rock Slide tutor.
        case "RockTunnel_B1F_EventScript_RockSlideTutor":
          await env.moveTutor("Rock Slide", "tutorRockSlide", "Text_RockSlide");
          return;
        // Prof. Oak's Aide in Route 10's Pokémon Center: the Everstone for twenty kinds caught.
        case "Route10_PokemonCenter_1F_EventScript_Aide":
          await env.aideGift({ needed: 20, item: "everstone", flag: "gotEverstone", text: "Route10_PokemonCenter_1F_Text_",
            ask: "GiveEverstoneIfCaught20Mons", received: "ReceivedEverstoneFromAide", explain: "ExplainEverstone" });
          return;

        // FireRed's parcel scene: the clerk calls out, you walk up to the counter.
        case "enter:PewterCity":
          await env.leafPewter();
          return;

        case "enter:ViridianCity_Mart": {
          if (f.oaksParcel) return;
          const CLERK = "LOCALID_VIRIDIAN_MART_CLERK";
          await Overworld.act([{ who: CLERK, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
          await env.say(env.T("ViridianCity_Mart_Text_YouCameFromPallet"));
          await Overworld.act([
            { who: CLERK, moves: env.M("ViridianCity_Mart_Movement_FacePlayer") },
            { who: "player", moves: env.M("ViridianCity_Mart_Movement_ApproachCounter") }]);
          await env.say(env.T("ViridianCity_Mart_Text_TakeThisToProfOak"));
          f.oaksParcel = true;
          Player.addItem(env.player, "oaks-parcel");
          await env.say(env.T("ViridianCity_Mart_Text_ReceivedOaksParcelFromClerk"));
          return;
        }

        case "ViridianCity_Mart_EventScript_Clerk":
          if (!f.parcelDelivered) { await env.say(env.T("ViridianCity_Mart_Text_SayHiToOakForMe")); return; }
          await env.mart(ev.person.mart);
          return;

        case "ViridianCity_PokemonCenter_1F_EventScript_Nurse":
          await env.nurse(ev.map, ev.person);
          return;

        case "Common_EventScript_UnionRoomAttendant":
        case "Common_EventScript_WirelessClubAttendant":
          await env.say(env.T("Text_WirelessClubUndergoingAdjustments"));
          return;
        case "Common_EventScript_DirectCornerAttendant":
          await env.directCorner();
          return;

        // ---------- Route 22 ----------

        // Your rival is waiting on Route 22 once you have the Pokédex.
        case "Route22_EventScript_EarlyRivalTriggerTop":
        case "Route22_EventScript_EarlyRivalTriggerMid":
        case "Route22_EventScript_EarlyRivalTriggerBottom":
          if (f.pokedex && !f.route22Rival) await env.route22Rival(script.replace("Route22_EventScript_EarlyRivalTrigger", ""));
          return;

        // The League gate: the guard checks for the Boulder Badge (FireRed's
        // Route22_NorthEntrance_EventScript_BadgeGuard, as Route 23's guards).
        case "Route22_NorthEntrance_EventScript_BoulderBadgeGuardTrigger":
        case "Route22_NorthEntrance_EventScript_BoulderBadgeGuard":
          await env.badgeGuard(1, script.endsWith("Trigger"), "#0");
          return;

        // Gary again, on your way to the League with all eight Badges.
        case "Route22_EventScript_LateRivalTriggerTop":
        case "Route22_EventScript_LateRivalTriggerMid":
        case "Route22_EventScript_LateRivalTriggerBottom":
          await env.route22LateRival(script.replace("Route22_EventScript_LateRivalTrigger", ""));
          return;

        // ---------- Viridian City's Gym ----------
        // Locked until you have the other Badges (ViridianCity_OnTransition's
        // TryUnlockGym: the Cascade to the Volcano Badge).
        case "ViridianCity_EventScript_GymDoorLocked":
          await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterUp") }]);
          await env.sleep(333);
          await env.say(env.T("ViridianCity_Text_GymDoorsAreLocked"));
          Screen.say("");
          await Overworld.act([{ who: "player", moves: env.M("ViridianCity_Movement_JumpDownLedge") }]);
          return;
        case "ViridianCity_EventScript_OldMan":
          if (env.viridianGymOpen()) { await env.say(env.T("ViridianCity_Text_ViridiansGymLeaderReturned")); return; }
          await env.say(env.T("ViridianCity_Text_GymClosedWonderWhoLeaderIs"));
          Screen.say("");
          await env.faceBack(ev.person);
          return;
        case "ViridianCity_Gym_EventScript_GymGuy":
          await env.say(env.T(f.TRAINER_LEADER_GIOVANNI ? "ViridianCity_Gym_Text_GymGuyPostVictory" : "ViridianCity_Gym_Text_GymGuyAdvice"));
          return;
        case "ViridianCity_Gym_EventScript_GymStatue":
          await env.say(env.T(env.hasBadge("earth") ? "ViridianCity_Gym_Text_GymStatuePlayerWon" : "ViridianCity_Gym_Text_GymStatue"));
          return;

        // ---------- The Power Plant ----------
        case "PowerPlant_EventScript_Zapdos":
          await env.legendaryBird(ev.person, "Zapdos", "foughtZapdos");
          return;
        case "PowerPlant_EventScript_Electrode1":
        case "PowerPlant_EventScript_Electrode2":
          await env.powerPlantElectrode(ev.person, script.slice(-1));
          return;

        // ---------- Victory Road and Indigo Plateau ----------
        case "VictoryRoad_2F_EventScript_DoubleEdgeTutor":
          await env.moveTutor("Double-Edge", "tutorDoubleEdge", "Text_DoubleEdge");
          return;
        case "IndigoPlateau_PokemonCenter_1F_EventScript_Nurse":
          await env.nurse(ev.map, ev.person);
          return;
        case "IndigoPlateau_PokemonCenter_1F_EventScript_Clerk":
          await env.mart(ev.person.mart);
          return;
        // The Elite Four's door: once you're Champion, it's closed until the
        // Sapphire's in Celio's machine (Sevii.leagueClosed).
        case "IndigoPlateau_PokemonCenter_1F_EventScript_DoorGuard":
          await env.say(env.T(Sevii.leagueClosed(f) ? "IndigoPlateau_PokemonCenter_1F_Text_LoreleiIsAbsentClosedForTimeBeing"
            : "IndigoPlateau_PokemonCenter_1F_Text_FaceEliteFourGoodLuck"));
          return;

        // ---------- Pewter City ----------

        // Before you have Brock's badge, a boy marches you to the Gym if you
        // head for the east exit, or if you talk to him.
        case "PewterCity_EventScript_GymGuideTriggerTop":
        case "PewterCity_EventScript_GymGuideTriggerMid":
        case "PewterCity_EventScript_GymGuideTriggerBottom":
          if (!f.TRAINER_LEADER_BROCK) await env.gymGuide(script.replace("PewterCity_EventScript_GymGuideTrigger", ""));
          return;
        case "PewterCity_EventScript_GymGuide":
          await env.gymGuide(Overworld.position().facing === "right" ? "East" : "Top", true);
          return;

        case "PewterCity_EventScript_MuseumGuide": {
          if (await env.confirm(env.fill(env.T("PewterCity_Text_DidYouCheckOutMuseum")[0]))) { await env.say(env.T("PewterCity_Text_WerentThoseFossilsAmazing")); return; }
          await env.say(env.T("PewterCity_Text_ReallyYouHaveToGo"));
          const side = { up: "North", down: "South", left: "West", right: "East" }[Overworld.position().facing];
          const GUIDE = "LOCALID_PEWTER_MUSEUM_GUIDE";
          await Overworld.act([{ who: GUIDE, moves: ["delay_10"].concat(env.M("PewterCity_Movement_GuideWalkToMuseum" + side)) },
            { who: "player", moves: ["delay_10"].concat(env.M("PewterCity_Movement_PlayerWalkToMuseum" + side)) }]);
          await env.say(env.T("PewterCity_Text_ThisIsTheMuseum"));
          await Overworld.act([{ who: GUIDE, moves: ["delay_10"].concat(env.M("PewterCity_Movement_MuseumGuideExit")) }]);
          Overworld.removeObject(GUIDE);
          return;
        }

        case "PewterCity_EventScript_BugCatcher":
          await env.say(env.T((await env.confirm(env.fill(env.T("PewterCity_Text_DoYouKnowWhatImDoing").join(" "))))
            ? "PewterCity_Text_ThatsRightItsHardWork" : "PewterCity_Text_SprayingRepelToKeepWildMonsOut"));
          return;

        // The Museum: ₽50 a visit, paid at the counter as you walk in.
        case "PewterCity_Museum_1F_EventScript_EntranceTriggerLeft":
        case "PewterCity_Museum_1F_EventScript_EntranceTriggerMid":
        case "PewterCity_Museum_1F_EventScript_EntranceTriggerRight": {
          if (f.museumTicket) return;
          await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
          const ask_ = env.T("PewterCity_Museum_1F_Text_Its50YForChildsTicket");
          await env.say(ask_.slice(0, -1));
          const yes = await env.confirm(env.fill(ask_[ask_.length - 1]) + "\n(You have " + env.money(env.player.money) + ".)");
          if (yes && env.player.money >= 50) {
            const side = script.replace("PewterCity_Museum_1F_EventScript_EntranceTrigger", "");
            await Overworld.act([{ who: "player", moves: env.M("PewterCity_Museum_1F_Movement_ApproachCounter" + side) }]);
            Player.addMoney(env.player, -50);
            f.museumTicket = true;
            await env.say(env.T("PewterCity_Museum_1F_Text_Right50YThankYou"));
          } else {
            await env.say(env.T(yes ? "PewterCity_Museum_1F_Text_DontHaveEnoughMoney" : "PewterCity_Museum_1F_Text_ComeAgain"));
            await Overworld.act([{ who: "player", moves: env.M("PewterCity_Museum_1F_Movement_ForcePlayerExit") }]);
          }
          return;
        }

        // Behind the counter he tells you about Amber; at the counter, enjoy yourself.
        case "PewterCity_Museum_1F_EventScript_Scientist1":
          if (Overworld.position().facing === "right") { await env.say(env.T("PewterCity_Museum_1F_Text_PleaseEnjoyYourself")); return; }
          await env.say(env.T("PewterCity_Museum_1F_Text_DoYouKnowWhatAmberIs").slice(0, -1));
          await env.say(env.T((await env.confirm(env.fill(env.T("PewterCity_Museum_1F_Text_DoYouKnowWhatAmberIs").slice(-1)[0])))
            ? "PewterCity_Museum_1F_Text_AmberContainsGeneticMatter" : "PewterCity_Museum_1F_Text_AmberIsFossilizedSap"));
          await Overworld.act([{ who: "LOCALID_MUSEUM_SCIENTIST1", moves: ["face_left"] }]);
          return;

        case "PewterCity_Museum_1F_EventScript_OldAmberScientist":
          if (f.gotOldAmber) { await env.say(env.T("PewterCity_Museum_1F_Text_GetOldAmberChecked")); return; }
          await env.say(env.T("PewterCity_Museum_1F_Text_WantYouToGetAmberExamined"));
          f.gotOldAmber = true;
          Overworld.removeObject("LOCALID_OLD_AMBER");
          Player.addItem(env.player, "old-amber");
          await env.say(env.T("PewterCity_Museum_1F_Text_ReceivedOldAmberFromMan"));
          return;

        case "PewterCity_Museum_1F_EventScript_SeismicTossTutor":
          await env.moveTutor("Seismic Toss", "tutorSeismicToss", "Text_SeismicToss");
          return;

        // The fossils, shown as FireRed does (OpenMuseumFossilPic).
        case "PewterCity_Museum_1F_EventScript_AerodactylFossil":
        case "PewterCity_Museum_1F_EventScript_KabutopsFossil": {
          const species = script.endsWith("AerodactylFossil") ? "Aerodactyl" : "Kabutops";
          env.showPicture(species);
          await env.say(ev.sign.text);
          env.hidePicture();
          return;
        }

        case "PewterCity_Gym_EventScript_GymGuy":
          if (f.TRAINER_LEADER_BROCK) { await env.say(env.T("PewterCity_Gym_Text_YoureChampMaterial")); return; }
          await env.say(env.T("PewterCity_Gym_Text_LetMeTakeYouToTheTop").slice(0, -1));
          await env.say(env.T((await env.confirm(env.fill(env.T("PewterCity_Gym_Text_LetMeTakeYouToTheTop").slice(-1)[0])))
            ? "PewterCity_Gym_Text_LetsGetHappening" : "PewterCity_Gym_Text_ItsFreeLetsGetHappening"));
          await env.say(env.T("PewterCity_Gym_Text_TryDifferentPartyOrders"));
          return;

        case "PewterCity_Gym_EventScript_GymStatue":
          await env.say(env.T(env.hasBadge("boulder") ? "PewterCity_Gym_Text_GymStatuePlayerWon" : "PewterCity_Gym_Text_GymStatue"));
          return;

        case "PewterCity_Mart_EventScript_Clerk":
          await env.mart(ev.person.mart);
          return;

        // ---------- Cerulean City ----------

        case "CeruleanCity_Gym_EventScript_GymGuy":
          await env.say(env.T(f.TRAINER_LEADER_MISTY ? "CeruleanCity_Gym_Text_WeMakePrettyGoodTeam" : "CeruleanCity_Gym_Text_GymGuyAdvice"));
          return;
        case "CeruleanCity_Gym_EventScript_GymStatue":
          await env.say(env.T(env.hasBadge("cascade") ? "CeruleanCity_Gym_Text_GymStatuePlayerWon" : "CeruleanCity_Gym_Text_GymStatue"));
          return;
        case "CeruleanCity_Mart_EventScript_Clerk":
          await env.mart(ev.person.mart);
          return;
        // The Badge guy: which of the eight Badges should he describe?
        case "CeruleanCity_House1_EventScript_BadgeGuy": {
          await env.say(env.T("CeruleanCity_House1_Text_BadgesHaveAmazingSecrets"));
          const BADGES = [["Boulder", "AttackStatFlash"], ["Cascade", "ObeyLv30Cut"], ["Thunder", "SpeedStatFly"],
            ["Rainbow", "ObeyLv50Strength"], ["Soul", "DefenseStatSurf"], ["Marsh", "ObeyLv70RockSmash"],
            ["Volcano", "SpStatsWaterfall"], ["Earth", "AllMonsWillObeyYou"]];
          const which = env.T("CeruleanCity_House1_Text_DescribeWhichBadge");
          await env.say(which.slice(0, -1));
          for (;;) {
            const v = await env.ask(which[which.length - 1], BADGES.map(([b], i) => ({ label: b + " Badge", value: i }))
              .concat([{ label: "Cancel", value: "back", className: "action", wide: true }]));
            if (v === "back") break;
            await env.say(env.T("CeruleanCity_House1_Text_" + BADGES[v][1]));
          }
          await env.say(env.T("CeruleanCity_House1_Text_ComeVisitAnytime"));
          return;
        }
        case "CeruleanCity_House3_EventScript_Dontae":
          await env.inGameTrade(env.TRADES.zynx);
          return;
        // The Bike Shop: a Bicycle is ¥1,000,000 (and FireRed never sells you one).
        case "CeruleanCity_BikeShop_EventScript_Clerk": {
          if (f.gotBicycle) { await env.say(env.T("CeruleanCity_BikeShop_Text_HowDoYouLikeNewBicycle")); return; }
          // With the Fan Club Chairman's Bike Voucher, it's free.
          if (Player.itemCount(env.player, "bike-voucher")) {
            await env.say(env.T("CeruleanCity_BikeShop_Text_OhBikeVoucherHereYouGo"));
            Player.removeItem(env.player, "bike-voucher");
            Player.addItem(env.player, "bicycle");
            f.gotBicycle = true;
            await env.sayWithJingle("mus_obtain_key_item", env.T("CeruleanCity_BikeShop_Text_ExchangedVoucherForBicycle"));
            await env.say(env.T("CeruleanCity_BikeShop_Text_ThankYouComeAgain"));
            return;
          }
          await env.say(env.T("CeruleanCity_BikeShop_Text_WelcomeToBikeShop"));
          const v = await env.ask("", [{ label: "Bicycle  ¥1,000,000", value: "bike", className: "action", wide: true },
            { label: "Cancel", value: "back", className: "action", wide: true }]);
          if (v === "bike") await env.say(env.T("CeruleanCity_BikeShop_Text_SorryYouCantAffordIt"));
          await env.say(env.T("CeruleanCity_BikeShop_Text_ThankYouComeAgain"));
          return;
        }
        case "CeruleanCity_House5_EventScript_BerryPowderMan": await env.berryPowderMan(); return;
        case "CeruleanCity_House5_EventScript_BerryCrushRankings":
          await env.berryCrushRankings();
          return;

        case "PewterCity_PokemonCenter_1F_EventScript_Nurse":
          await env.nurse(ev.map, ev.person);
          return;

        case "MysteryEventClub_EventScript_Woman":   // no Mystery Events here
          await env.say(env.T("Text_WirelessClubUndergoingAdjustments"));
          return;

        // ---------- Route 4 and Mt. Moon ----------

        case "Route4_EventScript_MegaPunchTutor":
          await env.moveTutor("Mega Punch", "tutorMegaPunch", "Text_MegaPunch");
          return;
        case "Route4_EventScript_MegaKickTutor":
          await env.moveTutor("Mega Kick", "tutorMegaKick", "Text_MegaKick");
          return;

        case "Route4_PokemonCenter_1F_EventScript_Nurse":
        case "Route10_PokemonCenter_1F_EventScript_Nurse":
        case "LavenderTown_PokemonCenter_1F_EventScript_Nurse":
          await env.nurse(ev.map, ev.person);
          return;

        // ₽500 for a Magikarp, once.
        case "Route4_PokemonCenter_1F_EventScript_MagikarpSalesman": {
          if (f.boughtMagikarp) { await env.say(env.T("Route4_PokemonCenter_1F_Text_IDontGiveRefunds")); return; }
          const pitch = env.T(Player.LOOKS[env.player.look].girl ? "Route4_PokemonCenter_1F_Text_SweetieBuyMagikarpForJust500" : "Route4_PokemonCenter_1F_Text_LaddieBuyMagikarpForJust500");
          await env.say(pitch.slice(0, -1));
          if (!(await env.confirm(env.fill(pitch[pitch.length - 1]) + "\n(You have " + env.money(env.player.money) + ".)"))) { await env.say(env.T("Route4_PokemonCenter_1F_Text_OnlyDoingThisAsFavorToYou")); return; }
          if (env.player.money < 500) { await env.say(env.T("Route4_PokemonCenter_1F_Text_YoullNeedMoreMoney")); return; }
          if (env.player.party.length >= Player.PARTY_SIZE && !env.player.boxes.some((b) => Player.firstEmpty(b) >= 0)) { await env.say(env.T("Route4_PokemonCenter_1F_Text_NoRoomForMorePokemon")); return; }
          Player.addMoney(env.player, -500);
          f.boughtMagikarp = true;
          await env.say(env.T("Route4_PokemonCenter_1F_Text_PaidOutrageouslyForMagikarp"));
          await env.addCaught(Party.create("Magikarp", 5));
          return;
        }

        // ---------- Cerulean City, Routes 24 and 25 ----------
        case "CeruleanCity_EventScript_RivalTriggerLeft":
        case "CeruleanCity_EventScript_RivalTriggerMid":
        case "CeruleanCity_EventScript_RivalTriggerRight":
          if (!f.ceruleanRival && env.canBattle()) await env.ceruleanRival(script.replace("CeruleanCity_EventScript_RivalTrigger", ""));
          return;
        case "CeruleanCity_PokemonCenter_1F_EventScript_Nurse":
          await env.nurse(ev.map, ev.person);
          return;
        case "Route24_EventScript_Rocket":
          if (f.nuggetBridgeRocket) await env.say(env.T("Route24_Text_YoudBecomeTopRocketLeader"));
          else await env.nuggetBridgeRocket(null);
          return;
        case "Route24_EventScript_RocketTriggerLeft":
        case "Route24_EventScript_RocketTriggerRight":
          if (!f.nuggetBridgeRocket && env.canBattle()) await env.nuggetBridgeRocket(/Left$/.test(script) ? "left" : "right");
          return;
        case "Route25_SeaCottage_EventScript_Bill":
          await env.bill(ev.person);
          return;
        case "Route25_SeaCottage_EventScript_Computer":
          await env.billsComputer();
          return;

        // ---------- Cerulean's robbed house, Routes 5 and 9 ----------
        case "CeruleanCity_EventScript_Grunt":
          await env.ceruleanGrunt(null);
          return;
        case "CeruleanCity_EventScript_GruntTriggerTop":
        case "CeruleanCity_EventScript_GruntTriggerBottom":
          if (!f.gotTM28 && env.canBattle()) await env.ceruleanGrunt(/Top$/.test(script) ? "top" : "bottom");
          return;
        case "EventScript_CutTree":
          await env.cutTree(ev.person);
          return;
        case "EventScript_RockSmash":
          await env.rockSmash(ev.person);
          return;
        case "EventScript_StrengthBoulder":
          await env.strengthBoulder();
          return;
        case "Route5_PokemonDayCare_EventScript_DaycareMan":
          await env.dayCareMan();
          return;
        case "UndergroundPath_NorthEntrance_EventScript_Saige":
          await env.inGameTrade(env.TRADES.msNido);
          return;
        // ---------- Pokémon Tower ----------
        case "PokemonTower_2F_EventScript_RivalTriggerRight":
        case "PokemonTower_2F_EventScript_RivalTriggerDown":
          await env.towerRival(script.endsWith("Right"));
          return;
        // 5F: the purified zone heals your party (each time you step back in).
        case "PokemonTower_5F_EventScript_PurifiedZone":
          env.inPurifiedZone = true;
          Screen.say("");
          await Overworld.fadeToBlack();
          env.player.party.forEach(Party.heal);
          await Overworld.fadeFromBlack();
          await env.say(env.T("PokemonTower_5F_Text_PurifiedZoneMonsFullyHealed"));
          return;
        case "PokemonTower_6F_EventScript_MarowakGhost":
          await env.marowakGhost();
          return;
        case "PokemonTower_7F_EventScript_MrFuji":
          await env.say(env.T("PokemonTower_7F_Text_MrFujiThankYouFollowMe"));
          f.rescuedMrFuji = true;
          await Overworld.teleport({ map: "LavenderTown_VolunteerPokemonHouse", x: 4, y: 7, facing: "up" });
          return;
        // Back home, Mr. Fuji gives you the Poké Flute.
        case "LavenderTown_VolunteerPokemonHouse_EventScript_MrFuji": {
          const V = (k) => env.T("LavenderTown_VolunteerPokemonHouse_Text_" + k);
          if (f.gotPokeFlute) { await env.say(V("HasPokeFluteHelpedYou")); return; }
          await env.say(V("IdLikeYouToHaveThis"));
          Player.addItem(env.player, "poke-flute");
          f.gotPokeFlute = true;
          await env.sayWithJingle("mus_obtain_key_item", V("ReceivedPokeFluteFromMrFuji"));
          await env.say(V("ExplainPokeFlute"));
          return;
        }

        // ---------- Route 7 and the Saffron gates ----------
        // The guards are thirsty: give one the Tea and all four let you through
        // (FireRed's VAR_MAP_SCENE_ROUTE5_ROUTE6_ROUTE7_ROUTE8_GATES).
        case "Route5_SouthEntrance_EventScript_GuardTriggerLeft":
        case "Route5_SouthEntrance_EventScript_GuardTriggerMid":
        case "Route5_SouthEntrance_EventScript_GuardTriggerRight":
        case "Route6_NorthEntrance_EventScript_GuardTriggerLeft":
        case "Route6_NorthEntrance_EventScript_GuardTriggerMid":
        case "Route6_NorthEntrance_EventScript_GuardTriggerRight":
        case "Route7_EastEntrance_EventScript_GuardTriggerTop":
        case "Route7_EastEntrance_EventScript_GuardTriggerMid":
        case "Route7_EastEntrance_EventScript_GuardTriggerBottom":
        case "Route8_WestEntrance_EventScript_GuardTriggerTop":
        case "Route8_WestEntrance_EventScript_GuardTriggerMid":
        case "Route8_WestEntrance_EventScript_GuardTriggerBottom": {
          const [, gate, side] = /^(\w+?)_EventScript_GuardTrigger(\w+)$/.exec(script);
          const face = { Route5_SouthEntrance: "Left", Route6_NorthEntrance: "Right", Route7_EastEntrance: "Up", Route8_WestEntrance: "Up" }[gate];
          await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFaster" + face) }]);
          if (f.gotTea && Player.itemCount(env.player, "tea")) {
            Player.removeItem(env.player, "tea");
            await env.say(env.T(gate + "_Text_ThatTeaLooksTasty"));
            await Overworld.act([{ who: "player", moves: env.M(gate + "_Movement_WalkToGuard" + side) }]);
            await env.say(env.T(gate + "_Text_ThanksIllShareTeaWithGuards"));
            f.gatesOpen = true;
            return;
          }
          await env.say(env.T(gate + "_Text_ThirstyOnGuardDuty"));
          await Overworld.act([{ who: "player", moves: env.M(gate + "_Movement_BlockPlayerEntry") }]);
          return;
        }

        // ---------- Celadon City ----------
        case "CeladonCity_PokemonCenter_1F_EventScript_Nurse":
          await env.nurse(ev.map, ev.person);
          return;
        // (This game's own TM counter: FireRed's Hyper Beam, and Dark Pulse, Flash Cannon, Stone Edge and Dazzling Gleam; its other
        // TMs, Roar, Dig, Brick Break, Secret Power and Attract, are found elsewhere in Kanto.)
        case "CeladonCity_DepartmentStore_2F_EventScript_ClerkTMs":
          await env.mart(env.CELADON_TMS);
          return;
        case "CeladonCity_DepartmentStore_2F_EventScript_ClerkItems":
        case "CeladonCity_DepartmentStore_4F_EventScript_Clerk":
        case "CeladonCity_DepartmentStore_5F_EventScript_ClerkXItems":
          await env.mart(ev.person.mart);
          return;
        // (Beside the vitamins, this game's Wings.)
        case "CeladonCity_DepartmentStore_5F_EventScript_ClerkVitamins":
          await env.mart(ev.person.mart.concat(["health-wing", "muscle-wing", "resist-wing", "genius-wing", "clever-wing", "swift-wing"]));
          return;
        case "CeladonCity_EventScript_SoftboiledTutor":
          await env.moveTutor("Soft-Boiled", "tutorSoftboiled", "Text_Softboiled");
          return;
        case "CeladonCity_DepartmentStore_3F_EventScript_CounterTutor":
          await env.moveTutor("Counter", "tutorCounter", "Text_Counter");
          return;
        case "CeladonCity_EventScript_Poliwrath":
        case "CeladonCity_Condominiums_1F_EventScript_Meowth":
        case "CeladonCity_Condominiums_1F_EventScript_Clefairy":
          env.cry(/_EventScript_(\w+)$/.exec(script)[1]);
          await env.say(ev.person.text || []);
          return;
        case "CeladonCity_Condominiums_1F_EventScript_Nidoran":
          env.cry("Nidoran-F");
          await env.say(ev.person.text || []);
          return;
        case "CeladonCity_DepartmentStore_Elevator_EventScript_FloorSelect":
          await env.elevator(["5F", "4F", "3F", "2F", "1F"].map((n) => ({ label: n, map: "CeladonCity_DepartmentStore_" + n, x: 6, y: 1 })));
          return;
        // The little girl on the roof swaps a TM for a drink she hasn't had.
        case "CeladonCity_DepartmentStore_Roof_EventScript_ThirstyGirl":
          await env.thirstyGirl();
          return;
        case "CeladonCity_DepartmentStore_Roof_EventScript_VendingMachine":
          await env.vendingMachine();
          return;
        case "CeladonCity_Condominiums_1F_EventScript_TeaWoman":
          if (f.gotTea) { await env.say(env.T("CeladonCity_Condominiums_1F_Text_MyDearMonsKeepMeCompany")); return; }
          await env.say(env.T("CeladonCity_Condominiums_1F_Text_TryThisDrinkInstead"));
          Player.addItem(env.player, "tea");
          f.gotTea = true;
          await env.sayWithJingle("mus_obtain_key_item", "{PLAYER} received the Tea.");
          await env.say(env.T("CeladonCity_Condominiums_1F_Text_NothingBeatsThirstLikeTea"));
          return;
        // The game designer: a diploma for a complete Kanto Pokédex (Mew aside).
        case "CeladonCity_Condominiums_3F_EventScript_Designer": {
          const caught = new Set(env.player.pokedex.caught.map((s) => (window.DEX[s] || {}).id));
          if (!Array.from({ length: 150 }, (_, i) => i + 1).every((id) => caught.has(id))) {
            await env.say(env.T("CeladonCity_Condominiums_3F_Text_ImGameDesignerShowMeFinishedPokedex"));
            return;
          }
          await env.say(env.T("CeladonCity_Condominiums_3F_Text_CompletedPokedexCongratulations"));
          await env.say(["Diploma", "{PLAYER}\nCongratulations! This diploma\ncertifies that you have completed\nyour Pokédex.", "Game Freak"]);
          return;
        }
        case "CeladonCity_Condominiums_RoofRoom_EventScript_EeveeBall":
          await env.giftMon("Eevee", 25, env.T("CeladonCity_Condominiums_RoofRoom_Text_ObtainedAnEevee"), null, () => {
            Overworld.removePerson(ev.person);
            f.gotEevee = true;
          });
          return;
        case "CeladonCity_Condominiums_RoofRoom_EventScript_Blackboard": {
          const R = (k) => env.T("CeladonCity_Condominiums_RoofRoom_Text_" + k);
          await env.say(R("WirelessAdapterLecture"));
          // (MULTICHOICE_LINKED_DIRECT_UNION: LINKED GAME PLAY / DIRECT CORNER / UNION ROOM / QUIT.)
          for (;;) {
            const v = await env.multichoice(R("ReadWhichHeading")[0], 0, 0, ["Linked Game Play", "Direct Corner", "Union Room", "Quit"]);
            if (v < 0 || v > 2) break;
            await env.say(R(["ExplainWirelessClub", "ExplainDirectCorner", "ExplainUnionRoom"][v]));
          }
          Screen.say("");
          return;
        }
        case "CeladonCity_Restaurant_EventScript_CoinCaseMan":
          if (f.gotCoinCase) { await env.say(env.T("CeladonCity_Restaurant_Text_ThoughtIdWinItBack")); return; }
          await env.say(env.T("CeladonCity_Restaurant_Text_TakeThisImBusted"));
          Player.addItem(env.player, "coin-case");
          f.gotCoinCase = true;
          await env.sayWithJingle("mus_obtain_key_item", env.T("CeladonCity_Restaurant_Text_ReceivedCoinCaseFromMan"));
          return;
        case "CeladonCity_Gym_EventScript_GymStatue":
          await env.say(env.T(env.hasBadge("rainbow") ? "CeladonCity_Gym_Text_GymStatuePlayerWon" : "CeladonCity_Gym_Text_GymStatue"));
          return;

        // ---------- Celadon Game Corner ----------
        case "CeladonCity_GameCorner_EventScript_CoinsClerk":
          await env.coinsClerk();
          return;
        // Three gamblers give you a few Coins, once each.
        case "CeladonCity_GameCorner_EventScript_Fisher":
          await env.gambler(ev.person, { flag: "got10CoinsFromGambler", coins: 10, ask: "DoYouWantToPlay", got: "Received10CoinsFromMan",
            full: "DontNeedMyCoins", after: "WinsComeAndGo" });
          return;
        case "CeladonCity_GameCorner_EventScript_Scientist":
          await env.gambler(ev.person, { flag: "got20CoinsFromGambler", coins: 20, ask: "WantSomeCoins", got: "Received20CoinsFromNiceGuy",
            full: "YouHaveLotsOfCoins", after: "NeedMoreCoinsForMonIWant" });
          return;
        case "CeladonCity_GameCorner_EventScript_Gentleman":
          await env.gambler(ev.person, { flag: "got20CoinsFromGambler2", coins: 20, ask: "HereAreSomeCoinsShoo", got: "Received20CoinsFromMan",
            full: "YouveGotPlentyCoins", after: "WatchReelsClosely" });
          return;
        case "CeladonCity_GameCorner_EventScript_GymGuy":
          await env.say(env.T(f.TRAINER_LEADER_ERIKA ? "CeladonCity_GameCorner_Text_RareMonsForCoins" : "CeladonCity_GameCorner_Text_GymGuyAdvice"));
          await env.faceBack(ev.person);
          return;
        case "CeladonCity_GameCorner_EventScript_BaldingMan":
        case "CeladonCity_GameCorner_EventScript_Woman1":
        case "CeladonCity_GameCorner_EventScript_Woman2":
        case "CeladonCity_GameCorner_EventScript_OldMan":
          await env.say(ev.person.text || []);
          await env.faceBack(ev.person);
          return;
        case "CeladonCity_GameCorner_EventScript_Poster":
          await env.say(env.T("CeladonCity_GameCorner_Text_SwitchBehindPosterPushIt"));
          if (!f.openedRocketHideout) {
            env.sfx("se_unlock");
            f.openedRocketHideout = true;
            env.applyPatches("CeladonCity_GameCorner");
          }
          return;
        case "CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerkMons":
        case "CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerkTMs":
        case "CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerkItems":
          await env.prizeClerk(script.replace("CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerk", ""));
          return;

        // ---------- Rocket Hideout ----------
        case "RocketHideout_Elevator_EventScript_FloorSelect":
          if (!Player.itemCount(env.player, "lift-key")) { await env.say(env.T("RocketHideout_Elevator_Text_AppearsToNeedAKey")); return; }
          await env.elevator([{ label: "B1F", map: "RocketHideout_B1F", x: 24, y: 25 }, { label: "B2F", map: "RocketHideout_B2F", x: 28, y: 16 },
            { label: "B4F", map: "RocketHideout_B4F", x: 20, y: 23 }]);
          return;
        case "RocketHideout_B4F_EventScript_Giovanni":
          await env.giovanniHideout(ev.person);
          return;
        case "RocketHideout_B4F_EventScript_LiftKey":
        case "RocketHideout_B4F_EventScript_SilphScope": {
          const item = script.endsWith("LiftKey") ? "lift-key" : "silph-scope";
          Overworld.removePerson(ev.person);
          Player.addItem(env.player, item);
          f[item === "lift-key" ? "gotLiftKey" : "gotSilphScope"] = true;
          await env.sayWithJingle("mus_obtain_key_item", "{PLAYER} found " + env.article(Bag.name(item)) + "!");
          return;
        }

        // ---------- Saffron City ----------
        case "SaffronCity_PokemonCenter_1F_EventScript_Nurse":
          await env.nurse(ev.map, ev.person);
          return;
        case "SaffronCity_Mart_EventScript_Clerk":
          await env.mart(ev.person.mart);
          return;
        case "SaffronCity_EventScript_Pidgeot":
        case "SaffronCity_House_EventScript_Pidgey":
        case "SaffronCity_CopycatsHouse_1F_EventScript_Chansey":
        case "SaffronCity_CopycatsHouse_2F_EventScript_Doduo":
          env.cry(/_EventScript_(\w+)$/.exec(script)[1]);
          await env.say(ev.person.text || []);
          return;
        // Silph Co.'s "security guard": asleep once Mr. Fuji's safe.
        case "SaffronCity_EventScript_DoorGuardGrunt":
          if (!f.rescuedMrFuji) { await env.say(env.T("SaffronCity_Text_ImASecurityGuard")); return; }
          await env.faceBack(ev.person);
          await env.say(env.T("SaffronCity_Text_HesTakingASnooze"));
          return;
        // The Copycat mimics you, unless you've a Poké Doll for her: then she
        // teaches Mimic (FireRed's EventScript_MimicTutor); after that, again
        // and again for money.
        case "SaffronCity_CopycatsHouse_2F_EventScript_Copycat": {
          const girl = !!(Player.LOOKS[env.player.look] && Player.LOOKS[env.player.look].girl);
          if (!f.tutorMimic && !Player.itemCount(env.player, "poke-doll")) {
            await env.say(env.T(girl ? "SaffronCity_CopycatsHouse_2F_Text_MimickingFavoriteHobbyFemale" : "SaffronCity_CopycatsHouse_2F_Text_MimickingFavoriteHobbyMale"));
            return;
          }
          // (The first time for a Poké Doll; after that, for money, as the other tutors.)
          const doll = !f.tutorMimic;
          if (await env.moveTutor("Mimic", "tutorMimic", "Text_Mimic", doll ? null : undefined, girl ? "Text_MimicTaughtFemale" : "Text_MimicTaughtMale") && doll) {
            Player.removeItem(env.player, "poke-doll");
          }
          return;
        }
        // Mr. Psychic: FireRed's TM29, Psychic (the TM with that move here).
        case "SaffronCity_MrPsychicsHouse_EventScript_MrPsychic": {
          const tm = env.machineFor("Psychic");
          if (!f.gotTM29) {
            await env.say(env.T("SaffronCity_MrPsychicsHouse_Text_YouWantedThis"));
            Player.addItem(env.player, tm);
            f.gotTM29 = true;
            await env.sayWithJingle(env.itemJingle(tm), env.tmText(env.T("SaffronCity_MrPsychicsHouse_Text_ReceivedTM29FromMrPsychic"), 29, tm));
            await env.say(env.tmText(env.T("SaffronCity_MrPsychicsHouse_Text_ExplainTM29"), 29, tm));
            // (This game's own: his back room, and the Tera Raid den in it.)
            await env.say(["And I sensed you'd want this, too…", "The door behind me leads to my back\nroom. A Tera Raid den sleeps there.",
              "Use a Lure on it, and a Tera\nPsychic-type Pokémon will rise.", "Go on in, as often as you like."]);
            Screen.say("");
            env.sfx("se_rs_door");
            env.applyPatches("SaffronCity_MrPsychicsHouse");
            await env.persist();
            return;
          }
          await env.say(env.tmText(env.T("SaffronCity_MrPsychicsHouse_Text_ExplainTM29"), 29, tm));
          await env.say(["My back room's Tera Raid den…\nI sense it awaits your Lure."]);
          return;
        }
        case "SaffronCity_Gym_EventScript_GymGuy":
          await env.say(env.T(f.TRAINER_LEADER_SABRINA ? "SaffronCity_Gym_Text_GymGuyPostVictory" : "SaffronCity_Gym_Text_GymGuyAdvice"));
          return;
        case "SaffronCity_Gym_EventScript_GymStatue":
          await env.say(env.T(env.hasBadge("marsh") ? "SaffronCity_Gym_Text_GymStatuePlayerWon" : "SaffronCity_Gym_Text_GymStatue"));
          return;
        // The Fighting Dojo: walk up beside the Karate Master and he turns to
        // face you, and fights; beaten, he lets you take one of his two prized
        // Pokémon.
        case "SaffronCity_Dojo_EventScript_TriggerMasterBattleLeft":
        case "SaffronCity_Dojo_EventScript_TriggerMasterBattleRight": {
          const master = window.WORLD_MAPS.SaffronCity_Dojo.people.find((p) => p.localId === "LOCALID_KARATE_MASTER");
          await Overworld.act([{ who: "LOCALID_KARATE_MASTER", moves: env.M(script.endsWith("Left") ? "Common_Movement_WalkInPlaceFasterLeft" : "Common_Movement_WalkInPlaceFasterRight") }]);
          await Overworld.act([{ who: "player", moves: [script.endsWith("Left") ? "face_right" : "face_left"] }]);
          await env.trainerBattle(master, null);
          await env.dojoDenDoor();
          return;
        }
        case "SaffronCity_Dojo_EventScript_HitmonleeBall":
        case "SaffronCity_Dojo_EventScript_HitmonchanBall":
          await env.dojoBall(ev.person, script.includes("Hitmonlee") ? "Hitmonlee" : "Hitmonchan");
          return;
        // The Fan Club, before you're Champion: everyone's a fan of someone else.
        case "SaffronCity_PokemonTrainerFanClub_EventScript_CrushGirl":
          await env.say(env.T("SaffronCity_PokemonTrainerFanClub_Text_TrainersCoolWhenBattling"));
          return;
        case "SaffronCity_PokemonTrainerFanClub_EventScript_LittleGirl":
          await env.say(env.T("SaffronCity_PokemonTrainerFanClub_Text_CanIBecomeCoolTrainerOneDay"));
          return;
        case "SaffronCity_PokemonTrainerFanClub_EventScript_Youngster":
          await env.say(env.T("SaffronCity_PokemonTrainerFanClub_Text_BrocksLastWordOnCool"));
          return;
        case "SaffronCity_PokemonTrainerFanClub_EventScript_Gentleman":
          await env.say(env.T("SaffronCity_PokemonTrainerFanClub_Text_YoullBeTalkedAboutIfYouKeepWinning"));
          return;

        // ---------- Silph Co. ----------
        case "SilphCo_Elevator_EventScript_FloorSelect":
          await env.elevator(env.SILPH_FLOORS.map(([label, x]) => ({ label, map: "SilphCo_" + label, x, y: 3 })), true);
          return;
        case "SilphCo_2F_EventScript_ThunderWaveTutor":
          await env.moveTutor("Thunder Wave", "tutorThunderWave", "Text_ThunderWave");
          return;
        case "SilphCo_7F_EventScript_RivalTriggerTop":
        case "SilphCo_7F_EventScript_RivalTriggerBottom":
          await env.silphRival(script.endsWith("Top"));
          return;
        // A Lapras, from the worker you rescue on 7F.
        case "SilphCo_7F_EventScript_LaprasGuy":
          if (f.gotLapras) { await env.say(env.T("SilphCo_7F_Text_RocketBossWentToBoardroom")); return; }
          await env.say(env.T("SilphCo_7F_Text_HaveMonForSavingUs"));
          if (await env.giftMon("Lapras", 25, env.T("SilphCo_7F_Text_ObtainedLaprasFromEmployee"), null, () => { f.gotLapras = true; })) {
            await env.say(env.T("SilphCo_7F_Text_ExplainLapras"));
          }
          return;
        // 9F: a nap on the bed while Team Rocket's about.
        case "SilphCo_9F_EventScript_HealWoman":
          if (env.silphFreed()) { await env.say(env.T("SilphCo_9F_Text_ThankYouSoMuch")); return; }
          await env.say(env.T("SilphCo_9F_Text_YouShouldTakeQuickNap"));
          await env.outOfCenterHeal();
          await env.say(env.T("SilphCo_9F_Text_DontGiveUp"));
          return;
        case "SilphCo_11F_EventScript_GiovanniTriggerLeft":
        case "SilphCo_11F_EventScript_GiovanniTriggerRight":
          await env.giovanniSilph(script.endsWith("Left"));
          return;
        // The President's thanks: the Master Ball.
        case "SilphCo_11F_EventScript_President": {
          if (f.gotMasterBall) { await env.say(env.T("SilphCo_11F_Text_ThatsOurSecretPrototype")); return; }
          const girl = !!(Player.LOOKS[env.player.look] && Player.LOOKS[env.player.look].girl);
          await env.say(env.T(girl ? "SilphCo_11F_Text_ThanksForSavingMeDearGirl" : "SilphCo_11F_Text_ThanksForSavingMeDearBoy"));
          Player.addItem(env.player, "master-ball");
          f.gotMasterBall = true;
          await env.sayWithJingle("mus_obtain_key_item", env.T("SilphCo_11F_Text_ObtainedMasterBallFromPresident"));
          await env.say(env.T("SilphCo_11F_Text_ThatsOurSecretPrototype"));
          return;
        }

        // ---------- Route 12 to Route 15 ----------
        case "Route12_EventScript_Snorlax":
          await env.snorlax(ev.person, 12);
          return;
        // The girl upstairs in the gate: FireRed's TM27 (Return).
        case "Route12_NorthEntrance_2F_EventScript_Lass": {
          const tm = env.machineFor("Return"), L = (k) => env.T("Route12_NorthEntrance_2F_Text_" + k);
          if (!f.gotTM27) {
            await env.say(L(env.isGirl() ? "TakeTMDontNeedAnymoreFemale" : "TakeTMDontNeedAnymoreMale"));
            Player.addItem(env.player, tm);
            f.gotTM27 = true;
            await env.sayWithJingle(env.itemJingle(tm), env.tmText(L("ReceivedTM27FromLittleGirl"), 27, tm));
          }
          await env.say(env.tmText(L("ExplainTM27"), 27, tm));
          return;
        }
        // The Fishing Guru's brother: (FireRed's Super Rod) the Fishing Rod if you
        // haven't one, and his request; then the Magikarp record.
        case "Route12_FishingHouse_EventScript_FishingGuruBrother":
          if (f.gotSuperRod) { await env.magikarpRecord(); return; }
          if (!env.hasFishingRod()) {
            if (await env.rodGift("Route12_FishingHouse_Text_", "TakeThisAndFish", "IfYouCatchBigMagikarpShowMe")) f.gotSuperRod = true;
            return;
          }
          await env.say(env.fishingLevelTalk("Route12"));
          await env.say(env.T("Route12_FishingHouse_Text_IfYouCatchBigMagikarpShowMe").slice(2));
          f.gotSuperRod = true;
          return;
        case "Route12_FishingHouse_EventScript_MagikarpRecordSign":
          await env.say(f.magikarpRecord != null ? env.T("Route12_FishingHouse_Text_MostGiganticMagikarpXInches")
            : env.T("Route12_FishingHouse_Text_BlankChartOfSomeSort"), [null, null, f.magikarpRecord != null ? env.magikarpInches(f.magikarpRecord) : ""]);
          return;
        // Prof. Oak's Aide in Route 15's gate: the Exp. Share for fifty kinds caught.
        case "Route15_WestEntrance_2F_EventScript_Aide":
          await env.aideGift({ needed: 50, item: "exp-share", flag: "gotExpShareFromAide", text: "Route15_WestEntrance_2F_Text_",
            ask: "GiveItemIfCaughtEnough", received: "ReceivedItemFromAide", explain: "ExplainExpShare" });
          return;
        // The binoculars: a large, shining bird (Articuno, seen in the Pokédex).
        case "Route15_WestEntrance_2F_EventScript_LeftBinoculars":
          await env.monSign("Articuno", env.T("Route15_WestEntrance_2F_Text_LargeShiningBird"));
          return;

        // ---------- Routes 16, 17 and 18: Cycling Road ----------
        case "Route16_EventScript_Snorlax":
          await env.snorlax(ev.person, 16);
          return;
        // Prof. Oak's Aide upstairs in Route 16's gate: the Amulet Coin for forty kinds caught.
        case "Route16_NorthEntrance_2F_EventScript_Aide":
          await env.aideGift({ needed: 40, item: "amulet-coin", flag: "gotAmuletCoinFromAide", text: "Route16_NorthEntrance_2F_Text_",
            ask: "GiveAmuletCoinIfCaught40", received: "ReceivedAmuletCoinFromAide", explain: "ExplainAmuletCoin" });
          return;
        // The girl in her secret retreat behind the tree: HM02 Fly.
        case "Route16_House_EventScript_Woman":
          if (!f.gotHM02) {
            await env.say(env.T("Route16_House_Text_FoundMySecretRetreat"));
            Player.addItem(env.player, "hm02");
            f.gotHM02 = true;
            await env.sayWithJingle(env.itemJingle("hm02"), env.T("Route16_House_Text_ReceivedHM02FromGirl"));
          }
          await env.say(env.T("Route16_House_Text_ExplainHM02"));
          return;
        case "Route16_House_EventScript_Fearow":
          env.cry("Fearow");
          await env.say(env.T("Route16_House_Text_Fearow"));
          return;
        // The Cycling Road gates: without a Bicycle, the guard calls you back
        // to the counter and turns you away.
        case "Route16_NorthEntrance_1F_EventScript_NeedBikeTriggerTop":
        case "Route16_NorthEntrance_1F_EventScript_NeedBikeTriggerMidTop":
        case "Route16_NorthEntrance_1F_EventScript_NeedBikeTriggerMid":
        case "Route16_NorthEntrance_1F_EventScript_NeedBikeTriggerMidBottom":
        case "Route16_NorthEntrance_1F_EventScript_NeedBikeTriggerBottom":
        case "Route18_EastEntrance_1F_EventScript_NeedBikeTriggerTop":
        case "Route18_EastEntrance_1F_EventScript_NeedBikeTriggerMidTop":
        case "Route18_EastEntrance_1F_EventScript_NeedBikeTriggerMid":
        case "Route18_EastEntrance_1F_EventScript_NeedBikeTriggerMidBottom":
        case "Route18_EastEntrance_1F_EventScript_NeedBikeTriggerBottom":
          await env.needBike(script);
          return;
        // Upstairs in Route 18's gate, Haden trades his Lickitung, Marc, for a Golduck.
        case "Route18_EastEntrance_2F_EventScript_Haden":
          await env.inGameTrade(env.TRADES.marc);
          return;

        // ---------- The Seafoam Islands ----------
        // Fallen through a hole onto B3F's or B4F's water: the current may carry you off.
        case "enter:SeafoamIslands_B3F":
        case "enter:SeafoamIslands_B4F":
          await env.seafoamFall(ev.map);
          return;
        case "SeafoamIslands_B4F_EventScript_Articuno":
          await env.legendaryBird(ev.person, "Articuno", "foughtArticuno");
          return;

        // ---------- The Sevii Islands ----------
        case "enter:CinnabarIsland": case "arrive:CinnabarIsland":
          if (f.cinnabarScene === 1) await env.cinnabarBill();
          return;
        case "CinnabarIsland_PokemonCenter_1F_EventScript_Bill": await env.cinnabarCenterBill(ev.person); return;
        // The Seagallop: Vermilion's dock and the islands' harbors.
        case "VermilionCity_EventScript_FerrySailor":
          if (!f.ssAnneDeparted) { await env.say(env.T("VermilionCity_Text_WelcomeToTheSSAnne")); return; }
          await env.vermilionSeagallop(Overworld.position().x < 24);
          return;
        case "OneIsland_Harbor_EventScript_Sailor": await env.harborSailor("ONE_ISLAND"); return;
        case "TwoIsland_Harbor_EventScript_Sailor": await env.harborSailor("TWO_ISLAND"); return;
        case "ThreeIsland_Harbor_EventScript_Sailor": await env.harborSailor("THREE_ISLAND"); return;
        case "OneIsland_PokemonCenter_1F_EventScript_Nurse": case "TwoIsland_PokemonCenter_1F_EventScript_Nurse":
        case "ThreeIsland_PokemonCenter_1F_EventScript_Nurse":
          await env.nurse(ev.map, ev.person);
          return;
        case "enter:OneIsland_PokemonCenter_1F": await env.meetCelio(); return;
        case "enter:OneIsland": await env.billToCelio(); return;
        case "OneIsland_PokemonCenter_1F_EventScript_Celio": await env.celio(); return;
        case "OneIsland_PokemonCenter_1F_EventScript_Bill": await env.oneIslandCenterBill(); return;
        case "OneIsland_PokemonCenter_1F_EventScript_NetworkMachine": await env.networkMachine(); return;
        case "OneIsland_PokemonCenter_1F_EventScript_CrushGirl":
          await env.say(env.T(f.canLinkWithRS ? "OneIsland_PokemonCenter_1F_Text_TradedWithFarAwayBoyfriend" : "OneIsland_PokemonCenter_1F_Text_WishICouldTradeWithBoyfriend"));
          return;
        case "OneIsland_EventScript_OldMan":
          await env.say(env.T(f.canLinkWithRS ? "OneIsland_Text_HavePCLinkageWithHoenn" : f.seviiDetourDone ? "OneIsland_Text_HavePCLinkageWithKanto" : "OneIsland_Text_LuckyToHaveCelioHere"));
          return;
        case "OneIsland_PokemonCenter_1F_EventScript_LeaveOneIslandTriggerTop": await env.leaveOneIsland(1); return;
        case "OneIsland_PokemonCenter_1F_EventScript_LeaveOneIslandTriggerMidTop": await env.leaveOneIsland(2); return;
        case "OneIsland_PokemonCenter_1F_EventScript_LeaveOneIslandTriggerMidBottom": await env.leaveOneIsland(3); return;
        case "OneIsland_PokemonCenter_1F_EventScript_LeaveOneIslandTriggerBottom": await env.leaveOneIsland(4); return;
        // The Ember Spa: the man who made it with Rock Smash gives you the HM
        // (FireRed's HM06; HM08 here); the hot spring heals.
        case "OneIsland_KindleRoad_EmberSpa_EventScript_RockSmashMan": {
          const E = (k) => env.T("OneIsland_KindleRoad_EmberSpa_Text_" + k), hm = FieldMoves.hmFor("Rock Smash");
          if (!f.gotHM06) {
            await env.say(E("UsedThisToMakeEmberSpa"));
            Player.addItem(env.player, hm);
            f.gotHM06 = true;
            await env.sayWithJingle(env.itemJingle(hm), "{PLAYER} received " + Bag.name(hm) + "!");
          }
          await env.say(E("ExplainHM06").map((p) => p.replace(/HM06/g, Bag.name(hm).split(" ")[0])));
          return;
        }
        case "OneIsland_KindleRoad_EmberSpa_EventScript_SpaHeal": await env.emberSpa(); return;
        case "MtEmber_Exterior_EventScript_ExplosionTutor": await env.moveTutor("Explosion", "tutorExplosion", "Text_Explosion"); return;
        case "MtEmber_Exterior_EventScript_RocketPasswordScene": await env.emberPassword(); return;
        case "MtEmber_Exterior_EventScript_Grunt1": await env.emberGrunt(1); return;
        case "MtEmber_Exterior_EventScript_Grunt2": await env.emberGrunt(2); return;
        case "MtEmber_Summit_EventScript_Moltres": await env.legendaryBird(ev.person, "Moltres", "foughtMoltres"); return;
        // ---------- Cerulean Cave ----------
        // ---------- Faraway Island ----------
        // ---------- Orre ----------
        case "OutskirtStand_Diner_EventScript_Bartender": await env.orreBartender(); return;
        case "arrive:OutskirtStand": case "enter:OutskirtStand":
          if ((f.orreStory | 0) === 18 && !f.orreStandFT) await env.orreStandStory(); else if (!(f.orre | 0)) await env.orreArrival();
          return;
        case "arrive:PhenacCity": case "enter:PhenacCity": await env.phenacFT(); return;
        case "enter:PhenacCity_MayorsHouse": await env.mayorScene(); return;
        case "PhenacCity_EventScript_Truck": await env.phenacTruck(ev.person); return;
        case "PhenacCity_EventScript_Folly": case "PhenacCity_EventScript_Trudly":
          await env.say(["Folly: Heh. You again? You haven't\nlearned any lessons now, have you?", "Folly: Well, fine. I'll take you on as\noften as you dare!"]);
          await env.phenacFTBattle(); return;
        case "PhenacCity_EventScript_Troop_VERDE": case "PhenacCity_EventScript_Troop_ROSSO": case "PhenacCity_EventScript_Troop_BLUNO":
          await env.phenacTroop(script); return;
        case "PhenacCity_MayorsHouse_EventScript_EsCade": await env.esCade(); return;
        case "arrive:PyriteTown": case "enter:PyriteTown": await env.pyriteArrival(); return;
        case "enter:PyriteTown_Windmill": case "enter:PyriteTown_PyriteBuilding_1F": case "enter:PhenacCity_Stadium": await env.pyriteExtra(script); return;
        case "PyriteTown_DukingsHouse_EventScript_Duking": case "PyriteTown_DukingsHouse_EventScript_Marcia":
        case "PyriteTown_DukingsHouse_EventScript_Secc": await env.dukingsHouse(script); return;
        case "PyriteTown_PyriteBuilding_1F_EventScript_Nore": await env.pyriteNore(); return;
        case "enter:PyriteTown_PyriteBuilding_4F": await env.pyriteTopFloor(); return;
        case "enter:PyriteCave_MirorBHideout": await env.mirorBHideout(); return;
        case "enter:AgateVillage_EaguansHouse": await env.eagunsHouseScene(); return;
        case "AgateVillage_EaguansHouse_EventScript_Eagun": case "AgateVillage_EaguansHouse_EventScript_Beluh": await env.eagunsHouse(script); return;
        case "AgateVillage_EventScript_Skrub": case "AgateVillage_EventScript_Peon": await env.agateShrine(); return;
        case "AgateVillage_EventScript_RelicStone": await env.relicStone(); return;
        case "RelicForest_EventScript_Shrine": await env.relicForestShrine(); return;
        case "AgateVillage_EventScript_CologneGirl": await env.cologneGirl(); return;
        case "AgateVillage_EventScript_MartClerk": await env.agateMart(); return;
        case "MtBattle_EventScript_Challenge": await env.mtBattleChallenge(); return;
        case "arrive:MtBattle": case "enter:MtBattle": await env.mtBattleArrival(); return;
        case "MtBattle_EventScript_Dakim": case "MtBattle_EventScript_SummitSkrub": case "MtBattle_EventScript_Vander": await env.mtBattleSummit(script); return;
        case "arrive:TheUnder": case "enter:TheUnder": await env.underArrival(); return;
        case "TheUnder_EventScript_Kloak": await env.underKloak(); return;
        // (The Kids Grid's errand and the Under Subway: Colosseum's.)
        case "TheUnder_EventScript_Bitt": await env.underBitt(); return;
        case "TheUnder_JunkShop_1F_EventScript_Owner": await env.junkShopOwner(); return;
        case "TheUnder_JunkShop_B1_EventScript_Perr": await env.junkShopPerr(); return;
        case "enter:TheUnder_NettsHideout_1F": if (env.nettsDoorShut()) await env.nettsDoor(); return;
        case "enter:TheUnder_NettsHideout_B1": await env.nettsHideout(); return;
        case "TheUnder_NettsHideout_B1_EventScript_Nett": case "TheUnder_NettsHideout_B1_EventScript_Megg": case "TheUnder_NettsHideout_B1_EventScript_Bitt":
          await env.nettsHideoutPerson(script); return;
        case "enter:TheUnder_Subway_B1": if (env.subwayShut()) await env.subwayDoorShut(); else await env.subwayB1(); return;
        case "enter:TheUnder_Subway_Station": await env.subwayStation(); return;
        case "TheUnder_Subway_B1_EventScript_Fan": await env.subwayFan(); return;
        case "TheUnder_Subway_Station_EventScript_Train": await env.shadowLiner(); return;
        case "enter:TheUnder_Studio": case "TheUnder_Studio_EventScript_Venus": await env.underVenus(); return;
        case "arrive:ShadowLab_1F": case "enter:ShadowLab_1F": await env.labArrival(); return;
        case "enter:ShadowLab_B1F": case "ShadowLab_B1F_EventScript_Troop": await env.labTroop(); return;
        case "enter:ShadowLab_EinsRoom": case "ShadowLab_EinsRoom_EventScript_Ein": await env.labEin(); return;
        case "enter:ShadowLab_Main1F": case "enter:ShadowLab_Cells": case "enter:ShadowLab_DNARoom": await env.labDoor(script); return;
        case "RealgamTower_Colosseum_EventScript_Host": await env.realgamTournament(); return;
        case "arrive:RealgamTower_1F": case "enter:RealgamTower_1F": await env.realgamArrival(); return;
        case "RealgamTower_Dome_EventScript_Gonzap": await env.realgamGonzap(); return;
        case "RealgamTower_Dome_EventScript_Admin_MIROR_B": case "RealgamTower_Dome_EventScript_Admin_DAKIM":
        case "RealgamTower_Dome_EventScript_Admin_VENUS": case "RealgamTower_Dome_EventScript_Admin_EIN": await env.realgamAdmin(script); return;
        case "enter:RealgamTower_Colosseum": await env.realgamDoor(); return;
        case "RealgamTower_Colosseum_EventScript_Nascour": await env.realgamNascour(); return;
        case "enter:RealgamTower_Top": case "RealgamTower_Top_EventScript_Evice": await env.realgamEvice(); return;
        case "MtBattle_EventScript_Trainer1": case "MtBattle_EventScript_Trainer2": case "MtBattle_EventScript_Turo": case "MtBattle_EventScript_Berin":
          await env.orreTrainer(script); return;
        case "OrreAirStrip_EventScript_Pilot": await env.orrePilot(); return;
        case "Orre_WorldMap": await env.orreTravel(); return;
        case "SnagemHideout_EventScript_Guard1": case "SnagemHideout_EventScript_Guard2": await env.snagemGuard(ev.person); return;
        case "PhenacCity_EventScript_Kodo": await env.phenacKodo(); return;
        case "OutskirtStand_Diner_EventScript_Traveller3": await env.outskirtLena(ev.person); return;
        case "PyriteTown_EventScript_Rook": case "AgateVillage_EventScript_Fay": case "PyriteCave_EventScript_Rowe": await env.snagemTarget(script, ev.person); return;
        case "PyriteTown_EventScript_Zeke": case "PyriteTown_EventScript_Rina": case "AgateVillage_EventScript_Ted": case "AgateVillage_EventScript_Sue":
        case "PyriteCave_EventScript_Dex": case "PyriteCave_EventScript_Taro": await env.orreTrainer(script); return;
        case "OutskirtStand_Diner_EventScript_Willie": await env.dinerWillie(); return;
        case "OutskirtStand_Diner_EventScript_TV":
          if ((f.orreStory | 0) >= 18) await env.say(["It's the news.", "\"Authorities have made a stunning\nannouncement on the mysterious building\nthat exploded in Eclo Canyon.",
            "It was Team Snagem's hideout. Team\nSnagem is a gang of Pokémon thieves…\"", "The picture fizzles into static."]);
          else await env.say(["It's the news.", "\"…and the Colosseums of Orre are packed\nas ever this week…\"", "The picture fizzles into static."]);
          return;
        case "OutskirtStand_Diner_EventScript_Jukebox": await env.orreJukebox(); return;
        case "FarawayIsland_Entrance_EventScript_Sailor": await env.farawaySailor(ev.person); return;
        case "enter:FarawayIsland_Interior": await env.findMew(); return;
        case "FarawayIsland_Interior_EventScript_Mew": await env.mewFound(ev.person); return;
        case "CeruleanCave_B1F_EventScript_Mewtwo":
          await env.legendaryBird(ev.person, "Mewtwo", "foughtMewtwo", { level: 70, text: env.T("CeruleanCave_B1F_Text_Mew"), music: "mus_vs_mewtwo" });
          return;
        case "MtEmber_RubyPath_B5F_EventScript_Ruby":
          f.gotRuby = true;
          Overworld.removePerson(ev.person);
          Player.addItem(env.player, "ruby");
          await env.sayWithJingle("mus_obtain_key_item", env.T("MtEmber_RubyPath_B3F_Text_FoundARuby"));
          return;
        // Two Island.
        case "TwoIsland_EventScript_Clerk": await env.twoIslandClerk(); return;
        case "enter:TwoIsland_JoyfulGameCorner": await env.gameCornerHelp(); return;
        case "TwoIsland_JoyfulGameCorner_EventScript_LostellesDaddy": await env.lostellesDaddy(); return;
        case "TwoIsland_JoyfulGameCorner_EventScript_InfoMan":
          if ((f.gameCornerScene || 0) >= 4) { await env.say(env.T("Text_WelcomeCanYouWait")); await env.say(env.T("Text_AdapterNotConnectedMinigame")); return; }
          await env.say(env.T(f.rescuedLostelle ? "TwoIsland_JoyfulGameCorner_Text_GetGamesGoingSoon" : "TwoIsland_JoyfulGameCorner_Text_NotRunningAnyGamesToday"));
          return;
        case "TwoIsland_JoyfulGameCorner_EventScript_Lostelle": await env.say(env.T("TwoIsland_JoyfulGameCorner_Text_PleaseShowMeYouBeingCool")); return;
        case "TwoIsland_CapeBrink_House_EventScript_StarterTutor": await env.capeBrinkTutor(); return;
        case "TwoIsland_House_EventScript_MoveManiac": await env.moveManiac(); return;
        // Three Island.
        case "ThreeIsland_EventScript_Biker": await env.bikerArgument(2); return;
        case "ThreeIsland_EventScript_AntiBiker1": await env.antiBiker(1); return;
        case "ThreeIsland_EventScript_AntiBiker2": await env.antiBiker(2); return;
        case "ThreeIsland_EventScript_BikerBossIntroTrigger": await env.bikerBossIntro(); return;
        case "ThreeIsland_EventScript_BattleBikersTriggerLeft": await env.bikerBattles(0); return;
        case "ThreeIsland_EventScript_BattleBikersTriggerMidLeft": await env.bikerBattles(1); return;
        case "ThreeIsland_EventScript_BattleBikersTriggerMid": await env.bikerBattles(2); return;
        case "ThreeIsland_EventScript_BattleBikersTriggerMidRight": await env.bikerBattles(3); return;
        case "ThreeIsland_EventScript_BattleBikersTriggerRight": await env.bikerBattles(4); return;
        case "ThreeIsland_EventScript_Doduo": env.cry("Doduo"); await env.say(env.T("ThreeIsland_Text_Doduo")); return;
        case "ThreeIsland_Port_EventScript_Woman":
          await env.say(env.T((f.gameCornerScene || 0) >= 2 ? "ThreeIsland_Port_Text_EverythingTurnedOutForBest"
            : f.threeIslandScene === 4 ? "ThreeIsland_Port_Text_ThankGoodnessBikersGone" : "ThreeIsland_Port_Text_IllCallThePolice"));
          return;
        case "ThreeIsland_House1_EventScript_Lostelle": await env.say(env.T("ThreeIsland_House1_Text_YoureAlwaysSoCool"), env.bigGuy()); return;
        case "ThreeIsland_House5_EventScript_LittleGirl":
          await env.say(env.T(f.rescuedLostelle ? "ThreeIsland_House5_Text_IllGoPlayWithLostelle" : "ThreeIsland_House5_Text_ImNotLostelle"));
          return;
        case "ThreeIsland_Mart_EventScript_Clerk": await env.mart(ev.person.mart); return;
        case "ThreeIsland_BerryForest_EventScript_Lostelle": await env.berryForestLostelle(ev.person); return;
        // The Dunsparce Tunnel's prospector strikes gold once it's dug out
        // (once you're Champion, FLAG_SYS_GAME_CLEAR: FireRed's goes by the National Pokédex).
        case "ThreeIsland_DunsparceTunnel_EventScript_Prospector": {
          const D = (k) => env.T("ThreeIsland_DunsparceTunnel_Text_" + k);
          if (f.gotNuggetFromProspector) { await env.say(D("ThatsANugget")); return; }
          if (!f.gameClear) {
            await env.say(D("ProspectingForGold"));
            Screen.say("");
            await Overworld.act([{ who: "LOCALID_PROSPECTOR", moves: ["face_right"] }]);
            return;
          }
          await env.say(D("StruckGoldThisIsForYou"));
          Player.addItem(env.player, "nugget");
          f.gotNuggetFromProspector = true;
          await env.sayWithJingle("mus_obtain_item", "{PLAYER} received a " + Bag.name("nugget") + "!");
          await env.say(D("ThatsANugget"));
          return;
        }

        // ---------- The Sevii Islands: Four Island ----------
        case "FourIsland_Harbor_EventScript_Sailor": await env.harborSailor("FOUR_ISLAND"); return;
        case "FiveIsland_Harbor_EventScript_Sailor": await env.harborSailor("FIVE_ISLAND"); return;
        case "FourIsland_PokemonCenter_1F_EventScript_Nurse": case "FiveIsland_PokemonCenter_1F_EventScript_Nurse":
          await env.nurse(ev.map, ev.person);
          return;
        case "FourIsland_Mart_EventScript_Clerk": await env.mart(ev.person.mart); return;
        case "enter:FourIsland": await env.fourIslandRival(); return;
        case "FourIsland_EventScript_DaycareMan": await env.fourIslandDayCareMan(); return;
        // (Route 34's Day-Care, HGSS's std_daycare_man and std_daycare_lady: tools/build-johto.js.)
        case "Johto_DaycareMan": await env.fourIslandDayCareMan("johto"); return;
        case "Johto_DaycareLady": await env.fourIslandDayCareLady("johto"); return;
        case "FourIsland_PokemonDayCare_EventScript_DaycareWoman": await env.fourIslandDayCareLady(); return;
        case "FourIsland_EventScript_OldWoman":
          await env.say(env.T(f.canLinkWithRS ? "FourIsland_Text_LoreleiMetLaprasAsChild" : "FourIsland_Text_LoreleiHasReturned"));
          return;
        case "FourIsland_House1_EventScript_BodySlamTutor": await env.moveTutor("Body Slam", "tutorBodySlam", "Text_BodySlam"); return;
        case "FourIsland_House2_EventScript_StickerMan": await env.stickerMan(); return;
        case "FourIsland_LoreleisHouse_EventScript_Lorelei": {
          const L = (k) => env.T("FourIsland_LoreleisHouse_Text_" + k);
          if (f.talkedToLoreleiAfterWarehouse) await env.say(L("WillDoWhatICanHereAndNow"));
          else if (f.defeatedRocketsInWarehouse) { f.talkedToLoreleiAfterWarehouse = true; await env.say(L("IllReturnToLeagueInShortWhile")); }
          else await env.say(L("IfAnythingWereToHappenToIsland"));
          return;
        }
        case "FourIsland_IcefallCave_Back_EventScript_LoreleiRocketsScene": await env.icefallLorelei(); return;
        case "FourIsland_IcefallCave_1F_EventScript_FallDownHole": await env.icefallFall(); return;
        // ---------- Five Island ----------
        case "FiveIsland_Meadow_EventScript_WarehouseDoor": await env.warehouseDoor(); return;
        case "FiveIsland_RocketWarehouse_EventScript_Cage":
          await env.say(env.T(f.defeatedRocketsInWarehouse ? "FiveIsland_RocketWarehouse_Text_PenUnlockedMonsFled" : "FiveIsland_RocketWarehouse_Text_ManyMonsLockedInPen"));
          return;
        case "FiveIsland_RocketWarehouse_EventScript_Admin2Trigger": {
          await Overworld.act([{ who: "LOCALID_WAREHOUSE_ADMIN2", moves: env.M("Common_Movement_WalkInPlaceFasterLeft") }]);
          f.warehouseScene = 1;
          // (Turned your way, he sees you at once: FireRed checks trainers' sight every frame.)
          const admin = window.WORLD_MAPS[ev.map].people.find((q) => q.localId === "LOCALID_WAREHOUSE_ADMIN2"), at = Overworld.position();
          const a = Overworld.personPosition("LOCALID_WAREHOUSE_ADMIN2");
          if (admin && a && env.trainerWaiting(admin) && at.y === a.y && a.x - at.x >= 1 && a.x - at.x <= admin.trainer.sight) {
            await env.trainerBattle(admin, a.x - at.x - 1, "left");
            await env.afterRocket(admin);
          }
          return;
        }
        case "FiveIsland_MemorialPillar_EventScript_MemorialMan": await env.memorialMan(); return;
        case "FiveIsland_MemorialPillar_EventScript_Memorial": await env.memorial(); return;
        case "FiveIsland_WaterLabyrinth_EventScript_EggGentleman": await env.eggGentleman(); return;
        case "FiveIsland_ResortGorgeous_House_EventScript_Selphy": await env.selphy(); return;
        case "enter:FiveIsland_LostCave_Room10": await env.lostSelphy(); return;
        case "enter:FiveIsland_ResortGorgeous": await env.selphyHome(); return;
        // ---------- Six Island ----------
        case "SixIsland_Harbor_EventScript_Sailor": await env.harborSailor("SIX_ISLAND"); return;
        case "SevenIsland_Harbor_EventScript_Sailor": await env.harborSailor("SEVEN_ISLAND"); return;
        case "SixIsland_PokemonCenter_1F_EventScript_Nurse": case "SevenIsland_PokemonCenter_1F_EventScript_Nurse":
        case "TrainerTower_Lobby_EventScript_Nurse":
          await env.nurse(ev.map, ev.person);
          return;
        case "SixIsland_Mart_EventScript_Clerk": case "SevenIsland_Mart_EventScript_Clerk":
          await env.mart(ev.person.mart);
          return;
        case "TrainerTower_Lobby_EventScript_MartClerk": await env.bpShop(); return;
        case "enter:SixIsland_PokemonCenter_1F": await env.sixIslandRival(); return;
        case "SixIsland_RuinValley_EventScript_Scientist": await env.ruinValleyScientist(); return;
        case "SixIsland_RuinValley_EventScript_DottedHoleDoor": await env.dottedHoleDoor(); return;
        case "SixIsland_DottedHole_B1F_EventScript_BrailleUp": await env.say(env.braille("UP")); return;
        case "SixIsland_DottedHole_B2F_EventScript_BrailleLeft": await env.say(env.braille("LEFT")); return;
        case "SixIsland_DottedHole_B3F_EventScript_BrailleRight": await env.say(env.braille("RIGHT")); return;
        case "SixIsland_DottedHole_B4F_EventScript_BrailleDown": await env.say(env.braille("DOWN")); return;
        case "SixIsland_DottedHole_SapphireRoom_EventScript_BrailleMessage":
          await env.say(["LET THE TWO", "GLITTERING", "STONES", "ONE IN RED", "ONE IN BLUE", "CONNECT THE", "PAST.", "TWO FRIENDS", "SHARING",
            "POWER OPEN", "A WINDOW TO", "A NEW WORLD", "THAT GLOWS.", "THE NEXT", "WORLD WAITS", "FOR YOU."].map(env.braille));
          return;
        case "SixIsland_DottedHole_SapphireRoom_EventScript_Sapphire": await env.dottedHoleSapphire(); return;
        case "SixIsland_WaterPath_House1_EventScript_Beauty": await env.heracrossFan(); return;
        case "SixIsland_WaterPath_House1_EventScript_SizeRecord": await env.heracrossChart(); return;
        // ---------- Seven Island ----------
        case "SevenIsland_EventScript_SwordsDanceTutor": await env.moveTutor("Swords Dance", "tutorSwordsDance", "Text_SwordsDance"); return;
        case "SevenIsland_SevaultCanyon_House_EventScript_ChanseyDanceMan": await env.chanseyDance(); return;
        case "SevenIsland_SevaultCanyon_House_EventScript_Chansey":
          env.cry("Chansey");
          await env.say(env.T("SevenIsland_SevaultCanyon_House_Text_Chansey"));
          return;
        // (FireRed's e-Reader trainer, the old woman's visitor, never comes here.)
        case "SevenIsland_House_Room1_EventScript_OldWoman": await env.say(env.T("SevenIsland_House_Room1_Text_OnlyEnjoymentWatchingBattles")); return;
        // ---------- Trainer Tower ----------
        case "TrainerTower_Lobby_EventScript_EntryTrigger": await env.towerEntry(); return;
        case "enter:TrainerTower_Lobby": await env.towerLost(); return;
        case "TrainerTower_Lobby_EventScript_Receptionist":
          await env.say(env.lobbyText(f.tower && f.tower.spokeToOwner ? "ThanksForCompeting" : "GiveItYourBest"));
          return;
        case "TrainerTower_Lobby_EventScript_ShowRecords": await env.towerTimeBoard(); return;
        case "TrainerTower_Elevator_EventScript_FloorSelect": await env.towerElevator(); return;
        case "TrainerTower_EventScript_Owner": await env.towerOwner(); return;
        case "TrainerTower_Lobby_EventScript_BPTutor": await env.bpTutor(); return;
        case env.BT_ENTRY: await env.battleTowerEntry(); return;
        case env.BT_RECEPTION: await env.battleTowerReception(); return;
        case env.BT_NURSE: await env.nurse(ev.map, ev.person); return;
        case env.BT_SIGN: await env.battleTowerSign(); return;
        case env.ST_CUPS: await env.stadiumCups(); return;
        case env.ST_CASTLE: await env.stadiumCastle(); return;
        case env.ST_NURSE: await env.nurse(ev.map, ev.person); return;
        case env.ST_SIGN: await env.stadiumSign(); return;
        case "StadiumIsland_EventScript_Sailor": await env.stadiumSailor(); return;
        case "StadiumIsland_EventScript_StadiumSign": await env.say(["Pokémon Stadium", "Cups and the Gym Leader Castle!\nOpen to all Trainers."]); return;
        case "StadiumIsland_EventScript_PierSign": await env.say("Stadium Island\nThe Seagallop sails for Vermilion."); return;
        case "StadiumIsland_EventScript_Spectator": await env.stadiumSpectator(ev.person); return;
        case "TrainerTower_Lobby_EventScript_BPEggTutor": await env.bpEggTutor(); return;
        case "TrainerTower_EventScript_SingleBattleTrigger": await env.towerBattle(ev.map, 0); return;
        case "TrainerTower_EventScript_DoubleBattleTriggerTop": await env.towerBattle(ev.map, 0); return;
        case "TrainerTower_EventScript_DoubleBattleTriggerBottom": await env.towerBattle(ev.map, 1); return;
        case "TrainerTower_EventScript_DoublesTrainer1": case "TrainerTower_EventScript_SinglesTrainer":
        case "TrainerTower_EventScript_KnockoutTrainer": case "TrainerTower_EventScript_DoublesTrainer2":
          await env.towerTrainerTalk(ev.map, ev.person.localId);
          return;

        // ---------- Cinnabar Island ----------
        // The Gym's door, locked until you have the Secret Key (VAR_TEMP_1, from
        // FLAG_HIDE_POKEMON_MANSION_B1F_SECRET_KEY: CinnabarIsland_EventScript_CheckUnlockGym).
        case "CinnabarIsland_EventScript_GymDoorLocked":
          await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterUp") }]);
          await env.sleep(333);
          await env.say(env.T("CinnabarIsland_Text_DoorIsLocked"));
          Screen.say("");
          await Overworld.act([{ who: "player", moves: env.M("CinnabarIsland_Movement_ForcePlayerFromDoor") }]);
          return;
        case "CinnabarIsland_PokemonCenter_1F_EventScript_Nurse":
          await env.nurse(ev.map, ev.person);
          return;
        case "CinnabarIsland_Mart_EventScript_Clerk":
          await env.mart(ev.person.mart);
          return;
        case "CinnabarIsland_Gym_EventScript_GymGuy":
          await env.say(env.T(f.TRAINER_LEADER_BLAINE ? "CinnabarIsland_Gym_Text_GymGuyPostVictory" : "CinnabarIsland_Gym_Text_GymGuyAdvice"));
          return;
        case "CinnabarIsland_Gym_EventScript_GymStatue":
          await env.say(env.T(env.hasBadge("volcano") ? "CinnabarIsland_Gym_Text_GymStatuePlayerWon" : "CinnabarIsland_Gym_Text_GymStatue"));
          return;
        // The Pokémon Lab: Garett's Seel (for a Ponyta), Clifton's Electrode (for
        // a Raichu), Norma's Tangela (for a Venonat), the fossil doctor and the
        // Metronome tutor.
        case "CinnabarIsland_PokemonLab_ExperimentRoom_EventScript_Garett":
          await env.inGameTrade(env.TRADES.seelor);
          return;
        case "CinnabarIsland_PokemonLab_Lounge_EventScript_Clifton":
          await env.inGameTrade(env.TRADES.esphere);
          return;
        case "CinnabarIsland_PokemonLab_Lounge_EventScript_Norma":
          await env.inGameTrade(env.TRADES.tangeny);
          return;
        case "CinnabarIsland_PokemonLab_ExperimentRoom_EventScript_FossilScientist":
        case env.PEWTER_FOSSIL_SCIENTIST:
          await env.fossilScientist();
          return;
        case "CinnabarIsland_PokemonLab_ResearchRoom_EventScript_MetronomeTutor":
          await env.moveTutor("Metronome", "tutorMetronome", "Text_Metronome");
          return;
        // The Pokémon Mansion's statues: each hides the switch for its doors.
        case "PokemonMansion_1F_EventScript_Statue":
        case "PokemonMansion_2F_EventScript_Statue":
        case "PokemonMansion_3F_EventScript_Statue":
        case "PokemonMansion_B1F_EventScript_Statue":
          await env.mansionSwitch();
          return;

        // ---------- Fuchsia City ----------
        case "FuchsiaCity_PokemonCenter_1F_EventScript_Nurse":
          await env.nurse(ev.map, ev.person);
          return;
        case "FuchsiaCity_Mart_EventScript_Clerk":
          await env.mart(ev.person.mart);
          return;
        case "FuchsiaCity_EventScript_FossilMonSign":
          if (f.mtMoonFossil === "dome-fossil") await env.monSign("Omanyte", env.T("FuchsiaCity_Text_OmanyteSign"));
          else await env.monSign("Kabuto", env.T("FuchsiaCity_Text_KabutoSign"));
          return;
        case "FuchsiaCity_EventScript_SubstituteTutor":
          await env.moveTutor("Substitute", "tutorSubstitute", "Text_Substitute");
          return;
        case "FuchsiaCity_WardensHouse_EventScript_Warden":
          await env.warden();
          return;
        // The Fishing Guru's other brother: (FireRed's Good Rod) the Fishing Rod if
        // you haven't one; then how your fishing is going.
        case "FuchsiaCity_House2_EventScript_FishingGurusBrother":
          if (!env.hasFishingRod()) { await env.rodGift("FuchsiaCity_House2_Text_", "LikeYourStyleTakeThis"); return; }
          await env.say(env.T("FuchsiaCity_House2_Text_HowAreTheFishBiting"));
          await env.say(env.fishingLevelTalk("Fuchsia"));
          return;
        case "FuchsiaCity_House3_EventScript_MoveDeleter":
          await env.fuchsiaMoveDeleter();
          return;
        case "FuchsiaCity_Gym_EventScript_GymGuy":
          await env.say(env.T(f.TRAINER_LEADER_KOGA ? "FuchsiaCity_Gym_Text_GymGuyPostVictory" : "FuchsiaCity_Gym_Text_GymGuyAdvice"));
          return;
        case "FuchsiaCity_Gym_EventScript_GymStatue":
          await env.say(env.T(env.hasBadge("soul") ? "FuchsiaCity_Gym_Text_GymStatuePlayerWon" : "FuchsiaCity_Gym_Text_GymStatue"));
          return;

        // ---------- The Safari Zone ----------
        case "FuchsiaCity_SafariZone_Entrance_EventScript_InfoAttendant":
          await env.say(env.T(await env.confirm(env.fill(env.T("FuchsiaCity_SafariZone_Entrance_Text_FirstTimeAtSafariZone")[0]))
            ? "FuchsiaCity_SafariZone_Entrance_Text_ExplainSafariZone" : "FuchsiaCity_SafariZone_Entrance_Text_SorryYoureARegularHere"));
          return;
        case "FuchsiaCity_SafariZone_Entrance_EventScript_EntryTriggerMid":
        case "FuchsiaCity_SafariZone_Entrance_EventScript_EntryTriggerRight":
        case "FuchsiaCity_SafariZone_Entrance_EventScript_EntryTriggerLeft":
          await env.safariEntry(script.replace("FuchsiaCity_SafariZone_Entrance_EventScript_EntryTrigger", ""));
          return;
        case "enter:FuchsiaCity_SafariZone_Entrance":
          await env.safariGateArrival();
          return;
        case "SafariZone_SecretHouse_EventScript_Attendant":
          if (!f.gotHM03) {
            await env.say(env.T("SafariZone_SecretHouse_Text_CongratsYouveWon"));
            Player.addItem(env.player, "hm03");
            f.gotHM03 = true;
            await env.sayWithJingle(env.itemJingle("hm03"), env.T("SafariZone_SecretHouse_Text_ReceivedHM03FromAttendant"));
          }
          await env.say(env.T("SafariZone_SecretHouse_Text_ExplainSurf"));
          return;

        // ---------- Vermilion City ----------
        // The sailor at the pier checks for an S.S. Ticket (once, until you step back).
        case "VermilionCity_EventScript_CheckTicketLeft":
        case "VermilionCity_EventScript_CheckTicketRight":
          if (env.ticketChecked) return;
          if (f.ssAnneDeparted) {
            // (Then the Seagallop sails from here, with a Tri-Pass or Rainbow Pass:
            // VermilionCity_EventScript_CheckSeagallopPresentTrigger.)
            await Overworld.act([{ who: "LOCALID_VERMILION_FERRY_SAILOR", moves: env.M("Common_Movement_WalkInPlaceFasterLeft") },
              { who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
            await env.vermilionSeagallop(true);
            return;
          }
          await Overworld.act([{ who: "LOCALID_VERMILION_FERRY_SAILOR", moves: env.M("Common_Movement_WalkInPlaceFasterLeft") },
            { who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
          await env.say(env.T("VermilionCity_Text_DoYouHaveATicket"));
          if (!f.gotSSTicket || !Player.itemCount(env.player, "ss-ticket")) {
            await env.say(env.T("VermilionCity_Text_DontHaveNeededSSTicket"));
            await Overworld.act([{ who: "player", moves: ["walk_up"] }]);
            return;
          }
          await env.say(env.T("VermilionCity_Text_FlashedSSTicket"));
          env.ticketChecked = true;
          return;
        case "VermilionCity_EventScript_ExitedTicketCheck":
          env.ticketChecked = false;
          return;
        // The Tradeback Guy (this game's): he trades with you and straight back,
        // so a Pokémon that evolves by trading does (Kadabra, Machoke, Graveler,
        // Haunter, and those holding their item: Onix with a Metal Coat, ...);
        // he won't take one that wouldn't.
        case "Game_EventScript_PokerDealer": await env.pokerTable(); return;
        case "Game_EventScript_BlackjackDealer": await env.blackjackTable(); return;
        case "Game_EventScript_PokerTable": await env.pokerTable(); return;
        case "Game_EventScript_BlackjackTable": await env.blackjackTable(); return;
        case "Game_EventScript_MahjongPlayer": await env.mahjongTable(); return;
        case "Game_EventScript_Rejuvenator": await env.rejuvenator(); return;
        case "Game_EventScript_SSAquaSailor": await env.ssAquaToOlivine(); return;
        case "Game_EventScript_TradebackGuy": {
          await env.say(["Hi! I'm the Tradeback Guy!", "Some Pokémon only evolve when\nthey're traded. Nobody to trade\nwith? Leave it to me!",
            "I'll trade you my Rattata, and then\ntrade your Pokémon right back!"]);
          if (!(await env.confirm("Want to trade a Pokémon with me?"))) { await env.say("Okay! Come back anytime!"); return; }
          // (Only a Pokémon that would evolve by it: each box says ABLE or NOT ABLE.)
          const evolves = (r) => !r.egg && !!Evolution.find(r, { trigger: "trade", party: env.player.party });
          const mine = await env.choosePartyFor("Choose a POKéMON.", null, env.player.party.map((r) => (evolves(r) ? "ABLE" : "NOT ABLE")));
          env.show("world");
          if (!mine) { await env.say("Okay! Come back anytime!"); return; }
          if (mine.egg) { await env.say("An Egg can't be traded!"); return; }
          if (!evolves(mine)) {
            await env.say(["Hmm… " + Party.displayName(mine) + " won't evolve by\ntrading.", "I only trade Pokémon that evolve\nwhen they're traded. Sorry!"]);
            return;
          }
          // Your Pokémon for his Lv. 5 Rattata, and back again: two trades, as
          // FireRed shows them (ui/trade-scene.js), then the trade evolution.
          const rattata = Party.create("Rattata", 5);
          rattata.hp = Party.maxHp(rattata);
          rattata.ot = { name: "TRADEBACK", id: 1 };
          await env.tradeScene(mine, rattata, "Tradeback Guy");
          env.show("world");
          await Overworld.resume();
          await env.say("Great! Now let's trade back!");
          await env.tradeScene(rattata, mine, "Tradeback Guy");
          const name = Party.displayName(mine);
          const evo = Evolution.find(mine, { trigger: "trade", party: env.player.party });
          if (evo) await env.evolve(mine, evo, false);
          env.show("world");
          env.music(env.avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[env.player.location.map] || {}).music);
          await Overworld.resume();
          await env.say(evo ? "There you go! Come back anytime!" : "Here's your " + name + " back!\nCome back anytime!");
          return;
        }
        // ---------- The S.S. Anne ----------
        case "SSAnne_2F_Corridor_EventScript_RivalTriggerLeft":
        case "SSAnne_2F_Corridor_EventScript_RivalTriggerMid":
        case "SSAnne_2F_Corridor_EventScript_RivalTriggerRight":
          if (!f.ssAnneRed && env.canBattle()) await env.ssAnneRed(script.replace("SSAnne_2F_Corridor_EventScript_RivalTrigger", ""));
          return;
        case "SSAnne_CaptainsOffice_EventScript_Captain":
          await env.ssAnneCaptain();
          return;
        // A gentleman shows you the sleeping Pokémon he saw: Snorlax (seen in the Pokédex).
        case "SSAnne_2F_Room1_EventScript_Gentleman":
          Player.markSeen(env.player, "Snorlax");
          env.showPicture("Snorlax");
          await env.say(env.T("SSAnne_2F_Room1_Text_SleepingMonLookedLikeThis"));
          env.hidePicture();
          return;
        // The head chef: tonight's main course is one of three.
        case "SSAnne_Kitchen_EventScript_Chef1": case "SSAnne_Kitchen_EventScript_Chef2":
        case "SSAnne_Kitchen_EventScript_Chef3": case "SSAnne_Kitchen_EventScript_Chef4": {
          await env.say(env.T("SSAnne_Kitchen_Text_IAmLeChefMainCourseIs"));
          await env.say(env.T(["SSAnne_Kitchen_Text_SalmonDuSalad", "SSAnne_Kitchen_Text_EelsAuBarbecue", "SSAnne_Kitchen_Text_PrimeBeefsteak"][Math.floor(Math.random() * 3)]));
          return;
        }
        case "enter:SSAnne_Exterior":
          await env.ssAnneDeparts();
          return;
        case "VermilionCity_EventScript_OaksAide":
          f.talkedToVermilionAide = true;
          await env.say(env.T("VermilionCity_Text_Route2AideHasPackageForYou"));
          return;
        case "VermilionCity_PokemonCenter_1F_EventScript_Nurse":
          await env.nurse(ev.map, ev.person);
          return;
        case "VermilionCity_Mart_EventScript_Clerk":
        case "LavenderTown_Mart_EventScript_Clerk":
          await env.mart(ev.person.mart);
          return;
        case "VermilionCity_Gym_EventScript_LtSurge":
          await env.ltSurge(ev.person);
          return;
        case "VermilionCity_Gym_EventScript_GymGuy":
          await env.say(env.T(f.TRAINER_LEADER_LT_SURGE ? "VermilionCity_Gym_Text_GymGuyPostVictory" : "VermilionCity_Gym_Text_GymGuyAdvice"));
          return;
        case "VermilionCity_Gym_EventScript_GymStatue":
          await env.say(env.T(env.hasBadge("thunder") ? "VermilionCity_Gym_Text_GymStatuePlayerWon" : "VermilionCity_Gym_Text_GymStatue"));
          return;
        // The Fishing Guru gives you (FireRed's Old Rod) the Fishing Rod.
        case "VermilionCity_House1_EventScript_FishingGuru": {
          if (env.hasFishingRod()) {
            await env.say(env.T("VermilionCity_House1_Text_HowAreTheFishBiting"));
            await env.say(env.fishingLevelTalk("Vermilion"));
            return;
          }
          const q = env.T("VermilionCity_House1_Text_ImFishingGuruDoYouLikeToFish");
          await env.say(q.slice(0, -1));
          if (!(await env.confirm(env.fill(q[q.length - 1])))) { await env.say(env.T("VermilionCity_House1_Text_OhThatsSoDisappointing")); return; }
          await env.say(env.T("VermilionCity_House1_Text_TakeThisAndFish"));
          await env.giveFishingRod("the Fishing Guru");
          f.gotOldRod = true;
          await env.say(env.T("VermilionCity_House1_Text_FishingIsAWayOfLife"));
          await env.say(env.FISHING_LEVELS_EXPLAINED);
          return;
        }
        case "VermilionCity_House2_EventScript_Elyssa":
          await env.inGameTrade(env.TRADES.chDing);
          return;
        // Pokémon that cry when you talk to them.
        case "VermilionCity_House3_EventScript_Pidgey":
        case "LavenderTown_House1_EventScript_Cubone":
        case "LavenderTown_VolunteerPokemonHouse_EventScript_Nidorino":
        case "LavenderTown_VolunteerPokemonHouse_EventScript_Psyduck":
        case "VermilionCity_PokemonFanClub_EventScript_Pikachu":
        case "VermilionCity_PokemonFanClub_EventScript_Seel":
        case "SSAnne_1F_Room3_EventScript_Wigglytuff":
        case "SSAnne_B1F_Room5_EventScript_Machoke":
          env.cry(/_EventScript_(\w+)$/.exec(script)[1]);
          await env.say(ev.person.text || []);
          return;
        // The Fan Club's Chairman: hear him out about his Rapidash and get a Bike Voucher.
        case "VermilionCity_PokemonFanClub_EventScript_Chairman": {
          const C = (k) => env.T("VermilionCity_PokemonFanClub_Text_" + k);
          if (f.gotBikeVoucher) { await env.say(C("DidntComeToSeeAboutMonsAgain")); return; }
          const q = C("DidYouComeToHearAboutMyMons");
          await env.say(q.slice(0, -1));
          if (!(await env.confirm(env.fill(q[q.length - 1])))) { await env.say(C("ComeBackToHearStory")); return; }
          await env.say(C("ChairmansStory"));
          Player.addItem(env.player, "bike-voucher");
          f.gotBikeVoucher = true;
          await env.sayWithJingle("mus_obtain_key_item", C("ReceivedBikeVoucherFromChairman"));
          await env.say(C("ExplainBikeVoucher"));
          return;
        }

        // Super Nerd Miguel guards the fossils: beat him, then each of you takes one.
        case "MtMoon_B2F_EventScript_MiguelTrigger":
          if (f.TRAINER_SUPER_NERD_MIGUEL) return;
          await Overworld.act([{ who: "LOCALID_MIGUEL", moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
          await env.miguelBattle();
          return;
        case "MtMoon_B2F_EventScript_Miguel":
          if (f.mtMoonFossil) await env.say(env.T("MtMoon_B2F_Text_LabOnCinnabarRegeneratesFossils"));
          else if (f.TRAINER_SUPER_NERD_MIGUEL) await env.say(env.T("MtMoon_B2F_Text_WellEachTakeAFossil"));
          else await env.miguelBattle();
          return;
        case "MtMoon_B2F_EventScript_DomeFossil":
        case "MtMoon_B2F_EventScript_HelixFossil": {
          if (f.mtMoonFossil || !f.TRAINER_SUPER_NERD_MIGUEL) { if (!f.TRAINER_SUPER_NERD_MIGUEL) await env.say(env.T("MtMoon_B2F_Text_MiguelIntro")); return; }
          const dome = script.endsWith("DomeFossil"), name = dome ? "Dome" : "Helix";
          if (!(await env.confirm(env.fill(env.T("MtMoon_B2F_Text_YouWant" + name + "Fossil")[0])))) return;
          Overworld.removeObject(dome ? "LOCALID_DOME_FOSSIL" : "LOCALID_HELIX_FOSSIL");
          Player.addItem(env.player, dome ? "dome-fossil" : "helix-fossil");
          f.mtMoonFossil = dome ? "dome-fossil" : "helix-fossil";
          await env.say(env.T("MtMoon_B2F_Text_Obtained" + name + "Fossil"));
          // He takes the other one.
          await Overworld.act([{ who: "LOCALID_MIGUEL", moves: ["delay_10"].concat(env.M(dome ? "MtMoon_B2F_Movement_MiguelToHelixFossil" : "MtMoon_B2F_Movement_MiguelToDomeFossil")) }]);
          await env.say(env.T("MtMoon_B2F_Text_ThenThisFossilIsMine"));
          Overworld.removeObject(dome ? "LOCALID_HELIX_FOSSIL" : "LOCALID_DOME_FOSSIL");
          return;
        }

        // ---------- Route 2 ----------

        case "Route2_House_EventScript_Reyley":
          await env.inGameTrade(env.TRADES.mimien);
          return;

        // Prof. Oak's Aide in Route 11's gate: the Itemfinder for thirty kinds caught.
        case "Route11_EastEntrance_2F_EventScript_Aide": {
          const NEEDED = 30, item = "itemfinder", label = "Itemfinder", A = (k) => env.T("Route11_EastEntrance_2F_Text_" + k);
          if (f.gotItemfinder) { await env.say(A("ExplainItemfinder"), [NEEDED, label]); return; }
          const ask = A("GiveItemfinderIfCaught30");
          await env.say(ask.slice(0, -1), [NEEDED, label]);
          if (!(await env.confirm(env.fill(ask[ask.length - 1], [NEEDED, label])))) { await env.say(env.T("Aide_Text_GetEnoughMonsComeBackForItem"), [NEEDED, label]); return; }
          const count = Player.dexCount(env.player, "caught", true);   // (Kanto's: GetPokedexCount)
          if (count < NEEDED) { await env.say(env.T("Aide_Text_HaventCaughtEnoughMonsForItem"), [NEEDED, label, count]); return; }
          await env.say(A("GreatHereYouGo"), [NEEDED, label, count]);
          Player.addItem(env.player, item);
          f.gotItemfinder = true;
          await env.sayWithJingle("mus_obtain_key_item", A("ReceivedItemfinderFromAide").map((p) => env.fill(p, [NEEDED, label])));
          await env.say(A("ExplainItemfinder"), [NEEDED, label]);
          return;
        }
        case "Route11_EastEntrance_2F_EventScript_Turner":
          await env.inGameTrade(env.TRADES.nina);
          return;
        // Prof. Oak's Aide: HM05 Flash for ten kinds of Pokémon caught.
        case "Route2_EastBuilding_EventScript_Aide": {
          const NEEDED = 10, item = "hm05", label = "HM05";
          if (f.gotFlash) { await env.say(env.T("Route2_EastBuilding_Text_ExplainHM05")); return; }
          const ask = env.T("Route2_EastBuilding_Text_GiveHM05IfSeen10Mons");
          await env.say(ask.slice(0, -1));
          if (!(await env.confirm(env.fill(ask[ask.length - 1])))) { await env.say(env.T("Aide_Text_GetEnoughMonsComeBackForItem"), [NEEDED, label]); return; }
          const count = Player.dexCount(env.player, "caught", true);   // (Kanto's: GetPokedexCount)
          if (count < NEEDED) { await env.say(env.T("Aide_Text_HaventCaughtEnoughMonsForItem"), [NEEDED, label, count]); return; }
          await env.say(env.T("Route2_EastBuilding_Text_GreatHereYouGo"), [NEEDED, label, count]);
          Player.addItem(env.player, item);
          f.gotFlash = true;
          await env.say(env.T("Route2_EastBuilding_Text_ReceivedHM05FromAide"));
          await env.say(env.T("Route2_EastBuilding_Text_ExplainHM05"));
          return;
        }

        case "Route1_EventScript_MartClerk":
          if (f.route1Potion) { await env.say("Please come see us if you need\nPoké Balls."); return; }
          await env.say(ev.person.text);
          Player.addItem(env.player, "potion");
          f.route1Potion = true;
          await env.say("{PLAYER} received a Potion.");
          return;
      }
    }

    // ---------- Exploring ----------

    function special(script) {
      if (env.deltaDue(script)) return true;   // (the Delta Episode's scenes as you come in)
      // (Orre: up the road from the Air Strip to the Outskirt Stand the first time, Folly and Trudly come out.)
      if ((script === "arrive:OutskirtStand" || script === "enter:OutskirtStand") && (!(env.player.flags.orre | 0) || ((env.player.flags.orreStory | 0) === 18 && !env.player.flags.orreStandFT))) return true;
      // (Colosseum's story proper: Folly and Trudly at Phenac City; the Mayor's house's scene.)
      // (And Team Snagem's Wakin outside the Mayor's house once he's heard Rui out: orreMayor 1.)
      if ((script === "arrive:PhenacCity" || script === "enter:PhenacCity") && (env.player.flags.orreStory | 0) === 19 && !env.player.flags.orreFT) return true;
      // (Wakin comes once you've been into Phenac Stadium and out again, as in Colosseum: orreStadium.)
      if ((script === "arrive:PhenacCity" || script === "enter:PhenacCity") && (env.player.flags.orreStory | 0) === 20 && (env.player.flags.orreMayor | 0) === 1 && env.player.flags.orreStadium) return true;
      // (Pyrite's windmill, the Pyrite Building locked till Nore leads you in, Phenac Stadium's first visit, Fateen after
      // Miror B.: game/orre-pyrite.js.)
      if (Orre.pyriteSceneDue(script, env.player.flags)) return true;
      if (script === "enter:PhenacCity_MayorsHouse" && (env.player.flags.orreStory | 0) === 20 && (env.player.flags.orreMayor | 0) !== 1) return true;
      // (Colosseum's story, Pyrite: coming to town, the Pyrite Building's top floor, Miror B.'s hideout.)
      if ((script === "arrive:PyriteTown" || script === "enter:PyriteTown") && (env.player.flags.orreStory | 0) === 21) return true;
      if (script === "enter:PyriteTown_PyriteBuilding_4F" && (env.player.flags.orreStory | 0) === 25) return true;
      if (script === "enter:PyriteCave_MirorBHideout" && (env.player.flags.orreStory | 0) === 26) return true;
      if (script === "enter:AgateVillage_EaguansHouse" && (env.player.flags.orreStory | 0) === 28) return true;
      if ((script === "arrive:MtBattle" || script === "enter:MtBattle") && (env.player.flags.orreStory | 0) === 31) return true;
      {
        const story = env.player.flags.orreStory | 0, at = (name) => script === "arrive:" + name || script === "enter:" + name;
        if (at("TheUnder") && story === 33) return true;
        if (script === "enter:TheUnder_Studio" && story === 35) return true;
        // (The Kids Grid: Nett's, the Powerup Part delivered; the Under Subway: shut till Venus runs down it, then her
        // scene at the station and Ein's on B1.)
        if (script === "enter:TheUnder_NettsHideout_1F" && env.nettsDoorShut()) return true;
        if (script === "enter:TheUnder_NettsHideout_B1" && (env.player.flags.orreKidsGrid | 0) === 2) return true;
        if (script === "enter:TheUnder_Subway_B1" && (story < 36 || (env.player.flags.orreSubway | 0) === 1)) return true;
        if (script === "enter:TheUnder_Subway_Station" && story === 36 && !env.player.flags.orreSubway) return true;
        if (at("ShadowLab_1F") && story === 36) return true;
        if (script === "enter:ShadowLab_B1F" && story === 37) return true;
        if (script === "enter:ShadowLab_EinsRoom" && story === 38) return true;
        if (Orre.LAB && Orre.LAB.doorShut(script, env.player.flags)) return true;   // (the lab's locked doors, Orre.LAB.DOORS)
        if (at("RealgamTower_1F") && story === 40) return true;
        if (script === "enter:RealgamTower_Top" && story === 43) return true;
        if (script === "enter:RealgamTower_Colosseum" && env.realgamDoorShut()) return true;   // (without the Admins' four ID Badges)
      }
      // (Orre: else an e-mail due now, Colosseum's: game/orre-mail.js, env.orreMail().)
      if (/^(arrive|enter):/.test(script || "") && (window.WORLD_MAPS[script.split(":")[1]] || {}).region === "orre" && env.orreMailDue && env.orreMailDue(script)) return true;
      // Orre entrance scenes above are conditional; do not let the generic
      // handler registry replay completed scenes when revisiting a building.
      if (/^(arrive|enter):/.test(script || "") && (window.WORLD_MAPS[script.split(":")[1]] || {}).region === "orre") return false;
      if (script === "Orre_WorldMap") return true;   // (Orre: out of a place, its map: orreTravel())
      // Johto: its scripts (a step's, while its var has its value), its
      // Apricorn trees, and its maps' frame tables as you come in.
      // Hoenn: a step's scene while its var has its value, and its maps' frame tables as you come in.
      if (/^hoenn:/.test(script || "")) return env.hoenn.triggerDue(script);
      // (Anyone or any sign in Hoenn that has an Emerald script, unless this game has its own for it.)
      if (env.isHoenn(env.player.location.map) && env.hoenn.hasScript(script) && !env.SPECIAL.has(script) && !env.TRAINER_SCRIPTS.has(script) && !env.ITEM_BALLS.has(script)) return true;
      if (/^(enter|arrive):/.test(script || "") && env.isHoenn(script.replace(/^\w+:/, ""))) return !!env.hoenn.frameScript(script.replace(/^\w+:/, ""), /^enter:/.test(script));
      if (/^hgss:/.test(script || "")) return env.johto.triggerDue(script);
      if (/^hgss_apricorn:/.test(script || "")) return true;
      if (/^Johto_AzaleaRide:\d+$/.test(script || "")) return true;   // (Azalea's Gym's Ariados: azaleaRide())
      if (/^Johto_GoldenrodPanel:\d$/.test(script || "")) return true;   // (Goldenrod Underground's switches: goldenrodPanel())
      if (script === "Johto_MagnetTrain") return true;   // (the Magnet Train's doors: magnetTrainBoard())
      if (script === "Johto_SSAquaBoard") return true;   // (Olivine's port: ssAquaBoard())
      if (/^(BerryFarm_(Caretaker|Tree_\d+)|HoennBerry_Tree_\d+)$/.test(script || "")) return true;   // (Celadon's Berry Farm: ui/berry-farm.js)
      if (/_PokemonCenter_1F_EventScript_Nurse$/.test(script || "") && env.johto.zoneOf(env.player.location.map)) return true;
      if (/^(enter|arrive):/.test(script || "") && env.johto.frameScript(script.replace(/^\w+:/, ""))) return true;
      // Coming back into Pewter City: the Museum ticket was for one visit (FireRed's OnTransition).
      // Coming out of the Gym with the Boulder Badge, Leaf is waiting.
      // Prof. Oak's aide, then his test at the top of Pokémon Tower (this game's own).
      if (script === "enter:Route23" && env.victoryRoadRivalDue()) return true;
      if (/^enter:/.test(script) && env.megaAideDue(script.slice(6))) return true;
      if ((script === "enter:PokemonTower_7F" || script === "Game_EventScript_MegaTower") && env.megaTowerDue()) return true;
      if (script === "enter:PewterCity") env.player.flags.museumTicket = false;
      if (env.teraAideDue(script)) return true;
      if (script === "enter:PewterCity") return env.leafPewterDue();
      // Into Faraway Island's grass (FarawayIsland_Interior_OnTransition): the
      // step count starts again, and Mew, if it's there, is spotted and hides.
      if (script === "enter:FarawayIsland_Interior") { env.player.flags.farawaySteps = 0; return !env.player.flags.foughtMew; }
      // (Orre: Willie comes after you as Folly and Trudly drive off, in Colosseum's story proper: orreStandStory.)
      if (script === "enter:OutskirtStand_Diner" || script === "enter:OutskirtStand") return false;
      // Walking into the Route 4 Pokémon Center makes it where you go after
      // blacking out (FireRed's setrespawn there).
      if (script === "enter:Route4_PokemonCenter_1F") { env.player.flags.lastCenter = "Route4_PokemonCenter_1F"; return false; }
      // (FireRed's FLAG_TEMP_2 and 3: Bill in the Teleporter, back after the ticket.)
      if (script === "enter:SSAnne_Exterior") return env.ssAnneDeparting();
      if (script === "enter:Route25_SeaCottage") { env.billInTeleporter = env.billJustOut = false; env.seaCottageReturn = !!env.player.flags.gotSSTicket; return false; }
      // Pokémon Tower: Gary on 2F until you've battled him, the ghost on 6F
      // until it's at rest, and 5F's purified zone each time you step in.
      if (/^PokemonTower_2F_EventScript_RivalTrigger/.test(script)) return !env.player.flags.towerRival;
      if (script === "PokemonTower_6F_EventScript_MarowakGhost") return !env.player.flags.marowakCalmed;
      if (script === "PokemonTower_5F_EventScript_PurifiedZone") return !env.inPurifiedZone;
      if (script === "PokemonTower_5F_EventScript_ExitPurifiedZone") { env.inPurifiedZone = false; return false; }
      // The Karate Master turns to you until he's beaten; Gary waits on Silph's
      // 7F, and Giovanni on 11F, until you've battled them.
      if (/^SaffronCity_Dojo_EventScript_TriggerMasterBattle/.test(script)) return !env.player.flags.TRAINER_BLACK_BELT_KOICHI || !!env.dojoRematch(env.DOJO_MASTER);
      if (/^SilphCo_7F_EventScript_RivalTrigger/.test(script)) return !env.player.flags.silphRival;
      if (/^SilphCo_11F_EventScript_GiovanniTrigger/.test(script)) return !env.silphFreed();
      // Back in the Safari Zone's gate during the Safari Game: leaving early?
      if (script === "enter:" + env.SAFARI_GATE) return env.safariOn();
      // Cycling Road (FireRed's VAR_MAP_SCENE_ROUTE16): which side of a gate's
      // guard you're on; coming out onto Route 16 or 18 on the Cycling Road
      // side, you're put on your Bicycle (ForcePlayerOntoBike).
      if (script === "EventScript_SetEnteringCyclingRoad") { env.player.flags.cyclingRoad = true; return false; }
      if (script === "EventScript_SetExitingCyclingRoad") { delete env.player.flags.cyclingRoad; return false; }
      if (script === "enter:Route16" || script === "enter:Route18") {
        if (env.player.flags.cyclingRoad && Overworld.avatar() === "walk") Overworld.setAvatar("bike");
        return false;
      }
      // The Seafoam Islands: fallen onto B3F's or B4F's water (FallWarpEffect_7).
      if (script === "enter:SeafoamIslands_B3F" || script === "enter:SeafoamIslands_B4F") {
        const at = env.player.location;
        return env.seafoamFell === at.map && World.isSurfable(World.blockAt(at.map, at.x, at.y).behavior);
      }
      // Viridian Gym's door, locked until you've the other Badges.
      if (script === "ViridianCity_EventScript_GymDoorLocked") return !env.viridianGymOpen();
      // Route 22: Gary, once Giovanni's beaten; the gate's and Route 23's
      // guards stop you at the next one whose Badge you haven't shown.
      if (/^Route22_EventScript_EarlyRivalTrigger/.test(script)) return !!(env.player.flags.pokedex && !env.player.flags.route22Rival);
      if (/^Route22_EventScript_LateRivalTrigger/.test(script)) return env.route22LateRivalDue();
      if (script === "Route22_NorthEntrance_EventScript_BoulderBadgeGuardTrigger") return LeagueRoad.guardStops(env.player.flags, 1);
      { const g = /^Route23_EventScript_(\w+)BadgeGuardTrigger$/.exec(script); if (g) return LeagueRoad.guardStops(env.player.flags, env.ROUTE23_BADGES.indexOf(g[1]) + 1); }
      // The Pokémon League's rooms: their entry scenes, while it's their turn;
      // the Hall of Fame's, always.
      if (/^enter:PokemonLeague_/.test(script)) { const m = script.slice(6); return m === League.HALL_OF_FAME || League.entryDue(env.player.flags, m); }
      // Walking into the Indigo Plateau's Pokémon Center makes it where you go
      // after blacking out (FireRed's setrespawn there).
      if (script === "enter:IndigoPlateau_PokemonCenter_1F") { env.player.flags.lastCenter = "IndigoPlateau_PokemonCenter_1F"; return false; }
      // Cinnabar Gym's door, locked until you've the Secret Key.
      if (script === "CinnabarIsland_EventScript_GymDoorLocked") return !env.player.flags.FLAG_HIDE_POKEMON_MANSION_B1F_SECRET_KEY;
      // Back in the Pokémon Lab (or Pewter's Museum), a fossil you left with the doctor is ready.
      // (Or Sinnoh's: Oreburgh's, the Essentials project's.)
      const fossilHere = /^enter:/.test(script || "") && env.isSinnoh(script.slice(6)) && (window.WORLD_MAPS[script.slice(6)].people || []).some((p) => /_EventScript_FossilScientist$/.test(p.script || ""));
      if (script === "enter:CinnabarIsland_PokemonLab_Entrance" || script === "enter:PewterCity_Museum_1F" || fossilHere) {
        if (env.player.flags.fossilRevive) env.player.flags.fossilRevive.ready = true;
        return false;
      }
      // The Sevii Islands: Bill waiting outside Blaine's Gym (on arriving
      // however you come, or walking about); the Pokémon Centers where you'll
      // be after blacking out (FireRed's setrespawn on entering them); the
      // Joyful Game Corner's scene; Bill ready to leave One Island; the Ember
      // Spa's spring, once a visit; the bikers; the Rockets' password.
      if (script === "enter:CinnabarIsland" || script === "arrive:CinnabarIsland") return env.player.flags.cinnabarScene === 1;
      if (/^enter:(One|Two|Three|Four|Five|Six|Seven)Island_PokemonCenter_1F$/.test(script)) {
        env.player.flags.lastCenter = script.slice(6);
        // (Gary's there the first time you come to Six Island's: SixIsland_PokemonCenter_1F_OnFrame.)
        if (script === "enter:SixIsland_PokemonCenter_1F") return !env.player.flags.sixCenterScene;
        // (Celio's not been met: OneIsland_PokemonCenter_1F_OnFrame.)
        return script === "enter:OneIsland_PokemonCenter_1F" && !env.player.flags.celioScene && (env.player.flags.oneHarborScene || 0) >= 2;
      }
      // Trainer Tower: its counter while no challenge is on; back in the lobby
      // having lost (TrainerTower_Lobby_EventScript_Enter); a floor's battle
      // while it's the next to clear, and its trainers haven't come for you yet.
      if (script === "TrainerTower_Lobby_EventScript_EntryTrigger") return !env.player.flags.towerScene;
      if (script === env.BT_ENTRY) return !env.player.flags.battleTowerScene;
      if (script === "enter:TrainerTower_Lobby") return !!(env.player.flags.tower && env.player.flags.tower.lost);
      if (/^TrainerTower_EventScript_(Single|Double)BattleTrigger/.test(script)) {
        const map = env.player.location.map, n = env.towerFloorNo(map);
        if (!n || !env.player.flags.tower || TrainerTower.floorCleared(env.player.flags, n)) return false;
        const type = env.towerFloor(n).type, double = /Double/.test(script);
        if (double ? type !== "double" : type === "double") return false;
        return !env.tempFlags.has(map + (double ? ":doubles" : ":singles"));
      }
      if (script === "enter:TwoIsland_JoyfulGameCorner") return !env.player.flags.gameCornerScene;
      if (script === "enter:OneIsland") return env.player.flags.oneHarborScene === 2;
      if (/^OneIsland_PokemonCenter_1F_EventScript_LeaveOneIslandTrigger/.test(script)) return env.player.flags.celioScene === 2;
      if (script === "OneIsland_KindleRoad_EmberSpa_EventScript_SpaHeal") return !env.tempFlags.has("OneIsland_KindleRoad_EmberSpa:spa");
      if (script === "ThreeIsland_EventScript_BikerBossIntroTrigger") return env.player.flags.threeIslandScene === 2;
      if (/^ThreeIsland_EventScript_BattleBikersTrigger/.test(script)) return env.player.flags.threeIslandScene === 3;
      if (script === "MtEmber_Exterior_EventScript_RocketPasswordScene") return env.player.flags.mtEmberScene === 1;
      // Four Island: Gary the first time you come; Lorelei and the poachers in
      // Icefall Cave. Five Island: the Warehouse Admin turning round; Selphy
      // lost in the Lost Cave (until she's beaten: ..._Room10_OnResume), and
      // brought home to Resort Gorgeous.
      if (script === "enter:FourIsland") return !env.player.flags.fourIslandScene;
      if (script === "FourIsland_IcefallCave_Back_EventScript_LoreleiRocketsScene") return !env.player.flags.icefallScene;
      if (script === "FiveIsland_RocketWarehouse_EventScript_Admin2Trigger") return !env.player.flags.warehouseScene;
      if (script === "enter:FiveIsland_LostCave_Room10") return !env.player.flags.lostCaveScene && !env.player.flags.TRAINER_LADY_SELPHY;
      if (script === "enter:FiveIsland_ResortGorgeous") return env.player.flags.resortScene === 1;
      // The guards stop you only until you have a Bicycle (VAR_TEMP_1).
      if (/_EventScript_NeedBikeTrigger/.test(script)) return !Player.itemCount(env.player, "bicycle");
      // The Saffron gates' guards, until they've had the Tea.
      if (/^Route[5-8]_\w+Entrance_EventScript_GuardTrigger/.test(script)) return !env.player.flags.gatesOpen;
      return env.SPECIAL.has(script) || env.ITEM_BALLS.has(script) || env.TRAINER_SCRIPTS.has(script);
    }

    return {
      visible,
      story,
      special,
    };
  }

  window.StoryEvents = { create };
})();
