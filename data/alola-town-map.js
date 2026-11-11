// Unified Ultra Sun / Ultra Moon map: schematic positions for Melemele and Akala.
(function(){
'use strict';
const D=window.ALOLA_DATA,T=window.TOWN_MAP;if(!D||!T)return;
const width=22,height=15,map=Array.from({length:height},()=>Array(width).fill(null));
const dungeon=Array.from({length:height},()=>Array(width).fill(null));
const at={},mapSections={},names={},towns=[],fly={};
const groups=[["HauoliOutskirts",4,10,["Home","HauoliOutskirts"]],["Route1",5,9,["Route1"]],["IkiTown",6,8,["IkiTown","PokeCenter","TrainerSchool"]],["MahaloTrail",7,7,["MahaloTrail"]],["HauoliBeach",6,11,["HauoliBeach"]],["HauoliCity",7,11,["HauoliCity","HauoliCenter"]],["Route2",8,9,["Route2","BerryFields"]],["Cemetery",9,8,["Cemetery"]],["VerdantCavern",9,9,["VerdantEntrance","VerdantCavern"]],["HeaheaCity",11,7,["HeaheaCity","HeaheaHotel","HeaheaCenter"]],["Route4",12,7,["Route4"]],["PaniolaTown",13,7,["PaniolaTown","PaniolaCenter"]],["PaniolaRanch",14,7,["PaniolaRanch"]],["Route5",14,6,["Route5"]],["BrookletHill",15,5,["BrookletEntrance","BrookletHill","BrookletPool"]],["Route6",14,8,["Route6"]],["RoyalAvenue",15,8,["RoyalAvenue","BattleRoyalDome"]],["Route7",16,7,["Route7"]],["WelaVolcano",17,6,["WelaEntrance","WelaVolcano"]],["Route8",17,8,["Route8"]],["LushJungle",18,8,["LushEntrance","LushJungle"]],["KonikoniCity",18,9,["KonikoniCity","KonikoniCenter"]],["MemorialHill",19,9,["MemorialHill"]],["RuinsOfLife",20,9,["RuinsOfLife"]],["MalieCity",2,2,["MalieCity","MalieCenter"]],["MalieGarden",3,1,["MalieGarden"]],["Route10",3,2,["Route10"]],["MountHokulani",4,2,["MountHokulani"]],["HokulaniObservatory",4,1,["HokulaniObservatory"]],["Route11",5,2,["Route11"]],["Route12",6,2,["Route12"]],["BlushMountain",6,1,["BlushMountain"]],["Route13",7,2,["Route13"]],["TapuVillage",8,2,["TapuVillage","TapuCenter"]],["Route14",8,3,["Route14"]],["ThriftyMegamart",9,3,["ThriftyMegamart"]],["Route15",7,3,["Route15"]],["AetherHouse",6,3,["AetherHouse"]],["Route16",5,3,["Route16"]],["UlaMeadow",5,4,["UlaMeadow"]],["Route17",4,4,["Route17"]],["PoTown",3,4,["PoTown"]],["ShadyHouse",2,4,["ShadyHouse"]],["HainaDesert",2,3,["HainaDesert"]],["RuinsAbundance",3,3,["RuinsAbundance"]],["AetherDock",11,2,["AetherDock"]],["AetherLobby",12,2,["AetherLobby"]],["AetherLab",13,2,["AetherLab"]],["SeafolkVillage",12,12,["SeafolkVillage","PoniCenter"]],["PoniWilds",13,12,["PoniWilds"]],["AncientPoniPath",14,12,["AncientPoniPath"]],["PoniBreakers",14,13,["PoniBreakers"]],["RuinsHope",15,13,["RuinsHope"]],["PoniGrove",15,12,["PoniGrove"]],["PoniPlains",16,12,["PoniPlains"]],["PoniMeadow",17,11,["PoniMeadow"]],["ResolutionCave",18,11,["ResolutionCave"]],["VastPoniEntrance",16,13,["VastPoniEntrance"]],["VastPoniCanyon",17,13,["VastPoniCanyon"]],["DragonTrial",18,13,["DragonTrial"]],["AltarSunne",19,13,["AltarSunne"]],["UltraSpace",20,13,["UltraSpace"]],["PoniGauntlet",17,12,["PoniGauntlet"]]];
for(const [anchor,x,y,aliases] of groups){
 const primary='Alola'+anchor,info=D.maps[primary]||D.maps['Alola'+aliases[0]];
 const sec='ALOLA_'+anchor.replace(/([a-z])([A-Z])/g,'$1_$2').toUpperCase();
 map[y][x]=sec;names[sec]=info?.title||anchor;
 for(const alias of aliases){
  const name='Alola'+alias;if(!D.maps[name])throw Error('Unknown Alola town-map area: '+name);
  at[name]=[x,y];mapSections[name]=sec;
 }
 if(/Town$|City$|Avenue$|Outskirts$/.test(anchor))towns.push(sec);
}
for(const name of Object.keys(D.maps))if(!at[name])throw Error('Alola town-map position missing: '+name);
function landing(name){
 const m=D.maps[name];if(!m)return null;
 const targetX=Math.floor(m.width/2),targetY=Math.floor(m.height/2);
 const candidates=[];
 for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++){
  const i=y*m.width+x;
  if(m.collision[i]||m.behavior[i]===0x10||m.warps.some(w=>w.x===x&&w.y===y)||m.people.some(p=>p.x===x&&p.y===y))continue;
  candidates.push({map:name,x,y,dist:Math.abs(x-targetX)+Math.abs(y-targetY)});
 }
 candidates.sort((a,b)=>a.dist-b.dist);const result=candidates[0];
 return result?{map:name,x:result.x,y:result.y}:null;
}
for(const name of ['AlolaIkiTown','AlolaHauoliCity','AlolaHeaheaCity','AlolaPaniolaTown','AlolaKonikoniCity','AlolaMalieCity','AlolaTapuVillage','AlolaSeafolkVillage']){
 const sec=mapSections[name],spot=landing(name);if(!spot)throw Error('No safe Alola Fly tile: '+name);
 fly[sec]=spot;
}
const R={id:'ALOLA',label:'Alola',image:'assets/town-map/alola.svg',x0:32,y0:16,width,height,map,dungeon,at,mapSections,names,towns,fly};
T.alola=R;Object.assign(T.mapSections,mapSections);Object.assign(T.names,names);T.fly=Object.assign({},T.fly,fly);
D.townMap=R;
})();
