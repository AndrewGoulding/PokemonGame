// Unified Ultra Sun/Ultra Moon Ula'ula story.
(function(){
'use strict';
function create(env,{fight}){
 const R=Alola,p=()=>env.player(),s=()=>R.state(p()),say=env.say,save=env.saveCheckpoint;
 const battle=async(id,name,team)=>await fight(id,name,team.map(([a,b])=>Party.create(a,b)))==='won';
 async function reward(key,id,flag,message){
  const r=R.gift(p(),key,id);if(r.full){await say('Make room in your Bag, then return for your reward.');return;}
  s()[flag]=true;await save();await say(message);
 }
 function goal(){
  const f=s();return !f.hauMalie?'Battle Hau in Malie City.':!f.skullRoute10?'Stop Team Skull on Route 10.':
   !f.sophoclesClear?'Complete Sophocles’s Hokulani Observatory trial.':
   !f.hapuRoute12?'Meet Hapu on Route 12.':!f.acerolaInvited?'Meet Acerola in Tapu Village.':
   !f.acerolaClear?'Complete Acerola’s abandoned Megamart ghost trial.':
   !f.aetherDefended?'Defend Aether House.':!f.plumeriaUla?'Battle Plumeria on Route 15.':
   !f.poTownGrunts?'Clear the gate to Po Town.':!f.guzmaUla?'Defeat Guzma in Shady House.':
   !f.nanuClear?'Return to Malie City to challenge Nanu.':'Ula’ula is complete! The Aether Foundation chapter comes next.';
 }
 async function run(key){
  switch(key){
   case'ula-ferry':
    if(!s().oliviaClear){await say('Complete Olivia’s Akala grand trial before sailing to Ula’ula.');break;}
    if(!await env.confirm('Sail to Ula’ula Island?'))break;
    if(!s().ulaulaArrived){s().ulaulaArrived=true;s().akalaCenter=AlolaAkala.owns(p().flags.lastCenter)?p().flags.lastCenter:'AlolaKonikoniCenter';}
    p().flags.lastCenter=s().ulaulaCenter||'AlolaMalieCenter';
    await env.teleport({...s().ulaulaResume||R.data().ulaula.start});await save();
    await say('The ferry has arrived in Malie City!');break;
   case'ula-return-ferry':
    if(!await env.confirm('Return to Akala Island?'))break;
    s().ulaulaResume={...p().location};
    if(AlolaUlaula.owns(p().flags.lastCenter))s().ulaulaCenter=p().flags.lastCenter;
    p().flags.lastCenter=s().akalaCenter||'AlolaKonikoniCenter';
    await env.teleport({...R.data().ulaula.return});await save();await say('Welcome back to Konikoni City. Your Ula’ula progress is saved.');break;
   case'ula-heal':
    p().party.forEach(Party.heal);p().flags.lastCenter=p().location.map;s().lastCenter=p().location.map;
    s().ulaulaCenter=p().location.map;await save();await say('Your Pokémon are healed!');break;
   case'hau-malie':
    if(s().hauMalie){await say('Hau: Meet Professor Kukui in Malie Garden, then head for Route 10!');break;}
    if(await battle('HAU_MALIE','Hau',[['Raichu-Alola',29],[R.rivalSpecies(p()),30]])){
     s().hauMalie=true;await save();await say('Hau: Nice battle! Mount Hokulani is next.');}break;
   case'kukui-malie':
    if(!s().hauMalie){await say('Kukui: Hau is waiting for a battle in Malie City.');break;}
    await say('Kukui: Sophocles awaits at Hokulani Observatory. Watch out for Team Skull on Route 10!');break;
   case'skull-route10':
    if(s().skullRoute10){await say('Team Skull has already fled Route 10.');break;}
    if(await battle('SKULL_ROUTE10_ULA','Team Skull Grunts',[['Golbat',29],['Raticate-Alola',29]])){
     s().skullRoute10=true;await save();await say('The path to Mount Hokulani is clear.');}break;
   case'molayne':await say('Molayne: Help Sophocles repair the observatory power supply.');break;
   case'sophocles-brief':await say(s().sophoclesClear?'Sophocles: Good work on the trial!':'Sophocles: Restore three power switches and face Totem Togedemaru!');break;
   case'power-0':case'power-1':case'power-2':{
    if(s().sophoclesClear){await say('The power is stable.');break;}
    const i=+key.slice(-1);s().powerSwitches||(s().powerSwitches=[]);
    if(s().powerSwitches.includes(i)){await say('This switch is already repaired.');break;}
    if(await battle('SOPHOCLES_SWITCH_'+i,'Power System Pokémon',[[['Charjabug','Magnemite','Electabuzz'][i],31+i]])){
     s().powerSwitches.push(i);await save();await say('Power switch '+(i+1)+' restored!');}break;
   }
   case'sophocles-totem':
    if(s().sophoclesClear){await say('Totem Togedemaru was already defeated.');break;}
    if((s().powerSwitches||[]).length<3){await say('Restore all three switches first.');break;}
    if(!s().sophoclesTotemWon){
     if(!await battle('TOTEM_TOGEDEMARU','Totem Togedemaru',[['Togedemaru',33],['Skarmory',32]]))break;
     s().sophoclesTotemWon=true;await save();
    }
    await reward('electrium-z','electrium-z','sophoclesClear','Sophocles awarded Electrium Z!');break;
   case'route11-trainer':
    if(s().route11Trainer){await say('You won our last battle!');break;}
    if(await battle('ROUTE11_ULA','Route 11 Trainer',[['Komala',31],['Pancham',32]])){s().route11Trainer=true;await save();}break;
   case'hapu-route12':
    if(!s().hapuRoute12){s().hapuRoute12=true;await save();}
    await say('Hapu: Mudsdale can cross rocky ground. Head for Tapu Village.');break;
   case'hau-route13':
    if(s().hauRoute13){await say('Hau: Acerola is in Tapu Village!');break;}
    if(await battle('HAU_ROUTE13','Hau',[['Raichu-Alola',32],[R.rivalSpecies(p()),33]])){s().hauRoute13=true;await save();await say('Hau: Acerola knows about the strange ghosts on Route 14!');}break;
   case'acerola-invite':
    if(!s().acerolaInvited){s().acerolaInvited=true;await save();}
    await say('Acerola: My trial is at the abandoned Thrifty Megamart. Find three ghostly photographs!');break;
   case'acerola-brief':await say(s().acerolaClear?'Acerola: The ghost trial is complete.':'Acerola: Search the abandoned Megamart and challenge Totem Mimikyu.');break;
   case'ghost-photo-0':case'ghost-photo-1':case'ghost-photo-2':{
    if(!s().acerolaInvited){await say('Speak to Acerola in Tapu Village first.');break;}
    if(s().acerolaClear){await say('The ghostly image has vanished.');break;}
    const i=+key.slice(-1);s().ghostPhotos||(s().ghostPhotos=[]);
    if(s().ghostPhotos.includes(i)){await say('You already photographed this ghost.');break;}
    if(await battle('ACEROLA_PHOTO_'+i,'Haunted Pokémon',[[['Gastly','Haunter','Gengar'][i],33+i]])){
     s().ghostPhotos.push(i);await save();await say('Ghost photo '+s().ghostPhotos.length+'/3 recorded!');}break;
   }
   case'acerola-totem':
    if(s().acerolaClear){await say('Totem Mimikyu is resting.');break;}
    if((s().ghostPhotos||[]).length<3){await say('Find three ghost photographs first.');break;}
    if(!s().acerolaTotemWon){
     if(!await battle('TOTEM_MIMIKYU','Totem Mimikyu',[['Mimikyu',35],['Banette',34]]))break;
     s().acerolaTotemWon=true;await save();
    }
    await reward('ghostium-z','ghostium-z','acerolaClear','Acerola awarded Ghostium Z!');break;
   case'aether-house':
    if(s().aetherDefended){await say('Aether House is safe, but the grunts fled toward Po Town.');break;}
    if(await battle('AETHER_HOUSE_ULA','Team Skull Intruders',[['Golbat',35],['Salazzle',35]])){
     s().aetherDefended=true;await save();await say('Team Skull was driven away from Aether House!');}break;
   case'plumeria-ula':
    if(!s().aetherDefended){await say('Plumeria: Something is happening at Aether House.');break;}
    if(s().plumeriaUla){await say('Plumeria has gone to Po Town.');break;}
    if(await battle('PLUMERIA_ULA','Plumeria',[['Golbat',36],['Salazzle',37]])){
     s().plumeriaUla=true;await save();await say('Plumeria: Guzma is waiting in Shady House.');}break;
   case'route16-trainer':
    if(s().route16Trainer){await say('What a great battle!');break;}
    if(await battle('ROUTE16_ULA','Route 16 Trainer',[['Ribombee',36],['Pangoro',37]])){s().route16Trainer=true;await save();}break;
   case'meadow-recon':await say('Ultra Recon Squad: We are investigating Necrozma and the Aether Foundation.');break;
   case'skull-route17':
    if(s().route17Skull){await say('Team Skull has retreated to Po Town.');break;}
    if(await battle('SKULL_ROUTE17_ULA','Team Skull Grunt',[['Pawniard',37],['Golbat',37]])){s().route17Skull=true;await save();}break;
   case'potown-grunts':
    if(s().poTownGrunts){await say('The path to Shady House is open.');break;}
    if(await battle('PO_TOWN_GATE','Team Skull Grunts',[['Raticate-Alola',38],['Haunter',38]])){s().poTownGrunts=true;await save();await say('The gate to Shady House is clear!');}break;
   case'guzma-ula':
    if(s().guzmaUla){await say('Guzma: Go on, get out of here!');break;}
    if(await battle('GUZMA_ULA','Team Skull Boss Guzma',[['Golisopod',40],['Masquerain',39],['Pinsir',39]])){
     s().guzmaUla=true;await save();await say('Guzma was defeated! Return to Malie City for Nanu’s Grand Trial.');}break;
   case'nanu-grand':
    if(!s().guzmaUla){await say('Nanu: Deal with the Team Skull trouble in Po Town first.');break;}
    if(s().nanuClear){await say('Nanu: You completed the Ula’ula Grand Trial!');break;}
    if(!s().nanuWon){
     if(!await battle('NANU_ULA','Island Kahuna Nanu',[['Sableye',41],['Krokorok',41],['Persian-Alola',42]]))break;
     s().nanuWon=true;await save();
    }
    await reward('darkium-z','darkium-z','nanuClear','Nanu awarded Darkium Z! Ula’ula’s Grand Trial is complete.');break;
   case'desert-guide':await say('Haina Desert winds through the cliffs toward the Ruins of Abundance.');break;
   case'tapu-bulu':await say('An ancient presence watches the Ruins of Abundance. Tapu Bulu is not yet available to battle.');break;
   default:return false;
  }
  return true;
 }
 return{run,goal};
}
window.AlolaUlaulaStory={create};
})();
