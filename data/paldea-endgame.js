// Paldea main-story finale: Victory Road, remaining Titans, Area Zero.
// All maps adapt existing 2D layouts, with Paldea-specific encounters and scripts.
(function(){
'use strict';
const D=window.PALDEA_DATA,source=window.KALOS_DATA?.maps;
if(!D?.starfall||!source)return;
const specs=[
 ['LevinciaRoad','Route3','East Province · Levincia Road','Artazon:3 Levincia:0'],
 ['Levincia','CamphrierTown','Levincia','LevinciaRoad:1 LevinciaGym:0 LevinciaCenter:0'],
 ['LevinciaGym','GymGallery','Levincia Gym','Levincia:1'],
 ['LevinciaCenter','SantaluneCenter','Levincia Pokémon Center','Levincia:2'],
 ['MedaliRoad','Route3','West Province · Medali Road','Cascarrafa:3 Medali:0'],
 ['Medali','CamphrierTown','Medali','MedaliRoad:1 MedaliGym:0 MedaliCenter:0'],
 ['MedaliGym','GymGallery','Medali Gym','Medali:1'],
 ['MedaliCenter','SantaluneCenter','Medali Pokémon Center','Medali:2'],
 ['MonteneveraRoad','Route3','North Province · Montenevera Road','RuchbahRoad:2 Montenevera:0'],
 ['Montenevera','CamphrierTown','Montenevera','MonteneveraRoad:1 MonteneveraGym:0 MonteneveraCenter:0'],
 ['MonteneveraGym','GymGallery','Montenevera Gym','Montenevera:1'],
 ['MonteneveraCenter','SantaluneCenter','Montenevera Pokémon Center','Montenevera:2'],
 ['AlfornadaRoad','Route3','South Province · Alfornada Road','WestProvince:4 Alfornada:0'],
 ['Alfornada','CamphrierTown','Alfornada','AlfornadaRoad:1 AlfornadaGym:0 AlfornadaCenter:0'],
 ['AlfornadaGym','GymGallery','Alfornada Gym','Alfornada:1'],
 ['AlfornadaCenter','SantaluneCenter','Alfornada Pokémon Center','Alfornada:2'],
 ['GlaseadoRoad','Route3','Glaseado Mountain Trail','CaphRoad:2 Glaseado:0'],
 ['Glaseado','CamphrierTown','Glaseado Mountain','GlaseadoRoad:1 GlaseadoGym:0 GlaseadoCenter:0'],
 ['GlaseadoGym','GymGallery','Glaseado Gym','Glaseado:1'],
 ['GlaseadoCenter','SantaluneCenter','Glaseado Pokémon Center','Glaseado:2'],
 ['LeagueRoad','Route3','Paldea Pokémon League Road','Mesagoza:4 LeagueGate:0'],
 ['LeagueGate','CamphrierTown','Paldea Pokémon League Gate','LeagueRoad:1 LeagueHall:0'],
 ['LeagueHall','GymGallery','Paldea Pokémon League Hall','LeagueGate:1'],
 ['SteelTrail','Route3','East Province · Lurking Steel Trail','EastProvince:5 SteelCave:0'],
 ['SteelCave','GlitteringCave','Lurking Steel · Titan Cave','SteelTrail:1'],
 ['EarthTrail','Route3','Asado Desert · Quaking Earth Trail','WestProvince:5 EarthDen:0'],
 ['EarthDen','Route2','Quaking Earth · Titan Den','EarthTrail:1'],
 ['DragonTrail','Route3','Casseroya Lake · False Dragon Trail','Cascarrafa:4 DragonLake:0'],
 ['DragonLake','Route2','False Dragon · Titan Nest','DragonTrail:1'],
 ['AreaZeroGate','Route3','Area Zero Gate','Academy:2 AreaZeroUpper:0'],
 ['AreaZeroUpper','Route3','Area Zero · Upper Crater','AreaZeroGate:1 ResearchOne:0'],
 ['ResearchOne','CamphrierTown','Area Zero · Research Station One','AreaZeroUpper:1 ResearchTwo:0'],
 ['ResearchTwo','CamphrierTown','Area Zero · Research Station Two','ResearchOne:1 AreaZeroDepths:0'],
 ['AreaZeroDepths','GlitteringCave','Area Zero · Crater Depths','ResearchTwo:1 ZeroLab:0'],
 ['ZeroLab','GymGallery','Area Zero · Zero Lab','AreaZeroDepths:1']
];
const free=(m,x,y)=>x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&
 !m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);
function nearest(m,x,y){
 const spots=[];for(let py=2;py<m.height-2;py++)for(let px=2;px<m.width-2;px++)
  if(free(m,px,py))spots.push({x:px,y:py,d:Math.abs(x-px)+Math.abs(y-py)});
 spots.sort((a,b)=>a.d-b.d);
 if(!spots.length)throw Error('No Paldea finale tile on '+m.name);return spots[0];
}
const added=[];
for(const [id,template,title,links] of specs){
 const sourceMap=source['Kalos'+template],targets=links.split(' ');
 if(!sourceMap||sourceMap.warps.length<targets.length)throw Error('Paldea finale template missing '+id);
 const m=JSON.parse(JSON.stringify(sourceMap));
 Object.assign(m,{name:'Paldea'+id,title,region:'paldea',paldeaCampaign:'scarlet-violet',
  image:'Kalos'+template,people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=targets.map((link,i)=>{const [to,w]=link.split(':');return {...sourceMap.warps[i],map:'Paldea'+to,warp:+w};});
 for(const key of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[key];
 D.maps[m.name]=m;D.mapNames.push(m.name);added.push(m.name);
}
function attach(from,to,expected,x,y){
 const m=D.maps['Paldea'+from];if(!m||m.warps.length!==expected)throw Error('Paldea finale connector '+from+' wanted '+expected);
 const at=nearest(m,x,y);m.warps.push({x:at.x,y:at.y,map:'Paldea'+to,warp:0});
}
for(const [from,to,index] of [
 ['Artazon','LevinciaRoad',3],['Cascarrafa','MedaliRoad',3],
 ['RuchbahRoad','MonteneveraRoad',2],['WestProvince','AlfornadaRoad',4],
 ['CaphRoad','GlaseadoRoad',2],['Mesagoza','LeagueRoad',4],
 ['EastProvince','SteelTrail',5],['WestProvince','EarthTrail',5],
 ['Cascarrafa','DragonTrail',4],['Academy','AreaZeroGate',2]
])attach(from,to,index,24,15);
function npc(id,key,x=17,y=14,sprite='bw2_105'){
 const m=D.maps['Paldea'+id],at=nearest(m,x,y);
 m.people.push({id:'paldea-finale-'+key,localId:'PALDEA_FINALE_'+key,x:at.x,y:at.y,
  script:'sv:'+key,sprite,width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
for(const [id,key,sprite] of [
 ['LevinciaGym','iono-gym','bw2_lass'],['MedaliGym','larry-gym','bw2_105'],
 ['MonteneveraGym','ryme-gym','bw2_lass'],['AlfornadaGym','tulip-gym','bw2_lass'],
 ['GlaseadoGym','grusha-gym','bw2_105'],
 ['LeagueGate','league-gate','bw2_105'],['LeagueHall','league-elite','bw2_105'],
 ['LeagueHall','league-nemona','bw2_lass'],
 ['SteelTrail','orthworm-titan','bw2_105'],['SteelCave','orthworm-herba','bw2_youngster'],
 ['EarthTrail','quaking-titan','bw2_105'],['EarthDen','quaking-herba','bw2_youngster'],
 ['DragonTrail','false-dragon-titan','bw2_105'],['DragonLake','false-dragon-herba','bw2_youngster'],
 ['AreaZeroGate','zero-gateway','bw2_105'],['AreaZeroUpper','zero-entrance','bw2_lass'],
 ['ResearchOne','zero-station-1','bw2_105'],['ResearchTwo','zero-station-2','bw2_lass'],
 ['AreaZeroDepths','zero-depths','bw2_youngster'],['ZeroLab','zero-lab','bw2_105']
])npc(id,key,17,14,sprite);
npc('Academy','arven-finale',26,14,'bw2_youngster');
for(const id of ['Levincia','Medali','Montenevera','Alfornada','Glaseado'])
 npc(id+'Center','heal',9,7,'bw2_147');
for(const [id,pool] of [
 ['LevinciaRoad',[['Wattrel',23,26],['Tadbulb',23,26],['Kilowattrel',25,28]]],
 ['MedaliRoad',[['Dudunsparce',32,35],['Komala',32,35],['Oinkologne',33,36]]],
 ['MonteneveraRoad',[['Greavard',39,43],['Mimikyu',40,44],['Houndstone',42,45]]],
 ['AlfornadaRoad',[['Espathra',42,46],['Farigiraf',42,46],['Florges',43,47]]],
 ['GlaseadoRoad',[['Cetitan',44,48],['Snom',44,48],['Frigibax',45,49]]],
 ['LeagueRoad',[['Glimmora',52,56],['Cyclizar',53,56]]],
 ['SteelTrail',[['Orthworm',28,31],['Varoom',28,31],['Rellor',28,31]]],
 ['EarthTrail',[['Great Tusk',39,43],['Iron Treads',39,43],['Nacli',38,42]]],
 ['DragonTrail',[['Tatsugiri',52,55],['Dondozo',52,55],['Veluza',52,55]]],
 ['AreaZeroUpper',[['Scream Tail',55,59],['Iron Bundle',55,59],['Glimmora',55,59]]],
 ['AreaZeroDepths',[['Roaring Moon',58,62],['Iron Valiant',58,62],['Glimmora',58,62]]]
]){
 const m=D.maps['Paldea'+id],unit=Math.floor(100/pool.length);
 m.wild={rate:24,weights:pool.map((_,i)=>i===pool.length-1?100-i*unit:unit),
  slots:pool.map(([species,min,max])=>({species,min,max}))};
 for(let y=5;y<Math.min(m.height-4,16);y++)for(let x=5;x<Math.min(m.width-4,12);x++)
  if(free(m,x,y))m.behavior[y*m.width+x]=2;
}
D.endgame={mapNames:added,gyms:['Iono','Larry','Ryme','Tulip','Grusha'],
 titans:['Orthworm','Quaking Earth','False Dragon'],
 centers:['LevinciaCenter','MedaliCenter','MonteneveraCenter','AlfornadaCenter','GlaseadoCenter'].map(s=>'Paldea'+s)};
})();
