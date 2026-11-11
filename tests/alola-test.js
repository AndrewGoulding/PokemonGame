// Unified Ultra Alola state and opening source-level regression checks.
'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [,src] of html.matchAll(/<script src="([^"]+)"><\/script>/g)){if(src.startsWith('ui/'))continue;vm.runInThisContext(fs.readFileSync(path.join(root,src),'utf8'),{filename:src});}
assert(Alola && typeof AlolaStory === 'undefined');
assert.equal(Alola.data().starters.join(','),'Rowlet,Litten,Popplio');
assert.equal(Object.keys(Alola.data().maps).length,7);
for(const [name,m] of Object.entries(Alola.data().maps)){
 assert(Alola.owns(name));assert.equal(m.collision.length,m.width*m.height);
 for(const w of m.warps){const next=WORLD_MAPS[w.map];assert(next,name+' dangling warp');assert(next.warps[w.warp]?.map===name,name+' not reciprocal');}
}
const p=Player.create('Alola Tester');const before=JSON.stringify(p.flags.kalos||{});
assert(Alola.starter(p,'Rowlet').mon);assert.equal(Alola.rivalSpecies(p),'Popplio');
assert(Alola.starter(p,'Litten').done);assert.equal(p.party.length,1);
assert.equal(Alola.cap(p),12);
p.location={...Alola.data().start};Alola.visit(p,'AlolaHome');
const loaded=Player.load(JSON.parse(Player.serialize(p))).player;
assert.equal(Alola.peek(loaded).starter,'Rowlet');assert.equal(JSON.stringify(loaded.flags.kalos||{}),before);
for(const starter of Alola.data().starters){const q=Player.create('Trial');assert(Alola.starter(q,starter).mon);assert.equal(Alola.rivalTeam(q).length,1);}
const full=Player.create('Full');full.party=Array.from({length:6},()=>Party.create('Pikachu',5));
assert(Alola.starter(full,'Popplio').full);assert(!Alola.peek(full).starter);
console.log('Unified Ultra Alola opening tests passed');
