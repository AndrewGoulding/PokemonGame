"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const root = path.join(__dirname, "..");
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/<script src="([^"]+)"><\/script>/g)) {
  if (!file.startsWith("ui/") || /^ui\/sinnoh-(story|eterna|galactic|midgame|finale|sidequests|legends|towns|expeditions|daily|gadgets|services|seals|villa|leisure|underground|park|poffins|contests)\.js$/.test(file)) vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
}
function fixture(choice = "Turtwig") {
  let p = Player.create("TEST"); p.location = { map: "SandgemTown_RowansLab", x: 6, y: 4, facing: "up" };
  p.party = [Party.create("Pikachu", 5)];
  let outcome = "won", confirm = true, riding = false;
  const calls = [], messages = [];
  const env = { player: () => p, say: async (text) => { messages.push(...[].concat(text)); }, choose: async () => choice, confirm: async () => confirm,
    onBike: () => riding, mountBike: () => { riding = true; },
    showPicture() {}, hidePicture() {}, canBattle: () => p.party.some(Party.canFight), showWorld() {}, resume: async () => {}, refreshPeople() {}, sfx() {},
    teleport: async (to) => { p.location = to; }, battle: async (kind, opts) => { calls.push({ kind, ...opts }); if (outcome === "won") p.flags[opts.trainerId] = true; return outcome; } };
  const story = SinnohStory.create(env);
  return { get p() { return p; }, story, calls, messages, onBike: () => riding, outcome: (s) => { outcome = s; }, confirm: (s) => { confirm = s; }, reload: () => { p = Player.load(JSON.parse(Player.serialize(p))).player; } };
}
async function main() {
  assert(/^[a-f0-9]{40}$/.test(PLATINUM_DATA.source.commit));
  assert.equal(Object.keys(PLATINUM_DATA.trainers).length, 465);
  for (const [id, t] of Object.entries(PLATINUM_DATA.trainers)) {
    assert(t.party.length > 0, id);
    for (const m of t.party) { assert(DEX[m.species], id); for (const move of m.moves || []) assert(MOVES[move], move); }
    assert(fs.existsSync(path.join(root, "assets/sprites/trainers/front/" + t.pic + ".png")));
  }
  for (const [map, people] of Object.entries(PLATINUM_DATA.additions)) for (const person of people) {
    assert.equal(World.blockAt(map, person.x, person.y).collision, 0, map + " " + person.script + " is on solid terrain");
    assert(fs.existsSync(path.join(root, "assets/world/sprites/" + person.sprite + ".png")));
    assert(["up", "down", "left", "right"].some((d) => World.step({ map, x: person.x, y: person.y }, d, null, person.water ? { surf: true } : undefined).ok), "NPC must have an adjacent tile: " + person.script);
  }
  const entrance = WORLD_MAPS.OreburghCity.warps.find((w) => w.map === "OreburghCity_Gym");
  assert.deepEqual(Object.assign({}, World.warpTarget(entrance), { facing: undefined }), { map: "OreburghCity_Gym", x: 5, y: 24, door: false, facing: undefined });
  assert.equal(World.warpTarget(WORLD_MAPS.OreburghCity_Gym.warps[0]).x, 31);
  assert.equal(World.warpTarget(WORLD_MAPS.OreburghCity_Gym.warps[0]).y, 17);
  assert.equal(World.step({ map: "OreburghCity_Gym", x: 5, y: 23 }, "down").warp, undefined);
  assert.equal(World.step({ map: "OreburghCity_Gym", x: 5, y: 24 }, "down").warp.map, "OreburghCity");
  const sourceTeam = Sinnoh.team("PT_TRAINER_LEADER_ROARK");
  assert.deepEqual(sourceTeam.map((r) => [r.species, r.level]), [["Geodude", 12], ["Onix", 12], ["Cranidos", 14]]);
  assert.deepEqual(sourceTeam[2].moves.map((m) => m.name), ["Headbutt", "Pursuit", "Leer"]);
  let scenarios = 0;
  for (const starter of Sinnoh.starters) {
    const f = fixture(starter), initial = f.p.party.length;
    f.confirm(false);
    await f.story.run("pt:rowan");
    assert(!Sinnoh.state(f.p).starter);
    assert.equal(f.p.party.length, initial);
    f.confirm(true);
    await f.story.run("pt:rowan");
    await f.story.run("pt:rowan");
    assert.equal(f.p.party.length, initial + 1, "starter is given once");
    assert.equal(Sinnoh.state(f.p).starter, starter);
    assert(f.messages.some((text) => text.includes("I'm sure " + starter)));
    assert(!f.messages.some((text) => text.includes("about to step into the tall grass")), "arrival dialogue must not invent a Route 201 opening");
    assert(Sinnoh.state(f.p).dex);
    await f.story.run("pt:aide"); await f.story.run("pt:aide");
    assert.equal(Player.itemCount(f.p, "poke-ball"), 5);
    f.p.location = { map: "Route203", x: 6, y: 20, facing: "right" };
    assert.equal(f.story.step().trigger.script, "pt:barry203");
    f.outcome("lost"); await f.story.run("pt:barry203");
    assert(!Sinnoh.state(f.p).rival203);
    assert.equal(f.story.visible({ script: "pt:barry203" }), true);
    await f.story.run("pt:mine-roark");
    assert(!Sinnoh.state(f.p).roarkFound, "rival victory precedes Roark's return");
    f.outcome("won"); await f.story.run("pt:barry203");
    assert(Sinnoh.state(f.p).rival203);
    const rival = f.calls.at(-1).foe.team;
    assert.equal(rival[1].species, { Turtwig: "Chimchar", Chimchar: "Piplup", Piplup: "Turtwig" }[starter]);
    assert.equal(f.story.visible({ script: "pt:barry203" }), false);
    await f.story.run("pt:mine-roark");
    assert(Sinnoh.state(f.p).roarkFound);
    assert.equal(f.story.visible({ script: "pt:gym-door" }), false);
    f.p.location = { map: "OreburghCity_Gym", x: 5, y: 4, facing: "up" };
    // Kanto badges must neither raise Sinnoh's cap nor unlock its Rock Smash.
    f.p.badges.push(...Player.REGION_BADGES.kanto);
    assert.equal(Player.levelCap(f.p), 14);
    const mon = Party.create("Geodude", 10, { moves: ["Rock Smash"] });
    assert.equal(FieldMoves.check(f.p, mon, "Rock Smash"), "badge");
    f.outcome("lost"); await f.story.run("pt:roark");
    assert(!f.p.badges.includes("coal")); assert(!Sinnoh.state(f.p).roarkTM);
    f.outcome("won"); await f.story.run("pt:roark");
    assert(f.p.badges.includes("coal")); assert(Sinnoh.state(f.p).roarkTM);
    assert.equal(Player.levelCap(f.p), 22);
    assert.equal(FieldMoves.check(f.p, mon, "Rock Smash"), null);
    const bag = JSON.stringify(f.p.bag), battles = f.calls.length;
    f.reload();
    await f.story.run("pt:roark"); await f.story.run("pt:rowan");
    assert.equal(f.calls.length, battles);
    assert.equal(JSON.stringify(f.p.bag), bag);
    assert.equal(f.p.badges.filter((b) => b === "coal").length, 1);
    assert.equal(f.p.party.length, initial + 1);
    scenarios++;
  }
  // Platinum's next chapter: source parties, gates, retries, one-time rewards
  // and saved clock stages. Each starter gets the corresponding Dawn team.
  for (const starter of Sinnoh.starters) {
    const f = fixture(starter), s = Sinnoh.state(f.p);
    Object.assign(s, { starter, dex: true, balls: true, roarkFound: true });
    f.p.badges.push("coal");
    f.p.location = { map: "Route204", x: 23, y: 53 };
    assert.equal(f.story.step().trigger.script, "pt:jubilife-galactic");
    f.outcome("lost"); await f.story.run("pt:jubilife-galactic");
    assert(!s.jubilifeGalactic);
    f.outcome("won"); await f.story.run("pt:jubilife-galactic");
    assert(s.jubilifeGalactic);
    assert.deepEqual(f.calls.at(-1).partner.team.map(r => r.species), Sinnoh.team("PT_TRAINER_DAWN_JUBILIFE_CITY_" + starter.toUpperCase()).map(r => r.species));
    assert.equal(f.calls.at(-1).foe2.team.length, 1);
    const battles = f.calls.length; await f.story.run("pt:jubilife-galactic"); assert.equal(f.calls.length, battles);
    f.p.location = { map: "ValleyWindworks", x: 19, y: 15 };
    assert.deepEqual(Sinnoh.patches("ValleyWindworks", f.p).filter(k=>!k.startsWith("honey")), ["locked"]);
    await f.story.run("pt:wind-door"); assert(!s.worksOpen);
    f.outcome("lost"); await f.story.run("pt:wind-guard"); assert(!s.windGuard);
    f.outcome("won"); await f.story.run("pt:wind-guard"); assert(s.windGuard);
    // Losing the second meadow battle preserves the first victory on retry.
    f.outcome("lost"); await f.story.run("pt:meadow-grunts"); assert(!s.worksKey);
    f.p.flags.PT_TRAINER_GALACTIC_GRUNT_FLOAROMA_MEADOW_1 = true;
    f.outcome("won"); const before = f.calls.length; await f.story.run("pt:meadow-grunts");
    assert.equal(f.calls.length, before + 1); assert(s.worksKey);
    assert.equal(Player.itemCount(f.p, "works-key"), 1); assert.equal(Player.itemCount(f.p, "honey"), 10);
    await f.story.run("pt:meadow-grunts"); assert.equal(Player.itemCount(f.p, "honey"), 10);
    await f.story.run("pt:wind-door"); assert(s.worksOpen); assert.deepEqual(Sinnoh.patches("ValleyWindworks", f.p).filter(k=>!k.startsWith("honey")), []);
    f.p.location = { map: "ValleyWindworks_Building", x: 19, y: 7 };
    f.outcome("lost"); await f.story.run("pt:mars"); assert(!s.mars);
    f.outcome("won"); await f.story.run("pt:mars"); assert(s.mars);
    assert.equal(f.calls.at(-1).foe.team[1].item, "oran-berry");
    assert.equal(f.story.visible({ script: "pt:mars" }), false);
    f.p.location = { map: "EternaForest_2", x: 28, y: 82 };
    await f.story.run("pt:cheryl"); assert(s.cherylJoined);
    const partner = Sinnoh.forestPartner(f.p); assert.equal(partner.team[0].species, "Chansey");
    const options = { foe: { name: "Wild", team: [Party.create("Budew", 12)] } };
    const tag = Sinnoh.forestBattle(f.p, "wild", options, () => Party.create("Buneary", 12));
    assert(tag.wildDouble); assert.equal(tag.foe.team.length, 2); assert.equal(options.foe.team.length, 1);
    assert.equal(tag.partner.name, "Cheryl"); assert.deepEqual(tag.chosen, [0]);
    f.p.location = { map: "Route205EternaSide", x: 4, y: 20 };
    assert.equal(Sinnoh.forestPartner(f.p), null);
    assert.equal(f.story.step().trigger.script, "pt:cheryl-exit");
    await f.story.run("pt:cheryl-exit"); await f.story.run("pt:cheryl-exit");
    assert.equal(Player.itemCount(f.p, "soothe-bell"), 1);
    f.p.location = { map: "EternaCity", x: 26, y: 35 };
    await f.story.run("pt:cynthia-cut"); await f.story.run("pt:cynthia-cut");
    assert.equal(Player.itemCount(f.p, FieldMoves.hmFor("Cut")), 1);
    const cutter = Party.create("Turtwig", 20, { moves: ["Cut"] });
    assert.equal(FieldMoves.check(f.p, cutter, "Cut"), "badge");
    f.p.location = { map: "EternaCity_Gym", x: 11, y: 18 };
    await f.story.run("pt:gardenia"); assert(!f.p.badges.includes("forest"));
    await f.story.run("pt:clock-2"); assert(!s.gardeniaClock);
    for (let n = 0; n < 3; n++) {
      assert.deepEqual(Sinnoh.patches("EternaCity_Gym", f.p), ["clock" + n]);
      f.outcome("lost"); await f.story.run("pt:clock-" + n); assert.equal(s.gardeniaClock | 0, n);
      f.outcome("won"); await f.story.run("pt:clock-" + n); assert.equal(s.gardeniaClock, n + 1);
      assert.deepEqual(f.p.location, { map: "EternaCity_Gym", x: 11, y: 18, facing: "up" });
    }
    f.reload(); assert.equal(Sinnoh.state(f.p).gardeniaClock, 3);
    f.outcome("lost"); await f.story.run("pt:gardenia"); assert(!f.p.badges.includes("forest"));
    f.outcome("won"); await f.story.run("pt:gardenia"); assert(f.p.badges.includes("forest"));
    assert.equal(Player.levelCap(f.p), 26); assert.equal(FieldMoves.check(f.p, cutter, "Cut"), null);
    assert.equal(f.calls.at(-1).foe.team[2].item, "sitrus-berry");
    const bag = JSON.stringify(f.p.bag), won = f.calls.length;
    f.reload(); await f.story.run("pt:gardenia"); await f.story.run("pt:cynthia-cut");
    assert.equal(f.calls.length, won); assert.equal(JSON.stringify(f.p.bag), bag);
    assert.equal(f.p.badges.filter(b => b === "forest").length, 1);
  }
  // Every clock stage connects entrance, hub and its active Trainer; the exit
  // stays reachable. Doors use reciprocal indices rather than guessed IDs.
  {
    const m = WORLD_MAPS.EternaCity_Gym, original = m.collision.slice();
    const targets = [[14, 22], [20, 17], [2, 7], [11, 3]];
    for (let stage = 0; stage < 4; stage++) {
      m.collision = original.slice();
      for (const [x, y, c] of m.patches["clock" + stage].collision) m.collision[y * m.width + x] = c;
      const q = [[11, 26]], seen = new Set(["11,26"]);
      for (let i = 0; i < q.length; i++) for (const d of ["up", "down", "left", "right"]) {
        const r = World.step({ map: m.name, x: q[i][0], y: q[i][1] }, d), key = r.x + "," + r.y;
        if (r.ok && r.map === m.name && !seen.has(key)) { seen.add(key); q.push([r.x, r.y]); }
      }
      assert(seen.has(targets[stage].join(",")), "clock route " + stage); assert(seen.has("11,18"));
    }
    m.collision = original;
    for (const d of PLATINUM_DATA.doors) {
      const w = WORLD_MAPS[d.outside].warps.find(w => w.map === d.inside);
      assert.equal(World.warpTarget(w).map, d.inside);
      assert.deepEqual([World.warpTarget(WORLD_MAPS[d.inside].warps[d.insideWarp || 0]).x, World.warpTarget(WORLD_MAPS[d.inside].warps[d.insideWarp || 0]).y], [d.x, d.y]);
    }
    assert.deepEqual(Sinnoh.team("PT_TRAINER_LEADER_GARDENIA").map(r => [r.species, r.level]), [["Turtwig", 20], ["Cherrim", 20], ["Roserade", 22]]);
  }
  // Eterna rescue: old bicycles do not skip Jupiter, losses preserve the
  // captive, and the shop, Egg and aide rewards are each given once.
  {
    const f = fixture(), s = Sinnoh.state(f.p);
    Object.assign(s, { starter: "Turtwig", dex: true, balls: true, cutHM: true, mars: true });
    f.p.location = { map: "EternaGalactic_4F", x: 14, y: 7 };
    await f.story.run("pt:jupiter"); assert.equal(f.calls.length, 0);
    assert.equal(f.story.step().trigger.script, "pt:galactic-stop");
    f.p.badges.push("coal", "forest"); Player.addItem(f.p, "bicycle");
    f.p.location = { map: "CyclingRoadNorth_Gate", x: 9, y: 10 };
    assert.equal(Sinnoh.cyclingAllowed(f.p), false, "an earlier region's bike does not bypass the rescue");
    assert.equal(f.story.step().trigger.script, "pt:cycle-stop");
    await f.story.run("pt:cycle-stop"); assert.equal(f.p.location.map, "EternaCity");
    f.p.location = { map: "EternaGalactic_4F", x: 14, y: 7 };
    f.outcome("lost"); await f.story.run("pt:jupiter"); assert(!s.jupiter);
    assert.equal(f.story.visible({ script: "pt:rad-rickshaw-captive" }), true);
    f.outcome("won"); await f.story.run("pt:jupiter"); assert(s.jupiter);
    assert.deepEqual(f.calls.at(-1).foe.team.map(r => [r.species, r.level]), [["Zubat", 21], ["Skuntank", 23]]);
    assert.equal(f.calls.at(-1).foe.team[1].item, "sitrus-berry");
    assert.equal(f.story.visible({ script: "pt:jupiter" }), false);
    assert.equal(f.story.visible({ script: "pt:rad-rickshaw-captive" }), false);
    assert.equal(f.story.visible({ script: "pt:rad-rickshaw" }), true);
    assert.equal(f.story.visible({ trainer: { id: "PT_TRAINER_SCIENTIST_TRAVON" } }), false);
    const fought = f.calls.length; await f.story.run("pt:jupiter"); assert.equal(f.calls.length, fought);
    f.p.location = { map: "EternaCity_2", x: 7, y: 6 };
    await f.story.run("pt:rad-rickshaw"); await f.story.run("pt:rad-rickshaw");
    assert(s.bicycle); assert.equal(Player.itemCount(f.p, "bicycle"), 1);
    f.p.location = { map: "CyclingRoad", x: 20, y: 10 };
    assert(Sinnoh.cyclingAllowed(f.p)); assert.equal(f.story.step().trigger.script, "pt:cycle-mount");
    await f.story.run("pt:cycle-mount"); assert(f.onBike()); assert.equal(f.story.step(), null);
    assert(!Sinnoh.cyclingRequired({ map: "Route206", x: 20, y: 40 }));
    assert(!Sinnoh.cyclingRequired({ map: "CyclingRoadSouth_Gate", x: 9, y: 12 }));
    f.p.location = { map: "EternaCity", x: 26, y: 35 };
    const caught = f.p.pokedex.caught.slice();
    f.confirm(false); await f.story.run("pt:cynthia-cut"); assert(!s.togepiEgg);
    f.confirm(true); const original = f.p.party.slice(); f.p.party = Array(6).fill(original[0]);
    await f.story.run("pt:cynthia-cut"); assert(!s.togepiEgg, "full party must leave Egg available");
    f.p.party = original; await f.story.run("pt:cynthia-cut"); assert(s.togepiEgg);
    assert.equal(f.p.party.at(-1).species, "Togepi"); assert(f.p.party.at(-1).egg);
    assert.equal(f.p.party.at(-1).met.from, "Cynthia"); assert.deepEqual(f.p.pokedex.caught, caught);
    const size = f.p.party.length; f.reload(); await f.story.run("pt:cynthia-cut"); assert.equal(f.p.party.length, size);
    assert.equal(f.p.party.filter(r => r.egg && r.species === "Togepi").length, 1);
    f.p.location = { map: "CyclingRoadNorth_Gate", x: 12, y: 8 };
    await f.story.run("pt:sinnoh-exp-share"); assert(!Sinnoh.state(f.p).cyclingExpShare);
    f.p.pokedex.seen = Object.keys(DEX).slice(0, 35);
    await f.story.run("pt:sinnoh-exp-share"); await f.story.run("pt:sinnoh-exp-share");
    assert(Sinnoh.state(f.p).cyclingExpShare); assert.equal(Player.itemCount(f.p, "exp-share"), 1);
  }
  {
    const f = fixture(); Object.assign(Sinnoh.state(f.p), { jupiter: true });
    await f.story.run("pt:rad-rickshaw"); assert.equal(Player.itemCount(f.p, "bicycle"), 1);
    assert.equal(WORLD_MAPS.EternaCity.warps[0].map, "EternaCity_2", "legacy shop door index is preserved");
    for (const name of ["EternaGalactic_1F", "EternaGalactic_2F", "EternaGalactic_3F", "EternaGalactic_4F"]) {
      const m = WORLD_MAPS[name];
      for (const w of m.warps) {
        const to = World.warpTarget(w); assert(to && WORLD_MAPS[to.map]);
        const back = WORLD_MAPS[w.map].warps[w.warp];
        assert.equal(back.map, name, name + " reciprocal stair");
        assert.equal(World.blockAt(to.map, to.x, to.y).collision, 0);
      }
      const q = [[m.warps[0].x, m.warps[0].y]], seen = new Set([q[0].join(",")]);
      for (let i = 0; i < q.length; i++) for (const dir of ["up", "down", "left", "right"]) {
        const r = World.step({ map: name, x: q[i][0], y: q[i][1] }, dir), key = r.x + "," + r.y;
        if (r.ok && r.map === name && !seen.has(key)) { seen.add(key); q.push([r.x, r.y]); }
      }
      for (const p of [...m.people, ...m.warps]) assert([[0,1],[1,0],[0,-1],[-1,0]].some(([dx,dy]) => seen.has((p.x+dx) + "," + (p.y+dy))), name + " actor/stair access");
    }
    assert.equal(Object.values(PLATINUM_DATA.additions).flat().filter(p => (p.flag || "").startsWith("PT_ITEM_VisibleItems_TeamGalacticEterna")).length, 5);
  }
  // A full party and PC must not consume the one-time starter choice or mark it caught.
  {
    const f = fixture(), mon = f.p.party[0];
    f.p.party = Array(6).fill(mon);
    f.p.boxes = Array.from({ length: 30 }, () => Array(30).fill(mon));
    const caught = f.p.pokedex.caught.slice();
    await f.story.run("pt:rowan");
    assert(!Sinnoh.state(f.p).starter);
    assert.deepEqual(f.p.pokedex.caught, caught);
  }
  // Existing saves with no Sinnoh state are initialized lazily, without resetting other regions.
  const old = fixture(); old.p.flags.gameClear = true;
  old.p.location = { map: "Route202", x: 27, y: 28 };
  assert.equal(old.story.step().trigger.script, "pt:rowan-stop");
  await old.story.run("pt:rowan-stop");
  assert.equal(old.p.location.map, "SandgemTown"); assert(old.p.flags.gameClear);
  // Imported partner parties also run through the real doubles engine.
  for (const partner of ["PT_TRAINER_DAWN_JUBILIFE_CITY_TURTWIG", "PT_TRAINER_CHERYL_ETERNA_FOREST"]) {
    const b = new Battle({ seed: 22, format: "doubles",
      p1: { team: [{ species: "Charizard", level: 22, moves: ["Flamethrower"] }], partner: { name: "Partner", team: Sinnoh.team(partner).map(Party.toBattleSet) } },
      p2: { team: Sinnoh.team("PT_TRAINER_GALACTIC_GRUNT_JUBILIFE_CITY_1").map(Party.toBattleSet),
        partner: { name: "Grunt", team: Sinnoh.team("PT_TRAINER_GALACTIC_GRUNT_JUBILIFE_CITY_2").map(Party.toBattleSet) } } });
    b.start();
    for (let turn = 0; !b.ended && turn < 300; turn++) for (const side of ["p1", "p2", "p1b", "p2b"]) {
      const request = b.getRequest(side);
      if (!request || request.phase === "wait") continue;
      const choice = OpponentAI.choose(b, side); if (choice) assert(b.choose(side, choice).ok);
    }
    assert(b.ended, "imported partner battle terminates: " + partner);
  }
  // Battle simulation uses the imported moves, with the same engine as the UI.
  const b = new Battle({ seed: 9, p1: { team: [{ species: "Turtwig", level: 14, moves: ["Razor Leaf"] }] },
    p2: { team: Sinnoh.team("PT_TRAINER_LEADER_ROARK").map((r) => Party.toBattleSet(r)) } });
  b.start();
  for (let turn = 0; !b.ended && turn < 100; turn++) for (const id of ["p1", "p2"]) {
    const request = b.getRequest(id);
    if (!request || request.phase === "wait") continue;
    const choice = OpponentAI.choose(b, id);
    if (choice) assert(b.choose(id, choice).ok);
  }
  assert(b.ended, "imported Roark battle must terminate");
  console.log("ok: Platinum imports, map overlays, three starter paths, retries, rewards, save reload, regional caps, Roark, Galactic/Windworks progression, Cheryl partner, clock stages, Gardenia, Jupiter/Cycle Shop rescue, Cynthia Egg and Cycling Road");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
