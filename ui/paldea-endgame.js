// Paldea main-story completion: five Gyms, League, three Titans, Area Zero.
// An explicit 2D adaptation using the shared engine's ordinary trainer battles.
(function(){
'use strict';
const GYMS={
 'iono-gym':{flag:'ionoClear',id:'IONO',name:'Iono',badge:'Electric Badge',gate:'treasureHunt',
  trainers:[[['Wattrel',23]],[['Tadbulb',24]]],
  team:[['Wattrel',23],['Bellibolt',23],['Luxio',23],['Mismagius',24]]},
 'larry-gym':{flag:'larryClear',id:'LARRY',name:'Larry',badge:'Normal Badge',gate:'ionoClear',
  trainers:[[['Dudunsparce',34]],[['Komala',34]]],
  team:[['Komala',35],['Dudunsparce',35],['Staraptor',36]]},
 'ryme-gym':{flag:'rymeClear',id:'RYME',name:'Ryme',badge:'Ghost Badge',gate:'larryClear',
  trainers:[[['Banette',40]],[['Mimikyu',41]]],
  team:[['Banette',41],['Mimikyu',41],['Houndstone',41],['Toxtricity',42]]},
 'tulip-gym':{flag:'tulipClear',id:'TULIP',name:'Tulip',badge:'Psychic Badge',gate:'rymeClear',
  trainers:[[['Espathra',44]],[['Gardevoir',44]]],
  team:[['Farigiraf',44],['Gardevoir',44],['Espathra',44],['Florges',45]]},
 'grusha-gym':{flag:'grushaClear',id:'GRUSHA',name:'Grusha',badge:'Ice Badge',gate:'tulipClear',
  trainers:[[['Snom',46]],[['Beartic',46]]],
  team:[['Frosmoth',47],['Beartic',47],['Cetitan',47],['Altaria',48]]}
};
const TITANS={
 orthworm:{name:'Lurking Steel Titan Orthworm',sp:'Orthworm',levels:[28,29],
  first:'orthwormFirst',clear:'orthwormClear',herb:'herbaOrthworm',ride:'rideJump',type:'Salty'},
 quaking:{name:'Quaking Earth Titan',sp:'Great Tusk',levels:[44,45],
  first:'quakingFirst',clear:'quakingClear',herb:'herbaQuaking',ride:'rideGlide',type:'Sour'},
 falseDragon:{name:'False Dragon Titan',sp:'Dondozo',levels:[55,56],
  first:'falseDragonFirst',clear:'falseDragonClear',herb:'herbaFalseDragon',ride:'rideClimb',type:'Spicy'}
};
const LEAGUE=[
 ['leagueRika','ELITE_RIKA','Elite Four Rika',[['Whiscash',57],['Camerupt',57],['Donphan',57],['Clodsire',58]]],
 ['leaguePoppy','ELITE_POPPY','Elite Four Poppy',[['Copperajah',58],['Corviknight',58],['Bronzong',58],['Tinkaton',59]]],
 ['leagueLarry','ELITE_LARRY','Elite Four Larry',[['Tropius',59],['Staraptor',59],['Altaria',59],['Flamigo',60]]],
 ['leagueHassel','ELITE_HASSEL','Elite Four Hassel',[['Noivern',60],['Haxorus',60],['Dragalge',60],['Baxcalibur',61]]]
];
function create(env,{fight}){
 const p=()=>env.player(),s=()=>Paldea.state(p()),say=env.say,save=env.saveCheckpoint;
 const herbCount=()=>['herbaKlawf','herbaBombirdier','herbaOrthworm','herbaQuaking','herbaFalseDragon'].filter(k=>s()[k]).length;
 async function gym(g){
  if(!s()[g.gate]){await say('Complete the previous Victory Road challenge before facing '+g.name+'.');return;}
  if(s()[g.flag]){await say('Leader '+g.name+': Your '+g.badge+' is proof of your victory!');return;}
  for(let i=0;i<g.trainers.length;i++){
   const key=g.flag+'Trainer'+i;
   if(s()[key])continue;
   await fight(key,'GYM_'+g.id+'_TRAINER_'+i,g.name+' Gym Trainer',g.trainers[i],
    'Gym challenge trainer '+(i+1)+'/2 defeated.');
   if(!s()[key])return;
  }
  await fight(g.flag,'GYM_'+g.id,'Leader '+g.name,g.team,g.name+' awarded the '+g.badge+'!');
  if(s()[g.flag]&&!s().badges.includes(g.badge)){s().badges.push(g.badge);await save();}
 }
 async function titan(id,finish){
  const t=TITANS[id];
  if(!s().treasureHunt){await say('Begin the Treasure Hunt at the academy before facing Titans.');return;}
  if(!finish){
   if(s()[t.first]){await say('The '+t.name+' has retreated into its den. Follow it with Arven!');return;}
   await fight(t.first,'TITAN_'+id.toUpperCase()+'_1',t.name,[[t.sp,t.levels[0]]],
    t.name+' retreated! Follow its trail with Arven.');
   return;
  }
  if(!s()[t.first]){await say('Challenge the Titan outside before searching its den.');return;}
  if(!s()[t.clear]){
   const sp=id==='falseDragon'?'Tatsugiri':id==='quaking'&&s().version==='Violet'?'Iron Treads':t.sp;
   await fight(t.clear,'TITAN_'+id.toUpperCase()+'_2',t.name+' and Arven',[[sp,t.levels[1]]],
    'The Titan fell. Arven discovered another Herba Mystica!');
   if(!s()[t.clear])return;
  }
  if(!s()[t.herb]){
   s()[t.herb]=true;s()[t.ride]=true;await save();
   await say('Arven found '+t.type+' Herba Mystica! Your partner regained an ability. Titans: '+herbCount()+'/5.');
  }else await say('Arven: We already found the '+t.type+' Herba Mystica. Next Titan!');
 }
 async function league(){
  if(s().badges.length!==8){await say('The Pokémon League requires all eight Paldea Gym Badges.');return;}
  if(s().leagueClear){await say('Geeta: You have already passed the Champion Assessment. Face Nemona next!');return;}
  for(const [key,id,name,team] of LEAGUE){
   if(s()[key])continue;
   await fight(key,id,name,team,name+' was defeated in the Champion Assessment!');
   if(!s()[key])return;
  }
  await fight('leagueClear','CHAMPION_GEETA','Top Champion Geeta',
   [['Espathra',61],['Gogoat',61],['Avalugg',61],['Kingambit',62],['Glimmora',62]],
   'Geeta: Congratulations! You are now a Champion-ranked Trainer!');
 }
 async function nemona(){
  if(!s().leagueClear){await say('Nemona: Complete the Champion Assessment before our final battle!');return;}
  if(s().nemonaChampionClear){await say('Nemona: That was the best battle of my life!');return;}
  const ace={Sprigatito:'Quaquaval',Fuecoco:'Meowscarada',Quaxly:'Skeledirge'}[s().starter]||'Quaquaval';
  await fight('nemonaChampionClear','CHAMPION_NEMONA','Champion Nemona',
   [['Lycanroc',65],['Pawmot',65],['Goodra',65],['Orthworm',65],[ace,66]],
   'Nemona: Our ultimate battle was incredible! Victory Road is complete.');
  if(s().nemonaChampionClear){s().victoryRoadComplete=true;await save();}
 }
 async function arven(){
  if(herbCount()!==5){await say('Arven: Let’s find all five Herba Mystica before our final battle.');return;}
  if(s().arvenClear){await say('Arven: Mabosstiff is doing great, thanks to all the Herba Mystica.');return;}
  await fight('arvenClear','ARVEN_FINALE','Arven',
   [['Greedent',58],['Toedscruel',59],['Scovillain',60],['Cloyster',60],['Mabosstiff',63]],
   'Arven: Path of Legends is complete! Mabosstiff is feeling better. Meet me at Area Zero!');
  if(s().arvenClear){s().pathOfLegendsComplete=true;await save();}
 }
 async function zero(key){
  if(key==='zero-gateway'){
   if(!PaldeaEndgame.threePathsClear(p())){await say('Finish Victory Road, Path of Legends and Starfall Street before exploring Area Zero.');return;}
   if(!s().zeroStarted){
    const version=await env.choose('Which expedition should lead your combined Paldea story?',['Scarlet','Violet']);
    if(!['Scarlet','Violet'].includes(version))return;
    s().version=version;s().zeroStarted=true;await save();
   }
   await say('Nemona, Arven and Penny join you at the Great Crater of Paldea. The Way Home begins!');return;
  }
  if(!s().zeroStarted){await say('Meet your friends at the Area Zero gate first.');return;}
  if(key==='zero-entrance'){
   await fight('zeroUpperClear','ZERO_UPPER','Area Zero Paradox Pokémon',
    [[s().version==='Violet'?'Iron Bundle':'Scream Tail',56]],
    'Your team safely crossed the upper crater. The first Research Station is ahead.');return;
  }
  if(key==='zero-station-1'){
   if(!s().zeroUpperClear){await say('Explore the upper crater first.');return;}
   await fight('zeroStationOne','ZERO_STATION_1','Area Zero Research Station One',
    [[s().version==='Violet'?'Iron Hands':'Brute Bonnet',58]],
    'Research Station One has been reactivated.');return;
  }
  if(key==='zero-station-2'){
   if(!s().zeroStationOne){await say('Reactivate the first research station.');return;}
   await fight('zeroStationTwo','ZERO_STATION_2','Area Zero Research Station Two',
    [[s().version==='Violet'?'Iron Moth':'Flutter Mane',59]],
    'Research Station Two has been reactivated. The path to the depths opens.');return;
  }
  if(key==='zero-depths'){
   if(!s().zeroStationTwo){await say('The station locks are still active.');return;}
   await fight('zeroDepthsClear','ZERO_DEPTHS','Area Zero Crater Guardian',
    [[s().version==='Violet'?'Iron Valiant':'Roaring Moon',61]],
    'The final path to the Zero Lab is open.');return;
  }
  if(key==='zero-lab'){
   if(!s().zeroDepthsClear){await say('Reach the depths of Area Zero before entering the Zero Lab.');return;}
   if(s().theWayHomeClear){await say('The Way Home is complete. Paldea’s three stories have found their conclusion!');return;}
   const violet=s().version==='Violet';
   const team=violet?
    [['Iron Bundle',65],['Iron Hands',65],['Iron Moth',66],['Iron Valiant',66],['Miraidon',67]]:
    [['Scream Tail',65],['Brute Bonnet',65],['Flutter Mane',66],['Roaring Moon',66],['Koraidon',67]];
   await fight('theWayHomeClear','ZERO_PROFESSOR_AI','AI Professor '+(violet?'Turo':'Sada'),team,
    'The Paradise Protection Protocol is shut down. You and your friends have found The Way Home!');
   if(s().theWayHomeClear){s().paldeaClear=true;await save();}
  }
 }
 async function run(key){
  if(GYMS[key]){await gym(GYMS[key]);return true;}
  if(key==='league-gate'){
   await say(s().badges.length===8?'League staff: Eight Badges verified. Enter the Champion Assessment!':
    'League staff: Bring all eight Paldea Gym Badges to challenge the League.');return true;
  }
  if(key==='league-elite'){await league();return true;}
  if(key==='league-nemona'){await nemona();return true;}
  for(const [id,first,second] of [
   ['orthworm','orthworm-titan','orthworm-herba'],
   ['quaking','quaking-titan','quaking-herba'],
   ['falseDragon','false-dragon-titan','false-dragon-herba']
  ]){
   if(key===first){await titan(id,false);return true;}
   if(key===second){await titan(id,true);return true;}
  }
  if(key==='arven-finale'){await arven();return true;}
  if(/^zero-(gateway|entrance|station-1|station-2|depths|lab)$/.test(key)){await zero(key);return true;}
  return false;
 }
 return{run};
}
window.PaldeaEndgameStory={create};
})();