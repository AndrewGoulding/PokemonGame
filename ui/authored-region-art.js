// Map-specific, hand-authored, multi-tile scenery sprites.
// Artwork lives in assets/region-art/*.svg rather than being reconstructed
// from random per-cell noise. Only mount on uninterrupted blocked footprints:
// the render never changes collision, warps, events, or saved coordinates.
(function () {
  "use strict";
  const T = 16, sprites = new Map(), placements = new Map();
  const REGIONS = new Set(["orre", "sinnoh", "unova", "kalos", "galar", "alola", "paldea"]);
  const CHOICES = {
    // The original 2D regions keep their existing map pictures. These authored
    // additions are limited to named landmark footprints, never a blanket
    // replacement of the imported Kanto/Johto/Hoenn-quality tile art.
    PhenacCity:"orre-fountain",
    PyriteTown:"orre-windmill",
    AgateVillage:"orre-agate-tree",
    MtBattle:"orre-mtbattle-gantry",
    RealgamTower_Exterior:"orre-realgam-dome",
    SnowpointCity:"sinnoh-shrine",
    FloaromaTown:"sinnoh-flower-house",
    SpearPillar:"sinnoh-spear-pillar",
    CanalaveCity:"sinnoh-canalave-bridge",
    EternaForest:"sinnoh-eterna-forest",
    UnovaNimbasaCity:"unova-ferris",
    UnovaDriftveilCity:"unova-driftveil-crane",
    UnovaOpelucidCity:"unova-opelucid-towers",
    KalosLaverreCity:"kalos-garden",
    KalosShalourCity:"kalos-shalour-tower",
    KalosGeosengeTown:"kalos-geosenge-stones",
    KalosSnowbelleCity:"kalos-snowbelle-chalet",
    // Galar: timber cottages, railway towns, brick industry, northern castles,
    // stadiums, the Isle of Armor and the Crown Tundra.
    GalarPostwick:"galar-cottage",
    GalarWedgehurst:"galar-station",
    GalarSlumberingWeald:"galar-fantasy",
    GalarMotostoke:"galar-industrial",
    GalarMotostokeOutskirts:"galar-industrial",
    GalarTurffield:"galar-turffield-glyph",
    GalarHulbury:"galar-station",
    GalarStowOnSide:"galar-cottage",
    GalarBallonlea:"galar-ballonlea-shrooms",
    GalarGlimwoodTangle:"galar-fantasy",
    GalarHammerlocke:"galar-castle",
    GalarCirchester:"galar-castle",
    GalarSpikemuth:"galar-industrial",
    GalarWyndonCity:"galar-wyndon-clock",
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
    AlolaMalieCity:"alola-malie-pagoda",
    AlolaTapuVillage:"alola-hut",
    AlolaPoTown:"alola-po-town",
    AlolaSeafolkVillage:"alola-seafolk-boat",
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
    PaldeaCascarrafa:"paldea-cascarrafa-terraces",
    PaldeaLevincia:"paldea-neon",
    PaldeaMedali:"paldea-adobe",
    PaldeaMontenevera:"paldea-adobe",
    PaldeaAlfornada:"paldea-adobe",
    PaldeaGlaseado:"paldea-glaseado-peak",
    PaldeaMossuiTown:"paldea-kitakami-shrine",
    PaldeaLoyaltyPlaza:"paldea-kitakami",
    PaldeaOniMountain:"paldea-crystal",
    PaldeaTerariumHub:"paldea-crystal",
    PaldeaSavannaBiome:"paldea-windmill",
    PaldeaCoastalBiome:"paldea-crystal",
    PaldeaCanyonBiome:"paldea-adobe",
    PaldeaPolarBiome:"paldea-crystal",
    PaldeaZeroLab:"paldea-area-zero-lab",
    PaldeaUnderdepths:"paldea-crystal",
    PaldeaLeagueGate:"paldea-arena",
    PaldeaAppleHills:"paldea-kitakami"
  };
  const WORLD = window.WORLD_MAPS;
  function choice(m) {
    // Cities with a full street plan (data/city-layouts.js) carry their own landmarks.
    if (!m || !REGIONS.has(m.region) || m.cityLayout) return null;
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
    if (m.region !== "paldea") return null;
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
  function footprintIntact(m,p) {
    if(!m||!p)return false;
    for(let yy=p.y;yy<p.y+p.h;yy++)
      for(let xx=p.x;xx<p.x+p.w;xx++)
        if(!m.collision[yy*m.width+xx] || m.behavior?.[yy*m.width+xx]===0x10)
          return false;
    return true;
  }
  function draw(g,name,x,y) {
    let p=plan(name);if(!p)return;
    const m=window.WORLD_MAPS?.[name];
    // Story scripts sometimes open a previously-solid door. Never leave
    // scenery floating over a now-walkable entrance after that change.
    if(!footprintIntact(m,p)) {
      placements.delete(name);
      p=plan(name);
      if(!p)return;
    }
    const img=getSprite(p.asset);
    if(!img.complete || !img.naturalWidth)return;
    g.drawImage(img,x+p.x*T,y+p.y*T,p.w*T,p.h*T);
  }
  function imageStatus(name) {
    const p=plan(name);
    if (!p) return null;
    const img=sprites.get(p.asset);
    return {asset:p.asset, x:p.x, y:p.y, w:p.w, h:p.h,
      requested:!!img, ready:!!(img?.complete && img.naturalWidth)};
  }
  window.AuthoredRegionArt={draw,plan,choice,chooseFootprint,footprintIntact,imageStatus,CHOICES,
    clear:()=>placements.clear()};
})();