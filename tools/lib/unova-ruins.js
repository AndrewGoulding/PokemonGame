// Restore the source's repeated treasure quantities, retaining the native
// four-floor Dive/pillar/timer adaptation and its fourth-floor Crown event.
'use strict';
module.exports=function({M,bankMaps,services}){
 const D=services.data;D.ruinSource=[];D.ruinLegacy=[];D.ruinRetired=[];
 for(let floor=1;floor<=3;floor++){
  const bank='abyssal_ruins_'+(floor+4),m=M[D.ruins[floor-1]];
  m.people=m.people.filter(a=>!a.script?.startsWith('bw:ruins-item-'));
  bankMaps[bank]=m;m.unovaSourceZone=bank;m.unovaEncounterBank=null;
  D.ruinSource.push({bank,map:m.name,events:'res/field/events/'+bank+'.json'});
 }
 return{finish(field){const used=new Set();for(const[index,item]of D.ruinItems.entries()){
  if(item==='relic-crown')continue;
  const pick=field.pickups.find(a=>D.ruins.slice(0,3).includes(a.map)&&a.item===item&&!used.has(a.flag));
  if(!pick){if(['splash-plate','draco-plate'].includes(item)){D.ruinRetired.push({gift:'abyssal-ruins-item-'+index,item});continue;}throw Error('Missing Abyssal legacy reward '+item);}
  used.add(pick.flag);D.ruinLegacy.push({gift:'abyssal-ruins-item-'+index,item,flag:pick.flag});
 }}};
};
