// Civic surface embellishments for the 2D recreations of Unova and Kalos.
// These are low-opacity floor inlays (paving, mosaics and curb edging), NOT
// objects: no extra barriers, no covered signs or doors, no save changes.
(function () {
  "use strict";
  const T = 16, cache = new Map();
  const THEMES = {
    nimbasa: { stone:"#8ca1ab", seam:"#5e8795", accent:"#e1b955", light:"#f9e6a8" },
    castelia: { stone:"#a4a5aa", seam:"#757d85", accent:"#bd9190", light:"#dbe4dd" },
    driftveil: { stone:"#a5aba3", seam:"#6b8d94", accent:"#c3a770", light:"#e7d9a6" },
    opelucid: { stone:"#9d95b4", seam:"#77769a", accent:"#bbb9d6", light:"#e9e3f1" },
    lumiose: { stone:"#c6aa85", seam:"#8f806c", accent:"#ad7896", light:"#f4e0b0" },
    laverre: { stone:"#acb99c", seam:"#778d79", accent:"#c3a0bd", light:"#f2dfb7" }
  };
  function style(m) {
    if (!m || m.type === "indoor") return null;
    const n = m.name || "";
    if (m.region === "unova") {
      if (/NimbasaCity/.test(n)) return "nimbasa";
      if (/CasteliaCity/.test(n)) return "castelia";
      if (/DriftveilCity/.test(n)) return "driftveil";
      if (/OpelucidCity/.test(n)) return "opelucid";
    }
    if (m.region === "kalos") {
      if (/Lumiose(South|North|City|Plaza|Square|Boulevard)/.test(n)) return "lumiose";
      if (/LaverreCity/.test(n)) return "laverre";
    }
    return null;
  }
  function hash(x,y,seed) {
    let n = (Math.imul(x+19,374761393)+Math.imul(y+31,668265263)+
      Math.imul(seed+3,1442695041))>>>0;
    n=Math.imul(n^(n>>>13),1274126177)>>>0;
    return(n^(n>>>16))>>>0;
  }
  function make(m) {
    const canvas = document.createElement("canvas");
    canvas.width = m.width * T; canvas.height = m.height * T;
    const g = canvas.getContext("2d");
    const kind = style(m), p = THEMES[kind];
    const cx = Math.floor(m.width/2), cy = Math.floor(m.height/2);
    const occupied = new Set([...(m.warps||[]),...(m.people||[]),
      ...(m.signs||[]),...(m.triggers||[]),...(m.hidden||[])]
      .filter(a => Number.isInteger(a.x) && Number.isInteger(a.y))
      .map(a => a.y*m.width+a.x));
    const open = (x,y) => x>=0&&y>=0&&x<m.width&&y<m.height&&
      !m.collision[y*m.width+x];
    const paint=(color,x,y,w,h,alpha=1)=>{
      g.globalAlpha=alpha;g.fillStyle=color;g.fillRect(x,y,w,h);
    };
    let detailTiles=0;
    for (let y=1;y<m.height-1;y++) for(let x=1;x<m.width-1;x++){
      const i=y*m.width+x;
      if (!open(x,y) || occupied.has(i) || m.behavior[i]===0x10 ||
        m.behavior[i]===2) continue;
      const r=hash(x,y,m.name.length), px=x*T,py=y*T;
      // The source pictures remain dominant: inlays use only a fraction
      // of the pixel cell and low opacity, never opaque repainting.
      if(kind==="nimbasa" || kind==="opelucid"){
        if(x%4===0)paint(p.seam,px+1,py,1,T,0.22);
        if(y%4===0)paint(p.stone,px,py+1,T,1,0.23);
        if(r%29===0){
          paint(p.accent,px+5,py+5,6,6,0.43);
          paint(p.light,px+7,py+3,2,10,0.6);
          paint(p.light,px+3,py+7,10,2,0.6);
        }
      } else if(kind==="castelia" || kind==="driftveil"){
        if(x%5===0)paint(p.seam,px,py+3,1,10,0.18);
        if(y%6===0)paint(p.stone,px+2,py,12,1,0.2);
        if(r%37===0){
          paint(p.seam,px+5,py+5,6,6,0.3);
          paint(p.light,px+7,py+5,2,6,0.5);
        }
      } else if(kind==="lumiose"){
        if(r%17===0){
          paint(p.stone,px+3,py+3,10,10,0.26);
          paint(p.light,px+5,py+5,6,6,0.38);
          paint(p.accent,px+7,py+4,2,8,0.26);
        }
      } else if(kind==="laverre"){
        if(r%13===0){
          paint(p.accent,px+7,py+4,2,8,0.34);
          paint(p.accent,px+4,py+7,8,2,0.34);
          paint(p.light,px+7,py+7,2,2,0.55);
        }
      }
      // A one-pixel curb shadow clarifies where a structure's solid
      // footprint meets a traversable tile, without drawing a fake wall.
      if(open(x,y) && !open(x,y-1))
        paint(p.seam,px+1,py+1,14,1,0.25);
      if(open(x,y) && !open(x-1,y))
        paint(p.seam,px+1,py+2,1,12,0.17);
      detailTiles++;
    }
    // Distinctive ground mosaics in the two major public squares. Draw only
    // on traversable non-event cells; users can still walk across every pixel.
    if(kind==="nimbasa" || kind==="lumiose"){
      for(let y=Math.max(2,cy-4);y<=Math.min(m.height-3,cy+4);y++)
        for(let x=Math.max(2,cx-4);x<=Math.min(m.width-3,cx+4);x++){
          if(!open(x,y)||occupied.has(y*m.width+x))continue;
          const dx=x-cx,dy=y-cy,r2=dx*dx+dy*dy;
          if(r2>=8&&r2<=18){
            paint(p.accent,x*T+5,y*T+5,6,6,0.38);
            paint(p.light,x*T+7,y*T+6,2,4,0.48);
          }else if((dx===0||dy===0)&&r2<=4){
            paint(p.accent,x*T+4,y*T+4,8,8,0.32);
            paint(p.light,x*T+6,y*T+6,4,4,0.45);
          }
        }
    }
    g.globalAlpha=1;
    return {canvas, detailTiles};
  }
  function draw(g,name,x,y){
    const m=window.WORLD_MAPS?.[name],kind=style(m);
    if(!kind||!m?.collision||!m.behavior)return;
    let item=cache.get(name);
    if(!item){item=make(m);cache.set(name,item);}
    g.drawImage(item.canvas,x,y);
  }
  window.CivicMapArt={draw,style,themes:THEMES,clear:()=>cache.clear()};
})();
