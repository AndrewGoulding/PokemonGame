(function(){
 'use strict';
 const F=Unova,clone=x=>JSON.parse(JSON.stringify(x)),types=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel'];
 // Counters are written at successful native actions, never at menu previews.
 function record(p,key,n=1){if(!F.peek(p).medalBox||!Number.isFinite(n)||n<=0)return;const r=F.state(p).records;r[key]=(r[key]||0)+n;}
 const recordedBattles=new WeakSet();
 function battle(p,b,{replay=false}={}){if(!F.peek(p).medalBox||!b?.ended||replay||recordedBattles.has(b))return false;recordedBattles.add(b);record(p,'battles');let own=false,exp=0;const player=id=>/^p1(?:[a-e])?: /.test(id||'')&&!(b.sides?.p1.tag&&/^p1b: /.test(id));for(const e of b.events){if(e[0]==='move'){own=player(e[1]);if(own&&e[2]==='Splash')record(p,'splash');if(own&&e[2]==='Struggle')record(p,'struggle');}else if(own&&e[0]==='-immune')record(p,'ineffective');else if(own&&e[0]==='-supereffective'&&/^p2/.test(e[1]))record(p,'supereffective');if(e[0]==='-exp'&&player(e[1])&&Number.isFinite(+e[2])&&+e[2]>0)exp+=+e[2];}if(exp){const r=F.state(p).records,day=Player.gameTime(p).day;if(r.expDay!==day){r.expDay=day;r.expToday=0;}r.expToday=(r.expToday||0)+exp;r.expDailyBest=Math.max(r.expDailyBest||0,r.expToday);}return true;}
 function collection(p,list){const caught=new Set(p.pokedex.caught.map(Party.speciesName));return list.every(n=>caught.has(Party.speciesName(n)));}
 function card(p){const s=F.peek(p),levels=s.funfest?.levels||{},goals=[
  {name:'Enter the Unova Hall of Fame',done:!!(s.champion||p.flags.unovaLeagueClear)},
  {name:'Complete the National Pokédex',done:collection(p,F.data().postgame.nationalDex)},
  {name:'Raise both Entree levels to 30',done:levels.black>=30&&levels.white>=30},
  {name:'Win the Champions Tournament',done:(s.facilities?.records?.['pwt-Champions']?.wins||0)>0},
  {name:'Unlock all 41 Pokéstar films',done:F.data().movies.movies.every((_,i)=>UnovaMovies.available(p,i))}
 ];return{goals,stars:goals.filter(a=>a.done).length};}
 function signature(p,strokes){if(!Array.isArray(strokes)||strokes.length>256)return false;const out=[];let count=0;for(const line of strokes){if(!Array.isArray(line)||!line.length)return false;const points=[];for(const at of line){if(++count>8192||!Array.isArray(at)||at.length!==2||!at.every(Number.isFinite))return false;points.push([Math.max(0,Math.min(191,Math.round(at[0]))),Math.max(0,Math.min(63,Math.round(at[1])))]);}out.push(points);}F.state(p).signature=out;return true;}
 function progress(p,id){const s=F.peek(p),r=s.records||{},a=s.activities||{},f=s.facilities||{},records=f.records||{},cin=s.cinema||{},fest=s.funfest||{},wins=k=>records['pwt-'+k]?.wins||0;
  const counters={0:r.steps||0,126:r.cruises||0,33:r.bp||0,32:r.sports||0,73:r.splash||0,74:r.struggle||0,75:r.ineffective||0,47:r.supereffective||0,112:r.rustles||0,1:r.saves||0,3:r.bike||0,4:r.battles||0,8:r.fish||0,9:r.eggs||0,10:r.evolutions||0,11:r.centers||0,42:r.fly||0,44:r.hidden||0,45:r.powers||0,46:r.dreamCaught||0,21:r.purchases||0,22:r.spent||0,31:r.premier||0,127:s.avenue?.full?.referrals||0,128:s.avenue?.full?.created??s.avenue?.full?.shops?.filter(Boolean).length??0,130:s.avenue?.full?.souvenirs||0,114:a.shows||0,115:a.wins||0,118:a.total||0,121:Object.entries(records).filter(([k])=>k.startsWith('institute')).reduce((n,[,v])=>n+(v.attempts||0),0),48:Object.entries(records).filter(([k])=>k.startsWith('subway-')).reduce((n,[,v])=>n+(v.attempts||0),0)};
  const m=F.data().medals[id];if(m?.record!=null&&Object.hasOwn(counters,m.record))return counters[m.record];
  if(id>=27&&id<=43){const caught=new Set(p.pokedex.caught.map(Party.speciesName)),list=(F.data().medalTypes||[]).filter(a=>a.types.includes(types[id-27]));return list.length&&list.every(a=>caught.has(Party.speciesName(a.species)))?1:0;}
  if(id>=236&&id<=252)return +(s.hallOfFame||[]).some(h=>h.team?.length&&h.team.every(a=>DEX[a.species]?.types.some(t=>t.toLowerCase()===types[id-236])));
  if(id===253)return +(s.hallOfFame||[]).some(h=>h.team?.length===1);
  if(id>=161&&id<=164)return Object.values(s.services?.trades||{}).reduce((a,b)=>a+b,0);
  if(id===44)return +collection(p,F.data().postgame.regionalDex);if(id===45)return +collection(p,F.data().postgame.nationalDex);
  if(id>=46&&id<=49)return (p.boxes||[]).flat().filter(Boolean).length;
  if(id===93)return +p.party.concat((p.boxes||[]).flat()).some(a=>a&&!a.egg&&a.shiny);
  if(id===95)return +!!s.interiors?.boss;
  if(id===128)return r.expDailyBest||0;
  if(id===145)return new Set((records['pwt-Type Expert']?.types||[]).filter(t=>types.includes(t.toLowerCase()))).size;
  if(id===123)return Math.max(0,...Object.entries(records).filter(([k])=>k.startsWith('subway-')&&k.endsWith('multi')).map(([,v])=>v.best||0));
  if(id===121||id===122)return Math.max(0,...Object.entries(records).filter(([k])=>k.startsWith('subway-')&&k.endsWith(id===121?'single':'double')).map(([,v])=>v.best||0));
  const tournaments=['Driftveil','Rental','Mix','Unova Leaders','Kanto Leaders','Johto Leaders','Hoenn Leaders','Sinnoh Leaders','World Leaders','Champions','Rental Master','Mix Master'];if(id>=133&&id<=144)return wins(tournaments[id-133]);
  if(id===146||id===147)return f.tower?.black?.cleared||0;if(id===148||id===149)return f.tower?.white?.cleared||0;
  if(id===172)return (a.props||[]).length;
  if(id===194)return +!!s.avenue?.full?.renamed;
  if(id===203)return +(s.movieReleased||cin.records?.[0]?.endings?.length>0);
  const series=[[1,2],[3,6],[7,10],[11,14],[15,17],[18,20],[21,23],[24,27],[28,30],[31,34],[35,38],[39,39]];
  if(id>=204&&id<=215){const [start,end]=series[id-204];return +Array.from({length:end-start+1},(_,i)=>i+start).every(i=>cin.good?.includes(i));}
  if(id===216)return +F.data().movies.movies.every((_,i)=>cin.records?.[i]?.endings?.length>0);
  if(id===217)return +(cin.good?.length===41);if(id===219)return +(cin.strange?.length>0);if(id===220)return +(cin.strange?.length===41);
  if(id===225||id===226)return fest.sequence||0;
  if(id===229||id===230)return fest.wins||0;
  if(id===227||id===228)return fest.sequence||0;
  if(id===223)return Math.max(0,...Object.values(fest.completed||{}).map(a=>a.best||0));
  if(id===231)return Object.keys(fest.completed||{}).length===55?10:0;
  if(id===233||id===234)return Object.values(s.events?.memories||{}).filter(Boolean).length;
  return null;
 }
 function goal(id){return id>=27&&id<=43?1:F.data().medals[id].threshold;}
 function medals(p){const s=F.state(p);if(!s.medalBox)return[];const award=id=>{if(!s.medals.includes(id))s.medals.push(id);};for(const m of F.data().medals){const n=progress(p,m.id);if(n!=null&&n>=goal(m.id))award(m.id);}for(const [id,first,last]of [[104,7,103],[160,105,159],[235,161,234],[254,236,253]])if(Array.from({length:last-first+1},(_,i)=>i+first).every(id=>s.medals.includes(id)))award(id);for(const [id,n]of [[2,50],[3,100],[4,150],[5,200],[1,201]])if(s.medals.length>=n)award(id);if(Array.from({length:255},(_,i)=>i).filter(id=>id!==6).every(id=>s.medals.includes(id)))award(6);return s.medals.filter(id=>F.data().medals[id]).sort((a,b)=>a-b).map(id=>F.data().medals[id]);}
 function rank(p){medals(p);const a=F.peek(p).medals||[];return a.includes(5)?'Legend':a.includes(4)?'Master':a.includes(3)?'Elite':a.includes(2)?'Rookie':'Trainee';}

 F.medals=medals;window.UnovaRecords={record,battle,card,signature,progress,goal,medals,rank,signatureCopy:p=>clone(F.peek(p).signature||[])};
})();
