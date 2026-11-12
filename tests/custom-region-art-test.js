// Rendering smoke checks for custom-region artwork (headless Node).
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const game = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
for (const name of ["alola", "galar", "paldea"]) {
  assert(html.includes('src="ui/' + name + '-art.js"'), name + " artwork is not loaded");
  assert(game.includes(name[0].toUpperCase() + name.slice(1) + "Art.draw(g,map,x,y)"),
    name + " artwork is not called from the overworld");
}
const paints = [];
const ctx = {
  fillRect: (...args) => paints.push(args),
  drawImage: () => {},
  set fillStyle(value) { this.color = value; },
  get fillStyle() { return this.color; }
};
global.window = global;
global.document = {
  createElement: tag => {
    assert.equal(tag, "canvas");
    return { width: 0, height: 0, getContext: () => ctx };
  }
};
const sample = {
  width: 12, height: 12,
  collision: Array(144).fill(0).map((_, i) => i % 12 === 0 ? 1 : 0),
  behavior: Array(144).fill(0),
  warps: [{ x: 6, y: 4, map: "AlolaIkiTown", warp: 0 }],
  region: "alola"
};
global.WORLD_MAPS = { AlolaRoute1: sample, PalletTown: { ...sample, region: "kanto" } };
vm.runInThisContext(fs.readFileSync(path.join(root, "ui/alola-art.js"), "utf8"), {
  filename: "ui/alola-art.js"
});
let draws = 0;
const output = { drawImage: c => {
  draws++;
  assert.equal(c.width, 192);
  assert.equal(c.height, 192);
} };
AlolaArt.draw(output, "AlolaRoute1", 0, 0);
assert(draws === 1 && paints.length > 144, "Alola overlay did not paint tiles");
const painted = paints.length;
AlolaArt.draw(output, "AlolaRoute1", -16, 20);
assert.equal(paints.length, painted, "overlay should cache generated map");
AlolaArt.draw(output, "PalletTown", 0, 0);
assert.equal(draws, 2, "non-Alola regions should not get an Alola overlay");
for (const [name, expected] of [
  ["AlolaLanakilaSlope", "snow"],
  ["AlolaHainaDesert", "desert"],
  ["AlolaWelaVolcano", "volcanic"],
  ["AlolaAetherLab", "facility"],
  ["AlolaRuinsOfLife", "ruins"],
  ["AlolaHauoliBeach", "beach"],
  ["AlolaIkiTown", "village"],
  ["AlolaLushJungle", "tropical"]
]) assert.equal(AlolaArt.style(name), expected, name + " missing regional biome");
for (const name of ["AlolaIkiTown","AlolaHauoliCity","AlolaMalieCity",
  "AlolaAetherLobby","AlolaPoTown","AlolaSeafolkVillage","AlolaLanakilaSummit"]) {
  assert(AlolaArt.LANDMARKS[name], name + " should have a distinguishing landmark");
}
// A landmark tile must never mutate the map's collision or entrance coordinates.
const landmarkFixture = { ...sample, name: "AlolaIkiTown",
  collision: sample.collision.slice(), behavior: sample.behavior.slice(),
  people: [], signs: [], warps: sample.warps.slice() };
landmarkFixture.collision[5 * 12 + 5] = 1;
WORLD_MAPS.AlolaIkiTown = landmarkFixture;
const unchanged = JSON.stringify(landmarkFixture), beforeLandmark = paints.length;
AlolaArt.draw(output, "AlolaIkiTown", 0, 0);
assert(paints.length > beforeLandmark, "landmark tile art was not rendered");
assert.equal(JSON.stringify(landmarkFixture), unchanged, "landmark altered map data");
console.log("Custom region art hooks and Alola rendering: OK");
