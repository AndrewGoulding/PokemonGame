// The reeling game (this game's own): with a Pokémon on the hook, you reel it in before it gets away
// (ui/fishing-game.js draws it). Down the side, the reel bar: your catch zone, which rises while you hold A and
// sinks when you let go, and the fish, darting up and down it as it fights. While the fish is in your zone the catch
// meter fills; while it's out, it drains. Full: landed. Empty, or too long: it got away. Now and then a treasure
// chest drifts into the bar: keep it in your zone a while and it's yours too. Keep the fish in your zone the whole
// way and it's a perfect catch (more fishing XP).
//
// How hard it fights: by the rod its bite came from (game/fishing.js: the Old Rod's easy, the Super Rod's hard) and
// how rare its slot was; your fishing level widens your zone.
//
//   const g = FishingGame.create(rng, { level, rod, slot });
//   FishingGame.step(g, { reel: aHeld })   // a frame (60 a second); g.events: what happened
//   g.over: "landed" | "escaped" | "quit"; FishingGame.result(g) -> { landed, perfect, treasure, xpBonus }
(function () {
  const TREASURE = ["pearl", "big-pearl", "heart-scale", "star-piece", "stardust", "nugget", "tiny-mushroom", "big-mushroom"];
  const TIME = 60 * 45;   // (45 seconds, at the most)

  function create(rng, o) {
    rng = rng || Math.random; o = o || {};
    const rod = ["old-rod", "good-rod", "super-rod"].indexOf(o.rod || "old-rod");
    // (how hard it fights, 1 to 5: its rod, and a rare slot of the Super Rod's)
    const fight = Math.min(5, 1 + Math.max(0, rod) + ((o.slot | 0) >= 3 ? 1 : 0) + ((o.slot | 0) >= 4 ? 1 : 0));
    const lv = Math.max(1, Math.min(100, o.level | 0 || 1));
    const size = Math.max(0.16, Math.min(0.42, 0.24 + lv * 0.0016 - fight * 0.015));
    return {
      rng, fight, frame: 0, over: null, events: [],
      // (your zone starts round the fish)
      zone: { y: Math.max(0, 0.3 - size / 2), v: 0, size },
      fish: { y: 0.3, target: 0.5, speed: 0.004 + fight * 0.0022, wait: 30 },
      meter: 0.3, perfect: true,
      // (the treasure: comes after a while, for a while, on one fish in three)
      treasure: rng() < 0.4 ? { at: 120 + Math.floor(rng() * 600), y: 0.2 + rng() * 0.6, shown: false, progress: 0, got: false, gone: false, life: 60 * 8,
        item: TREASURE[Math.floor(rng() * TREASURE.length)] } : null
    };
  }

  const inZone = (g, y) => y >= g.zone.y - 0.02 && y <= g.zone.y + g.zone.size + 0.02;

  function step(g, input) {
    g.events = [];
    if (g.over) return;
    g.frame++;
    if (input && input.quit) { g.over = "quit"; return; }
    // (your zone: up while you reel, down when you don't, bouncing a little off the ends)
    const z = g.zone;
    z.v += input && input.reel ? 0.0011 : -0.0009;
    z.v = Math.max(-0.02, Math.min(0.02, z.v)) * 0.985;
    z.y += z.v;
    if (z.y < 0) { z.y = 0; z.v = -z.v * 0.35; }
    if (z.y + z.size > 1) { z.y = 1 - z.size; z.v = -z.v * 0.35; }
    // (the fish: swims for a spot, waits there a little, then makes for another; the harder it fights, the further
    // and faster, and now and then it darts)
    const f = g.fish;
    if (--f.wait <= 0 && Math.abs(f.target - f.y) < 0.01) {
      const reach = 0.2 + g.fight * 0.12;
      f.target = Math.max(0.02, Math.min(0.98, f.y + (g.rng() * 2 - 1) * reach));
      f.wait = Math.floor(20 + g.rng() * (90 - g.fight * 12));
      f.dart = g.rng() < 0.08 * g.fight;
    }
    const sp = f.speed * (f.dart ? 2.2 : 1);
    f.y += Math.max(-sp, Math.min(sp, f.target - f.y));
    // (the catch meter)
    const hooked = inZone(g, f.y);
    if (hooked) g.meter += 0.0042;
    else if (g.frame > 60) { g.meter -= 0.0024 + g.fight * 0.0005; g.perfect = false; }   // (a second's grace to start)
    // (the treasure: shows, drifts a little, fills while it's in your zone, and goes if you leave it too long)
    const t = g.treasure;
    if (t && !t.got && !t.gone && g.frame >= t.at) {
      if (!t.shown) { t.shown = true; g.events.push({ type: "treasure" }); }
      t.y = Math.max(0.05, Math.min(0.95, t.y + Math.sin(g.frame / 40) * 0.0015));
      if (inZone(g, t.y)) t.progress += 0.008;
      if (t.progress >= 1) { t.got = true; g.events.push({ type: "treasure-got", item: t.item }); }
      else if (--t.life <= 0) { t.gone = true; g.events.push({ type: "treasure-gone" }); }
    }
    if (g.meter >= 1) { g.meter = 1; g.over = "landed"; g.events.push({ type: "landed" }); }
    else if (g.meter <= 0 || g.frame >= TIME) { g.meter = Math.max(0, g.meter); g.over = "escaped"; g.events.push({ type: "escaped" }); }
  }

  function result(g) {
    const landed = g.over === "landed";
    return { landed, perfect: landed && g.perfect, treasure: g.treasure && g.treasure.got ? g.treasure.item : null,
      // (more fishing XP: for a perfect catch, and for a hard fight)
      xpBonus: landed ? (g.perfect ? 10 : 0) + (g.fight - 1) * 2 : 0 };
  }

  window.FishingGame = { create, step, result, inZone, TREASURE, TIME };
})();
