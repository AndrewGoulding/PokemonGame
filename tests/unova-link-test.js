'use strict';const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');global.window=global;global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};for(const[,f]of fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').matchAll(/<script src="([^"]+)"><\/script>/g))if(!f.startsWith('ui/')||/^ui\/unova-/.test(f))vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),{filename:f});
// Single-player stand-ins for the link/online Medal Rally medals (game/unova-link.js): passersby (73–76), Link Battles
// (109–112), other-version trades (165), Pal Pad (174–177), Spin Trade (178), Feeling Check (179–180), the Xtransceiver
// balloon game (195–202), Funfest with 10/30 people (221–222) and Game Sync (232).
const K=UnovaLink,A=UnovaAvenue,ids=p=>Unova.medals(p).map(m=>m.id),seq=(...a)=>()=>a.length?a.shift():0;
(async()=>{
 const p=Player.create('LINK'),s=Unova.state(p);s.medalBox=true;s.medals=[0];s.version='black2';p.party=[Party.create('Snivy',30),Party.create('Lillipup',25)];p.badges=['basic'];
 // Version exclusives come from the encounter tables, both ways, with no overlap.
 const ex=K.exclusives();assert(ex.black2.length>3&&ex.white2.length>3);assert(!ex.black2.some(a=>ex.white2.includes(a)));
 // Pal Pad: 32 friends, no duplicates.
 const who=K.partner(p,{},seq(0,.9));assert.equal(who.version,'white2');assert(K.register(p,who).registered);assert(K.register(p,who).already);assert(ids(p).includes(174));
 for(let i=0;i<31;i++)K.register(p,K.partner(p));assert.equal(K.peek(p).friends.length,32);assert(K.register(p,K.partner(p)).full);assert([174,175,176,177].every(id=>ids(p).includes(id)));
 assert.equal(K.partner(p,{friend:true},seq(0)).id,K.peek(p).friends[0].id);
 // Link battles: teams of the party's size at its best level; won or lost both count, a flee doesn't.
 const t=K.team(p);assert.equal(t.length,2);assert(t.every(m=>m.level===30&&Unova.data().postgame.regionalDex.includes(m.species)));
 assert(!K.battled(p,'fled'));K.battled(p,'won');assert(ids(p).includes(109));for(let i=0;i<99;i++)K.battled(p,i%2?'won':'lost');assert([109,110,111,112].every(id=>ids(p).includes(id)));
 // Trading with the other version gives one of its exclusives; a same-version trade doesn't count for Opposite Trader.
 const offer=K.tradeOffer(p,seq(.1,.5,0));assert.equal(offer.partner.version,'white2');assert(ex.white2.includes(offer.species));const gave=p.party[1],r=K.trade(p,gave,offer);assert.equal(p.party[1].species,offer.species);assert.equal(r.gave,gave);assert.equal(p.party[1].ot.name,offer.partner.name);assert(ids(p).includes(165));
 const lone=Player.create('LONE');lone.party=[Party.create('Snivy',5)];assert(K.trade(lone,lone.party[0],offer).invalid);
 // Spin Trade: an Egg for an Egg that hatches into a first form.
 p.party.push(Breeding.giftEgg('Tepig',{map:'UnovaAspertiaCity',from:'test'}));for(let i=0;i<10;i++){const e=p.party[2];assert(K.spin(p,e).egg.egg);}assert(K.spin(p,p.party[0]).invalid);assert(ids(p).includes(178));
 // Feeling Check: 20 a match, 10 a neighbouring heart; five plays and a score of 80 or more.
 const rounds=[0,1,2,3,0].map(heart=>({heart,mood:K.MOODS[heart]}));assert.equal(K.feelingScore(rounds,[0,1,2,3,0]),100);assert.equal(K.feelingScore(rounds,[1,1,2,3,2]),70);assert.equal(K.feelingScore(rounds,[3,1,2,3,0]),90);
 assert.deepEqual(K.feelingRound(seq(.3,.1)),{heart:1,mood:'sunny'});for(let i=0;i<4;i++)K.feeling(p,40);assert(!ids(p).includes(179));K.feeling(p,80);assert(ids(p).includes(179)&&ids(p).includes(180));assert(!K.feeling(p,101));
 // Balloons: 12 rounds, a colour run adds 10 per balloon in it.
 const b=K.balloons(seq());assert.equal(b.length,12);assert(b.every(r=>r.length===3&&r.every(x=>x.points===10)));const flat=b.map(()=>[{colour:'Red',points:50},{colour:'Blue',points:100}]);assert.equal(K.balloonScore(flat,Array(12).fill(0)),12*50+10*66);assert.equal(K.balloonScore(flat,[1,0,1,0,1,0,1,0,1,0,1,0]),6*100+6*50);
 for(const n of [40,60,250,600,1200])K.played(p,n);assert([199,200,201,202].every(id=>ids(p).includes(id)));assert(!ids(p).includes(195));for(let i=0;i<95;i++)K.played(p,10);assert([195,196,197,198].every(id=>ids(p).includes(id)));
 // Funfest: you and your Pal Pad friends; Game Sync; Join Avenue visitors as passersby (once a visitor a day).
 assert.equal(K.people(p),33);const f=Unova.state(p).funfest||(Unova.state(p).funfest={});f.people=K.people(p);assert(ids(p).includes(221)&&ids(p).includes(222));
 assert(!K.tuck(p,p.party[2]));assert(K.tuck(p,p.party[0]));assert(ids(p).includes(232));
 if(A&&A.souvenir){A.souvenir(p,0);A.souvenir(p,0);A.souvenir(p,1);assert.equal(Unova.peek(p).avenue.full.passersby,2);assert(ids(p).includes(73));p.clockSteps=(Player.gameTime(p).day+1)*Player.STEPS_PER_DAY;A.souvenir(p,0);assert.equal(Unova.peek(p).avenue.full.passersby,3);}
 const saved=Player.load(JSON.parse(Player.serialize(p))).player;assert.deepEqual(K.peek(saved),K.peek(p));
 // The C-Gear scenes: a Link Battle restores the party, a Feeling Check and Game Sync through the story.
 const said=[];let picks=[],yes=true,result='won';const env={player:()=>p,say:async t=>said.push([].concat(t).join(' ')),confirm:async()=>yes,choose:async(_,l)=>picks.length?l[picks.shift()]:l[0],canBattle:()=>true,battle:async(kind,o)=>{assert.equal(o.noPrize,true);assert.equal(o.noExp,true);p.party[0].hp=1;return result;},showWorld(){},resume:async()=>{},saveCheckpoint:async()=>{},teleport:async()=>{}},story=UnovaStory.create(env);
 const before=K.peek(p).battles,hp=p.party[0].hp;await story.run('bw:link-battle');assert.equal(K.peek(p).battles,before+1);assert.equal(p.party[0].hp,hp);
 const plays=K.peek(p).feelings;await story.run('bw:link-feeling');assert.equal(K.peek(p).feelings,plays+1);await story.run('bw:link-game-sync');await story.run('bw:link-pal-pad');assert(said.some(t=>t.startsWith('Pal Pad · 32/32')));
 console.log('ok: Pal Pad, link battles (party restored), other-version exclusive trades, Spin Trade, Feeling Check, balloon game, Funfest people, Game Sync and Join Avenue passersby');
})().catch(e=>{console.error(e);process.exitCode=1;});
