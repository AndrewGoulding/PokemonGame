// Paldea Scarlet/Violet opening: map graph, travel, battle gates and saves.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [,file] of html.matchAll(/<script src="([^"]+)"><\/script>/g))
 if(!file.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
vm.runInThisContext(fs.readFileSync(path.join(root,'ui/paldea-story.js'),'utf8'),{filename:'ui/paldea-story.js'});
assert(Paldea&&PaldeaStory&&TOWN_MAP.paldea);
const D=Paldea.data(),T=TOWN_MAP.paldea;
assert.equal(D.mapNames.length,13);
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
 p.location={map:'PaldeaMesagozaCenter',x:9,y:12,facing:'down'};
 await go('heal');assert.equal(p.flags.lastCenter,'PaldeaMesagozaCenter');
 const saved=Player.load(JSON.parse(Player.serialize(p))).player;
 assert.equal(Paldea.peek(saved).starter,'Sprigatito');
 assert(Paldea.peek(saved).katyClear);
 const held={...p.location};
 yes=true;await go('return');assert.equal(p.location.map,'FightArea');
 await go('travel');assert.equal(p.location.map,held.map);
 assert(saves>=10&&battles.includes('SV_GYM_KATY'));
 assert(story.goal().includes('opening Paldea chapter'));
 console.log('Paldea: 13 linked 2D maps, starter, Nemona, academy, Katy, travel and saves');
})().catch(e=>{console.error(e);process.exitCode=1;});