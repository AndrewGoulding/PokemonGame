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
      p1: { sprite: $("#sprite-player") },
      p2: { sprite: $("#sprite-foe") }
    }
  };

  // ---------- The healthboxes (src/battle_interface.c) ----------
  //
  // FireRed's boxes, drawn on a canvas over the field (assets/battle-interface/,
  // tools/build-healthbox.js): the opponent's at the top left (its sprites at
  // 44, 30), yours at the bottom right (158, 88), each made of the box, the
  // name and gender, "Lv" and the level, the HP bar (48 pixels; green, yellow
  // below half, red below a fifth), and on yours the HP as numbers and the EXP
  // bar (64 pixels). The HP bar moves 1 HP a frame (or 1 pixel, under 48 max
  // HP), the EXP bar 1 pixel a frame after 13 frames, both as FireRed's do. A
  // box slides in 115 pixels, 5 a frame, as its Pokémon comes out; yours bobs
  // a pixel while you choose what to do, and a box shakes when its Pokémon is
  // hit. At a level up your box's frame flashes light blue.
  const hbLayer = document.createElement("canvas");
  hbLayer.className = "party-bars healthboxes";
  hbLayer.width = 240; hbLayer.height = 112;
  el.field.appendChild(hbLayer);
  const hbImg = (n) => Object.assign(new Image(), { src: "assets/battle-interface/" + n + ".png" });
  const HB = {
    p1: { box: hbImg("healthbox-player"), frame: hbImg("healthbox-player-frame"), x: 126, y: 72, h: 64, slideFrom: 115 },
    p2: { box: hbImg("healthbox-opponent"), frame: hbImg("healthbox-opponent-frame"), x: 12, y: 14, h: 32, slideFrom: -115 }
  };
  const hbBar = hbImg("healthbar"), hbElements = hbImg("healthbox-elements"), hbStatus = hbImg("status-icons");
  const HB_CREAM = [255, 255, 222], HB_TEXT = [65, 65, 65], HB_SHADOW = [222, 213, 180];
  const HB_MALE = [65, 205, 255], HB_FEMALE = [255, 156, 148];
  const HB_STATUS = { psn: 0, tox: 0, par: 1, slp: 2, frz: 3, brn: 4 };
  let hb = {}, hbRaf = 0, hbWaiters = [];
  function hbReset() {
    hb = {};
    for (const side of ["p1", "p2"]) {
      hb[side] = { shown: false, x2: 0, y2: 0, shake: 0, bounce: false, bounceIdx: 128, key: null,
        hp: 0, hpTo: 0, maxhp: 1, exp: 0, expTo: 0, expDelay: 0, flash: -1, data: {}, layer: null, layerKey: null };
    }
  }
  hbReset();
  // The pixels of HP bar the HP fills (CalcBarFilledPixels).
  function hpPixels(hp, max) {
    const px = Math.floor(hp * 48 / Math.max(1, max));
    return px === 0 && hp > 0 ? 1 : px;
  }
  // An 8x8 tile of a 40-tile-wide sheet.
  const hbTile = (g, img, t, x, y) => g.drawImage(img, (t % 40) * 8, Math.floor(t / 40) * 8, 8, 8, x, y, 8, 8);

  // The box and its text, redrawn when what it shows changes (box-relative).
  function hbLayerFor(side) {
    const b = hb[side], d = b.data, cfg = HB[side], foe = side === "p2";
    const shownHp = b.hp < b.hpTo ? Math.floor(b.hp) : Math.ceil(b.hp);
    const key = [d.name, d.gender, d.level, d.status, d.caught, shownHp, b.maxhp].join("|");
    if (b.layer && b.layerKey === key) return b.layer;
    b.layerKey = key;
    const s = window.GbaMenus.Surface();
    // The windows FireRed prints into (filled cream, then rows 5-15 copied in).
    const win = foe ? [[8, 5, 56, 11], [64, 5, 24, 11]] : [[16, 5, 56, 11], [72, 5, 24, 11], [56, 21, 40, 11]];
    win.forEach(([x, y, w, h]) => s.fill(x, y, w, h, HB_CREAM));
    // Name, then the gender symbol after it (FONT_SMALL at window (0, 3)).
    const nx = foe ? 8 : 16;
    const w = s.text(d.name || "", nx, 3, HB_TEXT, HB_SHADOW, "small");
    if (d.gender === "M" || d.gender === "F") s.text(d.gender === "M" ? "♂" : "♀", nx + w, 3, d.gender === "M" ? HB_MALE : HB_FEMALE, HB_SHADOW, "small");
    // "Lv" and the level, right-aligned in 24 pixels.
    const lv = String(d.level || "");
    s.text("{LV}" + lv, (foe ? 64 : 72) + 5 * (3 - lv.length), 3, HB_TEXT, HB_SHADOW, "small");
    // Your HP: "cur/" at (60, 21) and "max" at (80, 21), each right-aligned to 3.
    if (!foe) {
      const cur = String(Math.max(0, shownHp)), max = String(b.maxhp);
      s.text(cur + "/", 60 + 5 * (3 - cur.length), 21, HB_TEXT, HB_SHADOW, "small");
      s.text(max, 80 + 5 * (3 - max.length), 21, HB_TEXT, HB_SHADOW, "small");
    }
    const c = document.createElement("canvas");
    c.width = 128; c.height = cfg.h;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    if (cfg.box.complete) g.drawImage(cfg.box, 0, 0);
    // (Only the windows' rows 5-15 reach the box.)
    g.save();
    g.beginPath();
    win.forEach(([x, y, ww, hh]) => g.rect(x, y, ww, hh));
    g.clip();
    g.drawImage(s.canvas(), 0, 0);
    g.restore();
    // The status icon: yours left of the HP numbers, theirs over "HP".
    const st = HB_STATUS[d.status];
    if (st != null && hbStatus.complete) g.drawImage(hbStatus, 0, ((foe ? 5 : 0) + st) * 8, 24, 8, foe ? 8 : 16, foe ? 16 : 24, 24, 8);
    b.layer = c;
    return c;
  }

  function drawHealthboxes() {
    const g = hbLayer.getContext("2d");
    g.clearRect(0, 0, 240, 112);
    g.imageSmoothingEnabled = false;
    for (const side of ["p1", "p2"]) {
      const b = hb[side], cfg = HB[side], foe = side === "p2";
      if (!b.shown || !b.data.name) continue;
      const ox = cfg.x + b.x2, oy = cfg.y + b.y2;
      g.drawImage(hbLayerFor(side), ox, oy);
      if (b.flash >= 0 && cfg.frame.complete) {
        // (Colour 6 blends toward RGB(20, 27, 31) and back, 2/16 a frame.)
        g.globalAlpha = (b.flash <= 8 ? b.flash : 16 - b.flash) * 2 / 16;
        g.drawImage(cfg.frame, ox, oy);
        g.globalAlpha = 1;
      }
      if (!hbBar.complete) continue;
      // The healthbar: (the caught ball,) "HP", then the bar's six tiles.
      const bx = ox + (foe ? 40 : 48), by = oy + 16;
      const status = HB_STATUS[b.data.status] != null;
      if (!foe || !status) { hbTile(g, hbBar, 1, bx - 16, by); hbTile(g, hbBar, 2, bx - 8, by); }
      else hbTile(g, hbBar, 65, bx - 8, by);
      if (foe && b.data.caught && !status) hbTile(g, hbBar, 70, ox + 8, by);
      const px = hpPixels(b.hp, b.maxhp), base = px > 24 ? 3 : px > 9 ? 47 : 56;
      for (let i = 0; i < 6; i++) hbTile(g, hbBar, base + Math.max(0, Math.min(8, px - 8 * i)), bx + 8 * i, by);
      // Your EXP bar (64 pixels at 32, 32).
      if (!foe && hbElements.complete) {
        const e = Math.round(b.exp);
        for (let i = 0; i < 8; i++) hbTile(g, hbElements, 12 + Math.max(0, Math.min(8, e - 8 * i)), ox + 32 + 8 * i, oy + 32);
      }
    }
  }

  function tickHealthboxes() {
    for (const side of ["p1", "p2"]) {
      const b = hb[side];
      if (b.x2) b.x2 = b.x2 > 0 ? Math.max(0, b.x2 - 5) : Math.min(0, b.x2 + 5);
      // HP: 1 HP a frame, or 1 pixel's worth when the max is under 48.
      if (b.hp !== b.hpTo) {
        const step = b.maxhp >= 48 ? 1 : b.maxhp / 48;
        b.hp = b.hp < b.hpTo ? Math.min(b.hpTo, b.hp + step) : Math.max(b.hpTo, b.hp - step);
      }
      if (b.expDelay > 0) b.expDelay--;
      else if (b.exp !== b.expTo) b.exp = b.exp < b.expTo ? Math.min(b.expTo, b.exp + 1) : b.expTo;
      if (b.flash >= 0 && ++b.flash > 16) b.flash = -1;
      // DoHitAnimHealthboxEffect: +1, -1, ... for 21 frames.
      if (b.shake > 0) { b.shake--; b.y2 = b.shake ? (b.shake % 2 ? 1 : -1) : 0; }
      else if (b.bounce) { b.y2 = (b.bounceIdx === 64 ? 2 : b.bounceIdx <= 128 ? 1 : 0); b.bounceIdx = (b.bounceIdx + 7) & 255; }
      else b.y2 = 0;
    }
    drawHealthboxes();
    const busy = ["p1", "p2"].some((sd) => { const b = hb[sd]; return b.hp !== b.hpTo || b.exp !== b.expTo || b.flash >= 0 || b.x2; });
    if (!busy && hbWaiters.length) { const w = hbWaiters; hbWaiters = []; w.forEach((r) => r()); }
    hbRaf = requestAnimationFrame(tickHealthboxes);
  }
  // Resolves when the bars have stopped moving (and boxes sliding in).
  const hbSettled = () => new Promise((r) => hbWaiters.push(r));
  function hbStart() { if (!hbRaf) hbRaf = requestAnimationFrame(tickHealthboxes); }
  function hbStop() { cancelAnimationFrame(hbRaf); hbRaf = 0; hbWaiters.splice(0).forEach((r) => r()); hbReset(); drawHealthboxes(); }
  // Showing or hiding a box (what the old info boxes' classList did): shown,
  // it slides in.
  function hbShow(side, on) {
    const b = hb[side];
    if (on && !b.shown) b.x2 = HB[side].slideFrom;
    b.shown = !!on;
  }
  const hbInfo = (side) => ({
    classList: {
      add: (c) => { if (c === "hidden") hbShow(side, false); },
      remove: (c) => { if (c === "hidden") hbShow(side, true); },
      toggle: (c, on) => { if (c === "hidden") hbShow(side, !on); }
    }
  });
  el.sides.p1.info = hbInfo("p1");
  el.sides.p2.info = hbInfo("p2");

  // ---------- The party summary bars (src/battle_interface.c) ----------
  //
  // In a trainer battle, FireRed shows each side's party as a row of balls on
  // a bar: both sides as the battle starts, and the trainer's again when they
  // send out their next Pokémon. A ball for each Pokémon (the status ball for
  // one with a status problem, the dark one once fainted), the empty ball for
  // each empty slot of six. Yours slide in from the right below your
  // Pokémon, theirs from the left above theirs (the trainer's first Pokémon
  // is the rightmost ball). They fade out as the Pokémon are sent out.
  const barLayer = document.createElement("canvas");
  barLayer.className = "party-bars";
  barLayer.width = 240; barLayer.height = 112;
  el.field.appendChild(barLayer);
  const barImg = Object.assign(new Image(), { src: "assets/battle-interface/party-bar.png" });
  const ballsImg = Object.assign(new Image(), { src: "assets/battle-interface/party-balls.png" });
  let bars = {}, barRaf = 0;   // side -> { balls: [frame x6], t (frames shown), fade (0-16) }
  function ballFrames(side) {
    const team = battle.sides[side].pokemon;
    const frames = [];
    for (let i = 0; i < 6; i++) {
      const m = team[i];
      frames.push(!m ? 1 : m.fainted || m.hp <= 0 ? 3 : m.status ? 2 : 0);
    }
    return frames;
  }
  function drawBars() {
    const g = barLayer.getContext("2d");
    g.clearRect(0, 0, 240, 112);
    g.imageSmoothingEnabled = false;
    for (const side of Object.keys(bars)) {
      const b = bars[side], foe = side === "p2";
      g.globalAlpha = Math.max(0, 1 - b.fade / 16);
      // The bar slides 100 pixels in, 5 a frame; each ball 120, 7 frames apart.
      const barOff = Math.max(0, 100 - b.t * 5);
      g.save();
      if (foe) { g.translate(-8 + 128 - barOff, 36); g.scale(-1, 1); g.drawImage(barImg, 0, 0); }
      else g.drawImage(barImg, 120 + barOff, 92);
      g.restore();
      b.balls.forEach((f, i) => {
        const wait = foe ? (6 - i) * 7 + 10 : i * 7 + 10;
        const off = Math.max(0, 120 - Math.max(0, b.t - wait) * 12);
        const x = foe ? 26 + 10 * i - off : 156 + 10 * i + off;
        g.drawImage(ballsImg, f * 8, 0, 8, 8, x, foe ? 32 : 88, 8, 8);
      });
      g.globalAlpha = 1;
    }
  }
  function tickBars() {
    let alive = false;
    for (const side of Object.keys(bars)) {
      const b = bars[side];
      b.t++;
      if (b.leaving) b.fade++;
      if (b.fade >= 16) delete bars[side]; else alive = true;
    }
    drawBars();
    barRaf = alive ? requestAnimationFrame(tickBars) : 0;
  }
  // Shows `side`'s bar (the foe's balls in reverse: their lead is rightmost).
  function showBar(side) {
    const frames = ballFrames(side);
    bars[side] = { balls: side === "p2" ? frames.slice().reverse() : frames, t: 0, fade: 0, leaving: false };
    if (window.GameAudio && window.GameAudio.se) window.GameAudio.se("se_ball_tray_enter");
    if (!barRaf) barRaf = requestAnimationFrame(tickBars);
    return new Promise((r) => setTimeout(r, 600));
  }
  function hideBars() {
    for (const b of Object.values(bars)) b.leaving = true;
    if (!barRaf && Object.keys(bars).length) barRaf = requestAnimationFrame(tickBars);
  }

  // ---------- State ----------

  let battle = null;
  let config = null;
  let cursor = 0;       // index of the next battle event to play
  let view = null;      // what the screen currently shows for each side

  const sideOf = (ident) => String(ident).slice(0, 2);
  const nameOf = (ident) => String(ident).replace(/^p\da: /, "");
  const otherSide = (side) => (side === "p1" ? "p2" : "p1");
  const { message, ask, wait, say, clearMenu } = window.Screen;

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
    window.Screen.setSprite(sprite, v.species, v.form, id === "p1", v.shiny);
    placeSprite(sprite, v, id === "p1");
    sprite.alt = v.name;
    sprite.classList.toggle("hidden", !!v.inBall);
    sprite.classList.toggle("fainted", v.fainted);
    info.classList.toggle("hidden", v.fainted);

    // The box: a new Pokémon's shows its HP and EXP at once; after that the
    // bars move to what changed.
    const b = hb[id], mon = battle.sides[id].pokemon[v.teamIndex] || {};
    const key = v.teamIndex + ":" + v.species;
    b.data = {
      name: v.name, level: v.level, status: v.status,
      gender: /^Nidoran/.test(v.species) ? "" : mon.gender,
      // (A wild Pokémon's box shows a ball if you've caught its kind before.)
      caught: id === "p2" && battle.wild && config.catchContext && config.catchContext.caughtBefore
        ? !!config.catchContext.caughtBefore(v.species) : false
    };
    b.maxhp = v.maxhp || 1;
    b.hpTo = v.hp;
    const expPx = v.exp == null ? 0 : Math.floor(v.exp * 64);
    if (b.key !== key) { b.key = key; b.hp = v.hp; b.exp = b.expTo = expPx; }
    else if (expPx !== b.expTo) { b.expTo = expPx; b.expDelay = 13; }
    hbStart();
  }

  // ---------- Animations and sound effects ----------
  //
  // FireRed's sound effects (ui/audio.js GameAudio.se): a move's own (se_m_*,
  // when FireRed has one by its name) or one for its type, the hit by how
  // effective it was, fainting, stat changes, the balls, running, Exp. Each
  // move animates by its kind, in its type's colour: a physical move lunges at
  // the target, a special one sends an orb over, a status move rings the
  // target or glows round the user. BATTLE SCENE: OFF (the Option screen)
  // leaves the animations, and their sounds, out.
  const sceneOn = () => !(window.GameOptions && window.GameOptions.get().battleScene === 1);
  const sfx = (name) => { if (name && window.GameAudio && window.GameAudio.se) window.GameAudio.se(name); };
  const TYPE_SE = {   // [physical, special / status]
    Normal: ["se_m_comet_punch", "se_m_swift"], Fire: ["se_m_fire_punch", "se_m_flamethrower"], Water: ["se_m_crabhammer", "se_m_surf"],
    Electric: ["se_m_thunder_wave", "se_m_thunderbolt"], Grass: ["se_m_cut", "se_m_absorb"], Ice: ["se_m_icy_wind", "se_m_blizzard"],
    Fighting: ["se_m_mega_kick", "se_m_vital_throw"], Poison: ["se_m_toxic", "se_m_toxic"], Ground: ["se_m_dig", "se_m_earthquake"],
    Flying: ["se_m_wing_attack", "se_m_gust"], Psychic: ["se_m_psybeam", "se_m_psybeam"], Bug: ["se_m_string_shot", "se_m_string_shot"],
    Rock: ["se_m_rock_throw", "se_m_rock_throw"], Ghost: ["se_m_lick", "se_m_nightmare"], Dragon: ["se_m_dragon_rage", "se_m_dragon_rage"],
    Dark: ["se_m_bite", "se_m_faint_attack"], Steel: ["se_m_vicegrip", "se_m_harden"], Fairy: ["se_m_charm", "se_m_moonlight"]
  };
  const TYPE_COLOR = {
    Normal: "#c6c6a7", Fire: "#f08030", Water: "#6890f0", Electric: "#f8d030", Grass: "#78c850", Ice: "#98d8d8",
    Fighting: "#c03028", Poison: "#a040a0", Ground: "#e0c068", Flying: "#a890f0", Psychic: "#f85888", Bug: "#a8b820",
    Rock: "#b8a038", Ghost: "#705898", Dragon: "#7038f8", Dark: "#705848", Steel: "#b8b8d0", Fairy: "#ee99ac"
  };
  function moveSound(name, data) {
    const own = "se_m_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    if (window.MUSIC_DATA && window.MUSIC_DATA.songs[own]) return own;
    const t = TYPE_SE[data.type] || TYPE_SE.Normal;
    return data.cat === "Physical" ? t[0] : t[1];
  }
  // Where a side's Pokémon is, in % of the field (its picture's middle).
  function centerOf(side) {
    const f = el.field.getBoundingClientRect(), r = el.sides[side].sprite.getBoundingClientRect();
    return [((r.left + r.width / 2) - f.left) / f.width * 100, ((r.top + r.height / 2) - f.top) / f.height * 100];
  }
  async function animateMove(side, name) {
    const data = window.MOVES && window.MOVES[name];
    if (!data || !sceneOn()) return;
    const foeSide = side === "p1" ? "p2" : "p1";
    const user = el.sides[side].sprite, target = el.sides[foeSide].sprite;
    const color = TYPE_COLOR[data.type] || "#fff";
    const self = data.cat === "Status" && /^(self|allySide|allies|adjacentAllyOrSelf|all)$/.test(data.target);
    sfx(moveSound(name, data));
    if (data.cat === "Physical") {
      // A lunge at the target and back.
      const [dx, dy] = side === "p1" ? [14, -10] : [-14, 10];
      await user.animate([{ transform: "translate(0, 0)" }, { transform: "translate(" + dx + "%, " + dy + "%)", offset: 0.4 },
        { transform: "translate(0, 0)" }], { duration: 380, easing: "ease-in-out" }).finished;
      return;
    }
    if (self) {
      // A glow round the user, twice.
      await user.animate([{ filter: "none" }, { filter: "drop-shadow(0 0 6px " + color + ") brightness(1.4)" }, { filter: "none" },
        { filter: "drop-shadow(0 0 6px " + color + ") brightness(1.4)" }, { filter: "none" }], { duration: 700 }).finished;
      return;
    }
    const fx = document.createElement("div");
    fx.className = "move-fx";
    fx.style.setProperty("--fx", color);
    el.field.appendChild(fx);
    const [x1, y1] = centerOf(foeSide);
    if (data.cat === "Special") {
      // An orb from the user to the target.
      const [x0, y0] = centerOf(side);
      fx.classList.add("orb");
      await fx.animate([{ left: x0 + "%", top: y0 + "%", transform: "translate(-50%, -50%) scale(0.6)" },
        { left: x1 + "%", top: y1 + "%", transform: "translate(-50%, -50%) scale(1.2)" }], { duration: 380, easing: "ease-in" }).finished;
      await fx.animate([{ left: x1 + "%", top: y1 + "%", transform: "translate(-50%, -50%) scale(1.2)", opacity: 1 },
        { left: x1 + "%", top: y1 + "%", transform: "translate(-50%, -50%) scale(2.4)", opacity: 0 }], { duration: 200 }).finished;
    } else {
      // Rings closing in on the target.
      fx.classList.add("ring");
      await fx.animate([{ left: x1 + "%", top: y1 + "%", transform: "translate(-50%, -50%) scale(2)", opacity: 0 },
        { left: x1 + "%", top: y1 + "%", transform: "translate(-50%, -50%) scale(1)", opacity: 1, offset: 0.5 },
        { left: x1 + "%", top: y1 + "%", transform: "translate(-50%, -50%) scale(0.4)", opacity: 0 }], { duration: 600 }).finished;
    }
    fx.remove();
    void target;
  }
  // A stat rising (red) or falling (blue) on a Pokémon, with FireRed's sound.
  async function animateStat(side, up) {
    if (!sceneOn()) return;
    sfx(up ? "se_m_stat_increase" : "se_m_stat_decrease");
    const c = up ? "#ff5040" : "#4080ff";
    await el.sides[side].sprite.animate([{ filter: "none" }, { filter: "drop-shadow(0 0 4px " + c + ") brightness(1.2)" }, { filter: "none" },
      { filter: "drop-shadow(0 0 4px " + c + ") brightness(1.2)" }, { filter: "none" }], { duration: 600 }).finished;
  }
  // FireRed puts "A critical hit!" and how effective it was after the hit.
  let hitNotes = [], hitSound = null;

  function flash(id) {
    // BATTLE SCENE: OFF (the Option screen) leaves out the hit animation.
    if (!sceneOn()) return;
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
    if (hurt) { flash(side); if (sceneOn()) hb[side].shake = 21; }
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

  // Whether the move just announced gets as far as its animation: not when the
  // next thing that happens is a miss, "But it failed!", no effect or Protect.
  function moveLands() {
    const events = battle.events;
    let i = cursor;
    while (events[i] && events[i][0] === "-magnitude") i++;
    const next = events[i];
    if (!next) return true;
    if (next[0] === "-miss" || next[0] === "-fail" || next[0] === "-immune") return false;
    if (next[0] === "-activate" && /Protect|Quick Guard/.test(String(next[2]))) return false;
    return true;
  }

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
          form: (config[side].team[+ev[5]] || {}).form || "", shiny: !!(config[side].team[+ev[5]] || {}).shiny };
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
          // After one of theirs faints, their party's balls show first.
          const fainted = prev && prev.species && (prev.fainted || prev.hp <= 0);
          return async () => {
            await withdraw();
            if (fainted) await showBar("p2");
            await Promise.all([message(text), sendOut(side, FOE_THROW_FROM, ball).then(hideBars)]);
          };
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
      case "move": {
        hitNotes = []; hitSound = null;
        const text = fill("{who} used " + b + "!", a);
        // (Magnitude's animation waits for "Magnitude n!"; a move that misses,
        // fails or is blocked has none, as in FireRed.)
        const lands = moveLands();
        return async () => { await message(text, 400); if (b !== "Magnitude" && lands) await animateMove(side, b); };
      }
      case "-magnitude": {
        const lands = moveLands();
        return async () => { await message("Magnitude " + b + "!", 400); if (lands) await animateMove(side, "Magnitude"); };
      }
      case "-damage": {
        const changed = setHp(a, b);
        if (!c) {
          // A move's hit: its sound by how effective it was, the HP going down,
          // then "A critical hit!" / "It's super effective!".
          const notes = hitNotes, sound = hitSound || "se_effective";
          hitNotes = []; hitSound = null;
          return async () => {
            if (changed) { sfx(sound); await hbSettled(); }
            for (const n of notes) await message(n);
          };
        }
        const msg = fill(lookup(DAMAGE_FROM, effectId(c), "{who} was hurt by " + effectName(c) + "!"), a);
        return async () => { if (changed) await hbSettled(); if (msg) await message(msg); };
      }
      case "-heal": {
        const changed = setHp(a, b);
        const msg = fill(c ? lookup(HEAL_FROM, effectId(c), "{who} restored HP using its " + effectName(c) + "!")
          : HEAL_FROM.heal, a);
        return async () => { if (changed) await hbSettled(); if (msg) await message(msg); };
      }
      case "-sethp": // Pain Split: [user, userHp, target, targetHp]
        setHp(a, b);
        setHp(c, ev[4]);
        return async () => { await hbSettled(); await message("The battlers shared their pain!"); };
      case "faint":
        cry(side, { faint: true });
        setTimeout(() => sfx("se_faint"), 300);
        // The foe's last Pokémon down: the victory theme (over the Exp. messages).
        if (side === "p2" && config.victoryMusic && window.GameAudio && battle.sides.p2.pokemon.every((m) => m.fainted)) {
          window.GameAudio.music(config.victoryMusic);
        }
        v.fainted = true;
        v.hp = 0;
        renderSide(side);
        return fill("{who} fainted!", a);
      case "-miss": return fill("{who}'s attack missed!", a);
      case "-crit": hitNotes.push("A critical hit!"); return null;
      case "-supereffective": hitNotes.push("It's super effective!"); hitSound = "se_super_effective"; return null;
      case "-resisted": hitNotes.push("It's not very effective..."); hitSound = "se_not_effective"; return null;
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
        const text = type === "-boost" ? fill("{who}'s " + stat + (big ? " rose sharply!" : " rose!"), a)
          : fill("{who}'s " + stat + (big ? " harshly fell!" : " fell!"), a);
        return async () => { await animateStat(side, type === "-boost"); await message(text); };
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
        // "… gained … Exp. Points!", then the bar fills (SE_EXP while it does).
        return async () => {
          // The Exp. Share's half goes by quietly after one message, as in Gen 6.
          if (ev[5] !== "share") await message(teamName(c) + " gained " + b + " Exp. Points!");
          setExp(c, ev[4]);
          if (ev[5] !== "share" && view.p1.teamIndex === +c && hb.p1.exp !== hb.p1.expTo) { sfx("se_exp"); await hbSettled(); }
        };
      case "-expshare":
        return "The rest of your team gained Exp. Points thanks to the Exp. Share!";
      case "-levelup":   // [ident, level, hp, teamIndex, progress]
        // The full bar: the box's frame flashes (SE_EXP_MAX), the box shows the
        // new level and HP and an empty bar; "… grew to Lv. …!", then the
        // bar fills with what's left.
        return async () => {
          const onField = view.p1.teamIndex === +ev[4];
          if (onField) { sfx("se_exp_max"); hb.p1.flash = 0; await hbSettled(); }
          setExp(ev[4], 0, b, c);
          if (onField) { hb.p1.hp = hb.p1.hpTo; hb.p1.exp = hb.p1.expTo = 0; hb.p1.expDelay = 0; }
          const jingle = window.GameAudio ? window.GameAudio.fanfare("mus_level_up") : null;
          await message(teamName(ev[4]) + " grew to Lv. " + b + "!");
          await jingle;
          setExp(ev[4], ev[5], b, c);
          if (onField && hb.p1.exp !== hb.p1.expTo) { sfx("se_exp"); await hbSettled(); }
        };
      case "-learnmove":   // [ident, move, teamIndex]
        return teamName(c) + " learned " + b + "!";
      case "-trylearn":    // [ident, move, teamIndex]
        // FireRed's (BattleScript_TryLearnMoveLoop): "Delete a move to make
        // room for …?", the Summary screen to pick it (cfg.forgetMove), "Stop
        // learning …?" if not.
        return async () => {
          const mon = battle.sides.p1.pokemon[+c], name = teamName(c);
          await message(name + " is trying to\nlearn " + b + ".");
          await message("But, " + name + " can't learn\nmore than four moves.");
          for (;;) {
            say("Delete a move to make\nroom for " + b + "?");
            await window.Screen.printed();
            if (await window.GbaMenus.battleYesNo(overlay(), { frame: frame() })) {
              const moves = battle.ownMoves(mon).map((m) => m.name);
              const slot = config.forgetMove ? await config.forgetMove(+c, mon, b)
                : await window.Screen.learnMovePrompt(mon.name, moves, b);
              if (slot != null) {
                battle.replaceMove("p1", +c, slot, b);
                if (config.forgetMove) {
                  await message("1, 2, and… … … Poof!");
                  await message(name + " forgot\n" + moves[slot] + ".");
                  await message("And…");
                  await message(name + " learned\n" + b + "!");
                }
                return;
              }
            }
            say("Stop learning\n" + b + "?");
            await window.Screen.printed();
            if (await window.GbaMenus.battleYesNo(overlay(), { frame: frame() })) { await message(name + " did not learn\n" + b + "."); return; }
          }
        };

      // ----- Wild battles -----
      case "-ball":   // [side, ball, target, shakes, "caught"|""]
        return async () => {
          await message("You threw a " + ballName(b) + "!", 700);
          sfx("se_ball_throw");
          el.ball.src = "assets/sprites/items/ball/" + b.replace(/-ball$/, "") + ".png";
          el.ball.classList.remove("hidden", "shake", "caught");
          view.p2.inBall = true;
          renderSide("p2");
          // In it goes (FireRed: SE_BALL_TRADE), then the ball drops and bounces.
          setTimeout(() => sfx("se_ball_trade"), 150);
          setTimeout(() => sfx("se_ball_bounce_1"), 380);
          await wait(500);
          for (let i = 0; i < +ev[4]; i++) {
            el.ball.classList.remove("shake");
            void el.ball.offsetWidth;
            el.ball.classList.add("shake");
            sfx("se_ball");
            await wait(SHAKE_MS);
          }
          if (ev[5] === "caught") { el.ball.classList.add("caught"); return; }
          sfx("se_ball_trade");
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
      case "-run": sfx("se_flee"); return "Got away safely!";
      case "-runfail": return "You couldn't get away!";

      case "win":
        if (a !== battle.sides.p1.name) return null; // the game layer handles losing
        return battle.wild ? null : "You defeated " + battle.sides.p2.name + "!";
      case "tie": return "The battle ended in a draw!";
      default: return null; // "turn" and anything purely internal
    }
  }

  async function playEvent(ev) {
    // (A critical hit or effectiveness with no hit after it, e.g. on a Substitute.)
    if (hitNotes.length && !["-damage", "-crit", "-supereffective", "-resisted"].includes(ev[0])) {
      const notes = hitNotes;
      hitNotes = []; hitSound = null;
      for (const n of notes) await message(n);
    }
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

  // FireRed's party screen (ui/party-menu.js): A on a Pokémon opens SHIFT /
  // CANCEL. One that's fainted or already out says so; B goes back unless
  // a Pokémon has to be sent out.
  async function chooseSwitch(req, canCancel) {
    const mons = req.team.map((p) => ({
      name: p.name, icon: window.Screen.iconUrl(p.species), level: p.level, gender: p.gender,
      hp: p.hp, maxhp: p.maxhp, status: p.status, item: !!p.item
    }));
    let cursor = 0;
    for (;;) {
      say("");
      clearMenu();
      const frame = window.GameOptions ? window.GameOptions.get().frame : 0;
      const r = await window.PartyMenu.open({ mons, cursor, frame, canCancel,
        actions: () => [{ label: canCancel ? "SHIFT" : "SEND OUT", value: "shift" }, { label: "CANCEL", value: "cancel" }] });
      if (!r) { window.PartyMenu.close(); return null; }
      cursor = r.cursor;
      const p = req.team[r.slot];
      if (p.fainted || p.hp <= 0) { await message(p.name + " has no energy left to battle!"); continue; }
      if (p.active) { await message(p.name + " is already in battle!"); continue; }
      if (!req.switches.includes(p.index)) { await message(p.name + " can't be switched in now!"); continue; }
      window.PartyMenu.close();
      return { type: "switch", index: p.index };
    }
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
  // BAG: FireRed's Bag screen (ui/bag-screen.js, cfg.bagPockets). Use is
  // there for what can be used right now; the pocket is remembered.
  let battlePocket = null;
  async function chooseBag() {
    const bag = config.bag || {};
    const usableHere = (id) => {
      if (!(bag[id] > 0)) return false;
      if (window.Bag.isBall(id)) return battle.wild;
      const eff = window.ItemUse.effect(id);
      return !!eff && !eff.outOfBattle;
    };
    for (;;) {
      let item;
      if (config.bagPockets && window.BagScreen) {
        say("");
        clearMenu();
        const r = await window.BagScreen.open({
          pockets: config.bagPockets, pocketName: battlePocket || "Items", female: !!config.bagFemale,
          frame: window.GameOptions ? window.GameOptions.get().frame : 0,
          actions: (it) => (usableHere(it.id) ? [{ label: "Use", value: "use" }] : [])
        });
        window.BagScreen.close();
        if (!r) return null;
        battlePocket = r.pocket;
        item = r.id;
      } else {
        const items = Object.keys(bag).filter(usableHere);
        if (!items.length) {
          await message("There's nothing in your bag you can use right now.");
          return null;
        }
        item = await ask("Which item will you use?", items.map((id) => itemOption(id, bag[id])).concat([back]));
        if (item == null) return null;
      }
      if (window.Bag.isBall(item)) return { type: "ball", ball: item };

      // Which Pokémon: FireRed's party screen ("Use on which POKéMON?").
      const mons = battle.sides.p1.pokemon;
      let target = null;
      for (;;) {
        say("");
        clearMenu();
        const r = await window.PartyMenu.open({ message: "Use on which {PKMN}?", cursor: target || 0,
          frame: window.GameOptions ? window.GameOptions.get().frame : 0,
          mons: mons.map((m) => ({ name: m.name, icon: window.Screen.iconUrl(m.species), level: m.level, gender: m.gender,
            hp: m.fainted ? 0 : m.hp, maxhp: m.maxhp, status: m.status, item: !!m.item })) });
        if (!r) { target = null; break; }
        target = r.slot;
        if (window.ItemUse.canUse(battle.itemView(mons[target]), item, { inBattle: true })) break;
        await message("It won't have any effect.");
      }
      window.PartyMenu.close();
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

  // FireRed's battle menus (ui/gba-menus.js) in the bottom panel: FIGHT /
  // BAG / POKéMON / RUN, then the moves with their PP and type. The menu's
  // cursor stays where it was; the moves' starts on the move this Pokémon
  // used last (once it has used one). B goes back from the moves.
  let lastMove = {};   // Pokémon name -> index of the move it used last, this battle
  const overlay = () => document.getElementById("overlay");
  const frame = () => (window.GameOptions ? window.GameOptions.get().frame : 0);
  async function chooseAction(req) {
    const active = req.active;
    // Locked into a move (Outrage, recharging): no menu, as in FireRed.
    if (active.forced) return { type: "move", move: 0 };
    // Each turn the ▶ starts on FIGHT; the moves' ▶ starts on the first move,
    // then on the one it used last.
    let actionCursor = 0;
    for (;;) {
      say("");
      clearMenu();
      // (Your box bobs while you choose: DoBounceEffect(BOUNCE_HEALTHBOX, 7, 1).)
      hb.p1.bounce = true; hb.p1.bounceIdx = 128;
      const a = await window.GbaMenus.battleAction(overlay(), { name: active.name, cursor: actionCursor, frame: frame() });
      hb.p1.bounce = false;
      actionCursor = a.cursor;
      if (a.action === "fight") {
        if (active.struggle) { await message(active.name + " has no moves left!"); return { type: "move", move: "Struggle" }; }
        const slots = () => active.moves.map((m) => ({ name: m.name, type: m.type, pp: m.pp, maxpp: m.maxpp, index: m.index, disabled: m.disabled }));
        let moves = slots();
        const last = lastMove[active.name];
        let at = Math.max(0, moves.findIndex((m) => m.index === last));
        // SELECT swaps two moves, in the battle and on the Pokémon.
        const swap = (a, b) => {
          battle.swapMoves("p1", a, b);
          active.moves = battle.getMoveSlots(battle.sides.p1.active);
          if (lastMove[active.name] === a) lastMove[active.name] = b;
          else if (lastMove[active.name] === b) lastMove[active.name] = a;
          return (moves = slots());
        };
        for (;;) {
          const pick = await window.GbaMenus.battleMoves(overlay(), { moves, cursor: at, frame: frame(), swap });
          if (pick) at = pick.cursor;
          if (!pick) break;
          const m = moves[pick.index];
          if (!m.pp) { await message("There's no PP left for\nthis move!"); continue; }
          if (m.disabled) { await message(m.name + " can't be used right now!"); continue; }
          lastMove[active.name] = m.index;
          return { type: "move", move: m.index };
        }
        continue;
      }
      if (a.action === "bag") {
        if (!config.bag) { await message("Items can't be used now."); continue; }
        const c = await chooseBag(); if (c) return c; continue;
      }
      if (a.action === "pokemon") {
        if (!req.switches.length) { await message("There's no one else to switch in!"); continue; }
        const c = await chooseSwitch(req, true); if (c) return c; continue;
      }
      if (a.action === "run") {
        if (!battle.wild) { await message("No! There's no running\nfrom a Trainer battle!"); continue; }
        if (!active.canRun) { await message("Can't escape!"); continue; }
        return { type: "run" };
      }
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
        // SHIFT (the Option screen's BATTLE STYLE): "… is about to use …. Will
        // … change Pokémon?", and a free switch first if so.
        if (p2.phase === "switch" && choice && choice.type === "switch" && battle.canShift("p1")
            && !(window.GameOptions && window.GameOptions.get().battleStyle === 1)) {
          const next = battle.sides.p2.pokemon[choice.index];
          await message(battle.sides.p2.name + " is\nabout to use " + next.name + ".");
          say("Will " + battle.sides.p1.name + " change\nPokémon?");
          await window.Screen.printed();
          if (await window.GbaMenus.battleYesNo(overlay(), { frame: frame() })) {
            const req = battle.getRequest("p1");
            req.switches = battle.sides.p1.pokemon.map((m, i) => (!m.fainted && m !== battle.sides.p1.active ? i : -1)).filter((i) => i >= 0);
            const c = await chooseSwitch(req, true);
            if (c && c.type === "switch") { battle.shift("p1", c.index); await playNewEvents(); }
          }
        }
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
      sparkle("p2");
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
  // Your trainer's throw starts where FireRed's does (pokeball.c: the ball at
  // (32, 80) of the 240x112 scene), behind and left of where your Pokémon
  // comes out, so it flies forward.
  const THROW_FROM_HAND = [32 / 240 * 100, 80 / 112 * 100], THROW_FROM_LEFT = [-6, 40], FOE_THROW_FROM = [106, 8];
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
  // A shiny Pokémon sparkles as it comes out (FireRed's shiny animation).
  function sparkle(side) {
    if (!view[side] || !view[side].shiny) return;
    const sprite = el.sides[side].sprite, box = sprite.getBoundingClientRect(), field = el.field.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const s = document.createElement("span");
      s.className = "shiny-spark";
      s.textContent = "✦";
      const a = (i / 6) * Math.PI * 2;
      s.style.left = (box.left - field.left + box.width / 2 + Math.cos(a) * box.width * 0.3) + "px";
      s.style.top = (box.top - field.top + box.height * 0.55 + Math.sin(a) * box.height * 0.3) + "px";
      s.style.animationDelay = (i * 70) + "ms";
      el.field.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    }
  }

  async function sendOut(side, from, ball, delay) {
    const sprite = el.sides[side].sprite;
    sprite.classList.add("in-ball");   // hidden until the ball opens
    renderSide(side);
    el.sides[side].info.classList.add("hidden");
    if (delay) await wait(delay);
    sfx("se_ball_throw");
    await Promise.all([throwBall(side, from, ball), spriteReady(sprite)]);
    sfx("se_ball_trade");   // out it comes (FireRed's sound for the ball opening)
    const grow = sprite.animate([
      { transform: "scale(0.1)", filter: "brightness(0) invert(1)", opacity: 1 },
      { transform: "scale(1)", filter: "brightness(0) invert(1)", opacity: 1, offset: 0.55 },
      { transform: "scale(1)", filter: "none", opacity: 1 }], { duration: POP_MS, easing: "ease-out" });
    sprite.classList.remove("in-ball");
    cry(side);
    sparkle(side);
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
    hbStop();
    view = { p1: { species: null }, p2: { species: null } };
    el.ball.classList.add("hidden");
    renderSide("p1");
    renderSide("p2");
    await intro(cfg);
    if (!cfg.wild) {
      showBar("p2"); showBar("p1");
      await message(cfg.p2.name + " would like to battle!");
      hideBars();
    }
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
    hbStop();
    return { outcome, battle };
  }

  window.BattleScreen = { run, ballName };
})();
