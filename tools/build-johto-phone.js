// Builds the Pokégear's phone and radio from HeartGold (a pret/pokeheartgold
// checkout), for ui/pokegear.js:
//
//   node tools/build-johto-phone.js <path to pokeheartgold>   (or set POKEHEARTGOLD)
//
// Writes tools/lib/johto-phone.generated.js, which tools/build-johto.js puts at
// the end of data/johto-maps.js (and puts it there itself, in place of an
// earlier run's):
//
//   window.JOHTO_PHONE = {
//     contacts,   // HGSS's 75 phone book entries (files/tel/pmtel_book.json, by
//                 // PHONE_CONTACT_* number): name and class as the Pokégear
//                 // lists them, the kind of call (PHONECALLTYPE_*), their
//                 // trainer, map and its section's name, gift, script when
//                 // you're on their map, greeting row, rematch day and time,
//                 // incoming-call group, and their own message bank
//                 // (msg_0640 + GetPhoneMessageGmm: 0 their name, 1-5 what
//                 // they say giving their number and a gift, then their calls)
//     scripts,    // gPhoneCallScriptDef (phone_script_defs.c), by PHONE_SCRIPT_*:
//                 // [boy's message, girl's message, kind (PHONESCRIPTTYPE_*), param0, param1]
//     generic,    // sGenericPhoneCallHeaders, 16 a contact (8 calling them, 8 them
//                 // calling): [type (PHONECALLGENERIC_*), chance, handler, script]
//     greetings,  // sGreetingMsgIDs: msg_0640's greetings, 12 a row (calling,
//                 // then called: morning, day, night, boy and girl each)
//     rematch,    // sTrainerRematchSets (overlay_26): each trainer's rematch tiers
//     elmCalls, oakCall, baobaCall,  // the scripts' PhoneCall story calls
//     friend,     // Ethan's and Lyra's: a message for where you are (by map section), and their chatter
//     noCalls, noRadio,  // the maps (HGSS's MAP_*) you can't get calls on, or the radio
//     common,     // msg_0271 and msg_0040's phone lines
//     radio       // the stations' shows (msg_0409-0418), Buena's passwords, and where the Unown and Mahogany signals are
//   }
//
// and adds each phone trainer's rematch tiers (TRAINER_YOUNGSTER_JOEY_2 ...) to
// window.WORLD_TRAINERS as tools/build-johto.js adds HGSS's trainers.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const HS = require("./lib/hgss-script");
const N = require("./lib/nitro");
const { writePng } = require("./lib/png");

const ROOT = process.argv[2] || process.env.POKEHEARTGOLD;
if (!ROOT || !fs.existsSync(path.join(ROOT, "files/tel/pmtel_book.json"))) {
  console.error("Usage: node tools/build-johto-phone.js <path to pret/pokeheartgold>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const src = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const json = (f) => JSON.parse(src(f));
global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, "data/dex.js"), "utf8"));
vm.runInThisContext(fs.readFileSync(path.join(root, "data/items.js"), "utf8"));

// ---------- Names: species, items, constants ----------

const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const dexByID = {};
for (const k of Object.keys(window.DEX)) if (window.DEX[k].id < 10000) dexByID[toID(k)] = k;
const species = (s) => dexByID[toID(String(s).replace(/^SPECIES_/, ""))] || null;
const itemByKey = {};
for (const id of Object.keys(window.ITEMS)) itemByKey[id.replace(/[^a-z0-9]/g, "")] = id;
// (As tools/build-johto.js names them.)
const ITEM_ALIAS = { PARLYZ_HEAL: "paralyze-heal", POKE_BALL: "poke-ball", X_DEFEND: "x-defense", X_SPECIAL: "x-sp-atk", HP_UP: "hp-up", PP_UP: "pp-up",
  KINGS_ROCK: "kings-rock", BLACKGLASSES: "black-glasses", NEVERMELTICE: "never-melt-ice", TWISTEDSPOON: "twisted-spoon", SILVERPOWDER: "silver-powder",
  THUNDERSTONE: "thunder-stone", TINYMUSHROOM: "tiny-mushroom", BRIGHTPOWDER: "bright-powder", ENERGYPOWDER: "energy-powder" };
