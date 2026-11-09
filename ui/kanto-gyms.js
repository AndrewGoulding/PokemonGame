// Kanto Gym scenes and progression.
// Shared state and services are accessed through live env properties.
(function () {
  "use strict";

  function create(env) {
    // ---------- Pewter City ----------

    // The boy who takes you to the Gym (FireRed's GymGuideTrigger, or talking to
    // him from beside him: "East"). He leads, you follow, then he leaves.
    async function gymGuide(side, talked) {
      const G = "LOCALID_PEWTER_GYM_GUIDE";
      await env.say(env.T("PewterCity_Text_BrocksLookingForChallengersFollowMe"));
      if (side === "East") {
        await Overworld.act([{ who: "player", moves: env.M("PewterCity_Movement_PlayerWaitForGuideEast") }, { who: G, moves: env.M("PewterCity_Movement_GuideMoveToLeadEast") }]);
        await Overworld.act([{ who: "player", moves: env.M("PewterCity_Movement_PlayerWalkToGymEast") }, { who: G, moves: env.M("PewterCity_Movement_GuideWalkToGymEast") }]);
      } else {
        await Overworld.act([{ who: G, moves: env.M("PewterCity_Movement_GuideMoveToLead" + side) }]);
        await Overworld.act([{ who: "player", moves: env.M("PewterCity_Movement_PlayerWalkToGym" + side) }, { who: G, moves: env.M("PewterCity_Movement_GuideWalkToGym" + side) }]);
      }
      await env.say(env.T("PewterCity_Text_GoTakeOnBrock"));
      await Overworld.act([{ who: G, moves: env.M("PewterCity_Movement_GymGuideExit") }]);
      Overworld.removeObject(G);
    }

    // Brock's team: FireRed's Geodude and Onix, plus Zubat (level 11), which he
    // leads with, and Vulpix (level 13).
    function brockTeam() {
      const [geodude, onix] = env.trainerTeam("TRAINER_LEADER_BROCK");
      // (His ace, Onix, Terastallizes into a Dragon type as soon as it's out.)
      Object.assign(onix, { teraType: "Dragon", teraAce: true });
      return [Party.create("Zubat", 11, { ivs: 0 }), geodude, Party.create("Vulpix", 13, { ivs: 0 }), onix];
    }

    // Misty's team: Psyduck (level 18, in Staryu's place), which she leads
    // with, Togepi (level 19), then FireRed's Starmie.
    function mistyTeam() {
      const [, starmie] = env.trainerTeam("TRAINER_LEADER_MISTY");
      // (Her ace, Starmie, Terastallizes into a pure Psychic type as soon as it's out.)
      Object.assign(starmie, { teraType: "Psychic", teraAce: true });
      return [Party.create("Psyduck", 18, { ivs: 0 }),
        Party.create("Togepi", 19, { ivs: 0 }), starmie];
    }

    // Brock: battle (talking to him), then the Boulder Badge and TM39.
    async function brock(person) {
      const f = env.player.flags;
      if (!f.TRAINER_LEADER_BROCK) {
        await env.say(person.trainer.intro);
        if (!env.canBattle()) return;
        const outcome = await env.battle("trainer", { foe: { name: "Leader Brock", team: brockTeam(), pic: "leader_brock", tera: true },
          defeatText: person.trainer.defeat, trainerId: "TRAINER_LEADER_BROCK", terrain: "leader" });
        if (outcome !== "won") return;
        if (!env.hasBadge("boulder")) env.player.badges.push("boulder");
        env.show("world");
        await Overworld.resume();
      }
      if (!f.gotTM39) {
        await env.say(env.T("PewterCity_Gym_Text_TakeThisWithYou"));
        Player.addItem(env.player, "tm39");
        f.gotTM39 = true;
        await env.say(env.T("PewterCity_Gym_Text_ReceivedTM39FromBrock"));
        await env.say(env.T("PewterCity_Gym_Text_ExplainTM39"));
        return;
      }
      await env.say(env.T("PewterCity_Gym_Text_BrockPostBattle"));
    }

    // Misty: battle (talking to her), then the Cascade Badge and TM03 Water
    // Pulse (this game's TM101). Beating her also beats her Gym's trainers
    // (FireRed's set_gym_trainers).
    async function misty(person) {
      const f = env.player.flags;
      if (!f.TRAINER_LEADER_MISTY) {
        await env.say(person.trainer.intro);
        if (!env.canBattle()) return;
        const outcome = await env.battle("trainer", { foe: { name: "Leader Misty", team: mistyTeam(), pic: "leader_misty", tera: true },
          defeatText: person.trainer.defeat, trainerId: "TRAINER_LEADER_MISTY", terrain: "leader" });
        if (outcome !== "won") return;
        if (!env.hasBadge("cascade")) env.player.badges.push("cascade");
        f.TRAINER_PICNICKER_DIANA = f.TRAINER_SWIMMER_MALE_LUIS = true;
        env.player.flags.lastCenter = "CeruleanCity_PokemonCenter_1F";
        env.show("world");
        await Overworld.resume();
      }
      if (!f.gotTM03) {
        await env.say(env.T("CeruleanCity_Gym_Text_ExplainCascadeBadge"));
        Player.addItem(env.player, "tm101");
        f.gotTM03 = true;
        await env.sayWithJingle(env.itemJingle("tm101"), "{PLAYER} received TM101\nfrom Misty.");
      }
      await env.say(env.T("CeruleanCity_Gym_Text_ExplainTM03").map((p) => p.replace(/TM03/g, "TM101")));
    }

    // Lt. Surge: battle (talking to him), then the Thunder Badge and TM34 Shock
    // Wave (this game's TM102). Beating him also beats his Gym's trainers.
    // His team: FireRed's, his ace Raichu Terastallizing into a Water type as soon as it's out.
    function surgeTeam() {
      const team = env.trainerTeam("TRAINER_LEADER_LT_SURGE");
      Object.assign(team.find((r) => r.species === "Raichu"), { teraType: "Water", teraAce: true });
      return team;
    }

    async function ltSurge(person) {
      const f = env.player.flags, ID = "TRAINER_LEADER_LT_SURGE";
      if (!f[ID]) {
        await env.say(person.trainer.intro);
        if (!env.canBattle()) return;
        const outcome = await env.battle("trainer", { foe: { name: "Leader Lt. Surge", team: surgeTeam(), pic: "leader_lt_surge", tera: true },
          defeatText: person.trainer.defeat, trainerId: ID, terrain: "leader" });
        if (outcome !== "won") return;
        if (!env.hasBadge("thunder")) env.player.badges.push("thunder");
        f.TRAINER_ENGINEER_BAILY = f.TRAINER_SAILOR_DWAYNE = f.TRAINER_GENTLEMAN_TUCKER = true;
        env.player.flags.lastCenter = "VermilionCity_PokemonCenter_1F";
        env.show("world");
        await Overworld.resume();
      }
      if (!f.gotTM34) {
        await env.say(env.T("VermilionCity_Gym_Text_ExplainThunderBadgeTakeThis"));
        Player.addItem(env.player, "tm102");
        f.gotTM34 = true;
        await env.sayWithJingle(env.itemJingle("tm102"), "{PLAYER} received TM102\nfrom Lt. Surge.");
        await env.say(env.T("VermilionCity_Gym_Text_ExplainTM34").map((p) => p.replace(/TM34/g, "TM102")));
        return;
      }
      await env.say(env.T("VermilionCity_Gym_Text_LtSurgePostBattle"));
    }

    // Erika: battle (talking to her), then the Rainbow Badge and TM19 Giga
    // Drain (this game's TM103). Beating her also beats her Gym's trainers.
    // Her team: FireRed's, her ace Vileplume Terastallizing into a Poison type as soon as it's out.
    function erikaTeam() {
      const team = env.trainerTeam("TRAINER_LEADER_ERIKA");
      Object.assign(team.find((r) => r.species === "Vileplume"), { teraType: "Poison", teraAce: true });
      return team;
    }

    async function erika(person) {
      const f = env.player.flags, ID = "TRAINER_LEADER_ERIKA";
      if (!f[ID]) {
        await env.say(person.trainer.intro);
        if (!env.canBattle()) return;
        const outcome = await env.battle("trainer", { foe: { name: "Leader Erika", team: erikaTeam(), pic: "leader_erika", tera: true },
          defeatText: person.trainer.defeat, trainerId: ID, terrain: "leader" });
        if (outcome !== "won") return;
        if (!env.hasBadge("rainbow")) env.player.badges.push("rainbow");
        for (const t of ["LASS_KAY", "LASS_LISA", "PICNICKER_TINA", "BEAUTY_BRIDGET", "BEAUTY_TAMIA", "BEAUTY_LORI", "COOLTRAINER_MARY"]) f["TRAINER_" + t] = true;
        env.player.flags.lastCenter = "CeladonCity_PokemonCenter_1F";
        env.show("world");
        await Overworld.resume();
      }
      if (!f.gotTM19) {
        await env.say(env.T("CeladonCity_Gym_Text_ExplainRainbowBadgeTakeThis"));
        Player.addItem(env.player, "tm103");
        f.gotTM19 = true;
        await env.sayWithJingle(env.itemJingle("tm103"), "{PLAYER} received TM103\nfrom Erika.");
        await env.say(env.T("CeladonCity_Gym_Text_ExplainTM19").map((p) => p.replace(/TM19/g, "TM103")));
        return;
      }
      await env.say(env.T("CeladonCity_Gym_Text_ErikaPostBattle"));
    }

    // Sabrina: battle (talking to her), then the Marsh Badge and TM04 Calm
    // Mind (FireRed's TM04: the TM with Calm Mind here). Beating her also beats
    // her Gym's trainers.
    async function sabrina(person) {
      const f = env.player.flags, ID = "TRAINER_LEADER_SABRINA";
      if (!f[ID]) {
        await env.say(person.trainer.intro);
        if (!env.canBattle()) return;
        // (This game's: her Alakazam holds its Alakazite, Mega Evolves, then
        // Terastallizes into a Dark type.)
        const team = env.swappedTeam(ID).map((r) => (r.species === "Alakazam" ? Object.assign(r, { item: "alakazite", teraType: "Dark", teraAce: true }) : r));
        const outcome = await env.battle("trainer", { foe: { name: "Leader Sabrina", team, pic: "leader_sabrina", tera: true },
          defeatText: person.trainer.defeat, trainerId: ID, terrain: "leader" });
        if (outcome !== "won") return;
        if (!env.hasBadge("marsh")) env.player.badges.push("marsh");
        for (const t of ["PSYCHIC_JOHAN", "PSYCHIC_TYRON", "PSYCHIC_CAMERON", "PSYCHIC_PRESTON", "CHANNELER_AMANDA", "CHANNELER_STACY",
          "CHANNELER_TASHA"]) f["TRAINER_" + t] = true;
        env.player.flags.lastCenter = "SaffronCity_PokemonCenter_1F";
        env.show("world");
        await Overworld.resume();
      }
      const tm = env.machineFor("Calm Mind");
      if (!f.gotTM04) {
        await env.say(env.T("SaffronCity_Gym_Text_ExplainMarshBadgeTakeThis"));
        Player.addItem(env.player, tm);
        f.gotTM04 = true;
        await env.sayWithJingle(env.itemJingle(tm), env.tmText(env.T("SaffronCity_Gym_Text_ReceivedTM04FromSabrina"), 4, tm));
        await env.sabrinaAlakazite();
        await env.say(env.T("SaffronCity_Gym_Text_SabrinaPostBattle"));
        return;
      }
      if (await env.sabrinaAlakazite()) return;
      await env.say(env.tmText(env.T("SaffronCity_Gym_Text_ExplainTM04"), 4, tm));
    }

    async function koga(person) {
      const f = env.player.flags, ID = "TRAINER_LEADER_KOGA";
      if (!f[ID]) {
        await env.say(person.trainer.intro);
        if (!env.canBattle()) return;
        const outcome = await env.battle("trainer", { foe: { name: "Leader Koga", team: env.kogaTeam(), pic: "leader_koga", tera: true },
          defeatText: person.trainer.defeat, trainerId: ID, terrain: "leader" });
        if (outcome !== "won") return;
        if (!env.hasBadge("soul")) env.player.badges.push("soul");
        for (const t of ["TAMER_PHIL", "TAMER_EDGAR", "JUGGLER_KIRK", "JUGGLER_SHAWN", "JUGGLER_KAYDEN", "JUGGLER_NATE"]) f["TRAINER_" + t] = true;
        env.player.flags.lastCenter = "FuchsiaCity_PokemonCenter_1F";
        env.show("world");
        await Overworld.resume();
      }
      const tm = env.machineFor("Toxic");
      if (!f.gotTM06FromKoga) {
        await env.say(env.T("FuchsiaCity_Gym_Text_KogaExplainSoulBadge"));
        Player.addItem(env.player, tm);
        f.gotTM06FromKoga = true;
        await env.sayWithJingle(env.itemJingle(tm), env.tmText(env.T("FuchsiaCity_Gym_Text_ReceivedTM06FromKoga"), 6, tm));
        await env.say(env.tmText(env.T("FuchsiaCity_Gym_Text_KogaExplainTM06"), 6, tm));
        return;
      }
      await env.say(env.T("FuchsiaCity_Gym_Text_KogaPostBattle"));
    }

    // Giovanni (ViridianCity_Gym_EventScript_Giovanni): back at his Gym, the
    // Leader all along. Battle, then the Earth Badge and TM26 Earthquake;
    // beating him also beats his Gym's trainers, sends Gary to wait on Route 22
    // (VAR_MAP_SCENE_ROUTE22, 3) and the Rockets left around Kanto away. Talk
    // to him again and he tells you Team Rocket is finished, and he's gone.
    async function giovanniGym(person) {
      const f = env.player.flags, ID = "TRAINER_LEADER_GIOVANNI";
      const tm = env.machineFor("Earthquake");
      if (!f[ID]) {
        const intro = person.trainer.intro;
        await env.say(intro.slice(0, -1));
        env.music("mus_encounter_rocket");
        await env.say(intro.slice(-1));
        if (!env.canBattle()) return;
        const outcome = await env.battle("trainer", { foe: { name: "Leader Giovanni", team: env.swappedTeam(ID), pic: "leader_giovanni", tera: true },
          defeatText: person.trainer.defeat, trainerId: ID, terrain: "leader" });
        if (outcome !== "won") return;
        if (!env.hasBadge("earth")) env.player.badges.push("earth");
        for (const t of ["TAMER_JASON", "TAMER_COLE", "BLACK_BELT_ATSUSHI", "BLACK_BELT_KIYO", "BLACK_BELT_TAKASHI",
          "COOLTRAINER_SAMUEL", "COOLTRAINER_YUJI", "COOLTRAINER_WARREN"]) f["TRAINER_" + t] = true;
        env.player.flags.lastCenter = "ViridianCity_PokemonCenter_1F";
        env.show("world");
        await Overworld.resume();
      }
      if (!f.gotTM26FromGiovanni) {
        await env.say(env.T("ViridianCity_Gym_Text_ExplainEarthBadgeTakeThis"));
        Player.addItem(env.player, tm);
        f.gotTM26FromGiovanni = true;
        await env.sayWithJingle(env.itemJingle(tm), env.tmText(env.T("ViridianCity_Gym_Text_ReceivedTM26FromGiovanni"), 26, tm));
        await env.say(env.tmText(env.T("ViridianCity_Gym_Text_ExplainTM26"), 26, tm));
        await env.giovanniKangaskhanite();
        return;
      }
      if (await env.giovanniKangaskhanite()) return;
      await env.say(env.T("ViridianCity_Gym_Text_GiovanniPostBattle"));
      Screen.say("");
      await Overworld.fadeToBlack();
      f.giovanniLeft = true;
      Overworld.removePerson(person);
      await Overworld.fadeFromBlack();
    }

    // A rematch team from a trainer's party: its ace (by species) given its
    // Tera Type and anything else in `ace` (a level: raised to it); `swap`:
    // [species, for species, extras], the new one the ace.
    function leaderTeam(id, aceSpecies, ace, swap) {
      const team = env.trainerTeam(id);
      for (const [from, to, extra] of swap || []) {
        const i = team.findIndex((r) => r.species === from);
        if (i >= 0) team.push(Object.assign(Party.create(to, team.splice(i, 1)[0].level + 1, { ivs: 31 }), extra || {}, { teraAce: true }));   // (last: the ace)
      }
      const r = aceSpecies && team.find((m) => m.species === aceSpecies);
      if (r) {
        const { level, ...rest } = ace;
        if (level) Object.assign(r, Party.create(r.species, level, { ivs: 31 }), { item: r.item });
        Object.assign(r, rest, { teraAce: true });
      }
      return team;
    }

    async function leaderRematch(L) {
      const f = env.player.flags;
      if (!f.gameClear || !f[L.id] || !f[L.tm]) return false;
      const days = f.leaderRematchDay || (f.leaderRematchDay = {}), today = Player.gameTime().today;
      if (days[L.id] === today) return false;   // (beaten today: their usual words)
      await env.say(L.intro);
      if (!(await env.confirm(L.name + ": Will you battle me again?"))) { await env.say([L.name + ": Very well. Come back anytime."]); return true; }
      if (!env.canBattle()) return true;
      const team = L.team(), top = Math.max(...team.map((r) => r.level));
      const outcome = await env.battle("trainer", { foe: { name: "Leader " + L.name, team, pic: L.pic, tera: true }, defeatText: L.defeat, terrain: "leader", prize: top * 200 });
      if (outcome !== "won") return true;
      days[L.id] = today;
      env.show("world");
      await Overworld.resume();
      await env.say([L.name + ": Come back tomorrow, Champion,\nand we'll battle again!"]);
      return true;
    }

    // ---------- Cinnabar Island ----------

    // Blaine: battle (talking to him), then the Volcano Badge and TM38 Fire
    // Blast. Beating him also beats his Gym's trainers and opens all its doors.
    // Bill's then waiting outside to take you to the Sevii Islands
    // (VAR_MAP_SCENE_CINNABAR_ISLAND 1: flags.cinnabarScene).
    // His team (this game's): Magmortar and Magcargo in place of FireRed's
    // Growlithe and Ponyta, FireRed's Rapidash and Arcanine, and his ace,
    // Houndoom with its Houndoominite: it Mega Evolves and Terastallizes into a Dark type.
    function blaineTeam() {
      const [, , rapidash, arcanine] = env.trainerTeam("TRAINER_LEADER_BLAINE");
      return [Party.create("Magmortar", 43, { ivs: 0 }), Party.create("Magcargo", 42, { ivs: 0 }),
        rapidash, arcanine, Object.assign(Party.create("Houndoom", 48, { ivs: 0 }), { item: "houndoominite", teraType: "Dark", teraAce: true })];
    }

    async function blaine(person) {
      const f = env.player.flags, ID = "TRAINER_LEADER_BLAINE";
      if (!f[ID]) {
        await env.say(person.trainer.intro);
        if (!env.canBattle()) return;
        const outcome = await env.battle("trainer", { foe: { name: "Leader Blaine", team: blaineTeam(), pic: "leader_blaine", tera: true },
          defeatText: person.trainer.defeat, trainerId: ID, terrain: "leader" });
        if (outcome !== "won") return;
        if (!env.hasBadge("volcano")) env.player.badges.push("volcano");
        for (const t of ["SUPER_NERD_ERIK", "SUPER_NERD_AVERY", "SUPER_NERD_DEREK", "SUPER_NERD_ZAC", "BURGLAR_QUINN", "BURGLAR_RAMON", "BURGLAR_DUSTY"]) f["TRAINER_" + t] = true;
        env.player.flags.lastCenter = "CinnabarIsland_PokemonCenter_1F";
        if (!f.cinnabarScene) f.cinnabarScene = 1;
        env.applyPatches("CinnabarIsland_Gym");
        env.show("world");
        await Overworld.resume();
      }
      const tm = env.machineFor("Fire Blast");
      if (!f.gotTM38FromBlaine) {
        await env.say(env.T("CinnabarIsland_Gym_Text_ExplainVolcanoBadge"));
        Player.addItem(env.player, tm);
        f.gotTM38FromBlaine = true;
        await env.sayWithJingle(env.itemJingle(tm), env.tmText(env.T("CinnabarIsland_Gym_Text_ReceivedTM38FromBlaine"), 38, tm));
        await env.say(env.tmText(env.T("CinnabarIsland_Gym_Text_FireBlastIsUltimateFireMove"), 38, tm));
        return;
      }
      await env.say(env.tmText(env.T("CinnabarIsland_Gym_Text_BlainePostBattle"), 38, tm));
    }

    function openQuizDoor(n) {
      if (env.quizDoorOpen(n)) return;
      env.sfx("se_unlock");
      (env.player.flags.cinnabarQuiz || (env.player.flags.cinnabarQuiz = {}))[n] = true;
      env.applyPatches("CinnabarIsland_Gym");
    }

    async function cinnabarQuiz(n, side) {
      const q = env.CINNABAR_QUIZ[n], G = (k) => env.T("CinnabarIsland_Gym_Text_" + k);
      await env.say(G("PokemonQuizRules"));
      const answer = await env.confirm(G("QuizQuestion" + n).join("\n"));
      if (answer === q.yes) {
        await env.sayWithJingle("mus_level_up", G("CorrectGoOnThrough"));
        openQuizDoor(n);
        return;
      }
      env.sfx("se_boo");
      await env.say(G("SorryBadCall"));
      Screen.say("");
      if (env.player.flags[q.trainer]) return;
      // (Avery comes round the machine; the others walk over.)
      const L = (k) => env.M("CinnabarIsland_Gym_Movement_" + k);
      await Overworld.act([{ who: "player", moves: n === 2 ? L("PlayerFaceAvery") : env.M("Common_Movement_WalkInPlaceFasterRight") },
        { who: q.who, moves: L(q.name + "Approach" + side) }]);
      const data = window.WORLD_TRAINERS[q.trainer];
      env.music(data.music || "mus_encounter_boy");
      await env.say(G(q.name + "Intro"));
      if (!env.canBattle()) return;
      const outcome = await env.battle("trainer", { foe: { name: data.className + " " + data.name, team: env.trainerTeam(q.trainer), pic: data.pic },
        defeatText: G(q.name + "Defeat"), trainerId: q.trainer, prizeClass: data.className });
      if (outcome !== "won") return;
      env.show("world");
      await Overworld.resume();
      openQuizDoor(n);
    }

    async function fossilScientist() {
      const f = env.player.flags, X = (k) => env.T("CinnabarIsland_PokemonLab_ExperimentRoom_Text_" + k);
      const reviving = f.fossilRevive;
      if (reviving && reviving.ready) {
        const fo = env.FOSSILS.find((x) => x.item === reviving.item), name = Party.speciesName(fo.species);
        await env.say(X("FossilMonBackToLife"), [name]);
        const given = await env.giftMon(fo.species, 5, X("ReceivedMonFromDoctor"), [name], () => { f[fo.flag] = true; delete f.fossilRevive; });
        if (!given) return;
        return;
      }
      if (reviving) { await env.say(X("TakesTimeGoForWalk")); return; }
      // (Any fossil in your Bag, however you came by it: Mt. Moon's, the Old
      // Amber, or one dug up mining, as many times as you bring one.)
      const can = env.FOSSILS.filter((fo) => Player.itemCount(env.player, fo.item));
      const ask1 = X("HaveYouAFossilForMe");
      if (!can.length) { await env.say(ask1); await env.say(X("NoIsTooBad")); return; }
      await env.say(ask1.slice(0, -1));
      const v = await env.ask(env.fill(ask1[ask1.length - 1]), can.map((fo) => ({ label: Bag.name(fo.item), value: fo.item })).concat([env.back("Cancel")]));
      Screen.say("");
      if (v === "back") { await env.say(X("NoIsTooBad")); return; }
      const fo = env.FOSSILS.find((x) => x.item === v), vars = [Party.speciesName(fo.species), Bag.name(fo.item)];
      const make = X("ThatFossilIsOfMonMakeItLiveAgain");
      await env.say(make.slice(0, -1), vars);
      if (!(await env.confirm(env.fill(make[make.length - 1], vars)))) { await env.say(X("YouComeAgain")); return; }
      await env.say(X("HandedFossilToWeirdDoctor"), vars);
      Player.removeItem(env.player, fo.item);
      f.fossilRevive = { item: fo.item };
      await env.say(X("TakesTimeGoForWalk"));
    }

    // The Pokémon Mansion's statues (PokemonMansion_EventScript_SecretSwitch):
    // one switch for the whole house (FLAG_POKEMON_MANSION_SWITCH_STATE), which
    // swaps which of its doors are open on every floor (the "pressed" patches).
    async function mansionSwitch() {
      const q = env.T("PokemonMansion_Text_PressSecretSwitch");
      await env.say(q.slice(0, -1));
      if (!(await env.confirm(q[q.length - 1]))) { await env.say(env.T("PokemonMansion_Text_NotQuiteYet")); return; }
      await env.say(env.T("PokemonMansion_Text_WhoWouldnt"));
      Screen.say("");
      if (env.player.flags.mansionSwitch) delete env.player.flags.mansionSwitch; else env.player.flags.mansionSwitch = true;
      env.applyPatches(env.player.location.map);
      env.sfx("se_unlock");
    }

    function hideVermilionSwitches() {
      // Cans 1-15, five a row in three rows: the second is a neighbour of the first.
      const first = 1 + Math.floor(Math.random() * 15), col = (first - 1) % 5;
      const next = [first - 5, first + 5, col > 0 ? first - 1 : 0, col < 4 ? first + 1 : 0].filter((c) => c >= 1 && c <= 15);
      env.gymCans = { first, second: next[Math.floor(Math.random() * next.length)], foundFirst: false };
    }

    async function trashCan(n) {
      const f = env.player.flags;
      if (!env.gymCans) hideVermilionSwitches();
      if (f.vermilionGymLocksOpen) { await env.say(env.T("VermilionCity_Gym_Text_NopeOnlyTrashHere")); return; }
      if (!env.gymCans.foundFirst) {
        if (n !== env.gymCans.first) { await env.say(env.T("VermilionCity_Gym_Text_NopeOnlyTrashHere")); return; }
        await env.say(env.T("VermilionCity_Gym_Text_SwitchUnderTrashFirstLockOpened"));
        env.sfx("se_pin");
        env.gymCans.foundFirst = true;
        env.applyPatches("VermilionCity_Gym");
        return;
      }
      if (n !== env.gymCans.second) {
        await env.say(env.T("VermilionCity_Gym_Text_OnlyTrashLocksWereReset"));
        hideVermilionSwitches();
        env.applyPatches("VermilionCity_Gym");
        return;
      }
      await env.say(env.T("VermilionCity_Gym_Text_SecondLockOpened"));
      f.vermilionGymLocksOpen = true;
      env.applyPatches("VermilionCity_Gym");
      env.sfx("se_unlock");
    }

    return {
      gymGuide,
      brockTeam,
      mistyTeam,
      brock,
      misty,
      surgeTeam,
      ltSurge,
      erikaTeam,
      erika,
      sabrina,
      koga,
      giovanniGym,
      leaderTeam,
      leaderRematch,
      blaineTeam,
      blaine,
      openQuizDoor,
      cinnabarQuiz,
      fossilScientist,
      mansionSwitch,
      hideVermilionSwitches,
      trashCan,
    };
  }

  window.KantoGyms = { create };
})();
