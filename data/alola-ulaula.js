// Unified Ultra Sun and Ultra Moon: Ula'ula island maps and encounter pools.
(function(){
'use strict';
const D=window.ALOLA_DATA,base=window.KALOS_DATA?.maps;if(!D||!base)return;
const specs=[["MalieCity","CamphrierTown","Malie City","MalieCenter:0 MalieGarden:0 Route10:0"],["MalieCenter","SantaluneCenter","Malie Pokémon Center","MalieCity:0"],["MalieGarden","ParfumGarden","Malie Garden","MalieCity:1"],["Route10","Route3","Route 10","MalieCity:2 MountHokulani:0"],["MountHokulani","Route7East","Mount Hokulani","Route10:1 HokulaniObservatory:0 Route11:0"],["HokulaniObservatory","AquacordeShop","Hokulani Observatory","MountHokulani:1"],["Route11","Route3","Route 11","MountHokulani:2 Route12:0"],["Route12","Route7East","Route 12","Route11:1 BlushMountain:0 Route13:0"],["BlushMountain","AquacordeShop","Blush Mountain","Route12:1"],["Route13","Route7East","Route 13","Route12:2 TapuVillage:0 Route15:0"],["TapuVillage","CamphrierTown","Tapu Village","Route13:1 Route14:0 TapuCenter:0"],["TapuCenter","SantaluneCenter","Tapu Village Pokémon Center","TapuVillage:2"],["Route14","Route3","Route 14","TapuVillage:1 ThriftyMegamart:0"],["ThriftyMegamart","AquacordeShop","Abandoned Thrifty Megamart","Route14:1"],["Route15","Route7East","Route 15","Route13:2 AetherHouse:0 Route16:0"],["AetherHouse","AquacordeShop","Aether House","Route15:1"],["Route16","Route3","Route 16","Route15:2 UlaMeadow:0"],["UlaMeadow","Route3","Ula’ula Meadow","Route16:1 Route17:0"],["Route17","Route3","Route 17","UlaMeadow:1 PoTown:0"],["PoTown","CamphrierTown","Po Town","Route17:1 ShadyHouse:0 HainaDesert:0"],["ShadyHouse","AquacordeShop","Shady House","PoTown:1"],["HainaDesert","Route3","Haina Desert","PoTown:2 RuinsAbundance:0"],["RuinsAbundance","SeaSpiritsDen","Ruins of Abundance","HainaDesert:1"]],maps=D.maps;
for(const [id,t,title,dests]of specs){
 const source=base['Kalos'+t],links=dests.split(' ');if(!source||source.warps.length<links.length)throw Error('Ulaula template: '+t);
 const m=JSON.parse(JSON.stringify(source));Object.assign(m,{name:'Alola'+id,title,region:'alola',alolaCampaign:'ultra',alolaIsland:'ulaula',image:'Kalos'+t,people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=links.map((link,i)=>{const [to,j]=link.split(':');return {...source.warps[i],map:'Alola'+to,warp:+j};});
 for(const k of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[k];maps[m.name]=m;
}
function free(m,x,y){return x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);}
function near(m,x,y){
 if(free(m,x,y))return{x,y};const all=[];
 for(let cy=2;cy<m.height-2;cy++)for(let cx=2;cx<m.width-2;cx++)if(free(m,cx,cy))all.push({x:cx,y:cy,d:Math.abs(cx-x)+Math.abs(cy-y)});
 all.sort((a,b)=>a.d-b.d);if(!all.length)throw Error('No free tile: '+m.name);return all[0];
}
function npc(id,x,y,key){const m=maps['Alola'+id],p=near(m,x,y);
 m.people.push({id:'ula-'+m.people.length,localId:'USUM_ULA_'+id+'_'+m.people.length,x:p.x,y:p.y,script:'usum:'+key,sprite:'bw2_youngster',width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});}
[["MalieCity",16,16,"ula-return-ferry"],["MalieCity",23,13,"hau-malie"],["MalieCity",27,18,"nanu-grand"],["MalieCenter",9,7,"ula-heal"],["MalieGarden",13,12,"kukui-malie"],["Route10",15,14,"skull-route10"],["MountHokulani",19,16,"molayne"],["HokulaniObservatory",8,7,"sophocles-brief"],["HokulaniObservatory",10,10,"power-0"],["HokulaniObservatory",13,10,"power-1"],["HokulaniObservatory",16,10,"power-2"],["HokulaniObservatory",17,6,"sophocles-totem"],["Route11",14,15,"route11-trainer"],["Route12",15,14,"hapu-route12"],["Route13",15,13,"hau-route13"],["TapuVillage",21,15,"acerola-invite"],["TapuCenter",9,7,"ula-heal"],["Route14",15,12,"acerola-brief"],["ThriftyMegamart",7,7,"ghost-photo-0"],["ThriftyMegamart",11,9,"ghost-photo-1"],["ThriftyMegamart",15,11,"ghost-photo-2"],["ThriftyMegamart",17,7,"acerola-totem"],["Route15",18,13,"plumeria-ula"],["AetherHouse",9,7,"aether-house"],["Route16",15,13,"route16-trainer"],["UlaMeadow",15,12,"meadow-recon"],["Route17",17,13,"skull-route17"],["PoTown",16,13,"potown-grunts"],["ShadyHouse",9,7,"guzma-ula"],["HainaDesert",15,12,"desert-guide"],["RuinsAbundance",9,7,"tapu-bulu"]].forEach(a=>npc(...a));
npc('KonikoniCity',26,19,'ula-ferry');
for(const [id,species]of [["Route10",["Skarmory","Fearow","Gumshoos","Furfrou"]],["MountHokulani",["Minior","Cleffa","Beldum","Ditto"]],["Route11",["Pancham","Komala","Trumbeak"]],["Route12",["Geodude-Alola","Torkoal","Mudbray"]],["Route13",["Sandygast","Wingull"]],["Route14",["Gastly","Haunter","Zubat"]],["Route15",["Pelipper","Tentacool"]],["Route16",["Scraggy","Pancham"]],["UlaMeadow",["Oricorio","Ribombee","Cottonee"]],["Route17",["Pawniard","Graveler-Alola"]],["HainaDesert",["Sandile","Trapinch","Dugtrio-Alola"]]]){
 const m=maps['Alola'+id],w=Math.floor(100/species.length);
 m.wild={rate:25,weights:species.map((_,i)=>i===species.length-1?100-w*i:w),slots:species.map(name=>({species:name,min:29,max:38}))};
 for(let y=6;y<Math.min(m.height-4,17);y++)for(let x=5;x<Math.min(m.width-4,12);x++)if(free(m,x,y))m.behavior[y*m.width+x]=2;
}
const start=near(maps.AlolaMalieCity,18,20),back=near(maps.AlolaKonikoniCity,19,20);
D.ulaula={mapNames:specs.map(a=>'Alola'+a[0]),start:{map:'AlolaMalieCity',x:start.x,y:start.y,facing:'down'},return:{map:'AlolaKonikoniCity',x:back.x,y:back.y,facing:'down'}};
})();
