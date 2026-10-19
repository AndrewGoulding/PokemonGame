// Johto's story, played in the browser from New Bark Town on: one save the
// whole way, each beat jumping to where it happens (Overworld.teleport, as a
// script's warp does), talking or walking as a player would, and pressing A
// through what follows (battles too: a strong party wins them). After each
// beat the flags it should have set are checked.
//
//   node tests/browser/johto-story.js [first beat] [last beat]
//
// Screenshots of anything that fails go to tests/browser/out/story-*.png.
"use strict";
const fs = require("fs");
const path = require("path");
const T = require("./lib");
const OUT = path.join(__dirname, "out");

// Where you are, who's there, and a few helpers, run in the page.
const page = {
  where: () => window.Overworld.position(),
  flag: (n) => { const j = window.Game.player.flags.johto; return !!(j && j.f[n]); },
  v: (n) => { const j = window.Game.player.flags.johto; return j && j.v[n]; },
  people: () => window.Overworld.people().map((p) => ({ id: p.def.localId, x: p.x, y: p.y, script: p.def.script, sprite: p.def.sprite })),
  idle: () => !!window.Overworld.idle && window.Overworld.idle(),
  // (A naming screen up: Start jumps to OK.)
  screen: () => ({ naming: !!(window.NamingScreen && window.NamingScreen.active), input: !!document.getElementById("enter-text"), text: (document.getElementById("textbox") || {}).innerText || "" })
};

const BEATS = [];
const beat = (name, fn) => BEATS.push({ name, fn });

// ---------- The story ----------

beat("Elm's Lab: a starter", async (g) => {
  await g.go("NewBarkTown_ElmsLab", 4, 11, "up");
  await g.walk("up", 1);
  await g.mash();
  // (Elm's machine: the first of the three, yes.)
  await g.check(8, 4);
  await g.expect("FLAG_GOT_STARTER", "FLAG_GOT_POKEGEAR");
});

beat("Out of the Lab: the aide's Potion, Lyra", async (g) => {
  await g.go("NewBarkTown_ElmsLab", 4, 10, "down");
  await g.walk("down", 1);   // (the aide's Potion)
  await g.mash();
  for (let i = 0; i < 4; i++) await g.walk("down", 1);   // (onto the mat, and out)
  await g.mash();
  const here = await g.where();
  if (here.map !== "NewBarkTown") throw new Error("still in " + here.map);
});

beat("New Bark's west exit: Elm's number", async (g) => {
  await g.go("NewBarkTown", 5, 15, "left");
  await g.walk("left", 2);
  await g.mash();
  await g.expectVar("VAR_SCENE_NEW_BARK_WEST_EXIT", (v) => v > 0);
  if (!(await g.phone()).includes(1)) throw new Error("no Elm on the Pokégear: " + JSON.stringify(await g.phone()) + " " + JSON.stringify(await g.eval(() => window.Game.player.flags.johto.v)));
});

beat("Cherrygrove: the Guide Gent's tour (the Map card)", async (g) => {
  await g.go("CherrygroveCity", 55, 14, "left");
  await g.walk("left", 1);
  await g.mash();
  await g.expectVar("VAR_SCENE_CHERRYGROVE_CITY_OW", (v) => v > 0);
});

beat("Mr. Pokémon: the Mystery Egg, Prof. Oak's Pokédex", async (g) => {
  await g.go("Route30_MrPokemonsHouse", 4, 8, "up");
  await g.mash();
  await g.talk("gsgentleman");
  await g.expect("FLAG_GOT_POKEDEX");
});

beat("Route 30: Elm's panic call", async (g) => {
  await g.go("Route30", 9, 5, "up");
  await g.walk("up", 1);
  await g.mash();
  await g.expectVar("VAR_SCENE_ROUTE_30_PHONE_CALL", (v) => v !== 1);
});

beat("Cherrygrove: the rival's battle", async (g) => {
  await g.go("CherrygroveCity", 61, 15, "right");
  await g.walk("right", 2);
  await g.mash();
  await g.expectVar("VAR_SCENE_CHERRYGROVE_CITY_OW", (v) => v > 3);
});

beat("Elm's Lab: the Mystery Egg, the officer, the rival's name", async (g) => {
  await g.go("NewBarkTown", 12, 10, "up");
  await g.walk("up", 1);
  await g.mash();
  await g.expect("FLAG_GAVE_RIVAL_NAME_TO_OFFICER");
});

beat("Sprout Tower: the Elder's battle", async (g) => {
  await g.go("SproutTower_3F", 13, 18, "up");
  await g.walk("up", 1);
  await g.mash();
  await g.talk("chourou");
  await g.expect("FLAG_UNK_076", "FLAG_HIDE_VIOLET_GYM_GYM_GUY_AFTER_SPROUT");   // (TM70 given; the Gym guide moves)
});

beat("Violet Gym: Falkner's Zephyr Badge and TM51", async (g) => {
  await g.go("VioletCity_Gym", 15, 21, "up");
  await g.mash();
  await g.talk("gsleader1");
  await g.expect("FLAG_GOT_TM51_FROM_FALKNER");
  if (!(await g.eval(() => window.Game.player.badges.includes("zephyr")))) throw new Error("no Zephyr Badge");
});

beat("Out of the Gym: Elm's call about the Egg", async (g) => {
  await g.go("VioletCity_Gym", 15, 26, "down");
  for (let i = 0; i < 3; i++) await g.walk("down", 1);
  await g.mash();
  await g.expect("FLAG_GOT_PICK_UP_EGG_CALL_FROM_ELM");
});

module.exports = { BEATS, makeG };

