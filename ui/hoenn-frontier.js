// The Battle Frontier's rules (Emerald's src/frontier_util.c, battle_tower.c, battle_tent.c and the facilities' own files),
// for ui/hoenn-script.js: the lobbies', corridors' and battle rooms' scripts are Emerald's own, and ask for these in the
// frontier_*, tower_*, factory_* ... commands (asm/macros/battle_frontier/*.inc). Data: window.HOENN_FRONTIER
// (tools/lib/hoenn-frontier.js: the trainers and their Pokémon, the Battle Point table, the Brains).
//
//   const F = HoennFrontier.create(env);
//   await F.op("frontier_get", ["FRONTIER_DATA_BATTLE_NUM"], api)    // true if it's one of its commands
//   await F.special("DoSpecialTrainerBattle", api)                   // true if it's one of its specials
//
// env: player(), createMon(species, level, opts), say(text), battle(spec) -> "won" | "lost" | ...,
//   chooseParty({ max, lvlMode, check }) -> party indexes | null, pick(title, options) -> index | -1, softReset(),
//   healParty(), giveItem(id) -> bool, itemName(id), bpBox(on), rand() (0..1).
// A challenge's own Pokémon are copies kept here (player.flags.hoennFrontier.team), put in the party for each battle
// only (env.battle), so your real party is never touched; levels are set for the Level 50 mode, as Emerald's are.
(function () {
  "use strict";

  const D = () => window.HOENN_FRONTIER;
  const FAC = { TOWER: 0, DOME: 1, PALACE: 2, ARENA: 3, FACTORY: 4, PIKE: 5, PYRAMID: 6 };
  const FACILITY_NAMES = ["Battle Tower", "Battle Dome", "Battle Palace", "Battle Arena", "Battle Factory", "Battle Pike", "Battle Pyramid"];
  const STAGES = 7, TENT_STAGES = 3, TENT_MIN = 30, MAX_STREAK = 9999, MAX_BP = 9999;
  const TENT_PRIZES = { slateport: "full-heal", verdanturf: "nest-ball", fallarbor: "hyper-potion" };
  // The classes' names, as they show in front of a name.
  const className = (cls) => String(cls || "").replace(/_[mf]$/, "").split("_").map((w) => w === "pkmn" ? "Pokémon" : w === "pokefan" ? "Pokéfan" : w.replace(/^./, (c) => c.toUpperCase())).join(" ");
  // F_EV_SPREAD bits: the stats' order here is the record's.
  const EV_BITS = [["hp", 1], ["atk", 2], ["def", 4], ["spe", 8], ["spa", 16], ["spd", 32]];

  function create(env) {
    const rnd = () => (env.rand ? env.rand() : Math.random());
    const int = (n) => Math.floor(rnd() * n);
    const P = () => env.player();
    const fresh = () => ({
      status: 0, lvl: 0, num: 0, paused: 0, noRecord: 1, brain: 0, bp: 0, card: 0, streak: {}, best: {}, active: {}, rents: {}, wins: {}, champ: {},
      ids: [], A: null, B: null, order: [], pending: [], team: [], items: [], rent: [], foe: [], outcome: 0, prize: {}
    });
    const S = () => {
      const f = P().flags, d = f.hoennFrontier || (f.hoennFrontier = {});
      for (const [k, x] of Object.entries(fresh())) if (d[k] === undefined) d[k] = x;
      return d;
    };
    const v = (name) => +env.getVar(name) || 0;
    const fac = () => v("VAR_FRONTIER_FACILITY");
    const mode = () => v("VAR_FRONTIER_BATTLE_MODE");
    const key = (f, m, l) => f + "." + (f === FAC.ARENA || f >= FAC.PIKE ? 0 : m) + "." + l;
    const curKey = () => key(fac(), mode(), S().lvl);
    const streak = () => S().streak[curKey()] || 0;
    const setStreak = (n) => { const s = S(); s.streak[curKey()] = n; if (n > (s.best[curKey()] || 0)) s.best[curKey()] = n; };
    const symbols = (f) => (env.flag("FLAG_SYS_" + Object.keys(FAC)[f] + "_SILVER") ? 1 : 0) + (env.flag("FLAG_SYS_" + Object.keys(FAC)[f] + "_GOLD") ? 1 : 0);
    const level50 = () => S().lvl === 0;

    // ---------- Pokémon ----------
    const maxHp = (r) => window.Party.maxHp(r);
    function evSpread(bits) {
      const n = EV_BITS.filter(([, b]) => bits & b).length, evs = {};
      for (const [k, b] of EV_BITS) evs[k] = bits & b ? Math.min(255, Math.floor(510 / n)) : 0;
      return evs;
    }
    // A table's Pokémon (hoenn-frontier.js: { species, moves, item, ev, nature }) at a level, with fixed IVs.
    function monFrom(m, level, iv) {
      const r = env.createMon(m.species, level, { ivs: iv, moves: m.moves.slice(0, 4), shiny: false });
      if (window.NATURES[m.nature]) r.nature = m.nature;
      r.evs = typeof m.ev === "number" ? evSpread(m.ev) : r.evs;
      r.item = (m.item && D().heldItems[m.item]) || "";
      r.happiness = m.moves.includes("Frustration") ? 0 : 255;
      r.hp = maxHp(r);
      return r;
    }
    const brainMon = (b, level) => {
      const r = env.createMon(b.species, level, { ivs: b.iv, moves: b.moves.slice(0, 4), shiny: false });
      if (window.NATURES[b.nature]) r.nature = b.nature;
      r.evs = { hp: b.ev[0], atk: b.ev[1], def: b.ev[2], spe: b.ev[3], spa: b.ev[4], spd: b.ev[5] };
      r.item = b.item || ""; r.happiness = 255; r.hp = maxHp(r);
      return r;
    };
    const fixedIv = (id) => id <= 99 ? 3 : id <= 119 ? 6 : id <= 139 ? 9 : id <= 159 ? 12 : id <= 179 ? 15 : id <= 199 ? 18 : id <= 219 ? 21 : 31;
    // The opponent's team from a trainer's set: no repeated species or held items.
    function pickMons(mons, heldItems, set, n, level, iv, highOk) {
      const out = [], used = new Set(), items = new Set();
      for (let tries = 0; out.length < n && tries < 2000; tries++) {
        const id = set[int(set.length)], m = mons[id];
        if (!m || (!highOk && id > D().highTier) || used.has(m.species)) continue;
        const it = m.item ? heldItems[m.item] : "";
        if (it && items.has(it)) continue;
        used.add(m.species); if (it) items.add(it);
        out.push(monFrom(m, level, iv));
      }
      return out;
    }
    const healTeam = () => { const s = S(); if (s.pike && s.pike.noHeal && fac() === FAC.PIKE) return; for (const r of s.team) window.Party.heal(r); };
    function setLevel(r, level) {
      r.level = level; r.exp = window.Experience.expForLevel(window.Experience.growthRate(r.species), level);
      r.hp = maxHp(r);
    }
    const highest = (list) => list.reduce((a, r) => Math.max(a, r.level), 0);
    // The level the opponents' Pokémon are: 50, or 60 and up with yours (Level Open); the Factory's 50 and 100, the tents' 30 and up.
    function foeLevel() {
      const s = S(), f = fac();
      if (f === FAC.FACTORY) return s.lvl === 0 ? 50 : s.lvl === 1 ? 100 : TENT_MIN;
      if (s.lvl === 0) return 50;
      const mine = s.team.length ? highest(s.team) : highest(P().party);
      return s.lvl === 2 ? Math.max(TENT_MIN, mine) : Math.max(60, mine);
    }
    const clone = (r) => JSON.parse(JSON.stringify(r));

    // ---------- Trainers ----------
    // The opponent set up for the next battle: { kind: "frontier" | "tent" | "brain", id, tent }.
    function trainerOf(ref) {
      if (!ref) return null;
      if (ref.kind === "brain") { const b = D().brainTrainers[ref.fac]; return { cls: b.cls, name: b.name, pic: b.pic, before: "", win: "", lose: "", brain: true, look: D().brainLook[ref.fac] }; }
      const t = ref.kind === "tent" ? D().tents[ref.tent].trainers[ref.id] : D().trainers[ref.id];
      return t && Object.assign({ look: D().look[t.cls] || "OBJ_EVENT_GFX_BOY_1" }, t);
    }
    const fullName = (t) => (t.brain ? t.cls + " " + t.name : className(t.cls) + " " + t.name);
    function randomTrainerId(challengeNum, battleNum) {
      const d = D(), n = Math.min(challengeNum, 7);
      let range;
      if (challengeNum <= 7) range = battleNum === STAGES - 1 ? d.rangesHard[n] : d.ranges[n];
      else range = d.ranges[7];
      return range[0] + int(range[1] - range[0] + 1);
    }

    // ---------- The challenge ----------
    function symbolBrain() {
      const f = fac(), n = symbols(f), a = D().brainStreaks[f], w = streak() + a[3];
      return n === 2 ? (w === a[0] ? 0 : 1) : n;
    }
    function brainStatus() {
      const f = fac(), a = D().brainStreaks[f];
      if (mode() !== 0) return 0;
      const w = streak() + a[3], n = symbols(f);
      if (n < 2) return w === a[n] ? n + 1 : 0;
      if (w === a[0]) return 3;
      if (w === a[1]) return 4;
      if (w > a[1] && (w - a[1]) % a[2] === 0) return 4;
      return 0;
    }
    function givePoints() {
      const s = S(), f = fac(), m = mode(), st = streak();
      const per = f === FAC.DOME ? st : f === FAC.PIKE ? Math.floor(st / 14) : Math.floor(st / STAGES);
      let c = per > 0 ? per - 1 : 0;
      const tbl = D().points;
      if (c >= tbl.length) c = tbl.length - 1;
      let pts = (tbl[c][f] || [])[f === FAC.ARENA || f >= FAC.PIKE ? 0 : m] || 0;
      if (s.A && s.A.kind === "brain") pts += 10;
      s.bp = Math.min(MAX_BP, s.bp + pts);
      s.card = Math.min(65535, s.card + pts);
      return pts;
    }
    // Pokémon you can take in: not an egg, not one of the banned legendaries, not over 50 for Level 50, a kind and item once.
    function eligible(party, lvlMode) {
      const banned = new Set(D().banned), ok = [];
      party.forEach((r, i) => { if (!r.egg && !banned.has(r.species) && !(lvlMode === 0 && r.level > 50)) ok.push(i); });
      return ok;
    }
    function countEligible(party, lvlMode) {
      const ok = eligible(party, lvlMode);
      let best = 0;
      for (let start = 0; start < ok.length; start++) {
        const sp = new Set(), it = new Set(); let n = 0;
        for (let k = 0; k < ok.length; k++) {
          const r = party[ok[(start + k) % ok.length]];
          if (sp.has(r.species) || (r.item && it.has(r.item))) continue;
          sp.add(r.species); if (r.item) it.add(r.item); n++;
        }
        best = Math.max(best, n);
      }
      return best;
    }
    const needed = () => { const m = mode(); return m === 0 ? 3 : m === 1 ? (fac() === FAC.TOWER ? 4 : 3) : 2; };
    function conflict(party, order, slot, lvlMode) {
      const r = party[slot];
      if (r.egg) return "EGGS can't enter.";
      if (D().banned.includes(r.species)) return Party_name(r) + " can't enter.";
      if (lvlMode === 0 && r.level > 50) return "Only POKéMON of Level 50 or less\ncan enter this challenge.";
      for (const i of order) {
        if (party[i].species === r.species) return "Each POKéMON must be a different kind.";
        if (r.item && party[i].item === r.item) return "Each POKéMON must hold a different item.";
      }
      return null;
    }
    const Party_name = (r) => (window.Party && window.Party.displayName ? window.Party.displayName(r) : r.species);

    // The team that fights: copies of the chosen Pokémon (levelled for the Level 50 mode).
    function buildTeam(n) {
      const s = S(), party = P().party;
      s.team = s.order.slice(0, n).map((i) => JSON.parse(JSON.stringify(party[i]))).filter(Boolean);
      for (const r of s.team) {
        if (s.lvl === 0) setLevel(r, 50);
        r.hp = maxHp(r);
        for (const mv of r.moves) mv.pp = window.Party.maxPp(mv);
        r.status = "";
      }
      s.items = s.team.map((r) => r.item);
    }

    // ---------- Commands ----------
    const need = (api, i) => api.num(i);
    async function op(name, a, api) {
      const s = S();
      switch (name) {
        // ----- frontier_util.c -----
        case "frontier_getstatus": {
          // (Back in the Pyramid's lobby, your own Pokémon and bag are yours again.)
          if (/BattlePyramidLobby/.test(env.map ? env.map() : "")) pyramidRestore();
          api.setVar("VAR_TEMP_CHALLENGE_STATUS", 255);
          if ([1, 2, 3, 4].includes(s.status)) api.setVar("VAR_TEMP_CHALLENGE_STATUS", s.status);
          return true;
        }
        case "frontier_get": {
          const d = need(api, a[0]), f = fac();
          const bits = [[1, 2], [4, 8], [16, 32], [64, 128], [256, 512], [1024, 2048], [4096, 8192]][f], sym = Math.min(1, symbols(f));
          const r = d === 0 ? s.status : d === 1 ? s.lvl : d === 2 ? s.num : d === 3 ? s.paused : d === 5 ? (() => { const o = s.outcome; s.outcome = 0; return o; })()
            : d === 6 ? 1 : d === 7 ? (s.brain & bits[sym] ? 1 : 0) : 0;
          api.setVar("VAR_RESULT", r);
          return true;
        }
        case "frontier_set": {
          const d = need(api, a[0]), val = a.length > 1 ? need(api, a[1]) : v("VAR_0x8006"), f = fac();
          const bits = [[1, 2], [4, 8], [16, 32], [64, 128], [256, 512], [1024, 2048], [4096, 8192]][f], sym = Math.min(1, symbols(f));
          if (d === 0) s.status = val;
          else if (d === 1) s.lvl = val;
          else if (d === 2) s.num = val;
          else if (d === 3) s.paused = val;
          else if (d === 4) s.order = s.pending.slice();
          else if (d === 7) s.brain |= bits[sym];
          return true;
        }
        case "frontier_setpartyorder": if (fac() === FAC.PYRAMID) pyramidParty(need(api, a[0])); else buildTeam(need(api, a[0])); return true;
        case "frontier_reset": await env.softReset(); return true;
        case "frontier_settrainers": case "frontier_saveparty": case "frontier_checkairshow": case "frontier_resetsketch": case "frontier_savebattle":
          if (name === "frontier_savebattle") api.setVar("VAR_RESULT", 0);
          return true;
        case "frontier_results": await results(need(api, a[0]), a.length > 1 ? need(api, a[1]) : 0); return true;
        case "frontier_getbrainstatus": api.setVar("VAR_RESULT", brainStatus()); return true;
        case "frontier_isbrain": api.setVar("VAR_RESULT", s.A && s.A.kind === "brain" ? 1 : 0); return true;
        case "frontier_givepoints": api.setBuffer(1, String(givePoints())); return true;
        case "frontier_getsymbols": api.setVar("VAR_RESULT", symbols(fac())); return true;
        case "frontier_givesymbol": { const F = Object.keys(FAC)[fac()]; api.setFlag("FLAG_SYS_" + F + (symbols(fac()) === 0 ? "_SILVER" : "_GOLD"), true); return true; }
        case "frontier_isbattletype": api.setVar("VAR_RESULT", 0); return true;
        case "frontier_checkineligible": {
          const lvl = v("VAR_RESULT"), party = P().party;
          if (countEligible(party, lvl) < needed()) {
            const caught = D().banned.filter((sp) => env.caught(sp));
            let txt;
            if (!caught.length) txt = " are";
            else if (caught.length === 1) txt = " and " + caught[0] + " are";
            else txt = ", " + caught.slice(0, -1).join(", ") + " and " + caught[caught.length - 1] + " are";
            api.setBuffer(1, txt); api.setVar("VAR_0x8004", 1);
          } else { api.setVar("VAR_0x8004", 0); s.lvl = lvl; }
          return true;
        }
        case "frontier_checkvisittrainer": api.setVar("VAR_RESULT", 1); return true;
        case "frontier_incrementstreak": {
          if (streak() < MAX_STREAK) setStreak(streak() + 1);
          if (fac() === FAC.DOME) { const k = curKey(); s.champ[k] = (s.champ[k] || 0) + 1; }
          return true;
        }
        case "frontier_restorehelditems": s.team.forEach((r, i) => { r.item = s.items[i] || ""; }); return true;
        case "frontier_gettrainername": {
          const n = a[0] === "STR_VAR_2" || need(api, a[0]) === 1 ? 2 : 1, t = trainerOf(s.A);
          api.setBuffer(n, t ? t.name : "");
          return true;
        }
        case "frontier_setbrainobj": { s.A = { kind: "brain", fac: fac() }; api.setVar("VAR_OBJ_GFX_ID_0", D().brainLook[fac()]); return true; }
      }
      if (/^tower_/.test(name)) return tower(name, a, api);
      if (/^(arena|palace|factory)_/.test(name)) return facility(name, a, api);
      if (/^dome_/.test(name)) return dome(name, a, api);
      if (/^pike_/.test(name)) return pike(name, a, api);
      if (/^pyramid_/.test(name)) return pyramid(name, a, api);
      if (/^apprentice_/.test(name)) {
        // (The Tower's Apprentice isn't here: he's always gone.)
        if (name === "apprentice_shouldcheckgone") { api.setVar("VAR_0x8004", 1); api.setFlag("FLAG_DAILY_APPRENTICE_LEAVES", true); }
        else if (name === "apprentice_gavelvlmode" || name === "apprentice_shouldleave") api.setVar("VAR_RESULT", 0);
        return true;
      }
      if (/^(slateport|verdanturf|fallarbor)tent_|^battletent_/.test(name)) return tent(name, a, api);
      return false;
    }

    // ---------- The Battle Tower ----------
    async function tower(name, a, api) {
      const s = S();
      switch (name) {
        case "tower_init": {
          s.status = 1; s.num = 0; s.paused = 0; s.noRecord = 1; s.ids = []; s.A = null; s.B = null; s.partner = null;
          if (!s.active[curKey()]) s.streak[curKey()] = 0;
          if (mode() >= 2) multiOpponents();
          if (env.markHome) env.markHome();
          return true;
        }
        case "tower_get": {
          const d = api.num(a[0]);
          if (d === 1) api.setVar("VAR_RESULT", streak());       // TOWER_DATA_WIN_STREAK
          else if (d === 2) api.setVar("VAR_RESULT", s.active[curKey()] ? 1 : 0);
          return true;
        }
        case "tower_set": {
          const d = api.num(a[0]), val = a.length > 1 ? api.num(a[1]) : v("VAR_0x8006");
          if (d === 1) s.streak[curKey()] = val;
          else if (d === 2) { if (val) s.active[curKey()] = true; else delete s.active[curKey()]; }
          return true;
        }
        case "tower_setopponent": {
          const m = mode(), w = streak(), challenge = Math.floor(w / STAGES);
          if (m >= 2) {
            // (Multi battles: a pair, the two chosen at the start.)
            const i = s.num;
            s.A = { kind: "frontier", id: s.ids[i * 2] }; s.B = { kind: "frontier", id: s.ids[i * 2 + 1] };
            api.setVar("VAR_OBJ_GFX_ID_0", trainerOf(s.A).look); api.setVar("VAR_OBJ_GFX_ID_1", trainerOf(s.B).look);
            return true;
          }
          let id;
          do { id = randomTrainerId(challenge, s.num); } while (s.ids.slice(0, s.num).includes(id));
          s.A = { kind: "frontier", id };
          if (s.num + 1 < STAGES) s.ids[s.num] = id;
          api.setVar("VAR_OBJ_GFX_ID_0", trainerOf(s.A).look);
          return true;
        }
        case "tower_setbattlewon": {
          if (s.num < MAX_STREAK) s.num++;
          if (streak() > (s.best[curKey()] || 0)) s.best[curKey()] = streak();
          api.setVar("VAR_RESULT", s.num);
          return true;
        }
        case "tower_giveribbons": api.setVar("VAR_RESULT", 0); return true;
        case "tower_save": {
          s.status = api.num(a[0]);
          s.paused = 1;
          api.setVar("VAR_TEMP_CHALLENGE_STATUS", 0);
          await env.save(s.status === 2);
          return true;
        }
        case "tower_getopponentintro": {
          const t = trainerOf(a[0] === 1 || a[0] === "1" ? s.B : s.A);
          if (t && t.before) await env.say(t.before);
          return true;
        }
        case "tower_loadpartners": case "tower_dopartnermsg": case "tower_setpartnergfx": case "tower_loadlinkopponents":
          return multis(name, a, api);
        case "tower_closelink": case "tower_setinterviewdata": return true;
      }
      return false;
    }
    // Multi battles with a partner (the Tower's): six trainers wait in the partner room, one of whom will fight beside you; the
    // opponents are two trainers a battle, fourteen over the challenge.
    function multiOpponents() {
      const s = S(), challenge = Math.floor(streak() / STAGES), ids = [];
      for (let b = 0; b < STAGES; b++) for (let k = 0; k < 2; k++) { let id; do { id = randomTrainerId(challenge, b); } while (ids.includes(id)); ids.push(id); }
      s.ids = ids;
    }
    async function multis(name, a, api) {
      const s = S(), pick = () => { const w = String(api.who ? api.who("VAR_LAST_TALKED") : ""), m = /(\d+)$/.exec(w); return Math.min(5, Math.max(0, (m ? +m[1] : 1) - 1)); };
      switch (name) {
        case "tower_loadpartners": {
          const challenge = Math.floor(streak() / STAGES), cands = [];
          while (cands.length < 6) { const id = randomTrainerId(challenge, 0); if (!cands.includes(id)) cands.push(id); }
          s.cand = cands;
          cands.forEach((id, i) => api.setVar("VAR_OBJ_GFX_ID_" + i, trainerOf({ kind: "frontier", id }).look));
          return true;
        }
        case "tower_dopartnermsg": {
          const id = (s.cand || [])[pick()], t = D().trainers[id], msg = api.num(a[0]);
          if (!t) return true;
          const mons = pickMons(D().mons, D().heldItems, t.set, 2, 50, 0, false).map(Party_name);
          // (PARTNER_MSGID_*: the greeting, the first and second Pokémon and the question, yes, no.)
          const text = [t.before || "Hello!", "My first POKéMON is " + (mons[0] || "?") + ".", "My second is " + (mons[1] || "?") + ".\nWill you team up with me?", "Okay! Let's do our best together!", "Oh… I see. Maybe some other time."][msg] || "…";
          if (msg === 3) s.partner = id;
          await env.say(text);
          return true;
        }
        case "tower_setpartnergfx": {
          const t = D().trainers[s.partner != null ? s.partner : (s.cand || [])[0]];
          if (t) api.setVar("VAR_OBJ_GFX_ID_E", D().look[t.cls] || "OBJ_EVENT_GFX_BOY_1");
          return true;
        }
        case "tower_loadlinkopponents": api.setVar("VAR_RESULT", 6); return true;
      }
      return false;
    }

    // ---------- The Battle Arena, Palace and Factory (and their tents' commands that are the same) ----------
    // (The Arena's judging and the Palace's Pokémon choosing their own moves are the engine's: battleSpecial's spec.arena and spec.palace.)
    async function facility(name, a, api) {
      const s = S(), pre = name.split("_")[0], what = name.slice(pre.length + 1), d = String(a[0] || "");
      switch (what) {
        case "init":
          s.status = 0; s.num = 0; s.paused = 0; s.noRecord = 1; s.ids = []; s.A = null; s.B = null; s.rent = []; s.foe = []; s.team = []; s.swapped = false;
          if (!s.active[curKey()]) { s.streak[curKey()] = 0; if (pre === "factory") s.rents[curKey()] = 0; }
          if (env.markHome) env.markHome();
          return true;
        case "get": {
          const r = /PRIZE$/.test(d) ? "ITEM_NONE" : /WIN_STREAK_ACTIVE$/.test(d) ? (s.active[curKey()] ? 1 : 0) : /WIN_STREAK_SWAPS$/.test(d) ? (s.rents[curKey()] || 0) : /WIN_STREAK$/.test(d) ? streak() : 0;
          api.setVar("VAR_RESULT", r);
          return true;
        }
        case "set": {
          const val = a.length > 1 ? api.num(a[1]) : v("VAR_0x8006");
          if (/WIN_STREAK_ACTIVE$/.test(d)) { if (val) s.active[curKey()] = true; else delete s.active[curKey()]; }
          else if (/WIN_STREAK_SWAPS$/.test(d)) { if (s.swapped) { s.rents[curKey()] = val; s.swapped = false; } }
          else if (/WIN_STREAK$/.test(d)) s.streak[curKey()] = val;
          return true;
        }
        case "save": s.status = api.num(a[0]); s.paused = 1; api.setVar("VAR_TEMP_CHALLENGE_STATUS", 0); await env.save(s.status === 2); return true;
        case "gettrainername": { const t = trainerOf(s.A); api.setBuffer(1, t ? t.name : ""); return true; }
        case "getopponentintro": { const t = trainerOf(s.A); if (t && t.before) await env.say(t.before); return true; }
        case "getcomment": api.setVar("VAR_RESULT", int(8)); return true;
        case "incrementstreak": return op("frontier_incrementstreak", [], api);
        case "setswapped": s.swapped = true; return true;
        case "setopponentgfx": {
          const t = trainerOf(s.A);
          if (t) api.setVar("VAR_OBJ_GFX_ID_0", t.look);
          return true;
        }
        case "setparties": case "setopponentmons": case "setprize": case "giveprize": return true;
        case "resethelditems": s.team.forEach((r, i) => { r.item = s.items[i] || ""; }); return true;
        case "generaterentalmons": case "generateopponentmons": case "rentmons": case "swapmons": return factoryLike("", what, a, api);
        case "getopponentmontype": {
          const count = {};
          for (const r of s.foe) for (const t of (window.DEX[r.species] || {}).types || []) count[t] = (count[t] || 0) + 1;
          const top = Object.entries(count).sort((x, y) => y[1] - x[1]);
          api.setVar("VAR_RESULT", top.length && (top.length === 1 || top[0][1] > top[1][1]) ? "TYPE_" + top[0][0].toUpperCase() : "NUMBER_OF_MON_TYPES");
          return true;
        }
        case "getopponentstyle": {
          const need = [3, 3, 3, 2, 2, 2, 2], points = new Array(7).fill(0);
          for (const r of s.foe) for (const m of r.moves) D().factory.styles.forEach((list, i) => { if (list.includes(m.name)) points[i]++; });
          let res = 0, n = 0;
          points.forEach((pt, i) => { if (pt >= need[i]) { res = i + 1; n++; } });
          api.setVar("VAR_RESULT", n > 2 ? 8 : res);
          return true;
        }
      }
      return false;
    }

    // ---------- The Battle Dome ----------
    // A tournament of sixteen: you and fifteen trainers, four rounds. Each round you choose two of your three Pokémon once you've
    // seen the opponent's three; the others' matches are settled by their teams' strength. (Emerald's tourney tree is drawn by
    // its own screen; here it is read out round by round.)
    const ROUNDS = ["Round 1", "Round 2", "the Semifinals", "the Finals"];
    const strength = (team) => team.reduce((t, r) => { const st = window.Party.stats(r); return t + st.hp + st.atk + st.def + st.spa + st.spd + st.spe; }, 0);
    function domeBracket() {
      const s = S(), lvl = foeLevel(), challengeNum = streak(), ids = [], mons = {};
      while (ids.length < 15) { const id = randomTrainerId(challengeNum, 3 + int(3)); if (!ids.includes(id)) ids.push(id); }
      for (const id of ids) { const t = D().trainers[id]; mons[id] = pickMons(D().mons, D().heldItems, t.set, 3, lvl, fixedIv(id), s.lvl !== 0); }
      const score = { me: strength(s.team) };
      for (const id of ids) score[id] = strength(mons[id]);
      // (Seeded by strength: the strongest face the weakest.)
      const order = ["me"].concat(ids).sort((x, y) => score[y] - score[x]), seeds = [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
      const leaves = seeds.map((i) => order[i]);
      s.dome = { leaves, alive: leaves.slice(), round: 0, score, mons, seed: order.indexOf("me") + 1, rounds: [leaves.slice()] };
    }
    const domeName = (x) => (x === "me" ? P().name : (D().trainers[x] || {}).name || "?");
    function domeOpponent() {
      const d = S().dome, i = d.alive.indexOf("me");
      return d.alive[i ^ 1];
    }
    async function dome(name, a, api) {
      const s = S(), what = name.slice(5), d = String(a[0] || "");
      switch (what) {
        case "init": {
          s.status = 0; s.num = 0; s.paused = 0; s.noRecord = 1; s.ids = []; s.A = null; s.B = null; s.dome = null; s.full = null;
          if (!s.active[curKey()]) s.streak[curKey()] = 0;
          if (env.markHome) env.markHome();
          return true;
        }
        case "get": {
          const k = curKey();
          const r = /WIN_STREAK_ACTIVE$/.test(d) ? (s.active[k] ? 1 : 0) : /WIN_STREAK$/.test(d) ? streak() : /ATTEMPTED_CHALLENGE$/.test(d) ? (s.wins["att." + k] ? 1 : 0)
            : /HAS_WON_CHALLENGE$/.test(d) ? (s.wins["won." + k] ? 1 : 0) : /PREV_TOURNEY_TYPE$/.test(d) ? 0 : 0;
          api.setVar("VAR_RESULT", r);
          return true;
        }
        case "set": {
          const val = a.length > 1 ? api.num(a[1]) : v("VAR_0x8006"), k = curKey();
          if (/WIN_STREAK_ACTIVE$/.test(d)) { if (val) s.active[k] = true; else delete s.active[k]; }
          else if (/WIN_STREAK$/.test(d)) s.streak[k] = val;
          else if (/ATTEMPTED_CHALLENGE$/.test(d)) s.wins["att." + k] = !!val;
          else if (/HAS_WON_CHALLENGE$/.test(d)) s.wins["won." + k] = !!val;
          else if (/SELECTED_MONS$/.test(d)) s.sel = s.pending.slice();
          return true;
        }
        case "save": s.status = api.num(a[0]); s.paused = 1; api.setVar("VAR_TEMP_CHALLENGE_STATUS", 0); await env.save(s.status === 2); return true;
        case "settrainers": case "resetsketch": case "initresultstree": return true;
        case "inittrainers": domeBracket(); return true;
        case "restorehelditems": (s.full || s.team).forEach((r, i) => { r.item = s.items[i] || ""; }); return true;
        case "reduceparty": {
          if (!s.full) s.full = s.team;
          s.team = (s.sel || [0, 1]).map((i) => s.full[i]);
          return true;
        }
        case "setopponent": {
          const o = domeOpponent(), final = s.dome.round === 3;
          if (final && brainStatus() !== 0) s.A = { kind: "brain", fac: FAC.DOME };
          else s.A = { kind: "frontier", id: o };
          return true;
        }
        case "setopponentgfx": { const t = trainerOf(s.A); if (t) api.setVar("VAR_OBJ_GFX_ID_0", t.look); return true; }
        case "getroundtext": api.setBuffer(1, ROUNDS[s.dome.round] || ""); return true;
        case "getopponentname": { const t = trainerOf(s.A); api.setBuffer(2, t ? t.name : ""); api.setBuffer(1, ROUNDS[s.dome.round] || ""); return true; }
        case "getwinnersname": api.setBuffer(1, domeName(s.dome.alive[0])); return true;
        case "compareseeds": api.setVar("VAR_RESULT", s.dome.leaves.indexOf("me") < s.dome.leaves.indexOf(domeOpponent()) ? 1 : 2); return true;
        case "initopponentparty": {
          // (The opponent brings the two of their three that you'd least like to see.)
          const t = trainerOf(s.A), lvl = foeLevel();
          let three = t.brain ? D().brain[FAC.DOME][symbolBrain()].map((bm) => brainMon(bm, lvl)) : clone(S().dome.mons[s.A.id] || pickMons(D().mons, D().heldItems, t.set, 3, lvl, fixedIv(s.A.id), s.lvl !== 0));
          s.foe3 = three;
          s.foe = three.slice().sort(() => rnd() - 0.5).slice(0, 2);
          return true;
        }
        case "showopponentinfo": {
          const t = trainerOf(s.A), three = (s.foe3 && s.foe3.length) ? s.foe3 : (s.dome.mons[s.A.id] || []);
          await env.say([fullName(t) + "\n" + three.map(Party_name).join(", ")].concat(three.map((r) => Party_name(r) + "\n" + r.moves.map((m) => m.name).join(", "))));
          return true;
        }
        case "showtourneytree": case "showstatictourneytree": case "showprevtourneytree": {
          const dm = s.dome;
          if (!dm) { await env.say("No tournament has been held yet."); return true; }
          if (env.domeTree) {
            const names = { me: P().name }, three = { me: s.team.map(Party_name) };
            for (const id of dm.leaves) if (id !== "me") { names[id] = domeName(id); three[id] = (dm.mons[id] || []).map(Party_name); }
            await env.domeTree({ rounds: dm.rounds || [dm.alive.slice()], names, mons: three, me: "me" });
            return true;
          }
          const lines = [];
          for (let i = 0; i < dm.alive.length; i += 2) lines.push(domeName(dm.alive[i]) + "  vs  " + domeName(dm.alive[i + 1]));
          await env.say(["The Battle Dome tourney: " + (ROUNDS[dm.round] || "") + ".\n" + "Your seed: " + dm.seed + " of 16."].concat(lines.reduce((acc, l, i) => { if (i % 4 === 0) acc.push([]); acc[acc.length - 1].push(l); return acc; }, []).map((g) => g.join("\n"))));
          return true;
        }
        case "resolvewinners": {
          const dm = s.dome, st = String(a[0]), won = /WON_MATCH/.test(st), next = [];
          for (let i = 0; i < dm.alive.length; i += 2) {
            const x = dm.alive[i], y = dm.alive[i + 1];
            if (x === "me" || y === "me") next.push(won ? "me" : x === "me" ? y : x);
            else { const px = dm.score[x] ** 2 / (dm.score[x] ** 2 + dm.score[y] ** 2); next.push(rnd() < px ? x : y); }
          }
          dm.alive = next; dm.round++;
          (dm.rounds || (dm.rounds = [dm.leaves.slice()])).push(next.slice());
          if (!won) { while (dm.alive.length > 1) { const n2 = []; for (let i = 0; i < dm.alive.length; i += 2) n2.push(rnd() < 0.5 ? dm.alive[i] : dm.alive[i + 1]); dm.alive = n2; dm.round++; dm.rounds.push(n2.slice()); } }
          return true;
        }
      }
      return false;
    }

    // ---------- The Battle Pike ----------
    // Fourteen rooms, each of three doors away from the last, and what's behind a door is anyone's guess: a trainer or two, a
    // Pokémon Center's worth of rest, a hall of wild Pokémon, a person with a word to say, someone who'll make one of yours sick.
    // The Pike Queen waits at the end of some challenges. Your Pokémon don't heal between rooms but in the ones that heal them.
    const ROOM = { SINGLE: 0, HEAL_FULL: 1, NPC: 2, STATUS: 3, HEAL_PART: 4, WILD: 5, HARD: 6, DOUBLE: 7, BRAIN: 8 };
    const HINT_OF = [3, 3, 1, 0, 0, 2, 2, 1, 4];   // (people, people, whispering, nostalgia, nostalgia, Pokémon, Pokémon, whispering, brain)
    const aliveMons = () => S().team.filter((r) => r.hp > 0);
    const healthyMons = () => S().team.filter((r) => r.hp > 0 && !r.status);
    const pikeCount = (num) => (num <= 4 ? 1 : num <= 9 ? 2 : 3);
    const pikeBrain = (nextRoom) => {
      const a = D().brainStreaks[FAC.PIKE], n = symbols(FAC.PIKE), w = streak() + nextRoom;
      if (n < 2) return w === a[n] - a[3] ? n + 1 : 0;
      if (w === a[0] - a[3]) return 3;
      if (w === a[1] - a[3] || (w > a[1] && (w - a[1] + a[3]) % a[2] === 0)) return 4;
      return 0;
    };
    function tryHeal(count) {
      const s = S(), order = s.team.map((r, i) => i).sort(() => rnd() - 0.5);
      for (const i of order) {
        if (!count) break;
        const r = s.team[i];
        if (r.hp < maxHp(r) || r.status || r.moves.some((m) => m.pp < window.Party.maxPp(m))) { window.Party.heal(r); count--; }
      }
    }
    function inflictStatus() {
      const s = S(), count = pikeCount(s.num), prevent = { frz: ["Ice"], tox: ["Steel", "Poison"], par: ["Ground", "Electric"], brn: ["Fire"], slp: [] };
      const typesOf = (r) => (window.DEX[r.species] || {}).types || [];
      const order = s.team.map((r, i) => i).sort(() => rnd() - 0.5);
      let status = null;
      for (let tries = 0; tries < 60 && !status; tries++) {
        const roll = int(100), st = roll < 35 ? "tox" : roll < 60 ? "frz" : roll < 80 ? "par" : roll < 90 ? "slp" : "brn";
        let seen = 0;
        for (const i of order) {
          const r = s.team[i];
          if (r.hp > 0 && !r.status) { seen++; if (!typesOf(r).some((t) => prevent[st].includes(t))) { status = st; break; } }
          if (seen === count) break;
        }
        if (!seen) return false;
      }
      if (!status) return false;
      s.pike.statusCode = ["frz", "brn", "tox", "par", "slp"].indexOf(status);
      s.pike.statusMon = status === "frz" ? 1 : status === "brn" ? int(2) : 0;
      let n = 0;
      for (const i of order) {
        const r = s.team[i];
        if (r.hp > 0 && !r.status) {
          n++;
          const ab = r.ability, stops = { frz: "Magma Armor", brn: "Water Veil", par: "Limber", tox: "Immunity" }[status];
          if (ab !== stops && !((status === "slp") && (ab === "Insomnia" || ab === "Vital Spirit")) && !typesOf(r).some((t) => prevent[status].includes(t))) r.status = status;
        }
        if (n === count) break;
      }
      return true;
    }
    function nextRoom(door) {
      const s = S(), k = s.pike;
      if (k.hintType === ROOM.BRAIN) return ROOM.BRAIN;
      if (door === k.hintIndex) { if (k.hintType === ROOM.STATUS) inflictStatus(); return k.hintType; }
      const off = new Set();
      for (let i = 0; i < 8; i++) if (HINT_OF[i] === HINT_OF[k.hintType]) off.add(i);
      if (aliveMons().length < 2) off.add(ROOM.DOUBLE);
      if (!healthyMons().length) off.add(ROOM.STATUS);
      if (k.noHeal) { off.add(ROOM.HEAL_FULL); off.add(ROOM.HEAL_PART); }
      const cands = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => !off.has(i)), pick = cands[int(cands.length)] ?? ROOM.NPC;
      if (pick === ROOM.STATUS) inflictStatus();
      return pick;
    }
    function pikeTrainers(difficult, two) {
      const s = S(), challengeNum = Math.floor(streak() / 14), used = s.ids.filter((x) => x != null && x >= 0);
      const draw = () => { let id; do { id = randomTrainerId(challengeNum, difficult ? STAGES - 1 : 1); } while (used.includes(id)); used.push(id); return id; };
      s.A = { kind: "frontier", id: draw() }; s.ids[s.num - 1] = s.A.id;
      s.B = two ? { kind: "frontier", id: draw() } : null;
    }
    async function pike(name, a, api) {
      const s = S(), k = s.pike || (s.pike = { room: 0, hintType: 0, hintIndex: 0, noHeal: false, statusCode: 0, statusMon: 0, npc: 0 }), what = name.slice(5), d = String(a[0] || "");
      switch (what) {
        case "init": s.status = 0; s.num = 0; s.paused = 0; s.A = null; s.outcome = 0; if (!s.active[curKey()]) s.streak[curKey()] = 0; if (env.markHome) env.markHome(); return true;
        case "get": {
          const key2 = curKey(), r = /PRIZE$/.test(d) ? "ITEM_NONE" : /WIN_STREAK_ACTIVE$/.test(d) ? (s.active[key2] ? 1 : 0) : /WIN_STREAK$/.test(d) ? streak() : /RECORD_STREAK$/.test(d) ? s.best[key2] || 0 : /TOTAL_STREAKS$/.test(d) ? s.wins["pike." + key2] || 0 : 0;
          api.setVar("VAR_RESULT", r);
          return true;
        }
        case "set": {
          const val = a.length > 1 ? api.num(a[1]) : v("VAR_0x8006"), key2 = curKey();
          if (/WIN_STREAK_ACTIVE$/.test(d)) { if (val) s.active[key2] = true; else delete s.active[key2]; }
          else if (/RECORD_STREAK$/.test(d)) { if (val > (s.best[key2] || 0)) s.best[key2] = val; }
          else if (/TOTAL_STREAKS$/.test(d)) s.wins["pike." + key2] = val;
          else if (/WIN_STREAK$/.test(d)) s.streak[key2] = val;
          return true;
        }
        case "save": s.status = api.num(a[0]); s.paused = 1; api.setVar("VAR_TEMP_CHALLENGE_STATUS", 0); await env.save(s.status === 2); return true;
        case "setnextroom": k.room = nextRoom(v("VAR_0x8007")); return true;
        case "getroomtype": api.setVar("VAR_RESULT", k.room); return true;
        case "isfinalroom": api.setVar("VAR_RESULT", s.num > 14 ? 1 : 0); return true;
        case "inwildmonroom": k.inWild = true; return true;
        case "exitwildmonroom": k.inWild = false; return true;
        case "inchallenge": api.setVar("VAR_RESULT", /Pike/.test(env.map ? env.map() : "") ? 1 : 0); return true;
        case "setroomobjects": {
          const gfx = (n) => D().look[n] || "OBJ_EVENT_GFX_BOY_1", LINK = "OBJ_EVENT_GFX_LINK_RECEPTIONIST";
          api.setVar("VAR_OBJ_GFX_ID_0", LINK); api.setVar("VAR_OBJ_GFX_ID_1", "OBJ_EVENT_GFX_DUSCLOPS");
          let g0 = null, g1 = null;
          switch (k.room) {
            case ROOM.SINGLE: pikeTrainers(false, false); g0 = trainerOf(s.A).look; break;
            case ROOM.HEAL_FULL: g0 = LINK; break;
            case ROOM.NPC: { k.npc = int(D().pike.npcs.length); g0 = D().pike.npcs[k.npc].gfx; break; }
            case ROOM.STATUS: g0 = "OBJ_EVENT_GFX_GENTLEMAN"; g1 = k.statusMon === 1 ? "OBJ_EVENT_GFX_DUSCLOPS" : "OBJ_EVENT_GFX_KIRLIA"; break;
            case ROOM.HEAL_PART: g0 = "OBJ_EVENT_GFX_GENTLEMAN"; break;
            case ROOM.HARD: pikeTrainers(true, false); g0 = trainerOf(s.A).look; g1 = LINK; break;
            case ROOM.DOUBLE: pikeTrainers(false, true); g0 = trainerOf(s.A).look; g1 = trainerOf(s.B).look; break;
            case ROOM.BRAIN: s.A = { kind: "brain", fac: FAC.PIKE }; g0 = D().brainLook[FAC.PIKE]; g1 = LINK; break;
          }
          if (g0) api.setVar("VAR_OBJ_GFX_ID_0", g0);
          if (g1) api.setVar("VAR_OBJ_GFX_ID_1", g1);
          return true;
        }
        case "getstatus": api.setVar("VAR_RESULT", k.statusCode); return true;
        case "getstatusmon": api.setVar("VAR_RESULT", k.statusMon); return true;
        case "healonetwomons": { const n = 1 + int(2); tryHeal(n); api.setVar("VAR_RESULT", n); return true; }
        case "getnpcmsg": {
          const n = D().pike.npcs[k.npc] || D().pike.npcs[0], id = n.speech[s.num <= 4 ? 0 : s.num <= 10 ? 1 : 2];
          await env.say(D().pike.speeches[id] || "…");
          return true;
        }
        case "flashscreen": if (env.flash) await env.flash(); return true;
        case "sethintroom": {
          api.setVar("VAR_RESULT", 0);
          if (pikeBrain(1)) { api.setVar("VAR_RESULT", 1); k.hintIndex = int(6); k.hintType = ROOM.BRAIN; return true; }
          k.hintIndex = int(3);
          const pool = k.noHeal ? [0, 2, 3, 5, 6, 7] : [0, 1, 2, 3, 4, 5, 6, 7];
          k.hintType = pool[int(pool.length)];
          if (k.hintType === ROOM.STATUS && !healthyMons().length) k.hintType = ROOM.NPC;
          if (k.hintType === ROOM.DOUBLE && aliveMons().length < 2) k.hintType = ROOM.NPC;
          return true;
        }
        case "gethintroomid": api.setVar("VAR_RESULT", k.hintIndex); return true;
        case "gethint": api.setVar("VAR_RESULT", HINT_OF[k.hintType]); return true;
        case "cleartrainerids": s.ids = []; return true;
        case "gettrainerintro": { const t = trainerOf(d === "1" || a[0] === 1 ? s.B : s.A); if (t && t.before) await env.say(t.before); return true; }
        case "getbrainstatus": api.setVar("VAR_RESULT", pikeBrain(0)); return true;
        case "prequeenheal": {
          const TABLE = [[2, 1, 0], [2, 0, 1], [1, 2, 0], [1, 0, 2], [0, 2, 1], [0, 1, 2]], n = TABLE[k.hintIndex][v("VAR_0x8007")] || 0;
          tryHeal(n); api.setVar("VAR_RESULT", n);
          return true;
        }
        case "nohealing": k.noHeal = a.length ? !!api.num(a[0]) : false; return true;
        case "ispartyfullhealth": api.setVar("VAR_RESULT", s.team.every((r) => r.hp >= maxHp(r) && !r.status && r.moves.every((m) => m.pp >= window.Party.maxPp(m))) ? 1 : 0); return true;
        case "savehelditems": k.items = s.team.map((r) => r.item); return true;
        case "resethelditems": s.team.forEach((r, i) => { r.item = (k.items || s.items)[i] || ""; }); return true;
      }
      return false;
    }
    // A wild Pokémon in the Pike's hall: its level (Level 50's, or the best of yours) by how many rooms you've cleared.
    function pikeWild(mon) {
      const s = S(), lvl = s.lvl === 0 ? 0 : 1, w = streak(), header = w <= 20 * 14 ? 0 : w <= 40 * 14 ? 1 : w <= 60 * 14 ? 2 : 3, list = D().pike.wild[lvl * 4 + header];
      const e = list.find((x) => x.species === mon.species) || list[2];
      let level;
      if (lvl === 0) level = 50 - e.delta;
      else { level = Math.max(60, highest(s.team) - e.delta); }
      return Object.assign({}, mon, { species: e.species, level, moves: e.moves });
    }

    // ---------- The Battle Pyramid ----------
    // Seven dark floors of trainers and items (ui/hoenn-pyramid.js builds each from four numbers); the challenge's
    // Pokémon and the Pyramid's bag stand in for your party and bag while you're in it, and are put back at the lobby.
    const PY = () => window.HOENN_PYRAMID;
    const FLOOR_MAP = "BattleFrontier_BattlePyramidFloor", TOP_MAP = "BattleFrontier_BattlePyramidTop";
    const pyr = () => { const s = S(); return s.pyr || (s.pyr = { seed: [1, 2, 3, 4], light: 32, swapped: false, t: [], i: [] }); };
    const pyrKey = (lvl) => key(FAC.PYRAMID, 0, lvl);
    const pyrRound = () => Math.floor((S().streak[pyrKey(S().lvl)] || 0) / STAGES) % 20;
    let floorCache = null;
    function pyramidLayout() {
      const k = pyr(), s = S(), id = k.seed.join(",") + ":" + s.num;
      if (!floorCache || floorCache.id !== id) floorCache = { id, floor: window.HoennPyramid.floor(PY(), k.seed, Math.min(6, s.num)) };
      return floorCache.floor;
    }
    function pickupItem() {
      const s = S(), Y = PY(), floor = Math.min(6, s.num), r = int(100);
      let i = Y.slotStart[floor];
      while (i < Y.slots.length - 1 && r >= Y.slots[i][0]) i++;
      return ((s.lvl === 0 ? Y.pickups50 : Y.pickupsOpen)[pyrRound()] || [])[Y.slots[i][1]] || "hyper-potion";
    }
    // A new floor: its numbers, its trainers and its items.
    function seedFloor() {
      const s = S(), k = pyr(), flags = P().flags;
      for (const f of Object.keys(flags)) if (/^PYRAMID_[TI]\d+$/.test(f)) delete flags[f];
      k.seed = [int(65536), int(65536), int(65536), int(65536)]; k.light = 32; floorCache = null;
      const F = pyramidLayout(), challengeNum = Math.floor((s.streak[pyrKey(s.lvl)] || 0) / STAGES), used = [];
      k.t = F.trainers.map(() => { let id, n = 0; do { id = randomTrainerId(challengeNum, Math.min(6, s.num)); } while (used.includes(id) && ++n < 50); used.push(id); return id; });
      k.i = F.items.map(pickupItem);
    }
    // The people on the floor, for the game to put on its map.
    function pyramidPeople() {
      const k = pyr();
      if (!k.t || !k.t.length && !k.i.length) return [];
      const F = pyramidLayout(), out = [];
      F.trainers.forEach((p, n) => {
        const t = trainerOf({ kind: "frontier", id: k.t[n] });
        if (!t) return;
        out.push({ id: 960 + n, localId: "PYRAMID_T" + n, script: "Game_EventScript_PyramidTrainer", x: p.x, y: p.y, movement: "face_" + p.facing, rangeX: 0, rangeY: 0, flag: null, text: null,
          pyramid: n, look: t.look, pic: t.pic, className: className(t.cls), name: t.name,
          trainer: { id: "PYRAMID_T" + n, sight: 4, intro: [t.before || "…"], defeat: [t.lose || "…"], after: [t.win || "…"] } });
      });
      F.items.forEach((p, n) => out.push({ id: 980 + n, localId: "PYRAMID_I" + n, script: "Game_EventScript_PyramidItem", x: p.x, y: p.y, movement: "face_down", rangeX: 0, rangeY: 0,
        item: k.i[n], flag: "PYRAMID_I" + n, text: null, sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true }));
      return out;
    }
    // A trainer's battle on the floor.
    function pyramidTrainer(n) {
      const s = S(), k = pyr(), id = k.t[n], t = trainerOf({ kind: "frontier", id });
      if (!t) return null;
      s.A = { kind: "frontier", id };
      const foe = pickMons(D().mons, D().heldItems, t.set, 3, foeLevel(), fixedIv(id), s.lvl !== 0);
      return { team: s.team, foe: { name: fullName(t), team: foe, pic: t.pic }, defeatText: [t.lose || "…"] };
    }
    // What a beaten trainer lets on: the way out, or how many are left (src/battle_pyramid.c's hints, in fewer words).
    function pyramidHint(n, at) {
      const k = pyr(), F = pyramidLayout(), flags = P().flags;
      const trainers = F.trainers.filter((p, i) => !flags["PYRAMID_T" + i]).length, items = F.items.filter((p, i) => !flags["PYRAMID_I" + i]).length;
      const dx = F.exit.x - at.x, dy = F.exit.y - at.y, dist = Math.abs(dx) + Math.abs(dy);
      const dir = (dy < -3 ? "north" : dy > 3 ? "south" : "") + (dx < -3 ? "west" : dx > 3 ? "east" : "") || "right here";
      const plural = (c, w) => c + " " + w + (c === 1 ? "" : "s");
      const left = [n % 2 ? "There " + (items === 1 ? "is" : "are") + " " + plural(items, "item") + " still lying around on this floor." : plural(trainers, "trainer") + " " + (trainers === 1 ? "is" : "are") + " still left on this floor."];
      const kind = (n + k.seed[0]) % 3;
      if (kind === 0) return dist < 8 ? "The exit is very close by!" : "The exit is somewhere to the " + dir + ".";
      return kind === 1 ? left[0] : (dist < 16 ? "The exit is not far to the " + dir + ".\n" : "") + left[0];
    }
    const pyramidDark = () => { const k = pyr(); return k.light > 0 ? { radius: k.light, lights: [], rects: [] } : null; };
    // The challenge's Pokémon and bag stand in for yours.
    function pyramidParty(n) {
      const s = S(), k = pyr(), bags = s.pyrBags || (s.pyrBags = {});
      if (!k.swapped) {
        buildTeam(n);
        k.realParty = P().party; k.realBag = P().bag; k.swapped = true;
        if (!bags[s.lvl]) bags[s.lvl] = { "hyper-potion": 1, ether: 1 };
      }
      P().party = s.team; P().bag = bags[s.lvl];
    }
    function pyramidRestore() {
      const k = pyr();
      if (!k.swapped) return;
      if (k.realParty) P().party = k.realParty;
      if (k.realBag) P().bag = k.realBag;
      k.swapped = false; k.realParty = null; k.realBag = null;
    }
    function pyramidWild(mon) {
      const s = S(), Y = PY(), list = (s.lvl === 0 ? Y.wild50 : Y.wildOpen)[pyrRound()] || Y.wild50[0], e = list[int(list.length)];
      const level = s.lvl === 0 ? e.lvl - 5 + int(11) : Math.max(2, highest(s.team) - e.lvl - 5 + int(11));
      return Object.assign({}, mon, { species: e.species, level, moves: e.moves });
    }
    async function pyramid(name, a, api) {
      const s = S(), k = pyr(), what = name.slice(8), d = String(a[0] || "");
      switch (what) {
        case "init": {
          pyramidRestore();
          const lvl = s.lvl;
          s.status = 0; s.num = 0; s.paused = 0; s.A = null; s.outcome = 0;
          if (!s.active[pyrKey(lvl)]) { s.streak[pyrKey(lvl)] = 0; (s.pyrBags || (s.pyrBags = {}))[lvl] = { "hyper-potion": 1, ether: 1 }; }
          if (env.markHome) env.markHome();
          return true;
        }
        case "get": {
          const lvlOf = (x) => (/_OPEN$/.test(x) ? 1 : /_50$/.test(x) ? 0 : s.lvl), kk = pyrKey(lvlOf(d));
          const r = /PRIZE$/.test(d) ? "ITEM_NONE" : /WIN_STREAK_ACTIVE/.test(d) ? (s.active[kk] ? 1 : 0) : /WIN_STREAK/.test(d) ? s.streak[kk] || 0 : 0;
          api.setVar("VAR_RESULT", r);
          return true;
        }
        case "set": {
          const val = a.length > 1 ? api.num(a[1]) : v("VAR_0x8006"), kk = pyrKey(s.lvl);
          if (/TRAINER_FLAGS$/.test(d)) { for (let i = 0; i < 8; i++) if (val) P().flags["PYRAMID_T" + i] = true; }
          else if (/WIN_STREAK_ACTIVE/.test(d)) { if (val) s.active[kk] = true; else delete s.active[kk]; }
          else if (/WIN_STREAK/.test(d)) { s.streak[kk] = val; if (val > (s.best[kk] || 0)) s.best[kk] = val; }
          return true;
        }
        case "save": s.status = api.num(a[0]); s.paused = 1; api.setVar("VAR_TEMP_CHALLENGE_STATUS", 0); await env.save(s.status === 2); return true;
        case "setprize": return true;
        case "seedfloor": seedFloor(); return true;
        case "settrainers": case "resetparty": case "setitem": case "hideitem": return true;
        case "showhint": return true;
        case "getlocation": { const m = env.map ? env.map() : ""; api.setVar("VAR_RESULT", m === FLOOR_MAP ? 1 : m === TOP_MAP ? 2 : 0); return true; }
        case "updatelight": {
          const r = api.num(a[0]), incr = /INCR/.test(String(a[1])) || String(a[1]) === "1";
          k.light = incr ? Math.min(120, k.light + r) : r;
          // (A new floor's walls go up as it's lit: the map's scripts do this as it loads, before the game says which map it's on.)
          if (!incr && r > 0 && r < 200 && env.pyramidApply) env.pyramidApply();
          if (incr) api.setVar("VAR_RESULT", 2);
          return true;
        }
        case "clearhelditems": pyramidRestore(); return true;
        case "setfloorpal": if (env.pyramidApply) env.pyramidApply(); return true;
      }
      return false;
    }

    // ---------- The tents ----------
    const tentOf = () => ({ 4: "slateport", 2: "verdanturf", 3: "fallarbor" })[fac()];
    async function tent(name, a, api) {
      const s = S(), t = /^(slateport|verdanturf|fallarbor)/.exec(name), which = t ? t[1] : tentOf(), what = name.replace(/^(slateport|verdanturf|fallarbor)tent_|^battletent_/, "");
      switch (what) {
        case "init": s.status = 0; s.num = 0; s.paused = 0; s.ids = []; s.A = null; s.rent = []; s.foe = []; if (env.markHome) env.markHome(); return true;
        case "getprize": api.setVar("VAR_RESULT", (s.prize[which] && env.itemConst(s.prize[which])) || "ITEM_NONE"); return true;
        case "setrandomprize": s.prize[which] = TENT_PRIZES[which]; return true;
        case "giveprize": {
          const id = s.prize[which], ok = id && (await env.giveItem(id));
          if (ok) { api.setBuffer(1, env.itemName(id)); s.prize[which] = ""; }
          api.setVar("VAR_RESULT", ok ? 1 : 0);
          return true;
        }
        case "save": {
          s.status = api.num(a[0]);
          api.setVar("VAR_TEMP_CHALLENGE_STATUS", 0);
          s.paused = 1;
          await env.save(s.status === 2);
          return true;
        }
        case "getopponentintro": { const tr = trainerOf(s.A); if (tr && tr.before) await env.say(tr.before); return true; }
        case "getopponentname": { const tr = trainerOf(s.A); api.setBuffer(1, tr ? tr.name : ""); return true; }
        case "setopponentgfx": {
          const id = int(D().tents[which].trainers.length);
          s.A = { kind: "tent", tent: which, id };
          api.setVar("VAR_OBJ_GFX_ID_0", trainerOf(s.A).look);
          return true;
        }
        case "generaterentalmons": case "generateopponentmons": case "rentmons": case "swapmons":
          return factoryLike(which, what, a, api);
      }
      return false;
    }

    // ---------- Rental Pokémon (the Slateport Tent's; the Factory's) ----------
    // The six to choose from, and the opponent's three; you choose three on the Factory's rental screen, with a Summary
    // of each (ui/hoenn-frontier-screens.js), and after a win its swap screen trades one of yours for one of the opponent's.
    const rentalCard = (r) => Party_name(r) + "  Lv." + r.level + (r.item ? "  holding " + env.itemName(r.item) : "") + "\n" + r.moves.map((m) => m.name).join(", ");
    const factoryIv = (challengeNum, last) => { const t = D().factory.ivs; return t[Math.min(challengeNum, t.length - 1)][last ? 1 : 0]; };
    function factoryMonId(lvl, challengeNum, better) {
      const r = D().factory.ranges, add = lvl === 0 ? 0 : 8, i = add + (challengeNum < 7 ? challengeNum + (better ? 1 : 0) : 7), [lo, hi] = r[Math.min(i, add + 7)];
      return lo + int(hi - lo + 1);
    }
    const pastRentsRank = (n) => (n < 15 ? 0 : n < 22 ? 1 : n < 29 ? 2 : n < 36 ? 3 : n < 43 ? 4 : 5);
    async function factoryLike(which, what, a, api) {
      const s = S(), tentData = which ? D().tents[which] : null, lvl = foeLevel(), tentMode = !!tentData;
      const mons = tentMode ? tentData.mons : D().mons, challengeNum = Math.floor(streak() / STAGES);
      switch (what) {
        case "generaterentalmons": {
          const seen = new Set(), items = new Set(), ids = [], rank = tentMode ? 0 : pastRentsRank(s.rents[curKey()] || 0);
          for (let tries = 0; ids.length < 6 && tries < 4000; tries++) {
            const id = tentMode ? int(mons.length) : factoryMonId(s.lvl === 0 ? 0 : 1, challengeNum, ids.length < rank), m = mons[id];
            if (!m || ids.includes(id) || m.species === "Unown") continue;
            const it = m.item ? D().heldItems[m.item] : "";
            if (seen.has(m.species) || (it && items.has(it))) continue;
            seen.add(m.species); if (it) items.add(it); ids.push(id);
          }
          s.rent = ids.map((id, i) => monFrom(mons[id], lvl, tentMode ? 0 : factoryIv(challengeNum + (i < rank ? 1 : 0), false)));
          return true;
        }
        case "generateopponentmons": {
          let tid;
          if (tentMode) {
            do { tid = int(tentData.trainers.length); } while (s.ids.slice(0, s.num).includes(tid) || tentData.trainers[tid].set.length < 9);
            s.A = { kind: "tent", tent: which, id: tid };
            if (s.num < TENT_STAGES - 1) s.ids[s.num] = tid;
          } else {
            do { tid = randomTrainerId(challengeNum, s.num); } while (s.ids.slice(0, s.num).includes(tid));
            s.A = { kind: "frontier", id: tid };
            if (s.num < STAGES - 1) s.ids[s.num] = tid;
          }
          const mine = new Set(s.rent.map((r) => r.species)), n = 3, out = [], used = new Set(), items = new Set();
          for (let tries = 0; out.length < n && tries < 4000; tries++) {
            const id = tentMode ? tentData.trainers[tid].set[int(tentData.trainers[tid].set.length)] : factoryMonId(s.lvl === 0 ? 0 : 1, challengeNum, false), m = mons[id];
            if (!m || m.species === "Unown" || mine.has(m.species) || used.has(m.species) || (!tentMode && s.lvl === 0 && id > D().highTier)) continue;
            const it = m.item ? D().heldItems[m.item] : "";
            if (it && items.has(it)) continue;
            used.add(m.species); if (it) items.add(it);
            out.push(monFrom(m, lvl, tentMode ? 0 : factoryIv(challengeNum, s.num === STAGES - 1)));
          }
          s.foe = out;
          return true;
        }
        case "rentmons": case "swapmons": return rentScreen(what, api, s.rent, s);
      }
      return false;
    }
    async function rentScreen(what, api, pool, s) {
      // (Emerald's own screens, ui/hoenn-frontier-screens.js, where the game gives them; else read out and picked from.)
      if (what === "rentmons" && env.factorySelect) {
        const chosen = await env.factorySelect(pool);
        s.team = chosen.map((i) => clone(pool[i]));
        s.items = s.team.map((r) => r.item);
        return true;
      }
      if (what !== "rentmons" && env.factorySwap) {
        const sw = await env.factorySwap(s.team, s.foe);
        if (!sw) { api.setVar("VAR_RESULT", 1); return true; }
        s.team[sw.give] = clone(s.foe[sw.take]);
        window.Party.heal(s.team[sw.give]);
        s.items[sw.give] = s.team[sw.give].item;
        api.setVar("VAR_RESULT", 0);
        return true;
      }
      if (what === "rentmons") {
        await env.say(pool.map(rentalCard));
        const chosen = [];
        while (chosen.length < 3) {
          const left = pool.map((r, i) => i).filter((i) => !chosen.includes(i));
          const i = await env.pick("Rent the " + ["first", "second", "third"][chosen.length] + " POKéMON.", left.map((k) => Party_name(pool[k]) + " Lv." + pool[k].level));
          if (i >= 0) chosen.push(left[i]);
          else if (chosen.length) chosen.pop();
        }
        s.team = chosen.map((i) => clone(pool[i]));
        s.items = s.team.map((r) => r.item);
        return true;
      }
      // (Swap one of yours for one of the opponent's team just beaten: VAR_RESULT 1 to keep your team as it is.)
      await env.say(s.foe.map(rentalCard));
      const i = await env.pick("Give back which POKéMON?", s.team.map(Party_name).concat(["Keep my team"]));
      if (i < 0 || i >= s.team.length) { api.setVar("VAR_RESULT", 1); return true; }
      const j = await env.pick("Take which of the opponent's?", s.foe.map(Party_name));
      if (j < 0) { api.setVar("VAR_RESULT", 1); return true; }
      s.team[i] = clone(s.foe[j]);
      window.Party.heal(s.team[i]);
      s.items[i] = s.team[i].item;
      api.setVar("VAR_RESULT", 0);
      return true;
    }

    // ---------- Specials ----------
    async function special(name, api) {
      const s = S();
      switch (name) {
        case "ChoosePartyForBattleFrontier": {
          const lvl = v("VAR_0x8004"), max = v("VAR_0x8005");
          // (The Dome's rounds: two of the three you registered.)
          const among = fac() === FAC.DOME && s.status > 0 && (s.full || s.team).length ? (s.full || s.team) : null;
          const pick = await env.chooseParty({ max, lvlMode: lvl, party: among, check: (party, order, slot) => (among ? null : conflict(party, order, slot, lvl)) });
          if (!pick) { api.setVar("VAR_RESULT", 0); return true; }
          s.pending = pick; api.setVar("VAR_RESULT", 1);
          return true;
        }
        case "DoSpecialTrainerBattle": await battleSpecial(api); return true;
        case "CallFrontierUtilFunc": {
          const OPS = ["frontier_getstatus", "frontier_get", "frontier_set", "frontier_setpartyorder", "frontier_reset", "frontier_settrainers", "frontier_saveparty",
            "frontier_results", "frontier_checkairshow", "frontier_getbrainstatus", "frontier_isbrain", "frontier_givepoints", "frontier_getsymbols", "frontier_givesymbol",
            "frontier_isbattletype", "frontier_checkineligible", "frontier_checkvisittrainer", "frontier_incrementstreak", "frontier_restorehelditems", "frontier_savebattle",
            "frontier_gettrainername", "frontier_resetsketch", "frontier_setbrainobj"];
          const f = v("VAR_0x8004"), args = f === 1 || f === 2 ? [v("VAR_0x8005")] : f === 3 ? [v("VAR_0x8005")] : f === 7 ? [v("VAR_0x8005"), v("VAR_0x8006")] : f === 20 ? [v("VAR_0x8005")] : [];
          if (f === 2) args.push(v("VAR_0x8006"));
          if (f === 14) return op("frontier_isbattletype", [], api);
          return op(OPS[f], args, api);
        }
        // Battle Points.
        case "GetFrontierBattlePoints": api.set(s.bp); return true;
        case "TakeFrontierBattlePoints": s.bp = Math.max(0, s.bp - v("VAR_0x8004")); return true;
        case "GiveFrontierBattlePoints": s.bp = Math.min(MAX_BP, s.bp + v("VAR_0x8004")); return true;
        case "ShowBattlePointsWindow": case "UpdateBattlePointsWindow": env.bpBox(true, s.bp); return true;
        case "CloseBattlePointsWindow": env.bpBox(false); return true;
        case "ShowFrontierExchangeCornerItemIconWindow": case "CloseFrontierExchangeCornerItemIconWindow": return true;
        case "ReducePlayerPartyToSelectedMons": case "CloseLink": case "SaveForBattleTowerLink": return true;
        // The Pyramid: your own Pokémon and bag come back; the challenge's items aren't ones to hand over.
        case "LoadPlayerParty": pyramidRestore(); return true;
        case "DoBattlePyramidMonsHaveHeldItem": case "TryStoreHeldItemsInPyramidBag": api.set(0); return true;
        case "BattlePyramidChooseMonHeldItems": case "ChooseItemsToTossFromPyramidBag": return true;
        case "GetBattlePyramidHint": api.set(Math.floor(v("VAR_0x8004") / STAGES) % 20); return true;
        case "CallBattlePyramidFunction": {
          // (Only the light's: the rest are the pyramid_ commands.)
          if (v("VAR_0x8004") !== 13) return false;
          const k = pyr();
          if (v("VAR_0x8006") === 1) { k.light = Math.min(120, k.light + v("VAR_0x8005")); api.setVar("VAR_RESULT", 2); } else k.light = v("VAR_0x8005");
          return true;
        }
      }
      return false;
    }

    // ---------- Battles ----------
    async function battleSpecial(api) {
      const s = S(), kind = v("VAR_0x8004"), f = fac(), m = mode(), t = trainerOf(s.A);
      if (!t) { api.setVar("VAR_RESULT", 1); return; }
      const level = foeLevel(), tentMode = s.A.kind === "tent", tbl = tentMode ? D().tents[s.A.tent] : D();
      let foe;
      if (t.brain) {
        if (f === FAC.FACTORY) {
          const challengeNum = Math.floor(streak() / STAGES), pool = [];
          for (let tries = 0; pool.length < 3 && tries < 4000; tries++) {
            const id = factoryMonId(s.lvl === 0 ? 0 : 1, challengeNum, true), mm = D().mons[id];
            if (mm && mm.species !== "Unown" && !pool.some((r) => r.species === mm.species)) pool.push(monFrom(mm, level, factoryIv(challengeNum + 2, false)));
          }
          foe = pool;
        } else foe = D().brain[f][symbolBrain()].map((bm) => brainMon(bm, level));
      } else if (kind === 6 || kind === 3) foe = s.foe.map(clone);
      else if (kind === 7 || kind === 9) foe = pickMons(D().mons, D().heldItems, t.set, kind === 9 ? 2 : 3, level, fixedIv(s.A.id), s.lvl !== 0);
      else {
        const n = f === FAC.TOWER ? (m === 1 ? 4 : m >= 2 ? 2 : 3) : 3;
        foe = pickMons(tbl.mons, D().heldItems, t.set, n, level, tentMode ? 0 : fixedIv(s.A.id), s.lvl !== 0);
      }
      const spec = { team: s.team, foe: { name: fullName(t), team: foe, pic: t.pic }, defeatText: t.lose ? [t.lose] : ["…"], double: m === 1 || kind === 9,
        // (The Arena's three-turn bouts and judging, the Verdanturf tent's too; the Palace's Pokémon choosing their own moves, the Fallarbor tent's too: engine/battle.js.)
        arena: tentMode ? s.A.tent === "verdanturf" : f === FAC.ARENA, palace: tentMode ? s.A.tent === "fallarbor" : f === FAC.PALACE };
      if (kind === 9) {
        const t2 = trainerOf(s.B);
        spec.foe2 = { name: fullName(t2), team: pickMons(D().mons, D().heldItems, t2.set, 2, level, fixedIv(s.B.id), s.lvl !== 0), pic: t2.pic, defeatText: t2.lose ? [t2.lose] : ["…"] };
        spec.partner = null;
      }
      if (m >= 2 && f === FAC.TOWER) {
        const t2 = trainerOf(s.B);
        spec.foe2 = { name: fullName(t2), team: pickMons(D().mons, D().heldItems, t2.set, 2, level, fixedIv(s.B.id), s.lvl !== 0), pic: t2.pic, defeatText: t2.lose ? [t2.lose] : ["…"] };
        spec.foe.team = spec.foe.team.slice(0, 2);
        const pid = s.partner != null ? s.partner : s.cand && s.cand[0], pt = D().trainers[pid];
        spec.partner = { name: className(pt.cls) + " " + pt.name, team: pickMons(D().mons, D().heldItems, pt.set, 2, level, fixedIv(pid), s.lvl !== 0), pic: pt.pic };
        spec.double = true;
      }
      const outcome = await env.battle(spec);
      s.outcome = outcome === "won" ? 1 : 2;
      api.setVar("VAR_RESULT", s.outcome);
    }

    // ---------- Records ----------
    async function results(facility, m) {
      const s = S(), lines = [];
      const names = ["Singles", "Doubles", "Multis", "Link Multis"];
      lines.push(FACILITY_NAMES[facility] + (facility === FAC.TOWER || facility === FAC.DOME || facility === FAC.PALACE || facility === FAC.FACTORY ? " — " + names[m] : ""));
      for (const lvl of [0, 1]) {
        const k = key(facility, m, lvl);
        lines.push((lvl ? "Open Level" : "Level 50") + ":  now " + (s.streak[k] || 0) + ",  best " + (s.best[k] || 0));
      }
      await env.say(lines.join("\n"));
    }

    return { op, special, state: S, healTeam, pikeWild, FAC, pyramidLayout, pyramidPeople, pyramidTrainer, pyramidHint, pyramidDark, pyramidWild, pyramidRestore };
  }

  window.HoennFrontier = { create, FAC };
})();
