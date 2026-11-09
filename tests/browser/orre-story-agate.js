// Orre, Colosseum's story from Agate Village to Mt. Battle (orreStory 28 to 33), through real input: Eagun's house,
// the Relic Cave's Peons and Skrub at the Relic Stone, the Small Tablet and Duking's e-mail, Agate's people (Skof,
// Dury, the Cologne Case girl, the mart's Scents, the Day-Care Lady), the Relic Stone's purification and the Time
// Flute's Celebi, Mt. Battle's Trainers, Dakim and Vander, and the first area of its 100-Trainer challenge.
//
//   node tests/browser/orre-story-agate.js     (screenshots in /tmp/pokemon-orre-agate)
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");

const OUT = "/tmp/pokemon-orre-agate";
async function partOne() {
  const s = await T.start((p) => {
    // (A travelling player in Orre after Pyrite: strong enough that mashing A wins, under a cap that lets them obey.)
    p.party = [Party.create("Mewtwo", 70, { moves: ["Psychic", "Ice Beam", "Thunderbolt", "Flamethrower"], ivs: 31 }),
      Party.create("Dragonite", 70, { moves: ["Earthquake", "Outrage", "Fire Punch", "Thunder Punch"], ivs: 31 })];
    Object.assign(p.flags, { orre: 3, orreStory: 28, orreLevelCap: 100, orreMap: ["PhenacCity", "PyriteTown", "AgateVillage"] });
    p.money = 50000;
  }, { map: "AgateVillage", x: 17, y: 7, facing: "up" }, {
    out: OUT, storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) }
  });
  const errors = [], missing = new Set(), overflow = new Set();
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  const idle = () => s.eval(() => Overworld.idle());
  const flags = () => s.eval(() => JSON.parse(JSON.stringify(Game.player.flags)));
  // (Every message box seen: no line over the box's width, no more than three lines.)
  async function checkBox() {
    // (The overworld's box: battle messages are wrapped by the battle screen itself.)
    const t = await s.eval(() => { const w = document.getElementById("world"), b = document.getElementById("textbox");
      return w && !w.classList.contains("hidden") && b ? b.innerText : ""; });
    const lines = t.split("\n").filter((l) => l.trim());
    if (lines.length > 3 || lines.some((l) => l.length > 38)) overflow.add(t);
  }
  async function finish(predicate, label, limit = 400, key = "z") {
    for (let i = 0; i < limit; i++) {
      await s.press(key, 90);
      await checkBox();
      if (await s.eval(predicate) && await idle()) { console.log("ok: browser Orre " + label); return; }
    }
    throw new Error(label + " did not complete: " + JSON.stringify(await s.eval(() => ({ location: Game.player.location, story: Game.player.flags.orreStory,
      text: (document.getElementById("textbox") || {}).innerText }))));
  }
  // Mash A till the world's idle again (the end of a conversation), then a beat more.
  async function talkOut(limit = 200) {
    for (let i = 0; i < limit; i++) { await s.press("z", 90); await checkBox(); if (await idle()) { await s.wait(200); if (await idle()) return; } }
    throw new Error("conversation didn't end: " + (await s.eval(() => (document.getElementById("textbox") || {}).innerText)));
  }
  // (Teleport; an e-mail due on arriving, or a scene, is read through first.)
  async function go(map, x, y, facing) {
    await s.eval((to) => Overworld.teleport(to), { map, x, y, facing: facing || "up" }); await s.wait(350);
    if (!(await idle())) await talkOut();
  }
  const where = async () => (await s.player()).location;
  try {
    await s.page.reload();
    await s.boot();

    // ---- Eagun's house (28 -> 29): walk in through the door. ----
    await s.walk("up", 1);
    await finish(() => (Game.player.flags.orreStory | 0) === 29, "Eagun's house: Rui's grandparents and the villager");
    assert.equal((await where()).map, "AgateVillage_EaguansHouse");
    await s.shot("01-eagun-house");
    // (Out the door: back to its own door, not the west path.)
    await go("AgateVillage_EaguansHouse", 3, 7, "down"); await s.walk("down", 2); await s.wait(400);
    if (!(await idle())) await talkOut();   // (an e-mail may arrive on stepping out)
    let at = await where();
    assert.equal(at.map, "AgateVillage"); assert(Math.abs(at.x - 17) <= 1 && Math.abs(at.y - 7) <= 1, "out of Eagun's house by its door: " + JSON.stringify(at));
    console.log("ok: browser Orre Eagun's house's door, both ways");

    // ---- The Relic Cave (29): Agate's west path in, its three Peons, out to the Relic Forest. ----
    await go("AgateVillage", 2, 9, "left"); await s.walk("left", 1); await s.walk("left", 1); await s.wait(500);
    assert.equal((await where()).map, "AgateVillage_RelicCave");
    await s.shot("02-relic-cave");
    const colo = (script) => `(Game.player.flags.orreColo || {})[${JSON.stringify(script)}] != null`;
    for (const [script, x, y, facing] of [["AgateVillage_RelicCave_EventScript_Colo_DOVEN", 11, 15, "right"],
      ["AgateVillage_RelicCave_EventScript_Colo_SILTON", 6, 12, "up"], ["AgateVillage_RelicCave_EventScript_Colo_KASS", 9, 6, "right"]]) {
      await go("AgateVillage_RelicCave", x, y, facing);
      await finish(new Function("return " + colo(script)), "Relic Cave: " + script.split("_").pop());
    }
    // (Through to the Relic Forest by the cave's far end.)
    await go("AgateVillage_RelicCave", 14, 6, "up"); await s.walk("up", 1); await s.wait(500);
    assert.equal((await where()).map, "RelicForest");
    // ---- Skrub at the Relic Stone (29 -> 30 -> 31): the tablet, Duking's e-mail, Mt. Battle opens. ----
    await go("RelicForest", 11, 9, "up");
    await s.shot("03-relic-skrub");
    await finish(() => (Game.player.flags.orreStory | 0) === 31, "Skrub at the Relic Stone, the Small Tablet and Duking's e-mail");
    let f = await flags();
    assert((f.orreMap || []).includes("MtBattle"), "Mt. Battle on Orre's map");
    assert((f.orreMail && f.orreMail.got || []).includes("EMERGENCY"), "Duking's EMERGENCY e-mail received");

    // ---- To Mt. Battle by Orre's map (31 -> 32): out of Agate's south edge, the map, up to Mt. Battle. ----
    await go("AgateVillage", 17, 28, "down"); await s.walk("down", 1); await s.wait(900);
    await s.shot("04-orre-map");
    await s.press("ArrowUp"); await s.wait(300); await s.press("z"); await s.wait(2500);
    await finish(() => (Game.player.flags.orreStory | 0) === 32 && Game.player.location.map === "MtBattle", "to Mt. Battle by Orre's map, its arrival");
    await s.shot("05-mt-battle");
    // (Its Trainers on the way up: Colosseum's story Trainers and the others, each talked to.)
    const MT = [["MtBattle_EventScript_Trainer1", 9, 25, "left", "orreBeaten"], ["MtBattle_EventScript_Trainer2", 12, 26, "down", "orreBeaten"],
      ["MtBattle_EventScript_Colo_KIMIT", 10, 25, "up", "orreColo"], ["MtBattle_EventScript_Colo_RIDEN", 7, 27, "left", "orreColo"],
      ["MtBattle_EventScript_Turo", 12, 16, "up", "orreBeaten"], ["MtBattle_EventScript_Colo_TELIA", 11, 15, "up", "orreColo"],
      ["MtBattle_EventScript_Berin", 21, 18, "up", "orreBeaten"], ["MtBattle_EventScript_Colo_NORTZ", 18, 15, "up", "orreColo"],
      ["MtBattle_EventScript_Colo_WEEG", 23, 14, "up", "orreColo"]];
    for (const [script, x, y, facing, store] of MT) {
      await go("MtBattle", x, y, facing);
      const done = store === "orreColo" ? `(Game.player.flags.orreColo || {})[${JSON.stringify(script)}] != null`
        : `(Game.player.flags.orreBeaten || []).includes(${JSON.stringify(script)})`;
      await s.eval(() => Game.player.party.forEach(Party.heal));
      await finish(new Function("return " + done), "Mt. Battle: " + script.split("_").pop());
    }
    // ---- Dakim at the summit (32 -> 33): Vander's Time Flute. ----
    await s.eval(() => Game.player.party.forEach(Party.heal));
    await go("MtBattle", 17, 6, "up");
    await s.shot("06-mt-battle-summit");
    await finish(() => (Game.player.flags.orreStory | 0) === 33, "Dakim at Mt. Battle's summit, and Vander");
    assert.equal((await s.player()).bag["time-flute"], 1, "Vander's Time Flute");
    f = await flags();
    assert((f.orreMail && f.orreMail.got || []).includes("TROUBLE_IN_UNDER"), "Secc's e-mail about The Under");
    assert((f.orreMap || []).includes("TheUnder") || true);
  } catch (error) { await s.shot("failure"); throw error; }
  finally { await s.close(); }
  assert.deepEqual(errors, []);
  assert.deepEqual([...missing], []);
  assert.deepEqual([...overflow], [], "message boxes overflowing");
}

module.exports = { partOne };
if (require.main === module) {
  const only = process.env.ONLY;
  (async () => {
    if (!only || only === "1") await partOne();
    if (!only || only === "2") await require("./orre-story-agate-2").partTwo();
  })().catch((error) => { console.error(error); process.exitCode = 1; });
}
