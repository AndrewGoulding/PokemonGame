// Object Arrangement's screen for one of Johto's Safari Zone Areas, drawn in
// FireRed's look (its font and window frames at 240x160): the Area's
// picture on a grid, half size, scrolling with the cursor; its objects in
// HGSS's pictures (tools/build-johto-safari.js); beside it the Area's
// objects (up to 30), the days it's been in the layout and its points of
// each kind (what brings its bonus Pokémon: ui/johto-safari.js).
//
//   await JohtoSafariObjects.open(api, { frame })   // until B
//
// The D-pad moves the cursor a tile; A on an open spot picks an object (by
// kind: Baoba's groups you have) and holds it there, A again puts it down;
// A on an object picks it up to move it, or takes it away; B puts back
// what you're holding, or leaves.
//
// api (ui/johto-safari.js's arrange()): area ({ name, key }), objects()
// ([{ id, x, y }]), def(id) ({ name, type, w, h }), sprite(id) ([x in the
// sheet, w, h, dx, dy]), sheet (its file), max, groups() ([{ kind, ids }]),
// fits(id, x, y, skip), objectAt(x, y), place(id, x, y), remove(k),
// move(k, x, y), points() ({ points, count }), days(), sfx(name).
(function () {
  "use strict";

  const W = 240, H = 160, T = 8;   // (the Area's tiles at half size: 8 pixels)
  const VIEW = { x: 8, y: 24, tiles: 16 }, PANEL = { x: 152, y: 24, w: 80, h: 128 };
  const GM = () => window.GBA_MENUS;
  const WHITE = [255, 255, 255], DARK = [98, 98, 98], LIGHT = [213, 213, 205];
  // (The Safari Zone's greens, for the screen round the windows.)
  const GREEN = [112, 168, 96], GREEN_DARK = [56, 104, 56], GREEN_LIGHT = [152, 200, 128], RED = [224, 56, 40];
  const KIND = { plains: "Plains", forest: "Forest", peak: "Peak", water: "Waterside" };
  const AREA = (key) => "assets/world/maps/SafariZone_EntranceExterior-patch-" + key + ".png";

  let canvas = null, out = null;
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.className = "party-menu safari-objects hidden";
    canvas.width = W * 2; canvas.height = H * 2;
    const overlay = document.getElementById("overlay");
    overlay.parentNode.insertBefore(canvas, overlay);
    out = canvas.getContext("2d");
    out.imageSmoothingEnabled = false;
  }
  const load = (src) => new Promise((resolve) => { const i = new Image(); i.onload = i.onerror = () => resolve(i); i.src = src; });

  async function open(api, opts) {
    opts = opts || {};
    ensureCanvas();
    const [area, sheet] = await Promise.all([load(AREA(api.area.key)), load(api.sheet)]);
    // The cursor (a tile), the view's corner, what you hold ({ id, from: the
    // object's index when moving }), and the panel's list when choosing.
    const ui = { x: 16, y: 16, vx: 8, vy: 8, hold: null, list: null, at: 0, msg: null };
    const D = api.def;
    // (Where a held object's bottom left tile goes: its tiles round the cursor.)
    const anchor = (id) => ({ x: ui.x, y: ui.y + D(id).h - 1 });

    function paint() {
      const s = GbaMenus.Surface(), frame = "type" + ((opts.frame || 0) + 1), fp = GM().frames[frame].palette;
      s.fill(0, 0, W, H, GREEN);
      for (let y = 18; y < H; y += 8) s.fill(0, y, W, 1, GREEN_LIGHT);
      s.fill(0, 0, W, 17, GREEN_DARK);
      s.text("Object Arrangement", 6, 2, WHITE, DARK);
      s.text(api.area.name, W - 6 - s.textWidth(api.area.name), 2, WHITE, DARK);
      s.frame(frame, fp, 1, 3, 16, 16);
      s.frame(frame, fp, 19, 3, 10, 16);
      s.fill(PANEL.x, PANEL.y, PANEL.w, PANEL.h, WHITE);
      const line = (t, i, color) => s.text(t, PANEL.x + 4, PANEL.y + 2 + 12 * i, color || DARK, LIGHT, "small");
      if (ui.list) {
        line(ui.list.title, 0, RED);
        ui.list.items.forEach((t, i) => {
          const y = PANEL.y + 2 + 12 * (i + 1);
          s.text(t, PANEL.x + 12, y, DARK, LIGHT, "small");
          if (i === ui.at) s.text("▶", PANEL.x + 3, y, DARK, LIGHT, "small");
        });
      } else {
        const p = api.points(), objs = api.objects();
        line("Objects " + objs.length + "/" + api.max, 0);
        line("Days " + api.days(), 1);
        Object.keys(KIND).forEach((k, i) => line((k === "water" ? "Water" : KIND[k]) + " " + p.count[k] + " " + p.points[k] + "pt", 2 + i));
        const k = api.objectAt(ui.x, ui.y);
        const name = ui.hold ? D(ui.hold.id).name : k >= 0 ? D(objs[k].id).name : "";
        if (name) line(name, 6, RED);
        const help = ui.msg || (ui.hold ? "A: Put down\nB: Back" : k >= 0 ? "A: Move or\nremove" : "A: Place\nB: Exit");
        help.split("\n").forEach((t, i) => line(t, 8 + i));
      }
      out.clearRect(0, 0, W * 2, H * 2);
      out.drawImage(s.canvas(), 0, 0, W * 2, H * 2);
      // The Area at half size (its picture's 16 pixels a tile: 1:1 on the
      // doubled canvas), its grid, its objects, and the cursor.
      const vx = VIEW.x * 2, vy = VIEW.y * 2, size = VIEW.tiles * T * 2;
      out.save();
      out.beginPath(); out.rect(vx, vy, size, size); out.clip();
      if (area.naturalWidth) out.drawImage(area, ui.vx * 16, ui.vy * 16, size, size, vx, vy, size, size);
      out.fillStyle = "rgba(255,255,255,0.18)";
      for (let i = 1; i < VIEW.tiles; i++) { out.fillRect(vx + i * 16, vy, 1, size); out.fillRect(vx, vy + i * 16, size, 1); }
      const tile = (x, y) => [vx + (x - ui.vx) * 16, vy + (y - ui.vy) * 16];
      const draw = (id, x, y, alpha) => {
        const [sx, w, h, dx, dy] = api.sprite(id), [px, py] = tile(x, y - D(id).h + 1);
        if (!sheet.naturalWidth) { out.fillStyle = "#806040"; out.fillRect(px + 2, py + 2, D(id).w * 16 - 4, D(id).h * 16 - 4); return; }
        out.globalAlpha = alpha; out.drawImage(sheet, sx, 0, w, h, px + dx, py + dy, w, h); out.globalAlpha = 1;
      };
      api.objects().map((o, k) => [o, k]).sort((a, b) => a[0].y - b[0].y).forEach(([o, k]) => {
        if (!ui.hold || ui.hold.from !== k) draw(o.id, o.x, o.y, 1);
      });
      let fx = ui.x, fy = ui.y, fw = 1, fh = 1, ok = true;
      if (ui.hold) {
        const a = anchor(ui.hold.id), d = D(ui.hold.id);
        ok = api.fits(ui.hold.id, a.x, a.y, ui.hold.from == null ? -1 : ui.hold.from);
        draw(ui.hold.id, a.x, a.y, 0.6);
        fw = d.w; fh = d.h;
      } else {
        const k = api.objectAt(ui.x, ui.y);
        if (k >= 0) { const o = api.objects()[k], d = D(o.id); fx = o.x; fy = o.y - d.h + 1; fw = d.w; fh = d.h; }
      }
      const [cx, cy] = tile(fx, fy);
      out.lineWidth = 2; out.strokeStyle = ok ? "rgb(248,248,248)" : "rgb(224,56,40)";
      out.strokeRect(cx + 1, cy + 1, fw * 16 - 2, fh * 16 - 2);
      out.restore();
    }
    // (The view follows the cursor, three tiles from its edges.)
    function scroll() {
      const n = VIEW.tiles, m = 3;
      if (ui.x < ui.vx + m) ui.vx = ui.x - m; else if (ui.x > ui.vx + n - 1 - m) ui.vx = ui.x - n + 1 + m;
      if (ui.y < ui.vy + m) ui.vy = ui.y - m; else if (ui.y > ui.vy + n - 1 - m) ui.vy = ui.y - n + 1 + m;
      ui.vx = Math.max(0, Math.min(32 - n, ui.vx)); ui.vy = Math.max(0, Math.min(32 - n, ui.vy));
    }
    // A list in the panel: -> the index, or -1 (B).
    async function choose(title, items) {
      ui.list = { title, items }; ui.at = 0;
      for (;;) {
        paint();
        const k = await GbaMenus.keys((k) => k);
        if (k === "up" || k === "down") { ui.at = (ui.at + (k === "up" ? items.length - 1 : 1)) % items.length; api.sfx("se_select"); }
        else if (k === "a" || k === "b") { ui.list = null; if (k === "a") api.sfx("se_select"); return k === "a" ? ui.at : -1; }
      }
    }
    async function pick() {
      const groups = api.groups();
      if (api.objects().length >= api.max) { ui.msg = "Cannot place\nany more."; return; }
      const g = await choose("Which kind?", groups.map((x) => KIND[x.kind]));
      if (g < 0) return;
      const ids = groups[g].ids, i = await choose(KIND[groups[g].kind], ids.map((id) => D(id).name));
      if (i >= 0) ui.hold = { id: ids[i], from: null };
    }

    canvas.classList.remove("hidden");
    api.sfx("se_win_open");
    try {
      for (;;) {
        scroll();
        paint();
        const k = await GbaMenus.keys((k) => k);
        ui.msg = null;
        const step = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[k];
        if (step) { ui.x = Math.max(0, Math.min(31, ui.x + step[0])); ui.y = Math.max(0, Math.min(31, ui.y + step[1])); continue; }
        if (k === "b") { if (ui.hold) { ui.hold = null; continue; } break; }
        if (k !== "a") continue;
        if (ui.hold) {
          const a = anchor(ui.hold.id), from = ui.hold.from;
          if (!api.fits(ui.hold.id, a.x, a.y, from == null ? -1 : from)) { ui.msg = ui.hold.id === 10 ? "It goes on\nthe water." : "No space\nthere."; api.sfx("se_failure"); continue; }
          if (from == null) api.place(ui.hold.id, a.x, a.y); else api.move(from, a.x, a.y);
          ui.msg = "Placed the\n" + D(ui.hold.id).name + "."; ui.hold = null; api.sfx("se_select");
          continue;
        }
        const at = api.objectAt(ui.x, ui.y);
        if (at < 0) { await pick(); continue; }
        const o = api.objects()[at], c = await choose(D(o.id).name, ["Move", "Remove", "Cancel"]);
        if (c === 0) { ui.hold = { id: o.id, from: at }; ui.x = o.x; ui.y = o.y - D(o.id).h + 1; }
        else if (c === 1) { api.remove(at); ui.msg = "Removed the\n" + D(o.id).name + "."; api.sfx("se_click"); }
      }
    } finally {
      canvas.classList.add("hidden");
    }
  }

  window.JohtoSafariObjects = { open };
})();
