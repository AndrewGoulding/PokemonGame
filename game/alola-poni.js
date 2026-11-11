// Shared Ultra Alola: Aether Paradise and Poni progression rules.
(function(){
'use strict';
if(!window.Alola||!window.ALOLA_DATA?.poni)return;
const all=new Set(ALOLA_DATA.poni.mapNames),owns=m=>all.has(m);
const gates={
 AlolaAetherLab:'aetherGrunts',
 AlolaSeafolkVillage:'lusamineClear',AlolaPoniCenter:'lusamineClear',
 AlolaPoniWilds:'lilliePoni',AlolaAncientPoniPath:'lilliePoni',
 AlolaPoniBreakers:'hapuMet',AlolaRuinsHope:'hapuMet',
 AlolaPoniGrove:'hapuClear',AlolaPoniPlains:'hapuClear',
 AlolaPoniMeadow:'necrozmaClear',AlolaResolutionCave:'necrozmaClear',
 AlolaVastPoniEntrance:'hapuClear',AlolaVastPoniCanyon:'hapuClear',
 AlolaDragonTrial:'canyonClear',AlolaAltarSunne:'dragonClear',
 AlolaUltraSpace:'altarOpened',AlolaPoniGauntlet:'minaClear'
};
const hints={
 aetherGrunts:'Defeat Team Skull in Aether Paradise before entering the laboratory.',
 lusamineClear:'Rescue Lillie at Aether Paradise before sailing to Poni.',
 lilliePoni:'Speak to Lillie in Seafolk Village before exploring the island.',
 hapuMet:'Meet Hapu on Poni Wilds first.',
 hapuClear:'Complete Hapu’s grand trial on Ancient Poni Path.',
 necrozmaClear:'Stop Ultra Necrozma before exploring Poni Meadow.',
 canyonClear:'Battle through Vast Poni Canyon before challenging the Dragon Trial.',
 dragonClear:'Complete the Dragon Trial before reaching the altar.',
 altarOpened:'Speak with Lillie at the altar to open the Ultra Space passage.',
 minaClear:'Complete Mina’s trial to open Poni Gauntlet.'
};
function allowed(p,map){
 if(!owns(map))return null;
 const s=Alola.peek(p);if(!s.nanuClear)return'Finish Nanu’s Ula’ula grand trial first.';
 const key=gates[map];return key&&!s[key]?hints[key]:null;
}
function cap(p){
 const s=Alola.peek(p);return s.minaClear?90:s.necrozmaClear?85:s.dragonClear?80:s.hapuClear?75:AlolaUlaula.cap(p);
}
const centers=['AlolaPoniCenter'];
for(const map of centers)Player.CENTERS[map]={map,x:9,y:12,facing:'up'};
window.AlolaPoni={owns,allowed,cap,centers};
})();
