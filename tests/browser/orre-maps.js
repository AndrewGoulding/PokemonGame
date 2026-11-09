// Actual-page traversal of the recreated Colosseum landmarks and changed doors.
"use strict";
const assert = require("node:assert/strict"), T = require("./lib");
(async () => {
  const s = await T.start((p) => { p.flags.orre = 2; p.flags.orreStory = 44; p.flags.orreLevelCap = 100;
    p.flags.orreMap = ["PhenacCity", "PyriteTown", "AgateVillage", "MtBattle", "RealgamTower_1F"]; },
    { map: "PhenacCity", x: 19, y: 34, facing: "up" }, { out: "/tmp/pokemon-orre-maps", storage: {
      "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) } });
  const errors = [], missing = new Set();
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  const go = async (map, x, y, facing = "up") => { await s.eval((to) => Overworld.teleport(to), { map, x, y, facing }); await s.wait(250); };
  const where = async (map) => assert.equal((await s.player()).location.map, map);
  async function enter(map, x, y, target) { await go(map, x, y); await s.walk("up", 1); await s.wait(350); await where(target); await s.page.waitForFunction(() => Overworld.idle()); console.log("ok: browser Orre door " + map + " -> " + target); }
  try {
    await s.page.reload(); await s.boot();
    await enter("PhenacCity", 6, 18, "PhenacCity_PokemonCenter_1F");
    await enter("PhenacCity", 20, 22, "PhenacCity_PreGym");
    await enter("AgateVillage", 17, 7, "AgateVillage_EaguansHouse");
    await enter("AgateVillage", 7, 8, "AgateVillage_PokemonCenter_1F");
    await enter("TheUnder", 6, 22, "TheUnder_Studio");
    await go("PyriteTown", 17, 14); for (let i = 0; i < 8 && (await s.player()).location.y > 11; i++) await s.walk("up", 1); assert((await s.player()).location.y <= 11, JSON.stringify(await s.eval(() => ({idle:Overworld.idle(),story:Game.player.flags.orreStory,loc:Game.player.location,text:document.body.innerText})))) ; await s.shot("pyrite-bridge");
    await go("MtBattle", 16, 25); for (let i = 0; i < 12 && (await s.player()).location.y > 19; i++) await s.walk("up", 1); assert((await s.player()).location.y <= 19); await s.shot("mtbattle-gantry");
    await enter("RealgamTower_Exterior", 19, 24, "RealgamTower_1F");
    await go("RealgamTower_1F", 9, 10, "down"); await s.walk("down", 2); await s.wait(350); await where("RealgamTower_Exterior");
    await go("RelicForest", 10, 6); await s.press("z"); await s.wait(500); await s.press("z");
    assert((await s.text()).includes("Relic Stone"));
    for (let i = 0; i < 12 && !(await s.eval(() => Overworld.idle())); i++) await s.press("z");
    // Check that the relocated antagonist scene actually starts at the Relic.
    await s.eval(() => { Game.player.flags.orreStory = 29; });
    await go("RelicForest", 11, 7, "down"); await s.press("z"); await s.wait(600);
    const elder = await s.eval(() => Overworld.personPosition("LOCALID_ORRE_SHRINE_EAGUN"));
    assert(elder && elder.x === 9 && elder.y === 9, "Eagun must enter at the new forest position");
    assert((await s.text()).includes("Relic Stone"));
    assert.deepEqual(errors, []);
    const newAssets = /(?:PhenacCity(?:_PreGym)?|PyriteTown|AgateVillage|TheUnder|MtBattle|OutskirtStand|RealgamTower_Exterior|RelicForest)(?:-(?:top|border))?\.png/;
    assert.deepEqual([...missing].filter((url) => newAssets.test(url)), []);
    console.log("ok: browser Orre bridge/gantry traversal, Realgam return and relocated Relic encounter; no script errors or missing rebuilt maps");
  } catch (error) { await s.shot("failure"); throw error; }
  finally { await s.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
