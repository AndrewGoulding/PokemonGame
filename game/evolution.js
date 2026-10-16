// Evolution checks and evolving
// Depends on: window.EVOLUTIONS, window.DEX, window.MOVES, window.Party
//
//   const evo = Evolution.find(record, { trigger: "level", party, time: "day" });
//   if (evo) Evolution.evolve(record, evo.into);
//
// Triggers: "level" (after levelling up), "item" (with ctx.item), "trade" and
// "battle" (after any battle, with ctx.crits: the critical hits it landed).
// See data/evolutions.js for the methods and conditions.

(function () {
  "use strict";

  const FRIENDSHIP_TO_EVOLVE = 220;
  const LEVEL_METHODS = ["level", "friendship", "level-hold", "move", "shed"];

  // Day and night as in X and Y: night is 8pm to 4am.
  function timeOfDay(date) {
    const h = (date || new Date()).getHours();
    return h >= 20 || h < 4 ? "night" : "day";
  }

  function meetsConditions(record, e, ctx) {
    const party = ctx.party || [];
    if (e.gender && record.gender !== e.gender) return false;
    // ("dusk": 5pm to 6pm, Ultra Sun and Moon's evening, Dusk Lycanroc's.)
    if (e.time === "dusk") { if (ctx.time ? ctx.time !== "dusk" : new Date().getHours() !== 17) return false; }
    else if (e.time && (ctx.time || timeOfDay()) !== e.time) return false;
    if (e.stats) {
      const s = window.Party.stats(record);
      if (e.stats === "atk>def" && !(s.atk > s.def)) return false;
      if (e.stats === "atk<def" && !(s.atk < s.def)) return false;
      if (e.stats === "atk=def" && s.atk !== s.def) return false;
    }
    if (e.partyType && !party.some((p) => p !== record && window.DEX[p.species].types.includes(e.partyType))) return false;
    if (e.partySpecies && !party.some((p) => p !== record && p.species === e.partySpecies)) return false;
    if (e.moveType && !record.moves.some((m) => window.MOVES[m.name].type === e.moveType)) return false;
    if (e.cloak && (record.cloak || "plant") !== e.cloak) return false;
    // (Gen 8: Toxtricity's nature, Runerigus's lost HP, Basculegion's recoil,
    // Overqwil's Barb Barrages.)
    if (e.natures && !e.natures.includes(record.nature)) return false;
    if (e.hpLost && window.Party.maxHp(record) - record.hp < e.hpLost) return false;
    if (e.recoil && (record.recoil || 0) < e.recoil) return false;
    if (e.moveUses && Object.entries(e.moveUses).some(([m, n]) => ((record.moveUses || {})[m] || 0) < n)) return false;
    if (e.personality) {
      // Wurmple: the upper 16 bits of the personality value, mod 10, below 5 -> Silcoon.
      const low = ((record.personality >>> 16) % 10) < 5;
      if ((e.personality === "low") !== low) return false;
    }
    return true;
  }

  function methodMatches(record, e, ctx) {
    switch (ctx.trigger) {
      case "level":
        if (!LEVEL_METHODS.includes(e.method) || e.method === "shed") return false;
        if (e.level && record.level < e.level) return false;
        if (e.method === "friendship" && record.happiness < FRIENDSHIP_TO_EVOLVE) return false;
        if (e.method === "level-hold" && record.item !== e.item) return false;
        if (e.method === "move" && !record.moves.some((m) => m.name === e.move)) return false;
        return true;
      case "item":
        return e.method === "item" && e.item === ctx.item;
      // After a battle (Sirfetch'd: ctx.crits critical hits landed in it).
      case "battle":
        return e.method === "crits" && (ctx.crits || 0) >= e.crits;
      case "trade":
        if (e.method !== "trade") return false;
        if (e.item && record.item !== e.item) return false;
        if (e.tradeWith && ctx.tradedFor !== e.tradeWith) return false;
        return true;
      default:
        return false;
    }
  }

  // The evolution `record` can go through right now, or null.
  function find(record, ctx) {
    ctx = ctx || {};
    if (window.Party.isFainted(record) && ctx.trigger === "level") return null;
    if (record.item === "everstone" && ctx.trigger !== "item") return null;
    // Most specific first, so an Eevee that knows a Fairy move becomes Sylveon
    // rather than Espeon.
    const specificity = (e) => (e.moveType ? 2 : 0) +
      ["partySpecies", "partyType", "item", "move", "time", "stats", "natures"].filter((k) => e[k]).length;
    const options = (window.EVOLUTIONS[record.species] || []).slice()
      .sort((a, b) => specificity(b) - specificity(a));
    return options.find((e) => methodMatches(record, e, ctx) && meetsConditions(record, e, ctx)) || null;
  }

  // Turns `record` into `into`. Keeps damage taken, the ability slot, and
  // consumes a held evolution item. Returns the moves the new species learns
  // at the current level (to teach or offer).
  function evolve(record, into, evo) {
    const oldDex = window.DEX[record.species], newDex = window.DEX[into];
    const oldMax = window.Party.maxHp(record);
    const slot = Math.max(0, oldDex.abilities.indexOf(record.ability));
    record.species = into;
    delete record.cloak; // only Burmy has one
    record.ability = newDex.abilities[Math.min(slot, newDex.abilities.length - 1)] || record.ability;
    record.hp = Math.max(record.hp > 0 ? 1 : 0, window.Party.maxHp(record) - (oldMax - record.hp));
    if (evo && (evo.method === "level-hold" || evo.method === "trade") && evo.item && record.item === evo.item) {
      record.item = "";
    }
    return window.Party.movesLearnedAt(record, record.level);
  }

  // Nincada -> Ninjask also leaves a Shedinja if there's room and a Poké Ball.
  function shedinja(record) {
    const options = window.EVOLUTIONS[record.species] || [];
    if (!options.some((e) => e.method === "shed")) return null;
    const copy = JSON.parse(JSON.stringify(record));
    copy.species = "Shedinja";
    copy.nickname = null;
    copy.item = "";
    copy.ability = window.DEX.Shedinja.abilities[0];
    copy.ball = "poke-ball";
    copy.status = "";
    copy.hp = window.Party.maxHp(copy);
    return copy;
  }

  window.Evolution = { FRIENDSHIP_TO_EVOLVE, timeOfDay, find, evolve, shedinja };
})();
