'use strict';const assert=require('node:assert/strict'),T=require('./lib');
// The newer regions' people answer A in the field: their scripts (usum:, swsh:, sv:) must be ones the overworld hands
// to the story code. For each, the first scripted person in a town with open ground below them, faced from there.
T.loadHeadless();
const TOWNS={alola:['AlolaHauoliCity','usum:'],galar:['GalarPostwick','swsh:'],paldea:['PaldeaCaboPoco','sv:']};
function below(map,prefix){const m=WORLD_MAPS[map],open=(x,y)=>!m.collision[y*m.width+x]&&!m.people.some(p=>p.x===x&&p.y===y);const p=m.people.find(p=>(p.script||'').startsWith(prefix)&&/^face_/.test(p.movement||'face_')&&open(p.x,p.y+1));assert(p,'no '+prefix+' person in '+map);return{person:p.script,at:{map,x:p.x,y:p.y+1,facing:'up'}};}
(async()=>{const failures=[];
 for(const[region,[map,prefix]]of Object.entries(TOWNS)){const{person,at}=below(map,prefix),s=await T.start(p=>{p.repelSteps=100000;},at,{out:'/tmp/pokemon-region-talk'});
  try{await s.boot();let text='';for(let i=0;i<3&&!/\S/.test(text);i++){await s.press('z');await s.wait(1500);text=(await s.text()).replace(/SELECT|START|\bA\b|\bB\b/g,'').trim();}
   await s.shot(region);assert(text,region+': '+person+' said nothing');assert.deepEqual(s.errors.filter(e=>!/^Failed to load resource:/.test(e)),[]);console.log('ok '+region+' '+person+': '+JSON.stringify(text.slice(0,40)));}
  catch(e){failures.push(e.message.split('\n')[0]);await s.shot('failure-'+region);}finally{await s.close();}}
 assert.deepEqual(failures,[],failures.join('; '));console.log('ok: Alola, Galar and Paldea people answer A in the field');
})().catch(e=>{console.error(e);process.exitCode=1;});
