// Pokémon XD's campaign starting, through real input: with Colosseum's story over in Orre and Hoenn's League won,
// Prof. Oak phones as you walk about outdoors (xdStory 1); only once both are done. At his lab, his briefing and his
// question, and his plane to the Orre Air Strip (xdStory 2).
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");
const OUT = process.env.OUT || "/tmp/pk-xd";
(async () => {
  const s = await T.start((p) => {
    p.party = [Party.create("Mewtwo", 70, { moves: ["Psychic"], ivs: 31 })];
    p.badges = ["boulder", "cascade", "thunder", "rainbow", "soul", "marsh", "volcano", "earth"];
    Object.assign(p.flags, { starter: "Charmander", rivalLabBattle: true, parcelDelivered: true, johtoLeagueClear: true, orre: 3, orreStory: 44, orreLanded: true,
      orreMap: ["PhenacCity", "PyriteTown"], hoenn: { f: {} } });
  }, { map: "PalletTown", x: 10, y: 10, facing: "down" }, {
    out: OUT, storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) } });
  const errors = [], missing = new Set();
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  const flags = () => s.eval(() => JSON.parse(JSON.stringify(Game.player.flags)));
  const idle = () => s.eval(() => Overworld.idle());
  const go = async (map, x, y, facing) => { await s.eval((to) => Overworld.teleport(to), { map, x, y, facing: facing || "up" }); await s.wait(350); };
  // A few steps about Pallet Town, A pressed through anything said.
  async function stroll() {
    for (const dir of ["right", "left", "right", "left"]) {
      await s.walk(dir, 1);
      for (let i = 0; i < 40 && !(await idle()); i++) await s.press("z", 70);
    }
  }
  try {
    await s.page.reload(); await s.boot();
    // Hoenn not yet won: no call.
    await stroll();
    assert(!(await flags()).xdStory, "no call before Hoenn's League is won");
    // Hoenn won: Oak calls.
    await s.eval(() => { Game.player.flags.hoenn.f.FLAG_SYS_GAME_CLEAR = true; });
    await stroll();
    for (let i = 0; i < 60 && !((await flags()).xdStory === 1 && await idle()); i++) await s.press("z", 70);
    assert.equal((await flags()).xdStory, 1, "Oak's call");
    console.log("ok: browser XD: Prof. Oak calls once Colosseum's story and Hoenn's League are done");
    // His lab: the briefing, YES, the plane to Orre.
    const oak = await s.eval(() => { const p = WORLD_MAPS.PalletTown_ProfessorOaksLab.people.find((q) => q.script === "PalletTown_ProfessorOaksLab_EventScript_ProfOak"); return { x: p.x, y: p.y }; });
    await go("PalletTown_ProfessorOaksLab", oak.x, oak.y + 1, "up");
    for (let i = 0; i < 200 && !((await flags()).xdStory === 2 && await idle()); i++) await s.press("z", 90);
    const f = await flags(), at = (await s.player()).location;
    assert.equal(f.xdStory, 2, "on his plane");
    assert(f.xdBriefed);
    assert.equal(at.map, "OrreAirStrip", "landed in Orre: " + JSON.stringify(at));
    await s.shot("xd-air-strip");
    console.log("ok: browser XD: Oak's briefing, and his plane to the Orre Air Strip");
    assert.deepEqual(errors, []);
    assert.deepEqual([...missing], []);
  } catch (error) { await s.shot("xd-failure"); throw error; }
  finally { await s.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
