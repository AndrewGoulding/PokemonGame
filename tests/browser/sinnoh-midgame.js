// Large actual-page campaign check: three Gyms, two Barry battles, Dawn's tag
// battle, their persistent puzzles, a recovered HM and the new town services.
"use strict";
const assert=require("node:assert/strict"),T=require("./lib");
(async()=>{
 const s=await T.start(p=>{
  p.party=[Party.create("Darkrai",26,{moves:["Dark Pulse"],ivs:31,nature:"Modest"})];p.badges=["coal","forest"];
  p.flags.sinnoh={starter:"Turtwig",dex:true,balls:true,rival203:true,roarkFound:true,jubilifeGalactic:true,mars:true,cherylDone:true,cutHM:true,jupiter:true,bicycle:true,gardeniaClock:3};
  // Route/Gym trainer behavior is covered by the shared trainer tests; skip
  // incidental sight battles while testing puzzle geometry and the bosses.
  for(const [map,ps]of Object.entries(PLATINUM_DATA.additions))if(/Gym|HearthomeGym/.test(map))for(const p2 of ps)if(p2.trainer)p.flags[p2.trainer.id]=true;
 },{map:"Route207",x:19,y:7,facing:"up"},{out:"/tmp/pokemon-sinnoh-midgame",storage:{"pokemon-options":JSON.stringify({textSpeed:2,battleScene:1,battleStyle:1,sound:2,calls:1,follower:1})}});
 const errors=[],missing=new Set();s.page.on("pageerror",e=>errors.push(e.message));s.page.on("response",r=>{if(r.status()>=400)missing.add(new URL(r.url()).pathname);});
 async function finish(predicate,label,limit=500){for(let i=0;i<limit;i++){await s.press("z",90);if(await s.eval(predicate)&&await s.eval(()=>Overworld.idle())){console.log("ok: browser middle Sinnoh "+label);return;}}throw Error(label+" stalled: "+JSON.stringify(await s.eval(()=>({at:Game.player.location,state:Game.player.flags.sinnoh,text:document.body.innerText}))));}
 async function go(map,x,y,facing="up"){await s.page.waitForFunction(()=>Overworld.idle());await s.eval(to=>Overworld.teleport(to),{map,x,y,facing});await s.wait(300);}
 async function actor(map,script){const to=await s.eval(({map,script})=>{const m=WORLD_MAPS[map],p=m.people.find(p=>p.script===script);if(!p)throw Error("Missing "+script);for(const [dx,dy,facing]of [[0,1,"up"],[-1,0,"right"],[1,0,"left"],[0,-1,"down"]]){const x=p.x+dx,y=p.y+dy;if(!World.blockAt(map,x,y).collision&&!m.people.some(q=>q.x===x&&q.y===y))return{map,x,y,facing};}throw Error("No approach to "+script);},{map,script});await go(to.map,to.x,to.y,to.facing);}
 async function enter(city,x,y,target){await go(city,x,y);await s.walk("up",1);await s.wait(500);assert.equal((await s.player()).location.map,target);await s.page.waitForFunction(()=>Overworld.idle());}
 try{
  await s.boot();await actor("Route207","pt:dawn207");await finish(()=>!!Game.player.flags.sinnoh.dawn207,"Dawn's Itemfinder");
  await actor("MtCoronet_3","pt:cyrus-coronet");await finish(()=>!!Game.player.flags.sinnoh.cyrusMet,"Cyrus in Mt. Coronet");
  await actor("HearthomeCity","pt:hearthome-welcome");await finish(()=>!!Game.player.flags.sinnoh.hearthomeWelcome,"Hearthome arrival");
  await enter("HearthomeCity",52,24,"HearthomeCity_Gym");
  await go("HearthomeCity_Gym",4,3);await s.walk("up",1);await s.wait(500);assert.equal((await s.player()).location.map,"HearthomeGym_Room1");await s.page.waitForFunction(()=>Overworld.idle());
  const first=await s.eval(()=>Sinnoh.hauntShape(Game.player,1));await go("HearthomeGym_Room1",[4,8,12][(first+1)%3],3);await finish(()=>Game.player.location.map==="HearthomeCity_Gym","wrong symbol returns to entrance");
  for(const n of [1,2]){const data=await s.eval(n=>{const m=WORLD_MAPS["HearthomeGym_Room"+n],shape=Sinnoh.hauntShape(Game.player,n);return{map:m.name,door:m.haunt.doors[shape]};},n);await go(data.map,data.door.x,3);await finish(new Function("return !!Game.player.flags.sinnoh.haunt"+n),"symbol room "+n);}
  await actor("HearthomeGym_Leader","pt:fantina");await finish(()=>!!Game.player.flags.sinnoh.fantinaTM,"Fantina and Relic Badge");await s.shot("relic-badge");
  await s.eval(()=>{Game.player.party=[Party.create("Mewtwo",32,{moves:["Psychic"],ivs:31,nature:"Modest"})];});
  await actor("Route209_Gate","pt:barry209");await finish(()=>!!Game.player.flags.sinnoh.rival209,"Barry on Route 209");
  // Walk the fixed map connection, rather than teleporting into Veilstone.
  await go("Route215",94,53,"right");await s.walk("right",2);await s.wait(500);assert.equal((await s.player()).location.map,"Route215Gate");
  await go("Route215Gate",12,7,"right");await s.walk("right",2);await s.wait(500);assert.equal((await s.player()).location.map,"VeilstoneCity");
  await enter("VeilstoneCity",47,37,"VeilstoneCity_PokemonCenter_1F");
  await s.eval(()=>{Game.player.party[0].hp=1;});await actor("VeilstoneCity_PokemonCenter_1F","VeilstoneCity_PokemonCenter_1F_EventScript_Nurse");await finish(()=>Game.player.party.every(p=>p.hp===Party.maxHp(p)),"new Veilstone Center heals");
  await enter("VeilstoneCity",14,39,"VeilstoneCity_Gym");
  for(const [n,y]of [[0,26],[1,18],[2,10]]){await go("VeilstoneCity_Gym",12,y);await finish(new Function("return (Game.player.flags.sinnoh.mayleneBags|0)>"+n),"punching bag "+(n+1));}
  await actor("VeilstoneCity_Gym","pt:maylene");await finish(()=>!!Game.player.flags.sinnoh.mayleneTM,"Maylene and Cobble Badge");await s.shot("cobble-badge");
  await s.eval(()=>{Game.player.party=[Party.create("Charizard",37,{moves:["Flamethrower"],ivs:31,nature:"Modest"})];});
  await actor("VeilstoneCity","pt:veilstone-dawn");await finish(()=>!!Game.player.flags.sinnoh.veilstoneGalactic,"Dawn's Galactic tag battle");
  await enter("VeilstoneCity",31,20,"VeilstoneWarehouse");await actor("VeilstoneWarehouse","pt:fly-hm");await finish(()=>!!Game.player.flags.sinnoh.flyHM,"warehouse Fly HM");
  await s.eval(()=>{Game.player.party=[Party.create("Mewtwo",37,{moves:["Psychic"],ivs:31,nature:"Modest"})];});
  await actor("PastoriaCity","pt:barry-pastoria");await finish(()=>!!Game.player.flags.sinnoh.rivalPastoria,"Barry in Pastoria");
  await s.eval(()=>Game.player.party.forEach(Party.heal));await enter("PastoriaCity",13,30,"PastoriaCity_Gym");
  for(const [n,x,y]of [[0,11,39],[1,7,28],[2,21,18]]){await go("PastoriaCity_Gym",x,y);await finish(new Function("return (Game.player.flags.sinnoh.wakeWater|0)>"+n),"water basin "+(n+1));}
  await actor("PastoriaCity_Gym","pt:wake");await finish(()=>!!Game.player.flags.sinnoh.wakeTM,"Crasher Wake and Fen Badge");await s.shot("fen-badge");
  assert.deepEqual((await s.player()).badges,["coal","forest","relic","cobble","fen"]);assert.equal(await s.eval(()=>Player.levelCap(Game.player)),41);
  await enter("PastoriaCity",24,18,"PastoriaCity_PokemonCenter_1F");await s.shot("pastoria-center");
  assert.deepEqual(errors,[]);assert.deepEqual([...missing].filter(u=>/pt_|HearthomeGym|HearthomeCity_Gym|Veilstone|Pastoria/.test(u)),[]);
  console.log("ok: browser continuous three-Gym campaign, dark symbol doors, bags, water switches, rivals, tag battle, Fly HM, restored road and new Centers; no script errors or missing chapter assets");
 }catch(e){await s.shot("failure");throw e;}finally{await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
