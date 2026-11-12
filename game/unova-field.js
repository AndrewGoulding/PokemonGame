(function(){
 'use strict';const F=Unova,D=F.data().field;if(!D)return;for(const[id,v]of Object.entries(D.customItems)){ITEMS[id]={...v};Bag.PRICES[id]=v.price;if(window.ITEM_SPRITES)ITEM_SPRITES[id]=v.sprite;}
 const available=(p,a)=>!a.version||a.version===(F.peek(p).version||'black2');
 function journal(p,map=p.location.map){const list=D.pickups.concat(D.hidden).filter(a=>a.map===map&&available(p,a)),hidden=list.filter(a=>a.script>=8000);return{total:list.length,found:list.filter(a=>p.flags[a.flag]).length,visible:list.length-hidden.length,hidden:hidden.length,hiddenFound:hidden.filter(a=>p.flags[a.flag]).length};}
 function gift(p){if(!p.badges.includes('insect'))return{blocked:true};return F.gift(p,'dowsing-machine',D.dowsing);}
 // The Entralink's hidden Pass Orbs come back: each found one has a one-in-five chance on the first visit of a new day (TryClearRepeatableHiddenItemFlags).
 function visit(p,map,rng=Math.random){if(!F.owns(map))return;const s=F.state(p),day=Player.gameTime(p).day;if(s.fieldRespawnDay===day)return;s.fieldRespawnDay=day;for(const a of D.hidden)if(a.respawn&&p.flags[a.flag]&&rng()<.2)delete p.flags[a.flag];}
 window.UnovaField={data:()=>D,available,journal,gift,visit};
})();
