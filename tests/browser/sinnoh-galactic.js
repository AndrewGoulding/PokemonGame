// Real-page Cut entrance, Galactic stair chain, Jupiter, bike and Egg rewards.
"use strict";
const assert = require("node:assert/strict"), T = require("./lib");
(async () => {
  const s = await T.start(p => {
    p.party = [Party.create("Kyogre", 26, { moves: ["Surf"], ivs: 31, nature: "Modest" }), Party.create("Charizard", 26, { moves: ["Cut"], ivs: 31 })];
    p.badges = ["coal", "forest"]; p.flags.sinnoh = { starter: "Turtwig", dex: true, balls: true, rival203: true, roarkFound: true,
      jubilifeGalactic: true, windGuard: true, worksKey: true, worksOpen: true, mars: true, cherylDone: true, cutHM: true, gardeniaClock: 3, gardeniaTM: true };
    Player.addItem(p, FieldMoves.hmFor("Cut"));
  }, { map: "EternaCity", x: 10, y: 40, facing: "up" }, {
    out: "/tmp/pokemon-sinnoh-galactic", storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, battleStyle: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) }
  });
  const errors = [], missing = new Set();
  s.page.on("pageerror", e => errors.push(e.message));
  s.page.on("response", r => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  async function finish(predicate, label, limit = 350) {
    for (let i = 0; i < limit; i++) {
      await s.press("z", 90);
      if (await s.eval(predicate) && await s.eval(() => Overworld.idle())) { console.log("ok: browser Sinnoh " + label); return; }
    }
    throw new Error(label + " did not complete: " + JSON.stringify(await s.eval(() => ({ location: Game.player.location, sinnoh: Game.player.flags.sinnoh, text: document.body.innerText }))));
  }
  async function go(map, x, y, facing = "up") {
    await s.page.waitForFunction(() => Overworld.idle());
    await s.eval(to => Overworld.teleport(to), { map, x, y, facing }); await s.wait(350);
  }
  async function upTo(map) { await s.walk("up", 1); await s.wait(500); assert.equal((await s.player()).location.map, map); await s.page.waitForFunction(() => Overworld.idle()); }
  try {
    await s.boot();
    await finish(() => !Overworld.personPosition("PT_GALACTIC_CUT"), "Cut opens Galactic entrance");
    await upTo("EternaGalactic_1F"); await s.shot("galactic-1f");
    await go("EternaGalactic_1F", 14, 7); await upTo("EternaGalactic_2F");
    await go("EternaGalactic_2F", 20, 4); await upTo("EternaGalactic_3F");
    await go("EternaGalactic_3F", 20, 4); await upTo("EternaGalactic_4F");
    await go("EternaGalactic_4F", 14, 7);
    await finish(() => !!Game.player.flags.sinnoh.jupiter, "Jupiter rescue"); await s.shot("galactic-cleared");
    assert.equal(await s.eval(() => Overworld.personPosition("PT_jupiter")), null);
    await go("EternaCity", 23, 32); await upTo("EternaCity_2");
    await go("EternaCity_2", 7, 6);
    await finish(() => !!Game.player.flags.sinnoh.bicycle, "Rad Rickshaw's Bicycle"); await s.shot("cycle-shop");
    assert.equal((await s.player()).bag.bicycle, 1);
    await go("EternaCity", 25, 33, "right");
    await finish(() => !!Game.player.flags.sinnoh.togepiEgg, "Cynthia's Togepi Egg");
    assert.equal((await s.player()).party.filter(r => r.egg && r.species === "Togepi").length, 1);
    await go("CyclingRoadNorth_Gate", 9, 9, "down"); await s.walk("down", 1); await s.wait(500);
    for (let i = 0; i < 8 && await s.eval(() => Overworld.avatar() !== "bike"); i++) await s.wait(250);
    assert.equal(await s.eval(() => Overworld.avatar()), "bike");
    await go("CyclingRoadNorth_Gate", 9, 12, "down"); await s.walk("down", 2); await s.wait(500);
    assert.equal((await s.player()).location.map, "CyclingRoad");
    assert.equal(await s.eval(() => Overworld.avatar()), "bike"); await s.shot("cycling-road");
    assert.deepEqual(errors, []);
    assert.deepEqual([...missing].filter(u => /pt_|EternaGalactic_|EternaCity_2|CyclingRoad/.test(u)), []);
    console.log("ok: browser Sinnoh Cut, reciprocal Galactic floors, Jupiter battle, Cycle Shop, Cynthia Egg and forced cycling; no script errors or missing chapter assets");
  } catch (e) { await s.shot("failure"); throw e; }
  finally { await s.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
