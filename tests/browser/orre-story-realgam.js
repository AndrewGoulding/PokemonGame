// Realgam Tower (orreStory 40 -> 44) and after the game, through real input and the shared story dispatcher:
// Silva in the lobby, Gonzap and his question, the four Admins' ID Badges, the Colosseum's door, its rounds (a lost
// one back to the first), Nascour, Evice and the ending; then the rebuilt Snagem Hideout, the Deep Colosseum, the
// tower's post-game tournament, Fein, Cail's and Gurks's tips and Colosseum's e-mails.
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");
const OUT = process.env.OUT || "/tmp/pk-p5";
// (POST=1: only the after-the-game part, from a save at orreStory 44.)
const POST = !!process.env.POST;
const strong = () => [Party.create("Mewtwo", 100, { moves: ["Ice Beam", "Psychic", "Thunderbolt", "Flamethrower"], ivs: 31 }),
  Party.create("Rayquaza", 100, { moves: ["Flamethrower", "Dragon Claw", "Extreme Speed", "Earthquake"], ivs: 31 })];
(async () => {
  const s = await T.start((p) => {
    p.party = strong();
    Object.assign(p.flags, { orre: 3, orreStory: POST ? 44 : 40, orreLevelCap: 100, orreTroop: "Verde",
      orreMap: ["PhenacCity", "PyriteTown", "AgateVillage", "MtBattle", "ShadowLab_1F", "RealgamTower_1F"] });
  }, { map: "RealgamTower_Exterior", x: 19, y: 24, facing: "up" }, {
    out: OUT, storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) } });
  const errors = [], missing = new Set(), long = new Set();
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  const idle = () => s.eval(() => Overworld.idle());
  // (Every text box seen: no line over 37 characters, no more than three lines.)
  // (Orre's own text, outside battle: the battle's messages are the engine's, laid out its own way.)
  const box = async () => { const t = await s.eval(() => (document.getElementById("field").classList.contains("hidden") && (document.getElementById("textbox") || {}).innerText) || ""); for (const l of t.split("\n")) if (l.length > 37) long.add(l); if (t.split("\n").length > 3) long.add(t); return t; };
  async function finish(predicate, label, limit = 400, arg) {
    for (let i = 0; i < limit; i++) {
      await s.press("z", 70); await box();
      if (await s.eval(predicate, arg) && await idle()) { console.log("ok: browser Orre " + label); return; }
    }
    throw new Error(label + " did not complete: " + JSON.stringify(await s.eval(() => ({ location: Game.player.location, story: Game.player.flags.orreStory, text: document.getElementById("textbox").innerText }))));
  }
  const go = async (map, x, y, facing) => { await s.eval((to) => Overworld.teleport(to), { map, x, y, facing: facing || "up" }); await s.wait(350); };
  const f = () => s.eval(() => Game.player.flags);
  const heal = () => s.eval(() => Game.player.party.forEach(Party.heal));
  const inBattle = () => s.eval(() => !document.getElementById("field").classList.contains("hidden"));
  // Talk until a battle starts, then through it and back to the map: the battle's foe team, as the page saw it.
  async function battleThrough(label, limit = 600) {
    let saw = false;
    for (let i = 0; i < limit; i++) {
      await s.press("z", 70); await box();
      if (!saw && await inBattle()) saw = true;
      if (saw && !(await inBattle()) && await idle()) { console.log("ok: browser Orre " + label); return; }
    }
    throw new Error(label + (saw ? " never ended" : " never started a battle") + ": " + JSON.stringify(await s.eval(() => ({ location: Game.player.location, text: document.getElementById("textbox").innerText }))));
  }
  try {
    await s.page.reload(); await s.boot();
    if (!POST) {
    // Into the tower: Silva in disguise.
    await s.walk("up", 1);
    await finish(() => (Game.player.flags.orreStory | 0) === 41, "Realgam: Silva in the lobby");
    await s.shot("realgam-lobby");
    // A lobby Trainer (Colosseum's, its own party).
    await go("RealgamTower_1F", 3, 6, "up");
    await finish(() => (Game.player.flags.orreColo || {}).RealgamTower_1F_EventScript_Colo_KLEST === 0, "Realgam lobby: Bandana Guy Klest");
    // The Realgam Peon of the Mystery Troop member you battled in Phenac (Verde here).
    assert(await s.eval(() => Orre.visible(WORLD_MAPS.RealgamTower_1F.people.find((p) => /_VERDE$/.test(p.localId)), Game.player.flags) !== false), "Verde in the lobby");
    assert(await s.eval(() => Orre.visible(WORLD_MAPS.RealgamTower_1F.people.find((p) => /_ROSSO$/.test(p.localId)), Game.player.flags) === false), "not Rosso");
    await heal();
    // Up to the domes: Gonzap, then his question (No).
    await go("RealgamTower_1F", 9, 2, "up"); await s.walk("up", 1); await s.wait(400);
    assert.equal((await s.player()).location.map, "RealgamTower_Dome");
    await go("RealgamTower_Dome", 6, 4, "up");
    for (let i = 0; i < 400 && !(await s.eval(() => /team up again|Yes|YES/.test(document.body.innerText) && /team up/i.test(document.body.innerText))); i++) { await s.press("z", 70); await box(); }
    await s.shot("realgam-gonzap-question");
    await finish(() => (Game.player.flags.orreStory | 0) === 42, "Realgam: Gonzap beaten, his question, Nascour's welcome");
    assert((await f()).orreShadowSnagged === undefined || !(await f()).orreShadowSnagged.includes("Skarmory"), "Skarmory knocked out, not snagged");
    // The Colosseum's door without the badges.
    await go("RealgamTower_Dome", 6, 3, "up"); await s.walk("up", 1);
    await finish(() => Game.player.location.map === "RealgamTower_Dome", "Realgam: the Colosseum's door shut without the four ID Badges", 60);
    // The four Admins: their Shadow Pokémon (never snagged here) come back; beaten, an ID Badge each.
    for (const [who, x, y, facing] of [["Miror B.", 3, 5, "left"], ["Dakim", 9, 5, "right"], ["Venus", 2, 10, "left"], ["Ein", 10, 10, "right"]]) {
      await heal(); await go("RealgamTower_Dome", x, y, facing);
      const team = await s.eval((w) => Orre.team(w + "@Realgam", Game.player.flags.orreShadowSnagged).map((r) => r.species + (r.shadow ? "*" : "")), who);
      assert(team.some((x) => x.endsWith("*")), who + " brings back the Shadow Pokémon never snagged: " + team);
      await finish((w) => (Game.player.flags.orreRealgamAdmins || []).includes(w), "Realgam: " + who + "'s ID Badge", 400, who);
    }
    assert(await s.eval(() => Orre.realgamBadges(Game.player.flags)));
    // (An Admin whose Shadow Pokémon's still theirs stays to battle again.)
    assert(await s.eval(() => Orre.visible(WORLD_MAPS.RealgamTower_Dome.people.find((p) => p.localId === "LOCALID_ORRE_REALGAM_EIN"), Game.player.flags) !== false), "Ein stays while Raikou's his");
    // The Colosseum, badges in hand: through the door.
    await go("RealgamTower_Dome", 6, 3, "up"); await s.walk("up", 1); await s.wait(500);
    assert.equal((await s.player()).location.map, "RealgamTower_Colosseum", "the door opens with the four badges");
    // Its rounds: lose the second one (a Magikarp alone) and it's back to the first.
    await s.eval(() => { Game.player.flags.orreRealgamRound = 1; Game.player.flags.orreNascourMet = true; Game.player.party = [Party.create("Magikarp", 5, { moves: ["Splash"] })]; });
    await go("RealgamTower_Colosseum", 6, 4, "up");
    await finish(() => Game.player.flags.orreRealgamRound === 0, "Realgam Colosseum: a lost round, back to the first", 600);
    await s.eval((m) => { Game.player.party = m; }, await s.eval(() => [Party.create("Mewtwo", 100, { moves: ["Ice Beam", "Psychic", "Thunderbolt", "Flamethrower"], ivs: 31 }), Party.create("Rayquaza", 100, { moves: ["Flamethrower", "Dragon Claw", "Extreme Speed", "Earthquake"], ivs: 31 })]));
    await go("RealgamTower_Colosseum", 6, 4, "up");
    await finish(() => (Game.player.flags.orreStory | 0) === 43, "Realgam Colosseum: Jomas, Delan, Nella, Ston, then Nascour", 1500);
    // The top: Evice, and Colosseum's ending.
    await go("RealgamTower_Colosseum", 6, 3, "up"); await s.walk("up", 1);
    await finish(() => (Game.player.flags.orreStory | 0) === 44, "Realgam's top: Evice and the ending", 900);
    await s.shot("realgam-ending");
    assert.equal(await s.eval(() => Game.player.flags.orreLevelCap | 0), 100);
    }

    // ---------- After the game ----------
    if (!process.env.LATE) {   // (LATE=1 with POST=1: only Phenac Stadium and the e-mails)
    // The rebuilt Snagem Hideout: Biden, Agrev, the Mystery Troop member not battled in Phenac (Verde was, so Bluno),
    // the entrance's Cipher Peons and Gonzap with their later parties.
    await heal();
    const vis = (map, id) => s.eval(([m, i]) => Orre.visible(WORLD_MAPS[m].people.find((p) => p.localId === i), Game.player.flags) !== false, [map, id]);
    assert(await vis("SnagemHideout", "LOCALID_ORRE_SHADOW_HIDEOUT_BLUNO") && !(await vis("SnagemHideout", "LOCALID_ORRE_SHADOW_HIDEOUT_VERDE")) && !(await vis("SnagemHideout", "LOCALID_ORRE_SHADOW_HIDEOUT_ROSSO")), "Bluno, and only Bluno, at the hideout");
    assert(!(await vis("ShadowLab_EinsRoom", "LOCALID_ORRE_SHADOW_LAB_ROSSO")), "Rosso not in Ein's room yet");
    await go("SnagemHideout", 11, 11, "up"); await battleThrough("post-game: Snagem Biden (Shadow Smeargle)");
    await heal(); await go("SnagemHideout", 16, 7, "up"); await battleThrough("post-game: the hideout's Mystery Troop member, Bluno");
    await heal(); await go("SnagemHideout", 8, 9, "up"); await battleThrough("post-game: Cipher Peon Nore's later party");
    await heal(); await go("SnagemHideout", 20, 13, "up"); await battleThrough("post-game: Gonzap in the hideout");
    // (Once Bluno's Croconaw is snagged, Rosso's in Ein's room.)
    await s.eval(() => { (Game.player.flags.orreShadowSnagged = Game.player.flags.orreShadowSnagged || []).push("Croconaw"); });
    assert(await vis("ShadowLab_EinsRoom", "LOCALID_ORRE_SHADOW_LAB_ROSSO") && !(await vis("ShadowLab_EinsRoom", "LOCALID_ORRE_SHADOW_LAB_BLUNO")), "then Rosso in Ein's room");
    await heal(); await go("ShadowLab_EinsRoom", 6, 4, "up"); await battleThrough("post-game: Rosso in Ein's room");
    // Fein and Ancha only once every Shadow Pokémon but Togetic is snagged.
    assert(!(await vis("OutskirtStand", "LOCALID_ORRE_SHADOW_FEIN")));
    // Cail's tip names the hideout's member's Shadow Pokémon; Gurks's the lab's member by name.
    await s.eval(() => { const f = Game.player.flags; (f.orreShadowDone = f.orreShadowDone || []).push("PyriteTown_EventScript_Shadow_CAIL"); f.orreShadowSnagged.push("Furret"); f.orreColoRematch = {}; });
    await heal(); await go("PyriteTown", 15, 27, "left");
    let said = "";
    for (let i = 0; i < 600 && !((await s.eval(() => (Game.player.flags.orreColoRematch || {}).PyriteTown_EventScript_Shadow_CAIL)) === 2 && await idle()); i++) { await s.press("z", 70); said += "|" + await box(); }
    assert(/Croconaw/.test(said), "Cail names Bluno's Croconaw: " + said.slice(-300));
    console.log("ok: browser Orre post-game: Cail's tip names the hideout's Troop member");
    await heal(); await go("TheUnder", 8, 24, "down");
    said = "";
    for (let i = 0; i < 600 && !((await s.eval(() => (Game.player.flags.orreColo || {}).TheUnder_EventScript_Colo_GURKS)) === 3 && await idle()); i++) { await s.press("z", 70); said += "|" + await box(); }
    assert(/Rosso/.test(said), "Gurks names Rosso: " + said.slice(-300));
    console.log("ok: browser Orre post-game: Gurks's tip names the lab's Troop member");

    // The Deep Colosseum: Colosseum's first round; then, four won, the fifth, ending with Deep King Agnol and his Shadow
    // Shuckle (no one waits by the counter any more).
    await heal(); await go("TheUnder_DeepColosseum", 7, 8, "up");
    await finish(() => ((Game.player.flags.orreTourney || {}).deep | 0) === 1, "post-game: the Deep Colosseum's first round", 1200);
    assert(!/waiting by the counter/.test(said));
    await s.eval(() => { Game.player.flags.orreTourney.deep = 4; });
    const agnol = await s.eval(() => { const r = Orre.DEEP_ROUNDS[4]; const e = r[r.length - 1]; return [e.name, Orre.roundTeam(e, Game.player.flags).team.map((m) => m.species + (m.shadow ? "*" : ""))]; });
    assert(agnol[0] === "Deep King Agnol" && agnol[1].includes("Shuckle*"), JSON.stringify(agnol));
    await heal(); await go("TheUnder_DeepColosseum", 7, 8, "up");
    await finish(() => ((Game.player.flags.orreTourney || {}).deep | 0) === 5, "post-game: the Deep Colosseum's fifth round, Deep King Agnol last", 1500);
    // Realgam Tower's post-game tournament: its four rounds, Nascour and Evice.
    await heal(); await go("RealgamTower_Colosseum", 6, 4, "up");
    for (let i = 0; i < 6000 && !/You won all six/.test(said); i++) { await s.press("z", 70); said += "|" + await box(); }
    assert(/You won all six/.test(said), "the tower's six in a row");
    for (let i = 0; i < 30 && !(await idle()); i++) await s.press("z", 70);
    console.log("ok: browser Orre post-game: Realgam Tower Colosseum's six in a row");
    }
    // Phenac Stadium's post-game tournament.
    await heal(); const before = await s.eval(() => (Game.player.flags.orreTourney || {}).phenac | 0);
    await go("PhenacCity_Stadium", 5, 11, "up");
    // (Its entrants are drawn about as strong as your strongest Pokémon: won or lost, it runs through and ends.)
    await battleThrough("post-game: Phenac Stadium's tournament (won " + (((await f()).orreTourney || {}).phenac | 0) + " before)", 6000);
    for (let i = 0; i < 400 && !(await idle() && !(await inBattle())); i++) await s.press("z", 70);
    // Colosseum's e-mails: one each time you come into a place; read again from the Start menu's E-mail.
    const mails = () => s.eval(() => ((Game.player.flags.orreMail || {}).got || []).length);
    const m0 = await mails();
    for (let k = 0; k < 3; k++) {
      const was = await mails();
      await go("RealgamTower_1F", 9, 10, "down"); await s.walk("down", 2); await s.wait(500);
      for (let i = 0; i < 60 && !(await idle()); i++) { await s.press("z", 70); await box(); }
      assert((await mails()) - was <= 1, "one e-mail at a time");
    }
    assert((await mails()) > m0, "e-mails came after the story: " + m0 + " -> " + (await mails()));
    console.log("ok: browser Orre post-game: e-mails arrive one per place (" + m0 + " -> " + (await mails()) + ")");
    await s.eval(() => { const G = window.GbaMenus, sm = G.startMenu; G.startMenu = (c, o) => { window.__start = o.items.map((i) => i.key); return sm(c, o); }; });
    for (let i = 0; i < 80 && !(await idle()); i++) { await s.press("z", 70); await box(); }
    await s.wait(400); await s.press("Enter"); await s.wait(600);
    const items = await s.eval(() => window.__start || []);
    assert(items.includes("mail"), "the Start menu's E-mail: " + items + " at " + JSON.stringify((await s.player()).location));
    for (let k = 0; k < items.indexOf("mail"); k++) await s.press("ArrowDown");
    await s.press("z"); await s.wait(500); await s.shot("mailbox");
    await s.press("z");
    for (let i = 0; i < 40; i++) { await s.press("z", 70); await box(); }
    for (let i = 0; i < 6 && !(await idle()); i++) { await s.press("x", 90); await s.wait(150); }
    assert(((await f()).orreMail.read || []).length > 0, "an e-mail read from the mailbox");
    console.log("ok: browser Orre post-game: an e-mail read again from the Start menu");

    assert.deepEqual(errors, []);
    assert.deepEqual([...missing], []);
    assert.deepEqual([...long], [], "text that doesn't fit the box");
    console.log("ok: browser Orre Realgam and after: no script errors, missing files or overlong text");
    module.exports = { s };
  } catch (error) { await s.shot("failure"); throw error; }
  finally { if (!process.env.KEEP) await s.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
