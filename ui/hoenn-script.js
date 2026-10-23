// Pokémon Emerald's field scripts, run (tools/lib/emerald-script.js compiles them into
// data/emerald-maps.js, window.HOENN_SCRIPTS): what Hoenn's people say and do, its
// signs, the scenes its map steps start, and its maps' own scripts. ui/game.js gives
// it the game to work with (an env, below) and runs a script with run().
//
//   const H = HoennScript.create(env);
//   H.scriptOf(personOrSignOrTrigger)  // a label a map thing runs, or null
//   await H.run(label, { person })
//   H.transition(map)                  // entering a map: its OnTransition and OnLoad scripts (flags, vars, metatiles only)
//   H.frameScript(map, viaWarp)        // a frame table's script due now (a label), or null
//   H.triggerDue(script)               // a step's script ("hoenn:Label"): is its var at its value?
//   H.flag(name) / H.setFlag(name, on) / H.getVar(name) / H.setVar(name, value)
//
// Emerald's flags and vars live in player.flags.hoenn ({ f, v }); the temporary ones
// (FLAG_TEMP_*, VAR_TEMP_*) until you leave the map, the "special" vars (VAR_0x8000
// and on, VAR_RESULT, VAR_FACING, VAR_LAST_TALKED) only for the script. The flags
// Emerald's new game sets (EventScript_ResetAllMapFlags: who is hidden until the
// story gets to them) are set the first time.
//
// env: player(), map(), say(pages), confirm(page), choose(texts, question), close(),
//   facePlayer(person), act(tracks), show(id), hide(id), place(id, x, y, facing),
//   personAt(id), giveItem(id, n, verb), hasItem(id, n), takeItem(id, n), itemCount(id),
//   itemName(id), cry(species), fade(out, white), trainerBattle(id, opts), wildBattle(species, level, item),
//   warp(map, x, y, facing, how), giveMon(species, level, item), giveEgg(species),
//   mart(stock), healParty(), money(), addMoney(n), music(song), fanfare(song), se(name),
//   shake(n, opts), sleep(ms), isGirl(), choosePartyMon(message), nickname(i), badge(n, on) / hasBadge(n),
//   starterPick(), setMetatile(map, x, y, id, impassable), save(), respawn(where), pokedex(),
//   showPicture(species) / hidePicture(), moneyBox(on), special(name, args) (the game's own specials).
(function () {
  "use strict";

  const DATA = () => window.HOENN_SCRIPTS || { s: {}, t: {}, m: {}, tb: {}, ms: {}, maps: {}, heal: {}, multi: {}, init: [] };
  const DIRS = { DIR_SOUTH: "down", DIR_NORTH: "up", DIR_WEST: "left", DIR_EAST: "right", 1: "down", 2: "up", 3: "left", 4: "right" };
  const DIR_NUM = { down: 1, up: 2, left: 3, right: 4 };
  const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  // Emerald's constants a script writes by name, as numbers.
  const CONSTS = { TRUE: 1, FALSE: 0, YES: 1, NO: 0, MALE: 0, FEMALE: 1, NULL: 0, LOCALID_NONE: 0, OBJ_EVENT_ID_PLAYER: 255, OBJ_EVENT_ID_CAMERA: 127,
    PLAYER_HAS_TWO_USABLE_MONS: 1, PLAYER_HAS_ONE_MON: 2, PLAYER_HAS_NO_MONS: 0, MULTI_B_PRESSED: 127, PARTY_SIZE: 6, DIR_NONE: 0,
    FANFARE_GREEN: 0 };
  const COND = { 0: (c) => c < 0, 1: (c) => c === 0, 2: (c) => c > 0, 3: (c) => c <= 0, 4: (c) => c >= 0, 5: (c) => c !== 0,
    lt: (c) => c < 0, eq: (c) => c === 0, gt: (c) => c > 0, le: (c) => c <= 0, ge: (c) => c >= 0, ne: (c) => c !== 0 };
  // (Emerald's field gear: the badge flags and the badges they give, in Emerald's order.)
  const BADGES = ["stone", "knuckle", "dynamo", "heat", "balance", "feather", "mind", "rain"];
  // A move or a species by Emerald's constant.
  let dexIDs = null, moveIDs = null, itemIDs = null;
  function species(x) {
    if (typeof x !== "string") return x;
    if (!dexIDs) { dexIDs = {}; for (const k of Object.keys(window.DEX)) if (window.DEX[k].id < 10000) dexIDs[toID(k)] = k; }
    return dexIDs[toID(x.replace(/^SPECIES_/, ""))] || null;
  }
  function move(x) {
    if (typeof x !== "string") return x;
    if (!moveIDs) { moveIDs = {}; for (const k of Object.keys(window.MOVES)) moveIDs[toID(k)] = k; }
    return moveIDs[toID(x.replace(/^MOVE_/, ""))] || null;
  }
  // (Emerald's TMs and HMs are numbered as Gen 3's: this game's, by the move: ITEM_TM27_RETURN is whichever machine teaches Return.)
  let machines = null;
  function machine(moveName) {
    if (!machines) { machines = {}; for (const [id, it] of Object.entries(window.ITEMS)) { const m = it.category === "all-machines" && /^Teaches (.+?) to a compatible/.exec(it.effect || ""); if (m) machines[toID(m[1])] = id; } }
    return machines[toID(moveName)] || null;
  }
  // (Emerald's names for what this game calls otherwise: both its bikes are the Bicycle here.)
  const ITEM_ALIASES = { ITEM_MACH_BIKE: "bicycle", ITEM_ACRO_BIKE: "bicycle", ITEM_X_SPECIAL: "x-sp-atk", ITEM_X_DEFEND: "x-defense" };
  function item(x) {
    if (typeof x !== "string") return x;
    if (ITEM_ALIASES[x]) return ITEM_ALIASES[x];
    { const m = /^ITEM_(?:TM|HM)(?:\d+)?_(\w+)$/.exec(x); if (m) return machine(m[1]); }
    const k = x.replace(/^ITEM_/, "").toLowerCase().replace(/_/g, "-");
    if (window.ITEMS[k]) return k;
    if (!itemIDs) { itemIDs = {}; for (const i of Object.keys(window.ITEMS)) itemIDs[toID(i)] = i; }
    return itemIDs[toID(k)] || null;
  }
  const titleCase = (s) => String(s).toLowerCase().replace(/(^|[_ ])(\w)/g, (m, u, c) => (u ? " " : "") + c.toUpperCase());

  function create(env) {
    const temp = { f: {}, v: {}, obj: {}, mov: {}, pos: {} };
    // (The vars a script uses between its own commands: VAR_RESULT, VAR_0x8000 ...)
    const local = {};
    const state = () => {
      const p = env.player();
      const s = p.flags.hoenn || (p.flags.hoenn = { f: {}, v: {}, pos: {}, mov: {} });
      if (!s.init) {
        s.init = true;
        for (const [cmd, name, val] of DATA().init) {
          if (cmd === "setflag") s.f[name] = true;
          else if (cmd === "clearflag") delete s.f[name];
          else if (cmd === "setvar") s.v[name] = val;
        }
      }
      return s;
    };
    const isTempFlag = (n) => /^FLAG_TEMP_/.test(n);
    const isTempVar = (n) => /^VAR_TEMP_/.test(n);
    const isLocalVar = (n) => /^VAR_(0x8\w+|RESULT|FACING|LAST_TALKED|LAST_PLAYED|ITEM_ID|PLAYER_FACING|MAP_CONTEXT|SPECIAL_\w+|TRAINER_BATTLE_OPPONENT_A)$/.test(n) && n !== "VAR_SPECIAL_RESULT_PERSIST";
    const flag = (n) => (isTempFlag(n) ? !!temp.f[n] : !!state().f[n]);
    function setFlag(n, on) {
      const o = isTempFlag(n) ? temp.f : state().f;
      if (on) o[n] = true; else delete o[n];
      // (A Gym's flag is its Badge.)
      const b = /^FLAG_BADGE0(\d)_GET$/.exec(n);
      if (b && env.badge) env.badge(+b[1] - 1, on);
      if (env.onFlag) env.onFlag(n, !!on);
    }
    function getVar(x) {
      if (typeof x === "number") return x;
      if (typeof x !== "string") return 0;
      if (/^VAR_/.test(x)) {
        if (isLocalVar(x)) return local[x] == null ? 0 : local[x];
        const o = isTempVar(x) ? temp.v : state().v;
        return o[x] == null ? 0 : o[x];
      }
      if (x in CONSTS) return CONSTS[x];
      { const n = DATA().numConsts; if (n && x in n) return n[x]; }
      return x;
    }
    function setVar(n, val) {
      if (typeof n !== "string" || !/^VAR_/.test(n)) return;
      val = typeof val === "boolean" ? +val : val;
      if (isLocalVar(n)) local[n] = val; else (isTempVar(n) ? temp.v : state().v)[n] = val;
    }
    const resetTemp = () => { temp.f = {}; temp.v = {}; temp.obj = {}; temp.mov = {}; temp.pos = {}; };
    // (Where a script put someone, this visit: setobjectxy; or for good: setobjectxyperm.)
    const placed = (map, id) => (temp.pos[map + ":" + id]) || (state().pos[map + ":" + id]) || null;
    const movement = (map, id) => temp.mov[map + ":" + id] || state().mov[map + ":" + id] || null;
    const shown = (map, id) => (temp.obj[map + ":" + id]);

    // ---------- Text ----------
    const buffers = {};
    const rivalName = () => (env.isGirl() ? "Brendan" : "May");
    const fill = (s) => s.replace(/\{STR_VAR_(\d)\}/g, (m, n) => (buffers[n] != null ? buffers[n] : "")).replace(/\{RIVAL\}/g, rivalName());
    const pagesOf = (label) => {
      const t = DATA().t[label];
      return t && t.length ? t.map(fill) : null;
    };

    // ---------- Who a script means ----------
    const mapName = () => env.map();
    const peopleHere = () => (window.WORLD_MAPS[mapName()] || { people: [] }).people;
    // A local id (a LOCALID_ name, a number, or the player's 255) as the overworld's name for them.
    function who(x) {
      // (VAR_LAST_TALKED: who a script set there, or else who you last spoke to.)
      const named = x === "VAR_LAST_TALKED" || x === "LOCALID_LAST_TALKED";
      x = getVar(x);
      if (named && !x) return lastTalked;
      if (x === "OBJ_EVENT_ID_PLAYER" || x === "LOCALID_PLAYER" || x === 255) return "player";
      if (x === "VAR_LAST_TALKED" || x === "LOCALID_LAST_TALKED") return lastTalked;
      if (typeof x === "number") { const p = peopleHere().find((q) => q.id === x - 1); return p ? (p.localId || "#" + p.id) : null; }
      return x;
    }
    let lastTalked = null;

    // ---------- Running a script ----------
    // The flow commands, on a script's state { code, pc, cmp, sw, stack }: true if `op` was one.
    function flow(st, op, a) {
      const D = DATA();
      const go = (l) => { if (D.s[l]) { st.code = D.s[l]; st.pc = 0; } };
      const call = (l) => { if (D.s[l]) { st.stack.push([st.code, st.pc]); st.code = D.s[l]; st.pc = 0; } };
      const cmpTo = (x, y) => {
        x = getVar(x); y = getVar(y);
        if (typeof x === "string" || typeof y === "string") return String(x) === String(y) ? 0 : 1;
        return x < y ? -1 : x > y ? 1 : 0;
      };
      let m;
      switch (op) {
        case "end": case "endram": st.done = true; return true;
        case "return": case "returnram": if (!st.stack.length) st.done = true; else [st.code, st.pc] = st.stack.pop(); return true;
        case "goto": case "vgoto": go(a[0]); return true;
        case "call": case "vcall": call(a[0]); return true;
        case "goto_if": if (COND[a[0]] && COND[a[0]](st.cmp)) go(a[1]); return true;
        case "call_if": if (COND[a[0]] && COND[a[0]](st.cmp)) call(a[1]); return true;
        case "goto_if_set": case "vgoto_if_set": if (flag(a[0])) go(a[1]); return true;
        case "goto_if_unset": case "vgoto_if_unset": if (!flag(a[0])) go(a[1]); return true;
        case "call_if_set": if (flag(a[0])) call(a[1]); return true;
        case "call_if_unset": if (!flag(a[0])) call(a[1]); return true;
        case "goto_if_defeated": if (env.beaten("EM_" + a[0])) go(a[1]); return true;
        case "goto_if_not_defeated": if (!env.beaten("EM_" + a[0])) go(a[1]); return true;
        case "call_if_defeated": if (env.beaten("EM_" + a[0])) call(a[1]); return true;
        case "call_if_not_defeated": if (!env.beaten("EM_" + a[0])) call(a[1]); return true;
        case "switch": st.sw = getVar(a[0]); return true;
        case "case": if (st.sw === getVar(a[0])) go(a[1]); return true;
        case "compare": case "compare_var_to_value": case "compare_var_to_var": st.cmp = cmpTo(a[0], a[1]); return true;
        case "nop": case "nop1": return true;
      }
      if ((m = /^(v?goto|call)_if_(lt|eq|gt|le|ge|ne)$/.exec(op))) {
        // (goto_if_eq VAR, value, label; or, after a compare, goto_if_eq label.)
        let ok, dest;
        if (a.length >= 3) { ok = COND[m[2]](cmpTo(a[0], a[1])); dest = a[2]; } else { ok = COND[m[2]](st.cmp); dest = a[0]; }
        if (ok) { if (m[1] === "call") call(dest); else go(dest); }
        return true;
      }
      return false;
    }
    const num = (x) => +getVar(x) || 0;
    // The commands that only change flags, vars and what's on the map: the same whether a scene's on or not.
    function simple(st, op, a) {
      switch (op) {
        case "setvar": setVar(a[0], getVar(a[1])); return true;
        case "addvar": setVar(a[0], num(a[0]) + num(a[1])); return true;
        case "subvar": setVar(a[0], num(a[0]) - num(a[1])); return true;
        case "copyvar": case "setorcopyvar": setVar(a[0], getVar(a[1])); return true;
        case "setflag": setFlag(a[0], true); return true;
        case "clearflag": setFlag(a[0], false); return true;
        case "checkflag": st.cmp = flag(a[0]) ? 0 : 1; return true;
        case "random": setVar("VAR_RESULT", Math.floor(Math.random() * Math.max(1, num(a[0])))); return true;
        case "checkplayergender": setVar("VAR_RESULT", env.isGirl() ? 1 : 0); return true;
        case "setobjectxyperm": { const w = who(a[0]); if (w && w !== "player") state().pos[mapName() + ":" + w] = { x: num(a[1]), y: num(a[2]) }; return true; }
        case "setobjectxy": { const w = who(a[0]); if (w && w !== "player") temp.pos[mapName() + ":" + w] = { x: num(a[1]), y: num(a[2]) }; return true; }
        case "setobjectmovementtype": { const w = who(a[0]); if (w) state().mov[mapName() + ":" + w] = String(a[1]).replace(/^MOVEMENT_TYPE_/, "").toLowerCase(); return true; }
        case "setmetatile": env.setMetatile(mapName(), num(a[0]), num(a[1]), a[2], !!num(a[3])); return true;
        case "incrementgamestat": case "setstepcallback": case "setflashlevel": case "animateflash": case "doweather":
        case "resetweather": case "setobjectsubpriority": case "resetobjectsubpriority": case "setworldmapflag":
        case "initclock": case "dotimebasedevents": case "setvaddress": case "loadhelp": case "unloadhelp": case "textcolor": case "signmsg": case "normalmsg":
        case "setmonmetlocation": case "setmodernfatefulencounter": case "trywondercardscript": case "dofieldeffectsparkle": case "callnative": case "gotonative":
        case "waitstate": case "waitbuttonpress": case "waitmessage": case "waitse": case "waitfanfare": case "waitfieldeffect": case "waitdooranim": case "waitmoncry":
        case "lockall": case "lock": case "releaseall": case "release": case "lockfortrainer": case "hideplayer": case "showplayer": case "createvobject": case "turnvobject":
        case "opendoor": case "closedoor": case "setdooropen": case "setdoorclosed": case "setfieldeffectargument": case "updatemoneybox":
        case "register_matchcall": case "pokenavcall": case "dotrainerbattle": case "gotopostbattlescript": case "gotobeatenscript": case "selectapproachingtrainer":
        case "braillemessage": case "braillemsgbox": case "closebraillemessage": case "brailleformat": case "setholewarp": case "setescapewarp":
          return true;
        case "setwarp": lastSetWarp = a.slice(); return true;
        case "setmaplayoutindex": if (env.setLayout) env.setLayout(mapName(), a[0]); return true;
        case "setweather": if (env.setWeather) env.setWeather(a[0]); return true;
        case "setdivewarp": fixedDive = { map: a[0], x: num(a[1]), y: num(a[2]) }; return true;
        case "setdynamicwarp": { const at = a.length >= 4 ? { x: num(a[2]), y: num(a[3]) } : { x: num(a[1]), y: num(a[2]) }; if (env.setDynamicWarp) env.setDynamicWarp(a[0], at.x, at.y); return true; }
        case "setrespawn": if (env.respawn) env.respawn(a[0]); return true;
        case "special": case "specialvar": { const name = op === "special" ? a[0] : a[1]; return syncSpecial(st, name, op === "specialvar" ? a[0] : null); }
        case "setberrytree": return true;
      }
      return false;
    }
    // The specials that need no screen.
    // How the last wild battle ended (B_OUTCOME_*: won 1, lost 2, ran 4, caught 7).
    let battleOutcome = 0, lastSetWarp = null;
    const OUTCOMES = { won: 1, lost: 2, ran: 4, caught: 7 };
    // (A special's answer goes to the var specialvar names; or, called with special, to VAR_RESULT if it's one of
    // Emerald's that set gSpecialVar_Result themselves: those whose callers read VAR_RESULT straight after (found in
    // the scripts once). Emerald drops the others' answers.)
    let resultSpecials = null;
    const writesResult = (name) => {
      if (!resultSpecials) {
        resultSpecials = new Set();
        const own = /^(setvar|copyvar|setorcopyvar|specialvar|checkitem|checkplayergender|checkpartymove|checkmoney|random|getpartysize|msgbox|yesnobox|multichoice\w*|dowildbattle|special)$/;
        for (const code of Object.values(DATA().s)) code.forEach((c, i) => {
          if (c[0] !== "special") return;
          for (let k = i + 1; k < Math.min(code.length, i + 3); k++) {
            if (own.test(code[k][0])) break;
            if (code[k].includes("VAR_RESULT")) { resultSpecials.add(c[1]); break; }
          }
        });
      }
      return resultSpecials.has(name);
    };
    const answer = (out, name) => (v) => { if (out) setVar(out, v); else if (writesResult(name)) setVar("VAR_RESULT", v); };
    function syncSpecial(st, name, out) {
      const set = answer(out, name);
      switch (name) {
        case "GetTrainerFlag": case "ShouldTryRematchBattle": case "IsTrainerReadyForRematch": case "GetLeadMonFriendshipScore": set(0); return true;
        case "GetBattleOutcome": set(battleOutcome); return true;
        case "BufferMonNickname": { const r = env.player().party[num("VAR_0x8004")]; if (r) buffers[1] = window.Party ? window.Party.displayName(r) : r.nickname || r.species; return true; }
        case "BufferTMHMMoveName": { const it = item(getVar("VAR_0x8004")); buffers[2] = (it && window.Bag && window.Bag.isMachine(it) && window.Bag.machineMove(it)) || ""; return true; }
        case "ScriptGetPartyMonSpecies": { const r = env.player().party[num("VAR_0x8004")]; set(r ? r.species : 0); return true; }
        case "IsSelectedMonEgg": { const r = env.player().party[num("VAR_0x8004")]; set(r && r.egg ? 1 : 0); return true; }
        case "CountPartyNonEggMons": case "CalculatePlayerPartyCount": set(env.player().party.filter((r) => !r.egg).length); return true;
        case "GetPlayerFacingDirection": set(DIR_NUM[(env.personAt("player") || {}).facing] || 1); return true;
        case "HasEnoughMonsForDoubleBattle": set(env.player().party.filter((r) => !r.egg && r.hp > 0).length >= 2 ? 1 : 0); return true;
        case "HealPlayerParty": env.healParty(); return true;
        case "GetPlayerBigGuyGirlString": buffers[1] = env.isGirl() ? "big girl" : "big guy"; return true;
        case "GetRivalSonDaughterString": buffers[1] = env.isGirl() ? "son" : "daughter"; return true;
        case "GetPlayerAvatarBike": set(0); return true;
        case "IsStarterInParty": {
          const family = [["Treecko", "Grovyle", "Sceptile"], ["Torchic", "Combusken", "Blaziken"], ["Mudkip", "Marshtomp", "Swampert"]][num("VAR_STARTER_MON")] || [];
          set(env.player().party.some((r) => family.includes(r.species)) ? 1 : 0); return true;
        }
        case "IsGrassTypeInParty": set(env.player().party.some((r) => !r.egg && ((window.DEX[r.species] || {}).types || []).includes("Grass")) ? 1 : 0); return true;
        case "CountPartyAliveNonEggMons": set(env.player().party.filter((r) => !r.egg && r.hp > 0).length); return true;
        case "SavePlayerParty": case "LoadPlayerParty": case "LoadWallyZigzagoon": case "SwapRegisteredBike": case "TurnOffTVScreen": case "TurnOnTVScreen": return true;
        case "DrawWholeMapView": case "PlayerFaceTrainerAfterBattle": case "SpawnCameraObject": case "RemoveCameraObject": case "ShowFieldMessageStringVar4": case "SetCB2WhiteOut": return true;
      }
      return env.syncSpecial ? !!env.syncSpecial(name, { set, setVar, getVar, local }) : false;
    }
    // A script that's run as a map loads: no screens, no waiting.
    function runSync(label) {
      const D = DATA(), st = { code: D.s[label], pc: 0, cmp: 0, sw: 0, stack: [] };
      if (!st.code) return;
      for (let guard = 0; guard < 20000 && !st.done; guard++) {
        if (st.pc >= st.code.length) { if (!st.stack.length) return; [st.code, st.pc] = st.stack.pop(); continue; }
        const [op, ...a] = st.code[st.pc++];
        if (!flow(st, op, a) && !simple(st, op, a) && env.frontierOp && FRONTIER_OPS.test(op)) {
          // (The Frontier's commands that only set vars and objects, as a room's OnTransition has them: done before they'd even wait.)
          env.frontierOp(op, a, { set() {}, setBuffer: (n, v) => { buffers[n] = v; }, setVar, getVar, num, local, flush: async () => {}, flag, setFlag, who });
        }
      }
    }
    const CONTEST_OPS = /^(choosecontestmon|startcontest|showcontestresults|buffercontestname|contestlinktransfer|showcontestpainting)$/;
    const FRONTIER_OPS = /^(frontier|tower|dome|palace|arena|factory|pike|pyramid|slateporttent|verdanturftent|fallarbortent|battletent|apprentice)_/;

    // `label`: a label of HOENN_SCRIPTS.s.
    async function run(label, ctx) {
      ctx = ctx || {};
      const D = DATA();
      const st = { code: D.s[label], pc: 0, cmp: 0, sw: 0, stack: [] };
      if (!st.code) return;
      let question = null, wildSpec = null, rot = null;
      const pending = [];
      const flush = async () => { if (pending.length) { const t = pending.splice(0); await env.act(t); } };
      const speak = async (pages) => { if (!pages) return; await flush(); await env.say(pages); };
      // (A `message` that's followed by yesnobox or a multichoice: its last page is the question.)
      const nextAsks = () => { const code = st.code; for (let k = st.pc; k < code.length && k < st.pc + 4; k++) { const o = code[k][0]; if (o === "yesnobox" || /^multichoice/.test(o)) return true; if (!/^(waitmessage|delay|playfanfare|waitfanfare)$/.test(o)) return false; } return false; };
      const val = getVar;
      const trainerKey = (t) => "EM_" + t;
      const beaten = (t) => env.beaten(trainerKey(t));
      // A trainer battle: the intro, the battle (the defeat text is its own), then on to `after` (or the next command).
      async function battle(t, intro, defeat, after, opts) {
        await flush();
        const id = trainerKey(t);
        if (beaten(t)) return;
        const data = window.WORLD_TRAINERS[id];
        if (opts && opts.music !== false && data && data.music) env.music(data.music);
        if (intro && D.t[intro]) await env.say(D.t[intro].map(fill));
        const outcome = await env.trainerBattle(id, { defeat: defeat && D.t[defeat] ? D.t[defeat].map(fill) : null, double: opts && opts.double });
        if (outcome === "lost") { st.done = true; return; }
        env.setBeaten(id, true);
        if (after && after !== "FALSE" && after !== 0 && D.s[after]) { st.code = D.s[after]; st.pc = 0; st.stack.length = 0; }
      }
      async function main() {
      for (let guard = 0; !st.done && guard < 200000; guard++) {
        if (st.pc >= st.code.length) { if (!st.stack.length) break; [st.code, st.pc] = st.stack.pop(); continue; }
        const [op, ...a] = st.code[st.pc++];
        if (window.HOENN_TRACE) window.HOENN_TRACE.push(op + " " + a.join(","));
        if (flow(st, op, a)) continue;
        // (Someone put on a tile: set down there at once, as well as remembered.)
        if (op === "setobjectxy" || op === "setobjectxyperm") {
          const w = who(a[0]);
          if (w === "player") { await flush(); env.moveTo(num(a[1]), num(a[2])); }
          else if (w) { simple(st, op, a); await flush(); env.place(w, num(a[1]), num(a[2]), null); }
          continue;
        }
        if (op === "callstd" || op === "gotostd" || op === "callstd_if" || op === "gotostd_if") {
          const cond = /_if$/.test(op) ? COND[a[0]] : null, fn = /_if$/.test(op) ? a[1] : a[0];
          if (cond && !cond(st.cmp)) continue;
          const name = STD_NAMES[fn] || STD[fn] || fn;
          if (name === "Std_ObtainItem" || name === "Std_FindItem") {
            const id = item(local.VAR_0x8000), n = +local.VAR_0x8001 || 1;
            if (id) { await flush(); await env.giveItem(id, n, name === "Std_ObtainItem" ? "obtained" : "found"); }
            setVar("VAR_RESULT", id ? 1 : 0);
          } else if (D.s[name]) {
            if (op.startsWith("goto")) { st.code = D.s[name]; st.pc = 0; } else { st.stack.push([st.code, st.pc]); st.code = D.s[name]; st.pc = 0; }
          }
          continue;
        }
        if (simple(st, op, a)) continue;
        await command(op, a);
      }
      await flush();
      }

      // ----- Everything else: what needs the screen -----
      const martList = (label) => (D.tb[label] || []).map((r) => item(r[0])).filter(Boolean);
      const songName = (x) => (D.songNames && D.songNames[x]) || null;
      const seName = (x) => (D.seNames && D.seNames[x]) || String(x).toLowerCase();
      const cut = () => { st.code = []; st.pc = 0; st.stack.length = 0; };
      async function command(op, a) {
        switch (op) {
          // Messages.
          case "msgbox": {
            const type = a[1] || "MSGBOX_DEFAULT", pages = pagesOf(a[0]);
            if (type === "MSGBOX_NPC" && ctx.person) await env.facePlayer(ctx.person);
            if (type === "MSGBOX_YESNO") {
              await flush();
              if (!pages) { setVar("VAR_RESULT", 0); break; }
              if (pages.length > 1) await env.say(pages.slice(0, -1));
              setVar("VAR_RESULT", (await env.confirm(pages[pages.length - 1])) ? 1 : 0);
              break;
            }
            await speak(pages);
            if (type === "MSGBOX_AUTOCLOSE" || type === "MSGBOX_NPC" || type === "MSGBOX_SIGN") env.close();
            break;
          }
          case "message": case "messageautoscroll": case "messageinstant": case "vmessage": {
            const pages = pagesOf(a[0]);
            if (!pages) break;
            await flush();
            if (nextAsks()) { if (pages.length > 1) await env.say(pages.slice(0, -1)); question = pages[pages.length - 1]; } else await env.say(pages);
            break;
          }
          case "closemessage": case "erasebox": case "drawbox": env.close(); break;
          case "delay": await flush(); await env.sleep(Math.max(0, num(a[0])) * 16); break;
          case "yesnobox": {
            await flush();
            const yes = await env.confirm(question || "");
            question = null;
            setVar("VAR_RESULT", yes ? 1 : 0);
            break;
          }
          case "multichoice": case "multichoicedefault": case "multichoicegrid": {
            await flush();
            const texts = D.multi[a[2]] || ["Yes", "No"];
            const i = await env.choose(texts, question);
            question = null;
            setVar("VAR_RESULT", i < 0 ? 127 : i);
            break;
          }
          case "faceplayer": if (ctx.person) await env.facePlayer(ctx.person); break;
          case "bufferspeciesname": buffers[a[0].replace(/\D/g, "") || 0] = String(species(val(a[1])) || ""); break;
          case "bufferleadmonspeciesname": { const r = env.player().party.find((q) => !q.egg) || env.player().party[0]; buffers[a[0].replace(/\D/g, "")] = r ? r.species : ""; break; }
          case "bufferpartymonnick": { const r = env.player().party[num(a[1])]; buffers[a[0].replace(/\D/g, "")] = r ? (r.nickname || r.species) : ""; break; }
          case "bufferitemname": buffers[a[0].replace(/\D/g, "")] = env.itemName(item(val(a[1]))); break;
          case "bufferitemnameplural": { const n = env.itemName(item(val(a[1]))); buffers[a[0].replace(/\D/g, "")] = num(a[2]) > 1 && !/s$/.test(n) ? (/[^aeiou]y$/i.test(n) ? n.slice(0, -1) + "ies" : n + "s") : n; break; }
          case "buffermovename": buffers[a[0].replace(/\D/g, "")] = String(move(val(a[1])) || titleCase(String(val(a[1])).replace(/^MOVE_/, ""))); break;
          case "buffernumberstring": buffers[a[0].replace(/\D/g, "")] = String(num(a[1])); break;
          // (gStdStrings: the Contests' and the Bag's words.)
          case "bufferstdstring": if (typeof val(a[1]) === "number") { buffers[a[0].replace(/\D/g, "")] = STD_STRINGS[val(a[1])] || ""; break; }
          // falls through
          case "bufferstring": case "bufferdecorationname": case "stringvar": case "buffertrainerclassname": case "buffertrainername": case "bufferboxname": {
            const label = a[1]; if (D.t[label]) buffers[a[0].replace(/\D/g, "")] = D.t[label].join(" ");
            break;
          }

          // People and movement.
          case "applymovement": case "applywaitmovement": {
            const mv = D.m[a[1]], target = who(a[0]);
            if (!mv || target == null) break;
            pending.push({ who: target, moves: mv });
            if (op === "applywaitmovement") await flush();
            break;
          }
          case "waitmovement": await flush(); break;
          case "removeobject": case "hideobjectat": { await flush(); const w = who(a[0]); if (w && w !== "player") env.hide(w); break; }
          case "addobject": case "showobjectat": { await flush(); const w = who(a[0]); if (w && w !== "player") env.show(w); break; }
          case "copyobjectxytoperm": { const w = who(a[0]); const at = w && env.personAt(w); if (at) state().pos[mapName() + ":" + w] = { x: at.x, y: at.y }; break; }
          case "turnobject": { const w = who(a[0]); if (w) { await flush(); const at = env.personAt(w); if (at) env.place(w, at.x, at.y, DIRS[val(a[1])] || DIRS[a[1]] || "down"); } break; }

          // Items, Pokémon, money.
          case "additem": { const id = item(val(a[0])); if (id) await env.giveItem(id, a.length > 1 ? num(a[1]) : 1, null); setVar("VAR_RESULT", id ? 1 : 0); break; }
          case "removeitem": { const id = item(val(a[0])); setVar("VAR_RESULT", id && env.takeItem(id, a.length > 1 ? num(a[1]) : 1) ? 1 : 0); break; }
          case "checkitem": { const id = item(val(a[0])); setVar("VAR_RESULT", id && env.hasItem(id, a.length > 1 ? num(a[1]) : 1) ? 1 : 0); break; }
          case "checkitemspace": setVar("VAR_RESULT", 1); break;
          case "checkitemtype": setVar("VAR_RESULT", env.itemPocket ? env.itemPocket(item(val(a[0]))) : 0); break;
          case "giveitem": case "finditem": {
            const id = item(val(a[0])), n = a.length > 1 ? num(a[1]) : 1;
            if (!id) { setVar("VAR_RESULT", 0); break; }
            await flush();
            await env.giveItem(id, n, op === "giveitem" ? "obtained" : "found");
            setVar("VAR_RESULT", 1);
            break;
          }
          case "givemon": { await flush(); const ok = await env.giveMon(species(val(a[0])), num(a[1]), a[2] && a[2] !== "ITEM_NONE" ? item(a[2]) : null); setVar("VAR_RESULT", ok ? 0 : 2); break; }
          case "giveegg": { await env.giveEgg(species(val(a[0]))); setVar("VAR_RESULT", 0); break; }
          case "setmonmove": if (env.setMove) env.setMove(num(a[0]), num(a[1]), move(a[2])); break;
          // (Emerald's: the slot of the first Pokémon that knows it, PARTY_SIZE if none; a field move, also one
          // that could use it here: game/field-moves.js.)
          case "checkpartymove": {
            const mv = move(a[0]), party = env.player().party, F = window.FieldMoves;
            let i = party.findIndex((r) => !r.egg && r.moves.some((x) => x.name === mv));
            if (i < 0 && F && F.info && F.info(mv)) { const u = F.user(env.player(), mv); i = u ? party.indexOf(u) : -1; }
            setVar("VAR_RESULT", i >= 0 ? i : 6); setVar("VAR_0x8004", i >= 0 ? i : 0);
            break;
          }
          case "getpartysize": setVar("VAR_RESULT", env.player().party.length); break;
          case "getplayerxy": { const p = env.personAt("player"); setVar(a[0], p.x); setVar(a[1], p.y); break; }
          case "addmoney": env.addMoney(num(a[0])); break;
          case "removemoney": env.addMoney(-num(a[0])); break;
          case "checkmoney": setVar("VAR_RESULT", env.money() >= num(a[0]) ? 1 : 0); break;
          case "showmoneybox": env.moneyBox(true); break;
          case "hidemoneybox": env.moneyBox(false); break;
          // The rotating-tile puzzle (Mossdeep Gym's floor, two of the Trick House's: src/rotating_tile_puzzle.c): a floor switch
          // moves everyone standing on that colour's arrows a tile the way the arrow points, and turns them a quarter to the left.
          case "initrotatingtilepuzzle": rot = { trick: !!num(a[0]), objects: [] }; break;
          case "moverotatingtileobjects": {
            if (!rot || !env.metatileAt) break;
            const n = num(a[0]), start = D.rotStart[rot.trick ? "trick" : "gym"], STEP = [[1, 0, "right"], [0, 1, "down"], [-1, 0, "left"], [0, -1, "up"]];
            await flush();
            for (const p of peopleHere()) {
              const w = p.localId || "#" + p.id, at = env.personAt(w);
              if (!at || (env.shown && false)) continue;
              const mt = env.metatileAt(mapName(), at.x, at.y);
              if (mt == null || mt < start) continue;
              const row = Math.floor((mt - start) / 8), idx = (mt - start) % 8;
              if (row !== n || row >= 5 || idx >= 4) continue;
              const [dx, dy, dir] = STEP[idx];
              rot.objects.push({ w, prev: idx });
              state().pos[mapName() + ":" + w] = { x: at.x + dx, y: at.y + dy };
              pending.push({ who: w, moves: ["walk_" + dir] });
            }
            await flush();
            break;
          }
          case "turnrotatingtileobjects": {
            if (!rot || !env.metatileAt) break;
            const start = D.rotStart[rot.trick ? "trick" : "gym"], LEFT = { right: "up", down: "right", left: "down", up: "left" };
            for (const o of rot.objects) {
              const at = env.personAt(o.w);
              if (!at) continue;
              const mt = env.metatileAt(mapName(), at.x, at.y), idx = mt == null ? -1 : (mt - start) % 8, diff = idx - o.prev;
              if (idx < 0 || idx >= 4 || !(diff < 0 || diff === 3) || !LEFT[at.facing]) continue;
              pending.push({ who: o.w, moves: ["face_" + LEFT[at.facing]] });
              state().mov[mapName() + ":" + o.w] = "face_" + LEFT[at.facing];
            }
            await flush();
            break;
          }
          case "freerotatingtilepuzzle": rot = null; await flush(); break;
          case "dofieldeffect": if (env.fieldEffect) { await flush(); await env.fieldEffect(a[0]); } break;
          case "setwildbattle": wildSpec = { species: species(val(a[0])), level: num(a[1]), item: a[2] && a[2] !== "ITEM_NONE" ? item(a[2]) : null }; break;
          case "dowildbattle": if (wildSpec) { await flush(); setVar("VAR_RESULT", 0); battleOutcome = OUTCOMES[await env.wildBattle(wildSpec.species, wildSpec.level, wildSpec.item)] || 1; } break;
          // The Game Corner: the Coin Case's Coins, and its slot machines.
          case "checkcoins": setVar(a[0], env.coins ? env.coins() : 0); break;
          case "addcoins": if (env.addCoins) env.addCoins(num(a[0])); break;
          case "removecoins": if (env.addCoins) env.addCoins(-num(a[0])); break;
          case "showcoinsbox": if (env.coinsBox) env.coinsBox(true); break;
          case "hidecoinsbox": if (env.coinsBox) env.coinsBox(false); break;
          case "updatecoinsbox": break;
          case "playslotmachine": if (env.slotMachine) { await flush(); await env.slotMachine(num(a[0])); } break;
          case "showmonpic": if (env.showPicture) env.showPicture(species(val(a[0]))); break;
          case "hidemonpic": if (env.hidePicture) env.hidePicture(); break;
          case "playmoncry": env.cry(species(val(a[0]))); break;
          case "pokemart": await flush(); await env.mart(martList(a[0])); break;
          // Decorations: a shop's counter (the DECOR_ names its list holds), and what scripts hand out.
          case "pokemartdecoration": case "pokemartdecoration2": await flush(); if (env.decorMart) await env.decorMart((D.tb[a[0]] || []).map((r) => r[0])); break;
          case "adddecoration": setVar("VAR_RESULT", env.decorAdd && env.decorAdd(getVar(a[0])) ? 1 : 0); break;
          case "checkdecorspace": setVar("VAR_RESULT", env.decorSpace && env.decorSpace(getVar(a[0])) ? 1 : 0); break;
          case "givedecoration": await flush(); setVar("VAR_RESULT", env.decorGive ? (await env.decorGive(a[0])) : 0); break;
          case "pokemartlistend": case "pokemartdecoration": case "pokemartdecoration2": break;

          // Trainers.
          case "trainerbattle_single": await battle(a[0], a[1], a[2], a[3], { music: a[4] !== "NO_MUSIC" }); break;
          case "trainerbattle_double": await battle(a[0], a[1], a[2], a[4], { double: true }); break;
          case "trainerbattle_no_intro": await battle(a[0], null, a[1], null); break;
          case "trainerbattle_rematch": case "trainerbattle_rematch_double": break;
          case "trainerbattle": {
            const type = String(a[0]);
            if (/SINGLE_NO_INTRO/.test(type)) await battle(a[1], null, a[3], null);
            else if (/DOUBLE/.test(type)) await battle(a[1], a[3], a[4], a[6], { double: true });
            else if (/CONTINUE_SCRIPT/.test(type)) await battle(a[1], a[3], a[4], a[5], { music: !/NO_MUSIC/.test(type) });
            else await battle(a[1], a[3], a[4], null);
            break;
          }
          case "checktrainerflag": st.cmp = beaten(a[0]) ? 0 : 1; setVar("VAR_RESULT", beaten(a[0]) ? 1 : 0); break;
          case "settrainerflag": env.setBeaten(trainerKey(a[0]), true); break;
          case "cleartrainerflag": env.setBeaten(trainerKey(a[0]), false); break;

          // Sound and screen.
          case "playse": env.se(seName(a[0])); break;
          case "playfanfare": await env.fanfare(songName(a[0])); break;
          case "playbgm": env.music(songName(a[0])); break;
          case "savebgm": case "fadedefaultbgm": env.music(null); break;
          case "fadenewbgm": env.music(songName(a[0])); break;
          case "fadeoutbgm": env.music(false); break;
          case "fadeinbgm": env.music(null); break;
          case "fadescreen": case "fadescreenspeed": case "fadescreenswapbuffers": {
            await flush();
            const mode = String(a[0]);
            await env.fade(/TO_|OUT/.test(mode) && !/FROM_/.test(mode), /WHITE/.test(mode));
            break;
          }

          case "special": await special(a[0], null); break;
          case "specialvar": await special(a[1], a[0]); break;

          // Warps.
          case "warp": case "warpsilent": case "warpdoor": case "warphole": case "warpteleport": case "warpspinenter": case "warpwhitefade": case "warpmossdeepgym": {
            await flush();
            let at = null;
            if (a.length >= 4) at = { warp: num(a[1]), x: num(a[2]), y: num(a[3]) };
            else if (a.length === 3) at = { x: num(a[1]), y: num(a[2]) };
            else if (a.length === 2) at = { warp: num(a[1]) };
            await env.warp(a[0], at, op);
            cut();
            break;
          }

          default:
            // (The Battle Frontier's commands: ui/hoenn-frontier.js.)
            if (env.frontierOp && FRONTIER_OPS.test(op)) {
              await flush();
              if (await env.frontierOp(op, a, apiFor(() => {}))) break;
            }
            // (The Contests' commands: ui/hoenn-contest.js.)
            if (env.contestOp && CONTEST_OPS.test(op)) { await flush(); if (await env.contestOp(op, a, apiFor(() => {}))) break; }
            // (The apprentice and the rest: nothing happens.)
            if (!UNKNOWN.has(op)) { UNKNOWN.add(op); if (window.HOENN_DEBUG) console.warn("hoenn script: " + op); }
        }
      }
      // The specials (src/field_specials.c and friends): the ones a script needs; the rest do nothing.
      const apiFor = (set) => ({ set, setBuffer: (n, v) => { buffers[n] = v; }, setVar, getVar, num, local, flush, ctx, st, cut, flag, setFlag, who });
      async function special(name, out) {
        const set = answer(out, name);
        if (syncSpecial(st, name, out)) return;
        switch (name) {
          case "ChoosePartyMon": { await flush(); const i = await env.choosePartyMon("Choose a POKéMON."); setVar("VAR_0x8004", i < 0 ? 255 : i); return; }
          case "ShakeCamera": await flush(); await env.shake(num("VAR_0x8004") || 4, { x: 1, y: 1, delay: 2 }); return;
          // The legendaries' battles: the wild Pokémon setwildbattle named.
          case "StartRegiBattle": case "BattleSetup_StartLegendaryBattle": case "StartGroudonKyogreBattle": case "StartLatiBattle": case "StartLegendaryBattle":
            if (wildSpec) { await flush(); battleOutcome = OUTCOMES[await env.wildBattle(wildSpec.species, wildSpec.level, wildSpec.item)] || 1; }
            return;
          case "DoSealedChamberShakingEffect_Short": await flush(); await env.shake(3, { x: 1, y: 1, delay: 2 }); return;
          case "DoSealedChamberShakingEffect_Long": await flush(); await env.shake(10, { x: 1, y: 1, delay: 2 }); return;
          case "SaveGame": if (env.save) await env.save(); return;
          // (Into a Contest hall: where the last setwarp said.)
          case "DoContestHallWarp": if (lastSetWarp) { await flush(); await env.warp(lastSetWarp[0], { x: num(lastSetWarp[1]), y: num(lastSetWarp[2]) }, "warp"); cut(); } return;
          case "GameClear":
            if (env.special && (await env.special(name, apiFor(set))) !== false) return;
            if (env.save) await env.save();
            return;
          default:
            if (env.special) { const r = await env.special(name, apiFor(set)); if (r !== undefined && r !== false) return; }
            if (out) setVar(out, 0);
        }
      }

      lastTalked = ctx.person ? (ctx.person.localId || "#" + ctx.person.id) : lastTalked;
      if (ctx.person) local.VAR_LAST_TALKED = lastTalked;   // (gSpecialVar_LastTalked: whoever you spoke to)
      // (VAR_FACING: the way you were facing as the script began.)
      { const me = env.personAt("player"); setVar("VAR_FACING", DIR_NUM[(me || {}).facing] || 1); }
      await main();
    }
    const UNKNOWN = new Set();
    const STD_STRINGS = ["COOL", "BEAUTY", "CUTE", "SMART", "TOUGH", "NORMAL", "SUPER", "HYPER", "MASTER", "COOL", "BEAUTY", "CUTE", "SMART", "TOUGH", "ITEMS", "KEY ITEMS", "POKé BALLS", "TMs & HMs", "BERRIES", "SINGLE", "DOUBLE", "MULTI", "MULTI"];

    // ---------- What a map thing runs ----------
    // A person's, sign's or step's label, if it's one of Emerald's scripts.
    function scriptOf(thing) {
      const s = thing && thing.script;
      if (!s) return null;
      const m = /^hoenn:(\w+)$/.exec(s);
      const label = m ? m[1] : s;
      return DATA().s[label] ? label : null;
    }
    // A step's script is due while its var is at its value.
    function triggerDue(script) {
      const map = window.WORLD_MAPS[env.map()];
      const label = script.replace(/^hoenn:/, "");
      const trig = ((map && map.triggers) || []).filter((t) => t.script === script && t.var);
      return trig.some((t) => num(t.var) === +t.value) && !!DATA().s[label];
    }
    // Entering a map: its OnTransition, then its OnLoad (the flags and metatiles it sets).
    function transition(map) {
      resetTemp(); fixedDive = null;
      const ms = DATA().ms[map + "_MapScripts"] || DATA().ms[(window.WORLD_MAPS[map] || {}).scriptName + "_MapScripts"];
      if (!ms) return Promise.resolve();
      // (Started together, as they were; a promise for all of them, for whoever'd rather wait.)
      return Promise.all(["ON_TRANSITION", "ON_LOAD", "ON_RESUME"].filter((k) => ms[k]).map((k) => run(ms[k], { sync: true })));
    }
    // After a battle (or a menu) on a map: its OnResume script.
    function resume(map) {
      const ms = DATA().ms[map + "_MapScripts"] || DATA().ms[(window.WORLD_MAPS[map] || {}).scriptName + "_MapScripts"];
      return ms && ms.ON_RESUME ? run(ms.ON_RESUME, { sync: true }) : Promise.resolve();
    }
    // Where Dive goes from a map that has no dive connection: its OnDiveWarp script's setdivewarp, or the one its OnResume set.
    let fixedDive = null;
    function diveWarp(map) {
      const ms = DATA().ms[map + "_MapScripts"] || DATA().ms[(window.WORLD_MAPS[map] || {}).scriptName + "_MapScripts"];
      if (ms && ms.ON_DIVE_WARP) run(ms.ON_DIVE_WARP, { sync: true });
      return fixedDive;
    }
    // A frame table's script that's due now (warp-into first, when you came through a warp).
    function frameScript(map, viaWarp) {
      const ms = DATA().ms[map + "_MapScripts"] || DATA().ms[(window.WORLD_MAPS[map] || {}).scriptName + "_MapScripts"];
      if (!ms) return null;
      for (const k of viaWarp ? ["ON_WARP_INTO_MAP_TABLE", "ON_FRAME_TABLE"] : ["ON_FRAME_TABLE"]) {
        const rows = ms[k] && DATA().tb[ms[k]];
        if (!rows) continue;
        const r = rows.find((q) => num(q[0]) === (typeof q[1] === "number" ? q[1] : num(q[1])) && DATA().s[q[2]]);
        if (r) return r[2];
      }
      return null;
    }
    const hasScript = (label) => !!DATA().s[label];

    return { run, scriptOf, triggerDue, transition, resume, diveWarp, frameScript, hasScript, flag, setFlag, getVar, setVar, state, placed, movement, shown, resetTemp, local,
      who, setShown: (map, id, on) => { temp.obj[map + ":" + id] = on; } };
  }

  // gStdScripts' order (data/event_scripts.s).
  const STD = ["Std_ObtainItem", "Std_FindItem", "Std_MsgboxNPC", "Std_MsgboxSign", "Std_MsgboxDefault", "Std_MsgboxYesNo", "Std_MsgboxAutoclose",
    "Std_ObtainDecoration", "Std_RegisteredInMatchCall", "Std_MsgboxGetPoints", "Std_MsgboxPokenav"];
  const STD_NAMES = { STD_OBTAIN_ITEM: "Std_ObtainItem", STD_FIND_ITEM: "Std_FindItem", MSGBOX_NPC: "Std_MsgboxNPC", MSGBOX_SIGN: "Std_MsgboxSign",
    MSGBOX_DEFAULT: "Std_MsgboxDefault", MSGBOX_YESNO: "Std_MsgboxYesNo", MSGBOX_AUTOCLOSE: "Std_MsgboxAutoclose", STD_OBTAIN_DECORATION: "Std_ObtainDecoration",
    STD_REGISTER_MATCH_CALL: "Std_RegisteredInMatchCall", MSGBOX_GETPOINTS: "Std_MsgboxGetPoints" };
  window.HoennScript = { create, BADGES, species, move, item };
})();
