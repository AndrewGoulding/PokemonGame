// Paldea original 2D layout verification: navigability, distinct room geometry,
// and protection for NPCs, Fly landings, warps and existing save points.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');global.window=global;
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const[,file]of html.matchAll(/<script src="([^"]+)"><\/script>/g)){
 if(!file.startsWith('ui/'))vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
}
assert(window.PaldeaLayouts&&PaldeaLayouts.count>=40,'Paldea town/interior layout module must run');
const plans=PaldeaLayouts.plans,D=Paldea.data();
let towns=0,interiors=0,anchors=0,unique=0;
for(const [name,[kind,accent]] of Object.entries(plans)){
 const m=D.maps[name],base=KALOS_DATA.maps[m.image.replace(/Classic$/,'')];
 assert(m&&base&&m.paldeaLayout,name+' has no original layout');
 assert.equal(m.top,false,name+' must not draw Kalos top tiles over Paldea artwork');
 assert.equal(m.paldeaLayout.style,kind);
 assert.equal(m.paldeaLayout.accent,accent);
 assert(m.paldeaLayout.independent,name+' must have independent geometry');
 assert.equal(m.collision.length,m.width*m.height);
 assert.equal(m.behavior.length,m.width*m.height);
 assert.equal(m.elevation.length,m.width*m.height);
 assert(m.elevation.every(z=>z===0),name+' original floor elevations must be flat');
 assert(m.collision.some(Boolean)&&m.collision.some(v=>!v),name+' must have solid and free tiles');
 const difference=m.collision.filter((v,i)=>v!==base.collision[i]).length;
 assert(difference>0,name+' must not retain borrowed Kalos collisions');
 unique+=difference;
 const events=[
  ...m.warps,...m.people,
  ...Object.values(TOWN_MAP.paldea.fly).filter(v=>v.map===name),
  ...Object.values(Player.CENTERS).filter(v=>v.map===name),
  ...(D.start.map===name?[D.start]:[])
 ];
 for(const a of events){
  assert(Number.isInteger(a.x)&&Number.isInteger(a.y),name+' invalid coordinate');
  assert(!m.collision[a.y*m.width+a.x],name+' event is blocked at '+a.x+','+a.y);
 }
 anchors+=events.length;
 // Flood-fill must connect every scripted point to the central plaza.
 const seen=new Set(),queue=[];
 const cx=Math.floor(m.width/2),cy=Math.floor(m.height/2);
 const start=cy*m.width+cx;assert(!m.collision[start],name+' hub is blocked');
 queue.push(start);seen.add(start);
 for(let n=0;n<queue.length;n++){
  const index=queue[n],x=index%m.width,y=Math.floor(index/m.width);
  for(const[dx,dy]of [[0,1],[0,-1],[1,0],[-1,0]]){
   const tx=x+dx,ty=y+dy,i=ty*m.width+tx;
   if(tx<0||ty<0||tx>=m.width||ty>=m.height||m.collision[i]||seen.has(i))continue;
   seen.add(i);queue.push(i);
  }
 }
 for(const a of events)assert(seen.has(a.y*m.width+a.x),name+' unreachable '+a.x+','+a.y);
 // Unlike a plain flood fill, these movements use the actual engine rules:
 // height changes, collision masks and one-way movement behavior all apply.
 const personOccupies=(_map,x,y)=>m.people.some(n=>n.x===x&&n.y===y);
 const walkable=[[cx,cy]];
 const walked=new Set([cx+','+cy]);
 for(let i=0;i<walkable.length;i++){
  const [x,y]=walkable[i];
  for(const dir of ['up','down','left','right']){
   const step=World.step({map:name,x,y},dir,personOccupies);
   if(!step.ok||step.warp||step.map!==name)continue;
   const key=step.x+','+step.y;
   if(!walked.has(key)){walked.add(key);walkable.push([step.x,step.y]);}
  }
 }
 // No hidden elevation steps may block the long corridor of a room.
 assert(walkable.length>=Math.min(12,Math.floor(m.width*m.height/10)),name+' engine traversal unexpectedly restricted');
 for(const a of events){
  if(m.people.includes(a)){
   const adjacent=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>walked.has((a.x+dx)+','+(a.y+dy)));
   assert(adjacent,name+' has an unapproachable NPC at '+a.x+','+a.y);
  }else if(!m.warps.includes(a)){
   assert(walked.has(a.x+','+a.y),name+' has an unreachable landing/center '+a.x+','+a.y);
  }else{
   const entry=walked.has(a.x+','+a.y)||[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>walked.has((a.x+dx)+','+(a.y+dy)));
   assert(entry,name+' has an unreachable doorway '+a.x+','+a.y);
  }
 }
 if(m.paldeaLayout.interior)interiors++;else towns++;
}
assert(towns>=10,'Custom town layouts expected');
assert(interiors>=25,'Custom interiors expected');
assert(anchors>=85,'All scripted endpoints should be verified');
const sampleNames=['PaldeaMesagoza','PaldeaCaboPoco','PaldeaMossuiTown',
 'PaldeaTerariumHub','PaldeaAcademy','PaldeaLeagueHall',
 'PaldeaCommunityCenter','PaldeaCortondoGym','PaldeaZeroLab'];
for(const name of sampleNames){
 assert(plans[name]&&D.maps[name].paldeaLayout,name+' was not assigned a custom layout');
}
for(const name of ['GalarPostwick','AlolaHome','KalosCamphrierTown']){
 assert(!D.maps[name]&&!WORLD_MAPS[name]?.paldeaLayout,name+' must remain unchanged');
}
const art=fs.readFileSync(path.join(root,'ui/paldea-art.js'),'utf8');
assert(art.includes('layout?.interior')&&art.includes('layout&&!layout.interior'),
 'Pixel renderer must match the new interior/town plan');
console.log('Paldea custom layouts: '+(towns+interiors)+' original navigable rooms/towns, '+
 anchors+' connected anchors and '+unique+' tiles changed');
