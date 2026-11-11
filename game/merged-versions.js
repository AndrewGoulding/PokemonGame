// Shared X/Y, Black/White and B2/W2 encounter pools without selecting a version.
(function(){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 function union(a,b){
  if(!a)return b?copy(b):null;if(!b)return copy(a);
  if(!a.slots?.length)return copy(b);if(!b.slots?.length)return copy(a);
  const set=new Map();
  for(const [table,mix] of [[a,0.5],[b,0.5]]){
   const w=table.weights||table.slots.map(()=>1),sum=w.reduce((u,v)=>u+v,0)||1;
   table.slots.forEach((slot,i)=>{const key=JSON.stringify(slot),row=set.get(key)||{slot:copy(slot),weight:0};row.weight+=(w[i]||0)*mix/sum;set.set(key,row);});
  }
  const rows=[...set.values()];if(rows.length>100)throw Error('Too many encounter slots to preserve version exclusives');
  const weights=rows.map(r=>Math.max(1,Math.floor(r.weight*100)));let total=weights.reduce((u,v)=>u+v,0);
  while(total>100){const i=weights.indexOf(Math.max(...weights));if(weights[i]<=1)break;weights[i]--;total--;}
  while(total<100){const i=rows.reduce((best,r,j)=>r.weight*100-weights[j]>rows[best].weight*100-weights[best]?j:best,0);weights[i]++;total++;}
  return {...copy(a),rate:Math.max(a.rate||0,b.rate||0),slots:rows.map(r=>r.slot),weights};
 }
 function hordes(a,b){
  if(!a)return copy(b||[]);if(!b)return copy(a);
  const set=new Map();for(const source of [a,b])for(const h of source){
   const key=JSON.stringify({mons:h.mons,lv:h.lv}),row=set.get(key);
   if(row)row.weight+=h.weight/2;else set.set(key,{...copy(h),weight:h.weight/2});
  }
  const rows=[...set.values()],total=rows.reduce((u,v)=>u+v.weight,0)||1;
  const weights=rows.map(r=>Math.max(1,Math.floor(r.weight*100/total)));let sum=weights.reduce((u,v)=>u+v,0);
  while(sum>100){const i=weights.indexOf(Math.max(...weights));if(weights[i]<=1)break;weights[i]--;sum--;}
  while(sum<100){const i=weights.indexOf(Math.min(...weights));weights[i]++;sum++;}
  rows.forEach((r,i)=>r.weight=weights[i]);return rows;
 }
 window.MergedVersions={union,hordes};
})();