const item = (c) => {
  const k = String(c).replace(/^ITEM_/, "");
  if (k === "NONE") return null;
  if (ITEM_ALIAS[k] && window.ITEMS[ITEM_ALIAS[k]]) return ITEM_ALIAS[k];
  return itemByKey[k.toLowerCase().replace(/[^a-z0-9]/g, "")] || null;
};
const defines = (file) => {
  const o = {};
  for (const m of src(file).matchAll(/#define (\w+)\s+(0x[0-9a-fA-F]+|\d+)\b/g)) o[m[1]] = +m[2];
  return o;
};
const SCRIPT_NO = defines("include/constants/phone_scripts.h");
const CLASS_NO = defines("include/constants/trainer_class.h");
const TRAINER_NO = defines("include/constants/trainers.h");
const WEEK = { RTC_WEEK_SUNDAY: 0, RTC_WEEK_MONDAY: 1, RTC_WEEK_TUESDAY: 2, RTC_WEEK_WEDNESDAY: 3, RTC_WEEK_THURSDAY: 4, RTC_WEEK_FRIDAY: 5, RTC_WEEK_SATURDAY: 6, RTC_WEEK_MAX: 7 };
const TIME = { TIMEOFDAY_WILD_MORN: 0, TIMEOFDAY_WILD_DAY: 1, TIMEOFDAY_WILD_NITE: 2, TIMEOFDAY_WILD_MAX: 3 };
const ENUM = (file, name) => {
  const body = src(file).split("enum " + name)[1].split("}")[0];
  const o = {};
  let n = 0;
  for (const m of body.matchAll(/(\w+)(?:\s*=\s*(\d+))?,/g)) { if (m[2]) n = +m[2]; o[m[1]] = n++; }
  return o;
};
const CALLTYPE = ENUM("include/application/pokegear/phone/phone_internal.h", "PhoneCallType");
const GENERIC = ENUM("include/application/pokegear/phone/phone_internal.h", "GenericPhoneCallType");
const SCRIPTTYPE = defines("include/constants/phone_scripts.h");

// ---------- Text ----------

const msgs = {};
const bank = (n) => msgs[n] || (msgs[n] = json("files/msgdata/msg/msg_" + String(n).padStart(4, "0") + ".json").messages.map((x) => x.en_US));
const pages = (t) => HS.pages(t) || [];
const line = (t) => [].concat(t == null ? "" : t).join("").replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
// (msg_0716_00033: its number in its bank.)
const msgNo = (id) => +/_(\d{5})$/.exec(id)[1];
const classNames = bank(730).map(line);
const words = bank(271).map(line);

// Map sections and their names (as tools/build-johto-town-map.js reads them).
const headers = {};
for (const m of src("src/data/map_headers.h").matchAll(/\[(MAP_\w+)\] = \{([^}]*)\}/g)) {
  const get = (k) => { const r = new RegExp("\\." + k + " = (\\w+)").exec(m[2]); return r ? r[1] : null; };
  headers[m[1]] = { mapsec: (get("mapsec") || "").replace(/^MAPSEC_/, ""), calls: get("incomingCalls") !== "FALSE", radio: get("radioSignal") !== "FALSE" };
}
const mapsecNo = defines("include/constants/map_sections.h");
const places = bank(279).map(line);
const placeName = (sec) => (places[mapsecNo["MAPSEC_" + sec]] || "").replace(/\b([A-Z])([A-Z]{3,})\b/g, (x, a, b) => a + b.toLowerCase());

// ---------- The phone book ----------

const BOOK = json("files/tel/pmtel_book.json").pmtel_book;
const GMM = [...src("src/phonebook_dat.c").split("sPhoneMessageGmm[]")[1].split("};")[0].matchAll(/msg_(\d{4})/g)].map((m) => +m[1]);
const contacts = BOOK.map((e, i) => {
  const cls = CLASS_NO[e.trainerClass];
  const sec = headers[e.mapId] ? headers[e.mapId].mapsec : "";
  return {
    id: e.id.replace(/^PHONE_CONTACT_/, ""),
    name: line(bank(GMM[i])[0]),
    // (PhoneContact_GetClass: none for Mom, the Pokégear's own for the rest of HGSS's people, else their trainer class.)
    cls: e.trainerClass === "TRAINERCLASS_PHONE_MOM" ? "" : cls >= CLASS_NO.TRAINERCLASS_PHONE_POKEMON_PROFESSOR
      ? words[38 + cls - CLASS_NO.TRAINERCLASS_PHONE_POKEMON_PROFESSOR] : (classNames[cls] || "").replace("₧₦", "Pokémon"),
    type: e.type,
    trainer: e.trainerId !== "TRAINER_NONE" ? "HGSS_" + e.trainerId : null,
    trainerClass: e.trainerClass.replace(/^TRAINERCLASS_/, ""),
    map: e.mapId, where: placeName(sec),
    gift: e.gift === "ITEM_CHERI_BERRY" ? "berry" : item(e.gift),
    local: SCRIPT_NO[e.phoneScriptIfLocal] || 0,
    greet: e.unkC === 255 ? null : e.unkC,
    day: WEEK[e.rematchWeekday], time: TIME[e.rematchTimeOfDay],
    group: e.unkF,
    msgs: bank(GMM[i]).map(pages)
  };
});

// The call scripts: [boy's, girl's message, kind, param0, param1].
const scripts = [[0, 0, 0, 0, 0]];
for (const m of src("src/application/pokegear/phone/phone_script_defs.c").matchAll(/\.msgIds = \{ (\w+), (\w+) \},\s*\.scriptType = (\w+),\s*\.param0 = (\w+),\s*\.param1 = (\w+),/g)) {
  const kind = SCRIPTTYPE[m[3]];
  let p1 = m[5];
  if (kind === SCRIPTTYPE.PHONESCRIPTTYPE_ITEM) p1 = p1 === "ITEM_CHERI_BERRY" ? "berry" : p1 === "ITEM_POKE_BALL" ? "ball" : item(p1);
  else if (kind === SCRIPTTYPE.PHONESCRIPTTYPE_WORD) p1 = msgNo(p1);
  else if (/^\d+$/.test(p1)) p1 = +p1;
  scripts.push([msgNo(m[1]), msgNo(m[2]), kind, +m[4] || 0, p1]);
}

// sGenericPhoneCallHeaders: 16 for each contact.
const genericSrc = src("src/application/pokegear/phone/phone_generic_headers.c");
const generic = [];
for (const m of genericSrc.split("sGenericPhoneCallHeaders[] = {")[1].matchAll(/PHONE_GENERIC_(TERM|NULL)|\{\s*\.type = (\w+),\s*\.chance = (\d+),\s*\.scriptType = (\d+),\s*\.scriptID = (\w+),\s*\}/g)) {
  if (m[1] === "TERM") generic.push([GENERIC.PHONECALLGENERIC_NIL, 100, 0, 0]);
  else if (m[1] === "NULL") generic.push([GENERIC.PHONECALLGENERIC_NONE, 0, 0, 0]);
  else generic.push([GENERIC[m[2]], +m[3], +m[4], SCRIPT_NO[m[5]] || 0]);
}
if (generic.length !== contacts.length * 16) throw new Error("generic headers: " + generic.length);
const genericBy = {};
contacts.forEach((c, i) => { if (c.type === CALLTYPE.PHONECALLTYPE_GENERIC) genericBy[i] = generic.slice(i * 16, i * 16 + 16); });

const greetBank = bank(640);
const greetings = [...genericSrc.split("sGreetingMsgIDs[][12] = {")[1].split("};")[0].matchAll(/\{([^}]*)\}/g)]
  .map((m) => [...m[1].matchAll(/msg_0640_(\d{5})/g)].map((x) => pages(greetBank[+x[1]])));

