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
  // (Fresh for whatever battles come: HP back, and PP enough for a row of them, as the party was made with.)
  heal: () => window.Game.player.party.forEach((r) => {
    window.Party.heal(r);
    ({ Mewtwo: ["Psystrike", "Aura Sphere"], Rayquaza: ["Dragon Ascent"] }[r.species] || []).forEach((name, i) => { r.moves[i] = { name, pp: 99 }; });
  }),
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

beat("Cherrygrove: no Guide Gent (the Map card's yours already)", async (g) => {
  await g.go("CherrygroveCity", 55, 14, "left");
  await g.walk("left", 1);
  await g.mash();
  await g.expectVar("VAR_SCENE_CHERRYGROVE_CITY_OW", (v) => v === 0);
  if ((await s_people(g)).some((p) => p.id === "obj_T21_gsoldman1")) throw new Error("the Guide Gent is there");
});
const s_people = (g) => g.people();

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
  // (A step lost to the follower's shuffle leaves you a tile short of the mat: on down till you're out.)
  for (let i = 0; i < 3 && (await g.where()).map === "VioletCity_Gym"; i++) await g.s.walk("down", 1);
  await g.mash();
  await g.expect("FLAG_GOT_PICK_UP_EGG_CALL_FROM_ELM");
});

beat("Violet's Poké Mart: Elm's aide and the Egg", async (g) => {
  await g.go("VioletCity", 21, 34, "up");
  await g.walk("up", 1);
  await g.mash();
  if (!(await g.eval(page.flag, "FLAG_GOT_EGG_FROM_ELMS_ASSISTANT"))) await g.talk("assistantm");
  await g.expect("FLAG_GOT_EGG_FROM_ELMS_ASSISTANT");
});

beat("Azalea: the Rocket at the well, Kurt", async (g) => {
  await g.go("AzaleaTown", 50, 19, "up");
  await g.walk("up", 1);
  await g.mash();
  await g.go("AzaleaTown_KurtHouse", 4, 6, "up");
  await g.mash();
  await g.talk("gantetsu");
  await g.expect("FLAG_UNK_19E");   // (Kurt's off to the well)
});

beat("Slowpoke Well: Team Rocket beaten", async (g) => {
  await g.go("SlowpokeWell_Entrance", 17, 9, "up");
  await g.mash();
  await g.go("SlowpokeWell_B1F", 42, 26, "up");
  await g.mash();
  for (const who of ["rocketm$", "rocketm_2", "rocketw", "rkanbum3"]) await g.talk(who);
  await g.mash();
  await g.expect("FLAG_BEAT_AZALEA_ROCKETS");
});

beat("Azalea Gym: Bugsy's Hive Badge and TM89", async (g) => {
  await g.go("AzaleaTown_Gym", 9, 6, "up");
  await g.mash();
  await g.talk("gsleader2");
  await g.expect("FLAG_GOT_TM89_FROM_BUGSY");
  if (!(await g.eval(() => window.Game.player.badges.includes("hive")))) throw new Error("no Hive Badge");
});

beat("Azalea's west side: the rival again", async (g) => {
  await g.go("AzaleaTown", 13, 16, "left");
  await g.walk("left", 2);
  await g.mash();
  await g.expectVar("VAR_UNK_4075", (v) => v !== 1);
});

const badge = (g, b) => g.eval((b) => window.Game.player.badges.includes(b), b).then((y) => { if (!y) throw new Error("no " + b + " Badge"); });
const item = (g, id) => g.eval((id) => window.Player.itemCount(window.Game.player, id), id);

beat("Goldenrod Gym: Whitney cries, then the Plain Badge and TM45", async (g) => {
  await g.enter("GoldenrodCity_Gym");
  await g.talk("gsleader3$");
  await g.expectVar("VAR_UNK_410A", 1);
  await g.stepOn(15, 11);   // (the Lass by her: "She'll stop crying soon")
  await g.expect("FLAG_UNK_0B7");
  await g.talk("gsleader3$");
  await g.expect("FLAG_GOT_TM45_FROM_WHITNEY");
  await badge(g, "plain");
});

beat("Goldenrod's Flower Shop: the SquirtBottle", async (g) => {
  await g.enter("GoldenrodCity_FlowerShop");
  await g.talk("gswoman1");
  if (!(await item(g, "squirtbottle"))) await g.talk("gsgirl1");
  if (!(await item(g, "squirtbottle"))) throw new Error("no SquirtBottle");
});

