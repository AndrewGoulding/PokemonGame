// Galar midgame story gates and caps: one combined Sword/Shield campaign.
(function(){
'use strict';
if(!window.Galar||!window.GALAR_DATA?.midgame)return;
const names=new Set(GALAR_DATA.midgame.mapNames),owns=map=>names.has(map);
const gates={
 GalarWildAreaNorth:'kabuClear',GalarHammerlocke:'kabuClear',
 GalarRoute6:'hopHammerlocke',GalarStowOnSide:'yellRoute6',GalarStowCenter:'yellRoute6',GalarStowStadium:'yellRoute6',
 GalarStowOutskirts:'stowClear',GalarGlimwoodTangle:'bedeStow',GalarBallonlea:'bedeStow',GalarBallonleaCenter:'bedeStow',GalarBallonleaStadium:'bedeStow',
 GalarRoute7:'opalClear',GalarRoute8:'hopRoute7',
 GalarCirchester:'hopRoute7',GalarCirchesterCenter:'hopRoute7',GalarCirchesterStadium:'hopRoute7',
 GalarRoute9:'circhesterClear',GalarSpikemuth:'yellRoute9',GalarSpikemuthCenter:'yellRoute9',GalarSpikemuthGym:'marnieSpikemuth',
 GalarRoute9Tunnel:'piersClear',GalarHammerlockeGate:'kabuClear',GalarHammerlockeCenter:'kabuClear',
 GalarHammerlockeStadium:'piersClear'
};
const hints={
 kabuClear:'Defeat Kabu at Motostoke Stadium before traveling north.',
 hopHammerlocke:'Meet Hop in Hammerlocke before exploring Route 6.',
 yellRoute6:'Defeat Team Yell on Route 6 to enter Stow-on-Side.',
 stowClear:'Earn the Fighting and Ghost trials’ shared Stow-on-Side Gym Badge.',
 bedeStow:'Battle Bede outside Stow-on-Side before entering Glimwood Tangle.',
 opalClear:'Defeat Opal in Ballonlea Stadium.',
 hopRoute7:'Battle Hop on Route 7 before traveling to Circhester.',
 circhesterClear:'Complete the Rock and Ice trials at Circhester Stadium.',
 yellRoute9:'Clear Team Yell from Route 9 before entering Spikemuth.',
 marnieSpikemuth:'Battle Marnie in Spikemuth before challenging Piers.',
 piersClear:'Defeat Piers at the Spikemuth Gym.'
};
function allowed(p,map){
 if(!owns(map))return null;
 const flag=gates[map],s=Galar.peek(p);
 return flag&&!s[flag]?hints[flag]:null;
}
function cap(p){
 const s=Galar.peek(p);
 return s.raihanClear?80:s.piersClear?70:s.circhesterClear?65:s.opalClear?60:s.stowClear?55:s.kabuClear?45:Galar.peek(p).kabuClear?45:35;
}
const centers=GALAR_DATA.midgame.centers;
for(const name of centers){
 const m=WORLD_MAPS[name];
 const at=(()=>{const all=[];for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++)
 if(!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y))
 all.push({x,y,d:Math.abs(x-9)+Math.abs(y-12)});all.sort((a,b)=>a.d-b.d);return all[0];})();
 if(!at)throw Error('No safe Galar Pokémon Center '+name);
 Player.CENTERS[name]={map:name,x:at.x,y:at.y,facing:'up'};
}
window.GalarMid={owns,allowed,cap,centers};
})();
