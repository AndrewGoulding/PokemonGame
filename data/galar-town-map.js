// Galar Sword and Shield shared regional Town Map with safe Fly destinations.
(function(){
'use strict';
const D=window.GALAR_DATA,T=window.TOWN_MAP;if(!D||!T)return;
const width=22,height=15,map=Array.from({length:height},()=>Array(width).fill(null));
const dungeon=Array.from({length:height},()=>Array(width).fill(null));
const at={},mapSections={},names={},towns=[],fly={};
const groups=[["Postwick",4,12,["Postwick","Home","HopHouse"]],["SlumberingWeald",3,12,["SlumberingWeald"]],["Route1",5,11,["Route1"]],["Wedgehurst",6,10,["Wedgehurst","SoniaLab"]],["Route2",7,9,["Route2","MagnoliaHouse"]],["WildAreaSouth",9,8,["WildAreaSouth"]],["Motostoke",11,7,["Motostoke","MotostokeCenter","MotostokeStadium"]],["Route3",10,6,["Route3"]],["GalarMine",9,5,["GalarMine"]],["Route4",8,4,["Route4"]],["Turffield",7,3,["Turffield","TurffieldCenter","TurffieldStadium"]],["Route5",10,4,["Route5"]],["Hulbury",12,3,["Hulbury","HulburyCenter","HulburyStadium"]],["GalarMine2",12,5,["GalarMine2"]],["MotostokeOutskirts",12,6,["MotostokeOutskirts"]],["WildAreaNorth",11,6,["WildAreaNorth"]],["Hammerlocke",14,5,["Hammerlocke"]],["HammerlockeCenter",15,5,["HammerlockeCenter"]],["HammerlockeStadium",14,4,["HammerlockeStadium"]],["Route6",15,4,["Route6"]],["StowOnSide",16,4,["StowOnSide"]],["StowCenter",17,4,["StowCenter"]],["StowStadium",16,3,["StowStadium"]],["StowOutskirts",17,5,["StowOutskirts"]],["GlimwoodTangle",18,5,["GlimwoodTangle"]],["Ballonlea",19,4,["Ballonlea"]],["BallonleaCenter",20,4,["BallonleaCenter"]],["BallonleaStadium",19,3,["BallonleaStadium"]],["Route7",19,5,["Route7"]],["Route8",18,6,["Route8"]],["Circhester",18,3,["Circhester"]],["CirchesterCenter",18,2,["CirchesterCenter"]],["CirchesterStadium",17,2,["CirchesterStadium"]],["Route9",19,6,["Route9"]],["Spikemuth",19,7,["Spikemuth"]],["SpikemuthCenter",20,7,["SpikemuthCenter"]],["SpikemuthGym",20,6,["SpikemuthGym"]],["Route9Tunnel",16,6,["Route9Tunnel"]],["HammerlockeGate",15,6,["HammerlockeGate"]]];
for(const[anchor,x,y,aliases]of groups){
 const sec='GALAR_'+anchor.replace(/([a-z])([A-Z])/g,'$1_$2').toUpperCase(),name='Galar'+anchor;
 const m=D.maps[name];if(!m)throw Error('Galar Town Map missing area '+name);
 map[y][x]=sec;names[sec]=m.title;
 for(const alias of aliases){const n='Galar'+alias;if(!D.maps[n])throw Error('Galar Town Map missing '+n);at[n]=[x,y];mapSections[n]=sec;}
 if(/^(Postwick|Wedgehurst|Motostoke|Turffield|Hulbury|Hammerlocke|StowOnSide|Ballonlea|Circhester|Spikemuth)$/.test(anchor))towns.push(sec);
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
for(const name of ['GalarPostwick','GalarWedgehurst','GalarMotostoke','GalarTurffield','GalarHulbury','GalarHammerlocke','GalarStowOnSide','GalarBallonlea','GalarCirchester','GalarSpikemuth'])
 fly[mapSections[name]]=landing(name);
const R={id:'GALAR',label:'Galar',image:'assets/town-map/galar.svg',x0:32,y0:16,width,height,map,dungeon,at,mapSections,names,towns,fly};
T.galar=R;Object.assign(T.mapSections,mapSections);Object.assign(T.names,names);T.fly=Object.assign({},T.fly,fly);D.townMap=R;
})();
