// Platinum campaign data adapted onto the existing Sinnoh maps. Imported
// parties and dialogue remain separate from presentation and story state.
(function () {
  "use strict";
  const D = window.PLATINUM_DATA;
  const quests = player => state(player).sidequests || (state(player).sidequests = {});
  window.ITEMS["works-key"] = { name: "works-key", category: "key-items", effect: "Opens the locked door at Valley Windworks." };
  for (const [id, effect] of Object.entries({"secret-potion":"Cynthia's medicine for Route 210's Psyduck.","old-charm":"Deliver to Cynthia's grandmother in Celestic Town.","galactic-storage-key":"Opens Team Galactic's warehouse basement.","galactic-key":"Opens Team Galactic's headquarters."})) window.ITEMS[id]={name:id,category:"key-items",effect};
  Object.assign(window.WORLD_TRAINERS, D.trainers);
  window.WORLD_MAPS.OreburghCity_Gym = D.gym;
  Object.assign(window.WORLD_MAPS, D.maps || {});
  for (const [map, people] of Object.entries(D.additions)) {
    const m = window.WORLD_MAPS[map];
    if (!m) throw new Error("Platinum overlay needs " + map);
    if (map === "SandgemTown_RowansLab") m.people = []; // replace the old placeholder lab actors and balls
    m.people.push(...people.map((p, i) => Object.assign({ id: "platinum-" + i }, p)));
  }
  const city = window.WORLD_MAPS.OreburghCity, gym = window.WORLD_MAPS.OreburghCity_Gym;
  const door = city.warps.length;
  city.warps.push({ x: 31, y: 17, map: "OreburghCity_Gym", warp: 0 });
  city.collision[17 * city.width + 31] = 0;
  city.behavior[17 * city.width + 31] = 0x69;
  gym.warps[0].warp = door;
  for (const d of D.doors || []) {
    const outside = window.WORLD_MAPS[d.outside], inside = window.WORLD_MAPS[d.inside];
    const insideWarp = d.insideWarp || 0;
    inside.warps[insideWarp].warp = d.existing == null ? outside.warps.length : d.existing;
    const warp = { x: d.x, y: d.y, map: d.inside, warp: insideWarp };
    if (d.existing == null) outside.warps.push(warp); else outside.warps[d.existing] = warp;
    outside.collision[d.y * outside.width + d.x] = 0;
    outside.behavior[d.y * outside.width + d.x] = d.behavior == null ? 0x69 : d.behavior;
  }
  // The Works Key locks the entrance until the meadow rescue. A floor patch
  // uses the same collision/behaviour mechanism as the other regions.
  const wind = window.WORLD_MAPS.ValleyWindworks;
  wind.patches = Object.assign({}, wind.patches, { locked: { x: 19, y: 13, w: 1, h: 1, top: false, collision: [[19, 13, 1, 0]] } });
  wind.signs.push({ x: 19, y: 13, script: "pt:wind-door" });
  const starters = ["Turtwig", "Chimchar", "Piplup"];
  const state = (p) => p.flags.sinnoh || (p.flags.sinnoh = {});
  const owns = (map) => (window.WORLD_MAPS[map] || {}).region === "sinnoh";
  function team(id) {
    const t = D.trainers[id];
    if (!t) throw new Error("Unknown Platinum trainer: " + id);
    return t.party.map((m) => Object.assign(Party.create(m.species, m.level, { ivs: Math.floor(m.iv * 31 / 255), ...(m.moves ? { moves: m.moves } : {}) }), m.item ? { item: m.item } : {}, m.ballSeals ? {ballSeals:m.ballSeals.map(s=>({...s}))} : {}));
  }
  // Explicit buffer substitution: Platinum's rival is Barry, not Kanto's Gary.
  function text(id, player, buffers) {
    const pages = D.texts[id];
    if (!pages) throw new Error("Missing Platinum message: " + id);
    const values = buffers || [player.name];
    return pages.map((s) => s.replace(/\{STRVAR_\d+ \d+, (\d+)(?:,\s*\d+)*\}/g, (_, n) => values[n] == null ? "" : values[n])
      .replace(/\{[^}]*\}/g, ""));
  }
  const clockTrainers = ["PT_TRAINER_LASS_CAROLINE", "PT_TRAINER_AROMA_LADY_JENNA", "PT_TRAINER_AROMA_LADY_ANGELA"];
  function storyPatches(map, player) {
    const m = WORLD_MAPS[map];
    if (map === "SnowpointCity_Gym") return ["snow" + (state(player).snowballs | 0)];
    if (m && m.gear != null) return ["gear" + ((state(player).gears || [])[m.gear] || 0)];
    if (m && m.legendDots) {const mask=((SinnohLegends.peek(player).regiDots||{})[map.replace("PlatinumLegend","")]|0);return m.legendDots.flatMap((_,i)=>mask&(1<<i)?["dot"+i]:[]);}
    if (map === "StarkMountain") return ["questDoor"];
    if (map === "EternaForest_2") return ["chateau"];
    if (map === "MtCoronet_3") return ["northStairs"];
    if (map === "PokemonLeague") return ["cave", "upperCave"];
    if (map === "AcuityLakefront") return ["climb"];
    if (map === "SunyshoreCity") return ["solar"];
    if (map === "SpearPillar") return state(player).spear ? ["portal"] : [];
    if (map === "Route213") return ["shore"];
    if (m && m.haunt) return ["rune" + hauntShape(player, m.haunt.room)];
    if (map === "VeilstoneCity_Gym") return ["bags" + Math.min(3, state(player).mayleneBags | 0)];
    if (map === "PastoriaCity_Gym") return ["water" + Math.min(3, state(player).wakeWater | 0)];
    if (map !== "ValleyWindworks" && map !== "EternaCity_Gym") return null;
    const s = state(player);
    if (map === "ValleyWindworks") return s.worksOpen ? [] : ["locked"];
    if (map === "EternaCity_Gym") return ["clock" + (player.badges.includes("forest") ? 3 : Math.min(3, s.gardeniaClock | 0))];
    return null;
  }
  function patches(map, player) {const keys=map==="PlatinumVilla"?SinnohVilla.patches(player):storyPatches(map,player),extra=(WORLD_MAPS[map]||{}).legendDoorPatches;return extra?[...new Set([...(keys||[]),...extra])]:keys;}
  function forestPartner(player) {
    const map=player.location.map;
    if(!["PlatinumIronIsland","PlatinumStarkInterior","EternaForest_2","PlatinumExpWayward","PlatinumExpMarley"].includes(map))return null;
    const q=(player.flags.sinnoh||{}).sidequests||{};
    const l=(player.flags.sinnoh||{}).legends||{};
    if(map==="PlatinumExpWayward"&&l.miraJoined&&!l.miraEscorted)return{name:"Mira",team:team("PT_TRAINER_MIRA_WAYWARD_CAVE"),pic:"pt_mira"};
    if(map==="PlatinumExpMarley"&&l.marleyJoined&&!l.marleyEscorted)return{name:"Marley",team:team("PT_TRAINER_MARLEY_VICTORY_ROAD"),pic:"pt_marley"};
    if(map==="PlatinumIronIsland"&&q.rileyJoined&&!q.ironCleared)return{name:"Riley",team:team("PT_TRAINER_RILEY_IRON_ISLAND"),pic:"pt_riley"};
    if(map==="PlatinumStarkInterior"&&q.buckJoined&&!q.charonArrested)return{name:"Buck",team:team("PT_TRAINER_BUCK_STARK_MOUNTAIN"),pic:"pt_buck"};
    if (map !== "EternaForest_2") return null;
    const s = state(player);
    return s.cherylJoined && !s.cherylDone
      ? { name: "Cheryl", team: team("PT_TRAINER_CHERYL_ETERNA_FOREST"), pic: "pt_cheryl" } : null;
  }
  function forestBattle(player, kind, opts, anotherWild) {
    const partner = forestPartner(player);
    if (!partner || opts.partner || opts.safari || opts.horde) return opts;
    const chosen = player.party.map((m, i) => Party.canFight(m) ? i : -1).filter(i => i >= 0).slice(0, 3);
    if (!chosen.length) return opts;
    const out = { ...opts, partner, chosen };
    if (kind === "wild" && opts.foe && opts.foe.team.length === 1) {
      out.foe = { ...opts.foe, team: [...opts.foe.team, anotherWild()] }; out.wildDouble = true;
    }
    return out;
  }
  // Only the raised deck and the gates require a bicycle. Route 206 below
  // the deck remains walkable; these maps must not share the same rule.
  const cyclingRequired = at => at.map === "CyclingRoad" || at.map === "CyclingRoadNorth_Gate" && at.y >= 10 || at.map === "CyclingRoadSouth_Gate" && at.y <= 5;
  const cyclingAllowed = player => player.badges.includes("forest") && !!state(player).jupiter && Player.itemCount(player, "bicycle") > 0;
  function hauntShape(player, room) { return Math.floor((player.trainerId >>> 0) / (room === 1 ? 1 : 3)) % (room === 1 ? 3 : 5); }
  function darkness(map) {
    const m = WORLD_MAPS[map];
    return m && m.haunt ? {radius:4, lights:[{x:m.haunt.rune.x+.5,y:m.haunt.rune.y+.5,r:1}],rects:[]} : null;
  }
  const fog = (map, player) => !!(WORLD_MAPS[map]||{}).sinnohFog && !(((player.flags.sinnoh||{}).legends||{}).defogMaps||{})[map];
  function defog(player) {const map=player.location.map;if(!fog(map,player))return false;const s=SinnohLegends.state(player);(s.defogMaps||(s.defogMaps={}))[map]=true;return true;}
  const flyTowns = ["SandgemTown", "JubilifeCity", "OreburghCity", "FloaromaTown", "EternaCity", "HearthomeCity", "VeilstoneCity", "PastoriaCity", "SolaceonTown", "CelesticTown", "CanalaveCity", "SnowpointCity", "SunyshoreCity", "PokemonLeague", "FightArea", "SurvivalArea", "ResortArea"];
  function visit(player, map) {
    if (typeof map !== "string") return;
    transition(player, map);
    const s = player.flags.sinnoh;
    if (s && s.league && s.league.active && (WORLD_MAPS[map] || {}).leagueRoom == null) s.league={active:false,step:0};
    const city = map.replace(/_PokemonCenter_1F$/, "");
    if (!flyTowns.includes(city)) return;
    const list = state(player).visitedCities || (state(player).visitedCities = []);
    if (!list.includes(city)) list.push(city);
  }
  function flySpots(player) {
    return (state(player).visitedCities || []).flatMap(city => {
      const m = WORLD_MAPS[city], w = m && m.warps.find(w => w.map === city + "_PokemonCenter_1F");
      if (!w || m.collision[(w.y + 1) * m.width + w.x]) return [];
      return [{ map: city, x: w.x, y: w.y + 1, center: w.map, name: city.replace(/([a-z])([A-Z])/g, "$1 $2") }];
    });
  }
  function transition(player) {
    const s = player.flags.sinnoh || {}, front = WORLD_MAPS.ValorLakefront;
    if (front) for (const index of [0,1]) front.warps[index].map = s.library && !s.trioFreed ? "LakeValor_2" : "LakeValor";
  }
  function snowballStopped(player, def, at) {
    const n = def.sinnohSnowball;
    if (player.location.map !== "SnowpointCity_Gym" || !Number.isInteger(n) || !at || at.x !== 20 || at.y !== [24,17,10][n]) return false;
    state(player).snowballs = (state(player).snowballs | 0) | (1 << n); return true;
  }
  function distortionSwitch(player, map, x, y) {
    if(map==="PlatinumStarkInterior"&&y===10&&[9,23].includes(x)){const n=x===9?0:1;if(!(quests(player).starkStones||[]).includes(n))return{type:"trigger",map,trigger:{script:"pt:sq-stone-"+n}};}
    const match=/^DistortionWorld_([012])$/.exec(map);
    if (!match || x!==9 || y!==5 || (state(player).distortionStones||[]).includes(+match[1])) return null;
    return {type:"trigger",map,trigger:{script:"pt:distortion-goal-"+match[1]}};
  }
  function recordChampion(player) {
    const s = state(player), run=s.league;
    if (!run || !run.active || run.step !== 4) return null;
    const f=player.flags;
    for(const m of player.party)if(!m.egg){if(!Array.isArray(m.ribbons))m.ribbons=[];if(!m.ribbons.includes("champ-sinnoh"))m.ribbons.push("champ-sinnoh");}
    const entry={number:(f.hofCount||0)+1,region:"sinnoh",playTimeMs:player.playTimeMs||0,trainer:{name:player.name,id:player.trainerId},team:player.party.filter(r=>!r.egg).slice(0,6).map(r=>({species:r.species,nickname:r.nickname||null,level:r.level,gender:r.gender||"",shiny:!!r.shiny,form:Party.form(r)||undefined,personality:r.personality,ot:r.ot||{name:player.name,id:player.trainerId}}))};
    f.hofCount=entry.number;(f.hallOfFame||(f.hallOfFame=[])).push(entry);while(f.hallOfFame.length>League.MAX_TEAMS)f.hallOfFame.shift();
    const q=quests(player);for(const sp of ["azelf","uxie","heatran","mesprit"])if(!q[sp+"Caught"]){const defeated=!!q[sp+"Defeated"];delete q[sp+"Defeated"];if(sp==="mesprit"&&q.mespritReleased&&defeated){q.mespritRoaming=true;delete q.mespritRecord;}}
    if(window.SinnohLegends)SinnohLegends.revive(player);
    f.sinnohLeagueClear=true;s.champion=true;s.league={active:false,step:5,completed:true};return entry;
  }
  function isRoamer(player,species){const q=(player.flags.sinnoh||{}).sidequests||{};return species==="Mesprit"&&!!q.mespritRoaming||!!(window.SinnohLegends&&SinnohLegends.activeSpecies(player).includes(species));}
  function roamerWild(player,mon,table,rng=Math.random){return SinnohRoamers.wild(player,mon,table,rng);}
  function roamerRecord(player,record){
    if(record.species!=="Mesprit"&&window.SinnohLegends)return SinnohLegends.roamerRecord(player,record);
    const q=(player.flags.sinnoh||{}).sidequests||{},m=WORLD_MAPS[player.location.map];if(record.species!=="Mesprit"||!q.mespritRoaming||!m||m.region!=="sinnoh"||!SinnohRoamers.eligible(player.location.map))return record;
    if(!q.mespritRecord){const d=D.sidequests.encounters.Mesprit;q.mespritRecord=Party.create("Mesprit",d.level,{moves:d.moves});}
    return JSON.parse(JSON.stringify(q.mespritRecord));
  }
  function finishRoamer(player,mon,outcome){
    if(mon&&mon.species!=="Mesprit"&&window.SinnohLegends){SinnohLegends.finishRoamer(player,mon,outcome);SinnohRoamers.after(player,mon.species);return;}
    const q=(player.flags.sinnoh||{}).sidequests||{},m=WORLD_MAPS[player.location.map];if(!mon||mon.species!=="Mesprit"||!q.mespritRoaming||!m||m.region!=="sinnoh"||!SinnohRoamers.eligible(player.location.map))return;
    if(q.mespritRecord)Party.syncFromBattle(q.mespritRecord,mon);
    if(outcome==="caught"){q.mespritCaught=true;q.mespritRoaming=false;delete q.mespritRecord;}
    else if(mon.fainted||mon.hp<=0){q.mespritDefeated=true;q.mespritRoaming=false;}
    SinnohRoamers.after(player,mon.species);
  }
  window.Sinnoh = { fog, defog, isRoamer, quests, roamerWild, roamerRecord, finishRoamer, state, owns, starters, team, text, clockTrainers, patches, forestPartner, forestBattle, cyclingRequired, cyclingAllowed, hauntShape, darkness, visit, flySpots, transition, snowballStopped, distortionSwitch, recordChampion };
})();
