// Pixel garment layers for the existing custom protagonist; not extracted 3DS clothing models.
(function () {
  'use strict';
  const colors={Black:[42,39,44],Blue:[62,115,195],Red:[201,58,63],Green:[66,142,82],Gray:[138,140,148],Olive:[117,125,69],Beige:[209,186,143],White:[236,232,220],Orange:[230,136,58],Purple:[147,87,174],Aqua:[85,190,194],'Navy blue':[48,62,105],'Pale pink':[236,177,194],Yellow:[229,202,73],Pink:[218,121,159],Brown:[125,87,64],'Lime green':[159,195,74],Gold:[214,175,72],Silver:[189,195,206]};
  const rgb=a=>colors[a?.color]||null, shade=(c,s)=>c.map(v=>Math.max(0,Math.min(255,Math.round(v*s))));
  function pattern(a,x,y,scale) {
    if(!a)return null;let c=rgb(a),name=a.name;
    x=Math.floor(x/scale);y=Math.floor(y/scale);
    if(/Two-Tone/.test(name)&&x%5>2)c=shade(c,.6);
    else if(/Down Jacket/.test(name)&&y%3===0)c=shade(c,.6);
    else if(/Laced/.test(name)&&(x+y)%3===0)c=colors.White;
    else if(/Check|Plaid|Kilt/.test(name)&&((x>>1)+(y>>1))%2)c=shade(c,.6);
    else if(/Strip|Cuffed/.test(name)&&y%3===0)c=shade(c,.55);
    else if(/Camo|Splatter|Exotic/.test(name)&&(x*7+y*11)%13<4)c=shade(c,.6);
    else if(/Glitzy|Sparkly|Sundae/.test(name)&&(x+y*3)%9===0)c=colors.White;
    else if(/Damaged/.test(name)&&y%5===0&&x%3)c=shade(colors.White,.8);
    return c;
  }
  function paint(pixels,width,height,clothing,kind='front',tone) {
    const F=window.KalosFashion;if(!clothing||!F)return pixels;
    const parts=Object.fromEntries(Object.entries(clothing).filter(([k])=>k!=='underDress').map(([k,id])=>[k,F.item(id)]));
    const fw=kind.startsWith('world:')?(/_(?:bike|surf|ride|fish|wheelie)/.test(kind)?32:16):64,fh=kind==='back'?64:kind.startsWith('world:')?32:height;
    const original=new Uint8ClampedArray(pixels),px=(x,y)=>((y*width+x)*4);
    for(let fy=0;fy<height;fy+=fh)for(let fx=0;fx<width;fx+=fw){
      let top=fh,left=fw,right=0,bottom=0,coatTop=fh;
      for(let y=0;y<fh&&fy+y<height;y++)for(let x=0;x<fw&&fx+x<width;x++)if(original[px(fx+x,fy+y)+3]){const at=px(fx+x,fy+y),key=Array.from(original.slice(at,at+3)).join(',');if(['222,66,63','180,52,50','106,47,46'].includes(key))coatTop=Math.min(coatTop,y);top=Math.min(top,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);}
      if(top>=bottom)continue;
      const world=kind.startsWith('world:'),h=bottom-top+1,scale=world?1:2,cx=(left+right)/2,bodyTop=Math.min(coatTop,top+Math.floor(h*(kind==='back'?.51:.52))),legTop=kind==='back'?bottom+1:top+Math.floor(h*.76),shoeTop=kind==='back'?bottom+1:bottom-Math.max(1,Math.floor(h*.1)),skirt=parts.dress||(/Skirt/i.test(parts.pants?.name||'')?parts.pants:null);
      const put=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(!c||x<0||x>=fw||y<0||y>=fh||fx+x>=width||fy+y>=height)return;const i=px(fx+x,fy+y);pixels.set([...c,255],i);};
      const skinColor=tone||[222,148,115];
      for(let y=bodyTop;y<=bottom;y++)for(let x=left;x<=right;x++){
        const i=px(fx+x,fy+y);if(!original[i+3])continue;const [r,g,b]=original.slice(i,i+3),skin=r>100&&r>g*1.15&&g>b*1.15&&Math.abs(r-g)<120;
        if(skin||r<12&&g<12&&b<12)continue;
        let a=y<legTop?(parts.dress||parts.shirt):y<shoeTop?(parts.dress||parts.pants):parts.shoes;
        if(!a)continue;
        // Keep bicycle/Surf props outside the rider's torso untouched.
        if(world&&fw===32&&(Math.abs(x-cx)>5||y>=legTop))continue;
        let c=pattern(a,x-left,y-top,scale);const lum=(r+g+b)/3;c=shade(c,lum<35?.55:lum<80?.78:1);
        if(a===parts.pants&&/Short|Skirt/i.test(a.name)&&y>legTop+Math.max(1,Math.floor(h*.07)))c=skinColor;
        if(y>=legTop&&y<shoeTop&&parts.socks&&(/Short|Skirt/i.test(parts.pants?.name||'')||parts.dress)){
          const high=/OTK|Tights|Leggings/.test(parts.socks.name)?legTop:shoeTop-Math.max(1,Math.floor(h*.12));
          if(y>=high)c=pattern(parts.socks,x-left,y-top,scale);
        }
        if(y>=shoeTop&&/Boots|High Tops/.test(parts.shoes?.name||''))c=pattern(parts.shoes,x-left,y-top,scale);
        put(x,y,c);
      }
      // Dresses and skirts flare over the original trouser silhouette.
      if(skirt&&kind!=='back'&&(!world||fw===16)){
        const start=legTop-Math.max(1,Math.floor(h*.07)),end=shoeTop-Math.max(1,Math.floor(h*.05)),half=Math.max(3,Math.floor((right-left)*.3));
        for(let y=start;y<=end;y++)for(let x=Math.floor(cx-half);x<=Math.ceil(cx+half);x++)put(x,y,pattern(skirt,x-left,y-top,scale));
      }
      // Independent hat geometry and trim, placed above the retained face/hair.
      if(parts.hat){
        const a=parts.hat,c=rgb(a),hatH=Math.max(3,Math.floor(h*(/Logo|Sports|Cycling|Outdoors|Camo/.test(a.name)?.14:.19))),half=Math.max(4,Math.floor((right-left)*.36)),brim=top+hatH;
        for(let y=top;y<=brim;y++)for(let x=Math.floor(cx-half);x<=Math.ceil(cx+half);x++){
          const narrow=/Fedora|Felt|Boater/.test(a.name)?Math.floor((brim-y)/Math.max(1,hatH/2)):y===top?2:y===top+1?1:0;
          if(Math.abs(x-cx)>half-narrow)continue;
          put(x,y,pattern(a,x-left,y-top,scale));
        }
        if(!/Knit|Exotic/.test(a.name))for(let x=Math.floor(cx-half-scale);x<=Math.ceil(cx+half+scale);x++)put(x,brim,shade(c,.65));
        if(/Knit/.test(a.name))for(let x=-1;x<=1;x++)put(cx+x,top-1,shade(c,1.2));
        if(/Bamboo/.test(a.name))for(let y=top-2;y<=top+1;y++)put(cx+half,y,colors.Green);
        if(parts.accessory){const a=parts.accessory,c=rgb(a),x=Math.round(cx+half-1),y=brim-1;
          if(/Sunglasses/.test(a.name)){for(let xx=Math.floor(cx-half+1);xx<cx+half;xx++)put(xx,brim-1,c);put(cx-2*scale,brim-2,colors.Black);put(cx+2*scale,brim-2,colors.Black);}
          else if(/Ribbon/.test(a.name)){for(let xx=Math.floor(cx-half);xx<=cx+half;xx++)put(xx,brim-1,c);}
          else if(/Feather/.test(a.name)){for(let j=0;j<hatH;j++)put(x-j%2,y-j,c);}
          else{put(x,y,c);put(x-1,y,c);if(/Metal/.test(a.name)){put(x,y-1,c);put(x,y+1,c);put(x+1,y-1,c);}if(/Flower/.test(a.name)){put(x,y-1,c);put(x+1,y,c);put(x,y+1,c);put(x,y,colors.Yellow);}}
        }
      }
      if(parts.shirt&&/Logo|King|Twin|Poké Ball/.test(parts.shirt.name)&&kind!=='back'){
        const y=bodyTop+Math.max(1,Math.floor((legTop-bodyTop)/2));put(cx,y,colors.White);put(cx+1,y,colors.Black);
      }
      if(parts.shirt&&/Zipped|Tie|Jacket|Combo/.test(parts.shirt.name))for(let y=bodyTop;y<legTop;y++)put(cx,y,/Tie/.test(parts.shirt.name)?colors.Red:shade(rgb(parts.shirt),.6));
      if(parts.bag){
        const a=parts.bag,bw=Math.max(2,Math.floor((right-left)*.2)),bh=Math.max(3,Math.floor(h*.22)),x=kind==='back'?cx-bw/2:cx+Math.max(2,Math.floor((right-left)*.24)),y=bodyTop+Math.max(1,Math.floor(h*.04));
        for(let yy=0;yy<bh;yy++)for(let xx=0;xx<bw;xx++){const edge=xx===0||yy===0||xx===bw-1||yy===bh-1;put(x+xx,y+yy,edge?shade(rgb(a),.55):pattern(a,xx,yy,scale));}
        for(let yy=bodyTop;yy<y;yy++)put(x,yy,shade(rgb(a),.55));
        if(/Ribbon|Tassel/.test(a.name))put(x+bw/2,y+bh/2,colors.White);
      }
    }
    return pixels;
  }
  window.KalosFashionArt={colors,pattern,paint};
})();
