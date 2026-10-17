// The Game Corner's blackjack table (game/blackjack.js has the rules).
//
//   const coins = await BlackjackScreen.run(sceneElement, Blackjack.create({ coins, others, name, pic }), onCoins);
//   // -> your coins when you leave
//
// The dealer's cards along the top (the second face down until it's the
// dealer's turn; then the dealer's draws come one at a time), and the
// players along the bottom, you in the middle: each with their portrait
// (their trainer class's front picture), name, coins, and hand (two side by
// side after a split; the one in play outlined) with its total, bet and how
// it went. The others take a moment over each move. Before a hand: your bet
// (10 to 200 Coins, what you can afford) or Leave (B too). Your hand: Hit,
// Stand, and on two cards Double Down and, with a pair, Split, picked with
// the D-pad and A (or tapped), in FireRed's windows under the screen with
// what's happening (ui/table-ui.js).
(function () {
  const B = () => window.Blackjack;
  const RANKS = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  const SUIT = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const esc = (s) => window.Screen.escapeHtml(String(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const DEAL_MS = 300, MOVE_MS = 650;
  const OUTCOMES = { blackjack: "Blackjack!", win: "Win", push: "Push", lose: "Lose", bust: "Bust" };
  const VERBS = { hit: "hits", stand: "stands", double: "doubles down", split: "splits" };

  function card(c, down) {
    if (!c) return "";
    if (down) return '<div class="pk-card back"></div>';
    const red = c.suit === "H" || c.suit === "D";
    return '<div class="pk-card' + (red ? " red" : "") + '"><span class="pk-rank">' + (RANKS[c.rank] || c.rank) + '</span><span class="pk-suit">' + SUIT[c.suit] + "</span></div>";
  }
  const totalText = (cards) => {
    const v = B().value(cards);
    return B().isBlackjack(cards) ? "Blackjack" : v.total > 21 ? v.total + " (bust)" : (v.soft && v.total < 21 ? "Soft " : "") + v.total;
  };

  function run(root, g, onCoins) {
    const se = (id) => { if (window.GameAudio) window.GameAudio.se(id); };
    // (onCoins(coins) keeps your Coin Case up to date and returns what it holds: the table goes on with that.)
    const sync = () => { if (onCoins) g.coins = onCoins(g.coins); };
    let buttons = [], cursor = 0, pick = null, message = "Place your bet!", lastBet = 10;
    // While dealing: how many cards of each player's first hand, and the dealer's, are out (null: all).
    let shown = null, shownDealer = 0, holeDown = true;

    function seatHtml(p, pi) {
      const r = p.result;
      const hands = p.hands.map((h, i) => {
        const n = shown && i === 0 ? shown[pi] : h.cards.length;
        const cards = h.cards.slice(0, n);
        const res = r && r[i];
        return '<div class="bj-hand' + (!shown && g.phase === "player" && g.turn === pi && g.active === i ? " active" : "") + (res ? " " + res.outcome : "") + '">' +
          '<div class="pk-hole">' + cards.map((c) => card(c)).join("") + "</div>" +
          '<div class="bj-total">' + (cards.length ? esc(totalText(cards)) : "") + "</div>" +
          '<div class="bj-bet">' + h.bet + (res ? " · " + esc(OUTCOMES[res.outcome]) + (res.paid > res.bet ? " +" + (res.paid - res.bet) : "") : "") + "</div></div>";
      }).join("");
      return '<div class="bj-seat' + (p.human ? " you" : "") + (!shown && g.phase === "player" && g.turn === pi ? " turn" : "") + (p.out ? " folded" : "") + '">' +
        (p.pic ? '<img class="pk-portrait" alt="" src="assets/sprites/trainers/front/' + esc(p.pic) + '.png">' : "") +
        '<div class="pk-name">' + esc(p.name) + '</div><div class="pk-chips">' + (p.out ? "Out" : p.coins + " Coins") + "</div>" +
        '<div class="bj-seat-hands">' + hands + "</div></div>";
    }

    function draw() {
      const dealerCards = g.dealer.slice(0, shownDealer);
      const dealerTotal = !dealerCards.length ? "" : holeDown ? (B().points(dealerCards[0]) === 11 ? "A" : B().points(dealerCards[0])) + " showing" : totalText(dealerCards);
      root.innerHTML = '<div class="dig poker blackjack">' +
        '<div class="bj-dealer"><div class="pk-name">Dealer</div><div class="pk-hole">' + dealerCards.map((c, i) => card(c, i === 1 && holeDown)).join("") + "</div>" +
          '<div class="bj-total">' + esc(dealerTotal) + "</div></div>" +
        '<div class="pk-middle"><div class="pk-stakes">Dealer stands on all 17s · Blackjack pays 3 to 2</div></div>' +
        '<div class="bj-seats">' + g.players.map(seatHtml).join("") + "</div></div>";
      window.TableUI.panel({ message, items: buttons, cursor, onPick: chosen });
    }

    function choose(list, at) {
      buttons = list;
      cursor = Math.max(0, Math.min(at == null ? cursor : at, list.length - 1));
      draw();
      return new Promise((resolve) => { pick = resolve; });
    }
    function chosen(i) {
      if (!pick || !buttons[i]) return;
      const r = pick;
      pick = null;
      const v = buttons[i].value;
      buttons = [];
      se("se_select");
      r(v);
    }
    function onKey(e) {
      if (!pick) return;
      const to = window.TableUI.move(cursor, buttons.length, e.key);
      if (to != null) { cursor = to; draw(); }
      else if (["z", "Z", " ", "Enter"].includes(e.key)) chosen(cursor);
      else if (["x", "X", "b", "B"].includes(e.key)) { const leave = buttons.findIndex((b) => b.value === "leave"); if (leave >= 0) chosen(leave); else return; }
      else return;
      e.preventDefault();
    }
    document.addEventListener("keydown", onKey);

    // A new player for a seat someone's left (trainers not already at the table).
    const replace = (away) => (window.TablePlayers ? window.TablePlayers.pick(1, Math.random, away)[0] : null);

    async function round(bet) {
      lastBet = bet;
      B().deal(g, bet, replace);
      sync();
      const notes = g.log.filter((e) => e.type === "leave").map((e) => e.name + " is out of Coins and leaves." + (e.joined ? " " + e.joined + " sits down." : ""));
      if (g.shuffled) notes.push("A fresh shoe is shuffled.");
      message = notes.join(" ");
      // The deal: a card each round the table, then the dealer's (the second face down).
      holeDown = true; shownDealer = 0; shown = g.players.map(() => 0);
      for (let k = 1; k <= 2; k++) {
        for (let pi = 0; pi < g.players.length; pi++) {
          if (!g.players[pi].hands.length) continue;
          shown[pi] = k; se("se_ball_tray_ball"); draw(); await sleep(DEAL_MS);
        }
        shownDealer = k; se("se_ball_tray_ball"); draw(); await sleep(DEAL_MS);
      }
      shown = null;
      while (g.phase === "player") {
        const o = B().options(g), p = g.players[g.turn];
        if (o.human) {
          const list = [{ label: "Hit", value: "hit" }, { label: "Stand", value: "stand" }];
          if (o.double) list.push({ label: "Double Down", value: "double" });
          if (o.split) list.push({ label: "Split", value: "split" });
          message = (p.hands.length > 1 ? "Your hand " + (g.active + 1) : "Your turn") + ": hit or stand?";
          const v = await choose(list, 0);
          B().act(g, v);
          sync();
          if (v !== "stand") se("se_ball_tray_ball");
          draw();
          if (v !== "stand") await sleep(DEAL_MS);
        } else {
          message = p.name + "'s turn…";
          draw();
          await sleep(MOVE_MS);
          const v = B().strategy(g);
          B().act(g, v);
          message = p.name + " " + VERBS[v] + ".";
          if (v !== "stand") se("se_ball_tray_ball");
          draw();
          await sleep(MOVE_MS / 2);
        }
      }
      // The dealer's turn: the hole card, then each card drawn.
      holeDown = false;
      message = "The dealer's turn.";
      draw();
      while (shownDealer < g.dealer.length) { await sleep(DEAL_MS * 2); shownDealer++; se("se_ball_tray_ball"); draw(); }
      await sleep(DEAL_MS);
      const won = g.result.reduce((n, r) => n + r.paid - r.bet, 0);
      const dealer = B().value(g.dealer).total;
      message = (dealer > 21 ? "The dealer busts! " : B().isBlackjack(g.dealer) ? "The dealer has Blackjack. " : "The dealer has " + dealer + ". ") +
        (won > 0 ? "You win " + won + " Coins!" : won < 0 ? "You lose " + -won + " Coins." : "You break even.");
      sync();
      se(won > 0 ? "se_shop" : won < 0 ? "se_failure" : "se_select");
      draw();
    }

    return (async () => {
      draw();
      for (;;) {
        const bets = B().BETS.filter((n) => n <= g.coins);
        if (!bets.length) {
          message += (message ? " " : "") + "You're out of Coins for a bet.";
          await choose([{ label: "Leave", value: "leave" }], 0);
          break;
        }
        const v = await choose(bets.map((n) => ({ label: "Bet " + n, value: n })).concat([{ label: "Leave", value: "leave" }]),
          Math.max(0, bets.indexOf(lastBet)));
        if (v === "leave") break;
        await round(v);
      }
      document.removeEventListener("keydown", onKey);
      window.TableUI.clear();
      return g.coins;
    })();
  }

  window.BlackjackScreen = { run };
})();
