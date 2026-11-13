// Two-turn moves in real battles (ui/battle-screen.js): each plays its charging animation on its first
// turn and its strike on the second; Dig, Dive, Bounce, Phantom Force, Shadow Force, Fly and Sky Drop keep
// the user (Sky Drop: and the Pokémon it took up) out of sight in between, and it's back in sight however
// the move ends: its strike, a miss, a Protect, fainting, paralysis, hurting itself in its confusion.
// A Power Herb, Solar Beam in the sun and Electro Shot in the rain go straight to the strike.
//
//   node tests/browser/two-turn-moves.js [move ...]     (only the battles with those moves)
"use strict";
const assert = require("node:assert/strict");
const T = require("./lib");

const AWAY = ["Dig", "Dive", "Bounce", "Phantom Force", "Shadow Force", "Fly", "Sky Drop"];
const CHARGE = ["Solar Beam", "Solar Blade", "Sky Attack", "Razor Wind", "Skull Bash", "Freeze Shock", "Ice Burn", "Geomancy", "Meteor Beam", "Electro Shot"];
const LINE = { // (the charging turn's line)
  "Dig": "burrowed its way under the ground!", "Dive": "hid underwater!", "Bounce": "sprang up!", "Phantom Force": "vanished instantly!",
  "Shadow Force": "vanished instantly!", "Fly": "flew up high!", "Sky Drop": "took its target into the sky!", "Solar Beam": "absorbed light!",
  "Solar Blade": "absorbed light!", "Sky Attack": "became cloaked in a harsh light!", "Razor Wind": "whipped up a whirlwind!",
  "Skull Bash": "tucked in its head!", "Freeze Shock": "became cloaked in a freezing light!", "Ice Burn": "became cloaked in freezing air!",
  "Geomancy": "is absorbing power!", "Meteor Beam": "is overflowing with space power!", "Electro Shot": "absorbed electricity!"
};
const MEW = (move, more) => Object.assign({ species: "Mew", level: 50, moves: [].concat(move) }, more || {});
const SHUCKLE = (move, more) => Object.assign({ species: "Shuckle", level: 100, moves: [].concat(move || "Splash") }, more || {});   // (slow, and it lasts)
// On the second turn's choices: the next 50-50 (or paralysis's one in four) goes against yours.
const UNLUCKY = "const r = b.randomChance; b.randomChance = function () { b.randomChance = r; return true; };";

