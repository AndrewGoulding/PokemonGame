// The Ruins of Alph, as in HeartGold: the chambers' stone-panel puzzles
// (src/alph_puzzle.c), the words on their walls (OpenAlphHiddenRoom), the
// Unown that solving them wakes (src/field/encounter_check.c), the walls that
// Flash, a Water Stone, an Escape Rope or Ho-Oh open (src/alph_checks.c), and
// the Unown Report. Pictures from tools/build-alph.js (assets/alph/), drawn in
// FireRed's windows (GbaMenus.Surface) on the overlay canvas.
//
//   const solved = await JohtoAlph.puzzle(canvas, n, { frame, sfx, confirm })
//     // the n-th chamber's panel (0 Kabuto, 1 Aerodactyl, 2 Omanyte, 3 Ho-Oh):
//     // true once it's put together, false if you quit
//   await JohtoAlph.wall(canvas, n)            // the words on the n-th chamber's wall, until A or B
//   await JohtoAlph.report(canvas, letters, { frame })   // the Unown Report: the letters caught
//   JohtoAlph.PUZZLE_FLAGS[n]                  // the flag a solved puzzle sets (FLAG_SYS_ALPH_PUZZLE_*)
//   JohtoAlph.unownLetter(map, solved)         // a wild Unown's letter on `map` ("a" ... "question"), or null
//   JohtoAlph.locked(map, solved)              // no wild Pokémon there until a puzzle's solved
//   JohtoAlph.chamberReaction(map, at, what)   // { zone, label } a chamber's wall runs for "escape-rope",
//     // "flash" or "water-stone" used at `at` ({ x, y, facing }), or null
//   JohtoAlph.recordCaught(flags, record)      // an Unown caught: its letter into the report
//   JohtoAlph.caughtCount(letters) / allLetters(letters)   // HGSS's ScrCmd_545 and CheckSeenAllLetterUnown
//
// The D-pad moves the cursor over the board, A picks up a piece, puts it down
// where the cursor is, or turns it if you put it back where it was (as a
// touch without sliding turns it in HGSS); B puts it back, or quits. A tap or
// click does the same: on a piece to pick it up, on a square to put it down.
(function () {
  "use strict";

  // ---------- The puzzles ----------

  // Each puzzle's pieces where they start (sAlph*Puzzle): [x, y, piece (1-16),
  // turns, fixed] on the 6x6 board, whose middle 4x4 is where they go (piece
  // i at x (i - 1) % 4 + 1, y (i - 1) / 4 + 1, unturned). The corners can't
  // be used. (Ho-Oh's piece 5 is listed twice: the second wins, as in HGSS.)
  const LAYOUTS = [
    [[0, 1, 6, 1, 0], [1, 1, 1, 0, 1], [3, 1, 3, 0, 1], [4, 1, 4, 0, 1], [1, 2, 5, 0, 1], [3, 2, 7, 0, 1], [4, 2, 8, 0, 1], [5, 2, 11, 2, 0],
      [2, 3, 10, 0, 1], [4, 3, 12, 0, 1], [0, 4, 2, 3, 0], [1, 4, 13, 0, 1], [2, 4, 14, 0, 1], [3, 4, 15, 0, 1], [4, 4, 16, 0, 1], [4, 5, 9, 1, 0]],
    [[1, 0, 10, 3, 0], [3, 0, 14, 2, 0], [3, 1, 3, 0, 1], [4, 1, 4, 0, 1], [3, 2, 7, 0, 1], [4, 2, 8, 0, 1], [5, 2, 16, 3, 0], [0, 3, 2, 3, 0],
      [1, 3, 9, 0, 1], [3, 3, 11, 0, 1], [4, 3, 12, 0, 1], [1, 4, 13, 0, 1], [3, 4, 15, 0, 1], [5, 4, 6, 2, 0], [2, 5, 1, 2, 0], [4, 5, 5, 1, 0]],
    [[2, 0, 11, 1, 0], [4, 0, 10, 0, 0], [0, 1, 9, 0, 0], [2, 1, 2, 0, 1], [3, 1, 3, 0, 1], [4, 1, 4, 0, 1], [1, 2, 5, 0, 1], [2, 2, 6, 0, 1],
      [5, 2, 14, 2, 0], [0, 3, 8, 0, 0], [5, 3, 13, 3, 0], [0, 4, 1, 3, 0], [3, 4, 15, 0, 1], [4, 4, 16, 0, 1], [1, 5, 7, 2, 0], [2, 5, 12, 1, 0]],
    [[2, 0, 9, 0, 0], [3, 0, 14, 3, 0], [4, 0, 1, 3, 0], [0, 1, 15, 2, 0], [3, 1, 3, 0, 1], [4, 1, 4, 0, 1], [0, 2, 13, 2, 0], [1, 2, 5, 0, 1],
      [2, 2, 6, 0, 1], [3, 2, 7, 0, 1], [5, 2, 10, 3, 0], [0, 3, 2, 3, 0], [4, 3, 12, 0, 1], [4, 4, 16, 0, 1], [5, 4, 11, 3, 0], [1, 5, 5, 2, 0],
      [2, 5, 8, 1, 0]]
  ];
  const PUZZLE_FLAGS = ["FLAG_SYS_ALPH_PUZZLE_KABUTO", "FLAG_SYS_ALPH_PUZZLE_AERODACTYL", "FLAG_SYS_ALPH_PUZZLE_OMANYTE", "FLAG_SYS_ALPH_PUZZLE_HO_OH"];
  // The words under the board (msg_0002).
  const HINTS = [
    "This Pokémon hides on the seafloor and watches the shore with eyes on its back.",
    "This Pokémon knew no fear and flew as it pleased through the skies long ago.",
    "A ten-legged Pokémon that swims on the bottom of the sea and eats plankton.",
    "This Pokémon, with feathers of seven colors, flies through the sky, according to legend."
  ];
  const isCorner = (x, y) => (x === 0 || x === 5) && (y === 0 || y === 5);

  // A puzzle as it starts (AlphPuzzle_InitTileData): its 16 pieces, { x, y, turns, fixed }.
  function start(n) {
    const pieces = [];
    for (const [x, y, i, turns, fixed] of LAYOUTS[n] || LAYOUTS[0]) pieces[i - 1] = { x, y, turns, fixed: !!fixed };
    return pieces;
  }
  const pieceAt = (pieces, x, y) => pieces.findIndex((p) => p.x === x && p.y === y);
  // Put together (AlphPuzzle_CheckComplete): every piece in its place, unturned.
  const solved = (pieces) => pieces.every((p, i) => p.turns === 0 && p.x === (i % 4) + 1 && p.y === Math.floor(i / 4) + 1);
  // Where a held piece can go (AlphPuzzle_GetTileDropCoords): on the board, not a corner, nobody there.
  const canDrop = (pieces, held, x, y) => x >= 0 && y >= 0 && x < 6 && y < 6 && !isCorner(x, y) && pieces.every((p, i) => i === held || p.x !== x || p.y !== y);

  // ---------- Unown ----------

  // The letters each solved puzzle wakes (sUnlockedUnown: A-J, R-V, K-Q,
  // W-Z), and the ! and ? in the hall's Sinjoh room; as Party's forms.
  const UNOWN_LETTERS = [[0, 9], [17, 21], [10, 16], [22, 25]].map(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCharCode(97 + a + i)));
  const SINJOH_LETTERS = ["exclamation", "question"];
  // The maps whose wild Unown wait for a puzzle (EncounterGen_CanGenerateUnownEncounter:
  // the Underground Hall and its Sinjoh rooms).
  const HALLS = ["RuinsOfAlph_UndergroundHall", "RuinsOfAlph_UndergroundHallSinjohEvent", "RuinsOfAlph_HallEntranceSinjohEvent", "RuinsOfAlph_UndergroundHallSinjohEvent2"];
  const locked = (map, solvedList) => HALLS.includes(map) && !(solvedList || []).some(Boolean);
  // A wild Unown's letter (EncounterGen_ChooseUnownForm): any letter the solved
  // puzzles have woken, or ! or ? in the Sinjoh room. (The radio's Unown
  // broadcast, which favours letters not caught yet, isn't here.)
  function unownLetter(map, solvedList, random) {
    if (!HALLS.includes(map)) return null;
    const r = random || Math.random;
    if (map === "RuinsOfAlph_HallEntranceSinjohEvent") return SINJOH_LETTERS[Math.floor(r() * 2)];
    const letters = [].concat(...UNOWN_LETTERS.filter((_, i) => (solvedList || [])[i]));
    return letters.length ? letters[Math.floor(r() * letters.length)] : null;
  }
  // The Unown Report: the letters caught, in the order they were caught.
  function recordCaught(flags, record) {
    if (!record || record.species !== "Unown") return;
    const list = flags.unownCaught || (flags.unownCaught = []);
    const letter = record.unown || "a";
    if (!list.includes(letter)) list.push(letter);
  }
  const caughtCount = (letters) => (letters || []).length;
  // Every letter A to Z (not ! or ?: CheckSeenAllLetterUnown).
  const allLetters = (letters) => "abcdefghijklmnopqrstuvwxyz".split("").every((c) => (letters || []).includes(c));

  // ---------- The chambers' walls ----------

  // What opens each wall (src/alph_checks.c): used standing at (6, 3) facing
  // up, in front of it; and the script the chamber runs then
  // (ExitMenuAndJumpToAlphChamberReaction, Task_UseFlashInField).
  const REACTIONS = {
    "escape-rope": { map: "RuinsOfAlph_NortheastEntranceFirstRoom", zone: "D24R0202", label: "scr_seq_D24R0202_002" },
    flash: { map: "RuinsOfAlph_SoutheastEntranceFirstRoom", zone: "D24R0204", label: "scr_seq_D24R0204_002" },
    "water-stone": { map: "RuinsOfAlph_SouthwestEntranceFirstRoom", zone: "D24R0206", label: "scr_seq_D24R0206_002" }
  };
  function chamberReaction(map, at, what) {
    const r = REACTIONS[what];
    return r && map === r.map && at && at.x === 6 && at.y === 3 && at.facing === "up" ? { zone: r.zone, label: r.label } : null;
  }

  // ---------- Drawing ----------

  const W = 240, H = 160, S = 2;   // (the overlay canvas is 480x320: 2 to a GBA pixel)
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
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
  const GM = () => window.GBA_MENUS;
  // Keys and taps while a screen's up: resolves with "up" ... "a", "b", or
  // { tap: [x, y] } (GBA pixels).
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
  // Words wrapped to `width` pixels in FireRed's `font`.
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
  // The surface (frames, words) and then the pictures over it, onto the canvas.
  function present(canvas, surface, pictures) {
    const g = canvas.getContext("2d");
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(surface.canvas(), 0, 0, canvas.width, canvas.height);
    g.scale(canvas.width / W, canvas.height / H);
    if (pictures) pictures(g);
    g.restore();
  }

  // ---------- The puzzle screen ----------

  // The board in your window frame on the left (tiles 1-18: 144x144, HGSS's
  // 32-pixel squares at 24), the Pokémon's words and the buttons in a window
  // on the right.
  const BOARD_X = 8, BOARD_Y = 8, CELL = 24;
  async function puzzle(canvas, n, opts) {
    opts = opts || {};
    const sfx = (name) => { if (opts.sfx) opts.sfx(name); };
    const frameName = "type" + ((opts.frame || 0) + 1), pal = GM().palettes.std3;
    const board = image("assets/alph/board.png"), marks = image("assets/alph/marks.png"), sheet = image("assets/alph/pieces-" + n + ".png");
    await Promise.all([board.loaded, marks.loaded, sheet.loaded]);
    const pieces = start(n);
    let cx = 2, cy = 2, held = -1, turning = null, flash = 0;
    const hint = HINTS[n] || HINTS[0];

    function draw() {
      const s = window.GbaMenus.Surface();
      s.fill(0, 0, W, H, [74, 57, 41]);
      s.frame(frameName, GM().frames[frameName].palette, 1, 1, 18, 18);
      s.frame(frameName, GM().frames[frameName].palette, 21, 1, 8, 18);
      s.fill(168, 8, 64, 144, pal[1]);
      wrap(s, hint, 62, "small").forEach((l, i) => s.text(l, 169, 8 + i * 10, pal[2], pal[3], "small"));
      const keys = held < 0 ? [["{A_BUTTON}", "Pick up"], ["{B_BUTTON}", "Quit"]] : [["{A_BUTTON}", "Put down"], ["", "(here: turn)"], ["{B_BUTTON}", "Put back"]];
      keys.forEach(([icon, t], i) => {
        const y = 150 - 12 * (keys.length - i);
        const iw = icon ? s.text(icon, 169, y + 2, pal[2], pal[3], "small", GM().palettes.std3) + 2 : 0;
        s.text(t, 169 + iw, y, pal[2], pal[3], "small");
      });
      present(canvas, s, (g) => {
        if (ok(board)) g.drawImage(board, BOARD_X, BOARD_Y, CELL * 6, CELL * 6);
        const mark = (k, x, y) => { if (ok(marks)) g.drawImage(marks, k * 32, 0, 32, 32, BOARD_X + x * CELL, BOARD_Y + y * CELL, CELL, CELL); };
        // (Where the held piece came from, and where the cursor is: AlphPuzzle_UpdateHoverGraphicOnBg.)
        if (held >= 0) mark(pieces[held].x === cx && pieces[held].y === cy ? 2 : 1, pieces[held].x, pieces[held].y);
        if (held < 0 || pieces[held].x !== cx || pieces[held].y !== cy) mark(0, cx, cy);
        const drawPiece = (i, x, y, angle) => {
          if (!ok(sheet)) return;
          g.save();
          g.translate(x + CELL / 2, y + CELL / 2);
          g.rotate(angle);
          g.drawImage(sheet, 0, i * 32, 32, 32, -CELL / 2, -CELL / 2, CELL, CELL);
          g.restore();
        };
        const angleOf = (i) => (pieces[i].turns + (turning && turning.i === i ? turning.t / 8 : 0)) * Math.PI / 2;
        pieces.forEach((p, i) => { if (i !== held) drawPiece(i, BOARD_X + p.x * CELL, BOARD_Y + p.y * CELL, angleOf(i)); });
        // (The held piece over the rest, lifted a little: Sprite_OffsetPositionXY(-2, -2).)
        if (held >= 0) drawPiece(held, BOARD_X + cx * CELL - 2, BOARD_Y + cy * CELL - 2, angleOf(held));
        // (Put together: the pieces flash white, PaletteData_BlendPalette.)
        if (flash) { g.globalAlpha = flash / 16; g.fillStyle = "#fff"; g.fillRect(BOARD_X + CELL, BOARD_Y + CELL, CELL * 4, CELL * 4); g.globalAlpha = 1; }
      });
    }
    // Turning a piece a quarter turn (AlphPuzzleMainSeq_RotateTile: 8 frames).
    async function turn(i) {
      sfx("se_ball_tray_ball");
      for (let t = 1; t <= 8; t++) { turning = { i, t }; draw(); await nextFrame(); await nextFrame(); }
      turning = null;
      pieces[i].turns = (pieces[i].turns + 1) % 4;
    }
    // A, or a tap on (x, y): pick up, put down, or turn.
    async function press(x, y) {
      if (held < 0) {
        const i = pieceAt(pieces, x, y);
        if (i < 0 || pieces[i].fixed) return false;
        held = i;
        sfx("se_select");
        return false;
      }
      const i = held;
      held = -1;
      if (pieces[i].x === x && pieces[i].y === y) await turn(i);
      else if (canDrop(pieces, i, x, y)) { pieces[i].x = x; pieces[i].y = y; sfx("se_click"); }
      else sfx("se_failure");   // (somewhere it can't go: back where it was)
      return solved(pieces);
    }

    for (;;) {
      draw();
      const k = await input(canvas);
      let done = false;
      if (k === "up") cy = Math.max(0, cy - 1);
      else if (k === "down") cy = Math.min(5, cy + 1);
      else if (k === "left") cx = Math.max(0, cx - 1);
      else if (k === "right") cx = Math.min(5, cx + 1);
      else if (k === "a") done = await press(cx, cy);
      else if (k === "b") {
        if (held >= 0) { held = -1; sfx("se_click"); continue; }
        draw();
        if (!opts.confirm || (await opts.confirm("Are you sure you would like to quit?"))) return false;
      } else if (k && k.tap) {
        const tx = Math.floor((k.tap[0] - BOARD_X) / CELL), ty = Math.floor((k.tap[1] - BOARD_Y) / CELL);
        if (tx >= 0 && ty >= 0 && tx < 6 && ty < 6) { cx = tx; cy = ty; done = await press(tx, ty); }
        // (The buttons' window: B.)
        else if (k.tap[0] >= 168 && k.tap[1] >= 110) {
          if (held >= 0) held = -1;
          else if (!opts.confirm || (await opts.confirm("Are you sure you would like to quit?"))) return false;
        }
      }
      if (done) {
        // Put together (AlphPuzzleMainSeq_Clear): a flash of white, up and back down.
        sfx("se_unlock");
        for (flash = 1; flash <= 15; flash++) { draw(); await nextFrame(); await nextFrame(); }
        for (flash = 15; flash >= 0; flash--) { draw(); await nextFrame(); await nextFrame(); }
        flash = 0;
        draw();
        for (let f = 0; f < 30; f++) await nextFrame();
        return true;
      }
    }
  }

  // ---------- The words on the walls ----------

  // OpenAlphHiddenRoom: the wall's tablet over the map, "ESCAPE", "LIGHT",
  // "WATER" or "HO OH" on it in the Unown font, until A or B.
  async function wall(canvas, n) {
    const img = image("assets/alph/wall-" + n + ".png");
    await img.loaded;
    const g = canvas.getContext("2d");
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (ok(img)) g.drawImage(img, ((W - img.naturalWidth) >> 1) * S, 40 * S, img.naturalWidth * S, img.naturalHeight * S);
    g.restore();
    for (;;) { const k = await input(canvas); if (k === "a" || k === "b" || (k && k.tap)) break; }
  }

  // ---------- The Unown Report ----------

  // The letters caught (HGSS's report shows them page by page: here all on
  // one), each caught one's icon in its place among the 28, in your frame.
  async function report(canvas, letters, opts) {
    opts = opts || {};
    letters = letters || [];
    const frameName = "type" + ((opts.frame || 0) + 1), pal = GM().palettes.std3;
    const forms = "abcdefghijklmnopqrstuvwxyz".split("").concat(SINJOH_LETTERS);
    const icons = forms.map((f) => (letters.includes(f) ? image(window.Screen.iconUrl("Unown", f === "a" ? null : f)) : null));
    await Promise.all(icons.filter(Boolean).map((i) => i.loaded));
    const s = window.GbaMenus.Surface();
    s.fill(0, 0, W, H, [74, 57, 41]);
    s.frame(frameName, GM().frames[frameName].palette, 1, 1, 28, 18);
    s.fill(8, 8, 224, 144, pal[1]);
    s.text("UNOWN REPORT", 16, 10, pal[2], pal[3]);
    const count = letters.length + (letters.length === 1 ? " kind" : " kinds") + " caught";
    s.text(count, 224 - s.textWidth(count, "small"), 12, pal[2], pal[3], "small");
    // (Each letter's square: 7 across, 4 down.)
    const at = (i) => [20 + (i % 7) * 30, 32 + Math.floor(i / 7) * 30];
    forms.forEach((f, i) => {
      const [x, y] = at(i);
      s.fill(x, y, 26, 26, pal[11]);
      if (!letters.includes(f)) s.text(f.length > 1 ? (f === "exclamation" ? "!" : "?") : f.toUpperCase(), x + 10, y + 5, pal[3], pal[1]);
    });
    present(canvas, s, (g) => icons.forEach((img, i) => { if (ok(img)) { const [x, y] = at(i); g.drawImage(img, 0, 0, 32, 32, x - 3, y - 4, 32, 32); } }));
    for (;;) { const k = await input(canvas); if (k === "a" || k === "b" || (k && k.tap)) break; }
  }

  // ---------- The chambers' 3D pieces ----------

  // Each chamber's stone panel over the hole in its floor (SPRITE_BABYBOY1_13,
  // gone once the puzzle's solved and the floor falls in: the hole's rim is
  // at 88-120, 103-135 on the map, from its place at (5, 7)), and the wall a
  // word opens (SPRITE_BABYBOY1_12: the map's own wall shows): HGSS's models,
  // as tools/build-alph.js's sprites.
  const CHAMBERS = ["Northeast", "Southeast", "Southwest", "Northwest"].map((c) => "RuinsOfAlph_" + c + "EntranceFirstRoom");
  for (const name of CHAMBERS) for (const p of ((window.WORLD_MAPS || {})[name] || { people: [] }).people) {
    if (p.sprite === "hgss_babyboy1_13") Object.assign(p, { sprite: "alph_panel", width: 32, height: 32, frames: 1, offsetX: 8, offsetY: 7, underfoot: true, inanimate: true });
    if (p.sprite === "hgss_babyboy1_12") Object.assign(p, { sprite: "alph_wall", width: 16, height: 32, frames: 1, inanimate: true });
  }

  window.JohtoAlph = { LAYOUTS, PUZZLE_FLAGS, HINTS, UNOWN_LETTERS, HALLS, start, pieceAt, solved, canDrop, isCorner,
    unownLetter, locked, recordCaught, caughtCount, allLetters, chamberReaction, puzzle, wall, report };
})();
