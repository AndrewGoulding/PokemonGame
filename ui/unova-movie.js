// Isolated film battles: rental casts and the optional player's own performer
// are copied. Filming never replaces the party or exposes the player's Bag.
(function(){
 'use strict';
 async function shoot(p,movie=0,{own,say,choose,dialogue=false}={}){const R=UnovaMovies,m=R.data().movies[movie],text=m.dialogue[Player.LOOKS[p.look]?.girl?'female':'male'],spoken=t=>String(t||'').replaceAll('{PLAYER}',p.name).replaceAll('{HERO}',p.name);let dialoguePoints=0;const seen=new Set();
 async function scene(a){if(!dialogue||!say)return;for(let column=0;column<10;column++)for(const row of a.messages){const n=row[column];if(n>=0&&text[n])await say(spoken(text[n]));}const choices=a.choices.filter(c=>c.message>=0&&text[c.message]);if(choices.length&&choose){const labels=choices.map(c=>spoken(text[c.message])),selected=await choose('Choose your line',labels),at=labels.indexOf(selected);if(at>=0){dialoguePoints+=choices[at].points;if(choices[at].message2>=0&&text[choices[at].message2])await say(spoken(text[choices[at].message2]));}}}
 const rentals=R.team(movie,'player'),players=own?[JSON.parse(JSON.stringify(own))]:rentals,foes=R.team(movie,'opponent'),gender=Player.LOOKS[p.look]?.girl?'female':'male',pic='bw2_'+m.trainer_classes[gender].film.slice(14).toLowerCase();
 const result=await BattleScreen.run({p1:{name:p.name,team:players.map(Party.toBattleSet)},p2:{name:'Pokéstar Cast',team:foes.map(Party.toBattleSet)},trainer:Player.LOOKS[p.look].back,foeTrainer:pic==='bw2_red_fog'?undefined:pic,exp:false,noCatch:true,levelCap:100,bag:{},bagPockets:()=>[{name:'Items',items:[]}],record:true,movieRules:R.rules(movie),beforeChoice:async b=>{if(seen.has(b.turn))return;seen.add(b.turn);for(const a of m.scenes.filter(a=>a.turn===b.turn-1))await scene(a);},
 // The stage's DS event VM is represented by a deterministic local move cycle.
 // Movie goals and the casts themselves come from the source, not normal AI.
 opponent:b=>{const req=b.getRequest('p2');if(req.phase!=='move')return b.randomChoice('p2');const mon=b.sides.p2.active,usable=req.moves?.map((a,i)=>({a,i})).filter(v=>!v.a.disabled)||[],pick=usable.length?usable[(b.turn-1)%usable.length].i:0;return{type:'move',move:pick};}});
 const mission=result.battle.movieOutcome===1,endingTurn=mission?(dialoguePoints<0?102:100):101;for(const a of m.scenes.filter(a=>a.turn===endingTurn))await scene(a);return{outcome:result.outcome,turns:result.battle.turn,ruleOutcome:result.battle.movieOutcome,record:result.record,dialoguePoints,own:!!own};
 }
 window.UnovaMovie={shoot};
})();
