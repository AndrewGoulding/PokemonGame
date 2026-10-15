// The on-screen Game Boy Advance buttons under the text box: a D-pad, A, B,
// Start and Select. They're the game's controls: each one presses the key the
// game already listens for (arrows, Z for A, X for B), so a keyboard works the
// same way. Start and Select send the keys "Start" and "Select"; on a keyboard,
// Enter (or Esc / M) is Start and Backspace is Select.
//
// Taps and clicks anywhere else (menu choices, people on the map, the text
// box) do nothing: only the buttons control the game. Typing a name, the
// debug menu's fields and dragging cards to reorder them still work.
(function () {
  "use strict";

  const KEYS = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
    a: "z", b: "x", start: "Start", select: "Select" };
  const REPEAT_DELAY = 350, REPEAT_EVERY = 110;   // a held D-pad direction repeats in menus

  const pad = document.createElement("div");
  pad.className = "gamepad";
  pad.innerHTML =
    '<div class="dpad">' +
      '<button type="button" data-btn="up" aria-label="Up">▲</button>' +
      '<button type="button" data-btn="left" aria-label="Left">◀</button>' +
      '<span class="dpad-mid"></span>' +
      '<button type="button" data-btn="right" aria-label="Right">▶</button>' +
      '<button type="button" data-btn="down" aria-label="Down">▼</button>' +
    "</div>" +
    '<div class="sys">' +
      '<button type="button" data-btn="select">Select</button>' +
      '<button type="button" data-btn="start">Start</button>' +
    "</div>" +
    '<div class="ab">' +
      '<button type="button" data-btn="b" aria-label="B">B</button>' +
      '<button type="button" data-btn="a" aria-label="A">A</button>' +
    "</div>";
  document.querySelector(".game").appendChild(pad);

  const typing = (el) => el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !/^(checkbox|radio)$/.test(el.type);

  function send(type, key, repeat) {
    const target = document.activeElement && document.activeElement !== document.body ? document.activeElement : document;
    target.dispatchEvent(new KeyboardEvent(type, { key, repeat: !!repeat, bubbles: true, cancelable: true }));
  }

  for (const b of pad.querySelectorAll("[data-btn]")) {
    const name = b.dataset.btn;
    let down = null;   // { key, timer }
    const release = () => {
      if (!down) return;
      clearTimeout(down.timer); clearInterval(down.timer);
      b.classList.remove("pressed");
      send("keyup", down.key);
      down = null;
    };
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();                       // keeps the focus (the menu cursor, a name being typed) where it is
      if (down) return;
      b.setPointerCapture(e.pointerId);
      b.classList.add("pressed");
      // A while typing a name is "done" (Enter).
      const key = name === "a" && typing(document.activeElement) ? "Enter" : KEYS[name];
      down = { key, timer: null };
      send("keydown", key);
      if (KEYS[name].startsWith("Arrow")) {
        down.timer = setTimeout(() => {
          if (down) down.timer = setInterval(() => send("keydown", key, true), REPEAT_EVERY);
        }, REPEAT_DELAY);
      }
    });
    b.addEventListener("pointerup", release);
    b.addEventListener("pointercancel", release);
    b.addEventListener("lostpointercapture", release);
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // On a keyboard, Enter is Start and Backspace is Select (as on an emulator),
  // except while typing a name or a password, where they're themselves.
  const KEYBOARD = { Enter: "Start", Backspace: "Select" };
  for (const type of ["keydown", "keyup"]) {
    document.addEventListener(type, (e) => {
      if (!e.isTrusted || !KEYBOARD[e.key] || typing(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      e.target.dispatchEvent(new KeyboardEvent(type, { key: KEYBOARD[e.key], repeat: e.repeat, bubbles: true, cancelable: true }));
    }, true);
  }

  // Only the buttons control the game: a real tap or click on anything else
  // (except a text field, a checkbox or a file picker) is ignored. The game's
  // own clicks (A on a menu choice) aren't real ones, so they go through.
  document.addEventListener("click", (e) => {
    if (!e.isTrusted || !e.target.closest) return;
    if (e.target.closest(".gamepad, input, label, select, textarea, a[download]")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  window.GamePad = { element: pad };
})();
