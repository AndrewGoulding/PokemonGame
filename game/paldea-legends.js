// Path of Legends area eligibility. All Titan flags live in player.flags.paldea.
(function(){
'use strict';
if(!window.Paldea||!window.PALDEA_DATA?.legends)return;
const names=new Set(PALDEA_DATA.legends.mapNames);
const requirements={
 PaldeaStonyCliff:'treasureHunt',PaldeaStonyCave:'klawfFirst',
 PaldeaOpenSkyTrail:'treasureHunt',PaldeaOpenSkySummit:'klawfClear'
};
const hints={
 treasureHunt:'Begin your Treasure Hunt at the academy before seeking Titans.',
 klawfFirst:'Face the Stony Cliff Titan before entering its cave.',
 klawfClear:'Help Arven find the first Herba Mystica before scaling Open Sky.'
};
function owns(map){return names.has(map);}
function allowed(p,map){
 if(!owns(map))return null;
 const flag=requirements[map];return flag&&!Paldea.peek(p)[flag]?hints[flag]:null;
}
window.PaldeaLegends={owns,allowed};
})();