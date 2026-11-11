// Palette-based customization of the project's existing protagonist. NPCs and Wes retain their own art.
//
// The player's look: hair, skin and eye colors, chosen in Oak's speech (player.appearance, ui/intro.js), with the
// clothes the fashion systems put on (Kalos's outfits and its 307 X/Y pieces, game/kalos-fashion.js, kept in
// player.flags.kalos.activities.appearance, whose salon's hair color and skin tone win when they're set).
//
//   CharacterStyle.HAIR / SKIN / EYES   // key -> { name, rgb } (rgb null: the sprite's own)
//   CharacterStyle.appearance(p)        // { outfit, hair, skin, eyes, clothing? }
//   CharacterStyle.render(img, p)       // the sprite (or a canvas of it) in p's look
//   CharacterStyle.url(src, p)          // the same, as a URL
//
// Each of the player's sprites has its own palette (the Oak's-speech portrait, the battle front and back, the
// overworld sheets): its shades of each part are listed below, each with how dark it is of the part's color. The
// eyes are the same near-black as the outline, so they're found by where they are: dark pixels in the face, above
// the shirt, between skin or the whites of the eyes.
(function(){'use strict';
 const HAIR={original:{name:'Silver',rgb:null},black:{name:'Black',rgb:[36,29,31]},brown:{name:'Brown',rgb:[111,69,40]},blond:{name:'Blond',rgb:[226,190,104]},
  orange:{name:'Orange',rgb:[204,108,42]},honey:{name:'Honey',rgb:[176,131,57]},red:{name:'Red',rgb:[184,40,40]},pink:{name:'Pink',rgb:[236,128,170]},
  purple:{name:'Purple',rgb:[120,72,168]},blue:{name:'Blue',rgb:[56,96,200]},green:{name:'Green',rgb:[60,150,84]},white:{name:'White',rgb:[244,240,236]}};
 const SKIN={original:{name:'Original',rgb:null},fair:{name:'Fair',rgb:[255,214,180]},light:{name:'Light',rgb:[245,196,156]},tan:{name:'Tan',rgb:[211,151,105]},
  brown:{name:'Brown',rgb:[168,110,72]},deep:{name:'Deep',rgb:[118,74,52]}};
 const EYES={original:{name:'Dark',rgb:null},brown:{name:'Brown',rgb:[110,62,30]},hazel:{name:'Hazel',rgb:[140,110,48]},blue:{name:'Blue',rgb:[40,96,210]},
  green:{name:'Green',rgb:[36,140,70]},grey:{name:'Grey',rgb:[120,128,140]},red:{name:'Red',rgb:[190,30,40]},purple:{name:'Purple',rgb:[128,60,180]},gold:{name:'Gold',rgb:[214,168,40]}};
 // The shades of each part, across the sprites: [r,g,b] -> how dark of the part's color.
 const HAIR_SHADES={'235,225,215':1,'235,220,203':1,'216,206,198':.94,'216,201,191':.94,'196,186,180':.86,'150,140,140':.62,'150,145,150':.62};
 const SKIN_SHADES={'255,230,205':1,'255,230,180':1,'255,197,148':1,'232,179,149':.95,'230,189,156':.93,'222,189,156':.9,'222,148,115':.85,'205,148,115':.8,
  '197,148,131':.78,'163,117,111':.65,'148,106,90':.6,'106,74,65':.42};
 const OUTFIT_SHADES={'222,66,63':1,'180,52,50':.8,'106,47,46':.5};
 const SKINLIKE=new Set(Object.keys(SKIN_SHADES).concat(['255,255,255','238,238,255','222,222,222','235,225,215']));
 const SHIRT=new Set(['222,66,63','180,52,50']),WHITES=new Set(['255,255,255','238,238,255']);
 const cache=new WeakMap(),sources=new Map();
 const ORIGINAL={outfit:'original',hair:'original',skin:'original',eyes:'original'};
 function appearance(p){
  const own=p?.appearance||{},kalos=p?.flags?.kalos?.activities?.appearance||{},out={...ORIGINAL,...own};
  for(const k of ['outfit','hair','skin'])if(kalos[k]&&kalos[k]!=='original')out[k]=kalos[k];
  if(kalos.clothing){out.clothing=kalos.clothing;if(kalos.collection)out.collection=kalos.collection;}
  return out;
 }
 const plain=(a)=>!a.clothing&&['outfit','hair','skin','eyes'].every(k=>!a[k]||a[k]==='original');
 const rgbOf=(table,kalosTable,key)=>table[key]?.rgb||window.KalosActivities?.[kalosTable]?.[key]?.rgb||null;
 // (The frames a sheet is cut into, for finding each one's face: the overworld's 16 wide, the battle back's 64 tall.)
 function frames(w,h){if(h===32&&w%16===0)return Array.from({length:w/16},(_,i)=>[i*16,0,16,32]);if(w===64&&h>64&&h%64===0)return Array.from({length:h/64},(_,i)=>[0,i*64,64,64]);return[[0,0,w,h]];}
 function eyePixels(d,w,h){
  const key=(i)=>d[i]+','+d[i+1]+','+d[i+2],out=[];
  for(const [fx,fy,fw,fh] of frames(w,h)){
   // (The eyes sit beside the hair that frames the face: in a big picture, no lower than half way down it; in an
   // overworld frame, a row below its last. And above the shirt.)
   let top=fy+fh,h0=-1,h1=-1;
   for(let y=fy;y<fy+fh;y++)for(let x=fx;x<fx+fw;x++){const i=(y*w+x)*4;if(!d[i+3])continue;const k=key(i);
    if(top===fy+fh&&SHIRT.has(k))top=y;if(HAIR_SHADES[k]){if(h0<0)h0=y;h1=y;}}
   if(h0<0)continue;
   const last=Math.min(top-1,fh<=32?h1+1:Math.floor((h0+h1)/2));
   for(let y=Math.max(fy+1,h0);y<=last;y++)for(let x=fx+1;x<fx+fw-1;x++){
    const i=(y*w+x)*4;if(!d[i+3]||d[i]+d[i+1]+d[i+2]>120)continue;
    const n=[i-4,i+4,i-w*4,i+w*4];if(n.some(j=>!d[j+3]))continue;
    // (In a big picture an eye's beside its white; in a little overworld one, between skin.)
    if(fh>32?n.some(j=>WHITES.has(key(j)))&&n.filter(j=>SKINLIKE.has(key(j))).length>=2:n.filter(j=>SKIN_SHADES[key(j)]).length>=2)out.push(i);
   }
  }
  return out;
 }
 function render(img,p){
  if(!p||p.look!=='custom'||!img.complete||!img.naturalWidth||typeof document==='undefined')return img;
  const a=appearance(p),key=JSON.stringify(a);if(plain(a))return img;
  let styles=cache.get(img);if(!styles){styles=new Map();cache.set(img,styles);}if(styles.has(key))return styles.get(key);
  const A=window.KalosActivities,outfit=a.clothing?null:A?.outfits?.[a.outfit]?.rgb,hair=rgbOf(HAIR,'hair',a.hair),skin=rgbOf(SKIN,'skin',a.skin),eyes=EYES[a.eyes]?.rgb;
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext('2d');g.drawImage(img,0,0);
  let d;try{d=g.getImageData(0,0,c.width,c.height);}catch{return img;}
  // (The eyes first, before the skin round them changes.)
  const eyeAt=eyes?eyePixels(d.data,c.width,c.height):[];
  for(let i=0;i<d.data.length;i+=4){
   if(!d.data[i+3])continue;const k=d.data[i]+','+d.data[i+1]+','+d.data[i+2];
   const change=(HAIR_SHADES[k]&&hair&&[hair,HAIR_SHADES[k]])||(SKIN_SHADES[k]&&skin&&[skin,SKIN_SHADES[k]])||(OUTFIT_SHADES[k]&&outfit&&[outfit,OUTFIT_SHADES[k]]);
   if(change)for(let j=0;j<3;j++)d.data[i+j]=Math.min(255,Math.round(change[0][j]*change[1]));
  }
  for(const i of eyeAt)for(let j=0;j<3;j++)d.data[i+j]=eyes[j];
  if(a.clothing&&window.KalosFashionArt){const src=img.src||'',kind=src.includes('/world/')?'world:'+src.split('/').pop():src.includes('/back/')?'back':'front';KalosFashionArt.paint(d.data,c.width,c.height,a.clothing,kind,skin);}
  g.putImageData(d,0,0);c.complete=true;c.naturalWidth=c.width;c.naturalHeight=c.height;c.loaded=Promise.resolve();
  if(styles.size>=8)styles.delete(styles.keys().next().value);styles.set(key,c);return c;
 }
 async function url(src,p){if(p?.look!=='custom'||plain(appearance(p)))return src;let img=sources.get(src);if(!img){img=new Image();img.loaded=new Promise(resolve=>{img.onload=img.onerror=resolve;});img.src=src;sources.set(src,img);}await img.loaded;const styled=render(img,p);return styled===img?src:styled.toDataURL();}
 window.CharacterStyle={HAIR,SKIN,EYES,appearance,render,url};})();
