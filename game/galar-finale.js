// Unified Sword/Shield finale gates, safe Wyndon respawn and level caps.
(function(){
'use strict';
if(!window.Galar||!window.GALAR_DATA?.finale)return;
const names=new Set(GALAR_DATA.finale.mapNames),owns=name=>names.has(name);
const requirements={
 GalarRoute10:'raihanClear',GalarWyndonWest:'raihanClear',GalarWyndonHotel:'raihanClear',
 GalarWyndonCity:'raihanClear',GalarWyndonCenter:'raihanClear',GalarWyndonStadium:'raihanClear',
 GalarRoseTower:'cupHopWon',GalarRoseTowerTop:'macroCosmosWon',
 GalarEnergyPlant:'oleanaWon',GalarEternatusChamber:'roseWon',
 GalarBattleTower:'championClear',GalarSlumberingDepths:'championClear',GalarWealdShrine:'postgameHopWon'
};
const hints={
 raihanClear:'Earn Raihan’s Dragon Badge before Route 10 and Wyndon.',
 cupHopWon:'Win the Champion Cup preliminary matches against Marnie and Hop.',
 macroCosmosWon:'Defeat the Macro Cosmos security team inside Rose Tower.',
 oleanaWon:'Defeat Oleana at the Rose Tower summit.',
 roseWon:'Defeat Chairman Rose at the Energy Plant to reach Eternatus.',
 championClear:'Become Galar Champion before exploring postgame challenges.',
 postgameHopWon:'Battle Hop in the deep Slumbering Weald before reaching the shrine.'
};
function allowed(p,map){
 if(!owns(map))return null;
 const s=Galar.peek(p),key=requirements[map];
 return key&&!s[key]?hints[key]:null;
}
function cap(p){const s=Galar.peek(p);return s.championClear?100:s.eternatusClear?90:s.cupFinalistsClear?85:s.cupHopWon?82:GalarMid.cap(p);}
for(const name of GALAR_DATA.finale.centers){
 const m=WORLD_MAPS[name],options=[];
 for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++){
  if(m.collision[y*m.width+x]||m.warps.some(w=>w.x===x&&w.y===y)||m.people.some(n=>n.x===x&&n.y===y))continue;
  options.push({x,y,d:Math.abs(x-9)+Math.abs(y-12)});
 }
 options.sort((a,b)=>a.d-b.d);
 if(!options.length)throw Error('No safe Wyndon Pokémon Center tile');
 Player.CENTERS[name]={map:name,x:options[0].x,y:options[0].y,facing:'up'};
}
window.GalarFinale={owns,allowed,cap};
})();
