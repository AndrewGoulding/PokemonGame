"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const root = path.join(__dirname, "..");
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/<script src="([^"]+)"><\/script>/g)) {
  if (!file.startsWith("ui/") || file === "ui/sinnoh-story.js") vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
}
function fixture(choice = "Turtwig") {
  let p = Player.create("TEST"); p.location = { map: "SandgemTown_RowansLab", x: 6, y: 4, facing: "up" };
  p.party = [Party.create("Pikachu", 5)];
  let outcome = "won", confirm = true;
  const calls = [], messages = [];
  const env = { player: () => p, say: async (text) => { messages.push(...[].concat(text)); }, choose: async () => choice, confirm: async () => confirm,
    showPicture() {}, hidePicture() {}, canBattle: () => p.party.some(Party.canFight), showWorld() {}, resume: async () => {}, refreshPeople() {}, sfx() {},
    teleport: async (to) => { p.location = to; }, battle: async (kind, opts) => { calls.push({ kind, ...opts }); if (outcome === "won") p.flags[opts.trainerId] = true; return outcome; } };
  const story = SinnohStory.create(env);
  return { get p() { return p; }, story, calls, messages, outcome: (s) => { outcome = s; }, confirm: (s) => { confirm = s; }, reload: () => { p = Player.load(JSON.parse(Player.serialize(p))).player; } };
}
async function main() {
  assert(/^[a-f0-9]{40}$/.test(PLATINUM_DATA.source.commit));
  assert.equal(Object.keys(PLATINUM_DATA.trainers).length, 18);
  for (const [id, t] of Object.entries(PLATINUM_DATA.trainers)) {
    assert(t.party.length > 0, id);
    for (const m of t.party) { assert(DEX[m.species], id); for (const move of m.moves || []) assert(MOVES[move], move); }
    assert(fs.existsSync(path.join(root, "assets/sprites/trainers/front/" + t.pic + ".png")));
  }
  for (const [map, people] of Object.entries(PLATINUM_DATA.additions)) for (const person of people) {
    assert.equal(World.blockAt(map, person.x, person.y).collision, 0, map + " " + person.script + " is on solid terrain");
    assert(fs.existsSync(path.join(root, "assets/world/sprites/" + person.sprite + ".png")));
    assert(["up", "down", "left", "right"].some((d) => World.step({ map, x: person.x, y: person.y }, d).ok), "NPC must have an adjacent tile: " + person.script);
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
  console.log("ok: Platinum imports, map overlays, three starter paths, retries, rewards, save reload, regional caps and Roark battle");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
