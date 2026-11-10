(function(){
 'use strict';const F=Unova,D=F.data().field;if(!D)return;for(const[id,v]of Object.entries(D.customItems)){ITEMS[id]={...v};Bag.PRICES[id]=v.price;if(window.ITEM_SPRITES)ITEM_SPRITES[id]=v.sprite;}
 function journal(p,map=p.location.map){const list=D.pickups.concat(D.hidden).filter(a=>a.map===map),hidden=list.filter(a=>a.script>=8000);return{total:list.length,found:list.filter(a=>p.flags[a.flag]).length,visible:list.length-hidden.length,hidden:hidden.length,hiddenFound:hidden.filter(a=>p.flags[a.flag]).length};}
 function gift(p){if(!p.badges.includes('insect'))return{blocked:true};return F.gift(p,'dowsing-machine',D.dowsing);}
 window.UnovaField={data:()=>D,journal,gift};
})();
