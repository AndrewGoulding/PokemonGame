// The Pokéathlon Dome (HGSS's, north of Route 35): its courses, Athlete
// Points, the Athlete Shop and its records. The Dome's scripts are HGSS's own
// (ui/johto-script.js runs them; the receptions' is scr_seq_0167, which
// tools/build-pokeathlon.js adds to data/johto-maps.js); the commands of
// theirs that are the Pokéathlon's come here (handles(op), command(op, args, api)).
// ui/pokeathlon-events.js has the ten events.
//
//   Pokeathlon.attach(game)    // ui/game.js: what it needs of the game (below)
//   Pokeathlon.performance(record, day)   // a Pokémon's Performance on that day of the month:
//     // { speed, power, skill, stamina, jump } (1-5 stars), and .max (as high as each goes)
//   await Pokeathlon.runCourse(course, { supreme, flag })   // -> { score, place, points } or null (didn't go in)
//
// A course (HGSS's overlay 96) is three events, with three of your Pokémon
// against three teams of the computer's; each event's points (HGSS's for its
// result, ui/pokeathlon-events.js) and then the closing ceremony's bonuses
// (ov96_021EDA58): the Challenge Bonus, 75 less the team's base stars
// (performance.narc's, 15 to 75 of them); 10 for each Pokémon that didn't
// fail, fall or get in its own way (the No-Miss Bonus); 20 for the Pokémon
// that brought in the most (the points leader); and 10 for the one that
// jumped, tackled, failed or dashed the most (one of those four, drawn: the
// prize for effort). Ties are settled by a drawing. Your score is that many
// Athlete Points (99,999 at most; ov96_021E7718 adds them), and the
// reception's script gives 100 more for coming first (300 in the Supreme Cup).
// Coming first, each of your three Pokémon (its species) wins the course's
// Medal. HGSS's Performance (src/pokemon.c, CalcBoxMonPokeathlonPerformance):
// each species' base stars, and how far they go up or down, from
// performance.narc; today's go up or down by its nature and its personality's
// digits with the day of the month (here the game clock's day); no Aprijuice.
//
// Kept in player.flags.pokeathlon: { ap, rank (HGSS's friendship points,
// ScrCmd_725's), rec: HGSS's counts (save's Pokeathlon_UnkSubStruct_B00:
// joined, wins, lasts, bonuses, eventWins [10], eventLasts, instructions,
// time, and its Pokémon's failed ... impeded), courses: { course: [best
// winning score, species x3] } (the Trust room's), events: { id: { played,
// top: [[result, species x3] x5] } } (the Friendship room's), medals: {
// species: course bits }, statues: [species x3] (the last winning team),
// shop: { day, bought: [slots] } }.
(function () {
  "use strict";

  const DATA = () => window.POKEATHLON || { perf: {}, natures: [], prizes: [] };
  const STATS = ["speed", "power", "skill", "stamina", "jump"];
  const STAT_LABELS = { speed: "SPD", power: "POW", skill: "SKL", stamina: "STM", jump: "JMP" };
  // (HGSS's Performance order, PERFORMANCE_POWER ... PERFORMANCE_STAMINA, as the nature table has it.)
  const PERF_ORDER = ["power", "skill", "speed", "jump", "stamina"];
  // The five courses, as the Pokeathlon command numbers them (scr_seq_0167;
  // ov96_021E7FA8's Medal bits 1, 2, 4, 8, 16), each with its three events
  // (scr_seq_D49R0102's "About events").
  const COURSES = [
    { key: "speed", name: "Speed Course", events: ["hurdle", "pennant", "relay"] },
    { key: "power", name: "Power Course", events: ["block", "circle", "goal"] },
    { key: "skill", name: "Skill Course", events: ["snow", "goal", "pennant"] },
    { key: "stamina", name: "Stamina Course", events: ["ring", "relay", "block"] },
    { key: "jump", name: "Jump Course", events: ["lamp", "disc", "hurdle"] }];
  // (The events in HGSS's order: Hurdle Dash ... Goal Roll, ScrCmd_724 0-9's.)
  const EVENT_ORDER = ["hurdle", "pennant", "circle", "block", "disc", "lamp", "relay", "ring", "snow", "goal"];
  // The Friendship room's (ov96_021E80C4: every event's best past these,
  // ov96_0221A894; Hurdle Dash's a time, so under it).
  const FRIENDSHIP = { hurdle: 3000, pennant: 35, circle: 40, block: 80, disc: 40, lamp: 350, relay: 12288, ring: 70, snow: 30, goal: 3 };
  const lower = (id) => id === "hurdle";
  const RIVALS = ["Gina", "Roman", "Kiri", "Dalton", "Mira", "Tobias", "Ayla", "Hugo", "Lena", "Caspian", "Nadia", "Orrin", "Pia", "Felix", "Junie"];
  const MAX_AP = 99999, MAX_COUNT = 9999999;
  // (HGSS's counts, as its save keeps them; ACTS are each Pokémon's.)
  const ACTS = ["failed", "jumped", "points", "tackled", "fell", "dashed", "switched", "impeded"];
  const COUNTS = ["joined", "wins", "lasts", "bonuses", "eventLasts", "instructions", "time"].concat(ACTS);

  let G = null;   // (the game: attach())
  const P = (k) => window.PokeathlonEvents[k];
  // (The game's clock: no real one here. HGSS's Performance goes by the day
  // of the month, the shop by the day of the week.)
  const clock = () => (window.Player && window.Player.gameTime ? window.Player.gameTime(G && G.player()) : { day: 0, weekday: 1, today: "day0" });
  const dayOfMonth = () => (clock().day % 31) + 1;

  // ---------- Performance ----------

  // HGSS's PokeathlonStatScoreToStars: how many stars a day's swing is worth.
  function swingStars(n) {
    return n <= -120 ? -4 : n <= -80 ? -3 : n <= -40 ? -2 : n <= -15 ? -1 : n <= 14 ? 0 : n <= 39 ? 1 : n <= 79 ? 2 : n <= 119 ? 3 : 4;
  }
  // A species' base stars, and their lowest and highest: [[base, lo, hi] for
  // each stat], 0-4 (one star to five). Past HGSS's 493: from its base stats.
  function baseOf(species) {
    const s = DATA().perf[species] || DATA().perf[String(species).split("-")[0]];
    if (s) return STATS.map((k, i) => [+s[i * 3], +s[i * 3 + 1], +s[i * 3 + 2]]);
    const d = (window.DEX || {})[species] || {};
    const v = { speed: d.spe, power: d.atk, skill: ((d.spa || 0) + (d.spd || 0)) / 2, stamina: ((d.hp || 0) + (d.def || 0)) / 2, jump: ((d.spe || 0) + (d.atk || 0)) / 2 };
    return STATS.map((k) => { const b = Math.max(0, Math.min(4, Math.round((v[k] || 60) / 30) - 1)); return [b, Math.max(0, b - 1), Math.min(4, b + 1)]; });
  }
  function performance(r, day) {
    day = day || dayOfMonth();
    const base = baseOf(r.species), pid = (r.personality >>> 0) || 0;
    const nat = DATA().natures.find((n) => n[0] === r.nature) || ["", 0, 0, 0, 0, 0];
    const out = { max: {} };
    STATS.forEach((k, i) => {
      const j = PERF_ORDER.indexOf(k);   // (HGSS's index: the nature's column, the personality's digit)
      const digit = Math.floor(pid / Math.pow(10, j)) % 10;
      const swing = nat[1 + j] + (2 * ((digit + (day + (7 - j)) * (day + (j + 3))) % 10) - 9);
      const [b, lo, hi] = base[i];
      out[k] = Math.max(lo, Math.min(hi, b + swingStars(swing))) + 1;
      out.max[k] = hi + 1;
    });
    return out;
  }
  // The Challenge Bonus (ov96_021ED954): 75 less the team's base stars.
  const challenge = (team) => Math.max(0, Math.min(75, 75 - team.mons.reduce((n, m) => n + baseOf(m.species).reduce((a, b) => a + b[0] + 1, 0), 0)));

  // ---------- Saved ----------

  function save() {
    const f = G.player().flags;
    const s = f.pokeathlon || (f.pokeathlon = {});
    if (s.ap == null) s.ap = 0;
    if (s.rank == null) s.rank = 0;
    if (!s.rec) {
      // (An older save's: its entries, wins, jumps and tackles.)
      s.rec = { eventWins: EVENT_ORDER.map(() => 0) };
      for (const k of COUNTS) s.rec[k] = 0;
      Object.assign(s.rec, { joined: s.entries | 0, wins: s.wins | 0, jumped: s.jumps | 0, tackled: s.tackles | 0 });
      for (const k of ["entries", "wins", "jumps", "tackles", "earned", "best", "medals"]) delete s[k];
      s.events = {};
    }
    s.courses = s.courses || {}; s.events = s.events || {}; s.medals = s.medals || {};
    return s;
  }
  const count = (rec, k, n) => { rec[k] = Math.min(MAX_COUNT, (rec[k] || 0) + (n == null ? 1 : n)); };
  function addAp(n) {
    const s = save();
    s.ap = Math.max(0, Math.min(MAX_AP, s.ap + n));
  }
  // The Athlete Shop's prizes today (ScrCmd_771: the day of the week's list,
  // a longer one with the National Pokédex), each once a day.
  function prizesToday(weekday) {
    weekday = weekday == null ? clock().weekday : weekday;
    const nat = G && G.nationalDex ? G.nationalDex() : false;
    return DATA().prizes[weekday + (nat ? 7 : 0)] || [];
  }
  function shopToday() {
    const s = save(), today = clock().today;
    if (!s.shop || s.shop.day !== today) s.shop = { day: today, bought: [] };
    return s.shop;
  }

  // ---------- Choosing your team ----------

  const scene = () => G.scene();
  // A or B, on one of the screens here.
  function key() {
    return new Promise((resolve) => {
      const K = { z: "a", Z: "a", " ": "a", Enter: "a", x: "b", X: "b", Escape: "b" };
      const h = (e) => {
        const k = K[e.key];
        if (!k || e.repeat) return;
        e.preventDefault(); e.stopImmediatePropagation();
        document.removeEventListener("keydown", h, true);
        G.sfx("se_select");
        resolve(k);
      };
      document.addEventListener("keydown", h, true);
    });
  }
  // Three of your party, in turn (B takes back the last one chosen).
  async function chooseTeam(course) {
    const party = G.player().party, picks = [];
    for (;;) {
      if (picks.length === 3) return picks;
      const notes = party.map((r) => (r.egg ? "NOT ABLE" : picks.includes(r) ? ["1ST", "2ND", "3RD"][picks.indexOf(r)] : "ABLE"));
      const next = party.findIndex((x) => !x.egg && !picks.includes(x));
      const r = await G.choosePartyFor("Choose 3 POKéMON. (" + (picks.length + 1) + "/3)", notes, Math.max(0, next));
      if (!r) { if (!picks.length) return null; picks.pop(); continue; }
      if (r.egg || picks.includes(r)) continue;
      picks.push(r);
    }
  }
  // The computer's teams: three Pokémon each of Kanto's and Johto's, as they come.
  function rivalTeams(rng, supreme) {
    const pool = Object.keys(DATA().perf).filter((n) => window.DEX && window.DEX[n] && window.DEX[n].id <= 251);
    const names = RIVALS.slice().sort(() => rng() - 0.5);
    const natures = DATA().natures.map((n) => n[0]);
    return [0, 1, 2].map((t) => ({ name: names[t], mons: [0, 1, 2].map(() => {
      const species = pool[Math.floor(rng() * pool.length)] || "Pikachu";
      const stats = performance({ species, personality: Math.floor(rng() * 4294967296), nature: natures[Math.floor(rng() * natures.length)] });
      // (The Supreme Cup's are the best there are.)
      if (supreme) for (const k of STATS) stats[k] = Math.min(5, stats[k] + 1);
      return { species, name: species, stats };
    }) }));
  }

  // ---------- The screens between events ----------

  const W = 240, H = 160;
  function canvasIn(root) {
    root.classList.add("evo", "athlon");
    root.innerHTML = "";
    const c = document.createElement("canvas");
    c.className = "world evo-scene athlon-canvas";
    c.width = W * 2; c.height = H * 2;
    root.appendChild(c);
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.setTransform(2, 0, 0, 2, 0, 0);
    return g;
  }
  function backdrop(g, title, sub) {
    g.fillStyle = "#3a4a8a"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#4858a0"; for (let y = 0; y < H; y += 8) for (let x = (y >> 3) % 2 * 8; x < W; x += 16) g.fillRect(x, y, 8, 8);
    g.fillStyle = "#e8483c"; g.fillRect(0, 0, W, 18);
    g.fillStyle = "#90201a"; g.fillRect(0, 18, W, 1);
    P("text")(g, title, 6, 1, "white");
    if (sub) P("text")(g, sub, W - 6, 1, "gold", "right");
  }
  // A star: lit (today's), or dark (as high as it can go).
  function star(g, x, y, lit) {
    const rows = ["..#..", "#####", ".###.", ".#.#.", "#...#"];
    g.fillStyle = lit ? "#f0b818" : "#b8c0d8";
    rows.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] === "#") g.fillRect(x + i, y + j, 1, 1); });
  }
  // Each of the team's Pokémon, with its stars today for each Performance stat.
  function teamCard(g, team, top) {
    team.mons.forEach((m, i) => {
      const y = top + i * 40;
      P("box")(g, 4, y, W - 8, 38);
      P("drawMon")(g, { team: 0, icon: P("iconOf")(m.species), t: 0, face: -1, z: 0 }, 22, y + 34, { noShadow: true });
      P("text")(g, m.name, 40, y + 1, "dark");
      STATS.forEach((k, j) => {
        const x = 40 + j * 39;
        P("text")(g, STAT_LABELS[k], x, y + 13, "dark");
        for (let n = 0; n < m.stats.max[k]; n++) star(g, x + n * 6, y + 29, n < m.stats[k]);
      });
    });
  }
  async function showTeam(course, team) {
    const g = canvasIn(scene());
    backdrop(g, course.name, "Your team");
    teamCard(g, team, 22);
    P("text")(g, "A: Enter   B: Choose again", W / 2, 143, "white", "center");
    return (await key()) === "a";
  }
  const ORD = ["1st", "2nd", "3rd", "4th"];
  // A team's row: its place (or none), name, Pokémon (or just those named) and what it got.
  function row(g, teams, t, y, place, right, only) {
    const C = P("TEAM")[t];
    P("box")(g, 4, y, W - 8, 22);
    g.fillStyle = C[2]; g.fillRect(8, y + 3, 22, 16); g.fillStyle = C[0]; g.fillRect(9, y + 4, 20, 14);
    if (place != null) P("text")(g, ORD[place], 19, y + 3, "white", "center");
    P("text")(g, teams[t].name, 34, y + 3, "dark");
    teams[t].mons.forEach((m, k) => { if (!only || only.includes(k)) P("drawMon")(g, { team: t, icon: P("iconOf")(m.species), t: 0, face: -1, z: 0 }, 112 + k * 22, y + 21, { noShadow: true }); });
    P("text")(g, right, W - 10, y + 3, teams[t].you ? "gold" : "dark", "right");
  }
  // A screen of the closing ceremony: rows, and the announcer's words, a page at a time (A).
  async function announce(title, sub, draw, pages) {
    for (const lines of pages) {
      const g = canvasIn(scene());
      backdrop(g, title, sub);
      if (draw) draw(g);
      P("box")(g, 2, 116, W - 4, 42);
      [].concat(lines).forEach((line, i) => P("text")(g, line, 10, 120 + i * 16, "dark"));
      await key();
    }
  }
  // An event's result, in its own measure.
  function measure(id, raw) {
    if (id === "hurdle") return (raw / 60).toFixed(1) + "s";
    if (id === "relay") return (raw / 1024).toFixed(1) + " laps";
    return String(raw);
  }
  async function eventResults(id, teams, r, n) {
    const order = [0, 1, 2, 3].sort((a, b) => r.points[b] - r.points[a] || a - b);
    await announce(P("EVENTS")[id].name, "Event " + n + "/3", (g) => order.forEach((t, i) => {
      const place = r.points.filter((p) => p > r.points[t]).length;
      row(g, teams, t, 22 + i * 23, place, measure(id, r.raw[t]) + "   " + r.points[t] + " pts", []);
    }), [[["All right! Results of the first event!?", "So exciting! How was the second event?!", "The end! How was the third event?!"][n - 1]]]);
  }

  // ---------- The closing ceremony (ov96_021EBB64) ----------

  // What each team's Pokémon did over the three events, added up (the
  // points each brought in: its share of its team's points in each event).
  function addActs(results) {
    return [0, 1, 2, 3].map((t) => [0, 1, 2].map((i) => {
      const a = Object.fromEntries(ACTS.map((k) => [k, 0]));
      for (const r of results) {
        for (const k of ACTS) if (k !== "points") a[k] += r.acts[t][i][k] | 0;
        const all = r.acts[t].reduce((n, x) => n + Math.max(0, x.points | 0), 0);
        if (all) a.points += Math.round(r.points[t] * Math.max(0, r.acts[t][i].points | 0) / all);
      }
      return a;
    }));
  }
  // The bonuses (ov96_021EDA58): each team's, and which Pokémon won which.
  function bonuses(teams, acts, rng) {
    const mons = [];
    acts.forEach((team, t) => team.forEach((a, i) => mons.push({ t, i, a })));
    const best = (k) => Math.max(...mons.map((m) => m.a[k]));
    // (The prize for effort: one of the four, drawn, that someone did.)
    const EFFORT = ["jumped", "tackled", "failed", "dashed"];
    const from = Math.floor(rng() * 4);
    let effort = null;
    for (let k = 0; k < 4 && !effort; k++) if (best(EFFORT[(from + k) % 4]) > 0) effort = EFFORT[(from + k) % 4];
    const pick = (test) => mons.filter(test).map((m) => [m.t, m.i]);
    const top = best("points");
    return {
      challenge: teams.map(challenge),
      noMiss: pick((m) => !m.a.failed && !m.a.fell && !m.a.impeded),
      leader: pick((m) => m.a.points === top),
      effort, effortMons: effort ? pick((m) => m.a[effort] === best(effort)) : []
    };
  }
  const EFFORT_SAY = { jumped: "The Pokémon that jumped the most...", tackled: "The Pokémon that hit the most...", failed: "The Pokémon that failed the most...", dashed: "The Pokémon that dashed the most..." };
  async function ceremony(course, teams, results, rng) {
    const acts = addActs(results), b = bonuses(teams, acts, rng);
    const bonus = [0, 0, 0, 0], awards = [0, 0, 0, 0];
    const title = course.name, sub = "Closing ceremony";
    await announce(title, sub, null, [["Great job, athletes!", "Which team fought the hardest?"], ["We've got the results! But first...", "who's overflowing with fighting spirit?"]]);
    b.challenge.forEach((n, t) => { bonus[t] += n; if (n) awards[t]++; });
    await announce(title, sub, (g) => [0, 1, 2, 3].forEach((t) => row(g, teams, t, 22 + t * 23, null, "+" + b.challenge[t])), [["A Challenge Bonus for", "Pokémon and Team!"]]);
    // Each Pokémon's prizes, team by team.
    const prize = async (words, list, n) => {
      for (const [t] of list) { bonus[t] += n; awards[t]++; }
      const by = [0, 1, 2, 3].map((t) => list.filter(([x]) => x === t).map(([, i]) => i));
      const shown = [0, 1, 2, 3].filter((t) => by[t].length);
      await announce(title, sub, (g) => shown.forEach((t, k) => row(g, teams, t, 22 + k * 23, null, "+" + n * by[t].length, by[t])),
        [words, list.length ? ["That's all!"] : ["There wasn't one this time."]]);
    };
    await prize(["Continuing on, the individual prizes...", "The No-Miss Bonus!"], b.noMiss, 10);
    await prize(["Moving on...", "the points leader!"], b.leader, 20);
    if (b.effort) await prize(["Next up... the prize for effort!", EFFORT_SAY[b.effort]], b.effortMons, 10);
    // The event points, and the overall winner (ties by a drawing).
    const totals = [0, 1, 2, 3].map((t) => bonus[t] + results.reduce((n, r) => n + r.points[t], 0));
    const draw = [0, 1, 2, 3].map(() => rng());
    const order = [0, 1, 2, 3].sort((a, c) => totals[c] - totals[a] || draw[a] - draw[c]);
    const tie = totals[order[0]] === totals[order[1]];
    await announce(title, sub, (g) => order.forEach((t, i) => row(g, teams, t, 22 + i * 23, i,
      results.map((r) => r.points[t]).join(" + ") + " + " + bonus[t] + " = " + totals[t], [])),
    [["Finally...", "we'll add up the event points!"]].concat(tie ? [["What? We have a tie!?", "Well, we settle ties by a drawing!"]] : [])
      .concat([["The overall winner, with " + totals[order[0]] + " points...", "Team " + teams[order[0]].name + "!"]]));
    return { totals, order, bonus, awards, acts };
  }

  // ---------- A course ----------

  async function runCourse(courseNo, opts) {
    opts = opts || {};
    const course = COURSES[courseNo] || COURSES[0];
    const party = G.player().party.filter((r) => !r.egg);
    if (party.length < 3) { await G.say(["You need three Pokémon with you\nin your party to take part."]); return null; }
    // (Back to the Dome, as the screen was.)
    const leave = async () => {
      scene().classList.remove("evo", "athlon");
      scene().innerHTML = "";
      G.show("world");
      await G.resume();
      const here = (window.WORLD_MAPS || {})[G.player().location.map];
      if (here && here.music) G.music(here.music);
    };
    let mine;
    for (;;) {
      const picks = await chooseTeam(course);
      if (!picks) { await leave(); return null; }
      mine = { name: G.player().name, you: true, mons: picks.map((r) => ({ species: r.species, name: G.displayName(r), stats: performance(r) })) };
      G.show("scene");
      if (await showTeam(course, mine)) break;
    }
    const rng = Math.random;
    const teams = [mine].concat(rivalTeams(rng, opts.supreme));
    const s = save(), rec = s.rec, flag = opts.flag || (() => false);
    G.music("gs_bicycle");
    const results = [];
    for (let e = 0; e < 3; e++) {
      const id = course.events[e];
      const r = await P("run")(scene(), id, teams, { rng, sfx: G.sfx, ai: opts.supreme ? 1.3 : 1 });
      results.push(r);
      await eventResults(id, teams, r, e + 1);
    }
    const c = await ceremony(course, teams, results, rng);
    const score = c.totals[0], place = c.order.indexOf(0), won = place === 0;
    const last = !won && score === Math.min(...c.totals);
    const species = mine.mons.map((m) => m.species);
    // The Medal (each of the three's), and the course's record: the best
    // winning score (999 at most) and the team that got it (ov96_021E786C).
    const best = s.courses[course.key];
    const newBest = won && (!best || score > best[0]);
    const pages = [];
    if (won) {
      const bit = 1 << COURSES.indexOf(course);
      for (const sp of species) s.medals[sp] = (s.medals[sp] | 0) | bit;
      pages.push(["Team " + mine.name + " was awarded", "the " + course.name.replace(" Course", " Medal") + "!"]);
      if (newBest) { s.courses[course.key] = [Math.min(999, score)].concat(species); pages.push(["Team " + mine.name + " beat its personal", "best at the " + course.name + "!"]); }
      s.statues = species.slice();
      pages.push(["Congratulations!", "That was a wonderful Performance!"], ["Keep aiming to be the top Pokéathlete!", "That is... Pokéathlon FOREVER!"]);
    } else pages.push(["You did well on the", course.name + "!"]);
    if (won) G.fanfare("gs_me_pt_victory");
    await announce(course.name, "Closing ceremony", (g) => c.order.forEach((t, i) => row(g, teams, t, 22 + i * 23, i, String(c.totals[t]))), pages);
    // The records (ov96_021E7D6C and ov96_021E7938).
    count(rec, "joined");
    if (won) count(rec, "wins"); else if (last) count(rec, "lasts");
    count(rec, "bonuses", c.awards[0]);
    results.forEach((r, e) => {
      const id = course.events[e], i = EVENT_ORDER.indexOf(id), top = Math.max(...r.points);
      if (r.points[0] === top) rec.eventWins[i] = Math.min(MAX_COUNT, rec.eventWins[i] + 1);
      else if (r.points[0] === Math.min(...r.points)) count(rec, "eventLasts");
      count(rec, "instructions", r.instructions | 0);
      count(rec, "time", Math.floor((r.frames | 0) / 60));
      // (Each event's five best results, and how often it's been played.)
      const ev = s.events[id] || (s.events[id] = { played: 0, top: [] });
      ev.played = Math.min(MAX_COUNT, ev.played + 1);
      ev.top.push([r.raw[0]].concat(species));
      ev.top.sort((a, b) => (lower(id) ? a[0] - b[0] : b[0] - a[0]));
      ev.top.length = Math.min(5, ev.top.length);
    });
    for (const k of ACTS) count(rec, k, c.acts[0].reduce((n, a) => n + a[k], 0));
    addAp(score);
    // The rooms below (HGSS's FLAG_UNK_0EF to 0F1, ov96_021E7718): the
    // Potential room when one of your Pokémon has all five Medals, the Trust
    // room when you've won every course, the Friendship room when each
    // event's best is past its mark.
    if (won && !flag("FLAG_UNK_0F0") && species.some((sp) => s.medals[sp] === 31)) G.setFlag("FLAG_UNK_0F0", true);
    if (won && !flag("FLAG_UNK_0EF") && COURSES.every((k) => s.courses[k.key])) G.setFlag("FLAG_UNK_0EF", true);
    if (!flag("FLAG_UNK_0F1") && EVENT_ORDER.every((id) => {
      const t = s.events[id] && s.events[id].top[0];
      return t && (lower(id) ? t[0] < FRIENDSHIP[id] : t[0] > FRIENDSHIP[id]);
    })) G.setFlag("FLAG_UNK_0F1", true);
    await leave();
    await G.persist();
    // (The script then says the score and the points; the course's own
    // messages, the Medal's and the record's, came in the ceremony above.)
    return { score, place, points: Math.min(score, 0xffff) };
  }

  // ---------- The Athlete Shop (ScrCmd_771) ----------

  async function athleteShop() {
    const shop = shopToday(), list = prizesToday();
    const items = list.map(([id, price], slot) => ({ id, slot, price })).filter((x) => window.ITEMS && window.ITEMS[x.id] && !shop.bought.includes(x.slot));
    if (!items.length) { await G.say(["We're out of prizes for today.\nPlease come back tomorrow!"]); return; }
    const B = window.Bag;
    await window.ShopScreen.open({
      frame: G.frame(),
      items: items.map((x) => ({ id: x.id + "#" + x.slot, name: B.name(x.id), price: x.price, desc: B.description(x.id), icon: B.sprite(x.id) })),
      money: () => save().ap,
      currency: { label: "Points", unit: (n) => n + " pts", short: "You don't have enough Athlete Points." },
      inBag: (key) => window.Player.itemCount(G.player(), key.split("#")[0]),
      // (One of each a day.)
      limit: (key) => (shop.bought.includes(+key.split("#")[1]) ? { max: 0, why: "That one's gone for today.\nPlease come back tomorrow!" } : { max: 1 }),
      buy: (key, n) => {
        const [id, slot] = key.split("#"), x = items.find((i) => i.slot === +slot);
        addAp(-x.price * n);
        window.Player.addItem(G.player(), id, n);
        shop.bought.push(+slot);
        G.persist();
        return null;
      },
      map: G.mapView()
    });
    window.ShopScreen.close();
  }

  // ---------- The records ----------

  const evName = (id) => P("EVENTS")[id].name;
  const pages2 = (lines) => { const out = []; for (let i = 0; i < lines.length; i += 2) out.push(lines.slice(i, i + 2).join("\n")); return out; };
  // The B1F rooms' (ScrCmd_712): 0 the Trust room's course records, 1 the
  // Potential room's Medals, 2 the Friendship room's event records, 3 the
  // records room's (as the Pokéathlon data).
  async function records(kind) {
    const s = save();
    if (kind === 1) {
      const got = Object.entries(s.medals).filter(([, bits]) => bits).map(([sp, bits]) => sp + ": " + COURSES.filter((c, i) => bits & (1 << i)).map((c) => c.name.replace(" Course", "")).join(", "));
      await G.say(got.length ? ["The Medals your Pokémon have won:"].concat(got) : ["None of your Pokémon have won\na Medal yet."]);
    } else if (kind === 2) {
      const lines = EVENT_ORDER.filter((id) => s.events[id] && s.events[id].top.length).map((id) => evName(id) + ": " + measure(id, s.events[id].top[0][0]) + " (" + s.events[id].played + " played)");
      await G.say(lines.length ? pages2(lines) : ["No events have been played yet."]);
    } else if (kind === 3) await data(0);
    else {
      const lines = COURSES.map((c) => c.name + ": " + (s.courses[c.key] ? s.courses[c.key][0] : "--"));
      await G.say(["Course records (best winning scores):"].concat(pages2(lines)));
    }
  }
  // The Pokéathlon data (ScrCmd_743, overlay 3's: msg_0277's), 0 overall,
  // 1 events, 2 actions. HGSS shows "???" for those its Data Cards haven't
  // unlocked (ov03_02259880); none are sold here, so only the two it always
  // shows (the times joined, and the Link Pokéathlon's).
  const DATA_LINES = [
    [["Times Joined Pokéathlon", (r) => r.joined], ["Pokéathlon 1st Places", (r) => r.wins, 1], ["Pokéathlon Last Places", (r) => r.lasts, 2], ["Bonuses Earned", (r) => r.bonuses, 25],
      ["Event 1st Place", (r) => r.eventWins.reduce((a, b) => a + b, 0), 21], ["Event Last Place", (r) => r.eventLasts, 22], ["Connection Participation", () => 0],
      ["Connection 1st Places", () => 0, 19], ["Connection Last Places", () => 0, 20], ["Time Spent", (r) => Math.floor(r.time / 60) + ":" + String(r.time % 60).padStart(2, "0"), 27]],
    EVENT_ORDER.map((id, i) => [evName(id) + " 1st Places", (r) => r.eventWins[i], [5, 7, 18, 8, 9, 17, 6, 16, 10, 24][i]]),
    [["Pokémon Instructions", (r) => r.instructions, 26], ["Times Pokémon Dashed", (r) => r.dashed, 3], ["Times Pokémon Jumped", (r) => r.jumped, 4],
      ["Times Pokémon Tackled", (r) => r.tackled, 14], ["Times Pokémon Switched", (r) => r.switched, 23], ["Times Pokémon Self-Impeded", (r) => r.impeded, 13],
      ["Pokémon Acquired Points", (r) => r.points, 11], ["Pokémon Failed", (r) => r.failed, 12], ["Pokémon Fell Down", (r) => r.fell, 15]]];
  async function data(kind) {
    const rec = save().rec, cards = save().dataCards | 0;
    const lines = (DATA_LINES[kind] || DATA_LINES[0]).map(([label, get, card]) => (card && !(cards & (1 << (card - 1))) ? "???" : label + ": " + get(rec)));
    await G.say(pages2(lines));
  }

  // ---------- The scripts' commands ----------

  const BOX = { x: 20, y: 1 };
  const box = (show) => G.fieldWindow("points", show ? { x: BOX.x, y: BOX.y, label: "Points", text: save().ap + " pts" } : null);
  const COMMANDS = {
    // (The Dome's: courses, points, prizes, records.)
    CountAliveMonsAndPC: (a, api) => api.setVar(a[0], G.player().party.filter((r) => !r.egg && r.hp > 0).length + G.boxCount()),
    BufferPokeathlonCourseName: (a, api) => { api.buffers[a[0]] = (COURSES[+api.getVar(a[1])] || COURSES[0]).name; },
    // (Pokeathlon link, supreme, course, -> didn't go in, score, points, place.)
    async Pokeathlon(a, api) {
      const r = await runCourse(+api.getVar(a[2]) || 0, { supreme: +api.getVar(a[1]) === 1, flag: api.flag });
      api.setVar(a[3], r ? 0 : 1);
      if (r) { api.setVar(a[4], r.score); api.setVar(a[5], r.points); api.setVar(a[6], r.place); }
    },
    GiveAthletePoints: (a, api) => addAp(+api.getVar(a[0]) || 0),
    CheckAthletePoints: (a, api) => api.setVar(a[0], save().ap >= (+api.getVar(a[1]) || 0) ? 1 : 0),
    TakeAthletePoints: (a, api) => addAp(-(+api.getVar(a[0]) || 0)),
    // (HGSS's records the scripts read: ScrCmd_724; and its friendship points, ScrCmd_725.)
    ScrCmd_724: (a, api) => api.setVar(a[1], Math.min(0xffff, record(+api.getVar(a[0])))),
    ScrCmd_725: (a, api) => { const s = save(); s.rank = Math.max(0, Math.min(0xffff, s.rank + (+a[0] ? -1 : 1) * (+api.getVar(a[1]) || 0))); },
    // The Athlete Shop: anything left today (ScrCmd_834), and the prizes (ScrCmd_771).
    ScrCmd_834: (a, api) => api.setVar(a[0], prizesToday().length > shopToday().bought.length ? 1 : 0),
    ScrCmd_771: () => athleteShop(),
    // (The Data Cards: none sold here, ScrCmd_835's count and ScrCmd_772's shop.)
    ScrCmd_835: (a, api) => api.setVar(a[0], 0),
    ScrCmd_772: () => G.say(["We're waiting for this season's\nData Cards. Please come back later!"]),
    ScrCmd_712: (a) => records(+a[0]),
    ScrCmd_743: (a, api) => data(+api.getVar(a[0])),
    // The points box (ScrCmd_116, 118 and 117), and the money box.
    ScrCmd_116: () => box(true), ScrCmd_118: () => box(true), ScrCmd_117: () => box(false),
    ShowMoneyBox: () => G.moneyBox(true), UpdateMoneyBox: () => G.moneyBox(true), HideMoneyBox: () => G.moneyBox(false)
  };
  // ScrCmd_724's records (src/field/scrcmd_pokemon_misc.c reads them out of
  // the Pokéathlon's save): 0-9 how often each event's been won, 10 the
  // courses won, 11 the friendship points, 12 the courses joined, 13 the
  // instructions, 14 the jumps, 15 the tackles, 16 the dashes, 17 the switches.
  function record(n) {
    const s = save(), r = s.rec;
    if (n <= 9) return r.eventWins[n] | 0;
    return { 10: r.wins, 11: s.rank, 12: r.joined, 13: r.instructions, 14: r.jumped, 15: r.tackled, 16: r.dashed, 17: r.switched }[n] | 0;
  }
  const handles = (op) => !!G && Object.prototype.hasOwnProperty.call(COMMANDS, op);
  async function command(op, a, api) { await COMMANDS[op](a, api); }

  window.Pokeathlon = {
    attach: (game) => { G = game; }, handles, command, performance, runCourse, prizesToday, COURSES, STATS, EVENT_ORDER, FRIENDSHIP,
    challenge, bonuses, record, ap: () => (G ? save().ap : 0), addAp
  };
})();
