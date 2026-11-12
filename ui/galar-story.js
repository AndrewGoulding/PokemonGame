// Unified Sword/Shield Galar campaign opening scenes.
(function(){
'use strict';
function create(env){
 const R=Galar,D=R.data(),p=()=>env.player(),s=()=>R.state(p()),say=env.say,save=env.saveCheckpoint;
 async function battle(id,name,spec){
  if(!env.canBattle())return null;
  const team=spec.map(([species,level])=>Party.create(species,level));
  const result=await env.battle('trainer',{foe:{name,team},trainerId:'SWSH_'+id,prizeClass:'Youngster'});
  env.showWorld();await env.resume();await save();return result;
 }
 async function markFight(flag,id,name,spec,line){
  if(s()[flag]){await say(name+': We have already battled!');return;}
  if(await battle(id,name,spec)!=='won')return;
  s()[flag]=true;await save();await say(line);
 }
 function goal(){
  const f=s();return !f.starter?'Meet Champion Leon at Hop’s House and choose a starter.':
   !f.hopFirst?'Battle Hop at his house.':
   !f.wealdClear?'Investigate Slumbering Weald.':
   !f.soniaMet?'Meet Sonia at the Wedgehurst Pokémon Research Lab.':
   !f.route2Hop?'Battle Hop on Route 2.':
   !f.endorsement?'Visit Professor Magnolia for a Gym Challenge endorsement.':
   !f.ceremony?'Register at Motostoke Stadium for the Gym Challenge.':
   !f.bedeMineWon?'Defeat Bede in Galar Mine.':
   !f.miloClear?'Earn the Grass Badge from Milo in Turffield.':
   !f.nessaClear?'Earn the Water Badge from Nessa in Hulbury.':
   !f.mine2Clear?'Defeat Bede in Galar Mine No. 2.':
   !f.kabuClear?'Return to Motostoke Stadium for Kabu’s Fire Gym.':
   !f.raihanClear?mid.goal():!f.championClear?finale.goal():dlc.goal();
 }
 const rivalTeam=level=>[['Wooloo',level], [R.rivalSpecies(p()),level+1]];
 async function gym({gate,flag,leader,id,team,badge,puzzle,text}){
  if(!s()[gate]){await say('You have not met the requirements for this Gym Challenge yet.');return;}
  if(s()[flag]){await say(leader+': Congratulations on your '+badge+'!');return;}
  s()[puzzle]||(s()[puzzle]=[]);
  const challenges=flag==='miloClear'?
   [[['Gossifleur',17]],[['Budew',18]]]:
   flag==='nessaClear'?[[['Tympole',21]],[['Krabby',22]]]:
   [[['Vulpix',24]],[['Litwick',24]],[['Sizzlipede',25]]];
  for(let i=0;i<challenges.length;i++){
   if(s()[puzzle].includes(i))continue;
   const result=await battle(id+'_GYM_TRAINER_'+i,leader+' Gym Trainer',challenges[i]);
   if(result!=='won'){await say('Try the Gym Challenge again when your team is ready.');return;}
   s()[puzzle].push(i);await save();
  }
  if(!s()[flag+'LeaderWon']){
   if(await battle(id,leader,team)!=='won')return;
   s()[flag+'LeaderWon']=true;await save();
  }
  if(!s().badges.includes(badge))s().badges.push(badge);
  s()[flag]=true;await save();await say(text);
 }
 const mid=GalarMidStory.create(env,{battle});
 const finale=GalarFinaleStory.create(env,{battle});
 const dlc=GalarDlcStory.create(env,{battle});
 async function run(script){
  if(!script?.startsWith('swsh:'))return false;
  const key=script.slice(5);
  if(await mid.run(key))return true;
  if(await finale.run(key))return true;
  if(await dlc.run(key))return true;
  switch(key){
   case'travel-galar':
    if(!await env.confirm('Travel to Galar? Sword and Shield share one campaign.'))break;
    if(!s().started){s().started=true;s().returnCenter=p().flags.lastCenter||null;}
    p().flags.lastCenter=s().lastCenter||'GalarHome';
    await env.teleport({...s().resume||D.start});await save();await say('Welcome to the Galar region!');break;
   case'galar-mom':
    p().party.forEach(Party.heal);await say('Mom: Hop is waiting outside! Champion Leon has come home to Postwick.');break;
   case'hop-postwick':
    if(!s().hopMet){s().hopMet=true;await save();}
    await say('Hop: Come to my house! Lee has brought three Pokémon for us to choose from!');break;
   case'leon-starter':{
    if(s().starter){await say('Leon: Train well with your partner. Hop is eager to battle you!');break;}
    const species=await env.choose('Choose your Galar starter!',D.starters);
    if(!species)break;
    const result=R.starter(p(),species);
    if(result.full){await say('Make a space in your party before accepting a starter.');break;}
    if(result.invalid)break;
    await save();await say('Leon: '+species+' is your partner! Hop has chosen '+R.rivalSpecies(p())+'.');break;
   }
   case'hop-first':
    if(!s().starter){await say('Hop: Choose your starter from Leon first!');break;}
    await markFight('hopFirst','HOP_FIRST','Hop',[[R.rivalSpecies(p()),5],['Wooloo',3]],'Hop: What a battle! Follow me into Slumbering Weald.');break;
   case'weald-legend':
    if(!s().hopFirst){await say('Hop wants a battle first.');break;}
    if(!s().wealdClear){s().wealdClear=true;await save();}
    await say('A mysterious wolf appeared in the fog! Zacian and Zamazenta both seem connected to Galar’s ancient legend. Head for Wedgehurst.');break;
   case'route1-trainer':
    await markFight('route1Trainer','ROUTE1_TRAINER','Route 1 Youngster',[['Skwovet',4]],'The youngster praised your Pokémon.');break;
   case'sonia-wedgehurst':
    await say(s().soniaMet?'Sonia: Professor Magnolia is at the end of Route 2.':'Sonia: My Pokémon Research Lab is just here in Wedgehurst. Come in!');break;
   case'sonia-lab':
    if(!s().wealdClear){await say('Sonia: Explore Slumbering Weald first.');break;}
    if(!s().soniaMet){s().soniaMet=true;await save();await say('Sonia gave you a Pokédex! Professor Magnolia lives beyond Route 2.');}
    else await say('Sonia: Keep studying Pokémon on your adventure.');break;
   case'hop-route2':
    if(!s().soniaMet){await say('Hop: Talk to Sonia first!');break;}
    await markFight('route2Hop','HOP_ROUTE2','Hop',rivalTeam(8),'Hop: We should visit Professor Magnolia next.');break;
   case'magnolia':
    if(!s().route2Hop){await say('Magnolia: Hop is waiting for a battle on Route 2.');break;}
    if(!s().endorsement){s().endorsement=true;await save();await say('Professor Magnolia and Leon endorsed you for the Gym Challenge! Head through the Wild Area to Motostoke.');}
    else await say('Magnolia: Galar’s Gym Challenge awaits. Good luck!');break;
   case'wild-area-guide':await say('The Wild Area has roaming Pokémon and changing environments. This 2D adaptation uses a shared encounter pool.');break;
   case'wild-area-trainer':await markFight('wildAreaTrainer','WILD_AREA_TRAINER','Wild Area Trainer',[['Tyrogue',12],['Bunnelby',12]],'The trainer gave you a cheer.');break;
   case'galar-heal':
    p().party.forEach(Party.heal);p().flags.lastCenter=p().location.map;s().lastCenter=p().location.map;
    await save();await say('Your Pokémon are fully healed!');break;
   case'marnie-intro':
    if(!s().marnieMet){s().marnieMet=true;await save();await say('Marnie: Team Yell is noisy, but I want to become Champion on my own strength.');}
    else await say('Marnie: Good luck in your Gym Challenge.');break;
   case'league-ceremony':
    if(!s().endorsement){await say('The stadium requires Professor Magnolia’s endorsement.');break;}
    if(!s().ceremony){s().ceremony=true;await save();await say('Chairman Rose opened the Gym Challenge! You received a Dynamax Band and the road to Turffield is open.');}
    else await say('Motostoke Stadium: Your Gym Challenge is underway!');break;
   case'route3-trainer':await markFight('route3Trainer','ROUTE3_TRAINER','Route 3 Schoolkid',[['Rolycoly',13],['Gossifleur',13]],'You defeated the Route 3 trainer.');break;
   case'bede-mine':
    if(!s().ceremony){await say('Bede: You have not registered for the Gym Challenge.');break;}
    await markFight('bedeMineWon','BEDE_MINE','Bede',[['Solosis',13],['Gothita',14],['Hatenna',15]],'Bede: You may proceed to Turffield.');break;
   case'milo-invite':await say('Milo: Turffield Stadium is just ahead. Get ready for the Grass Gym Challenge.');break;
   case'milo-town':await say('Milo: Welcome to Turffield! The stadium is ready for your first badge.');break;
   case'milo-gym':
    await gym({gate:'bedeMineWon',flag:'miloClear',leader:'Milo',id:'GYM_MILO',badge:'Grass Badge',puzzle:'miloGymTrainers',
     team:[['Gossifleur',19],['Eldegoss',20]],text:'Milo awarded the Grass Badge! You can now head for Hulbury.'});break;
   case'team-yell-route5':
    await markFight('yellRoute5','TEAM_YELL_ROUTE5','Team Yell Grunts',[['Zigzagoon-Galar',18],['Thievul',19]],'Team Yell retreated. The road to Hulbury is clear.');break;
   case'nessa-town':await say('Nessa: I am the Water-type Gym Leader. Find me at Hulbury Stadium.');break;
   case'nessa-gym':
    await gym({gate:'miloClear',flag:'nessaClear',leader:'Nessa',id:'GYM_NESSA',badge:'Water Badge',puzzle:'nessaGymTrainers',
     team:[['Goldeen',22],['Arrokuda',23],['Drednaw',24]],text:'Nessa awarded the Water Badge! Galar Mine No. 2 is next.'});break;
   case'bede-mine2':
    if(!s().nessaClear){await say('Bede: Win against Nessa before you challenge me.');break;}
    await markFight('mine2Clear','BEDE_MINE2','Bede',[['Solosis',22],['Gothita',23],['Hattrem',24]],'Bede was defeated again. Return to Motostoke for Kabu’s Gym.');break;
   case'kabu-outskirts':
    if(!s().mine2Clear){await say('Kabu: Return after exploring Galar Mine No. 2.');break;}
    await say('Kabu: My Fire-type Gym Challenge awaits at Motostoke Stadium.');break;
   case'kabu-gym':
    await gym({gate:'mine2Clear',flag:'kabuClear',leader:'Kabu',id:'GYM_KABU',badge:'Fire Badge',puzzle:'kabuGymTrainers',
     team:[['Ninetales',25],['Arcanine',25],['Centiskorch',27]],text:'Kabu awarded the Fire Badge! Three Galar Gym Badges earned. Hammerlocke awaits!'});break;
   case'travel-home':
    if(!await env.confirm('Return to Sinnoh’s Fight Area?'))break;
    s().resume={...p().location};
    if(R.owns(p().flags.lastCenter))s().lastCenter=p().flags.lastCenter;
    if(s().returnCenter)p().flags.lastCenter=s().returnCenter;else delete p().flags.lastCenter;
    await env.teleport({...D.return});await save();await say('You returned to the Fight Area. Galar progress is saved.');break;
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
  const reason=R.allowed(p(),p().location.map);
  if(reason)return{type:'trigger',map:p().location.map,trigger:{script:'swsh:gate'}};
  s().lastSafe={...p().location};return null;
 }
 async function guide(){await say('Galar · Sword & Shield combined\nBadges: '+s().badges.length+'/8\nLevel cap: '+R.cap(p()));await say(goal());}
 return{run,step,guide,goal,visible:()=>undefined};
}
window.GalarStory={create};
})();
