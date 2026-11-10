(function(){
 'use strict';const F=Unova,D=F.data().seasonal;if(!D)return;
 if(window.JOHTO_FOLLOWERS)for(const key of D.followers)if(!JOHTO_FOLLOWERS.hgss.includes(key))JOHTO_FOLLOWERS.hgss.push(key);
 function isSeasonal(r){return D.species.includes(r.species);}
 function form(p,r){if(isSeasonal(r))r.seasonForm=F.season(p);return r;}
 function sync(p){if(!F.owns(p.location.map))return;const season=F.season(p);for(const r of p.party)if(isSeasonal(r)){
  r.seasonForm=season;if(r.egg)continue;
  const s=F.state(p),seen=s.seasonalSeen||(s.seasonalSeen={}),forms=seen[r.species]||(seen[r.species]=[]);if(!forms.includes(season))forms.push(season);Player.markSeen(p,r.species);
 }}
 window.UnovaSeasonal={data:()=>D,isSeasonal,form,sync};
})();
