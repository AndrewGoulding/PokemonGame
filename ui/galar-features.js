// Galar Max Raids, daily Wild Area roamers and optional expansion expeditions.
(function(){
'use strict';
function create(env){
 const R=Galar,W=GalarWild,p=()=>env.player(),s=()=>R.state(p()),say=env.say,save=env.saveCheckpoint;
 async function roam(index){
  const item=W.roamer(p(),index);if(!item)return;
  s().roamers||(s().roamers={});
  if(s().roamers[item.key]){await say(item.species+' has already been encountered today.');return;}
  await say('A powerful '+item.species+' appeared in the '+item.map.replace('Galar','')+'!');
  if(!env.canBattle()){await say('You need a healthy Pokémon before battling it.');return;}
  const result=await env.wildEncounter(Party.create(item.species,item.level),{weather:W.battleWeather(p(),item.map),music:'mus_vs_wild'});
  if(result==='caught'||result==='won'){
   s().roamers[item.key]=result;await save();
   await say(result==='caught'?'The roaming Pokémon was caught!':'The roaming Pokémon retreated for the day.');
  }
 }
 async function raid(index){
  const den=W.dens[index];if(!den)return;
  let record=W.raid(p(),index);
  if(!record){await say('This den has been cleared today. Come back after the next in-game day.');return;}
  await say('A '+record.stars+'-star Max Raid! '+record.species+' (Lv. '+record.level+') is in the den.');
  if(!env.canBattle()){await say('You need a healthy Pokémon to enter a raid.');return;}
  if(!await env.confirm('Challenge this Max Raid?'))return;
  const mon=Party.create(record.species,record.level);mon.gmax=!!window.DEX[record.species+'-Gmax'];
  const outcome=await env.galarRaid(mon,{galarRaid:true,galarRaidHp:2+record.stars/2,weather:W.battleWeather(p(),den.map),
   noCatch:true,noBlackout:true,noExp:true});
  if(outcome!=='won'){await say('The raid boss held its ground. You can try this den again.');return;}
  W.clear(p(),index);await save();
  const money=1000*record.stars;Player.addMoney(p(),money);
  const candy=record.stars>=4?'dynamax-candy':'exp-candy-m';
  Player.addItem(p(),candy,record.stars);
  await say('Max Raid victory! Received '+money+' Poké Dollars and '+record.stars+' '+Bag.name(candy)+'!');
  const balls=['poke-ball','great-ball','ultra-ball','premier-ball','dusk-ball','repeat-ball','luxury-ball']
   .filter(id=>Player.itemCount(p(),id)>0);
  if(!balls.length){await say('No Poké Balls available. The raid Pokémon escaped after the battle.');await save();return;}
  const chosen=await env.choose('Choose a Poké Ball to catch '+record.species,balls);
  if(!chosen||!balls.includes(chosen)){await say('You released the raid Pokémon.');await save();return;}
  if(p().party.length>=Player.PARTY_SIZE&&!p().boxes.some(box=>Player.firstEmpty(box)>=0)){
   await say('Your party and PC are full. Make space before catching more Pokémon.');await save();return;
  }
  Player.removeItem(p(),chosen,1);
  mon.ball=chosen;mon.met={map:den.map,level:mon.level,game:'galar-max-raid'};
  const received=Player.receive(p(),mon);
  if(received){
   s().raidCatches=(s().raidCatches||0)+1;await save();
   await say(record.species+' was caught in '+Bag.name(chosen)+' and added to your '+(received==='party'?'party!':received+'!'));
  }
 }
 async function run(key){
  let match=/^galar-roamer-(\d+)$/.exec(key);
  if(match){await roam(+match[1]);return true;}
  match=/^galar-den-(\d+)$/.exec(key);
  if(match){await raid(+match[1]);return true;}
  switch(key){
   case'galar-weather':
    await say('Wild Area forecast: '+(W.weather(p(),p().location.map)||'clear')+'. Weather shifts as in-game days pass.');return true;
   default:return false;
  }
 }
 return{run,roam,raid};
}
window.GalarFeaturesStory={create};
})();
