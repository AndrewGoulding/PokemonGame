// Paldea main-story completion: five Gym Leaders, three Titans and Area Zero.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const[,file]of html.matchAll(/<script src="([^"]+)"><\/script>/g))
 if(!file.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
for(const file of ['ui/paldea-mid.js','ui/paldea-legends.js','ui/paldea-starfall.js',
 'ui/paldea-endgame.js','ui/paldea-dlc.js','ui/paldea-story.js'])
 vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
const D=Paldea.data(),T=TOWN_MAP.paldea;
assert.equal(D.mapNames.length,98,'76 mainland and 22 DLC areas should connect');
assert.equal(D.endgame.mapNames.length,35);
assert.equal(D.endgame.gyms.length,5);
assert.equal(D.endgame.titans.length,3);
for(const name of D.mapNames){
 const m=D.maps[name];assert(m&&Paldea.owns(name),name+' missing map');
 assert.equal(m.collision.length,m.width*m.height,name+' collision dimensions');
 assert(T.at[name]&&T.mapSections[name],name+' absent from Paldea Town Map');
 for(const warp of m.warps){
  assert(D.maps[warp.map],name+' warp points to unknown '+warp.map);
  assert.equal(D.maps[warp.map].warps[warp.warp]?.map,name,name+' warp not reciprocal');
  assert.equal(m.collision[warp.y*m.width+warp.x],0,name+' blocked warp');
 }
 for(const npc of m.people){
  assert.equal(m.collision[npc.y*m.width+npc.x],0,name+' NPC on collision '+npc.script);
  assert(!m.warps.some(w=>w.x===npc.x&&w.y===npc.y),name+' NPC on warp '+npc.script);
 }
}
for(const name of D.endgame.centers)assert(Player.CENTERS[name],name+' missing Center');
for(const place of ['Levincia','Medali','Montenevera','Alfornada','Glaseado']){
 const section=T.mapSections['Paldea'+place];
 assert(T.fly[section]&&T.fly[section].map==='Paldea'+place,place+' missing Fly stop');
}
const p=Player.create('Paldea Main Story'),s=Paldea.state(p);
p.location={map:'PaldeaHome',x:10,y:13,facing:'down'};
p.party=[Party.create('Skeledirge',80),Party.create('Tinkaton',80)];
Object.assign(s,{starter:'Fuecoco',treasureHunt:true,
 katyClear:true,brassiusClear:true,kofuClear:true,
 herbaKlawf:true,herbaBombirdier:true,
 badges:['Bug Badge','Grass Badge','Water Badge'],starfallComplete:true});
let won=true,saves=0,battles=[],prompts=[],speech=[];
const env={
 player:()=>p,say:async t=>speech.push(t),confirm:async()=>true,
 choose:async(q,options)=>{prompts.push(q);return options[0];},
 canBattle:()=>true,showWorld(){},resume:async()=>{},
 saveCheckpoint:async()=>{saves++;},teleport:async loc=>{p.location={...loc};Paldea.visit(p,loc.map);},
 battle:async(_kind,opts)=>{battles.push(opts.trainerId);return won?'won':'lost';}
};
const story=PaldeaStory.create(env),go=k=>story.run('sv:'+k);
(async()=>{
 assert(Paldea.allowed(p,'PaldeaLeagueHall'),'League requires eight Badges');
 assert(Paldea.allowed(p,'PaldeaAreaZeroGate'),'Area Zero requires three paths');
 won=false;await go('iono-gym');assert(!s.ionoClear,'Gym defeat cannot grant Badge');
 won=true;
 for(const [key,flag,badge,cap] of [
  ['iono-gym','ionoClear','Electric Badge',50],
  ['larry-gym','larryClear','Normal Badge',58],
  ['ryme-gym','rymeClear','Ghost Badge',62],
  ['tulip-gym','tulipClear','Psychic Badge',66],
  ['grusha-gym','grushaClear','Ice Badge',70]
 ]){
  await go(key);assert(s[flag],key+' victory not recorded');
  assert(s.badges.includes(badge),badge+' not awarded');
  assert.equal(Player.levelCap(p),cap,'unexpected regional level cap');
  const length=battles.length;
  await go(key);assert.equal(battles.length,length,'Gym must not duplicate '+key);
 }
 assert.equal(s.badges.length,8,'Paldea needs eight distinct Badges');
 assert.equal(Paldea.allowed(p,'PaldeaLeagueHall'),null);
 won=false;await go('league-elite');assert(!s.leagueRika,'League loss must not count');
 won=true;await go('league-elite');
 assert(s.leagueClear&&s.leagueRika&&s.leaguePoppy&&s.leagueLarry&&s.leagueHassel);
 await go('league-nemona');assert(s.nemonaChampionClear&&s.victoryRoadComplete);
 const leagueBattles=battles.length;await go('league-elite');await go('league-nemona');
 assert.equal(battles.length,leagueBattles,'League titles must be one-time');
 assert(Paldea.allowed(p,'PaldeaAreaZeroGate'),'Titan and Arven journey still missing');
 for(const [first,second,clear,herba,ride] of [
  ['orthworm-titan','orthworm-herba','orthwormClear','herbaOrthworm','rideJump'],
  ['quaking-titan','quaking-herba','quakingClear','herbaQuaking','rideGlide'],
  ['false-dragon-titan','false-dragon-herba','falseDragonClear','herbaFalseDragon','rideClimb']
 ]){
  won=false;await go(first);assert(!s[clear]&&!s[herba],'lost Titan gave rewards');
  won=true;await go(first);await go(second);
  assert(s[clear]&&s[herba]&&s[ride],first+' Titan not cleared');
  const before=battles.length;await go(first);await go(second);
  assert.equal(battles.length,before,'Titan rewards must be one-time');
 }
 assert(!s.arvenClear);
 won=false;await go('arven-finale');assert(!s.arvenClear);
 won=true;await go('arven-finale');
 assert(s.arvenClear&&s.pathOfLegendsComplete);
 assert(PaldeaEndgame.threePathsClear(p),'the three completed stories should unlock Area Zero');
 assert.equal(Paldea.allowed(p,'PaldeaAreaZeroGate'),null);
 assert(Paldea.allowed(p,'PaldeaAreaZeroUpper'));
 await go('zero-gateway');assert(s.zeroStarted&&s.version==='Scarlet');
 assert.equal(Paldea.allowed(p,'PaldeaAreaZeroUpper'),null);
 assert(Paldea.allowed(p,'PaldeaResearchOne'));
 won=false;await go('zero-entrance');assert(!s.zeroUpperClear);
 won=true;await go('zero-entrance');assert(s.zeroUpperClear);
 await go('zero-station-1');assert(s.zeroStationOne);
 await go('zero-station-2');assert(s.zeroStationTwo);
 await go('zero-depths');assert(s.zeroDepthsClear);
 assert.equal(Paldea.allowed(p,'PaldeaZeroLab'),null);
 won=false;await go('zero-lab');assert(!s.theWayHomeClear);
 won=true;await go('zero-lab');
 assert(s.theWayHomeClear&&s.paldeaClear);
 assert.equal(Player.levelCap(p),100);
 const beforeFinal=battles.length;await go('zero-lab');
 assert.equal(battles.length,beforeFinal,'final professor battle not repeatable');
 const save=Player.load(JSON.parse(Player.serialize(p))).player,loaded=Paldea.peek(save);
 assert(loaded.paldeaClear&&loaded.victoryRoadComplete&&loaded.pathOfLegendsComplete);
 assert.equal(loaded.badges.length,8);
 assert(loaded.rideJump&&loaded.rideGlide&&loaded.rideClimb);
 assert.equal(loaded.version,'Scarlet');
 assert(story.goal().includes('The Way Home is complete'));
 assert(saves>20&&battles.length>20&&speech.length>20);
 // Violet's Quaking Earth Titan and the AI Professor must stay consistent.
 const violetPlayer=Player.create('Violet Expedition'),vs=Paldea.state(violetPlayer);
 violetPlayer.location={map:'PaldeaHome',x:10,y:13,facing:'down'};
 violetPlayer.party=[Party.create('Pikachu',80)];
 vs.treasureHunt=true;
 const violetTeams=[];
 const violetEnv={
  player:()=>violetPlayer,say:async()=>{},confirm:async()=>true,
  choose:async(_,options)=>options.includes('Violet')?'Violet':options[0],
  canBattle:()=>true,showWorld(){},resume:async()=>{},saveCheckpoint:async()=>{},
  battle:async(_,opts)=>{violetTeams.push(opts.foe.team.map(mon=>mon.species));return'won';}
 };
 const violetStory=PaldeaStory.create(violetEnv),violetGo=k=>violetStory.run('sv:'+k);
 await violetGo('quaking-titan');assert.equal(vs.version,'Violet');
 assert.equal(violetTeams[0][0],'Iron Treads');
 await violetGo('quaking-herba');assert(vs.herbaQuaking);
 Object.assign(vs,{nemonaChampionClear:true,arvenClear:true,starfallComplete:true,
  herbaKlawf:true,herbaBombirdier:true,herbaOrthworm:true,herbaFalseDragon:true});
 await violetGo('zero-gateway');assert.equal(vs.version,'Violet');
 await violetGo('zero-entrance');await violetGo('zero-station-1');
 await violetGo('zero-station-2');await violetGo('zero-depths');await violetGo('zero-lab');
 assert(vs.paldeaClear);
 assert(violetTeams.at(-1).includes('Miraidon'),'Violet professor must lead with future Pokémon');
 console.log('Paldea main story: 76 maps, 8 Gyms, League, 5 Titans, Starfall and Area Zero');
})().catch(e=>{console.error(e);process.exitCode=1;});