// Rematch tiers (sTrainerRematchSets): [base, base, _2, _3, _4].
const rematch = {};
for (const m of src("src/overlay_26_022598C0.c").split("sTrainerRematchSets[][6] = {")[1].split("};")[0].matchAll(/\{([^}]*)\}/g)) {
  const set = m[1].split(",").map((s) => s.trim()).filter(Boolean).filter((s) => s !== "TRAINER_NONE");
  rematch["HGSS_" + set[0]] = set.map((t) => "HGSS_" + t);
}

// The scripts' story calls (PhoneCall who, 2, n): Elm's (sPhoneCallData_ProfElm_MapScripts), Oak's and Baoba's.
const elmCalls = [...src("src/application/pokegear/phone/scripts/phone_scripts_prof_elm.c").split("MapScripts[][2] = {")[1].split("};")[0]
  .matchAll(/\{ (\d+), (PHONE_SCRIPT_\d+) \}/g)].map((m) => SCRIPT_NO[m[2]]);

// Ethan and Lyra: a message for each place (GearPhoneCall_GetEthanLyraMessage, by
// its map's section), and their chatter (msg 86 on) with its group (1: always;
// 2 and 3, once you've been to Kanto: everyone here has).
const friendSrc = src("src/application/pokegear/phone/scripts/phone_scripts_childhood_friend.c");
const friendMaps = [...friendSrc.split("ov101_021F86CC[] = {")[1].split("};")[0].matchAll(/(MAP_\w+)/g)].map((m) => m[1]);
const friend = { at: {} };
friendMaps.forEach((map, i) => { if (headers[map]) friend.at[headers[map].mapsec] = 13 + i; });

