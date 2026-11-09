// Platinum's remaining legendary/event stories and postgame rematch records.
"use strict";
const fs=require('fs'),path=require('path'),{readPng}=require('./png'),{canvas}=require('./orre-art');
const BANKS=['fullmoon_island_forest','newmoon_island_forest','flower_paradise','hall_of_origin','snowpoint_temple_b5f','rock_peak_ruins','iceberg_ruins','iron_ruins','turnback_cave_giratina_room','spear_pillar_dialga','spear_pillar_palkia','distortion_world_turnback_cave_room','rotoms_room','battleground'];
module.exports=function({root,source,kit,person,trainer,additions,provenance,speciesName,moveName}){
 const {room,draw,exit,link,spot,actor,base}=kit,json=p=>JSON.parse(fs.readFileSync(path.join(source,p),'utf8')),read=p=>fs.readFileSync(path.join(source,p),'utf8');
 const defs={Cresselia:['fullmoon_island_forest',null],Darkrai:['newmoon_island_forest','darkrai'],Shaymin:['flower_paradise','shaymin'],Arceus:['hall_of_origin','arceus'],Regigigas:['snowpoint_temple_b5f','regigigas'],Regirock:['rock_peak_ruins',null],Regice:['iceberg_ruins',null],Registeel:['iron_ruins',null],Dialga:['spear_pillar_dialga','dialga'],Palkia:['spear_pillar_palkia','palkia'],Giratina:['turnback_cave_giratina_room','giratina_altered']};
 const encounters={};
 function field(m,x,y,key,sprite){const p=readPng(path.join(source,'res/graphics/field_sprites/pokemon/'+sprite+'.png'));return actor(m,x,y,'lg-'+key,sprite,{width:p.width,height:p.width,script:'pt:lg-'+key});}
 function npc(m,x,y,key,sprite){return actor(m,x,y,'lg-'+key,sprite,{script:'pt:lg-'+key});}
 function sign(m,x,y,key){m.signs.push({x,y,script:'pt:lg-'+key});}
 for(const[sp,[bank,sprite]]of Object.entries(defs)){
  const species=sp==='Shaymin'?'Shaymin-Land':sp;let level;
  if(sp==='Cresselia')level=+read('src/roaming_pokemon.c').match(/case ROAMING_SLOT_CRESSELIA:\s*species = SPECIES_CRESSELIA;\s*level = (\d+);/)[1];
  else {const match=read('res/field/maps/'+bank+'/scripts.s').match(new RegExp('Start(?:LegendaryBattle|WildBattle|FatefulEncounter) SPECIES_'+sp.toUpperCase()+', (\\d+)'));if(!match)throw Error('Missing legend level '+sp);level=+match[1];}
  encounters[sp]={species,level,source:bank,moves:json('res/pokemon/'+sp.toLowerCase()+'/data.json').learnset.by_level.filter(([l])=>l<=level).slice(-4).map(([,m])=>moveName(m))};
  const m=room('PlatinumLegend'+sp,sp==='Cresselia'?'Fullmoon Island · Moonlit Grove':sp==='Shaymin'?'Flower Paradise':sp==='Arceus'?'Hall of Origin':sp==='Regigigas'?'Snowpoint Temple · Sanctuary':sp==='Giratina'?'Turnback Cave · Giratina':sp+'’s Sanctuary',25,25);
  m.music=base('AcuityCavern').music;exit(m,12,23,'CanalaveCity',0);npc(m.name,4,20,'return-'+sp,'sailor');
  if(sprite)field(m.name,12,7,sp.toLowerCase(),sprite);else if(sp==='Cresselia')field(m.name,12,7,'cresselia','cresselia');else sign(m,12,7,sp.toLowerCase());
  if(/^Regi/.test(sp)&&sp!=='Regigigas'){m.legendDots=[[8,13],[10,11],[12,10],[14,11],[16,13],[10,15],[14,15]];for(const[i,[x,y]]of m.legendDots.entries())sign(m,x,y,'regi-dot-'+sp+'-'+i);}
  if(sp==='Giratina'){sign(m,18,7,'griseous-orb');}if(sp==='Cresselia')sign(m,12,9,'lunar-wing');
  if(m.legendDots){m.patches={};for(const[i,[x,y]]of m.legendDots.entries()){const c=canvas(16,16);c.rect(0,0,16,16,[150,141,150]);c.ellipse(8,8,5,5,[101,224,224]);c.save(path.join(root,'assets/world/maps',m.name+'-patch-dot'+i+'.png'));m.patches['dot'+i]={x,y,w:1,h:1,top:false,collision:[]};}}
  draw(m);
 }
 for(const sp of ['Articuno','Zapdos','Moltres']){const txt=read('src/roaming_pokemon.c'),match=txt.match(new RegExp('case ROAMING_SLOT_'+sp.toUpperCase()+':\\s*species = SPECIES_'+sp.toUpperCase()+';\\s*level = (\\d+);'));encounters[sp]={species:sp,level:+match[1],source:'src/roaming_pokemon.c',moves:json('res/pokemon/'+sp.toLowerCase()+'/data.json').learnset.by_level.filter(([l])=>l<=+match[1]).slice(-4).map(([,m])=>moveName(m))};}
 const maze=room('PlatinumTurnbackMaze','Turnback Cave · Shifting Passages',25,25);exit(maze,12,23,'SpringPath',0);sign(maze,12,8,'turnback-pillar');for(const[i,x]of [5,12,19].entries())sign(maze,x,3,'turnback-door-'+i);draw(maze);
 const orb=room('PlatinumCoronetOrbs','Mt. Coronet · Ancient Reliquary',19,20);exit(orb,9,18,'PlatinumCoronet_Junction',1);sign(orb,6,5,'adamant-orb');sign(orb,12,5,'lustrous-orb');npc('PlatinumCoronet_Junction',27,5,'orb-stairs','hiker');draw(orb);
 const child=room('PlatinumEldritchHouse','Canalave · Eldritch’s House',19,17,true);child.questTV=false;const childDoor=spot('CanalaveCity',15,38,true);link(child,9,15,'CanalaveCity',...childDoor);npc(child.name,9,5,'nightmare-child','school_kid_m');npc('CanalaveCity',14,39,'eldritch','sailor');draw(child);
 const apps=room('PlatinumRotomRoom','Galactic Building · Appliance Room',25,21,true);apps.questTV=false;exit(apps,12,19,'EternaGalactic_1F',0);
 // The original room is an event annex of the Galactic building.
 npc('EternaCity',12,40,'appliance-door','looker');
 for(const[i,key]of ['Heat','Wash','Frost','Fan','Mow','Normal'].entries()){const x=4+(i%3)*8,y=7+Math.floor(i/3)*7;sign(apps,x,y,'appliance-'+key);apps.collision[y*apps.width+x]=1;}draw(apps);
 const grounds=room('PlatinumBattleground','Survival Area · Battleground',25,23,true);grounds.questTV=false;const groundDoor=spot('SurvivalArea',9,15,true);link(grounds,12,21,'SurvivalArea',...groundDoor);npc(grounds.name,12,6,'battleground','buck');draw(grounds);
 npc('PalPark',20,20,'oak-palpark','prof_oak');
 npc('SandgemTown_RowansLab',5,8,'national-dex','prof_oak');npc('CelesticTown',19,20,'legendary-pictures','old_woman');npc('Route212',28,18,'manaphy-book','gentleman');npc('EternaCity',30,42,'oak-birds','prof_oak');npc('JubilifeCity_Mart',5,5,'event-gifts','mystery_gift_deliveryman');npc('FloaromaTown',19,15,'gracidea','old_woman');
 npc('SnowpointCity',15,9,'temple-guide','old_woman');npc('IronIsland',25,7,'registeel-ruins','hiker');npc('Route228',15,20,'regirock-ruins','hiker');npc('Route216',85,23,'regice-ruins','hiker');npc('SpringPath',15,22,'turnback-guide','hiker');
 npc('Route224',8,15,'flower-path','prof_oak');npc('CanalaveCity',32,15,'harbor-inn','gentleman');npc('SpearPillar',14,12,'dialga-portal','cynthia');npc('SpearPillar',18,12,'palkia-portal','cynthia');npc('SpearPillar',16,6,'azure-stairs','prof_oak');npc('FightArea',29,24,'barry-rematch','barry');
 const roster=[];for(const who of ['ROARK','GARDENIA','FANTINA','MAYLENE','WAKE','BYRON','CANDICE','VOLKNER'])roster.push({id:trainer('TRAINER_LEADER_'+who+'_REMATCH'),require:who.toLowerCase()});for(const who of ['CHERYL','RILEY','MIRA','MARLEY','BUCK'])roster.push({id:trainer('TRAINER_'+who+'_BATTLEGROUND'),require:who.toLowerCase()});
 for(const who of ['AARON','BERTHA','FLINT','LUCIAN'])trainer('TRAINER_ELITE_FOUR_'+who+'_REMATCH');trainer('TRAINER_CHAMPION_CYNTHIA_REMATCH');for(const sp of ['TURTWIG','CHIMCHAR','PIPLUP'])trainer('TRAINER_RIVAL_FIGHT_AREA_'+sp);
 for(const b of BANKS)provenance[b]={events:'res/field/maps/'+b+'/events.json',scripts:'res/field/maps/'+b+'/scripts.s'};
 for(const[outside,key,at]of [['CanalaveCity','eldritchHouse',childDoor],['SurvivalArea','battleground',groundDoor]]){if(!kit.maps[outside])kit.maps[outside]=JSON.parse(JSON.stringify(base(outside)));const m=base(outside),c=canvas(16,16);c.box(0,0,16,16,[145,116,93]);c.rect(4,4,8,12,[35,30,41]);c.save(path.join(root,'assets/world/maps',outside+'-patch-'+key+'.png'));m.patches=Object.assign({},m.patches,{[key]:{x:at[0],y:at[1],w:1,h:1,top:false,collision:[]}});m.legendDoorPatches=(m.legendDoorPatches||[]).concat(key);}
 const regionalDex=json('res/pokemon/sinnoh_pokedex.json').slice(1).map(speciesName);
 const homes={CanalaveCity:spot('CanalaveCity',14,40),EternaCity:spot('EternaCity',12,41),SnowpointCity:spot('SnowpointCity',15,10),IronIsland:spot('IronIsland',25,8),Route228:spot('Route228',15,21),Route216:spot('Route216',85,24),SpringPath:spot('SpringPath',15,23),SpearPillar:spot('SpearPillar',16,18),Route224:spot('Route224',8,16)};
 const returns={Cresselia:'CanalaveCity',Darkrai:'CanalaveCity',Shaymin:'Route224',Arceus:'SpearPillar',Regigigas:'SnowpointCity',Regirock:'Route228',Regice:'Route216',Registeel:'IronIsland',Dialga:'SpearPillar',Palkia:'SpearPillar',Giratina:'SpringPath'};
 for(const[sp,map]of Object.entries(returns)){if(!kit.maps[map])kit.maps[map]=JSON.parse(JSON.stringify(base(map)));const outside=base(map),warp=outside.warps.length;outside.warps.push({x:homes[map][0],y:homes[map][1],map:null});const roomMap=base('PlatinumLegend'+sp);roomMap.warps[0].map=map;roomMap.warps[0].warp=warp;}
 maze.warps[0].map='SpringPath';maze.warps[0].warp=base('PlatinumLegendGiratina').warps[0].warp;
 return{encounters,regionalDex,roster,homes,returns};
};module.exports.banks=BANKS;
