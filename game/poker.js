// Texas Hold'em in the Celadon Game Corner (this game's own), played for
// coins at the poker dealer's table against three regulars.
//
// Fixed-limit hold'em: blinds of 5 and 10 coins; bets and raises are 10 on
// the first two rounds (before the flop, and on it) and 20 on the turn and
// river, four bets a round at most (the big blind is the first one before
// the flop). Each player gets two cards; five shared cards come out, three
// (the flop), one (the turn), one (the river), with a round of betting
// before the flop and after each. Whoever's left at the end shows down: the
// best five of their seven cards wins (HAND_NAMES, best first). Anyone short
// of a call or raise goes all in, and side pots sort out who can win what;
// a split pot's odd coin goes to the first winner left of the button.
//
// The regulars (OPPONENTS) decide from their hand's chance of winning against
// whoever's still in, guessed by dealing out the rest of the hand a few
// hundred times (equity), weighed against the price of a call, each in their
// own style: how good a hand they want before raising, how much they need to
// stay in, and how often they bluff. A regular who loses all their chips
// buys back in for STACK.
//
//   const t = Poker.create({ chips: 200, rng });   // you're seat 0
//   Poker.startHand(t);
//   Poker.options(t) -> { seat, toCall, canCheck, canRaise, raiseTo, ... } for t.toAct
//   Poker.act(t, { type: "fold" | "check" | "call" | "raise" });   // t.log: what happened
//   Poker.decide(t) -> an action for the regular to act
//   t.street: "preflop" | "flop" | "turn" | "river" | "done"; t.result once done
// Cards are { rank: 2-14 (11 J, 12 Q, 13 K, 14 A), suit: "S" | "H" | "D" | "C" }.
(function () {
  const SUITS = ["S", "H", "D", "C"];
  const SMALL_BLIND = 5, BIG_BLIND = 10, MAX_BETS = 4, STACK = 500;
  const STREETS = ["preflop", "flop", "turn", "river"];
  const HAND_NAMES = ["High Card", "Pair", "Two Pair", "Three of a Kind", "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush", "Royal Flush"];
  // The regulars: raise with this much of a share of the pot's chances (1 = an even share),
  // need this much of the price of a call to stay in, and bluff this often.
  const OPPONENTS = [
    { name: "Gentleman", raise: 1.7, stay: 1.1, bluff: 0.03 },
    { name: "Gamer", raise: 1.25, stay: 0.75, bluff: 0.15 },
    { name: "Scientist", raise: 1.45, stay: 0.95, bluff: 0.07 }
  ];

  function deck(rng) {
    const d = [];
    for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) d.push({ rank, suit });
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }

  // ---------- Hands ----------

  // Five cards -> [category (0 high card .. 8 straight flush), tiebreakers...].
  function score5(cards) {
    const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
    const counts = {};
    for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
    const groups = Object.entries(counts).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    const flush = cards.length === 5 && cards.every((c) => c.suit === cards[0].suit);
    let high = 0;
    if (groups.length === 5) {
      if (ranks[0] - ranks[4] === 4) high = ranks[0];
      else if (ranks.join() === "14,5,4,3,2") high = 5;   // (ace low)
    }
    const kick = groups.map((g) => g[1]);
    const second = groups[1] ? groups[1][0] : 0;   // (fewer than five cards: describe())
    if (high && flush) return [8, high];
    if (groups[0][0] === 4) return [7, ...kick];
    if (groups[0][0] === 3 && second === 2) return [6, ...kick];
    if (flush) return [5, ...ranks];
    if (high) return [4, high];
    if (groups[0][0] === 3) return [3, ...kick];
    if (groups[0][0] === 2 && second === 2) return [2, ...kick];
    if (groups[0][0] === 2) return [1, ...kick];
    return [0, ...ranks];
  }
  const compare = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0); return 0; };
  // The best five of up to seven cards: { score, cards, name }.
  function best(cards) {
    let top = null;
    const n = cards.length;
    const pick = (start, chosen) => {
      if (chosen.length === 5) {
        const s = score5(chosen);
        if (!top || compare(s, top.score) > 0) top = { score: s, cards: chosen.slice() };
        return;
      }
      for (let i = start; i <= n - (5 - chosen.length); i++) { chosen.push(cards[i]); pick(i + 1, chosen); chosen.pop(); }
    };
    if (n >= 5) pick(0, []);
    else top = { score: score5(cards.concat([])), cards };
    top.name = handName(top.score);
    return top;
  }
  const RANK_WORDS = { 11: "Jack", 12: "Queen", 13: "King", 14: "Ace" };
  const word = (r) => RANK_WORDS[r] || String(r);
  const plural = (r) => (r === 6 ? "Sixes" : word(r) + "s");
  function handName(s) {
    switch (s[0]) {
      case 8: return s[1] === 14 ? "Royal Flush" : "Straight Flush, " + word(s[1]) + " high";
      case 7: return "Four " + plural(s[1]);
      case 6: return plural(s[1]) + " full of " + plural(s[2]);
      case 5: return "Flush, " + word(s[1]) + " high";
      case 4: return "Straight, " + word(s[1]) + " high";
      case 3: return "Three " + plural(s[1]);
      case 2: return "Two Pair, " + plural(s[1]) + " and " + plural(s[2]);
      case 1: return "Pair of " + plural(s[1]);
      default: return word(s[1]) + " high";
    }
  }
  // What two hole cards and the board show so far (fewer than five cards: pairs and the like only).
  function describe(hole, board) {
    const cards = hole.concat(board);
    if (cards.length >= 5) return best(cards).name;
    const s = score5(cards.concat([]));
    return s[0] === 1 ? "Pair of " + plural(s[1]) : word(Math.max(...cards.map((c) => c.rank))) + " high";
  }

  // ---------- The table ----------

  function create(opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const seats = [{ name: opts.name || "You", chips: opts.chips | 0, human: true }]
      .concat(OPPONENTS.map((o) => ({ name: o.name, chips: opts.stack || STACK, style: o })));
    return { rng, seats, button: Math.floor(rng() * seats.length), board: [], deck: [], street: "done", toAct: -1,
      hands: 0, log: [], result: null };
  }
  const inHand = (s) => !s.folded && !s.out;
  const canAct = (s) => inHand(s) && !s.allIn;
  const nextSeat = (t, i, ok) => { for (let k = 1; k <= t.seats.length; k++) { const j = (i + k) % t.seats.length; if (ok(t.seats[j])) return j; } return -1; };
  const betUnit = (t) => (t.street === "turn" || t.street === "river" ? 2 * BIG_BLIND : BIG_BLIND);
  const pot = (t) => t.seats.reduce((n, s) => n + (s.total || 0), 0);

  // Puts `n` chips (at most all of them) from seat `i` into the pot this round.
  function put(t, i, n) {
    const s = t.seats[i], amount = Math.min(n, s.chips);
    s.chips -= amount; s.bet += amount; s.total += amount;
    if (s.chips === 0) s.allIn = true;
    return amount;
  }

  function startHand(t) {
    const rng = t.rng;
    // (A regular who's out of chips buys back in.)
    for (const s of t.seats) if (!s.human && s.chips <= 0) { s.chips = STACK; t.log.push({ type: "rebuy", seat: t.seats.indexOf(s) }); }
    for (const s of t.seats) Object.assign(s, { cards: [], folded: false, allIn: false, bet: 0, total: 0, out: s.chips <= 0, acted: false, last: null });
    t.board = []; t.result = null; t.log = [];
    t.deck = deck(rng);
    t.hands++;
    t.button = nextSeat(t, t.button, (s) => !s.out);
    const live = t.seats.filter((s) => !s.out).length;
    // (Two players: the button posts the small blind and acts first before the flop.)
    const sb = live === 2 ? t.button : nextSeat(t, t.button, (s) => !s.out);
    const bb = nextSeat(t, sb, (s) => !s.out);
    t.blinds = [sb, bb];
    put(t, sb, SMALL_BLIND);
    put(t, bb, BIG_BLIND);
    t.log.push({ type: "blinds", sb, bb });
    for (let round = 0; round < 2; round++) for (let k = 1; k <= t.seats.length; k++) {
      const s = t.seats[(t.button + k) % t.seats.length];
      if (!s.out) s.cards.push(t.deck.shift());
    }
    t.street = "preflop";
    t.currentBet = BIG_BLIND;
    t.bets = 1;
    t.toAct = nextSeat(t, bb, canAct);
    settle(t);
    return t;
  }

  // What the seat to act can do.
  function options(t) {
    const s = t.seats[t.toAct];
    if (!s) return null;
    const toCall = Math.max(0, t.currentBet - s.bet);
    const raiseTo = t.currentBet + betUnit(t);
    // (Raising needs someone else still able to call it.)
    const others = t.seats.filter((o, i) => i !== t.toAct && canAct(o)).length;
    return { seat: t.toAct, toCall, call: Math.min(toCall, s.chips), canCheck: toCall === 0,
      canRaise: t.bets < MAX_BETS && s.chips > toCall && others > 0, raiseTo: Math.min(raiseTo, s.bet + s.chips), unit: betUnit(t), pot: pot(t) };
  }

  function act(t, action) {
    const i = t.toAct, s = t.seats[i], o = options(t);
    if (!o) return t;
    let type = action.type;
    if (type === "check" && !o.canCheck) type = "call";
    if (type === "raise" && !o.canRaise) type = o.canCheck ? "check" : "call";
    if (type === "call" && o.toCall === 0) type = "check";
    if (type === "fold") { s.folded = true; t.log.push({ type: "fold", seat: i }); }
    else if (type === "check") t.log.push({ type: "check", seat: i });
    else if (type === "call") { const n = put(t, i, o.toCall); t.log.push({ type: "call", seat: i, amount: n, allIn: s.allIn }); }
    else {
      put(t, i, o.raiseTo - s.bet);
      const bet = t.currentBet === 0;
      t.currentBet = Math.max(t.currentBet, s.bet);
      t.bets++;
      for (const other of t.seats) if (other !== s) other.acted = false;
      t.log.push({ type: bet ? "bet" : "raise", seat: i, to: s.bet, allIn: s.allIn });
    }
    s.acted = true;
    s.last = type;
    advance(t);
    return t;
  }

  // On to whoever acts next, the next street, or the end of the hand.
  function advance(t) {
    if (t.seats.filter(inHand).length === 1) return finish(t);
    const waiting = t.seats.findIndex((s) => canAct(s) && (!s.acted || s.bet < t.currentBet));
    if (waiting >= 0) { t.toAct = nextSeat(t, t.toAct, (s) => canAct(s) && (!s.acted || s.bet < t.currentBet)); return; }
    nextStreet(t);
  }
  function nextStreet(t) {
    for (const s of t.seats) { s.bet = 0; s.acted = false; s.last = null; }
    t.currentBet = 0; t.bets = 0;
    const k = STREETS.indexOf(t.street) + 1;
    if (k >= STREETS.length) return finish(t);
    t.street = STREETS[k];
    t.board.push(...t.deck.splice(0, k === 1 ? 3 : 1));
    t.log.push({ type: "street", street: t.street });
    t.toAct = nextSeat(t, t.button, canAct);
    settle(t);
  }
  // With fewer than two players able to bet, the rest of the board just comes out.
  function settle(t) {
    if (t.street === "done") return;
    const able = t.seats.filter(canAct);
    const facing = able.filter((s) => s.bet < t.currentBet);
    if (able.length > 1 || facing.length) { if (t.toAct < 0 || !canAct(t.seats[t.toAct])) t.toAct = nextSeat(t, t.toAct, canAct); return; }
    nextStreet(t);
  }

  // The pots (side pots for those all in), each to the best hand eligible for it.
  function finish(t) {
    const contenders = t.seats.map((s, i) => i).filter((i) => inHand(t.seats[i]));
    const hands = {};
    const showdown = contenders.length > 1;
    if (showdown) for (const i of contenders) hands[i] = best(t.seats[i].cards.concat(t.board));
    const levels = [...new Set(t.seats.map((s) => s.total).filter((n) => n > 0))].sort((a, b) => a - b);
    const won = t.seats.map(() => 0);
    const pots = [];
    let prev = 0;
    for (const level of levels) {
      const amount = t.seats.reduce((n, s) => n + Math.max(0, Math.min(s.total, level) - prev), 0);
      const eligible = contenders.filter((i) => t.seats[i].total >= level);
      prev = level;
      if (!amount) continue;
      if (!eligible.length) { pots.push({ amount, winners: [] }); continue; }
      let winners = eligible;
      if (showdown && eligible.length > 1) {
        const top = eligible.reduce((a, i) => (compare(hands[i].score, hands[a].score) > 0 ? i : a), eligible[0]);
        winners = eligible.filter((i) => compare(hands[i].score, hands[top].score) === 0);
      }
      // (The odd coin to the first winner left of the button.)
      const order = winners.slice().sort((a, b) => ((a - t.button - 1 + 64) % t.seats.length) - ((b - t.button - 1 + 64) % t.seats.length));
      const share = Math.floor(amount / winners.length);
      order.forEach((i, k) => { won[i] += share + (k < amount - share * winners.length ? 1 : 0); });
      pots.push({ amount, winners: order });
    }
    // (A pot nobody left can win: back to whoever put it in. Can't happen
    // with folds only, but keeps the chips whole.)
    pots.filter((p) => !p.winners.length).forEach((p) => { const i = contenders[0]; won[i] += p.amount; p.winners = [i]; });
    won.forEach((n, i) => { t.seats[i].chips += n; });
    t.street = "done";
    t.toAct = -1;
    // (Pots with the same winners, as one: the blinds' levels and the like.)
    const merged = [];
    for (const p of pots) {
      const same = merged.find((m) => m.winners.join() === p.winners.join());
      if (same) same.amount += p.amount; else merged.push({ amount: p.amount, winners: p.winners.slice() });
    }
    t.result = { showdown, hands, won, pots: merged, winners: won.map((n, i) => (n > 0 ? i : -1)).filter((i) => i >= 0) };
    t.log.push({ type: "end" });
  }

  // ---------- The regulars ----------

  // Seat `i`'s chance of winning (ties shared) against the others still in,
  // dealing the rest of the hand out `n` times at random.
  function equity(t, i, n, rng) {
    rng = rng || t.rng;
    const me = t.seats[i];
    const others = t.seats.filter((s, j) => j !== i && inHand(s)).length;
    const known = new Set(me.cards.concat(t.board).map((c) => c.rank + c.suit));
    const rest = [];
    for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) if (!known.has(rank + suit)) rest.push({ rank, suit });
    let score = 0;
    for (let k = 0; k < n; k++) {
      // (A partial shuffle: just the cards needed.)
      const need = 5 - t.board.length + 2 * others;
      for (let a = 0; a < need; a++) { const b = a + Math.floor(rng() * (rest.length - a)); [rest[a], rest[b]] = [rest[b], rest[a]]; }
      const board = t.board.concat(rest.slice(0, 5 - t.board.length));
      const mine = best(me.cards.concat(board)).score;
      let lose = false, ties = 0;
      for (let o = 0; o < others && !lose; o++) {
        const at = 5 - t.board.length + 2 * o;
        const c = compare(best(rest.slice(at, at + 2).concat(board)).score, mine);
        if (c > 0) lose = true; else if (c === 0) ties++;
      }
      if (!lose) score += 1 / (ties + 1);
    }
    return score / n;
  }

  // What the regular to act does.
  function decide(t, iterations) {
    const i = t.toAct, s = t.seats[i], o = options(t), rng = t.rng, style = s.style || OPPONENTS[2];
    const players = t.seats.filter(inHand).length;
    const e = equity(t, i, iterations || 250, rng);
    const share = e * players;             // (1: an even share of the chances)
    const odds = o.toCall / (o.pot + o.toCall);
    if (o.canRaise && (share >= style.raise || rng() < style.bluff)) return { type: "raise", equity: e };
    if (o.canCheck) return { type: "check", equity: e };
    if (e >= odds * style.stay || share >= 1.15) return { type: "call", equity: e };
    return { type: "fold", equity: e };
  }

  const RANK_NAMES = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  const cardName = (c) => (RANK_NAMES[c.rank] || String(c.rank)) + { S: "♠", H: "♥", D: "♦", C: "♣" }[c.suit];

  window.Poker = { SUITS, SMALL_BLIND, BIG_BLIND, MAX_BETS, STACK, STREETS, HAND_NAMES, OPPONENTS,
    deck, score5, best, compare, handName, describe, create, startHand, options, act, equity, decide, pot, cardName };
})();
