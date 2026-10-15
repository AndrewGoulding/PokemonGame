// Shared text box and menu helpers
//
//   await Screen.message("It's super effective!");   // shows text, waits (A to skip)
//   const v = await Screen.ask("What will Pikachu do?", [{ label: "Thunderbolt", value: 0 }, ...]);
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
  function say(text) {
    text = String(text == null ? "" : text);
    if (printing) printing.finish();
    textbox.classList.remove("more");
    textbox.textContent = text;
    textbox.classList.toggle("empty", !text.trim());
    textbox.style.fontSize = "";
    let size = parseFloat(getComputedStyle(textbox).fontSize);
    while (textbox.scrollHeight > textbox.clientHeight + 1 && size > 10) textbox.style.fontSize = (size -= 1) + "px";
    if (!text.trim() || !charMs) return;
    let n = 0, resolve;
    const state = { done: new Promise((r) => { resolve = r; }) };
    const timer = setInterval(() => { textbox.textContent = text.slice(0, ++n); if (n >= text.length) state.finish(); }, charMs);
    state.finish = () => {
      clearInterval(timer);
      textbox.textContent = text;
      if (printing === state) printing = null;
      resolve();
    };
    textbox.textContent = "";
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

  // Shows text until the player presses A (for signs and people).
  async function read(text) {
    say(text);
    clearMenu();
    await printed();
    more(true);
    await new Promise((resolve) => {
      const done = () => { if (skipWait === done) skipWait = null; resolve(); };
      skipWait = done;
    });
    more(false);
  }

  // Shows text, written out, then a moment more (A moves it on).
  async function message(text, ms) {
    say(text);
    await printed();
    more(true);
    await wait(ms || MESSAGE_MS * textSpeed);
    more(false);
  }

  function clearMenu() { menu.innerHTML = ""; }

  function addButton(opt, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = (opt.className || "") + (opt.wide ? " wide" : "");
    if (opt.html != null) b.innerHTML = opt.html; else b.textContent = opt.label;
    b.disabled = !!opt.disabled;
    if (opt.value === "back" || opt.value === false) b.dataset.back = "";   // what X / Esc picks
    // B only (stopping an evolution): X / Esc or a click picks it, never A.
    if (opt.bOnly) { b.dataset.back = ""; b.dataset.bOnly = ""; }
    if (opt.focus) b.dataset.focus = "";   // highlighted first, instead of the first button
    b.addEventListener("click", onClick);
    menu.appendChild(b);
    return b;
  }

  // Shows `text` and a menu, resolves with the chosen option's value.
  function ask(text, options) {
    say(text);
    clearMenu();
    return new Promise((resolve) => {
      for (const opt of options) {
        addButton(opt, () => { clearMenu(); resolve(opt.value); });
      }
      const first = menu.querySelector("button[data-focus]:not(:disabled)") || menu.querySelector("button:not(:disabled):not([data-b-only])");
      if (first) first.focus();
    });
  }

  // "X wants to learn M..." Resolves with the slot to overwrite, or null to skip.
  async function learnMovePrompt(name, moveNames, move) {
    await message(name + " wants to learn the move " + move + ".");
    await message("But " + name + " can't learn more than four moves.");
    for (;;) {
      const slot = await ask("Should a move be forgotten to make space for " + move + "?",
        moveNames.map((m, i) => ({ label: m, value: i })).concat([{ label: "Don't learn " + move, value: null, className: "action", wide: true }]));
      if (slot == null) {
        const sure = await ask("Stop trying to teach " + move + "?",
          [{ label: "Yes", value: true, className: "action" }, { label: "No", value: false, className: "action" }]);
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

  // The closest choice in direction [dx, dy] from `from`, favouring ones in line with it.
  function nearest(from, list, [dx, dy]) {
    const c = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const [fx, fy] = c(from);
    let best = null, bestScore = Infinity;
    for (const el of list) {
      if (el === from) continue;
      const [x, y] = c(el);
      const along = (x - fx) * dx + (y - fy) * dy;          // distance in the arrow's direction
      const across = Math.abs((x - fx) * dy) + Math.abs((y - fy) * dx);
      if (along <= 1) continue;
      const score = along + across * 2;
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
      const pickable = (el) => !("bOnly" in el.dataset);
      if (current) { if (pickable(current)) current.click(); }
      else { const first = list.find((el) => menu.contains(el) && pickable(el)) || list.find(pickable); if (first) first.focus(); }
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
  function setSprite(img, species, form, back, shiny) {
    const src = spriteUrl(species, form, back, shiny);
    if (img.getAttribute("src") === src || img.dataset.wanted === src) return;
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

  window.Screen = { MESSAGE_MS, setTextSpeed, setCharDelay, printed, spriteUrl, setSprite, clearSprite, spriteTag, ballIcon, escapeHtml, say, wait, read, message, ask, clearMenu, learnMovePrompt };
})();
