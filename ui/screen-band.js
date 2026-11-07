// The screen's top 32 lines over a full-screen menu (this game's own: its screen is 240x192, FireRed's 240x160
// with 32 more lines on top). Every menu, minigame and scene is still FireRed's 240x160 picture, at the bottom of
// the screen (.gba, so it lines up with the text box); this band carries each of them on up to the top: each column
// of the band is that column's colour at the top of whatever covers the 240x160 there (the first coloured pixel in
// its top 8 lines, so a window frame's line is never stacked; a background's colours carry on up as they are), the
// topmost thing that covers it winning, as the screen shows them. Where nothing covers the top (the map with only
// the Start menu over it, a battle), the band is clear and the map or the battle's backdrop shows. An HTML scene
// (a list, the Town Map's page) carries on its own background colour. A canvas that has a picture of its own for
// the band (canvas.bandPaint(g): it draws the band's 240x32, as the PC's drifting backdrop carries on up; false if
// it has none just now) has it drawn instead, when it's the frontmost there.
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
  // (A canvas's own picture for the band: canvas.bandPaint.)
  const painted = document.createElement("canvas");
  painted.id = "screen-band-paint";
  painted.className = "screen-band";
  painted.width = W; painted.height = 32;
  painted.setAttribute("aria-hidden", "true");
  screen.appendChild(painted);
  const pgc = painted.getContext("2d");
  let paintOn = false;
  const paintShow = (v) => { if (v !== paintOn) { painted.classList.toggle("on", v); paintOn = v; } };
  const out = bg.createImageData(W, 1);
  let probe = document.createElement("canvas");
  probe.width = W; probe.height = LINES;
  let pg = probe.getContext("2d", { willReadFrequently: true });
  // (Opened from the disk (file://), a canvas that has drawn the game's pictures can't be read back: then the band
  // can't look for colours, and instead draws each full-screen canvas's top line straight up over black (so the
  // map never shows through a menu), leaving out #overlay's windows over the map.)
  let canRead = true;

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
    // (an HTML scene with nothing at its top but its background: its colour; not one that reaches the screen's top
    // itself, as the berry tree's and mining's do, with their header up there)
    const reachesTop = scene && scene.getBoundingClientRect().top < top.top - 2;
    if (scene && shown(scene) && !reachesTop && !layers.some((l) => l.el === scene)) layers.push({ el: scene, z: 0 });
    // (The frontmost one has its own picture for the band: that.)
    const front = layers.map((l, i) => ({ ...l, i })).sort((a, b) => b.z - a.z || b.i - a.i)[0];
    // (It may say it has none just now, returning false: then as any other.)
    if (front && typeof front.el.bandPaint === "function") {
      pgc.imageSmoothingEnabled = false;
      pgc.clearRect(0, 0, W, 32);
      if (front.el.bandPaint(pgc) !== false) {
        paintShow(true);
        if (on) { band.classList.remove("on"); on = false; }
        return;
      }
    }
    paintShow(false);
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
      if (!canRead) continue;
      pg.clearRect(0, 0, W, LINES);
      try { pg.drawImage(el, 0, 0, el.width, el.height * LINES / 160, 0, 0, W, LINES); } catch (e) { continue; }
      let px;
      try { px = pg.getImageData(0, 0, W, LINES).data; }
      catch (e) {
        // (Tainted: no reading from here on; a fresh probe, as this one stays tainted.)
        canRead = false;
        probe = document.createElement("canvas"); probe.width = W; probe.height = LINES;
        pg = probe.getContext("2d", { willReadFrequently: true });
        break;
      }
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
    if (!canRead) {
      // (Drawn, not read: black, then back to front each full-screen canvas's top line (#overlay's windows left
      // out) and each HTML scene's colour.)
      const draw = order.slice().reverse().filter(({ el }) => el.tagName !== "CANVAS" || (el.id !== "overlay" && el.width && el.height));
      if (draw.length) {
        bg.globalCompositeOperation = "source-over";
        bg.fillStyle = "#000"; bg.fillRect(0, 0, W, 1);
        for (const { el } of draw) {
          if (el.tagName !== "CANVAS") { const c = sceneColour(el, top); if (c) { bg.fillStyle = "rgb(" + c.join(",") + ")"; bg.fillRect(0, 0, W, 1); } continue; }
          try { bg.drawImage(el, 0, 0, el.width, Math.max(1, el.height / 160), 0, 0, W, 1); } catch (e) { /* (not drawable yet) */ }
        }
        if (!on) { band.classList.add("on"); on = true; }
      } else if (on) { band.classList.remove("on"); on = false; }
      return;
    }
    if (any) { bg.putImageData(out, 0, 0); if (!on) { band.classList.add("on"); on = true; } }
    else if (on) { band.classList.remove("on"); on = false; }
  }
  requestAnimationFrame(frame);
  window.ScreenBand = { refresh: () => { tick = EVERY - 1; } };
})();
