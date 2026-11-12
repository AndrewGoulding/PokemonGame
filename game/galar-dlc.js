// Isle of Armor and Crown Tundra gates; one combined Sword and Shield campaign.
(function(){
'use strict';
const D=window.GALAR_DATA;if(!window.Galar||!D?.dlc)return;
const armor=new Set(D.dlc.armorNames),crown=new Set(D.dlc.crownNames);
const owns=map=>armor.has(map)||crown.has(map);
const gates={
 GalarMasterDojo:'armorArrival',GalarTrainingLowlands:'kubfuGift',
 GalarTowerWaters:'kubfuBond',GalarTowerDarkness:'kubfuBond',
 GalarMaxSoupKitchen:'mustardTrial',GalarHoneycalmIsland:'mustardTrial',
 GalarFreezington:'crownArrival',GalarFrostpointField:'peonyMet',
 GalarMaxLair:'peonyMet',GalarGiantBed:'peonyMet',GalarOldCemetery:'calyrexMet',
 GalarSnowslideSlope:'calyrexMet',GalarCrownShrine:'reinsComplete',
 GalarCalyrexArena:'crownHorseChosen',GalarThreePointPass:'regisThree',
 GalarBallimereLake:'peonyMet'
};
const hints={
 armorArrival:'Travel from Wedgehurst to the Isle of Armor before entering the Dojo.',
 kubfuGift:'Train with Mustard and receive Kubfu before approaching the towers.',
 kubfuBond:'Complete Kubfu’s three friendship training sessions to enter a tower.',
 mustardTrial:'Clear Mustard’s training trial before gathering Max Soup ingredients.',
 crownArrival:'Take the Crown Tundra train from Wyndon.',
 peonyMet:'Meet Peony in Freezington before exploring the Tundra.',
 calyrexMet:'Speak to the mysterious king at the Crown Shrine first.',
 reinsComplete:'Investigate the royal steed and obtain the Reins of Unity.',
 crownHorseChosen:'Choose Glastrier or Spectrier and finish Calyrex’s preparations.',
 regisThree:'Challenge Regirock, Regice and Registeel before the final Regi.'
};
function allowed(p,map){
 if(!owns(map))return null;
 const s=Galar.peek(p),key=gates[map];
 return key&&!s[key]?hints[key]:null;
}
const centerNames=D.dlc.centers;
for(const name of centerNames){
 const m=WORLD_MAPS[name],options=[];
 for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++)if(!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(n=>n.x===x&&n.y===y))options.push({x,y,d:Math.abs(x-9)+Math.abs(y-12)});
 options.sort((a,b)=>a.d-b.d);if(!options.length)throw Error('No safe DLC center: '+name);
 Player.CENTERS[name]={map:name,x:options[0].x,y:options[0].y,facing:'up'};
}
window.GalarDlc={owns,allowed,armor:map=>armor.has(map),crown:map=>crown.has(map),centers:centerNames};
})();
