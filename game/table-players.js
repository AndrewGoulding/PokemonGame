// Who sits at the Game Corner's card tables (game/poker.js, game/blackjack.js):
// trainers from around the game (window.WORLD_TRAINERS), by their class and
// name ("Gamer Hugo"), with their class's front picture as a portrait
// (assets/sprites/trainers/front/<pic>.png). Gym Leaders, the Elite Four,
// rivals, Team Rocket and pairs (Twins, Cool Couples...) stay away.
//
//   TablePlayers.pick(3, rng, ["Gamer Hugo"])   // -> [{ name, className, first, pic, style }], none of `away`
//
// `style` is how they play poker (Poker.STYLES): loose for the gamblers'
// sorts (Gamers, Bikers, Rockers, Cue Balls, Burglars, Jugglers, Sailors),
// tight for the careful ones (Gentlemen, Ladies, Scientists, Engineers,
// Super Nerds, Aroma Ladies), and either for anyone else.
(function () {
  const AWAY = /Leader|Elite Four|Champion|Rival|Team Rocket|Boss|Rocket|Pkmn Prof|Professor/i;
  const LOOSE = /Gamer|Biker|Rocker|Cue Ball|Burglar|Juggler|Sailor|Gambler/i;
  const TIGHT = /Gentleman|Lady|Scientist|Engineer|Super Nerd|Aroma/i;
  let pool = null;
  function trainers() {
    if (pool) return pool;
    const seen = new Set();
    pool = [];
    for (const t of Object.values(window.WORLD_TRAINERS || {})) {
      if (!t || !t.name || !t.className || !t.pic || AWAY.test(t.className) || /&| and /.test(t.name) || /couple|twins|kin|sis_and|young_couple|jessie/i.test(t.pic)) continue;
      const name = t.className + " " + t.name;
      if (seen.has(name)) continue;
      seen.add(name);
      pool.push({ name, className: t.className, first: t.name, pic: t.pic,
        style: LOOSE.test(t.className) ? "loose" : TIGHT.test(t.className) ? "tight" : null });
    }
    return pool;
  }
  function pick(n, rng, away) {
    rng = rng || Math.random;
    const out = [], skip = new Set(away || []);
    const all = trainers().filter((t) => !skip.has(t.name));
    for (let i = 0; i < n && all.length; i++) {
      const t = all.splice(Math.floor(rng() * all.length), 1)[0];
      out.push(Object.assign({}, t, { style: t.style || (rng() < 0.5 ? "steady" : rng() < 0.5 ? "loose" : "tight") }));
    }
    return out;
  }
  window.TablePlayers = { pick, trainers };
})();
