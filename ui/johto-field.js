// Johto's Headbutt trees and Kurt's Apricorn Balls, as HeartGold and
// SoulSilver have them.
//
//   const JF = JohtoField.create(env);
//   JF.headbuttTree(map, x, y)   // a tree there you could Headbutt? (Overworld's ctx.headbuttTree)
//   await JF.headbutt(map, x, y) // A facing it
//   await JF.headbuttTutor()     // Ilex Forest's Headbutt tutor (scr_seq_D36R0101_002)
//   await JF.kurt(op)            // Kurt's script commands (ui/johto-script.js), -> a value
//
// Headbutt (src/field/headbutt.c; tools/build-johto-headbutt.js:
// window.JOHTO_HEADBUTT): A facing one of a map's trees, with a Pokémon that
// knows Headbutt: "It's a moderately sized tree. Would you like to use
// Headbutt?" The tree shakes, and a Pokémon may fall out of it: which of the
// map's three tables a tree has (common, rare, or none at all) goes by your
// Trainer ID's last digit (sRareTreeLUT_*: so each player has their own good
// trees), the secret trees always the secret table; the Pokémon by slot,
// 50/15/15/10/5/5 (EncounterSlot_WildMonSlotRoll_Headbutt), its level in the
// slot's range. HGSS teaches Headbutt by its tutor in Ilex Forest, to the
// Pokémon HGSS's tutor can teach it (waza_oshie's TUTOR_HEADBUTT).
//
// Kurt (scr_seq_T23R0501): give him Apricorns (ScrCmd_739, HGSS's Apricorn
// Box: which colour and how many) and he makes as many Balls of that
// Apricorn by the next day (FLAG_DAILY_KURT_MAKING_BALLS): Red a Level Ball,
// Yellow a Moon Ball, Blue a Lure Ball, Green a Friend Ball, Pink a Love
// Ball, White a Fast Ball, Black a Heavy Ball (ApricornBox_GetKurtBall).
// What he has is kept with HGSS's flags (player.flags.johto.kurt).
//
// env: player(), say(pages), confirm(page), choose(texts) -> index or -1,
//   quantity(text, max) -> n, itemName(id), text(msgId) -> pages (HGSS's),
//   apricornBox() -> { colour, id, n } or null (the Apricorn Box screen, to give),
//   choosePartyFor(message, notes) -> record, learnMove(record, move),
//   wildBattle(species, level), shake(), johtoState() (HGSS's flags and vars),
//   takeItem(id, n) -> bool.
(function () {
  "use strict";

  const DATA = () => window.JOHTO_HEADBUTT || { maps: {}, learners: [], text: {} };
  const TREE_NONE = -1, TREE_COMMON = 0, TREE_RARE = 1;
  // (sRareTreeLUT_1 ... _5Plus: by your Trainer ID's last digit, each tree's table.)
  const C = TREE_COMMON, R = TREE_RARE, X = TREE_NONE;
  const LUT = {
    1: [[C], [R], [C], [R], [C], [R], [C], [R], [C], [R]],
    2: [[C, R], [R, C], [C, R], [R, C], [C, R], [R, C], [C, R], [R, C], [C, R], [R, C]],
    3: [[C, R, X], [C, X, R], [R, C, X], [R, X, C], [X, C, R], [X, R, C], [C, R, X], [C, X, R], [R, C, X], [R, X, C]],
    4: [[X, C, C, R], [R, X, C, C], [R, R, X, C], [C, R, R, X], [C, C, R, R], [X, C, R, C], [R, X, C, R], [C, R, X, C], [R, C, R, X], [C, R, C, R]],
    5: [[X, C, C, R, R], [R, X, C, C, R], [R, R, X, C, C], [C, R, R, X, C], [C, C, R, R, X], [X, C, R, C, R], [R, X, C, R, C], [C, R, X, C, R], [R, C, R, X, C], [C, R, C, R, X]]
  };
  const SLOT_ODDS = [50, 15, 15, 10, 5, 5];
  const APRICORNS = ["red", "yellow", "blue", "green", "pink", "white", "black"];
  const KURT_BALLS = { red: "level-ball", yellow: "moon-ball", blue: "lure-ball", green: "friend-ball", pink: "love-ball", white: "fast-ball", black: "heavy-ball" };

  function create(env) {
    const knows = (r, move) => r.moves.some((m) => m.name === move);
    const fillMon = (pages, name) => pages.map((p) => p.replace(/\{MON\}|\{BUF0\}/g, name));
    const monName = (r) => (window.Party ? window.Party.displayName(r) : r.species);

    // ---------- Headbutt ----------
    function treeAt(map, x, y) {
      const m = DATA().maps[map];
      if (!m) return null;
      // (A map drawn from Pokémon Heart & Soul's: its own trees, each standing for one of HGSS's: tools/build-johto.js.)
      const own = ((window.WORLD_MAPS || {})[map] || {}).headbuttTrees;
      if (own) {
        const t = own.find((q) => q.tiles.some(([tx, ty]) => tx === x && ty === y));
        return t ? { m, i: t.i, secret: !!t.secret } : null;
      }
      const i = m.trees.findIndex((t) => t.some(([tx, ty]) => tx === x && ty === y));
      if (i >= 0) return { m, i, secret: false };
      const s = m.secretTrees.findIndex((t) => t.some(([tx, ty]) => tx === x && ty === y));
      return s >= 0 ? { m, i: s, secret: true } : null;
    }
    const headbuttTree = (map, x, y) => !!treeAt(map, x, y);
    // Which table a tree has for you (Headbutt_GetTreeType_Regular).
    function treeTable(t) {
      if (t.secret) return t.m.secret;
      const n = t.m.trees.length, digit = (env.player().trainerId | 0) % 10;
      const kind = n >= 5 ? LUT[5][digit][t.i % 5] : LUT[n][digit][t.i];
      return kind === TREE_COMMON ? t.m.common : kind === TREE_RARE ? t.m.rare : null;
    }
    async function headbutt(map, x, y) {
      const t = treeAt(map, x, y), T = DATA().text;
      if (!t) return;
      const user = env.player().party.find((r) => !r.egg && knows(r, "Headbutt"));
      if (!user) { await env.say(T.formidable); return; }
      if (!(await env.confirm(T.ask[T.ask.length - 1]))) return;
      await env.say(fillMon(T.used, monName(user)));
      await env.shake();
      const table = treeTable(t);
      if (!table || !table.length) return;
      let roll = Math.floor(Math.random() * 100), slot = 0;
      while (slot < table.length - 1 && roll >= SLOT_ODDS[slot]) roll -= SLOT_ODDS[slot++];
      const [species, min, max] = table[slot];
      if (!window.DEX[species]) return;
      await env.wildBattle(species, min + Math.floor(Math.random() * (max - min + 1)));
    }

    // Ilex Forest's tutor (msg_0115_D36R0101: shaking trees with Headbutt).
    const canLearn = (r) => DATA().learners.includes(r.species) ||
      JSON.stringify((window.LEARNSETS_GEN6 || {})[r.species] || {}).includes('"Headbutt"');
    async function headbuttTutor() {
      const t = (n) => env.text("msg_0115_D36R0101_000" + n) || ["…"];
      const ask = t(11);
      if (ask.length > 1) await env.say(ask.slice(0, -1));
      if (!(await env.confirm(ask[ask.length - 1]))) { await env.say(t(13)); return; }
      await env.say(t(14));
      const party = env.player().party;
      const notes = party.map((r) => (r.egg || !canLearn(r) ? "NOT ABLE" : knows(r, "Headbutt") ? "LEARNED" : "ABLE"));
      const r = await env.choosePartyFor("Teach which {PKMN}?", notes);
      if (!r) { await env.say(t(13)); return; }
      if (r.egg) { await env.say(t(15)); return; }
      if (knows(r, "Headbutt")) { await env.say(fillMon(t(23), monName(r))); return; }
      if (!canLearn(r)) { await env.say(t(16)); return; }
      await env.learnMove(r, "Headbutt");
      if (!knows(r, "Headbutt")) { await env.say(t(13)); return; }
      await env.say(fillMon(t(22), monName(r)));
    }

    // ---------- Kurt's Apricorn Balls ----------
    const apricorns = () => APRICORNS.map((c) => ({ c, id: c + "-apricorn", n: env.player().bag[c + "-apricorn"] | 0 })).filter((a) => a.n > 0);
    async function kurt(op) {
      const s = env.johtoState();
      if (op === "GetTotalApricornCount") return apricorns().reduce((n, a) => n + a.n, 0);
      if (op === "ScrCmd_735") return s.kurt ? s.kurt.n : 0;
      if (op === "ScrCmd_737") return s.kurt ? KURT_BALLS[s.kurt.colour] : "poke-ball";
      if (op === "ClearKurtApricorn") { delete s.kurt; return 0; }
      if (op === "ScrCmd_739") {
        // (HGSS's Apricorn Box: which Apricorn, and how many: ui/apricorn-box.js.)
        if (env.apricornBox) {
          const got = await env.apricornBox();
          if (!got || !env.takeItem(got.id, got.n)) return 0;
          s.kurt = { colour: got.colour, n: got.n };
          return got.n;
        }
        const have = apricorns();
        const i = await env.choose(have.map((a) => env.itemName(a.id) + " x" + a.n).concat(["Cancel"]));
        if (i < 0 || i >= have.length) return 0;
        const n = have[i].n > 1 ? await env.quantity("How many will you give?", have[i].n) : 1;
        if (!n) return 0;
        if (!env.takeItem(have[i].id, n)) return 0;
        s.kurt = { colour: have[i].c, n };
        return n;
      }
      return 0;
    }

    return { headbuttTree, headbutt, treeTable, headbuttTutor, kurt, KURT_BALLS };
  }

  window.JohtoField = { create, KURT_BALLS };
})();
