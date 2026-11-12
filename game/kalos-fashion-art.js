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
  const badges={R:['110','101','110','101','101'],A:['010','101','111','101','101'],M:['101','111','111','101','101'],G:['111','100','101','101','111'],P:['110','101','110','100','100'],F:['111','100','110','100','100'],C:['111','100','100','100','111'],S:['111','100','111','001','111']};
  // The pieces are fitted to the character as drawn, not to the picture's box (an arm held out, a Poké Ball in
  // the hand): a hat is the character's own cap in the hat's colours, a bag their own backpack, a top what's worn
  // from the collar to the belt, trousers from where the jeans start, a skirt across the legs as wide as they stand.
  const neutral=(r,g,b)=>Math.abs(r-g)<14&&Math.abs(g-b)<14&&Math.abs(r-b)<14,grey=(r,g,b)=>neutral(r,g,b)&&r+g+b>=84&&r+g+b<=300;
  const jeans=(r,g,b)=>g>90&&b>g+20&&r<g,red=(r,g,b)=>r>150&&g<90&&b<90;
  function paint(pixels,width,height,clothing,kind='front',tone) {
    const F=window.KalosFashion;if(!clothing||!F)return pixels;
    const parts=Object.fromEntries(Object.entries(clothing).filter(([k])=>k!=='underDress').map(([k,id])=>[k,F.item(id)]));
    const fw=kind.startsWith('world:')?(/_(?:bike|surf|ride|fish|wheelie)/.test(kind)?32:16):64,fh=kind==='back'?64:kind.startsWith('world:')?32:height;
    const original=new Uint8ClampedArray(pixels),px=(x,y)=>((y*width+x)*4);
    for(let fy=0;fy<height;fy+=fh)for(let fx=0;fx<width;fx+=fw){
      const at=(x,y)=>original.subarray(px(fx+x,fy+y),px(fx+x,fy+y)+4),solid=(x,y)=>x>=0&&y>=0&&x<fw&&y<fh&&fx+x<width&&fy+y<height&&original[px(fx+x,fy+y)+3]>0;
      let top=fh,left=fw,right=0,bottom=0,coatTop=fh,redX=0,redN=0;const rows=[];
      for(let y=0;y<fh&&fy+y<height;y++)for(let x=0;x<fw&&fx+x<width;x++)if(solid(x,y)){const [r,g,b]=at(x,y);if(red(r,g,b)){rows[y]=(rows[y]||0)+1;redX+=x;redN++;}top=Math.min(top,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);}
      if(top>=bottom)continue;
      // (The head's top: the first row with some width to it, not a fishing rod's tip.)
      for(let y=top;y<bottom;y++){let n=0;for(let x=left;x<=right;x++)if(solid(x,y))n++;if(n>=4){top=y;break;}}
      // (The shirt's first row: a row with some red in it, not a red pixel of the face's shading.)
      for(let y=0;y<fh;y++)if(rows[y]>=(fw===64?3:2)){coatTop=y;break;}
      const world=kind.startsWith('world:'),back=kind==='back',h=bottom-top+1,scale=world?1:2;
      // (The body's middle: the shirt's, wherever the arms are.)
      const cx=redN?Math.round(redX/redN):Math.round((left+right)/2);
      const bodyTop=back&&coatTop<fh?Math.max(top,coatTop-1):Math.min(coatTop,top+Math.floor(h*(back?.51:.52)));
      // (The legs: from the first row of jeans; none in the back picture, cut off at the waist.)
      let legTop=back?bottom+1:top+Math.floor(h*.76);
      if(!back)for(let y=bodyTop;y<=bottom;y++){let n=0;for(let x=left;x<=right;x++)if(solid(x,y)&&jeans(...at(x,y)))n++;if(n>=2){legTop=y;break;}}
      const shoeTop=back?bottom+1:Math.max(legTop+1,bottom-Math.max(1,Math.floor(h*.1)));
      const legPiece=parts.dress||parts.pants,skirt=parts.dress||(/Skirt|Kilt/i.test(parts.pants?.name||'')?parts.pants:null),bare=!!legPiece&&(!!skirt||/Short/i.test(legPiece.name));
      const hem=Math.min(shoeTop-1,legTop+Math.max(1,Math.floor((shoeTop-legTop)*(skirt?.45:.3))));
      const put=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(!c||x<0||x>=fw||y<0||y>=fh||fx+x>=width||fy+y>=height)return;const i=px(fx+x,fy+y);pixels.set([...c,255],i);};
      const lit=(c,r,g,b)=>{const lum=(r+g+b)/3;return shade(c,lum<35?.55:lum<52?.72:lum<70?.86:1);};
      const skinColor=tone||[222,148,115];
      // The cap: the dark greys of the head; the backpack: those of the body.
      const capEnd=Math.min(bodyTop,top+Math.floor(h*(back?.34:world?.37:.2))),cap=[],pack=[];
      for(let y=top;y<(back?bottom+1:legTop);y++)for(let x=left;x<=right;x++){
        if(!solid(x,y)||(world&&fw===32&&Math.abs(x-cx)>6))continue;const [r,g,b]=at(x,y);if(!grey(r,g,b))continue;
        if(y<capEnd)cap.push([x,y]);else if(y>=bodyTop)pack.push([x,y]);
      }
      const isPack=new Set(pack.map(([x,y])=>y*fw+x));
      for(let y=bodyTop;y<=bottom;y++)for(let x=left;x<=right;x++){
        if(!solid(x,y))continue;const [r,g,b]=at(x,y),skin=r>100&&r>g*1.15&&g>b*1.15&&Math.abs(r-g)<120;
        if(skin||r<12&&g<12&&b<12||isPack.has(y*fw+x))continue;
        const a=y<legTop?(parts.dress||parts.shirt):y<shoeTop?legPiece:parts.shoes;
        if(!a)continue;
        // Keep bicycle/Surf props outside the rider's torso untouched.
        if(world&&fw===32&&(Math.abs(x-cx)>5||y>=legTop))continue;
        let c=lit(pattern(a,x-left,y-top,scale),r,g,b);
        if(y>=legTop&&y<shoeTop&&bare&&y>hem){
          c=skinColor;
          if(parts.socks){const high=/OTK|Tights|Leggings/.test(parts.socks.name)?hem+1:shoeTop-Math.max(1,Math.ceil((shoeTop-hem)*.5));if(y>=high)c=lit(pattern(parts.socks,x-left,y-top,scale),r,g,b);}
        }
        if(y>=shoeTop&&/Boots|High Tops/.test(parts.shoes?.name||''))c=pattern(parts.shoes,x-left,y-top,scale);
        put(x,y,c);
      }
      // Dresses and skirts: across the legs, from the belt to the hem, a little wider as they fall.
      if(skirt&&!back&&(!world||fw===16)){
        const reach=Math.max(4,Math.floor(h*.24));
        for(let y=legTop;y<=hem;y++){
          let a=fw,b=-1;for(let x=Math.max(left,cx-reach);x<=Math.min(right,cx+reach);x++)if(solid(x,y)){a=Math.min(a,x);b=Math.max(b,x);}
          if(b<0)continue;const flare=world?(y===hem?1:0):Math.round((y-legTop)/Math.max(1,hem-legTop));
          for(let x=a-flare;x<=b+flare;x++)put(x,y,x===a-flare||x===b+flare?shade(pattern(skirt,x-left,y-top,scale),.6):pattern(skirt,x-left,y-top,scale));
        }
      }
      // The hat: the cap itself, in the hat's colours; its kind in its trim.
      if(parts.hat&&cap.length){
        const a=parts.hat,c=rgb(a),xs=cap.map(v=>v[0]),ys=cap.map(v=>v[1]),cl=Math.min(...xs),cr=Math.max(...xs),ct=Math.min(...ys),cb=Math.max(...ys),hx=Math.round((cl+cr)/2);
        const band=/Fedora|Felt|Boater|Bamboo/.test(a.name)?ct+Math.round((cb-ct)*.6):-1;
        for(const [x,y]of cap){const [r,g,b]=at(x,y);put(x,y,y===band?shade(c,.5):lit(pattern(a,x-cl,y-ct,scale),r,g,b));}
        // (A brimmed hat's brim: a pixel or two past the cap each side, where there's nothing of the character.)
        if(band>=0)for(let d=1;d<=scale;d++)for(const x of [cl-d,cr+d])if(!solid(x,cb))put(x,cb,shade(c,.65));
        if(/Knit/.test(a.name)&&ct>0)for(let x=-1;x<=1;x++)if(!solid(hx+x,ct-1))put(hx+x,ct-1,shade(c,1.2));
        // (Trim that stands on the cap: on the cap's own top pixel in its column.)
        const stand=(x,c)=>{const col=cap.filter(v=>v[0]===x).map(v=>v[1]);if(col.length&&Math.min(...col)>0)put(x,Math.min(...col)-1,c);};
        if(/Bamboo/.test(a.name))stand(cr-scale,colors.Green);
        if(a.faction==='magma')for(const x of [cl+2*scale,cr-2*scale])stand(x,c);
        if(parts.accessory){const a=parts.accessory,c=rgb(a),x=cr-1,y=cb-1;
          if(/Sunglasses|Ribbon/.test(a.name)){for(const [xx,yy]of cap)if(yy===cb-1)put(xx,yy,c);}
          else if(/Feather/.test(a.name)){for(let j=0;j<Math.min(cb-ct,3*scale);j++)put(x-j%2,y-j,c);}
          else{put(x,y,c);put(x-1,y,c);if(/Metal/.test(a.name))put(x,y-1,c);if(/Flower/.test(a.name)){put(x,y-1,c);put(x-1,y-1,c);put(x,y,colors.Yellow);}}
        }
      }
      if(parts.shirt&&/Logo|King|Twin|Poké Ball/.test(parts.shirt.name)&&!back){
        const y=bodyTop+Math.max(1,Math.floor((legTop-bodyTop)/2));put(cx,y,colors.White);put(cx+1,y,colors.Black);
      }
      if(parts.shirt&&/Zipped|Tie|Jacket|Combo/.test(parts.shirt.name)&&!back)for(let y=bodyTop;y<legTop;y++)if(solid(cx,y)&&!isPack.has(y*fw+cx))put(cx,y,/Tie/.test(parts.shirt.name)?colors.Red:shade(rgb(parts.shirt),.6));
      // The bag: the backpack itself, in the bag's colours.
      if(parts.bag&&pack.length){
        const a=parts.bag,xs=pack.map(v=>v[0]),ys=pack.map(v=>v[1]),bl=Math.min(...xs),bt=Math.min(...ys);
        for(const [x,y]of pack){const [r,g,b]=at(x,y);put(x,y,lit(pattern(a,x-bl,y-bt,scale),r,g,b));}
        if(/Ribbon|Tassel/.test(a.name)){const [x,y]=pack[pack.length>>1];put(x,y,colors.White);}
      }
      const brand=back&&parts.bag?.faction?parts.bag:parts.shirt;
      if(brand?.faction&&badges[brand.symbol]){
        const rows=badges[brand.symbol],zoneEnd=Math.min(legTop,bottom+1),available=Math.max(3,zoneEnd-bodyTop-1),size=world?1:Math.max(1,Math.min(2,Math.floor(available/5))),height=Math.min(5*size,available),width=3*size,x0=Math.round(cx-width/2),y0=bodyTop+Math.max(0,Math.floor((zoneEnd-bodyTop-height)/2));
        for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(rows[Math.min(4,Math.floor(y*5/height))][Math.floor(x/size)]==='1')put(x0+x,y0+y,brand.ink);
      }
    }
    return pixels;
  }
  window.KalosFashionArt={colors,pattern,paint};
})();
