// The Under's rooms Colosseum has that the base maps don't (tools/build-orre-layouts.js runs this): the Junk Shop
// (Perr's, 1F and B1: M4_junk_1F, M4_junk_B1), Nett's hideout (the house with the big rotating antenna dish, 1F and
// B1: M4_labo_1F, M4_labo_B1), and the Under Subway down to the Shadow Liner's station (M4_subway_B1, M4_subway_B2_1,
// M4_subway_B3), each an Emerald room; their doors drawn on The Under's east platform and north-west corner.
// Frena, Liaks, Lonia and Nelis, the Under Subway's Trainers in Colosseum, move down to the subway.
"use strict";

module.exports = function ({ maps, changed, clone, room, drawings, block, building, A }) {
  const U = changed.TheUnder;
  if (!U) throw new Error("orre-rooms-under: The Under's layout first");
  const { c, z } = drawings.TheUnder, music = U.music;
  const at = (n) => U.warps.length + n;
  const JUNK = at(0), NETT = at(1), SUBWAY = at(2);

  // The Under's three new doors (their warp indices after the base map's, so saved games keep theirs).
  const shop = { x: 23, y: 2, w: 4, h: 2 }, hide = { x: 3, y: 2, w: 5, h: 3 }, station = { x: 23, y: 6, w: 3, h: 2 };
  for (const b of [shop, hide, station]) building(U, c, b);
  A.door(c, 24 * 16 + 8, 4 * 16 - 1, 12, [126, 92, 60]); A.door(c, 5 * 16 + 8, 5 * 16 - 1, 12, [60, 96, 132]); A.door(c, 24 * 16 + 8, 8 * 16 - 1, 14, A.C.dark);
  A.text(c, "JUNK", 23 * 16 + 4, 2 * 16 - 8, A.C.cream); A.text(c, "SUBWAY", 23 * 16 - 4, 6 * 16 - 8, A.C.cream);
  // (Nett's antenna dish, up on his roof.)
  z.ellipse(5 * 16 + 8, 2 * 16 - 14, 14, 7, [196, 204, 210]); z.ellipse(5 * 16 + 8, 2 * 16 - 15, 10, 4, [140, 150, 160]); z.rect(5 * 16 + 7, 2 * 16 - 10, 3, 12, [96, 100, 108]);
  U.warps.push({ x: 24, y: 3, map: "TheUnder_JunkShop_1F", warp: 0 }, { x: 5, y: 4, map: "TheUnder_NettsHideout_1F", warp: 0 },
    { x: 24, y: 7, map: "TheUnder_Subway_B1", warp: 0 });

  // Rooms.
  changed.TheUnder_JunkShop_1F = room("SlateportCity_SternsShipyard_1F", "TheUnder_JunkShop_1F", "The Under", music,
    [{ x: 2, y: 14, map: "TheUnder", warp: JUNK }, { x: 3, y: 14, map: "TheUnder", warp: JUNK }, { x: 3, y: 1, map: "TheUnder_JunkShop_B1", warp: 0 }]);
  changed.TheUnder_JunkShop_B1 = room("SlateportCity_SternsShipyard_2F", "TheUnder_JunkShop_B1", "The Under", music,
    [{ x: 3, y: 1, map: "TheUnder_JunkShop_1F", warp: 2 }]);
  changed.TheUnder_NettsHideout_1F = room("Route114_FossilManiacsHouse", "TheUnder_NettsHideout_1F", "The Under", music,
    [{ x: 4, y: 7, map: "TheUnder", warp: NETT }, { x: 5, y: 7, map: "TheUnder", warp: NETT }, { x: 4, y: 1, map: "TheUnder_NettsHideout_B1", warp: 0 }]);
  changed.TheUnder_NettsHideout_B1 = room("MossdeepCity_GameCorner_B1F", "TheUnder_NettsHideout_B1", "The Under", music,
    [{ x: 3, y: 1, map: "TheUnder_NettsHideout_1F", warp: 2 }]);
  changed.TheUnder_Subway_B1 = room("Route114_FossilManiacsTunnel", "TheUnder_Subway_B1", "The Under Subway", music,
    [{ x: 6, y: 25, map: "TheUnder", warp: SUBWAY }, { x: 7, y: 25, map: "TheUnder", warp: SUBWAY }, { x: 6, y: 2, map: "TheUnder_Subway_B2", warp: 0 }]);
  changed.TheUnder_Subway_B2 = room("RusturfTunnel", "TheUnder_Subway_B2", "The Under Subway", music,
    [{ x: 4, y: 10, map: "TheUnder_Subway_B1", warp: 2 }, { x: 29, y: 16, map: "TheUnder_Subway_Station", warp: 0 }, { x: 18, y: 20, map: "TheUnder_Subway_B1", warp: 2 }]);
  changed.TheUnder_Subway_Station = room("MtChimney_CableCarStation", "TheUnder_Subway_Station", "The Under Subway", music,
    [{ x: 6, y: 11, map: "TheUnder_Subway_B2", warp: 1 }, { x: 7, y: 11, map: "TheUnder_Subway_B2", warp: 1 }]);
  for (const m of ["TheUnder_Subway_B1", "TheUnder_Subway_B2", "TheUnder_Subway_Station"]) changed[m].showName = true;

  // People: Colosseum's (their scenes and words in ui/game.js, their visibility in game/orre.js).
  const person = (m, id, key, x, y, sprite, facing, script, frames, text) => changed[m].people.push({ id, x, y, movement: facing, rangeX: 0, rangeY: 0,
    script, flag: null, text: text || null, localId: "LOCALID_ORRE_" + key, sprite, width: 16, height: 32, frames });
  person("TheUnder", Math.max(...U.people.map((p) => p.id)) + 1, "UNDER_BITT", 6, 5, "youngster", "face_left", "TheUnder_EventScript_Bitt", 10);
  person("TheUnder_JunkShop_1F", 0, "JUNK_OWNER", 5, 5, "em_expert_m", "face_down", "TheUnder_JunkShop_1F_EventScript_Owner", 9);
  person("TheUnder_JunkShop_B1", 0, "JUNK_PERR", 5, 9, "em_boy_1", "face_left", "TheUnder_JunkShop_B1_EventScript_Perr", 9);
  person("TheUnder_NettsHideout_B1", 0, "NETT", 6, 5, "em_boy_2", "face_down", "TheUnder_NettsHideout_B1_EventScript_Nett", 9);
  person("TheUnder_NettsHideout_B1", 1, "MEGG", 3, 4, "em_little_girl", "face_right", "TheUnder_NettsHideout_B1_EventScript_Megg", 9);
  person("TheUnder_NettsHideout_B1", 2, "HIDEOUT_BITT", 9, 4, "youngster", "face_left", "TheUnder_NettsHideout_B1_EventScript_Bitt", 10);
  person("TheUnder_Subway_B1", 0, "SUBWAY_FAN", 7, 6, "em_man_2", "face_down", "TheUnder_Subway_B1_EventScript_Fan", 9);
  person("TheUnder_Subway_B1", 1, "SUBWAY_EIN", 6, 21, "scientist", "face_down", "TheUnder_Subway_B1_EventScript_Ein", 10);
  person("TheUnder_Subway_B1", 2, "SUBWAY_VENUS", 7, 21, "beauty", "face_down", "TheUnder_Subway_B1_EventScript_Venus", 10);
  person("TheUnder_Subway_Station", 0, "STATION_VENUS", 6, 4, "beauty", "face_down", "TheUnder_Subway_Station_EventScript_Venus", 10);
  // (The Shadow Liner, at the top of the station.)
  changed.TheUnder_Subway_Station.signs.push({ x: 6, y: 3, script: "TheUnder_Subway_Station_EventScript_Train", text: null });
  // (The subway's four Trainers, from the town above.)
  const SUB = { SHADOW_LONIA: [6, 8, "face_left"], SHADOW_FRENA: [14, 4, "face_down"], SHADOW_LIAKS: [24, 5, "face_up"], SHADOW_NELIS: [30, 9, "face_left"] };
  let id = 0;
  for (const [key, [x, y, facing]] of Object.entries(SUB)) {
    const p = U.people.find((q) => q.localId === "LOCALID_ORRE_" + key);
    if (!p) continue;
    U.people = U.people.filter((q) => q !== p);
    changed.TheUnder_Subway_B2.people.push(Object.assign(clone(p), { id: id++, x, y, movement: facing }));
  }
};
