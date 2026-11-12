'use strict';const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');global.window=global;global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};for(const[,f]of fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').matchAll(/<script src="([^"]+)"><\/script>/g))if(!f.startsWith('ui/')||/^ui\/unova-/.test(f))vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),{filename:f});
// Outdoor landmark medals (tools/lib/unova-landmarks.js): Trainer Tips signs (16, 17), Route 2 graffiti (18), Strength
// boulders (58), the Marine Tube Wailord (97), Humilau's face board (98), the TruQ (99), diamond dust (101) and the
// seasonal Ferris wheel riders (181).
const R=UnovaInteriors,L=R.data().landmarks,M=WORLD_MAPS,ids=p=>Unova.medals(p).map(m=>m.id);
(async()=>{
 assert.deepEqual(L.audit,{boulders:34,tips:19,tipFlags:18});
 for(const t of Object.values(L.tips)){const m=M[t.map];assert(m.signs.some(s=>s.x===t.x&&s.y===t.y&&s.script.startsWith('bw:landmark-tips-')),t.map);assert(/^Trainer Tips!/.test(t.text),t.map);assert(!m.collision[(t.y+1)*m.width+t.x],t.map+' readable');}
 for(const b of L.boulders){const m=M[b.map],a=m.people.filter(p=>p.localId===b.localId);assert.equal(a.length,1);assert.equal(a[0].script,'EventScript_StrengthBoulder');}
 const g=L.graffiti,gm=M[g.map];assert(!gm.collision[(g.y-1)*gm.width+g.x]&&!gm.collision[(g.y+1)*gm.width+g.x]);
 assert.deepEqual(L.truckQuiz.answers,[0,1,2,3,1]);assert(M[L.truckQuiz.map].people.some(p=>p.script==='bw:landmark-truck-quiz'));assert.equal(L.ferris.trainers.length,8);

 const p=Player.create('LANDMARKS'),s=Unova.state(p);p.party=[Party.create('Snivy',30)];
 // Signs and the graffiti are kept from before the Medal Box (event flags); medals follow once it's held.
 const tips=Object.keys(L.tips);for(const k of tips.slice(0,4))R.tip(p,k);s.medalBox=true;s.medals=[0];assert(!ids(p).includes(16));R.tip(p,tips[4]);assert(ids(p).includes(16));
 const r4=tips.filter(k=>L.tips[k].flag===0xa6b);assert.equal(r4.length,2);for(const k of r4)R.tip(p,k);for(const k of tips)R.tip(p,k);assert.equal(R.peek(p).landmarks.tips.length,18);assert(ids(p).includes(17));
 assert.equal(R.graffiti(p,'up').graffiti,undefined);assert(!ids(p).includes(18));assert(R.graffiti(p,'down').graffiti);assert(ids(p).includes(18));
 // Boulders: each moved rock counts once.
 for(const b of L.boulders.slice(0,19)){UnovaRecords.boulder(p,b.map,b.localId);UnovaRecords.boulder(p,b.map,b.localId);}UnovaRecords.boulder(p,'Route1','X');assert(!ids(p).includes(58));UnovaRecords.boulder(p,L.boulders[19].map,L.boulders[19].localId);assert(ids(p).includes(58));
 // Wailord at 15:00–16:59 in the Marine Tube; diamond dust in Icirrus on the calendar's last day.
 const at=(day,hour)=>{p.clockSteps=day*Player.STEPS_PER_DAY+hour*Player.STEPS_PER_HOUR;};at(3,14);Unova.visit(p,'UnovaMarineTube');assert(!ids(p).includes(97));at(3,16);Unova.visit(p,'UnovaMarineTube');assert(ids(p).includes(97));
 at(358,12);Unova.visit(p,'UnovaIcirrusCity');assert(!ids(p).includes(101));at(359,12);Unova.visit(p,'UnovaIcirrusCity');assert(ids(p).includes(101));
 // Face board: postgame only, once a day.
 assert(R.faceBoard(p).plain);p.flags.unovaLeagueClear=true;s.champion=true;const fb=UnovaPost.unlocked(p);if(fb){assert(R.faceBoard(p,()=>0).line===L.faceBoard.lines[0]);assert(R.faceBoard(p).plain);assert(ids(p).includes(98));}
 // TruQ: one question a day, wrong answers retry tomorrow, five right answers give Medal 99.
 at(400,12);R.truckMeet(p);assert(R.truckAnswer(p,3).wrong);assert(R.truckAnswer(p,0).closed);for(let i=0;i<5;i++){at(401+i,12);const r=R.truckAnswer(p,L.truckQuiz.answers[i]);assert(r.right,String(i));assert(!ids(p).includes(99)===(i<4));}assert(R.truckQuiz(p).done);
 // Ferris wheel: the season's rider by the player's sex, battled then ridden; all four seasons give Medal 181.
 if(fb){for(let season=0;season<4;season++){at(400+season*30+(400%120===0?0:120-400%120),12);const a=R.ferrisRider(p);assert.equal(a.season,['spring','summer','autumn','winter'][Math.floor(Player.gameTime(p).day/30)%4]);assert(!R.ferrisRide(p));p.flags[a.id]=true;assert(R.ferrisRide(p));}assert(ids(p).includes(181));}
 const saved=Player.load(JSON.parse(Player.serialize(p))).player;assert.deepEqual(R.peek(saved).landmarks,R.peek(p).landmarks);
 console.log('ok: 19 Trainer Tips signs (18 flags), graffiti from behind, 34 source Strength boulders, Wailord hour, diamond dust day, postgame daily face board, TruQ, seasonal Ferris riders and their medals'+(fb?'':' (postgame checks skipped)'));
})().catch(e=>{console.error(e);process.exitCode=1;});