(async () => {
  const only = process.argv.slice(2);
  const s = await T.start((p) => { p.party = [Party.create("Mew", 50, { moves: ["Splash"] })]; p.repelSteps = 100000; }, { map: "PalletTown", x: 10, y: 10 },
    { out: "/tmp/pokemon-two-turn-moves", storage: { "pokemon-options": JSON.stringify({ textSpeed: 2, battleScene: 0, battleStyle: 1, sound: 2, follower: 1, calls: 1 }) } });
  let label = "";
  try {
    await s.boot();
    // The page's side: battles with the teams, weather and foe's choices of `window.__battle`, and a record
    // of every animation played and, frame by frame, of the text and whether each side's picture can be seen.
    await s.eval(() => {
      const run = BattleScreen.run;
      BattleScreen.run = (cfg) => {
        const o = window.__battle;
        cfg.p2.team = o.p2.map((d) => Party.toBattleSet(Object.assign(Party.create(d.species, d.level, { moves: d.moves }), { item: d.item || "" })));
        return run(Object.assign(cfg, { wild: !o.trainer, exp: false, levelCap: 100, weather: o.weather, opponent: (b) => {
          // (After its turns, the battle's called off.)
          if (b.turn > o.turns && !b.ended) { b.ended = true; b.winner = "p1"; }
          // (No chance misses: Sky Attack's and Meteor Beam's 90, Bounce's 85.)
          if (b.turn === 1) for (const [side, list] of [["p1", o.p1], ["p2", o.p2]]) list.forEach((d, i) => { const m = b.sides[side].pokemon[i]; m.boosts.accuracy = 6; if (d.hp) m.hp = d.hp; });
          if (b.turn === 2 && o.second && !b.__second) { b.__second = true; new Function("b", o.second)(b); }
          const req = b.getRequest("p2");
          if (req.phase === "switch") return { type: "switch", index: req.switches[0] };
          if (b.turn === o.foeSwitch) return { type: "switch", index: 1 };
          return { type: "move", move: (o.foeMoves || [0])[Math.min(b.turn, (o.foeMoves || [0]).length) - 1] };
        } }));
      };
      const play = BattleAnim.play;
      BattleAnim.play = function (opts) { if (opts.move) window.__log.push({ play: opts.move, turn: opts.turn, by: opts.attacker }); return play.call(this, opts); };
      window.__log = [];
      let last = "";
      const gone = (id) => { const e = document.getElementById(id); return e.classList.contains("hidden") || getComputedStyle(e).opacity === "0"; };
      const frame = () => {
        const row = { text: document.getElementById("textbox").innerText.replace(/\n/g, " "), anim: !!document.querySelector(".battle-anim-screen"),
          p1: gone("sprite-player"), p2: gone("sprite-foe") };
        const key = JSON.stringify(row);
        if (key !== last && !document.getElementById("field").classList.contains("hidden")) { last = key; window.__log.push(row); }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });

    // One battle: yours (o.p1, the first move of each) against o.p2 for o.turns turns. -> its record.
    const battle = async (name, o) => {
      label = name;
      await s.eval((o) => {
        Game.player.party = o.p1.map((d) => Object.assign(Party.create(d.species, d.level, { moves: d.moves }), { item: d.item || "" }));
        window.__battle = o; window.__log.length = 0; window.__over = false;
        Game.wildBattle(o.p2[0].species, o.p2[0].level).then(() => { window.__over = true; });
      }, o);
      for (const t0 = Date.now(); !(await s.eval(() => window.__over));) {
        assert(Date.now() - t0 < 120000, name + ": the battle ends");
        if (await s.eval(() => !!GbaMenus.showing)) await s.press("z", 80); else await s.wait(60);   // (FIGHT, and its one move)
      }
      const r = await s.eval(() => ({ log: window.__log.slice(), events: BattleScreen._test.battle.events.map((e) => e.join("|")) }));
      await s.wait(600);
      return r;
    };
    // A two-turn move's two turns in a battle's record, as they should look: by `side` ("p1" yours, "p2" the
    // foe's), a Mew unless opts.name. opts.end: how its second turn goes ("strike" by default; "miss", or the line
    // that says what stopped it, opts.until then a line before that one that it's still out of sight for).
    const check = (r, side, move, opts) => {
      opts = opts || {};
      const L = r.log, end = opts.end || "strike", name = opts.name || "Mew", other = side === "p1" ? "p2" : "p1", what = label + ": " + move + " (" + side + ")";
      const says = (e, text) => e.text !== undefined && (side === "p1" ? [name] : ["The wild " + name, "The opposing " + name]).some((n) => e.text === n + " " + text);
      const rows = (from, to) => L.slice(from, to).filter((e) => e.text !== undefined);
      const gone = (from, to, which) => rows(from, to).every((e) => e[which || side]);
      const shown = (from, to, which) => rows(from, to).every((e) => e.anim || !e[which || side]);   // (an animation draws them itself)
      const uses = L.map((e, i) => (says(e, "used " + move + "!") && !(i && says(L[i - 1], "used " + move + "!")) ? i : -1)).filter((i) => i >= 0);
      const plays = L.filter((e) => e.play === move && e.by === (side === "p1" ? 0 : 1)).map((e) => e.turn);
      const line = L.findIndex((e) => says(e, LINE[move]));
      const dump = () => "\n" + r.events.join("\n") + "\n" + L.map((e) => JSON.stringify(e)).join("\n");
      assert(uses.length && line > uses[0], what + ": its charging turn's line" + dump());
      assert(!L[uses[0]][side], what + ": in sight as it starts");
      if (move !== "Fly") assert.equal(plays[0], 0, what + ": the charging animation");
      // Between its turns: from its line until it's said to use the move again (or opts.until).
      const struck = end === "strike" || end === "miss";
      const back = struck ? uses.find((i) => i > line) : L.findIndex((e, i) => i > line && e.text !== undefined && e.text.endsWith(end));
      assert(back > line, what + ": its second turn: " + end + dump());
      const until = struck ? back : opts.until ? L.findIndex((e, i) => i > line && e.text === opts.until) : line;
      assert(until >= line && until <= back, what + ": " + opts.until + dump());
      if (AWAY.includes(move)) {
        assert(gone(line, until + 1), what + ": out of sight between its turns" + dump());
        if (move === "Sky Drop") assert(gone(line, until + 1, other), what + ": and the Pokémon it took up" + dump());
      } else assert(shown(uses[0], back + 1), what + ": in sight as it charges" + dump());
      if (end === "strike" && move !== "Fly") assert.deepEqual(plays.slice(0, 2), [0, 1], what + ": the charging animation, then the strike");
      if (end !== "strike") assert(!plays.includes(1), what + ": no strike");
      // Back in sight, both, once that's over, and for good.
      const settled = L.findIndex((e, i) => i > back && e.text !== undefined && !e.anim && !e.p1 && !e.p2);
      assert(settled > back && shown(settled, L.length, "p1") && shown(settled, L.length, "p2"), what + ": back in sight after" + dump());
    };
    const want = (...moves) => !only.length || moves.some((m) => only.includes(m));

    // Every two-turn move, yours and the slower foe's (null: Splash). (Yours never one that could stop the foe's
    // strike: Bounce's paralysis, Sky Attack's flinch.)
    for (const [mine, theirs] of [["Dig", "Solar Beam"], ["Dive", "Solar Blade"], ["Phantom Force", "Sky Attack"], ["Shadow Force", "Razor Wind"],
      ["Fly", "Skull Bash"], ["Sky Drop", null], ["Bounce", null], ["Geomancy", "Freeze Shock"], ["Meteor Beam", "Ice Burn"], ["Electro Shot", "Geomancy"],
      ["Solar Blade", "Meteor Beam"], ["Razor Wind", "Electro Shot"]]) {
      if (!want(mine, theirs)) continue;
      const r = await battle(mine + (theirs ? " and the foe's " + theirs : ""), { p1: [MEW(mine)], p2: [SHUCKLE(theirs)], turns: 2 });
      check(r, "p1", mine);
      if (theirs) check(r, "p2", theirs, { name: "Shuckle" });
    }
    // The foe's out of sight (its picture, the other one), yours charging.
    for (const [theirs, mine] of [["Dive", "Solar Beam"], ["Phantom Force", "Skull Bash"], ["Shadow Force", "Sky Attack"], ["Dig", "Freeze Shock"], ["Fly", "Ice Burn"],
      ["Bounce", null], ["Sky Drop", null]]) {
      if (!want(theirs, mine)) continue;
      const r = await battle("the foe's " + theirs + (mine ? " and " + mine : ""), { p1: [SHUCKLE(mine)], p2: [MEW(theirs)], turns: 2 });
      check(r, "p2", theirs);
      if (mine) check(r, "p1", mine, { name: "Shuckle" });
    }
    // Its strike misses (the foe's under the ground by then): back all the same.
    for (const move of ["Dive", "Bounce", "Phantom Force", "Shadow Force", "Fly"]) {
      if (!want(move)) continue;
      const r = await battle(move + " missing", { p1: [MEW(move)], p2: [SHUCKLE("Dig")], turns: 2 });
      assert(r.events.some((e) => /^-miss\|p1a/.test(e)), label);
      check(r, "p1", move, { end: "miss" });
    }
    // Protect; paralysis; hurting itself in its confusion; fainting (a sandstorm, 1 HP left) with another to come.
    for (const move of ["Dig", "Fly"]) {
      if (!want(move)) continue;
      check(await battle(move + " into Protect", { p1: [MEW(move)], p2: [SHUCKLE(["Splash", "Protect"])], foeMoves: [0, 1], turns: 2 }), "p1", move, { end: "miss" });
    }
    for (const move of ["Dive", "Sky Drop"]) {
      if (!want(move)) continue;
      check(await battle(move + " paralyzed", { p1: [MEW(move)], p2: [SHUCKLE()], turns: 2, second: "b.sides.p1.active.status = 'par';" + UNLUCKY }), "p1", move,
        { end: "It can't move!", until: move === "Sky Drop" ? null : "The wild Shuckle used Splash!" });
    }
    for (const move of AWAY) {
      if (!want(move)) continue;
      const r = await battle(move + " confused", { p1: [MEW(move)], p2: [SHUCKLE()], turns: 2,
        second: "const m = b.sides.p1.active; b.addVolatile(m, 'confusion', m); m.volatiles.confusion.time = 5;" + UNLUCKY });
      check(r, "p1", move, { end: "It hurt itself in its confusion!", until: "Mew became confused!" });
    }
    for (const move of ["Dig", "Sky Drop"]) {
      if (!want(move)) continue;
      const r = await battle("the foe's " + move + " fainting", { p1: [SHUCKLE()], p2: [MEW(move, { hp: 1 }), MEW("Splash")], trainer: true, weather: "Sandstorm", turns: 2 });
      check(r, "p2", move, { end: "The opposing Mew fainted!", until: "The opposing Mew is buffeted by the sandstorm!" });
    }
    // The Pokémon it was going to strike faints first, or is switched out: it strikes the next one.
    for (const move of ["Dive", "Fly"]) {
      if (!want(move)) continue;
      check(await battle(move + " and the target faints", { p1: [MEW(move)], p2: [{ species: "Chansey", level: 50, moves: ["Splash"], hp: 1 }, SHUCKLE()], trainer: true, weather: "Sandstorm", turns: 2 }), "p1", move);
      check(await battle(move + " and the target switches", { p1: [MEW(move)], p2: [SHUCKLE(), SHUCKLE()], trainer: true, foeSwitch: 2, turns: 2 }), "p1", move);
    }
    // Straight to the strike: a Power Herb (the foe's too), the sun, the rain.
    const atOnce = async (name, move, side, o) => {
      if (!want(move)) return;
      const r = await battle(name, o), rows = r.log.filter((e) => e.text !== undefined);
      assert.deepEqual(r.log.filter((e) => e.play === move && e.by === (side === "p1" ? 0 : 1)).map((e) => e.turn), move === "Fly" ? [] : [1], label + ": the strike's animation alone");
      assert(!rows.some((e) => e.text.endsWith(LINE[move])), label + ": no charging turn");
      const from = rows.findIndex((e) => e.text.endsWith("used " + move + "!"));
      assert(from >= 0 && rows.slice(from).every((e) => e.anim || (!e.p1 && !e.p2)), label + ": no one out of sight");
    };
    for (const move of ["Dig", "Dive", "Fly", "Solar Beam", "Meteor Beam"]) await atOnce(move + " with a Power Herb", move, "p1", { p1: [MEW(move, { item: "power-herb" })], p2: [SHUCKLE()], turns: 1 });
    await atOnce("the foe's Dig with a Power Herb", "Dig", "p2", { p1: [SHUCKLE()], p2: [MEW("Dig", { item: "power-herb" })], turns: 1 });
    await atOnce("Solar Beam in the sun", "Solar Beam", "p1", { p1: [MEW("Solar Beam")], p2: [SHUCKLE()], weather: "SunnyDay", turns: 1 });
    await atOnce("Solar Blade in the sun", "Solar Blade", "p1", { p1: [MEW("Solar Blade")], p2: [SHUCKLE()], weather: "SunnyDay", turns: 1 });
    await atOnce("Electro Shot in the rain", "Electro Shot", "p1", { p1: [MEW("Electro Shot")], p2: [SHUCKLE()], weather: "RainDance", turns: 1 });

    assert.deepEqual(s.errors.filter((e) => !/^Failed to load resource:/.test(e)), []);
    console.log("ok: two-turn moves in battle: charging animation then strike for all " + (AWAY.length + CHARGE.length) + ", out of sight between turns and back after every ending, Power Herb / sun / rain straight to the strike");
  } catch (e) {
    console.log("in: " + label); console.log(s.errors);
    await s.shot("failure").catch(() => {});
    throw e;
  } finally { await s.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
