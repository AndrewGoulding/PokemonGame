// Team Star base entry gates are independent of Victory Road and Path of Legends.
(function(){
'use strict';
const D=window.PALDEA_DATA;if(!window.Paldea||!D?.starfall)return;
const names=new Set(D.starfall.mapNames);
const requirements={
 PaldeaSeginRoad:'treasureHunt',
 PaldeaSeginBase:'treasureHunt',
 PaldeaSeginGarage:'seginChallengeClear',
 PaldeaSchedarRoad:'treasureHunt',
 PaldeaSchedarBase:'treasureHunt',
 PaldeaSchedarGarage:'schedarChallengeClear',
 PaldeaNaviRoad:'treasureHunt',PaldeaNaviBase:'treasureHunt',PaldeaNaviGarage:'naviChallengeClear',
 PaldeaRuchbahRoad:'treasureHunt',PaldeaRuchbahBase:'treasureHunt',PaldeaRuchbahGarage:'ruchbahChallengeClear',
 PaldeaCaphRoad:'treasureHunt',PaldeaCaphBase:'treasureHunt',PaldeaCaphGarage:'caphChallengeClear',
 PaldeaAcademyCourtyard:'starfallAllClear'
};
const hints={
 treasureHunt:'Begin the Treasure Hunt at the academy to start Starfall Street.',
 seginChallengeClear:'Defeat the Segin Squad gatekeeper and clear its base challenge first.',
 schedarChallengeClear:'Defeat the Schedar Squad gatekeeper and clear its base challenge first.',
 naviChallengeClear:'Clear the Navi Squad gatekeeper and its base challenge first.',
 ruchbahChallengeClear:'Clear the Ruchbah Squad gatekeeper and its base challenge first.',
 caphChallengeClear:'Clear the Caph Squad gatekeeper and its base challenge first.',
 starfallAllClear:'Defeat all five Team Star bosses to open the academy courtyard finale.'
};
function owns(map){return names.has(map);}
function allowed(p,map){
 if(!owns(map))return null;
 const key=requirements[map];return key&&!Paldea.peek(p)[key]?hints[key]:null;
}
window.PaldeaStarfall={owns,allowed};
})();