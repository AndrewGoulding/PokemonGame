// Hidden Treasure of Area Zero regional map gates, independent of Gym badges.
(function(){
'use strict';
const D=window.PALDEA_DATA;if(!window.Paldea||!D?.dlc)return;
const names=new Set(D.dlc.mapNames);
const requirements={
 PaldeaKitakamiBus:'paldeaClear',
 PaldeaMossuiTown:'tealArrival',PaldeaCommunityCenter:'tealArrival',
 PaldeaAppleHills:'tealCarmineClear',PaldeaLoyaltyPlaza:'tealFestival',
 PaldeaOniMountain:'tealFestival',PaldeaCrystalPool:'tealFestival',
 PaldeaDreadedDen:'tealLoyalThree',
 PaldeaBlueberryDock:'tealClear',PaldeaTerariumHub:'indigoArrival',
 PaldeaSavannaBiome:'indigoArrival',PaldeaCoastalBiome:'indigoArrival',
 PaldeaCanyonBiome:'indigoArrival',PaldeaPolarBiome:'indigoArrival',
 PaldeaLeagueClub:'indigoArrival',
 PaldeaSavannaTrial:'indigoEnrollment',PaldeaCoastalTrial:'indigoEnrollment',
 PaldeaCanyonTrial:'indigoEnrollment',PaldeaPolarTrial:'indigoEnrollment',
 PaldeaKieranArena:'indigoEliteClear',
 PaldeaUnderdepths:'indigoKieranClear',PaldeaTerapagosChamber:'indigoUnderdepthsClear'
};
const hints={
 paldeaClear:'Complete The Way Home in Paldea before the Kitakami school trip.',
 tealArrival:'Meet Briar at the Kitakami arrival point.',
 tealCarmineClear:'Battle Carmine in Mossui Town before exploring Apple Hills.',
 tealFestival:'Join Carmine and Kieran at the Mossui festival first.',
 tealLoyalThree:'Defeat the Loyal Three before approaching Ogerpon in Dreaded Den.',
 tealClear:'Finish The Teal Mask before travelling to Blueberry Academy.',
 indigoArrival:'Speak with Briar at Blueberry Academy’s dock.',
 indigoEnrollment:'Register with the Blueberry League Club before facing its Elite Four.',
 indigoEliteClear:'Defeat all four Blueberry Elite Four trainers before facing Kieran.',
 indigoKieranClear:'Defeat Champion Kieran to explore Area Zero’s Underdepths.',
 indigoUnderdepthsClear:'Follow Briar and your friends through the Underdepths first.'
};
function owns(map){return names.has(map);}
function allowed(p,map){
 if(!owns(map))return null;
 const flag=requirements[map];return flag&&!Paldea.peek(p)[flag]?hints[flag]||'Finish the previous DLC challenge.':null;
}
const center=D.maps.PaldeaCommunityCenter;
const spots=[];
for(let y=2;y<center.height-2;y++)for(let x=2;x<center.width-2;x++)
 if(!center.collision[y*center.width+x]&&!center.warps.some(w=>w.x===x&&w.y===y)&&
  !center.people.some(n=>n.x===x&&n.y===y))
  spots.push({x,y,d:Math.abs(x-9)+Math.abs(y-12)});
spots.sort((a,b)=>a.d-b.d);
if(!spots.length)throw Error('Kitakami Community Center has no safe healing spot');
Player.CENTERS.PaldeaCommunityCenter={map:'PaldeaCommunityCenter',
 x:spots[0].x,y:spots[0].y,facing:'up'};
window.PaldeaDlc={owns,allowed};
})();