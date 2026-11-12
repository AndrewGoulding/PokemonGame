// Every battle in Orre with a Shadow Pokémon in it, through the game's own scenes and Trainers, each Shadow Pokémon
// snagged: all 48 of Colosseum's, in its story's order (so Fein's Togetic, which waits till the other 47 are snagged,
// comes last). Each battle is reached as a player would: stood by its Trainer and A pressed, or walked into the room
// whose scene starts it, with the story's flags at that point. In battle a driver picks for you: a Master Ball from the
// Bag at a Shadow Pokémon out on the field (one a turn; your other Pokémon Protects meanwhile), and otherwise the move
// that hits the foe hardest by type. After each, the snagged Pokémon must be in your party or boxes, a Shadow Pokémon
// with its heart shut tight.
//   (ONLY=Trudly,Cail: just those scenarios, the earlier snags filled in.)
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");
const OUT = process.env.OUT || "/tmp/pk-snag";
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
// (FROM=Skrub: that scenario and every one after it.)
const FROM = process.env.FROM || null;

// Scenarios in story order: who (for ONLY), the species to snag, the flags to set first, and how it starts:
// talk (a person's local id, stood beside), at (stand here and press A), or walk (stand here and step: a room's scene).
const S = (who, species, flags, how) => Object.assign({ who, species, flags }, how);
const STORY = (n, more) => Object.assign({ orreStory: n }, more || {});
const SCENARIOS = [
  // Phenac City: Trudly in the Mayor's house (Folly first); the Mystery Troop by the way out, one at a time.
  S("Trudly", ["Makuhita"], STORY(20, { orreMayor: 2, orreStadium: true, orreMayorMirorB: true }), { walk: ["PhenacCity", 5, 8, "up"] }),
  S("Verde", ["Bayleef"], STORY(21, { orreMayor: 3, orreStadium: true, orreTroop: null }), { map: "PhenacCity", talk: "LOCALID_ORRE_PHENAC_VERDE" }),
  S("Rosso", ["Quilava"], STORY(21, { orreMayor: 3, orreStadium: true, orreTroop: null }), { map: "PhenacCity", talk: "LOCALID_ORRE_PHENAC_ROSSO" }),
  S("Bluno", ["Croconaw"], STORY(21, { orreMayor: 3, orreStadium: true, orreTroop: null }), { map: "PhenacCity", talk: "LOCALID_ORRE_PHENAC_BLUNO" }),
  // Pyrite Town: Cail by the way in, then the town's Shadow Pokémon Trainers.
  S("Cail", ["Furret"], STORY(22, { orreTroop: "Verde" }), { at: ["PyriteTown", 14, 26, "down"] }),
  ...[["Vant", "Misdreavus"], ["Nover", "Noctowl"], ["Diogo", "Flaaffy"], ["Leba", "Skiploom"], ["Divel", "Quagsire"], ["Lon", "Slugma"]]
    .map(([who, sp]) => S(who, [sp], STORY(23), { map: "PyriteTown", talk: "LOCALID_ORRE_SHADOW_" + who.toUpperCase() })),
  // The Pyrite Building: Nore on 1F, Reath and Ferma on the top floor.
  S("Nore", ["Yanma"], STORY(24, { orreGear: 4 }), { at: ["PyriteTown_PyriteBuilding_1F", 14, 3, "up"] }),
  S("Reath", ["Remoraid", "Mantine"], STORY(25, { orreGear: 4 }), { walk: ["PyriteTown_PyriteBuilding_3F", 14, 2, "up"] }),
  // Doken in town, Pyrite Cave's three, and Miror B. in his hideout.
  S("Doken", ["Qwilfish"], STORY(27), { map: "PyriteTown", talk: "LOCALID_ORRE_SHADOW_DOKEN" }),
  ...[["Twan", "Meditite"], ["Sosh", "Dunsparce"], ["Zalo", "Swablu"]]
    .map(([who, sp]) => S(who, [sp], STORY(26), { map: "PyriteCave", talk: "LOCALID_ORRE_SHADOW_" + who.toUpperCase() })),
  S("Miror B.", ["Sudowoodo"], STORY(26), { walk: ["PyriteCave", 26, 3, "down", 2] }),
  // Agate: Skrub at the Relic Stone. Mt. Battle: Dakim at the summit.
  S("Skrub", ["Hitmontop"], STORY(29), { at: ["RelicForest", 11, 9, "up"] }),
  S("Dakim", ["Entei"], STORY(32), { at: ["MtBattle", 17, 6, "up"] }),
  // The Under: Kloak by the studio, Venus in it, the Under Subway's four.
  S("Kloak", ["Ledian"], STORY(34, { orreKidsGrid: 3 }), { at: ["TheUnder", 6, 23, "up"] }),
  S("Venus", ["Suicune"], STORY(35), { walk: ["TheUnder", 6, 22, "up"] }),
  ...[["Frena", "Gligar"], ["Liaks", "Stantler"], ["Lonia", "Piloswine"], ["Nelis", "Sneasel"]]
    .map(([who, sp]) => S(who, [sp], STORY(36), { map: "TheUnder_Subway_B2", talk: "LOCALID_ORRE_SHADOW_" + who.toUpperCase() })),
  // The Shadow Pokémon Lab: its six Peons, then Ein.
  ...[["Vana", "Forretress", "ShadowLab_B1F"], ["Cole", "Aipom", "ShadowLab_B1F_Rooms"], ["Remil", "Vibrava", "ShadowLab_B1F_Rooms"],
    ["Tanie", "Granbull", "ShadowLab_B2F_Rooms2"], ["Lesar", "Ariados", "ShadowLab_B2F_Rooms"], ["Lare", "Murkrow", "ShadowLab_Cells"]]
    .map(([who, sp, map]) => S(who, [sp], STORY(38), { map, talk: "LOCALID_ORRE_SHADOW_" + who.toUpperCase() })),
  S("Ein", ["Raikou"], STORY(38), { walk: ["ShadowLab_DNARoom", 6, 2, "up"] }),
  // Realgam Tower: Gonzap, the domes' three Peons, the Colosseum's four rounds and Nascour, Evice at the top.
  S("Gonzap", ["Skarmory"], STORY(41), { at: ["RealgamTower_Dome", 6, 4, "up"] }),
  ...[["Arton", "Delibird"], ["Baila", "Sunflora"], ["Dioge", "Heracross"]]
    .map(([who, sp]) => S(who, [sp], STORY(42), { map: "RealgamTower_Dome", talk: "LOCALID_ORRE_SHADOW_" + who.toUpperCase() })),
  S("Nascour", ["Miltank", "Absol", "Houndoom", "Tropius", "Metagross"],
    STORY(42, { orreRealgamAdmins: ["Miror B.", "Dakim", "Venus", "Ein"], orreRealgamRound: 0 }), { at: ["RealgamTower_Colosseum", 6, 4, "up"] }),
  S("Evice", ["Tyranitar"], STORY(43), { walk: ["RealgamTower_Colosseum", 6, 3, "up"] }),
  // After the game: Biden and Agrev in the rebuilt Snagem Hideout, Deep King Agnol in the Deep Colosseum's fifth
  // round, and Fein at the Outskirt Stand once the other 47 are snagged.
  ...[["Biden", "Smeargle"], ["Agrev", "Ursaring"]]
    .map(([who, sp]) => S(who, [sp], STORY(44), { map: "SnagemHideout", talk: "LOCALID_ORRE_SHADOW_" + who.toUpperCase() })),
  S("Agnol", ["Shuckle"], STORY(44, { orreTourney: { deep: 4 }, orreUnderDoor: true }), { at: ["TheUnder_DeepColosseum", 7, 8, "up"] }),
  S("Fein", ["Togetic"], STORY(44), { map: "OutskirtStand", talk: "LOCALID_ORRE_SHADOW_FEIN" })
];

