// Galar Sword and Shield shared regional Town Map with safe Fly destinations.
(function(){
'use strict';
const D=window.GALAR_DATA,T=window.TOWN_MAP;if(!D||!T)return;
const width=22,height=15,map=Array.from({length:height},()=>Array(width).fill(null));
const dungeon=Array.from({length:height},()=>Array(width).fill(null));
const at={},mapSections={},names={},towns=[],fly={};
const groups=[["Postwick",4,12,["Postwick","Home","HopHouse"]],["SlumberingWeald",3,12,["SlumberingWeald"]],["Route1",5,11,["Route1"]],["Wedgehurst",6,10,["Wedgehurst","SoniaLab"]],["Route2",7,9,["Route2","MagnoliaHouse"]],["WildAreaSouth",9,8,["WildAreaSouth"]],["Motostoke",11,7,["Motostoke","MotostokeCenter","MotostokeStadium"]],["Route3",10,6,["Route3"]],["GalarMine",9,5,["GalarMine"]],["Route4",8,4,["Route4"]],["Turffield",7,3,["Turffield","TurffieldCenter","TurffieldStadium"]],["Route5",10,4,["Route5"]],["Hulbury",12,3,["Hulbury","HulburyCenter","HulburyStadium"]],["GalarMine2",12,5,["GalarMine2"]],["MotostokeOutskirts",12,6,["MotostokeOutskirts"]],["WildAreaNorth",11,6,["WildAreaNorth"]],["Hammerlocke",14,5,["Hammerlocke"]],["HammerlockeCenter",15,5,["HammerlockeCenter"]],["HammerlockeStadium",14,4,["HammerlockeStadium"]],["Route6",15,4,["Route6"]],["StowOnSide",16,4,["StowOnSide"]],["StowCenter",17,4,["StowCenter"]],["StowStadium",16,3,["StowStadium"]],["StowOutskirts",17,5,["StowOutskirts"]],["GlimwoodTangle",18,5,["GlimwoodTangle"]],["Ballonlea",19,4,["Ballonlea"]],["BallonleaCenter",20,4,["BallonleaCenter"]],["BallonleaStadium",19,3,["BallonleaStadium"]],["Route7",19,5,["Route7"]],["Route8",18,6,["Route8"]],["Circhester",18,3,["Circhester"]],["CirchesterCenter",18,2,["CirchesterCenter"]],["CirchesterStadium",17,2,["CirchesterStadium"]],["Route9",19,6,["Route9"]],["Spikemuth",19,7,["Spikemuth"]],["SpikemuthCenter",20,7,["SpikemuthCenter"]],["SpikemuthGym",20,6,["SpikemuthGym"]],["Route9Tunnel",16,6,["Route9Tunnel"]],["HammerlockeGate",15,6,["HammerlockeGate"]],["Route10",14,2,["Route10"]],["WyndonWest",15,2,["WyndonWest"]],["WyndonHotel",16,2,["WyndonHotel"]],["WyndonCity",14,1,["WyndonCity"]],["WyndonCenter",15,1,["WyndonCenter"]],["WyndonStadium",16,1,["WyndonStadium"]],["RoseTower",17,1,["RoseTower"]],["RoseTowerTop",18,1,["RoseTowerTop"]],["EnergyPlant",19,1,["EnergyPlant"]],["EternatusChamber",20,1,["EternatusChamber"]],["BattleTower",21,1,["BattleTower"]],["SlumberingDepths",3,11,["SlumberingDepths"]],["WealdShrine",2,11,["WealdShrine"]],["ArmorStation",0,13,["ArmorStation"]],["ArmorCenter",1,13,["ArmorCenter"]],["FieldsOfHonor",2,13,["FieldsOfHonor"]],["MasterDojo",3,13,["MasterDojo"]],["MaxSoupKitchen",4,13,["MaxSoupKitchen"]],["SoothingWetlands",5,13,["SoothingWetlands"]],["ChallengeBeach",6,13,["ChallengeBeach"]],["ForestFocus",7,13,["ForestFocus"]],["BrawlersCave",8,13,["BrawlersCave"]],["TrainingLowlands",9,13,["TrainingLowlands"]],["TowerWaters",10,13,["TowerWaters"]],["TowerDarkness",11,13,["TowerDarkness"]],["WorkoutSea",12,13,["WorkoutSea"]],["HoneycalmIsland",13,13,["HoneycalmIsland"]],["CrownStation",0,14,["CrownStation"]],["Freezington",1,14,["Freezington"]],["CrownCenter",2,14,["CrownCenter"]],["FrostpointField",3,14,["FrostpointField"]],["MaxLair",4,14,["MaxLair"]],["GiantBed",5,14,["GiantBed"]],["OldCemetery",6,14,["OldCemetery"]],["SnowslideSlope",7,14,["SnowslideSlope"]],["TunnelTop",8,14,["TunnelTop"]],["GiantFoot",9,14,["GiantFoot"]],["ThreePointPass",10,14,["ThreePointPass"]],["CrownShrine",11,14,["CrownShrine"]],["CalyrexArena",12,14,["CalyrexArena"]],["BallimereLake",13,14,["BallimereLake"]]];
for(const[anchor,x,y,aliases]of groups){
 const sec='GALAR_'+anchor.replace(/([a-z])([A-Z])/g,'$1_$2').toUpperCase(),name='Galar'+anchor;
 const m=D.maps[name];if(!m)throw Error('Galar Town Map missing area '+name);
 map[y][x]=sec;names[sec]=m.title;
 for(const alias of aliases){const n='Galar'+alias;if(!D.maps[n])throw Error('Galar Town Map missing '+n);at[n]=[x,y];mapSections[n]=sec;}
 if(/^(Postwick|Wedgehurst|Motostoke|Turffield|Hulbury|Hammerlocke|StowOnSide|Ballonlea|Circhester|Spikemuth|WyndonCity|Freezington)$/.test(anchor))towns.push(sec);
}
for(const name of Object.keys(D.maps))if(!at[name])throw Error('Galar Town Map missing coordinates: '+name);
function landing(name){
 const m=D.maps[name],cx=Math.floor(m.width/2),cy=Math.floor(m.height/2),choices=[];
 for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++){
  const i=y*m.width+x;
  if(m.collision[i]||m.behavior[i]===0x10||m.warps.some(w=>w.x===x&&w.y===y)||m.people.some(p=>p.x===x&&p.y===y))continue;
  choices.push({map:name,x,y,d:Math.abs(x-cx)+Math.abs(y-cy)});
 }
 choices.sort((a,b)=>a.d-b.d);if(!choices.length)throw Error('No Galar Fly destination: '+name);
 return{map:name,x:choices[0].x,y:choices[0].y};
}
for(const name of ['GalarPostwick','GalarWedgehurst','GalarMotostoke','GalarTurffield','GalarHulbury','GalarHammerlocke','GalarStowOnSide','GalarBallonlea','GalarCirchester','GalarSpikemuth','GalarWyndonCity','GalarArmorStation','GalarFreezington'])
 fly[mapSections[name]]=landing(name);
const R={id:'GALAR',label:'Galar',image:'assets/town-map/galar.svg',x0:32,y0:16,width,height,map,dungeon,at,mapSections,names,towns,fly};
T.galar=R;Object.assign(T.mapSections,mapSections);Object.assign(T.names,names);T.fly=Object.assign({},T.fly,fly);D.townMap=R;
})();
