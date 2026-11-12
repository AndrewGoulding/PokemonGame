// Hidden Treasure of Area Zero DLC: Kitakami and Blueberry Academy.
// Shared 2D Paldea save and existing map collision/encounter primitives.
(function(){
'use strict';
const D=window.PALDEA_DATA,source=window.KALOS_DATA?.maps;
if(!D?.endgame||!source)return;
const specs=[
 ['KitakamiBus','Route3','Kitakami · School Trip Arrival','Academy:3 MossuiTown:0'],
 ['MossuiTown','CamphrierTown','Kitakami · Mossui Town','KitakamiBus:1 CommunityCenter:0 AppleHills:0 OniMountain:0'],
 ['CommunityCenter','AquacordeRestHouse','Kitakami Community Center','MossuiTown:1'],
 ['AppleHills','Route3','Kitakami · Apple Hills','MossuiTown:2 LoyaltyPlaza:0'],
 ['LoyaltyPlaza','Route3','Kitakami · Loyalty Plaza','AppleHills:1 DreadedDen:0'],
 ['OniMountain','Route3','Kitakami · Oni Mountain','MossuiTown:3 CrystalPool:0'],
 ['CrystalPool','Route3','Kitakami · Crystal Pool','OniMountain:1 DreadedDen:1'],
 ['DreadedDen','CamphrierTown','Kitakami · Dreaded Den','LoyaltyPlaza:1 CrystalPool:1'],
 ['BlueberryDock','Route3','Blueberry Academy · Entrance','Academy:4 TerariumHub:0'],
 ['TerariumHub','CamphrierTown','Blueberry Academy · Terarium','BlueberryDock:1 SavannaBiome:0 CoastalBiome:0 CanyonBiome:0'],
 ['SavannaBiome','Route3','Terarium · Savanna Biome','TerariumHub:1 SavannaTrial:0'],
 ['SavannaTrial','GymGallery','BB League · Crispin','SavannaBiome:1'],
 ['CoastalBiome','Route3','Terarium · Coastal Biome','TerariumHub:2 CoastalTrial:0'],
 ['CoastalTrial','GymGallery','BB League · Lacey','CoastalBiome:1'],
 ['CanyonBiome','Route3','Terarium · Canyon Biome','TerariumHub:3 CanyonTrial:0'],
 ['CanyonTrial','GymGallery','BB League · Amarys','CanyonBiome:1'],
 ['PolarBiome','Route3','Terarium · Polar Biome','TerariumHub:4 PolarTrial:0'],
 ['PolarTrial','GymGallery','BB League · Drayton','PolarBiome:1'],
 ['LeagueClub','CamphrierTown','Blueberry Academy · League Club','TerariumHub:5 KieranArena:0'],
 ['KieranArena','GymGallery','BB League · Champion Kieran','LeagueClub:1'],
 ['Underdepths','Route3','Area Zero · Underdepths','ZeroLab:1 TerapagosChamber:0'],
 ['TerapagosChamber','GymGallery','Area Zero · Terapagos Chamber','Underdepths:1']
];
const free=(m,x,y)=>x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&
 !m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);
function nearest(m,x,y){
 const cells=[];for(let yy=2;yy<m.height-2;yy++)for(let xx=2;xx<m.width-2;xx++)
  if(free(m,xx,yy))cells.push({x:xx,y:yy,d:Math.abs(x-xx)+Math.abs(y-yy)});
 cells.sort((a,b)=>a.d-b.d);
 if(!cells.length)throw Error('No free Paldea DLC tile on '+m.name);return cells[0];
}
const mapNames=[];
for(const [id,template,title,links] of specs){
 const base=source['Kalos'+template],targets=links.split(' ');
 if(!base||base.warps.length<targets.length)throw Error('Missing Paldea DLC exits '+id);
 const m=JSON.parse(JSON.stringify(base));
 Object.assign(m,{name:'Paldea'+id,title,region:'paldea',paldeaCampaign:'scarlet-violet',
  image:'Kalos'+template,people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=targets.map((link,i)=>{const[to,w]=link.split(':');return {...base.warps[i],map:'Paldea'+to,warp:+w};});
 for(const key of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[key];
 D.maps[m.name]=m;D.mapNames.push(m.name);mapNames.push(m.name);
}
function attach(from,to,index,nearX=24,nearY=15){
 const m=D.maps['Paldea'+from];
 if(!m||m.warps.length!==index)throw Error('Paldea DLC connector '+from+' expected '+index);
 const at=nearest(m,nearX,nearY);
 m.warps.push({x:at.x,y:at.y,map:'Paldea'+to,warp:0});
}
attach('Academy','KitakamiBus',3);
attach('Academy','BlueberryDock',4);
attach('TerariumHub','PolarBiome',4);
attach('TerariumHub','LeagueClub',5);
attach('ZeroLab','Underdepths',1);
function npc(id,key,x=18,y=14,sprite='bw2_105'){
 const m=D.maps['Paldea'+id],at=nearest(m,x,y);
 m.people.push({id:'paldea-dlc-'+key,localId:'PALDEA_DLC_'+key,x:at.x,y:at.y,
  script:'sv:'+key,sprite,width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
for(const [id,key,sprite] of [
 ['KitakamiBus','teal-briar','bw2_scientist_f_46'],
 ['MossuiTown','teal-carmine','bw2_lass'],
 ['CommunityCenter','teal-heal','bw2_147'],
 ['AppleHills','teal-kieran','bw2_youngster'],
 ['MossuiTown','teal-festival','bw2_105'],
 ['MossuiTown','teal-epilogue','bw2_105'],
 ['LoyaltyPlaza','teal-loyal-0','bw2_105'],
 ['OniMountain','teal-loyal-1','bw2_105'],
 ['CrystalPool','teal-loyal-2','bw2_105'],
 ['DreadedDen','teal-kieran-final','bw2_youngster'],
 ['DreadedDen','teal-ogerpon','bw2_105'],
 ['BlueberryDock','indigo-briar','bw2_scientist_f_46'],
 ['TerariumHub','indigo-guide','bw2_105'],
 ['TerariumHub','heal','bw2_147'],
 ['LeagueClub','indigo-club','bw2_youngster'],
 ['SavannaTrial','indigo-crispin','bw2_105'],
 ['CoastalTrial','indigo-lacey','bw2_lass'],
 ['CanyonTrial','indigo-amarys','bw2_lass'],
 ['PolarTrial','indigo-drayton','bw2_youngster'],
 ['KieranArena','indigo-kieran','bw2_youngster'],
 ['Underdepths','indigo-depths','bw2_scientist_f_46'],
 ['TerapagosChamber','indigo-terapagos','bw2_105']
])npc(id,key,18,14,sprite);
for(const [id,pool] of [
 ['AppleHills',[['Applin',60,64],['Dipplin',62,65],['Yanmega',60,64]]],
 ['OniMountain',[['Vulpix',60,64],['Gliscor',62,65],['Mightyena',61,65]]],
 ['CrystalPool',[['Milotic',65,68],['Kommo-o',65,68],['Sinistcha',65,68]]],
 ['SavannaBiome',[['Flygon',67,70],['Rhyperior',67,70],['Blaziken',68,71]]],
 ['CoastalBiome',[['Primarina',67,70],['Lapras',67,70],['Kingdra',68,71]]],
 ['CanyonBiome',[['Excadrill',68,72],['Archaludon',68,72],['Metagross',68,72]]],
 ['PolarBiome',[['Alcremie',68,72],['Frosmoth',68,72],['Dragonite',68,72]]],
 ['Underdepths',[['Glimmora',73,77],['Iron Crown',74,77],['Raging Bolt',74,77]]]
]){
 const m=D.maps['Paldea'+id],unit=Math.floor(100/pool.length);
 m.wild={rate:24,weights:pool.map((_,i)=>i===pool.length-1?100-i*unit:unit),
  slots:pool.map(([species,min,max])=>({species,min,max}))};
 for(let y=5;y<Math.min(m.height-4,16);y++)for(let x=5;x<Math.min(m.width-4,12);x++)
  if(free(m,x,y))m.behavior[y*m.width+x]=2;
}
D.dlc={mapNames,kitakami:mapNames.slice(0,8),blueberry:mapNames.slice(8),
 blueberryElite:['Crispin','Lacey','Amarys','Drayton']};
})();
