// Kanto activities and their rewards.
// Shared state and services are accessed through live env properties.
(function () {
  "use strict";

  function create(env) {
    async function berryPowderMan() {
      const f = env.player.flags, X = (k) => env.T("CeruleanCity_House1_Text_" + k);
      const berries = () => Object.keys(env.player.bag).filter((id) => /-berry$/.test(id) && env.player.bag[id] > 0);
      if (!f.gotPowderJar) {
        const q = X("AnyInterestInBerries");
        await env.say(q.slice(0, -1));
        if (!(await env.confirm(env.fill(q[q.length - 1])))) { await env.say(X("TakeInterestInAllSortsOfThings")); return; }
        if (!berries().length) { await env.say(X("WhyMustYouLieNoBerries")); return; }
        await env.say(X("HaveJustTheThing"));
        Player.addItem(env.player, "powder-jar");
        f.gotPowderJar = true;
        await env.sayWithJingle("mus_obtain_key_item", "{PLAYER} received the " + Bag.name("powder-jar") + "!");
        // (FireRed's lines: the Berry Crush at the Direct Corner, ui/berry-crush.js.)
        await env.say(X("GoCrushBerriesAtDirectCorner").slice(0, -1));
        await env.say(["If you'd rather, bring your Berries\nto me and I'll crush them myself."]);
      }
      // Crushing Berries (this game's): a kind, and how many.
      for (;;) {
        const have = berries();
        if (!have.length || !(await env.confirm("Shall I crush some of your Berries\ninto Berry Powder?"))) break;
        const i = await env.ask("Which Berries shall I crush?", have.map((id) => ({ label: Bag.name(id) + "  ×" + env.player.bag[id] + "  (" + env.berryPowderOf(id) + " each)", value: id }))
          .concat([env.back()]));
        if (i === "back") break;
        const n = await env.chooseQuantity("How many shall I crush?", env.player.bag[i]);
        Screen.say("");
        if (!n) continue;
        Player.removeItem(env.player, i, n);
        const gained = n * env.berryPowderOf(i);
        f.berryPowder = Math.min(99999, (f.berryPowder | 0) + gained);
        env.sfx("se_m_bonemerang");
        await env.say(gained.toLocaleString("en-US") + " units of Berry Powder\nwent into the Powder Jar.");
      }
      // FireRed's exchange (CeruleanCity_House5_EventScript_AskToExchangePowder).
      await env.say(X("HaveYouBroughtBerryPowder"));
      for (;;) {
        const v = await env.ask(env.T("CeruleanCity_House5_Text_ExchangeWithWhat")[0] + "\n(Berry Powder: " + (f.berryPowder | 0).toLocaleString("en-US") + ")",
          env.POWDER_PRIZES.map(([id, cost]) => ({ label: Bag.name(id) + "  " + cost, value: id })).concat([env.back("Exit")]));
        if (v === "back") { await env.say(X("SeeMeIfYoudLikeToTradePowder")); return; }
        const cost = env.POWDER_PRIZES.find(([id]) => id === v)[1];
        if (!(await env.confirm(env.fill(X("YoullExchangeBerryPowderForItem")[0], [Bag.name(v)])))) continue;
        if ((f.berryPowder | 0) < cost) { await env.say(X("DontHaveEnoughBerryPowder")); continue; }
        f.berryPowder -= cost;
        Player.addItem(env.player, v);
        await env.sayWithJingle(env.itemJingle(v), "{PLAYER} received the " + Bag.name(v) + "!");
        const more = X("TradeMoreBerryPowder");
        await env.say(more.slice(0, -1));
        if (!(await env.confirm(more[more.length - 1]))) { await env.say(X("HopeToSeeYouAgain")); return; }
      }
    }

    async function directCorner() {
      const f = env.player.flags;
      if (!f.pokedex || !f.gotPowderJar) { await env.say(env.T("Text_WirelessClubUndergoingAdjustments")); return; }
      await env.say(["Welcome to the Pokémon Wireless\nClub Direct Corner.", "You may interact directly with\nyour friends here."]);
      for (;;) {
        const v = await env.multichoice("Which room would you like to\nenter?", 0, 0, ["Berry Crush", "Cancel"]);
        if (v !== 0) { Screen.say(""); await env.say("Please come again!"); return; }
        if (!(await env.confirm("Would you like to use the\nBerry Crush System?"))) continue;
        if (!env.hasBerry()) { await env.say("To use the Berry Crush service,\nyou must have at least one Berry."); continue; }
        const k = await env.multichoice("How many will play?", 0, 0, ["2 players", "3 players", "4 players", "5 players", "Cancel"]);
        if (k < 0 || k > 3) continue;
        Screen.say("");
        await berryCrush(k + 2);
        return;
      }
    }

    async function chooseCrushBerry() {
      const r = await BagScreen.open({
        pockets: () => env.bagPockets().filter((p) => p.name === "Berries"), pocketName: "Berries",
        female: !!(Player.LOOKS[env.player.look] && Player.LOOKS[env.player.look].girl), frame: GameOptions.get().frame,
        actions: () => [{ label: "Choose", value: "choose" }]
      });
      BagScreen.close();
      return r ? r.id : null;
    }

    async function berryCrush(count) {
      const f = env.player.flags;
      const names = env.CRUSH_NAMES.slice().sort(() => Math.random() - 0.5);
      const players = [{ name: env.player.name, you: true }].concat(names.slice(0, count - 1).map((name) => ({ name, cpu: BerryCrush.cpu() })));
      const kinds = Object.keys(BerryCrush.BERRIES).slice(0, 25);   // (what the others bring: the commoner ones)
      await Overworld.fadeToBlack();
      env.show("scene");
      env.clearMenu();
      env.music("mus_game_corner");
      const bc = await BerryCrushScreen.open(env.scene, { players, sfx: env.sfx });
      try {
        await bc.fadeIn();
        for (;;) {
          await env.say(["Are you ready to Berry-Crush?\nPlease pick a Berry for use."]);
          Screen.say("");
          const mine = await chooseCrushBerry();
          if (!mine) break;
          Player.removeItem(env.player, mine, 1);
          const ids = [mine].concat(players.slice(1).map(() => kinds[Math.floor(Math.random() * kinds.length)] + "-berry"));
          Screen.say("Please wait while each member\nchooses a Berry.");
          await env.sleep(1000);
          Screen.say("");
          await bc.drop(ids.map((id) => ({ id, icon: Bag.sprite(id), box: (window.ITEM_SPRITE_BOXES || {})[id] })));
          await bc.countdown();
          const { game, timeUp } = await bc.play(ids);
          await bc.finish(timeUp);
          if (timeUp) await env.say(["Time's up.", "Good Berry Powder could not be\nmade…"]);
          else {
            const res = BerryCrush.results(game);
            // (SaveResults: the pressing speed, a record for this many players.)
            const records = f.berryCrushSpeeds || (f.berryCrushSpeeds = [0, 0, 0, 0]);
            const newRecord = res.pressingSpeed > records[count - 2];
            if (newRecord) records[count - 2] = res.pressingSpeed;
            await bc.results(res, newRecord, (id) => Bag.name(id));
            f.berryPowder = Math.min(99999, (f.berryPowder | 0) + res.powder);
            await env.sayWithJingle("mus_level_up", "You ended up with " + res.powder + " units of\nsilky-smooth Berry Powder.");
            await env.say("Your total amount of Berry Powder\nis " + f.berryPowder + ".");
          }
          Screen.say("Recording your game results in the\nsave file.\nPlease wait.");
          await env.persist();
          await env.sleep(500);
          if (!(await env.confirm("Want to play Berry Crush again?"))) break;
          if (!env.hasBerry()) { await env.say("You have no Berries.\nThe game will be canceled."); break; }
          bc.reset();
        }
        Screen.say("");
        await bc.fadeOut();
      } finally {
        bc.close();
      }
      env.show("world");
      env.music(env.avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[env.player.location.map] || {}).music);
      await Overworld.resume();
      await Overworld.fadeFromBlack();
    }

    // The rankings in the Berry Powder man's house (Task_ShowBerryCrushRankings):
    // the best pressing speed for 2 to 5 players, A or B to close.
    async function berryCrushRankings() {
      const speeds = env.player.flags.berryCrushSpeeds || [0, 0, 0, 0];
      const pal = window.GBA_MENUS.palettes.std3, s = GbaMenus.Surface(), c = env.overlayCanvas();
      s.frame("std", pal, 3, 4, 24, 13);
      s.fill(24, 32, 192, 104, pal[1]);
      const centre = (t, y) => s.text(t, 24 + 96 - (s.textWidth(t) >> 1), 32 + y, pal[8], pal[9]);
      centre("Berry Crush", 2);
      centre("Pressing-Speed Rankings", 18);
      speeds.forEach((q, i) => {
        s.text((i + 2) + " players", 24 + 4, 32 + 42 + 14 * i, pal[2], pal[3]);
        const t = BerryCrush.speedText(q) + " Times/sec.";
        s.text(t, 24 + 192 - s.textWidth(t), 32 + 42 + 14 * i, pal[2], pal[3]);
      });
      c.classList.remove("hidden");
      s.show(c);
      await GbaMenus.keys((k) => (k === "a" || k === "b" ? true : undefined));
      c.classList.add("hidden");
    }

    // The clerk (CeladonCity_GameCorner_EventScript_CoinsClerk): the money box
    // and coins box at the top left, and (this game's own) 100, 500 or 1,000
    // Coins (FireRed's 50 or 500, MULTICHOICE_GAME_CORNER_COIN_PURCHASE_COUNTER) at the top right.
    async function coinsClerk() {
      const G = (k) => env.T("CeladonCity_GameCorner_Text_" + k);
      env.moneyBox(0, 0); env.coinsBox(0, 5);
      try {
        const q = G("WelcomeBuySomeCoins");
        await env.say(q.slice(0, -1));
        // (This game's: 100, 500 or 1,000 Coins, at FireRed's ¥20 a Coin.)
        const i = await env.multichoice(q[q.length - 1], 12, 0, ["{FONT_SMALL}  100 Coins{CLEAR_TO 74}¥2,000", "{FONT_SMALL}  500 Coins{CLEAR_TO 69}¥10,000",
          "{FONT_SMALL}1,000 Coins{CLEAR_TO 69}¥20,000", "Exit"]);
        if (i < 0 || i > 2) { await env.say(G("ComePlaySometime")); return; }
        const v = [100, 500, 1000][i];
        if (!env.player.flags.gotCoinCase) { await env.say(G("SorryDontHaveCoinCase")); return; }
        if (env.coins() + v > env.MAX_COINS) { await env.say(G("CoinCaseIsFull")); return; }
        if (env.player.money < v * 20) { await env.say(G("CantAffordCoins")); return; }
        env.addCoins(v);
        Player.addMoney(env.player, -v * 20);
        env.moneyBox(0, 0); env.coinsBox(0, 5);
        env.sfx("se_shop");
        await env.say(G("HereAreYourCoins"));
      } finally { env.moneyBox(null); env.coinsBox(null); }
    }

    async function gambler(person, o) {
      const f = env.player.flags, G = (k) => env.T("CeladonCity_GameCorner_Text_" + k);
      if (f[o.flag]) { await env.say(G(o.after)); await env.faceBack(person); return; }
      await env.say(G(o.ask));
      if (!f.gotCoinCase) await env.say(G("DontHaveCoinCase"));
      else if (env.coins() + o.coins > env.MAX_COINS) await env.say(G(o.full));
      else {
        env.addCoins(o.coins);
        await env.say(G(o.got));
        env.sfx("se_shop");
        f[o.flag] = true;
      }
      await env.faceBack(person);
    }

    // Coins found on the floor go in the Coin Case (FireRed's EventScript_TryPickUpHiddenCoins).
    async function hiddenCoins(h) {
      const found = "{PLAYER} found\n" + h.quantity + " Coins!";
      if (!env.player.flags.gotCoinCase) { await env.say([found, "But {PLAYER} has nothing to put\nthem in."]); return; }
      if (env.coins() + h.quantity > env.MAX_COINS) { await env.say([found, "Too bad!\nThe Coin Case is full…"]); return; }
      env.addCoins(h.quantity);
      env.player.flags[h.flag] = true;
      await env.sayWithJingle("mus_obtain_item", found);
      await env.say("{PLAYER} put the Coins away in\nthe Coin Case.");
    }

    // A slot machine (ui/slot-machine.js): FireRed picks how generous it is.
    async function slotMachine(id) {
      const G = (k) => env.T("CeladonCity_GameCorner_Text_" + k);
      if (!env.player.flags.gotCoinCase) { await env.say(G("CoinCaseIsRequired")); return; }
      if (!(await env.confirm(env.fill(G("SlotMachineWantToPlay").join("\n"))))) return;
      Screen.say("");
      env.player.flags.coins = await window.SlotMachine.play({ machineId: id, coins: env.coins(), maxCoins: env.MAX_COINS, sfx: env.sfx, fanfare: env.fanfare });
      env.show("world");
      await Overworld.resume();
    }

    // Voltorb Flip (ui/voltorb-flip.js), at Mr. Game's table in Goldenrod's
    // Game Corner (HGSS's CasinoGame): the script fades out and back in round it.
    async function voltorbFlip() {
      Screen.say("");
      env.player.flags.coins = await window.VoltorbFlip.play({ coins: env.coins(), maxCoins: env.MAX_COINS, name: env.player.name, sfx: env.sfx, fanfare: env.fanfare });
      env.show("world");
      await Overworld.resume();
      await env.persist();
    }

    // The card tables' stars (game/table-players.js): besides the Gym Leaders
    // and the Elite Four, Red, Leaf and your rival now and then sit in.
    function tableStars() {
      TablePlayers.setStars([
        { name: "Pokémon Trainer Red", pic: "red", style: "steady", sprite: "red" },
        { name: "Pokémon Trainer " + env.LAB_RIVAL_NAME, pic: "green", style: "loose", sprite: "leaf" },
        { name: "Rival " + env.player.rival, pic: "rival_late", style: "loose", sprite: "blue" }]);
    }

    // A star at the table gets a mention before the game.
    async function starNotice(players) {
      const stars = players.filter((p) => p && p.star);
      if (stars.length) await env.say("Whoa! " + stars.map((p) => p.name).join(" and ") + (stars.length > 1 ? "\nare" : "\nis") + " at the table today!");
    }

    // Texas Hold'em (game/poker.js, ui/poker.js; this game's own): the dealer
    // seats you with the three regulars for a buy-in of coins (your chips), and
    // what you have left when you get up goes back in your Coin Case.
    // The stakes (Poker.STAKES): low (200 Coins in, blinds 1 and 2), mid
    // (1,000; 5 and 10) or high (3,000; 15 and 30); the other players buy in the same.
    async function pokerTable() {
      if (!env.player.flags.gotCoinCase) { await env.say(env.T("CeladonCity_GameCorner_Text_CoinCaseIsRequired")); return; }
      await env.say(["Welcome to the poker table!\nWe play Texas Hold'em, fixed limit.",
        "Bets are the big blind, and twice that\non the turn and river."]);
      env.coinsBox(0, 0);
      let v;
      try {
        v = await env.multichoice("Which stakes will you play?", 14, 0, Poker.STAKES.map((st) =>
          "{FONT_SMALL}" + st.name + "{CLEAR_TO 62}" + env.plainCoins(st.buyIn) + " in, " + st.sb + "/" + st.bb).concat(["Cancel"]));
      } finally { env.coinsBox(null); }
      if (v < 0 || v >= Poker.STAKES.length) { await env.say("Maybe next time, then."); return; }
      const stakes = Poker.STAKES[v];
      if (env.coins() < stakes.buyIn) { await env.say("The buy-in at " + stakes.name.toLowerCase() + " is " + env.plainCoins(stakes.buyIn) + " Coins.\nCome back with more!"); return; }
      const buyIn = stakes.buyIn;
      env.addCoins(-buyIn);
      tableStars();
      const table = Poker.create({ chips: buyIn, stakes, name: env.player.name, pic: Player.LOOKS[env.player.look].front });
      await env.say("Here are your chips. Good luck!");
      await starNotice(table.seats.slice(1).map((st) => TablePlayers.stars().find((p) => p.name === st.name)));
      Screen.say("");
      env.show("scene");
      env.clearMenu();
      const chips = await PokerScreen.run(env.scene, table);
      env.show("world");
      await Overworld.resume();
      env.addCoins(chips);
      const diff = chips - buyIn;
      await env.say(diff > 0 ? "You cashed out " + chips + " Coins: " + diff + " up!\nCome back anytime." : diff < 0 ? (chips ? "You cashed out " + chips + " Coins.\nBetter luck next time!" : "Better luck next time!")
        : "You broke even! Come back anytime.");
      await env.persist();
    }

    // Blackjack (game/blackjack.js, ui/blackjack.js; this game's own): bets
    // straight from your Coin Case.
    async function blackjackTable() {
      if (!env.player.flags.gotCoinCase) { await env.say(env.T("CeladonCity_GameCorner_Text_CoinCaseIsRequired")); return; }
      await env.say(["Welcome to the blackjack table!", "Bets are " + Blackjack.BETS[0] + " to " + Blackjack.BETS[Blackjack.BETS.length - 1] +
        " Coins. Blackjack pays\n3 to 2, and I stand on all 17s."]);
      if (env.coins() < Blackjack.BETS[0]) { await env.say("You'll need at least " + Blackjack.BETS[0] + " Coins to play.\nCome back with more!"); return; }
      if (!(await env.confirm("Care to play a few hands?"))) { await env.say("Maybe next time, then."); return; }
      tableStars();
      const others = TablePlayers.pick(2);
      await starNotice(others);
      Screen.say("");
      env.show("scene");
      env.clearMenu();
      const before = env.coins();
      // (Your Coin Case keeps up with every bet and payout, up to 50,000, and the game saves after each hand.)
      const keep = (n) => { env.player.flags.coins = 0; env.addCoins(n); env.persist(); return env.coins(); };
      const after = await BlackjackScreen.run(env.scene, Blackjack.create({ coins: before, name: env.player.name, pic: Player.LOOKS[env.player.look].front,
        others }), keep);
      env.show("world");
      await Overworld.resume();
      keep(after);
      const diff = after - before;
      await env.say(diff > 0 ? "You're " + diff + " Coins up!\nCome back anytime." : diff < 0 ? "Better luck next time!" : "You broke even! Come back anytime.");
      await env.persist();
    }

    function crowdLooks() {
      const looks = {};
      for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people || []) if (!looks[p.sprite]) looks[p.sprite] = p;
      return {
      looks,
      sprites: env.CROWD_SPRITES.filter((s) => looks[s]),
    };
    }

    function cardRoomCrowd() {
      const day = Player.gameTime().day;
      if (!env.crowdCache || env.crowdCache.day !== day) {
        let seed = day * 2654435761 >>> 0;
        const rng = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        const { looks, sprites } = crowdLooks();
        tableStars();
        const room = window.WORLD_MAPS.CeladonCity_GameCorner_CardRoom, players = TablePlayers.pick(5, rng);
        const people = [];
        const seat = (table, i) => {
          // (A star in their own clothes.)
          const [x, y] = room.seats[table][i], who = players[people.length], random = looks[sprites[Math.floor(rng() * sprites.length)]];
          const look = (who.star && (looks[who.sprite] || window.WORLD_SPRITES[who.sprite])) || random;
          const says = who.star ? ["Shh! I'm just here for a quiet game.\nDon't tell anyone!"] : env.CROWD_SAYS[Math.floor(rng() * env.CROWD_SAYS.length)];
          people.push({ id: 910 + people.length, localId: "LOCALID_CARD_PLAYER_" + people.length, script: null, x, y, movement: "face_" + env.CROWD_FACING[table][i],
            rangeX: 0, rangeY: 0, flag: null, text: [who.name + ": " + says[0]].concat(says.slice(1)),
            sprite: look.sprite, width: look.width, height: look.height, frames: look.frames, who });
        };
        [0, 1, 2].forEach((i) => seat("poker", i));
        [0, 2].forEach((i) => seat("blackjack", i));
        env.crowdCache = { day, people };
      }
      return env.crowdCache.people.concat(mahjongPlayers());
    }

    // The three at the mahjong table, each a way to sit in with them.
    function mahjongPlayers() {
      if (!env.mahjongCrowd) {
        tableStars();
        const { looks, sprites } = crowdLooks();
        const room = window.WORLD_MAPS.CeladonCity_GameCorner_CardRoom;
        const away = env.crowdCache ? env.crowdCache.people.map((p) => p.who.name) : [];
        env.mahjongCrowd = TablePlayers.pick(3, Math.random, away).map((who, k) => {
          const i = env.MAHJONG_CHAIRS[k], [x, y] = room.seats.mahjong[i];
          const look = (who.star && (looks[who.sprite] || window.WORLD_SPRITES[who.sprite])) || looks[sprites[Math.floor(Math.random() * sprites.length)]];
          return { id: 920 + k, localId: "LOCALID_MAHJONG_PLAYER_" + k, script: "Game_EventScript_MahjongPlayer", x, y, movement: "face_" + env.CROWD_FACING.mahjong[i],
            rangeX: 0, rangeY: 0, flag: null, text: null, sprite: look.sprite, width: look.width, height: look.height, frames: look.frames, who };
        });
      }
      return env.mahjongCrowd;
    }

    async function mahjongTable() {
      if (!env.player.flags.gotCoinCase) { await env.say(env.T("CeladonCity_GameCorner_Text_CoinCaseIsRequired")); return; }
      const others = mahjongPlayers().map((p) => p.who);
      if (!(await env.confirm("Want to play with us?\nIt costs " + env.MAHJONG_BUY_IN + " Coins for the buy-in."))) { await env.say("Maybe next time, then."); return; }
      if (env.coins() < env.MAHJONG_BUY_IN) { await env.say("You'll need " + env.MAHJONG_BUY_IN + " Coins to sit in.\nCome back with more!"); return; }
      env.addCoins(-env.MAHJONG_BUY_IN);
      await env.say(["We play Riichi: an East round,\n25,000 points each. Every 100 points\nyou have when you get up is a Coin.",
        "You can get up between hands, or\nany time with SELECT, but then you\nforfeit your buy-in."]);
      await starNotice(others);
      Screen.say("");
      env.show("scene");
      env.clearMenu();
      const game = Mahjong.create({ names: [env.player.name].concat(others.map((p) => p.name)) });
      const points = await MahjongScreen.run(env.scene, game, { pics: [Player.LOOKS[env.player.look].front].concat(others.map((p) => p.pic)) });
      // (New players at the table for next time.)
      env.mahjongCrowd = null;
      env.show("world");
      if (Overworld.refreshPeople) Overworld.refreshPeople();
      await Overworld.resume();
      if (points == null) { await env.say("You got up mid-game and forfeited\nyour buy-in. Come back anytime!"); await env.persist(); return; }
      const won = Math.max(0, Math.floor(points / 100));
      env.addCoins(won);
      const diff = won - env.MAHJONG_BUY_IN;
      await env.say(diff > 0 ? "You cashed out " + won + " Coins: " + diff + " up!" : diff < 0 ? (won ? "You cashed out " + won + " Coins.\nBetter luck next time!" : "Better luck next time!")
        : "You broke even!");
      await env.persist();
    }

    async function prizeClerk(counter) {
      const P = (k) => env.T("CeladonCity_GameCorner_PrizeRoom_Text_" + k);
      if (!env.player.flags.gotCoinCase) { await env.say(P("CoinCaseRequired")); return; }
      env.coinsBox(0, 0);
      try {
        await env.say(P("WeExchangeCoinsForPrizes"));
        const list = env.PRIZES[counter], menu = env.PRIZE_MENU[counter];
        const label = ([what]) => counter === "Mons" ? Party.speciesName(what) : counter === "TMs" ? Bag.name(env.machineFor(what)) : Bag.name(what);
        const short = (p) => (counter === "TMs" ? label(p).split(" ")[0] : label(p));
        // (A TM you already have: "-----" for its price, and it can't be had twice, as at the Poké Marts.)
        const owned = ([what]) => counter === "TMs" && Player.itemCount(env.player, env.machineFor(what)) > 0;
        const v = await env.multichoice(P("WhichPrize")[0], menu.left, 0, list.map((p, i) => short(p) + "{CLEAR_TO " + menu.at(i) + "}{FONT_SMALL}" +
          (counter === "Mons" ? " " : "") + (owned(p) ? "-----" : env.plainCoins(p[1]) + " Coins")).concat(["No thanks"]));
        Screen.say("");
        if (v < 0 || v >= list.length) return;
        const [what, price, level] = list[v];
        const name = label(list[v]);
        if (owned(list[v])) { await env.say("You already have that " + short(list[v]) + ".\nTMs and HMs never run out."); return; }
        const ok = counter === "TMs" ? await env.confirm(env.fill(P("YouWantTM")[0], ["", what])) : await env.confirm(env.fill(P("YouWantPrize")[0], [name]));
        if (!ok) return;
        if (env.coins() < price) { await env.say(P("NeedMoreCoins")); return; }
        if (counter === "Mons") {
          await env.giftMon(what, level, env.T("Text_PlayerObtainedTheMon"), [name], () => { env.addCoins(-price); env.coinsBox(0, 0); });
          return;
        }
        const item = counter === "TMs" ? env.machineFor(what) : what;
        env.addCoins(-price);
        env.coinsBox(0, 0);
        Player.addItem(env.player, item);
        await env.sayWithJingle(env.itemJingle(item), "{PLAYER} received " + env.article(Bag.name(item)) + "!");
      } finally { env.coinsBox(null); }
    }

    return {
      berryPowderMan,
      directCorner,
      chooseCrushBerry,
      berryCrush,
      berryCrushRankings,
      coinsClerk,
      gambler,
      hiddenCoins,
      slotMachine,
      voltorbFlip,
      tableStars,
      starNotice,
      pokerTable,
      blackjackTable,
      crowdLooks,
      cardRoomCrowd,
      mahjongPlayers,
      mahjongTable,
      prizeClerk,
    };
  }

  window.KantoActivities = { create };
})();
