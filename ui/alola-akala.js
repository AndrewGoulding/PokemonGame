// Native Akala story scenes for the single merged Ultra Sun / Ultra Moon campaign.
(function(){
'use strict';
function create(env,shared){
 const R=Alola,A=AlolaAkala,p=()=>env.player(),s=()=>R.state(p()),say=env.say,save=env.saveCheckpoint;
 const fight=shared.fight;
 const gift=async(key,id,done,text)=>{
  const r=R.gift(p(),key,id);
  if(r.full){await say('Make room in your Bag, then talk to this character again.');return false;}
  s()[done]=true;await save();await say(text);return true;
 };
 const opponent=(species,level)=>Party.create(species,level);
 async function battle(key,name,mons){
  const result=await fight(key,name,mons.map(([species,level])=>opponent(species,level)));
  return result==='won';
 }
 const goal=()=>{
  const f=s();
  return !f.halaClear?'Complete the grand trial on Melemele before sailing to Akala.':
   !f.hauAkala?'Battle Hau at Heahea City harbor.':
   !f.hauPaniola?'Head through Route 4 and meet Hau in Paniola.':
   !f.gladion5?'Battle Gladion on Route 5.':
   !f.lanaClear?'Complete Lana’s Brooklet Hill trial.':
   !f.skullRoute6?'Stop Team Skull on Route 6.':
   !f.royalDone?'Visit the Battle Royal Dome in Royal Avenue.':
   !f.kiaweClear?'Complete Kiawe’s Wela Volcano trial.':
   !f.reconRoute8?'Meet the Ultra Recon Squad on Route 8.':
   !f.mallowClear?'Complete Mallow’s Lush Jungle trial.':
   !f.oliviaMet?'Meet Olivia in Konikoni City.':
   !f.plumeriaWon?'Defeat Plumeria at Memorial Hill.':
   !f.oliviaClear?'Battle Kahuna Olivia at the Ruins of Life.':
   'Akala’s grand trial is complete! Ula’ula Island awaits.';
 };
 async function run(key){
  switch(key){
   case'akala-ferry':{
    if(!s().halaClear){await say('The ferry to Akala departs after Hala’s grand trial.');break;}
    if(!await env.confirm('Board the ferry to Akala Island?'))break;
    if(!s().akalaArrived){s().akalaArrived=true;s().melemeleCenter=p().flags.lastCenter||'AlolaHauoliCenter';}
    p().flags.lastCenter=s().akalaCenter||'AlolaHeaheaCenter';
    await env.teleport({...s().akalaResume||R.data().akala.start});await save();
    await say('The ferry arrives in Heahea City. Welcome to Akala Island!');break;
   }
   case'melemele-ferry':{
    if(!await env.confirm('Take the ferry back to Melemele Island?'))break;
    s().akalaResume={...p().location};
    if(A.owns(p().flags.lastCenter))s().akalaCenter=p().flags.lastCenter;
    p().flags.lastCenter=s().melemeleCenter||'AlolaHauoliCenter';
    await env.teleport({...R.data().akala.return});await save();
    await say('You arrived at Hau’oli City. Your Akala progress is saved.');break;
   }
   case'hau-akala':
    if(s().hauAkala){await say('Hau: Paniola is the next stop! Look out for the Ultra Recon Squad.');break;}
    if(!await battle('HAU_AKALA','Hau',[['Pikachu',15],[R.rivalSpecies(p()),16]]))break;
    s().hauAkala=true;await save();await say('Hau: Route 4 leads to Paniola Town!');break;
   case'recon-heahea':
    if(!s().reconHeahea){s().reconHeahea=true;await save();await say('Ultra Recon Squad: We study the light of Alola and the mysterious Necrozma. We have much to learn.');}
    else await say('Ultra Recon Squad: Our investigation will continue on Route 8.');break;
   case'hotel':
    if(!s().reconHeahea)await say('A pair of strange researchers has been spotted in Heahea City.');
    else await say('The Tide Song Hotel offers a quiet place to rest between trials.');
    break;
   case'akala-heal':
    p().party.forEach(Party.heal);
    p().flags.lastCenter=p().location.map;s().lastCenter=p().location.map;s().akalaCenter=p().location.map;
    await save();await say('Your Pokémon are fully healed!');break;
   case'akala-mart':await env.mart(['poke-ball','great-ball','potion','super-potion','antidote','paralyze-heal','repel','revive']);break;
   case'route4-trainer':
    if(s().route4Trainer){await say('You have the makings of an island champion!');break;}
    if(await battle('ROUTE4_TRAINER','Akala Rising Star',[['Mudbray',13],['Lillipup',14]])){s().route4Trainer=true;await save();}
    break;
   case'hau-paniola':
    if(s().hauPaniola){await say('Hau: Check out the ranch, then head to Route 5!');break;}
    if(!await battle('HAU_PANIOLA','Hau',[['Pikachu',16],[R.rivalSpecies(p()),17]]))break;
    s().hauPaniola=true;await save();await say('Hau: Paniola Ranch is ahead. Ride Pokémon live here!');break;
   case'ranch-miltank':
    if(!s().ranchVisited){s().ranchVisited=true;await save();}
    p().party.forEach(Party.heal);await say('The rancher’s Miltank restores your team. Tauros and Mudbray roam nearby.');break;
   case'gladion-route5':
    if(s().gladion5){await say('Gladion: Try not to get in my way.');break;}
    if(!await battle('GLADION_ROUTE5','Gladion',[['Zubat',17],['Type: Null',18]]))break;
    s().gladion5=true;await save();await say('Gladion: Your Pokémon fight as a team. Lana awaits at Brooklet Hill.');break;
   case'lana-invite':
    if(!s().gladion5){await say('Lana: Gladion is looking for a battle nearby.');break;}
    s().lanaInvited=true;await save();await say('Lana: Strange splashes have appeared in Brooklet Hill’s pools. Will you help me investigate?');break;
   case'lana-brief':
    if(!s().lanaInvited){await say('Lana is waiting for you on Route 5.');break;}
    if(s().lanaClear){await say('Lana: My trial is complete. Royal Avenue is south of Paniola Ranch.');break;}
    await say('Lana: Investigate both splashes at Brooklet Hill, then follow me to the final pool.');break;
   case'brooklet-splash-0':case'brooklet-splash-1':{
    if(!s().lanaInvited){await say('Speak to Lana on Route 5 first.');break;}
    if(s().lanaClear){await say('The brook is calm again.');break;}
    const i=+key.slice(-1);s().brookletSpots||(s().brookletSpots=[]);
    if(s().brookletSpots.includes(i)){await say('This pool is calm now.');break;}
    const result=await env.wildEncounter(opponent(i?'Dewpider':'Wishiwashi',17+i),{noCatch:true,noBlackout:true});
    if(result==='won'){s().brookletSpots.push(i);await save();await say('The splash moved downstream!');}
    else await say('The ripples remain. Try again.');break;
   }
   case'lana-totem':
    if(s().lanaClear){await say('Totem Araquanid has already been defeated.');break;}
    if((s().brookletSpots||[]).length<2){await say('Two splash locations remain to be investigated on Brooklet Hill.');break;}
    if(!s().lanaTotemWon){
     if(!await battle('TOTEM_ARAQUANID','Totem Araquanid',[['Araquanid',20],['Masquerain',18]]))break;
     s().lanaTotemWon=true;await save();
    }
    await gift('waterium-z','waterium-z','lanaClear','Lana awarded Waterium Z! Her trial is complete.');break;
   case'skull-route6':
    if(!s().lanaClear){await say('The road to Royal Avenue opens after Lana’s trial.');break;}
    if(s().skullRoute6){await say('The grunts have left Route 6.');break;}
    if(!await battle('SKULL_ROUTE6','Team Skull Grunt',[['Drowzee',17],['Rattata-Alola',17]]))break;
    s().skullRoute6=true;await save();await say('Team Skull ran away. The road to Royal Avenue is clear.');break;
   case'masked-royal':
    await say('Masked Royal: At the Battle Royal Dome, four trainers battle together! This offline exhibition uses a standard trainer battle.');break;
   case'royal-stage':
    if(s().royalDone){await say('Masked Royal: Your first Battle Royal exhibition is on record.');break;}
    if(!await battle('ROYAL_EXHIBITION','Masked Royal',[['Rockruff',19],['Incineroar',20]]))break;
    s().royalDone=true;await save();await say('The crowd cheers! Kiawe is waiting at Wela Volcano Park.');break;
   case'kiawe-invite':
    if(!s().royalDone){await say('Kiawe: Try the Battle Royal exhibition first.');break;}
    s().kiaweInvited=true;await save();await say('Kiawe: Come to Wela Volcano for my dance trial. Watch closely.');break;
   case'kiawe-brief':
    if(!s().kiaweInvited){await say('Meet Kiawe on Route 7 first.');break;}
    if(s().kiaweClear){await say('Kiawe: My trial is complete. Visit Route 8 for Mallow’s challenge.');break;}
    await say('Kiawe: Two dances hide unusual Pokémon. Face them both before the Totem challenge.');break;
   case'kiawe-dance-0':case'kiawe-dance-1':{
    if(!s().kiaweInvited){await say('Talk to Kiawe by the Volcano entrance first.');break;}
    if(s().kiaweClear){await say('The dancers are resting.');break;}
    const i=+key.slice(-1);s().kiaweDances||(s().kiaweDances=[]);
    if(s().kiaweDances.includes(i)){await say('You already found the change in this dance.');break;}
    if(!await battle('KIAWE_DANCE_'+i,'Volcano Dancer',[[i?'Marowak-Alola':'Salandit',19+i]]))break;
    s().kiaweDances.push(i);await save();await say('You spotted the odd Pokémon in the dance!');break;
   }
   case'kiawe-totem':
    if(s().kiaweClear){await say('Totem Alolan Marowak has already been defeated.');break;}
    if((s().kiaweDances||[]).length<2){await say('Complete both dance challenges before the Totem appears.');break;}
    if(!s().kiaweTotemWon){
     if(!await battle('TOTEM_MAROWAK','Totem Marowak',[['Marowak-Alola',22],['Salazzle',20]]))break;
     s().kiaweTotemWon=true;await save();
    }
    await gift('firium-z','firium-z','kiaweClear','Kiawe awarded Firium Z! The fire trial is complete.');break;
   case'recon-route8':
    if(!s().kiaweClear){await say('The Ultra Recon Squad will meet you after Kiawe’s trial.');break;}
    if(s().reconRoute8){await say('Ultra Recon Squad: We will continue investigating Necrozma’s light.');break;}
    if(!await battle('RECON_ROUTE8','Ultra Recon Squad',[['Furfrou',22]]))break;
    s().reconRoute8=true;await save();await say('Ultra Recon Squad: Your Pokémon are powerful. Necrozma is connected to Alola’s light.');break;
   case'mallow-invite':
    if(!s().reconRoute8){await say('Mallow: The strange researchers on Route 8 want a word with you.');break;}
    s().mallowInvited=true;await save();await say('Mallow: Come gather ingredients in Lush Jungle for my trial recipe!');break;
   case'mallow-brief':
    if(!s().mallowInvited){await say('Speak to Mallow on Route 8 first.');break;}
    if(s().mallowClear){await say('Mallow: The jungle’s Totem has been calmed. See Olivia in Konikoni City.');break;}
    await say('Mallow: Find four ingredients around the jungle before I can cook the special meal.');break;
   case'ingredient-0':case'ingredient-1':case'ingredient-2':case'ingredient-3':{
    if(!s().mallowInvited){await say('Mallow needs to explain the recipe first.');break;}
    const i=+key.slice(-1),ingredients=['Mago Berry','Tiny Mushroom','Revival Herb','Miracle Seed'];
    s().ingredients||(s().ingredients=[]);
    if(s().ingredients.includes(i)){await say('You already found this ingredient.');break;}
    s().ingredients.push(i);await save();await say('You collected '+ingredients[i]+' for Mallow’s trial recipe.');break;
   }
   case'mallow-totem':
    if(s().mallowClear){await say('Totem Lurantis is already at peace.');break;}
    if((s().ingredients||[]).length<4){await say('Find all four ingredients before Mallow prepares the special recipe.');break;}
    if(!s().mallowTotemWon){
     if(!await battle('TOTEM_LURANTIS','Totem Lurantis',[['Lurantis',24],['Castform',22]]))break;
     s().mallowTotemWon=true;await save();
    }
    await gift('grassium-z','grassium-z','mallowClear','Mallow awarded Grassium Z! Her trial is complete.');break;
   case'olivia-konikoni':
    if(!s().mallowClear){await say('Olivia: Finish the three Akala trials first.');break;}
    if(s().oliviaMet){await say('Olivia: Meet me in the Ruins of Life, past Memorial Hill.');break;}
    s().oliviaMet=true;await save();await say('Olivia: Congratulations on your trials! Meet me beyond Memorial Hill for the Grand Trial.');break;
   case'plumeria':
    if(!s().oliviaMet){await say('Olivia can be found in Konikoni City.');break;}
    if(s().plumeriaWon){await say('Team Skull has left Memorial Hill.');break;}
    if(!await battle('PLUMERIA','Team Skull Admin Plumeria',[['Golbat',25],['Salazzle',26]]))break;
    s().plumeriaWon=true;await save();await say('Plumeria: You got past us this time. The ruins are ahead.');break;
   case'olivia-grand':
    if(!s().plumeriaWon){await say('Plumeria is blocking Memorial Hill.');break;}
    if(s().oliviaClear){await say('Olivia: You completed the Akala Grand Trial! Ula’ula awaits.');break;}
    if(!s().oliviaWon){
     if(!await battle('OLIVIA','Island Kahuna Olivia',[['Nosepass',26],['Boldore',26],['Lycanroc',27]]))break;
     s().oliviaWon=true;await save();
    }
    await gift('rockium-z','rockium-z','oliviaClear','Olivia awarded Rockium Z! The Akala Island Grand Trial is complete.');break;
   default:return false;
  }
  return true;
 }
 return{run,goal};
}
window.AlolaAkalaStory={create};
})();