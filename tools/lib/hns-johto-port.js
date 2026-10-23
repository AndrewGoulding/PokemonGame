// The port (tools/lib/hns-johto.js): Johto's HGSS-built maps (out, by name) redrawn from Heart & Soul's, their
// events moved there. Changes `out` in place; returns { where, report }.
//
// For each map Heart & Soul has (tools/data/hns-johto-maps.json): its picture, collision, heights, behaviours,
// wild tiles, animations, border, doors and connections are Heart & Soul's. Its doors lead where Heart & Soul's
// do (to the maps this game made of those), and each HGSS map whose events go there (itself, and any merged into
// it) is fitted to it: first by the walkable parts' extents, then by anchors (its doors matched to Heart & Soul's
// doors to the same places, then its people to Heart & Soul's people of the same look, its signs to signs and
// its hidden items to the same items, nearby), ui/johto-coords.js's fit. Then its events are put there: a matched
// one where Heart & Soul has it, the rest where the fit takes them, onto the nearest tile that suits them (people
// where you can stand, nobody else is and no door is); a step trigger that's a line across a way stretched over
// all the way's width. HGSS's doors to places Heart & Soul hasn't got (its own maps this game keeps, Kanto's)
// take the nearest Heart & Soul door that leads nowhere this game has, or a new door where the fit takes them.
"use strict";
const path = require("path");
const fs = require("fs");
const Coords = require("../../ui/johto-coords.js");

