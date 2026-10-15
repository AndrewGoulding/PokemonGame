// Double and tag battles: the game's rules around them, as FireRed's
// (headless; ui/game.js uses these).
// Depends on: game/party.js.
//
//   DoubleBattle.canDouble(party)        two Pokémon that can fight
//                                        (FireRed's GetMonsStateToDoubles)
// Choosing Pokémon for a tag battle (the party screen's ENTER / NO ENTRY, as
// for FireRed's Battle Tower and Union Room: PARTY_MENU_TYPE_CHOOSE_MULTIPLE_MONS).
// `order` is the party indexes chosen, in order:
//   DoubleBattle.entryStatus(party, order, slot)   "able" | "selected" | "notable"
//   DoubleBattle.descs(party, order)     what each box says: FIRST / SECOND /
//                                        THIRD, ABLE or NOT ABLE
//   DoubleBattle.enter(party, order, slot, max)    -> { order, error }
//   DoubleBattle.noEntry(order, slot)    -> the order without it
//   DoubleBattle.confirmError(party, order, max)   the message CONFIRM gives
//                                        when too few are chosen, or null
// After the battle:
//   DoubleBattle.team(party, chosen)     the records that fought (all of them
//                                        when chosen is null)
//   DoubleBattle.syncBack(party, chosen, battleMons, sync)
//                                        sync(record, battleMon) for each of
//                                        those (a tag battle's partner's
//                                        Pokémon come after yours and are left
//                                        alone); returns the records synced
//   DoubleBattle.prize(foes, prizeOf, double)
//                                        the prize money: each trainer's
//                                        (prizeOf(foe)), doubled in a double
//                                        battle (FireRed's getmoneyreward)
(function () {
  "use strict";

  const able = (r) => !!r && !window.Party.isFainted(r);
  const ORDINAL = ["FIRST", "SECOND", "THIRD"];
  const NUMBER = ["", "One", "Two", "Three"];

  function canDouble(party) { return party.filter(able).length >= 2; }

  function entryStatus(party, order, slot) {
    if (!able(party[slot])) return "notable";
    return order.includes(slot) ? "selected" : "able";
  }
  function descs(party, order) {
    return party.map((r, i) => (order.includes(i) ? ORDINAL[order.indexOf(i)] || "ABLE" : able(r) ? "ABLE" : "NOT ABLE"));
  }
  function enter(party, order, slot, max) {
    if (!able(party[slot])) return { order, error: "That POKéMON can't participate." };
    if (order.includes(slot)) return { order };
    if (order.length >= max) return { order, error: "No more than " + (NUMBER[max] || max).toLowerCase() + " POKéMON\nmay enter." };
    return { order: order.concat([slot]) };
  }
  function noEntry(order, slot) { return order.filter((i) => i !== slot); }
  // (As many as you can, up to max: "Three POKéMON are needed.")
  function confirmError(party, order, max) {
    const need = Math.min(max, party.filter(able).length);
    return order.length < need ? (NUMBER[need] || need) + " POKéMON are needed." : null;
  }

  function team(party, chosen) { return chosen ? chosen.map((i) => party[i]) : party.slice(); }
  function syncBack(party, chosen, battleMons, sync) {
    const records = team(party, chosen);
    records.forEach((r, k) => { if (battleMons[k]) sync(r, battleMons[k]); });
    return records;
  }
  function prize(foes, prizeOf, double) {
    return foes.reduce((t, f) => t + prizeOf(f) * (double ? 2 : 1), 0);
  }

  window.DoubleBattle = { canDouble, entryStatus, descs, enter, noEntry, confirmError, team, syncBack, prize };
})();
