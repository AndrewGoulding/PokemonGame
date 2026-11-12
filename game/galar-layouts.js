// Galar's own navigable tile geometry, independent of borrowed Kalos collisions.
// Warp endpoints, NPCs, Fly spots and old save locations are protected.
(function(){
'use strict';
const D=window.GALAR_DATA;if(!D?.mapNames)return;
const hash=(x,y,seed)=>{let n=(x*374761393+y*668265263+seed*1442695041)>>>0;n=Math.imul(n^(n>>>13),1274126177)>>>0;return(n^(n>>>16))>>>0;};
const style=name=>{
 if(/Stadium|Gym|Tower|Dojo|Lair|Shrine|Arena/.test(name))return'hall';
 if(/Forest|Weald|Glimwood|Wetlands/.test(name))return'forest';
 if(/Mine|Cave|Tunnel|EnergyPlant/.test(name))return'cave';
 if(/City|Town|Village|Wedgehurst|Postwick|Hammerlocke|Hulbury|Turffield|Circhester|Ballonlea|Spikemuth|Wyndon|Station|Center|House|Hotel/.test(name))return'town';
 if(/Sea|Beach|Coast|Lake|Honeycalm/.test(name))return'coast';
 if(/Frost|Snow|Crown|Freezington/.test(name))return'snow';
 return'route';
};
function build(name){
 const m=D.maps[name],w=m.width,h=m.height,kind=style(name);
 const seed=[...name].reduce((n,c)=>n*17+c.charCodeAt(0),31)>>>0;
 const old=m.behavior.slice(),solid=Array(w*h).fill(0),behavior=Array(w*h).fill(0);
 const density={hall:20,forest:37,cave:33,town:22,coast:19,snow:29,route:27}[kind];
 const isIndoor=/Center|House|Stadium|Gym|Tower|Dojo|Kitchen|Lab|Hotel|Arena|Lair/.test(name);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=y*w+x,v=hash(x,y,seed)%100;
  solid[k]=(x===0||y===0||x===w-1||y===h-1||v<density)?1:0;
  behavior[k]=!solid[k]&&!isIndoor&&v%9<2?2:0;
 }
 const clear=(x,y,r=0)=>{
  for(let yy=Math.max(0,y-r);yy<=Math.min(h-1,y+r);yy++)for(let xx=Math.max(0,x-r);xx<=Math.min(w-1,x+r);xx++){
   solid[yy*w+xx]=0;behavior[yy*w+xx]=0;
  }
 };
 const cx=Math.floor(w/2),cy=Math.floor(h/2);
 clear(cx,cy,2);
 const anchors=[
  ...m.warps.map(v=>({x:v.x,y:v.y,warp:true})),
  ...m.people.map(v=>({x:v.x,y:v.y})),
  ...Object.values(window.TOWN_MAP?.galar?.fly||{}).filter(v=>v.map===name),
  ...Object.values(window.Player?.CENTERS||{}).filter(v=>v.map===name),
  ...(D.start?.map===name?[D.start]:[]),
  ...(D.dlc?[D.dlc.armorStart,D.dlc.armorReturn,D.dlc.crownStart,D.dlc.crownReturn].filter(v=>v?.map===name):[])
 ];
 for(const a of anchors){
  const tx=Math.max(0,Math.min(w-1,a.x)),ty=Math.max(0,Math.min(h-1,a.y));
  clear(tx,ty,1);
  // Broad, continuous walkable lanes from every event to the map's center.
  const stepX=tx<cx?1:-1,stepY=ty<cy?1:-1;
  for(let x=tx;x!==cx;x+=stepX)clear(x,ty,1);
  for(let y=ty;y!==cy;y+=stepY)clear(cx,y,1);
  if(a.warp)behavior[ty*w+tx]=old[ty*w+tx]||0;
 }
 // Clear rings around the route's central hub so moving NPCs cannot softlock access.
 for(let x=2;x<w-2;x++)clear(x,cy,0);
 for(let y=2;y<h-2;y++)clear(cx,y,0);
 m.collision=solid;m.behavior=behavior;
 m.galarCustomLayout={style:kind,seed,connectedAnchors:anchors.length};
}
for(const name of D.mapNames)build(name);
window.GalarLayouts={style,hash,rebuild:build};
})();
