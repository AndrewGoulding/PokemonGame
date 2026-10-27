// The other realms' battles (engine/battle.js's Ultimax, ui/game.js's realmFight), drawn as FireRed draws a double
// battle (ui/battle-screen.js): the street behind, the foes standing at the left, each with its name and FireRed's HP
// bar over its head, and the party's FireRed healthboxes (healthbox-doubles-player: name, level, HP bar and status)
// down the right, staggered as a double battle's are; the battle's message box under it all (ui/screen.js's text box).
// The bars move as FireRed's do, a box shakes when its fighter's hit, and while you pick whom a skill is for, the one
// you'd pick bobs (a fighter) or has the ▼ over it (a foe).
//
//   UltimaxScreen.build(scene, b, { back, pic })   // b: Ultimax.create's; back: the backdrop's style; pic(f): a foe's
//                                                   // picture's HTML
//   UltimaxScreen.show(b, snap)                     // where everyone stands now (each turn step's snap)
//   UltimaxScreen.fx(fx)                            // a step's effect: a hit, a heal, someone down
//   const i = await UltimaxScreen.pick("foe" | "ally", b, start)   // left / right (or up / down) and A: an index,
//                                                   // or null (B)
//   UltimaxScreen.stop()                            // the fight's over
(function () {
  "use strict";
  const img = (n) => Object.assign(new Image(), { src: "assets/battle-interface/" + n + ".png" });
  const BOX = img("healthbox-doubles-player"), BAR = img("healthbar"), STATUS = img("status-icons");
  const ready = (i) => i.complete && i.naturalWidth;
  const CREAM = [255, 255, 222], TEXT = [65, 65, 65], SHADOW = [222, 213, 180], WHITE = [255, 255, 255], DARK = [74, 65, 90];
  // (status-icons.png's rows: a fighter's 0-4, a foe's 5-9.)
  const STATUS_ROW = { PSN: 0, PAR: 1, SLP: 2, FRZ: 3, BRN: 4 };
  const FEET = 104;   // (where the foes stand, in the 112 lines over the message box)

  let st = null, raf = 0;
  const tile = (g, t, x, y) => g.drawImage(BAR, (t % 40) * 8, Math.floor(t / 40) * 8, 8, 8, x, y, 8, 8);
  // (CalcBarFilledPixels: 48 pixels.)
  const pixels = (hp, max) => { const px = Math.floor(hp * 48 / Math.max(1, max)); return px === 0 && hp > 0 ? 1 : px; };
  function bar(g, x, y, hp, max) {
    tile(g, 1, x, y); tile(g, 2, x + 8, y);
    const px = pixels(hp, max), base = px > 24 ? 3 : px > 9 ? 47 : 56;
    for (let i = 0; i < 6; i++) tile(g, base + Math.max(0, Math.min(8, px - 8 * i)), x + 16 + 8 * i, y);
    // (its right end: on a box, the box's edge)
    g.fillStyle = "rgb(82,106,90)"; g.fillRect(x + 64, y + 1, 1, 7);
  }

  // Where the party's boxes go: down the right, from the bottom up, staggered 12 as a double battle's (159 / 171
  // there; here 127 / 139, the box's own 12 pixels of shadow at its left).
  function allyAt(i, n) {
    const step = n > 3 ? 27 : n > 2 ? 34 : 36;
    return [127 + ((n - 1 - i) % 2 ? 0 : 12), 84 - step * (n - 1 - i)];
  }
  // Where each foe stands: spread across the left, centres in game pixels.
  const foeX = (i, n) => Math.round(8 + (i + 0.5) * 120 / n);

  function build(scene, b, opts) {
    stop();
    const n = b.foes.length;
    scene.innerHTML = '<div class="rb"><div class="rb-back" style="' + opts.back + '"></div>' +
      '<div class="rb-foes">' + b.foes.map((f, i) => '<div class="rb-foe" data-i="' + i + '" style="left:' + (foeX(i, n) / 2.4) + '%">' + opts.pic(f) + "</div>").join("") + "</div>" +
      '<canvas class="rb-layer" width="240" height="112"></canvas></div>';
    st = {
      el: scene.querySelector(".rb"), layer: scene.querySelector(".rb-layer"), sel: null, t: 0,
      allies: b.allies.map((f) => ({ name: f.name, lv: f.lv, hp: f.hp, to: f.hp, max: f.maxHp, status: "", shake: 0, gone: f.hp <= 0 })),
      foes: b.foes.map((f) => ({ name: f.name, hp: f.hp, to: f.hp, max: f.maxHp, status: "", gone: f.hp <= 0 }))
    };
    const tick = () => { if (!st) return; st.t++; step(); draw(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; st = null; }

  function show(b, snap) {
    if (!st) return;
    // (A swap changes who's in each place: a new face's bar starts where they are.)
    snap.allies.forEach(([hp, , name, lv, , max, status], i) => {
      const a = st.allies[i] || (st.allies[i] = { hp, shake: 0 });
      if (a.name !== name) a.hp = hp;
      Object.assign(a, { name, lv, to: hp, max, status: status || "", gone: hp <= 0 });
    });
    snap.foes.forEach((hp, i) => Object.assign(st.foes[i], { to: hp, status: (snap.foeStatus || [])[i] || "" }));
  }
  // HP: 1 a frame, or a pixel's worth when the bar's more than 48 (FireRed's, for HP three times as big).
  function step() {
    for (const f of st.allies.concat(st.foes)) {
      if (f.hp !== f.to) { const d = Math.max(1, f.max / 48); f.hp = f.hp < f.to ? Math.min(f.to, f.hp + d) : Math.max(f.to, f.hp - d); }
      if (f.shake > 0) f.shake--;
    }
    st.foes.forEach((f, i) => { const el = st.el.querySelector('.rb-foe[data-i="' + i + '"]'); if (el) el.classList.toggle("gone", f.to <= 0); });
  }

  function draw() {
    const g = st.layer.getContext("2d"), s = window.GbaMenus.Surface();
    g.clearRect(0, 0, 240, 112);
    g.imageSmoothingEnabled = false;
    if (!ready(BOX) || !ready(BAR)) return;
    // The foes: name (white, as a trainer's on FireRed's screens) and the HP bar, over their heads: all on one row,
    // over the tallest one's head, but a bar that would run into the one before goes a row up (and the next back).
    const n = st.foes.length, rows = [];
    let y0 = FEET - 12;
    st.foes.forEach((f, i) => {
      const pic = st.el.querySelector('.rb-foe[data-i="' + i + '"] img, .rb-foe[data-i="' + i + '"] .rb-pic');
      const h = pic ? pic.getBoundingClientRect().height / st.el.getBoundingClientRect().height * 160 : 56;
      y0 = Math.min(y0, Math.round(FEET - h - 12));
    });
    y0 = Math.max(30, y0);
    st.foes.forEach((f, i) => {
      if (f.to <= 0 && f.hp <= 0) return;
      const cx = foeX(i, n), x = Math.max(1, Math.min(240 - 66, cx - 32));
      let row = 0;
      while (rows[row] != null && x < rows[row] + 2) row++;
      rows[row] = x + 65;
      const y = y0 - 20 * row;
      const w = s.textWidth(f.name, "small");
      s.text(f.name, Math.max(0, Math.min(240 - w, x + 32 - (w >> 1))), y - 10, WHITE, DARK, "small");
      bar(g, x, y, f.hp, f.max);
      if (STATUS_ROW[f.status] != null && ready(STATUS)) g.drawImage(STATUS, 0, (5 + STATUS_ROW[f.status]) * 8, 24, 8, x, y, 24, 8);
      // (the one you'd pick: a ▼, bobbing, over its name)
      if (st.sel && st.sel.side === "foe" && st.sel.i === i) {
        const tx = x + 29, ty = y - 16 + (st.t >> 4) % 2;
        for (let r = 0; r < 4; r++) for (let c = r; c < 7 - r; c++) { s.put(tx + c + 1, ty + r + 1, DARK); s.put(tx + c, ty + r, WHITE); }
      }
    });
    g.drawImage(s.canvas(), 0, 0);
    // The party's boxes.
    const m = st.allies.length;
    st.allies.forEach((a, i) => {
      let [x, y] = allyAt(i, m);
      if (a.shake) y += a.shake % 2 ? 1 : -1;
      // (DoBounceEffect, a target's: 15 a frame)
      if (st.sel && st.sel.side === "ally" && st.sel.i === i) y += [0, 1, 2, 1][(st.t >> 3) % 4];
      const t = window.GbaMenus.Surface();
      // (The windows FireRed prints into, cream, then the name at 16 and "Lv" and the level right-aligned at 72.)
      t.fill(16, 5, 56, 11, CREAM); t.fill(72, 5, 24, 11, CREAM);
      t.text(a.name, 16, 3, a.gone ? [180, 180, 170] : TEXT, SHADOW, "small");
      const lv = String(a.lv || "");
      t.text("{LV}" + lv, 72 + 5 * (3 - lv.length), 3, TEXT, SHADOW, "small");
      g.drawImage(BOX, x, y);
      g.save(); g.beginPath(); g.rect(x + 16, y + 5, 80, 11); g.clip();
      g.drawImage(t.canvas(), 0, 0, 128, 32, x, y, 128, 32);
      g.restore();
      if (STATUS_ROW[a.status] != null && ready(STATUS)) g.drawImage(STATUS, 0, STATUS_ROW[a.status] * 8, 24, 8, x + 16, y + 16, 24, 8);
      bar(g, x + 32, y + 16, a.hp, a.max);
    });
  }

  function fx(f) {
    if (!st || !f) return;
    const el = f.side === "foe" ? st.el.querySelector('.rb-foe[data-i="' + f.i + '"]') : null;
    const flash = (cls, ms) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };
    const sfx = (n) => window.GameAudio && window.GameAudio.se && window.GameAudio.se(n);
    if (f.kind === "hit") {
      sfx(f.eff >= 2 ? "se_super_effective" : f.eff > 0 && f.eff < 1 ? "se_not_effective" : f.crit ? "se_m_mega_kick" : "se_effective");
      if (f.side === "foe") flash("hit", 400);
      else if (st.allies[f.i]) {
        // (DoHitAnimHealthboxEffect: the box shakes for 21 frames, and the screen with it)
        st.allies[f.i].shake = 21;
        st.el.classList.remove("shake"); void st.el.offsetWidth; st.el.classList.add("shake");
      }
    } else if (f.kind === "down") sfx("se_faint");
    else if (f.kind === "heal" || f.kind === "buff") { sfx("se_m_reflect"); flash("healed", 500); }
    else if (f.kind === "swap") { sfx("se_ball_throw"); }
    else if (f.kind === "run") sfx("se_flee");
    else if (f.kind === "status") flash("hit", 400);
  }

  // Whom: left / right (and up / down) through those standing (any of the party, for a heal or an item), A picks,
  // B goes back. onMove(i) as the choice moves (to say who it is).
  async function pick(side, b, start, onMove) {
    const list = (side === "foe" ? b.foes : b.allies).map((f, i) => [f, i]).filter(([f]) => side === "ally" || f.hp > 0).map(([, i]) => i);
    if (!list.length) return null;
    let k = Math.max(0, list.indexOf(start));
    const set = () => { st.sel = { side, i: list[k] }; if (onMove) onMove(list[k]); };
    set();
    const se = window.GbaMenus.se;
    const r = await window.GbaMenus.keys((key) => {
      // (the foes left to right; the party top to bottom down the right)
      const d = { left: -1, right: 1, up: -1, down: 1 }[key];
      if (d && list.length > 1) { k = (k + d + list.length) % list.length; se(); set(); }
      else if (key === "a") { se(); return list[k]; }
      else if (key === "b") { se(); return null; }
      return undefined;
    });
    if (st) st.sel = null;
    return r;
  }

  window.UltimaxScreen = { build, show, fx, pick, stop };
})();
