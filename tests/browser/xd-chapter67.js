// Pokémon XD's sixth and seventh chapters, through real input: Datan and the Data ROM at the HQ Lab (xdStory 21); ONBS
// in Pyrite: Secc (22), Nett (23); out and back in, Cipher's raid (24), its Peons' Shadow Pokémon snagged, Exol on the
// top floor (25); Phenac: the Mayor's letter and Ezin (26), the fake Justy (27), the Justy Gang counting off, an
// impostor's Shadow Pokémon snagged, Snattle in the Stadium and the Elevator Key (28), the Pre Gym's basement, the Mayor
// and Justy (29).
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");
const OUT = process.env.OUT || "/tmp/pk-xd67";
(async () => {
  const s = await T.start((p) => {
    // (Strong at Lv. 22, XD's cap here, with a strong move that lasts: mashing A only ever picks the first.)
    p.party = [Party.create("Mewtwo", 40, { moves: ["Swift", "Psychic", "Recover", "Barrier"], ivs: 31 }),
      Party.create("Alakazam", 40, { moves: ["Shock Wave", "Psychic", "Recover", "Reflect"], ivs: 31 })];
    p.bag = { "snag-machine": 1, "master-ball": 20 };
    Object.assign(p.flags, { starter: "Charmander", orre: 3, orreStory: 44, orreLanded: true, orreLevelCap: 100, xdStory: 20, xdBriefed: true, xdLevelCap: 40,
      xdShadowSnagged: [1, 14, 12], xdChamber: true, xdEagun: true, xdIdCard: true,
      orreMap: ["PhenacCity", "PyriteTown", "AgateVillage", "PokemonHQLab", "GateonPort", "KaminkosHouse", "MtBattle", "CipherLab"] });
  }, { map: "PokemonHQLab", x: 13, y: 12, facing: "up" }, {
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
      // (Choosing a Pokémon to send in, one already out or fainted: down the list to the next.)
      if (/already in battle|no energy left/i.test(t)) { await s.press("down", 80); await s.press("z", 80); continue; }
      await s.press(/nickname/i.test(t) ? "x" : "z", 80);
      if (await s.eval(predicate, arg) && await idle()) { console.log("ok: browser XD " + label); return; }
    }
    await s.shot("xd67-stuck");
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
  // (Anything open, the save reminder among them, answered with B till you're free to walk.)
  async function settle() { for (let i = 0; i < 40 && !(await idle()); i++) await s.press("x", 120); }
  // (Onto the door from the tile below it: its scene as you come in.)
  async function walkIn(fromMap, toMap) {
    const w = await s.eval(([a, b]) => World.map(a).warps.find((q) => q.map === b), [fromMap, toMap]);
    assert(w, "a door from " + fromMap + " to " + toMap);
    await go(fromMap, w.x, w.y + 1, "up");
    for (let i = 0; i < 4 && (await where()).map === fromMap; i++) { await settle(); await s.walk("up", 1); await s.wait(300); }
  }
  // (Out through a door below: stepping down till you're out.)
  async function walkOut(map) {
    for (let i = 0; i < 6 && (await where()).map === map; i++) { await settle(); await s.walk("down", 1); await s.wait(300); }
    assert.notEqual((await where()).map, map, "out of " + map);
  }
  const story = () => s.eval(() => Game.player.flags.xdStory | 0);
  try {
    await s.page.reload(); await s.boot();
    // (In battle: a Master Ball from the Bag at a Shadow Pokémon that's out, else the first move.)
    await s.eval(() => {
      const G = window.GbaMenus, act = G.battleAction, bagOpen = window.BagScreen.open;
      let thrown = -1, ball = false;
      G.battleAction = (c, o) => { const b = BattleScreen._test.battle; if (b && o.name && b.snag && thrown !== b.turn && [].concat(b.sides.p2.actives || b.sides.p2.active).some((m) => m && !m.fainted && b.snaggable(m))) { thrown = b.turn; ball = true; return Promise.resolve({ action: "bag", cursor: 1 }); } return b && o.name ? Promise.resolve({ action: "fight", cursor: 0 }) : act(c, o); };
      // (Sending one in after a faint: the first that can still battle and isn't out already.)
      const partyOpen = window.PartyMenu.open;
      window.PartyMenu.open = (o) => {
        const b = BattleScreen._test.battle;
        if (b && !o.canCancel && o.mons) {
          const out = [].concat(b.sides.p1.actives || b.sides.p1.active).filter((m) => m && !m.fainted).map((m) => m.name);
          const slot = o.mons.findIndex((m) => m.hp > 0 && !out.includes(m.name));
          if (slot >= 0) return Promise.resolve({ slot, cursor: slot, action: "shift" });
        }
        return partyOpen(o);
      };
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
    // ---- The HQ Lab: Datan, Krane, the Data ROM. ----
    await standBy("LOCALID_XD_DATAN");
    await finish(() => (Game.player.flags.xdStory | 0) === 21, "Datan and Krane: the Data ROM for ONBS");
    assert(await s.eval(() => !!Game.player.bag["data-rom"]), "the Data ROM");
    // ---- ONBS: Secc, then Nett. ----
    await go("PyriteTown_PyriteBuilding_2F", 12, 6, "up");
    await finish(() => (Game.player.flags.xdStory | 0) === 22, "Secc sends you up to Nett");
    await go("PyriteTown_PyriteBuilding_4F", 13, 4, "up");
    await finish(() => (Game.player.flags.xdStory | 0) === 23, "Nett has the Data ROM");
    assert(await s.eval(() => !Game.player.bag["data-rom"]), "the Data ROM given");
    // ---- The Rock Poké Spot: Duking, his Poké Snacks on the plate. ----
    await go("RockPokeSpot", 8, 11, "up"); await standBy("LOCALID_XD_DUKING");
    await finish(() => !!Game.player.flags.xdDuking, "Duking's Poké Snacks, the other Poké Spots", 400);
    await go("RockPokeSpot", 8, 6, "up");
    await finish(() => !!(Game.player.flags.xdSpots || {}).RockPokeSpot, "Poké Snacks on the plate", 200);
    assert(await s.eval(() => Orre.openPlaces(Game.player.flags).some((p) => p.map === "CavePokeSpot")), "the Cave Poké Spot on Orre's map");
    // ---- Out, and back in: Cipher's raid. ----
    await go("PyriteTown_PyriteBuilding_1F", 5, 7, "down");
    await walkOut("PyriteTown_PyriteBuilding_1F");
    assert.equal((await where()).map, "PyriteTown");
    await walkIn("PyriteTown", "PyriteTown_PyriteBuilding_1F");
    await finish(() => (Game.player.flags.xdStory | 0) === 24, "Cipher's raid on ONBS");
    for (const k of ["MESIN", "TORKIN", "LOBAR", "FELDAS"]) {
      const map = await s.eval((k) => Orre.XD.TRAINERS[k].map, k);
      await heal(); await go(map, 9, 6, "up"); await standBy("LOCALID_XD_TRAINER_" + k);
      await finish((k) => (Game.player.flags.xdBeaten || []).includes(k), "ONBS: " + k + " beaten, the Shadow Pokémon snagged", 1500, k);
    }
    for (const id of [2, 15, 16, 17]) assert((await flags()).xdShadowSnagged.includes(id), "Shadow Pokémon #" + id + " snagged");
    await heal(); await go("PyriteTown_PyriteBuilding_3F", 14, 2, "up");
    await s.walk("up", 1);
    await finish(() => (Game.player.flags.xdStory | 0) === 25, "Exol on the top floor; Nett: Phenac", 2000);
    // (Mawile can be knocked out before a ball's thrown: it's Exol's to battle again only if he isn't beaten.)
    if (!(await flags()).xdShadowSnagged.includes(18)) console.log("(Exol's Mawile knocked out, not snagged)");
    // ---- Phenac: the Mayor's letter, Ezin. ----
    await heal(); await go("PhenacCity_MayorsHouse", 16, 3, "up");
    await finish(() => (Game.player.flags.xdStory | 0) === 26, "the Mayor's letter; Ezin", 1500);
    // ---- Back to Secc with the Mayor's letter. ----
    await go("PyriteTown_PyriteBuilding_2F", 12, 6, "up");
    await finish(() => !!Game.player.flags.xdNote, "the Mayor's letter shown to Secc", 300);
    // ---- The fake Justy. ----
    await heal(); await go("PhenacCity_PreGym", 7, 5, "up");
    await finish(() => (Game.player.flags.xdStory | 0) === 27, "the fake Justy beaten", 1500);
    await go("PhenacCity_PreGym", 7, 10, "down");
    await walkOut("PhenacCity_PreGym");
    await finish(() => !!Game.player.flags.xdJustyGang, "the Justy Gang counts off");
    await s.shot("xd67-gang");
    await heal(); await standBy("LOCALID_XD_TRAINER_EXINN");
    await finish(() => (Game.player.flags.xdBeaten || []).includes("EXINN"), "an impostor: Exinn, his Shadow Snorunt snagged", 1500);
    assert((await flags()).xdShadowSnagged.includes(19), "Snorunt (#19) snagged");
    // ---- The Stadium: Egrog, Snattle, the Elevator Key. ----
    await heal(); await walkIn("PhenacCity", "PhenacCity_Stadium");
    await finish(() => (Game.player.flags.xdStory | 0) === 28, "the Stadium: Egrog and Snattle beaten, the Elevator Key", 3000);
    assert(said.some((t) => /Marcia/.test(t)), "Marcia's thanks");
    // ---- The Pre Gym's basement: the Mayor, Justy. ----
    await go("PhenacCity_Stadium", 11, 15, "down");
    await walkOut("PhenacCity_Stadium");
    await walkIn("PhenacCity", "PhenacCity_PreGym");
    await finish(() => (Game.player.flags.xdStory | 0) === 29, "the Pre Gym's basement: the Mayor and Justy free", 800);
    await go("PhenacCity_MayorsHouse", 4, 4, "up");
    assert(await s.eval(() => !!Overworld.personPosition("LOCALID_XD_TREST_HOME")), "the Mayor home");
    console.log("ok: browser XD Phenac's free");
    assert.deepEqual(errors, []);
    assert.deepEqual([...missing], []);
    assert.deepEqual([...long], [], "every line fits the box: " + JSON.stringify([...long]));
  } catch (error) { await s.shot("xd67-failure"); throw error; }
  finally { await s.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
