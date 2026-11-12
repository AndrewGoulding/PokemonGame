// Paldea-inspired pixel scenery for the browser's 2D overworld.
// Original procedural artwork; uses existing collision, warps and NPC positions
// so a visual overhaul never changes navigable geometry or encounter mechanics.
(function(){
'use strict';
const SIZE=16,cache=new Map();
const PALETTES={
 grass:['#7ebd71','#a6cc80','#5c925e','#3b6e49','#d9c99a'],
 city:['#d4bc9f','#e8d3b8','#907e79','#625864','#9baf9d'],
 coast:['#e4d7aa','#f2e5b9','#5498a9','#286985','#c2ca91'],
 mountain:['#a4a5a0','#c3b9a5','#74787b','#4f5860','#95a478'],
 festival:['#dbb28f','#f1d6a5','#9b665d','#753e60','#9db17c'],
 village:['#b8ba8c','#d6cfa2','#7c9d77','#6c7954','#b79277'],
 forest:['#60895c','#8aaf6d','#416747','#294d42','#b3bf89'],
 savanna:['#d4c17c','#e8d38e','#9eab65','#607e57','#ab875d'],
 tropical:['#8ccbb0','#bfdfab','#5da3a1','#326f8d','#ebd9a2'],
 canyon:['#bd947e','#daaa8e','#896b72','#625875','#c9b5a0'],
 polar:['#d7e5df','#f2f9ed','#a5c7d2','#6799b1','#e4eff5'],
 blueberry:['#a9c6d8','#d2e0ed','#5b789c','#365777','#f4db91'],
 crystal:['#7aa5a8','#a4c4be','#566f9e','#3e4d79','#c3d9e5'],
 chamber:['#9c92b9','#d0bedf','#6f5e9a','#473f77','#abdeda'],
 stone:['#939b91','#babaa8','#6e7a76','#465e61','#d4cbaf']
};
function style(name){
 if(!/^Paldea/.test(name))return null;
 if(/TerapagosChamber/.test(name))return'chamber';
 if(/Underdepths|AreaZero|ResearchOne|ResearchTwo|ZeroLab/.test(name))return'crystal';
 if(/PolarBiome|PolarTrial/.test(name))return'polar';
 if(/CanyonBiome|CanyonTrial/.test(name))return'canyon';
 if(/CoastalBiome|CoastalTrial/.test(name))return'tropical';
 if(/SavannaBiome|SavannaTrial/.test(name))return'savanna';
 if(/Blueberry|Terarium|LeagueClub|KieranArena/.test(name))return'blueberry';
 if(/LoyaltyPlaza|DreadedDen/.test(name))return'festival';
 if(/OniMountain|CrystalPool/.test(name))return'mountain';
 if(/AppleHills/.test(name))return'forest';
 if(/MossuiTown|CommunityCenter|KitakamiBus/.test(name))return'village';
 if(/Lake|Sea|Coast|Beach|Cascarrafa/.test(name))return'coast';
 if(/Glaseado|Montenevera|Snow/.test(name))return'polar';
 if(/Gym|League|Academy|Levincia|Medali|Alfornada|Artazon|Cortondo|LosPlatos|CaboPoco/.test(name))return'city';
 if(/Cave|Den|Cliff|Mountain|SteelTrail|EarthTrail/.test(name))return'stone';
 if(/Navi|Schedar|Caph|Segin|Ruchbah/.test(name))return'canyon';
 return'grass';
}
function hash(x,y,seed){
 let n=(Math.imul(x+17,374761393)+Math.imul(y+31,668265263)+Math.imul(seed,1442695041))>>>0;
 n=Math.imul(n^(n>>>13),1274126177)>>>0;
 return(n^(n>>>16))>>>0;
}
function rect(g,color,x,y,w,h){g.fillStyle=color;g.fillRect(x,y,w,h);}
function decoration(g,kind,x,y,r,p){
 // Pixel details always stay inside their 16x16 cells. Traversable floor
 // remains visually identifiable; blocked tiles carry solid silhouettes.
 const k=r%7;
 if(kind==='festival'){
  if(k===0||k===1){
   rect(g,'#7a2d52',x+6,y+3,3,11);rect(g,'#f6df9b',x+3,y+3,10,3);
   rect(g,'#e8a24d',x+6,y+6,3,3);
  }else if(k===2){rect(g,'#f2ca6a',x+3,y+4,3,3);rect(g,'#af4c5c',x+9,y+9,3,3);}
 }else if(kind==='blueberry'){
  rect(g,'#638db4',x+2,y+2,12,1);
  if(k<3){rect(g,'#e0cc80',x+4,y+5,3,3);rect(g,'#c6e5de',x+10,y+9,2,2);}
 }else if(kind==='crystal'||kind==='chamber'){
  if(k<4){
   rect(g,'#bfe7e9',x+5,y+3,4,8);
   rect(g,'#7866aa',x+8,y+6,3,5);
   rect(g,'#e2e3f1',x+6,y+2,2,2);
  }
 }else if(kind==='polar'){
  rect(g,'#fffdf0',x+2,y+4,9,2);
  if(k<3)rect(g,'#85b2c3',x+8,y+9,5,2);
 }else if(kind==='canyon'||kind==='stone'){
  rect(g,'#d6c0aa',x+3,y+5,9,2);
  if(k<3)rect(g,'#725973',x+7,y+9,5,3);
 }else if(kind==='tropical'||kind==='coast'){
  if(k<4){rect(g,'#ebdfa4',x+2,y+9,8,2);rect(g,'#54aba6',x+9,y+4,3,4);}
 }else if(kind==='savanna'){
  if(k<4){rect(g,'#9b995b',x+5,y+4,2,9);rect(g,'#ece1a4',x+9,y+7,4,2);}
 }else if(kind==='forest'||kind==='grass'||kind==='village'){
  if(k<3){rect(g,'#e6d69e',x+3,y+5,3,2);rect(g,'#4e8b55',x+9,y+8,3,5);}
 }else if(kind==='city'){
  if(k<3){rect(g,'#7b8f8a',x+3,y+2,3,3);rect(g,'#f4e6be',x+9,y+9,4,2);}
 }
}
function make(name){
 const map=window.WORLD_MAPS[name];
 const canvas=document.createElement('canvas');
 canvas.width=map.width*SIZE;canvas.height=map.height*SIZE;
 const g=canvas.getContext('2d',{alpha:false});
 const kind=style(name),p=PALETTES[kind];
 const seed=[...name].reduce((n,c)=>n+c.charCodeAt(0),0);
 for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
  const i=y*map.width+x,r=hash(x,y,seed),px=x*SIZE,py=y*SIZE;
  const wall=!!map.collision[i],water=map.behavior[i]===0x10;
  const floor=(kind==='city'||kind==='blueberry'||kind==='chamber'||kind==='festival');
  if(water){
   rect(g,kind==='polar'?'#78aec4':'#3f9eac',px,py,SIZE,SIZE);
   rect(g,'#bde9dd',px+(r%9),py+3+(r%8),5,1);
  }else if(wall){
   rect(g,p[2],px,py,SIZE,SIZE);
   if(floor){
    rect(g,p[3],px+1,py+1,14,3);
    rect(g,p[1],px+4,py+5,8,5);
    rect(g,p[4],px+5,py+6,2,2);
    rect(g,p[3],px+2,py+13,12,2);
   }else if(kind==='savanna'){
    rect(g,p[3],px+7,py+7,3,9);
    rect(g,p[2],px+2,py+2,13,9);
    rect(g,p[1],px+5,py+4,6,3);
   }else if(kind==='tropical'||kind==='forest'||kind==='grass'||kind==='village'){
    rect(g,p[3],px+6,py+8,4,8);
    rect(g,p[2],px+2,py+2,13,11);
    rect(g,p[1],px+5,py+3,6,4);
   }else{
    rect(g,p[3],px+2,py+3,12,10);
    rect(g,p[1],px+4,py+5,8,3);
   }
  }else{
   rect(g,r%7===0?p[1]:p[0],px,py,SIZE,SIZE);
   if(floor){
    rect(g,p[1],px+2,py+2,12,12);
    rect(g,p[4],px,py+8,16,2);
    if(r%5===0)decoration(g,kind,px,py,r,p);
   }else if(r%4===0)decoration(g,kind,px,py,r,p);
   else if(r%3===0)rect(g,p[4],px+4,py+8,5,2);
  }
 }
 // Highlight reciprocal exits so players can still find the real warp tile
 // underneath the replacement scenery.
 for(const warp of map.warps||[]){
  const x=warp.x*SIZE,y=warp.y*SIZE;
  rect(g,'#f9e8ae',x+3,y+4,10,11);
  rect(g,p[3],x+5,y+7,6,8);
  rect(g,'#ffffff',x+6,y+7,2,3);
 }
 return canvas;
}
function draw(g,name,x,y){
 if(!window.WORLD_MAPS?.[name]||!window.Paldea?.owns(name))return;
 let cv=cache.get(name);
 if(!cv){cv=make(name);cache.set(name,cv);}
 g.drawImage(cv,x,y);
}
window.PaldeaArt={draw,style,PALETTES,clear:()=>cache.clear()};
})();
