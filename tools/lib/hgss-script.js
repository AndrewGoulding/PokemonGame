// HeartGold's field scripts (pret/pokeheartgold's files/fielddata/script/scr_seq)
// compiled for this game's interpreter (ui/johto-script.js). tools/build-johto.js
// uses it.
//
//   const S = require("./hgss-script");
//   const c = S.compiler(ROOT, { item, species, trainer });
//   c.zone("R30")   // { cmds, labels, moves, scripts, hdr } for a zone's scr_seq
//   c.init()        // the new game's script (scr_seq_0149): the flags HGSS starts with
//   c.messages      // { msg id or "bank:N:i": [pages] } every message the zones use
//   c.compileSource(src)   // a script file that isn't a zone's (a std one, as scr_seq_0151), compiled the same way
//
// A zone's script is one flat list of commands, [name, ...args], with its
// labels as indexes into it (a label's script runs on into the next, as
// HGSS's does). Args: numbers; names the interpreter knows by their prefix
// (VAR_, FLAG_, obj_, msg_, labels); "player" for obj_player; items as this
// game's item ids, species as its names, trainers as "HGSS_TRAINER_*".
// Movements (a label's commands up to EndMovement) are turned into FireRed's
// movement commands (walk_left, face_up, ...): moves[label].
"use strict";

const fs = require("fs");
const path = require("path");

// HGSS movements as FireRed's (ui/overworld.js's startCommand), with how
// many times each repeats from its count. (HGSS walks a tile in 8 frames,
// FireRed in 16; its "Normal" is FireRed's walk, "Fast" its fast walk.)
const DIR = { North: "up", South: "down", West: "left", East: "right" };
const SPEED = { Slower: "slow_", Slow: "slow_", Normal: "", SlightlyFast: "fast_", EverSoSlightlyFast: "", Fast: "fast_",
  SlightlyFaster: "fast_", Faster: "faster_", Fastest: "fastest_" };
function frMove(name, n) {
  let m;
  const rep = (x) => Array(Math.max(1, n)).fill(x);
  if ((m = /^Face(North|South|West|East)$/.exec(name))) return ["face_" + DIR[m[1]]];
  if ((m = /^Walk(Slower|Slow|Normal|SlightlyFast|EverSoSlightlyFast|SlightlyFaster|Fast|Faster|Fastest)(North|South|West|East)$/.exec(name))) return rep("walk_" + SPEED[m[1]] + DIR[m[2]]);
  if ((m = /^Run(North|South|West|East)$/.exec(name))) return rep("walk_fast_" + DIR[m[1]]);
  if ((m = /^WalkOnSpot(Slower|Slow|Normal|Fast|Faster)(North|South|West|East)$/.exec(name))) {
    const s = { Slower: "", Slow: "", Normal: "", Fast: "fast_", Faster: "faster_" }[m[1]];
    return rep("walk_in_place_" + s + DIR[m[2]]);
  }
  // (A hop on the spot: FireRed has none for people, so a quick turn that way.)
  if ((m = /^JumpOnSpot(Slow|Fast)(North|South|West|East)$/.exec(name))) return rep("walk_in_place_fast_" + DIR[m[2]]);
  if ((m = /^JumpNear(Slow|Fast)(North|South|West|East)$/.exec(name))) return rep("jump_" + DIR[m[2]]);
  if ((m = /^Jump(Far|Farther)(North|South|West|East)$/.exec(name))) return rep("jump_2_" + DIR[m[2]]);
  // (HGSS's field runs at 30 frames a second, this game's at 60.)
  if ((m = /^Delay(\d+)$/.exec(name))) return ["delay_" + (+m[1] * 2 * Math.max(1, n))];
  if (name === "SetInvisible") return ["set_invisible"];
  if (name === "SetVisible") return ["set_visible"];
  if (name === "LockDir") return ["lock_facing_direction"];
  if (name === "UnlockDir") return ["unlock_facing_direction"];
  if (name === "EmoteExclamationMark" || name === "EmoteExclamation2") return ["emote_exclamation_mark"];
  if (name === "EmoteQuestionMark") return ["emote_question_mark"];
  return [];
}
const isMovement = (name) => name === "EndMovement" || /^(Face(North|South|West|East)$|Walk|Run|JumpOnSpot|JumpNear|JumpFar|Delay\d|SetInvisible|SetVisible|LockDir|UnlockDir|Emote|WarpOut|WarpIn|PauseAnimation|ResumeAnimation|NurseJoyBow|RevealTrainer|PlayerGive|PlayerReceive|MoveAction_)/.test(name);

