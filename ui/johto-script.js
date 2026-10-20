// HeartGold's field scripts, run (tools/lib/hgss-script.js compiles them into
// data/johto-scripts.js): what Johto's people say and do, its signs, the
// scenes its map steps start, and its maps' own scripts. ui/game.js gives it
// the game to work with (an env, below) and runs a script with run().
//
//   const J = JohtoScript.create(env);
//   J.scriptOf(personOrSignOrTrigger)  // { zone, label } a map thing runs, or null
//   await J.run(zone, label, { person })
//   J.transition(map)                  // entering a map: its OnTransition script (flags and vars only)
//   J.frameScript(map)                 // a frame-table script due now ({ zone, label }), or null
//   J.flag(name) / J.setFlag(name, on) / J.getVar(name)
//
// HGSS's flags and vars live in player.flags.johto ({ f, v }); the map's
// temporary ones (FLAG_MAPTEMP_*, VAR_TEMP_*, VAR_SPECIAL_*) only until you
// leave the map (resetTemp). The flags HGSS's new game sets (scr_seq_0149:
// who's hidden until the story gets to them), and what coming to Johto with
// Pokémon changes (tools/build-johto.js's ARRIVAL), are set the first time.
//
// env: player, say(pages), confirm(page), choose(texts), close(), facePlayer(id),
//   act(tracks), show(id), hide(id), place(id, x, y, facing), personAt(id),
//   origin(zone) ({ x, y }: the map's corner on HGSS's world matrix),
//   giveItem(id, n, verb), hasItem(id, n), takeItem(id, n), cry(species), fanfare(),
//   fade(out), trainerBattle(id) and wildBattle(species, level) (outcomes),
//   warp(mapConst, x, y, facing), hasBadge(n), giveBadge(n), sleep(ms), isGirl(),
//   itemName(id), giveMon(species, level, item), giveEgg(species), givePokedex(),
//   money(), addMoney(n), coins(), addCoins(n), beaten(trainer), setBeaten(trainer, on),
//   setDynamicWarp(mapConst, x, y), dynamicWarpMap(), violetLift(), turnWinch(),
//   kurt(op) (Kurt's commands: ui/johto-field.js), followerIdle(), followerHide(on),
//   choosePartyMon(message) (a party slot, or -1), npcTrade(trade, slot) and
//   giveLoanMon(trade, level, n) (JOHTO_SCRIPTS.trades'), setMove(slot, moveSlot, move),
//   chooseMoveToForget(slot, move) (a move slot, or -1), canLearnTutor(slot, move),
//   relearnable(slot) and relearn(slot, moves) (the Move Relearner's screen: learned?),
//   music(song) (null: the map's own again; false: none), se(name), shake(count, opts),
//   moneyBox(on), moveWarp(map, i, x, y), pcSpace(), itemPocket(id),
//   bugContest (ui/bug-contest.js: the Bug-Catching Contest's commands),
//   phoneCall(who, kind, n), registerCard(n), phoneRematch(contact), phoneTrigger(n, on), buenaPassword() (ui/pokegear.js),
//   coinsBox(on), casinoGame() (ui/voltorb-flip.js),
//   shake(times, { x, y, delay }), alphPuzzle(n) (the flag to set if put together), alphWall(n), unownCaught(),
//   safariAction(n), safariChallenge(n), areaCustomizer(), safariStamp() (ui/johto-safari.js),
//   magnetTrain(toward, mapConst, x, y) (the Magnet Train's ride: ui/magnet-train.js).
(function () {
  "use strict";

  const DATA = () => window.JOHTO_SCRIPTS || { zones: {}, messages: {}, init: [], maps: {} };
  const DIRS = ["up", "down", "left", "right"];   // (HGSS's DIR_NORTH ... DIR_EAST)
  // (GetStdMsgNaix's banks, for MsgBoxExtern: src/field/scrcmd_message.c.)
  const STD_BANKS = [752, 211, 30, 435];
  // HGSS's sound effects (include/constants/sndseq.h) as the nearest of
  // FireRed's; the rest (its talking blip, SEQ_SE_DP_SELECT, too) play nothing.
  const SE = { 1501: "se_select", 1521: "se_ding_dong", 1538: "se_exit", 1539: "se_door", 1543: "se_door", 1547: "se_pc_on",
    1562: "se_save", 1603: "se_shop", 1613: "se_warp_out", 1754: "se_ship", 2180: "se_fall", 2334: "se_shop" };
  // The standard scripts that play someone's music (scr_seq_0003's): HGSS's songs.
  // (Lyra's, or Ethan's for a girl: std_play_friend_music.)
  const STD_MUSIC = { std_play_rival_intro_music: "gs_e_rival1", std_play_rival_outro_music: "gs_e_rival2",
    std_play_eusine_music: "gs_e_minaki", std_play_clair_music: "gs_ibuki", std_play_mom_music: "gs_e_tsureteke1",
    std_play_follow_music: "gs_e_tsureteke2", std_play_pichu_music: "gs_e_g_pichu", std_play_kimono_girl_music: "gs_e_maiko_theme" };
  // Gen 4's type numbers (GetMonTypes), by this game's type names.
  const TYPES = ["Normal", "Fighting", "Flying", "Poison", "Ground", "Rock", "Bug", "Ghost", "Steel", "???", "Fire", "Water",
    "Grass", "Electric", "Psychic", "Ice", "Dragon", "Dark"];
  // The game's clock (Player.gameTime: it goes by steps, no real-time clock).
  const gameTime = () => (window.Player && window.Player.gameTime ? window.Player.gameTime() : { day: 0, weekday: 1, hour: 10, today: "day0" });
  // The Bug-Catching Contest (this game's rule): on offer once each time
  // you've beaten the Elite Four, not by the weekday. Where its scripts ask
  // the weekday (the park's gatehouses, the park, its std scripts: those that
  // test for Thursday), it's a contest day while it's on offer, in turn
  // Tuesday's, Thursday's and Saturday's (their Pokémon), and a Monday once
  // you've had your go (FLAG_DAILY_DID_BUG_CONTEST, kept until the next
  // Elite Four: state().contestRound counts them, ui/game.js).
  const CONTEST_ZONES = /^(R35R0201|R36R0201|D22R0101|BUG_CONTEST)$/, CONTEST_FLAG = "FLAG_DAILY_DID_BUG_CONTEST";
  const contestWeekday = (zone, cmds, i, s) => (CONTEST_ZONES.test(zone) && cmds.slice(i, i + 16).some((c) => c[0] === "Compare" && c[2] === 4)
    ? (s.f[CONTEST_FLAG] ? 1 : [2, 4, 6][(s.contestRound || 0) % 3]) : null);
  // (HGSS's time of day, ScrCmd_379: morning from 4, day from 10, evening from 17, night from 20, late night from 0.)
  const timeOfDay = () => { const h = gameTime().hour; return h < 4 ? 4 : h < 10 ? 0 : h < 17 ? 1 : h < 20 ? 2 : 3; };
  // A move by HGSS's name (MOVE_DOUBLE_EDGE): this game's (Double-Edge).
  const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  let moveIDs = null;
  function moveName(x) {
    const id = toID(String(x).replace(/^MOVE_/, ""));
    if (!moveIDs) { moveIDs = {}; for (const k of Object.keys(window.MOVES || {})) moveIDs[toID(k)] = k; }
    return moveIDs[id] || String(x).replace(/^MOVE_/, "").toLowerCase().replace(/(^|_)(\w)/g, (m, u, c) => (u ? " " : "") + c.toUpperCase());
  }

  function create(env) {
    const temp = { f: {}, v: {}, pos: {} };
    const state = () => {
      const p = env.player();
      const s = p.flags.johto || (p.flags.johto = { f: {}, v: {} });
      if (!s.init) {
        s.init = true;
        for (const [cmd, name, val] of DATA().init) {
          if (cmd === "SetFlag") s.f[name] = true;
          else if (cmd === "ClearFlag") delete s.f[name];
          else if (cmd === "SetVar") s.v[name] = val;
        }
      }
      // (HGSS's daily flags, FLAG_DAILY_*, clear each new day: ClearDailyFlags.)
      const today = gameTime().today;
      if (s.day !== today) {
        s.day = today;
        for (const k of Object.keys(s.f)) if (/^FLAG_DAILY_/.test(k) && k !== CONTEST_FLAG) delete s.f[k];
      }
      return s;
    };
    const isTemp = (name) => /^(FLAG_MAPTEMP_|VAR_TEMP_|VAR_SPECIAL_)/.test(name);
    // (HGSS's daily flags, FLAG_DAILY_*, are set until the day's out: kept as the day's date.)
    const isDaily = (name) => /^FLAG_DAILY_/.test(name) && name !== CONTEST_FLAG, today = () => gameTime().today;
    const flag = (name) => (isTemp(name) ? !!temp.f[name] : isDaily(name) ? state().f[name] === today() : !!state().f[name]);
    function setFlag(name, on) {
      const o = isTemp(name) ? temp.f : state().f;
      if (on) o[name] = isDaily(name) ? today() : true; else delete o[name];
    }
    // (A flag by its number, from a var: SetFlagVar's.)
    const flagNamed = (n) => (typeof n === "string" ? n : (DATA().flagNames || {})[n] || "FLAG_" + n);
    // A var's value (or a number, or a name that's neither: as it is).
    function getVar(x) {
      if (typeof x !== "string" || !/^VAR_/.test(x)) return x;
      const o = isTemp(x) ? temp.v : state().v;
      return o[x] == null ? 0 : o[x];
    }
    function setVar(name, val) {
      if (typeof name !== "string" || !/^VAR_/.test(name)) return;
      (isTemp(name) ? temp.v : state().v)[name] = val;
    }
    const resetTemp = () => { temp.f = {}; temp.v = {}; temp.pos = {}; };
    // A species by its number (SPECIES_* a script keeps in a var), as its name.
    const speciesOf = (x) => (typeof x === "number" && x > 0 && window.DEX ? Object.keys(window.DEX).find((k) => window.DEX[k].id === x) || x : x);
    // (Where the map's OnTransition script put someone, this visit.)
    const placed = (id) => temp.pos[id] || null;

    // ---------- Text ----------
    const buffers = {};
    function text(id) {
      const pages = DATA().messages[id];
      if (!pages) return null;
      const p = env.player();
      return pages.map((s) => s.replace(/\{BUF(\d+)\}/g, (m, n) => (buffers[n] != null ? buffers[n] : n === "0" ? p.name : "")));
    }

    // ---------- Running a script ----------
    // `label`: a label of the zone's (scr_seq_R30_009, _0148, ...).
    async function run(zone, label, ctx) {
      ctx = ctx || {};
      const z = DATA().zones[zone];
      if (!z || !(label in z.labels)) return;
      const C = z.cmds, L = z.labels, origin = env.origin(zone) || { x: 0, y: 0 };
      let pc = L[label], cmp = 1, sw = 0, lastBattle = null, menu = null, choice = 0, starterSlot = null;
      // (What a party screen, a move list or the Move Relearner chose, until
      // the command that reads it; the trade LoadNPCTrade loaded; a jingle playing.)
      let picked = 255, trade = null, jingle = null, jingleAt = -1;
      // (HGSS's party slot 0 is the starter just chosen: in this game it
      // joins a party you already have, wherever it lands.)
      // (But not a slot a party screen chose, in a var or a copy of it: chosen.)
      const chosen = new Set();
      const slot = (n) => {
        if (chosen.has(n)) return +getVar(n) || 0;
        n = +getVar(n) || 0;
        if (n !== 0) return n;
        if (starterSlot != null) return starterSlot;
        // (Afterwards too: HGSS's slot 0 is the starter you chose, wherever it is in your party.)
        const pid = state().starterPid, i = pid != null ? env.player().party.findIndex((r) => r.personality === pid) : -1;
        return i >= 0 ? i : 0;
      };
      const mon = (n) => env.player().party[slot(n)];
      // (An item a var holds by HGSS's number, as Buena's prizes, or a constant this game's names hadn't: JOHTO_SCRIPTS.itemIds.)
      const item = (x) => { const v = getVar(x), ids = DATA().itemIds; return ids && ids[v] != null ? ids[v] : v; };
      const itemVars = (it, n) => { setVar("VAR_SPECIAL_x8004", item(it)); setVar("VAR_SPECIAL_x8005", +getVar(n) || 1); };
      const sound = (n) => (DATA().sounds || {})[getVar(n)] || null;
      const stack = [], pending = [];
      const go = (l) => { if (l in L) pc = L[l]; };
      const who = (obj) => (obj === "player" ? "player" : obj);
      const flush = async () => { if (pending.length) { const t = pending.splice(0); await env.act(t); } };
      // (Is a YesNo coming, so the last page should be the question?)
      const nextIsYesNo = (i) => { for (let k = i; k < C.length && k < i + 4; k++) { if (C[k][0] === "YesNo") return true; if (!/^(Nop|ScrCmd_|TouchscreenMenu)/.test(C[k][0])) return false; } return false; };
      // (A jingle the message is about, PlayFanfare just after it: it starts with the message.)
      const startJingle = (k) => { jingle = Promise.resolve(env.fanfare(DATA().sounds && DATA().sounds[getVar(C[k][1])])); jingleAt = k; };
      const nextJingle = (i) => { for (let k = i; k < C.length && k < i + 3; k++) { if (C[k][0] === "PlayFanfare") return k; if (!/^(Nop|Buffer)/.test(C[k][0])) return -1; } return -1; };
      // (Does a GetMenuChoice read a {YESNO} message's answer? Not if the script
      // goes on to a menu, a gift or another message first, as the Game Corner's
      // prize counters do after their welcome: then it asks nothing.)
      const readsChoice = (i) => {
        for (let k = i, n = 0; k < C.length && n < 40; n++) {
          const o = C[k][0];
          if (o === "GetMenuChoice" || o === "YesNo" || o === "Call") return true;
          if (o === "GoTo") { if (!(C[k][1] in L)) return true; k = L[C[k][1]]; continue; }
          if (/Msg$|^MenuInit|^MenuExec$|^Give|^End$|^Return$/.test(o)) return false;
          k++;
        }
        return true;
      };
      // (Or a menu, which answers a message that asks: not Yes or No, then.)
      const nextIsMenu = (i) => {
        for (let k = i, n = 0; k < C.length && n < 4; k++, n++) {
          if (C[k][0] === "GoTo" && C[k][1] in L) { k = L[C[k][1]] - 1; continue; }
          if (/^MenuInit/.test(C[k][0])) return true;
          if (!/^(Nop|TouchscreenMenu)/.test(C[k][0])) return false;
        }
        return false;
      };
      let question = null, menuQuestion = null;
      async function show(pages, id) {
        if (!pages || !pages.length) return;
        await flush();
        const j = nextJingle(pc);
        if (j >= 0) startJingle(j);
        if (nextIsYesNo(pc)) { if (pages.length > 1) await env.say(pages.slice(0, -1)); question = pages[pages.length - 1]; return; }
        // (A menu's question stays up with the menu.)
        if (nextIsMenu(pc)) { if (pages.length > 1) await env.say(pages.slice(0, -1)); menuQuestion = pages[pages.length - 1]; return; }
        // (A message that asks Yes or No itself: GetMenuChoice reads it, 0 for Yes.)
        if (id && DATA().yesno && DATA().yesno[id] && readsChoice(pc)) {
          if (pages.length > 1) await env.say(pages.slice(0, -1));
          choice = (await env.confirm(pages[pages.length - 1])) ? 0 : 1;
          setVar("VAR_SPECIAL_RESULT", choice);
          return;
        }
        await env.say(pages);
      }
      const say = (id) => show(text(id), id);
      const cond = { Lt: (c) => c === 0, Eq: (c) => c === 1, Gt: (c) => c === 2, Le: (c) => c !== 2, Ge: (c) => c !== 0, Ne: (c) => c !== 1 };
      for (let guard = 0; guard < 20000 && pc < C.length; guard++) {
        const [op, ...a] = C[pc++];
        let m;
        switch (op) {
          case "End": await flush(); return;
          case "Return": if (!stack.length) { await flush(); return; } pc = stack.pop(); break;
          case "GoTo": go(a[0]); break;
          case "Call": stack.push(pc); go(a[0]); break;
          case "Compare": case "CompareVarToValue": {
            // (A species by name, from GetPartyMonSpecies, against SPECIES_*: equal or not.)
            // (Or against a dex number, as HGSS's scripts write some: Compare VAR_SPECIAL_RESULT, 152.)
            const p = getVar(a[0]), q = getVar(a[1]);
            if (typeof p === "string" || typeof q === "string") { cmp = String(typeof q === "string" ? speciesOf(p) : p) === String(typeof p === "string" ? speciesOf(q) : q) ? 1 : 0; break; }
            const x = +p || 0, y = +q || 0;
            cmp = x < y ? 0 : x === y ? 1 : 2;
            break;
          }
          case "GoToIfSet": if (flag(a[0])) go(a[1]); break;
          case "GoToIfUnset": if (!flag(a[0])) go(a[1]); break;
          case "CallIfSet": if (flag(a[0])) { stack.push(pc); go(a[1]); } break;
          case "CallIfUnset": if (!flag(a[0])) { stack.push(pc); go(a[1]); } break;
          case "Switch": sw = +getVar(a[0]) || 0; setVar("VAR_SPECIAL_x8008", sw); break;
          case "Case": if (sw === +getVar(a[0])) go(a[1]); break;
          case "SetVar": setVar(a[0], a[1]); chosen.delete(a[0]); break;
          case "CopyVar": case "SetOrCopyVar": setVar(a[0], getVar(a[1])); if (chosen.has(a[1])) chosen.add(a[0]); else chosen.delete(a[0]); break;
          case "AddVar": setVar(a[0], (+getVar(a[0]) || 0) + (+getVar(a[1]) || 0)); break;
          case "SubVar": setVar(a[0], (+getVar(a[0]) || 0) - (+getVar(a[1]) || 0)); break;
          case "SetFlag": setFlag(a[0], true); break;
          case "ClearFlag": setFlag(a[0], false); break;
          case "CheckFlag": cmp = flag(a[0]) ? 1 : 0; break;

          // Messages.
          case "NPCMsg": case "NonNPCMsg": await say(a[0]); break;
          case "SimpleNPCMsg": if (ctx.person) await env.facePlayer(ctx.person); await say(a[0]); env.close(); break;
          case "MsgBoxExtern": case "NonNPCMsgExtern": await say("bank:" + getVar(a[0]) + ":" + getVar(a[1])); break;
          case "GenderMsgBox": await say(env.isGirl() ? a[1] : a[0]); break;
          case "TrainerTipsEx": await say(a[1]); env.close(); break;
          case "DirectionSignpostEx": await say(a[2]); env.close(); break;
          case "CloseMsg": env.close(); break;
          case "YesNo": {
            const yes = await env.confirm(question || "");
            question = null;
            setVar(a[0], yes ? 0 : 1);
            break;
          }
          case "BufferPlayersName": buffers[a[0]] = env.player().name; break;
          case "BufferRivalsName": buffers[a[0]] = state().rival || "Silver"; break;
          case "BufferFriendsName": buffers[a[0]] = env.isGirl() ? "Ethan" : "Lyra"; break;
          case "BufferMonSpeciesName": case "BufferPartyMonSpeciesNameIndef": { const r = mon(a[1]); buffers[a[0]] = r ? r.species : ""; break; }
          case "BufferPartyMonNick": { const r = mon(a[1]); buffers[a[0]] = r ? (r.nickname || r.species) : ""; break; }
          case "BufferSpeciesName": case "BufferSpeciesNameIndef": buffers[a[0]] = String(speciesOf(getVar(a[1]))); break;
          case "BufferDeptStoreFloorNo": buffers[a[0]] = (+getVar(a[1]) || 0) + "F"; break;
          case "BufferInt": case "BufferIntEx": buffers[a[0]] = String(+getVar(a[1]) || 0); break;
          case "BufferItemName": case "BufferItemNameIndef": case "BufferItemNamePlural": buffers[a[0]] = env.itemName(item(a[1])); break;
          case "BufferMoveName": buffers[a[0]] = String(getVar(a[1])).replace(/^MOVE_/, "").toLowerCase().replace(/(^|_)(\w)/g, (x, u, c) => (u ? " " : "") + c.toUpperCase()); break;
          // (A message by its number in the map's own bank, from a var.)
          case "NonNPCMsgVar": case "NPCMsgVar": if (z.bank) await say(z.bank + "_" + String(+getVar(a[0]) || 0).padStart(5, "0")); break;

          // People and movement.
          case "FacePlayer": if (ctx.person) await env.facePlayer(ctx.person); break;
          case "ApplyMovement": if (z.moves[a[1]]) pending.push({ who: who(a[0]), moves: z.moves[a[1]] }); break;
          case "WaitMovement": await flush(); break;
          case "ShowPerson": case "MakeObjectVisible": await flush(); env.show(a[0]); break;
          case "HidePerson": await flush(); env.hide(a[0]); break;
          case "MovePersonFacing": await flush(); env.place(a[0], (+getVar(a[1]) || 0) - origin.x, (+getVar(a[3]) || 0) - origin.y, DIRS[+getVar(a[4])] || "down"); break;
          case "GetPlayerCoords": { const p = env.personAt("player"); setVar(a[0], p.x + origin.x); setVar(a[1], p.y + origin.y); break; }
          case "GetPersonCoords": {
            const p = env.personAt(a[0]);
            setVar(a[1], p ? p.x + origin.x : 255); setVar(a[2], p ? p.y + origin.y : 255);
            break;
          }
          case "SetObjectFacing": await flush(); { const p = env.personAt(a[0]); if (p) env.place(a[0], p.x, p.y, DIRS[+getVar(a[1])] || "down"); } break;
          case "MovePerson": await flush(); env.place(a[0], (+getVar(a[1]) || 0) - origin.x, (+getVar(a[2]) || 0) - origin.y, null); break;
          case "GetPlayerFacing": setVar(a[0], Math.max(0, DIRS.indexOf(env.personAt("player").facing))); break;

          // Items, Pokémon, badges.
          // (These macros set VAR_SPECIAL_x8004 and x8005 to the item and how many, as HGSS's ItemVars:
          // the messages after them name it.)
          case "GiveItemNoCheck":
            await flush();
            itemVars(a[0], a[1]);
            await env.giveItem(getVar(a[0]), +getVar(a[1]) || 1, "received");
            break;
          case "CallStd":
            if (a[0] === "std_give_item_verbose" || a[0] === "std_obtain_item_verbose") {
              await flush();
              await env.giveItem(item("VAR_SPECIAL_x8004"), +getVar("VAR_SPECIAL_x8005") || 1, a[0] === "std_give_item_verbose" ? "received" : "obtained");
            } else if (a[0] === "std_bag_is_full") await env.say(["The Bag is full…"]);
            // (Poké Marts: the standard stock by the Badges you have, or the town's own.)
            else if (a[0] === "std_pokemart") await env.mart(env.martStock(DATA().marts.standard));
            else if (a[0] === "std_special_mart") await env.mart(DATA().marts.special[+getVar("VAR_SPECIAL_x8004") || 0] || []);
            else if (a[0] === "std_play_friend_music") env.music(env.isGirl() ? "gs_e_support_m" : "gs_e_support_f");
            else if (STD_MUSIC[a[0]]) env.music(STD_MUSIC[a[0]]);
            else if (/^std_fade_end_\w+_music$/.test(a[0])) env.music(null);
            // (A std script compiled as a zone of its own, as the Bug-Catching Contest's: it runs, then this goes on.)
            else if (DATA().std && DATA().std[a[0]]) { await flush(); await run(DATA().std[a[0]][0], DATA().std[a[0]][1], ctx); }
            break;
          // (This game's Bag never fills.)
          case "GoToIfNoItemSpace": itemVars(a[0], a[1]); setVar("VAR_SPECIAL_RESULT", 1); break;
          case "GoToIfNoItemSpace2": itemVars(a[0], a[1]); setVar("VAR_SPECIAL_RESULT", 1); cmp = 1; break;
          case "HasSpaceForItem": setVar(a[2], 1); break;
          case "HasItem": setVar(a[2], env.hasItem(item(a[0]), +getVar(a[1]) || 1) ? 1 : 0); break;
          case "TakeItem": setVar(a[2], env.takeItem(getVar(a[0]), +getVar(a[1]) || 1) ? 1 : 0); break;
          case "GetItemQuantity": setVar(a[1], env.itemCount(getVar(a[0]))); break;
          case "CheckBadge": setVar(a[1], env.hasBadge(+getVar(a[0])) ? 1 : 0); break;
          case "GetPartyCount": setVar(a[0], env.player().party.length); break;
          case "CountAliveMons": setVar(a[0], env.player().party.filter((r) => !r.egg && r.hp > 0).length); break;
          case "GetPartyLeadAlive": setVar(a[0], Math.max(0, env.player().party.findIndex((r) => !r.egg && r.hp > 0))); chosen.add(a[0]); break;
          case "GetPartyMonSpecies": { const r = mon(a[0]); setVar(a[1], r && !r.egg ? r.species : 0); break; }
          case "MonGetFriendship": { const r = mon(a[1]); setVar(a[0], r ? r.happiness | 0 : 0); break; }
          case "GetPartyMonForm2": setVar(a[0], 0); break;
          case "GetGameVersion": setVar(a[0], DATA().version || 7); break;
          case "PartyCountNotEgg": setVar(a[0], env.player().party.filter((r) => !r.egg).length); break;
          case "PartyCountEgg": setVar(a[0], env.player().party.filter((r) => r.egg).length); break;
          case "PlayerHasSpecies": setVar(a[0], env.player().party.some((r) => !r.egg && r.species === getVar(a[1])) ? 1 : 0); break;
          case "MonAddFriendship": { const r = mon(a[1]); if (r) r.happiness = Math.min(255, (r.happiness | 0) + (+getVar(a[0]) || 0)); break; }
          case "GiveItem": await flush(); setVar(a[2], (await env.giveItem(getVar(a[0]), +getVar(a[1]) || 1, null)) === false ? 0 : 1); break;
          case "GiveMon": await flush(); setVar(a[5], (await env.giveMon(speciesOf(getVar(a[0])), +getVar(a[1]) || 5, getVar(a[2]))) ? 1 : 0); break;
          case "GiveSpikyEarPichu": await flush(); await env.giveMon("Pichu", 30, null); break;
          case "GiveEgg": await flush(); await env.giveEgg(getVar(a[0])); break;
          // (HGSS's Badges: 0 to 7 Johto's, from Zephyr; 8 on, Kanto's.)
          case "GiveBadge": env.giveBadge(+getVar(a[0]) || 0); break;
          case "GivePokedex": env.givePokedex(); break;
          // Money and Coins.
          case "HasEnoughMoneyImmediate": setVar(a[0], env.money() >= (+getVar(a[1]) || 0) ? 1 : 0); break;
          case "HasEnoughMoneyVar": setVar(a[0], env.money() >= (+getVar(a[1]) || 0) ? 1 : 0); break;
          case "SubMoneyImmediate": case "SubMoneyVar": env.addMoney(-(+getVar(a[0]) || 0)); break;
          case "AddMoney": env.addMoney(+getVar(a[0]) || 0); break;
          case "GetCoinAmount": setVar(a[0], env.coins()); break;
          case "CheckCoinsImmediate": setVar(a[0], env.coins() >= (+getVar(a[1]) || 0) ? 1 : 0); break;
          case "CheckGiveCoins": setVar(a[0], env.coins() + (+getVar(a[1]) || 0) <= 50000 ? 1 : 0); break;
          case "GiveCoins": env.addCoins(+getVar(a[0]) || 0); break;
          case "TakeCoins": env.addCoins(-(+getVar(a[0]) || 0)); break;
          // (The Coins window: ScrCmd_116 shows it, 118 updates it, 117 takes it down.)
          case "ScrCmd_116": case "ScrCmd_118": env.coinsBox(true); break;
          case "ScrCmd_117": env.coinsBox(false); break;
          // (Mr. Game's table in Goldenrod's Game Corner: Voltorb Flip, ui/voltorb-flip.js.)
          case "CasinoGame": await flush(); await env.casinoGame(); break;
          // Trainers beaten (the game's own flags, by trainer).
          case "SetTrainerFlag": env.setBeaten(a[0], true); break;
          case "ClearTrainerFlag": env.setBeaten(a[0], false); break;
          case "GoToIfDefeated": if (env.beaten(a[0])) go(a[1]); break;
          case "GoToIfNotDefeated": if (!env.beaten(a[0])) go(a[1]); break;
          // The Pokégear's phone numbers (who's given you theirs: they don't ask again).
          case "CheckRegisteredPhoneNumber": setVar(a[1], (state().phone || []).includes(a[0]) ? 1 : 0); break;
          case "RegisterGearNumber": { const s = state(); s.phone = s.phone || []; if (!s.phone.includes(a[0])) s.phone.push(a[0]); break; }
          // (The Pokégear itself, ui/pokegear.js: a story call, its cards, a trainer wanting a rematch, the calls that come.)
          case "PhoneCall": await flush(); await env.phoneCall(+getVar(a[0]), +getVar(a[1]), +getVar(a[2])); break;
          case "RegisterPokegearCard": env.registerCard(+a[0]); break;
          case "GetPhoneBookRematch": setVar(a[1], env.phoneRematch(+getVar(a[0])) ? 1 : 0); break;
          case "ScrCmd_148": env.phoneTrigger(+a[0], true); break;
          case "UnsetPhoneCallTrigger": env.phoneTrigger(+a[0], false); break;
          // (Today's password: the first of its kind's three words in the map's bank, and which of them it is.)
          case "GetBuenasPassword": { const n = env.buenaPassword ? env.buenaPassword() : 0; setVar(a[0], 40 + 3 * Math.floor(n / 3)); setVar(a[1], n % 3); break; }
          // Elevators: the floor chosen is where its doors open (FireRed's dynamic warp), and the floor it's at.
          case "SetDynamicWarp": env.setDynamicWarp(a[0], +getVar(a[2]) || 0, +getVar(a[3]) || 0); break;
          case "GetDynamicWarpFloorNo": {
            const m = /_(B?)(\d+)F$/.exec(env.dynamicWarpMap() || "");
            setVar(a[0], m ? (m[1] ? 1 - +m[2] : +m[2]) : 1);
            break;
          }
          case "Random": setVar(a[0], Math.floor(Math.random() * (+getVar(a[1]) || 1))); break;

          // The starter (Elm's Lab), and the rest of Johto's story's gifts.
          case "ChooseStarter": {
            await flush();
            starterSlot = await env.chooseStarter();
            const r = env.player().party[starterSlot];
            if (r) state().starterPid = r.personality;
            break;
          }
          // (Elm gives the Pokégear, Mom's in HGSS: this game has no Mom in Johto. Its message is this game's own.)
          case "ElmPokegear": {
            await flush();
            setFlag("FLAG_GOT_POKEGEAR", true);
            jingle = Promise.resolve(env.fanfare(DATA().sounds && DATA().sounds[1185]));
            await say("msg_0543_T20R0101_pokegear");
            await jingle; jingle = null;
            env.close();
            break;
          }
          case "SetStarterChoice": state().starter = getVar(a[0]); break;
          // (255: the bug you're holding in the Bug-Catching Contest.)
          case "NicknameInput": if (+getVar(a[0]) === 255) { const r = env.bugContest && env.bugContest.caught(); if (r) await env.nickname(r); } else await env.nickname(slot(a[0])); break;
          // (Named: 0, as HGSS's naming screen gives when it's done; 1 would ask again.)
          // (His name's Silver, no naming screen: this game's own.)
          case "NameRival": state().rival = "Silver"; setVar(a[0], 0); break;
          case "HealParty": env.healParty(); break;
          case "GiveTogepiEgg": await env.giveEgg("Togepi"); break;
          case "TakeItemNoCheck": itemVars(a[0], a[1]); setVar("VAR_SPECIAL_RESULT", env.takeItem(getVar(a[0]), +getVar(a[1]) || 1) ? 1 : 0); break;
          case "GetPlayerGender": setVar(a[0], env.isGirl() ? 1 : 0); break;
          case "GetWeekday": { const d = contestWeekday(zone, C, pc, state()); setVar(a[0], d != null ? d : gameTime().weekday); break; }
          case "PlayerOnBikeCheck": setVar(a[0], env.onBike() ? 1 : 0); break;
          case "PhotoAlbumIsFull": case "CheckDaycareEgg": setVar(a[0], 0); break;
          case "FollowerPokeIsEventTrigger": setVar(a[2], 0); break;
          case "ScrCmd_729": setVar(a[a.length - 1], 0); break;   // (a follower's Pokémon out for a scene: none here)
          case "GetStarterChoice": setVar(a[0], state().starter || 0); break;

          // Sounds.
          case "PlayCry": env.cry(getVar(a[0])); break;
          // (A jingle, HGSS's own (tools/lib/hgss-music.json); WaitFanfare waits for it. One a message
          // is about started with it.)
          case "PlayFanfare": if (jingleAt !== pc - 1) startJingle(pc - 1); break;
          case "WaitFanfare": if (jingle) { await jingle; jingle = null; } jingleAt = -1; break;
          // (The music: a song by its number, a character's for a scene, and back to the map's.)
          case "PlayBGM": case "TempBGM": if (sound(a[0])) env.music(sound(a[0])); break;
          case "StopBGM": case "FadeOutBGM": env.music(false); break;
          case "ResetBGM": env.music(null); break;
          case "PlaySE": if (SE[getVar(a[0])]) env.se(SE[getVar(a[0])]); break;
          case "WaitSE": case "StopSE": case "WaitCry": break;
          case "Wait": await env.sleep((+getVar(a[0]) || 0) * 33); break;

          // Menus.
          // (A menu of the standard texts, msg_0191, or of the map's own; its choice goes in its var.)
          case "MenuInitStdGmm": menu = { bank: 191, items: [], v: a[4] }; break;
          case "MenuInit": menu = { bank: z.menuBank, items: [], v: a[4] }; break;
          // (An item's words by its number in the menu's bank, or, a shared script's, by their message's own name.)
          case "MenuItemAdd": if (menu) menu.items.push({ text: (text(typeof a[0] === "string" && !/^VAR_/.test(a[0]) ? a[0] : "bank:" + menu.bank + ":" + getVar(a[0])) || ["…"])[0], value: getVar(a[2]) }); break;
          case "MenuExec": {
            await flush();
            const i = menu && menu.items.length ? await env.choose(menu.items.map((x) => x.text), menuQuestion) : -1;
            menuQuestion = null;
            choice = i >= 0 && menu ? menu.items[i].value : (menu && menu.items.length ? menu.items[menu.items.length - 1].value : 0);
            setVar(menu && menu.v || "VAR_SPECIAL_RESULT", choice);
            menu = null;
            break;
          }
          case "GetStdMsgNaix": setVar(a[1], STD_BANKS[+getVar(a[0])] || 0); break;
          case "GetMenuChoice": setVar(a[0], choice); break;
          // (The message box stays up, waits for A: this game's messages do anyway.)
          case "HoldMsg": case "WaitButton": case "WaitABPress": case "Lock": case "LockAll": case "Release": case "ReleaseAll": break;
          // (The money box, at the top left, while you pay.)
          case "ShowMoneyBox": case "UpdateMoneyBox": env.moneyBox(true); break;
          case "HideMoneyBox": env.moneyBox(false); break;

          // Choosing a Pokémon: the party screen (PartySelectUI; an in-game
          // trade's, ScrCmd_566), and GetPartySelection reads the slot, 255 for none.
          case "PartySelectUI": case "ScrCmd_566": {
            await flush();
            const i = await env.choosePartyMon(op === "ScrCmd_566" ? "Trade which Pokémon?" : "Choose a Pokémon.");
            picked = i >= 0 ? i : 255;
            break;
          }
          case "GetPartySelection": setVar(a[0], picked); if (picked !== 255) chosen.add(a[0]); else chosen.delete(a[0]); break;
          // In-game trades (src/npc_trade.c): the trade's Pokémon (JOHTO_SCRIPTS.trades) for one of yours.
          case "LoadNPCTrade": trade = (DATA().trades || [])[+getVar(a[0])] || null; break;
          case "NPCTradeGetReqSpecies": setVar(a[0], trade ? trade.wants : 0); break;
          case "NPCTradeGetOfferedSpecies": setVar(a[0], trade ? trade.gives : 0); break;
          case "NPCTradeExec": await flush(); if (trade && mon(a[0])) await env.npcTrade(trade, slot(a[0])); break;
          case "NPCTradeEnd": trade = null; break;
          // A Pokémon lent to you (Kenya, Cianwood's Shuckie): given, and back
          // (CheckReturnLoanMon: 0 it can go back; 1 it isn't theirs, 2 it's
          // holding something, 4 it's your only one that can battle).
          case "GiveLoanMon": { const t = (DATA().trades || [])[+getVar(a[0])]; await flush(); if (t) await env.giveLoanMon(t, +getVar(a[1]) || 5, +getVar(a[0])); break; }
          case "CheckReturnLoanMon": {
            const r = mon(a[1]), party = env.player().party;
            setVar(a[2], !r || r.loan !== +getVar(a[0]) ? 1 : party.filter((x) => !x.egg && x.hp > 0).length < 2 ? 4 : r.item ? 2 : 0);
            break;
          }
          case "ReturnLoanMon": { const i = slot(a[0]), party = env.player().party; if (party[i]) party.splice(i, 1); break; }
          // (Kenya's Mail: held by the Spearow lent with it, until it's delivered.
          // KenyaCheck's last: 0, holding Mail at all; 1, Kenya's.)
          case "KenyaCheck": { const r = mon(a[1]); setVar(a[0], r && r.mail ? 1 : 0); break; }
          case "KenyaCheckPartyOrMailbox": setVar(a[0], env.player().party.some((r) => r.mail === "kenya") ? 1 : 0); break;
          case "MonGiveMail": { const r = mon(a[0]); if (r) delete r.mail; break; }
          // Ribbons (HGSS's numbers, kept on the Pokémon).
          case "GiveRibbon": { const r = mon(a[0]), n = +getVar(a[1]); if (r && !(r.ribbons || []).includes(n)) (r.ribbons = r.ribbons || []).push(n); break; }
          case "MonHasRibbon": { const r = mon(a[1]); setVar(a[0], r && (r.ribbons || []).includes(+getVar(a[2])) ? 1 : 0); break; }
          case "MonGetGender": { const r = mon(a[0]); setVar(a[1], !r || r.gender === "N" ? 2 : r.gender === "F" ? 1 : 0); break; }
          case "GetMonTypes": {
            const r = mon(a[2]), types = (r && window.DEX && window.DEX[r.species] || {}).types || [];
            setVar(a[0], Math.max(0, TYPES.indexOf(types[0]))); setVar(a[1], Math.max(0, TYPES.indexOf(types[1] || types[0])));
            break;
          }
          case "GetEVTotal": { const r = mon(a[1]); setVar(a[0], r ? Object.values(r.evs || {}).reduce((x, y) => x + (+y || 0), 0) : 0); break; }
          // (Not caught by you: from a trade, or someone else's.)
          case "PartyMonIsMine": { const r = mon(a[0]); setVar(a[1], r && (r.loan != null || (r.met && r.met.traded)) ? 1 : 0); break; }
          case "GetPartySlotWithFatefulEncounter": {
            const i = env.player().party.findIndex((r) => !r.egg && r.species === getVar(a[1]) && r.fateful);
            setVar(a[0], i >= 0 ? i : 255);
            break;
          }
          // Moves: what it knows, teaching one over another (the Summary
          // screen's move list to choose which), forgetting one (the Move
          // Deleter), and the Move Relearner and tutors (their screen).
          case "MonHasMove": { const r = mon(a[2]); setVar(a[0], r && !r.egg && r.moves.some((m) => m.name === moveName(getVar(a[1]))) ? 1 : 0); break; }
          case "CountMonMoves": { const r = mon(a[1]); setVar(a[0], r && !r.egg ? r.moves.length : 0); break; }
          case "SetMonMove": { const r = mon(a[0]); if (r) env.setMove(slot(a[0]), Math.min(+getVar(a[1]) || 0, r.moves.length), moveName(getVar(a[2]))); break; }
          case "MonForgetMove": { const r = mon(a[0]), i = +getVar(a[1]) || 0; if (r && r.moves.length > 1 && r.moves[i]) r.moves.splice(i, 1); break; }
          case "BufferPartyMonMoveName": { const r = mon(a[1]), m = r && r.moves[+getVar(a[2])]; buffers[a[0]] = m ? m.name : ""; break; }
          case "PokemonSummaryScreen": case "ScrCmd_394": {
            await flush();
            const i = mon(op === "ScrCmd_394" ? a[0] : a[1]) ? await env.chooseMoveToForget(slot(op === "ScrCmd_394" ? a[0] : a[1]), op === "ScrCmd_394" ? null : moveName(getVar(a[2]))) : -1;
            picked = i >= 0 ? i : 4;
            break;
          }
          case "GetMoveSelection": setVar(a[1], picked); break;
          case "ScrCmd_395": setVar(a[0], picked === 4 ? 255 : picked); break;
          // (Headbutt, Ilex Forest's tutor's: can it learn it? HGSS's tutor learnsets, or this game's.)
          case "ScrCmd_656": {
            const r = mon(a[0]), hgss = ((DATA().tutors || {}).Headbutt || []).includes(r && r.species);
            setVar(a[1], r && !r.egg && (hgss || env.canLearnTutor(slot(a[0]), "Headbutt")) ? 1 : 0);
            break;
          }
          case "ScrCmd_466": { const r = mon(a[1]); setVar(a[0], r && !r.egg && env.relearnable(slot(a[1])) > 0 ? 1 : 0); break; }
          case "MoveRelearnerInit": case "MoveTutorInit":
            await flush();
            picked = mon(a[0]) && (await env.relearn(slot(a[0]), op === "MoveTutorInit" ? [moveName(getVar(a[1]))] : null)) ? 0 : 255;
            break;
          case "MoveRelearnerGetResult": setVar(a[0], picked); break;
          // (The hour, for who's about: ScrCmd_522.)
          case "ScrCmd_522": setVar(a[0], gameTime().hour); break;
          case "ScrCmd_379": setVar(a[0], timeOfDay()); break;
          case "CountPCEmptySpace": setVar(a[0], env.pcSpace()); break;
          // (The pocket an item went in, by its name: BufferPocketName's.)
          case "GetItemPocket": setVar(a[1], env.itemPocket(getVar(a[0]))); break;
          case "BufferPocketName": buffers[a[0]] = String(getVar(a[1])); break;
          // (The screen shakes: HGSS's x and y, the frames between, how many times.)
          case "ScreenShake": await flush(); await env.shake(+getVar(a[3]) || 1, { x: +getVar(a[0]) || 0, y: +getVar(a[1]) || 0, delay: Math.max(1, +getVar(a[2]) || 1) * 2 }); break;
          // (One of the map's warps put elsewhere, as its OnTransition script does.)
          case "MoveWarp": env.moveWarp(null, +getVar(a[0]), (+getVar(a[1]) || 0) - origin.x, (+getVar(a[2]) || 0) - origin.y); break;

          // Battles.
          case "TrainerBattle": {
            await flush();
            lastBattle = await env.trainerBattle(a[0]);
            // (Lost: the game's already blacked you out, as WhiteOut would.)
            if (lastBattle === "lost") return;
            break;
          }
          case "WildBattle": {
            await flush();
            lastBattle = await env.wildBattle(a[0], +getVar(a[1]) || 5);
            if (lastBattle === "lost") return;
            break;
          }
          // (A Rocket trap: a wild Pokémon jumps out. A battle alongside someone: each foe in turn.)
          case "RocketTrapBattle": await flush(); lastBattle = await env.wildBattle(a[0], +getVar(a[1]) || 5); if (lastBattle === "lost") return; break;
          case "MultiBattle": {
            await flush();
            for (const t of [a[1], a[2]]) { lastBattle = await env.trainerBattle(t); if (lastBattle === "lost") return; }
            break;
          }
          case "CheckBattleWon": setVar(a[0], lastBattle === "won" || lastBattle === "caught" ? 1 : 0); break;
          case "GetStaticEncounterOutcome": case "StaticWildWonOrCaughtCheck": setVar(a[0], lastBattle === "caught" ? 4 : lastBattle === "won" ? 1 : 0); break;
          case "WhiteOut": return;

          // The Bug-Catching Contest (ui/bug-contest.js).
          case "BugContestAction": if (env.bugContest) { if (+a[0] === 0) env.bugContest.start(getVar(a[1])); else env.bugContest.end(); } break;
          case "IsBugContestantRegistered": setVar(a[1], env.bugContest && env.bugContest.registered(+getVar(a[0])) ? 1 : 0); break;
          case "JudgeBugContest": {
            const r = env.bugContest ? env.bugContest.judge() : { placement: 3, prize: 0, species: 0 };
            setVar(a[0], r.placement); setVar(a[1], r.prize); setVar(a[2], r.species);
            break;
          }
          case "BufferBugContestWinner": {
            const w = env.bugContest.winner(+a[0]);
            Object.assign(buffers, { 0: w.name, 1: w.species, 2: w.cls, 3: String(w.score) });
            break;
          }
          case "BufferBugContestMonNick": { const c = env.bugContest && env.bugContest.caughtNick(); if (c) buffers[a[0]] = c.nick; setVar(a[1], c && c.boxed ? 1 : 0); break; }
          case "BugContestGetTimeLeft": buffers[a[0]] = String(env.bugContest ? env.bugContest.minutesLeft() : 0); break;
          case "SetFlagVar": setFlag(flagNamed(getVar(a[0])), true); break;
          case "ClearFlagVar": setFlag(flagNamed(getVar(a[0])), false); break;

          // The Gyms' gimmicks (ui/johto-gymmicks.js): Violet's lift, Cianwood's winch.
          case "VioletGymElevator": await flush(); await env.violetLift(); break;
          case "CianwoodGymTurnWinch": await flush(); setVar(a[0], env.turnWinch() ? 1 : 0); break;

          // Kurt's Apricorn Balls (ui/johto-field.js): the Apricorns you have,
          // giving him some, what he has, and the Ball it makes.
          case "GetTotalApricornCount": case "ScrCmd_735": case "ScrCmd_737": case "ScrCmd_739": case "ClearKurtApricorn": {
            await flush();
            const v = await env.kurt(op);
            if (a.length) setVar(a[0], v);
            break;
          }
          // The follower Pokémon (ui/overworld.js) keeps up with you in a scene: wait for its step.
          // (Sent back into its Ball until you next go through a door: SetFollowMonInhibitState.)
          case "WaitFollowingPokemonMovement": await flush(); await env.followerIdle(); break;
          case "SetFollowMonInhibitState": env.followerHide(!!+getVar(a[0])); break;
          case "GetFollowPokePartyIndex": setVar(a[0], Math.max(0, env.player().party.findIndex((r) => !r.egg && r.hp > 0))); break;
          // The Ruins of Alph (ui/johto-alph.js): a chamber's stone panel (the
          // flag it sets once put together), the words on its wall, the Unown caught.
          case "AlphPuzzle": { await flush(); const f = await env.alphPuzzle(+getVar(a[0]) || 0); if (f) setFlag(f, true); break; }
          case "OpenAlphHiddenRoom": await flush(); await env.alphWall(+getVar(a[0]) || 0); break;
          case "ScrCmd_545": setVar(a[0], window.JohtoAlph.caughtCount(env.unownCaught())); break;
          case "CheckSeenAllLetterUnown": setVar(a[0], window.JohtoAlph.allLetters(env.unownCaught()) ? 1 : 0); break;
          // The Safari Zone (ui/johto-safari.js): the Safari Game, Baoba's tests, the Area Customizer.
          case "SafariZoneAction": env.safariAction(+getVar(a[0]) || 0); break;
          case "CheckSafariZoneChallengeCompleted": setVar(a[1], env.safariChallenge(+getVar(a[0]) || 0)); break;
          case "UpdateSafariZoneIGT": env.safariStamp(); break;
          case "ScrCmd_716": await flush(); if (await env.areaCustomizer()) setFlag("FLAG_UNK_99D", true); break;

          // The screen, and warps.
          case "FadeScreen": await flush(); await env.fade(+getVar(a[2]) === 0); break;
          // (Pixels across and up and down, frames each way at HGSS's 30 a second, times.)
          case "ScreenShake": await flush(); await env.shake(+getVar(a[3]) || 4, { x: +getVar(a[0]) || 0, y: +getVar(a[1]) || 0, delay: (+getVar(a[2]) || 1) * 2 }); break;
          // (The Magnet Train's ride, then off at the other station's platform: ui/magnet-train.js.)
          case "ScrCmd_722":
          case "Warp": {
            await flush();
            if (op === "ScrCmd_722") await env.magnetTrain(+getVar(a[0]) || 0, a[2], +getVar(a[3]) || 0, +getVar(a[4]) || 0);
            else await env.warp(a[0], +getVar(a[2]) || 0, +getVar(a[3]) || 0, DIRS[+getVar(a[4])] || "down");
            // (Or the scene goes on there, as HGSS's does: the Magnet Train's
            // attendant seeing you off the platform, tools/build-magnet-train.js.)
            if (a[5] === "goes on") break;
            // (What the script still sets once you're there, as the Ruins of
            // Alph's falls count themselves: its flags and vars, up to its end.)
            for (; pc < C.length && !["End", "GoTo", "Call", "Return"].includes(C[pc][0]); pc++) {
              const [o, x, y] = C[pc];
              if (o === "SetVar") setVar(x, y);
              else if (o === "AddVar") setVar(x, (+getVar(x) || 0) + (+getVar(y) || 0));
              else if (o === "SetFlag" || o === "ClearFlag") setFlag(x, o === "SetFlag");
            }
            return;
          }
          default:
            // (Conditional jumps and calls: GoToIfEq, CallIfNe, ...)
            if ((m = /^GoToIf(Lt|Eq|Gt|Le|Ge|Ne)$/.exec(op))) { if (cond[m[1]](cmp)) go(a[0]); }
            else if ((m = /^CallIf(Lt|Eq|Gt|Le|Ge|Ne)$/.exec(op))) { if (cond[m[1]](cmp)) { stack.push(pc); go(a[0]); } }
            // (The Pokéathlon's: its courses, Athlete Points, prizes and records, ui/pokeathlon.js.)
            else if (window.Pokeathlon && window.Pokeathlon.handles(op)) { await flush(); await window.Pokeathlon.command(op, a, { getVar, setVar, buffers, flag, setFlag }); }
            // (Everything else: locks, the follower Pokémon, photos,
            // ScrCmd_*: nothing here.)
        }
      }
      await flush();
    }

    // ---------- What runs when ----------
    // A map thing's script: "hgss:<zone>:<label>" (trainers, item balls and
    // the like are the game's own).
    function scriptOf(thing) {
      const m = /^hgss:(\w+):(\w+)/.exec((thing && thing.script) || "");
      return m ? { zone: m[1], label: m[2] } : null;
    }
    // A step's trigger: only while its var has its value.
    function triggerDue(script) {
      const m = /\?(\w+)=(-?\d+)$/.exec(script || "");
      return !m || +getVar(m[1]) === +m[2];
    }
    const zoneOf = (map) => (DATA().maps[map] || null);
    // Entering a map: its OnTransition script, which only sets flags and
    // vars (and where people stand), run straight away, before they're placed.
    // (Then its OnResume script, as HGSS runs it whenever the map comes back
    // into view: who's out, and where.)
    function transition(map) {
      resetTemp();
      const zone = zoneOf(map), z = zone && DATA().zones[zone];
      if (!z) return;
      for (const label of [z.hdr.transition, z.hdr.resume]) if (label && label in z.labels) runQuick(zone, z, label, map);
    }
    function runQuick(zone, z, label, map) {
      let pc = z.labels[label], cmp = 1;
      const stack = [];
      const cond = { Lt: (c) => c === 0, Eq: (c) => c === 1, Gt: (c) => c === 2, Le: (c) => c !== 2, Ge: (c) => c !== 0, Ne: (c) => c !== 1 };
      for (let guard = 0; guard < 5000 && pc < z.cmds.length; guard++) {
        const [op, ...a] = z.cmds[pc++];
        let m;
        if (op === "End") return;
        if (op === "Return") { if (!stack.length) return; pc = stack.pop(); continue; }
        if (op === "GoTo") { pc = z.labels[a[0]] != null ? z.labels[a[0]] : pc; continue; }
        if (op === "Call") { stack.push(pc); pc = z.labels[a[0]] != null ? z.labels[a[0]] : pc; continue; }
        if (op === "Compare") { const x = +getVar(a[0]) || 0, y = +getVar(a[1]) || 0; cmp = x < y ? 0 : x === y ? 1 : 2; continue; }
        if (op === "GoToIfSet" || op === "GoToIfUnset") { if (flag(a[0]) === (op === "GoToIfSet") && a[1] in z.labels) pc = z.labels[a[1]]; continue; }
        if (op === "SetFlag") setFlag(a[0], true);
        else if (op === "ClearFlag") setFlag(a[0], false);
        else if (op === "SetVar") setVar(a[0], a[1]);
        else if (op === "CopyVar" || op === "SetOrCopyVar") setVar(a[0], getVar(a[1]));
        else if (op === "AddVar") setVar(a[0], (+getVar(a[0]) || 0) + (+getVar(a[1]) || 0));
        else if (op === "GetWeekday") { const d = contestWeekday(zone, z.cmds, pc, state()); setVar(a[0], d != null ? d : gameTime().weekday); }
        else if (op === "IsBugContestantRegistered") setVar(a[1], env.bugContest && env.bugContest.registered(+getVar(a[0])) ? 1 : 0);
        else if (op === "CheckBadge") setVar(a[1], env.hasBadge(+getVar(a[0])) ? 1 : 0);
        else if (op === "GetGameVersion") setVar(a[0], DATA().version || 7);
        else if (op === "ScrCmd_379") setVar(a[0], timeOfDay());
        // (One of the map's warps put elsewhere: Route 47's to the Embedded Tower, HeartGold's room.)
        else if (op === "MoveWarp") {
          const o = env.origin(zone) || { x: 0, y: 0 };
          env.moveWarp(map, +getVar(a[0]), (+getVar(a[1]) || 0) - o.x, (+getVar(a[2]) || 0) - o.y);
        }
        else if (op === "GetPhoneBookRematch") setVar(a[1], env.phoneRematch(+getVar(a[0])) ? 1 : 0);
        else if (op === "CheckRegisteredPhoneNumber") setVar(a[1], (state().phone || []).includes(a[0]) ? 1 : 0);
        else if ((m = /^GoToIf(Lt|Eq|Gt|Le|Ge|Ne)$/.exec(op))) { if (cond[m[1]](cmp) && a[0] in z.labels) pc = z.labels[a[0]]; }
        else if ((m = /^CallIf(Lt|Eq|Gt|Le|Ge|Ne)$/.exec(op))) { if (cond[m[1]](cmp) && a[0] in z.labels) { stack.push(pc); pc = z.labels[a[0]]; } }
        // (A person put elsewhere: where the map will place them.)
        else if (op === "MovePersonFacing") {
          const o = env.origin(zone) || { x: 0, y: 0 };
          // (Someone by their number on the map, from a var: the park's contestants lining up.)
          let id = getVar(a[0]);
          if (typeof id === "number") { const p = ((window.WORLD_MAPS || {})[map] || { people: [] }).people.find((q) => q.id === id); id = p ? p.localId : id; }
          temp.pos[id] = { x: (+getVar(a[1]) || 0) - o.x, y: (+getVar(a[3]) || 0) - o.y, facing: DIRS[+getVar(a[4])] || "down" };
        }
      }
    }
    // The map's frame table: the first script whose var has its value.
    function frameScript(map) {
      const zone = zoneOf(map), z = zone && DATA().zones[zone];
      if (!z) return null;
      for (const [v, val, label] of z.hdr.frame) {
        if (+getVar(v) !== +val) continue;
        if (label in z.labels) return { zone, label };
        // (A std script: the Bug-Catching Contest's judging.)
        const std = DATA().std && DATA().std[label];
        if (std) return { zone: std[0], label: std[1] };
      }
      return null;
    }
    return { run, scriptOf, triggerDue, transition, frameScript, flag, setFlag, getVar, setVar, resetTemp, zoneOf, state, placed };
  }

  window.JohtoScript = { create };
})();
