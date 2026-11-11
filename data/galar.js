// Unified Sword/Shield opening chapter with 2D Kalos placeholder layouts.
(function(){
'use strict';
const source=window.KALOS_DATA?.maps;if(!source)return;
const specs=[["Postwick","CamphrierTown","Postwick","Home:0 HopHouse:0 Route1:0"],["Home","AquacordeRestHouse","Postwick · Home","Postwick:0"],["HopHouse","AquacordeTown","Hop's House","Postwick:1 SlumberingWeald:0"],["SlumberingWeald","Route2","Slumbering Weald","HopHouse:1"],["Route1","Route3","Galar Route 1","Postwick:2 Wedgehurst:0"],["Wedgehurst","CamphrierTown","Wedgehurst","Route1:1 SoniaLab:0 Route2:0"],["SoniaLab","AquacordeShop","Pokémon Research Lab","Wedgehurst:1"],["Route2","Route7East","Galar Route 2","Wedgehurst:2 MagnoliaHouse:0 WildAreaSouth:0"],["MagnoliaHouse","AquacordeRestHouse","Professor Magnolia's House","Route2:1"],["WildAreaSouth","Route3","Rolling Fields · Wild Area","Route2:2 Motostoke:0"],["Motostoke","AquacordeTown","Motostoke","WildAreaSouth:1 MotostokeCenter:0 MotostokeStadium:0 Route3:0"],["MotostokeCenter","SantaluneCenter","Motostoke Pokémon Center","Motostoke:1"],["MotostokeStadium","GymGallery","Motostoke Stadium","Motostoke:2"],["Route3","Route3","Galar Route 3","Motostoke:3 GalarMine:0"],["GalarMine","GlitteringCave","Galar Mine","Route3:1 Route4:0"],["Route4","Route7East","Galar Route 4","GalarMine:1 Turffield:0 Route5:0"],["Turffield","CamphrierTown","Turffield","Route4:1 TurffieldCenter:0 TurffieldStadium:0"],["TurffieldCenter","SantaluneCenter","Turffield Pokémon Center","Turffield:1"],["TurffieldStadium","GymWeb","Turffield Stadium","Turffield:2"],["Route5","Route7East","Galar Route 5","Route4:2 Hulbury:0 GalarMine2:0"],["Hulbury","CamphrierTown","Hulbury","Route5:1 HulburyCenter:0 HulburyStadium:0"],["HulburyCenter","SantaluneCenter","Hulbury Pokémon Center","Hulbury:1"],["HulburyStadium","GymGallery","Hulbury Stadium","Hulbury:2"],["GalarMine2","GlitteringCave","Galar Mine No. 2","Route5:2 MotostokeOutskirts:0"],["MotostokeOutskirts","Route2","Motostoke Outskirts","GalarMine2:1"]],maps={};
for(const [id,template,title,dests]of specs){
 const original=source['Kalos'+template],links=dests.split(' ');
 if(!original||original.warps.length<links.length)throw Error('Galar template missing exits: '+template+' for '+id);
 const m=JSON.parse(JSON.stringify(original));
 Object.assign(m,{name:'Galar'+id,title,region:'galar',galarCampaign:'sword-shield',image:'Kalos'+template,people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=links.map((link,i)=>{const[to,n]=link.split(':');return {...original.warps[i],map:'Galar'+to,warp:+n};});
 for(const key of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[key];
 maps[m.name]=m;
}
function free(m,x,y){return x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);}
function safe(m,x,y){
 if(free(m,x,y))return{x,y};const list=[];
 for(let py=2;py<m.height-2;py++)for(let px=2;px<m.width-2;px++)if(free(m,px,py))list.push({x:px,y:py,d:Math.abs(px-x)+Math.abs(py-y)});
 list.sort((a,b)=>a.d-b.d);if(!list.length)throw Error('No clear Galar NPC tile on '+m.name);return list[0];
}
function npc(id,x,y,script,sprite='bw2_youngster'){
 const m=maps['Galar'+id],at=safe(m,x,y);
 m.people.push({id:'galar-'+m.people.length,localId:'GALAR_'+id+'_'+m.people.length,x:at.x,y:at.y,script:'swsh:'+script,sprite,width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
[["Home",9,7,"galar-mom","bw2_147"],["Home",15,7,"travel-home","bw2_scientist_f_46"],["Postwick",18,15,"hop-postwick","bw2_youngster"],["HopHouse",11,8,"leon-starter","bw2_105"],["HopHouse",17,12,"hop-first","bw2_youngster"],["SlumberingWeald",14,11,"weald-legend","bw2_105"],["Route1",16,15,"route1-trainer","bw2_youngster"],["Wedgehurst",20,14,"sonia-wedgehurst","bw2_scientist_f_46"],["SoniaLab",9,7,"sonia-lab","bw2_scientist_f_46"],["Route2",17,13,"hop-route2","bw2_youngster"],["MagnoliaHouse",9,8,"magnolia","bw2_147"],["WildAreaSouth",17,15,"wild-area-guide","bw2_youngster"],["WildAreaSouth",25,17,"wild-area-trainer","bw2_lass"],["Motostoke",22,14,"marnie-intro","bw2_lass"],["MotostokeCenter",9,7,"galar-heal","bw2_147"],["MotostokeStadium",11,11,"league-ceremony","bw2_105"],["MotostokeStadium",20,18,"kabu-gym","bw2_105"],["Route3",16,14,"route3-trainer","bw2_youngster"],["GalarMine",16,14,"bede-mine","bw2_105"],["Route4",17,15,"milo-invite","bw2_105"],["Turffield",20,15,"milo-town","bw2_105"],["TurffieldCenter",9,7,"galar-heal","bw2_147"],["TurffieldStadium",14,12,"milo-gym","bw2_105"],["Route5",15,14,"team-yell-route5","bw2_youngster"],["Hulbury",20,15,"nessa-town","bw2_lass"],["HulburyCenter",9,7,"galar-heal","bw2_147"],["HulburyStadium",15,13,"nessa-gym","bw2_lass"],["GalarMine2",16,12,"bede-mine2","bw2_105"],["MotostokeOutskirts",14,14,"kabu-outskirts","bw2_105"]].forEach(args=>npc(...args));
for(const[id,pool]of [["Route1",[["Skwovet",2,4],["Rookidee",2,4],["Blipbug",2,4],["Wooloo",3,5]]],["SlumberingWeald",[["Skwovet",3,5],["Rookidee",3,5],["Nickit",3,5]]],["Route2",[["Yamper",5,7],["Chewtle",5,7],["Rookidee",5,7],["Gossifleur",5,7]]],["WildAreaSouth",[["Bunnelby",9,12],["Rolycoly",9,12],["Tyrogue",10,13],["Wingull",9,12],["Pancham",10,13],["Combee",9,12]]],["Route3",[["Gossifleur",10,14],["Rolycoly",10,14],["Vulpix",10,14],["Mudbray",10,14]]],["GalarMine",[["Rolycoly",11,15],["Woobat",11,15],["Diglett",11,15]]],["Route4",[["Wooloo",13,16],["Milcery",13,16],["Meowth-Galar",13,16],["Electrike",13,16]]],["Route5",[["Applin",17,20],["Minccino",17,20],["Nuzleaf",17,20]]],["GalarMine2",[["Stunfisk-Galar",20,24],["Shellos",20,24],["Croagunk",20,24]]]]){
 const m=maps['Galar'+id],unit=Math.floor(100/pool.length);
 m.wild={rate:24,weights:pool.map((_,i)=>i===pool.length-1?100-i*unit:unit),slots:pool.map(([species,min,max])=>({species,min,max}))};
 for(let y=6;y<Math.min(m.height-4,17);y++)for(let x=5;x<Math.min(m.width-4,12);x++)
  if(free(m,x,y))m.behavior[y*m.width+x]=2;
}
const start=safe(maps.GalarHome,10,13),back={map:'FightArea',x:30,y:25,facing:'down'};
window.GALAR_DATA={maps,mapNames:specs.map(s=>'Galar'+s[0]),starters:['Grookey','Scorbunny','Sobble'],
 start:{map:'GalarHome',x:start.x,y:start.y,facing:'up'},return:back};
})();
