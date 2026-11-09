// Focused story regressions; stub presentation and battles to exercise each
// scene's progression rules without waiting for dialogue and animations.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function fixture(outcome = "won") {
  let player = { flags: { starter: "Bulbasaur", pokedex: true }, badges: [], rival: "Gary",
    location: { map: "ViridianCity", x: 20, y: 4, facing: "up" } };
  const calls = { battles: [], removed: [], follower: [], messages: [], movements: [] };
  let canBattle = true, canDouble = true;
  const sandbox = {
    window: { WORLD_SPRITES: {}, WORLD_MAPS: {}, RandomTeam: { levelUpMoves: () => ["Tackle"] } },
    Party: { create: (species, level, options) => ({ species, level, ...options }) },
    Screen: { say() {} },
    Overworld: {
      position: () => player.location,
      addObject() {}, removeObject: (id) => calls.removed.push(id),
      act: async (tracks) => calls.movements.push(tracks), resume: async () => {},
      follower: { hide: (hidden) => calls.follower.push(hidden) }
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../ui/kanto-story.js"), "utf8"), sandbox);
  const scenes = sandbox.window.KantoStory.create({
    get player() { return player; },
    music() {}, sfx() {}, show() {}, say: async (text) => calls.messages.push(text),
    T: (label) => [label], M: (label) => [label],
    battle: async (kind, options) => { calls.battles.push({ kind, ...options }); return outcome; },
    canBattle: () => canBattle, canDouble: () => canDouble,
    hasBadge: (id) => player.badges.includes(id),
    trainerTeam: () => [{ species: "Pidgeotto", level: 18, ivs: { hp: 9 } }, { species: "Squirtle", level: 20, ivs: { hp: 9 } }],
    STARTER_BALLS: { a: { species: "Bulbasaur" }, b: { species: "Squirtle" }, c: { species: "Charmander" } },
    RIVAL_PICK: { Bulbasaur: "Squirtle" }
  });
  return { scenes, calls, get player() { return player; }, replacePlayer: (next) => { player = next; },
    setCanBattle: (value) => { canBattle = value; }, setCanDouble: (value) => { canDouble = value; } };
}

async function main() {
  let checks = 0;
  const early = fixture();
  assert.equal(early.scenes.viridianStopStep().type, "viridian-stop");
  early.player.flags.route22Rival = true;
  assert.equal(early.scenes.viridianStopStep(), null);
  early.replacePlayer({ ...early.player, flags: { pokedex: true }, badges: ["boulder"] });
  assert.equal(early.scenes.viridianStopStep(), null);
  checks += 3;

  const triggers = [
    ["redForestStep", { map: "ViridianForest", x: 4, y: 12, facing: "up" }, "redForest", "red-forest"],
    ["jessieJamesStep", { map: "MtMoon_B2F", x: 3, y: 7, facing: "down" }, "jessieJames", "jessie-james"],
    ["laterJessieJamesStep", { map: "RocketHideout_B4F", x: 16, y: 19, facing: "up" }, "jessieJamesHideout", "jessie-james-later"],
    ["laterJessieJamesStep", { map: "PokemonTower_7F", x: 10, y: 12, facing: "up" }, "jessieJamesTower", "jessie-james-later"],
    ["laterJessieJamesStep", { map: "SilphCo_11F", x: 2, y: 6, facing: "down" }, "jessieJamesSilph", "jessie-james-later"]
  ];
  for (const [method, location, flag, type] of triggers) {
    const f = fixture();
    f.player.location = location;
    assert.equal(f.scenes[method]().type, type);
    f.setCanBattle(false);
    assert.equal(f.scenes[method](), null);
    f.setCanBattle(true);
    f.player.flags[flag] = true;
    assert.equal(f.scenes[method](), null);
    f.replacePlayer({ ...f.player, flags: { starter: "Bulbasaur" } });
    assert.equal(f.scenes[method]().type, type, "must read the newly loaded player's flags");
    f.player.location = { ...location, map: "PalletTown" };
    assert.equal(f.scenes[method](), null);
    checks += 5;
  }

  const encounters = [
    ["route22Rival", "Top", "route22Rival", null, ["Pidgey", "Eevee"]],
    ["redForest", undefined, "redForest", triggers[0][1], ["Charmander", "Pikachu"]],
    ["jessieJames", undefined, "jessieJames", triggers[1][1], ["Ekans", "Meowth", "Koffing"]],
    ["laterJessieJames", undefined, "jessieJamesHideout", triggers[2][1], ["Koffing", "Meowth", "Ekans"]],
    ["laterJessieJames", undefined, "jessieJamesTower", triggers[3][1], ["Meowth", "Arbok", "Weezing"]],
    ["laterJessieJames", undefined, "jessieJamesSilph", triggers[4][1], ["Weezing", "Arbok", "Meowth"]],
    ["ceruleanRival", "Right", "ceruleanRival", null, ["Pidgeotto", "Eevee"]],
    ["towerRival", true, "towerRival", null, ["Pidgeotto", "Umbreon"]]
  ];
  for (const [method, argument, flag, location, species] of encounters) {
    for (const outcome of ["won", "lost"]) {
      const f = fixture(outcome);
      if (location) f.player.location = location;
      await f.scenes[method](argument);
      assert.equal(f.calls.battles.length, 1);
      assert.equal(!!f.player.flags[flag], outcome === "won", method + ": losing must permit a retry");
      assert.deepEqual(Array.from(f.calls.battles[0].foe.team, (r) => r.species), species);
      if (outcome === "won") assert(f.calls.removed.length > 0, method + ": remove departing NPCs");
      if (method === "laterJessieJames") assert.equal(f.calls.follower.at(-1), false);
      if (method === "route22Rival") assert.equal(f.calls.battles[0].noBlackout, true);
      checks++;
    }
  }
  const solo = fixture();
  solo.setCanDouble(false);
  await solo.scenes.jessieJames();
  assert.equal(solo.calls.battles[0].double, false, "one usable Pokémon must get a single battle");
  checks++;
  console.log("ok: Kanto story triggers, live saves, encounter teams and win/loss progression (" + checks + " scenarios)");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