beat("Route 36: the Sudowoodo watered", async (g) => {
  await g.enter("Route36");
  await g.talk("usokky");
  await g.expect("FLAG_HIDE_ROUTE_36_SUDOWOODO");
});

beat("Burned Tower: the rival, then the legendary beasts run", async (g) => {
  await g.enter("BurnedTower_1F");
  await g.stepOn(13, 19);   // (Eusine)
  await g.stepOn(21, 14);   // (the rival's battle)
  await g.expectVar("VAR_UNK_40A6", 1);
  await g.enter("BurnedTower_B1F");
  await g.stepOn(17, 14);
  await g.expectVar("VAR_UNK_40A1", 1);
});

beat("Ecruteak Gym: Morty's Fog Badge and TM30", async (g) => {
  await g.enter("EcruteakCity_Gym");
  if ((await g.where()).map !== "EcruteakCity_Gym") throw new Error("shown out of the Gym");
  await g.talk("gsleader4$");
  await g.expect("FLAG_GOT_TM30_FROM_MORTY");
  await badge(g, "fog");
});

beat("Olivine Lighthouse: Jasmine and the sick Ampharos", async (g) => {
  await g.enter("OlivineCity_LighthouseLightRoom");
  await g.talk("gsleader6$");
  await g.expectVar("VAR_SCENE_LIGHTHOUSE_JASMINE", 1);
});

beat("Cianwood Gym: the waterfall stopped, Chuck's Storm Badge", async (g) => {
  await g.enter("CianwoodCity_Gym");
  await g.sign("T24GYM0101_002");   // (the winch)
  await g.talk("gsleader5$");
  await g.expect("FLAG_GOT_TM01_FROM_CHUCK");
  await badge(g, "storm");
});

beat("Cianwood Pharmacy: the SecretPotion", async (g) => {
  await g.enter("CianwoodCity_Pharmacy");
  await g.talk("sunglasses");
  await g.expect("FLAG_GOT_SECRETPOTION");
});

beat("Olivine Lighthouse: the SecretPotion for Amphy", async (g) => {
  await g.enter("OlivineCity_LighthouseLightRoom");
  await g.talk("gsleader6$");
  await g.expectVar("VAR_SCENE_LIGHTHOUSE_JASMINE", (v) => v >= 2);
});

beat("Olivine Gym: Jasmine's Mineral Badge", async (g) => {
  await g.enter("OlivineCity_Gym");
  await g.talk("gsleader6$");
  await g.expect("FLAG_GOT_TM23_FROM_JASMINE");
  await badge(g, "mineral");
});

beat("Lake of Rage: the red Gyarados, and Lance", async (g) => {
  await g.enter("LakeOfRage");
  await g.talk("rgyaradosu");
  await g.expect("FLAG_HIDE_LAKE_OF_RAGE_RED_GYARADOS");
  await g.talk("T29_wataru");
  await g.expectVar("VAR_UNK_40A8", 1);
});

beat("Mahogany's souvenir shop: Lance finds the hideout", async (g) => {
  await g.enter("MahoganyTown_SouvenirShop");
  await g.expectVar("VAR_UNK_40A8", 2);
});

beat("Team Rocket's Hideout: the Murkrow, Ariana and the Electrodes", async (g) => {
  const maps = ["TeamRocketHideout_B1F", "TeamRocketHideout_B2F", "TeamRocketHideout_B3F"];
  await g.enter(maps[0]);
  await g.enter(maps[1]);   // (Lance heals your party)
  await g.enter(maps[2]);   // (and goes on ahead)
  for (const who of ["rocketw$", "rocketm_2$"]) await g.talk(who);
  await g.triggers(maps, async () => +(await g.v("VAR_UNK_40AC")) >= 9);
  // (The Electrodes powering the radio waves: knocked out, all three.)
  if ((await g.where()).map !== maps[1]) await g.enter(maps[1]);
  for (const e of ["electrode$", "electrode_2$", "electrode_3$"]) await g.talk(e);
  await g.expect("FLAG_ROCKET_HIDEOUT_CLEARED");
});

