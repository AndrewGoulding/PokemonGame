// HeartGold's Apricorn Box (overlays 58 and 59): the box's seven holes, an
// Apricorn of each colour in its own with how many you have in the bubble
// beside it (ov59's sprites at 27/75, 49-145, top to bottom in turn), what
// the one under the cursor is (msg_0021), and the button on the box's plate.
// Opened from the Bag it only shows your Apricorns ("Collected Apricorns are
// inside."); for Kurt (sub_0203ED80: "Select which Apricorns to give.") you
// pick one, then how many ("Give how many?") and say yes ("Give 3 Red
// Apricorns?"). The picture's HGSS's own (tools/build-apricorn-box.js:
// assets/apricorn-box/box.png), the words in FireRed's windows (GbaMenus.Surface)
// on the overlay canvas.
//
//   await ApricornBox.open(canvas, { bag, mode: "view", frame, sfx })
//   const got = await ApricornBox.open(canvas, { bag, mode: "give", frame, sfx, confirm, itemName })
//     // -> { colour, id, n } (not yet taken from the bag), or null
//
// The D-pad moves the cursor from hole to hole (up or left the one before,
// down or right the one after, and then the plate's button), A chooses, B
// closes; in the quantity window up and down change it by 1, left and right
// by 10. A tap on a hole or the plate does as A on it.
(function () {
  "use strict";

  const COLOURS = ["red", "yellow", "blue", "green", "pink", "white", "black"];
  // (Each Apricorn's place, its picture's middle: ov59_0223C6C6, less the 32 rows cropped off the top.)
  const SPOTS = [[27, 17], [75, 33], [27, 49], [75, 65], [27, 81], [75, 97], [27, 113]];
  const BUBBLE = [21, 7];          // (the white bubble's middle, from the Apricorn's)
  const PLATE = [5, 136, 101, 18]; // (the plate along the box's foot)
  // What each is (msg_0021's 40-46, after the name).
  const ABOUT = {
    red: "A red Apricorn. It assails your nostrils.",
    yellow: "A yellow Apricorn. It has an invigorating scent.",
    blue: "A blue Apricorn. It smells a bit like grass.",
    green: "A green Apricorn. It has a mysterious, aromatic scent.",
    pink: "A pink Apricorn. It has a nice, sweet scent.",
    white: "A white Apricorn. It doesn't smell like anything.",
    black: "A black Apricorn. It has an indescribable scent."
  };
  const W = 240, H = 160;
  const GM = () => window.GBA_MENUS;
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
  const ok = (img) => img && img.complete && img.naturalWidth > 0;
  // Keys and taps: "up" ... "a", "b", or { tap: [x, y] } (GBA pixels).
  function input(canvas) {
    const KEY = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      z: "a", Z: "a", " ": "a", Enter: "a", x: "b", X: "b", Escape: "b" };
    return new Promise((resolve) => {
      const done = (v) => { document.removeEventListener("keydown", key, true); canvas.removeEventListener("pointerdown", tap); resolve(v); };
      const key = (e) => {
        const k = KEY[e.key];
        if (!k) return;
        e.preventDefault(); e.stopImmediatePropagation();
        if (e.repeat && (k === "a" || k === "b")) return;
        done(k);
      };
      const tap = (e) => {
        const r = canvas.getBoundingClientRect();
        done({ tap: [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H] });
      };
      document.addEventListener("keydown", key, true);
      canvas.addEventListener("pointerdown", tap);
    });
  }
  function wrap(s, str, width, font) {
    const lines = [];
    let line = "";
    for (const w of str.split(" ")) {
      const t = line ? line + " " + w : w;
      if (line && s.textWidth(t, font) > width) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  // How many of each colour are in the bag.
  const counts = (bag) => COLOURS.map((c) => Math.min(99, (bag || {})[c + "-apricorn"] | 0));
  // Which hole (0-6), the plate (7), or nothing (-1) is at (x, y).
  function spotAt(x, y) {
    const i = SPOTS.findIndex(([sx, sy]) => Math.abs(x - sx) <= 16 && Math.abs(y - sy) <= 14);
    if (i >= 0) return i;
    return x >= PLATE[0] && x < PLATE[0] + PLATE[2] && y >= PLATE[1] && y < PLATE[1] + PLATE[3] ? 7 : -1;
  }

  async function open(canvas, opts) {
    opts = opts || {};
    const give = opts.mode === "give";
    const sfx = (name) => { if (opts.sfx) opts.sfx(name); };
    const name = (c) => (opts.itemName ? opts.itemName(c + "-apricorn") : c[0].toUpperCase() + c.slice(1) + " Apricorn");
    const frameName = "type" + ((opts.frame || 0) + 1), pal = GM().palettes.std3;
    const box = image("assets/apricorn-box/box.png"), pics = COLOURS.map((c) => image("assets/sprites/items/apricorn/" + c + ".png"));
    await Promise.all([box.loaded].concat(pics.map((p) => p.loaded)));
    const have = counts(opts.bag);
    // (The cursor starts on the first Apricorn you have.)
    let at = Math.max(0, have.findIndex((n) => n > 0)), quantity = 0;
    if (!have.some((n) => n > 0)) at = 7;
    const close = give ? "CANCEL" : "CLOSE";

    function draw(prompt) {
      const s = window.GbaMenus.Surface(), F = GM().frames[frameName].palette;
      const window_ = (x, y, w, h) => { s.frame(frameName, F, x, y, w, h); s.fill(x * 8, y * 8, w * 8, h * 8, pal[1]); };
      // (The title, msg_0021's 0.)
      window_(17, 1, 12, 2);
      s.text("APRICORN BOX", 136 + ((96 - s.textWidth("APRICORN BOX")) >> 1), 9, pal[2], pal[3]);
      // (The one under the cursor: its name and what it is.)
      window_(17, 5, 12, 8);
      if (at < 7 && have[at] > 0) {
        s.text(name(COLOURS[at]), 138, 41, pal[2], pal[3]);
        wrap(s, ABOUT[COLOURS[at]], 94, "small").forEach((l, i) => s.text(l, 138, 57 + i * 11, pal[2], pal[3], "small"));
      } else if (at === 7) s.text(close, 138, 41, pal[2], pal[3]);
      // (What to do: msg_0021's 27, 37 or 38.)
      window_(17, 15, 12, 4);
      wrap(s, prompt, 94, "small").forEach((l, i) => s.text(l, 138, 121 + i * 11, pal[2], pal[3], "small"));
      // (How many, under the question: FireRed's x01.)
      if (quantity) {
        const t = "x" + String(quantity).padStart(2, "0");
        s.text(t, 220 - s.textWidth(t), 135, pal[2], pal[3]);
      }
      // (The counts in the bubbles, and the plate's button.)
      have.forEach((n, i) => {
        if (!n) return;
        const t = String(n), x = SPOTS[i][0] + BUBBLE[0], y = SPOTS[i][1] + BUBBLE[1];
        s.text(t, x - (s.textWidth(t, "small") >> 1), y - 6, [72, 72, 72], [208, 208, 208], "small");
      });
      s.text(close, PLATE[0] + ((PLATE[2] - s.textWidth(close)) >> 1), PLATE[1] + 1, [248, 248, 248], [112, 56, 40]);

      const g = canvas.getContext("2d");
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.scale(canvas.width / W, canvas.height / H);
      if (ok(box)) g.drawImage(box, 0, 0);
      have.forEach((n, i) => { if (n && ok(pics[i])) g.drawImage(pics[i], SPOTS[i][0] - 16, SPOTS[i][1] - 16); });
      g.drawImage(s.canvas(), 0, 0, W, H);
      // (The cursor: a ring round the hole, or the plate.)
      g.strokeStyle = "#f83820"; g.lineWidth = 2;
      if (at < 7) g.strokeRect(SPOTS[at][0] - 18, SPOTS[at][1] - 15, 50, 32);
      else g.strokeRect(PLATE[0] - 1, PLATE[1] - 1, PLATE[2] + 2, PLATE[3] + 2);
      if (quantity) {
        // (The quantity window's arrows: more above, fewer below.)
        g.fillStyle = "#f83820";
        g.beginPath(); g.moveTo(226, 134); g.lineTo(223, 138); g.lineTo(229, 138); g.fill();
        g.beginPath(); g.moveTo(226, 151); g.lineTo(223, 147); g.lineTo(229, 147); g.fill();
      }
      g.restore();
    }

    // How many to give (FireRed's quantity: up and down 1, left and right 10), or 0.
    async function howMany(max) {
      quantity = 1;
      for (;;) {
        draw("Give how many?");
        const k = await input(canvas);
        const was = quantity;
        if (k === "up") quantity = quantity >= max ? 1 : quantity + 1;
        else if (k === "down") quantity = quantity <= 1 ? max : quantity - 1;
        else if (k === "right") quantity = Math.min(max, quantity + 10);
        else if (k === "left") quantity = Math.max(1, quantity - 10);
        else if (k === "a" || (k && k.tap)) { const n = quantity; quantity = 0; sfx("se_select"); return n; }
        else if (k === "b") { quantity = 0; sfx("se_select"); return 0; }
        if (quantity !== was) sfx("se_select");
      }
    }

    const prompt = give ? "Select which Apricorns to give." : "Collected Apricorns are inside.";
    for (;;) {
      draw(prompt);
      let k = await input(canvas);
      if (k && k.tap) {
        const i = spotAt(k.tap[0], k.tap[1]);
        if (i < 0) continue;
        at = i;
        k = "a";
      }
      if (k === "up" || k === "left") { at = (at + 7) % 8; sfx("se_select"); }
      else if (k === "down" || k === "right") { at = (at + 1) % 8; sfx("se_select"); }
      else if (k === "b" || (k === "a" && at === 7)) { sfx("se_select"); return null; }
      else if (k === "a" && give) {
        if (!have[at]) { sfx("se_failure"); continue; }
        sfx("se_select");
        const n = have[at] > 1 ? await howMany(have[at]) : 1;
        if (!n) continue;
        const c = COLOURS[at];
        draw(prompt);
        // (msg_0021's 39: "Give {n} {item}?")
        if (opts.confirm && !(await opts.confirm("Give " + n + " " + name(c) + (n > 1 ? "s" : "") + "?"))) continue;
        return { colour: c, id: c + "-apricorn", n };
      }
    }
  }

  window.ApricornBox = { COLOURS, SPOTS, ABOUT, counts, spotAt, open };
})();
