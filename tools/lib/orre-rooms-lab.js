// Colosseum's Shadow Pokémon Lab (Cipher's lab out in the desert), as tools/build-orre-layouts.js's room module:
// its west wing (the garage: 1F, where Rui checks the cargo, and B1F, where Researcher Myron has the Card Key) and its
// main wing (1F behind the Card Key's door, with the shutter switch; B1F, its east half from the 1F stairs, with the
// DNA analyzer and the elevator down, and its west half only from B2F's stairs, with Coren's room and the Down St.
// Key and, behind the Down St. Key's door, the cells; B2F, and its door that opens only once three DNA Samples have
// been analyzed, to Skrub and, down its stairs, Ein's room). Each an Emerald room, as Orre's other insides are, with
// Colosseum's trainers where altissimo1's guide puts them; the keys' doors are game/orre-lab.js's and ui/game.js's
// (labDoor). ShadowLab_1F stays the way in (its way out to Orre's map as before).
"use strict";

module.exports = function ({ maps, changed, clone, room }) {
  const L = (n) => "ShadowLab_" + n;
  const lab = (from, name, warps) => Object.assign(room(from, L(name), "Shadow Pokémon Lab", "em_aqua_magma_hideout", warps), { colosseumLayout: true });
  // (People moved from the old rooms: Cipher's Peons with Shadow Pokémon, by localId.)
  const old = [].concat((maps[L("1F")] || {}).people || [], (maps[L("B1F")] || {}).people || []);
  const take = (suffix, x, y, facing) => {
    const p = old.find((q) => q.localId === "LOCALID_ORRE_" + suffix);
    if (!p) throw new Error("No lab person " + suffix);
    return Object.assign(clone(p), { x, y, movement: facing });
  };
  const ball = (id, suffix, x, y, item, flag) => ({ id, x, y, movement: "face_down", rangeX: 0, rangeY: 0, script: "ShadowLab_EventScript_Item_" + suffix,
    flag, text: null, localId: "LOCALID_ORRE_LAB_ITEM_" + suffix, sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true, item });
  const nextId = (m) => Math.max(-1, ...m.people.map((p) => p.id)) + 1;

  // The garage, 1F: as it was (its way out to Orre's map), its stairs down to the garage's B1F; the PP Up in its
  // north-west corner.
  const g1 = clone(maps[L("1F")]);
  g1.warps = [{ x: 13, y: 1, map: L("GarageB1F"), warp: 2 }];
  g1.people = [ball(0, "PPUP", 1, 2, "pp-up", "orreLabPPUp")];
  g1.colosseumLayout = true;
  changed[g1.name] = g1;
  // The garage, B1F (Weather Institute 1F): up to 1F; its doors through to the main wing (the Card Key's door).
  changed[L("GarageB1F")] = lab("Route119_WeatherInstitute_1F", "GarageB1F",
    [{ x: 9, y: 12, map: L("Main1F"), warp: 0 }, { x: 10, y: 12, map: L("Main1F"), warp: 0 }, { x: 17, y: 1, map: L("1F"), warp: 0 }]);
  // The main wing, 1F (Devon's lobby): the Card Key's door (from the garage) and its stairs down; the shutter switch.
  const m1 = lab("RustboroCity_DevonCorp_1F", "Main1F",
    [{ x: 5, y: 8, map: L("GarageB1F"), warp: 0 }, { x: 6, y: 8, map: L("GarageB1F"), warp: 0 }, { x: 14, y: 1, map: L("B1F"), warp: 9 }]);
  m1.signs = [{ x: 4, y: 1, script: "ShadowLab_EventScript_Shutter", text: null }];
  changed[m1.name] = m1;
  // B1F (the Abandoned Ship's corridor): its east half from 1F's stairs (rooms, the DNA analyzer, the elevator down to
  // B2F); its west half from B2F's stairs (Coren's room, and the Down St. Key's door to the cells).
  const b1 = lab("AbandonedShip_Corridors_1F", "B1F", [
    { x: 9, y: 11, map: L("B2F"), warp: 6 }, { x: 8, y: 11, map: L("B2F"), warp: 6 },          // the elevator down
    { x: 0, y: 11, map: L("Cells"), warp: 0 }, { x: 1, y: 11, map: L("Cells"), warp: 0 },      // the Down St. Key's door
    { x: 11, y: 9, map: L("B1F_Rooms"), warp: 0 }, { x: 14, y: 9, map: L("B1F_Rooms"), warp: 3 },
    { x: 11, y: 3, map: L("B1F_Rooms"), warp: 2 }, { x: 14, y: 3, map: L("B1F_Rooms"), warp: 4 },
    { x: 3, y: 9, map: L("CorenRoom"), warp: 0 },
    { x: 16, y: 2, map: L("Main1F"), warp: 2 },                                               // up to 1F
    { x: 5, y: 2, map: L("B2F"), warp: 7 },                                                   // to B2F's stairs
    { x: 3, y: 3, map: L("CorenRoom"), warp: 2 }]);
  b1.signs = [{ x: 10, y: 1, script: "ShadowLab_EventScript_Analyzer", text: null }];
  b1.people = [take("SHADOW_VANA", 12, 11, "face_left")];
  changed[b1.name] = b1;
  // B1F's rooms (the Abandoned Ship's cabins): the south-west room (Cole), the middle room (Lethco), the west room
  // (Kotan and Remil, as Colosseum has them, off the west elevator), and a store room.
  const r1 = lab("AbandonedShip_Rooms_1F", "B1F_Rooms", [
    { x: 4, y: 16, map: L("B1F"), warp: 4 }, { x: 5, y: 16, map: L("B1F"), warp: 4 }, { x: 4, y: 1, map: L("B1F"), warp: 6 },
    { x: 13, y: 16, map: L("B1F"), warp: 5 }, { x: 13, y: 1, map: L("B1F"), warp: 7 }, { x: 14, y: 16, map: L("B1F"), warp: 5 }]);
  r1.people = [take("SHADOW_COLE", 6, 12, "face_down"), take("SHADOW_REMIL", 14, 13, "face_left")];
  changed[r1.name] = r1;
  // Coren's room (west half of B1F; the Abandoned Ship's long room): the Down St. Key on the table.
  const coren = lab("AbandonedShip_Rooms2_1F", "CorenRoom",
    [{ x: 4, y: 16, map: L("B1F"), warp: 8 }, { x: 5, y: 16, map: L("B1F"), warp: 8 }, { x: 4, y: 1, map: L("B1F"), warp: 11 }]);
  coren.people = [ball(0, "DOWNSTKEY", 6, 3, "down-st-key", "orreLabDownStKey")];
  changed[coren.name] = coren;
  // The cells, behind the Down St. Key's door: Lare.
  const cells = lab("AbandonedShip_Room_B1F", "Cells", [{ x: 4, y: 7, map: L("B1F"), warp: 2 }, { x: 5, y: 7, map: L("B1F"), warp: 2 }]);
  cells.people = [take("SHADOW_LARE", 4, 3, "face_down")];
  changed[cells.name] = cells;
  // B2F (the Abandoned Ship's lower corridor): the elevator up (to B1F's east half), the stairs up (to its west
  // half), its rooms, and the DNA Samples' door.
  changed[L("B2F")] = lab("AbandonedShip_Corridors_B1F", "B2F", [
    { x: 6, y: 4, map: L("B2F_Rooms2"), warp: 2 }, { x: 3, y: 4, map: L("B2F_Rooms2"), warp: 0 },
    { x: 5, y: 7, map: L("B2F_Rooms"), warp: 0 }, { x: 8, y: 7, map: L("B2F_Rooms"), warp: 1 },
    { x: 11, y: 7, map: L("DNARoom"), warp: 0 },                                              // the DNA Samples' door
    { x: 11, y: 4, map: L("B2F_Room"), warp: 0 },
    { x: 0, y: 2, map: L("B1F"), warp: 0 },                                                   // the elevator up
    { x: 8, y: 2, map: L("B1F"), warp: 10 }]);                                                // the stairs up
  // B2F's rooms: west of the elevators (Tanie, added in game/orre.js), east of them (the Full Restore at its dead end).
  const r2b = lab("AbandonedShip_Rooms2_B1F", "B2F_Rooms2", [
    { x: 4, y: 7, map: L("B2F"), warp: 1 }, { x: 5, y: 7, map: L("B2F"), warp: 1 }, { x: 13, y: 7, map: L("B2F"), warp: 0 }, { x: 14, y: 7, map: L("B2F"), warp: 0 }]);
  r2b.people = [ball(0, "FULLRESTORE", 12, 2, "full-restore", "orreLabFullRestore")];
  changed[r2b.name] = r2b;
  // Lesar's room and the northernmost room (Dubik); the third cabin's not used.
  const r2 = lab("AbandonedShip_Rooms_B1F", "B2F_Rooms",
    [{ x: 4, y: 1, map: L("B2F"), warp: 2 }, { x: 13, y: 1, map: L("B2F"), warp: 3 }, { x: 22, y: 1, map: L("B2F"), warp: 3 }]);
  // (Lesar by the room's south side: at its west corner's only way in, he'd shut a DNA Sample's spot off for good.)
  r2.people = [take("SHADOW_LESAR", 5, 6, "face_up")];
  changed[r2.name] = r2;
  changed[L("B2F_Room")] = lab("AbandonedShip_Room_B1F", "B2F_Room", [{ x: 4, y: 7, map: L("B2F"), warp: 5 }, { x: 5, y: 7, map: L("B2F"), warp: 5 }]);
  // Past the DNA Samples' door: Skrub's room (the Oceanic Museum's hall), its stairs down to Ein's room.
  changed[L("DNARoom")] = lab("SlateportCity_OceanicMuseum_1F", "DNARoom",
    [{ x: 9, y: 8, map: L("B2F"), warp: 4 }, { x: 10, y: 8, map: L("B2F"), warp: 4 }, { x: 6, y: 1, map: L("EinsRoom"), warp: 0 }]);
  // Ein's room: as it was, its way out up to Skrub's room; the HP Up in its south-west.
  const ein = clone(maps[L("EinsRoom")]);
  ein.warps = [{ x: 4, y: 7, map: L("DNARoom"), warp: 2 }];
  ein.people = ein.people.concat([ball(nextId(ein), "HPUP", 1, 6, "hp-up", "orreLabHPUp")]);
  ein.colosseumLayout = true;
  changed[ein.name] = ein;
};
