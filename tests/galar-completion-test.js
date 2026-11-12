// Galar completion regressions: bespoke maps, weather, raids, captures and side quests.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const[,file]of html.matchAll(/<script src="([^"]+)"><\/script>/g))
 if(!file.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
for(const file of ['ui/galar-mid.js','ui/galar-finale.js','ui/galar-dlc.js',
 'ui/galar-features.js','ui/galar-extras.js','ui/galar-art.js','ui/galar-story.js'])
 vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
function accessible(m){
 const starts=[...m.warps,...m.people,
  ...Object.values(TOWN_MAP.galar.fly).filter(p=>p.map===m.name),
  ...Object.values(Player.CENTERS).filter(p=>p.map===m.name)];
 assert(starts.length,m.name+' has no reachable entrances');
 const start=starts[0],w=m.width,h=m.height,seen=new Set([start.y*w+start.x]),stack=[start.y*w+start.x];
 while(stack.length){
  const u=stack.pop(),x=u%w,y=Math.floor(u/w);
  for(const [dx,dy]of [[0,1],[0,-1],[1,0],[-1,0]]){
   const xx=x+dx,yy=y+dy,j=yy*w+xx;
   if(xx<0||xx>=w||yy<0||yy>=h||m.collision[j]||seen.has(j))continue;
   seen.add(j);stack.push(j);
  }
 }
 for(const a of starts){
  const i=a.y*w+a.x;
  assert.equal(m.collision[i],0,m.name+' blocked anchor '+a.x+','+a.y);
  assert(seen.has(i),m.name+' unreachable anchor '+a.x+','+a.y);
 }
}
(async()=>{
 const D=Galar.data(),W=GalarWild,F=GalarFeaturesStory,X=GalarExtrasStory;
 assert.equal(D.mapNames.length,90);assert.equal(Object.keys(TOWN_MAP.galar.at).length,90);
 assert.equal(W.dens.length,8);
 assert(W.dens.some(d=>d.map==='GalarChallengeBeach'));
 assert(W.dens.some(d=>d.map==='GalarBallimereLake'));
 assert(W.dens.every(d=>D.maps[d.map]));
 for(const name of D.mapNames){
  const m=D.maps[name];
  assert(m.galarCustomLayout,name+' did not receive custom geometry');
  assert.equal(m.collision.length,m.width*m.height);
  assert.equal(m.behavior.length,m.width*m.height);
  for(const w of m.warps){
   assert(D.maps[w.map],name+' invalid warp target');
   assert.equal(D.maps[w.map].warps[w.warp]?.map,name,name+' non-reciprocal warp');
  }
  accessible(m);
 }
 assert.equal(GalarArt.style('GalarGlimwoodTangle'),'forest');
 assert.equal(GalarArt.style('GalarFrostpointField'),'snow');
 const p=Player.create('Galar Completion Tester'),s=Galar.state(p);
 p.party=[Party.create('Cinderace',80),Party.create('Corviknight',80)];
 p.location={map:'GalarWedgehurst',x:20,y:15,facing:'down'};
 Player.addItem(p,'poke-ball',12);
 Object.assign(s,{starter:'Scorbunny',ceremony:true,endorsement:true,championClear:true,raihanClear:true,
  peonyMet:true,armorArrival:true,crownArrival:true,armorClear:true,crownClear:true,roseWon:true,
  swordwardWon:true,shieldbertWon:true});
 const originalMap=p.location.map;
 Galar.visit(p,p.location.map);
 assert.equal(Player.itemCount(p,'dynamax-band'),1,'old save should recover the Dynamax Band');
 Galar.visit(p,p.location.map);assert.equal(Player.itemCount(p,'dynamax-band'),1,'band must not duplicate');
 const zone='GalarWildAreaSouth',a=W.weather(p,zone);p.clockSteps=(p.clockSteps||1000)+2400;
 assert.notEqual(W.weather(p,zone),a,'weather should change with the in-game day');
 assert.equal(W.weather(p,'GalarFrostpointField'),'snow');
 assert.equal(W.weather(p,'GalarMotostoke'),null);
 const den=W.raid(p,0);assert(den&&den.species&&den.stars>=1);
 assert.deepEqual(W.raid(p,0),den);W.clear(p,0);assert.equal(W.raid(p,0),null,'den cooldown same day');
 p.clockSteps+=2400;assert(W.raid(p,0),'den reactivates on a new day');
 const roam=W.roamer(p,0);assert(roam&&roam.species&&roam.level);
 let saves=0,speech=[],wildOutcome='caught',raidOutcome='won',doubles=0,trainer=0;
 const env={
  player:()=>p,say:async x=>speech.push(x),confirm:async()=>true,
  choose:async(_,options)=>options[0],canBattle:()=>true,
  battle:async()=>{trainer++;return'won';},
  galarDoubleBattle:async()=>{doubles++;return'won';},
  galarRaid:async()=>raidOutcome,
  wildEncounter:async mon=>{if(wildOutcome==='caught')Player.receive(p,mon);return wildOutcome;},
  showWorld(){},resume:async()=>{},mart:async()=>{},saveCheckpoint:async()=>{saves++;},
  teleport:async loc=>{p.location={...loc};Galar.visit(p,loc.map);}
 };
 const story=GalarStory.create(env),go=k=>story.run('swsh:'+k);
 const balls=Player.itemCount(p,'poke-ball');
 raidOutcome='lost';await go('galar-den-0');assert.equal(Player.itemCount(p,'poke-ball'),balls);
 raidOutcome='won';await go('galar-den-0');
 assert.equal(s.raidCatches,1);assert.equal(Player.itemCount(p,'poke-ball'),balls-1);
 assert(Player.hasCaught(p,den.species)||s.raidCatches);
 assert.equal(W.raid(p,0),null);
 p.clockSteps+=2400;
 await go('galar-roamer-0');assert(Object.keys(s.roamers||{}).length===1);
 const before=saves;await go('galar-roamer-0');assert.equal(saves,before,'roamer cannot duplicate the same day');
 wildOutcome='won';await go('eternatus');assert(!s.eternatusClear,'knockout is not a capture');
 wildOutcome='caught';await go('eternatus');
 assert(s.eternatusClear&&Player.hasCaught(p,'Eternatus'));
 await go('zacian');await go('zamazenta');assert(s.zacianWon&&s.zamazentaWon);
 assert(Player.hasCaught(p,'Zacian')&&Player.hasCaught(p,'Zamazenta'));
 for(let i=0;i<10;i++)await go('diglett-'+i);
 assert.equal(s.diglettFound.length,10);assert(s.diglettReward);
 const candy=Player.itemCount(p,'rare-candy');await go('diglett-0');
 assert.equal(Player.itemCount(p,'rare-candy'),candy,'Diglett rewards must be single-use');
 for(let i=0;i<3;i++)await go('footprint-'+i);
 assert(s.swordsUnlocked);
 wildOutcome='won';await go('sword-0');assert(!(s.swordsCaught||[]).length);
 wildOutcome='caught';for(let i=0;i<4;i++)await go('sword-'+i);
 assert.equal(s.swordsCaught.length,4);assert(Player.hasCaught(p,'Keldeo'));
 for(let i=0;i<3;i++)await go('dojo-sparring');
 assert.equal(s.dojoSparring.wins,3);
 for(let i=0;i<3;i++)await go('galar-star-tournament');
 assert.equal(s.starTournament.titles,1);assert.equal(doubles,3);
 // Camp consumes a berry, restores the party and survives serialization.
 assert.equal(D.maps.GalarWildAreaSouth.people.filter(n=>n.script==='swsh:camp-south').length,1);
 Player.addItem(p,'oran-berry',2);const berryCount=Player.itemCount(p,'oran-berry');
 const initialMeals=(s.camp?.meals||0);
 await go('camp-south');
 assert.equal(Player.itemCount(p,'oran-berry'),berryCount-1);
 assert.equal(s.camp.meals,initialMeals+1);
 await go('camp-north');assert.equal(Player.itemCount(p,'oran-berry'),berryCount-1,'same-day camp cannot duplicate cooking');
 p.clockSteps+=2400;await go('camp-north');
 assert.equal(s.camp.meals,initialMeals+2);
 // Watt Rally wins credit regional currency once per day, while the trader
 // spends currency only when the Bag accepts the item.
 const rallyBattles=trainer;
 await go('watt-rally-south');assert.equal(s.wattRally.watts,200);
 await go('watt-rally-south');assert.equal(s.wattRally.watts,200);
 assert.equal(trainer,rallyBattles+1);
 await go('watt-exchange');assert.equal(s.wattRally.watts,0);
 p.clockSteps+=2400;await go('watt-rally-south');
 assert.equal(s.wattRally.watts,200);
 await go('watt-rally-north');assert.equal(s.wattRally.watts,400);
 const m=D.maps['GalarWedgehurst'],blocked=m.collision.findIndex((v,i)=>v&&i%m.width>1&&i%m.width<m.width-2&&i/m.width>1);
 assert(blocked>0,'need a blocked tile for same-map save recovery');
 p.location={map:'GalarWedgehurst',x:blocked%m.width,y:Math.floor(blocked/m.width),facing:'down'};
 assert(Galar.recover(p));assert.equal(p.location.map,originalMap);
 assert.equal(m.collision[p.location.y*m.width+p.location.x],0);
 const loaded=Player.load(JSON.parse(Player.serialize(p))).player;
 assert.equal(Galar.peek(loaded).camp.meals,initialMeals+2);
 assert.equal(Galar.peek(loaded).wattRally.watts,400);
 assert(Galar.peek(loaded).swordsUnlocked);assert.equal(Galar.peek(loaded).diglettFound.length,10);
 assert.equal(Galar.peek(loaded).starTournament.titles,1);
 assert(saves>20&&speech.length>20);
 console.log('Galar completion: 90 connected maps, Dynamax Band, raids, weather, legendary captures, DLC quests, and saves');
})().catch(e=>{console.error(e);process.exitCode=1;});
