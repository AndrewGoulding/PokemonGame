// Platinum's campaign, adapted for a player arriving from another region.
// Uses imported text/teams; does not claim to interpret every Platinum script.
(function () {
  "use strict";
  function create(env) {
    const quests = SinnohSidequests.create(env);
    const next = SinnohEterna.create(env), galactic = SinnohGalactic.create(env), middle = SinnohMidgame.create(env), finale = SinnohFinale.create(env);
    const player = () => env.player();
    const state = () => Sinnoh.state(player());
    const say = (id, buffers) => env.say(Sinnoh.text(id, player(), buffers));
    const event = (script) => ({ type: "trigger", map: player().location.map, trigger: { script: "pt:" + script } });
    async function rowan() {
      const s = state();
      if (!s.starter) {
        await env.say(["Rowan: Welcome to Sinnoh. I study\nPokémon and their evolution.",
          "You have travelled a long way.\nWill you help with my research here?",
          "Choose a Pokémon to accompany you\non your journey through Sinnoh."]);
        const species = await env.choose("Which Pokémon will you choose?", Sinnoh.starters);
        if (!Sinnoh.starters.includes(species)) return;
        env.showPicture(species);
        const yes = await env.confirm("Choose " + species + " as your\nSinnoh partner?");
        env.hidePicture();
        if (!yes) return;
        if (player().party.length >= 6 && player().boxes.every((box) => box.every(Boolean))) {
          await env.say("Your party and PC boxes are full.\nMake room and speak to me again.");
          return;
        }
        const record = Party.create(species, 5);
        const where = Player.receive(player(), record);
        if (!where) { await env.say("Your party and PC boxes are full.\nMake room and speak to me again."); return; }
        s.starter = species;
        await env.say("{PLAYER} received " + species + "!" + (where === "party" ? "" : "\nIt was sent to " + where + "."));
        // Keep the starter-specific closing lines; the original opening
        // refers to the Route 201 scene that is not replayed on arrival here.
        await env.say(Sinnoh.text("SandgemTownLab_Text_CherishThatStarter", player(), [species]).slice(-2));
      }
      if (!s.dex) {
        await say("SandgemTownLab_Text_SomethingIWantYouToDo");
        await say("SandgemTownLab_Text_RecordDataOnAllPokemon");
        s.dex = true;
        player().flags.pokedex = true;
        await env.say("Rowan registered your Pokédex\nfor your Sinnoh research.");
        await say("SandgemTownLab_Text_MeetEveryKindOfPokemon");
      }
      await env.say("Rowan: Head north to Jubilife City.\nBeyond it, Oreburgh's Gym awaits.");
    }
    async function aide() {
      if (!state().dex) { await env.say("Speak to Professor Rowan first."); return; }
      if (!state().balls) {
        Player.addItem(player(), "poke-ball", 5);
        state().balls = true;
        await say("Route202_Text_DawnIllGiveYouFivePokeBalls");
      }
      await env.say("Dawn: Use a Poké Ball on a wild\nPokémon after lowering its HP.\nRoute 202 leads to Jubilife City.");
    }
    async function rival() {
      const s = state();
      if (s.rival203) { await env.say("Barry: Oreburgh's Gym is next!\nDon't keep me waiting!"); return; }
      if (!s.starter || !env.canBattle()) return;
      await say("Route203_Text_IGotTougher", ["Barry", player().name]);
      const id = "PT_TRAINER_RIVAL_ROUTE_203_" + s.starter.toUpperCase();
      const outcome = await env.battle("trainer", { foe: { name: "Rival Barry", team: Sinnoh.team(id), pic: "pt_rival" },
        trainerId: id, defeatText: ["What do you mean I lost?!"], prizeClass: "Rival" });
      if (outcome !== "won") return;
      s.rival203 = true;
      env.showWorld();
      await env.resume();
      await say("Route203_Text_WhatDoYouMeanILost", ["Barry", player().name]);
      env.refreshPeople();
    }
    async function mineRoark() {
      if (state().roarkFound) return;
      if (!state().rival203) { await env.say("Roark: Training on Route 203 will\nprepare you for my Gym challenge."); return; }
      await say("OreburghMineB2F_Text_StandBackAndWatch");
      env.sfx("se_m_rock_throw");
      state().mineRockBroken = true;
      env.refreshPeople();
      await say("OreburghMineB2F_Text_BouldersNeedToBeSmashed");
      state().roarkFound = true;
      env.refreshPeople();
    }
    async function roark() {
      const s = state(), p = player(), id = "PT_TRAINER_LEADER_ROARK";
      if (!s.roarkFound) { await say("OreburghCity_Text_GymLeadersGoneOffToTheMine"); return; }
      if (!p.badges.includes("coal")) {
        await say("OreburghGym_Text_RoarkIntro");
        if (!env.canBattle()) return;
        const outcome = await env.battle("trainer", { foe: { name: "Leader Roark", team: Sinnoh.team(id), pic: "pt_leader_roark" },
          trainerId: id, defeatText: PLATINUM_DATA.trainers[id].defeat, terrain: "gym", prizeClass: "Leader" });
        if (outcome !== "won") return;
        p.badges.push("coal");
        for (const t of ["PT_TRAINER_YOUNGSTER_JONATHON", "PT_TRAINER_YOUNGSTER_DARIUS"]) p.flags[t] = true;
        env.showWorld();
        await env.resume();
        await say("OreburghGym_Text_RoarkReceiveCoalBadge");
        await say("OreburghGym_Text_RoarkExplainCoalBadge");
      }
      if (!s.roarkTM) {
        const tm = Bag.machines().find((item) => Bag.machineMove(item) === "Stealth Rock");
        if (!tm) throw new Error("Stealth Rock machine missing");
        Player.addItem(p, tm);
        s.roarkTM = true;
        await env.say("{PLAYER} received " + Bag.name(tm) + "!");
        // Machines are reusable in this project; don't import Platinum's
        // single-use explanation as an inaccurate instruction to the player.
        await env.say("Roark: Stealth Rock damages foes\nwhen they switch into battle.\nYou can use this TM again.");
      } else await say("OreburghGym_Text_RoarkGymBeaten");
    }
    async function rockSmash() {
      if (!state().rockSmash) {
        const hm = FieldMoves.hmFor("Rock Smash");
        if (!hm) throw new Error("Rock Smash machine missing");
        if (!Player.itemCount(player(), hm)) Player.addItem(player(), hm);
        state().rockSmash = true;
        await env.say("{PLAYER} received " + Bag.name(hm) + "!");
      }
      await env.say(player().badges.includes("coal") ? "The Coal Badge lets you use\nRock Smash here in Sinnoh." : "You can teach Rock Smash now.\nEarn the Coal Badge to use it\noutside battle here in Sinnoh.");
    }
    function visible(person) {
      const optional = quests.visible(person); if (optional !== undefined) return optional;
      const end = finale.visible(person); if (end !== undefined) return end;
      const mid = middle.visible(person); if (mid !== undefined) return mid;
      const third = galactic.visible(person); if (third !== undefined) return third;
      const result = next.visible(person); if (result !== undefined) return result;
      if (person.script === "pt:barry203") return !state().rival203;
      if (person.script === "pt:mine-roark" || person.script === "pt:gym-door") return !state().roarkFound;
      if (person.script === "pt:roark") return !!state().roarkFound;
      if (person.script === "pt:mine-rock") return !state().mineRockBroken && !state().roarkFound;
      return undefined;
    }
    function step() {
      const optional = quests.step(); if (optional) return optional;
      const end = finale.step(); if (end) return end;
      const mid = middle.step(); if (mid) return mid;
      const third = galactic.step(); if (third) return third;
      const result = next.step(); if (result) return result;
      const p = player(), at = p.location;
      if (!Sinnoh.owns(at.map)) return null;
      const s = state();
      if (!s.dex && ["Route202", "Route203", "OreburghCity", "OreburghMine", "OreburghCity_Gym"].includes(at.map)) return event("rowan-stop");
      if (at.map === "Route202" && s.dex && !s.balls) return event("aide");
      if (at.map === "Route203" && !s.rival203 && at.x >= 4 && at.x <= 9 && at.y >= 18 && at.y <= 22 && env.canBattle()) return event("barry203");
      return null;
    }
    async function run(script) {
      if (!script || !script.startsWith("pt:") || script.startsWith("pt:PT_TRAINER_")) return false;
      if (await quests.run(script) || await finale.run(script) || await middle.run(script) || await galactic.run(script) || await next.run(script)) return true;
      switch (script.slice(3)) {
        case "rowan": await rowan(); break;
        case "aide": await aide(); break;
        case "barry203": await rival(); break;
        case "mine-roark": await mineRoark(); break;
        case "mine-rock": await env.say("A rugged rock. Roark is about\nto demonstrate Rock Smash."); break;
        case "roark": await roark(); break;
        case "rock-smash": await rockSmash(); break;
        case "rowan-stop":
          await env.say("Dawn: Professor Rowan would like\nto see you before you set off.\nHis lab is in Sandgem Town.");
          await env.teleport({ map: "SandgemTown", x: 9, y: 10, facing: "up" }); break;
        case "gym-door": await say("OreburghCity_Text_GymLeadersGoneOffToTheMine"); break;
        case "gym-guide": await say(player().badges.includes("coal") ? "OreburghGym_Text_GymGuideAfterBadge" : "OreburghGym_Text_GymGuideBeforeBadge"); break;
        case "jubilife": await env.say("Dawn: Welcome to Jubilife City!\nHeal at the Pokémon Center, then\nhead east to Route 203.\nBarry is waiting to battle you."); break;
        default: throw new Error("Unknown Platinum scene: " + script);
      }
      return true;
    }
    return { run, visible, step };
  }
  window.SinnohStory = { create };
})();
