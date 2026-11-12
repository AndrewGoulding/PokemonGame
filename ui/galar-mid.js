// Combined Sword/Shield Gym Challenge from Hammerlocke through Raihan.
(function(){
'use strict';
function create(env,shared){
 const R=Galar,p=()=>env.player(),s=()=>R.state(p()),say=env.say,save=env.saveCheckpoint,battle=shared.battle;
 async function fight(flag,id,name,roster,winText){
  if(s()[flag]){await say(name+': We have already battled.');return true;}
  if(await battle(id,name,roster)!=='won')return false;
  s()[flag]=true;await save();await say(winText);return true;
 }
 async function badge(flag,label,requires,trainers,bosses,dialogue){
  if(!s()[requires]){await say('Complete the earlier Gym Challenge before entering this stadium.');return;}
  if(s()[flag]){await say('You already earned the '+label+'.');return;}
  const stage=flag+'Trainers';s()[stage]||(s()[stage]=[]);
  for(let i=0;i<trainers.length;i++){
   if(s()[stage].includes(i))continue;
   if(await battle('MID_'+flag.toUpperCase()+'_TRAINER_'+i,'Gym Challenger',trainers[i])!=='won')return;
   s()[stage].push(i);await save();
  }
  for(const [key,id,name,mons] of bosses){
   if(!await fight(key,id,name,mons,name+': You passed my challenge!'))return;
  }
  if(!s().badges.includes(label))s().badges.push(label);
  s()[flag]=true;await save();await say(dialogue);
 }
 function goal(){
  const f=s();return !f.kabuClear?'Earn Kabu’s Fire Badge in Motostoke first.':
   !f.hopHammerlocke?'Meet Hop at Hammerlocke.':
   !f.yellRoute6?'Defeat Team Yell on Route 6.':
   !f.stowClear?'Complete both Bea’s and Allister’s Stow-on-Side battles.':
   !f.bedeStow?'Battle Bede at Stow-on-Side Outskirts.':
   !f.opalClear?'Earn Opal’s Fairy Badge in Ballonlea.':
   !f.hopRoute7?'Battle Hop on Route 7.':
   !f.circhesterClear?'Complete both Gordie’s and Melony’s Circhester battles.':
   !f.yellRoute9?'Stop Team Yell on Route 9.':
   !f.marnieSpikemuth?'Battle Marnie in Spikemuth.':
   !f.piersClear?'Earn Piers’s Dark Badge.':
   !f.raihanClear?'Defeat Raihan at Hammerlocke Stadium.':
   'All eight Galar Gym Badges earned! Wyndon and the Champion Cup are next.';
 }
 async function run(key){
  switch(key){
   case'wild-north-guide':await say('The northern Wild Area leads to Hammerlocke. Larger Pokémon roam these fields.');break;
   case'hop-hammerlocke':
    if(!s().kabuClear){await say('Hop: Beat Kabu in Motostoke first!');break;}
    await fight('hopHammerlocke','HOP_HAMMERLOCKE','Hop',[['Dubwool',28],[R.rivalSpecies(p()),29],['Corvisquire',28]],'Hop: On to Route 6!');break;
   case'rose-hammerlocke':await say('Chairman Rose: Hammerlocke is powered by an ancient energy source. Keep progressing in the Gym Challenge.');break;
   case'team-yell-route6':
    await fight('yellRoute6','TEAM_YELL_ROUTE6','Team Yell Grunts',[['Linoone-Galar',30],['Thievul',31]],'Team Yell fled toward Stow-on-Side.');break;
   case'sonia-stow':await say('Sonia: The mural tells a story of two legendary heroes. Something about the Darkest Day still troubles me.');break;
   case'stow-gym':
    await badge('stowClear','Stow-on-Side Badge','yellRoute6',
     [[['Machoke',32]],[['Haunter',32]]],
     [['beaWon','GYM_BEA','Bea',[['Hitmontop',34],['Pangoro',34],['Machamp',36]]],
      ['allisterWon','GYM_ALLISTER','Allister',[['Yamask-Galar',34],['Cursola',35],['Gengar',36]]]],
     'You earned the Stow-on-Side Badge after clearing both Sword and Shield leaders!');break;
   case'bede-stow':
    if(!s().stowClear){await say('Bede: Finish the Stow-on-Side Gym Challenge first.');break;}
    await fight('bedeStow','BEDE_STOW','Bede',[['Duosion',34],['Hattrem',35],['Ponyta-Galar',35]],'Bede: I have unfinished business in Ballonlea.');break;
   case'glimwood-trainer':await fight('glimwoodTrainer','GLIMWOOD_TRAINER','Glimwood Trainer',[['Morgrem',34],['Hattrem',35]],'The forest paths are clear.');break;
   case'opal-town':await say('Opal: My quiz will test your judgment. Visit Ballonlea Stadium.');break;
   case'opal-gym':
    await badge('opalClear','Fairy Badge','bedeStow',
     [[['Swirlix',36]],[['Mawile',36]],[['Togetic',37]]],
     [['opalWon','GYM_OPAL','Opal',[['Weezing-Galar',36],['Mawile',36],['Togekiss',37],['Alcremie',38]]]],
     'Opal awarded the Fairy Badge! Head east toward Circhester.');break;
   case'hop-route7':
    if(!s().opalClear){await say('Hop: Opal’s challenge comes first.');break;}
    await fight('hopRoute7','HOP_ROUTE7','Hop',[['Dubwool',37],['Corviknight',38],[R.rivalSpecies(p()),39]],'Hop: Onward to Circhester!');break;
   case'route8-trainer':await fight('route8Trainer','ROUTE8_TRAINER','Route 8 Trainer',[['Falinks',39],['Frosmoth',40]],'The snowy route opens toward Circhester.');break;
   case'sonia-circhester':await say('Sonia: The history of Galar’s ancient heroes is tied to Hammerlocke and the Darkest Day.');break;
   case'circhester-gym':
    await badge('circhesterClear','Circhester Badge','hopRoute7',
     [[['Boldore',40]],[['Vanillish',40]]],
     [['gordieWon','GYM_GORDIE','Gordie',[['Barbaracle',40],['Shuckle',40],['Stonjourner',41],['Coalossal',42]]],
      ['melonyWon','GYM_MELONY','Melony',[['Frosmoth',40],['Darmanitan-Galar',40],['Eiscue',41],['Lapras',42]]]],
     'The Rock and Ice leaders awarded the Circhester Badge!');break;
   case'team-yell-route9':
    if(!s().circhesterClear){await say('Team Yell: Go and finish the Circhester Gym first.');break;}
    await fight('yellRoute9','TEAM_YELL_ROUTE9','Team Yell Grunts',[['Liepard',42],['Scrafty',43]],'Team Yell withdrew from Route 9.');break;
   case'marnie-spikemuth':
    if(!s().yellRoute9){await say('Marnie: Team Yell is blocking Route 9.');break;}
    await fight('marnieSpikemuth','MARNIE_SPIKEMUTH','Marnie',[['Liepard',43],['Toxicroak',43],['Morpeko',44]],'Marnie: You can battle my brother Piers now!');break;
   case'piers-gym':
    await badge('piersClear','Dark Badge','marnieSpikemuth',
     [[['Linoone-Galar',44]],[['Thievul',44]]],
     [['piersWon','GYM_PIERS','Piers',[['Scrafty',44],['Malamar',45],['Skuntank',45],['Obstagoon',46]]]],
     'Piers awarded the Dark Badge! Return to Hammerlocke for Raihan.');break;
   case'hop-return':await say('Hop: Only Raihan’s Dragon Gym remains! Head through Hammerlocke Gate.');break;
   case'raihan-invite':await say('Raihan is waiting at Hammerlocke Stadium for your final Gym Challenge.');break;
   case'raihan-gym':
    await badge('raihanClear','Dragon Badge','piersClear',
     [[['Sandaconda',45],['Pelipper',45]],[['Hippowdon',46],['Torkoal',46]]],
     [['raihanWon','GYM_RAIHAN','Raihan',[['Gigalith',46],['Flygon',47],['Sandaconda',46],['Duraludon',48]]]],
     'Raihan awarded the Dragon Badge! You earned all eight Galar Gym Badges!');break;
   default:return false;
  }return true;
 }
 return{run,goal};
}
window.GalarMidStory={create};
})();
