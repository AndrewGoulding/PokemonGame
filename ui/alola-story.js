// Initial Ultra Alola chapter: shared US/UM content, no version prompt.
(function(){
 'use strict';
 function create(env){const R=Alola,D=R.data(),p=()=>env.player(),s=()=>R.state(p()),say=env.say,save=env.saveCheckpoint;
 async function fight(id,name,team){if(!env.canBattle())return null;const result=await env.battle('trainer',{foe:{name,team},trainerId:'USUM_'+id,prizeClass:'Youngster'});env.showWorld();await env.resume();if(result==='won')p().flags['USUM_'+id]=true;await save();return result;}
 async function guide(){await say('Ultra Alola · combined Ultra Sun / Ultra Moon\nLevel cap: '+R.cap(p())+'\nSchool: '+s().schoolWins.length+'/4');
  await say(!s().starter?'Find Kukui on Route 1 for your starter.':!s().hauFirst?'Meet Hau in Iki Town.':!s().nebby?'Help Lillie and Nebby on Mahalo Trail.':!s().festival?'Return to Iki Town for the festival.':!s().schoolClear?'Visit Iki Town’s Trainer School.':'The opening chapter is complete. More of Melemele is planned.');}
 async function run(script){if(!script?.startsWith('usum:'))return false;const k=script.slice(5);
  switch(k){
   case'travel-alola':if(!s().started){s().started=true;s().returnCenter=p().flags.lastCenter||null;}
    if(!await env.confirm('Travel to Alola? Ultra Sun and Ultra Moon content is combined.'))break;
    p().flags.lastCenter=s().lastCenter||'AlolaHome';await env.teleport({...s().resume||D.start});await save();await say('Aloha! Welcome to the Alola region!');break;
   case'travel':if(await env.confirm('Return to Sinnoh’s Fight Area?')){s().resume={...p().location};if(R.owns(p().flags.lastCenter))s().lastCenter=p().flags.lastCenter;if(s().returnCenter)p().flags.lastCenter=s().returnCenter;else delete p().flags.lastCenter;await env.teleport({...D.return});await save();}break;
   case'mom':p().party.forEach(Party.heal);await say('Mom: Welcome to Alola! Professor Kukui is waiting on Route 1.');break;
   case'kukui':if(s().starter){await say('Kukui: Train with your partner! Hau is waiting in Iki Town.');break;}
    {const name=await env.choose('Choose your Alola partner!',D.starters);if(!name)break;const r=R.starter(p(),name);
    if(r.full){await say('Make room in your party before choosing a starter.');break;}
    if(r.invalid)break;await save();await say('Kukui: '+name+' chose you! Welcome to the island challenge!');}break;
   case'hau':if(!s().starter){await say('Hau: Kukui is waiting with your first Pokémon on Route 1!');break;}
    if(s().hauFirst){await say('Hau: Go see Lillie on Mahalo Trail!');break;}
    if(await fight('HAU_FIRST','Hau',R.rivalTeam(p()))==='won'){s().hauFirst=true;await save();await say('Hau: Nice battle! Mahalo Trail leads toward the guardian’s bridge.');}break;
   case'lillie':if(!s().hauFirst){await say('Lillie: Please meet Hau in Iki Town first.');break;}
    if(s().nebby){await say('Lillie: Thank you for rescuing Nebby!');break;}
    s().nebby=true;await save();await say('Lillie: Nebby wandered onto the bridge! You rescued it.\nTapu Koko watched over us. Please come back to Iki Town.');break;
   case'festival':if(!s().nebby){await say('The festival can begin after you help Lillie on Mahalo Trail.');break;}
    if(s().festival){await say('The festival remembers your first island battle.');break;}
    if(await fight('HAU_FESTIVAL','Hau',R.rivalTeam(p(),true))==='won'){s().festival=true;await save();await say('Hala: Your island challenge begins! The Trainer School is open.');}break;
   case'heal':p().party.forEach(Party.heal);p().flags.lastCenter='AlolaPokeCenter';s().lastCenter='AlolaPokeCenter';await save();await say('Your Pokémon are healed!');break;
   case'mart':await env.mart(['poke-ball','potion','antidote','paralyze-heal','repel']);break;
   case'teacher':if(!s().festival){await say('Finish the Iki Town festival first.');break;}
    if(s().schoolWins.length<4){await say('Teacher: Defeat all four pupils before challenging me.');break;}
    if(s().schoolClear){await say('Teacher: You passed your first Trainer School lesson!');break;}
    if(await fight('SCHOOL_TEACHER','Teacher Emily',[Party.create('Meowth',10)])==='won'){s().schoolClear=true;await save();await say('Teacher: Congratulations! Your next stop will be Hau’oli City.');}break;
   case'guide':await guide();break;
   case'gate':await say(R.allowed(p(),p().location.map)||'That way is not open yet.');await env.teleport({...s().lastSafe||D.start});break;
   default:if(k.startsWith('student-')){const i=Number(k.slice(8));if(!Number.isInteger(i)||i<0||i>3)break;if(s().schoolWins.includes(i)){await say('Great battle!');break;}
     if(!s().festival){await say('The school is closed until after the festival.');break;}
     const roster=['Pikipek','Yungoos','Grubbin','Alolan Meowth'];const species=roster[i]==='Alolan Meowth'?'Meowth':roster[i];
     if(await fight('SCHOOL_'+i,'Trainer School Student',[Party.create(species,7+i)])==='won'){s().schoolWins.push(i);await save();await say('Student: You won! Keep up the training.');}
     break;}return false;
  }return true;
 }
 function step(){if(!R.owns(p().location.map))return null;const e=R.allowed(p(),p().location.map);if(e)return{type:'trigger',map:p().location.map,trigger:{script:'usum:gate'}};s().lastSafe={...p().location};return null;}
 return{run,step,guide,visible:()=>undefined};
 }
 window.AlolaStory={create};
})();