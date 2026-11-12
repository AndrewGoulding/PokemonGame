// Unified Scarlet/Violet prologue, with native trainer and encounter battles.
(function(){
'use strict';
function create(env){
 const R=Paldea,D=R.data(),p=()=>env.player(),s=()=>R.state(p()),say=env.say,save=env.saveCheckpoint;
 async function fight(flag,id,name,team,after){
  if(s()[flag]){await say(name+': You already won this battle!');return;}
  if(!env.canBattle()){await say('Your Pokémon need to rest before battling.');return;}
  const result=await env.battle('trainer',{foe:{name,team:team.map(([sp,lv])=>Party.create(sp,lv))},trainerId:'SV_'+id,noBlackout:true});
  env.showWorld();await env.resume();
  if(result!=='won')return;
  s()[flag]=true;await save();await say(after);
 }
 const mid=PaldeaMidStory.create(env,{fight});
 const legends=PaldeaLegendsStory.create(env,{fight});
 function goal(){
  const a=s();
  return !a.starter?'Choose a starter in Cabo Poco.':
   !a.nemonaFirst?'Battle Nemona on Poco Path.':
   !a.legendaryMet?'Investigate Inlet Grotto.':
   !a.arvenMet?'Talk to Arven at the lighthouse.':
   !a.nemonaRoute?'Battle Nemona in South Province.':
   !a.nemonaMesagoza?'Meet Nemona in Mesagoza.':
   !a.treasureHunt?'Start the Treasure Hunt at the academy.':
   !a.katyClear?'Earn Katy’s Bug Badge in Cortondo.':
   !a.brassiusClear?'Challenge Brassius in Artazon.':
   !a.kofuClear?'Challenge Kofu in Cascarrafa.':
   !a.herbaKlawf?'Join Arven at Stony Cliff for the first Titan.':
   !a.herbaBombirdier?'Challenge the Open Sky Titan with Arven.':
   'Three Gym Badges and two Titan expeditions complete! Continue Paldea’s remaining story paths.';
 }
 async function run(script){
  if(!script?.startsWith('sv:'))return false;
  const key=script.slice(3);
  if(await mid.run(key))return true;
  if(await legends.run(key))return true;
  switch(key){
   case'travel':
    if(!await env.confirm('Travel to Paldea? Scarlet and Violet share one adventure.'))break;
    if(!s().started){s().started=true;s().returnCenter=p().flags.lastCenter||null;}
    p().flags.lastCenter=s().lastCenter||'PaldeaHome';
    await env.teleport({...s().resume||D.start});await save();await say('Welcome to Paldea!');break;
   case'return':
    if(!await env.confirm('Return to Sinnoh’s Fight Area?'))break;
    s().resume={...p().location};
    if(R.owns(p().flags.lastCenter))s().lastCenter=p().flags.lastCenter;
    if(s().returnCenter)p().flags.lastCenter=s().returnCenter;else delete p().flags.lastCenter;
    await env.teleport({...D.return});await save();await say('Paldea progress has been saved.');break;
   case'mom':
    p().party.forEach(Party.heal);await say('Mom: Director Clavell is waiting outside. Welcome to your new Paldea adventure!');break;
   case'clavell':case'nemona-starter':{
    if(s().starter){await say('Nemona: See you on Poco Path for our first battle!');break;}
    const species=await env.choose('Choose your Paldea starter!',D.starters);
    if(!species)break;
    const result=R.starter(p(),species);
    if(result.full){await say('Make room in your party before accepting a starter.');break;}
    if(result.invalid)break;
    await save();await say('You chose '+species+'! Nemona chose '+R.nemonaSpecies(p())+'.');break;
   }
   case'nemona-first':
    if(!s().starter){await say('Nemona: Choose your starter first!');break;}
    await fight('nemonaFirst','NEMONA_1','Nemona',[[R.nemonaSpecies(p()),5]],
     'Nemona: Great battle! Let us investigate the Pokémon down by Inlet Grotto.');break;
   case'legendary':
    if(!s().nemonaFirst){await say('Find Nemona on Poco Path first.');break;}
    if(!s().legendaryMet){s().legendaryMet=true;await save();}
    await say('A mysterious Koraidon and Miraidon are linked to the ancient and future legends of Paldea. Arven is waiting by the lighthouse.');break;
   case'arven':
    if(!s().legendaryMet){await say('Arven: Something unusual is happening in Inlet Grotto.');break;}
    if(!s().arvenMet){s().arvenMet=true;await save();}
    await say('Arven: There is more to Paldea than the Gym Challenge. Seek the Titans, too!');break;
   case'nemona-town':await say('Nemona: The road to Mesagoza goes through South Province!');break;
   case'nemona-route':
    if(!s().arvenMet){await say('Nemona: Talk to Arven first.');break;}
    await fight('nemonaRoute','NEMONA_2','Nemona',[[R.nemonaSpecies(p()),8],['Pawmi',9]],
     'Nemona: Excellent! Next stop, Mesagoza and the academy.');break;
   case'nemona-mesagoza':
    if(!s().nemonaRoute){await say('Nemona: Battle me on South Province first!');break;}
    if(!s().nemonaMesagoza){s().nemonaMesagoza=true;await save();}
    await say('Nemona: Welcome to Mesagoza! Head up to Naranja and Uva Academy.');break;
   case'director':
    if(!s().nemonaMesagoza){await say('Clavell: Speak with Nemona in Mesagoza first.');break;}
    if(!s().treasureHunt){s().treasureHunt=true;await save();await say('Director Clavell: The Treasure Hunt begins! Explore Victory Road, Path of Legends and Starfall Street.');}
    else await say('Director Clavell: Your Treasure Hunt is underway.');break;
   case'penny':await say('Penny: Team Star has a story of its own. The Starfall Street adventure lies ahead.');break;
   case'katy-invite':await say('Katy: Visit Cortondo Gym for the Bug-type Gym Challenge!');break;
   case'katy-gym':
    if(!s().treasureHunt){await say('Begin the Treasure Hunt at the academy first.');break;}
    if(!s().katyTrainerWon){
     await fight('katyTrainerWon','KATY_TRAINER','Cortondo Gym Trainer',[['Tarountula',13],['Nymble',13]],'The Gym Trainer cleared your path to Katy.');
     if(!s().katyTrainerWon)break;
    }
    if(!s().katyClear){
     await fight('katyClear','GYM_KATY','Leader Katy',[['Nymble',14],['Tarountula',14],['Teddiursa',15]],
      'Katy awarded the Bug Badge! The next chapter of Paldea awaits.');
     if(s().katyClear&&!s().badges.includes('Bug Badge')){s().badges.push('Bug Badge');await save();}
    }else await say('Katy: Congratulations again on your Bug Badge!');
    break;
   case'heal':
    p().party.forEach(Party.heal);p().flags.lastCenter=p().location.map;s().lastCenter=p().location.map;
    await save();await say('Your Pokémon are fully healed!');break;
   case'guide':await guide();break;
   case'gate':
    await say(R.allowed(p(),p().location.map)||'The path is not open yet.');
    await env.teleport({...s().lastSafe||D.start});break;
   default:return false;
  }
  return true;
 }
 function step(){
  if(!R.owns(p().location.map))return null;
  const why=R.allowed(p(),p().location.map);
  if(why)return{type:'trigger',map:p().location.map,trigger:{script:'sv:gate'}};
  s().lastSafe={...p().location};return null;
 }
 async function guide(){await say('Paldea · Scarlet & Violet combined\nBadges: '+s().badges.length+'/8\nLevel cap: '+R.cap(p()));await say(goal());}
 return{run,step,guide,goal,visible:()=>undefined};
}
window.PaldeaStory={create};
})();