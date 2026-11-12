// Complete X/Y catalogue and individual clothing ownership, independent of Pokémon/items.
(function () {
  'use strict';
  const data=()=>Kalos.data().activities.clothing, items=()=>data().items,allItems=()=>items().concat(window.TeamFashion?.items||[]);
  const categories={hat:'Hats',shirt:'Shirts',pants:'Pants and skirts',dress:'Dresses',socks:'Socks',shoes:'Shoes',bag:'Bags',accessory:'Hat accessories'};
  const cities={santalune:'Santalune',cyllage:'Cyllage',laverre:'Laverre',anistar:'Anistar',snowbelle:'Snowbelle',lumiose:'Lumiose'};
  const clone=x=>JSON.parse(JSON.stringify(x));
  let index;
  const item=id=>(index||(index=Object.fromEntries(items().map(i=>[i.id,i]))))[id]||window.TeamFashion?.item(id)||null;
  function defaults(collection) {
    const layout={};
    for(const a of items().filter(a=>a.collection===collection&&a.default))if(!layout[a.category])layout[a.category]=a.id;
    // Serena's default high-waisted outfit is worn over her separately owned tops/bottoms.
    if(layout.dress){layout.underDress={shirt:layout.shirt,pants:layout.pants};delete layout.shirt;delete layout.pants;}
    return layout;
  }
  function state(p) {
    const s=KalosActivities.state(p);
    if(!s.fashion)s.fashion={owned:items().filter(a=>a.default).map(a=>a.id),layouts:{male:defaults('male'),female:defaults('female')},collection:'male',saved:[]};
    return s.fashion;
  }
  function collection(p){return state(p).collection;}
  function owned(p,id){return !!item(id)&&state(p).owned.includes(id);}
  function layout(p){const s=state(p);return s.layouts[s.collection];}
  function current(p){const a=p?.flags?.kalos?.activities?.appearance;return a?.clothing||null;}
  function shopName(city){return window.TeamFashion?.vendor(city)?.name||cities[city]||city;}
  function shopError(p,city) {
    if(window.TeamFashion?.vendor(city))return TeamFashion.shopError(p,city);
    if(!cities[city])return 'Unknown boutique.';
    const map=city==='lumiose'?'KalosLumioseSouth':'Kalos'+cities[city]+'City';
    const error=Kalos.allowed(p,map);if(error)return error;
    if(city==='lumiose'&&KalosActivities.state(p).style<25)return 'Boutique Couture requires 25 Lumiose style points.';
    return null;
  }
  function availability(p,id,city) {
    const a=item(id);if(!a)return 'Unknown clothing.';
    if(a.faction)return window.TeamFashion.availability(p,a,city);
    const error=shopError(p,city);if(error)return error;
    if(a.price==null)return a.default?'Included in your starting wardrobe.':'A gift from Kiloude’s artist.';
    const shop=a.shops.find(s=>s.city===city);if(!shop)return 'Sold at another boutique.';
    if(!shop.days.includes(Player.gameTime(p).weekday))return 'Not in stock today.';
    return null;
  }
  function stock(p,city,opts={}) {
    return allItems().filter(a=>(!opts.collection||a.collection===opts.collection)&&(!opts.category||a.category===opts.category)&&a.shops.some(s=>s.city===city)&&(!opts.today||!availability(p,a.id,city)));
  }
  function quote(p,ids,city,coupon=false) {
    if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)return {error:'Select different pieces for your basket.'};
    for(const id of ids){const error=availability(p,id,city);if(error)return {error};if(owned(p,id))return {error:'You already own '+item(id).name+'.'};}
    // (coupon 'used': a coupon already handed over this visit, a Mart screen's later pieces at its half price.)
    if(coupon&&coupon!=='used'&&!Player.itemCount(p,'discount-coupon'))return {error:'You do not have a Discount Coupon.'};
    const subtotal=ids.reduce((n,id)=>n+item(id).price,0),total=coupon?Math.floor(subtotal/2):subtotal;
    return {subtotal,total,coupon,affordable:p.money>=total};
  }
  // (again: a later piece of the same visit, bought one at a time on the Mart screen: one visit's style points.)
  function buy(p,ids,city,coupon=false,again=false) {
    const q=quote(p,ids,city,coupon);if(q.error)return q;if(!q.affordable)return {error:'You don’t have enough money.'};
    p.money-=q.total;if(coupon&&coupon!=='used')Player.removeItem(p,'discount-coupon',1);
    state(p).owned.push(...ids);if(!again&&!window.TeamFashion?.vendor(city))KalosActivities.style(p,2);
    return {...q,bought:ids.slice()};
  }
  function setPiece(base,a) {
    const next=clone(base);
    if(a.category==='dress'){
      if(!next.dress)next.underDress={shirt:next.shirt,pants:next.pants};
      delete next.shirt;delete next.pants;next.dress=a.id;
    }else{
      if(['shirt','pants'].includes(a.category)&&next.dress){Object.assign(next,next.underDress||{});delete next.dress;delete next.underDress;}
      next[a.category]=a.id;
    }
    return next;
  }
  function preview(p,id) {
    const a=item(id);if(!a)return null;const f=state(p),base=f.layouts[a.collection];
    return {...clone(KalosActivities.state(p).appearance),clothing:setPiece(base,a),collection:a.collection};
  }
  function apply(p,collection,next) {
    const f=state(p);f.collection=collection;f.layouts[collection]=clone(next);
    const a=KalosActivities.state(p).appearance;a.clothing=clone(next);a.collection=collection;
    return true;
  }
  function selectCollection(p,collection){if(!['male','female'].includes(collection))return false;return apply(p,collection,state(p).layouts[collection]);}
  function equip(p,id){const a=item(id);if(!a||!owned(p,id))return false;return apply(p,a.collection,setPiece(state(p).layouts[a.collection],a));}
  function remove(p,category) {
    if(!['socks','accessory'].includes(category))return false;
    const next=clone(layout(p));delete next[category];return apply(p,collection(p),next);
  }
  function reset(p){return apply(p,collection(p),defaults(collection(p)));}
  function theme(p,given=current(p),line=collection(p)) {
    if(!given)return 'Basic';
    const pieces=['hat','shirt','pants','dress','shoes','bag'].map(k=>item(given[k])).filter(Boolean);
    if(pieces.some(a=>a.tag==='Special'))return 'Special';
    const count={};for(const a of pieces)if(a.tag&&!(line==='female'&&a.category==='hat'&&a.tag==='Basic'))count[a.tag]=(count[a.tag]||0)+1;
    const max=Math.max(0,...Object.values(count)),ties=Object.keys(count).filter(t=>count[t]===max);
    if(ties.length===1)return ties[0];
    if(line==='male'){
      if(ties.includes('Classic')&&ties.includes('Colorful'))return 'Basic';
      return ties.find(t=>t!=='Basic')||'Basic';
    }
    const dress=item(given.dress)?.tag,hat=item(given.hat)?.tag;
    if(max===1)return dress||'Basic';
    if(ties.length===2){if(ties.includes('Basic')&&dress!=='Basic')return ties.find(t=>t!=='Basic');if(ties.includes(hat)&&dress!==hat)return ties.find(t=>t!==hat);}
    return 'Basic';
  }
  function artist(p) {
    if(!Kalos.peek(p).champion||!Kalos.peek(p).tmvPass)return {error:'Meet the artist after reaching Kiloude.'};
    const line=collection(p),tag=line==='male'?'Colorful':'Feminine',pieces=Object.keys(current(p)||{}).map(k=>item(current(p)[k])).filter(Boolean);
    if(pieces.filter(a=>a.tag===tag).length<3)return {error:'Wear at least three '+tag+' pieces from this collection.'};
    const reward=items().find(a=>a.collection===line&&a.gift);if(owned(p,reward.id))return {owned:true,item:reward};
    state(p).owned.push(reward.id);return {item:reward};
  }
  function saveOutfit(p,name) {
    name=String(name||'').trim().slice(0,24);if(!name||!current(p))return false;
    const f=state(p),value={name,collection:collection(p),layout:clone(layout(p))},at=f.saved.findIndex(a=>a.name===name);
    if(at<0){if(f.saved.length>=12)return false;f.saved.push(value);}else f.saved[at]=value;
    return true;
  }
  function validLayout(p,line,value) {
    if(!['male','female'].includes(line)||!value||!value.hat||!value.shoes||!value.bag)return false;
    if(value.dress?(value.shirt||value.pants):(!value.shirt||!value.pants))return false;
    for(const [slot,id]of Object.entries(value)){
      if(slot==='underDress'){
        if(!value.dress||!id||!['shirt','pants'].every(k=>owned(p,id[k])&&item(id[k]).category===k&&item(id[k]).collection===line))return false;
      }else if(!owned(p,id)||item(id).category!==slot||item(id).collection!==line)return false;
    }
    return true;
  }
  function restoreOutfit(p,index) {
    const a=state(p).saved[index];if(!a)return false;
    if(!validLayout(p,a.collection,a.layout))return false;
    return apply(p,a.collection,a.layout);
  }
  if(!ITEMS['discount-coupon'])ITEMS['discount-coupon']={name:'discount-coupon',displayName:'Discount Coupon',category:'key-items',effect:'One clothing transaction at half price. Consumed when used.'};
  window.KalosFashion={data,items,allItems,item,shopName,categories,cities,state,defaults,owned,collection,layout,current,shopError,availability,stock,quote,buy,preview,equip,remove,selectCollection,reset,theme,artist,saveOutfit,restoreOutfit};
})();
