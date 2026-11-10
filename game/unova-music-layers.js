(function(){
 'use strict';const F=Unova,D=F.data().interiors.music;if(!D)return;
 const families={};for(const s of D.sets)families[s.song]={key:s.key,masks:[s.masks[0],...s.activeSwitches.map(i=>s.masks[i])],fadeFrames:s.fadeFrames};
 for(const song of ['bw_bgm_c_02','bw_bgm_c_07','bw_bgm_c_08_b','bw_bgm_c_08_w','bw_bgm_t_03'])families[song]={key:'city',masks:[0xffff^0x300,0x300],fadeFrames:43};
 function state(p){return F.state(p).music||(F.state(p).music={switches:{},pianoStage:0});}
 function membership(map){return D.sets.find(a=>a.maps.includes(map));}
 function visit(p,map){const v=F.peek(p).music;if(!v)return;const set=membership(map);for(const key of Object.keys(v.switches||{}))if(key!==set?.key)delete v.switches[key];}
 function switches(p,key){return F.peek(p).music?.switches?.[key]||0;}
 function change(p,key,index,on){const set=D.sets.find(a=>a.key===key);if(!set||!set.activeSwitches.includes(index)||!set.maps.includes(p.location.map))return false;if(key==='accumula'&&index===1&&!(F.peek(p).gifts?.['music-piano-metronome']))return false;const v=state(p);v.switches||={};const mask=1<<(index-1),old=switches(p,key);v.switches[key]=on?old|mask:old&~mask;F.apply(p);return true;}
 function axis(distance,ranges,volumes){for(let i=0;i<ranges.length;i++)if(distance>=ranges[i]){if(!i)return volumes[0];const span=ranges[i-1]-ranges[i];return span?volumes[i]+(volumes[i-1]-volumes[i])*(distance-ranges[i])/span:volumes[i];}return volumes.at(-1);}
 function plan(p,map,base){const family=families[base];if(!family)return null;const set=membership(map);let value;
  if(set?.song===base)value=switches(p,set.key);
  else{const city=D.cities.find(a=>a.map===map);if(!city)return null;const live=window.Game?.player===p?window.Overworld?.position():null,at=live?.map===map?live:p.location,m=WORLD_MAPS[map],actors=m.people.filter(a=>city.actors.includes(a.script)&&(!a.unovaMusicVersion||a.unovaMusicVersion===(F.peek(p).version||'black2')));value=0;if(actors.length&&(!city.champion||UnovaPost.unlocked(p))){const x=actors.reduce((n,a)=>n+a.x,0)/actors.length,y=actors.reduce((n,a)=>n+a.y,0)/actors.length;value=Math.round(axis(Math.abs(at.x-x),city.rangeX,city.volume)*axis(Math.abs(at.y-y),city.rangeZ,city.volume)/127);}}
  return base+'__iss_'+value;
 }
 function decode(name){const match=String(name).match(/^(bw_\w+)__iss_(\d+)$/),f=match&&families[match[1]];if(!f)return null;const value=+match[2];return{...f,base:match[1],value,gains:f.key==='city'?[1,Math.min(127,value)/127]:[1,...D.sets.find(a=>a.key===f.key).activeSwitches.map(i=>value&(1<<(i-1))?1:0)]};}
 function piano(p){const v=state(p);if(F.peek(p).gifts?.['music-piano-metronome']){v.pianoStage=2;return{done:true};}if(v.pianoStage>=2)return F.gift(p,'music-piano-metronome',D.pianoReward);const target=v.pianoStage===1?'Whismur':'Kricketot';if(!p.party.some(m=>!m.egg&&m.species===target))return{needs:target};v.pianoStage++;return{heard:target,stage:v.pianoStage};}
 window.UnovaMusicLayers={data:()=>D,state,visit,membership,switches,change,axis,plan,decode,piano};
})();
