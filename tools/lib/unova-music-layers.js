// Shared BW ISS masks and source B2/W2 musicians on native 2D maps.
'use strict';
module.exports=function({room,actor,M,json,read,clean,item,bankMaps,sprites}){
 const tables=require('./unova-iss.json'),data={source:tables.source,sets:[],cities:[],lore:{},pianoReward:item('ITEM_METRONOME'),unsupported:['Battle Subway view switches','Driftveil Gym vertical emitter']};
 function texts(bank){return Object.fromEntries(read('res/text/script/'+bank+'.txt').split(/\r?\n/).map(s=>s.match(/^(\w+)\s*=\s*(.*)$/)).filter(Boolean).map(a=>[a[1],clean(a[2])]));}
 function body(bank,script){const s=read('res/field/scripts/'+bank+'.s'),entries=[...s.matchAll(/^\s*ScriptEntry (Script_\d+)/gm)].map(a=>a[1]),label=entries[script-1];if(!label)throw Error('Missing music ScriptEntry '+bank+' '+script);return s.split(label+':')[1]?.split(/\nScript_\d+:/)[0]||'';}
 function npc(m,bank,id,x,y,key,extra={}){const a=json('res/field/events/'+bank+'.json').npcs.find(a=>a.id===id);if(!a)throw Error('Missing musician '+bank+' '+id);const script='bw:interior-music-'+key,b=body(bank,a.script),tx=texts(bank),messages=[...b.matchAll(/(?:ParentActorMsg|ActorMsg|ActorMsgVersioned) (?:MSGFILE_SCRIPT|1024), (\w+)/g)].map(a=>tx[a[1]]).filter(Boolean);data.lore[key]=messages;return actor(m,x,y,script,a.model.slice(9).toLowerCase(),{...extra,unovaMusicSource:{bank,actor:id,script:a.script}});}
 const house=room('AccumulaMusicHouse','Accumula · Musicians’ House','accumula_town_8',M.UnovaAccumulaTown,28,10);data.pianoText=texts('accumula_town_8');house.art.props.push({x:6,y:4,kind:'piano'},{x:18,y:4,kind:'drum-kit'});
 npc(house,'accumula_town_8',0,8,7,'piano');npc(house,'accumula_town_8',1,20,7,'drums');npc(house,'accumula_town_8',2,14,13,'minccino');
 for(const [id,x,key]of [[1,9,'whistle'],[2,19,'guitar'],[3,30,'beatbox'],[0,40,'vocals']])npc(M.UnovaVillageBridge,'village_bridge',id,x,17,key);
 const girl=M.UnovaVillageBridge.people.find(a=>a.script==='bw:interior-village-secret');if(girl){girl.sprite='bw2_lass';sprites.add('lass');}
 for(const set of tables.switchSets.filter(a=>a.index>0))data.sets.push({...set,key:set.index===1?'village':'accumula',maps:set.zones.map(z=>bankMaps[z.bank]?.name).filter(Boolean),activeSwitches:set.masks.map((mask,i)=>mask&&i).filter(Boolean)});
 const citySpecs=[['nacrene_city','UnovaNacreneCity',1,31,14],['icirrus_city','UnovaIcirrusCity',4,26,25],['anville_town','UnovaAnvilleTown',null,11,28],['opelucid_city','UnovaOpelucidCity',null,30,23]];
 for(const[bank,name,id,x,y]of citySpecs){const unit=tables.cities.find(a=>a.bank===bank);if(!unit)throw Error('Missing ISS city '+bank);const m=M[name],key='city-'+bank,actors=[];
  if(bank==='icirrus_city'){for(const [i,dx,dy]of [[4,1,1],[5,-1,1],[6,-1,-1],[7,1,-1]])actors.push(npc(m,bank,i,x+dx,y+dy,key+'-'+i).script);}
  else if(bank==='anville_town')actors.push('bw:interior-anville-lore-town-1');
  else if(bank==='opelucid_city'){const tx=texts(bank);for(const [version,sprite,message]of [['black2','151','OpelucidCity_Text_OurHopesPutInto'],['white2','205','OpelucidCity_Text_HopesAncientPeoplePut']]){data.lore[key+'-'+version]=[tx[message]];actors.push(actor(m,x+(version==='white2'?2:0),y,'bw:interior-music-'+key+'-'+version,sprite,{unovaMusicVersion:version,unovaMusicChampion:true}).script);}}
  else actors.push(npc(m,bank,id,x,y,key).script);
  data.cities.push({...unit,map:name,actors,mask:tables.cityMask,champion:bank==='opelucid_city',fadeFrames:43});
 }
 return data;
};
