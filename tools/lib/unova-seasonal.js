// Cosmetic Gen V forms; battle stats/types stay on the ordinary species entry.
'use strict';const path=require('path'),{readPng,readPal,writePng}=require('./png');
module.exports=function({root,source,rgba}){
 const data={species:['Deerling','Sawsbuck'],forms:['spring','summer','autumn','winter'],followers:[],source:'src/ov012/season_form.c'};
 for(const[folder,id]of [['deerling',585],['sawsbuck',586]])for(let form=1;form<=3;form++){
  const base=path.join(source,'res/pokemon',folder,'form_'+form),key=id+'-'+data.forms[form];
  for(const back of [false,true])for(const shiny of [false,true]){
   const p=readPng(path.join(base,back?'back_single.png':'front_single.png')),pal=readPal(path.join(base,shiny?'shiny.pal':'normal.pal')),out=new Uint8ClampedArray(p.width*p.height*4);
   for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++)out.set(rgba(p,x,y,pal),(y*p.width+x)*4);
   writePng(path.join(root,'assets/sprites/pokemon',back?'back':'',shiny?'shiny':'',key+'.png'),p.width,p.height,out);
  }
  const p=readPng(path.join(base,'icon.png')),out=new Uint8ClampedArray(p.width*p.height*4);for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++)out.set(rgba(p,x,y),(y*p.width+x)*4);
  writePng(path.join(root,'assets/sprites/icons',key+'.png'),p.width,p.height,out);
  // BW2 has no walking-party sheets. Use its two-frame form icon, as the
  // grotto display does, instead of showing spring antlers in other seasons.
  const walk=new Uint8ClampedArray(32*9*32*4);for(let f=0;f<9;f++)for(let y=0;y<32;y++)for(let x=0;x<32;x++)walk.set(rgba(p,x,y+(f>=3&&f%2?32:0)),(y*32*9+f*32+x)*4);
  writePng(path.join(root,'assets/world/sprites/follow',key+'.png'),32*9,32,walk);data.followers.push(key);
 }
 return data;
};
