// Kanto field scenes and progression.
// Shared state and services are accessed through live env properties.
(function () {
  "use strict";

  function create(env) {
    // A sign by a Pokémon statue: its picture with the sign's words (and it's
    // seen in the Pokédex).
    async function monSign(species, text) {
      Player.markSeen(env.player, species);
      env.showPicture(species);
      await env.say(text);
      env.hidePicture();
    }

    // The Snorlax asleep across Route 12 (Route12_EventScript_Snorlax): with
    // the Poké Flute it wakes up and attacks, a wild Snorlax (Lv. 30) you can
    // catch. Beaten, run from or not, it's gone; it lumbers back to the
    // mountains if you didn't catch it.
    // (Route 16's is the same: Route16_EventScript_Snorlax.)
    async function snorlax(person, route) {
      const f = env.player.flags;
      if (!f.gotPokeFlute) { await env.say(env.T("Route" + route + "_Text_MonSprawledOutInSlumber")); return; }
      if (!env.canBattle()) return;
      if (!(await env.confirm(env.fill(env.T("Text_WantToUsePokeFlute")[0])))) return;
      await env.sayWithJingle("mus_poke_flute", env.T("Text_PlayedPokeFlute"));
      await env.say(env.T("Text_SnorlaxWokeUp"));
      env.cry("Snorlax");
      await env.sleep(700);
      f["wokeRoute" + route + "Snorlax"] = true;
      Overworld.removePerson(person);
      const outcome = await env.battle("wild", { foe: { name: "Wild", team: [Party.create("Snorlax", 30)] }, terrain: "grass" });
      if (outcome === "lost") return;
      env.show("world");
      await Overworld.resume();
      // (Caught, it's in your party; otherwise it lumbers off.)
      if (outcome !== "caught") await env.say(env.T("Text_SnorlaxReturnedToMountains"));
    }

    // A fishing rod from one of the Fishing Guru's brothers ("Do you like to fish?").
    // The Fishing Guru's brothers, if you haven't the Fishing Rod yet: it's
    // theirs to give then (`explain`: what's said after, if anything). -> given?
    async function rodGift(prefix, takeThis, explain) {
      const L = (k) => env.T(prefix + k);
      const like = L("DoYouLikeToFish");
      await env.say(like.slice(0, -1));
      if (!(await env.confirm(env.fill(like[like.length - 1])))) { await env.say(L("OhThatsDisappointing")); return false; }
      await env.say(L(takeThis));
      await giveFishingRod("the Fishing Guru's brother");
      await env.say(explain ? L(explain) : env.FISHING_LEVELS_EXPLAINED);
      return true;
    }

    async function giveFishingRod(from) {
      Player.addItem(env.player, "fishing-rod");
      await env.sayWithJingle(env.itemJingle("fishing-rod"), env.fill("{PLAYER} received a Fishing Rod from\n" + from + "."));
    }

    // The Fishing Guru and his brothers on how your fishing is going.
    function fishingLevelTalk(who) {
      const lv = Fishing.level(env.fishingXp());
      const next = Fishing.TIERS.find(([from]) => from > lv);
      const said = ["Your fishing level is " + lv + "!"];
      if (lv >= Fishing.MAX_LEVEL) said.push("There's nothing left for me to teach\nyou. You're a true Fishing Guru!");
      else if (lv < 10) said.push("Keep at it! Better Pokémon bite\nonce you reach level 10.");
      else if (lv < 25) said.push("Not bad! Reach level 25 and the\nrarest Pokémon start biting.");
      else said.push(next ? "Splendid! Rare Pokémon bite even\nmore often from level " + next[0] + "." : "Splendid! You land the rare ones\nas often as anyone can.");
      if (who === "Vermilion") said.push("Fishing is a way of life!");
      return said;
    }

    function monSizeHash(r) {
      const p = (r.personality >>> 0) & 0xffff, iv = (k) => ((r.ivs && r.ivs[k]) | 0) & 0xf;
      const hi = ((iv("atk") ^ iv("def")) * iv("hp")) ^ (p & 0xff);
      const lo = ((iv("spa") ^ iv("spd")) * iv("spe")) ^ (p >> 8);
      return ((hi << 8) + lo) & 0xffff;
    }

    // (Heracross's too, for the Water Path's Heracross fan.)
    function monSize(species, hash) {
      let i = 1;
      while (i < 15 && !(hash < env.BIG_MON_SIZES[i][2])) i++;
      const [base, div, from] = env.BIG_MON_SIZES[i < 15 ? i - 1 : 15];
      const height = Math.round(window.DEX[species].height * 10);
      return Math.floor(height * (base + Math.floor((hash - from) / div)) / 10);
    }

    async function magikarpRecord() {
      const f = env.player.flags, L = (k) => env.T("Route12_FishingHouse_Text_" + k);
      if (!env.player.party.some((r) => r.species === "Magikarp" && !r.egg)) { await env.say(L("TryFishingBringMeMagikarp")); return; }
      await env.say(L("OhMagikarpAllowMeToSee"));
      const r = await env.choosePartyFor("Choose a {PKMN}.");
      if (!r) return;
      if (r.species !== "Magikarp" || r.egg) { await env.say(L("DoesntLookLikeMagikarp")); return; }
      const hash = env.magikarpSizeHash(r), record = f.magikarpRecord != null ? f.magikarpRecord : 0;
      const now = env.magikarpSize(hash), best = env.magikarpSize(record), vars = [null, env.magikarpInches(hash), env.magikarpInches(record)];
      if (f.magikarpRecord == null || now > best) {
        f.magikarpRecord = hash;
        await env.say(L("WhoaXInchesTakeThis"), vars);
        Player.addItem(env.player, "net-ball");
        await env.sayWithJingle(env.itemJingle("net-ball"), "{PLAYER} received a Net Ball!");
        await env.say(L("LookForwardToGreaterRecords"));
        return;
      }
      await env.say(L(now === best ? "HuhXInchesSameSizeAsLast" : "HmmXInchesDoesntMeasureUp"), vars);
    }

    // The Move Deleter in Fuchsia City (FuchsiaCity_House3_EventScript_MoveDeleter).
    async function fuchsiaMoveDeleter() {
      const D = (k) => env.T("FuchsiaCity_House3_Text_" + k);
      const intro = D("WouldYouLikeToForgetMove");
      await env.say(intro.slice(0, -1));
      if (!(await env.confirm(env.fill(intro[intro.length - 1])))) { await env.say(D("ComeAgainToForgetOtherMoves")); return; }
      for (;;) {
        await env.say(D("WhichMonShouldForgetMove"));
        const r = await env.choosePartyFor("Choose a {PKMN}.");
        if (!r) { await env.say(D("ComeAgainToForgetOtherMoves")); return; }
        if (r.egg) { await env.say(env.T("FuchsiaCity_House3_Text_NoEggShouldKnowMoves")); return; }
        const name = Party.displayName(r);
        if (r.moves.length <= 1) { await env.say(D("MonOnlyKnowsOneMove"), [name]); return; }
        const i = await env.ask(env.fill(D("WhichMoveShouldBeForgotten")[0]), r.moves.map((m, k) => ({ label: m.name, value: k, className: "type-" + MOVES[m.name].type }))
          .concat([env.back()]));
        if (i === "back") continue;
        const move = r.moves[i].name;
        if (!(await env.confirm(env.fill(D("MonsMoveShouldBeForgotten")[0], [name, move])))) { await env.say(D("ComeAgainToForgetOtherMoves")); return; }
        r.moves.splice(i, 1);
        await env.sayWithJingle("mus_move_deleted", D("MonHasForgottenMoveCompletely").map((p) => env.fill(p, [name, move])));
        await env.persist();
        return;
      }
    }

    // The Safari Zone's Warden: without his teeth no one understands him; give
    // them back (the Gold Teeth from the Safari Zone's west area) and he gives
    // you HM04 Strength.
    async function warden() {
      const f = env.player.flags, W = (k) => env.T("FuchsiaCity_WardensHouse_Text_" + k);
      if (f.gotHM04) { await env.say(W("ExplainStrength")); return; }
      if (!Player.itemCount(env.player, "gold-teeth")) {
        const huh = W("HifFuffHefifoo");
        await env.say(huh.slice(0, -1));
        await env.say(W(await env.confirm(env.fill(huh[huh.length - 1])) ? "AhHowheeHoHoo" : "HeOhayHeHaHoo"));
        return;
      }
      await env.sayWithJingle("mus_obtain_tmhm", W("GaveGoldTeethToWarden"));
      Player.removeItem(env.player, "gold-teeth");
      await env.say(W("WardenPoppedInHisTeeth"));
      await env.say(W(env.isGirl() ? "ThanksLassieGiveYouSomething" : "ThanksSonGiveYouSomething"));
      Player.addItem(env.player, "hm04");
      f.gotHM04 = true;
      await env.sayWithJingle(env.itemJingle("hm04"), W("ReceivedHM04FromWarden"));
    }

    // Koga: battle (talking to him), then the Soul Badge and TM06 Toxic
    // (FireRed's TM06: the TM with Toxic here). Beating him also beats his
    // Gym's trainers.
    // His team (this game's): Weezing, Muk (FireRed's), Arbok, and his ace,
    // Beedrill, holding its Beedrillite: it Mega Evolves, then Terastallizes
    // into a Ground type (in the rematch too).
    function kogaTeam() {
      const fr = env.trainerTeam("TRAINER_LEADER_KOGA");
      const weezing = fr.find((r) => r.species === "Weezing"), muk = fr.find((r) => r.species === "Muk");
      return [weezing, muk, Party.create("Arbok", 40, { ivs: 0 }),
        Object.assign(Party.create("Beedrill", 44, { ivs: 0 }),
          { item: "beedrillite", teraType: "Ground", teraAce: true })];
    }
     // (FireRed's VAR_TEMP_1 on B3F and B4F: arrived by falling)
    async function seafoamFall(map) {
      env.seafoamFell = null;
      const at = Overworld.position();
      Overworld.setAvatar("surf");
      const ride = Seafoam.fallRide(env.player.flags, map, at.x);
      if (!ride) return;
      await Overworld.act([{ who: "player", moves: ride.moves }]);
      if (ride.warp) {
        await Overworld.teleport(Object.assign({ facing: "up" }, ride.warp));
        Overworld.setAvatar("surf");
        await Overworld.act([{ who: "player", moves: Seafoam.ENTER_B4F_ON_CURRENT }]);
        return;
      }
      if (ride.dismount) {
        await Overworld.act([{ who: "player", moves: ["jump_" + ride.dismount] }]);
        Overworld.setAvatar("walk");
      }
    }

    // ---------- The Power Plant ----------
    //
    // The two "item balls" that are Electrode (PowerPlant_EventScript_Electrode1
    // and 2): a wild Lv. 34 Electrode, with its cry and no words. Whatever
    // happens (but blacking out), it's gone for good.
    async function powerPlantElectrode(person, n) {
      if (!env.canBattle()) return;
      env.cry("Electrode");
      await env.sleep(900);
      const outcome = await env.battle("wild", { foe: { name: "Wild", team: [Party.create("Electrode", 34)] } });
      if (outcome === "lost") return;
      env.player.flags["foughtPowerPlantElectrode" + n] = true;
      env.show("world");
      await Overworld.resume();
      if (outcome === "caught") { Overworld.removePerson(person); return; }
      await Overworld.fadeToBlack();
      Overworld.removePerson(person);
      await Overworld.fadeFromBlack();
    }

    function safariStep() {
      const s = env.player.flags.safari;
      if (!s || s.hgss) return null;   // (Johto's has no steps: ui/johto-safari.js)
      // (Hoenn's: 500 steps in its areas, and its Pokéblock feeders' blocks last 100: SafariZoneTakeStep.)
      if (s.hoenn) {
        if (!/^HoennSafariZone_/.test(env.player.location.map)) return null;
        env.hoennSafari.step();
        s.steps = Math.max(0, s.steps - 1);
        return s.steps === 0 ? { type: "safari-over", hoenn: true } : null;
      }
      if (!/^SafariZone_/.test(env.player.location.map)) return null;
      s.steps = Math.max(0, s.steps - 1);
      return s.steps === 0 ? { type: "safari-over", text: "SafariZone_Text_TimesUp" } : null;
    }

    // Talking to the attendant as you step up to the counter.
    async function safariEntry(side) {
      if (env.safariOn()) return;
      const back = async () => { Screen.say(""); await Overworld.act([{ who: "player", moves: env.M("FuchsiaCity_SafariZone_Entrance_Movement_ForceBack") }]); };
      await env.say(env.G("WelcomeToSafariZone"));
      await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
      const pitch = env.G("PlaySafariGameFor500");
      await env.say(pitch.slice(0, -1));
      if (!(await env.confirm(env.fill(pitch[pitch.length - 1]) + "\n(You have " + env.money(env.player.money) + ".)"))) {
        await env.say(env.G("OkayPleaseComeAgain"));
        await back();
        return;
      }
      if (env.player.party.length >= Player.PARTY_SIZE && !env.player.boxes.some((b) => Player.firstEmpty(b) >= 0)) {
        await env.say(env.T("SafariZone_Text_ExcuseMeYourPCBoxIsFull"));
        await back();
        return;
      }
      if (env.player.money < Safari.ENTRY_FEE) { await env.say(env.G("OopsNotEnoughMoney")); await back(); return; }
      Player.addMoney(env.player, -Safari.ENTRY_FEE);
      await env.say(env.G("ThatllBe500WeOnlyUseSpecialBalls"));
      await env.sayWithJingle("mus_level_up", env.G("PlayerReceived30SafariBalls"));
      await env.say(env.G("CallYouOnPAWhenYouRunOut"));
      Screen.say("");
      await Overworld.act([{ who: "player", moves: env.M("FuchsiaCity_SafariZone_Entrance_Movement_EnterSafariZone" + side) }]);
      env.player.flags.safari = { balls: Safari.BALLS, steps: Safari.STEPS };
      await Overworld.teleport({ map: "SafariZone_Center", x: 26, y: 30, facing: "up" });
    }

    // Back in the gate: leaving early? (Or, sent back, on your way out.)
    async function safariGateArrival() {
      if (!env.safariOn()) return;
      if (await env.confirm(env.fill(env.G("GoingToLeaveSafariZoneEarly")[0]))) {
        await env.say(env.G("PleaseReturnSafariBalls"));
        Screen.say("");
        delete env.player.flags.safari;
        await Overworld.act([{ who: "player", moves: env.SAFARI_EXIT() }]);
        return;
      }
      await env.say(env.G("GoodLuck"));
      Screen.say("");
      await Overworld.act([{ who: "player", moves: env.M("FuchsiaCity_SafariZone_Entrance_Movement_ReEnter") }]);
      await Overworld.teleport({ map: "SafariZone_Center", x: 26, y: 30, facing: "up" });
    }

    // The game's over: the PA (`text`, if any), then you're at the gate's
    // counter and on your way out. `walkIn`: the last Safari Ball missed in a
    // battle (FireRed's ExitWalkIn: you come in a step first).
    async function safariOver(text, walkIn) {
      if (text) { env.sfx("se_ding_dong"); await env.say(env.T(text)); }
      Screen.say("");
      delete env.player.flags.safari;
      await Overworld.teleport({ map: env.SAFARI_GATE, x: 4, y: 1, facing: "down" });
      if (walkIn) await Overworld.act([{ who: "player", moves: env.M("FuchsiaCity_SafariZone_Entrance_Movement_ApproachCounter") }]);
      await env.say(env.G("CatchFairShareComeAgain"));
      Screen.say("");
      await Overworld.act([{ who: "player", moves: walkIn ? env.M("FuchsiaCity_SafariZone_Entrance_Movement_Exit2") : env.SAFARI_EXIT() }]);
    }

    // A wild Pokémon in the Safari Zone.
    async function safariBattle(species, level, terrain, nature) {
      const outcome = await env.battle("wild", { foe: { name: "Wild", team: [env.wildMon(Party.create(species, level, nature ? { nature } : {}))] }, terrain, safari: true });
      const s = env.player.flags.safari;
      // (Johto's, HGSS's: ui/johto-safari.js.)
      if (s && s.hgss) { env.show("world"); await Overworld.resume(); await env.johtoSafari.afterBattle(outcome); return; }
      // (Hoenn's: Emerald's own scripts take you out when the Balls run out: CB2_EndSafariBattle.)
      if (s && s.hoenn) {
        if (outcome === "caught") s.caught = (s.caught || 0) + 1;
        if (outcome === "noballs" || s.balls <= 0) { env.show("world"); await Overworld.resume(); await env.runHoenn(outcome === "noballs" ? "SafariZone_EventScript_OutOfBallsMidBattle" : "SafariZone_EventScript_OutOfBalls"); }
        return;
      }
      if (outcome === "noballs") {
        env.show("world");
        await Overworld.resume();
        await safariOver(null, true);
      } else if (s && s.balls <= 0) {
        env.show("world");
        await Overworld.resume();
        await safariOver("SafariZone_Text_OutOfBalls", false);
      }
    }

    return {
      monSign,
      snorlax,
      rodGift,
      giveFishingRod,
      fishingLevelTalk,
      monSizeHash,
      monSize,
      magikarpRecord,
      fuchsiaMoveDeleter,
      warden,
      kogaTeam,
      seafoamFall,
      powerPlantElectrode,
      safariStep,
      safariEntry,
      safariGateArrival,
      safariOver,
      safariBattle,
    };
  }

  window.KantoField = { create };
})();
