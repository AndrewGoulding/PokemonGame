'use strict';
const assert=require('node:assert/strict'),T=require('./lib'),controller=require('./unova-bw-lib');
(async()=>{
 const s=await T.start(p=>{
  p.party=Array.from({length:6},(_,i)=>{const m=Party.create('Pikachu',20+i);m.hp=i+1;m.item='leftovers';m.moves[0].pp=1;return m;});
  p.badges=['kalos-bug','kalos-cliff','kalos-rumble'];p.flags.XY_Austin=true;
  Object.assign(Kalos.state(p),{version:'x',starter:'Chespin',started:true,shauna:true,letterDelivered:true,tutorial:true,forestFriends:true,rinka:true,bugBadge:true,kantoStarter:'Bulbasaur',cafeSoleil:true,tierno5:true,castle:true,snorlaxCleared:true,route7Multi:true,fossilChoice:'jaw-fossil',cliffBadge:true,korrinaRoad:true,guruSeen:true,towerRival:true,rumbleBadge:true});
  for(const id of Kalos.data().lumiose.flare10)p.flags[id]=true;
  Player.addItem(p,'mega-ring',1);p.repelSteps=99999;
 },{map:'KalosMasteryRoof',x:14,y:7,facing:'up'},{out:'/tmp/pokemon-kalos-mega-loan',storage:{'pokemon-options':JSON.stringify({textSpeed:2,battleScene:1,battleStyle:1,sound:2,follower:1,calls:1})}});
 try{
  await s.boot();const C=await controller(s),before=await s.eval(()=>JSON.stringify(Game.player.party));
  for(let attempt=0;attempt<4&&!await s.eval(()=>Kalos.peek(Game.player).megaLessonWon);attempt++){
   await s.press('z');await C.until(()=>GbaMenus.showing==='moves'&&BattleScreen._test.battle?.sides.p1.active.species==='Lucario','loan move menu');
   assert.equal(await s.eval(()=>Game.player.party.length),1);await s.press('m');
   await C.until(()=>BattleScreen._test.battle.sides.p1.megaUsed,'Mega activated');
   await C.until(()=>!Kalos.peek(Game.player).megaLessonBackup&&Overworld.idle()&&document.getElementById('textbox').classList.contains('empty'),'party restored');
   assert.equal(await s.eval(()=>JSON.stringify(Game.player.party)),before);
  }
  assert(await s.eval(()=>Kalos.peek(Game.player).megaLessonWon));
  assert(!await s.eval(()=>Kalos.peek(Game.player).lucarioGifted));
  assert.equal(await s.eval(()=>Player.itemCount(Game.player,'mega-ring')),1);
  await s.shot('full-party-gift-waits');
  await s.page.reload();await s.boot();
  assert.equal(await s.eval(()=>JSON.stringify(Game.player.party)),before);
  await s.eval(()=>Game.player.party.pop());await s.press('z');
  await C.until(()=>Kalos.peek(Game.player).lucarioGifted&&Overworld.idle()&&document.getElementById('textbox').classList.contains('empty'),'gift retry');
  assert.deepEqual(await s.eval(()=>{const m=Game.player.party.at(-1);return[m.species,m.level,m.item,m.hp===Party.stats(m).hp];}),['Lucario',32,'lucarionite',true]);
  await s.shot('lucario-gift-after-reload');
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);
  console.log('Native Mega lesson activation/result, six-member HP/PP/item preservation, full-party gift wait, reload and gift retry passed');
 }catch(e){console.log(await s.eval(()=>({at:Overworld.position(),state:Kalos.peek(Game.player),text:document.body.innerText.slice(-300)})));await s.shot('failure');throw e;}finally{await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
