// Real Chromium/Playwright exploration of the Paldea visual overhaul.
// Runs in GitHub Actions with screenshots; verifies browser rendering,
// 32x32 SVG NPCs, keyboard walking, mapped interiors, warp destinations and saves.
'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const T=require('./lib');
const DEST=['PaldeaMossuiTown','PaldeaTerariumHub','PaldeaAcademy','PaldeaCommunityCenter','PaldeaTerapagosChamber'];
const OUT=path.join(__dirname,'out','paldea');
T.loadHeadless();
function safe(name){
 const m=WORLD_MAPS[name];assert(m,name+' missing');
 const free=(x,y)=>x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&
  !m.collision[y*m.width+x]&&m.behavior[y*m.width+x]!==2&&
  ![...m.warps,...m.people].some(a=>Math.abs(a.x-x)+Math.abs(a.y-y)<2);
 const cx=Math.floor(m.width/2),cy=Math.floor(m.height/2);
 const candidates=[];
 for(let y=3;y<m.height-3;y++)for(let x=3;x<m.width-3;x++){
  if(![[0,0],[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>free(x+dx,y+dy)))continue;
  candidates.push({x,y,d:Math.abs(x-cx)+Math.abs(y-cy)});
 }
 candidates.sort((a,b)=>a.d-b.d);
 if(!candidates.length)throw Error('No free walking cross on '+name);
 return{map:name,x:candidates[0].x,y:candidates[0].y,facing:'down'};
}
(async()=>{
 const initial=safe(DEST[0]);
 const s=await T.start(p=>{
  p.repelSteps=999999;
  p.party=[Party.create('Skeledirge',75)];
  Object.assign(Paldea.state(p),{
   starter:'Fuecoco',arvenMet:true,nemonaRoute:true,nemonaMesagoza:true,treasureHunt:true,paldeaClear:true,
   tealArrival:true,tealCarmineClear:true,tealKieranFirst:true,
   tealFestival:true,tealLoyalThree:true,tealKieranFinal:true,
   tealClear:true,indigoArrival:true,indigoEnrollment:true,
   indigoEliteClear:true,indigoKieranClear:true,
   indigoUnderdepthsClear:true,indigoClear:true
  });
 },initial,{out:OUT,storage:{'pokemon-options':JSON.stringify({textSpeed:2,battleScene:1,battleStyle:1,sound:2,follower:0,calls:0})}});
 const clean=()=>s.errors.filter(e=>!/^Failed to load resource:/.test(e));
 try{
  await s.boot();
  assert.equal(await s.eval(()=>Game.player.location.map),initial.map);
  const state=await s.eval(()=>({
   art:!!window.PaldeaArt,
   layouts:PaldeaLayouts.count,
   characters:PaldeaCharacters.count,
   worldVisible:!document.getElementById('world').classList.contains('hidden')
  }));
  assert(state.worldVisible&&state.art&&state.layouts>=40&&state.characters>=30,'Paldea visuals not bootstrapped');
  const artwork=await s.eval(async()=>{
   const scripts=['paldea/carmine','paldea/kieran','paldea/briar','paldea/nemona'];
   return Promise.all(scripts.map(async sprite=>{
    const img=new Image();
    img.src='assets/world/sprites/'+sprite+'.svg';
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('No character image: '+sprite));});
    return{sprite,width:img.naturalWidth,height:img.naturalHeight};
   }));
  });
  for(const pic of artwork)assert.deepEqual([pic.width,pic.height],[288,32],pic.sprite+' wrong frame dimensions');
  const hashes=[];
  for(let i=0;i<DEST.length;i++){
   const name=DEST[i],at=safe(name);
   await s.eval(loc=>Overworld.teleport(loc),at);
   await s.wait(650);
   assert.equal(await s.eval(()=>Game.player.location.map),name,name+' did not load in Chromium');
   const sample=await s.eval(()=>{
    const cv=document.getElementById('world'),ctx=cv.getContext('2d');
    const data=ctx.getImageData(0,0,cv.width,cv.height).data;
    let h=2166136261,nonzero=0;
    for(let j=0;j<data.length;j+=17){h=Math.imul(h^data[j],16777619)>>>0;if(data[j])nonzero++;}
    const m=WORLD_MAPS[Game.player.location.map];
    return{hash:h,nonzero,layout:m.paldeaLayout?.style,scripted:m.people.length};
   });
   assert(sample.nonzero>300,name+' rendered a blank or incomplete canvas');
   assert(sample.layout,name+' missing original walkable layout');
   if(name==='PaldeaCommunityCenter'||name==='PaldeaTerapagosChamber'){
    const bg=await s.eval(()=>{
     const cv=document.getElementById('world'),g=cv.getContext('2d');
     const pixels=[[cv.width-4,cv.height-4],[cv.width-4,4]].map(([x,y])=>
      [...g.getImageData(x,y,1,1).data].slice(0,3));
     return pixels;
    });
    assert(bg.every(rgb=>rgb.some(v=>v>20)),name+' has unpainted black interior margins');
   }
   hashes.push(sample.hash);
   if(i<4){
    const before=await s.eval(()=>Overworld.position());
    const moved=await s.eval(()=>({paused:Overworld.idle(),map:Game.player.location.map}));
    await s.walk('down',1);
    await s.wait(230);
    const after=await s.eval(()=>Overworld.position());
    assert.equal(after.map,name,name+' walking unexpectedly changed region');
    assert(after.y!==before.y||after.x!==before.x,name+' could not move by keyboard');
    await s.walk('up',1);
    await s.wait(180);
   }
   await s.shot(String(i+1).padStart(2,'0')+'-'+name);
   console.log('PALDEA BROWSER '+name+' layout='+sample.layout+' pixels='+sample.nonzero+' checksum='+sample.hash);
  }
  assert(new Set(hashes).size>=4,'Paldea town and biome scenery looks identical on canvas');
  // Native dialogue: face Kitakami's healer in a genuine interior and
  // trigger the interaction through Z, rather than invoking story code.
  const approached=await s.eval(async()=>{
   const m=WORLD_MAPS.PaldeaCommunityCenter;
   const npc=m.people.find(p=>p.script==='sv:teal-heal');
   if(!npc)throw Error('Kitakami healer missing');
   const dirs=[[0,1,'up'],[1,0,'left'],[-1,0,'right'],[0,-1,'down']];
   const d=dirs.find(([dx,dy])=>{
    const x=npc.x+dx,y=npc.y+dy;
    return x>=1&&y>=1&&x<m.width-1&&y<m.height-1&&!m.collision[y*m.width+x]&&
     !m.people.some(p=>p.x===x&&p.y===y)&&!m.warps.some(w=>w.x===x&&w.y===y);
   });
   if(!d)throw Error('Healer has no adjacent dialogue tile');
   await Overworld.teleport({map:m.name,x:npc.x+d[0],y:npc.y+d[1],facing:d[2]});
   return{script:npc.script,position:[npc.x,npc.y]};
  });
  assert.equal(approached.script,'sv:teal-heal');
  await s.wait(600);
  await s.press('z');
  await s.page.waitForFunction(()=>Game.player.flags.lastCenter==='PaldeaCommunityCenter',{timeout:8000});
  await s.shot('06-Kitakami-healer');
  const visit=await s.eval(()=>Paldea.peek(Game.player).visited);
  assert(visit.includes('PaldeaCommunityCenter'),'Interiors must register as visited');
  assert.deepEqual(clean(),[],'Chromium page errors');
  console.log('Paldea Chromium smoke passed: 5 rendered maps, 4 walks, NPC dialogue, custom SVG sprites and distinct pixels');
 }catch(e){
  console.error('Paldea browser failures:',clean());
  try{console.error('Position:',await s.eval(()=>Game.player?.location));await s.shot('failure');}catch(_){}
  throw e;
 }finally{await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
