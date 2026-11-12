'use strict';const assert=require('node:assert/strict'),T=require('./lib');
// Every region loads and plays: a town in each of Kanto, Johto, Hoenn, Sinnoh, Orre, Unova, Kalos, Alola, Galar and
// Paldea boots into the world from a save there, draws, walks, and opens and closes the menu with no page errors.
const TOWNS=['PalletTown','NewBarkTown','LittlerootTown','TwinleafTown','PhenacCity','UnovaAspertiaCity','KalosLumioseSouth','AlolaHeaheaCity','GalarPostwick','PaldeaCaboPoco'];
T.loadHeadless();
// A tile with open ground on every side, nearest the middle (no warp, person or sign on or beside it).
function spot(name){const m=WORLD_MAPS[name];assert(m,name);const free=(x,y)=>x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&!m.behavior[y*m.width+x]&&![...(m.warps||[]),...(m.people||[]),...(m.signs||[])].some(a=>Math.abs(a.x-x)+Math.abs(a.y-y)<2);
 let best=null;for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++){if(![[0,0],[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>free(x+dx,y+dy)))continue;const d=Math.abs(x-m.width/2)+Math.abs(y-m.height/2);if(!best||d<best.d)best={x,y,d};}assert(best,'no open tile in '+name);return{map:name,x:best.x,y:best.y,facing:'down'};}
(async()=>{const failures=[];
 for(const town of TOWNS){const at=spot(town),s=await T.start(p=>{p.repelSteps=100000;p.badges=[];},at,{out:'/tmp/pokemon-region-tour'});
  try{await s.boot();const inWorld=await s.eval(()=>{const w=document.getElementById('world');return !!w&&!w.classList.contains('hidden')&&!!window.Game?.player;});assert(inWorld,town+' did not reach the world');
   const loc=await s.eval(()=>Game.player.location.map);assert.equal(loc,town,town+' loaded '+loc);
   // A step (the first way that's open: Littleroot's moving truck can stand to the right) and back, then the menu.
   const start=await s.eval(()=>Overworld.position());let moved=start;const back={right:'left',left:'right',down:'up',up:'down'};for(const dir of ['right','left','down','up']){for(let i=0;i<3&&moved.x===start.x&&moved.y===start.y;i++){await s.walk(dir,1);await s.wait(200);moved=await s.eval(()=>Overworld.position());}if(moved.x!==start.x||moved.y!==start.y){assert.equal(Math.abs(moved.x-start.x)+Math.abs(moved.y-start.y),1,town+' one step');await s.walk(back[dir],1);break;}}assert(moved.x!==start.x||moved.y!==start.y,town+' could not walk');
   await s.press('Enter');await s.wait(500);const menu=await s.text();await s.press('x');await s.wait(400);await s.press('x');await s.wait(300);
   await s.shot(town);const errors=s.errors.filter(e=>!/^Failed to load resource:/.test(e));
   assert.deepEqual(errors,[],town+' page errors');assert(/\S/.test(menu),town+' menu');
   console.log('ok '+town+' ('+start.x+','+start.y+' → '+moved.x+','+moved.y+')');}
  catch(e){failures.push(town+': '+e.message.split('\n')[0]);console.log('FAIL '+town,e.message.split('\n')[0],s.errors.slice(0,3));await s.shot('failure-'+town);}
  finally{await s.close();}}
 assert.deepEqual(failures,[],failures.join('; '));console.log('ok: all '+TOWNS.length+' regions boot, draw, walk and open the menu');
})().catch(e=>{console.error(e);process.exitCode=1;});
