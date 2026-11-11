// Ula'ula regional gates and progressive level caps.
(function(){
'use strict';if(!window.Alola||!window.ALOLA_DATA?.ulaula)return;
const names=new Set(ALOLA_DATA.ulaula.mapNames),owns=m=>names.has(m);
const gates={AlolaRoute10:'hauMalie',AlolaMountHokulani:'skullRoute10',AlolaHokulaniObservatory:'skullRoute10',AlolaRoute11:'sophoclesClear',AlolaRoute12:'sophoclesClear',AlolaBlushMountain:'sophoclesClear',AlolaRoute13:'hapuRoute12',AlolaTapuVillage:'hapuRoute12',AlolaTapuCenter:'hapuRoute12',AlolaRoute14:'acerolaInvited',AlolaThriftyMegamart:'acerolaInvited',AlolaRoute15:'acerolaClear',AlolaAetherHouse:'acerolaClear',AlolaRoute16:'aetherDefended',AlolaUlaMeadow:'aetherDefended',AlolaRoute17:'aetherDefended',AlolaPoTown:'plumeriaUla',AlolaShadyHouse:'poTownGrunts',AlolaHainaDesert:'nanuClear',AlolaRuinsAbundance:'nanuClear'};
const hints={hauMalie:'Battle Hau in Malie City first.',skullRoute10:'Defeat Team Skull on Route 10.',sophoclesClear:'Complete Sophocles’s observatory trial.',hapuRoute12:'Meet Hapu on Route 12.',acerolaInvited:'Meet Acerola in Tapu Village.',acerolaClear:'Complete the abandoned Megamart ghost trial.',aetherDefended:'Protect Aether House.',plumeriaUla:'Defeat Plumeria on Route 15.',poTownGrunts:'Clear the Po Town gate.',nanuClear:'Complete Nanu’s grand trial to enter Haina Desert.'};
function allowed(p,map){if(!owns(map))return null;const s=Alola.peek(p);if(!s.oliviaClear)return'Finish Olivia’s Akala grand trial before traveling to Ula’ula.';const key=gates[map];return key&&!s[key]?hints[key]:null;}
function cap(p){const s=Alola.peek(p);return s.nanuClear?70:s.acerolaClear?65:s.sophoclesClear?60:AlolaAkala.cap(p);}
const centers=['AlolaMalieCenter','AlolaTapuCenter'];
for(const map of centers)Player.CENTERS[map]={map,x:9,y:12,facing:'up'};
window.AlolaUlaula={owns,allowed,cap,centers};
})();
