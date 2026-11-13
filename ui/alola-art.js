// Alola-specific pixel scenery drawn at the exact 16px collision grid.
// It replaces the Kalos placeholder picture without changing any story data.
(function () {
"use strict";
const cache = new Map(), T = 16;
const themes = {
  village: ["#d8ba89", "#ebd4a4", "#a26d53", "#785d4e", "#7caa78"],
  tropical: ["#8bbd78", "#a6d58a", "#4d805c", "#345f50", "#e7d5a0"],
  beach: ["#e6d1a0", "#f4e1b6", "#65aebe", "#347b9e", "#8cbb8b"],
  cave: ["#777b75", "#a1a294", "#5b696a", "#404f55", "#c6b999"],
  interior: ["#c8b6a1", "#e1d0af", "#937e73", "#6a5e58", "#90b5a3"],
  cemetery: ["#8eaa9c", "#b6c1a7", "#6f8584", "#506669", "#c2b5ae"],
  snow: ["#d8e7ed", "#f3f7ef", "#a6c4d2", "#718d9f", "#e8efef"],
  desert: ["#d4b87c", "#e9d29a", "#b48b63", "#866f59", "#f0e1b6"],
  volcanic: ["#9d8172", "#bc9b84", "#775f64", "#514858", "#deac76"],
  facility: ["#adc3c7", "#d8d8d1", "#687c90", "#415569", "#e0c994"],
  ruins: ["#bcb29a", "#d9cdae", "#857e76", "#5d666b", "#b7ccba"]
};
function style(name) {
  // Specific biomes first: a snowy Lanakila slope or the Haina Desert
  // should never inherit the default tropical lawn.
  if (/Lanakila|Snow|Ice|Frozen/.test(name)) return "snow";
  if (/HainaDesert|Desert/.test(name)) return "desert";
  if (/WelaVolcano|BlushMountain/.test(name)) return "volcanic";
  if (/Ruins|Altar|Shrine|Memorial/.test(name)) return "ruins";
  if (/Aether|Observatory|UltraSpace|Pok[eé]monLeague|LeagueLobby|RRBase|RRLab|RRBoss/.test(name)) return "facility";
  if (/Cemetery/.test(name)) return "cemetery";
  if (/Beach|Coast|Sea|HauoliBeach|Seafolk|Dock|Pool|Brooklet/.test(name)) return "beach";
  if (/Cavern|Cave|Verdant|Grotto/.test(name)) return "cave";
  if (/Home|Center|School|House|Shop|Gym|Hotel|Room|Elite|Champion|HallOfFame|Dome/.test(name)) return "interior";
  if (/City|Town|Village|Iki|HauoliOutskirts|RoyalAvenue|PoTown/.test(name)) return "village";
  return "tropical";
}
function hash(x, y, seed) {
  let n = (Math.imul(x + 11, 374761393) +
    Math.imul(y + 17, 668265263) + Math.imul(seed, 1442695041)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return (n ^ (n >>> 16)) >>> 0;
}
// Place an unmistakable focal detail on one blocked tile per landmark map.
// This is decoration only: event locations, doors, and traversable routes
// remain completely unchanged.
const LANDMARKS={
  AlolaIkiTown:"festival",AlolaHauoliCity:"harbor",AlolaMalieCity:"garden",
  AlolaPaniolaTown:"ranch",AlolaPoTown:"skull",AlolaSeafolkVillage:"boat",
  AlolaAetherLobby:"aether",AlolaLushJungle:"canopy",
  AlolaRuinsOfLife:"tapu",AlolaLanakilaSummit:"snowcap",
  AlolaLeagueLobby:"league",AlolaHainaDesert:"dunes"
};
function landmark(g,m,name,p){
 const kind=LANDMARKS[name];if(!kind)return;
 const cx=Math.floor(m.width/2),cy=Math.floor(m.height/2),spots=[];
 for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++){
  if(!m.collision[y*m.width+x] || (m.warps||[]).some(a=>a.x===x&&a.y===y) ||
    (m.people||[]).some(a=>a.x===x&&a.y===y) ||
    (m.signs||[]).some(a=>a.x===x&&a.y===y))continue;
  spots.push({x,y,d:Math.abs(x-cx)+Math.abs(y-cy)});
 }
 spots.sort((a,b)=>a.d-b.d);
 if(!spots.length)return;
 const x=spots[0].x*T,y=spots[0].y*T;
 const rect=(color,xx,yy,w,h)=>{g.fillStyle=color;g.fillRect(x+xx,y+yy,w,h);};
 if(kind==="festival"){
  rect("#8c4b64",7,4,2,11);rect("#ecd08e",4,5,8,5);
  rect("#d95b69",6,7,4,3);rect("#f7e2b1",6,1,4,4);
 }else if(kind==="harbor"||kind==="boat"){
  rect("#4c8f9b",1,11,14,4);rect("#d9bd87",3,8,11,4);
  rect("#fff0cd",7,2,2,8);rect("#f0e6c8",9,3,5,6);
 }else if(kind==="garden"||kind==="canopy"){
  rect("#43654e",7,8,3,7);rect("#69a477",2,3,12,9);
  rect("#d8d8a1",4,5,3,3);rect("#bd96bd",10,6,3,3);
 }else if(kind==="ranch"){
  rect("#a47153",2,7,12,8);rect("#dfb97d",1,4,14,5);
  rect("#f2dfb1",4,10,3,3);rect("#665948",11,9,2,6);
 }else if(kind==="skull"){
  rect("#574957",2,5,12,10);rect("#cd8097",4,3,8,5);
  rect("#f5eee0",5,8,3,3);rect("#f5eee0",10,8,2,3);
 }else if(kind==="aether"||kind==="league"){
  rect("#5e7a90",2,7,12,8);rect("#e0e4d4",4,3,8,6);
  rect(kind==="aether"?"#78cfba":"#dfbc77",7,5,2,7);
 }else if(kind==="tapu"){
  rect("#6b7570",3,7,10,8);rect("#ddccab",5,3,6,5);
  rect("#8bbaa2",7,5,2,7);
 }else if(kind==="snowcap"){
  rect("#88a9b8",2,9,12,6);rect("#f8faf3",4,4,8,7);
  rect("#b8d9e4",7,7,3,7);
 }else if(kind==="dunes"){
  rect("#b99060",1,10,14,5);rect("#e8d098",4,5,10,8);
  rect("#f7e4af",7,3,5,3);
 }
}
function make(name) {
  const m = window.WORLD_MAPS[name], c = document.createElement("canvas");
  c.width = m.width * T; c.height = m.height * T;
  const g = c.getContext("2d", { alpha: false }), kind = style(name), p = themes[kind];
  const seed = [...name].reduce((n, ch) => (Math.imul(n, 31) + ch.charCodeAt(0)) >>> 0, 47);
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
    const i = y * m.width + x, r = hash(x, y, seed), px = x * T, py = y * T;
    const solid = Boolean(m.collision[i]), grass = m.behavior[i] === 2;
    g.fillStyle = solid ? p[2] : grass ? p[4] : (r % 7 ? p[0] : p[1]);
    g.fillRect(px, py, T, T);
    if (solid && (kind === "tropical" || kind === "village" || kind === "beach")) {
      // Dense palm/roof silhouettes only where walking is impossible.
      g.fillStyle = p[3]; g.fillRect(px + 7, py + 8, 3, 8);
      g.fillStyle = p[4]; g.fillRect(px + 2, py + 3, 12, 6);
      g.fillRect(px + 5, py + 1, 6, 11);
      g.fillStyle = p[1]; g.fillRect(px + 5, py + 4, 3, 2);
    } else if (solid && (kind === "snow" || kind === "desert" || kind === "volcanic")) {
      // Distinctive ice slabs, dunes and volcanic stone, entirely on blocked tiles.
      g.fillStyle = p[3]; g.fillRect(px + 1, py + 9, 14, 6);
      g.fillStyle = p[2]; g.fillRect(px + 3, py + 5, 10, 7);
      g.fillStyle = p[1]; g.fillRect(px + 5, py + 3, 6, 4);
      if (kind === "snow") {
        g.fillStyle = "#f7fbf7"; g.fillRect(px + 3, py + 4, 8, 2);
      } else if (kind === "volcanic") {
        g.fillStyle = "#df956d"; g.fillRect(px + 8, py + 8, 3, 3);
      } else {
        g.fillStyle = "#f0d4a0"; g.fillRect(px + 1, py + 12, 8, 2);
      }
    } else if (solid && kind === "facility") {
      g.fillStyle = p[3]; g.fillRect(px + 1, py + 3, 14, 12);
      g.fillStyle = p[2]; g.fillRect(px + 3, py + 5, 10, 8);
      g.fillStyle = p[4]; g.fillRect(px + 5, py + 7, 6, 3);
      g.fillStyle = p[1]; g.fillRect(px + 2, py + 2, 12, 2);
    } else if (solid) {
      g.fillStyle = p[3]; g.fillRect(px + 2, py + 9, 12, 7);
      g.fillStyle = p[1]; g.fillRect(px + 4, py + 4, 8, 6);
      g.fillStyle = p[2]; g.fillRect(px + 7, py + 6, 2, 4);
    } else if (grass) {
      g.fillStyle = p[2]; g.fillRect(px + 4, py + 9, 2, 4);
      g.fillRect(px + 9, py + 7, 2, 6);
      g.fillStyle = p[1]; g.fillRect(px + 7, py + 10, 2, 2);
    } else if (kind === "interior" || kind === "village") {
      g.fillStyle = p[1]; g.fillRect(px + 1, py + 2, 14, 12);
      g.fillStyle = p[2]; g.fillRect(px, py + 7, T, 1);
      if (r % 9 === 0) { g.fillStyle = p[4]; g.fillRect(px + 3, py + 3, 3, 2); }
    } else if (kind === "snow") {
      g.fillStyle = p[1]; g.fillRect(px + 2, py + 3, 12, 2);
      if (r % 5 === 0) { g.fillStyle = p[3]; g.fillRect(px + 8, py + 10, 3, 2); }
    } else if (kind === "facility") {
      g.fillStyle = p[1]; g.fillRect(px + 1, py + 2, 14, 12);
      g.fillStyle = p[2]; g.fillRect(px + 2, py + 12, 12, 1);
      if (r % 7 === 0) { g.fillStyle = p[4]; g.fillRect(px + 7, py + 5, 2, 2); }
    } else if (kind === "desert" || kind === "volcanic") {
      g.fillStyle = p[1]; g.fillRect(px + 2, py + 9, 12, 1);
      if (r % 4 === 0) { g.fillStyle = p[2]; g.fillRect(px + 8, py + 5, 4, 2); }
    } else if (kind === "beach") {
      if (r % 4 === 0) { g.fillStyle = "#ffffff"; g.fillRect(px + 3, py + 7, 5, 2); }
      if (r % 7 === 0) { g.fillStyle = p[3]; g.fillRect(px + 10, py + 4, 3, 2); }
    } else {
      if (r % 4 === 0) { g.fillStyle = p[1]; g.fillRect(px + 4, py + 11, 5, 2); }
      if (r % 8 === 0) { g.fillStyle = p[4]; g.fillRect(px + 10, py + 4, 3, 3); }
    }
  }
  landmark(g,m,name,p);
  // Simple but unmistakable entrances; keep marker art inside the warp tile.
  for (const warp of m.warps || []) {
    const x = warp.x * T, y = warp.y * T;
    g.fillStyle = "#4a5556"; g.fillRect(x + 4, y + 5, 8, 10);
    g.fillStyle = "#f1dcad"; g.fillRect(x + 5, y + 6, 6, 8);
    g.fillStyle = "#b07b55"; g.fillRect(x + 7, y + 9, 3, 5);
  }
  return c;
}
function draw(g, name, x, y) {
 if(window.WORLD_MAPS?.[name]?.regionLayout)return; // drawn by tools/build-region-layouts.js
  if (window.WORLD_MAPS?.[name]?.region !== "alola") return;
  let c = cache.get(name);
  if (!c) { c = make(name); cache.set(name, c); }
  g.drawImage(c, x, y);
}
window.AlolaArt = { draw, style, themes, LANDMARKS, clear: () => cache.clear() };
})();
