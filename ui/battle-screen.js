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
//                    // (the Safari Zone, cfg.safari = { balls }: also "fled",
//                    // and "noballs" when the last Safari Ball missed;
//                    // result.battle.safari.balls is how many are left)
//   (cfg.victoryMusic: the song to play when you win, e.g. "mus_victory_wild")
//
// Double battles (FireRed's BATTLE_TYPE_DOUBLE): cfg.format = "doubles". Two
// Pokémon a side at FireRed's double battle positions, the smaller doubles
// healthboxes, "What will … do?" for each of yours in turn (B on the second
// goes back to the first), FireRed's target cursor for moves aimed at one
// Pokémon, and a replacement for each fainted slot at the end of the turn.
// Tag battles: cfg.p1.partner = { name, team } (with cfg.partnerTrainer, the
// partner's back picture); the partner's slot b is chosen by
// cfg.partnerAI(battle) (OpponentAI.choose(battle, "p1b") by default). Two
// opposing trainers: cfg.p2.partner = { name, team }, cfg.foeTrainer2 (their
// picture) and cfg.defeatText2, chosen by cfg.opponent2(battle) ("p2b").
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
    recharge: "{who} must recharge!", scared: "{who} is too scared to move!", flinch: "{who} flinched and couldn't move!",
    attract: "{who} is immobilized by love!", truant: "{who} is loafing around!",
    focuspunch: "{who} lost its focus and couldn't move!",
    throatchop: "The effects of Throat Chop prevent {who} from using certain moves!"
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
    slowstart: "{who} can't get it going!", minimize: null, defensecurl: null, stockpile: null,
    laserfocus: "{who} concentrated intensely!", shackled: "{who} can no longer escape!", throatchop: null,
    octolock: "{who} can no longer escape because of Octolock!", noretreat: "{who} can no longer escape because it used No Retreat!",
    tarshot: "{who} became weaker to fire!"
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
    substitute: "The substitute took damage for {whom}!", snatch: "{who} snatched the move!",
    psychicterrain: "{who} is protected by the Psychic Terrain!", speedswap: "{who} switched Speed with its target!",
    spectralthief: "{who} stole the target's boosted stats!", disguise: "Its disguise served it as a decoy!",
    battlebond: "{who} became fully charged due to its bond with its Trainer!",
    powerconstruct: "You sense the presence of many!", shieldsdown: null,
    queenlymajesty: "{who}'s Queenly Majesty blocked the move!", dazzling: "{who}'s Dazzling blocked the move!",
    courtchange: "{who} swapped the battle effects affecting each side of the field!",
    poltergeist: "{who} is about to be attacked by its item!", eeriespell: "It reduced the PP of {who}'s move!",
    jawlock: "Neither Pokémon can run away!", perishbody: "Both Pokémon will faint in three turns!",
    wanderingspirit: "{who} swapped Abilities with its target!", iceface: null, gulpmissile: null
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
    airlock: "The effects of the weather disappeared.", cloudnine: "The effects of the weather disappeared.",
    comatose: "{who} is drowsing!", neutralizinggas: "Neutralizing gas filled the area!", asone: "{who} has two Abilities!"
  };
  const SIDE_START = {
    stealthrock: "Pointed stones float in the air around {team}!",
    spikes: "Spikes were scattered around the feet of {team}!",
    toxicspikes: "Poison spikes were scattered around the feet of {team}!",
    stickyweb: "A sticky web spreads out beneath {team}'s feet!",
    tailwind: "The tailwind blew from behind {team}!",
    reflect: "Reflect raised {team}'s Defense!", lightscreen: "Light Screen raised {team}'s Sp. Def!",
    safeguard: "{Team} cloaked itself in a mystical veil!", mist: "{Team} became shrouded in mist!",
    luckychant: "Lucky Chant shielded {team} from critical hits!",
    auroraveil: "Aurora Veil made {team} stronger against physical and special moves!",
    gmaxwildfire: "{Team} were surrounded by fire!", gmaxvinelash: "{Team} got trapped with vines!",
    gmaxcannonade: "{Team} got caught in the vortex of water!", gmaxvolcalith: "{Team} became surrounded by rocks!",
    gmaxsteelsurge: "Sharp-pointed pieces of steel started floating around {team}!"
  };
  const FIELD_START = {
    grassyterrain: "Grass grew to cover the battlefield!", mistyterrain: "Mist swirled about the battlefield!",
    electricterrain: "An electric current runs across the battlefield!", gravity: "Gravity intensified!",
    psychicterrain: "The battlefield got weird!",
    trickroom: "The dimensions were twisted!", iondeluge: "A deluge of ions showers the battlefield!",
    magicroom: "It created a bizarre area in which Pokémon's held items lose their effects!",
    wonderroom: "It created a bizarre area in which Defense and Sp. Def stats are swapped!",
    watersport: "Fire's power was weakened!", mudsport: "Electricity's power was weakened!"
  };
  const FIELD_END = {
    grassyterrain: "The grass disappeared from the battlefield.", mistyterrain: "The mist disappeared from the battlefield.",
    electricterrain: "The electricity disappeared from the battlefield.", gravity: "Gravity returned to normal!",
    psychicterrain: "The weirdness disappeared from the battlefield!",
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
    // Keyed by position: "p1" / "p2" are slot a (the only one in singles),
    // "p1b" / "p2b" slot b of a double battle.
    sides: {
      p1: { sprite: $("#sprite-player") },
      p2: { sprite: $("#sprite-foe") }
    }
  };
  // Slot b's pictures: the foe's behind theirs in slot a, yours in front.
  {
    const mk = (cls) => Object.assign(document.createElement("img"), { className: "sprite " + cls + " slot-b hidden", alt: "" });
    el.sides.p2b = { sprite: mk("foe") };
    el.sides.p1b = { sprite: mk("player") };
    el.field.insertBefore(el.sides.p2b.sprite, el.sides.p2.sprite);
    el.sides.p1.sprite.after(el.sides.p1b.sprite);
  }
  const POSITIONS = ["p1", "p2", "p1b", "p2b"];

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
  // A double battle's smaller boxes (healthbox_doubles_*.png), at FireRed's
  // InitBattlerHealthboxCoords for each position (the sprite's centre less
  // 32, 16): yours at (159, 75) and (171, 100), the opponent's at (44, 19)
  // and (32, 44). Yours show the name, level and HP bar like the
  // opponent's (no HP numbers or EXP bar in a double battle), the status
  // icon over "HP" (tile 0x12).
  const dpBox = hbImg("healthbox-doubles-player"), dpFrame = hbImg("healthbox-doubles-player-frame");
  const doBox = hbImg("healthbox-doubles-opponent"), doFrame = hbImg("healthbox-doubles-opponent-frame");
  const HB_DOUBLES = {
    p1: { box: dpBox, frame: dpFrame, x: 127, y: 59, h: 32, slideFrom: 115, mine: true },
    p1b: { box: dpBox, frame: dpFrame, x: 139, y: 84, h: 32, slideFrom: 115, mine: true },
    p2: { box: doBox, frame: doFrame, x: 12, y: 3, h: 32, slideFrom: -115 },
    p2b: { box: doBox, frame: doFrame, x: 0, y: 28, h: 32, slideFrom: -115 }
  };
  let doublesLayout = false;
  const hbCfg = (pos) => (doublesLayout ? HB_DOUBLES[pos] : HB[pos]);
  // How a box is laid out: the singles player's (name at 16, HP numbers, EXP
  // bar) or the opponent's style (name at 8, the status over "HP"), which a
  // double battle's player boxes share with the name at 16.
  const hbStyle = (pos) => {
    const singlesPlayer = !doublesLayout && pos === "p1", mine = sideOf(pos) === "p1";
    return { singlesPlayer, foe: !singlesPlayer, nameX: mine ? 16 : 8, lvX: mine ? 72 : 64, barX: mine ? 48 : 40,
      status: singlesPlayer ? [16, 24] : mine ? [16, 16] : [8, 16] };
  };
  const hbBar = hbImg("healthbar"), hbElements = hbImg("healthbox-elements"), hbStatus = hbImg("status-icons");
  // In the Safari Zone your box is FireRed's Safari one (healthbox_safari):
  // "SAFARI BALLS" and how many are left (UpdateSafariBallsTextOnHealthbox,
  // UpdateLeftNoOfBallsTextOnHealthbox).
  const hbSafari = hbImg("healthbox-safari");
  // Mega Evolution, as pokeemerald-expansion shows it (tools/build-mega-icons.js,
  // src/battle_gimmick.c): a Mega Evolved Pokémon's box has the Mega symbol
  // where "Lv" was (CreateIndicatorSprite, UpdateLvlInHealthbox); while you
  // choose a move for a Pokémon that can Mega Evolve, the trigger slides out
  // from behind its box (15 pixels left, 1 a frame: SpriteCb_GimmickTrigger),
  // lit up while START has it on, and back in once you've chosen.
  const hbMega = hbImg("mega-indicator"), hbTrigger = hbImg("mega-trigger");
  let trigger = null;   // { pos, on, x (its centre less the box's), hide }
  function showTrigger(pos) {
    trigger = { pos, on: false, x: trigger && trigger.pos === pos ? trigger.x : -15, hide: false };
    hbStart();
  }
  function hideTrigger() { if (trigger) { trigger.hide = true; trigger.on = false; } }
  const HB_CREAM = [255, 255, 222], HB_TEXT = [65, 65, 65], HB_SHADOW = [222, 213, 180];
  const HB_MALE = [65, 205, 255], HB_FEMALE = [255, 156, 148];
  const HB_STATUS = { psn: 0, tox: 0, par: 1, slp: 2, frz: 3, brn: 4 };
  let hb = {}, hbRaf = 0, hbWaiters = [];
  function hbReset() {
    hb = {};
    for (const side of POSITIONS) {
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
  function safariLayer(b) {
    const key = "safari|" + b.data.balls;
    if (b.layer && b.layerKey === key) return b.layer;
    b.layerKey = key;
    const s = window.GbaMenus.Surface();
    s.text("SAFARI BALLS", 16, 3, HB_TEXT, HB_SHADOW, "small");
    const left = "Left: " + b.data.balls;
    s.text(left, 96 - s.textWidth(left, "small"), 19, HB_TEXT, HB_SHADOW, "small");
    const c = document.createElement("canvas");
    c.width = 128; c.height = 64;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    if (hbSafari.complete) g.drawImage(hbSafari, 0, 0);
    g.drawImage(s.canvas(), 0, 0);
    b.layer = c;
    return c;
  }
  function hbLayerFor(side) {
    const b = hb[side], d = b.data, cfg = hbCfg(side), st = hbStyle(side);
    if (b.data.safari) return safariLayer(b);
    const shownHp = b.hp < b.hpTo ? Math.floor(b.hp) : Math.ceil(b.hp);
    const key = [d.name, d.gender, d.level, d.status, d.caught, d.mega, shownHp, b.maxhp, doublesLayout].join("|");
    if (b.layer && b.layerKey === key) return b.layer;
    b.layerKey = key;
    const s = window.GbaMenus.Surface();
    // The windows FireRed prints into (filled cream, then rows 5-15 copied in).
    const win = st.singlesPlayer ? [[16, 5, 56, 11], [72, 5, 24, 11], [56, 21, 40, 11]]
      : [[st.nameX, 5, 56, 11], [st.lvX, 5, 24, 11]];
    win.forEach(([x, y, w, h]) => s.fill(x, y, w, h, HB_CREAM));
    // Name, then the gender symbol after it (FONT_SMALL at window (0, 3)).
    const nx = st.nameX;
    const w = s.text(d.name || "", nx, 3, HB_TEXT, HB_SHADOW, "small");
    if (d.gender === "M" || d.gender === "F") s.text(d.gender === "M" ? "♂" : "♀", nx + w, 3, d.gender === "M" ? HB_MALE : HB_FEMALE, HB_SHADOW, "small");
    // "Lv" and the level, right-aligned in 24 pixels (Mega Evolved, the
    // level alone, the Mega symbol before it).
    const lv = String(d.level || "");
    const lvW = s.textWidth("{LV}", "small"), lvAt = st.lvX + 5 * (3 - lv.length);
    s.text(d.mega ? lv : "{LV}" + lv, d.mega ? lvAt + lvW : lvAt, 3, HB_TEXT, HB_SHADOW, "small");
    // Your HP: "cur/" at (60, 21) and "max" at (80, 21), each right-aligned to 3.
    if (st.singlesPlayer) {
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
    if (d.mega && hbMega.complete) g.drawImage(hbMega, lvAt + lvW - 10, -1);
    // The status icon: yours left of the HP numbers, theirs over "HP".
    const stIcon = HB_STATUS[d.status];
    if (stIcon != null && hbStatus.complete) g.drawImage(hbStatus, 0, ((sideOf(side) === "p2" ? 5 : 0) + stIcon) * 8, 24, 8, st.status[0], st.status[1], 24, 8);
    b.layer = c;
    return c;
  }

  function drawHealthboxes() {
    const g = hbLayer.getContext("2d");
    g.clearRect(0, 0, 240, 112);
    g.imageSmoothingEnabled = false;
    // The Mega trigger, behind its box (32x32, centred 30 left of the box's
    // centre and 10 below it, 4 in a double battle; frame 1 when on).
    if (trigger && hb[trigger.pos].shown && hbTrigger.complete) {
      const b = hb[trigger.pos], cfg = hbCfg(trigger.pos);
      g.drawImage(hbTrigger, 0, trigger.on ? 32 : 0, 32, 32, cfg.x + 32 + trigger.x - 16, cfg.y + b.y2 + (doublesLayout ? 4 : 10), 32, 32);
    }
    for (const side of POSITIONS) {
      const b = hb[side], cfg = hbCfg(side);
      if (!cfg || !b.shown || !b.data.name) continue;
      const st = hbStyle(side), foe = st.foe;
      const ox = cfg.x + b.x2, oy = cfg.y + b.y2;
      g.drawImage(hbLayerFor(side), ox, oy);
      if (b.data.safari) continue;
      if (b.flash >= 0 && cfg.frame.complete) {
        // (Colour 6 blends toward RGB(20, 27, 31) and back, 2/16 a frame.)
        g.globalAlpha = (b.flash <= 8 ? b.flash : 16 - b.flash) * 2 / 16;
        g.drawImage(cfg.frame, ox, oy);
        g.globalAlpha = 1;
      }
      if (!hbBar.complete) continue;
      // The healthbar: (the caught ball,) "HP", then the bar's six tiles.
      const bx = ox + st.barX, by = oy + 16;
      const status = HB_STATUS[b.data.status] != null;
      if (!foe || !status) { hbTile(g, hbBar, 1, bx - 16, by); hbTile(g, hbBar, 2, bx - 8, by); }
      else hbTile(g, hbBar, 65, bx - 8, by);
      if (foe && b.data.caught && !status) hbTile(g, hbBar, 70, ox + 8, by);
      const px = hpPixels(b.hp, b.maxhp), base = px > 24 ? 3 : px > 9 ? 47 : 56;
      for (let i = 0; i < 6; i++) hbTile(g, hbBar, base + Math.max(0, Math.min(8, px - 8 * i)), bx + 8 * i, by);
      // Your EXP bar (64 pixels at 32, 32).
      if (st.singlesPlayer && hbElements.complete) {
        const e = Math.round(b.exp);
        for (let i = 0; i < 8; i++) hbTile(g, hbElements, 12 + Math.max(0, Math.min(8, e - 8 * i)), ox + 32 + 8 * i, oy + 32);
      }
    }
  }

  function tickHealthboxes() {
    if (trigger && !trigger.hide && trigger.x > -30) trigger.x--;
    else if (trigger && trigger.hide && ++trigger.x >= -15) trigger = null;
    for (const side of POSITIONS) {
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
      else if (b.bounce) {
        // DoBounceEffect: yours while you choose (7, 1); a move's target while
        // you aim it (15, 1: twice as fast).
        b.y2 = (b.bounceIdx === 64 ? 2 : b.bounceIdx <= 128 ? 1 : 0);
        b.bounceIdx = (b.bounceIdx + (b.bounce === "target" ? 15 : 7)) & 255;
      }
      else b.y2 = 0;
    }
    drawHealthboxes();
    const busy = POSITIONS.some((sd) => { const b = hb[sd]; return b.hp !== b.hpTo || b.exp !== b.expTo || b.flash >= 0 || b.x2; }) || !!(trigger && trigger.hide);
    if (!busy && hbWaiters.length) { const w = hbWaiters; hbWaiters = []; w.forEach((r) => r()); }
    hbRaf = requestAnimationFrame(tickHealthboxes);
  }
  // Resolves when the bars have stopped moving (and boxes sliding in).
  const hbSettled = () => new Promise((r) => hbWaiters.push(r));
  function hbStart() { if (!hbRaf) hbRaf = requestAnimationFrame(tickHealthboxes); }
  function hbStop() { cancelAnimationFrame(hbRaf); hbRaf = 0; hbWaiters.splice(0).forEach((r) => r()); hbReset(); trigger = null; drawHealthboxes(); }
  // Showing or hiding a box (what the old info boxes' classList did): shown,
  // it slides in.
  function hbShow(side, on) {
    const b = hb[side];
    if (on && !b.shown) b.x2 = hbCfg(side).slideFrom;
    b.shown = !!on;
  }
  // Your Safari box, sliding in as the battle starts; then the count of balls.
  function showSafariBox(balls) {
    hb.p1.data = { safari: true, name: "safari", balls };
    hbShow("p1", true);
    hbStart();
  }
  const hbInfo = (side) => ({
    classList: {
      add: (c) => { if (c === "hidden") hbShow(side, false); },
      remove: (c) => { if (c === "hidden") hbShow(side, true); },
      toggle: (c, on) => { if (c === "hidden") hbShow(side, !on); }
    }
  });
  for (const pos of POSITIONS) el.sides[pos].info = hbInfo(pos);

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
      if (foe) { g.translate(-8 + 128 - barOff, 36 + b.dy); g.scale(-1, 1); g.drawImage(barImg, 0, 0); }
      else g.drawImage(barImg, 120 + barOff, 92);
      g.restore();
      b.balls.forEach((f, i) => {
        const wait = foe ? (6 - i) * 7 + 10 : i * 7 + 10;
        const off = Math.max(0, 120 - Math.max(0, b.t - wait) * 12);
        const x = foe ? 26 + 10 * i - off : 156 + 10 * i + off;
        g.drawImage(ballsImg, f * 8, 0, 8, 8, x, foe ? 32 + b.dy : 88, 8, 8);
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
  // (In a double battle the foe's comes 24 pixels higher once the battle is
  // under way, at y 16: CreatePartyStatusSummarySprites.)
  function showBar(side, midBattle) {
    const frames = ballFrames(side);
    bars[side] = { balls: side === "p2" ? frames.slice().reverse() : frames, t: 0, fade: 0, leaving: false,
      dy: midBattle && battle.doubles && side === "p2" ? -24 : 0 };
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
  const GHOST_PIC = "assets/battle-interface/ghost.png";
  let cursor = 0;       // index of the next battle event to play
  let view = null;      // what the screen currently shows for each side

  const sideOf = (ident) => String(ident).slice(0, 2);
  const nameOf = (ident) => String(ident).replace(/^p\d[ab]?: /, "");
  const otherSide = (side) => (side === "p1" ? "p2" : "p1");
  // The screen position an engine identity stands in: "p1" / "p2" for slot a
  // (all of singles), "p1b" / "p2b" for slot b.
  const posOf = (ident) => { const m = /^(p\d)(b)?/.exec(String(ident)); return m ? m[1] + (m[2] ? "b" : "") : String(ident); };
  const slotOf = (pos) => (pos.length > 2 ? 1 : 0);
  const posAt = (side, slot) => side + (slot ? "b" : "");
  // The Pokémon standing across from `pos` (the one opposite, else the other foe).
  const foeView = (pos) => {
    const o = otherSide(sideOf(pos)), a = view[posAt(o, slotOf(pos))], b = view[posAt(o, 1 - slotOf(pos))];
    return a && a.species && !a.fainted ? a : b && b.species && !b.fainted ? b : a;
  };
  // A side's trainer for a Pokémon (tag battles: its own trainer).
  const trainerName = (side, teamIndex) => {
    const s = battle.sides[side], m = s.pokemon[teamIndex];
    return s.trainers && m && s.trainers[m.owner] ? s.trainers[m.owner] : s.name;
  };
  // The team set behind a team index (a tag side: the trainer's 3, then the partner's).
  const setOf = (side, teamIndex) => {
    const c = config[side], all = c.partner && battle.sides[side].tag ? (c.team || []).slice(0, 3).concat((c.partner.team || []).slice(0, 3)) : c.team;
    return all[teamIndex] || {};
  };
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
    const foe = battle.doubles && !/^p\d$/.test(ident) ? foeView(posOf(ident)) : view[otherSide(side)];
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
    const side = sideOf(id);
    // (Pokémon Tower's unidentified Ghost: FireRed's gGhostFrontPic.)
    if (id === "p2" && config && config.ghost) { if (sprite.getAttribute("src") !== GHOST_PIC) { sprite.src = GHOST_PIC; sprite.style.visibility = ""; } }
    else window.Screen.setSprite(sprite, v.species, v.form, side === "p1", v.shiny);
    placeSprite(sprite, v, side === "p1");
    sprite.alt = v.name;
    sprite.classList.toggle("hidden", !!v.inBall);
    sprite.classList.toggle("fainted", v.fainted);
    info.classList.toggle("hidden", v.fainted);

    // The box: a new Pokémon's shows its HP and EXP at once; after that the
    // bars move to what changed.
    const b = hb[id], mon = battle.sides[side].pokemon[v.teamIndex] || {};
    const key = v.teamIndex + ":" + v.species;
    b.data = {
      name: v.name, level: v.level, status: v.status,
      gender: /^Nidoran/.test(v.species) || (id === "p2" && config && config.ghost) ? "" : mon.gender,
      // (A wild Pokémon's box shows a ball if you've caught its kind before.)
      caught: side === "p2" && battle.wild && config.catchContext && config.catchContext.caughtBefore
        ? !!config.catchContext.caughtBefore(v.species) : false,
      mega: /-Mega(-|$)/.test(v.species || "")
    };
    b.maxhp = v.maxhp || 1;
    b.hpTo = v.hp;
    const expPx = v.exp == null ? 0 : Math.floor(v.exp * 64);
    if (b.key !== key) { b.key = key; b.hp = v.hp; b.exp = b.expTo = expPx; }
    else if (!hbStyle(id).singlesPlayer) b.exp = b.expTo = expPx;   // (no EXP bar to fill)
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
  // `side` is the user's position; `targets`, in a double battle, the
  // positions it aims at (the Pokémon opposite otherwise, as in singles).
  async function animateMove(side, name, targets) {
    const data = window.MOVES && window.MOVES[name];
    if (!data || !sceneOn()) return;
    const foeSide = posAt(otherSide(sideOf(side)), slotOf(side));
    const aims = targets && targets.length ? targets : [battle.doubles ? foeSide : (side === "p1" ? "p2" : "p1")];
    const user = el.sides[side].sprite;
    const color = TYPE_COLOR[data.type] || "#fff";
    const self = data.cat === "Status" && /^(self|allySide|allies|adjacentAllyOrSelf|all)$/.test(data.target);
    sfx(moveSound(name, data));
    if (data.cat === "Physical") {
      // A lunge at the target and back.
      const [dx, dy] = sideOf(side) === "p1" ? [14, -10] : [-14, 10];
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
    await Promise.all(aims.map(async (aim) => {
      const fx = document.createElement("div");
      fx.className = "move-fx";
      fx.style.setProperty("--fx", color);
      el.field.appendChild(fx);
      const [x1, y1] = centerOf(aim);
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
    }));
  }
  // Mega Evolution's animation, pokeemerald-expansion's
  // gBattleAnimGeneral_MegaEvolution (tools/build-mega-anim.js), frame for
  // frame at 60 a second: the Pokémon flashes yellow six times
  // (blend_color_cycle to 11/16 of RGB(31, 31, 11)) while three rounds of
  // specks fly in to it from round about (gMegaParticlesSpriteTemplate: 13
  // frames each, 3 apart) to SE_M_MEGA_KICK; then SE_M_SOLAR_BEAM and the
  // stone grows over it (1/8 to double size in 120 frames), turning white
  // 20 frames in as everything else does (80 and 48 frames); in the white it
  // cries and becomes its Mega Evolution, the white fades (48 frames), it
  // shakes (5 pixels, 14 frames), the Mega symbol grows on it, pulses and
  // shrinks away, and six purple puffs swirl up round it (AnimParticleInVortex).
  // `pos`: whose; `species`: what it becomes.
  const FRAME_MS = 1000 / 60;
  async function megaEvolution(pos, species) {
    const v = view[pos], sprite = el.sides[pos].sprite;
    const swap = () => { if (species) { v.species = species; v.form = ""; renderSide(pos); } };
    if (!sceneOn()) { swap(); return; }
    const frames = (n) => wait(n * FRAME_MS);
    // (In GBA pixels: the field is 240x112.)
    const [px, py] = centerOf(pos), cx = px * 2.4, cy = py * 1.12;
    const mirror = sideOf(pos) === "p1" ? 1 : -1;   // (SetAnimSpriteInitialXOffset)
    const piece = (file, w, h, cls) => {
      const d = document.createElement("div");
      d.className = "mega-fx" + (cls ? " " + cls : "");
      if (file) d.style.backgroundImage = "url(assets/battle-anims/" + file + ")";
      d.style.width = (w / 2.4) + "%";
      d.style.height = (h / 1.12) + "%";
      el.field.appendChild(d);
      return d;
    };
    const at = (x, y) => ({ left: (x / 2.4) + "%", top: (y / 1.12) + "%" });
    const all = [];

    // Yellow flashes and the specks.
    for (let i = 0; i < 3; i++) setTimeout(() => sfx("se_m_mega_kick"), i * 13 * FRAME_MS);
    const yellow = "sepia(1) saturate(4) hue-rotate(5deg) brightness(1.3)";
    all.push(sprite.animate([{ filter: "none" }, { filter: yellow }, { filter: "none" }],
      { duration: 22 * FRAME_MS, iterations: 6 }).finished);
    const SPECKS = [[40, -10], [-35, -10], [15, -40], [-10, -32], [25, -20], [-40, -20], [5, -40]];
    for (let round = 0; round < 3; round++) {
      for (const [dx, dy] of SPECKS) {
        const p = piece("mega-particles.png", 16, 16, "speck");
        all.push(p.animate([Object.assign(at(cx + dx * mirror, cy + dy), { transform: "translate(-50%, -50%) scale(1)" }),
          Object.assign(at(cx, cy), { transform: "translate(-50%, -50%) scale(" + (1 - 13 * 5 / 256) + ")" })],
          { duration: 13 * FRAME_MS, fill: "forwards" }).finished.then(() => p.remove()));
        await frames(3);
      }
    }
    await Promise.all(all.splice(0));

    // The stone, and everything turning white.
    sfx("se_m_solar_beam");
    const white = piece(null, 240, 112, "white");
    Object.assign(white.style, { left: "0", top: "0", transform: "none", opacity: 0 });
    const stone = piece("mega-stone.png", 64, 64), stoneWhite = piece("mega-stone-white.png", 64, 64);
    for (const st of [stone, stoneWhite]) {
      Object.assign(st.style, at(cx, cy));
      all.push(st.animate([{ transform: "translate(-50%, -50%) scale(0.125)" }, { transform: "translate(-50%, -50%) scale(2)" }],
        { duration: 120 * FRAME_MS, fill: "forwards" }).finished);
    }
    stoneWhite.style.opacity = 0;
    await frames(20);
    all.push(stoneWhite.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 80 * FRAME_MS, fill: "forwards" }).finished);
    all.push(white.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 48 * FRAME_MS, fill: "forwards" }).finished);
    await Promise.all(all.splice(0));
    stone.remove(); stoneWhite.remove();

    // In the white: its cry, and it's changed.
    swap();
    cry(pos);
    await spriteReady(sprite);
    all.push(white.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 48 * FRAME_MS, fill: "forwards" }).finished.then(() => white.remove()));
    const shake = [], gbaPx = el.field.clientWidth / 240;
    for (let i = 0; i < 14; i++) shake.push({ transform: "translateX(" + (i % 2 ? -5 : 5) * gbaPx + "px)" });
    shake.push({ transform: "translateX(0)" });
    all.push(sprite.animate(shake, { duration: 14 * FRAME_MS }).finished);
    // The symbol: 1/16 to about double in 15 frames, a pause, six pulses of
    // 1/16 either way over 4 frames, and down again in 15.
    const symbol = piece("mega-symbol.png", 32, 32);
    Object.assign(symbol.style, at(cx, cy));
    const sc = (k) => ({ transform: "translate(-50%, -50%) scale(" + (k / 256) + ")" });
    const kf = [sc(16), sc(496), sc(496)];
    for (let i = 0; i < 6; i++) kf.push(sc(i % 2 ? 496 : 432));
    kf.push(sc(16));
    const times = [0, 15, 17, 21, 25, 29, 33, 37, 41, 56];
    all.push(symbol.animate(kf.map((k, i) => Object.assign(k, { offset: times[i] / 56 })), { duration: 56 * FRAME_MS }).finished.then(() => symbol.remove()));
    await frames(2);
    // The puffs: [y, rise (1/256 pixel a frame), frames, sway step, sway].
    const PUFFS = [[12, 528, 30, 13, 50], [0, 480, 20, 16, -46], [1, 576, 20, 8, 42], [15, 400, 25, 11, -42], [12, 512, 25, 16, 46], [1, 464, 30, 15, -50]];
    for (const [y0, rise, n, step, sway] of PUFFS) {
      const puff = piece("mega-smoke.png", 32, 32, "puff");
      const kfs = [];
      for (let f = 0; f <= n; f++) {
        const x = cx + Math.sin((f * step & 255) / 256 * 2 * Math.PI) * sway, y = cy + y0 - (f * rise >> 8);
        kfs.push(Object.assign(at(x, y), { backgroundPositionY: (Math.min(3, Math.floor(f / 3)) * 100 / 3) + "%", offset: f / n }));
      }
      all.push(puff.animate(kfs, { duration: n * FRAME_MS, easing: "steps(" + n + ", end)" }).finished.then(() => puff.remove()));
      await frames(2);
    }
    await Promise.all(all.splice(0));
  }

  // Runs fn(frame) once a GBA frame (60 a second) until it returns false.
  function eachFrame(fn) {
    return new Promise((resolve) => {
      let f = 0, last = performance.now(), acc = 0;
      const step = (t) => {
        acc += t - last; last = t;
        while (acc >= FRAME_MS) { acc -= FRAME_MS; if (fn(f++) === false) { resolve(); return; } }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  // A picture from assets/battle-anims/ on the field, w x h GBA pixels, its
  // middle at GBA (x, y) (the field is 240x112), scaled and turned.
  function animPiece(file, w, h) {
    const d = document.createElement("div");
    d.className = "mega-fx";
    d.style.backgroundImage = "url(assets/battle-anims/" + file + ")";
    d.style.width = (w / 2.4) + "%";
    d.style.height = (h / 1.12) + "%";
    el.field.appendChild(d);
    d.place = (x, y, sx, sy, deg) => {
      d.style.left = (x / 2.4) + "%"; d.style.top = (y / 1.12) + "%";
      d.style.transform = "translate(-50%, -50%) rotate(" + (deg || 0) + "deg) scale(" + (sx == null ? 1 : sx) + ", " + (sy == null ? sx == null ? 1 : sx : sy) + ")";
    };
    return d;
  }
  const gbaCenter = (pos) => { const [x, y] = centerOf(pos); return [x * 2.4, y * 1.12]; };
  // AnimTask_ShakeMon: `amount` GBA pixels to the side and back, `times` times, `delay` frames apart.
  function shakeMon(pos, amount, times, delay) {
    const sprite = el.sides[pos].sprite, gbaPx = el.field.clientWidth / 240, kf = [];
    for (let i = 0; i < times; i++) kf.push({ transform: "translateX(" + (i % 2 ? 0 : amount * gbaPx) + "px)" });
    kf.push({ transform: "translateX(0)" });
    return sprite.animate(kf, { duration: times * (delay + 1) * FRAME_MS, easing: "steps(" + times + ", end)" }).finished;
  }

  // Fly (FireRed's Move_FLY). The first turn, FlySetUp: SE_M_FLY, and the
  // Pokémon becomes a ball of shadow (gFlyBallUpSpriteTemplate) that squashes
  // and stretches (sAffineAnim_FlyBallUp: from 1/16 wide, out to round in 6
  // frames, flattened by 1/8 a frame for 5, then thinner and taller for 10)
  // and, after 13 frames, shoots up faster and faster (336/256 of a pixel a
  // frame more each frame) off the top; the Pokémon is gone until it comes
  // down. The second, FlyUnleash: SE_M_DOUBLE_TEAM, the ball dives in from the
  // top corner behind it (turned: 70° yours, -56° a foe's) through the target
  // in 20 frames and on off the screen; as it arrives, a hit splat on the
  // target (gBasicHitSplatSpriteTemplate, 8 frames, at 12/16), the target
  // shakes (6 pixels, 8 times, every other frame) and SE_M_RAZOR_WIND.
  async function flyUp(pos) {
    const sprite = el.sides[pos].sprite;
    sprite.classList.add("flying");
    if (!sceneOn()) return;
    sfx("se_m_fly");
    const [x, y0] = gbaCenter(pos);
    const ball = animPiece("round-shadow.png", 64, 64);
    let sx = 16, sy = 256, y = y0, speed = 0;
    await eachFrame((f) => {
      if (f >= 1 && f <= 6) sx += 40;
      else if (f >= 7 && f <= 11) sy -= 32;
      else if (f >= 12 && f <= 21) { sx -= 16; sy += 32; }
      if (f >= 13) { speed += 336; y -= speed >> 8; }
      ball.place(x, y, sx / 256, sy / 256);
      return y >= -32;
    });
    ball.remove();
  }
  async function flyAttack(pos, aim, lands) {
    const sprite = el.sides[pos].sprite;
    if (!sceneOn() || !lands) { sprite.classList.remove("flying"); return; }
    sfx("se_m_double_team");
    const mine = sideOf(pos) === "p1";
    const [x0, y0] = mine ? [-32, -32] : [272, -32];
    const [x1, y1] = gbaCenter(aim);
    const ball = animPiece("round-shadow.png", 64, 64);
    const hits = [];
    await eachFrame((f) => {
      const x = x0 + (x1 - x0) * f / 20, y = y0 + (y1 - y0) * f / 20;
      ball.place(x, y, 1, 1, mine ? 70.3 : -56.25);
      if (f === 20) {
        const splat = animPiece("impact.png", 32, 32);
        splat.style.opacity = 0.75;
        splat.place(x1, y1);
        hits.push(wait(8 * FRAME_MS).then(() => splat.remove()));
        hits.push(shakeMon(aim, 6, 8, 1));
        sfx("se_m_razor_wind");
      }
      return f <= 20 || (x > -32 && x < 272 && y < 112 + 32);
    });
    ball.remove();
    // (Back at once, no fade.)
    sprite.style.transition = "none";
    sprite.classList.remove("flying");
    void sprite.offsetWidth;
    sprite.style.transition = "";
    await Promise.all(hits);
  }

  // Transform (FireRed's Move_TRANSFORM, AnimTask_TransformMon): SE_M_TELEPORT
  // (SE_M_MINIMIZE 48 frames on), the Pokémon goes to mosaic, one step more
  // every 3 frames up to 16-pixel blocks; it changes into the target's
  // picture; and the mosaic comes back down to nothing the same way.
  // `swap`: changes the picture (and waits for it).
  async function transformAnim(pos, swap) {
    const sprite = el.sides[pos].sprite;
    if (!sceneOn()) { await swap(); return; }
    sfx("se_m_teleport");
    setTimeout(() => sfx("se_m_minimize"), 48 * FRAME_MS);
    const f = el.field.getBoundingClientRect(), r = sprite.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.className = "mosaic-fx";
    Object.assign(canvas.style, { left: ((r.left - f.left) / f.width * 100) + "%", top: ((r.top - f.top) / f.height * 100) + "%",
      width: (r.width / f.width * 100) + "%", height: (r.height / f.height * 100) + "%" });
    el.field.appendChild(canvas);
    const draw = (level) => {
      const w = sprite.naturalWidth || 96, h = sprite.naturalHeight || 96;
      canvas.width = w; canvas.height = h;
      const g = canvas.getContext("2d");
      g.imageSmoothingEnabled = false;
      // (Blocks of level + 1 GBA pixels; the picture is 96 for the GBA's 64.)
      const block = Math.max(1, Math.round((level + 1) * w / 64));
      const small = document.createElement("canvas");
      small.width = Math.ceil(w / block); small.height = Math.ceil(h / block);
      const sg = small.getContext("2d");
      sg.imageSmoothingEnabled = false;
      sg.drawImage(sprite, 0, 0, small.width, small.height);
      g.drawImage(small, 0, 0, small.width * block, small.height * block);
    };
    draw(0);
    sprite.classList.add("mosaic-hidden");
    for (let level = 1; level <= 15; level++) { await wait(3 * FRAME_MS); draw(level); }
    await swap();
    for (let level = 15; level >= 0; level--) { draw(level); await wait(3 * FRAME_MS); }
    sprite.style.transition = "none";
    sprite.classList.remove("mosaic-hidden");
    void sprite.offsetWidth;
    sprite.style.transition = "";
    canvas.remove();
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
    const side = posOf(ident);
    const hurt = hp.hp < view[side].hp;
    Object.assign(view[side], hp);
    renderSide(side);
    if (hurt) { flash(side); if (sceneOn()) hb[side].shake = 21; }
    return true;
  }

  // Where your Pokémon `teamIndex` stands, if it's on the field.
  const fieldPos = (teamIndex) => ["p1", "p1b"].find((k) => view[k] && view[k].species && view[k].teamIndex === +teamIndex);
  // Updates the experience bar if `teamIndex` is the Pokémon on the field.
  function setExp(teamIndex, pct, level, hpStr) {
    const k = fieldPos(teamIndex);
    if (!k) return;
    const v = view[k];
    if (level != null) v.level = level;
    if (hpStr) Object.assign(v, parseHp(hpStr));
    v.exp = pct === "" ? null : +pct;
    renderSide(k);
  }

  // ---------- Event playback ----------

  // A double battle's move: the positions it aims at, from the "[spread] …"
  // list or its one target (null for none, e.g. the user itself).
  let lastAims = null;
  function moveAims(ev) {
    const list = /^\[spread\] (.*)$/.exec(ev[4] || "");
    const ids = list ? list[1].split(/,(?=p\d[ab]: )/) : /^p\d[ab]: /.test(ev[3] || "") ? [ev[3]] : [];
    const aims = ids.map(posOf).filter((k) => k !== posOf(ev[1]) && view[k] && view[k].species);
    return aims.length ? aims : null;
  }

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
    const pos = posOf(a);
    const v = view[pos];
    // (Dynamax ends when it faints or leaves the field: the picture goes back to size.)
    if ((type === "switch" || type === "drag" || type === "faint") && el.sides[pos]) el.sides[pos].sprite.classList.remove("dynamax");
    // (Up in the air from Fly until it comes down: back when it can't move, faints or leaves.)
    if ((type === "switch" || type === "drag" || type === "faint" || type === "cant") && el.sides[pos]) el.sides[pos].sprite.classList.remove("flying");

    switch (type) {
      case "switch":
      case "drag": {
        const m = /^(.*?), L(\d+)/.exec(b) || [];
        const hp = parseHp(c) || { hp: 0, maxhp: 0, status: "" };
        // A Pokémon still standing that's switched out goes back into its ball first.
        const prev = view[pos];
        const back = type === "switch" && prev && prev.species && !prev.fainted && prev.hp > 0
          ? { text: recallText(pos, prev), ball: setOf(side, prev.teamIndex).ball } : null;
        const withdraw = () => (back ? recall(pos, back.text, back.ball) : null);
        const set = setOf(side, +ev[5]);
        view[pos] = { name: nameOf(a), species: m[1] || nameOf(a), level: m[2] || "?",
          hp: hp.hp, maxhp: hp.maxhp, status: hp.status, fainted: false,
          exp: ev[4] === "" || ev[4] == null ? null : +ev[4], teamIndex: +ev[5],
          form: set.form || "", shiny: !!set.shiny };
        const ball = set.ball;
        if (battle.doubles) noteSwitchIn(pos);
        else if (side === "p1") foeHpAtSwitchIn = view.p2.species ? view.p2.hp : null;
        else foeHpAtSwitchIn = hp.hp;   // a new foe: count from its HP now
        // (Who sent it out: a tag battle's switch names its trainer.)
        const sender = ev[6] || trainerName(side, +ev[5]);
        // The foe's first Pokémon: their trainer steps aside, then throws it out.
        if (side === "p2" && foeTrainerOut) {
          foeTrainerOut = false;
          const text = battle.sides.p2.name + " sent out " + nameOf(a) + "!";
          return async () => { await foeTrainerSlide(true); await Promise.all([message(text), sendOut(pos, FOE_THROW_FROM, ball)]); };
        }
        // In the Safari Zone you stay out there yourself, with your box of Safari Balls.
        if (side === "p1" && battle.safari) {
          trainerOut = false;
          showSafariBox(battle.safari.balls);
          return null;
        }
        // The first Pokémon out: your trainer throws its Ball.
        if (side === "p1" && trainerOut) {
          trainerOut = false;
          return async () => { await Promise.all([throwOut(), sendOut(pos, THROW_FROM_HAND, ball, 210)]); await message("Go! " + nameOf(a) + "!"); };
        }
        if (type === "drag") { renderSide(pos); return fill("{who} was dragged out!", a); }
        // Later switch-ins: thrown in from off-screen, as in FireRed. (A tag
        // partner's: "Leaf sent out …!")
        if (side === "p1") {
          const text = pos === "p1b" && battle.sides.p1.tag ? sender + " sent out " + nameOf(a) + "!" : "Go! " + nameOf(a) + "!";
          return async () => { await withdraw(); await Promise.all([message(text), sendOut(pos, THROW_FROM_LEFT, ball)]); };
        }
        if (side === "p2" && !battle.wild && !foeAnnounced) {
          const text = (battle.doubles ? sender : battle.sides.p2.name) + " sent out " + nameOf(a) + "!";
          // After one of theirs faints, their party's balls show first.
          const fainted = prev && prev.species && (prev.fainted || prev.hp <= 0);
          return async () => {
            await withdraw();
            if (fainted) await showBar("p2", true);
            await Promise.all([message(text), sendOut(pos, FOE_THROW_FROM, ball).then(hideBars)]);
          };
        }
        renderSide(pos);
        if (side === "p2" && foeAnnounced) { foeAnnounced = false; return null; }   // the opening said so
        if (battle.wild) return "A wild " + nameOf(a) + " appeared!";
        return battle.sides.p2.name + " sent out " + nameOf(a) + "!";
      }
      case "detailschange":
        v.species = b;
        v.form = "";
        renderSide(pos);
        return null;
      case "move": {
        hitNotes = []; hitSound = null;
        const text = fill("{who} used " + b + "!", a);
        // (Magnitude's animation waits for "Magnitude n!"; a move that misses,
        // fails or is blocked has none, as in FireRed.)
        const lands = moveLands();
        // In a double battle it aims at its target, or each of a spread
        // move's ("[spread] p2a: X,p2b: Y").
        lastAims = battle.doubles ? moveAims(ev) : null;
        const aims = lastAims;
        // (Fly: FireRed's own animation for each of its two turns.)
        if (b === "Fly") {
          const setUp = battle.events[cursor] && battle.events[cursor][0] === "-prepare" && battle.events[cursor][1] === a;
          const aim = (aims && aims[0]) || posAt(otherSide(side), slotOf(pos));
          return async () => { await message(text, 400); if (setUp) await flyUp(pos); else await flyAttack(pos, battle.doubles ? aim : otherSide(side), lands); };
        }
        if (b === "Transform") return async () => { el.sides[pos].sprite.classList.remove("flying"); await message(text, 400); };
        el.sides[pos].sprite.classList.remove("flying");
        return async () => { await message(text, 400); if (b !== "Magnitude" && lands) await animateMove(pos, b, aims); };
      }
      case "-magnitude": {
        const lands = moveLands(), aims = lastAims;
        return async () => { await message("Magnitude " + b + "!", 400); if (lands) await animateMove(pos, "Magnitude", aims); };
      }
      case "-notarget": return "But there was no target…";
      case "-withdraw": return null;   // (the switch that follows calls it back)
      case "-trainerout":   // [side, trainer, slot]: a tag team's trainer with no one left
        return b + " is out of\nusable Pokémon!";
      case "swap": {   // Ally Switch: [old identity, new slot]; both come one after the other
        if (+b !== 1) return null;
        const other = posAt(side, 1), mine = posAt(side, 0);
        const t = view[mine];
        view[mine] = view[other]; view[other] = t;
        for (const k of [mine, other]) { hb[k].key = null; hb[k].layer = null; renderSide(k); }
        return fill("{who} and " + label(side, (view[mine] && view[mine].name) || "its ally") + " switched places!", a);
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
        let tpl = c ? lookup(HEAL_FROM, effectId(c), "{who} restored HP using its " + effectName(c) + "!") : HEAL_FROM.heal;
        // (A double battle's drain: the one the move hit.)
        const hit = battle.doubles && effectId(c) === "drain" && lastAims && view[lastAims[0]];
        if (hit && tpl) tpl = tpl.replace("{foe}", capitalize(label(sideOf(lastAims[0]), hit.name)));
        const msg = fill(tpl, a);
        return async () => { if (changed) await hbSettled(); if (msg) await message(msg); };
      }
      case "-sethp": // Pain Split: [user, userHp, target, targetHp]
        setHp(a, b);
        setHp(c, ev[4]);
        return async () => { await hbSettled(); await message("The battlers shared their pain!"); };
      case "faint":
        cry(pos, { faint: true });
        setTimeout(() => sfx("se_faint"), 300);
        // The foe's last Pokémon down: the victory theme (over the Exp. messages).
        if (side === "p2" && config.victoryMusic && window.GameAudio && battle.sides.p2.pokemon.every((m) => m.fainted)) {
          window.GameAudio.music(config.victoryMusic);
        }
        v.fainted = true;
        v.hp = 0;
        renderSide(pos);
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
        renderSide(pos);
        return fill(lookup(STATUS_START, b, "{who} was afflicted by " + b + "!"), a);
      case "-curestatus":
        v.status = "";
        renderSide(pos);
        return fill(lookup(STATUS_CURE, b, "{who} was cured!"), a);
      case "-boost":
      case "-unboost": {
        const stat = STAT_NAMES[b] || b;
        const big = (+c || 1) > 1;
        const text = type === "-boost" ? fill("{who}'s " + stat + (big ? " rose sharply!" : " rose!"), a)
          : fill("{who}'s " + stat + (big ? " harshly fell!" : " fell!"), a);
        return async () => { await animateStat(pos, type === "-boost"); await message(text); };
      }
      case "-setboost": return fill("{who} cut its own HP and maximized its " + (STAT_NAMES[b] || b) + "!", a);
      case "-clearallboost": return "All stat changes were eliminated!";
      case "-clearboost": return fill("{who}'s stat changes were removed!", a);
      case "cant": return fill(lookup(CANT, effectId(b), "{who} can't move!"), a);
      case "-start": {
        const id = effectId(b);
        const perish = /^perish(\d)$/.exec(id);
        if (perish) return fill("{who}'s perish count fell to " + perish[1] + ".", a);
        const stock = /^stockpile(\d)$/.exec(id);
        if (stock) return fill("{who} stockpiled " + stock[1] + "!", a);
        if (id === "disable" && c) return fill("{who}'s " + c + " was disabled!", a);
        return fill(lookup(VOLATILE_START, id, null), a);
      }
      case "-end": return fill(lookup(VOLATILE_END, effectId(b), null), a);
      case "-activate":
        if (effectId(b) === "naturepower") return "Nature Power turned into " + c + "!";
        return fill(lookup(ACTIVATE, effectId(b), "{who}'s " + effectName(b) + " activated!"), a);
      case "-prepare": return fill(lookup(PREPARE, effectId(b), "{who} is getting ready to use " + b + "!"), a);
      case "-singleturn": {
        const id = effectId(b);
        if (id === "focuspunch") return fill("{who} is tightening its focus!", a);
        if (id === "beakblast") return fill("{who} started heating up its beak!", a);
        if (id === "shelltrap") return fill("{who} set a shell trap!", a);
        return null;
      }
      // (Gen 7: a forme an Ability brought about, Burn Up, Core Enforcer.)
      case "-text": case "-formechange": return fill(b, a);
      case "-endability": return fill("{who}'s Ability was suppressed!", a);
      case "-ability": return fill(lookup(ABILITY, effectId(b), "{who}'s " + b + "!"), a);
      case "-mega": {
        // pokeemerald-expansion's BattleScript_MegaEvolution: "…'s Charizardite X
        // is reacting to …'s Mega Ring!", its animation (the picture changes
        // in the white), then "… has Mega Evolved into Mega Charizard X!" (the
        // Mega Evolution its stone names).
        const into = /into (Mega [^.]+)\./.exec(((window.ITEMS || {})[c] || {}).effect || "");
        const change = battle.events.slice(cursor).find((e) => e[0] === "detailschange" && e[1] === a);
        const trainer = battle.sides[side].name;
        return async () => {
          await message(fill("{who}'s " + ballName(c) + " is reacting to " + trainer + "'s Mega Ring!", a));
          await megaEvolution(pos, change && change[2]);
          await message(fill("{who} has Mega Evolved into " + (into ? into[1] : "Mega " + b) + "!", a));
        };
      }
      // Ultra Burst (Ultra Sun and Moon): the light, the change, its true power.
      case "-burst": {
        const change = battle.events.slice(cursor).find((e) => e[0] === "detailschange" && e[1] === a);
        return async () => {
          await message(fill("Bright light is about to burst out of {who}!", a));
          await megaEvolution(pos, change && change[2]);
          await message(fill("{who} regained its true power through Ultra Burst!", a));
        };
      }
      // Dynamax (Sword and Shield): the picture grows, red-lit, for three turns.
      case "-dynamax": {
        const verb = b === "Gmax" ? "Gigantamaxed" : b === "Eternamax" ? "Eternamaxed" : "Dynamaxed";
        return async () => {
          await message(fill("{who} " + verb + "!", a));
          el.sides[pos].sprite.classList.add("dynamax");
        };
      }
      case "-dynamaxhp": setHp(a, b); return null;
      case "-dynamaxend":
        el.sides[pos].sprite.classList.remove("dynamax");
        setHp(a, b);
        return fill("{who} returned to its normal size!", a);
      // Z-Moves (Sun and Moon).
      case "-zpower": return fill("{who} surrounded itself with its Z-Power!", a);
      case "-zbroken": return fill("{who} couldn't fully protect itself and got hurt!", a);
      case "-clearnegativeboost": return fill("{who} returned its decreased stats to normal using its Z-Power!", a);
      // Transform (and Imposter): the mosaic, the target's picture, then the words.
      case "-transform": {
        const t = view[posOf(b)] || {}, text = fill("{who} transformed into " + nameOf(b) + "!", a);
        return async () => {
          await transformAnim(pos, async () => {
            v.species = t.species; v.form = t.form || "";
            renderSide(pos);
            await spriteReady(el.sides[pos].sprite);
          });
          await message(text);
        };
      }
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
          const k = fieldPos(c);
          if (ev[5] !== "share" && k && hb[k].exp !== hb[k].expTo) { sfx("se_exp"); await hbSettled(); }
        };
      case "-expshare":
        return "The rest of your team gained Exp. Points thanks to the Exp. Share!";
      case "-levelup":   // [ident, level, hp, teamIndex, progress]
        // The full bar: the box's frame flashes (SE_EXP_MAX), the box shows the
        // new level and HP and an empty bar; "… grew to Lv. …!", then the
        // bar fills with what's left.
        return async () => {
          const k = fieldPos(ev[4]), onField = !!k, box = k ? hb[k] : null;
          if (onField) { sfx("se_exp_max"); box.flash = 0; await hbSettled(); }
          setExp(ev[4], 0, b, c);
          if (onField) { box.hp = box.hpTo; box.exp = box.expTo = 0; box.expDelay = 0; }
          const jingle = window.GameAudio ? window.GameAudio.fanfare("mus_level_up") : null;
          await message(teamName(ev[4]) + " grew to Lv. " + b + "!");
          await jingle;
          setExp(ev[4], ev[5], b, c);
          if (onField && box.exp !== box.expTo) { sfx("se_exp"); await hbSettled(); }
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

      // ----- Pokémon Tower's Ghost -----
      case "-ghostgetout": return "Ghost: Get out…… Get out……";
      case "-ghostdodge":   // [side, ball]
        return async () => {
          await message("You threw a " + ballName(b) + "!", 700);
          sfx("se_ball_throw");
          await message("It dodged the thrown Ball!\nThis Pokémon can't be caught!");
        };

      // ----- Wild battles -----
      case "-ball":   // [side, ball, target, shakes, "caught"|"", (Safari Balls left)]
        return async () => {
          if (ev[6] != null) showSafariBox(+ev[6]);
          // (The old man throws his: frames 1, 2, 3, back to 0, 24/9/24/9 frames.)
          if (config.oldMan) {
            await message("The old man used\n" + ballName(b) + "!", 700);
            const t = trainerEl();
            (async () => { for (const [f, n] of [[1, 24], [2, 9], [3, 24], [0, 9]]) { t.style.backgroundPositionY = (f * 100 / 3) + "%"; await wait(n * 1000 / 60); } })();
          } else await message("You threw a " + ballName(b) + "!", 700);
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
          if ([side, side + "b"].some((k) => view[k] && view[k].species && view[k].teamIndex === index)) setHp(c, ev[5]);
          const name = battle.sides[side].pokemon[index].name;
          if (ev[9]) await message(name + " was revived!");
          if (+ev[6] > 0) await message(name + "'s HP was restored by " + ev[6] + " point" + (+ev[6] === 1 ? "" : "s") + ".");
          if (ev[7]) await message(fill(lookup(STATUS_CURE, ev[7], "{who} was cured!"), c));
          if (ev[8]) await message(fill("{who} snapped out of its confusion!", c));
          if (+ev[10] > 0) await message(name + "'s PP was restored.");
        };
      // ----- The Safari Zone (FireRed's battle_message.c) -----
      case "-safaribait":
        return battle.sides.p1.name + " threw some Bait\nat the " + nameOf(a) + "!";
      case "-safarirock":
        return async () => {
          await message(battle.sides.p1.name + " threw a Rock\nat the " + nameOf(a) + "!", 400);
          sfx("se_m_rock_throw");
          flash("p2");
          await wait(300);
        };
      case "-safariwatch":
        return b === "angry" ? nameOf(a) + " is angry!" : b === "eating" ? nameOf(a) + " is eating!"
          : nameOf(a) + " is watching\ncarefully!";
      case "-safarifled":
        return async () => {
          sfx("se_flee");
          el.sides.p2.sprite.classList.add("hidden");
          el.sides.p2.info.classList.add("hidden");
          await message("Wild " + nameOf(a) + " fled!");
        };
      case "-safariout":
        return async () => {
          sfx("se_ding_dong");
          await message("Announcer: You're out of\nSafari Balls! Game over!");
        };
      case "-run": sfx("se_flee"); return "Got away safely!";
      case "-runfail": return "You couldn't get away!";

      case "win":
        if (a !== battle.sides.p1.name) return null; // the game layer handles losing
        // (Two trainers: "You defeated … and …!")
        return battle.wild ? null : "You defeated " + (battle.sides.p2.trainers || [battle.sides.p2.name]).join(" and ") + "!";
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
      if (doublesOpening && events[cursor][0] === "switch") { await playDoublesOpening(); continue; }
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
  // SUMMARY / CANCEL (cfg.summary shows its Summary screen as it is now in
  // battle). One that's fainted or already out says so; B goes back unless a
  // Pokémon has to be sent out.
  // FireRed's order on the party screen in battle (gBattlePartyCurrentOrder):
  // whoever's in battle comes first (in a double battle, both, by slot), and
  // the one sent in takes the place of the one it replaced. Team indexes, in
  // that order (your own Pokémon only, in a tag battle).
  let partyOrder = null;
  function battleOrder() {
    const side = battle.sides.p1;
    const mine = side.pokemon.map((m, i) => i).filter((i) => !side.tag || side.pokemon[i].owner === 0);
    if (!partyOrder || partyOrder.length !== mine.length) partyOrder = mine.slice();
    side.actives.forEach((m, k) => {
      const idx = m ? side.pokemon.indexOf(m) : -1, at = partyOrder.indexOf(idx);
      if (at < 0 || k >= partyOrder.length || at === k) return;
      [partyOrder[k], partyOrder[at]] = [partyOrder[at], partyOrder[k]];
    });
    return partyOrder;
  }

  async function chooseSwitch(req, canCancel, taken) {
    // (A tag battle: only your own Pokémon; in battle order.)
    const own = req.team.filter((p) => p.mine !== false);
    const team = battleOrder().map((i) => own.find((p) => p.index === i)).filter(Boolean)
      .concat(own.filter((p) => !battleOrder().includes(p.index)));
    const mons = team.map((p) => ({
      name: p.name, icon: window.Screen.iconUrl(p.species), level: p.level, gender: p.gender,
      hp: p.hp, maxhp: p.maxhp, status: p.status, item: !!p.item
    }));
    let cursor = 0;
    for (;;) {
      say("");
      clearMenu();
      const frame = window.GameOptions ? window.GameOptions.get().frame : 0;
      const r = await window.PartyMenu.open({ mons, cursor, frame, canCancel,
        actions: () => [{ label: canCancel ? "SHIFT" : "SEND OUT", value: "shift" }]
          .concat(config.summary ? [{ label: "SUMMARY", value: "summary" }] : [], [{ label: "CANCEL", value: "cancel" }]) });
      if (!r) { window.PartyMenu.close(); return null; }
      cursor = r.cursor;
      const p = team[r.slot];
      if (r.action === "summary") {
        window.PartyMenu.close();
        await config.summary(p.index, battle.sides.p1.pokemon);
        continue;
      }
      if (p.fainted || p.hp <= 0) { await message(p.name + " has no energy left to battle!"); continue; }
      if (p.active) { await message(p.name + " is already in battle!"); continue; }
      // (A double battle: the one your other Pokémon is switching to.)
      if (taken && taken.includes(p.index)) { await message(p.name + " has already been\nselected."); continue; }
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
  // (activeIndex: in a double battle, the team index of the Pokémon choosing,
  // for X items.)
  async function chooseBag(activeIndex) {
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
          // (Only the pockets with something usable in battle: Bag.BATTLE_POCKETS.)
          pockets: () => config.bagPockets().filter((p) => window.Bag.BATTLE_POCKETS.includes(p.name)),
          pocketName: battlePocket || "Items", female: !!config.bagFemale,
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

      // (A tag battle: your own Pokémon, the first three.)
      const mons = battle.sides.p1.pokemon.filter((m) => !battle.sides.p1.tag || m.owner === 0);
      // An X item: on the Pokémon in battle.
      if (window.ItemUse.effect(item).boost) {
        const active = activeIndex != null ? activeIndex : mons.indexOf(battle.sides.p1.active);
        if (window.ItemUse.canUse(battle.itemView(mons[active]), item, { inBattle: true })) return { type: "item", item, target: active };
        await message("It won't have any effect.");
        continue;
      }
      // Which Pokémon: FireRed's party screen ("Use on which POKéMON?"), in battle order.
      const order = battleOrder().filter((i) => i < mons.length);
      let target = null;
      for (;;) {
        say("");
        clearMenu();
        const r = await window.PartyMenu.open({ message: "Use on which {PKMN}?", cursor: target != null ? order.indexOf(target) : 0,
          frame: window.GameOptions ? window.GameOptions.get().frame : 0,
          mons: order.map((i) => mons[i]).map((m) => ({ name: m.name, icon: window.Screen.iconUrl(m.species), level: m.level, gender: m.gender,
            hp: m.fainted ? 0 : m.hp, maxhp: m.maxhp, status: m.status, item: !!m.item })) });
        if (!r) { target = null; break; }
        target = order[r.slot];
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
    if (battle.safari) return;   // (Safari Balls aren't in the Bag)
    const bag = config.bag;
    const id = choice.type === "ball" ? choice.ball : choice.type === "item" ? choice.item : null;
    if (!bag || !id) return;
    bag[id]--;
    if (bag[id] <= 0) delete bag[id];
  }
  // (Back in the bag: a double battle's choice taken back.)
  function returnItem(choice) {
    if (battle.safari || !choice) return;
    const bag = config.bag;
    const id = choice.type === "ball" ? choice.ball : choice.type === "item" ? choice.item : null;
    if (!bag || !id) return;
    bag[id] = (bag[id] || 0) + 1;
  }

  // FireRed's battle menus (ui/gba-menus.js) in the bottom panel: FIGHT /
  // BAG / POKéMON / RUN, then the moves with their PP and type. The menu's
  // cursor stays where it was; the moves' starts on the move this Pokémon
  // used last (once it has used one). B goes back from the moves.
  let lastMove = {};   // Pokémon name -> index of the move it used last, this battle
  const overlay = () => document.getElementById("overlay");
  const frame = () => (window.GameOptions ? window.GameOptions.get().frame : 0);
  // The Safari Zone's menu (FireRed's gText_SafariZoneMenu): BALL / BAIT /
  // ROCK / RUN, "What will … throw?".
  async function chooseSafariAction() {
    say("");
    clearMenu();
    const a = await window.GbaMenus.battleAction(overlay(), { name: battle.sides.p1.name, cursor: safariCursor, frame: frame(),
      labels: ["BALL", "BAIT", "ROCK", "RUN"], prompt: ["What will " + battle.sides.p1.name, "throw?"] });
    safariCursor = a.cursor;
    return { type: ["ball", "bait", "rock", "run"][a.cursor] };
  }
  let safariCursor = 0;
  // req: the singles request, or (a double battle) the slot's: { active,
  // switches, team, slot, doubles: { back, megaTaken, taken } }. Returns a
  // choice, or "back" (B on your second Pokémon: back to the first).
  async function chooseAction(req) {
    if (req.safari) return chooseSafariAction();
    const active = req.active, dbl = req.doubles, pos = dbl ? posAt("p1", req.slot) : "p1";
    // Locked into a move (Outrage, recharging): no menu, as in FireRed.
    if (active.forced) return { type: "move", move: 0 };
    // Each turn the ▶ starts on FIGHT; the moves' ▶ starts on the first move,
    // then on the one it used last.
    let actionCursor = 0;
    for (;;) {
      say("");
      clearMenu();
      // (Your box bobs while you choose: DoBounceEffect(BOUNCE_HEALTHBOX, 7, 1).)
      hb[pos].bounce = true; hb[pos].bounceIdx = 128;
      const a = await window.GbaMenus.battleAction(overlay(), { name: active.name, cursor: actionCursor, frame: frame(), canBack: !!(dbl && dbl.back) });
      hb[pos].bounce = false;
      actionCursor = a.cursor;
      if (a.action === "back") return "back";
      if (a.action === "fight") {
        if (active.struggle) { await message(active.name + " has no moves left!"); return { type: "move", move: "Struggle" }; }
        const slots = () => active.moves.map((m) => ({ name: m.name, type: m.type, pp: m.pp, maxpp: m.maxpp, index: m.index, disabled: m.disabled,
          target: m.target, targets: m.targets }));
        let moves = slots();
        const last = lastMove[active.name];
        let at = Math.max(0, moves.findIndex((m) => m.index === last));
        // SELECT swaps two moves, in the battle and on the Pokémon.
        const mon = battle.sides.p1.actives[dbl ? req.slot : 0];
        const swap = (a, b) => {
          battle.swapMoves("p1", a, b, dbl ? req.slot : 0);
          active.moves = battle.getMoveSlots(mon);
          if (dbl) for (const m of active.moves) m.targets = battle.targetLocs(mon, m.target);
          if (lastMove[active.name] === a) lastMove[active.name] = b;
          else if (lastMove[active.name] === b) lastMove[active.name] = a;
          return (moves = slots());
        };
        // Mega Evolution (with the Mega Ring, a Mega Stone held, once a battle;
        // in a double battle, one of your two only). Or, START the same way:
        // Ultra Burst or a Z-Move (with the Z-Ring), or Dynamax (with the
        // Dynamax Band); a Z-Move or Dynamax shows the moves it makes.
        const toggled = (on) => { if (trigger) trigger.on = on; };
        const kind = active.canMega && config.megaRing && !(dbl && dbl.megaTaken) ? "mega"
          : active.canUltraBurst && config.zRing ? "ultra"
          : active.zMoves && config.zRing && !(dbl && dbl.zTaken) ? "zmove"
          : active.canDynamax && config.dynamaxBand && !(dbl && dbl.dynamaxTaken) ? "dynamax" : null;
        const shown = kind === "zmove" ? active.zMoves : kind === "dynamax" ? active.maxMoves : null;
        // (Already Dynamaxed: its Max Moves, always.)
        const mega = kind ? { on: false, toggled, kind, names: shown ? (m) => shown[m.index] || null : null }
          : active.dynamaxed && active.maxMoves ? { on: true, fixed: true, names: (m) => active.maxMoves[m.index] || null } : null;
        if (mega && !mega.fixed) showTrigger(pos);
        // (A double battle: the Pokémon a spread or field move will hit
        // flash, PreviewDeterminativeMoveTargets.)
        const onCursor = dbl ? (c) => previewTargets(pos, moves[c]) : null;
        for (;;) {
          const pick = await window.GbaMenus.battleMoves(overlay(), { moves, cursor: at, frame: frame(), swap, mega, onCursor, keep: !!dbl });
          previewTargets(null);
          if (pick) at = pick.cursor;
          if (!pick) break;
          const m = moves[pick.index];
          if (!m.pp) { overlay().classList.add("hidden"); await message("There's no PP left for\nthis move!"); continue; }
          if (m.disabled) {
            overlay().classList.add("hidden");
            const dis = mon.volatiles.disable;
            await message(dis && m.name.toLowerCase().replace(/[^a-z0-9]/g, "") === dis.moveId ? active.name + "'s " + m.name + " is disabled!" : m.name + " can't be used right now!");
            continue;
          }
          let target;
          if (dbl) {
            target = await chooseTarget(pos, m);
            overlay().classList.add("hidden");
            if (target === null) continue;   // B: back to the moves
          }
          lastMove[active.name] = m.index;
          if (mega && mega.on && mega.kind === "zmove" && !active.zMoves[m.index]) {
            overlay().classList.add("hidden");
            await message("That move can't become a Z-Move!");
            continue;
          }
          const choice = { type: "move", move: m.index };
          if (mega && mega.on && mega.kind) choice[mega.kind] = true;
          if (target !== undefined) choice.target = target;
          hideTrigger();
          return choice;
        }
        hideTrigger();
        continue;
      }
      if (a.action === "bag") {
        if (!config.bag) { await message("Items can't be used now."); continue; }
        const c = await chooseBag(dbl ? active.teamIndex : undefined); if (c) return c; continue;
      }
      if (a.action === "pokemon") {
        if (!req.switches.length) { await message("There's no one else to switch in!"); continue; }
        const c = await chooseSwitch(req, true, dbl && dbl.taken); if (c) return c; continue;
      }
      if (a.action === "run") {
        if (!battle.wild) { await message("No! There's no running\nfrom a Trainer battle!"); continue; }
        if (!active.canRun) { await message("Can't escape!"); continue; }
        return { type: "run" };
      }
    }
  }

  // ---------- Aiming a move (a double battle) ----------
  //
  // FireRed's HandleInputChooseTarget: after a move that aims at one Pokémon,
  // the target's picture blinks (8 frames on, 8 off) and its box bobs;
  // left / up and right / down step round your left, your right, their right
  // and their left Pokémon (skipping any it can't aim at), A picks, B goes
  // back to the moves. The cursor starts on their left Pokémon (their right
  // if that one's gone), or on the user for a move that may aim at itself.
  // With only one Pokémon it could hit, it just goes.
  // Returns the engine's target location (1 / 2 foes, -1 / -2 yours),
  // undefined for a move that needs none, or null (B).
  const TARGET_ORDER = [-1, -2, 2, 1];
  const locPos = (userPos, loc) => posAt(loc > 0 ? otherSide(sideOf(userPos)) : sideOf(userPos), Math.abs(loc) - 1);
  async function chooseTarget(userPos, m) {
    const targets = m.targets || [];
    if (!targets.length) return undefined;
    if (targets.length === 1) return targets[0];
    const self = -(slotOf(userPos) + 1);
    let loc = targets.includes(self) && m.target === "adjacentAllyOrSelf" ? self : targets.includes(1) ? 1 : targets.includes(2) ? 2 : targets[0];
    let blink = null, blinking = null;
    const stop = () => {
      clearInterval(blink);
      if (blinking) blinking.style.visibility = "";
      blinking = null;
      for (const k of POSITIONS) hb[k].bounce = false;
    };
    const show = () => {
      stop();
      const p = locPos(userPos, loc);
      hb[p].bounce = "target"; hb[p].bounceIdx = 128;
      blinking = el.sides[p].sprite;
      let on = true;
      blink = setInterval(() => { on = !on; if (blinking) blinking.style.visibility = on ? "" : "hidden"; }, 8 * 1000 / 60);
    };
    show();
    const r = await window.GbaMenus.keys((k) => {
      if (k === "a") { window.GbaMenus.se(); return loc; }
      if (k === "b") { window.GbaMenus.se(); return null; }
      const step = k === "left" || k === "up" ? -1 : k === "right" || k === "down" ? 1 : 0;
      if (!step) return undefined;
      let i = TARGET_ORDER.indexOf(loc);
      for (let n = 0; n < 4; n++) {
        i = (i + step + 4) % 4;
        if (targets.includes(TARGET_ORDER[i])) break;
      }
      if (TARGET_ORDER[i] !== loc) { loc = TARGET_ORDER[i]; window.GbaMenus.se(); show(); }
      return undefined;
    });
    stop();
    return r;
  }

  // The Pokémon a move will hit, flashing toward white while the move menu's
  // cursor is on it (PreviewDeterminativeMoveTargets: spread moves, moves on
  // your side or the whole field; none for a move you aim). null stops it.
  const FIELD_WIDE = /^(Haze|Sandstorm|Perish Song|Rain Dance|Sunny Day|Hail|Mud Sport|Water Sport)$/;
  // (BeginNormalPaletteFade(targets, 8, 8, 0, white): from 8/16 white back
  // to none, a step every 9 frames, over and over. SVG filters do the blend.)
  let previewTimer = 0, previewLevel = 8;
  {
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    for (let k = 1; k <= 8; k++) {
      const f = document.createElementNS(ns, "filter"), cm = document.createElementNS(ns, "feColorMatrix");
      f.id = "fade-white-" + k;
      f.setAttribute("color-interpolation-filters", "sRGB");
      const a = 1 - k / 16, b = k / 16;
      cm.setAttribute("type", "matrix");
      cm.setAttribute("values", [a, 0, 0, 0, b, 0, a, 0, 0, b, 0, 0, a, 0, b, 0, 0, 0, 1, 0].join(" "));
      f.appendChild(cm);
      svg.appendChild(f);
    }
    el.field.appendChild(svg);
  }
  function previewTick() {
    previewLevel = previewLevel <= 0 ? 8 : previewLevel - 1;
    for (const k of POSITIONS) {
      const sp = el.sides[k].sprite;
      sp.style.filter = sp.classList.contains("preview") && previewLevel ? "url(#fade-white-" + previewLevel + ")" : "";
    }
  }
  function previewTargets(userPos, m) {
    for (const k of POSITIONS) { el.sides[k].sprite.classList.remove("preview"); el.sides[k].sprite.style.filter = ""; }
    clearInterval(previewTimer); previewTimer = 0;
    if (!userPos || !m) return;
    const own = sideOf(userPos), foe = otherSide(own), ally = posAt(own, 1 - slotOf(userPos));
    let hit = [];
    switch (m.target) {
      case "allAdjacentFoes": case "foeSide": hit = [foe, foe + "b"]; break;
      case "allAdjacent": hit = [foe, foe + "b", ally]; break;
      case "allySide": case "allyTeam": case "allies": hit = [userPos, ally]; break;
      case "adjacentAlly": hit = [ally]; break;
      case "all": hit = POSITIONS.slice(); break;
      case "self": hit = FIELD_WIDE.test(m.name) ? POSITIONS.slice() : [userPos]; break;
      default: hit = [];
    }
    for (const k of hit) if (view[k] && view[k].species && !view[k].fainted) el.sides[k].sprite.classList.add("preview");
    if (hit.length) { previewLevel = 9; previewTick(); previewTimer = setInterval(previewTick, 9 * 1000 / 60); }
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
      if (battle.doubles) { const r = await doublesStep(); if (r === "crashed") return r; continue; }
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

  // One decision in a double battle: yours (both slots, or in a tag battle
  // your one), then your partner's, the opponent's and their partner's.
  async function doublesStep() {
    const p1 = battle.getRequest("p1");
    if (p1 && (p1.phase === "move" || p1.phase === "switch") && p1.open.length) {
      const choices = p1.phase === "move" ? await chooseDoublesMoves(p1) : await chooseDoublesSwitches(p1);
      const r = choose("p1", choices);
      if (r.crashed) return "crashed";
      if (!r.ok) { choices.forEach((c) => c && returnItem(c)); await message(r.error); }
      return null;
    }
    const ais = [["p1b", config.partnerAI], ["p2", config.opponent], ["p2b", config.opponent2]];
    for (const [id, ai] of ais) {
      const req = battle.getRequest(id);
      if (!req || !(req.phase === "move" || req.phase === "switch") || !req.open.length) continue;
      let choice;
      try { choice = ai ? ai(battle) : window.OpponentAI.choose(battle, id); } catch (e) { console.error(e); return "crashed"; }
      if (choose(id, choice).crashed) return "crashed";
      return null;
    }
    await message("Something went wrong: neither side can act.");
    return "crashed";
  }

  // "What will … do?" for each of your Pokémon in turn (FireRed's
  // HandleInputChooseAction): B on the second goes back to the first, unless
  // the first is using an item (B_ACTION_CANCEL_PARTNER). Items leave the bag
  // as they're chosen (and come back if the turn is refused).
  async function chooseDoublesMoves(req) {
    const slots = req.open.slice(), choices = [null, null];
    let k = 0;
    while (k < slots.length) {
      const slot = slots[k], a = req.actives[slot];
      const earlier = slots.slice(0, k).map((s) => choices[s]);
      const prev = k > 0 ? choices[slots[k - 1]] : null;
      const canBack = k > 0 && !req.actives[slots[k - 1]].forced && !(prev && prev.type === "item");
      const taken = earlier.filter((c) => c && c.type === "switch").map((c) => c.index);
      const sub = { active: a, slot, team: req.team, switches: (a.switches || []).filter((i) => !taken.includes(i)),
        doubles: { back: canBack, megaTaken: earlier.some((c) => c && c.mega), zTaken: earlier.some((c) => c && c.zmove),
          dynamaxTaken: earlier.some((c) => c && c.dynamax), taken } };
      const c = await chooseAction(sub);
      if (c === "back") { k--; returnItem(choices[slots[k]]); choices[slots[k]] = null; continue; }
      choices[slot] = c;
      useUpItem(c);
      k++;
    }
    return choices;
  }

  // A fainted slot's replacement each (FireRed: the party screen for each in
  // turn; one already picked can't be picked again).
  async function chooseDoublesSwitches(req) {
    const choices = [null, null], taken = [];
    for (const slot of req.open) {
      const c = await chooseSwitch({ team: req.team, switches: req.switches.filter((i) => !taken.includes(i)) }, false, taken);
      choices[slot] = c;
      taken.push(c.index);
    }
    return choices;
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
  let doublesOpening = false;    // a double battle's first send-outs still to come
  // The opposing trainer's picture, where their Pokémon will stand. (A
  // second trainer's, cfg.foeTrainer2, beside them: id "foe-trainer-2".)
  function foeTrainerEl(second) {
    const id = second ? "foe-trainer-2" : "foe-trainer";
    let t = document.getElementById(id);
    if (!t) {
      t = document.createElement("img");
      t.id = id;
      t.className = "foe-trainer hidden";
      t.alt = "";
      el.field.insertBefore(t, el.sides.p2b.sprite);
    }
    return t;
  }
  const foeTrainerEls = () => [foeTrainerEl()].concat(config && config.foeTrainer2 ? [foeTrainerEl(true)] : []);
  // Slides the foe's picture off to the right (before their first Pokémon) or
  // back in (when you've won).
  async function foeTrainerSlide(out) {
    for (const t of foeTrainerEls()) {
      if (!out) { t.classList.add("leaving"); t.classList.remove("hidden"); void t.offsetWidth; }
      t.classList.toggle("leaving", out);
    }
    await wait(400);
    if (out) for (const t of foeTrainerEls()) t.classList.add("hidden");
  }
  function trainerEl(partner) {
    const id = partner ? "partner-back" : "trainer-back";
    let t = document.getElementById(id);
    if (!t) {
      t = document.createElement("div");
      t.id = id;
      t.className = "trainer-back hidden" + (partner ? " partner" : "");
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
    foeHpAt = {}; lastAims = null;
    playedEarly = new Set();
    doublesOpening = !!battle.doubles;
    setTerrain(cfg.terrain);
    const foeTrainer = foeTrainerEl(), foeTrainer2 = foeTrainerEl(true);
    for (const t of [foeTrainer, foeTrainer2]) { t.classList.add("hidden"); t.classList.remove("leaving"); }
    const trainer = trainerEl(), partner = trainerEl(true);
    // Each half moves by half the background (256 of its 512 pixels), so the
    // platforms start off-screen and plain ground shows where they will be.
    const shift = el.field.clientWidth * 256 / 240;
    const foeTerrain = el.field.querySelector(".terrain.foe"), playerTerrain = el.field.querySelector(".terrain.player");
    const movers = [];
    if (cfg.trainer) {
      trainer.style.backgroundImage = "url(assets/sprites/trainers/back/" + cfg.trainer + ".png)";
      trainer.style.backgroundPositionY = "0%";
      trainer.classList.toggle("four", !!cfg.oldMan);   // (his picture has 4 frames, not 5)
      trainer.classList.remove("hidden", "leaving");
      movers.push([trainer, shift]);
      trainerOut = true;
    } else trainer.classList.add("hidden");
    // A tag battle: your partner beside you (PlayerHandleDrawTrainerPic: you
    // at x 32, them at 90).
    if (battle.sides.p1.tag && cfg.partnerTrainer) {
      partner.style.backgroundImage = "url(assets/sprites/trainers/back/" + cfg.partnerTrainer + ".png)";
      partner.style.backgroundPositionY = "0%";
      partner.classList.remove("hidden", "leaving");
      movers.push([partner, shift]);
    } else partner.classList.add("hidden");
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
      // (Two trainers: the first at x 200, the second at 152, where their
      // Pokémon will stand, as Emerald places them.)
      const pics = [[foeTrainer, cfg.foeTrainer, cfg.foeTrainer2 ? 200 : 176]].concat(cfg.foeTrainer2 ? [[foeTrainer2, cfg.foeTrainer2, 152]] : []);
      for (const [t, pic, cx] of pics) {
        t.src = "assets/sprites/trainers/front/" + pic + ".png";
        await t.decode().catch(() => {});
        // A wider picture (two trainers) keeps the same scale and centre (x 176 of 240).
        const w = t.naturalWidth || 64;
        t.style.width = (w / 240 * 100) + "%";
        t.style.right = ((240 - cx - w / 2) / 240 * 100) + "%";
        t.classList.remove("hidden");
        movers.push([t, -shift]);
      }
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
      // (The old man's: "Wild … appeared!{PAUSE 127}", on by itself.)
      if (cfg.oldMan) await message("Wild " + mon.name + " appeared!", 127 * 1000 / 60);
      else await message("A wild " + mon.name + " appeared!");
      foeAnnounced = true;
    }
  }

  // A double battle's first send-outs, all at once (as FireRed's
  // BattleIntroOpponentSendsOutMonAnimation / BattleIntroPlayerSendsOutMonAnimation):
  // the trainer steps aside and throws both — "Twins Eli & Anne sent out
  // Clefairy and Jigglypuff!" (two trainers: each sends out their own, one
  // after the other); then you throw yours, "Go! Pikachu and Squirtle!" (a
  // tag partner: "Leaf sent out Pikachu! Go! Squirtle!").
  async function playDoublesOpening() {
    const events = battle.events, evs = [];
    while (cursor < events.length && (events[cursor][0] === "switch" || playedEarly.has(cursor))) {
      if (!playedEarly.has(cursor)) evs.push(events[cursor]);
      cursor++;
    }
    doublesOpening = false;
    const out = { p1: [], p2: [] };
    for (const ev of evs) {
      const pos = posOf(ev[1]), side = sideOf(pos);
      const m = /^(.*?), L(\d+)/.exec(ev[2]) || [];
      const hp = parseHp(ev[3]) || { hp: 0, maxhp: 0, status: "" };
      const set = setOf(side, +ev[5]);
      view[pos] = { name: nameOf(ev[1]), species: m[1] || nameOf(ev[1]), level: m[2] || "?",
        hp: hp.hp, maxhp: hp.maxhp, status: hp.status, fainted: false,
        exp: ev[4] === "" || ev[4] == null ? null : +ev[4], teamIndex: +ev[5], form: set.form || "", shiny: !!set.shiny };
      out[side].push({ pos, name: nameOf(ev[1]), ball: set.ball, sender: ev[6] || trainerName(side, +ev[5]) });
    }
    for (const k of ["p1", "p1b"]) if (view[k].species) noteSwitchIn(k);
    // Theirs.
    const foes = out.p2;
    if (foes.length) {
      if (foeTrainerOut) { foeTrainerOut = false; await foeTrainerSlide(true); }
      const two = battle.sides.p2.tag && foes.length > 1 && foes[0].sender !== foes[1].sender;
      if (two) {
        for (const f of foes) await Promise.all([message(f.sender + " sent out " + f.name + "!"), sendOut(f.pos, FOE_THROW_FROM, f.ball)]);
      } else {
        const text = foes[0].sender + " sent out " + foes.map((f) => f.name).join(" and ") + "!";
        await Promise.all([message(text)].concat(foes.map((f) => sendOut(f.pos, FOE_THROW_FROM, f.ball))));
      }
    }
    // Yours.
    const mine = out.p1;
    if (!mine.length) return;
    const tag = battle.sides.p1.tag;
    const own = mine.filter((f) => !tag || f.pos === "p1"), theirs = mine.filter((f) => tag && f.pos === "p1b");
    const text = (theirs.length ? theirs[0].sender + " sent out " + theirs[0].name + "!\n" : "") +
      (own.length ? "Go! " + own.map((f) => f.name).join(" and ") + "!" : "");
    const from = (f) => (tag ? (f.pos === "p1b" ? THROW_FROM_PARTNER : THROW_FROM_TAG) : THROW_FROM_HAND);
    if (trainerOut) {
      trainerOut = false;
      const throws = [throwOut()].concat(tag && config.partnerTrainer ? [throwOut(trainerEl(true))] : []);
      await Promise.all(throws.concat(mine.map((f) => sendOut(f.pos, from(f), f.ball, 210))));
      await message(text);
    } else {
      await Promise.all([message(text)].concat(mine.map((f) => sendOut(f.pos, THROW_FROM_LEFT, f.ball))));
    }
  }

  // ---------- Poké Ball throws ----------
  //
  // A ball arcs from `from` (field %, x and y) to where the Pokémon stands,
  // spinning; it pops open and the Pokémon grows out of it in a white flash.
  const BALL_LANDS = { p1: [21, 80], p2: [73.5, 50] };
  // A double battle's (sBattlerCoords: yours at x 32 and 90, y 80 and 88;
  // theirs at x 200 and 152, y 40 and 32), placed as the singles ones are.
  const BALL_LANDS_DOUBLES = { p1: [(50.4 - 40) / 2.4, 80], p1b: [(50.4 + 18) / 2.4, 80 + 8 / 1.12],
    p2: [200 / 2.4, 50], p2b: [152 / 2.4, 50 - 8 / 1.12] };
  const ballLand = (pos) => (battle && battle.doubles ? BALL_LANDS_DOUBLES : BALL_LANDS)[pos];
  // Your trainer's throw starts where FireRed's does (pokeball.c: the ball at
  // (32, 80) of the 240x112 scene), behind and left of where your Pokémon
  // comes out, so it flies forward.
  const THROW_FROM_HAND = [32 / 240 * 100, 80 / 112 * 100], THROW_FROM_LEFT = [-6, 40], FOE_THROW_FROM = [106, 8];
  // (A tag battle: from your hand and your partner's, 48 pixels left of the
  // usual and 10 right of it.)
  const THROW_FROM_TAG = [(32 - 48) / 240 * 100, 80 / 112 * 100], THROW_FROM_PARTNER = [(32 + 10) / 240 * 100, 80 / 112 * 100];
  const THROW_MS = 560, POP_MS = 420;

  // (One for each slot, so a double battle's two can fly at once.)
  function throwBallEl(pos) {
    const id = pos && pos.length > 2 ? "throw-ball-b" : "throw-ball";
    let b = document.getElementById(id);
    if (!b) {
      b = document.createElement("img");
      b.id = id;
      b.className = "throw-ball hidden";
      b.alt = "";
      el.field.appendChild(b);
    }
    return b;
  }
  const ballUrl = (ball) => "assets/sprites/items/ball/" + (ball || "poke-ball").replace(/-ball$/, "") + ".png";

  async function throwBall(side, from, ball) {
    const b = throwBallEl(side);
    b.src = ballUrl(ball);
    await b.decode().catch(() => {});
    const [x0, y0] = from, [x1, y1] = ballLand(side);
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
  // (A double battle: per position of yours, the foes' HP together.)
  let foeHpAt = {};
  const foesHp = () => ["p2", "p2b"].reduce((t, k) => (view[k] && view[k].species ? [t[0] + Math.max(0, view[k].hp), t[1] + view[k].maxhp] : t), [0, 0]);
  function noteSwitchIn(pos) {
    if (sideOf(pos) === "p2") { for (const k of ["p1", "p1b"]) foeHpAt[k] = foesHp()[0]; return; }
    foeHpAt[pos] = foesHp()[0];
  }
  function recallText(side, prev) {
    // (A tag battle: "Leaf withdrew …!" for your partner's; a trainer "withdrew" theirs.)
    if (sideOf(side) === "p2") return trainerName("p2", prev.teamIndex) + " withdrew " + prev.name + "!";
    if (battle.sides.p1.tag && side === "p1b") return trainerName("p1", prev.teamIndex) + " withdrew " + prev.name + "!";
    let lost;
    if (battle.doubles) {
      const [hp, max] = foesHp();
      lost = max && foeHpAt[side] != null ? (foeHpAt[side] - hp) * 100 / max : 0;
    } else {
      const foe = view.p2;
      lost = foe && foe.maxhp && foeHpAtSwitchIn != null ? (foeHpAtSwitchIn - foe.hp) * 100 / foe.maxhp : 0;
    }
    if (lost <= 0) return prev.name + ", that's enough!\nCome back!";
    if (lost < 30) return prev.name + ", come back!";
    if (lost < 70) return prev.name + ", OK!\nCome back!";
    return prev.name + ", good!\nCome back!";
  }

  // The ball appears where the Pokémon stands; the Pokémon turns red and
  // shrinks into it, and the ball goes.
  const RECALL_RED = "brightness(0.55) sepia(1) saturate(12) hue-rotate(-38deg)";
  async function recall(side, text, ball) {
    const sprite = el.sides[side].sprite, b = throwBallEl(side);
    const [x, y] = ballLand(side);
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
  const cry = (side, opts) => {
    if (side === "p2" && config && config.ghost) return;   // (the Ghost makes no sound)
    if (window.GameAudio && view[side] && view[side].species) window.GameAudio.cry(view[side].species, opts);
  };
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
  // (`t`: a tag partner's picture instead.)
  async function throwOut(t) {
    t = t || trainerEl();
    for (const f of [1, 2, 3, 4]) { t.style.backgroundPositionY = (f * 25) + "%"; await wait(70); }
    t.classList.add("leaving");
    await wait(350);
    t.classList.add("hidden");
  }

  // FireRed's catching demo in Viridian City (StartOldManTutorialBattle and
  // the old man's battle controller): a wild Lv. 5 Weedle, the old man from
  // behind with no Pokémon of his own; after 64 frames his ▶ goes to BAG and
  // after 64 more it opens; in his bag (a Potion and a Poké Ball, InitOldManBag)
  // the pockets turn every 102 frames to the Poké Balls, the ball is chosen
  // and used (Task_Bag_OldManTutorial); it shakes three times and the Weedle's
  // caught, but it's not his to keep. Nothing here needs a key.
  // cfg: { mon: { name, species, level, hp, maxhp }, terrain, bagFemale }
  async function oldManTutorial(cfg) {
    config = Object.assign({ oldMan: true, wild: true }, cfg);
    partyOrder = null;
    const mon = cfg.mon;
    battle = { wild: true, doubles: false, events: [], sides: { p1: { tag: false, pokemon: [] }, p2: { pokemon: [mon] } } };
    cursor = 0;
    hbStop();
    doublesLayout = false;
    el.field.classList.remove("doubles", "tag");
    view = { p1: { species: null }, p2: { species: null }, p1b: { species: null }, p2b: { species: null } };
    el.ball.classList.add("hidden");
    for (const k of POSITIONS) renderSide(k);
    await intro(Object.assign({}, config, { trainer: "old_man", p2: { team: [{}] } }));
    say("");
    clearMenu();
    const chose = window.GbaMenus.battleAction(overlay(), { name: "", prompt: ["What will the", "old man do?"], cursor: 0, frame: frame() });
    await window.GbaMenus.simulate([[64, "right"], [64, "a"]]);
    await chose;
    const item = (id) => ({ id, name: window.Bag.name(id), icon: window.Bag.sprite(id), qty: 1, desc: window.Bag.description(id) });
    const bag = window.BagScreen.open({
      fresh: true, female: !!cfg.bagFemale, frame: frame(),
      pockets: () => [{ name: "Items", items: [item("potion")] }, { name: "Key Items", items: [] }, { name: "Poké Balls", items: [item("poke-ball")] }],
      actions: () => [{ label: "Use", value: "use" }]
    });
    await window.GbaMenus.simulate([[102, "right"], [102, "right"], [102, "a"], [102, "a"]]);
    await bag;
    window.BagScreen.close();
    await applyEvent(["-ball", "p1", "poke-ball", "p2a: " + mon.name, "3", "caught"])();
    const GA = window.GameAudio;
    if (GA) GA.music("mus_caught");
    const jingle = GA ? GA.fanfare("mus_caught_intro") : null;
    await message("Gotcha! " + mon.name + " was caught!");
    await jingle;
    await wait(500);
    hbStop();
    el.ball.classList.add("hidden");
    trainerEl().classList.remove("four");
    config = null;
  }

  // Runs one battle to the end. See the header for `cfg`.
  async function run(cfg) {
    config = cfg;
    partyOrder = null;
    battle = new Battle(Object.assign({
      p1: cfg.p1, p2: cfg.p2, wild: !!cfg.wild, ghost: !!cfg.ghost, noCatch: !!cfg.noCatch, exp: !!cfg.exp, expShare: !!cfg.expShare, catchContext: cfg.catchContext,
      safari: cfg.safari
    }, cfg.format === "doubles" ? { format: "doubles" } : {}));
    safariCursor = 0;
    cursor = 0;
    hbStop();
    doublesLayout = !!battle.doubles;
    el.field.classList.toggle("doubles", !!battle.doubles);
    el.field.classList.toggle("tag", !!battle.sides.p1.tag);
    view = { p1: { species: null }, p2: { species: null }, p1b: { species: null }, p2b: { species: null } };
    el.ball.classList.add("hidden");
    for (const k of POSITIONS) renderSide(k);
    await intro(cfg);
    if (!cfg.wild) {
      showBar("p2"); showBar("p1");
      // (Two trainers: "… and … would like to battle!")
      const names = battle.sides.p2.tag ? battle.sides.p2.trainers : [cfg.p2.name];
      await message(names.join(" and ") + (names.length > 1 ? "\nwould like to battle!" : " would like to battle!"));
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
    else if (battle.safari && battle.safariOut) outcome = "noballs";
    else if (battle.safari && battle.fled) outcome = "fled";
    else if (battle.winner === "p1") {
      outcome = "won";
      // The trainer comes back out to say their piece.
      if (cfg.foeTrainer && !cfg.wild) {
        await foeTrainerSlide(false);
        for (const page of [].concat(cfg.defeatText || [], cfg.defeatText2 || [])) await message(page);
      }
    }
    else if (battle.winner === "p2") outcome = "lost";
    else outcome = "draw";
    hbStop();
    return { outcome, battle };
  }

  window.BattleScreen = { run, oldManTutorial, ballName };
})();
