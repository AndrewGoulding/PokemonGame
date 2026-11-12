// Starfall Street: five independently saved crew challenges and academy finale.
// Uses native sequential battles for the 2D Star Barrage / Starmobile adaptation.
(function(){
'use strict';
const CREWS={
 segin:{label:'Segin',leader:'Giacomo',guard:[['Murkrow',19]],
  waves:[[ ['Maschiff',20] ],[['Murkrow',20],['Pawniard',20]],[['Sableye',21]]],
  boss:[['Pawniard',21]],starmobile:[['Revavroom',22]]},
 schedar:{label:'Schedar',leader:'Mela',guard:[['Houndour',25]],
  waves:[[ ['Houndour',25] ],[['Charcadet',26],['Numel',26]],[['Torkoal',27]]],
  boss:[['Torkoal',27]],starmobile:[['Revavroom',28]]},
 navi:{label:'Navi',leader:'Atticus',guard:[['Shroodle',30]],
  waves:[[ ['Stunky',31] ],[['Shroodle',32],['Gulpin',32]],[['Grafaiai',33]]],
  boss:[['Skuntank',32],['Muk',33]],starmobile:[['Revavroom',33]]},
 ruchbah:{label:'Ruchbah',leader:'Ortega',guard:[['Fidough',43]],
  waves:[[ ['Fidough',44] ],[['Tinkatuff',45],['Wigglytuff',45]],[['Dachsbun',46]]],
  boss:[['Azumarill',47],['Dachsbun',48]],starmobile:[['Revavroom',50]]},
 caph:{label:'Caph',leader:'Eri',guard:[['Pawniard',53]],
  waves:[[ ['Primeape',54] ],[['Lucario',55],['Toxicroak',55]],[['Annihilape',56]]],
  boss:[['Toxicroak',55],['Lucario',55],['Annihilape',56]],starmobile:[['Revavroom',56]]}
};
const SCRIPTS={
 'segiu-guard':['segin','guard'],'segiu-challenge':['segin','challenge'],'giacomo-boss':['segin','boss'],
 'schedar-guard':['schedar','guard'],'schedar-challenge':['schedar','challenge'],'mela-boss':['schedar','boss'],
 'navi-guard':['navi','guard'],'navi-challenge':['navi','challenge'],'atticus-boss':['navi','boss'],
 'ruchbah-guard':['ruchbah','guard'],'ruchbah-challenge':['ruchbah','challenge'],'ortega-boss':['ruchbah','boss'],
 'caph-guard':['caph','guard'],'caph-challenge':['caph','challenge'],'eri-boss':['caph','boss']
};
function create(env,{fight}){
 const p=()=>env.player(),s=()=>Paldea.state(p()),say=env.say,save=env.saveCheckpoint;
 async function guard(crew){
  const c=CREWS[crew];
  if(!s().treasureHunt){await say('Begin the Treasure Hunt at the academy before challenging Team Star.');return;}
  await fight(crew+'GuardClear',crew.toUpperCase()+'_GUARD','Team Star '+c.label+' Gatekeeper',
   c.guard,'The gatekeeper stands aside. The base challenge is available.');
 }
 async function challenge(crew){
  const c=CREWS[crew],flag=crew+'ChallengeClear';
  if(!s().treasureHunt){await say('Begin the Treasure Hunt at the academy before Operation Starfall.');return;}
  if(s()[flag]){await say(c.label+' Squad base challenge complete. The boss is waiting in the garage.');return;}
  if(!s()[crew+'GuardClear']){await say('Defeat the '+c.label+' Squad gatekeeper first.');return;}
  for(let i=0;i<c.waves.length;i++){
   const key=crew+'Wave'+i;
   if(s()[key])continue;
   await fight(key,crew.toUpperCase()+'_WAVE_'+i,c.label+' Squad Grunts',
    c.waves[i],'Team Star base wave '+(i+1)+'/3 cleared!');
   if(!s()[key]){await say('Regroup and retry this wave.');return;}
  }
  s()[flag]=true;await save();await say(c.label+' Squad challenge complete! Enter the garage.');
 }
 async function boss(crew){
  const c=CREWS[crew],key=crew+'Clear',first=crew+'BossPartyWon';
  if(!s()[crew+'ChallengeClear']){await say('Clear '+c.label+' Squad’s gate and base challenge first.');return;}
  if(s()[key]){await say(c.label+' Squad has already stood down. Your victory is saved.');return;}
  if(!s()[first]){
   await fight(first,crew.toUpperCase()+'_BOSS',c.leader,c.boss,c.leader+': Now face my Starmobile!');
   if(!s()[first])return;
  }
  await fight(key,crew.toUpperCase()+'_STARMOBILE',c.leader+'’s Starmobile',c.starmobile,
   c.leader+': You defeated the '+c.label+' Squad!');
  if(!s()[key])return;
  const wins=s().starfallCrews||(s().starfallCrews=[]);
  if(!wins.includes(c.label))wins.push(c.label);
  if(Object.values(CREWS).every(x=>wins.includes(x.label)))s().starfallAllClear=true;
  await save();
  await say('Cassiopeia: '+c.label+' Squad defeated! Starfall Street: '+wins.length+'/5 bases.');
  if(s().starfallAllClear)await say('Cassiopeia: All five crews are defeated. Return to the academy courtyard at night!');
 }
 async function finale(key){
  if(!s().starfallAllClear){await say('Cassiopeia: Defeat all five Team Star bases before the academy finale.');return;}
  if(key==='clive-finale'){
   if(s().cliveClear){await say('Director Clavell: You have already defeated me. Go meet Cassiopeia.');return;}
   await fight('cliveClear','STARFALL_CLIVE','Clive / Director Clavell',
    [['Oranguru',60],['Houndoom',60],['Abomasnow',60]],
    'Clavell: Team Star’s history is more complicated than I realized. Cassiopeia awaits.');
   return;
  }
  if(!s().cliveClear){await say('Cassiopeia: Speak with Clive first.');return;}
  if(s().cassiopeiaClear){await say('Penny: Team Star is together again. Thank you!');return;}
  await fight('cassiopeiaClear','STARFALL_CASSIOPEIA','Penny / Cassiopeia',
   [['Umbreon',62],['Flareon',62],['Jolteon',62],['Sylveon',63]],
   'Penny: I am Cassiopeia. Thank you for saving my friends and giving us another chance.');
  if(s().cassiopeiaClear){s().starfallComplete=true;await save();}
 }
 async function run(key){
  const info=SCRIPTS[key];
  if(info){
   const [crew,action]=info;
   if(action==='guard')await guard(crew);
   if(action==='challenge')await challenge(crew);
   if(action==='boss')await boss(crew);
   return true;
  }
  if(/^cassiopeia-(segin|schedar|navi|ruchbah|caph)$/.test(key)){
   if(!s().treasureHunt){await say('Cassiopeia: Start your Treasure Hunt at the academy first.');return true;}
   if(!s().starfallStarted){s().starfallStarted=true;await save();}
   await say('Cassiopeia: Operation Starfall is underway. Find all five Team Star bosses.');return true;
  }
  if(key==='clive-finale'||key==='cassiopeia-finale'){await finale(key);return true;}
  return false;
 }
 return{run};
}
window.PaldeaStarfallStory={create};
})();