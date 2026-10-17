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
//   warp(mapConst, x, y, facing), hasBadge(n), sleep(ms), isGirl(), map().
(function () {
  "use strict";

  const DATA = () => window.JOHTO_SCRIPTS || { zones: {}, messages: {}, init: [], maps: {} };
  const DIRS = ["up", "down", "left", "right"];   // (HGSS's DIR_NORTH ... DIR_EAST)

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
      return s;
    };
    const isTemp = (name) => /^(FLAG_MAPTEMP_|VAR_TEMP_|VAR_SPECIAL_)/.test(name);
    const flag = (name) => !!(isTemp(name) ? temp.f[name] : state().f[name]);
    function setFlag(name, on) {
      const o = isTemp(name) ? temp.f : state().f;
      if (on) o[name] = true; else delete o[name];
    }
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
      let pc = L[label], cmp = 1, sw = 0, lastBattle = null, menu = null, choice = 0;
      const stack = [], pending = [];
      const go = (l) => { if (l in L) pc = L[l]; };
      const who = (obj) => (obj === "player" ? "player" : obj);
      const flush = async () => { if (pending.length) { const t = pending.splice(0); await env.act(t); } };
      // (Is a YesNo coming, so the last page should be the question?)
      const nextIsYesNo = (i) => { for (let k = i; k < C.length && k < i + 4; k++) { if (C[k][0] === "YesNo") return true; if (!/^(Nop|ScrCmd_|TouchscreenMenu)/.test(C[k][0])) return false; } return false; };
      let question = null;
      async function show(pages) {
        if (!pages || !pages.length) return;
        await flush();
        if (nextIsYesNo(pc)) { if (pages.length > 1) await env.say(pages.slice(0, -1)); question = pages[pages.length - 1]; return; }
        await env.say(pages);
      }
      const cond = { Lt: (c) => c === 0, Eq: (c) => c === 1, Gt: (c) => c === 2, Le: (c) => c !== 2, Ge: (c) => c !== 0, Ne: (c) => c !== 1 };
      for (let guard = 0; guard < 20000 && pc < C.length; guard++) {
        const [op, ...a] = C[pc++];
        let m;
        switch (op) {
          case "End": await flush(); return;
          case "Return": if (!stack.length) { await flush(); return; } pc = stack.pop(); break;
          case "GoTo": go(a[0]); break;
          case "Call": stack.push(pc); go(a[0]); break;
          case "Compare": { const x = +getVar(a[0]) || 0, y = +getVar(a[1]) || 0; cmp = x < y ? 0 : x === y ? 1 : 2; break; }
          case "GoToIfSet": if (flag(a[0])) go(a[1]); break;
          case "GoToIfUnset": if (!flag(a[0])) go(a[1]); break;
          case "CallIfSet": if (flag(a[0])) { stack.push(pc); go(a[1]); } break;
          case "CallIfUnset": if (!flag(a[0])) { stack.push(pc); go(a[1]); } break;
          case "Switch": sw = +getVar(a[0]) || 0; setVar("VAR_SPECIAL_x8008", sw); break;
          case "Case": if (sw === +getVar(a[0])) go(a[1]); break;
          case "SetVar": setVar(a[0], a[1]); break;
          case "CopyVar": case "SetOrCopyVar": setVar(a[0], getVar(a[1])); break;
          case "AddVar": setVar(a[0], (+getVar(a[0]) || 0) + (+getVar(a[1]) || 0)); break;
          case "SubVar": setVar(a[0], (+getVar(a[0]) || 0) - (+getVar(a[1]) || 0)); break;
          case "SetFlag": setFlag(a[0], true); break;
          case "ClearFlag": setFlag(a[0], false); break;
          case "CheckFlag": cmp = flag(a[0]) ? 1 : 0; break;

          // Messages.
          case "NPCMsg": case "NonNPCMsg": await show(text(a[0])); break;
          case "SimpleNPCMsg": if (ctx.person) await env.facePlayer(ctx.person); await show(text(a[0])); env.close(); break;
          case "MsgBoxExtern": case "NonNPCMsgExtern": await show(text("bank:" + getVar(a[0]) + ":" + getVar(a[1]))); break;
          case "GenderMsgBox": await show(text(env.isGirl() ? a[1] : a[0])); break;
          case "TrainerTipsEx": await show(text(a[1])); env.close(); break;
          case "DirectionSignpostEx": await show(text(a[2])); env.close(); break;
          case "CloseMsg": env.close(); break;
          case "YesNo": {
            const yes = await env.confirm(question || "");
            question = null;
            setVar(a[0], yes ? 0 : 1);
            break;
          }
          case "BufferPlayersName": buffers[a[0]] = env.player().name; break;
          case "BufferRivalsName": buffers[a[0]] = "Silver"; break;
          case "BufferFriendsName": buffers[a[0]] = env.isGirl() ? "Ethan" : "Lyra"; break;
          case "BufferMonSpeciesName": case "BufferPartyMonSpeciesNameIndef": {
            const r = env.player().party[+getVar(a[1]) || 0];
            buffers[a[0]] = r ? r.species : "";
            break;
          }
          case "BufferPartyMonNick": { const r = env.player().party[+getVar(a[1]) || 0]; buffers[a[0]] = r ? (r.nickname || r.species) : ""; break; }

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
          case "GetPlayerFacing": setVar(a[0], Math.max(0, DIRS.indexOf(env.personAt("player").facing))); break;

          // Items, Pokémon, badges.
          case "GiveItemNoCheck": await flush(); await env.giveItem(a[0], +getVar(a[1]) || 1, "received"); break;
          case "CallStd":
            if (a[0] === "std_give_item_verbose" || a[0] === "std_obtain_item_verbose") {
              await flush();
              await env.giveItem(getVar("VAR_SPECIAL_x8004"), +getVar("VAR_SPECIAL_x8005") || 1, a[0] === "std_give_item_verbose" ? "received" : "obtained");
            } else if (a[0] === "std_bag_is_full") await env.say(["The Bag is full…"]);
            break;
          case "GoToIfNoItemSpace": break;   // (this game's Bag never fills)
          case "HasSpaceForItem": setVar(a[2], 1); break;
          case "HasItem": setVar(a[2], env.hasItem(getVar(a[0]), +getVar(a[1]) || 1) ? 1 : 0); break;
          case "TakeItem": setVar(a[2], env.takeItem(getVar(a[0]), +getVar(a[1]) || 1) ? 1 : 0); break;
          case "GetItemQuantity": setVar(a[1], env.itemCount(getVar(a[0]))); break;
          case "CheckBadge": setVar(a[1], env.hasBadge(+getVar(a[0])) ? 1 : 0); break;
          case "GetPartyCount": setVar(a[0], env.player().party.length); break;
          case "CountAliveMons": setVar(a[0], env.player().party.filter((r) => !r.egg && r.hp > 0).length); break;
          case "GetPartyLeadAlive": setVar(a[0], Math.max(0, env.player().party.findIndex((r) => !r.egg && r.hp > 0))); break;
          case "GetPartyMonSpecies": { const r = env.player().party[+getVar(a[0]) || 0]; setVar(a[1], r ? r.species : 0); break; }
          case "GetPlayerGender": setVar(a[0], env.isGirl() ? 1 : 0); break;
          case "GetWeekday": setVar(a[0], new Date().getDay()); break;
          case "PlayerOnBikeCheck": setVar(a[0], env.onBike() ? 1 : 0); break;
          case "PhotoAlbumIsFull": case "KenyaCheck": case "KenyaCheckPartyOrMailbox": case "MonHasRibbon": case "FollowerPokeIsEventTrigger":
          case "CheckDaycareEgg": case "MonHasMove": case "GetStarterChoice":
            setVar(a[a.length - 1], 0);
            break;

          // Sounds.
          case "PlayCry": env.cry(getVar(a[0])); break;
          case "PlayFanfare": env.fanfare(); break;
          case "Wait": await env.sleep((+getVar(a[0]) || 0) * 33); break;

          // Menus.
          case "MenuInitStdGmm": menu = { bank: getVar(a[4]), items: [] }; break;
          case "MenuItemAdd": if (menu) menu.items.push({ text: (text("bank:" + menu.bank + ":" + a[0]) || ["…"])[0], value: a[2] }); break;
          case "MenuExec": {
            await flush();
            const i = menu && menu.items.length ? await env.choose(menu.items.map((x) => x.text)) : -1;
            choice = i >= 0 && menu ? menu.items[i].value : (menu && menu.items.length ? menu.items[menu.items.length - 1].value : 0);
            setVar("VAR_SPECIAL_RESULT", choice);
            menu = null;
            break;
          }
          case "GetMenuChoice": setVar(a[0], choice); break;

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
          case "CheckBattleWon": setVar(a[0], lastBattle === "won" || lastBattle === "caught" ? 1 : 0); break;
          case "GetStaticEncounterOutcome": case "StaticWildWonOrCaughtCheck": setVar(a[0], lastBattle === "caught" ? 4 : lastBattle === "won" ? 1 : 0); break;
          case "WhiteOut": return;

          // The screen, and warps.
          case "FadeScreen": await flush(); await env.fade(+getVar(a[2]) === 0); break;
          case "Warp": await flush(); await env.warp(a[0], +getVar(a[2]) || 0, +getVar(a[3]) || 0, DIRS[+getVar(a[4])] || "down"); return;
          default:
            // (Conditional jumps and calls: GoToIfEq, CallIfNe, ...)
            if ((m = /^GoToIf(Lt|Eq|Gt|Le|Ge|Ne)$/.exec(op))) { if (cond[m[1]](cmp)) go(a[0]); }
            else if ((m = /^CallIf(Lt|Eq|Gt|Le|Ge|Ne)$/.exec(op))) { if (cond[m[1]](cmp)) { stack.push(pc); go(a[0]); } }
            // (Everything else: locks, the follower Pokémon, the Pokégear,
            // phone calls, photos, ScrCmd_*: nothing here.)
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
    function transition(map) {
      resetTemp();
      const zone = zoneOf(map), z = zone && DATA().zones[zone];
      if (!z || !z.hdr.transition || !(z.hdr.transition in z.labels)) return;
      let pc = z.labels[z.hdr.transition], cmp = 1;
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
        else if (op === "GetWeekday") setVar(a[0], new Date().getDay());
        else if ((m = /^GoToIf(Lt|Eq|Gt|Le|Ge|Ne)$/.exec(op))) { if (cond[m[1]](cmp) && a[0] in z.labels) pc = z.labels[a[0]]; }
        else if ((m = /^CallIf(Lt|Eq|Gt|Le|Ge|Ne)$/.exec(op))) { if (cond[m[1]](cmp) && a[0] in z.labels) { stack.push(pc); pc = z.labels[a[0]]; } }
        // (A person put elsewhere: where the map will place them.)
        else if (op === "MovePersonFacing") {
          const o = env.origin(zone) || { x: 0, y: 0 };
          temp.pos[a[0]] = { x: (+getVar(a[1]) || 0) - o.x, y: (+getVar(a[3]) || 0) - o.y, facing: DIRS[+getVar(a[4])] || "down" };
        }
      }
    }
    // The map's frame table: the first script whose var has its value.
    function frameScript(map) {
      const zone = zoneOf(map), z = zone && DATA().zones[zone];
      if (!z) return null;
      for (const [v, val, label] of z.hdr.frame) if (+getVar(v) === +val && label in z.labels) return { zone, label };
      return null;
    }
    return { run, scriptOf, triggerDue, transition, frameScript, flag, setFlag, getVar, setVar, resetTemp, zoneOf, state, placed };
  }

  window.JohtoScript = { create };
})();
