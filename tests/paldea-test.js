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
vm.runInThisContext(fs.readFileSync(path.join(root,'ui/paldea-story.js'),'utf8'),{filename:'ui/paldea-story.js'});
assert(Paldea&&PaldeaStory&&TOWN_MAP.paldea);
const D=Paldea.data(),T=TOWN_MAP.paldea;
assert.equal(D.mapNames.length,25);
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
 for(const name of D.midgame.mapNames)assert(D.maps[name]&&T.at[name],name+' midgame missing');
 console.log('Paldea: 25 maps, 3 Gyms, Klawf and Bombirdier Titans, story rewards and saves');
})().catch(e=>{console.error(e);process.exitCode=1;});