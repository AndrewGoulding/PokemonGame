// Johto's Safari Zone, as HeartGold and SoulSilver's: west of Cianwood,
// through the Safari Zone Gate, Baoba's. Its six places (a 3x2 layout, top
// row west to east, then the bottom row) each hold one of twelve Areas
// (tools/build-johto-safari.js drew them: window.JOHTO_SAFARI), laid out as
// one of HGSS's ten default layouts until you change them with the Area
// Customizer (ScrCmd_716, Baoba's staff); each Area has its own grass,
// water and rod Pokémon, by the time of day (safari_enc.json), ten slots
// one in ten each. The Safari Game is HGSS's: ₽500 at the counter for 30
// Safari Balls and no step limit (SafariZoneAction); every wild Pokémon is
// a Safari battle with Bait and Mud (engine/safari.js's HGSS rules), and
// it's over when the Balls are gone (std_safari_balls_out) or you leave.
//
//   const S = JohtoSafari.create(env);
//   S.patches(map)        // the Areas in the layout, as the map's patches (and their tiles)
//   S.areaAt(x, y)        // the Area at a tile of the Safari Zone, or -1
//   S.action(n)           // SafariZoneAction: 0 starts the Safari Game, 1 ends it
//   S.challenge(n)        // CheckSafariZoneChallengeCompleted: Baoba's Geodude (0), Sandshrew (1)
//   await S.customizer()  // the Area Customizer; true if the Areas were changed
//   await S.afterBattle(outcome)   // a Safari battle over: out of Balls, or of room
//   await S.retire()      // the Start menu's Retire (std_safari_exit)
//   S.arrive(map)         // into a map: Baoba's next test, ready (his phone call, in HGSS)
//
// env: player(), say(pages), confirm(question), choose(texts, { question, shown }),
//   teleport({ map, x, y, facing }), getVar(name), setVar(name, value) (HGSS's vars),
//   applyPatches(map), sfx(name), roomFor() (a space in your party or a Box),
//   frameScript() (runs the scene the map's frame table has due).
(function () {
  "use strict";

  const MAP = "SafariZone_EntranceExterior", ROOM = "MAP_SAFARI_ZONE_ENTRANCE_INTERIOR";
  const DATA = () => window.JOHTO_SAFARI;
  const PLACES = ["Top left", "Top middle", "Top right", "Bottom left", "Bottom middle", "Bottom right"];
  const BALLS = 30;
  // (HGSS's times of day for wild Pokémon: morning 4-10, day 10-20, night 20-4.)
  const timeOfDay = () => { const h = new Date().getHours(); return h >= 4 && h < 10 ? "morning" : h >= 10 && h < 20 ? "day" : "night"; };

  function create(env) {
    // The layout (HGSS's SafariZone area set 0): a new game takes one of the
    // ten defaults at random (src/overlay_36.c); here, the first time it's needed.
    function state() {
      const p = env.player(), d = DATA();
      if (!p.flags.johtoSafari) p.flags.johtoSafari = { layout: d.defaults[Math.floor(Math.random() * d.defaults.length)].slice() };
      return p.flags.johtoSafari;
    }
    const layout = () => state().layout;

    // ---------- The Areas on the map ----------
    // Each Area's picture is one of the map's patches, put where the layout
    // has it; its tiles (collision, behaviours, grass) written into the map.
    let applied = null;
    function apply() {
      const m = window.WORLD_MAPS[MAP], d = DATA();
      if (!m || !d) return;
      const key = layout().join();
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
      });
    }
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

    // ---------- Wild Pokémon ----------
    // The Area you're in: its ten slots for the time of day (HGSS's
    // SafariZoneAreaSet_LoadAreaEncounters), each one in ten.
    function slotsHere(kind) {
      const p = env.player().location, d = DATA();
      if (!p || p.map !== MAP || !d) return null;
      const a = areaAt(p.x, p.y), t = a >= 0 && d.areas[a].mons[kind];
      if (!t) return null;
      return t[timeOfDay()].map(([species, level]) => ({ species, min: level, max: level }));
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
          if (slots) rods[rod] = { rate: 100, slots: [0, 1, 2, 3, 4].map(() => slots[Math.floor(Math.random() * slots.length)]) };
        }
        return Object.keys(rods).length ? { rods } : undefined;
      } });
    }
    install();

    // ---------- The Safari Game ----------
    // SafariZoneAction 0: 30 Safari Balls, and every wild Pokémon a Safari
    // battle (player.flags.safari, hgss: no steps); 1: it's over.
    function action(n) {
      const p = env.player();
      if (+n === 0) p.flags.safari = { balls: BALLS, hgss: true };
      else delete p.flags.safari;
    }
    // Back to the counter (scr_seq_0262's _011A): the game over, at the
    // door you came through, and the attendant sees you out (VAR_SCENE_SAFARI_ZONE_ENTRANCE 2).
    async function backToCounter() {
      const right = +env.getVar("VAR_SCENE_SAFARI_ZONE_ENTRANCE") === 3;
      action(1);
      env.setVar("VAR_SCENE_SAFARI_ZONE_ENTRANCE", 2);
      // (HGSS's coordinates, from the room's corner on its matrix.)
      const J = window.JOHTO_SCRIPTS, name = J.mapConsts[ROOM], o = J.origins[J.maps[name]] || { x: 0, y: 0 };
      await env.teleport({ map: name, x: (right ? 19 : 5) - o.x, y: 2 - o.y, facing: "down" });
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
    // (HGSS's Baoba calls on the Pokégear once the next test is ready, three
    // hours after the first (VAR_UNK_4057 3 to 4); this game has no phone
    // calls, so it's ready the next time you come into the Safari Zone Gate.)
    function arrive(map) {
      if (!DATA()) return;
      const s = state();
      if (map === "SafariZoneGate" && +env.getVar("VAR_UNK_4057") === 3 && s.testPassedAway) env.setVar("VAR_UNK_4057", 4);
      if (map !== ROOM && map !== MAP && +env.getVar("VAR_UNK_4057") === 3) s.testPassedAway = true;
    }

    // ---------- The Area Customizer ----------
    // HGSS's (ScrCmd_716, its own screen): choose a place, then Swap (one of
    // the twelve Areas for it; one in the layout already trades places) or
    // Order (the Area moved to another place, trading with what's there).
    async function customizer() {
      const d = DATA(), before = layout().join();
      const L = layout(), name = (a) => d.areas[a].name;
      for (;;) {
        const i = await env.choose(L.map((a, k) => PLACES[k] + ": " + name(a)).concat("Exit"),
          { question: "Which Area would you like to change?" });
        if (i < 0 || i >= 6) break;
        const how = await env.choose(["Swap", "Order", "Cancel"], { question: "What about the " + name(L[i]) + " Area?" });
        if (how === 0) {
          const a = await env.choose(d.areas.map((x) => x.name), { question: "Which Area should be there?", shown: 6 });
          if (a < 0 || a === L[i]) continue;
          const j = L.indexOf(a);
          if (j >= 0) L[j] = L[i];
          L[i] = a;
        } else if (how === 1) {
          const others = [0, 1, 2, 3, 4, 5].filter((k) => k !== i);
          const k = await env.choose(others.map((o) => PLACES[o] + ": " + name(L[o])), { question: "Where should the " + name(L[i]) + " Area go?" });
          if (k < 0 || k >= others.length) continue;
          const o = others[k];
          [L[i], L[o]] = [L[o], L[i]];
        }
      }
      const changed = layout().join() !== before;
      if (changed) env.applyPatches(MAP);
      return changed;
    }

    return { patches, areaAt, placeAt, action, afterBattle, retire, challenge, customizer, arrive, layout, timeOfDay };
  }

  window.JohtoSafari = { create, MAP };
})();
