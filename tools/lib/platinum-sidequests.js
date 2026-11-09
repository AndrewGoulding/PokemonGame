// Optional Platinum stories on explicit 2D maps. Source parties and encounter
// learnsets are imported; adapted geometry and connecting dialogue are local.
"use strict";
const fs=require('fs'),path=require('path'),{canvas,text}=require('./orre-art');
const BANKS=['iron_island_b2f_left_room','old_chateau_back_middle_west_room','acuity_cavern','valor_cavern','verity_cavern','stark_mountain_room_1','stark_mountain_room_2','stark_mountain_room_3'];
function build({root,source,ctx,priorMaps,person,trainer,additions,provenance,moveName,speciesName}){
 const maps={},doors=[],out=path.join(root,'assets/world/maps'),clone=x=>JSON.parse(JSON.stringify(x));
 const base=n=>maps[n]||priorMaps[n]||ctx.WORLD_MAPS[n],json=p=>JSON.parse(fs.readFileSync(path.join(source,p),'utf8'));
 function room(name,title,w=25,h=27,wood=false){const m=maps[name]={name,title,region:'sinnoh',type:wood?'indoor':'cave',music:wood?'dp_eterna_forest':'dp_oreburgh_gate',width:w,height:h,top:false,borderWidth:2,borderHeight:2,collision:[],behavior:Array(w*h).fill(0),elevation:Array(w*h).fill(3),encounter:Array(w*h).fill(0),warps:[],people:[],connections:[],signs:[],triggers:[],hidden:[],questWood:wood};for(let y=0;y<h;y++)for(let x=0;x<w;x++)m.collision.push(x<1||x>=w-1||y<2||y>=h-1?1:0);return m;}
 function draw(m){const c=canvas(m.width*16,m.height*16),wood=m.questWood;for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++){const solid=m.collision[y*m.width+x],v=(x*13+y*7)%11;const col=wood?(solid?[61,41,49]:[123+v,88+v,64+v]):solid?[55+v,49+v,64+v]:[144+v,135+v,143+v];c.rect(x*16,y*16,16,16,col);if(!solid){c.line(x*16,y*16+15,x*16+15,y*16+15,wood?[89,64,47]:[119,110,123]);if(!wood)c.line(x*16+3,y*16+5,x*16+8,y*16+3,[162,155,167]);}else if(!wood)c.line(x*16,y*16+3,x*16+15,y*16+3,[91,80,104]);}
  for(const s of m.signs){c.box(s.x*16,s.y*16,16,16,[200,171,94],[58,48,56]);text(c,'?',s.x*16+5,s.y*16+4,[52,41,57]);}
  if(m.questWood){for(const x of [2,m.width-4]){c.box(x*16,3*16,32,48,[86,55,48]);for(let i=0;i<6;i++)c.rect(x*16+3+i*4,3*16+5,3,30,[113+i*13,84,92]);}c.box(11*16,4*16,32,32,[86,84,104]);c.rect(11*16+4,4*16+4,24,18,[137,182,174]);c.line(11*16+6,4*16+11,11*16+25,4*16+11,[213,222,180]);}
  if(m.questGoals)for(const[x,y]of m.questGoals)c.ellipse(x*16+8,y*16+8,7,5,[63,40,47],2);
  c.save(path.join(out,m.name+'.png'));const b=canvas(32,32);b.rect(0,0,32,32,[55,49,64]);b.save(path.join(out,m.name+'-border.png'));
 }
 function exit(m,x,y,dest,warp=0){m.warps.push({x,y,map:dest,warp});m.behavior[y*m.width+x]=0x65;m.collision[(y+1)*m.width+x]=1;}
 function link(m,x,y,outside,ox,oy,existing){exit(m,x,y,outside);doors.push({outside,x:ox,y:oy,inside:m.name,...(existing==null?{}:{existing})});}
 // Only place exterior actors on the largest connected dry walking component.
 function spot(name,x,y,door=false){const m=base(name),seen=new Set(),groups=[];for(let y=1;y<m.height-1;y++)for(let x=1;x<m.width-1;x++){const i=y*m.width+x;if(seen.has(i)||m.collision[i]||m.behavior[i]>=16&&m.behavior[i]<=21)continue;const q=[[x,y]];seen.add(i);for(let n=0;n<q.length;n++)for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=q[n][0]+dx,ny=q[n][1]+dy,j=ny*m.width+nx;if(nx<1||ny<1||nx>=m.width-1||ny>=m.height-1||seen.has(j)||m.collision[j]||m.behavior[j]>=16&&m.behavior[j]<=21)continue;if(![0,15].includes(m.elevation[j])&&![0,15].includes(m.elevation[ny*m.width+nx-dx-dy*m.width])&&m.elevation[j]!==m.elevation[ny*m.width+nx-dx-dy*m.width])continue;seen.add(j);q.push([nx,ny]);}groups.push(q);}const occupied=[...m.people,...(additions[name]||[]),...m.warps,...(m.questReserved||[])];const group=groups.sort((a,b)=>b.length-a.length)[0];return group.filter(([x,y])=>!occupied.some(p=>p.x===x&&p.y===y)&&(!door||group.some(p=>p[0]===x&&p[1]===y+1))).sort((a,b)=>Math.abs(a[0]-x)+Math.abs(a[1]-y)-Math.abs(b[0]-x)-Math.abs(b[1]-y))[0];}
 function actor(name,x,y,key,sprite,extra={}){if(!maps[name]) [x,y]=spot(name,x,y);person(name,x,y,'sq-'+key,sprite,extra);return{x,y};}
 const iron=room('PlatinumIronIsland','Iron Island · Riley’s Expedition',33,35);link(iron,16,33,'IronIsland',26,6,0);for(const[y,gap]of [[9,7],[18,25]])for(let x=1;x<32;x++)if(Math.abs(x-gap)>1)iron.collision[y*33+x]=1;
 actor(iron.name,16,29,'riley','riley');actor(iron.name,16,4,'iron-grunts','grunt_m');actor(iron.name,18,4,'iron-grunt-two','grunt_m');
 const chateau=room('PlatinumOldChateau','Old Chateau · Television Room',25,20,true);link(chateau,12,18,'EternaForest_2',62,26);chateau.signs.push({x:12,y:6,script:'pt:sq-rotom-tv'});for(const x of [2,3,21,22])for(let y=3;y<=5;y++)chateau.collision[y*25+x]=1;for(const x of [11,12])for(const y of [4,5])chateau.collision[y*25+x]=1;
 // The entrance uses an existing forest clearing; a visible stone doorway
 // makes the new interior discoverable without an invisible map transition.
 const forest=maps.EternaForest_2=clone(base('EternaForest_2'));const doorAt=spot('EternaForest_2',62,26,true);doors.at(-1).x=doorAt[0];doors.at(-1).y=doorAt[1];const arch=canvas(16,16);arch.box(0,0,16,16,[131,113,133]);arch.rect(4,5,8,11,[36,31,44]);arch.save(path.join(out,'EternaForest_2-patch-chateau.png'));forest.patches=Object.assign({},forest.patches,{chateau:{x:doorAt[0],y:doorAt[1],w:1,h:1,top:false,collision:[]}});actor('EternaForest_2',doorAt[0]+2,doorAt[1]+2,'chateau-guide','old_woman');
 const lakes=[['Azelf','LakeValor',26,24],['Uxie','LakeAcuity',26,26],['Mesprit','LakeVerity',30,18]];
 for(const[sp,outside,x,y]of lakes){const m=room('PlatinumLake'+sp,sp+'’s Cavern',19,20);m.music='dp_lake_cave';link(m,9,18,outside,x,y,2);actor(m.name,9,6,sp.toLowerCase(),sp.toLowerCase());}
 const mountain=maps.StarkMountain=clone(base('StarkMountain'));const mouthAt=spot('StarkMountain',22,32,true);arch.save(path.join(out,'StarkMountain-patch-questDoor.png'));mountain.patches=Object.assign({},mountain.patches,{questDoor:{x:mouthAt[0],y:mouthAt[1],w:1,h:1,top:false,collision:[]}});
 const entry=room('PlatinumStarkEntrance','Stark Mountain · Galactic Return',19,24);link(entry,9,22,'StarkMountain',mouthAt[0],mouthAt[1],0);actor(entry.name,9,13,'stark-mars','mars');actor(entry.name,9,7,'stark-jupiter','jupiter');actor(entry.name,4,19,'stark-return','buck');entry.signs.push({x:9,y:3,script:'pt:sq-stark-interior'});
 const stark=room('PlatinumStarkInterior','Stark Mountain · Buck’s Expedition',33,35);exit(stark,16,33,entry.name,0);actor(stark.name,16,29,'buck','buck');stark.signs.push({x:16,y:3,script:'pt:sq-stark-chamber'});stark.questGoals=[[9,10],[23,10]];stark.questReserved=[];for(const x of [9,23])for(let y=9;y<=16;y++)stark.questReserved.push({x,y});
 for(const[n,x]of [9,23].entries()){stark.behavior[10*33+x]=0x20;(additions[stark.name]||(additions[stark.name]=[])).push({id:'sq-stone-'+n,localId:'PT_SQ_STONE_'+n,x,y:14,script:'EventScript_StrengthBoulder',sprite:'em_misc_pushable_boulder',width:16,height:16,frames:1,inanimate:true,movement:'face_down',rangeX:0,rangeY:0,sinnohQuestStone:n});}
 const chamber=room('PlatinumStarkChamber','Stark Mountain · Magma Stone',19,22);exit(chamber,9,20,stark.name,0);actor(chamber.name,9,6,'charon','charon');actor(chamber.name,12,7,'looker','looker');actor(chamber.name,9,10,'heatran','heatran');
 actor('SnowpointCity',24,53,'battle-ferry','sailor');actor('FightArea',24,23,'snowpoint-ferry','sailor');actor('FightArea',28,22,'battle-zone-guide','buck');actor('SurvivalArea',17,22,'buck-return','buck');
 const travel={};for(const[n,x,y]of [['SnowpointCity',24,52],['FightArea',24,24],['SurvivalArea',18,23]]){const at=spot(n,x,y);travel[n]={map:n,x:at[0],y:at[1],facing:'up'};}
 const banks={iron_island_b2f_left_room:iron.name,stark_mountain_room_2:stark.name};
 for(const[bank,name]of Object.entries(banks)){const enc=json('res/field/maps/'+bank+'/encounters.json'),m=maps[name];m.wild={rate:enc.land_rate,weights:[20,20,10,10,10,10,5,5,4,4,1,1],slots:enc.land_encounters.map((e,i)=>({species:speciesName(i===2||i===3?enc.day[i-2]:e.species),min:e.level,max:e.level,...(i===2||i===3?{morning:speciesName(e.species),night:speciesName(enc.night[i-2])}:{})}))};for(let y=2;y<m.height-2;y++)for(let x=1;x<m.width-1;x++)if(!m.collision[y*m.width+x])m.encounter[y*m.width+x]=1;let i=0;for(const e of json('res/field/maps/'+bank+'/events.json').object_events.filter(e=>e.trainer)){const id=trainer(e.trainer.id),m=maps[name];const at=spot(name,4+(i%5)*5,6+Math.floor(i/5)*6);i++;person(name,...at,id,e.graphics_id.replace('OBJ_EVENT_GFX_','').toLowerCase(),{trainer:{id,sight:2},platinumEvent:{bank,id:e.id,x:e.x,z:e.z}});}}
 for(const id of ['RILEY_IRON_ISLAND','BUCK_STARK_MOUNTAIN','GALACTIC_GRUNT_IRON_ISLAND_1','GALACTIC_GRUNT_IRON_ISLAND_2','COMMANDER_MARS_STARK_MOUNTAIN','COMMANDER_JUPITER_STARK_MOUNTAIN'])trainer('TRAINER_'+id);
 for(const b of BANKS)provenance[b]={events:'res/field/maps/'+b+'/events.json',scripts:'res/field/maps/'+b+'/scripts.s'};
 const encounters={};
 for(const[sp,bank]of Object.entries({Rotom:'old_chateau_back_middle_west_room',Azelf:'valor_cavern',Uxie:'acuity_cavern',Mesprit:null,Heatran:'stark_mountain_room_3'})){
  const file=bank?'res/field/maps/'+bank+'/scripts.s':'src/roaming_pokemon.c',script=fs.readFileSync(path.join(source,file),'utf8');
  const match=bank?script.match(new RegExp('Start(?:Legendary|Wild)Battle SPECIES_'+sp.toUpperCase()+', (\\d+)')):script.match(/case ROAMING_SLOT_MESPRIT:\s*species = SPECIES_MESPRIT;\s*level = (\d+);/);
  if(!match)throw Error('Missing source encounter level: '+sp);const level=Number(match[1]);
  encounters[sp]={species:sp,level,source:file,moves:json('res/pokemon/'+sp.toLowerCase()+'/data.json').learnset.by_level.filter(([l])=>l<=level).slice(-4).map(([,m])=>moveName(m))};
 }

 for(const m of Object.values(maps))if(m.name.startsWith('Platinum'))draw(m);
 return{maps,doors,sidequests:{encounters,travel}};
}
module.exports=build;module.exports.banks=BANKS;
