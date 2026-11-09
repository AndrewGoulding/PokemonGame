(function(){
 'use strict';
 const data=()=>PLATINUM_DATA.leisure,state=p=>{const s=Sinnoh.state(p);return s.leisure||(s.leisure={items:{}});},amity=p=>{const s=state(p);return s.amity||(s.amity={steps:0});},active=(p,map=p.location.map)=>map===data().amity.map&&amity(p).personality!=null;
 function eligible(p,m){return !!m&&!m.egg&&data().amity.eligible.some((list,i)=>(i!==5||SinnohLegends.peek(p).nationalDex)&&list.includes(m.species));}
 function lead(p){if(p.location.map!==data().amity.map)return null;const a=amity(p);return p.party.find(m=>m.personality===a.personality&&(m.ot?.id??p.trainerId)===a.ot&&eligible(p,m))||null;}
 function pick(weights,rng){let r=rng()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++){r-=weights[i];if(r<0)return i;}return weights.length-1;}
 function next(p,rng=Math.random){const m=lead(p);if(!m)return null;const d=data().amity,pool=d.eligible.findIndex(a=>a.includes(m.species)),accessory=d.pools[pool][pick([15,15,15,15,10,10,8,5,5,2],rng)],item=d.berries[pick([20,15,15,15,7,7,7,7,7],rng)];return amity(p).pending=rng()<.2?{item}:{accessory};}
 function enter(p,m,rng=Math.random){if(!eligible(p,m)||!p.party.includes(m))return false;const a=amity(p);Object.assign(a,{personality:m.personality,ot:m.ot?.id??p.trainerId,steps:0,last:p.clockSteps||0});const before=p.location.map;p.location.map=data().amity.map;next(p,rng);p.location.map=before;return true;}
 function step(p){const a=amity(p),now=p.clockSteps||0;if(p.location.map!==data().amity.map){delete a.personality;delete a.pending;a.steps=0;a.last=now;return;}if(lead(p))a.steps=Math.min(200,(a.steps||0)+Math.max(0,now-(a.last??now)));a.last=now;}
 function award(p,reward,n=1){if(reward.accessory){const b=SinnohServices.state(p).accessories||(SinnohServices.state(p).accessories={});if((b[reward.accessory]||0)+n>9)return false;b[reward.accessory]=(b[reward.accessory]||0)+n;}else{const before=Player.itemCount(p,reward.item);Player.addItem(p,reward.item,n);if(Player.itemCount(p,reward.item)!==before+n){if(Player.itemCount(p,reward.item)>before)Player.removeItem(p,reward.item,Player.itemCount(p,reward.item)-before);return false;}}return true;}
 function collect(p,rng=Math.random){step(p);const a=amity(p);if(!lead(p)||a.steps<200||!a.pending)return null;const r={...a.pending};if(!award(p,r))return{full:true};a.steps=0;next(p,rng);return r;}
 function daily(p){const a=amity(p),day=Player.gameTime(p).day;if(a.gift?.day!==day)a.gift={day,index:(((p.trainerId>>>0)+Math.imul(day+1,1103515245))>>>0)%data().amity.man.length};if(a.gift.done)return{again:true};const r=data().amity.man[a.gift.index],n=r.item?5:1;if(!award(p,r,n))return{full:true};a.gift.done=true;return{...r,n};}
 function rewardName(r){return r.item?Bag.name(r.item):data().amity.accessories.find(a=>a.id===r.accessory)?.name||r.accessory;}
 function unownLetter(map,rng=Math.random){const forms=WORLD_MAPS[map]?.platinumUnownForms;return forms?.length?forms[Math.floor(rng()*forms.length)]:null;}
 function seen(p,m){if(m?.species!=='Unown')return;const list=state(p).unownSeen||(state(p).unownSeen=[]),letter=m.unown||m.form||'a';if(!list.includes(letter))list.push(letter);}
 const seenForms=p=>[...new Set([...(p.flags.unownCaught||[]),...(state(p).unownSeen||[])])].filter(c=>/^[a-z]$/.test(c)||['exclamation','question'].includes(c)),letters=p=>seenForms(p).filter(c=>c.length===1),secretReady=p=>seenForms(p).length>=26;
 function apply(p){const n=seenForms(p).length;WORLD_MAPS.ManiacTunnel.wild=data().maniacWild[n>=26?2:n>=10?1:0];}
 window.SinnohLeisure={data,state,amity,active,eligible,lead,next,enter,step,award,collect,daily,rewardName,unownLetter,seen,seenForms,letters,secretReady,apply};
})();
