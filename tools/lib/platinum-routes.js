// Remaining optional-route trainers and source encounter tables.
'use strict';
const fs=require('fs'),path=require('path');
module.exports=function({source,kit,trainer,person,additions,provenance,speciesName}){
 const{base,spot}=kit,json=p=>JSON.parse(fs.readFileSync(path.join(source,p),'utf8')),coverage=[];
 const sites=[['route_210_north','Route210_2'],['route_211_west','Route211'],['route_211_east','Route211'],...[219,220,221,224,225,226,227,228,229,230].map(n=>['route_'+n,'Route'+n]),['route_225','Route225More'],['route_228','Route228_2'],['fuego_ironworks_building','FuegoIronworks'],['maniac_tunnel','ManiacTunnel'],['iron_island_1f','IronIsland_2'],['iron_island_b1f_left_room','IronIsland_3'],['iron_island_b1f_right_room','IronIsland_4']];
 function wetSpot(name,x,y){const m=base(name),busy=[...m.people,...(additions[name]||[]),...m.warps],groups=[],seen=new Set(),wet=(x,y)=>x>0&&y>0&&x<m.width-1&&y<m.height-1&&!m.collision[y*m.width+x]&&m.behavior[y*m.width+x]>=16&&m.behavior[y*m.width+x]<=21;for(let a=1;a<m.width-1;a++)for(let b=1;b<m.height-1;b++){const k=b*m.width+a;if(seen.has(k)||!wet(a,b))continue;const q=[[a,b]];seen.add(k);for(let i=0;i<q.length;i++)for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=q[i][0]+dx,ny=q[i][1]+dy,j=ny*m.width+nx;if(wet(nx,ny)&&!seen.has(j)){seen.add(j);q.push([nx,ny]);}}groups.push(q);}const group=groups.sort((a,b)=>b.length-a.length)[0];if(!group)throw Error('No surf terrain '+name);const at=group.filter(([x,y])=>!busy.some(p=>p.x===x&&p.y===y)).sort((a,b)=>Math.abs(a[0]-x)+Math.abs(a[1]-y)-Math.abs(b[0]-x)-Math.abs(b[1]-y))[0];if(!at)throw Error('No free surf terrain '+name);return at;}
 const range=e=>({species:speciesName(e.species),min:e.level_min,max:e.level_max});
 for(const[bank,name]of sites){if(!kit.maps[name])kit.maps[name]=JSON.parse(JSON.stringify(base(name)));const m=base(name);if(bank==='route_210_north')m.sinnohFog=true;const encFile='res/field/maps/'+bank+'/encounters.json';
  if(fs.existsSync(path.join(source,encFile))){const e=json(encFile);if(e.land_rate){const wild={rate:e.land_rate,weights:[20,20,10,10,10,10,5,5,4,4,1,1],slots:e.land_encounters.map((v,i)=>({species:speciesName(i===2||i===3?e.day[i-2]:v.species),min:v.level,max:v.level,...(i===2||i===3?{morning:speciesName(v.species),night:speciesName(e.night[i-2])}:{})}))};if(bank==='route_211_west'){m.platinumWildZones=[{maxX:Math.floor(m.width/2),wild}];m.wild=wild;}else if(bank==='route_211_east')m.platinumWildZones.push({maxX:m.width,wild});else m.wild=wild;}
   if(e.surf_rate)m.water={rate:e.surf_rate,slots:e.surf_encounters.map(range)};
   const rods={};for(const rod of ['old','good','super'])if(e[rod+'_rod_rate'])rods[rod+'-rod']={rate:e[rod+'_rod_rate'],slots:e[rod+'_rod_encounters'].map(range)};if(Object.keys(rods).length)m.fishing={rods};
  }
  const events=json('res/field/maps/'+bank+'/events.json').object_events.filter(e=>e.trainer),bbox=events.length?[Math.min(...events.map(e=>e.x)),Math.max(...events.map(e=>e.x)),Math.min(...events.map(e=>e.z)),Math.max(...events.map(e=>e.z))]:[0,1,0,1];let count=0;
  for(const e of events){const id='PT_'+e.trainer.id;if((additions[name]||[]).some(a=>a.trainer?.id===id))continue;
   // Extra geometry pieces share wild slots but should not duplicate trainers.
   if(['Route225More','Route228_2'].includes(name))continue;
   trainer(e.trainer.id);const water=/TRAINER_SWIMMER_/.test(e.trainer.id),x=3+Math.round((m.width-7)*(e.x-bbox[0])/Math.max(1,bbox[1]-bbox[0])),y=4+Math.round((m.height-9)*(e.z-bbox[2])/Math.max(1,bbox[3]-bbox[2])),at=water?wetSpot(name,x,y):spot(name,x,y);
   person(name,...at,id,e.graphics_id.replace('OBJ_EVENT_GFX_','').toLowerCase(),{water,trainer:{id,sight:Math.min(3,e.trainer.sight_range)},movement:'face_'+({DIR_NORTH:'up',DIR_SOUTH:'down',DIR_EAST:'right',DIR_WEST:'left'}[e.initial_dir]||'down'),platinumEvent:{bank,id:e.id,x:e.x,z:e.z}});count++;
  }
  provenance[bank]={events:'res/field/maps/'+bank+'/events.json',scripts:'res/field/maps/'+bank+'/scripts.s'};coverage.push({bank,map:name,addedTrainers:count});
 }
 const radarSites=[...sites,...[201,202,203,206,207,208,209,213,214,215,216,217,218,222,223].map(n=>['route_'+n,'Route'+n]),['route_204_south','Route204'],['route_204_north','Route204'],['route_205_south','Route205FloaromaSide'],['route_205_north','Route205EternaSide'],['route_210_south','Route210'],['route_212_north','Route212_2'],['route_212_south','Route212'],['oreburgh_gate_1f','Oreburgh_Gate'],['oreburgh_mine_b2f','OreburghMine'],['eterna_forest','EternaForest_2'],['ravaged_path','RavagedPath'],['valley_windworks_outside','ValleyWindworks'],['lake_verity','LakeVerity'],['lake_valor','LakeValor'],['lake_acuity','LakeAcuity'],['verity_lakefront','VerityLakefront'],['valor_lakefront','ValorLakefront'],['acuity_lakefront','AcuityLakefront'],['great_marsh_6','GreatMarsh']];
 const encounters=[];
 for(const[bank,name]of radarSites){const file=path.join(source,'res/field/maps',bank,'encounters.json');if(!fs.existsSync(file))continue;if(!base(name))throw Error('Missing encounter map '+name);if(!kit.maps[name])kit.maps[name]=JSON.parse(JSON.stringify(base(name)));const m=base(name),e=json('res/field/maps/'+bank+'/encounters.json');
  if(e.land_rate){const wild={rate:e.land_rate,weights:[20,20,10,10,10,10,5,5,4,4,1,1],slots:e.land_encounters.map((v,i)=>({species:speciesName(i===2||i===3?e.day[i-2]:v.species),min:v.level,max:v.level,...(i===2||i===3?{morning:speciesName(v.species),night:speciesName(e.night[i-2])}:{})}))};
   if(bank==='route_211_west'){m.platinumWildZones=[{maxX:Math.floor(m.width/2),wild}];m.wild=wild;}else if(bank==='route_211_east')m.platinumWildZones.push({maxX:m.width,wild});else if(bank==='route_204_south'){m.platinumWildZones=[{minY:Math.floor(m.height/2),wild}];m.wild=wild;}else if(bank==='route_204_north')m.platinumWildZones.push({maxY:Math.floor(m.height/2)-1,wild});else m.wild=wild;
   m.wild.swarm=e.swarms?.filter(sp=>sp!=='SPECIES_NONE').map(speciesName)||[];
  }else delete m.wild;
  if(e.surf_rate)m.water={rate:e.surf_rate,slots:e.surf_encounters.map(range)};else delete m.water;
  const rods={};for(const rod of ['old','good','super'])if(e[rod+'_rod_rate'])rods[rod+'-rod']={rate:e[rod+'_rod_rate'],slots:e[rod+'_rod_encounters'].map(range)};if(Object.keys(rods).length)m.fishing={rods};else delete m.fishing;
  if(e.radar?.some(sp=>sp!=='SPECIES_NONE'))m.radarExtras=e.radar.map(sp=>sp==='SPECIES_NONE'?null:speciesName(sp));
  provenance[bank]=Object.assign(provenance[bank]||{},{encounters:'res/field/maps/'+bank+'/encounters.json'});encounters.push({bank,map:name});
 }
 return{coverage,encounters};
};
