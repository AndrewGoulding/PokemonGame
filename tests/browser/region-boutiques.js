'use strict';
// Regional boutiques through native input: Celadon's boutique, a building of its own, sells from FireRed's Mart screen and dresses, and every other region's boutique opens.
const assert=require('node:assert/strict'),T=require('./lib');
(async()=>{
 const s=await T.start(p=>{p.money=100000;},{map:'CeladonCity',x:35,y:13,facing:'up'},{out:'/tmp/pokemon-region-boutiques',storage:{'pokemon-options':JSON.stringify({textSpeed:2,sound:2})}});
 try{
  await s.boot();const C=await require('./unova-bw-lib')(s);
  const approach=async id=>{await s.eval(id=>{const v=TeamFashion.vendor(id),a=TeamFashion.person(v);return Overworld.teleport({map:v.map,x:a.x,y:a.y+1,facing:'up'});},id);await s.wait(650);
   await s.eval(id=>{const a=Overworld.people().find(a=>a.def.teamFashionVendor===id);if(!a)throw Error('Invisible boutique '+id);const map=TeamFashion.vendor(id).map,m=WORLD_MAPS[map],d=[[0,1,'up'],[1,0,'left'],[-1,0,'right'],[0,-1,'down']].find(([dx,dy])=>!m.collision[(a.y+dy)*m.width+a.x+dx]&&!Overworld.people().some(b=>b.x===a.x+dx&&b.y===a.y+dy));if(!d)throw Error('No approach '+id);return Overworld.teleport({map,x:a.x+d[0],y:a.y+d[1],facing:d[2]});},id);await s.wait(650);await s.press('z');};
  // Celadon's has its own building: in at its door, its clerk behind her counter, FireRed's Mart screen, the piece put on.
  await s.eval(()=>Overworld.teleport({map:'CeladonCity',x:35,y:12,facing:'up'}));await s.wait(650);await s.shot('celadon-boutique-building');await s.walk('up',1);await C.until(()=>Overworld.position().map==='CeladonCity_Boutique'&&Overworld.idle(),'through the boutique door');
  assert.deepEqual(await s.eval(()=>{const a=Overworld.people().find(a=>a.def.teamFashionVendor==='boutique-kanto');return a&&[a.x,a.y];}),[2,3]);
  await s.eval(()=>Overworld.teleport({map:'CeladonCity_Boutique',x:4,y:3,facing:'left'}));await s.wait(650);await s.press('z');await C.until(()=>!!GbaMenus.showing||document.body.innerText.includes('Welcome to Celadon Boutique'),'boutique greeting');await s.wait(900);await s.press('z');await C.until(()=>ShopScreen.showing,'Celadon Mart screen');await s.wait(500);
  const id=await s.eval(()=>BoutiqueMart.stock(Game.player,TeamFashion.vendor('boutique-kanto')).find(a=>a.category==='shirt').id),price=await s.eval(id=>TeamFashion.item(id).price,id);
  for(let i=0;i<14&&await s.eval(()=>ShopScreen.state.item)!==id;i++)await s.press('ArrowDown');assert.equal(await s.eval(()=>ShopScreen.state.item),id);await s.wait(200);await s.shot('celadon-boutique');
  await s.press('z');await C.until(()=>/Okay\?$/.test(ShopScreen.state.message||''),'price asked');await s.wait(400);await s.press('z');await C.until(()=>/^Here you are!/.test(ShopScreen.state.message||''),'bought');assert.equal(await s.eval(()=>Game.player.money),100000-price);await s.wait(600);await s.press('z');await C.until(()=>!ShopScreen.state.message,'back to the list');
  await s.press('z');await C.until(()=>/^You already own that/.test(ShopScreen.state.message||''),'one of each');await s.wait(500);await s.press('z');await C.until(()=>!ShopScreen.state.message,'back to the list');assert.equal(await s.eval(()=>Game.player.money),100000-price);
  await s.press('x');await C.until(()=>!ShopScreen.showing&&document.body.innerText.includes('wear it now'),'asked to wear it');await s.wait(600);await s.press('z');await s.page.waitForFunction(id=>KalosFashion.current(Game.player)?.shirt===id,id,{timeout:15000});
  for(let i=0;i<8&&!await s.eval(()=>!!GbaMenus.showing);i++){await s.press('z');await s.wait(500);}await s.press('ArrowDown');await s.press('ArrowDown');await s.press('z');await C.until(()=>document.body.innerText.includes('Please come again'),'goodbye');await s.wait(700);await s.press('z');await C.until(C.idle,'shop closed');await s.shot('celadon-boutique-world');
  for(let i=0;i<6&&await s.eval(()=>Overworld.position().map==='CeladonCity_Boutique');i++)await s.walk('down',1);await C.until(()=>Overworld.position().map==='CeladonCity'&&Overworld.idle(),'back out of the boutique');assert.deepEqual(await s.eval(()=>[Overworld.position().x,Overworld.position().y]),[35,12]);
  await s.eval(()=>Save.write(Game.player));await s.page.reload();await s.boot();assert(await s.eval(id=>KalosFashion.owned(Game.player,id),id));assert.equal(await s.eval(()=>KalosFashion.current(Game.player).shirt),id);
  for(const vendor of await s.eval(()=>TeamFashion.vendors.filter(v=>v.boutique&&v.id!=='boutique-kanto').map(v=>v.id))){
   await approach(vendor);await C.until(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Browse clothes'),'boutique '+vendor,300);await C.choose('Browse clothes');await C.until(()=>!!document.querySelector('.xy-fashion'),'shop '+vendor,300);assert.equal(await s.eval(()=>document.querySelector('.xy-fashion h2').textContent),await s.eval(id=>TeamFashion.vendor(id).name,vendor));await s.shot(vendor);await C.choose('Done');await C.until(C.idle,'closed '+vendor,300);console.log('ok: '+vendor);
  }
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);
  console.log('ok: native Celadon Boutique door, Mart-screen purchase/wear/reload and all eight regional boutique dispatches');
 }catch(e){console.log(await s.text());console.log(s.errors);await s.shot('failure');throw e;}finally{await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
