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
    // Keep the old picture (the last Pokémon here) from showing while the new one loads.
    img.style.visibility = "hidden";
    img.onload = () => { img.style.visibility = ""; };
    img.onerror = () => {
      img.onerror = null;
      if (form) img.src = spriteUrl(species, "", back);   // no art for this form: use the base one
      else img.style.visibility = "";
    };
    img.src = src;
  }
  // The same as an <img> tag, for HTML built as strings.
  function spriteTag(species, form, attrs) {
    const fallback = form ? ' onerror="this.onerror=null;this.src=\'' + spriteUrl(species, "") + '\'"' : "";
    return '<img src="' + spriteUrl(species, form) + '"' + fallback + " " + (attrs || 'alt=""') + ">";
  }

  window.Screen = { MESSAGE_MS, spriteUrl, setSprite, spriteTag, escapeHtml, say, wait, read, message, ask, clearMenu, learnMovePrompt };
})();
