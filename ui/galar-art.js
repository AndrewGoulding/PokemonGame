// Original Galar-inspired 2D pixel environments rendered over legacy map templates.
// Collision, warps and NPC coordinates remain those of the underlying navigable map.
(function(){
'use strict';
const cache=new Map(),T=16;
const PALETTES={
 meadow:['#78b56a','#9ccf7c','#e3cc93','#376e44','#5c8c52'],
 town:['#b7b0a4','#d7cabb','#c7ad85','#6b5c54','#9a8071'],
 industry:['#a49b92','#c3b9a5','#b6a08b','#52545a','#81766b'],
 forest:['#548b61','#70ac69','#9cba76','#29583c','#3f754d'],
 coast:['#dfcb99','#b9d5bf','#e3d8b6','#2d819b','#5799a0'],
 cave:['#74777e','#99999c','#b4aaa0','#464951','#626970'],
 snow:['#d8e6e9','#eff5f1','#b6ccd4','#708a9c','#a9bfc2'],
 stadium:['#a3b2af','#d6d7d0','#f0c976','#455b6c','#789193'],
 shrine:['#a6a49c','#cbc7ae','#ded6b2','#666c79','#858a76']
};
function style(name){
 if(/Crown|Snow|Frost|Freezington|Snowslide|Circhester|Route10|Lanakila/.test(name))return'snow';
 if(/Armor|Dojo|Honeycalm|ChallengeBeach|WorkoutSea|Hulbury|FieldsOfHonor/.test(name))return'coast';
 if(/Stadium|Gym|Tower|MaxLair|League|CalyrexArena/.test(name))return'stadium';
 if(/Glimwood|Forest|Slumbering|Weald|SoothingWetlands/.test(name))return'forest';
 if(/Mine|Cave|Tunnel|EnergyPlant|RoseTower/.test(name))return'cave';
 if(/Motostoke|Hammerlocke|Spikemuth|Wyndon/.test(name))return'industry';
 if(/Shrine|Regi|Ruins|Cemetery/.test(name))return'shrine';
 if(/Postwick|Wedgehurst|Turffield|Ballonlea|StowOnSide|Freezington|Village/.test(name))return'town';
 return'meadow';
}
const noise=(a,b,seed)=>{let n=(a*374761393+b*668265263+seed*1442695041)>>>0;n=(n^(n>>>13))*1274126177>>>0;return(n^(n>>>16))>>>0;};
function make(name){
 const m=window.WORLD_MAPS[name],cv=document.createElement('canvas');
 cv.width=m.width*T;cv.height=m.height*T;
 const g=cv.getContext('2d',{alpha:false}),palette=PALETTES[style(name)];
 const seed=[...name].reduce((n,c)=>n+c.charCodeAt(0),1),kind=style(name);
 for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++){
  const i=y*m.width+x,solid=!!m.collision[i],wet=m.behavior[i]===0x10,r=noise(x,y,seed);
  const px=x*T,py=y*T;
  g.fillStyle=wet?'#478eb1':solid?palette[3]:r%8===0?palette[1]:palette[0];
  g.fillRect(px,py,T,T);
  if(wet){
   g.fillStyle='#91d7de';g.fillRect(px+(r%10),py+(r%12),4,1);
  }else if(solid){
   if(kind==='town'||kind==='industry'||kind==='stadium'){
    g.fillStyle=palette[4];g.fillRect(px,py,16,4);
    g.fillStyle='#e8dfc6';if(r%4===0)g.fillRect(px+5,py+5,6,6);
    g.fillStyle='#333c40';g.fillRect(px,py+14,16,2);
   }else if(kind==='forest'||kind==='meadow'||kind==='coast'){
    g.fillStyle=palette[4];g.fillRect(px+4,py+1,9,10);
    g.fillStyle=palette[3];g.fillRect(px+2,py+6,12,7);g.fillRect(px+7,py+12,3,4);
    g.fillStyle='#bad28c';g.fillRect(px+6,py+4,2,2);
   }else{
    g.fillStyle=palette[4];g.fillRect(px+2,py+3,12,10);
    g.fillStyle='#d8e3db';if(r%4===0)g.fillRect(px+3,py+4,4,2);
   }
  }else{
   if(kind==='town'||kind==='industry'||kind==='stadium'){
    g.fillStyle=palette[1];g.fillRect(px+2,py+2,12,12);
    g.fillStyle=palette[2];g.fillRect(px,py+7,16,2);
    g.fillStyle=palette[4];if(r%6===0)g.fillRect(px+3,py+3,2,2);
   }else if(kind==='cave'||kind==='shrine'||kind==='snow'){
    g.fillStyle=palette[1];g.fillRect(px+1,py+4,12,2);
    if(r%3===0){g.fillStyle=palette[4];g.fillRect(px+6,py+10,3,2);}
   }else{
    g.fillStyle=palette[2];if(r%4===0)g.fillRect(px+2,py+8,5,2);
    g.fillStyle=palette[4];if(r%3===0)g.fillRect(px+11,py+3,2,5);
   }
  }
 }
 for(const warp of m.warps||[]){
  const x=warp.x*T,y=warp.y*T;
  g.fillStyle='#f4e2a1';g.fillRect(x+3,y+5,10,9);
  g.fillStyle='#5a554b';g.fillRect(x+5,y+7,6,7);
  g.fillStyle='#fff6d6';g.fillRect(x+6,y+8,2,3);
 }
 return cv;
}
function draw(g,name,x,y){
 if(!window.Galar?.owns(name)||!window.WORLD_MAPS?.[name])return;
 let cv=cache.get(name);if(!cv){cv=make(name);cache.set(name,cv);}
 g.drawImage(cv,x,y);
}
window.GalarArt={draw,style,PALETTES,clear:()=>cache.clear()};
})();
