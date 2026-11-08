// HM moves used outside battle: FireRed's seven (src/party_menu.c's sFieldMoves,
// in its order) and Johto's two, the Gym Badge each needs (FLAG_BADGE01_GET +
// its place in that list) and the line the party screen shows for it.
//
// A Pokémon can use one, as long as you have the badge too, if it knows the move; or if it could learn it from its
// TM or HM and you have that machine; or, for a move that isn't an HM's (Dig, Teleport, Sweet Scent, Flash …), if it
// learns the move some other way (by level, from a tutor, as an Egg move; it or anything it evolved from), whether or
// not it knows it yet.
//
//   FieldMoves.forMon(record)          // -> its field moves, known or learnable: ["Cut", "Flash"]
//   FieldMoves.check(player, record, "Surf")   // -> null (it can), or "badge" / "hm" (the machine needed)
//   FieldMoves.user(player, "Cut")     // -> the first party Pokémon that can, or null
//   FieldMoves.hmFor("Rock Smash")     // -> "hm08" (this game's HM numbers; a TM's for a TM move: "tm28" for Dig)
(function () {
  "use strict";

  // (`hoenn`: the Badge it needs in Hoenn, Emerald's: Cut the Stone Badge, Flash the Knuckle, Rock Smash the
  // Dynamo, Strength the Heat, Surf the Balance, Dive the Mind, Waterfall the Rain; Fly none, this game's own,
  // so Johto's Champion can fly about Hoenn from the start.)
  // (`johto`: the Badge it needs in Johto, HGSS's: Rock Smash and Flash the
  // Zephyr Badge, Cut the Hive, Strength the Plain, Surf the Fog, Whirlpool the
  // Glacier, Waterfall and Rock Climb the Rising; Fly none, this game's own, so
  // Kanto's Champion can get about Johto from the start.)
  const FIELD_MOVES = [
    { move: "Flash", badge: "boulder", johto: "zephyr", hoenn: "knuckle", desc: "Light up darkness." },
    { move: "Cut", badge: "cascade", johto: "hive", hoenn: "stone", desc: "Cut a tree or grass." },
    { move: "Fly", badge: "thunder", johto: null, hoenn: null, desc: "Fly to a known town." },
    { move: "Strength", badge: "rainbow", johto: "plain", hoenn: "heat", desc: "Move heavy boulders." },
    { move: "Surf", badge: "soul", johto: "fog", hoenn: "balance", desc: "Travel on water." },
    { move: "Rock Smash", badge: "marsh", johto: "zephyr", hoenn: "dynamo", desc: "Shatter a cracked rock." },
    { move: "Waterfall", badge: "volcano", johto: "rising", hoenn: "rain", desc: "Climb a waterfall." },
    // (And Johto's, HGSS's: Whirlpool needs the Glacier Badge, Rock Climb the Rising Badge.)
    { move: "Whirlpool", badge: "glacier", johto: "glacier", hoenn: "glacier", desc: "Cross a whirlpool." },
    { move: "Rock Climb", badge: "rising", johto: "rising", hoenn: "rising", desc: "Scale rocky walls." },
    // (Hoenn's: Dive, which Emerald's Mind Badge lets you use; HM09 here.)
    { move: "Dive", badge: null, johto: null, hoenn: "mind", desc: "Dive underwater." },
    // (Dig, a TM's (TM28): out of a cave as an Escape Rope takes you, and the Sealed
    // Chamber's wall.)
    { move: "Dig", badge: null, johto: null, hoenn: null, desc: "Escape from a cave." },
    // (Teleport, TM132's too: back to the last Pokémon Center, from wherever Fly could go.)
    { move: "Teleport", badge: null, johto: null, hoenn: null, desc: "Return to a healing spot." },
    // (Sweet Scent, TM149's: in the grass, a wild Pokémon comes out; where hordes live, a horde,
    // as in X and Y: game/hordes.js.)
    { move: "Sweet Scent", badge: null, johto: null, hoenn: null, desc: "Lure wild Pokémon." }
  ];
  const inJohto = (player) => (((window.WORLD_MAPS || {})[(player.location || {}).map] || {}).region === "johto");
  const inHoenn = (player) => (((window.WORLD_MAPS || {})[(player.location || {}).map] || {}).region === "hoenn");
  const info = (move) => FIELD_MOVES.find((f) => f.move === move) || null;

  // The machine that teaches `move`: its HM (HM01 Cut ... HM08 Rock Smash here), or else its TM (TM28 Dig).
  const machineOf = (move, kind) => window.Bag.machines().find((id) => kind.test(id) && window.Bag.machineMove(id) === move) || null;
  const hmFor = (move) => machineOf(move, /^hm/) || machineOf(move, /^tm/);
  const isHm = (move) => !!machineOf(move, /^hm/);
  const hasMachine = (player, move) => { const m = hmFor(move); return !!m && window.Player.itemCount(player, m) > 0; };
  const byMachine = (record, move) => !!hmFor(move) && window.Party.canLearnMachine(record, move);

  // (What it, or anything it evolved from, learns by level, from a tutor or as an Egg move.)
  let pre = null;
  function line(species) {
    if (!pre) { pre = {}; for (const [from, list] of Object.entries(window.EVOLUTIONS || {})) for (const e of list) pre[e.into] = pre[e.into] || from; }
    const out = [species];
    for (let sp = species; pre[sp] && !out.includes(pre[sp]); sp = pre[sp]) out.push(pre[sp]);
    return out;
  }
  function learnsNaturally(record, move) {
    const sets = window.LEARNSETS_GEN6 || {};
    return line(record.species).some((sp) => {
      const set = sets[sp] || sets[String(sp).split("-")[0]];
      return !!set && ((set.levelup || []).some(([, m]) => m === move) || (set.tutor || []).includes(move) || (set.egg || []).includes(move));
    });
  }
  // (An HM's move only from the HM, as before; any other field move also however else it's learned.)
  const natural = (record, move) => !isHm(move) && learnsNaturally(record, move);
  const learnable = (record, move) => natural(record, move) || byMachine(record, move);

  // Its field moves for the party screen: those it knows, those it learns by
  // itself, and those its TM or HM could teach it (whether or not you have it yet).
  function forMon(record) {
    if (record.egg) return [];
    return FIELD_MOVES.map((f) => f.move).filter((m) => window.Party.knowsMove(record, m) || learnable(record, m));
  }

  // Why `record` can't use `move` now: "badge" (not yet earned), "hm" (it
  // doesn't know it and you haven't the TM or HM), "unable" (it can't learn
  // it); or null when it can.
  function check(player, record, move) {
    const f = info(move);
    if (!f || record.egg) return "unable";   // (an Egg can't do anything)
    if (!window.Party.knowsMove(record, move) && !natural(record, move)) {
      if (!byMachine(record, move)) return "unable";
      if (!hasMachine(player, move)) return "hm";
    }
    const badge = inHoenn(player) ? f.hoenn : inJohto(player) ? f.johto : f.badge;
    if (badge && !player.badges.includes(badge)) return "badge";
    return null;
  }

  // Whoever in the party can use it (for a tree, the water, a boulder ...).
  const user = (player, move) => player.party.find((r) => !check(player, r, move)) || null;

  window.FieldMoves = { FIELD_MOVES, info, hmFor, forMon, check, user };
})();
