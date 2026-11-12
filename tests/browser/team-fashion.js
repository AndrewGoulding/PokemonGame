'use strict';
const assert=require('node:assert/strict'),T=require('./lib');
(async()=>{
 const s=await T.start(p=>{p.money=100000;p.flags.TRAINER_BOSS_GIOVANNI=true;p.flags.FLAG_HIDE_MISC_KANTO_ROCKETS=true;},{map:'RocketHideout_B1F',x:14,y:4,facing:'up'},{out:'/tmp/pokemon-team-fashion',storage:{'pokemon-options':JSON.stringify({textSpeed:2,sound:2})}});
 const sampling=setInterval(()=>s.eval(()=>({at:Overworld.position(),idle:Overworld.idle(),text:document.body.innerText.slice(-220)})).then(console.log).catch(()=>{}),15000);
 try{
  await s.boot();const C=await require('./unova-bw-lib')(s);
  assert(!(await s.eval(()=>Overworld.people().some(a=>a.def.teamFashionVendor))));
  await s.eval(()=>{Game.player.flags.TRAINER_BOSS_GIOVANNI_2=true;return Overworld.teleport({map:'RocketHideout_B1F',x:14,y:4,facing:'up'});});await s.page.waitForFunction(()=>Overworld.idle());
  const approach=async()=>{await s.eval(()=>{const a=Overworld.people().find(a=>a.def.teamFashionVendor==='rocket-kanto');if(!a)throw Error('No Rocket outfitter');const m=WORLD_MAPS.RocketHideout_B1F,d=[[0,1,'up'],[1,0,'left'],[-1,0,'right'],[0,-1,'down']].find(([dx,dy])=>!m.collision[(a.y+dy)*m.width+a.x+dx]&&!Overworld.people().some(b=>b.x===a.x+dx&&b.y===a.y+dy));if(!d)throw Error('No approach');return Overworld.teleport({map:'RocketHideout_B1F',x:a.x+d[0],y:a.y+d[1],facing:d[2]});});await s.wait(650);await s.press('z');};
  const M=T.mart(s),greeted=async()=>{await s.page.waitForFunction(()=>document.body.innerText.includes('The old operation is finished.'),null,{timeout:20000});await s.wait(700);await s.press('z');};
  // The outfitter serves from FireRed's Mart screen: the uniform's top bought and put on, then the wardrobe.
  await approach();await greeted();await M.open();const id='team-rocket-male-shirt';await M.to(id);assert.equal(await s.eval(()=>Game.player.money),100000);await s.shot('rocket-uniform-shop');await M.buy(id);assert.equal(await s.eval(()=>Game.player.money),95000);await M.leave(true);assert.equal(await s.eval(()=>KalosFashion.current(Game.player).shirt),id);
  await s.press('ArrowDown');await s.press('z');await C.until(()=>!!document.querySelector('.xy-fashion'),'shared wardrobe outside Kalos');await C.choose('Done');await M.bye();await s.shot('rocket-uniform-world');
  await s.eval(()=>Save.write(Game.player));await s.page.reload();await s.boot();assert(await s.eval(id=>KalosFashion.owned(Game.player,id),id));assert.equal(await s.eval(()=>KalosFashion.current(Game.player).shirt),id);assert(await s.eval(()=>Overworld.people().some(a=>a.def.teamFashionVendor==='rocket-kanto')));assert.equal(await s.eval(()=>Game.player.flags.kalos.started),undefined);// Confirm every regional visibility layer and native story dispatcher accepts its outfitter.
  await s.eval(()=>{const f=Game.player.flags;f.hoenn={init:true,f:{FLAG_SOOTOPOLIS_ARCHIE_MAXIE_LEAVE:true},v:{},pos:{},mov:{}};f.sinnoh={giratinaResolved:true};f.unovaBW={clear:true};f.unova={ghetsis:true};f.kalos.flareStopped=true;f.orreStory=44;});
  const ids=await s.eval(()=>TeamFashion.vendors.filter(v=>v.id!=='rocket-kanto'&&!v.boutique).map(v=>v.id));
  for(const vendor of ids){
   await s.eval(id=>{const v=TeamFashion.vendor(id),a=TeamFashion.person(v);return Overworld.teleport({map:v.map,x:a.x,y:a.y+1,facing:'up'});},vendor);await s.wait(650);
   await s.eval(id=>{const a=Overworld.people().find(a=>a.def.teamFashionVendor===id);if(!a)throw Error('Invisible vendor '+id);const map=TeamFashion.vendor(id).map,m=WORLD_MAPS[map],d=[[0,1,'up'],[1,0,'left'],[-1,0,'right'],[0,-1,'down']].find(([dx,dy])=>!m.collision[(a.y+dy)*m.width+a.x+dx]&&!Overworld.people().some(b=>b.x===a.x+dx&&b.y===a.y+dy));if(!d)throw Error('No approach '+id);return Overworld.teleport({map,x:a.x+d[0],y:a.y+d[1],facing:d[2]});},vendor);await s.wait(650);await s.press('z');await greeted();await M.open();assert.equal(await s.eval(()=>ShopScreen.state.item),await s.eval(id=>BoutiqueMart.stock(Game.player,TeamFashion.vendor(id))[0].id,vendor));await M.leave();await M.bye();
  }
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);
  console.log('Native Rocket vendor hidden before Silph, appears after Giovanni, Mart-screen uniform purchase/equip, shared wardrobe outside Kalos, reload and the Mart screen at all nine outfitters passed');
 }catch(e){console.log(await s.text());console.log(s.errors);await s.shot('failure');throw e;}finally{clearInterval(sampling);await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
