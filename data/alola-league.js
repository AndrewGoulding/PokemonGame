// Alola League and postgame: one shared Ultra Sun and Ultra Moon campaign.
(function(){
'use strict';
const D=window.ALOLA_DATA,base=window.KALOS_DATA?.maps;if(!D||!base)return;
const specs=[["LanakilaBase","CamphrierTown","Mount Lanakila Base","LanakilaSlope:0 LanakilaCenter:0"],["LanakilaCenter","SantaluneCenter","Mount Lanakila Pokémon Center","LanakilaBase:1"],["LanakilaSlope","Route7East","Mount Lanakila Slopes","LanakilaBase:0 LanakilaCave:0 LanakilaSummit:0"],["LanakilaCave","GlitteringCave","Mount Lanakila Cave","LanakilaSlope:1"],["LanakilaSummit","Route7East","Mount Lanakila Summit","LanakilaSlope:2 LeagueLobby:0"],["LeagueLobby","CamphrierTown","Alola Pokémon League","LanakilaSummit:1 EliteMolayne:0 LeagueRest:0"],["LeagueRest","AquacordeShop","Pokémon League Recovery Room","LeagueLobby:2"],["EliteMolayne","GymGallery","Elite Four Molayne's Chamber","LeagueLobby:1 EliteOlivia:0"],["EliteOlivia","GymGallery","Elite Four Olivia's Chamber","EliteMolayne:1 EliteAcerola:0"],["EliteAcerola","GymGallery","Elite Four Acerola's Chamber","EliteOlivia:1 EliteKahili:0"],["EliteKahili","GymGallery","Elite Four Kahili's Chamber","EliteAcerola:1 ChampionRoom:0"],["ChampionRoom","GymGallery","Alola Champion's Chamber","EliteKahili:1 HallOfFame:0"],["HallOfFame","SeaSpiritsDen","Alola Hall of Fame","ChampionRoom:1"],["PostgamePort","CamphrierTown","Postgame Expedition Hub","BattleTree:0 RRBase:0 BeastStation:0"],["BattleTree","AquacordeShop","Battle Tree","PostgamePort:0"],["RRBase","GymGallery","Team Rainbow Rocket Headquarters","PostgamePort:1 RRLab:0"],["RRLab","GymGallery","Rainbow Rocket Laboratory","RRBase:1 RRBoss:0"],["RRBoss","SeaSpiritsDen","Rainbow Rocket Boss Room","RRLab:1"],["BeastStation","AquacordeShop","Ultra Beast Research Station","PostgamePort:2"]],maps=D.maps;
for(const [id,t,title,dests] of specs){
 const original=base['Kalos'+t],links=dests.split(' ');
 if(!original||original.warps.length<links.length)throw Error('Alola League missing template warps: '+t+' for '+id);
 const m=JSON.parse(JSON.stringify(original));
 Object.assign(m,{name:'Alola'+id,title,region:'alola',alolaCampaign:'ultra',alolaIsland:id.startsWith('RR')||['BattleTree','BeastStation','PostgamePort'].includes(id)?'postgame':'league',image:'Kalos'+t,people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=links.map((link,i)=>{const [to,j]=link.split(':');return {...original.warps[i],map:'Alola'+to,warp:+j};});
 for(const key of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[key];
 maps[m.name]=m;
}
function free(m,x,y){return x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);}
function near(m,x,y){
 if(free(m,x,y))return{x,y};const a=[];
 for(let py=2;py<m.height-2;py++)for(let px=2;px<m.width-2;px++)if(free(m,px,py))a.push({x:px,y:py,d:Math.abs(px-x)+Math.abs(py-y)});
 a.sort((l,r)=>l.d-r.d);if(!a.length)throw Error('No free League NPC tile on '+m.name);return a[0];
}
function npc(map,x,y,script){
 const m=maps['Alola'+map],pos=near(m,x,y);m.people.push({id:'usum-league-'+m.people.length,localId:'USUM_LEAGUE_'+map+'_'+m.people.length,x:pos.x,y:pos.y,script:'usum:'+script,sprite:'bw2_105',width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
[["LanakilaBase",16,14,"league-exit"],["LanakilaBase",23,15,"lanakila-guide"],["LanakilaCenter",9,7,"league-heal"],["LanakilaSlope",13,15,"lanakila-hau"],["LanakilaCave",15,13,"lanakila-trainer"],["LanakilaSummit",17,15,"league-gate"],["LeagueLobby",15,13,"league-registration"],["LeagueRest",9,7,"league-heal"],["EliteMolayne",15,15,"elite-molayne"],["EliteOlivia",15,15,"elite-olivia"],["EliteAcerola",15,15,"elite-acerola"],["EliteKahili",15,15,"elite-kahili"],["ChampionRoom",15,15,"champion-hau"],["HallOfFame",10,9,"league-hall"],["PostgamePort",15,15,"postgame-exit"],["PostgamePort",21,13,"postgame-guide"],["BattleTree",10,9,"battle-tree"],["RRBase",11,12,"rr-archie"],["RRBase",18,14,"rr-maxie"],["RRLab",12,13,"rr-cyrus"],["RRLab",19,14,"rr-ghetsis"],["RRLab",22,18,"rr-lysandre"],["RRBoss",10,9,"rr-giovanni"],["BeastStation",7,6,"beast-0"],["BeastStation",10,6,"beast-1"],["BeastStation",13,6,"beast-2"],["BeastStation",7,10,"beast-3"],["BeastStation",10,10,"beast-4"],["BeastStation",13,10,"beast-5"],["BeastStation",16,12,"beast-6"],["BeastStation",9,15,"beast-researcher"]].forEach(args=>npc(...args));
npc('SeafolkVillage',31,18,'league-ferry');
npc('AetherDock',30,17,'postgame-ferry');
// Optional postgame guardian and mascot encounters use the same unified save.
npc('MahaloTrail',22,12,'tapu-0');
npc('RuinsOfLife',16,13,'tapu-1');
npc('RuinsAbundance',14,11,'tapu-2');
npc('RuinsHope',14,11,'tapu-3');
npc('AltarSunne',18,11,'legend-sun');
npc('AltarSunne',22,12,'legend-moon');
for(const [id,pool] of [["LanakilaSlope",[["Sneasel",54,59],["Snorunt",53,58],["Golbat",53,58],["Absol",55,59]]],["LanakilaCave",[["Golbat",55,59],["Sneasel",55,60],["Vanillish",56,60]]],["LanakilaSummit",[["Absol",56,60],["Sneasel",56,60],["Glalie",57,60]]]]){
 const m=maps['Alola'+id],q=Math.floor(100/pool.length);
 m.wild={rate:25,weights:pool.map((_,i)=>i===pool.length-1?100-q*i:q),slots:pool.map(([species,min,max])=>({species,min,max}))};
 for(let y=6;y<Math.min(m.height-4,17);y++)for(let x=5;x<Math.min(m.width-4,12);x++)if(free(m,x,y))m.behavior[y*m.width+x]=2;
}
function landing(id,x=18,y=19){const m=maps['Alola'+id],a=near(m,x,y);return{map:m.name,x:a.x,y:a.y,facing:'down'};}
D.league={mapNames:specs.map(s=>'Alola'+s[0]),start:landing('LanakilaBase'),return:landing('SeafolkVillage'),postgameStart:landing('PostgamePort'),postgameReturn:landing('AetherDock')};
})();
