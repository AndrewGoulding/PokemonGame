// Exercise progression with real game data and records; presentation and battle
// outcomes are controlled so reward and retry behavior can be checked directly.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const [, file] of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
  if (!file.startsWith("ui/") || /^ui\/(kanto-|story-events)/.test(file)) {
    vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
  }
}
global.Screen = { say() {} };
global.Overworld = {
  resume: async () => {}, act: async () => {}, addObject() {}, removeObject() {}, refreshPeople() {},
  removePerson() {}, fadeToBlack: async () => {}, fadeFromBlack: async () => {},
  position: () => ({ map: "PalletTown_ProfessorOaksLab", x: 6, y: 4, facing: "up" })
};
function fixture(outcome = "won") {
  const player = Player.create("TEST");
  player.party = [Party.create("Charizard", 50)];
  const calls = [];
  const env = {
    player, say: async () => {}, sayWithJingle: async () => {}, music() {}, sfx() {}, show() {},
    T: (label) => WORLD_TEXT[label] || [label], M: (label) => WORLD_MOVEMENTS[label] || [],
    canBattle: () => true, hasBadge: (id) => player.badges.includes(id),
    trainerTeam: (id) => WORLD_TRAINERS[id].party.map((r) => Party.create(r.species, r.level)),
    battle: async (kind, opts) => { calls.push({ kind, ...opts }); if (outcome === "won" && opts.trainerId) player.flags[opts.trainerId] = true; return outcome; },
    itemJingle: () => "mus_obtain_tmhm", tmText: (text) => text, machineFor: () => "tm01",
    swappedTeam: (id) => env.trainerTeam(id), kogaTeam: () => [Party.create("Weezing", 40)],
    sabrinaAlakazite: async () => false, giovanniKangaskhanite: async () => false, applyPatches() {},
    LAB_OAK: "oak", LAB_RIVAL: "rival", LAB_RIVAL_NAME: "Leaf", fill: (text) => text,
    sleep: async () => {}, confirm: async () => true, cry() {}
  };
  return { env, player, calls };
}
async function main() {
  let scenarios = 0;
  const leaders = [
    ["brock", "boulder", "gotTM39"], ["misty", "cascade", "gotTM03"],
    ["ltSurge", "thunder", "gotTM34"], ["erika", "rainbow", "gotTM19"],
    ["sabrina", "marsh", "gotTM04"], ["koga", "soul", "gotTM06FromKoga"],
    ["blaine", "volcano", "gotTM38FromBlaine"], ["giovanniGym", "earth", "gotTM26FromGiovanni"]
  ];
  for (const [method, badge, reward] of leaders) {
    for (const outcome of ["won", "lost"]) {
      const f = fixture(outcome), scenes = KantoGyms.create(f.env);
      const person = { trainer: { intro: ["Battle?"], defeat: ["Well done!"] } };
      await scenes[method](person);
      assert.equal(f.calls.length, 1, method);
      assert.equal(f.player.badges.includes(badge), outcome === "won", method + " badge");
      assert.equal(!!f.player.flags[reward], outcome === "won", method + " reward");
      if (outcome === "won") {
        const bag = JSON.stringify(f.player.bag);
        await scenes[method](person);
        assert.equal(f.calls.length, 1, "already beaten leader must not battle again");
        assert.equal(JSON.stringify(f.player.bag), bag, "repeat interaction must not duplicate the TM");
        assert.equal(f.player.badges.filter((b) => b === badge).length, 1);
      }
      scenarios++;
    }
  }
  // Oak's parcel scene must consume the parcel and grant exactly five Balls.
  {
    const f = fixture();
    Player.addItem(f.player, "oaks-parcel");
    const balls = Player.itemCount(f.player, "poke-ball");
    await KantoTowns.create(f.env).pokedexScene();
    assert.equal(Player.itemCount(f.player, "oaks-parcel"), 0);
    assert.equal(Player.itemCount(f.player, "poke-ball"), balls + 5);
    assert(f.player.flags.pokedex && f.player.flags.parcelDelivered);
    scenarios++;
  }
  // Snorlax remains asleep without the flute or if the prompt is declined.
  for (const choice of ["no-flute", "decline", "accept"]) {
    const f = fixture("caught");
    f.player.flags.gotPokeFlute = choice !== "no-flute";
    f.env.confirm = async () => choice === "accept";
    await KantoField.create(f.env).snorlax({}, 12);
    assert.equal(f.calls.length, choice === "accept" ? 1 : 0);
    assert.equal(!!f.player.flags.wokeRoute12Snorlax, choice === "accept");
    scenarios++;
  }
  // Reject a missing badge, then advance the same guard after earning it.
  {
    const f = fixture();
    f.env.ROUTE23_BADGES = ["Boulder"];
    f.env.route23Scene = () => f.player.flags.route23Scene || 0;
    const scenes = KantoLeague.create(f.env);
    await scenes.badgeGuard(1, true, "guard");
    assert.equal(f.player.flags.route23Scene || 0, 0);
    f.player.badges.push("boulder");
    await scenes.badgeGuard(1, true, "guard");
    assert.equal(f.player.flags.route23Scene, 1);
    scenarios++;
  }
  // Celio exchanges the Ruby and Tri-Pass for access to all seven islands.
  {
    const f = fixture();
    f.env.CELIO = "celio";
    Player.addItem(f.player, "ruby");
    Player.addItem(f.player, "tri-pass");
    const scenes = KantoSevii.create(f.env);
    await scenes.celioRuby();
    assert.equal(Player.itemCount(f.player, "ruby"), 0);
    assert.equal(Player.itemCount(f.player, "tri-pass"), 0);
    assert.equal(Player.itemCount(f.player, "rainbow-pass"), 1);
    assert.equal(f.player.flags.celioScene, 5);
    assert(f.player.flags.celioRubyIn && f.player.flags.seviiMap4567);
    await scenes.giveOldSeaMap();
    await scenes.giveOldSeaMap();
    assert.equal(Player.itemCount(f.player, "old-sea-map"), 1, "the map is a one-time reward");
    scenarios++;
  }
  console.log("ok: Kanto modules, all eight Gym rewards/retries, Oak's parcel, Snorlax, badge guards and Sevii progression (" + scenarios + " scenarios)");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
