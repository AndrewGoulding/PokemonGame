// Pokémon XD's Agate villagers and its fourth and fifth chapters, through real input: two of Agate's villagers
// (Clerr, Belish), battled once; Mt. Battle's reception (xdStory 16), Vander and his trainee Bardo, and Vander's word of
// Cipher's lab (17); the Cipher Lab: the Hexagon Brothers counting off (18), Resix and his Shadow Houndour snagged;
// Cabol by the chest, the ID Card; B2's door, Krane, Lovrina and Naps, Naps's battle, Krane with you (19); Lovrina
// in B1, her Shadow Delcatty snagged, the Data ROM (20); Krane home at the HQ Lab.
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");
const OUT = process.env.OUT || "/tmp/pk-xd45";
(async () => {
  const s = await T.start((p) => {
    // (Strong at Lv. 22, XD's cap here, with a strong move that lasts: mashing A only ever picks the first.)
    p.party = [Party.create("Mewtwo", 22, { moves: ["Swift", "Psychic", "Recover", "Barrier"], ivs: 31 }),
      Party.create("Alakazam", 22, { moves: ["Shock Wave", "Psychic", "Recover", "Reflect"], ivs: 31 })];
    p.bag = { "snag-machine": 1, "master-ball": 20 };
    Object.assign(p.flags, { starter: "Charmander", orre: 3, orreStory: 44, orreLanded: true, orreLevelCap: 100, xdStory: 15, xdBriefed: true, xdLevelCap: 22,
      xdShadowSnagged: [1], xdChamber: true, xdEagun: true,
      orreMap: ["PhenacCity", "PyriteTown", "AgateVillage", "PokemonHQLab", "GateonPort", "KaminkosHouse", "MtBattle"] });
  }, { map: "AgateVillage", x: 24, y: 9, facing: "up" }, {
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
    await s.shot("xd45-stuck");
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
    // ---- Agate's villagers: Clerr and Belish. ----
    for (const k of ["CLERR", "BELISH"]) {
      await heal(); await standBy("LOCALID_XD_VILLAGER_" + k);
      await finish((k) => (Game.player.flags.xdBeaten || []).includes(k), "Agate's " + k + " battled", 500, k);
    }
    // ---- Mt. Battle: reception, then Vander and Bardo. ----
    await heal(); await go("MtBattle_PokemonCenter_1F", 3, 5, "up");
    await finish(() => (Game.player.flags.xdStory | 0) === 16, "Mt. Battle's reception: Vander's inside");
    await go("MtBattle", 13, 24, "up");
    await finish(() => (Game.player.flags.xdStory | 0) === 17, "Vander, his trainee's battle, the Cipher Lab", 700);
    assert(await s.eval(() => Orre.openPlaces(Game.player.flags).some((p) => p.map === "CipherLab")), "the Cipher Lab on Orre's map");
    // ---- The Cipher Lab: out of its door, the Hexagon Brothers count off. ----
    await heal(); await go("CipherLab_1F", 9, 11, "down");
    await s.walk("down", 2);
    await finish(() => (Game.player.flags.xdStory | 0) === 18, "the Hexagon Brothers count off");
    await s.shot("xd45-hexagon");
    await standBy("LOCALID_XD_TRAINER_RESIX");
    await finish(() => (Game.player.flags.xdBeaten || []).includes("RESIX"), "Resix, his Shadow Houndour snagged", 700);
    assert((await flags()).xdShadowSnagged.includes(14), "Houndour (#14) snagged");
    // ---- B1: Cabol by the chest; the ID Card. ----
    await heal(); await go("CipherLab_B1", 1, 8, "left");
    await finish(() => (Game.player.flags.xdBeaten || []).includes("CABOL"), "Cabol by the chest", 2000);
    await go("CipherLab_B1", 1, 8, "left");
    await finish(() => !!Game.player.flags.xdIdCard, "the ID Card");
    // ---- B2: Krane, Lovrina, Naps; Naps's battle; Krane with you. ----
    await heal(); await go("CipherLab_B1", 2, 2, "up");
    await s.walk("up", 1);
    await finish(() => (Game.player.flags.xdStory | 0) === 19, "B2: Lovrina, Krane and Naps; Naps beaten; Krane with you", 2000);
    // ---- Back up to B1: Lovrina. ----
    await heal(); await go("CipherLab_B2", 17, 2, "up");
    await s.walk("up", 1);
    await finish(() => (Game.player.flags.xdStory | 0) === 20, "B1: Lovrina, her Shadow Delcatty snagged, the Data ROM", 2000);
    assert((await flags()).xdShadowSnagged.includes(12), "Delcatty (#12) snagged");
    assert(said.some((t) => /Data ROM/.test(t)), "the Data ROM to Krane");
    await go("PokemonHQLab_2F", 4, 4, "up");
    assert(await s.eval(() => !!Overworld.personPosition("LOCALID_XD_KRANE_HOME")), "Krane home at the HQ Lab");
    console.log("ok: browser XD Krane home at the HQ Lab");
    assert.deepEqual(errors, []);
    assert.deepEqual([...missing], []);
    assert.deepEqual([...long], [], "every line fits the box: " + JSON.stringify([...long]));
  } catch (error) { await s.shot("xd45-failure"); throw error; }
  finally { await s.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
