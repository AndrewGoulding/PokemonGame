// Final source-data pass. Geometry remains an explicit 2D adaptation.
'use strict';
const fs=require('fs'),path=require('path'),{canvas}=require('./orre-art');
module.exports=function({root,source,kit,doors,priorDoors,additions,provenance,trainer,person,itemName,moveName,speciesName,ctx,routes,optional,leisure,trainers}){
 const json=f=>JSON.parse(fs.readFileSync(path.join(source,f),'utf8')),read=f=>fs.readFileSync(path.join(source,f),'utf8'),clone=x=>JSON.parse(JSON.stringify(x)),sites={},coverage=[],fieldItems=[],gifts={},access={},hiddenReserved=new Set();
 const spot=(name,x,y,door=false)=>{const m=kit.base(name);if(m.collision.some((c,i)=>!c&&i%m.width>0&&i%m.width<m.width-1&&Math.floor(i/m.width)>0&&Math.floor(i/m.width)<m.height-1&&!(m.behavior[i]>=16&&m.behavior[i]<=21)))return kit.spot(name,x,y,door);const busy=[...m.people,...(additions[name]||[]),...m.warps,...m.signs,...(m.questReserved||[])],free=[];for(let yy=1;yy<m.height-1;yy++)for(let xx=1;xx<m.width-1;xx++)if(!m.collision[yy*m.width+xx]&&!busy.some(a=>a.x===xx&&a.y===yy))free.push([xx,yy]);const at=free.sort((a,b)=>Math.abs(a[0]-x)+Math.abs(a[1]-y)-Math.abs(b[0]-x)-Math.abs(b[1]-y))[0];if(!at)throw Error('No safe source placement '+name);return at;};
 const ensure=name=>kit.maps[name]||(kit.maps[name]=clone(kit.base(name)));
 function reserve(name,x,y){const m=ensure(name);m.questReserved=[...(m.questReserved||[]),{x,y},{x,y:y+1}];}
 for(const d of [...(priorDoors||[]),...doors])reserve(d.outside,d.x,d.y);
 for(const r of routes.encounters)if(!sites[r.bank])sites[r.bank]=r.map;
 for(const [bank,name]of Object.entries({...optional.chateau.mapping,...optional.temple.mapping}))sites[bank]=name;
 for(const [bank,name]of Object.entries(leisure.ruins?.maps||{}))sites[bank]=name;
 Object.assign(sites,{
  twinleaf_town:'TwinleafTown',sandgem_town:'SandgemTown',jubilife_city:'JubilifeCity',oreburgh_city:'OreburghCity',eterna_city:'EternaCity',floaroma_town:'FloaromaTown',hearthome_city:'HearthomeCity',solaceon_town:'SolaceonTown',veilstone_city:'VeilstoneCity',pastoria_city:'PastoriaCity',celestic_town:'CelesticTown',canalave_city:'CanalaveCity',snowpoint_city:'SnowpointCity',sunyshore_city:'SunyshoreCity',pokemon_league:'PokemonLeague',fight_area:'FightArea',survival_area:'SurvivalArea',resort_area:'ResortArea',
  floaroma_meadow:'FloaromaMeadow',eterna_forest_outside:'EternaForest',fuego_ironworks_outside:'FuegoIronworks',fuego_ironworks_building:'PlatinumFuego',verity_lakefront:'VerityLakefront',lake_verity_low_water:'LakeVerity',lake_acuity_low_water:'LakeAcuity',lake_valor_drained:'LakeValor_2',
  oreburgh_mine_b1f:'OreburghMine',mt_coronet_1f_south:'MtCoronet',mt_coronet_1f_north_room_1:'MtCoronet_2',mt_coronet_1f_north_room_2:'MtCoronet_3',mt_coronet_2f:'PlatinumCoronet_Junction',mt_coronet_b1f:'PlatinumCoronet_NorthPass',mt_coronet_3f:'PlatinumCoronet_Summit',mt_coronet_4f_rooms_1_and_2:'MtCoronet_4',mt_coronet_4f_room_3:'MtCoronet_5',mt_coronet_5f:'MtCoronet_6',mt_coronet_6f:'MtCoronet_7',mt_coronet_outside_north:'MtCoronet_5',mt_coronet_outside_south:'MtCoronet_4',mt_coronet_iceberg_ruins:'PlatinumLegendRegice',
  iron_island:'IronIsland',iron_island_1f:'IronIsland_2',iron_island_b1f_left_room:'IronIsland_3',iron_island_b1f_right_room:'IronIsland_4',iron_island_b2f_left_room:'PlatinumIronIsland',iron_island_b3f:'IronIsland_4',iron_island_iron_ruins:'PlatinumLegendRegisteel',
  stark_mountain_outside:'StarkMountain',stark_mountain_room_1:'PlatinumStarkEntrance',stark_mountain_room_2:'PlatinumStarkInterior',stark_mountain_room_3:'PlatinumStarkChamber',
  victory_road_1f:'PlatinumVictoryRoad_1F',victory_road_2f:'PlatinumVictoryRoad_2F',victory_road_b1f:'PlatinumVictoryRoad_B1F',victory_road_1f_room_1:'PlatinumVictoryRoad_B1F',victory_road_1f_room_2:'PlatinumExpMarley',victory_road_1f_room_3:'PlatinumExpMarley',
  wayward_cave_1f:'PlatinumExpWayward',wayward_cave_b1f:'PlatinumExpWaywardB1F',ruin_maniac_cave_short:'ManiacTunnel',ruin_maniac_cave_long:'ManiacTunnel',
  galactic_hq_1f:'GalacticHQ_1F',galactic_hq_2f:'GalacticHQ_2F',galactic_hq_4f:'GalacticHQ_Cyrus',galactic_hq_b1f:'GalacticWarehouse_Basement',galactic_hq_b2f:'GalacticWarehouse_Basement',galactic_hq_laboratory:'GalacticHQ_Lab',veilstone_city_galactic_warehouse:'VeilstoneWarehouse',
  team_galactic_eterna_building_1f:'EternaGalactic_1F',team_galactic_eterna_building_2f:'EternaGalactic_2F',team_galactic_eterna_building_3f:'EternaGalactic_3F',team_galactic_eterna_building_4f:'EternaGalactic_4F',
  pokemon_mansion:'PlatinumDailyMansion',pokemon_mansion_office:'PlatinumDailyMansion',pokemon_mansion_maids_room:'PlatinumDailyMansion',trophy_garden:'PlatinumDailyGarden',amity_square:'PlatinumAmitySquare',
  fullmoon_island_forest:'PlatinumLegendCresselia',newmoon_island_forest:'PlatinumLegendDarkrai',sendoff_spring:'SendoffSpring',route_228_rock_peak_ruins:'PlatinumLegendRegirock',trainers_school:'JubilifeCity',grand_lake_route_213_northeast_house:'ValorLakefront',route_222_west_house:'Route222'
 });
 for(let i=1;i<=6;i++)sites['great_marsh_'+i]='PlatinumMarsh'+i;
 for(let i=1;i<=5;i++)sites['route_209_lost_tower_'+i+'f']='PlatinumExpLostTower'+i;
 for(const bank of fs.readdirSync(path.join(source,'res/field/maps')))if(bank.startsWith('turnback_cave_'))sites[bank]=bank.includes('giratina')?'PlatinumLegendGiratina':'PlatinumTurnbackMaze';
 // Four missing source rooms, with visible entrances and safe reciprocal exits.
 function extra(bank,name,title,outside,x,y,wood=false){const m=kit.room(name,title,33,31,wood);m.questTV=false;m.music=kit.base(outside).music;const at=spot(outside,x,y,true);kit.link(m,16,29,outside,...at);const b=ensure(outside),key=name+'Door',c=canvas(16,16);c.box(0,0,16,16,[151,132,139],[61,49,64]);c.rect(4,4,8,12,[34,35,47]);c.save(path.join(root,'assets/world/maps',outside+'-patch-'+key+'.png'));b.patches={...b.patches,[key]:{x:at[0],y:at[1],w:1,h:1,top:false,collision:[]}};b.legendDoorPatches=[...(b.legendDoorPatches||[]),key];sites[bank]=name;reserve(outside,...at);kit.draw(m);return m;}
 extra('cafe','PlatinumCafe','Route 210 · Café Cabin','Route210',21,12,true);
 extra('oreburgh_gate_b1f','PlatinumGateB1F','Oreburgh Gate · B1F','Oreburgh_Gate',12,7);
 extra('iron_island_b2f_right_room','PlatinumIronRight','Iron Island · B2F Right','IronIsland_4',10,9);
 extra('galactic_hq_3f','GalacticHQ_3F','Galactic HQ · 3F','GalacticHQ_2F',21,5,true);
 extra('mt_coronet_1f_tunnel_room','PlatinumCoronetTunnel','Mt. Coronet · Tunnel','PlatinumCoronet_Summit',23,25);
 extra('trainers_school','PlatinumTrainerSchool','Jubilife · Trainer School','JubilifeCity',14,17,true);
 extra('twinleaf_town_player_house_1f','PlatinumTwinleafHome','Twinleaf Town · Home','TwinleafTown',19,17,true);
 extra('oreburgh_mine_b1f','PlatinumMine1F','Oreburgh Mine · Upper Floor','OreburghMine',10,12);
 extra('iron_island_b3f','PlatinumIronB3F','Iron Island · Exit Chamber','IronIsland_4',18,18);
 extra('mt_coronet_outside_north','PlatinumCoronetSnowNorth','Mt. Coronet · Northern Snowfield','MtCoronet_5',15,20);
 extra('mt_coronet_outside_south','PlatinumCoronetSnowSouth','Mt. Coronet · Southern Snowfield','MtCoronet_4',12,18);
 extra('victory_road_1f_room_1','PlatinumRoadEast1','Victory Road · Eastern Antechamber','PlatinumVictoryRoad_B1F',24,12);
 extra('victory_road_1f_room_3','PlatinumRoadEast3','Victory Road · Eastern Exit Chamber','PlatinumExpMarley',26,24);
 for(const [name,gate]of [['PlatinumGateB1F','smash'],['PlatinumRoadEast1','postgame'],['PlatinumRoadEast3','postgame'],['PlatinumCoronetTunnel','coronet'],['PlatinumCoronetSnowNorth','coronet'],['PlatinumCoronetSnowSouth','coronet']]){const d=doors.find(d=>d.inside===name);access[name]={gate,return:{map:d.outside,x:d.x,y:d.y+1,facing:'down'}};}

 // Authored mountain ledges are retained and linked to the campaign ascent.
 for(const [i,name]of ['MtCoronet_4','MtCoronet_5','MtCoronet_6','MtCoronet_7'].entries()){
  const m=ensure(name),outside=i?'MtCoronet_'+(i+3):'PlatinumCoronet_Summit',a=spot(outside,8+i*3,20,true),b=spot(name,8,20,true),index=m.warps.length;
  m.warps.push({x:b[0],y:b[1],map:outside,warp:kit.base(outside).warps.length});m.behavior[b[1]*m.width+b[0]]=0x61;const o=ensure(outside);o.warps.push({x:a[0],y:a[1],map:name,warp:index});o.behavior[a[1]*o.width+a[0]]=0x61;
  for(const [map,at,key]of [[m,b,'sourceUp'+i],[o,a,'sourceDown'+i]]){const c=canvas(16,16);c.box(0,0,16,16,[76,70,83],[33,32,45]);for(let yy=3;yy<15;yy+=3)c.rect(3,yy,10,1,[225,223,222]);c.save(path.join(root,'assets/world/maps',map.name+'-patch-'+key+'.png'));map.patches={...map.patches,[key]:{x:at[0],y:at[1],w:1,h:1,top:false,collision:[]}};map.legendDoorPatches=[...(map.legendDoorPatches||[]),key];}

 }
 const sourceItem=s=>({ITEM_ODD_KEYSTONE:'odd-keystone',ITEM_SUITE_KEY:'suite-key',ITEM_PARLYZ_HEAL:'paralyze-heal',ITEM_LUNAR_WING:'lunar-wing',ITEM_GALACTIC_KEY:'galactic-key',ITEM_STORAGE_KEY:'galactic-storage-key',ITEM_X_SPECIAL:'x-sp-atk'}[s]||itemName(s));
 const machine=s=>{const sourceId=s.slice(5).toLowerCase(),move=moveName(json('res/items/data/'+sourceId+'.json').teachesMove),id=Object.keys(ctx.ITEMS).find(id=>ctx.ITEMS[id].category==='all-machines'&&ctx.ITEMS[id].effect.startsWith('Teaches '+move+' to a compatible'));if(!id)throw Error('Missing source machine '+move);return id;},item=s=>/^ITEM_(TM|HM)\d+$/.test(s)?machine(s):sourceItem(s);
 const visible=read('res/field/scripts/visible_items.s'),hidden=Object.fromEntries([...read('include/data/field/hidden_items.h').matchAll(/HIDDEN_ITEM_ENTRY\((ITEM_\w+),\s*(\d+),\s*\d+,\s*(FLAG_\w+)\)/g)].map(m=>[m[3],{item:item(m[1]),quantity:+m[2]}])),used=new Set(Object.keys(optional.items)),reused=new Set(),hiddenUsed=new Set(['FLAG_OBTAINED_HIDDEN_ROUTE_213_SUITE_KEY']);
 // Resolve all field-bearing banks. Alternate water-level banks share their items.
 function site(bank){if(sites[bank])return sites[bank];const prefix=Object.keys(sites).filter(k=>bank.startsWith(k+'_')).sort((a,b)=>b.length-a.length)[0];return prefix?sites[prefix]:null;}
 const encounterBanks=[];
 for(const bank of fs.readdirSync(path.join(source,'res/field/maps'))){if(/^(unused_|.*_dp_gym)/.test(bank))continue;const file='res/field/maps/'+bank+'/events.json';if(!fs.existsSync(path.join(source,file)))continue;const ev=json(file),name=site(bank),hasItems=ev.object_events.some(e=>e.script?.startsWith('VisibleItems_'))||ev.bg_events.some(e=>e.hidden_item),enc='res/field/maps/'+bank+'/encounters.json';if(!name){if(hasItems||fs.existsSync(path.join(source,enc)))throw Error('Unmapped source field bank '+bank);continue;}sites[bank]=name;const m=ensure(name);if(!hiddenReserved.has(name)){m.questReserved=[...(m.questReserved||[]),...(m.hidden||[]).map(h=>({x:h.x,y:h.y}))];hiddenReserved.add(name);}
  // Variant banks use the main table unless they describe a distinct physical room.
  if(fs.existsSync(path.join(source,enc))){const e=json(enc),variant=/low_water|ruin_maniac_cave|turnback_cave_/.test(bank);encounterBanks.push({bank,map:name,variant});if(!variant&&!routes.encounters.some(r=>r.bank===bank)){
   if(e.land_rate)m.wild={rate:e.land_rate,weights:[20,20,10,10,10,10,5,5,4,4,1,1],slots:e.land_encounters.map((a,i)=>({species:speciesName(i===2||i===3?e.day[i-2]:a.species),min:a.level,max:a.level,...(i===2||i===3?{morning:speciesName(a.species),night:speciesName(e.night[i-2])}:{})}))};
   const range=a=>({species:speciesName(a.species),min:a.level_min,max:a.level_max});if(e.surf_rate)m.water={rate:e.surf_rate,slots:e.surf_encounters.map(range)};const rods={};for(const r of ['old','good','super'])if(e[r+'_rod_rate'])rods[r+'-rod']={rate:e[r+'_rod_rate'],slots:e[r+'_rod_encounters'].map(range)};if(Object.keys(rods).length)m.fishing={rods};if(e.radar?.some(sp=>sp!=='SPECIES_NONE'))m.radarExtras=e.radar.map(sp=>sp==='SPECIES_NONE'?null:speciesName(sp));m.platinumDualSlot=Object.fromEntries(['ruby','sapphire','emerald','firered','leafgreen'].map(k=>[k,(e[k]||[]).map(sp=>sp==='SPECIES_NONE'?null:speciesName(sp))]));
   if(m.type==='cave'||/^Platinum(Gate|IronRight|CoronetTunnel)/.test(name))for(let y=2;y<m.height-2;y++)for(let x=1;x<m.width-1;x++)if(!m.collision[y*m.width+x])m.encounter[y*m.width+x]=1;
  }provenance[bank]={...provenance[bank],encounters:enc};}
  let placed=0;const points=[...ev.object_events,...ev.bg_events],xs=points.map(e=>e.x),zs=points.map(e=>e.z),minX=Math.min(...xs),minZ=Math.min(...zs),maxX=Math.max(...xs),maxZ=Math.max(...zs),project=e=>[3+Math.round((m.width-7)*(e.x-minX)/Math.max(1,maxX-minX)),4+Math.round((m.height-9)*(e.z-minZ)/Math.max(1,maxZ-minZ))];
  for(const e of ev.object_events.filter(e=>e.trainer)){const id='PT_'+e.trainer.id;if(trainers[id])continue;trainer(e.trainer.id);const at=spot(name,...project(e));person(name,...at,id,e.graphics_id.replace('OBJ_EVENT_GFX_','').toLowerCase(),{trainer:{id,sight:2},platinumEvent:{bank,id:e.id,x:e.x,z:e.z},...(e.trainer.id.includes('GALACTIC_GRUNT_LAKE')?{platinumGate:bank.includes('valor')?'valor':'verity'}:e.trainer.id.includes('GALACTIC_GRUNT_MT_CORONET')?{platinumGate:'coronet'}:{})});placed++;}
  for(const e of ev.object_events.filter(e=>e.script?.startsWith('VisibleItems_'))){if(used.has(e.script))continue;used.add(e.script);const body=visible.split(e.script+':')[1]?.split('\n\n')[0],match=body?.match(/SetVar VAR_0x8008, (ITEM_\w+)/);if(!match)throw Error('Missing source item '+e.script);if(['ITEM_LUNAR_WING','ITEM_GALACTIC_KEY','ITEM_STORAGE_KEY'].includes(match[1]))continue;const id=item(match[1]),existing=m.people.find(a=>a.item===id&&!reused.has(a));let actor;if(existing){actor=existing;reused.add(actor);}else{const at=spot(name,...project(e));actor={id:'pt-field-'+e.script,x:at[0],y:at[1],script:'PlatinumField_'+e.script,flag:'pt-field:'+e.script,item:id,sprite:'item_ball',width:16,height:16,frames:1,inanimate:true,movement:'face_down',rangeX:0,rangeY:0};m.people.push(actor);}actor.platinumItem=e.script;reused.add(actor);fieldItems.push({bank,map:name,item:id,flag:actor.flag,script:e.script,hidden:false});}
  for(const e of ev.bg_events.filter(e=>e.hidden_item)){if(hiddenUsed.has(e.hidden_item))continue;hiddenUsed.add(e.hidden_item);const a=hidden[e.hidden_item];if(!a)throw Error('Missing hidden source '+e.hidden_item);m.hidden=m.hidden||[];let h=m.hidden.find(h=>h.item===a.item&&!reused.has(h));if(h)reused.add(h);else{const at=spot(name,...project(e));h={x:at[0],y:at[1],...a,flag:'pt-hidden:'+e.hidden_item};m.hidden.push(h);}h.platinumItem=e.hidden_item;reused.add(h);m.questReserved.push({x:h.x,y:h.y});fieldItems.push({bank,map:name,...a,flag:h.flag,script:e.hidden_item,hidden:true});}
  if(placed)coverage.push({bank,map:name,trainers:placed});if(hasItems||placed)provenance[bank]={...provenance[bank],events:file,scripts:'res/field/maps/'+bank+'/scripts.s'};
 }

 const giftRows=[
  ['quick-claw','jubilife_city_condominiums_1f','JubilifeCity','ITEM_QUICK_CLAW'],
  ['pluck','floaroma_town_middle_house','FloaromaTown','ITEM_TM88'],
  ['captivate','route_204_north','Route204','ITEM_TM78'],
  ['roost','route_210_south','Route210','ITEM_TM51'],
  ['psych-up','route_211_east','Route211','ITEM_TM77'],
  ['payback','route_215','Route215','ITEM_TM66'],
  ['fling','route_222','Route222','ITEM_TM56'],
  ['skill-swap','canalave_city_southeast_house','CanalaveCity','ITEM_TM48'],
  ['trick-room','grand_lake_route_213_northwest_house','ValorLakefront','ITEM_TM92'],
  ['facade','survival_area_south_house','SurvivalArea','ITEM_TM42'],
  ['embargo','veilstone_city','VeilstoneCity','ITEM_TM63'],
  ['scope-lens','fight_area_mart','FightArea','ITEM_SCOPE_LENS'],
  ['upgrade','eterna_city_south_house','EternaCity','ITEM_UPGRADE','national'],
  ['metal-coat','iron_island_house','IronIsland','ITEM_METAL_COAT','national'],
  ['ghost-tag','route_217_northeast_house','Route217','ITEM_SPELL_TAG'],
  ['icicle-plate','route_217_west_house','Route217','ITEM_ICICLE_PLATE','rock-climb'],
  ['black-flute','mt_coronet_2f','PlatinumCoronet_Junction','ITEM_BLACK_FLUTE'],
  ['odd-keystone','route_208','Route208','ITEM_ODD_KEYSTONE'],
  ['potion','route_201','Route201','ITEM_POTION'],
  ['return','sandgem_town','SandgemTown','ITEM_TM27'],
  ['super-potion','oreburgh_city','OreburghCity','ITEM_SUPER_POTION'],
  ['heal-ball','oreburgh_city_north_house_2f','OreburghCity','ITEM_HEAL_BALL','geodude'],
  ['dusk-ball','oreburgh_city_northwest_house_2f','OreburghCity','ITEM_DUSK_BALL'],
  ['great-ball','oreburgh_city_east_house_2f','OreburghCity','ITEM_GREAT_BALL'],
  ['celestic-ball','celestic_town_pokecenter_1f','CelesticTown','ITEM_GREAT_BALL','friendship'],
  ['flame-plate','oreburgh_mine_b1f','PlatinumMine1F','ITEM_FLAME_PLATE','arceus'],
  ['nugget','route_229','Route229','ITEM_NUGGET']
 ];
 let giftIndex=0;
 for(const [key,bank,name,sourceItem,gate]of giftRows){const body=read('res/field/maps/'+bank+'/scripts.s');if(!body.includes('SetVar VAR_0x8004, '+sourceItem))throw Error('Missing source gift '+key);const id=item(sourceItem),at=spot(name,7+(giftIndex%5)*5,7+Math.floor(giftIndex++/5)*3);gifts[key]={item:id,source:sourceItem,gate:gate||null,bank,map:name};person(name,...at,'completion-'+key,'gentleman',{script:'pt:complete-'+key});provenance[bank]={...provenance[bank],scripts:'res/field/maps/'+bank+'/scripts.s'};}
 for(const [key,name,x,y,sprite]of [['glasses','CelesticTown',16,12,'gentleman'],['milk','PlatinumCafe',16,6,'waitress'],['explosion','PlatinumServiceCasino',15,11,'gentleman']]){const at=spot(name,x,y);person(name,...at,'completion-'+key,sprite,{script:'pt:complete-'+key});}


 const school=['TRAINER_SCHOOL_KID_HARRISON','TRAINER_SCHOOL_KID_CHRISTINE'].map(trainer);
 for(const [i,id]of school.entries()){const at=spot('PlatinumTrainerSchool',7+i*17,8);person('PlatinumTrainerSchool',...at,id,i?'school_kid_f':'school_kid_m',{trainer:{id,sight:0}});}
 for(const [map,x,y,key,sprite]of [['PlatinumTrainerSchool',16,7,'school-prize','gentleman'],['PlatinumTrainerSchool',23,17,'school-parcel','barry'],['PlatinumTwinleafHome',16,7,'mom-parcel','middle_aged_woman'],['PlatinumTwinleafHome',7,7,'home-rest','middle_aged_woman']]){const at=spot(map,x,y);person(map,...at,'completion-'+key,sprite,{script:'pt:complete-'+key});}
 const celesticGrunt=trainer('TRAINER_GALACTIC_GRUNT_CELESTIC_TOWN'),gruntAt=spot('CelesticTown',25,17);person('CelesticTown',...gruntAt,celesticGrunt,'grunt_m',{trainer:{id:celesticGrunt,sight:0},platinumGate:'celestic'});coverage.push({bank:'trainers_school',map:'PlatinumTrainerSchool',trainers:2},{bank:'celestic_town',map:'CelesticTown',trainers:1});
 const barryTeams={};for(const starter of ['Turtwig','Chimchar','Piplup'])barryTeams[starter]=[1,2].map(n=>trainer('TRAINER_RIVAL_SURVIVAL_AREA_'+n+'_'+starter.toUpperCase()));
 const assistantAt=spot('SandgemTown_RowansLab',15,10);person('SandgemTown_RowansLab',...assistantAt,'completion-partner','gentleman',{script:'pt:complete-partner'});
 const barryAt=spot('SurvivalArea',20,18);person('SurvivalArea',...barryAt,'completion-weekend-barry','barry',{script:'pt:lg-barry-rematch'});
 for(const who of ['LUCAS'])for(const city of ['JUBILIFE_CITY','VEILSTONE_CITY'])for(const starter of ['TURTWIG','CHIMCHAR','PIPLUP'])trainer('TRAINER_'+who+'_'+city+'_'+starter);
 kit.draw(kit.base('PlatinumTrainerSchool'));kit.draw(kit.base('PlatinumTwinleafHome'));
 const berryGrowth={},berryGifts={},itemIds=read('generated/items.txt').trim().split(/\r?\n/);
 for(const f of fs.readdirSync(path.join(source,'res/items/data')).filter(f=>f.endsWith('_berry.json'))){const b=json('res/items/data/'+f).berryData;if(b)berryGrowth[item('ITEM_'+f.slice(0,-5).toUpperCase())]={hours:b.stageDuration,drain:b.moistureDrainRate,baseYield:b.baseYield};}
 for(const [key,bank,map]of [['master','route_208_house','Route208'],['florist','flower_shop','FloaromaTown'],['pastoria','pastoria_city_southwest_house','PastoriaCity']]){const body=read('res/field/maps/'+bank+'/scripts.s'),n=+body.match(/GetRandom VAR_0x8004, (\d+)/)[1],first=body.match(/AddVar VAR_0x8004, (ITEM_\w+)/)[1],start=itemIds.indexOf(first);berryGifts[key]=itemIds.slice(start,start+n).map(item);const at=spot(map,18,15);person(map,...at,'completion-berry-'+key,'old_man',{script:'pt:complete-berry-'+key});provenance[bank]={...provenance[bank],scripts:'res/field/maps/'+bank+'/scripts.s'};}
 for(const [key,map,x,y]of [['effort','SunyshoreCity',20,26],['mulch','Route208',20,12],['sprayduck','FloaromaTown',17,17]]){const at=spot(map,x,y);person(map,...at,'completion-'+key,'gentleman',{script:'pt:complete-'+key});}
 const berryIcons=['parcel','sprayduck','growth_mulch','damp_mulch','stable_mulch','gooey_mulch'];for(const name of berryIcons){const {readPng,writePng}=require('./png'),p=readPng(path.join(source,'res/items/icons/'+name+'.png'));writePng(path.join(root,'assets/sinnoh-optional/'+name+'.png'),p.width,p.height,p.rgba||Uint8Array.from(Array.from(p.px,i=>[...p.palette[i].slice(0,3),i?255:0]).flat()));}
 for(const name of Object.keys(kit.maps))if(/^MtCoronet|^PlatinumCoronet/.test(name))kit.maps[name].platinumEvolution='magnetic';
 ensure('EternaForest_2').platinumEvolution='moss';ensure('Route217').platinumEvolution='ice';
 // Retain every source variant, including Turnback's pillar-dependent rooms.
 const tables={};for(const r of encounterBanks){const e=json('res/field/maps/'+r.bank+'/encounters.json');tables[r.bank]=e;}
 return{school,celesticGrunt,barryTeams,berryGrowth,berryGifts,mulchCost:200,access,explosion:machine('ITEM_TM64'),species:Object.fromEntries([...new Set(Object.values(tables).flatMap(e=>e.land_encounters?.map(a=>a.species)||[]))].filter(s=>s!=='SPECIES_NONE').map(s=>[s,speciesName(s)])),tables,sites,encounters:encounterBanks,items:fieldItems,trainers:coverage,gifts};
};
