'use strict';const assert=require('node:assert/strict'),T=require('./lib');
// Outdoor landmarks through the native field: Route 2's sign reads "Route 2" from the front and shows its graffiti from
// behind (Graffiti Gazer), and a Clay Tunnel Strength boulder counts toward Hustle Muscle when pushed.
(async()=>{const opts={out:'/tmp/pokemon-unova-landmarks'},edit=p=>{const m=Party.create('Machamp',50,{moves:['Strength','Karate Chop']});p.party=[m];p.badges=Unova.badges.slice();Object.assign(Unova.state(p),{starter:'Snivy',medalBox:true,medals:[0],champion:true});p.flags.unovaLeagueClear=true;p.repelSteps=100000;};
 const idle=async s=>!/\S/.test((await s.text()).replace(/SELECT|START|\bA\b|\bB\b/g,'')),close=async s=>{for(let i=0;i<20&&!(await idle(s));i++){await s.press('z');await s.wait(250);}};
 const until=async(s,re,key='z')=>{for(let i=0;i<30;i++){if(re.test(await s.text()))return;await s.press(key);await s.wait(200);}throw Error('No '+re);};
 let s=await T.start(edit,{map:'UnovaRoute2',x:27,y:5,facing:'up'},opts);
 try{await s.boot();await until(s,/Route 2/);await close(s);assert.equal(await s.eval(()=>!!UnovaInteriors.peek(Game.player).landmarks?.graffiti),false);
  const go=async(dir,x,y)=>{for(let i=0;i<4;i++){const l=await s.eval(()=>Game.player.location);if(l.x===x&&l.y===y)return;await s.walk(dir,1);await s.wait(150);}};
  await go('left',26,5);await go('up',26,4);await go('up',26,3);await go('right',27,3);for(let i=0;i<4&&(await s.eval(()=>Overworld.position().facing))!=='down';i++){await s.press('ArrowDown',60);await s.wait(200);}
  assert.deepEqual(await s.eval(()=>{const a=Overworld.position();return[a.x,a.y,a.facing];}),[27,3,'down']);
  await until(s,/graffiti/);await s.shot('graffiti');await close(s);assert(await s.eval(()=>UnovaRecords.medals(Game.player).some(m=>m.id===18)));
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);}
 catch(e){console.log(s.errors);await s.shot('failure');throw e;}finally{await s.close();}
 s=await T.start(edit,{map:'UnovaClayTunnel',x:24,y:14,facing:'up'},opts);
 try{await s.boot();await until(s,/Would you like to use Strength|use Strength/);await s.press('z');await s.wait(300);await close(s);
  for(let i=0;i<4&&!(await s.eval(()=>(Unova.peek(Game.player).boulders||[]).length));i++)await s.walk('up',1);
  assert.deepEqual(await s.eval(()=>Unova.peek(Game.player).boulders),['UnovaClayTunnel:BW_UnovaClayTunnel_BOULDER_2']);await s.shot('boulder');
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);}
 catch(e){console.log(s.errors);await s.shot('failure-boulder');throw e;}finally{await s.close();}
 console.log('ok: Route 2 sign front/back graffiti medal and a pushed Clay Tunnel boulder through the native field');
})().catch(e=>{console.error(e);process.exitCode=1;});
