// Orre, Colosseum's Pyrite chapter (orreStory 21 -> 28), played through the real page: coming into town, Cail,
// Duking's house and Silva, the windmill's stolen gear (the Chief, the Construction Lot on Orre's map, the gear in its
// upper-right corner), the gear put back, the Colosseum's story challenge and its TM06, Nore, the Pyrite Building's
// four floors, the top floor (Reath and Ferma, Miror B.), Pyrite Cave and Miror B.'s hideout, Fateen sending you to
// Agate; then the Colosseum's own tournaments, Fateen's chamber, and Pyrite's other Trainers. Doors, people and Orre's
// map are driven with keys; jumps between scenes are teleports. Every text box is watched for lines too wide for it.
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");

(async () => {
  const s = await T.start((p) => {
    p.party = [Party.create("Xerneas", 100, { moves: ["Dazzling Gleam", "Moonblast"], ivs: 31 }),
      Party.create("Mewtwo", 100, { moves: ["Psychic", "Aura Sphere"], ivs: 31 })];
    Object.assign(p.flags, { orre: 3, orreStory: 21, orreRui: true, orreLevelCap: 100, orreTroop: "Verde",
      orreMap: ["OrreAirStrip", "SnagemHideout", "OutskirtStand", "PhenacCity", "PyriteTown"] });
  }, { map: "PyriteTown_PokemonCenter_1F", x: 7, y: 7, facing: "down" }, {
    out: "/tmp/pokemon-orre-pyrite", storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) }
  });
  const errors = [], missing = new Set();
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  const idle = () => s.eval(() => Overworld.idle());
  const flags = () => s.eval(() => JSON.parse(JSON.stringify(Game.player.flags)));
  async function finish(predicate, label, limit = 500) {
    for (let i = 0; i < limit; i++) {
      await s.press("z", 90);
      if (await s.eval(predicate) && await idle()) { console.log("ok: browser Orre Pyrite " + label); return; }
    }
    throw new Error(label + " did not complete: " + JSON.stringify(await s.eval(() => ({ location: Game.player.location, story: Game.player.flags.orreStory,
      gear: Game.player.flags.orreGear, text: document.getElementById("textbox").innerText, menu: document.getElementById("menu").innerText }))));
  }
  // Mash through whatever's on screen till the world's idle again.
  async function settle(limit = 200) {
    for (let i = 0; i < limit; i++) { if (await idle() && !(await s.eval(() => document.getElementById("textbox").innerText.trim()))) return; await s.press("z", 90); }
  }
  // Talking (A) and reading on till `re` is in the text box.
  async function expectSay(re, label) {
    for (let i = 0; i < 60; i++) {
      await s.press("z", 90); await s.wait(250);
      if (re.test(await s.eval(() => document.getElementById("textbox").textContent))) { await settle(); console.log("ok: browser Orre Pyrite " + label); return; }
    }
    throw new Error(label + ": never said " + re);
  }
  // (Between scenes, as if back from a Pokémon Center: the party healed, PP and all.)
  async function go(map, x, y, facing) { await s.eval((to) => { Game.player.party.forEach(Party.heal); return Overworld.teleport(to); }, { map, x, y, facing: facing || "up" }); await s.wait(350); }
  const at = async () => (await s.player()).location;
  // Orre's map: from wherever you are, to the place called `name` (arrows toward it, then A).
  async function orreMap(name) {
    await s.page.waitForSelector(".orre-map .tm-name b", { timeout: 8000 });
    for (let i = 0; i < 20; i++) {
      const st = await s.eval((want) => {
        const now = document.querySelector(".orre-map .tm-name b").textContent;
        const places = Orre.openPlaces(Game.player.flags), a = places.find((p) => p.name === now), b = places.find((p) => p.name === want);
        return { now, a, b };
      }, name);
      assert(st.b, name + " isn't on Orre's map: " + JSON.stringify(st));
      if (st.now === name) { await s.press("z", 90); await s.wait(1600); return; }
      const dx = st.b.x - st.a.x, dy = st.b.y - st.a.y;
      await s.press(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "ArrowRight" : "ArrowLeft") : (dy > 0 ? "ArrowDown" : "ArrowUp"), 90);
    }
    throw new Error("couldn't reach " + name + " on Orre's map");
  }
  try {
    await s.page.reload();
    await s.boot();
    // Every text box: nothing shrunk to fit.
    await s.eval(() => {
      window.__tooWide = [];
      const box = document.getElementById("textbox");
      new MutationObserver(() => {
        // (A line too wide is carried on to the next (ui/screen.js); only text that still had to be shrunk to fit is
        // wrong.)
        const t = box.textContent;
        if (box.style.fontSize) window.__tooWide.push("(shrunk) " + t);
      }).observe(box, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["style"] });
    });

    // Out of the Pokémon Center into town at 21: the townsman and Rui (22).
    for (let i = 0; i < 4 && (await at()).map === "PyriteTown_PokemonCenter_1F"; i++) await s.walk("down", 1);
    await finish(() => Game.player.flags.orreStory === 22, "arriving in Pyrite");
    assert.equal((await at()).map, "PyriteTown");
    await s.shot("pyrite-arrival");
    // (Every Orre person drawn at their sprite's real size: the Riders' bikes 32 pixels wide, the little ones 16 high.)
    const sizes = await s.eval(() => {
      const size = {}, bad = [];
      for (const m of Object.values(WORLD_MAPS)) if (m.region !== "orre") for (const p of m.people || []) if (p.sprite && !size[p.sprite]) size[p.sprite] = p;
      for (const m of Object.values(WORLD_MAPS)) if (m.region === "orre") for (const p of m.people || []) {
        const c = size[p.sprite];
        if (c && (c.width !== p.width || c.height !== p.height || c.frames !== p.frames)) bad.push(m.name + " " + p.localId + " " + p.sprite);
      }
      return bad;
    });
    assert.deepEqual(sizes, [], "sprites at their real size");
    await go("PyriteTown", 17, 11, "left");
    await s.shot("duel-square");

    // Rogue Cail by the way in (Shadow Furret): won, he points you on (23).
    await go("PyriteTown", 14, 26, "down");
    await finish(() => Game.player.flags.orreStory === 23, "Rogue Cail");

    // Duking's house: Duking, then Silva storms in and out; the gear's stolen (orreGear 1).
    await go("PyriteTown", 6, 7, "up");
    await s.walk("up", 1);
    assert.equal((await at()).map, "PyriteTown_DukingsHouse");
    await settle();
    await go("PyriteTown_DukingsHouse", 7, 4, "up");
    await finish(() => Game.player.flags.orreGear === 1, "Duking's house and Silva");
    await s.shot("dukings-house");

    // Out in town, the windmill's man; into the windmill: the Chief's plea.
    await go("PyriteTown", 13, 11, "left");
    await expectSay(/trouble/, "the windmill's man");
    await go("PyriteTown", 8, 11, "up");
    await s.walk("up", 1);
    assert.equal((await at()).map, "PyriteTown_Windmill");
    await finish(() => !!Game.player.flags.orreWindmill, "the Chief's plea");
    await s.shot("windmill");
    // The junk gears in town.
    await go("PyriteTown", 3, 10, "up");
    await expectSay(/junk/, "a worn gear");

    // Orre's map from the town's south edge: the Construction Lot (Realgam Tower's spot) is on it now.
    await go("PyriteTown", 17, 28, "down");
    await s.walk("down", 1);
    await orreMap("Construction Lot");
    await settle();
    assert.equal((await at()).map, "RealgamTower_Exterior");
    await s.shot("construction-lot");
    // The guard, a worker, then the gear in the upper-right corner (orreGear 2).
    await go("RealgamTower_Exterior", 19, 25, "up");
    await expectSay(/construction site/, "the Lot's guard");
    await go("RealgamTower_Exterior", 15, 26, "left");
    await expectSay(/trash/, "the worker who saw Silva");
    await go("RealgamTower_Exterior", 31, 23, "right");
    await s.shot("construction-lot-gear");
    await finish(() => Game.player.flags.orreGear === 2, "the gear at the Construction Lot");
    assert.equal(await s.eval(() => Overworld.personPosition("LOCALID_ORRE_GEAR_REAL")), null, "the gear's picked up");

    // Back to Pyrite on Orre's map; the gear goes back in, and Duking asks you to win the challenge (3).
    await go("RealgamTower_Exterior", 19, 34, "down");
    await s.walk("down", 1);
    await orreMap("Pyrite Town");
    await settle();
    assert.equal((await at()).map, "PyriteTown");
    await go("PyriteTown", 8, 11, "up");
    await s.walk("up", 1);
    await finish(() => Game.player.flags.orreGear === 3, "the gear put back");

    // The Colosseum: its story challenge, four of Colosseum's own Trainers, TM06; Nore leads you in (24), you beat him
    // and Duking and Marcia come in (25).
    await go("PyriteTown", 17, 9, "up");
    await s.walk("up", 1);
    assert.equal((await at()).map, "PyriteTown_Colosseum");
    await settle();
    await go("PyriteTown_Colosseum", 6, 6, "up");
    await finish(() => Game.player.flags.orreStory === 25, "the Colosseum's challenge and Nore", 1500);
    let p = await s.player();
    assert.equal(p.flags.orreGear, 4);
    assert.equal(p.bag.tm06, 1, "TM06, the challenge's first prize");
    assert.equal(p.location.map, "PyriteTown_PyriteBuilding_1F");

    // The building's floors: a Trainer on 2F, up the stairs to 3F and 4F; the top floor's scene (26).
    await go("PyriteTown_PyriteBuilding_1F", 14, 2, "up");
    await s.walk("up", 1);
    assert.equal((await at()).map, "PyriteTown_PyriteBuilding_2F");
    await settle();
    await go("PyriteTown_PyriteBuilding_2F", 6, 5, "left");
    await finish(() => (Game.player.flags.orreColo || {}).PyriteTown_PyriteBuilding_2F_EventScript_Colo_GEATS === 0, "Bandana Guy Geats on 2F");
    await go("PyriteTown_PyriteBuilding_2F", 2, 2, "up");
    await s.walk("up", 1);
    assert.equal((await at()).map, "PyriteTown_PyriteBuilding_3F");
    await settle();
    await s.shot("building-3f");
    await go("PyriteTown_PyriteBuilding_3F", 14, 2, "up");
    await s.walk("up", 1);
    assert.equal((await at()).map, "PyriteTown_PyriteBuilding_4F");
    await finish(() => Game.player.flags.orreStory === 26, "the top floor: Reath, Ferma and Miror B.", 1000);
    await s.shot("top-floor-after");

    // Pyrite Cave (its Trainers come out now), then Miror B.'s hideout (27).
    // (Rider Sosh's Shadow Dunsparce: knocked out, not snagged, she battles again next time.)
    await go("PyriteCave", 21, 20, "down");
    await s.press("z", 90);
    await s.page.waitForFunction(() => !document.getElementById("battle")?.classList.contains("hidden") || /Dunsparce|Sosh/.test(document.body.innerText), null, { timeout: 8000 }).catch(() => {});
    await settle(400);
    console.log("ok: browser Orre Pyrite Rider Sosh in the cave");
    await go("PyriteCave", 25, 32, "down");
    await finish(() => (Game.player.flags.orreColo || {}).PyriteCave_EventScript_Colo_SIMES === 0, "St. Performer Simes in the cave");
    // (Its way in: the cave's fallen-in north end, walked down into from the north.)
    await go("PyriteCave", 26, 3, "down");
    await s.walk("down", 2);
    assert.equal((await at()).map, "PyriteCave_MirorBHideout");
    await finish(() => Game.player.flags.orreStory === 27, "Miror B.'s hideout", 1000);
    await s.shot("hideout-after");

    // Back into town: Fateen stops you two and points you north; Agate opens (28).
    // (Arriving anywhere may bring an e-mail first: Sherles's, at 27.)
    await go("PyriteTown_PokemonCenter_1F", 7, 7, "down");
    await settle();
    for (let i = 0; i < 4 && (await at()).map === "PyriteTown_PokemonCenter_1F"; i++) { await s.walk("down", 1); await settle(); }
    await finish(() => Game.player.flags.orreStory === 28, "Fateen sends you to Agate");
    assert((await flags()).orreMap.includes("AgateVillage"), "Agate on Orre's map");
    // Fateen's chamber.
    await go("PyriteTown", 6, 17, "up");
    await s.walk("up", 1);
    assert.equal((await at()).map, "PyriteTown_FortuneHouse");
    await settle();
    // (Sherles's e-mail, due from 27, arrives with this first door after Fateen's scene.)
    assert((((await flags()).orreMail || {}).got || []).includes("MIROR_PEON_NABBED"), "Sherles's e-mail came");
    await go("PyriteTown_FortuneHouse", 4, 4, "right");
    await expectSay(/Fateen/, "Fateen in her chamber");
    await s.shot("fortune-house");

    // The Colosseum's own first tournament, after the story: four Trainers at Lv. 50-55, TM01.
    await go("PyriteTown_Colosseum", 6, 6, "up");
    await finish(() => (Game.player.flags.orreTourney || {}).pyriteRun === 1, "the Colosseum's first tournament", 1500);
    assert.equal((await s.player()).bag.tm01, 1, "TM01, its first prize");

    // Pyrite's other Trainers: Chaser Calda.
    await go("PyriteTown", 12, 26, "down");
    await finish(() => (Game.player.flags.orreColo || {}).PyriteTown_EventScript_Colo_CALDA != null, "Chaser Calda");

    // (Whole pages only: what was being written out letter by letter is in them.)
    const tooWide = await s.eval(() => { const all = [...new Set(window.__tooWide)]; return all.filter((x) => !all.some((y) => y !== x && y.startsWith(x))); });
    assert.deepEqual(tooWide, [], "text too wide for the box");
    assert.deepEqual(errors, []);
    assert.deepEqual([...missing], []);
    await s.eval(() => { const loaded = Player.load(JSON.parse(Player.serialize(Game.player))); if (loaded.player.flags.orreStory !== 28) throw new Error("save failed"); });
    console.log("ok: browser Orre Pyrite chapter, no script errors, missing files or text too wide");
  } catch (error) { await s.shot("failure"); throw error; }
  finally { await s.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
