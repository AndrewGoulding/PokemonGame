// Mount Lanakila, Alola League and postgame progression gates.
(function(){
'use strict';
if(!window.Alola||!window.ALOLA_DATA?.league)return;
const names=new Set(ALOLA_DATA.league.mapNames),owns=m=>names.has(m);
const postgame=new Set(['AlolaPostgamePort','AlolaBattleTree','AlolaRRBase','AlolaRRLab','AlolaRRBoss','AlolaBeastStation']);
const gates={
 AlolaLanakilaSlope:'lanakilaHau',AlolaLanakilaCave:'lanakilaHau',
 AlolaLanakilaSummit:'lanakilaHau',AlolaLeagueLobby:'lanakilaHau',AlolaLeagueRest:'lanakilaHau',
 AlolaEliteMolayne:'leagueRegistered',AlolaEliteOlivia:'eliteMolayneWon',
 AlolaEliteAcerola:'eliteOliviaWon',AlolaEliteKahili:'eliteAcerolaWon',
 AlolaChampionRoom:'eliteKahiliWon',AlolaHallOfFame:'championWon',
 AlolaRRLab:'rrMaxieWon',AlolaRRBoss:'rrLysandreWon'
};
const hints={
 lanakilaHau:'Defeat Hau on Mount Lanakila before approaching the Pokémon League.',
 leagueRegistered:'Register at the Pokémon League lobby before entering the Elite Four.',
 eliteMolayneWon:'Defeat Elite Four Molayne first.',
 eliteOliviaWon:'Defeat Elite Four Olivia first.',
 eliteAcerolaWon:'Defeat Elite Four Acerola first.',
 eliteKahiliWon:'Defeat Elite Four Kahili first.',
 championWon:'Defeat Champion challenger Hau to enter the Hall of Fame.',
 rrMaxieWon:'Defeat Archie and Maxie before entering Rainbow Rocket’s laboratory.',
 rrLysandreWon:'Defeat all five Rainbow Rocket commanders to reach Giovanni.'
};
function allowed(p,map){
 if(!owns(map))return null;
 const s=Alola.peek(p);
 if(!s.minaClear)return'Finish Mina’s Poni Island trial before heading to Mount Lanakila.';
 if(postgame.has(map)&&!s.championClear)return'Become Alola Champion before exploring the postgame.';
 const key=gates[map];
 return key&&!s[key]?hints[key]:null;
}
function cap(p){return Alola.peek(p).championClear?100:AlolaPoni.cap(p);}
for(const map of ['AlolaLanakilaCenter','AlolaLeagueRest'])Player.CENTERS[map]={map,x:9,y:12,facing:'up'};
window.AlolaLeague={owns,allowed,cap,postgame:map=>postgame.has(map)};
})();
