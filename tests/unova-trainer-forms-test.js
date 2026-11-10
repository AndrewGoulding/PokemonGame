'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.window=global;global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};for(const[,f]of fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"]+)"><\/script>/g))if(!f.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const ctx=global;
const trainers=ctx.UNOVA_DATA.trainers;
for(const [id,index,species]of [
 ['ACE_TRAINER_ENZIO',1,'Basculin-Blue-Striped'],
 ['FISHERMAN_ANDREW',1,'Basculin-Blue-Striped'],
 ['VETERAN_ORIANA',0,'Wormadam-Sandy'],
 ['COLRESS_2',1,'Rotom-Wash']
])assert.equal(trainers['BW_TRAINER_'+id].party[index].species,species,id);
assert(trainers.BW_TRAINER_VETERAN_ORIANA.party[0].moves.includes('Earthquake'),'Sandy Cloak uses its Ground-type source learnset');
assert(ctx.UNOVA_DATA.cries['Wormadam-Sandy']);
const form=ctx.UNOVA_DATA.forms['Basculin-Blue-Striped'];assert.equal(form.id,10016);assert.deepEqual(Array.from(form.abilities),['RockHead','Adaptability']);assert.equal(form.hiddenAbility,'MoldBreaker');
for(const file of ['assets/sprites/pokemon/10016.png','assets/sprites/pokemon/back/10016.png','assets/sprites/pokemon/shiny/10016.png','assets/sprites/icons/10016.png','assets/audio/cries/10016.wav'])assert(fs.existsSync(file),file);
assert(Object.values(ctx.UNOVA_DATA.encounters).some(seasons=>JSON.stringify(seasons).includes('Basculin-Blue-Striped')));
console.log('Unova source trainer forms passed');

for(const id of ['BW_TRAINER_ACE_TRAINER_ENZIO','BW_TRAINER_FISHERMAN_ANDREW','BW_TRAINER_VETERAN_ORIANA','BW_TRAINER_COLRESS_2'])for(const r of Unova.team(id)){assert(DEX[r.species],r.species);assert(Party.toBattleSet(r).species);}
