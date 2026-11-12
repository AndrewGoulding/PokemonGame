// Paldea Victory Road continuation: Brassius, Kofu, and route challenges.
(function(){
'use strict';
function create(env,{fight}){
 const p=()=>env.player(),s=()=>Paldea.state(p()),say=env.say,save=env.saveCheckpoint;
 async function gym({flag,id,leader,badge,trainers,team,gate}){
  if(!s()[gate]){await say('Continue your Treasure Hunt before challenging '+leader+'.');return;}
  if(s()[flag]){await say(leader+': Your '+badge+' is proof of your victory!');return;}
  for(let i=0;i<trainers.length;i++){
   const key=flag+'Trainer'+i;
   if(s()[key])continue;
   await fight(key,id+'_TRAINER_'+i,leader+' Gym Trainer',trainers[i],
    'You cleared Gym Trainer '+(i+1)+'!');
   if(!s()[key])return;
  }
  await fight(flag,id,leader,team,leader+' awarded the '+badge+'!');
  if(s()[flag]&&!s().badges.includes(badge)){s().badges.push(badge);await save();}
 }
 async function run(key){
  switch(key){
   case 'east-trainer':
    await fight('eastTrainer','EAST_PROVINCE_TRAINER','East Province Trainer',
     [['Tadbulb',17],['Nacli',18]],'Your East Province challenge is complete!');return true;
   case 'west-trainer':
    await fight('westTrainer','WEST_PROVINCE_TRAINER','West Province Trainer',
     [['Maschiff',27],['Toedscool',28]],'Your West Province challenge is complete!');return true;
   case 'brassius-invite':
    await say('Brassius: Artazon is a town of art. Come to my Grass-type Gym!');return true;
   case 'kofu-invite':
    await say('Kofu: Cascarrafa is full of surprises! Challenge my Water-type Gym!');return true;
   case 'brassius-gym':
    await gym({flag:'brassiusClear',id:'GYM_BRASSIUS',leader:'Leader Brassius',
     badge:'Grass Badge',gate:'treasureHunt',
     trainers:[[ ['Smoliv',16] ],[['Petilil',17]]],
     team:[['Petilil',16],['Smoliv',16],['Sudowoodo',17]]});return true;
   case 'kofu-gym':
    await gym({flag:'kofuClear',id:'GYM_KOFU',leader:'Leader Kofu',
     badge:'Water Badge',gate:'brassiusClear',
     trainers:[[ ['Veluza',28] ],[['Wugtrio',29]]],
     team:[['Veluza',29],['Wugtrio',29],['Crabominable',30]]});return true;
   default:return false;
  }
 }
 return{run};
}
window.PaldeaMidStory={create};
})();