// This game's own changes to Hoenn's story (Emerald's scripts and maps, data/emerald-maps.js), made as the page
// loads, before ui/game.js sets Emerald's scripts going (HoennScript.create):
//   - you come to Hoenn as Johto's Champion, in the moving truck (by the S.S. Aqua or the Seagallop), and hop
//     down from it: no Mom to take you in (she's Brendan's, or May's; nor later, with Running Shoes), no May (or
//     Brendan) at home to meet, and Littleroot's twin isn't there to stop you going north without a Pokémon: it's
//     straight up to Route 101, where Prof. Birch is being chased by a Zigzagoon and calls for help;
//   - Birch knows you, Johto's Champion, and gives you the Pokémon you saved him with: the one you chose from
//     his Bag (ui/game.js's ChooseStarter keeps it, VAR_HOENN_STARTER_SPECIES), not your party's first;
//   - you walk right behind Wally on the way to his lesson, which is Emerald's battle (ui/game.js's
//     StartWallyTutorialBattle, ui/battle-screen.js's wallyLoop);
//   - Norman is Petalburg's Gym Leader, not your dad: he knows you as Johto's Champion;
//   - Oldale's Mart clerk, once she's walked you to the Mart and given you the Potion, stays there;
//   - after the Hall of Fame, Norman brings a ticket for the S.S. Tidal's run to Sinnoh too.
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
  // (And no Running Shoes from her outside the lab: you have them, and she's not your mom. Emerald's VAR_LITTLEROOT_TOWN_STATE
  // 3, her scene, straight to 4, after it.)
  const pokedex = S.LittlerootTown_ProfessorBirchsLab_EventScript_GivePokedex;
  if (pokedex) pokedex.forEach((c, i) => { if (c[0] === "setvar" && c[1] === "VAR_LITTLEROOT_TOWN_STATE" && c[2] === 3) pokedex[i] = ["setvar", "VAR_LITTLEROOT_TOWN_STATE", 4]; });
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

  // Norman: Petalburg's Gym Leader, not your dad (you're not his child, you're Johto's Champion), and Wally walks
  // in to ask him for a Pokémon.
  for (const [k, v] of Object.entries(H.t)) {
    if (!/^(PetalburgCity_Gym_|MatchCall_Text_Norman|Route104_Text_(Dad|RegisteredDad)|PlayersHouse_1F_Text_(TicketFromBriney|PortsInSlateport))/.test(k)) continue;
    H.t[k] = [].concat(v).map((page) => page.replace(/^Dad: /, "Norman: ").replace(/\nDad: /g, "\nNorman: ").replace(/ from\nDad!/, " from\nNorman!")
      .replace("Registered Dad Norman", "Registered Norman"));
  }
  Object.assign(H.t, {
    PetalburgCity_Gym_Text_DadYoureHereWithYourPokemon: ["Norman: Hm?", "Wait… Aren't you {PLAYER}?\nThe Champion of Johto!", "Prof. Birch told me you'd come to\nHoenn. I'm Norman, this Gym's Leader.",
      "Oh, I see.\nYou're with your new Pokémon.", "Hm… Then you're going to take on\nHoenn's Gyms too, {PLAYER}.", "That's great news!\nI'll be looking forward to it!"],
    PetalburgCity_Gym_Text_NormanIntro: ["Norman: Hm…\nSo, you did get four Gym Badges.", "Fine, as I promised, we will have\na Pokémon battle.", "{PLAYER}…",
      "I've waited for the chance to have a\nreal battle with Johto's Champion.", "But, a battle is a battle!", "I will do everything in my power as\na Gym Leader to win.",
      "{PLAYER}, you'd better give it your\nbest shot, too!"],
    PetalburgCity_Gym_Text_DadHappyAndSad: ["Norman: As the Gym Leader, I can't\nexpress how upset I am…", "But to lose to the Champion of Johto…\nThere's no shame in that."],
    PetalburgCity_Gym_Text_DadGoingToKeepTraining: ["Norman: {PLAYER}, Hoenn has plenty\nmore to show you.", "I'm going to stay here and redouble\nmy training.",
      "It would bother me as a Trainer to\nnot avenge my loss to you, {PLAYER}!"],
    PetalburgCity_Gym_Text_NormanPreRematch: ["Norman: {PLAYER}…\nI had a feeling that you would come.", "I would never refuse to accept\na challenge from you.",
      "A Champion and a Gym Leader…\nWe owe it to each other to do the best\nwe can. Isn't that right, {PLAYER}?"],
    PetalburgCity_Gym_Text_NormanRematchNeedTwoMons: ["Norman: {PLAYER}…\nI had a feeling that you would come.", "I would never refuse to accept\na challenge from you.",
      "Hm? Wait a second, {PLAYER}.", "Do you only have one Pokémon that is\ncapable of battle?", "Sorry, but you'll have to come back\nwith at least two Pokémon."],
    PetalburgCity_Gym_Text_NormanPostRematch: ["Norman: {PLAYER}…\nWhat is your dream?", "My dream…\nHahaha…\nTo battle the best, and I've done it."],
    PlayersHouse_1F_Text_TicketFromBrineyCameForYou: ["Norman: Hm?", "Hey, it's {PLAYER}!", "It's been a while since I saw you,\nbut you look…stronger, somehow.",
      "That's the impression I get.\nBut this Gym Leader hasn't given up yet!", "Oh, yes, I have something for you.\nThis came for you from someone named\nMr. Briney."],
    // (The house you came back to after the Hall of Fame is his family's: she's his wife, not your mom.)
    PlayersHouse_1F_Text_BetterGetBackToGym: ["I'd better get back to Petalburg Gym.", "Dear, thanks for looking after the house\nwhile I'm away."],
    PlayersHouse_1F_Text_DadShouldStayLonger: ["That husband of mine…", "He comes home for the first time in a\nwhile, but all he talks about is Pokémon.", "He should relax and stay a little longer."],
    PlayersHouse_1F_Text_IsThatABreakingStory: ["Oh? Is that a breaking news story?"],
    PlayersHouse_1F_Text_WhatColorDidTheySay: ["{PLAYER}, did you catch that?", "What color did the announcer say\nthat Pokémon was?"],
    PlayersHouse_1F_Text_StillUnknownPokemon: ["Well, isn't that something!\nThere are still unknown Pokémon."],
    MatchCall_Text_Norman2: ["Norman: Hm… Little by little, but also\nvery surely, you're getting\ntougher, {PLAYER}.", "Hoenn's Gyms won't hold the Champion\nof Johto back for long."],
    MatchCall_Text_Norman4: ["Norman: {PLAYER}! I'm going to remain\nhere and redouble my training.", "The way of battling is deep\nand unforgiving!"]
  });

  // Wally's lesson, out to Route 102's grass: you walk his way, right behind him (Emerald walks you a row off his,
  // through the corner of a building), from the Gym's door two tiles above where he starts.
  const wallyWay = H.m.PetalburgCity_Movement_WallyTutorialWally;
  if (wallyWay) {
    const walks = wallyWay.filter((mv) => /^walk_(up|down|left|right)$/.test(mv));
    H.m.PetalburgCity_Movement_WallyTutorialPlayer = ["delay_8", "walk_down", "walk_down"].concat(walks.slice(0, -1), ["walk_in_place_faster_right"]);
  }

  // After the Hall of Fame, with Mr. Briney's S.S. Ticket, a ticket of this game's own: the S.S. Tidal's run to Sinnoh
  // (from Lilycove: ui/game.js's ScriptMenu_CreateLilycoveSSTidalMultichoice).
  Object.assign(H.t, {
    PlayersHouse_1F_Text_SinnohTicketToo: ["Norman: And this came with it.", "It's from the ferry company…\nA ticket for the S.S. Tidal's run\nto the Sinnoh region!",
      "Hoenn's new Champion, off to Sinnoh…\nThe S.S. Tidal sails from Lilycove."]
  });
  const ticket = S.PlayersHouse_1F_EventScript_GetSSTicketAndSeeLatiTV;
  if (ticket) {
    const i = ticket.findIndex((c) => c[0] === "msgbox" && c[1] === "PlayersHouse_1F_Text_PortsInSlateportLilycove");
    if (i >= 0 && !ticket.some((c) => c[1] === "ITEM_SINNOH_TICKET"))
      ticket.splice(i + 1, 0, ["msgbox", "PlayersHouse_1F_Text_SinnohTicketToo", "MSGBOX_DEFAULT"], ["giveitem", "ITEM_SINNOH_TICKET"]);
  }

  // Oldale's Mart clerk: where she's walked you, by the Mart, from now on.
  const mart = S.OldaleTown_EventScript_ExplainPokemonMart;
  if (mart && !mart.some((c) => c[0] === "setobjectxyperm")) mart.unshift(["setobjectxyperm", "LOCALID_OLDALE_MART_EMPLOYEE", 13, 7]);
})();
