// Collision-aware terrain finishing for the original 2D Alola, Galar and
// Paldea scenes. Visually joins tile boundaries rather than scattering an
// unrelated prop on every cell. Never changes map geometry or story objects.
(function(){
"use strict";
const T=16,cache=new Map();
const regions=new Set(["alola","galar","paldea"]);
const palettes={
 alola:{edge:"#284f45",rim:"#e8d79f",floor:"#f3e5b6",grass:"#4e9064",water:"#4d9aa5",spark:"#fff5cc"},
 galar:{edge:"#394e46",rim:"#c3c6a4",floor:"#e1d1ad",grass:"#588c57",water:"#4c96aa",spark:"#fff0c1"},
 paldea:{edge:"#4c5360",rim:"#cfbd9e",floor:"#ebd2a8",grass:"#6d9b72",water:"#5e9ab4",spark:"#e6f2dd"}
};
function regionOf(m){
 const r=m?.region;
 return regions.has(r)?r:null;
}
function hash(x,y,seed){
 let n=(Math.imul(x+101,374761393)+Math.imul(y+47,668265263)+Math.imul(seed+3,1442695041))>>>0;
 n=Math.imul(n^(n>>>13),1274126177)>>>0;
 return(n^(n>>>16))>>>0;
}
function make(m){
 const r=regionOf(m),p=palettes[r],c=document.createElement("canvas");
 c.width=m.width*T;c.height=m.height*T;
 const g=c.getContext("2d");
 const fill=(color,x,y,w,h,alpha=1)=>{
  g.globalAlpha=alpha;g.fillStyle=color;g.fillRect(x,y,w,h);
 };
 const occupied=new Set([...(m.people||[]),...(m.warps||[]),
  ...(m.signs||[]),...(m.triggers||[]),...(m.hidden||[])]
  .filter(a=>Number.isInteger(a.x)&&Number.isInteger(a.y))
  .map(a=>a.y*m.width+a.x));
 const inside=(x,y)=>x>=0&&y>=0&&x<m.width&&y<m.height;
 const solid=(x,y)=>!inside(x,y)||!!m.collision[y*m.width+x];
 const wet=(x,y)=>inside(x,y)&&m.behavior[y*m.width+x]===0x10;
 const grass=(x,y)=>inside(x,y)&&m.behavior[y*m.width+x]===2;
 const seed=[...m.name].reduce((n,ch)=>(Math.imul(n,31)+ch.charCodeAt(0))>>>0,29);
 let shores=0,edges=0;
 for(let y=1;y<m.height-1;y++)for(let x=1;x<m.width-1;x++){
  const i=y*m.width+x;
  if(occupied.has(i))continue;
  const px=x*T,py=y*T,rnd=hash(x,y,seed),wall=solid(x,y);
  const north=solid(x,y-1),south=solid(x,y+1),west=solid(x-1,y),east=solid(x+1,y);
  if(wall){
   // Connected blocking tiles get a common cap and side-shadows.
   // Singles remain visibly distinct instead of pretending to form a wall.
   if(!north){fill(p.rim,px+1,py+1,14,2,0.65);fill(p.edge,px+1,py+3,14,1,0.45);}
   if(!west)fill(p.edge,px+1,py+3,2,11,0.28);
   if(!east)fill(p.rim,px+13,py+4,1,10,0.26);
   if(!south)fill(p.edge,px+2,py+13,12,2,0.52);
   if((!north||!south||!east||!west))edges++;
   continue;
  }
  // Under a cliff/building canopy, highlight the boundary only; never
  // draw into a walkable corridor enough to resemble a collision wall.
  if(north){fill(p.edge,px+1,py,14,2,0.34);edges++;}
  if(west)fill(p.edge,px,py+2,1,12,0.20);
  if(east)fill(p.rim,px+15,py+2,1,12,0.18);
  if(south)fill(p.rim,px+2,py+15,12,1,0.30);
  if(wet(x,y)){
   // Continuous shore foam only where a neighboring tile is dry.
   if(!wet(x,y-1)){fill(p.spark,px+1,py+1,14,2,0.75);shores++;}
   if(!wet(x,y+1)){fill(p.spark,px+1,py+13,14,2,0.62);shores++;}
   if(!wet(x-1,y)){fill(p.spark,px+1,py+3,2,10,0.62);shores++;}
   if(!wet(x+1,y)){fill(p.spark,px+13,py+3,2,10,0.62);shores++;}
   if((rnd%5)===0){fill(p.water,px+5,py+7,5,1,0.52);}
  } else if(grass(x,y)){
   // Grass edges carry a little foliage where they meet bare ground.
   if(!grass(x,y-1)&&!north){fill(p.grass,px+2,py+3,3,4,0.55);fill(p.grass,px+10,py+4,2,3,0.45);}
   if(!grass(x,y+1)&&!south)fill(p.grass,px+5,py+12,6,2,0.36);
  } else if(!north&&!west&&!east&&!south&&rnd%19===0){
   // Sparse, restrained ground glints instead of noisy random rectangles.
   fill(p.floor,px+5,py+8,3,1,0.25);
   fill(p.rim,px+11,py+5,2,1,0.22);
  }
 }
 g.globalAlpha=1;
 return {canvas:c,shores,edges};
}
function draw(g,name,x,y){
 const m=window.WORLD_MAPS?.[name];
 if(!regionOf(m)||m.cityLayout||!m?.collision||!m?.behavior)return;
 let item=cache.get(name);
 if(!item){item=make(m);cache.set(name,item);}
 g.drawImage(item.canvas,x,y);
}
window.RegionTerrainDetail={draw,make,regionOf,palettes,clear:()=>cache.clear()};
})();