// ---------- Trainers' rematch parties ----------

const HG_TRAINERS = json("files/poketool/trainer/trainers.json").trainers;
const CLASS_PIC = JSON.parse(fs.readFileSync(path.join(__dirname, "lib/hgss-trainer-pics.json"), "utf8"));
const GIRL_CLASSES = /^(LASS|PICNICKER|AROMA_LADY|TWINS|BATTLE_GIRL|ACE_TRAINER_F|ACE_TRAINER_F_GS|LADY|BEAUTY|SWIMMER_F|TUBER_F|PSYCHIC_F|POKEFAN|SCHOOL_KID_F|KIMONO_GIRL|MEDIUM|TEACHER|PKMN_BREEDER_F|PKMN_RANGER_F|COWGIRL|SOCIALITE|PARASOL_LADY|IDOL|SKIER|WAITRESS)$/;
const trainers = {};
function trainer(key, base) {
  const t = HG_TRAINERS[TRAINER_NO[key]], b = HG_TRAINERS[TRAINER_NO[base]];
  const cls = t.class.replace(/^TRAINERCLASS_/, "");
  const msg = (tr, type) => { const m = tr.messages.find((x) => x.type === type); return m ? HS.pages(m.message.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\f/g, "\f")) : null; };
  const party = t.party.map((mon) => Object.assign({ species: species(mon.species), level: mon.level, iv: mon.difficulty || 0 },
    mon.item && mon.item !== "ITEM_NONE" && item(mon.item) ? { item: item(mon.item) } : {})).filter((m) => m.species);
  // (Their lines: the base trainer's rematch hello and theirs or the base's when beaten.)
  trainers["HGSS_" + key] = {
    className: (classNames[CLASS_NO[t.class]] || cls).replace("₧₦", "Pokémon"), name: t.name.replace(/\{[^}]*\}/g, "").trim() || key, pic: CLASS_PIC[cls] || "hgss_youngster",
    party, music: GIRL_CLASSES.test(cls) ? "mus_encounter_girl" : "mus_encounter_boy", double: !!t.double,
    intro: msg(b, "TRMSG_PHONE_REMATCH_INTRO") || msg(b, "TRMSG_INTRO"), defeat: msg(t, "TRMSG_LOSE") || msg(b, "TRMSG_LOSE"), after: msg(b, "TRMSG_AFTER")
  };
}
// (The phone's trainers only: Gym Leaders battle again at the Fighting Dojo, which isn't here.)
const phoneTrainers = new Set(contacts.map((c) => c.trainer).filter(Boolean));
for (const [base, set] of Object.entries(rematch)) {
  if (!phoneTrainers.has(base)) { delete rematch[base]; continue; }
  for (const t of new Set(set.slice(2))) trainer(t.replace(/^HGSS_/, ""), base.replace(/^HGSS_/, ""));
}
// (Their rematch hello, for the first tier: the base trainer's party again.)
const rematchIntro = {};
for (const base of Object.keys(rematch)) {
  const b = HG_TRAINERS[TRAINER_NO[base.replace(/^HGSS_/, "")]], m = b.messages.find((x) => x.type === "TRMSG_PHONE_REMATCH_INTRO");
  if (m) rematchIntro[base] = HS.pages(m.message.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\f/g, "\f"));
}

