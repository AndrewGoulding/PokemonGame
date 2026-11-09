// Import Platinum's campaign through the Sinnoh Champion from pret/pokeplatinum. No ROM/build
// required. Existing Essentials geometry is retained; placements are adapted
// explicitly below, while dialogue, trainer parties and event provenance come
// from Platinum. Run: node tools/build-platinum.js /path/to/pokeplatinum
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");
const { readPng, writePng } = require("./lib/png");
const source = path.resolve(process.argv[2] || process.env.POKEPLATINUM || "");
if (!fs.existsSync(path.join(source, "res/field/maps/oreburgh_city_gym/scripts.s"))) throw new Error("Pass a pret/pokeplatinum checkout");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(source, file), "utf8");
const json = (file) => JSON.parse(read(file));
const pages = (text) => [].concat(text || []).join("").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').split(/[\r\f]/).map((s) => s.trim()).filter(Boolean);
const banks = ["route_201", "sandgem_town_pokemon_research_lab", "route_202", "jubilife_city", "route_203", "oreburgh_gate_1f", "oreburgh_city", "oreburgh_mine_b2f", "oreburgh_city_gym", "route_204_south", "route_204_north", "route_205_south", "route_205_north", "floaroma_town", "floaroma_meadow", "valley_windworks_outside", "valley_windworks_building", "eterna_forest", "eterna_city", "eterna_city_gym", "team_galactic_eterna_building_1f", "team_galactic_eterna_building_2f", "team_galactic_eterna_building_3f", "team_galactic_eterna_building_4f", "cycle_shop", "route_206", "route_207", "route_206_cycling_road_north_gate"];
banks.push("mt_coronet_1f_south", "hearthome_city", "hearthome_city_gym_entrance_room", "hearthome_city_gym_leader_room", "veilstone_city", "veilstone_city_gym", "veilstone_city_galactic_warehouse", "pastoria_city", "pastoria_city_gym", "route_208", "route_209", "route_209_gate_to_hearthome_city", "route_210_south", "route_215", "route_214", "route_213", "route_212_north", "route_212_south");
banks.push(...require("./lib/platinum-finale").banks.filter(bank => fs.existsSync(path.join(source, "res/text/" + bank + ".json"))));
banks.push(...require("./lib/platinum-sidequests").banks);
banks.push(...require("./lib/platinum-legends").banks);
const texts = {};
for (const bank of banks) for (const m of json("res/text/" + bank + ".json").messages) texts[m.id] = pages(m.en_US);
// Read the existing game's identifiers without loading UI or prior generated output.
const ctx = { window: null }; ctx.window = ctx; vm.createContext(ctx);
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const [, file] of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
  if (file.startsWith("data/") && file !== "data/platinum.js") vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), ctx);
}
const key = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const species = Object.fromEntries(Object.keys(ctx.DEX).map((s) => [key(s), s]));
species.deoxys="Deoxys-Normal";species.wormadam="Wormadam-Plant";species.shaymin="Shaymin-Land";
const items = Object.fromEntries(Object.keys(ctx.ITEMS).map((s) => [key(s), s]));
const moves = Object.fromEntries(Object.keys(ctx.MOVES).map((s) => [key(s), s]));
moves.vicegrip=moves.visegrip;moves.smellingsalt=moves.smellingsalts;
moves.hijumpkick = moves.highjumpkick;
moves.faintattack = moves.feintattack; // Gen 4 spelling, renamed in Gen 6
const convert = (value, prefix, table) => { const out = table[key(value.replace(prefix, ""))]; if (!out) throw new Error("Unknown " + value); return out; };
const trainers = {}, sprites = new Set(["prof_rowan", "roark", "barry"]), portraits = new Set(["leader_roark", "rival"]);
function trainer(id) {
  const name = id.replace(/^TRAINER_/, "").toLowerCase(), tid = "PT_" + id;
  if (trainers[tid]) return tid;
  const t = json("res/trainers/data/" + name + ".json"), cls = t.class.replace("TRAINER_CLASS_", "").toLowerCase();
  portraits.add(cls);
  const message = (type) => pages((t.messages.find((m) => m.type === type) || {}).en_US);
  trainers[tid] = { name: cls === "rival" ? "Barry" : t.name, className: /^leader_/.test(cls) ? "Leader" : cls.split("_").map((s) => s[0].toUpperCase() + s.slice(1)).join(" "),
    region: "sinnoh", double: !!t.double_battle, pic: "pt_" + cls, music: "mus_encounter_boy", party: t.party.map((m) => ({ species: m.species === "SPECIES_WORMADAM" ? ["Wormadam-Plant", "Wormadam-Sandy", "Wormadam-Trash"][m.form || 0] : convert(m.species, "SPECIES_", species), level: m.level, iv: m.iv_scale,
      ...(m.item && m.item !== "ITEM_NONE" ? { item: convert(m.item, "ITEM_", items) } : {}),
      ...(m.moves ? { moves: m.moves.map((s) => convert(s, "MOVE_", moves)) } : {}) })),
    intro: message("TRMSG_PRE_BATTLE"), defeat: message("TRMSG_DEFEAT"), after: message("TRMSG_POST_BATTLE") };
  return tid;
}
for (const s of ["TURTWIG", "CHIMCHAR", "PIPLUP"]) trainer("TRAINER_RIVAL_ROUTE_203_" + s);
trainer("TRAINER_LEADER_ROARK");
const additions = {};
function person(map, x, y, script, sprite, extra = {}) {
  sprites.add(sprite);
  (additions[map] || (additions[map] = [])).push({ x, y, script: "pt:" + script, localId: "PT_" + script, sprite: "pt_" + sprite, width: 32, height: 32, frames: 3,
    movement: "face_down", rangeX: 0, rangeY: 0, text: null, ...extra });
}
// Explicit adaptations to the existing maps, not a claim that their coordinate
// systems are identical to Platinum's world matrix.
const placements = {
  route_202: { map: "Route202", at: [[18, 24], [16, 15], [27, 8]] },
  route_203: { map: "Route203", at: [[10, 20], [19, 10], [42, 19], [45, 16], [48, 10]] },
  oreburgh_gate_1f: { map: "Oreburgh_Gate", at: [[18, 20], [27, 20]] },
  oreburgh_mine_b2f: { map: "OreburghMine", at: [[21, 45], [11, 54]] },
  oreburgh_city_gym: { map: "OreburghCity_Gym", at: null }
};
const provenance = {};
for (const [bank, def] of Object.entries(placements)) {
  const events = json("res/field/maps/" + bank + "/events.json");
  let i = 0;
  for (const event of events.object_events.filter((e) => e.trainer)) {
    const tid = trainer(event.trainer.id), t = trainers[tid], at = def.at ? def.at[i++] : [event.x, event.z];
    if (!at) throw new Error("Missing placement: " + event.trainer.id);
    const sprite = event.graphics_id.replace("OBJ_EVENT_GFX_", "").toLowerCase();
    person(def.map, ...at, tid, sprite, { movement: "face_" + ({ DIR_NORTH: "up", DIR_SOUTH: "down", DIR_EAST: "right", DIR_WEST: "left" }[event.initial_dir] || "down"),
      trainer: { id: tid, sight: Math.min(3, event.trainer.sight_range), intro: t.intro, defeat: t.defeat, after: t.after }, text: t.after });
  }
  provenance[bank] = { events: "res/field/maps/" + bank + "/events.json", scripts: "res/field/maps/" + bank + "/scripts.s" };
}
person("SandgemTown_RowansLab", 6, 3, "rowan", "prof_rowan");
person("SandgemTown_RowansLab", 3, 10, "aide", "school_kid_f");
person("JubilifeCity", 49, 48, "jubilife", "school_kid_f");
person("Route203", 9, 20, "barry203", "barry");
person("OreburghCity", 31, 18, "gym-door", "youngster");
person("OreburghMine", 18, 45, "mine-roark", "roark");
additions.OreburghMine.push({ x: 19, y: 45, script: "pt:mine-rock", localId: "PT_ROARK_DEMO_ROCK",
  sprite: "rock_smash_rock", width: 16, height: 16, frames: 1, inanimate: true,
  movement: "face_down", rangeX: 0, rangeY: 0, text: null });
