// The continuous middle campaign: route parties, three Gyms and town services.
// Maps are explicit 2D adaptations; DS models and script bytecode are not read.
"use strict";
const fs = require("fs"), path = require("path");
const { canvas, C, text } = require("./orre-art");
module.exports = function ({ root, source, ctx, person, trainer, additions, provenance }) {
  const maps = {}, doors = [], out = path.join(root, "assets/world/maps");
  const json = f => JSON.parse(fs.readFileSync(path.join(source, f), "utf8"));
  const stages = {};
  function room(name, title, w, h, color = [100, 80, 126]) {
    const m = maps[name] = { name, title, region: "sinnoh", type: "indoor", music: "mus_gym", battleScene: "gym", width: w, height: h, top: false,
      collision: [], behavior: Array(w*h).fill(0), elevation: Array(w*h).fill(3), encounter: Array(w*h).fill(0), people: [], warps: [], connections: [], signs: [], hidden: [], triggers: [], borderWidth: 2, borderHeight: 2 };
    for (let y=0;y<h;y++) for(let x=0;x<w;x++) m.collision.push(x===0||x===w-1||y<2||y===h-1?1:0);
    stages[name] = { color };
    return m;
  }
  function exit(m, x, y, map, warp=0) { m.warps.push({x,y,map,warp}); m.collision[y*m.width+x]=0; m.behavior[y*m.width+x]=0x65; m.collision[(y+1)*m.width+x]=1; }
  function render(m, collision=m.collision) {
    const c=canvas(m.width*16,m.height*16), col=stages[m.name].color;
    for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++) {
      const solid=collision[y*m.width+x]; c.rect(x*16,y*16,16,16,solid?col:col.map(v=>Math.min(245,v+95)));
      if(!solid){c.line(x*16,y*16,x*16+15,y*16,col.map(v=>v+65));c.p(x*16+15,y*16+15,col);}
    }
    return c;
  }
  function save(m,c,suffix="") { c.save(path.join(out,m.name+suffix+".png")); if(!suffix){const b=canvas(32,32);b.rect(0,0,32,32,stages[m.name].color);b.save(path.join(out,m.name+"-border.png"));} }
  function reference(bank) { provenance[bank]={events:"res/field/maps/"+bank+"/events.json",scripts:"res/field/maps/"+bank+"/scripts.s"}; }
  function importActors(bank,map,at) {
    let n=0;for(const e of json("res/field/maps/"+bank+"/events.json").object_events.filter(e=>e.trainer)) {
      const id=trainer(e.trainer.id), pos=at?at(e,n++):[e.x,e.z];
      person(map,...pos,id,e.graphics_id.replace("OBJ_EVENT_GFX_","").toLowerCase(),{trainer:{id,sight:Math.min(3,e.trainer.sight_range),double:!!json("res/trainers/data/"+e.trainer.id.replace("TRAINER_","").toLowerCase()+".json").double_battle},
        water:/TRAINER_SWIMMER_/.test(e.trainer.id),movement:"face_"+({DIR_NORTH:"up",DIR_SOUTH:"down",DIR_WEST:"left",DIR_EAST:"right"}[e.initial_dir]||"down"),platinumEvent:{bank,id:e.id,x:e.x,z:e.z}});
    } reference(bank);
  }
  const entry=room("HearthomeCity_Gym","Hearthome City · Gym",13,11);
  exit(entry,4,8,"HearthomeCity");doors.push({outside:"HearthomeCity",x:52,y:23,inside:entry.name});
  entry.warps.push({x:4,y:2,map:"HearthomeGym_Room1",warp:0});entry.behavior[2*13+4]=0x61;entry.collision[2*13+4]=0;
  person(entry.name,5,6,"fantina-guide","gym_guide");save(entry,render(entry));
  const shapes=["TRIANGLE","SQUARE","CIRCLE","STAR","HEART"];
  function symbol(c,shape,x,y,color) {
    if(shape===0)c.poly([[x,y-7],[x-7,y+6],[x+7,y+6]],color);
    if(shape===1)c.rect(x-6,y-6,13,13,color);
    if(shape===2)c.ellipse(x,y,7,7,color);
    if(shape===3){for(const [dx,dy]of [[0,-8],[8,0],[0,8],[-8,0]])c.line(x-dx,y-dy,x+dx,y+dy,color,3);}
    if(shape===4){c.ellipse(x-3,y-3,4,4,color);c.ellipse(x+3,y-3,4,4,color);c.poly([[x-7,y-2],[x+7,y-2],[x,y+8]],color);}
  }
  for(const n of [1,2]) {
    const m=room("HearthomeGym_Room"+n,"Hearthome Gym · Shadow Room "+n,n===1?17:29,n===1?13:25,[66,59,95]);
    const rx=n===1?8:14, ry=n===1?7:15, count=n===1?3:5, xs=n===1?[4,8,12]:[4,9,14,19,24];
    exit(m,rx,n===1?10:22,n===1?entry.name:"HearthomeGym_Room1",n===1?1:0);
    m.haunt={room:n,rune:{x:rx,y:ry},doors:xs.map((x,i)=>({x,y:2,shape:i}))};
    m.signs.push({x:rx,y:ry,script:"pt:haunt-rune-"+n});
    xs.forEach((x,i)=>m.signs.push({x,y:2,script:"pt:haunt-door-"+n+"-"+i}));
    m.patches={};
    for(let rune=0;rune<count;rune++) {
      const c=render(m);c.rect(rx*16,ry*16,16,16,[40,111,208]);symbol(c,rune,rx*16+8,ry*16+8,[225,242,255]);
      xs.forEach((x,i)=>{c.box(x*16-5,19,26,30,[41,32,69],[154,135,181]);symbol(c,i,x*16+8,29,[229,212,139]);});
      m.patches["rune"+rune]={x:0,y:0,w:m.width,h:m.height,top:false,collision:[]};save(m,c,"-patch-rune"+rune);if(!rune)save(m,c);
    }
    importActors("hearthome_city_gym_trainer_room_"+n,m.name);
  }
  const leader=room("HearthomeGym_Leader","Hearthome Gym · Fantina",11,16);
  exit(leader,4,13,"HearthomeGym_Room2",0);person(leader.name,4,10,"fantina","fantina");save(leader,render(leader));
  for(const b of ["hearthome_city_gym_entrance_room","hearthome_city_gym_leader_room"])reference(b);
  // Maylene's punching bags break successive tyre walls. Pastoria's colored
  // switches change three basins; their bridges open in low/middle/high order.
  for(const def of [
    {name:"VeilstoneCity_Gym",title:"Veilstone Gym",bank:"veilstone_city_gym",w:25,h:32,x:12,exit:30,city:"VeilstoneCity",door:[14,38],rows:[24,16,8],key:"bags",color:[121,76,65]},
    {name:"PastoriaCity_Gym",title:"Pastoria Gym",bank:"pastoria_city_gym",w:27,h:44,x:13,exit:42,city:"PastoriaCity",door:[13,29],rows:[30,20,10],key:"water",color:[52,103,132]}
  ]) {
    const m=room(def.name,def.title,def.w,def.h,def.color);exit(m,def.x,def.exit,def.city);
    doors.push({outside:def.city,x:def.door[0],y:def.door[1],inside:m.name});
    for(const row of def.rows)for(let x=1;x<m.width-1;x++)m.collision[row*m.width+x]=1;
    m.patches={};
    for(let stage=0;stage<4;stage++) {
      const collision=m.collision.slice(), changes=def.rows.map((y,i)=>[def.x,y,stage>i?0:1]);
      for(const [x,y,v]of changes)collision[y*m.width+x]=v;
      const c=render(m,collision);
      for(const [i,row]of def.rows.entries()) {
        if(def.key==="water") {for(let x=1;x<m.width-1;x++){c.rect(x*16,row*16,16,16,[34,106+stage*18,174]);c.line(x*16,row*16+5,x*16+9,row*16+5,[124,201,224]);}if(stage>i){c.rect(def.x*16,row*16,16,16,[205,189,135]);for(let k=0;k<16;k+=4)c.line(def.x*16,row*16+k,def.x*16+15,row*16+k,[101,94,67]);}}
        else for(let x=1;x<m.width-1;x++)if(x!==def.x||stage<=i){c.ellipse(x*16+8,row*16+9,7,5,[40,40,44]);c.ellipse(x*16+8,row*16+7,7,5,[68,66,69]);c.ellipse(x*16+8,row*16+7,3,2,[133,115,104]);}
      }
      if(def.key==="water") for(const [i,[x,y]]of [[11,38],[7,27],[21,17]].entries()){c.ellipse(x*16+8,y*16+8,6,5,[[238,204,67],[76,171,91],[74,130,221]][i]);c.ellipse(x*16+8,y*16+8,7,6,[30,60,79],1);}
      m.patches[def.key+stage]={x:0,y:0,w:m.width,h:m.height,top:false,collision:changes};save(m,c,"-patch-"+def.key+stage);if(!stage)save(m,c);
    }
    importActors(def.bank,m.name);
    person(m.name,def.x,4,def.key==="bags"?"maylene":"wake",def.key==="bags"?"maylene":"crasher_wake");
    person(m.name,def.x+1,def.exit-1,def.key+"-guide","gym_guide");
    if(def.key==="bags") for(const [i,row]of def.rows.entries()) (additions[m.name]||(additions[m.name]=[])).push({x:def.x,y:row+1,id:"bag"+i,localId:"PT_BAG_"+i,script:"pt:punch-"+i,sprite:"pt_punch_bag",width:16,height:32,frames:1,inanimate:true,movement:"face_down",rangeX:0,rangeY:0});
    else for(const [i,[x,y]]of [[11,38],[7,27],[21,17]].entries())m.signs.push({x,y,script:"pt:water-"+i});
  }
  const bag=canvas(16,32);bag.line(8,0,8,9,[75,78,84],2);bag.box(2,8,12,22,[181,53,48],[72,39,40]);bag.rect(4,9,3,18,[229,103,68]);bag.save(path.join(root,"assets/world/sprites/pt_punch_bag.png"));
  // Reuse functioning Centers and Marts, including their images and PCs.
  for(const city of ["VeilstoneCity","PastoriaCity"]) for(const service of ["PokemonCenter_1F","Mart"]) {
    const template=ctx.WORLD_MAPS["SandgemTown_"+service], m=JSON.parse(JSON.stringify(template)), name=city+"_"+service;
    m.name=name;m.title=city.replace(/City$/, " City")+" · "+(service==="Mart"?"Mart":"Pokémon Center");m.image=template.name;m.connections=[];
    m.warps=[{x:template.warps[0].x,y:template.warps[0].y,map:city,warp:0}];
    for(const p of m.people){p.script=p.script.replace("SandgemTown",city);p.localId=city+"_"+p.id;}
    maps[name]=m;
    const at=city==="VeilstoneCity"?(service==="Mart"?[31,30]:[47,36]):(service==="Mart"?[26,45]:[24,17]);
    doors.push({outside:city,x:at[0],y:at[1],inside:name});
  }
  const warehouse=room("VeilstoneWarehouse","Veilstone · Galactic Warehouse",17,14,[67,87,107]);warehouse.music="mus_rocket_hideout";
  exit(warehouse,8,12,"VeilstoneCity");doors.push({outside:"VeilstoneCity",x:31,y:19,inside:warehouse.name});
  person(warehouse.name,8,5,"fly-hm","gym_guide");save(warehouse,render(warehouse));
  person("VeilstoneCity",31,19,"warehouse-gate","grunt_m");person("VeilstoneCity",27,22,"veilstone-dawn","school_kid_f");
  person("Route207",19,6,"dawn207","school_kid_f");person("MtCoronet_3",18,15,"cyrus-coronet","cyrus");
  person("HearthomeCity",37,40,"hearthome-welcome","school_kid_f");
  person("Route209_Gate",8,7,"barry209","barry");person("PastoriaCity",13,30,"barry-pastoria","barry");
  // Gate buildings were drawn in the base maps but had no interiors/warps.
  // Connect their existing thresholds; do not cut invisible roads through art.
  function passage(name,title,a,b,horizontal=false) {
    const template=ctx.WORLD_MAPS[horizontal?"Route208_Gate":"CyclingRoadNorth_Gate"],m=JSON.parse(JSON.stringify(template));
    m.name=name;m.title=title;m.image=template.name;m.people=[];m.signs=[];m.triggers=[];m.hidden=[];m.connections=[];
    m.warps=horizontal?[{x:2,y:7,map:a.map,warp:0},{x:13,y:7,map:b.map,warp:0}]:[{x:9,y:2,map:a.map,warp:0},{x:9,y:13,map:b.map,warp:0}];
    m.warps.forEach((w,i)=>{m.collision[w.y*m.width+w.x]=0;m.behavior[w.y*m.width+w.x]=horizontal?(i?0x62:0x63):(i?0x65:0x64);});
    maps[name]=m;
    for(const [i,d]of [a,b].entries())doors.push({outside:d.map,x:d.x,y:d.y,behavior:d.behavior,inside:name,insideWarp:i});
  }
  passage("Route215Gate","Route 215 · Veilstone Gate",{map:"Route215",x:95,y:53,behavior:0x62},{map:"VeilstoneCity",x:8,y:27,behavior:0x63},true);
  passage("VeilstoneSouthGate","Veilstone · South Gate",{map:"VeilstoneCity",x:48,y:65,behavior:0x65},{map:"Route214",x:10,y:2,behavior:0x69});
  passage("PastoriaEastGate","Pastoria · East Gate",{map:"PastoriaCity",x:63,y:14,behavior:0x62},{map:"Route213",x:6,y:13,behavior:0x63},true);
  passage("Route213HotelPassage","Hotel Grand Lake · Reception",{map:"Route213",x:66,y:11,behavior:0x65},{map:"Route213",x:66,y:16,behavior:0x69});
  // The only base-map path onto the western plateau was a late Rock Climb
  // wall. A visible stairway makes the pre-Wake shoreline route walkable.
  const shore=maps.Route213=JSON.parse(JSON.stringify(ctx.WORLD_MAPS.Route213));
  const stair=canvas(64,32);
  for(let x=0;x<64;x+=8){stair.rect(x,0,8,32,[174,155,116]);stair.rect(x,0,6,32,[229,216,175]);stair.line(x,0,x,31,[110,99,76]);}
  stair.save(path.join(out,"Route213-patch-shore.png"));
  for(let y=21;y<23;y++)for(let x=37;x<41;x++){const i=y*shore.width+x;shore.collision[i]=0;shore.behavior[i]=0;shore.elevation[i]=3;}
  shore.patches=Object.assign({},shore.patches,{shore:{x:37,y:21,w:4,h:2,top:false,collision:[]}});
  // Explicit outdoor placements, evenly distributed along each local route.
  // The source events remain attached even when the local geometry differs.
  const routes={route_208:{map:"Route208",origin:[14,22],dx:6,dy:-3},route_209:{map:"Route209",origin:[10,52],dx:5,dy:-5},route_210_south:{map:"Route210",origin:[68,76],dx:4,dy:-6},route_215:{map:"Route215",origin:[12,50],dx:10,dy:0},route_214:{map:"Route214",origin:[13,15],dx:1,dy:7},route_213:{map:"Route213",origin:[85,25],dx:-8,dy:3},route_212_north:{map:"Route212",origin:[28,17],dx:7,dy:6},route_212_south:{map:"Route212_2",origin:[18,15],dx:8,dy:0}};
  const reachableCache={};
  function reachable(map) {
    if(reachableCache[map])return reachableCache[map];
    const m=maps[map]||ctx.WORLD_MAPS[map],q=[...m.warps.filter(w=>w.map).map(w=>[w.x,w.y]),...doors.filter(d=>d.outside===map).map(d=>[d.x,d.y])],seen=new Set();
    for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++)if((!x||!y||x===m.width-1||y===m.height-1)&&!m.collision[y*m.width+x])q.push([x,y]);
    for(let n=0;n<q.length;n++){const[x,y]=q[n],i=y*m.width+x,k=x+","+y;if(x<0||y<0||x>=m.width||y>=m.height||seen.has(k)||m.collision[i]||m.behavior[i]>=0x10&&m.behavior[i]<=0x15)continue;seen.add(k);for(const[dx,dy]of [[0,1],[1,0],[0,-1],[-1,0]])q.push([x+dx,y+dy]);}
    return reachableCache[map]=seen;
  }
  function nearest(map,x,y,skip,water=false) {
    const m=maps[map]||ctx.WORLD_MAPS[map], occupied=[...m.people,...(additions[map]||[]),...m.warps,...doors.filter(d=>d.outside===map)].filter(p=>p!==skip);
    x=Math.max(2,Math.min(m.width-3,x));y=Math.max(3,Math.min(m.height-3,y));
    for(let r=0;r<Math.max(m.width,m.height);r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      if(Math.abs(dx)+Math.abs(dy)!==r)continue;const nx=x+dx,ny=y+dy,i=ny*m.width+nx;
      if(nx<1||ny<2||nx>=m.width-1||ny>=m.height-1||m.collision[i]||occupied.some(p=>p.x===nx&&p.y===ny))continue;
      const wet=m.behavior[i]>=0x10&&m.behavior[i]<=0x15;if(water?!wet:wet||!reachable(map).has(nx+","+ny))continue;
      return[nx,ny];
    }throw Error("No local floor for "+map);
  }
  for(const [bank,d]of Object.entries(routes))importActors(bank,d.map,(e,i)=>nearest(d.map,d.origin[0]+d.dx*i,d.origin[1]+d.dy*i,null,/TRAINER_SWIMMER_/.test(e.trainer.id)));
  for(const map of ["Route207","MtCoronet_3","HearthomeCity","VeilstoneCity","PastoriaCity","Route209_Gate"])for(const p of additions[map]||[]) {
    const m=ctx.WORLD_MAPS[map];if(m.collision[p.y*m.width+p.x]&&!(map==="VeilstoneCity"&&p.script==="pt:warehouse-gate")) [p.x,p.y]=nearest(map,p.x,p.y,p);
  }
  for(const id of ["LEADER_FANTINA","LEADER_MAYLENE","LEADER_WAKE","GALACTIC_GRUNT_VEILSTONE_CITY_1","GALACTIC_GRUNT_VEILSTONE_CITY_2"])trainer("TRAINER_"+id);
  for(const starter of ["TURTWIG","CHIMCHAR","PIPLUP"])for(const prefix of ["RIVAL_ROUTE_209_","RIVAL_PASTORIA_CITY_","DAWN_VEILSTONE_CITY_"])trainer("TRAINER_"+prefix+starter);
  for(const bank of ["route_207","mt_coronet_1f_south","hearthome_city","veilstone_city","pastoria_city","veilstone_city_galactic_warehouse","route_209_gate_to_hearthome_city"])reference(bank);
  return{maps,doors};
};
