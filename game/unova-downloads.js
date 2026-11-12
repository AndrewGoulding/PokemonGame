(function(){
 'use strict';
 // Offline download facilities: PWT Download Tournaments, the Wi-Fi Train and special Battle Tests. Rules, tables and
 // text come from data/unova-downloads.js (pokebw2); the bundled packs/rooms are offline stand-ins (see the docs).
 const D=window.UNOVA_DOWNLOADS,R=window.UnovaFacilities;if(!D||!R)return;
 const F=Unova,FD=()=>R.data(),TYPES=['Normal','Fighting','Flying','Poison','Ground','Rock','Bug','Ghost','Steel','Fire','Water','Grass','Electric','Psychic','Ice','Dragon','Dark'],COUNTS=[3,4,6,4],STYLE_NAMES=['SingleBattle','DoubleBattle','TripleBattle','RotationBattle'];
 function state(p){const s=R.state(p);s.downloads||={};const d=s.downloads;d.seed??=((p.trainerId||1)^0x57425444)>>>0;d.pwt||={received:[],slots:[null,null,null],wins:[0,0,0]};d.wifi||={rank:1,lose:0,losing:false,taken:{},records:{}};d.institute||={received:[],used:[],records:{}};return d;}
 function rand(o){o.seed=(Math.imul(o.seed,1664525)+1013904223)>>>0;return o.seed/4294967296;}
 function stream(p){const d=state(p);rand(d);return{seed:(d.seed^0x9e3779b9)>>>0};}
 // Source text: {n} placeholders and \f page breaks become say() pages.
 function text(s,...a){return String(s).replace(/\{(\d)\}/g,(_,i)=>a[i]??'').split('\f').map(x=>x.trim()).filter(Boolean);}
 function award(p,bp){const s=R.state(p);s.bp=(s.bp||0)+bp;window.UnovaRecords?.record(p,'bp',bp);}

 // Regulation (WbtSystem_GetRegulation/GetExtraRule): count, level mode, bans, duplicates, required type, banned move.
 function rules(pack){const r=D.regulations[pack.regulation];return{...r,bannedItems:r.bannedItems.concat(pack.bannedItems||[]),requiredType:pack.requiredType||null,bannedMove:pack.bannedMove||null,style:pack.style,count:COUNTS[pack.style]};}
 function level(rule,lv){const L=rule.level;return rule.levelMode==='all'?L:rule.levelMode==='cap'?Math.min(lv,L):rule.levelMode==='raise'?Math.max(lv,L):lv;}
 function dexId(r){return DEX[Party.speciesName(r.species)]?.id??DEX[r.species]?.id;}
 function entry(rule,party,chosen,i){const r=party[i],name=Party.speciesName(r.species);if(r.egg)return 'Eggs cannot participate.';if(R.foreign(r))return 'This Pokémon cannot enter.';if(rule.bannedSpecies.includes(dexId(r)))return name+' is banned\nin this tournament.';if(r.item&&rule.bannedItems.includes(r.item))return Bag.name(r.item)+' is banned\nin this tournament.';if(rule.levelMode==='maximum'&&r.level>rule.level)return 'Enter Pokémon of Lv. '+rule.level+'\nor lower.';if(rule.levelMode==='minimum'&&r.level<rule.level)return 'Enter Pokémon of Lv. '+rule.level+'\nor higher.';if(rule.requiredType&&!DEX[r.species].types.includes(rule.requiredType))return 'Enter '+rule.requiredType+'-type Pokémon.';if(rule.bannedMove&&Party.knowsMove(r,rule.bannedMove))return rule.bannedMove+' is banned\nin this tournament.';if(!rule.allowSameSpecies&&chosen.some(j=>Party.speciesName(party[j].species)===name))return 'Enter different Pokémon species.';if(!rule.allowSameItem&&r.item&&chosen.some(j=>party[j].item===r.item))return 'Enter different held items.';if(rule.maxLevelTotal&&chosen.reduce((n,j)=>n+party[j].level,r.level)>rule.maxLevelTotal)return 'The total level is too high.';return null;}
 function eligible(rule,party){const chosen=[];party.forEach((_,i)=>{if(chosen.length<rule.count&&!entry(rule,party,chosen,i))chosen.push(i);});return chosen.length>=rule.count;}
 function describe(pack){const r=rules(pack),species=r.bannedSpecies.map(id=>Object.keys(DEX).find(n=>DEX[n].id===id)?.replace(/-(?:Normal|Land|Ordinary|Aria)$/,'')).filter(Boolean),t=D.pwt.text;return[pack.name+'\n'+pack.text,t.BattleRules+' '+t[STYLE_NAMES[pack.style]]+'\nEnter '+r.count+' Pokémon. '+(r.levelMode==='all'?'All set to Lv. '+r.level:r.levelMode==='cap'?'Levels capped at '+r.level:'Levels unchanged')+'.\n'+(r.allowSameSpecies?'Duplicate species allowed.':'No duplicate species')+(r.allowSameItem?'':' or items.'),(r.requiredType?'Required type: '+r.requiredType+'\n':'')+t.BannedMoves+': '+(r.bannedMove||t.None)+'\n'+t.BannedItems+': '+(r.bannedItems.map(i=>Bag.name(i)).join(', ')||t.None),...(species.length?Array.from({length:Math.ceil(species.length/9)},(_,i)=>t.BannedPokemon+':\n'+[0,3,6].map(j=>species.slice(i*9+j,i*9+j+3).join(', ')).filter(Boolean).join('\n')):[t.BannedPokemon+': '+t.None])];}

 // PWT Download Tournaments: three saved slots (WbtSave slots), per-slot win counts, open after a Driftveil win.
 const label=t=>[t.className,t.name].filter(Boolean).join(' ').replace(/\s*[\u2460-\u24ff]\s*/g,' ').trim();
 const pack=id=>D.pwt.packs.find(a=>a.id===id)||null;
 function pwtOpen(p){return !!F.peek(p).pwtCleared||R.record(p,'pwt-Driftveil').wins>0;}
 function receive(p,id){const s=state(p).pwt;if(!pack(id))return{missing:true};if(s.slots.includes(id))return{already:true};const at=s.slots.indexOf(null);if(at<0)return{full:true};s.slots[at]=id;s.wins[at]=0;if(!s.received.includes(id))s.received.push(id);return{slot:at};}
 function remove(p,slot){const s=state(p).pwt;if(s.slots[slot]==null)return false;s.slots[slot]=null;s.wins[slot]=0;return true;}
 function saved(p){const s=state(p).pwt;return s.slots.map((id,slot)=>id==null?null:{slot,pack:pack(id),wins:s.wins[slot]||0}).filter(Boolean);}
 function effect(a,b){if(a>16||b>16)return 2;return{0:0,2:1,4:2,8:3}[D.pwt.typeChart[a][b]]??0;}
 function mainType(team,o){const n=new Array(17).fill(0);for(const r of team)for(const t of DEX[r.species].types){const i=TYPES.indexOf(t);if(i>=0)n[i]++;}const max=Math.max(...n);if(!max)return 17;const tied=n.map((v,i)=>v===max?i:-1).filter(i=>i>=0);return tied[Math.floor(rand(o)*tied.length)];}
 // WbtMatch_Play: higher rank wins; equal ranks go by type matchup (70%) or a coin flip; the player always advances.
 function play(a,b,o){const ea=effect(a.type,b.type),eb=effect(b.type,a.type);let first;if(a.rank===b.rank){if(ea===eb)first=Math.floor(rand(o)*2)===0;else{first=ea>eb;if(Math.floor(rand(o)*10)>=7)first=!first;}}else first=a.rank>b.rank;if(a.player)first=true;else if(b.player)first=false;return first;}
 function shuffle(list,o){for(let n=list.length;n>0;){const j=Math.floor(rand(o)*n);n--;[list[n],list[j]]=[list[j],list[n]];}return list;}
 function planPack(p,slot){const s=state(p).pwt,pk=pack(s.slots[slot]);if(!pwtOpen(p)||!pk)return{locked:true};const rule=rules(pk),o=stream(p),lv=level(rule,50),meta=FD().pwtTrainers,order=shuffle([0,1,2,3,4,5,6,7,8,9],o);let next=0;
  // WbtMakeMatch_PickDownloaded: the player, then seven slots of the cast or the table's download Trainers.
  const entrants=[{player:true,name:p.name,rank:R.record(p,'pwt-Champions').wins?4:3,type:17}];pk.slots.forEach((sl,i)=>{let group,t,m,name,pic,iv;if(sl.type==='downloaded'){const c=pk.cast[i];group=c.group;t={...FD().catalogs[group].trainers[c.trainer]};m=meta[c.trainer-1];name=m.name;pic=m.pic;iv=m.iv;delete t.anchor;}else{const index=sl.type==='second'?D.pwt.secondTen[order[next++]]:sl.type==='number'?sl.index:D.pwt.firstTen[order[next++]];m=meta[index];group=D.pwt.trainerArc===0?'pwt_regular':'pwt_masters';t={...FD().catalogs[group].trainers[m.index]};if(!m.special_pokemon)delete t.anchor;name=m.name;pic=m.pic;iv=m.iv;}const team=R.team(group,t,rule.count,lv,iv,()=>rand(o),rule.allowSameSpecies);if(team.length<rule.count)throw Error('Download pack '+pk.id+' slot '+i+' has '+team.length+' Pokémon');entrants.push({name,pic,rank:sl.rank,type:sl.type==='downloaded'?mainType(team,o):(m.type>16?17:m.type),team,cast:sl.type==='downloaded',intro:sl.type==='downloaded'?name+': '+pk.lines[0]:null});});
  // WbtMakeMatch_PlaceEntrants: shuffle, then seat the three highest ranks in the final, semifinal and first round.
  const shuffled=shuffle(entrants.slice(),o),pp=shuffled.findIndex(e=>e.player),others=shuffled.filter(e=>!e.player),seats=new Array(8).fill(null);seats[pp]=entrants[0];for(let j=0;j<6;j++)for(let i=j+1;i<7;i++)if(others[j].rank<others[i].rank)[others[j],others[i]]=[others[i],others[j]];seats[D.pwt.firstPlace[pp]+Math.floor(rand(o)*4)]=others[0];seats[D.pwt.secondPlace[pp]+Math.floor(rand(o)*2)]=others[1];seats[D.pwt.thirdPlace[pp]]=others[2];const rest=shuffle(others.slice(3),o);for(let i=0,k=0;i<8;i++)if(!seats[i])seats[i]=rest[k++];
  // WbtSystem_PlayFirstRounds, then WbtSystem_GetOpponentSeat for each round.
  const first=[0,1,2,3].map(i=>play(seats[i*2],seats[i*2+1],o)?i*2:i*2+1),second=[0,1].map(i=>play(seats[first[i*2]],seats[first[i*2+1]],o)?first[i*2]:first[i*2+1]),opp=[D.pwt.firstOpponents[pp],first[D.pwt.secondMatches[pp]],second[D.pwt.thirdMatches[pp]]];
  const opponents=opp.map(i=>{const e=seats[i];return{name:e.name,pic:e.pic,team:e.team,...(e.intro?{intro:e.intro}:{})};});
  return{kind:'pwt',download:true,key:'pwt-download-'+pk.id,name:pk.name,packId:pk.id,slot,style:pk.style,regulation:rule,double:pk.style===1,format:pk.style===2?'triples':pk.style===3?'rotation':undefined,count:rule.count,rounds:3,opponents,bracket:seats.map(e=>e.player?p.name:e.name),wcs:!!pk.isWcs};}
 function finishPack(p,spec,result){if(!result||result.outcome==='cancelled')return null;const s=state(p).pwt,rec=R.record(p,spec.key);rec.attempts++;let bp=0;if(result.outcome==='won'){rec.wins++;if(s.slots[spec.slot]===spec.packId)s.wins[spec.slot]=Math.min(D.pwt.countMax,(s.wins[spec.slot]||0)+1);bp=D.pwt.bp[spec.style];}award(p,bp);return{bp,record:rec};}

 // Wi-Fi Train: ranks 1-10, numbered trains of seven Trainers with three level-50 Pokémon; one try per train a day.
 function wifiState(p){return state(p).wifi;}
 function wifiTrain(rank,room){const o={seed:(Math.imul(rank,0x9e3779b1)^Math.imul(room,0x85ebca6b)^0x57494649)>>>0},[min,max]=D.wifi.ranges[rank-1],cat=FD().catalogs.battle_subway,pool=cat.trainers.filter((t,j)=>t&&j>=min&&j<=max),out=[];for(let i=0;i<D.wifi.players;i++){const t=pool.splice(Math.floor(rand(o)*pool.length),1)[0],team=R.team('battle_subway',t,D.wifi.members,D.wifi.level,R.subwayIv(t.index),()=>rand(o));out.push({sourceIndex:t.index,name:label(t),pic:t.pic,team});}return out;}
 function planWifi(rank,room,ranked){return{kind:'wifi',key:'subway-wifi',ranked,rank,room,double:false,count:D.wifi.members,opponents:wifiTrain(rank,room),rounds:D.wifi.players};}
 function boardWifi(p,room){const w=wifiState(p),day=Player.gameTime(p).day,k=w.rank+'-'+room;if(!(room>=1&&room<=D.wifi.rooms))return{invalid:true};for(const[a,v]of Object.entries(w.taken))if(v!==day)delete w.taken[a];if(w.taken[k]===day)return{taken:true};w.taken[k]=day;w.train={rank:w.rank,room};return planWifi(w.rank,room,true);}
 function earlierWifi(p){const w=wifiState(p);return w.train?planWifi(w.train.rank,w.train.room,false):{none:true};}
 function taken(p,rank,room){return wifiState(p).taken[rank+'-'+room]===Player.gameTime(p).day;}
 // BsubwayScr_UpdateStageRank: a loss counts toward the rank's demotion limit; a win promotes and clears the count.
 function lose(w){if(w.losing)w.lose=Math.min(255,w.lose+1);else{w.losing=true;w.lose=1;}if(w.rank===1)return false;if(w.lose>=D.wifi.loseLimits[w.rank-1]){w.rank--;w.lose=0;w.losing=false;return true;}return false;}
 function finishWifi(p,spec,result){const w=wifiState(p);delete w.pending;if(!result||result.outcome==='cancelled')return null;const rec=R.record(p,'subway-wifi'),wins=result.wins||0,won=result.outcome==='won';rec.attempts++;rec.streak=wins;rec.best=Math.max(rec.best,wins);let bp=0,promoted=false,demoted=false;
  // BSubwayScoreData_CalcWifiScore without the untracked fainted/damage terms.
  const score=Math.min(9999,wins*1000+Math.max(0,950-(result.turns||0)*10));if(won){rec.wins++;bp=spec.ranked?D.wifi.bp[Math.min(9,Math.max(0,w.rank-1))]:D.wifi.unrankedBp;if(spec.ranked){w.losing=false;w.lose=0;if(w.rank<D.wifi.rankMax){w.rank++;promoted=true;}}}else if(spec.ranked)demoted=lose(w);
  const k=spec.rank+'-'+spec.room,r=w.records[k]||(w.records[k]={best:0,clears:0,tries:0});r.tries++;r.best=Math.max(r.best,score);if(won)r.clears++;w.lastScore=score;award(p,bp);return{bp,record:rec,score,promoted,demoted,rank:w.rank};}

 // Battle Institute special tests (TrialHouse downloaded examination): one try each, scored into seven source ranks.
 // TrialHouseCalcPointScore weighs wins at 1000 like this; its other battle statistics are not tracked, so a
 // turn-based bonus stands in for them.
 function offer(p){const s=state(p).institute;return D.institute.tests.find(t=>!s.received.includes(t.id))||null;}
 function pendingTest(p){const s=state(p).institute;return D.institute.tests.find(t=>s.received.includes(t.id)&&!s.used.includes(t.id))||null;}
 function receiveTest(p){const t=offer(p);if(t)state(p).institute.received.push(t.id);return t;}
 function planTest(p,id){const t=D.institute.tests.find(a=>a.id===id),s=state(p).institute;if(!t||!s.received.includes(id)||s.used.includes(id))return{locked:true};const cat=FD().catalogs.battle_subway,o={seed:(0x54455354^Math.imul(id,0x2545f491))>>>0},count=t.double?4:3;return{kind:'institute',special:true,key:'institute-special',testId:id,double:t.double,count,rounds:5,opponents:t.opponents.map((idx,i)=>{const tr=cat.trainers[idx];return{sourceIndex:idx,name:label(tr),pic:tr.pic,team:R.team('battle_subway',tr,count,50,t.ivs[i],()=>rand(o)),intro:text(D.institute.text.WillFacingOpponentNo,i+1).join('\n')};})};}
 function rankOf(points){let r=0;D.institute.thresholds.forEach((v,i)=>{if(points>=v)r=i+1;});return r;}
 function finishTest(p,spec,result,team=[]){const s=state(p).institute;delete s.pending;if(!result||result.outcome==='cancelled')return null;if(!s.used.includes(spec.testId))s.used.push(spec.testId);const points=Math.max(0,Math.min(9999,(result.wins||0)*1000+Math.max(0,1500-(result.turns||0)*15))),rank=rankOf(points),rec=R.record(p,'institute-special');rec.attempts++;if(result.outcome==='won')rec.wins++;rec.score=Math.max(rec.score||0,points);s.records[spec.testId]={points,rank,double:spec.double,team};return{points,rank,name:D.institute.ranks[rank],record:rec};}

 // Interrupted challenges (Unova.recover): a ranked Wi-Fi train counts as a loss and a started Battle Test is spent.
 function recover(p){const d=R.state(p).downloads;if(!d)return;if(d.wifi?.pending){delete d.wifi.pending;lose(d.wifi);}if(d.institute?.pending){if(!d.institute.used.includes(d.institute.pending))d.institute.used.push(d.institute.pending);delete d.institute.pending;}}

 // The PWT's Tournament Download System beside the reception and the Gear Station's Wi-Fi Train platform attendant.
 for(const[map,a]of [['UnovaPWTStage',{id:'bw-download-pwt',localId:'BW_DOWNLOAD_PWT',x:10,y:15,script:'bw:download-pwt',sprite:'bw2_clerk_f'}],['UnovaGearStation',{id:'bw-download-wifi',localId:'BW_DOWNLOAD_WIFI',x:17,y:6,script:'bw:download-wifi',sprite:'bw2_depot_agent'}]]){const m=window.WORLD_MAPS?.[map];if(m&&!m.people.some(n=>n.script===a.script))m.people.push({...a,width:32,height:32,frames:9,movement:'face_down',rangeX:0,rangeY:0});}

 window.UnovaDownloads={data:()=>D,state,text,rules,level,entry,eligible,describe,pwtOpen,receive,remove,saved,planPack,finishPack,wifiState,wifiTrain,boardWifi,earlierWifi,taken,finishWifi,lose,offer,pendingTest,receiveTest,planTest,finishTest,rankOf,recover,play,mainType};
})();
