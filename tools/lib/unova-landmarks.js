// Outdoor source landmarks that the Medal Rally counts: the Trainer Tips signs (flags 0xa64–0xa75,
// PokemonCenter_CheckTrainerTipsSigns), Route 2's signboard graffiti (route_2 Script_3, Medal 18), Humilau's face
// board (humilau_city Script_10, Medal 98) and Twist Mountain's Heavy Machinery Pro and his truck quiz
// (twist_mountain_5 Script_3, Medal 99). Each is projected from its source grid onto the authored map, like the houses.
'use strict';
module.exports=function({source,M,bankMaps,json,read,clean,actor,trainer}){
 const fs=require('fs'),path=require('path'),data={tips:{},signs:[]};
 const ev=b=>json('res/field/events/'+b+'.json'),texts=b=>Object.fromEntries(read('res/text/script/'+b+'.txt').split(/\r?\n/).map(s=>s.match(/^(\w+)\s*=\s*(.*)$/)).filter(Boolean).map(a=>[a[1],clean(a[2])]));
 function blocks(b){const out={};for(const part of read('res/field/scripts/'+b+'.s').split(/^(?=Script_\d+:)/m)){const n=part.match(/^Script_(\d+):/);if(n)out[n[1]]=part;}return out;}
 const map=b=>{const m=bankMaps[b];if(!m)throw Error('Unmapped landmark bank '+b);return m;};
 // A source grid point on the authored map: the bank's events' bounding box stretched over the map's inner area.
 function project(b,m,x,y){const e=ev(b),pts=(e.npcs||[]).filter(a=>a.grid).map(a=>[a.grid.x,a.grid.z]).concat((e.bg_events||[]).filter(a=>a.grid).map(a=>[a.grid.x,a.grid.y]),(e.warps||[]).filter(w=>w.grid).map(w=>[w.grid.x/16,w.grid.z/16])),xs=pts.map(a=>a[0]),ys=pts.map(a=>a[1]),lx=Math.min(...xs),ly=Math.min(...ys);
  return{x:3+Math.round((m.width-7)*(x-lx)/Math.max(1,Math.max(...xs)-lx)),y:3+Math.round((m.height-7)*(y-ly)/Math.max(1,Math.max(...ys)-ly))};}
 const walk=(m,x,y)=>x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&![0x10,0x11,0x12,0x13,0x15].includes(m.behavior[y*m.width+x]);
 const taken=(m,x,y)=>[...m.people,...m.warps,...m.signs,...(m.hidden||[])].some(a=>Math.abs(a.x-x)+Math.abs(a.y-y)<2);
 // The nearest free tile with walkable ground below it, where the player stands to read it facing up.
 function spot(m,x,y,both=false){let best=null;for(let yy=4;yy<m.height-4;yy++)for(let xx=4;xx<m.width-4;xx++){if(!walk(m,xx,yy)||!walk(m,xx,yy+1)||taken(m,xx,yy)||taken(m,xx,yy+1)||both&&(!walk(m,xx,yy-1)||taken(m,xx,yy-1)))continue;const d=Math.abs(xx-x)+Math.abs(yy-y);if(!best||d<best.d)best={x:xx,y:yy,d};}if(!best)throw Error('No landmark spot on '+m.name);return best;}
 function sign(b,bg,script,kind='sign',both=false){const m=map(b),at=project(b,m,bg.grid.x,bg.grid.y),s=spot(m,at.x,at.y,both);m.signs.push({x:s.x,y:s.y,script});m.collision[s.y*m.width+s.x]=1;m.art.props.push({x:s.x,y:s.y,kind});data.signs.push({bank:b,map:m.name,x:s.x,y:s.y,script});return{map:m.name,x:s.x,y:s.y};}
 // Trainer Tips: every sign script that sets one of the 18 flags (Route 4's two banks share 0xa6b).
 const flags=new Set(Array.from({length:18},(_,i)=>0xa64+i));
 for(const b of fs.readdirSync(path.join(source,'res/field/scripts')).filter(f=>/^(?!global)\w+\.s$/.test(f)).map(f=>f.slice(0,-2)).sort()){
  if(!fs.existsSync(path.join(source,'res/field/events/'+b+'.json')))continue;const s=blocks(b);let t=null;
  for(const[n,block]of Object.entries(s)){const f=block.match(/FlagSet EVENT_FLAG_0x0(a[67][0-9a-f])/);if(!f||!flags.has(parseInt(f[1],16)))continue;const bg=(ev(b).bg_events||[]).find(a=>a.script===+n&&a.grid);if(!bg)continue;if(!bankMaps[b]){(data.unmapped||(data.unmapped=[])).push(b);continue;}t||=texts(b);
   const flag=parseInt(f[1],16),key=b+'-'+n,text=[...block.matchAll(/MsgPlaceSign (\w+)/g)].map(a=>t[a[1]]).filter(Boolean).join('\f');data.tips[key]={flag,text,...sign(b,bg,'bw:landmark-tips-'+key)};}}
 // Route 2's sign, which hides graffiti on its back: read from the north side (facing down) for Medal 18.
 {const b='route_2',s=blocks(b),t=texts(b),bg=ev(b).bg_events.find(a=>a.script===3);const text=[...s[3].matchAll(/MsgPlaceSign (\w+)/g)].map(a=>t[a[1]])[0];data.graffiti={text,back:t.Route2_Text_TheresSomeGraffitiOther,...sign(b,bg,'bw:landmark-graffiti','sign',true)};}
 // Humilau's face board (postgame, once a day): the four photographer lines of EVENT_WORK_0x4001.
 {const b='humilau_city',t=texts(b),tr=ev(b).triggers.find(a=>a.script===10),bg={grid:{x:tr.grid.x,y:tr.grid.z}};data.faceBoard={plain:t.HumilauCity_Text_ItsFaceBoard,found:t.HumilauCity_Text_TheresFaceBoard,cheese:t.HumilauCity_Text_SayCheeseOneTwo,lines:[t.HumilauCity_Text_Souvenir,t.HumilauCity_Text_ItsLonelyTakingBy,t.HumilauCity_Text_ImSuperfanFaceBoards,t.HumilauCity_Text_Thita],...sign(b,bg,'bw:landmark-face-board','face-board')};}
 // The Heavy Machinery Pro: one TruQ question a day, the next after a right answer; all five give Medal 99.
 {const b='twist_mountain_5',t=texts(b),e=ev(b),pro=e.npcs.find(a=>a.script===3),m=map(b),at=project(b,m,pro.grid.x,pro.grid.z),s=spot(m,at.x,at.y);
  const q=(i,opts)=>({question:t['TwistMountain5_Text_ConstructionTruckQuizShort'+(i?'_'+(i+1):'')],options:opts.map(k=>t['TwistMountain5_Text_'+k])});
  data.truckQuiz={map:m.name,hello:t.TwistMountain5_Text_HelloImHeavyMachinery,cool:t.TwistMountain5_Text_OhKnewConstructionTrucks,notHeard:t.TwistMountain5_Text_WhatSorryCouldntHear,start:t.TwistMountain5_Text_HiIveBeenWaiting,right:t.TwistMountain5_Text_YayFutureHeavyMachinery,tomorrow:t.TwistMountain5_Text_IfComeBackTomorrow,perfect:t.TwistMountain5_Text_WowYoureAmazingGot,medal:t.TwistMountain5_Text_IllTellMrMedal,done:t.TwistMountain5_Text_ImHappyWitnessedCrowning,
   questions:[q(0,['VirbankCity','DriftveilCity','UndellaTown','HumilauCity']),q(1,['Green','Yellow','White','Black']),q(2,['FirstQuestion','SecondQuestion','ThirdQuestion','FourthQuestion']),q(3,['HumilauCityGym','OpelucidCityGym','MistraltonCityGym','DriftveilCityGym']),q(4,['One','Two','Three','Four'])],answers:[0,1,2,3,1]};
  actor(m,s.x,s.y,'bw:landmark-truck-quiz',pro.model.replace('OBJ_CODE_','').toLowerCase());}
 // The Ferris wheel's seasonal riders after the League (sSeasonTrainers, by season × 2 + the player's sex: 0 boy, 1 girl):
 // battle the season's rider, then ride. Medal 181 wants all four seasons' riders.
 data.ferris={trainers:['LASS_PERSEPHONE','DANCER_DIRK','NURSERY_AIDE_JUNE','CLERK_M_AUGUSTIN','CLERK_F_TRISHA','HIKER_ANDY','BEAUTY_DECEMBER','GUITARIST_JANUARY'].map(n=>trainer('TRAINER_'+n))};
 // Strength boulders (OBJ_CODE_MODEL_BIGROCK2, script 10000) of the mapped caves, for Hustle Muscle (20 moved). A boulder
 // goes only where it cuts no warp off from the others and can be pushed at least two ways.
 data.boulders=[];data.bouldersUnmapped=[];
 const open=(m,x,y)=>walk(m,x,y)&&!m.people.some(a=>a.x===x&&a.y===y);
 function regions(m,block){const id=new Int32Array(m.width*m.height).fill(-1);let n=0;for(let i=0;i<id.length;i++){const x=i%m.width,y=(i-x)/m.width;if(id[i]>=0||!open(m,x,y)||i===block)continue;const q=[i];id[i]=n;for(let k=0;k<q.length;k++){const j=q[k],jx=j%m.width;for(const t of [j-1,j+1,j-m.width,j+m.width]){if(t<0||t>=id.length||t===block||id[t]>=0||Math.abs(t%m.width-jx)>1)continue;const tx=t%m.width,ty=(t-tx)/m.width;if(open(m,tx,ty)){id[t]=n;q.push(t);}}}n++;}
  return new Set(m.warps.map(w=>{let best=-1;for(const[dx,dy]of [[0,0],[0,1],[0,-1],[1,0],[-1,0]]){const x=w.x+dx,y=w.y+dy;if(x>=0&&y>=0&&x<m.width&&y<m.height&&id[y*m.width+x]>=0){best=id[y*m.width+x];break;}}return best;}).filter(g=>g>=0)).size;}
 for(const b of fs.readdirSync(path.join(source,'res/field/events')).filter(f=>f.endsWith('.json')&&!f.includes('schema')).map(f=>f.slice(0,-5)).sort()){const e=ev(b);if(!Array.isArray(e.npcs))continue;const rocks=e.npcs.filter(a=>a.model==='OBJ_CODE_MODEL_BIGROCK2'&&a.grid);if(!rocks.length)continue;const m=bankMaps[b];if(!m){data.bouldersUnmapped.push(b);continue;}
  for(const r of rocks){const at=project(b,m,r.grid.x,r.grid.z),base=regions(m,-1),cells=[];for(let y=3;y<m.height-3;y++)for(let x=3;x<m.width-3;x++){if(!open(m,x,y)||taken(m,x,y))continue;const ways=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>open(m,x-dx,y-dy)&&open(m,x+dx,y+dy)).length;if(ways<2)continue;cells.push({x,y,d:Math.abs(x-at.x)+Math.abs(y-at.y)});}
   cells.sort((a,b)=>a.d-b.d);const c=cells.find(c=>regions(m,c.y*m.width+c.x)<=base);if(!c){data.bouldersUnmapped.push(b+'#'+r.id);continue;}
   const localId='BW_'+m.name+'_BOULDER_'+r.id;m.people.push({id:'bw-boulder-'+b+'-'+r.id,localId,x:c.x,y:c.y,script:'EventScript_StrengthBoulder',sprite:'em_misc_pushable_boulder',width:16,height:16,frames:1,movement:'face_down',rangeX:0,rangeY:0});data.boulders.push({bank:b,map:m.name,localId});}}
 data.audit={boulders:data.boulders.length,tips:Object.keys(data.tips).length,tipFlags:new Set(Object.values(data.tips).map(a=>a.flag)).size};return data;
};
