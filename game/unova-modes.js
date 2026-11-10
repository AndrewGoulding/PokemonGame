(function(){
 'use strict';const F=Unova,D=F.data().modes;if(!D)return;const names=['normal','easy','challenge'],peek=p=>p.flags?.unova?.modes||{},state=p=>{const f=F.state(p);if(!f.modes){f.modes={selected:'normal',keys:{normal:true}};if(UnovaPost.unlocked(p))f.modes.keys[f.version==='white2'?'easy':'challenge']=true;}return f.modes;};
 function selected(p){const m=peek(p).selected;return names.includes(m)?m:'normal';}
 function localKeys(p){const s=state(p);s.keys.easy=true;s.keys.challenge=true;s.localSharing=true;return true;}
 function championKey(p,version=F.peek(p).version){state(p).keys[version==='white2'?'easy':'challenge']=true;}
 function choose(p,mode){const s=state(p);if(!names.includes(mode)||!s.keys[mode])return{locked:true};s.selected=mode;return{mode};}
 function delta(p,map=p.location.map){const mode=selected(p),n=WORLD_MAPS[map]?.unovaModeAdjust||0;return mode==='challenge'?n:mode==='easy'?-n:0;}
 function cap(p,base){if(base===100||selected(p)!=='challenge')return base;const badges=F.badges.filter(b=>p.badges.includes(b)).length;return Math.min(100,base+(D.capAdjust[badges]||0));}
 function shift(team,amount){return team.map(a=>{const r=JSON.parse(JSON.stringify(a));r.level=Math.max(1,Math.min(100,r.level+amount));r.hp=Party.maxHp(r);return r;});}
 function foe(p,original,trainerId){if(!F.owns(p.location.map)||selected(p)==='normal'||!F.data().trainers[trainerId])return original;const alt=selected(p)==='challenge'&&D.alternates[trainerId],team=alt?F.team(alt):original.team;return{...original,team:shift(team,delta(p)),unovaModeTrainer:alt||trainerId};}
 function extraFoe(p,original){if(!original||!F.owns(p.location.map)||selected(p)==='normal')return original;return{...original,team:shift(original.team,delta(p))};}
 window.UnovaModes={data:()=>D,peek,state,selected,localKeys,championKey,choose,delta,cap,shift,foe,extraFoe};
})();
