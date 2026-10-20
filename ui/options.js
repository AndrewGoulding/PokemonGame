// The Option screen's settings (FireRed's TEXT SPEED, BATTLE SCENE, BATTLE
// STYLE, SOUND, VOLUME (this game's), FRAME and FOLLOWER (HGSS's walking
// Pokémon: ui/follower.js)), kept in this browser for every save.
//
//   GameOptions.get()               // { textSpeed: 0-2, battleScene: 0 (on) / 1 (off), battleStyle: 0 (shift) / 1 (set),
//                                   //   sound: 0 mono / 1 stereo / 2 off, volume: 0-10, frame: 0-9,
//                                   //   follower: 0 (on, everywhere) / 1 (off), calls: 0 (on) / 1 (off: the Pokégear's chatter) }
//   GameOptions.set({ frame: 3 })   // changes, remembers and applies them
//
// Applying them: the text speed is how long battle messages stay up, the
// sound goes to ui/audio.js, and the frame is the menus' windows' (FireRed's
// graphics/text_window/type1-10.png; the text box is always FireRed's message
// box, as in FireRed).
(function () {
  "use strict";

  const KEY = "pokemon-options";
  const DEFAULTS = { textSpeed: 1, battleScene: 0, battleStyle: 0, sound: 1, volume: 10, frame: 0, follower: 0, calls: 0 };
  const TEXT_SPEED = [1.5, 1, 0.6];   // SLOW, MID, FAST: times the usual message time
  const CHAR_FRAMES = [8, 4, 1];      // ...and frames per letter as the text is written (sTextSpeedFrameDelays)

  let opts = Object.assign({}, DEFAULTS);
  try { Object.assign(opts, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* storage blocked */ }
  // (From when FOLLOWER was JOHTO / ON / OFF: ON either way, or OFF.)
  if (opts.followerModes !== 2) { opts.follower = opts.follower === 2 ? 1 : 0; opts.followerModes = 2; }
  // From before the Option screen: the Sound setting was on / off.
  try { if (localStorage.getItem(KEY) == null && localStorage.getItem("pokemon-sound") === "off") opts.sound = 2; } catch (e) { /* storage blocked */ }

  function apply() {
    if (window.Screen && window.Screen.setTextSpeed) {
      window.Screen.setTextSpeed(TEXT_SPEED[opts.textSpeed] || 1);
      window.Screen.setCharDelay((CHAR_FRAMES[opts.textSpeed] || 4) * 1000 / 60);
    }
    if (window.GameAudio) {
      window.GameAudio.setMono(opts.sound === 0);
      if (window.GameAudio.setVolume) window.GameAudio.setVolume((opts.volume == null ? 10 : opts.volume) / 10);
      if (window.GameAudio.enabled() !== (opts.sound !== 2)) window.GameAudio.setEnabled(opts.sound !== 2);
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
