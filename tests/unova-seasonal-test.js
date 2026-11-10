'use strict';const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');global.window=global;global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};for(const[,f]of fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').matchAll(/<script src="([^"]+)"><\/script>/g))if(!f.startsWith('ui/')||/^ui\/unova-/.test(f))vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),{filename:f});
const F=Unova,R=UnovaSeasonal,D=R.data(),p=Player.create('SEASONS');p.location={map:'UnovaRoute6',x:20,y:20};p.party=[Party.create('Deerling',34),Party.create('Sawsbuck',40),Party.create('Pikachu',40)];p.party[0].hp=1;p.party[0].status='psn';p.party[0].moves[0].pp=0;const old=JSON.parse(JSON.stringify(p.party[0])),pc=Party.create('Deerling',20);pc.seasonForm='autumn';p.boxes[0][0]=pc;
for(const[i,season]of D.forms.entries()){
 p.clockSteps=i*30*Player.STEPS_PER_DAY;F.visit(p,p.location.map);assert.equal(F.season(p),season);
 for(const mon of p.party.slice(0,2)){assert.equal(mon.seasonForm,season);assert.equal(Party.form(mon),i?season:'');assert.equal(Party.toBattleSet(mon).form,i?season:'');}
 assert.equal(p.party[0].hp,1);assert.equal(p.party[0].status,'psn');assert.equal(p.party[0].moves[0].pp,0);assert.equal(pc.seasonForm,'autumn');assert.equal(p.party[2].seasonForm,undefined);
 for(const species of D.species){const r=F.sourceWild(p,Party.create(species,30));assert.equal(r.seasonForm,season);assert.equal(r.met.game,'black2');}
}
for(const k of ['ivs','evs','moves','ability','nature','gender'])assert.deepEqual(p.party[0][k],old[k]);assert.deepEqual(F.peek(p).seasonalSeen.Deerling,D.forms);assert.deepEqual(F.peek(p).seasonalSeen.Sawsbuck,D.forms);
p.location.map='PalletTown';p.clockSteps=0;R.sync(p);assert.equal(p.party[0].seasonForm,'winter');assert.equal(pc.seasonForm,'autumn');const foreign=Party.create('Deerling',10);foreign.seasonForm='summer';assert.equal(F.sourceWild(p,foreign).seasonForm,'summer');
const mother=Party.create('Sawsbuck',40);mother.gender='F';mother.seasonForm='winter';const ditto=Party.create('Ditto',40),egg=Breeding.makeEgg(ditto,mother);assert.equal(egg.species,'Deerling');assert.equal(egg.seasonForm,'winter');Breeding.hatch(egg,'PalletTown');assert.equal(Party.form(egg),'winter');Evolution.evolve(egg,'Sawsbuck');assert.equal(Party.form(egg),'winter');
p.party.push(egg);p.location.map='UnovaRoute6';R.sync(p);assert.equal(egg.seasonForm,'spring');assert.equal(Party.form(egg),'');assert.equal(p.party[0].hp,1);
for(const[id,species]of [[585,'Deerling'],[586,'Sawsbuck']])for(const form of D.forms.slice(1)){
 const key=id+'-'+form;for(const folder of ['','back/','shiny/','back/shiny/'])assert(fs.existsSync(path.join(__dirname,'../assets/sprites/pokemon',folder,key+'.png')));
 for(const folder of ['sprites/icons','world/sprites/follow'])assert(fs.existsSync(path.join(__dirname,'../assets',folder,key+'.png')));assert(JOHTO_FOLLOWERS.hgss.includes(key));
 const b=new Battle({p1:{name:'Season',team:[Party.toBattleSet({...Party.create(species,40),seasonForm:form})]},p2:{name:'Other',team:[Party.toBattleSet(Party.create('Pikachu',40))]}});b.start();assert.equal(Party.toBattleSet({...Party.create(species,40),seasonForm:form}).form,form);assert.deepEqual(b.sides.p1.active.types,DEX[species].types);
}
const loaded=Player.load(JSON.parse(Player.serialize(p))).player;assert.equal(loaded.party.at(-1).seasonForm,'spring');assert.equal(loaded.boxes[0][0].seasonForm,'autumn');assert.deepEqual(F.peek(loaded).seasonalSeen.Deerling,D.forms);
console.log('ok: four source seasonal forms, party/wild/battle sprites, no healing/stat changes, PC isolation, off-region persistence, maternal breeding/evolution, source icons/followers and saved seen forms');
