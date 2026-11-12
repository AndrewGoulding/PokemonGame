// Starfall Street: the Segin (Dark) and Schedar (Fire) Team Star bases.
// Uses the project's 2D Kalos geometry while adding Paldea-specific maps.
(function(){
'use strict';
const D=window.PALDEA_DATA,source=window.KALOS_DATA?.maps;
if(!D?.legends||!source)return;
const specs=[
 ['SeginRoad','Route3','South Province · Segin Squad Road','SouthProvince:3 SeginBase:0'],
 ['SeginBase','CamphrierTown','Team Star · Segin Squad Base','SeginRoad:1 SeginGarage:0'],
 ['SeginGarage','AquacordeRestHouse','Segin Squad · Starmobile Garage','SeginBase:1'],
 ['SchedarRoad','Route3','East Province · Schedar Squad Road','EastProvince:3 SchedarBase:0'],
 ['SchedarBase','CamphrierTown','Team Star · Schedar Squad Base','SchedarRoad:1 SchedarGarage:0'],
 ['SchedarGarage','AquacordeRestHouse','Schedar Squad · Starmobile Garage','SchedarBase:1']
];
const free=(m,x,y)=>x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&
 !m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);
function nearest(m,x,y){
 const candidates=[];for(let yy=2;yy<m.height-2;yy++)for(let xx=2;xx<m.width-2;xx++)
  if(free(m,xx,yy))candidates.push({x:xx,y:yy,d:Math.abs(x-xx)+Math.abs(y-yy)});
 candidates.sort((a,b)=>a.d-b.d);
 if(!candidates.length)throw Error('No safe Team Star tile '+m.name);
 return candidates[0];
}
const names=[];
for(const [id,template,title,links] of specs){
 const base=source['Kalos'+template],targets=links.split(' ');
 if(!base||base.warps.length<targets.length)throw Error('Missing Starfall Street template exits '+id);
 const m=JSON.parse(JSON.stringify(base));
 Object.assign(m,{name:'Paldea'+id,title,region:'paldea',paldeaCampaign:'scarlet-violet',
  image:'Kalos'+template,people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=targets.map((link,i)=>{const[to,warp]=link.split(':');return {...base.warps[i],map:'Paldea'+to,warp:+warp};});
 for(const key of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[key];
 D.maps[m.name]=m;D.mapNames.push(m.name);names.push(m.name);
}
function attach(from,to,index,x,y){
 const m=D.maps['Paldea'+from];
 if(!m||m.warps.length!==index)throw Error('Unexpected Starfall connection '+from);
 const at=nearest(m,x,y);
 m.warps.push({x:at.x,y:at.y,map:'Paldea'+to,warp:0});
}
attach('SouthProvince','SeginRoad',3,26,16);
attach('EastProvince','SchedarRoad',3,26,16);
function npc(id,key,x,y,sprite='bw2_youngster'){
 const m=D.maps['Paldea'+id],at=nearest(m,x,y);
 m.people.push({id:'paldea-star-'+key,localId:'PALDEA_STAR_'+key,x:at.x,y:at.y,
  script:'sv:'+key,sprite,width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
[
 ['SeginRoad','cassiopeia-segin',18,13,'bw2_lass'],
 ['SeginBase','segiu-guard',15,13,'bw2_youngster'],
 ['SeginBase','segiu-challenge',22,14,'bw2_105'],
 ['SeginGarage','giacomo-boss',15,12,'bw2_105'],
 ['SchedarRoad','cassiopeia-schedar',18,13,'bw2_lass'],
 ['SchedarBase','schedar-guard',15,13,'bw2_youngster'],
 ['SchedarBase','schedar-challenge',22,14,'bw2_105'],
 ['SchedarGarage','mela-boss',15,12,'bw2_lass']
].forEach(args=>npc(...args));
for(const [id,pool] of [
 ['SeginRoad',[['Maschiff',18,21],['Murkrow',18,21],['Pawniard',19,22]]],
 ['SchedarRoad',[['Charcadet',24,27],['Houndour',24,27],['Varoom',25,28]]]
]){
 const m=D.maps['Paldea'+id],unit=Math.floor(100/pool.length);
 m.wild={rate:24,weights:pool.map((_,i)=>i===pool.length-1?100-i*unit:unit),
  slots:pool.map(([species,min,max])=>({species,min,max}))};
 for(let y=5;y<Math.min(m.height-4,16);y++)for(let x=5;x<Math.min(m.width-4,12);x++)
  if(free(m,x,y))m.behavior[y*m.width+x]=2;
}
D.starfall={mapNames:names,crews:['Segin','Schedar']};
})();