// Village Bridge's source houses and B2/W2 optional quests.
'use strict';
module.exports=function({room,paint,actor,M,json,trainer,item,bankMaps,west,east,sp,read,clean}){
 const itemIds=read('generated/items.txt').split(/\r?\n/).map(s=>s.replace(/#.*/,'').trim()).filter(Boolean).map(s=>s.split('=')[0].trim());
 function berry(bank){const s=read('res/field/scripts/'+bank+'.s'),id=+s.match(/WorkSet 0x8000, (\d+)/)[1],quantity=+s.match(/WorkSet 0x8001, (\d+)/)[1];return{item:item(itemIds[id]),quantity,source:'res/field/scripts/'+bank+'.s',sourceItem:id};}
 const parent=M.UnovaVillageBridge,data={rooms:[],lore:{},baker:trainer('TRAINER_BAKER_CHRIS'),honeyReward:berry('village_bridge_3'),secretReward:berry('village_bridge'),fishingReward:{item:item('ITEM_DIVE_BALL'),quantity:5},fishingZones:['village_bridge','route_1','route_3','wellspring_cave','route_13','route_17'],fishingTables:{},source:{fishing:'src/ov036/scrcmd_encount.c',baker:'res/field/scripts/village_bridge_3.s',secret:'res/field/scripts/village_bridge_9.s'}};
 // Riverbank neighborhoods, joined to the existing wide central bridge.
 paint(parent,3,3,44,11,'lawn');paint(parent,3,23,44,10,'lawn');paint(parent,4,11,3,16,'path');paint(parent,43,11,3,16,'path');
 parent.people=parent.people.filter(a=>a.script!=='bw:bridge-lunch');
 const labels=['Stonecutter House','Sandwich Restaurant','Hip Waders Club','Training House','Former Performer’s House','Rest House','Riverside House','Practice House'];
 for(let i=2;i<=9;i++){const bank='village_bridge_'+i,m=room('VillageBridgeHouse'+i,'Village Bridge · '+labels[i-2],bank,parent,7+((i-2)%4)*10,i<6?7:27);delete west.banks[bank];east.banks[bank]=m;m.unovaEast=true;data.rooms.push({map:m.name,bank});
  const texts=Object.fromEntries(read('res/text/script/'+bank+'.txt').split(/\r?\n/).map(s=>s.match(/^(\w+)\s*=\s*(.*)$/)).filter(Boolean).map(a=>[a[1],clean(a[2])])),scriptSource=read('res/field/scripts/'+bank+'.s');
  for(const[n,a]of json('res/field/events/'+bank+'.json').npcs.entries()){
   const custom=i===3&&a.id===0?'interior-village-baker':i===4?'interior-village-fishing':i===7&&a.id===1?'bridge-lunch':i===9?'interior-village-practice':null,key=bank+'-'+a.id;
   if(!custom){const block=scriptSource.split('Script_'+a.script+':')[1]?.split(/\nScript_\d+:/)[0]||'',message=block.match(/(?:ParentActorMsg|ActorMsg) MSGFILE_SCRIPT, (\w+)/)?.[1];data.lore[key]=texts[message]||Object.values(texts)[0]||'The river flows quietly beneath Village Bridge.';}
   actor(m,7+(n%3)*7,7+Math.floor(n/3)*6,'bw:'+(custom||'interior-village-lore-'+key),a.model.slice(9).toLowerCase());
  }
 }
 actor(parent,33,18,'bw:interior-village-secret','gentleman');
 actor(M.UnovaTubelineBridge,34,17,'bw:interior-village-soundproof','backpacker_m');
 for(const season of ['spring','summer','autumn','winter']){data.fishingTables[season]={};for(const version of ['black2','white2']){const names=new Set();for(const bank of data.fishingZones){const raw=json('res/field/encounters/'+bank+'.json'),table=raw.all_year||raw[season];if(!table)continue;for(const type of ['fishing','rippling_fishing']){const rows=table[type];for(const row of Array.isArray(rows)?rows:rows?.[version]||[])names.add(sp(row[0]));}}data.fishingTables[season][version]=[...names];}}
 return data;
};
