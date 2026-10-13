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
    if ((e.key === " " || e.key === "Enter") && skipWait && !menu.children.length) {
      e.preventDefault();
      skipWait();
    }
  });

  window.Screen = { MESSAGE_MS, escapeHtml, say, wait, message, ask, clearMenu, learnMovePrompt };
})();
