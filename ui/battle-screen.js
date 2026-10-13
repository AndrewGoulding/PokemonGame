// Battle screen
// Depends on: everything in data/ and engine/, plus game/random-team.js.
//
// The screen never reads HP or status straight from the engine while events are
// playing. It replays battle.events one at a time, updating its own copy of each
// side's active Pokémon, so the HP bars move in step with the text box.

(function () {
  "use strict";

  const TEAM_SIZE = 3;
  const LEVEL = 50;
  const MESSAGE_MS = 1100;   // how long each message stays up (click to skip)
  const HP_ANIM_MS = 550;    // matches the .hp-fill transition in battle-screen.css

  // ---------- Message text ----------
  //
  // Templates are keyed by effect id (lowercase letters and digits only).
  //   {who}  the Pokémon at the start of a sentence ("The opposing Onix")
  //   {whom} the same mid-sentence ("the opposing Onix")
  //   {foe}  the Pokémon on the other side
  //   {team} "your team" or "the opposing team"
  // A null template means "show nothing".

  const STAT_NAMES = {
    atk: "Attack", def: "Defense", spa: "Sp. Atk", spd: "Sp. Def", spe: "Speed",
    accuracy: "accuracy", evasion: "evasiveness"
  };
  const STATUS_START = {
    brn: "{who} was burned!", par: "{who} is paralyzed! It may be unable to move!",
    slp: "{who} fell asleep!", frz: "{who} was frozen solid!",
    psn: "{who} was poisoned!", tox: "{who} was badly poisoned!"
  };
  const STATUS_CURE = {
    brn: "{who}'s burn was healed!", par: "{who} was cured of paralysis!", slp: "{who} woke up!",
    frz: "{who} thawed out!", psn: "{who} was cured of its poisoning!", tox: "{who} was cured of its poisoning!"
  };
  const CANT = {
    par: "{who} is paralyzed! It can't move!", slp: "{who} is fast asleep.", frz: "{who} is frozen solid!",
    recharge: "{who} must recharge!", flinch: "{who} flinched and couldn't move!",
    attract: "{who} is immobilized by love!", truant: "{who} is loafing around!",
    focuspunch: "{who} lost its focus and couldn't move!"
  };
  const DAMAGE_FROM = {
    poison: "{who} is hurt by poison!", badpoison: "{who} is hurt by poison!", burn: "{who} is hurt by its burn!",
    confusion: "It hurt itself in its confusion!", recoil: "{who} is damaged by the recoil!",
    sandstorm: "{who} is buffeted by the sandstorm!", hail: "{who} is buffeted by the hail!",
    leechseed: "{who}'s health is sapped by Leech Seed!", stealthrock: "Pointed stones dug into {whom}!",
    spikes: "{who} is hurt by the spikes!", nightmare: "{who} is locked in a nightmare!",
    curse: "{who} is afflicted by the curse!",
    substitute: null, bellydrum: null // the -start / -setboost message that follows covers these
  };
  const HEAL_FROM = {
    heal: "{who} regained health!", drain: "{foe} had its energy drained!", leechseed: null,
    aquaring: "A veil of water restored {whom}'s HP!", ingrain: "{who} absorbed nutrients with its roots!",
    grassyterrain: "{who}'s HP was restored by the grassy terrain.", wish: "{who}'s wish came true!",
    rest: "{who} slept and became healthy!"
  };
  const VOLATILE_START = {
    confusion: "{who} became confused!", substitute: "{who} put in a substitute!",
    aquaring: "{who} surrounded itself with a veil of water!", attract: "{who} fell in love!",
    bide: "{who} is storing energy!", curse: "{who} was cursed!", disable: "{who}'s move was disabled!",
    encore: "{who} received an encore!", embargo: "{who} can't use items anymore!",
    foresight: "{who} was identified!", gastroacid: "{who}'s Ability was suppressed!",
    grudge: "{who} wants its target to bear a grudge!", healblock: "{who} was prevented from healing!",
    helpinghand: "{who} is ready to help!", imprison: "{who} sealed any moves its target shares with it!",
    ingrain: "{who} planted its roots!", leechseed: "{who} was seeded!",
    magnetrise: "{who} levitated with electromagnetism!", nightmare: "{who} began having a nightmare!",
    partiallytrapped: "{who} was trapped!", perishsong: "All Pokémon that heard the song will faint in three turns!",
    powertrick: "{who} switched its Attack and Defense!", ragepowder: "{who} became the center of attention!",
    smackdown: "{who} fell straight down!", snatch: "{who} waits for a target to make a move!",
    taunt: "{who} fell for the taunt!", telekinesis: "{who} was hurled into the air!",
    truant: null, typechange: "{who}'s type changed!", yawn: "{who} grew drowsy!",
    electrify: "{who}'s moves have been electrified!", flashfire: "{who}'s Fire-type moves were powered up!",
    slowstart: "{who} can't get it going!", minimize: null, defensecurl: null, stockpile: null
  };
  const VOLATILE_END = {
    confusion: "{who} snapped out of its confusion!", substitute: "{who}'s substitute faded!",
    taunt: "{who} shook off the taunt!", encore: "{who}'s encore ended!", disable: "{who} is no longer disabled!",
    magnetrise: "{who}'s electromagnetism wore off!", bind: "{who} was freed from Bind!",
    whirlpool: "{who} was freed from Whirlpool!", firespin: "{who} was freed from Fire Spin!",
    sandtomb: "{who} was freed from Sand Tomb!", stockpile: "{who}'s stockpiled effect wore off!",
    bide: "{who} unleashed its energy!", slowstart: "{who} finally got its act together!"
  };
  const ACTIVATE = {
    confusion: "{who} is confused!", attract: "{who} is in love with {foe}!", bide: "{who} is storing energy!",
    destinybond: "{who} took its attacker down with it!", endure: "{who} endured the hit!",
    healbell: "A bell chimed!", protect: "{who} protected itself!", mist: "{who} is protected by the mist!",
    safeguard: "{who} is protected by Safeguard!", mistyterrain: "{who} surrounds itself with a protective mist!",
    quickguard: "Quick Guard protected {whom}!", stickyweb: "{who} was caught in a sticky web!",
    substitute: "The substitute took damage for {whom}!", snatch: "{who} snatched the move!"
  };
  const PREPARE = {
    solarbeam: "{who} absorbed light!", dig: "{who} burrowed its way under the ground!",
    fly: "{who} flew up high!", bounce: "{who} sprang up!", dive: "{who} hid underwater!",
    phantomforce: "{who} vanished instantly!", shadowforce: "{who} vanished instantly!",
    skullbash: "{who} tucked in its head!", skyattack: "{who} became cloaked in a harsh light!",
    razorwind: "{who} whipped up a whirlwind!", geomancy: "{who} is absorbing power!",
    skydrop: "{who} took its target into the sky!"
  };
  const ABILITY = {
    pressure: "{who} is exerting its pressure!", moldbreaker: "{who} breaks the mold!",
    unnerve: "{team} is too nervous to eat Berries!", turboblaze: "{who} is radiating a blazing aura!",
    teravolt: "{who} is radiating a bursting aura!", darkaura: "{who} is radiating a dark aura!",
    fairyaura: "{who} is radiating a fairy aura!", aurabreak: "{who} reversed all other Pokémon's auras!",
    sturdy: "{who} endured the hit!", anticipation: "{who} shuddered!",
    airlock: "The effects of the weather disappeared.", cloudnine: "The effects of the weather disappeared."
  };
  const SIDE_START = {
    stealthrock: "Pointed stones float in the air around {team}!",
    spikes: "Spikes were scattered around the feet of {team}!",
    toxicspikes: "Poison spikes were scattered around the feet of {team}!",
    stickyweb: "A sticky web spreads out beneath {team}'s feet!",
    tailwind: "The tailwind blew from behind {team}!",
    reflect: "Reflect raised {team}'s Defense!", lightscreen: "Light Screen raised {team}'s Sp. Def!",
    safeguard: "{Team} cloaked itself in a mystical veil!", mist: "{Team} became shrouded in mist!",
    luckychant: "Lucky Chant shielded {team} from critical hits!"
  };
  const FIELD_START = {
    grassyterrain: "Grass grew to cover the battlefield!", mistyterrain: "Mist swirled about the battlefield!",
    electricterrain: "An electric current runs across the battlefield!", gravity: "Gravity intensified!",
    trickroom: "The dimensions were twisted!", iondeluge: "A deluge of ions showers the battlefield!",
    magicroom: "It created a bizarre area in which Pokémon's held items lose their effects!",
    wonderroom: "It created a bizarre area in which Defense and Sp. Def stats are swapped!",
    watersport: "Fire's power was weakened!", mudsport: "Electricity's power was weakened!"
  };
  const FIELD_END = {
    grassyterrain: "The grass disappeared from the battlefield.", mistyterrain: "The mist disappeared from the battlefield.",
    electricterrain: "The electricity disappeared from the battlefield.", gravity: "Gravity returned to normal!",
    trickroom: "The twisted dimensions returned to normal!", magicroom: "Magic Room wore off, and held items' effects returned to normal!",
    wonderroom: "Wonder Room wore off, and Defense and Sp. Def stats returned to normal!",
    watersport: "The effects of Water Sport have faded.", mudsport: "The effects of Mud Sport have faded.",
    iondeluge: null
  };
  const WEATHER_START = {
    SunnyDay: "The sunlight turned harsh!", RainDance: "It started to rain!",
    Sandstorm: "A sandstorm kicked up!", Hail: "It started to hail!"
  };
  const WEATHER_UPKEEP = {
    SunnyDay: "The sunlight is strong.", RainDance: "Rain continues to fall.",
    Sandstorm: "The sandstorm rages.", Hail: "Hail continues to fall."
  };

  // "move: Light Screen" -> "lightscreen", "[from] bad poison" -> "badpoison"
  const effectId = (s) => String(s || "").replace(/^\[from\] /, "").replace(/^(move|ability|item): /, "")
    .toLowerCase().replace(/[^a-z0-9]/g, "");
  const effectName = (s) => String(s || "").replace(/^\[from\] /, "").replace(/^(move|ability|item): /, "");

  // ---------- DOM ----------

  const $ = (sel) => document.querySelector(sel);
  const el = {
    textbox: $("#textbox"),
    menu: $("#menu"),
    sides: {
      p1: { sprite: $("#sprite-player"), info: $("#info-player") },
      p2: { sprite: $("#sprite-foe"), info: $("#info-foe") }
    }
  };

  // ---------- State ----------

  let battle = null;
  let cursor = 0;       // index of the next battle event to play
  let view = null;      // what the screen currently shows for each side
  let skipWait = null;  // resolves the current wait early (click / key press)

  const speciesId = (species) => (window.DEX[species] ? window.DEX[species].id : 0);
  const sideOf = (ident) => String(ident).slice(0, 2);
  const nameOf = (ident) => String(ident).replace(/^p\da: /, "");
  const otherSide = (side) => (side === "p1" ? "p2" : "p1");

  // "Charizard" / "the opposing Blastoise"
  function label(side, name) {
    return side === "p1" ? name : "the opposing " + name;
  }
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // Fills a message template for the Pokémon (or side) named by `ident`.
  function fill(template, ident) {
    if (template == null) return null;
    const side = /^p\d$/.test(ident) ? ident : sideOf(ident);
    const name = /^p\d$/.test(ident) ? "" : label(side, nameOf(ident));
    const foe = view[otherSide(side)];
    const team = side === "p1" ? "your team" : "the opposing team";
    return template
      .replace(/\{who\}/g, capitalize(name)).replace(/\{whom\}/g, name)
      .replace(/\{foe\}/g, foe && foe.name ? label(otherSide(side), foe.name) : "its foe")
      .replace(/\{Team\}/g, capitalize(team)).replace(/\{team\}/g, team);
  }

  // Looks `key` up in `table`; falls back to `fallback` when the key is missing.
  function lookup(table, key, fallback) {
    return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : fallback;
  }

  function parseHp(str) {
    const m = /^(\d+)\/(\d+)(?:\s+(\w+))?/.exec(str || "");
    return m ? { hp: +m[1], maxhp: +m[2], status: m[3] || "" } : null;
  }

  function wait(ms) {
    return new Promise((resolve) => {
      const done = () => { clearTimeout(t); skipWait = null; resolve(); };
      const t = setTimeout(done, ms);
      skipWait = done;
    });
  }

  // ---------- Rendering ----------

  function say(text) { el.textbox.textContent = text; }

  function renderSide(id) {
    const v = view[id];
    const { sprite, info } = el.sides[id];
    if (!v.species) {
      sprite.classList.add("hidden");
      info.classList.add("hidden");
      return;
    }
    const folder = id === "p1" ? "assets/sprites/pokemon/back/" : "assets/sprites/pokemon/";
    const src = folder + speciesId(v.species) + ".png";
    if (sprite.getAttribute("src") !== src) sprite.setAttribute("src", src);
    sprite.alt = v.name;
    sprite.classList.remove("hidden");
    sprite.classList.toggle("fainted", v.fainted);
    info.classList.toggle("hidden", v.fainted);

    info.querySelector(".info-name").textContent = v.name;
    info.querySelector(".info-level").textContent = "Lv" + v.level;
    const status = info.querySelector(".status");
    status.textContent = v.status;
    status.className = "status " + v.status;

    const pct = v.maxhp ? (v.hp / v.maxhp) * 100 : 0;
    const fill = info.querySelector(".hp-fill");
    fill.style.width = pct + "%";
    fill.classList.toggle("mid", pct <= 50 && pct > 20);
    fill.classList.toggle("low", pct <= 20);
    const hpText = info.querySelector(".hp-text");
    if (hpText) hpText.textContent = v.hp + " / " + v.maxhp;
  }

  function flash(id) {
    const sprite = el.sides[id].sprite;
    sprite.classList.remove("hit");
    void sprite.offsetWidth; // restart the animation
    sprite.classList.add("hit");
  }

  function setHp(ident, hpStr) {
    const hp = parseHp(hpStr);
    if (!hp) return false;
    const side = sideOf(ident);
    const hurt = hp.hp < view[side].hp;
    Object.assign(view[side], hp);
    renderSide(side);
    if (hurt) flash(side);
    return true;
  }

  // ---------- Event playback ----------

  // Applies one engine event to the view and returns what to show:
  // a message string, { pause: ms } for a silent HP change, or null.
  function applyEvent(ev) {
    const [type, a, b, c] = ev;
    const side = sideOf(a);
    const v = view[side];

    switch (type) {
      case "switch":
      case "drag": {
        const m = /^(.*?), L(\d+)/.exec(b) || [];
        const hp = parseHp(c) || { hp: 0, maxhp: 0, status: "" };
        view[side] = { name: nameOf(a), species: m[1] || nameOf(a), level: m[2] || "?",
          hp: hp.hp, maxhp: hp.maxhp, status: hp.status, fainted: false };
        renderSide(side);
        if (type === "drag") return fill("{who} was dragged out!", a);
        return side === "p1" ? "Go! " + nameOf(a) + "!" : battle.sides.p2.name + " sent out " + nameOf(a) + "!";
      }
      case "detailschange":
        v.species = b;
        renderSide(side);
        return null;
      case "move": return fill("{who} used " + b + "!", a);
      case "-damage": {
        const changed = setHp(a, b);
        if (!c) return changed ? { pause: HP_ANIM_MS } : null;
        const msg = fill(lookup(DAMAGE_FROM, effectId(c), "{who} was hurt by " + effectName(c) + "!"), a);
        return msg || (changed ? { pause: HP_ANIM_MS } : null);
      }
      case "-heal": {
        const changed = setHp(a, b);
        const msg = fill(c ? lookup(HEAL_FROM, effectId(c), "{who} restored HP using its " + effectName(c) + "!")
          : HEAL_FROM.heal, a);
        return msg || (changed ? { pause: HP_ANIM_MS } : null);
      }
      case "-sethp": // Pain Split: [user, userHp, target, targetHp]
        setHp(a, b);
        setHp(c, ev[4]);
        return "The battlers shared their pain!";
      case "faint":
        v.fainted = true;
        v.hp = 0;
        renderSide(side);
        return fill("{who} fainted!", a);
      case "-miss": return fill("{who}'s attack missed!", a);
      case "-crit": return "A critical hit!";
      case "-supereffective": return "It's super effective!";
      case "-resisted": return "It's not very effective...";
      case "-immune":
        if (/^\[from\] ability: /.test(b || "")) return fill("{who}'s " + effectName(b) + " made the move fail!", a);
        return fill("It doesn't affect {whom}...", a);
      case "-fail": return "But it failed!";
      case "-hitcount": return "Hit " + b + " time" + (b > 1 ? "s" : "") + "!";
      case "-status":
        v.status = b;
        renderSide(side);
        return fill(lookup(STATUS_START, b, "{who} was afflicted by " + b + "!"), a);
      case "-curestatus":
        v.status = "";
        renderSide(side);
        return fill(lookup(STATUS_CURE, b, "{who} was cured!"), a);
      case "-boost":
      case "-unboost": {
        const stat = STAT_NAMES[b] || b;
        const big = (+c || 1) > 1;
        if (type === "-boost") return fill("{who}'s " + stat + (big ? " rose sharply!" : " rose!"), a);
        return fill("{who}'s " + stat + (big ? " harshly fell!" : " fell!"), a);
      }
      case "-setboost": return fill("{who} cut its own HP and maximized its " + (STAT_NAMES[b] || b) + "!", a);
      case "-clearallboost": return "All stat changes were eliminated!";
      case "cant": return fill(lookup(CANT, effectId(b), "{who} can't move!"), a);
      case "-start": {
        const id = effectId(b);
        const perish = /^perish(\d)$/.exec(id);
        if (perish) return fill("{who}'s perish count fell to " + perish[1] + ".", a);
        const stock = /^stockpile(\d)$/.exec(id);
        if (stock) return fill("{who} stockpiled " + stock[1] + "!", a);
        return fill(lookup(VOLATILE_START, id, null), a);
      }
      case "-end": return fill(lookup(VOLATILE_END, effectId(b), null), a);
      case "-activate":
        return fill(lookup(ACTIVATE, effectId(b), "{who}'s " + effectName(b) + " activated!"), a);
      case "-prepare": return fill(lookup(PREPARE, effectId(b), "{who} is getting ready to use " + b + "!"), a);
      case "-singleturn": return effectId(b) === "focuspunch" ? fill("{who} is tightening its focus!", a) : null;
      case "-ability": return fill(lookup(ABILITY, effectId(b), "{who}'s " + b + "!"), a);
      case "-mega": return fill("{who} has Mega Evolved into " + b + "!", a);
      case "-transform": return fill("{who} transformed into " + nameOf(b) + "!", a);
      case "-enditem": return fill("{who} used its " + b + "!", a);
      case "-weather":
        if (a === "none") return "The weather cleared up.";
        if (b === "[upkeep]") return WEATHER_UPKEEP[a] || null;
        return WEATHER_START[a] || "The weather became " + a + "!";
      case "-sidestart": return fill(lookup(SIDE_START, effectId(b), b + " now protects {team}!"), a);
      case "-sideend": return fill("{Team}'s " + effectName(b) + " wore off!", a);
      case "-fieldstart": return lookup(FIELD_START, effectId(a), effectName(a) + " took effect!");
      case "-fieldend": return lookup(FIELD_END, effectId(a), effectName(a) + " wore off.");
      case "-fieldactivate": return effectId(a) === "perishsong" ? VOLATILE_START.perishsong : null;
      case "win": return a === battle.sides.p1.name ? "You defeated " + battle.sides.p2.name + "!" : "You lost to " + battle.sides.p2.name + "...";
      case "tie": return "The battle ended in a draw!";
      default: return null; // "turn" and anything purely internal
    }
  }

  async function playNewEvents() {
    while (cursor < battle.events.length) {
      const out = applyEvent(battle.events[cursor++]);
      if (typeof out === "string") {
        say(out);
        await wait(MESSAGE_MS);
      } else if (out && out.pause) {
        await wait(out.pause);
      }
    }
  }

  // ---------- Menus ----------

  const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

  function button(html, className, onClick, disabled) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = className || "";
    b.innerHTML = html;
    b.disabled = !!disabled;
    b.addEventListener("click", onClick);
    el.menu.appendChild(b);
    return b;
  }

  function clearMenu() { el.menu.innerHTML = ""; }

  function focusFirstButton() {
    const b = el.menu.querySelector("button:not(:disabled)");
    if (b) b.focus();
  }

  function showMoveMenu(req) {
    clearMenu();
    const active = req.active;
    say("What will " + active.name + " do?");
    if (active.forced) {
      button("Continue", "action wide", () => playerChoice({ type: "move", move: 0 }));
    } else if (active.struggle) {
      button("Struggle", "action wide", () => playerChoice({ type: "move", move: "Struggle" }));
    } else {
      for (const m of active.moves) {
        const html = '<span class="move-name">' + escapeHtml(m.name) + "</span>" +
          '<span class="move-meta"><span>' + m.type + "</span><span>PP " + m.pp + "/" + m.maxpp + "</span></span>";
        button(html, "type-" + m.type, () => playerChoice({ type: "move", move: m.index }), m.disabled);
      }
    }
    button("Pokémon", "action wide", () => showSwitchMenu(req, true), !req.switches.length);
    focusFirstButton();
  }

  function showSwitchMenu(req, canCancel) {
    clearMenu();
    say(canCancel ? "Choose a Pokémon to switch in." : "Choose your next Pokémon.");
    for (const p of req.team) {
      const html = '<span class="move-name">' + escapeHtml(p.name) + "</span>" +
        '<span class="party-hp">' + (p.fainted ? "Fainted" : "HP " + p.hp + "/" + p.maxhp) +
        (p.active ? " · in battle" : "") + "</span>";
      button(html, "", () => playerChoice({ type: "switch", index: p.index }), !req.switches.includes(p.index));
    }
    if (canCancel) button("Back", "action wide", () => showMoveMenu(req));
    focusFirstButton();
  }

  function showEndMenu() {
    clearMenu();
    button("New battle", "action wide", newBattle);
    focusFirstButton();
  }

  // ---------- Turn flow ----------

  // Placeholder opponent: a random usable move, and a random Pokémon when it must
  // switch. Never switches by choice.
  function opponentChoice(req) {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (req.phase === "switch") return { type: "switch", index: pick(req.switches) };
    if (req.active.forced) return { type: "move", move: 0 };
    if (req.active.struggle) return { type: "move", move: "Struggle" };
    return { type: "move", move: pick(req.active.moves.filter((m) => !m.disabled)).index };
  }

  // Engine bugs shouldn't freeze the screen: report them and offer a new battle.
  function choose(side, choice) {
    try {
      return battle.choose(side, choice);
    } catch (e) {
      console.error(e);
      return { ok: false, crashed: true };
    }
  }

  function crashed() {
    say("The battle engine hit an error (details in the browser console).");
    showEndMenu();
  }

  function playerChoice(choice) {
    const result = choose("p1", choice);
    if (result.crashed) { crashed(); return; }
    if (!result.ok) { say(result.error); return; }
    clearMenu();
    run();
  }

  // Plays any new events, then hands control to whoever has to choose next.
  async function run() {
    for (;;) {
      await playNewEvents();
      if (battle.ended) { showEndMenu(); return; }
      const p1 = battle.getRequest("p1");
      if (p1.phase === "move") { showMoveMenu(p1); return; }
      if (p1.phase === "switch") { showSwitchMenu(p1, false); return; }
      const p2 = battle.getRequest("p2");
      if (p2.phase === "move" || p2.phase === "switch") {
        if (choose("p2", opponentChoice(p2)).crashed) { crashed(); return; }
        continue;
      }
      say("Something went wrong: neither side can act.");
      return;
    }
  }

  function newBattle() {
    clearMenu();
    battle = new Battle({
      p1: { name: "You", team: RandomTeam.team(TEAM_SIZE, { level: LEVEL }) },
      p2: { name: "Rival", team: RandomTeam.team(TEAM_SIZE, { level: LEVEL }) }
    });
    cursor = 0;
    view = { p1: { species: null }, p2: { species: null } };
    renderSide("p1");
    renderSide("p2");
    say(battle.sides.p2.name + " wants to battle!");
    battle.start();
    wait(MESSAGE_MS).then(run);
  }

  // Click the text box (or press Space/Enter while no menu is up) to skip ahead.
  el.textbox.addEventListener("click", () => { if (skipWait) skipWait(); });
  document.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && skipWait && !el.menu.children.length) {
      e.preventDefault();
      skipWait();
    }
  });

  window.BattleScreen = { newBattle };
  newBattle();
})();
