// Emerald's Pokémon Contests (src/contest.c, contest_util.c; tools/lib/hoenn-contest.js has the data), for ui/hoenn-script.js: the Lilycove
// Contest Hall's lobby and the halls themselves run Emerald's own scripts, and ask for these in `choosecontestmon`, `startcontest`,
// `showcontestresults` and the specials (TryEnterContestMon, GiveMonContestRibbon ...). Data: window.HOENN_CONTEST.
//
//   const C = HoennContest.create(env);
//   await C.op("startcontest", [], api)           // true if it's one of its commands
//   await C.special("TryEnterContestMon", api)    // true if it's one of its specials
//
// The contest itself is a simplified one: four Pokémon, five appeals each; the judges' points are a Pokémon's condition (the
// visual round: its main condition and half of its neighbours', as Emerald works them out) plus the hearts its appeals earned,
// doubled. A move's hearts come from its contest effect and category (a move of the contest's own kind earns a heart more); a combo
// of moves earns more, repeating a move earns less, and some moves startle the ones that appealed before. (Conditions here come from
// a Pokémon's own stats: there are no Pokéblocks.)
// env: player(), createMon..., say(pages), pick(title, labels) -> index | -1, choosePartyMon(prompt) -> index | -1, rand().
(function () {
  "use strict";

  const D = () => window.HOENN_CONTEST;
  const CATS = ["Cool", "Beauty", "Cute", "Smart", "Tough"], RANKS = ["Normal", "Super", "Hyper", "Master"];
  const NAMES = ["Coolness Contest", "Beauty Contest", "Cuteness Contest", "Smartness Contest", "Toughness Contest"];
  const TURNS = 5;
  const CANT = 0, EQUAL = 1, HIGH = 2, EGG = 3, FAINTED = 4;
  const nice = (s) => String(s).toLowerCase().replace(/^./, (c) => c.toUpperCase());

  function create(env) {
    const rnd = () => (env.rand ? env.rand() : Math.random());
    const int = (n) => Math.floor(rnd() * n);
    const P = () => env.player();
    const S = () => {
      const f = P().flags, c = f.hoennContest || (f.hoennContest = {});
      if (!c.paintings) c.paintings = {};
      return c;
    };
    const v = (api, name) => +api.getVar(name) || 0;
    // (A special's result: in VAR_RESULT, as gSpecialVar_Result, and in the var a specialvar asked for.)
    const res = (api, x) => { api.setVar("VAR_RESULT", x); api.set(x); };
    const ribbons = (r) => r.contestRibbons || (r.contestRibbons = { cool: 0, beauty: 0, cute: 0, smart: 0, tough: 0 });
    const keyOf = (cat) => CATS[cat].toLowerCase();

    // A Pokémon's contest conditions: a little from its stats, and what the Pokéblocks it's eaten gave it
    // (record.contest, ui/hoenn-pokeblock.js: Emerald's own conditions come from those alone), to 255.
    function conditions(r) {
      const d = window.DEX[r.species] || {}, k = Math.min(1.6, 0.4 + (r.level || 1) / 60), f = (a, b) => Math.round(((d[a] || 40) + (d[b] || 40)) / 2 / 8 * k);
      const c = r.contest || {};
      return { cool: Math.min(255, f("atk", "spe") + (c.cool || 0)), beauty: Math.min(255, f("spa", "spe") + (c.beauty || 0)), cute: Math.min(255, f("hp", "spd") + (c.cute || 0)),
        smart: Math.min(255, f("spa", "spd") + (c.smart || 0)), tough: Math.min(255, f("def", "hp") + (c.tough || 0)), sheen: c.sheen || 0 };
    }
    const MAIN = [["cool", "tough", "beauty"], ["beauty", "cool", "cute"], ["cute", "beauty", "smart"], ["smart", "cute", "tough"], ["tough", "smart", "cool"]];
    const round1 = (st, cat) => { const [m, a, b] = MAIN[cat]; return st[m] + Math.floor((st[a] + st[b] + st.sheen) / 2); };

    // The other three: Normal, Super ... by rank, of the kind of contest; those that only show before or after the game's cleared.
    function setContestants(cat, rank, partyIndex) {
      const s = S(), post = !!(env.gameClear && env.gameClear());
      const pool = D().opponents.map((o, i) => [o, i]).filter(([o]) => o && o.rank === rank && o.pools[cat] && (post ? o.filter !== "no_postgame" : o.filter !== "only_postgame"));
      const picked = [];
      while (picked.length < 3 && pool.length) picked.push(pool.splice(int(pool.length), 1)[0][0]);
      const mon = P().party[partyIndex], name = P().name;
      s.cont = picked.map((o) => ({ trainer: o.trainer, nick: o.nick, species: o.species, moves: o.moves, stats: o.stats, gfx: o.gfx, npc: true }))
        .concat([{ trainer: name, nick: window.Party.displayName ? window.Party.displayName(mon) : mon.species, species: mon.species, moves: mon.moves.map((m) => m.name), stats: conditions(mon), gfx: null, npc: false }]);
      s.player = 3; s.cat = cat; s.rank = rank; s.partyIndex = partyIndex;
      s.r1 = s.cont.map((c) => round1(c.stats, cat));
      s.final = null; s.total = null;
    }

    // ---------- The contest ----------
    const heartsOf = (name, cat) => {
      const m = D().moves[name] || { effect: 0, cat: 0, starter: 0, combos: [] }, e = D().effects[m.effect] || { appeal: 20, jam: 0, type: 0 };
      return { m, e, base: Math.round(e.appeal / 10) + (m.cat === cat ? 1 : 0) };
    };
    async function runContest() {
      const s = S(), cat = s.cat, pages = [], total = s.r1.map((x) => 0), last = s.cont.map(() => null), hearts = s.cont.map(() => 0);
      pages.push("The " + CATS[cat] + " Contest, " + RANKS[s.rank] + " Rank, begins!");
      await env.say(pages.splice(0));
      for (let turn = 1; turn <= TURNS; turn++) {
        const order = s.cont.map((c, i) => i).sort((a, b) => s.r1[b] - s.r1[a] || rnd() - 0.5);
        const performed = [];
        for (const i of order) {
          const c = s.cont[i];
          const usable = c.moves.filter((n) => n && D().moves[n]);
          let move;
          if (!c.npc) {
            const labels = usable.map((n) => { const h = heartsOf(n, cat); return n + "  " + CATS[h.m.cat] + "  " + "♥".repeat(Math.max(1, h.base)); });
            let pick = -1;
            while (pick < 0) pick = await env.pick("Round " + turn + ": what will " + c.nick + " do?", labels);
            move = usable[pick];
          } else {
            let best = -1;
            for (const n of usable) {
              const h = heartsOf(n, cat), prev = last[i] && D().moves[last[i]];
              const score = h.base + (prev && h.m.combos.includes(prev.starter) ? 4 : 0) - (n === last[i] ? 3 : 0) + rnd() * 2;
              if (score > best) { best = score; move = n; }
            }
          }
          const h = heartsOf(move, cat), prev = last[i] && D().moves[last[i]];
          let gain = h.base, note = "";
          if (prev && h.m.combos.includes(prev.starter)) { gain += 4; note = " A combo!"; }
          if (move === last[i]) { gain = Math.floor(gain / 2); note = " It was a repeat…"; }
          // (A move that startles: those who have appealed this round lose what it takes.)
          let jammed = "";
          if (h.e.jam > 0 && performed.length) {
            const targets = h.e.type === 2 ? [performed[performed.length - 1]] : performed;
            for (const t of targets) { const lose = Math.min(hearts[t], Math.max(1, Math.round(h.e.jam / 10))); hearts[t] -= lose; total[t] -= lose; }
            jammed = " It startled the others!";
          }
          hearts[i] += gain; total[i] += gain; last[i] = move; performed.push(i);
          await env.say(c.nick + " used " + move + "!\n" + "♥".repeat(Math.max(0, gain)) + " " + gain + " point" + (gain === 1 ? "" : "s") + " in appeal." + note + jammed);
        }
      }
      s.appeal = total;
      s.total = s.r1.map((r, i) => r + total[i] * 2);
      // (Ties go either way.)
      const ids = s.cont.map((c, i) => i).sort((a, b) => s.total[b] - s.total[a] || rnd() - 0.5);
      s.final = []; ids.forEach((id, place) => { s.final[id] = place; });
      s.order = ids;
    }
    const ordinal = ["1st", "2nd", "3rd", "4th"];
    async function showResults() {
      const s = S(), lines = ["The judges' marks:"];
      for (const id of s.order) lines.push(ordinal[s.final[id]] + "  " + s.cont[id].nick + " (" + s.cont[id].trainer + ")  " + s.total[id] + " pts");
      await env.say([lines.join("\n")]);
    }

    // ---------- Commands ----------
    async function op(name, a, api) {
      const s = S();
      switch (name) {
        case "choosecontestmon": {
          const i = await env.choosePartyMon("Choose a POKéMON.");
          api.setVar("VAR_0x8004", i < 0 ? 255 : i);
          return true;
        }
        case "startcontest": await runContest(); return true;
        case "showcontestresults": await showResults(); return true;
        case "buffercontestname": {
          // (buffercontestname STR_VAR_2, VAR_0x8008: the kind of contest's name.)
          api.setBuffer(String(a[0]).replace(/\D/g, "") || 2, NAMES[api.num(a[1])] || "Contest");
          return true;
        }
        case "contestlinktransfer": return true;
        case "showcontestpainting": {
          const w = s.paintings[String(a[0])];
          await env.say(w ? "A painting of " + w.nick + ", " + w.trainer + "'s " + w.species + ".\n" + CATS[w.cat] + " Contest, " + RANKS[w.rank] + " Rank winner." : "There's no picture here yet.");
          return true;
        }
      }
      return false;
    }

    // ---------- Specials ----------
    async function special(name, api) {
      const s = S(), cat = () => v(api, "VAR_CONTEST_CATEGORY"), rank = () => v(api, "VAR_CONTEST_RANK");
      switch (name) {
        case "TryEnterContestMon": {
          const i = v(api, "VAR_0x8004"), r = P().party[i];
          let r2;
          if (!r) r2 = CANT;
          else if (r.egg) r2 = EGG;
          else if (r.hp <= 0) r2 = FAINTED;
          else { const rib = ribbons(r)[keyOf(cat())]; r2 = rib > rank() ? HIGH : rib >= rank() ? EQUAL : CANT; }
          if (r2 === EQUAL || r2 === HIGH) setContestants(cat(), rank(), i);
          res(api, r2);
          return true;
        }
        case "HasMonWonThisContestBefore": { const r = P().party[s.partyIndex]; res(api, r && ribbons(r)[keyOf(cat())] > rank() ? 1 : 0); return true; }
        case "GiveMonContestRibbon": {
          const r = P().party[s.partyIndex];
          if (!r || !s.final || s.final[s.player] !== 0) return true;
          const rb = ribbons(r), k = keyOf(cat());
          if (rb[k] <= rank() && rb[k] <= 3) rb[k]++;
          return true;
        }
        case "GetContestPlayerId": case "GetContestMultiplayerId": res(api, name === "GetContestPlayerId" ? (s.player == null ? 3 : s.player) : 4); return true;
        case "IsWirelessContest": case "IsContestWithRSPlayer": case "IsContestDebugActive": res(api, 0); return true;
        case "ClearLinkContestFlags": case "LinkContestTryShowWirelessIndicator": case "LinkContestTryHideWirelessIndicator": case "LoadLinkContestPlayerPalettes": case "SetLinkContestPlayerGfx":
        case "ShowContestEntryMonPic": case "HideContestEntryMonPic": case "CloseLink": return true;
        case "SetContestTrainerGfxIds": {
          api.setVar("VAR_OBJ_GFX_ID_0", (s.cont && s.cont[0].gfx) || "OBJ_EVENT_GFX_BOY_1");
          api.setVar("VAR_OBJ_GFX_ID_1", (s.cont && s.cont[1].gfx) || "OBJ_EVENT_GFX_GIRL_1");
          api.setVar("VAR_OBJ_GFX_ID_2", (s.cont && s.cont[2].gfx) || "OBJ_EVENT_GFX_MAN_1");
          return true;
        }
        case "GetContestWinnerId": api.setVar("VAR_0x8005", s.order ? s.order[0] : 0); return true;
        case "BufferContestWinnerTrainerName": api.setBuffer(3, s.order ? s.cont[s.order[0]].trainer : ""); return true;
        case "BufferContestWinnerMonName": api.setBuffer(1, s.order ? s.cont[s.order[0]].nick : ""); return true;
        case "BufferContestTrainerAndMonNames": { const c = s.cont && s.cont[v(api, "VAR_0x8006")]; if (c) { api.setBuffer(1, c.trainer); api.setBuffer(3, c.nick); } return true; }
        case "BufferContestantTrainerName": { const c = s.cont && s.cont[v(api, "VAR_0x8006")]; api.setBuffer(1, c ? c.trainer : ""); return true; }
        case "BufferContestantMonNickname": { const c = s.cont && s.cont[v(api, "VAR_0x8006")]; api.setBuffer(3, c ? c.nick : ""); return true; }
        case "GetContestMonCondition": api.setVar("VAR_0x8004", s.r1 ? s.r1[v(api, "VAR_0x8006")] : 0); return true;
        case "SaveMuseumContestPainting": {
          const w = s.cont && s.cont[s.player];
          if (w) s.paintings.CONTEST_WINNER_ARTIST = { nick: w.nick, trainer: w.trainer, species: w.species, cat: s.cat, rank: s.rank };
          return true;
        }
        case "ShouldReadyContestArtist": res(api, s.final && s.final[s.player] === 0 ? 1 : 0); return true;
        case "GenerateContestRand": res(api, int(Math.max(1, v(api, "VAR_RESULT")))); return true;
        case "BufferContestWinnerMonName2": return true;
      }
      return false;
    }

    return { op, special, state: S };
  }

  window.HoennContest = { create, CATS, RANKS };
})();
