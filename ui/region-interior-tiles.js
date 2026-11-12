// Hand-authored interior floor atlases (wood, stone, clinical and arena).
// The SVG tile sheets in assets/region-art/ replace flat placeholder floors
// without changing room geometry or covering doors / scripted object tiles.
(function () {
 "use strict";
 const T=16, ASSETS="assets/region-art/", sheets=new Map(), cache=new Map();
 const REGIONS=new Set(["galar","alola","paldea"]);
 function isInterior(m) {
  if(!m||!REGIONS.has(m.region))return false;
  return !!(m.galarCustomLayout?.interior ||
    m.alolaCustomLayout?.interior || m.paldeaLayout?.interior ||
    /Home|House|Center|Hotel|Shop|Lab|Academy|Stadium|Gym|Dojo|Tower|Lobby|Arena|Room|Hall|Station/.test(m.name));
 }
 function tileStyle(m) {
  const name=m.name;
  if(/Home|House|Hotel|Inn|Kitchen|Dojo|MasterDojo/.test(name))return 0; // wood
  if(/Center|Lab|Aether|Research|Academy|Observatory/.test(name))return 2; // clean tile
  if(/Arena|Gym|Stadium|Tower|Chamber|League/.test(name))return 3; // arena or stone
  return 1; // civic stone
 }
 function image(region) {
  if(!sheets.has(region)){
   const img=new Image();
   img.src=ASSETS+region+"-interiors.svg";
   sheets.set(region,img);
  }
  return sheets.get(region);
 }
 function make(m,img) {
  const c=document.createElement("canvas");
  c.width=m.width*T;c.height=m.height*T;
  const g=c.getContext("2d");
  const used=new Set([...(m.warps||[]),...(m.people||[]),
    ...(m.signs||[]),...(m.triggers||[]),...(m.hidden||[])]
    .filter(a=>Number.isInteger(a.x)&&Number.isInteger(a.y))
    .map(a=>a.y*m.width+a.x));
  const style=tileStyle(m);
  let painted=0;
  g.globalAlpha=0.83;
  for(let y=1;y<m.height-1;y++)for(let x=1;x<m.width-1;x++){
   const i=y*m.width+x;
   if(m.collision[i]||m.behavior?.[i]===0x10||used.has(i))continue;
   // Source image crop is precisely one authored 16×16 tile.
   g.drawImage(img,style*T,0,T,T,x*T,y*T,T,T);
   painted++;
  }
  g.globalAlpha=1;
  return {canvas:c,painted,style};
 }
 function draw(g,name,x,y) {
  const m=window.WORLD_MAPS?.[name];
  if(!isInterior(m))return;
  const sheet=image(m.region);
  if(!sheet.complete||!sheet.naturalWidth)return;
  let painted=cache.get(name);
  if(!painted){painted=make(m,sheet);cache.set(name,painted);}
  g.drawImage(painted.canvas,x,y);
 }
 function imageStatus(name) {
  const m=window.WORLD_MAPS?.[name];
  if(!isInterior(m))return null;
  const img=sheets.get(m.region);
  return {asset:m.region+"-interiors.svg",requested:!!img,
    ready:!!(img?.complete && img.naturalWidth)};
 }
 window.RegionInteriorTiles={draw,isInterior,tileStyle,make,imageStatus,
   clear:()=>cache.clear()};
})();