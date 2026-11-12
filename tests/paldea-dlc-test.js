// Hidden Treasure of Area Zero DLC regression: Kitakami, Blueberry, captures, saves.
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
const D=Paldea.data(),R=TOWN_MAP.paldea;
assert.equal(D.mapNames.length,98,'76 mainland + 22 DLC areas');
assert.equal(D.dlc.mapNames.length,22);
assert.equal(D.dlc.kitakami.length,8);
assert.equal(D.dlc.blueberry.length,14);
assert.deepEqual(D.dlc.blueberryElite,['Crispin','Lacey','Amarys','Drayton']);
for(const name of D.mapNames){
 const m=D.maps[name];assert(m&&Paldea.owns(name),name+' missing map');
 assert.equal(m.collision.length,m.width*m.height);
 assert(R.at[name]&&R.mapSections[name],name+' not on regional map');
 for(const w of m.warps){
  assert(D.maps[w.map],name+' invalid warp to '+w.map);
  assert.equal(D.maps[w.map].warps[w.warp]?.map,name,name+' nonreciprocal warp');
  assert.equal(m.collision[w.y*m.width+w.x],0,name+' blocked warp');
 }
 for(const npc of m.people){
  assert.equal(m.collision[npc.y*m.width+npc.x],0,name+' blocked NPC');
  assert(!m.warps.some(w=>w.x===npc.x&&w.y===npc.y),name+' NPC on warp');
 }
}
for(const name of ['PaldeaMossuiTown','PaldeaTerariumHub']){
 const sec=R.mapSections[name],landing=R.fly[sec];
 assert(landing&&landing.map===name,'missing DLC Fly point '+name);
 assert(!D.maps[name].collision[landing.y*D.maps[name].width+landing.x]);
}
assert(Player.CENTERS.PaldeaCommunityCenter,'Kitakami needs a real healing center');
const p=Player.create('Paldea DLC Tester'),s=Paldea.state(p);
p.party=[Party.create('Skeledirge',85),Party.create('Tinkaton',85)];
p.location={map:'PaldeaAcademy',x:10,y:13,facing:'down'};
let won=true,wildOutcome='caught',saves=0,battles=[],wilds=[],speech=[];
const env={
 player:()=>p,say:async t=>speech.push(t),confirm:async()=>true,
 choose:async(_,choices)=>choices[0],canBattle:()=>true,
 showWorld(){},resume:async()=>{},
 saveCheckpoint:async()=>{saves++;},
 battle:async(_kind,opts)=>{battles.push({id:opts.trainerId,double:!!opts.double});return won?'won':'lost';},
 wildEncounter:async mon=>{wilds.push(mon.species);if(wildOutcome==='caught')Player.receive(p,mon);return wildOutcome;},
 teleport:async to=>{p.location={...to};Paldea.visit(p,to.map);}
};
const story=PaldeaStory.create(env),go=x=>story.run('sv:'+x);
(async()=>{
 assert(Paldea.allowed(p,'PaldeaKitakamiBus'),'DLC locked before main story');
 assert(Paldea.allowed(p,'PaldeaMossuiTown'));
 await go('teal-briar');assert(!s.tealArrival);
 s.paldeaClear=true;
 assert.equal(Paldea.allowed(p,'PaldeaKitakamiBus'),null);
 await go('teal-briar');assert(s.tealArrival);
 assert.equal(Paldea.allowed(p,'PaldeaMossuiTown'),null);
 won=false;await go('teal-carmine');assert(!s.tealCarmineClear);
 won=true;await go('teal-carmine');assert(s.tealCarmineClear);
 assert.equal(Paldea.allowed(p,'PaldeaAppleHills'),null);
 await go('teal-kieran');assert(s.tealKieranFirst);
 await go('teal-festival');assert(s.tealFestival);
 await go('teal-kieran-final');assert(!s.tealKieranFinal,'Loyal Three required');
 won=false;await go('teal-loyal-0');assert(!s.tealLoyal0);
 won=true;
 for(let i=0;i<3;i++)await go('teal-loyal-'+i);
 assert(s.tealLoyalThree);
 const beforeLoyal=battles.length;await go('teal-loyal-0');
 assert.equal(battles.length,beforeLoyal,'Loyal Three not farmable');
 assert.equal(Paldea.allowed(p,'PaldeaDreadedDen'),null);
 won=false;await go('teal-kieran-final');assert(!s.tealKieranFinal);
 won=true;await go('teal-kieran-final');assert(s.tealKieranFinal);
 wildOutcome='won';await go('teal-ogerpon');assert(!s.tealClear);
 wildOutcome='caught';await go('teal-ogerpon');
 assert(s.tealClear&&s.tealOgerponCaught);
 assert(Player.hasCaught(p,'Ogerpon'));
 const beforeCapture=wilds.length;await go('teal-ogerpon');
 assert.equal(wilds.length,beforeCapture,'Ogerpon cannot duplicate');
 assert.equal(Paldea.allowed(p,'PaldeaBlueberryDock'),null);
 await go('indigo-crispin');assert(!s.indigoElitecrispin,'registration required');
 await go('indigo-briar');assert(s.indigoArrival);
 await go('indigo-club');assert(s.indigoEnrollment);
 assert.equal(Paldea.allowed(p,'PaldeaSavannaTrial'),null);
 assert(Paldea.allowed(p,'PaldeaKieranArena'),'need BB Elite Four');
 won=false;await go('indigo-crispin');assert(!s.indigoElitecrispin);
 won=true;
 for(const [key,flag]of [
  ['indigo-crispin','indigoElitecrispin'],
  ['indigo-lacey','indigoElitelacey'],
  ['indigo-amarys','indigoEliteamarys'],
  ['indigo-drayton','indigoElitedrayton']
 ]){
  await go(key);assert(s[flag],flag+' must be saved');
  const end=battles.length;await go(key);
  assert.equal(battles.length,end,key+' cannot duplicate');
 }
 assert(s.indigoEliteClear);
 assert(battles.some(b=>b.id==='SV_INDIGO_ELITE_CRISPIN'&&b.double),
  'Blueberry challenges must use double battles');
 assert.equal(Paldea.allowed(p,'PaldeaKieranArena'),null);
 won=false;await go('indigo-kieran');assert(!s.indigoKieranClear);
 won=true;await go('indigo-kieran');assert(s.indigoKieranClear&&s.indigoChampion);
 assert(Paldea.allowed(p,'PaldeaUnderdepths')===null);
 won=false;await go('indigo-depths');assert(!s.indigoUnderdepthsClear);
 won=true;await go('indigo-depths');assert(s.indigoUnderdepthsClear);
 assert.equal(Paldea.allowed(p,'PaldeaTerapagosChamber'),null);
 wildOutcome='won';await go('indigo-terapagos');assert(!s.indigoClear);
 wildOutcome='caught';await go('indigo-terapagos');
 assert(s.indigoClear&&s.hiddenTreasureClear);
 assert(Player.hasCaught(p,'Terapagos'));
 const afterTerapagos=wilds.length;await go('indigo-terapagos');
 assert.equal(wilds.length,afterTerapagos);
 wildOutcome='won';await go('teal-epilogue');assert(!s.mochiMayhemClear);
 wildOutcome='caught';await go('teal-epilogue');
 assert(s.mochiMayhemClear&&Player.hasCaught(p,'Pecharunt'));
 assert(story.goal().includes('both DLC stories'));
 const loaded=Player.load(JSON.parse(Player.serialize(p))).player;
 assert(Paldea.peek(loaded).tealClear&&Paldea.peek(loaded).indigoClear);
 assert(Paldea.peek(loaded).mochiMayhemClear);
 assert.equal(Paldea.peek(loaded).version,s.version);
 assert(saves>=20&&battles.length>=10&&speech.length>=20);
 console.log('Paldea DLC: 22 connected maps, Teal Mask, Indigo Disk, double battles, legendary captures and saves');
})().catch(e=>{console.error(e);process.exitCode=1;});
