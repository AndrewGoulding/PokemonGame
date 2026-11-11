// Pokémon XD's last chapters, through real input: Nett, Perr and Makan and the scooter (xdStory 30-32); the S.S.
// Libra's deck, Smarton (33); Team Snagem's ambush, the Snag Machine gone (34); Secc (35), Hordel and his Shadow Togepi
// (36); Gonzap, the Snag Machine back (37); the Key Lair, Gorigan and Greevil (38); the Robo Kyogre (39); Citadark
// Isle's admins, Eldes, Shadow Lugia snagged, Greevil (40, xdClear).
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");
const OUT = process.env.OUT || "/tmp/pk-xd811";
(async () => {
  const s = await T.start((p) => {
    // (Strong at Lv. 22, XD's cap here, with a strong move that lasts: mashing A only ever picks the first.)
    p.party = [Party.create("Mewtwo", 50, { moves: ["Swift", "Psychic", "Recover", "Barrier"], ivs: 31 }),
      Party.create("Alakazam", 50, { moves: ["Shock Wave", "Psychic", "Recover", "Reflect"], ivs: 31 })];
    p.bag = { "snag-machine": 1, "master-ball": 40 };
    Object.assign(p.flags, { starter: "Charmander", orre: 3, orreStory: 44, orreLanded: true, orreLevelCap: 100, xdStory: 29, xdBriefed: true, xdLevelCap: 50,
      xdShadowSnagged: [1, 14, 12], xdChamber: true, xdEagun: true, xdIdCard: true,
      orreMap: ["PhenacCity", "PyriteTown", "AgateVillage", "PokemonHQLab", "GateonPort", "KaminkosHouse", "MtBattle", "CipherLab", "OutskirtStand", "SnagemHideout"] });
  }, { map: "PyriteTown_PyriteBuilding_4F", x: 13, y: 4, facing: "up" }, {
    out: OUT, storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) } });
  const errors = [], missing = new Set(), long = new Set(), said = [];
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  const flags = () => s.eval(() => JSON.parse(JSON.stringify(Game.player.flags)));
  const idle = () => s.eval(() => Overworld.idle());
  const where = async () => (await s.player()).location;
  const go = async (map, x, y, facing) => { await s.eval((to) => Overworld.teleport(to), { map, x, y, facing: facing || "up" }); await s.wait(350); };
  // (Healed, and anything snagged put away in the PC: the party stays the two the battles are mashed through with.)
  const heal = () => s.eval(() => { const P = Game.player; P.party.forEach(Party.heal);
    for (const r of P.party.splice(2)) { const b = P.boxes.find((x) => x.includes(null)); b[b.indexOf(null)] = r; } });
  const box = async () => { const t = await s.eval(() => (document.getElementById("field").classList.contains("hidden") && (document.getElementById("textbox") || {}).innerText) || ""); if (t) said.push(t); for (const l of t.split("\n")) if (l.length > 37) long.add(l); return t; };
  async function finish(predicate, label, limit = 600, arg) {
    for (let i = 0; i < limit; i++) {
      const t = await box();
      await s.press(/nickname/i.test(t) ? "x" : "z", 80);
      if (await s.eval(predicate, arg) && await idle()) { console.log("ok: browser XD " + label); return; }
    }
    await s.shot("xd811-stuck");
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
  // (Onto the door from the tile below it: its scene as you come in.)
  async function walkIn(fromMap, toMap) {
    const w = await s.eval(([a, b]) => World.map(a).warps.find((q) => q.map === b), [fromMap, toMap]);
    assert(w, "a door from " + fromMap + " to " + toMap);
    await go(fromMap, w.x, w.y + 1, "up");
    await s.walk("up", 1);
  }
  // (Out through a door below: stepping down till you're out.)
  async function walkOut(map) {
    for (let i = 0; i < 6 && (await where()).map === map; i++) { await s.page.waitForFunction(() => Overworld.idle()); await s.walk("down", 1); await s.wait(300); }
    assert.notEqual((await where()).map, map, "out of " + map);
  }
  const story = () => s.eval(() => Game.player.flags.xdStory | 0);
  try {
    await s.page.reload(); await s.boot();
    // (In battle: a Master Ball from the Bag at a Shadow Pokémon that's out, else the first move.)
    await s.eval(() => {
      const G = window.GbaMenus, act = G.battleAction, bagOpen = window.BagScreen.open;
      let thrown = -1, ball = false;
      G.battleAction = (c, o) => { const b = BattleScreen._test.battle; if (b && o.name && b.snag && thrown !== b.turn && [].concat(b.sides.p2.actives || b.sides.p2.active).some((m) => m && !m.fainted && b.snaggable(m))) { thrown = b.turn; ball = true; return Promise.resolve({ action: "bag", cursor: 1 }); } return act(c, o); };
      window.BagScreen.open = (o) => (ball ? (ball = false, Promise.resolve({ pocket: "Poké Balls", id: "master-ball" })) : bagOpen(o));
      // (The first move with PP left.)
      const mv = G.battleMoves;
      // (The move with PP left that hits the first foe hardest by type.)
      G.battleMoves = (c, o) => {
        const b = BattleScreen._test.battle, foe = b && [].concat(b.sides.p2.actives || b.sides.p2.active).find((m) => m && !m.fainted);
        const types = foe ? (foe.getTypes ? foe.getTypes() : foe.types) : [];
        const score = (m) => (window.MOVES[m.name] || {}).cat === "Status" ? -1 : types.reduce((n, t) => n * ((window.TYPE_CHART[m.type] || {})[t] ?? 1), 1);
        const ranked = o.moves.map((m, i) => ({ m, i })).filter(({ m }) => m.pp > 0 && !m.disabled).sort((a, z) => score(z.m) - score(a.m));
        return ranked.length ? Promise.resolve({ index: ranked[0].i, cursor: ranked[0].i }) : mv(c, o);
      };
    });
    const at = (n) => () => (Game.player.flags.xdStory | 0) === n;
    const step = async (n, label, limit = 1500) => { await finish(new Function("return (Game.player.flags.xdStory | 0) === " + n), label, limit); };
    // ---- Nett: the desert's sand; Perr; Makan at Kaminko's; the scooter. ----
    await step(30, "Nett: Perr for the scooter");
    await go("GateonPort_PartsShop", 8, 10, "up");
    await finish(() => true, "Perr: Grandpa's out", 300);
    assert(said.some((t) => /desert/.test(t)), "Perr on the desert");
    await go("KaminkosHouse_1F", 7, 4, "up");
    await step(31, "Makan converts the scooter");
    await go("GateonPort_PartsShop", 8, 10, "up");
    await step(32, "Perr: the scooter's done, the S.S. Libra on the map");
    // ---- The S.S. Libra: the deck, Smarton; Team Snagem's ambush. ----
    await heal(); await walkIn("SSLibra", "SSLibra_Deck");
    await step(33, "the S.S. Libra's deck: Smarton beaten");
    await go("SSLibra_Deck", 15, 3, "up"); await s.walk("up", 1);
    await step(34, "Team Snagem's ambush: the Snag Machine taken");
    assert(await s.eval(() => !Game.player.bag["snag-machine"]), "the Snag Machine gone");
    // ---- Secc; Hordel; Gonzap. ----
    await go("PyriteTown_PyriteBuilding_2F", 12, 6, "up");
    await step(35, "Secc: Hordel at the Outskirt Stand");
    await standBy("LOCALID_XD_HORDEL");
    await step(36, "Hordel: his Shadow Togepi, and Team Snagem's hideout");
    assert((await flags()).xdShadowSnagged.includes(81), "Togepi (#81)");
    await heal(); await standBy("LOCALID_XD_GONZAP");
    await step(37, "Gonzap: the Snag Machine back, the Key Lair");
    assert(await s.eval(() => !!Game.player.bag["snag-machine"]), "the Snag Machine back");
    // ---- The Key Lair: Gorigan, Greevil. ----
    await heal(); await go("CipherKeyLair_1F", 18, 4, "up");
    await step(38, "the Key Lair: Gorigan, and Greevil", 2500);
    // ---- The Robo Kyogre; Citadark Isle. ----
    await go("GateonPort_PartsShop", 8, 10, "up");
    await step(39, "the Robo Kyogre, Citadark Isle on the map");
    for (const k of ["LOVRINA2", "SNATTLE2", "GORIGAN2", "ARDOS"]) {
      const map = await s.eval((k) => Orre.XD.TRAINERS[k].map, k);
      await heal(); await go(map, map === "CitadarkIsle" ? 15 : 10, map === "CitadarkIsle" ? 20 : 31, "up"); await standBy("LOCALID_XD_TRAINER_" + k);
      await finish((k) => (Game.player.flags.xdBeaten || []).includes(k), "Citadark: " + k + " beaten", 3000, k);
    }
    await heal(); await go("CitadarkIsle_Fort", 31, 4, "up"); await s.walk("up", 1);
    await finish(() => !!Game.player.flags.xdClear, "the dome: Eldes, Shadow Lugia, Greevil; Cipher's end", 6000);
    assert((await flags()).xdShadowSnagged.includes(73), "Shadow Lugia (#73) snagged");
    assert.equal(await s.eval(() => Player.levelCap(Game.player)) > 50, true, "XD's level cap lifted");
    console.log("ok: browser XD's story finished");
    assert.deepEqual(errors, []);
    assert.deepEqual([...missing], []);
    assert.deepEqual([...long], [], "every line fits the box: " + JSON.stringify([...long]));
  } catch (error) { await s.shot("xd811-failure"); throw error; }
  finally { await s.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
