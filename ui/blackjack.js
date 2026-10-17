// The Game Corner's blackjack table (game/blackjack.js has the rules).
//
//   const coins = await BlackjackScreen.run(sceneElement, Blackjack.create({ coins }), onCoins);   // -> your coins when you leave
//
// The dealer's cards along the top (the second face down until it's the
// dealer's turn; then the dealer's draws come one at a time), yours at the
// bottom with their total (and a second hand, side by side, after a split;
// the one in play outlined), your coins and your bet. Before a hand: a bet
// (10 to 200 Coins, what you can afford) or Leave the table (B too). In a hand:
// Hit, Stand, and on two cards Double Down and, with a pair, Split, picked
// with left / right and A (or tapped).
(function () {
  const B = () => window.Blackjack;
  const RANKS = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  const SUIT = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const esc = (s) => window.Screen.escapeHtml(String(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const DEAL_MS = 350;
  const OUTCOMES = { blackjack: "Blackjack!", win: "You win!", push: "Push", lose: "Dealer wins", bust: "Bust!" };

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

  // `onCoins(coins)`: called whenever your coins change (a bet down, a hand
  // paid), to keep the Coin Case up to date; it returns what the Coin Case
  // holds (it may be full), and the table goes on with that.
  function run(root, g, onCoins) {
    const sync = () => { if (onCoins) g.coins = onCoins(g.coins); };
    const se = (id) => { if (window.GameAudio) window.GameAudio.se(id); };
    let buttons = [], cursor = 0, pick = null, message = "Place your bet!", shownDealer = 0, shownMine = [0], holeDown = true, lastBet = 10;

    function draw() {
      const dealerCards = g.dealer.slice(0, shownDealer);
      const dealerTotal = !dealerCards.length ? "" : holeDown ? (B().points(dealerCards[0]) === 11 ? "A" : B().points(dealerCards[0])) + " showing" : totalText(dealerCards);
      const hands = g.hands.map((h, i) => {
        const cards = h.cards.slice(0, shownMine[i] == null ? h.cards.length : shownMine[i]);
        const r = g.result && g.result[i];
        return '<div class="bj-hand' + (g.phase === "player" && g.active === i ? " active" : "") + (r ? " " + r.outcome : "") + '">' +
          '<div class="pk-hole">' + cards.map((c) => card(c)).join("") + "</div>" +
          '<div class="bj-total">' + (cards.length ? esc(totalText(cards)) : "") + "</div>" +
          '<div class="bj-bet">Bet ' + h.bet + (r ? " · " + esc(OUTCOMES[r.outcome]) + (r.paid ? " +" + r.paid : "") : "") + "</div></div>";
      }).join("");
      root.innerHTML = '<div class="dig poker blackjack">' +
        '<div class="bj-dealer"><div class="pk-name">Dealer</div><div class="pk-hole">' + dealerCards.map((c, i) => card(c, i === 1 && holeDown)).join("") + "</div>" +
          '<div class="bj-total">' + esc(dealerTotal) + "</div></div>" +
        '<div class="pk-middle"><div class="pk-yours">' + esc(message) + '</div><div class="pk-message">Dealer stands on all 17s · Blackjack pays 3 to 2</div></div>' +
        '<div class="bj-hands">' + hands + "</div>" +
        '<div class="bj-bottom"><div class="pk-chips">' + g.coins + ' Coins</div><div class="pk-actions">' +
          buttons.map((b, i) => '<button type="button" class="pk-button' + (i === cursor ? " cursor" : "") + '" data-i="' + i + '">' + esc(b.label) + "</button>").join("") +
        "</div></div></div>";
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
      if (["ArrowLeft", "a", "A", "ArrowUp"].includes(e.key)) { cursor = (cursor + buttons.length - 1) % buttons.length; draw(); }
      else if (["ArrowRight", "d", "D", "ArrowDown"].includes(e.key)) { cursor = (cursor + 1) % buttons.length; draw(); }
      else if (["z", "Z", " ", "Enter"].includes(e.key)) chosen(cursor);
      else if (["x", "X", "b", "B"].includes(e.key)) { const leave = buttons.findIndex((b) => b.value === "leave"); if (leave >= 0) chosen(leave); else return; }
      else return;
      e.preventDefault();
    }
    function onClick(e) {
      const b = e.target.closest && e.target.closest(".pk-button");
      if (b) { e.preventDefault(); chosen(+b.dataset.i); }
    }
    document.addEventListener("keydown", onKey);
    root.addEventListener("click", onClick);

    async function round(bet) {
      lastBet = bet;
      B().deal(g, bet);
      sync();
      message = g.shuffled ? "A fresh shoe is shuffled." : "";
      // The deal: yours, the dealer's, yours, the dealer's (face down).
      holeDown = true; shownDealer = 0; shownMine = [0];
      for (const [who, n] of [["me", 1], ["dealer", 1], ["me", 2], ["dealer", 2]]) {
        if (who === "me") shownMine[0] = n; else shownDealer = n;
        se("se_ball_tray_ball");
        draw();
        await sleep(DEAL_MS);
      }
      shownMine = [];
      while (g.phase === "player") {
        const o = B().options(g);
        const list = [{ label: "Hit", value: "hit" }, { label: "Stand", value: "stand" }];
        if (o.double) list.push({ label: "Double Down", value: "double" });
        if (o.split) list.push({ label: "Split", value: "split" });
        message = g.hands.length > 1 ? "Hand " + (g.active + 1) + ": hit or stand?" : "Hit or stand?";
        const v = await choose(list, 0);
        B().act(g, v);
        sync();
        if (v !== "stand") se("se_ball_tray_ball");
        draw();
        if (v !== "stand") await sleep(DEAL_MS);
      }
      // The dealer's turn: the hole card, then each card drawn.
      holeDown = false;
      message = "";
      draw();
      while (shownDealer < g.dealer.length) { await sleep(DEAL_MS * 2); shownDealer++; se("se_ball_tray_ball"); draw(); }
      await sleep(DEAL_MS);
      const won = g.result.reduce((n, r) => n + r.paid - r.bet, 0);
      message = g.result.length > 1 ? (won > 0 ? "You come out " + won + " Coins up!" : won < 0 ? "You're down " + -won + " Coins." : "You break even.")
        : OUTCOMES[g.result[0].outcome] + (g.result[0].outcome === "blackjack" ? " Paid 3 to 2." : "");
      sync();
      se(won > 0 ? "se_shop" : won < 0 ? "se_failure" : "se_select");
      draw();
    }

    return (async () => {
      for (;;) {
        const bets = B().BETS.filter((n) => n <= g.coins);
        if (!bets.length) {
          message += (message ? " " : "") + "You're out of Coins for a bet.";
          await choose([{ label: "Leave the table", value: "leave" }], 0);
          break;
        }
        const v = await choose(bets.map((n) => ({ label: "Bet " + n, value: n })).concat([{ label: "Leave the table", value: "leave" }]),
          Math.max(0, bets.indexOf(lastBet)));
        if (v === "leave") break;
        await round(v);
      }
      document.removeEventListener("keydown", onKey);
      root.removeEventListener("click", onClick);
      return g.coins;
    })();
  }

  window.BlackjackScreen = { run };
})();
