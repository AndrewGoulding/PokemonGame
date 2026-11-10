// Finite source trainer inventories, using the engine's ordinary item actions.
(function(){
 'use strict';
 function create(items){const stock=(items||[]).filter(id=>!!ItemUse.effect(id)).slice();
  function remaining(b){const left=new Map();for(const id of stock)left.set(id,(left.get(id)||0)+1);for(const e of b.events||[])if(e[0]==='-useitem'&&e[1]==='p2'&&left.get(e[2])>0)left.set(e[2],left.get(e[2])-1);return Object.fromEntries(left);}
  function choose(b){const req=b.getRequest('p2'),side=b.sides.p2,mon=side.active;if(b.doubles||b.rotation||req.phase!=='move'||!mon||mon.fainted||mon.hp<=0)return OpponentAI.choose(b,'p2');const left=remaining(b),view=b.itemView(mon),missing=mon.maxhp-mon.hp;
   for(const item of stock){if(!left[item])continue;const e=ItemUse.effect(item);if(!ItemUse.canUse(view,item,{inBattle:true}))continue;const amount=e.heal||((e.healFraction||0)*mon.maxhp),heal=!!(e.heal||e.healFraction)&&missing>0&&(mon.hp*4<=mon.maxhp||(Number.isFinite(amount)&&amount>0&&missing>=amount)),cure=!!(mon.status&&e.cure&&(e.cure==='all'||e.cure.includes(mon.status)))||!!(e.confusion&&mon.volatiles.confusion),boost=!!e.boost&&mon.activeTurns===0&&(mon.boosts[e.boost]||0)<6;if(heal||cure||boost)return{type:'item',item,target:side.pokemon.indexOf(mon)};
   }return OpponentAI.choose(b,'p2');
  }return{choose,remaining,items:Object.freeze(stock.slice())};
 }
 function forTrainer(id,p=window.Game?.player){const t=Unova.data().trainers[id]||(p&&window.UnovaBW?.trainer(p,id));return t?.items?.length?create(t.items):null;}
 window.UnovaTrainerItems={create,forTrainer};
})();
