// The Battle Frontier's own screens (Emerald's battle_factory_screen.c and battle_dome.c), drawn like the game's
// other GBA menus (ui/gba-menus.js's Surface) on the overlay canvas, the Pokémon's party icons over it.
//
//   await HoennFrontierScreens.factorySelect(canvas, { mons, summary(i) })
//       -> [i, i, i]   the Factory's rental screen: six to choose from, their moves, Ability and item; A on one:
//                      SUMMARY (the game's Summary screen, `summary`), RENT (or DESELECT), OTHERS; with three
//                      rented, "These three POKéMON okay?"
//   await HoennFrontierScreens.factorySwap(canvas, { mine, theirs, summary(which, i) })
//       -> { give, take } | null   the swap screen after a win: one of yours for one of the opponent's three
//                      (SUMMARY / SWAP / RECHOOSE on yours, then SUMMARY / ACCEPT / BACK on theirs; CANCEL keeps your team)
//   await HoennFrontierScreens.tourneyTree(canvas, { rounds, names, mons, me })
//       the Dome's tourney tree: sixteen trainers, eight a side, their matches drawn in to the final, the
//       winners' lines marked and the losers greyed; left and right, up and down look at each trainer (their
//       Pokémon under the tree), A or B closes. rounds: [[16 ids], [8], [4], [2], [1]] as far as it's gone;
//       names[id], mons[id] (three species' names), me: your id.
(function () {
  "use strict";

  const W = 240, H = 160;
  const FG = [72, 72, 72], SH = [208, 208, 200], BG = [248, 248, 248], DARK = [96, 96, 96], LIGHT = [216, 216, 216];
  const RED = [224, 56, 56], BLUE = [64, 104, 224], GREY = [168, 168, 168], GOLD = [232, 184, 40];
  const S = () => window.GbaMenus.Surface();
  const keys = (f) => window.GbaMenus.keys(f);
  const se = () => window.GbaMenus.se();
  const name = (r) => (window.Party && window.Party.displayName ? window.Party.displayName(r) : r.species);
  const itemName = (id) => (id && window.Bag ? window.Bag.name(id) : "");

  const icons = {};
  function icon(species, form) {
    const src = window.Screen.iconUrl(species, form);
    if (!icons[src]) {
      const img = new Image();
      img.loaded = new Promise((r) => { img.onload = img.onerror = () => r(img); });
      img.src = src;
      icons[src] = img;
    }
    return icons[src];
  }
  // A framed box (FireRed's plain window: a dark edge, a light line inside, white within).
  function box(s, x, y, w, h) {
    s.fill(x, y, w, h, DARK); s.fill(x + 1, y + 1, w - 2, h - 2, LIGHT); s.fill(x + 2, y + 2, w - 4, h - 4, BG);
  }
  // Shows the surface, then the icons (32 x 32, the sheet's first frame) over it, at the canvas's own scale.
  function show(s, canvas, drawn) {
    s.show(canvas);
    canvas.classList.remove("hidden");
    const g = canvas.getContext("2d"), k = canvas.width / W;
    g.imageSmoothingEnabled = false;
    for (const [img, x, y] of drawn) if (img.complete && img.naturalWidth) g.drawImage(img, 0, 0, 32, 32, x * k, y * k, 32 * k, 32 * k);
  }
  const cursorArrow = (s, x, y, c) => { for (let i = 0; i < 4; i++) for (let j = -i; j <= i; j++) s.put(x + i, y + j, c || FG); };
  // A small menu of options at (x, y); returns the index chosen, or -1 for B.
  async function menu(canvas, s, drawn, x, y, labels, at) {
    let cur = at || 0;
    const draw = () => {
      const t = S(); t.px.set(s.px);
      box(t, x, y, 72, labels.length * 16 + 8);
      labels.forEach((l, i) => t.text(l, x + 14, y + 4 + i * 16, FG, SH));
      cursorArrow(t, x + 5, y + 4 + cur * 16 + 6);
      show(t, canvas, drawn);
    };
    draw();
    return keys((k) => {
      if (k === "up") { cur = (cur + labels.length - 1) % labels.length; draw(); }
      else if (k === "down") { cur = (cur + 1) % labels.length; draw(); }
      else if (k === "a") { se(); return cur; }
      else if (k === "b") { se(); return -1; }
      return undefined;
    });
  }
  const yesNo = (canvas, s, drawn) => menu(canvas, s, drawn, 164, 100, ["YES", "NO"]).then((i) => i === 0);

  // A Pokémon's card: name and level, its Ability and item, its four moves.
  function card(s, r, x, y, w) {
    box(s, x, y, w, 56);
    s.text(name(r) + "  {LV}" + r.level, x + 6, y + 4, FG, SH);
    s.text(r.ability || "", x + 6, y + 18, FG, SH, "small");
    s.text(r.item ? itemName(r.item) : "No item", x + w / 2, y + 18, FG, SH, "small");
    (r.moves || []).slice(0, 4).forEach((m, i) => s.text(m.name, x + 6 + (i & 1) * (w / 2 - 6), y + 30 + (i >> 1) * 12, FG, SH, "small"));
  }

  // ---------- The Factory's rental screen ----------
  async function factorySelect(canvas, opts) {
    const mons = opts.mons, chosen = [];
    await Promise.all(mons.map((r) => icon(r.species, r.form).loaded));
    let cur = 0;
    const spot = (i) => [24 + (i % 3) * 72, 18 + Math.floor(i / 3) * 38];
    const draw = () => {
      const s = S();
      s.fill(0, 0, W, H, [200, 216, 232]);
      box(s, 2, 2, 96, 16); s.text("RENTAL POKéMON", 8, 4, FG, SH, "small");
      const prompt = chosen.length < 3 ? "Select the " + ["first", "second", "third"][chosen.length] + " POKéMON." : "These three POKéMON okay?";
      s.text(prompt, 102, 4, FG, SH, "small");
      const drawn = [];
      mons.forEach((r, i) => {
        const [x, y] = spot(i), k = chosen.indexOf(i);
        s.fill(x + 6, y + 30, 44, 4, [160, 176, 192]);
        if (k >= 0) { s.fill(x - 2, y - 2, 40, 36, GOLD); s.fill(x, y, 36, 32, [255, 240, 200]); s.text(String(k + 1), x + 2, y, FG, SH, "small"); }
        drawn.push([icon(r.species, r.form), x + 2, y]);
        s.text(name(r), x + 18 - Math.floor(s.textWidth(name(r), "small") / 2), y + 32, FG, SH, "small");
        if (i === cur) cursorArrow(s, x - 8, y + 16, RED);
      });
      card(s, mons[cur], 2, 104, 236);
      return [s, drawn];
    };
    for (;;) {
      const [s, drawn] = draw();
      show(s, canvas, drawn);
      if (chosen.length === 3) {
        if (await yesNo(canvas, s, drawn)) { canvas.classList.add("hidden"); return chosen.slice(); }
        chosen.pop();
        continue;
      }
      const k = await keys((k) => (["up", "down", "left", "right", "a"].includes(k) ? k : undefined));
      if (k === "left") cur = (cur + 5) % 6;
      else if (k === "right") cur = (cur + 1) % 6;
      else if (k === "up" || k === "down") cur = (cur + 3) % 6;
      else {
        const picked = chosen.includes(cur);
        const m = await menu(canvas, s, drawn, 164, 100, ["SUMMARY", picked ? "DESELECT" : "RENT", "OTHERS"]);
        if (m === 0) { canvas.classList.add("hidden"); await opts.summary(cur); }
        else if (m === 1) { if (picked) chosen.splice(chosen.indexOf(cur), 1); else chosen.push(cur); }
      }
    }
  }

  // ---------- The Factory's swap screen ----------
  async function factorySwap(canvas, opts) {
    const mine = opts.mine, theirs = opts.theirs;
    await Promise.all(mine.concat(theirs).map((r) => icon(r.species, r.form).loaded));
    let side = 0, cur = 0, give = -1;
    const spot = (which, i) => [which ? 136 : 24, 24 + i * 26];
    const draw = () => {
      const s = S();
      s.fill(0, 0, W, H, [200, 216, 232]);
      box(s, 2, 2, 80, 16); s.text("POKéMON SWAP", 8, 4, FG, SH, "small");
      s.text(give < 0 ? "Select a POKéMON to swap." : "Select a POKéMON to accept.", 88, 4, FG, SH, "small");
      const drawn = [];
      [mine, theirs].forEach((list, which) => {
        s.text(which ? "OPPONENT'S" : "YOURS", which ? 136 : 24, 14, FG, SH, "small");
        list.forEach((r, i) => {
          const [x, y] = spot(which, i);
          if (!which && i === give) { s.fill(x - 2, y - 2, 36, 28, GOLD); }
          drawn.push([icon(r.species, r.form), x, y - 4]);
          s.text(name(r), x + 36, y + 6, FG, SH, "small");
          if (which === side && i === cur) cursorArrow(s, x - 10, y + 12, RED);
        });
      });
      card(s, (side ? theirs : mine)[cur], 2, 102, 236);
      return [s, drawn];
    };
    for (;;) {
      const [s, drawn] = draw();
      show(s, canvas, drawn);
      const k = await keys((k) => (["up", "down", "left", "right", "a", "b"].includes(k) ? k : undefined));
      if (k === "up") cur = (cur + 2) % 3;
      else if (k === "down") cur = (cur + 1) % 3;
      else if (k === "left" || k === "right") { if (give < 0) side ^= 1; }
      else if (k === "b") {
        if (give >= 0) { give = -1; side = 0; continue; }
        if (await menu(canvas, s, drawn, 164, 100, ["KEEP TEAM", "BACK"]) === 0) { canvas.classList.add("hidden"); return null; }
      } else if (give < 0 && side === 1) {
        const m = await menu(canvas, s, drawn, 164, 100, ["SUMMARY", "BACK"]);
        if (m === 0) { canvas.classList.add("hidden"); await opts.summary(1, cur); }
      } else if (give < 0) {
        const m = await menu(canvas, s, drawn, 164, 100, ["SUMMARY", "SWAP", "RECHOOSE"]);
        if (m === 0) { canvas.classList.add("hidden"); await opts.summary(0, cur); }
        else if (m === 1) { give = cur; side = 1; cur = 0; }
      } else {
        const m = await menu(canvas, s, drawn, 164, 100, ["SUMMARY", "ACCEPT", "BACK"]);
        if (m === 0) { canvas.classList.add("hidden"); await opts.summary(1, cur); }
        else if (m === 1) { canvas.classList.add("hidden"); return { give, take: cur }; }
        else if (m === 2) { give = -1; side = 0; }
      }
    }
  }

  // ---------- The Dome's tourney tree ----------
  // Emerald's layout (sTourneyTreePokeballCoords): the sixteen at x 68 (left) and 172 (right), y 33 to 145
  // sixteen apart; their matches at x 87 / 153, the next round's at 95 / 145, the semifinals at 103 / 137, the
  // final at 120, each at the height between the two it's decided from.
  async function tourneyTree(canvas, opts) {
    const rounds = opts.rounds, names = opts.names, mons = opts.mons || {};
    const X = [[68, 87, 95, 103, 120], [172, 153, 145, 137, 120]];
    // Each trainer's place in round 0, and a match's y: the middle of its two.
    const yOf = (r, i) => (r === 0 ? 25 + (i % 8) * 16 : (yOf(r - 1, i * 2) + yOf(r - 1, i * 2 + 1)) / 2);   // (8 px up from Emerald's, for the line under)
    const wonAt = (id, r) => rounds[r + 1] && rounds[r + 1].includes(id);
    const alive = (id) => rounds[rounds.length - 1].includes(id);
    let cur = rounds[0].indexOf(opts.me) >= 0 ? rounds[0].indexOf(opts.me) : 0;
    const draw = () => {
      const s = S();
      s.fill(0, 0, W, H, [232, 232, 240]);
      s.text("BATTLE TOURNEY", 120 - Math.floor(s.textWidth("BATTLE TOURNEY") / 2), 2, FG, SH);
      // The lines: each entrant to its match, each match to the next; a winner's in colour.
      const line = (x0, y0, x1, y1, c) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) s.put(x, y0, c); for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) s.put(x1, y, c); };
      for (let r = 0; r < 4; r++) {
        const n = 16 >> r;
        for (let i = 0; i < n; i++) {
          const id = rounds[r] && rounds[r][i], sd = i >= n / 2 ? 1 : 0;
          const won = id != null && wonAt(id, r);
          line(X[sd][r], yOf(r, i), X[sd][r + 1], r === 3 ? 81 : yOf(r + 1, i >> 1), won ? (id === opts.me ? RED : BLUE) : GREY);
        }
      }
      // The names: left-aligned to the balls on the left, right-aligned on the right; the losers grey.
      rounds[0].forEach((id, i) => {
        const sd = i >= 8 ? 1 : 0, y = yOf(0, i), label = String(names[id] || "?").slice(0, 10);
        const c = alive(id) ? (id === opts.me ? RED : FG) : GREY;
        s.fill(X[sd][0] - 3, y - 3, 7, 7, c);
        if (sd) s.text(label, 178, y - 5, c, SH, "small"); else s.text(label, 62 - s.textWidth(label, "small"), y - 5, c, SH, "small");
        if (i === cur) cursorArrow(s, sd ? 232 : 2, y, RED);
      });
      // The winner at the final.
      if (rounds[4] && rounds[4][0] != null) { const w = String(names[rounds[4][0]] || "?"); s.fill(117, 78, 7, 7, GOLD); s.text(w, 120 - Math.floor(s.textWidth(w, "small") / 2), 66, FG, SH, "small"); }
      const id = rounds[0][cur];
      box(s, 2, 146, 236, 14);
      s.text(String(names[id] || "?") + ": " + (mons[id] || []).join(", "), 6, 148, FG, SH, "small");
      return s;
    };
    for (;;) {
      show(draw(), canvas, []);
      const k = await keys((k) => (["up", "down", "left", "right", "a", "b"].includes(k) ? k : undefined));
      if (k === "a" || k === "b") { se(); canvas.classList.add("hidden"); return; }
      if (k === "up") cur = cur % 8 === 0 ? cur + 7 : cur - 1;
      else if (k === "down") cur = cur % 8 === 7 ? cur - 7 : cur + 1;
      else cur = (cur + 8) % 16;
    }
  }

  window.HoennFrontierScreens = { factorySelect, factorySwap, tourneyTree };
})();
