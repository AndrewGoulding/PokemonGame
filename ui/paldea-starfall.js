// Starfall Street — two initial Team Star crews, as native sequential battles.
(function(){
'use strict';
function create(env,{fight}){
 const p=()=>env.player(),s=()=>Paldea.state(p()),say=env.say,save=env.saveCheckpoint;
 async function challenge(crew){
  const label=crew==='segin'?'Segin':'Schedar',flag=crew+'ChallengeClear';
  if(!s().treasureHunt){await say('Start the Treasure Hunt at the academy before Operation Starfall.');return;}
  if(s()[flag]){await say(label+' Squad base challenge is already complete. Head to the garage.');return;}
  if(!s()[crew+'GuardClear']){await say('Defeat the '+label+' Squad gatekeeper first.');return;}
  const teams=crew==='segin'?
   [[['Maschiff',20]],[['Murkrow',20],['Pawniard',20]],[['Sableye',21]]]:
   [[['Houndour',25]],[['Charcadet',26],['Numel',26]],[['Torkoal',27]]];
  for(let i=0;i<teams.length;i++){
   const key=crew+'Wave'+i;
   if(s()[key])continue;
   await fight(key,crew.toUpperCase()+'_WAVE_'+i,label+' Squad Grunts',teams[i],
    'Team Star base wave '+(i+1)+'/3 cleared!');
   if(!s()[key]){await say('Regroup and retry this wave.');return;}
  }
  s()[flag]=true;await save();
  await say(label+' Squad challenge cleared! The boss is waiting in the garage.');
 }
 async function boss(crew){
  const label=crew==='segin'?'Segin':'Schedar',key=crew+'Clear',leader=crew==='segin'?'Giacomo':'Mela';
  if(!s()[crew+'ChallengeClear']){await say('Clear '+label+' Squad’s base challenge first.');return;}
  if(s()[key]){await say(label+' Squad has already stood down. The victory is saved.');return;}
  const first=crew+'BossPartyWon';
  if(!s()[first]){
   await fight(first,crew.toUpperCase()+'_BOSS',leader,
    crew==='segin'?[['Pawniard',21]]:[['Torkoal',27]],
    leader+': My Starmobile is next!');
   if(!s()[first])return;
  }
  await fight(key,crew.toUpperCase()+'_STARMOBILE',leader+'’s Starmobile',
   crew==='segin'?[['Revavroom',22]]:[['Revavroom',28]],
   leader+': You defeated the '+label+' Squad!');
  if(!s()[key])return;
  s().starfallCrews||(s().starfallCrews=[]);
  if(!s().starfallCrews.includes(label))s().starfallCrews.push(label);
  await save();
  await say('Cassiopeia: '+label+' Squad is defeated! Starfall Street: '+s().starfallCrews.length+'/5 bases.');
 }
 async function run(key){
  switch(key){
   case'cassiopeia-segin':case'cassiopeia-schedar':
    if(!s().treasureHunt){await say('Cassiopeia: Begin your Treasure Hunt at the academy first.');return true;}
    if(!s().starfallStarted){s().starfallStarted=true;await save();}
    await say('Cassiopeia: Operation Starfall begins! Find the bosses of Team Star’s five crews.');return true;
   case'segiu-guard':case'schedar-guard':{
    const crew=key==='segiu-guard'?'segin':'schedar';
    if(!s().treasureHunt){await say('The gatekeeper challenges Treasure Hunt participants only.');return true;}
    await fight(crew+'GuardClear',crew.toUpperCase()+'_GUARD','Team Star Gatekeeper',
     crew==='segin'?[['Murkrow',19]]:[['Houndour',25]],
     'The gatekeeper lets you enter the base challenge.');
    return true;
   }
   case'segiu-challenge':await challenge('segin');return true;
   case'schedar-challenge':await challenge('schedar');return true;
   case'giacomo-boss':await boss('segin');return true;
   case'mela-boss':await boss('schedar');return true;
   default:return false;
  }
 }
 return{run};
}
window.PaldeaStarfallStory={create};
})();