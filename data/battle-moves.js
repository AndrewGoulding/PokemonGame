// Move-specific effects for battle.js (Gen 6, and Gen 7's new moves)
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
    // (Gen 6's moves: the ones Gens 7 and 8 added, data/moves-gen7.js and
    // moves-gen8.js, aren't called.)
    const pool = Object.keys(window.MOVES).filter((n) => window.MOVES[n].flags.metronome && !window.MOVES[n].gen);
    const name = b.sample(pool);
    b.execMove(user, b.getActiveMove(name), { bounced: true });
    return true;
  };
  status.sleeptalk = (b, user) => {
    if (!b.asleep(user)) return false;
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
  const NATURE_POWER = { ElectricTerrain: "Thunderbolt", GrassyTerrain: "Energy Ball", MistyTerrain: "Moonblast", PsychicTerrain: "Psychic" };
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

  // ---- Gen 7 ----
  // beforeHit[id](battle, user, target, move): before a damaging move's
  // damage (false: it fails; "done": handled, no damage).
  // afterHitSelf[id](battle, user, target, move, dealt): after the hit even
  // if the target fainted.
  const beforeHit = {};
  const afterHitSelf = {};
  const healFrac = (b, mon, frac, user, name) =>
    (b.heal(mon, Math.round(mon.maxhp * frac), user, E("Move", toID(name), name)) ? true : false);
  status.shoreup = (b, user) => healFrac(b, user, b.getWeather() === "Sandstorm" ? 2 / 3 : 1 / 2, user, "Shore Up");
  status.floralhealing = (b, user, target) =>
    healFrac(b, target, b.field.terrain === "GrassyTerrain" ? 2 / 3 : 1 / 2, user, "Floral Healing");
  status.purify = (b, user, target) => {
    if (!target.status || !b.cureStatus(target)) return false;
    healFrac(b, user, 1 / 2, user, "Purify");
    return "done";
  };
  status.speedswap = (b, user, target) => {
    const s = user.stats.spe;
    user.stats = Object.assign({}, user.stats, { spe: target.stats.spe });
    target.stats = Object.assign({}, target.stats, { spe: s });
    b.add("-activate", user, "move: Speed Swap", "[of] " + target.ident);
    return "done";
  };
  status.strengthsap = (b, user, target) => {
    if (target.boosts.atk <= -6) return false;
    const atk = b.getBoostedStat(target, "atk");
    b.boost(target, { atk: -1 }, user, E("Move", "strengthsap", "Strength Sap"));
    let amt = atk;
    if (user.item === "big-root") amt = Math.floor(amt * 1.3);
    b.heal(user, amt, target, E("Move", "strengthsap", "Strength Sap"));
    return "done";
  };
  status.gearup = (b, user) => {
    const who = [user, b.allyOf(user)].filter((m) => m && !m.fainted && m.hasAbility(["Plus", "Minus"]));
    if (!who.length) return false;
    for (const m of who) b.boost(m, { atk: 1, spa: 1 }, user, E("Move", "gearup", "Gear Up"));
    return "done";
  };
  // Aurora Veil: only in hail (the data sets the side condition).
  status.auroraveil = (b) => b.getWeather() === "Hail";
  // Toxic Thread: works if either the Speed drop or the poison does.
  status.toxicthread = (b, user, target, move) => {
    const eff = E("Move", "toxicthread", "Toxic Thread");
    const slowed = b.boost(target, { spe: -1 }, user, eff);
    const poisoned = b.trySetStatus(target, "psn", user, eff);
    return slowed || poisoned ? "done" : false;
  };

  beforeHit.firstimpression = (b, user) => user.activeTurns === 0;
  beforeHit.beakblast = (b, user) => { delete user.volatiles.beakblast; };
  beforeHit.burnup = (b, user) => user.hasType("Fire");
  beforeHit.shelltrap = (b, user) => !!(user.volatiles.shelltrap && user.volatiles.shelltrap.gotHit);
  beforeHit.psychicfangs = (b, user, target) => {
    for (const id of ["reflect", "lightscreen", "auroraveil"]) b.removeSideCondition(target.side, id);
  };
  // Spectral Thief: the target's stat rises become the user's first.
  beforeHit.spectralthief = (b, user, target) => {
    const stolen = {};
    for (const k of Object.keys(target.boosts)) if (target.boosts[k] > 0) { stolen[k] = target.boosts[k]; target.boosts[k] = 0; }
    if (Object.keys(stolen).length) {
      b.add("-activate", user, "move: Spectral Thief", "[of] " + target.ident);
      b.boost(user, stolen, user, E("Move", "spectralthief", "Spectral Thief"));
    }
  };
  // Pollen Puff at an ally heals it instead.
  beforeHit.pollenpuff = (b, user, target) => {
    if (target.side !== user.side) return;
    if (!healFrac(b, target, 1 / 2, user, "Pollen Puff")) return false;
    return "done";
  };
  afterHit.throatchop = (b, user, target) => { b.addVolatile(target, "throatchop", user, E("Move", "throatchop", "Throat Chop")); };
  afterHit.spiritshackle = afterHit.anchorshot = (b, user, target, move) => {
    if (target.volatiles.substitute) return;
    b.addVolatile(target, "shackled", user, E("Move", move.id, move.name));
  };
  // Core Enforcer: the Ability of a target that has already moved stops working.
  afterHit.coreenforcer = (b, user, target) => {
    const ab = window.ABILITIES[target.ability];
    if (!target.moveThisTurn || target.volatiles.gastroacid || (ab && ab.flags && ab.flags.cantsuppress)) return;
    target.volatiles.gastroacid = { id: "gastroacid" };
    b.add("-endability", target, "[from] move: Core Enforcer");
  };
  afterHitSelf.burnup = (b, user) => {
    user.types = user.types.filter((t) => t !== "Fire");
    if (!user.types.length) user.types = ["???"];
    b.add("-text", user, "{who} burned itself out!");
  };
  afterHitSelf.plasmafists = (b) => {
    if (b.field.pseudo.iondeluge) return;
    b.field.pseudo.iondeluge = { turns: 1 };
    b.add("-fieldstart", "iondeluge");
  };

  // ---- Gen 8 ----
  // A Berry eaten whatever its trigger (Stuff Cheeks, Teatime).
  const eatBerry = (b, mon) => {
    if (!/-berry$/.test(mon.item) || b.isUnnerved(mon)) return false;
    const name = mon.item, it = window.ITEM_EFFECTS[name];
    b.add("-enditem", mon, name, "[eat]");
    b.consumeItem(mon);
    if (it && it.eaten) {
      const h = { fn: it.eaten, thisObj: it, effect: E("Item", name, name), state: {} };
      it.eaten.call(it, b.makeCtx(mon, h, {}));
    }
    return true;
  };
  status.stuffcheeks = (b, user) => {
    if (!/-berry$/.test(user.item) || !eatBerry(b, user)) return false;
    b.boost(user, { def: 2 }, user, E("Move", "stuffcheeks", "Stuff Cheeks"));
    return "done";
  };
  status.teatime = (b) => {
    let any = false;
    for (const m of b.getActives()) if (eatBerry(b, m)) any = true;
    return any ? "done" : false;
  };
  status.corrosivegas = (b, user, target) => {
    if (!target.item || target === user) return false;
    const it = b.takeItem(target);
    b.add("-enditem", target, it, "[from] move: Corrosive Gas", "[of] " + user.ident);
    return "done";
  };
  status.magicpowder = (b, user, target) => {
    if (target.types.join() === "Psychic") return false;
    target.types = ["Psychic"];
    b.add("-start", target, "typechange", "Psychic");
    return "done";
  };
  status.clangoroussoul = (b, user) => {
    const cost = Math.floor(user.maxhp / 3);
    if (user.hp <= cost) return false;
    if (!b.boost(user, { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }, user, E("Move", "clangoroussoul", "Clangorous Soul"))) return false;
    b.damage(user, cost, user, E("Move", "clangoroussoul", "Clangorous Soul"));
    return "done";
  };
  // (Coaching has nobody to coach in a single battle.)
  status.coaching = (b, user, target) => !!target && target !== user && target.side === user.side;
  status.noretreat = (b, user) => !user.volatiles.noretreat;
  status.courtchange = (b, user) => {
    const a = user.side.conditions, c = user.side.foe.conditions;
    user.side.conditions = c; user.side.foe.conditions = a;
    b.add("-activate", user, "move: Court Change");
    return "done";
  };
  const healTeam = (cure) => (b, user, target, move) => {
    let any = false;
    for (const m of [user, b.allyOf(user)]) {
      if (!m || m.fainted) continue;
      if (b.heal(m, Math.round(m.maxhp / 4), user, E("Move", move.id, move.name))) any = true;
      if (cure && m.status && b.cureStatus(m)) any = true;
    }
    return any ? "done" : false;
  };
  status.lifedew = healTeam(false);
  status.junglehealing = status.lunarblessing = healTeam(true);
  status.takeheart = (b, user) => {
    const cured = user.status ? b.cureStatus(user) : false;
    const raised = b.boost(user, { spa: 1, spd: 1 }, user, E("Move", "takeheart", "Take Heart"));
    return cured || raised ? "done" : false;
  };

  beforeHit.poltergeist = (b, user, target) => {
    if (!target.item) return false;
    b.add("-activate", target, "move: Poltergeist", target.item);
  };
  beforeHit.steelroller = (b) => !!b.field.terrain;
  beforeHit.aurawheel = (b, user) => /^Morpeko/.test(user.species);
  afterHitSelf.steelroller = (b) => {
    if (!b.field.terrain) return;
    b.add("-fieldend", b.field.terrain);
    b.field.terrain = ""; b.field.terrainTurns = 0;
    b.mimicry();
  };
  afterHitSelf.ceaselessedge = (b, user, target) => { b.addSideCondition(target.side, "spikes", user); };
  afterHitSelf.stoneaxe = (b, user, target) => { b.addSideCondition(target.side, "stealthrock", user); };
  afterHit.eeriespell = (b, user, target) => {
    const m = target.lastMove && target.moves.find((x) => x.id === target.lastMove);
    if (!m || !m.pp) return;
    const lost = Math.min(3, m.pp);
    m.pp -= lost;
    b.add("-activate", target, "move: Eerie Spell", m.name, lost);
  };
  afterHit.burningjealousy = (b, user, target, move) => {
    if (target.statsRaisedThisTurn) b.trySetStatus(target, "brn", user, E("Move", move.id, move.name));
  };
  afterHit.jawlock = (b, user, target) => {
    if (target.volatiles.substitute) return;
    if (!target.volatiles.shackled) target.volatiles.shackled = { id: "shackled", source: user };
    if (!user.volatiles.shackled) user.volatiles.shackled = { id: "shackled", source: target };
    b.add("-activate", user, "move: Jaw Lock", "[of] " + target.ident);
  };
  // Dire Claw: 50% to poison, paralyse or put to sleep, a third each.
  afterHit.direclaw = (b, user, target, move) => {
    if (target.hasAbility("Shield Dust") || !b.randomChance(1, 2)) return;
    b.trySetStatus(target, b.sample(["psn", "par", "slp"]), user, E("Move", move.id, move.name));
  };

  // ---- Max Moves and G-Max Moves (Gen 8) ----
  // Their effects, after the hit (even if the target fainted): weather,
  // terrain, a stat change for each foe or each Pokémon on the user's side.
  const foesOf = (b, user) => (b.doubles ? b.foesOf(user) : [user.side.foe.active].filter((m) => m && !m.fainted && m.isActive));
  const sideOf = (b, user) => [user, b.allyOf(user)].filter((m) => m && !m.fainted);
  const maxEff = (id, name) => E("Move", id, name);
  const MAX_WEATHER = { maxflare: "SunnyDay", maxgeyser: "RainDance", maxrockfall: "Sandstorm", maxhailstorm: "Hail" };
  const MAX_TERRAIN = { maxlightning: "electricterrain", maxovergrowth: "grassyterrain", maxmindstorm: "psychicterrain", maxstarfall: "mistyterrain" };
  const MAX_FOES = { maxstrike: { spe: -1 }, maxflutterby: { spa: -1 }, maxphantasm: { def: -1 }, maxdarkness: { spd: -1 }, maxwyrmwind: { atk: -1 } };
  const MAX_ALLIES = { maxknuckle: { atk: 1 }, maxooze: { spa: 1 }, maxquake: { spd: 1 }, maxsteelspike: { def: 1 }, maxairstream: { spe: 1 } };
  for (const [id, w] of Object.entries(MAX_WEATHER)) afterHitSelf[id] = (b, user, t, move) => { b.setWeather(w, user, maxEff(id, move.name)); };
  for (const [id, t] of Object.entries(MAX_TERRAIN)) afterHitSelf[id] = (b, user) => { b.setTerrain(t, user); };
  for (const [id, bo] of Object.entries(MAX_FOES)) afterHitSelf[id] = (b, user, t, move) => { for (const f of foesOf(b, user)) b.boost(f, bo, user, maxEff(id, move.name)); };
  for (const [id, bo] of Object.entries(MAX_ALLIES)) afterHitSelf[id] = (b, user, t, move) => { for (const a of sideOf(b, user)) b.boost(a, bo, a, maxEff(id, move.name)); };
  const eachFoe = (fn) => (b, user, t, move) => { for (const f of foesOf(b, user)) fn(b, user, f, maxEff(move.id, move.name), move); };
  // Four turns of damage on the foes' side.
  for (const id of ["gmaxwildfire", "gmaxvinelash", "gmaxcannonade", "gmaxvolcalith"]) afterHitSelf[id] = (b, user) => { b.addSideCondition(user.side.foe, id, user); };
  afterHitSelf.gmaxbefuddle = eachFoe((b, user, f, eff) => { b.trySetStatus(f, b.sample(["slp", "psn", "par"]), user, eff); });
  afterHitSelf.gmaxvoltcrash = eachFoe((b, user, f, eff) => { b.trySetStatus(f, "par", user, eff); });
  afterHitSelf.gmaxmalodor = eachFoe((b, user, f, eff) => { b.trySetStatus(f, "psn", user, eff); });
  afterHitSelf.gmaxstunshock = eachFoe((b, user, f, eff) => { b.trySetStatus(f, b.sample(["psn", "par"]), user, eff); });
  afterHitSelf.gmaxgoldrush = afterHitSelf.gmaxsmite = eachFoe((b, user, f, eff) => { b.addVolatile(f, "confusion", user, eff); });
  afterHitSelf.gmaxcuddle = eachFoe((b, user, f, eff) => {
    if (f.gender !== "N" && user.gender !== "N" && f.gender !== user.gender) b.addVolatile(f, "attract", user, eff);
  });
  afterHitSelf.gmaxterror = eachFoe((b, user, f, eff) => { b.addVolatile(f, "shackled", user, eff); });
  afterHitSelf.gmaxmeltdown = eachFoe((b, user, f, eff) => { b.addVolatile(f, "torment", user, eff); });
  afterHitSelf.gmaxfoamburst = eachFoe((b, user, f, eff) => { b.boost(f, { spe: -2 }, user, eff); });
  afterHitSelf.gmaxtartness = eachFoe((b, user, f, eff) => { b.boost(f, { evasion: -1 }, user, eff); });
  afterHitSelf.gmaxsandblast = afterHitSelf.gmaxcentiferno = eachFoe((b, user, f, eff, move) => {
    if (b.addVolatile(f, "partiallytrapped", user, eff)) f.volatiles.partiallytrapped.moveName = move.id === "gmaxsandblast" ? "Sand Tomb" : "Fire Spin";
  });
  afterHitSelf.gmaxchistrike = (b, user) => {
    for (const a of sideOf(b, user)) {
      if (a.volatiles.gmaxchistrike) a.volatiles.gmaxchistrike.layers = Math.min(3, a.volatiles.gmaxchistrike.layers + 1);
      else b.addVolatile(a, "gmaxchistrike", user);
    }
  };
  afterHitSelf.gmaxresonance = (b, user) => { b.addSideCondition(user.side, "auroraveil", user); };
  afterHitSelf.gmaxstonesurge = (b, user) => { b.addSideCondition(user.side.foe, "stealthrock", user); };
  afterHitSelf.gmaxsteelsurge = (b, user) => { b.addSideCondition(user.side.foe, "gmaxsteelsurge", user); };
  afterHitSelf.gmaxwindrage = (b, user) => {
    for (const id of ["reflect", "lightscreen", "auroraveil", "safeguard", "mist"]) b.removeSideCondition(user.side.foe, id);
    for (const s of [user.side, user.side.foe]) for (const id of ["spikes", "toxicspikes", "stealthrock", "stickyweb", "gmaxsteelsurge"]) b.removeSideCondition(s, id);
  };
  afterHitSelf.gmaxgravitas = (b) => {
    if (b.field.pseudo.gravity) return;
    b.field.pseudo.gravity = { turns: 5 };
    b.add("-fieldstart", "gravity");
  };
  afterHitSelf.gmaxsweetness = (b, user) => { for (const m of user.side.pokemon) if (!m.fainted && m.status) { m.status = ""; m.statusState = {}; } b.add("-activate", user, "move: Aromatherapy"); };
  afterHitSelf.gmaxfinale = (b, user, t, move) => { for (const a of sideOf(b, user)) b.heal(a, Math.floor(a.maxhp / 6), user, maxEff(move.id, move.name)); };
  // G-Max Replenish: half the time, each Pokémon on its side gets back a Berry it ate.
  afterHitSelf.gmaxreplenish = (b, user) => {
    for (const a of sideOf(b, user)) if (!a.item && /-berry$/.test(a.lastItem || "") && b.randomChance(1, 2)) { a.item = a.lastItem; b.add("-item", a, a.item, "[from] move: G-Max Replenish"); }
  };
  afterHit.gmaxsnooze = (b, user, target, move) => { if (b.randomChance(1, 2)) b.addVolatile(target, "yawn", user, maxEff(move.id, move.name)); };
  afterHit.gmaxdepletion = (b, user, target) => {
    const m = target.lastMove && target.moves.find((x) => x.id === target.lastMove);
    if (m && m.pp) { const lost = Math.min(2, m.pp); m.pp -= lost; b.add("-activate", target, "move: G-Max Depletion", m.name, lost); }
  };

  // ---- Z-Moves (Gen 7) ----
  beforeHit.soulstealing7starstrike = beforeHit.spectralthief;
  afterHitSelf.genesissupernova = (b, user) => { b.setTerrain("psychicterrain", user); };
  afterHitSelf.splinteredstormshards = (b) => {
    if (!b.field.terrain) return;
    b.add("-fieldend", b.field.terrain);
    b.field.terrain = ""; b.field.terrainTurns = 0;
    b.mimicry();
  };

  window.BATTLE_MOVE_EFFECTS = { status, afterHit, beforeHit, afterHitSelf };
})();
