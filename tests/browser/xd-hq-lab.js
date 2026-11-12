// Pokémon XD's opening at the Pokémon HQ Lab, through real input: the HQ Lab on Orre's map once Oak's flown you in
// (xdStory 2); into the lab, Lily (3); upstairs, Krane's welcome and his Eevee (4); the Snag Machine in the lobby,
// and Cipher bursting in to take Krane (5); outside, Spy Naps and his Shadow Teddiursa, snagged with a Ball from the
// Bag (6), a Shadow Pokémon with XD's own heart gauge; Krane's Eevee as XD's hero's; XD's level cap.
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");
const OUT = process.env.OUT || "/tmp/pk-xd";
(async () => {
  const s = await T.start((p) => {
    // (A party under XD's opening cap, strong enough to win by mashing A.)
    p.party = [Party.create("Gyarados", 15, { moves: ["Bite", "Thrash", "Leer", "Twister"], ivs: 31 })];
    p.bag = { "master-ball": 3 };
    Object.assign(p.flags, { starter: "Charmander", orre: 3, orreStory: 44, orreLanded: true, orreLevelCap: 100, xdStory: 2, xdBriefed: true,
      orreMap: ["PhenacCity", "PyriteTown", "PokemonHQLab"] });
  }, { map: "OrreAirStrip", x: 21, y: 3, facing: "up" }, {
    out: OUT, storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) } });
  const errors = [], missing = new Set(), long = new Set();
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  const flags = () => s.eval(() => JSON.parse(JSON.stringify(Game.player.flags)));
  const idle = () => s.eval(() => Overworld.idle());
  const where = async () => (await s.player()).location;
  const inBattle = () => s.eval(() => !document.getElementById("field").classList.contains("hidden"));
  const go = async (map, x, y, facing) => { await s.eval((to) => Overworld.teleport(to), { map, x, y, facing: facing || "up" }); await s.wait(350); };
  const box = async () => { const t = await s.eval(() => (document.getElementById("field").classList.contains("hidden") && (document.getElementById("textbox") || {}).innerText) || ""); for (const l of t.split("\n")) if (l.length > 37) long.add(l); return t; };
  async function finish(predicate, label, limit = 400) {
    for (let i = 0; i < limit; i++) {
      await s.press("z", 80); await box();
      if (await s.eval(predicate) && await idle()) { console.log("ok: browser XD " + label); return; }
    }
    await s.shot("xd-stuck");
    throw new Error(label + " did not complete: " + JSON.stringify(await s.eval(() => ({ at: Game.player.location, xd: Game.player.flags.xdStory, text: document.getElementById("textbox").innerText }))));
  }
  // Stand beside someone (by local id), facing them.
  async function standBy(localId) {
    const spot = await s.eval((id) => {
      const p = Overworld.personPosition(id), m = World.map(Game.player.location.map);
      if (!p) return null;
      const taken = (x, y) => m.people.some((q) => { const at = Overworld.personPosition(q.localId); return at && at.x === x && at.y === y; });
      for (const [dx, dy, facing] of [[0, 1, "up"], [0, -1, "down"], [1, 0, "left"], [-1, 0, "right"]]) {
        const x = p.x + dx, y = p.y + dy;
        if (x < 0 || y < 0 || x >= m.width || y >= m.height || m.collision[y * m.width + x] || taken(x, y)) continue;
        return { x, y, facing };
      }
      return null;
    }, localId);
    assert(spot, "somewhere to stand by " + localId);
    await go((await where()).map, spot.x, spot.y, spot.facing);
  }
  try {
    await s.page.reload(); await s.boot();
    // Orre's map from the Air Strip: the HQ Lab on it; there.
    assert(await s.eval(() => Orre.openPlaces(Game.player.flags).some((p) => p.map === "PokemonHQLab")), "the HQ Lab on Orre's map");
    assert.equal(await s.eval(() => Player.levelCap(Game.player)), 15, "XD's opening cap in Orre");
    await go("PokemonHQLab", 13, 10, "up");
    await s.shot("xd-hq-lab-outside");
    // In through the lab's doors: Lily.
    await s.walk("up", 2);
    await finish(() => (Game.player.flags.xdStory | 0) === 3, "the lobby: Lily meets you");
    assert.equal((await where()).map, "PokemonHQLab_1F");
    // Upstairs: Krane, his Eevee (no nickname).
    await go("PokemonHQLab_2F", 13, 2, "down");
    await standBy("LOCALID_XD_KRANE");
    await s.press("z", 80);
    for (let i = 0; i < 300 && (await flags()).xdStory !== 4; i++) {
      const t = await box();
      await s.press(/nickname/i.test(t) ? "x" : "z", 80);
    }
    for (let i = 0; i < 40 && !(await idle()); i++) await s.press("z", 80);
    const eevee = (await s.player()).party.find((r) => r.species === "Eevee");
    assert(eevee && eevee.level === 10, "Krane's Eevee, Lv. 10");
    assert.deepEqual(eevee.moves.map((m) => m.name), ["Tackle", "Tail Whip", "Helping Hand", "Bite"]);
    console.log("ok: browser XD Krane's welcome and his Eevee");
    // The lobby: the Snag Machine, and Cipher takes Krane.
    await go("PokemonHQLab_1F", 13, 2, "down");
    await standBy("LOCALID_XD_KRANE_1F");
    await finish(() => (Game.player.flags.xdStory | 0) === 5, "the Snag Machine, and Cipher bursts in");
    let p = await s.player();
    assert(p.bag["snag-machine"] && p.bag["poke-ball"] === 5 && p.flags.xdShadowMonitor, "the Snag Machine, the Shadow Monitor and 5 Poké Balls");
    // Out the front: Naps. (A Master Ball from the Bag at his Shadow Teddiursa.)
    await s.eval(() => {
      const G = window.GbaMenus, act = G.battleAction, bagOpen = window.BagScreen.open;
      let thrown = -1, thrownIn = null, ball = false;   // (the turn a ball was last thrown, and in which battle: a new battle starts its turns over)
      G.battleAction = (c, o) => { const b = BattleScreen._test.battle; if (b && o.name && b.snag && !(thrownIn === b && thrown === b.turn) && [].concat(b.sides.p2.actives || b.sides.p2.active).some((m) => m && b.snaggable(m))) { thrown = b.turn; thrownIn = b; ball = true; return Promise.resolve({ action: "bag", cursor: 1 }); } return act(c, o); };
      window.BagScreen.open = (o) => (ball ? (ball = false, Promise.resolve({ pocket: "Poké Balls", id: "master-ball" })) : bagOpen(o));
    });
    await go("PokemonHQLab_1F", 7, 8, "down");
    await s.walk("down", 2);
    let battled = false;
    for (let i = 0; i < 600 && !((await flags()).xdStory === 6 && await idle()); i++) { await s.press("z", 80); await box(); if (await inBattle()) battled = true; }
    assert(battled, "a battle with Naps: " + JSON.stringify(await s.eval(() => ({ at: Game.player.location, xd: Game.player.flags.xdStory, text: document.getElementById("textbox").innerText }))));
    const f = await flags();
    assert.equal(f.xdStory, 6, "Naps beaten, Cipher gone with Krane");
    assert.deepEqual(f.xdShadowSnagged, [1], "XD's Shadow Pokémon #1 snagged");
    p = await s.player();
    const ted = p.party.concat([].concat(...p.boxes).filter(Boolean)).find((r) => r.species === "Teddiursa");
    assert(ted && ted.shadow && ted.heartMax === 3000 && ted.heart === 3000, "a Shadow Teddiursa, XD's heart gauge (3,000), shut: " + JSON.stringify(ted && { h: ted.heart, m: ted.heartMax }));
    assert.deepEqual(ted.moves.map((m) => m.name), ["Shadow Blitz", "Shadow Mist"], "its Shadow moves");
    await s.shot("xd-after-naps");
    console.log("ok: browser XD Spy Naps's Shadow Teddiursa snagged; Cipher's made off with Krane");
    assert.deepEqual(errors, []);
    assert.deepEqual([...missing], []);
    assert.deepEqual([...long], [], "every line fits the box");
  } catch (error) { await s.shot("xd-failure"); throw error; }
  finally { await s.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
