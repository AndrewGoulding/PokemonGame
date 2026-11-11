// Ula'ula campaign and save-state regression.
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [,src] of html.matchAll(/<script src="([^"]+)"><\/script>/g))
 if(!src.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,src),'utf8'),{filename:src});
for(const file of ['ui/alola-akala.js','ui/alola-ulaula.js','ui/alola-poni.js','ui/alola-league.js','ui/alola-story.js'])
 vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
(async()=>{
 const D=Alola.data(),U=AlolaUlaula,R=TOWN_MAP.alola;
 assert.equal(D.ulaula.mapNames.length,23);assert.equal(Object.keys(D.maps).length,100);
 for(const name of D.ulaula.mapNames){
  const m=WORLD_MAPS[name],cell=R.at[name];assert(U.owns(name)&&Alola.owns(name));
  assert(cell&&R.map[cell[1]][cell[0]],name+' absent from Town Map');
  assert.equal(m.collision.length,m.width*m.height);
  for(const w of m.warps){const next=WORLD_MAPS[w.map];assert(next,name+' bad warp destination');
   assert.equal(next.warps[w.warp]?.map,name,name+' non-reciprocal warp');
   assert.equal(m.collision[w.y*m.width+w.x],0,name+' blocked warp');}
  for(const npc of m.people){assert.equal(m.collision[npc.y*m.width+npc.x],0,name+' blocked NPC');
   assert(!m.warps.some(w=>w.x===npc.x&&w.y===npc.y),name+' NPC on warp');}
 }
 const p=Player.create('Ulaula Tester'),s=Alola.state(p);
 p.party=[Party.create('Decidueye',45)];p.location={map:'AlolaKonikoniCity',x:18,y:19,facing:'down'};
 Object.assign(s,{starter:'Rowlet',halaClear:true,oliviaClear:false});
 let won=true,yes=true,saves=0,battles=[],spoken=[];
 const env={player:()=>p,say:async v=>spoken.push(v),confirm:async()=>yes,
 choose:async(_,a)=>a[0],canBattle:()=>true,
 battle:async(_,o)=>{battles.push(o.trainerId);return won?'won':'lost';},
 wildEncounter:async()=>won?'won':'lost',showWorld(){},resume:async()=>{},mart:async()=>{},
 saveCheckpoint:async()=>{saves++;},teleport:async loc=>{p.location={...loc};Alola.visit(p,loc.map);}};
 const story=AlolaStory.create(env),go=k=>story.run('usum:'+k);
 assert(U.allowed(p,'AlolaMalieCity'));await go('ula-ferry');assert.equal(p.location.map,'AlolaKonikoniCity');
 s.oliviaClear=true;assert.equal(Alola.cap(p),55);
 yes=false;await go('ula-ferry');assert.equal(p.location.map,'AlolaKonikoniCity');
 yes=true;await go('ula-ferry');assert.equal(p.location.map,'AlolaMalieCity');
 won=false;await go('hau-malie');assert(!s.hauMalie);
 won=true;await go('hau-malie');assert(s.hauMalie);
 await go('skull-route10');assert(s.skullRoute10);
 for(let i=0;i<3;i++)await go('power-'+i);
 assert.equal(s.powerSwitches.length,3);
 await go('sophocles-totem');assert(s.sophoclesClear&&Player.itemCount(p,'electrium-z'));
 assert.equal(Alola.cap(p),60);
 await go('hapu-route12');assert(s.hapuRoute12);
 await go('acerola-invite');assert(s.acerolaInvited);
 for(let i=0;i<3;i++)await go('ghost-photo-'+i);
 await go('acerola-totem');assert(s.acerolaClear&&Player.itemCount(p,'ghostium-z'));
 assert.equal(Alola.cap(p),65);
 await go('aether-house');assert(s.aetherDefended);
 await go('plumeria-ula');assert(s.plumeriaUla);
 await go('potown-grunts');assert(s.poTownGrunts);
 await go('guzma-ula');assert(s.guzmaUla);
 await go('nanu-grand');assert(s.nanuClear&&Player.itemCount(p,'darkium-z'));
 assert.equal(Alola.cap(p),70);
 await go('nanu-grand');assert.equal(battles.filter(x=>x==='USUM_NANU_ULA').length,1);
 assert(battles.includes('USUM_TOTEM_TOGEDEMARU'));
 assert(battles.includes('USUM_TOTEM_MIMIKYU'));
 assert(battles.includes('USUM_GUZMA_ULA'));
 assert.equal(U.allowed(p,'AlolaHainaDesert'),null);
 p.location={map:'AlolaPoTown',x:10,y:10,facing:'down'};
 await go('ula-return-ferry');assert.equal(p.location.map,'AlolaKonikoniCity');
 await go('ula-ferry');assert.equal(p.location.map,'AlolaPoTown');
 const reloaded=Player.load(JSON.parse(Player.serialize(p))).player;
 assert(Alola.peek(reloaded).nanuClear);assert.equal(Alola.peek(reloaded).powerSwitches.length,3);
 assert.equal(Alola.peek(reloaded).ghostPhotos.length,3);assert(saves>15&&spoken.length>15);
 console.log('Ulaula: 23 maps, Sophocles and Acerola trials, Guzma, Nanu, map and ferry progress passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
