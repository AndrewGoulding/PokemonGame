'use strict';
const assert=require('node:assert/strict'),T=require('./lib'),controller=require('./unova-bw-lib');
(async()=>{
 const s=await T.start(p=>{
  const mon=Party.create('Starmie',72,{moves:['Surf','Psychic','Thunderbolt','Ice Beam'],ivs:31,nature:'Modest'});
  mon.ot={name:p.name,id:p.trainerId};mon.evs={hp:4,atk:0,def:0,spa:252,spd:0,spe:252};Party.heal(mon);
  p.party=[mon];p.money=999999;p.repelSteps=99999;
  Object.assign(Alola.state(p),{started:true,starter:'Rowlet',schoolClear:true,ilimaWon:true,skullCity:true,skullRoute2:true,verdantClear:true,halaClear:true});
  p.flags.lastCenter='AlolaHauoliCenter';p.flags.kalos={version:'x',bugBadge:true};
 },{map:'AlolaHauoliCity',x:22,y:22,facing:'down'},{out:'/tmp/pokemon-alola-akala',storage:{'pokemon-options':JSON.stringify({textSpeed:2,battleScene:1,battleStyle:1,sound:2,follower:1,calls:1})}});
 let sampling;
 try{
  await s.boot();const C=await controller(s);
  const talk=async key=>{await C.npc('usum:'+key);await C.until(C.idle,key);};
  sampling=setInterval(()=>s.eval(()=>({location:Game.player?.location,alola:Alola.peek(Game.player),battle:BattleScreen._test.battle?.turn,text:document.body.innerText.slice(-130)})).then(console.log).catch(()=>{}),30000);
  await talk('akala-ferry');
  assert.equal(await s.eval(()=>Game.player.location.map),'AlolaHeaheaCity');
  await talk('hau-akala');await talk('recon-heahea');await talk('hau-paniola');await talk('gladion-route5');
  await talk('lana-invite');await talk('brooklet-splash-0');await talk('brooklet-splash-1');await talk('lana-totem');
  assert(await s.eval(()=>Alola.peek(Game.player).lanaClear&&Player.itemCount(Game.player,'waterium-z')>0));
  await s.shot('akala-lana-clear');
  await talk('skull-route6');await talk('royal-stage');await talk('kiawe-invite');
  await talk('kiawe-dance-0');await talk('kiawe-dance-1');await talk('kiawe-totem');
  assert(await s.eval(()=>Alola.peek(Game.player).kiaweClear&&Player.itemCount(Game.player,'firium-z')>0));
  await talk('recon-route8');await talk('mallow-invite');
  for(let i=0;i<4;i++)await talk('ingredient-'+i);
  await talk('mallow-totem');
  assert(await s.eval(()=>Alola.peek(Game.player).mallowClear&&Player.itemCount(Game.player,'grassium-z')>0));
  await talk('olivia-konikoni');await talk('plumeria');await talk('olivia-grand');
  assert(await s.eval(()=>Alola.peek(Game.player).oliviaClear&&Player.itemCount(Game.player,'rockium-z')>0));
  assert.equal(await s.eval(()=>Player.levelCap(Game.player)),55);
  await s.shot('akala-olivia-grand-trial');
  await s.eval(()=>Save.write(Game.player));
  await s.page.reload();await s.boot();
  assert(await s.eval(()=>Alola.peek(Game.player).oliviaClear));
  assert.equal(await s.eval(()=>Game.player.flags.kalos.bugBadge),true);
  await talk('melemele-ferry');
  assert.equal(await s.eval(()=>Game.player.location.map),'AlolaHauoliCity');
  await talk('akala-ferry');
  assert.equal(await s.eval(()=>Game.player.location.map),'AlolaHeaheaCity');
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);
  console.log('Native Akala ferry, three Totem trials, Olivia grand trial, Z-Crystals, reload and return ferry passed');
 }catch(e){console.log(s.errors);console.log(await s.eval(()=>({at:Game.player?.location,alola:Alola.peek(Game.player),text:document.body.innerText.slice(-250)})));await s.shot('failure');throw e;}
 finally{clearInterval(sampling);await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
