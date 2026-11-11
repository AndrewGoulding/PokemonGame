// Unified Ultra Sun / Ultra Moon League and postgame adaptation.
(function(){
'use strict';
function create(env,{fight}){
 const R=Alola,p=()=>env.player(),s=()=>R.state(p()),say=env.say,save=env.saveCheckpoint;
 const battle=async(id,name,roster)=>await fight(id,name,roster.map(([species,level])=>Party.create(species,level)))==='won';
 async function reward(key,item,count=1){
  const r=R.gift(p(),key,item,count);
  if(r.full){await say('Make room in your Bag and come back for your reward.');return false;}
  await save();return true;
 }
 const order=['eliteMolayneWon','eliteOliviaWon','eliteAcerolaWon','eliteKahiliWon'];
 const commanders=['rrArchieWon','rrMaxieWon','rrCyrusWon','rrGhetsisWon','rrLysandreWon'];
 const bosses={
  'elite-molayne':['eliteMolayneWon','ELITE_MOLAYNE','Elite Four Molayne',[['Klefki',56],['Bisharp',57],['Magnezone',57],['Metagross',58]]],
  'elite-olivia':['eliteOliviaWon','ELITE_OLIVIA','Elite Four Olivia',[['Armaldo',57],['Cradily',57],['Probopass',58],['Lycanroc',59]]],
  'elite-acerola':['eliteAcerolaWon','ELITE_ACEROLA','Elite Four Acerola',[['Banette',57],['Dhelmise',58],['Froslass',58],['Palossand',59]]],
  'elite-kahili':['eliteKahiliWon','ELITE_KAHILI','Elite Four Kahili',[['Braviary',57],['Hawlucha',58],['Oricorio',58],['Toucannon',59]]]
 };
 const rr={
  'rr-archie':['rrArchieWon',null,'RR_ARCHIE','Archie',[['Mightyena',65],['Crobat',66],['Sharpedo',67]]],
  'rr-maxie':['rrMaxieWon','rrArchieWon','RR_MAXIE','Maxie',[['Camerupt',66],['Crobat',66],['Weezing',67]]],
  'rr-cyrus':['rrCyrusWon','rrMaxieWon','RR_CYRUS','Cyrus',[['Honchkrow',67],['Weavile',68],['Crobat',68]]],
  'rr-ghetsis':['rrGhetsisWon','rrCyrusWon','RR_GHETSIS','Ghetsis',[['Cofagrigus',68],['Bisharp',68],['Hydreigon',70]]],
  'rr-lysandre':['rrLysandreWon','rrGhetsisWon','RR_LYSANDRE','Lysandre',[['Pyroar',69],['Honchkrow',69],['Gyarados',70]]]
 };
 const beasts=['Nihilego','Buzzwole','Pheromosa','Xurkitree','Celesteela','Kartana','Guzzlord'];
 function goal(){
  const f=s();
  if(!f.minaClear)return'Complete Mina’s final island trial on Poni first.';
  if(!f.championClear)return !f.lanakilaHau?'Sail from Seafolk Village and battle Hau on Mount Lanakila.':
   !f.leagueRegistered?'Register at the Alola Pokémon League.':
   !f.eliteMolayneWon?'Defeat Elite Four Molayne.':
   !f.eliteOliviaWon?'Defeat Elite Four Olivia.':
   !f.eliteAcerolaWon?'Defeat Elite Four Acerola.':
   !f.eliteKahiliWon?'Defeat Elite Four Kahili.':'Face Hau in the Champion chamber.';
  return !f.rrGiovanniWon?'Visit the postgame hub at Aether Paradise and investigate Team Rainbow Rocket.':
   (f.beastWins||[]).length<beasts.length?'Complete the Ultra Beast research encounters.':
   'Alola Champion! Continue Battle Tree streaks and optional rematches.';
 }
 async function run(key){
  if(bosses[key]){
   const [flag,id,name,mons]=bosses[key],index=order.indexOf(flag);
   if(!s().leagueRegistered||index>0&&!s()[order[index-1]]){await say('The previous Elite Four chamber must be cleared first.');return true;}
   if(s()[flag]){await say(name+': You already won this round. Continue to the next chamber.');return true;}
   if(await battle(id,name,mons)){s()[flag]=true;await save();await say(name+': Well fought! Continue through the League.');}
   return true;
  }
  if(rr[key]){
   const [flag,required,id,name,mons]=rr[key];
   if(!s().championClear){await say('Rainbow Rocket is a postgame challenge for the Alola Champion.');return true;}
   if(required&&!s()[required]){await say('Defeat the previous Rainbow Rocket commander first.');return true;}
   if(s()[flag]){await say(name+' has already been defeated.');return true;}
   if(await battle(id,'Team Rainbow Rocket '+name,mons)){s()[flag]=true;await save();await say(name+' retreated. Rainbow Rocket’s control is weakening!');}
   return true;
  }
  if(/^beast-[0-6]$/.test(key)){
   if(!s().championClear){await say('The Ultra Beast missions are available after the League.');return true;}
   const i=Number(key.slice(-1));s().beastWins||(s().beastWins=[]);
   if(s().beastWins.includes(i)){await say(beasts[i]+' has already been studied.');return true;}
   if(await battle('BEAST_'+i,'Ultra Beast '+beasts[i],[[beasts[i],65+i]])){
    s().beastWins.push(i);await save();await say('You completed the encounter with '+beasts[i]+'. Research '+s().beastWins.length+'/7.');}
   return true;
  }
  switch(key){
   case'league-ferry':
    if(!s().minaClear){await say('The Pokémon League opens once Mina’s trial is complete.');break;}
    if(!await env.confirm('Travel to Mount Lanakila?'))break;
    if(!s().leagueArrived){s().leagueArrived=true;s().poniCenter=AlolaPoni.owns(p().flags.lastCenter)?p().flags.lastCenter:'AlolaPoniCenter';}
    p().flags.lastCenter=s().leagueCenter||'AlolaLanakilaCenter';
    await env.teleport({...s().leagueResume||R.data().league.start});await save();await say('You arrived at the foot of Mount Lanakila!');break;
   case'league-exit':
    if(!await env.confirm('Return to Seafolk Village?'))break;
    s().leagueResume={...p().location};
    p().flags.lastCenter=s().poniCenter||'AlolaPoniCenter';
    await env.teleport({...R.data().league.return});await save();await say('You returned to Poni Island. Your League progress is saved.');break;
   case'league-heal':
    p().party.forEach(Party.heal);p().flags.lastCenter=p().location.map;
    s().leagueCenter=p().location.map;s().lastCenter=p().location.map;
    await save();await say('Your Pokémon are healed and ready for the League.');break;
   case'lanakila-guide':await say('Mount Lanakila leads to the newly established Alola Pokémon League. Hau wants one more battle before the summit.');break;
   case'lanakila-hau':
    if(s().lanakilaHau){await say('Hau: The League is at the top! I will meet you again.');break;}
    if(await battle('HAU_LANAKILA','Hau',[['Raichu-Alola',55],[R.rivalSpecies(p()),57],['Komala',55],['Noivern',56]])){
     s().lanakilaHau=true;await save();await say('Hau: Amazing battle! See you at the Pokémon League.');}break;
   case'lanakila-trainer':
    if(s().lanakilaTrainer){await say('You already defeated this mountain trainer.');break;}
    if(await battle('LANAKILA_TRAINER','Mount Lanakila Veteran',[['Absol',56],['Glalie',57]])){s().lanakilaTrainer=true;await save();}
    break;
   case'league-gate':await say(s().lanakilaHau?'The Alola Pokémon League stands ahead. Good luck!':'Battle Hau on the mountain before proceeding.');break;
   case'league-registration':
    if(!s().lanakilaHau){await say('You must defeat Hau on Mount Lanakila before entering.');break;}
    if(s().leagueRegistered&& !s().championClear){await say('Your League challenge is underway. Defeat each Elite Four member in order.');break;}
    if(s().championClear){
     if(!await env.confirm('Enter another Alola League title-defense challenge?'))break;
     for(const flag of [...order,'championWon'])delete s()[flag];
    }
    s().leagueRegistered=true;await save();
    await say('League challenge registered! Defeat Molayne, Olivia, Acerola, Kahili and finally Hau to become Champion.');break;
   case'champion-hau':
    if(!order.every(flag=>s()[flag])){await say('You must defeat the entire Elite Four first.');break;}
    if(s().championWon){await say('Hau: You are already the Alola Champion! Visit the Hall of Fame.');break;}
    if(!await battle('CHAMPION_HAU','Champion Challenger Hau',[['Raichu-Alola',59],['Noivern',59],['Crabominable',60],['Tauros',59],['Flareon',60],[R.rivalSpecies(p()),61]]))break;
    s().championWon=true;s().championClear=true;s().leagueTitles=(s().leagueTitles||0)+1;
    await save();await say('You defeated Hau! You are the Alola Pokémon Champion! Enter the Hall of Fame to celebrate.');break;
   case'league-hall':
    if(!s().championClear){await say('The Hall of Fame is reserved for the Champion.');break;}
    if(!s().hallOfFame){s().hallOfFame=true;await save();await say('Your Pokémon were entered into the Alola Hall of Fame. Congratulations, Champion!');}
    else await say('Hall of Fame: Alola Champion title defenses: '+(s().leagueTitles||1)+'.');
    if(!s().hallGift){if(await reward('league-hall-candies','rare-candy',5)){s().hallGift=true;await save();await say('You received five Rare Candies for your championship!');}}
    break;
   case'postgame-ferry':
    if(!s().championClear){await say('The postgame expedition hub opens after you become Champion.');break;}
    if(!await env.confirm('Travel to the postgame expedition hub?'))break;
    await env.teleport({...s().postgameResume||R.data().league.postgameStart});await save();await say('Welcome to the Alola postgame expedition hub!');break;
   case'postgame-exit':
    if(!await env.confirm('Return to Aether Paradise?'))break;
    s().postgameResume={...p().location};
    await env.teleport({...R.data().league.postgameReturn});await save();await say('Your postgame progress is saved.');break;
   case'postgame-guide':
    await say('Champion activities: challenge the Battle Tree, stop Team Rainbow Rocket, or investigate seven Ultra Beasts at the Research Station.');break;
   case'battle-tree':{
    if(!s().championClear){await say('Only Champions can challenge the Battle Tree.');break;}
    if(!env.canBattle()){await say('You need a healthy Pokémon for the Battle Tree.');break;}
    const streak=s().battleTreeStreak||0,index=streak%4;
    const opponents=[
     ['Battle Tree Ace',[['Lucario',65],['Milotic',65]]],
     ['Battle Tree Veteran',[['Garchomp',67],['Magnezone',67]]],
     ['Battle Tree Expert',[['Salamence',69],['Gengar',69]]],
     ['Battle Tree Legend Red',[['Pikachu',72],['Charizard',72],['Snorlax',71]]]
    ];
    const [name,team]=opponents[index];
    if(!await battle('BATTLE_TREE_'+streak,name,team)){
     s().battleTreeBest=Math.max(s().battleTreeBest||0,streak);s().battleTreeStreak=0;
     await save();await say('Battle Tree streak ended at '+streak+' wins. Best: '+s().battleTreeBest+'.');break;
    }
    s().battleTreeStreak=streak+1;s().battleTreeTotal=(s().battleTreeTotal||0)+1;
    s().battleTreeBest=Math.max(s().battleTreeBest||0,s().battleTreeStreak);
    await save();await say('Battle Tree win! Current streak: '+s().battleTreeStreak+'. Best: '+s().battleTreeBest+'.');
    if(s().battleTreeStreak%4===0){
     const n=s().battleTreeStreak,r=R.gift(p(),'battle-tree-'+n,'rare-candy',2);
     if(!r.full){await save();await say('Four-win streak reward: two Rare Candies!');}
     else await say('Your Bag is full. The streak is saved; no candy was awarded.');
    }
    break;
   }
   case'rr-giovanni':
    if(!commanders.every(flag=>s()[flag])){await say('Defeat all five Rainbow Rocket commanders to reach Giovanni.');break;}
    if(s().rrGiovanniWon){await say('Giovanni has been driven from Aether Paradise.');break;}
    if(!await battle('RR_GIOVANNI','Team Rainbow Rocket Giovanni',[['Nidoking',72],['Nidoqueen',72],['Rhyperior',73],['Mewtwo',75]]))break;
    s().rrGiovanniWon=true;await save();await say('Team Rainbow Rocket was defeated! Alola is safe again.');break;
   case'beast-researcher':
    await say('Ultra Beast research: '+(s().beastWins||[]).length+'/7 encounters complete.');
    if((s().beastWins||[]).length===7&&!s().beastReward){
     if(await reward('ultra-beast-research-reward','rare-candy',7)){s().beastReward=true;await save();await say('Research reward: seven Rare Candies!');}
    }
    break;
   default:return false;
  }
  return true;
 }
 return{run,goal};
}
window.AlolaLeagueStory={create};
})();