// HGSS text as this game's pages: \r and \f end a page, \n a line; a
// buffer ({STRVAR_1 3, 0, 0}: buffer 0) is {BUF0}, filled in when it's shown.
function pages(text) {
  if (text == null) return null;
  const s = [].concat(text).join("").replace(/\{STRVAR_\d+ \d+, (\d+)(, \d+)*\}/g, "{BUF$1}")
    .replace(/\{[^}]*\}/g, (m) => (/^\{BUF\d+\}$/.test(m) ? m : "")).replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
  return s.split(/[\r\f]/).map((p) => p.replace(/\n$/, "")).filter((p) => p.trim());
}

function compiler(ROOT, conv) {
  const F = (p) => path.join(ROOT, "files", p);
  const SCR = F("fielddata/script/scr_seq");
  const scrFiles = fs.readdirSync(SCR);
  // #defines: numbers (DIR_EAST, STICKS_ACTIVE, ...) from the constants headers.
  const defines = {};
  const readDefines = (file) => {
    for (const m of fs.readFileSync(file, "utf8").matchAll(/#define\s+(\w+)\s+(0x[0-9a-fA-F]+|\d+)\b/g)) defines[m[1]] = +m[2];
  };
  for (const f of fs.readdirSync(path.join(ROOT, "include/constants"))) if (f.endsWith(".h")) readDefines(path.join(ROOT, "include/constants", f));
  // Message files: by name (msg_0375_R30) and by bank number (MsgBoxExtern's).
  const msgDir = F("msgdata/msg"), msgFiles = fs.readdirSync(msgDir);
  const msgCache = {};
  function msgFile(prefix) {
    if (!(prefix in msgCache)) {
      const file = msgFiles.find((f) => f === prefix + ".json" || f.startsWith(prefix + "_") && /^msg_\d+$/.test(prefix));
      msgCache[prefix] = file ? JSON.parse(fs.readFileSync(path.join(msgDir, file), "utf8")).messages : [];
    }
    return msgCache[prefix];
  }
  // (yesno: the messages that end asking Yes or No, {YESNO}: GetMenuChoice reads it, 0 for Yes.)
  const messages = {}, yesno = {};
  const asks = (text) => /\{YESNO/.test([].concat(text).join(""));
  function needMsg(id) {
    if (messages[id]) return;
    const m = /^(msg_\d+(?:_\w+?)?)_(\d{5})$/.exec(id);
    if (!m) return;
    const found = msgFile(m[1]).find((x) => x.id === id);
    if (found) { messages[id] = pages(found.en_US); if (asks(found.en_US)) yesno[id] = 1; }
  }
  function needBank(bank) {
    const prefix = "msg_" + String(bank).padStart(4, "0");
    msgFile(prefix).forEach((x, i) => {
      if (x.en_US == null) return;
      messages["bank:" + bank + ":" + i] = pages(x.en_US);
      if (asks(x.en_US)) yesno["bank:" + bank + ":" + i] = 1;
    });
  }
  // (The banks MsgBoxExtern reads, by GetStdMsgNaix's number: src/field/scrcmd_message.c.)
  const STD_BANKS = [752, 211, 30, 435];
  STD_BANKS.forEach(needBank);
  // (And the standard menus' words, MenuInitStdGmm's: msg_0191.)
  needBank(191);

  function arg(tok, labels) {
    tok = tok.trim();
    if (/^-?\d+$/.test(tok)) return +tok;
    if (/^0x[0-9a-f]+$/i.test(tok)) return parseInt(tok, 16);
    if (tok === "obj_player") return "player";
    if (/^(VAR_|FLAG_|obj_|std_|MOVE_)/.test(tok)) return tok;   // (std_*: CallStd's scripts, by name; moves by name)
    if (/^msg_/.test(tok)) { needMsg(tok); return tok; }
    if (/^ITEM_/.test(tok)) return conv.item(tok) || tok;
    if (/^SPECIES_/.test(tok)) return conv.species(tok) || tok;
    if (/^TRAINER_/.test(tok)) return "HGSS_" + tok;
    if (tok in defines) return defines[tok];
    if (tok === "TRUE") return 1;
    if (tok === "FALSE") return 0;
    return tok;   // (a label, or a name the interpreter knows)
  }
  // "_EV_scr_seq_R30_009 + 1": the script it names, scr_seq_R30_009.
  const scriptRef = (s) => { const m = /(scr_seq_\w+?_\d+|scr_seq_\w+)/.exec(String(s)); return m ? m[1] : null; };

  function parse(src) {
    const cmds = [], labels = {};
    for (const raw of src.split("\n")) {
      const line = raw.replace(/\/\/.*$/, "").replace(/\s+$/, "");
      if (!line || /^\s*[#.]/.test(line)) continue;
      const lab = /^(\w+):$/.exec(line);
      if (lab) { labels[lab[1]] = cmds.length; continue; }
      const m = /^\s+(\w+)\s*(.*)$/.exec(line);
      if (!m) continue;
      const args = m[2] ? m[2].split(",").map((a) => a.trim()) : [];
      cmds.push([m[1]].concat(args));
    }
    return { cmds, labels };
  }

  function compileSource(src) {
    const { cmds, labels } = parse(src);
    const scripts = cmds.filter((c) => c[0] === "ScrDef").map((c) => c[1]);
    // Movements: each label whose commands are movements, up to EndMovement.
    const moves = {};
    for (const [name, at] of Object.entries(labels)) {
      if (!cmds[at] || !isMovement(cmds[at][0])) continue;
      const list = [];
      for (let i = at; i < cmds.length && cmds[i][0] !== "EndMovement"; i++) list.push(...frMove(cmds[i][0], +(cmds[i][1] || 1)));
      moves[name] = list;
    }
    const out = cmds.map((c) => (isMovement(c[0]) || c[0] === "ScrDef" || c[0] === "ScrDefEnd" ? ["Nop"] : [c[0]].concat(c.slice(1).map((a) => arg(a, labels)))));
    return { cmds: out, labels, moves, scripts };
  }

  function zone(z) {
    // (Or a shared one by its number, as the Pokéathlon's receptions, scr_seq_0167.)
    const file = scrFiles.find((f) => new RegExp("^scr_seq_\\d+_" + z + "\\.s$").test(f) || f === "scr_seq_" + z + ".s");
    if (!file) return null;
    const ev = path.join(SCR, "event_" + z + ".h");
    if (fs.existsSync(ev)) readDefines(ev);
    const c = compileSource(fs.readFileSync(path.join(SCR, file), "utf8"));
    // The map's own scripts (its _hdr): on entering it, on coming back to it
    // (after a battle or a menu), and each frame while a var has a value.
    const hfile = scrFiles.find((f) => new RegExp("^scr_seq_\\d+_" + z + "_hdr\\.s$").test(f));
    const hdr = { frame: [] };
    if (hfile) {
      const src = fs.readFileSync(path.join(SCR, hfile), "utf8");
      for (const m of src.matchAll(/InitScriptEntry_(OnTransition|OnResume|OnLoad|OnFrameTable)\s+(.+)/g)) {
        if (m[1] !== "OnFrameTable") hdr[m[1].slice(2).toLowerCase()] = scriptRef(m[2]);
      }
      for (const m of src.matchAll(/InitScriptGoToIfEqual\s+(\w+),\s*(\w+),\s*(.+)/g)) hdr.frame.push([m[1], arg(m[2]), scriptRef(m[3])]);
    }
    c.hdr = hdr;
    // (Its own messages' bank, for NonNPCMsgVar's: a message by its number, all of them.)
    const bank = msgFiles.find((f) => new RegExp("^msg_\\d+_" + z + "\\.json$").test(f));
    if (bank && c.cmds.some((x) => /^(NonNPCMsgVar|NPCMsgVar)$/.test(x[0]))) {
      c.bank = bank.replace(/\.json$/, "");
      for (const x of msgFile(c.bank)) needMsg(x.id);
    }
    return c;
  }
  // The new game's flags (scr_seq_0149: what's hidden until the story gets to it).
  function init() {
    const file = scrFiles.find((f) => /^scr_seq_0149\.s$/.test(f));
    return compileSource(fs.readFileSync(path.join(SCR, file), "utf8")).cmds.filter((c) => c[0] === "SetFlag" || c[0] === "SetVar").map((c) => c.slice(0));
  }
  return { zone, init, messages, yesno, scriptRef, needMsg, pages, defines, compileSource };
}

module.exports = { compiler, frMove, pages };
