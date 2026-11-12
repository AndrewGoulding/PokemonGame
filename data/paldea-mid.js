// Scarlet/Violet Victory Road continuation: Artazon and Cascarrafa.
(function(){
'use strict';
const D=window.PALDEA_DATA,source=window.KALOS_DATA?.maps;if(!D||!source)return;
const specs=[
 ['EastProvince','Route3','East Province (Area One)','SouthProvince:2 Artazon:0'],
 ['Artazon','CamphrierTown','Artazon','EastProvince:1 ArtazonCenter:0 ArtazonGym:0'],
 ['ArtazonCenter','SantaluneCenter','Artazon Pokémon Center','Artazon:1'],
 ['ArtazonGym','GymGallery','Artazon Gym','Artazon:2'],
 ['WestProvince','Route3','West Province (Area One)','Cortondo:2 Cascarrafa:0'],
 ['Cascarrafa','CamphrierTown','Cascarrafa','WestProvince:1 CascarrafaCenter:0 CascarrafaGym:0'],
 ['CascarrafaCenter','SantaluneCenter','Cascarrafa Pokémon Center','Cascarrafa:1'],
 ['CascarrafaGym','GymGallery','Cascarrafa Gym','Cascarrafa:2']
];
const added=[];
const free=(m,x,y)=>x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);
function nearest(m,x,y){
 const arr=[];for(let yy=2;yy<m.height-2;yy++)for(let xx=2;xx<m.width-2;xx++)if(free(m,xx,yy))arr.push({x:xx,y:yy,d:Math.abs(xx-x)+Math.abs(yy-y)});
 arr.sort((a,b)=>a.d-b.d);if(!arr.length)throw Error('Paldea midgame map blocked '+m.name);return arr[0];
}
for(const [id,template,title,links] of specs){
 const original=source['Kalos'+template],targets=links.split(' ');
 if(!original||original.warps.length<targets.length)throw Error('Paldea midgame missing template exits '+id);
 const m=JSON.parse(JSON.stringify(original));
 Object.assign(m,{name:'Paldea'+id,title,region:'paldea',paldeaCampaign:'scarlet-violet',image:'Kalos'+template,
  people:[],signs:[],triggers:[],hidden:[],connections:[]});
 m.warps=targets.map((link,i)=>{const [to,warp]=link.split(':');return {...original.warps[i],map:'Paldea'+to,warp:+warp};});
 for(const key of ['kalosEncounter','kalosSurfaces','kalosWater','kalosPickup','kalosTown','wild','water','fishing','anim'])delete m[key];
 D.maps[m.name]=m;D.mapNames.push(m.name);added.push(m.name);
}
function connect(from,to,index,preferred){
 const m=D.maps['Paldea'+from],other=D.maps['Paldea'+to];
 if(!m||!other||index!==m.warps.length)throw Error('Unexpected Paldea connection '+from);
 const base=source[m.image],slot=base.warps[index];
 const at=slot && free(m,slot.x,slot.y)?{x:slot.x,y:slot.y}:nearest(m,preferred[0],preferred[1]);
 m.warps.push({...slot||{},x:at.x,y:at.y,map:other.name,warp:0});
}
// Original routes had two warps. Extend them using existing free tile geometry.
connect('SouthProvince','EastProvince',2,[25,15]);
connect('Cortondo','WestProvince',2,[25,15]);
function npc(id,x,y,script,sprite='bw2_youngster'){
 const m=D.maps['Paldea'+id],a=nearest(m,x,y);
 m.people.push({id:'paldea-mid-'+id+'-'+m.people.length,localId:'PALDEA_MID_'+id+'_'+m.people.length,
  x:a.x,y:a.y,script:'sv:'+script,sprite,width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
[
 ['EastProvince',16,13,'east-trainer'],['Artazon',19,14,'brassius-invite','bw2_105'],
 ['ArtazonCenter',9,7,'heal','bw2_147'],['ArtazonGym',14,12,'brassius-gym','bw2_105'],
 ['WestProvince',16,13,'west-trainer'],['Cascarrafa',20,14,'kofu-invite','bw2_105'],
 ['CascarrafaCenter',9,7,'heal','bw2_147'],['CascarrafaGym',15,12,'kofu-gym','bw2_105']
].forEach(a=>npc(...a));
for(const [id,pool] of [
 ['EastProvince',[['Nacli',15,18],['Tadbulb',15,18],['Shroodle',15,18]]],
 ['Artazon',[['Smoliv',16,19],['Petilil',16,19],['Fletchling',16,19]]],
 ['WestProvince',[['Maschiff',24,28],['Toedscool',24,28],['Nacli',24,28]]],
 ['Cascarrafa',[['Tadbulb',28,31],['Veluza',28,31],['Wiglett',28,31]]]
]){
 const m=D.maps['Paldea'+id],u=Math.floor(100/pool.length);
 m.wild={rate:24,weights:pool.map((_,i)=>i===pool.length-1?100-u*i:u),
  slots:pool.map(([species,min,max])=>({species,min,max}))};
 for(let y=5;y<Math.min(m.height-4,16);y++)for(let x=5;x<Math.min(m.width-4,12);x++)if(free(m,x,y))m.behavior[y*m.width+x]=2;
}
D.midgame={mapNames:added,centers:['PaldeaArtazonCenter','PaldeaCascarrafaCenter']};
})();