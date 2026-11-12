// Arven's first two Titan expeditions: native battles, recoverable stages and rewards.
(function(){
'use strict';
function create(env,{fight}){
 const p=()=>env.player(),s=()=>Paldea.state(p()),say=env.say,save=env.saveCheckpoint;
 async function run(key){
  switch(key){
   case 'klawf-titan':
    if(!s().treasureHunt){await say('Arven: Start the Treasure Hunt before following the Titans!');return true;}
    if(s().klawfClear){await say('The Stony Cliff Titan has retreated. Search its cave for Herba Mystica.');return true;}
    await fight('klawfFirst','TITAN_KLAWF_1','Stony Cliff Titan Klawf',
     [['Klawf',16]],'Klawf retreated into the cave after the first battle! Follow it with Arven.');
    return true;
   case 'klawf-herba':
    if(!s().klawfFirst){await say('Arven: We have to face Klawf outside first!');return true;}
    if(!s().klawfClear){
     await fight('klawfClear','TITAN_KLAWF_2','Titan Klawf and Arven',
      [['Klawf',17]],'Arven: We did it! The Stony Cliff Titan is defeated!');
     if(!s().klawfClear)return true;
    }
    if(!s().herbaKlawf){
     s().herbaKlawf=true;
     s().rideDash=true; // Unlock record; 2D field sprint controls are not simulated here.
     await save();
     await say('Arven discovered Sweet Herba Mystica! Your legendary partner recovered the power to dash. Path of Legends: 1/5 Titans.');
    }else await say('Arven: The Sweet Herba Mystica helped our Pokémon. On to the next Titan!');
    return true;
   case 'arven-open-sky':
    if(!s().herbaKlawf){await say('Arven: We should finish our search at the Stony Cliff cave first.');return true;}
    await say('Arven: The Open Sky Titan lives ahead. Watch out for falling rocks!');return true;
   case 'bombirdier-titan':
    if(!s().herbaKlawf){await say('Arven: Find the first Herba Mystica before the Open Sky Titan.');return true;}
    if(!s().bombirdierFirst){
     await fight('bombirdierFirst','TITAN_BOMBIRDIER_1','Open Sky Titan Bombirdier',
      [['Bombirdier',19]],'Bombirdier retreated to feed on a mysterious herb! Challenge it again.');
     if(!s().bombirdierFirst)return true;
     return true;
    }
    if(!s().bombirdierClear){
     await fight('bombirdierClear','TITAN_BOMBIRDIER_2','Titan Bombirdier and Arven',
      [['Bombirdier',20]],'Arven: Another Titan down! Time to collect the Herba Mystica.');
     if(!s().bombirdierClear)return true;
    }
    if(!s().herbaBombirdier){
     s().herbaBombirdier=true;
     s().rideSwim=true; // A saved story unlock; swim riding requires dedicated field support.
     await save();
     await say('Arven discovered Bitter Herba Mystica! Your legendary partner recovered the power to swim. Path of Legends: 2/5 Titans.');
    }else await say('Arven: We already gathered the Open Sky Herba Mystica. Great work!');
    return true;
   default:return false;
  }
 }
 return{run};
}
window.PaldeaLegendsStory={create};
})();