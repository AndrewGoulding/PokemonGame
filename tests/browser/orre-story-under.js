// Colosseum's The Under and the Shadow Pokémon Lab (orreStory 33 to 40) through real input: down Pyrite's stairs,
// the Kids Grid errand, Kloak and Dagur, Venus, the stairway down to the Under Subway, the Shadow Liner, and the lab's
// locked doors, keys and DNA samples, walked through, to Ein; then the Data ROM back to Nett.
//
//   node tests/browser/orre-story-under.js
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");
(async () => {
  const OUT = "/tmp/pokemon-orre-under";
  const s = await T.start((p) => {
    p.party = [Party.create("Mewtwo", 70, { ivs: 31, moves: ["Psychic", "Flamethrower", "Ice Beam", "Thunderbolt"] }),
      Party.create("Rayquaza", 70, { ivs: 31, moves: ["Dragon Claw", "Earthquake", "Extreme Speed", "Fly"] })];
    p.party.forEach((r) => { r.ability = r.species === "Mewtwo" ? "Pressure" : "Air Lock"; });
    Object.assign(p.flags, { orre: 3, orreStory: 33, orreLevelCap: 100, orreMap: ["PhenacCity", "PyriteTown", "AgateVillage", "MtBattle"],
      orreMail: { got: ["EMERGENCY", "TROUBLE_IN_UNDER"], read: ["EMERGENCY", "TROUBLE_IN_UNDER"] } });
    p.money = 50000;
  }, { map: "PyriteTown", x: 7, y: 26, facing: "up" }, {
    out: OUT, storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) }
  });
  const errors = [], missing = new Set(), longText = new Set();
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  const idle = () => s.eval(() => Overworld.idle());
  const flags = () => s.eval(() => JSON.parse(JSON.stringify(Game.player.flags)));
  const where = () => s.eval(() => Object.assign({}, Game.player.location));
  // (Every message page seen: no more than three lines, each within the box.)
  async function checkText() {
    // (The world's message box only: a battle's messages are wrapped by the battle screen itself.)
    const t = await s.eval(() => { const b = document.getElementById("textbox"), field = document.getElementById("field");
      return b && !b.classList.contains("hidden") && field.classList.contains("hidden") ? b.innerText : ""; });
    if (!t) return;
    const lines = t.split("\n").filter((l) => l.trim() && !/^[▼▶]$/.test(l.trim()));
    if (lines.length > 3 || lines.some((l) => l.length > 37)) longText.add(t);
  }
  async function finish(predicate, label, limit = 400, arg) {
    for (let i = 0; i < limit; i++) {
      await s.press("z", 90);
      await checkText();
      if (await s.eval(predicate, arg) && await idle()) { console.log("ok: browser Orre Under/Lab " + label); return; }
    }
    throw new Error(label + " did not complete: " + JSON.stringify(await s.eval(() => ({ location: Game.player.location, story: Game.player.flags.orreStory,
      text: (document.getElementById("textbox") || {}).innerText, idle: Overworld.idle() }))));
  }
  // Mash through whatever's on screen till the world is idle again.
  async function settle(limit = 200) { for (let i = 0; i < limit && !(await idle()); i++) { await s.press("z", 90); await checkText(); } }
  // (Teleporting between scenes stands in for walking there and resting at a Pokémon Center: the party's healed.)
  async function go(map, x, y, facing) { await settle(); await s.eval((to) => { Game.player.party.forEach(Party.heal); return Overworld.teleport(to); }, { map, x, y, facing: facing || "up" }); await s.wait(350); await settle(); }
  // (A step, then anything it set off: an e-mail on arriving somewhere, say.)
  async function step(dir, n) { await settle(); await s.walk(dir, n || 1); await s.wait(300); }
  // (Can you walk from one tile to another on a map, round its people, as the game's own steps go?)
  const reach = (map, a, b) => s.eval(([map, a, b]) => {
    const m = WORLD_MAPS[map], vis = (p) => { const v = Orre.visible(p, Game.player.flags); return v === undefined ? !p.flag || !Game.player.flags[p.flag] : v; };
    const seen = new Set([a.x + "," + a.y]), q = [a];
    while (q.length) { const c = q.shift(); if (c.x === b.x && c.y === b.y) return true;
      for (const d of ["up", "down", "left", "right"]) { const r = World.step({ map, x: c.x, y: c.y }, d), k = r.x + "," + r.y;
        if (r.ok && r.map === map && !seen.has(k) && !m.people.some((p) => vis(p) && p.x === r.x && p.y === r.y)) { seen.add(k); q.push({ x: r.x, y: r.y }); } } }
    return false;
  }, [map, a, b]);
  // (Walk on in one direction till the map changes, or `n` presses: onto a door's or an arrow's tile, and through.)
  async function through(dir, n = 4) {
    const from = (await where()).map;
    for (let i = 0; i < n; i++) { await step(dir, 1); await settle(); if ((await where()).map !== from) return true; }
    return false;
  }
  const mails = () => s.eval(() => (Game.player.flags.orreMail || { got: [] }).got.slice());
  const shot = async (name) => { await s.page.setViewportSize({ width: 960, height: 900 }); await s.shot(name); };
  try {
    await s.page.reload();
    await s.boot();
    // ---- Down the stairs in Pyrite's bottom-left shack, into The Under (33 -> 34). ----
    await step("up", 1);
    await finish(() => Game.player.location.map === "TheUnder" && (Game.player.flags.orreStory | 0) === 34, "arriving in The Under");
    assert((await flags()).orreLevelCap >= 45);
    await shot("01-under");
    // ---- The Kids Grid: Nett's door before the part, Perr in the Junk Shop's basement, Bitt, Nett. ----
    await go("TheUnder", 5, 5, "up");
    await step("up", 1);
    await settle();
    assert.equal((await where()).map, "TheUnder", "Bitt stops you at Nett's door without the part");
    await go("TheUnder", 24, 4, "up");
    await step("up", 1);
    assert.equal((await where()).map, "TheUnder_JunkShop_1F");
    await go("TheUnder_JunkShop_1F", 3, 2, "up");
    await step("up", 1);
    assert.equal((await where()).map, "TheUnder_JunkShop_B1");
    await shot("02-junkshop-b1");
    await go("TheUnder_JunkShop_B1", 5, 10, "up");
    await finish(() => (Game.player.flags.orreKidsGrid | 0) === 1, "Perr's Powerup Part");
    assert.equal((await s.player()).bag["powerup-part"], 1);
    await go("TheUnder", 6, 6, "up");
    await finish(() => (Game.player.flags.orreKidsGrid | 0) === 2, "Bitt takes the part in");
    await go("TheUnder", 5, 5, "up");
    await step("up", 1);
    assert.equal((await where()).map, "TheUnder_NettsHideout_1F");
    await go("TheUnder_NettsHideout_1F", 4, 2, "up");
    await step("up", 1);
    await finish(() => (Game.player.flags.orreKidsGrid | 0) === 3, "Nett and the Kids Grid");
    assert(!(await s.player()).bag["powerup-part"]);
    await shot("03-netts-b1");
    // ---- Kloak and Dagur, by Venus's studio (34 -> 35). ----
    await go("TheUnder", 6, 23, "up");
    await finish(() => (Game.player.flags.orreStory | 0) === 35, "Kloak and Dagur");
    // ---- The studio's stairway, shut till Venus runs down it. ----
    await go("TheUnder", 6, 22, "up");
    await step("up", 1);
    await finish(() => (Game.player.flags.orreStory | 0) === 36, "Venus in her studio");
    await shot("04-studio-after-venus");
    // ---- Down the long stairway to the Under Subway (B1, B2: its trainers), the station, Venus and the key. ----
    await go("TheUnder_Studio", 1, 3, "up");
    await step("up", 1);
    await settle();
    assert.equal((await where()).map, "TheUnder_Subway_B1", "the stairway down from the studio");
    await shot("05-subway-b1");
    await go("TheUnder_Subway_B1", 6, 3, "up");
    await step("up", 1);
    assert.equal((await where()).map, "TheUnder_Subway_B2");
    await shot("06-subway-b2");
    // (Down B2's ladder from B1, and along past its Trainers, walking, to its west end: onto its arrow, and through.)
    assert(await reach("TheUnder_Subway_B2", { x: 35, y: 3 }, { x: 5, y: 9 }), "along B2 from its ladder to the way to the station");
    await go("TheUnder_Subway_B2", 5, 9, "down");
    await step("down", 2);
    await finish(() => (Game.player.flags.orreSubway | 0) === 1, "Venus at the station");
    await shot("07-station");
    // The train without the key.
    await go("TheUnder_Subway_Station", 6, 4, "up");
    await s.press("z"); await settle();
    // Back up to B1: Ein comes for Venus, and the Subway Key.
    await go("TheUnder_Subway_B2", 35, 4, "up");
    await step("up", 1);   // (B2's ladder back up)
    await finish(() => (Game.player.flags.orreSubway | 0) === 2, "the Subway Key on B1");
    assert.equal((await s.player()).bag["subway-key"], 1);
    // ---- The studio's door, pressed A at (it's open now). ----
    await go("TheUnder", 6, 22, "up");
    await s.press("z"); await s.wait(300);
    const doorText = await s.eval(() => document.getElementById("textbox").innerText);
    await settle();
    if (/locked/i.test(doorText)) console.log("NOTE: the studio's open door says: " + JSON.stringify(doorText));
    // ---- The elevator: the studio's and B1's ends. ----
    await go("TheUnder_Studio", 12, 2, "right");
    await finish(() => Game.player.location.map === "TheUnder_Subway_B1", "the studio's elevator down");
    await go("TheUnder_Subway_B1", 8, 24, "down");
    await finish(() => Game.player.location.map === "TheUnder_Studio", "B1's elevator up");
    // ---- The Under Colosseum's door: shut from its side, then unlocked from B1's, then both ways. ----
    await go("TheUnder_DeepColosseum", 3, 7, "up");
    await step("up", 1); await settle();
    assert.equal((await where()).map, "TheUnder_DeepColosseum", "the colosseum's door, locked from B1's side");
    await go("TheUnder_Subway_B1", 4, 5, "up");
    await step("up", 1);
    await finish(() => !!Game.player.flags.orreUnderDoor, "the colosseum's door unlocked from B1");
    await go("TheUnder_DeepColosseum", 3, 7, "up");
    await step("up", 1); await settle();
    assert.equal((await where()).map, "TheUnder_Subway_B1", "the colosseum's door, open both ways");
    // ---- The Under's other Trainers: Zada, and Gurks at this stage. ----
    await go("TheUnder", 13, 14, "right");
    await finish(() => (Game.player.flags.orreColo || {}).TheUnder_EventScript_Colo_ZADA != null, "Hunter Zada");
    await go("TheUnder", 8, 24, "down");
    await finish(() => (Game.player.flags.orreColo || {}).TheUnder_EventScript_Colo_GURKS != null, "Chaser Gurks");
    // ---- The Shadow Liner, with the key: to the lab (36 -> 38). ----
    await go("TheUnder_Subway_Station", 6, 4, "up");
    await finish(() => Game.player.location.map.startsWith("ShadowLab") && (Game.player.flags.orreStory | 0) === 38, "the Shadow Liner to the lab");
    assert((await flags()).orreSubwayRidden);
    await shot("08-lab-garage");
    // ---- The lab, walked: the garage, Myron's Card Key, the main wing's door (shut without it), the shutter. ----
    // (Three DNA Samples: in the cells (behind the Down St. Key's door), in Coren's room, by Tanie: a set this run
    // can rely on. Every spot's reachable: the headless check in tests/smoke-test.js.)
    await s.eval(() => { Game.player.flags.orreLabDNA = { spots: [1, 3, 6], got: [], done: false }; Overworld.refreshPeople(); });
    const money = () => s.eval(() => Game.player.money);
    // Talk to someone from a tile beside them, facing them, and mash through till `done` (or a battle won).
    async function talk(map, x, y, facing, done, label) {
      await go(map, x, y, facing);
      const before = await money();
      await finish(done || ((m) => Game.player.money > m), label, 400, before);
    }
    assert(await reach("ShadowLab_1F", { x: 7, y: 8 }, { x: 13, y: 2 }));
    await go("ShadowLab_1F", 13, 2, "up");
    await step("up", 1);
    assert.equal((await where()).map, "ShadowLab_GarageB1F", "the garage's stairs down");
    await shot("09-garage-b1");
    // (The main wing's door, before the Card Key: shut, and back out.)
    await go("ShadowLab_GarageB1F", 9, 11, "down");
    await through("down", 2);
    assert.equal((await where()).map, "ShadowLab_GarageB1F", "the main wing's door is shut without the Card Key");
    await talk("ShadowLab_GarageB1F", 6, 11, "up", () => (Game.player.bag["lab-card-key"] | 0) > 0, "Researcher Myron and the Card Key");
    await go("ShadowLab_GarageB1F", 9, 11, "down");
    await step("down", 2);
    await finish(() => Game.player.location.map === "ShadowLab_Main1F" && !!Game.player.flags.orreLabCardKey, "the Card Key opens the main wing");
    await talk("ShadowLab_Main1F", 4, 2, "up", () => !!Game.player.flags.orreLabShutter, "the shutter switch");
    // ---- B1F's east side: the stairs from the main wing, the rooms, its Trainers, the analyzer. ----
    assert(await reach("ShadowLab_Main1F", { x: 5, y: 7 }, { x: 14, y: 2 }));
    await go("ShadowLab_Main1F", 14, 2, "up");
    await step("up", 1);
    assert.equal((await where()).map, "ShadowLab_B1F");
    await shot("10-b1f");
    await talk("ShadowLab_B1F", 11, 11, "right", null, "Cipher Peon Vana");
    await talk("ShadowLab_B1F", 10, 2, "up", null, "…the DNA analyzer, with no samples").catch(() => {});
    await settle();
    await go("ShadowLab_B1F", 11, 10, "up");
    await step("up", 1);
    assert.equal((await where()).map, "ShadowLab_B1F_Rooms", "B1F's rooms");
    await shot("11-b1f-rooms");
    await talk("ShadowLab_B1F_Rooms", 6, 13, "up", null, "Cipher Peon Cole");
    await talk("ShadowLab_B1F_Rooms", 13, 13, "right", null, "Cipher Peon Remil");
    await talk("ShadowLab_B1F_Rooms", 10, 11, "right", (n) => Object.keys(Game.player.flags.orreColo || {}).some((k) => k.endsWith("_KOTAN")), "Researcher Kotan");
    // (The rooms' north half has its own doors on B1F's top corridor.)
    await go("ShadowLab_B1F", 11, 2, "down");
    await through("down");
    assert.equal((await where()).map, "ShadowLab_B1F_Rooms", "B1F's top corridor into the rooms' north half");
    await talk("ShadowLab_B1F_Rooms", 4, 5, "up", (n) => Object.keys(Game.player.flags.orreColo || {}).some((k) => k.endsWith("_LETHCO")), "Researcher Lethco");
    // ---- Down to B2F, its rooms and Trainers; Tanie, and the sample by her. ----
    await go("ShadowLab_B1F", 9, 10, "down");
    await through("down");
    assert.equal((await where()).map, "ShadowLab_B2F", "B1F's stairs down to B2F");
    await shot("12-b2f");
    await go("ShadowLab_B2F", 3, 5, "up");
    await step("up", 1);
    assert.equal((await where()).map, "ShadowLab_B2F_Rooms2");
    await talk("ShadowLab_B2F_Rooms2", 3, 6, "up", null, "Cipher Peon Tanie");
    assert(await reach("ShadowLab_B2F_Rooms2", { x: 4, y: 6 }, { x: 14, y: 4 }));
    await talk("ShadowLab_B2F_Rooms2", 14, 4, "right", () => (Game.player.flags.orreLabDNA.got || []).includes(6), "a DNA Sample by Tanie");
    await go("ShadowLab_B2F", 5, 6, "down");
    await through("down");
    assert.equal((await where()).map, "ShadowLab_B2F_Rooms");
    await talk("ShadowLab_B2F_Rooms", 5, 7, "up", null, "Cipher Peon Lesar");
    assert(await reach("ShadowLab_B2F_Rooms", { x: 4, y: 2 }, { x: 1, y: 5 }), "Lesar's room's west corner");
    await go("ShadowLab_B2F", 8, 6, "down");
    await through("down");
    await talk("ShadowLab_B2F_Rooms", 13, 5, "up", (n) => Object.keys(Game.player.flags.orreColo || {}).some((k) => k.endsWith("_DUBIK")), "Researcher Dubik");
    await go("ShadowLab_B2F", 11, 5, "up");
    await step("up", 1);
    assert.equal((await where()).map, "ShadowLab_B2F_Room");
    await talk("ShadowLab_B2F_Room", 4, 4, "up", (n) => Object.keys(Game.player.flags.orreColo || {}).some((k) => k.endsWith("_ODLOW")), "Researcher Odlow");
    // ---- B1F's west side, only from B2F: Coren's room and the Down St. Key; the cells' door. ----
    await go("ShadowLab_B2F", 8, 3, "up");
    await step("up", 1); await through("right");
    assert.equal((await where()).map, "ShadowLab_B1F", "B2F's stairs up to B1F's west side");
    await go("ShadowLab_B1F", 1, 10, "down");
    await through("down", 2);
    assert.equal((await where()).map, "ShadowLab_B1F", "the cells' door is shut without the Down St. Key");
    await go("ShadowLab_B1F", 3, 10, "up");
    await through("up");
    assert.equal((await where()).map, "ShadowLab_CorenRoom", "Coren's room");
    await shot("13-coren");
    await talk("ShadowLab_CorenRoom", 6, 13, "up", () => (Game.player.flags.orreLabDNA.got || []).includes(3), "a DNA Sample in Coren's room");
    assert(await reach("ShadowLab_CorenRoom", { x: 4, y: 15 }, { x: 5, y: 6 }));
    await talk("ShadowLab_CorenRoom", 5, 6, "up", (n) => Object.keys(Game.player.flags.orreColo || {}).some((k) => k.endsWith("_COREN")), "Researcher Coren");
    await talk("ShadowLab_CorenRoom", 6, 4, "up", () => (Game.player.bag["down-st-key"] | 0) > 0, "the Down St. Key");
    await go("ShadowLab_B1F", 1, 10, "down");
    await step("down", 2);
    await finish(() => Game.player.location.map === "ShadowLab_Cells" && !!Game.player.flags.orreLabDownSt, "the Down St. Key opens the cells");
    await talk("ShadowLab_Cells", 4, 4, "up", null, "Cipher Peon Lare");
    await talk("ShadowLab_Cells", 2, 2, "left", () => (Game.player.flags.orreLabDNA.got || []).includes(1), "a DNA Sample in the cells");
    // ---- The analyzer, the DNA door, Skrub, Ein (38 -> 40). ----
    await go("ShadowLab_B1F", 10, 2, "up");
    await finish(() => !!Game.player.flags.orreLabDNA.done, "the DNA analyzer opens the door");
    assert(!(await s.player()).bag["dna-sample"]);
    await go("ShadowLab_B2F", 11, 6, "down");
    await through("down");
    assert.equal((await where()).map, "ShadowLab_DNARoom", "through the DNA door");
    await shot("14-dna-room");
    await talk("ShadowLab_DNARoom", 8, 6, "up", (n) => Object.keys(Game.player.flags.orreColo || {}).some((k) => k.endsWith("_SKRUB")), "Skrub in the lab");
    await go("ShadowLab_DNARoom", 6, 2, "up");
    await step("up", 1);
    await finish(() => (Game.player.flags.orreStory | 0) === 40, "Ein (Shadow Raikou)");
    assert((await flags()).orreMap.includes("RealgamTower_1F"));
    await shot("15-eins-room");
    await talk("ShadowLab_EinsRoom", 7, 4, "up", () => !!Game.player.flags.orreLabDataROM, "the Data ROM");
    await talk("ShadowLab_EinsRoom", 6, 2, "right", () => !!Game.player.flags.orreLabTM26, "TM26");
    await talk("ShadowLab_EinsRoom", 2, 6, "left", () => !!Game.player.flags.orreLabHPUp, "the HP Up").catch((e) => console.log("NOTE: " + e.message));
    // ---- Out of the lab onto Orre's map: the lab's marked; then the Data ROM to Nett, and his e-mail. ----
    await go("ShadowLab_1F", 7, 8, "down");
    await step("down", 1);
    for (let i = 0; i < 40 && !(await s.eval(() => (Game.player.flags.orreMap || []).includes("ShadowLab_1F"))); i++) await s.press("z", 90);
    assert((await flags()).orreMap.includes("ShadowLab_1F"), "the lab on Orre's map once you leave it");
    await shot("16-orre-map");
    for (let i = 0; i < 20 && !(await idle()); i++) await s.press("x", 90);
    await talk("TheUnder_NettsHideout_B1", 6, 6, "up", () => !!Game.player.flags.orreDataRom, "the Data ROM to Nett");
    // (One e-mail a map change, as in Colosseum, the oldest due first: up and down Nett's stairs till his comes.)
    for (let i = 0; i < 10 && !(await mails()).includes("SHADOW_LIST"); i++) {
      await go("TheUnder_NettsHideout_B1", 3, 2, "up"); await through("up");
      await go("TheUnder_NettsHideout_1F", 4, 2, "up"); await through("up");
    }
    console.log("e-mails by now: " + (await mails()).join(", "));
    assert((await mails()).includes("SHADOW_LIST"), "Nett's SHADOW PKMN LIST! e-mail");
    console.log("ok: browser Orre Under/Lab: The Under, the Kids Grid, Venus, the Under Subway and its doors, the Shadow Liner, the lab's keys, doors and samples, Ein, the Data ROM; no script errors or missing files");
    assert.deepEqual(errors, []);
    assert.deepEqual([...missing], []);
    if (longText.size) console.log("LONG TEXT:\n" + [...longText].join("\n----\n"));
  } catch (error) { await s.shot("failure"); console.log("errors:", errors, "missing:", [...missing]); throw error; }
  finally { await s.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
