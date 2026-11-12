// Paldea Path of Legends: first two Titans, retaining 2D placeholder geometry.
(function(){
'use strict';
const D=window.PALDEA_DATA,source=window.KALOS_DATA?.maps;
if(!D||!D.midgame||!source)return;
const specs=[
 ['StonyCliff','Route3','South Province · Stony Cliff','EastProvince:2 StonyCave:0'],
 ['StonyCave','GlitteringCave','Stony Cliff · Herba Mystica Cave','StonyCliff:1'],
 ['OpenSkyTrail','Route3','West Province · Open Sky Trail','WestProvince:2 OpenSkySummit:0'],
 ['OpenSkySummit','Route2','Open Sky · Titan Nest','OpenSkyTrail:1']
];
const free=(m,x,y)=>x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&
 !m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);
function nearest(m,x,y){
 const spots=[];for(let yy=2;yy<m.height-2;yy++)for(let xx=2;xx<m.width-2;xx++)
  if(free(m,xx,yy))spots.push({x:xx,y:yy,d:Math.abs(xx-x)+Math.abs(yy-y)});
 spots.sort((a,b)=>a.d-b.d);
 if(!spots.length)throw Error('No safe Path of Legends position: '+m.name);
 return spots[0];
}
const added=[];
for(const [id,template,title,links] of specs){
 const base=source['Kalos'+template],targets=links.split(' ');
 if(!base||base.warps.length<targets.length)throw Error('Missing Titan template exits '+id);
 const m=JSON.parse(JSON.stringify(base));
 Object.assign(m,{name:'Paldea'+id,title,region:'paldea',paldeaCampaign:'scarlet-violet',
  image:'Kalos'+template,people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=targets.map((link,i)=>{const [to,slot]=link.split(':');return {...base.warps[i],map:'Paldea'+to,warp:+slot};});
 for(const key of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[key];
 D.maps[m.name]=m;D.mapNames.push(m.name);added.push(m.name);
}
function attach(from,to,slot,x,y){
 const m=D.maps['Paldea'+from],dest=D.maps['Paldea'+to];
 if(!m||!dest||m.warps.length!==slot)throw Error('Unexpected Titan connector '+from);
 const at=nearest(m,x,y);
 m.warps.push({x:at.x,y:at.y,map:dest.name,warp:0});
}
attach('EastProvince','StonyCliff',2,25,15);
attach('WestProvince','OpenSkyTrail',2,25,15);
function npc(id,key,x,y,sprite='bw2_youngster'){
 const m=D.maps['Paldea'+id],at=nearest(m,x,y);
 m.people.push({id:'paldea-legend-'+key,localId:'PALDEA_LEGEND_'+key,x:at.x,y:at.y,
  script:'sv:'+key,sprite,width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
npc('StonyCliff','klawf-titan',18,13,'bw2_105');
npc('StonyCave','klawf-herba',14,12,'bw2_youngster');
npc('OpenSkyTrail','arven-open-sky',17,13,'bw2_youngster');
npc('OpenSkySummit','bombirdier-titan',18,13,'bw2_105');
for(const [id,pool] of [
 ['StonyCliff',[['Nacli',15,18],['Klawf',15,18],['Rolycoly',16,19]]],
 ['OpenSkyTrail',[['Nacli',18,22],['Maschiff',18,22],['Wattrel',18,22]]]
]){
 const m=D.maps['Paldea'+id],unit=Math.floor(100/pool.length);
 m.wild={rate:24,weights:pool.map((_,i)=>i===pool.length-1?100-i*unit:unit),
  slots:pool.map(([species,min,max])=>({species,min,max}))};
 for(let y=5;y<Math.min(m.height-4,16);y++)for(let x=5;x<Math.min(m.width-4,12);x++)
  if(free(m,x,y))m.behavior[y*m.width+x]=2;
}
D.legends={mapNames:added,titans:['Klawf','Bombirdier']};
})();
