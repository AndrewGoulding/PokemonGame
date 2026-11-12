// Hand-authored sprite atlas placement must fit actual world geometry.
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.join(__dirname,"..");
global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
for(const [,file] of fs.readFileSync(path.join(root,"index.html"),"utf8")
  .matchAll(/<script src="([^"]+)"><\/script>/g)){
 if(!file.startsWith("ui/"))
  vm.runInThisContext(fs.readFileSync(path.join(root,file),"utf8"),{filename:file});
}
global.Image=class {
 constructor(){this.complete=true;this.naturalWidth=96;this.naturalHeight=64;}
 set src(value){this._src=value;}
 get src(){return this._src;}
};
vm.runInThisContext(fs.readFileSync(path.join(root,"ui/authored-region-art.js"),"utf8"),
  {filename:"ui/authored-region-art.js"});
const R=AuthoredRegionArt;
assert(typeof R.draw==="function"&&typeof R.plan==="function");
const regions=["orre","sinnoh","unova","kalos","galar","alola","paldea"];
const names=Object.keys(R.CHOICES),counts=Object.fromEntries(regions.map(r=>[r,0])),
 placed=Object.fromEntries(regions.map(r=>[r,0]));
const surface={calls:0,drawImage(_img,x,y,w,h){
 assert(Number.isInteger(x)&&Number.isInteger(y));
 assert(Number.isInteger(w)&&w>=32&&Number.isInteger(h)&&h>=32);
 this.calls++;
}};
for(const name of names){
 const m=WORLD_MAPS[name];
 if(!m)continue; // Future content may add an item before its map is registered.
 counts[m.region]++;
 assert(fs.existsSync(path.join(root,"assets/region-art",R.CHOICES[name]+".svg")),
  name+" references a missing sprite");
 const snapshot=JSON.stringify({collision:m.collision,behavior:m.behavior,warps:m.warps,people:m.people});
 const p=R.plan(name);
 if(!p)continue;
 placed[m.region]++;
 assert.equal(p.asset,R.CHOICES[name]);
 assert(p.x>=2&&p.y>=2&&p.x+p.w<=m.width-2&&p.y+p.h<=m.height-2,name+" outside map");
 for(let y=p.y;y<p.y+p.h;y++)for(let x=p.x;x<p.x+p.w;x++){
   const i=y*m.width+x;
   assert(m.collision[i]&&!([...(m.warps||[]),...(m.people||[]),
     ...(m.signs||[]),...(m.triggers||[]),...(m.hidden||[])]
      .some(a=>Math.abs(a.x-x)<=1&&Math.abs(a.y-y)<=1)),name+" paints an event");
 }
 const oldTile=m.collision[p.y*m.width+p.x];
 m.collision[p.y*m.width+p.x]=0;
 assert.equal(R.footprintIntact(m,p),false,name+" should detect an opened path");
 m.collision[p.y*m.width+p.x]=oldTile;
 assert.equal(R.footprintIntact(m,p),true,name+" should accept restored geometry");
 const before=surface.calls;
 R.draw(surface,name,16,48);
 assert.equal(surface.calls,before+1,name+" didn't draw its sprite");
 assert.equal(R.imageStatus(name).ready,true);
 assert.deepEqual(R.plan(name),p,name+" location changed between frames");
 assert.equal(JSON.stringify({collision:m.collision,behavior:m.behavior,warps:m.warps,people:m.people}),
 snapshot,name+" sprite renderer changed gameplay map");
}
// Second pass: every new sprite is a real, editable asset, and every
// selected location must be a registered world map with a safe footprint.
const SECOND_PASS={
  AgateVillage:"orre-agate-tree",
  MtBattle:"orre-mtbattle-gantry",
  RealgamTower_Exterior:"orre-realgam-dome",
  SpearPillar:"sinnoh-spear-pillar",
  CanalaveCity:"sinnoh-canalave-bridge",
  EternaForest:"sinnoh-eterna-forest",
  UnovaDriftveilCity:"unova-driftveil-crane",
  UnovaOpelucidCity:"unova-opelucid-towers",
  KalosShalourCity:"kalos-shalour-tower",
  KalosGeosengeTown:"kalos-geosenge-stones",
  KalosSnowbelleCity:"kalos-snowbelle-chalet",
  AlolaSeafolkVillage:"alola-seafolk-boat",
  AlolaMalieCity:"alola-malie-pagoda",
  AlolaPoTown:"alola-po-town",
  GalarBallonlea:"galar-ballonlea-shrooms",
  GalarTurffield:"galar-turffield-glyph",
  GalarWyndonCity:"galar-wyndon-clock",
  PaldeaCascarrafa:"paldea-cascarrafa-terraces",
  PaldeaGlaseado:"paldea-glaseado-peak",
  PaldeaAreaZero:"paldea-area-zero-lab",
  PaldeaMossuiTown:"paldea-kitakami-shrine"
};
for (const [name, asset] of Object.entries(SECOND_PASS)) {
 assert.equal(R.CHOICES[name],asset,name+" missing its original sprite selection");
 assert(WORLD_MAPS[name],name+" is not a registered overworld map");
 assert(R.plan(name),name+" has no safe solid footprint for the authored sprite");
 const file=path.join(root,"assets/region-art",asset+".svg");
 assert(fs.existsSync(file),name+" sprite was not committed");
 const xml=fs.readFileSync(file,"utf8");
 assert(xml.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'),asset+" malformed SVG");
 assert(xml.includes('viewBox="0 0 96 64"')&&xml.includes('crispEdges'),asset+" lost 16px-scale source artwork");
 assert(!/<script|<image|url\(|<foreignObject/i.test(xml),asset+" contains an external resource");
}
for(const region of regions){
 assert(counts[region]>= (["galar","alola","paldea"].includes(region)?10:2),
  region+" authored source coverage");
 assert.equal(placed[region],counts[region],
  region+" has a landmark planned but not safely placeable");
}
const before=surface.calls;
R.draw(surface,"PalletTown",0,0);
assert.equal(surface.calls,before,"Kanto must remain unchanged");
console.log("Hand-authored regional map sprites: "+JSON.stringify({
 counts,placed,namedLocations:names.length,
 uniqueSpriteAssets:new Set(Object.values(R.CHOICES)).size
}));
