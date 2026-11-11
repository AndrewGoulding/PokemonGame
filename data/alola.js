// Unified Ultra Sun / Ultra Moon opening. Backgrounds use existing 2D placeholders;
// each map has its own identity, warps, events and encounter data.
(function(){
 'use strict';
 const source=window.KALOS_DATA?.maps;if(!source)return;
 const specs=[
  ['AlolaHome','KalosHome','Hau’oli Outskirts · Home',[['AlolaHauoliOutskirts',1]]],
  ['AlolaHauoliOutskirts','KalosVanivilleTown','Hau’oli Outskirts',[['AlolaRoute1',0],['AlolaHome',0]]],
  ['AlolaRoute1','KalosRoute1','Route 1 · Melemele',[['AlolaHauoliOutskirts',0],['AlolaIkiTown',0]]],
  ['AlolaIkiTown','KalosAquacordeTown','Iki Town',[['AlolaRoute1',1],['AlolaMahaloTrail',0],['AlolaPokeCenter',0],['AlolaTrainerSchool',0]]],
  ['AlolaMahaloTrail','KalosRoute2','Mahalo Trail',[['AlolaIkiTown',1]]],
  ['AlolaPokeCenter','KalosAquacordeRestHouse','Iki Town · Pokémon Center',[['AlolaIkiTown',2]]],
  ['AlolaTrainerSchool','KalosAquacordeShop','Trainer School',[['AlolaIkiTown',3]]]
 ];
 const maps={};for(const[name,template,title,targets]of specs){
  const original=source[template];if(!original)throw Error('Missing Alola placeholder: '+template);
  const m=JSON.parse(JSON.stringify(original));m.name=name;m.title=title;m.region='alola';m.alolaCampaign='ultra';
  m.image=template;m.people=[];m.signs=[];m.triggers=[];m.hidden=[];m.connections=[];
  m.warps=targets.map(([target,warp],i)=>({...original.warps[i],map:target,warp}));
  delete m.kalosEncounter;delete m.kalosSurfaces;delete m.kalosPickup;delete m.anim;
  delete m.wild;delete m.water;delete m.fishing;maps[name]=m;
 }
 const person=(m,x,y,script,sprite='bw2_lass')=>maps[m].people.push({
   id:'usum-'+maps[m].people.length,localId:'USUM_'+m+'_'+maps[m].people.length,
   x,y,script,sprite,width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0
 });
 person('AlolaHome',7,7,'usum:mom','bw2_147');
 person('AlolaHauoliOutskirts',25,18,'usum:travel','bw2_lass');
 person('AlolaRoute1',12,11,'usum:kukui','bw2_scientist_m_52');
 person('AlolaIkiTown',19,12,'usum:hau','bw2_youngster');
 person('AlolaIkiTown',24,12,'usum:festival','bw2_105');
 person('AlolaMahaloTrail',16,22,'usum:lillie','bw2_lass');
 person('AlolaPokeCenter',8,6,'usum:heal','bw2_147');
 person('AlolaPokeCenter',12,6,'usum:mart','bw2_scientist_m_52');
 for(const[x,y,i]of [[7,8,0],[12,8,1],[7,11,2],[12,11,3]])person('AlolaTrainerSchool',x,y,'usum:student-'+i,'bw2_youngster');
 person('AlolaTrainerSchool',10,5,'usum:teacher','bw2_147');
 // One combined encounter pool, not separated by Ultra Sun/Ultra Moon.
 const pool=['Pikipek','Yungoos','Grubbin','Caterpie','Ledyba','Spinarak','Pichu','Bonsly'];
 maps.AlolaRoute1.wild={rate:30,weights:[20,20,15,15,10,10,5,5],slots:pool.map((species,i)=>({species,min:i>5?3:2,max:i>5?4:3}))};
 // Mark safe unoccupied tiles as grass in a small patch, without altering collision or doors.
 for(let y=7;y<=14;y++)for(let x=6;x<=9;x++){const m=maps.AlolaRoute1,i=y*m.width+x;if(!m.collision[i]&&!m.warps.some(w=>w.x===x&&w.y===y))m.behavior[i]=2;}
 maps.AlolaMahaloTrail.wild={rate:20,weights:[30,25,20,15,10],slots:[
  {species:'Pikipek',min:3,max:5},{species:'Caterpie',min:3,max:5},
  {species:'Grubbin',min:3,max:5},{species:'Ledyba',min:3,max:5},{species:'Spinarak',min:3,max:5}]};
 window.ALOLA_DATA={maps,start:{map:'AlolaHome',x:10,y:13,facing:'up'},
  return:{map:'FightArea',x:30,y:25,facing:'down'},starters:['Rowlet','Litten','Popplio']};
})();