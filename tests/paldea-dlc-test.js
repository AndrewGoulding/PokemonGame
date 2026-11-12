// Hidden Treasure of Area Zero DLC regression: Kitakami, Blueberry, captures, saves.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const[,file]of html.matchAll(/<script src="([^"]+)"><\/script>/g))
 if(!file.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
for(const file of ['ui/paldea-mid.js','ui/paldea-legends.js','ui/paldea-starfall.js',
 'ui/paldea-endgame.js','ui/paldea-dlc.js','ui/paldea-story.js'])
 vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
vm.runInThisContext(fs.readFileSync(path.join(root,'ui/paldea-art.js'),'utf8'),{filename:'ui/paldea-art.js'});
const D=Paldea.data(),R=TOWN_MAP.paldea;
assert(window.PaldeaCharacters,'Paldea cast mappings must be registered');
const castSprites=new Set();
for(const name of D.mapNames)for(const npc of D.maps[name].people){
 if(!npc.sprite.startsWith('paldea/'))continue;
 castSprites.add(npc.sprite);
 assert.equal(npc.width,32);
 assert.equal(npc.height,32);
 assert.equal(npc.frames,9);
}
assert(PaldeaCharacters.count>=30,'Named Paldea story NPCs should use individual pixel sheets');
assert(castSprites.size>=20,'At least 20 distinct named character appearances');
for(const sprite of castSprites){
 const file=path.join(root,'assets/world/sprites',sprite+'.svg');
 assert(fs.existsSync(file),'Missing Paldea character artwork '+sprite);
 const data=fs.readFileSync(file,'utf8');
 assert(/width="288"/.test(data)&&/height="32"/.test(data),sprite+' should use 9 frames at 32x32');
 assert((data.match(/transform="translate\(/g)||[]).length===9,sprite+' lacks directional frames');
 const colors=[...data.matchAll(/fill="([^"]+)"/g)].map(m=>m[1]);
 assert(colors.length>35,'Sprite sheet needs substantial colored detail: '+sprite);
 assert(colors.every(color=>/^#[0-9a-fA-F]{6}$/.test(color)),sprite+' has an invalid SVG paint color');
 assert(!/<image\b/.test(data),sprite+' must have self-contained vector pixels');
}
const overworldSource=fs.readFileSync(path.join(root,'ui/overworld.js'),'utf8');
assert(overworldSource.includes('name.startsWith("paldea/") ? ".svg" : ".png"'),
 'The overworld renderer must load Paldea SVG sprites without affecting legacy PNG sheets');
assert.equal(PaldeaCharacters.forScript('sv:teal-carmine'),'paldea/carmine');
assert.equal(PaldeaCharacters.forScript('sv:nemona-mesagoza'),'paldea/nemona');
assert.equal(PaldeaCharacters.forScript('swsh:guide'),null);

assert.equal(D.mapNames.length,98,'76 mainland + 22 DLC areas');
assert.equal(D.dlc.mapNames.length,22);
assert.equal(D.dlc.kitakami.length,8);
assert.equal(D.dlc.blueberry.length,14);
assert.deepEqual(D.dlc.blueberryElite,['Crispin','Lacey','Amarys','Drayton']);
for(const name of D.mapNames){
 const m=D.maps[name];assert(m&&Paldea.owns(name),name+' missing map');
 assert.equal(m.collision.length,m.width*m.height);
 assert(R.at[name]&&R.mapSections[name],name+' not on regional map');
 for(const w of m.warps){
  assert(D.maps[w.map],name+' invalid warp to '+w.map);
  assert.equal(D.maps[w.map].warps[w.warp]?.map,name,name+' nonreciprocal warp');
  assert.equal(m.collision[w.y*m.width+w.x],0,name+' blocked warp');
 }
 for(const npc of m.people){
  assert.equal(m.collision[npc.y*m.width+npc.x],0,name+' blocked NPC');
  assert(!m.warps.some(w=>w.x===npc.x&&w.y===npc.y),name+' NPC on warp');
 }
}
for(const name of ['PaldeaMossuiTown','PaldeaTerariumHub']){
 const sec=R.mapSections[name],landing=R.fly[sec];
 assert(landing&&landing.map===name,'missing DLC Fly point '+name);
 assert(!D.maps[name].collision[landing.y*D.maps[name].width+landing.x]);
}
// Pixel scenery: each biome gets a distinct deterministic drawing palette.
 assert.equal(PaldeaArt.style('PaldeaMossuiTown'),'village');
 assert.equal(PaldeaArt.style('PaldeaLoyaltyPlaza'),'festival');
 assert.equal(PaldeaArt.style('PaldeaSavannaBiome'),'savanna');
 assert.equal(PaldeaArt.style('PaldeaCoastalBiome'),'tropical');
 assert.equal(PaldeaArt.style('PaldeaCanyonBiome'),'canyon');
 assert.equal(PaldeaArt.style('PaldeaPolarBiome'),'polar');
 assert.equal(PaldeaArt.style('PaldeaTerariumHub'),'blueberry');
 assert.equal(PaldeaArt.style('PaldeaUnderdepths'),'crystal');
 assert.equal(PaldeaArt.style('PaldeaTerapagosChamber'),'chamber');
 assert.equal(PaldeaArt.style('GalarPostwick'),null);
 for(const [name,landmark] of [
  ['PaldeaAcademy','academy'],['PaldeaMossuiTown','lantern'],
  ['PaldeaLoyaltyPlaza','masks'],['PaldeaTerariumHub','dome'],
  ['PaldeaSavannaBiome','savanna'],['PaldeaCoastalBiome','coast'],
  ['PaldeaCanyonBiome','cliff'],['PaldeaPolarBiome','snow'],
  ['PaldeaUnderdepths','crystal'],['PaldeaTerapagosChamber','terapagos']
 ])assert.equal(PaldeaArt.LANDMARKS[name],landmark,name+' landmark missing');
 let canvasCreates=0,tileRects=0,imageDraws=0,activeCanvas=null;
 const priorDocument=global.document;
 global.document={createElement(tag){
  assert.equal(tag,'canvas');canvasCreates++;
  return{width:0,height:0,getContext:()=>({fillStyle:'',fillRect(){tileRects++;}})};
 }};
 const scene={drawImage(cv){imageDraws++;activeCanvas=cv;}};
 PaldeaArt.draw(scene,'PaldeaMossuiTown',10,20);
 assert(activeCanvas&&activeCanvas.width===D.maps.PaldeaMossuiTown.width*16);
 assert(tileRects>100,'Procedural scenery should draw actual pixel tiles');
 PaldeaArt.draw(scene,'PaldeaMossuiTown',15,25);
 assert.equal(canvasCreates,1,'Revisiting a map reuses cached pixel scenery');
 PaldeaArt.draw(scene,'PaldeaPolarBiome',10,20);
 assert.equal(canvasCreates,2,'Different biomes have distinct art');
 PaldeaArt.draw(scene,'GalarPostwick',0,0);
 assert.equal(imageDraws,3,'Paldea art must never override other regions');
 PaldeaArt.clear();
 PaldeaArt.draw(scene,'PaldeaMossuiTown',10,20);
 assert.equal(canvasCreates,3,'Cache clear rebuilds maps');
 global.document=priorDocument;
assert(Player.CENTERS.PaldeaCommunityCenter,'Kitakami needs a real healing center');
assert(Player.CENTERS.PaldeaTerariumHub,'Blueberry needs a real healing center');
assert(D.maps.PaldeaTerariumHub.people.some(n=>n.script==='sv:heal'),'Blueberry nurse missing');
const p=Player.create('Paldea DLC Tester'),s=Paldea.state(p);
p.party=[Party.create('Skeledirge',85),Party.create('Tinkaton',85)];
p.location={map:'PaldeaAcademy',x:10,y:13,facing:'down'};
let won=true,wildOutcome='caught',wrongChoice=false,saves=0,battles=[],wilds=[],speech=[],portraits=[],arenas=[];
const env={
 player:()=>p,say:async t=>speech.push(t),confirm:async()=>true,
 showPicture:species=>portraits.push('show:'+species),hidePicture:()=>portraits.push('hide'),
 choose:async(_,choices)=>wrongChoice?choices.at(-1):choices[0],canBattle:()=>true,
 showWorld(){},resume:async()=>{},
 saveCheckpoint:async()=>{saves++;},
 battle:async(_kind,opts)=>{battles.push({id:opts.trainerId,double:!!opts.double,terrain:opts.terrain});return won?'won':'lost';},
 wildEncounter:async (mon,opts)=>{wilds.push(mon.species);arenas.push(opts.terrain);if(wildOutcome==='caught')Player.receive(p,mon);return wildOutcome;},
 teleport:async to=>{p.location={...to};Paldea.visit(p,to.map);}
};
const story=PaldeaStory.create(env),go=x=>story.run('sv:'+x);
(async()=>{
 assert(Paldea.allowed(p,'PaldeaKitakamiBus'),'DLC locked before main story');
 assert(Paldea.allowed(p,'PaldeaMossuiTown'));
 await go('teal-briar');assert(!s.tealArrival);
 s.paldeaClear=true;
 assert.equal(Paldea.allowed(p,'PaldeaKitakamiBus'),null);
 await go('teal-briar');assert(s.tealArrival);
 assert.equal(Paldea.allowed(p,'PaldeaMossuiTown'),null);
 won=false;await go('teal-carmine');assert(!s.tealCarmineClear);
 won=true;await go('teal-carmine');assert(s.tealCarmineClear);
 assert.equal(Paldea.allowed(p,'PaldeaAppleHills'),null);
 await go('teal-kieran');assert(s.tealKieranFirst);
 wrongChoice=true;await go('teal-festival');assert(!s.tealFestival,'Wrong mask should not finish festival');
 wrongChoice=false;await go('teal-festival');assert(s.tealFestival);
 await go('teal-kieran-final');assert(!s.tealKieranFinal,'Loyal Three required');
 won=false;await go('teal-loyal-0');assert(!s.tealLoyal0);
 won=true;
 for(let i=0;i<3;i++)await go('teal-loyal-'+i);
 assert(s.tealLoyalThree);
 const beforeLoyal=battles.length;await go('teal-loyal-0');
 assert.equal(battles.length,beforeLoyal,'Loyal Three not farmable');
 assert.equal(Paldea.allowed(p,'PaldeaDreadedDen'),null);
 won=false;await go('teal-kieran-final');assert(!s.tealKieranFinal);
 won=true;await go('teal-kieran-final');assert(s.tealKieranFinal);
 wildOutcome='won';await go('teal-ogerpon');assert(!s.tealClear);
 wildOutcome='caught';await go('teal-ogerpon');
 assert(s.tealClear&&s.tealOgerponCaught);
 assert(Player.hasCaught(p,'Ogerpon'));
 const beforeCapture=wilds.length;await go('teal-ogerpon');
 assert.equal(wilds.length,beforeCapture,'Ogerpon cannot duplicate');
 assert.equal(Paldea.allowed(p,'PaldeaBlueberryDock'),null);
 await go('indigo-crispin');assert(!s.indigoElitecrispin,'registration required');
 await go('indigo-briar');assert(s.indigoArrival);
 await go('indigo-club');assert(s.indigoEnrollment);
 assert.equal(Paldea.allowed(p,'PaldeaSavannaTrial'),null);
 assert(Paldea.allowed(p,'PaldeaKieranArena'),'need BB Elite Four');
 wrongChoice=true;
 const beforeTrial=battles.length;await go('indigo-crispin');
 assert(!s.indigoTrialcrispin&&!s.indigoElitecrispin,'Failed cooking trial cannot award victory');
 assert.equal(battles.length,beforeTrial,'Failed cooking trial cannot start battle');
 wrongChoice=false;
 won=false;await go('indigo-crispin');assert(!s.indigoElitecrispin);
 assert(s.indigoTrialcrispin,'Passed trial should persist after losing the battle');
 won=true;
 for(const [key,flag]of [
  ['indigo-crispin','indigoElitecrispin'],
  ['indigo-lacey','indigoElitelacey'],
  ['indigo-amarys','indigoEliteamarys'],
  ['indigo-drayton','indigoElitedrayton']
 ]){
  await go(key);assert(s[flag],flag+' must be saved');
  assert(s['indigoTrial'+key.replace('indigo-','')],'Blueberry trial must be completed: '+key);
  const end=battles.length;await go(key);
  assert.equal(battles.length,end,key+' cannot duplicate');
 }
 assert(s.indigoEliteClear);
 assert(battles.some(b=>b.id==='SV_INDIGO_ELITE_CRISPIN'&&b.double),
  'Blueberry challenges must use double battles');
 assert.equal(Paldea.allowed(p,'PaldeaKieranArena'),null);
 won=false;await go('indigo-kieran');assert(!s.indigoKieranClear);
 won=true;await go('indigo-kieran');assert(s.indigoKieranClear&&s.indigoChampion);
 assert(Paldea.allowed(p,'PaldeaUnderdepths')===null);
 won=false;await go('indigo-depths');assert(!s.indigoUnderdepthsClear);
 won=true;await go('indigo-depths');assert(s.indigoUnderdepthsClear);
 assert.equal(Paldea.allowed(p,'PaldeaTerapagosChamber'),null);
 wildOutcome='won';await go('indigo-terapagos');assert(!s.indigoClear);
 wildOutcome='caught';await go('indigo-terapagos');
 assert(s.indigoClear&&s.hiddenTreasureClear);
 assert(Player.hasCaught(p,'Terapagos'));
 const afterTerapagos=wilds.length;await go('indigo-terapagos');
 assert.equal(wilds.length,afterTerapagos);
 wildOutcome='won';await go('teal-epilogue');assert(!s.mochiMayhemClear);
 wildOutcome='caught';await go('teal-epilogue');
 assert(s.mochiMayhemClear&&Player.hasCaught(p,'Pecharunt'));
 assert(story.goal().includes('both DLC stories'));
 assert(battles.some(b=>b.id==='SV_INDIGO_ELITE_CRISPIN'&&b.terrain==='sand'),'Crispin arena');
 assert(battles.some(b=>b.id==='SV_INDIGO_ELITE_LACEY'&&b.terrain==='grass'),'Lacey arena');
 assert(battles.some(b=>b.id==='SV_INDIGO_ELITE_AMARYS'&&b.terrain==='mountain'),'Amarys arena');
 assert(battles.some(b=>b.id==='SV_INDIGO_ELITE_DRAYTON'&&b.terrain==='cave'),'Drayton arena');
 assert(battles.some(b=>b.id==='SV_INDIGO_KIERAN'&&b.terrain==='champion'),'Kieran arena');
 assert(arenas.includes('mountain')&&arenas.includes('cave')&&arenas.includes('longgrass'),'Legendary environment backgrounds');
 for(const species of ['Ogerpon','Terapagos','Pecharunt'])
  assert(portraits.includes('show:'+species),species+' Pokédex portrait was not shown');
 assert(portraits.filter(v=>v==='hide').length>=3,'Legendary portraits must be dismissed');
 const loaded=Player.load(JSON.parse(Player.serialize(p))).player;
 assert(Paldea.peek(loaded).tealClear&&Paldea.peek(loaded).indigoClear);
 assert(Paldea.peek(loaded).mochiMayhemClear);
 assert.equal(Paldea.peek(loaded).version,s.version);
 assert(saves>=20&&battles.length>=10&&speech.length>=20);
 console.log('Paldea DLC: 22 connected maps, Teal Mask, Indigo Disk, double battles, legendary captures and saves');
})().catch(e=>{console.error(e);process.exitCode=1;});