beat("Mahogany Gym: Pryce's Glacier Badge and TM07", async (g) => {
  await g.enter("MahoganyTown_GymRoom1");
  await g.talk("gsleader7$");
  await g.expect("FLAG_GOT_TM07_FROM_PRYCE");
  await badge(g, "glacier");
});

beat("Mahogany: Team Rocket take over the Radio Tower", async (g) => {
  await g.enter("MahoganyTown");   // (out of the Gym: four of Johto's Badges since Ecruteak's, and the news)
  await g.expectVar("VAR_SCENE_ROCKET_TAKEOVER", 2);
});

beat("Goldenrod Underground: a Rocket's uniform", async (g) => {
  await g.enter("GoldenrodCity_Tunnel_1F");
  await g.enter("GoldenrodCity_Tunnel_B1F");
  await g.stepOn(14, 12);   // (by the Rocket at the door)
  await g.expectVar("VAR_SCENE_ROCKET_TAKEOVER", 3);
});

beat("Radio Tower 1F: the rival", async (g) => {
  await g.enter("GoldenrodCity_RadioTower_1F");
  await g.stepOn(22, 6);   // (up to the stairs, the Grunt on them)
  await g.expectVar("VAR_SCENE_ROCKET_TAKEOVER", 4);
});

beat("Radio Tower 5F: the Director's Basement Key", async (g) => {
  for (const f of ["2F", "3F", "4F", "5F"]) await g.enter("GoldenrodCity_RadioTower_" + f);
  await g.talk("D23R0105_gsgentleman");
  if (!(await item(g, "basement-key"))) throw new Error("no Basement Key");
});

beat("Goldenrod Underground: the shutter, the rival, the Director's Card Key", async (g) => {
  await g.enter("GoldenrodCity_Tunnel_B1F");
  await g.talk("D37R0102_babyboy1_8");   // (the shutter, opened with the Basement Key)
  await g.enter("GoldenrodCity_Tunnel_B2F");
  await g.stepOn(26, 5);   // (the rival)
  await g.enter("GoldenrodCity_TunnelWarehouse");
  await g.talk("D37R0105_gsgentleman");
  if (!(await item(g, "card-key"))) throw new Error("no Card Key");
});

beat("Radio Tower: the Card Key's shutter, Proton, Ariana and Archer", async (g) => {
  await g.enter("GoldenrodCity_RadioTower_3F");
  await g.talk("D23R0103_babyboy1_9$");
  await g.expect("FLAG_UNK_090");
  await g.enter("GoldenrodCity_RadioTower_4F");
  await g.talk("D23R0104_rkanbum3");
  await g.enter("GoldenrodCity_RadioTower_5F");
  await g.talk("D23R0105_rkanbuw");
  await g.enter("GoldenrodCity_RadioTower_Elevator");   // (up to the deck)
  for (let i = 0; i < 4 && (await g.where()).map !== "GoldenrodCity_RadioTowerObservationDeck"; i++) { await g.s.walk("down", 1); await g.mash(); }
  await g.talk("D23R0106_rkanbum");
  await g.expect("FLAG_BEAT_RADIO_TOWER_ROCKETS");
  await g.expectVar("VAR_SCENE_ROCKET_TAKEOVER", 5);
});

beat("Blackthorn Gym: Clair's battle", async (g) => {
  await g.enter("BlackthornCity_Gym");
  await g.talk("gsleader8$");
  await g.expect("FLAG_UNK_0D1");
});

beat("Dragon's Den: the Elder's questions, the Rising Badge", async (g) => {
  await g.enter("DragonsDen");
  // (His five questions as you walk in: the answers that don't make him ask again, each known by its first words,
  // as the A that'd skip its printing could land on its menu.)
  await g.enter("DragonsDen_Shrine", [[/^What are/, 0], [/^What helps/, 0], [/^What kind/, 1], [/^What is most/, 0], [/^Strong Pok/, 1]]);
  await g.expect("FLAG_UNK_0EA");
  await badge(g, "rising");
});

beat("Blackthorn Gym: Clair's TM59", async (g) => {
  await g.enter("BlackthornCity_Gym");
  await g.talk("gsleader8$");
  await g.expect("FLAG_GOT_TM59_FROM_CLAIR");
});

