// Additional Galar expansion side quests, tracked in the existing save.
(function(){
'use strict';
function create(env,{battle}){
 const R=Galar,p=()=>env.player(),s=()=>R.state(p()),say=env.say,save=env.saveCheckpoint;
 const swords=['Cobalion','Terrakion','Virizion','Keldeo-Ordinary'];
 async function run(key){
  let m=/^diglett-(\d+)$/.exec(key);
  if(m){
   if(!s().armorArrival){await say('The Diglett expedition begins after visiting the Isle of Armor.');return true;}
   const i=+m[1];s().diglettFound||(s().diglettFound=[]);
   if(s().diglettFound.includes(i)){
    if(s().diglettFound.length===10&&!s().diglettReward){
     const gift=R.gift(p(),'armor-diglett-reward','rare-candy',5);
     if(!gift.full){s().diglettReward=true;await save();await say('Your Diglett hunt reward: five Rare Candies!');}
     else await say('Make room in your Bag to claim your five Rare Candies.');
    }else await say('You already found this Alolan Diglett.');
    return true;
   }
   s().diglettFound.push(i);await save();await say('An Alolan Diglett was found! '+s().diglettFound.length+'/10.');
   if(s().diglettFound.length===10&&!s().diglettReward){
    const gift=R.gift(p(),'armor-diglett-reward','rare-candy',5);
    if(!gift.full){s().diglettReward=true;await save();await say('Diglett hunt complete! You received five Rare Candies.');}
    else await say('There is a reward waiting at the Master Dojo when your Bag has room.');
   }
   return true;
  }
  m=/^footprint-([0-2])$/.exec(key);
  if(m){
   if(!s().peonyMet){await say('Peony will explain the Crown Tundra expedition first.');return true;}
   const i=+m[1];s().crownFootprints||(s().crownFootprints=[]);
   if(s().crownFootprints.includes(i)){await say('These footprints have already been examined.');return true;}
   s().crownFootprints.push(i);
   if(s().crownFootprints.length===3)s().swordsUnlocked=true;
   await save();await say('Mysterious footprint '+s().crownFootprints.length+'/3 documented.');
   if(s().swordsUnlocked)await say('The Swords of Justice have appeared in the Crown Tundra!');
   return true;
  }
  m=/^sword-([0-3])$/.exec(key);
  if(m){
   const i=+m[1],species=swords[i],flag=s().swordsCaught||(s().swordsCaught=[]);
   if(!s().swordsUnlocked){await say('Find all three legendary footprints first.');return true;}
   if(i===3&&flag.length<3){await say('Find Cobalion, Terrakion and Virizion before challenging Keldeo.');return true;}
   if(flag.includes(i)&&Player.hasCaught(p(),species)){await say(species+' has already joined your collection.');return true;}
   if(!env.canBattle()){await say('You need a healthy Pokémon to catch '+species+'.');return true;}
   if(!env.wildEncounter){await say('Wild capture is unavailable right now.');return true;}
   const result=await env.wildEncounter(Party.create(species,i===3?65:70),{music:'mus_vs_legend',noBlackout:true,noGimmicks:true});
   if(result==='caught'){
    if(!flag.includes(i))flag.push(i);await save();
    await say('You caught '+species+'! Legendary sword Pokémon: '+flag.length+'/4.');
   }else await say(species+' escaped and can be challenged again.');
   return true;
  }
  // Daily Watt Rally, a native 2D adaptation of Galar's Rotom Rally.
  // Each route may be completed once per in-game day; Watts are regional,
  // save-backed currency and can be exchanged for useful items.
  if(/^watt-rally-(south|north|armor|crown)$/.test(key)){
   const area=key.slice('watt-rally-'.length);
   const today=window.GalarWild?.day(p())??Math.floor((p().clockSteps||1000)/2400);
   const rally=s().wattRally||(s().wattRally={day:null,completed:[],watts:0,runs:0});
   if(rally.day!==today){rally.day=today;rally.completed=[];}
   if(rally.completed.includes(area)){
    await say('This Watt Rally route is already complete today. Watts: '+rally.watts+'.');return true;
   }
   if(!env.canBattle()){await say('Bring a healthy Pokémon to tackle the Watt Rally.');return true;}
   if(!await env.confirm('Run the '+area+' Watt Rally route for 200 Watts?'))return true;
   const teams={
    south:[['Boltund',30]],north:[['Corviknight',48]],
    armor:[['Scyther',57]],crown:[['Froslass',72]]
   };
   if(await battle('WATT_RALLY_'+area.toUpperCase(),'Watt Rally Trainer',teams[area])!=='won'){
    await say('The Watt Rally was interrupted. You can try again.');return true;
   }
   rally.completed.push(area);rally.watts+=200;rally.runs++;
   await save();await say('Watt Rally completed! Earned 200 Watts. Balance: '+rally.watts+'.');return true;
  }
  if(key==='watt-exchange'){
   const rally=s().wattRally||(s().wattRally={day:null,completed:[],watts:0,runs:0});
   const goods=[['exp-candy-m',200,'Exp. Candy M'],['rare-candy',600,'Rare Candy']];
   const options=goods.filter(([item,cost])=>rally.watts>=cost);
   if(!options.length){await say('Watt Exchange: earn at least 200 Watts in a Rally first.');return true;}
   const labels=options.map(([item,cost,label])=>label+' — '+cost+' Watts');
   const choice=await env.choose('Spend Watts on a reward?',labels);
   const index=labels.indexOf(choice);if(index<0)return true;
   const [item,cost,label]=options[index];
   const before=Player.itemCount(p(),item);Player.addItem(p(),item,1);
   if(Player.itemCount(p(),item)!==before+1){
    await say('There is no room for '+label+' in your Bag.');return true;
   }
   rally.watts-=cost;await save();await say('Exchanged '+cost+' Watts for '+label+'. Remaining: '+rally.watts+'.');return true;
  }
  // A simple Sword/Shield curry camp: consume one Berry, restore the party,
  // and record the recipe. Restrict cooking to once per in-game day.
  if(/^camp-(south|north|armor|crown)$/.test(key)){
   if(!p().party.length){await say('Bring a Pokemon to enjoy camp.');return true;}
   const today=window.GalarWild?.day(p())??Math.floor((p().clockSteps||1000)/2400);
   const camp=s().camp||(s().camp={meals:0,recipes:[],lastDay:null});
   if(camp.lastDay===today){await say('Your Pokemon already enjoyed curry today. Come back on another day!');return true;}
   const options=[['oran-berry','Oran Berry Curry'],['pecha-berry','Pecha Berry Curry'],['sitrus-berry','Sitrus Berry Curry']]
    .filter(([item])=>Player.itemCount(p(),item)>0);
   if(!options.length){await say('Pokemon Camp: bring an Oran, Pecha or Sitrus Berry to cook curry.');return true;}
   const labels=options.map(x=>x[1]);
   const choice=await env.choose('Which curry will you cook?',labels);
   const selected=options.find(x=>x[1]===choice);
   if(!selected)return true;
   if(Player.itemCount(p(),selected[0])<1)return true;
   Player.removeItem(p(),selected[0],1);
   p().party.forEach(mon=>Party.heal(mon));
   camp.lastDay=today;camp.meals++;
   if(!camp.recipes.includes(selected[1]))camp.recipes.push(selected[1]);
   await save();
   await say('You cooked '+selected[1]+'! Your party is fully rested. Curry Dex: '+camp.recipes.length+'/3. Meals: '+camp.meals+'.');
   return true;
  }
  switch(key){
   case'dojo-sparring':{
    if(!s().armorClear){await say('Complete Mustard’s training before sparring.');return true;}
    s().dojoSparring||(s().dojoSparring={stage:0,wins:0,best:0});
    const a=s().dojoSparring,teams=[
     [['Mienshao',70],['Luxray',70]],
     [['Corviknight',72],['Lycanroc',72]],
     [['Urshifu',75],['Kommo-o',74]]
    ];
    if(await battle('DOJO_SPAR_'+a.stage,'Dojo Sparring Partner',teams[a.stage])!=='won'){
     a.best=Math.max(a.best,a.stage);a.stage=0;await save();
     await say('Sparring streak ended. Record '+a.best+' matches.');return true;
    }
    a.stage++;a.wins++;a.best=Math.max(a.best,a.stage);
    if(a.stage===3){a.stage=0;await say('You cleared the three-match Master Dojo sparring challenge!');}
    else await say('Sparring victory '+a.stage+'/3! Challenge the next partner.');
    await save();return true;
   }
   case'galar-star-tournament':{
    if(!s().championClear||!s().armorClear||!s().crownClear){await say('Complete both DLC chapters and become Champion to enter the Galar Star Tournament.');return true;}
    if(!env.galarDoubleBattle){await say('Double battle mode is not available right now.');return true;}
    if(p().party.filter(mon=>Party.canFight(mon)).length<2){await say('Bring two healthy Pokémon for the Galar Star Tournament.');return true;}
    const a=s().starTournament||(s().starTournament={stage:0,titles:0});
    const teams=[
     [['Corviknight',72],['Dubwool',72]],
     [['Grimmsnarl',74],['Toxtricity',74]],
     [['Charizard',76],['Dragapult',76]]
    ];
    const names=['Hop and Marnie','Bede and Piers','Leon and Raihan'],index=a.stage;
    if(await env.galarDoubleBattle('STAR_TOURNAMENT_'+index,names[index],teams[index])!=='won'){
     a.stage=0;await save();await say('The tournament ended. Register again for another run.');return true;
    }
    a.stage++;
    if(a.stage===3){a.stage=0;a.titles++;await say('Galar Star Tournament champions! Titles: '+a.titles+'.');}
    else await say('Tournament round '+a.stage+'/3 complete.');
    await save();return true;
   }
   default:return false;
  }
 }
 return{run};
}
window.GalarExtrasStory={create};
})();
