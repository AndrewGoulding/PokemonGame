'use strict';const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');global.window=global;global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};for(const[,f]of fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').matchAll(/<script src="([^"]+)"><\/script>/g))if(!f.startsWith('ui/')||/^ui\/unova-/.test(f))vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),{filename:f});
// TVs, trash cans and vending machines in the source houses and gatehouses (tools/lib/unova-houses.js), and the
// Medal Rally records they count: Television Kid (record 23), Trash Master (43), Vending Virtuoso (125) and Lucky Drink.
const R=UnovaInteriors,H=R.data().houses,M=WORLD_MAPS,ids=p=>Unova.medals(p).map(m=>m.id),seq=(...a)=>()=>a.length?a.shift():0;
(async()=>{
 // Every fixture is one tile in its room, blocked, and drawn from the source map's tile classes.
 assert.equal(H.fixtures.length,43+94+9);assert.deepEqual(H.fixturesSkipped,[]);
 for(const f of H.fixtures){const m=M[f.map],a=m.signs.filter(s=>s.script==='bw:interior-house-'+f.key);assert.equal(a.length,1,f.key);assert.equal(m.collision[a[0].y*m.width+a[0].x],1,f.key);assert.equal(R.fixture(f.key),f.kind);}
 const kinds=bank=>H.fixtures.filter(f=>f.bank===bank).map(f=>f.kind).sort();
 assert.deepEqual(kinds('aspertia_city_4'),['tv']);assert.deepEqual(kinds('bridge_gate_gate_6'),['trash','vending']);assert.deepEqual(kinds('driftveil_city_8'),['trash','vending','vending']);
 assert.deepEqual(H.vending.drinks,[{item:'fresh-water',price:200},{item:'soda-pop',price:300},{item:'lemonade',price:350}]);assert.equal(H.tv.messages.length,188);assert.deepEqual(H.tv.channels,['CELEBRITY','BATTLE','VARIETY']);

 // Records start with the Medal Box, as every other Unova action counter does.
 const p=Player.create('FIXTURES'),s=Unova.state(p);p.party=[Party.create('Oshawott',10)];p.money=5000;R.trash(p);assert.equal(s.records?.trash,undefined);s.medalBox=true;s.medals=[0];
 for(let i=0;i<9;i++)R.trash(p);assert(!ids(p).includes(59));R.trash(p);assert.equal(s.records.trash,10);assert(ids(p).includes(59));

 // TV: Interview Unova (0–21, then the player's half: 22–35 for girls, 36–49 for boys, never the link-only idol lines), Moves for Living (50–99), Horoscope (100–179).
 p.look=Object.keys(Player.LOOKS).find(k=>!Player.LOOKS[k].girl);assert.equal(R.tvProgram(p,0,seq(0)).id,0);assert.equal(R.tvProgram(p,0,seq(23/36)).id,37);assert.equal(R.tvProgram(p,0,seq(33/36)).id,46);assert.equal(R.tvProgram(p,0,seq(35/36)).id,48);
 const girl=Object.keys(Player.LOOKS).find(k=>Player.LOOKS[k].girl);if(girl){p.look=girl;assert.equal(R.tvProgram(p,0,seq(23/36)).id,23);}
 assert.equal(R.tvProgram(p,1,seq(.999)).id,99);assert.equal(R.tvProgram(p,2,seq(0)).id,100);assert.equal(R.tvProgram(p,2,seq(.999)).id,179);assert(R.tvProgram(p,3).invalid);
 const lead=H.tv.messages.findIndex(t=>t.includes('{LEAD}'));if(lead>=50&&lead<180){const r=R.tvProgram(p,lead<100?1:2,seq((lead-(lead<100?50:100))/(lead<100?50:80)+1e-6));assert.equal(r.id,lead);assert(r.text.includes('Oshawott')&&!r.text.includes('{LEAD}'));}
 assert.equal(R.tvCommercial(false,seq(.19)),H.tv.messages[180]);assert.equal(R.tvCommercial(true,seq(.19)),null);assert.equal(R.tvCommercial(true,seq(.09,.99)),H.tv.messages[187]);
 while(s.records.tv<9)R.tvProgram(p,1);assert(!ids(p).includes(65));R.tvProgram(p,1);assert(ids(p).includes(65));

 // Vending: price, Bag room, money; one bonus drink in 32 while there's room, with the Lucky Drink Medal.
 const money=p.money;let r=R.vend(p,2,seq(.5));assert.deepEqual(r,{item:'lemonade',price:350,bonus:false});assert.equal(p.money,money-350);assert.equal(Player.itemCount(p,'lemonade'),1);
 r=R.vend(p,0,seq(0));assert(r.bonus);assert.equal(Player.itemCount(p,'fresh-water'),2);assert.equal(s.records.vending,2);assert.equal(s.records.luckyDrink,1);assert(ids(p).includes(52));
 p.bag['soda-pop']=998;r=R.vend(p,1,seq(0));assert(!r.bonus);assert.equal(Player.itemCount(p,'soda-pop'),999);assert(R.vend(p,1).full);
 p.money=100;assert(R.vend(p,0).poor);assert.equal(p.money,100);assert(R.vend(p,5).invalid);
 for(let i=0;i<7;i++){p.money=1000;R.vend(p,0,seq(.5));}assert(ids(p).includes(51));

 // The scenes: the trash can line; a TV viewing until you stop; drinks until you cancel.
 const said=[];let picks=[],yes=[];const env={player:()=>p,say:async t=>said.push([].concat(t).join(' ')),confirm:async()=>yes.length?yes.shift():false,choose:async(_,l)=>picks.length?l[picks.shift()]??null:null,showWorld(){},resume:async()=>{},saveCheckpoint:async()=>{},teleport:async()=>{}},story=UnovaStory.create(env),key=kind=>H.fixtures.find(f=>f.kind===kind).key;
 await story.run('bw:interior-house-'+key('trash'));assert.deepEqual(said,['The trash can is empty.']);
 const tv=s.records.tv;picks=[0,2];yes=[true,false];await story.run('bw:interior-house-'+key('tv'));assert.equal(s.records.tv,tv+2);
 said.length=0;p.money=1000;const water=Player.itemCount(p,'fresh-water');picks=[0,0];await story.run('bw:interior-house-'+key('vending'));assert.equal(Player.itemCount(p,'fresh-water')>=water+2,true);assert.equal(p.money,600);assert(said.some(t=>/Fresh Water dropped down/.test(t)));assert.equal(said.at(-1),H.vending.text.DecidedNotBuyDrink);
 const saved=Player.load(JSON.parse(Player.serialize(p))).player;assert.deepEqual(Unova.peek(saved).records,s.records);
 console.log('ok: 43 TVs, 94 trash cans and 9 vending machines from source tile classes, TV programme/commercial rolls, drink prices/Bag room/money/bonus, Television Kid, Trash Master, Vending Virtuoso and Lucky Drink records, scenes and saves');
})().catch(e=>{console.error(e);process.exitCode=1;});
