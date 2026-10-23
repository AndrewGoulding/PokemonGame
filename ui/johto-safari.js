// Johto's Safari Zone, as HeartGold and SoulSilver's: west of Cianwood,
// through the Safari Zone Gate, Baoba's. Its six places (a 3x2 layout, top
// row west to east, then the bottom row) each hold one of twelve Areas
// (tools/build-johto-safari.js drew them: window.JOHTO_SAFARI), laid out as
// one of HGSS's ten default layouts until you change them with the Area
// Customizer (ScrCmd_716, Baoba's staff); each Area has its own grass,
// water and rod Pokémon (safari_enc.json), ten slots one in ten each. The
// Safari Game is HGSS's: ₽500 at the counter for 30 Safari Balls and no step
// limit (SafariZoneAction); every wild Pokémon is a Safari battle with Bait
// and Mud (engine/safari.js's HGSS rules), and it's over when the Balls are
// gone (std_safari_balls_out) or you leave.
//
// Object Arrangement (HGSS's, once Baoba's called about it): objects you put
// in the Areas (up to 30 an Area), each a Plains, Forest, Peak or Waterside
// kind (or none); an Area's objects of a kind add up to its points of that
// kind, more for each the longer the Area's been in your layout
// (SafariZoneAreaSet_GetObjectsInArea), and enough points bring an Area's
// bonus Pokémon in over its first slots (SafariZoneAreaSet_LoadAreaEncounters).
// Days are the step clock's (Player.gameTime). The objects block your way
// and are drawn on the map; in the Safari Game you place one facing an open
// spot, or take one away facing it (std_safari_place_object / _remove_object),
// and the Area Customizer's staff arranges them on an Area's grid
// (ui/johto-safari-objects.js).
//
//   const S = JohtoSafari.create(env);
//   S.patches(map)        // the Areas in the layout, as the map's patches (and their tiles)
//   S.areaAt(x, y)        // the Area at a tile of the Safari Zone, or -1
//   S.action(n)           // SafariZoneAction: 0 starts the Safari Game, 1 ends it
//   S.challenge(n)        // CheckSafariZoneChallengeCompleted: Baoba's Geodude (0), Sandshrew (1)
//   S.stamp()             // UpdateSafariZoneIGT: Baoba's clock for his next call
//   await S.customizer()  // the Area Customizer; true if the Areas were changed
//   await S.afterBattle(outcome)   // a Safari battle over: out of Balls, or of room
//   await S.retire()      // the Start menu's Retire (std_safari_exit)
//   S.arrive(map)         // into a map; S.tick() each step: the days, Baoba's calls
//   S.faced(map, x, y, surfing)    // A facing a tile: { type: "safari-object", x, y } or null
//   await S.fieldObject(x, y)      // ... placing an object there, or taking it away
//   S.phoneCall(script)   // Baoba calling (the Pokégear): what it changes; his words, or null
//   S.drawMap(g, map, x, y)        // the objects, on the map (Overworld's ctx.drawMap)
//
// env: player(), say(pages), confirm(question), choose(texts, { question, shown }),
//   teleport({ map, x, y, facing }), getVar(name), setVar(name, value) (HGSS's vars),
//   applyPatches(map), sfx(name), roomFor() (a space in your party or a Box),
//   frameScript() (runs the scene the map's frame table has due), isGirl(),
//   phone() (you've the Pokégear), phoneTrigger(n, on) (its call triggers),
//   nationalDex(), here() ({ x, y }: where you stand), arrange(api) (the
//   arranging screen: ui/johto-safari-objects.js).
(function () {
  "use strict";

  const MAP = "SafariZone_EntranceExterior", ROOM = "MAP_SAFARI_ZONE_ENTRANCE_INTERIOR";
  const DATA = () => window.JOHTO_SAFARI;
  const PLACES = ["Top left", "Top middle", "Top right", "Bottom left", "Bottom middle", "Bottom right"];
  const BALLS = 30;
  const OBJECT_MAX = 30;   // (SAFARI_ZONE_MAX_OBJECTS)
  const KINDS = ["plains", "forest", "peak", "water"];
  const FOUNTAIN = 10;     // (SAFARI_ZONE_OBJECTID_FOUNTAIN: placed using Surf)
  // HGSS's call triggers for Baoba (CALL_TRIGGER_BAOBA_*), and his calls'
  // scripts (PHONE_SCRIPT_142-145); his calls come three hours on (sub_02092E54).
  const CALL = { NEW_POKEMON: 6, NEXT_TEST: 7, OBJECTS: 8, MORE_OBJECTS: 9, EVEN_MORE_OBJECTS: 10 };
  const SCRIPT = { 7: 142, 8: 143, 9: 144, 10: 145 };
  const CALL_HOURS = 3;
  const SHEET = "assets/world/maps/" + MAP + "-objects.png";
  const rnd = (n) => Math.floor(Math.random() * n);
  const clock = () => window.Player.gameTime();

  function create(env) {
    // The layout (HGSS's SafariZone area set 0): a new game takes one of the
    // ten defaults at random (src/overlay_36.c); here, the first time it's
    // needed. Then each Area's objects ({ id, x, y }: its tiles' left column
    // and bottom row in the Area), the days each Area's been in the layout
    // (areaLevels), the objects unlocked (objectUnlockLevel, 0-4), Baoba's
    // clock (steps) and the call he's to make.
    function state() {
      const p = env.player(), d = DATA();
      if (!p.flags.johtoSafari) p.flags.johtoSafari = { layout: d.defaults[rnd(d.defaults.length)].slice() };
      const s = p.flags.johtoSafari;
      if (!s.objects) Object.assign(s, { objects: {}, days: {}, unlock: 0, day: null, pending: 0, stamp: null, call: null, news: null });
      return s;
    }
    const layout = () => state().layout;

    // ---------- The Areas on the map ----------
    // Each Area's picture is one of the map's patches, put where the layout
    // has it; its tiles (collision, behaviours, grass) written into the map,
    // then its objects' tiles, solid (MapPropManager_LoadFromSafariZone).
    let applied = null;
    function apply() {
      const m = window.WORLD_MAPS[MAP], d = DATA();
      if (!m || !d) return;
      const key = layout().join() + JSON.stringify(state().objects);
      if (applied === key) return;
      applied = key;
      layout().forEach((a, i) => {
        const area = d.areas[a], x0 = (1 + (i % 3)) * 32, y0 = (1 + Math.floor(i / 3)) * 32;
        Object.assign(m.patches[area.key], { x: x0, y: y0 });
        for (let k = 0; k < 1024; k++) {
          const t = (y0 + (k >> 5)) * m.width + x0 + (k & 31), b = parseInt(area.behavior.substr(k * 2, 2), 16);
          m.collision[t] = +area.solid[k];
          m.behavior[t] = b;
          m.encounter[t] = b === 0x02 ? 1 : 0;
        }
        for (const o of objectsIn(a)) for (const [x, y] of tilesOf(o)) {
          const t = (y0 + y) * m.width + x0 + x;
          m.collision[t] = 1; m.encounter[t] = 0;
        }
      });
    }
    const reapply = () => { applied = null; apply(); };
    function patches(map) {
      if (map !== MAP || !DATA()) return [];
      apply();
      return layout().map((a) => DATA().areas[a].key);
    }
    // Which place of the layout a tile is in (-1: outside them), and its Area.
    function placeAt(x, y) {
      const cx = Math.floor(x / 32) - 1, cz = Math.floor(y / 32) - 1;
      return cx >= 0 && cx < 3 && cz >= 0 && cz < 2 ? cz * 3 + cx : -1;
    }
    const areaAt = (x, y) => { const i = placeAt(x, y); return i < 0 ? -1 : layout()[i]; };
    const origin = (i) => ({ x: (1 + (i % 3)) * 32, y: (1 + Math.floor(i / 3)) * 32 });

    // ---------- Objects ----------
    const objectsIn = (a) => state().objects[a] || [];
    const def = (id) => DATA().objects[id];
    // (An object's tiles: from its left column and bottom row, right and up.)
    function tilesOf(o) {
      const D = def(o.id), out = [];
      for (let y = o.y - D.h + 1; y <= o.y; y++) for (let x = o.x; x < o.x + D.w; x++) out.push([x, y]);
      return out;
    }
    const objectAt = (a, x, y) => objectsIn(a).findIndex((o) => tilesOf(o).some(([u, v]) => u === x && v === y));
    // The objects you can place: Baoba's groups of six, as many as he's
    // unlocked, in the order your Trainer ID's last digit takes them
    // (ov108_021EA63C).
    function unlockedGroups() {
      const d = DATA(), id = (env.player().trainerId || 0) % 10;
      return d.unlockOrder.slice(id * 4, id * 4 + state().unlock);
    }
    const unlockedIds = () => unlockedGroups().flatMap((g) => DATA().groups[g]);
    // Can object `id` stand with its bottom left tile at (x, y) of Area `a`?
    // On open ground (the Fountain on water), its tiles all in the Area and
    // clear of other objects (`skip`: one being moved) and of `not` (you).
    function fits(a, id, x, y, skip, not) {
      const D = def(id), area = DATA().areas[a], want = id === FOUNTAIN ? "2" : "1";
      for (let v = y - D.h + 1; v <= y; v++) for (let u = x; u < x + D.w; u++) {
        if (u < 0 || v < 0 || u >= 32 || v >= 32 || area.place[v * 32 + u] !== want) return false;
        if (not && not.x === u && not.y === v) return false;
        const k = objectAt(a, u, v);
        if (k >= 0 && k !== skip) return false;
      }
      return true;
    }
    function place(a, id, x, y) {
      const s = state();
      (s.objects[a] = s.objects[a] || []).push({ id, x, y });
      reapply();
    }
    function remove(a, k) {
      const list = objectsIn(a);
      list.splice(k, 1);
      if (!list.length) delete state().objects[a];
      reapply();
    }
    // An Area's points of each kind (SafariZoneAreaSet_GetObjectsInArea):
    // each object of a kind is worth more by the tens of days its Area's been
    // in the layout (sObjectLevelBoosts).
    function boost(tens, kind) {
      const b = DATA().boosts[KINDS.indexOf(kind)];
      for (let i = 0; i < 5; i++) if (tens < b[i]) return i + 1;
      return tens < 25 ? 6 : 7;
    }
    function points(a) {
      const out = { plains: 0, forest: 0, peak: 0, water: 0 }, count = { plains: 0, forest: 0, peak: 0, water: 0 };
      const tens = Math.floor(Math.min(255, state().days[a] || 0) / 10);
      for (const o of objectsIn(a)) {
        const k = def(o.id).type;
        if (!k) continue;
        count[k]++;
        out[k] = Math.min(255, out[k] + boost(tens, k));
      }
      return { points: out, count };
    }

    // ---------- Wild Pokémon ----------
    // An Area's ten slots (SafariZoneAreaSet_LoadAreaEncounters): its own,
    // then each bonus Pokémon whose points it has, in turn over the first
    // slots. A slot's morning, day and night Pokémon are each as likely
    // (no time of day: the step clock's game has none for the wild).
    function slotsOf(a, kind) {
      const t = DATA().areas[a].mons[kind];
      if (!t) return null;
      const slots = t.day.map((s, i) => [t.morning[i], s, t.night[i]]), p = points(a).points;
      let n = 0;
      for (const b of t.bonus) {
        if (n >= slots.length || !b.needs.every(([k, need]) => p[k] >= need)) continue;
        slots[n++] = [b.morning, b.day, b.night];
      }
      return slots;
    }
    function slotsHere(kind) {
      const p = env.player().location, d = DATA();
      if (!p || p.map !== MAP || !d) return null;
      const a = areaAt(p.x, p.y), slots = a >= 0 && slotsOf(a, kind);
      if (!slots) return null;
      return slots.map((v) => { const [species, level] = v[rnd(3)]; return { species, min: level, max: level }; });
    }
    const TEN = Array(10).fill(10);
    const table = (kind, rate) => { const slots = slotsHere(kind); return slots && { rate, weights: TEN, slots }; };
    // (The Safari Zone's grass, water and rods: whichever Area you're in. This
    // game's rods take five slots by weight; each of them here is any of the ten.)
    function install() {
      const m = window.WORLD_MAPS[MAP], d = DATA();
      if (!m || !d || m.safariAreas) return;
      Object.defineProperty(m, "safariAreas", { value: true });
      Object.defineProperty(m, "wild", { configurable: true, get: () => table("land", d.rates.land) });
      Object.defineProperty(m, "water", { configurable: true, get: () => table("surf", d.rates.surf) });
      Object.defineProperty(m, "fishing", { configurable: true, get: () => {
        const rods = {};
        for (const rod of ["old-rod", "good-rod", "super-rod"]) {
          const slots = slotsHere(rod);
          if (slots) rods[rod] = { rate: 100, slots: [0, 1, 2, 3, 4].map(() => slots[rnd(slots.length)]) };
        }
        return Object.keys(rods).length ? { rods } : undefined;
      } });
    }
    install();

    // ---------- The days ----------
    // Each new day (SaveData_SafariZone_CheckAreasWithUpdatedEncounters, once
    // there are objects to place): the Areas in the layout a day older; in
    // the Safari Game, kept till it's over. If that changes an Area's
    // Pokémon, Baoba calls to say so.
    function days() {
      const s = state(), today = clock().day;
      if (s.day == null) s.day = today;
      const n = today - s.day;
      if (n <= 0) return;
      s.day = today;
      if (!s.unlock) return;
      const g = env.player().flags.safari;
      if (g && g.hgss) s.pending += n; else age(n);
    }
    const SLOT_KINDS = ["land", "surf", "old-rod", "good-rod", "super-rod"];
    const pokemonOf = (a) => JSON.stringify(SLOT_KINDS.map((k) => slotsOf(a, k)));
    function age(n) {
      const s = state(), L = layout(), before = L.map(pokemonOf);
      for (const a of new Set(L)) s.days[a] = Math.min(255, (s.days[a] || 0) + n);
      const changed = [...new Set(L.filter((a, i) => pokemonOf(a) !== before[i]))];
      s.news = changed.length ? changed : null;
      if (env.phone()) env.phoneTrigger(CALL.NEW_POKEMON, !!s.news);
    }

    // ---------- Baoba's calls ----------
    // HGSS's (sub_02092E54): three hours after his clock, with his next test
    // ready (VAR_UNK_4057 3), or (from 6, with the National Pokédex) the
    // objects: the first ones, more, then all of them. On the Pokégear;
    // without one, he's ready the next time you come to the Safari Zone Gate.
    const stamp = () => { state().stamp = clock().steps; };
    function dueCall() {
      const s = state(), v = +env.getVar("VAR_UNK_4057");
      if (s.call != null || v < 3 || s.unlock >= 4) return null;
      if (s.stamp == null) stamp();   // (a game from before his clock: from now)
      if (clock().steps - s.stamp < CALL_HOURS * window.Player.STEPS_PER_HOUR) return null;
      if (v === 3) return CALL.NEXT_TEST;
      if (v < 6 || !env.nationalDex()) return null;
      return s.unlock === 0 ? CALL.OBJECTS : s.unlock === 3 ? CALL.EVEN_MORE_OBJECTS : CALL.MORE_OBJECTS;
    }
    function tick() {
      if (!DATA()) return;
      days();
      const n = dueCall();
      if (n == null) return;
      state().call = n;
      if (env.phone()) env.phoneTrigger(n, true);
    }
    // What Baoba's call does (PhoneCall_GetScriptId_Baoba) and, for the new
    // Pokémon, what he says (GearPhoneCall_Baoba: the Areas, up to five).
    function phoneCall(script) {
      const s = state();
      if (script == null) {
        const areas = s.news || [];
        s.news = null;
        const c = window.JOHTO_PHONE && window.JOHTO_PHONE.contacts[24];
        if (!c) return null;
        const msg = (areas.length >= 6 ? 24 : areas.length ? 14 + 2 * (areas.length - 1) : 38) + (env.isGirl() ? 1 : 0);
        const buf = { 0: env.player().name };
        areas.forEach((a, i) => { buf[10 + i] = DATA().areas[a].name; });
        return (c.msgs[msg] || []).map((p) => p.replace(/\{BUF(\d+)\}/g, (m, k) => (buf[k] != null ? buf[k] : "")));
      }
      const n = Object.keys(SCRIPT).find((k) => SCRIPT[k] === script);
      if (n == null || +n !== s.call) return null;
      s.call = null;
      if (+n === CALL.NEXT_TEST) { env.setVar("VAR_UNK_4057", 4); return null; }
      s.unlock = +n === CALL.EVEN_MORE_OBJECTS ? 4 : s.unlock + 1;
      if (+n !== CALL.EVEN_MORE_OBJECTS) stamp();
      env.setVar("VAR_UNK_4057", 7);
      if (s.day == null) s.day = clock().day;
      return null;
    }
    function arrive(map) {
      if (!DATA()) return;
      tick();
      // (No Pokégear: what his call would have done, as you come to the Gate.)
      const s = state();
      if (map === "SafariZoneGate" && s.call != null && !env.phone()) phoneCall(SCRIPT[s.call]);
    }

    // ---------- The Safari Game ----------
    // SafariZoneAction 0: 30 Safari Balls, and every wild Pokémon a Safari
    // battle (player.flags.safari, hgss: no steps); 1: it's over (and the
    // days it lasted count now).
    function action(n) {
      const p = env.player();
      if (+n === 0) { p.flags.safari = { balls: BALLS, hgss: true }; return; }
      delete p.flags.safari;
      const s = state();
      if (s.pending) { const k = s.pending; s.pending = 0; age(k); }
    }
    // Back to the counter (scr_seq_0262's _011A): the game over, at the
    // door you came through, and the attendant sees you out (VAR_SCENE_SAFARI_ZONE_ENTRANCE 2).
    async function backToCounter() {
      const right = +env.getVar("VAR_SCENE_SAFARI_ZONE_ENTRANCE") === 3;
      action(1);
      env.setVar("VAR_SCENE_SAFARI_ZONE_ENTRANCE", 2);
      // (HGSS's coordinates, from the room's corner on its matrix.)
      const J = window.JOHTO_SCRIPTS, name = J.mapConsts[ROOM], o = J.origins[J.maps[name]] || { x: 0, y: 0 };
      // (On the room drawn from Pokémon Heart & Soul's, where ui/johto-coords.js takes HGSS's tile.)
      const to = window.JohtoCoords ? window.JohtoCoords.toMap(name, (right ? 19 : 5) - o.x, 2 - o.y) : { map: name, x: (right ? 19 : 5) - o.x, y: 2 - o.y };
      await env.teleport({ map: to.map, x: to.x, y: to.y, facing: "down" });
      await env.frameScript();
    }
    // A Safari battle over (Task_SafariEncounter): the last Ball missed, and
    // you're at the door (std_safari_enter); or the last one caught something
    // (std_safari_balls_out), or there's no room for another (std_safari_storage_out).
    async function afterBattle(outcome) {
      const s = env.player().flags.safari;
      if (!s || !s.hgss) return;
      if (outcome === "caught" && !env.roomFor()) { await announce(DATA().text.storageOut); return; }
      if (s.balls > 0) return;
      if (outcome === "caught") await announce(DATA().text.ballsOut);
      else await backToCounter();
    }
    async function announce(pages) {
      env.sfx("se_ding_dong");
      await env.say(pages);
      await backToCounter();
    }
    async function retire() {
      if (await env.confirm(DATA().text.exitNow[0])) { await backToCounter(); return true; }
      return false;
    }

    // ---------- Baoba's tests ----------
    // CheckSafariZoneChallengeCompleted: a Geodude (0) or Sandshrew (1) in
    // your party that you caught in the Safari Zone yourself.
    function challenge(n) {
      const sp = ["Geodude", "Sandshrew"][+n], p = env.player();
      return p.party.some((r) => !r.egg && r.species === sp && r.met && r.met.map === MAP && !r.met.traded && !r.met.egg && !r.met.hatched) ? 1 : 0;
    }

    // ---------- Objects in the field ----------
    // A facing a tile of an Area in the Safari Game, once there are objects
    // (ov02_0224E35C): an object there to take away, or a spot for one
    // (open ground; water, surfing).
    function faced(map, x, y, surfing) {
      const g = env.player().flags.safari;
      if (map !== MAP || !DATA() || !g || !g.hgss || !state().unlock) return null;
      const i = placeAt(x, y);
      if (i < 0) return null;
      const a = layout()[i], o = origin(i), u = x - o.x, v = y - o.y;
      if (objectAt(a, u, v) >= 0 || DATA().areas[a].place[v * 32 + u] === (surfing ? "2" : "1")) return { type: "safari-object", x, y };
      return null;
    }
    const named = (pages, id) => pages.map((t) => t.replace(/\{STRVAR_1[^}]*\}/g, def(id).name));
    async function fieldObject(x, y) {
      const d = DATA(), i = placeAt(x, y), a = layout()[i], o = origin(i), u = x - o.x, v = y - o.y;
      // (std_safari_remove_object.)
      const k = objectAt(a, u, v);
      if (k >= 0) {
        const id = objectsIn(a)[k].id;
        if (!(await env.confirm(named(d.text.remove, id)[0]))) return;
        remove(a, k);
        env.sfx("se_click");
        await env.say(named(d.text.removed, id));
        return;
      }
      // (std_safari_place_object: room in the Area, an object you have for
      // the spot, and space for it, its tiles from the one you face away from you.)
      if (objectsIn(a).length >= OBJECT_MAX) { await env.say(d.text.full); return; }
      const here = env.here(), me = { x: here.x - o.x, y: here.y - o.y }, water = d.areas[a].place[v * 32 + u] === "2";
      const ids = unlockedIds().filter((id) => (id === FOUNTAIN) === water);
      if (!ids.length) { await env.say(d.text.noObjects); return; }
      const spot = (id) => {
        const D = def(id), at = [];
        for (let dy = 0; dy < D.h; dy++) for (let dx = 0; dx < D.w; dx++) {
          const p = { x: u - dx, y: v + dy };
          if (fits(a, id, p.x, p.y, -1, me)) at.push(p);
        }
        const far = (p) => Math.abs(p.x + (D.w - 1) / 2 - me.x) + Math.abs(p.y - (D.h - 1) / 2 - me.y);
        return at.sort((p, q) => far(q) - far(p))[0] || null;
      };
      const can = ids.filter((id) => spot(id));
      if (!can.length) { await env.say(d.text.noSpace); return; }
      if (!(await env.confirm(d.text.place[0]))) return;
      const c = await env.choose(can.map((id) => def(id).name).concat("Cancel"), { question: "Which object?", shown: 6 });
      if (c < 0 || c >= can.length) return;
      const id = can[c], p = spot(id);
      place(a, id, p.x, p.y);
      env.sfx("se_select");
      await env.say(named(d.text.placed, id));
    }

    // The objects on the map, in the Areas where the layout has them: their
    // pictures (HGSS's models, drawn by tools/build-johto-safari.js), lower
    // ones in front.
    let sheet = null;
    function picture() {
      if (!sheet && typeof Image !== "undefined") { sheet = new Image(); sheet.src = SHEET; }
      return sheet && sheet.complete && sheet.naturalWidth ? sheet : null;
    }
    const spriteOf = (id) => (env.isGirl() && def(id).spriteF) || def(id).sprite;
    function drawMap(g, name, ox, oy) {
      if (name !== MAP || !DATA()) return;
      const img = picture();
      if (!img) return;
      const all = [];
      layout().forEach((a, i) => { const o = origin(i); for (const ob of objectsIn(a)) all.push([ob, o]); });
      all.sort((p, q) => p[0].y + p[1].y - (q[0].y + q[1].y));
      for (const [ob, o] of all) {
        const [sx, w, h, dx, dy] = spriteOf(ob.id), D = def(ob.id);
        g.drawImage(img, sx, 0, w, h, ox + (o.x + ob.x) * 16 + dx, oy + (o.y + ob.y - D.h + 1) * 16 + dy, w, h);
      }
    }

    // ---------- The Area Customizer ----------
    // HGSS's (ScrCmd_716, its own screen): choose a place, then Swap (one of
    // the twelve Areas for it; one in the layout already trades places, one
    // that leaves the layout takes its objects with it) or Order (the Area
    // moved to another place, trading with what's there); and, once there
    // are objects, Objects (its objects, on its grid: ui/johto-safari-objects.js).
    async function customizer() {
      const d = DATA(), before = layout().join();
      const L = layout(), name = (a) => d.areas[a].name;
      days();
      for (;;) {
        const i = await env.choose(L.map((a, k) => PLACES[k] + ": " + name(a)).concat("Exit"),
          { question: "Which Area would you like to change?" });
        if (i < 0 || i >= 6) break;
        const opts = ["Swap", "Order"].concat(state().unlock ? ["Objects"] : [], "Cancel");
        const how = opts[await env.choose(opts, { question: "What about the " + name(L[i]) + " Area?" })];
        if (how === "Swap") {
          const a = await env.choose(d.areas.map((x) => x.name), { question: "Which Area should be there?", shown: 6 });
          if (a < 0 || a === L[i]) continue;
          const j = L.indexOf(a);
          if (j >= 0) L[j] = L[i]; else delete state().objects[L[i]];
          L[i] = a;
        } else if (how === "Order") {
          const others = [0, 1, 2, 3, 4, 5].filter((k) => k !== i);
          const k = await env.choose(others.map((o) => PLACES[o] + ": " + name(L[o])), { question: "Where should the " + name(L[i]) + " Area go?" });
          if (k < 0 || k >= others.length) continue;
          const o = others[k];
          [L[i], L[o]] = [L[o], L[i]];
        } else if (how === "Objects") await arrange(L[i]);
      }
      const changed = layout().join() !== before;
      reapply();
      if (changed) env.applyPatches(MAP);
      return changed;
    }
    // The arranging screen's view of an Area: its objects, what fits where,
    // its points, and placing, moving and taking objects away.
    function arrange(a) {
      return env.arrange({
        area: DATA().areas[a], objects: () => objectsIn(a), def, sprite: spriteOf, sheet: SHEET, max: OBJECT_MAX,
        groups: () => unlockedGroups().map((g) => ({ kind: KINDS[g], ids: DATA().groups[g] })),
        fits: (id, x, y, skip) => fits(a, id, x, y, skip, null), objectAt: (x, y) => objectAt(a, x, y),
        place: (id, x, y) => place(a, id, x, y), remove: (k) => remove(a, k),
        move: (k, x, y) => { const o = objectsIn(a)[k]; o.x = x; o.y = y; reapply(); },
        points: () => points(a), days: () => state().days[a] || 0, sfx: env.sfx
      });
    }

    return { patches, areaAt, placeAt, action, afterBattle, retire, challenge, customizer, arrive, tick, stamp, layout,
      faced, fieldObject, phoneCall, drawMap, points, slotsOf, unlockedIds, place, remove, fits };
  }

  window.JohtoSafari = { create, MAP };
})();
