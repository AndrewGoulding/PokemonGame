(function(){
 'use strict';
 function create(env){const p=()=>env.player(),s=()=>SinnohLegends.state(p()),say=t=>env.say(t),event=k=>({type:'trigger',map:p().location.map,trigger:{script:'pt:exp-'+k}});
  async function run(script){if(!script?.startsWith('pt:exp-'))return false;const key=script.slice(7);
   if(key==='mira'){if(s().miraEscorted){await say('Mira: Thank you for helping me\nfind my way out!');return true;}if(!s().miraJoined&&await env.confirm('Mira is lost. Help her find the exit?')){s().miraJoined=true;env.refreshPeople();await say('Mira joined you! Her Kadabra\nwill help in battles. She will\nheal your team after each battle.');}}
   else if(key==='mira-finish'){if(s().miraJoined&&!s().miraEscorted){s().miraEscorted=true;env.refreshPeople();await say('Mira: We found the entrance!\nThank you! I hope we can\nbattle together again someday.');}}
   else if(key==='marley-entrance'){if(!p().flags.sinnohLeagueClear||!s().nationalDex){await say('The eastern passage opens after\nyou become Champion and finish\nRowan’s regional research.');}else await env.teleport({map:'PlatinumExpMarley',x:16,y:31,facing:'up'});}
   else if(key==='marley'){if(s().marleyEscorted){await say('Marley: Route 224 is just ahead.');return true;}if(!s().marleyJoined&&await env.confirm('Marley wants to reach Route 224.\nTravel together?')){s().marleyJoined=true;env.refreshPeople();await say('Marley joined you! Her Arcanine\nwill help in battles and she\nwill heal your team afterward.');}}
   else if(key==='marley-exit'){if(!s().marleyJoined&&!s().marleyEscorted){await say('Someone near the entrance\nneeds help reaching this exit.');}else{if(!s().marleyEscorted){s().marleyEscorted=true;env.refreshPeople();await say('Marley: Thank you...\nI’m looking for a Pokémon\nin a garden beyond this route.');}await env.teleport({...PLATINUM_DATA.expeditions.route224});}}
   else if(key==='marley-return'){if(s().marleyEscorted)await env.teleport({map:'PlatinumExpMarley',x:16,y:5,facing:'down'});else await say('The passage leads to Victory Road.\nMeet Marley inside first.');}
   else if(key==='defog-hm'){const id=FieldMoves.hmFor('Defog');if(!s().defogHM){if(!Player.itemCount(p(),id))Player.addItem(p(),id);s().defogHM=true;env.refreshPeople();await say('{PLAYER} found '+Bag.name(id)+'!');}await say('The Relic Badge lets you use\nDefog outside battle. Try it\nin Lost Tower on Route 209.');}
   else if(key==='tower-stairs')await say('The stairs lead to the next floor.');
   else if(['spell-tag','cleanse-tag'].includes(key)){const map=p().location.map;if(!(s().defogMaps||{})[map])await say('Please use Defog to clear\nthe mist on this floor first.');else if(!s()['gift-'+key]){Player.addItem(p(),key);s()['gift-'+key]=true;await say('{PLAYER} received '+Bag.name(key)+'!');}else await say('Thank you for clearing the mist.');}
   else if(key==='earthquake'){if(!s().earthquake){if(!env.onBike()){await say('A Bicycle is needed to cross\nthe basement’s final jump.');return true;}const id=Bag.machines().find(i=>Bag.machineMove(i)==='Earthquake');Player.addItem(p(),id);s().earthquake=true;await say('{PLAYER} found '+Bag.name(id)+'!');}else await say('The hidden basement is home\nto wild Gible.');}
   else if(key==='bike-ramp')await say('Use your Bicycle to cross\nthe basement’s jump course.');else throw Error('Unknown expedition '+key);return true;
  }
  function visible(a){if(a.script==='pt:exp-mira')return!s().miraJoined&&!s().miraEscorted;if(a.script==='pt:exp-marley')return!s().marleyJoined&&!s().marleyEscorted;return undefined;}
  function step(){const a=p().location;if(a.map==='PlatinumExpWayward'&&a.y>=30&&s().miraJoined&&!s().miraEscorted)return event('mira-finish');return null;}
  return{run,visible,step};
 }
 window.SinnohExpeditionScenes={create};
})();
