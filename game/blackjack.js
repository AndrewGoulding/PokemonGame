// Blackjack in the Celadon Game Corner (this game's own), for coins at the
// blackjack dealer's table, with other trainers playing their own hands
// alongside you (game/table-players.js), basic strategy (strategy()).
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
//   const g = Blackjack.create({ coins, rng, others: TablePlayers.pick(2) });   // g.coins, g.hands, g.result: yours
//   Blackjack.deal(g, bet, replace);               // g.phase: "player" | "done"; g.turn: whose hand is in play
//   Blackjack.options(g) -> { human, hit, stand, double, split } for that hand (g.players[g.turn].hands[g.active])
//   Blackjack.act(g, Blackjack.strategy(g))      // (another player's move), or yours
//   // the dealer plays once every hand is done; each player's .result:
//   // [{ outcome: "blackjack" | "win" | "push" | "lose" | "bust", paid }]
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

  // The table: you (seat `you`) and, with `others` (TablePlayers: { name, pic }), other trainers
  // with STACK coins each, playing their own hands against the same dealer and shoe.
  const STACK = 1000;
  function create(opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const others = (opts.others || []).map((p) => ({ name: p.name, pic: p.pic, coins: p.coins || STACK, hands: [], result: null }));
    const me = { name: opts.name || "You", pic: opts.pic || null, coins: opts.coins | 0, hands: [], result: null, human: true };
    // (You sit in the middle: half of the others play before you, half after.)
    const half = Math.ceil(others.length / 2);
    const players = others.slice(0, half).concat([me], others.slice(half));
    const g = { rng, players, you: half, shoe: shoe(rng), dealer: [], turn: -1, active: 0, phase: "bet", shuffled: false, log: [] };
    // (Your seat's coins, hands and results, as g.coins, g.hands and g.result.)
    for (const k of ["coins", "hands", "result"]) Object.defineProperty(g, k, { get: () => g.players[g.you][k], set: (v) => { g.players[g.you][k] = v; } });
    return g;
  }
  function draw(g) {
    if (g.shoe.length < DECKS * 52 * RESHUFFLE) { g.shoe = shoe(g.rng); g.shuffled = true; }
    return g.shoe.shift();
  }

  // A new hand: your bet `bet`, the others' their own (a favourite amount, now and then more or less).
  // Anyone else out of coins leaves; `replace(name)` (if given) brings a new player for the seat.
  function deal(g, bet, replace) {
    const rng = g.rng;
    g.shuffled = false;
    g.log = [];
    g.players.forEach((p, i) => {
      if (p.human || p.coins >= BETS[0]) return;
      const fresh = replace && replace(g.players.map((o) => o.name));
      g.log.push({ type: "leave", name: p.name, joined: fresh ? fresh.name : null });
      g.players[i] = fresh ? { name: fresh.name, pic: fresh.pic, coins: STACK, hands: [], result: null } : Object.assign(p, { out: true });
    });
    for (const p of g.players) {
      p.result = null;
      p.hands = [];
      if (p.out) continue;
      let b = p.human ? Math.min(bet | 0, p.coins) : (p.fav = p.fav || BETS[Math.floor(rng() * 3)]);
      if (!p.human) { if (rng() < 0.25) b = BETS[Math.max(0, Math.min(BETS.length - 1, BETS.indexOf(b) + (rng() < 0.5 ? -1 : 1)))]; b = Math.min(b, p.coins); }
      p.coins -= b;
      p.hands = [{ cards: [], bet: b, done: false }];
    }
    g.dealer = [];
    const seated = g.players.filter((p) => p.hands.length);
    for (let round = 0; round < 2; round++) { for (const p of seated) p.hands[0].cards.push(draw(g)); g.dealer.push(draw(g)); }
    g.phase = "player";
    // (The dealer checks for Blackjack with an Ace or ten-card up: then it's over.)
    if (points(g.dealer[0]) >= 10 && isBlackjack(g.dealer)) return finish(g);
    for (const p of seated) if (isBlackjack(p.hands[0].cards)) p.hands[0].done = true;
    g.turn = -1;
    return next(g);
  }
  // On to the next hand still in play, the next player, or the dealer.
  function next(g) {
    for (;;) {
      const p = g.players[g.turn];
      if (p) { while (p.hands[g.active] && p.hands[g.active].done) g.active++; if (p.hands[g.active]) return g; }
      g.turn++; g.active = 0;
      if (g.turn >= g.players.length) return finish(g);
    }
  }
  const current = (g) => (g.phase === "player" ? g.players[g.turn] : null);

  // What the hand in play can do (and `p` its player).
  function options(g) {
    const p = current(g), h = p && p.hands[g.active];
    if (!h) return null;
    const two = h.cards.length === 2 && !h.splitAces;
    return {
      player: g.turn, human: !!p.human, hit: !h.splitAces, stand: true,
      double: two && p.coins >= h.bet,
      split: two && p.hands.length === 1 && points(h.cards[0]) === points(h.cards[1]) && p.coins >= h.bet
    };
  }

  function act(g, what) {
    const o = options(g);
    if (!o || !o[what]) return g;
    const p = current(g), h = p.hands[g.active];
    g.log = [{ type: what, player: g.turn }];
    if (what === "hit") {
      h.cards.push(draw(g));
      if (value(h.cards).total >= 21) h.done = true;
    } else if (what === "stand") h.done = true;
    else if (what === "double") {
      p.coins -= h.bet; h.bet *= 2; h.doubled = true;
      h.cards.push(draw(g));
      h.done = true;
    } else if (what === "split") {
      p.coins -= h.bet;
      const aces = h.cards[0].rank === 14;
      const second = { cards: [h.cards.pop()], bet: h.bet, done: false, split: true };
      h.split = true;
      p.hands.push(second);
      for (const x of p.hands) {
        x.cards.push(draw(g));
        // (Split Aces: one card each, and that's all.)
        if (aces) { x.splitAces = true; x.done = true; }
        else if (value(x.cards).total === 21) x.done = true;
      }
    }
    return next(g);
  }

  // Basic strategy (the usual chart, near enough), for the other players.
  function strategy(g) {
    const o = options(g), p = current(g), h = p.hands[g.active];
    const v = value(h.cards), up = points(g.dealer[0]);
    if (o.split) {
      const r = points(h.cards[0]);
      if (r === 11 || r === 8 || ([2, 3, 7].includes(r) && up <= 7) || (r === 6 && up <= 6) || (r === 9 && ![7, 10, 11].includes(up))) return "split";
    }
    if (o.double && !v.soft && (v.total === 11 || (v.total === 10 && up <= 9) || (v.total === 9 && up >= 3 && up <= 6))) return "double";
    if (v.soft) {
      if (o.double && v.total >= 15 && v.total <= 18 && up >= 4 && up <= 6) return "double";
      return v.total >= 19 || (v.total === 18 && up <= 8) ? "stand" : "hit";
    }
    return v.total >= 17 || (v.total >= 13 && up <= 6) || (v.total === 12 && up >= 4 && up <= 6) ? "stand" : "hit";
  }

  // The dealer plays (unless every hand at the table is bust or a Blackjack), and each hand is paid.
  function finish(g) {
    const hands = g.players.flatMap((p) => p.hands);
    const dealerBj = isBlackjack(g.dealer);
    const waiting = hands.some((h) => value(h.cards).total <= 21 && !(!h.split && isBlackjack(h.cards)));
    if (waiting && !dealerBj) while (value(g.dealer).total < 17) g.dealer.push(draw(g));
    const d = value(g.dealer).total;
    for (const p of g.players) {
      p.result = p.hands.map((h) => {
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
        p.coins += paid;
        return { outcome, paid, bet: h.bet, total: v };
      });
    }
    g.phase = "done";
    g.turn = -1;
    g.active = -1;
    return g;
  }

  window.Blackjack = { SUITS, DECKS, BETS, STACK, shoe, points, value, isBlackjack, create, deal, options, act, strategy, current };
})();
