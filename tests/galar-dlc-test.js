// Galar DLC: map graph, Kubfu/Urshifu, Calyrex and Dynamax Adventures.
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const[,file]of html.matchAll(/<script src="([^"]+)"><\/script>/g)){
 if(!file.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
}
for(const file of ['ui/galar-mid.js','ui/galar-finale.js','ui/galar-dlc.js','ui/galar-story.js'])
 vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
(async()=>{
 const D=Galar.data(),X=GalarDlc,T=TOWN_MAP.galar;
 assert.equal(D.mapNames.length,90);assert.equal(D.dlc.armorNames.length,14);assert.equal(D.dlc.crownNames.length,14);
 for(const name of [...D.dlc.armorNames,...D.dlc.crownNames]){
  const map=WORLD_MAPS[name],at=T.at[name];assert(X.owns(name)&&Galar.owns(name));
  assert(at&&T.map[at[1]][at[0]],name+' missing Town Map location');
  assert.equal(map.collision.length,map.width*map.height);
  for(const w of map.warps){const dest=WORLD_MAPS[w.map];assert(dest,name+' dangling warp');assert.equal(dest.warps[w.warp]?.map,name,name+' non-reciprocal warp');assert.equal(map.collision[w.y*map.width+w.x],0,name+' blocked warp');}
  for(const npc of map.people){assert.equal(map.collision[npc.y*map.width+npc.x],0,name+' NPC on collision');assert(!map.warps.some(w=>w.x===npc.x&&w.y===npc.y),name+' NPC on warp');}
 }
 for(const name of D.dlc.centers){const loc=Player.CENTERS[name],map=WORLD_MAPS[name];assert(loc);assert.equal(map.collision[loc.y*map.width+loc.x],0);}
 for(const dest of ['GalarArmorStation','GalarFreezington'])assert(T.fly[T.mapSections[dest]],'missing DLC Fly '+dest);
 const p=Player.create('Galar DLC Tester'),s=Galar.state(p);
 p.party=[Party.create('Cinderace',80)];p.location={map:'GalarWedgehurst',x:20,y:15,facing:'down'};
 Object.assign(s,{starter:'Scorbunny',raihanClear:true,championClear:false,started:true});
 p.flags.alola={championClear:true};const oldAlola=JSON.stringify(p.flags.alola);
 let yes=true,win=true,choice=0,said=[],battles=[],saves=0;
 const env={player:()=>p,say:async msg=>said.push(msg),confirm:async()=>yes,canBattle:()=>true,
 choose:async(_,list)=>list[choice],battle:async(_,o)=>{battles.push(o.trainerId);return win?'won':'lost';},
 showWorld(){},resume:async()=>{},saveCheckpoint:async()=>{saves++;},teleport:async loc=>{p.location={...loc};Galar.visit(p,loc.map);}};
 const story=GalarStory.create(env),go=key=>story.run('swsh:'+key);
 await go('armor-ferry');assert.equal(p.location.map,'GalarWedgehurst');
 await go('crown-train');assert.equal(p.location.map,'GalarWedgehurst');
 s.championClear=true;
 yes=false;await go('armor-ferry');assert.equal(p.location.map,'GalarWedgehurst');
 yes=true;await go('armor-ferry');assert.equal(p.location.map,'GalarArmorStation');
 await go('mustard-intro');assert(s.mustardIntro);
 await go('kubfu-gift');assert(s.kubfuGift);assert(p.party.some(m=>m.species==='Kubfu'));
 win=false;await go('slowpoke-0');assert(!(s.kubfuTraining||[]).length);
 win=true;for(let i=0;i<3;i++)await go('slowpoke-'+i);
 assert(s.kubfuBond);
 await go('urshifu-water');assert.equal(s.urshifuStyle,'Waters');assert(p.party.some(m=>m.species==='Urshifu-Rapid-Strike'));
 await go('urshifu-dark');assert.equal(s.urshifuStyle,'Waters');
 await go('dojo-final');assert(s.mustardTrial);
 await go('mushroom-0');await go('mushroom-1');await go('max-honey');
 await go('max-soup');assert(s.maxSoupReady);
 await go('dojo-final');assert(s.armorClear);
 p.location={map:'GalarTowerWaters',x:10,y:12,facing:'down'};
 await go('armor-return');assert.equal(p.location.map,'GalarWedgehurst');
 await go('armor-ferry');assert.equal(p.location.map,'GalarTowerWaters');
 p.location={map:'GalarWyndonCity',x:19,y:14,facing:'down'};
 await go('crown-train');assert.equal(p.location.map,'GalarCrownStation');
 await go('peony');assert(s.peonyMet);
 await go('calyrex-intro');assert(s.calyrexMet);
 await go('spectrier');assert.equal(s.crownHorseChosen,'Spectrier');
 await go('calyrex-final');assert(s.calyrexWon);
 await go('peony');assert(s.crownClear);
 for(let i=0;i<3;i++)await go('regi-choice');
 assert(s.regisThree);
 choice=1;await go('regi-final');assert.equal(s.regiFinal,'Regidrago');
 for(let i=0;i<3;i++)await go('legendary-birds');
 assert.equal(s.birdsWon.length,3);
 for(let i=0;i<4;i++)await go('dynamax-guide');
 assert.equal(s.adventure.wins,1);assert.equal(s.adventure.stage,0);assert.equal(s.adventure.records[0],'Suicune');
 win=false;await go('dynamax-guide');assert.equal(s.adventure.stage,0);
 win=true;await go('dynamax-guide');assert.equal(s.adventure.stage,1);
 p.location={map:'GalarMaxLair',x:10,y:10,facing:'down'};
 await go('crown-return');assert.equal(p.location.map,'GalarWyndonCity');
 await go('crown-train');assert.equal(p.location.map,'GalarMaxLair');
 const saved=Player.load(JSON.parse(Player.serialize(p))).player,flags=Galar.peek(saved);
 assert(flags.armorClear&&flags.crownClear);assert.equal(flags.urshifuStyle,'Waters');
 assert.equal(flags.crownHorseChosen,'Spectrier');assert.equal(flags.adventure.stage,1);
 assert.equal(JSON.stringify(saved.flags.alola),oldAlola);
 // A separate save can choose Darkness and Glastrier without changing the first save.
 const alt=Player.create('Alternate DLC tester'),a=Galar.state(alt);
 alt.party=[Party.create('Kubfu',60)];
 alt.location={map:'GalarMasterDojo',x:11,y:11,facing:'down'};
 Object.assign(a,{started:true,starter:'Grookey',championClear:true,armorArrival:true,mustardIntro:true,kubfuGift:true,kubfuBond:true,
  crownArrival:true,peonyMet:true,calyrexMet:true});
 const envAlt={...env,player:()=>alt,teleport:async loc=>{alt.location={...loc};Galar.visit(alt,loc.map);}};
 const altStory=GalarStory.create(envAlt);
 await altStory.run('swsh:urshifu-dark');
 assert.equal(a.urshifuStyle,'Darkness');
 assert(alt.party.some(mon=>mon.species==='Urshifu'));
 await altStory.run('swsh:glastrier');
 assert.equal(a.crownHorseChosen,'Glastrier');
 await altStory.run('swsh:calyrex-final');
 assert(a.calyrexWon);
 assert(!a.zacianWon,'Other regional postgame flags remain untouched');
 assert(saves>20&&said.length>20);
 console.log('Galar DLC: 28 maps, Armor and Crown stories, Regis, birds, Max Lair and save/return passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
