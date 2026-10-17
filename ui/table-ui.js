// The card tables' panel under the screen (ui/poker.js, ui/blackjack.js,
// ui/mahjong.js), the way FireRed asks in a battle: what's happening in a
// message window on the left (the standard frame), the choices in a window
// in your frame (the Option screen's FRAME) on the right, ▶ at the one
// picked. Both in FireRed's font, its dark grey with the light shadow, the
// frames drawn from data/gba-menus.js.
//
//   TableUI.panel({ message, items: [{ label }], cursor, onPick(i) })   // (items may be empty: just the message)
//   TableUI.move(cursor, count, key)   // -> the cursor after an arrow key (the choices in two rows), or null
//   TableUI.clear()
(function () {
  const esc = (s) => window.Screen.escapeHtml(String(s));
  const urls = {};
  // A frame's 3x3 tiles (24x24) as a picture for border-image, the middle filled.
  function frameUrl(name) {
    if (urls[name]) return urls[name];
    const G = window.GBA_MENUS, f = G && G.frames[name];
    if (!f) return null;
    const pal = name === "std" ? G.palettes.std3 : f.palette;
    const c = document.createElement("canvas");
    c.width = c.height = 24;
    const ctx = c.getContext("2d"), img = ctx.createImageData(24, 24);
    for (let i = 0; i < 576; i++) {
      const v = parseInt(f.px[i], 16);
      if (!v) continue;
      img.data.set(pal[v].concat([255]), i * 4);
    }
    ctx.putImageData(img, 0, 0);
    return (urls[name] = c.toDataURL());
  }
  const columns = (n) => (n <= 2 ? 1 : Math.ceil(n / 2));   // (two rows at most)

  let current = null;
  function menu() { return document.getElementById("menu"); }
  function onClick(e) {
    const b = e.target.closest && e.target.closest("[data-choice]");
    if (b && current && current.onPick) { e.preventDefault(); current.onPick(+b.dataset.choice); }
  }
  function panel(opts) {
    const el = menu();
    if (!el) return;
    current = opts;
    if (!el.dataset.tableUi) { el.dataset.tableUi = "1"; el.addEventListener("click", onClick); }
    const frame = "type" + (((window.GameOptions && window.GameOptions.get().frame) || 0) + 1);
    const items = opts.items || [];
    const msg = String(opts.message || "");
    el.classList.add("table-menu");
    el.innerHTML = '<div class="tbl-panel" style="--std:url(' + frameUrl("std") + ");--frame:url(" + frameUrl(frame) + ')">' +
      '<div class="tbl-win tbl-msg' + (msg.length > 64 ? " long" : "") + '">' + esc(msg) + "</div>" +
      (items.length ? '<div class="tbl-win tbl-choices" style="--cols:' + columns(items.length) + '">' +
        items.map((it, i) => '<button type="button" class="tbl-choice' + (i === opts.cursor ? " cursor" : "") + '" data-choice="' + i + '">' + esc(it.label) + "</button>").join("") +
      "</div>" : "") + "</div>";
  }
  function move(cursor, n, key) {
    if (!n) return null;
    const cols = columns(n);
    const step = { ArrowLeft: -1, a: -1, A: -1, ArrowRight: 1, d: 1, D: 1, ArrowUp: -cols, ArrowDown: cols }[key];
    if (step == null) return null;
    return ((cursor + step) % n + n) % n;
  }
  function clear() {
    current = null;
    const el = menu();
    if (!el) return;
    el.classList.remove("table-menu");
    el.innerHTML = "";
  }
  window.TableUI = { panel, move, clear };
})();
