// Kanto town scenes and progression.
// Shared state and services are accessed through live env properties.
(function () {
  "use strict";

  function create(env) {
    async function oakWalksYouToTheLab(side) {
      env.music("mus_oak");
      await env.say(env.T("PalletTown_Text_OakDontGoOut"));
      await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      await Overworld.act([{ who: "player", moves: env.M("Common_Movement_ExclamationMark") }]);
      Overworld.addObject(env.OAK, { x: 10, y: 8, facing: "up" });
      await Overworld.act([{ who: env.OAK, moves: env.M("PalletTown_Movement_OakEnter" + side) }]);
      await env.say(env.T("PalletTown_Text_OakGrassUnsafeNeedMon"));
      await Overworld.act([
        { who: env.OAK, moves: env.M("PalletTown_Movement_OakWalkToLab" + side) },
        { who: "player", moves: env.M("PalletTown_Movement_PlayerWalkToLab" + side) }]);
      await Overworld.act([
        { who: env.OAK, moves: env.M("PalletTown_Movement_OakEnterLab") },
        { who: "player", moves: env.M("PalletTown_Movement_PlayerEnterLab") }]);
      env.player.flags.oakInLab = true;
      await Overworld.teleport({ map: "PalletTown_ProfessorOaksLab", x: 6, y: 12, facing: "up" });

      // In the lab: Oak walks in ahead of you to his desk.
      Overworld.removeObject(env.LAB_OAK);
      Overworld.addObject(env.LAB_OAK, { x: 6, y: 11, facing: "up" });
      await Overworld.act([{ who: env.LAB_OAK, moves: env.M("PalletTown_ProfessorOaksLab_Movement_OakEnter") }]);
      Overworld.removeObject(env.LAB_OAK);
      Overworld.refreshPeople();
      await Overworld.act([{ who: "player", moves: env.M("PalletTown_ProfessorOaksLab_Movement_PlayerEnter") }]);
      await Overworld.act([{ who: env.LAB_RIVAL, moves: env.M("Common_Movement_WalkInPlaceFasterUp") }]);
      // Leaf is friendlier than FireRed's rival: glad to see you both, and
      // happy to wait her turn.
      await env.say(["Leaf: Prof. Oak! There you are!", env.player.flags.metLeaf ? "Oh, and you brought {PLAYER}, too!\nHi again!"
        : "Oh, hi! I'm Leaf. Nice to meet you,\n{PLAYER}!"]);
      await env.say(env.leafT("PalletTown_ProfessorOaksLab_Text_OakThreeMonsChooseOne"));
      await Overworld.act([{ who: env.LAB_RIVAL, moves: env.M("PalletTown_ProfessorOaksLab_Movement_RivalReact") }]);
      await env.say(["Leaf: Um, Prof. Oak?\nCould I have one, too?"]);
      await env.say(["Oak: Of course, Leaf!\nYou can have one, too!"]);
    }

    // Leaf stops you on the way out of the lab (FireRed's RivalBattle): she
    // turns, calls out, walks down to you from her Poké Ball, battles, then
    // leaves. Which path she takes depends on where you are (x 5, 6 or 7) and
    // which Pokémon she has.
    async function rivalLabBattle(x) {
      env.music("mus_encounter_rival");
      const f = env.player.flags;
      const side = { 5: "Left", 6: "Mid", 7: "Right" }[x] || "Mid";
      const theirs = env.RIVAL_PICK[f.starter];
      await Overworld.act([{ who: env.LAB_RIVAL, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterUp") }]);
      await env.say(["Leaf: Wait, {PLAYER}!\nHow about a practice battle?", "Let's see what our Pokémon\ncan do!"]);
      const approach = theirs === "Charmander" ? "PalletTown_ProfessorOaksLab_Movement_ApproachForBattleCharmander" + side
        : "PalletTown_ProfessorOaksLab_Movement_RivalApproachForBattle" + theirs + side;
      await Overworld.act([{ who: env.LAB_RIVAL, moves: env.M(approach) }]);
      f.rivalLabBattle = true;
      const team = [Party.create(theirs, env.STARTER_LEVEL)];
      const outcome = await env.battle("trainer", { foe: { name: "Pokémon Trainer " + env.LAB_RIVAL_NAME, team, pic: "green" },
        defeatText: ["Wow, you're really good!\nThat was fun!"], noBlackout: true });
      // Back to the lab: everyone's healed, and she heads out.
      env.player.party.forEach(Party.heal);
      env.show("world");
      await Overworld.resume();
      if (outcome === "lost") await env.say(["Leaf: Yay, I won!\nGood battle, {PLAYER}!"]);
      await env.say(["Leaf: I'm going to train my Pokémon\nso we both get stronger!", "Thanks, Prof. Oak!\nSee you later, {PLAYER}!"]);
      env.music("mus_rival_exit");
      await Overworld.act([
        { who: env.LAB_RIVAL, moves: env.M("PalletTown_ProfessorOaksLab_Movement_RivalExitAfterBattle" + side) },
        { who: "player", moves: env.M("PalletTown_ProfessorOaksLab_Movement_PlayerWatchRivalExitAfterBattle" + (side === "Right" ? "Right" : "")) }]);
      Overworld.removeObject(env.LAB_RIVAL);
    }

    // ---------- Oak's parcel and the Pokédex ----------
    //
    // FireRed's PalletTown_ProfessorOaksLab_EventScript_ReceiveDexScene: you hand
    // over the parcel, your rival comes in, Oak fetches the two Pokédexes from
    // the desk at the back and gives you one and five Poké Balls, and your rival
    // heads off. Who moves where depends on which side of Oak you're standing
    // (the way you face him: up, down, left or right).
    async function pokedexScene() {
      const f = env.player.flags;
      const L = (name) => env.M("PalletTown_ProfessorOaksLab_Movement_" + name);
      const facing = Overworld.position().facing;
      const north = facing === "up", south = facing === "down", east = facing === "right";
      await env.say(env.T("PalletTown_ProfessorOaksLab_Text_OakHaveSomethingForMe"));
      Player.removeItem(env.player, "oaks-parcel");   // (a save made mid-scene gets it back: see Player.load)
      await env.say(env.T("PalletTown_ProfessorOaksLab_Text_DeliveredOaksParcel"));
      await env.say(env.T("PalletTown_ProfessorOaksLab_Text_OakCustomBallIOrdered"));
      // In comes Gary, from the door.
      Overworld.addObject(env.LAB_RIVAL, { x: north ? 5 : 6, y: 10, facing: "up" });
      await Overworld.act(north
        ? [{ who: "player", moves: L("WatchRivalEnterNorth") }, { who: env.LAB_RIVAL, moves: L("RivalEnter") }]
        : [{ who: env.LAB_OAK, moves: env.M("Common_Movement_WalkInPlaceFasterDown") },
          { who: env.LAB_RIVAL, moves: L("RivalEnter") }].concat(south ? [] : [{ who: "player", moves: L("WatchRivalEnterEastWest") }]));
      // He hasn't met you: Oak introduces you.
      await env.say(["{RIVAL}: Gramps! I almost forgot!\nWhat did you call me for?", "Wait? Who's this?"]);
      await Overworld.act([{ who: env.LAB_OAK, moves: ["delay_30"].concat(env.M("Common_Movement_ExclamationMark"), env.M("Common_Movement_Delay48")) }]);
      // Oak looks at you, then at your rival.
      if (north) await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterUp") }]);
      else {
        await Overworld.act([{ who: env.LAB_OAK, moves: env.M("Common_Movement_FacePlayer").concat("delay_15") }]);
        await Overworld.act([{ who: env.LAB_OAK, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]
          .concat(south ? [] : [{ who: "player", moves: env.M(east ? "Common_Movement_WalkInPlaceFasterRight" : "Common_Movement_WalkInPlaceFasterLeft") }]));
      }
      await env.say(["Oak: This is {PLAYER}. He's starting\nhis Pokémon journey."]);
      await env.say(env.T("PalletTown_ProfessorOaksLab_Text_OakHaveRequestForYouTwo"));
      // To the desk at the back, where the Pokédexes are.
      await Overworld.act(south
        ? [{ who: env.LAB_OAK, moves: L("OakWalkToDeskSouth") }, { who: "player", moves: L("WatchOakWalkToDesk") }, { who: env.LAB_RIVAL, moves: L("WatchOakWalkToDesk") }]
        : [{ who: env.LAB_OAK, moves: L("OakWalkToDesk") }].concat(east ? [{ who: "player", moves: L("WatchOakWalkToDeskEast") }] : []));
      await env.say(env.T("PalletTown_ProfessorOaksLab_Text_OakPokedexOnDesk"));
      await Overworld.act([{ who: env.LAB_OAK, moves: ["delay_40"] }]);
      await env.say(env.T("PalletTown_ProfessorOaksLab_Text_OakTakeTheseWithYou"));
      await Overworld.act([{ who: env.LAB_OAK, moves: env.M("Common_Movement_WalkInPlaceFasterUp") }]);
      Overworld.removeObject("LOCALID_POKEDEX_1");
      await Overworld.act([{ who: env.LAB_OAK, moves: ["delay_10"] }]);
      Overworld.removeObject("LOCALID_POKEDEX_2");
      await Overworld.act([{ who: env.LAB_OAK, moves: ["delay_25"] }]);
      await Overworld.act([{ who: env.LAB_OAK, moves: L(south ? "OakBringDexesOverSouth" : "OakBringDexesOver") }]
        .concat(east ? [{ who: "player", moves: L("PlayerFaceOakForDexEast") }] : []));
      await Overworld.act([{ who: env.LAB_OAK, moves: ["delay_10"] }]);
      f.pokedex = f.parcelDelivered = true;
      await env.say(env.T("PalletTown_ProfessorOaksLab_Text_ReceivedPokedexFromOak"));
      await env.say(env.T("PalletTown_ProfessorOaksLab_Text_OakCatchMonsForDataTakeThese"));
      Player.addItem(env.player, "poke-ball", 5);
      await env.say(env.T("PalletTown_ProfessorOaksLab_Text_ReceivedFivePokeBalls"));
      await env.say(env.T("PalletTown_ProfessorOaksLab_Text_OakExplainCatching"));
      await env.say(env.T("PalletTown_ProfessorOaksLab_Text_OakCompleteMonGuideWasMyDream"));
      await env.say(env.T("PalletTown_ProfessorOaksLab_Text_RivalLeaveItToMeGramps"));
      await Overworld.act(north ? [{ who: env.LAB_RIVAL, moves: env.M("Common_Movement_FacePlayer") }, { who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterLeft") }]
        : south ? [{ who: env.LAB_RIVAL, moves: env.M("Common_Movement_WalkInPlaceFasterUp") }, { who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]
          : [{ who: env.LAB_RIVAL, moves: env.M("Common_Movement_FacePlayer") }, { who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      await env.say(["{RIVAL}: I'll be at Route 22.\nLet me see how weak your Pokémon\nare."]);
      await Overworld.act([{ who: env.LAB_RIVAL, moves: L("RivalExit") }].concat(north ? [{ who: "player", moves: L("WatchRivalEnterEastWest") }] : []));
      Overworld.removeObject(env.LAB_RIVAL);
    }

    // The old man north of Viridian shows how to catch a Pokémon.
    // FireRed's ViridianCity_EventScript_DoTutorialBattle: his words, then the
    // catching demo (StartOldManTutorialBattle: the slice transition into a
    // battle with a wild Lv. 5 Weedle, BattleScreen.oldManTutorial), then
    // "There! Now tell me, that was educational, was it not?" (FireRed gives
    // the Teachy TV with it; this game has none.)
    async function catchTutorial() {
      await env.say(env.T("ViridianCity_Text_ShowYouHowToCatchMons"));
      env.music("mus_vs_wild");
      await Overworld.battleTransition();
      env.show("field");
      const weedle = Party.create("Weedle", 5);
      weedle.gender = "M";   // (CreateMaleMon)
      weedle.hp = Party.maxHp(weedle);
      await BattleScreen.oldManTutorial({
        mon: { name: Party.speciesName("Weedle"), species: "Weedle", level: 5, hp: weedle.hp, maxhp: weedle.hp, gender: "M" },
        terrain: env.battleTerrain({}), bagFemale: !!(Player.LOOKS[env.player.look] && Player.LOOKS[env.player.look].girl)
      });
      env.player.flags.catchTutorial = true;
      env.show("world");
      await Overworld.resume();
      await env.say([env.T("ViridianCity_Text_ThatWasEducationalTakeThis")[0]]);
    }

    // Prof. Oak's Pokédex rating (PokedexRating_EventScript_Rate): Kanto's seen
    // and owned and his rating, to its fanfare; then the National Pokédex's
    // (which you always have here) and whether it's complete (HasAllMons).
    async function rateDex() {
      const R = (k) => env.T("PokedexRating_Text_" + k), n = (which, kanto) => String(Player.dexCount(env.player, which, kanto));
      await env.say(R("SeenXOwnedY"), [n("seen", true), n("caught", true)]);
      const rating = Player.dexRating(env.player);
      await env.sayWithJingle(rating.complete ? "mus_evolved" : "mus_dex_rating", R(rating.text));
      if (!Player.nationalDex(env.player)) return;
      await env.say(R("NationalDexSeenXOwnedY"), [n("seen", false), n("caught", false)]);
      if (Player.hasAllMons(env.player)) { env.player.flags.oakSawDexCompletion = true; await env.say(R("YouveCompletedDex")); }
      else await env.say(R("LookForwardToFilledNationalDex"));
    }

    // Prof. Oak's Aides (FireRed's Aide_EventScript_*): an item for so many kinds
    // of Pokémon caught (GetPokedexCount with VAR_0x8004 0: Kanto's, National
    // Pokédex or not).
    async function aideGift(o) {
      const f = env.player.flags, label = Bag.name(o.item), A = (k) => env.T(o.text + k), vars = () => [o.needed, label, Player.dexCount(env.player, "caught", true)];
      if (f[o.flag]) { await env.say(A(o.explain), vars()); return; }
      const ask = A(o.ask);
      await env.say(ask.slice(0, -1), vars());
      if (!(await env.confirm(env.fill(ask[ask.length - 1], vars())))) { await env.say(env.T("Aide_Text_GetEnoughMonsComeBackForItem"), vars()); return; }
      if (Player.dexCount(env.player, "caught", true) < o.needed) { await env.say(env.T("Aide_Text_HaventCaughtEnoughMonsForItem"), vars()); return; }
      await env.say(A("GreatHereYouGo"), vars());
      // (A key item you have already stays one: the Exp. Share, which this game starts you with.)
      if (!(Bag.isKeyItem(o.item) && Player.itemCount(env.player, o.item))) Player.addItem(env.player, o.item);
      f[o.flag] = true;
      await env.sayWithJingle(env.itemJingle(o.item), A(o.received).map((p) => env.fill(p, vars())));
      await env.say(A(o.explain), vars());
    }

    function leafWaiting(map) {
      const f = env.player.flags;
      if (!f.starter) return false;
      if (map === "PewterCity") return !!(f.TRAINER_LEADER_BROCK && !f.leafPewter);
      if (map === "VermilionCity") return !f.leafVermilion;
      return false;
    }

    function leafPewterDue() {
      const at = env.player.location;
      const door = window.WORLD_MAPS.PewterCity.warps.find((w) => w.map === "PewterCity_Gym");
      return !!(leafWaiting("PewterCity") && door && at.x === door.x && at.y === door.y && env.canBattle());
    }

    // Coming down the road from Route 6 into Vermilion City, she sees you.
    function leafVermilionStep() {
      const at = Overworld.position();
      return at.map === "VermilionCity" && leafWaiting("VermilionCity") && at.x >= 22 && at.x <= 24 && at.y >= 4 && at.y <= 7 &&
        env.canBattle() ? { type: "leaf-vermilion" } : null;
    }

    // Leaf sees you ("!") and walks over to stand next to you.
    async function leafComesOver() {
      const me = Overworld.position(), leaf = Overworld.personPosition(env.LEAF);
      if (!leaf) return;
      await Overworld.act([{ who: env.LEAF, moves: env.M("Common_Movement_ExclamationMark") }]);
      const moves = [];
      let x = leaf.x, y = leaf.y;
      // Along the row first, then the column, to the tile beside you.
      const target = Math.abs(leaf.y - me.y) <= Math.abs(leaf.x - me.x) && leaf.y === me.y
        ? { x: me.x + Math.sign(leaf.x - me.x), y: me.y } : { x: me.x, y: me.y + Math.sign(leaf.y - me.y || 1) };
      while (x !== target.x) { moves.push(x < target.x ? "walk_right" : "walk_left"); x += Math.sign(target.x - x); }
      while (y !== target.y) { moves.push(y < target.y ? "walk_down" : "walk_up"); y += Math.sign(target.y - y); }
      if (moves.length) await Overworld.act([{ who: env.LEAF, moves }]);
      const face = target.x > me.x ? "right" : target.x < me.x ? "left" : target.y > me.y ? "down" : "up";
      await Overworld.act([{ who: env.LEAF, moves: ["face_" + World.OPPOSITE[face]] }, { who: "player", moves: ["face_" + face] }]);
    }

    async function leafPewter(talked) {
      env.music("mus_encounter_rival");
      const f = env.player.flags;
      if (!talked) await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
      await leafComesOver();
      await env.say(["Leaf: {PLAYER}! I saw you go into the\nGym. You beat Brock? That's amazing!",
        "Guess what? I went back to see Prof.\nOak, and he gave me a Pokédex too!",
        "I've been filling it in all the way\nhere. Look, I even caught a\nJigglypuff on Route 3!",
        "How about a battle? I want to see\nhow strong your Pokémon have gotten!",
        "But your Pokémon must be tired after\nthe Gym. Let me heal them first!"]);
      env.player.party.forEach(Party.heal);
      await env.sayWithJingle("mus_heal", "{PLAYER}'s Pokémon were fully healed!");
      await env.say("Leaf: There! Now let's battle!");
      // (Her Butterfree, her ace, Terastallizes into a pure Flying type: she has a Tera Orb too.)
      const team = [Object.assign(Party.create("Butterfree", 15), { teraType: "Flying", teraAce: true }), Party.create(env.RIVAL_PICK[f.starter], 16),
        Party.create("Jigglypuff", 14)];
      const outcome = await env.battle("trainer", { foe: { name: "Pokémon Trainer " + env.LAB_RIVAL_NAME, team, pic: "green", tera: true },
        defeatText: ["Wow! You really are strong,\n{PLAYER}!"] });
      if (outcome !== "won") return;
      f.leafPewter = true;
      env.show("world");
      await Overworld.resume();
      await env.say(["Leaf: That was a great battle!\nHere, I want you to have this.",
        "It'll help you catch Pokémon for\nyour Pokédex!"]);
      Player.addItem(env.player, "tm54");
      await env.sayWithJingle(env.itemJingle("tm54"), "{PLAYER} received TM54\nfrom Leaf.");
      await env.say(["Leaf: TM54 is False Swipe! It never\nknocks a Pokémon out. It always\nleaves it with at least 1 HP.",
        "I'm going to keep working on my\nPokédex. Let's both try to fill ours in!",
        "See you later, {PLAYER}!"]);
      await leafLeaves();
    }

    // Off the way she came (west, round you, in Pewter; back up the road in
    // Vermilion), until she's out of sight.
    async function leafLeaves() {
      env.music("mus_rival_exit");
      const me = Overworld.position(), leaf = Overworld.personPosition(env.LEAF);
      const away = me.map === "PewterCity" ? ["walk_down"].concat(Array(9).fill("walk_left"), ["walk_up", "walk_up"])
        : (leaf && leaf.x === me.x ? [leaf.x < 24 ? "walk_right" : "walk_left"] : []).concat(Array(8).fill("walk_down"));
      await Overworld.act([{ who: env.LEAF, moves: away.concat(["set_invisible"]) }]);
      Overworld.removeObject(env.LEAF);
    }

    async function leafVermilion() {
      env.music("mus_encounter_rival");
      const f = env.player.flags;
      await leafComesOver();
      await env.say(["Leaf: {PLAYER}! Over here!",
        "I came through the Underground\nPath too. Isn't Vermilion pretty?\nYou can smell the sea!",
        "My Pokémon have gotten a lot\nstronger since Pewter. Want to see?"]);
      // (Her Butterfree Terastallizes into a pure Flying type again.)
      const team = [Object.assign(Party.create("Butterfree", 20), { teraType: "Flying", teraAce: true }), Party.create("Wigglytuff", 22),
        Party.create("Nidorina", 23), Party.create(env.STAGE_TWO[env.RIVAL_PICK[f.starter]], 24)];
      const outcome = await env.battle("trainer", { foe: { name: "Pokémon Trainer " + env.LAB_RIVAL_NAME, team, pic: "green", tera: true },
        defeatText: ["Oh, no! You're still a step ahead\nof me, {PLAYER}!"] });
      if (outcome !== "won") return;
      f.leafVermilion = true;
      env.show("world");
      await Overworld.resume();
      await env.say(["Leaf: You're really something,\n{PLAYER}!",
        "I heard Lt. Surge's Gym is here.\nHe uses Electric Pokémon, so be\ncareful!",
        "I'm going to go look at the big\nship in the harbor. See you!"]);
      await leafLeaves();
    }

    function signLadyPlace() {
      if (env.signLadyVisit) return env.signLadyVisit;
      const f = env.player.flags;
      env.signLadyAside = false;   // (a fresh visit: back in front of the sign)
      if (!f.signLady && f.starter && f.openedMenu) f.signLady = 1;
      if (f.signLady === 1) f.signLady = 2;
      env.signLadyVisit = f.signLady >= 2 ? true                       // wandering, as on the map
        : f.starter ? { x: 12, y: 2, movement: "face_down" }       // by the north exit
          : { x: 5, y: 15, movement: "face_up" };                  // in front of the sign
      return env.signLadyVisit;
    }

    async function signLadyShowSign() {
      await env.say(env.T("PalletTown_Text_LookCopiedTrainerTipsSign"));
      await env.say(env.T("PalletTown_Text_PressStartToOpenMenuCopy"));
      env.player.flags.openedMenu = true;
      env.player.flags.signLady = 1;
    }

    async function signLady(person) {
      const f = env.player.flags;
      const facePlayer = () => Overworld.act([{ who: env.SIGN_LADY, moves: env.M("Common_Movement_FacePlayer") }]);
      if (f.signLady >= 2) { await facePlayer(); await env.say(env.T("PalletTown_Text_RaisingMonsToo")); return; }
      if (f.signLady === 1) { await facePlayer(); await env.say(env.T("PalletTown_Text_SignsAreUsefulArentThey")); return; }
      if (f.starter) { await facePlayer(); await signLadyShowSign(); return; }
      if (env.signLadyAside) { await facePlayer(); await env.say(env.T("PalletTown_Text_ReadItReadIt")); return; }
      await env.say(person.text);
      await facePlayer();
      await Overworld.act([{ who: env.SIGN_LADY, moves: env.M("Common_Movement_ExclamationMark").concat(env.M("Common_Movement_Delay48")) }]);
      await env.say(env.T("PalletTown_Text_OhLookLook"));
      // Out of your way: to the right if you're facing right, otherwise left.
      const right = Overworld.position().facing === "right";
      await Overworld.act([{ who: env.SIGN_LADY, moves: right ? ["walk_right", "walk_in_place_faster_left"] : ["walk_left", "walk_in_place_faster_right"] }]);
      env.signLadyAside = true;
    }

    // Stepping out of a building onto a town or route, once both are done.
    function megaAideDue(map) {
      const m = window.WORLD_MAPS[map];
      return env.megaReady() && !env.player.flags.megaAideMet && !!m && env.OUTDOORS.includes(m.type) && env.canBattle();
    }

    // He comes from just off the screen (within 10 steps), or else from 5 to 7
    // steps away, along tiles he can walk on (World.walkable), and goes back
    // the way he came.
    // (`behind`: from behind you if he can, his last step the way you face,
    // else at least from the side of you your back is to; "only": from behind
    // you or not at all.)
    function megaAideRoute(behind) {
      const at = Overworld.position();
      const people = Overworld.people();
      const tree = World.walkable(at, (m, x, y) => people.some((q) => q.x === x && q.y === y), 10);
      const offScreen = (t) => t.x < at.x - 7 || t.x > at.x + 7 || t.y < at.y - 4 || t.y > at.y + 5;
      const score = (t) => (offScreen(t) && t.dist >= 5 ? 300 - t.dist : t.dist >= 5 && t.dist <= 7 ? 100 + t.dist : t.dist <= 7 ? t.dist : 0);
      const [fx, fy] = World.DIRS[at.facing] || [0, 0];
      const backSide = (t) => (t.x - at.x) * fx + (t.y - at.y) * fy < 0;
      const fromBehind = (key) => World.pathBack(tree, key).slice(-1)[0] === at.facing;
      const pick = (ok) => {
        let best = null;
        for (const [key, t] of tree) if (t.dist >= 1 && ok(key, t) && (!best || score(t) > score(best[1]))) best = [key, t];
        return best;
      };
      const best = behind === "only" ? pick((key, t) => backSide(t) && fromBehind(key) && t.dist >= 3)
        : (behind && (pick((key, t) => backSide(t) && fromBehind(key)) || pick((key, t) => backSide(t)))) || pick(() => true);
      if (!best) return null;
      const toPlayer = World.pathBack(tree, best[0]);   // (the last step would be onto you)
      return {
      from: best[1],
      walk: toPlayer.slice(0,
      -1),
      face: toPlayer[toPlayer.length - 1],
    };
    }

    // Coming out of a door, the scenes that start as you walk out ("enter:")
    // begin before you step out onto the street: step out first.
    async function stepOutOfDoor() {
      const at = Overworld.position(), b = World.blockAt(at.map, at.x, at.y).behavior;
      if (b !== World.MB.WARP_DOOR && b !== World.MB.CAVE_DOOR) return;
      const people = Overworld.people();
      const r = World.step({ map: at.map, x: at.x, y: at.y }, "down", (m, x, y) => people.some((q) => q.x === x && q.y === y));
      if (r.ok && !r.warp) await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
    }

    async function megaAide() {
      await stepOutOfDoor();
      const route = megaAideRoute();
      if (!route) return;
      const back = route.walk.slice().reverse().map((d) => "walk_fast_" + World.OPPOSITE[d]);
      Overworld.addObject(env.MEGA_AIDE, { x: route.from.x, y: route.from.y, facing: route.walk[0] || route.face }, env.lookOf("scientist"));
      await env.say("Hey! {PLAYER}! Wait up!");
      await Overworld.act([{ who: env.MEGA_AIDE, moves: route.walk.map((d) => "walk_fast_" + d).concat(["face_" + route.face]) }]);
      await Overworld.act([{ who: "player", moves: ["face_" + World.OPPOSITE[route.face]] }]);
      await env.say(["Phew… I've been looking all over\nfor you!",
        "I'm one of Prof. Oak's aides.\nThe Professor has a message for you.",
        "He says he's waiting for you at the\ntop of Pokémon Tower in Lavender\nTown.",
        "He said it was important, so please\nhurry! I'll let him know you're\non your way!"]);
      env.player.flags.megaAideMet = true;
      await Overworld.act([{ who: env.MEGA_AIDE, moves: back.concat(["set_invisible"]) }]);
      Overworld.removeObject(env.MEGA_AIDE);
    }

    async function teraAide() {
      const at = Overworld.position(), door = env.TERA_GATE_DOORS.find((x) => x !== at.x);
      // Out of the gate a step, then he calls after you, comes out of the gate too and up beside you.
      await Overworld.act([{ who: "player", moves: ["walk_up"] }]);
      await env.say("Hey! {PLAYER}! Wait up!");
      Screen.say("");
      env.sfx("se_door");
      Overworld.addObject(env.TERA_AIDE, { x: door, y: 13, facing: "up" }, env.lookOf("scientist"));
      await Overworld.act([{ who: env.TERA_AIDE, moves: ["walk_fast_up", door < at.x ? "face_right" : "face_left"] }]);
      await Overworld.act([{ who: "player", moves: [door < at.x ? "face_left" : "face_right"] }]);
      await env.say(["Phew… You're a hard one to\ncatch up with! I came all the way\nthrough the forest after you!",
        "I'm one of Prof. Oak's aides.\nThe Professor has been studying\nTerastallization, from far-off Paldea.",
        "He wanted you to have this Tera Orb!"]);
      Player.addItem(env.player, "tera-orb");
      env.player.flags.gotTeraOrb = true;
      await env.sayWithJingle("mus_obtain_key_item", "{PLAYER} received the Tera Orb\nfrom Prof. Oak's aide!");
      await env.say(["With it, START on the move menu\nlets one of your Pokémon\nTerastallize, once a battle.",
        "It becomes its Tera Type, and moves\nof that type get stronger!",
        "Using it empties the Orb, but it\nrecharges itself after every\nbattle.", "Good luck, {PLAYER}! I'd better get\nback through the forest."]);
      Screen.say("");
      // Back into the gate, towards Viridian Forest.
      await Overworld.act([{ who: env.TERA_AIDE, moves: ["walk_down", "set_invisible"] }]);
      env.sfx("se_door");
      Overworld.removeObject(env.TERA_AIDE);
    }

    function megaTowerPeople() {
      const sprites = { oak: "prof_oak", fuji: "mr_fuji", gary: "blue", red: "red", leaf: "leaf" };
      return Object.entries(env.MEGA_PLACES).map(([who, [x, y, facing]], i) => Object.assign({ id: 910 + i, localId: env.MEGA_CAST[who],
        script: "Game_EventScript_MegaTower", x, y, movement: "face_" + facing, text: null }, env.lookOf(sprites[who])));
    }

    // Someone at the top of the Tower walks down to the stairs and is gone.
    async function megaLeaves(who) {
      await env.walkTo(who, { x: 11, y: 15 });
      await Overworld.act([{ who, moves: ["walk_down", "set_invisible"] }]);
      env.sfx("se_exit");
      Overworld.removeObject(who);
    }

    async function megaTower() {
      const f = env.player.flags, beaten = f.megaBeaten || (f.megaBeaten = {});
      const OAK_ = env.MEGA_CAST.oak, FUJI = env.MEGA_CAST.fuji;
      // (Your Pokémon back in its Ball first: there's little room up here. Out again once it's all over.)
      if (env.follower.look(env.player.location.map)) {
        const lead = env.player.party.find((r) => !r.egg && !Party.isFainted(r));
        await env.say("{PLAYER} returned " + (lead ? Party.displayName(lead) : "the Pokémon") + " to its\nPoké Ball. It's crowded up here.");
        Screen.say("");
        env.sfx("se_ball");
      }
      Overworld.follower.hide(true);
      env.music("mus_oak");
      // Up the aisle, to stand before Prof. Oak, and everyone looks to him.
      await env.walkTo("player", env.MEGA_SPOT, "up");
      await Overworld.act(env.MEGA_RIVALS.map((r) => ({ who: env.MEGA_CAST[r.key], moves: ["face_up"] })));
      if (!f.megaTalked) {
        await env.say(["Oak: Ah, {PLAYER}! There you are!\nThank you for coming.",
          "Mr. Fuji was kind enough to let us\nmeet here, at the top of the Tower.",
          "Now then! Have you ever heard of\nsomething called Mega Evolution?",
          "It's a phenomenon beyond ordinary\nevolution. When a Trainer and their\nPokémon share a truly deep bond…",
          "…and the right mysterious stones are\nat hand, a Pokémon can transform\nfor the length of a battle!",
          "I've been studying it for some time,\nand I need everyone's help to\nunlock its secrets.",
          "But first, I have to test you all!\nYou'll each battle one another.",
          "Don't worry, I'll heal your Pokémon\nbetween battles. Show me what you\ncan do!"]);
        await env.say(["Mr. Fuji: Heh heh… The bond between\npeople and Pokémon…",
          "That is the heart of all of this.\nI am eager to see it."]);
        f.megaTalked = true;
      } else {
        await env.say(["Oak: Ah, {PLAYER}! Ready to try my\ntest again?", "You'll have to win all three battles.\nI'll heal your Pokémon. Good luck!"]);
      }
      env.player.party.forEach(Party.heal);
      await env.sayWithJingle("mus_heal", "Prof. Oak healed {PLAYER}'s Pokémon!");
      // One at a time: you and the next one step away from the others, down
      // the floor, to battle (MEGA_ARENA); then they go back to their place,
      // Prof. Oak comes down to heal your Pokémon and goes back to his, and
      // you go back to yours.
      const [ox, oy] = env.MEGA_PLACES.oak;
      for (const r of env.MEGA_RIVALS) {
        if (beaten[r.key]) continue;
        const who = env.MEGA_CAST[r.key], [hx, hy] = env.MEGA_PLACES[r.key];
        env.music(r.music);
        await env.walkTo("player", env.MEGA_ARENA.you, "up");
        await env.walkTo(who, env.MEGA_ARENA.them, "down");
        await env.say(r.intro);
        const team = r.team().map(([sp, lv]) => Party.create(sp, lv));
        if (r.tera) {
          const i = team.findIndex((m) => m.species === r.tera[0]);
          if (i >= 0) team[i] = r.tera[0] === "Pikachu" ? surfingPikachu(team[i].level) : Object.assign(team[i], { teraType: r.tera[1], teraAce: true });
        }
        const outcome = await env.battle("trainer", { foe: { name: r.name(), team, pic: r.pic, tera: !!r.tera }, defeatText: r.defeat,
          prize: 36 * team[team.length - 1].level });
        // (Blacked out: the whole test again next time.)
        if (outcome !== "won") { delete f.megaBeaten; Overworld.follower.hide(false); await env.persist(); return; }
        env.show("world");
        await Overworld.resume();
        beaten[r.key] = true;
        await env.say(r.after);
        env.music("mus_oak");
        await env.walkTo(who, { x: hx, y: hy }, "up");
        await env.walkTo(OAK_, { x: env.MEGA_ARENA.you.x, y: env.MEGA_ARENA.you.y - 1 }, "down");
        await Overworld.act([{ who: "player", moves: ["face_up"] }]);
        env.player.party.forEach(Party.heal);
        await env.sayWithJingle("mus_heal", "Prof. Oak healed {PLAYER}'s Pokémon!");
        await env.walkTo(OAK_, { x: ox, y: oy }, "down");
        // (You stay where you are, down the floor, till all three are done.)
      }
      env.music("mus_oak");
      await env.say(["Oak: Splendid! Simply splendid!",
        "While you were battling, Red, Leaf and\n{RIVAL} had quite the battles among\nthemselves, too.",
        "You've all passed my test! Each of\nyou shares a real bond with your\nPokémon.",
        "And {PLAYER}, you won every one of\nyour battles! I knew I could count\non you.",
        "Come here a moment, {PLAYER}."]);
      // Up to Prof. Oak for the Mega Ring and the Mega Stones, then back.
      await env.walkTo("player", { x: ox, y: oy + 1 }, "up");
      await env.say(["Oak: Here! I want you to have this.\nIt's a Mega Ring."]);
      Player.addItem(env.player, "mega-ring");
      await env.sayWithJingle("mus_obtain_key_item", "{PLAYER} received the Mega Ring\nfrom Prof. Oak!");
      await env.say(["Oak: The Key Stone set in the ring\nresonates with a Mega Stone held\nby a Pokémon.",
        "When the bond between you is strong\nenough, that Pokémon can Mega\nEvolve in battle! Once a battle.",
        "And these are the Mega Stones for\nthe three Pokémon I give to new\nTrainers in Pallet Town."]);
      for (const stone of ["venusaurite", "charizardite-x", "charizardite-y", "blastoisinite"]) {
        Player.addItem(env.player, stone);
        await env.sayWithJingle("mus_obtain_item", "{PLAYER} received " + env.article(Bag.name(stone)) + "!");
      }
      await env.say(["Oak: Venusaurite for Venusaur,\nCharizardite X and Y for Charizard,\nand Blastoisinite for Blastoise.",
        "Have your Pokémon hold one, and\npress START when you choose a move\nto Mega Evolve!"]);
      const back = Array(env.MEGA_SPOT.y - oy - 1).fill("walk_down");
      await Overworld.act([{ who: "player", moves: ["lock_facing_direction"].concat(back, ["unlock_facing_direction"]) }]);
      // Then a Mega Ring for each of the others: one at a time, they step up
      // to him, and back to their place.
      await env.say(["Oak: And you three passed my test,\ntoo! Leaf, {RIVAL}, Red!", "I have a Mega Ring for each of you\nas well. Come here!"]);
      for (const r of env.MEGA_RIVALS) {
        const who = env.MEGA_CAST[r.key], [hx, hy] = env.MEGA_PLACES[r.key];
        await env.walkTo(who, { x: ox, y: oy + 1 }, "up");
        await env.sayWithJingle("mus_obtain_key_item", (r.key === "gary" ? "{RIVAL}" : r.key === "red" ? "Red" : env.LAB_RIVAL_NAME) + " received a Mega Ring\nfrom Prof. Oak!");
        await env.walkTo(who, { x: hx, y: hy }, "up");
      }
      // Off they go: Red without a word, Leaf and Gary with one.
      const RED = env.MEGA_CAST.red, LEAF_ = env.MEGA_CAST.leaf, GARY = env.MEGA_CAST.gary;
      await Overworld.act([{ who: RED, moves: ["face_player"] }]);
      await env.say(["Red: …"]);
      await megaLeaves(RED);
      await Overworld.act([{ who: LEAF_, moves: ["face_player"] }]);
      await env.say(["Leaf: We all got Mega Rings! You\ntotally earned yours, {PLAYER}!",
        "I'll keep training with my Pokémon,\ntoo. Now I just need to find a\nMega Stone of my own!",
        "See you around, {PLAYER}! Take\ncare of yourself!"]);
      await megaLeaves(LEAF_);
      env.music("mus_rival_exit");
      await Overworld.act([{ who: GARY, moves: ["face_player"] }]);
      await env.say(["{RIVAL}: Hmph! So Gramps gave us\nall Mega Rings. Doesn't matter.", "I'll be the one who masters Mega\nEvolution first!",
        "Next time we battle, I'll be the one\nwho comes out on top. Count on it!",
        "Smell ya later, {PLAYER}!"]);
      await megaLeaves(GARY);
      env.music("mus_oak");
      await env.say(["Oak: Well! I must get back to my\nresearch. There's still so much to\nlearn about Mega Evolution!",
        "{PLAYER}, keep training, and keep\nfilling in that Pokédex! I'll be\ncalling on you again."]);
      await megaLeaves(OAK_);
      env.music((window.WORLD_MAPS[env.player.location.map] || {}).music);
      // Mr. Fuji, last: he comes over to you.
      const [fx, fy] = [env.MEGA_SPOT.x, env.MEGA_SPOT.y - 1];
      await env.walkTo(FUJI, { x: fx, y: fy }, "down");
      await Overworld.act([{ who: "player", moves: ["face_up"] }]);
      await env.say(["Mr. Fuji: Young one… I have watched\nmany Trainers come and go from\nthis Tower.",
        "But the way you battle alongside your\nPokémon… I was truly impressed.",
        "Please, take this. A Pokémon that\nonce called this Tower home would\nsurely want you to have it."]);
      Player.addItem(env.player, "gengarite");
      await env.sayWithJingle("mus_obtain_item", "{PLAYER} received the Gengarite\nfrom Mr. Fuji!");
      await env.say(["Mr. Fuji: It is the Mega Stone for\nGengar. Treat it kindly.",
        "Now, I must return to the Pokémon\nHouse. The little ones will be\nwaiting for me."]);
      await megaLeaves(FUJI);
      Overworld.follower.hide(false);
      f.megaTowerDone = true;
      await env.persist();
    }

    // 6F: the restless ghost (PokemonTower_6F_EventScript_MarowakGhost). Without
    // the Silph Scope it's a Ghost you can only run from, and it pushes you
    // back; with it, it's Cubone's mother, a Marowak (Lv. 30): beat it and its
    // spirit is calmed. (This game's own: she can be caught, too, as any wild
    // Pokémon; caught, she's at rest all the same, and the way up is clear.)
    async function marowakGhost() {
      const f = env.player.flags, scope = !!Player.itemCount(env.player, "silph-scope");
      await env.say(env.T("PokemonTower_6F_Text_BeGoneIntruders"));
      if (!env.canBattle()) return;
      if (scope) await env.say(["Silph Scope unveiled the Ghost's\nidentity!", "The Ghost was Marowak!"]);
      const mon = Party.create("Marowak", 30);
      const outcome = await env.battle("wild", { foe: { name: "Wild", team: [mon] }, ghost: !scope, noBlackout: false });
      env.show("world");
      await Overworld.resume();
      if (scope && (outcome === "won" || outcome === "caught")) {
        await env.say(env.T("PokemonTower_6F_Text_GhostWasCubonesMother"));
        if (outcome === "won") {
          env.cry("Marowak");
          await env.say(env.T("PokemonTower_6F_Text_MothersSpiritWasCalmed"));
        }
        f.marowakCalmed = true;
        return;
      }
      if (outcome !== "lost") await Overworld.act([{ who: "player", moves: ["walk_up"] }]);
    }

    // ---------- Route 24: Nugget Bridge ----------
    //
    // At the end of the bridge a man congratulates you on beating the five
    // contest Trainers, gives you a Nugget, then asks you to join Team Rocket,
    // and won't take no for an answer (Route24_EventScript_BattleRocket).
    // `side`: the trigger you stepped on ("left": he walks over to you), or null
    // when you talked to him.
    async function nuggetBridgeRocket(side) {
      const f = env.player.flags, R = "LOCALID_ROUTE24_ROCKET";
      if (side === "left") await Overworld.act([{ who: R, moves: env.M("Route24_Movement_RocketApproachPlayer") }]);
      else if (side === "right") await Overworld.act([{ who: R, moves: env.M("Common_Movement_WalkInPlaceFasterLeft") }]);
      if (side) await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterRight") }]);
      await env.say(env.T("Route24_Text_JustEarnedFabulousPrize"));
      if (!f.gotNugget) {
        Player.addItem(env.player, "nugget");
        f.gotNugget = true;
        await env.sayWithJingle(env.itemJingle("nugget"), env.T("Route24_Text_ReceivedNuggetFromMysteryTrainer"));
      }
      env.music("mus_encounter_rocket");
      await env.say(env.T("Route24_Text_JoinTeamRocket"));
      if (!env.canBattle()) return;
      const data = window.WORLD_TRAINERS.TRAINER_TEAM_ROCKET_GRUNT_6;
      const outcome = await env.battle("trainer", { foe: { name: data.className + " " + data.name, team: env.trainerTeam("TRAINER_TEAM_ROCKET_GRUNT_6"), pic: data.pic },
        defeatText: env.T("Route24_Text_RocketDefeat"), trainerId: "TRAINER_TEAM_ROCKET_GRUNT_6" });
      if (outcome !== "won") return;
      f.nuggetBridgeRocket = true;
      env.show("world");
      await Overworld.resume();
      await env.say(env.T("Route24_Text_YoudBecomeTopRocketLeader"));
    }

    // ---------- Cerulean City: the robbed house's yard ----------
    //
    // The Rocket who robbed the house waits in its yard (out through the hole in
    // its back wall). Beat him and he gives back TM28 (Dig) and runs off
    // (CeruleanCity_EventScript_Grunt). `side`: the trigger you stepped on
    // ("top" or "bottom", he turns to you), or null when you talked to him.
    async function ceruleanGrunt(side) {
      const f = env.player.flags, G = "LOCALID_CERULEAN_GRUNT", ID = "TRAINER_TEAM_ROCKET_GRUNT_5";
      if (side) {
        await Overworld.act([{ who: G, moves: env.M(side === "top" ? "Common_Movement_WalkInPlaceFasterUp" : "Common_Movement_WalkInPlaceFasterDown") }]);
        await Overworld.act([{ who: "player", moves: env.M(side === "top" ? "Common_Movement_WalkInPlaceFasterDown" : "Common_Movement_WalkInPlaceFasterUp") }]);
      }
      if (!f[ID]) {
        env.music("mus_encounter_rocket");
        await env.say(env.T("CeruleanCity_Text_GruntIntro"));
        if (!env.canBattle()) return;
        const data = window.WORLD_TRAINERS[ID];
        const outcome = await env.battle("trainer", { foe: { name: data.className + " " + data.name, team: env.trainerTeam(ID), pic: data.pic },
          defeatText: env.T("CeruleanCity_Text_GruntDefeat"), trainerId: ID });
        if (outcome !== "won") return;
        env.show("world");
        await Overworld.resume();
      }
      await env.say(env.T("CeruleanCity_Text_OkayIllReturnStolenTM"));
      Player.addItem(env.player, "tm28");
      f.gotTM28 = true;
      await env.sayWithJingle(env.itemJingle("tm28"), env.T("CeruleanCity_Text_RecoveredTM28FromGrunt"));
      await env.say(env.T("CeruleanCity_Text_BetterGetMovingBye"));
      Overworld.removeObject(G);
    }

    // ---------- Route 5: the Day-Care (game/daycare.js) ----------
    async function dayCareMan() {
      const f = env.player.flags, D = (k) => env.T("Route5_PokemonDayCare_Text_" + k);
      const dc = f.dayCare;
      if (dc) {
        const name = Party.displayName(dc.mon), grew = DayCare.levelsGained(dc, Player.levelCap(env.player)), cost = DayCare.cost(dc, Player.levelCap(env.player));
        await env.say(D(grew ? "MonHasGrownByXLevels" : "MonNeedsToSpendMoreTime"), [name, String(grew)]);
        if (!(await env.confirm(env.fill(D("OweMeXForMonsReturn").join(" "), [name, cost.toLocaleString("en-US")])))) { await env.say(D("ComeAnytimeYouLike")); return; }
        if (env.player.party.length >= Player.PARTY_SIZE) { await env.say(D("YouveGotNoRoomForIt")); return; }
        if (env.player.money < cost) { await env.say(D("DontHaveEnoughMoney")); return; }
        Player.addMoney(env.player, -cost);
        const mon = DayCare.withdraw(dc, Player.levelCap(env.player));
        f.dayCare = null;
        env.player.party.push(mon);
        await env.say(D("ThankYouHeresMon"));
        env.cry(mon.species);
        await env.say(D("PlayerGotMonBack"), [name]);
        return;
      }
      const q = D("WantMeToRaiseMon");
      await env.say(q.slice(0, -1));
      if (!(await env.confirm(env.fill(q[q.length - 1])))) { await env.say(D("ComeAgain")); return; }
      if (env.player.party.filter((r) => !r.egg).length === 1) { await env.say(D("OnlyHaveOneMonWithYou")); return; }
      await env.say(D("WhichMonShouldIRaise"));
      const mine = await env.choosePartyFor("Choose a POKéMON.");
      env.show("world");
      if (!mine) { await env.say(D("ComeAnytimeYouLike")); return; }
      if (mine.egg) { await env.say("I can't raise an Egg!"); return; }
      if (!env.player.party.some((r) => r !== mine && Party.canFight(r))) { await env.say(D("WhatWillYouBattleWith")); return; }
      env.player.party.splice(env.player.party.indexOf(mine), 1);
      f.dayCare = DayCare.deposit(mine);
      await env.say(D("LookAfterMonForAWhile"), [Party.displayName(mine)]);
      env.cry(mine.species);
      await env.say(D("ComeSeeMeInAWhile"));
    }

    async function bill(person) {
      const f = env.player.flags;
      if (f.gotSSTicket) {
        await env.say(env.T(env.seaCottageReturn ? "Route25_SeaCottage_Text_CheckOutRareMonsOnPC" : "Route25_SeaCottage_Text_SSAnnePartyYouGoInstead"));
        return;
      }
      if (f.billHelped) {
        await env.say(env.T("Route25_SeaCottage_Text_ThanksBudTakeThis"));
        Player.addItem(env.player, "ss-ticket");
        f.gotSSTicket = true;
        await env.sayWithJingle(env.itemJingle("ss-ticket"), env.T("Route25_SeaCottage_Text_ReceivedSSTicketFromBill"));
        await env.say(env.T("Route25_SeaCottage_Text_SSAnnePartyYouGoInstead"));
        return;
      }
      if (env.billInTeleporter) return;
      const ask = env.T("Route25_SeaCottage_Text_ImBillHelpMeOutPal");
      await env.say(ask.slice(0, -1));
      if (!(await env.confirm(env.fill(ask[ask.length - 1])))) await env.say(env.T("Route25_SeaCottage_Text_NoPleaseChief"));
      await env.say(env.T("Route25_SeaCottage_Text_RunCellSeparationOnPC"));
      // Into the Teleporter (round you, if you're in the way above him).
      const C = "LOCALID_BILL_CLEFAIRY", at = Overworld.position();
      await Overworld.act([{ who: C, moves: env.M(at.facing === "down" ? "Route25_SeaCottage_Movement_BillWalkToTeleporterSouth" : "Route25_SeaCottage_Movement_BillWalkToTeleporter") }]);
      await Overworld.act([{ who: C, moves: env.M("Route25_SeaCottage_Movement_BillEnterTeleporter").concat(["set_invisible"]) }]);
      Overworld.removeObject(C);
      env.billInTeleporter = true;
    }

    async function billsComputer() {
      const f = env.player.flags;
      if (f.gotSSTicket && env.seaCottageReturn) {
        await env.say(env.T("Route25_SeaCottage_Text_BillsFavoriteMonList"));
        for (;;) {
          const species = await env.ask(env.T("Route25_SeaCottage_Text_SeeWhichMon")[0],
            ["Eevee", "Flareon", "Jolteon", "Vaporeon"].map((s) => ({ label: s, value: s, className: "action" })).concat([env.back("Cancel")]));
          if (species === "back") return;
          Player.markSeen(env.player, species);
          env.showPicture(species);
          await env.say(" ");
          env.hidePicture();
        }
      }
      if (!env.billInTeleporter) { await env.say(env.T("Route25_SeaCottage_Text_TeleporterIsDisplayed")); return; }
      // The Cell Separator: the Teleporter beeps away, and out comes Bill.
      env.music(null);
      await env.say(env.T("Route25_SeaCottage_Text_InitiatedTeleportersCellSeparator"));
      env.billInTeleporter = false;
      f.billHelped = true;
      const beep = () => new Promise((r) => { if (window.GameAudio) window.GameAudio.se("se_ball"); setTimeout(r, 500); });
      for (let i = 0; i < 12; i++) await beep();
      env.music("mus_fuchsia");
      const B = "LOCALID_BILL_HUMAN";
      Overworld.addObject(B, { x: 3, y: 3, facing: "down" });
      const jingle = env.fanfare("mus_level_up");
      await Overworld.act([{ who: B, moves: env.M("Route25_SeaCottage_Movement_BillExitTeleporter") }]);
      await jingle;
      await Overworld.act([{ who: B, moves: env.M("Route25_SeaCottage_Movement_BillWalkToMiddleOfRoom") }]);
      env.billJustOut = true;
    }

    // Super Nerd Miguel (trainerbattle_no_intro: his lines come first).
    async function miguelBattle() {
      await env.say(env.T("MtMoon_B2F_Text_MiguelIntro"));
      if (!env.canBattle()) return;
      const outcome = await env.battle("trainer", { foe: { name: "Super Nerd Miguel", team: env.trainerTeam("TRAINER_SUPER_NERD_MIGUEL"), pic: "super_nerd" },
        defeatText: env.T("MtMoon_B2F_Text_MiguelDefeat"), trainerId: "TRAINER_SUPER_NERD_MIGUEL" });
      if (outcome !== "won") return;
      env.show("world");
      await Overworld.resume();
      await env.say(env.T("MtMoon_B2F_Text_WellEachTakeAFossil"));
    }
     // sElevatorAnimationDuration
    async function elevator(floors, list) {
      const f = env.player.flags, here = floors.findIndex((fl) => f.dynamicWarp && fl.map === f.dynamicWarp.map);
      if (here >= 0) GbaMenus.fieldWindow("floor", { label: floors[here].label });
      await Screen.prompt(env.T("Text_WantWhichFloor")[0]);
      const v = await GbaMenus.multichoice(env.$("#overlay"), { left: 0, top: 0, items: floors.map((fl) => fl.label).concat(["Exit"]),
        cursor: Math.max(0, here), frame: GameOptions.get().frame, shown: list ? 7 : undefined });
      GbaMenus.fieldWindow("floor", null);
      Screen.say("");
      if (v < 0 || v >= floors.length || v === here) return;
      setDynamicWarp({ map: floors[v].map, x: floors[v].x, y: floors[v].y });
      const from = here >= 0 ? env.floorNumber(floors[here].label) : env.floorNumber(floors[v].label);
      const n = Math.min(8, Math.abs(env.floorNumber(floors[v].label) - from));
      env.sfx("se_elevator");
      await Overworld.shake(env.ELEVATOR_SHAKES[n]);
      env.sfx("se_ding_dong");
    }

    // Where an elevator's doors let out (FireRed's dynamic warp): the floor you
    // got in on, or the one you chose. Saved, so it survives a reload.
    function setDynamicWarp(t) {
      env.player.flags.dynamicWarp = t;
      World.setDynamicWarp(t);
    }

    // A Pokémon given to you (FireRed's givemon): the fanfare, then a nickname
    // if you like. False when there's no room for it anywhere.
    // `given` runs once it's yours (before the nickname): paying for it, the
    // Poké Ball it was in going.
    async function giftMon(species, level, obtained, vars, given, edit) {
      const room = env.player.party.length < Player.PARTY_SIZE || env.player.boxes.some((b) => Player.firstEmpty(b) >= 0);
      if (!room) { await env.say(env.T("Text_NoMoreRoomForPokemon")); return false; }
      const record = Party.create(species, level);
      if (edit) edit(record);   // (as it comes: a held item, say)
      const where = Player.receive(env.player, record);
      if (given) given();
      Player.markSeen(env.player, species);
      await env.sayWithJingle("mus_level_up", [].concat(obtained).map((p) => env.fill(p, vars)));
      const name = Party.speciesName(species);
      if (await env.confirm(env.fill(env.T("Text_GiveNicknameToThisMon")[0], [name]))) {
        const typed = await env.enterText(name + "'s nickname?", name, 10);
        if (typed && typed !== name) record.nickname = typed;
        env.show("world");
      }
      if (where !== "party") await env.say(Party.displayName(record) + " was transferred to " + where.replace("box", "Box") + " on the PC.");
      return true;
    }

    // Back to the way they faced before you spoke to them (Common_Movement_FaceOriginalDirection).
    async function faceBack(person) {
      if (/^face_/.test(person.movement || "")) await Overworld.act([{ who: "#" + person.id, moves: [person.movement] }]);
    }

    async function thirstyGirl() {
      const f = env.player.flags, R = (k) => env.T("CeladonCity_DepartmentStore_Roof_Text_" + k);
      const have = env.DRINKS.filter(([drink]) => Player.itemCount(env.player, drink));
      if (!have.length) { await env.say(R("ImThirstyIWantDrink")); return; }
      const q = R("ImThirstyGiveHerDrink");
      await env.say(q.slice(0, -1));
      if (!(await env.confirm(env.fill(q[q.length - 1])))) return;
      // (MULTICHOICE_THIRSTY_GIRL_...: the drinks you have, then EXIT.)
      const v = await env.multichoice(R("GiveWhichDrink")[0], 0, 0, have.map(([drink]) => Bag.name(drink)).concat(["Exit"]));
      Screen.say("");
      if (v < 0 || v >= have.length) return;
      const [drink, tm, flag, yay, explain] = have[v];
      if (f[flag]) { await env.say(R("ImNotThirstyAfterAll")); return; }
      await env.say(R(yay));
      Player.removeItem(env.player, drink);
      Player.addItem(env.player, tm);
      f[flag] = true;
      await env.sayWithJingle("mus_level_up", "{PLAYER} received " + env.article(Bag.name(tm)) + "\nfrom the little girl.");
      await env.say(R(explain));
    }

    // Fresh Water ₽200, Soda Pop ₽300, Lemonade ₽350, as many as you like:
    // the money box at the top left, the drinks in MULTICHOICE_CELADON_VENDING_MACHINE.
    async function vendingMachine() {
      const R = (k) => env.T("CeladonCity_DepartmentStore_Roof_Text_" + k);
      await Screen.prompt(R("VendingMachineWhatDoesItHave")[0]);
      env.moneyBox(0, 0);
      try {
        for (;;) {
          const v = await env.multichoice(null, 12, 0, env.DRINKS.map(([drink, , , , , price]) => Bag.name(drink) + "{CLEAR_TO 87}{FONT_SMALL}¥" + price).concat(["Exit"]));
          if (v < 0 || v >= env.DRINKS.length) { await env.say(R("NotThirsty")); return; }
          const [drink, , , , , price] = env.DRINKS[v];
          if (env.player.money < price) { await env.say(R("NotEnoughMoney")); return; }
          Player.addMoney(env.player, -price);
          env.moneyBox(0, 0);
          env.sfx("se_shop");
          await env.say(R("DrinkCanPoppedOut"), [Bag.name(drink)]);
          Player.addItem(env.player, drink);
          await Screen.prompt(R("VendingMachineWhatDoesItHave")[0]);
        }
      } finally { env.moneyBox(null); }
    }

    // ---------- The S.S. Anne ----------
    //
    // Red (where FireRed has Gary) comes out of a cabin on 2F and battles you:
    // Pikachu (26, knowing Surf and Terastallizing into a Water type),
    // Charmeleon, Wartortle and Ivysaur (27 each). The Captain,
    // seasick, gives you HM01 Cut once you've rubbed his back; the next time you
    // step out onto the dock, the ship sets sail and is gone.
    // Red's Pikachu (this game's own): it knows Surf, and Terastallizes into a Water type.
    function surfingPikachu(level) {
      const moves = window.RandomTeam.levelUpMoves("Pikachu", level).filter((m) => m !== "Surf").slice(-3).concat(["Surf"]);
      return Object.assign(Party.create("Pikachu", level, { moves }), { teraType: "Water", teraAce: true });
    }

    async function ssAnneRed(side) {
      const f = env.player.flags, R = "LOCALID_SS_ANNE_RIVAL";
      env.sfx("se_exit");
      env.music("mus_encounter_rival");
      Overworld.addObject(R, { x: 30, y: 2, facing: "down" }, window.WORLD_SPRITES.red);
      await Overworld.act([{ who: R, moves: env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      const approach = [{ who: R, moves: env.M("SSAnne_2F_Corridor_Movement_RivalApproach" + side) }];
      if (side !== "Left") approach.push({ who: "player", moves: env.M("SSAnne_2F_Corridor_Movement_PlayerFaceRival" + side) });
      await Overworld.act(approach);
      if (side === "Left") await Overworld.act([{ who: "player", moves: env.M("Common_Movement_WalkInPlaceFasterUp") }]);
      await env.say("…");
      // (His Pikachu knows Surf, and Terastallizes into a Water type.)
      const team = [surfingPikachu(26), Party.create("Charmeleon", 27), Party.create("Wartortle", 27), Party.create("Ivysaur", 27)];
      const outcome = await env.battle("trainer", { foe: { name: "Pokémon Trainer Red", team, pic: "red", tera: true }, defeatText: ["…"] });
      if (outcome !== "won") return;
      f.ssAnneRed = true;
      env.show("world");
      await Overworld.resume();
      await env.say(["…", "Red nodded, and headed off."]);
      env.music("mus_rival_exit");
      await Overworld.act([{ who: R, moves: env.M("SSAnne_2F_Corridor_Movement_RivalExit" + side).concat(["set_invisible"]) }]);
      Overworld.removeObject(R);
      env.music((window.WORLD_MAPS.SSAnne_2F_Corridor || {}).music);
    }

    async function ssAnneCaptain() {
      const f = env.player.flags, C = "SSAnne_CaptainsOffice_Text_";
      if (f.gotHM01) {
        await Overworld.act([{ who: "LOCALID_SS_ANNE_CAPTAIN", moves: ["face_player"] }]);
        await env.say(env.T(C + "SSAnneWillSetSailSoon"));
        return;
      }
      await env.say(env.T(C + "CaptainIFeelSeasick"));
      await env.sayWithJingle("mus_heal", env.T(C + "RubbedCaptainsBack"));
      await Overworld.act([{ who: "LOCALID_SS_ANNE_CAPTAIN", moves: ["face_player"] }]);
      await env.say(env.T(C + "ThankYouHaveHMForCut"));
      Player.addItem(env.player, "hm01");
      f.gotHM01 = true;
      await env.sayWithJingle("mus_obtain_key_item", env.T(C + "ObtainedHM01FromCaptain"));
      await env.say(env.T(C + "ExplainCut"));
    }

    // Out on the dock with HM01: the ship sails off, and you head back up the pier.
    function ssAnneDeparting() { return !!(env.player.flags.gotHM01 && !env.player.flags.ssAnneDeparted); }

    async function ssAnneDeparts() {
      const f = env.player.flags, at = Overworld.position();
      await Overworld.act([{ who: "player", moves: at.y <= 6 ? env.M("SSAnne_Exterior_Movement_WalkDown") : env.M("Common_Movement_WalkInPlaceFasterDown") }]);
      env.music("mus_surf");
      await new Promise((r) => setTimeout(r, 800));
      await Overworld.act([{ who: "LOCALID_SS_ANNE", moves: Array(12).fill("walk_slow_left") }]);
      Overworld.removeObject("LOCALID_SS_ANNE");
      f.ssAnneDeparted = true;
      await Overworld.act([{ who: "player", moves: env.M("SSAnne_Exterior_Movement_Exit") }]);
      await Overworld.teleport({ map: "VermilionCity", x: 23, y: 34, facing: "up" });
      await Overworld.act([{ who: "player", moves: env.M("VermilionCity_Movement_ExitSSAnne") }]);
    }

    return {
      oakWalksYouToTheLab,
      rivalLabBattle,
      pokedexScene,
      catchTutorial,
      rateDex,
      aideGift,
      leafWaiting,
      leafPewterDue,
      leafVermilionStep,
      leafComesOver,
      leafPewter,
      leafLeaves,
      leafVermilion,
      signLadyPlace,
      signLadyShowSign,
      signLady,
      megaAideDue,
      megaAideRoute,
      stepOutOfDoor,
      megaAide,
      teraAide,
      megaTowerPeople,
      megaLeaves,
      megaTower,
      marowakGhost,
      nuggetBridgeRocket,
      ceruleanGrunt,
      dayCareMan,
      bill,
      billsComputer,
      miguelBattle,
      elevator,
      setDynamicWarp,
      giftMon,
      faceBack,
      thirstyGirl,
      vendingMachine,
      surfingPikachu,
      ssAnneRed,
      ssAnneCaptain,
      ssAnneDeparting,
      ssAnneDeparts,
    };
  }

  window.KantoTowns = { create };
})();
