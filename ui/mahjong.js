// The Game Corner's mahjong table (game/mahjong.js has the rules).
//
//   const points = await MahjongScreen.run(sceneElement, game, { pics });   // -> your points when you leave (null: you quit with Select)
//
// You at the bottom, the others along the top (to your left, across and to your right), each
// with their portrait (their trainer class's front picture), name, seat wind,
// points, the tiles they've called and their discards (a Riichi discard
// marked red); in the middle the round, the counters, the tiles left and the
// dora indicator. Your hand along the bottom, the tile you drew set apart.
// Your turn: left / right and A (or tap) to discard; Tsumo and Riichi when
// you can (Riichi first, then the discard). Another's discard you can take:
// Ron, Pon, Chi or Pass. Those choices, and what's happening, are in
// FireRed's windows under the screen (ui/table-ui.js). After a hand: the
// winning hand, its yaku, han and fu and who paid what; then Next hand or
// Leave (B).
(function () {
  const M = () => window.Mahjong;
  const esc = (s) => window.Screen.escapeHtml(String(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const AI_MS = 450;
  const WIND_KANJI = ["E", "S", "W", "N"];

  // A tile picture from assets/mahjong/tiles.png (60x80 each, the back last).
  function tile(t, opts) {
    opts = opts || {};
    const k = t == null || opts.back ? 34 : t;
    // (A suited tile's number in its corner: data-n, coloured by its suit, data-s.)
    const num = k < 27 ? ' data-n="' + (k % 9 + 1) + '" data-s="' + Math.floor(k / 9) + '"' : "";
    return '<span class="mj-tile' + (opts.small ? " small" : "") + (opts.cls ? " " + opts.cls : "") + '" style="--k:' + k + '"' + num +
      (opts.i != null ? ' data-i="' + opts.i + '"' : "") + (opts.title !== false && t != null && !opts.back ? ' title="' + esc(M().tileName(t)) + '"' : "") + "></span>";
  }

  function run(root, g, opts) {
    opts = opts || {};
    const pics = opts.pics || [];
    const se = (id) => { if (window.GameAudio) window.GameAudio.se(id); };
    let items = [], cursor = 0, pick = null, message = "", riichiMode = false, detail = null;

    function playerHtml(i) {
      const p = g.players[i];
      const wind = WIND_KANJI[M().seatWind(g, i) - 27];
      const river = p.river.map((t, k) => tile(t, { small: true, cls: (k === p.riichiAt ? "riichi" : "") + (p.called.includes(k) ? " called" : "") })).join("");
      const meldsHtml = p.melds.map((m) => '<span class="mj-meld">' + m.tiles.map((t) => tile(t, { small: true })).join("") + "</span>").join("");
      const showHand = g.phase === "end" && g.result && (g.result.winner === i || (g.result.type === "draw" && g.result.ready[i]));
      // (The others' hands only when they're shown, after a hand: a winner's, or those ready at a draw.)
      const hidden = i === 0 || !showHand ? "" : '<div class="mj-hidden">' + p.hand.map((t) => tile(t, { small: true })).join("") + "</div>";
      return '<div class="mj-player p' + i + (g.turn === i && g.phase !== "end" ? " turn" : "") + '">' +
        '<div class="mj-head">' + (pics[i] ? '<img class="pk-portrait" alt="" src="assets/sprites/trainers/front/' + esc(pics[i]) + '.png">' : "") +
          '<div class="pk-info"><div class="pk-name">' + esc(p.name) + "</div>" +
          '<div class="pk-chips"><span class="mj-wind' + (wind === "E" ? " dealer" : "") + '">' + { E: "East", S: "South", W: "West", N: "North" }[wind] + "</span> " +
            p.points.toLocaleString("en-US") + (p.riichi ? ' <span class="mj-stick">Riichi</span>' : "") + "</div></div></div>" +
        hidden + (meldsHtml ? '<div class="mj-melds">' + meldsHtml + "</div>" : "") + '<div class="mj-river">' + river + "</div></div>";
    }

    function draw() {
      const me = g.players[0];
      const o = g.phase === "discard" && g.turn === 0 ? M().discardOptions(g) : null;
      // Your hand: the tile drawn set apart at the end.
      const hand = me.hand.slice();
      let drawnAt = -1;
      if (me.drawn != null && g.turn === 0 && g.phase === "discard") { hand.splice(hand.lastIndexOf(me.drawn), 1); hand.push(me.drawn); drawnAt = hand.length - 1; }
      const handItems = items.filter((it) => it.tile != null);
      const handHtml = hand.map((t, k) => {
        const it = handItems.findIndex((h) => h.slot === k);
        const ok = it >= 0;
        return tile(t, { i: ok ? items.indexOf(handItems[it]) : null, cls: (k === drawnAt ? "drawn" : "") + (ok ? " pickable" : o ? " blocked" : "") +
          (ok && items.indexOf(handItems[it]) === cursor ? " cursor" : "") + (detail && detail.win === t && g.result && g.result.winner === 0 ? " win" : "") });
      }).join("");
      // In Riichi: the tiles you're waiting on, and how many of each could still be out there (four, less
      // those you can see: your hand, everyone's discards and called sets, the dora indicators).
      const seen = M().countsOf(me.hand.concat(g.dora || [], ...g.players.map((p) => p.river.filter((t, k) => !p.called.includes(k))),
        ...g.players.map((p) => p.melds.flatMap((m) => m.tiles))));
      const waitList = (closed) => M().waits(closed, me.melds.length).map((t) => '<span class="mj-wait">' + tile(t, { small: true }) +
        "×" + Math.max(0, 4 - seen[t]) + "</span>").join("");
      let waitsHtml = "";
      if (me.riichi && g.phase !== "end") {
        const closed = me.hand.slice();
        if (me.drawn != null && g.turn === 0 && g.phase === "discard") closed.splice(closed.lastIndexOf(me.drawn), 1);
        waitsHtml = '<span class="mj-waits">Waits ' + waitList(closed) + "</span>";
      }
      // Choosing your Riichi discard: each tile you could let go, and what you'd be waiting on.
      let riichiHtml = "";
      if (riichiMode && o) {
        const at = items[cursor] && items[cursor].tile;
        riichiHtml = '<div class="mj-result mj-riichi"><b>Riichi: which tile goes?</b>' + [...new Set(o.riichi)].map((t) => {
          const rest = me.hand.slice();
          rest.splice(rest.indexOf(t), 1);
          return '<div class="mj-riichi-row' + (t === at ? " cursor" : "") + '">Drop ' + tile(t, { small: true }) + '<span class="mj-waits">Waits ' + waitList(rest) + "</span></div>";
        }).join("") + "</div>";
      }
      const round = M().WINDS[g.round - 27] + " " + (g.hand + 1) + (g.honba ? " · " + g.honba + " honba" : "") + (g.sticks ? " · " + g.sticks + " Riichi stick" + (g.sticks > 1 ? "s" : "") : "");
      root.innerHTML = '<div class="dig poker mahjong">' +
        '<div class="mj-table">' + playerHtml(3) + playerHtml(2) + playerHtml(1) +
          (detail ? '<div class="mj-result">' + detail.html + "</div>" : "") + riichiHtml + "</div>" +
        '<div class="mj-center"><span class="mj-round">' + esc(round) + '</span><span class="mj-dora">Dora ' + (g.dora ? g.dora.map((t) => tile(t, { small: true })).join("") : "") +
          '</span><span class="mj-left">' + (g.wall ? g.wall.length + " tiles left" : "") + "</span>" + waitsHtml + "</div>" +
        '<div class="mj-you">' + playerHtml(0) + '<div class="mj-hand">' + handHtml + '<span class="mj-melds">' +
          me.melds.map((m) => '<span class="mj-meld">' + m.tiles.map((t) => tile(t)).join("") + "</span>").join("") + "</span></div></div></div>";
      // The choices that aren't tiles (Tsumo, Riichi, Ron, Pass...) in the panel under the screen.
      const buttons = items.map((it, k) => ({ label: it.label, k })).filter((b) => items[b.k].tile == null);
      if (quitAsk) window.TableUI.panel({ message: "Get up from the table now? You'll\nforfeit your buy-in.", items: [{ label: "Yes" }, { label: "No" }],
        cursor: quitAsk.cursor, onPick: (i) => answerQuit(i === 0) });
      else window.TableUI.panel({ message, items: buttons, cursor: buttons.findIndex((b) => b.k === cursor), onPick: (i) => buttons[i] && chosen(buttons[i].k) });
    }

    function choose(list, at) {
      items = list;
      cursor = Math.max(0, Math.min(at == null ? 0 : at, list.length - 1));
      draw();
      return new Promise((resolve, reject) => { pick = resolve; pickReject = reject; });
    }
    // Select: get up at any time, forfeiting your buy-in (after a YES / NO;
    // the table waits while you think). STOP unwinds the game.
    const STOP = {};
    let quitAsk = null, stopped = false, pickReject = null;
    function answerQuit(yes) {
      se("se_select");
      quitAsk = null;
      if (!yes) { draw(); return; }
      stopped = true;
      if (pickReject) { const r = pickReject; pick = pickReject = null; r(STOP); }
    }
    // (Each pause in play waits out the question, and stops there if you've gone.)
    async function wait(ms) {
      if (ms) await sleep(ms);
      while (quitAsk) await sleep(100);
      if (stopped) throw STOP;
    }
    function chosen(k) {
      if (!pick || !items[k] || quitAsk) return;
      const r = pick;
      pick = null;
      const v = items[k];
      items = [];
      r(v);
    }
    function onKey(e) {
      if (stopped) return;
      if (quitAsk) {
        if (window.TableUI.move(quitAsk.cursor, 2, e.key) != null) { quitAsk.cursor = 1 - quitAsk.cursor; draw(); }
        else if (["z", "Z", " ", "Enter"].includes(e.key)) answerQuit(quitAsk.cursor === 0);
        else if (["x", "X", "b", "B", "Select"].includes(e.key)) answerQuit(false);
        else return;
        e.preventDefault();
        return;
      }
      if (e.key === "Select") { e.preventDefault(); se("se_select"); quitAsk = { cursor: 1 }; draw(); return; }
      if (!pick) return;
      if (["ArrowLeft", "a", "A", "ArrowUp"].includes(e.key)) { cursor = (cursor + items.length - 1) % items.length; draw(); }
      else if (["ArrowRight", "d", "D", "ArrowDown"].includes(e.key)) { cursor = (cursor + 1) % items.length; draw(); }
      else if (["z", "Z", " ", "Enter"].includes(e.key)) chosen(cursor);
      else if (["x", "X", "b", "B"].includes(e.key)) {
        const back = items.findIndex((it) => it.value === "leave" || it.value === "pass" || it.value === "unriichi");
        if (back >= 0) chosen(back); else return;
      } else return;
      e.preventDefault();
    }
    function onClick(e) {
      const b = e.target.closest && e.target.closest(".mj-tile[data-i]");
      if (b) { e.preventDefault(); chosen(+b.dataset.i); }
    }
    document.addEventListener("keydown", onKey);
    root.addEventListener("click", onClick);

    const name = (i) => (i === 0 ? "You" : g.players[i].name);
    function say(ev) {
      if (ev.seat == null) return null;
      const n = name(ev.seat), you = ev.seat === 0;
      switch (ev.type) {
        case "discard": return n + (you ? " discard " : " discards ") + M().tileName(ev.tile) + (ev.riichi ? ": Riichi!" : ".");
        case "pon": return n + (you ? " call" : " calls") + " Pon on " + M().tileName(ev.tile) + "!";
        case "chi": return n + (you ? " call" : " calls") + " Chi on " + M().tileName(ev.tile) + "!";
        default: return null;
      }
    }
    function report() {
      const lines = g.log.map(say).filter(Boolean);
      g.log = [];
      if (lines.length) message = lines[lines.length - 1];
    }

    // Your discard (or Tsumo, or Riichi first).
    async function yourTurn() {
      for (;;) {
        const o = M().discardOptions(g), me = g.players[0];
        const hand = me.hand.slice();
        if (me.drawn != null) { hand.splice(hand.lastIndexOf(me.drawn), 1); hand.push(me.drawn); }
        const allowed = riichiMode ? o.riichi : o.tiles;
        const list = [];
        hand.forEach((t, slot) => { if (allowed.includes(t) && (!me.riichi || slot === hand.length - 1)) list.push({ tile: t, slot }); });
        if (o.tsumo) list.push({ label: "Tsumo!", value: "tsumo" });
        if (o.riichi.length && !riichiMode) list.push({ label: "Riichi", value: "riichi" });
        if (riichiMode) list.push({ label: "Cancel Riichi", value: "unriichi" });
        // (In Riichi, the tile you drew goes by itself, unless it wins: then Tsumo, or let it go.)
        if (me.riichi && !o.tsumo && !riichiMode) {
          message = "You drew " + M().tileName(me.drawn) + ".";
          draw();
          await wait(AI_MS);
          se("se_ball_tray_ball");
          M().discard(g, me.drawn, false);
          return;
        }
        message = riichiMode ? "Riichi: which tile goes? Each shows what you'd wait on." : me.riichi ? "In Riichi: that tile wins! Tsumo, or let it go?" : "Your turn: pick a tile to discard.";
        const at = list.findIndex((it) => it.tile != null && it.slot === hand.length - 1);
        const v = await choose(list, o.tsumo ? list.findIndex((it) => it.value === "tsumo") : at >= 0 ? at : 0);
        if (v.value === "tsumo") { se("se_shop"); M().tsumo(g); return; }
        if (v.value === "riichi") { riichiMode = true; continue; }
        if (v.value === "unriichi") { riichiMode = false; continue; }
        se("se_ball_tray_ball");
        M().discard(g, v.tile, riichiMode);
        riichiMode = false;
        return;
      }
    }
    // Answering a claim on another's discard.
    async function yourClaim() {
      const c = g.claims[0];
      const list = c.options.map((o) => ({ label: o.type === "ron" ? "Ron!" : o.type === "pon" ? "Pon" : "Chi " + o.tiles.map((t) => t % 9 + 1).join("") + (g.lastDiscard.tile % 9 + 1),
        value: o })).concat([{ label: "Pass", value: "pass" }]);
      message = name(g.lastDiscard.seat) + " discarded " + M().tileName(g.lastDiscard.tile) + ".";
      const v = await choose(list, 0);
      M().claim(g, 0, v.value === "pass" ? null : v.value);
      if (v.value !== "pass") se(v.value.type === "ron" ? "se_shop" : "se_select");
    }

    function resultHtml() {
      const r = g.result;
      const pay = r.pay.map((n, k) => (n ? esc(name(k)) + " " + (n > 0 ? "+" : "") + n.toLocaleString("en-US") : "")).filter(Boolean).join(" · ");
      if (r.type === "draw") {
        const ready = r.ready.map((x, k) => (x ? name(k) : null)).filter(Boolean);
        return { html: "<b>Exhaustive draw.</b> " + (ready.length ? esc(ready.join(", ")) + (ready.length > 1 ? " are" : (ready[0] === "You" ? " are" : " is")) + " ready." : "Nobody's ready.") + "<br>" + pay };
      }
      const s = r.score;
      const head = esc(name(r.winner)) + (r.winner === 0 ? " win" : " wins") + " by " + (r.type === "ron" ? "Ron off " + esc(name(r.from)) : "Tsumo") + "!";
      const hand = r.tiles.map((t) => tile(t, { small: true, cls: t === r.tile ? "win" : "" })).join("") + " " + r.melds.map((m) => '<span class="mj-meld">' + m.tiles.map((t) => tile(t, { small: true })).join("") + "</span>").join("");
      const yaku = s.yaku.map(([y, h]) => esc(y) + " " + (h >= 13 && s.yakuman ? "" : h)).join(", ");
      return { win: r.tile, html: "<b>" + head + "</b><div class=\"mj-hand small\">" + hand + "</div>" + yaku + "<br>" +
        (s.yakuman ? "" : s.han + " han " + s.fu + " fu") + (s.name ? " · " + s.name : "") + "<br>" + pay };
    }

    async function hand() {
      detail = null;
      M().startHand(g);
      message = (g.dealer === 0 ? "You deal" : name(g.dealer) + " deals") + ". " + M().WINDS[g.round - 27] + " " + (g.hand + 1) + ".";
      draw();
      await wait(600);
      while (g.phase !== "end") {
        if (g.phase === "discard") {
          if (g.turn === 0) await yourTurn();
          else { draw(); await wait(AI_MS); M().aiTurn(g); se("se_ball_tray_ball"); }
        } else if (g.phase === "claim") {
          // (The others answer straight away; you, if you can take it.)
          for (const seat of Object.keys(g.claims)) if (+seat !== 0 && g.claims[seat].answer === undefined && g.phase === "claim") M().aiClaim(g, +seat);
          if (g.phase === "claim" && g.claims && g.claims[0] && g.claims[0].answer === undefined) await yourClaim();
        }
        report();
        draw();
      }
      detail = resultHtml();
      const mine = g.result.pay[0];
      message = g.result.type === "draw" ? "The wall's run out." : g.result.winner === 0 ? "You win " + mine.toLocaleString("en-US") + " points!" : mine < 0 ? "You pay " + (-mine).toLocaleString("en-US") + " points." : "";
      se(mine > 0 ? "se_shop" : mine < 0 ? "se_failure" : "se_select");
      draw();
    }

    return (async () => {
      let quit = false;
      try {
        for (;;) {
          await hand();
          if (g.over) {
            const order = g.players.map((p, k) => [p.points, k]).sort((a, b) => b[0] - a[0]);
            message += " The game's over! " + order.map(([pts, k], n) => (n + 1) + ". " + name(k) + " " + pts.toLocaleString("en-US")).join(", ") + ".";
            await choose([{ label: "Leave", value: "leave" }], 0);
            break;
          }
          const v = await choose([{ label: "Next hand", value: "next" }, { label: "Leave", value: "leave" }], 0);
          if (v.value === "leave") break;
        }
      } catch (e) {
        if (e !== STOP) throw e;
        quit = true;
      }
      document.removeEventListener("keydown", onKey);
      root.removeEventListener("click", onClick);
      window.TableUI.clear();
      return quit ? null : g.players[0].points;
    })();
  }

  window.MahjongScreen = { run };
})();
