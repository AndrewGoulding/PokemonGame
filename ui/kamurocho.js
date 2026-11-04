// Kamurocho top down: the town (data/kamurocho-town.js, tools/build-kamurocho-town.py) and its rooms
// (data/kamurocho-rooms.js) put together on the overworld as the game loads. Its doors: each named place the
// building door nearest where it stands on Yakuza 0's map (Poppo, Serena's backlot and Bacchus in the Kamuro
// Shopping Area, Heroine off Theater Square, Toko Credit and Cafe Blend on Nakamichi Street, the Kazama office and
// the Hakua Building on Shichifuku Street, Tachibana Real Estate on Showa Street, Kiryu's flat in the Hotel
// District), its mat inside the way back out; the backlot's manhole down to the drain and its ladder back up. Its
// people: the side-on streets' (data/kamurocho-street.js), each on its street as far along it as they stood there,
// in their sheets from tools/build-kamurocho-overworld-people.py. Its spots: Poppo's counter, Heroine's stage, the
// Time Machine, Tachibana Real Estate's and Cafe Blend's doors.
//
// window.KMR (for ui/game.js):
//   KMR.tile(scene, x, y)   where a side-on scene's (x, y) is: { map, x, y } (a street's along its line; a room's across it)
//   KMR.area(x, y)          the street a tile of the town is on (its scene id), or null
//   KMR.at(map, x, y)       where on Yakuza 0's map a place is (its picture's points, for the Map screen), and its street
//   KMR.sceneOf(map, x, y)  the side-on scene id a place is (a room's, or the street the tile's on)
//   KMR.sprite(id)          a side-on sprite's top-down sheet
//   KMR.arrive              where the Time Machine leaves you (under the street, by the machine)
(function () {
  "use strict";
  const T = window.KAMUROCHO_TOWN, R = window.KAMUROCHO_ROOMS, K = window.KAMUROCHO_STREET, M = window.WORLD_MAPS;
  if (!T || !R || !K) return;
  const town = M.Kamurocho, W = T.width, H = T.height;
  const MB_DOOR = 0x69, MB_LADDER = 0x61;
  const idx = (x, y) => y * W + x;
  const kind = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? "." : T.kinds[idx(x, y)]);
  const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && town.collision[idx(x, y)] === 0;
  const toTile = ([X, Y]) => [(X - T.crop[0]) * T.scale, (Y - T.crop[1]) * T.scale];
  const toSrc = (x, y) => [x / T.scale + T.crop[0], y / T.scale + T.crop[1]];
  const Mp = K.map.scenes;

  // (a point that far along a line, and how far along a street's line its picture's x is: by its stops)
  function along(line, t) {
    const seg = line.slice(1).map((p, i) => Math.hypot(p[0] - line[i][0], p[1] - line[i][1])), total = seg.reduce((a, b) => a + b, 0);
    let d = t * total;
    for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const k = seg[i] ? d / seg[i] : 0; return [line[i][0] + (line[i + 1][0] - line[i][0]) * k, line[i][1] + (line[i + 1][1] - line[i][1]) * k]; } d -= seg[i]; }
    return line[0];
  }
  function fracOf(scene, x) {
    const S = K.scenes[scene], st = (Mp[scene] || {}).stops, t = Math.max(0, Math.min(1, x / (S.width || 1)));
    if (!st) return t;
    const xx = t * S.width;
    for (let i = 1; i < st.length; i++) if (xx <= st[i][0] || i === st.length - 1) return st[i - 1][1] + (st[i][1] - st[i - 1][1]) * Math.max(0, Math.min(1, (xx - st[i - 1][0]) / ((st[i][0] - st[i - 1][0]) || 1)));
    return t;
  }
  // (the nearest walkable tile to a point, not one of `taken`)
  function nearestFree(x, y, taken, ok) {
    x = Math.round(x); y = Math.round(y);
    for (let r = 0; r < 12; r++)
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const u = x + dx, v = y + dy;
        if (free(u, v) && !(taken && taken.has(u + "," + v)) && (!ok || ok(u, v))) return [u, v];
      }
    return [x, y];
  }

  // ---------- The doors ----------
  const PLACES = [
    // [room, where on Yakuza 0's map, how it opens: "door" (walk in), "spot" (a script at the door), "arrive" (only the
    // story takes you in: its mat out comes to the pavement here)]
    ["Poppo", [770, 640], "door"], ["Backlot", [735, 640], "door"], ["Bacchus", [720, 470], "door"],
    ["Heroine", [612, 520], "door"], ["Toko", [700, 780], "door"], ["Kazama", [650, 405], "door"],
    ["Namase", [905, 405], "door"], ["Penthouse", [930, 890], "spot", "Kamurocho_Tachibana"], ["Apartment", [560, 260], "arrive"],
    ["Dojima", [700, 690], "arrive"], ["Blend", [700, 700], "spot", "Kamurocho_Blend"]
  ];
  const used = new Set(), doorOf = {};
  for (const [room, at, how, script] of PLACES) {
    const [tx, ty] = toTile(at);
    let best = null, bd = 1e9;
    for (const d of T.doors) {
      if (used.has(d.x + "," + d.y) || !free(d.x, d.y + 1)) continue;
      const dd = Math.hypot(d.x - tx, d.y - ty);
      if (dd < bd) { bd = dd; best = d; }
    }
    used.add(best.x + "," + best.y);
    doorOf[room] = { x: best.x, y: best.y, how, script };
  }
  town.behavior = town.behavior.slice(); town.warps = []; town.signs = []; town.people = []; town.triggers = [];
  const room = (r) => M["Kmr_" + r];
  for (const [r, d] of Object.entries(doorOf)) {
    const rm = room(r), info = R[r];
    if (d.how === "door") {
      town.behavior[idx(d.x, d.y)] = MB_DOOR;
      town.warps.push({ x: d.x, y: d.y, map: rm.name, warp: 0 });
      rm.warps = [{ x: info.mat[0], y: info.mat[1], map: "Kamurocho", warp: town.warps.length - 1 }].concat(rm.warps.slice(1));
    } else if (d.how === "spot") {
      town.signs.push({ x: d.x, y: d.y, script: d.script, text: null });
      if (rm) {
        // (out of its mat onto the pavement before its door)
        town.warps.push({ x: d.x, y: d.y + 1, map: rm.name, warp: 0 });
        rm.warps = [{ x: info.mat[0], y: info.mat[1], map: "Kamurocho", warp: town.warps.length - 1 }];
      }
    } else {
      // (the story's only: out of its mat onto the pavement, nothing to go in by)
      const [ax, ay] = nearestFree(d.x, d.y + 1, null, (u, v) => free(u, v + 1));
      town.warps.push({ x: ax, y: ay, map: rm.name, warp: 0 });
      rm.warps = [{ x: info.mat[0], y: info.mat[1], map: "Kamurocho", warp: town.warps.length - 1 }];
    }
  }
  // (the backlot's manhole down to the drain, the drain's ladder back up)
  const back = room("Backlot"), sewer = room("Sewer");
  const [mhx, mhy] = R.Backlot.spots.manhole[0], [ldx, ldy] = R.Sewer.spots.ladder[0];
  back.behavior = back.behavior.slice(); sewer.behavior = sewer.behavior.slice();
  back.behavior[mhy * back.width + mhx] = MB_LADDER; sewer.behavior[ldy * sewer.width + ldx] = MB_LADDER;
  back.warps.push({ x: mhx, y: mhy, map: sewer.name, warp: 0 });
  sewer.warps = [{ x: ldx, y: ldy, map: back.name, warp: back.warps.length - 1 }];
  // (the rooms' spots: the shop's counter, the karaoke stage, the Time Machine)
  const signs = (r, spot, script) => { for (const [x, y] of R[r].spots[spot] || []) room(r).signs.push({ x, y, script, text: null }); };
  signs("Poppo", "clerk", "Kamurocho_Clerk"); signs("Heroine", "karaoke", "Kamurocho_Karaoke"); signs("Sewer", "machine", "Kamurocho_TimeMachine");

  // ---------- Its people ----------
  const SPRITE = { host_idle: "host", clubgoer: "clubgoer", thug_idle: "thug", loiterer: "loiterer", salaryman_idle: "salaryman", drunk_idle: "drunk",
    tourist: "tourist", reveller: "reveller", grunt_idle: "grunt", kiryu_idle: "kiryu", majima_idle: "majima", nishiki: "nishiki" };
  const sprite = (id) => "kmr_" + (SPRITE[id] || id.replace(/_idle$/, ""));
  // (the side-on rooms' people, in the top-down rooms)
  const ROOM_OF = { heroine: "Heroine", bacchus: "Bacchus", poppo: "Poppo", backlot: "Backlot", sewer: "Sewer", toko: "Toko", kazama: "Kazama",
    dojima: "Dojima", penthouse: "Penthouse", apartment: "Apartment", namase: "Namase" };
  const roomTile = (r, scene, x, y) => {
    const rm = room(r), S = K.scenes[scene] || { width: 760 };
    const tx = Math.max(1, Math.min(rm.width - 2, Math.round(x / S.width * rm.width)));
    const ty = Math.max(2, Math.min(rm.height - 2, Math.round(2 + (y - 414) / 56 * (rm.height - 4))));
    return [tx, ty];
  };
  // (the Empty Lot: its fenced ground in the town)
  const lot = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (kind(x, y) === "L") lot.push([x, y]);
  const lotBox = lot.length ? [Math.min(...lot.map((p) => p[0])), Math.min(...lot.map((p) => p[1])), Math.max(...lot.map((p) => p[0])), Math.max(...lot.map((p) => p[1]))] : null;
  function tile(scene, x, y, taken) {
    if (ROOM_OF[scene]) { const r = ROOM_OF[scene], [tx, ty] = roomTile(r, scene, x, y); return { map: room(r).name, x: tx, y: ty }; }
    if (scene === "alley" && lotBox) {
      const S = K.scenes.alley, u = lotBox[0] + 1 + Math.round(x / S.width * (lotBox[2] - lotBox[0] - 2)), v = lotBox[1] + 2 + Math.round((y - 412) / 58 * (lotBox[3] - lotBox[1] - 3));
      const [a, b] = nearestFree(u, v, taken); return { map: "Kamurocho", x: a, y: b };
    }
    const m = Mp[scene];
    if (!m || !m.line) return { map: "Kamurocho", x: Math.floor(W / 2), y: Math.floor(H / 2) };
    const [px, py] = toTile(along(m.line, fracOf(scene, x)));
    const [a, b] = nearestFree(px, py, taken);
    return { map: "Kamurocho", x: a, y: b };
  }
  let id = 0;
  const taken = new Set([...town.warps.map((w) => w.x + "," + w.y), ...Object.values(doorOf).map((d) => d.x + "," + (d.y + 1))]);
  for (const [scene, S] of Object.entries(K.scenes)) {
    for (const p of S.people || []) {
      const t = tile(scene, p.x, p.y, taken);
      const map = M[t.map];
      taken.add(t.x + "," + t.y);
      map.people.push({ id: ++id, x: t.x, y: t.y, movement: p.walk ? "wander_around" : "face_" + (p.face === "left" ? "left" : p.face === "right" ? "right" : "down"),
        rangeX: p.walk ? 2 : 0, rangeY: p.walk ? 1 : 0, script: p.script, flag: null, text: p.text || null, localId: p.script,
        sprite: sprite(p.sprite), width: 16, height: 32, frames: 9 });
    }
  }
  // (Poppo's clerk, behind the counter)
  if (R.Poppo.clerk) room("Poppo").people.push({ id: ++id, x: R.Poppo.clerk[0], y: R.Poppo.clerk[1], movement: "face_down", rangeX: 0, rangeY: 0, script: "Kamurocho_Clerk",
    flag: null, text: null, localId: "Kamurocho_Clerk", sprite: "kmr_clubgoer", width: 16, height: 32, frames: 9 });

  // ---------- Which street a tile's on ----------
  const lines = Object.entries(Mp).filter(([, m]) => m.line).map(([k, m]) => [k, m.line]);
  function distSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  function area(x, y) {
    if (kind(x, y) === "L") return "alley";
    if (kind(x, y) === "p") return "theater";
    const p = toSrc(x, y);
    let best = null, bd = 30;
    for (const [k, line] of lines) for (let i = 1; i < line.length; i++) { const d = distSeg(p, line[i - 1], line[i]); if (d < bd) { bd = d; best = k; } }
    return best;
  }
  const SCENE_OF_ROOM = Object.fromEntries(Object.entries(ROOM_OF).map(([s, r]) => ["Kmr_" + r, s]));
  function sceneOf(map, x, y) { return map === "Kamurocho" ? area(x, y) : SCENE_OF_ROOM[map] || null; }
  // (Where on Yakuza 0's map a place is: a tile of the town as it is; a room, its door's.)
  function at(map, x, y) {
    if (map === "Kamurocho") return { point: toSrc(x + 0.5, y + 0.5), street: area(x, y) };
    const r = (map || "").replace(/^Kmr_/, ""), d = doorOf[r] || doorOf[{ Sewer: "Backlot" }[r]];
    return d ? { point: toSrc(d.x + 0.5, d.y + 0.5), street: area(d.x, d.y + 1), room: SCENE_OF_ROOM[map] } : null;
  }
  const mc = R.Sewer.spots.machine;
  window.KMR = { tile, area, at, sceneOf, sprite, doors: doorOf, arrive: { map: "Kmr_Sewer", x: mc[1][0], y: mc[0][1] + 1, facing: "up" } };
  window.KAMUROCHO.arrive = window.KMR.arrive;
})();
