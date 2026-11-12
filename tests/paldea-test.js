// Paldea Scarlet/Violet opening: map graph, travel, battle gates and saves.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [,file] of html.matchAll(/<script src="([^"]+)"><\/script>/g))
 if(!file.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
vm.runInThisContext(fs.readFileSync(path.join(root,'ui/paldea-mid.js'),'utf8'),{filename:'ui/paldea-mid.js'});
vm.runInThisContext(fs.readFileSync(path.join(root,'ui/paldea-legends.js'),'utf8'),{filename:'ui/paldea-legends.js'});
vm.runInThisContext(fs.readFileSync(path.join(root,'ui/paldea-starfall.js'),'utf8'),{filename:'ui/paldea-starfall.js'});
vm.runInThisContext(fs.readFileSync(path.join(root,'ui/paldea-story.js'),'utf8'),{filename:'ui/paldea-story.js'});
assert(Paldea&&PaldeaStory&&TOWN_MAP.paldea);
const D=Paldea.data(),T=TOWN_MAP.paldea;
assert.equal(D.mapNames.length,76);
assert.equal(D.starfall.mapNames.length,16);
assert.equal(D.starfall.crews.length,5);
assert.equal(D.legends.mapNames.length,4);
assert.equal(D.midgame.mapNames.length,8);
assert.deepEqual(D.starters,['Sprigatito','Fuecoco','Quaxly']);
for(const name of D.mapNames){
 const m=D.maps[name];assert(m&&Paldea.owns(name),name);
 assert(m.collision.length===m.width*m.height);
 assert(m.behavior.length===m.width*m.height);
 assert(T.at[name]&&T.mapSections[name],name+' missing from map');
 for(const w of m.warps){
  assert(D.maps[w.map],name+' warp missing '+w.map);
  assert.equal(D.maps[w.map].warps[w.warp]?.map,name,name+' nonreciprocal warp');
  assert.equal(m.collision[w.y*m.width+w.x],0,name+' blocked warp');
 }
 for(const n of m.people){
  assert(!m.collision[n.y*m.width+n.x],name+' blocked NPC '+n.script);
  assert(!m.warps.some(w=>w.x===n.x&&w.y===n.y),name+' NPC on warp');
 }
}
const travel=WORLD_MAPS.FightArea.people.find(n=>n.script==='sv:travel');
assert(travel,'Paldea travel researcher missing');
assert(!WORLD_MAPS.FightArea.collision[travel.y*WORLD_MAPS.FightArea.width+travel.x]);
for(const spot of Object.values(T.fly)){
 const m=D.maps[spot.map];assert(m);
 assert(!m.collision[spot.y*m.width+spot.x]);
 assert(!m.people.some(n=>n.x===spot.x&&n.y===spot.y));
}
for(const [species,rival] of [['Sprigatito','Quaxly'],['Fuecoco','Sprigatito'],['Quaxly','Fuecoco']]){
 const q=Player.create('Starter Test');q.party=[];
 assert(Paldea.starter(q,species).mon);assert.equal(Paldea.nemonaSpecies(q),rival);
 assert(Paldea.starter(q,species).done,'starter must be one-time');
}
const p=Player.create('Paldea Test');p.party=[Party.create('Pikachu',12)];
p.location={map:'FightArea',x:30,y:25,facing:'down'};
let yes=true,won=true,saves=0,battles=[],spoken=[];
const env={player:()=>p,say:async text=>spoken.push(text),confirm:async()=>yes,
 choose:async(_,options)=>options[0],canBattle:()=>true,
 battle:async(_,opts)=>{battles.push(opts.trainerId);return won?'won':'lost';},
 showWorld(){},resume:async()=>{},saveCheckpoint:async()=>{saves++;},
 teleport:async loc=>{p.location={...loc};Paldea.visit(p,loc.map);}
};
const story=PaldeaStory.create(env),go=x=>story.run('sv:'+x),s=Paldea.state(p);
(async()=>{
 yes=false;await go('travel');assert.equal(p.location.map,'FightArea');
 yes=true;await go('travel');assert.equal(p.location.map,'PaldeaHome');
 assert(Paldea.allowed(p,'PaldeaPocoPath'));
 await go('clavell');assert.equal(s.starter,'Sprigatito');
 assert.equal(Player.levelCap(p),12);
 won=false;await go('nemona-first');assert(!s.nemonaFirst);
 won=true;await go('nemona-first');assert(s.nemonaFirst);
 assert.equal(Paldea.allowed(p,'PaldeaInletGrotto'),null);
 await go('legendary');assert(s.legendaryMet);
 await go('arven');assert(s.arvenMet);
 assert.equal(Paldea.allowed(p,'PaldeaSouthProvince'),null);
 await go('nemona-route');assert(s.nemonaRoute);
 await go('nemona-mesagoza');assert(s.nemonaMesagoza);
 await go('director');assert(s.treasureHunt);
 assert.equal(Paldea.allowed(p,'PaldeaCortondo'),null);
 won=false;await go('katy-gym');assert(!s.katyTrainerWon);
 won=true;await go('katy-gym');assert(s.katyClear);
 assert.deepEqual(s.badges,['Bug Badge']);
 await go('katy-gym');assert.deepEqual(s.badges,['Bug Badge']);
 assert.equal(Player.levelCap(p),30);
 assert.equal(Paldea.allowed(p,'PaldeaArtazon'),null);
 assert(Paldea.allowed(p,'PaldeaCascarrafa'),'Kofu city must be gated behind Brassius');
 won=false;await go('brassius-gym');assert(!s.brassiusClear,'losing Artazon challenge must allow retries');
 won=true;await go('brassius-gym');assert(s.brassiusClear);
 assert(s.badges.includes('Grass Badge'));assert.equal(Player.levelCap(p),36);
 assert.equal(Paldea.allowed(p,'PaldeaCascarrafa'),null);
 await go('east-trainer');await go('west-trainer');
 await go('kofu-gym');assert(s.kofuClear);
 assert.deepEqual(s.badges,['Bug Badge','Grass Badge','Water Badge']);
 assert.equal(Player.levelCap(p),45);
 const fights=battles.length;await go('kofu-gym');assert.equal(battles.length,fights,'Gym cannot duplicate wins');
 p.location={map:'PaldeaMesagozaCenter',x:9,y:12,facing:'down'};
 await go('heal');assert.equal(p.flags.lastCenter,'PaldeaMesagozaCenter');
 const saved=Player.load(JSON.parse(Player.serialize(p))).player;
 assert.equal(Paldea.peek(saved).starter,'Sprigatito');
 assert(Paldea.peek(saved).katyClear);
 assert(Paldea.peek(saved).brassiusClear&&Paldea.peek(saved).kofuClear);
 assert.deepEqual(Paldea.peek(saved).badges,['Bug Badge','Grass Badge','Water Badge']);
 const held={...p.location};
 yes=true;await go('return');assert.equal(p.location.map,'FightArea');
 await go('travel');assert.equal(p.location.map,held.map);
 assert(saves>=10&&battles.includes('SV_GYM_KATY'));
 assert(story.goal().includes('Stony Cliff'));
 assert(battles.includes('SV_GYM_BRASSIUS')&&battles.includes('SV_GYM_KOFU'));
 // Titans progress independently from Gym badges after the Treasure Hunt,
 // and losing either stage must never award Herba Mystica.
 const titanTester=Player.create('Titan Story Test'),ts=Paldea.state(titanTester);
 titanTester.location={map:'PaldeaHome',x:10,y:13,facing:'down'};
 titanTester.party=[Party.create('Pikachu',35)];
 Object.assign(ts,{starter:'Fuecoco',treasureHunt:true});
 const titanBattles=[],titanEnv={
  player:()=>titanTester,say:async()=>{},confirm:async()=>true,choose:async(_,o)=>o[0],
  canBattle:()=>true,showWorld(){},resume:async()=>{},
  saveCheckpoint:async()=>{},teleport:async()=>{},
  battle:async(_,opts)=>{titanBattles.push(opts.trainerId);return won?'won':'lost';}
 };
 const titanStory=PaldeaStory.create(titanEnv),titanGo=k=>titanStory.run('sv:'+k);
 assert.equal(Paldea.allowed(titanTester,'PaldeaStonyCliff'),null);
 assert(Paldea.allowed(titanTester,'PaldeaStonyCave'));
 assert(Paldea.allowed(titanTester,'PaldeaOpenSkySummit'));
 won=false;await titanGo('klawf-titan');assert(!ts.klawfFirst);
 won=true;await titanGo('klawf-titan');assert(ts.klawfFirst);
 won=false;await titanGo('klawf-herba');assert(!ts.herbaKlawf&&!ts.klawfClear);
 won=true;await titanGo('klawf-herba');
 assert(ts.klawfClear&&ts.herbaKlawf&&ts.rideDash);
 const earlier=titanBattles.length;await titanGo('klawf-herba');
 assert.equal(titanBattles.length,earlier,'Klawf cannot be farmed');
 assert.equal(Paldea.allowed(titanTester,'PaldeaOpenSkySummit'),null);
 won=false;await titanGo('bombirdier-titan');assert(!ts.bombirdierFirst);
 won=true;await titanGo('bombirdier-titan');assert(ts.bombirdierFirst);
 won=false;await titanGo('bombirdier-titan');assert(!ts.herbaBombirdier);
 won=true;await titanGo('bombirdier-titan');
 assert(ts.bombirdierClear&&ts.herbaBombirdier&&ts.rideSwim);
 const finished=titanBattles.length;await titanGo('bombirdier-titan');
 assert.equal(titanBattles.length,finished,'Bombirdier cannot be farmed');
 assert.equal(Player.levelCap(titanTester),23,'Titan story does not require Gym wins');
 const reloaded=Player.load(JSON.parse(Player.serialize(titanTester))).player;
 assert(Paldea.peek(reloaded).herbaKlawf&&Paldea.peek(reloaded).herbaBombirdier);
 assert(Paldea.peek(reloaded).rideDash&&Paldea.peek(reloaded).rideSwim);
 assert(titanBattles.includes('SV_TITAN_KLAWF_1')&&titanBattles.includes('SV_TITAN_BOMBIRDIER_2'));
 // Starfall Street works independently from the Gym and Titan storylines.
 const starTester=Player.create('Starfall Test'),ss=Paldea.state(starTester);
 starTester.location={map:'PaldeaHome',x:10,y:13,facing:'down'};
 starTester.party=[Party.create('Pikachu',35)];
 Object.assign(ss,{starter:'Quaxly',treasureHunt:true});
 const starBattles=[],starEnv={
  player:()=>starTester,say:async()=>{},confirm:async()=>true,
  choose:async(_,o)=>o[0],canBattle:()=>true,showWorld(){},resume:async()=>{},
  saveCheckpoint:async()=>{},teleport:async()=>{},
  battle:async(_,opts)=>{starBattles.push(opts.trainerId);return won?'won':'lost';}
 };
 const starStory=PaldeaStory.create(starEnv),starGo=key=>starStory.run('sv:'+key);
 assert.equal(Paldea.allowed(starTester,'PaldeaSeginBase'),null);
 assert(Paldea.allowed(starTester,'PaldeaSeginGarage'));
 assert(Paldea.allowed(starTester,'PaldeaSchedarGarage'));
 await starGo('segiu-challenge');assert(!ss.seginChallengeClear,'gatekeeper required');
 won=false;await starGo('segiu-guard');assert(!ss.seginGuardClear);
 won=true;await starGo('segiu-guard');assert(ss.seginGuardClear);
 won=false;await starGo('segiu-challenge');assert(!ss.seginWave0);
 won=true;await starGo('segiu-challenge');assert(ss.seginChallengeClear);
 assert.equal(Paldea.allowed(starTester,'PaldeaSeginGarage'),null);
 won=false;await starGo('giacomo-boss');assert(!ss.seginClear);
 won=true;await starGo('giacomo-boss');
 assert(ss.seginClear&&ss.starfallCrews.includes('Segin'));
 const starCount=starBattles.length;await starGo('giacomo-boss');
 assert.equal(starBattles.length,starCount,'Giacomo reward must be single-use');
 await starGo('schedar-guard');assert(ss.schedarGuardClear);
 await starGo('schedar-challenge');assert(ss.schedarChallengeClear);
 won=false;await starGo('mela-boss');assert(!ss.schedarClear);
 won=true;await starGo('mela-boss');
 assert(ss.schedarClear&&ss.starfallCrews.includes('Schedar'));
 assert.equal(ss.starfallCrews.length,2);
 assert.equal(Paldea.allowed(starTester,'PaldeaSchedarGarage'),null);
 assert.equal(Player.levelCap(starTester),23,'Starfall Street does not require Gym badges');
 const starLoaded=Player.load(JSON.parse(Player.serialize(starTester))).player;
 assert(Paldea.peek(starLoaded).seginClear&&Paldea.peek(starLoaded).schedarClear);
 assert.deepEqual(Paldea.peek(starLoaded).starfallCrews,['Segin','Schedar']);
 assert(starBattles.includes('SV_SEGIN_STARMOBILE')&&starBattles.includes('SV_SCHEDAR_STARMOBILE'));
 // The last three bases can be challenged without Gym badges or Titans.
 for(const [crew,leader] of [['navi','atticus'],['ruchbah','ortega'],['caph','eri']]){
  const garage='Paldea'+crew.charAt(0).toUpperCase()+crew.slice(1)+'Garage';
  assert(Paldea.allowed(starTester,garage),garage+' cannot be entered early');
  await starGo(crew+'-guard');assert(ss[crew+'GuardClear']);
  won=false;await starGo(crew+'-challenge');assert(!ss[crew+'Wave0']);
  won=true;await starGo(crew+'-challenge');assert(ss[crew+'ChallengeClear']);
  assert.equal(Paldea.allowed(starTester,garage),null);
  won=false;await starGo(leader+'-boss');assert(!ss[crew+'Clear']);
  won=true;await starGo(leader+'-boss');assert(ss[crew+'Clear']);
  const finished=starBattles.length;
  await starGo(leader+'-boss');assert.equal(starBattles.length,finished,'boss cannot be farmed: '+crew);
 }
 assert.equal(ss.starfallCrews.length,5);
 assert(ss.starfallAllClear);
 assert.equal(Paldea.allowed(starTester,'PaldeaAcademyCourtyard'),null);
 won=false;await starGo('clive-finale');assert(!ss.cliveClear);
 won=true;await starGo('clive-finale');assert(ss.cliveClear);
 won=false;await starGo('cassiopeia-finale');assert(!ss.starfallComplete);
 won=true;await starGo('cassiopeia-finale');
 assert(ss.cassiopeiaClear&&ss.starfallComplete);
 const finalBattles=starBattles.length;await starGo('cassiopeia-finale');
 assert.equal(starBattles.length,finalBattles,'finale cannot be farmed');
 assert.equal(Player.levelCap(starTester),23,'Starfall is independent of Gym badges');
 const allStarSaved=Player.load(JSON.parse(Player.serialize(starTester))).player;
 assert(Paldea.peek(allStarSaved).starfallComplete);
 assert.equal(Paldea.peek(allStarSaved).starfallCrews.length,5);
 assert(starBattles.includes('SV_NAVI_STARMOBILE'));
 assert(starBattles.includes('SV_RUCHBAH_STARMOBILE'));
 assert(starBattles.includes('SV_CAPH_STARMOBILE'));
 assert(starBattles.includes('SV_STARFALL_CLIVE'));
 assert(starBattles.includes('SV_STARFALL_CASSIOPEIA'));
 for(const name of D.midgame.mapNames)assert(D.maps[name]&&T.at[name],name+' midgame missing');
 console.log('Paldea: 41 maps, five Team Star crews, Cassiopeia finale, three Gyms, two Titans and saves');
})().catch(e=>{console.error(e);process.exitCode=1;});