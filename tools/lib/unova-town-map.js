// Authored 2D regional schematic; names and map membership use source zone/place
// records. This is not the unreleased archive-84/85 DS Town Map artwork.
'use strict';
const path=require('path'),{canvas,text}=require('./orre-art');
module.exports=function({root,json,M,bankMaps,centers,postgame}){
 const points={
 aspertia_city:[1,14],route_19:[1,13],floccesy_town:[3,13],route_20:[5,13],floccesy_ranch:[4,12],pledge_grove:[2,12],virbank_city:[6,13],virbank_complex:[6,14],pokestar_studios:[6,12],
 castelia_city:[13,12],castelia_sewers:[14,12],liberty_garden:[10,14],unity_tower:[12,14],royal_unova:[14,14],skyarrow_bridge:[17,12],pinwheel_forest:[19,12],nacrene_city:[21,12],route_3:[23,12],wellspring_cave:[23,11],striaton_city:[25,12],dreamyard:[26,12],route_2:[25,13],accumula_town:[25,14],route_1:[25,15],nuvema_town:[26,15],route_17:[23,15],route_18:[21,15],p2_laboratory:[23,14],
 route_4:[13,10],desert_resort:[11,10],relic_castle:[11,9],join_avenue:[13,9],nimbasa_city:[13,8],route_5:[11,8],driftveil_drawbridge:[9,8],driftveil_city:[7,8],pwt:[7,9],relic_passage:[9,10],route_6:[5,8],mistralton_cave:[4,8],guidance_chamber:[4,8],chargestone_cave:[3,7],mistralton_city:[3,6],route_7:[3,4],celestial_tower:[2,3],twist_mountain:[4,3],icirrus_city:[6,2],dragonspiral_tower:[6,1],route_8:[7,2],moor_of_icirrus:[7,1],tubeline_bridge:[9,2],route_9:[11,2],shopping_mall:[11,1],opelucid_city:[13,2],route_11:[15,2],village_bridge:[17,2],route_12:[19,2],lacunosa_town:[21,2],route_13:[22,3],giant_chasm:[22,1],route_22:[24,1],humilau_city:[25,2],route_21:[25,3],seaside_cave:[25,4],undella_town:[24,5],undella_bay:[26,5],abyssal_ruins:[26,6],marine_tube:[25,5],reversal_mountain:[21,5],lentimas_town:[20,5],strange_house:[21,6],route_14:[24,7],abundant_shrine:[23,7],black_city:[24,9],black_tower:[24,9],white_forest:[25,9],white_treehollow:[25,9],route_15:[21,9],marvelous_bridge:[19,9],route_16:[16,8],lostlorn_forest:[16,7],entralink:[16,5],entree_forest:[16,4],anville_town:[1,2],battle_subway:[14,8],gear_station:[14,8],musical_theater:[13,7],clay_tunnel:[6,6],underground_ruins:[6,5],rock_peak_chamber:[6,5],iceberg_chamber:[6,5],iron_chamber:[6,5],route_23:[20,1],victory_road:[19,1],pokemon_league:[19,0],ns_castle:[18,1],cave_of_being:[7,12],nature_preserve:[1,0]
 };
 const width=28,height=16,grid=()=>Array.from({length:height},()=>Array(width).fill('')),
 R={id:'UNOVA',label:'Unova',image:'assets/town-map/unova.png',x0:8,y0:24,width,height,map:grid(),dungeon:grid(),towns:[],names:{},mapSections:{},fly:{},at:{},provenance:{places:'res/field/places/*.json',zones:'res/field/zones/*.json',geometry:'Authored regional schematic, not DS Town Map archives'}};
 const sec=k=>'UNOVA_'+k.toUpperCase(),isTown=k=>/_(city|town)$/.test(k)||k==='pokemon_league';
 for(const[k,xy]of Object.entries(points)){
  const id=sec(k);R.names[id]=json('res/field/places/'+k+'.json').name;
  const [x,y]=xy,layer=isTown(k)||/^route_/.test(k)||/bridge/.test(k)?R.map:R.dungeon;
  if(!layer[y][x])layer[y][x]=id;if(isTown(k))R.towns.push(id);
 }
 // Interiors inherit their source place when it has a map square. Unnamed
 // annexes, Centers, grottos and boats inherit the nearest connected location.
 for(const[bank,m]of Object.entries(bankMaps)){
  const z=json('res/field/zones/'+bank+'.json'),k=z.place.slice(6).toLowerCase();
  if(points[k]&&(!R.at[m.name]||m.unovaSourceZone===bank)){
   R.mapSections[m.name]=sec(k);R.at[m.name]=points[k].slice();
  }
 }
 // Some activities enter by scripted teleports rather than static warps.
 for(const m of Object.values(M))if(!R.at[m.name]){
  const k=Object.keys(points).sort((a,b)=>b.length-a.length).find(k=>m.name.replace(/^Unova/,"").toLowerCase().startsWith(k.replaceAll("_","")));
  if(k){R.at[m.name]=points[k].slice();R.mapSections[m.name]=sec(k);}
 }
 for(const m of Object.values(M))if(!R.at[m.name]){
  const seen=new Set([m.name]),q=[m.name];let found;
  for(let i=0;i<q.length&&!found;i++)for(const w of M[q[i]].warps||[]){if(!M[w.map]||seen.has(w.map))continue;seen.add(w.map);if(R.at[w.map]){found=w.map;break;}q.push(w.map);}
  if(!found)throw Error('Unova Town Map has no regional anchor for '+m.name);
  R.at[m.name]=R.at[found].slice();R.mapSections[m.name]=R.mapSections[found];
 }
 for(const[city,center]of Object.entries(centers)){
  const out=M[center].warps.find(w=>w.map===city),door=M[city].warps[out.warp];R.fly[R.mapSections[city]]={map:city,x:door.x,y:door.y+1,facing:'down'};
 }
 for(const spot of postgame.fly||[])if(R.mapSections[spot.map])R.fly[R.mapSections[spot.map]]={...spot};
 const c=canvas(240,160);c.rect(0,0,240,160,[98,166,197]);
 c.poly([[7,148],[7,103],[25,91],[22,37],[44,22],[105,24],[133,26],[164,20],[213,22],[232,47],[227,90],[234,147]], [155,198,133]);
 c.poly([[65,49],[111,45],[171,49],[180,82],[151,99],[90,96],[68,77]], [98,166,197]);
 for(let y=26;y<154;y+=8)for(let x=8;x<232;x+=8)c.p(x,y,[121,181,187]);
 const xy=k=>points[k].map((v,i)=>(i?R.y0:R.x0)+v*8+4);
 const edges=[['aspertia_city','route_19','floccesy_town','route_20','virbank_city','virbank_complex'],['route_20','floccesy_ranch'],['floccesy_town','pledge_grove'],['virbank_city','pokestar_studios'],['nuvema_town','route_1','accumula_town','route_2','striaton_city','route_3','nacrene_city','pinwheel_forest','skyarrow_bridge','castelia_city','route_4','join_avenue','nimbasa_city','route_5','driftveil_drawbridge','driftveil_city','route_6','chargestone_cave','mistralton_city','route_7','twist_mountain','icirrus_city','route_8','tubeline_bridge','route_9','opelucid_city','route_11','village_bridge','route_12','lacunosa_town','route_13','undella_town','route_14','black_city','route_15','marvelous_bridge','route_16','nimbasa_city'],['route_15','white_forest'],['undella_town','marine_tube','seaside_cave','route_21','humilau_city','route_22','giant_chasm','route_23','victory_road','pokemon_league'],['lentimas_town','reversal_mountain','undella_town'],['route_7','celestial_tower'],['icirrus_city','dragonspiral_tower'],['route_8','moor_of_icirrus'],['route_9','shopping_mall'],['route_6','mistralton_cave'],['driftveil_city','pwt','relic_passage'],['driftveil_city','clay_tunnel','underground_ruins'],['route_4','desert_resort','relic_castle'],['route_16','lostlorn_forest'],['reversal_mountain','strange_house'],['route_14','abundant_shrine'],['route_1','route_17','route_18'],['route_17','p2_laboratory'],['route_3','wellspring_cave']];
 for(const chain of edges)for(let i=1;i<chain.length;i++){const a=xy(chain[i-1]),b=xy(chain[i]);c.line(...a,...b,[69,109,98],4);c.line(...a,...b,[238,217,149],2);}
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const id=R.map[y][x]||R.dungeon[y][x];if(!id)continue;
  const town=R.towns.includes(id),px=R.x0+x*8,py=R.y0+y*8;
  c.box(px+1,py+1,6,6,town?[225,121,99]:[239,219,158],[58,93,105]);
 }
 c.rect(0,0,240,17,[48,82,112]);text(c,'UNOVA',106,6,[246,239,205]);c.save(path.join(root,R.image));return R;
};
