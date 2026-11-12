// Galar's Champion Cup, Darkest Day and postgame locations, shared Sword/Shield.
(function(){
'use strict';
const D=window.GALAR_DATA,source=window.KALOS_DATA?.maps;if(!D||!source)return;
const specs=[["Route10","Route3","Galar Route 10","HammerlockeStadium:1 WyndonWest:0"],["WyndonWest","CamphrierTown","Wyndon Approach","Route10:1 WyndonCity:0 WyndonHotel:0"],["WyndonHotel","AquacordeRestHouse","Wyndon Hotel","WyndonWest:2"],["WyndonCity","AquacordeTown","Wyndon","WyndonWest:1 WyndonCenter:0 WyndonStadium:0 RoseTower:0"],["WyndonCenter","SantaluneCenter","Wyndon Pokémon Center","WyndonCity:1"],["WyndonStadium","GymGallery","Wyndon Stadium","WyndonCity:2"],["RoseTower","GymGallery","Rose Tower","WyndonCity:3 RoseTowerTop:0"],["RoseTowerTop","CamphrierTown","Rose Tower Summit","RoseTower:1 EnergyPlant:0 BattleTower:0"],["EnergyPlant","GymGallery","Hammerlocke Energy Plant","RoseTowerTop:1 EternatusChamber:0"],["EternatusChamber","SeaSpiritsDen","Eternatus Chamber","EnergyPlant:1"],["BattleTower","AquacordeShop","Wyndon Battle Tower","RoseTowerTop:2"],["SlumberingDepths","Route3","Slumbering Weald Depths","SlumberingWeald:1 WealdShrine:0"],["WealdShrine","SeaSpiritsDen","Ancient Hero Shrine","SlumberingDepths:1"]],maps=D.maps;
for(const[id,template,title,edges]of specs){
 const base=source['Kalos'+template],links=edges.split(' ');
 if(!base||base.warps.length<links.length)throw Error('Galar finale template missing exits '+id+' '+template);
 const m=JSON.parse(JSON.stringify(base));
 Object.assign(m,{name:'Galar'+id,title,region:'galar',galarCampaign:'sword-shield',image:'Kalos'+template,people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=links.map((edge,i)=>{const[to,k]=edge.split(':');return {...base.warps[i],map:'Galar'+to,warp:+k};});
 for(const key of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[key];
 maps[m.name]=m;
}
// Preserve original warp indices and old saves when connecting the two new exits.
function extend(map,template,index,to,warp){
 const m=maps['Galar'+map],base=source['Kalos'+template];
 if(!m||!base?.warps[index]||m.warps.length!==index)throw Error('Galar finale exit '+map+':'+index);
 m.warps.push({...base.warps[index],map:'Galar'+to,warp});
}
extend('HammerlockeStadium','GymGallery',1,'Route10',0);
extend('SlumberingWeald','Route2',1,'SlumberingDepths',0);
function free(m,x,y){return x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);}
function near(m,x,y){
 if(free(m,x,y))return{x,y};const spots=[];
 for(let py=2;py<m.height-2;py++)for(let px=2;px<m.width-2;px++)if(free(m,px,py))spots.push({x:px,y:py,d:Math.abs(x-px)+Math.abs(y-py)});
 spots.sort((a,b)=>a.d-b.d);if(!spots.length)throw Error('Galar finale has no NPC tile '+m.name);return spots[0];
}
function npc(id,x,y,key){
 const m=maps['Galar'+id],at=near(m,x,y);
 m.people.push({id:'galar-finale-'+m.people.length,localId:'SWSH_FINALE_'+id+'_'+m.people.length,x:at.x,y:at.y,script:'swsh:'+key,
 sprite:'bw2_105',width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
[["Route10",13,13,"route10-hop"],["Route10",23,16,"route10-trainer"],["WyndonWest",15,13,"wyndon-hauled"],["WyndonHotel",9,7,"wyndon-hotel"],["WyndonCity",18,15,"wyndon-sonia"],["WyndonCenter",9,7,"galar-final-heal"],["WyndonStadium",9,9,"cup-registration"],["WyndonStadium",14,10,"cup-marnie"],["WyndonStadium",18,10,"cup-hop"],["WyndonStadium",23,10,"cup-bede"],["WyndonStadium",11,16,"cup-nessa"],["WyndonStadium",15,16,"cup-bea"],["WyndonStadium",19,16,"cup-allister"],["WyndonStadium",23,16,"cup-raihan"],["WyndonStadium",19,22,"champion-leon"],["RoseTower",12,12,"macro-cosmos"],["RoseTowerTop",15,15,"rose-oleana"],["EnergyPlant",14,12,"chairman-rose"],["EternatusChamber",11,9,"eternatus"],["BattleTower",10,9,"galar-battle-tower"],["SlumberingDepths",13,13,"postgame-hop"],["WealdShrine",10,9,"swordward"],["WealdShrine",17,12,"shieldbert"],["WealdShrine",13,17,"zacian"],["WealdShrine",20,17,"zamazenta"]].forEach(a=>npc(...a));
for(const[id,species,min,max]of [["Route10",["Snom","Duraludon","Darmanitan-Galar","Vanillish"],43,49],["SlumberingDepths",["Corviknight","Morgrem","Orbeetle"],55,59]]){
 const m=maps['Galar'+id],weight=Math.floor(100/species.length);
 m.wild={rate:25,weights:species.map((_,i)=>i===species.length-1?100-weight*i:weight),
 slots:species.map(name=>({species:name,min,max}))};
 for(let y=6;y<Math.min(17,m.height-4);y++)for(let x=5;x<Math.min(12,m.width-4);x++)if(free(m,x,y))m.behavior[y*m.width+x]=2;
}
D.finale={mapNames:specs.map(s=>'Galar'+s[0]),centers:['GalarWyndonCenter']};
D.mapNames.push(...D.finale.mapNames);
})();
