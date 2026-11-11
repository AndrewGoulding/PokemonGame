'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const[,src]of html.matchAll(/<script src="([^"]+)"><\/script>/g))
 if(!src.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,src),'utf8'),{filename:src});
const R=TOWN_MAP.alola;assert(R);assert.equal(R,ALOLA_DATA.townMap);
assert.equal(R.width,22);assert.equal(R.height,15);
assert.equal(R.map.length,R.height);assert(R.map.every(a=>a.length===R.width));
assert(R.dungeon.every(a=>a.length===R.width));
for(const name of Object.keys(ALOLA_DATA.maps)){
 const a=R.at[name],sec=R.mapSections[name];
 assert(a,name+' missing position');assert(a[0]>=0&&a[0]<R.width&&a[1]>=0&&a[1]<R.height);
 assert.equal(R.map[a[1]][a[0]],sec);assert(R.names[sec]);assert.equal(TOWN_MAP.mapSections[name],sec);
}
assert.equal(R.at.AlolaHeaheaHotel.join(','),R.at.AlolaHeaheaCity.join(','));
assert.notEqual(R.mapSections.AlolaRoute1,TOWN_MAP.mapSections.Route1);
assert.equal(R.names[R.mapSections.AlolaPaniolaTown],'Paniola Town');
for(const [sec,spot] of Object.entries(R.fly)){
 assert(R.names[sec]);const m=WORLD_MAPS[spot.map];assert(m);
 assert.equal(m.collision[spot.y*m.width+spot.x],0);
 assert(!m.people.some(a=>a.x===spot.x&&a.y===spot.y));
 assert(!m.warps.some(a=>a.x===spot.x&&a.y===spot.y));
}
const p=Player.create('Map tester');p.location={map:'AlolaHeaheaCity',x:13,y:19};
Alola.visit(p,p.location.map);assert(Alola.peek(p).visited.includes(p.location.map));
assert(!Alola.peek(p).visited.includes('AlolaKonikoniCity'));
const loaded=Player.load(JSON.parse(Player.serialize(p))).player;
assert(Alola.peek(loaded).visited.includes('AlolaHeaheaCity'));
assert(fs.readFileSync(path.join(root,R.image),'utf8').includes('<svg'));
const ui=fs.readFileSync(path.join(root,'ui/game.js'),'utf8');
assert(ui.includes('const alolaMap=window.TOWN_MAP.alola'));
assert(ui.includes('alolaMap?.at[name]'));
assert(ui.includes('Alola.peek(player).visited?.includes(spot.map)'));
console.log('ok: unified Alola Town Map covers all '+Object.keys(ALOLA_DATA.maps).length+' maps, safe Fly points and UI integration');
