// Alola League, Hall of Fame, Rainbow Rocket and postgame regression.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [,src]of html.matchAll(/<script src="([^"]+)"><\/script>/g))
 if(!src.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,src),'utf8'),{filename:src});
for(const file of ['ui/alola-akala.js','ui/alola-ulaula.js','ui/alola-poni.js','ui/alola-league.js','ui/alola-story.js'])
 vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
(async()=>{
 const D=Alola.data(),L=AlolaLeague,T=TOWN_MAP.alola;
 assert.equal(D.league.mapNames.length,19);assert.equal(Object.keys(D.maps).length,100);
 for(const name of D.league.mapNames){
  const map=WORLD_MAPS[name],at=T.at[name];assert(L.owns(name)&&Alola.owns(name));
  assert(at&&T.map[at[1]][at[0]],name+' missing Town Map location');
  assert.equal(map.collision.length,map.width*map.height);
  for(const w of map.warps){
   const to=WORLD_MAPS[w.map];assert(to,name+' missing connection');
   assert.equal(to.warps[w.warp]?.map,name,name+' non-reciprocal warp');
   assert.equal(map.collision[w.y*map.width+w.x],0,name+' blocked warp');
  }
  for(const npc of map.people){
   assert.equal(map.collision[npc.y*map.width+npc.x],0,name+' blocked NPC');
   assert(!map.warps.some(w=>w.x===npc.x&&w.y===npc.y),name+' NPC covers warp');
  }
 }
 assert(T.fly[T.mapSections.AlolaLeagueLobby]);
 assert(T.fly[T.mapSections.AlolaPostgamePort]);
 const p=Player.create('Alola Champion Tester'),s=Alola.state(p);
 p.party=[Party.create('Decidueye',78)];
 p.location={map:'AlolaSeafolkVillage',x:18,y:19,facing:'down'};
 Object.assign(s,{starter:'Rowlet',halaClear:true,oliviaClear:true,nanuClear:true,minaClear:false});
 let won=true,yes=true,saves=0,spoken=[],battles=[];
 const env={
  player:()=>p,say:async msg=>spoken.push(msg),confirm:async()=>yes,
  choose:async(_,opts)=>opts[0],canBattle:()=>true,
  battle:async(_,data)=>{battles.push(data.trainerId);return won?'won':'lost';},
  wildEncounter:async()=>won?'won':'lost',
  showWorld(){},resume:async()=>{},mart:async()=>{},
  saveCheckpoint:async()=>{saves++;},
  teleport:async loc=>{p.location={...loc};Alola.visit(p,loc.map);}
 };
 const story=AlolaStory.create(env),go=key=>story.run('usum:'+key);
 assert(L.allowed(p,'AlolaLanakilaBase'));
 await go('league-ferry');assert.equal(p.location.map,'AlolaSeafolkVillage');
 s.minaClear=true;assert.equal(Alola.cap(p),90);
 yes=false;await go('league-ferry');assert.equal(p.location.map,'AlolaSeafolkVillage');
 yes=true;await go('league-ferry');assert.equal(p.location.map,'AlolaLanakilaBase');
 assert(L.allowed(p,'AlolaEliteMolayne'));
 won=false;await go('lanakila-hau');assert(!s.lanakilaHau);
 won=true;await go('lanakila-hau');assert(s.lanakilaHau);
 await go('league-registration');assert(s.leagueRegistered);
 await go('elite-olivia');assert(!s.eliteOliviaWon,'League must be ordered');
 for(const key of ['elite-molayne','elite-olivia','elite-acerola','elite-kahili'])await go(key);
 assert(s.eliteKahiliWon);
 won=false;await go('champion-hau');assert(!s.championClear);
 won=true;await go('champion-hau');
 assert(s.championClear&&s.championWon);assert.equal(s.leagueTitles,1);
 assert.equal(Alola.cap(p),100);assert.equal(L.allowed(p,'AlolaPostgamePort'),null);
 await go('league-hall');assert(s.hallOfFame&&s.hallGift);
 const candies=Player.itemCount(p,'rare-candy');
 await go('league-hall');assert.equal(Player.itemCount(p,'rare-candy'),candies);
 yes=false;await go('league-registration');assert(s.championWon);
 yes=true;await go('league-registration');assert(!s.eliteMolayneWon);
 for(const key of ['elite-molayne','elite-olivia','elite-acerola','elite-kahili','champion-hau'])await go(key);
 assert.equal(s.leagueTitles,2,'League title defense increments');
 p.location={map:'AlolaChampionRoom',x:10,y:10,facing:'down'};
 await go('league-exit');assert.equal(p.location.map,'AlolaSeafolkVillage');
 await go('league-ferry');assert.equal(p.location.map,'AlolaChampionRoom');
 p.location={map:'AlolaAetherDock',x:15,y:15,facing:'down'};
 await go('postgame-ferry');assert.equal(p.location.map,'AlolaPostgamePort');
 await go('rr-maxie');assert(!s.rrMaxieWon,'Rocket leaders must be ordered');
 for(const key of ['rr-archie','rr-maxie','rr-cyrus','rr-ghetsis','rr-lysandre','rr-giovanni'])await go(key);
 assert(s.rrGiovanniWon);
 await go('rr-giovanni');assert.equal(battles.filter(x=>x==='USUM_RR_GIOVANNI').length,1);
 for(let i=0;i<7;i++)await go('beast-'+i);
 assert.equal(s.beastWins.length,7);
 await go('beast-1');assert.equal(battles.filter(x=>x==='USUM_BEAST_1').length,1);
 await go('beast-researcher');assert(s.beastReward);
 for(let i=0;i<4;i++)await go('battle-tree');
 assert.equal(s.battleTreeStreak,4);assert.equal(s.battleTreeBest,4);
 won=false;await go('battle-tree');assert.equal(s.battleTreeStreak,0);
 won=true;await go('battle-tree');assert.equal(s.battleTreeStreak,1);
 p.location={map:'AlolaBattleTree',x:10,y:10,facing:'down'};
 await go('postgame-exit');assert.equal(p.location.map,'AlolaAetherDock');
 await go('postgame-ferry');assert.equal(p.location.map,'AlolaBattleTree');
 const loaded=Player.load(JSON.parse(Player.serialize(p))).player;
 assert.equal(Alola.peek(loaded).leagueTitles,2);
 assert(Alola.peek(loaded).rrGiovanniWon);
 assert.equal(Alola.peek(loaded).beastWins.length,7);
 assert.equal(Alola.peek(loaded).battleTreeStreak,1);
 assert(saves>30&&spoken.length>30);
 console.log('Alola League: 19 maps, E4, champion, rematches, RR, beasts, Battle Tree and save persistence passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
