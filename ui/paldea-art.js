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
// Unique, location-specific landmarks supplement the biome palettes.
// Landmarks are painted only on solid (impassable) map cells so they cannot
// hide an interactable NPC or warp on the overworld.
const LANDMARKS={
 PaldeaCaboPoco:'home',PaldeaAcademy:'academy',PaldeaMesagoza:'fountain',
 PaldeaMossuiTown:'lantern',PaldeaAppleHills:'orchard',
 PaldeaLoyaltyPlaza:'masks',PaldeaOniMountain:'summit',
 PaldeaTerariumHub:'dome',PaldeaSavannaBiome:'savanna',
 PaldeaCoastalBiome:'coast',PaldeaCanyonBiome:'cliff',PaldeaPolarBiome:'snow',
 PaldeaUnderdepths:'crystal',PaldeaTerapagosChamber:'terapagos',
 PaldeaZeroLab:'machine'
};
function landmark(g,map,name,p){
 const kind=LANDMARKS[name];if(!kind)return;
 const spots=[];
 const cx=Math.floor(map.width/2),cy=Math.floor(map.height/2);
 for(let y=2;y<map.height-2;y++)for(let x=2;x<map.width-2;x++){
  if(!map.collision[y*map.width+x]||map.warps.some(w=>w.x===x&&w.y===y))continue;
  spots.push({x,y,d:Math.abs(cx-x)+Math.abs(cy-y)});
 }
 spots.sort((a,b)=>a.d-b.d);if(!spots.length)return;
 const {x:tx,y:ty}=spots[0],x=tx*SIZE,y=ty*SIZE;
 const light=kind==='snow'?'#f8fbec':kind==='terapagos'?'#e2ebf3':'#f2e2b6';
 if(kind==='home'||kind==='academy'){
  rect(g,p[3],x+2,y+5,12,9);rect(g,p[4],x+4,y+2,8,4);
  rect(g,light,x+7,y+8,3,5);
 }else if(kind==='fountain'){
  rect(g,'#527f9c',x+2,y+9,12,4);rect(g,'#bae4d9',x+7,y+3,2,8);
 }else if(kind==='lantern'||kind==='masks'){
  rect(g,'#773f63',x+7,y+2,2,12);
  rect(g,kind==='lantern'?'#ecc673':'#c95465',x+4,y+5,8,5);
  rect(g,light,x+6,y+6,3,2);
 }else if(kind==='orchard'||kind==='savanna'||kind==='coast'){
  rect(g,'#6b6a45',x+7,y+8,3,7);
  rect(g,p[1],x+2,y+2,12,8);
  rect(g,kind==='orchard'?'#cb5e4c':light,x+5,y+6,3,3);
 }else if(kind==='summit'||kind==='cliff'){
  rect(g,p[3],x+2,y+8,12,7);
  rect(g,light,x+6,y+4,4,7);
 }else if(kind==='dome'){
  rect(g,'#466585',x+2,y+9,12,5);
  rect(g,'#b9e3df',x+4,y+4,9,7);
  rect(g,'#ecdbac',x+8,y+7,2,4);
 }else if(kind==='snow'){
  rect(g,'#f8fafa',x+3,y+4,10,8);
  rect(g,'#8fbbd6',x+6,y+9,5,5);
 }else if(kind==='crystal'||kind==='terapagos'){
  rect(g,'#554983',x+4,y+11,8,4);
  rect(g,kind==='terapagos'?'#e7daec':'#b9e6e0',x+6,y+3,4,10);
  rect(g,'#7ccbd9',x+8,y+5,2,4);
 }else if(kind==='machine'){
  rect(g,'#545b73',x+3,y+4,11,11);
  rect(g,'#a4e4dc',x+5,y+6,7,5);
  rect(g,'#d8c8ef',x+8,y+7,3,2);
 }
}
function make(name){
 const map=window.WORLD_MAPS[name];
 const canvas=document.createElement('canvas');
 canvas.width=map.width*SIZE;canvas.height=map.height*SIZE;
 const g=canvas.getContext('2d',{alpha:false});
 const kind=style(name),p=PALETTES[kind],layout=map.paldeaLayout;
 const themed=layout?.accent||p[4];
 const seed=[...name].reduce((n,c)=>n+c.charCodeAt(0),0);
 for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
  const i=y*map.width+x,r=hash(x,y,seed),px=x*SIZE,py=y*SIZE;
  const wall=!!map.collision[i],water=map.behavior[i]===0x10;
  const floor=layout?.interior||(kind==='city'||kind==='blueberry'||kind==='chamber'||kind==='festival');
  const blockedAccent=layout?.interior?(layout.style==='arena'?'#d4cfb8':layout.style==='garage'?'#7a8591':themed):p[2];
  if(water){
   rect(g,kind==='polar'?'#78aec4':'#3f9eac',px,py,SIZE,SIZE);
   rect(g,'#bde9dd',px+(r%9),py+3+(r%8),5,1);
  }else if(wall){
   rect(g,blockedAccent,px,py,SIZE,SIZE);
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
   if(layout?.interior){
    // Designed room floors: central carpet/arena ring, permanent counters and
    // accent stripes. Player-visible geometry matches the walkable collision.
    const tx=layout.style==='arena'?'#d4cda7':layout.style==='lab'?'#8cb6bc':
     layout.style==='center'?'#ead7c1':layout.style==='club'?'#abc9d0':themed;
    rect(g,tx,px+1,py+1,14,14);
    rect(g,p[3],px,py+12,16,1);
    if(layout.style==='arena'&&(Math.abs(x-map.width/2)<5&&Math.abs(y-map.height/2)<5))
     rect(g,'#f3e4bf',px+5,py+5,6,6);
    if(layout.style==='lab'&&r%5===0)rect(g,'#d7faf0',px+3,py+3,5,3);
   }else if(layout&&!layout.interior){
    // Town-specific avenues and courtyards: road paving follows the custom
    // grid rather than the unrelated Kalos map's artwork.
    const street=Math.abs(x-Math.floor(map.width/2))<=1||
     Math.abs(y-Math.floor(map.height/2))<=1||x%8===0||y%8===0;
    if(street){
     rect(g,themed,px,py,16,16);
     rect(g,p[1],px+2,py+2,12,12);
     if(x%5===0)rect(g,p[4],px+7,py+6,2,3);
    }else if(r%3===0)rect(g,themed,px+3,py+10,8,2);
   }else if(floor){
    rect(g,p[1],px+2,py+2,12,12);
    rect(g,p[4],px,py+8,16,2);
    if(r%5===0)decoration(g,kind,px,py,r,p);
   }else if(r%4===0)decoration(g,kind,px,py,r,p);
   else if(r%3===0)rect(g,p[4],px+4,py+8,5,2);
  }
 }
 landmark(g,map,name,p);
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
 const map=window.WORLD_MAPS[name];
 let cv=cache.get(name);
 if(!cv){cv=make(name);cache.set(name,cv);}
 // Small rooms fit within less than the 240x192 viewport. The overworld
 // otherwise leaves pitch-black empty space outside the room's actual image.
 // Paint an ambient wall/background ONLY outside the traversable map bounds:
 // no extra walkable tiles, no collision changes, and no occluded NPCs.
 if(map.paldeaLayout?.interior&&g.canvas?.width&&typeof g.fillRect==='function'){
  const palette=PALETTES[style(name)],W=g.canvas.width,H=g.canvas.height;
  const left=Math.max(0,Math.min(W,Math.ceil(x)));
  const right=Math.max(0,Math.min(W,Math.floor(x+cv.width)));
  const top=Math.max(0,Math.min(H,Math.ceil(y)));
  const bottom=Math.max(0,Math.min(H,Math.floor(y+cv.height)));
  const fill=(xx,yy,w,h)=>{
   if(w<=0||h<=0)return;
   g.fillStyle=palette[2];g.fillRect(xx,yy,w,h);
   // A restrained horizontal trim gives the margin a deliberate room border.
   g.fillStyle=palette[3];
   for(let line=yy+15;line<yy+h;line+=32)g.fillRect(xx,line,w,1);
  };
  fill(0,0,W,top);
  fill(0,bottom,W,H-bottom);
  fill(0,top,left,bottom-top);
  fill(right,top,W-right,bottom-top);
 }
 g.drawImage(cv,x,y);
}
window.PaldeaArt={draw,style,PALETTES,LANDMARKS,clear:()=>cache.clear()};
})();
