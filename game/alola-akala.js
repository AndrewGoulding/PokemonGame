// Akala Island story gates and regional save progress, independent of the other regions.
(function(){
'use strict';if(!window.Alola||!window.ALOLA_DATA?.akala)return;
const names=new Set(ALOLA_DATA.akala.mapNames);
const owns=map=>names.has(map);
const state=p=>Alola.state(p),peek=p=>Alola.peek(p);
const open={
 AlolaHeaheaCity:null,AlolaHeaheaHotel:null,AlolaHeaheaCenter:null,
 AlolaRoute4:'hauAkala',AlolaPaniolaTown:'hauAkala',AlolaPaniolaCenter:'hauAkala',
 AlolaPaniolaRanch:'hauPaniola',AlolaRoute5:'hauPaniola',
 AlolaBrookletEntrance:'gladion5',AlolaBrookletHill:'gladion5',AlolaBrookletPool:'gladion5',
 AlolaRoute6:'lanaClear',AlolaRoyalAvenue:'skullRoute6',AlolaBattleRoyalDome:'skullRoute6',
 AlolaRoute7:'royalDone',AlolaWelaEntrance:'royalDone',AlolaWelaVolcano:'royalDone',
 AlolaRoute8:'kiaweClear',AlolaLushEntrance:'reconRoute8',AlolaLushJungle:'reconRoute8',
 AlolaKonikoniCity:'mallowClear',AlolaKonikoniCenter:'mallowClear',
 AlolaMemorialHill:'oliviaMet',AlolaRuinsOfLife:'plumeriaWon'
};
const hints={
 hauAkala:'Battle Hau at Heahea Harbor before entering Route 4.',
 hauPaniola:'Battle Hau in Paniola Town before heading to the ranch.',
 gladion5:'Battle Gladion on Route 5 before entering Brooklet Hill.',
 lanaClear:'Finish Lana’s Brooklet Hill trial to reach Royal Avenue.',
 skullRoute6:'Defeat Team Skull on Route 6 before visiting Royal Avenue.',
 royalDone:'Complete the Battle Royal exhibition before approaching Wela Volcano.',
 kiaweClear:'Finish Kiawe’s Wela Volcano trial before visiting Route 8.',
 reconRoute8:'Speak to the Ultra Recon Squad on Route 8 before entering Lush Jungle.',
 mallowClear:'Finish Mallow’s Lush Jungle trial before traveling to Konikoni City.',
 oliviaMet:'Meet Kahuna Olivia in Konikoni City before visiting Memorial Hill.',
 plumeriaWon:'Stop Plumeria at Memorial Hill before entering the Ruins of Life.'
};
function allowed(p,map){
 if(!owns(map))return null;const s=peek(p);
 if(!s.halaClear)return'Complete Hala’s Melemele grand trial before sailing to Akala.';
 const key=open[map];return key&&!s[key]?hints[key]:null;
}
function cap(p){const s=peek(p);return s.oliviaClear?55:s.mallowClear?50:s.kiaweClear?45:s.lanaClear?40:35;}
function centers(){return ['AlolaHeaheaCenter','AlolaPaniolaCenter','AlolaKonikoniCenter'];}
for(const map of centers())Player.CENTERS[map]={map,x:9,y:12,facing:'up'};
window.AlolaAkala={owns,allowed,cap,state,peek,centers};
})();