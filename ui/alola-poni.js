// Aether Paradise and Poni Island: one Ultra Sun / Ultra Moon story.
(function(){
'use strict';
function create(env,{fight}){
 const R=Alola,p=()=>env.player(),s=()=>R.state(p()),say=env.say,save=env.saveCheckpoint;
 const battle=async(id,name,party)=>await fight(id,name,party.map(([species,level])=>Party.create(species,level)))==='won';
 async function gift(key,id,flag,message){
  const r=R.gift(p(),key,id);
  if(r.full){await say('Make room in your Bag, then come back for the reward.');return;}
  s()[flag]=true;await save();await say(message);
 }
 function goal(){
  const f=s();return !f.nanuClear?'Defeat Nanu on Ula’ula Island first.':
   !f.aetherGrunts?'Travel to Aether Paradise from Malie City and stop Team Skull.':
   !f.lusamineClear?'Challenge Lusamine at the Aether Paradise laboratory.':
   !f.lilliePoni?'Travel to Seafolk Village and meet Lillie.':
   !f.hapuMet?'Meet Hapu in Poni Wilds.':
   !f.hapuClear?'Challenge Hapu on Ancient Poni Path.':
   !f.canyonClear?'Cross Vast Poni Canyon.':
   !f.dragonClear?'Complete the Dragon Trial.':
   !f.altarOpened?'Meet Lillie at the altar.':
   !f.necrozmaClear?'Defeat Ultra Necrozma in Ultra Space.':
   !f.minaClear?'Complete Mina’s petal trial and Totem Ribombee.':
   'Poni Island is complete! The Pokémon League awaits.';
 }
 async function run(key){
  switch(key){
   case'aether-ferry':
    if(!s().nanuClear){await say('Finish Kahuna Nanu’s grand trial before visiting Aether Paradise.');break;}
    if(!await env.confirm('Travel to Aether Paradise?'))break;
    if(!s().aetherArrived){s().aetherArrived=true;s().ulaulaCenter=AlolaUlaula.owns(p().flags.lastCenter)?p().flags.lastCenter:'AlolaMalieCenter';}
    await env.teleport({...s().aetherResume||R.data().poni.aetherStart});
    await save();await say('You arrived at Aether Paradise. Lillie needs your help!');break;
   case'aether-return':
    if(!await env.confirm('Return to Malie City?'))break;
    s().aetherResume={...p().location};
    p().flags.lastCenter=s().ulaulaCenter||'AlolaMalieCenter';
    await env.teleport({...R.data().poni.aetherReturn});await save();await say('You returned to Malie City.');break;
   case'poni-ferry':
    if(!s().lusamineClear){await say('Rescue Lillie at Aether Paradise before sailing to Poni Island.');break;}
    if(!await env.confirm('Sail to Poni Island?'))break;
    if(!s().poniArrived){s().poniArrived=true;s().aetherResume={...p().location};}
    p().flags.lastCenter=s().poniCenter||'AlolaPoniCenter';
    await env.teleport({...s().poniResume||R.data().poni.start});
    await save();await say('Welcome to Seafolk Village on Poni Island!');break;
   case'poni-return-ferry':
    if(!await env.confirm('Return to Aether Paradise?'))break;
    s().poniResume={...p().location};
    if(AlolaPoni.owns(p().flags.lastCenter))s().poniCenter=p().flags.lastCenter;
    p().flags.lastCenter=s().ulaulaCenter||'AlolaMalieCenter';
    await env.teleport({...s().aetherResume||R.data().poni.return});await save();await say('You returned to Aether Paradise.');break;
   case'poni-heal':
    p().party.forEach(Party.heal);p().flags.lastCenter=p().location.map;
    s().lastCenter=p().location.map;s().poniCenter=p().location.map;
    await save();await say('Your Pokémon are fully healed!');break;
   case'aether-intro':await say('Gladion: Lusamine is inside. Team Skull is guarding the laboratory!');break;
   case'aether-grunts':
    if(s().aetherGrunts){await say('The Aether Paradise lobby is secure.');break;}
    if(await battle('AETHER_GRUNTS','Team Skull and Aether Security',[['Golbat',42],['Raticate-Alola',42],['Hypno',43]])){
     s().aetherGrunts=true;await save();await say('You cleared the way to the laboratory.');}break;
   case'gladion-aether':
    if(s().aetherGrunts)await say('Gladion: Hurry! Lusamine has taken Cosmog into the laboratory.');
    else await say('Gladion: Defeat the guards before we can reach Lusamine.');break;
   case'lusamine':
    if(!s().aetherGrunts){await say('The laboratory is guarded. Clear the lobby first.');break;}
    if(s().lusamineClear){await say('Lusamine has been stopped. The way to Poni Island is open.');break;}
    if(await battle('LUSAMINE_AETHER','Lusamine',[['Clefable',43],['Lilligant',43],['Milotic',44],['Bewear',44]])){
     s().lusamineClear=true;await save();await say('Lusamine was defeated. Lillie asks you to meet her on Poni Island to restore Nebby’s light.');}break;
   case'lillie-poni':
    if(!s().lilliePoni){s().lilliePoni=true;await save();}
    await say('Lillie: We need the island guardian’s help. Find Hapu in Poni Wilds, then head toward the altar.');break;
   case'hapu-poni':
    if(!s().lilliePoni){await say('Hapu: Speak to Lillie in Seafolk Village first.');break;}
    if(!s().hapuMet){s().hapuMet=true;await save();}
    await say('Hapu: Meet me on Ancient Poni Path for the grand trial.');break;
   case'hapu-grand':
    if(!s().hapuMet){await say('Hapu awaits you in Poni Wilds first.');break;}
    if(s().hapuClear){await say('Hapu: Go through Vast Poni Canyon to find the altar.');break;}
    if(!s().hapuWon){
     if(!await battle('HAPU_PONI','Island Kahuna Hapu',[['Dugtrio-Alola',46],['Gastrodon',47],['Flygon',47],['Mudsdale',48]]))break;
     s().hapuWon=true;await save();
    }
    await gift('groundium-z','groundium-z','hapuClear','Hapu awarded Groundium Z! You passed the Poni Grand Trial.');break;
   case'coast-trainer':
   case'poni-grove-trainer':
   case'canyon-trainer':{
    const teams={'coast-trainer':[['Pelipper',46],['Gastrodon',46]],'poni-grove-trainer':[['Scyther',47],['Pinsir',47]],'canyon-trainer':[['Machoke',49],['Jangmo-o',49]]};
    if(s()[key]){await say('You already won this trainer battle.');break;}
    if(await battle('PONI_'+key.toUpperCase(),'Poni Island Trainer',teams[key])){s()[key]=true;await save();}break;
   }
   case'dragon-guide':
    if(!s().hapuClear){await say('Complete Hapu’s grand trial first.');break;}
    if(!s().canyonClear){s().canyonClear=true;await save();}
    await say('The Dragon Trial lies within Vast Poni Canyon. Defeat two guardians before facing Totem Kommo-o.');break;
   case'dragon-0':case'dragon-1':{
    if(!s().canyonClear){await say('Speak to the trial guide at the canyon entrance first.');break;}
    if(s().dragonClear){await say('The guardian has already been calmed.');break;}
    const i=+key.slice(-1);s().dragonGuardians||(s().dragonGuardians=[]);
    if(s().dragonGuardians.includes(i)){await say('You already defeated this guardian.');break;}
    if(await battle('DRAGON_GUARDIAN_'+i,'Canyon Dragon Guardian',[[i?'Hakamo-o':'Jangmo-o',49+i]])){
     s().dragonGuardians.push(i);await save();await say('Dragon guardian '+s().dragonGuardians.length+'/2 defeated.');}break;
   }
   case'totem-kommoo':
    if(s().dragonClear){await say('Totem Kommo-o was already defeated.');break;}
    if((s().dragonGuardians||[]).length<2){await say('Defeat both dragon guardians first.');break;}
    if(!s().dragonTotemWon){
     if(!await battle('TOTEM_KOMMOO','Totem Kommo-o',[['Kommo-o',52],['Noivern',50]]))break;
     s().dragonTotemWon=true;await save();
    }
    await gift('dragonium-z','dragonium-z','dragonClear','The Dragon Trial is complete! You obtained Dragonium Z.');break;
   case'altar-lillie':
    if(!s().dragonClear){await say('Complete the Dragon Trial before the altar awakens.');break;}
    if(!s().altarOpened){s().altarOpened=true;await save();}
    await say('Lillie: Nebby’s light has returned! A portal to Ultra Space has opened. Necrozma is waiting beyond.');break;
   case'ultra-necrozma':
    if(!s().altarOpened){await say('The Ultra Space portal has not opened yet.');break;}
    if(s().necrozmaClear){await say('The light has returned to Alola. Necrozma is at peace.');break;}
    if(await battle('ULTRA_NECROZMA','Ultra Necrozma',[['Necrozma-Ultra',60]])){
     s().necrozmaClear=true;await save();await say('Ultra Necrozma was defeated! Alola’s light has been restored. Mina awaits in Seafolk Village.');}break;
   case'mina-invite':
    if(!s().necrozmaClear){await say('Mina: Return after the light is restored at the altar.');break;}
    if(!s().minaInvited){s().minaInvited=true;await save();}
    await say('Mina: Find my three colored petals in Poni Meadow, Resolution Cave and Poni Gauntlet.');break;
   case'mina-petal-0':case'mina-petal-1':case'mina-petal-2':{
    if(!s().minaInvited){await say('Talk to Mina in Seafolk Village before looking for petals.');break;}
    const i=+key.slice(-1);s().minaPetals||(s().minaPetals=[]);
    if(s().minaPetals.includes(i)){await say('You already found this petal.');break;}
    if(await battle('MINA_PETAL_'+i,'Trial Pokémon',[[['Ribombee','Granbull','Kommo-o'][i],54+i]])){
     s().minaPetals.push(i);await save();await say('Colored petal '+s().minaPetals.length+'/3 collected!');}break;
   }
   case'mina-final':
    if(!s().necrozmaClear){await say('Mina: Resolve the Ultra Necrozma crisis first.');break;}
    if(!s().minaInvited){s().minaInvited=true;await save();await say('Mina: Find three petals in Poni Meadow, Resolution Cave and Poni Gauntlet.');break;}
    if(s().minaClear){await say('Mina: Congratulations on clearing the final island trial!');break;}
    if((s().minaPetals||[]).length<3){await say('Mina: You have '+(s().minaPetals||[]).length+'/3 petals.');break;}
    if(!s().minaTotemWon){
     if(!await battle('TOTEM_RIBOMBEE','Totem Ribombee',[['Ribombee',57],['Pelipper',55]]))break;
     s().minaTotemWon=true;await save();
    }
    await gift('fairium-z','fairium-z','minaClear','Mina awarded Fairium Z! You completed Poni Island’s final trial.');break;
   case'tapu-fini':await say('Tapu Fini watches from the Ruins of Hope. Its challenge is not yet available.');break;
   default:return false;
  }return true;
 }
 return{run,goal};
}
window.AlolaPoniStory={create};
})();
