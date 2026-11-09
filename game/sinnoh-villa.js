(function(){
 'use strict';
 const data=()=>PLATINUM_DATA.villa,state=p=>{const s=Sinnoh.state(p);return s.villa||(s.villa={owned:false,furniture:[],records:{}});};
 function record(p,key,n=1){const r=state(p).records;return r[key]=(r[key]||0)+n;}
 function claim(p){const s=state(p);if(!p.flags.sinnohLeagueClear||s.owned)return false;s.owned=true;s.furniture=['table'];return true;}
 function requirements(p,id){const s=state(p),r=s.records,frontier=Sinnoh.state(p).frontier||{};switch(id){case'pokemon-bust':return['tower','factory','castle','hall','arcade'].every(k=>(frontier.victories?.[k]||0)>0)?null:'Win in each of the five Sinnoh Frontier facilities.';case'pokemon-bust-silver':return Object.values(frontier.prints||{}).some(n=>n>=1)?null:'Earn a Sinnoh Frontier commemorative print.';case'piano':return(p.flags.hofCount||0)>=10?null:'Enter the Hall of Fame ten times.';case'guest-set':return(r.battleground||0)>=50?null:'Battle fifty times at the Battleground.';case'wall-clock':return(r.berries||0)>=50?null:'Plant fifty Berries.';case'masterpiece':return(r.eggs||0)>=30?null:'Hatch thirty Eggs.';case'chandelier':return(p.clockSteps||0)>=300000?null:'Walk 300,000 steps.';default:return null;}}
 function buy(p,id){const s=state(p),f=data().furniture.find(f=>f.id===id);if(!s.owned||!f||s.furniture.includes(id)||requirements(p,id)||p.money<f.price)return false;Player.addMoney(p,-f.price);s.furniture.push(id);return true;}
 function visitor(p){const s=state(p),day=Player.gameTime(p).day;if(!s.owned)return null;if(s.visitor?.day===day)return s.visitor.index;const tier=s.furniture.length>=12?2:s.furniture.length>=8?1:0,seed=(Math.imul((p.trainerId>>>0)^Math.imul(day+1,2654435761),1664525)+1013904223)>>>0;const index=seed%100>data().visitorChances[tier]?null:(seed>>>8)%data().visitorCounts[tier];s.visitor={day,index,message:(seed>>>16)%5};return index;}
 function patches(p){return state(p).owned?state(p).furniture.map(id=>'furniture-'+id):[];}
 window.SinnohVilla={data,state,record,claim,requirements,buy,visitor,patches};
})();
