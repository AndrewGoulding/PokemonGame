'use strict';
// Regional boutiques: one per region outside Kalos, open from the start, each selling its own authored line
// through the shared wardrobe (game/team-fashion.js).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
global.window=global;global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
for(const[,f]of fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"]+)"><\/script>/g))if(!f.startsWith('ui/')||f==='ui/story-events.js')vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const T=TeamFashion,F=KalosFashion,regions={kanto:[undefined,'kanto'],johto:['johto'],hoenn:['hoenn'],sinnoh:['sinnoh'],unova:['unova'],orre:['orre'],alola:['alola'],galar:['galar']};
const fixture=()=>{const p=Player.create('BOUTIQUE');p.money=200000;p.party=[Party.create('Pikachu',50)];return p;};
(async()=>{
const shops=T.vendors.filter(v=>v.boutique);assert.deepEqual(shops.map(v=>v.id.slice(9)).sort(),Object.keys(regions).sort());
const pieces=T.items.filter(a=>a.faction.startsWith('boutique-'));assert.equal(new Set(pieces.map(a=>a.id)).size,pieces.length);
const slots={male:new Set(['hat','shirt','pants','socks','shoes','bag']),female:new Set(['hat','shirt','pants','dress','socks','shoes','bag'])};
const {readPng}=require('../tools/lib/png'),image=readPng('assets/sprites/trainers/front/player_character.png'),rgba=image.rgba||Uint8ClampedArray.from(Array.from(image.px).flatMap(i=>[...image.palette[i],i?255:0])),hashes=new Set();
for(const v of shops){
 const m=WORLD_MAPS[v.map],p=fixture(),shop=v.shop;assert(m,v.map);assert(regions[v.id.slice(9)].includes(m.region),v.map+' '+m.region);
 assert(T.unlocked(p,shop));assert.equal(F.shopError(p,shop),null);assert.equal(F.shopName(shop),v.name);
 const actor=T.people(v.map,p)[0];assert(actor,'No boutique placement '+v.map);assert(fs.existsSync('assets/world/sprites/'+actor.sprite+'.png'));assert(!m.collision[actor.y*m.width+actor.x]);assert(!m.warps.some(w=>w.x===actor.x&&w.y===actor.y));
 const scripts=StoryEvents.create({player:p,teamClothing:async script=>{assert.equal(script,v.script);}});assert.equal(scripts.visible(actor,v.map),true);await scripts.story({type:'script',map:v.map,person:actor});
 const stock=F.stock(p,shop);assert(stock.length>=12,v.id+' '+stock.length);assert.equal(F.stock(p,shop,{today:true}).length,stock.length);
 for(const collection of ['male','female']){const line=stock.filter(a=>a.collection===collection);assert(line.length>=8,v.id+' '+collection);for(const a of line)assert(slots[collection].has(a.category),a.id);
  for(const c of ['hat','shirt','pants','shoes','bag'])assert(line.some(a=>a.category===c||(c==='pants'&&a.category==='dress')),v.id+' '+collection+' '+c);}
 // Another boutique's piece can't be bought here; prices are charged; nothing changes Kalos style points.
 const other=shops.find(w=>w!==v),foreign=F.stock(p,other.shop)[0];assert(F.buy(p,[foreign.id],shop).error);
 const line=stock.filter(a=>a.collection==='female').map(a=>a.id),cost=stock.filter(a=>a.collection==='female').reduce((n,a)=>n+a.price,0),before=p.money,r=F.buy(p,line,shop);assert(!r.error,r.error);assert.equal(p.money,before-cost);assert.equal(KalosActivities.state(p).style,0);
 F.selectCollection?.(p,'female');for(const id of line)F.equip(p,id);
 const pixels=new Uint8ClampedArray(rgba);KalosFashionArt.paint(pixels,image.width,image.height,F.current(p));hashes.add(crypto.createHash('sha256').update(pixels).digest('hex'));
 const loaded=Player.load(JSON.parse(Player.serialize(p))).player;assert.deepEqual(F.current(loaded),F.current(p));assert.deepEqual(F.state(loaded).owned,F.state(p).owned);assert.equal(loaded.flags.kalos.started,undefined);
}
// The Celadon Boutique: a building and room of its own, its door there and back, its clerk fixed behind the counter
// (reached across it), and its stock as FireRed's Mart screen takes it: one collection's line, one of each.
{const city=WORLD_MAPS.CeladonCity,room=WORLD_MAPS.CeladonCity_Boutique,v=T.vendor('boutique-kanto'),p=fixture(),pt=city.patches.boutique;
 assert.equal(v.map,room.name);assert(v.mart&&!T.people('CeladonCity_DepartmentStore_2F',p).length);
 const door=city.warps.find(w=>w.map===room.name),at=(m,x,y)=>y*m.width+x;assert(door&&pt.top&&city.collision[at(city,door.x,door.y)]===1&&city.behavior[at(city,door.x,door.y)]===0x69&&!city.collision[at(city,door.x,door.y+1)]);
 assert(room.warps.every(w=>w.map==='CeladonCity'&&city.warps[w.warp]===door));assert(room.warps[door.warp]);
 assert(city.signs.some(s=>/Celadon Boutique/.test(s.text[0])&&s.y===door.y&&Math.abs(s.x-door.x)===1));
 for(const f of ['CeladonCity-patch-boutique','CeladonCity-patch-boutique-top','CeladonCity_Boutique','CeladonCity_Boutique-top','CeladonCity_Boutique-border'])assert(fs.existsSync('assets/world/maps/'+f+'.png'),f);
 const clerk=T.people(room.name,p)[0];assert.deepEqual([clerk.x,clerk.y,clerk.movement],[2,3,'face_right']);assert.equal(room.behavior[at(room,3,3)],0x80);assert(!room.collision[at(room,4,3)]);assert(!room.people.some(a=>a.x===clerk.x&&a.y===clerk.y));
 vm.runInThisContext(fs.readFileSync('ui/boutique-mart.js','utf8'),{filename:'ui/boutique-mart.js'});
 for(const collection of ['male','female']){F.selectCollection(p,collection);const o=BoutiqueMart.offers(p,v);assert(o.items.length>=8&&o.items.every(a=>T.item(a.id).collection===collection&&a.price>0&&a.desc.startsWith(a.name)));
  const a=o.items[0],before=p.money;assert.deepEqual(o.limit(a.id),{max:1});assert.equal(o.buy(a.id,1),null);assert.equal(p.money,before-a.price);assert(o.soldOut(a.id)&&o.inBag(a.id)===1&&o.limit(a.id).max===0);assert(o.buy(a.id,1).error);assert.equal(p.money,before-a.price);assert.deepEqual(o.bought,[a.id]);
  p.money=0;assert(o.buy(o.items[1].id,1).error);assert(!F.owned(p,o.items[1].id));p.money=200000;}
}
assert.equal(hashes.size,shops.length,'each boutique outfit draws differently');
// The X/Y catalogue and the team outfitters are unchanged.
assert.equal(F.items().length,307);assert.equal(T.vendors.filter(v=>!v.boutique).length,9);
console.log('ok: '+shops.length+' regional boutiques ('+pieces.length+' pieces), open placement and dispatch, region maps, full lines for both collections, shop isolation, prices, distinct art and saves; the Celadon Boutique\'s building, door, counter and Mart-screen stock');
})().catch(e=>{console.error(e);process.exitCode=1;});
