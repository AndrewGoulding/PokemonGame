// Unified Ultra Alola Akala island; 2D placeholders sourced from existing Kalos maps.
(function(){
'use strict';
const D=window.ALOLA_DATA,base=window.KALOS_DATA?.maps;if(!D||!base)return;
const specs=[
['HeaheaCity','CamphrierTown','Heahea City','Route4:0 HeaheaHotel:0 HeaheaCenter:0'],
['HeaheaHotel','AquacordeRestHouse','Tide Song Hotel','HeaheaCity:1'],
['HeaheaCenter','SantaluneCenter','Heahea Pokémon Center','HeaheaCity:2'],
['Route4','Route3','Akala Route 4','HeaheaCity:0 PaniolaTown:0'],
['PaniolaTown','CamphrierTown','Paniola Town','Route4:1 PaniolaRanch:0 PaniolaCenter:0'],
['PaniolaCenter','SantaluneCenter','Paniola Pokémon Center','PaniolaTown:2'],
['PaniolaRanch','Route7East','Paniola Ranch','PaniolaTown:1 Route5:0 Route6:0'],
['Route5','Route10Entrance','Akala Route 5','PaniolaRanch:1 BrookletEntrance:0'],
['BrookletEntrance','GymGallery','Brooklet Hill Entrance','Route5:1 BrookletHill:0'],
['BrookletHill','GlitteringCave','Brooklet Hill','BrookletEntrance:1 BrookletPool:0'],
['BrookletPool','SeaSpiritsDen','Brooklet Hill Totem Pool','BrookletHill:1'],
['Route6','Route3','Akala Route 6','PaniolaRanch:2 RoyalAvenue:0'],
['RoyalAvenue','CamphrierTown','Royal Avenue','Route6:1 Route7:0 BattleRoyalDome:0'],
['BattleRoyalDome','AquacordeShop','Battle Royal Dome','RoyalAvenue:2'],
['Route7','Route7East','Akala Route 7','RoyalAvenue:1 WelaEntrance:0 Route8:0'],
['WelaEntrance','GymGallery','Wela Volcano Entrance','Route7:1 WelaVolcano:0'],
['WelaVolcano','GymWeb','Wela Volcano Park','WelaEntrance:1'],
['Route8','Route14','Akala Route 8','Route7:2 LushEntrance:0 KonikoniCity:0'],
['LushEntrance','GymGallery','Lush Jungle Entrance','Route8:1 LushJungle:0'],
['LushJungle','ParfumGarden','Lush Jungle','LushEntrance:1'],
['KonikoniCity','LaverreCity','Konikoni City','Route8:2 MemorialHill:0 KonikoniCenter:0'],
['KonikoniCenter','SantaluneCenter','Konikoni Pokémon Center','KonikoniCity:2'],
['MemorialHill','Route10Entrance','Memorial Hill','KonikoniCity:1 RuinsOfLife:0'],
['RuinsOfLife','SeaSpiritsDen','Ruins of Life','MemorialHill:1']
];
const A=D.maps;
for(const[id,t,title,dests]of specs){
 const name='Alola'+id,template=base['Kalos'+t],links=dests.split(' ');
 if(!template||template.warps.length<links.length)throw Error('Akala template missing '+t);
 const m=JSON.parse(JSON.stringify(template));Object.assign(m,{name,title,region:'alola',alolaCampaign:'ultra',alolaIsland:'akala',image:'Kalos'+t,people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=links.map((link,i)=>{const [to,j]=link.split(':');return {...template.warps[i],map:'Alola'+to,warp:+j};});
 for(const k of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[k];
 A[name]=m;
}
function free(m,x,y){return x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);}
function npc(map,x,y,key,sprite='bw2_lass'){
 const m=A['Alola'+map];if(!free(m,x,y)){const a=[];for(let cy=2;cy<m.height-2;cy++)for(let cx=2;cx<m.width-2;cx++)if(free(m,cx,cy))a.push([cx,cy,Math.abs(cx-x)+Math.abs(cy-y)]);a.sort((u,v)=>u[2]-v[2]);if(!a.length)throw Error('No NPC tile '+map);[x,y]=a[0];}
 m.people.push({id:'akala-'+m.people.length,localId:'USUM_'+map+'_'+m.people.length,x,y,script:'usum:'+key,sprite,width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
const npcs=[
['HeaheaCity',13,19,'melemele-ferry'],['HeaheaCity',20,13,'hau-akala','bw2_youngster'],['HeaheaCity',27,16,'recon-heahea','bw2_scientist_f_46'],
['HeaheaHotel',9,5,'hotel'],['HeaheaCenter',8,7,'akala-heal','bw2_147'],['HeaheaCenter',13,8,'akala-mart'],
['Route4',12,15,'route4-trainer','bw2_youngster'],['PaniolaTown',19,17,'hau-paniola','bw2_youngster'],['PaniolaCenter',8,7,'akala-heal','bw2_147'],
['PaniolaRanch',17,18,'ranch-miltank','bw2_147'],['Route5',16,11,'gladion-route5','bw2_youngster'],['Route5',18,8,'lana-invite'],
['BrookletEntrance',12,11,'lana-brief'],['BrookletHill',13,12,'brooklet-splash-0'],['BrookletHill',26,15,'brooklet-splash-1'],['BrookletPool',11,9,'lana-totem','bw2_105'],
['Route6',16,16,'skull-route6','bw2_youngster'],['RoyalAvenue',19,14,'masked-royal','bw2_105'],['BattleRoyalDome',9,7,'royal-stage','bw2_105'],
['Route7',18,15,'kiawe-invite','bw2_youngster'],['WelaEntrance',12,10,'kiawe-brief','bw2_105'],
['WelaVolcano',10,11,'kiawe-dance-0','bw2_youngster'],['WelaVolcano',23,16,'kiawe-dance-1','bw2_youngster'],['WelaVolcano',18,25,'kiawe-totem','bw2_105'],
['Route8',14,15,'recon-route8','bw2_scientist_f_46'],['Route8',24,18,'mallow-invite'],['LushEntrance',12,10,'mallow-brief'],
['LushJungle',11,8,'ingredient-0'],['LushJungle',27,9,'ingredient-1'],['LushJungle',12,22,'ingredient-2'],['LushJungle',30,21,'ingredient-3'],['LushJungle',21,15,'mallow-totem','bw2_105'],
['KonikoniCity',20,12,'olivia-konikoni','bw2_147'],['KonikoniCenter',9,7,'akala-heal','bw2_147'],['MemorialHill',15,11,'plumeria'],['RuinsOfLife',11,9,'olivia-grand','bw2_147']
];
npcs.forEach(n=>npc(...n));
if(!A.AlolaHauoliCity.people.some(p=>p.script==='usum:akala-ferry')){
 const m=A.AlolaHauoliCity;let x=37,y=21;
 if(!free(m,x,y)){const spots=[];for(let cy=2;cy<m.height-2;cy++)for(let cx=2;cx<m.width-2;cx++)if(free(m,cx,cy))spots.push([cx,cy,Math.abs(cx-x)+Math.abs(cy-y)]);spots.sort((a,b)=>a[2]-b[2]);if(!spots.length)throw Error('No ferry tile');[x,y]=spots[0];}
 m.people.push({id:'akala-ferry',localId:'USUM_AKALA_FERRY',x,y,script:'usum:akala-ferry',sprite:'bw2_scientist_m_52',width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
function grass(id,list,rate=25){const m=A['Alola'+id],q=Math.floor(100/list.length);m.wild={rate,weights:list.map((_,i)=>i===list.length-1?100-i*q:q),slots:list.map(([species,min,max])=>({species,min,max}))};
 for(let y=6;y<Math.min(m.height-4,17);y++)for(let x=5;x<Math.min(m.width-4,12);x++)if(free(m,x,y))m.behavior[y*m.width+x]=2;}
grass('Route4',[['Lillipup',11,13],['Mudbray',11,13],['Eevee',11,13],['Grubbin',11,13]]);
grass('PaniolaRanch',[['Mudbray',12,15],['Lillipup',12,15],['Mareep',12,15],['Tauros',13,15]]);
grass('Route5',[['Fomantis',13,16],['Pikipek',13,15],['Trumbeak',14,16],['Bonsly',13,15]]);
grass('BrookletHill',[['Dewpider',15,18],['Psyduck',15,18],['Poliwag',15,17],['Surskit',15,17]],30);
grass('Route6',[['Oricorio',15,18],['Yungoos',14,17],['Rattata-Alola',14,17],['Mudbray',15,17]]);
grass('Route7',[['Magby',16,19],['Salandit',16,19],['Cubone',16,19],['Fletchling',16,18]]);
grass('WelaVolcano',[['Salandit',18,22],['Magby',18,21],['Cubone',18,21]]);
grass('Route8',[['Stufful',18,21],['Trumbeak',18,20],['Fletchinder',18,20],['Salandit',18,20]]);
grass('LushJungle',[['Fomantis',20,23],['Bounsweet',20,22],['Comfey',20,22],['Paras',20,22]],30);
grass('MemorialHill',[['Gastly',23,26],['Phantump',23,25],['Zubat',23,25]]);
D.akala={mapNames:specs.map(x=>'Alola'+x[0]),start:{map:'AlolaHeaheaCity',x:19,y:20,facing:'down'},return:{map:'AlolaHauoliCity',x:22,y:22,facing:'down'}};
})();