// ---------- The radio ----------

const show = (n) => bank(n).map((t) => (Array.isArray(t) ? pages(t.join("").replace(/\n/g, "\r")) : line(t)));
const passwords = json("files/msgdata/msg/msg_0066_D23R0102.json").messages.slice(40, 70).map((x) => line(x.en_US));
const radioSrc = src("src/application/pokegear/radio/pokegear_radio.c");
const specialMaps = (name) => [...radioSrc.split(name + "[] = {")[1].split("};")[0].matchAll(/(MAP_\w+)/g)].map((m) => m[1]);
const radio = {
  music: show(416), talk: show(414), buena: show(411), rocket: show(418), unown: show(410), flute: show(417), signal: show(409), drama: show(413).slice(0, 3), search: show(419).slice(0, 3), passwords,
  alph: specialMaps("sAlphMaps"), mahogany: specialMaps("sMahoganyMaps")
};

// ---------- Mom ----------
//
// Her savings' gifts (src/mom_gift.c): the nine things she buys once your
// savings pass their mark, and a Berry each time they pass another $3,000;
// the deliveryman's words (msg_0209) and hers at home (msg_0545_T20R0201's
// bank: Is this about your money? WITHDRAW / DEPOSIT / CHANGE / EXIT).
const giftSrc = src("src/mom_gift.c");
const mom = {
  gifts: [...giftSrc.split("sGiftNormalTable")[1].split("};")[0].matchAll(/\{ (ITEM_\w+),\s*(\d+),\s*(\d+)\s*\}/g)].map((m) => [item(m[1]), +m[2], +m[3]]),
  berries: [...giftSrc.split("sGiftBerryTable")[1].split("};")[0].matchAll(/\{ (ITEM_\w+) - ITEM_CHERI_BERRY,\s*(\d+),\s*(\d+) \}/g)].map((m) => [item(m[1]), +m[2], +m[3]]),
  berryEvery: +/BERRY_THRESHOLD\s+(\d+)/.exec(giftSrc)[1],
  delivery: bank(209).map(pages),
  home: json("files/msgdata/msg/msg_0545_T20R0201.json").messages.map((x) => pages(x.en_US))
};
if (mom.gifts.length !== 9 || mom.berries.length !== 17 || mom.gifts.some((g) => !g[0]) || mom.berries.some((g) => !g[0])) throw new Error("Mom's gifts");
// (MapHeader_GetMomCallIntroParam: what she says about where you are, by HGSS's map; Kanto's, 12, for the rest.)
const momCall = {};
for (const m of src("src/data/map_headers.h").matchAll(/\[(MAP_\w+)\] = \{([^}]*)\}/g)) {
  const p = /momCallIntroParam = (\d+)/.exec(m[2]);
  if (p && +p[1] !== 12) momCall[m[1]] = +p[1];
}

