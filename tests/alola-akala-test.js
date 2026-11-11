// Akala Island native campaign and persistence regression test.
'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [,src] of html.matchAll(/<script src="([^"]+)"><\/script>/g)){
 if(!src.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,src),'utf8'),{filename:src});
}
for(const file of ['ui/alola-akala.js','ui/alola-story.js'])
 vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
(async()=>{
 const R=Alola,D=R.data(),A=AlolaAkala;
 assert.equal(D.akala.mapNames.length,24);assert.equal(Object.keys(D.maps).length,39);
 for(const name of D.akala.mapNames){
  const m=WORLD_MAPS[name];assert(A.owns(name));assert(R.owns(name));
  assert.equal(m.collision.length,m.width*m.height);
  for(const warp of m.warps){const dest=WORLD_MAPS[warp.map];assert(dest,name+' dangling warp');assert.equal(dest.warps[warp.warp].map,name);
   assert.equal(m.collision[warp.y*m.width+warp.x],0,name+' blocked warp');}
  for(const npc of m.people){assert.equal(m.collision[npc.y*m.width+npc.x],0,name+' blocked '+npc.script);
   assert(!m.warps.some(w=>w.x===npc.x&&w.y===npc.y),name+' NPC on warp');}
 }
 const p=Player.create('Akala Tester');
 p.party=[Party.create('Decidueye',35)];
 p.location={map:'AlolaHauoliCity',x:22,y:22,facing:'down'};
 Object.assign(R.state(p),{starter:'Rowlet',started:true,schoolClear:true,ilimaWon:true,skullCity:true,skullRoute2:true,verdantClear:true});
 p.flags.kalos={version:'y',champion:true};
 const oldKalos=JSON.stringify(p.flags.kalos),oldBW=JSON.stringify(p.flags.unovaBW||{});
 let result='won',yes=true,saveCount=0,battles=[],wild=[],spoken=[];
 const env={
  player:()=>p,say:async v=>spoken.push(v),confirm:async()=>yes,
  choose:async(_,choices)=>choices[0],canBattle:()=>true,
  battle:async(_,opts)=>{battles.push(opts.trainerId);return result;},
  wildEncounter:async mon=>{wild.push(mon.species);return result;},
  showWorld(){},resume:async()=>{},mart:async()=>{},
  saveCheckpoint:async()=>{saveCount++;},
  teleport:async loc=>{p.location={...loc};R.visit(p,loc.map);}
 };
 const story=AlolaStory.create(env),go=key=>story.run('usum:'+key),s=R.state(p);
 assert(A.allowed(p,'AlolaHeaheaCity'),'Hala gate must hold');
 await go('akala-ferry');assert.equal(p.location.map,'AlolaHauoliCity');
 s.halaClear=true;assert.equal(Player.levelCap(p),35);
 yes=false;await go('akala-ferry');assert.equal(p.location.map,'AlolaHauoliCity');
 yes=true;await go('akala-ferry');assert.equal(p.location.map,'AlolaHeaheaCity');
 assert(A.allowed(p,'AlolaRoute4'));
 result='lost';await go('hau-akala');assert(!s.hauAkala);
 result='won';await go('hau-akala');assert(s.hauAkala);
 await go('recon-heahea');assert(s.reconHeahea);
 assert.equal(A.allowed(p,'AlolaRoute4'),null);
 await go('hau-paniola');assert.equal(A.allowed(p,'AlolaPaniolaRanch'),null);
 await go('ranch-miltank');assert(s.ranchVisited);
 await go('gladion-route5');await go('lana-invite');assert(s.lanaInvited);
 assert(A.allowed(p,'AlolaRoute6'));
 await go('brooklet-splash-0');await go('brooklet-splash-1');assert.equal(s.brookletSpots.length,2);
 await go('lana-totem');assert(s.lanaClear);assert(Player.itemCount(p,'waterium-z'));assert.equal(R.cap(p),40);
 await go('skull-route6');assert(s.skullRoute6);
 await go('royal-stage');assert(s.royalDone);
 await go('kiawe-invite');await go('kiawe-dance-0');await go('kiawe-dance-1');
 await go('kiawe-totem');assert(s.kiaweClear);assert(Player.itemCount(p,'firium-z'));assert.equal(R.cap(p),45);
 await go('recon-route8');assert(s.reconRoute8);await go('mallow-invite');
 for(let i=0;i<4;i++)await go('ingredient-'+i);
 assert.equal(s.ingredients.length,4);await go('mallow-totem');
 assert(s.mallowClear);assert(Player.itemCount(p,'grassium-z'));assert.equal(R.cap(p),50);
 await go('olivia-konikoni');await go('plumeria');
 await go('olivia-grand');assert(s.oliviaClear);assert(Player.itemCount(p,'rockium-z'));assert.equal(R.cap(p),55);
 for(const map of D.akala.mapNames)assert.equal(A.allowed(p,map),null,map+' should be open');
 // The Ditto Five side investigation is optional, resumable, and rewarded once.
 await go('ditto-0');assert(!s.dittoCaught,'officer must start the investigation');
 await go('ditto-officer');assert(s.dittoQuest);
 result='lost';await go('ditto-0');assert(!(s.dittoCaught||[]).length,'lost fight must be retryable');
 result='won';
 for(let i=0;i<5;i++)await go('ditto-'+i);
 assert.equal(s.dittoCaught.length,5);
 await go('ditto-2');assert.equal(battles.filter(x=>x==='USUM_DITTO_IMPOSTOR_2').length,1);
 await go('ditto-officer');assert(s.dittoReward);assert(Player.itemCount(p,'rare-candy')>=3);
 const candyCount=Player.itemCount(p,'rare-candy');
 await go('ditto-officer');assert.equal(Player.itemCount(p,'rare-candy'),candyCount);
 assert(battles.includes('USUM_HAU_AKALA'));
 assert(battles.includes('USUM_TOTEM_ARAQUANID'));
 assert(battles.includes('USUM_TOTEM_MAROWAK'));
 assert(battles.includes('USUM_TOTEM_LURANTIS'));
 assert(battles.includes('USUM_OLIVIA'));
 assert.deepEqual(wild,['Wishiwashi','Dewpider']);
 await go('lana-totem');assert.equal(battles.filter(x=>x==='USUM_TOTEM_ARAQUANID').length,1,'No duplicate Totem rewards');
 const finish={...p.location};
 p.location={map:'AlolaRuinsOfLife',x:10,y:10,facing:'down'};
 await go('melemele-ferry');assert.equal(p.location.map,'AlolaHauoliCity');
 await go('akala-ferry');assert.equal(p.location.map,'AlolaRuinsOfLife');
 assert.deepEqual(s.akalaResume,{map:'AlolaRuinsOfLife',x:10,y:10,facing:'down'});
 const reloaded=Player.load(JSON.parse(Player.serialize(p))).player;
 assert(Alola.peek(reloaded).oliviaClear);assert(Alola.peek(reloaded).lanaClear);
 assert.equal(Alola.peek(reloaded).dittoCaught.length,5);assert(Alola.peek(reloaded).dittoReward);
 assert.deepEqual(reloaded.flags.kalos,p.flags.kalos);assert.equal(JSON.stringify(p.flags.kalos),oldKalos);
 assert.equal(JSON.stringify(p.flags.unovaBW||{}),oldBW);
 assert(saveCount>20);assert(spoken.length>20);assert(finish);
 console.log('Akala Island: 24 connected maps, Hau/Gladion, three trials, Olivia, version union, save/return/reload passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
