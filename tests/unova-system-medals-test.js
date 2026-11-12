'use strict';const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');global.window=global;global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};for(const[,f]of fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').matchAll(/<script src="([^"]+)"><\/script>/g))if(!f.startsWith('ui/')||/^ui\/unova-/.test(f))vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),{filename:f});
// Pokérus Discoverer (94), Around Unova (103, with Unity Tower reached from Castelia's pier) and Pen Pal (166).
const R=UnovaRecords,D=Unova.data(),L=D.interiors.landmarks,M=WORLD_MAPS,ids=p=>Unova.medals(p).map(m=>m.id),seq=(...a)=>()=>a.length?a.shift():0;
const p=Player.create('SYSTEM'),s=Unova.state(p);s.medalBox=true;s.medals=[0];p.party=[Party.create('Snivy',20),Party.create('Lillipup',20),Party.create('Patrat',20)];
// Pokérus: 3 in 65,536 per battle; strain s lasts s % 4 + 1 days in the party; spreads to a neighbour one time in three.
R.pokerus(p,seq(3/65536));assert(!p.party.some(m=>m.pokerus));assert(!ids(p).includes(94));
R.pokerus(p,seq(2/65536,1/3+1e-9,6/15));const sick=p.party.find(m=>m.pokerus);assert.deepEqual(sick.pokerus,{strain:7,days:4});assert.equal(p.party.indexOf(sick),1);assert(ids(p).includes(94));
R.pokerus(p,seq(0,.9,.9));assert(p.party[2].pokerus&&!p.party[0].pokerus);assert.deepEqual(p.party[2].pokerus,{strain:7,days:4});
p.clockSteps=(Player.gameTime(p).day+3)*Player.STEPS_PER_DAY;R.pokerusTick(p);assert.equal(sick.pokerus.days,1);p.clockSteps+=5*Player.STEPS_PER_DAY;R.pokerusTick(p);assert.deepEqual(sick.pokerus,{strain:7,days:0});
R.pokerus(p,seq(.5,0,.9,0,.9));assert(!p.party[0].pokerus,'cured Pokémon no longer spread');
// It doubles EV gains in battle, infected or cured.
assert.equal(Party.toBattleSet(sick).pokerus,true);assert.equal(Party.toBattleSet(p.party[0]).pokerus,false);
const box=Player.create('BOX'),bs=Unova.state(box);bs.medalBox=true;bs.medals=[0];box.boxes=[[{...Party.create('Woobat',5),pokerus:{strain:2,days:0}}]];assert(ids(box).includes(94));
// Around Unova: the 24 source places, Unity Tower by Castelia's pier.
assert.equal(L.towns.length,24);for(const list of L.towns)for(const m of list)assert(M[m],m);assert(L.towns.some(l=>l.includes('UnovaHouseUnityTower2')));
const pier=M.UnovaHouseCasteliaCity9,tower=M.UnovaHouseUnityTower2;assert(M.UnovaCasteliaCity.warps.some(w=>w.map===pier.name));assert(pier.warps.some(w=>w.map===tower.name));assert(tower.warps.some(w=>w.map==='UnovaHouseUnityTower3'));
for(const list of L.towns.slice(0,23))Unova.visit(p,list[0]);assert.equal(R.progress(p,103),23);assert(!ids(p).includes(103));Unova.visit(p,'UnovaWhiteForest');assert(ids(p).includes(103));
// Pen Pal: Mail written and held (record 29).
assert(!ids(p).includes(166));R.record(p,'mail');assert(ids(p).includes(166));
const saved=Player.load(JSON.parse(Player.serialize(p))).player;assert.deepEqual(saved.party[2].pokerus,{strain:7,days:0});assert.equal(R.progress(saved,103),24);
console.log('ok: Pokérus infection/spread/countdown/cure and doubled EVs, Unity Tower by Castelia pier and all 24 Around Unova places, Pen Pal');
