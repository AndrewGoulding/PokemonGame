'use strict';const assert=require('node:assert/strict'),T=require('./lib');
// A Tera Raid's bar along the top shows the caught Poké Ball, left of its stars, once you've caught that species
// (as a wild Pokémon's healthbox does), and not before.
async function raid(caught){const s=await T.start(p=>{const den=RaidDens.DENS[0];p.badges=['boulder'];const r=RaidDens.start(p.flags,den,'lure',1);if(caught)Player.markCaught(p,r.species);p.party=[Party.create('Charizard',60)];p.repelSteps=100000;},{map:'Route1',x:5,y:9,facing:'up'},{out:'/tmp/pokemon-raid-caught-ball'});
 try{await s.boot();let on=false;for(let i=0;i<60&&!on;i++){on=await s.eval(()=>!!document.querySelector('canvas.raid-panel:not(.hidden)'));if(!on){await s.press('z');await s.wait(500);}}assert(on,'the raid started');await s.wait(1200);
  // The ball's 8×8 tile: x = 4 + 232 − 10 − 9 × stars − 10, y = 5.
  const r=await s.eval(()=>{const c=document.querySelector('canvas.raid-panel'),stars=RaidDens.active(Game.player.flags,'route1').stars,x=4+232-10-9*stars-10,d=c.getContext('2d').getImageData(x,5,8,8).data;let red=0;for(let i=0;i<d.length;i+=4)if(d[i+3]&&d[i]>150&&d[i+1]<110)red++;return{stars,red};});
  await s.shot(caught?'caught':'not-caught');assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);return r;}
 catch(e){console.log(s.errors);await s.shot('failure');throw e;}finally{await s.close();}}
(async()=>{const yes=await raid(true),no=await raid(false);assert(yes.red>0,'a red ball half when caught: '+JSON.stringify(yes));assert.equal(no.red,0,'no ball when not caught');
 console.log('ok: the Tera Raid bar shows the caught ball ('+yes.stars+'-star raid), and not for an uncaught species');})().catch(e=>{console.error(e);process.exitCode=1;});
