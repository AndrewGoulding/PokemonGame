// The Option screen's settings (FireRed's TEXT SPEED, BATTLE SCENE, SOUND and
// FRAME), kept in this browser for every save.
//
//   GameOptions.get()               // { textSpeed: 0-2, battleScene: 0 (on) / 1 (off), sound: 0 mono / 1 stereo / 2 off, frame: 0-9 }
//   GameOptions.set({ frame: 3 })   // changes, remembers and applies them
//
// Applying them: the text speed is how long battle messages stay up, the
// sound goes to ui/audio.js, and the frame is the text box's border (FireRed's
// graphics/text_window/type1-10.png).
(function () {
  "use strict";

  const KEY = "pokemon-options";
  const DEFAULTS = { textSpeed: 1, battleScene: 0, sound: 1, frame: 0 };
  const TEXT_SPEED = [1.5, 1, 0.6];   // SLOW, MID, FAST: times the usual message time

  let opts = Object.assign({}, DEFAULTS);
  try { Object.assign(opts, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* storage blocked */ }
  // From before the Option screen: the Sound setting was on / off.
  try { if (localStorage.getItem(KEY) == null && localStorage.getItem("pokemon-sound") === "off") opts.sound = 2; } catch (e) { /* storage blocked */ }

  // The text box's border: the frame's 3x3 tiles, drawn at twice their size.
  function frameUrl(index) {
    const G = window.GBA_MENUS;
    const f = G && G.frames["type" + (index + 1)];
    if (!f) return null;
    const c = document.createElement("canvas");
    c.width = c.height = 24;
    const g = c.getContext("2d"), img = g.createImageData(24, 24);
    for (let i = 0; i < 24 * 24; i++) {
      const v = parseInt(f.px[i], 16);
      if (!v) continue;
      img.data.set(f.palette[v], i * 4);
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function apply() {
    if (window.Screen && window.Screen.setTextSpeed) window.Screen.setTextSpeed(TEXT_SPEED[opts.textSpeed] || 1);
    if (window.GameAudio) {
      window.GameAudio.setMono(opts.sound === 0);
      if (window.GameAudio.enabled() !== (opts.sound !== 2)) window.GameAudio.setEnabled(opts.sound !== 2);
    }
    const url = frameUrl(opts.frame);
    const box = document.getElementById("textbox");
    if (box && url) {
      box.style.borderImage = "url(" + url + ") 8 fill / 12px round";
      box.classList.add("framed");
    }
  }

  window.GameOptions = {
    get: () => Object.assign({}, opts),
    set(changes) {
      Object.assign(opts, changes);
      try { localStorage.setItem(KEY, JSON.stringify(opts)); } catch (e) { /* storage blocked */ }
      apply();
    },
    apply
  };
  apply();
})();
