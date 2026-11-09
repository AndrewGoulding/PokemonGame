'use strict';
const fs=require('fs'),path=require('path');
module.exports=function({source,kit,provenance}){
 const read=p=>fs.readFileSync(path.join(source,p),'utf8'),ids=read('generated/seals.txt').trim().split(/\s+/).filter(x=>x!=='SEAL_ID_MAX'),names=JSON.parse(read('res/text/ball_seal_names.json')).messages;
 const block=read('src/applications/capsule_menu/main.c').split('sealTypeValues[SEAL_ID_MAX] = {')[1].split('\n};')[0],rows=[...block.matchAll(/\{([^}]+)\}/g)].map(m=>m[1].split(',').map(x=>Number(x.trim())));
 if(rows.length!==ids.length)throw Error('Seal catalog length mismatch');
 const catalog=ids.slice(1).map((id,i)=>({id:i+1,source:id,name:[].concat(names[rows[i+1][1]].en_US).join(''),price:rows[i+1][5],alphabet:!!rows[i+1][4]}));
 const mart=read('include/data/mart_items.h'),shops=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day=>{const b=mart.match(new RegExp('SunyshoreMarketStock'+day+'\\[\\] = \\{([\\s\\S]*?)\\};'))[1];return [...b.matchAll(/\b\w+_SEAL(?:_\w+)?\b/g)].map(m=>ids.indexOf(m[0]));});
 for(const[map,x,y,key,sprite]of [['SunyshoreCity',20,24,'shop','middle_aged_woman'],['SolaceonTown',25,17,'unown','school_kid_m']]){const at=kit.spot(map,x,y);kit.actor(map,...at,'seals-'+key,sprite,{script:'pt:seals-'+key});}
 for(const bank of ['sunyshore_market','solaceon_town_east_house'])provenance[bank]=Object.assign(provenance[bank]||{},{scripts:'res/field/maps/'+bank+'/scripts.s'});
 return{catalog,shops,limits:{capsules:12,sealsPerCapsule:8,inventory:99},source:{catalog:'src/applications/capsule_menu/main.c',shops:'include/data/mart_items.h',capsules:'res/trainers/ball_capsules.json'}};
};
