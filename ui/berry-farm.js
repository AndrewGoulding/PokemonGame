// Celadon's Berry Farm (tools/build-berry-farm.js draws it): Emerald's berry
// trees (src/berry.c, data/scripts/berry_tree.inc), grown on the game's step
// clock. Plant a Berry in an empty spot of soft soil; it grows through
// Emerald's five stages (planted, sprouted, taller, flowering, with berries),
// each lasting that berry's stageDuration in hours (100 steps an hour:
// Player.STEPS_PER_HOUR); its berries stay until you pick them (Emerald's
// drop and grow again: not here). Water it once in each of its first four
// stages with the Wailmer Pail (the caretaker gives you one) for more berries:
// Emerald's CalcBerryYield, from the berry's fewest to its most as you water
// more; as in X and Y you can see which want water (dry soil round them, a
// paler mound) and which have had it (wet soil, darker). This game's own: the
// higher your farming level (game/berry-picking.js), the faster everything
// grows, 1 + level / 50 times as fast (twice at 50, three times at 100), and
// the more berries you pick, 1 + level / 100 times as many (twice at 100);
// planting earns 1 farming XP, and picking 2 for each berry.
//
//   const F = BerryFarm.create(env)
//   F.step()                  // each step you take, anywhere
//   F.visible(person, map)    // a spot's tree as it is now (its look), or undefined
//   await F.talk(person)      // true if it was the farm's (a spot, the caretaker)
//   F.rate()                  // how many times as fast as Emerald's they grow
//
// env: player(), say(pages), confirm(question), chooseBerry() (an id from the
// Bag's Berries pocket, or null), jingle(song, pages) (said over a jingle), farmingLevel(),
// addFarmingXp(n) (and says if the level rose), refresh() (the people on the
// map looked at again), here() (the map you're on).
//
// player.flags.berryFarm: { pail (got the Wailmer Pail), trees: { [spot]:
// { berry, stage (1-5), left (steps till the next, at Emerald's pace), watered
// [4], yield } } }.
(function () {
  "use strict";

  const D = () => window.BERRY_FARM;
  const STAGES = 5, WATER_STAGES = 4;
  const FRAME = [0, 0, 2, 4, 6, 8];   // (each stage's picture in its sheet: where Emerald's anims end)
  const DRY = 9, WET = 18;            // (the same on dry soil, wanting water; on wet, watered)
  const rnd = (n) => Math.floor(Math.random() * n);

  function create(env) {
    const state = () => { const f = env.player().flags; return f.berryFarm || (f.berryFarm = { pail: false, trees: {} }); };
    const info = (berry) => D().berries[berry];
    const stageSteps = (berry) => info(berry).hours * ((window.Player && window.Player.STEPS_PER_HOUR) || 100);
    const rate = () => 1 + (env.farmingLevel() || 1) / 50;
    const spotOf = (person) => { const m = /^BerryFarm_Tree_(\d+)$/.exec(person.script || ""); return m ? +m[1] : -1; };
    // (Its name, and as many: "Cheri Berry", "4 Cheri Berries".)
    const name = (berry, n) => { const s = window.Bag.name(berry); return n > 1 ? s.replace(/y$/, "ies") : s; };
    const fill = (pages, berry, n) => pages.map((p) => p.replace(/\{BERRY\}/g, name(berry, n)).replace(/\{N\}/g, n).replace(/\{PLAYER\}/g, env.player().name));

    // Emerald's CalcBerryYieldInternal: unwatered, the fewest; watered in n
    // stages, a draw from the nth quarter of the range up (rounded).
    function yieldOf(t) {
      const { min, max } = info(t.berry), water = t.watered.filter(Boolean).length;
      if (!water) return min;
      const lo = (max - min) * (water - 1), hi = (max - min) * water, r = lo + rnd(hi - lo + 1);
      return min + Math.floor(r / WATER_STAGES) + (r % WATER_STAGES >= WATER_STAGES / 2 ? 1 : 0);
    }
    // A stage over (BerryTreeGrow): on to the next; flowering into berries
    // works out how many, and there it stays till they're picked.
    function grow(t) {
      if (t.stage === STAGES - 1) t.yield = yieldOf(t);
      t.stage++;
      t.left += stageSteps(t.berry);
    }
    function step() {
      if (!D()) return;
      const trees = state().trees, r = rate();
      let changed = false;
      for (const spot of Object.keys(trees)) {
        const t = trees[spot];
        if (t.stage >= STAGES) continue;
        t.left -= r;
        while (t.stage < STAGES && t.left <= 0) { grow(t); changed = true; }
      }
      if (changed && env.here() === D().map) env.refresh();
    }

    // A spot as it is: its tree's picture at its stage, or nothing (empty soil).
    function visible(person, map) {
      if (!D() || map !== D().map) return undefined;
      const spot = spotOf(person);
      if (spot < 0) return undefined;
      const t = state().trees[spot];
      if (!t) return { sprite: "berry_soil" };
      const soil = t.stage >= STAGES ? 0 : t.watered[t.stage - 1] ? WET : DRY;
      return { sprite: "berry_tree_" + info(t.berry).tree, frame: FRAME[t.stage] + soil };
    }

    // ---------- Talking to a spot (BerryTreeScript) ----------
    const T = {
      soil: ["It's soft, loamy soil."],
      wantToPlant: "It's soft, loamy soil.\nWant to plant a Berry?",
      planted: ["{PLAYER} planted one {BERRY} in\nthe soft, loamy soil."],
      stage: [null, ["One {BERRY} was planted here."], ["{BERRY} has sprouted."], ["This {BERRY} plant is growing taller."]],
      flowering: (care) => ["These {BERRY} flowers are blooming\n" + care + "."],
      found: "You found {N} {BERRY}!",
      wantToPick: "Do you want to pick the\n{BERRY}?",
      picked: ["{PLAYER} picked the {N} {BERRY}.", "{PLAYER} put away the {BERRY}\nin the Bag's Berries Pocket.", "The soil returned to its soft and\nloamy state."],
      leftUnpicked: ["{PLAYER} left the {BERRY}\nunpicked."],
      wantToWater: "Want to water the {BERRY} with the\nWailmer Pail?",
      watered: ["{PLAYER} watered the {BERRY}.", "The plant seems to be delighted."]
    };
    const hasBerries = () => Object.keys(env.player().bag).some((id) => /-berry$/.test(id) && info(id) && env.player().bag[id] > 0);
    async function talkSpot(spot) {
      const trees = state().trees, t = trees[spot];
      if (!t) {
        if (!hasBerries()) { await env.say(T.soil); return; }
        if (!(await env.confirm(T.wantToPlant))) return;
        const berry = await env.chooseBerry();
        if (!berry || !info(berry)) return;
        window.Player.removeItem(env.player(), berry, 1);
        trees[spot] = { berry, stage: 1, left: stageSteps(berry), watered: [false, false, false, false], yield: 0 };
        env.refresh();
        await env.say(fill(T.planted, berry));
        await env.addFarmingXp(1);
        return;
      }
      if (t.stage === STAGES) {
        // (More with your farming level: 1 + level / 100 times as many.)
        const n = Math.max(t.yield, Math.round(t.yield * (1 + (env.farmingLevel() || 1) / 100))), pages = fill([T.found, T.wantToPick], t.berry, n);
        await env.say([pages[0]]);
        if (!(await env.confirm(pages[1]))) { await env.say(fill(T.leftUnpicked, t.berry)); return; }
        window.Player.addItem(env.player(), t.berry, n);
        delete trees[spot];
        env.refresh();
        const picked = fill(T.picked, t.berry, n);
        await env.jingle("mus_obtain_berry", [picked[0]]);
        await env.say(picked.slice(1));
        await env.addFarmingXp(2 * n);
        return;
      }
      const water = t.watered.filter(Boolean).length;
      await env.say(fill(t.stage === 4 ? T.flowering(water === 0 ? "prettily" : water === WATER_STAGES ? "very beautifully" : "cutely") : T.stage[t.stage], t.berry, 1));
      // (Watering: once a stage, with the Wailmer Pail.)
      if (!window.Player.itemCount(env.player(), "wailmer-pail") || t.watered[t.stage - 1]) return;
      if (!(await env.confirm(fill([T.wantToWater], t.berry)[0]))) return;
      t.watered[t.stage - 1] = true;
      env.refresh();   // (the soil wet now)
      await env.say(fill(T.watered, t.berry));
    }

    // ---------- The caretaker ----------
    // She gives you the Wailmer Pail, and tells you how fast your farming makes things grow.
    async function caretaker() {
      const s = state();
      if (!s.pail) {
        await env.say(["Welcome to the Celadon Berry Farm!", "Plant any Berry you like in the soft\nsoil here, and it'll grow into a tree.",
          "Water it while it grows, and it'll\nbear more Berries. Here, take this!"]);
        window.Player.addItem(env.player(), "wailmer-pail");
        s.pail = true;
        await env.jingle("mus_obtain_key_item", [env.player().name + " received the Wailmer Pail!"]);
        await env.say(["Water a tree once each time it grows,\nup until it flowers.", "Pale, dry soil round a tree means\nit wants water.", "Dark, wet soil means it's had some."]);
      }
      const r = rate(), x = Math.round(r * 10) / 10;
      const more = Math.round((1 + (env.farmingLevel() || 1) / 100) * 10) / 10;
      await env.say(r < 1.05 ? ["The more you know about farming,\nthe faster Berries grow for you,", "and the more of them you pick!"]
        : ["With your farming know-how, Berries\ngrow " + x + " times as fast for you,", "and you pick " + more + " times as many!"]);
    }

    async function talk(person) {
      if (!D()) return false;
      if (person.script === "BerryFarm_Caretaker") { await caretaker(); return true; }
      const spot = spotOf(person);
      if (spot < 0) return false;
      await talkSpot(spot);
      return true;
    }

    return { step, visible, talk, rate };
  }

  window.BerryFarm = { create };
})();
