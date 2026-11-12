// Paldea opening region map and visited-only Fly destinations.
(function(){
'use strict';
const D=window.PALDEA_DATA,T=window.TOWN_MAP;if(!D||!T)return;
const width=22,height=15,map=Array.from({length:height},()=>Array(width).fill(null));
const dungeon=Array.from({length:height},()=>Array(width).fill(null));
const at={},mapSections={},names={},towns=[],fly={};
const groups=[
 ['CaboPoco',8,12,['CaboPoco','Home']],
 ['PocoPath',9,11,['PocoPath','InletGrotto']],
 ['Lighthouse',10,10,['Lighthouse']],
 ['LosPlatos',11,9,['LosPlatos','LosPlatosCenter']],
 ['SouthProvince',12,8,['SouthProvince']],
 ['Mesagoza',13,6,['Mesagoza','Academy','MesagozaCenter']],
 ['Cortondo',10,6,['Cortondo','CortondoGym']],
 ['EastProvince',15,8,['EastProvince']],
 ['Artazon',17,7,['Artazon','ArtazonCenter','ArtazonGym']],
 ['WestProvince',8,7,['WestProvince']],
 ['Cascarrafa',6,6,['Cascarrafa','CascarrafaCenter','CascarrafaGym']],
 ['StonyCliff',17,9,['StonyCliff','StonyCave']],
 ['OpenSkyTrail',5,8,['OpenSkyTrail','OpenSkySummit']],
 ['SeginRoad',12,10,['SeginRoad','SeginBase','SeginGarage']],
 ['SchedarRoad',16,10,['SchedarRoad','SchedarBase','SchedarGarage']],
 ['NaviRoad',16,5,['NaviRoad','NaviBase','NaviGarage']],
 ['RuchbahRoad',4,5,['RuchbahRoad','RuchbahBase','RuchbahGarage']],
 ['CaphRoad',20,4,['CaphRoad','CaphBase','CaphGarage']],
 ['AcademyCourtyard',13,5,['AcademyCourtyard']]
];
for(const [id,x,y,aliases] of groups){
 const sec='PALDEA_'+id.replace(/([a-z])([A-Z])/g,'$1_$2').toUpperCase();
 const name='Paldea'+id,m=D.maps[name];if(!m)throw Error('Paldea map missing '+name);
 map[y][x]=sec;names[sec]=m.title;
 for(const alias of aliases){const key='Paldea'+alias;if(!D.maps[key])throw Error('Paldea map missing '+key);at[key]=[x,y];mapSections[key]=sec;}
 if(['CaboPoco','LosPlatos','Mesagoza','Cortondo','Artazon','Cascarrafa'].includes(id))towns.push(sec);
}
for(const name of D.mapNames)if(!at[name])throw Error('Paldea Town Map missing '+name);
function landing(name){
 const m=D.maps[name],choices=[];
 for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++){
  if(m.collision[y*m.width+x]||m.warps.some(w=>w.x===x&&w.y===y)||m.people.some(p=>p.x===x&&p.y===y))continue;
  choices.push({x,y,d:Math.abs(x-m.width/2)+Math.abs(y-m.height/2)});
 }
 choices.sort((a,b)=>a.d-b.d);if(!choices.length)throw Error('No Paldea Fly tile '+name);
 return{map:name,x:choices[0].x,y:choices[0].y};
}
for(const id of ['CaboPoco','LosPlatos','Mesagoza','Cortondo','Artazon','Cascarrafa'])fly[mapSections['Paldea'+id]]=landing('Paldea'+id);
const R={id:'PALDEA',label:'Paldea',image:'assets/town-map/paldea.svg',x0:32,y0:16,
 width,height,map,dungeon,at,mapSections,names,towns,fly};
T.paldea=R;Object.assign(T.mapSections,mapSections);Object.assign(T.names,names);Object.assign(T.fly,fly);
D.townMap=R;
})();