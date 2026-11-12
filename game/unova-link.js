// Single-player stand-ins for Unova's link and online features, so their Medal Rally medals can be earned. The source
// needs another player or a server for each; here a simulated partner (another Trainer with Black 2 or White 2) takes
// that player's place, through the C-Gear:
//   link battles (record 13 + 17 + IR, Medals 109–112), trades with the other version (Medal 165), Spin Trade (record 90,
//   Medal 178), Feeling Check (record 113 and a best score, Medals 179–180), the Xtransceiver balloon minigame (plays,
//   record 129, and best score, record 50: Medals 195–202), the Pal Pad (friends registered, Medals 174–177),
//   Game Sync (a Pokémon tucked in, Medal 232) and Funfest missions joined by your Pal Pad friends (Medals 221–222).
// Passersby (Medals 73–76) are Join Avenue's visitors, as the source's passersby become them (game/unova-avenue.js).
(function(){
 'use strict';
 const F=Unova,D=()=>F.data(),PAL_PAD=32,state=p=>F.state(p).link||(F.state(p).link={friends:[],battles:0,trades:0,spins:0,feelings:0,feelingBest:0,games:0,gameBest:0,partners:0}),peek=p=>F.peek(p).link||{};
 const pick=(rng,n)=>Math.min(n-1,Math.max(0,Math.floor(rng()*n))),version=p=>F.peek(p).version||'black2',other=v=>v==='white2'?'black2':'white2';
 // Partners: a Trainer named after one of Unova's, with that Trainer's picture and a version.
 let pool=null;function trainers(){return pool||(pool=Object.values(D().trainers).filter(t=>t.name&&t.pic&&/^[A-Z][a-z]+$/.test(t.name)).filter((t,i,a)=>a.findIndex(o=>o.name===t.name)===i));}
 function partner(p,{friend=false,versionOf=null}={},rng=Math.random){const s=state(p);if(friend&&s.friends.length)return s.friends[pick(rng,s.friends.length)];const t=trainers()[pick(rng,trainers().length)];s.partners++;return{name:t.name,pic:t.pic,version:versionOf||(rng()<.5?'black2':'white2'),id:'link-'+s.partners};}
 function register(p,who){const s=state(p);if(!who||s.friends.some(f=>f.id===who.id))return{already:true};if(s.friends.length>=PAL_PAD)return{full:true};s.friends.push({...who});return{registered:true,count:s.friends.length};}
 // A link opponent: six (or your party's count of) Unova Pokémon at your strongest Pokémon's level.
 function team(p,rng=Math.random){const list=D().postgame.regionalDex,mons=p.party.filter(m=>!m.egg),level=Math.min(100,Math.max(5,...mons.map(m=>m.level))),out=[];
  while(out.length<Math.max(1,mons.length)){const sp=list[pick(rng,list.length)];if(out.some(m=>m.species===sp)||!window.DEX[sp])continue;out.push(Party.create(sp,level,{moves:F.levelMoves(sp,level)}));}return out;}
 function battled(p,result){if(!['won','lost'].includes(result))return false;state(p).battles++;return true;}
 // Version exclusives from the encounter tables: species in one version's slots and never the other's.
 let exclusive=null;function exclusives(){if(exclusive)return exclusive;const seen={black2:new Set(),white2:new Set()};const walk=o=>{if(!o||typeof o!=='object')return;for(const v of ['black2','white2'])for(const a of o[v]?.slots||[])if(a?.species)seen[v].add(a.species);for(const k of Object.keys(o))if(k!=='black2'&&k!=='white2')walk(o[k]);};walk(D().encounters);
  exclusive={black2:[...seen.black2].filter(s=>!seen.white2.has(s)&&window.DEX[s]).sort(),white2:[...seen.white2].filter(s=>!seen.black2.has(s)&&window.DEX[s]).sort()};return exclusive;}
 // A trade with the other version: your Pokémon for one only found there, at your Pokémon's level.
 function tradeOffer(p,rng=Math.random){const v=other(version(p)),list=exclusives()[v];if(!list.length)return null;return{partner:partner(p,{versionOf:v},rng),species:list[pick(rng,list.length)]};}
 function trade(p,mon,offer){const i=p.party.indexOf(mon);if(i<0||mon.egg||!offer||p.party.filter(m=>!m.egg).length<2)return{invalid:true};const got=Party.create(offer.species,mon.level,{moves:F.levelMoves(offer.species,mon.level)});got.ot={name:offer.partner.name,id:Math.floor(Math.random()*65536)};got.met={...got.met,level:mon.level,map:p.location.map,game:offer.partner.version,from:'Link trade'};
  p.party[i]=got;Player.markCaught(p,offer.species);const s=state(p);s.trades++;if(offer.partner.version!==version(p))s.opposite=(s.opposite||0)+1;return{mon:got,gave:mon};}
 // Spin Trade: an Egg for another Trainer's Egg.
 function spin(p,egg,rng=Math.random){const i=p.party.indexOf(egg);if(i<0||!egg.egg)return{invalid:true};const list=D().postgame.regionalDex.filter(s=>window.DEX[s]),sp=Breeding.eggSpecies({species:list[pick(rng,list.length)]},{species:'Ditto'},rng),got=Breeding.giftEgg(sp,{map:p.location.map,from:'Spin Trade'});p.party[i]=got;state(p).spins++;return{egg:got,species:sp};}
 // Feeling Check: five rounds; each picks one of four hearts. The partner's mood names the heart they mean three times
 // in four. A match scores 20, a neighbouring heart 10.
 const HEARTS=['Red','Yellow','Green','Blue'],MOODS=['fiery','sunny','calm','cool'];
 function feelingRound(rng=Math.random){const heart=pick(rng,4),mood=rng()<.75?heart:pick(rng,4);return{heart,mood:MOODS[mood]};}
 function feelingScore(rounds,choices){let n=0;rounds.forEach((r,i)=>{const d=Math.abs(r.heart-choices[i]);n+=d===0?20:d===1||d===3?10:0;});return n;}
 function feeling(p,score){if(!Number.isInteger(score)||score<0||score>100)return false;const s=state(p);s.feelings++;s.feelingBest=Math.max(s.feelingBest,score);return true;}
 // The Xtransceiver balloon game: 12 rounds of three balloons worth 10–100; popping the same colour as last time adds
 // 10 for each balloon in the run.
 const COLOURS=['Red','Blue','Yellow'];
 function balloons(rng=Math.random){return Array.from({length:12},()=>COLOURS.map(c=>({colour:c,points:10*(1+pick(rng,10))})));}
 function balloonScore(rounds,picks){let n=0,run=0,last=null;rounds.forEach((r,i)=>{const b=r[picks[i]];if(!b)return;run=b.colour===last?run+1:0;last=b.colour;n+=b.points+10*run;});return n;}
 function played(p,score){if(!Number.isInteger(score)||score<0)return false;const s=state(p);s.games++;s.gameBest=Math.max(s.gameBest,score);return true;}
 // Game Sync: a Pokémon tucked in to play in the Pokémon Dream World.
 function tuck(p,mon){if(!mon||mon.egg)return false;state(p).tucked={species:mon.species,day:Player.gameTime(p).day};return true;}
 // Funfest: you and every Pal Pad friend join your missions.
 function people(p){return 1+(peek(p).friends||[]).length;}
 function progress(p,id){const s=peek(p);
  if(id>=109&&id<=112)return s.battles||0;if(id===165)return s.opposite||0;if(id>=174&&id<=177)return (s.friends||[]).length;if(id===178)return s.spins||0;if(id===179)return s.feelings||0;if(id===180)return s.feelingBest||0;
  if(id>=195&&id<=198)return s.games||0;if(id>=199&&id<=202)return s.gameBest||0;if(id===221||id===222)return F.peek(p).funfest?.people||0;if(id===232)return +!!s.tucked;if(id>=73&&id<=76)return F.peek(p).avenue?.full?.passersby||0;return null;}
 window.UnovaLink={state,peek,partner,register,team,battled,exclusives,tradeOffer,trade,spin,HEARTS,MOODS,feelingRound,feelingScore,feeling,balloons,balloonScore,played,tuck,people,progress,PAL_PAD};
})();
