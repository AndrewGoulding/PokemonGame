// Shared Sword and Shield Galar campaign state, travel, gates and level caps.
(function(){
'use strict';
const D=window.GALAR_DATA;if(!D)return;
Object.assign(WORLD_MAPS,D.maps);
const owns=map=>WORLD_MAPS[map]?.galarCampaign==='sword-shield';
const peek=p=>p.flags.galar||{};
function state(p){const s=p.flags.galar||(p.flags.galar={});s.visited||(s.visited=[]);s.badges||(s.badges=[]);s.gifts||(s.gifts={});return s;}
const centers=['GalarHome','GalarMotostokeCenter','GalarTurffieldCenter','GalarHulburyCenter'];
function safeTile(m,x,y){
 const safe=(a,b)=>a>=1&&b>=1&&a<m.width-1&&b<m.height-1&&
  !m.collision[b*m.width+a]&&!m.warps.some(w=>w.x===a&&w.y===b)&&
  !(m.people||[]).some(p=>p.x===a&&p.y===b);
 if(safe(x,y))return{x,y};
 const found=[];for(let py=1;py<m.height-1;py++)for(let px=1;px<m.width-1;px++)
  if(safe(px,py))found.push({x:px,y:py,dist:Math.abs(px-x)+Math.abs(py-y)});
 found.sort((a,b)=>a.dist-b.dist);
 if(!found.length)throw Error('No safe Galar tile on '+m.name);
 return found[0];
}
for(const map of centers){
 const m=WORLD_MAPS[map],desired=map==='GalarHome'?D.start:{x:9,y:12};
 const at=safeTile(m,desired.x,desired.y);
 Player.CENTERS[map]={map,x:at.x,y:at.y,facing:'up'};
}
const travel={id:'galar-researcher',localId:'SWSH_GALAR_TRAVEL',x:26,y:25,script:'swsh:travel-galar',sprite:'bw2_scientist_f_46',width:32,height:32,frames:9,movement:'face_up',rangeX:0,rangeY:0};
if(WORLD_MAPS.FightArea&&!WORLD_MAPS.FightArea.people.some(a=>a.script===travel.script)){
 const at=safeTile(WORLD_MAPS.FightArea,travel.x,travel.y);
 Object.assign(travel,at);WORLD_MAPS.FightArea.people.push(travel);
}
function starter(p,species){
 const s=state(p);if(s.starter)return{done:true};
 if(!D.starters.includes(species))return{invalid:true};
 if(p.party.length>=Player.PARTY_SIZE)return{full:true};
 const mon=Party.create(species,5);
 mon.ot={name:p.name,id:p.trainerId};
 mon.met={map:'GalarHopHouse',level:5,from:'Champion Leon',game:'galar-sword-shield'};
 p.party.push(mon);Player.markCaught(p,species);
 s.starter=species;p.flags.gotStarter=true;p.flags.pokedex=true;
 return{mon};
}
const rivalSpecies=p=>({Grookey:'Sobble',Scorbunny:'Grookey',Sobble:'Scorbunny'})[peek(p).starter]||'Sobble';
function gift(p,key,item,count=1){
 const s=state(p);
 if(s.gifts[key])return{done:true};
 const before=Player.itemCount(p,item);
 if((Bag.isKeyItem(item)||Bag.isMachine(item))&&before){s.gifts[key]=true;return{existing:true};}
 Player.addItem(p,item,count);
 if(Player.itemCount(p,item)!==before+count){
  const excess=Player.itemCount(p,item)-before;if(excess>0)Player.removeItem(p,item,excess);
  return{full:true};
 }
 s.gifts[key]=true;return{item,count};
}
const open={
 GalarRoute1:'wealdClear',GalarWedgehurst:'wealdClear',GalarSoniaLab:'wealdClear',
 GalarRoute2:'soniaMet',GalarMagnoliaHouse:'soniaMet',
 GalarWildAreaSouth:'endorsement',GalarMotostoke:'endorsement',GalarMotostokeCenter:'endorsement',GalarMotostokeStadium:'endorsement',
 GalarRoute3:'ceremony',GalarGalarMine:'ceremony',GalarRoute4:'bedeMineWon',
 GalarTurffield:'bedeMineWon',GalarTurffieldCenter:'bedeMineWon',GalarTurffieldStadium:'bedeMineWon',
 GalarRoute5:'miloClear',GalarHulbury:'miloClear',GalarHulburyCenter:'miloClear',GalarHulburyStadium:'miloClear',
 GalarGalarMine2:'nessaClear',GalarMotostokeOutskirts:'nessaClear'
};
const hints={
 wealdClear:'Help Hop investigate Slumbering Weald before leaving Postwick.',
 soniaMet:'Meet Sonia at the Pokémon Research Lab in Wedgehurst.',
 endorsement:'Battle Hop and meet Professor Magnolia on Route 2 before the Wild Area.',
 ceremony:'Register for the Gym Challenge at Motostoke Stadium first.',
 bedeMineWon:'Defeat Bede in the Galar Mine before visiting Turffield.',
 miloClear:'Beat Milo at Turffield Stadium before Route 5.',
 nessaClear:'Defeat Nessa at Hulbury Stadium before entering the second Galar Mine.'
};
function allowed(p,map){
 if(!owns(map))return null;
 const s=peek(p);
 if(map==='GalarSlumberingWeald'&&!s.hopFirst)return'Battle Hop at his house before entering Slumbering Weald.';
 if(map==='GalarHopHouse'&&!s.hopMet)return'Meet Hop in Postwick first.';
 if(window.GalarMid?.owns(map))return window.GalarMid.allowed(p,map);
 const flag=open[map];return flag&&!s[flag]?hints[flag]:null;
}
function cap(p){const s=peek(p);return s.kabuClear&&window.GalarMid?window.GalarMid.cap(p):s.kabuClear?45:s.nessaClear?35:s.miloClear?30:s.ceremony?25:s.endorsement?20:s.wealdClear?15:s.starter?12:7;}
function visit(p,map){if(!owns(map))return;const s=state(p);if(!s.visited.includes(map))s.visited.push(map);s.resume={...p.location};}
function recover(p){if(!owns(p.location?.map))return false;const m=WORLD_MAPS[p.location.map],a=p.location;if(a.x>=0&&a.y>=0&&a.x<m.width&&a.y<m.height&&!m.collision[a.y*m.width+a.x])return false;Object.assign(a,D.start);return true;}
function sourceWild(p,mon){if(!owns(p.location?.map))return mon;mon.met={...mon.met,map:p.location.map,level:mon.level,game:'galar-sword-shield'};return mon;}
window.Galar={data:()=>D,owns,peek,state,starter,rivalSpecies,gift,allowed,cap,visit,recover,sourceWild};
})();
