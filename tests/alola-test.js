// Unified Ultra Alola state and opening source-level regression checks.
'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [,src] of html.matchAll(/<script src="([^"]+)"><\/script>/g)){if(src.startsWith('ui/'))continue;vm.runInThisContext(fs.readFileSync(path.join(root,src),'utf8'),{filename:src});}
assert(Alola && typeof AlolaStory === 'undefined');
assert.equal(Alola.data().starters.join(','),'Rowlet,Litten,Popplio');
assert.equal(Object.keys(Alola.data().maps).length,81);
for(const [name,m] of Object.entries(Alola.data().maps)){
 assert(Alola.owns(name));assert.equal(m.collision.length,m.width*m.height);
 for(const w of m.warps){const next=WORLD_MAPS[w.map];assert(next,name+' dangling warp');assert(next.warps[w.warp]?.map===name,name+' not reciprocal');assert(!m.collision[w.y*m.width+w.x],name+' blocked warp');}
 for(const npc of m.people){assert(!m.collision[npc.y*m.width+npc.x],name+' blocked NPC '+npc.script);assert(!m.warps.some(w=>w.x===npc.x&&w.y===npc.y),name+' NPC on warp');}
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
for(const name of ['AlolaHauoliBeach','AlolaHauoliCity','AlolaRoute2','AlolaVerdantCavern'])assert(Alola.owns(name));
const chapter=Player.create('Chapters');Alola.starter(chapter,'Litten');
assert(Alola.allowed(chapter,'AlolaHauoliCity'));
Alola.state(chapter).schoolClear=true;assert.equal(Alola.allowed(chapter,'AlolaHauoliCity'),null);
assert(Alola.allowed(chapter,'AlolaRoute2'));
Alola.state(chapter).ilimaWon=true;assert.equal(Alola.allowed(chapter,'AlolaRoute2'),null);
assert(Alola.allowed(chapter,'AlolaVerdantCavern'));
Alola.state(chapter).skullRoute2=true;assert.equal(Alola.allowed(chapter,'AlolaVerdantCavern'),null);
assert.equal(Alola.cap(chapter),20);Alola.state(chapter).verdantClear=true;assert.equal(Alola.cap(chapter),25);
Alola.state(chapter).halaClear=true;assert.equal(Alola.cap(chapter),35);
console.log('Unified Ultra Alola Melemele chapter tests passed');
