// Restrained, map-specific environmental animation for the four source-art regions.
// Complements their authored PNGs without changing collisions, warps or NPCs.
// Drawn after the base map and before characters; only visible tiles are visited.
(function () {
  "use strict";
  const TILE = 16;
  const regions = new Set(["orre", "sinnoh", "unova", "kalos"]);
  function theme(m) {
    const name = m.name || "";
    const region = m.region || (/^(Platinum|Sinnoh)/.test(name) ? "sinnoh" : "");
    if (!regions.has(region) || m.cityLayout) return null;
    if (region === "orre") {
      if (/Phenac|Agate|RelicForest/.test(name)) return "spring";
      if (/Pyrite|Under|Realgam|Outskirt/.test(name)) return "embers";
      return "dust";
    }
    if (region === "sinnoh") {
      if (/Floaroma|Flower|EternaForest|Meadow|FlowerParadise/.test(name)) return "pollen";
      if (/Snowpoint|Route216|Route217|Acuity|MtCoronet|SpearPillar/.test(name)) return "frost";
      if (/Pastoria|Sunyshore|Canalave|IronIsland/.test(name)) return "glitter";
      return null;
    }
    if (region === "unova") {
      if (/Nimbasa|Castelia|BlackCity|JoinAvenue|Pokestar/.test(name)) return "neon";
      if (/Driftveil|Virbank|Humilau|Undella|Marine|Seaside/.test(name)) return "glitter";
      if (/Lostlorn|Pinwheel|WhiteForest|Floccesy|VillageBridge/.test(name)) return "pollen";
      if (/TwistMountain|GiantChasm|Lacunosa/.test(name)) return "frost";
      return null;
    }
    if (/Lumiose|PrismTower/.test(name)) return "lamps";
    if (/Laverre|Parfum|Route4|Route7|SantaluneForest|WindingWoods/.test(name)) return "pollen";
    if (/ReflectionCave|GlitteringCave|TerminusCave/.test(name)) return "crystal";
    if (/Cyllage|Shalour|AzureBay|Coumarine/.test(name)) return "glitter";
    return null;
  }
  function noise(x, y, seed) {
    let n = (Math.imul(x + 83, 374761393) + Math.imul(y + 47, 668265263) +
      Math.imul(seed + 7, 1442695041)) >>> 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
    return (n ^ (n >>> 16)) >>> 0;
  }
  const paints = {
    spring: ["#a4ebee", "#fcf4ce"],
    embers: ["#e9ab6d", "#f2cf88"],
    dust: ["#f0d4a3", "#e7be89"],
    pollen: ["#f2e4b0", "#f2cfd2"],
    frost: ["#ebf6fa", "#bbdce9"],
    glitter: ["#a3e5ed", "#f5f6dc"],
    neon: ["#efd39b", "#d5a0d8"],
    lamps: ["#f5e5b2", "#fdf6d1"],
    crystal: ["#b8e9ec", "#e1d2f4"]
  };
  function render(g, name, offsetX, offsetY, tick) {
    const m = window.WORLD_MAPS?.[name];
    if (!m || !Array.isArray(m.collision) || !Array.isArray(m.behavior) ||
      m.collision.length !== m.width * m.height) return 0;
    const kind = theme(m);
    if (!kind) return 0;
    const palette = paints[kind], frame = Math.floor((tick ?? Date.now()) / 220);
    const W = g.canvas?.width || 240, H = g.canvas?.height || 192;
    const left = Math.max(0, Math.floor(-offsetX / TILE) - 1);
    const top = Math.max(0, Math.floor(-offsetY / TILE) - 1);
    const right = Math.min(m.width, Math.ceil((W - offsetX) / TILE) + 1);
    const bottom = Math.min(m.height, Math.ceil((H - offsetY) / TILE) + 1);
    if (left >= right || top >= bottom) return 0;
    const seed = name.length * 41 + name.charCodeAt(0);
    // Construct this small set once per visible frame rather than scanning
    // actors and event records for each of the ~200 visible tiles.
    const reserved = new Set([
      ...(m.people || []), ...(m.warps || []), ...(m.signs || []),
      ...(m.triggers || []), ...(m.hidden || [])
    ].filter(a => Number.isInteger(a.x) && Number.isInteger(a.y))
      .map(a => a.y * m.width + a.x));
    let count = 0;
    g.save();
    // Infrequent highlight pixels; don't paint over event tiles, entrances,
    // or actors. All changes are visual only and never alter map records.
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      const i = y * m.width + x, solid = !!m.collision[i];
      const wet = m.behavior[i] === 0x10, r = noise(x, y, seed);
      if (reserved.has(i)) continue;
      let eligible = false;
      if (kind === "spring" || kind === "glitter") eligible = wet || (!solid && (r % 13 === 0));
      else if (kind === "embers" || kind === "lamps" || kind === "neon" || kind === "crystal")
        eligible = solid && r % 8 === 0;
      else if (kind === "frost") eligible = !solid && r % 12 === 0;
      else eligible = !solid && r % 11 === 0;
      if (!eligible || (r >>> 7) % 5 !== frame % 5) continue;
      const px = offsetX + x * TILE, py = offsetY + y * TILE;
      const drift = (frame + (r >>> 12)) % 6;
      g.globalAlpha = kind === "neon" || kind === "lamps" ? 0.38 : 0.31;
      g.fillStyle = palette[r % 2];
      if (kind === "glitter" || kind === "spring" || kind === "crystal") {
        g.fillRect(px + 6, py + 5, 1, 7);
        g.fillRect(px + 3, py + 8, 7, 1);
        g.fillRect(px + 5, py + 7, 3, 3);
      } else if (kind === "neon" || kind === "lamps") {
        g.fillRect(px + 3, py + 4, 4, 2);
        g.fillRect(px + 10, py + 4, 3, 2);
        g.fillRect(px + 5, py + 7, 6, 1);
      } else if (kind === "frost") {
        g.fillRect(px + 5 + drift, py + 3, 2, 2);
        g.fillRect(px + 2 + drift, py + 10, 1, 2);
      } else {
        g.fillRect(px + 3 + drift, py + 8 - (frame % 4), 2, 2);
        if (kind === "pollen") g.fillRect(px + 12 - drift, py + 11, 1, 1);
      }
      count++;
    }
    g.restore();
    return count;
  }
  window.RegionAmbience = { render, theme };
})();
