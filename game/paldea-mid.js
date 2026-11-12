// Paldea Victory Road midgame: Artazon and Cascarrafa gates and respawns.
(function(){
'use strict';
if(!window.Paldea||!window.PALDEA_DATA?.midgame)return;
const D=PALDEA_DATA, names=new Set(D.midgame.mapNames);
const requirements={
 PaldeaEastProvince:'treasureHunt',
 PaldeaArtazon:'treasureHunt',
 PaldeaArtazonCenter:'treasureHunt',
 PaldeaArtazonGym:'treasureHunt',
 PaldeaWestProvince:'katyClear',
 PaldeaCascarrafa:'brassiusClear',
 PaldeaCascarrafaCenter:'brassiusClear',
 PaldeaCascarrafaGym:'brassiusClear'
};
const hints={
 treasureHunt:'Begin the Treasure Hunt with Director Clavell first.',
 katyClear:'Earn Katy’s Bug Badge to travel into West Province.',
 brassiusClear:'Defeat Brassius in Artazon before challenging Cascarrafa.'
};
const owns=map=>names.has(map);
function allowed(p,map){
 if(!owns(map))return null;
 const flag=requirements[map];return flag&&!Paldea.peek(p)[flag]?hints[flag]:null;
}
for(const map of D.midgame.centers){
 const m=WORLD_MAPS[map],options=[];
 for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++)
  if(!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(n=>n.x===x&&n.y===y))
   options.push({x,y,d:Math.abs(x-9)+Math.abs(y-12)});
 options.sort((a,b)=>a.d-b.d);
 if(!options.length)throw Error('Paldea midgame Pokémon Center has no safe tile '+map);
 Player.CENTERS[map]={map,x:options[0].x,y:options[0].y,facing:'up'};
}
window.PaldeaMid={owns,allowed};
})();