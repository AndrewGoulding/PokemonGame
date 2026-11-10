'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');global.window=global;global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
for(const[,f]of fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').matchAll(/<script src="([^"]+)"><\/script>/g))if(!f.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),{filename:f});
const D=UNOVA_DATA,R=TOWN_MAP.unova;assert(R);assert.equal(R, D.townMap);assert.equal(R.width,28);assert.equal(R.height,16);assert.equal(R.map.length,R.height);assert(R.map.every(row=>row.length===R.width));assert(R.dungeon.every(row=>row.length===R.width));
for(const name of Object.keys(D.maps)){
 const a=R.at[name],sec=R.mapSections[name];assert(a,name+' has regional coordinates');assert(a[0]>=0&&a[0]<R.width&&a[1]>=0&&a[1]<R.height,name);assert(R.names[sec],name+' has source place name');assert.equal(TOWN_MAP.mapSections[name],sec);
 assert(R.map[a[1]][a[0]]||R.dungeon[a[1]][a[0]],name+' points to a populated cell');
}
assert.notEqual(R.mapSections.UnovaRoute1,TOWN_MAP.mapSections.Route1);assert.equal(R.names[R.mapSections.UnovaAspertiaCity],'Aspertia City');assert.deepEqual(R.at.UnovaCelestialTower2,R.at.UnovaCelestialTower);assert.deepEqual(R.at.UnovaMistraltonCave2,R.at.UnovaMistraltonCave);
const p=Player.create('MAP'),s=Unova.state(p);s.visited=['UnovaAspertiaCity','UnovaFloccesyTown'];p.location={map:'UnovaAspertiaCity',x:23,y:52};Unova.visit(p,p.location.map);
for(const name of s.visited)assert(p.flags.visitedSections.includes(R.mapSections[name]),'old visited maps migrate');
const allowed=Unova.flySpots(p);assert(allowed.some(a=>a.map==='UnovaAspertiaCity'));assert(!allowed.some(a=>a.map==='UnovaVirbankCity'));
for(const[sec,spot]of Object.entries(R.fly)){
 assert(R.names[sec]);const m=WORLD_MAPS[spot.map];assert(m);const i=spot.y*m.width+spot.x;assert(!m.collision[i],sec+' safe Fly landing');assert.notEqual(m.behavior[i],0x10,sec+' Fly does not land in water');
}
const loaded=Player.load(JSON.parse(Player.serialize(p))).player;assert.deepEqual(Unova.peek(loaded).visited,s.visited);assert.deepEqual(loaded.flags.visitedSections,p.flags.visitedSections);
const png=fs.readFileSync(path.join(__dirname,'../',R.image));assert.equal(png.readUInt32BE(16),240);assert.equal(png.readUInt32BE(20),160);
console.log('ok: all '+Object.keys(D.maps).length+' Unova maps located, prefixed source sections, safe Fly destinations, visited-save migration and regional PNG');
