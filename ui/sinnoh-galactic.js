// Eterna's captured-Pokémon rescue, Cycle Shop and the route south.
(function () {
  "use strict";
  function create(env) {
    const player = () => env.player(), state = () => Sinnoh.state(player());
    const say = id => env.say(Sinnoh.text(id, player()));
    const event = key => ({ type: "trigger", map: player().location.map, trigger: { script: "pt:" + key } });
    async function jupiter() {
      const s = state(), p = player();
      if (s.jupiter) { await env.say("Team Galactic has left this building."); return; }
      if (!p.badges.includes("forest")) { await env.say("Earn Eterna's Forest Badge first.\nCynthia's Cut HM will help you\nreach the Galactic building."); return; }
      await say("TeamGalacticEternaBuilding4F_Text_IWillDealWithYou");
      if (!env.canBattle()) return;
      const id = "PT_TRAINER_COMMANDER_JUPITER_TEAM_GALACTIC_ETERNA_BUILDING", t = PLATINUM_DATA.trainers[id];
      const outcome = await env.battle("trainer", { foe: { name: "Commander Jupiter", team: Sinnoh.team(id), pic: t.pic }, trainerId: id, defeatText: t.defeat, prizeClass: "Commander" });
      if (outcome !== "won") return;
      s.jupiter = true; p.flags[id] = true;
      env.showWorld(); await env.resume(); env.refreshPeople();
      await say("TeamGalacticEternaBuilding4F_Text_WellArentYouTough");
      await say("TeamGalacticEternaBuilding4F_Text_ThankYouCruiseByCycleShop");
      await env.say("Rad Rickshaw returned to his Cycle\nShop beside the bicycle racks\nin central Eterna City.");
    }
    async function bike() {
      const p = player(), s = state();
      if (!s.jupiter) { await say("CycleShop_Text_ManagersGoneOff"); return; }
      if (!s.bicycle) {
        await say("CycleShop_Text_ThanksForRescuingMe");
        if (!Player.itemCount(p, "bicycle")) { Player.addItem(p, "bicycle"); await env.say("{PLAYER} received a Bicycle!"); }
        else await env.say("Your Bicycle is ready for the\nroad. No need for a second one!");
        s.bicycle = true;
      }
      await env.say("Rad: Use your Bicycle from the Bag\nor register it to Select. Cycling\nRoad south of town is open now.");
      await env.say("Cynthia is still in Eterna City.\nShe wanted to speak with you.");
    }
    async function egg() {
      const s = state(), p = player();
      if (s.togepiEgg) { await env.say("Cynthia: Take good care of that Egg!\nKeep it with you as you travel."); return; }
      await say("EternaCity_Text_WillYouAcceptEgg");
      if (!await env.confirm("Accept Cynthia's Pokémon Egg?")) { await say("EternaCity_Text_DontFeelObligated"); return; }
      if (p.party.length >= 6) { await say("EternaCity_Text_NoRoomForEgg"); return; }
      const record = Breeding.giftEgg("Togepi", { map: "EternaCity", from: "Cynthia" });
      p.party.push(record); // Eggs enter the Pokédex when hatched, not when received.
      s.togepiEgg = true;
      await say("EternaCity_Text_ThatsWonderful");
      await env.say("{PLAYER} received a Pokémon Egg!");
      await say("EternaCity_Text_KeepEggInYourParty");
    }
    async function expShare() {
      const p = player(), s = state();
      if (s.cyclingExpShare) { await env.say("The Exp. Share distributes battle\nexperience to the party. You can\ntoggle it from the Key Items pocket."); return; }
      const seen = new Set(p.pokedex.seen).size;
      if (seen < 35) { await say("Route206CyclingRoadNorthGate_Text_FindAtLeast35"); return; }
      if (!Player.itemCount(p, "exp-share")) Player.addItem(p, "exp-share");
      s.cyclingExpShare = true;
      await env.say("Rowan's aide: You've seen at least\n35 Pokémon! Here is an Exp. Share\nto help with your research.");
    }
    function visible(p) {
      const s = state(), key = (p.script || "").replace(/^pt:/, "");
      if (key === "jupiter" || key === "rad-rickshaw-captive" || key === "galactic-clefairy" || key === "galactic-buneary") return !s.jupiter;
      if (key === "cycle-clefairy") return !!s.jupiter;
      if (key === "rad-rickshaw") return !!s.jupiter;
      if (p.trainer && /TEAM_GALACTIC_ETERNA_BUILDING|SCIENTIST_TRAVON/.test(p.trainer.id)) return !s.jupiter;
      return undefined;
    }
    function step() {
      const p = player(), at = p.location;
      if (/^EternaGalactic_/.test(at.map) && !p.badges.includes("forest")) return event("galactic-stop");
      if (Sinnoh.cyclingRequired(at) && !Sinnoh.cyclingAllowed(p)) return event("cycle-stop");
      if (Sinnoh.cyclingRequired(at) && env.onBike && !env.onBike()) return event("cycle-mount");
      return null;
    }
    async function run(script) {
      const key = (script || "").replace(/^pt:/, "");
      if (key === "cynthia-cut" && state().jupiter && state().cutHM) { await egg(); return true; }
      switch (key) {
        case "jupiter": await jupiter(); break;
        case "rad-rickshaw": await bike(); break;
        case "rad-rickshaw-captive": await say("TeamGalacticEternaBuilding4F_Text_WhatsWithTeamGalactic"); break;
        case "galactic-clefairy": case "cycle-clefairy": await env.say("Clefairy: Pip piih!"); break;
        case "galactic-buneary": await env.say("Buneary: Buuun!"); break;
        case "cycle-customer": await say(state().jupiter ? "CycleShop_Text_WhatWasTeamGalacticTrying" : "CycleShop_Text_ManagersGoneOff"); break;
        case "galactic-looker": await say("TeamGalacticEternaBuilding1F_Text_HelloItIsMe"); await say("TeamGalacticEternaBuilding1F_Text_InvestigationIntoTeamGalactic"); break;
        case "sinnoh-exp-share": await expShare(); break;
        case "cycle-gate": await env.say(Sinnoh.cyclingAllowed(player()) ? "Cycling Road is open. Ride safely!" : "Rescue the Cycle Shop's manager\nfrom Team Galactic, then collect\nyour Bicycle before heading south."); break;
        case "cycle-stop":
          await env.say("Cycling Road is for Bicycles only.\nHelp Eterna's Cycle Shop manager\nand get your Bicycle ready first.");
          await env.teleport({ map: "EternaCity", x: 15, y: 56, facing: "up" }); break;
        case "cycle-mount": if (env.mountBike && Sinnoh.cyclingAllowed(player())) env.mountBike(); break;
        case "galactic-stop":
          await env.say("The Forest Badge lets you use Cut\nto reach Team Galactic's building.");
          await env.teleport({ map: "EternaCity", x: 10, y: 40, facing: "up" }); break;
        default: return false;
      }
      return true;
    }
    return { run, step, visible };
  }
  window.SinnohGalactic = { create };
})();
