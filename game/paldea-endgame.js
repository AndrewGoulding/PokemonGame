// Victory Road, Path of Legends and Area Zero gates, save-backed regional centers.
(function(){
'use strict';
const D=window.PALDEA_DATA;if(!window.Paldea||!D?.endgame)return;
const names=new Set(D.endgame.mapNames);
const requirements={
 PaldeaLevinciaRoad:'treasureHunt',PaldeaLevincia:'treasureHunt',
 PaldeaLevinciaGym:'treasureHunt',PaldeaLevinciaCenter:'treasureHunt',
 PaldeaMedaliRoad:'ionoClear',PaldeaMedali:'ionoClear',
 PaldeaMedaliGym:'ionoClear',PaldeaMedaliCenter:'ionoClear',
 PaldeaMonteneveraRoad:'larryClear',PaldeaMontenevera:'larryClear',
 PaldeaMonteneveraGym:'larryClear',PaldeaMonteneveraCenter:'larryClear',
 PaldeaAlfornadaRoad:'rymeClear',PaldeaAlfornada:'rymeClear',
 PaldeaAlfornadaGym:'rymeClear',PaldeaAlfornadaCenter:'rymeClear',
 PaldeaGlaseadoRoad:'tulipClear',PaldeaGlaseado:'tulipClear',
 PaldeaGlaseadoGym:'tulipClear',PaldeaGlaseadoCenter:'tulipClear',
 PaldeaLeagueRoad:'grushaClear',PaldeaLeagueGate:'grushaClear',PaldeaLeagueHall:'leagueReady',
 PaldeaSteelTrail:'treasureHunt',PaldeaSteelCave:'orthwormFirst',
 PaldeaEarthTrail:'treasureHunt',PaldeaEarthDen:'quakingFirst',
 PaldeaDragonTrail:'treasureHunt',PaldeaDragonLake:'falseDragonFirst',
 PaldeaAreaZeroGate:'threePathsClear',PaldeaAreaZeroUpper:'zeroStarted',
 PaldeaResearchOne:'zeroUpperClear',PaldeaResearchTwo:'zeroStationOne',
 PaldeaAreaZeroDepths:'zeroStationTwo',PaldeaZeroLab:'zeroDepthsClear'
};
const hints={
 treasureHunt:'Begin your Treasure Hunt at the academy first.',
 ionoClear:'Defeat Iono in Levincia before travelling onward to Medali.',
 larryClear:'Defeat Larry in Medali before travelling onward to Montenevera.',
 rymeClear:'Defeat Ryme in Montenevera before travelling onward to Alfornada.',
 tulipClear:'Defeat Tulip in Alfornada before travelling onward to Glaseado Mountain.',
 grushaClear:'Defeat Grusha on Glaseado Mountain to unlock the League route.',
 leagueReady:'Collect all eight Paldea Gym Badges before entering the Pokémon League.',
 orthwormFirst:'Challenge the Lurking Steel Titan before searching its cave.',
 quakingFirst:'Challenge the Quaking Earth Titan before searching its den.',
 falseDragonFirst:'Challenge the False Dragon Titan before entering its nest.',
 threePathsClear:'Finish Victory Road, all five Titans, Starfall Street and Arven’s story before Area Zero.',
 zeroStarted:'Meet your friends at the Area Zero gate first.',
 zeroUpperClear:'Explore Upper Area Zero with your friends before the first station.',
 zeroStationOne:'Reactivate Research Station One first.',
 zeroStationTwo:'Reactivate Research Station Two first.',
 zeroDepthsClear:'Reach the bottom of the crater before entering the Zero Lab.'
};
function owns(map){return names.has(map);}
function threePathsClear(p){
 const s=Paldea.peek(p);
 return !!(s.nemonaChampionClear&&s.arvenClear&&s.starfallComplete&&
  s.herbaKlawf&&s.herbaBombirdier&&s.herbaOrthworm&&s.herbaQuaking&&s.herbaFalseDragon);
}
function allowed(p,map){
 if(!owns(map))return null;
 const key=requirements[map],s=Paldea.peek(p);
 if(key==='threePathsClear')return threePathsClear(p)?null:hints[key];
 if(key==='leagueReady')return s.badges?.length===8?null:hints[key];
 return key&&!s[key]?hints[key]:null;
}
for(const map of D.endgame.centers){
 const m=D.maps[map],spots=[];
 for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++)
  if(!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(n=>n.x===x&&n.y===y))
   spots.push({x,y,d:Math.abs(x-9)+Math.abs(y-12)});
 spots.sort((a,b)=>a.d-b.d);
 if(!spots.length)throw Error('No safe Paldea endgame Center tile '+map);
 Player.CENTERS[map]={map,x:spots[0].x,y:spots[0].y,facing:'up'};
}
window.PaldeaEndgame={owns,allowed,threePathsClear};
})();