person("Oreburgh_Gate", 12, 20, "rock-smash", "hiker");
person("OreburghCity_Gym", 5, 3, "roark", "roark");
person("OreburghCity_Gym", 6, 23, "gym-guide", "hiker");
// The Gym's NPC coordinates and exit are Platinum's. The room is rendered with
// FireRed rock-Gym tiles, matching the project's 2D presentation.
const w = 11, h = 26, collision = [], behavior = [], tiles = [];
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const wall = x === 0 || x === w - 1 || y < 2 || y === h - 1;
  const rock = [7, 14, 20].includes(y) && [2, 8].includes(x);
  collision.push(wall || rock ? 1 : 0); behavior.push(0);
  tiles.push(wall ? [0, 0] : rock ? [4, 5] : [2, 4]);
}
collision[24 * w + 5] = 0; behavior[24 * w + 5] = 0x65; tiles[24 * w + 5] = [6, 14];
const gym = { name: "OreburghCity_Gym", title: "Oreburgh City · Gym", region: "sinnoh", type: "indoor", width: w, height: h, music: "mus_gym", battleScene: "gym",
  top: false, collision, behavior, elevation: Array(w * h).fill(3), encounter: Array(w * h).fill(0), connections: [], signs: [], triggers: [], hidden: [], people: [], borderWidth: 2, borderHeight: 2,
  warps: [{ x: 5, y: 24, map: "OreburghCity", warp: 0 }] };
