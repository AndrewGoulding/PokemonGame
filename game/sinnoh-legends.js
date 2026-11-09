// Regional research, postgame legendary records, roaming saves and field forms.
(function(){
 "use strict";
 const D=()=>PLATINUM_DATA.legends;
 function state(p){const s=Sinnoh.state(p);return s.legends||(s.legends={});}
 function peek(p){return(p.flags.sinnoh||{}).legends||{};}
 function nationalSeen(p){const seen=new Set(p.pokedex.seen.map(Party.speciesName));return D().regionalDex.filter(sp=>seen.has(Party.speciesName(sp))).length;}
 function activeSpecies(p){return Object.entries(peek(p).roamers||{}).filter(([,r])=>r.active&&!r.caught).map(([sp])=>sp);}
 function release(p,sp){const s=state(p),rs=s.roamers||(s.roamers={});if(rs[sp]&&rs[sp].released)return false;rs[sp]={released:true,active:true};Player.markSeen(p,sp);return true;}
 const route=p=>{const m=WORLD_MAPS[p.location.map];return m&&m.region==='sinnoh'&&/^Route\d/.test(p.location.map);};
 function roamerRecord(p,record){const r=(peek(p).roamers||{})[record.species];if(!r||!r.active||!route(p))return record;if(!r.record){const d=D().encounters[record.species];r.record=Party.create(d.species,d.level,{moves:d.moves});}return JSON.parse(JSON.stringify(r.record));}
 function finishRoamer(p,mon,outcome){const r=mon&&(peek(p).roamers||{})[mon.species];if(!r||!r.active||!route(p))return;if(r.record)Party.syncFromBattle(r.record,mon);if(outcome==='caught'){r.caught=true;r.active=false;delete r.record;}else if(mon.fainted||mon.hp<=0){r.defeated=true;r.active=false;}}
 function revive(p){const s=peek(p);for(const r of Object.values(s.roamers||{}))if(r.defeated&&!r.caught){r.active=true;r.defeated=false;delete r.record;}for(const r of Object.values(s.encounters||{}))if(r.defeated&&!r.caught)r.defeated=false;}
 function encounter(p,sp){const s=state(p),rs=s.encounters||(s.encounters={});return rs[sp]||(rs[sp]={});}
 function battleground(p){const s=peek(p),q=Sinnoh.quests(p),main=Sinnoh.state(p);if(!p.flags.sinnohLeagueClear||!q.charonArrested)return[];const badges={roark:'coal',gardenia:'forest',fantina:'relic',maylene:'cobble',wake:'fen',byron:'mine',candice:'icicle',volkner:'beacon'};const eligible=D().roster.filter(r=>badges[r.require]?p.badges.includes(badges[r.require]):r.require==='cheryl'?main.cherylDone:r.require==='riley'?q.ironCleared:r.require==='buck'?q.charonArrested:!!s[r.require+'Escorted']);const day=Player.gameTime(p).day,offset=((p.trainerId>>>0)+day*5)%Math.max(1,eligible.length);return Array.from({length:Math.min(4,eligible.length)},(_,i)=>eligible[(offset+i)%eligible.length]);}
 function canGracidea(record,p){return!!record&&!record.egg&&record.species==='Shaymin-Land'&&record.status!=='frz'&&Player.gameTime(p).timeOfDay!=='night';}
 function gracidea(record,p){if(!canGracidea(record,p))return false;record.species='Shaymin-Sky';record.ability=DEX['Shaymin-Sky'].abilities[0];record.hp=Math.min(record.hp,Party.maxHp(record));Player.markSeen(p,'Shaymin-Sky');return true;}
 function heldForm(record,distortion){if(!record||record.egg)return;if(distortion===undefined){const p=window.Game&&window.Game.player;distortion=!!(p&&p.party.includes(record)&&/^DistortionWorld_/.test(p.location.map));}
  if(/^Giratina(?:-|$)/.test(record.species)){const origin=distortion||record.item==='griseous-orb';if(origin&&(record.species!=='Giratina-Origin'||record.ability!=='Levitate')){record.originalGiratinaAbility=record.ability;record.species='Giratina-Origin';record.ability='Levitate';}else if(!origin&&(record.species==='Giratina-Origin'||record.ability==='Levitate')){record.species='Giratina';record.ability=record.originalGiratinaAbility||'Pressure';delete record.originalGiratinaAbility;}}
  if(record.species==='Arceus'){const type=Battle.PLATE_TYPES[record.item];if(type)record.arceusType=type;else delete record.arceusType;}
 }
 function syncForms(p){for(const m of p.party)heldForm(m,/^DistortionWorld_/.test(p.location.map));for(const box of p.boxes)for(const m of box)if(m)heldForm(m,false);const night=Player.gameTime(p).timeOfDay==='night';for(const m of p.party)if(m.species==='Shaymin-Sky'&&(night||m.status==='frz')){m.species='Shaymin-Land';m.ability=DEX['Shaymin-Land'].abilities[0];m.hp=Math.min(m.hp,Party.maxHp(m));}for(const box of p.boxes)for(const m of box)if(m&&m.species==='Shaymin-Sky'){m.species='Shaymin-Land';m.ability=DEX['Shaymin-Land'].abilities[0];}}
 const items={'platinum-secret-key':'Opens the appliance room in Eterna’s Galactic building.','lunar-wing':'Cresselia’s feather dispels a child’s nightmare.','member-card':'Admission to Canalave’s Harbor Inn.','oaks-letter':'An invitation to meet Professor Oak on Route 224.','azure-flute':'Its sound reaches the Hall of Origin.'};
 for(const[id,effect]of Object.entries(items))ITEMS[id]={name:id,category:'key-items',effect};
 for(const id of Object.keys(items).concat("gracidea","works-key","secret-potion","old-charm","galactic-storage-key","galactic-key")){(window.ITEM_SPRITES||(window.ITEM_SPRITES={}))[id]="assets/sprites/items/key-item/"+id+".png";}
 window.SinnohLegends={heldForm,state,peek,nationalSeen,activeSpecies,release,roamerRecord,finishRoamer,revive,encounter,battleground,canGracidea,gracidea,syncForms};
})();
