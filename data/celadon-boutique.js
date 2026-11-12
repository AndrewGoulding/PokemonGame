// The Celadon Boutique (tools/build-celadon-boutique.js): its room, and its building and door in Celadon City.
(function () {
  const W = window.WORLD_MAPS, city = W && W.CeladonCity, src = W && W["LavenderTown_Mart"], ROOM = "CeladonCity_Boutique";
  if (!city || !src || W[ROOM]) return;
  // (The door: solid, as FireRed's are, walked up into.)
  city.warps.push({ x: 35, y: 11, map: ROOM, warp: 1 });   // (onto the middle of its mat)
  const out = city.warps.length - 1;
  city.patches = Object.assign({}, city.patches, { boutique: { x: 34, y: 6, w: 4, h: 6, top: true, collision: [[34,8,1,0],[35,8,1,0],[36,8,1,0],[37,8,1,0],[34,9,1,0],[35,9,1,0],[36,9,1,0],[37,9,1,0],[34,10,1,0],[35,10,1,0],[36,10,1,0],[37,10,1,0],[34,11,1,0],[35,11,1,105],[36,11,1,132],[37,11,1,0]] } });
  // (Its tiles so in the map's own data too, the patch always on: the door's a door wherever the map's read, coming back out of it too.)
  for (const [x, y, c, b] of city.patches.boutique.collision) { city.collision[y * city.width + x] = c; city.behavior[y * city.width + x] = b; }
  // (Its shop window, read as its sign.)
  city.signs.push({ x: 36, y: 11, script: "CeladonCity_EventScript_BoutiqueSign", text: ["Celadon Boutique\nClassic Kanto looks, tailored here!"] });
  // (The room: Lavender Town's Mart's, in its own colours; the boutique's clerk behind its counter: game/team-fashion.js.)
  W[ROOM] = Object.assign(JSON.parse(JSON.stringify(src)), { name: ROOM, title: "Celadon Boutique", townMapSection: "CELADON_CITY", signs: [], triggers: [], hidden: [],
    warps: src.warps.map((w) => ({ x: w.x, y: w.y, map: "CeladonCity", warp: out })), people: [{"id":0,"rangeX":1,"rangeY":1,"script":"CeladonCity_Boutique_EventScript_Shopper1","flag":null,"width":16,"height":32,"x":6,"y":2,"movement":"look_around","sprite":"beauty","frames":10,"text":["The Celadon Plaid Skirt goes with\neverything. I own it in… well,\nit only comes in green."]},{"id":1,"rangeX":1,"rangeY":1,"script":"CeladonCity_Boutique_EventScript_Shopper2","flag":null,"width":16,"height":32,"x":9,"y":5,"movement":"face_left_and_right","sprite":"lass","frames":10,"text":["She used to have a corner of the\nDepartment Store's second floor.","Now she has a whole shop!"]}] });
  if (window.TOWN_MAP && window.TOWN_MAP.mapSections) window.TOWN_MAP.mapSections[ROOM] = "CELADON_CITY";
})();
