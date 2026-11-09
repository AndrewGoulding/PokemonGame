// Colosseum's Shadow Pokémon mechanics in real battles, through real input: your own Shadow Pokémon's sealed moves
// (only Shadow Rush, the rest "????"), going into Hyper Mode from Shadow Rush, the CALL command in RUN's place
// bringing it back, no bag item while in Hyper Mode but a Scent, its heart opening once for a battle it was sent out
// in (and for the Call), and snagging a Trainer's Shadow Pokémon in a double battle with a Ball from the Bag.
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");
const OUT = process.env.OUT || "/tmp/pk-p5";
(async () => {
  const s = await T.start((p) => {
    // A Shadow Makuhita of your own, Jolly (Hyper Mode at 50% whatever its bars), its heart shut tight; a partner
    // that does nothing, so the battles last.
    const mak = Orre.shadowMon(Orre.shadowOf("Trudly")[0]);
    mak.level = 60; mak.nature = "Jolly"; mak.hp = Party.maxHp(mak);
    OrreHeart.snagged(mak);
    p.party = [mak, Party.create("Snorlax", 70, { moves: ["Splash"], ivs: 31 })];
    p.bag = { "master-ball": 3 };
    Object.assign(p.flags, { orre: 3, orreStory: 44, orreLevelCap: 100, orreTroop: "Verde",
      orreMap: ["PhenacCity", "PyriteTown", "AgateVillage", "MtBattle", "ShadowLab_1F", "RealgamTower_1F"] });
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
    // (Which menu is up, and for whom: the action menu's Pokémon and labels, the moves menu's moves.)
    await s.eval(() => {
      const G = window.GbaMenus, act = G.battleAction, mv = G.battleMoves;
      window.__menus = [];
      G.battleAction = (c, o) => { window.__menu = { kind: "action", name: o.name, labels: o.labels || null }; window.__menus.push(window.__menu); return act(c, o).finally(() => { window.__menu = null; }); };
      G.battleMoves = (c, o) => { window.__menu = { kind: "moves", moves: o.moves.map((m) => m.name) }; window.__menus.push(window.__menu); return mv(c, o).finally(() => { window.__menu = null; }); };
    });
    const menu = () => s.eval(() => window.__menu);
    const engine = () => s.eval(() => { const b = BattleScreen._test.battle; if (!b) return null; const m = b.sides.p1.pokemon[0];
      return { hyper: !!m.hyper, events: b.events.filter((e) => /^-(hyper|call)$/.test(e[0])).map((e) => e.join("|")), ended: b.ended }; });
    const heart = () => s.eval(() => { const r = Game.player.party[0]; return { heart: r.heart, max: r.heartMax, hyper: !!r.hyper }; });
    const startHeart = await heart();
    assert.equal(startHeart.heart, 3000); assert.equal(startHeart.max, 3000);

    // ---- A battle with Fun Old Man Drig: Shadow Rush till it goes into Hyper Mode, then CALL. ----
    // (Drig battles once a stage: if it never went into Hyper Mode, battle him again.)
    let called = false, sawCall = false, sawSealed = false, hyperSeen = false, battles = 0;
    for (let attempt = 0; attempt < 6 && !called; attempt++) {
      await s.eval(() => { delete (Game.player.flags.orreColo || {}).PhenacCity_EventScript_Colo_DRIG; Game.player.party.forEach(Party.heal); });
      await go("PhenacCity", 12, 16, "up");
      let started = false;
      for (let i = 0; i < 900; i++) {
        const m = await menu();
        if (m && m.kind === "action" && /MAKUHITA/i.test(m.name)) {
          if (m.labels && m.labels[3] === "CALL") sawCall = true;
          const e = await engine();
          if (e && e.hyper) {
            hyperSeen = true;
            await s.shot("hyper-call-menu");
            await s.press("ArrowDown"); await s.press("ArrowRight"); await s.press("z");
            called = true; await s.wait(300);
            continue;
          }
        }
        if (m && m.kind === "moves" && m.moves.some((n) => /\?\?\?\?/.test(n))) { sawSealed = true; if (!(await s.eval(() => window.__shotSealed))) { await s.shot("sealed-moves"); await s.eval(() => { window.__shotSealed = true; }); } }
        await s.press("z", 70);
        if (!started && await inBattle()) { started = true; battles++; }
        if (started && !(await inBattle()) && await idle()) break;
      }
      const e = await s.eval(() => (window.__lastEvents || []));
    }
    assert(sawCall, "CALL in RUN's place for your Shadow Pokémon in a Trainer battle");
    assert(sawSealed, "its sealed moves show as ????");
    assert(hyperSeen && called, "Shadow Rush put it into Hyper Mode within six battles, and it was Called");
    console.log("ok: browser Orre Shadow: sealed moves, Hyper Mode from Shadow Rush, CALL in RUN's place (" + battles + " battles)");
    // Its heart: Jolly's 150 a battle it was sent out in (once each), Jolly's 300 for the Call.
    const after = await heart();
    const opened = startHeart.heart - after.heart;
    assert(opened >= 150 * battles + 300 && opened <= 150 * battles + 300 * 6, "opened " + opened + " over " + battles + " battles and a Call");
    console.log("ok: browser Orre Shadow: its heart opened " + opened + " (" + battles + " battles, Jolly)");
    // Its Summary: the heart gauge where the EXP would be (START, POKéMON, it, SUMMARY, then the skills page).
    await s.eval(() => { const G = window.GbaMenus, sm = G.startMenu; G.startMenu = (c, o) => { window.__start = o.items.map((i) => i.key); return sm(c, o); }; });
    for (let i = 0; i < 80 && !(await idle()); i++) await s.press("z", 70);
    await s.wait(400); await s.press("Enter"); await s.wait(500);
    const items = await s.eval(() => window.__start || []);
    assert(items.includes("party"), "the Start menu: " + items);
    for (let k = 0; k < items.indexOf("party"); k++) await s.press("ArrowDown");
    await s.press("z"); await s.wait(600); await s.press("z"); await s.wait(400); await s.press("z"); await s.wait(800);
    await s.press("ArrowRight"); await s.wait(600); await s.shot("summary-heart-skills");
    await s.press("ArrowLeft"); await s.wait(600); await s.shot("summary-heart-info");
    for (let i = 0; i < 8 && !(await idle()); i++) { await s.press("x", 90); await s.wait(250); }

    // ---- In Hyper Mode out of battle: no Potion, but a Scent, which ends it and opens its heart. ----
    await s.eval(() => { const r = Game.player.party[0]; r.hyper = true; Game.player.bag.potion = 1; Game.player.bag["joy-scent"] = 1; });
    await s.eval(() => { Game.player.party[0].hp = 1; });
    // (In battle the engine refuses any item but a Scent; out of it, a Scent can be used on it.)
    const view = await s.eval(() => {
      const r = Game.player.party[0];
      const b = new Battle({ seed: 1, trainer: true, p1: { name: "RED", team: [Party.toBattleSet(r)] }, p2: { name: "B", team: [{ species: "Snorlax", level: 60, moves: ["Splash"] }] } });
      b.start();
      return { potion: b.itemError(b.sides.p1, { item: "potion", target: 0 }), scent: b.itemError(b.sides.p1, { item: "joy-scent", target: 0 }), out: Bag.canUseOn(r, "joy-scent") };
    });
    assert(/HYPER MODE/.test(view.potion || "") && !view.scent && view.out, "in Hyper Mode: no Potion, but a Scent: " + JSON.stringify(view));
    console.log("ok: browser Orre Shadow: in Hyper Mode no Potion in battle, but a Scent");

    // ---- Snagging in a double battle: Snagem Biden's Shadow Smeargle, with a Master Ball from the Bag. ----
    await s.eval(() => { const P = Game.player; P.party = [Party.create("Snorlax", 75, { moves: ["Body Slam"], ivs: 31 }), Party.create("Blissey", 70, { moves: ["Splash"], ivs: 31 })]; P.bag = { "master-ball": 3 }; });
    await go("SnagemHideout", 11, 11, "up");
    let threw = false;
    for (let i = 0; i < 900; i++) {
      const m = await menu();
      if (m && m.kind === "action" && !threw && /SNORLAX/i.test(m.name)) {
        // (BAG, then from the Items pocket right to the Poké Balls, a Master Ball, Use.)
        await s.press("ArrowRight"); await s.press("z"); await s.wait(500);
        const right = await s.eval(() => Bag.BATTLE_POCKETS.indexOf("Poké Balls"));
        for (let k = 0; k < right; k++) { await s.press("ArrowRight"); await s.wait(250); }
        await s.shot("bag-balls");
        await s.press("z"); await s.wait(300); await s.press("z"); threw = true; await s.wait(300);
        continue;
      }
      await s.press("z", 70);
      if (threw) { const ev = await s.eval(() => { const b = BattleScreen._test.battle; return b ? b.events.filter((e) => /ball|caught|snag/.test(e[0])).map((e) => e.map(String).join("|")) : null; }); if (ev && ev.length) await s.eval((e) => { window.__ballEv = e; }, ev); }
      if (threw && !(await inBattle()) && await idle()) break;
    }
    const p = await s.player();
    assert(p.flags.orreShadowSnagged && p.flags.orreShadowSnagged.includes("Smeargle"), "Biden's Smeargle snagged: " + JSON.stringify(p.flags.orreShadowSnagged));
    const smeargle = p.party.concat([].concat(...p.boxes).filter(Boolean)).find((r) => r.species === "Smeargle");
    assert(smeargle && smeargle.shadow && smeargle.heartMax === 7000 && smeargle.heart === 7000, "a Shadow Smeargle, its heart shut: " + JSON.stringify(smeargle && { heart: smeargle.heart, max: smeargle.heartMax }));
    assert.equal(p.bag["master-ball"], 2);
    console.log("ok: browser Orre Shadow: snagged Biden's Shadow Smeargle in a double battle with a Ball from the Bag");

    assert.deepEqual(errors, []);
    assert.deepEqual([...missing], []);
    console.log("ok: browser Orre Shadow mechanics: no script errors or missing files");
  } catch (error) { await s.shot("mech-failure"); throw error; }
  finally { await s.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
