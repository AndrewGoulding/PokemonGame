// Johto's Gym gimmicks, as HeartGold's (src/field/gymmick/*.c): Violet
// City's lift, Ecruteak City's hidden floor and Cianwood City's winch.
// (Azalea's carts are walked webs: tools/build-johto.js. Mahogany's ice blocks
// slide in ui/overworld.js, and its ice is FireRed's.) Each Gym's state, like
// HGSS's (Save_Gymmick_Init on entering), starts over each time you go in.
//
//   const G = JohtoGymmicks.create(env)   // env: { sfx(name), shake(count, opts), people(), beaten(trainerId) }
//   G.enter(map)              // arriving on a map (a new visit): its Gym as it starts
//   G.patches(map)            // the map's patches on now (Cianwood's dry falls)
//   G.darkness(map)           // Ecruteak's: Overworld's ctx.darkness
//   G.drawMap(g, map, x, y)   // Violet's lift, drawn on its map: Overworld's ctx.drawMap
//   await G.violetLift()      // the lift goes up, or down (VioletGymElevator)
//   G.turnWinch()             // -> true if it turned (CianwoodGymTurnWinch)
(function () {
  "use strict";

  // ---------- Violet City: the lift ----------
  //
  // A 3x3 lift (build model 111, at tiles 14-16 x 19-21) between the Gym's
  // floor and its walkways high above (GymmickInit_Violet: at height 32 down,
  // 496 up). Here the floor is at FireRed's elevation 3 and the walkways at 4,
  // so you can't step between them; the lift is at the height it's at. Its
  // middle tile's step trigger takes it up or down (its speed, 16 a frame:
  // 29 frames), shaking as FireRed's elevator does.
  const VIOLET = "VioletCity_Gym", LIFT = { x: 14, y: 19, w: 3, h: 3 }, WALKWAYS_TO = 18;
  const LIFT_FRAMES = 29;
  const onLift = (x, y) => x >= LIFT.x && x < LIFT.x + LIFT.w && y >= LIFT.y && y < LIFT.y + LIFT.h;

  // ---------- Ecruteak City: the hidden floor ----------
  //
  // The Gym is in a fog that hides its floor (GymmickInit_Ecruteak: fog over
  // everything but people), its walkway over a pit you fall through to the
  // entrance (its step triggers). You see the floor only close by; the
  // entrance and Morty's dais are lit; each Medium carries a candle (build
  // model 128) that lights her, lit again each time you come in, until you
  // beat her and it goes out (Task_ExtinguishCandle: 30 frames, then it
  // shrinks away in 3).
  const ECRUTEAK = "EcruteakCity_Gym", SIGHT = 30, CANDLE = 22, CANDLE_WAIT = 30, CANDLE_SHRINK = 12;
  const LIT = [[13, 49, 7, 5], [8, 8, 5, 4]];
  const isMedium = (def) => def.sprite === "hgss_itako" && def.trainer;

  // ---------- Cianwood City: the winch ----------
  //
  // Chuck trains under the Gym's waterfall, too busy to notice you; turning
  // the winch at the top of the Gym stops the falls (CianwoodGymmick_ActivateWinch,
  // FLAG_SYS_CIANWOOD_WATERFALL_DISABLE), and then he'll battle you. (The
  // falls stopped: the map's "dry" patch, drawn without them.)
  const CIANWOOD = "CianwoodCity_Gym";

  function create(env) {
    const state = { lift: 0, liftMoving: null, lit: new Set(), out: {}, winch: false };
    const map = (name) => (window.WORLD_MAPS || {})[name];

    // The lift's height: the elevation under it and the walkways'.
    function setLift(up) {
      const m = map(VIOLET);
      if (!m) return;
      for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
        const i = y * m.width + x;
        m.elevation[i] = onLift(x, y) ? (up ? 4 : 3) : y <= WALKWAYS_TO ? 4 : 3;
      }
      state.lift = up ? 1 : 0;
    }

    function enter(name) {
      if (name === VIOLET) setLift(false);
      // (Every candle lit: those whose Medium's still to beat, and those already beaten.)
      if (name === ECRUTEAK) { state.lit = new Set((map(ECRUTEAK) || { people: [] }).people.filter((d) => isMedium(d) && env.beaten(d.trainer.id)).map((d) => d.id)); state.out = {}; }
      if (name === CIANWOOD) state.winch = false;
    }

    async function violetLift() {
      const up = !state.lift;
      env.sfx("se_elevator");
      state.liftMoving = { t: 0, up };
      await Promise.all([env.shake(Math.round(LIFT_FRAMES / 3), { y: 1, delay: 3 }), new Promise((r) => {
        const tick = () => { if (++state.liftMoving.t >= LIFT_FRAMES) r(); else requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      })]);
      state.liftMoving = null;
      setLift(up);
      env.sfx("se_ding_dong");
    }

    // The lift, a plate of steel in the shaft: higher up, it's drawn a little
    // bigger, as it comes nearer (and moving, in between).
    function drawMap(g, name, ox, oy) {
      if (name !== VIOLET) return;
      const k = state.liftMoving ? (state.liftMoving.up ? state.liftMoving.t : LIFT_FRAMES - state.liftMoving.t) / LIFT_FRAMES : state.lift;
      const grow = Math.round(3 * k), x = ox + LIFT.x * 16 - grow, y = oy + LIFT.y * 16 - grow, w = LIFT.w * 16 + grow * 2, h = LIFT.h * 16 + grow * 2;
      if (k > 0) { g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(ox + LIFT.x * 16 + 2, oy + LIFT.y * 16 + 3, LIFT.w * 16, LIFT.h * 16); }
      g.fillStyle = "#383840"; g.fillRect(x, y, w, h);
      g.fillStyle = "#a0a0b0"; g.fillRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle = "#c8c8d8"; g.fillRect(x + 1, y + 1, w - 2, 2);
      // (Its hazard stripes round the edge, and the plates' seams.)
      g.fillStyle = "#e8c030";
      for (let i = 4; i < w - 4; i += 6) { g.fillRect(x + i, y + 3, 3, 2); g.fillRect(x + i, y + h - 5, 3, 2); }
      for (let i = 6; i < h - 6; i += 6) { g.fillRect(x + 3, y + i, 2, 3); g.fillRect(x + w - 5, y + i, 2, 3); }
      g.fillStyle = "#787888";
      g.fillRect(x + Math.round(w / 3), y + 6, 1, h - 12); g.fillRect(x + Math.round(2 * w / 3), y + 6, 1, h - 12);
      g.fillRect(x + 6, y + Math.round(h / 2), w - 12, 1);
    }

    function darkness(name) {
      if (name !== ECRUTEAK) return null;
      const lights = [];
      for (const p of env.people()) {
        if (!isMedium(p.def)) continue;
        // (Beaten since you came in: a moment, then her candle goes out.)
        let r = CANDLE;
        if (!state.lit.has(p.def.id) && env.beaten(p.def.trainer.id)) {
          const t = state.out[p.def.id] = (state.out[p.def.id] || 0) + 1;
          if (t === CANDLE_WAIT) env.sfx("se_m_ember");
          r = t < CANDLE_WAIT ? CANDLE : CANDLE * Math.max(0, 1 - (t - CANDLE_WAIT) / CANDLE_SHRINK);
        }
        if (r > 0) lights.push({ x: p.x, y: p.y, r });
      }
      return { radius: SIGHT, lights, rects: LIT };
    }

    function turnWinch() {
      if (state.winch) return false;
      state.winch = true;
      env.sfx("se_m_strength");
      return true;
    }
    const patches = (name) => (name === CIANWOOD && state.winch ? ["dry"] : []);

    return { enter, patches, darkness, drawMap, violetLift, turnWinch, winch: () => state.winch, liftUp: () => !!state.lift };
  }

  window.JohtoGymmicks = { create };
})();
