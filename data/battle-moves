// Move-specific effects for battle.js (Gen 6)
// Load after battle.js is NOT required; battle.js reads window.BATTLE_MOVE_EFFECTS lazily.
//
// Most moves are driven purely by the data in moves.js (damage, status, boosts,
// secondaries, side conditions, ...). This file only holds the moves that need
// custom code. Two tables, keyed by move id (lowercase, no spaces):
//
//   status[id](battle, user, target, move)   -> false if the move fails
//   afterHit[id](battle, user, target, move, damageDealt)
//
// A status function may return false (move failed), true (continue with the
// move's data-driven effects) or "done" (fully handled, skip the data effects).
// Status moves in neither this table nor described by moves.js data fail with
// "But it failed!".

(function () {
  "use strict";

  const E = (effectType, id, name) => ({ effectType, id, name: name || id });
  const toID = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const status = {};
  const afterHit = {};

  // ---- No-effect moves ----
  for (const id of ["splash", "celebrate", "holdhands"]) status[id] = () => true;

  // ---- Healing ----
  const heal50 = (b, user) => (b.heal(user, Math.floor(user.maxhp / 2), user, E("Move", "heal", "heal")) ? true : false);
  for (const id of ["recover", "softboiled", "milkdrink", "slackoff", "healorder"]) status[id] = heal50;
  status.roost = (b, user) => {
    if (!heal50(b, user)) return false;
    if (user.hasType("Flying")) {
      user.types = user.types.filter((t) => t !== "Flying");
      if (!user.types.length) user.types = ["Normal"];
      b.addVolatile(user, "roost", user);
    }
    return true;
  };
  const weatherHeal = (b, user) => {
    const w = b.getWeather();
    const frac = w === "SunnyDay" || w === "DesolateLand" ? 2 / 3 : w ? 1 / 4 : 1 / 2;
    return b.heal(user, Math.floor(user.maxhp * frac), user, E("Move", "heal", "heal")) ? true : false;
  };
  for (const id of ["moonlight", "synthesis", "morningsun"]) status[id] = weatherHeal;
  status.rest = (b, user) => {
    if (user.hp >= user.maxhp || user.status === "slp") return false;
    if (user.hasAbility(["Insomnia", "Vital Spirit"])) return false;
    const g = b.field.terrain;
    if (b.isGrounded(user) && (g === "ElectricTerrain" || g === "MistyTerrain")) return false;
    user.status = ""; user.statusState = {};
    user.hp = user.maxhp;
    user.status = "slp";
    user.statusState = { source: user, time: 3 };
    b.add("-status", user, "slp", "[from] move: Rest");
    b.add("-heal", user, b.hpStr(user), "[from] move: Rest");
    return true;
  };
  status.painsplit = (b, user, target) => {
    const avg = Math.floor((user.hp + target.hp) / 2);
    user.hp = Math.min(user.maxhp, avg); target.hp = Math.min(target.maxhp, avg);
    b.add("-sethp", user, b.hpStr(user), target, b.hpStr(target), "[from] move: Pain Split");
    return true;
  };
  status.healbell = status.aromatherapy = (b, user) => {
    for (const m of user.side.pokemon) if (!m.fainted && m.status) { m.status = ""; m.statusState = {}; }
    b.add("-activate", user, "move: Heal Bell");
    return true;
  };
  status.refresh = (b, user) => (user.status && ["brn", "par", "psn", "tox"].includes(user.status) ? b.cureStatus(user) : false);

  // ---- Stat manipulation ----
  status.bellydrum = (b, user) => {
    if (user.hp <= Math.floor(user.maxhp / 2) || user.boosts.atk >= 6) return false;
    user.hp -= Math.floor(user.maxhp / 2);
    b.add("-damage", user, b.hpStr(user), "[from] Belly Drum");
    user.boosts.atk = 6;
    b.add("-setboost", user, "atk", 6, "[from] move: Belly Drum");
    return true;
  };
  status.haze = (b) => {
    for (const m of b.getActives()) for (const k of Object.keys(m.boosts)) m.boosts[k] = 0;
    b.add("-clearallboost");
    return true;
  };

  // ---- Hazards and field ----
  status.defog = (b, user, target) => {
    b.boost(target, { evasion: -1 }, user, E("Move", "defog", "Defog"));
    for (const s of [user.side, target.side]) {
      for (const id of ["spikes", "toxicspikes", "stealthrock", "stickyweb"]) b.removeSideCondition(s, id);
    }
    for (const id of ["reflect", "lightscreen", "safeguard", "mist"]) b.removeSideCondition(target.side, id);
    return true;
  };
  status.perishsong = (b, user) => {
    b.add("-fieldactivate", "move: Perish Song");
    for (const m of b.getActives()) b.addVolatile(m, "perishsong", user);
    return true;
  };

  // ---- Items ----
  const swapItems = (b, user, target) => {
    if (user.item === target.item && !user.item) return false;
    const a = user.item, c = target.item;
    user.item = c; target.item = a;
    delete user.volatiles.choicelock; delete target.volatiles.choicelock;
    b.add("-activate", user, "move: Trick", "[of] " + target.ident);
    return true;
  };
  status.trick = status.switcheroo = swapItems;

  // ---- Move-calling moves ----
  status.metronome = (b, user) => {
    const pool = Object.keys(window.MOVES).filter((n) => window.MOVES[n].flags.metronome);
    const name = b.sample(pool);
    b.execMove(user, b.getActiveMove(name), { bounced: true });
    return true;
  };
  status.sleeptalk = (b, user) => {
    if (user.status !== "slp") return false;
    const pool = user.moves.filter((m) => !window.MOVES[m.name].flags.nosleeptalk && m.id !== "sleeptalk");
    if (!pool.length) return false;
    const pick = b.sample(pool);
    b.execMove(user, b.getActiveMove(pick.name), { bounced: true });
    return true;
  };

  // ---- Stockpile family ----
  status.stockpile = (b, user) => {
    let st = user.volatiles.stockpile;
    if (st && st.layers >= 3) return false;
    if (!st) { b.addVolatile(user, "stockpile", user); st = user.volatiles.stockpile; }
    st.layers++;
    b.add("-start", user, "stockpile" + st.layers);
    const before = { def: user.boosts.def, spd: user.boosts.spd };
    b.boost(user, { def: 1, spd: 1 }, user, E("Move", "stockpile", "Stockpile"));
    st.def += user.boosts.def - before.def;
    st.spd += user.boosts.spd - before.spd;
    return "done";
  };
  status.swallow = (b, user) => {
    const st = user.volatiles.stockpile;
    if (!st || !st.layers) return false;
    const frac = [0, 0.25, 0.5, 1][st.layers];
    const healed = b.heal(user, Math.floor(user.maxhp * frac), user, E("Move", "swallow", "Swallow"));
    user.removeVolatile("stockpile");
    return healed ? "done" : false;
  };

  // ---- Transform and Mimic ----
  status.transform = (b, user, target) => (b.transformInto(user, target) ? "done" : false);
  status.mimic = (b, user, target) => {
    const lm = target.lastMove;
    if (!lm) return false;
    let m;
    try { m = b.getActiveMove(lm); } catch (e) { return false; }
    if (m.flags.failmimic || user.moves.some((x) => x.id === m.id)) return false;
    const i = user.moves.findIndex((x) => x.id === "mimic");
    if (i < 0) return false;
    const old = user.moves[i];
    const raw = window.MOVES[m.name];
    user.moves[i] = { id: m.id, name: m.name, pp: raw.pp, maxpp: raw.pp, mimicOf: old.mimicOf || old };
    b.add("-activate", user, "move: Mimic", m.name);
    return "done";
  };

  // ---- Attract (needs genders) ----
  status.attract = (b, user, target) => {
    if (user.gender === "N" || target.gender === "N" || user.gender === target.gender) return false;
    if (target.volatiles.attract) return false;
    if (target.hasAbility(["Oblivious", "Aroma Veil"])) {
      b.add("-immune", target, "[from] ability: " + target.ability);
      return "done";
    }
    return b.addVolatile(target, "attract", user, E("Move", "attract", "Attract")) ? "done" : false;
  };

  // ---- Moves that call other moves ----
  status.mirrormove = (b, user, target) => {
    const lm = target.lastMove;
    if (!lm) return false;
    let m;
    try { m = b.getActiveMove(lm); } catch (e) { return false; }
    if (!m.flags.mirror) return false;
    b.execMove(user, m, { bounced: true, target });
    return "done";
  };
  status.assist = (b, user) => {
    const pool = [];
    for (const mon of user.side.pokemon) {
      if (mon === user) continue;
      for (const mv of mon.moves) if (!window.MOVES[mv.name].flags.noassist) pool.push(mv.name);
    }
    if (!pool.length) return false;
    b.execMove(user, b.getActiveMove(b.sample(pool)), { bounced: true });
    return "done";
  };
  status.copycat = (b, user) => {
    const id = b.lastMoveGlobal;
    if (!id) return false;
    const m = b.getActiveMove(id);
    if (m.flags.failcopycat) return false;
    b.execMove(user, m, { bounced: true });
    return "done";
  };

  // ---- Me First / Sketch ----
  // Me First: uses the move the target is about to use, at 1.5x power.
  status.mefirst = (b, user, target) => {
    const queued = b.queue.find((a) => a.type === "move" && a.mon === target && a.moveName && !a.recharge);
    if (!queued) return false;
    const m = b.getActiveMove(queued.moveName);
    if (m.category === "Status" || m.flags.failmefirst) return false;
    b.execMove(user, m, { bounced: true, target, meFirst: true });
    return "done";
  };
  // Sketch: permanently replaces itself with the target's last move.
  status.sketch = (b, user, target) => {
    if (user.transformed) return false;
    const lm = target.lastMove;
    if (!lm) return false;
    let m;
    try { m = b.getActiveMove(lm); } catch (e) { return false; }
    if (m.flags.nosketch || user.moves.some((x) => x.id === m.id)) return false;
    const i = user.moves.findIndex((x) => x.id === "sketch");
    if (i < 0) return false;
    const pp = Math.floor((window.MOVES[m.name].pp * 8) / 5);
    user.moves[i] = { id: m.id, name: m.name, pp, maxpp: pp };
    b.add("-activate", user, "move: Sketch", m.name);
    return "done";
  };

  // ---- After-hit effects for damaging moves ----
  afterHit.rapidspin = (b, user) => {
    for (const id of ["spikes", "toxicspikes", "stealthrock", "stickyweb"]) b.removeSideCondition(user.side, id);
    user.removeVolatile("leechseed"); user.removeVolatile("partiallytrapped");
  };
  afterHit.knockoff = (b, user, target) => {
    if (!target.item || /ite(-[xy])?$/.test(target.item) && window.ITEMS[target.item] && window.ITEMS[target.item].category === "mega-stones") return;
    const it = b.takeItem(target);
    if (it) b.add("-enditem", target, it, "[from] move: Knock Off", "[of] " + user.ident);
  };
  afterHit.thief = afterHit.covet = (b, user, target) => {
    if (user.item || !target.item || user.fainted) return;
    const it = b.takeItem(target);
    if (it) { user.item = it; b.add("-item", user, it, "[from] move: Thief", "[of] " + target.ident); }
  };

  window.BATTLE_MOVE_EFFECTS = { status, afterHit };
})();
