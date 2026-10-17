// The Game Corner's Texas Hold'em table (game/poker.js has the rules).
//
//   const chips = await PokerScreen.run(sceneElement, Poker.create({ chips, name }));   // -> your chips when you leave
//
// The three other players (trainers from around the game, each with their
// class's portrait) sit along the top (their chips, what they did last,
// their bet this round, their cards face down until a showdown), the board
// and the pot in the middle with your hand so far ("Your hand: Pair of
// Kings": from the flop on, the best five of your cards and the board's,
// which are outlined in gold), and you at the bottom with your cards. What
// happens, and your choices, are in FireRed's windows under the screen
// (ui/table-ui.js). Your turn: Fold, Check or Call, Bet or Raise, picked with
// the D-pad and A (or tapped). Between hands: Next hand or Leave (B leaves
// too); with no chips left, only leaving. The regulars take a moment over
// each move.
(function () {
  const P = () => window.Poker;
  const RANKS = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  const SUIT = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const esc = (s) => window.Screen.escapeHtml(String(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const AI_DELAY = 700, STREET_DELAY = 600;

  function card(c, opts) {
    opts = opts || {};
    if (!c) return '<div class="pk-card empty"></div>';
    if (opts.down) return '<div class="pk-card back"></div>';
    const red = c.suit === "H" || c.suit === "D";
    return '<div class="pk-card' + (red ? " red" : "") + (opts.win ? " win" : "") + '"><span class="pk-rank">' + (RANKS[c.rank] || c.rank) +
      '</span><span class="pk-suit">' + SUIT[c.suit] + "</span></div>";
  }

  function run(root, t) {
    const se = (id) => { if (window.GameAudio) window.GameAudio.se(id); };
    let buttons = [], cursor = 0, message = "", reveal = false, pick = null;

    function seatHtml(s, i) {
      const t2 = t;
      const dealer = t2.button === i ? '<span class="pk-dealer">D</span>' : "";
      const status = s.out ? "Out" : s.folded ? "Folded" : s.allIn ? "All in" : s.last ? { check: "Check", call: "Call", raise: "Raise", fold: "Fold" }[s.last] : "";
      const show = s.human || (reveal && t2.result && t2.result.showdown && !s.folded);
      const winning = t2.result && t2.result.winners.includes(i);
      const hand = show && t2.result && t2.result.hands[i];
      return '<div class="pk-seat' + (s.human ? " you" : "") + (t2.toAct === i ? " turn" : "") + (s.folded || s.out ? " folded" : "") + (winning ? " won" : "") + '">' +
        (s.pic ? '<img class="pk-portrait" alt="" src="assets/sprites/trainers/front/' + esc(s.pic) + '.png">' : "") +
        '<div class="pk-info"><div class="pk-name">' + esc(s.name) + dealer + "</div>" +
        // (What they did last, or their hand at a showdown, and their bet this round, by their chips.)
        '<div class="pk-chips">' + s.chips + (s.human ? " chips" : "") + (status || hand ? " · " + esc(hand ? hand.name : status) : "") + (s.bet ? ' <span class="pk-bet">' + s.bet + "</span>" : "") + "</div></div>" +
        '<div class="pk-hole">' + (s.cards && s.cards.length ? s.cards.map((c) => card(c, { down: !show, win: inBest(c) })).join("") : card(null) + card(null)) + "</div>" +
        "</div>";
    }

    // Your five-card hand so far (from the flop on, the five cards making it
    // are outlined in gold, yours and the board's).
    let yours = null;
    const inBest = (c) => !!(yours && yours.cards && yours.cards.includes(c));
    function draw() {
      const me = t.seats[0];
      const live = me.cards && me.cards.length && !me.folded && !me.out;
      yours = !live ? null : t.board.length >= 3 ? P().best(me.cards.concat(t.board)) : { name: P().describe(me.cards, t.board) };
      const board = [0, 1, 2, 3, 4].map((k) => card(t.board[k], { win: inBest(t.board[k]) })).join("");
      root.innerHTML = '<div class="dig poker">' +
        '<div class="pk-row">' + t.seats.slice(1).map((s, i) => seatHtml(s, i + 1)).join("") + "</div>" +
        '<div class="pk-middle"><div class="pk-board">' + board + '</div><div class="pk-pot">Pot ' + P().pot(t) +
          (t.street !== "done" ? " · " + { preflop: "Before the flop", flop: "The flop", turn: "The turn", river: "The river" }[t.street] : "") +
          '<span class="pk-stakes">' + esc(t.stakes.name) + " · blinds " + t.sb + "/" + t.bb + "</span></div>" +
          '<div class="pk-yours">' + (yours ? "Your hand: " + esc(yours.name) : me.folded ? "You folded." : "") + "</div></div>" +
        seatHtml(me, 0) + "</div>";
      window.TableUI.panel({ message, items: buttons, cursor, onPick: chosen });
    }

    // Waits for you to pick one of `list` ({ label, value }).
    function choose(list) {
      buttons = list;
      cursor = Math.min(cursor, list.length - 1);
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

    const name = (i) => (i === 0 ? "You" : t.seats[i].name);
    function say(ev) {
      const n = ev.seat != null ? name(ev.seat) : "";
      const you = ev.seat === 0;
      switch (ev.type) {
        case "fold": return n + (you ? " fold." : " folds.");
        case "check": return n + (you ? " check." : " checks.");
        case "call": return n + (you ? " call " : " calls ") + ev.amount + (ev.allIn ? ", all in!" : ".");
        case "bet": return n + (you ? " bet " : " bets ") + ev.to + (ev.allIn ? ", all in!" : ".");
        case "raise": return n + (you ? " raise to " : " raises to ") + ev.to + (ev.allIn ? ", all in!" : ".");
        case "replace": return ev.left + " is out of chips and leaves. " + ev.joined + " sits down.";
        default: return null;
      }
    }
    function report() {
      const lines = t.log.map(say).filter(Boolean);
      t.log = [];
      if (lines.length) message = lines[lines.length - 1];
    }

    async function hand() {
      reveal = false;
      P().startHand(t);
      se("se_ball_tray_ball");
      const [sb, bb] = t.blinds;
      const joined = t.log.filter((e) => e.type === "replace").map(say);
      message = joined.concat([name(sb) + " post" + (sb ? "s" : "") + " the small blind, " + name(bb).replace(/^You$/, "you") + " the big blind."]).join(" ");
      t.log = [];
      draw();
      let street = t.street;
      while (t.street !== "done") {
        if (t.street !== street) { street = t.street; se("se_ball_tray_enter"); draw(); await sleep(STREET_DELAY); }
        if (t.toAct === 0) {
          const o = P().options(t);
          const list = [{ label: "Fold", value: "fold" }, o.canCheck ? { label: "Check", value: "check" } : { label: "Call " + o.call + (o.call < o.toCall ? " (all in)" : ""), value: "call" }];
          if (o.canRaise) list.push({ label: (t.currentBet === 0 ? "Bet " : "Raise to ") + o.raiseTo, value: "raise" });
          cursor = 1;
          const v = await choose(list);
          P().act(t, { type: v });
        } else {
          draw();
          await sleep(t.seats[0].folded ? AI_DELAY / 3 : AI_DELAY);
          P().act(t, P().decide(t));
        }
        report();
        draw();
      }
      // The pot (or pots) to the winners.
      reveal = true;
      const r = t.result;
      const parts = r.pots.map((p) => {
        const who = p.winners.map(name);
        const what = r.showdown ? " with " + r.hands[p.winners[0]].name : "";
        const verb = who.length > 1 ? " split " : who[0] === "You" ? " win " : " wins ";
        return who.join(" and ") + verb + p.amount + what + ".";
      });
      message = parts.join(" ");
      se(r.winners.includes(0) ? "se_shop" : "se_ball_tray_exit");
      draw();
    }

    return (async () => {
      for (;;) {
        await hand();
        const broke = t.seats[0].chips <= 0;
        if (broke) message += " You're out of chips.";
        cursor = 0;
        const v = await choose(broke ? [{ label: "Leave", value: "leave" }]
          : [{ label: "Next hand", value: "next" }, { label: "Leave", value: "leave" }]);
        if (v === "leave") break;
      }
      document.removeEventListener("keydown", onKey);
      window.TableUI.clear();
      return t.seats[0].chips;
    })();
  }

  window.PokerScreen = { run };
})();