// ---------- HGSS's items by number ----------
// (What a script keeps in a var, SetVar VAR_SPECIAL_x8004, 4: Buena's prizes;
// and the Blue Card, which this game hadn't.)
const BLUE_CARD = { name: "blue-card", category: "key-items", effect: "A card to save points for the Buena's Password show." };
const itemIds = { ITEM_BLUE_CARD: "blue-card" };
for (const m of src("include/constants/items.h").matchAll(/#define (ITEM_\w+)\s+(\d+)\b/g)) {
  const id = m[1] === "ITEM_BLUE_CARD" ? "blue-card" : item(m[1]);
  if (id && !(m[2] in itemIds)) itemIds[m[2]] = id;
}

// ---------- The Gym Leaders ----------
//
// Their rematches at Saffron's Fighting Dojo (scr_seq_T11R0101): each one's
// rematch trainer (TrainerBattle TRAINER_LEADER_*_2), what they say before and
// after, where they stand (the Dojo's objects, one column left on FireRed's
// Dojo, a few moved off its walls and Black Belts), their sprite; and the
// words they give their number with (the RegisterGearNumber script each has,
// HGSS's places after the League: ask, Yes, then, No).
const T11 = src("files/fielddata/script/scr_seq/scr_seq_0832_T11R0101.s").split("\n");
const dojoMsgs = json("files/msgdata/msg/msg_0533_T11R0101.json").messages;
const dojoEvents = json("files/fielddata/eventdata/zone_event/355_T11R0101.json").objects;
const contactNo = (name) => BOOK.findIndex((e) => e.id === name);
const FR_DOJO_SPOT = { PHONE_CONTACT_MORTY: [3, 5], PHONE_CONTACT_JASMINE: [2, 8], PHONE_CONTACT_BLAINE: [11, 12] };
const leaders = {};
const scrDir = path.join(ROOT, "files/fielddata/script/scr_seq");
const numberScripts = {};
for (const f of fs.readdirSync(scrDir).filter((f) => f.endsWith(".s"))) {
  const L = fs.readFileSync(path.join(scrDir, f), "utf8").split("\n");
  const MSG = /^\s*(?:NPCMsg|NonNPCMsg|GenderMsgBox) (msg_\w+)/;
  const msgAt = (k) => { const x = MSG.exec(L[k] || ""); return x ? x[1] : null; };
  L.forEach((l, i) => {
    const m = /RegisterGearNumber (PHONE_CONTACT_\w+)/.exec(l);
    if (!m || BOOK[contactNo(m[1])].type !== CALLTYPE.PHONECALLTYPE_GYMLEADER) return;
    // (Yes: the message before the jingle; then, the one after it; the ask,
    // before the menu that leads to Yes; No, where its other choice goes.)
    let yesAt = -1;
    for (let k = i - 1; k > i - 8 && yesAt < 0; k--) if (msgAt(k)) yesAt = k;
    let after = null;
    for (let k = i + 1; k < i + 8 && !after; k++) after = msgAt(k);
    let label = null;
    for (let k = yesAt; k > yesAt - 5 && !label; k--) if (/^_\w+:$/.test(L[k])) label = L[k].slice(0, -1);
    const jump = L.findIndex((x) => x.trim() === "GoToIfEq " + label);
    let ask = null, no = null;
    for (let k = jump; jump >= 0 && k > jump - 16 && !ask; k--) ask = msgAt(k);
    for (let k = jump + 1; jump >= 0 && k < jump + 4; k++) {
      const g = /GoToIf(?:Ge|Eq|Ne) (_\w+)/.exec(L[k]);
      if (g) { const at = L.indexOf(g[1] + ":"); for (let q = at; q < at + 5 && !no; q++) no = msgAt(q); break; }
    }
    const text = (id) => { if (!id) return null; const [, b] = /^(msg_\d{4}_\w+?)_\d{5}$/.exec(id); return pages(json("files/msgdata/msg/" + b + ".json").messages[msgNo(id)].en_US); };
    if (ask) numberScripts[m[1]] = { ask: text(ask), yes: text(msgAt(yesAt)), after: text(after), no: text(no) };
  });
}
T11.forEach((l, i) => {
  const t = /TrainerBattle (TRAINER_LEADER_\w+_2)/.exec(l);
  if (!t) return;
  const label = T11.slice(0, i).reverse().find((x) => /^scr_seq_T11R0101_\d+:$/.test(x)).slice(0, -1);
  const before = T11.slice(0, i).reverse().find((x) => /NPCMsg msg_/.test(x)), won = T11.slice(i).find((x) => /NPCMsg msg_/.test(x));
  const who = +/ScrCmd_462 (\d+)/.exec(T11.slice(i).join("\n"))[1];
  const obj = dojoEvents.find((o) => o.scriptId === "_EV_" + label + " + 1");
  trainer(t[1], BOOK[who].trainerId);
  const at = FR_DOJO_SPOT[BOOK[who].id] || [obj.x - 1, obj.z];
  leaders[who] = {
    trainer: "HGSS_" + t[1], hgssSprite: obj.spriteId, x: at[0], y: at[1], facing: ["up", "down", "left", "right"][obj.facingDirection] || "down",
    intro: pages(dojoMsgs[msgNo(/msg_\w+/.exec(before)[0])].en_US), defeat: pages(dojoMsgs[msgNo(/msg_\w+/.exec(won)[0])].en_US),
    number: numberScripts[BOOK[who].id] || null
  };
  // (Their lines in the battle: the Dojo's.)
  Object.assign(trainers["HGSS_" + t[1]], { intro: leaders[who].intro, after: leaders[who].defeat });
});
if (Object.keys(leaders).length !== 16) throw new Error("Dojo leaders: " + Object.keys(leaders).length);

// Their sprites (as tools/build-johto.js makes HGSS's people's: the Kanto
// leaders' aren't on Johto's maps).
const SPRITES = path.join(root, "assets/world/sprites");
const spriteModel = {};
for (const m of src("asm/overlay_01_sprite_data.s").matchAll(/\.short (SPRITE_\w+), (MMODEL_\w+)/g)) spriteModel[m[1]] = m[2];
const mmodelNo = defines("include/constants/mmodel.h");
const FR_FRAMES = [4, 0, 8, 5, 7, 1, 3, 9, 11];
function sprite(name) {
  const out = "hgss_" + name.replace(/^SPRITE_/, "").toLowerCase(), file = path.join(SPRITES, out + ".png");
  const look = { sprite: out, width: 32, height: 32, frames: FR_FRAMES.length, offsetX: -8 };
  if (fs.existsSync(file)) return look;
  const t = N.parseNsb(fs.readFileSync(path.join(ROOT, "files/data/mmodel/mmodel/mmodel_" + String(mmodelNo[spriteModel[name]]).padStart(8, "0") + ".NSBTX"))).tex;
  const pal = Object.keys(t.palettes)[0];
  const frames = Object.keys(t.textures).sort((a, b) => +a.split(".").pop() - +b.split(".").pop()).map((k) => N.decodeTexture(t, k, pal));
  const W = 32 * FR_FRAMES.length, rgba = new Uint8ClampedArray(W * 32 * 4);
  FR_FRAMES.forEach((f, n) => { for (let y = 0; y < 32; y++) rgba.set(frames[f].rgba.subarray(y * 128, (y + 1) * 128), (y * W + n * 32) * 4); });
  writePng(file, W, 32, rgba);
  return look;
}
for (const L of Object.values(leaders)) Object.assign(L, { look: sprite(L.hgssSprite) });

const out = {
  contacts, scripts, generic: genericBy, greetings, rematch, rematchIntro, mom, momCall, leaders,
  elmCalls, oakCall: SCRIPT_NO.PHONE_SCRIPT_082, baobaCall: SCRIPT_NO.PHONE_SCRIPT_141,
  friend,
  noCalls: Object.keys(headers).filter((m) => !headers[m].calls),
  noRadio: Object.keys(headers).filter((m) => !headers[m].radio),
  common: { registered: pages(bank(40)[101]), ringing: words.slice(30, 33), click: words.slice(33, 37).map((w) => w.replace(/\n/g, " ")), outOfArea: line(bank(271)[37]).replace(/\n/g, " ") },
  radio
};
// (Run in the page, after the maps: Mom's deliveryman in each of Johto's Poké
// Marts, by the counter, there while she's bought you something (HGSS's
// FLAG_HIDE_MOM_GIFT_DELIVERYMAN, kept by ui/pokegear.js); and the Gym Leaders
// at the Fighting Dojo, there while they're waiting for you.)
function placePeople(P) {
  const maps = window.WORLD_MAPS || {}, look = { sprite: "hgss_delivery2", width: 32, height: 32, frames: 9, offsetX: -8 };
  const nextId = (m) => Math.max(0, ...m.people.map((p) => p.id || 0)) + 1;
  for (const m of Object.values(maps)) {
    if (m.region !== "johto" || !m.people) continue;
    const there = m.people.find((p) => p.hgssFlag === "FLAG_HIDE_MOM_GIFT_DELIVERYMAN");
    if (there) { there.script = "gear:deliveryman"; continue; }
    if (!/_Mart$/.test(m.name)) continue;
    m.people.push(Object.assign({ id: nextId(m), localId: "gear_delivery", x: 4, y: 2, movement: "face_down", rangeX: 0, rangeY: 0, script: "gear:deliveryman",
      flag: null, text: null, hgssFlag: "FLAG_HIDE_MOM_GIFT_DELIVERYMAN" }, look));
  }
  const dojo = maps.SaffronCity_Dojo;
  if (dojo) for (const [i, L] of Object.entries(P.leaders)) {
    if (dojo.people.some((p) => p.gearLeader === +i)) continue;
    dojo.people.push(Object.assign({ id: nextId(dojo), localId: "gear_leader_" + i, x: L.x, y: L.y, movement: "face_" + L.facing, rangeX: 0, rangeY: 0,
      script: "gear:leader", flag: null, text: null, gearLeader: +i }, L.look));
  }
}
const file = path.join(__dirname, "lib/johto-phone.generated.js");
const START = "// The Pokégear's phone and radio (tools/build-johto-phone.js", END = "// (End of the Pokégear's phone.)\n";
const js = START + ", from pret/pokeheartgold's phone book, call scripts and radio shows).\n" +
  "window.JOHTO_PHONE = " + JSON.stringify(out) + ";\n" +
  "Object.assign(window.WORLD_TRAINERS, " + JSON.stringify(trainers) + ");\n" +
  // (The Blue Card, HGSS's items by number for the scripts, and Mom's deliveryman in each Mart: ui/pokegear.js.)
  "if (window.ITEMS && !window.ITEMS[\"blue-card\"]) window.ITEMS[\"blue-card\"] = " + JSON.stringify(BLUE_CARD) + ";\n" +
  "if (window.JOHTO_SCRIPTS) window.JOHTO_SCRIPTS.itemIds = " + JSON.stringify(itemIds) + ";\n" +
  "(" + placePeople.toString() + ")(window.JOHTO_PHONE);\n" + END;
fs.writeFileSync(file, js);
// And into data/johto-maps.js, in place of what an earlier run put there (its
// first three lines, before it had an end).
const mapsFile = path.join(root, "data/johto-maps.js");
if (fs.existsSync(mapsFile)) {
  let maps = fs.readFileSync(mapsFile, "utf8");
  const a = maps.indexOf(START);
  if (a >= 0) {
    let e = maps.indexOf(END, a);
    if (e >= 0) e += END.length; else { e = a; for (let k = 0; k < 3; k++) e = maps.indexOf("\n", e) + 1; }
    maps = maps.slice(0, a) + maps.slice(e);
  }
  fs.writeFileSync(mapsFile, maps + js);
}
console.log("phone:", contacts.length, "contacts,", scripts.length, "scripts,", Object.keys(rematch).length, "rematch sets,", Object.keys(trainers).length,
  "rematch trainers,", Math.round(fs.statSync(file).size / 1024), "KB");
