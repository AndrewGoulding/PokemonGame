// Remaining Platinum campaign. Explicit 2D room adaptations, source trainer
// records and route provenance; no ROM or DS-script interpreter is required.
"use strict";
const fs=require("fs"),path=require("path"),{canvas,C,text}=require("./orre-art");
const BANKS=["pastoria_city","route_213","route_210_south","celestic_town","celestic_town_cave","canalave_city","canalave_library_3f","canalave_city_gym","iron_island","valor_cavern","lake_verity_low_water","lake_acuity_low_water","snowpoint_city_gym","galactic_hq_b1f","galactic_hq_b2f","galactic_hq_1f","galactic_hq_2f","galactic_hq_3f","galactic_hq_4f","galactic_hq_control_room","spear_pillar","distortion_world_b7f","distortion_world_giratina_room","sunyshore_city","vista_lighthouse","sunyshore_city_gym_room_1","sunyshore_city_gym_room_2","sunyshore_city_gym_room_3","pokemon_league","pokemon_league_aaron_room","pokemon_league_bertha_room","pokemon_league_flint_room","pokemon_league_lucian_room","pokemon_league_champion_room","route_216","route_217","route_218","route_222","route_223"];
function build({root,source,ctx,person,trainer,additions,provenance,moveName,priorMaps={}}){
 const maps={},doors=[],drawings={},out=path.join(root,"assets/world/maps"),json=f=>JSON.parse(fs.readFileSync(path.join(source,f),"utf8"));
 const clone=x=>JSON.parse(JSON.stringify(x));
 function room(name,title,w=17,h=18,color=[81,94,110],floor){
  const m=maps[name]={name,title,region:"sinnoh",type:"indoor",music:"mus_rocket_hideout",width:w,height:h,top:false,collision:[],behavior:Array(w*h).fill(0),elevation:Array(w*h).fill(3),encounter:Array(w*h).fill(0),people:[],warps:[],connections:[],signs:[],triggers:[],hidden:[],borderWidth:2,borderHeight:2};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)m.collision.push(x<1||x>=w-1||y<2||y>=h-1||floor&&!floor(x,y)?1:0);
  drawings[name]={color};return m;
 }
 function render(m,collision=m.collision){const c=canvas(m.width*16,m.height*16),col=drawings[m.name].color;for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++){const open=!collision[y*m.width+x];c.rect(x*16,y*16,16,16,open?col.map(v=>Math.min(240,v+80)):col.map(v=>Math.max(15,v-40)));if(open)c.line(x*16,y*16,x*16+15,y*16,col.map(v=>v+50));}if(/^DistortionWorld_[012]$/.test(m.name)){c.ellipse(9*16+8,5*16+8,7,5,[37,28,57]);c.ellipse(9*16+8,5*16+8,7,5,[200,168,228],1);}for(const s of m.signs){const color=(s.script||"").includes("pad")?[180,112,214]:(s.script||"").includes("release")?[222,77,68]:[216,183,94];c.box(s.x*16,s.y*16,16,16,color,[54,48,71]);c.ellipse(s.x*16+8,s.y*16+8,5,5,[234,225,194],1);}return c;}
 function save(m,c=render(m),suffix=""){c.save(path.join(out,m.name+suffix+".png"));if(!suffix){const b=canvas(32,32);b.rect(0,0,32,32,drawings[m.name].color.map(v=>Math.max(15,v-40)));b.save(path.join(out,m.name+"-border.png"));}}
 function exit(m,x,y,map,warp=0){m.warps.push({x,y,map,warp});m.collision[y*m.width+x]=0;m.behavior[y*m.width+x]=0x65;m.collision[(y+1)*m.width+x]=1;}
 function link(m,x,y,city,ox,oy){exit(m,x,y,city);const old=ctx.WORLD_MAPS[city].warps.findIndex(w=>w.x===ox&&w.y===oy);doors.push({outside:city,x:ox,y:oy,inside:m.name,...(old>=0?{existing:old}:{})});}
 function reference(bank){provenance[bank]={events:"res/field/maps/"+bank+"/events.json",scripts:"res/field/maps/"+bank+"/scripts.s"};}
 function nearest(map,x,y,water=false){const m=maps[map]||priorMaps[map]||ctx.WORLD_MAPS[map],occupied=[...m.people,...(additions[map]||[]),...m.warps,...doors.filter(d=>d.outside===map)];x=Math.max(2,Math.min(m.width-3,x));y=Math.max(3,Math.min(m.height-3,y));for(let r=0;r<Math.max(m.width,m.height);r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.abs(dx)+Math.abs(dy)!==r)continue;const nx=x+dx,ny=y+dy,i=ny*m.width+nx,wet=m.behavior[i]>=0x10&&m.behavior[i]<=0x15;if(nx<1||ny<2||nx>=m.width-1||ny>=m.height-1||m.collision[i]||water&&!wet||!water&&wet)continue;if(occupied.some(p=>p.x===nx&&p.y===ny))continue;
      if(![[0,1],[1,0],[0,-1],[-1,0]].some(([ax,ay])=>{const j=(ny+ay)*m.width+nx+ax,wet2=m.behavior[j]>=0x10&&m.behavior[j]<=0x15;return !m.collision[j]&&(water?wet2:!wet2)&&([0,15].includes(m.elevation[i])||[0,15].includes(m.elevation[j])||m.elevation[i]===m.elevation[j]);}))continue;
      return[nx,ny];}throw Error("No finale floor: "+map);}
 function actor(map,x,y,key,sprite,extra={}){const at=nearest(map,x,y);person(map,...at,key,sprite,extra);}
 function trainers(bank,map,positions){const file=path.join(source,"res/field/maps/"+bank+"/events.json");if(!fs.existsSync(file))return;let n=0;for(const e of json("res/field/maps/"+bank+"/events.json").object_events.filter(e=>e.trainer)){const id=trainer(e.trainer.id),wet=/TRAINER_SWIMMER_/.test(e.trainer.id),p=positions?positions(e,n++):[e.x,e.z],at=nearest(map,...p,wet);person(map,...at,id,e.graphics_id.replace("OBJ_EVENT_GFX_","").toLowerCase(),{water:wet,trainer:{id,sight:Math.min(3,e.trainer.sight_range),double:!!json("res/trainers/data/"+e.trainer.id.replace("TRAINER_","").toLowerCase()+".json").double_battle},movement:"face_"+({DIR_NORTH:"up",DIR_SOUTH:"down",DIR_EAST:"right",DIR_WEST:"left"}[e.initial_dir]||"down"),platinumEvent:{bank,id:e.id,x:e.x,z:e.z}});}reference(bank);}
 // Byron's lift platforms remain physically separated until an elevator ride.
 const byron=room("CanalaveCity_Gym","Canalave Gym · Lifts",33,29,[108,102,72],(x,y)=>x>=3&&x<=29&&(y>=22&&y<=27||y>=13&&y<=18||y>=2&&y<=7));byron.music="mus_gym";
 link(byron,16,27,"CanalaveCity",15,25);trainers("canalave_city_gym",byron.name);actor(byron.name,16,3,"byron","byron");actor(byron.name,15,25,"lift-guide","gym_guide");
 byron.lifts=[{x:8,y:23,to:[8,17]},{x:24,y:14,to:[24,5]},{x:8,y:18,to:[8,24]},{x:24,y:6,to:[24,15]}];
 for(const [i,l]of byron.lifts.entries())byron.signs.push({x:l.x,y:l.y,script:"pt:lift-"+i});const bc=render(byron);for(const l of byron.lifts){bc.box(l.x*16,l.y*16,16,16,C.gold,[84,69,38]);text(bc,"L",l.x*16+5,l.y*16+4,C.dark);}save(byron,bc);
 // Snowpoint uses the shared ice/sliding engine. Push each snowball along
 // its lane to the eastern bank; the central stairway opens in three parts.
 const snow=room("SnowpointCity_Gym","Snowpoint Gym · Ice",24,30,[103,148,176]);snow.music="mus_gym";link(snow,11,28,"SnowpointCity",15,35);
 const rows=[21,14,7],lanes=[24,17,10];for(const row of rows)for(let x=1;x<23;x++)snow.collision[row*24+x]=1;
 for(const y of lanes)for(let x=2;x<=20;x++)snow.behavior[y*24+x]=0x23;
 trainers("snowpoint_city_gym",snow.name);actor(snow.name,11,3,"candice","candice");actor(snow.name,12,27,"snow-guide","gym_guide");
 for(const[i,y]of lanes.entries())(additions[snow.name]||(additions[snow.name]=[])).push({x:11,y,script:"pt:snowball-"+i,id:"snowball"+i,localId:"PT_SNOWBALL_"+i,sprite:"pt_snowball",width:16,height:16,frames:1,movement:"face_down",rangeX:0,rangeY:0,inanimate:true,iceBlock:true,sinnohSnowball:i});
 snow.patches={};for(let mask=0;mask<8;mask++){const collision=snow.collision.slice(),changes=rows.map((y,i)=>[11,y,mask&(1<<i)?0:1]);for(const[x,y,v]of changes)collision[y*24+x]=v;const c=render(snow,collision);for(const y of lanes){for(let x=2;x<=20;x++){c.rect(x*16,y*16,16,16,[174,222,240]);c.line(x*16,y*16+15,x*16+15,y*16+2,[225,246,252]);}c.box(20*16,y*16,16,16,[146,197,218],[69,120,148]);}snow.patches["snow"+mask]={x:0,y:0,w:24,h:30,top:false,collision:changes};save(snow,c,"-patch-snow"+mask);if(!mask)save(snow,c);}
 const sb=canvas(16,16);sb.ellipse(8,8,7,7,[233,245,251]);sb.ellipse(6,5,4,3,[255,255,255]);sb.line(4,12,11,13,[153,191,211],2);sb.save(path.join(root,"assets/world/sprites/pt_snowball.png"));
 // Rotating gear platforms: each switch changes the side bridge and aligns
 // the northern bridge at a different rotation in each successive room.
 for(let n=0;n<3;n++){
  const m=room(n?"SunyshoreGym_Room"+(n+1):"SunyshoreCity_Gym","Sunyshore Gym · Gear "+(n+1),18,17,[77,103,108],(x,y)=>x>=5&&x<=12&&y>=5&&y<=10||x>=6&&x<=10&&y>=13&&y<=14||x>=7&&x<=9&&y>=2&&y<=3||x>=1&&x<=3&&y>=5&&y<=9||x>=14&&x<=16&&y>=5&&y<=9||x===8&&y>=10&&y<=13);
  m.music="mus_gym";m.gear=n;exit(m,8,14,n? (n===1?"SunyshoreCity_Gym":"SunyshoreGym_Room2"):"SunyshoreCity",n?1:0);if(!n)doors.push({outside:"SunyshoreCity",x:15,y:8,inside:m.name});
  if(n<2){m.warps.push({x:8,y:2,map:"SunyshoreGym_Room"+(n+2),warp:0});m.behavior[2*18+8]=0x64;}else actor(m.name,8,2,"volkner","volkner");
  m.signs.push({x:8,y:8,script:"pt:gear-"+n});m.patches={};
  trainers("sunyshore_city_gym_room_"+(n+1),m.name,(e,i)=>[[2,6],[15,6],[2,9],[15,9]][i%4]);
  for(let turn=0;turn<4;turn++){const north=turn===n+1,collision=m.collision.slice(),changes=[[8,4,north?0:1],[4,7,!north&&turn%2?0:1],[13,7,!north&&!(turn%2)?0:1]];for(const[x,y,v]of changes)collision[y*18+x]=v;const c=render(m,collision);c.ellipse(136,128,38,29,[211,179,78],3);c.ellipse(136,128,7,7,[102,87,44]);c.line(136,128,north?136:turn%2?68:204,north?66:128,[225,207,141],7);m.patches["gear"+turn]={x:0,y:0,w:18,h:17,top:false,collision:changes};save(m,c,"-patch-gear"+turn);if(!turn)save(m,c);}
 }
 // Story interiors and the three floating Distortion platforms.
 const lib=room("CanalaveLibrary_3F","Canalave Library",17,17,[104,92,66]);link(lib,8,15,"CanalaveCity",12,11);actor(lib.name,8,5,"library","prof_rowan");save(lib);
 const light=room("VistaLighthouse","Vista Lighthouse",13,16,[83,130,151]);link(light,6,14,"SunyshoreCity",58,49);actor(light.name,6,4,"volkner-intro","volkner");save(light);
 for(const [name,title,bank]of [["GalacticHQ_1F","Galactic HQ","galactic_hq_1f"],["GalacticHQ_2F","Galactic HQ · Warp Floor","galactic_hq_2f"],["GalacticHQ_Cyrus","Galactic HQ · Cyrus","galactic_hq_4f"],["GalacticHQ_Lab","Galactic HQ · Laboratory","galactic_hq_control_room"]]){
  const m=room(name,title,25,22,[82,94,111]);if(name==="GalacticHQ_1F")link(m,12,20,"VeilstoneCity",47,15);else exit(m,12,20,"GalacticHQ_1F",0);
  trainers(bank,m.name);save(m);
 }
 const basement=room("GalacticWarehouse_Basement","Galactic Warehouse · Basement",25,22,[86,92,110]);exit(basement,12,20,"VeilstoneWarehouse",0);trainers("galactic_hq_b1f",basement.name);trainers("galactic_hq_b2f",basement.name);actor(basement.name,12,4,"galactic-key","gym_guide");save(basement);
 priorMaps.VeilstoneWarehouse.signs.push({x:8,y:3,script:"pt:warehouse-basement"});
 maps.GalacticHQ_1F.signs.push({x:12,y:3,script:"pt:hq-stairs"});maps.GalacticHQ_2F.signs.push({x:5,y:4,script:"pt:hq-pad-wrong"},{x:19,y:4,script:"pt:hq-pad-right"});
 actor("GalacticHQ_Cyrus",12,5,"cyrus-hq","cyrus");maps.GalacticHQ_Cyrus.signs.push({x:12,y:3,script:"pt:hq-lab"});actor("GalacticHQ_Lab",8,6,"saturn-hq","saturn");maps.GalacticHQ_Lab.signs.push({x:8,y:3,script:"pt:release-trio"});
 for(const [x,y,key,sprite]of [[14,4,"captive-azelf","azelf"],[2,4,"captive-mesprit","mesprit"],[8,10,"captive-uxie","uxie"]])actor("GalacticHQ_Lab",x,y,key,sprite);
 for(let n=0;n<3;n++){
  const m=room("DistortionWorld_"+n,"Distortion World · Lake Platform "+(n+1),19,20,[84,61,110],(x,y)=>x>=4&&x<=14&&y>=3&&y<=16||x>=8&&x<=10&&y>=16&&y<=18);exit(m,9,18,n?"DistortionWorld_"+(n-1):"SpearPillar",n?0:0);
  (additions[m.name]||(additions[m.name]=[])).push({x:9,y:8,script:"EventScript_StrengthBoulder",id:"stone"+n,localId:"PT_DISTORTION_STONE_"+n,sprite:"em_misc_pushable_boulder",width:16,height:16,frames:1,inanimate:true,movement:"face_down",rangeX:0,rangeY:0,sinnohStone:n});m.behavior[5*m.width+9]=0x20;actor(m.name,6,5,"distortion-guide-"+n,["uxie","mesprit","azelf"][n]);m.signs.push({x:9,y:3,script:"pt:distortion-next-"+n});save(m);
 }
 const nexus=room("DistortionWorld_Nexus","Distortion World · Giratina",19,22,[73,54,93]);exit(nexus,9,20,"DistortionWorld_2",0);actor(nexus.name,9,6,"cyrus-distortion","cyrus");actor(nexus.name,9,10,"giratina","giratina_origin",{width:128,height:128,frames:3});nexus.signs.push({x:9,y:3,script:"pt:distortion-exit"});save(nexus);
 // Existing Center art/services, including a League healing point before
 // the gauntlet. Elite rooms deliberately have no nurses or healing event.
 for(const[city,service,at]of [["SunyshoreCity","PokemonCenter_1F",[31,44]],["SunyshoreCity","Mart",[24,29]],["PokemonLeague","PokemonCenter_1F",[11,60]]]){const t=ctx.WORLD_MAPS["SandgemTown_"+service],m=clone(t);m.name=city+"_"+service;m.title=city.replace(/([a-z])([A-Z])/g,"$1 $2")+" · "+service;m.image=t.name;m.warps=[{x:t.warps[0].x,y:t.warps[0].y,map:city,warp:0}];for(const p of m.people)p.script=p.script.replace("SandgemTown",city);maps[m.name]=m;doors.push({outside:city,x:at[0],y:at[1],inside:m.name});}
 const lobby=room("SinnohLeague_Lobby","Sinnoh Pokémon League",17,18,[115,103,76]);link(lobby,8,16,"PokemonLeague",16,12);actor(lobby.name,8,5,"league-register","gym_guide");save(lobby);
 const elite=["aaron","bertha","flint","lucian","cynthia"];
 for(const[i,key]of elite.entries()){const m=room("SinnohLeague_"+key,"Sinnoh League · "+key[0].toUpperCase()+key.slice(1),11,17,[[66,116,63],[142,111,76],[150,74,52],[109,77,138],[95,111,157]][i]);m.leagueRoom=i;m.music="mus_gym";exit(m,5,15,lobby.name,0);actor(m.name,5,6,"league-"+i,key);if(i<4)m.signs.push({x:5,y:2,script:"pt:league-door-"+i});save(m);}
 // Essentials' marked climbing faces need the shared Rock Climb behavior.
 const acuity=maps.AcuityLakefront=clone(ctx.WORLD_MAPS.AcuityLakefront);
 for(let y=40;y<=45;y++)acuity.behavior[y*acuity.width+25]=0xf1;
 const climbArt=canvas(16,96);for(let y=0;y<96;y+=8){climbArt.rect(0,y,16,8,[119,131,150]);climbArt.line(4,y+2,10,y+2,[222,231,239],2);climbArt.line(7,y+6,14,y+6,[66,80,104],2);}climbArt.save(path.join(out,"AcuityLakefront-patch-climb.png"));acuity.patches={climb:{x:25,y:40,w:1,h:6,top:false,collision:[]}};
 // A continuous main-story mountain passage avoids dead ends in the
 // older multi-map cave export, while retaining those maps for optional travel.
 const coronetBase=maps.MtCoronet_3=clone(priorMaps.MtCoronet_3||ctx.WORLD_MAPS.MtCoronet_3);
 const mountainStairs=canvas(16,32);for(let y=0;y<32;y+=4){mountainStairs.rect(0,y,16,4,[151,151,161]);mountainStairs.line(0,y,15,y,[63,62,79]);}mountainStairs.save(path.join(out,"MtCoronet_3-patch-northStairs.png"));coronetBase.patches=Object.assign({},coronetBase.patches,{northStairs:{x:30,y:11,w:1,h:2,top:false,collision:[]}});for(let y=11;y<=12;y++){const i=y*coronetBase.width+30;coronetBase.collision[i]=0;coronetBase.behavior[i]=0;coronetBase.elevation[i]=15;}
 for(const i of [1,2]){coronetBase.warps[i].map="PlatinumCoronet_Junction";coronetBase.warps[i].warp=0;}
 for(const[name,title]of [["PlatinumCoronet_Junction","Mt. Coronet · Junction"],["PlatinumCoronet_NorthPass","Mt. Coronet · Northern Passage"],["PlatinumCoronet_Summit","Mt. Coronet · Summit Ascent"]]){
  const m=room(name,title,33,35,[100,92,112]);m.type="cave";m.music="dp_oreburgh_gate";
  for(const[y,gap]of [[10,7],[20,25]])for(let x=1;x<32;x++)if(Math.abs(x-gap)>1)m.collision[y*33+x]=1;
  exit(m,16,33,name.endsWith("Junction")?"MtCoronet_3":"PlatinumCoronet_Junction",name.endsWith("Junction")?4:1);
  const dest=name.endsWith("Junction")?"PlatinumCoronet_NorthPass":name.endsWith("NorthPass")?"Route216":"SpearPillar";
  m.warps.push({x:16,y:2,map:dest,warp:name.endsWith("NorthPass")?1:0});m.behavior[2*33+16]=0x64;save(m);
 }
 const northRoute=maps.Route216=clone(ctx.WORLD_MAPS.Route216);northRoute.warps[1].map="PlatinumCoronet_NorthPass";northRoute.warps[1].warp=1;northRoute.collision[25*northRoute.width+94]=0;
 maps.PlatinumCoronet_Junction.signs.push({x:24,y:5,script:"pt:coronet-summit"});save(maps.PlatinumCoronet_Junction);
 for(const[bank,map]of [["mt_coronet_2f","PlatinumCoronet_Junction"],["mt_coronet_b1f","PlatinumCoronet_NorthPass"],["mt_coronet_4f","PlatinumCoronet_Summit"],["mt_coronet_5f","PlatinumCoronet_Summit"],["mt_coronet_6f","PlatinumCoronet_Summit"]])trainers(bank,map,(e,i)=>[6+i*4,6+i*4]);
 // The old Victory Road export marks most drawn floor as solid. Keep those
 // optional base maps intact and route the campaign through three explicit
 // cavern adaptations with the imported 1F/2F/B1F trainer records.
 const leagueOutside=maps.PokemonLeague=clone(ctx.WORLD_MAPS.PokemonLeague);
 const roadNames=["PlatinumVictoryRoad_1F","PlatinumVictoryRoad_2F","PlatinumVictoryRoad_B1F"];
 for(let n=0;n<3;n++){
  const m=room(roadNames[n],"Victory Road · "+["1F","2F","B1F"][n],33,35,[101,85,67]);m.type="cave";m.music="dp_victory_road";
  for(const[y,gap]of [[8,6],[16,26],[24,6]])for(let x=1;x<32;x++)if(Math.abs(x-gap)>1)m.collision[y*33+x]=1;
  exit(m,16,33,n?roadNames[n-1]:"PokemonLeague",n?1:0);
  m.warps.push({x:16,y:2,map:n===2?"PokemonLeague":roadNames[n+1],warp:n===2?10:0});m.behavior[2*33+16]=0x64;
  const original=ctx.WORLD_MAPS[["VictoryRoad","VictoryRoad_2","VictoryRoad_3"][n]];m.wild=clone(original.wild);m.water=clone(original.water);
  save(m);
 }
 for(const w of leagueOutside.warps)if(w.map==="VictoryRoad"){w.map=w.y===60?roadNames[0]:roadNames[2];w.warp=w.y===60?0:1;}
 const mouth=canvas(16,16);mouth.ellipse(8,9,8,8,[57,43,42]);mouth.ellipse(8,11,5,7,[23,21,29]);mouth.save(path.join(out,"PokemonLeague-patch-cave.png"));
 // Two patch keys share the same art via separate generated filenames.
 mouth.save(path.join(out,"PokemonLeague-patch-upperCave.png"));leagueOutside.patches={cave:{x:23,y:60,w:1,h:1,top:false,collision:[]},upperCave:{x:23,y:45,w:1,h:1,top:false,collision:[]}};
 // Restore the drawn eastern gate and Sunyshore's elevated solar walkway.
 const gate=clone(ctx.WORLD_MAPS.Route208_Gate);gate.name="SunyshoreGate";gate.title="Route 222 · Sunyshore Gate";gate.image="Route208_Gate";gate.people=[];gate.signs=[];gate.triggers=[];gate.hidden=[];gate.connections=[];
 gate.warps=[{x:2,y:7,map:"Route222",warp:0},{x:13,y:7,map:"SunyshoreCity",warp:0}];
 gate.warps.forEach((w,i)=>{gate.collision[w.y*gate.width+w.x]=0;gate.behavior[w.y*gate.width+w.x]=i?0x62:0x63;});maps[gate.name]=gate;
 doors.push({outside:"Route222",x:90,y:30,behavior:0x62,inside:gate.name,insideWarp:0},{outside:"SunyshoreCity",x:1,y:51,behavior:0x63,inside:gate.name,insideWarp:1});
 const sun=maps.SunyshoreCity=clone(ctx.WORLD_MAPS.SunyshoreCity),bridge=canvas(29*16,32);
 for(let x=0;x<29;x++){bridge.box(x*16,0,16,32,[77,120,161],[176,191,198]);bridge.line(x*16+8,3,x*16+8,28,[134,170,197]);bridge.line(x*16+2,16,x*16+13,16,[134,170,197]);}
 bridge.save(path.join(out,"SunyshoreCity-patch-solar.png"));
 for(let y=24;y<26;y++)for(let x=27;x<56;x++){const i=y*sun.width+x;sun.collision[i]=0;sun.behavior[i]=0;sun.elevation[i]=15;}
 sun.patches={solar:{x:27,y:24,w:29,h:2,top:false,collision:[]}};
 // Canonical story actors on the imported exterior maps.
 for(const[map,x,y,key,sprite]of [
  ["Route213",66,18,"galactic-chase","grunt_m"],["ValorLakefront",45,26,"secret-potion","cynthia"],["Route210",68,36,"psyduck","psyduck"],
  ["CelesticTownRuins",8,6,"cyrus-celestic","cyrus"],["CelesticTown",16,20,"celestic-grandma","old_woman"],
  ["CanalaveCity",22,18,"barry-canalave","barry"],["IronIsland",20,18,"riley-strength","riley"],["CanalaveCity",14,40,"iron-ferry","sailor"],["IronIsland",19,20,"canalave-ferry","sailor"],["ValorCavern",22,15,"saturn-valor","saturn"],
  ["LakeVerity",44,39,"mars-verity","mars"],["Route217",12,42,"rock-climb","hiker"],["LakeAcuity",10,45,"acuity-scene","jupiter"],
  ["VeilstoneWarehouse",5,5,"warehouse-key","looker"],["VeilstoneCity",47,15,"hq-guard","grunt_m"],["SpearPillar",16,18,"spear-battle","mars"],
  ["Route222",5,16,"sunyshore-block","gym_guide"],["SunyshoreCity",31,40,"flint-intro","flint"],["SunyshoreCity",27,4,"jasmine-waterfall","jasmine"],
  ["PokemonLeague",14,14,"barry-league","barry"]])actor(map,x,y,key,sprite);
 (additions.SpearPillar||(additions.SpearPillar=[]));
 const spear=maps.SpearPillar=clone(ctx.WORLD_MAPS.SpearPillar);spear.warps[0].map="PlatinumCoronet_Summit";spear.warps[0].warp=1;spear.signs.push({x:16,y:10,script:"pt:distortion-enter"});const portal=canvas(16,16);portal.ellipse(8,8,7,7,[69,40,99]);portal.ellipse(8,8,5,6,[171,118,216],2);portal.save(path.join(out,"SpearPillar-patch-portal.png"));spear.patches={portal:{x:16,y:10,w:1,h:1,top:false,collision:[]}};
 // The drained lake becomes the actual entrance destination after the
 // library explosion, and returns to normal once the trio have been freed.
 const drained=maps.LakeValor_2=clone(ctx.WORLD_MAPS.LakeValor_2);drained.warps[1]={x:46,y:6,map:"ValorLakefront",warp:2};drained.warps[2]={x:46,y:7,map:"ValorLakefront",warp:3};drained.warps.push({x:45,y:6,map:null},{x:45,y:7,map:null});
 // Route/Gym/HQ trainer parties encountered on the main journey.
 const routes={route_216:["Route216",12,20,6,0],route_217:["Route217",14,70,1,-6],route_218:["Route218",14,12,4,0],route_222:["Route222",12,22,6,0],route_223:["Route223",12,55,3,-4],victory_road_1f:["PlatinumVictoryRoad_1F",20,20,5,3],victory_road_2f:["PlatinumVictoryRoad_2F",10,15,4,3],victory_road_b1f:["PlatinumVictoryRoad_B1F",12,15,4,2]};
 for(const[b,[map,x,y,dx,dy]]of Object.entries(routes))trainers(b,map,(e,i)=>[x+dx*i,y+dy*i]);
 for(const id of ["LEADER_BYRON","LEADER_CANDICE","LEADER_VOLKNER","ELITE_FOUR_AARON","ELITE_FOUR_BERTHA","ELITE_FOUR_FLINT","ELITE_FOUR_LUCIAN","CHAMPION_CYNTHIA","GALACTIC_GRUNT_VALOR_LAKEFRONT","GALACTIC_BOSS_CYRUS_CELESTIC_TOWN_RUINS","GALACTIC_BOSS_CYRUS_GALACTIC_HQ","GALACTIC_BOSS_CYRUS_DISTORTION_WORLD","COMMANDER_SATURN_VALOR_CAVERN","COMMANDER_SATURN_GALACTIC_HQ","COMMANDER_MARS_LAKE_VERITY","COMMANDER_MARS_SPEAR_PILLAR","COMMANDER_JUPITER_SPEAR_PILLAR","GALACTIC_GRUNT_SPEAR_PILLAR_1","GALACTIC_GRUNT_SPEAR_PILLAR_2"])trainer("TRAINER_"+id);
 for(const starter of ["TURTWIG","CHIMCHAR","PIPLUP"])for(const prefix of ["RIVAL_CANALAVE_CITY_","RIVAL_POKEMON_LEAGUE_","RIVAL_SPEAR_PILLAR_"])trainer("TRAINER_"+prefix+starter);
 for(const b of BANKS)reference(b);
 const giratina={species:"Giratina-Origin",level:47,moves:json("res/pokemon/giratina/data.json").learnset.by_level.filter(([l])=>l<=47).slice(-4).map(([,m])=>moveName(m))};
 for(const m of Object.values(maps))if(drawings[m.name]&&!m.patches&&(/^(GalacticHQ_|DistortionWorld_|SinnohLeague_)/.test(m.name)))save(m);
 return{maps,doors,legendary:{giratina}};
}
module.exports=build;module.exports.banks=BANKS;
