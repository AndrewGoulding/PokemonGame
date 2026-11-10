(function(){
 'use strict';
 function create({env,fight,report,resume,checkpoint}){
  const F=Unova,p=()=>env.player(),s=()=>F.state(p()),d=()=>F.data().chapter,say=x=>env.say(x);
  async function film(){
   if(!s().roxie){await say('The director is waiting until\nyou finish Roxie’s Gym challenge.');return;}
   await say('Director: Brycen-Man is a two-scene\nhero film. Use our rental Riolu!\nDefeat Pawniard, then Vullaby.\nFinish in two turns for a good ending.');
   if(!await env.confirm('Film Brycen-Man?'))return;
   const r=await env.movie();await resume();F.movieResult(p(),r);await checkpoint();
   await say(r.outcome==='won'&&r.turns<=d().movie.script.turn_limit?'Cut! A good ending!\nVisit the theater to release your film.':'Cut! That take needs another try.\nCheck the opponent’s weaknesses,\nand ask for another rehearsal.');
  }
  async function screening(){if(!s().movieGood){await say('The captain’s film received a\nquiet reception. Try making your\nown Brycen-Man film at the soundstage.');return;}if(!s().movieReleased){s().movieReleased=true;await checkpoint();await say('Your Brycen-Man film premiered!\nThe audience cheers the hero’s victory.\nRoxie’s father has returned to his ship.');}else await say('Now showing: '+p().name+' in Brycen-Man!\nThe captain is sailing from Virbank.');if(s().movieRecord&&await env.confirm('Watch your Brycen-Man film?')){await env.replay(s().movieRecord);await resume();}}
  async function plasma(where){
   if(!s().movieReleased){await say('Visit Pokéstar Studios and release\nyour first film before meeting\nHugh and Roxie at the harbor.');return;}
   if(where==='route20'&&!s().plasmaVirbank){await say('Hugh is still searching around\nVirbank’s harbor. Meet him first.');return;}
   const flag=where==='virbank'?'plasmaVirbank':'plasmaRoute20';
   if(!s()[flag]){if(await fight(d().plasma[where])!=='won')return;s()[flag]=true;env.refreshPeople?.();await checkpoint();}
   if(where==='virbank'){await say('Roxie: They ran toward Route 20!\nTake this Hidden Machine, then\nhelp Hugh track them down.');await report(F.gift(p(),'cut',F.data().rewards.cut));}
   else await say('The grunt escaped toward the port!\nHugh: We’ve checked Route 20.\nMeet me at Virbank’s ship.');
  }
  async function sail(back=false){
   if(!back&&s().plasmaVirbank&&!s().gifts.cut){await say('Roxie left this Hidden Machine\nwith the captain for you.');await report(F.gift(p(),'cut',F.data().rewards.cut));}
   if(!back&&(!s().movieReleased||!s().plasmaVirbank||!s().plasmaRoute20)){await say('The captain will sail after your\nfilm premiere and the Plasma chase.\nMeet Hugh and Roxie near the harbor.');return;}
   if(await env.confirm('Sail to '+(back?'Virbank':'Castelia')+' City?')){await env.teleport({...d()[back?'virbankReturn':'arrival']});s().sailed=true;F.visit(p(),p().location.map);await checkpoint();await say(back?'You arrived at Virbank’s harbor.':'Welcome to Castelia City!\nThe Harlequin Hunt greeter is\nnorth of the central pier.');}
  }
  async function hugh(){if(!s().sailed){await say('Meet Hugh after sailing from Virbank.');return;}if(s().sewerClear){await report(F.gift(p(),'strength',F.data().rewards.strength));await say('Hugh: Thanks for your help!\nBurgh has returned to his Gym.');return;}if(await env.confirm('Search the sewers with Hugh?')){s().sewerPartner=true;p().party.forEach(Party.heal);await checkpoint();await say('Hugh: I’ll heal our Pokémon.\nFind the two Plasma grunts together!');}}
  async function sewers(){if(!s().sewerPartner){await say('Hugh is waiting near the sewer\nentrance. Ask him to join you.');return;}if(!s().sewerClear){
   const t=F.data().trainers[d().plasma.sewers[1]];
   const partner=F.sewerPartner(p());
   if(await fight(d().plasma.sewers[0],{double:true,partner,foe2:{name:t.className+' '+t.name,team:F.team(d().plasma.sewers[1]),pic:t.pic,prizeClass:t.className,defeatText:t.defeat}})!=='won')return;
   s().sewerClear=true;delete s().sewerPartner;p().party.forEach(Party.heal);env.refreshPeople?.();await checkpoint();
   await say(F.text('CasteliaSewers_Text_BurghYessirOneSame',p()));await say('Colress: Your Pokémon’s strength\nis fascinating. We shall meet again.');
  }await report(F.gift(p(),'strength',F.data().rewards.strength));await say('Burgh: Come challenge my Gym!');}
  async function cocoon(n){if(!s().sewerClear){await say('Burgh is investigating the sewers.\nFind him with Hugh first.');return;}if(!p().flags[d().gymStudents[n]]){await say('Defeat this gallery’s Harlequin\nbefore riding the silk cocoon.');return;}const a=d().cocoons[n];if(await env.confirm('Ride the silk cocoon upward?')){(s().cocoons||(s().cocoons=[]))[n]=true;await env.teleport({map:a.to,x:a.x,y:a.y,facing:'up'});await checkpoint();}}
  async function burgh(){if(s().burgh){await report(F.gymWon(p(),'burgh'));await say('Burgh: The next Gym is in Nimbasa.\nRoute 4 lies north of Castelia.');return;}if(!F.gymReady(p(),'burgh')){await say('Find Burgh in the sewers, then\nclear all three silk galleries\nbefore challenging him.');return;}if(!await env.confirm('Challenge Leader Burgh?'))return;if(await fight(d().burgh)!=='won')return;await report(F.gymWon(p(),'burgh'));await say('You earned the Insect Badge!');await checkpoint();}
  async function hunt(n){if(!s().huntStarted){await say('Meet the Harlequin Hunt greeter\nby the central pier first.');return;}const a=s().hunt||(s().hunt=[]);if(!a.includes(n))a.push(n);await checkpoint();await say('Harlequin found! '+a.length+'/3.\nReturn to the greeter after\nvisiting all three offices.');}
  async function run(key){
   if(key.startsWith('company-fight-')){const n=+key.slice(14),id=d().companyTrainers[n];if(!p().flags[id]&&await fight(id)!=='won')return true;if(n<2)await report(F.gift(p(),'company-balls-'+n,n?'timer-ball':'quick-ball',2));else await say('Neil: Our research has much more\nwork to do. Keep enjoying battles!');return true;}
   if(key.startsWith('cocoon-')){await cocoon(+key.slice(7));return true;}
   if(/^hunt-[0-2]$/.test(key)){await hunt(+key.slice(5));return true;}
   switch(key){
    case'studio-locked':await say('Challenge Roxie before joining\nthe studio’s next film shoot.');await env.teleport({map:'UnovaVirbankCity',x:28,y:10,facing:'down'});break;
    case'gym-burgh-locked':await say('Burgh is looking for Team Plasma\nin the sewers. Meet Hugh there first.');await env.teleport({map:'UnovaCasteliaCity',x:9,y:12,facing:'down'});break;
    case'studios':await env.teleport({...d().studios});await checkpoint();break;
    case'studio-guide':await say('The theater is to the west.\nThe soundstage is northeast.\nMake a film, then release it here.');break;
    case'film':await film();break;
    case'film-help':await say('Your rental Riolu knows Force Palm\nand Ice Punch. Check type matchups!\nYour own party and Bag stay safe.');break;
    case'screening':await screening();break;
    case'plasma-virbank':await plasma('virbank');break;
    case'plasma-route20':await plasma('route20');break;
    case'harbor':await sail();break;
    case'castelia-ferry':await sail(true);break;
    case'iris':await say(s().sewerClear?'Iris: Burgh is back at his Gym!':'Iris: Hugh is looking for Plasma.\nThe sewer entrance is at the\npier just south of me.');break;
    case'hugh-sewer':await hugh();break;
    case'sewer-plasma':await sewers();break;
    case'sewer-doctor':if(!p().flags[d().doctor]&&await fight(d().doctor)!=='won')break;p().party.forEach(Party.heal);await say('Doctor Heath healed your Pokémon.');await checkpoint();break;
    case'burgh':await burgh();break;
    case'clyde-burgh':await report(F.gift(p(),'burgh-water','fresh-water'));await say('Burgh’s Bug types favor their\nsilk galleries. Defeat each Harlequin\nand ride the cocoon to the next room.');break;
    case'harlequin-hunt':if(!s().huntStarted){if(!await report(F.gift(p(),'bicycle','bicycle')))break;s().huntStarted=true;await checkpoint();}if((s().hunt||[]).length===3)await report(F.gift(p(),'hunt-prize','rare-candy'));else await say('Find Harlequins in the Medal Office,\nPasserby Analytics HQ and\nBattle Company.');break;
    case'company-reward':await report(F.gift(p(),'company-exp-share','exp-share'));await say('The Battle Company trains on\nboth floors. Meet our president\nupstairs when you are ready.');break;
    case'scope-lens':await report(F.gift(p(),'company-scope','scope-lens'));break;
    case'garden-guide':await say('This garden is reached through\nthe sewers. Look for rare Pokémon\nin the grass, including Eevee!');break;
    case'relic-deep':await say('This is the Castelia entrance\nto Relic Passage. The deeper\nexcavation is still closed.');break;
    case'city-building-closed':await say('Residential apartments.\nThere is no public entrance here.');break;
    case'next-road':await say(s().burgh?'Colress is researching on Route 4.\nThe northern road is being prepared.':'Earn Burgh’s Insect Badge before\ncontinuing toward Route 4.');break;
    default:return false;
   }return true;
  }
  function visible(a){if(a.script==='bw:plasma-virbank')return!!s().movieReleased&&!s().plasmaVirbank;if(a.script==='bw:plasma-route20')return!!s().plasmaVirbank&&!s().plasmaRoute20;if(a.script==='bw:sewer-plasma')return!s().sewerClear;return undefined;}
  function step(){const a=p().location;if(['UnovaCasteliaGym','UnovaCasteliaCocoon1','UnovaCasteliaCocoon2','UnovaCasteliaBurgh'].includes(a.map)&&!s().sewerClear)return{type:'trigger',map:a.map,trigger:{script:'bw:gym-burgh-locked'}};if(a.map?.startsWith('UnovaPokestar')&&!s().roxie)return{type:'trigger',map:a.map,trigger:{script:'bw:studio-locked'}};return null;}
  return{run,visible,step};
 }
 window.UnovaCastelia={create};
})();
