// The Game Corner's Texas Hold'em table (game/poker.js has the rules).
//
//   const chips = await PokerScreen.run(sceneElement, Poker.create({ chips, name }));   // -> your chips when you leave
//
// The three regulars sit along the top (their chips, what they did last,
// their bet this round, their cards face down until a showdown), the board
// and the pot in the middle, and you at the bottom with your cards and what
// they make so far. Your turn: Fold, Check or Call, Bet or Raise, picked
// with left / right and A (or tapped). Between hands: Next hand or Leave
// the table (B leaves too); with no chips left, only leaving. The regulars
// take a moment over each move.
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
        '<div class="pk-name">' + esc(s.name) + dealer + "</div>" +
        '<div class="pk-chips">' + s.chips + " chips</div>" +
        '<div class="pk-hole">' + (s.cards && s.cards.length ? s.cards.map((c) => card(c, { down: !show })).join("") : card(null) + card(null)) + "</div>" +
        '<div class="pk-status">' + esc(hand ? hand.name : status) + (s.bet ? ' <span class="pk-bet">' + s.bet + "</span>" : "") + "</div>" +
        "</div>";
    }

    function draw() {
      const me = t.seats[0];
      const board = [0, 1, 2, 3, 4].map((k) => card(t.board[k])).join("");
      const mine = me.cards && me.cards.length && !me.folded && t.street !== "done" ? P().describe(me.cards, t.board) : "";
      root.innerHTML = '<div class="dig poker">' +
        '<div class="pk-row">' + t.seats.slice(1).map((s, i) => seatHtml(s, i + 1)).join("") + "</div>" +
        '<div class="pk-middle"><div class="pk-board">' + board + '</div><div class="pk-pot">Pot ' + P().pot(t) +
          (t.street !== "done" ? " · " + { preflop: "Before the flop", flop: "The flop", turn: "The turn", river: "The river" }[t.street] : "") + "</div>" +
          '<div class="pk-message">' + esc(message) + "</div></div>" +
        '<div class="pk-bottom">' + seatHtml(me, 0) + '<div class="pk-actions">' +
          (mine ? '<div class="pk-made">' + esc(mine) + "</div>" : "") +
          buttons.map((b, i) => '<button type="button" class="pk-button' + (i === cursor ? " cursor" : "") + '" data-i="' + i + '">' + esc(b.label) + "</button>").join("") +
        "</div></div></div>";
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
        case "rebuy": return t.seats[ev.seat].name + " buys back in.";
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
      message = name(sb) + " post" + (sb ? "s" : "") + " the small blind, " + name(bb).replace(/^You$/, "you") + " the big blind.";
      t.log = t.log.filter((e) => e.type === "rebuy");
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
        const v = await choose(broke ? [{ label: "Leave the table", value: "leave" }]
          : [{ label: "Next hand", value: "next" }, { label: "Leave the table", value: "leave" }]);
        if (v === "leave") break;
      }
      document.removeEventListener("keydown", onKey);
      root.removeEventListener("click", onClick);
      return t.seats[0].chips;
    })();
  }

  window.PokerScreen = { run };
})();
