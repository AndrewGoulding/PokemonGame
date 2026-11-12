// Authored team-inspired uniforms, sold only after each campaign's own team plot ends, and the regional boutiques
// (open from the start) that sell each region's own authored line through the same wardrobe.
(function () {
  'use strict';
  const factions={
    rocket:{name:'Team Rocket',symbol:'R',ink:[224,45,56],hat:'Rocket Logo Cap',top:'Rocket Uniform Top',bottom:'Rocket Uniform Pants',femaleBottom:'Rocket Uniform Skirt',colors:['Black','Black','Black','Black','Black']},
    aqua:{name:'Team Aqua',symbol:'A',ink:[241,239,222],hat:'Aqua Bandanna',top:'Aqua Striped Uniform Top',bottom:'Aqua Cargo Pants',femaleBottom:'Aqua Cargo Shorts',colors:['Blue','Blue','Blue','Black','Blue']},
    magma:{name:'Team Magma',symbol:'M',ink:[36,37,44],hat:'Magma Hood',top:'Magma Uniform Top',bottom:'Magma Uniform Pants',femaleBottom:'Magma Uniform Skirt',colors:['Red','Red','Black','Black','Red']},
    galactic:{name:'Team Galactic',symbol:'G',ink:[238,198,58],hat:'Galactic Helmet',top:'Galactic Uniform Tunic',bottom:'Galactic Uniform Leggings',femaleBottom:'Galactic Uniform Skirt',colors:['Silver','Silver','Black','White','Silver']},
    plasma:{name:'Team Plasma',symbol:'P',ink:[34,39,53],hat:'Plasma Helmet',top:'Plasma Uniform Tabard',bottom:'Plasma Uniform Pants',colors:['White','White','Gray','Black','Gray']},
    'neo-plasma':{name:'Neo Team Plasma',symbol:'P',ink:[236,235,225],hat:'Neo Plasma Beret',top:'Neo Plasma Uniform Top',bottom:'Neo Plasma Uniform Pants',femaleBottom:'Neo Plasma Uniform Skirt',colors:['Black','Black','Gray','Black','Black']},
    flare:{name:'Team Flare',symbol:'F',ink:[240,237,225],hat:'Flare Visor',top:'Flare Suit Jacket',bottom:'Flare Suit Pants',femaleBottom:'Flare Suit Skirt',colors:['White','Orange','Orange','Black','Orange']},
    cipher:{name:'Cipher',symbol:'C',ink:[214,50,64],hat:'Cipher Peon Helmet',top:'Cipher Peon Armor',bottom:'Cipher Peon Leggings',colors:['Silver','Purple','Black','Silver','Purple']},
    snagem:{name:'Team Snagem',symbol:'S',ink:[239,197,90],hat:'Snagem Bandanna',top:'Snagem Utility Jacket',bottom:'Snagem Cargo Pants',colors:['Red','Brown','Brown','Black','Brown']}
  };
  // These are the completed-plot flags, not the earlier hideout trainer wins.
  const vendors=[
    {id:'rocket-kanto',faction:'rocket',map:'RocketHideout_B1F',sprite:'rocket_m',width:16,frames:9,gate:'silph',unlock:'Defeat Giovanni at Silph Co.'},
    {id:'aqua-hoenn',faction:'aqua',map:'AquaHideout_1F',sprite:'em_team_aqua_aqua_member_m',width:16,frames:9,gate:'weather',unlock:'Resolve the Sootopolis crisis and see Archie and Maxie leave.'},
    {id:'magma-hoenn',faction:'magma',map:'MagmaHideout_1F',sprite:'em_team_magma_magma_member_m',width:16,frames:9,gate:'weather',unlock:'Resolve the Sootopolis crisis and see Archie and Maxie leave.'},
    {id:'galactic-sinnoh',faction:'galactic',map:'GalacticHQ_1F',sprite:'pt_grunt_m',width:32,frames:3,gate:'distortion',unlock:'Defeat Cyrus and resolve Giratina’s Distortion World encounter.'},
    {id:'plasma-bw',faction:'plasma',map:'BW1ColdStorageInside',sprite:'bw2_team_plasma_grunt_m',width:32,frames:9,gate:'bw',unlock:'Complete the original Black/White battle against Ghetsis.'},
    {id:'plasma-bw2',faction:'neo-plasma',map:'UnovaPlasmaFrigate',sprite:'bw2_team_plasma_grunt_m',width:32,frames:9,gate:'bw2',unlock:'Defeat Ghetsis in Black 2/White 2.'},
    {id:'flare-kalos',faction:'flare',map:'KalosLysandreLabs',sprite:'bw2_gentleman',width:32,frames:9,gate:'flare',unlock:'Stop Lysandre and leave the destroyed headquarters.'},
    {id:'cipher-orre',faction:'cipher',map:'RealgamTower_1F',sprite:'orre_peon_m',width:16,frames:9,gate:'cipher',unlock:'Defeat Evice at Realgam Tower.'},
    {id:'snagem-orre',faction:'snagem',map:'SnagemHideout',sprite:'orre_snagem_m',width:16,frames:9,gate:'snagem',unlock:'Defeat Gonzap at Realgam Tower.'}
  ].map(a=>({...a,shop:'team-'+a.id,name:factions[a.faction].name+' Outfitters',script:'team-fashion:'+a.id,mart:true}));
  // Regional boutiques: one per region outside Kalos (whose six boutiques sell the X/Y catalogue), each with its own
  // authored line. Pieces are [collection (m, f or both), category, name, color, price]; names pick the art's
  // existing patterns (Plaid, Knit, Boots, Skirt and so on), so they draw like the X/Y pieces.
  // Every boutique and outfitter sells from FireRed's Mart screen (`mart`: ui/boutique-mart.js, ui/game.js's teamClothing). Celadon's
  // has a building of its own (data/celadon-boutique.js): its clerk stands at `at`, behind its counter.
  const boutiques={
    kanto:{name:'Celadon Boutique',map:'CeladonCity_Boutique',at:{x:2,y:3},movement:'face_right',sprite:'woman_2',width:16,frames:10,greeting:'Classic Kanto looks, picked by\nCeladon’s own designers.',pieces:[
      ['b','hat','Pallet Logo Cap','Red',2500],['f','hat','Celadon Flower Boater','White',3800],['b','shirt','Indigo Zipped Jacket','Navy blue',5800],['m','shirt','Vermilion Striped Tee','White',3200],['f','shirt','Cerulean Striped Top','Aqua',3200],
      ['m','pants','Pewter Cargo Pants','Gray',3800],['f','pants','Celadon Plaid Skirt','Green',4200],['b','shoes','Saffron High Tops','Yellow',4600],['f','socks','Cinnabar Knee Socks','Red',1200],['b','bag','Kanto Explorer Backpack','Red',3500],['m','hat','Viridian Outdoors Cap','Green',2400],['m','shoes','Lavender Laced Boots','Purple',5000]]},
    johto:{name:'Goldenrod Boutique',map:'GoldenrodCity_DepartmentStore_2F',sprite:'clerk',width:16,frames:9,greeting:'Johto tradition meets Goldenrod\nstyle. Take your time!',pieces:[
      ['b','hat','Ecruteak Knit Cap','Brown',2400],['m','hat','Goldenrod Feather Fedora','Gold',4200],['b','shirt','Azalea Check Shirt','Green',3600],['m','shirt','Mahogany Down Jacket','Brown',6400],['f','dress','Ecruteak Check Dress','Red',8200],
      ['m','pants','Cherrygrove Shorts','Beige',3000],['f','pants','Violet Pleated Skirt','Purple',4000],['b','shoes','Blackthorn Boots','Black',5200],['f','socks','Olivine Knee Socks','Navy blue',1200],['b','bag','Goldenrod Ribbon Tote','Pink',3200],['m','shoes','Ecruteak Laced Boots','Brown',5000],['f','hat','Violet Flower Boater','Purple',3600]]},
    hoenn:{name:'Lilycove Boutique',map:'LilycoveCity_DepartmentStore_2F',sprite:'em_woman_3',width:16,frames:9,greeting:'Sun, sea and style. Everything\nhere is made for Hoenn weather.',pieces:[
      ['b','hat','Lilycove Sun Boater','White',3000],['b','hat','Slateport Sunglasses','Black',2800],['m','shirt','Fortree Camo Jacket','Olive',5600],['b','shirt','Mauville Logo Tee','Yellow',3200],['f','shirt','Dewford Striped Top','Aqua',3200],
      ['m','pants','Pacifidlog Board Shorts','Blue',3000],['f','pants','Lavaridge Wrap Skirt','Orange',4200],['b','pants','Rustboro Cuffed Jeans','Navy blue',4400],['b','shoes','Slateport Deck Shoes','White',3600],['b','bag','Lilycove Tassel Bag','Aqua',3400]]},
    sinnoh:{name:'Veilstone Boutique',map:'VeilstoneCity_Mart',sprite:'bw2_lass',width:32,frames:9,greeting:'Layers for Sinnoh’s cold\nmornings. Have a look!',pieces:[
      ['b','hat','Snowpoint Knit Beanie','White',2600],['f','hat','Hearthome Ribbon Beret','Pink',3400],['b','shirt','Jubilife Down Jacket','Navy blue',6800],['m','shirt','Eterna Check Shirt','Green',3600],['f','shirt','Sunyshore Striped Top','Yellow',3200],
      ['m','pants','Veilstone Cuffed Jeans','Blue',4400],['f','pants','Hearthome Plaid Skirt','Pink',4200],['b','shoes','Snowpoint Boots','White',5400],['f','socks','Snowpoint Tights','Black',1400],['b','bag','Canalave Tassel Satchel','Brown',3600],['m','hat','Veilstone Sports Cap','Gray',2400],['m','shirt','Pastoria Camo Jacket','Olive',5600]]},
    unova:{name:'Mall Nine Boutique',map:'UnovaShoppingMallNine',sprite:'bw2_lass',width:32,frames:9,greeting:'Castelia cuts, Nimbasa sparkle.\nUnova’s latest is all here.',pieces:[
      ['m','hat','Castelia Fedora','Black',4400],['f','hat','Nimbasa Sparkly Cap','Pink',3200],['m','shirt','Castelia Tie Shirt','White',4800],['b','shirt','Opelucid Two-Tone Jacket','Gray',6200],['f','shirt','Nimbasa Glitzy Top','Pink',4200],
      ['b','pants','Driftveil Damaged Jeans','Blue',4600],['f','pants','Undella Shorts','Aqua',3200],['b','shoes','Castelia Laced Boots','Black',5800],['f','socks','Icirrus Tights','Navy blue',1400],['b','bag','Join Avenue Ribbon Bag','Red',3400],['m','shoes','Nimbasa High Tops','Red',4600],['m','pants','Castelia Cuffed Slacks','Black',4800]]},
    orre:{name:'Gateon Outfitters',map:'GateonPort_Mart',sprite:'bw2_lass',width:32,frames:9,greeting:'Dust-proof, sun-proof and\nmade to last out in Orre.',pieces:[
      ['b','hat','Orre Outdoors Cap','Beige',2400],['b','hat','Phenac Sunglasses','Black',2800],['b','shirt','Pyrite Splatter Jacket','Orange',5400],['b','shirt','Agate Check Shirt','Brown',3600],['m','pants','Outskirt Cargo Shorts','Beige',3000],
      ['b','pants','Pyrite Damaged Jeans','Black',4400],['f','pants','Gateon Wrap Skirt','Olive',3800],['b','shoes','Mt. Battle Boots','Brown',5200],['b','bag','Orre Courier Bag','Olive',3200]]},
    alola:{name:'Hau’oli Apparel',map:'AlolaHauoliCity',sprite:'bw2_lass',width:32,frames:9,greeting:'Alola! Island wear for every\nday of your trial.',pieces:[
      ['m','hat','Melemele Bamboo Hat','Beige',2600],['f','hat','Akala Flower Boater','Pink',3400],['b','shirt','Alolan Exotic Shirt','Orange',3800],['f','shirt','Konikoni Sundae Top','Pink',3400],['f','dress','Malie Flower Sundress','Yellow',7600],
      ['m','pants','Melemele Board Shorts','Aqua',3000],['f','pants','Ula’ula Wrap Skirt','Red',3800],['b','shoes','Poni Beach Sandals','Brown',2800],['b','bag','Hau’oli Beach Tote','Yellow',3000],['m','shirt','Melemele Striped Tank','Aqua',3000],['m','hat','Konikoni Sunglasses','Black',2800],['f','socks','Akala Ankle Socks','White',900],['m','pants','Poni Cargo Shorts','Olive',3000]]},
    galar:{name:'Motostoke Boutique',map:'GalarMotostoke',sprite:'bw2_lass',width:32,frames:9,greeting:'Galar tailoring, from Wyndon\ncoats to Spikemuth tees.',pieces:[
      ['m','hat','Wyndon Felt Hat','Gray',4600],['b','hat','Circhester Knit Beanie','Red',2600],['b','shirt','Hammerlocke Plaid Shirt','Red',3800],['b','shirt','Galar Logo Jersey','White',4200],['m','shirt','Spikemuth Damaged Tee','Black',3200],
      ['m','pants','Hulbury Cuffed Chinos','Beige',4000],['b','pants','Galar Tartan Kilt','Green',4800],['b','shoes','Turffield Boots','Brown',5400],['f','socks','Ballonlea Tights','Purple',1400],['f','dress','Wyndon Check Dress','Navy blue',8400],['b','bag','Wyndon Tassel Satchel','Navy blue',3800]]}
  };
  for(const [region,b]of Object.entries(boutiques)){const faction='boutique-'+region;factions[faction]={name:b.name,boutique:true};
    vendors.push({id:faction,faction,map:b.map,sprite:b.sprite,width:b.width,frames:b.frames,gate:'open',unlock:'',shop:'team-'+faction,name:b.name,script:'team-fashion:'+faction,boutique:true,greeting:b.greeting,at:b.at,movement:b.movement,mart:true});}
  const byId=Object.fromEntries(vendors.map(v=>[v.id,v])),byShop=Object.fromEntries(vendors.map(v=>[v.shop,v]));
  const categories=['hat','shirt','pants','shoes','bag'],prices=[2500,5000,3500,2500,2000],items=[];
  const slug=t=>t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  for(const [region,b]of Object.entries(boutiques))for(const [who,category,name,color,price]of b.pieces)for(const collection of who==='b'?['male','female']:[who==='m'?'male':'female']){
    const faction='boutique-'+region;items.push({id:faction+'-'+collection+'-'+slug(name),collection,category,name,color,tag:null,price,shops:[{city:'team-'+faction,days:[0,1,2,3,4,5,6]}],default:false,gift:null,faction});}
  for(const [faction,f]of Object.entries(factions))if(!f.boutique)for(const collection of ['male','female']){
    const names=[f.hat,f.top,collection==='female'&&f.femaleBottom||f.bottom,f.name+' Boots',f.name+' Satchel'];
    categories.forEach((category,i)=>items.push({id:'team-'+faction+'-'+collection+'-'+category,collection,category,name:names[i],color:f.colors[i],tag:'Special',price:prices[i],shops:vendors.filter(v=>v.faction===faction).map(v=>({city:v.shop,days:[0,1,2,3,4,5,6]})),default:false,gift:null,faction,symbol:f.symbol,ink:f.ink}));
  }
  const itemIndex=Object.fromEntries(items.map(a=>[a.id,a]));
  const vendor=shop=>byShop[shop]||byId[shop]||null;
  const byScript=script=>typeof script==='string'&&script.startsWith('team-fashion:')?byId[script.slice(13)]||null:null;
  function unlocked(p,key){const v=vendor(key);if(!v)return false;const f=p.flags||{};switch(v.gate){
    case'silph':return !!f.TRAINER_BOSS_GIOVANNI_2;
    case'weather':return !!f.hoenn?.f?.FLAG_SOOTOPOLIS_ARCHIE_MAXIE_LEAVE;
    case'distortion':return !!f.sinnoh?.giratinaResolved;
    case'bw':return !!f.unovaBW?.clear;
    case'bw2':return !!f.unova?.ghetsis;
    case'flare':return !!f.kalos?.flareStopped;
    case'cipher':return (f.orreStory|0)>=44;
    case'snagem':return (f.orreStory|0)>=42;
    case'open':return true;
    default:return false;
  }}
  function shopError(p,key){const v=vendor(key);if(!v)return 'Unknown team outfitter.';return unlocked(p,key)?null:v.unlock;}
  function availability(p,a,key){const v=vendor(key);if(!v||a.faction!==v.faction)return 'Sold by another team outfitter.';return shopError(p,key);}
  function visible(person,p){return person.teamFashionVendor?unlocked(p,person.teamFashionVendor):undefined;}
  const key=(x,y)=>x+','+y;
  // Keep every entrance-connected floor component traversable after adding the vendor.
  // `present` contains story-visible actors, including their scripted positions.
  function placement(v,others=[],present){
    const m=WORLD_MAPS[v.map];if(!m)return null;
    const occupied=new Set([...(present||m.people),...others].map(a=>key(a.x,a.y)));
    const walk=(x,y)=>x>=0&&y>=0&&x<m.width&&y<m.height&&!m.collision[y*m.width+x]&&m.behavior[y*m.width+x]!==16&&!occupied.has(key(x,y));
    const entry=window.Orre?.PLACES.find(a=>a.map===v.map)?.arrive;
    const starts=m.warps.filter(w=>walk(w.x,w.y));if(entry&&walk(entry.x,entry.y))starts.push(entry);
    if(!starts.length){for(let y=1;y<m.height-1;y++)for(let x=1;x<m.width-1;x++)if(walk(x,y)){starts.push({x,y});break;}}
    function flood(start,block){const q=[start],seen=new Set();for(let i=0;i<q.length;i++){const {x,y}=q[i],k=key(x,y);if(seen.has(k)||k===block||!walk(x,y))continue;seen.add(k);for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])q.push({x:x+dx,y:y+dy});}return seen;}
    const regions=new Set();for(const start of starts){
      if(regions.has(key(start.x,start.y)))continue;
      const base=flood(start,null);base.forEach(k=>regions.add(k));const candidates=[];
      for(let y=1;y<m.height-1;y++)for(let x=1;x<m.width-1;x++)if(base.has(key(x,y))&&m.behavior[y*m.width+x]===0&&!m.encounter?.[y*m.width+x]&&Math.abs(x-start.x)+Math.abs(y-start.y)>=3&&!m.warps.some(w=>Math.abs(w.x-x)+Math.abs(w.y-y)<3)&&!m.signs?.some(s=>Math.abs(s.x-x)+Math.abs(s.y-y)<2)&&!m.triggers?.some(t=>t.x===x&&t.y===y))candidates.push({x,y});
      candidates.sort((a,b)=>(Math.abs(a.x-start.x)+Math.abs(a.y-start.y))-(Math.abs(b.x-start.x)+Math.abs(b.y-start.y)));
      for(const a of candidates)if(flood(start,key(a.x,a.y)).size===base.size-1)return a;
    }
    return null;
  }
  const positions=new Map();
  function person(v,others=[],present){let at=v.at||positions.get(v.id);if(!v.at&&(!at||[...others,...(present||[])].some(a=>a.x===at.x&&a.y===at.y))){at=placement(v,others,present);if(!at)return null;positions.set(v.id,at);}return {id:'team-fashion-'+v.id,localId:'TEAM_FASHION_'+v.id.toUpperCase().replaceAll('-','_'),script:v.script,teamFashionVendor:v.id,...at,sprite:v.sprite,width:v.width,height:32,frames:v.frames,movement:v.movement||'face_down',rangeX:0,rangeY:0};}
  function people(map,p,others=[],present){return vendors.filter(v=>v.map===map&&unlocked(p,v.id)).map(v=>person(v,others,present)).filter(Boolean);}
  window.TeamFashion={factions,boutiques,vendors,items,item:id=>itemIndex[id]||null,vendor,byScript,unlocked,shopError,availability,visible,placement,person,people};
})();
