// Regional indoor tile sheets: real image assets, no collision/warp changes.
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const game=fs.readFileSync(path.join(root,"ui/game.js"),"utf8");
assert(html.includes('src="ui/region-interior-tiles.js"'));
assert(game.includes("RegionInteriorTiles.draw(g,map,x,y)"));
global.window=global;
const paint={draws:[],globalAlpha:1,drawImage(...a){
 this.draws.push({a,alpha:this.globalAlpha});
 }};
global.document={createElement:tag=>{
 assert.equal(tag,"canvas");
 return{width:0,height:0,getContext:()=>paint};
}};
global.Image=class {
 constructor(){this.complete=true;this.naturalWidth=64;this.naturalHeight=16;}
 set src(v){assert(v.startsWith("assets/region-art/"));this._src=v;}
 get src(){return this._src;}
};
const sample=(name,region,indoor)=>{
 const w=12,h=10,collision=Array(w*h).fill(0);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)
  if(x===0||y===0||x===w-1||y===h-1)collision[y*w+x]=1;
 return{name,region,width:w,height:h,collision,
  behavior:Array(w*h).fill(0),warps:[{x:2,y:2}],
  people:[{x:4,y:4}],signs:[],triggers:[],hidden:[],
  paldeaLayout:region==="paldea"?{interior:indoor}:undefined,
  alolaCustomLayout:region==="alola"?{interior:indoor}:undefined,
  galarCustomLayout:region==="galar"?{interior:indoor}:undefined};
};
global.WORLD_MAPS={
 GalarHome:sample("GalarHome","galar",false),
 AlolaPokeCenter:sample("AlolaPokeCenter","alola",true),
 PaldeaAcademy:sample("PaldeaAcademy","paldea",true),
 PalletTown:sample("PalletTown","kanto",false)
};
vm.runInThisContext(fs.readFileSync(path.join(root,"ui/region-interior-tiles.js"),"utf8"),
 {filename:"ui/region-interior-tiles.js"});
const R=RegionInteriorTiles;
let composites=0;
const output={drawImage(){composites++;}};
for(const name of ["GalarHome","AlolaPokeCenter","PaldeaAcademy"]){
 const m=WORLD_MAPS[name],old=JSON.stringify(m);
 assert(R.isInterior(m),name+" not recognized as indoor");
 assert(fs.existsSync(path.join(root,"assets/region-art",m.region+"-interiors.svg")));
 const before=paint.draws.length;
 R.draw(output,name,0,0);
 const fresh=paint.draws.slice(before);
 assert(fresh.length>20,name+" not painting interior tiles");
 assert(fresh.every(x=>x.a.length===9),"Source image must crop authored 16px tiles");
 assert(fresh.every(x=>x.alpha<1),"Indoor tile artwork must blend with existing map");
 assert.equal(paint.globalAlpha,1,"Canvas alpha leaked after drawing");
 const after=paint.draws.length;
 R.draw(output,name,16,8);
 assert.equal(paint.draws.length,after,"Indoor flooring should cache its canvas");
 assert.equal(JSON.stringify(m),old,name+" changed gameplay layout");
}
R.draw(output,"PalletTown",0,0);
assert.equal(composites,6,"Only the three custom-region interiors should draw");
assert.equal(R.tileStyle(WORLD_MAPS.GalarHome),0);
assert.equal(R.tileStyle(WORLD_MAPS.AlolaPokeCenter),2);
console.log("Regional hand-authored indoor floors: three atlases, caching and safety passed");
