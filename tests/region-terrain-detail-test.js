// Headless renderer regression for tile-connected shores, cliffs and grass.
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const game=fs.readFileSync(path.join(root,"ui/game.js"),"utf8");
assert(html.includes('src="ui/region-terrain-detail.js"'));
assert(game.includes("RegionTerrainDetail.draw(g,map,x,y)"));
const marks=[];
const context={
 globalAlpha:1,fillStyle:"",
 fillRect(x,y,w,h){assert([x,y,w,h].every(Number.isFinite));assert(w>0&&h>0);marks.push({x,y,w,h,alpha:this.globalAlpha});}
};
global.window=global;
global.document={createElement:tag=>{assert.equal(tag,"canvas");return{width:0,height:0,getContext:()=>context};}};
function fixture(region){
 const w=20,h=18,collision=Array(w*h).fill(0),behavior=Array(w*h).fill(0);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if(x===0||y===0||x===w-1||y===h-1||(x>=3&&x<=6&&y>=3&&y<=7))collision[y*w+x]=1;
  if(x>=10&&x<=13&&y>=4&&y<=8)behavior[y*w+x]=0x10;
  if(x>=8&&x<=10&&y>=11&&y<=14)behavior[y*w+x]=2;
 }
 return{region,name:region+"TestTown",width:w,height:h,collision,behavior,people:[{x:4,y:4}],warps:[{x:8,y:8}],signs:[{x:6,y:5}],triggers:[],hidden:[]};
}
global.WORLD_MAPS={};
for(const region of ["alola","galar","paldea","kanto"])WORLD_MAPS[region+"TestTown"]=fixture(region);
vm.runInThisContext(fs.readFileSync(path.join(root,"ui/region-terrain-detail.js"),"utf8"),{filename:"ui/region-terrain-detail.js"});
const draw={drawImage(c,x,y){assert.equal(c.width,320);assert.equal(c.height,288);assert(Number.isFinite(x)&&Number.isFinite(y));this.calls=(this.calls||0)+1;}};
for(const region of ["alola","galar","paldea"]){
 const m=WORLD_MAPS[region+"TestTown"],original=JSON.stringify(m),start=marks.length;
 const result=RegionTerrainDetail.make(m);
 assert(result.shores>=12,region+" shoreline should be continuous");
 assert(result.edges>5,region+" cliffs should get boundary shading");
 assert(marks.length>start,region+" no scenery painted");
 assert(marks.slice(start).some(v=>v.alpha<1),region+" overlays should preserve underlying artwork");
 assert.equal(context.globalAlpha,1,"opacity leaked");
 RegionTerrainDetail.draw(draw,m.name,0,0);
 const cached=marks.length;RegionTerrainDetail.draw(draw,m.name,8,8);
 assert.equal(marks.length,cached,"terrain should cache generated map");
 assert.equal(JSON.stringify(m),original,region+" altered gameplay state");
}
RegionTerrainDetail.draw(draw,"kantoTestTown",0,0);
assert.equal(draw.calls,6,"Kanto must not receive new region overlay");
console.log("Regional terrain detail: boundaries, shoreline, caching and map isolation passed");
