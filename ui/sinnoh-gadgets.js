(function(){
 'use strict';
 function create(env){const p=()=>env.player(),s=()=>SinnohGadgets.state(p()),say=t=>env.say(t);const questions={1:'Do Pokémon grow by defeating\nother Pokémon and gaining Exp. Points?',2:'Can a Pokémon hold an item?',3:'Do Pokémon moves have types?'};
  async function run(script){if(!script?.startsWith('pt:device-'))return false;const key=script.slice(10);if(key.startsWith('clown-')){const n=+key.at(-1),coupons=s().coupons||(s().coupons={});if(coupons[n])await say('You already earned my coupon!');else{const answer=await env.choose(questions[n],['Yes','No']);if(answer==='Yes'){Player.addItem(p(),'poketch-coupon-'+n);coupons[n]=true;await say('Correct! Here is Pokétch Coupon '+n+'!');}else if(answer)await say('That’s not right. Try again!');}}
   else if(key==='president'){if(SinnohGadgets.owns(p())){if(SinnohGadgets.researchGift(p()))await say('{PLAYER} received the Poké Radar!');await say('Your Pokétch has '+SinnohGadgets.count(p())+' apps.\nEarn Sinnoh badges and complete\nRowan’s research for more apps.\nOpen it from the Bag’s Key Items.');}else if(![1,2,3].every(n=>s().coupons?.[n])){s().quest=true;await say('Pokétch campaign! Find the three\nclowns in Jubilife and answer\ntheir Pokémon quizzes. Bring\nall three coupons back to me!');}else{for(let n=1;n<=3;n++)Player.removeItem(p(),'poketch-coupon-'+n);Player.addItem(p(),'poketch');s().given=true;s().pedometerBase=Player.gameTime(p()).steps;s().history=p().pokedex.caught.slice(-12).reverse();SinnohGadgets.researchGift(p());await say('{PLAYER} received the Pokétch!\nUse it from the Bag’s Key Items.\nApps unlock with Sinnoh badges\nand Rowan’s research.');}}
   else if(key==='radar-encounter'){const pending=SinnohRadar.peek(p()).pending;if(pending&&env.canBattle()){await env.battle('wild',{foe:{name:'Wild',team:[pending.record]},radar:true,noGimmicks:true});env.showWorld();await env.resume();}else SinnohRadar.clear(p());}
   else if(key==='alert'){const text=s().pendingAlert;delete s().pendingAlert;env.sfx('se_ding_dong');if(text)await say(text);}
   else throw Error('Unknown Pokétch scene '+key);return true;
  }
  function step(){const radar=SinnohRadar.step(p(),env.avatar?env.avatar():'walk');if(radar)return radar;const alert=SinnohGadgets.alerts(p());if(alert){s().pendingAlert=alert;return{type:'trigger',map:p().location.map,trigger:{script:'pt:device-alert'}};}return null;}
  return{run,step};
 }
 window.SinnohGadgetScenes={create};
})();
