'use strict';const assert=require('node:assert/strict'),T=require('./lib');
// House fixtures through the native field: A in front of a gatehouse vending machine buys a drink (Vending Virtuoso,
// record 125) until Cancel, its trash can counts Trash Master (record 43), and an Aspertia house TV shows a programme
// (Television Kid, record 23).
(async()=>{const s=await T.start(p=>{p.party=[Party.create('Snivy',10)];p.money=5000;Object.assign(Unova.state(p),{starter:'Snivy',medalBox:true,medals:[0]});p.repelSteps=100000;},{map:'UnovaHouseBridgeGateGate6',x:3,y:4,facing:'up'},{out:'/tmp/pokemon-unova-house-fixtures'});
 const rec=k=>s.eval(k=>Unova.peek(Game.player).records?.[k]||0,k),idle=async()=>!/\S/.test((await s.text()).replace(/SELECT|START|\bA\b|\bB\b/g,''));
 // Press A until the dialog shows text, then until the dialog closes.
 const until=async(re,key='z')=>{for(let i=0;i<40;i++){if(re.test(await s.text()))return;await s.press(key);await s.wait(200);}throw Error('No '+re);},close=async()=>{for(let i=0;i<20&&!(await idle());i++){await s.press('z');await s.wait(250);}assert(await idle(),'dialog closed');};
 try{await s.boot();
  await until(/Fresh Water · ₽200/);await s.press('z');for(let i=0;i<20&&!(await rec('vending'));i++)await s.wait(200);assert.equal(await rec('vending'),1);
  await until(/buy another one/);await s.shot('vending');await until(/Cancel/,'ArrowUp');await s.presses('ArrowDown',3);await s.press('z');await until(/Decided not to buy/);await close();
  assert.deepEqual(await s.eval(()=>[Game.player.money,Player.itemCount(Game.player,'fresh-water')]),[4800,1]);
  for(let i=0;i<6&&(await s.eval(()=>Game.player.location.x))<6;i++)await s.walk('right',1);await s.press('ArrowUp');assert.deepEqual(await s.eval(()=>[Game.player.location.x,Game.player.location.y]),[6,4]);
  await until(/trash can is empty/);assert.equal(await rec('trash'),1);await s.shot('trash');await close();
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);
 }catch(e){console.log(s.errors);await s.shot('failure');throw e;}finally{await s.close();}
 const t=await T.start(p=>{p.party=[Party.create('Snivy',10)];Object.assign(Unova.state(p),{starter:'Snivy',medalBox:true,medals:[0]});},{map:'UnovaHouseAspertiaCity4',x:18,y:7,facing:'up'},{out:'/tmp/pokemon-unova-house-fixtures'});
 try{await t.boot();for(let i=0;i<30&&!/CELEBRITY/.test(await t.text());i++){await t.press('z');await t.wait(200);}assert(/BATTLE/.test(await t.text()));await t.press('z');
  for(let i=0;i<20&&!(await t.eval(()=>Unova.peek(Game.player).records?.tv));i++)await t.wait(200);assert.equal(await t.eval(()=>Unova.peek(Game.player).records.tv),1);await t.shot('tv');
  assert.deepEqual(t.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);
 }catch(e){console.log(t.errors);await t.shot('failure-tv');throw e;}finally{await t.close();}
 console.log('ok: native gatehouse vending machine (buy, buy-another prompt, Cancel), trash can and Aspertia house TV count their Medal Rally records');
})().catch(e=>{console.error(e);process.exitCode=1;});
