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
//   await JohtoAlph.report(canvas, letters, { level, name, sfx })   // the Unown Report: the letters
//     // caught, at the report's level (VAR_UNOWN_REPORT_LEVEL), your name on its cover
//   JohtoAlph.reportPages(letters, level)      // its pages, in turn
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
    if (!r || map !== r.map || !at || at.facing !== "up") return null;
    // (On a chamber drawn from Pokémon Heart & Soul's: HGSS's tile you're on, ui/johto-coords.js, a tile either way.)
    const m = (window.WORLD_MAPS || {})[map], h = m && m.hgss && window.JohtoCoords ? window.JohtoCoords.toHgss(map, at.x, at.y, map) : at;
    const near = m && m.hgss ? Math.abs(h.x - 6) <= 1 && Math.abs(h.y - 3) <= 1 : h.x === 6 && h.y === 3;
    return near ? { zone: r.zone, label: r.label } : null;
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

  // HGSS's report (overlay 113) is a book of two-page spreads, a page on each
  // screen, turned with up and down: the cover (msg_0001's 1, your name, and
  // how many kinds you've caught), then the Unown caught, 14 to a spread,
  // each with its icon and its word, in the order caught (Pokedex_GetSeenFormByIdx_Unown)
  // until the report's level 4 sorts them A to Z, then the Research Center's
  // notes, each page there once the report's level (VAR_UNOWN_REPORT_LEVEL,
  // which the researchers raise) is up to it (ov113_021E6BD0). Here each of
  // its pages is a screen of its own, on HGSS's paper (tools/build-alph.js's
  // report-*.png) in its blue binder.
  //
  // The words for each letter (msg_0001's 20-47), A to Z and then ! and ?.
  const REPORT_WORDS = ["ANGER", "BEAR", "CHASE", "DIRECT", "ENGAGE", "FIND", "GIVE", "HELP", "INCREASE", "JOIN", "KEEP", "LAUGH", "MAKE",
    "NUZZLE", "OBSERVE", "PERFORM", "QUICKEN", "REASSURE", "SEARCH", "TELL", "UNDO", "VANISH", "WANT", "XXXXX", "YIELD", "ZOOM", "!!!!!", "?????"];
  const REPORT_FORMS = "abcdefghijklmnopqrstuvwxyz".split("").concat(SINJOH_LETTERS);
  // The notes (msg_0001's 6-19; 15 is the hidden room's floor, in the Unown font: report-words.png).
  const NOTES = {
    6: "Found a strange puzzle in the ruins. Solved it, and suddenly a hole opened up in the ground and I dropped into the room below! Should have known that ancient ruins would have surprising tricks like that.",
    7: "There was a stone statue where I fell. The place might have been a reception hall. Then, suddenly, the UNOWN appeared. That puzzle was like a key somehow. It woke the UNOWN up from their sleep. These ruins have become difficult.",
    8: "If you turn on the radio in the ruins, you can receive mysterious radio waves! It's proof that the UNOWN communicate with each other using radio waves!",
    9: "There are as many UNOWN as there are letters in the alphabet. Right now, we're confirming the existence of 26 kinds of UNOWN. Do you think you can find all 26 of them?",
    10: "It seems that individually they don't make much sense, but when the various UNOWN are arranged in order, they begin to make sense. In nature, they seem to be scattered around randomly, but the truth is they're arranged in a very specific order.",
    11: "In this report, the scattered UNOWN were sorted and put into order by the research-center staff. That makes the UNOWN much easier to understand.",
    12: "Scratched on the floor of the ruins are UNOWN letters. Finding the room feels like a huge discovery! The Researchers were very excited and said they were going to go check it out.",
    13: "There aren't just 26 different kinds of UNOWN. Two more have been discovered! But that begs the question of where those other two kinds are hiding...",
    14: "The characters found scratched on the floor in the small room are transcribed here in this report.",
    16: "We don't know what this could possibly mean yet.",
    17: "The Researchers were saying that they'll need to examine the ruins again, but...?",
    18: "In the past, it seems that UNOWN lived with relatives of humans in these ruins. In the lower levels of these ruins is a Pokémon statue. We've come to understand that it was those relatives who made that statue.",
    19: "The UNOWN are very timid creatures, so they don't go outside the ruins. Even if a bunch of people gathered near the ruins, it is said that the ones who wished for UNOWN and humans to again coexist have all left."
  };
  // Each spread of notes (ov113_021E6BD0): its top page's and bottom page's
  // notes, and the report's level each needs. (A spread shows once its top
  // page can.)
  const NOTE_SPREADS = [[[1, 6], [1, 7]], [[2, 8], [3, 9]], [[4, 10], [4, 11]], [[5, 12], [6, 13]], [[7, 14, 15, 16], [7, 17]], [[8, 18], [8, 19]]];

  // The Unown in the order the report lists them (ov113_021E5A7C): as caught,
  // or from level 4, A to Z and then ! and ? as caught.
  function reportOrder(letters, level) {
    letters = (letters || []).filter((f) => REPORT_FORMS.includes(f));
    if ((level | 0) < 4) return letters;
    return REPORT_FORMS.slice(0, 26).filter((f) => letters.includes(f)).concat(letters.filter((f) => SINJOH_LETTERS.includes(f)));
  }
  // The report's pages, a spread's two in turn: { kind: "cover", bottom },
  // { kind: "unown", forms, bottom }, { kind: "notes", notes, bottom }.
  function reportPages(letters, level) {
    const order = reportOrder(letters, level), pages = [{ kind: "cover", bottom: false }, { kind: "cover", bottom: true }];
    for (let i = 0; i < order.length; i += 14) {
      pages.push({ kind: "unown", forms: order.slice(i, i + 7), bottom: false }, { kind: "unown", forms: order.slice(i + 7, i + 14), bottom: true });
    }
    for (const [top, bottom] of NOTE_SPREADS) {
      if (top[0] > (level | 0)) break;
      pages.push({ kind: "notes", notes: top.slice(1), bottom: false }, { kind: "notes", notes: bottom[0] <= (level | 0) ? bottom.slice(1) : [], bottom: true });
    }
    return pages;
  }

  // The page: HGSS's paper (palette 4: colours 6-9) in the binder (3-5),
  // the page number and arrows down its right.
  const PAPER = [232, 224, 152], INK = [64, 64, 64], RULE = [208, 200, 128], TAN = [184, 168, 112];
  const PAGE_X = 8, PAGE_Y = 6, PAGE_W = 208, PAGE_H = 148, ROW = 21;
  async function report(canvas, letters, opts) {
    opts = opts || {};
    const sfx = (name) => { if (opts.sfx) opts.sfx(name); };
    const level = opts.level | 0, pages = reportPages(letters, level), caught = (letters || []).filter((f) => REPORT_FORMS.includes(f));
    const pics = {};
    for (const n of ["plate-0", "plate-1", "lines", "bar", "words"]) pics[n] = image("assets/alph/report-" + n + ".png");
    const icons = {};
    for (const f of caught) icons[f] = image(window.Screen.iconUrl("Unown", f === "a" ? null : f));
    await Promise.all(Object.values(pics).concat(Object.values(icons)).map((i) => i.loaded));
    let at = 0;

    function draw(fade) {
      // (The paper on one surface, the words over the pictures on another.)
      const page = pages[at], bg = window.GbaMenus.Surface(), s = window.GbaMenus.Surface();
      // (The binder, and the page in it: its edges HGSS's two shades.)
      bg.fill(0, 0, W, H, [56, 128, 208]);
      bg.fill(0, 0, W, 2, [64, 64, 64]); bg.fill(0, H - 2, W, 2, [64, 64, 64]);
      bg.fill(2, 2, W - 4, 2, [88, 168, 240]);
      bg.fill(PAGE_X - 2, PAGE_Y, PAGE_W + 4, PAGE_H, TAN);
      bg.fill(PAGE_X - 1, PAGE_Y, PAGE_W + 2, PAGE_H, RULE);
      bg.fill(PAGE_X, PAGE_Y, PAGE_W, PAGE_H, PAPER);
      // (A top page has the notch for the binder's ring.)
      if (!page.bottom) bg.fill(PAGE_X + 76, PAGE_Y, 56, 3, [56, 128, 208]);
      const centre = (t, y, font) => s.text(t, PAGE_X + ((PAGE_W - s.textWidth(t, font)) >> 1), y, INK, RULE, font);
      const pictures = [];
      if (page.kind === "cover" && !page.bottom) {
        pictures.push(["plate-0", 20, 52]);
        centre("UNOWN Report", 64);
        if (opts.name) s.text(opts.name, 192 - s.textWidth(opts.name), 80, INK, RULE);
      } else if (page.kind === "cover") {
        pictures.push(["plate-1", 40, 56]);
        centre("Number of UNOWN", 64);
        centre("Current Kinds: " + caught.length, 80);
      } else if (page.kind === "unown") {
        for (let i = 0; i < 7; i++) {
          const y = PAGE_Y + 1 + i * ROW, f = page.forms[i];
          pictures.push(["bar", 29, y]);
          if (f) s.text(REPORT_WORDS[REPORT_FORMS.indexOf(f)], 29 + 44, y + 2, INK, RULE);
        }
      } else {
        pictures.push(["lines", 13, 12]);
        let y = 16;
        // (A long note's lines a little closer; the page with the floor's words in the small font.)
        const font = page.notes.length > 1 ? "small" : "normal";
        const lineH = font === "small" ? 12 : page.notes.some((n) => (NOTES[n] || "").length > 200) ? 14 : 16;
        for (const n of page.notes) {
          if (n === 15) { pictures.push(["words", PAGE_X + ((PAGE_W - (pics.words.naturalWidth || 169)) >> 1), y + 2]); y += 54; continue; }
          for (const l of wrap(s, NOTES[n], 184, font)) { s.text(l, 20, y, INK, RULE, font); y += lineH; }
          y += 4;
        }
      }
      // (The page number, n/N, and the arrows to turn: up the one before, down the one after.)
      const num = String(at + 1), of = String(pages.length);
      s.text(num, 228 - (s.textWidth(num, "small") >> 1), 66, [248, 248, 248], [48, 96, 136], "small");
      s.fill(222, 79, 12, 1, [248, 248, 248]);
      s.text(of, 228 - (s.textWidth(of, "small") >> 1), 82, [248, 248, 248], [48, 96, 136], "small");
      const pal = GM().palettes.std3;
      s.text("{B_BUTTON}", 222, 142, pal[2], pal[3], "small", pal);
      present(canvas, bg, (g) => {
        for (const [n, x, y] of pictures) if (ok(pics[n])) g.drawImage(pics[n], x, y);
        g.drawImage(s.canvas(), 0, 0, W, H);
        if (page.kind === "unown") page.forms.forEach((f, i) => {
          if (ok(icons[f])) g.drawImage(icons[f], 0, 0, 32, 32, 29 + 3, PAGE_Y + 1 + i * ROW - 9, 32, 32);
        });
        // (HGSS's arrows, where there's a page to turn to.)
        g.fillStyle = "#f8f8f8";
        if (at > 0) { g.beginPath(); g.moveTo(228, 40); g.lineTo(222, 48); g.lineTo(234, 48); g.fill(); }
        if (at < pages.length - 1) { g.beginPath(); g.moveTo(228, 112); g.lineTo(222, 104); g.lineTo(234, 104); g.fill(); }
        // (Turning a page: the screens fade, BeginNormalPaletteFade.)
        if (fade) { g.globalAlpha = fade; g.fillStyle = "#000"; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      });
    }
    async function turn(to) {
      sfx("se_select");
      for (let f = 1; f <= 4; f++) { draw(f / 4); await nextFrame(); }
      at = to;
      for (let f = 3; f >= 0; f--) { draw(f / 4); await nextFrame(); }
    }

    for (;;) {
      draw(0);
      const k = await input(canvas);
      const back = k === "up" || k === "left" || (k && k.tap && k.tap[0] >= 216 && k.tap[1] < 64);
      const on = k === "down" || k === "right" || (k && k.tap && k.tap[0] >= 216 && k.tap[1] >= 96 && k.tap[1] < 128);
      if (back && at > 0) await turn(at - 1);
      else if (on && at < pages.length - 1) await turn(at + 1);
      else if (k === "b" || (k && k.tap && k.tap[0] >= 216 && k.tap[1] >= 136)) { sfx("se_select"); return; }
    }
  }

  // ---------- The chambers' 3D pieces ----------

  // Each chamber's stone panel over the hole in its floor (SPRITE_BABYBOY1_13,
  // gone once the puzzle's solved and the floor falls in: the hole's rim is
  // at 88-120, 103-135 on the map, from its place at (5, 7)), and the wall a
  // word opens (SPRITE_BABYBOY1_12: the map's own wall shows): HGSS's models,
  // as tools/build-alph.js's sprites.
  const CHAMBERS = ["Northeast", "Southeast", "Southwest", "Northwest"].map((c) => "RuinsOfAlph_" + c + "EntranceFirstRoom");
  // (On a chamber drawn from Pokémon Heart & Soul's, its own table is the panel and its own wall the wall:
  // HGSS's panel goes, and its wall stands in the wall's tile, not in front of it.)
  for (const name of CHAMBERS) {
    const m = (window.WORLD_MAPS || {})[name];
    if (!m || !m.hgss) continue;
    m.people = m.people.filter((p) => p.sprite !== "hgss_babyboy1_13");
    for (const p of m.people) if (p.sprite === "hgss_babyboy1_12" && m.collision[(p.y - 1) * m.width + p.x]) p.y--;
  }
  for (const name of CHAMBERS) for (const p of ((window.WORLD_MAPS || {})[name] || { people: [] }).people) {
    if (p.sprite === "hgss_babyboy1_13") Object.assign(p, { sprite: "alph_panel", width: 32, height: 32, frames: 1, offsetX: 8, offsetY: 7, underfoot: true, inanimate: true });
    if (p.sprite === "hgss_babyboy1_12") Object.assign(p, { sprite: "alph_wall", width: 16, height: 32, frames: 1, inanimate: true });
  }

  window.JohtoAlph = { LAYOUTS, PUZZLE_FLAGS, HINTS, UNOWN_LETTERS, HALLS, start, pieceAt, solved, canDrop, isCorner,
    unownLetter, locked, recordCaught, caughtCount, allLetters, chamberReaction, puzzle, wall, report,
    REPORT_WORDS, NOTES, NOTE_SPREADS, reportOrder, reportPages };
})();
