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
  for (const id of ["splash", "celebrate"]) status[id] = () => true;

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
    if (user.hasAbility(["Insomnia", "Vital Spirit"]) || b.sweetVeiled(user)) return false;
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
  status.healbell = status.aromatherapy = (b, user, target, move) => {
    for (const m of user.side.pokemon) if (!m.fainted && m.status) { m.status = ""; m.statusState = {}; }
    b.add("-activate", user, "move: Heal Bell");
    // (Doubles: Aromatherapy, a Grass move, feeds the ally's Sap Sipper.)
    const ally = b.allyOf(user);
    if (move.id === "aromatherapy" && ally && ally.hasAbility("Sap Sipper") && !move.ignoreAbility) {
      b.boost(ally, { atk: 1 }, ally, E("Ability", "sapsipper", "Sap Sipper"));
    }
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
    // (Gen 6's moves: the ones Gen 7 added, data/moves-gen7.js, aren't called.)
    const pool = Object.keys(window.MOVES).filter((n) => window.MOVES[n].flags.metronome && window.MOVES[n].gen !== 7);
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
  // Nature Power: calls a move based on the terrain (Tri Attack with no terrain,
  // as on Wi-Fi in Gen 6).
  const NATURE_POWER = { ElectricTerrain: "Thunderbolt", GrassyTerrain: "Energy Ball", MistyTerrain: "Moonblast" };
  status.naturepower = (b, user, target) => {
    const name = NATURE_POWER[b.field.terrain] || "Tri Attack";
    b.add("-activate", user, "move: Nature Power", name);
    b.execMove(user, b.getActiveMove(name), { bounced: true, target });
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

  // ---- Doubles ----
  // Helping Hand: the ally's move this turn is 1.5x as strong. Fails unless
  // the ally has yet to move. (Singles: unchanged, the data effects only.)
  status.helpinghand = (b, user, target) => {
    if (!b.doubles) return true;
    if (!target || target === user || target.fainted || target.side !== user.side) return false;
    if (!b.queue.some((a) => a.type === "move" && a.mon === target && !a.recharge)) return false;
    target.volatiles.helpinghand = { id: "helpinghand", source: user };
    b.add("-singleturn", target, "Helping Hand", "[of] " + user.ident);
    return "done";
  };
  // Spotlight (Gen 7): foes' single-target moves are drawn to the target
  // this turn, ahead of Follow Me. Fails in singles.
  status.spotlight = (b, user, target) => {
    if (!b.doubles || !target || target.fainted) return false;
    target.volatiles.spotlight = { id: "spotlight", source: user };
    b.add("-singleturn", target, "move: Spotlight");
    return "done";
  };
  // Hold Hands and Aromatic Mist need an ally (they fail in singles).
  status.holdhands = (b, user, target) => {
    if (!b.doubles || !target || target === user || target.side !== user.side) return false;
    b.add("-activate", user, "move: Hold Hands", "[of] " + target.ident);
    return "done";
  };
  status.aromaticmist = (b, user, target) => !!(b.doubles && target && target !== user && target.side === user.side);
  // Acupressure (doubles): +2 to a random stat (not one already at +6) of
  // the user or its ally (fails on an ally behind a substitute). In singles
  // it still fails, as it always has here, to keep singles unchanged.
  status.acupressure = (b, user, target) => {
    if (!b.doubles) return false;
    if (!target || target.fainted || (target !== user && target.volatiles.substitute)) return false;
    const stats = Object.keys(target.boosts).filter((k) => target.boosts[k] < 6);
    if (!stats.length) return false;
    b.boost(target, { [b.sample(stats)]: 2 }, user, E("Move", "acupressure", "Acupressure"));
    return "done";
  };

  // Mat Block and Crafty Shield (side conditions from moves.js, checked in
  // Battle.sideGuarded) fail if the user moves last this turn; Mat Block
  // also after the user's first turn out.
  const movesLast = (b) => !b.queue.some((a) => a.type === "move" && a.mon && !a.mon.fainted && a.mon.isActive);
  status.matblock = (b, user) => user.activeTurns === 0 && !movesLast(b);
  status.craftyshield = (b) => !movesLast(b);

  // ---- Turn order ----
  // The index in the queue of `mon`'s move still to come this turn, or -1.
  const queuedMove = (b, mon) => b.queue.findIndex((a) => a.type === "move" && a.mon === mon);
  // After You: the target moves right after the user. Fails if it has
  // already moved or would move next anyway (Gen 6), so it always fails in
  // singles.
  status.afteryou = (b, user, target) => {
    const i = queuedMove(b, target);
    const next = b.queue.findIndex((a) => a.type !== "move" || (a.mon && !a.mon.fainted && a.mon.isActive));
    if (i < 0 || i <= next) return false;
    b.queue.unshift(b.queue.splice(i, 1)[0]);
    b.add("-activate", target, "move: After You");
    return "done";
  };
  // Quash: the target moves after everyone else this turn (after any
  // Pokémon quashed before it). Fails if it has already moved.
  status.quash = (b, user, target) => {
    const i = queuedMove(b, target);
    if (i < 0) return false;
    const act = b.queue.splice(i, 1)[0];
    const end = b.queue.findIndex((a) => a.type === "residual");
    b.queue.splice(end < 0 ? b.queue.length : end, 0, act);
    b.add("-activate", target, "move: Quash");
    return "done";
  };
  // Instruct (Gen 7): the target uses its last move again at once (taking
  // PP, at the same target). Fails (as in Gen 7) if it has no last move, or
  // that move isn't one of its own with PP left, can't be chosen now
  // (Disable, Taunt, ...), recharges, charges or locks it in, calls or
  // copies other moves, or is Instruct, Bide, Focus Punch, Beak Blast,
  // Shell Trap, Struggle, Transform or Sketch; or if the target is in
  // Bide, carried by Sky Drop, or about to use Focus Punch / Beak Blast /
  // Shell Trap this turn.
  const INSTRUCT_BANNED = new Set(["instruct", "metronome", "sleeptalk", "naturepower", "assist", "mefirst", "copycat",
    "mimic", "mirrormove", "transform", "sketch", "bide", "focuspunch", "beakblast", "shelltrap", "struggle"]);
  status.instruct = (b, user, target) => {
    if (!target || target === user || target.fainted) return false;
    const index = target.moves.findIndex((m) => m.id === target.lastMove);
    const slot = target.moves[index];
    if (!slot || slot.pp <= 0) return false;
    const data = window.MOVES[slot.name];
    if (INSTRUCT_BANNED.has(slot.id) || data.flags.failinstruct || data.flags.charge
        || (data.self && data.self.volatileStatus === "mustrecharge")) return false;
    if (target.volatiles.bide || target.volatiles.skydrop || target.volatiles.twoturnmove || target.volatiles.mustrecharge) return false;
    if (b.queue.some((a) => a.type === "move" && a.mon === target && /^(focuspunch|beakblast|shelltrap)$/.test(toID(a.moveName)))) return false;
    if (b.getMoveSlots(target)[index].disabled) return false;
    b.add("-singleturn", target, "move: Instruct", "[of] " + user.ident);
    const move = b.getActiveMove(slot.name);
    if (b.runEvent("onBeforeMove", target, { relay: move, move }) === false) return "done";
    b.execMove(target, move, { slot: index, targetLoc: b.doubles ? target.lastTargetLoc : undefined });
    return "done";
  };

  // Ally Switch: the user and its ally trade slots (doubles only).
  status.allyswitch = (b, user) => {
    if (!b.doubles || user.side.tag) return false;   // (not in a tag team: slots belong to trainers)
    const other = user.side.actives[1 - user.slot];
    if (!other || other.fainted || !other.isActive) return false;
    b.swapSlots(user.side, "move: Ally Switch");
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
