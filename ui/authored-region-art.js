// Map-specific, hand-authored, multi-tile scenery sprites.
// Artwork lives in assets/region-art/*.svg rather than being reconstructed
// from random per-cell noise. Only mount on uninterrupted blocked footprints:
// the render never changes collision, warps, events, or saved coordinates.
(function () {
  "use strict";
  const T = 16, sprites = new Map(), placements = new Map();
  const REGIONS = new Set(["galar", "alola", "paldea"]);
  const CHOICES = {
    // Galar: timber cottages, railway towns, brick industry, northern castles,
    // stadiums, the Isle of Armor and the Crown Tundra.
    GalarPostwick:"galar-cottage",
    GalarWedgehurst:"galar-station",
    GalarSlumberingWeald:"galar-fantasy",
    GalarMotostoke:"galar-industrial",
    GalarMotostokeOutskirts:"galar-industrial",
    GalarTurffield:"galar-stadium",
    GalarHulbury:"galar-station",
    GalarStowOnSide:"galar-cottage",
    GalarBallonlea:"galar-fantasy",
    GalarGlimwoodTangle:"galar-fantasy",
    GalarHammerlocke:"galar-castle",
    GalarCirchester:"galar-castle",
    GalarSpikemuth:"galar-industrial",
    GalarWyndonCity:"galar-castle",
    GalarWyndonWest:"galar-stadium",
    GalarFreezington:"galar-cottage",
    GalarFieldsOfHonor:"galar-dojo",
    GalarSoothingWetlands:"galar-fantasy",
    GalarOldCemetery:"galar-shrine",
    GalarCrownShrine:"galar-shrine",
    GalarGiantBed:"galar-shrine",
    GalarBallimereLake:"galar-shrine",
    GalarHoneycalmIsland:"galar-dojo",
    GalarFrostpointField:"galar-cottage",
    // Alola: island settlements, palm groves, the Aether facilities,
    // ancient Tapu sanctuaries, the volcano and the mountain League.
    AlolaIkiTown:"alola-hut",
    AlolaHauoliCity:"alola-hotel",
    AlolaHauoliBeach:"alola-palm",
    AlolaRoute1:"alola-palm",
    AlolaHeaheaCity:"alola-hotel",
    AlolaPaniolaTown:"alola-hut",
    AlolaPaniolaRanch:"alola-hut",
    AlolaRoyalAvenue:"alola-hotel",
    AlolaKonikoniCity:"alola-hut",
    AlolaMalieCity:"alola-hut",
    AlolaTapuVillage:"alola-hut",
    AlolaPoTown:"alola-hut",
    AlolaSeafolkVillage:"alola-hut",
    AlolaPoniWilds:"alola-palm",
    AlolaLushJungle:"alola-palm",
    AlolaUlaMeadow:"alola-palm",
    AlolaRuinsOfLife:"alola-totem",
    AlolaRuinsAbundance:"alola-totem",
    AlolaRuinsHope:"alola-totem",
    AlolaWelaVolcano:"alola-volcano",
    AlolaBlushMountain:"alola-volcano",
    AlolaAetherDock:"alola-aether",
    AlolaLanakilaBase:"alola-league",
    AlolaLanakilaSummit:"alola-league",
    AlolaPostgamePort:"alola-hotel",
    // Paldea: Mediterranean villages, Mesagoza's monumental Academy,
    // Levincia's lighting, Kitakami roofs, and Area Zero's crystalline rock.
    PaldeaCaboPoco:"paldea-adobe",
    PaldeaLosPlatos:"paldea-adobe",
    PaldeaMesagoza:"paldea-academy",
    PaldeaCortondo:"paldea-windmill",
    PaldeaArtazon:"paldea-windmill",
    PaldeaCascarrafa:"paldea-adobe",
    PaldeaLevincia:"paldea-neon",
    PaldeaMedali:"paldea-adobe",
    PaldeaMontenevera:"paldea-adobe",
    PaldeaAlfornada:"paldea-adobe",
    PaldeaGlaseado:"paldea-arena",
    PaldeaMossuiTown:"paldea-kitakami",
    PaldeaLoyaltyPlaza:"paldea-kitakami",
    PaldeaOniMountain:"paldea-crystal",
    PaldeaTerariumHub:"paldea-crystal",
    PaldeaSavannaBiome:"paldea-windmill",
    PaldeaCoastalBiome:"paldea-crystal",
    PaldeaCanyonBiome:"paldea-adobe",
    PaldeaPolarBiome:"paldea-crystal",
    PaldeaAreaZero:"paldea-crystal",
    PaldeaUnderdepths:"paldea-crystal",
    PaldeaLeagueGate:"paldea-arena",
    PaldeaZeroLab:"paldea-crystal",
    PaldeaAppleHills:"paldea-kitakami"
  };
  const WORLD = window.WORLD_MAPS;
  function choice(m) {
    if (!m || !REGIONS.has(m.region)) return null;
    if (CHOICES[m.name]) return CHOICES[m.name];
    // Support new map chapters without borrowing an unrelated region's art.
    // Never put an outdoor building facade inside an interior room.
    const interior = !!(m.galarCustomLayout?.interior ||
      m.alolaCustomLayout?.interior || m.paldeaLayout?.interior);
    if (interior) return null;
    const name = m.name || "";
    if (m.region === "galar") {
      if (/Town|Village|Station|Postwick|Wedgehurst|Freezington/.test(name)) return "galar-cottage";
      if (/City|Wyndon|Hammerlocke/.test(name)) return "galar-castle";
      if (/Forest|Weald|Glimwood/.test(name)) return "galar-fantasy";
      return null;
    }
    if (m.region === "alola") {
      if (/Town|Village|City/.test(name)) return "alola-hut";
      if (/Ruins|Altar/.test(name)) return "alola-totem";
      return null;
    }
    if (/Town|Village|City/.test(name)) return "paldea-adobe";
    if (/AreaZero|Crater|Underdepths/.test(name)) return "paldea-crystal";
    return null;
  }
  function reserved(m) {
    const coords = [
      ...(m.warps || []), ...(m.people || []), ...(m.signs || []),
      ...(m.triggers || []), ...(m.hidden || [])
    ].filter(a => Number.isInteger(a.x) && Number.isInteger(a.y));
    return new Set(coords.flatMap(a => {
      const occupied = [];
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++)
        if (a.x+dx>=0 && a.x+dx<m.width && a.y+dy>=0 && a.y+dy<m.height)
          occupied.push((a.y+dy)*m.width + a.x+dx);
      return occupied;
    }));
  }
  function chooseFootprint(m) {
    if (!m || !Array.isArray(m.collision) ||
      m.collision.length !== m.width*m.height) return null;
    const excluded=reserved(m);
    const solid = (x,y) => {
      if (x<2 || y<2 || x>=m.width-2 || y>=m.height-2) return false;
      const i=y*m.width+x;
      return m.collision[i] && !excluded.has(i) && m.behavior?.[i] !== 0x10;
    };
    const sizes=[[6,4],[5,4],[5,3],[4,3],[3,3],[4,2],[3,2],[2,2]];
    const cx=m.width/2,cy=m.height/2;
    for (const [w,h] of sizes) {
      let best=null;
      for (let y=2;y<=m.height-h-2;y++) for(let x=2;x<=m.width-w-2;x++) {
        let clear=true;
        for(let yy=y;clear&&yy<y+h;yy++)
          for(let xx=x;xx<x+w;xx++)if(!solid(xx,yy)){clear=false;break;}
        if(!clear)continue;
        // This is architecture in the world, so keep it near the player's
        // walkable central square without covering that square.
        const d=Math.abs(x+w/2-cx)+Math.abs(y+h/2-cy);
        const score=d + y*0.001 + x*0.0001;
        if(!best||score<best.score)best={x,y,w,h,score};
      }
      if(best)return{x:best.x,y:best.y,w:best.w,h:best.h};
    }
    return null;
  }
  function plan(name) {
    const m=window.WORLD_MAPS?.[name];
    if(!m)return null;
    if(placements.has(name))return placements.get(name);
    const asset=choice(m),box=asset?chooseFootprint(m):null;
    const result=box ? {...box,asset,region:m.region} : null;
    placements.set(name,result);
    return result;
  }
  function getSprite(asset) {
    if(!sprites.has(asset)){
      const img=new Image();
      img.src="assets/region-art/"+asset+".svg";
      sprites.set(asset,img);
    }
    return sprites.get(asset);
  }
  function draw(g,name,x,y) {
    const p=plan(name);if(!p)return;
    const img=getSprite(p.asset);
    if(!img.complete || !img.naturalWidth)return;
    g.drawImage(img,x+p.x*T,y+p.y*T,p.w*T,p.h*T);
  }
  window.AuthoredRegionArt={draw,plan,choice,chooseFootprint,CHOICES,
    clear:()=>placements.clear()};
})();