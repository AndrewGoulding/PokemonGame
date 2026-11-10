(function(){
 'use strict';
 const F=Unova,D=F.data(),data=D.versioned;if(!data)return;
 function desired(p,m){if(!m?.unovaVariantKind)return null;const s=F.peek(p);return m.unovaVariantKind==='version'?(s.version||'black2'):(s.triadClear&&!s.ghetsis?'frozen':'normal');}
 function target(p,name){const m=D.maps[name];return desired(p,m)&&m.unovaVariant!==desired(p,m)?m.unovaAlternative:name;}
 function apply(p,name){const m=WORLD_MAPS[name],base=D.maps[name];if(!base)return;for(let i=0;i<base.warps.length;i++){
  const w=base.warps[i];if(!D.maps[w.map]?.unovaVariantKind)continue;
  const to=target(p,w.map),other=D.maps[to];
  let index=w.warp;if(to!==w.map){const back=target(p,name);index=other.warps.findIndex(a=>a.map===back);if(index<0)index=other.warps.findIndex(a=>target(p,a.map)===back);// A legacy save inside the normal forest's Grotto exits through its
  // old door; the arrival scene then moves it to a safe frozen square.
  if(index<0){if(name==='UnovaHiddenGrotto9'){m.warps[i]={...w};continue;}throw Error('Missing versioned arrival '+name+' -> '+to);}}
  m.warps[i]={...w,map:to,warp:index};
 }}
 function arrival(p){const name=target(p,p.location.map);if(name===p.location.map)return null;const m=WORLD_MAPS[name],a=p.location,cells=[];for(let y=3;y<m.height-3;y++)for(let x=3;x<m.width-3;x++){const k=y*m.width+x;if(!m.collision[k]&&m.behavior[k]!==0x10&&!m.people.some(n=>n.x===x&&n.y===y)&&!m.warps.some(w=>w.x===x&&w.y===y))cells.push({map:name,x,y,facing:a.facing||'down'});}return cells.sort((u,v)=>Math.abs(u.x-a.x)+Math.abs(u.y-a.y)-Math.abs(v.x-a.x)-Math.abs(v.y-a.y))[0]||null;}
 window.UnovaVersioned={data:()=>data,desired,target,apply,arrival};
})();
