'use strict';
const fs=require('fs'),path=require('path'),{canvas}=require('./orre-art');
const BANKS=['wayward_cave_1f','wayward_cave_b1f','victory_road_1f_room_2',...Array.from({length:5},(_,i)=>'route_209_lost_tower_'+(i+1)+'f')];
module.exports=function({root,source,kit,trainer,person,additions,provenance,speciesName}){
 const{base,room,draw,link,exit,spot,actor}=kit,json=p=>JSON.parse(fs.readFileSync(path.join(source,p),'utf8'));const npc=(map,x,y,key,sprite)=>{if(!map.startsWith('PlatinumExp'))[x,y]=spot(map,x,y);return actor(map,x,y,key,sprite,{script:'pt:exp-'+key});};
 function doorway(m,outside,x,y){const at=spot(outside,x,y,true);link(m,Math.floor(m.width/2),m.height-2,outside,...at);if(!kit.maps[outside])kit.maps[outside]=JSON.parse(JSON.stringify(base(outside)));const b=base(outside),key='exp'+m.name,c=canvas(16,16);c.box(0,0,16,16,[128,116,135]);c.rect(4,5,8,11,[35,30,41]);c.save(path.join(root,'assets/world/maps',outside+'-patch-'+key+'.png'));b.patches=Object.assign({},b.patches,{[key]:{x:at[0],y:at[1],w:1,h:1,top:false,collision:[]}});b.legendDoorPatches=(b.legendDoorPatches||[]).concat(key);}
 function maze(m){for(const[y,gap]of [[9,7],[18,25]])for(let x=1;x<m.width-1;x++)if(Math.abs(x-gap)>1)m.collision[y*m.width+x]=1;}
 function sourceMap(m,bank){const file='res/field/maps/'+bank+'/encounters.json';if(fs.existsSync(path.join(source,file))){const e=json(file);m.wild={rate:e.land_rate,weights:[20,20,10,10,10,10,5,5,4,4,1,1],slots:e.land_encounters.map((a,i)=>({species:speciesName(i===2||i===3?e.day[i-2]:a.species),min:a.level,max:a.level,...(i===2||i===3?{morning:speciesName(a.species),night:speciesName(e.night[i-2])}:{})}))};for(let y=2;y<m.height-2;y++)for(let x=1;x<m.width-1;x++)if(!m.collision[y*m.width+x])m.encounter[y*m.width+x]=1;}
 const ev='res/field/maps/'+bank+'/events.json';if(fs.existsSync(path.join(source,ev))){let i=0;for(const e of json(ev).object_events.filter(e=>e.trainer)){const id=trainer(e.trainer.id),at=spot(m.name,4+(i%5)*5,6+Math.floor(i++/5)*7);person(m.name,...at,id,e.graphics_id.replace('OBJ_EVENT_GFX_','').toLowerCase(),{trainer:{id,sight:2},platinumEvent:{bank,id:e.id,x:e.x,z:e.z}});}}}
 const mira=room('PlatinumExpWayward','Wayward Cave · Mira’s Expedition',33,35);maze(mira);mira.dark=true;doorway(mira,'Route206',25,12);npc(mira.name,27,5,'mira','mira');sourceMap(mira,'wayward_cave_1f');trainer('TRAINER_MIRA_WAYWARD_CAVE');
 const basement=room('PlatinumExpWaywardB1F','Wayward Cave · Hidden Basement',33,27);doorway(basement,'Route206',20,10);sourceMap(basement,'wayward_cave_b1f');basement.signs.push({x:16,y:4,script:'pt:exp-earthquake'});basement.signs.push({x:9,y:15,script:'pt:exp-bike-ramp'});
 const marley=room('PlatinumExpMarley','Victory Road · Marley’s Expedition',33,35);maze(marley);exit(marley,16,33,'PlatinumVictoryRoad_B1F',0);npc(marley.name,16,29,'marley','marley');marley.signs.push({x:16,y:3,script:'pt:exp-marley-exit'});sourceMap(marley,'victory_road_1f_room_2');trainer('TRAINER_MARLEY_VICTORY_ROAD');npc('PlatinumVictoryRoad_B1F',5,9,'marley-entrance','hiker');
 // Return aliases are destinations only, never extra invisible entrances.
 const old=base('PlatinumVictoryRoad_B1F');old.warps.push({x:5,y:10,map:null});marley.warps[0].warp=old.warps.length-1;
 npc('SolaceonRuins',10,15,'defog-hm','ruin_maniac');
 const route224=spot('Route224',8,20);npc('Route224',route224[0]+2,route224[1],'marley-return','hiker');
 for(let i=1;i<=5;i++){const m=room('PlatinumExpLostTower'+i,'Lost Tower · '+i+'F',19,20);if(i===1)doorway(m,'Route209',35,20);else link(m,9,18,'PlatinumExpLostTower'+(i-1),9,3);if(i<5)m.signs.push({x:8,y:3,script:'pt:exp-tower-stairs'});if(i>=3)m.sinnohFog=true;sourceMap(m,'route_209_lost_tower_'+i+'f');if(i===5){npc(m.name,6,6,'spell-tag','old_woman');npc(m.name,12,6,'cleanse-tag','old_woman');}}
 for(const m of Object.values(kit.maps))if(m.name.startsWith('PlatinumExp'))draw(m);
 for(const bank of BANKS)provenance[bank]={events:'res/field/maps/'+bank+'/events.json',scripts:'res/field/maps/'+bank+'/scripts.s'};
 return{route224:{map:'Route224',x:route224[0],y:route224[1],facing:'down'}};
};module.exports.banks=BANKS;
