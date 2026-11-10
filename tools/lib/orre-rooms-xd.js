// Pokémon XD's Pokémon HQ Lab (its M5 area), as tools/build-orre-layouts.js's room module: the lab's grounds, drawn
// here (the lab, white and blue under its dish, to the north; the apartment where Lily and Jovi live to the east;
// the south edge out onto Orre's map), the lab's 1F (the lobby: reception, the Snag Machine's case, the PC and
// healing machine) and 2F (the Battle Sim room and the Director's office), each Mossdeep's Space Center (1F, 2F), and
// the apartment's two floors (Littleroot's house). XD's story there is game/xd.js's and ui/game.js's.
"use strict";

module.exports = function ({ changed, room, drawings, block, A }) {
  const { canvas, texture, C, door, palm, text } = A;
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
};
