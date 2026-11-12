// Unified Sword/Shield midgame: 5 badges, dual-version Gyms, map and persistence.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [,src]of html.matchAll(/<script src="([^"]+)"><\/script>/g)){
 if(!src.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,src),'utf8'),{filename:src});
}
for(const file of ['ui/galar-mid.js','ui/galar-finale.js','ui/galar-dlc.js','ui/galar-story.js'])
 vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
(async()=>{
 const D=Galar.data(),M=GalarMid,T=TOWN_MAP.galar;
 assert.equal(D.mapNames.length,90);assert.equal(D.midgame.mapNames.length,24);
 for(const name of D.midgame.mapNames){
  const m=WORLD_MAPS[name],at=T.at[name];
  assert(Galar.owns(name)&&M.owns(name)&&at&&T.map[at[1]][at[0]],name+' not on map');
  assert.equal(m.collision.length,m.width*m.height);
  for(const w of m.warps){
   const to=WORLD_MAPS[w.map];assert(to,name+' dangling warp');
   assert.equal(to.warps[w.warp]?.map,name,name+' nonreciprocal warp');
   assert.equal(m.collision[w.y*m.width+w.x],0,name+' blocked warp');
  }
  for(const npc of m.people){
   assert.equal(m.collision[npc.y*m.width+npc.x],0,name+' NPC on collision');
   assert(!m.warps.some(w=>w.x===npc.x&&w.y===npc.y),name+' NPC on warp');
  }
 }
 const entry=WORLD_MAPS.GalarMotostokeOutskirts.warps;
 assert.equal(entry.length,2);assert.equal(entry[1].map,'GalarWildAreaNorth');
 assert.equal(WORLD_MAPS.GalarWildAreaNorth.warps[0].map,'GalarMotostokeOutskirts');
 for(const sec of Object.keys(T.fly)){
  const spot=T.fly[sec],m=D.maps[spot.map];
  assert(m&&!m.collision[spot.y*m.width+spot.x],sec+' unsafe Fly destination');
  assert(!m.warps.some(w=>w.x===spot.x&&w.y===spot.y));
 }
 for(const center of D.midgame.centers){
  const at=Player.CENTERS[center],m=WORLD_MAPS[center];assert(at);
  assert.equal(m.collision[at.y*m.width+at.x],0,center+' blocked center');
 }
 const p=Player.create('Galar Mid Tester'),s=Galar.state(p);
 p.party=[Party.create('Cinderace',52)];p.location={map:'GalarMotostokeOutskirts',x:14,y:14,facing:'down'};
 Object.assign(s,{started:true,starter:'Scorbunny',hopMet:true,hopFirst:true,wealdClear:true,soniaMet:true,route2Hop:true,endorsement:true,
 ceremony:true,bedeMineWon:true,miloClear:true,nessaClear:true,mine2Clear:true,kabuClear:true,
 badges:['Grass Badge','Water Badge','Fire Badge']});
 p.flags.alola={championClear:true};const preserved=JSON.stringify(p.flags.alola);
 let result='won',battles=[],saves=0,words=[];
 const env={player:()=>p,say:async s=>words.push(s),confirm:async()=>true,canBattle:()=>true,
  choose:async(_,options)=>options[0],battle:async(_,data)=>{battles.push(data.trainerId);return result;},
  showWorld(){},resume:async()=>{},mart:async()=>{},saveCheckpoint:async()=>{saves++;},
  teleport:async loc=>{p.location={...loc};Galar.visit(p,loc.map);}};
 const story=GalarStory.create(env),go=async key=>story.run('swsh:'+key);
 assert.equal(Galar.cap(p),45);
 assert.equal(M.allowed(p,'GalarWildAreaNorth'),null);
 assert(M.allowed(p,'GalarRoute6'));
 assert.equal(M.allowed(p,'GalarHammerlockeGate'),null,'Hammerlocke Center should be accessible');
 await go('hop-hammerlocke');assert(s.hopHammerlocke);
 await go('team-yell-route6');assert(s.yellRoute6);
 result='lost';await go('stow-gym');assert(!s.stowClear);
 result='won';await go('stow-gym');assert(s.stowClear&&s.beaWon&&s.allisterWon);
 assert(s.badges.includes('Stow-on-Side Badge'));assert.equal(Galar.cap(p),55);
 await go('bede-stow');assert(s.bedeStow);
 await go('opal-gym');assert(s.opalClear);assert.equal(Galar.cap(p),60);
 await go('hop-route7');assert(s.hopRoute7);
 await go('circhester-gym');assert(s.circhesterClear&&s.gordieWon&&s.melonyWon);assert.equal(Galar.cap(p),65);
 await go('team-yell-route9');assert(s.yellRoute9);
 await go('marnie-spikemuth');assert(s.marnieSpikemuth);
 await go('piers-gym');assert(s.piersClear);assert.equal(Galar.cap(p),70);
 await go('raihan-gym');assert(s.raihanClear);assert.equal(Galar.cap(p),80);
 assert.equal(s.badges.length,8);
 for(const name of D.midgame.mapNames)assert.equal(Galar.allowed(p,name),null,name+' locked after all badges');
 const ids=['SWSH_GYM_BEA','SWSH_GYM_ALLISTER','SWSH_GYM_OPAL','SWSH_GYM_GORDIE','SWSH_GYM_MELONY','SWSH_GYM_PIERS','SWSH_GYM_RAIHAN'];
 for(const id of ids)assert(battles.includes(id),id+' missing');
 const before=battles.length;await go('stow-gym');await go('circhester-gym');
 assert.equal(battles.length,before,'completed Gym fights must not repeat');
 const copy=Player.load(JSON.parse(Player.serialize(p))).player;
 assert.equal(Galar.peek(copy).badges.length,8);assert(Galar.peek(copy).raihanClear);
 assert.equal(JSON.stringify(copy.flags.alola),preserved);
 assert(saves>15&&words.length>12);
 console.log('Galar midgame: 24 maps, 5 Gym badges, dual leaders, safe Fly and save/reload passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
