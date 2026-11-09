// Actual-page Windworks lock/rescue, moving Gym clock and Forest Badge.
"use strict";
const assert = require("node:assert/strict"), T = require("./lib");
(async () => {
  const s = await T.start(p => {
    p.party = [Party.create("Charizard", 22, { moves: ["Flamethrower"], ivs: 31 })];
    p.badges = ["coal"]; p.flags.sinnoh = { starter: "Turtwig", dex: true, balls: true, rival203: true, roarkFound: true,
      jubilifeGalactic: true, windGuard: true, worksKey: true };
    Player.addItem(p, "works-key");
  }, { map: "ValleyWindworks", x: 19, y: 14, facing: "up" }, {
    out: "/tmp/pokemon-sinnoh-eterna", storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) }
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
  try {
    await s.boot();
    // A closed door must actually block walking, rather than only show text.
    assert.equal(await s.eval(() => World.step(Game.player.location, "up").warp), undefined);
    await finish(() => !!Game.player.flags.sinnoh.worksOpen, "Works Key unlock");
    await s.walk("up", 1); await s.wait(500);
    assert.equal((await s.player()).location.map, "ValleyWindworks_Building");
    await s.page.waitForFunction(() => Overworld.idle()); await s.shot("windworks");
    await go("ValleyWindworks_Building", 19, 7, "right");
    await finish(() => !!Game.player.flags.sinnoh.mars, "Mars rescue");
    await s.eval(() => Game.player.party.forEach(Party.heal));
    await go("EternaCity", 22, 52);
    await s.walk("up", 1); await s.wait(500);
    assert.equal((await s.player()).location.map, "EternaCity_Gym");
    await s.page.waitForFunction(() => Overworld.idle());
    for (const [n, x, y] of [[0, 14, 23], [1, 20, 18], [2, 2, 8]]) {
      await go("EternaCity_Gym", x, y);
      await finish(new Function("return (Game.player.flags.sinnoh.gardeniaClock | 0) > " + n), "clock Trainer " + (n + 1));
      assert.deepEqual([(await s.player()).location.x, (await s.player()).location.y], [11, 18]);
      await s.shot("clock-" + (n + 1));
      await s.eval(() => Game.player.party.forEach(Party.heal));
    }
    await go("EternaCity_Gym", 11, 4);
    await finish(() => !!Game.player.flags.sinnoh.gardeniaTM, "Forest Badge and Grass Knot");
    const p = await s.player(); assert(p.badges.includes("forest"));
    assert.equal(await s.eval(() => Player.levelCap(Game.player)), 26);
    await go("EternaCity_Gym", 11, 26, "down"); await s.walk("down", 2); await s.wait(500);
    assert.equal((await s.player()).location.map, "EternaCity");
    assert.deepEqual(errors, []);
    assert.deepEqual([...missing].filter(u => /pt_|EternaCity_Gym|Windworks|works-key/.test(u)), []);
    console.log("ok: browser Sinnoh imported art, reciprocal entrances, clock changes, Mars and Gardenia battles; no script errors or missing chapter assets");
  } catch (e) { await s.shot("failure"); throw e; }
  finally { await s.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
