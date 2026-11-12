// Original Paldea 2D town and interior geometry. These layouts replace
// borrowed Kalos collision tiles on important locations while preserving
// every scripted warp, NPC, saved respawn and Fly destination.
// Avoids modifying the source Kalos maps and the other game regions.
(function(){
'use strict';
const D=window.PALDEA_DATA;
if(!D?.maps||!window.Paldea)return;
const PLANS={
 PaldeaCaboPoco:['hamlet','#d39e70'],
 PaldeaLosPlatos:['hamlet','#cda478'],
 PaldeaMesagoza:['capital','#ba8e9a'],
 PaldeaCortondo:['hamlet','#d2a86c'],
 PaldeaArtazon:['garden','#97a86d'],
 PaldeaCascarrafa:['canal','#b0c8bd'],
 PaldeaLevincia:['capital','#7da3b9'],
 PaldeaMedali:['market','#bda17c'],
 PaldeaMontenevera:['mountain','#8aa4b8'],
 PaldeaAlfornada:['garden','#c4a4af'],
 PaldeaGlaseado:['mountain','#acc7cc'],
 PaldeaMossuiTown:['hamlet','#9dab80'],
 PaldeaLoyaltyPlaza:['festival','#bc7a84'],
 PaldeaDreadedDen:['shrine','#8d9180'],
 PaldeaTerariumHub:['dome','#8bb1c2'],
 PaldeaLeagueClub:['club','#668ca9'],
 PaldeaCommunityCenter:['center','#c3b18f'],
 PaldeaHome:['home','#d7b2a0'],
 PaldeaAcademy:['academy','#caaa82'],
 PaldeaLeagueHall:['arena','#7198a0'],
 PaldeaZeroLab:['lab','#7ca3bf'],
 PaldeaTerapagosChamber:['shrine','#a6b0d5'],
 PaldeaResearchOne:['lab','#7ca4bb'],
 PaldeaResearchTwo:['lab','#7ca4bb'],
 PaldeaMossuiTown:['hamlet','#9dab80'],
 PaldeaSavannaTrial:['arena','#c2ad7e'],
 PaldeaCoastalTrial:['arena','#88c6bd'],
 PaldeaCanyonTrial:['arena','#c99b86'],
 PaldeaPolarTrial:['arena','#afc8d7'],
 PaldeaKieranArena:['arena','#759fb9'],
 PaldeaLevinciaCenter:['center','#b5cacc'],
 PaldeaMedaliCenter:['center','#c7b5a4'],
 PaldeaMonteneveraCenter:['center','#b8cbd7'],
 PaldeaAlfornadaCenter:['center','#d1b7c5'],
 PaldeaGlaseadoCenter:['center','#b8d4de'],
 PaldeaLosPlatosCenter:['center','#d5bb9c'],
 PaldeaMesagozaCenter:['center','#d2b8b4'],
 PaldeaArtazonCenter:['center','#bacaac'],
 PaldeaCascarrafaCenter:['center','#b6d0c7'],
 PaldeaCortondoGym:['arena','#bfa774'],
 PaldeaArtazonGym:['arena','#a1bc88'],
 PaldeaCascarrafaGym:['arena','#90c1c9'],
 PaldeaLevinciaGym:['arena','#83bace'],
 PaldeaMedaliGym:['arena','#d4ad88'],
 PaldeaMonteneveraGym:['arena','#9d9aba'],
 PaldeaAlfornadaGym:['arena','#c3a5bb'],
 PaldeaGlaseadoGym:['arena','#adcad7'],
 PaldeaLeagueGate:['hall','#8190ae'],
 PaldeaAcademyCourtyard:['festival','#bda3be'],
 PaldeaSeginGarage:['garage','#88769e'],
 PaldeaSchedarGarage:['garage','#c57b69'],
 PaldeaNaviGarage:['garage','#8b9c98'],
 PaldeaRuchbahGarage:['garage','#baa4c0'],
 PaldeaCaphGarage:['garage','#bc8b74']
};
// Unlisted routes and DLC areas also need independent geometry; the explicitly
// planned towns above retain their hand-picked styles and palette accents.
const inferPlan=name=>{
 if(!/^Paldea/.test(name))return null;
 if(/Center|House|Home|Academy|Shop|Lab|Garage|Hall|Club|Chamber|Room|Station|Gate|Gym|Dojo|Trial|Arena|Den|Office/.test(name))return ['hall','#a7b8c0'];
 if(/Sea|Beach|Coast|Lake|River|Water|Cascarrafa/.test(name))return ['coast','#87b5c1'];
 if(/Snow|Ice|Polar|Glaseado/.test(name))return ['snow','#b7d5db'];
 if(/Cave|Tunnel|Depth|Zero|Crater|Underdepth|AreaZero/.test(name))return ['crystal','#98b3c9'];
 if(/Oni|Mountain|Cliff|Rock|Canyon|Earth/.test(name))return ['mountain','#b59b8c'];
 if(/Forest|Woods|Apple|Grove|Bamboo|Jungle/.test(name))return ['forest','#8faf7c'];
 if(/Savanna|Desert|Dunes/.test(name))return ['savanna','#cbb683'];
 if(/City|Town|Village|Market|Plaza/.test(name))return ['hamlet','#c5af90'];
 return ['route','#a9bf90'];
};
const hash=(x,y,seed)=>{
 let n=(Math.imul(x+23,374761393)+Math.imul(y+31,668265263)+Math.imul(seed,1442695041))>>>0;
 return (n^(n>>>16))>>>0;
};
function layout(name){
 const m=D.maps[name],plan=PLANS[name]||inferPlan(name);if(!m||!plan)return false;
 const [kind,accent]=plan,w=m.width,h=m.height,n=w*h;
 const collision=Array(n).fill(0),behavior=Array(n).fill(0),elevation=Array(n).fill(0);
 const previousBehavior=m.behavior.slice();
 const seeds=[...name].reduce((a,c)=>(Math.imul(a,31)+c.charCodeAt(0))>>>0,47);
 const indoor=/^(center|home|academy|arena|hall|lab|garage|club|dome|shrine)$/.test(kind);
 const natural=/^(coast|snow|crystal|mountain|forest|savanna|route)$/.test(kind);
 const entrance=kind==='arena'||kind==='hall'?3:2;
 const cx=Math.floor(w/2),cy=Math.floor(h/2);
 const edge=(x,y)=>x<1||y<1||x>=w-1||y>=h-1;
 // Original geometric grid: a central square, perimeter blocks, and
 // rectangular shop/furniture islands. Seed is deterministic per location.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,r=hash(Math.floor(x/3),Math.floor(y/3),seeds)%100;
  let solid=edge(x,y);
  if(!solid){
   if(indoor){
    const desk=y<Math.max(3,Math.floor(h/3)) && Math.abs(x-cx)>entrance && r<55;
    const shelves=(x%9>=5&&x%9<=7&&y%8>=3&&y%8<=5)&&r<75;
    solid=desk||shelves;
   }else{
    const block=Math.floor(x/6)%2===Math.floor(y/6)%2;
    const square=Math.abs(x-cx)<=3&&Math.abs(y-cy)<=3;
    const avenue=(Math.abs(x-cx)<=1 || Math.abs(y-cy)<=1 || x%8===0 || y%8===0);
    solid=natural ? !square&&!avenue&&r<(kind==='forest'?67:kind==='mountain'?65:kind==='crystal'?63:kind==='snow'?48:kind==='coast'?31:49) :
      !square&&!avenue&&block&&r<(kind==='capital'?72:kind==='canal'?57:64);
    if(kind==='garden'&&r<14)solid=true;
   }
  }
  collision[i]=solid?1:0;
  if(!solid&&!indoor&&m.wild&&(previousBehavior[i]===2||r%19===0))behavior[i]=2;
 }
 const open=(x,y,r=0)=>{
  for(let yy=Math.max(0,y-r);yy<=Math.min(h-1,y+r);yy++)
   for(let xx=Math.max(0,x-r);xx<=Math.min(w-1,x+r);xx++){
    collision[yy*w+xx]=0;behavior[yy*w+xx]=0;
   }
 };
 // Keep a traversable spine, plaza and doors. Every story landmark, NPC,
 // warp and historical Fly/Center tile is connected to that spine.
 for(let x=1;x<w-1;x++)open(x,cy,1);
 for(let y=1;y<h-1;y++)open(cx,y,1);
 open(cx,cy,3);
 const anchors=[
  ...m.warps.map(a=>({...a,warp:true})),
  ...(m.people||[]), ...(m.signs||[]), ...(m.triggers||[]), ...(m.hidden||[]),
  ...Object.values(window.TOWN_MAP?.paldea?.fly||{}).filter(a=>a.map===name),
  ...Object.values(window.Player?.CENTERS||{}).filter(a=>a.map===name),
  ...(D.start?.map===name?[D.start]:[])
 ];
 for(const a of anchors){
  if(!Number.isInteger(a.x)||!Number.isInteger(a.y))continue;
  const x=Math.max(0,Math.min(w-1,a.x)),y=Math.max(0,Math.min(h-1,a.y));
  open(x,y,1);
  for(let xx=Math.min(x,cx);xx<=Math.max(x,cx);xx++)open(xx,y,1);
  for(let yy=Math.min(y,cy);yy<=Math.max(y,cy);yy++)open(cx,yy,1);
 }
 // Original warps sometimes encode special movement behavior; keep that
 // exact source behavior while protecting the destination tile itself.
 for(const a of m.warps){
  const i=a.y*w+a.x;
  if(i>=0&&i<n){collision[i]=0;behavior[i]=m.behavior[i]||0;}
 }
 // The replaced Kalos terrain had unrelated elevation levels. Reset height
 // on these original 2D plans or World.step may reject an otherwise clear
 // corridor, making visible routes and nearby NPCs unexpectedly unreachable.
 m.collision=collision;m.behavior=behavior;m.elevation=elevation;
 m.paldeaLayout={style:kind,accent,seed:seeds,anchors:anchors.length,
  interior:indoor,independent:true};
 return true;
}
let count=0;
for(const name of Object.keys(D.maps))if(layout(name))count++;
window.PaldeaLayouts={plans:PLANS,inferPlan,layout,count};
})();
