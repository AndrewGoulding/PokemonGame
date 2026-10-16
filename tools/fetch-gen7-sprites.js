// Downloads the Generation 7 Pokémon's sprites from PokeAPI's sprite
// repository (github.com/PokeAPI/sprites), the same 96x96 pictures the game's
// other Pokémon use: front, back, shiny and shiny back, into
// assets/sprites/pokemon/[back/][shiny/]<id>.png.
//
//   node tools/fetch-gen7-sprites.js <PokeAPI csv folder>   (after tools/build-gen7.js,
//                                                            which leaves gen7-sprites.json there)
//
// A sprite PokeAPI hasn't got for a form falls back to its base form's.
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const dir = process.argv[2];
const list = JSON.parse(fs.readFileSync(path.join(dir || "", "gen7-sprites.json"), "utf8"));
const out = path.join(__dirname, "..", "assets/sprites/pokemon");
const BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";

function get(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) { res.resume(); resolve(null); return; }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", () => resolve(null));
  });
}

(async () => {
  let fetched = 0, missing = [];
  for (const [id, name] of Object.entries(list)) {
    for (const sub of ["", "back/", "shiny/", "back/shiny/"]) {
      const file = path.join(out, sub, id + ".png");
      if (fs.existsSync(file)) continue;
      let buf = await get(BASE + sub + name + ".png");
      if (!buf && /-/.test(name)) buf = await get(BASE + sub + name.split("-")[0] + ".png");
      if (!buf) { missing.push(sub + name); continue; }
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, buf);
      fetched++;
    }
  }
  console.log("fetched " + fetched + " sprites" + (missing.length ? "; none for " + missing.join(", ") : ""));
})();
