// Shared text box and menu helpers
//
//   await Screen.message("It's super effective!");   // shows text, waits (click to skip)
//   const v = await Screen.ask("What will Pikachu do?", [{ label: "Thunderbolt", value: 0 }, ...]);
//
// Option fields: label (text), html (instead of label), value, disabled,
// className, wide (spans the full menu width).

(function () {
  "use strict";

  const MESSAGE_MS = 1100;   // how long each message stays up (click to skip)

  const textbox = document.getElementById("textbox");
  const menu = document.getElementById("menu");
  let skipWait = null;

  const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

  function say(text) { textbox.textContent = text; }

  function wait(ms) {
    return new Promise((resolve) => {
      const done = () => { clearTimeout(t); if (skipWait === done) skipWait = null; resolve(); };
      const t = setTimeout(done, ms);
      skipWait = done;
    });
  }

  // Shows text until the player clicks or presses a key (for signs and people).
  function read(text) {
    say(text);
    clearMenu();
    return new Promise((resolve) => {
      const done = () => { if (skipWait === done) skipWait = null; resolve(); };
      skipWait = done;
    });
  }

  async function message(text, ms) {
    say(text);
    await wait(ms || MESSAGE_MS);
  }

  function clearMenu() { menu.innerHTML = ""; }

  function addButton(opt, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = (opt.className || "") + (opt.wide ? " wide" : "");
    if (opt.html != null) b.innerHTML = opt.html; else b.textContent = opt.label;
    b.disabled = !!opt.disabled;
    if (opt.value === "back" || opt.value === false) b.dataset.back = "";   // what X / Esc picks
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
      const first = menu.querySelector("button:not(:disabled)");
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

  // Click the text box (or press Space/Enter while no menu is up) to skip ahead.
  textbox.addEventListener("click", () => { if (skipWait) skipWait(); });
  document.addEventListener("keydown", (e) => {
    if ([" ", "Enter", "z", "Z", "x", "X"].includes(e.key) && !e.repeat && skipWait && !menu.children.length) {
      e.preventDefault();
      skipWait();
    }
  });

  // ---------- Keyboard menus ----------
  //
  // Whenever choices are on screen (menu buttons, party cards, bag rows, tabs):
  // arrow keys move the highlight to the nearest choice that way, Z / Space /
  // Enter (A) picks it, and X / Esc (B) picks Back, Cancel or No. The overworld
  // has its own controls, so this stays out of its way.

  const shown = (el) => el.offsetParent !== null;
  const choices = () => [...document.querySelectorAll("#menu button:not(:disabled), #scene:not(.hidden) [data-pick]")].filter(shown);
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
    if (menu.querySelector(".pad")) return;                        // the overworld is in charge
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
      else (list.find((el) => menu.contains(el)) || list[0]).focus();
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

  // Pokémon sprites: assets/sprites/pokemon/[back/]<dex id>[-<form>].png.
  // A form sprite that hasn't been added yet falls back to the plain one.
  function spriteUrl(species, form, back) {
    const dex = window.DEX[species];
    return "assets/sprites/pokemon/" + (back ? "back/" : "") + (dex ? dex.id : 0) + (form ? "-" + form : "") + ".png";
  }
  function setSprite(img, species, form, back) {
    const src = spriteUrl(species, form, back);
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
        if (form && url === src) show(spriteUrl(species, "", back));   // no art for this form: use the base one
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
  function spriteTag(species, form, attrs) {
    const fallback = form ? ' onerror="this.onerror=null;this.src=\'' + spriteUrl(species, "") + '\'"' : "";
    return '<img src="' + spriteUrl(species, form) + '"' + fallback + " " + (attrs || 'alt=""') + ">";
  }

  window.Screen = { MESSAGE_MS, spriteUrl, setSprite, clearSprite, spriteTag, ballIcon, escapeHtml, say, wait, read, message, ask, clearMenu, learnMovePrompt };
})();
