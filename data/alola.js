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

 // The next two chapters: Hau’oli City/Route 2, then Verdant Cavern and Hala.
 const additions=[
 ['AlolaHauoliBeach','KalosRoute3','Hau’oli Beachfront',[['AlolaIkiTown',4],['AlolaHauoliCity',0]]],
 ['AlolaHauoliCity','KalosSantaluneCity','Hau’oli City',[['AlolaHauoliBeach',1],['AlolaRoute2',0],['AlolaHauoliCenter',0]]],
 ['AlolaHauoliCenter','KalosSantaluneCenter','Hau’oli · Pokémon Center',[['AlolaHauoliCity',2]]],
 ['AlolaRoute2','KalosRoute22','Route 2 · Melemele',[['AlolaHauoliCity',1],['AlolaVerdantEntrance',0],['AlolaBerryFields',0],['AlolaCemetery',0]]],
 ['AlolaBerryFields','KalosAquacordeShop','Berry Fields',[['AlolaRoute2',2]]],
 ['AlolaCemetery','KalosSantaluneSchool','Hau’oli Cemetery',[['AlolaRoute2',3]]],
 ['AlolaVerdantEntrance','KalosGymGallery','Verdant Cavern · Entrance',[['AlolaRoute2',1],['AlolaVerdantCavern',0]]],
 ['AlolaVerdantCavern','KalosGymWeb','Verdant Cavern',[['AlolaVerdantEntrance',1]]]
 ];
 const create=(name,template,title,targets)=>{
   const original=source[template],m=JSON.parse(JSON.stringify(original));
   m.name=name;m.title=title;m.region='alola';m.alolaCampaign='ultra';m.image=template;
   m.people=[];m.signs=[];m.triggers=[];m.hidden=[];m.connections=[];
   m.warps=targets.map(([map,warp],i)=>({...original.warps[i],map,warp}));
   delete m.kalosEncounter;delete m.kalosSurfaces;delete m.kalosPickup;delete m.anim;
   delete m.wild;delete m.water;delete m.fishing;maps[name]=m;
 };
 for(const a of additions)create(...a);
 // Add a second north exit to Iki Town without moving existing doors/saves.
 maps.AlolaIkiTown.warps.push({x:30,y:3,map:'AlolaHauoliBeach',warp:0});
 person('AlolaIkiTown',29,18,'usum:hala','bw2_105');
 person('AlolaHauoliBeach',15,15,'usum:beach-hau','bw2_youngster');
 person('AlolaHauoliCity',22,17,'usum:ilima','bw2_105');
 person('AlolaHauoliCity',27,20,'usum:skull-intro','bw2_youngster');
 person('AlolaHauoliCenter',8,6,'usum:hauoli-heal','bw2_147');
 person('AlolaHauoliCenter',14,6,'usum:mart','bw2_scientist_m_52');
 person('AlolaRoute2',17,18,'usum:route2-hau','bw2_youngster');
 person('AlolaRoute2',21,11,'usum:skull-route2','bw2_youngster');
 person('AlolaBerryFields',9,7,'usum:berries','bw2_147');
 person('AlolaCemetery',10,8,'usum:cemetery','bw2_lass');
 person('AlolaVerdantEntrance',12,11,'usum:trial-guide','bw2_105');
 person('AlolaVerdantCavern',11,11,'usum:den-0','bw2_youngster');
 person('AlolaVerdantCavern',23,12,'usum:den-1','bw2_youngster');
 person('AlolaVerdantCavern',16,21,'usum:den-2','bw2_youngster');
 person('AlolaVerdantCavern',18,27,'usum:totem','bw2_105');
 const grass=(name,pool,rate=25)=>{
   const m=maps[name];m.wild={rate,weights:pool.map((a,i)=>i===pool.length-1?100-Math.floor(100/pool.length)*i:Math.floor(100/pool.length)),slots:pool.map(([species,min,max])=>({species,min,max}))};
   for(let y=6;y<Math.min(14,m.height-5);y++)for(let x=6;x<Math.min(11,m.width-5);x++){const k=y*m.width+x;if(!m.collision[k]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(a=>a.x===x&&a.y===y))m.behavior[k]=2;}
 };
 grass('AlolaHauoliBeach',[['Wingull',6,8],['Pikipek',6,8],['Yungoos',6,8],['Rattata',6,8]]);
 grass('AlolaRoute2',[['Cutiefly',7,9],['Makuhita',7,10],['Spearow',7,9],['Yungoos',7,9],['Rattata',7,9]]);
 grass('AlolaCemetery',[['Gastly',8,10],['Zubat',8,10],['Misdreavus',8,10]]);
 grass('AlolaBerryFields',[['Crabrawler',8,10],['Cutiefly',8,9]]);
 window.ALOLA_DATA={maps,start:{map:'AlolaHome',x:10,y:13,facing:'up'},
  return:{map:'FightArea',x:30,y:25,facing:'down'},starters:['Rowlet','Litten','Popplio']};
})();