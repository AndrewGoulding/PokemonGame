// Galar Wild Area weather, roaming encounters, and Sword/Shield Max Raid dens.
// Uses the existing Gen 8 battle engine and shared player party/save data.
(function(){
'use strict';
const D=window.GALAR_DATA;if(!D||!window.Galar)return;
const AREAS=['GalarWildAreaSouth','GalarWildAreaNorth','GalarFieldsOfHonor','GalarSoothingWetlands','GalarFrostpointField','GalarGiantBed'];
const WEATHER=['sunny_clouds','rain','thunderstorm','snow','sandstorm','fog_horizontal'];
const POOLS={
 GalarWildAreaSouth:[['Onix',28],['Corviknight',32],['Gyarados',30]],
 GalarWildAreaNorth:[['Duraludon',42],['Snorlax',44],['Gengar',41]],
 GalarFieldsOfHonor:[['Chansey',50],['Kangaskhan',53],['Scyther',52]],
 GalarSoothingWetlands:[['Tangrowth',53],['Amoonguss',54],['Drapion',55]],
 GalarFrostpointField:[['Abomasnow',67],['Metagross',68],['Froslass',65]],
 GalarGiantBed:[['Tyrantrum',70],['Golurk',69],['Aggron',69]]
};
const DEN_POOLS=[
 ['GalarWildAreaSouth',['Corviknight','Drednaw','Butterfree']],
 ['GalarWildAreaNorth',['Duraludon','Coalossal','Snorlax']],
 ['GalarFieldsOfHonor',['Venusaur','Blastoise','Urshifu']],
 ['GalarSoothingWetlands',['Vespiquen','Amoonguss','Slowbro-Galar']],
 ['GalarFrostpointField',['Frosmoth','Lapras','Abomasnow']],
 ['GalarGiantBed',['Copperajah','Metagross','Tyrantrum']],
 ['GalarChallengeBeach',['Kingler','Gyarados','Drednaw']],
 ['GalarBallimereLake',['Dragonite','Milotic','Lapras']]
];
const hash=map=>[...map].reduce((n,ch)=>((n*31+ch.charCodeAt(0))>>>0),7);
const day=p=>Math.floor((p.clockSteps||1000)/2400);
function weather(p,map){
 if(!AREAS.includes(map))return null;
 if(map==='GalarFrostpointField')return 'snow';
 const index=(day(p)+hash(map))%WEATHER.length;
 return WEATHER[index];
}
function battleWeather(p,map){
 const kind=weather(p,map);
 return {rain:'raindance',thunderstorm:'raindance',sandstorm:'sandstorm',snow:'snow',sunny_clouds:'sunnyday'}[kind]||null;
}
function free(m,x,y){
 return x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&
 !m.warps.some(a=>a.x===x&&a.y===y)&&!m.people.some(a=>a.x===x&&a.y===y);
}
function nearest(m,x,y){
 if(free(m,x,y))return{x,y};
 const a=[];for(let py=2;py<m.height-2;py++)for(let px=2;px<m.width-2;px++)if(free(m,px,py))a.push({x:px,y:py,d:Math.abs(x-px)+Math.abs(y-py)});
 a.sort((a,b)=>a.d-b.d);return a[0]||null;
}
function place(map,key,x,y,sprite){
 const m=D.maps[map],a=nearest(m,x,y);if(!a)throw Error('No Galar encounter tile on '+map);
 const id='swsh:'+key;
 if(m.people.some(p=>p.script===id))return;
 m.people.push({id:'galar-wild-'+key,localId:'GALAR_WILD_'+key,x:a.x,y:a.y,script:id,
  sprite:sprite||'bw2_105',width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
const dens=[];
DEN_POOLS.forEach(([map,species],i)=>{
 const key='galar-den-'+i;dens.push({id:i,map,species,script:'swsh:'+key});
 place(map,key,19,18,'bw2_105');
 if(i<AREAS.length)place(map,'galar-roamer-'+i,26,18,'bw2_youngster');
});
function raid(p,i){
 const den=dens[i];if(!den)return null;
 const s=Galar.state(p),state=s.maxRaids||(s.maxRaids={});
 const prev=state[i];
 if(prev&&prev.status==='active')return prev;
 if(prev&&prev.status==='cleared'&&prev.completed===day(p))return null;
 const index=(day(p)+hash(den.map)+i)%den.species.length;
 const stars=Math.max(1,Math.min(5,1+Math.floor((s.badges||[]).length/2)));
 const entry={status:'active',species:den.species[index],level:Math.min(75,15+stars*10),stars,started:day(p)};
 state[i]=entry;return entry;
}
function clear(p,i){const state=Galar.state(p).maxRaids||{};if(state[i]){state[i].status='cleared';state[i].completed=day(p);}}
function roamer(p,i){
 const map=AREAS[i],pool=POOLS[map];if(!pool)return null;
 const index=(day(p)+i)%pool.length,entry=pool[index];
 return{map,species:entry[0],level:entry[1],key:map+':'+day(p)+':'+index};
}
window.GalarWild={AREAS,WEATHER,POOLS,dens,weather,battleWeather,raid,clear,roamer,day};
})();
