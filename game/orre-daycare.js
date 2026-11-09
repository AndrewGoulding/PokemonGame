// Agate Village's Day-Care Lady (Colosseum's: its M3_houseD_1F), in her cottage (AgateVillage_DayCare, drawn by
// tools/lib/orre-rooms-agate.js). She raises one Pokémon at a time (player.flags.orreDayCare: { record, steps }).
// A Pokémon left with her gains 1 Exp. Point a step (Gen 3's Day-Care; Colosseum's text doesn't say), as far as Orre's
// level cap; a Shadow Pokémon's heart opens by its nature's Day-Care amount every 256 steps (ui/game.js's heartStep;
// game/orre-heart.js), it gains Exp. Points, kept for it, only once under three bars of its heart are left (the LP
// Archive's Colosseum guide), and being left with her ends Hyper Mode. Taking it back costs $100 and $100 a level it
// grew (Gen 3's; Colosseum's text names a price but not how it's reckoned).
// Depends on: window.Orre, window.WORLD_MAPS, window.Experience, window.OrreHeart.
"use strict";

(function () {
  const SCRIPT = "AgateVillage_DayCare_EventScript_Lady";
  const state = (player) => (player.flags.orreDayCare && player.flags.orreDayCare.record ? player.flags.orreDayCare : null);
  const held = (player) => (state(player) || {}).record || null;
  function deposit(player, record, levelCap) {
    // (Leaving it here ends a Shadow Pokémon's Hyper Mode. Only a Shadow Pokémon's: anyone else's `hyper` is the
    // stats it's been Hyper Trained in, game/bag.js, kept.)
    if (record.shadow) record.hyper = false;
    player.flags.orreDayCare = { record, steps: 0, level: record.level, cap: levelCap };
  }
  // A step with her Pokémon: Exp. Points (a Shadow Pokémon's kept for it, once they are).
  function step(player, levelCap) {
    const s = state(player);
    if (!s) return;
    s.steps = (s.steps | 0) + 1;
    const r = s.record;
    if (r.shadow && r.heart != null) { if (window.OrreHeart.banks(r)) r.shadowExp = (r.shadowExp | 0) + 1; return; }
    const E = window.Experience, rate = E.growthRate(r.species), cap = Math.min(100, Math.max(r.level, levelCap || 100));
    r.exp = Math.min((r.exp | 0) + 1, E.expForLevel(rate, cap));
  }
  // The levels it's grown, by its Exp. Points now.
  function grown(player) {
    const s = state(player);
    if (!s) return 0;
    const r = s.record, E = window.Experience;
    return Math.max(0, E.levelForExp(E.growthRate(r.species), r.exp | 0) - r.level);
  }
  const fee = (player) => 100 + 100 * grown(player);
  // Takes it back: its new level (its HP up with it). Returns the record.
  function withdraw(player) {
    const s = state(player);
    if (!s) return null;
    const r = s.record, up = grown(player);
    if (up) { const before = window.Party.maxHp(r); r.level += up; r.hp = Math.max(0, (r.hp | 0) + window.Party.maxHp(r) - before); }
    delete player.flags.orreDayCare;
    return r;
  }

  // The lady, in her cottage, behind the counter.
  {
    const m = (window.WORLD_MAPS || {}).AgateVillage_DayCare;
    if (m && !m.people.some((p) => p.script === SCRIPT)) {
      m.people.push({ id: Math.max(-1, ...m.people.map((p) => p.id)) + 1, x: 2, y: 2, movement: "face_down", rangeX: 0, rangeY: 0, script: SCRIPT,
        flag: null, text: null, localId: "LOCALID_ORRE_DAYCARE_LADY", sprite: "em_old_woman", width: 16, height: 32, frames: 9 });
    }
  }

  window.OrreDayCare = { SCRIPT, held, deposit, step, grown, fee, withdraw };
})();
