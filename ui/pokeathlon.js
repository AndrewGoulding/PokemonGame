// The Pokéathlon Dome (HGSS's, north of Route 35): its courses, Athlete
// Points, the Athlete Shop and its records. The Dome's scripts are HGSS's own
// (ui/johto-script.js runs them; the receptions' is scr_seq_0167, which
// tools/build-pokeathlon.js adds to data/johto-maps.js); the commands of
// theirs that are the Pokéathlon's come here (handles(op), command(op, args, api)).
// ui/pokeathlon-events.js has the ten events.
//
//   Pokeathlon.attach(game)    // ui/game.js: what it needs of the game (below)
//   Pokeathlon.performance(record, date)   // a Pokémon's Performance today:
//     // { speed, power, skill, stamina, jump } (1-5 stars), and .max (as high as each goes)
//   await Pokeathlon.runCourse(course, { supreme })   // -> { score, place } or null (didn't go in)
//
// A course is three events, with three of your Pokémon against three teams
// of the computer's; each event's points add up to your score, and that
// many Athlete Points are yours (99,999 at most), with 100 more for coming
// first (the reception's script gives those), and the course's Medal the first
// time. HGSS's Performance (src/pokemon.c, CalcBoxMonPokeathlonPerformance):
// each species' base stars, and how far they go up or down, from
// performance.narc; today's go up or down by its nature and its personality's
// digits with the day of the month; no Aprijuice here.
//
// Kept in player.flags.pokeathlon: { ap, earned, entries, wins, rank (HGSS's
// friendship points, ScrCmd_725's), medals: { speed: true, ... }, best: {
// course: score }, events: { id: [played, best] }, jumps, tackles, shop: {
// day, bought: [slots] } }.
(function () {
  "use strict";

  const DATA = () => window.POKEATHLON || { perf: {}, natures: [], prizes: [] };
  const STATS = ["speed", "power", "skill", "stamina", "jump"];
  const STAT_LABELS = { speed: "SPD", power: "POW", skill: "SKL", stamina: "STM", jump: "JMP" };
  // (HGSS's Performance order, PERFORMANCE_POWER ... PERFORMANCE_STAMINA, as the nature table has it.)
  const PERF_ORDER = ["power", "skill", "speed", "jump", "stamina"];
  // The five courses, as the Pokeathlon command numbers them (scr_seq_0167),
  // each with its three events (scr_seq_D49R0102's "About events").
  const COURSES = [
    { key: "speed", name: "Speed Course", events: ["hurdle", "pennant", "relay"] },
    { key: "power", name: "Power Course", events: ["block", "circle", "goal"] },
    { key: "skill", name: "Skill Course", events: ["snow", "goal", "pennant"] },
    { key: "stamina", name: "Stamina Course", events: ["ring", "relay", "block"] },
    { key: "jump", name: "Jump Course", events: ["lamp", "disc", "hurdle"] }];
  // (The events in msg_0191's order: Hurdle Dash ... Goal Roll, ScrCmd_724 0-9's counts.)
  const EVENT_ORDER = ["hurdle", "pennant", "circle", "block", "disc", "lamp", "relay", "ring", "snow", "goal"];
  const RIVALS = ["Gina", "Roman", "Kiri", "Dalton", "Mira", "Tobias", "Ayla", "Hugo", "Lena", "Caspian", "Nadia", "Orrin", "Pia", "Felix", "Junie"];
  const MAX_AP = 99999;

  let G = null;   // (the game: attach())
  const P = (k) => window.PokeathlonEvents[k];

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
  function performance(r, date) {
    date = date || new Date();
    const base = baseOf(r.species), day = date.getDate(), pid = (r.personality >>> 0) || 0;
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

  // ---------- Saved ----------

  function save() {
    const f = G.player().flags;
    const s = f.pokeathlon || (f.pokeathlon = {});
    for (const [k, v] of [["ap", 0], ["earned", 0], ["entries", 0], ["wins", 0], ["rank", 0], ["jumps", 0], ["tackles", 0]]) if (s[k] == null) s[k] = v;
    s.medals = s.medals || {}; s.best = s.best || {}; s.events = s.events || {};
    return s;
  }
  function addAp(n) {
    const s = save();
    s.ap = Math.max(0, Math.min(MAX_AP, s.ap + n));
    if (n > 0) s.earned = Math.min(MAX_AP * 10, s.earned + n);
  }
  // The Athlete Shop's prizes today (ScrCmd_771: the day of the week's list,
  // a longer one with the National Pokédex), each once a day.
  function prizesToday(date) {
    date = date || new Date();
    const nat = G && G.nationalDex ? G.nationalDex() : false;
    return DATA().prizes[date.getDay() + (nat ? 7 : 0)] || [];
  }
  function shopToday(date) {
    const s = save(), today = (date || new Date()).toDateString();
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
  // The order the teams came in (ties: yours first, then as they are).
  const ranking = (points, you) => [0, 1, 2, 3].sort((a, b) => points[b] - points[a] || (a === you ? -1 : b === you ? 1 : a - b));
  async function eventResults(name, teams, points, n) {
    const g = canvasIn(scene());
    backdrop(g, name, "Event " + n + "/3");
    ranking(points, 0).forEach((t, i) => row(g, teams, t, i, String(points[t])));
    P("text")(g, "A: Next", W / 2, 143, "white", "center");
    await key();
  }
  function row(g, teams, t, i, right) {
    const y = 24 + i * 29, C = P("TEAM")[t];
    P("box")(g, 4, y, W - 8, 27);
    g.fillStyle = C[2]; g.fillRect(8, y + 4, 22, 19); g.fillStyle = C[0]; g.fillRect(9, y + 5, 20, 17);
    P("text")(g, ORD[i], 19, y + 6, "white", "center");
    P("text")(g, teams[t].name, 34, y + 6, "dark");
    teams[t].mons.forEach((m, k) => P("drawMon")(g, { team: t, icon: P("iconOf")(m.species), t: 0, face: -1, z: 0 }, 112 + k * 22, y + 24, { noShadow: true }));
    P("text")(g, right, W - 10, y + 6, teams[t].you ? "gold" : "dark", "right");
  }
  async function finalResults(course, teams, scores, totals) {
    const g = canvasIn(scene());
    backdrop(g, course.name, "Results");
    ranking(totals, 0).forEach((t, i) => row(g, teams, t, i, String(totals[t])));
    // (Yours, event by event.)
    P("text")(g, course.events.map((id, e) => scores[e][0]).join(" + ") + " = " + totals[0] + "   A: Next", W / 2, 143, "white", "center");
    await key();
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
    const s = save();
    s.entries++;
    G.music("gs_bicycle");
    const scores = [], counts = {};
    for (let e = 0; e < 3; e++) {
      const id = course.events[e], ev = P("EVENTS")[id];
      const r = await P("run")(scene(), id, teams, { rng, sfx: G.sfx, ai: opts.supreme ? 1.3 : 1 });
      scores.push(r.points);
      for (const [k, v] of Object.entries(r.counts)) counts[k] = (counts[k] || 0) + (v | 0);
      // (The records: how often each event's been played, and its best.)
      const rec = s.events[id] || (s.events[id] = [0, 0]);
      rec[0]++; rec[1] = Math.max(rec[1], r.points[0]);
      await eventResults(ev.name, teams, r.points, e + 1);
    }
    const totals = [0, 1, 2, 3].map((t) => scores.reduce((n, p) => n + p[t], 0));
    const place = ranking(totals, 0).indexOf(0);
    await finalResults(course, teams, scores, totals);
    // Records and Medals.
    s.jumps += counts.jumps | 0;
    s.tackles += counts.tackles | 0;
    const score = totals[0];
    const newBest = score > (s.best[course.key] || 0);
    if (newBest) s.best[course.key] = score;
    if (place === 0) s.wins++;
    addAp(score);
    let medal = false;
    if (place === 0 && !s.medals[course.key]) { s.medals[course.key] = true; medal = true; }
    // (The rooms below, HGSS's FLAG_UNK_0EF to 0F1: the Trust room with a win,
    // the Potential room with three Medals, the Friendship room with all five.)
    const medals = Object.keys(s.medals).length;
    if (s.wins) G.setFlag("FLAG_UNK_0EF", true);
    if (medals >= 3) G.setFlag("FLAG_UNK_0F0", true);
    if (medals >= 5) G.setFlag("FLAG_UNK_0F1", true);
    await leave();
    if (place === 0) G.fanfare("gs_me_pt_victory");
    if (newBest) await G.say(["A new record for the " + course.name + ":\n" + score + " points!"]);
    if (medal) await G.say(["{PLAYER} won the " + course.name.replace(" Course", " Medal") + "!"]);
    await G.persist();
    return { score, place, points: Math.min(score, MAX_AP) };
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

  // ---------- The records (ScrCmd_712) ----------

  async function records(kind) {
    const s = save();
    if (kind === 1) {
      // (The Medals.)
      const got = COURSES.filter((c) => s.medals[c.key]).map((c) => c.name.replace(" Course", ""));
      await G.say([got.length ? "{PLAYER}'s Medals:\n" + got.join(", ") + "." : "{PLAYER} hasn't won a Medal yet.",
        "Courses won: " + s.wins + "\nCourses entered: " + s.entries]);
    } else if (kind === 2) {
      const lines = EVENT_ORDER.map((id) => [P("EVENTS")[id].name, s.events[id]]).filter((x) => x[1]).map(([n, r]) => n + ": best " + r[1] + " (" + r[0] + " played)");
      const pages = [];
      for (let i = 0; i < lines.length; i += 2) pages.push(lines.slice(i, i + 2).join("\n"));
      await G.say(pages.length ? pages : ["No events have been played yet."]);
    } else if (kind === 3) {
      await G.say(["Athlete Points earned in all:\n" + s.earned + " points.", "Jumps: " + s.jumps + "\nTackles: " + s.tackles]);
    } else {
      const pages = [];
      for (let i = 0; i < COURSES.length; i += 2) pages.push(COURSES.slice(i, i + 2).map((c) => c.name + ": " + (s.best[c.key] || "--")).join("\n"));
      await G.say(["Course records (best scores):"].concat(pages));
    }
  }

  // ---------- The scripts' commands ----------

  const BOX = { x: 20, y: 1 };
  const box = (show) => G.fieldWindow("points", show ? { x: BOX.x, y: BOX.y, label: "Points", text: save().ap + " pts" } : null);
  const COMMANDS = {
    // (The Dome's: courses, points, prizes, records.)
    CountAliveMonsAndPC: (a, api) => api.setVar(a[0], G.player().party.filter((r) => !r.egg && r.hp > 0).length + G.boxCount()),
    BufferPokeathlonCourseName: (a, api) => { api.buffers[a[0]] = (COURSES[+api.getVar(a[1])] || COURSES[0]).name; },
    async Pokeathlon(a, api) {
      const r = await runCourse(+api.getVar(a[2]) || 0, { supreme: +api.getVar(a[1]) === 1 });
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
    // The points box (ScrCmd_116, 118 and 117), and the money box.
    ScrCmd_116: () => box(true), ScrCmd_118: () => box(true), ScrCmd_117: () => box(false),
    ShowMoneyBox: () => G.moneyBox(true), UpdateMoneyBox: () => G.moneyBox(true), HideMoneyBox: () => G.moneyBox(false)
  };
  // ScrCmd_724's records (src/field/scrcmd_pokemon_misc.c reads them out of
  // the Pokéathlon's save): 0-9 how often each event's been played, 10 the
  // courses won, 11 the friendship points, 12 the courses entered, 14 the
  // jumps, 15 the tackles, 16 the Athlete Points earned in all, 17 the Medals.
  function record(n) {
    const s = save();
    if (n <= 9) return (s.events[EVENT_ORDER[n]] || [0])[0];
    return { 10: s.wins, 11: s.rank, 12: s.entries, 14: s.jumps, 15: s.tackles, 16: s.earned, 17: Object.keys(s.medals).length }[n] || 0;
  }
  const handles = (op) => !!G && Object.prototype.hasOwnProperty.call(COMMANDS, op);
  async function command(op, a, api) { await COMMANDS[op](a, api); }

  window.Pokeathlon = {
    attach: (game) => { G = game; }, handles, command, performance, runCourse, prizesToday, COURSES, STATS,
    ap: () => (G ? save().ap : 0), addAp
  };
})();
