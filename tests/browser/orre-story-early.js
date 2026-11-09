// Colosseum's story in Orre, from the break with Team Snagem to leaving Phenac City (orreStory 17 to 21 and the
// Mystery Troop), played through the real page: talking to people, walking through doors and off the edge onto
// Orre's map, and battling (mashing A with a strong party). Also: a snag in a story battle (a Master Ball at Trudly's
// Shadow Makuhita), a lost story battle and its retry, Rider Willie in the diner, Phenac's Colosseum Trainers and its
// Pre Gym, and the Mystery Troop by both ways in (talking to one, and being stopped on the way out).
//
//   node tests/browser/orre-story-early.js     (screenshots in /tmp/pokemon-orre-early)
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");

const OUT = "/tmp/pokemon-orre-early";
const OPTIONS = { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) };
// A strong pair (doubles throughout), Orre's cap out of the way.
const strong = () => [Party.create("Mewtwo", 100, { moves: ["Dazzling Gleam", "Psychic"], ivs: 31 }), Party.create("Mew", 100, { moves: ["Dazzling Gleam", "Psychic"], ivs: 31 })];

function baseSave(p, story) {
  p.party = strong();
  p.flags.orre = 3;
  p.flags.orreStory = story;
  p.flags.orreLevelCap = 100;
  p.flags.orreGrunts = 2;
  p.flags.orreMap = ["SnagemHideout", "PhenacCity", "OutskirtStand", "PyriteTown", "AgateVillage"];
  p.bag["snag-machine"] = 1;
  p.bag["master-ball"] = 5;
  p.bag["poke-ball"] = 20;
}

async function session(edit, location, label) {
  const s = await T.start(edit, location, { out: OUT, storage: OPTIONS });
  const errors = [], missing = new Set(), long = [];
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  await s.page.reload();
  await s.boot();
  // Every message page said, to check none overflows the box (37 characters a line, 3 lines a page).
  await s.eval(() => {
    window.__said = [];
    const read = window.Screen.read;
    window.Screen.read = function (t, ...rest) { window.__said.push(String(t)); return read.call(this, t, ...rest); };
  });
  const idle = () => s.eval(() => Overworld.idle());
  const flags = () => s.eval(() => JSON.parse(JSON.stringify(Game.player.flags)));
  async function finish(predicate, what, limit = 500, arg) {
    // (Healed between scenes, as a player would at a Pokémon Center: mashing A only ever picks the first move.)
    await s.eval(() => { if (!document.querySelector("#battle:not(.hidden)")) Game.player.party.forEach(Party.heal); });
    for (let i = 0; i < limit; i++) {
      await s.press("z", 90);
      if (await s.eval(predicate, arg) && await idle()) { console.log("ok: browser Orre (" + label + ") " + what); return; }
    }
    await s.shot(label + "-stuck");
    throw new Error(what + " did not complete: " + JSON.stringify(await s.eval(() => ({ location: Game.player.location, story: Game.player.flags.orreStory,
      mayor: Game.player.flags.orreMayor, text: document.getElementById("textbox").innerText }))));
  }
  async function go(map, x, y, facing) {
    await s.eval((to) => Overworld.teleport(to), { map, x, y, facing: facing || "up" });
    await s.wait(350);
  }
  const where = async () => (await s.player()).location;
  // Stand beside someone, facing them, and press A.
  async function talkTo(localId) {
    const spot = await s.eval((id) => {
      const p = Overworld.personPosition(id), m = World.map(Game.player.location.map);
      if (!p) return null;
      const taken = (x, y) => Overworld.personPosition && m.people.some((q) => { const at = Overworld.personPosition(q.localId); return at && at.x === x && at.y === y; });
      for (const [dx, dy, facing] of [[0, 1, "up"], [0, -1, "down"], [1, 0, "left"], [-1, 0, "right"]]) {
        const x = p.x + dx, y = p.y + dy;
        if (x < 0 || y < 0 || x >= m.width || y >= m.height || m.collision[y * m.width + x] || taken(x, y)) continue;
        return { x, y, facing };
      }
      return null;
    }, localId);
    assert(spot, "somewhere to stand by " + localId);
    const map = (await where()).map;
    await go(map, spot.x, spot.y, spot.facing);
    await s.press("z", 90);
  }
  // Onto Orre's map by walking off the edge, then to a place: the cursor moved toward it, A to go.
  async function travel(edgeX, edgeY, dir, name) {
    const map = (await where()).map;
    await go(map, edgeX, edgeY, dir);
    await s.walk(dir, 1);
    for (let i = 0; i < 40 && !(await s.eval(() => !!document.querySelector(".orre-map"))); i++) await s.wait(100);
    assert(await s.eval(() => !!document.querySelector(".orre-map")), "Orre's map from " + map);
    await s.shot(label + "-orre-map");
    for (let i = 0; i < 30; i++) {
      const at = await s.eval(() => document.querySelector(".orre-map .tm-name b").textContent);
      if (at === name) break;
      // (The game's own rule for where each arrow goes, ui/game.js's orreWorldMap; the arrow that lands nearest.)
      const d = await s.eval(([from, to]) => {
        const places = Orre.openPlaces(Game.player.flags), a = places.find((p) => p.name === from), b = places.find((p) => p.name === to);
        if (!a || !b) return null;
        let pick = null, near = Infinity;
        for (const [key, dir] of [["ArrowUp", [0, -1]], ["ArrowDown", [0, 1]], ["ArrowLeft", [-1, 0]], ["ArrowRight", [1, 0]]]) {
          let best = null, score = Infinity;
          for (const p of places) {
            const dx = p.x - a.x, dy = p.y - a.y, along = dx * dir[0] + dy * dir[1];
            if (p === a || along <= 0) continue;
            const sc = along + 2 * Math.abs(dx * dir[1] + dy * dir[0]);
            if (sc < score) { score = sc; best = p; }
          }
          if (!best) continue;
          const dist = Math.hypot(best.x - b.x, best.y - b.y);
          if (dist < near) { near = dist; pick = key; }
        }
        return pick;
      }, [at, name]);
      assert(d, "a way to " + name + " from " + at);
      await s.press(d);
    }
    assert.equal(await s.eval(() => document.querySelector(".orre-map .tm-name b").textContent), name);
    await s.press("z");
  }
  async function done() {
    const said = await s.eval(() => window.__said);
    for (const t of said) {
      const lines = t.split("\n");
      if (lines.length > 3 || lines.some((l) => l.length > 37)) long.push(t);
    }
    return { errors, missing: [...missing], long, said };
  }
  return Object.assign(s, { finish, go, where, talkTo, travel, flags, idle, done });
}

