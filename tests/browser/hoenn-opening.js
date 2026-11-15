// In the browser: the start of Hoenn. The ship lands at Slateport's ferry terminal, where Prof. Birch is
// waiting and knows Johto's Champion; his truck takes you to Littleroot Town; stepping onto Route 101 starts
// the rescue (the Zigzagoon chase and the call for help), and a Pokémon is chosen from his Bag, as in Emerald.
// Run: node tests/browser/hoenn-opening.js
'use strict';
const assert=require('node:assert/strict'),T=require('./lib'),fixture=require('./kalos-post-fixture');
(async()=>{
 const s=await T.start(p=>{fixture(p);p.repelSteps=100000;},{map:'VermilionCity',x:23,y:32,facing:'up'},{out:process.env.SHOTS||'/tmp/pokemon-hoenn-opening'});
 try{await s.boot();
  const pos=()=>s.eval(()=>Overworld.position()),v=n=>s.eval(k=>Game.hoenn.getVar(k),n);
  const txt=async()=>(await s.text()).replace(/SELECT\s+START\s+B\s+A/,'').replace(/\s+/g,' ').trim();
  const heard=[];const play=async(n,gap=600)=>{for(let i=0;i<n;i++){await s.wait(gap);const t=await txt();if(t)heard.push(t);await s.press('z');}};
  const until=async(map,tries=60)=>{for(let i=0;i<tries&&(await pos()).map!==map;i++)await s.wait(800);assert.equal((await pos()).map,map);};
  assert.equal(await v('VAR_LITTLEROOT_INTRO_STATE'),0,'Hoenn not begun');
  s.eval(()=>{Game.sailToHoenn(false);});
  await play(6,700);await until('SlateportCity_Harbor');await s.wait(1500);await s.shot('harbor');
  assert.deepEqual(await pos(),{map:'SlateportCity_Harbor',x:6,y:11,facing:'down'},'the ship lands at the ferry terminal');
  await play(40);await until('InsideOfTruck');
  const said=heard.join(' ');
  assert(/Prof\. Birch: Oh! Hello there!/.test(said)&&/Champion of Johto/.test(said)&&/moving truck/.test(said)&&/Littleroot Town/.test(said),'Birch knows the Champion and arranges the truck');
  assert(!(await s.eval(()=>Game.player.flags.hoennArriving)),'Birch has left the terminal');
  await s.wait(6000);for(let i=0;i<4;i++){await s.press('ArrowRight',300);await s.wait(500);}
  await play(8,700);await until('LittlerootTown');
  await s.eval(a=>Overworld.teleport(a),{map:'LittlerootTown',x:10,y:2,facing:'up'});await s.wait(600);
  heard.length=0;for(let i=0;i<3;i++){await s.press('ArrowUp',300);await s.wait(600);}
  await play(30,700);await s.shot('rescue');
  assert.equal((await pos()).map,'Route101');assert.equal(await v('VAR_ROUTE101_STATE'),2,'the rescue has started');
  assert(/H-help me!/.test(heard.join(' '))&&/In my Bag!/.test(heard.join(' ')),'Birch calls for help');
  await s.eval(a=>Overworld.teleport(a),{map:'Route101',x:8,y:14,facing:'left'});await s.wait(600);
  await s.press('z');await s.wait(2500);await s.shot('bag');heard.length=0;await play(46,800);
  assert.equal(await v('VAR_ROUTE101_STATE'),3,'Birch is rescued');
  assert(['Treecko','Torchic','Mudkip'].includes(await v('VAR_HOENN_STARTER_SPECIES')),'a Pokémon was chosen from the Bag');
  assert(/You saved me/.test(heard.join(' ')));
  // Sailing again lands at the terminal with no Birch and no truck.
  s.eval(()=>{Game.sailToHoenn(false);});await play(6,700);await until('SlateportCity_Harbor');await s.wait(2500);
  assert.equal((await pos()).map,'SlateportCity_Harbor');assert.equal(await txt(),'');
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);
  console.log('ok: Slateport arrival and Birch\'s welcome, the truck to Littleroot, the Route 101 rescue and the starter from his Bag ('+await v('VAR_HOENN_STARTER_SPECIES')+')');
 }catch(e){await s.shot('failure');console.log(s.errors.slice(0,5),await s.eval(()=>Overworld.position()));throw e;}finally{await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
