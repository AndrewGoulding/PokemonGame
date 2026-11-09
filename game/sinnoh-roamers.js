// Source route graph; old roaming identities/HP/status stay in their existing records.
(function(){
 'use strict';
 const graph=()=>PLATINUM_DATA.roaming,active=p=>{const q=(p.flags.sinnoh||{}).sidequests||{};return[...(q.mespritRoaming&&!q.mespritCaught?['Mesprit']:[]),...SinnohLegends.activeSpecies(p)];},state=p=>{const s=Sinnoh.state(p);return s.tracker||(s.tracker={locations:{}});},pick=(xs,rng)=>xs[Math.floor(rng()*xs.length)];
 function ensure(p){const list=active(p);if(!list.length&&!p.flags.sinnoh?.tracker)return null;const s=state(p),keys=Object.keys(graph());s.locations=s.locations||{};for(const sp of list)if(!graph()[s.locations[sp]]){const seed=((p.trainerId>>>0)+[...sp].reduce((n,c)=>n+c.charCodeAt(0),0)*7919)>>>0;s.locations[sp]=keys[seed%keys.length];}for(const sp of Object.keys(s.locations))if(!list.includes(sp))delete s.locations[sp];return s;}
 function eligible(map){return Object.values(graph()).some(n=>n.map===map);}
 function move(p,sp,rng=Math.random,random=false,avoidMap=null){const s=ensure(p);if(!s||!s.locations[sp])return;const old=s.locations[sp],node=graph()[old],all=Object.keys(graph()),near=node.nearby;let candidates=(random||rng()<1/16?all:near).filter(k=>k!==old&&graph()[k].map!==s.previousMap&&graph()[k].map!==avoidMap);if(!candidates.length)candidates=all.filter(k=>k!==old);s.locations[sp]=pick(candidates,rng);}
 function travel(p,map,rng=Math.random,random=false){if(!Sinnoh.owns(map))return;const s=ensure(p);if(!s||s.lastMap===map)return;if(s.lastMap){s.previousMap=s.lastMap;for(const sp of active(p))move(p,sp,rng,random);}s.lastMap=map;}
 function onMap(p,map,rng=Math.random){const s=p.flags.sinnoh?.tracker;if(s&&s.lastMap&&s.lastMap!==map){const a=WORLD_MAPS[s.lastMap],b=WORLD_MAPS[map],connected=a&&b&&(a.connections||[]).some(c=>c.map===map);travel(p,map,rng,!connected);}else travel(p,map,rng);}
 function wild(p,mon,table,rng=Math.random){const m=WORLD_MAPS[p.location.map];if(!mon||!m||!eligible(m.name)||(table!==m.wild&&table!==m.water))return mon;const s=ensure(p);if(!s)return mon;const here=active(p).filter(sp=>graph()[s.locations[sp]].map===m.name);if(!here.length||rng()>=.5)return mon;const sp=pick(here,rng);return{species:sp,level:sp==='Mesprit'?50:PLATINUM_DATA.legends.encounters[sp].level};}
 function after(p,sp){if(active(p).includes(sp))move(p,sp,Math.random,true,p.location.map);else ensure(p);}
 function locations(p){const s=ensure(p);return s?active(p).map(species=>({species,key:s.locations[species],...graph()[s.locations[species]]})):[];}
 window.SinnohRoamers={active,state,ensure,eligible,move,travel,onMap,wild,after,locations};
})();
