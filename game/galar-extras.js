// Additional Isle of Armor and Crown Tundra activities.
(function(){
'use strict';
const D=window.GALAR_DATA;if(!D?.dlc)return;
function free(m,x,y){return x>=2&&y>=2&&x<m.width-2&&y<m.height-2&&!m.collision[y*m.width+x]&&!m.warps.some(w=>w.x===x&&w.y===y)&&!m.people.some(p=>p.x===x&&p.y===y);}
function place(id,key,x=17,y=13){
 const m=D.maps['Galar'+id];if(!m)throw Error('Galar sidequest map absent '+id);
 const all=[];for(let yy=2;yy<m.height-2;yy++)for(let xx=2;xx<m.width-2;xx++)if(free(m,xx,yy))all.push({x:xx,y:yy,d:Math.abs(xx-x)+Math.abs(yy-y)});
 all.sort((a,b)=>a.d-b.d);const at=all[0];if(!at)throw Error('No sidequest spot on '+id);
 m.people.push({id:'galar-extra-'+key,localId:'GALAR_EXTRA_'+key,x:at.x,y:at.y,script:'swsh:'+key,
 sprite:'bw2_105',width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});
}
const diglett=['FieldsOfHonor','SoothingWetlands','ChallengeBeach','ForestFocus','TrainingLowlands','BrawlersCave','WorkoutSea','HoneycalmIsland','ArmorStation','MasterDojo'];
diglett.forEach((m,i)=>place(m,'diglett-'+i,24,17));
place('MasterDojo','dojo-sparring',27,11);
place('CrownStation','footprint-0');
place('FrostpointField','footprint-1');
place('GiantBed','footprint-2');
place('OldCemetery','sword-0');
place('SnowslideSlope','sword-1');
place('BallimereLake','sword-2');
place('CrownShrine','sword-3');
place('WyndonCity','galar-star-tournament',32,15);
window.GalarExtras={diglett,footprints:3,swords:['Cobalion','Terrakion','Virizion','Keldeo']};
})();
