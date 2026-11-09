// Platinum's first chapter through real input and the shared story dispatcher.
// Like the Johto story checks, jumps between scenes avoid grinding encounters;
// movement into the Gym and its exit still exercise the actual reciprocal warps.
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");
(async () => {
  const s = await T.start((p) => { p.party = [Party.create("Pikachu", 5)]; },
    { map: "SandgemTown_RowansLab", x: 6, y: 4, facing: "up" }, {
      out: "/tmp/pokemon-sinnoh-story", storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) }
    });
  const errors = [], missing = new Set();
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  const idle = () => s.eval(() => Overworld.idle());
  async function finish(predicate, label, limit = 350) {
    for (let i = 0; i < limit; i++) {
      await s.press("z", 90);
      if (await s.eval(predicate) && await idle()) { console.log("ok: browser Sinnoh " + label); return; }
    }
    throw new Error(label + " did not complete: " + JSON.stringify(await s.eval(() => ({ location: Game.player.location, sinnoh: Game.player.flags.sinnoh, text: document.getElementById("textbox").innerText }))));
  }
  async function go(map, x, y, facing) {
    await s.eval((to) => Overworld.teleport(to), { map, x, y, facing: facing || "up" });
    await s.wait(350);
  }
  try {
    await s.page.reload();
    await s.boot();
    await finish(() => !!Game.player.flags.sinnoh?.dex, "Rowan starter and research");
    let p = await s.player();
    assert.equal(p.flags.sinnoh.starter, "Turtwig");
    assert.equal(p.party.filter((r) => r.species === "Turtwig").length, 1);
    await go("SandgemTown_RowansLab", 3, 11);
    await finish(() => !!Game.player.flags.sinnoh?.balls, "Dawn's five Balls");
    assert.equal((await s.player()).bag["poke-ball"], 5);
    // Represents training the new partner along Route 202, at Sinnoh's cap.
    await s.eval(() => { Game.player.party = [Party.create("Turtwig", 14, { moves: ["Razor Leaf"] })]; });
    await go("Route202", 18, 25);
    await finish(() => !!Game.player.flags.PT_TRAINER_YOUNGSTER_TRISTAN, "Platinum route trainer");
    await s.eval(() => Game.player.party.forEach(Party.heal));
    await go("Route203", 3, 20, "right");
    await s.walk("right", 1);
    await finish(() => !!Game.player.flags.sinnoh?.rival203, "Barry on Route 203");
    await go("OreburghMine", 18, 44, "down");
    await finish(() => !!Game.player.flags.sinnoh?.roarkFound, "Roark returns from the mine");
    await go("OreburghCity", 31, 18);
    await s.walk("up", 1);
    assert.equal((await s.player()).location.map, "OreburghCity_Gym");
    await go("OreburghCity_Gym", 5, 4);
    // A travelling player's trained partner makes this a deterministic story
    // check rather than a test of random Headbutt flinches against a lone starter.
    await s.eval(() => { Game.player.party = [Party.create("Roserade", 14, { moves: ["Energy Ball"], ivs: 31 })]; });
    await finish(() => !!Game.player.flags.sinnoh?.roarkTM, "Coal Badge and Stealth Rock");
    p = await s.player();
    assert(p.badges.includes("coal"));
    assert(p.flags.PT_TRAINER_LEADER_ROARK);
    const tm = await s.eval(() => Bag.machines().find((id) => Bag.machineMove(id) === "Stealth Rock"));
    assert.equal(p.bag[tm], 1);
    await go("OreburghCity_Gym", 5, 23, "down");
    await s.walk("down", 2); // step onto the exit mat, then press toward the wall
    assert.equal((await s.player()).location.map, "OreburghCity");
    assert.deepEqual(errors, []);
    assert.deepEqual([...missing].filter((url) => /pt_|OreburghCity_Gym/.test(url)), []);
    // All state and the new badge survive the same serialization used by saves.
    await s.eval(() => { const loaded = Player.load(JSON.parse(Player.serialize(Game.player))); if (!loaded.player.badges.includes("coal") || !loaded.player.flags.sinnoh.roarkTM) throw new Error("Sinnoh save failed"); });
    console.log("ok: browser Sinnoh Gym entry/exit and save round-trip");
  } catch (error) { await s.shot("failure"); throw error; }
  finally { await s.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
