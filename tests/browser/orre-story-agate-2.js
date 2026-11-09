// Orre after Mt. Battle (orreStory 33), Agate Village and Mt. Battle, through real input: the Cologne Case girl, the
// mart's Scents and a Scent from the Bag on a Shadow Pokémon, Skof and Dury, the Day-Care Lady (a Shadow Pokémon left
// with her, its heart opening as you walk, and back for her fee), the Summary's heart gauge, the Relic Stone purifying
// an open heart (its first move back, banked Exp. Points, a ribbon, the nickname prompt), the Time Flute's Celebi
// purifying the rest, and Mt. Battle's Athlete Aidel and the first area of its 100-Trainer challenge.
//
//   ONLY=2 node tests/browser/orre-story-agate.js   (screenshots in /tmp/pokemon-orre-agate)
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");

const OUT = "/tmp/pokemon-orre-agate";
async function partTwo() {
  const s = await T.start((p) => {
    p.party = [Party.create("Mewtwo", 70, { moves: ["Psychic", "Ice Beam", "Thunderbolt", "Flamethrower"], ivs: 31 }),
      Party.create("Dragonite", 70, { moves: ["Earthquake", "Outrage", "Fire Punch", "Thunder Punch"], ivs: 31 })];
    // (Two Shadow Pokémon snagged on the way: Skrub's Hitmontop, its heart full, and Trudly's Makuhita, its heart open.)
    const top = Orre.shadowMon(Orre.shadowOf("Skrub")[0]), maku = Orre.shadowMon(Orre.shadowOf("Trudly")[0]);
    for (const r of [top, maku]) OrreHeart.snagged(r);
    top.nature = "Adamant"; maku.heart = 0; maku.shadowExp = 4000;
    p.party.push(top, maku);
    p.bag["time-flute"] = 1;
    Object.assign(p.flags, { orre: 3, orreStory: 33, orreLevelCap: 100, orreShadowSnagged: ["Hitmontop", "Makuhita"],
      orreMap: ["PhenacCity", "PyriteTown", "AgateVillage", "MtBattle"], orreMail: { got: ["EMERGENCY", "TROUBLE_IN_UNDER", "MIROR_NABBED"], read: [] } });
    p.money = 50000;
  }, { map: "AgateVillage", x: 11, y: 9, facing: "up" }, {
    out: OUT, storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 1, sound: 2, calls: 1, follower: 1, followerModes: 2 }) }
  });
  const errors = [], missing = new Set(), overflow = new Set();
  s.page.on("pageerror", (e) => errors.push(e.message));
  s.page.on("response", (r) => { if (r.status() >= 400) missing.add(new URL(r.url()).pathname); });
  const idle = () => s.eval(() => Overworld.idle());
  const boxText = () => s.eval(() => (document.getElementById("textbox") || {}).innerText || "");
  async function checkBox() {
    const t = await s.eval(() => { const w = document.getElementById("world"), b = document.getElementById("textbox");
      return w && !w.classList.contains("hidden") && b ? b.innerText : ""; });
    const lines = t.split("\n").filter((l) => l.trim());
    if (lines.length > 3 || lines.some((l) => l.length > 38)) overflow.add(t);
  }
  // Mash A till `predicate` holds and the world's idle; `on(text)` may answer a prompt instead (returns a key, or null).
  async function finish(predicate, label, limit = 400, on) {
    for (let i = 0; i < limit; i++) {
      const key = on ? on(await boxText()) : null;
      await s.press(key || "z", 90);
      await checkBox();
      if (await s.eval(predicate) && await idle()) { console.log("ok: browser Orre " + label); return; }
    }
    throw new Error(label + " did not complete: " + JSON.stringify(await s.eval(() => ({ location: Game.player.location, story: Game.player.flags.orreStory,
      text: (document.getElementById("textbox") || {}).innerText }))));
  }
  async function talkOut(limit = 200) {
    for (let i = 0; i < limit; i++) { await s.press("z", 90); await checkBox(); if (await idle()) { await s.wait(200); if (await idle()) return; } }
    throw new Error("conversation didn't end: " + (await boxText()));
  }
  async function go(map, x, y, facing) {
    await s.eval((to) => Overworld.teleport(to), { map, x, y, facing: facing || "up" }); await s.wait(350);
    if (!(await idle())) await talkOut();
  }
  const party = () => s.eval(() => JSON.parse(JSON.stringify(Game.player.party)));
  try {
    await s.page.reload();
    await s.boot();
    if (!(await idle())) await talkOut();

    // ---- The Cologne Case girl, east of the Pokémon Center. ----
    await go("AgateVillage", 11, 9, "up");
    await finish(() => (Game.player.bag["cologne-case"] | 0) > 0, "the Cologne Case girl's Cologne Case");
    await s.shot("10-cologne");

    // ---- Agate's mart (its clerk at the door): Colosseum's Agate stock, the Scents with a Cologne Case. ----
    await go("AgateVillage", 23, 25, "up");
    const vivid = await s.eval(() => Orre.AGATE_MART.length + Orre.SCENTS.indexOf("vivid-scent"));
    assert(vivid > 0, "the Scents in Agate's stock");
    await s.press("z"); await s.wait(300); await s.press("z"); await s.wait(400);   // (talk; Buy)
    for (let i = 0; i < vivid; i++) { await s.press("ArrowDown"); await s.wait(120); }
    await s.shot("11-mart-scents");
    // (Choose it, one of them, YES: till it's in the Bag; then out of the list and the counter.)
    for (let i = 0; i < 10 && !((await s.player()).bag["vivid-scent"] | 0); i++) { await s.press("z"); await s.wait(400); }
    for (let i = 0; i < 16 && !(await idle()); i++) { await s.press(i < 2 ? "z" : "x"); await s.wait(350); }
    if (!(await idle())) await talkOut();
    assert.equal((await s.player()).bag["vivid-scent"], 1, "a Vivid Scent bought");
    console.log("ok: browser Orre Agate's mart sells Scents with a Cologne Case");

    // ---- A Vivid Scent from the Bag on Shadow Hitmontop: Start, Bag, its pocket, Use, the Pokémon. ----
    await s.press("Enter"); await s.wait(400); await s.shot("12-start");
    await s.press("ArrowDown"); await s.wait(150); await s.press("ArrowDown"); await s.wait(150); await s.press("z"); await s.wait(700);
    await s.shot("13-bag");
    const before = (await party())[2];
    await s.press("z"); await s.wait(400); await s.shot("13-bag-menu");
    await s.press("z"); await s.wait(700); await s.shot("13-bag-party");   // (Use: the party)
    await s.press("ArrowDown"); await s.wait(150); await s.press("ArrowDown"); await s.wait(150); await s.press("z"); await s.wait(600);
    await s.shot("13-bag-scent");
    for (let i = 0; i < 12 && ((await party())[2].heart === before.heart || !(await s.eval(() => !document.getElementById("world").classList.contains("hidden")))); i++) { await s.press(i < 8 ? "z" : "x"); await s.wait(300); }
    for (let i = 0; i < 12 && !(await idle()); i++) { await s.press("x"); await s.wait(300); }
    const after = (await party())[2];
    assert.equal(before.heart - after.heart, 225, "a Vivid Scent on an Adamant Hitmontop: three times 75 (" + before.heart + " -> " + after.heart + ")");
    assert(!((await s.player()).bag["vivid-scent"] | 0), "the Scent used up");
    console.log("ok: browser Orre a Vivid Scent from the Bag opens Hitmontop's heart by Colosseum's Adamant amount");

    // ---- Agate's Trainers: Fun Old Man Skof, and Cooltrainer Dury (after Dakim). ----
    for (const [script, x, y] of [["AgateVillage_EventScript_Colo_SKOF", 13, 14], ["AgateVillage_EventScript_Colo_DURY", 20, 17]]) {
      await go("AgateVillage", x, y, "up");
      await s.eval(() => Game.player.party.forEach(Party.heal));
      await finish(new Function(`return (Game.player.flags.orreColo || {})[${JSON.stringify(script)}] != null`), "Agate: " + script.split("_").pop());
    }

    // ---- The Day-Care Lady: leave Hitmontop with her, walk 256 steps and more, take it back for her fee. ----
    await go("AgateVillage", 7, 23, "up"); await s.walk("up", 1); await s.wait(500);
    assert.equal((await s.player()).location.map, "AgateVillage_DayCare");
    await go("AgateVillage_DayCare", 2, 4, "up");
    await s.shot("14-daycare");
    const left = (await party())[2];
    // (YES she's to raise one; the party screen: Hitmontop, the third.)
    for (let i = 0; i < 30 && !(await s.eval(() => PartyMenu.showing)); i++) { await s.press("z"); await s.wait(250); }
    await s.shot("14-daycare-party");
    await s.press("ArrowDown"); await s.wait(150); await s.press("ArrowDown"); await s.wait(150); await s.press("z"); await s.wait(500);
    for (let i = 0; i < 8 && (await party()).length === 4; i++) { await s.press("z"); await s.wait(300); }
    await talkOut();
    assert.equal((await party()).length, 3, "Hitmontop left with the Day-Care Lady");
    assert.equal(await s.eval(() => OrreDayCare.held(Game.player).species), "Hitmontop");
    // (Out, and 256 steps and more along Agate's square.)
    await go("AgateVillage", 8, 14, "right");
    const steps0 = await s.eval(() => Game.player.flags.orreDayCare.steps);
    for (let lap = 0; lap < 14 && (await s.eval(() => Game.player.flags.orreDayCare.steps)) - steps0 < 262; lap++) {
      await s.walk(lap % 2 ? "left" : "right", 20); if (!(await idle())) await talkOut();
    }
    const held = await s.eval(() => JSON.parse(JSON.stringify(Game.player.flags.orreDayCare)));
    assert(held.steps - steps0 >= 256, "walked 256 steps: " + (held.steps - steps0));
    assert.equal(left.heart - held.record.heart, 300, "the Day-Care opens an Adamant heart by 300 every 256 steps (" + left.heart + " -> " + held.record.heart + ")");
    // (Back for it: YES, YES to her fee.)
    const money = (await s.player()).money;
    await go("AgateVillage_DayCare", 2, 4, "up");
    await finish(() => Game.player.party.length === 4, "the Day-Care Lady's Pokémon back");
    assert.equal(money - (await s.player()).money, 100, "her fee: ¥100 at no levels grown");
    assert.equal((await party())[3].species, "Hitmontop");
    console.log("ok: browser Orre the Day-Care Lady raises a Shadow Pokémon and opens its heart");

    // ---- The Summary of a Shadow Pokémon: Start, Pokémon, Hitmontop (the fourth), Summary, both pages. ----
    // (The Start menu remembers its place, FireRed's way: Bag, from the Scent; Pokémon is the one above.)
    await s.press("Enter"); await s.wait(400); await s.press("ArrowUp"); await s.wait(150); await s.press("z"); await s.wait(700);
    for (let i = 0; i < 3; i++) { await s.press("ArrowDown"); await s.wait(150); }
    await s.press("z"); await s.wait(400); await s.shot("15-party-menu"); await s.press("z"); await s.wait(900);
    await s.shot("15-summary-info");
    await s.press("ArrowRight"); await s.wait(600); await s.shot("15-summary-skills");
    await s.press("ArrowRight"); await s.wait(600); await s.shot("15-summary-moves");
    for (let i = 0; i < 10 && !(await idle()); i++) { await s.press("x"); await s.wait(350); }
    assert(await idle(), "back out of the Summary");

    // ---- The Relic Stone: Makuhita's open heart purified (its first move back, its Exp. Points, a ribbon; no nickname),
    // Hitmontop's not yet; then the Time Flute: Celebi purifies Hitmontop too, and the flute's gone. ----
    await go("RelicForest", 10, 6, "up");
    await s.shot("16-relic-stone");
    const lvBefore = (await party())[2].level;
    await finish(() => !Game.player.party.some((r) => r.shadow) && !!Game.player.flags.orreCelebi, "the Relic Stone purifies Makuhita, the Time Flute's Celebi Hitmontop",
      400, (text) => (/nickname/i.test(text) ? "x" : null));
    const p = await s.player(), maku = p.party.find((r) => r.species === "Makuhita"), top = p.party.find((r) => r.species === "Hitmontop");
    assert.equal(maku.moves[0].name, "Foresight", "Makuhita's first move back in Shadow Rush's place");
    assert(maku.nationalRibbon && top.nationalRibbon, "the Relic's ribbon");
    assert(maku.level > lvBefore, "Makuhita's banked Exp. Points: Lv. " + lvBefore + " -> " + maku.level);
    assert(!maku.nickname, "no nickname given");
    assert.equal(top.moves[0].name, "Agility", "Hitmontop's first move back");
    assert(!p.bag["time-flute"], "the Time Flute spent");
    assert.deepEqual((p.flags.orrePurified || []).sort(), ["Hitmontop", "Makuhita"]);
    console.log("ok: browser Orre purification's words, moves, Exp. Points and ribbon");

    // ---- Mt. Battle after Dakim: Athlete Aidel by the Pokémon Center, and Area 1 of the 100-Trainer challenge. ----
    await go("MtBattle", 27, 28, "right");
    await s.eval(() => Game.player.party.forEach(Party.heal));
    await finish(() => (Game.player.flags.orreColo || {}).MtBattle_EventScript_Colo_AIDEL != null, "Mt. Battle: AIDEL");
    // (Ten double battles with no healing between: a party that won't faint, so the run tests the challenge itself.)
    await s.eval(() => { Game.player.party = [Party.create("Mewtwo", 100, { moves: ["Psychic", "Ice Beam", "Thunderbolt", "Flamethrower"], ivs: 31 }),
      Party.create("Kyogre", 100, { moves: ["Surf", "Ice Beam", "Thunder", "Calm Mind"], ivs: 31 })]; });
    await go("MtBattle", 20, 30, "up");
    await s.shot("17-challenge");
    const prizes = (await s.player()).money;
    await finish(() => ((Game.player.flags.orreMtBattle || {}).cleared || []).includes(1), "Mt. Battle's challenge, Area 1", 3000,
      (text) => (/Go on to\s*Area 2/.test(text) ? "x" : null));
    const rec = (await s.player()).flags.orreMtBattle;
    assert.equal(rec.best, 1);
    assert((await s.player()).money > prizes, "Area 1's prize money");
  } catch (error) { await s.shot("failure"); throw error; }
  finally { await s.close(); }
  assert.deepEqual(errors, []);
  assert.deepEqual([...missing], []);
  assert.deepEqual([...overflow], [], "message boxes overflowing");
}
module.exports = { partTwo };
