// Chromium proof: authored SVGs load and appear in playable maps.
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const T=require("./lib"),root=path.join(__dirname,"../..");
T.loadHeadless();
vm.runInThisContext(fs.readFileSync(path.join(root,"ui/authored-region-art.js"),"utf8"),
  {filename:"ui/authored-region-art.js"});
const candidates=[
 ["orre",["AgateVillage","RealgamTower_Exterior","PhenacCity"]],
 ["sinnoh",["SpearPillar","CanalaveCity","FloaromaTown"]],
 ["unova",["UnovaDriftveilCity","UnovaOpelucidCity","UnovaNimbasaCity"]],
 ["kalos",["KalosShalourCity","KalosGeosengeTown","KalosLaverreCity"]],
 ["galar",["GalarBallonlea","GalarWyndonCity","GalarPostwick"]],
 ["alola",["AlolaMalieCity","AlolaSeafolkVillage","AlolaIkiTown"]],
 ["paldea",["PaldeaCascarrafa","PaldeaZeroLab","PaldeaMossuiTown"]]
];
function safe(name,plan){
 const m=WORLD_MAPS[name],anchors=[...(m.people||[]),...(m.warps||[])];
 const free=(x,y)=>x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&
   !m.collision[y*m.width+x]&&
   !anchors.some(a=>Math.abs(a.x-x)<=1&&Math.abs(a.y-y)<=1);
 let best=null;
 const cx=plan.x+plan.w/2,cy=plan.y+plan.h/2;
 for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++){
  if(!free(x,y))continue;
  const score=Math.abs(x-cx)+Math.abs(y-cy);
  if(!best||score<best.score)best={x,y,score};
 }
 assert(best,name+" has no safe screenshot tile");
 return{map:name,x:best.x,y:best.y,facing:"down"};
}
const selected=[];
for(const [region,names] of candidates){
 let found=0;
 for(const name of names){
  const p=AuthoredRegionArt.plan(name);
  if(!p)continue;
  selected.push({region,name,asset:p.asset,at:safe(name,p)});
  if(++found===2)break;
 }
 assert(found>=1,region+" has no viewable multi-tile art");
}
(async()=>{
 const out=path.join(__dirname,"out","authored-region-art");
 const start=selected[0].at;
 const s=await T.start(p=>{
  p.repelSteps=999999;p.flags.orre=2;p.flags.orreStory=44;
  p.flags.orreMail={got:Object.keys(Orre.MAIL),read:Object.keys(Orre.MAIL)};
 },start,{out});
 const bad=new Set();
 s.page.on("response",r=>{
  if(r.status()>=400&&/\/assets\/region-art\//.test(r.url()))
   bad.add(new URL(r.url()).pathname);
 });
 try{
  await s.boot();
  for(const item of selected){
   await s.eval(loc=>Overworld.teleport(loc),item.at);
   await s.wait(400);
   await s.page.waitForFunction(name=>
     !!window.AuthoredRegionArt?.imageStatus(name)?.ready,
     item.name,{timeout:10000});
   const details=await s.eval(name=>({
    map:Game.player.location.map,
    art:window.AuthoredRegionArt?.imageStatus(name)
   }),item.name);
   assert.equal(details.map,item.name,"Wrong map rendered");
   assert.equal(details.art.asset,item.asset);
   assert(details.art.w>=2&&details.art.h>=2,"Not a multi-tile sprite");
   await s.shot(item.name);
   console.log("Authored sprite visible: "+item.name+" / "+item.asset);
  }
  assert.deepEqual([...bad],[],"Missing authored SVG requests");
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[],
   "Unexpected browser errors");
 }finally{await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
