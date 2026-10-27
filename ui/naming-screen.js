// FireRed's naming screen (pret's src/naming_screen.c), as it names the
// player: "YOUR NAME?" over the name's underscores, the walking player beside
// it, and the keyboard's three pages (UPPER, lower, OTHERS) with the PAGE,
// BACK and OK buttons. Its graphics are FireRed's (assets/naming-screen/,
// built by tools/build-naming-screen.js); the text is FireRed's font
// (window.GbaMenus.Surface).
//
//   const ns = NamingScreen.create({ title, maxChars, icon, fallback });
//     // title: "YOUR NAME?" (gText_YourName); maxChars: 7 (PLAYER_NAME_LENGTH);
//     // icon: the overworld sheet of who's being named (16x32 frames, FireRed's
//     // order: frame 0 facing down, 3 and 4 walking down; or a canvas of the
//     // character creator's look, 32x32 frames in the same order, with
//     // iconWidth: 32); fallback: the name
//     // OK gives with nothing typed (FireRed keeps the one already there)
//   ns.step()       // one frame (60 a second): the screen's tasks and sprites
//   ns.draw(g)      // onto a 2D context in GBA pixels (240x160)
//   ns.start()      // once it's faded in: takes the keys (MainState_WaitFadeIn)
//   await ns.done   // -> the name, once OK is pressed
//
//   const name = await NamingScreen.run(canvas, opts)   // the lot, with its own fades
//
// Controls are FireRed's: the D-pad moves (wrapping round, and onto the
// buttons' column), A types the key or presses the button, B deletes, Select
// changes the page, Start jumps to OK. A full name sends the cursor to OK.
(function () {
  "use strict";

  const W = 240, H = 160;
  const MENUS = () => window.GBA_MENUS;

  // ---------- FireRed's tables ----------

  // The pages, in the order they cycle (sNamingScreen->currentPage) ...
  const KBPAGE_LETTERS_UPPER = 1, KBPAGE_COUNT = 3;   // (the keyboard's pages: symbols 0, upper case 1, lower case 2)
  // ... and the keyboards, as the tables below are indexed.
  const KEYBOARD_LETTERS_LOWER = 0, KEYBOARD_LETTERS_UPPER = 1, KEYBOARD_SYMBOLS = 2;
  const KBROW_COUNT = 4;
  const sPageToKeyboardId = [KEYBOARD_SYMBOLS, KEYBOARD_LETTERS_UPPER, KEYBOARD_LETTERS_LOWER];
  const sPageToNextKeyboardId = [KEYBOARD_LETTERS_UPPER, KEYBOARD_LETTERS_LOWER, KEYBOARD_SYMBOLS];
  // The page button shows the next page: its label and colour (PAGE_SWAP_*;
  // here the rows of page-swap-text.png and page-swap-button.png).
  const SWAP_UPPER = 0, SWAP_LOWER = 1, SWAP_OTHERS = 2;
  const sPageToNextGfxId = [SWAP_UPPER, SWAP_LOWER, SWAP_OTHERS];

  // sKeyboardChars: what each key types. Short rows end in spaces (FireRed's
  // space is character 0, what the rest of the row is filled with).
  const sKeyboardChars = [
    ["abcdef .", "ghijkl ,", "mnopqrs ", "tuvwxyz "],
    ["ABCDEF .", "GHIJKL ,", "MNOPQRS ", "TUVWXYZ "],
    ["01234 ", "56789 ", "!?♂♀/-", "…“”‘' "]
  ];
  const sPageColumnCounts = [8, 8, 6];
  const sPageColumnXPos = [
    [0, 12, 24, 56, 68, 80, 92, 123],
    [0, 12, 24, 56, 68, 80, 92, 123],
    [0, 22, 44, 66, 88, 110]
  ];
  // sNamingScreenKeyboardText (src/keyboard_text.c): the keys as printed,
  // {CLEAR n} moving n pixels along.
  const sNamingScreenKeyboardText = [
    ["{CLEAR 11}a{CLEAR 6}b{CLEAR 6}c{CLEAR 26}d{CLEAR 6}e{CLEAR 6}f{CLEAR 6} {CLEAR 26}.",
      "{CLEAR 11}g{CLEAR 6}h{CLEAR 7}i{CLEAR 27}j{CLEAR 6}k{CLEAR 6}l{CLEAR 7} {CLEAR 26},",
      "{CLEAR 11}m{CLEAR 6}n{CLEAR 7}o{CLEAR 26}p{CLEAR 6}q{CLEAR 7}r{CLEAR 6}s{CLEAR 27} ",
      "{CLEAR 12}t{CLEAR 6}u{CLEAR 6}v{CLEAR 26}w{CLEAR 6}x{CLEAR 6}y{CLEAR 6}z{CLEAR 26} "],
    ["{CLEAR 11}A{CLEAR 6}B{CLEAR 6}C{CLEAR 26}D{CLEAR 6}E{CLEAR 6}F{CLEAR 6} {CLEAR 26}.",
      "{CLEAR 11}G{CLEAR 6}H{CLEAR 6}I{CLEAR 26}J{CLEAR 6}K{CLEAR 6}L{CLEAR 6} {CLEAR 26},",
      "{CLEAR 11}M{CLEAR 6}N{CLEAR 6}O{CLEAR 26}P{CLEAR 6}Q{CLEAR 6}R{CLEAR 6}S{CLEAR 26} ",
      "{CLEAR 11}T{CLEAR 6}U{CLEAR 6}V{CLEAR 26}W{CLEAR 6}X{CLEAR 6}Y{CLEAR 6}Z{CLEAR 26} "],
    ["{CLEAR 11}0{CLEAR 16}1{CLEAR 16}2{CLEAR 16}3{CLEAR 16}4{CLEAR 16} ",
      "{CLEAR 11}5{CLEAR 16}6{CLEAR 16}7{CLEAR 16}8{CLEAR 16}9{CLEAR 16} ",
      "{CLEAR 11}!{CLEAR 16}?{CLEAR 16}♂{CLEAR 16}♀{CLEAR 16}/{CLEAR 16}-",
      "{CLEAR 11}…{CLEAR 16}“{CLEAR 16}”{CLEAR 18}‘{CLEAR 18}'{CLEAR 18} "]
  ];
  const KEY_ROLE_CHAR = 0, KEY_ROLE_PAGE = 1, KEY_ROLE_BACKSPACE = 2, KEY_ROLE_OK = 3;
  const BUTTON_PAGE = 0, BUTTON_BACK = 1, BUTTON_OK = 2, BUTTON_COUNT = 3;
  const sButtonKeyRoles = [KEY_ROLE_PAGE, KEY_ROLE_BACKSPACE, KEY_ROLE_OK];
  const sKeyRowToButtonRow = [0, 1, 1, 2];
  const sButtonRowToKeyRow = [0, 0, 3];

  // Colours: keyboard.pal (palette 10, the windows'): 1 white, 2 dark gray,
  // 3 light gray. FONT_NORMAL's defaults are 2 on 1 with a 3 shadow; the keys
  // are white with a dark gray shadow (sTextColorStruct).
  const WHITE = [255, 255, 255], DARK_GRAY = [98, 98, 98], LIGHT_GRAY = [213, 213, 205];
  const CURSOR_RED = [255, 8, 8];      // cursor.pal colour 1, which SpriteCB_Cursor brightens
  const BUTTON_EDGE = [57, 57, 57];    // buttons.pal colour 14, which Task_UpdateButtonFlash brightens

  // gSineTable (src/trig.c) and Sin(): sin x 256, then (amplitude * that) >> 8.
  const Sin = (i, amp) => (amp * Math.round(Math.sin(((i & 255) * Math.PI) / 128) * 256)) >> 8;
  // MultiplyInvertedPaletteRGBComponents: each 5-bit component k/16 of the way to white.
  const lighten = (c, r, gb) => c.map((v, i) => { const c5 = v >> 3, k = i ? gb : r; return (c5 + (((31 - c5) * k) >> 4)) << 3; });
  const css = (c) => "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
  const se = (name) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(name); };

  // ---------- Pictures ----------

  const PICTURES = ["background", "keyboard-upper", "keyboard-lower", "keyboard-symbols", "page-swap-frame", "page-swap-button",
    "page-swap-text", "back-button", "ok-button", "button-flash", "cursor", "cursor-flash", "input-arrow", "underscore"];
  const images = {};
  function img(src) {
    if (!images[src]) {
      const i = new Image();
      i.loaded = new Promise((r) => { i.onload = i.onerror = r; });
      i.src = src;
      images[src] = i;
    }
    return images[src];
  }
  const pic = (name) => img("assets/naming-screen/" + name + ".png");
  const ready = (i) => i && i.complete && i.naturalWidth > 0;
  const preload = (extra) => Promise.all(PICTURES.map((n) => pic(n).loaded).concat(extra ? [img(extra).loaded] : []));
  const KEYBOARD_PICTURE = ["keyboard-lower", "keyboard-upper", "keyboard-symbols"];   // by keyboard id

  // Part of a picture recoloured (its pixels' shape in one colour), by
  // compositing only, so it works with the game opened straight from disk.
  const tintCache = new Map();
  function tint(src, sx, sy, w, h, color) {
    const key = [src.src || src.id, sx, sy, w, h, color].join();
    if (tintCache.has(key)) return tintCache.get(key);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    x.drawImage(src, sx, sy, w, h, 0, 0, w, h);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = color;
    x.fillRect(0, 0, w, h);
    if (tintCache.size > 200) tintCache.clear();
    tintCache.set(key, c);
    return c;
  }

  // ---------- The screen ----------

  function create(opts) {
    opts = opts || {};
    const title = opts.title || "YOUR NAME?";
    const maxChars = opts.maxChars || 7;
    const icon = !opts.icon ? null : typeof opts.icon === "string" ? img(opts.icon) : Object.assign(opts.icon, { complete: true, naturalWidth: opts.icon.width });
    const iconW = opts.iconWidth || 16;
    preload();

    // NamingScreen_Init
    const ns = {
      state: "handleInput", inputEnabled: false,
      currentPage: KBPAGE_LETTERS_UPPER,
      inputCharBaseXPos: (W - maxChars * 8) / 2 + 6,
      text: [],          // textBuffer, up to the first EOS
      bgToReveal: 0, bgToHide: 1
    };
    // BG1 and BG2, the keyboard pages: BG1 in front (priority 1) with the
    // upper case letters, BG2 behind with the lower case ones on deck.
    const bg1 = { kb: KEYBOARD_LETTERS_UPPER, vofs: 0, priority: 1 };
    const bg2 = { kb: KEYBOARD_LETTERS_LOWER, vofs: 0, priority: 2 };
    const vOffsetBgs = [bg2, bg1];   // (indexed by bgToReveal / bgToHide)
    let pageSwapTask = null;
    let pending = null;              // the key pressed this frame
    let buttonId = 0;                // Task_HandleInput's tButtonId: the row to go back to off the buttons
    let finish;
    const done = new Promise((r) => { finish = r; });

    // The sprites (CreateSprites), with their callbacks' data.
    const cursor = { x: 0, y: 0, prevX: 0, prevY: 0, invisible: false, flashing: false,
      color: 0, colorIncr: 2, colorDelay: 0, level: 0, anim: 0, animTime: 0, animEnded: false };
    const swapFrame = { state: "idle", page: 0 };
    const swapText = { y2: 0, invisible: false, gfx: sPageToNextGfxId[ns.currentPage] };
    const arrow = { delay: 0, xPosId: 0, x2: 0 };
    const underscores = Array.from({ length: maxChars }, () => ({ yPosId: 0, delay: 0, y2: 0 }));
    const flash = { button: BUTTON_COUNT, keepFlashing: false, allowFlash: false, color: 0, colorIncr: 0, colorDelay: 0, colorDelta: 0 };
    const buttonLevel = [0, 0, 0];   // how far each button's colour 14 is brightened (0-16)
    let walkTime = 0;

    const keyboardId = () => sPageToKeyboardId[ns.currentPage];
    const columnCount = () => sPageColumnCounts[keyboardId()];

    // ----- The cursor -----

    function setCursorPos(x, y) {
      cursor.prevX = cursor.x; cursor.prevY = cursor.y;
      cursor.x = x; cursor.y = y;
    }
    const moveCursorToOKButton = () => setCursorPos(columnCount(), 2);
    const setCursorInvisibility = (invisible) => { cursor.invisible = invisible; startCursorAnim(0); };
    function startCursorAnim(n) { cursor.anim = n; cursor.animTime = 0; cursor.animEnded = false; }
    const keyRole = () => (cursor.x < columnCount() ? KEY_ROLE_CHAR : sButtonKeyRoles[cursor.y]);

    // SpriteCB_Cursor: hidden on the buttons' column; while flashing, colour 1
    // brightens and dims (red half as much), restarting whenever it moves.
    function spriteCursor() {
      if (cursor.animEnded) startCursorAnim(0);
      const invisible = cursor.invisible || cursor.x === columnCount();
      if (invisible || !cursor.flashing || cursor.x !== cursor.prevX || cursor.y !== cursor.prevY) {
        cursor.color = 0; cursor.colorIncr = 2; cursor.colorDelay = 2;
      }
      if (--cursor.colorDelay === 0) {
        cursor.color += cursor.colorIncr;
        if (cursor.color === 16 || cursor.color === 0) cursor.colorIncr = -cursor.colorIncr;
        cursor.colorDelay = 2;
      }
      if (cursor.flashing) cursor.level = cursor.color;
      // sAnims_Cursor: 0 the ring; 1 (SquishCursor) squished 8 frames, filled 8, then ends.
      if (cursor.anim === 1 && ++cursor.animTime >= 16) cursor.animEnded = true;
    }

    // ----- The buttons' flash (Task_UpdateButtonFlash) -----

    function tryStartButtonFlash(button, keepFlashing, interruptCurFlash) {
      if (button === flash.button && !interruptCurFlash) {
        flash.keepFlashing = keepFlashing;
        flash.allowFlash = true;
        return;
      }
      if (button === BUTTON_COUNT && !flash.keepFlashing && !interruptCurFlash) return;
      if (flash.button !== BUTTON_COUNT) buttonLevel[flash.button] = 0;   // RestoreButtonColor
      Object.assign(flash, { button, keepFlashing, allowFlash: true, color: 4, colorIncr: 2, colorDelay: 0, colorDelta: 4 });
    }
    function taskButtonFlash() {
      if (flash.button === BUTTON_COUNT || !flash.allowFlash) return;
      buttonLevel[flash.button] = flash.color;
      if (flash.colorDelay && --flash.colorDelay) return;
      flash.colorDelay = 2;
      if (flash.colorIncr >= 0) {
        if (flash.color < 14) { flash.color += flash.colorIncr; flash.colorDelta += flash.colorIncr; }
        else { flash.color = 16; flash.colorDelta++; }
      } else {
        flash.color += flash.colorIncr; flash.colorDelta += flash.colorIncr;
      }
      if (flash.color === 16 && flash.colorDelta === 22) flash.colorIncr = -4;
      else if (flash.color === 0) { flash.allowFlash = flash.keepFlashing; flash.colorIncr = 2; flash.colorDelta = 0; }
    }

    // ----- The name -----

    // GetTextEntryPosition: the first empty place (the last when it's full).
    const textEntryPosition = () => Math.min(ns.text.length, maxChars - 1);
    // GetPreviousTextCaretPosition: the last character (0 with none).
    const previousCaretPosition = () => Math.max(0, ns.text.length - 1);
    function deleteTextCharacter() {
      ns.text = ns.text.slice(0, previousCaretPosition());
      const role = keyRole();
      // (FireRed flashes BACK once, and leaves it a shade light.)
      if (role === KEY_ROLE_CHAR || role === KEY_ROLE_BACKSPACE) tryStartButtonFlash(BUTTON_BACK, false, true);
      se("se_ball");
    }
    // AddTextCharacter: true once the name is full.
    function addTextCharacter() {
      const ch = sKeyboardChars[keyboardId()][cursor.y][cursor.x] || " ";
      ns.text[textEntryPosition()] = ch;
      se("se_select");
      return ns.text.length === maxChars;
    }

    // ----- The keys -----

    function handleKeyboardEvent(input) {
      const role = keyRole();
      if (input === "select") { ns.state = "startPageSwap"; return; }
      if (input === "b") { deleteTextCharacter(); return; }
      if (input === "start") { moveCursorToOKButton(); return; }
      if (role === KEY_ROLE_CHAR) {
        tryStartButtonFlash(BUTTON_COUNT, false, false);
        if (input === "a") {
          const full = addTextCharacter();
          startCursorAnim(1);   // SquishCursor
          if (full) { ns.inputEnabled = false; ns.state = "moveToOKButton"; }
        }
      } else if (role === KEY_ROLE_PAGE) {
        tryStartButtonFlash(BUTTON_PAGE, true, false);
        if (input === "a") ns.state = "startPageSwap";
      } else if (role === KEY_ROLE_BACKSPACE) {
        tryStartButtonFlash(BUTTON_BACK, true, false);
        if (input === "a") deleteTextCharacter();
      } else {
        tryStartButtonFlash(BUTTON_OK, true, false);
        if (input === "a") { se("se_select"); ns.state = "pressedOK"; }
      }
    }

    // HandleDpadMovement: wraps round each way; the buttons' column is one
    // past the last key, its three buttons standing for rows 0, 1-2 and 3.
    function handleDpadMovement(input) {
      const dx = input === "left" ? -1 : input === "right" ? 1 : 0;
      const dy = input === "up" ? -1 : input === "down" ? 1 : 0;
      let x = cursor.x + dx, y = cursor.y + dy;
      const prevX = cursor.x, cols = columnCount();
      if (x < 0) x = cols;
      if (x > cols) x = 0;
      if (dx !== 0) {
        if (x === cols) { buttonId = y; y = sKeyRowToButtonRow[y]; }
        else if (prevX === cols) y = y === 1 ? buttonId : sButtonRowToKeyRow[y];
      }
      if (x === cols) {
        if (y < 0) y = BUTTON_COUNT - 1;
        if (y >= BUTTON_COUNT) y = 0;
        if (y === 0) buttonId = BUTTON_BACK;
        else if (y === BUTTON_COUNT - 1) buttonId = BUTTON_OK;
      } else {
        if (y < 0) y = KBROW_COUNT - 1;
        if (y >= KBROW_COUNT) y = 0;
      }
      setCursorPos(x, y);
    }

    // The keys arrive as pressed and are read on the next frame (Task_HandleInput).
    // A on OK ends the screen, so that press is the last this one takes.
    window.GbaMenus.keys((k) => {
      if (ns.state === "done") return "done";
      if (!ns.inputEnabled || ns.state !== "handleInput" || pending) return undefined;
      pending = k;
      return k === "a" && cursor.x === columnCount() && cursor.y === 2 ? "ok" : undefined;
    });

    // ----- Changing the page -----

    // Task_HandlePageSwapAnim: the page in front slides down and the one
    // behind up (40 pixels, on a sine), they swap places half way, then
    // both slide back: 32 frames.
    function taskPageSwap() {
      const t = pageSwapTask;
      if (t.state === "done") { pageSwapTask = null; return; }
      t.frameCount += 4;
      vOffsetBgs[ns.bgToReveal].vofs = Sin(t.frameCount, 40);
      vOffsetBgs[ns.bgToHide].vofs = Sin((t.frameCount + 128) & 0xff, 40);
      if (t.state === 1 && t.frameCount >= 64) {
        [bg1.priority, bg2.priority] = [bg2.priority, bg1.priority];
        t.state = 2;
      } else if (t.state === 2 && t.frameCount >= 128) {
        [ns.bgToReveal, ns.bgToHide] = [ns.bgToHide, ns.bgToReveal];
        t.state = "done";
      }
    }
    // SpriteCB_PageSwap: the label slides down out of the button, changes
    // (with the button's colour) and drops back in from above.
    function spritePageSwap() {
      if (swapFrame.state === "slideOff") {
        if (++swapText.y2 > 7) {
          swapFrame.state = "slideOn";
          swapText.y2 = -4;
          swapText.invisible = true;
          swapText.gfx = sPageToNextGfxId[(swapFrame.page + 1) % KBPAGE_COUNT];
        }
      } else if (swapFrame.state === "slideOn") {
        swapText.invisible = false;
        if (++swapText.y2 >= 0) { swapText.y2 = 0; swapFrame.state = "idle"; }
      }
    }
    // DrawKeyboardPageOnDeck: the next page goes on the background behind.
    function drawKeyboardPageOnDeck() {
      const behind = bg1.priority > bg2.priority ? bg1 : bg2;
      behind.kb = sPageToNextKeyboardId[ns.currentPage];
    }

    // ----- Each frame (CB2_NamingScreen: the tasks, then the sprites) -----

    function step() {
      if (pageSwapTask) taskPageSwap();
      // Task_HandleInput: A, B, Select and Start are events; the D-pad moves the cursor.
      let input = null;
      if (ns.inputEnabled) {
        if (pending === "a" || pending === "b" || pending === "select" || pending === "start") input = pending;
        else handleDpadMovement(pending);
      }
      pending = null;
      // Task_NamingScreen
      switch (ns.state) {
        case "handleInput":
          handleKeyboardEvent(input);
          break;
        case "moveToOKButton":   // (once the cursor's squish is over)
          if (cursor.animEnded) { ns.inputEnabled = true; moveCursorToOKButton(); ns.state = "handleInput"; }
          break;
        case "startPageSwap":
          ns.inputEnabled = false;
          swapFrame.state = "slideOff"; swapFrame.page = ns.currentPage;
          pageSwapTask = { state: 1, frameCount: 0 };
          bg1.vofs = bg2.vofs = 0;
          setCursorInvisibility(true);
          tryStartButtonFlash(BUTTON_PAGE, false, true);
          se("se_win_open");
          ns.state = "waitPageSwap";
          break;
        case "waitPageSwap":
          if (!pageSwapTask) {
            let x = cursor.x;
            const onLastColumn = x === columnCount();
            ns.state = "handleInput";
            ns.currentPage = (ns.currentPage + 1) % KBPAGE_COUNT;
            if (onLastColumn) x = columnCount();
            else if (x >= columnCount()) x = columnCount() - 1;
            setCursorPos(x, cursor.y);
            drawKeyboardPageOnDeck();
            ns.inputEnabled = true;
            setCursorInvisibility(false);
          }
          break;
        case "pressedOK": {
          // SaveInputText: kept if there's more than spaces; FireRed then keeps
          // the name it had, here `fallback`.
          const typed = ns.text.join("");
          ns.inputEnabled = false;
          cursor.flashing = false;
          tryStartButtonFlash(BUTTON_COUNT, false, true);
          ns.state = "done";
          finish(/[^ ]/.test(typed) ? typed : (opts.fallback || typed));
          break;
        }
      }
      taskButtonFlash();
      // The sprites.
      spriteCursor();
      spritePageSwap();
      // SpriteCB_InputArrow: nudges left and back every 8 frames.
      if (arrow.delay === 0 || --arrow.delay === 0) { arrow.delay = 8; arrow.xPosId = (arrow.xPosId + 1) & 3; }
      arrow.x2 = [0, -4, -2, -1][arrow.xPosId];
      // SpriteCB_Underscore: the one where the next letter goes bobs.
      underscores.forEach((u, i) => {
        if (i !== textEntryPosition()) { u.y2 = 0; u.yPosId = 0; u.delay = 0; return; }
        u.y2 = [2, 3, 2, 1][u.yPosId];
        if (++u.delay > 8) { u.yPosId = (u.yPosId + 1) & 3; u.delay = 0; }
      });
      walkTime++;
    }

    // ----- Drawing -----

    // Text, in FireRed's font, as pictures (redrawn when it changes).
    const layers = {};
    function layer(kind, key, paint) {
      if (layers[kind] && layers[kind].key === key) return layers[kind].canvas;
      const s = window.GbaMenus.Surface();
      paint(s);
      layers[kind] = { key, canvas: s.canvas() };
      return layers[kind].canvas;
    }
    // PrintKeyboardKeys: WIN_KB_PAGE_1/2 at tiles (3, 10), a row every 16 pixels.
    const keysText = (kb) => layer("keys" + kb, "", (s) => {
      sNamingScreenKeyboardText[kb].forEach((row, i) => {
        let x = 3 * 8;
        for (const part of row.split(/(\{CLEAR \d+\})/)) {
          const clear = /^\{CLEAR (\d+)\}$/.exec(part);
          if (clear) { x += +clear[1]; continue; }
          for (const ch of part) x += s.text(ch, x, 10 * 8 + i * 16 + 1, WHITE, DARK_GRAY);
        }
      });
    });
    // The title (WIN_TEXT_ENTRY_BOX at tiles 9, 4) and the name (WIN_TEXT_ENTRY
    // at 8, 6, a letter every 8 pixels from inputCharBaseXPos).
    const entryText = () => layer("entry", ns.text.join(""), (s) => {
      s.text(title, 9 * 8 + 1, 4 * 8 + 1, DARK_GRAY, LIGHT_GRAY);
      ns.text.forEach((ch, i) => s.text(ch, ns.inputCharBaseXPos + i * 8, 6 * 8 + 1, DARK_GRAY, LIGHT_GRAY));
    });
    // The banner (WIN_BANNER, palette 11: the help bar's): "MOVE OK BACK", right-aligned.
    const bannerText = () => layer("banner", "", (s) => {
      const help = MENUS().palettes.std2;
      const str = "{DPAD_ANY}MOVE {A_BUTTON}OK {B_BUTTON}BACK";
      s.fill(0, 0, W, 16, help[15]);
      s.text(str, W - 4 - s.textWidth(str, "small"), 0, help[1], help[2], "small", help);
    });

    // The cursor, its colour 1 brightened `level` of 16, as one picture.
    const cursorCache = new Map();
    function cursorPicture(frame, level) {
      const key = frame + "/" + level;
      if (cursorCache.has(key)) return cursorCache.get(key);
      const c = document.createElement("canvas");
      c.width = 16; c.height = 16;
      const x = c.getContext("2d");
      x.drawImage(pic("cursor"), frame * 16, 0, 16, 16, 0, 0, 16, 16);
      if (level) x.drawImage(tint(pic("cursor-flash"), frame * 16, 0, 16, 16, css(lighten(CURSOR_RED, level >> 1, level))), 0, 0);
      c.id = "cursor" + key;
      cursorCache.set(key, c);
      return c;
    }

    function draw(g) {
      if (!PICTURES.every((n) => ready(pic(n)))) { g.fillStyle = "#000"; g.fillRect(0, 0, W, H); return; }
      const blit = (name, sx, sy, w, h, dx, dy) => g.drawImage(typeof name === "string" ? pic(name) : name, sx, sy, w, h, Math.round(dx), Math.round(dy), w, h);
      // BG3: the background, the title and the name.
      blit("background", 0, 0, W, H, 0, 0);
      g.drawImage(entryText(), 0, 0);
      // Priority 3 sprites: who's being named (walking on the spot,
      // ANIM_STD_GO_SOUTH: frames 3, 0, 4, 0, 8 frames each) at (56, 37), the
      // arrow and the underscores.
      if (ready(icon)) blit(icon, [3, 0, 4, 0][Math.floor(walkTime / 8) % 4] * iconW, 0, iconW, 32, 56 - iconW / 2, 37 - 16);
      blit("input-arrow", 0, 0, 8, 8, ns.inputCharBaseXPos - 5 - 4 + arrow.x2, 56 - 4);
      underscores.forEach((u, i) => blit("underscore", 0, 0, 8, 8, ns.inputCharBaseXPos + i * 8 + 3 - 4, 60 - 4 + u.y2));
      // BG2 and BG1, the keyboard pages, the one behind first.
      for (const bg of [bg1, bg2].sort((a, b) => b.priority - a.priority)) {
        blit(KEYBOARD_PICTURE[bg.kb], 0, 0, W, H, 0, -bg.vofs);
        g.drawImage(keysText(bg.kb), 0, -bg.vofs);
      }
      // Priority 1 sprites: the page button (its button, label and frame),
      // the cursor, BACK and OK. (The buttons' edges brighten as they flash.)
      const edge = (n, sy, h, x, y) => {
        if (buttonLevel[n]) g.drawImage(tint(pic("button-flash"), 0, sy, 40, h, css(lighten(BUTTON_EDGE, buttonLevel[n], buttonLevel[n]))), x, y);
      };
      blit("page-swap-button", 0, swapText.gfx * 16, 32, 16, 204 - 16, 83 - 8);
      if (!swapText.invisible) blit("page-swap-text", 0, swapText.gfx * 8, 24, 8, 204 - 12, 84 - 4 + swapText.y2);
      if (!cursor.invisible && cursor.x !== columnCount()) {
        // Semi-transparent (BLDALPHA 12/8 over the keyboard): 12/16 of the
        // cursor added to 8/16 of what's under it.
        const frame = cursor.anim === 1 ? (cursor.animTime < 8 ? 1 : 2) : 0;
        const c = cursorPicture(frame, cursor.level);
        const x = sPageColumnXPos[keyboardId()][cursor.x] + 38 - 8, y = cursor.y * 16 + 88 - 8;
        g.save();
        g.globalAlpha = 0.5;
        g.drawImage(tint(c, 0, 0, 16, 16, "#000"), x, y);
        g.globalAlpha = 0.75;
        g.globalCompositeOperation = "lighter";
        g.drawImage(c, x, y);
        g.restore();
      }
      blit("page-swap-frame", 0, 0, 40, 32, 204 - 20, 88 - 16);
      edge(BUTTON_PAGE, 0, 32, 204 - 20, 88 - 16);
      blit("back-button", 0, 0, 40, 24, 204 - 20, 116 - 12);
      edge(BUTTON_BACK, 32, 24, 204 - 20, 116 - 12);
      blit("ok-button", 0, 0, 40, 24, 204 - 20, 140 - 12);
      edge(BUTTON_OK, 56, 24, 204 - 20, 140 - 12);
      // BG0: the banner.
      g.drawImage(bannerText(), 0, 0);
    }

    function start() {
      // MainState_WaitFadeIn
      ns.inputEnabled = true;
      cursor.flashing = true;
    }

    const handle = {
      step, draw, start, done,
      // (For tests: where things stand.)
      get state() { return { page: ["symbols", "upper", "lower"][ns.currentPage], cursor: [cursor.x, cursor.y], text: ns.text.join(""), mode: ns.state }; }
    };
    // (NamingScreen.active: the one up, if any.)
    window.NamingScreen.active = handle;
    done.then(() => { if (window.NamingScreen.active === handle) window.NamingScreen.active = null; });
    return handle;
  }

  // The screen on a canvas of its own, faded in and out (to black, 16 steps
  // of 2 frames) as FireRed's MainState_FadeIn / MainState_FadeOut do.
  async function run(canvas, opts) {
    await preload(opts && typeof opts.icon === "string" ? opts.icon : null);
    const ns = create(opts);
    const g = canvas.getContext("2d");
    let fade = 16, fading = -1, last = 0, acc = 0, running = true, name = null;
    const frame = (now) => {
      if (!running) return;
      acc += Math.min(100, now - (last || now));
      last = now;
      while (acc >= 1000 / 60) {
        acc -= 1000 / 60;
        ns.step();
        fade = Math.max(0, Math.min(16, fade + fading * 0.5));
        if (fading < 0 && fade === 0) { fading = 0; ns.start(); }
        if (name !== null && fading === 0) fading = 1;
        if (fading > 0 && fade === 16) running = false;
      }
      g.save();
      g.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
      g.imageSmoothingEnabled = false;
      ns.draw(g);
      if (fade) { g.globalAlpha = fade / 16; g.fillStyle = "#000"; g.fillRect(0, 0, W, H); }
      g.restore();
      if (running) requestAnimationFrame(frame);
      else finished();
    };
    let finished;
    const out = new Promise((r) => { finished = () => r(name); });
    ns.done.then((n) => { name = n; });
    requestAnimationFrame(frame);
    return out;
  }

  window.NamingScreen = { create, run, preload, PICTURES, active: null };
})();
