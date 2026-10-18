// Catching (Gen 6 formula)
// Depends on: window.DEX (dex.js)
//
//   Catching.attempt({ species, level, hp, maxhp, status, types }, "great-ball",
//                    { turn: 1, night: false, caughtBefore: false }, Math.random)
//   // -> { caught: true|false, shakes: 0..3 }
//
// a = (3 x maxHP - 2 x HP) x catch rate x ball bonus / (3 x maxHP) x status bonus.
// The ball makes four shake checks, each passing with probability b / 65536 where
// b = 65536 / (255 / a)^(3/16). All four pass: caught. a >= 255: always caught.
// Critical captures aren't modelled (they need a Pokédex caught count).

(function () {
  "use strict";

  // Kurt's Apricorn Balls, as HeartGold and SoulSilver have them (as their
  // makers meant: the Moon Ball for a Moon Stone's family, the Love Ball for
  // the opposite gender). The Heavy Ball adds to the catch rate by weight.
  const MOON_STONE = new Set(["Nidoran-F", "Nidorina", "Nidoqueen", "Nidoran-M", "Nidorino", "Nidoking", "Cleffa", "Clefairy", "Clefable",
    "Igglybuff", "Jigglypuff", "Wigglytuff", "Skitty", "Delcatty", "Munna", "Musharna"]);
  function heavyBall(target) {
    const dex = window.DEX[target.species] || {}, rate = dex.captureRate || 45, kg = dex.weight || 0;
    const add = kg >= 409.6 ? 40 : kg >= 307.2 ? 30 : kg >= 204.8 ? 20 : -20;
    return Math.max(1, rate + add) / rate;
  }

  // Ball bonuses. ctx: { target, turn, night, caughtBefore, underwater,
  // fishing, user: { species, level, gender } (yours, for the Level and Love Balls) }
  const BALLS = {
    "poke-ball": () => 1,
    "great-ball": () => 1.5,
    "ultra-ball": () => 2,
    "master-ball": () => Infinity,
    "safari-ball": () => 1.5,
    "sport-ball": () => 1.5,
    "premier-ball": () => 1,
    "luxury-ball": () => 1,
    "heal-ball": () => 1,
    "cherish-ball": () => 1,
    "friend-ball": () => 1,
    "net-ball": (ctx) => (ctx.target.types.some((t) => t === "Bug" || t === "Water") ? 3 : 1),
    "nest-ball": (ctx) => Math.max(1, (41 - ctx.target.level) / 10),
    "repeat-ball": (ctx) => (ctx.caughtBefore ? 3 : 1),
    "timer-ball": (ctx) => Math.min(4, 1 + ((ctx.turn - 1) * 1229) / 4096),
    "quick-ball": (ctx) => (ctx.turn <= 1 ? 5 : 1),
    "dusk-ball": (ctx) => (ctx.night ? 3.5 : 1),
    "dive-ball": (ctx) => (ctx.underwater ? 3.5 : 1),
    "level-ball": (ctx) => {
      const mine = ctx.user ? ctx.user.level : 0, theirs = ctx.target.level;
      return mine >= theirs * 4 ? 8 : mine >= theirs * 2 ? 4 : mine > theirs ? 2 : 1;
    },
    "lure-ball": (ctx) => (ctx.fishing ? 3 : 1),
    "moon-ball": (ctx) => (MOON_STONE.has(ctx.target.species) ? 4 : 1),
    "love-ball": (ctx) => (ctx.user && ctx.user.species === ctx.target.species && ctx.user.gender && ctx.target.gender &&
      ctx.user.gender !== "N" && ctx.target.gender !== "N" && ctx.user.gender !== ctx.target.gender ? 8 : 1),
    "heavy-ball": (ctx) => heavyBall(ctx.target),
    "fast-ball": (ctx) => ((window.DEX[ctx.target.species] || {}).spe >= 100 ? 4 : 1)
  };

  const STATUS_BONUS = { slp: 2.5, frz: 2.5, par: 1.5, psn: 1.5, tox: 1.5, brn: 1.5 };

  function ballBonus(ball, ctx) {
    const fn = BALLS[ball] || BALLS["poke-ball"];
    return fn(ctx);
  }

  // The "a" value: 255 or more means a guaranteed catch.
  function catchValue(target, ball, ctx) {
    const bonus = ballBonus(ball, Object.assign({ target, turn: 1 }, ctx));
    if (bonus === Infinity) return Infinity;
    const dex = window.DEX[target.species];
    const rate = dex ? dex.captureRate : 45;
    const m = target.maxhp, h = Math.max(1, target.hp);
    const a = (((3 * m - 2 * h) * rate * bonus) / (3 * m)) * (STATUS_BONUS[target.status] || 1);
    return Math.max(1, Math.floor(a));
  }

  // Chance (0-1) that one throw catches the target.
  function chance(target, ball, ctx) {
    const a = catchValue(target, ball, ctx);
    if (a >= 255) return 1;
    const b = Math.floor(65536 / Math.pow(255 / a, 0.1875));
    return Math.pow(b / 65536, 4);
  }

  function attempt(target, ball, ctx, rng) {
    const a = catchValue(target, ball, ctx);
    if (a >= 255) return { caught: true, shakes: 3 };
    const b = Math.floor(65536 / Math.pow(255 / a, 0.1875));
    let passes = 0;
    while (passes < 4 && Math.floor(rng() * 65536) < b) passes++;
    return { caught: passes === 4, shakes: Math.min(3, passes) };
  }

  window.Catching = { BALLS, STATUS_BONUS, ballBonus, catchValue, chance, attempt };
})();
