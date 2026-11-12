'use strict';
// Regional boutiques through native input: Celadon's clerk sells and dresses, and every other region's boutique opens.
const assert=require('node:assert/strict'),T=require('./lib');
(async()=>{
 const s=await T.start(p=>{p.money=100000;},{map:'CeladonCity_DepartmentStore_2F',x:6,y:8,facing:'up'},{out:'/tmp/pokemon-region-boutiques',storage:{'pokemon-options':JSON.stringify({textSpeed:2,sound:2})}});
 try{
  await s.boot();const C=await require('./unova-bw-lib')(s);
  const approach=async id=>{await s.eval(id=>{const v=TeamFashion.vendor(id),a=TeamFashion.person(v);return Overworld.teleport({map:v.map,x:a.x,y:a.y+1,facing:'up'});},id);await s.wait(650);
   await s.eval(id=>{const a=Overworld.people().find(a=>a.def.teamFashionVendor===id);if(!a)throw Error('Invisible boutique '+id);const map=TeamFashion.vendor(id).map,m=WORLD_MAPS[map],d=[[0,1,'up'],[1,0,'left'],[-1,0,'right'],[0,-1,'down']].find(([dx,dy])=>!m.collision[(a.y+dy)*m.width+a.x+dx]&&!Overworld.people().some(b=>b.x===a.x+dx&&b.y===a.y+dy));if(!d)throw Error('No approach '+id);return Overworld.teleport({map,x:a.x+d[0],y:a.y+d[1],facing:d[2]});},id);await s.wait(650);await s.press('z');};
  await approach('boutique-kanto');await C.until(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Browse clothes'),'boutique greeting');assert(/Welcome to Celadon Boutique/.test(await s.text()));await C.choose('Browse clothes');await C.until(()=>!!document.querySelector('.xy-fashion'),'Celadon shop');
  const id=await s.eval(()=>TeamFashion.items.find(a=>a.faction==='boutique-kanto'&&a.collection===KalosFashion.collection(Game.player)&&a.category==='shirt').id),price=await s.eval(id=>TeamFashion.item(id).price,id);
  await C.choose('Shirts');await s.eval(id=>document.querySelector('[data-item="'+id+'"]').focus(),id);await s.press('z');await C.choose('Add to basket');await C.choose('Buy basket');await C.choose('Wear selected');assert.equal(await s.eval(()=>Game.player.money),100000-price);assert.equal(await s.eval(()=>KalosFashion.current(Game.player).shirt),id);await s.shot('celadon-boutique');await C.choose('Done');await C.until(C.idle,'shop closed');await s.shot('celadon-boutique-world');
  await s.eval(()=>Save.write(Game.player));await s.page.reload();await s.boot();assert(await s.eval(id=>KalosFashion.owned(Game.player,id),id));assert.equal(await s.eval(()=>KalosFashion.current(Game.player).shirt),id);
  for(const vendor of await s.eval(()=>TeamFashion.vendors.filter(v=>v.boutique&&v.id!=='boutique-kanto').map(v=>v.id))){
   await approach(vendor);await C.until(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Browse clothes'),'boutique '+vendor,300);await C.choose('Browse clothes');await C.until(()=>!!document.querySelector('.xy-fashion'),'shop '+vendor,300);assert.equal(await s.eval(()=>document.querySelector('.xy-fashion h2').textContent),await s.eval(id=>TeamFashion.vendor(id).name,vendor));await s.shot(vendor);await C.choose('Done');await C.until(C.idle,'closed '+vendor,300);console.log('ok: '+vendor);
  }
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);
  console.log('ok: native Celadon boutique purchase/wear/reload and all eight regional boutique dispatches');
 }catch(e){console.log(await s.text());console.log(s.errors);await s.shot('failure');throw e;}finally{await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
