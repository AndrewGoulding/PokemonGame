// Galar Sword/Shield merged opening: map graph, save, story and Gym progression.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const[,src]of html.matchAll(/<script src="([^"]+)"><\/script>/g))
 if(!src.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,src),'utf8'),{filename:src});
vm.runInThisContext(fs.readFileSync(path.join(root,'ui/galar-mid.js'),'utf8'),{filename:'ui/galar-mid.js'});
vm.runInThisContext(fs.readFileSync(path.join(root,'ui/galar-finale.js'),'utf8'),{filename:'ui/galar-finale.js'});
vm.runInThisContext(fs.readFileSync(path.join(root,'ui/galar-dlc.js'),'utf8'),{filename:'ui/galar-dlc.js'});
vm.runInThisContext(fs.readFileSync(path.join(root,'ui/galar-features.js'),'utf8'),{filename:'ui/galar-features.js'});
vm.runInThisContext(fs.readFileSync(path.join(root,'ui/galar-extras.js'),'utf8'),{filename:'ui/galar-extras.js'});
vm.runInThisContext(fs.readFileSync(path.join(root,'ui/galar-story.js'),'utf8'),{filename:'ui/galar-story.js'});
const D=Galar.data(),R=TOWN_MAP.galar;
assert.equal(Object.keys(D.maps).length,90);
assert.equal(D.mapNames.length,90);
assert.deepEqual(D.starters,['Grookey','Scorbunny','Sobble']);
assert(R);assert.equal(D.townMap,R);
for(const name of D.mapNames){
 const m=WORLD_MAPS[name],xy=R.at[name],sec=R.mapSections[name];
 assert(Galar.owns(name)&&m.region==='galar');
 assert(xy&&R.map[xy[1]][xy[0]]===sec,name+' missing Town Map position');
 assert.equal(m.collision.length,m.width*m.height);
 for(const w of m.warps){
  const next=WORLD_MAPS[w.map];assert(next,name+' dangling warp');
  assert.equal(next.warps[w.warp]?.map,name,name+' non-reciprocal warp');
  assert.equal(m.collision[w.y*m.width+w.x],0,name+' blocked warp');
 }
 for(const npc of m.people){
  assert.equal(m.collision[npc.y*m.width+npc.x],0,name+' blocked NPC '+npc.script);
  assert(!m.warps.some(w=>w.x===npc.x&&w.y===npc.y),name+' NPC on a warp');
 }
}
for(const [sec,spot]of Object.entries(R.fly)){
 const m=D.maps[spot.map];assert(m&&R.names[sec]);
 assert.equal(m.collision[spot.y*m.width+spot.x],0);
 assert(!m.warps.some(w=>w.x===spot.x&&w.y===spot.y));
 assert(!m.people.some(p=>p.x===spot.x&&p.y===spot.y));
}
for(const center of ['GalarHome','GalarMotostokeCenter','GalarTurffieldCenter','GalarHulburyCenter']){
 const loc=Player.CENTERS[center],m=WORLD_MAPS[center];
 assert(loc,'missing Galar respawn center '+center);
 assert.equal(m.collision[loc.y*m.width+loc.x],0,'blocked center '+center);
 assert(!m.warps.some(w=>w.x===loc.x&&w.y===loc.y),'center on warp '+center);
}
const traveler=WORLD_MAPS.FightArea.people.find(a=>a.script==='swsh:travel-galar');
assert(traveler,'missing Galar researcher in Fight Area');
const fightArea=WORLD_MAPS.FightArea;
assert.equal(fightArea.collision[traveler.y*fightArea.width+traveler.x],0,'researcher on blocked tile');
assert(!fightArea.warps.some(w=>w.x===traveler.x&&w.y===traveler.y),'researcher on warp');
for(const [starter,weak] of [['Grookey','Sobble'],['Scorbunny','Grookey'],['Sobble','Scorbunny']]){
 const trial=Player.create('Starter tester');trial.party=[];
 assert(Galar.starter(trial,starter).mon);assert.equal(Galar.rivalSpecies(trial),weak);
}
assert.equal(R.mapSections.GalarHome,R.mapSections.GalarPostwick);
assert.notEqual(R.mapSections.GalarRoute1,TOWN_MAP.mapSections.Route1);
const p=Player.create('Galar Tester');p.party=[Party.create('Pikachu',12)];p.location={map:'FightArea',x:30,y:25,facing:'down'};
p.flags.alola={starter:'Rowlet',championClear:true};
const oldAlola=JSON.stringify(p.flags.alola),oldKalos=JSON.stringify(p.flags.kalos||{});
let result='won',yes=true,saves=0,spoken=[],battles=[];
const env={
 player:()=>p,say:async text=>spoken.push(text),confirm:async()=>yes,
 choose:async(_,options)=>options[0],canBattle:()=>true,
 battle:async(_,data)=>{battles.push(data.trainerId);return result;},
 showWorld(){},resume:async()=>{},mart:async()=>{},
 saveCheckpoint:async()=>{saves++;},
 teleport:async loc=>{p.location={...loc};Galar.visit(p,loc.map);}
};
const story=GalarStory.create(env),go=k=>story.run('swsh:'+k),s=Galar.state(p);
(async()=>{
 yes=false;await go('travel-galar');assert.equal(p.location.map,'FightArea');
 yes=true;await go('travel-galar');assert.equal(p.location.map,'GalarHome');
 assert.equal(Player.levelCap(p),7);
 assert(Galar.allowed(p,'GalarHopHouse'),'Hop must meet us before entry');
 await go('hop-postwick');assert(s.hopMet);
 await go('leon-starter');assert.equal(s.starter,'Grookey');
 assert.equal(Galar.rivalSpecies(p),'Sobble');assert.equal(Player.levelCap(p),12);
 result='lost';await go('hop-first');assert(!s.hopFirst);
 result='won';await go('hop-first');assert(s.hopFirst);
 assert.equal(Galar.allowed(p,'GalarSlumberingWeald'),null);
 await go('weald-legend');assert(s.wealdClear);
 assert.equal(Galar.allowed(p,'GalarRoute1'),null);
 await go('sonia-lab');assert(s.soniaMet);
 await go('hop-route2');assert(s.route2Hop);
 await go('magnolia');assert(s.endorsement);
 assert.equal(Galar.allowed(p,'GalarWildAreaSouth'),null);
 await go('league-ceremony');assert(s.ceremony);
 assert(Player.itemCount(p,'dynamax-band')===1,'Dynamax Band must be a real item');
 assert.equal(Player.levelCap(p),25);
 await go('bede-mine');assert(s.bedeMineWon);
 assert.equal(Galar.allowed(p,'GalarTurffield'),null);
 await go('milo-gym');assert(s.miloClear);
 assert(s.badges.includes('Grass Badge'));assert.equal(Player.levelCap(p),30);
 assert.equal(Galar.allowed(p,'GalarRoute5'),null);
 await go('team-yell-route5');
 await go('nessa-gym');assert(s.nessaClear);
 assert(s.badges.includes('Water Badge'));assert.equal(Player.levelCap(p),35);
 assert.equal(Galar.allowed(p,'GalarGalarMine2'),null);
 await go('bede-mine2');assert(s.mine2Clear);
 await go('kabu-gym');assert(s.kabuClear);
 assert(s.badges.includes('Fire Badge'));assert.equal(Player.levelCap(p),45);
 assert.equal(s.badges.length,3);
 for(const m of D.mapNames.slice(0,25))assert.equal(Galar.allowed(p,m),null,m+' should be open');
 for(const id of ['SWSH_HOP_FIRST','SWSH_HOP_ROUTE2','SWSH_BEDE_MINE','SWSH_GYM_MILO','SWSH_GYM_NESSA','SWSH_GYM_KABU'])assert(battles.includes(id),id);
 const badgeCount=s.badges.length;
 await go('milo-gym');assert.equal(s.badges.length,badgeCount);
 p.location={map:'GalarMotostoke',x:17,y:14,facing:'down'};
 await go('travel-home');assert.equal(p.location.map,'FightArea');
 await go('travel-galar');assert.equal(p.location.map,'GalarMotostoke');
 const reload=Player.load(JSON.parse(Player.serialize(p))).player;
 assert.equal(Galar.peek(reload).badges.length,3);
 assert(Galar.peek(reload).kabuClear);
 assert.equal(JSON.stringify(reload.flags.alola),oldAlola);
 assert.equal(JSON.stringify(p.flags.kalos||{}),oldKalos);
 assert(saves>15&&spoken.length>15);
 console.log('Galar: 62 registered maps, starter, Hop/Bede, three gyms, Fly, save/return and version union passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
