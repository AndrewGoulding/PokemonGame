// Who sits at the Game Corner's card tables (game/poker.js, game/blackjack.js,
// game/mahjong.js): trainers from around the game (window.WORLD_TRAINERS), by
// their class and name ("Gamer Hugo"), with their class's front picture as a
// portrait (assets/sprites/trainers/front/<pic>.png). Gym Leaders, the Elite
// Four, rivals, Team Rocket and pairs (Twins, Cool Couples...) stay away,
// mostly: now and then (STAR_CHANCE a seat) one of the stars sits down
// instead: a Gym Leader or one of the Elite Four, or whoever the game adds
// (TablePlayers.setStars: Red, Leaf and your rival).
//
//   TablePlayers.pick(3, rng, ["Gamer Hugo"])   // -> [{ name, className, first, pic, style, star, sprite }], none of `away`
//   TablePlayers.setStars([{ name, pic, style, sprite }])   // the game's own stars, besides the Leaders and Elite Four
//
// `style` is how they play poker (Poker.STYLES): loose for the gamblers'
// sorts (Gamers, Bikers, Rockers, Cue Balls, Burglars, Jugglers, Sailors),
// tight for the careful ones (Gentlemen, Ladies, Scientists, Engineers,
// Super Nerds, Aroma Ladies), and either for anyone else; each star their
// own (STAR_STYLES). `sprite`: a star's overworld sprite, for the card room.
(function () {
  const AWAY = /Leader|Elite Four|Champion|Rival|Team Rocket|Boss|Rocket|Executive|Pkmn Prof|Professor/i;
  const LOOSE = /Gamer|Biker|Rocker|Cue Ball|Burglar|Juggler|Sailor|Gambler/i;
  const TIGHT = /Gentleman|Lady|Scientist|Engineer|Super Nerd|Aroma/i;
  const STAR_CHANCE = 0.03;
  const STAR_STYLES = { Brock: "tight", Misty: "loose", "Lt. Surge": "loose", Erika: "tight", Koga: "tight", Sabrina: "steady", Blaine: "loose",
    Giovanni: "steady", Lorelei: "tight", Bruno: "loose", Agatha: "loose", Lance: "steady" };
  let pool = null, leaders = null, extra = [];
  // The Gym Leaders and the Elite Four, once each.
  function stars() {
    if (!leaders) {
      leaders = [];
      const seen = new Set();
      // (Kanto's: Johto's trainers, HGSS_*, aren't at Kanto's tables.)
      for (const [id, t] of Object.entries(window.WORLD_TRAINERS || {})) {
        if (!t || !t.name || !t.pic || /^HGSS_/.test(id) || !/^(Leader|Elite Four)$/.test(t.className) || seen.has(t.name)) continue;
        seen.add(t.name);
        leaders.push({ name: t.className + " " + t.name, className: t.className, first: t.name, pic: t.pic, style: STAR_STYLES[t.name] || "steady",
          sprite: t.name.toLowerCase().replace(/[^a-z]+/g, "_"), star: true });
      }
    }
    return leaders.concat(extra);
  }
  function setStars(list) {
    extra = (list || []).map((p) => Object.assign({ className: p.name.split(" ").slice(0, -1).join(" "), first: p.name.split(" ").pop(), style: "steady" }, p, { star: true }));
  }
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
    const all = trainers().filter((t) => !skip.has(t.name)), starry = stars().filter((t) => !skip.has(t.name));
    for (let i = 0; i < n && all.length; i++) {
      // (A star, rarely.)
      if (starry.length && rng() < STAR_CHANCE) { out.push(Object.assign({}, starry.splice(Math.floor(rng() * starry.length), 1)[0])); continue; }
      const t = all.splice(Math.floor(rng() * all.length), 1)[0];
      out.push(Object.assign({}, t, { style: t.style || (rng() < 0.5 ? "steady" : rng() < 0.5 ? "loose" : "tight") }));
    }
    return out;
  }
  window.TablePlayers = { pick, trainers, stars, setStars, STAR_CHANCE };
})();
