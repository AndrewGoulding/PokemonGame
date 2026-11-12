// Verify the civic paving overlays are purely visual and don't affect gameplay.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const game = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
assert(html.includes('src="ui/civic-map-art.js"'));
assert(game.includes("CivicMapArt.draw(g,map,x,y)"));
const g = {
  globalAlpha: 1, fillStyle: "",
  fillRect() { this.paints = (this.paints || 0) + 1; }
};
global.document = { createElement: () => ({ width:0,height:0,getContext: () => g }) };
global.window = global;
const mk = (name, region, type="route") => ({
  name, region, type, width:36,height:28,
  collision: Array.from({ length:36*28 },(_,i)=>i%11===0?1:0),
  behavior: Array(36*28).fill(0),warps:[{x:16,y:12}],people:[{x:17,y:12}],
  signs:[],triggers:[],hidden:[]
});
global.WORLD_MAPS = Object.fromEntries([
  mk("UnovaNimbasaCity","unova"),mk("UnovaCasteliaCity","unova"),
  mk("UnovaDriftveilCity","unova"),mk("UnovaOpelucidCity","unova"),
  mk("KalosLumioseSouth","kalos"),mk("KalosLaverreCity","kalos"),
  mk("KalosLumioseCenter","kalos","indoor"),mk("PalletTown","kanto")
].map(m=>[m.name,m]));
vm.runInThisContext(fs.readFileSync(path.join(root, "ui/civic-map-art.js"), "utf8"), {
  filename:"ui/civic-map-art.js"
});
let renders=0;const target={
  drawImage(canvas,x,y) {
    assert.equal(canvas.width,36*16);
    assert.equal(canvas.height,28*16);
    assert(Number.isInteger(x) && Number.isInteger(y));
    renders++;
  }
};
for(const [name,m] of Object.entries(WORLD_MAPS)){
  const before=JSON.stringify(m),expected=!/Center$|PalletTown/.test(name);
  assert.equal(Boolean(CivicMapArt.style(m)),expected,name+" selection");
  const count=g.paints||0;
  CivicMapArt.draw(target,name,4,12);
  CivicMapArt.draw(target,name,4,12);
  assert.equal((g.paints||0)>count,expected,name+" authored details missing");
  assert.equal(JSON.stringify(m),before,name+" changed collision or event data");
}
assert.equal(renders,12,"Only the six city maps should be composited twice");
console.log("Unova/Kalos paving overlays: data safety, caching and region isolation verified");
