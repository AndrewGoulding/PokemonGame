// Paldea regional state, travel, progression and recovery.
(function(){
'use strict';
const D=window.PALDEA_DATA;if(!D)return;
Object.assign(WORLD_MAPS,D.maps);
const owns=map=>WORLD_MAPS[map]?.paldeaCampaign==='scarlet-violet';
const peek=p=>p.flags.paldea||{};
function state(p){
 const s=p.flags.paldea||(p.flags.paldea={});
 s.visited||(s.visited=[]);s.badges||(s.badges=[]);s.gifts||(s.gifts={});
 return s;
}
function safe(m,x,y){
 const free=(a,b)=>a>=1&&b>=1&&a<m.width-1&&b<m.height-1&&!m.collision[b*m.width+a]&&
  !m.warps.some(w=>w.x===a&&w.y===b)&&!m.people.some(p=>p.x===a&&p.y===b);
 if(free(x,y))return{x,y};
 const slots=[];for(let y=1;y<m.height-1;y++)for(let x=1;x<m.width-1;x++)
  if(free(x,y))slots.push({x,y,d:Math.abs(x-(m.width/2))+Math.abs(y-(m.height/2))});
 slots.sort((a,b)=>a.d-b.d);if(!slots.length)throw Error('Paldea map blocked '+m.name);return slots[0];
}
for(const map of ['PaldeaHome','PaldeaLosPlatosCenter','PaldeaMesagozaCenter']){
 const m=WORLD_MAPS[map],p=safe(m,9,12);
 Player.CENTERS[map]={map,x:p.x,y:p.y,facing:'up'};
}
const fight=WORLD_MAPS.FightArea;
if(fight&&!fight.people.some(p=>p.script==='sv:travel')){
 const a=safe(fight,24,23);
 fight.people.push({id:'paldea-researcher',localId:'SV_TRAVEL',x:a.x,y:a.y,script:'sv:travel',
  sprite:'bw2_scientist_f_46',width:32,height:32,frames:9,movement:'face_up',rangeX:0,rangeY:0});
}
function starter(p,species){
 const s=state(p);if(s.starter)return{done:true};
 if(!D.starters.includes(species))return{invalid:true};
 if(p.party.length>=Player.PARTY_SIZE)return{full:true};
 const mon=Party.create(species,5);mon.ot={name:p.name,id:p.trainerId};
 mon.met={map:'PaldeaCaboPoco',level:5,from:'Director Clavell',game:'paldea-scarlet-violet'};
 p.party.push(mon);Player.markCaught(p,species);s.starter=species;
 p.flags.gotStarter=true;p.flags.pokedex=true;return{mon};
}
const nemonaSpecies=p=>({Sprigatito:'Quaxly',Fuecoco:'Sprigatito',Quaxly:'Fuecoco'})[peek(p).starter]||'Quaxly';
const requirements={
 PaldeaPocoPath:'starter',PaldeaInletGrotto:'nemonaFirst',PaldeaLighthouse:'legendaryMet',
 PaldeaLosPlatos:'arvenMet',PaldeaLosPlatosCenter:'arvenMet',
 PaldeaSouthProvince:'arvenMet',PaldeaMesagoza:'nemonaRoute',PaldeaAcademy:'nemonaMesagoza',
 PaldeaMesagozaCenter:'nemonaMesagoza',PaldeaCortondo:'treasureHunt',
 PaldeaCortondoGym:'treasureHunt'
};
const hints={
 starter:'Choose a Paldea partner from Director Clavell in Cabo Poco.',
 nemonaFirst:'Battle Nemona along Poco Path.',
 legendaryMet:'Help the mysterious Pokémon in Inlet Grotto.',
 arvenMet:'Meet Arven at the lighthouse before heading to Los Platos.',
 nemonaRoute:'Battle Nemona on South Province (Area One).',
 nemonaMesagoza:'Meet Nemona in Mesagoza before entering the academy.',
 treasureHunt:'Talk to Director Clavell at the academy to begin the Treasure Hunt.'
};
function allowed(p,map){if(!owns(map))return null;if(window.PaldeaMid?.owns(map))return PaldeaMid.allowed(p,map);const key=requirements[map];return key&&!peek(p)[key]?hints[key]:null;}
function cap(p){const s=peek(p);return s.kofuClear?45:s.brassiusClear?36:s.katyClear?30:s.treasureHunt?23:s.nemonaRoute?20:s.nemonaFirst?16:s.starter?12:7;}
function visit(p,map){if(!owns(map))return;const s=state(p);if(!s.visited.includes(map))s.visited.push(map);s.resume={...p.location};}
function recover(p){
 if(!owns(p.location?.map))return false;
 const m=WORLD_MAPS[p.location.map],a=p.location;
 const free=(x,y)=>x>=0&&y>=0&&x<m.width&&y<m.height&&!m.collision[y*m.width+x]&&
  !m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(v=>v.x===x&&v.y===y);
 if(free(a.x,a.y))return false;
 const at=safe(m,a.x,a.y);a.x=at.x;a.y=at.y;return true;
}
function sourceWild(p,mon){if(owns(p.location?.map))mon.met={...mon.met,map:p.location.map,level:mon.level,game:'paldea-scarlet-violet'};return mon;}
window.Paldea={data:()=>D,owns,peek,state,starter,nemonaSpecies,allowed,cap,visit,recover,sourceWild};
})();