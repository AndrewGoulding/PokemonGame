"use strict";
const assert=require("node:assert/strict"),T=require("./lib");
(async()=>{
 const s=await T.start(p=>{p.party=[Party.create("Charizard",37,{moves:["Fly"],ivs:31})];p.badges=["coal","forest","relic","cobble","fen"];p.flags.pokedex=false;p.flags.sinnoh={starter:"Turtwig",dex:true,balls:true,jupiter:true,dawn207:true,cyrusMet:true,hearthomeWelcome:true,rival209:true,rivalPastoria:true,veilstoneGalactic:true,visitedCities:["HearthomeCity","VeilstoneCity","PastoriaCity"]};Player.addItem(p,FieldMoves.hmFor("Fly"));for(const id of Object.keys(PLATINUM_DATA.trainers))p.flags[id]=true;},
 {map:"VeilstoneCity",x:48,y:64,facing:"down"},{out:"/tmp/pokemon-sinnoh-roads",storage:{"pokemon-options":JSON.stringify({textSpeed:2,battleScene:1,battleStyle:1,sound:2,calls:1,follower:1})}});
 const errors=[],missing=new Set();s.page.on("pageerror",e=>errors.push(e.message));s.page.on("response",r=>{if(r.status()>=400)missing.add(new URL(r.url()).pathname);});
 async function go(map,x,y,facing){await s.page.waitForFunction(()=>Overworld.idle());await s.eval(p=>Overworld.teleport(p),{map,x,y,facing});await s.wait(250);}
 async function cross(dir,map){for(let i=0;i<5&&(await s.player()).location.map!==map;i++){await s.walk(dir,1);await s.wait(250);}assert.equal((await s.player()).location.map,map);await s.page.waitForFunction(()=>Overworld.idle());console.log("ok: browser Sinnoh road -> "+map);}
 try{
  await s.boot();await go("Route215",94,53,"right");await cross("right","Route215Gate");await go("Route215Gate",12,7,"right");await cross("right","VeilstoneCity");await go("VeilstoneCity",48,64,"down");await cross("down","VeilstoneSouthGate");await go("VeilstoneSouthGate",9,12,"down");await cross("down","Route214");
  await go("Route213",66,10,"down");await cross("down","Route213HotelPassage");await go("Route213HotelPassage",9,12,"down");await cross("down","Route213");
  await go("Route213",42,21,"left");for(let i=0;i<10&&(await s.player()).location.x>36;i++)await s.walk("left",1);assert((await s.player()).location.x<=36);await s.shot("shore-stairs");
  await go("Route213",7,13,"left");await cross("left","PastoriaEastGate");await go("PastoriaEastGate",3,7,"left");await cross("left","PastoriaCity");
  await go("PastoriaCity",27,20,"down");
  // With Pokédex hidden, Pokémon is the first Start-menu entry. Charizard's
  // first available field move is Fly; exercise the actual saved-town menu.
  const moves=await s.eval(()=>FieldMoves.forMon(Game.player.party[0]));const fly=moves.indexOf("Fly");assert(fly>=0);
  await s.press("Enter");await s.press("z");await s.press("z");for(let i=0;i<fly+1;i++)await s.press("ArrowDown");await s.press("z");
  for(let i=0;i<5;i++)await s.wait(250);await s.shot("sinnoh-fly-menu");
  await s.press("z");for(let i=0;i<25&&(await s.player()).location.map!=="HearthomeCity";i++)await s.wait(250);
  assert.equal((await s.player()).location.map,"HearthomeCity");await s.page.waitForFunction(()=>Overworld.idle());
  assert.deepEqual(errors,[]);assert.deepEqual([...missing].filter(u=>/VeilstoneSouthGate|PastoriaEastGate|HotelPassage|patch-shore|CyclingRoadNorth_Gate|Route208_Gate/.test(u)),[]);
  console.log("ok: browser Sinnoh gate passages, walkable shore stairs and Fly to a saved Sinnoh town; no errors or missing passage art");
 }catch(e){await s.shot("failure");throw e;}finally{await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
