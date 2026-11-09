// Representative Kanto story paths through real input, dispatch and scenes.
// PLAYWRIGHT_PATH and CHROMIUM can override the browser helper's defaults.
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");
const options = { out: "/tmp/pokemon-kanto-story", storage: {
  "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 })
} };
async function run(name, edit, location, done, verify) {
  const s = await T.start(edit, location, options);
  const errors = [];
  s.page.on("pageerror", (e) => errors.push(e.message));
  try {
    await s.boot();
    await s.press("z");
    for (let i = 0; i < 400; i++) {
      await s.press("z", 90);
      if (await s.eval(done)) break;
    }
    assert(await s.eval(done), name + " did not complete");
    await verify(s);
    assert.deepEqual(errors, []);
    console.log("ok: browser Kanto " + name);
  } catch (error) {
    await s.shot(name.replace(/\W+/g, "-"));
    throw error;
  } finally { await s.close(); }
}
(async () => {
  await run("Brock badge and TM", (p) => {
    p.flags.starter = "Bulbasaur";
    p.party = [Party.create("Mewtwo", 100, { moves: ["Psychic"] })];
    p.badges = ["cascade", "thunder", "rainbow", "soul", "marsh", "volcano", "earth"];
  }, { map: "PewterCity_Gym", x: 6, y: 6, facing: "up" },
  () => !!Game.player.flags.gotTM39,
  async (s) => {
    const p = await s.player();
    assert(p.badges.includes("boulder"));
    assert(p.flags.TRAINER_LEADER_BROCK);
    assert.equal(p.bag.tm39, 1);
  });
  await run("Oak parcel delivery", (p) => {
    p.flags.starter = "Bulbasaur";
    p.flags.oakInLab = p.flags.rivalLabBattle = p.flags.oaksParcel = true;
    p.flags.pokedex = false;
    Player.addItem(p, "oaks-parcel");
  }, { map: "PalletTown_ProfessorOaksLab", x: 6, y: 4, facing: "up" },
  () => !!Game.player.flags.parcelDelivered && Player.itemCount(Game.player, "poke-ball") === 5,
  async (s) => {
    const p = await s.player();
    assert(p.flags.pokedex);
    assert(!p.bag["oaks-parcel"]);
  });
})().catch((error) => { console.error(error); process.exitCode = 1; });
