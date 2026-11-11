// Initial Ultra Alola chapter: shared US/UM content, no version prompt.
(function(){
 'use strict';
 function create(env){const R=Alola,D=R.data(),p=()=>env.player(),s=()=>R.state(p()),say=env.say,save=env.saveCheckpoint;
 async function fight(id,name,team){if(!env.canBattle())return null;const result=await env.battle('trainer',{foe:{name,team},trainerId:'USUM_'+id,prizeClass:'Youngster'});env.showWorld();await env.resume();if(result==='won')p().flags['USUM_'+id]=true;await save();return result;}
 const akala=AlolaAkalaStory.create(env,{fight});
 const ulaula=AlolaUlaulaStory.create(env,{fight});
 const poni=AlolaPoniStory.create(env,{fight});
 async function guide(){await say('Ultra Alola · combined Ultra Sun / Ultra Moon\nLevel cap: '+R.cap(p())+'\nSchool: '+s().schoolWins.length+'/4');
  await say(!s().starter?'Find Kukui on Route 1 for your starter.':!s().hauFirst?'Meet Hau in Iki Town.':!s().nebby?'Help Lillie and Nebby on Mahalo Trail.':!s().festival?'Return to Iki Town for the festival.':!s().schoolClear?'Visit Iki Town’s Trainer School.':!s().ilimaWon?'Meet Ilima in Hau’oli City.':!s().skullRoute2?'Stop Team Skull in Hau’oli and on Route 2.':!s().verdantClear?'Complete Verdant Cavern’s trial.':!s().halaClear?'Challenge Kahuna Hala in Iki Town.':!s().oliviaClear?akala.goal():!s().nanuClear?ulaula.goal():poni.goal());}
 async function run(script){if(!script?.startsWith('usum:'))return false;const k=script.slice(5);if(await akala.run(k))return true;if(await ulaula.run(k))return true;if(await poni.run(k))return true;
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

   case'beach-hau':await say('Hau: Hau’oli City is up ahead! Captain Ilima is there.');break;
   case'ilima':if(s().ilimaWon){await say('Ilima: Defeat Team Skull on Route 2, then attempt Verdant Cavern.');break;}
    if(await fight('ILIMA','Captain Ilima',[Party.create('Yungoos',9),Party.create('Smeargle',10)])==='won'){s().ilimaWon=true;await save();await say('Ilima: Excellent! My trial awaits in Verdant Cavern, beyond Route 2.');}break;
   case'skull-intro':if(s().skullCity){await say('Team Skull already ran away.');break;}
    if(await fight('SKULL_CITY','Team Skull Grunt',[Party.create('Zubat',8)])==='won'){s().skullCity=true;await save();await say('The Team Skull Grunt fled toward Route 2.');}break;
   case'route2-hau':if(!s().ilimaWon){await say('Hau: Find Captain Ilima in Hau’oli City first.');break;}
    if(s().route2Hau){await say('Hau: The trial captain is waiting!');break;}
    if(await fight('HAU_ROUTE2','Hau',[Party.create('Pikachu',10),Party.create(R.rivalSpecies(p()),11)])==='won'){s().route2Hau=true;await save();await say('Hau: Nice battle! The trial cave is further up Route 2.');}break;
   case'skull-route2':if(!s().skullCity){await say('Team Skull is causing trouble back in Hau’oli City.');break;}
    if(s().skullRoute2){await say('Team Skull has cleared out.');break;}
    if(await fight('SKULL_ROUTE2','Team Skull Grunt',[Party.create('Rattata',9),Party.create('Zubat',10)])==='won'){s().skullRoute2=true;await save();await say('Team Skull retreated. The way to Verdant Cavern is clear.');}break;
   case'berries':{const r=R.gift(p(),'berries','oran-berry',3);if(r.full)await say('Make room in your Bag to collect the Berries.');
     else{await save();await say('The farmer gave you three Oran Berries, when available.');}break;}
   case'cemetery':await say('A quiet place to remember Pokémon. Ghost types gather here.');break;
   case'trial-guide':if(!s().skullRoute2){await say('Ilima: Drive away Team Skull before entering the trial.');break;}
    if(s().verdantClear)await say('Ilima: You completed my first trial! Return to Iki Town to meet Kahuna Hala.');
    else await say('Ilima: Defeat three hiding Pokémon, then face both Totem Pokémon. No retreat until the trial is complete.');break;
   case'den-0':case'den-1':case'den-2':{const i=Number(k.slice(-1));s().dens||(s().dens=[]);
     if(s().dens.includes(i)){await say('This den is empty.');break;}
     if(s().verdantClear){await say('The trial is already complete.');break;}
     const species=['Yungoos','Rattata','Gumshoos'][i];const result=await env.wildEncounter(Party.create(species,10+i),{noCatch:true,noBlackout:true});
     if(result==='won'){s().dens.push(i);await save();await say('The wild Pokémon fled from its den!');}
     else await say('The Pokémon retreated. Try again.');break;}
   case'totem':if(s().verdantClear){await say('Both Totem Pokémon acknowledged your victory.');break;}
    if((s().dens||[]).length!==3){await say('Inspect all three occupied dens first.');break;}
    if(!s().totemGumshoos){if(await fight('TOTEM_GUMSHOOS','Totem Gumshoos',[Party.create('Gumshoos',12)])!=='won')break;s().totemGumshoos=true;await save();}
    if(!s().totemRaticate){if(await fight('TOTEM_RATICATE','Totem Raticate',[Party.create('Raticate-Alola',12)])!=='won')break;s().totemRaticate=true;await save();}
    {const z=R.gift(p(),'normalium-z','normalium-z');if(z.full){await say('Make space in your Bag before accepting Normalium Z.');break;}
      s().verdantClear=true;await save();await say('Trial complete! Both Ultra Sun and Ultra Moon Totems were defeated. You earned Normalium Z. Return to Iki Town.');}break;
   case'hala':if(!s().verdantClear){await say('Hala: Complete Ilima’s trial in Verdant Cavern first.');break;}
    if(s().halaClear){await say('Hala: You cleared the Melemele grand trial. Akala Island awaits.');break;}
    if(await fight('HALA','Island Kahuna Hala',[Party.create('Machop',14),Party.create('Makuhita',14),Party.create('Crabrawler',15)])!=='won')break;
    {const z=R.gift(p(),'fightinium-z','fightinium-z');if(z.full){await say('Make space in your Bag for Fightinium Z.');break;}
      const ring=R.gift(p(),'z-ring','z-ring');if(ring.full){await say('Make room for the Z-Ring.');break;}
      s().halaClear=true;await save();await say('You completed the Melemele Grand Trial! Hala awarded Fightinium Z and a Z-Ring.');}break;
   case'hauoli-heal':p().party.forEach(Party.heal);p().flags.lastCenter='AlolaHauoliCenter';s().lastCenter='AlolaHauoliCenter';await save();await say('Your Pokémon are healed!');break;
   case'guide':await guide();break;
   case'gate':await say(R.allowed(p(),p().location.map)||'That way is not open yet.');await env.teleport({...s().lastSafe||D.start});break;
   default:if(k.startsWith('student-')){const i=Number(k.slice(8));if(!Number.isInteger(i)||i<0||i>3)break;if(s().schoolWins.includes(i)){await say('Great battle!');break;}
     if(!s().festival){await say('The school is closed until after the festival.');break;}
     const roster=['Pikipek','Yungoos','Grubbin','Meowth-Alola'];const species=roster[i];
     if(await fight('SCHOOL_'+i,'Trainer School Student',[Party.create(species,7+i)])==='won'){s().schoolWins.push(i);await save();await say('Student: You won! Keep up the training.');}
     break;}return false;
  }return true;
 }
 function step(){if(!R.owns(p().location.map))return null;const e=R.allowed(p(),p().location.map);if(e)return{type:'trigger',map:p().location.map,trigger:{script:'usum:gate'}};s().lastSafe={...p().location};return null;}
 return{run,step,guide,visible:()=>undefined};
 }
 window.AlolaStory={create};
})();