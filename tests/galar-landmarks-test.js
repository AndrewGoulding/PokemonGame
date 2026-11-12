// Galar's added landmarks are isolated to visual tiles and respect story data.
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.join(__dirname,"..");
global.window=global;
const operations=[];
const g={
 fillStyle:"",
 fillRect(x,y,w,h){assert([x,y,w,h].every(Number.isFinite));operations.push([x,y,w,h]);}
};
global.document={createElement:()=>({width:0,height:0,getContext:()=>g})};
global.Galar={owns:name=>/^Galar/.test(name)};
const w=28,h=24;
const collision=Array(w*h).fill(0);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 if(x===0||y===0||x===w-1||y===h-1||(x>=10&&x<=16&&y>=7&&y<=12))
 collision[y*w+x]=1;
}
const m={name:"GalarMasterDojo",width:w,height:h,collision,
 behavior:Array(w*h).fill(0),warps:[{x:4,y:5}],people:[{x:8,y:10}]};
global.WORLD_MAPS={GalarMasterDojo:m};
vm.runInThisContext(fs.readFileSync(path.join(root,"ui/galar-art.js"),"utf8"),{filename:"ui/galar-art.js"});
for(const name of ["GalarStowOnSide","GalarCirchester","GalarMasterDojo",
 "GalarHoneycalmIsland","GalarOldCemetery","GalarEternatusChamber",
 "GalarMaxLair","GalarTowerWaters","GalarTowerDarkness","GalarBallimereLake"]){
 assert(GalarArt.LANDMARKS[name],"Missing distinctive landmark for "+name);
}
const before=JSON.stringify(m),out={calls:0,drawImage(c){
 this.calls++;assert.equal(c.width,w*16);assert.equal(c.height,h*16);
}};
GalarArt.draw(out,m.name,0,0);
assert(operations.length>w*h,"Galar scenery did not render");
const first=operations.length;
GalarArt.draw(out,m.name,-16,20);
assert.equal(operations.length,first,"Galar renderer should cache finished scenery");
assert.equal(out.calls,2);
assert.equal(JSON.stringify(m),before,"Galar landmark changed story or collision data");
console.log("Galar landmarks: distinctive DLC art and immutable world data passed");
