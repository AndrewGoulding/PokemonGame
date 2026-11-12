// Sword + Shield expansion stories: Isle of Armor and Crown Tundra.
(function(){
'use strict';
function create(env,{battle}){
 const R=Galar,D=R.data(),p=()=>env.player(),s=()=>R.state(p()),say=env.say,save=env.saveCheckpoint;
 const fight=async(id,name,roster)=>await battle(id,name,roster)==='won';
 async function mark(flag,id,name,team,text){
  if(s()[flag]){await say(name+' has already been defeated.');return true;}
  if(!await fight(id,name,team))return false;
  s()[flag]=true;await save();await say(text);return true;
 }
 async function reward(key,item,count=1){
  const r=R.gift(p(),key,item,count);
  if(r.full){await say('Make room in your Bag and return to collect the reward.');return false;}
  await save();return true;
 }
 const adventureLegends=['Suicune','Dialga','Palkia','Giratina','Rayquaza','Zygarde','Lugia','Ho-Oh','Kyogre','Groudon'];
 function goal(){
  const f=s();
  if(!f.armorClear)return !f.armorArrival?'Take the Isle of Armor train from Wedgehurst.':
   !f.mustardIntro?'Speak to Mustard at the Master Dojo.':
   !f.kubfuGift?'Receive Kubfu from Mustard.':
   !f.kubfuBond?'Complete three Kubfu training sessions.':
   !f.urshifuStyle?'Choose the Tower of Waters or Darkness and train Kubfu.':
   !f.mustardTrial?'Defeat Mustard in the Master Dojo.':
   !f.maxSoupReady?'Collect Max Mushrooms and Max Honey for the Dojo.':
   'Return to Mustard to complete the Isle of Armor chapter.';
  if(!f.crownClear)return !f.crownArrival?'Take the Crown Tundra train from Wyndon.':
   !f.peonyMet?'Meet Peony in Freezington.':
   !f.calyrexMet?'Speak with Calyrex in Freezington.':
   !f.reinsComplete?'Find the royal steed and obtain the Reins of Unity.':
   !f.crownHorseChosen?'Choose the steed and visit the Crown Shrine.':
   !f.calyrexWon?'Challenge Calyrex at the sacred arena.':
   'Return to Peony to complete the Crown Tundra chapter.';
  return 'Both Galar expansions complete! Explore the Regi temples, legendary birds and Dynamax Adventures.';
 }
 async function run(key){
  switch(key){
   case'armor-ferry':
    if(!s().championClear){await say('The Isle of Armor expedition opens after the Galar Championship.');break;}
    if(!await env.confirm('Travel to the Isle of Armor?'))break;
    if(!s().armorArrival){s().armorArrival=true;s().mainlandCenter=p().flags.lastCenter||'GalarWyndonCenter';}
    p().flags.lastCenter=s().armorCenter||'GalarArmorCenter';
    await env.teleport({...s().armorResume||D.dlc.armorStart});await save();await say('Welcome to the Isle of Armor! The Master Dojo awaits.');break;
   case'armor-return':
    if(!await env.confirm('Return to Wedgehurst?'))break;
    s().armorResume={...p().location};
    if(GalarDlc.armor(p().flags.lastCenter))s().armorCenter=p().flags.lastCenter;
    p().flags.lastCenter=s().mainlandCenter||'GalarWyndonCenter';
    await env.teleport({...D.dlc.armorReturn});await save();await say('Your Isle of Armor progress is saved.');break;
   case'crown-train':
    if(!s().championClear){await say('The Crown Tundra expedition opens after the Galar Championship.');break;}
    if(!await env.confirm('Take the train to the Crown Tundra?'))break;
    if(!s().crownArrival){s().crownArrival=true;s().mainlandCenter=p().flags.lastCenter||'GalarWyndonCenter';}
    p().flags.lastCenter=s().crownCenter||'GalarCrownCenter';
    await env.teleport({...s().crownResume||D.dlc.crownStart});await save();await say('The train arrives in the snowy Crown Tundra.');break;
   case'crown-return':
    if(!await env.confirm('Return to Wyndon?'))break;
    s().crownResume={...p().location};
    if(GalarDlc.crown(p().flags.lastCenter))s().crownCenter=p().flags.lastCenter;
    p().flags.lastCenter=s().mainlandCenter||'GalarWyndonCenter';
    await env.teleport({...D.dlc.crownReturn});await save();await say('Your Crown Tundra progress is saved.');break;
   case'dlc-heal':
    p().party.forEach(Party.heal);p().flags.lastCenter=p().location.map;
    s().lastCenter=p().location.map;
    if(GalarDlc.armor(p().location.map))s().armorCenter=p().location.map;
    else s().crownCenter=p().location.map;
    await save();await say('Your Pokémon are fully healed!');break;
   case'klara-avery':
    if(!s().armorArrival){await say('The Dojo is open to new challengers.');break;}
    if(!s().dojoRivalWon){
     if(!await fight('ARMOR_RIVAL','Klara and Avery',[['Slowpoke-Galar',60],['Venipede',61],['Kadabra',61]]))break;
     s().dojoRivalWon=true;await save();
    }
    await say('The Dojo rivals invited you to train with Mustard.');break;
   case'armor-researcher':await say('The Isle of Armor is full of rare Pokémon. Mustard trains strong partners at the Master Dojo.');break;
   case'mustard-intro':
    if(!s().armorArrival){await say('The Dojo enrollment is not complete.');break;}
    if(!s().mustardIntro){s().mustardIntro=true;await save();}
    await say('Mustard: Welcome! Your training begins with Kubfu.');break;
   case'kubfu-gift':{
    if(!s().mustardIntro){await say('Talk with Mustard before claiming Kubfu.');break;}
    if(s().kubfuGift){await say('Mustard: Train Kubfu at three places across the island.');break;}
    if(p().party.length>=Player.PARTY_SIZE){await say('Make room in your party for Kubfu.');break;}
    const mon=Party.create('Kubfu',60);
    mon.ot={name:p().name,id:p().trainerId};
    mon.met={map:'GalarMasterDojo',level:60,from:'Mustard',game:'galar-sword-shield'};
    p().party.push(mon);Player.markCaught(p(),'Kubfu');
    s().kubfuGift=true;await save();await say('Mustard gave you Kubfu! Train together before choosing a tower.');break;
   }
   case'slowpoke-0':case'slowpoke-1':case'slowpoke-2':{
    if(!s().kubfuGift){await say('Mustard wants you to receive Kubfu first.');break;}
    const i=+key.slice(-1);s().kubfuTraining||(s().kubfuTraining=[]);
    if(s().kubfuTraining.includes(i)){await say('Kubfu has already trained here.');break;}
    if(!await fight('KUBFU_TRAIN_'+i,'Training Challenge',[[['Slowpoke-Galar','Dwebble','Mienfoo'][i],61+i]]))break;
    s().kubfuTraining.push(i);
    if(s().kubfuTraining.length===3)s().kubfuBond=true;
    await save();await say('Kubfu training complete: '+s().kubfuTraining.length+'/3.');break;
   }
   case'urshifu-water':case'urshifu-dark':{
    if(!s().kubfuBond){await say('Complete Kubfu friendship training first.');break;}
    if(s().urshifuStyle){await say('Kubfu has already trained at the '+s().urshifuStyle+' tower.');break;}
    const rapid=key==='urshifu-water',form=rapid?'Urshifu-Rapid-Strike':'Urshifu';
    if(!p().party.some(mon=>mon.species==='Kubfu')){await say('Bring Kubfu in your party to challenge the tower.');break;}
    if(!await fight(rapid?'TOWER_WATERS':'TOWER_DARKNESS',rapid?'Tower of Waters':'Tower of Darkness',[[rapid?'Poliwrath':'Scrafty',65],['Urshifu',68]]))break;
    const idx=p().party.findIndex(mon=>mon.species==='Kubfu'),prior=p().party[idx],evolved=Party.create(form,prior.level);
    evolved.ot=prior.ot;evolved.met=prior.met;
    p().party[idx]=evolved;Player.markCaught(p(),form);
    s().urshifuStyle=rapid?'Waters':'Darkness';await save();await say('Kubfu evolved into '+form+'!');break;
   }
   case'dojo-final':
    if(!s().urshifuStyle){await say('Train Kubfu at one of the two towers first.');break;}
    if(!s().mustardTrial){
     if(!await fight('MUSTARD_FINAL','Mustard',[['Mienshao',68],['Luxray',68],['Corviknight',69],['Urshifu',70]]))break;
     s().mustardTrial=true;await save();await say('Mustard: You passed! Gather ingredients for Max Soup.');break;
    }
    if(s().maxSoupReady&&!s().armorClear){s().armorClear=true;await save();await say('Mustard: Congratulations! You completed the Isle of Armor training.');}
    else await say('Mustard: Collect Max Mushrooms and Max Honey to complete the Dojo challenge.');break;
   case'mushroom-0':case'mushroom-1':{
    if(!s().mustardTrial){await say('Finish Mustard’s Dojo challenge before gathering mushrooms.');break;}
    const i=+key.slice(-1);s().maxMushrooms||(s().maxMushrooms=[]);
    if(!s().maxMushrooms.includes(i)){s().maxMushrooms.push(i);await save();}
    await say('You found a Max Mushroom. '+s().maxMushrooms.length+'/2 locations searched.');break;
   }
   case'honeycalm-guide':await say('The island beyond Workout Sea is known for its unusually sweet Max Honey.');break;
   case'max-honey':
    if(!s().mustardTrial){await say('Mustard will explain the Max Honey request after training.');break;}
    if(!s().maxHoney){if(!await fight('VESPIQUEN_HONEY','Vespiquen',[['Vespiquen',66]]))break;s().maxHoney=true;await save();}
    await say('You collected Max Honey from Honeycalm Island.');break;
   case'max-soup':
    if(!s().mustardTrial){await say('Finish the Master Dojo trial before preparing Max Soup.');break;}
    if((s().maxMushrooms||[]).length<2||!s().maxHoney){await say('Gather two mushroom patches and Max Honey first.');break;}
    if(!s().maxSoupReady){s().maxSoupReady=true;await save();}
    await say('Max Soup is ready! Bring the news to Mustard to complete the chapter.');break;
   case'peony':
    if(!s().crownArrival){await say('Welcome to Freezington!');break;}
    if(!s().peonyMet){if(!await fight('PEONY_FIRST','Peony',[['Copperajah',70],['Aggron',69]]))break;s().peonyMet=true;await save();}
    if(s().calyrexWon&&!s().crownClear){s().crownClear=true;await save();await say('Peony: Legendary expedition complete! Crown Tundra’s main mystery is solved.');}
    else await say('Peony: Explore the ancient king, the Regis and Dynamax Adventures!');break;
   case'crown-elder':await say('An ancient king once ruled the tundra. The villagers remember a mysterious steed.');break;
   case'crown-clue':await say('The Frostpoint fields hold clues to an ancient king and the legendary giants.');break;
   case'calyrex-intro':
    if(!s().peonyMet){await say('Peony will explain the expedition first.');break;}
    if(!s().calyrexMet){s().calyrexMet=true;await save();}
    await say('Calyrex: Find my royal steed at Old Cemetery or Snowslide Slope, and restore the Reins of Unity.');break;
   case'spectrier':case'glastrier':{
    if(!s().calyrexMet){await say('Meet Calyrex in Freezington first.');break;}
    if(s().crownHorseChosen){await say('Calyrex has chosen '+s().crownHorseChosen+' as its steed.');break;}
    const species=key==='spectrier'?'Spectrier':'Glastrier';
    if(!await fight('STEED_'+key.toUpperCase(),species,[[species,70]]))break;
    s().crownHorseChosen=species;s().reinsComplete=true;await save();await say('The Reins of Unity have been prepared for '+species+'.');break;
   }
   case'calyrex-final':
    if(!s().reinsComplete||!s().crownHorseChosen){await say('Find a steed and the Reins of Unity first.');break;}
    if(s().calyrexWon){await say('Calyrex’s crown has already been restored.');break;}
    const species=s().crownHorseChosen==='Spectrier'?'Calyrex-Shadow':'Calyrex-Ice';
    if(!await fight('CALYREX_RIDER','Calyrex',[[species,80]]))break;
    s().calyrexWon=true;await save();await say('Calyrex’s power was restored! Return to Peony in Freezington.');break;
   case'regi-clue':await say('The stone ruins are said to house ancient legendary giants. Look for three seals.');break;
   case'regi-stones':await say('A deep rumbling points toward Three-Point Pass. The three ancient Regis must be faced first.');break;
   case'regi-choice':{
    s().regisWon||(s().regisWon=[]);
    if(s().regisWon.length===3){s().regisThree=true;await save();await say('The three ancient seals are active. Three-Point Pass has opened.');break;}
    const i=s().regisWon.length,mons=['Regirock','Regice','Registeel'];
    if(!await fight('REGI_'+i,mons[i],[[mons[i],70]]))break;
    s().regisWon.push(i);if(s().regisWon.length===3)s().regisThree=true;
    await save();await say('You restored seal '+s().regisWon.length+'/3.');break;
   }
   case'regi-final':{
    if(!s().regisThree){await say('Restore all three original Regi seals first.');break;}
    if(s().regiFinal){await say('Your legendary Regi challenge is complete.');break;}
    const chosen=await env.choose('Choose the final legendary giant!',['Regieleki','Regidrago']);
    if(!chosen)break;
    if(!await fight('REGI_FINAL',chosen,[[chosen,75]]))break;
    s().regiFinal=chosen;await save();await say(chosen+' acknowledged your strength.');break;
   }
   case'legendary-birds':{
    if(!s().peonyMet){await say('Speak to Peony first.');break;}
    const mons=['Articuno-Galar','Zapdos-Galar','Moltres-Galar'];
    s().birdsWon||(s().birdsWon=[]);
    if(s().birdsWon.length===3){await say('All three Galarian legendary birds have been encountered.');break;}
    const i=s().birdsWon.length,mon=mons[i];
    if(!await fight('BIRD_'+i,mon,[[mon,70]]))break;
    s().birdsWon.push(i);await save();await say('Legendary bird encounter '+s().birdsWon.length+'/3 completed.');break;
   }
   case'dynamax-guide':{
    if(!s().peonyMet){await say('Peony must introduce you to the Max Lair first.');break;}
    s().adventure||(s().adventure={stage:0,run:0,wins:0,records:[]});
    const a=s().adventure;
    const hazards=[['Perrserker',65],['Duraludon',66],['Copperajah',67]];
    if(a.stage<3){
     const [mon,level]=hazards[a.stage];
     if(!await fight('ADVENTURE_'+a.run+'_'+a.stage,'Dynamax Adventure Encounter',[[mon,level]])){a.stage=0;await save();await say('The expedition ended. Try another path through the Max Lair.');break;}
     a.stage++;await save();await say('Max Lair encounter '+a.stage+'/3 cleared. Continue to the legendary den.');break;
    }
    const i=a.run%adventureLegends.length,legend=adventureLegends[i];
    if(!await fight('ADVENTURE_BOSS_'+a.run,'Dynamax Adventure '+legend,[[legend,70]])){a.stage=0;await save();await say('The legendary escaped. Start another expedition.');break;}
    a.records.push(legend);a.wins++;a.run++;a.stage=0;await save();
    await say('Dynamax Adventure complete! '+legend+' defeated. Total expeditions: '+a.wins+'.');
    break;
   }
   default:return false;
  }
  return true;
 }
 return{run,goal};
}
window.GalarDlcStory={create};
})();
