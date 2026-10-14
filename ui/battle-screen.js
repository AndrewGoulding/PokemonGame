// Battle screen
// Depends on: everything in data/ and engine/, plus ui/screen.js.
//
//   const result = await BattleScreen.run({
//     p1: { name: "You", team: [...sets] }, p2: { name: "Youngster Ben", team: [...sets] },
//     wild: false, exp: true, bag: { "poke-ball": 5 }, catchContext: {...},
//     terrain: "grass",              // background, assets/battle/<terrain>.png
//     trainer: "red",                // your back sprite in the opening
//     foeTrainer: "bug_catcher",     // the opponent's picture (assets/sprites/trainers/front)
//     defeatText: ["No!", ...],      // what they say when you win
//     opponent: (battle) => choice
//   });
//   result.outcome   // "won" | "lost" | "caught" | "ran" | "draw"
//   (cfg.victoryMusic: the song to play when you win, e.g. "mus_victory_wild")
//
// The screen never reads HP or status straight from the engine while events are
// playing. It replays battle.events one at a time, updating its own copy of each
// side's active Pokémon, so the HP bars move in step with the text box.

(function () {
  "use strict";

  const HP_ANIM_MS = 550;    // matches the .hp-fill transition in battle-screen.css
  const SHAKE_MS = 750;      // one wobble of a thrown ball

  const ballName = (id) => window.Bag.name(id);
  const BREAK_FREE = [
    "Oh no! The Pokémon broke free!", "Aww! It appeared to be caught!",
    "Aargh! Almost had it!", "Gah! It was so close, too!"
  ];

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
    rest: "{who} slept and became healthy!", healingwish: "The healing wish came true for {whom}!",
    lunardance: "{who} became cloaked in mystical moonlight!"
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
    sturdy: "{who} held on with its sturdiness!", anticipation: "{who} shuddered!",
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
    field: $("#field"),
    ball: $("#ball"),
    sides: {
      p1: { sprite: $("#sprite-player"), info: $("#info-player") },
      p2: { sprite: $("#sprite-foe"), info: $("#info-foe") }
    }
  };

  // ---------- State ----------

  let battle = null;
  let config = null;
  let cursor = 0;       // index of the next battle event to play
  let view = null;      // what the screen currently shows for each side

  const sideOf = (ident) => String(ident).slice(0, 2);
  const nameOf = (ident) => String(ident).replace(/^p\da: /, "");
  const otherSide = (side) => (side === "p1" ? "p2" : "p1");
  const { message, ask, wait, say } = window.Screen;

  // "Charizard" / "the opposing Blastoise" / "the wild Pidgey"
  function label(side, name) {
    if (side === "p1") return name;
    return (battle.wild ? "the wild " : "the opposing ") + name;
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

  // ---------- Rendering ----------

  // ---------- Standing on the platform ----------
  //
  // The sprites leave empty rows under small Pokémon (data/sprite-metrics.js),
  // so each moves down by its own gap to stand on the platform. Foes that float
  // or fly sit higher by FireRed's elevation (gEnemyMonElevation; for later
  // Pokémon, 8 pixels if they have Levitate). The foe's sprite is 72 GBA pixels
  // tall for its 96, yours 96.
  function placeSprite(sprite, v, back) {
    const M = window.SPRITE_METRICS, dex = window.DEX[v.species];
    if (!M || !dex) return;
    const table = back ? M.back : M.front;
    const key = dex.id + (v.form ? "-" + v.form : "");
    let pct = ((table[key] != null ? table[key] : table[dex.id]) || 0) / 96 * 100;
    if (!back) {
      const lift = M.elevation[v.species] != null ? M.elevation[v.species]
        : dex.id > 386 && (dex.abilities || []).includes("Levitate") ? 8 : 0;
      pct -= lift / 72 * 100;
    }
    sprite.style.translate = "0 " + pct.toFixed(2) + "%";
  }

  function renderSide(id) {
    const v = view[id];
    const { sprite, info } = el.sides[id];
    if (!v.species) {
      // Between battles: no picture, no leftover fainted pose to animate back from.
      sprite.classList.add("hidden");
      sprite.classList.remove("fainted", "hit");
      window.Screen.clearSprite(sprite);
      info.classList.add("hidden");
      return;
    }
    window.Screen.setSprite(sprite, v.species, v.form, id === "p1");
    placeSprite(sprite, v, id === "p1");
    sprite.alt = v.name;
    sprite.classList.toggle("hidden", !!v.inBall);
    sprite.classList.toggle("fainted", v.fainted);
    info.classList.toggle("hidden", v.fainted);

    info.querySelector(".info-name").textContent = v.name;
    // A wild Pokémon's box shows whether you've caught one before.
    let owned = info.querySelector(".owned");
    if (id === "p2" && battle.wild && config.catchContext && config.catchContext.caughtBefore) {
      if (!owned) { owned = document.createElement("span"); owned.className = "owned"; info.querySelector(".info-name").after(owned); }
      owned.innerHTML = window.Screen.ballIcon(config.catchContext.caughtBefore(v.species));
    } else if (owned) owned.remove();
    info.querySelector(".info-level").textContent = "Lv" + v.level;
    const status = info.querySelector(".status");
    status.textContent = v.status;
    status.className = "status " + v.status;

    const pct = v.maxhp ? (v.hp / v.maxhp) * 100 : 0;
    const fillEl = info.querySelector(".hp-fill");
    fillEl.style.width = pct + "%";
    fillEl.classList.toggle("mid", pct <= 50 && pct > 20);
    fillEl.classList.toggle("low", pct <= 20);
    const hpText = info.querySelector(".hp-text");
    if (hpText) hpText.textContent = v.hp + " / " + v.maxhp;
    const exp = info.querySelector(".exp-row");
    if (exp) {
      exp.classList.toggle("hidden", v.exp == null);
      exp.querySelector(".exp-fill").style.width = ((v.exp || 0) * 100) + "%";
    }
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

  // Updates the experience bar if `teamIndex` is the Pokémon on the field.
  function setExp(teamIndex, pct, level, hpStr) {
    const v = view.p1;
    if (v.teamIndex !== +teamIndex) return;
    if (level != null) v.level = level;
    if (hpStr) Object.assign(v, parseHp(hpStr));
    v.exp = pct === "" ? null : +pct;
    renderSide("p1");
  }

  // ---------- Event playback ----------

  const teamName = (index) => {
    const mon = battle.sides.p1.pokemon[+index];
    return mon ? mon.name : "";
  };

  // Applies one engine event to the view and returns what to show:
  // a message string, { pause: ms } for a silent HP change, an async function
  // for anything interactive or animated, or null.
  function applyEvent(ev) {
    const [type, a, b, c] = ev;
    const side = sideOf(a);
    const v = view[side];

    switch (type) {
      case "switch":
      case "drag": {
        const m = /^(.*?), L(\d+)/.exec(b) || [];
        const hp = parseHp(c) || { hp: 0, maxhp: 0, status: "" };
        // A Pokémon still standing that's switched out goes back into its ball first.
        const prev = view[side];
        const back = type === "switch" && prev && prev.species && !prev.fainted && prev.hp > 0
          ? { text: recallText(side, prev), ball: (config[side].team[prev.teamIndex] || {}).ball } : null;
        const withdraw = () => (back ? recall(side, back.text, back.ball) : null);
        view[side] = { name: nameOf(a), species: m[1] || nameOf(a), level: m[2] || "?",
          hp: hp.hp, maxhp: hp.maxhp, status: hp.status, fainted: false,
          exp: ev[4] === "" || ev[4] == null ? null : +ev[4], teamIndex: +ev[5],
          form: (config[side].team[+ev[5]] || {}).form || "" };
        const ball = (config[side].team[+ev[5]] || {}).ball;
        if (side === "p1") foeHpAtSwitchIn = view.p2.species ? view.p2.hp : null;
        else foeHpAtSwitchIn = hp.hp;   // a new foe: count from its HP now
        // The foe's first Pokémon: their trainer steps aside, then throws it out.
        if (side === "p2" && foeTrainerOut) {
          foeTrainerOut = false;
          const text = battle.sides.p2.name + " sent out " + nameOf(a) + "!";
          return async () => { await foeTrainerSlide(true); await Promise.all([message(text), sendOut(side, FOE_THROW_FROM, ball)]); };
        }
        // The first Pokémon out: your trainer throws its Ball.
        if (side === "p1" && trainerOut) {
          trainerOut = false;
          return async () => { await Promise.all([throwOut(), sendOut(side, THROW_FROM_HAND, ball, 210)]); await message("Go! " + nameOf(a) + "!"); };
        }
        if (type === "drag") { renderSide(side); return fill("{who} was dragged out!", a); }
        // Later switch-ins: thrown in from off-screen, as in FireRed.
        if (side === "p1") {
          const text = "Go! " + nameOf(a) + "!";
          return async () => { await withdraw(); await Promise.all([message(text), sendOut(side, THROW_FROM_LEFT, ball)]); };
        }
        if (side === "p2" && !battle.wild && !foeAnnounced) {
          const text = battle.sides.p2.name + " sent out " + nameOf(a) + "!";
          return async () => { await withdraw(); await Promise.all([message(text), sendOut(side, FOE_THROW_FROM, ball)]); };
        }
        renderSide(side);
        if (side === "p2" && foeAnnounced) { foeAnnounced = false; return null; }   // the opening said so
        if (battle.wild) return "A wild " + nameOf(a) + " appeared!";
        return battle.sides.p2.name + " sent out " + nameOf(a) + "!";
      }
      case "detailschange":
        v.species = b;
        v.form = "";
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
        cry(side, { faint: true });
        // The foe's last Pokémon down: the victory theme (over the Exp. messages).
        if (side === "p2" && config.victoryMusic && window.GameAudio && battle.sides.p2.pokemon.every((m) => m.fainted)) {
          window.GameAudio.music(config.victoryMusic);
        }
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
        if (effectId(b) === "naturepower") return "Nature Power turned into " + c + "!";
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

      // ----- Progression -----
      case "-exp":   // [ident, amount, teamIndex, progress, "share"?]
        return async () => {
          setExp(c, ev[4]);
          // The Exp. Share's half goes by quietly after one message, as in Gen 6.
          if (ev[5] !== "share") await message(teamName(c) + " gained " + b + " Exp. Points!");
        };
      case "-expshare":
        return "The rest of your team gained Exp. Points thanks to the Exp. Share!";
      case "-levelup":   // [ident, level, hp, teamIndex, progress]
        return async () => {
          // Empty the bar instantly (no backwards slide), then fill to the new progress.
          const bar = el.sides.p1.info.querySelector(".exp-fill");
          bar.style.transition = "none";
          setExp(ev[4], 0, b, c);
          void bar.offsetWidth;
          bar.style.transition = "";
          await wait(250);
          setExp(ev[4], ev[5], b, c);
          const jingle = window.GameAudio ? window.GameAudio.fanfare("mus_level_up") : null;
          await message(teamName(ev[4]) + " grew to Lv. " + b + "!");
          await jingle;
        };
      case "-learnmove":   // [ident, move, teamIndex]
        return teamName(c) + " learned " + b + "!";
      case "-trylearn":    // [ident, move, teamIndex]
        return async () => {
          const mon = battle.sides.p1.pokemon[+c];
          const slot = await window.Screen.learnMovePrompt(mon.name, battle.ownMoves(mon).map((m) => m.name), b);
          if (slot != null) battle.replaceMove("p1", +c, slot, b);
        };

      // ----- Wild battles -----
      case "-ball":   // [side, ball, target, shakes, "caught"|""]
        return async () => {
          await message("You threw a " + ballName(b) + "!", 700);
          el.ball.src = "assets/sprites/items/ball/" + b.replace(/-ball$/, "") + ".png";
          el.ball.classList.remove("hidden", "shake", "caught");
          view.p2.inBall = true;
          renderSide("p2");
          await wait(500);
          for (let i = 0; i < +ev[4]; i++) {
            el.ball.classList.remove("shake");
            void el.ball.offsetWidth;
            el.ball.classList.add("shake");
            await wait(SHAKE_MS);
          }
          if (ev[5] === "caught") { el.ball.classList.add("caught"); return; }
          el.ball.classList.add("hidden");
          view.p2.inBall = false;
          renderSide("p2");
          await message(BREAK_FREE[+ev[4]] || BREAK_FREE[0]);
        };
      case "caught":   // FireRed's catch jingle, then the caught theme
        return async () => {
          const GA = window.GameAudio;
          if (GA) GA.music("mus_caught");
          const jingle = GA ? GA.fanfare("mus_caught_intro") : null;
          await message("Gotcha! " + nameOf(a) + " was caught!");
          await jingle;
        };

      // ----- Items -----
      case "-useitem":   // [side, item, target, teamIndex, hp, healed, cured, "confusion", "revive", pp]
        return async () => {
          const user = side === "p1" ? "You" : battle.sides.p2.name;
          const itemName = ballName(b);
          await message(user + " used " + (/^[AEIOU]/.test(itemName) ? "an " : "a ") + itemName + "!");
          const index = +ev[4];
          if (view[side].teamIndex === index) setHp(c, ev[5]);
          const name = battle.sides[side].pokemon[index].name;
          if (ev[9]) await message(name + " was revived!");
          if (+ev[6] > 0) await message(name + "'s HP was restored by " + ev[6] + " point" + (+ev[6] === 1 ? "" : "s") + ".");
          if (ev[7]) await message(fill(lookup(STATUS_CURE, ev[7], "{who} was cured!"), c));
          if (ev[8]) await message(fill("{who} snapped out of its confusion!", c));
          if (+ev[10] > 0) await message(name + "'s PP was restored.");
        };
      case "-run": return "Got away safely!";
      case "-runfail": return "You couldn't get away!";

      case "win":
        if (a !== battle.sides.p1.name) return null; // the game layer handles losing
        return battle.wild ? null : "You defeated " + battle.sides.p2.name + "!";
      case "tie": return "The battle ended in a draw!";
      default: return null; // "turn" and anything purely internal
    }
  }

  async function playEvent(ev) {
    const out = applyEvent(ev);
    if (typeof out === "string") await message(out);
    else if (typeof out === "function") await out();
    else if (out && out.pause) await wait(out.pause);
  }
  async function playNewEvents() {
    const events = battle.events;
    while (cursor < events.length) {
      if (playedEarly.has(cursor)) { cursor++; continue; }
      // As in FireRed, an opposing trainer sends out their Pokémon before you do.
      const ev = events[cursor];
      if (foeTrainerOut && ev[0] === "switch" && sideOf(ev[1]) === "p1") {
        const j = events.findIndex((e, k) => k > cursor && e[0] === "switch" && sideOf(e[1]) === "p2");
        if (j > 0) { playedEarly.add(j); await playEvent(events[j]); }
      }
      cursor++;
      await playEvent(ev);
    }
  }

  // ---------- Menus ----------

  const escapeHtml = window.Screen.escapeHtml;

  function moveOption(m) {
    return {
      html: '<span class="move-name">' + escapeHtml(m.name) + "</span>" +
        '<span class="move-meta"><span>' + m.type + "</span><span>PP " + m.pp + "/" + m.maxpp + "</span></span>",
      className: "type-" + m.type, value: { type: "move", move: m.index }, disabled: m.disabled
    };
  }

  function partyOptions(req) {
    return req.team.map((p) => ({
      html: '<span class="move-name">' + escapeHtml(p.name) + " <small>Lv" + p.level + "</small></span>" +
        '<span class="party-hp">' + (p.fainted ? "Fainted" : "HP " + p.hp + "/" + p.maxhp) +
        (p.active ? " · in battle" : "") + "</span>",
      value: p.index, disabled: !req.switches.includes(p.index)
    }));
  }

  async function chooseSwitch(req, canCancel) {
    const options = partyOptions(req);
    if (canCancel) options.push({ label: "Back", value: null, className: "action", wide: true });
    const index = await ask(canCancel ? "Choose a Pokémon to switch in." : "Choose your next Pokémon.", options);
    return index == null ? null : { type: "switch", index };
  }

  const itemOption = (id, count) => ({
    html: '<span class="move-name">' + escapeHtml(window.Bag.name(id)) + "</span>" +
      '<span class="move-meta"><span>' + escapeHtml(window.Bag.pocket(id)) + "</span><span>×" + count + "</span></span>",
    value: id
  });
  const back = { label: "Back", value: null, className: "action", wide: true };

  // Bag in battle: balls (wild battles only) and anything usable in battle.
  // Returns a choice, or null to go back. The item leaves the bag once the
  // engine accepts the choice (see loop()).
  async function chooseBag() {
    const bag = config.bag || {};
    const usableHere = (id) => {
      if (!(bag[id] > 0)) return false;
      if (window.Bag.isBall(id)) return battle.wild;
      const eff = window.ItemUse.effect(id);
      return !!eff && !eff.outOfBattle;
    };
    for (;;) {
      const items = Object.keys(bag).filter(usableHere);
      if (!items.length) {
        await message("There's nothing in your bag you can use right now.");
        return null;
      }
      const item = await ask("Which item will you use?", items.map((id) => itemOption(id, bag[id])).concat([back]));
      if (item == null) return null;
      if (window.Bag.isBall(item)) return { type: "ball", ball: item };

      const mons = battle.sides.p1.pokemon;
      const target = await ask("Use " + window.Bag.name(item) + " on which Pokémon?", mons.map((m, i) => ({
        html: '<span class="move-name">' + escapeHtml(m.name) + " <small>Lv" + m.level + "</small></span>" +
          '<span class="party-hp">' + (m.fainted ? "Fainted" : "HP " + m.hp + "/" + m.maxhp) +
          (m.status ? " · " + m.status.toUpperCase() : "") + "</span>",
        value: i, disabled: !window.ItemUse.canUse(battle.itemView(m), item, { inBattle: true })
      })).concat([back]));
      if (target == null) continue;

      let move;
      if (window.ItemUse.effect(item).oneMove) {
        move = await ask("Restore PP to which move?", battle.ownMoves(mons[target]).map((m, i) => ({
          label: m.name + "  PP " + m.pp + "/" + m.maxpp, value: i, disabled: m.pp >= m.maxpp
        })).concat([back]));
        if (move == null) continue;
      }
      return { type: "item", item, target, move };
    }
  }

  function useUpItem(choice) {
    const bag = config.bag;
    const id = choice.type === "ball" ? choice.ball : choice.type === "item" ? choice.item : null;
    if (!bag || !id) return;
    bag[id]--;
    if (bag[id] <= 0) delete bag[id];
  }

  let lastMove = {};   // Pokémon name -> index of the move it used last, this battle
  async function chooseAction(req) {
    const active = req.active;
    for (;;) {
      const options = [];
      if (active.forced) options.push({ label: "Continue", value: { type: "move", move: 0 }, className: "action", wide: true });
      else if (active.struggle) options.push({ label: "Struggle", value: { type: "move", move: "Struggle" }, className: "action", wide: true });
      else {
        // The cursor starts on the move this Pokémon used last (once it has used one).
        const last = lastMove[active.name];
        for (const m of active.moves) options.push(Object.assign(moveOption(m), { focus: m.index === last }));
        // Always four move slots, so Bag / Pokémon / Run sit on their own row.
        for (let i = active.moves.length; i < 4; i++) options.push({ label: "—", value: null, disabled: true, className: "empty-move" });
      }
      if (!active.forced) {
        const small = battle.wild ? "action small" : "action";
        if (config.bag) options.push({ label: "Bag", value: "bag", className: small });
        options.push({ label: "Pokémon", value: "party", className: small, disabled: !req.switches.length });
        if (battle.wild) options.push({ label: "Run", value: "run", className: small, disabled: !active.canRun });
      }
      const v = await ask("What will " + active.name + " do?", options);
      if (v === "bag") { const c = await chooseBag(); if (c) return c; continue; }
      if (v === "party") { const c = await chooseSwitch(req, true); if (c) return c; continue; }
      if (v === "run") return { type: "run" };
      if (v && v.type === "move" && typeof v.move === "number") lastMove[active.name] = v.move;
      return v;
    }
  }

  // ---------- Turn flow ----------

  // Engine bugs shouldn't freeze the screen: report them and end the battle.
  function choose(side, choice) {
    try {
      return battle.choose(side, choice);
    } catch (e) {
      console.error(e);
      return { ok: false, crashed: true };
    }
  }

  async function loop() {
    for (;;) {
      await playNewEvents();
      if (battle.ended) return;
      const p1 = battle.getRequest("p1");
      if (p1.phase === "move" || p1.phase === "switch") {
        const choice = p1.phase === "move" ? await chooseAction(p1) : await chooseSwitch(p1, false);
        const r = choose("p1", choice);
        if (r.crashed) return "crashed";
        if (!r.ok) await message(r.error);
        else useUpItem(choice);
        continue;
      }
      const p2 = battle.getRequest("p2");
      if (p2.phase === "move" || p2.phase === "switch") {
        let choice;
        try { choice = config.opponent(battle); } catch (e) { console.error(e); return "crashed"; }
        if (choose("p2", choice).crashed) return "crashed";
        continue;
      }
      await message("Something went wrong: neither side can act.");
      return "crashed";
    }
  }

  // ---------- Opening ----------
  //
  // As in FireRed: the two halves of the background slide in, the foe's (with
  // the wild Pokémon, in shadow) from the left and yours (with your trainer,
  // seen from behind) from the right; the Pokémon lights
  // up and appears; then your trainer throws and slides away as your Pokémon
  // comes out.

  let trainerOut = false, foeAnnounced = false, foeTrainerOut = false;
  let playedEarly = new Set();   // events played ahead of their turn (the foe's first send-out)
  // The opposing trainer's picture, where their Pokémon will stand.
  function foeTrainerEl() {
    let t = document.getElementById("foe-trainer");
    if (!t) {
      t = document.createElement("img");
      t.id = "foe-trainer";
      t.className = "foe-trainer hidden";
      t.alt = "";
      el.field.insertBefore(t, el.sides.p2.sprite);
    }
    return t;
  }
  // Slides the foe's picture off to the right (before their first Pokémon) or
  // back in (when you've won).
  async function foeTrainerSlide(out) {
    const t = foeTrainerEl();
    if (!out) { t.classList.add("leaving"); t.classList.remove("hidden"); void t.offsetWidth; }
    t.classList.toggle("leaving", out);
    await wait(400);
    if (out) t.classList.add("hidden");
  }
  function trainerEl() {
    let t = document.getElementById("trainer-back");
    if (!t) {
      t = document.createElement("div");
      t.id = "trainer-back";
      t.className = "trainer-back hidden";
      el.field.appendChild(t);
    }
    return t;
  }
  // Waits (briefly) for a sprite's picture to be ready to show.
  async function spriteReady(img) {
    for (let i = 0; i < 30 && img.style.visibility === "hidden"; i++) await wait(20);
  }

  // The battle background for cfg.terrain (FireRed's battle terrains: "grass",
  // "building", "plain", "cave", ...; see tools/build-battle-bgs.js).
  function setTerrain(terrain) {
    const url = "url(assets/battle/" + (terrain || "plain") + ".png)";
    for (const t of el.field.querySelectorAll(".terrain")) t.style.backgroundImage = url;
  }

  async function intro(cfg) {
    trainerOut = false; foeAnnounced = false; foeTrainerOut = false; foeHpAtSwitchIn = null; lastMove = {};
    playedEarly = new Set();
    setTerrain(cfg.terrain);
    const foeTrainer = foeTrainerEl();
    foeTrainer.classList.add("hidden");
    foeTrainer.classList.remove("leaving");
    const trainer = trainerEl();
    // Each half moves by half the background (256 of its 512 pixels), so the
    // platforms start off-screen and plain ground shows where they will be.
    const shift = el.field.clientWidth * 256 / 240;
    const foeTerrain = el.field.querySelector(".terrain.foe"), playerTerrain = el.field.querySelector(".terrain.player");
    const movers = [];
    if (cfg.trainer) {
      trainer.style.backgroundImage = "url(assets/sprites/trainers/back/" + cfg.trainer + ".png)";
      trainer.style.backgroundPositionY = "0%";
      trainer.classList.remove("hidden", "leaving");
      movers.push([trainer, shift]);
      trainerOut = true;
    } else trainer.classList.add("hidden");
    let mon = null;
    if (cfg.wild) {
      mon = battle.sides.p2.pokemon[0];
      view.p2 = { name: mon.name, species: mon.species, level: mon.level, hp: mon.hp, maxhp: mon.maxhp, status: "",
        fainted: false, exp: null, teamIndex: 0, form: (cfg.p2.team[0] || {}).form || "" };
      renderSide("p2");
      el.sides.p2.info.classList.add("hidden");
      el.sides.p2.sprite.classList.add("silhouette");
      movers.push([el.sides.p2.sprite, -shift]);
    } else if (cfg.foeTrainer) {
      foeTrainer.src = "assets/sprites/trainers/front/" + cfg.foeTrainer + ".png";
      await foeTrainer.decode().catch(() => {});
      // A wider picture (two trainers) keeps the same scale and centre (x 176 of 240).
      const w = foeTrainer.naturalWidth || 64;
      foeTrainer.style.width = (w / 240 * 100) + "%";
      foeTrainer.style.right = ((64 - w / 2) / 240 * 100) + "%";
      foeTrainer.classList.remove("hidden");
      movers.push([foeTrainer, -shift]);
      foeTrainerOut = true;
    }
    // Jump off-screen instantly (no transition), before anything is painted...
    el.field.classList.add("no-anim");
    foeTerrain.style.backgroundPositionX = -shift + "px";
    playerTerrain.style.backgroundPositionX = shift + "px";
    for (const [e, dx] of movers) e.style.transform = "translateX(" + dx + "px)";
    void el.field.offsetWidth;
    el.field.classList.remove("no-anim");
    // ...then, once the wild Pokémon's picture is ready, slide in.
    if (mon) await spriteReady(el.sides.p2.sprite);
    el.field.classList.add("entering");
    for (const t of [foeTerrain, playerTerrain]) t.style.backgroundPositionX = "";
    for (const [e] of movers) e.style.transform = "";
    await wait(1100);
    el.field.classList.remove("entering");
    if (mon) {
      el.sides.p2.sprite.classList.remove("silhouette");
      cry("p2");
      await wait(350);
      el.sides.p2.info.classList.remove("hidden");
      await message("A wild " + mon.name + " appeared!");
      foeAnnounced = true;
    }
  }

  // ---------- Poké Ball throws ----------
  //
  // A ball arcs from `from` (field %, x and y) to where the Pokémon stands,
  // spinning; it pops open and the Pokémon grows out of it in a white flash.
  const BALL_LANDS = { p1: [21, 80], p2: [73.5, 50] };
  const THROW_FROM_HAND = [44, 52], THROW_FROM_LEFT = [-6, 40], FOE_THROW_FROM = [106, 8];
  const THROW_MS = 560, POP_MS = 420;

  function throwBallEl() {
    let b = document.getElementById("throw-ball");
    if (!b) {
      b = document.createElement("img");
      b.id = "throw-ball";
      b.className = "throw-ball hidden";
      b.alt = "";
      el.field.appendChild(b);
    }
    return b;
  }
  const ballUrl = (ball) => "assets/sprites/items/ball/" + (ball || "poke-ball").replace(/-ball$/, "") + ".png";

  async function throwBall(side, from, ball) {
    const b = throwBallEl();
    b.src = ballUrl(ball);
    await b.decode().catch(() => {});
    const [x0, y0] = from, [x1, y1] = BALL_LANDS[side];
    const frames = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      frames.push({ left: (x0 + (x1 - x0) * t) + "%", top: (y0 + (y1 - y0) * t - 120 * t * (1 - t)) + "%",
        transform: "translate(-50%, -50%) rotate(" + Math.round(t * 720) + "deg)" });
    }
    b.classList.remove("hidden");
    await b.animate(frames, { duration: THROW_MS, easing: "linear" }).finished;
    // Opening: a quick white burst where it landed.
    await b.animate([{ left: x1 + "%", top: y1 + "%", transform: "translate(-50%, -50%) scale(1)", filter: "brightness(1)", opacity: 1 },
      { left: x1 + "%", top: y1 + "%", transform: "translate(-50%, -50%) scale(1.6)", filter: "brightness(4)", opacity: 0 }],
      { duration: 160, easing: "ease-out" }).finished;
    b.classList.add("hidden");
  }

  // ---------- Recalling ----------
  //
  // FireRed's words when you call a Pokémon back depend on how much of the
  // foe's HP went while it was out (gBattleStruct->hpScale): none, "that's
  // enough!"; under 30%, "come back!"; under 70%, "OK!"; more, "good!".
  // A trainer "withdrew" theirs.
  let foeHpAtSwitchIn = null;
  function recallText(side, prev) {
    if (side === "p2") return battle.sides.p2.name + " withdrew " + prev.name + "!";
    const foe = view.p2;
    const lost = foe && foe.maxhp && foeHpAtSwitchIn != null ? (foeHpAtSwitchIn - foe.hp) * 100 / foe.maxhp : 0;
    if (lost <= 0) return prev.name + ", that's enough!\nCome back!";
    if (lost < 30) return prev.name + ", come back!";
    if (lost < 70) return prev.name + ", OK!\nCome back!";
    return prev.name + ", good!\nCome back!";
  }

  // The ball appears where the Pokémon stands; the Pokémon turns red and
  // shrinks into it, and the ball goes.
  const RECALL_RED = "brightness(0.55) sepia(1) saturate(12) hue-rotate(-38deg)";
  async function recall(side, text, ball) {
    const sprite = el.sides[side].sprite, b = throwBallEl();
    const [x, y] = BALL_LANDS[side];
    b.src = ballUrl(ball);
    await b.decode().catch(() => {});
    b.style.left = x + "%";
    b.style.top = y + "%";
    b.classList.remove("hidden");
    el.sides[side].info.classList.add("hidden");
    const said = message(text);
    // Shrink toward the ball, wherever it sits on the sprite.
    const sr = sprite.getBoundingClientRect(), br = b.getBoundingClientRect();
    const origin = sr.width ? ((br.left + br.width / 2 - sr.left) / sr.width * 100).toFixed(1) + "% " +
      ((br.top + br.height / 2 - sr.top) / sr.height * 100).toFixed(1) + "%" : "";
    sprite.style.transformOrigin = origin;
    await sprite.animate([
      { transform: "scale(1)", filter: "none", opacity: 1 },
      { transform: "scale(1)", filter: RECALL_RED, opacity: 1, offset: 0.3 },
      { transform: "scale(0.05)", filter: RECALL_RED, opacity: 0.5 }],
      { duration: 480, easing: "ease-in" }).finished;
    sprite.style.transformOrigin = "";
    sprite.classList.add("in-ball");
    await wait(150);
    await b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160 }).finished;
    b.classList.add("hidden");
    await said;
  }

  // Throws `side`'s Pokémon out of its ball (after `delay` ms) and shows it.
  // A Pokémon's cry as it comes out (or, lower, as it faints).
  const cry = (side, opts) => { if (window.GameAudio && view[side] && view[side].species) window.GameAudio.cry(view[side].species, opts); };

  async function sendOut(side, from, ball, delay) {
    const sprite = el.sides[side].sprite;
    sprite.classList.add("in-ball");   // hidden until the ball opens
    renderSide(side);
    el.sides[side].info.classList.add("hidden");
    if (delay) await wait(delay);
    await Promise.all([throwBall(side, from, ball), spriteReady(sprite)]);
    const grow = sprite.animate([
      { transform: "scale(0.1)", filter: "brightness(0) invert(1)", opacity: 1 },
      { transform: "scale(1)", filter: "brightness(0) invert(1)", opacity: 1, offset: 0.55 },
      { transform: "scale(1)", filter: "none", opacity: 1 }], { duration: POP_MS, easing: "ease-out" });
    sprite.classList.remove("in-ball");
    cry(side);
    await grow.finished;
    el.sides[side].info.classList.toggle("hidden", view[side].fainted);
  }

  // Your trainer's throw (frames 1-4 of the back sprite), then off to the left.
  async function throwOut() {
    const t = trainerEl();
    for (const f of [1, 2, 3, 4]) { t.style.backgroundPositionY = (f * 25) + "%"; await wait(70); }
    t.classList.add("leaving");
    await wait(350);
    t.classList.add("hidden");
  }

  // Runs one battle to the end. See the header for `cfg`.
  async function run(cfg) {
    config = cfg;
    battle = new Battle({
      p1: cfg.p1, p2: cfg.p2, wild: !!cfg.wild, exp: !!cfg.exp, expShare: !!cfg.expShare, catchContext: cfg.catchContext
    });
    cursor = 0;
    view = { p1: { species: null }, p2: { species: null } };
    el.ball.classList.add("hidden");
    renderSide("p1");
    renderSide("p2");
    await intro(cfg);
    if (!cfg.wild) await message(cfg.p2.name + " would like to battle!");
    battle.start();
    const status = await loop();
    let outcome;
    if (status === "crashed") {
      await message("The battle engine hit an error (details in the browser console).");
      outcome = "crashed";
    } else if (battle.caught) outcome = "caught";
    else if (battle.escaped) outcome = "ran";
    else if (battle.winner === "p1") {
      outcome = "won";
      // The trainer comes back out to say their piece.
      if (cfg.foeTrainer && !cfg.wild) {
        await foeTrainerSlide(false);
        for (const page of [].concat(cfg.defeatText || [])) await message(page);
      }
    }
    else if (battle.winner === "p2") outcome = "lost";
    else outcome = "draw";
    return { outcome, battle };
  }

  window.BattleScreen = { run, ballName };
})();
