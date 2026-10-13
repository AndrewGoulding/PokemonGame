// Saving and loading the player
// Depends on: window.Player
//
//   Save.write(player)         // -> { ok, error }   (browser storage)
//   Save.read()                // -> { player, warnings, error }   (player null if none)
//   Save.toFile(player)        // -> JSON text for a backup file
//   Save.fromFile(text)        // -> { player, warnings } or throws
//
// Saves live in this browser's localStorage, which a private window or
// clearing site data wipes, so the game also offers a save file to download.

(function () {
  "use strict";

  const KEY = "pokemon-game-save";

  function storage() {
    try { return window.localStorage || null; } catch (e) { return null; }
  }

  function write(player) {
    const store = storage();
    if (!store) return { ok: false, error: "This browser isn't letting the game save." };
    try {
      player.savedAt = Date.now();
      store.setItem(KEY, window.Player.serialize(player));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: "Saving failed: " + e.message };
    }
  }

  function read() {
    const store = storage();
    let text = null;
    try { text = store && store.getItem(KEY); } catch (e) { text = null; }
    if (!text) return { player: null, warnings: [] };
    try {
      return Object.assign({ error: null }, window.Player.load(JSON.parse(text)));
    } catch (e) {
      return { player: null, warnings: [], error: "Your save couldn't be loaded: " + e.message };
    }
  }

  function clear() {
    try { const store = storage(); if (store) store.removeItem(KEY); } catch (e) { /* nothing to clear */ }
  }

  function toFile(player) {
    return JSON.stringify(player, null, 1);
  }

  function fromFile(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error("That file isn't a save file."); }
    return window.Player.load(data);
  }

  window.Save = { KEY, write, read, clear, toFile, fromFile };
})();
