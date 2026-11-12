// Starfall Street continuation: Navi, Ruchbah, Caph and the Academy courtyard.
// Scarlet/Violet locations adapted to the shared 2D overworld.
(function(){
'use strict';
const D=window.PALDEA_DATA,source=window.KALOS_DATA?.maps;if(!D?.starfall||!source)return;
const specs=[
 ['NaviRoad','Route3','Tagtree Thicket · Navi Road','SchedarRoad:2 NaviBase:0'],
 ['NaviBase','CamphrierTown','Team Star · Navi Squad Base','NaviRoad:1 NaviGarage:0'],
 ['NaviGarage','AquacordeRestHouse','Navi Squad · Starmobile Garage','NaviBase:1'],
 ['RuchbahRoad','Route3','North Province · Ruchbah Road','WestProvince:3 RuchbahBase:0'],
 ['RuchbahBase','CamphrierTown','Team Star · Ruchbah Squad Base','RuchbahRoad:1 RuchbahGarage:0'],
 ['RuchbahGarage','AquacordeRestHouse','Ruchbah Squad · Starmobile Garage','RuchbahBase:1'],
 ['CaphRoad','Route3','North Province · Caph Road','EastProvince:4 CaphBase:0'],
 ['CaphBase','CamphrierTown','Team Star · Caph Squad Base','CaphRoad:1 CaphGarage:0'],
 ['CaphGarage','AquacordeRestHouse','Caph Squad · Starmobile Garage','CaphBase:1'],
 ['AcademyCourtyard','AquacordeRestHouse','Academy · Nighttime Courtyard','Academy:1']
];
const free=(m,x,y)=>x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&
 !m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);
function nearest(m,x,y){
 const spots=[];for(let py=2;py<m.height-2;py++)for(let px=2;px<m.width-2;px++)
  if(free(m,px,py))spots.push({x:px,y:py,d:Math.abs(x-px)+Math.abs(y-py)});
 spots.sort((a,b)=>a.d-b.d);
 if(!spots.length)throw Error('Starfall extension has no free tile on '+m.name);
 return spots[0];
}
const names=[];
for(const [id,template,title,links] of specs){
 const base=source['Kalos'+template],targets=links.split(' ');
 if(!base||base.warps.length<targets.length)throw Error('Missing Starfall expansion template: '+id);
 const m=JSON.parse(JSON.stringify(base));
 Object.assign(m,{name:'Paldea'+id,title,region:'paldea',paldeaCampaign:'scarlet-violet',image:'Kalos'+template,
  people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=targets.map((link,i)=>{const [to,warp]=link.split(':');return {...base.warps[i],map:'Paldea'+to,warp:+warp};});
 for(const key of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[key];
 D.maps[m.name]=m;D.mapNames.push(m.name);names.push(m.name);
}
function attach(from,to,index,x,y){
 const m=D.maps['Paldea'+from];
 if(!m||m.warps.length!==index)throw Error('Unexpected Starfall branch connector '+from);
 const at=nearest(m,x,y);
 m.warps.push({x:at.x,y:at.y,map:'Paldea'+to,warp:0});
}
attach('SchedarRoad','NaviRoad',2,26,16);
attach('WestProvince','RuchbahRoad',3,26,16);
attach('EastProvince','CaphRoad',4,27,15);
attach('Academy','AcademyCourtyard',1,17,13);
function npc(id,key,x,y,sprite='bw2_youngster'){
 const m=D.maps['Paldea'+id],at=nearest(m,x,y);
 m.people.push({id:'paldea-star-next-'+key,localId:'PALDEA_STAR_NEXT_'+key,x:at.x,y:at.y,
  script:'sv:'+key,sprite,width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
for(const [crew,road,base,garage,boss] of [
 ['navi','NaviRoad','NaviBase','NaviGarage','atticus'],
 ['ruchbah','RuchbahRoad','RuchbahBase','RuchbahGarage','ortega'],
 ['caph','CaphRoad','CaphBase','CaphGarage','eri']
]){
 npc(road,'cassiopeia-'+crew,18,13,'bw2_lass');
 npc(base,crew+'-guard',15,13);
 npc(base,crew+'-challenge',22,14,'bw2_105');
 npc(garage,boss+'-boss',15,12,crew==='caph'?'bw2_lass':'bw2_105');
}
npc('AcademyCourtyard','clive-finale',13,10,'bw2_105');
npc('AcademyCourtyard','cassiopeia-finale',19,12,'bw2_lass');
for(const [id,pool] of [
 ['NaviRoad',[['Shroodle',31,34],['Grafaiai',32,35],['Stunky',31,34]]],
 ['RuchbahRoad',[['Fidough',43,46],['Tinkatuff',44,47],['Florges',44,47]]],
 ['CaphRoad',[['Pawniard',53,55],['Lucario',53,55],['Annihilape',54,56]]]
]){
 const m=D.maps['Paldea'+id],unit=Math.floor(100/pool.length);
 m.wild={rate:24,weights:pool.map((_,i)=>i===pool.length-1?100-i*unit:unit),
  slots:pool.map(([species,min,max])=>({species,min,max}))};
 for(let y=5;y<Math.min(m.height-4,16);y++)for(let x=5;x<Math.min(m.width-4,12);x++)
  if(free(m,x,y))m.behavior[y*m.width+x]=2;
}
D.starfall.mapNames.push(...names);
D.starfall.crews.push('Navi','Ruchbah','Caph');
D.starfall.finale='PaldeaAcademyCourtyard';
})();