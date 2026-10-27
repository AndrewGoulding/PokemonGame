// Browser-test helper (Playwright): serves the game, loads a save built in
// Node, and drives it with held keys (quick taps don't register).
//
//   const T = require("./lib");
//   const s = await T.start(save => { ...edit the Player record... }, { map, x, y, facing });
//   await s.press("z"); await s.shot("name"); await s.close();
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const http = require("http");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");

const root = path.join(__dirname, "../..");
let loaded = false;
function loadHeadless() {
  if (loaded) return;
  loaded = true;
  global.window = global;
  const store = {};
  global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const [, src] of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
    if (src.startsWith("ui/")) continue;
    vm.runInThisContext(fs.readFileSync(path.join(root, src), "utf8"), { filename: src });
  }
}

// A save: a fresh Player with some badges, a party and the given location.
function makeSave(edit, location) {
  loadHeadless();
  const p = Player.create("RED", 0);
  p.flags.pokedex = true;
  p.flags.gotStarter = true;
  p.party = [Party.create("Charizard", 50)];
  p.race = "hylian";   // (delete it for the character creator on CONTINUE)
  p.appearance = { body: "link", face: "link_face", hairstyle: "link_hair", hair: "own", outfit: "own", trim: "own", skin: "own" };
  if (location) p.location = Object.assign({ facing: "down" }, location);
  if (edit) edit(p);
  return Player.serialize(p);
}

const TYPES = { ".js": "text/javascript", ".html": "text/html", ".css": "text/css", ".png": "image/png", ".wav": "audio/wav", ".json": "application/json", ".ttf": "font/ttf", ".woff2": "font/woff2" };
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html"));
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(0, () => resolve(server));
  });
}

// opts: out (the screenshots' folder), save (a save's text to load instead of
// making one), storage ({ key: text } more for localStorage, as the Option
// screen's), init (a function run in the page before its scripts).
async function start(edit, location, opts) {
  opts = opts || {};
  const save = opts.save || makeSave(edit, location);
  const server = await serve();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const page = await browser.newPage({ viewport: { width: 960, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.stack || e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const seed = Object.assign({ "pokemon-game-save": save }, opts.storage || {});
  await page.addInitScript((seed) => { if (!sessionStorage.getItem("seeded")) { for (const k in seed) localStorage.setItem(k, seed[k]); sessionStorage.setItem("seeded", "1"); } }, seed);
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto("http://localhost:" + server.address().port + "/index.html");
  const outDir = opts.out || path.join(root, "tests/browser/out");
  fs.mkdirSync(outDir, { recursive: true });
  const s = {
    page, errors,
    async press(key, hold) { await page.keyboard.down(key); await page.waitForTimeout(hold || 120); await page.keyboard.up(key); await page.waitForTimeout(80); },
    async presses(key, n, gap) { for (let i = 0; i < n; i++) { await s.press(key); await page.waitForTimeout(gap || 150); } },
    async walk(dir, steps) { const key = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }[dir]; await s.press(key, 260 * steps - 100); await page.waitForTimeout(250); },
    wait: (ms) => page.waitForTimeout(ms),
    async shot(name) { await page.screenshot({ path: path.join(outDir, name + ".png") }); },
    text: () => page.evaluate(() => document.body.innerText),
    player: () => page.evaluate(() => JSON.parse(JSON.stringify(window.Game.player))),
    eval: (fn, arg) => page.evaluate(fn, arg),
    // Through the intro and title to CONTINUE.
    async boot() {
      await page.waitForTimeout(1500);
      const inWorld = () => page.evaluate(() => { const w = document.getElementById("world"); return !!w && !w.classList.contains("hidden") && !!(window.Game && window.Game.player); });
      for (let i = 0; i < 12 && !(await inWorld()); i++) { await s.press(i < 2 ? "Enter" : "z"); await page.waitForTimeout(700); }
      await page.waitForTimeout(1200);
    },
    async close() { await browser.close(); server.close(); }
  };
  return s;
}

module.exports = { start, makeSave, loadHeadless };
