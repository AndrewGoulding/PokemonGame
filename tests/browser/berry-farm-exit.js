'use strict';const assert=require('node:assert/strict'),T=require('./lib');
// Celadon's Berry Farm: its only way out is the gap in Celadon's trees above it (a patch on Celadon City). A save in
// the farm can walk back up into Celadon, and a walk down from Celadon reaches the farm.
(async()=>{const s=await T.start(p=>{p.repelSteps=100000;},{map:'CeladonCity_BerryFarm',x:10,y:3,facing:'up'},{out:'/tmp/pokemon-berry-farm-exit'});
 try{await s.boot();const at=()=>s.eval(()=>{const a=Overworld.position();return a.map+' '+a.x+','+a.y;});
  for(let i=0;i<8&&!(await at()).startsWith('CeladonCity ');i++){await s.walk('up',1);await s.wait(150);}
  assert.match(await at(),/^CeladonCity 10,3\d$/,'walked out of the farm');await s.shot('celadon');
  for(let i=0;i<8&&!(await at()).startsWith('CeladonCity_BerryFarm');i++){await s.walk('down',1);await s.wait(150);}
  assert.match(await at(),/^CeladonCity_BerryFarm 10,\d$/,'walked back into the farm');
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);console.log('ok: the Berry Farm and Celadon City, both ways');}
 catch(e){console.log(s.errors,await s.eval(()=>Overworld.position()).catch(()=>null));await s.shot('failure');throw e;}finally{await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
