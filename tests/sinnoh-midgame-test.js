"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.join(__dirname,"..");global.window=global;global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
for(const [,f]of fs.readFileSync(path.join(root,"index.html"),"utf8").matchAll(/<script src="([^"]+)"><\/script>/g))if(!f.startsWith("ui/")||/^ui\/sinnoh-/.test(f))vm.runInThisContext(fs.readFileSync(path.join(root,f),"utf8"),{filename:f});
function fixture(starter="Turtwig") {
 let p=Player.create("TEST"),outcome="won";p.party=[Party.create("Charizard",26,{moves:["Fly","Flamethrower"]})];p.badges=["coal","forest"];p.bag={};p.flags.sinnoh={starter,dex:true,balls:true,jupiter:true,cutHM:true,gardeniaTM:true};p.location={map:"Route207",x:19,y:6};
 const calls=[],messages=[];const env={player:()=>p,say:async t=>messages.push(...[].concat(t)),sfx(){},showWorld(){},resume:async()=>{},refreshPeople(){},refreshMap(){},canBattle:()=>p.party.some(Party.canFight),teleport:async to=>{p.location=to;},battle:async(kind,opts)=>{calls.push(opts);return outcome;}};
 const story=SinnohStory.create(env);return{get p(){return p;},state:()=>Sinnoh.state(p),story,calls,messages,outcome:v=>{outcome=v;},reload:()=>{p=Player.load(JSON.parse(Player.serialize(p))).player;}};
}
async function main(){
 for(const starter of Sinnoh.starters){
  const f=fixture(starter);assert.equal(f.story.step().trigger.script,"pt:dawn207");await f.story.run("pt:dawn207");await f.story.run("pt:dawn207");
  assert.equal(Player.itemCount(f.p,"itemfinder"),1);assert.equal(Player.itemCount(f.p,"vs-seeker"),0);
  f.p.location={map:"MtCoronet_3",x:18,y:15};assert.equal(f.story.step().trigger.script,"pt:cyrus-coronet");await f.story.run("pt:cyrus-coronet");assert(f.state().cyrusMet);assert.equal(f.story.visible({script:"pt:cyrus-coronet"}),false);
  f.p.location={map:"HearthomeCity",x:37,y:41};await f.story.run("pt:hearthome-welcome");assert(f.state().hearthomeWelcome);
  f.p.location={map:"HearthomeGym_Leader",x:4,y:11};await f.story.run("pt:fantina");assert.equal(f.calls.length,0);
  for(const n of [1,2]){
   const shape=Sinnoh.hauntShape(f.p,n),map="HearthomeGym_Room"+n;f.p.location={map,x:8,y:4};
   await f.story.run("pt:haunt-rune-"+n);await f.story.run("pt:haunt-door-"+n+"-"+((shape+1)%(n===1?3:5)));
   assert.equal(f.p.location.map,"HearthomeCity_Gym");assert(!f.state()["haunt"+n]);
   f.p.location={map,x:8,y:4};f.reload();assert.equal(Sinnoh.hauntShape(f.p,n),shape);
   await f.story.run("pt:haunt-door-"+n+"-"+shape);assert(f.state()["haunt"+n]);assert.equal(f.p.location.map,n===1?"HearthomeGym_Room2":"HearthomeGym_Leader");
  }
  for(const [key,badge,cap]of [["fantina","relic",32],["maylene","cobble",37],["wake","fen",41]]){
   if(key==="maylene"){
    f.p.location={map:"Route209_Gate",x:7,y:7};assert.equal(f.story.step().trigger.script,"pt:barry209");
    f.outcome("lost");await f.story.run("pt:barry209");assert(!f.state().rival209);
    f.outcome("won");await f.story.run("pt:barry209");assert(f.state().rival209);assert(f.calls.at(-1).trainerId.endsWith(starter.toUpperCase()));
    f.p.location={map:"VeilstoneCity_Gym",x:12,y:26};const count=f.calls.length;
    await f.story.run("pt:maylene");assert.equal(f.calls.length,count);
    await f.story.run("pt:punch-2");assert(!f.state().mayleneBags);
    for(let n=0;n<3;n++){await f.story.run("pt:punch-"+n);assert.equal(f.state().mayleneBags,n+1);assert.equal(f.story.visible({script:"pt:punch-"+n}),false);f.reload();}
   }
   if(key==="wake"){
    f.p.location={map:"VeilstoneCity",x:27,y:22};f.outcome("lost");await f.story.run("pt:veilstone-dawn");assert(!f.state().veilstoneGalactic);
    assert.equal(f.story.visible({script:"pt:warehouse-gate"}),true);
    f.outcome("won");await f.story.run("pt:veilstone-dawn");assert(f.state().veilstoneGalactic);assert.equal(f.calls.at(-1).partner.name,"Dawn");
    assert.equal(f.calls.at(-1).partner.team.at(-1).species,Sinnoh.team("PT_TRAINER_DAWN_VEILSTONE_CITY_"+starter.toUpperCase()).at(-1).species);
    assert.equal(f.story.visible({script:"pt:warehouse-gate"}),false);
    f.p.location={map:"VeilstoneWarehouse",x:8,y:6};await f.story.run("pt:fly-hm");await f.story.run("pt:fly-hm");assert.equal(Player.itemCount(f.p,FieldMoves.hmFor("Fly")),1);
    assert.equal(FieldMoves.check(f.p,f.p.party[0],"Fly"),null);
    f.p.location={map:"PastoriaCity",x:13,y:31};f.outcome("lost");await f.story.run("pt:barry-pastoria");assert(!f.state().rivalPastoria);
    f.outcome("won");await f.story.run("pt:barry-pastoria");assert(f.state().rivalPastoria);
    f.p.location={map:"PastoriaCity_Gym",x:13,y:41};const count=f.calls.length;await f.story.run("pt:wake");assert.equal(f.calls.length,count);
    await f.story.run("pt:water-2");assert(!f.state().wakeWater);
    for(let n=0;n<3;n++){await f.story.run("pt:water-"+n);assert.equal(f.state().wakeWater,n+1);f.reload();}
    await f.story.run("pt:water-0");assert.equal(f.state().wakeWater,3,"earlier basin must not strand player by closing a bridge");
   }
   const map={fantina:"HearthomeGym_Leader",maylene:"VeilstoneCity_Gym",wake:"PastoriaCity_Gym"}[key];f.p.location={map,x:4,y:5};
   f.outcome("lost");await f.story.run("pt:"+key);assert(!f.p.badges.includes(badge));assert(!f.state()[key+"TM"]);
   f.outcome("won");await f.story.run("pt:"+key);assert(f.p.badges.includes(badge));assert.equal(Player.levelCap(f.p),cap);assert(f.state()[key+"TM"]);
   const bag=JSON.stringify(f.p.bag),battles=f.calls.length;f.reload();await f.story.run("pt:"+key);
   assert.equal(f.calls.length,battles);assert.equal(JSON.stringify(f.p.bag),bag);assert.equal(f.p.badges.filter(b=>b===badge).length,1);
  }
 }
 // Apply each saved terrain stage and check its meaningful reachability.
 for(const [name,key,goal,switches]of [["VeilstoneCity_Gym","bags",[12,5],[[12,26],[12,18],[12,10]]],["PastoriaCity_Gym","water",[13,5],[[11,39],[7,28],[21,18]]]]){
  const m=WORLD_MAPS[name],base=m.collision.slice();
  for(let stage=0;stage<4;stage++){
   m.collision=base.slice();for(const [x,y,c]of m.patches[key+stage].collision)m.collision[y*m.width+x]=c;
   const q=[[m.warps[0].x,m.warps[0].y-1]],seen=new Set([q[0].join(",")]);
   for(let i=0;i<q.length;i++)for(const dir of ["up","down","left","right"]){const r=World.step({map:name,x:q[i][0],y:q[i][1]},dir),k=r.x+","+r.y;if(r.ok&&r.map===name&&!seen.has(k)){seen.add(k);q.push([r.x,r.y]);}}
   assert.equal(seen.has(goal.join(",")),stage===3,name+" leader route stage "+stage);
   if(stage<3)assert(seen.has(switches[stage].join(",")),name+" next switch reachable");assert(seen.has((m.warps[0].x)+","+(m.warps[0].y-1)));
  }m.collision=base;
 }
 // The main campaign is traversable on foot through the restored gates.
 function routeGraph(start,names,goal){
  const allowed=new Set(names),q=[start],seen=new Set([start.map+":"+start.x+","+start.y]);
  for(let i=0;i<q.length;i++)for(const dir of ["up","down","left","right"]){const r=World.step(q[i],dir),p=r.warp||r,k=p.map+":"+p.x+","+p.y;if((r.ok||r.warp)&&allowed.has(p.map)&&!seen.has(k)){seen.add(k);q.push({map:p.map,x:p.x,y:p.y});}}
  assert(seen.has(goal.map+":"+goal.x+","+goal.y),"continuous walk to "+goal.map);
 }
 routeGraph({map:"HearthomeCity",x:58,y:49},["HearthomeCity","Route209_Gate","Route209","SolaceonTown","Route210","Route215","Route215Gate","VeilstoneCity"],{map:"VeilstoneCity",x:47,y:37});
 routeGraph({map:"VeilstoneCity",x:48,y:64},["VeilstoneCity","VeilstoneSouthGate","Route214","ValorLakefront","Route213","Route213HotelPassage","PastoriaEastGate","PastoriaCity"],{map:"PastoriaCity",x:24,y:18});
 // Center aliases and Fly destinations are usable and stay within Sinnoh.
 const f=fixture();assert.deepEqual(Sinnoh.flySpots(f.p),[]);
 for(const city of ["SandgemTown","HearthomeCity","VeilstoneCity","PastoriaCity"]){Sinnoh.visit(f.p,city);Sinnoh.visit(f.p,city+"_PokemonCenter_1F");}
 assert.equal(Sinnoh.flySpots(f.p).length,4);f.reload();assert.equal(Sinnoh.flySpots(f.p).length,4);
 for(const spot of Sinnoh.flySpots(f.p)){assert(Sinnoh.owns(spot.map));assert.equal(World.blockAt(spot.map,spot.x,spot.y).collision,0);}
 for(const city of ["VeilstoneCity","PastoriaCity"])for(const service of ["PokemonCenter_1F","Mart"]){const m=WORLD_MAPS[city+"_"+service];assert(m.image);assert(fs.existsSync(path.join(root,"assets/world/maps/"+m.image+".png")));assert.equal(World.warpTarget(m.warps[0]).map,city);}
 assert.deepEqual(Sinnoh.team("PT_TRAINER_LEADER_FANTINA").map(m=>[m.species,m.level]),[["Duskull",24],["Haunter",24],["Mismagius",26]]);
 assert.equal(Sinnoh.team("PT_TRAINER_LEADER_MAYLENE").at(-1).species,"Lucario");assert.equal(Sinnoh.team("PT_TRAINER_LEADER_WAKE").at(-1).level,37);
 assert.deepEqual(Sinnoh.team("PT_TRAINER_BEAUTY_DEVON").map(m=>m.species),["Wormadam-Plant","Wormadam-Sandy","Wormadam-Trash"]);
 console.log("ok: Sinnoh three-Gym campaign for all starters, puzzles, retries, rewards, Barry/Dawn events, Wormadam forms, continuous roads, services and saved Fly destinations");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
