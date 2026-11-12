// Galar midgame, Sword and Shield unified route graph (Kalos 2D placeholders).
(function(){
'use strict';
const D=window.GALAR_DATA,source=window.KALOS_DATA?.maps;if(!D||!source)return;
const specs=[["WildAreaNorth","Route3","Bridge Field · Wild Area","MotostokeOutskirts:1 Hammerlocke:0"],["Hammerlocke","AquacordeTown","Hammerlocke","WildAreaNorth:1 Route6:0 HammerlockeStadium:0 HammerlockeGate:0"],["HammerlockeCenter","SantaluneCenter","Hammerlocke Pokémon Center","HammerlockeGate:1"],["HammerlockeStadium","GymGallery","Hammerlocke Stadium","Hammerlocke:2"],["Route6","Route3","Galar Route 6","Hammerlocke:1 StowOnSide:0"],["StowOnSide","AquacordeTown","Stow-on-Side","Route6:1 StowCenter:0 StowStadium:0 StowOutskirts:0"],["StowCenter","SantaluneCenter","Stow-on-Side Pokémon Center","StowOnSide:1"],["StowStadium","GymGallery","Stow-on-Side Stadium","StowOnSide:2"],["GlimwoodTangle","Route2","Glimwood Tangle","StowOutskirts:1 Ballonlea:0"],["StowOutskirts","Route3","Stow-on-Side Outskirts","StowOnSide:3 GlimwoodTangle:0"],["Ballonlea","AquacordeTown","Ballonlea","GlimwoodTangle:1 BallonleaCenter:0 BallonleaStadium:0 Route7:0"],["BallonleaCenter","SantaluneCenter","Ballonlea Pokémon Center","Ballonlea:1"],["BallonleaStadium","GymGallery","Ballonlea Stadium","Ballonlea:2"],["Route7","Route3","Galar Route 7","Ballonlea:3 Route8:0"],["Route8","Route3","Galar Route 8","Route7:1 Circhester:0"],["Circhester","AquacordeTown","Circhester","Route8:1 CirchesterCenter:0 CirchesterStadium:0 Route9:0"],["CirchesterCenter","SantaluneCenter","Circhester Pokémon Center","Circhester:1"],["CirchesterStadium","GymGallery","Circhester Stadium","Circhester:2"],["Route9","Route3","Galar Route 9","Circhester:3 Spikemuth:0"],["Spikemuth","AquacordeTown","Spikemuth","Route9:1 SpikemuthCenter:0 Route9Tunnel:0 SpikemuthGym:0"],["SpikemuthCenter","SantaluneCenter","Spikemuth Pokémon Center","Spikemuth:1"],["Route9Tunnel","Route3","Route 9 Tunnel","Spikemuth:2 HammerlockeGate:2"],["HammerlockeGate","CamphrierTown","Hammerlocke Gate","Hammerlocke:3 HammerlockeCenter:0 Route9Tunnel:1"],["SpikemuthGym","AquacordeShop","Spikemuth Gym","Spikemuth:3"]],maps=D.maps;
for(const[id,t,title,dests]of specs){
 const base=source['Kalos'+t],links=dests.split(' ');
 if(!base||base.warps.length<links.length)throw Error('Galar midgame template missing exits '+id+' '+t);
 const m=JSON.parse(JSON.stringify(base));
 Object.assign(m,{name:'Galar'+id,title,region:'galar',galarCampaign:'sword-shield',image:'Kalos'+t,people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=links.map((link,i)=>{const[to,k]=link.split(':');return{...base.warps[i],map:'Galar'+to,warp:+k};});
 for(const key of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[key];
 maps[m.name]=m;
}
const entry=maps.GalarMotostokeOutskirts,sourceEntry=source.KalosRoute2;
if(entry.warps.length!==1||sourceEntry.warps.length<2)throw Error('Galar midgame expected Motostoke Outskirts return warp');
entry.warps.push({...sourceEntry.warps[1],map:'GalarWildAreaNorth',warp:0});
function free(m,x,y){return x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);}
function near(m,x,y){
 if(free(m,x,y))return{x,y};const spots=[];
 for(let py=2;py<m.height-2;py++)for(let px=2;px<m.width-2;px++)if(free(m,px,py))spots.push({x:px,y:py,d:Math.abs(x-px)+Math.abs(y-py)});
 spots.sort((a,b)=>a.d-b.d);if(!spots.length)throw Error('No safe Galar midgame NPC tile '+m.name);return spots[0];
}
function npc(id,x,y,key){
 const m=maps['Galar'+id],pos=near(m,x,y);
 m.people.push({id:'galar-mid-'+m.people.length,localId:'SWSH_MID_'+id+'_'+m.people.length,x:pos.x,y:pos.y,script:'swsh:'+key,
 sprite:'bw2_youngster',width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
[["WildAreaNorth",16,15,"wild-north-guide"],["Hammerlocke",20,15,"hop-hammerlocke"],["Hammerlocke",27,14,"rose-hammerlocke"],["HammerlockeCenter",9,7,"galar-heal"],["HammerlockeStadium",13,12,"raihan-gym"],["Route6",15,13,"team-yell-route6"],["StowOnSide",20,13,"sonia-stow"],["StowCenter",9,7,"galar-heal"],["StowStadium",15,14,"stow-gym"],["StowOutskirts",15,13,"bede-stow"],["GlimwoodTangle",14,12,"glimwood-trainer"],["Ballonlea",20,15,"opal-town"],["BallonleaCenter",9,7,"galar-heal"],["BallonleaStadium",13,13,"opal-gym"],["Route7",16,14,"hop-route7"],["Route8",16,14,"route8-trainer"],["Circhester",19,14,"sonia-circhester"],["CirchesterCenter",9,7,"galar-heal"],["CirchesterStadium",14,13,"circhester-gym"],["Route9",16,14,"team-yell-route9"],["Spikemuth",19,13,"marnie-spikemuth"],["SpikemuthCenter",9,7,"galar-heal"],["SpikemuthGym",13,12,"piers-gym"],["Route9Tunnel",13,13,"hop-return"],["HammerlockeGate",19,12,"raihan-invite"]].forEach(a=>npc(...a));
for(const[id,pool,min,max]of [["WildAreaNorth",["Corvisquire","Dottler","Rolycoly","Toxel"],26,33],["Route6",["Silicobra","Hippopotas","Trapinch","Axew"],28,34],["GlimwoodTangle",["Impidimp","Morgrem","Hattrem","Phantump"],33,38],["Route7",["Perrserker","Morpeko","Galvantula","Boltund"],36,41],["Route8",["Snom","Falinks","Bronzong","Rufflet"],38,44],["Route9",["Clobbopus","Grapploct","Cramorant","Toxapex"],42,47],["Route9Tunnel",["Duraludon","Excadrill","Noibat"],44,48]]){
 const m=maps['Galar'+id],unit=Math.floor(100/pool.length);
 m.wild={rate:25,weights:pool.map((_,i)=>i===pool.length-1?100-unit*i:unit),slots:pool.map(species=>({species,min,max}))};
 for(let y=6;y<Math.min(m.height-4,17);y++)for(let x=5;x<Math.min(m.width-4,12);x++)if(free(m,x,y))m.behavior[y*m.width+x]=2;
}
D.midgame={mapNames:specs.map(x=>'Galar'+x[0]),centers:['GalarHammerlockeCenter','GalarStowCenter','GalarBallonleaCenter','GalarCirchesterCenter','GalarSpikemuthCenter']};
D.mapNames.push(...D.midgame.mapNames);
})();
