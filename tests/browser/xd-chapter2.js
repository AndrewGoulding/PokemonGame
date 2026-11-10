// Pokémon XD's second chapter and the Purify Chamber, through real input: Lily's errand with Jovi (xdStory 7); Gateon
// Port, Jovi and Zook, Mr. Verich's man, Emili (8); Perr at the pier (9); Kaminko's House, Chobin at the gate and
// Makan inside (10); the Parts Shop, the Machine Part (11); back to Lily (12); away on Orre's map and back, and the
// Purify Chamber's finished; the Shadow Teddiursa on a Set with a ring of four, its heart opened by walking, and
// purified there.
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");
const OUT = process.env.OUT || "/tmp/pk-xd2";
(async () => {
  const s = await T.start((p) => {
    const ted = Orre.XD.shadowRecord(1); OrreHeart.snagged(ted);
    p.party = [Party.create("Gyarados", 15, { moves: ["Bite", "Thrash", "Leer", "Twister"], ivs: 31 }), ted,
      ...["Rattata", "Zigzagoon", "Sentret", "Pidgey"].map((sp) => Party.create(sp, 10))];
    p.bag = { "snag-machine": 1, "poke-ball": 5 };
    Object.assign(p.flags, { starter: "Charmander", orre: 3, orreStory: 44, orreLanded: true, orreLevelCap: 100, xdStory: 6, xdBriefed: true,
      xdShadowSnagged: [1], orreMap: ["PhenacCity", "PyriteTown", "AgateVillage", "PokemonHQLab"] });
  }, { map: "PokemonHQLab_1F", x: 3, y: 4, facing: "left" }, {
    out: OUT, storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) } });
  const errors = [], missing = new Set(), long = new Set();
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  const flags = () => s.eval(() => JSON.parse(JSON.stringify(Game.player.flags)));
  const idle = () => s.eval(() => Overworld.idle());
  const where = async () => (await s.player()).location;
  const go = async (map, x, y, facing) => { await s.eval((to) => Overworld.teleport(to), { map, x, y, facing: facing || "up" }); await s.wait(350); };
  const box = async () => { const t = await s.eval(() => (document.getElementById("field").classList.contains("hidden") && (document.getElementById("textbox") || {}).innerText) || ""); for (const l of t.split("\n")) if (l.length > 37) long.add(l); return t; };
  async function finish(predicate, label, limit = 500) {
    for (let i = 0; i < limit; i++) {
      await s.press("z", 80); await box();
      if (await s.eval(predicate) && await idle()) { console.log("ok: browser XD " + label); return; }
    }
    await s.shot("xd2-stuck");
    throw new Error(label + " did not complete: " + JSON.stringify(await s.eval(() => ({ at: Game.player.location, xd: Game.player.flags.xdStory, text: document.getElementById("textbox").innerText }))));
  }
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
  // A menu's option, by its label (clicked).
  async function pick(label) {
    for (let i = 0; i < 60; i++) {
      const found = await s.eval((l) => [...document.querySelectorAll("#menu button")].some((b) => b.textContent.trim().startsWith(l)), label);
      if (found) { await s.eval((l) => [...document.querySelectorAll("#menu button")].find((b) => b.textContent.trim().startsWith(l)).click(), label); await s.wait(250); return; }
      await s.press("z", 60);
    }
    throw new Error("no option " + label + ": " + await s.eval(() => document.getElementById("menu").innerText));
  }
  // Onto Orre's map off a map's edge, and a place on it (the arrows, then A).
  async function travel(edge, dir, name) {
    await go(...edge, dir);
    await s.walk(dir, 1);
    for (let i = 0; i < 40 && !(await s.eval(() => !!document.querySelector(".orre-map"))); i++) await s.wait(100);
    for (let i = 0; i < 12 && (await s.eval(() => document.querySelector(".orre-map .tm-name b").textContent)) !== name; i++) {
      await s.press(await s.eval((to) => { const places = Orre.openPlaces(Game.player.flags), here = document.querySelector(".orre-map .tm-name b").textContent;
        const a = places.find((p) => p.name === here), b = places.find((p) => p.name === to);
        return Math.abs(b.x - a.x) > Math.abs(b.y - a.y) ? (b.x > a.x ? "ArrowRight" : "ArrowLeft") : (b.y > a.y ? "ArrowDown" : "ArrowUp"); }, name));
    }
    assert.equal(await s.eval(() => document.querySelector(".orre-map .tm-name b").textContent), name);
    await s.press("z"); await s.wait(1800);
  }
  try {
    await s.page.reload(); await s.boot();
    // ---- Lily's errand. ----
    await standBy("LOCALID_XD_LILY");
    await finish(() => (Game.player.flags.xdStory | 0) === 7, "Lily's errand: Jovi with you to Gateon Port");
    assert(await s.eval(() => Orre.openPlaces(Game.player.flags).some((p) => p.map === "GateonPort")), "Gateon Port on Orre's map");
    // ---- Gateon Port, by Orre's map from the Lab's road south. ----
    await travel(["PokemonHQLab", 13, 20], "down", "Gateon Port");
    await finish(() => (Game.player.flags.xdStory | 0) === 8, "Gateon Port: Jovi, Zook and Mr. Verich", 300);
    await s.shot("xd2-gateon");
    // Perr at the pier.
    await standBy("LOCALID_XD_PERR");
    await finish(() => (Game.player.flags.xdStory | 0) === 9, "Perr at the pier: his grandpa's at Kaminko's");
    // ---- Kaminko's House: Chobin at the gate, Makan inside. ----
    await go("KaminkosHouse", 13, 18, "up");
    await s.shot("xd2-kaminko");
    await standBy("LOCALID_XD_CHOBIN");
    await finish(() => !!Game.player.flags.xdChobin, "Chobin at Kaminko's gate, beaten", 600);
    await go("KaminkosHouse_1F", 9, 7, "up");
    await standBy("LOCALID_XD_MAKAN");
    await finish(() => (Game.player.flags.xdStory | 0) === 10, "Makan at Kaminko's");
    // ---- The Parts Shop: the Machine Part. ----
    await go("GateonPort_PartsShop", 8, 11, "up");
    await standBy("LOCALID_XD_PERR_SHOP");
    await finish(() => (Game.player.flags.xdStory | 0) === 11, "the Machine Part from Perr");
    assert.equal((await s.player()).bag["machine-part"], 1);
    // ---- Back to Lily (YES, YES). ----
    await go("PokemonHQLab_1F", 3, 4, "left");
    await standBy("LOCALID_XD_LILY");
    await finish(() => (Game.player.flags.xdStory | 0) === 12, "the Machine Part to Lily; off to Agate's Eagun");
    let f = await flags();
    assert(f.xdChamberDue && !f.xdChamber && !(await s.player()).bag["machine-part"], "the Chamber not finished yet");
    // ---- Away and back: the Chamber's finished. ----
    await travel(["PokemonHQLab", 13, 20], "down", "Gateon Port");
    await finish(() => Game.player.location.map === "GateonPort", "away to Gateon Port", 60);
    await travel(["GateonPort", 17, 1], "up", "Pokémon HQ Lab");
    for (let i = 0; i < 40 && !(await idle()); i++) await s.press("z", 80);
    assert.equal((await where()).map, "PokemonHQLab", "back at the Lab's grounds");
    await go("PokemonHQLab", 13, 10, "up");
    await s.walk("up", 2);
    await finish(() => !!Game.player.flags.xdChamber, "back at the Lab: the Purify Chamber's finished");
    // ---- The Chamber: Teddiursa on Set 1, a ring of four Normal-types. ----
    await go("PokemonHQLab_1F", 11, 6, "down");
    await s.press("z", 80);
    await pick("Set 1:");
    await pick("Place a Shadow");
    await pick("Teddiursa");
    for (const sp of ["Rattata", "Zigzagoon", "Sentret", "Pidgey"]) { await pick("Add to the ring"); await pick(sp.toUpperCase().slice(0, 3).toLowerCase().replace(/^./, (c) => c.toUpperCase())); }
    await s.shot("xd2-chamber-set");
    await pick("Back"); await pick("Exit");
    for (let i = 0; i < 20 && !(await idle()); i++) await s.press("x", 80);
    f = await flags();
    assert.equal(f.xdChamberSets[0].shadow.species, "Teddiursa");
    assert.deepEqual(f.xdChamberSets[0].ring.map((r) => r.species), ["Rattata", "Zigzagoon", "Sentret", "Pidgey"]);
    assert.deepEqual((await s.player()).party.map((r) => r.species), ["Gyarados"], "the rest are on the Set");
    console.log("ok: browser XD the Purify Chamber: a Shadow Pokémon on a Set, a ring of four");
    // Walking: its heart opens (the gauge brought down near the end, the step count to the last step of 161).
    await s.eval(() => { const t = Game.player.flags.xdChamberSets[0].shadow; t.heart = 50; Game.player.flags.xdChamberSteps = XDChamber.STEPS - 1; });
    await go("PokemonHQLab_1F", 4, 3, "right");
    await s.walk("right", 1);
    for (let i = 0; i < 30 && !(await idle()); i++) await s.press("z", 80);
    assert.equal((await flags()).xdChamberSets[0].shadow.heart, 0, "its heart opened as you walked");
    // Purified there.
    await go("PokemonHQLab_1F", 11, 6, "down");
    await s.press("z", 80);
    await pick("Set 1:");
    await pick("Purify Teddiursa");
    for (let i = 0; i < 80; i++) { const t = await box(); if (/nickname/i.test(t)) { await s.press("x", 80); continue; } if (await s.eval(() => !!document.querySelector("#menu button"))) break; await s.press("z", 80); }
    await pick("Back"); await pick("Exit");
    for (let i = 0; i < 20 && !(await idle()); i++) await s.press("x", 80);
    const p = await s.player();
    const ted = p.party.concat([].concat(...p.boxes).filter(Boolean)).find((r) => r.species === "Teddiursa");
    assert(ted && !ted.shadow && ted.nationalRibbon, "Teddiursa purified");
    assert.deepEqual(ted.moves.map((m) => m.name), ["Return", "Refresh", "Lick", "Metal Claw"], "its own moves in its Shadow moves' place");
    console.log("ok: browser XD the Purify Chamber: its heart opened by walking, purified there");
    assert.deepEqual(errors, []);
    assert.deepEqual([...missing], []);
    assert.deepEqual([...long], [], "every line fits the box");
  } catch (error) { await s.shot("xd2-failure"); throw error; }
  finally { await s.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