const strong = () => [
  Party.create("Mewtwo", 100, { moves: ["Psychic", "Aura Sphere", "Ice Beam", "Protect"], ivs: 31 }),
  Party.create("Rayquaza", 100, { moves: ["Dragon Claw", "Thunderbolt", "Flamethrower", "Protect"], ivs: 31 })];

(async () => {
  const s = await T.start((p) => {
    p.party = strong();
    p.bag = { "master-ball": 99, "snag-machine": 1 };
    Object.assign(p.flags, { orre: 3, orreStory: 20, orreRui: true, orreLevelCap: 100, orreGrunts: 2,
      orreMap: ["SnagemHideout", "OutskirtStand", "PhenacCity", "PyriteTown", "AgateVillage", "MtBattle", "TheUnder", "ShadowLab_1F", "RealgamTower_1F"] });
  }, { map: "PhenacCity", x: 12, y: 16, facing: "up" }, {
    out: OUT, storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) } });
  const errors = [], missing = new Set();
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  const idle = () => s.eval(() => Overworld.idle());
  const inBattle = () => s.eval(() => !document.getElementById("field").classList.contains("hidden"));
  const go = async (map, x, y, facing) => { await s.eval((to) => Overworld.teleport(to), { map, x, y, facing: facing || "up" }); await s.wait(350); };
  try {
    await s.page.reload(); await s.boot();
    // The driver: the battle's menus answered for you (see the top).
    await s.eval(() => {
      const G = window.GbaMenus, act = G.battleAction, mv = G.battleMoves, bagOpen = window.BagScreen.open;
      const battle = () => window.BattleScreen._test.battle;
      const foes = (b) => [].concat(b.sides.p2.actives || b.sides.p2.active).filter((m) => m && !m.fainted);
      const shadowOut = (b) => b && b.snag && foes(b).some((m) => b.snaggable(m));
      window.__snag = { thrown: -1, thrownIn: null, balls: 0 };   // (the turn a ball was last thrown, and in which battle: a new battle starts its turns over)
      G.battleAction = (c, o) => {
        const b = battle();
        if (!b || o.prompt || !o.name) return act(c, o);
        if (shadowOut(b) && !(window.__snag.thrownIn === b && window.__snag.thrown === b.turn)) { window.__snag.thrown = b.turn; window.__snag.thrownIn = b; window.__snag.ball = true; return Promise.resolve({ action: "bag", cursor: 1 }); }
        return Promise.resolve({ action: "fight", cursor: 0 });
      };
      window.BagScreen.open = (o) => {
        if (window.__snag.ball) { window.__snag.ball = false; window.__snag.balls++; return Promise.resolve({ pocket: "Poké Balls", id: "master-ball" }); }
        return bagOpen(o);
      };
      G.battleMoves = (c, o) => {
        const b = battle();
        if (!b) return mv(c, o);
        const usable = o.moves.map((m, i) => ({ m, i })).filter(({ m }) => m.pp > 0 && !m.disabled);
        // (A Shadow Pokémon out that's had this turn's ball: hold back.)
        if (shadowOut(b)) { const p = usable.find(({ m }) => m.name === "Protect"); if (p) return Promise.resolve({ index: p.i, cursor: p.i }); }
        const foe = foes(b)[0], types = foe ? (foe.getTypes ? foe.getTypes() : foe.types) : [];
        const score = ({ m }) => m.name === "Protect" ? -1 : types.reduce((n, t) => n * ((window.TYPE_CHART[m.type] || {})[t] ?? 1), 1);
        // (A long battle, something absorbing the best move: round the others.)
        const ranked = usable.slice().sort((a, z) => score(z) - score(a)).filter((x) => score(x) >= 0);
        const pick = ranked[b.turn > 25 ? b.turn % ranked.length : 0] || usable[0];
        return Promise.resolve({ index: pick.i, cursor: pick.i });
      };
    });
    const ran = [];
    let from = false;
    for (const sc of SCENARIOS) {
      if (FROM && sc.who === FROM) from = true;
      if ((ONLY && !ONLY.includes(sc.who)) || (FROM && !from)) {
        // (Skipped: its snag filled in, as if it had happened.)
        await s.eval((sp) => { const f = Game.player.flags; f.orreShadowSnagged = (f.orreShadowSnagged || []).concat(sp); }, sc.species);
        continue;
      }
      await s.eval((fl) => {
        const f = Game.player.flags;
        for (const [k, v] of Object.entries(fl)) { if (v === null) delete f[k]; else f[k] = v; }
        Game.player.party.forEach(Party.heal);
        Overworld.refreshPeople();
      }, sc.flags);
      if (sc.talk) {
        await go(sc.map, 1, 1, "down");
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
        }, sc.talk);
        assert(spot, sc.who + ": " + sc.talk + " is there, with somewhere to stand");
        await go(sc.map, spot.x, spot.y, spot.facing);
      } else if (sc.at) await go(...sc.at);
      else { await go(...sc.walk.slice(0, 4)); await s.walk(sc.walk[3], sc.walk[4] || 1); }
      const done = () => s.eval((sp) => sp.every((x) => (Game.player.flags.orreShadowSnagged || []).includes(x)), sc.species);
      let battled = false;
      for (let i = 0; i < 2500; i++) {
        await s.press("z", 70);
        if (!battled && await inBattle()) battled = true;
        if (battled && await done() && !(await inBattle()) && await idle()) break;
      }
      const state = await s.eval((sp) => {
        const P = Game.player, all = P.party.concat([].concat(...P.boxes).filter(Boolean));
        return { snagged: P.flags.orreShadowSnagged || [], mons: sp.map((x) => { const r = all.find((m) => m.species === x && m.shadow); return r && { heart: r.heart, max: r.heartMax }; }),
          where: P.location, story: P.flags.orreStory, text: document.getElementById("textbox").innerText };
      }, sc.species);
      if (!sc.species.every((x) => state.snagged.includes(x))) { await s.shot("snag-" + sc.who.replace(/\W/g, "")); throw new Error(sc.who + (battled ? ": not snagged " : ": no battle ") + JSON.stringify(state)); }
      sc.species.forEach((x, i) => assert(state.mons[i] && state.mons[i].heart === state.mons[i].max && state.mons[i].max > 0, x + " yours, a Shadow Pokémon, its heart shut: " + JSON.stringify(state.mons[i])));
      ran.push(...sc.species);
      console.log("ok: browser Orre snag: " + sc.who + "'s " + sc.species.join(" and "));
      // (The snagged Pokémon out of the way: to the boxes, so the party stays the two strong ones.)
      await s.eval(() => { const P = Game.player; const keep = P.party.slice(0, 2), rest = P.party.slice(2); P.party = keep; for (const r of rest) { const box = P.boxes.find((b) => b.includes(null)); box[box.indexOf(null)] = r; } });
    }
    const p = await s.player();
    if (!ONLY && !FROM) assert.equal(new Set(p.flags.orreShadowSnagged).size, SCENARIOS.reduce((n, sc) => n + sc.species.length, 0));
    console.log("ok: browser Orre snag: " + ran.length + " Shadow Pokémon snagged in their own battles");
    assert.deepEqual(errors, []);
    assert.deepEqual([...missing], []);
    console.log("ok: browser Orre snag: no script errors or missing files");
  } catch (error) { await s.shot("snag-failure"); throw error; }
  finally { await s.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
