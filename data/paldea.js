// Scarlet/Violet unified Paldea opening. 2D Kalos geometry is temporary.
(function(){
'use strict';
const source=window.KALOS_DATA?.maps;if(!source)return;
const specs=[
 ['Home','AquacordeRestHouse','Cabo Poco · Home','CaboPoco:0'],
 ['CaboPoco','CamphrierTown','Cabo Poco','Home:0 PocoPath:0 Lighthouse:0'],
 ['PocoPath','Route3','Poco Path','CaboPoco:1 InletGrotto:0'],
 ['InletGrotto','GlitteringCave','Inlet Grotto','PocoPath:1'],
 ['Lighthouse','Route3','Poco Path Lighthouse','CaboPoco:2 LosPlatos:0'],
 ['LosPlatos','CamphrierTown','Los Platos','Lighthouse:1 SouthProvince:0 LosPlatosCenter:0'],
 ['LosPlatosCenter','SantaluneCenter','Los Platos Pokémon Center','LosPlatos:2'],
 ['SouthProvince','Route7East','South Province (Area One)','LosPlatos:1 Mesagoza:0'],
 ['Mesagoza','AquacordeTown','Mesagoza','SouthProvince:1 Academy:0 Cortondo:0 MesagozaCenter:0'],
 ['Academy','AquacordeShop','Naranja / Uva Academy','Mesagoza:1'],
 ['MesagozaCenter','SantaluneCenter','Mesagoza Pokémon Center','Mesagoza:3'],
 ['Cortondo','CamphrierTown','Cortondo','Mesagoza:2 CortondoGym:0'],
 ['CortondoGym','GymGallery','Cortondo Gym','Cortondo:1']
];
const maps={};
function free(m,x,y){return x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);}
function safe(m,x,y){
 const cells=[];for(let yy=2;yy<m.height-2;yy++)for(let xx=2;xx<m.width-2;xx++)if(free(m,xx,yy))cells.push({x:xx,y:yy,d:Math.abs(xx-x)+Math.abs(yy-y)});
 cells.sort((a,b)=>a.d-b.d);if(!cells.length)throw Error('Paldea has no safe tile on '+m.name);
 return cells[0];
}
for(const [id,template,title,links] of specs){
 const original=source['Kalos'+template],targets=links.split(' ');
 if(!original||original.warps.length<targets.length)throw Error('Missing Paldea template exits: '+template+' for '+id);
 const m=JSON.parse(JSON.stringify(original));
 Object.assign(m,{name:'Paldea'+id,title,region:'paldea',paldeaCampaign:'scarlet-violet',image:'Kalos'+template,
  people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=targets.map((link,i)=>{const [to,warp]=link.split(':');return {...original.warps[i],map:'Paldea'+to,warp:+warp};});
 for(const key of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[key];
 maps[m.name]=m;
}
function npc(id,x,y,script,sprite='bw2_youngster'){
 const m=maps['Paldea'+id],a=safe(m,x,y);
 m.people.push({id:'paldea-'+id+'-'+m.people.length,localId:'PALDEA_'+id+'_'+m.people.length,
  x:a.x,y:a.y,script:'sv:'+script,sprite,width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
[
 ['Home',9,7,'mom','bw2_147'],['Home',15,7,'return','bw2_scientist_f_46'],
 ['CaboPoco',16,12,'clavell','bw2_105'],['CaboPoco',24,14,'nemona-starter','bw2_lass'],
 ['PocoPath',15,12,'nemona-first','bw2_lass'],['InletGrotto',15,13,'legendary','bw2_105'],
 ['Lighthouse',18,13,'arven','bw2_youngster'],['LosPlatos',17,13,'nemona-town','bw2_lass'],
 ['LosPlatosCenter',9,7,'heal','bw2_147'],['SouthProvince',18,14,'nemona-route','bw2_lass'],
 ['Mesagoza',18,14,'nemona-mesagoza','bw2_lass'],['MesagozaCenter',9,7,'heal','bw2_147'],
 ['Academy',13,11,'director','bw2_105'],['Academy',20,12,'penny','bw2_lass'],
 ['Cortondo',20,15,'katy-invite','bw2_lass'],['CortondoGym',14,12,'katy-gym','bw2_lass']
].forEach(args=>npc(...args));
for(const [id,pool] of [
 ['PocoPath',[['Lechonk',2,4],['Tarountula',2,4],['Hoppip',3,5]]],
 ['InletGrotto',[['Yungoos',4,6],['Diglett',4,6],['Pawmi',4,6]]],
 ['Lighthouse',[['Fletchling',4,6],['Pawmi',4,6]]],
 ['SouthProvince',[['Smoliv',7,9],['Nymble',7,9],['Fidough',7,9],['Pawmi',8,10]]],
 ['Cortondo',[['Tarountula',11,14],['Combee',11,14],['Nymble',12,15]]]
]){
 const m=maps['Paldea'+id],unit=Math.floor(100/pool.length);
 m.wild={rate:24,weights:pool.map((_,i)=>i===pool.length-1?100-i*unit:unit),
  slots:pool.map(([species,min,max])=>({species,min,max}))};
 for(let y=5;y<Math.min(m.height-4,16);y++)for(let x=5;x<Math.min(m.width-4,12);x++)if(free(m,x,y))m.behavior[y*m.width+x]=2;
}
const start=safe(maps.PaldeaHome,10,13);
window.PALDEA_DATA={maps,mapNames:specs.map(s=>'Paldea'+s[0]),
 starters:['Sprigatito','Fuecoco','Quaxly'],start:{map:'PaldeaHome',x:start.x,y:start.y,facing:'up'},
 return:{map:'FightArea',x:30,y:25,facing:'down'}};
})();