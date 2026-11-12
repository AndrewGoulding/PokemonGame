// Hidden Treasure of Area Zero: Teal Mask, Indigo Disk and Mochi Mayhem.
// Native battle/story adaptation; DLC state persists in player.flags.paldea.
(function(){
'use strict';
const LOYAL=[['Okidogi',70],['Munkidori',70],['Fezandipiti',70]];
const ELITE={
 'indigo-crispin':{key:'crispin',name:'Crispin',team:[['Talonflame',75],['Rotom-Heat',75],['Magmortar',76],['Blaziken',77]]},
 'indigo-lacey':{key:'lacey',name:'Lacey',team:[['Whimsicott',75],['Alcremie',75],['Granbull',76],['Primarina',77]]},
 'indigo-amarys':{key:'amarys',name:'Amarys',team:[['Skarmory',75],['Dugtrio-Alola',75],['Metagross',76],['Archaludon',77]]},
 'indigo-drayton':{key:'drayton',name:'Drayton',team:[['Flygon',75],['Kingdra',75],['Dragonite',76],['Haxorus',77]]}
};
function create(env,{fight}){
 const p=()=>env.player(),s=()=>Paldea.state(p()),say=env.say,save=env.saveCheckpoint;
 async function doubleFight(flag,id,name,team,after){
  if(s()[flag]){await say(name+': You have already won this battle.');return true;}
  if(!env.canBattle()){await say('Bring healthy Pokémon before battling.');return false;}
  const result=await env.battle('trainer',{
   foe:{name,team:team.map(([species,level])=>Party.create(species,level))},
   trainerId:'SV_'+id,double:true,noBlackout:true
  });
  env.showWorld();await env.resume();
  if(result!=='won'){await say('You can retry this Blueberry League battle.');return false;}
  s()[flag]=true;await save();await say(after);return true;
 }
 async function capture(flag,species,level,description){
  if(s()[flag]){await say(species+' has already joined your collection.');return;}
  if(!env.canBattle()){await say('Bring a healthy Pokémon to challenge '+species+'.');return;}
  if(!env.wildEncounter){await say('Wild capture is unavailable right now.');return;}
  const outcome=await env.wildEncounter(Party.create(species,level),{
   music:'mus_vs_legend',noBlackout:true,noGimmicks:true
  });
  if(outcome!=='caught'){await say(species+' can be challenged again until it is caught.');return;}
  s()[flag]=true;await save();await say(description);
 }
 async function run(key){
  switch(key){
   case'teal-briar':
    if(!s().paldeaClear){await say('Briar: Finish The Way Home before joining the Kitakami school trip.');return true;}
    if(!s().tealArrival){s().tealArrival=true;await save();}
    await say('Briar: Welcome to Kitakami! Meet Carmine and Kieran in Mossui Town.');return true;
   case'teal-carmine':
    if(!s().tealArrival){await say('Talk with Briar at the bus stop first.');return true;}
    await fight('tealCarmineClear','TEAL_CARMINE_1','Carmine',
     [['Poochyena',60],['Vulpix',60],['Poltchageist',61]],
     'Carmine: Not bad! Explore Kitakami and meet my brother Kieran.');return true;
   case'teal-kieran':
    if(!s().tealCarmineClear){await say('Kieran: My sister Carmine is waiting back in Mossui Town.');return true;}
    await fight('tealKieranFirst','TEAL_KIERAN_1','Kieran',
     [['Yanma',61],['Dipplin',62]],'Kieran: See you at the Festival of Masks!');return true;
   case'teal-festival':
    if(!s().tealCarmineClear||!s().tealKieranFirst){await say('Meet Carmine and battle Kieran before the festival.');return true;}
    if(!s().tealFestival){s().tealFestival=true;await save();}
    await say('Festival of Masks! The legend of Ogerpon and the Loyal Three comes to life. Seek the three Pokémon across Kitakami.');return true;
   case'teal-kieran-final':
    if(!s().tealLoyalThree){await say('Return after finding Okidogi, Munkidori and Fezandipiti.');return true;}
    await fight('tealKieranFinal','TEAL_KIERAN_FINAL','Kieran',
     [['Yanmega',70],['Shiftry',70],['Gliscor',70],['Dipplin',72]],
     'Kieran: You may approach Ogerpon. Take care of it!');return true;
   case'teal-ogerpon':
    if(!s().tealKieranFinal){await say('Battle Kieran at Dreaded Den before approaching Ogerpon.');return true;}
    if(s().tealClear){await say('The Teal Mask is complete. Blueberry Academy awaits!');return true;}
    await capture('tealOgerponCaught','Ogerpon',70,
     'You caught Ogerpon! Its story is safe with you.');
    if(s().tealOgerponCaught&&!s().tealClear){s().tealClear=true;await save();await say('The Teal Mask complete! Return to the academy for The Indigo Disk.');}
    return true;
   case'teal-heal':
    p().party.forEach(Party.heal);p().flags.lastCenter=p().location.map;s().lastCenter=p().location.map;
    await save();await say('Your party is fully healed at the Kitakami Community Center!');return true;
   case'indigo-briar':
    if(!s().tealClear){await say('Briar: Complete your Kitakami school trip before visiting Blueberry Academy.');return true;}
    if(!s().indigoArrival){s().indigoArrival=true;await save();}
    await say('Briar: Welcome to Blueberry Academy! Explore the Terarium and meet the BB League Club.');return true;
   case'indigo-guide':
    await say('The Terarium has four biomes. Challenge the Blueberry Elite Four with double battles!');return true;
   case'indigo-club':
    if(!s().indigoArrival){await say('Meet Briar at the Blueberry Academy dock first.');return true;}
    if(!s().indigoEnrollment){s().indigoEnrollment=true;await save();}
    await say('You joined the BB League Club! Defeat Crispin, Lacey, Amarys and Drayton.');return true;
   case'indigo-kieran':
    if(!s().indigoEliteClear){await say('Defeat all four Blueberry Elite Four members before challenging Champion Kieran.');return true;}
    if(await doubleFight('indigoKieranClear','INDIGO_KIERAN','BB League Champion Kieran',
     [['Dragonite',79],['Porygon-Z',79],['Politoed',79],['Grimmsnarl',79],['Hydrapple',80]],
     'Kieran: You are the new BB League Champion. Briar wants to return to Area Zero!')){
     if(!s().indigoChampion){s().indigoChampion=true;await save();}
    }
    return true;
   case'indigo-depths':
    if(!s().indigoKieranClear){await say('Win the BB League Champion match before heading to the Underdepths.');return true;}
    await fight('indigoUnderdepthsClear','INDIGO_UNDERDEPTHS','Underdepths Guardian',
     [['Glimmora',79],['Iron Crown',80]],
     'Briar: The path to Terapagos is open. Let us continue!');
    return true;
   case'indigo-terapagos':
    if(!s().indigoUnderdepthsClear){await say('Explore the Underdepths before approaching Terapagos.');return true;}
    if(s().indigoClear){await say('The Indigo Disk is complete! Terapagos is already in your collection.');return true;}
    await capture('indigoTerapagosCaught','Terapagos',85,
     'You caught Terapagos, the Hidden Treasure of Area Zero!');
    if(s().indigoTerapagosCaught&&!s().indigoClear){s().indigoClear=true;s().hiddenTreasureClear=true;await save();
     await say('The Indigo Disk complete! Return to Mossui Town to investigate a mysterious mochi.');}
    return true;
   case'teal-epilogue':
    if(!s().indigoClear){await say('A mysterious mochi awaits after the Indigo Disk.');return true;}
    if(s().mochiMayhemClear){await say('Mochi Mayhem is complete. Pecharunt is in your collection!');return true;}
    await capture('pecharuntCaught','Pecharunt',88,
     'You caught Pecharunt and restored peace to Kitakami!');
    if(s().pecharuntCaught){s().mochiMayhemClear=true;await save();await say('Mochi Mayhem is complete!');}
    return true;
   default:break;
  }
  let m=/^teal-loyal-([0-2])$/.exec(key);
  if(m){
   if(!s().tealFestival){await say('Attend the Festival of Masks before pursuing the Loyal Three.');return true;}
   const i=+m[1],[species,level]=LOYAL[i];
   await fight('tealLoyal'+i,'TEAL_LOYAL_'+i,'Loyal Three '+species,
    [[species,level]],species+' has retreated! '+(i+1)+'/3 clues investigated.');
   if([0,1,2].every(n=>s()['tealLoyal'+n])&&!s().tealLoyalThree){
    s().tealLoyalThree=true;await save();await say('All three of the Loyal Three have been defeated. Head to Dreaded Den!');
   }
   return true;
  }
  const elite=ELITE[key];
  if(elite){
   if(!s().indigoEnrollment){await say('Register at the Blueberry League Club first.');return true;}
   if(await doubleFight('indigoElite'+elite.key, 'INDIGO_ELITE_'+elite.key.toUpperCase(),
    'BB Elite Four '+elite.name,elite.team,
    elite.name+': Congratulations on winning the BB League Elite Four match!')){
    if(Object.values(ELITE).every(e=>s()['indigoElite'+e.key])&&!s().indigoEliteClear){
     s().indigoEliteClear=true;await save();await say('All four BB Elite Four defeated! Kieran awaits at the Champion arena.');
    }
   }
   return true;
  }
  return false;
 }
 return{run};
}
window.PaldeaDlcStory={create};
})();