// The helpers a beat gets (g), for a page started with tests/browser/lib.js.
function makeG(s) {
  let shots = 0;
  const g = {
    s,
    eval: (fn, arg) => s.eval(fn, arg),
    where: () => s.eval(page.where),
    async go(map, x, y, facing) {
      await s.eval((l) => window.Overworld.teleport(l), { map, x, y, facing: facing || "down" });
      await s.wait(600);
    },
    walk: (dir, n) => s.walk(dir, n || 1),
    // Talk to whoever matches (their local id or script, a regex), from the side they're open on.
    async talk(re) {
      const ps = await s.eval(page.people);
      const p = ps.find((q) => new RegExp(re).test(q.id) || new RegExp(re).test(q.script || ""));
      if (!p) throw new Error("nobody like " + re + " here: " + ps.map((q) => q.id).join(", "));
      const spot = await s.eval(([x, y]) => {
        const me = window.Overworld.position(), taken = new Set(window.Overworld.people().map((q) => q.x + "," + q.y));
        for (const [dx, dy, f] of [[0, 1, "up"], [0, -1, "down"], [1, 0, "left"], [-1, 0, "right"]]) {
          const b = window.World.blockAt(me.map, x + dx, y + dy);
          if (b && !b.collision && !taken.has((x + dx) + "," + (y + dy))) return { x: x + dx, y: y + dy, facing: f };
        }
        return null;
      }, [p.x, p.y]);
      if (!spot) throw new Error("no way up to " + p.id);
      const here = await s.eval(page.where);
      await g.go(here.map, spot.x, spot.y, spot.facing);
      await s.press("z");
      await g.mash();
    },
    // Check what's on a tile (a sign, a machine), from below it unless `from` says.
    async check(x, y, from) {
      const [dx, dy, f] = { below: [0, 1, "up"], above: [0, -1, "down"], left: [-1, 0, "right"], right: [1, 0, "left"] }[from || "below"];
      const here = await s.eval(page.where);
      await g.go(here.map, x + dx, y + dy, f);
      await s.press("z");
      await g.mash();
    },
    v: (n) => s.eval(page.v, n),
    // A through whatever's up (messages, yes, battles) until you're walking about again.
    async mash(max) {
      let calm = 0;
      for (let i = 0; i < (max || 400); i++) {
        if (await s.eval(page.idle)) { if (++calm >= 4) return; await s.wait(250); continue; }
        calm = 0;
        const sc = await s.eval(page.screen);
        // (A nickname's box: no nickname.)
        if (sc.input) { await s.eval(() => { document.getElementById("enter-text").value = ""; }); await s.press("Enter"); continue; }
        if (sc.naming) await s.press("Enter");
        await s.press("z");
        await s.wait(120);
      }
      await s.shot("story-stuck-" + ++shots);
      throw new Error("still busy after " + (max || 400) + " presses: " + JSON.stringify(await s.eval(page.screen)));
    },
    // A var's value now (HGSS's VAR_SCENE_*: how far a place's story has got).
    async expectVar(name, want) {
      const v = await s.eval(page.v, name);
      if (!(typeof want === "function" ? want(+v || 0) : +v === want)) { await s.shot("story-fail-" + ++shots); throw new Error(name + " is " + v); }
    },
    phone: () => s.eval(() => window.Game.player.flags.johto.phone || []),
    async expect(...flags) {
      const missing = [];
      for (const f of flags) if (!(await s.eval(page.flag, f))) missing.push(f);
      if (missing.length) { await s.shot("story-fail-" + ++shots); throw new Error("not set: " + missing.join(", ")); }
    }
  };
  return g;
}

if (require.main === module) {
  const [from, to] = process.argv.slice(2).map(Number);
  (async () => {
    // (Starting further on: the save from after the beat before, if a run got that far.)
    const saved = path.join(OUT, "story-" + ((from || 0) - 1) + ".json");
    const s = await T.start((p) => {
      p.badges = ["boulder", "cascade", "thunder", "rainbow", "soul", "marsh", "volcano", "earth"];
      p.flags.gameClear = true;
      // (Their first moves hit hard: A on FIGHT and A again wins.)
      p.party = [["Mewtwo", "Psystrike"], ["Rayquaza", "Dragon Ascent"]].map(([n, m]) => {
        const r = Party.create(n, 100);
        r.moves = [{ name: m, pp: 99 }].concat(r.moves.filter((x) => x.name !== m).slice(0, 3));
        return r;
      });
      p.money = 50000;
    }, { map: "NewBarkTown", x: 23, y: 13, facing: "down" },
    // (Fast text, and SET: no "Will you switch Pokémon?" after each knockout.)
    { save: from && fs.existsSync(saved) ? fs.readFileSync(saved, "utf8") : undefined,
      storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleStyle: 1, followerModes: 2 }) } });
    const log = (...a) => console.log(...a);
    const g = makeG(s);
    let failed = 0;
    try {
      await s.boot();
      for (let i = from || 0; i < Math.min(BEATS.length, to != null && !isNaN(to) ? to + 1 : BEATS.length); i++) {
        const b = BEATS[i];
        try {
          await b.fn(g);
          log("ok  " + i + " " + b.name);
          fs.writeFileSync(path.join(OUT, "story-" + i + ".json"), await s.eval(() => window.Player.serialize(window.Game.player)));
        }
        catch (e) { failed++; log("BAD " + i + " " + b.name + ": " + e.message, JSON.stringify(await g.where())); break; }
      }
      if (s.errors.length) { failed++; log("errors:", s.errors.join("\n")); }
    } finally { await s.close(); }
    process.exit(failed ? 1 : 0);
  })();
}
