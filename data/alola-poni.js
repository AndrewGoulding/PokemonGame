// Shared Ultra Sun and Ultra Moon continuation: Aether Paradise and Poni Island.
(function(){
'use strict';
const D=window.ALOLA_DATA,base=window.KALOS_DATA?.maps;if(!D||!base)return;
const specs=[["AetherDock","CamphrierTown","Aether Paradise Dock","AetherLobby:0"],["AetherLobby","AquacordeTown","Aether Paradise","AetherDock:0 AetherLab:0"],["AetherLab","AquacordeShop","Aether Paradise Laboratory","AetherLobby:1"],["SeafolkVillage","CamphrierTown","Seafolk Village","PoniCenter:0 PoniWilds:0"],["PoniCenter","SantaluneCenter","Seafolk Pokémon Center","SeafolkVillage:0"],["PoniWilds","Route7East","Poni Wilds","SeafolkVillage:1 AncientPoniPath:0"],["AncientPoniPath","Route3","Ancient Poni Path","PoniWilds:1 PoniBreakers:0 PoniGrove:0"],["PoniBreakers","Route7East","Poni Breaker Coast","AncientPoniPath:1 RuinsHope:0"],["RuinsHope","SeaSpiritsDen","Ruins of Hope","PoniBreakers:1"],["PoniGrove","Route3","Poni Grove","AncientPoniPath:2 PoniPlains:0 VastPoniEntrance:0"],["PoniPlains","Route7East","Poni Plains","PoniGrove:1 PoniMeadow:0 PoniGauntlet:0"],["PoniMeadow","ParfumGarden","Poni Meadow","PoniPlains:1 ResolutionCave:0"],["ResolutionCave","GlitteringCave","Resolution Cave","PoniMeadow:1"],["VastPoniEntrance","GymGallery","Vast Poni Canyon Entrance","PoniGrove:2 VastPoniCanyon:0"],["VastPoniCanyon","Route7East","Vast Poni Canyon","VastPoniEntrance:1 DragonTrial:0 AltarSunne:0"],["DragonTrial","GymWeb","Dragon Trial Chamber","VastPoniCanyon:1"],["AltarSunne","SeaSpiritsDen","Altar of the Sunne and Moone","VastPoniCanyon:2 UltraSpace:0"],["UltraSpace","GlitteringCave","Ultra Space","AltarSunne:1"],["PoniGauntlet","Route3","Poni Gauntlet","PoniPlains:2"]],maps=D.maps;
for(const[id,t,title,dests]of specs){
 const original=base['Kalos'+t],links=dests.split(' ');
 if(!original||original.warps.length<links.length)throw Error('Poni template missing warps: '+t+' for '+id);
 const m=JSON.parse(JSON.stringify(original));
 Object.assign(m,{name:'Alola'+id,title,region:'alola',alolaCampaign:'ultra',alolaIsland:id.startsWith('Aether')?'aether':'poni',image:'Kalos'+t,people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=links.map((link,i)=>{const[to,j]=link.split(':');return {...original.warps[i],map:'Alola'+to,warp:+j};});
 for(const k of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[k];
 maps[m.name]=m;
}
function free(m,x,y){return x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);}
function place(m,x,y){
 if(free(m,x,y))return{x,y};const a=[];
 for(let py=2;py<m.height-2;py++)for(let px=2;px<m.width-2;px++)if(free(m,px,py))a.push({x:px,y:py,d:Math.abs(px-x)+Math.abs(py-y)});
 a.sort((a,b)=>a.d-b.d);if(!a.length)throw Error('No free Poni tile on '+m.name);
 return a[0];
}
function npc(id,x,y,script){
 const m=maps['Alola'+id],p=place(m,x,y);m.people.push({id:'poni-'+m.people.length,localId:'USUM_PONI_'+id+'_'+m.people.length,
  x:p.x,y:p.y,script:'usum:'+script,sprite:'bw2_youngster',width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
[["AetherDock",16,17,"aether-return"],["AetherDock",22,15,"aether-intro"],["AetherLobby",17,15,"aether-grunts"],["AetherLobby",24,12,"gladion-aether"],["AetherLab",9,7,"lusamine"],["AetherDock",28,20,"poni-ferry"],["SeafolkVillage",17,16,"poni-return-ferry"],["SeafolkVillage",23,13,"lillie-poni"],["PoniCenter",8,7,"poni-heal"],["PoniWilds",16,12,"hapu-poni"],["AncientPoniPath",18,14,"hapu-grand"],["PoniBreakers",16,14,"coast-trainer"],["RuinsHope",10,8,"tapu-fini"],["PoniGrove",18,15,"poni-grove-trainer"],["PoniPlains",17,13,"mina-invite"],["PoniMeadow",18,12,"mina-petal-0"],["ResolutionCave",13,14,"mina-petal-1"],["PoniGauntlet",14,15,"mina-petal-2"],["VastPoniEntrance",10,10,"dragon-guide"],["VastPoniCanyon",17,13,"canyon-trainer"],["DragonTrial",11,10,"dragon-0"],["DragonTrial",20,15,"dragon-1"],["DragonTrial",18,24,"totem-kommoo"],["AltarSunne",10,9,"altar-lillie"],["UltraSpace",15,15,"ultra-necrozma"],["SeafolkVillage",27,17,"mina-final"]].forEach(x=>npc(...x));
npc('MalieCity',32,19,'aether-ferry');
for(const[id,mons]of [["PoniWilds",["Granbull","Pelipper","Gastrodon","Exeggcute"]],["AncientPoniPath",["Mudsdale","Primeape","Gumshoos","Raticate-Alola"]],["PoniBreakers",["Pelipper","Gastrodon","Tentacruel"]],["PoniGrove",["Riolu","Pinsir","Trumbeak"]],["PoniPlains",["Tauros","Scyther","Mudsdale"]],["PoniMeadow",["Ribombee","Oricorio","Cottonee"]],["ResolutionCave",["Golbat","Dugtrio-Alola","Noibat"]],["VastPoniCanyon",["Jangmo-o","Machoke","Golbat"]],["PoniGauntlet",["Kommo-o","Scyther","Bewear"]]]){
 const m=maps['Alola'+id],q=Math.floor(100/mons.length);
 m.wild={rate:25,weights:mons.map((_,i)=>i===mons.length-1?100-q*i:q),
  slots:mons.map(species=>({species,min:45,max:53}))};
 for(let y=6;y<Math.min(17,m.height-4);y++)for(let x=5;x<Math.min(12,m.width-4);x++)if(free(m,x,y))m.behavior[y*m.width+x]=2;
}
const aetherStart=place(maps.AlolaAetherDock,18,20),aetherReturn=place(maps.AlolaMalieCity,19,20);
const poniStart=place(maps.AlolaSeafolkVillage,18,19),poniReturn=place(maps.AlolaAetherDock,17,19);
D.poni={mapNames:specs.map(x=>'Alola'+x[0]),
 aetherStart:{map:'AlolaAetherDock',x:aetherStart.x,y:aetherStart.y,facing:'down'},
 aetherReturn:{map:'AlolaMalieCity',x:aetherReturn.x,y:aetherReturn.y,facing:'down'},
 start:{map:'AlolaSeafolkVillage',x:poniStart.x,y:poniStart.y,facing:'down'},
 return:{map:'AlolaAetherDock',x:poniReturn.x,y:poniReturn.y,facing:'down'}};
})();
