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
 const before=surface.calls;
 R.draw(surface,name,16,48);
 assert.equal(surface.calls,before+1,name+" didn't draw its sprite");
 assert.equal(R.imageStatus(name).ready,true);
 assert.deepEqual(R.plan(name),p,name+" location changed between frames");
 assert.equal(JSON.stringify({collision:m.collision,behavior:m.behavior,warps:m.warps,people:m.people}),
 snapshot,name+" sprite renderer changed gameplay map");
}
for(const region of regions){
 assert(counts[region]>= (["galar","alola","paldea"].includes(region)?10:2),
  region+" authored source coverage");
 if(["galar","alola","paldea"].includes(region))
  assert(placed[region]>=1,region+" has no placeable multi-tile sprites");
}
const before=surface.calls;
R.draw(surface,"PalletTown",0,0);
assert.equal(surface.calls,before,"Kanto must remain unchanged");
console.log("Hand-authored regional map sprites: "+JSON.stringify({counts,placed,spriteAssets:names.length}));
