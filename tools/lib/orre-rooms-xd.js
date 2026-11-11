// Pokémon XD's Pokémon HQ Lab (its M5 area), as tools/build-orre-layouts.js's room module: the lab's grounds, drawn
// here (the lab, white and blue under its dish, to the north; the apartment where Lily and Jovi live to the east;
// the south edge out onto Orre's map), the lab's 1F (the lobby: reception, the Snag Machine's case, the PC and
// healing machine) and 2F (the Battle Sim room and the Director's office), each Mossdeep's Space Center (1F, 2F), and
// the apartment's two floors (Littleroot's house). XD's story there is game/xd.js's and ui/game.js's.
"use strict";

module.exports = function ({ changed, room, drawings, block, A, emerald }) {
  const { canvas, texture, C, door, palm, text, water } = A;
  const OUT = "PokemonHQLab", LAB1 = "PokemonHQLab_1F", LAB2 = "PokemonHQLab_2F", APT1 = "PokemonHQLab_Apartment_1F", APT2 = "PokemonHQLab_Apartment_2F";
  const W = 28, H = 22;

  // ---- The grounds (drawn). ----
  const m = { name: OUT, title: "Pokémon HQ Lab", region: "orre", type: "town", music: "mus_oak", width: W, height: H, top: true,
    borderWidth: 2, borderHeight: 2, battleScene: "sand", showName: true, colosseumLayout: true, orrePlace: OUT,
    collision: [], elevation: [], behavior: [], encounter: [], connections: [], hidden: [], signs: [], people: [], triggers: [], warps: [] };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // (A rocky rim but for the road south; the lab's and apartment's walls are blocked below.)
    const rim = x === 0 || x === W - 1 || y === 0 || (y === H - 1 && (x < 11 || x > 16));
    m.collision.push(rim ? 1 : 0); m.behavior.push(0); m.elevation.push(3); m.encounter.push(0);
  }
  const c = canvas(W * 16, H * 16), z = canvas(c.w, c.h);
  texture(c, [0, 0, c.w, c.h], C.sand, 11, 4);
  // The plaza before the lab: pale paving, a blue-edged path down to the road.
  const plaza = [[48, 152, 288, 112], [176, 264, 96, 88]];
  for (const [x, y, w, h] of plaza) {
    c.rect(x, y, w, h, C.stone[1]);
    for (let j = y; j < y + h; j += 16) c.rect(x, j, w, 1, C.stone[2]);
    for (let i = x; i < x + w; i += 16) c.rect(i, y, 1, h, C.stone[2]);
  }
  c.rect(176, 264, 2, 88, C.blue[0]); c.rect(270, 264, 2, 88, C.blue[0]);
  // The lab: a broad white block, blue bands, a dish on its roof, glass doors in the middle.
  block(m, 4, 2, 17, 7);
  c.rect(64 + 4, 40 + 4, 272, 112, [0, 0, 0, 60]);
  c.box(64, 40, 272, 108, C.stone[0], C.metal[1]);
  c.rect(66, 42, 268, 18, C.blue[1]); c.rect(66, 60, 268, 3, C.blue[0]);
  for (let col = 0; col < 8; col++) if (col !== 3 && col !== 4) for (let row = 0; row < 2; row++) c.box(80 + col * 32, 74 + row * 30, 22, 18, C.blue[2], C.metal[1]);
  z.ellipse(112, 34, 26, 12, C.metal[3]); z.ellipse(112, 34, 20, 8, C.metal[2]); z.line(112, 34, 124, 18, C.metal[1], 2);
  text(c, "POKEMON HQ LAB", 168, 49, C.cream);
  door(c, 13 * 16 + 8, 9 * 16 - 1, 28, C.blue[2]);
  m.warps.push({ x: 13, y: 8, map: LAB1, warp: 0 });
  // The apartment: a smaller block, warm-roofed, its door facing the plaza.
  block(m, 21, 9, 6, 5);
  c.rect(21 * 16 + 4, 9 * 16 - 8 + 4, 96, 88, [0, 0, 0, 60]);
  c.box(21 * 16, 9 * 16 + 8, 96, 72, C.stone[1], C.rust[0]);
  c.poly([[21 * 16 - 4, 9 * 16 + 10], [21 * 16 + 48, 9 * 16 - 10], [27 * 16 + 4, 9 * 16 + 10]], C.rust[2]);
  for (const wx of [21 * 16 + 10, 21 * 16 + 70]) c.box(wx, 9 * 16 + 30, 16, 14, C.blue[2], C.rust[0]);
  door(c, 23 * 16 + 8, 14 * 16 - 1, 14, C.rust[1]);
  m.warps.push({ x: 23, y: 13, map: APT1, warp: 0 });
  // Palms about the plaza, and a sign by the road.
  for (const [x, y] of [[3, 11], [3, 16], [24, 17], [8, 18], [19, 18]]) { palm(z, x * 16 + 8, y * 16 + 12); block(m, x, y, 1, 1); }
  m.signs.push({ x: 15, y: 17, script: "PokemonHQLab_EventScript_Sign", text: ["POKéMON HQ LAB", "Research on Pokémon of every kind,\nfrom their ecosystems to battling."] });
  c.box(15 * 16 + 2, 17 * 16 + 2, 12, 10, C.wood[2], C.wood[0]); block(m, 15, 17, 1, 1);
  // The road south: out onto Orre's map.
  for (let x = 11; x <= 16; x++) m.triggers.push({ x, y: H - 1, script: "Orre_WorldMap" });
  changed[OUT] = m; drawings[OUT] = { c, z };

  // ---- The lab: 1F (the lobby) and 2F, and the apartment's two floors. ----
  changed[LAB1] = room("MossdeepCity_SpaceCenter_1F", LAB1, "Pokémon HQ Lab", "mus_oak_lab",
    [{ x: 7, y: 9, map: OUT, warp: 0 }, { x: 8, y: 9, map: OUT, warp: 0 }, { x: 13, y: 1, map: LAB2, warp: 0 }]);
  changed[LAB2] = room("MossdeepCity_SpaceCenter_2F", LAB2, "Pokémon HQ Lab", "mus_oak_lab",
    [{ x: 13, y: 1, map: LAB1, warp: 2 }]);
  changed[APT1] = room("LittlerootTown_MaysHouse_1F", APT1, "Pokémon HQ Lab", "mus_oak",
    [{ x: 1, y: 8, map: OUT, warp: 1 }, { x: 2, y: 8, map: OUT, warp: 1 }, { x: 2, y: 2, map: APT2, warp: 0 }]);
  changed[APT2] = room("LittlerootTown_MaysHouse_2F", APT2, "Pokémon HQ Lab", "mus_oak",
    [{ x: 1, y: 1, map: APT1, warp: 2 }]);
  for (const n of [LAB1, LAB2, APT1, APT2]) changed[n].orrePlace = OUT;
  // (The Purify Chamber: the big machine in the lobby's south-east corner, its plate before it.)
  changed[LAB1].signs = [{ x: 11, y: 7, script: "PokemonHQLab_1F_EventScript_PurifyChamber", text: null }];

  // A drawn outdoor map: its ground everywhere walkable but `solid(x, y)`, sand painted, Orre's way out along `exit`.
  function outdoors(name, title, music, w, h, solid, exit) {
    const o = { name, title, region: "orre", type: "town", music, width: w, height: h, top: true, borderWidth: 2, borderHeight: 2,
      battleScene: "sand", showName: true, colosseumLayout: true, orrePlace: name, collision: [], elevation: [], behavior: [], encounter: [],
      connections: [], hidden: [], signs: [], people: [], triggers: [], warps: [] };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { o.collision.push(solid(x, y) ? 1 : 0); o.behavior.push(0); o.elevation.push(3); o.encounter.push(0); }
    const oc = canvas(w * 16, h * 16), oz = canvas(oc.w, oc.h);
    texture(oc, [0, 0, oc.w, oc.h], C.sand, name.length, 4);
    for (const [x, y] of exit) o.triggers.push({ x, y, script: "Orre_WorldMap" });
    changed[name] = o; drawings[name] = { c: oc, z: oz };
    return { o, oc, oz };
  }
  // A plain building: a box with a roof band, windows, and a door on its south wall (a warp into `to`).
  function house(o, oc, x, y, w, h, roof, label, doorX, to) {
    block(o, x, y, w, h);
    oc.rect(x * 16 + 4, y * 16 + 4, w * 16, h * 16, [0, 0, 0, 60]);
    oc.box(x * 16, y * 16, w * 16, h * 16, C.stone[1], C.metal[1]);
    oc.rect(x * 16 + 2, y * 16 + 2, w * 16 - 4, 14, roof);
    for (let i = 0; i < w - 1; i += 2) if (x + i + 1 !== doorX) oc.box(x * 16 + 8 + i * 16, y * 16 + 24, 14, 12, C.blue[2], C.metal[1]);
    if (label) text(oc, label, x * 16 + 6, y * 16 + 6, C.cream);
    door(oc, doorX * 16 + 8, (y + h) * 16 - 1, 14, C.blue[0]);
    if (to) o.warps.push({ x: doorX, y: y + h - 1, map: to, warp: 0 });
    return o.warps.length - 1;
  }
  const pcRoom = (name, title, music, outName, back) => {
    const r = room("MauvilleCity_PokemonCenter_1F", name, title, music, [{ x: 7, y: 8, map: outName, warp: back }, { x: 6, y: 8, map: outName, warp: back }]);
    r.pokemonCenter = true;
    r.people = [{ id: 0, x: 7, y: 2, movement: "face_down", rangeX: 0, rangeY: 0, script: name.replace(/_1F$/, "") + "_1F_EventScript_Nurse", flag: null, text: null,
      localId: "LOCALID_XD_NURSE", sprite: "em_nurse", width: 16, height: 32, frames: 4 }];
    return r;
  };

  // ---- Gateon Port (XD's M6): a port town on Orre's south coast. Its Pokémon Center, Mart, the Parts Shop and Emili's
  // house next door along the north street; the Krabby Club and the lighthouse to the south; the docks, the pier
  // and its rotating bridge, and Mr. Verich's cruiser out on the water. Orre's map the way you came, north. ----
  {
    const GP = "GateonPort", GW = 36, GH = 26;
    const sea = (x, y) => y >= 20 || (x >= 31 && y >= 9);
    const { o, oc, oz } = outdoors(GP, "Gateon Port", "em_slateport", GW, GH,
      (x, y) => x === 0 || x === GW - 1 || (y === 0 && (x < 15 || x > 20)) || (sea(x, y) && !(x >= 16 && x <= 19 && y >= 20 && y <= 23)), [15, 16, 17, 18, 19, 20].map((x) => [x, 0]));
    // The sea, a stone quay along it, the pier out to its rotating bridge.
    water(oc, 0, 20 * 16, oc.w, oc.h - 20 * 16); water(oc, 31 * 16, 9 * 16, oc.w - 31 * 16, 11 * 16);
    oc.rect(0, 18 * 16, 31 * 16, 2 * 16, C.stone[1]); oc.rect(0, 20 * 16 - 3, 31 * 16, 3, C.stone[3]);
    oc.rect(16 * 16, 20 * 16, 64, 64, C.wood[1]); for (let y = 20 * 16; y < 24 * 16; y += 6) oc.rect(16 * 16, y, 64, 1, C.wood[0]);
    oc.ellipse(18 * 16, 22 * 16, 22, 10, C.metal[2]); oc.ellipse(18 * 16, 22 * 16, 6, 3, C.gold);
    block(o, 16, 23, 4, 1);
    // Mr. Verich's cruiser, moored east.
    oc.poly([[31 * 16 + 4, 11 * 16], [35 * 16, 11 * 16], [35 * 16, 16 * 16], [31 * 16 + 4, 16 * 16], [31 * 16 - 10, 13 * 16 + 8]], C.stone[0]);
    oc.rect(32 * 16, 12 * 16, 40, 18, C.blue[1]); oc.rect(32 * 16, 14 * 16 + 4, 56, 4, C.gold);
    // The north street.
    const pc = house(o, oc, 2, 3, 6, 4, [193, 63, 43], "P C", 5, GP + "_PokemonCenter_1F");
    const mart = house(o, oc, 9, 3, 5, 4, C.blue[1], "MART", 11, GP + "_Mart");
    const parts = house(o, oc, 18, 2, 7, 5, C.rust[2], "PARTS SHOP", 21, GP + "_PartsShop");
    const emili = house(o, oc, 26, 3, 4, 4, C.grass[2], null, 27, GP + "_EmilisHouse");
    // The Krabby Club (closed for now) and the lighthouse.
    block(o, 3, 11, 9, 5); oc.box(48, 176, 144, 80, [173, 66, 72], C.rust[0]); text(oc, "KRABBY CLUB", 72, 186, C.cream); door(oc, 7 * 16 + 8, 16 * 16 - 1, 16, C.dark);
    o.signs.push({ x: 7, y: 16, script: "GateonPort_EventScript_KrabbyClub", text: null });
    block(o, 26, 10, 3, 6); oz.rect(26 * 16 + 6, 6 * 16, 36, 10 * 16, C.stone[0]); oz.rect(26 * 16 + 6, 6 * 16, 36, 10, [193, 63, 43]); oz.ellipse(27 * 16 + 8, 6 * 16, 14, 6, C.gold);
    o.signs.push({ x: 18, y: 17, script: "GateonPort_EventScript_Sign", text: ["GATEON PORT", "A lively seaport with active trade."] });
    for (const [x, y] of [[1, 8], [14, 9], [22, 9], [13, 16], [1, 16]]) { palm(oz, x * 16 + 8, y * 16 + 12); block(o, x, y, 1, 1); }
    const PORT_WARPS = { pc, mart, parts, emili };
    changed[GP + "_PokemonCenter_1F"] = pcRoom(GP + "_PokemonCenter_1F", "Gateon Port", "mus_poke_center", GP, PORT_WARPS.pc);
    changed[GP + "_Mart"] = room("PetalburgCity_Mart", GP + "_Mart", "Gateon Port", "em_poke_mart",
      [{ x: 3, y: 7, map: GP, warp: PORT_WARPS.mart }, { x: 4, y: 7, map: GP, warp: PORT_WARPS.mart }]);
    changed[GP + "_PartsShop"] = room("SlateportCity_SternsShipyard_1F", GP + "_PartsShop", "Gateon Port", "em_slateport",
      [{ x: 2, y: 14, map: GP, warp: PORT_WARPS.parts }, { x: 3, y: 14, map: GP, warp: PORT_WARPS.parts }]);
    changed[GP + "_EmilisHouse"] = room("SlateportCity_House", GP + "_EmilisHouse", "Gateon Port", "em_slateport",
      [{ x: 3, y: 7, map: GP, warp: PORT_WARPS.emili }, { x: 4, y: 7, map: GP, warp: PORT_WARPS.emili }]);
    for (const n of ["_PokemonCenter_1F", "_Mart", "_PartsShop", "_EmilisHouse"]) changed[GP + n].orrePlace = GP;
  }

  // ---- Kaminko's House (XD's S3): Dr. Kaminko's peculiar manor out in the desert, its gate kept by his assistant
  // Chobin; inside, his inventions on show. ----
  {
    const KH = "KaminkosHouse", KW = 28, KH_H = 22;
    const { o, oc, oz } = outdoors(KH, "Kaminko's House", "mus_oak", KW, KH_H,
      (x, y) => x === 0 || x === KW - 1 || y === 0 || (y === KH_H - 1 && (x < 11 || x > 16)), [11, 12, 13, 14, 15, 16].map((x) => [x, KH_H - 1]));
    // A walled yard; the manor, odd and top-heavy, with a big dish and a crooked tower.
    oc.rect(64, 176, 320, 3, C.metal[1]); oc.rect(64, 176, 3, 140, C.metal[1]); oc.rect(381, 176, 3, 140, C.metal[1]);
    for (let x = 0; x < KW; x++) if (x < 11 || x > 16) block(o, x, 17, 1, 1);
    block(o, 4, 11, 1, 7); block(o, 23, 11, 1, 7);
    oc.rect(64, 17 * 16, 176 - 64, 6, C.metal[2]); oc.rect(17 * 16, 17 * 16, 384 - 17 * 16, 6, C.metal[2]);
    const manor = house(o, oc, 5, 3, 18, 8, [112, 62, 140], "KAMINKO", 14, KH + "_1F");
    oz.ellipse(8 * 16, 3 * 16, 34, 16, C.metal[3]); oz.ellipse(8 * 16, 3 * 16, 26, 11, C.metal[2]);
    oz.rect(19 * 16, 0, 24, 3 * 16, C.metal[1]); oz.poly([[19 * 16 - 6, 6], [20 * 16 + 14, 0], [20 * 16 + 18, 12]], C.rust[1]);
    changed[KH + "_1F"] = Object.assign(room("SlateportCity_OceanicMuseum_1F", KH + "_1F", "Kaminko's House", "em_lilycove_museum",
      [{ x: 9, y: 8, map: KH, warp: manor }, { x: 10, y: 8, map: KH, warp: manor }]), { orrePlace: KH });
  }

  // ---- The Cipher Lab (XD's D1): Cipher's old lab out in the desert south of Mt. Battle, back in use; the Hexagon
  // Brothers lounging out front. Inside: 1F (the Weather Institute's 1F), B1 (Devon's 2F: the ID Card's chest, and
  // the stairs down that need the ID Card) and B2 (the Weather Institute's 2F: where Prof. Krane's kept). ----
  {
    const CL = "CipherLab", CW = 30, CH = 24;
    const { o, oc, oz } = outdoors(CL, "Cipher Lab", "em_aqua_magma_hideout", CW, CH,
      (x, y) => x === 0 || x === CW - 1 || y === 0 || (y === CH - 1 && (x < 12 || x > 17)), [12, 13, 14, 15, 16, 17].map((x) => [x, CH - 1]));
    // Cracked concrete before it; the lab low and grey, its sign half gone, a vent stack.
    oc.rect(7 * 16, 11 * 16, 16 * 16, 6 * 16, C.metal[2]);
    for (let i = 0; i < 40; i++) { const x = 7 * 16 + ((i * 53) % (16 * 16)), y = 11 * 16 + ((i * 37) % (6 * 16)); oc.line(x, y, x + 9, y + 4, C.metal[1], 1); }
    block(o, 8, 3, 14, 8);
    oc.rect(8 * 16 + 4, 3 * 16 + 4, 14 * 16, 8 * 16, [0, 0, 0, 60]);
    oc.box(8 * 16, 3 * 16, 14 * 16, 8 * 16, C.metal[2], C.metal[0]);
    oc.rect(8 * 16 + 2, 3 * 16 + 2, 14 * 16 - 4, 12, C.metal[1]);
    text(oc, "LAB", 8 * 16 + 8, 3 * 16 + 4, C.cream);
    for (let i = 0; i < 6; i++) if (i !== 3) oc.box(8 * 16 + 14 + i * 34, 3 * 16 + 30, 20, 14, [53, 67, 62], C.metal[0]);
    door(oc, 15 * 16 + 8, 11 * 16 - 1, 24, C.dark);
    o.warps.push({ x: 15, y: 10, map: CL + "_1F", warp: 0 });
    oz.rect(19 * 16, 1 * 16, 20, 3 * 16, C.metal[1]); oz.rect(19 * 16 - 2, 1 * 16, 24, 5, C.metal[0]);
    for (const [x, y] of [[3, 6], [25, 15], [4, 18]]) { oz.ellipse(x * 16 + 8, y * 16 + 10, 14, 7, C.rock[1]); block(o, x, y, 1, 1); }
    changed[CL + "_1F"] = room("Route119_WeatherInstitute_1F", CL + "_1F", "Cipher Lab", "em_aqua_magma_hideout",
      [{ x: 9, y: 12, map: CL, warp: 0 }, { x: 10, y: 12, map: CL, warp: 0 }, { x: 17, y: 1, map: CL + "_B1", warp: 0 }]);
    changed[CL + "_B1"] = room("RustboroCity_DevonCorp_2F", CL + "_B1", "Cipher Lab", "em_aqua_magma_hideout",
      [{ x: 14, y: 1, map: CL + "_1F", warp: 2 }, { x: 2, y: 1, map: CL + "_B2", warp: 0 }]);
    changed[CL + "_B2"] = room("Route119_WeatherInstitute_2F", CL + "_B2", "Cipher Lab", "em_aqua_magma_hideout",
      [{ x: 17, y: 1, map: CL + "_B1", warp: 1 }]);
    for (const n of ["_1F", "_B1", "_B2"]) changed[CL + n].orrePlace = CL;
  }
};
