// The first Pokéstar film: source rentals and foes in an isolated native battle.
// This does not replace the player's party or expose its Bag to the movie.
(function(){
 'use strict';
 async function shoot(p){
  const team=side=>Unova.movieTeam(side).map(r=>Party.toBattleSet(r));
  const result=await BattleScreen.run({p1:{name:p.name,team:team('player')},p2:{name:'Brycen-Man',team:team('opponent')},trainer:Player.LOOKS[p.look].back,foeTrainer:'bw2_brycen',exp:false,noCatch:true,levelCap:100,bag:{},bagPockets:()=>[{name:'Items',items:[]}],record:true,
   // A rehearsal opponent follows its first listed move, rather than normal AI.
   // This is the browser adaptation of the movie's scripted battle direction.
   opponent:b=>b.getRequest('p2').phase==='move'?{type:'move',move:0}:b.randomChoice('p2')});
  return{outcome:result.outcome,turns:result.battle.turn,record:result.record};
 }
 window.UnovaMovie={shoot};
})();
