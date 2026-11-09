// Three-Gym middle campaign, using imported parties/messages and persistent
// puzzle stages. Presentation stays explicit rather than interpreting DS code.
(function () {
  "use strict";
  const SHAPES=["Triangle","Square","Circle","Star","Heart"];
  const LEADERS={
    fantina:{badge:"relic",prior:"forest",id:"PT_TRAINER_LEADER_FANTINA",name:"Fantina",move:"Shadow Claw",intro:"HearthomeGym_Text_FantinaIntro",receive:"HearthomeGym_Text_FantinaReceiveRelicBadge",after:"HearthomeGym_Text_FantinaAfterBadge"},
    maylene:{badge:"cobble",prior:"relic",id:"PT_TRAINER_LEADER_MAYLENE",name:"Maylene",move:"Drain Punch",intro:"VeilstoneGym_Text_MayleneIntro",receive:"VeilstoneGym_Text_MayleneReceiveBadge",after:"VeilstoneGym_Text_MayleneAfterBadge"},
    wake:{badge:"fen",prior:"cobble",id:"PT_TRAINER_LEADER_WAKE",name:"Crasher Wake",move:"Brine",intro:"PastoriaGym_Text_WakeIntro",receive:"PastoriaGym_Text_WakeReveiveFenBadge",after:"PastoriaGym_Text_WakeAfterbadge"}
  };
  function create(env) {
    const player=()=>env.player(), state=()=>Sinnoh.state(player());
    const say=(id,buffers)=>env.say(Sinnoh.text(id,player(),buffers));
    const refresh=()=>env.refreshMap?env.refreshMap():env.refreshPeople();
    const event=key=>({type:"trigger",map:player().location.map,trigger:{script:"pt:"+key}});
    function foe(id,name) {const t=PLATINUM_DATA.trainers[id];return{name:name||t.className+" "+t.name,team:Sinnoh.team(id),pic:t.pic};}
    async function fight(id,extra={}) {
      if(!env.canBattle())return false;const t=PLATINUM_DATA.trainers[id];
      const outcome=await env.battle("trainer",{foe:foe(id),trainerId:id,defeatText:t.defeat,prizeClass:t.className,...extra});
      if(outcome!=="won")return false;player().flags[id]=true;env.showWorld();await env.resume();return true;
    }
    async function dawn207() {
      if(state().dawn207){await env.say("Dawn: Speak to Trainers again for\nrematches. Use your Itemfinder\nto search for hidden items.");return;}
      if(!state().jupiter){await env.say("Dawn: Help the people in Eterna City\nbefore continuing east.");return;}
      if(!Player.itemCount(player(),"itemfinder"))Player.addItem(player(),"itemfinder");
      state().dawn207=true;
      // The project deliberately removed the VS Seeker in favor of talking
      // to beaten Trainers. Do not award a key item deleted by save migration.
      await env.say("Dawn: You've been working hard!\nHere is an Itemfinder to help\nwith your travels.");
      await env.say("Use it from the Bag or register it\nto Select. You can ask Trainers\nfor rematches by speaking to them\nagain after a battle.");
      await env.say("Keep going east through Mt. Coronet.\nHearthome City is on the far side.");
    }
    async function cyrus() {
      if(state().cyrusMet)return;
      await say("MtCoronet1FSouth_Text_MtCoronetIsWhereSinnohBegan");
      await say("MtCoronet1FSouth_Text_InANewlyCreatedWorld");
      await say("MtCoronet1FSouth_Text_ButWhatBecameOfThatWorld");
      state().cyrusMet=true;refresh();
    }
    async function welcome() {
      if(!state().hearthomeWelcome){state().hearthomeWelcome=true;await env.say("Welcome to Hearthome City!\nFantina is our Ghost-type Gym Leader.\nHer Gym is on the north-east plaza.");}
      else await env.say("Hearthome's Gym tests your eyes\nin the dark. Match the blue tile's\nsymbol to the symbol above a door.");
    }
    async function haunt(room,shape) {
      const at=player().location;
      if(at.map!=="HearthomeGym_Room"+room)return;
      if(shape===Sinnoh.hauntShape(player(),room)) {
        state()["haunt"+room]=true;
        await env.say("The symbols match! The door opens.");
        await env.teleport(room===1?{map:"HearthomeGym_Room2",x:14,y:22,facing:"up"}:{map:"HearthomeGym_Leader",x:4,y:13,facing:"up"});
      } else {
        await env.say("The symbols don't match...\nYou are back at the entrance!");
        await env.teleport({map:"HearthomeCity_Gym",x:4,y:7,facing:"up"});
      }
    }
    async function punch(n) {
      const stage=state().mayleneBags|0;
      if(stage>n)return;
      if(stage!==n){await env.say("Clear the punching bag nearest\nthe entrance first.");return;}
      state().mayleneBags=n+1;env.sfx("se_m_rock_throw");refresh();
      await env.say("The punching bag swung forward\nand knocked down the tyre wall!");
    }
    async function water(n) {
      const stage=state().wakeWater|0;
      if(stage>n){await env.say("This basin is already set.");return;}
      if(stage!==n){await env.say("Set the lower basin first.\nYellow, then green, then blue.");return;}
      state().wakeWater=n+1;env.sfx("se_door");refresh();
      await env.say(["The yellow switch drained the lower\nbasin. Its walkway is clear!","The green switch raised the middle\nbasin's bridge!","The blue switch filled the upper\nbasin. The final bridge is ready!"][n]);
    }
    async function leader(key) {
      const p=player(),s=state(),d=LEADERS[key];
      if(!p.badges.includes(d.badge)) {
        const ready=key==="fantina"?s.jupiter&&s.haunt1&&s.haunt2:key==="maylene"?s.rival209&&(s.mayleneBags|0)>=3:s.veilstoneGalactic&&s.rivalPastoria&&(s.wakeWater|0)>=3;
        if(!p.badges.includes(d.prior)||!ready){await env.say(key==="fantina"?"Fantina: Earn Eterna's Forest Badge,\nthen match both shadow-room symbols\nbefore challenging me.":key==="maylene"?"Maylene: Battle Barry after Hearthome\nand clear all three punching bags\nbefore challenging me.":"Wake: Help Dawn in Veilstone, battle\nBarry outside, then set all three\ncolored switches before facing me!");return;}
        await say(d.intro);
        if(!await fight(d.id,{foe:foe(d.id,"Leader "+d.name),terrain:"gym"}))return;
        p.badges.push(d.badge);
        const banks=key==="fantina"?["hearthome_city_gym_trainer_room_1","hearthome_city_gym_trainer_room_2"]:[key==="maylene"?"veilstone_city_gym":"pastoria_city_gym"];
        for(const bank of banks)for(const a of PLATINUM_DATA.additions[key==="fantina"?(bank.endsWith("1")?"HearthomeGym_Room1":"HearthomeGym_Room2"):key==="maylene"?"VeilstoneCity_Gym":"PastoriaCity_Gym"]||[])if(a.trainer)p.flags[a.trainer.id]=true;
        await say(d.receive);
        await env.say("Your Sinnoh level cap is now "+Player.levelCap(p)+".");
      }
      if(!s[key+"TM"]) {
        const tm=Bag.machines().find(id=>Bag.machineMove(id)===d.move);if(!tm)throw Error("Missing machine: "+d.move);
        Player.addItem(p,tm);s[key+"TM"]=true;await env.say("{PLAYER} received "+Bag.name(tm)+"!\nIt teaches "+d.move+" and is reusable.");
        if(key==="maylene")await env.say("Dawn is waiting near the Galactic\nwarehouse in northern Veilstone.");
        if(key==="wake")await env.say("The Fen Badge permits Surf in Sinnoh\nonce you obtain its HM.\nCelestic Town holds the next clue.");
      } else await say(d.after);
    }
    async function rival(where) {
      const s=state(),p=player(),pastoria=where==="pastoria",flag=pastoria?"rivalPastoria":"rival209";
      if(s[flag]){await env.say("Barry: Next time, I'm winning!");return;}
      if(!p.badges.includes(pastoria?"cobble":"relic")||pastoria&&!s.veilstoneGalactic){await env.say(pastoria?"Barry: Help Dawn at Veilstone's\nGalactic warehouse first!":"Barry: Beat Fantina before\nheading out to Route 209!");return;}
      if(!pastoria)await say("Route209GateToHearthomeCity_Text_LetsGetTheShowStarted",["Barry",p.name]);
      else await env.say("Barry: I'm training with Crasher Wake!\nLet's see how tough you've become!");
      const id="PT_TRAINER_RIVAL_"+(pastoria?"PASTORIA_CITY_":"ROUTE_209_")+(s.starter||"Turtwig").toUpperCase();
      if(!await fight(id))return;s[flag]=true;refresh();
      if(!pastoria)await say("Route209GateToHearthomeCity_Text_MyStrategyDoesntWork",["Barry",p.name]);
      else await env.say("Barry: All right! Go challenge Wake.\nI'll keep getting stronger!");
    }
    async function galactic() {
      const p=player(),s=state();if(s.veilstoneGalactic){await env.say("Dawn: Thank you! The warehouse\nholds the Fly HM. It's yours now.");return;}
      if(!p.badges.includes("cobble")){await env.say("Dawn: Please take on Maylene's Gym,\nthen help me recover my Pokédex\nfrom these Galactic Grunts!");return;}
      await say("VeilstoneCity_Text_DawnAskForHelp",["Dawn",p.name]);
      const one="PT_TRAINER_GALACTIC_GRUNT_VEILSTONE_CITY_1",two="PT_TRAINER_GALACTIC_GRUNT_VEILSTONE_CITY_2";
      const chosen=p.party.map((m,i)=>Party.canFight(m)?i:-1).filter(i=>i>=0).slice(0,3);
      if(!await fight(one,{chosen,partner:{name:"Dawn",team:Sinnoh.team("PT_TRAINER_DAWN_VEILSTONE_CITY_"+(s.starter||"Turtwig").toUpperCase()),pic:"pt_dawn_dp"},foe2:{...foe(two),defeatText:PLATINUM_DATA.trainers[two].defeat,prizeClass:"Galactic Grunt"}}))return;
      p.flags[two]=true;s.veilstoneGalactic=true;refresh();
      await say("VeilstoneCity_Text_DawnThankYouSincerely",["Dawn",p.name]);
      await env.say("The Galactic Grunts fled.\nYou can enter the warehouse\nand collect the Fly HM!");
    }
    async function fly() {
      if(!state().veilstoneGalactic){await env.say("Recover Dawn's Pokédex outside\nbefore searching this warehouse.");return;}
      if(!state().flyHM){const hm=FieldMoves.hmFor("Fly");if(!Player.itemCount(player(),hm))Player.addItem(player(),hm);state().flyHM=true;await env.say("{PLAYER} received "+Bag.name(hm)+"!");}
      await env.say("The Cobble Badge allows Fly in\nSinnoh. Teach it to a compatible\nPokémon, then choose Fly in the party.");
    }
    function visible(p) {
      const key=(p.script||"").replace(/^pt:/,""),s=state();
      if(key==="barry209")return !s.rival209;
      if(key==="barry-pastoria")return player().badges.includes("cobble")&&!s.rivalPastoria;
      if(key==="cyrus-coronet")return !s.cyrusMet;
      if(key==="warehouse-gate")return !s.veilstoneGalactic;
      if(/^punch-[012]$/.test(key))return (s.mayleneBags|0)<=+key.at(-1);
      return undefined;
    }
    function step() {
      const p=player(),at=p.location,s=state();
      if(at.map==="Route207"&&s.jupiter&&!s.dawn207)return event("dawn207");
      if(at.map==="MtCoronet_3"&&s.dawn207&&!s.cyrusMet)return event("cyrus-coronet");
      if(at.map==="HearthomeCity"&&s.jupiter&&!s.hearthomeWelcome)return event("hearthome-welcome");
      const m=WORLD_MAPS[at.map];if(m&&m.haunt){const door=m.haunt.doors.find(d=>d.x===at.x&&d.y===at.y);if(door)return event("haunt-door-"+m.haunt.room+"-"+door.shape);}
      if((at.map==="Route209"||at.map==="Route209_Gate")&&!s.rival209&&env.canBattle())return event(p.badges.includes("relic")?"barry209":"route209-stop");
      if(at.map==="PastoriaCity"&&at.x<=18&&at.y>=25&&at.y<=32&&p.badges.includes("cobble")&&!s.rivalPastoria&&s.veilstoneGalactic&&env.canBattle())return event("barry-pastoria");
      return null;
    }
    async function run(script) {
      const key=(script||"").replace(/^pt:/,"");let match;
      if(LEADERS[key]){await leader(key);return true;}
      if((match=/^haunt-rune-([12])$/.exec(key))){await env.say("The blue tile bears a "+SHAPES[Sinnoh.hauntShape(player(),+match[1])]+".\nFind the door with that same symbol.");return true;}
      if((match=/^haunt-door-([12])-([0-4])$/.exec(key))){await haunt(+match[1],+match[2]);return true;}
      if((match=/^punch-([012])$/.exec(key))){await punch(+match[1]);return true;}
      if((match=/^water-([012])$/.exec(key))){await water(+match[1]);return true;}
      switch(key) {
        case "dawn207":await dawn207();break;
        case "cyrus-coronet":await cyrus();break;
        case "hearthome-welcome":await welcome();break;
        case "barry209":await rival("209");break;
        case "barry-pastoria":await rival("pastoria");break;
        case "veilstone-dawn":case "warehouse-gate":await galactic();break;
        case "fly-hm":await fly();break;
        case "fantina-guide":await env.say("Find the blue tile in each dark room.\nMatch its symbol to a door.\nThe wrong door returns you here!");break;
        case "bags-guide":await env.say("Push each red punching bag to\nknock down its tyre wall.\nThere are three on the way to Maylene.");break;
        case "water-guide":await env.say("Set the basins with yellow, green\nand blue switches, in that order.\nEach changes the water and a bridge.");break;
        case "route209-stop":await env.say("Barry: The Hearthome Gym comes first!");await env.teleport({map:"HearthomeCity",x:58,y:49,facing:"left"});break;
        default:return false;
      }return true;
    }
    return{run,visible,step};
  }
  window.SinnohMidgame={create,LEADERS};
})();
