// FireRed's Pokédex (src/pokedex_screen.c), drawn the way the game draws it at
// 240x160 (assets/pokedex/, data/pokedex-screen.js, tools/build-pokedex-screen.js):
//
//   the table of contents   POKéMON LIST (numerical), the nine habitats, SEARCH
//                           (A to Z, type, lightest, smallest) and CLOSE, with
//                           each choice's picture and the Seen / Owned counts
//   a list                  "No001", the caught ball, the name (----- if unseen)
//                           and, caught, its types
//   a habitat's pages       up to four Pokémon a page in their circles, with cards
//   an entry                number, name, category, height, weight, footprint,
//                           picture and description (caught: all of it; seen:
//                           the picture and name, ?? for the rest)
//   AREA / SIZE             where it lives on the map of Kanto, and its size
//                           next to yours
//
//   await PokedexScreen.open({
//     entries,     // [{ id, species, seen, caught }] in National Dex order
//     areas,       // (species) => [MAPSEC, ...] where it can be found
//     trainer,     // your front picture's URL (the size comparison)
//     cry,         // (species) => void
//     register     // a species: just caught; show its habitat page, then its entry ({A}NEXT)
//   })
(function () {
  "use strict";

  const W = 240, H = 160;
  const canvas = document.createElement("canvas");
  canvas.className = "party-menu hidden";
  canvas.width = W * 2; canvas.height = H * 2;
  const overlayEl = document.getElementById("overlay");
  overlayEl.parentNode.insertBefore(canvas, overlayEl);
  const out = canvas.getContext("2d");
  const off = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const g = off.getContext("2d");

  const images = {};
  function image(url) {
    if (!url) return null;
    if (!images[url]) { const img = new Image(); img.src = url; images[url] = img; }
    return images[url];
  }
  const A = (n) => image("assets/pokedex/" + n + ".png");
  ["wallpaper", "entry", "area", "habitat", "circle-0", "circle-1", "circle-2", "circle-3", "circle-4", "mini-page", "caught-marker",
    "ball", "map-kanto", "footprints"].forEach(A);
  const ready = (img) => img && img.complete && img.naturalWidth;
  const D = () => window.POKEDEX_SCREEN;

  // Colours: palette 0's black on beige (set 0), its orange on red (set 2), and
  // the bars' white on grey on tan.
  const BLACK = [0, 0, 0], BEIGE = [230, 222, 197], ORANGE = [255, 139, 57], RED = [205, 65, 57];
  const BAR = [197, 180, 139], WHITE = [255, 255, 255], GREY = [98, 98, 98], LOCKED = [[238, 238, 230], [213, 213, 213]];
  // (Palette 15: the button icons' colours too.)
  const KEYS_PAL = [[255, 255, 255], WHITE, GREY, [213, 213, 205], [230, 8, 8], [255, 189, 115], [32, 156, 8], [148, 246, 148],
    [49, 82, 205], [164, 197, 246], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], BAR];
  const TYPES = ["Normal", "Fire", "Water", "Grass", "Electric", "Rock", "Ground", "Ice", "Flying", "Fighting", "Ghost", "Bug",
    "Poison", "Psychic", "Steel", "Dark", "Dragon"];

  let st = null, raf = 0;
  const se = (n) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(n); };
  const keys = (f) => window.GbaMenus.keys(f);
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const S = () => window.GbaMenus.Surface();
  const pad3 = (n) => String(n).padStart(3, "0");
  const DEX = (sp) => window.DEX[sp] || {};
  const text = (sp) => ((window.POKEDEX_TEXT || {})[DEX(sp).id]) || {};
  const nameOf = (sp) => (window.Party && window.Party.speciesName ? window.Party.speciesName(sp) : sp);

  // ---------- Drawing helpers ----------

  function present() {
    out.save();
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.imageSmoothingEnabled = false;
    out.clearRect(0, 0, canvas.width, canvas.height);
    out.drawImage(off, 0, 0, canvas.width, canvas.height);
    if (st && st.fade) { out.fillStyle = st.fadeColour + st.fade + ")"; out.fillRect(0, 32, canvas.width, canvas.height - 64); }
    out.restore();
  }
  // The header and footer bars (BG0 windows in palette 15).
  function bars(s, header, footer, headerRight) {
    s.fill(0, 0, 240, 16, BAR);
    s.fill(0, 144, 240, 16, BAR);
    if (header) {
      if (headerRight != null) { s.text(header, 8, 2, WHITE, GREY); s.text(headerRight, 232 - s.textWidth(headerRight), 2, WHITE, GREY); }
      else s.text(header, Math.floor((240 - s.textWidth(header)) / 2), 2, WHITE, GREY);
    }
    if (footer) {
      const parts = [].concat(footer);
      const right = parts[parts.length - 1], left = parts.length > 1 ? parts[0] : null;
      if (left) s.text(left, 8, 146, WHITE, GREY, "small", KEYS_PAL);
      s.text(right, 236 - footerWidth(s, right), 146, WHITE, GREY, "small", KEYS_PAL);
    }
  }
  function footerWidth(s, str) {
    let w = 0;
    for (const part of String(str).split(/(\{[A-Z_]+\})/)) {
      const icon = /^\{([A-Z_]+)\}$/.exec(part);
      const ic = icon && window.GBA_MENUS.icons[icon[1]];
      w += ic ? ic.width : part ? s.textWidth(part, "small") : 0;
    }
    return w;
  }
  // Red scroll arrows (red_arrow_other.png), bobbing.
  function arrows(up, down, x, yUp, yDown) {
    const img = image("assets/bag/arrows.png");
    if (!ready(img)) return;
    const bob = Math.trunc(Math.sin(((st.tick * 8) & 255) / 256 * 2 * Math.PI) * 2);
    if (up) g.drawImage(img, 0, 16, 16, 16, x - 8, yUp - 8 - bob, 16, 16);
    if (down) { g.save(); g.translate(x - 8, yDown + 8 + bob); g.scale(1, -1); g.drawImage(img, 0, 16, 16, 16, 0, 0, 16, 16); g.restore(); }
  }
  // A type's icon (menu_info.png, the Summary screen's sheet).
  let typeSheet = null;
  function typeIcon(type, x, y) {
    if (!typeSheet) {
      const d = window.SUMMARY_SCREEN, sh = d && d.sheets.menuInfo;
      if (!sh) return;
      const px = atob(sh.px), c = document.createElement("canvas");
      c.width = sh.width; c.height = sh.height;
      const cx = c.getContext("2d"), im = cx.createImageData(sh.width, sh.height), pal = d.pals.types;
      for (let i = 0; i < px.length; i++) {
        const v = px.charCodeAt(i) & 15;
        if (!v) continue;
        const col = pal[v] || [0, 0, 0];
        im.data.set([col[0], col[1], col[2], 255], i * 4);
      }
      cx.putImageData(im, 0, 0);
      typeSheet = c;
    }
    const i = TYPES.indexOf(type), sx = i < 0 ? 32 : ((i % 4) * 32), sy = i < 0 ? 80 : 16 + Math.floor(i / 4) * 16;
    g.drawImage(typeSheet, sx, sy, 32, 12, x, y, 32, 12);
  }
  // A front picture (96x96) drawn into a 64x64 box at (x, y), feet at its bottom.
  function pic(species, x, y, opts) {
    const img = image(window.Screen.spriteUrl(species, "", false, false));
    if (!ready(img)) return;
    const empty = ((window.SPRITE_METRICS || {}).front || {})[DEX(species).id] || 0;
    g.save(); g.beginPath(); g.rect(x, y, 64, 64); g.clip();
    g.drawImage(img, x - 16, y + 64 - (96 - empty) + ((opts && opts.lift) || 0));
    g.restore();
  }

  // ---------- Fades ----------

  async function fade(to, colour) {
    st.fadeColour = colour || "rgba(255,255,255,";
    const from = st.fade || 0;
    for (let i = 1; i <= 9; i++) { st.fade = from + (to - from) * i / 9; await nextFrame(); }
    st.fade = to;
  }

  // ---------- The table of contents ----------

  function menuItems() {
    const seen = new Set(st.entries.filter((e) => e.seen).map((e) => e.species));
    const it = [{ head: "Pokémon list" }, { label: "Numerical mode", act: "numerical", icon: "numerical" }, { head: "Pokémon habitats" }];
    D().habitats.forEach((h, i) => it.push({ label: h.name + " Pokémon", act: "habitat", habitat: i, icon: h.icon,
      locked: !h.pages.some((p) => p.some((sp) => seen.has(sp))) }));
    it.push({ head: "Search" }, { label: "A to Z mode", act: "abc", icon: "abc" }, { label: "Type mode", act: "type", icon: "type" },
      { label: "Lightest mode", act: "lightest", icon: "lightest" }, { label: "Smallest mode", act: "smallest", icon: "smallest" },
      { head: "Other" }, { label: "Close Pokédex", act: "close", icon: "cancel" });
    return it;
  }
  function drawMenu() {
    const m = st.menu, items = m.items, s = S();
    if (ready(A("wallpaper"))) g.drawImage(A("wallpaper"), 0, 0);
    for (let r = 0; r < 9; r++) {
      const it = items[m.top + r];
      if (!it) continue;
      const y = 18 + 14 * r;
      if (it.head) s.text(it.head, 8, y, ORANGE, RED);
      else s.text(it.label, 20, y, it.locked ? LOCKED[0] : BLACK, it.locked ? LOCKED[1] : BEIGE);
      if (m.top + r === m.cursor) s.text("▶", 12, y, BLACK, BEIGE);
    }
    const cur = items[m.cursor], icon = cur && cur.icon && A("cat-" + cur.icon);
    if (ready(icon)) g.drawImage(icon, 168, 88);
    const seen = st.entries.filter((e) => e.seen).length, owned = st.entries.filter((e) => e.caught).length;
    s.text("Seen:", 168, 25, BLACK, BEIGE);
    s.text(String(seen).padStart(3, " "), 200, 37, ORANGE, RED);
    s.text("Owned:", 168, 53, BLACK, BEIGE);
    s.text(String(owned).padStart(3, " "), 200, 65, ORANGE, RED);
    bars(s, "Pokédex   Table of contents", "{DPAD_UPDOWN}Pick {A_BUTTON}OK");
    g.drawImage(s.canvas(), 0, 0);
    arrows(m.top > 0, m.top + 9 < items.length, 200, 19, 141);
  }
  // ListMenu's scrolling: the ▶ moves freely to row 5 going down (3 going up), then the list scrolls.
  function listMove(m, dir, n, skip) {
    let c = m.cursor + dir;
    while (c >= 0 && c < n && skip && skip(c)) c += dir;
    if (c < 0 || c >= n) return false;
    m.cursor = c;
    if (dir > 0 && m.cursor - m.top > 5 && m.top + 9 < n) m.top = Math.min(n - 9, m.cursor - 5);
    if (dir < 0 && m.cursor - m.top < 3 && m.top > 0) m.top = Math.max(0, m.cursor - 3);
    return true;
  }

  // ---------- Lists ----------

  function makeList(mode) {
    const seen = st.entries.filter((e) => e.seen), caught = st.entries.filter((e) => e.caught);
    let rows, header = "Search";
    if (mode === "numerical") {
      const last = Math.max(0, ...seen.map((e) => e.id));
      rows = st.entries.filter((e) => e.id <= last);
      header = "Pokémon list";
    } else if (mode === "abc") rows = seen.slice().sort((a, b) => nameOf(a.species).localeCompare(nameOf(b.species)));
    else if (mode === "type") rows = caught.slice().sort((a, b) => TYPES.indexOf(DEX(a.species).types[0]) - TYPES.indexOf(DEX(b.species).types[0]) || a.id - b.id);
    else if (mode === "lightest") rows = caught.slice().sort((a, b) => DEX(a.species).weight - DEX(b.species).weight || a.id - b.id);
    else rows = caught.slice().sort((a, b) => DEX(a.species).height - DEX(b.species).height || a.id - b.id);
    return { mode, rows, header, cursor: 0, top: 0 };
  }
  function drawList() {
    const L = st.list, s = S();
    if (ready(A("wallpaper"))) g.drawImage(A("wallpaper"), 0, 0);
    for (let r = 0; r < 9; r++) {
      const e = L.rows[L.top + r];
      if (!e) continue;
      const y = 18 + 14 * r;
      s.text("{NO}", 28, y + 2, BLACK, BEIGE, "small");
      s.text(pad3(e.id), 37, y + 2, BLACK, BEIGE, "small");
      s.text(e.seen ? nameOf(e.species) : "-----", 72, y, BLACK, BEIGE);
      if (L.top + r === L.cursor) s.text("▶", 20, y, BLACK, BEIGE);
      if (e.caught) {
        if (ready(A("ball"))) g.drawImage(A("ball"), 56, y + 1);
        const t = DEX(e.species).types || [];
        typeIcon(t[0], 136, y + 1);
        if (t[1] && t[1] !== t[0]) typeIcon(t[1], 168, y + 1);
      }
    }
    bars(s, L.header, "{DPAD_UPDOWN}Pick {A_BUTTON}OK {B_BUTTON}Cancel");
    g.drawImage(s.canvas(), 0, 0);
    arrows(L.top > 0, L.top + 9 < L.rows.length, 200, 19, 141);
  }

  // ---------- An entry ----------

  // Height (decimetres) as feet and inches, weight (hectograms) as pounds, FireRed's way.
  function feetInches(dm) {
    let t = Math.floor(10000 * dm / 254);
    if (t % 10 >= 5) t += 10;
    const ft = Math.floor(t / 120), inch = Math.floor((t - ft * 120) / 10);
    return (ft < 10 ? " " : "") + " " + ft + "’" + String(inch).padStart(2, "0") + "”";
  }
  function pounds(hg) {
    let l = Math.floor(hg * 100000 / 4536);
    if (l % 10 >= 5) l += 10;
    return String(Math.floor(l / 100)).padStart(4, " ") + "." + Math.floor((l % 100) / 10) + " lbs.";
  }
  function drawEntry() {
    const e = st.entry, sp = e.species, d = DEX(sp), t = text(sp), s = S();
    if (ready(A("entry"))) g.drawImage(A("entry"), 0, 0);
    pic(sp, 152, 24);
    s.text("{NO}", 16, 32, BLACK, BEIGE, "small");
    s.text(pad3(d.id), 25, 32, BLACK, BEIGE, "small");
    s.text(nameOf(sp), 44, 28, BLACK, BEIGE);
    const cat = e.caught && t.category ? t.category : "???????????";
    s.text(cat + " Pokémon", 16, 48, BLACK, BEIGE, "small");
    s.text("HT", 16, 60, BLACK, BEIGE, "small");
    s.text(e.caught ? feetInches(Math.round(d.height * 10)) : " ??’??”", 46, 60, BLACK, BEIGE, "small");
    s.text("WT", 16, 72, BLACK, BEIGE, "small");
    s.text(e.caught ? pounds(Math.round(d.weight * 10)) : "????.? lbs.", 46, 72, BLACK, BEIGE, "small");
    if (e.caught && d.id <= 386 && ready(A("footprints"))) g.drawImage(A("footprints"), (d.id % 32) * 16, Math.floor(d.id / 32) * 16, 16, 16, 104, 64, 16, 16);
    if (e.caught && t.description) {
      const lines = t.description.split("\n").slice(0, 3), widest = Math.max(...lines.map((l) => s.textWidth(l)));
      lines.forEach((l, i) => s.text(l, Math.floor((240 - widest) / 2), 96 + 14 * i, BLACK, [197, 180, 139]));
    }
    bars(s, st.entryHeader, st.registering ? "{A_BUTTON}Next" : ["{START_BUTTON}Cry", "{A_BUTTON}Next data {B_BUTTON}Cancel"]);
    g.drawImage(s.canvas(), 0, 0);
  }
  function sizeOf(sp) {
    const d = DEX(sp), known = D().sizes[d.id];
    if (known) return known;
    const scale = Math.max(256, Math.round(333 * Math.pow(Math.max(0.1, d.height || 1), -0.31)));
    return [scale, 0, 256, 0];
  }
  function silhouette(url, cx, cy, scale, offset, box) {
    const img = image(url);
    if (!ready(img)) return;
    const size = Math.round(64 * 256 / scale * img.naturalWidth / 64);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const cx2 = c.getContext("2d");
    cx2.imageSmoothingEnabled = false;
    cx2.drawImage(img, 0, 0, size, size);
    cx2.globalCompositeOperation = "source-in";
    cx2.fillStyle = "#525252"; cx2.fillRect(0, 0, size, size);
    g.save(); g.beginPath(); g.rect(box[0], box[1], box[2], box[3]); g.clip();
    g.drawImage(c, Math.round(cx - size / 2), Math.round(cy - size / 2 + offset * 64 / 64));
    g.restore();
  }
  function drawArea() {
    const e = st.entry, sp = e.species, d = DEX(sp), s = S();
    if (ready(A("area"))) g.drawImage(A("area"), 0, 0);
    const icon = image(window.Screen.iconUrl(sp));
    if (ready(icon)) g.drawImage(icon, 0, 0, 32, 32, 8, 16, 32, 32);
    s.text("{NO}" + pad3(d.id), 40, 18, BLACK, BEIGE, "small");
    s.text(nameOf(sp), 43, 28, BLACK, BEIGE);
    if (e.caught) { typeIcon(d.types[0], 40, 41); if (d.types[1]) typeIcon(d.types[1], 72, 41); }
    s.text("Size", 16 + Math.floor((80 - s.textWidth("Size", "small")) / 2), 60, BLACK, BEIGE, "small");
    s.text("Area", 144 + Math.floor((80 - s.textWidth("Area", "small")) / 2), 52, BLACK, BEIGE, "small");
    if (ready(A("map-kanto"))) g.drawImage(A("map-kanto"), 136, 64);
    // Where it lives: FireRed's markers, red over the map.
    const marks = (st.opts.areas ? st.opts.areas(sp) : []).map((sec) => D().markers[sec]).filter(Boolean);
    g.globalAlpha = 0.6;
    for (const [shape, x, y] of marks) { const m = A("marker-" + shape); if (ready(m)) g.drawImage(m, 104 + x, 64 + y); }
    g.globalAlpha = 1;
    if (!marks.length) s.text("Area unknown", 136 + Math.floor((96 - s.textWidth("Area unknown", "small")) / 2), 93, BLACK, BEIGE, "small");
    if (e.caught) {
      const [ps, po, ts, to] = sizeOf(sp), box = [16, 80, 80, 48];
      silhouette(window.Screen.spriteUrl(sp, "", false, false), 40, 104, ps * 96 / 64, po, box);
      if (st.opts.trainer) silhouette(st.opts.trainer, 80, 104, ts, to, box);
    }
    bars(s, st.entryHeader, ["{START_BUTTON}Cry", "{A_BUTTON}Cancel {B_BUTTON}Previous data"]);
    g.drawImage(s.canvas(), 0, 0);
  }

  // ---------- A habitat's pages ----------

  const SLOTS = [null, [[11, 3, 11, 11]], [[3, 3, 11, 3], [18, 9, 10, 11]], [[1, 2, 9, 2], [11, 9, 3, 11], [21, 3, 21, 11]],
    [[0, 2, 6, 3], [7, 10, 0, 12], [15, 10, 22, 11], [22, 2, 15, 4]]];
  function habitatPages(h) {
    const seen = new Set(st.entries.filter((e) => e.seen).map((e) => e.species));
    return D().habitats[h].pages.map((p, i) => ({ index: i, mons: p.filter((sp) => seen.has(sp)) })).filter((p) => p.mons.length);
  }
  function drawHabitat() {
    const hp = st.habitat, page = hp.pages[hp.page], s = S();
    if (ready(A("habitat"))) g.drawImage(A("habitat"), 0, 0);
    const slots = SLOTS[page.mons.length];
    page.mons.forEach((sp, i) => {
      const [cx, cy, kx, ky] = slots[i], sel = i === hp.cursor && !hp.noCursor;
      const circle = A("circle-" + (sel ? 1 + (Math.floor(st.tick / 4) % 4) : 0));
      if (ready(circle)) g.drawImage(circle, cx * 8, cy * 8);
      pic(sp, cx * 8, cy * 8);
      const x = kx * 8, y = ky * 8, e = st.entries.find((en) => en.species === sp);
      if (ready(A("mini-page"))) g.drawImage(A("mini-page"), x, y);
      if (e && e.caught && ready(A("caught-marker"))) g.drawImage(A("caught-marker"), x + 2, y + 3);
      s.text("{NO}", x + 12, y, BLACK, BEIGE, "small");
      s.text(pad3(DEX(sp).id), x + 21, y, BLACK, BEIGE, "small");
      s.text(nameOf(sp), x + 2, y + 13, BLACK, BEIGE);
      if (sel) { g.strokeStyle = "rgb(230,8,8)"; g.lineWidth = 2; g.strokeRect(x - 1, y - 1, 66, 42); }
    });
    const h = D().habitats[hp.habitat];
    if (hp.registering) bars(s, h.name + " Pokémon", "");
    else bars(s, h.name + " Pokémon", "{DPAD_LEFTRIGHT}Pick{PLUS}Flip page {A_BUTTON}Check {B_BUTTON}Cancel",
      "Page" + String(hp.page + 1).padStart(2, " ") + "/" + String(hp.pages.length).padStart(2, " "));
    g.drawImage(s.canvas(), 0, 0);
  }

  // ---------- The loop ----------

  function frame() {
    if (!st) return;
    st.tick++;
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#9c9cbd"; g.fillRect(0, 0, W, H);
    if (st.view === "menu") drawMenu();
    else if (st.view === "list") drawList();
    else if (st.view === "entry") drawEntry();
    else if (st.view === "area") drawArea();
    else if (st.view === "habitat") drawHabitat();
    present();
    raf = requestAnimationFrame(frame);
  }
  async function go(view) { await fade(1); st.view = view; await fade(0); }
  const cry = (sp) => { if (st.opts.cry) st.opts.cry(sp); };

  // An entry and its AREA page: B back to where it was opened from. -> when done.
  async function showEntry(e, from) {
    st.entry = e;
    for (;;) {
      const k = await keys((key) => (["a", "b", "start", "up", "down"].includes(key) ? key : undefined));
      if (k === "start") { cry(e.species); continue; }
      if (st.registering) { if (k === "a" || k === "b") return; continue; }
      if (st.view === "entry") {
        if (k === "a") { st.view = "area"; continue; }
        if (k === "b") return;
        if (from === "list" && (k === "up" || k === "down")) {
          // The next one seen in the list.
          const L = st.list, dir = k === "up" ? -1 : 1;
          let c = L.cursor + dir;
          while (c >= 0 && c < L.rows.length && !L.rows[c].seen) c += dir;
          if (c < 0 || c >= L.rows.length) continue;
          await fade(1);
          L.cursor = c;
          if (c - L.top > 5) L.top = Math.min(Math.max(0, L.rows.length - 9), c - 5);
          if (c - L.top < 3) L.top = Math.max(0, c - 3);
          st.entry = e = L.rows[c];
          cry(e.species);
          await fade(0);
        }
      } else if (st.view === "area") {
        if (k === "b") { st.view = "entry"; continue; }
        if (k === "a") return;
      }
    }
  }

  async function openList(mode) {
    st.list = st.lists[mode] && mode === "numerical" ? st.lists[mode] : makeList(mode);
    st.lists[mode] = st.list;
    if (!st.list.rows.length) return;
    await go("list");
    for (;;) {
      const k = await keys((key) => {
        const L = st.list;
        if (key === "up" || key === "down") { if (listMove(L, key === "up" ? -1 : 1, L.rows.length)) se("se_select"); }
        else if (key === "left" || key === "right") {
          const before = L.cursor, n = L.rows.length;
          L.cursor = Math.max(0, Math.min(n - 1, L.cursor + (key === "left" ? -9 : 9)));
          L.top = Math.max(0, Math.min(Math.max(0, n - 9), L.top + (key === "left" ? -9 : 9)));
          if (L.cursor < L.top) L.top = L.cursor;
          if (L.cursor >= L.top + 9) L.top = L.cursor - 8;
          if (L.cursor !== before) se("se_select");
        } else if (key === "a" || key === "b") return key;
        return undefined;
      });
      if (k === "b") { await go("menu"); return; }
      const e = st.list.rows[st.list.cursor];
      if (!e.seen) continue;
      if (mode !== "numerical") {
        // Search lists go to the habitat page it's on.
        const h = D().habitats.findIndex((hb) => hb.pages.some((p) => p.includes(e.species)));
        if (h >= 0) { await openHabitat(h, e.species, "list"); continue; }
      }
      st.entryHeader = st.list.header;
      await fade(1); st.entry = e; st.view = "entry"; cry(e.species); await fade(0);
      await showEntry(e, mode === "numerical" ? "list" : "search");
      await go("list");
    }
  }

  async function openHabitat(h, focus, back) {
    const pages = habitatPages(h);
    if (!pages.length) return;
    let page = 0, cursor = 0;
    if (focus) pages.forEach((p, i) => { const j = p.mons.indexOf(focus); if (j >= 0) { page = i; cursor = j; } });
    st.habitat = { habitat: h, pages, page, cursor };
    if (st.registering) { st.habitat.registering = true; st.view = "habitat"; await fade(0); }
    else await go("habitat");
    for (;;) {
      if (st.registering) {
        for (let i = 0; i < 30; i++) await nextFrame();
        st.habitat.noCursor = true;
      } else {
        const k = await keys((key) => {
          const hp = st.habitat, n = hp.pages[hp.page].mons.length;
          if (key === "left" || key === "right") {
            const dir = key === "left" ? -1 : 1, c = hp.cursor + dir;
            if (c >= 0 && c < n) { hp.cursor = c; se("se_select"); }
            else if (hp.page + dir >= 0 && hp.page + dir < hp.pages.length) {
              hp.page += dir; hp.cursor = dir > 0 ? 0 : hp.pages[hp.page].mons.length - 1; se("se_ball_tray_enter");
            }
          } else if (key === "a" || key === "b") return key;
          return undefined;
        });
        if (k === "b") { await go(back === "list" ? "list" : "menu"); return; }
        se("se_select");
      }
      const sp = st.habitat.pages[st.habitat.page].mons[st.habitat.cursor];
      const e = st.entries.find((en) => en.species === sp);
      st.entryHeader = D().habitats[h].name + " Pokémon";
      await fade(1); st.entry = e; st.view = "entry"; cry(sp); await fade(0);
      await showEntry(e, "habitat");
      if (st.registering) return;
      await go("habitat");
    }
  }

  async function open(opts) {
    st = { opts, entries: opts.entries, view: "menu", tick: 0, fade: 0, fadeColour: "rgba(255,255,255,", lists: {},
      menu: null, list: null, entry: null, habitat: null, registering: !!opts.register };
    const items = menuItems();
    st.menu = Object.assign({ items }, open.menuPos || { cursor: 1, top: 0 });
    canvas.classList.remove("hidden");
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    if (opts.register) {
      // Just caught: its habitat page, then its entry ({A}NEXT).
      st.fade = 1;
      const h = D().habitats.findIndex((hb) => hb.pages.some((p) => p.includes(opts.register)));
      const e = st.entries.find((en) => en.species === opts.register);
      if (h >= 0) await openHabitat(h, opts.register, "menu");
      else if (e) { st.entryHeader = "Pokédex"; st.entry = e; st.view = "entry"; cry(e.species); await fade(0); await showEntry(e, "register"); }
      await fade(1, "rgba(0,0,0,");
      close();
      return;
    }
    for (;;) {
      const k = await keys((key) => {
        const m = st.menu;
        if (key === "up" || key === "down") { if (listMove(m, key === "up" ? -1 : 1, m.items.length, (c) => !!m.items[c].head)) se("se_select"); }
        else if (key === "a" || key === "b") return key;
        return undefined;
      });
      open.menuPos = { cursor: st.menu.cursor, top: st.menu.top };
      const it = st.menu.items[st.menu.cursor];
      if (k === "b" || it.act === "close") break;
      if (it.act === "habitat") { if (!it.locked) await openHabitat(it.habitat, null, "menu"); }
      else await openList(it.act);
    }
    await fade(1, "rgba(0,0,0,");
    close();
  }

  function close() {
    st = null;
    cancelAnimationFrame(raf);
    canvas.classList.add("hidden");
  }

  window.PokedexScreen = { open, close };
})();
