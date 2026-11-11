// A keyboard/touch fitting room with non-destructive previews and an atomic purchase basket.
(function () {
  'use strict';
  const el=(p,t,text)=>{const n=document.createElement(t);if(text!=null)n.textContent=text;p.append(n);return n;};
  const button=(p,text,fn)=>{const b=el(p,'button',text);b.type='button';b.onclick=fn;return b;};
  async function open(host,p,city=null) {
    const F=KalosFashion,shop=city!=null;
    const root=el(host,'div');root.className='xy-fashion';root.setAttribute('role','dialog');root.setAttribute('aria-label',shop?'Kalos boutique':'Kalos wardrobe');
    el(root,'style').textContent=`.xy-fashion{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;gap:6px;padding:12px;box-sizing:border-box;background:#f5f0e8;color:#343b50;font:13px monospace}.xy-fashion *{box-sizing:border-box}.xy-fashion h2{font-size:17px;margin:0}.xy-fashion button,.xy-fashion input{font:inherit;min-height:32px;padding:6px;border:1px solid #aaa2a1;border-radius:4px;background:#fffdf9;color:#343b50}.xy-fashion button:focus,.xy-fashion input:focus{outline:3px solid #c89441;outline-offset:1px}.xy-fashion button:disabled{opacity:.5}.xy-fashion button[aria-pressed=true]{background:#d6e8e2}.xy-fashion nav{display:flex;flex-wrap:wrap;gap:4px}.xy-fashion .fashion-body{display:flex;min-height:0;flex:1;gap:10px}.xy-fashion .fashion-list{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:5px;align-content:start}.xy-fashion .fashion-list button{text-align:left;white-space:pre-line;min-height:70px}.xy-fashion aside{width:210px;flex-shrink:0;display:flex;flex-direction:column;gap:5px;min-height:0;overflow:hidden}.xy-fashion canvas{image-rendering:pixelated;width:96px;height:96px;flex-shrink:0;background:#e4e6e3;border:1px solid #ccc}.xy-fashion .fashion-actions{display:flex;flex-wrap:wrap;gap:5px;flex-shrink:0}.xy-fashion .fashion-detail{white-space:pre-line;line-height:1.3;font-size:11px;margin:0;overflow:auto;flex:1;min-height:25px}.xy-fashion footer{font-size:11px}.xy-fashion .fashion-swatch{display:inline-block;width:14px;height:14px;margin-right:6px;border:1px solid #666}.xy-fashion .fashion-status{min-height:18px;white-space:pre-line}@media(max-width:600px){.xy-fashion aside{width:145px}.xy-fashion .fashion-list{grid-template-columns:1fr}}`;
    const title=el(root,'h2',shop?F.cities[city]+' Boutique':'Your wardrobe'),status=el(root,'div');status.className='fashion-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const collections=el(root,'nav'),filters=el(root,'nav'),categories=el(root,'nav'),body=el(root,'div');body.className='fashion-body';
    const list=el(body,'div');list.className='fashion-list';list.setAttribute('aria-label','Clothing pieces');
    const aside=el(body,'aside'),canvas=el(aside,'canvas');canvas.width=canvas.height=64;canvas.setAttribute('aria-label','Outfit preview');
    const details=el(aside,'p');details.className='fashion-detail';const actions=el(aside,'div');actions.className='fashion-actions';
    const basketInfo=el(root,'div'),basketActions=el(root,'div');basketInfo.style.fontSize='11px';basketActions.className='fashion-actions';
    const wardrobeActions=el(root,'div');wardrobeActions.className='fashion-actions';wardrobeActions.style.maxHeight='85px';wardrobeActions.style.overflow='auto';
    const footer=el(root,'footer','Arrows navigate · A select · B / Esc close · Previewing never spends money or changes your outfit.');
    let line=F.collection(p),category='hat',view=shop?'today':'owned',selected=null,basket=[],coupon=false,preview=null,previewToken=0,done,closing=false;
    const collectionLabels={male:'Calem collection',female:'Serena collection'},dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const image=new Image();image.loaded=new Promise(r=>{image.onload=image.onerror=r;});image.src='assets/sprites/trainers/front/player_character.png';
    const save=()=>{if(window.Save?.write)Save.write(p);};
    function describe(a){if(!a)return '';const locations=a.shops.map(s=>F.cities[s.city]+' · '+s.days.map(d=>dayNames[d]).join('/')).join('\n');return a.name+' · '+a.color+'\n'+(a.tag?('Tag: '+a.tag+'\n'):'')+(a.price!=null?'Price: ¥'+a.price.toLocaleString():a.default?'Starting wardrobe':a.gift)+'\n'+locations;}
    async function draw() {
      const token=++previewToken;await image.loaded;if(token!==previewToken||closing)return;
      const a=preview||KalosActivities.state(p).appearance,proxy={...p,flags:{...p.flags,kalos:{...p.flags.kalos,activities:{...KalosActivities.state(p),appearance:a}}}},img=CharacterStyle.render(image,proxy),g=canvas.getContext('2d');g.clearRect(0,0,64,64);g.imageSmoothingEnabled=false;if(img.naturalWidth)g.drawImage(img,0,0,64,64);
    }
    function refreshActions() {
      actions.replaceChildren();const a=F.item(selected);details.textContent=a?describe(a):'Choose a piece to preview it.\nMoney: ¥'+p.money.toLocaleString()+'\nOwned: '+F.state(p).owned.length+'/307';
      if(a){
        if(F.owned(p,a.id))button(actions,'Wear selected',()=>{F.equip(p,a.id);preview=null;save();status.textContent='Wearing '+a.name+'. Theme: '+F.theme(p)+'.';refresh();});
        else if(shop){const b=button(actions,basket.includes(a.id)?'Remove from basket':'Add to basket',()=>{basket=basket.includes(a.id)?basket.filter(id=>id!==a.id):[...basket,a.id];refreshActions();});const error=F.availability(p,a.id,city);b.disabled=!!error;if(error)status.textContent=error;}
      }
      basketActions.replaceChildren();
      if(shop){
        const q=basket.length?F.quote(p,basket,city,coupon):null;
        basketInfo.textContent=basket.length+' pieces · '+(q?.error?q.error:'Total: ¥'+(q?.total||0).toLocaleString())+'\nMoney: ¥'+p.money.toLocaleString();
        if(Player.itemCount(p,'discount-coupon')){const b=button(basketActions,'Use Discount Coupon',()=>{coupon=!coupon;refreshActions();});b.setAttribute('aria-pressed',String(coupon));}
        const buy=button(basketActions,'Buy basket',()=>{const r=F.buy(p,basket,city,coupon);if(r.error){status.textContent=r.error;return;}basket=[];coupon=false;save();status.textContent='Purchased '+r.bought.length+' pieces for ¥'+r.total.toLocaleString()+'. Select an owned piece to wear it.';refresh();});buy.disabled=!q||!!q.error||!q.affordable;
        if(basket.length)button(basketActions,'Empty basket',()=>{basket=[];refreshActions();});
      }else basketInfo.textContent='Theme: '+F.theme(p)+'\nOwned: '+F.state(p).owned.length+'/307';
    }
    function refresh() {
      const active=document.activeElement,focusKey=active?.dataset?.item||active?.dataset?.category||active?.dataset?.collection,focusText=active?.textContent;
      collections.replaceChildren();for(const sex of ['male','female']){const b=button(collections,collectionLabels[sex],()=>{line=sex;if(category==='dress'&&sex==='male')category='hat';selected=null;preview=null;refresh();});b.dataset.collection=sex;b.setAttribute('aria-pressed',String(line===sex));}
      filters.replaceChildren();const modes=shop?{today:'Today’s stock',all:'Full catalogue',owned:'Owned'}:{owned:'Owned',all:'Full catalogue'};
      for(const [key,label]of Object.entries(modes)){const b=button(filters,label,()=>{view=key;selected=null;preview=null;refresh();});b.setAttribute('aria-pressed',String(view===key));}
      if(!shop)button(filters,'Wear collection defaults',()=>{F.selectCollection(p,line);F.reset(p);preview=null;save();refresh();});
      categories.replaceChildren();for(const [key,label]of Object.entries(F.categories)){if(key==='dress'&&line==='male')continue;const b=button(categories,label,()=>{category=key;selected=null;preview=null;refresh();});b.dataset.category=key;b.setAttribute('aria-pressed',String(category===key));}
      list.replaceChildren();const candidates=F.items().filter(a=>a.collection===line&&a.category===category&&(view!=='owned'||F.owned(p,a.id))&&(view!=='today'||a.shops.some(s=>s.city===city&&s.days.includes(Player.gameTime(p).weekday))));
      for(const a of candidates){const b=button(list,'',()=>{selected=a.id;preview=F.preview(p,a.id);status.textContent='Preview · '+a.name+' · '+a.color;refreshActions();draw();});b.dataset.item=a.id;b.setAttribute('aria-pressed',String(selected===a.id));const swatch=el(b,'span');swatch.className='fashion-swatch';swatch.style.background='rgb('+KalosFashionArt.colors[a.color].join(',')+')';el(b,'span',a.name+'\n'+a.color+' · '+(F.owned(p,a.id)?'Owned':a.price!=null?'¥'+a.price.toLocaleString():'Gift/default'));}
      if(!candidates.length)el(list,'p','No pieces in this selection.');
      wardrobeActions.replaceChildren();
      if(!shop){for(const [slot,label]of [['socks','Remove socks'],['accessory','Remove hat accessory']])button(wardrobeActions,label,()=>{if(F.collection(p)!==line)F.selectCollection(p,line);F.remove(p,slot);preview=null;save();refresh();});
        const name=el(wardrobeActions,'input');name.placeholder='Outfit name';name.maxLength=24;name.setAttribute('aria-label','Outfit name');
        button(wardrobeActions,'Save outfit',()=>{if(!F.current(p)){status.textContent='Wear a piece or collection defaults first.';return;}const okay=F.saveOutfit(p,name.value||'Outfit '+(F.state(p).saved.length+1));status.textContent=okay?'Outfit saved.':'Your twelve outfit slots are full.';save();refresh();});
        for(const [i,outfit]of F.state(p).saved.entries()){const b=button(wardrobeActions,'Wear '+outfit.name,()=>{if(F.restoreOutfit(p,i)){line=F.collection(p);preview=null;save();refresh();}});b.dataset.outfit=i;}
      }
      button(wardrobeActions,'Done',()=>done());
      refreshActions();draw();
      if(root.contains(active))active.focus();else if(focusKey)[...root.querySelectorAll('button')].find(b=>[b.dataset.item,b.dataset.category,b.dataset.collection].includes(focusKey))?.focus();else if(focusText)[...root.querySelectorAll('button')].find(b=>b.textContent===focusText)?.focus();
    }
    const handler=e=>{
      e.stopPropagation();
      if(e.key==='Escape'||e.key==='x'||e.key==='X'){if(e.target.tagName==='INPUT'&&e.key!=='Escape')return;e.preventDefault();done();return;}
      if(e.target.tagName==='INPUT'){if(e.key==='Enter'){e.preventDefault();wardrobeActions.querySelector('button')?.focus();}return;}
      if(['z','Z','Enter',' '].includes(e.key)){e.preventDefault();if(!e.repeat)document.activeElement?.click();}
      else if(e.key.startsWith('Arrow')){e.preventDefault();const buttons=[...root.querySelectorAll('button:not(:disabled),input')],at=buttons.indexOf(document.activeElement),delta=['ArrowDown','ArrowRight'].includes(e.key)?1:-1;const b=buttons[(at+delta+buttons.length)%buttons.length];b?.focus();b?.scrollIntoView({block:'nearest'});}
    };
    document.addEventListener('keydown',handler,true);
    try {await new Promise(resolve=>{done=()=>{closing=true;resolve();};refresh();root.querySelector('button')?.focus();});}
    finally {closing=true;document.removeEventListener('keydown',handler,true);root.remove();}
  }
  window.KalosFashionDevice={open};
})();