(async () => {
  const report = { long: new Set(), missing: new Set(), said: 0 };
  const check = async (s) => {
    const r = await s.done();
    assert.deepEqual(r.errors, [], "no script errors");
    r.missing.forEach((m) => report.missing.add(m));
    r.long.forEach((t) => report.long.add(t));
    report.said += r.said.length;
  };

  // ---------- The break with Snagem, the Outskirt Stand, Phenac City and the Mayor's house ----------
  {
    const s = await session((p) => baseSave(p, 17), { map: "SnagemHideout", x: 11, y: 7, facing: "up" }, "main");
    try {
      // The guards at the gate: Gonzap, the big Snag Machine, the hideout blown up.
      await s.talkTo("LOCALID_ORRE_GUARD_1");
      await s.finish(() => (Game.player.flags.orreStory | 0) === 18, "the break with Team Snagem");
      assert.equal((await s.where()).map, "SnagemHideout");
      assert((await s.flags()).orreLevelCap >= 30);
      await s.shot("main-hideout-after");
      // Down the canyon onto Orre's map, to the Outskirt Stand: Folly and Trudly drive off, Willie battles you.
      await s.travel(12, 18, "down", "Outskirt Stand");
      await s.finish(() => (Game.player.flags.orreStory | 0) >= 19, "the Outskirt Stand: Folly and Trudly, Rider Willie");
      let f = await s.flags();
      assert(f.orreStandFT && (f.orreMap || []).includes("PhenacCity"));
      await s.shot("main-stand-after");
      // Willie, in the diner now.
      await s.go("OutskirtStand", 13, 11, "up");
      await s.walk("up", 1);
      await s.wait(400);
      assert.equal((await s.where()).map, "OutskirtStand_Diner");
      await s.talkTo("LOCALID_ORRE_DINER_WILLIE");
      await s.wait(600);
      const dinerText = await s.eval(() => document.getElementById("textbox").innerText);
      assert(/Willie/.test(dinerText), "diner Willie talks: " + dinerText);
      await s.finish(() => true, "Willie in the diner");
      await s.shot("main-diner-willie");
      // Out and off the north edge to Phenac City: Folly by the truck, then Rui in the sack.
      await s.go("OutskirtStand_Diner", 7, 10, "down");
      await s.walk("down", 2);
      await s.wait(400);
      assert.equal((await s.where()).map, "OutskirtStand");
      await s.travel(13, 1, "up", "Phenac City");
      await s.finish(() => !!Game.player.flags.orreFT, "Phenac City: Folly by the truck");
      await s.shot("main-phenac-truck");
      await s.talkTo("LOCALID_ORRE_PHENAC_TRUCK");
      await s.finish(() => (Game.player.flags.orreStory | 0) === 20, "Rui out of the sack");
      assert((await s.flags()).orreRui);
      // The Mayor's house: Es Cade hears Rui out and goes.
      await s.go("PhenacCity", 5, 8, "up");
      await s.walk("up", 1);
      await s.finish(() => (Game.player.flags.orreMayor | 0) === 1, "the Mayor's house: Es Cade");
      await s.shot("main-mayor-first");
      // Out again: no Wakin yet, not till you've been into the Stadium and out (orreStadium).
      await s.go("PhenacCity_MayorsHouse", 5, 7, "down");
      await s.walk("down", 2);
      await s.wait(600);
      assert.equal((await s.where()).map, "PhenacCity");
      for (let i = 0; i < 10; i++) await s.press("z", 90);
      assert.equal((await s.flags()).orreMayor, 1, "no Wakin before the Stadium");
      // The Stadium, first visit.
      await s.go("PhenacCity", 19, 9, "up");
      await s.walk("up", 1);
      await s.wait(500);
      assert.equal((await s.where()).map, "PhenacCity_Stadium");
      await s.finish(() => !!Game.player.flags.orreStadium, "Phenac Stadium's first visit");
      await s.shot("main-stadium");
      // Out of the Stadium: Wakin.
      await s.go("PhenacCity_Stadium", 11, 15, "down");
      await s.walk("down", 2);
      await s.finish(() => (Game.player.flags.orreMayor | 0) === 2, "Team Snagem's Wakin");
      await s.shot("main-after-wakin");
      // Back in, with only a Magikarp: Miror B. leaves, Folly beats you, and you're put out.
      const strongParty = await s.eval(() => JSON.parse(JSON.stringify(Game.player.party)));
      await s.eval(() => { Game.player.party = [Party.create("Magikarp", 5, { moves: ["Splash"] })]; });
      await s.go("PhenacCity", 5, 8, "up");
      await s.walk("up", 1);
      await s.finish(() => Game.player.location.map === "PhenacCity_MayorsHouse" && !!Game.player.flags.orreMayorMirorB && (Game.player.flags.orreMayor | 0) === 2
        && !document.querySelector("#battle:not(.hidden)"), "the Mayor's house: Miror B., and losing to Folly");
      f = await s.flags();
      assert.equal(f.orreStory, 20, "a lost battle keeps you before it");
      assert.equal(f.orreMayor, 2);
      // Again, strong: Folly, then Trudly; his Shadow Makuhita snagged with a Master Ball.
      await s.eval((party) => { Game.player.party = party; }, strongParty);
      await s.go("PhenacCity_MayorsHouse", 5, 7, "down");
      await s.walk("down", 2);
      await s.wait(500);
      await s.go("PhenacCity", 5, 8, "up");
      await s.walk("up", 1);
      // (Through Folly, and Trudly's Duskull and Spinarak, till his Makuhita is out.)
      const makuhitaOut = () => { const b = window.BattleScreen._test.battle; return !!(b && !b.ended && b.sides.p2.active && [].concat(b.sides.p2.actives || b.sides.p2.active).some((m) => m && m.baseSpecies === "Makuhita" && !m.fainted)); };
      for (let i = 0; i < 600 && !(await s.eval(makuhitaOut)); i++) await s.press("z", 90);
      assert(await s.eval(makuhitaOut), "Trudly's Makuhita comes out");
      // Wait for the command menu, then BAG (right of FIGHT), the Poké Balls pocket, the Master Ball, Use.
      const menuUp = () => !!document.querySelector("#battle") && /FIGHT/.test(document.body.innerText);
      for (let i = 0; i < 60 && !(await s.eval(menuUp)); i++) await s.wait(150);
      await s.shot("main-makuhita-out");
      const pockets = await s.eval(() => Bag.BATTLE_POCKETS);
      await s.press("ArrowRight");
      await s.press("z");
      await s.wait(400);
      for (let i = 0; i < pockets.indexOf("Poké Balls"); i++) await s.press("ArrowRight");
      await s.wait(300);
      await s.shot("main-bag-balls");
      // (The pocket's first ball: the Master Ball sorts first.)
      await s.press("z"); await s.wait(300); await s.press("z");
      for (let i = 0; i < 400 && (await s.eval(() => (Game.player.flags.orreStory | 0) !== 21 || !Overworld.idle())); i++) await s.press("z", 90);
      f = await s.flags();
      assert.equal(f.orreStory, 21, "on to Pyrite");
      const party = await s.eval(() => Game.player.party.concat([].concat(...Game.player.boxes).filter(Boolean)).map((r) => ({ species: r.species, shadow: !!r.shadow })));
      const snagged = party.find((r) => r.species === "Makuhita");
      assert(snagged && snagged.shadow, "Makuhita snagged, a Shadow Pokémon: " + JSON.stringify(party.map((r) => r.species)));
      assert((f.orreShadowSnagged || []).includes("Makuhita"));
      console.log("ok: browser Orre (main) Makuhita snagged with a Master Ball in Trudly's battle");
      await s.shot("main-after-trudly");
      // The Mystery Troop by Phenac's way out: talk to Verde.
      await s.go("PhenacCity_MayorsHouse", 5, 7, "down");
      await s.walk("down", 2);
      await s.wait(500);
      await s.shot("main-troop");
      await s.talkTo("LOCALID_ORRE_PHENAC_VERDE");
      await s.finish(() => Game.player.flags.orreTroop === "Verde", "the Mystery Troop: Verde, talked to");
      assert(!(await s.eval(() => Overworld.personPosition("LOCALID_ORRE_PHENAC_ROSSO"))), "the others gone");
      // Now the way out is open: off the south edge and back (B on Orre's map).
      await s.go("PhenacCity", 19, 34, "down");
      await s.walk("down", 1);
      for (let i = 0; i < 30 && !(await s.eval(() => !!document.querySelector(".orre-map"))); i++) await s.wait(100);
      assert(await s.eval(() => !!document.querySelector(".orre-map")), "Orre's map out of Phenac");
      await s.press("x");
      await s.finish(() => Game.player.location.map === "PhenacCity", "back in from Orre's map");
      // Phenac's own Colosseum Trainers: Drig and Kaib.
      for (const id of ["DRIG", "KAIB"]) {
        await s.talkTo("LOCALID_ORRE_COLO_PHENACCITY_" + id);
        await s.finish((id) => (Game.player.flags.orreColo || {})["PhenacCity_EventScript_Colo_" + id] === 0, id + " beaten", 500, id);
      }
      await check(s);
    } catch (error) { await s.shot("main-failure"); throw error; } finally { await s.close(); }
  }

  // ---------- The Mystery Troop the other way: stopped on the way out, by Rosso ----------
  {
    const s = await session((p) => { baseSave(p, 21); p.flags.orreMayor = 3; p.flags.orreStadium = true; }, { map: "PhenacCity", x: 20, y: 31, facing: "down" }, "troop");
    try {
      await s.shot("troop-start");
      // (Lose first, with a Magikarp: Rosso stays, and you're stepped back.)
      const strongParty = await s.eval(() => JSON.parse(JSON.stringify(Game.player.party)));
      await s.eval(() => { Game.player.party = [Party.create("Magikarp", 5, { moves: ["Splash"] })]; });
      await s.go("PhenacCity", 20, 34, "down");
      await s.walk("down", 1);
      await s.finish(() => Overworld.idle() && !document.querySelector("#battle:not(.hidden)") && Game.player.location.y < 35 && !document.querySelector(".orre-map")
        && (window.__said || []).some((t) => /vastly superior/.test(t)), "losing to the Troop on the way out");
      assert(!(await s.flags()).orreTroop);
      await s.eval((party) => { Game.player.party = party; }, strongParty);
      await s.go("PhenacCity", 20, 34, "down");
      await s.walk("down", 1);
      await s.finish(() => Game.player.flags.orreTroop === "Rosso" || !!document.querySelector(".orre-map"), "the Troop's Rosso, on the way out");
      assert.equal((await s.flags()).orreTroop, "Rosso");
      await check(s);
    } catch (error) { await s.shot("troop-failure"); throw error; } finally { await s.close(); }
  }

  // ---------- Rider Willie: lost to at the Stand, beaten in the diner; his later party; on to the Air Strip ----------
  {
    const s = await session((p) => { baseSave(p, 18); p.party = [Party.create("Magikarp", 5, { moves: ["Splash"] })]; }, { map: "SnagemHideout", x: 12, y: 17, facing: "down" }, "willie");
    try {
      await s.travel(12, 18, "down", "Outskirt Stand");
      await s.finish(() => !!Game.player.flags.orreStandFT && Overworld.idle() && !document.querySelector("#battle:not(.hidden)"), "losing to Willie at the Stand");
      assert.equal((await s.flags()).orreStory, 18, "still before Phenac after losing to Willie");
      await s.eval(() => { Game.player.party = [Party.create("Mewtwo", 100, { moves: ["Dazzling Gleam"], ivs: 31 }), Party.create("Mew", 100, { moves: ["Dazzling Gleam"], ivs: 31 })]; });
      await s.go("OutskirtStand", 13, 11, "up");
      await s.walk("up", 1);
      await s.wait(400);
      assert.equal((await s.where()).map, "OutskirtStand_Diner");
      await s.talkTo("LOCALID_ORRE_DINER_WILLIE");
      await s.finish(() => (Game.player.flags.orreStory | 0) === 19, "Willie beaten in the diner");
      assert((await s.flags()).orreMap.includes("PhenacCity"));
      // (Once you've reached Pyrite: his second party.)
      await s.eval(() => { Game.player.flags.orreStory = 22; });
      await s.talkTo("LOCALID_ORRE_DINER_WILLIE");
      await s.finish(() => (Game.player.flags.orreColo || {}).Willie === 0, "Willie's party after Pyrite");
      // Out, and over Orre's map to the Air Strip.
      await s.go("OutskirtStand_Diner", 7, 10, "down");
      await s.walk("down", 2);
      await s.wait(400);
      await s.travel(13, 1, "up", "Orre Air Strip");
      await s.finish(() => Game.player.location.map === "OrreAirStrip", "to the Orre Air Strip");
      await s.shot("willie-airstrip");
      await check(s);
    } catch (error) { await s.shot("willie-failure"); throw error; } finally { await s.close(); }
  }

  // ---------- The Pre Gym: its four, then Justy (four Shadow Pokémon snagged, six Pokémon) ----------
  {
    const s = await session((p) => {
      baseSave(p, 21); p.flags.orreTroop = "Bluno"; p.flags.orreShadowSnagged = ["Makuhita", "Croconaw", "Furret", "Vant"];
      p.party = strong().concat([Party.create("Pikachu", 50), Party.create("Eevee", 50), Party.create("Rattata", 50), Party.create("Pidgey", 50)]);
    }, { map: "PhenacCity", x: 20, y: 22, facing: "up" }, "pregym");
    try {
      await s.walk("up", 1);
      await s.wait(500);
      assert.equal((await s.where()).map, "PhenacCity_PreGym");
      await s.shot("pregym-inside");
      for (const id of ["BOTAN", "LIQUI", "DUGO", "GWIN"]) {
        await s.talkTo("LOCALID_ORRE_COLO_PHENACCITY_PREGYM_" + id);
        await s.finish((id) => (Game.player.flags.orreColo || {})["PhenacCity_PreGym_EventScript_Colo_" + id] === 0, "Pre Gym's " + id, 500, id);
      }
      await s.talkTo("LOCALID_ORRE_JUSTY");
      await s.finish(() => !!(Game.player.flags.orrePreGym || {}).justy, "Pre Gym leader Justy");
      const p = await s.player();
      assert(p.flags.orrePreGym.herb && Object.keys(p.bag).some((k) => /tm27/.test(k)), "the White Herb and TM27");
      await check(s);
    } catch (error) { await s.shot("pregym-failure"); throw error; } finally { await s.close(); }
  }

  if (report.missing.size) console.log("missing files: " + [...report.missing].join(", "));
  if (report.long.size) console.log("message pages over 37 characters a line or 3 lines:\n  " + [...report.long].map((t) => JSON.stringify(t)).join("\n  "));
  console.log("ok: browser Orre, the Snagem break to leaving Phenac (" + report.said + " message pages checked for fit)");
})().catch((error) => { console.error(error); process.exitCode = 1; });
