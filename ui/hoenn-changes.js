// This game's own changes to Hoenn's story (Emerald's scripts and maps, data/emerald-maps.js), made as the page
// loads, before ui/game.js sets Emerald's scripts going (HoennScript.create):
//   - you come to Hoenn as Johto's Champion, in the moving truck (by the S.S. Aqua or the Seagallop), and hop
//     down from it: no Mom to take you in (she's Brendan's, or May's), no May (or Brendan) at home to meet, and
//     Littleroot's twin isn't there to stop you going north without a Pokémon: it's straight up to Route 101,
//     where Prof. Birch is being chased by a Zigzagoon and calls for help;
//   - Birch knows you, Johto's Champion, and gives you the Pokémon you saved him with: the one you chose from
//     his Bag (ui/game.js's ChooseStarter keeps it, VAR_HOENN_STARTER_SPECIES), not your party's first;
//   - Oldale's Mart clerk, once she's walked you to the Mart and given you the Potion, stays there.
(function () {
  "use strict";
  const H = window.HOENN_SCRIPTS, W = window.WORLD_MAPS;
  if (!H || !H.s || !W || !W.LittlerootTown) return;
  const S = H.s;

  // Off the truck (Emerald's StepOffTruck, its hop and no more): the Moms' and the houses' scenes over, and the
  // rival met.
  for (const [script, flag] of [["LittlerootTown_EventScript_StepOffTruckMale", "FLAG_HIDE_LITTLEROOT_TOWN_MAYS_HOUSE_RIVAL_BEDROOM"],
    ["LittlerootTown_EventScript_StepOffTruckFemale", "FLAG_HIDE_LITTLEROOT_TOWN_BRENDANS_HOUSE_RIVAL_BEDROOM"]]) {
    S[script] = [["lockall"], ["delay", 15], ["playse", "SE_LEDGE"], ["applywaitmovement", "LOCALID_PLAYER", "Game_Movement_StepOffTruck"],
      ["setvar", "VAR_LITTLEROOT_INTRO_STATE", 7], ["setvar", "VAR_LITTLEROOT_RIVAL_STATE", 3], ["setvar", "VAR_LITTLEROOT_TOWN_STATE", 1],
      ["setflag", "FLAG_HIDE_LITTLEROOT_TOWN_MOM_OUTSIDE"], ["clearflag", flag], ["setflag", "FLAG_HIDE_LITTLEROOT_TOWN_MAYS_HOUSE_2F_POKE_BALL"],
      ["setflag", "FLAG_HIDE_LITTLEROOT_TOWN_BRENDANS_HOUSE_2F_POKE_BALL"], ["clearflag", "FLAG_HIDE_LITTLEROOT_TOWN_FAT_MAN"],
      ["clearflag", "FLAG_HIDE_MAP_NAME_POPUP"], ["releaseall"], ["end"]];
  }
  // (Down, and a step away, so the Pokémon walking with you, behind you, is off the truck too.)
  H.m.Game_Movement_StepOffTruck = H.m.LittlerootTown_Movement_PlayerStepOffTruck.concat(["walk_right"]);
  // (No twin, and none of her triggers.)
  const town = W.LittlerootTown;
  town.people = town.people.filter((p) => p.localId !== "LOCALID_LITTLEROOT_TWIN");
  town.triggers = town.triggers.filter((t) => !/_EventScript_(NeedPokemonTrigger|GoSaveBirchTrigger)/.test(t.script || ""));

  // Birch: the Champion of Johto, and the Pokémon you chose.
  Object.assign(H.t, {
    Route101_Text_YouSavedMe: ["Prof. Birch: Whew…", "I was in the tall grass studying wild\nPokémon when I was jumped.", "You saved me.\nThanks a lot!", "Oh?",
      "Wait… Aren't you {PLAYER}?\nThe Champion of Johto!", "This is not the place to chat, so come\nby my Pokémon Lab later, okay?"],
    LittlerootTown_ProfessorBirchsLab_Text_LikeYouToHavePokemon: ["Prof. Birch: So, {PLAYER}.", "The Champion of Johto, right here\nin Littleroot Town!",
      "I watched your battles at the Pokémon\nLeague. What a Trainer!", "Hoenn has Pokémon you won't find\nin Johto or Kanto.",
      "And the way you battled earlier,\nyou pulled it off with aplomb!", "As thanks for rescuing me, I'd like\nyou to have the Pokémon you used\nearlier.",
      "{PLAYER} received the {STR_VAR_1}!"]
  });
  const lab = S.LittlerootTown_ProfessorBirchsLab_EventScript_GiveStarterEvent;
  if (lab) lab.forEach((c, i) => { if (c[0] === "bufferleadmonspeciesname") lab[i] = ["bufferspeciesname", c[1], "VAR_HOENN_STARTER_SPECIES"]; });

  // Oldale's Mart clerk: where she's walked you, by the Mart, from now on.
  const mart = S.OldaleTown_EventScript_ExplainPokemonMart;
  if (mart && !mart.some((c) => c[0] === "setobjectxyperm")) mart.unshift(["setobjectxyperm", "LOCALID_OLDALE_MART_EMPLOYEE", 13, 7]);
})();
