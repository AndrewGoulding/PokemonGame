// Galar Wyndon, Darkest Day, Champion and postgame regression.
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const[,src]of html.matchAll(/<script src="([^"]+)"><\/script>/g))
 if(!src.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,src),'utf8'),{filename:src});
for(const file of ['ui/galar-mid.js','ui/galar-finale.js','ui/galar-dlc.js','ui/galar-features.js','ui/galar-extras.js','ui/galar-story.js'])
 vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
(async()=>{
 const D=Galar.data(),F=GalarFinale,T=TOWN_MAP.galar;
 assert.equal(D.mapNames.length,90);assert.equal(D.finale.mapNames.length,13);
 for(const name of D.finale.mapNames){
  const m=WORLD_MAPS[name],at=T.at[name];assert(Galar.owns(name)&&F.owns(name));
  assert(at&&T.map[at[1]][at[0]],name+' missing map cell');
  assert.equal(m.collision.length,m.width*m.height);
  for(const w of m.warps){const next=WORLD_MAPS[w.map];assert(next,name+' dangling warp');
   assert.equal(next.warps[w.warp]?.map,name,name+' not reciprocal');
   assert.equal(m.collision[w.y*m.width+w.x],0,name+' blocked warp');}
  for(const npc of m.people){assert.equal(m.collision[npc.y*m.width+npc.x],0,name+' blocked NPC');
   assert(!m.warps.some(w=>w.x===npc.x&&w.y===npc.y),name+' NPC on exit');}
 }
 assert.equal(WORLD_MAPS.GalarHammerlockeStadium.warps[1].map,'GalarRoute10');
 assert.equal(WORLD_MAPS.GalarSlumberingWeald.warps[1].map,'GalarSlumberingDepths');
 const spot=T.fly[T.mapSections.GalarWyndonCity];assert(spot);
 assert.equal(WORLD_MAPS[spot.map].collision[spot.y*WORLD_MAPS[spot.map].width+spot.x],0);
 const p=Player.create('Galar Champion Tester'),s=Galar.state(p);
 p.party=[Party.create('Cinderace',75)];
 p.location={map:'GalarHammerlockeStadium',x:14,y:14,facing:'down'};
 Object.assign(s,{started:true,starter:'Scorbunny',kabuClear:true,stowClear:true,opalClear:true,circhesterClear:true,piersClear:true,raihanClear:false,
 badges:['Grass Badge','Water Badge','Fire Badge','Stow-on-Side Badge','Fairy Badge','Circhester Badge','Dark Badge','Dragon Badge']});
 p.flags.alola={championClear:true};const other=JSON.stringify(p.flags.alola);
 let won=true,saves=0,battles=[],spoken=[],yes=true;
 const env={player:()=>p,say:async v=>spoken.push(v),confirm:async()=>yes,canBattle:()=>true,
 choose:async(_,options)=>options[0],battle:async(_,data)=>{battles.push(data.trainerId);return won?'won':'lost';},
 wildEncounter:async mon=>{if(!won)return 'won';Player.receive(p,mon);return 'caught';},
 showWorld(){},resume:async()=>{},mart:async()=>{},
 saveCheckpoint:async()=>{saves++;},teleport:async loc=>{p.location={...loc};Galar.visit(p,loc.map);}};
 const story=GalarStory.create(env),go=k=>story.run('swsh:'+k);
 assert(F.allowed(p,'GalarRoute10'),'Raihan must be required');
 s.raihanClear=true;assert.equal(Galar.cap(p),80);assert.equal(F.allowed(p,'GalarRoute10'),null);
 await go('cup-marnie');assert(!s.cupMarnieWon,'Registration gate');
 await go('cup-registration');assert(s.cupRegistered);
 won=false;await go('cup-marnie');assert(!s.cupMarnieWon,'Loss must be retryable');
 won=true;await go('cup-marnie');await go('cup-hop');assert(s.cupHopWon);
 assert(F.allowed(p,'GalarRoseTowerTop'),'Security gate');
 await go('macro-cosmos');await go('rose-oleana');assert(s.oleanaWon);
 for(const key of ['cup-bede','cup-nessa','cup-bea','cup-allister','cup-raihan'])await go(key);
 assert(s.cupFinalistsClear);assert.equal(Galar.cap(p),85);
 await go('chairman-rose');assert(s.roseWon);
 won=false;await go('eternatus');assert(!s.eternatusClear,'Knockout must not count as capture');
 won=true;await go('eternatus');assert(s.eternatusClear);assert.equal(Galar.cap(p),90);
 await go('champion-leon');assert(s.championClear);assert.equal(Galar.cap(p),100);
 assert.equal(s.galarTitles,1);
 assert.equal(F.allowed(p,'GalarBattleTower'),null);
 await go('champion-leon');assert.equal(s.galarTitles,1,'No duplicate title by NPC reinteraction');
 yes=false;await go('cup-registration');assert(s.cupFinalistsClear,'Decline title defense');
 yes=true;await go('cup-registration');assert(!s.cupFinalistsClear);
 for(const key of ['cup-marnie','cup-hop','cup-bede','cup-nessa','cup-bea','cup-allister','cup-raihan','champion-leon'])await go(key);
 assert.equal(s.galarTitles,2,'Second Championship title');
 await go('postgame-hop');assert(s.postgameHopWon);
 await go('shieldbert');assert(!s.shieldbertWon);
 await go('swordward');await go('shieldbert');
 await go('zacian');await go('zamazenta');assert(s.zacianWon&&s.zamazentaWon);
 assert(Player.hasCaught(p,'Eternatus')&&Player.hasCaught(p,'Zacian')&&Player.hasCaught(p,'Zamazenta'));

 const count=battles.length;await go('zacian');await go('zamazenta');assert.equal(battles.length,count);
 for(let i=0;i<3;i++)await go('galar-battle-tower');
 assert.equal(s.battleTowerStreak,3);assert.equal(s.battleTowerBest,3);
 won=false;await go('galar-battle-tower');assert.equal(s.battleTowerStreak,0);
 assert.equal(s.battleTowerBest,3);
 for(const name of D.finale.mapNames)assert.equal(Galar.allowed(p,name),null,name+' locked after storyline');
 const copy=Player.load(JSON.parse(Player.serialize(p))).player;
 assert.equal(Galar.peek(copy).galarTitles,2);
 assert(Galar.peek(copy).zacianWon&&Galar.peek(copy).zamazentaWon);
 assert.equal(Galar.peek(copy).battleTowerBest,3);
 assert.equal(JSON.stringify(copy.flags.alola),other);
 assert(saves>30&&spoken.length>30);
 console.log('Galar finale: 13 connected maps, Cup, Darkest Day, Leon, wolves and Tower saves passed');
})().catch(err=>{console.error(err);process.exitCode=1;});
