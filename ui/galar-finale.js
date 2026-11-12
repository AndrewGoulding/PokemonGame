// Unified Pokémon Sword/Shield finale: Champion Cup, Eternatus and postgame.
(function(){
'use strict';
function create(env,{battle}){
 const R=Galar,p=()=>env.player(),s=()=>R.state(p()),say=env.say,save=env.saveCheckpoint;
 async function legendary(flag,species,level,message){
  if(s()[flag]&&Player.hasCaught(p(),species)){await say(species+' is already in your collection.');return true;}
  if(!env.wildEncounter){await say('Wild Pokémon capture is not available right now.');return false;}
  if(!env.canBattle()){await say('You need a healthy Pokémon for this encounter.');return false;}
  const outcome=await env.wildEncounter(Party.create(species,level),{music:'mus_vs_legend',noBlackout:true,noGimmicks:true});
  if(outcome!=='caught'){
   await say(species+' escaped. It will return; bring Poké Balls and try again.');
   return false;
  }
  s()[flag]=true;await save();await say(message);return true;
 }
 const matches={
 'cup-marnie':['cupMarnieWon',null,'CUP_MARNIE','Marnie',[['Liepard',47],['Toxicroak',47],['Morpeko',48],['Grimmsnarl',49]]],
 'cup-hop':['cupHopWon','cupMarnieWon','CUP_HOP','Hop',[['Dubwool',48],['Corviknight',48],['Pincurchin',47],['RIVAL',50]]],
 'cup-bede':['cupBedeWon','oleanaWon','CUP_BEDE','Bede',[['Mawile',50],['Gardevoir',51],['Rapidash-Galar',51],['Hatterene',52]]],
 'cup-nessa':['cupNessaWon','cupBedeWon','CUP_NESSA','Nessa',[['Golisopod',51],['Pelipper',51],['Barraskewda',52],['Drednaw',53]]],
 'cup-bea':['cupBeaWon','cupNessaWon','CUP_BEA','Bea',[['Hawlucha',52],['Grapploct',52],['Falinks',53],['Machamp',54]]],
 'cup-allister':['cupAllisterWon','cupBeaWon','CUP_ALLISTER','Allister',[['Dusknoir',52],['Chandelure',53],['Cursola',53],['Gengar',54]]],
 'cup-raihan':['cupRaihanWon','cupAllisterWon','CUP_RAIHAN','Raihan',[['Torkoal',53],['Flygon',54],['Goodra',54],['Duraludon',55]]]
 };
 const commanders={
 'swordward':['swordwardWon',null,'SWORDWARD','Sordward',[["Sirfetch'd",61],['Bisharp',61],['Doublade',62]]],
 'shieldbert':['shieldbertWon','swordwardWon','SHIELDBERT','Shielbert',[['Bronzong',61],['Falinks',61],['Aegislash-Shield',62]]]
 };
 async function fight(flag,id,name,team,message){
  if(s()[flag]){await say(name+': We have already battled.');return true;}
  if(await battle(id,name,team)!=='won')return false;
  s()[flag]=true;await save();await say(message);return true;
 }
 function goal(){
  const f=s();return !f.raihanClear?'Earn all eight Gym Badges and defeat Raihan.':
   !f.cupRegistered?'Register for the Champion Cup in Wyndon Stadium.':
   !f.cupMarnieWon?'Defeat Marnie in the Champion Cup.':
   !f.cupHopWon?'Defeat Hop in the Champion Cup.':
   !f.macroCosmosWon?'Investigate Rose Tower and defeat Macro Cosmos.':
   !f.oleanaWon?'Challenge Oleana on Rose Tower’s summit.':
   !f.cupBedeWon?'Face Bede in the Champion Cup finals.':
   !f.cupNessaWon?'Defeat Nessa in the finals.':
   !f.cupBeaWon?'Defeat Bea in the finals.':
   !f.cupAllisterWon?'Defeat Allister in the finals.':
   !f.cupRaihanWon?'Defeat Raihan in the finals.':
   !f.roseWon?'Stop Chairman Rose at the Energy Plant.':
   !f.eternatusClear?'Defeat Eternatus and end the Darkest Day.':
   !f.championClear?'Challenge Leon at Wyndon Stadium.':
   !f.postgameHopWon?'Meet Hop in Slumbering Weald after becoming Champion.':
   !f.swordwardWon?'Defeat Sordward at the ancient shrine.':
   !f.shieldbertWon?'Defeat Shielbert at the ancient shrine.':
   !f.zacianWon||!f.zamazentaWon?'Complete the Zacian and Zamazenta encounters.':
   'Galar is complete! Continue Battle Tower challenges and title defenses.';
 }
 async function run(key){
  if(matches[key]){
   // (Hop's starter is looked up when the battle starts: at create time no save is loaded yet.)
   const [flag,required,id,name,cast]=matches[key],team=cast.map(([species,level])=>[species==='RIVAL'?R.rivalSpecies(p()):species,level]);
   if(!s().cupRegistered){await say('Register for the Champion Cup first.');return true;}
   if(required&&!s()[required]){await say('You must win the previous story match first.');return true;}
   if(await fight(flag,id,name,team,'Champion Cup victory against '+name+'!')){
    if(key==='cup-raihan'){s().cupFinalistsClear=true;await save();}
   }
   return true;
  }
  if(commanders[key]){
   const[flag,required,id,name,team]=commanders[key];
   if(!s().championClear){await say('This mystery begins after becoming Champion.');return true;}
   if(required&&!s()[required]){await say('Defeat Sordward first.');return true;}
   await fight(flag,id,name,team,name+' has been defeated at the ancient shrine.');
   return true;
  }
  switch(key){
   case'route10-hop':await say('Hop: The Champion Cup is in Wyndon! Let’s see who makes it to Leon.');break;
   case'route10-trainer':await fight('route10Trainer','ROUTE10_TRAINER','Route 10 Veteran',[['Duraludon',47],['Vanillish',47]],'The veteran wished you luck in the Champion Cup.');break;
   case'wyndon-hauled':await say('The train has arrived in Wyndon. The stadium hosts the Champion Cup.');break;
   case'wyndon-hotel':await say('The Wyndon Hotel welcomes Gym Challengers. Rest before the tournament.');break;
   case'wyndon-sonia':await say('Sonia: The history of the Darkest Day points back to Hammerlocke. Something is wrong with Chairman Rose’s plan.');break;
   case'galar-final-heal':
    p().party.forEach(Party.heal);
    p().flags.lastCenter=p().location.map;s().lastCenter=p().location.map;
    await save();await say('Your Pokémon are fully healed!');break;
   case'cup-registration':
    if(!s().raihanClear){await say('All eight Gym Badges are required to register.');break;}
    if(s().championClear){
     if(!await env.confirm('Begin another Champion Cup title-defense challenge?'))break;
     for(const [flag]of Object.values(matches))delete s()[flag];
     delete s().cupFinalistsClear;delete s().leonWon;
    }
    s().cupRegistered=true;await save();await say('You registered for the Champion Cup! Battle Marnie, then Hop.');break;
   case'macro-cosmos':
    if(!s().cupHopWon){await say('Complete the Champion Cup preliminaries before investigating Rose Tower.');break;}
    await fight('macroCosmosWon','MACRO_COSMOS','Macro Cosmos Security',[['Durant',51],['Mawile',51],['Ferrothorn',52]],'The Macro Cosmos staff withdrew. Oleana is at the summit.');break;
   case'rose-oleana':
    if(!s().macroCosmosWon){await say('Security is blocking the lift to Oleana.');break;}
    await fight('oleanaWon','OLEANA','Oleana',[['Froslass',52],['Milotic',53],['Salazzle',53],['Garbodor',54]],'Oleana has been defeated. Return to Wyndon Stadium for the finals.');break;
   case'chairman-rose':
    if(!s().cupFinalistsClear){await say('Chairman Rose has not yet begun the Darkest Day plan. Win the Champion Cup finals first.');break;}
    await fight('roseWon','CHAIRMAN_ROSE','Chairman Rose',[['Escavalier',55],['Ferrothorn',55],['Perrserker',56],['Copperajah',57]],'Rose was defeated! Eternatus is rampaging deeper in the Energy Plant.');break;
   case'eternatus':
    if(!s().roseWon){await say('Chairman Rose must be stopped before challenging Eternatus.');break;}
    if(!s().eternatusSubdued){
     if(await battle('ETERNATUS','Eternatus',[['Eternatus',60]])!=='won')break;
     s().eternatusSubdued=true;await save();
     await say('Eternatus weakened! Zacian and Zamazenta helped you stop the Darkest Day. Now catch Eternatus.');
    }
    await legendary('eternatusClear','Eternatus',60,'You caught Eternatus! The Darkest Day has ended. Return to Wyndon Stadium to face Leon.');
    break;
   case'champion-leon':
    if(!s().cupFinalistsClear||!s().eternatusClear){await say('Win the Cup finals and stop Eternatus before Leon’s Championship match.');break;}
    if(s().leonWon&&s().championClear){await say('You are already Galar Champion. Register for a title defense to battle again.');break;}
    if(!s().leonWon){
     if(await battle('CHAMPION_LEON','Champion Leon',[['Aegislash-Shield',62],['Dragapult',62],['Haxorus',63],['Rhyperior',62],['Mr. Rime',63],['Charizard',65]])!=='won')break;
     s().leonWon=true;await save();
    }
    s().championClear=true;s().galarTitles=(s().galarTitles||0)+1;await save();
    await say('You defeated Leon! You are the new Galar Champion! Your title and story progress have been saved.');break;
   case'postgame-hop':
    if(!s().championClear){await say('Return when you have become Champion.');break;}
    await fight('postgameHopWon','POSTGAME_HOP','Hop',[['Dubwool',60],['Corviknight',61],['Snorlax',61],[R.rivalSpecies(p()),63]],'Hop: Sordward and Shielbert are causing trouble by the shrine!');break;
   case'zacian':
   case'zamazenta':{
    if(!s().swordwardWon||!s().shieldbertWon){await say('Defeat Sordward and Shielbert before the legendary wolves appear.');break;}
    const isSword=key==='zacian',flag=isSword?'zacianWon':'zamazentaWon',species=isSword?'Zacian':'Zamazenta';
    await legendary(flag,species,70,species+' was caught and registered! Both Sword and Shield legends are available in this unified campaign.');break;
   }
   case'galar-battle-tower':{
    if(!s().championClear){await say('The Battle Tower opens to Galar Champions.');break;}
    const count=s().battleTowerStreak||0,rosters=[
     [['Corviknight',66],['Excadrill',66]],
     [['Dragapult',68],['Grimmsnarl',68]],
     [['Cinderace',69],['Inteleon',69],['Rillaboom',69]],
     [['Charizard',72],['Aegislash-Shield',71],['Dragapult',71]]
    ];
    if(await battle('BATTLE_TOWER_'+count,'Battle Tower Challenger',rosters[count%rosters.length])!=='won'){
     s().battleTowerBest=Math.max(s().battleTowerBest||0,count);s().battleTowerStreak=0;
     await save();await say('Battle Tower streak ended at '+count+' wins.');break;
    }
    s().battleTowerStreak=count+1;s().battleTowerBest=Math.max(s().battleTowerBest||0,s().battleTowerStreak);
    await save();await say('Battle Tower victory! Current streak: '+s().battleTowerStreak+', best: '+s().battleTowerBest+'.');break;
   }
   default:return false;
  }return true;
 }
 return{run,goal};
}
window.GalarFinaleStory={create};
})();
