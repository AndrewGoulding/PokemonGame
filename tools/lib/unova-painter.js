// Unova's authored layouts, rendered with the same FireRed tiles as Johto.
// Coordinates and door anchors are stable for existing saves and story scripts.
'use strict';
const path=require('path');
const Painter=require('./fr-painter');
const {readPng,writePng}=require('./png');
const {writeAnimSheet,renderBlocks,loadTileset}=require('./fr-tiles');
const {canvas,hash}=require('./orre-art');
module.exports=function(root){
 const out=path.join(root,'assets/world/maps'),cache={};
 const picture=name=>cache[name]||(cache[name]=readPng(path.join(out,name+'.png')));
 function blit(c,p,sx,sy,w,h,dx,dy){for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=((sy+y)*p.width+sx+x)*4;if(p.rgba[k+3])c.p(dx+x,dy+y,p.rgba.subarray(k,k+4));}}
 function tile(c,name,sx,sy,x,y){blit(c,picture(name),sx*16,sy*16,16,16,x*16,y*16);}
 function reserved(m,x,y,r=2){return [...m.people,...m.warps,...m.signs,...(m.hidden||[])].some(a=>Math.abs(a.x-x)<=r&&Math.abs(a.y-y)<=r);}
 function patch(m,x,y,w,h,kind,solid=false){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){if(xx<2||yy<2||xx>=m.width-2||yy>=m.height-2)continue;const k=yy*m.width+xx;if(m.art.tiles[k]!=='lawn'||reserved(m,xx,yy))continue;if(kind==='flowers'&&(xx+2*yy)%4!==0)continue;m.art.tiles[k]=kind;if(solid)m.collision[k]=1;}}
 function landscape(m){
  for(const p of m.art.props)if(p.kind==='fence')patch(m,p.x,p.y,2,1,'fence',true);
  // Small groves, flower beds and garden borders break up the old empty lawns.
  for(let y=4;y<m.height-5;y+=6)for(let x=4;x<m.width-5;x+=6){
   if(hash(x,y,m.width)<.45&&[0,1,2,3].every(dy=>[0,1,2,3].every(dx=>m.art.tiles[(y+dy)*m.width+x+dx]==='lawn'&&!reserved(m,x+dx,y+dy,3))))patch(m,x,y,4,4,'tree',true);
  }
  for(let y=3;y<m.height-3;y++)for(let x=3;x<m.width-3;x++){const k=y*m.width+x;if(m.art.tiles[k]!=='lawn'||m.collision[k]||reserved(m,x,y,1))continue;const pathNear=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>['path','paving'].includes(m.art.tiles[(y+dy)*m.width+x+dx]));if(pathNear&&hash(x>>1,y>>1,m.width)>.52)m.art.tiles[k]='flowers';}
  if(m.name==='UnovaAspertiaCity'){
   patch(m,30,5,12,15,'flowers');patch(m,4,37,11,5,'flowers');patch(m,31,54,9,5,'flowers');
   m.art.props.push({x:5,y:18,kind:'bench'},{x:13,y:18,kind:'bench'},{x:30,y:37,kind:'lamp'},{x:19,y:43,kind:'lamp'});
  }
  if(m.name==='UnovaFloccesyTown'){
   patch(m,5,30,12,9,'flowers');m.art.props.push({x:10,y:8,kind:'clock'},{x:6,y:22,kind:'bench'},{x:26,y:22,kind:'bench'});
  }
  if(m.name==='UnovaVirbankCity'){
   m.art.props.push({x:33,y:35,kind:'lamp'},{x:48,y:31,kind:'lamp'},{x:14,y:34,kind:'crates'},{x:7,y:40,kind:'crates'});
  }
 }
 function outdoor(m){
  if(!m.unovaTheme)landscape(m);
  const kinds={'sand-grass':'sand',lawn:'grass',grass:'tallgrass','dark-grass':'tallgrass',paving:'pavement',wood:'bridge',fence:'fence',floor:'pavement',stage:'pavement'};
  const cave=['cave','sewer','sand-cave','charged'].includes(m.unovaTheme),style=cave?'cave':'outdoor';
  const classes=m.art.tiles.map((k,i)=>k==='lawn'?(m.collision[i]?(cave?'rock':'tree'):(cave?'path':'grass')):k==='grass'&&cave?'path':kinds[k]||k);
  const signs=m.signs.map(s=>[s.x,s.y,'sign']);
  for(const [x,y]of signs)classes[y*m.width+x]='object';
  const pic=Painter.compose(classes.map(k=>k==='building'?'grass':k),m.width,m.height,{signs,noFill:true,style});
  // Fixed native stamps avoid borrowing neighbouring buildings or cliff tiles.
  // Their original proportions fit the compact footprints made by house().
  for(const b of m.art.buildings){
   const kind=b.kind==='center'?'pokecenter':b.kind;
   const st=Painter.stamps.find(s=>s.kind===kind&&s.from===(b.source||(kind==='house'?'PalletTown':'ViridianCity')));
   const tileSet=name=>cache[name]||(cache[name]=loadTileset(name));
   const art=renderBlocks(st.blocks.map(v=>v==null?1:v),st.w,st.h,tileSet(st.primary),tileSet(st.secondary),false);
   const ox=(b.doorX-st.door[0])*16,oy=(b.y+b.h-1-st.door[1])*16;
   for(let y=0;y<st.h*16;y++)for(let x=0;x<st.w*16;x++){
    if(st.blocks[Math.floor(y/16)*st.w+Math.floor(x/16)]==null)continue;
    const from=(y*st.w*16+x)*4,to=((oy+y)*m.width*16+ox+x)*4;
    for(const layer of ['below','above']){pic[layer].set(art[layer].subarray(from,from+4),to);}
   }
  }
  const c=canvas(m.width*16,m.height*16);c.data.set(pic.below);
  for(let k=0;k<m.art.tiles.length;k++)if(m.art.tiles[k]==='dark-grass'){const ox=(k%m.width)*16,oy=Math.floor(k/m.width)*16;for(let y=0;y<16;y++)for(let x=0;x<16;x++)for(let channel=0;channel<3;channel++){const i=((oy+y)*c.w+ox+x)*4+channel;c.data[i]*=[.62,.74,.7][channel];pic.above[i]*=[.62,.74,.7][channel];}}
  m.top=true;writePng(path.join(out,m.name+'-top.png'),c.w,c.h,pic.above);
  if(m.unovaDive){const cells=[];for(let i=0;i<pic.anim.cells.length;i+=4){const x=Math.floor(pic.anim.cells[i]/2),y=Math.floor(pic.anim.cells[i+1]/2);if(m.behavior[y*m.width+x]!==0x11)cells.push(...pic.anim.cells.slice(i,i+4));}pic.anim.cells=cells;}
  if(pic.anim.pics.length){writeAnimSheet(path.join(out,m.name+'-anim.png'),pic.anim.pics);m.anim={cells:pic.anim.cells,anims:pic.anims};}
  writePng(path.join(out,m.name+'-border.png'),32,32,Painter.render(Painter.paint(Array(4).fill(cave?'rock':'tree'),2,2,style),2,2,null,style).below);
  return c;
 }
 function indoor(m){
  if(m.name==='UnovaVirbankGym')for(const y of [18,22,26])for(const x of [6,23])m.art.props.push({x,y,kind:'bench'});
  if(m.name==='UnovaAlderHouse'){m.art.props.push({x:9,y:10,kind:'court'},{x:5,y:19,kind:'bench'},{x:21,y:19,kind:'bench'});}
  if(m.name.endsWith('Gate'))m.art.props.push({x:5,y:5,kind:'bench'},{x:13,y:12,kind:'bench'});
  const c=canvas(m.width*16,m.height*16),center=m.pokemonCenter,school=m.name.includes('School'),home=m.name==='UnovaHome',stage=m.name==='UnovaVirbankGym'||m.unovaTheme==='studio',silk=m.unovaTheme==='silk';
  for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++){
   const wall=x<2||y<2||x>=m.width-2||y>=m.height-2;
   if(wall){c.rect(x*16,y*16,16,16,[58,66,82]);if(y===1&&x>=2&&x<m.width-2)tile(c,'PalletTown_PlayersHouse_1F',6,1,x,y);continue;}
   if(silk){tile(c,'ViridianCity_PokemonCenter_1F',2,5,x,y);const k=(y*16*c.w+x*16)*4;for(let j=0;j<16;j++)for(let i=0;i<16;i++){const o=k+(j*c.w+i)*4;c.data[o]*=.82;c.data[o+1]*=.90;}if((x+y)%4===0)c.line(x*16,y*16,x*16+15,y*16+15,[245,244,221]);}
   else if(center)tile(c,'ViridianCity_PokemonCenter_1F',2,5,x,y);
   else if(stage){tile(c,'PalletTown_PlayersHouse_1F',2,7,x,y);const raised=m.art.tiles[y*m.width+x]==='stage';for(let j=0;j<16;j++)for(let i=0;i<16;i++){const k=((y*16+j)*c.w+x*16+i)*4;c.data[k]*=raised?.85:.50;c.data[k+1]*=raised?.70:.45;c.data[k+2]*=raised?.95:.65;}}
   else tile(c,'PalletTown_PlayersHouse_1F',2,7,x,y);
  }
  // Functional surfaces stay at the original interaction coordinates.
  if(center){
   for(let x=2;x<m.width-2;x++)tile(c,'PalletTown_PlayersHouse_1F',6,0,x,1);
   blit(c,picture('ViridianCity_PokemonCenter_1F'),64,16,112,48,4*16,16);
   for(let x=4;x<=10;x++)m.collision[3*m.width+x]=1;
   tile(c,'ViridianCity_PokemonCenter_1F',2,1,12,3);
   for(const x of [3,m.width-4]){tile(c,'ViridianCity_PokemonCenter_1F',1,1,x,2);}
   for(const x of [14,16]){tile(c,'ViridianCity_PokemonCenter_1F',11,5,x,9);tile(c,'ViridianCity_PokemonCenter_1F',11,6,x,10);}
  }else{
   for(let x=3;x<m.width-3;x+=3)tile(c,'PalletTown_PlayersHouse_1F',7,1,x,2);
   if(home){blit(c,picture('PalletTown_PlayersHouse_1F'),64,48,80,64,6*16,9*16);solid(m,7,10,3,2);}
   if(school)for(const [x,y]of [[5,5],[16,5],[5,13],[16,13]]){blit(c,picture('PalletTown_PlayersHouse_1F'),80,64,48,32,x*16,y*16);solid(m,x,y,3,2);}
  }
  if(!center)for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++)if(m.behavior[y*m.width+x]===0x83)tile(c,'ViridianCity_PokemonCenter_1F',2,1,x,y);
  if(m.unovaTheme==='abyssal'){for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++){const wall=m.art.tiles[y*m.width+x]==='wall';c.box(x*16,y*16,16,16,wall?[44,80,99]:(x+y)%2?[104,141,144]:[121,151,151],wall?[22,53,74]:[81,115,124]);if(wall)c.line(x*16+3,y*16+5,x*16+12,y*16+5,[98,144,155]);}for(let x=5;x<m.width-4;x+=8)c.rect(x*16,3*16,16,3,[155,190,184]);}
  if(m.unovaTheme==='castle'){for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++)c.rect(x*16,y*16,16,16,(x+y)%2?[139,153,153]:[181,187,169]);c.box(8*16,3*16,(m.width-16)*16,6*16,[164,149,118],[224,205,159]);for(const x of [4,m.width-5])for(const y of [5,13,21]){c.box(x*16,y*16,16,32,[144,157,159],[79,98,110]);c.rect(x*16-2,y*16,20,5,[210,210,182]);}}
  if(m.unovaTower||m.name==='UnovaWhiteTreehollowLobby'){const white=m.unovaTower?.mode==='white'||m.name==='UnovaWhiteTreehollowLobby';for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++){const wall=m.art.tiles[y*m.width+x]==='wall';if(white){c.rect(x*16,y*16,16,16,(x+y)%2?[128,162,108]:[143,176,121]);c.line(x*16+4,y*16+12,x*16+7,y*16+9,[109,145,87]);}if(wall){c.box(x*16,y*16,16,16,white?[102,122,76]:[70,87,101],white?[64,87,57]:[42,56,73]);c.rect(x*16+2,y*16+2,12,3,white?[171,184,116]:[139,157,166]);}}}
  if(m.unovaTheme==='marine'){c.rect(2*16,2*16,(m.width-4)*16,(m.height-4)*16,[44,113,143]);for(let x=3;x<m.width-3;x+=4){c.line(x*16,3*16,x*16,14*16,[106,194,202],2);c.ellipse(x*16+20,4*16,10,3,[76,152,166]);}c.box(2*16,6*16,(m.width-4)*16,6*16,[136,192,189],[37,92,121]);c.rect(3*16,8*16,(m.width-6)*16,3*16,[196,212,193]);for(let x=4;x<m.width-3;x+=4)c.line(x*16,6*16,x*16,12*16,[78,140,155],3);}
  if(m.unovaTheme==='lilypad'){for(let y=2;y<m.height-2;y++)for(let x=2;x<m.width-2;x++){const walk=!m.collision[y*m.width+x];c.rect(x*16,y*16,16,16,walk?[126,174,122]:[82,157,188]);if(!walk)c.line(x*16+3,y*16+7,x*16+11,y*16+7,[143,208,211]);else c.line(x*16,y*16+15,x*16+15,y*16+15,[88,138,112]);}for(const y of [13,23,33])for(const x of [8,23])c.ellipse(x*16+8,y*16+4,35,25,[168,202,123],2);}
  if(m.unovaTheme==='dragon'){c.rect(2*16,2*16,(m.width-4)*16,(m.height-4)*16,[53,62,84]);c.rect(13*16,3*16,5*16,(m.height-6)*16,[152,149,130]);for(const y of [13,21,29]){c.ellipse(15*16,y*16,145,49,[131,151,152]);c.ellipse(15*16,y*16,142,46,[167,177,155],3);c.poly([[15*16,y*16-31],[15*16+22,y*16-10],[15*16,y*16+27],[15*16-22,y*16-10]],[86,113,132]);}}
  if(m.unovaTheme==='league'){const color=m.name.includes('Shauntal')?[97,70,120]:m.name.includes('Grimsley')?[112,65,81]:m.name.includes('Caitlin')?[125,107,160]:m.name.includes('Marshal')?[104,112,81]:[86,118,155];c.rect(2*16,2*16,(m.width-4)*16,(m.height-4)*16,color);c.box(7*16,3*16,(m.width-14)*16,7*16,[207,199,157],[246,231,187]);c.rect((Math.floor(m.width/2)-2)*16,10*16,5*16,(m.height-12)*16,[156,153,165]);for(const x of [4,m.width-5])for(const y of [5,12,19]){c.ellipse(x*16,y*16,6,7,[246,222,142]);c.rect(x*16-2,y*16+7,4,14,[71,78,97]);}}
  if(m.unovaTheme==='haunted'){for(let i=0;i<c.data.length;i+=4){c.data[i]*=.65;c.data[i+1]*=.67;c.data[i+2]*=.8;}for(const x of [4,m.width-7])for(const y of [6,14]){c.box(x*16,y*16,48,30,[103,77,78],[40,45,66]);for(let xx=4;xx<44;xx+=7)c.rect(x*16+xx,y*16+4,4,20,[157+xx,132,111]);solid(m,x,y,3,2);}}
  if(m.unovaTheme==='mine'){for(let y=3;y<m.height-3;y++)for(let x=3;x<m.width-3;x++){const k=(y*16*c.w+x*16)*4;for(let j=0;j<16;j++)for(let i=0;i<16;i++){const o=k+(j*c.w+i)*4;c.data[o]*=.6;c.data[o+1]*=.65;c.data[o+2]*=.72;}}for(const x of [4,m.width-5]){c.line(x*16,4*16,x*16,(m.height-4)*16,[162,160,130],3);for(let yy=5;yy<m.height-4;yy+=2)c.line(x*16-4,yy*16,x*16+4,yy*16,[111,99,77],3);}}
  if(m.unovaTheme==='hangar'){for(const x of [5,24])for(let y=8;y<39;y+=10){c.box(x*16,y*16,16,48,[91,112,135],[46,66,86]);c.line(x*16+3,y*16+3,x*16+12,y*16+3,[237,221,144],2);}for(let y=8;y<40;y+=10){c.ellipse(15*16,y*16,27,10,[112,126,145],2);c.line(15*16-24,y*16,15*16+24,y*16,[169,186,195],2);}}
  if(m.unovaTheme==='memorial')for(const x of [5,9,17,21])for(const y of [7,12,17])if(!reserved(m,x,y,1)){c.box(x*16,y*16,16,22,[160,172,175],[69,82,97]);c.box(x*16+3,y*16+3,10,8,[193,198,184],[111,132,146]);solid(m,x,y,1,2);}
  if(m.unovaTheme==='ship'){c.rect(3*16,3*16,(m.width-6)*16,4,[126,149,162]);c.rect(3*16,(m.height-4)*16,(m.width-6)*16,4,[126,149,162]);}
  if(m.unovaTheme==='runway'){c.rect(11*16,3*16,7*16,(m.height-6)*16,[74,44,91]);for(let yy=4;yy<m.height-3;yy+=2)for(const xx of [10,18])c.box(xx*16,yy*16,8,8,[246,228,141],[133,101,150]);for(const xx of [4,22])for(let yy=5;yy<38;yy+=10)c.box(xx*16,yy*16,16,32,[73,82,106],[41,48,68]);}
  if(m.unovaTheme==='coaster'){for(const x of [11,20]){c.line(x*16,7*16,x*16,29*16,[64,68,81],6);c.line(x*16+6,7*16,x*16+6,29*16,[175,181,189],2);}for(let yy=8;yy<29;yy++)c.line(11*16,yy*16,20*16,yy*16,[145,117,88],3);}
  if(m.unovaTheme==='avenue'){for(const [xx,yy]of [[4,4],[21,4],[4,14],[21,14],[4,24],[21,24],[4,34],[21,34]]){c.box(xx*16,yy*16,64,24,[175,100,83],[70,58,80]);for(let j=0;j<4;j++)c.rect(xx*16+j*16,yy*16,8,10,[239,208,142]);}for(const x of [13,17])c.line(x*16,3*16,x*16,37*16,[198,162,107],2);}
  if(m.unovaTheme==='station'){c.box(4*16,3*16,20*16,20,[69,80,105],[32,45,66]);for(let x=5;x<24;x+=3)c.rect(x*16,3*16+5,20,6,[226,211,130]);for(const x of [4,22])c.box(x*16,11*16,24,80,[91,108,121],[43,58,78]);}
  if(stage){c.rect(3*16,11*16-3,(m.width-6)*16,3,[45,38,60]);c.line(15*16,11*16-2,18*16,11*16-2,[213,188,134],2);}
  for(const w of m.warps)if(m.behavior[w.y*m.width+w.x]===0x65)tile(c,'ViridianCity_PokemonCenter_1F',7,8,w.x,w.y);
  writePng(path.join(out,m.name+'-border.png'),32,32,new Uint8ClampedArray(32*32*4));
  writePng(path.join(out,m.name+'-top.png'),c.w,c.h,new Uint8ClampedArray(c.data.length));m.top=false;
  return c;
 }
 function solid(m,x,y,w,h){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){if(xx<2||yy<2||xx>=m.width-2||yy>=m.height-2||reserved(m,xx,yy,1))continue;m.collision[yy*m.width+xx]=1;}}
 function props(c,m){
  if(m.unovaRegiSwitch){const x=16*16,y=13*16;c.ellipse(x+8,y+8,7,5,[212,192,134]);c.ellipse(x+8,y+8,3,4,[65,75,88]);c.box(m.unovaRegiSwitch.x*16,m.unovaRegiSwitch.y*16,16,16,[164,148,112],[104,104,91]);}
  for(const p of m.art.props){const x=p.x*16,y=p.y*16;const size={bench:[2,2],lamp:[1,2],clock:[2,3],crates:[3,2],amp:[2,2],camera:[2,2],'cinema-screen':[12,4],'green-screen':[22,3]}[p.kind];if(size)solid(m,p.x,p.y,...size);
   if(p.kind==='charged-crystal'){c.poly([[x,y+33],[x+6,y+8],[x+14,y],[x+25,y+12],[x+27,y+33]],[75,129,173]);c.poly([[x+14,y+3],[x+13,y+28],[x+4,y+32],[x+8,y+11]],[143,223,222]);c.line(x+15,y+8,x+22,y+29,[190,241,218],2);solid(m,p.x,p.y,2,2);}
   else if(p.kind==='airstrip'){c.box(x,y,112,256,[125,139,146],[208,212,192]);for(let j=8;j<248;j+=24)c.rect(x+53,y+j,6,12,[235,225,167]);for(const xx of [5,100])for(let yy=12;yy<240;yy+=32)c.rect(x+xx,y+yy,6,6,[242,235,173]);}
   else if(p.kind==='quicksand'){for(let r=61;r>4;r-=8)c.ellipse(x+64,y+64,r,Math.floor(r*.65),r%3?[181,143,91]:[211,175,116],3);}
   else if(p.kind==='ruin-arch'){c.box(x,y,80,48,[173,149,108],[98,90,76]);c.rect(x+16,y+16,48,32,[65,65,64]);for(let i=0;i<5;i++)c.box(x+i*16,y,16,16,[197,172,127],[126,111,88]);solid(m,p.x,p.y,5,2);}
   else if(p.kind==='ferris-wheel'){c.line(x+48,y+50,x+16,y+158,[116,134,146],5);c.line(x+48,y+50,x+80,y+158,[116,134,146],5);c.ellipse(x+48,y+52,48,48,[102,119,141],3);for(let i=0;i<8;i++){const a=i*Math.PI/4,xx=x+48+Math.round(Math.cos(a)*48),yy=y+52+Math.round(Math.sin(a)*48);c.line(x+48,y+52,xx,yy,[168,182,182],2);c.box(xx-9,yy-5,18,16,i%2?[218,134,128]:[130,180,171],[67,82,107]);}c.ellipse(x+48,y+52,7,7,[230,202,129]);solid(m,p.x,p.y,6,10);}
   else if(p.kind==='cinema-screen'){c.box(x,y,192,64,[26,40,56],[85,91,112]);c.box(x+5,y+5,182,50,[225,234,208],[126,148,153]);c.line(x+20,y+54,x+172,y+54,[190,179,127],2);c.ellipse(x+96,y+29,15,15,[87,150,145]);c.ellipse(x+96,y+29,9,9,[218,230,189]);}
   else if(p.kind==='entree-tree'){c.box(x+33,y+45,30,64,[131,98,60],[72,73,51]);for(let i=0;i<4;i++)c.line(x+38+i*6,y+48,x+37+i*6,y+105,[168,127,70],2);for(const[dx,dy,r]of [[48,36,47],[17,42,25],[77,43,27],[35,10,30],[62,11,31]]){c.ellipse(x+dx,y+dy,r,r*.7,[61,111,77]);c.ellipse(x+dx,y+dy-4,r-4,r*.6,[94,149,89]);}c.ellipse(x+47,y+77,9,8,[212,193,112],2);}
   else if(p.kind==='dive-spot'){c.ellipse(x+8,y+8,23,23,[35,74,127]);c.ellipse(x+8,y+8,18,18,[27,61,112]);c.ellipse(x+8,y+8,11,11,[21,49,99]);c.line(x-8,y+12,x-2,y+15,[91,144,173]);}
   else if(p.kind==='green-screen'){c.box(x,y,352,48,[56,132,99],[49,70,72]);for(let i=4;i<348;i+=8)c.line(x+i,y+2,x+i,y+44,[64,143,107]);c.rect(x,y+44,352,4,[123,139,112]);}
   else if(p.kind==='camera'){c.box(x,y,25,17,[87,100,116],[36,49,65]);c.box(x+19,y+3,10,10,[49,64,79],[23,39,53]);c.ellipse(x+8,y+4,6,6,[133,153,160]);c.line(x+12,y+16,x+3,y+32,[59,74,86],2);c.line(x+12,y+16,x+22,y+32,[59,74,86],2);c.line(x+12,y+16,x+12,y+32,[143,157,156],2);}
   else if(p.kind==='court'){c.box(x,y,160,112,[124,166,142],[238,239,206]);c.line(x+80,y,x+80,y+112,[238,239,206]);c.ellipse(x+80,y+56,20,20,[238,239,206],2);}
   else if(p.kind==='bench'){c.box(x,y+5,32,11,[130,83,55],[65,71,62]);for(let yy=6;yy<14;yy+=3)c.line(x+2,y+yy,x+29,y+yy,[201,156,94]);c.rect(x+3,y+16,3,5,[58,68,65]);c.rect(x+26,y+16,3,5,[58,68,65]);}
   else if(p.kind==='lamp'){c.box(x+6,y,4,31,[100,117,123],[54,71,78]);c.box(x+2,y-8,12,12,[235,228,154],[59,77,84]);c.rect(x+5,y-5,5,6,[255,249,201]);}
   else if(p.kind==='clock'){c.box(x,y,32,43,[195,183,139],[82,84,76]);c.box(x+3,y+3,26,8,[132,105,79],[77,83,77]);c.ellipse(x+16,y+22,10,10,[248,240,191]);c.line(x+16,y+22,x+16,y+15,[75,83,79]);c.line(x+16,y+22,x+22,y+22,[75,83,79]);}
   else if(p.kind==='crates'){for(let j=0;j<2;j++)for(let i=0;i<3;i++){const xx=x+i*16,yy=y+j*16;c.box(xx,yy,16,16,[175,130,79],[78,77,65]);c.box(xx+2,yy+2,12,12,[145,104,65],[211,173,112]);c.line(xx+3,yy+3,xx+12,yy+12,[208,171,108]);}}
   else if(p.kind==='pipe'){c.box(x,y,16,48,[111,138,147],[55,77,90]);for(let i=2;i<14;i++)c.line(x+i,y+1,x+i,y+46,i<5?[165,187,188]:i>10?[74,100,116]:[128,153,162]);for(let j=4;j<48;j+=12)c.box(x,y+j,16,4,[165,180,181],[68,91,108]);}
   else if(p.kind==='amp'){c.box(x,y,32,32,[52,48,66],[26,31,45]);for(let j=6;j<30;j+=2)c.line(x+3,y+j,x+28,y+j,[85,79,94]);for(const yy of [12,24]){c.ellipse(x+16,y+yy,8,6,[32,36,48]);c.ellipse(x+16,y+yy,6,4,[93,94,108],1);}c.rect(x+3,y+2,26,2,[180,149,88]);}
   else if(p.kind==='sign'){c.rect(x+6,y+9,4,7,[98,83,60]);c.box(x+1,y,14,11,[230,213,154],[83,92,77]);c.line(x+4,y+3,x+11,y+3,[94,110,94]);c.line(x+4,y+6,x+9,y+6,[94,110,94]);}
  }
 }
 return function draw(m){const c=m.art.indoor?indoor(m):outdoor(m);props(c,m);for(const w of m.warps)if(m.behavior[w.y*m.width+w.x]===0x61){const x=w.x*16,y=w.y*16,dx=w.x<m.width/3?-1:w.x>m.width*2/3?1:0,dy=dx?0:w.y<m.height/2?-1:1;const ax=x+8,ay=y+8;c.poly(dx?[[ax+dx*5,ay],[ax-dx*2,ay-4],[ax-dx*2,ay+4]]:[[ax,ay+dy*5],[ax-4,ay-dy*2],[ax+4,ay-dy*2]],[247,239,195]);}writePng(path.join(out,m.name+'.png'),c.w,c.h,c.data);delete m.art;};
};
