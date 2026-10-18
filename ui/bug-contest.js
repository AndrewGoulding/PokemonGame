// HeartGold's Bug-Catching Contest in Johto's National Park (src/overlay_bug_contest.c,
// src/encounter.c's Task_BugContestEncounter, scr_seq_0151: the std_bug_contest_*
// scripts). On Tuesdays, Thursdays and Saturdays the officer in either of
// the park's gatehouses signs you up (his scripts and HGSS's run in
// ui/johto-script.js): you go in with your lead Pokémon alone (the rest are
// held for you), 20 Sport Balls and 20 minutes. The contest's park
// (NationalPark_BugCatchingContest) has its own wild Pokémon (one set without
// the National Pokédex, one a day with it: files/data/mushi, tools/build-bug-contest.js),
// fought as any wild Pokémon is, with only your Sport Balls in the Bag; catch
// one and you're asked whether to keep it in place of the one you're holding.
// Five of the ten other contestants are in the park too, each with a bug of
// their own and its score. Time up, out of Sport Balls, or done early (at
// the gate, or RETIRE on the Start menu), and the judging is in the park:
// your bug's score (its kind, level, IVs and HP: BugContest_JudgePlayerMon)
// against theirs, and the prizes (a Sun Stone, an Everstone, a Sitrus Berry,
// a Shed Shell for everyone else). You keep the last bug you caught.
//
//   const C = BugContest.create(env)
//   C.start(weekday) / C.end()       // BugContestAction 0 / 1: the party held, then given back with your bug
//   C.registered(id)                 // IsBugContestantRegistered (0-9: Don ... Kipp)
//   C.judge()                        // JudgeBugContest: { placement 0-3, prize, species (0: none caught) }
//   C.winner(place)                  // BufferBugContestWinner: { name, species, cls, score }
//   C.caughtNick() / C.caught()      // BufferBugContestMonNick: { nick, boxed }; the bug you're holding
//   C.minutesLeft()                  // BugContestGetTimeLeft
//   C.active() / C.here(map)         // on, and in the contest's park
//   await C.battle(terrain)          // a wild bug in the contest's park (and the judging, out of Sport Balls)
//   C.step()                         // a step in the park: once time's up, { type: "johto-script", js } (std_bug_contest_time_up)
//   C.onMap(map)                     // gone from the park and its gates (Fly, blacking out): the contest's off
//   C.menuStats()                    // the Start menu's box: time left, Sport Balls
//
// env: player(), party (window.Party), receive(record) (Player.receive),
//   national() (the National Pokédex), battle(opts) (a wild battle: opts.foe,
//   terrain, bag, keepCaught), wildMon(record), say(pages), confirm(question),
//   resume() (back to the map after a battle), setFlag(name, on), setVar(name, value),
//   runStd(name) (a std script: std_bug_contest_balls_up), judging() (to the park, judged), now() (ms), random().
// Pure parts, for tests: BugContest.encounter(set, rng), opponents(national,
// day, rng), score(record, set, maxHp), rank(scores), prize(placement, national, rng).
(function () {
  "use strict";

  const DATA = () => window.BUG_CONTEST_DATA || { encounters: [], contestants: [], names: [], classes: [], prizes: {}, balls: 20, minutes: 20 };
  const PARK = "NationalPark_BugCatchingContest";
  // (Where the contest goes on: its park, the gatehouses you go in and out by, and the park it's judged in.)
  const CONTEST_MAPS = [PARK, "NationalPark", "Route35_NationalParkPokeathlonGatehouse", "Route36_NationalParkGatehouse"];
  const NPC_COUNT = 5, PLAYER = NPC_COUNT;
  const MINUTE = 60000;

  // ---------- The contest's rules (src/overlay_bug_contest.c) ----------

  // The day's wild Pokémon: set 0 without the National Pokédex, else Tuesday's,
  // Thursday's or Saturday's (BugContest_InitEncounters: weekday / 2).
  const encounterSet = (national, day) => DATA().encounters[national ? Math.max(1, Math.min(3, day >> 1)) : 0] || [];
  // A wild Pokémon (BugContest_GetEncounterSlot): the first slot whose rate
  // the roll out of 100 is at least, at a level from its range.
  function encounter(set, rng) {
    const roll = Math.floor(rng() * 100);
    let i = set.findIndex((s) => roll >= s.rate);
    if (i < 0) i = set.length - 1;
    const s = set[i];
    return { species: s.species, level: s.min + Math.floor(rng() * (s.max - s.min + 1)) };
  }
  // The five other contestants (BugContest_InitOpponents): five of the ten,
  // each with a bug from their rows for the day (a National Pokédex row only
  // with it; day 7, any day) and its score, give or take its randmod.
  function opponents(national, day, rng) {
    const out = [];
    while (out.length < NPC_COUNT) {
      const id = Math.floor(rng() * 10);
      if (out.some((o) => o.id === id)) continue;
      const rows = (DATA().contestants[id] || []).filter((r) => !(r.national && !national) && !(r.day < 7 && r.day !== day));
      const r = rows[Math.floor(rng() * rows.length)];
      out.push({ id, species: r.species, score: r.score + Math.floor(rng() * (2 * r.randmod)) - r.randmod });
    }
    return out;
  }
  // Your bug's score (BugContest_JudgePlayerMon): its kind's, its level
  // against the highest it comes at, its IVs, and the HP it has left.
  function score(record, set, maxHp) {
    if (!record) return 0;
    const s = set.find((x) => x.species === record.species);
    if (!s) return 0;
    const ivs = Object.values(record.ivs || {}).reduce((a, b) => a + b, 0);
    return s.score + Math.floor(record.level * 100 / s.max) + Math.floor(ivs * 100 / (31 * 6)) + Math.floor(record.hp * 100 / Math.max(1, maxHp));
  }
  // The six by score (BugContest_Judge's selection sort: on a tie the later
  // one, so you, ahead): their indexes, best first.
  function rank(scores) {
    const r = scores.map((_, i) => i);
    for (let i = 0; i < r.length - 1; i++) {
      const temp = r[i];
      let max = i, best = scores[r[i]];
      for (let j = i + 1; j < r.length; j++) if (scores[r[j]] >= best) { max = j; best = scores[r[j]]; }
      r[i] = r[max];
      r[max] = temp;
    }
    return r;
  }
  // The prize for a placing (0 first ... 3 everyone else): first, a Sun Stone
  // (with the National Pokédex one of ten stones), an Everstone, a Sitrus
  // Berry, or a Shed Shell.
  function prize(placement, national, rng) {
    const p = DATA().prizes;
    if (placement === 0) return p.first[national ? Math.floor(rng() * 10) : 0];
    return placement === 1 ? p.second : placement === 2 ? p.third : p.other;
  }

  // ---------- The contest itself ----------
  //
  // Kept in the save while it's on (player.flags.bugContest): the day, your
  // party held for you and your lead's place in it, the Sport Balls left,
  // when it started, the other contestants, the bug you're holding, and the
  // judging's result.
  function create(env) {
    const P = () => env.player();
    const state = () => P().flags.bugContest || null;
    const random = () => (env.random ? env.random() : Math.random());
    const now = () => (env.now ? env.now() : Date.now());
    const here = (map) => !!state() && map === PARK;
    const set = () => { const s = state(); return s ? encounterSet(s.national, s.day) : []; };
    function msLeft() {
      const s = state();
      return s ? Math.max(0, DATA().minutes * MINUTE - (now() - s.start)) : 0;
    }
    // (HGSS counts the minutes gone, so there's always one left to finish.)
    const minutesLeft = () => Math.max(1, Math.ceil(msLeft() / MINUTE));

    // BugContest_New: your lead Pokémon alone (the first that can battle),
    // the rest held for you (BugContest_BackUpParty).
    function start(day) {
      const p = P();
      const lead = Math.max(0, p.party.findIndex((r) => !r.egg && r.hp > 0));
      const national = !!env.national();
      p.flags.bugContest = { day: +day || 0, national, balls: DATA().balls, start: now(), lead, backup: p.party.slice(),
        count: p.party.length, opponents: opponents(national, +day || 0, random), caught: null, result: null };
      p.party = [p.party[lead]];
    }
    // BugContest_Delete: your party back, with your lead as it is now, and the
    // bug you caught after it (or to the PC if your party was full).
    function end() {
      const p = P(), s = state();
      if (!s) return;
      const used = p.party[0];
      p.party = s.backup.slice();
      if (used) p.party[s.lead] = used;
      delete p.flags.bugContest;
      if (s.caught) env.receive(s.caught);
    }
    const registered = (id) => !!state() && state().opponents.some((o) => o.id === +id);
    // BugContest_Judge: the scores, the places, and your prize.
    function judge() {
      const s = state();
      if (!s) return { placement: 3, prize: DATA().prizes.other, species: 0 };
      const mine = score(s.caught, set(), s.caught ? env.party.maxHp(s.caught) : 1);
      const scores = s.opponents.map((o) => o.score).concat([mine]);
      const ranking = rank(scores);
      const placement = Math.min(3, ranking.indexOf(PLAYER));
      s.result = { ranking, scores, placement, prize: prize(placement, s.national, random) };
      return { placement, prize: s.result.prize, species: s.caught ? s.caught.species : 0 };
    }
    // Who placed `place` (BugContest_BufferContestWinnerNames).
    function winner(place) {
      const s = state(), r = s && s.result;
      if (!r) return { name: "", species: "", cls: "", score: 0 };
      const i = r.ranking[place];
      if (i === PLAYER) return { name: P().name, species: s.caught ? env.party.speciesName(s.caught.species) : "", cls: "", score: r.scores[i] };
      const o = s.opponents[i];
      return { name: DATA().names[o.id], species: o.species, cls: DATA().classes[o.id], score: r.scores[i] };
    }
    const caught = () => (state() ? state().caught : null);
    // (Its name, and whether it goes to the PC: your party was full.)
    function caughtNick() {
      const s = state();
      if (!s || !s.caught) return null;
      return { nick: env.party.displayName(s.caught), boxed: s.count >= 6 };
    }

    // A wild bug in the contest's park (Task_BugContestEncounter): an
    // ordinary wild battle, with your Sport Balls the only thing in the Bag.
    // Caught: kept, or not, in place of the one you're holding
    // (BugContest_PromptSwapPokemon). Out of Sport Balls: having caught it,
    // the announcement (std_bug_contest_balls_up); not, straight to the judging.
    async function battle(terrain) {
      const s = state();
      if (!s) return;
      const w = encounter(set(), random);
      const bag = { "sport-ball": s.balls };
      let got = null;
      const outcome = await env.battle({ foe: { name: "Wild", team: [env.wildMon(env.party.create(w.species, w.level))] }, terrain, bag,
        keepCaught: async (record) => { got = record; } });
      if (!state()) return;   // (blacked out: it's off)
      s.balls = bag["sport-ball"] | 0;
      if (outcome === "lost") return;
      await env.resume();
      if (got) {
        const name = env.party.speciesName(got.species);
        got.met = { level: got.level, map: PARK };
        if (!s.caught) s.caught = got;
        else if (await env.confirm("You already caught " + (/^[AEIOU]/.test(env.party.speciesName(s.caught.species)) ? "an " : "a ") +
          env.party.speciesName(s.caught.species) + ".\nSwitch Pokémon?")) {
          s.caught = got;
          await env.say(["You're holding " + name + " now."]);
        } else await env.say(["You let " + name + " go."]);
      }
      if (s.balls > 0) return;
      // (BugContest_WarpToJudging: to the park, where the judging starts.)
      if (got) await env.runStd("std_bug_contest_balls_up");
      else await env.judging();
    }
    // Time up (FieldSystem_UpdateBugContest): the announcement, and to the judging.
    function step() {
      const s = state();
      if (!s || P().location.map !== PARK || msLeft() > 0) return null;
      const std = ((window.JOHTO_SCRIPTS || {}).std || {}).std_bug_contest_time_up;
      return std ? { type: "johto-script", js: { zone: std[0], label: std[1] } } : null;
    }
    // Gone from the park another way (Fly, blacking out): the contest's off,
    // your party given back with the bug you're holding, and the park as it was.
    function onMap(map) {
      if (!state() || CONTEST_MAPS.includes(map)) return;
      end();
      for (const f of ["FLAG_BUG_CONTEST_ACTIVE", "FLAG_UNK_24E", "FLAG_BUG_CONTEST_OTHER_POKES_HELD"]) env.setFlag(f, false);
      for (const f of Object.values((window.JOHTO_SCRIPTS || {}).flagNames || {})) if (/^FLAG_HIDE_BUG_CONTESTANT_/.test(f)) env.setFlag(f, false);
      env.setVar("VAR_UNK_4118", 0);
      env.setVar("VAR_UNK_40F7", 0);
    }
    // The time left as mm:ss, and the Sport Balls: the Start menu's box and the park's clock.
    function clock() {
      const t = Math.ceil(msLeft() / 1000);
      return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
    }
    const menuStats = () => (state() ? ["Time  " + clock(), "Balls  " + String(state().balls).padStart(2, " ")] : null);

    // The clock in the corner while you're in the contest's park: the time
    // left counting down, and your Sport Balls (FireRed's window colours).
    let box = null;
    function drawClock() {
      const show = here(P() && P().location && P().location.map) && !document.getElementById("world").classList.contains("hidden");
      if (!box) {
        const screen = document.querySelector(".screen");
        if (!screen || !show) return;
        box = document.createElement("div");
        box.className = "bug-contest-clock";
        box.style.cssText = "position:absolute;top:calc(100cqw*3/240);right:calc(100cqw*3/240);z-index:3;" +
          "padding:calc(100cqw*1/240) calc(100cqw*4/240);background:#f8f8f8;border:calc(100cqw*2/240) solid #506878;" +
          "border-radius:calc(100cqw*3/240);color:#484848;font-family:FireRed,monospace;font-size:calc(100cqw*10/240);" +
          "line-height:1.1;text-shadow:calc(100cqw/240) calc(100cqw/240) #d0d0c8;pointer-events:none;white-space:pre";
        screen.appendChild(box);
      }
      box.style.display = show ? "" : "none";
      if (show) box.textContent = clock() + "\nBalls " + String(state().balls).padStart(2, " ");
    }
    if (typeof document !== "undefined") setInterval(() => { try { drawClock(); } catch (e) { /* (not in a game yet) */ } }, 250);

    return { start, end, registered, judge, winner, caught, caughtNick, minutesLeft, active: () => !!state(), here, battle, step, onMap,
      menuStats, PARK };
  }

  window.BugContest = { create, encounter, encounterSet, opponents, score, rank, prize, PARK };
})();
