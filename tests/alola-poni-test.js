// Aether Paradise + Poni story regression, game state and maps.
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const[,src]of html.matchAll(/<script src="([^"]+)"><\/script>/g))
 if(!src.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,src),'utf8'),{filename:src});
for(const file of ['ui/alola-akala.js','ui/alola-ulaula.js','ui/alola-poni.js','ui/alola-league.js','ui/alola-story.js'])
 vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
(async()=>{
 const D=Alola.data(),R=TOWN_MAP.alola,P=AlolaPoni;
 assert.equal(D.poni.mapNames.length,19);assert.equal(Object.keys(D.maps).length,100);
 for(const name of D.poni.mapNames){
  const m=WORLD_MAPS[name],a=R.at[name];assert(P.owns(name)&&Alola.owns(name));
  assert(a&&R.map[a[1]][a[0]],name+' not plotted on map');
  assert.equal(m.collision.length,m.width*m.height);
  for(const w of m.warps){const to=WORLD_MAPS[w.map];assert(to,name+' dangling warp');
   assert.equal(to.warps[w.warp]?.map,name,name+' non-reciprocal warp');
   assert.equal(m.collision[w.y*m.width+w.x],0,name+' blocked warp');}
  for(const n of m.people){assert.equal(m.collision[n.y*m.width+n.x],0,name+' blocked NPC');
   assert(!m.warps.some(w=>w.x===n.x&&w.y===n.y),name+' NPC on warp');}
 }
 assert(R.fly[R.mapSections.AlolaSeafolkVillage]);
 const p=Player.create('Poni Tester'),s=Alola.state(p);
 p.party=[Party.create('Decidueye',60)];p.location={map:'AlolaMalieCity',x:20,y:15,facing:'down'};
 Object.assign(s,{starter:'Rowlet',halaClear:true,oliviaClear:true,nanuClear:false});
 let yes=true,won=true,saves=0,battles=[];
 const env={player:()=>p,say:async()=>{},confirm:async()=>yes,
 choose:async(_,a)=>a[0],canBattle:()=>true,battle:async(_,data)=>{battles.push(data.trainerId);return won?'won':'lost';},
 wildEncounter:async()=>won?'won':'lost',showWorld(){},resume:async()=>{},mart:async()=>{},
 saveCheckpoint:async()=>{saves++;},teleport:async loc=>{p.location={...loc};Alola.visit(p,loc.map);}};
 const story=AlolaStory.create(env),go=k=>story.run('usum:'+k);
 assert(P.allowed(p,'AlolaAetherDock'));
 await go('aether-ferry');assert.equal(p.location.map,'AlolaMalieCity');
 s.nanuClear=true;assert.equal(Alola.cap(p),70);
 yes=false;await go('aether-ferry');assert.equal(p.location.map,'AlolaMalieCity');
 yes=true;await go('aether-ferry');assert.equal(p.location.map,'AlolaAetherDock');
 assert(P.allowed(p,'AlolaAetherLab'));
 won=false;await go('aether-grunts');assert(!s.aetherGrunts);
 won=true;await go('aether-grunts');assert(s.aetherGrunts);
 await go('lusamine');assert(s.lusamineClear);
 await go('poni-ferry');assert.equal(p.location.map,'AlolaSeafolkVillage');
 await go('lillie-poni');await go('hapu-poni');assert(s.hapuMet);
 assert(P.allowed(p,'AlolaVastPoniCanyon'));
 await go('hapu-grand');assert(s.hapuClear&&Player.itemCount(p,'groundium-z'));assert.equal(Alola.cap(p),75);
 await go('dragon-guide');assert(s.canyonClear);
 await go('dragon-0');await go('dragon-1');
 await go('totem-kommoo');assert(s.dragonClear&&Player.itemCount(p,'dragonium-z'));assert.equal(Alola.cap(p),80);
 await go('altar-lillie');assert(s.altarOpened);
 await go('ultra-necrozma');assert(s.necrozmaClear&&Alola.cap(p)===85);
 await go('mina-invite');assert.equal(P.allowed(p,'AlolaPoniGauntlet'),null);
 await go('mina-petal-0');await go('mina-petal-1');await go('mina-petal-2');
 await go('mina-final');assert(s.minaClear&&Player.itemCount(p,'fairium-z'));assert.equal(Alola.cap(p),90);
 await go('mina-final');assert.equal(battles.filter(x=>x==='USUM_TOTEM_RIBOMBEE').length,1);
 for(const name of ['USUM_LUSAMINE_AETHER','USUM_HAPU_PONI','USUM_TOTEM_KOMMOO','USUM_ULTRA_NECROZMA','USUM_TOTEM_RIBOMBEE'])
  assert(battles.includes(name),name+' story fight absent');
 p.location={map:'AlolaPoniWilds',x:10,y:10,facing:'down'};
 await go('poni-return-ferry');assert.equal(p.location.map,'AlolaAetherDock');
 await go('poni-ferry');assert.equal(p.location.map,'AlolaPoniWilds');
 const loaded=Player.load(JSON.parse(Player.serialize(p))).player;
 assert(Alola.peek(loaded).minaClear);assert(Alola.peek(loaded).necrozmaClear);
 assert.equal(Alola.peek(loaded).minaPetals.length,3);assert(saves>15);
 console.log('Poni: 19 maps, Aether rescue, three island trials, Necrozma and ferry resume passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
