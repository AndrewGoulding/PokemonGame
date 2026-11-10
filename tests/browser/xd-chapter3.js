// Pokémon XD's third chapter, Agate Village, through real input: into Eagun's house, Beluh and Eagun running in, off
// to the Relic Stone (xdStory 13); one of his friends in the Relic Cave (Cron), a battle with the Shadow Pokémon in
// your party; Eagun and his Pikachu at the Relic Stone, then your Shadow Pokémon purified there (14); back at his
// house, Vander on Mt. Battle, and your P★DA number (15). Jovi's lines from the last chapter: no "big brother".
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");
const OUT = process.env.OUT || "/tmp/pk-xd3";
(async () => {
  const s = await T.start((p) => {
    const ted = Orre.XD.shadowRecord(1); OrreHeart.snagged(ted);
    p.party = [Party.create("Gyarados", 15, { moves: ["Bite", "Thrash", "Leer", "Twister"], ivs: 31 }), ted];
    p.bag = { "snag-machine": 1, "poke-ball": 5 };
    Object.assign(p.flags, { starter: "Charmander", orre: 3, orreStory: 44, orreLanded: true, orreLevelCap: 100, xdStory: 12, xdBriefed: true,
      xdShadowSnagged: [1], xdChamberDue: true, orreMap: ["PhenacCity", "PyriteTown", "AgateVillage", "PokemonHQLab", "GateonPort", "KaminkosHouse"] });
  }, { map: "AgateVillage", x: 17, y: 8, facing: "up" }, {
    out: OUT, storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) } });
  const errors = [], missing = new Set(), long = new Set();
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  const flags = () => s.eval(() => JSON.parse(JSON.stringify(Game.player.flags)));
  const idle = () => s.eval(() => Overworld.idle());
  const where = async () => (await s.player()).location;
  const go = async (map, x, y, facing) => { await s.eval((to) => Overworld.teleport(to), { map, x, y, facing: facing || "up" }); await s.wait(350); };
  const said = [];
  const box = async () => { const t = await s.eval(() => (document.getElementById("field").classList.contains("hidden") && (document.getElementById("textbox") || {}).innerText) || ""); if (t) said.push(t); for (const l of t.split("\n")) if (l.length > 37) long.add(l); return t; };
  async function finish(predicate, label, limit = 500) {
    for (let i = 0; i < limit; i++) {
      const t = await box();
      await s.press(/nickname/i.test(t) ? "x" : "z", 80);
      if (await s.eval(predicate) && await idle()) { console.log("ok: browser XD " + label); return; }
    }
    await s.shot("xd3-stuck");
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
  try {
    await s.page.reload(); await s.boot();
    // ---- Eagun's house: Beluh, Eagun runs in and off ahead to the Relic Stone. ----
    await go("AgateVillage", 17, 7, "up");
    await s.walk("up", 1);
    await finish(() => (Game.player.flags.xdStory | 0) === 13, "Eagun's house: Beluh, and Eagun off to the Relic Stone");
    assert(!(await s.eval(() => Overworld.personPosition("LOCALID_ORRE_EAGUN"))), "Eagun's out");
    // ---- The Relic Cave: Cron, a battle with a Shadow Pokémon in the party. ----
    await go("AgateVillage_RelicCave", 11, 6, "up");
    await standBy("LOCALID_XD_CRON");
    let battled = false;
    for (let i = 0; i < 400; i++) {
      await box(); await s.press("z", 80);
      if (await s.eval(() => !document.getElementById("field").classList.contains("hidden"))) battled = true;
      if (battled && await idle()) break;
    }
    assert(battled, "a battle with Cron");
    assert(said.some((t) => /sad world/.test(t)), "Cron's words after");
    console.log("ok: browser XD Cron in the Relic Cave");
    // ---- The Relic Stone: Eagun and Pikachu; Teddiursa's heart (brought down for the test) and its purification. ----
    await s.eval(() => { Game.player.party.forEach(Party.heal); Game.player.party.find((r) => r.species === "Teddiursa").heart = 0; });
    await go("RelicForest", 10, 9, "up");
    await standBy("LOCALID_XD_EAGUN");
    await finish(() => (Game.player.flags.xdStory | 0) === 14, "Eagun's Pikachu, and the Relic Stone purifies Teddiursa", 800);
    const ted = (await s.player()).party.find((r) => r.species === "Teddiursa");
    assert(ted && !ted.shadow && ted.nationalRibbon, "purified");
    // ---- Back at his house: Vander, the P★DA number. ----
    await go("AgateVillage", 17, 7, "up");
    await s.walk("up", 1);
    await finish(() => (Game.player.flags.xdStory | 0) === 15, "back at Eagun's: Vander on Mt. Battle");
    assert((await flags()).orreMap.includes("MtBattle"), "Mt. Battle on Orre's map");
    assert(said.some((t) => /Vander/.test(t)));
    assert(!said.some((t) => /big brother/i.test(t)), "no \"big brother\"");
    assert.deepEqual(errors, []);
    assert.deepEqual([...missing], []);
    assert.deepEqual([...long], [], "every line fits the box");
  } catch (error) { await s.shot("xd3-failure"); throw error; }
  finally { await s.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