beat("Johto's League: Will, Koga, Bruno, Karen and Champion Lance, the Hall of Fame", async (g) => {
  const rooms = ["LoreleisRoom", "BrunosRoom", "AgathasRoom", "LancesRoom"];
  for (let k = 0; k < 4; k++) {
    await g.enter("PokemonLeague_" + rooms[k]);
    await g.talk(rooms[k] + "_EventScript_");
    if (!(await g.eval((k) => window.League.beaten(window.Game.player.flags, k), k))) throw new Error("not beaten: " + rooms[k]);
  }
  // (Lance as you walk in; then the Hall of Fame and the credits, and you're home.)
  await g.enter("PokemonLeague_ChampionsRoom", null, 4000);
  if (!(await g.eval(() => !!window.Game.player.flags.johtoLeagueClear))) throw new Error("Johto's League not won");
  await g.expect("FLAG_GAME_CLEAR");
});

module.exports = { BEATS, makeG };

// The helpers a beat gets (g), for a page started with tests/browser/lib.js.
// (The beats' places are HGSS's maps and tiles, as Johto's scripts have them: on its maps as they are, Pokémon
// Heart & Soul's, where ui/johto-coords.js takes them. A walk of so many steps goes, the shortest way, to where
// those steps would take you in HGSS's tiles.)
function makeG(s) {
  let shots = 0, hg = null;
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  // (A step, held down: tried again, up to twice, when the key didn't take and nothing's going on.)
  const step = async (d) => {
    for (let i = 0; i < 3; i++) {
      const was = await s.eval(page.where);
      await s.walk(d, 1);
      const now = await s.eval(page.where);
      if (now.map !== was.map || now.x !== was.x || now.y !== was.y || !(await s.eval(page.idle))) return;
    }
  };
  const g = {
    s,
    eval: (fn, arg) => s.eval(fn, arg),
    where: () => s.eval(page.where),
    async go(map, x, y, facing) {
      const to = await s.eval(([map, x, y]) => (window.JohtoCoords ? window.JohtoCoords.toMap(map, x, y) : { map, x, y }), [map, x, y]);
      hg = { map, x, y };
      await s.eval((l) => window.Overworld.teleport(l), { map: to.map, x: to.x, y: to.y, facing: facing || "down" });
      await s.wait(600);
    },
    async walk(dir, n) {
      n = n || 1;
      const here = await s.eval(page.where);
      if (!hg || !(await s.eval((m) => !!(window.WORLD_MAPS[m] || {}).hgss, here.map))) { hg = null; return s.walk(dir, n); }
      const t = { map: hg.map, x: hg.x + DIRS[dir][0] * n, y: hg.y + DIRS[dir][1] * n };
      const steps = await s.eval(([t, here]) => {
        const to = window.JohtoCoords.toMap(t.map, t.x, t.y), m = window.WORLD_MAPS[here.map];
        if (to.map !== here.map) return null;
        return window.JohtoCoords.path(m, here, to, (x, y) => !m.collision[y * m.width + x]);
      }, [t, here]);
      hg = t;
      if (!steps || !steps.length) return step(dir);
      for (const d of steps) await step(d);
    },
    people: () => s.eval(page.people),
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
      // (The tile beside them on the map as it is: no translating.)
      const here = await s.eval(page.where);
      await s.eval((l) => window.Overworld.teleport(l), { map: here.map, x: spot.x, y: spot.y, facing: spot.facing });
      await s.wait(600);
      await s.eval(page.heal);
      await s.press("z");
      await g.mash();
    },
    // Check what's on a tile (a sign, a machine), from below it unless `from` says.
    async check(x, y, from) {
      const [dx, dy, f] = { below: [0, 1, "up"], above: [0, -1, "down"], left: [-1, 0, "right"], right: [1, 0, "left"] }[from || "below"];
      const here = await s.eval(page.where);
      // (HGSS's tile, where it is now, unrounded onto what's there; and the tile beside it you'd check it from.)
      const raw = await s.eval(([m, x, y]) => { const M = window.WORLD_MAPS[m], f = window.JohtoCoords && (M.hgss || []).find((h) => h.map === m) || (M.hgss || [])[0];
        return f ? window.JohtoCoords.forward(f, x, y).map(Math.round) : [x, y]; }, [here.map, x, y]);
      await s.eval((l) => window.Overworld.teleport(l), { map: here.map, x: raw[0] + dx, y: raw[1] + dy, facing: f });
      await s.wait(600);
      await s.press("z");
      await g.mash();
    },
    // (The rest take the map's own tiles, as its people, signs and triggers are listed: no translating.)
    // Into a map through one of its doors, as you'd walk in (so the scenes that start as you arrive start): on the
    // other side, a step that World.step says takes you there (up into a door, onto a ladder, out over a mat).
    // (answers and max: as mash's, for the scene as you arrive.)
    async enter(map, answers, max) {
      const ways = await s.eval((map) => {
        const W = window.WORLD_MAPS, out = [], D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        // (The doors elsewhere that lead here: the one from where you are first, then by this map's own doors' order,
        // its first usually the way in from outside: not down a hole into a scene below.)
        const here = window.Overworld.position().map, near = (W[map].warps || []).map((w) => w.map);
        const rank = (name) => (name === here ? -1 : near.includes(name) ? near.indexOf(name) : near.length);
        const doors = [];
        for (const [name, n] of Object.entries(W)) for (const back of n.warps || []) if (back.map === map) doors.push({ name, back });
        doors.sort((a, b) => rank(a.name) - rank(b.name));
        for (const { name, back } of doors) {
          for (const d of Object.keys(D)) for (const start of [{ x: back.x - D[d][0], y: back.y - D[d][1] }, back]) {
            const pos = { map: name, x: start.x, y: start.y }, b = window.World.blockAt(name, start.x, start.y);
            if (!b || (b.collision && start !== back)) continue;
            const r = window.World.step(pos, d), to = r.warp || (r.ok && window.World.warpAt(r.map, r.x, r.y) && window.World.warpTarget(window.World.warpAt(r.map, r.x, r.y)));
            if (to && to.map === map) out.push(Object.assign(pos, { facing: d }));
          }
        }
        return out;
      }, map);
      hg = null;
      await s.eval(page.heal);
      for (const w of ways.slice(0, 4)) {
        await s.eval((l) => window.Overworld.teleport(l), w);
        await s.wait(500);
        // (A trainer who sees you, or a scene, between the steps: seen through first.)
        for (let i = 0; i < 3 && (await g.where()).map !== map; i++) { await s.walk(w.facing, 1); await s.wait(500); if ((await g.where()).map !== map) await g.mash(); }
        if ((await g.where()).map === map) { await g.mash(max || 600, answers); return; }
      }
      throw new Error("no way into " + map + " (" + ways.length + " ways tried)");
    },
    // Onto a tile (a step trigger), from a free tile beside it.
    async stepOn(x, y) {
      const from = await s.eval(([x, y]) => {
        const me = window.Overworld.position(), taken = new Set(window.Overworld.people().map((q) => q.x + "," + q.y));
        for (const [dx, dy, d] of [[0, 1, "up"], [0, -1, "down"], [1, 0, "left"], [-1, 0, "right"]]) {
          const b = window.World.blockAt(me.map, x + dx, y + dy);
          if (b && !b.collision && !taken.has((x + dx) + "," + (y + dy))) return { map: me.map, x: x + dx, y: y + dy, facing: d };
        }
        return null;
      }, [x, y]);
      if (!from) throw new Error("no way onto " + x + "," + y);
      hg = null;
      await s.eval(page.heal);
      await s.eval((l) => window.Overworld.teleport(l), from);
      await s.wait(600);
      await s.walk(from.facing, 1);
      await g.mash();
    },
    // Check a sign (or a machine, a winch) whose script matches, from a free side.
    async sign(re) {
      const spot = await s.eval((re) => {
        const me = window.Overworld.position(), m = window.WORLD_MAPS[me.map], sg = (m.signs || []).find((q) => new RegExp(re).test(q.script || ""));
        if (!sg) return null;
        for (const [dx, dy, f] of [[0, 1, "up"], [0, -1, "down"], [1, 0, "left"], [-1, 0, "right"]]) {
          const b = window.World.blockAt(me.map, sg.x + dx, sg.y + dy);
          if (b && !b.collision) return { map: me.map, x: sg.x + dx, y: sg.y + dy, facing: f };
        }
        return null;
      }, re);
      if (!spot) throw new Error("no sign like " + re);
      await s.eval((l) => window.Overworld.teleport(l), spot);
      await s.wait(600);
      await s.press("z");
      await g.mash();
    },
    // Play a place's story by its step triggers: round the maps, entering each (its map scripts run) and stepping
    // onto whichever trigger is live (its var at the value it waits for), till done() says so. A trigger already
    // stepped on at that value isn't tried again.
    async triggers(maps, done, rounds) {
      const tried = new Set();
      for (let r = 0; r < (rounds || 30); r++) {
        if (await done()) return;
        let stepped = false;
        for (const map of maps) {
          if ((await g.where()).map !== map) await g.enter(map);
          if (await done()) return;
          const live = await s.eval((map) => {
            const j = window.Game.player.flags.johto || { v: {} };
            return (window.WORLD_MAPS[map].triggers || []).map((t) => {
              const m = /\?(\w+)=(\d+)$/.exec(t.script || "");
              return m && (+(j.v[m[1]] || 0) === +m[2]) ? { x: t.x, y: t.y, key: t.script } : null;
            }).filter(Boolean);
          }, map);
          const t = live.find((q) => !tried.has(map + q.key));
          if (!t) continue;
          tried.add(map + t.key);
          await g.stepOn(t.x, t.y);
          stepped = true;
          break;
        }
        if (!stepped) break;
      }
      if (!(await done())) { await s.shot("story-fail-" + ++shots); throw new Error("the triggers ran out at " + JSON.stringify(await g.where())); }
    },
    v: (n) => s.eval(page.v, n),
    // A through whatever's up (messages, yes, battles) until you're walking about again.
    // (answers: [question, n] pairs, a menu asking that (a regex on the words above it) answered n places down; any
    // other, the first. While a question of theirs is up, no A: it would land on its menu as it opens.)
    async mash(max, answers) {
      let calm = 0, quiet = 0;
      answers = answers || [];
      for (let i = 0; i < (max || 400); i++) {
        if (await s.eval(page.idle)) { if (++calm >= 4) return; await s.wait(250); continue; }
        calm = 0;
        const showing = await s.eval(() => window.GbaMenus.showing);
        // (A move that did nothing, or has no PP left: the next one along, the second, this turn.)
        if (showing === "moves" && g.otherMove) { g.otherMove = false; await s.press("ArrowRight"); await s.press("z"); continue; }
        const sc = await s.eval(page.screen);
        // (The question, gone from the box once its menu's up: the last words seen.)
        if (sc.text) g.seen = sc.text.replace(/\n/g, " ");
        const asked = answers.find(([q]) => q.test(showing === "multichoice" ? g.seen || "" : sc.text.replace(/\n/g, " ")));
        if (asked && showing === "multichoice") {
          for (let n = asked[1]; n > 0; n--) { await s.press("ArrowDown"); await s.wait(100); }
          await s.press("z");
          await s.wait(300);
          continue;
        }
        if (asked) { await s.wait(150); continue; }
        if (process.env.STORY_DEBUG && sc.text && sc.text !== g.lastText) console.log("  | " + (g.lastText = sc.text).replace(/\n/g, " "));
        if (/doesn't affect|no PP left/.test(sc.text.replace(/\n/g, " "))) g.otherMove = true;
        // (A nickname's box: no nickname.)
        if (sc.input) { await s.eval(() => { document.getElementById("enter-text").value = ""; }); await s.press("Enter"); continue; }
        if (sc.naming) await s.press("Enter");
        // (Nothing to read for a while, and not walking about: the credits, say. Start skips them.)
        quiet = sc.text ? 0 : quiet + 1;
        if (quiet > 0 && quiet % 20 === 0) await s.press("Enter");
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
      // (Their first moves hit hard: A on FIGHT and A again wins; Mewtwo's second, Aura Sphere, for what Psystrike can't
      // touch. No Rest: asleep, battles drag on.)
      p.party = [["Mewtwo", "Psystrike", "Aura Sphere"], ["Rayquaza", "Dragon Ascent"]].map(([n, ...ms]) => {
        const r = Party.create(n, 100);
        r.moves = ms.map((name) => ({ name, pp: 99 })).concat(r.moves.filter((x) => !ms.includes(x.name) && x.name !== "Rest")).slice(0, 4);
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
      // (No level caps: Johto's would have this Lv. 100 party disobey, and a battle lost to a nap isn't the story's.)
      await s.eval(() => { window.Player.levelCap = () => 100; });
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
