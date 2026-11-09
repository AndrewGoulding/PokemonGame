(function(){
 'use strict';
 const data=()=>PLATINUM_DATA.seals,info=id=>data().catalog.find(s=>s.id===+id),valid=i=>Number.isInteger(i)&&i>=0&&i<12;
 function state(p){const s=Sinnoh.state(p),b=s.seals||(s.seals={inventory:{},capsules:Array.from({length:12},()=>[])});return b;}
 const records=p=>[...p.party,...p.boxes.flat(),...["dayCare","dayCare2","johtoDayCare","sinnohDayCare"].flatMap(k=>[].concat(p.flags[k]||[]).map(d=>d.mon)),p.flags.orreDayCare?.record,...(p.flags.sinnoh?.park?.reserve||[]).filter(r=>!r.returned).map(r=>r.mon)].filter(Boolean),capsule=(p,i)=>valid(i)?state(p).capsules[i]:null;
 function total(p,id){return(state(p).inventory[id]||0)+state(p).capsules.flat().filter(s=>s.id===+id).length;}
 function grant(p,id,n){if(!info(id)||!Number.isInteger(n)||n<=0)return 0;const count=Math.min(n,99-total(p,id));if(count>0)state(p).inventory[id]=(state(p).inventory[id]||0)+count;return Math.max(0,count);}
 function buy(p,id,n=1){const s=info(id);if(!s||!Number.isInteger(n)||n<1||!data().shops[Player.gameTime(p).weekday].includes(+id))return false;if(p.money<s.price*n||total(p,id)+n>99)return false;Player.addMoney(p,-s.price*n);grant(p,+id,n);return true;}
 const coord=n=>Math.max(0,Math.min(1,Number.isFinite(+n)?+n:.5));
 function add(p,i,id,x=.5,y=.5){const c=capsule(p,i),b=state(p);if(!c||c.length>=8||!info(id)||!(b.inventory[id]>0))return false;b.inventory[id]--;c.push({id:+id,x:coord(x),y:coord(y)});return true;}
 function remove(p,i,index){const c=capsule(p,i);if(!c||!Number.isInteger(index)||!c[index])return false;const [s]=c.splice(index,1);state(p).inventory[s.id]=(state(p).inventory[s.id]||0)+1;return true;}
 function move(p,i,index,x,y){const s=capsule(p,i)?.[index];if(!s)return false;s.x=coord(x);s.y=coord(y);return true;}
 function clear(p,i){const c=capsule(p,i);if(!c)return false;while(c.length)remove(p,i,c.length-1);return true;}
 function owner(p,i){return records(p).find(m=>m.ballCapsule===i)||null;}
 function assign(p,i,m){if(!valid(i)||!m||m.egg||!records(p).includes(m))return false;for(const r of records(p))if(r.ballCapsule===i)delete r.ballCapsule;m.ballCapsule=i;return true;}
 function forMon(m,p){if(m.egg)return[];if(Array.isArray(m.ballSeals))return m.ballSeals.map(s=>({...s}));if(!p||!valid(m.ballCapsule))return[];return(capsule(p,m.ballCapsule)||[]).map(s=>({...s}));}
 function glyph(id){const s=info(id);if(!s)return'•';if(s.alphabet){const i=s.source;return i==='SHOCK_SEAL'?'!':i==='MYSTERY_SEAL'?'?':i[0];}const f=s.source.split('_')[0];return({HEART:'♥',STAR:'★',LINE:'✦',SMOKE:'●',ELE:'ϟ',FOAMY:'○',FIRE:'▲',PARTY:'◆',FLORA:'✿',SONG:'♪',LIQUID:'◌',BURST:'✴',TWINKLE:'✧'})[f]||'✦';}
 function color(id){return['#e85b86','#eab52d','#a46deb','#7c91a4','#f6d544','#65bfe7','#f07c45','#d178d8','#6bba77','#578de4'][(+id*7)%10];}
 function unownGift(p,m){if(!m||!/^Unown(?:-|$)/.test(m.species)||m.egg)return 0;const f=Party.form(m)||'A',form=String(f).replace(/^Unown-/,'').toUpperCase(),letter=['!','EXCLAMATION'].includes(form)?26:['?','QUESTION'].includes(form)?27:'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(form);if(letter<0)return 0;const s=state(p);if(s.lastUnown===letter)return 0;const n=grant(p,50+letter,10);if(n)s.lastUnown=letter;return n;}
 window.SinnohSeals={data,info,state,capsule,total,grant,buy,add,remove,move,clear,owner,assign,forMon,glyph,color,unownGift};
})();
