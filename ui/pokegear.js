// HeartGold's Pokégear (src/application/pokegear), drawn in FireRed's look:
// FireRed's font and window frames at 240x160, its cards along the top (the
// Phone; the Map, once Cherrygrove's Guide Gent has shown you round; the
// Radio, once you've its card from the Radio Tower), the day and time at the
// top right. The phone's people, their calls and the radio's shows are HGSS's
// (window.JOHTO_PHONE, tools/build-johto-phone.js).
//
//   const gear = Pokegear.create(env);
//   gear.has()                    // you've the Pokégear (FLAG_GOT_POKEGEAR: Elm's starter)
//   await gear.open()             // the Pokégear, from the start menu
//   await gear.call(who, kind, n) // a script's PhoneCall: a story call (Elm's)
//   gear.registerCard(n)          // RegisterPokegearCard: 1 the Map, 2 the Radio
//   gear.rematch(contact)         // GetPhoneBookRematch: the trainer they'd battle as now, or 0
//   gear.setTrigger(n, on)        // HGSS's call triggers (ScrCmd_148, UnsetPhoneCallTrigger)
//   gear.step()                   // each step: { type: "phone" } when it rings ...
//   await gear.ring()             // ... and then the call
//   gear.wantsNumber(person), await gear.beatTrainer(person)   // a phone trainer just beaten: may they have your number? (asked on the map)
//   await gear.talkTrainer(person)   // talking to one beaten: a rematch, a gift, or asking
//                                    // again (true), or nothing to do (false)
//   gear.encounterRate()          // the radio's March (x2) or Lullaby (x0.5) on wild Pokémon, else 1
//   gear.radioOn(map)             // the radio still playing there (the map's music waits)
//   gear.passwordSet()            // GetBuenasPassword: today's password (0-29, a new one each day)
//   gear.savePrize(prize)         // a battle's prize: what Mom saves of it (taken from it), or 0
//   await gear.momHome()          // talking to Mom at home: her bank, once she's on the Pokégear (true)
//   await gear.talkPerson(person, map)  // the deliveryman, a Gym Leader with their number or
//                                       // at the Fighting Dojo: true if they had something to do
//   gear.visible(person)          // a Gym Leader at the Dojo: there while waiting for you (or undefined)
//
// env: player(), johto() (ui/johto-script.js's), map() (where you are), isGirl(),
//   sfx(name), music(name), mapMusic(), fanfare(name), townMap(), say(pages),
//   confirm(question), choose(texts, question) (an index, or -1), amount(text, max,
//   { saved, held }) (Pokegear.amount's box: how much, or 0), giveItem(id, n) (and says
//   so), hasItem(id), money(), addMoney(n), beaten(id), setBeaten(id, on),
//   rematch(person, trainer, intro) -> outcome, removePerson(person), badges()
//   ({ johto, all }), dex() ({ seen, caught }), caught(species), dayCare() (names),
//   gameClear() (Johto's League won), frame() (the Option screen's FRAME), baobaCall(script)
//   (Baoba calling: the Safari Zone's side of it; his words, or null for the script's).
//
// There's no real-time clock: the time and the day are the step clock's
// (Player.gameTime: 100 steps an hour), and calls come by steps walked.
//
// What you've got lives in player.flags.johto (HGSS's flags), as `phone`
// (the numbers you have, as RegisterGearNumber gives them) and `gear`
// ({ cards, seeking (who wants a rematch), gifts (who has one for you),
// triggers, called, mom ({ balance, queue, given }: her savings), password
// ({ day, set }: today's) }).
(function () {
  "use strict";

  const W = 240, H = 160;
  const GM = () => window.GBA_MENUS;
  const P = () => window.JOHTO_PHONE || null;
  const WHITE = [255, 255, 255], DARK = [98, 98, 98], LIGHT = [213, 213, 205];
  // (HeartGold's gold, for the Pokégear's case.)
  const GOLD = [216, 152, 48], GOLD_DARK = [152, 88, 24], GOLD_LIGHT = [248, 216, 136], CREAM = [248, 240, 216], RED = [224, 56, 40];
  const CARDS = ["Phone", "Map", "Radio"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // HGSS's phone call kinds (PHONECALLTYPE_*), generic call tests
  // (PHONECALLGENERIC_*) and script kinds (PHONESCRIPTTYPE_*).
  const T = { GENERIC: 0, MOM: 1, ELM: 2, OAK: 3, KURT: 4, BIKE_SHOP: 5, KENJI: 6, BILL: 7, DAYCARE_MAN: 8, DAYCARE_LADY: 9, BUENA: 10,
    FRIEND: 11, GYM_LEADER: 12, BAOBA: 13, IRWIN: 14 };
  const G = { NIL: 0, RAND1: 1, FIGHT_POST_ROCKETS: 2, POST_ROCKET_WEEK_TIME: 3, BUG_CONTEST_DAYS: 4, DURING_ROCKETS: 5, RAND6: 6,
    FIGHT_POST_ROCKETS_NOT_CONTEST: 7, GIFT_NOT_CONTEST: 8, NONE: 255 };
  const S_UNK1 = 1, S_FLAG = 2, S_REMATCH = 3, S_ITEM = 4, S_WORD = 5;
  const KENJI = 16;
  // Who calls while you walk (ov02_02251FDC: trainers, Gym Leaders, your
  // friend, Buena and Irwin), and how often (GearPhoneRingManager: once ten
  // minutes have gone by, the next step has an even chance of a call).
  const CALLERS = new Set([T.GENERIC, T.GYM_LEADER, T.FRIEND, T.BUENA, T.IRWIN]);
  // (HGSS's ten minutes, here in steps, three times over, and a third of the time a call: someone rings about every nine hundred steps.)
  const CALL_STEPS = 300, CALL_CHANCE = 33;
  // The call triggers' calls (ov02_02253C84): who, and what they say (12: Mom's, she's bought you something).
  const TRIGGERS = { 0: [1, 13], 1: [1, 7], 2: [15, 85], 3: [9, 93], 12: [0, 27],
    // (Baoba's: the new Pokémon in an Area, his next test, the objects: ui/johto-safari.js.)
    6: [24, null], 7: [24, 142], 8: [24, 143], 9: [24, 144], 10: [24, 145] };
  // Mom (src/mom_gift.c, save_pokegear.c): her savings' cap, and how many
  // things she can have waiting for you with the deliveryman.
  const MOM_MAX = 999999, MOM_QUEUE = 5, MOM_STORY = "story";
  // The Gym Leaders this game's Gyms have (FireRed's in Kanto, by their
  // scripts; HGSS's in Johto, by their sprite there), and how many can wait
  // at the Dojo at once (isDojoFull's five).
  const KANTO_LEADERS = { BROCK: "PewterCity_Gym_EventScript_Brock", MISTY: "CeruleanCity_Gym_EventScript_Misty", LT__SURGE: "VermilionCity_Gym_EventScript_LtSurge",
    ERIKA: "CeladonCity_Gym_EventScript_Erika", SABRINA: "SaffronCity_Gym_EventScript_Sabrina", BLAINE: "CinnabarIsland_Gym_EventScript_Blaine" };
  const DOJO = "SaffronCity_Dojo", DOJO_MAX = 5;
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  // HGSS's Gen 4 Berries (ITEM_CHERI_BERRY on: a gift "berry" is one of the ten) and
  // Balls (ITEM_POKE_BALL's gift: an Ultra, Great or Poké Ball).
  const BERRIES = ["cheri-berry", "chesto-berry", "pecha-berry", "rawst-berry", "aspear-berry", "leppa-berry", "oran-berry", "persim-berry", "lum-berry", "sitrus-berry"];
  const BALLS = ["ultra-ball", "great-ball", "poke-ball"];
  const rnd = (n) => Math.floor(Math.random() * n);
  const roll = (chance) => rnd(100) <= chance;   // (rollPercentChance)

  function create(env) {
    const J = () => env.johto();
    const state = () => {
      const s = J().state();
      s.phone = s.phone || [];
      return s.gear || (s.gear = { cards: [], seeking: {}, gifts: {}, triggers: {}, called: {} });
    };
    // (Mom's number is in from the start: HGSS's Pokégear has it.)
    const numbers = () => { state(); const n = J().state().phone; if (!n.includes(0) && has()) n.unshift(0); return n; };
    const registered = (i) => numbers().includes(i);
    const register = (i) => { if (!registered(i)) numbers().push(i); };
    const has = () => J().flag("FLAG_GOT_POKEGEAR");
    // (The Map from the start, this game's own: Cherrygrove's Guide Gent, who
    // gives it in HGSS, isn't in this game; the Radio: FLAG_GOT_RADIO_CARD.)
    const hasCard = (n) => n === 0 || n === 1 || state().cards.includes(n) || (n === 2 && J().flag("FLAG_GOT_RADIO_CARD"));
    function registerCard(n) { if (!state().cards.includes(n)) state().cards.push(n); }

    // ---------- Where and when ----------
    // (HGSS's map constant for one of Johto's maps; its section's name.)
    let constOf = null;
    const hgssMap = (name) => {
      const J2 = window.JOHTO_SCRIPTS;
      if (!constOf && J2) { constOf = {}; for (const [c, n] of Object.entries(J2.mapConsts)) constOf[n] = c; }
      return (constOf && constOf[name]) || null;
    };
    const mapOfConst = (c) => (window.JOHTO_SCRIPTS && window.JOHTO_SCRIPTS.mapConsts[c]) || null;
    function section(name) {
      const JT = window.JOHTO_TOWN_MAP, KT = window.TOWN_MAP;
      const sec = (JT && JT.mapSections[name]) || (KT && KT.mapSections && KT.mapSections[name]);
      return sec ? { sec, name: (JT && JT.names[sec]) || (KT && KT.names && KT.names[sec]) || "" } : { sec: null, name: "" };
    }
    const inJohto = () => (window.WORLD_MAPS[env.map()] || {}).region === "johto";
    // The step clock (Player.gameTime), and HGSS's times of day for calls:
    // morning 4-10, day 10-20, night 20-4.
    function clock() {
      if (window.Player && window.Player.gameTime) return window.Player.gameTime(env.player());
      const steps = env.player().clockSteps != null ? env.player().clockSteps : 1000, day = Math.floor(steps / 2400), hour = Math.floor((steps % 2400) / 100);
      return { steps, day, weekday: (day + 1) % 7, hour, minute: Math.floor((steps % 100) * 0.6), timeOfDay: hour >= 4 && hour < 10 ? "morning" : hour >= 10 && hour < 20 ? "day" : "night", today: "day" + day };
    }
    const timeOfDay = () => ({ morning: 0, day: 1, night: 2 })[clock().timeOfDay];
    const weekday = () => clock().weekday;
    const takeover = () => { const v = +J().getVar("VAR_SCENE_ROCKET_TAKEOVER"); return v >= 2 && v <= 4; };
    const afterRadioTower = () => J().flag("FLAG_BEAT_RADIO_TOWER_ROCKETS");
    const isHere = (c) => !!c.map && hgssMap(env.map()) === c.map;

    // ---------- Their words ----------
    // HGSS's buffers: 0 you, 1 them, 2 where you are, 3 where they are, 4 a word,
    // 10 and 11 one of their Pokémon and one in the wild where they are.
    function buffers(i) {
      const c = P().contacts[i], data = c.trainer && window.WORLD_TRAINERS[c.trainer];
      const party = data && data.party.length ? data.party : null;
      return { 0: env.player().name, 1: c.name, 2: section(env.map()).name, 3: c.where, 10: party ? party[rnd(party.length)].species : "Rattata", 11: wildThere(c) };
    }
    // (getRandomEncounterSlot: a Fisherman's from the water, anyone else's from the grass, by the time of day.)
    function wildThere(c) {
      const m = window.WORLD_MAPS[mapOfConst(c.map)];
      const t = m && (c.trainerClass === "FISHERMAN" && m.water ? m.water : m.wild);
      if (!t || !t.slots || !t.slots.length) return "Rattata";
      const s = t.slots[rnd(t.slots.length)], tod = timeOfDay();
      return (tod === 2 && s.night) || (tod === 0 && s.morning) || s.species;
    }
    const fill = (pages, b) => (pages || []).map((p) => p.replace(/\{BUF(\d+)\}/g, (m, n) => (b[n] != null ? b[n] : "")));
    const girl = () => (env.isGirl() ? 1 : 0);

    // ---------- What they say: HGSS's call scripts ----------
    //
    // A call: the pages they say (after their greeting), and what it does
    // (PhoneCall_ApplyGenericNPCcallSideEffect: wanting a rematch, a gift
    // waiting for you, a flag, a word).
    function sideEffect(i, def, b) {
      const g = state();
      if (def[2] === S_REMATCH) g.seeking[i] = true;
      else if (def[2] === S_ITEM) g.gifts[i] = def[4] === "berry" ? BERRIES[rnd(10)] : def[4] === "ball" ? BALLS[rnd(3)] : def[4];
      else if (def[2] === S_FLAG || def[2] === S_UNK1) J().setFlag(def[4], !!def[3]);
      else if (def[2] === S_WORD) b[4] = ((P().contacts[i].msgs[def[4] + rnd(def[3])] || [])[0] || "").replace(/\n/g, " ");
    }
    // A script's pages (GearPhoneCall_Simple / _Generic / _Generic2): the
    // greeting (their row of msg_0640, unless they've none), then its message.
    function scripted(i, script, incoming, handler) {
      const c = P().contacts[i], def = P().scripts[script];
      if (!def) return [];
      const b = buffers(i);
      sideEffect(i, def, b);
      const greet = c.greet != null ? P().greetings[c.greet][timeOfDay() * 2 + (incoming ? 6 : 0) + girl()] : [];
      let msg = def[girl()];
      if (handler === 2) { const r = rnd(11); msg = def[0] === def[1] ? def[0] + r : girl() ? def[1] + 2 * r + 1 : def[0] + 2 * r; }
      return fill(greet, b).concat(fill(c.msgs[msg], b));
    }
    // The generic calls (PhoneScriptGeneric_GetScriptIdInternal): the first of
    // their eight whose test passes, or the last one tested.
    function generic(i, incoming) {
      const c = P().contacts[i], hdrs = (P().generic[i] || []).slice(incoming ? 8 : 0, incoming ? 16 : 8), g = state();
      if (!incoming && isHere(c)) return scripted(i, c.local, false, 0);
      let last = null;
      for (const h of hdrs) {
        const [type, chance, handler, script] = h;
        if (type === G.NIL || type === G.NONE) break;
        last = h;
        let ok;
        if (type === G.FIGHT_POST_ROCKETS) ok = !g.seeking[i] && !g.gifts[i] && (afterRadioTower() || handler !== 0 || P().scripts[script][2] !== S_REMATCH) && roll(chance);
        else if (type === G.POST_ROCKET_WEEK_TIME) ok = afterRadioTower() && weekday() === c.day && timeOfDay() === c.time && roll(chance);
        else if (type === G.FIGHT_POST_ROCKETS_NOT_CONTEST) ok = afterRadioTower() && !!g.seeking[i] && roll(chance);
        else if (type === G.GIFT_NOT_CONTEST) ok = !!g.gifts[i] && roll(chance);
        else if (type === G.BUG_CONTEST_DAYS) ok = [2, 4, 6].includes(weekday()) && roll(chance);
        else if (type === G.DURING_ROCKETS) ok = takeover() && roll(chance);
        else ok = roll(chance);
        if (ok) return scripted(i, script, incoming, handler);
      }
      return last ? scripted(i, last[3], incoming, last[2]) : [];
    }
    // Prof. Elm (PhoneCall_GetScriptId_ProfElm): what he says by how far the
    // story's got (Johto's Badges: Kanto's were won before you came).
    function elm(incoming, script) {
      const f = (n) => J().flag(n), badges = env.badges().johto;
      if (script != null) return scripted(1, script, incoming, 0);
      if (isHere(P().contacts[1])) return scripted(1, 1, false, 0);
      const s = !f("FLAG_GOT_ELMS_PANIC_CALL") ? 8 : !f("FLAG_GAVE_RIVAL_NAME_TO_OFFICER") ? 9 : !f("FLAG_GOT_PICK_UP_EGG_CALL_FROM_ELM") ? 10
        : !f("FLAG_GOT_EGG_FROM_ELMS_ASSISTANT") ? 11 : null;
      if (s) return scripted(1, s, false, 0);
      const hatched = f("FLAG_SYS_HATCHED_TOGEPI_EGG"), everstone = f("FLAG_GOT_EVERSTONE_FROM_ELM");
      const pick = badges < 7 ? (!hatched ? 12 : everstone ? 14 + rnd(2) : 13) : takeover() ? 16 : badges < 8 ? 17 : !f("FLAG_GAME_CLEAR") ? 18
        : !f("FLAG_GOT_SS_TICKET_FROM_ELM") ? 19 : !everstone ? (hatched ? 13 : 12) : 20 + rnd(f("FLAG_WAS_TOLD_ABOUT_POKERUS") ? 3 : 2);
      return scripted(1, pick, false, 0);
    }
    const said = (i, ...ns) => { const b = buffers(i); return [].concat(...ns.map((n) => fill(P().contacts[i].msgs[n], b))); };
    // Everyone else, as HGSS's own call handlers have them (the parts this
    // game has: no Pokédex ratings, PC Box names or Kurt's Balls by phone).
    function whatTheySay(i, incoming, script) {
      const c = P().contacts[i], tod = timeOfDay(), local = !incoming && isHere(c);
      switch (c.type) {
        case T.GENERIC: return script != null ? scripted(i, script, incoming, 0) : generic(i, incoming);
        case T.ELM: return elm(incoming, script);
        case T.OAK: {
          if (script != null) return scripted(i, script, incoming, 0);
          if (local) return scripted(i, c.local, false, 0);
          // (Your Pokédex: how many you've seen and caught.)
          const d = env.dex(), b = Object.assign(buffers(i), { 5: d.seen, 6: d.caught });
          if (!incoming) return fill(c.msgs[13 + girl()], b).concat(fill(c.msgs[20], b), fill(c.msgs[21], b));
          return scripted(i, 68 + Math.max(1, Math.min(9, Math.floor(d.caught / 50))), true, 0);
        }
        case T.FRIEND: {
          if (local) return scripted(i, girl() ? 101 : 102, false, 0);
          if (!incoming) { const at = P().friend.at[section(env.map()).sec]; return said(i, 4 + tod, at != null ? at : 10 + rnd(3)); }
          return said(i, 7 + tod, rnd(2) ? 10 + rnd(3) : 86 + rnd(73));
        }
        case T.KURT: return local ? scripted(i, 83, false, 0) : said(i, J().flag("FLAG_UNK_127") ? 6 : 2, 5);
        case T.BIKE_SHOP: return scripted(i, script != null ? script : local ? 84 : 85, incoming, 0);
        case T.KENJI: return scripted(i, local ? 86 : tod === 2 ? 91 : 87, false, 0);
        case T.BILL: return script != null || incoming ? scripted(i, 93, true, 0) : local ? scripted(i, 92, false, 0) : said(i, 3 + girl(), 8);
        case T.DAYCARE_MAN: { const n = env.dayCare(), b = Object.assign(buffers(i), { 10: n[0], 11: n[1] }); return local ? scripted(i, c.local, false, 0) : fill([].concat(c.msgs[2], c.msgs[n.length ? (n.length > 1 ? 6 : 5) : 4], c.msgs[11]), b); }
        case T.DAYCARE_LADY: return local ? scripted(i, 97, false, 0) : said(i, 3 + girl(), env.dayCare().length ? 5 : 10);
        case T.BUENA: {
          if (takeover()) return scripted(i, 99, incoming, 0);
          if (incoming) return said(i, 15 + 2 * tod + girl(), 21 + rnd(9));
          return local ? scripted(i, 98, false, 0) : said(i, 3 + 2 * tod + girl(), 10 + rnd(3));
        }
        case T.MOM: return mom(incoming, script);
        case T.GYM_LEADER: return leaderCall(i, incoming);
        case T.BAOBA: {
          // (His calls change the Safari Zone, and say which Areas have new Pokémon: env.baobaCall.)
          const words = incoming && env.baobaCall ? env.baobaCall(script) : null;
          return words || scripted(i, script != null ? script : c.local, incoming, 0);
        }
        case T.IRWIN: {
          if (!incoming) return scripted(i, takeover() ? 156 : 172 + rnd(3), false, 0);
          const all = env.badges().all;
          return scripted(i, all >= 16 ? 171 : env.badges().johto >= 3 ? 170 : 169, true, 0);   // (from the Plain Badge, Whitney's)
        }
        default: return c.local ? scripted(i, c.local, false, 0) : said(i, 0);
      }
    }

    // Mom (PhoneCall_GetScriptId_Mother, GearPhoneCall_Mother): at home, how
    // strange you sound on the phone; before you've told the officer your
    // rival's name and talked to her, Elm's errand; else what she says about
    // where you are (by HGSS's map: Kanto's for this game's Kanto), then, unless
    // she's things waiting for you with the deliveryman, your savings: keep
    // saving, or start? Her own call (the story's, PhoneCall 0 on Route 30:
    // should she save your money?) and her call that she's bought you something.
    // (Her home is this game's: Pallet Town's.)
    const atHome = () => /^PalletTown_PlayersHouse_/.test(env.map());
    function mom(incoming, script) {
      const c = P().contacts[0], b = Object.assign(buffers(0), { 10: momState().balance }), msg = (n) => fill(c.msgs[n], b);
      const askSaving = async (pages) => {
        const yes = await ask(pages);
        J().setFlag("FLAG_SYS_MOMS_SAVINGS", yes);
        await talk(msg(yes ? 25 : 26));
      };
      if (script === MOM_STORY) return async () => { J().setFlag("FLAG_TALKED_TO_MOM_AFTER_NAMING_RIVAL", true); await askSaving(msg(22)); };
      if (atHome()) return scripted(0, 23, false, 0);
      if (incoming) return scripted(0, script != null ? script : 27, true, 0);
      if (!J().flag("FLAG_GAVE_RIVAL_NAME_TO_OFFICER")) return scripted(0, 25, false, 0);
      if (!J().flag("FLAG_TALKED_TO_MOM_AFTER_NAMING_RIVAL")) return scripted(0, 26, false, 0);
      return async () => {
        const at = hgssMap(env.map()), param = at && P().momCall[at] != null ? P().momCall[at] : 12;
        await talk(msg(7 + param));
        if (momState().queue.length >= MOM_QUEUE) { await talk(msg(21)); return; }
        const on = J().flag("FLAG_SYS_MOMS_SAVINGS"), saved = momState().balance;
        await askSaving(msg(on ? (saved ? 23 : 27) : (saved ? 24 : 28)));
      };
    }
    // A Gym Leader (GearPhoneCall_GymLeader_Outgoing): at the Dojo, they're
    // right here; until you've all sixteen Badges, not yet; waiting for you
    // already; not their day and time (the phone book's), not now; else a
    // rematch? Yes, and they'll be at the Fighting Dojo (unless five are
    // already). Calling you: hello, then they're waiting, or their chatter.
    function leaderCall(i, incoming) {
      const c = P().contacts[i], g = state();
      if (incoming) return said(i, 10, g.seeking[i] ? 11 : 12 + rnd(3));
      if (env.map() === DOJO) return said(i, 1);
      return async () => {
        await talk(said(i, 2));
        if (env.badges().all < 16) return talk(said(i, 3));
        if (g.seeking[i]) return talk(said(i, 9));
        if (weekday() !== c.day || timeOfDay() !== c.time) return talk(said(i, 4));
        if (!(await ask(said(i, 5)))) return talk(said(i, 7));
        if (Object.keys(P().leaders).filter((k) => g.seeking[k]).length >= DOJO_MAX) return talk(said(i, 8));
        g.seeking[i] = true;
        await talk(said(i, 6));
      };
    }

    // ---------- The screen ----------

    let canvas = null, out = null;
    function ensureCanvas() {
      if (canvas) return;
      canvas = document.createElement("canvas");
      canvas.className = "party-menu pokegear hidden";
      canvas.width = W * 2; canvas.height = H * 2;
      const overlay = document.getElementById("overlay");
      overlay.parentNode.insertBefore(canvas, overlay);
      out = canvas.getContext("2d");
      out.imageSmoothingEnabled = false;
      mapImage = new Image();
    }
    let mapImage = null;   // (the Map card's picture of the region)
    let ui = null;   // { card, cursor, top, call, msg, more, ringing }
    const cards = () => [0, 1, 2].filter(hasCard);
    const list = () => (P() ? numbers().filter((i) => P().contacts[i]) : []);

    function paint() {
      if (!ui || !canvas) return;
      const s = GbaMenus.Surface(), frame = "type" + ((env.frame() || 0) + 1), fp = GM().frames[frame].palette, std = GM().palettes.std3;
      // The case: gold, a darker band along the top for the cards.
      s.fill(0, 0, W, H, GOLD);
      for (let y = 18; y < H; y += 8) s.fill(0, y, W, 1, GOLD_LIGHT);
      s.fill(0, 0, W, 17, GOLD_DARK);
      // The cards you have, the one you're on lit; the day and time.
      let x = 4;
      for (const n of cards()) {
        const on = n === ui.card && ui.call == null, w = s.textWidth(CARDS[n]) + 12;
        s.fill(x, 2, w, 14, on ? CREAM : GOLD);
        s.text(CARDS[n], x + 6, 2, on ? DARK : WHITE, on ? LIGHT : GOLD_DARK);
        x += w + 3;
      }
      const t = clock(), time = DAYS[t.weekday] + " " + t.hour + ":" + String(t.minute).padStart(2, "0");
      s.text(time, W - 6 - s.textWidth(time), 2, WHITE, GOLD_DARK);
      // The card's window (your frame), and the message box under it.
      s.frame(frame, fp, 1, 3, 28, 10);
      s.fill(8, 24, 224, 80, WHITE);
      if (ui.call != null) paintCall(s);
      else if (ui.card === 0) paintPhone(s);
      else if (ui.card === 1) paintMap(s);
      else paintRadio(s);
      s.frame("std", std, 1, 15, 28, 4);
      s.fill(8, 120, 224, 32, WHITE);
      const lines = String(ui.msg != null ? ui.msg : help()).split("\n").slice(0, 2);
      lines.forEach((l, i) => s.text(l, 12, 122 + 16 * i, DARK, LIGHT));
      if (ui.more) s.text("▼", 222, 138, RED, LIGHT, "small");
      // (A question's YES and NO, beside the message box.)
      if (ui.choice != null) {
        s.frame("std", std, 23, 10, 5, 4);
        s.fill(184, 80, 40, 32, WHITE);
        ["YES", "NO"].forEach((t, k) => { s.text(t, 198, 82 + 16 * k, DARK, LIGHT); if (ui.choice === k) s.text("▶", 187, 82 + 16 * k, DARK, LIGHT); });
      }
      out.clearRect(0, 0, W * 2, H * 2);
      out.drawImage(s.canvas(), 0, 0, W * 2, H * 2);
      // (The caller's picture, in its frame: a sprite's first frame, facing you, or a trainer's picture made small.)
      if (ui.call != null) {
        const img = portrait(ui.call);
        if (img && img.complete && img.naturalWidth) {
          out.imageSmoothingEnabled = false;
          if (img.ow) {
            const fw = img.naturalHeight === 32 && img.naturalWidth % 32 === 0 ? 32 : 16, fh = img.naturalHeight;
            out.drawImage(img, 0, 0, fw, fh, (148 - fw / 2) * 2, (44 - fh / 2) * 2, fw * 2, fh * 2);
          } else out.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 132 * 2, 28 * 2, 64, 64);
        }
      }
      // (The Map card: the region's map, small, and where you are on it.)
      const M = ui.card === 1 && ui.call == null && miniMap();
      if (M && mapImage.complete && mapImage.naturalWidth) {
        out.drawImage(mapImage, M.R.x0, M.R.y0, M.R.width * 8, M.R.height * 8, M.x * 2, M.y * 2, M.w * 2, M.h * 2);
        if (M.cell) {
          const px = (M.x + (M.cell[0] + 0.5) * 8 * M.k) * 2, py = (M.y + (M.cell[1] + 0.5) * 8 * M.k) * 2;
          out.fillStyle = "#fff"; out.fillRect(px - 5, py - 5, 10, 10);
          out.fillStyle = "rgb(224,56,40)"; out.fillRect(px - 3, py - 3, 6, 6);
        }
      }
    }
    // The region's map grid (Johto's, or Kanto's), fitted into the card, and your square on it.
    function miniMap() {
      const JT = window.JOHTO_TOWN_MAP, KT = window.TOWN_MAP, map = env.map(), loc = env.player().location || {};
      let R, cell = null;
      if (inJohto() && JT) {
        R = JT;
        const at = JT.at[map];
        if (at) cell = at[2] ? [at[0] + Math.floor((loc.x | 0) / 32), at[1] + Math.floor((loc.y | 0) / 32)] : [at[0], at[1]];
      } else if (KT) {
        R = { image: "assets/town-map/kanto.png", x0: 32, y0: 32, width: KT.width, height: KT.height };
        const sec = KT.mapSections && KT.mapSections[map];
        for (let y = 0; sec && y < KT.height; y++) for (let x = 0; x < KT.width; x++) if (KT.map[y][x] === sec && !cell) cell = [x, y];
      } else return null;
      if (cell) cell = [Math.max(0, Math.min(R.width - 1, cell[0])), Math.max(0, Math.min(R.height - 1, cell[1]))];
      const k = Math.min(200 / (R.width * 8), 60 / (R.height * 8)), w = Math.round(R.width * 8 * k), h = Math.round(R.height * 8 * k);
      return { R, cell, k, w, h, x: 120 - (w >> 1), y: 42 };
    }
    function help() {
      if (ui.call != null) return "";
      if (ui.card === 0) return list().length ? "Whom do you want to call?" : "No phone numbers are registered.";
      if (ui.card === 1) return "Press A to look at the Town Map.";
      return radio.station ? "" : radioStations().length ? "Choose a station to listen to." : "There's no signal here...";
    }
    const arrow = (s, ax, ay, up) => { for (let r = 0; r < 4; r++) s.fill(ax + r, ay + (up ? 3 - r : r), 7 - 2 * r, 1, DARK); };
    const ROWS = 5;
    function paintPhone(s) {
      const L = list();
      ui.cursor = Math.max(0, Math.min(ui.cursor, L.length - 1));
      ui.top = Math.max(0, Math.min(ui.top, ui.cursor), ui.cursor - ROWS + 1);
      L.slice(ui.top, ui.top + ROWS).forEach((i, r) => {
        const c = P().contacts[i], y = 26 + 16 * r;
        s.text(c.name, 22, y, DARK, LIGHT);
        if (c.cls) s.text(c.cls, 226 - s.textWidth(c.cls, "small"), y + 2, DARK, LIGHT, "small");
        if (ui.top + r === ui.cursor) s.text("▶", 12, y, DARK, LIGHT);
      });
      if (ui.top > 0) arrow(s, 116, 20, true);
      if (ui.top + ROWS < L.length) arrow(s, 116, 105, false);
    }
    function paintMap(s) {
      s.text(inJohto() ? "Johto" : "Kanto", 14, 26, DARK, LIGHT);
      const here = section(env.map()).name;
      if (here) s.text(here, 226 - s.textWidth(here, "small"), 28, DARK, LIGHT, "small");
      const M = miniMap();
      mapImage.onload = paint;
      if (M && !mapImage.src.endsWith(M.R.image)) mapImage.src = M.R.image;
      if (M) s.fill(M.x - 1, M.y - 1, M.w + 2, M.h + 2, DARK);
    }
    // Who's calling, in a picture: their overworld sprite (the story's people
    // by name, a trainer's where they stand), or else their trainer picture.
    const PORTRAITS = { MOTHER: "hgss_gsmama", PROF__ELM: "hgss_doctor", PROF__OAK: "prof_oak", ETHAN: "hgss_hero", LYRA: "hgss_heroine",
      KURT: "hgss_gantetsu", DAY_C_MAN: "hgss_gsoldman1", DAY_C_LADY: "hgss_gsoldwoman1", BUENA: "hgss_gswoman2", BILL: "hgss_masaki",
      BIKE_SHOP: "hgss_gsmiddleman1", BAOBA: "hgss_gsgentleman" };
    const portraits = {};
    function portrait(i) {
      const c = P().contacts[i];
      if (!c) return null;
      if (!(i in portraits)) {
        let src = null, ow = true;
        if (PORTRAITS[c.id]) src = "assets/world/sprites/" + PORTRAITS[c.id] + ".png";
        else if (c.trainer) {
          for (const m of Object.values(window.WORLD_MAPS || {})) {
            const p = (m.people || []).find((q) => q.trainer && q.trainer.id === c.trainer && q.sprite);
            if (p) { src = "assets/world/sprites/" + p.sprite + ".png"; break; }
          }
          const t = window.WORLD_TRAINERS && window.WORLD_TRAINERS[c.trainer];
          if (!src && t && t.pic) { src = "assets/sprites/trainers/front/" + t.pic + ".png"; ow = false; }
        }
        const img = src ? new Image() : null;
        if (img) { img.onload = () => { if (ui) paint(); }; img.src = src; img.ow = ow; }
        portraits[i] = img;
      }
      return portraits[i];
    }
    function paintCall(s) {
      const c = P().contacts[ui.call];
      // (Their picture's place: a frame at the right of the name, by the handset.)
      s.fill(130, 26, 36, 36, DARK); s.fill(132, 28, 32, 32, WHITE);
      s.text(c.name, 22, 30, DARK, LIGHT);
      if (c.cls) s.text(c.cls, 22, 48, DARK, LIGHT, "small");
      if (c.where) s.text(c.where, 22, 64, DARK, LIGHT, "small");
      // (A handset: ringing, or on the line.)
      const hx = 176, hy = 34;
      s.fill(hx, hy, 32, 8, DARK); s.fill(hx, hy + 8, 8, 24, DARK); s.fill(hx + 24, hy + 8, 8, 24, DARK);
      s.fill(hx + 2, hy + 2, 28, 4, ui.ringing ? RED : GOLD);
      const status = ui.ringing ? "Ringing..." : "On the line";
      s.text(status, 192 - (s.textWidth(status, "small") >> 1), 80, DARK, LIGHT, "small");
    }
    function paintRadio(s) {
      const st = radioStations();
      if (!st.length) { s.text("No signal", 120 - (s.textWidth("No signal") >> 1), 56, DARK, LIGHT); return; }
      // The dial: a mark for each station, the needle on the one tuned in.
      s.fill(20, 34, 200, 2, DARK);
      st.forEach((k, i) => {
        const x = 20 + Math.round((i + 0.5) * 200 / st.length);
        s.fill(x, 30, 1, 10, DARK);
        if (radio.station === k) s.fill(x - 1, 26, 3, 16, RED);
      });
      ui.cursor = Math.max(0, Math.min(ui.cursor, st.length));
      st.concat(["off"]).forEach((k, i) => {
        const y = 44 + 12 * i, name = k === "off" ? "Turn off" : SHOWS[k].title();
        s.text(name, 22, y, DARK, LIGHT, "small");
        if (ui.cursor === i) s.text("▶", 12, y - 1, DARK, LIGHT, "small");
      });
      if (radio.station) {
        const host = SHOWS[radio.station].host();
        if (host) s.text(host, 226 - s.textWidth(host, "small"), 44, DARK, LIGHT, "small");
      }
    }

    function showCanvas(on) { ensureCanvas(); canvas.classList.toggle("hidden", !on); }
    const press = (want) => GbaMenus.keys((k) => (want.includes(k) ? k : undefined));
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    // Pages in the message box, two lines at a time, A (or B) for the next.
    // (A line too wide for FireRed's box, as some of HGSS's are, wraps.)
    const MAX_WIDTH = 212;
    function wrap(text) {
      const s = GbaMenus.Surface(), out = [];
      let line = "";
      for (const w of text.split(" ")) {
        const t = line ? line + " " + w : w;
        if (line && s.textWidth(t) > MAX_WIDTH) { out.push(line); line = w; } else line = t;
      }
      return line ? out.concat(line) : out;
    }
    const fits = (lines) => { const s = GbaMenus.Surface(); return lines.every((l) => s.textWidth(l) <= MAX_WIDTH); };
    const chunked = (pages) => {
      const chunks = [];
      for (const p of pages) {
        let ls = p.split("\n");
        if (!fits(ls)) ls = wrap(ls.join(" "));
        for (let k = 0; k < ls.length; k += 2) chunks.push(ls.slice(k, k + 2).join("\n"));
      }
      return chunks;
    };
    async function talk(pages) {
      const chunks = chunked(pages);
      for (let k = 0; k < chunks.length; k++) {
        ui.msg = chunks[k]; ui.more = k < chunks.length - 1; paint();
        await press(["a", "b"]);
      }
      ui.more = false;
    }
    // A question on the line (PhoneCall_TouchscreenListMenu's Yes and No):
    // its last part stays up with YES and NO beside it; B is No.
    async function ask(pages) {
      const chunks = chunked(pages);
      await talk(chunks.slice(0, -1));
      ui.msg = chunks[chunks.length - 1] || ""; ui.choice = 0; paint();
      const yes = await GbaMenus.keys((k) => {
        if (k === "up" || k === "down") { ui.choice = k === "up" ? 0 : 1; env.sfx("se_select"); paint(); return undefined; }
        if (k === "a") return ui.choice === 0;
        if (k === "b") return false;
        return undefined;
      });
      env.sfx("se_select");
      ui.choice = null;
      return yes;
    }

    // ---------- A call ----------
    // Calling them: the line rings ("......"), they answer; or they call you.
    // Then what they say, and the line goes ("Click! ......").
    async function phone(i, incoming, script) {
      if (!P() || !P().contacts[i]) return;
      const wasOpen = !!ui;
      if (!wasOpen) ui = { card: 0, cursor: 0, top: 0 };
      const keep = { card: ui.card, msg: ui.msg };
      ui.call = i; ui.ringing = true;
      showCanvas(true);
      const R = P().common;
      if (!incoming && !canCall()) {
        ui.msg = R.click[0]; paint(); env.sfx("se_click"); await sleep(400);
        await talk([R.outOfArea]);
      } else {
        for (let k = 0; k < 3; k++) { ui.msg = incoming ? "" : R.ringing[k]; paint(); env.sfx(incoming ? "se_ding_dong" : "se_select"); await sleep(incoming ? 700 : 500); }
        ui.ringing = false;
        const lines = whatTheySay(i, incoming, script);
        if (typeof lines === "function") await lines(); else await talk(lines);
        for (const t of R.click) { ui.msg = t; paint(); await sleep(250); }
        env.sfx("se_click");
        await sleep(300);
      }
      ui.call = null; ui.ringing = false; ui.msg = keep.msg; ui.card = keep.card;
      if (!wasOpen) { ui = null; showCanvas(false); } else paint();
    }
    // (MapHeader_CanPlacePhoneCalls: not from some caves and rooms.)
    const canCall = () => !(P().noCalls || []).includes(hgssMap(env.map()));

    // A script's call (PhoneCall who, 2, n): Elm's story calls, Oak's and Baoba's.
    async function call(who, kind, n) {
      if (!P()) return;
      const script = who === 0 ? MOM_STORY : who === 1 ? P().elmCalls[n] : who === 2 ? P().oakCall : who === 24 ? P().baobaCall : null;
      if (script == null) return;
      await phone(who, true, script);
    }

    // ---------- Calls while you walk ----------
    let walked = 0, pending = null;
    const trigger = (n, on) => { const t = state().triggers; if (on) t[n] = true; else delete t[n]; };
    function step() {
      if (P() && has()) syncDeliveryman();
      if (!P() || !has() || pending != null || ++walked < CALL_STEPS) return null;
      const map = hgssMap(env.map());
      if (map && P().noCalls.includes(map)) return null;
      // (A call trigger first: Elm's when the Egg hatches, and the like; not from your own map.)
      const due = Object.keys(state().triggers).map(Number).find((n) => TRIGGERS[n] && !isHere(P().contacts[TRIGGERS[n][0]]));
      if (due != null) { pending = { who: TRIGGERS[due][0], script: TRIGGERS[due][1], trigger: due }; return { type: "phone" }; }
      walked = 0;
      // (The Option screen's GEAR CALLS off: no one rings just to chat; the story's calls still come.)
      if (window.GameOptions && window.GameOptions.get().calls) return null;
      if (rnd(100) > CALL_CHANCE) return null;
      const who = caller();
      if (who == null) return null;
      pending = { who };
      return { type: "phone" };
    }
    // Who calls (ov02_02251FDC): one of three groups (half the time the
    // first, then 30 and 20 percent), someone in it you've the number of who
    // isn't where you are, each in turn before anyone calls again.
    function caller() {
      const r = rnd(1000), group = r < 500 ? 0 : r < 800 ? 1 : 2;
      const inGroup = numbers().filter((i) => P().contacts[i] && P().contacts[i].group === group && CALLERS.has(P().contacts[i].type));
      if (!inGroup.length) return null;
      const g = state(), done = g.called[group] || (g.called[group] = []);
      if (inGroup.every((i) => done.includes(i))) done.length = 0;
      const h = clock().hour;
      const can = inGroup.filter((i) => !isHere(P().contacts[i]) && !done.includes(i) && !(P().contacts[i].type === T.BUENA && (h % 3 === 2 || takeover())));
      if (!can.length) return null;
      const who = can[rnd(can.length)];
      done.push(who);
      return who;
    }
    async function ring() {
      const p = pending;
      pending = null; walked = 0;
      if (!p) return;
      if (p.trigger != null) trigger(p.trigger, false);
      await phone(p.who, true, p.script != null ? p.script : null);
    }

    // ---------- Trainers ----------
    const contactOf = (trainer) => (P() ? P().contacts.findIndex((c) => c.trainer === trainer) : -1);
    // GetPhoneBookRematch (PhoneBookTrainerGetRematchInfo): if they want a
    // rematch, the trainer they battle as: the first of their tiers you
    // haven't beaten, as far as the story's let them go (FLAG_UNK_97C on:
    // the second after the Radio Tower, then the Elite Four, then Blue), else 0.
    function rematch(i) {
      const c = P() && P().contacts[i];
      if (!c || !state().seeking[i]) return 0;
      if (i === KENJI && timeOfDay() !== 1) return 0;
      const set = P().rematch[c.trainer];
      if (!set) return 0;
      let n = set.length - 1;
      for (let k = 1; k < set.length; k++) if (!env.beaten(set[k])) { n = k; break; }
      if (n > 0 && !J().flag("FLAG_UNK_" + (0x97B + n).toString(16).toUpperCase())) n = n - 1 > 0 ? n - 1 : 0;
      return set[n];
    }
    // Their number (HGSS's std trainer script: GetPhoneContactMsgIds 0, or 3
    // asking again): Yes, and it's in the Pokégear.
    async function askNumber(i, ask) {
      const c = P().contacts[i], b = buffers(i), pages = fill(c.msgs[ask], b);
      if (pages.length > 1) await env.say(pages.slice(0, -1));
      if (await env.confirm(pages[pages.length - 1])) {
        env.fanfare("gs_me_pokegear_regist");
        await env.say(P().common.registered);
        register(i);
        await env.say(fill(c.msgs[2], b));
      } else await env.say(fill(c.msgs[3], b));
    }
    async function giveGift(i, item) {
      const c = P().contacts[i];
      await env.say(fill(c.msgs[5], buffers(i)));
      await env.giveItem(item);
    }
    // (Only once you have the Pokégear; asked on the map, after the battle.)
    function wantsNumber(person) {
      const i = contactOf(person.trainer && person.trainer.id);
      return i >= 0 && !registered(i) && has();
    }
    async function beatTrainer(person) {
      const i = contactOf(person.trainer && person.trainer.id);
      if (i < 0 || registered(i) || !has()) return;
      await askNumber(i, 1);
    }
    async function talkTrainer(person) {
      const id = person.trainer && person.trainer.id, i = contactOf(id);
      if (i < 0 || !env.beaten(id)) return false;
      const g = state(), tier = rematch(i);
      if (tier) {
        const intro = window.WORLD_TRAINERS[tier] && tier !== id ? window.WORLD_TRAINERS[tier].intro : P().rematchIntro[id];
        const outcome = await env.rematch(person, tier, intro || []);
        if (outcome !== "won") return true;
        env.setBeaten(tier, true);
        delete g.seeking[i];
        // (And their gift: ScrCmd_GetPhoneContactRandomGiftBerry.)
        const gift = P().contacts[i].gift;
        if (gift) await giveGift(i, gift === "berry" ? BERRIES[rnd(10)] : gift);
        return true;
      }
      if (g.gifts[i]) { const item = g.gifts[i]; delete g.gifts[i]; await giveGift(i, item); return true; }
      if (!registered(i)) { await askNumber(i, 4); return true; }
      return false;
    }

    // ---------- The radio ----------
    //
    // The stations here (Radio_GetAvailableChannels): none where there's no
    // signal; only the Unown's in the Ruins of Alph's hall; the Mahogany
    // signal round Mahogany until its hideout's cleared; only Team Rocket's
    // broadcast while they've the Radio Tower; else Johto's (or Kanto's, with
    // the Poké Flute). Each show's song plays, and its lines come one by one
    // (and round again); the song carries on as you walk, until the map's
    // music comes back. While Pokémon Music plays its March, wild Pokémon
    // come twice as often; its Lullaby, half as often.
    const radio = { station: null, song: null, map: null, lines: [], at: 0, timer: null };
    const R = () => P().radio;
    const SHOWS = {
      music: { title: () => R().music[0], host: () => R().music[1], song: () => ([2, 4, 6].includes(weekday()) ? "gs_radio_komoriuta" : "gs_radio_march"),
        // (Sunday's GB Sounds and the National Dex's Hoenn and Sinnoh sounds: the March or Lullaby here.)
        lines: () => R().music[2].concat(R().music[weekday() === 0 ? 12 : 3 + weekday()]) },
      talk: { title: () => R().talk[0], host: () => R().talk[1], song: () => "gs_ohkido_rabo", lines: talkLines },
      // (Today's password, with a Blue Card: heard, FLAG_DAILY_HEARD_BUENAS_PASSWORD, for Buena at the Radio Tower.)
      buena: { title: () => R().buena[0], host: () => R().buena[1], song: () => "gs_aikotoba",
        lines: () => {
          const card = env.hasItem("blue-card");
          if (card) J().setFlag("FLAG_DAILY_HEARD_BUENAS_PASSWORD", true);
          return R().buena[2].concat(fill(card ? R().buena[4] : R().buena[5], { 0: password() }), R().buena[3]);
        } },
      // (The Variety Channel's other hours: the Search Party and the Silver Drama, just their openings here.)
      search: { title: () => R().search[0], host: () => R().search[1], song: () => null, lines: () => R().search[2] },
      drama: { title: () => R().drama[0], host: () => R().drama[1], song: () => null, lines: () => R().drama[2] },
      rocket: { title: () => R().rocket[0], host: () => R().rocket[1], song: () => "gs_senkyo_r", lines: () => R().rocket[2] },
      unown: { title: () => R().unown[0], host: () => "", song: () => "gs_radio_unknown", lines: () => [] },
      signal: { title: () => R().signal[0], host: () => "", song: () => "gs_kaidenpa", lines: () => [] },
      flute: { title: () => R().flute[0], host: () => "", song: () => "gs_hue", lines: () => [] }
    };
    // Buena's password today (Save_VarsFlags_UpdateBuenasPasswordSet): one of
    // her thirty (msg_0066_D23R0102's, ten kinds of three), a new one at random
    // each day on the step clock, never the same as the day before.
    function passwordSet() {
      const g = state(), today = clock().today;
      if (!g.password || g.password.day !== today) {
        let n = rnd(30);
        if (g.password && n === g.password.set) n = (n + 1) % 30;
        g.password = { day: today, set: n };
      }
      return g.password.set;
    }
    const password = () => R().passwords[passwordSet()];
    // (The Variety Channel, RadioShow_TranslateStationID's station 3: the hour
    // as the step clock has it, by threes: the Search Party, the Silver Drama,
    // then Buena's Password, on air at 2, 5, 8, 11 ... as HGSS has it.)
    const variety = () => ["search", "drama", "buena"][clock().hour % 3];
    // Pokémon Talk (RadioShow_PokemonTalk): five places in the region with
    // wild Pokémon, one of the Pokémon there (one you haven't caught, mostly),
    // and Mary's two phrases about it.
    function talkLines() {
      const johto = inJohto(), maps = Object.values(window.WORLD_MAPS).filter((m) => (m.region === "johto") === johto && m.wild && m.wild.slots && section(m.name).name);
      const seen = new Set(), out = R().talk[2].slice();
      const step = (rnd(3) + 1) * 2;
      let p1 = rnd(13), p2 = rnd(13);
      for (let n = 0; n < 5 && maps.length; n++) {
        let m;
        for (let tries = 0; tries < 20; tries++) { m = maps[rnd(maps.length)]; if (!seen.has(section(m.name).name)) break; }
        seen.add(section(m.name).name);
        const kinds = [...new Set(m.wild.slots.flatMap((s) => [s.species, s.morning, s.night]).filter(Boolean))];
        const fresh = kinds.filter((sp) => !env.caught(sp));
        const sp = (fresh.length > 1 || (fresh.length === 1 && rnd(2)) ? fresh : kinds)[rnd((fresh.length > 1 || (fresh.length === 1 && rnd(2)) ? fresh : kinds).length)];
        const b = { 0: section(m.name).name, 1: sp, 2: R().talk[6 + p1], 3: R().talk[19 + p2] };
        out.push(...fill(R().talk[4], b), ...fill(R().talk[5], b));
        p1 = (p1 + step) % 13; p2 = (p2 + step) % 13;
      }
      return out.concat(R().talk[3]);
    }
    function radioStations() {
      if (!P()) return [];
      const map = env.map(), c = hgssMap(map);
      if (c && R() && P().noRadio.includes(c)) return [];
      if (c && R().alph.includes(c)) return ["unown"];
      if (!inJohto()) return ["music", "talk", "flute"];
      if (c && R().mahogany.includes(c) && !J().flag("FLAG_ROCKET_HIDEOUT_CLEARED")) return ["signal"];
      if (takeover()) return ["rocket"];
      return ["music", "talk", variety()];
    }
    function tune(k) {
      clearInterval(radio.timer);
      radio.station = k || null;
      if (!k) { radio.song = null; env.mapMusic(); paint(); return; }
      const show = SHOWS[k];
      const lines = () => [].concat(...show.lines().map((l) => (fits([l]) ? [l] : wrap(l))));
      radio.song = show.song(); radio.map = env.map(); radio.lines = lines(); radio.at = 0;
      if (radio.song) env.music(radio.song); else env.mapMusic();
      const next = () => {
        if (!radio.lines.length) { if (ui && ui.call == null) { ui.msg = show.title(); paint(); } return; }
        const a = radio.lines[radio.at % radio.lines.length], b2 = radio.lines[(radio.at + 1) % radio.lines.length];
        radio.at++;
        if (radio.at >= radio.lines.length) { radio.at = 0; if (k === "talk") radio.lines = lines(); }
        if (ui && ui.call == null && ui.card === 2) { ui.msg = a + (radio.lines.length > 1 ? "\n" + b2 : ""); paint(); }
      };
      next();
      radio.timer = setInterval(next, 1800);
    }
    // (Still playing: on this map (or `map`), the map's music not back.)
    function radioOn(map) {
      if (!radio.song) return false;
      const now = window.GameAudio && window.GameAudio.now && window.GameAudio.now();
      if (radio.map !== (map || env.map()) || (now && now !== radio.song)) { radio.song = null; radio.station = null; clearInterval(radio.timer); return false; }
      return true;
    }
    function encounterRate() {
      if (!radioOn()) return 1;
      return radio.song === "gs_radio_march" ? 2 : radio.song === "gs_radio_komoriuta" ? 0.5 : 1;
    }

    // ---------- Mom's savings ----------
    //
    // While she's saving (FLAG_SYS_MOMS_SAVINGS: she asks on the phone), a
    // quarter of each battle's prize goes to her (sub_0205230C), up to
    // $999,999. As your savings pass each mark of hers she buys you something
    // with them (MomGift_TryEnqueueGiftOnBalanceChange: HGSS's nine, in turn,
    // and otherwise a Berry, five of one of seventeen, each time they pass
    // another $3,000), up to five waiting, and calls to say so; Johto's Poké
    // Marts' deliveryman has it for you (std_moms_gift_deliveryman). At home
    // she'll give you some back, or keep more (her bank).
    const momState = () => { const g = state(); return g.mom || (g.mom = { balance: 0, queue: [], given: [] }); };
    function savePrize(prize) {
      const m = momState();
      if (!J().flag("FLAG_SYS_MOMS_SAVINGS") || m.balance >= MOM_MAX) return 0;
      let d = Math.floor(prize / 4);
      if (d <= 0) return 0;
      if (m.balance + d >= MOM_MAX) d = MOM_MAX - m.balance;
      const old = m.balance;
      m.balance += d;
      if (buyGifts(old)) trigger(12, true);
      syncDeliveryman();
      return d;
    }
    function buyGifts(old) {
      const m = momState(), M = P().mom, spend = (n) => { m.balance = Math.max(0, m.balance - n); };
      if (m.queue.length >= MOM_QUEUE) return false;
      let bought = 0;
      for (let i = 0; i < M.gifts.length; i++) {
        if (m.given.includes(i)) continue;
        if (m.balance < M.gifts[i][1]) break;
        m.given.push(i); m.queue.push([M.gifts[i][0], 1]); spend(M.gifts[i][2]); bought++;
        if (m.queue.length >= MOM_QUEUE) break;
      }
      if (bought) return true;
      if (Math.floor(m.balance / M.berryEvery) <= Math.floor(old / M.berryEvery)) return false;
      const [berry, n, cost] = M.berries[rnd(M.berries.length)];
      m.queue.push([berry, n]); spend(cost);
      return true;
    }
    // (The deliveryman's there while she's something waiting for you: HGSS's flag for him.)
    const syncDeliveryman = () => { const hide = !momState().queue.length; if (J().flag("FLAG_HIDE_MOM_GIFT_DELIVERYMAN") !== hide) J().setFlag("FLAG_HIDE_MOM_GIFT_DELIVERYMAN", hide); };
    // The deliveryman (scr_seq_0144_002): good morning, day or evening (ScrCmd_379), a package from your mom.
    async function deliveryman() {
      const D = P().mom.delivery, b = { 0: env.player().name }, m = momState(), h = clock().hour;
      if (!m.queue.length) { await env.say(fill(D[30], b)); return; }
      await env.say(fill(D[h >= 4 && h < 10 ? 27 : h >= 10 && h < 17 ? 28 : 29], b));
      const [item, n] = m.queue.shift();
      await env.giveItem(item, n);
      trigger(12, false);
      syncDeliveryman();
      await env.say(fill(D[20], b));
    }
    // Mom at home (scr_seq_T20R0201's _0275), once she's on the Pokégear: is
    // this about your money? WITHDRAW, DEPOSIT MONEY, CHANGE (keep saving, or
    // not) or EXIT; how much (BankTransaction), and her word on it.
    async function momHome() {
      if (!P() || !has()) return false;
      const H = P().mom.home, b = { 0: env.player().name }, m = momState(), say = (n) => env.say(fill(H[n], b));
      const q = fill(H[20], b);
      await env.say(q.slice(0, -1));
      const k = await env.choose([29, 30, 31, 32].map((n) => H[n][0]), q[q.length - 1].replace(/\s+$/, ""));
      if (k === 0) {
        if (env.money() >= MOM_MAX) return say(28).then(() => true);
        if (!m.balance) return say(22).then(() => true);
        const n = await env.amount("How much do you want to take?", Math.min(m.balance, MOM_MAX - env.money()), { saved: m.balance, held: env.money() });
        if (!n) return say(21).then(() => true);
        m.balance -= n; env.addMoney(n); env.sfx("se_shop");
        await say(24);
      } else if (k === 1) {
        if (m.balance >= MOM_MAX) return say(27).then(() => true);
        if (!env.money()) return say(26).then(() => true);
        const n = await env.amount("How much do you want to save?", Math.min(env.money(), MOM_MAX - m.balance), { saved: m.balance, held: env.money() });
        if (!n) return say(21).then(() => true);
        m.balance += n; env.addMoney(-n); env.sfx("se_shop");
        await say(23);
      } else if (k === 2) {
        const yes = await env.confirm(fill(H[25], b)[0].replace(/\s+$/, ""));
        J().setFlag("FLAG_SYS_MOMS_SAVINGS", yes);
        await say(yes ? 17 : 18);
      } else await say(21);
      return true;
    }

    // ---------- The Gym Leaders ----------
    //
    // Once Johto's League is won (FLAG_GAME_CLEAR), each Gym Leader this game
    // has gives you their number in their own Gym (HGSS has them give it in
    // places of their own, after the League: their words from there, where
    // they're their own). Called on their day and time, they'll battle you at
    // Saffron's Fighting Dojo (scr_seq_T11R0101): they're there, and battle
    // with their rematch team (TRAINER_LEADER_*_2), until you've won.
    const leaderOf = (person, map) => {
      if (!P() || !P().leaders) return -1;
      if (person.gearLeader != null) return person.gearLeader;
      const johtoGym = /_Gym$|_GymLeaderRoom$/.test(map || env.map()) && (window.WORLD_MAPS[map || env.map()] || {}).region === "johto";
      for (const [i, L] of Object.entries(P().leaders)) {
        const id = P().contacts[i].id;
        if (KANTO_LEADERS[id] ? person.script === KANTO_LEADERS[id] : johtoGym && person.sprite === L.look.sprite) return +i;
      }
      return -1;
    };
    // (Their words: their own question for it, else a plain one; Yes, the
    // jingle and their number; when to call, by the phone book.)
    function leaderWords(i) {
      const c = P().contacts[i], n = P().leaders[i].number || {}, nm = c.name, own = (p) => !!p && p[0] && p[0].startsWith(nm + ":");
      const when = [nm + ": Give me a call on " + WEEKDAYS[c.day] + "\n" + ["mornings", "afternoons", "nights"][c.time] + " for a battle!"];
      const asks = n.ask || [], k = asks.map((p) => /number/i.test(p)).lastIndexOf(true);
      const ask = own(asks) && k >= 0 ? [k === 0 ? asks[0] : nm + ": " + asks[k]] : [nm + ": Do you want to exchange\nphone numbers?"];
      const yesReg = (n.yes || []).some((p) => /registered/.test(p));
      return { ask, yes: yesReg ? n.yes : n.after || [], after: yesReg && own(n.after) ? n.after : when, no: own(n.no) ? n.no : [nm + ": Oh, that's too bad..."] };
    }
    async function leaderNumber(i) {
      const w = leaderWords(i), b = buffers(i), q = fill(w.ask, b);
      if (q.length > 1) await env.say(q.slice(0, -1));
      if (!(await env.confirm(q[q.length - 1].replace(/\s+$/, "")))) { await env.say(fill(w.no, b)); return; }
      env.fanfare("gs_me_pokegear_regist");
      await env.say(fill(w.yes.length ? w.yes : P().common.registered, b));
      register(i);
      await env.say(fill(w.after, b));
    }
    // (At the Dojo: there while waiting for you.)
    function visible(person) {
      if (person.gearLeader == null) return undefined;
      return !!(P() && state().seeking[person.gearLeader] && registered(person.gearLeader));
    }
    async function talkPerson(person, map) {
      if (!P()) return false;
      if (person.script === "gear:deliveryman") { await deliveryman(); return true; }
      const i = leaderOf(person, map);
      if (i < 0) return false;
      const L = P().leaders[i], g = state();
      if (person.gearLeader != null) {
        if (!g.seeking[i]) return true;
        const outcome = await env.rematch(person, L.trainer, L.intro);
        if (outcome !== "won") return true;
        env.setBeaten(L.trainer, true);
        delete g.seeking[i];
        await env.say(L.defeat);
        env.removePerson(person);
        return true;
      }
      if (!env.gameClear() || registered(i)) return false;
      await leaderNumber(i);
      return true;
    }

    // ---------- The Pokégear ----------
    async function open() {
      ensureCanvas();
      ui = { card: cards().includes(open.last) ? open.last : 0, cursor: 0, top: 0, call: null, msg: null };
      if (ui.card === 2) ui.cursor = Math.max(0, radioStations().indexOf(radio.station));
      showCanvas(true);
      env.sfx("se_win_open");
      const clock = setInterval(paint, 15000);
      try {
        for (;;) {
          if (ui.card !== 2 || !radio.station) ui.msg = null;
          paint();
          const act = await GbaMenus.keys((k) => {
            const C = cards(), at = C.indexOf(ui.card);
            if (k === "b" || k === "start") return "exit";
            if (k === "left" || k === "right") {
              const to = C[(at + (k === "left" ? C.length - 1 : 1)) % C.length];
              if (to !== ui.card) { ui.card = to; ui.cursor = ui.card === 2 ? Math.max(0, radioStations().indexOf(radio.station)) : 0; ui.top = 0; env.sfx("se_select"); return "redraw"; }
              return undefined;
            }
            const n = ui.card === 0 ? list().length : ui.card === 2 ? radioStations().length + (radioStations().length ? 1 : 0) : 0;
            if ((k === "up" || k === "down") && n) {
              const c = Math.max(0, Math.min(n - 1, ui.cursor + (k === "up" ? -1 : 1)));
              if (c !== ui.cursor) { ui.cursor = c; env.sfx("se_select"); paint(); }
              return undefined;
            }
            if (k === "a") {
              if (ui.card === 0 && n) return "call";
              if (ui.card === 1) return "map";
              if (ui.card === 2 && n) return "tune";
            }
            return undefined;
          });
          if (act === "exit") break;
          if (act === "call") { env.sfx("se_select"); await phone(list()[ui.cursor], false, null); }
          else if (act === "map") { showCanvas(false); await env.townMap(); showCanvas(true); }
          else if (act === "tune") { env.sfx("se_select"); const st = radioStations(); tune(ui.cursor < st.length ? st[ui.cursor] : null); }
        }
      } finally {
        clearInterval(clock);
        open.last = ui.card;
        ui = null;
        showCanvas(false);
      }
    }

    return { has, open, call, registerCard, rematch, setTrigger: trigger, step, ring, wantsNumber, beatTrainer, talkTrainer, encounterRate,
      registered, contactOf, radioOn, timeOfDay, passwordSet, savePrize, momHome, talkPerson, visible, deliveryman, radioStations,
      // (For tests: a call due on the next step; what someone says on a call.)
      callDue: () => { walked = CALL_STEPS; }, callLines: (i, incoming) => whatTheySay(i, !!incoming, null) };
  }

  // How much (HGSS's BankTransaction, in FireRed's windows): your savings
  // and the money you hold at the top right, the amount below, a digit at a
  // time (up and down change it, left and right go along); A to take it, B
  // for none. Returns the amount, or 0.
  async function amount(canvas, opts) {
    const max = Math.max(0, opts.max | 0), DIGITS = 6, frame = "type" + ((opts.frame || 0) + 1), fp = GM().frames[frame].palette, std = GM().palettes.std2;
    const cash = (n) => "$" + n.toLocaleString("en-US");
    let n = Math.min(1, max), at = DIGITS - 1;
    const draw = () => {
      const s = GbaMenus.Surface();
      s.frame(frame, fp, 17, 1, 12, 4);
      s.fill(136, 8, 96, 32, std[1]);
      [["SAVED", opts.saved], ["HELD", opts.held]].forEach(([t, v], k) => {
        s.text(t, 138, 9 + 16 * k, std[2], std[3]);
        s.text(cash(v | 0), 230 - s.textWidth(cash(v | 0)), 9 + 16 * k, std[2], std[3]);
      });
      s.frame(frame, fp, 17, 11, 12, 2);
      s.fill(136, 88, 96, 16, std[1]);
      const digits = String(n).padStart(DIGITS, "0"), x0 = 230 - DIGITS * 8;
      s.text("$", x0 - 10, 89, std[2], std[3]);
      for (let k = 0; k < DIGITS; k++) s.text(digits[k], x0 + 8 * k + (8 - s.textWidth(digits[k])) / 2, 89, std[2], std[3]);
      const ax = x0 + 8 * at;
      for (let r = 0; r < 3; r++) { s.fill(ax + 1 + r, 84 - r, 5 - 2 * r, 1, std[2]); s.fill(ax + 1 + r, 106 + r, 5 - 2 * r, 1, std[2]); }
      s.show(canvas);
    };
    canvas.classList.remove("hidden");
    draw();
    const r = await GbaMenus.keys((k) => {
      const step = Math.pow(10, DIGITS - 1 - at), before = n;
      if (k === "up") n = n + step > max ? max : n + step;
      else if (k === "down") n = Math.max(0, n - step);
      else if (k === "left") at = Math.max(0, at - 1);
      else if (k === "right") at = Math.min(DIGITS - 1, at + 1);
      else if (k === "a") return n;
      else if (k === "b") return 0;
      if (n !== before || k === "left" || k === "right") draw();
      return undefined;
    });
    canvas.classList.add("hidden");
    return r;
  }

  window.Pokegear = { create, amount };
})();
