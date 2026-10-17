// Mahjong in the Celadon Game Corner (this game's own): Japanese (riichi)
// mahjong at the mahjong table, you and three trainers (game/table-players.js).
//
// The usual rules, a little trimmed: 136 tiles (no red fives), no kans (four
// of a kind just stay in the hand), an East-only game (each player deals in
// turn; a dealer who wins or is ready at a draw deals again, with a counter,
// honba, worth 300 a win), everyone starting on 25,000 points. Draw a tile,
// discard one; take a discard to finish a set with Pon (a triplet, from
// anyone) or Chi (a run, from the player on your left); win off a discard
// (Ron) or your own draw (Tsumo) with four sets and a pair (or seven pairs,
// or the thirteen orphans), with at least one yaku. With a closed hand one
// tile from winning you can declare Riichi (1,000 points down; you then
// discard what you draw unless it wins). You can't Ron a tile you've
// discarded yourself while waiting on it (furiten); you can still Tsumo.
// Hands score in han (YAKU, plus dora: the tile after the indicator, and for
// Riichi the one under it too) and fu, as usual: 5 han is mangan, 6 haneman,
// 8 baiman, 11 sanbaiman, 13 (or a yakuman) yakuman. A hand drawn out pays
// 3,000 from those not ready to those ready.
//
// Tiles are 0-33: Characters (man) 1-9 (0-8), Dots (pin) 1-9 (9-17), Bamboo (sou) 1-9 (18-26), the winds
// East, South, West, North (27-30) and the dragons White, Green, Red (31-33).
// Seats are 0 (you) to 3 counter-clockwise: 1 on your right plays after you,
// 3 on your left before you (Chi is only from them).
//
//   const g = Mahjong.create({ names, rng });  Mahjong.startHand(g);
//   g.phase: "discard" (g.turn's) | "claim" (g.claims, after g.lastDiscard) | "end" (g.result)
//   Mahjong.discardOptions(g) -> { tsumo, riichi: [tiles], tiles }   Mahjong.discard(g, tile, riichi)  Mahjong.tsumo(g)
//   Mahjong.claim(g, seat, { type: "ron" | "pon" | "chi", tiles } | null)   (each seat in g.claims answers)
//   Mahjong.aiTurn(g) / Mahjong.aiClaim(g, seat)   the others' moves
(function () {
  const WINDS = ["East", "South", "West", "North"];
  const isHonor = (t) => t >= 27;
  const isTerminal = (t) => t < 27 && (t % 9 === 0 || t % 9 === 8);
  const isYaochu = (t) => isHonor(t) || isTerminal(t);
  const suitOf = (t) => (t < 27 ? Math.floor(t / 9) : 3);
  const numOf = (t) => t % 9 + 1;
  const YAOCHU = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
  const GREEN = new Set([19, 20, 21, 23, 25, 32]);   // (sou 2, 3, 4, 6, 8 and Green: Ryuuiisou)
  const NAMES = (() => {
    const out = [];
    // (In English: man are Characters, pin Dots and sou Bamboo.)
    for (const suit of ["Characters", "Dots", "Bamboo"]) for (let i = 1; i <= 9; i++) out.push(i + " of " + suit);
    return out.concat(["East", "South", "West", "North", "White Dragon", "Green Dragon", "Red Dragon"]);
  })();
  const doraOf = (ind) => (ind < 27 ? Math.floor(ind / 9) * 9 + (ind % 9 + 1) % 9 : ind < 31 ? 27 + (ind - 27 + 1) % 4 : 31 + (ind - 31 + 1) % 3);

  const countsOf = (tiles) => { const c = new Array(34).fill(0); for (const t of tiles) c[t]++; return c; };

  // ---------- Shanten (how many tiles from ready; -1: complete) ----------

  function shantenStandard(c, melds) {
    let best = 8;
    const need = 4 - melds;
    const rec = (i, sets, part, pair) => {
      while (i < 34 && !c[i]) i++;
      if (i >= 34) {
        const s = Math.min(sets, need), p = Math.min(part, need - s);
        best = Math.min(best, 8 - 2 * (s + melds) - p - pair);
        return;
      }
      // a set
      if (c[i] >= 3) { c[i] -= 3; rec(i, sets + 1, part, pair); c[i] += 3; }
      if (i < 27 && i % 9 <= 6 && c[i + 1] && c[i + 2]) { c[i]--; c[i + 1]--; c[i + 2]--; rec(i, sets + 1, part, pair); c[i]++; c[i + 1]++; c[i + 2]++; }
      // the pair
      if (!pair && c[i] >= 2) { c[i] -= 2; rec(i, sets, part, 1); c[i] += 2; }
      // partial sets
      if (c[i] >= 2) { c[i] -= 2; rec(i, sets, part + 1, pair); c[i] += 2; }
      if (i < 27 && i % 9 <= 7 && c[i + 1]) { c[i]--; c[i + 1]--; rec(i, sets, part + 1, pair); c[i]++; c[i + 1]++; }
      if (i < 27 && i % 9 <= 6 && c[i + 2]) { c[i]--; c[i + 2]--; rec(i, sets, part + 1, pair); c[i]++; c[i + 2]++; }
      // or leave it
      const k = c[i]; c[i] = 0; rec(i + 1, sets, part, pair); c[i] = k;
    };
    rec(0, 0, 0, 0);
    return best;
  }
  function shanten(tiles, melds) {
    const c = countsOf(tiles);
    let s = shantenStandard(c, melds || 0);
    if (!melds) {
      const kinds = c.filter((n) => n > 0).length, pairs = c.filter((n) => n >= 2).length;
      s = Math.min(s, 6 - pairs + Math.max(0, 7 - kinds));
      const yao = YAOCHU.filter((t) => c[t]).length, yaoPair = YAOCHU.some((t) => c[t] >= 2) ? 1 : 0;
      s = Math.min(s, 13 - yao - yaoPair);
    }
    return s;
  }
  // The tiles that complete a 13 (or 10, 7...) tile hand.
  function waits(tiles, melds) {
    const out = [], c = countsOf(tiles);
    for (let t = 0; t < 34; t++) {
      if (c[t] >= 4) continue;
      if (shanten(tiles.concat([t]), melds) === -1) out.push(t);
    }
    return out;
  }

  // ---------- Winning hands ----------

  // Every way 14 (less 3 a meld) tiles split into sets and a pair: [{ pair, sets: [{ kind: "seq" | "trip", t }] }].
  function decompositions(tiles) {
    const c = countsOf(tiles), out = [];
    const rec = (i, sets, pair) => {
      while (i < 34 && !c[i]) i++;
      if (i >= 34) { if (pair != null) out.push({ pair, sets: sets.slice() }); return; }
      if (pair == null && c[i] >= 2) { c[i] -= 2; rec(i, sets, i); c[i] += 2; }
      if (c[i] >= 3) { c[i] -= 3; sets.push({ kind: "trip", t: i }); rec(i, sets, pair); sets.pop(); c[i] += 3; }
      if (i < 27 && i % 9 <= 6 && c[i + 1] && c[i + 2]) {
        c[i]--; c[i + 1]--; c[i + 2]--; sets.push({ kind: "seq", t: i }); rec(i, sets, pair); sets.pop(); c[i]++; c[i + 1]++; c[i + 2]++;
      }
    };
    rec(0, [], null);
    return out;
  }
  const isChiitoi = (tiles) => tiles.length === 14 && countsOf(tiles).filter((n) => n === 2).length === 7;
  const isKokushi = (tiles) => { const c = countsOf(tiles); return tiles.length === 14 && YAOCHU.every((t) => c[t]) && YAOCHU.some((t) => c[t] === 2); };

  // The han each yaku is worth: [closed, open] (0: not open).
  const YAKU = {
    riichi: ["Riichi", 1, 0], ippatsu: ["Ippatsu", 1, 0], tsumo: ["Menzen Tsumo", 1, 0], pinfu: ["Pinfu", 1, 0],
    tanyao: ["Tanyao", 1, 1], iipeikou: ["Iipeikou", 1, 0], haitei: ["Haitei", 1, 1], houtei: ["Houtei", 1, 1],
    chanta: ["Chanta", 2, 1], ittsu: ["Ittsu", 2, 1], sanshoku: ["Sanshoku Doujun", 2, 1], toitoi: ["Toitoi", 2, 2],
    sanankou: ["Sanankou", 2, 2], sanshokuDoukou: ["Sanshoku Doukou", 2, 2], shousangen: ["Shousangen", 2, 2],
    honroutou: ["Honroutou", 2, 2], chiitoitsu: ["Chiitoitsu", 2, 0], honitsu: ["Honitsu", 3, 2], junchan: ["Junchan", 3, 2],
    ryanpeikou: ["Ryanpeikou", 3, 0], chinitsu: ["Chinitsu", 6, 5]
  };
  const YAKUMAN = { kokushi: "Kokushi Musou", suuankou: "Suuankou", daisangen: "Daisangen", shousuushii: "Shousuushii",
    daisuushii: "Daisuushii", tsuuiisou: "Tsuuiisou", ryuuiisou: "Ryuuiisou", chinroutou: "Chinroutou", chuuren: "Chuuren Poutou" };

  // A winning hand's best score. hand: { tiles (concealed, the winning tile included), melds: [{ kind, t, open }] },
  // ctx: { win (the tile), tsumo, riichi, ippatsu, seatWind, roundWind (27-30), dora: [tiles], ura: [tiles], last, dealer }
  // -> { yaku: [[name, han]], han, fu, yakuman, base, name } or null (no yaku).
  function score(hand, ctx) {
    const closed = !hand.melds.some((m) => m.open);
    const all = hand.tiles.concat(hand.melds.flatMap((m) => (m.kind === "seq" ? [m.t, m.t + 1, m.t + 2] : [m.t, m.t, m.t])));
    const cAll = countsOf(all);
    const dora = ctx.dora.reduce((n, ind) => n + cAll[doraOf(ind)], 0) + (ctx.riichi ? (ctx.ura || []).reduce((n, ind) => n + cAll[doraOf(ind)], 0) : 0);
    const candidates = [];
    const common = (yaku) => {
      if (ctx.riichi) yaku.push("riichi");
      if (ctx.riichi && ctx.ippatsu) yaku.push("ippatsu");
      if (closed && ctx.tsumo) yaku.push("tsumo");
      if (ctx.last) yaku.push(ctx.tsumo ? "haitei" : "houtei");
      if (all.every((t) => !isYaochu(t))) yaku.push("tanyao");
      const suits = new Set(all.map(suitOf));
      const honors = suits.has(3);
      suits.delete(3);
      if (suits.size === 1 && !honors) yaku.push("chinitsu");
      else if (suits.size === 1) yaku.push("honitsu");
      if (all.every(isYaochu) && all.some(isHonor) && all.some(isTerminal)) yaku.push("honroutou");
    };
    const yakumanOf = (sets, pair) => {
      const out = [];
      if (all.every(isHonor)) out.push("tsuuiisou");
      if (all.every((t) => GREEN.has(t))) out.push("ryuuiisou");
      if (all.every(isTerminal)) out.push("chinroutou");
      if (sets) {
        const trips = sets.filter((s) => s.kind === "trip").map((s) => s.t);
        if ([31, 32, 33].every((t) => trips.includes(t))) out.push("daisangen");
        const windTrips = [27, 28, 29, 30].filter((t) => trips.includes(t)).length;
        if (windTrips === 4) out.push("daisuushii");
        else if (windTrips === 3 && pair >= 27 && pair <= 30) out.push("shousuushii");
        if (sets.filter((s) => s.kind === "trip" && s.concealed).length === 4) out.push("suuankou");
        if (closed && !hand.melds.length) {
          const c = countsOf(hand.tiles), suit = suitOf(hand.tiles[0]);
          if (suit < 3 && hand.tiles.every((t) => suitOf(t) === suit)) {
            const base = [3, 1, 1, 1, 1, 1, 1, 1, 3];
            if (base.every((n, i) => c[suit * 9 + i] >= n)) out.push("chuuren");
          }
        }
      }
      return out;
    };
    const finish = (yaku, fu, yakuman) => {
      if (yakuman.length) return { yaku: yakuman.map((k) => [YAKUMAN[k], 13]), han: 13 * yakuman.length, fu, yakuman: yakuman.length };
      // (Stronger yaku replace weaker ones.)
      const has = (k) => yaku.includes(k);
      let list = yaku.filter((k) => !(k === "iipeikou" && has("ryanpeikou")) && !(k === "chanta" && (has("junchan") || has("honroutou"))));
      if (has("ryanpeikou")) list = list.filter((k) => k !== "chiitoitsu");
      const named = list.map((k) => [YAKU[k] ? YAKU[k][0] : k, YAKU[k] ? (closed ? YAKU[k][1] : YAKU[k][2]) : 1]).filter((y) => y[1] > 0);
      if (!named.length) return null;
      if (dora) named.push(["Dora", dora]);
      return { yaku: named, han: named.reduce((n, y) => n + y[1], 0), fu, yakuman: 0 };
    };
    // Thirteen orphans; seven pairs.
    if (!hand.melds.length && isKokushi(hand.tiles)) candidates.push(finish([], 0, ["kokushi"]));
    if (!hand.melds.length && isChiitoi(hand.tiles)) {
      const yaku = ["chiitoitsu"];
      common(yaku);
      candidates.push(finish(yaku, 25, yakumanOf(null)));
    }
    // Four sets and a pair, each way the hand splits, and each set the winning tile could have finished.
    for (const d of decompositions(hand.tiles)) {
      const sets = d.sets.map((s) => Object.assign({ concealed: s.kind === "trip" }, s))
        .concat(hand.melds.map((m) => ({ kind: m.kind, t: m.t, open: true, concealed: false })));
      const spots = [];
      d.sets.forEach((s, i) => {
        if (s.kind === "trip" ? s.t === ctx.win : ctx.win >= s.t && ctx.win <= s.t + 2) spots.push(i);
      });
      const tries = spots.map((i) => ({ set: i })).concat(d.pair === ctx.win ? [{ pair: true }] : []);
      for (const w of tries) {
        const ss = sets.map((s) => Object.assign({}, s));
        // (A triplet finished off another's discard isn't concealed.)
        if (w.set != null && ss[w.set].kind === "trip" && !ctx.tsumo) ss[w.set].concealed = false;
        let wait = "tanki";
        if (w.set != null) {
          const s = ss[w.set];
          if (s.kind === "trip") wait = "shanpon";
          else if (ctx.win === s.t + 1) wait = "kanchan";
          else if ((ctx.win === s.t && numOf(s.t) === 7) || (ctx.win === s.t + 2 && numOf(s.t) === 1)) wait = "penchan";
          else wait = "ryanmen";
        }
        const yakuman = yakumanOf(ss, d.pair);
        const yaku = [];
        common(yaku);
        const seqs = ss.filter((s) => s.kind === "seq"), trips = ss.filter((s) => s.kind === "trip");
        const yakuhaiPair = d.pair >= 31 || d.pair === ctx.seatWind || d.pair === ctx.roundWind;
        const pinfu = closed && trips.length === 0 && !yakuhaiPair && wait === "ryanmen";
        if (pinfu) yaku.push("pinfu");
        // Yakuhai: each dragon triplet, the seat wind's and the round's.
        for (const s of trips) {
          if (s.t >= 31) yaku.push(NAMES[s.t]);
          if (s.t === ctx.seatWind) yaku.push("Seat wind " + WINDS[s.t - 27]);
          if (s.t === ctx.roundWind) yaku.push("Round wind " + WINDS[s.t - 27]);
        }
        if (closed) {
          const keys = seqs.map((s) => s.t).sort((a, b) => a - b), dup = {};
          for (const k of keys) dup[k] = (dup[k] || 0) + 1;
          const pairsOfSeqs = Object.values(dup).reduce((n, v) => n + Math.floor(v / 2), 0);
          if (pairsOfSeqs === 2) yaku.push("ryanpeikou"); else if (pairsOfSeqs === 1) yaku.push("iipeikou");
        }
        const groups = ss.map((s) => (s.kind === "seq" ? [s.t, s.t + 1, s.t + 2] : [s.t])).concat([[d.pair]]);
        if (seqs.length && groups.every((g) => g.some(isYaochu))) yaku.push(all.some(isHonor) ? "chanta" : "junchan");
        for (const suit of [0, 1, 2]) if ([0, 3, 6].every((k) => seqs.some((s) => s.t === suit * 9 + k))) yaku.push("ittsu");
        for (let n = 0; n < 7; n++) if ([0, 1, 2].every((suit) => seqs.some((s) => s.t === suit * 9 + n))) { yaku.push("sanshoku"); break; }
        for (let n = 0; n < 9; n++) if ([0, 1, 2].every((suit) => trips.some((s) => s.t === suit * 9 + n))) { yaku.push("sanshokuDoukou"); break; }
        if (trips.length === 4) yaku.push("toitoi");
        if (trips.filter((s) => s.concealed).length === 3) yaku.push("sanankou");
        if (trips.filter((s) => s.t >= 31).length === 2 && d.pair >= 31) yaku.push("shousangen");
        // Fu.
        let fu = 20;
        if (pinfu) fu = ctx.tsumo ? 20 : 30;
        else {
          if (closed && !ctx.tsumo) fu += 10;
          if (ctx.tsumo) fu += 2;
          for (const s of trips) fu += (isYaochu(s.t) ? 4 : 2) * (s.concealed ? 2 : 1);
          if (d.pair >= 31) fu += 2;
          if (d.pair === ctx.seatWind) fu += 2;
          if (d.pair === ctx.roundWind) fu += 2;
          if (["kanchan", "penchan", "tanki"].includes(wait)) fu += 2;
          fu = Math.ceil(fu / 10) * 10;
          if (fu === 20) fu = 30;   // (an open hand with nothing more)
        }
        candidates.push(finish(yaku, fu, yakuman));
      }
    }
    const valid = candidates.filter(Boolean).map((r) => Object.assign(r, basePoints(r)));
    if (!valid.length) return null;
    return valid.reduce((a, b) => (b.base > a.base || (b.base === a.base && b.han > a.han) ? b : a));
  }
  // The base points (and the limit's name) for han and fu.
  function basePoints(r) {
    const { han, fu, yakuman } = r;
    if (yakuman) return { base: 8000 * yakuman, name: yakuman > 1 ? yakuman + "x Yakuman" : "Yakuman" };
    if (han >= 13) return { base: 8000, name: "Kazoe Yakuman" };
    if (han >= 11) return { base: 6000, name: "Sanbaiman" };
    if (han >= 8) return { base: 4000, name: "Baiman" };
    if (han >= 6) return { base: 3000, name: "Haneman" };
    const base = fu * Math.pow(2, han + 2);
    if (han >= 5 || base >= 2000) return { base: 2000, name: "Mangan" };
    return { base, name: null };
  }
  const up100 = (n) => Math.ceil(n / 100) * 100;

  // ---------- The table ----------

  function create(opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const names = opts.names || ["You", "Player 2", "Player 3", "Player 4"];
    return { rng, players: names.map((name, i) => ({ name, points: opts.points || 25000, human: i === 0 })),
      round: 27, dealer: 0, hand: 0, honba: 0, sticks: 0, over: false, phase: "idle", log: [] };
  }
  const seatWind = (g, i) => 27 + ((i - g.dealer + 4) % 4);

  function startHand(g) {
    const rng = g.rng;
    const wall = [];
    for (let t = 0; t < 34; t++) for (let k = 0; k < 4; k++) wall.push(t);
    for (let i = wall.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [wall[i], wall[j]] = [wall[j], wall[i]]; }
    g.dead = wall.splice(wall.length - 14, 14);
    g.dora = [g.dead[4]];
    g.ura = [g.dead[5]];
    g.wall = wall;
    for (const p of g.players) Object.assign(p, { hand: [], melds: [], river: [], riichi: false, riichiAt: -1, ippatsu: false, called: [], furiten: false, tempFuriten: false, riichiFuriten: false, drawn: null });
    for (let r = 0; r < 13; r++) for (let k = 0; k < 4; k++) g.players[(g.dealer + k) % 4].hand.push(g.wall.shift());
    for (const p of g.players) sortHand(p.hand);
    g.turn = g.dealer;
    g.result = null;
    g.claims = null;
    g.log = [{ type: "start", dealer: g.dealer, round: g.round, hand: g.hand, honba: g.honba }];
    draw(g);
    return g;
  }
  const sortHand = (h) => h.sort((a, b) => a - b);
  // The player to move draws.
  function draw(g) {
    const p = g.players[g.turn];
    if (!g.wall.length) return exhaustive(g);
    p.drawn = g.wall.shift();
    p.hand.push(p.drawn);
    p.tempFuriten = false;
    g.phase = "discard";
    g.log.push({ type: "draw", seat: g.turn });
    return g;
  }

  const ctxFor = (g, i, win, tsumo) => {
    const p = g.players[i];
    return { win, tsumo, riichi: p.riichi, ippatsu: p.ippatsu, seatWind: seatWind(g, i), roundWind: g.round,
      dora: g.dora, ura: g.ura, last: !g.wall.length, dealer: i === g.dealer };
  };
  const melds = (p) => p.melds.map((m) => ({ kind: m.kind, t: m.t, open: true }));

  // What the player to discard can do: Tsumo (with a yaku), Riichi (and which discards keep them ready), which tiles.
  function discardOptions(g) {
    if (g.phase !== "discard") return null;
    const p = g.players[g.turn];
    // (No Tsumo straight after a call: nothing was drawn.)
    const won = p.drawn != null && shanten(p.hand, p.melds.length) === -1 && score({ tiles: p.hand, melds: melds(p) }, ctxFor(g, g.turn, p.drawn, true));
    const riichi = [];
    if (!p.riichi && !p.melds.length && p.points >= 1000 && g.wall.length >= 4) {
      for (const t of new Set(p.hand)) {
        const rest = p.hand.slice(); rest.splice(rest.indexOf(t), 1);
        if (shanten(rest, 0) === 0) riichi.push(t);
      }
    }
    // (In Riichi, the tile drawn goes, unless it wins.)
    const tiles = p.riichi ? [p.drawn] : [...new Set(p.hand)];
    return { tsumo: !!won, score: won || null, riichi, tiles };
  }

  function discard(g, tile, riichi) {
    const o = discardOptions(g);
    if (!o || !o.tiles.includes(tile) || (riichi && !o.riichi.includes(tile))) return g;
    const i = g.turn, p = g.players[i];
    p.hand.splice(p.hand.lastIndexOf(tile), 1);
    sortHand(p.hand);
    p.drawn = null;
    if (p.ippatsu && !riichi) p.ippatsu = false;
    if (riichi) { p.riichi = true; p.ippatsu = true; p.points -= 1000; g.sticks++; p.riichiAt = p.river.length; }
    p.river.push(tile);
    g.lastDiscard = { seat: i, tile };
    g.log.push({ type: "discard", seat: i, tile, riichi: !!riichi });
    // (Your own discards: if you're waiting on any of them, no Ron; in Riichi,
    // passing up a Ron is furiten for good.)
    p.furiten = (p.riichi && p.riichiFuriten) || waits(p.hand, p.melds.length).some((t) => p.river.includes(t));
    // Who could take it.
    g.claims = {};
    for (let k = 1; k < 4; k++) {
      const j = (i + k) % 4, q = g.players[j], opts = [];
      const hand = q.hand.concat([tile]);
      if (!q.furiten && !q.tempFuriten && shanten(hand, q.melds.length) === -1) {
        const s = score({ tiles: hand, melds: melds(q) }, ctxFor(g, j, tile, false));
        if (s) opts.push({ type: "ron", score: s });
      }
      if (!q.riichi && g.wall.length) {
        if (q.hand.filter((t) => t === tile).length >= 2) opts.push({ type: "pon", tiles: [tile, tile] });
        if (k === 1 && tile < 27) {
          const n = numOf(tile), has = (x) => q.hand.includes(x);
          for (const [a, b] of [[-2, -1], [-1, 1], [1, 2]]) {
            if (n + a >= 1 && n + b <= 9 && has(tile + a) && has(tile + b)) opts.push({ type: "chi", tiles: [tile + a, tile + b] });
          }
        }
      }
      if (opts.length) g.claims[j] = { options: opts, answer: undefined };
    }
    if (!Object.keys(g.claims).length) return nextTurn(g);
    g.phase = "claim";
    return g;
  }

  // A seat answers the claim it was offered (null: passes).
  function claim(g, seat, choice) {
    if (g.phase !== "claim" || !g.claims[seat]) return g;
    g.claims[seat].answer = choice || null;
    // (Passing a Ron: no Ron until your next turn.)
    if (!choice && g.claims[seat].options.some((o) => o.type === "ron")) {
      const q = g.players[seat];
      q.tempFuriten = true;
      if (q.riichi) q.riichiFuriten = q.furiten = true;
    }
    if (Object.values(g.claims).some((c) => c.answer === undefined)) return g;
    // Ron first (the first after the discarder), then Pon, then Chi.
    const order = [1, 2, 3].map((k) => (g.lastDiscard.seat + k) % 4);
    const ron = order.find((j) => g.claims[j] && g.claims[j].answer && g.claims[j].answer.type === "ron");
    if (ron != null) return win(g, ron, g.lastDiscard.seat, g.lastDiscard.tile);
    const pon = order.find((j) => g.claims[j] && g.claims[j].answer && g.claims[j].answer.type === "pon");
    const chi = order.find((j) => g.claims[j] && g.claims[j].answer && g.claims[j].answer.type === "chi");
    const j = pon != null ? pon : chi;
    if (j == null) return nextTurn(g);
    const a = g.claims[j].answer, q = g.players[j], tile = g.lastDiscard.tile;
    for (const t of a.tiles) q.hand.splice(q.hand.indexOf(t), 1);
    const set = a.tiles.concat([tile]).sort((x, y) => x - y);
    q.melds.push({ kind: a.type === "pon" ? "trip" : "seq", t: set[0], tiles: set, called: tile, from: g.lastDiscard.seat });
    g.players[g.lastDiscard.seat].called.push(g.players[g.lastDiscard.seat].river.length - 1);
    // (A call ends everyone's Ippatsu.)
    for (const p of g.players) p.ippatsu = false;
    g.log.push({ type: a.type, seat: j, tile, from: g.lastDiscard.seat });
    g.claims = null;
    g.turn = j;
    q.drawn = null;
    g.phase = "discard";
    return g;
  }
  function nextTurn(g) {
    g.claims = null;
    g.turn = (g.turn + 1) % 4;
    return draw(g);
  }

  function tsumo(g) {
    const o = discardOptions(g);
    if (!o || !o.tsumo) return g;
    return win(g, g.turn, null, g.players[g.turn].drawn);
  }

  // A win: the payments (honba and Riichi sticks to the winner), then the next hand.
  function win(g, w, from, tile) {
    const p = g.players[w];
    const tiles = from == null ? p.hand.slice() : p.hand.concat([tile]);
    const s = score({ tiles, melds: melds(p) }, ctxFor(g, w, tile, from == null));
    const pay = [0, 0, 0, 0];
    const dealer = w === g.dealer;
    if (from != null) {
      const total = up100(s.base * (dealer ? 6 : 4)) + 300 * g.honba;
      pay[from] -= total; pay[w] += total;
    } else {
      for (let k = 0; k < 4; k++) {
        if (k === w) continue;
        const each = up100(s.base * (dealer || k === g.dealer ? 2 : 1)) + 100 * g.honba;
        pay[k] -= each; pay[w] += each;
      }
    }
    pay[w] += 1000 * g.sticks;
    g.sticks = 0;
    pay.forEach((n, k) => { g.players[k].points += n; });
    g.result = { type: from == null ? "tsumo" : "ron", winner: w, from, tile, tiles: sortHand(tiles.slice()), melds: p.melds, score: s, pay };
    g.log.push({ type: "win", seat: w, from, tile });
    return endHand(g, dealer);
  }
  // Out of tiles: 3,000 from those not ready to those ready.
  function exhaustive(g) {
    const ready = g.players.map((p) => shanten(p.hand, p.melds.length) === 0);
    const n = ready.filter(Boolean).length, pay = [0, 0, 0, 0];
    if (n > 0 && n < 4) g.players.forEach((p, k) => { pay[k] = ready[k] ? 3000 / n : -3000 / (4 - n); });
    pay.forEach((x, k) => { g.players[k].points += x; });
    g.result = { type: "draw", ready, pay };
    g.log.push({ type: "exhaustive" });
    return endHand(g, ready[g.dealer]);
  }
  function endHand(g, dealerStays) {
    g.phase = "end";
    if (dealerStays) g.honba++;
    else {
      g.honba = g.result.type === "draw" ? g.honba + 1 : 0;
      g.dealer = (g.dealer + 1) % 4;
      g.hand++;
    }
    // (East only: over once each has dealt; or when anyone's below zero.)
    g.over = g.hand >= 4 || g.players.some((p) => p.points < 0);
    return g;
  }

  // ---------- The others ----------

  // How useful each tile left is: the tiles (by kind) that would bring the hand closer.
  function ukeire(tiles, meldCount, seen) {
    const s = shanten(tiles, meldCount);
    let n = 0;
    for (let t = 0; t < 34; t++) {
      const left = 4 - seen[t];
      if (left <= 0) continue;
      if (shanten(tiles.concat([t]), meldCount) < s) n += left;
    }
    return n;
  }
  function seenTiles(g, i) {
    const seen = new Array(34).fill(0);
    for (const t of g.players[i].hand) seen[t]++;
    for (const p of g.players) { for (const t of p.river) seen[t]++; for (const m of p.melds) for (const t of m.tiles) seen[t]++; }
    for (const t of g.dora) seen[t]++;
    return seen;
  }
  // Its move: Tsumo if it can; else the discard that leaves it closest to winning (the most
  // tiles that help, then the least useful tile), Riichi when ready and closed; once
  // someone else is in Riichi and it's far off, the safest tile it has.
  function aiTurn(g) {
    const i = g.turn, p = g.players[i], o = discardOptions(g);
    if (o.tsumo) return tsumo(g);
    if (p.riichi) return discard(g, p.drawn, false);
    const seen = seenTiles(g, i);
    const threat = g.players.find((q, k) => k !== i && q.riichi);
    let best = null;
    for (const t of o.tiles) {
      const rest = p.hand.slice(); rest.splice(rest.indexOf(t), 1);
      const s = shanten(rest, p.melds.length);
      const u = ukeire(rest, p.melds.length, seen);
      // (Lone honors and terminals go first; dora stay.)
      const keep = (isHonor(t) ? 0 : isTerminal(t) ? 1 : 2) + (g.dora.some((d) => doraOf(d) === t) ? 5 : 0);
      let danger = 0;
      if (threat && s >= 1) danger = threat.river.includes(t) ? 0 : isHonor(t) && seen[t] >= 3 ? 1 : 10;
      const key = [danger, s, -u, keep];
      if (!best || compareKeys(key, best.key) < 0) best = { t, key, s };
    }
    const riichi = o.riichi.includes(best.t) && best.s === 0;
    return discard(g, best.t, riichi);
  }
  const compareKeys = (a, b) => { for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] - b[k]; return 0; };
  // Its answer to a claim: Ron always; Pon of a dragon or its own or the round's wind (a yaku);
  // otherwise Pon or Chi only for an all-simples hand (Tanyao) when it brings it closer.
  function aiClaim(g, seat) {
    const c = g.claims[seat], q = g.players[seat], tile = g.lastDiscard.tile;
    const ron = c.options.find((o) => o.type === "ron");
    if (ron) return claim(g, seat, ron);
    const s = shanten(q.hand, q.melds.length);
    for (const o of c.options) {
      const rest = q.hand.slice(); for (const t of o.tiles) rest.splice(rest.indexOf(t), 1);
      // (After the call it discards one: the best it could be then.)
      const after = Math.min(...[...new Set(rest)].map((t) => { const r = rest.slice(); r.splice(r.indexOf(t), 1); return shanten(r, q.melds.length + 1); }));
      const yakuhai = o.type === "pon" && (tile >= 31 || tile === seatWind(g, seat) || tile === g.round);
      const tanyao = !isYaochu(tile) && q.hand.concat(q.melds.flatMap((m) => m.tiles)).filter(isYaochu).length <= 1;
      if ((yakuhai || tanyao) && after < s) return claim(g, seat, o);
    }
    return claim(g, seat, null);
  }

  const tileName = (t) => NAMES[t];
  window.Mahjong = { WINDS, NAMES, YAKU, YAKUMAN, tileName, doraOf, isHonor, isTerminal, countsOf, shanten, waits, decompositions, score, basePoints,
    create, startHand, discardOptions, discard, claim, tsumo, aiTurn, aiClaim, seatWind };
})();