const base = readPng(path.join(root, "assets/world/maps/PewterCity_Gym.png"));
function rgba(pic, x, y) { const i = y * pic.width + x; return pic.rgba ? Array.from(pic.rgba.subarray(i * 4, i * 4 + 4)) : [...pic.palette[pic.px[i]].slice(0, 3), pic.px[i] ? 255 : 0]; }
const pixels = new Uint8ClampedArray(w * 16 * h * 16 * 4);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [tx, ty] = tiles[y * w + x]; for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) pixels.set(rgba(base, tx * 16 + px, ty * 16 + py), ((y * 16 + py) * w * 16 + x * 16 + px) * 4); }
writePng(path.join(root, "assets/world/maps/OreburghCity_Gym.png"), w * 16, h * 16, pixels);
const border = new Uint8ClampedArray(32 * 32 * 4);
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) border.set(rgba(base, x % 16, y % 16), (y * 32 + x) * 4);
writePng(path.join(root, "assets/world/maps/OreburghCity_Gym-border.png"), 32, 32, border);
const chapter = require("./lib/platinum-eterna")({ root, source, ctx, person, trainer, additions, provenance });
const galactic = require("./lib/platinum-galactic")({ root, source, ctx, person, trainer, additions, provenance });
Object.assign(chapter.maps, galactic.maps); chapter.doors.push(...galactic.doors);
const middle = require("./lib/platinum-midgame")({ root, source, ctx, person, trainer, additions, provenance });
Object.assign(chapter.maps, middle.maps); chapter.doors.push(...middle.doors);
const finale = require("./lib/platinum-finale")({ root, source, ctx, person, trainer, additions, provenance, priorMaps: chapter.maps, moveName: m => convert(m, "MOVE_", moves) });
Object.assign(chapter.maps, finale.maps); chapter.doors.push(...finale.doors);
const quests = require("./lib/platinum-sidequests")({root,source,ctx,person,trainer,additions,provenance,priorMaps:chapter.maps,moveName:m=>convert(m,"MOVE_",moves),speciesName:s=>convert(s,"SPECIES_",species)});
const legends=require("./lib/platinum-legends")({root,source,kit:quests.kit,person,trainer,additions,provenance,speciesName:s=>convert(s,"SPECIES_",species),moveName:m=>convert(m,"MOVE_",moves)});
const towns=require("./lib/platinum-towns")({root,source,kit:quests.kit,provenance,speciesName:s=>convert(s,"SPECIES_",species),moveName:m=>convert(m,"MOVE_",moves),itemName:i=>convert(i,"ITEM_",items)});
const expeditions=require("./lib/platinum-expeditions")({root,source,kit:quests.kit,trainer,person,additions,provenance,speciesName:s=>convert(s,"SPECIES_",species)});
const routes=require("./lib/platinum-routes")({source,kit:quests.kit,trainer,person,additions,provenance,speciesName:s=>convert(s,"SPECIES_",species)});
Object.assign(chapter.maps,quests.maps);chapter.doors.push(...quests.doors);
for (const people of Object.values(additions)) for (const p of people) if (p.trainer) {
  const t = trainers[p.trainer.id]; Object.assign(p.trainer, { intro: t.intro, defeat: t.defeat, after: t.after }); p.text = t.after;
}
for (const name of sprites) {
  const npcFile = path.join(source, "res/graphics/field_sprites/npc/" + name + ".png");
  const pic = readPng(fs.existsSync(npcFile) ? npcFile : path.join(source, "res/graphics/field_sprites/pokemon/" + name + ".png"));
  const size = pic.width, frames = Math.max(1, Math.floor(pic.height / size));
  const out = new Uint8ClampedArray(size * 3 * size * 4);
  for (let f = 0; f < 3; f++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) out.set(rgba(pic, x, y + Math.min(f, frames - 1) * size), (y * size * 3 + f * size + x) * 4);
  writePng(path.join(root, "assets/world/sprites/pt_" + name + ".png"), size * 3, size, out);
}
for (const name of portraits) {
  const pic = readPng(path.join(source, "res/trainers/classes/" + name + "/front.png"));
  const out = new Uint8ClampedArray(80 * 80 * 4);
  for (let y = 0; y < 80; y++) for (let x = 0; x < 80; x++) out.set(rgba(pic, x, y), (y * 80 + x) * 4);
  writePng(path.join(root, "assets/sprites/trainers/front/pt_" + name + ".png"), 80, 80, out);
}
{
  const pic = readPng(path.join(source, "res/items/icons/works_key.png"));
  const out = new Uint8ClampedArray(pic.width * pic.height * 4);
  for (let y = 0; y < pic.height; y++) for (let x = 0; x < pic.width; x++) out.set(rgba(pic, x, y), (y * pic.width + x) * 4);
  writePng(path.join(root, "assets/sprites/items/key-item/works-key.png"), pic.width, pic.height, out);
}
for (const [icon,id] of [["gracidea","gracidea"],["secret_key","platinum-secret-key"],["lunar_wing","lunar-wing"],["member_card","member-card"],["oaks_letter","oaks-letter"],["azure_flute","azure-flute"],["secretpotion","secret-potion"],["old_charm","old-charm"],["storage_key","galactic-storage-key"],["galactic_key","galactic-key"]]) {
  const pic=readPng(path.join(source,"res/items/icons/"+icon+".png")),out=new Uint8ClampedArray(pic.width*pic.height*4);
  for(let y=0;y<pic.height;y++)for(let x=0;x<pic.width;x++)out.set(rgba(pic,x,y),(y*pic.width+x)*4);
  writePng(path.join(root,"assets/sprites/items/key-item/"+id+".png"),pic.width,pic.height,out);
}
for (const name of ["cheryl", "dawn_dp", "riley", "buck", "mira", "marley"]) {
  const pic = readPng(path.join(source, "res/graphics/battle/trainer_backs/" + name + ".png"));
  const out = new Uint8ClampedArray(80 * 80 * 4);
  for (let y = 0; y < 80; y++) for (let x = 0; x < 80; x++) out.set(rgba(pic, x, y), (y * 80 + x) * 4);
  writePng(path.join(root, "assets/sprites/trainers/back/pt_" + name + ".png"), 80, 80, out);
}
// Arceus's Plate types share one species/learnset. Export Platinum's typed
// palettes as display forms, without inventing duplicate National Dex species.
for(const type of ["bug","dark","dragon","electric","fighting","fire","flying","ghost","grass","ground","ice","poison","psychic","rock","steel","water","fairy"]){
 const folder=path.join(source,"res/pokemon/arceus/forms",type==="fairy"?"psychic":type);
 for(const back of [false,true])for(const shiny of [false,true]){
  const pic=readPng(path.join(folder,back?"back.png":"front.png")),pal=fs.readFileSync(path.join(folder,shiny?"shiny.pal":"normal.pal"),"utf8").trim().split(/\r?\n/).slice(3).map(l=>l.trim().split(/\s+/).map(Number));
  const out=new Uint8ClampedArray(96*96*4);for(let y=0;y<80;y++)for(let x=0;x<80;x++){const index=pic.px[y*pic.width+x];out.set([...(pal[index]||[0,0,0]),index?255:0],((y+8)*96+x+8)*4);}
  writePng(path.join(root,"assets/sprites/pokemon",back?"back":"",shiny?"shiny":"","493-"+type+".png"),96,96,out);
 }
 fs.copyFileSync(path.join(root,"assets/sprites/icons/493.png"),path.join(root,"assets/sprites/icons/493-"+type+".png"));
}
execFileSync(process.execPath,[path.join(root,"tools/build-sprite-metrics.js")],{cwd:root,stdio:"pipe"});
const data = { source: { repository: "https://github.com/pret/pokeplatinum", commit: execFileSync("git", ["-C", source, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  scope: "Adapted Platinum campaign, side quests, event stories and postgame rematches; not a DS script interpreter", events: provenance }, texts, trainers, additions, gym, maps: chapter.maps, doors: chapter.doors, legendary: finale.legendary, sidequests: quests.sidequests, legends, towns, expeditions, routes };
fs.writeFileSync(path.join(root, "data/platinum.js"), "// Generated by tools/build-platinum.js from pret/pokeplatinum.\nwindow.PLATINUM_DATA = " + JSON.stringify(data) + ";\n");
console.log("Imported " + Object.keys(texts).length + " messages and " + Object.keys(trainers).length + " trainer teams from Platinum");
