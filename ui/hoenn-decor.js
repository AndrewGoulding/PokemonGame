// Hoenn's decorations (Emerald's src/decoration.c, decoration_inventory.c, src/secret_base.c): the catalogue
// (window.HOENN_SCRIPTS.decor, from tools/lib/hoenn-decor.js), the ones you own, and the ones you've put out in
// your Secret Base or your room, which the Decoration menu of the PC there works.
//
//   const D = HoennDecor.create(env)
//   D.give(id) / D.has(id) / D.count(cat)     the inventory: what you own (id: the catalogue's number, 1 on)
//   D.overlay(map)    -> { tiles: [[x, y, n]], solid: [[x, y]], people: [def] }  what's put out on that map
//   await D.menu("base" | "room", map)        the PC's Decoration menu (Decorate, Put away, Toss)
//   await D.mart(keys)                        a Decoration shop's counter (the DECOR_ names it sells)
//
// env: player(), say(pages), confirm(question), choose(question, texts) (an index, -1 for B), canvas() (the overlay
// canvas, 240x160), baseMap() (the map your Secret Base is), sfx(name), refresh() (the map looked at again), persist().
// player.flags.hoennDecor: { have: { id: n }, base: [{ id, x, y }], room: [...] }.
(function () {
  "use strict";

  const W = 240, H = 160, TILE = 16;
  const CAPACITY = [10, 10, 10, 30, 30, 10, 40, 10];   // (desks, chairs, plants, ornaments, mats, posters, dolls, cushions)
  const MAX_PLACED = { base: 16, room: 12 };

  const images = {};
  function image(src) {
    if (!images[src]) {
      const img = new Image();
      img.loaded = new Promise((r) => { img.onload = img.onerror = () => r(img); });
      img.src = src;
      images[src] = img;
    }
    return images[src];
  }
  const ready = (img) => img && img.complete && img.naturalWidth > 0;
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

  function create(env) {
    const catalog = () => window.HOENN_SCRIPTS.decor || [];
    const byId = (id) => catalog()[id - 1];
    const byKey = (key) => catalog().find((d) => d.key === String(key).replace(/^DECOR_/, ""));
    const state = () => { const f = env.player().flags; return f.hoennDecor || (f.hoennDecor = { have: {}, base: [], room: [] }); };
    const count = (cat) => Object.entries(state().have).reduce((n, [id, c]) => n + (byId(+id) && byId(+id).cat === cat ? c : 0), 0);
    const has = (id) => (state().have[id] || 0) > 0;
    function give(id) {
      const d = byId(id);
      if (!d || count(d.cat) >= CAPACITY[d.cat]) return false;
      state().have[id] = (state().have[id] || 0) + 1;
      return true;
    }
    const take = (id) => { const s = state(); if (s.have[id] > 0 && !--s.have[id]) delete s.have[id]; };
    // (Someone else's base, while you're in it (env.visitMap / env.visitPlaced): its own decorations; "temp" while one is furnished.)
    let tempPlaced = [];
    const placedOf = (ctx) => (ctx === "visit" ? (env.visitPlaced ? env.visitPlaced() : []) : ctx === "temp" ? tempPlaced : state()[ctx]);
    // Which a map's placed ones are: the base you're visiting, the Secret Base's, or your room's.
    const contextOf = (map) => (map && env.visitMap && map === env.visitMap() ? "visit" : map && map === env.baseMap() ? "base" : /^LittlerootTown_(Brendans|Mays)House_2F$/.test(map || "") ? "room" : null);
    const sheetOf = (map) => (window.WORLD_MAPS[map] || {}).decorSheet;

    // ---------- What's out on a map ----------
    function overlay(map) {
      const ctx = contextOf(map), out = { tiles: [], solid: [], people: [] };
      if (!ctx) return out;
      placedOf(ctx).forEach((p, i) => {
        const d = byId(p.id);
        if (!d) return;
        if (d.perm === "sprite") {
          const g = d.tiles[0];
          if (g) out.people.push({ id: 900 + i, x: p.x, y: p.y, movement: "face_down", rangeX: 0, rangeY: 0, script: null, flag: null, text: null, sprite: g.sprite, width: g.width, height: g.height, frames: g.frames,
            localId: "DECOR_" + i, decor: d.key });
          return;
        }
        for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) {
          const x = p.x + c, y = p.y - (d.h - 1) + r, t = d.tiles[r * d.w + c];
          if (t == null) continue;
          out.tiles.push([x, y, t - 512]);
          if (d.perm !== "pass" && d.perm !== "wall") out.solid.push([x, y]);
        }
      });
      return out;
    }

    // ---------- Where one can go (src/decoration.c CanPlaceDecoration) ----------
    const kindAt = (map, x, y) => { const m = window.WORLD_MAPS[map]; return x < 0 || y < 0 || x >= m.width || y >= m.height ? "x" : (m.decorKind || "")[y * m.width + x] || "x"; };
    function footprint(d, x, y) {
      if (d.perm === "sprite") return Array.from({ length: d.w }, (_, c) => [x + c, y]);
      const cells = [];
      for (let r = 0; r < d.h; r++) for (let c = 0; c < d.w; c++) cells.push([x + c, y - (d.h - 1) + r, r, c]);
      return cells;
    }
    function canPlace(ctx, map, d, x, y) {
      const taken = new Set();
      for (const p of placedOf(ctx)) { const e = byId(p.id); if (e) for (const [cx, cy] of footprint(e, p.x, p.y)) taken.add(cx + "," + cy); }
      const people = ((window.WORLD_MAPS[map] || {}).people || []).filter((q) => q.x !== 0 || q.y !== 0).map((q) => q.x + "," + q.y);
      for (const [cx, cy, r] of footprint(d, x, y)) {
        const k = kindAt(map, cx, cy);
        if (taken.has(cx + "," + cy) || people.includes(cx + "," + cy)) return false;
        if (d.perm === "solid" || d.perm === "pass") { if (k !== "f") return false; }
        else if (d.perm === "behind") { if (k !== "f" && !(r === 0 && k === "w")) return false; }
        else if (d.perm === "wall") { if (k !== "w") return false; }
        else if (d.perm === "sprite") { if (d.shape === "1x2" ? k !== "l" : k !== "s" && k !== "l") return false; }
      }
      return true;
    }

    // Someone else's base furnished (this game's own; Emerald's come through record mixing): n of the catalogue's decorations
    // set out at random where the rules let them go (CanPlaceDecoration), no two on the same tiles.
    function furnish(map, rng, n) {
      const out = [], m = window.WORLD_MAPS[map], all = catalog();
      if (!m || !m.decorKind || !all.length) return out;
      const saved = tempPlaced;
      tempPlaced = out;
      try {
        for (let tries = 0; out.length < n && tries < 600; tries++) {
          const d = all[Math.floor(rng() * all.length)], x = Math.floor(rng() * m.width), y = Math.floor(rng() * m.height);
          if (canPlace("temp", map, d, x, y)) out.push({ id: d.id, x, y });
        }
      } finally { tempPlaced = saved; }
      return out;
    }

    // ---------- Putting one out: a screen of the map, a cursor, and the decoration under it ----------
    function input() {
      const KEY = { z: "a", Z: "a", " ": "a", Enter: "a", x: "b", X: "b", Escape: "b", ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      const pressed = [];
      const down = (e) => { const k = KEY[e.key]; if (!k) return; e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat || k !== "a" && k !== "b") pressed.push(k); };
      document.addEventListener("keydown", down, true);
      return { take: () => pressed.splice(0), close: () => document.removeEventListener("keydown", down, true) };
    }
    async function place(ctx, map, d) {
      // (Drawn at 240x160 on a layer of its own, then onto the overlay canvas, whatever size that is.)
      const m = window.WORLD_MAPS[map], canvas = env.canvas(), out = canvas.getContext("2d"), layer = document.createElement("canvas"), keys = input();
      layer.width = W; layer.height = H;
      const g = layer.getContext("2d");
      const sheet = sheetOf(map), below = image("assets/world/maps/" + map + ".png"), top = m.top ? image("assets/world/maps/" + map + "-top.png") : null;
      const dBelow = sheet ? image("assets/world/maps/_decor_" + sheet + "-mt.png") : null, dTop = sheet ? image("assets/world/maps/_decor_" + sheet + "-mt-top.png") : null;
      await Promise.all([below, top, dBelow, dTop].filter(Boolean).map((i) => i.loaded));
      canvas.classList.remove("hidden");
      g.imageSmoothingEnabled = false;
      let cx = Math.min(m.width - 1, Math.max(0, (m.warps[0] || { x: 1 }).x)), cy = Math.max(0, Math.min(m.height - 1, (m.warps[0] || { y: m.height - 2 }).y - 2));
      // (It starts on the first place it can go, if there is one.)
      first: for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) if (canPlace(ctx, map, d, x, y)) { cx = x; cy = y; break first; }
      const ok = () => canPlace(ctx, map, d, cx, cy);
      const drawTiles = (list, sheetImg) => { if (!ready(sheetImg)) return; for (const [x, y, n] of list) g.drawImage(sheetImg, (n % 16) * 16, Math.floor(n / 16) * 16, 16, 16, x * TILE - camX, y * TILE - camY, 16, 16); };
      const ghostTiles = () => (d.perm === "sprite" ? [] : footprint(d, cx, cy).map(([x, y, r, c]) => [x, y, d.tiles[r * d.w + c] - 512]));
      let camX = 0, camY = 0;
      for (;;) {
        // (The camera keeps the cursor in the middle, as far as the map goes.)
        // (A map smaller than the screen sits in the middle of it.)
        camX = m.width * TILE <= W ? -Math.floor((W - m.width * TILE) / 2) : Math.max(0, Math.min(m.width * TILE - W, cx * TILE + 8 - W / 2));
        camY = m.height * TILE <= H ? -Math.floor((H - m.height * TILE) / 2) : Math.max(0, Math.min(m.height * TILE - H, cy * TILE + 8 - H / 2));
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
        if (ready(below)) g.drawImage(below, -camX, -camY);
        const o = overlay(map);
        drawTiles(o.tiles, dBelow);
        for (const p of o.people) { const im = image("assets/world/sprites/" + p.sprite + ".png"); if (ready(im)) g.drawImage(im, 0, 0, p.width, p.height, p.x * TILE - camX, p.y * TILE + TILE - p.height - camY, p.width, p.height); }
        if (top && ready(top)) g.drawImage(top, -camX, -camY);
        drawTiles(o.tiles, dTop);
        g.globalAlpha = 0.65; drawTiles(ghostTiles(), dBelow); drawTiles(ghostTiles(), dTop); g.globalAlpha = 1;
        if (d.perm === "sprite") { const t = d.tiles[0], im = t && image("assets/world/sprites/" + t.sprite + ".png"); if (im && ready(im)) { g.globalAlpha = 0.7; g.drawImage(im, 0, 0, t.width, t.height, cx * TILE - camX, cy * TILE + TILE - t.height - camY, t.width, t.height); g.globalAlpha = 1; } }
        g.lineWidth = 1; g.strokeStyle = ok() ? "#58ff58" : "#ff5858";
        for (const [x, y] of footprint(d, cx, cy)) g.strokeRect(x * TILE - camX + 0.5, y * TILE - camY + 0.5, TILE - 1, TILE - 1);
        g.fillStyle = "rgba(0,0,0,0.65)"; g.fillRect(0, 0, W, 12);
        g.fillStyle = "#fff"; g.font = "8px monospace"; g.textBaseline = "top"; g.fillText(d.name + "   A: place   B: back", 3, 2);
        out.setTransform(1, 0, 0, 1, 0, 0); out.imageSmoothingEnabled = false; out.drawImage(layer, 0, 0, canvas.width, canvas.height);
        await nextFrame();
        for (const k of keys.take()) {
          if (k === "up") cy = Math.max(0, cy - 1);
          else if (k === "down") cy = Math.min(m.height - 1, cy + 1);
          else if (k === "left") cx = Math.max(0, cx - 1);
          else if (k === "right") cx = Math.min(m.width - 1, cx + 1);
          else if (k === "b") { keys.close(); canvas.classList.add("hidden"); return false; }
          else if (k === "a") {
            if (!ok()) { env.sfx("se_failure"); continue; }
            keys.close();
            canvas.classList.add("hidden");
            return { x: cx, y: cy };
          }
        }
      }
    }

    // ---------- The menus ----------
    const CATS = () => window.HOENN_SCRIPTS.decorCategories || [];
    const nameOf = (d) => d.name;
    async function pickOwned(question, filter) {
      for (;;) {
        const cats = CATS().map((n, i) => ({ n, i, items: catalog().filter((d) => d.cat === i && filter(d)) })).filter((c) => c.items.length);
        if (!cats.length) { await env.say("There's nothing here."); return null; }
        const ci = await env.choose(question, cats.map((c) => c.n).concat(["Cancel"]));
        if (ci < 0 || ci >= cats.length) return null;
        const items = cats[ci].items, ii = await env.choose(cats[ci].n, items.map((d) => nameOf(d) + "  ×" + (state().have[d.id] || 0)).concat(["Back"]));
        if (ii >= 0 && ii < items.length) return items[ii];
      }
    }
    async function decorate(ctx, map) {
      if (placedOf(ctx).length >= MAX_PLACED[ctx]) { await env.say("No more decorations can be placed."); return; }
      // (In your room only dolls and cushions go out: Emerald's rule.)
      const d = await pickOwned("Decorate with what?", (e) => has(e.id) && (ctx === "base" || e.perm === "sprite"));
      if (!d) return;
      for (;;) {
        const at = await place(ctx, map, d);
        if (!at) return;
        if (!(await env.confirm("Place it here?"))) continue;
        take(d.id);
        placedOf(ctx).push({ id: d.id, x: at.x, y: at.y });
        env.sfx("se_select");
        env.refresh();
        await env.persist();
        return;
      }
    }
    async function putAway(ctx) {
      const list = placedOf(ctx);
      if (!list.length) { await env.say("No decorations are in use."); return; }
      const i = await env.choose("Put away which?", list.map((p) => nameOf(byId(p.id))).concat(["Cancel"]));
      if (i < 0 || i >= list.length) return;
      const p = list[i];
      if (!(await env.confirm("Put away the " + nameOf(byId(p.id)) + "?"))) return;
      list.splice(i, 1);
      give(p.id) || (state().have[p.id] = (state().have[p.id] || 0) + 1);
      env.refresh();
      await env.persist();
      await env.say("The " + nameOf(byId(p.id)) + " was put away.");
    }
    async function toss() {
      const d = await pickOwned("Toss which?", (e) => has(e.id));
      if (!d) return;
      if (!(await env.confirm("Toss the " + nameOf(d) + "?"))) return;
      take(d.id);
      await env.persist();
      await env.say("The " + nameOf(d) + " was tossed out.");
    }
    async function menu(ctx, map) {
      for (;;) {
        const i = await env.choose("What would you like to do?", ["Decorate", "Put away", "Toss", "Cancel"]);
        if (i === 0) await decorate(ctx, map);
        else if (i === 1) await putAway(ctx);
        else if (i === 2) await toss();
        else return;
      }
    }

    // ---------- A Decoration shop (pokemartdecoration) ----------
    async function mart(keys) {
      const items = keys.map(byKey).filter(Boolean);
      for (;;) {
        const i = await env.choose("Money: " + env.money() + ". Which?", items.map((d) => d.name + "  " + d.price).concat(["Cancel"]));
        if (i < 0 || i >= items.length) return;
        const d = items[i];
        await env.say(d.desc.join(" "));
        if (!(await env.confirm("The " + d.name + " costs " + d.price + ". Buy it?"))) continue;
        if (env.money() < d.price) { await env.say("You don't have enough money."); continue; }
        if (!give(d.id)) { await env.say("There's no more room for decorations of that kind."); continue; }
        env.addMoney(-d.price);
        env.sfx("se_shop");
        await env.persist();
        await env.say("Thank you! The " + d.name + " is yours.");
      }
    }

    return { give, has, count, overlay, menu, mart, byKey, byId, contextOf, state, placedOf, take, canPlace, furnish };
  }

  window.HoennDecor = { create, CAPACITY };
})();
