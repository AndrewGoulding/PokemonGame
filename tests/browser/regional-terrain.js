// Real Chromium screenshot tour of new regional terrain and landmark art.
"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),T=require("./lib");
T.loadHeadless();
const LOCATIONS=[
 "AlolaIkiTown","AlolaHainaDesert","AlolaLanakilaSlope",
 "GalarMasterDojo","GalarBallimereLake","GalarStowOnSide",
 "PaldeaCoastalBiome","PaldeaMossuiTown"
];
function spawn(name){
 const m=WORLD_MAPS[name];assert(m,name+" missing from the game");
 const actors=[...(m.people||[]),...(m.warps||[])];
 const clear=(x,y)=>x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&
  !m.collision[y*m.width+x]&&!actors.some(a=>Math.abs(a.x-x)<=1&&Math.abs(a.y-y)<=1);
 let best=null;
 for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++){
  if(!clear(x,y))continue;
  const d=Math.abs(x-m.width/2)+Math.abs(y-m.height/2);
  if(!best||d<best.d)best={x,y,d};
 }
 assert(best,name+" has no safe screenshot tile");
 return{map:name,x:best.x,y:best.y,facing:"down"};
}
(async()=>{
 const coordinates=LOCATIONS.map(spawn),out=path.join(__dirname,"out","regional-terrain");
 const s=await T.start(p=>{p.repelSteps=999999;},coordinates[0],{out});
 const missing=new Set();
 s.page.on("response",r=>{if(r.status()>=400&&/\/assets\/world\/maps\//.test(r.url()))
  missing.add(new URL(r.url()).pathname);});
 try{
  await s.boot();
  for(const at of coordinates){
   await s.eval(loc=>Overworld.teleport(loc),at);
   await s.wait(350);
   const result=await s.eval(map=>({
    name:Game.player.location.map,
    region:WORLD_MAPS[map]?.region,
    effect:!!window.RegionTerrainDetail,
    art:WORLD_MAPS[map]?.region==="alola"?!!window.AlolaArt:
      WORLD_MAPS[map]?.region==="galar"?!!window.GalarArt:!!window.PaldeaArt
   }),at.map);
   assert.equal(result.name,at.map,at.map+" was not loaded");
   assert(result.effect&&result.art,at.map+" custom art is unavailable");
   await s.shot(at.map);
   console.log("Regional screenshot: "+at.map);
  }
  assert.deepEqual([...missing],[],"Regional map image requests failed");
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[],
    "Regional browser errors");
 } finally {await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
