'use strict';
// Drives native menus. The cursor wrapper only observes the UI; battle choices
// are entered with the same keys as a player, including forced switches.
module.exports=async function(s){
 await s.eval(()=>{const original=GbaMenus.battleMoves;GbaMenus.battleMoves=(canvas,opts)=>{window.__unovaMoveCursor=opts.cursor||0;return original(canvas,{...opts,onCursor:c=>{window.__unovaMoveCursor=c;opts.onCursor?.(c);}});};});
 async function step(){
  const slot=await s.eval(()=>{const b=BattleScreen._test.battle;return PartyMenu.showing&&b&&!b.ended&&b.getRequest('p1').phase==='switch'?b.sides.p1.pokemon.findIndex(m=>m.hp>0&&!m.active):-1;});
  if(slot>=0){await s.press('Escape');await s.press('ArrowLeft');for(let i=0;i<slot;i++)await s.press('ArrowDown');await s.press('z');await s.press('z');return;}
  if(await s.eval(()=>GbaMenus.showing==='moves')){const pick=await s.eval(()=>{const b=BattleScreen._test.battle,m=b.sides.p1.active,f=b.sides.p2.actives.find(m=>m&&!m.fainted)||b.sides.p2.active;let best=0,score=-1;for(const[i,a]of m.moves.entries()){const v=MOVES[a.name];if(!a.pp||!v?.power)continue;const q=v.power*Damage.typeEffectiveness(v.type,f.types)*(m.types.includes(v.type)?1.5:1)*(v.cat==='Physical'?m.stats.atk/f.stats.def:m.stats.spa/f.stats.spd);if(q>score){score=q;best=i;}}return{best,cursor:window.__unovaMoveCursor||0};});if((pick.best^pick.cursor)&1)await s.press('ArrowRight');if((pick.best^pick.cursor)&2)await s.press('ArrowDown');await s.press('z');return;}
  await s.press('z',65);
 }
 async function until(fn,label,n=1600,arg){for(let i=0;i<n;i++){if(await s.eval(fn,arg))return;await step();}throw Error(label+' stalled '+JSON.stringify(await status()));}
 async function status(){return s.eval(()=>({at:Overworld.position(),party:PartyMenu.showing,menu:GbaMenus.showing,state:Unova.peek(Game.player),battle:BattleScreen._test.battle&&{turn:BattleScreen._test.battle.turn,phase:BattleScreen._test.battle.getRequest('p1').phase,p1:BattleScreen._test.battle.sides.p1.pokemon.map(m=>[m.species,m.hp]),foe:BattleScreen._test.battle.sides.p2.active?.species}}));}
 async function npc(script){await s.page.waitForFunction(()=>Overworld.idle());await s.wait(650);await s.eval(script=>{Game.player.party.forEach(Party.heal);for(const[map,m]of Object.entries(WORLD_MAPS)){const a=m.people.find(a=>a.script===script);if(!a)continue;const d=[[0,1,'up'],[1,0,'left'],[-1,0,'right'],[0,-1,'down']].find(([dx,dy])=>!m.collision[(a.y+dy)*m.width+a.x+dx]&&!m.people.some(b=>b.x===a.x+dx&&b.y===a.y+dy));if(!d)throw Error('No approach '+script);return Overworld.teleport({map,x:a.x+d[0],y:a.y+d[1],facing:d[2]});}throw Error(script);},script);await s.wait(650);await s.press('z');}
 return{step,until,npc,status};
};
