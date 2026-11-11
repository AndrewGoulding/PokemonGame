// Unified Ultra Alola: Ultra Sun and Ultra Moon share a single offline campaign.
(function(){
 'use strict';const D=window.ALOLA_DATA;if(!D)return;
 Object.assign(WORLD_MAPS,D.maps);
 const owns=map=>WORLD_MAPS[map]?.alolaCampaign==='ultra';
 const peek=p=>p.flags.alola||{};
 function state(p){const s=p.flags.alola||(p.flags.alola={});if(!s.visited)s.visited=[];if(!s.schoolWins)s.schoolWins=[];return s;}
 for(const m of ['AlolaHome','AlolaPokeCenter'])Player.CENTERS[m]={map:m,x:m==='AlolaHome'?10:9,y:m==='AlolaHome'?13:10,facing:'up'};
 const travel={id:'usum-travel',localId:'USUM_TRAVEL',x:30,y:27,script:'usum:travel-alola',sprite:'bw2_scientist_m_52',width:32,height:32,frames:9,movement:'face_up',rangeX:0,rangeY:0};
 if(WORLD_MAPS.FightArea&&!WORLD_MAPS.FightArea.people.some(a=>a.script===travel.script))WORLD_MAPS.FightArea.people.push(travel);
 function starter(p,name){const s=state(p);if(s.starter)return{done:true};if(!D.starters.includes(name))return{invalid:true};if(p.party.length>=Player.PARTY_SIZE)return{full:true};const mon=Party.create(name,5);mon.ot={name:p.name,id:p.trainerId};mon.met={map:'AlolaRoute1',level:5,from:'Professor Kukui',game:'ultra-alola'};p.party.push(mon);Player.markCaught(p,name);s.starter=name;p.flags.pokedex=true;p.flags.gotStarter=true;return{mon};}
 function rivalSpecies(p){return{Rowlet:'Popplio',Litten:'Rowlet',Popplio:'Litten'}[peek(p).starter]||'Popplio';}
 function rivalTeam(p,festival=false){const starter=Party.create(rivalSpecies(p),festival?8:5);return festival?[Party.create('Pichu',6),starter]:[starter];}

 function gift(p,key,id,count=1){const s=state(p);s.gifts||(s.gifts={});if(s.gifts[key])return{done:true};
  const before=Player.itemCount(p,id);
  if((Bag.isKeyItem(id)||Bag.isMachine(id))&&before){s.gifts[key]=true;return{existing:true};}
  Player.addItem(p,id,count);
  if(Player.itemCount(p,id)!==before+count){const excess=Player.itemCount(p,id)-before;if(excess>0)Player.removeItem(p,id,excess);return{full:true};}
  s.gifts[key]=true;return{item:id,count};
 }
 function trialDone(p){return !!peek(p).verdantClear;}
 function grandTrialDone(p){return !!peek(p).halaClear;}
 function allowed(p,map){if(!owns(map))return null;const s=peek(p);if(map==='AlolaIkiTown'&&!s.starter)return'Meet Professor Kukui on Route 1 and choose a Pokémon.';
  if(map==='AlolaMahaloTrail'&&!s.hauFirst)return'Battle Hau in Iki Town before visiting Mahalo Trail.';
  if(map==='AlolaTrainerSchool'&&!s.festival)return'Help Lillie and finish the Iki Town festival first.';
  if(map==='AlolaHauoliBeach'&&!s.schoolClear)return'Complete the Trainer School before exploring Hau’oli.';
  if(['AlolaHauoliCity','AlolaHauoliCenter','AlolaRoute2','AlolaBerryFields','AlolaCemetery','AlolaVerdantEntrance','AlolaVerdantCavern'].includes(map)&&!s.schoolClear)return'Finish the Trainer School first.';
  if(['AlolaRoute2','AlolaBerryFields','AlolaCemetery','AlolaVerdantEntrance','AlolaVerdantCavern'].includes(map)&&!s.ilimaWon)return'Battle Captain Ilima in Hau’oli City.';
  if(['AlolaVerdantEntrance','AlolaVerdantCavern'].includes(map)&&!s.skullRoute2)return'Drive Team Skull away from Route 2 before the trial.';
  return window.AlolaAkala?.owns(map)?window.AlolaAkala.allowed(p,map):null;}
 function visit(p,map){if(!owns(map))return;const s=state(p);if(!s.visited.includes(map))s.visited.push(map);s.resume={...p.location};}
 function cap(p){const s=peek(p);return s.halaClear&&window.AlolaAkala?window.AlolaAkala.cap(p):s.halaClear?35:s.verdantClear?25:s.schoolClear?20:s.festival?15:s.starter?12:7;}
 function sourceWild(p,r){if(!owns(p.location.map))return r;r.met={...r.met,map:p.location.map,level:r.level,game:'ultra-alola'};return r;}
 function recover(p){if(!owns(p.location?.map))return false;const m=WORLD_MAPS[p.location.map],a=p.location;
  if(a.x>=0&&a.x<m.width&&a.y>=0&&a.y<m.height&&!m.collision[a.y*m.width+a.x])return false;
  Object.assign(p.location,D.start);return true;}
 window.Alola={data:()=>D,owns,peek,state,starter,rivalSpecies,rivalTeam,gift,trialDone,grandTrialDone,allowed,visit,cap,sourceWild,recover};
})();