module.exports = function port(HN, out, opts) {
  const { table, mapsDir, writePng, writeAnimSheet } = opts;
  const log = opts.log || (() => {});
  // (Heart & Soul's maps HGSS has no map for, on the way between ones it has (new: like: a map whose title, music
  // and wild Pokémon it has): new maps, Heart & Soul's with nothing of HGSS's on them.)
  const like = {};
  for (const [k, e] of Object.entries(table)) if (e && e.new && !out[k] && out[e.like]) {
    const L = out[e.like];
    out[k] = { name: k, title: L.title, type: L.type, music: L.music, region: L.region, allowEscaping: L.allowEscaping, cycling: L.cycling, showName: L.showName,
      wild: L.wild, water: L.water, fishing: L.fishing, rockSmash: L.rockSmash, people: [], signs: [], hidden: [], triggers: [], warps: [], connections: [],
      width: 1, height: 1, collision: [0], elevation: [0], behavior: [0], encounter: [0] };
    Object.defineProperty(out[k], "isNew", { value: true });
    like[k] = e.like;
  }
  const names = Object.keys(out);
  const plan = {}, into = {}, report = {};
  for (const n of names) plan[n] = HN.entryFor(n, table);
  for (const n of names) if (plan[n] && plan[n] !== "drop") { into[n] = n; for (const m of plan[n].merge) into[m] = n; }
  for (const n of names) if (!(n in into)) into[n] = plan[n] === "drop" ? null : n;
  const paired = names.filter((n) => plan[n] && plan[n] !== "drop");
  const game = (d) => (d in into ? into[d] : d);   // (the map an HGSS map's events, and doors to it, went to)

  // ---------- Geometry ----------
  const geo = {};
  for (const n of paired) geo[n] = HN.geometry(n, plan[n]);
  // Heart & Soul's doors, each in this game: (its map, door) -> (game map, index).
  const doorAt = {};
  for (const n of paired) geo[n].warps.forEach((w, i) => { doorAt[w.hns + "#" + w.id] = { map: n, index: i }; });
  const newWarps = {};
  for (const n of paired) newWarps[n] = geo[n].warps.map((w) => {
    if (w.destMap === "MAP_DYNAMIC") return { x: w.x, y: w.y, map: null, mapConst: "MAP_DYNAMIC", warp: null };
    // (A door number its map hasn't got, as the S.S. Aqua's way off to the port's: that map's first door.)
    const d = doorAt[w.destMap + "#" + w.destId] || (HN.maps[w.destMap] && (HN.maps[w.destMap].warp_events || []).length <= w.destId ? doorAt[w.destMap + "#0"] : null);
    return d ? { x: w.x, y: w.y, map: d.map, warp: d.index } : { x: w.x, y: w.y, map: null, mapConst: "HNS_" + w.destMap, warp: null, loose: true };
  });
  // (Heart & Soul's doors that lead one way to somewhere HGSS's map has no door to: its test doors, as New Bark's to
  // the Tin Tower's roof: gone, as doors that lead nowhere here are.)
  const target = new Set();
  for (const n of paired) for (const w of newWarps[n]) if (w.map) target.add(w.map + "#" + w.warp);
  const outdoor = (n) => plan[n].pieces.some((p) => (HN.maps[p.hns].connections || []).length);
  for (const n of paired) newWarps[n].forEach((w, i) => {
    if (!w.map || w.loose || !outdoor(n) || target.has(n + "#" + i)) return;
    const back = geo[w.map] && geo[w.map].warps[w.warp];
    if (!back || back.destMap === geo[n].warps[i].hns) return;
    if (out[n].warps.some((h) => h.map && game(h.map) === w.map)) return;
    Object.assign(w, { map: null, warp: null, mapConst: "HNS_ONE_WAY", loose: true });
  });
  // (Heart & Soul's doors the table gives to HGSS's doors to a place (redirect: { index: place }): Route 40's
  // gatehouse's north door, Heart & Soul's back onto Route 40, HGSS's to the Battle Frontier.)
  for (const n of paired) for (const [i, to] of Object.entries(plan[n].redirect || {})) {
    Object.assign(newWarps[n][+i], { map: null, warp: null, loose: true, to: "^" + to + "$" });
    // (And Heart & Soul's doors to it, from the side it led: gone, as doors that lead nowhere here are.)
    for (const m of paired) for (const w of newWarps[m]) if (w.map === n && w.warp === +i) Object.assign(w, { map: null, warp: null, mapConst: "HNS_REDIRECTED", loose: true });
  }
  // (Door slots the table adds, for HGSS's doors to one kind of place: a Pokémon Center's stairs up.)
  for (const n of paired) for (const d of plan[n].doors || []) {
    newWarps[n].push({ x: d.x, y: d.y, map: null, mapConst: "HNS_SLOT", warp: null, loose: true, to: d.to });
    if (geo[n].behavior[d.y * geo[n].width + d.x] === 0) geo[n].behavior[d.y * geo[n].width + d.x] = 0x60;
  }

  // ---------- Fitting ----------
  const standables = (m) => { const xs = [], ys = []; for (let i = 0; i < m.width * m.height; i++) if (!m.collision[i]) { xs.push(i % m.width); ys.push(Math.floor(i / m.width)); } return { xs, ys }; };
  const extent = (v) => { const s = v.slice().sort((a, b) => a - b); return [s[Math.floor(s.length * 0.02)] || 0, s[Math.floor(s.length * 0.98)] || 0]; };
  function bboxFit(hg, g) {
    const a = standables(hg), b = standables(g);
    if (!a.xs.length || !b.xs.length) return [1, 0, 1, 0];
    const [ax0, ax1] = extent(a.xs), [ay0, ay1] = extent(a.ys), [bx0, bx1] = extent(b.xs), [by0, by1] = extent(b.ys);
    const sx = ax1 > ax0 ? Math.max(0.5, Math.min(2, (bx1 - bx0) / (ax1 - ax0))) : 1, sy = ay1 > ay0 ? Math.max(0.5, Math.min(2, (by1 - by0) / (ay1 - ay0))) : 1;
    return [sx, bx0 - sx * ax0, sy, by0 - sy * ay0];
  }
  // A person's kind and look, to match HGSS's with Heart & Soul's.
  // (HGSS's sprites and Heart & Soul's that are the same people: the Gym guide, nurses, clerks, the Leaders.)
  const SAME = { SUNGLASSES: "GYMGUY", PCWOMAN: "NURSE", SHOPM: "CLERK", LEADER1: "FALKNER", LEADER2: "BUGSY", LEADER3: "WHITNEY",
    LEADER4: "MORTY", LEADER5: "CHUCK", LEADER6: "JASMINE", LEADER7: "PRYCE", LEADER8: "CLAIR" };
  // (HGSS's names for its everyday people and its story's, as Heart & Soul's: a hiker is HGSS's MOUNT, the Elder its CHOUROU, ...)
  const ALIAS = { MIDDLEMAN1: "BALDINGMAN", GIRL1: "LASS", GIRL2: "LITTLEGIRL", GIRL3: "PICNICKER", BOY1: "BOY", BOY2: "YOUNGSTER", BOY3: "CAMPER",
    BABYGIRL1: "LITTLEGIRL", BABYBOY1: "LITTLEBOY", MAN1: "MAN", MAN3: "COOLTRAINERM", WOMAN3: "COOLTRAINERF", MOUNT2: "HIKER", BIGMAN: "FATMAN",
    COUNTERM: "CLERK", MARTEMPLOYEE: "CLERK", SEAMAN2: "SAILOR", DANCER: "KIMONOGIRL", FISHING2: "FISHER", FIGHTER: "BLACKBELT", OLDMAN1: "OLDMAN",
    OLDWOMAN1: "OLDWOMAN", ASSISTANTM: "SCIENTISTM", MANIA: "SUPERNERD", BOZU: "SAGE", RIVEL: "SILVER", CAMPBOY2: "CAMPER", PICNICGIRL2: "PICNICKER",
    SWIMMERM: "SWIMMERMWATER", SWIMMERW: "SWIMMERFWATER", WATARU: "LANCE", MINAKI: "EUSINE", JUGGRER: "JUGGLER", FIRE: "FIREBREATHER",
    GANTETSU: "KURT", CHOUROU: "ELDER", MRFUJI: "ELDER", DOCTOR: "PROFELM", MAMA: "MOM", OOKIDO: "PROFOAK", MASAKI: "BILL", THIEF: "BURGLAR",
    SAKAKI: "GIOVANNI", WORKMAN: "WORKERM", ROCKETW: "ROCKETF", ITAKO: "CHANNELER" };
  // (People there's only one of where they are, matched however far: the guide, the nurse, the clerk, the Leaders, the story's own.)
  const DISTINCT = new Set(["GYMGUY", "NURSE", "CLERK", "FALKNER", "BUGSY", "WHITNEY", "MORTY", "CHUCK", "JASMINE", "PRYCE", "CLAIR", "SILVER", "ELDER",
    "PROFELM", "PROFOAK", "KURT", "EUSINE", "LANCE", "BILL", "MOM"]);
  // (And the Pokémon standing about: HGSS's by their Japanese names or as "following" Pokémon, Heart & Soul's as MON_BASE+SPECIES_.)
  const MON = { USOKKY: "SUDOWOODO", RGYARADOSU: "GYARADOS", RAPURASU: "LAPRAS", YADON: "SLOWPOKE" };
  const isMon = (s) => /MON_BASE\+SPECIES_|FOLLOWER_MON_STATIC|TSURE_POKE/.test(String(s || "").toUpperCase()) || !!MON[String(s || "").toUpperCase().replace(/^(SPRITE_|HGSS_)/, "")];
  const look = (s) => {
    const k = String(s || "").toUpperCase().replace(/^(OBJ_EVENT_GFX_|SPRITE_)/, "").replace(/^(GS|HGSS_)/, "").replace(/_/g, "")
      .replace(/^MONBASE\+SPECIES/, "").replace(/^(TSUREPOKE|FOLLOWERMON)STATIC/, "");
    if (MON[k]) return MON[k];
    if (ALIAS[k]) return ALIAS[k];
    if (/^PCWOMAN[23]/.test(k)) return k;   // (the Wi-Fi rooms' receptionists: no nurses)
    const m = /^(LEADER\d|PCWOMAN|SHOPM|SUNGLASSES)/.exec(k);
    const k2 = k.replace(/\d+$/, "");
    return m ? SAME[m[1]] : ALIAS[k2] || k2;
  };
  function kindOfHgss(p) {
    if (p.item) return "item";
    if (p.script === "EventScript_CutTree") return "cut";
    if (p.script === "EventScript_RockSmash") return "rock";
    if (/^hgss_apricorn/.test(p.script || "")) return "tree";
    if (/^SPRITE_ROCK$/.test(p.hgssSprite || "")) return "boulder";   // (Strength's: not SPRITE_ROCKETM, nor SPRITE_BREAKROCK)
    return "person";
  }
  function kindOfHns(o) {
    const g = o.graphics_id || "";
    if (/ITEM_BALL/.test(g)) return "item";
    if (/CUTTABLE_TREE/.test(g)) return "cut";
    if (/BREAKABLE_ROCK/.test(g)) return "rock";
    if (/BERRY_TREE/.test(g)) return "tree";
    if (/BOULDER/.test(g)) return "boulder";
    return "person";
  }
  // Cut trees, breakable rocks and boulders: Heart & Soul's own where it has them (see below), each as one of HGSS's looks.
  const OBSTACLE = new Set(["cut", "rock", "boulder"]);
  let obstacleLooks = null;
  function obstacleLook(kind) {
    if (!obstacleLooks) {
      obstacleLooks = {};
      for (const m of Object.values(out)) for (const p of m.people || []) {
        const k = kindOfHgss(p);
        // (Any of HGSS's: theirs come back when you return, FLAG_MAPTEMP_*, as these do.)
        if (OBSTACLE.has(k) && !obstacleLooks[k]) {
          const t = Object.assign({}, p);
          delete t.hgssFlag; delete t.offstage;
          Object.defineProperty(t, "hgssSprite", { value: p.hgssSprite });
          obstacleLooks[k] = t;
        }
      }
    }
    return obstacleLooks[kind];
  }
  // Greedy one-to-one matching under a cost (lowest first), costs over `limit` left out.
  function match(as, bs, cost, limit) {
    const c = [];
    as.forEach((a, i) => bs.forEach((b, j) => { const v = cost(a, b); if (v <= limit) c.push([v, i, j]); }));
    c.sort((p, q) => p[0] - q[0]);
    const ua = new Set(), ub = new Set(), pairs = [];
    for (const [v, i, j] of c) if (!ua.has(i) && !ub.has(j)) { ua.add(i); ub.add(j); pairs.push([i, j, v]); }
    return pairs;
  }
  const dist = (src, h, g) => { const [x, y] = Coords.forward(src, h.x, h.y); return Math.hypot(x - g.x, y - g.y); };
  const itemOf = (s) => String(s || "").replace(/^ITEM_/, "").toLowerCase().replace(/_/g, "-");

  // (Where someone can stand: not solid, not water.)
  const WATER = new Set([0x10, 0x11, 0x12, 0x13, 0x15, 0x16, 0x17, 0x19]);
  const walkable = (g, x, y) => x >= 0 && y >= 0 && x < g.width && y < g.height && !g.collision[y * g.width + x] && !WATER.has(g.behavior[y * g.width + x]);
  // A tile to put someone the fit took near (fx, fy) on: one they can stand on that nobody and no door has, and
  // not where they'd close a way one tile wide or stand in front of a door; the nearest such.
  // (Tiles you can get to from the map's doors and edges, on foot or by water: those are better.)
  function reachable(g) {
    if (g.reach) return g.reach;
    const W = g.width, H = g.height, seen = new Uint8Array(W * H), q = [];
    const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (!g.collision[y * W + x] || WATER.has(g.behavior[y * W + x]) || (g.behavior[y * W + x] >= 0x38 && g.behavior[y * W + x] <= 0x3b));
    const add = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H && !seen[y * W + x]) { seen[y * W + x] = 1; q.push(y * W + x); } };
    for (const w of g.warps) add(w.x, w.y);
    // (A map's edges, where it joins another: outdoors.)
    if (g.pieces.some((p) => (HN.maps[p.hns].connections || []).length)) {
      for (let x = 0; x < W; x++) { if (open(x, 0)) add(x, 0); if (open(x, H - 1)) add(x, H - 1); }
      for (let y = 0; y < H; y++) { if (open(0, y)) add(0, y); if (open(W - 1, y)) add(W - 1, y); }
    }
    while (q.length) { const k = q.pop(), x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(x + dx, y + dy)) add(x + dx, y + dy); }
    return (g.reach = seen);
  }
  // How well a map's entrances (each door, and each edge it joins others by) get to one another with
  // `blocked` tiles (people) in the way: the count of entrance-to-entrance ways there are, going as you
  // would early on (ledges one way only, down them; no Surf).
  const LEDGE = { 0x38: [1, 0], 0x39: [-1, 0], 0x3a: [0, -1], 0x3b: [0, 1] };
  function reachScore(m, blocked, edges) {
    const W = m.width, H = m.height;
    const open = (k) => !m.collision[k] && !WATER.has(m.behavior[k]) && !blocked.has(k);
    const groups = m.warps.map((w) => [w.y * W + w.x]);
    if (edges) {
      const sides = [[], [], [], []];
      for (let x = 0; x < W; x++) { sides[0].push(x); sides[1].push((H - 1) * W + x); }
      for (let y = 0; y < H; y++) { sides[2].push(y * W); sides[3].push(y * W + W - 1); }
      for (const sd of sides) { const o = sd.filter(open); if (o.length) groups.push(o); }
    }
    const groupOf = new Map();
    groups.forEach((gr, i) => gr.forEach((k) => { if (!groupOf.has(k)) groupOf.set(k, i); }));
    let score = 0;
    for (const gr of groups) {
      const seen = new Uint8Array(W * H), q = gr.filter((k) => !blocked.has(k)), got = new Set();
      for (const k of q) seen[k] = 1;
      while (q.length) {
        const k = q.pop(), x = k % W, y = (k / W) | 0;
        if (groupOf.has(k)) got.add(groupOf.get(k));
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          let nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          let n = ny * W + nx;
          const L = LEDGE[m.behavior[n]];
          if (L) { if (L[0] !== dx || L[1] !== dy) continue; nx += dx; ny += dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; n = ny * W + nx; }
          if (seen[n] || !(open(n) || groupOf.has(n) && !blocked.has(n))) continue;
          // (Between heights only from or onto 0 or 15, as game/world.js steps.)
          const za = m.elevation ? m.elevation[k] : 0, zb = m.elevation ? m.elevation[n] : 0;
          if (!L && za !== zb && za !== 0 && zb !== 0 && za !== 15 && zb !== 15) continue;
          seen[n] = 1; q.push(n);
        }
      }
      score += got.size;
    }
    return score;
  }
  // Does `k` (a person there) cut ways between entrances that `blocked` leaves open?
  const parts = (m, blocked, k, edges) => reachScore(m, new Set([...blocked, k]), edges) < reachScore(m, blocked, edges);
  function placeOn(g, fx, fy, free, doors) {
    let best = null, bc = Infinity;
    const reach = reachable(g);
    let bestReached = false;
    for (let r = 0; r <= 40 && (!bestReached || r <= 3); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = Math.round(fx) + dx, y = Math.round(fy) + dy;
      if (!walkable(g, x, y) || !free(x, y)) continue;
      // (Its neighbours: doors and pits count as in the way.)
      const open = (u, v) => walkable(g, u, v) && !doors.has(u + "," + v);
      const L = open(x - 1, y), R = open(x + 1, y), U = open(x, y - 1), D = open(x, y + 1);
      const corridor = (L && R && !U && !D) || (U && D && !L && !R);
      const reached = !!reach[y * g.width + x];
      const c = Math.hypot(x - fx, y - fy) + (corridor ? 4 : 0) + (doors.has(x + "," + (y - 1)) || doors.has(x + "," + (y + 1)) ? 3 : 0);
      if ((reached && !bestReached) || (reached === bestReached && c < bc)) { bc = c; best = [x, y]; bestReached = reached; }
    }
    return best || Coords.snap(fx, fy, g.width, g.height, null);
  }
  const where = {};
  for (const n of names) where[n] = into[n];
  const usedCoordsOf = {};
  for (const G of paired) {
    const g = geo[G], sources = [G].concat(plan[G].merge).filter((s) => out[s] && !out[s].isNew);
    const gm = { width: g.width, height: g.height, collision: g.collision };
    const warps = newWarps[G], people = [], signs = [], hidden = [], triggers = [], hgssSrc = [], hgssWarps = {};
    const used = new Set(warps.map((w) => w.y * g.width + w.x));
    const taken = new Set(), takenObj = new Set(), takenBg = new Set();
    const rep = report[G] = { sources, people: 0, peopleMatched: 0, signs: 0, signsMatched: 0, warpsMatched: 0, warpsAdded: 0, warpsRedirected: 0 };
    for (const S of sources) {
      const hg = out[S];
      let src = { map: S, width: hg.width, height: hg.height, fit: bboxFit(hg, gm), anchors: [] };
      // Doors: HGSS's to a place, Heart & Soul's to the same place.
      const hw = hg.warps.map((w, i) => ({ i, x: w.x, y: w.y, dest: w.map ? game(w.map) : w.mapConst || null })).filter((w) => w.dest && w.dest !== G);
      const gw = warps.map((w, j) => ({ j, x: w.x, y: w.y, dest: w.map || null }));
      let wpairs = [];
      for (let round = 0; round < 3; round++) {
        const limit = Math.max(6, 0.3 * Math.hypot(g.width, g.height)) / (round + 1) + 2;
        wpairs = match(hw, gw, (a, b) => (a.dest === b.dest ? dist(src, a, b) : Infinity), limit);
        const anchors = wpairs.map(([i, j]) => [hw[i].x, hw[i].y, gw[j].x, gw[j].y]);
        src = { map: S, width: hg.width, height: hg.height, fit: anchors.length >= 2 ? Coords.fit(anchors) : anchors.length === 1 ? (() => { const f = src.fit; return [f[0], anchors[0][2] - f[0] * anchors[0][0], f[2], anchors[0][3] - f[2] * anchors[0][1]]; })() : src.fit, anchors };
      }
      // People, signs and hidden items to Heart & Soul's: more anchors.
      const hp = hg.people.map((p) => ({ p, x: p.x, y: p.y, kind: kindOfHgss(p), look: look(p.hgssSprite || p.sprite), mon: isMon(p.hgssSprite || p.sprite) }));
      const op = g.objects.map((o, k) => ({ o, k, x: o.x, y: o.y, kind: kindOfHns(o), look: look(o.graphics_id), mon: isMon(o.graphics_id) })).filter((o) => !takenObj.has(o.k));
      // (A Pokémon only to the same Pokémon: Sudowoodo to Sudowoodo, not to the man beside it.)
      const monOk = (a, b) => a.mon === b.mon && (!a.mon || a.look === b.look);
      // (Heart & Soul's people where you can stand, only; its trees, rocks and boulders where they are, solid as they are.)
      const rch = reachable(g);
      // (Or where you can't get to but someone the same stands there: the nurse and the clerks behind their counters.)
      const opw = op;
      for (const o of opw) o.far = (o.kind === "person" || o.kind === "item") && !(walkable(g, o.x, o.y) && rch[o.y * g.width + o.x]);
      const ppairs = match(hp, opw, (a, b) => {
        if (a.kind !== b.kind || !monOk(a, b) || (b.far && (a.kind !== "person" || a.look !== b.look))) return Infinity;
        if (a.look !== b.look && (DISTINCT.has(a.look) || DISTINCT.has(b.look))) return Infinity;   // (the Elder is no one else, nor Silver)
        return dist(src, a, b) + (a.kind === "person" && a.look !== b.look ? 2 : 0);
      }, 5);
      // (Then, further, the rest of each to the rest of Heart & Soul's of their kind: a trainer to a trainer.)
      {
        const ua = new Set(ppairs.map(([i]) => i)), ub = new Set(ppairs.map(([, j]) => j));
        const ra = hp.map((h, i) => i).filter((i) => !ua.has(i) && !hp[i].p.offstage), rb = opw.map((o, j) => j).filter((j) => !ub.has(j) && !opw[j].far);
        const trainerOf = (o) => o.o.trainer_type && o.o.trainer_type !== "TRAINER_TYPE_NONE";
        const more = match(ra.map((i) => hp[i]), rb.map((j) => opw[j]), (a, b) => (a.kind !== b.kind || !monOk(a, b) || (a.look !== b.look && (DISTINCT.has(a.look) || DISTINCT.has(b.look))) ? Infinity
          : dist(src, a, b) + (a.kind === "person" && !!a.p.trainer !== trainerOf(b) ? 5 : 0) + (a.kind === "person" && a.look !== b.look ? 1 : 0)), 11);
        for (const [i, j, v] of more) ppairs.push([ra[i], rb[j], v + 100]);
        // (The same people where you can't stand, further: Sudowoodo in its tree's place.)
        {
          const ua3 = new Set(ppairs.map(([i]) => i)), ub3 = new Set(ppairs.map(([, j]) => j));
          const fa = hp.map((h, i) => i).filter((i) => !ua3.has(i) && hp[i].kind === "person"), fb = opw.map((o, j) => j).filter((j) => !ub3.has(j) && opw[j].far && opw[j].kind === "person");
          for (const [i, j, v] of match(fa.map((i) => hp[i]), fb.map((j) => opw[j]), (a, b) => (a.look === b.look ? dist(src, a, b) : Infinity), 11)) ppairs.push([fa[i], fb[j], v + 150]);
        }
        // (And the Apricorn trees left onto Heart & Soul's berry trees left, however far: they're only where the fruit grows.)
        const ua2 = new Set(ppairs.map(([i]) => i)), ub2 = new Set(ppairs.map(([, j]) => j));
        const ta = hp.map((h, i) => i).filter((i) => !ua2.has(i) && hp[i].kind === "tree"), tb = opw.map((o, j) => j).filter((j) => !ub2.has(j) && opw[j].kind === "tree");
        for (const [i, j, v] of match(ta.map((i) => hp[i]), tb.map((j) => opw[j]), (a, b) => dist(src, a, b), Infinity)) ppairs.push([ta[i], tb[j], v + 200]);
        // (And the one of a kind, however far: a distinct person, or a trainer, the only one of their look left on each map.)
        {
          const ua4 = new Set(ppairs.map(([i]) => i)), ub4 = new Set(ppairs.map(([, j]) => j));
          const trainerOf = (o) => o.o.trainer_type && o.o.trainer_type !== "TRAINER_TYPE_NONE";
          const looks = new Set(hp.filter((h, i) => !ua4.has(i) && h.kind === "person").map((h) => h.look));
          for (const L of looks) {
            const as = hp.map((h, i) => i).filter((i) => !ua4.has(i) && hp[i].kind === "person" && hp[i].look === L && !hp[i].p.offstage);
            const bs = opw.map((o, j) => j).filter((j) => !ub4.has(j) && opw[j].kind === "person" && opw[j].look === L);
            if (bs.length !== 1 || !as.length) continue;
            const trainers = as.filter((i) => !!hp[i].p.trainer);
            if (!DISTINCT.has(L) && !(trainers.length === 1 && as.length === 1 && trainerOf(opw[bs[0]]))) continue;
            const i = as.slice().sort((a, b) => dist(src, hp[a], opw[bs[0]]) - dist(src, hp[b], opw[bs[0]]))[0];
            ppairs.push([i, bs[0], 0.5]);   // (an anchor for the fit, as sure as a door)
          }
        }
      }
      const hs = hg.signs.map((s, i) => ({ s, i, x: s.x, y: s.y }));
      const os = g.bgs.map((b, k) => ({ b, k, x: b.x, y: b.y })).filter((o) => o.b.type === "sign" && !takenBg.has(o.k));
      const spairs = match(hs, os, (a, b) => dist(src, a, b), 4);
      // (Then by what they say: Heart & Soul's AzaleaTown_EventScript_KurtSign is the sign whose words name Kurt,
      // however far the fit puts it; then the rest outdoors, each to the nearest sign left within 12 tiles.)
      {
        const key = (b) => String(b.b.script || "").replace(/^.*_(EventScript|MapScript)_/, "").replace(/(Sign|Signpost|Description|Descripton)$/, "").toLowerCase();
        const says = (h) => [].concat(h.s.text || []).join(" ").toLowerCase().replace(/[^a-z]/g, "");
        const more = (cost, limit) => {
          const ua = new Set(spairs.map(([i]) => i)), ub = new Set(spairs.map(([, j]) => j));
          const ai = hs.map((h, i) => i).filter((i) => !ua.has(i)), bj = os.map((o, j) => j).filter((j) => !ub.has(j));
          for (const [i, j, v] of match(ai.map((i) => hs[i]), bj.map((j) => os[j]), cost, limit)) spairs.push([ai[i], bj[j], v]);
        };
        more((a, b) => { const k = key(b); return k.length >= 3 && says(a).includes(k) ? dist(src, a, b) : Infinity; }, 1e9);
        if (hg.type !== "indoor") more((a, b) => dist(src, a, b), 12);
      }
      const hh = (hg.hidden || []).map((h) => ({ h, x: h.x, y: h.y }));
      const oh = g.bgs.map((b, k) => ({ b, k, x: b.x, y: b.y })).filter((o) => o.b.type === "hidden_item");
      const hpairs = match(hh, oh, (a, b) => (itemOf(b.b.item) === a.h.item ? dist(src, a, b) : Infinity), 10);
      const extra = [].concat(ppairs.filter(([i, , v]) => v <= 3 || DISTINCT.has(hp[i].look)).map(([i, j]) => [hp[i].x, hp[i].y, opw[j].x, opw[j].y]),
        spairs.map(([i, j]) => [hs[i].x, hs[i].y, os[j].x, os[j].y]), hpairs.map(([i, j]) => [hh[i].x, hh[i].y, oh[j].x, oh[j].y]));
      if (extra.length) {
        const anchors = src.anchors.concat(extra);
        src = { map: S, width: hg.width, height: hg.height, fit: anchors.length >= 2 ? Coords.fit(anchors) : src.fit, anchors };
      }
      // (Two anchors on one tile, or one tile two ways: the first kept.)
      const seenA = new Set();
      src.anchors = src.anchors.filter((a) => { const k = a[0] + "," + a[1]; if (seenA.has(k)) return false; seenA.add(k); return true; });
      // (Its doors, HGSS's tile and Heart & Soul's: a scripted walk to beside one goes through it, ui/johto-coords.js.)
      src.doors = wpairs.map(([i, j]) => [hw[i].x, hw[i].y, gw[j].x, gw[j].y]);
      hgssSrc.push(src);
      rep.warpsMatched += wpairs.length;
      const fwd = (x, y) => Coords.forward(src, x, y);
      const stand = (x, y) => !g.collision[y * g.width + x] && !used.has(y * g.width + x) && !taken.has(y * g.width + x);

      // People.
      const pm = new Map(ppairs.map(([i, j]) => [i, opw[j]]));
      const doorTiles = new Set(warps.map((w) => w.x + "," + w.y));
      // (Who stands in the way in HGSS's map, with everyone else there: kept so, as Sudowoodo and the guards are.)
      const hgEdges = (hg.connections || []).length > 0, hgAll = new Set(hp.filter((x) => !x.p.offstage).map((x) => x.y * hg.width + x.x));
      const placed = [];
      // (Those matched first, then the rest, who may go by them.)
      const order = hp.map((h, i) => i).sort((a, b) => (pm.has(a) ? 0 : 1) - (pm.has(b) ? 0 : 1) || a - b);
      order.map((i) => [hp[i], i]).forEach(([h, i]) => {
        const p = Object.assign({}, h.p), m = pm.get(i);
        if (!OBSTACLE.has(h.kind) && h.kind !== "tree") {
          const others = new Set(hgAll); others.delete(h.y * hg.width + h.x);
          Object.defineProperty(p, "inTheWay", { value: parts(hg, others, h.y * hg.width + h.x, hgEdges), writable: true });
        }
        // (A Cut tree, breakable rock or boulder of HGSS's with none of Heart & Soul's for it: Heart & Soul's
        // ground has its own where it needs them, so it's left out.)
        if (!m && OBSTACLE.has(h.kind)) { rep.obstaclesDropped = (rep.obstaclesDropped || 0) + 1; return; }
        let x, y;
        // (An Apricorn tree on one of Heart & Soul's trees: its picture is the map's own, drawn already.)
        if (m && h.kind === "tree") p.drawnOnMap = true;
        const free = (u, v) => u >= 0 && v >= 0 && u < g.width && v < g.height && !used.has(v * g.width + u) && !taken.has(v * g.width + u);
        if (m) { x = m.x; y = m.y; takenObj.add(m.k); rep.peopleMatched++; if (p.trainer && +m.o.trainer_sight_or_berry_tree_id) p.trainer = Object.assign({}, p.trainer, { sight: +m.o.trainer_sight_or_berry_tree_id }); }
        else {
          let spot = null;
          // (Someone who stands in for another of their look, the two never there at once: the Gym guide before
          // Sprout Tower and after, on the same spot.)
          const alt = h.p.hgssFlag && DISTINCT.has(h.look) && placed.find((q) => q.look === h.look && q.flag && q.flag !== h.p.hgssFlag);
          if (alt) spot = [alt.x, alt.y];
          // (A second clerk: behind the counter beside the first.)
          const twin = !spot && DISTINCT.has(h.look) && placed.find((q) => q.look === h.look && q.far);
          if (twin) for (const [dx, dy] of [[0, 1], [0, -1], [0, 2], [0, -2], [1, 0], [-1, 0]]) {
            const u = twin.x + dx, v = twin.y + dy;
            if (!spot && walkable(g, u, v) && !rch[v * g.width + u] && free(u, v)) spot = [u, v];
          }
          // (Beside someone they stood beside in HGSS, as they stood: the Rocket and the man he harasses in Azalea.)
          if (!spot) for (const q of placed) {
            if (Math.abs(q.hx - h.x) + Math.abs(q.hy - h.y) > 2) continue;
            const u = q.x + h.x - q.hx, v = q.y + h.y - q.hy;
            if (walkable(g, u, v) && rch[v * g.width + u] && free(u, v)) { spot = [u, v]; break; }
          }
          [x, y] = spot || placeOn(g, ...fwd(h.x, h.y), free, doorTiles);
          if (!spot) p.byFit = true;
        }
        placed.push({ look: h.look, flag: h.p.hgssFlag, x, y, hx: h.x, hy: h.y, far: !!(m && m.far), p });
        rep.people++;
        taken.add(y * g.width + x);
        Object.defineProperty(p, "hgssSprite", { value: h.p.hgssSprite });
        people.push(Object.assign(p, { id: people.length, x, y }));
      });
      // (Then anyone put where the fit took them, beside someone they stood beside in HGSS who came after them.)
      for (const a of placed) {
        if (!a.p.byFit) continue;
        for (const q of placed) {
          if (q === a || Math.abs(q.hx - a.hx) + Math.abs(q.hy - a.hy) > 2) continue;
          const u = q.x + a.hx - q.hx, v = q.y + a.hy - q.hy;
          if (!(u >= 0 && v >= 0 && u < g.width && v < g.height) || !walkable(g, u, v) || !rch[v * g.width + u] || used.has(v * g.width + u) || taken.has(v * g.width + u)) continue;
          taken.delete(a.y * g.width + a.x); taken.add(v * g.width + u);
          a.x = a.p.x = u; a.y = a.p.y = v;
          break;
        }
        delete a.p.byFit;
      }
      // Signs (on what they're on: no snapping, but onto the map).
      const sm = new Map(spairs.map(([i, j]) => [i, os[j]]));
      hs.forEach((h, i) => {
        const m = sm.get(i);
        let x, y;
        if (m) { x = m.x; y = m.y; takenBg.add(m.k); rep.signsMatched++; }
        else [x, y] = Coords.snap(...fwd(h.x, h.y), g.width, g.height, null);
        rep.signs++;
        signs.push(Object.assign({}, h.s, { x, y }));
      });
      // Hidden items.
      const hm = new Map(hpairs.map(([i, j]) => [i, oh[j]]));
      hh.forEach((h, i) => {
        const m = hm.get(i);
        const [x, y] = m ? [m.x, m.y] : Coords.snap(...fwd(h.x, h.y), g.width, g.height, (u, v) => !g.collision[v * g.width + u], 3);
        hidden.push(Object.assign({}, h.h, { x, y }));
      });
      // Step triggers: by script; a line stretched across the way.
      const groups = {}, usedCoords = usedCoordsOf[G] || (usedCoordsOf[G] = new Set());
      for (const t of hg.triggers || []) (groups[t.script] = groups[t.script] || []).push(t);
      for (const [script, ts] of Object.entries(groups)) {
        const tiles = new Set();
        const row = ts.every((t) => t.y === ts[0].y) && ts.length > 1, col = ts.every((t) => t.x === ts[0].x) && ts.length > 1;
        for (const t of ts) {
          const [x, y] = Coords.snap(...fwd(t.x, t.y), g.width, g.height, (u, v) => walkable(g, u, v), 3);
          tiles.add(x + "," + y);
          if (row || col) {
            const [dx, dy] = row ? [1, 0] : [0, 1];
            for (const s of [1, -1]) for (let k = 1; k <= 12; k++) {
              const u = x + dx * s * k, v = y + dy * s * k;
              if (!walkable(g, u, v)) break;
              tiles.add(u + "," + v);
            }
          }
        }
        // (A single tile of HGSS's, with a scene trigger of Heart & Soul's near: Heart & Soul's tiles for it, its own scene's
        // line, which its ground's way through needs: Sprout Tower's top floor's two-wide gap.)
        if (ts.length === 1 && (g.coords || []).length) {
          const [x0, y0] = [...tiles][0].split(",").map(Number);
          const near = g.coords.filter((c) => Math.abs(c.x - x0) + Math.abs(c.y - y0) <= 6 && !usedCoords.has(c))
            .sort((a, b) => Math.abs(a.x - x0) + Math.abs(a.y - y0) - (Math.abs(b.x - x0) + Math.abs(b.y - y0)));
          if (near.length) {
            // (One scene's line: the same var and value, a tile each side its own script, as Sprout Tower's Left and Right.)
            const line = g.coords.filter((c) => (c.script === near[0].script || (c.var && c.var === near[0].var && c.var_value === near[0].var_value
              && Math.abs(c.x - near[0].x) + Math.abs(c.y - near[0].y) <= 4)) && !usedCoords.has(c));
            tiles.clear();
            for (const c of line) { usedCoords.add(c); tiles.add(c.x + "," + c.y); }
          }
        }
        for (const k of tiles) { const [x, y] = k.split(",").map(Number); triggers.push({ x, y, script }); }
      }
      // HGSS's doors: matched ones known by index (kept maps and the scripts' MoveWarp say which); those to places
      // Heart & Soul hasn't got take a Heart & Soul door that leads nowhere here, near, or a new one.
      const idx = (hgssWarps[S] = hg.warps.map(() => null));
      for (const [i, j] of wpairs) idx[hw[i].i] = gw[j].j;
      hg.warps.forEach((w, i) => {
        if (idx[i] != null) return;
        // (To a map this game builds later, as Saffron City's door to its station, added by the Magnet Train's
        // script: a Heart & Soul door that leads nowhere here, near, if there is one; never a new door.)
        if (!w.map) {
          if (!w.mapConst || w.mapConst === "MAP_DYNAMIC") return;
          const [fx, fy] = fwd(w.x, w.y);
          let best = warps.findIndex((v) => v.loose && v.to && new RegExp(v.to).test(w.mapConst)), bd = 4.5;
          if (best < 0) warps.forEach((v, j) => { if (!v.loose || v.to) return; const d = Math.hypot(v.x - fx, v.y - fy); if (d < bd) { bd = d; best = j; } });
          if (best >= 0) { Object.assign(warps[best], { map: null, mapConst: w.mapConst, warp: w.warp, loose: false }); idx[i] = best; rep.warpsRedirected++; }
          return;
        }
        const dest = game(w.map);
        // (A way Heart & Soul has its own way to, or a map gone into one: but not where the table gives it a door, as
        // the port's onto the S.S. Aqua, a script's in Heart & Soul.)
        if (plan[w.map] !== null && plan[w.map] !== undefined && !warps.some((v) => v.loose && v.to && new RegExp(v.to).test(dest))) return;
        if (dest === G) return;
        if (w.map && into[w.map] === null) return;   // (to a map that's gone)
        const [fx, fy] = fwd(w.x, w.y);
        let best = warps.findIndex((v) => v.loose && v.to && new RegExp(v.to).test(w.map)), bd = 3.5;
        if (best < 0) warps.forEach((v, j) => { if (!v.loose || v.to) return; const d = Math.hypot(v.x - fx, v.y - fy); if (d < bd) { bd = d; best = j; } });
        // (To a map drawn from Heart & Soul's, HGSS's door number there is put right below, once all are known.)
        const target = { map: dest || null, mapConst: dest ? undefined : w.mapConst, warp: w.warp, hgssTo: plan[w.map] ? w.map : undefined };
        if (best >= 0) { Object.assign(warps[best], target, { loose: false, mapConst: target.mapConst }); idx[i] = best; rep.warpsRedirected++; return; }
        // (A new door: in a wall, a tile you can get to below it, near where the fit takes HGSS's; walked up into.)
        const rch = reachable(g);
        let spot = null, sd = Infinity;
        for (let y = 0; y + 1 < g.height; y++) for (let x = 0; x < g.width; x++) {
          const k = y * g.width + x;
          if (!g.collision[k] || used.has(k) || !walkable(g, x, y + 1) || !rch[k + g.width] || used.has(k + g.width)) continue;
          const d = Math.hypot(x - fx, y - fy);
          if (d < sd) { sd = d; spot = [x, y]; }
        }
        const [x, y] = spot && sd <= 30 ? spot : Coords.snap(fx, fy, g.width, g.height, (u, v) => !used.has(v * g.width + u), 3);
        used.add(y * g.width + x);
        warps.push(Object.assign({ x, y }, target));
        if (g.behavior[y * g.width + x] === 0) g.behavior[y * g.width + x] = g.collision[y * g.width + x] ? 0x69 : 0x60;
        idx[i] = warps.length - 1; rep.warpsAdded++;
      });
    }
    // (Where the table puts someone: plan[G].place.)
    for (const p of people) { const at = (plan[G].place || {})[p.localId]; if (at) [p.x, p.y] = at; }
    // (No one in the way here who wasn't in HGSS's: whoever parts the map's entrances, as Route 30's Youngster
    // Joey in its one gap would, moves to the nearest tile that doesn't.)
    {
      const gEdges = g.pieces.some((p) => (HN.maps[p.hns].connections || []).length), gm2 = { width: g.width, height: g.height, collision: g.collision, behavior: g.behavior, elevation: g.elevation, warps };
      // (Cut trees, rocks and boulders in the way too, Heart & Soul's own among them: not yet cut early on.)
      const W = g.width, kept = new Set(g.objects.filter((o, k) => OBSTACLE.has(kindOfHns(o)) && !takenObj.has(k)).map((o) => o.y * W + o.x));
      for (const p of people) if (p.inTheWay === undefined) kept.add(p.y * W + p.x);
      for (const p of people) {
        if (p.inTheWay === undefined) continue;
        if (p.inTheWay) { kept.add(p.y * W + p.x); continue; }
        if (!parts(gm2, kept, p.y * W + p.x, gEdges)) { kept.add(p.y * W + p.x); continue; }
        const was = [p.x, p.y], busy = new Set(people.map((q) => q.y * W + q.x));
        let best = null;
        for (let r = 1; r <= 12 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = was[0] + dx, y = was[1] + dy, k = y * W + x;
          if (!walkable(g, x, y) || busy.has(k) || used.has(k) || !reachable(g)[k] || parts(gm2, kept, k, gEdges)) continue;
          best = [x, y];
        }
        if (best) { [p.x, p.y] = best; rep.movedAside = (rep.movedAside || 0) + 1; }
        kept.add(p.y * W + p.x);
      }
    }
    // (And Heart & Soul's own Cut trees, breakable rocks and boulders that none of HGSS's took: as HGSS's are.)
    g.objects.forEach((o, k) => {
      const kind = kindOfHns(o), t = obstacleLook(kind);
      if (!OBSTACLE.has(kind) || takenObj.has(k) || !t) return;
      takenObj.add(k);
      people.push(Object.assign({}, t, { id: people.length, localId: "hns_" + kind + "_" + G + "_" + k, x: o.x, y: o.y, movement: "face_down", flag: null }));
      rep.obstaclesAdded = (rep.obstaclesAdded || 0) + 1;
    });
    // (Heart & Soul's doors to where this game has nothing, and that nothing took: gone (renumbered below).)
    for (const w of warps) if (w.loose) w.gone = true;
    // Connections: Heart & Soul's, between maps this game has, along this map's edges.
    const connections = [];
    plan[G].pieces.forEach((p) => {
      for (const c of HN.maps[p.hns].connections || []) {
        const tname = HN.byId[c.map];
        const G2 = paired.find((n) => plan[n].pieces.some((q) => q.hns === tname && q.rect[0] === 0 && q.rect[1] === 0));
        if (!G2 || G2 === G) continue;
        const q = plan[G2].pieces.find((q) => q.hns === tname);
        const vertical = c.direction === "up" || c.direction === "down";
        const edge = c.direction === "up" ? p.at[1] === 0 : c.direction === "down" ? p.at[1] + p.rect[3] === g.height : c.direction === "left" ? p.at[0] === 0 : p.at[0] + p.rect[2] === g.width;
        if (!edge) continue;
        const off = +c.offset + (vertical ? p.at[0] - q.at[0] : p.at[1] - q.at[1]);
        if (!connections.some((x) => x.map === G2 && x.direction === c.direction)) connections.push({ map: G2, direction: c.direction, offset: off });
      }
    });
    // The pictures.
    writePng(path.join(mapsDir, G + ".png"), g.width * 16, g.height * 16, g.below);
    writePng(path.join(mapsDir, G + "-top.png"), g.width * 16, g.height * 16, g.above);
    writePng(path.join(mapsDir, G + "-border.png"), 32, 32, g.border);
    const animFile = path.join(mapsDir, G + "-anim.png");
    if (g.anim) writeAnimSheet(animFile, g.pics); else if (fs.existsSync(animFile)) fs.unlinkSync(animFile);
    const o = out[G];
    const keep = o.type === "indoor" || o.type === "underground" ? [] : o.connections.filter((c) => !paired.includes(c.map));
    Object.assign(o, { width: g.width, height: g.height, collision: g.collision, elevation: g.elevation, behavior: g.behavior, encounter: g.encounter,
      top: true, borderWidth: 2, borderHeight: 2, anim: g.anim, patches: undefined, warps, people, signs, hidden, triggers, sceneMoves: plan[G].sceneMoves,
      connections: connections.concat(keep), headbutt: g.headbutt.length ? g.headbutt : undefined,
      // (A door a stamp brought, for a building this game adds: New Bark's Pokémon Center, its door's tile.)
      pokecenterDoor: plan[G].door || undefined,
      hgss: hgssSrc.map((s) => ({ map: s.map, width: s.width, height: s.height, fit: s.fit.map((v) => +v.toFixed(4)), anchors: s.anchors, doors: s.doors })),
      hgssWarps });
  }
  // (The doors that went: each map's others renumbered, and every door to them.)
  const renumber = {};
  for (const G of paired) {
    const o = out[G], map = [];
    let k = 0;
    o.warps.forEach((w, i) => { map[i] = w.gone ? null : k++; });
    renumber[G] = map;
    o.warps = o.warps.filter((w) => !w.gone);
    for (const w of o.warps) { delete w.loose; delete w.to; }
    for (const S of Object.keys(o.hgssWarps)) o.hgssWarps[S] = o.hgssWarps[S].map((j) => (j == null ? null : map[j]));
  }
  for (const G of paired) for (const w of out[G].warps) if (w.map && renumber[w.map] && w.warp != null) w.warp = renumber[w.map][w.warp];
  // (HGSS's door numbers on maps drawn from Heart & Soul's: theirs there.)
  for (const G of paired) for (const w of out[G].warps) if (w.hgssTo) {
    const list = (out[w.map] && out[w.map].hgssWarps && out[w.map].hgssWarps[w.hgssTo]) || [];
    w.warp = list[w.warp] != null ? list[w.warp] : out[w.map] ? Math.max(0, out[w.map].warps.findIndex((v) => v.map === G)) : 0;
    delete w.hgssTo;
  }
  // (Doors the table sends elsewhere (link: { index: map }): to that map's door back here.)
  for (const G of paired) for (const [i, to] of Object.entries(plan[G].link || {})) {
    const j = out[to] ? out[to].warps.findIndex((v) => v.map === G) : -1;
    if (j >= 0) Object.assign(out[G].warps[+i], { map: to, warp: j, mapConst: undefined });
  }
  // (A door whose far side doesn't lead back: to the nearest door there that does.)
  for (const G of paired) out[G].warps.forEach((w) => {
    if (!w.map || !out[w.map] || w.warp == null) return;
    const far = out[w.map].warps, b = far[w.warp];
    if (b && (b.map === G || b.mapConst === "MAP_DYNAMIC")) return;
    let best = -1, bd = Infinity;
    far.forEach((v, j) => { if (v.map !== G) return; const d = b ? Math.hypot(v.x - b.x, v.y - b.y) : 0; if (d < bd) { bd = d; best = j; } });
    if (best >= 0) w.warp = best;
  });
  // Kept maps' doors to maps that moved or went into another.
  const warpIdx = {};
  for (const G of paired) for (const [S, list] of Object.entries(out[G].hgssWarps)) warpIdx[S] = list;
  for (const n of names) {
    if (plan[n] !== null || !out[n]) continue;
    for (const w of out[n].warps) {
      if (!w.map || !(w.map in into) || plan[w.map] === null) continue;
      const G = into[w.map];
      if (!G) { log("  " + n + ": its door to " + w.map + " leads to a map that's gone"); w.map = null; w.mapConst = "MAP_GONE"; continue; }
      const list = warpIdx[w.map] || [];
      let j = list[w.warp];
      if (j == null) {
        // (The nearest door there to where the fit takes HGSS's.)
        const hgw = (out[w.map] && out[w.map].warps[w.warp]) || null, src = out[G].hgss.find((s) => s.map === w.map);
        if (hgw && src) { const [fx, fy] = Coords.forward(src, hgw.x, hgw.y); let bd = Infinity; out[G].warps.forEach((v, k) => { const d = Math.hypot(v.x - fx, v.y - fy); if (d < bd) { bd = d; j = k; } }); }
      }
      w.map = G; w.warp = j == null ? 0 : j;
    }
  }
  for (const G of paired) delete out[G].hgssWarps;
  for (const n of names) if (into[n] !== n) delete out[n];
  return { where, report, warpIdx, like };
};
