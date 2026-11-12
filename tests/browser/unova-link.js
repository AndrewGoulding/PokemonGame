'use strict';const assert=require('node:assert/strict'),T=require('./lib');
// The C-Gear's Wireless panel through the native device: Game Sync tucks in the first Pokémon (Good Night) and a
// Feeling Check with someone nearby counts a play and offers the Pal Pad.
(async()=>{const s=await T.start(p=>{p.party=[Party.create('Snivy',20)];p.badges=['basic'];Player.addItem(p,'unova-cgear',1);p.flags.registered='unova-cgear';Object.assign(Unova.state(p),{starter:'Snivy',medalBox:true,medals:[0],cgear:true});p.repelSteps=100000;},{map:'UnovaAspertiaCity',x:20,y:30,facing:'down'},{out:'/tmp/pokemon-unova-link'});
 const idle=async()=>!/\S/.test((await s.text()).replace(/SELECT|START|\bA\b|\bB\b/g,'')),until=async(re,key='z')=>{for(let i=0;i<100;i++){if(re.test(await s.text())){await s.wait(500);return;}if(key)await s.press(key);await s.wait(200);}throw Error('No '+re);},close=async()=>{for(let i=0;i<30&&!(await idle());i++){await s.press('z');await s.wait(250);}};
 const open=async label=>{await s.press('Backspace');const gear=s.page.getByRole('dialog',{name:'Unova C-Gear',exact:true});await gear.waitFor();await s.shot('cgear');await gear.getByRole('button',{name:label,exact:true}).click();};
 try{await s.boot();
  await open('Game Sync');await until(/Snivy Lv\. 20 #1/,null);await s.press('z');await until(/tucked in/,null);await close();
  assert.equal(await s.eval(()=>UnovaLink.peek(Game.player).tucked?.species),'Snivy');assert(await s.eval(()=>UnovaRecords.medals(Game.player).some(m=>m.id===232)));
  await open('Feeling Check');for(let i=0;i<5;i++){await until(/Heart \d of 5[\s\S]*Blue/);await s.press('z');await s.wait(300);}
  await until(/matched \d+ points/,null);await close();
  assert.equal(await s.eval(()=>UnovaLink.peek(Game.player).feelings),1);assert(await s.eval(()=>UnovaLink.peek(Game.player).partners)>=1);await s.shot('feeling');
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);console.log('ok: C-Gear Wireless Game Sync (Good Night) and Feeling Check through the native device');
 }catch(e){console.log(s.errors);await s.shot('failure');throw e;}finally{await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
