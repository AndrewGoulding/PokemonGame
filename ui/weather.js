// Hoenn's weather over the map (Emerald's src/field_weather*.c): rain, thunderstorms and downpours, snow,
// sandstorms, drought, the sunny clouds' shadows, volcanic ash, the shade of the woods and the bubbles underwater.
// (Fog is ui/overworld.js's own, from FireRed's.) Each is drawn on the map canvas, 240x160, as particles and a tint,
// and the map and people are dimmed or warmed with a canvas filter, as the GBA shifts the palettes (gamma levels).
//
//   const W = Weather.create(g, 240, 160, { thunder: () => ... })
//   W.filter(kind)                 // the filter for the map and people, or "" (Emerald's "shade" is 13/16)
//   W.update(kind)                 // each frame
//   W.draw(kind, camX, camY)       // after the people, over the map
//
// kinds: "rain", "thunderstorm", "downpour", "snow", "sandstorm", "drought", "sunny_clouds", "volcanic_ash",
// "shade", "underwater".
(function () {
  "use strict";

  // Emerald's gamma shifts: how much darker (or brighter) the palettes are in each.
  const FILTERS = {
    shade: "brightness(0.8125)", rain: "brightness(0.8125)", thunderstorm: "brightness(0.75)", downpour: "brightness(0.75)",
    drought: "brightness(1.1) saturate(1.15) sepia(0.2)", volcanic_ash: "brightness(0.93) saturate(0.85)", underwater: "brightness(0.9) saturate(0.9)"
  };
  // Particles: how many there are, and their make.
  const RAIN = { rain: 70, thunderstorm: 100, downpour: 150 };

  function create(g, W, H, opts) {
    opts = opts || {};
    let kind = "", t = 0, flash = 0, nextFlash = 240, cloudX = [-40, 60, 150];
    let parts = [];
    const rnd = (a, b) => a + Math.random() * (b - a);

    function seed(k) {
      parts = [];
      const n = RAIN[k] || (k === "snow" ? 60 : k === "volcanic_ash" ? 70 : k === "sandstorm" ? 70 : k === "underwater" ? 18 : 0);
      for (let i = 0; i < n; i++) parts.push({ x: rnd(0, W + 40), y: rnd(0, H), v: rnd(0.6, 1.4), s: Math.random() });
    }
    function update(k) {
      if (k !== kind) { kind = k; t = 0; flash = 0; nextFlash = 240 + Math.random() * 600; seed(k); }
      t++;
      for (const p of parts) {
        if (RAIN[k]) { p.x -= 1.5 * (k === "downpour" ? 2 : 1.4); p.y += 4 * (k === "downpour" ? 1.6 : 1.2) * p.v; if (p.y > H || p.x < -8) { p.y = rnd(-20, 0); p.x = rnd(0, W + 40); } }
        else if (k === "snow") { p.y += 0.4 * p.v; p.x += Math.sin((t + p.s * 99) / 24) * 0.5 - 0.1; if (p.y > H) { p.y = -4; p.x = rnd(0, W); } if (p.x < -4) p.x = W; }
        else if (k === "volcanic_ash") { p.y += 0.35 * p.v; p.x -= 0.3 * p.v; if (p.y > H) { p.y = -4; p.x = rnd(0, W + 20); } if (p.x < -4) p.x = W; }
        else if (k === "sandstorm") { p.x -= 3.5 * p.v; p.y += Math.sin((t + p.s * 99) / 10) * 0.6 + 0.2; if (p.x < -12) { p.x = W + rnd(0, 20); p.y = rnd(0, H); } }
        else if (k === "underwater") { p.y -= 0.5 * p.v; p.x += Math.sin((t + p.s * 99) / 20) * 0.3; if (p.y < -6) { p.y = H + 4; p.x = rnd(0, W); } }
      }
      if (k === "sunny_clouds") for (let i = 0; i < cloudX.length; i++) { cloudX[i] += 0.12; if (cloudX[i] > W + 40) cloudX[i] = -90; }
      if (k === "thunderstorm") {
        if (flash > 0) flash--;
        else if (--nextFlash <= 0) { flash = 10; nextFlash = 500 + Math.random() * 900; if (opts.thunder) opts.thunder(); }
      }
    }
    function draw(k) {
      if (k !== kind) update(k);
      if (RAIN[k]) {
        g.save();
        g.strokeStyle = k === "downpour" ? "rgba(215,228,255,0.95)" : "rgba(225,235,255,0.9)";
        g.lineWidth = 1;
        g.beginPath();
        for (const p of parts) { g.moveTo(Math.round(p.x), Math.round(p.y)); g.lineTo(Math.round(p.x) - 3, Math.round(p.y) + (k === "downpour" ? 9 : 7)); }
        g.stroke();
        if (k === "downpour") { g.fillStyle = "rgba(20,30,70,0.12)"; g.fillRect(0, 0, W, H); }
        g.restore();
        if (k === "thunderstorm" && flash > 0) { g.fillStyle = "rgba(255,255,255," + (flash > 6 ? 0.55 : 0.25) + ")"; g.fillRect(0, 0, W, H); }
      } else if (k === "snow") {
        g.fillStyle = "#fff";
        for (const p of parts) g.fillRect(Math.round(p.x), Math.round(p.y), p.s > 0.5 ? 3 : 2, p.s > 0.5 ? 3 : 2);
      } else if (k === "volcanic_ash") {
        g.fillStyle = "rgba(90,80,80,0.2)"; g.fillRect(0, 0, W, H);
        for (const p of parts) { g.fillStyle = p.s > 0.5 ? "rgba(190,185,180,0.95)" : "rgba(110,105,100,0.95)"; g.fillRect(Math.round(p.x), Math.round(p.y), 2, p.s > 0.7 ? 2 : 1); }
      } else if (k === "sandstorm") {
        g.fillStyle = "rgba(200,160,95,0.28)"; g.fillRect(0, 0, W, H);
        for (const p of parts) { g.fillStyle = p.s > 0.5 ? "rgba(225,195,135,0.7)" : "rgba(180,145,90,0.7)"; g.fillRect(Math.round(p.x), Math.round(p.y), 6 + Math.round(p.s * 8), 1 + (p.s > 0.6 ? 1 : 0)); }
      } else if (k === "drought") {
        g.fillStyle = "rgba(255,210,100,0.1)"; g.fillRect(0, 0, W, H);
      } else if (k === "underwater") {
        g.fillStyle = "rgba(20,70,150,0.3)"; g.fillRect(0, 0, W, H);
        g.strokeStyle = "rgba(220,240,255,0.8)";
        for (const p of parts) { g.beginPath(); g.arc(Math.round(p.x), Math.round(p.y), 1 + p.s * 1.5, 0, Math.PI * 2); g.stroke(); }
      } else if (k === "sunny_clouds") {
        g.fillStyle = "rgba(0,0,40,0.1)";
        cloudX.forEach((x, i) => { g.beginPath(); g.ellipse(x + 32, 30 + i * 46, 38, 18, 0, 0, Math.PI * 2); g.fill(); });
      }
    }
    return { filter: (k) => FILTERS[k] || "", update, draw };
  }

  window.Weather = { create, FILTERS };
})();
