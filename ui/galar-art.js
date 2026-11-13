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
// Recognizable regional landmarks are stamped only onto blocked tiles, so
// their silhouettes never hide an NPC, scripted exit or walkable corridor.
const LANDMARKS={
 GalarPostwick:'cottage',GalarWedgehurst:'station',GalarMotostoke:'factory',
 GalarTurffield:'hill',GalarHulbury:'harbor',GalarHammerlocke:'castle',
 GalarBallonlea:'mushroom',GalarSpikemuth:'neon',GalarWyndon:'tower',
 GalarSlumberingWeald:'ancient-tree',GalarFreezington:'cottage',
 GalarCrownShrine:'shrine',GalarFieldsOfHonor:'dojo',
 GalarStowOnSide:'mural',GalarCirchester:'bath',GalarMasterDojo:'dojo',
 GalarHoneycalmIsland:'honeycomb',GalarOldCemetery:'headstone',
 GalarEternatusChamber:'energy',GalarMaxLair:'crystals',
 GalarTowerWaters:'water-tower',GalarTowerDarkness:'shadow-tower',
 GalarRoseTower:'tower',GalarBallimereLake:'lake',GalarWealdShrine:'shrine'
};
function landmark(g,m,name,p){
 const type=LANDMARKS[name];if(!type)return;
 const cx=Math.floor(m.width/2),cy=Math.floor(m.height/2),spots=[];
 for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++){
  if(!m.collision[y*m.width+x]||m.warps.some(a=>a.x===x&&a.y===y)||
    m.people.some(a=>a.x===x&&a.y===y))continue;
  spots.push({x,y,d:Math.abs(x-cx)+Math.abs(y-cy)});
 }
 spots.sort((a,b)=>a.d-b.d);if(!spots.length)return;
 const x=spots[0].x*T,y=spots[0].y*T;
 const fill=(color,xx,yy,w,h)=>{g.fillStyle=color;g.fillRect(x+xx,y+yy,w,h);};
 if(type==='cottage'||type==='station'){
  fill(p[3],2,7,12,8);fill(type==='station'?'#7b8e96':'#b86e54',1,4,14,5);
  fill('#efdfb9',7,10,3,5);fill('#e5ebd1',3,9,3,3);
 }else if(type==='factory'||type==='tower'||type==='castle'){
  fill('#505b68',2,6,12,9);fill('#a8bbc3',5,3,6,6);
  fill(type==='factory'?'#c17b5b':'#f1c98d',7,1,3,5);fill('#e6d9aa',4,10,3,3);
 }else if(type==='mushroom'||type==='ancient-tree'){
  fill('#614d68',7,7,3,8);fill(type==='mushroom'?'#a886c7':'#4e8d64',2,3,12,8);
  fill('#d6d4bd',4,5,3,2);fill('#f4dfa4',10,4,2,2);
 }else if(type==='harbor'){
  fill('#507b96',1,10,14,5);fill('#e0d6b9',2,6,12,3);
  fill('#f7f2d7',6,2,5,7);fill('#7b8a9b',7,4,1,6);
 }else if(type==='hill'){
  fill('#587b52',2,9,12,6);fill('#8fb772',4,5,8,8);fill('#dfc57f',7,2,2,11);
 }else if(type==='neon'){
  fill('#343e50',2,4,12,11);fill('#d45b9a',4,6,8,2);fill('#7fc6d4',5,10,7,2);
 }else if(type==='shrine'||type==='dojo'){
  fill('#6b6c73',2,8,12,7);fill('#c7a18a',3,4,10,5);
  fill('#e5d2a4',7,9,3,6);fill('#f4ecd6',6,2,4,3);
 }else if(type==='mural'){
  fill('#896b64',2,3,12,12);fill('#c4aa80',4,4,8,10);
  fill('#8e668c',6,6,4,6);fill('#e6d4aa',7,7,2,3);
 }else if(type==='bath'||type==='lake'){
  fill('#617f94',1,8,14,7);fill('#a0cbd1',3,9,10,3);
  fill('#f2e7dc',3,5,10,2);fill('#c8e0db',5,10,5,1);
 }else if(type==='honeycomb'){
  fill('#668f58',2,8,12,7);fill('#e2be5a',4,4,8,9);
  for(const px of [5,9])for(const py of [5,9])fill('#b88d3d',px,py,2,2);
 }else if(type==='headstone'){
  fill('#6b7980',4,6,8,9);fill('#c6c3bd',5,4,6,9);
  fill('#78928b',7,6,2,5);
 }else if(type==='energy'||type==='crystals'){
  fill('#4d536a',2,9,12,6);
  fill(type==='energy'?'#df8ec7':'#9cc8e6',6,2,4,12);
  fill('#dce5eb',7,5,2,7);fill('#8f86b1',4,8,8,2);
 }else if(type==='water-tower'||type==='shadow-tower'){
  fill(type==='water-tower'?'#599bb0':'#564f7c',3,7,10,8);
  fill('#d6d5bf',5,3,6,6);fill('#f3e8d2',7,1,2,8);
 }
}
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
 landmark(g,m,name,palette);
 for(const warp of m.warps||[]){
  const x=warp.x*T,y=warp.y*T;
  g.fillStyle='#f4e2a1';g.fillRect(x+3,y+5,10,9);
  g.fillStyle='#5a554b';g.fillRect(x+5,y+7,6,7);
  g.fillStyle='#fff6d6';g.fillRect(x+6,y+8,2,3);
 }
 return cv;
}
function draw(g,name,x,y){
 if(window.WORLD_MAPS?.[name]?.regionLayout)return; // drawn by tools/build-region-layouts.js
 if(!window.Galar?.owns(name)||!window.WORLD_MAPS?.[name])return;
 let cv=cache.get(name);if(!cv){cv=make(name);cache.set(name,cv);}
 g.drawImage(cv,x,y);
}
window.GalarArt={draw,style,PALETTES,LANDMARKS,clear:()=>cache.clear()};
})();
