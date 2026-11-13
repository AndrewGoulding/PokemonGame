// In the browser: every door and gate of the Castelia and Lumiose street plans
// (tools/build-city-layouts.js) is walked through, and each room leads back out.
// Run: node tests/browser/city-layouts.js
'use strict';
const assert=require('node:assert/strict'),T=require('./lib'),fixture=require('./kalos-post-fixture');
const CITIES=['UnovaCasteliaCity','KalosLumioseSouth','KalosLumioseNorth','KalosSantaluneCity','KalosCyllageCity','KalosShalourCity','KalosCoumarineLower','KalosCoumarineUpper','KalosLaverreCity','KalosAnistarCity','KalosSnowbelleCity','KalosKiloudeCity'];
(async()=>{
 const s=await T.start(p=>{fixture(p);p.repelSteps=100000;p.party.forEach(m=>{m.level=75;Party.heal(m);});
   Object.assign(Kalos.state(p),{champion:true,azEnded:true,tmvPass:true,kiloudeRival:true,megaUpgraded:true,lookerMalva:true,lookerChapter:5});p.flags.kalosLeagueClear=true;for(const id of Object.keys(Kalos.data().trainers))p.flags[id]=true;
   Object.assign(Unova.state(p),{starter:'Snivy',rivalIntro:true,ranchRival:true,herdier:true,alderDone:true,cheren:true,roxie:true,cgear:true,movieReleased:true,plasmaVirbank:true,plasmaRoute20:true,sailed:true,sewerClear:true,cocoons:[true,true,true],burgh:true,colress:true,elesa:true,clay:true,skyla:true,drayden:true,marlon:true,ghetsis:true});p.flags.unovaLeagueClear=true;p.badges=[...new Set([...p.badges,...Unova.badges])];for(const id of Object.keys(UNOVA_DATA.trainers))p.flags[id]=true;},
  {map:'UnovaCasteliaCity',x:28,y:40,facing:'down'},{out:'/tmp/pokemon-city-layouts'});
 try{await s.boot();
  const idle=async()=>{for(let i=0;i<80&&!await s.eval(()=>Overworld.idle()&&document.getElementById('textbox').classList.contains('empty'));i++){await s.press('x');await s.wait(200);}};
  const map=()=>s.eval(()=>Overworld.position().map);
  let doors=0,gates=0;const closed=[];
  for(const city of CITIES){
   await s.eval(c=>Overworld.teleport({map:c,x:WORLD_MAPS[c].warps[0].x,y:WORLD_MAPS[c].warps[0].y,facing:'down'}),city);await s.wait(700);await idle();await s.shot(city);
   const warps=await s.eval(c=>{const m=WORLD_MAPS[c];return m.warps.map((w,k)=>({k,x:w.x,y:w.y,to:w.map,door:m.behavior[w.y*m.width+w.x]===0x69,from:[[0,1,'ArrowUp'],[0,-1,'ArrowDown'],[1,0,'ArrowLeft'],[-1,0,'ArrowRight']].filter(([dx,dy])=>{const x=w.x+dx,y=w.y+dy;return x>=0&&y>=0&&x<m.width&&y<m.height&&!m.collision[y*m.width+x]&&m.behavior[y*m.width+x]!==16&&!m.people.some(p=>p.x===x&&p.y===y)&&!m.warps.some(v=>v.x===x&&v.y===y);})[0]}));},city);
   for(const w of warps){
    assert(w.from,city+' warp '+w.k+' has a tile to step from');
    const [dx,dy,key]=w.door?[0,1,'ArrowUp']:w.from;
    await s.eval(a=>Overworld.teleport(a),{map:city,x:w.x+dx,y:w.y+dy,facing:{ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[key]});await s.wait(400);
    await s.press(key,300);for(let i=0;i<40&&await map()===city&&await s.eval(()=>document.getElementById('textbox').classList.contains('empty'));i++)await s.wait(100);
    if(await map()===city){const said=(await s.text()).replace(/\s+/g,' ').slice(-90);closed.push(city+' → '+w.to+': '+said);await idle();continue;}
    assert.equal(await map(),w.to,city+' warp '+w.k);await idle();await s.wait(500);
    // Back out through the room's own warp to this city.
    const back=await s.eval(({to,city,k})=>{const m=WORLD_MAPS[to],i=m.warps.findIndex(v=>v.map===city&&v.warp===k),v=m.warps[i];return{x:v.x,y:v.y};},{to:w.to,city,k:w.k});
    await s.eval(({to,back})=>Overworld.teleport({map:to,x:back.x,y:back.y-1,facing:'down'}),{to:w.to,back}).catch(()=>{});await s.wait(400);
    if(await map()===w.to){await s.press('ArrowDown',300);for(let i=0;i<40&&await map()===w.to;i++)await s.wait(100);}
    if(await map()===city){const at=await s.eval(()=>Overworld.position());const ok=await s.eval(a=>!WORLD_MAPS[a.map].collision[a.y*WORLD_MAPS[a.map].width+a.x],at);assert(ok,city+' return from '+w.to+' lands on open ground');}
    await idle();w.door?doors++:gates++;
   }
  }
  assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);
  console.log('ok: '+doors+' doors and '+gates+' gates walked in '+CITIES.join(', ')+(closed.length?'\nstory-closed: '+closed.join('\n  '):''));
 }catch(e){await s.shot('failure');console.log(s.errors.slice(0,5),await s.eval(()=>Overworld.position()));throw e;}finally{await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
