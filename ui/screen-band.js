// The screen's top 32 lines over a full-screen menu (this game's own: its screen is 240x192, FireRed's 240x160
// with 32 more lines on top). Every menu, minigame and scene is still FireRed's 240x160 picture, at the bottom of
// the screen (.gba, so it lines up with the text box); this band carries each of them on up to the top: each column
// of the band is that column's colour at the top of whatever covers the 240x160 there (the first coloured pixel in
// its top 8 lines, so a window frame's line is never stacked; a background's colours carry on up as they are), the
// topmost thing that covers it winning, as the screen shows them. Where nothing covers the top (the map with only
// the Start menu over it, a battle), the band is clear and the map or the battle's backdrop shows. An HTML scene
// (a list, the Town Map's page) carries on its own background colour.
//
// It runs by itself (a few times a second, and only while something's there to carry on).
(function () {
  "use strict";
  const W = 240, LINES = 8, EVERY = 3;   // (columns; the top lines looked in; every 3rd frame, 20 a second)
  const screen = document.querySelector(".screen"), gba = document.querySelector(".gba");
  if (!screen || !gba) return;
  const band = document.createElement("canvas");
  band.id = "screen-band";
  band.className = "screen-band";
  band.width = W; band.height = 1;
  band.setAttribute("aria-hidden", "true");
  screen.appendChild(band);
  const bg = band.getContext("2d");
  const out = bg.createImageData(W, 1);
  const probe = document.createElement("canvas");
  probe.width = W; probe.height = LINES;
  const pg = probe.getContext("2d", { willReadFrequently: true });

  const shown = (el) => {
    if (!el.isConnected || el.classList.contains("hidden")) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0 && el.getClientRects().length > 0;
  };
  // The first colour in a CSS background (an HTML scene's gradient's top), or null.
  function cssColour(el) {
    const cs = getComputedStyle(el), m = /rgba?\([^)]*\)/.exec(cs.backgroundImage || "");
    const c = m ? m[0] : cs.backgroundColor;
    const n = c && c.match(/[\d.]+/g);
    if (!n || (n.length > 3 && +n[3] === 0)) return null;
    return [+n[0], +n[1], +n[2]];
  }

  // An HTML scene's colour at its top: the innermost thing across its whole width at its top that has a background
  // of its own (a minigame's frame round its board, a list's page), else the scene's.
  function sceneColour(scene, top) {
    let el = scene, colour = cssColour(scene);
    for (;;) {
      const next = [...el.children].find((c) => {
        if (!shown(c)) return false;
        const r = c.getBoundingClientRect();
        return Math.abs(r.top - top.top) <= 2 && r.width >= top.width - 2;
      });
      if (!next) return colour;
      colour = cssColour(next) || colour;
      el = next;
    }
  }

  let tick = 0, on = false;
  function frame() {
    requestAnimationFrame(frame);
    if (++tick % EVERY) return;
    const top = gba.getBoundingClientRect();
    if (!top.width) return;
    // (What's at the 240x160's top, back to front: its canvases (not the battle's own, inside #field, whose
    // backdrop has its own band), and an HTML scene showing.)
    const layers = [];
    const scene = document.getElementById("scene");
    for (const el of gba.querySelectorAll("canvas, #scene")) {
      if (el.closest("#field") || !shown(el)) continue;
      const r = el.getBoundingClientRect();
      if (Math.abs(r.top - top.top) > 2 || r.width < top.width - 2) continue;
      layers.push({ el, z: +getComputedStyle(el).zIndex || 0 });
    }
    // (an HTML scene with nothing at its top but its background: its colour)
    if (scene && shown(scene) && !layers.some((l) => l.el === scene)) layers.push({ el: scene, z: 0 });
    const d = out.data;
    d.fill(0);
    let any = false;
    // (front to back: the first that's coloured in a column has it)
    const order = layers.map((l, i) => ({ ...l, i })).sort((a, b) => b.z - a.z || b.i - a.i);
    for (const { el } of order) {
      if (el.tagName !== "CANVAS") {
        const c = sceneColour(el, top);
        if (!c) continue;
        for (let x = 0; x < W; x++) if (!d[x * 4 + 3]) { d[x * 4] = c[0]; d[x * 4 + 1] = c[1]; d[x * 4 + 2] = c[2]; d[x * 4 + 3] = 255; any = true; }
        continue;
      }
      if (!el.width || !el.height) continue;
      pg.clearRect(0, 0, W, LINES);
      try { pg.drawImage(el, 0, 0, el.width, el.height * LINES / 160, 0, 0, W, LINES); } catch (e) { continue; }
      const px = pg.getImageData(0, 0, W, LINES).data;
      // (Only something that covers the top: a window or two over the map, the Start menu's, doesn't.)
      let covered = 0;
      for (let x = 0; x < W; x++) for (let y = 0; y < LINES; y++) if (px[(y * W + x) * 4 + 3] >= 200) { covered++; break; }
      if (covered < W * 0.9) continue;
      for (let x = 0; x < W; x++) {
        if (d[x * 4 + 3]) continue;
        for (let y = 0; y < LINES; y++) {
          const i = (y * W + x) * 4;
          if (px[i + 3] < 200) continue;
          d[x * 4] = px[i]; d[x * 4 + 1] = px[i + 1]; d[x * 4 + 2] = px[i + 2]; d[x * 4 + 3] = 255; any = true;
          break;
        }
      }
    }
    if (any) { bg.putImageData(out, 0, 0); if (!on) { band.classList.add("on"); on = true; } }
    else if (on) { band.classList.remove("on"); on = false; }
  }
  requestAnimationFrame(frame);
  window.ScreenBand = { refresh: () => { tick = EVERY - 1; } };
})();
