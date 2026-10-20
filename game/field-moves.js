// HM moves used outside battle: FireRed's seven (src/party_menu.c's sFieldMoves,
// in its order) and Johto's two, the Gym Badge each needs (FLAG_BADGE01_GET +
// its place in that list) and the line the party screen shows for it.
//
// A Pokémon can use one if it knows the move, or if you have the HM and it
// could learn it from the HM, as long as you have the badge too.
//
//   FieldMoves.forMon(record)          // -> its field moves, known or learnable: ["Cut", "Flash"]
//   FieldMoves.check(player, record, "Surf")   // -> null (it can), or "badge" / "hm"
//   FieldMoves.user(player, "Cut")     // -> the first party Pokémon that can, or null
//   FieldMoves.hmFor("Rock Smash")     // -> "hm08" (this game's HM numbers)
(function () {
  "use strict";

  // (`johto`: the Badge it needs in Johto, HGSS's: Rock Smash and Flash the
  // Zephyr Badge, Cut the Hive, Strength the Plain, Surf the Fog, Whirlpool the
  // Glacier, Waterfall and Rock Climb the Rising; Fly none, this game's own, so
  // Kanto's Champion can get about Johto from the start.)
  const FIELD_MOVES = [
    { move: "Flash", badge: "boulder", johto: "zephyr", desc: "Light up darkness." },
    { move: "Cut", badge: "cascade", johto: "hive", desc: "Cut a tree or grass." },
    { move: "Fly", badge: "thunder", johto: null, desc: "Fly to a known town." },
    { move: "Strength", badge: "rainbow", johto: "plain", desc: "Move heavy boulders." },
    { move: "Surf", badge: "soul", johto: "fog", desc: "Travel on water." },
    { move: "Rock Smash", badge: "marsh", johto: "zephyr", desc: "Shatter a cracked rock." },
    { move: "Waterfall", badge: "volcano", johto: "rising", desc: "Climb a waterfall." },
    // (And Johto's, HGSS's: Whirlpool needs the Glacier Badge, Rock Climb the Rising Badge.)
    { move: "Whirlpool", badge: "glacier", johto: "glacier", desc: "Cross a whirlpool." },
    { move: "Rock Climb", badge: "rising", johto: "rising", desc: "Scale rocky walls." }
  ];
  const inJohto = (player) => (((window.WORLD_MAPS || {})[(player.location || {}).map] || {}).region === "johto");
  const info = (move) => FIELD_MOVES.find((f) => f.move === move) || null;

  // The HM that teaches `move` (HM01 Cut ... HM08 Rock Smash here).
  const hmFor = (move) => window.Bag.machines().find((id) => /^hm/.test(id) && window.Bag.machineMove(id) === move) || null;
  const hasHm = (player, move) => { const hm = hmFor(move); return !!hm && window.Player.itemCount(player, hm) > 0; };
  const learnable = (record, move) => !!hmFor(move) && window.Party.canLearnMachine(record, move);

  // Its field moves for the party screen: those it knows, and those its HM
  // could teach it (whether or not you have the HM yet).
  function forMon(record) {
    if (record.egg) return [];
    return FIELD_MOVES.map((f) => f.move).filter((m) => window.Party.knowsMove(record, m) || learnable(record, m));
  }

  // Why `record` can't use `move` now: "badge" (not yet earned), "hm" (it
  // doesn't know it and you haven't the HM), "unable" (it can't learn it); or
  // null when it can.
  function check(player, record, move) {
    const f = info(move);
    if (!f || record.egg) return "unable";   // (an Egg can't do anything)
    if (!window.Party.knowsMove(record, move)) {
      if (!learnable(record, move)) return "unable";
      if (!hasHm(player, move)) return "hm";
    }
    const badge = inJohto(player) ? f.johto : f.badge;
    if (badge && !player.badges.includes(badge)) return "badge";
    return null;
  }

  // Whoever in the party can use it (for a tree, the water, a boulder ...).
  const user = (player, move) => player.party.find((r) => !check(player, r, move)) || null;

  window.FieldMoves = { FIELD_MOVES, info, hmFor, forMon, check, user };
})();
