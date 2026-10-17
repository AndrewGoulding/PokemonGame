// Blackjack in the Celadon Game Corner (this game's own), for coins at the
// blackjack dealer's table.
//
// The usual casino rules: a six-deck shoe, shuffled again once three
// quarters of it has been dealt. You bet, and get two cards face up; the
// dealer one up and one down. Cards count their number, faces 10, an Ace 1
// or 11. An Ace and a ten-card is Blackjack, paying 3 to 2 (rounded down). With an
// Ace or ten-card showing, the dealer checks for Blackjack first: if it's
// there, the hand's over (a Blackjack of yours pushes). Otherwise you Hit
// (another card) or Stand; on your first two cards you can Double Down (twice
// the bet, one more card) or, with a pair, Split them once into two hands
// (split Aces take one card each). Over 21 you bust and lose. Then the dealer
// draws to 17 and stands, soft 17 included. Beat the dealer: even money; the
// same: a push, your bet back.
//
//   const g = Blackjack.create({ coins, rng });   // a table; g.coins: yours at it
//   Blackjack.deal(g, bet);                         // g.phase: "player" | "done"
//   Blackjack.options(g) -> { hit, stand, double, split } for the hand in play (g.hands[g.active])
//   Blackjack.act(g, "hit" | "stand" | "double" | "split");   // the dealer plays once your hands are done
//   g.result: [{ outcome: "blackjack" | "win" | "push" | "lose" | "bust", paid }] once done
// Cards are { rank: 2-14 (11 J, 12 Q, 13 K, 14 A), suit: "S" | "H" | "D" | "C" }.
(function () {
  const SUITS = ["S", "H", "D", "C"];
  const DECKS = 6, RESHUFFLE = 0.25;   // (a new shoe once a quarter is left)
  const BETS = [10, 20, 50, 100, 200];

  function shoe(rng) {
    const d = [];
    for (let n = 0; n < DECKS; n++) for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) d.push({ rank, suit });
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }
  const points = (c) => (c.rank === 14 ? 11 : Math.min(10, c.rank));
  // { total, soft } (soft: an Ace still counting 11).
  function value(cards) {
    let total = 0, aces = 0;
    for (const c of cards) { total += points(c); if (c.rank === 14) aces++; }
    while (total > 21 && aces) { total -= 10; aces--; }
    return { total, soft: aces > 0 };
  }
  const isBlackjack = (cards) => cards.length === 2 && value(cards).total === 21;

  function create(opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    return { rng, coins: opts.coins | 0, shoe: shoe(rng), hands: [], dealer: [], active: 0, phase: "bet", result: null, shuffled: false };
  }
  function draw(g) {
    if (g.shoe.length < DECKS * 52 * RESHUFFLE) { g.shoe = shoe(g.rng); g.shuffled = true; }
    return g.shoe.shift();
  }

  function deal(g, bet) {
    bet = Math.min(bet | 0, g.coins);
    g.coins -= bet;
    g.shuffled = false;
    const hand = { cards: [], bet, done: false };
    g.hands = [hand];
    g.dealer = [];
    g.active = 0;
    g.result = null;
    hand.cards.push(draw(g)); g.dealer.push(draw(g)); hand.cards.push(draw(g)); g.dealer.push(draw(g));
    g.phase = "player";
    // (The dealer checks for Blackjack with an Ace or ten-card up; yours ends it too.)
    const up = points(g.dealer[0]);
    if ((up >= 10 && isBlackjack(g.dealer)) || isBlackjack(hand.cards)) { hand.done = true; finish(g); }
    return g;
  }

  function options(g) {
    const h = g.hands[g.active];
    if (g.phase !== "player" || !h) return null;
    const two = h.cards.length === 2 && !h.splitAces;
    return {
      hit: !h.splitAces, stand: true,
      double: two && g.coins >= h.bet,
      split: two && g.hands.length === 1 && points(h.cards[0]) === points(h.cards[1]) && g.coins >= h.bet
    };
  }

  function act(g, what) {
    const o = options(g);
    if (!o || !o[what]) return g;
    const h = g.hands[g.active];
    if (what === "hit") {
      h.cards.push(draw(g));
      if (value(h.cards).total >= 21) h.done = true;
    } else if (what === "stand") h.done = true;
    else if (what === "double") {
      g.coins -= h.bet; h.bet *= 2; h.doubled = true;
      h.cards.push(draw(g));
      h.done = true;
    } else if (what === "split") {
      g.coins -= h.bet;
      const aces = h.cards[0].rank === 14;
      const second = { cards: [h.cards.pop()], bet: h.bet, done: false, split: true };
      h.split = true;
      g.hands.push(second);
      for (const x of g.hands) {
        x.cards.push(draw(g));
        // (Split Aces: one card each, and that's all.)
        if (aces) { x.splitAces = true; x.done = true; }
        else if (value(x.cards).total === 21) x.done = true;
      }
    }
    // On to the next hand still in play, or the dealer.
    while (g.hands[g.active] && g.hands[g.active].done) g.active++;
    if (g.active >= g.hands.length) finish(g);
    return g;
  }

  // The dealer plays (unless every hand of yours is bust), and each hand is paid.
  function finish(g) {
    const live = g.hands.some((h) => value(h.cards).total <= 21);
    const dealerBj = isBlackjack(g.dealer);
    const natural = g.hands.length === 1 && isBlackjack(g.hands[0].cards);
    if (live && !dealerBj && !natural) while (value(g.dealer).total < 17) g.dealer.push(draw(g));
    const d = value(g.dealer).total;
    g.result = g.hands.map((h) => {
      const v = value(h.cards).total;
      // (A split hand's 21 in two cards isn't a Blackjack.)
      const bj = !h.split && isBlackjack(h.cards);
      let outcome;
      if (v > 21) outcome = "bust";
      else if (bj && dealerBj) outcome = "push";
      else if (bj) outcome = "blackjack";
      else if (dealerBj) outcome = "lose";
      else if (d > 21 || v > d) outcome = "win";
      else if (v === d) outcome = "push";
      else outcome = "lose";
      const paid = outcome === "blackjack" ? h.bet + Math.floor(h.bet * 3 / 2) : outcome === "win" ? 2 * h.bet : outcome === "push" ? h.bet : 0;
      g.coins += paid;
      return { outcome, paid, bet: h.bet, total: v };
    });
    g.phase = "done";
    g.active = -1;
    return g;
  }

  window.Blackjack = { SUITS, DECKS, BETS, shoe, points, value, isBlackjack, create, deal, options, act };
})();
