// Shared text box and menu helpers
//
//   await Screen.message("It's super effective!");   // shows text, waits (A to skip)
//   const v = await Screen.ask("What will Pikachu do?", [{ label: "Thunderbolt", value: 0 }, ...]);
//   if (await Screen.yesNo("Save the game?")) ...     // FireRed's YES / NO box
//
// Option fields: label (text), html (instead of label), value, disabled,
// className, wide (spans the full menu width).

(function () {
  "use strict";

  const MESSAGE_MS = 1100;   // how long each message stays up once written (A to skip), at MID text speed
  let textSpeed = 1;         // the Option screen's TEXT SPEED: times MESSAGE_MS
  let charMs = 4000 / 60;    // ...and the time per letter: FireRed's 8, 4 or 1 frames (SLOW, MID, FAST)

  const textbox = document.getElementById("textbox");
  const menu = document.getElementById("menu");
  let skipWait = null;

  const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

  // The text box is a fixed size: text that would run past it (long lines
  // wrapping on a narrow screen) gets a smaller font until it fits.
  // The box is only on screen while it has something to say (in a battle
  // it always is: see the CSS).
  // As in FireRed, the text is written out a letter at a time; A (or B)
  // finishes it at once. `printed()` resolves once it's all there.
  let printing = null;   // { finish, done } while a text is being written out
  let asking = 0;        // counts up when the text box or menu changes (see ask)
  // `from`: how much of `text` is already on screen (after a scroll), so only
  // the rest is written out.
  function say(text, from) {
    asking++;
    text = String(text == null ? "" : text);
    if (printing) printing.finish();
    textbox.classList.remove("more");
    textbox.textContent = text;
    textbox.classList.toggle("empty", !text.trim());
    textbox.style.fontSize = "";
    let size = parseFloat(getComputedStyle(textbox).fontSize);
    while (textbox.scrollHeight > textbox.clientHeight + 1 && size > 10) textbox.style.fontSize = (size -= 1) + "px";
    if (!text.trim() || !charMs) return;
    let n = Math.min(from || 0, text.length), resolve;
    const state = { done: new Promise((r) => { resolve = r; }) };
    const timer = setInterval(() => { textbox.textContent = text.slice(0, ++n); if (n >= text.length) state.finish(); }, charMs);
    state.finish = () => {
      clearInterval(timer);
      textbox.textContent = text;
      if (printing === state) printing = null;
      resolve();
    };
    textbox.textContent = text.slice(0, n);
    printing = state;
  }
  const printed = () => (printing ? printing.done : Promise.resolve());

  // Waiting for A once the text is all there: FireRed's ▼ bobs in the corner.
  function more(on) { textbox.classList.toggle("more", on); }

  function wait(ms) {
    return new Promise((resolve) => {
      const done = () => { clearTimeout(t); if (skipWait === done) skipWait = null; resolve(); };
      const t = setTimeout(done, ms);
      skipWait = done;
    });
  }

  // The text box holds two lines, as FireRed's does: a longer text scrolls
  // up a line at a time, each time A is pressed (FireRed's \l). -> the
  // steps: [text on screen, how much of it was already there].
  function scrollSteps(text) {
    const lines = String(text == null ? "" : text).split("\n");
    if (lines.length <= 2) return [[lines.join("\n"), 0]];
    const steps = [[lines[0] + "\n" + lines[1], 0]];
    for (let i = 2; i < lines.length; i++) steps.push([lines[i - 1] + "\n" + lines[i], lines[i - 1].length + 1]);
    return steps;
  }
  const waitForA = () => new Promise((resolve) => {
    const done = () => { if (skipWait === done) skipWait = null; resolve(); };
    skipWait = done;
  });

  // Shows text until the player presses A (for signs and people).
  async function read(text) {
    clearMenu();
    for (const [shown, from] of scrollSteps(text)) {
      say(shown, from);
      await printed();
      more(true);
      await waitForA();
      more(false);
    }
  }

  // Shows text, written out, then a moment more (A moves it on).
  async function message(text, ms) {
    const steps = scrollSteps(text);
    for (let i = 0; i < steps.length; i++) {
      say(steps[i][0], steps[i][1]);
      await printed();
      more(true);
      if (i < steps.length - 1) await waitForA(); else await wait(ms || MESSAGE_MS * textSpeed);
      more(false);
    }
  }

  function clearMenu() { asking++; menu.innerHTML = ""; }

  function addButton(opt, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = (opt.className || "") + (opt.wide ? " wide" : "");
    if (opt.html != null) b.innerHTML = opt.html; else b.textContent = opt.label;
    b.disabled = !!opt.disabled;
    if (opt.value === "back" || opt.value === false) b.dataset.back = "";   // what X / Esc picks
    if (opt.focus) b.dataset.focus = "";   // highlighted first, instead of the first button
    b.addEventListener("click", onClick);
    menu.appendChild(b);
    return b;
  }

  // Shows `text` and a menu, resolves with the chosen option's value. As in
  // FireRed, the choices come up once the text is all written out (A finishes
  // it). If something else takes the text box or menu first, this one is
  // dropped.
  async function ask(text, options) {
    // (A question longer than the box: its first lines scroll by, then the
    // last two stay up with the choices.)
    const steps = scrollSteps(text);
    for (const [shown, from] of steps.slice(0, -1)) await read1(shown, from);
    say(steps[steps.length - 1][0], steps[steps.length - 1][1]);
    clearMenu();
    const id = asking;
    await printed();
    if (id !== asking) return new Promise(() => {});
    return new Promise((resolve) => {
      for (const opt of options) {
        addButton(opt, () => { clearMenu(); resolve(opt.value); });
      }
      // (Not while typing in a field: a name, the debug menu's.)
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName)) return;
      const first = menu.querySelector("button[data-focus]:not(:disabled)") || menu.querySelector("button:not(:disabled):not([data-b-only])");
      if (first) first.focus();
    });
  }

  async function read1(shown, from) {
    clearMenu();
    say(shown, from);
    await printed();
    more(true);
    await waitForA();
    more(false);
  }

  // A question before a menu drawn over the screen (FireRed's message then
  // waitmessage): its first lines scroll by, the last two stay up; resolves
  // once they're written out.
  async function prompt(text) {
    const steps = scrollSteps(text);
    for (const [shown, from] of steps.slice(0, -1)) await read1(shown, from);
    say(steps[steps.length - 1][0], steps[steps.length - 1][1]);
    clearMenu();
    await printed();
  }

  // FireRed's YES / NO box (GbaMenus.yesNo) once `text` is written out:
  // resolves true for YES, false for NO or B.
  async function yesNo(text, defaultNo) {
    await prompt(text);
    const frame = window.GameOptions ? window.GameOptions.get().frame : 0;
    return window.GbaMenus.yesNo(document.getElementById("overlay"), { frame, cursor: defaultNo ? 1 : 0 });
  }

  // "X wants to learn M..." Resolves with the slot to overwrite, or null to skip.
  async function learnMovePrompt(name, moveNames, move) {
    await message(name + " wants to learn the move " + move + ".");
    await message("But " + name + " can't learn more than four moves.");
    for (;;) {
      const slot = await ask("Should a move be forgotten to make space for " + move + "?",
        moveNames.map((m, i) => ({ label: m, value: i })).concat([{ label: "Don't learn " + move, value: null, className: "action", wide: true }]));
      if (slot == null) {
        const sure = await yesNo("Stop trying to teach " + move + "?");
        if (!sure) continue;
        await message(name + " did not learn " + move + ".");
        return null;
      }
      await message("1, 2, and... ... ... Poof!");
      await message(name + " forgot how to use " + moveNames[slot] + ".");
      await message("And... " + name + " learned " + move + "!");
      return slot;
    }
  }

  // A or B (Z / X, Space / Enter) while no menu is up moves the text on.
  document.addEventListener("keydown", (e) => {
    if ([" ", "Enter", "z", "Z", "x", "X"].includes(e.key) && !e.repeat && (printing || skipWait) && !menu.querySelector("button")) {
      e.preventDefault();
      if (printing) printing.finish(); else skipWait();
    }
  });

  // ---------- Keyboard menus ----------
  //
  // Whenever choices are on screen (menu buttons, party cards, bag rows, tabs):
  // arrow keys move the highlight to the nearest choice that way, Z / Space /
  // Enter (A) picks it, and X / Esc (B) picks Back, Cancel or No. The overworld
  // has its own controls, so this stays out of its way.

  const shown = (el) => el.offsetParent !== null;
  const choices = () => [...document.querySelectorAll("#menu button:not(:disabled), #scene:not(.hidden) [data-pick], #scene:not(.hidden) [data-swap]")].filter(shown);
  const ARROWS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

  // The closest choice in direction [dx, dy] from `from`. Ones in line with
  // it come first: on the same row (overlapping it) for left and right, in
  // the same column for up and down, so a wide button underneath doesn't win
  // over the one beside you. Distance is from edge to edge.
  function nearest(from, list, [dx, dy]) {
    const a = from.getBoundingClientRect();
    const mid = (r) => [r.left + r.width / 2, r.top + r.height / 2];
    const [fx, fy] = mid(a);
    let best = null, bestScore = Infinity;
    for (const el of list) {
      if (el === from) continue;
      const r = el.getBoundingClientRect();
      const [x, y] = mid(r);
      if ((x - fx) * dx + (y - fy) * dy <= 1) continue;   // not that way
      const gap = dx > 0 ? r.left - a.right : dx < 0 ? a.left - r.right : dy > 0 ? r.top - a.bottom : a.top - r.bottom;
      const inLine = dx ? r.top < a.bottom - 1 && r.bottom > a.top + 1 : r.left < a.right - 1 && r.right > a.left + 1;
      const across = dx ? Math.abs(y - fy) : Math.abs(x - fx);
      const score = (inLine ? 0 : 1e6) + Math.max(0, gap) + across * 2;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    return best;
  }

  document.addEventListener("keydown", (e) => {
    // A press that just moved a message on isn't also a pick in the menu that
    // came up because of it (the first move, "Stop" on an evolution).
    if (e.defaultPrevented) return;
    if (!menu.querySelector("button")) return;                     // a message: Z just moves the text on
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName)) return;
    const list = choices();
    if (!list.length) return;
    const current = list.includes(document.activeElement) ? document.activeElement : null;
    if (ARROWS[e.key]) {
      e.preventDefault();
      const next = current ? nearest(current, list, ARROWS[e.key]) : list.find((el) => menu.contains(el)) || list[0];
      if (next) { next.focus(); next.scrollIntoView({ block: "nearest" }); }
    } else if (["z", "Z", " ", "Enter"].includes(e.key)) {
      if (e.repeat) return;
      e.preventDefault();
      if (current) current.click();
      else { const first = list.find((el) => menu.contains(el)) || list[0]; if (first) first.focus(); }
    } else if (["x", "X", "Escape"].includes(e.key)) {
      if (e.repeat) return;
      const cancel = menu.querySelector("button[data-back]:not(:disabled)");
      if (cancel) { e.preventDefault(); cancel.click(); }
    }
  });

  // A small Poké Ball: red for a species you've caught, gray for one you haven't.
  function ballIcon(caught) {
    const top = caught ? "#e3350d" : "#9aa0a8";
    return '<svg class="ball-icon' + (caught ? " caught" : "") + '" viewBox="0 0 16 16" width="12" height="12" role="img" aria-label="' +
      (caught ? "Caught" : "Not caught") + '"><circle cx="8" cy="8" r="7" fill="#fff" stroke="#222" stroke-width="1.5"/>' +
      '<path d="M1 8a7 7 0 0 1 14 0z" fill="' + top + '" stroke="#222" stroke-width="1.5"/>' +
      '<circle cx="8" cy="8" r="2.3" fill="#fff" stroke="#222" stroke-width="1.5"/></svg>';
  }

  // Pokémon sprites: assets/sprites/pokemon/[back/][shiny/]<dex id>[-<form>].png.
  // A form sprite that hasn't been added yet falls back to the plain one.
  function spriteUrl(species, form, back, shiny) {
    const dex = window.DEX[species];
    return "assets/sprites/pokemon/" + (back ? "back/" : "") + (shiny ? "shiny/" : "") + (dex ? dex.id : 0) + (form ? "-" + form : "") + ".png";
  }
  // Party icons (tools/build-party-menu.js): assets/sprites/icons/<dex id>[-<form>].png.
  function iconUrl(species, form) {
    const dex = window.DEX[species];
    return "assets/sprites/icons/" + (dex ? dex.id : 0) + (form ? "-" + form : "") + ".png";
  }
  // (tint [r, g, b]: the picture blended halfway to that colour, as a
  // Terastallized Pokémon's is: BlendPalette(..., 8, its Tera Type's colour).
  // An SVG filter does it, through the CSS variable --tint (.sprite's filter
  // in ui/battle-screen.css): unlike drawing the picture on a canvas and
  // reading it back, it works when the game is opened straight from the file
  // (file://, where reading a picture's pixels is forbidden).)
  function tintFilter(tint) {
    const id = "tint-" + tint.join("-");
    if (!document.getElementById(id)) {
      let svg = document.getElementById("tint-filters");
      if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = "tint-filters";
        svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
        svg.style.position = "absolute";
        document.body.appendChild(svg);
      }
      const [r, g, b] = tint.map((c) => (c / 255 / 2).toFixed(4));
      svg.insertAdjacentHTML("beforeend", '<filter id="' + id + '" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="' +
        "0.5 0 0 0 " + r + " 0 0.5 0 0 " + g + " 0 0 0.5 0 " + b + ' 0 0 0 1 0"/></filter>');
    }
    return "url(#" + id + ")";
  }
  function setSprite(img, species, form, back, shiny, tint) {
    img.style.setProperty("--tint", tint ? tintFilter(tint) : "none");
    const src = spriteUrl(species, form, back, shiny);
    if (img.dataset.wanted === src) return;
    if (img.getAttribute("src") === src) return;
    img.dataset.wanted = src;
    // Keep the old picture (the last Pokémon here) from showing while the new
    // one loads. "load" can fire before the picture is decoded, and browsers keep
    // painting the old one until then, so wait for decode() before showing it.
    img.style.visibility = "hidden";
    const show = (url) => {
      img.src = url;
      img.decode().then(() => {
        if (img.dataset.wanted === src) img.style.visibility = "";
      }, () => {
        if (img.dataset.wanted !== src) return;
        if (form && url === src) show(spriteUrl(species, "", back, shiny));   // no art for this form: use the base one
        else img.style.visibility = "";
      });
    };
    show(src);
  }
  // Forgets an <img>'s Pokémon (between battles), so nothing old can show.
  function clearSprite(img) {
    img.removeAttribute("src");
    delete img.dataset.wanted;
    img.style.visibility = "hidden";
  }
  // The same as an <img> tag, for HTML built as strings.
  function spriteTag(species, form, attrs, shiny) {
    const fallback = form ? ' onerror="this.onerror=null;this.src=\'' + spriteUrl(species, "", false, shiny) + '\'"' : "";
    return '<img src="' + spriteUrl(species, form, false, shiny) + '"' + fallback + " " + (attrs || 'alt=""') + ">";
  }

  const setTextSpeed = (f) => { textSpeed = f; };
  const setCharDelay = (ms) => { charMs = ms; };

  window.Screen = { MESSAGE_MS, setTextSpeed, setCharDelay, printed, spriteUrl, iconUrl, setSprite, clearSprite, spriteTag, ballIcon, escapeHtml, say, wait, read, message, ask, prompt, yesNo, clearMenu, learnMovePrompt, waitForA };
})();
