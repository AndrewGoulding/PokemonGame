// (After it: Duel Monsters' duel engine and its cards' effects, window.DuelMonsters; see its own header below.)
//
// Who sits at the Game Corner's card tables (game/poker.js, game/blackjack.js,
// game/mahjong.js): trainers from around the game (window.WORLD_TRAINERS), by
// their class and name ("Gamer Hugo"), with their class's front picture as a
// portrait (assets/sprites/trainers/front/<pic>.png). Gym Leaders, the Elite
// Four, rivals, Team Rocket and pairs (Twins, Cool Couples...) stay away,
// mostly: now and then (STAR_CHANCE a seat) one of the stars sits down
// instead: a Gym Leader or one of the Elite Four, or whoever the game adds
// (TablePlayers.setStars: Red, Leaf and your rival).
//
//   TablePlayers.pick(3, rng, ["Gamer Hugo"])   // -> [{ name, className, first, pic, style, star, sprite }], none of `away`
//   TablePlayers.setStars([{ name, pic, style, sprite }])   // the game's own stars, besides the Leaders and Elite Four
//
// `style` is how they play poker (Poker.STYLES): loose for the gamblers'
// sorts (Gamers, Bikers, Rockers, Cue Balls, Burglars, Jugglers, Sailors),
// tight for the careful ones (Gentlemen, Ladies, Scientists, Engineers,
// Super Nerds, Aroma Ladies), and either for anyone else; each star their
// own (STAR_STYLES). `sprite`: a star's overworld sprite, for the card room.
(function () {
  const AWAY = /Leader|Elite Four|Champion|Rival|Team Rocket|Boss|Rocket|Executive|Pkmn Prof|Professor/i;
  const LOOSE = /Gamer|Biker|Rocker|Cue Ball|Burglar|Juggler|Sailor|Gambler/i;
  const TIGHT = /Gentleman|Lady|Scientist|Engineer|Super Nerd|Aroma/i;
  const STAR_CHANCE = 0.03;
  const STAR_STYLES = { Brock: "tight", Misty: "loose", "Lt. Surge": "loose", Erika: "tight", Koga: "tight", Sabrina: "steady", Blaine: "loose",
    Giovanni: "steady", Lorelei: "tight", Bruno: "loose", Agatha: "loose", Lance: "steady" };
  let pool = null, leaders = null, extra = [];
  // The Gym Leaders and the Elite Four, once each.
  function stars() {
    if (!leaders) {
      leaders = [];
      const seen = new Set();
      // (Kanto's: Johto's trainers, HGSS_*, and Hoenn's, EM_*, aren't at Kanto's tables.)
      for (const [id, t] of Object.entries(window.WORLD_TRAINERS || {})) {
        if (!t || !t.name || !t.pic || /^(HGSS_|EM_)/.test(id) || !/^(Leader|Elite Four)$/.test(t.className) || seen.has(t.name)) continue;
        seen.add(t.name);
        leaders.push({ name: t.className + " " + t.name, className: t.className, first: t.name, pic: t.pic, style: STAR_STYLES[t.name] || "steady",
          sprite: t.name.toLowerCase().replace(/[^a-z]+/g, "_"), star: true });
      }
    }
    return leaders.concat(extra);
  }
  function setStars(list) {
    extra = (list || []).map((p) => Object.assign({ className: p.name.split(" ").slice(0, -1).join(" "), first: p.name.split(" ").pop(), style: "steady" }, p, { star: true }));
  }
  function trainers() {
    if (pool) return pool;
    const seen = new Set();
    pool = [];
    for (const t of Object.values(window.WORLD_TRAINERS || {})) {
      if (!t || !t.name || !t.className || !t.pic || AWAY.test(t.className) || /&| and /.test(t.name) || /couple|twins|kin|sis_and|young_couple|jessie/i.test(t.pic)) continue;
      const name = t.className + " " + t.name;
      if (seen.has(name)) continue;
      seen.add(name);
      pool.push({ name, className: t.className, first: t.name, pic: t.pic,
        style: LOOSE.test(t.className) ? "loose" : TIGHT.test(t.className) ? "tight" : null });
    }
    return pool;
  }
  function pick(n, rng, away) {
    rng = rng || Math.random;
    const out = [], skip = new Set(away || []);
    const all = trainers().filter((t) => !skip.has(t.name)), starry = stars().filter((t) => !skip.has(t.name));
    for (let i = 0; i < n && all.length; i++) {
      // (A star, rarely.)
      if (starry.length && rng() < STAR_CHANCE) { out.push(Object.assign({}, starry.splice(Math.floor(rng() * starry.length), 1)[0])); continue; }
      const t = all.splice(Math.floor(rng() * all.length), 1)[0];
      out.push(Object.assign({}, t, { style: t.style || (rng() < 0.5 ? "steady" : rng() < 0.5 ? "loose" : "tight") }));
    }
    return out;
  }
  window.TablePlayers = { pick, trainers, stars, setStars, STAR_CHANCE };
})();

// ---------- Duel Monsters: the duel engine (Yu-Gi-Oh! The Eternal Duelist Soul's) ----------
//
// The Yu-Gi-Oh! realm's duels, run as The Eternal Duelist Soul runs them (its decompilation,
// github.com/CosmicScribe64/eds-decomp: src/duel_*.c, battle_phase*.c, summon_*.c, effect_*.c), headless. Its
// data model: each player's life points, hand, deck (its top first), graveyard, Fusion Deck and cards removed
// from play, and eleven zones (0-4 monsters, 5-9 Spells and Traps, 10 the Field Spell), each holding a card
// with its position and what affects it (its links: equips, continuous effects, stat changes). Its turn: the
// Draw Phase, the Standby Phase, Main Phase 1, the Battle Phase (none on the duel's first turn), Main Phase 2
// and the End Phase (the hand down to six). Its rules: a Normal Summon or Set a turn, with one Tribute for
// levels 5 and 6 and two for 7 and up; a Flip Summon or a change of position once a turn for a monster that
// wasn't summoned this turn; each monster attacks once; ATK against ATK, the loser destroyed and the
// difference dealt, ATK against DEF, the defender destroyed or the difference dealt back; a direct attack when
// the other side has no monsters. A duel is won at 0 LP, by the other player having no card to draw, with the
// five pieces of Exodia in the hand, or with Destiny Board spelt out.
//
// Card effects are EDS's handler table (include/effect_handlers.h): for each card, what it needs to be
// activated (prepare), its cost (chainA), its targets (chainB) and what it does (resolve), with its
// continuous effects on stats (card_stats.c's GetZoneCardStats) and its triggers; they're registered with
// DuelMonsters.define (game/duel-effects in this file's next section). Activations and the events of the duel
// (a summon, an attack, a card activated, ...) open a response window: each player in turn may answer with a
// Trap or a Quick-Play Spell that responds to it (EventResponse_Run), building a chain that resolves from its
// last link back (Chain_Resolve).
//
// Every decision is a controller's: the duel asks the player's controller (the screen's for you, the CPU's
// otherwise: DuelMonsters.ai) and waits for its answer.
//
//   const duel = DuelMonsters.create({
//     decks: [[cardNumber, ...], [...]],   // main deck and Fusion Deck together (GX Duel Academy's numbers)
//     controllers: [you, cpu],             // { choose(duel, request) -> answer (a Promise or not) }
//     names: ["You", "Yugi"], first: 0, rng: Math.random,
//     onEvent: (duel, event) => ...        // what happens, for the screen (a Promise to wait for, or not)
//   });
//   const { winner, reason } = await duel.run();
//
// A request: { type, player, prompt, options: [{ label, ... }], min, max, cancel }; the answer is the chosen
// option's index (or, with max > 1, an array of them; or -1 to cancel where `cancel` allows it).
(function () {
  "use strict";

  const LP = 8000, HAND = 5, HAND_LIMIT = 6, MZ = 5, SZ = 5;
  const card = (no) => window.YUGIOH_CARDS.cards[no];
  const CardInfo = {
    name: (no) => (card(no) || [""])[0],
    kind: (no) => (card(no) || [])[2],
    type: (no) => (card(no) || [])[3],
    attribute: (no) => (card(no) || [])[4],
    level: (no) => (card(no) || [])[5] || 0,
    atk: (no) => Math.max(0, (card(no) || [])[6] || 0),
    def: (no) => Math.max(0, (card(no) || [])[7] || 0),
    icon: (no) => (card(no) || [])[8] || 0,
    isMonster: (no) => ["normal", "effect", "fusion", "ritual"].includes((card(no) || [])[2]),
    isSpell: (no) => (card(no) || [])[2] === "spell",
    isTrap: (no) => (card(no) || [])[2] === "trap",
    isExtra: (no) => (card(no) || [])[2] === "fusion"
  };
  const ICON = { NORMAL: 0, COUNTER: 1, FIELD: 2, EQUIP: 3, CONTINUOUS: 4, QUICK: 5, RITUAL: 6 };

  // ---------- Effects ----------
  // EFFECTS[cardNumber]: { activate, flip, trigger, stats, ... } (the next section's DuelMonsters.define).
  const EFFECTS = {};
  const byName = {};
  function numberOf(name) {
    // (and the names GX gave the cards the TCG names otherwise: window.YUGIOH_CARDS.formerNames)
    if (!Object.keys(byName).length) {
      for (const [n, i] of Object.entries(window.YUGIOH_CARDS.formerNames || {})) byName[norm(n)] = i;
      window.YUGIOH_CARDS.cards.forEach((c, i) => { if (c) byName[norm(c[0])] = i; });
    }
    return byName[norm(name)] || 0;
  }
  function norm(s) { return String(s).toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function define(names, def) {
    for (const name of [].concat(names)) {
      const no = typeof name === "number" ? name : numberOf(name);
      if (no) EFFECTS[no] = Object.assign({}, EFFECTS[no], def);
    }
  }
  const effectOf = (no) => EFFECTS[no] || null;

  // ---------- A card, and where it is ----------
  let uidNext = 1;
  function newCard(no, owner) { return { uid: uidNext++, no, owner }; }
  // A zone: the card in it and its state there (struct DuelZone).
  function newZone(c, opts) {
    return Object.assign({ card: c, faceUp: true, defense: false, placedTurn: -1, changedTurn: -1, attacks: 0, links: [], counters: {},
      equippedTo: null, negated: false, data: {} }, opts);
  }

  // ---------- Summoning conditions ----------
  // A monster that must be summoned its own way, from its text (and the effects' specialOnly):
  //   - "Must first be Special Summoned ..." (and the old "can only be Special Summoned"), "Must be Fusion Summoned",
  //     and every Fusion and Ritual Monster: its own way (its procedure, byRule; the card its text names, resolving;
  //     a Fusion or Ritual Summon) always; from the Graveyard or removed from play by another effect only if it was
  //     properly summoned before (card.proper); a Fusion Monster from the Fusion Deck by others' effects too
  //     (Cyber-Stein, Metamorphosis), unless its text says it must be Fusion Summoned;
  //   - "Must be Special Summoned ..." without "first", "cannot be Special Summoned by other ways" or "except":
  //     its own way only.
  const RULES = {};
  function summonRule(no) {
    if (no in RULES) return RULES[no];
    const t = window.DuelMonsters.text ? window.DuelMonsters.text(no) : "", e = effectOf(no) || {}, kind = CardInfo.kind(no);
    const strict = /cannot be Special Summoned by other ways|cannot be Special Summoned except/i.test(t) || (/\bMust be Special Summoned\b/.test(t) && !/Must first be/.test(t));
    let r = null;
    if (kind === "fusion") r = { how: "fusion", strict, extraFree: !/Must (?:first )?be Fusion Summoned/.test(t) };
    else if (kind === "ritual") r = { how: "ritual", strict };
    else if (e.specialOnly || /Must (?:first )?be Special Summoned|can only be Special Summoned/.test(t)) r = { strict };
    return (RULES[no] = r);
  }
  // Whether an effect's target step would find a target: a dry run of it on a stand-in for the duel that, at its
  // first pick of zones, counts what could be picked (the card's own filter, and every rule against targeting:
  // Obelisk's, Lord of D.'s...) and stops there, the duel untouched. False if there's none; null when it can't tell
  // (it asks something else first, or waits before it picks, or may pick none), as before: activatable.
  const PROBE = {};
  function targetsSomething(d, p, c, a, ctx) {
    let found = null;
    const probe = Object.create(d);
    probe.pickZones = function (q, prompt, filter, opts) {
      opts = opts || {};
      let n = 0;
      for (const r of opts.sides || [0, 1]) for (let i = 0; i < 11; i++) {
        const z = d.players[r].zones[i];
        if (z && (!opts.area || (opts.area === "monster" ? i < 5 : opts.area === "spell" ? i >= 5 : true)) && filter(z, r, i)) n++;
      }
      found = n > 0 || opts.min === 0 ? null : false;
      throw PROBE;
    };
    probe.ask = function () { throw PROBE; };
    const link = { p, card: c, zone: ctx.zone || null, prev: ctx.last || null, event: ctx.event || null, targets: [], data: {}, probe: true };
    try {
      const r = a.target(probe, link);
      if (r && typeof r.catch === "function") r.catch(() => {});
    } catch (e) { if (e !== PROBE) return null; }
    return found;
  }
  // (the effect resolving is the card its text names: "Elegant Egotist" for Harpie Lady Sisters, "Zoa" for Metalzoa)
  function namedBy(d, c) {
    // (or a hook that says whose effect it is, d.xBy: Dark Flare Knight's for Mirage Knight)
    const l = d.effectLink, by = typeof d.xBy === "string" ? d.xBy : l && l.card && !l.card.token ? CardInfo.name(l.card.no) : null;
    return !!by && by !== CardInfo.name(c.no) && window.DuelMonsters.text(c.no).includes('"' + by + '"');
  }

  // ---------- The duel ----------
  function create(opts) {
    const rng = opts.rng || Math.random;
    const d = {
      opts, rng, turn: 0, turnPlayer: opts.first || 0, phase: "draw", over: null, log: [],
      players: [0, 1].map((p) => ({
        id: p, name: (opts.names || ["Player", "CPU"])[p], lp: LP, hand: [], deck: [], grave: [], fusion: [], banished: [],
        zones: new Array(11).fill(null), normalSummoned: false, flags: {}, lpPaid: 0
      })),
      chain: [], temp: [], flags: {}, attack: null,
      card: CardInfo, ICON, effectOf
    };
    for (const p of [0, 1]) {
      for (const no of opts.decks[p] || []) {
        if (!card(no)) continue;
        (CardInfo.isExtra(no) ? d.players[p].fusion : d.players[p].deck).push(newCard(no, p));
      }
      shuffle(d, d.players[p].deck);
    }
    Object.assign(d, API);
    d.pendingEquipLoss = []; d.pendingEvents = []; d.resolving = 0;
    return d;
  }
  function shuffle(d, list) {
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(d.rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  }

  // ---------- The API effects and controllers use ----------
  const API = {
    other(p) { return 1 - p; },
    name(c) { return c && c.token ? c.token.name : CardInfo.name(c.no || c); },
    monsters(p) { return [0, 1, 2, 3, 4].map((i) => this.players[p].zones[i]).filter(Boolean); },
    spells(p) { return [5, 6, 7, 8, 9].map((i) => this.players[p].zones[i]).filter(Boolean); },
    fieldZone(p) { return this.players[p].zones[10]; },
    allZones(p) { return this.players[p].zones.filter(Boolean); },
    zoneOf(c) {
      for (const p of [0, 1]) for (let i = 0; i < 11; i++) { const z = this.players[p].zones[i]; if (z && z.card === c) return { p, i, z }; }
      return null;
    },
    locate(z) {
      for (const p of [0, 1]) { const i = this.players[p].zones.indexOf(z); if (i >= 0) return { p, i }; }
      return null;
    },
    controllerOf(z) { const l = this.locate(z); return l ? l.p : -1; },
    freeMonsterZone(p) { const zs = this.players[p].zones; for (let i = 0; i < MZ; i++) if (!zs[i] && !this.closed(p, i)) return i; return -1; },
    // (Ground Collapse: zones closed while it's face up on the field)
    closed(p, i) { return (this.flags.closed || []).some((c) => c.p === p && c.i === i && this.locate(c.src) && this.live(c.src)); },
    // Is any face-up card (on side q, or either) with this effect property live? Returns the first such zone.
    liveWith(prop, q) {
      for (const r of q == null ? [0, 1] : [q]) for (const z of this.allZones(r)) { const e = this.live(z); if (e && e[prop]) return z; }
      return null;
    },
    freeSpellZone(p) { const zs = this.players[p].zones; for (let i = 5; i < 5 + SZ; i++) if (!zs[i]) return i; return -1; },
    // Effective stats (GetZoneCardStats): base, then each continuous effect on the field, equips and links, and
    // this turn's changes; never below 0.
    stats(z) {
      const no = z.card.no, tk = z.card.token;
      const base = tk ? { atk: tk.atk, def: tk.def, type: tk.type, attribute: tk.attribute, level: tk.level }
        : { atk: CardInfo.atk(no), def: CardInfo.def(no), type: CardInfo.type(no), attribute: CardInfo.attribute(no), level: CardInfo.level(no) };
      if (z.data.base) Object.assign(base, z.data.base);
      if (!z.faceUp) return base;
      // (An effect reading other monsters' stats while this one's are worked out reads them without the effects
      // of other cards (GetZoneCardStats computes one zone at a time).)
      const raw = this.inStats;
      this.inStats = true;
      try { return this.fullStats(z, base, raw); } finally { if (!raw) this.inStats = false; }
    },
    fullStats(z, base, raw) {
      const no = z.card.no;
      const s = Object.assign({}, base);
      let mult = { atk: 1, def: 1 };
      const apply = (m) => {
        if (!m) return;
        if (m.type != null) s.type = m.type;
        if (m.attribute != null) s.attribute = m.attribute;
        // ("becomes": in the order the effects apply, so it replaces what came before and what comes after adds to it,
        // as the TCG's timestamps have it: Megamorph over an earlier boost, an equip on Chaos Necromancer)
        if (m.setAtk != null) s.atk = m.setAtk;
        if (m.setDef != null) s.def = m.setDef;
        s.atk += m.atk || 0; s.def += m.def || 0;
        if (m.atkMult) mult.atk *= m.atkMult;
        if (m.defMult) mult.def *= m.defMult;
        if (m.level) s.level += m.level;
      };
      const self = this.locate(z);
      // (The monster's own effect, then every face-up card's continuous effect that reaches it.)
      const own = effectOf(no);
      if (!raw && own && own.selfStats && !z.negated) apply(own.selfStats(this, z, self ? self.p : 0));
      if (!raw) for (const p of [0, 1]) for (const src of this.allZones(p)) {
        if (!src.faceUp || src.negated) continue;
        const e = effectOf(src.card.no);
        if (!e || !e.aura) continue;
        if (src === z && !e.auraSelf) continue;
        if (!this.live(src)) continue;
        apply(e.aura(this, src, p, z, self ? self.p : 0, s));
      }
      for (const l of z.links) if (l.stats) apply(typeof l.stats === "function" ? l.stats(this, z) : l.stats);
      for (const t of this.temp) if (t.zone === z && t.stats) apply(t.stats);
      s.atk = Math.max(0, Math.round(s.atk * mult.atk)); s.def = Math.max(0, Math.round(s.def * mult.def));
      if (this.flags.swapAtkDef) [s.atk, s.def] = [s.def, s.atk];
      return s;
    },
    atkOf(z) { return this.stats(z).atk; },
    defOf(z) { return this.stats(z).def; },
    // The value a monster battles with: its ATK in Attack Position, its DEF in Defense Position.
    battleValue(z) { return z.defense ? this.defOf(z) : this.atkOf(z); },
    countOnField(no, p) {
      return [0, 1].filter((q) => p == null || q === p).reduce((n, q) => n + this.allZones(q).filter((z) => z.faceUp && z.card.no === no).length, 0);
    },
    // Something an effect does, for the screen and the log.
    async emit(ev) {
      this.log.push(ev);
      if (this.opts.onEvent) await this.opts.onEvent(this, ev);
    },
    async ask(p, req) {
      req.player = p;
      const c = this.opts.controllers[p];
      if (!req.options || !req.options.length) return req.max > 1 ? [] : -1;
      const r = await c.choose(this, req);
      return r;
    },
    // A choice among options (the first by default for a forced one).
    async choose(p, prompt, options, extra) {
      if (!options.length) return null;
      const r = await this.ask(p, Object.assign({ type: "choose", prompt, options: options.map((o) => (typeof o === "object" && o && o.label ? o : { label: String(o), value: o })) }, extra));
      if (r == null || r < 0) return null;
      return options[r];
    },
    async yesNo(p, prompt) { return (await this.ask(p, { type: "yesno", prompt, options: [{ label: "Yes" }, { label: "No" }] })) === 0; },
    // Pick zones (`filter(z, p, i)` on both sides, or `sides`): returns the zones picked.
    async pickZones(p, prompt, filter, opts) {
      opts = opts || {};
      const cands = [];
      for (const q of opts.sides || [0, 1]) for (let i = 0; i < 11; i++) {
        const z = this.players[q].zones[i];
        if (z && (!opts.area || (opts.area === "monster" ? i < 5 : opts.area === "spell" ? i >= 5 : true)) && filter(z, q, i)) cands.push({ z, p: q, i });
      }
      if (!cands.length) return [];
      const n = Math.min(opts.count || 1, cands.length);
      const r = await this.ask(p, { type: "zones", prompt, min: opts.min != null ? opts.min : n, max: n, cancel: !!opts.cancel,
        options: cands.map((c) => ({ label: (c.z.faceUp || c.p === p ? this.name(c.z.card) : "Face-down card"), zone: c.z, p: c.p, i: c.i })) });
      if (r == null || r === -1) return null;
      return [].concat(r).map((k) => cands[k].z);
    },
    async pickZone(p, prompt, filter, opts) { const r = await this.pickZones(p, prompt, filter, opts); return r && r[0] || null; },
    // Pick cards from a list (a graveyard, the deck, a hand).
    async pickCards(p, prompt, list, filter, opts) {
      opts = opts || {};
      const cands = list.filter((c) => !filter || filter(c));
      if (!cands.length) return [];
      const n = Math.min(opts.count || 1, cands.length);
      const r = await this.ask(p, { type: "cards", prompt, min: opts.min != null ? opts.min : n, max: n, cancel: !!opts.cancel, hidden: !!opts.hidden,
        options: cands.map((c) => ({ label: opts.hidden ? "?" : this.name(c), card: c })) });
      if (r == null || r === -1) return null;
      return [].concat(r).map((k) => cands[k]);
    },
    async pickCard(p, prompt, list, filter, opts) { const r = await this.pickCards(p, prompt, list, filter, opts); return r && r[0] || null; },
    coin() { return this.rng() < 0.5; },
    die() { return 1 + Math.floor(this.rng() * 6); },

    // ---------- Moving cards ----------
    // Take a card out of wherever it is (a pile or a zone); returns where it was.
    take(c) {
      for (const pl of this.players) {
        for (const pile of ["hand", "deck", "grave", "fusion", "banished"]) {
          const i = pl[pile].indexOf(c);
          if (i >= 0) { pl[pile].splice(i, 1); return { pile, p: pl.id }; }
        }
        for (let i = 0; i < 11; i++) {
          const z = pl.zones[i];
          if (z && z.card === c) { this.vacate(pl.id, i); return { zone: i, p: pl.id, z }; }
        }
      }
      return null;
    },
    // A zone emptied: what was equipped to it, or linked to it, leaves with it (DestroyLinkedCards).
    vacate(p, i) {
      const z = this.players[p].zones[i];
      if (!z) return;
      this.players[p].zones[i] = null;
      this.temp = this.temp.filter((t) => t.zone !== z);
      for (const q of [0, 1]) for (const o of this.allZones(q)) {
        o.links = o.links.filter((l) => l.from !== z);
        if (o.equippedTo === z) this.pendingEquipLoss.push(o);
      }
    },
    pendingEquipLoss: null,
    toPile(c, pile, owner, top) {
      if (c.token) return;
      if (pile !== "grave" && pile !== "banished") c.proper = false;   // (back in the hand or a deck: to be summoned properly again)
      const pl = this.players[owner == null ? c.owner : owner];
      // (a Fusion Monster back to the deck or the hand goes to the Fusion Deck)
      if (pile === "fusion" || CardInfo.isExtra(c.no) && (pile === "hand" || pile === "deck")) pl.fusion.push(c);
      else if (pile === "deck") { if (top === false) pl.deck.push(c); else if (top === "shuffle") { pl.deck.push(c); shuffle(this, pl.deck); } else pl.deck.unshift(c); }
      else pl[pile].push(c);
    },
    async sendToGrave(c, why) {
      if (c.token) { const from = this.take(c); await this.emit({ type: "token-gone", card: c, from }); await this.afterLeave(c, from, why); return from; }
      const from = this.take(c);
      if (why === "fusion") c.fusionMaterial = true;
      // (a card removed from play instead, while something says so: Banisher of the Light, Macro Cosmos)
      const banishInstead = [0, 1].some((q) => this.allZones(q).some((z) => z.faceUp && !z.negated && effectOf(z.card.no) && effectOf(z.card.no).graveToBanish));
      this.toPile(c, banishInstead ? "banished" : "grave");
      await this.emit({ type: banishInstead ? "banish" : "to-grave", card: c, from, why });
      await this.afterLeave(c, from, why);
      const e = effectOf(c.no);
      if (!banishInstead && e && e.onToGrave) await e.onToGrave(this, c, c.owner, from, why);
      await this.notify({ type: banishInstead ? "banished" : "sent-to-grave", card: c, p: c.owner, from, why });
      if (from && from.zone != null && from.zone < 5) await this.event({ type: "monster-to-grave", card: c, p: from.p, why });
      return from;
    },
    async banish(c, why) {
      const from = this.take(c);
      this.toPile(c, "banished");
      await this.emit({ type: "banish", card: c, from, why });
      await this.afterLeave(c, from, why);
      await this.notify({ type: "banished", card: c, p: c.owner, from, why });
    },
    async toHand(c, why) {
      const from = this.take(c);
      this.toPile(c, CardInfo.isExtra(c.no) ? "fusion" : "hand");
      await this.emit({ type: "to-hand", card: c, from, why });
      await this.afterLeave(c, from, why);
      if (from && from.zone != null && from.zone < 5) await this.notify({ type: "returned", card: c, p: from.p });
    },
    async toDeck(c, top, why) {
      const from = this.take(c);
      this.toPile(c, "deck", null, top);
      await this.emit({ type: "to-deck", card: c, from, why });
      await this.afterLeave(c, from, why);
    },
    // After a card leaves the field: its equips go to the graveyard, and its "leaves the field" effects.
    async afterLeave(c, from, why) {
      if (!from || from.zone == null) return;
      const lost = this.pendingEquipLoss.splice(0);
      for (const o of lost) { const l = this.locate(o); if (l) await this.sendToGrave(o.card, "equip-lost"); }
      const e = effectOf(c.no);
      if (e && e.onLeave && from.z.faceUp && !from.z.negated) await e.onLeave(this, from.z, from.p, why);
      // (Call of the Haunted's monster gone: the trap too; a Spellbinding Circle's target gone: the circle; Toons without Toon World)
      for (const b of [from.z.data.boundTo, from.z.data.boundBy]) if (b && this.locate(b)) await this.destroy(b, "effect");
      if (CardInfo.name(c.no) === "Toon World") for (const q of [0, 1]) for (const z of this.monsters(q).slice()) { const te = effectOf(z.card.no); if (te && te.toon && this.countOnField(c.no, q) === 0) await this.destroy(z, "effect"); }
    },
    // Destroy a card on the field (by battle or an effect): to the graveyard, with its triggers.
    async destroy(z, why, by) {
      const l = this.locate(z);
      if (!l) return false;
      const e = effectOf(z.card.no);
      if (e && e.cannotBeDestroyed && z.faceUp && !z.negated && e.cannotBeDestroyed(this, z, l.p, why)) return false;
      if (why === "battle" && l.i < 5) { const u = z.links.find((k) => k.kind === "equip" && k.from.data.union && this.locate(k.from)); if (u) { await this.destroy(u.from, "effect"); return false; } }
      await this.emit({ type: "destroy", zone: z, p: l.p, i: l.i, why });
      const c = z.card, wasUp = z.faceUp;
      c.destroyedTurn = this.turn; if (why === "battle") c.battleDestroyedTurn = this.turn;
      if (why === "battle" && c.token && c.token.burn) await this.damage(1 - l.p, c.token.burn, "effect");
      await this.sendToGrave(c, why === "battle" ? "battle" : "destroyed");
      if (e && e.onDestroyed && (wasUp || why === "battle") && !z.negated) await e.onDestroyed(this, z, l.p, why, by);
      await this.event({ type: why === "battle" ? "battle-destroyed" : "destroyed", card: c, p: l.p, by });
      return true;
    },
    async drawCards(p, n, drawPhase) {
      const pl = this.players[p];
      if (!drawPhase && this.liveWith("noOtherDraws", 1 - p)) return 0;
      for (let k = 0; k < n; k++) {
        if (!pl.deck.length) { pl.flags.deckOut = true; this.checkWin(); return k; }
        const c = pl.deck.shift();
        pl.hand.push(c);
        await this.emit({ type: "draw", p, card: c });
      }
      this.checkWin();
      return n;
    },
    async damage(p, n, why) {
      if (n <= 0) return;
      const pl = this.players[p];
      if (why === "battle" && pl.flags.noBattleDamage) return;
      if (why !== "battle" && this.liveWith("noEffectDamage", p)) return;
      pl.lp = Math.max(0, pl.lp - n);
      await this.emit({ type: "lp", p, amount: -n, lp: pl.lp, why });
      this.checkWin();
      if (why !== "battle") await this.notify({ type: "effect-damage", p, amount: n, why });
      await this.event({ type: "lp-damage", p, amount: n, why });
    },
    async heal(p, n, why) {
      if (n <= 0) return;
      const pl = this.players[p];
      pl.lp += n;
      await this.emit({ type: "lp", p, amount: n, lp: pl.lp, why });
      await this.notify({ type: "healed", p, amount: n, why });
    },
    async payLp(p, n) {
      this.players[p].lp = Math.max(0, this.players[p].lp - n);
      await this.emit({ type: "lp", p, amount: -n, lp: this.players[p].lp, why: "cost" });
      this.checkWin();
    },
    async discard(p, c, why) {
      await this.sendToGrave(c, why || "discard");
      await this.event({ type: "discarded", p, card: c, why: why || "discard" });
    },
    // Put a monster on the field (a summon of any kind).
    async placeMonster(p, c, opts) {
      opts = opts || {};
      const i = opts.zone != null ? opts.zone : this.freeMonsterZone(p);
      if (i < 0) return null;
      const from = this.take(c);
      const z = newZone(c, { faceUp: opts.faceUp !== false, defense: !!opts.defense, placedTurn: this.turn, summonedBy: opts.how || "normal" });
      z.data.fromPile = from && from.pile;
      this.players[p].zones[i] = z;
      await this.emit({ type: "summon", p, i, zone: z, card: c, how: opts.how || "normal", from });
      return z;
    },
    // A Special Summon: placed, then its "summoned" triggers and the window to respond to it.
    async specialSummon(p, c, opts) {
      opts = Object.assign({ how: "special" }, opts);
      if (this.players[p].flags.noSpecialSummon) return null;
      const e0 = effectOf(c.no);
      if (e0 && e0.noSpecial && opts.how !== "normal") return null;
      if (this.liveWith("noSpecials")) return null;
      if (e0 && e0.noGraveSpecial && this.players[c.owner].grave.includes(c)) return null;
      // (its summoning condition: summoned its own way, or back from the Graveyard or removed from play only if it was)
      const rule = summonRule(c.no), own = rule && (opts.byRule || (rule.how && opts.how === rule.how) || namedBy(this, c));
      if (rule && !own) {
        const pl = this.players[c.owner], back = pl.grave.includes(c) || pl.banished.includes(c);
        if (rule.strict || (back ? !c.proper : !(rule.extraFree && pl.fusion.includes(c)))) return null;
      }
      if (opts.position === "choose") {
        const r = await this.choose(p, "Summon " + this.name(c) + " in which position?", [{ label: "Attack Position", value: false }, { label: "Defense Position", value: true }]);
        opts.defense = !!(r && r.value);
      }
      const z = await this.placeMonster(p, c, opts);
      if (!z) return null;
      if (own) c.proper = true;
      await this.summoned(p, z, "special");
      return z;
    },
    async summoned(p, z, how) {
      const e = effectOf(z.card.no);
      if (e && e.onSummon && z.faceUp) await e.onSummon(this, z, p, how);
      await this.event({ type: how === "flip" ? "flip-summoned" : how === "special" ? "special-summoned" : "summoned", p, zone: z, card: z.card });
    },
    // A face-down monster turned face up (by a Flip Summon, an attack or an effect): its flip effect.
    async flipUp(z, how, noEffect) {
      if (z.faceUp) return;
      const l = this.locate(z);
      z.faceUp = true;
      await this.emit({ type: "flip", zone: z, p: l.p, how });
      const e = effectOf(z.card.no);
      if (e && e.flip && !noEffect && !this.liveWith("negatesFlips")) await this.runEffect({ card: z.card, zone: z, p: l.p, kind: "flip", resolve: e.flip, label: this.name(z.card) });
    },
    async changePosition(z, defense) {
      if (z.defense === !!defense && z.faceUp) return;
      const was = { faceUp: z.faceUp, defense: z.defense };
      if (!z.faceUp) await this.flipUp(z, "position");
      z.defense = !!defense;
      await this.emit({ type: "position", zone: z, p: this.controllerOf(z), defense: z.defense });
      if (this.locate(z)) await this.notify({ type: "position-changed", zone: z, p: this.controllerOf(z), from: was, defense: z.defense });
    },
    // Turn a face-up monster face down (Desertapir, Tsukuyomi, Stealth Bird...).
    async flipDown(z) {
      if (!this.locate(z) || !z.faceUp) return;
      z.faceUp = false; z.defense = true; z.changedTurn = this.turn;
      await this.emit({ type: "position", zone: z, p: this.controllerOf(z), defense: true });
    },
    // Tokens: a card made for the duel (its stats given), gone when it leaves the field.
    async summonToken(p, stats, opts) {
      const c = { uid: uidNext++, no: 0, owner: p, token: Object.assign({ name: "Token", atk: 0, def: 0, level: 1, type: 0, attribute: 0 }, stats) };
      const i = this.freeMonsterZone(p);
      if (i < 0) return null;
      const z = newZone(c, { faceUp: true, defense: !!(opts && opts.defense), placedTurn: this.turn, summonedBy: "special" });
      z.data.cannotTribute = !!(opts && opts.noTribute);
      this.players[p].zones[i] = z;
      await this.emit({ type: "summon", p, i, zone: z, card: c, how: "token" });
      await this.event({ type: "special-summoned", p, zone: z, card: c, token: true });
      return z;
    },
    async takeControl(z, p) {
      const l = this.locate(z);
      if (!l || l.p === p) return false;
      const ze = effectOf(z.card.no);
      if (ze && ze.noControlChange && z.faceUp && !z.negated) return false;
      const i = this.freeMonsterZone(p);
      if (i < 0) return false;
      this.players[l.p].zones[l.i] = null;
      this.players[p].zones[i] = z;
      await this.emit({ type: "control", zone: z, from: l.p, to: p });
      return true;
    },
    // A change to a monster's stats until the end of the turn.
    addTemp(z, stats, src) { this.temp.push({ zone: z, stats, src }); },
    addLink(z, link) { z.links.push(link); },
    // Equip `card` (in zone eq) to monster zone z.
    equip(eq, z, stats) {
      eq.equippedTo = z;
      z.links.push({ from: eq, kind: "equip", stats });
    },

    // ---------- Chains and responses ----------
    // Run an effect (a link of a chain, or a trigger on its own).
    async runEffect(link) {
      if (link.negated) return;
      const prev = this.effectLink; this.effectLink = link;   // (the effect resolving: summonRule's namedBy)
      try { await link.resolve(this, link); } catch (e) { if (e !== STOP) throw e; } finally { this.effectLink = prev; }
    },
    // An event of the duel: triggered effects, then the window for the players to respond (EventResponse_Run).
    async event(ev) {
      if (this.over) return;
      await this.notify(ev);
      // (while a chain resolves, the window waits until it's done, as EDS queues its triggers: Chain_AddPending)
      if (this.resolving) { this.pendingEvents.push(ev); return; }
      await this.respondWindow(ev);
    },
    // The face-up cards that watch for something (their onEvent), without a window to respond.
    async notify(ev) {
      if (this.over) return;
      for (const p of [0, 1]) for (const z of this.allZones(p).slice()) {
        const e = effectOf(z.card.no);
        if (e && e.onEvent && this.live(z) && this.locate(z)) await e.onEvent(this, z, p, ev);
        if (this.over) return;
      }
    },
    // Each player in turn, the turn player first, may activate a card that answers the event.
    async respondWindow(ev, chain) {
      if (this.over) return;
      chain = chain || [];
      const order = [this.turnPlayer, 1 - this.turnPlayer];
      let passes = 0, k = 0;
      while (passes < 2 && !this.over) {
        const p = order[k % 2]; k++;
        const opts = this.responses(p, ev, chain);
        if (!opts.length) { passes++; continue; }
        const r = await this.ask(p, { type: "respond", prompt: describeEvent(this, ev, chain), event: ev, options: opts.concat([{ label: "Don't respond", pass: true }]) });
        const o = r != null && r >= 0 ? opts[r] : null;
        if (!o) { passes++; continue; }
        passes = 0;
        const link = await this.activate(p, o, chain.length ? chain[chain.length - 1] : null, ev);
        if (link) chain.push(link);
        // (a chain: each link answerable in turn, then resolved from the last back)
        if (chain.length) { await this.buildChain(chain, ev); return; }
      }
    },
    // The cards p could activate now in answer to ev (or to the chain's last link).
    responses(p, ev, chain) {
      const out = [];
      const last = chain && chain.length ? chain[chain.length - 1] : null;
      const minSpeed = last ? Math.max(2, last.speed || 1) : 2;
      for (let i = 5; i < 11; i++) {
        const z = this.players[p].zones[i];
        if (!z) continue;
        const no = z.card.no, e = effectOf(no);
        if (!e || !e.activate) continue;
        const a = e.activate;
        const speed = this.speedOf(no, a);
        if (speed < minSpeed) continue;
        if (CardInfo.isTrap(no) && ((z.placedTurn === this.turn && !this.liveWith("trapsSameTurn", p)) || this.negated("trap"))) continue;
        if (CardInfo.isSpell(no) && (CardInfo.icon(no) !== ICON.QUICK || z.faceUp || z.placedTurn === this.turn)) continue;
        if (z.faceUp && !a.repeatable) continue;
        if (!this.canActivate(p, z.card, a, { zone: z, event: ev, chain, last })) continue;
        out.push({ label: this.name(z.card), card: z.card, zone: z, from: "field" });
      }
      // (Quick-Play Spells from the hand on your own turn)
      if (p === this.turnPlayer && this.freeSpellZone(p) >= 0) for (const c of this.players[p].hand) {
        const e = effectOf(c.no);
        if (!e || !e.activate || !CardInfo.isSpell(c.no) || CardInfo.icon(c.no) !== ICON.QUICK) continue;
        if (this.speedOf(c.no, e.activate) < minSpeed) continue;
        if (!this.canActivate(p, c, e.activate, { event: ev, chain, last, fromHand: true })) continue;
        out.push({ label: this.name(c), card: c, from: "hand" });
      }
      // (a monster's effect from the hand: Kuriboh)
      for (const c of this.players[p].hand) {
        const e = effectOf(c.no);
        if (!e || !e.handQuick || !this.canActivate(p, c, e.handQuick, { event: ev, chain, last, fromHand: true })) continue;
        out.push({ label: this.name(c), card: c, from: "hand-quick", eff: e.handQuick });
      }
      // (monsters' quick effects)
      for (const z of this.monsters(p)) {
        const e = effectOf(z.card.no);
        if (!e || !e.quick || !z.faceUp || z.negated) continue;
        if (!this.canActivate(p, z.card, e.quick, { zone: z, event: ev, chain, last })) continue;
        out.push({ label: this.name(z.card), card: z.card, zone: z, from: "monster", eff: e.quick });
      }
      return out;
    },
    speedOf(no, a) {
      if (a && a.speed) return a.speed;
      if (CardInfo.isTrap(no)) return CardInfo.icon(no) === ICON.COUNTER ? 3 : 2;
      if (CardInfo.isSpell(no)) return CardInfo.icon(no) === ICON.QUICK ? 2 : 1;
      return 1;
    },
    // Can this card's effect be activated now (its prepare handler, and the rules round it)?
    canActivate(p, c, a, ctx) {
      if (this.players[p].flags.noActivate) return false;
      if (CardInfo.isSpell(c.no) && this.negated("spell")) return false;
      if (this.locked(p, c, ctx)) return false;
      if (a.when) {
        const ev = ctx.event;
        const last = ctx.last;
        const ok = [].concat(a.when).some((w) => w === "main" ? !ev && !last && this.isMain() && p === this.turnPlayer
          : w === "any" ? !ev || !ev.damageStep   // (not the Damage Step's window: only what says so answers there)
          : w === "chain" ? !!last
          : !!ev && !last && ev.type === w);
        if (!ok) return false;
      } else if (ctx.event || ctx.last) return false;
      try { if (a.can && !a.can(this, Object.assign({ p, card: c }, ctx))) return false; } catch (e) { return false; }
      // (one that must target: not if there's nothing it could, Obelisk or Lord of D.'s Dragons the only monsters)
      return !a.target || targetsSomething(this, p, c, a, ctx) !== false;
    },
    isMain() { return this.phase === "main1" || this.phase === "main2"; },
    // What the other side's cards forbid p to activate: Quick-Play Spells (Invader of Darkness), Spells while its
    // controller's hand is empty (Mechanical Hound), Traps in the Battle Phase (Pitch-Black Warwolf), Traps answering a
    // summon (Eagle Eye), Spells and Traps while an Ancient Gear attacks.
    locked(p, c, ctx) {
      const q = 1 - p, no = c.no, st = CardInfo.isSpell(no) || CardInfo.isTrap(no);
      if (!st) return false;
      for (const z of this.allZones(q)) {
        const e = this.live(z);
        if (!e) continue;
        if (e.noQuickPlay && CardInfo.isSpell(no) && CardInfo.icon(no) === ICON.QUICK) return true;
        if (e.noSpellsIfEmpty && CardInfo.isSpell(no) && !this.players[q].hand.length) return true;
        if (e.noBattleTraps && CardInfo.isTrap(no) && this.phase === "battle") return true;
        if (e.gearLock && this.attack && this.attack.attacker === z) return true;
      }
      for (const r of [0, 1]) for (const z of this.allZones(r)) { const e = this.live(z); if (e && e.forbids && e.forbids(this, z, r, p, c)) return true; }
      const ev = ctx && ctx.event;
      if (ev && ev.type === "summoned" && ev.zone && ev.p !== p && CardInfo.isTrap(no)) { const e = effectOf(ev.zone.card.no); if (e && e.noTrapsOnSummon && !ev.zone.negated) return true; }
      if (CardInfo.isTrap(no) && this.flags.noTrapsTurn === this.turn) return true;
      return false;
    },
    // (Jinzo, Royal Decree: Traps negated; Imperial Order: Spells; each but the card itself)
    negated(kind, except) {
      for (const q of [0, 1]) for (const z of this.allZones(q)) {
        if (!z.faceUp || z.negated || z === except) continue;
        const e = effectOf(z.card.no);
        if (e && (kind === "trap" ? e.negatesTraps : e.negatesSpells)) return true;
      }
      return false;
    },
    // A card's continuous effect, if face up and not negated.
    live(z) {
      if (!z || !z.faceUp || z.negated) return null;
      const no = z.card.no;
      if (CardInfo.isTrap(no) && this.negated("trap", z)) return null;
      if (CardInfo.isSpell(no) && this.negated("spell", z)) return null;
      return effectOf(no);
    },
    // Activate a card: onto the field (a Spell from the hand to a free zone; a set card face up), its cost and
    // targets (chainA, chainB), as a link.
    async activate(p, o, prev, ev) {
      const c = o.card, e = effectOf(c.no), a = o.eff || e.activate;
      let z = o.zone || null;
      if (o.from === "hand-quick" || o.from === "hand-effect") {
        if (o.from === "hand-quick") await this.discard(p, c, "cost");
      } else if (o.from === "hand") {
        const i = CardInfo.icon(c.no) === ICON.FIELD ? 10 : this.freeSpellZone(p);
        if (i < 0) return null;
        if (i === 10 && this.players[p].zones[10]) await this.sendToGrave(this.players[p].zones[10].card, "replaced");
        this.take(c);
        z = newZone(c, { faceUp: true, placedTurn: this.turn });
        this.players[p].zones[i] = z;
      } else if (z && o.from !== "monster") z.faceUp = true;
      const link = { p, card: c, zone: z, prev, event: ev, speed: this.speedOf(c.no, a), resolve: a.resolve, targets: [], data: {}, label: this.name(c),
        stays: !!(a.stays || CardInfo.icon(c.no) === ICON.CONTINUOUS || CardInfo.icon(c.no) === ICON.FIELD || CardInfo.icon(c.no) === ICON.EQUIP) };
      await this.emit({ type: "activate", p, card: c, zone: z, link });
      await this.notify({ type: "activated", p, card: c, zone: z, link, from: o.from });
      if (a.cost && (await a.cost(this, link)) === false) { link.negated = true; }
      if (!link.negated && a.target && (await a.target(this, link)) === false) link.negated = true;
      if (o.from !== "monster" && CardInfo.isSpell(c.no)) this.players[p].flags.spellThisTurn = true;
      return link;
    },
    // Each link answerable by the other player, then by each in turn, then resolved from the last back.
    async buildChain(chain, ev) {
      let passes = 0, who = 1 - chain[chain.length - 1].p;
      while (passes < 2 && chain.length < 16 && !this.over) {
        const opts = this.responses(who, null, chain);
        let o = null;
        if (opts.length) {
          const r = await this.ask(who, { type: "respond", prompt: describeLink(this, chain[chain.length - 1]), link: chain[chain.length - 1], options: opts.concat([{ label: "Don't respond", pass: true }]) });
          o = r != null && r >= 0 ? opts[r] : null;
        }
        if (!o) { passes++; who = 1 - who; continue; }
        passes = 0;
        const link = await this.activate(who, o, chain[chain.length - 1], null);
        if (link) chain.push(link);
        who = 1 - who;
      }
      await this.resolveChain(chain);
    },
    async resolveChain(chain) {
      this.resolving++;
      for (let k = chain.length - 1; k >= 0 && !this.over; k--) {
        const link = chain[k];
        await this.emit({ type: "resolve", link });
        if (!link.negated && link.zone && !this.locate(link.zone) && !link.fromMonster && CardInfo.isMonster(link.card.no) === false) link.negated = true;
        await this.runEffect(link);
        // (a Spell or Trap that doesn't stay goes to the graveyard; one negated goes too)
        const l = link.zone && this.locate(link.zone);
        if (l && l.i >= 5 && (!link.stays || link.negated || link.zone.data.discard)) await this.sendToGrave(link.card, "used");
        else if (l && l.i >= 5 && link.stays && link.zone.equippedTo === null && CardInfo.icon(link.card.no) === ICON.EQUIP) await this.sendToGrave(link.card, "used");
      }
      chain.length = 0;
      this.resolving--;
      await this.settle();
    },
    // After a chain: win checks, then the windows of the events that happened while it resolved.
    async settle() {
      this.checkWin();
      if (this.resolving) return;
      while (this.pendingEvents.length && !this.over) await this.respondWindow(this.pendingEvents.shift());
    },

    // ---------- Win ----------
    checkWin() {
      if (this.over) return true;
      if (this.holdWin) return false;   // (an effect still resolving its parts: together)
      const lose = [0, 1].map((p) => this.players[p].lp <= 0 || this.players[p].flags.deckOut);
      const win = [0, 1].map((p) => hasExodia(this, p) || this.players[p].flags.specialWin);
      let winner = null, reason = null;
      if (win[0] || win[1]) { winner = win[0] && win[1] ? -1 : win[0] ? 0 : 1; reason = this.players[winner >= 0 ? winner : 0].flags.specialWin || "exodia"; }
      else if (lose[0] || lose[1]) { winner = lose[0] && lose[1] ? -1 : lose[0] ? 1 : 0; reason = this.players[lose[0] ? 0 : 1].flags.deckOut ? "deck" : "lp"; }
      if (winner == null) return false;
      this.over = { winner, reason };
      return true;
    },
    // An effect's parts at once: the duel is won or lost (or drawn) only when all of them are done (Ring of
    // Destruction's damage to both players: both at 0, a draw).
    async together(fn) {
      this.holdWin = (this.holdWin || 0) + 1;
      try { await fn(); } finally { this.holdWin--; }
      this.checkWin();
    }
  };
  const STOP = {};
  const EXODIA = ["Exodia the Forbidden One", "Right Arm of the Forbidden One", "Left Arm of the Forbidden One", "Right Leg of the Forbidden One", "Left Leg of the Forbidden One"];
  function hasExodia(d, p) {
    const hand = d.players[p].hand.map((c) => c.no);
    return EXODIA.every((n) => hand.includes(numberOf(n)));
  }
  function describeEvent(d, ev, chain) {
    if (!ev) return "Respond?";
    const who = (p) => (p === 0 ? d.players[0].name : d.players[1].name);
    const n = ev.card ? d.name(ev.card) : "";
    switch (ev.type) {
      case "summoned": case "flip-summoned": case "special-summoned": return who(ev.p) + " summoned " + n + ".";
      case "attack": return d.name(ev.attacker.card) + " attacks" + (ev.target ? " " + (ev.target.faceUp ? d.name(ev.target.card) : "a face-down monster") : " directly") + ".";
      case "set": return who(ev.p) + " set a card.";
      case "before-damage": return "Damage calculation: " + d.name(ev.attacker.card) + " attacks" + (ev.target ? " " + (ev.target.faceUp ? d.name(ev.target.card) : "a face-down monster") : " directly") + ".";
      case "phase": return who(d.turnPlayer) + "'s " + ev.phase + ".";
      default: return "Respond to " + ev.type.replace(/-/g, " ") + "?";
    }
  }
  function describeLink(d, link) { return d.players[link.p].name + " activated " + d.name(link.card) + "."; }

  // ---------- The turn ----------
  const TURN = {
    async run() {
      for (const p of [0, 1]) await this.drawCards(p, HAND, true);
      while (!this.over) {
        await this.playTurn();
        if (this.over) break;
        this.turn++;
        this.turnPlayer = 1 - this.turnPlayer;
      }
      await this.emit({ type: "over", winner: this.over.winner, reason: this.over.reason });
      return this.over;
    },
    async playTurn() {
      const p = this.turnPlayer, pl = this.players[p];
      pl.normalSummoned = false; pl.flags.spellThisTurn = false;
      for (const q of [0, 1]) for (const z of this.allZones(q)) { z.attacks = 0; z.attackedThisTurn = false; }
      await this.emit({ type: "turn", p, turn: this.turn });
      if (pl.flags.skipTurn) { pl.flags.skipTurn = false; return; }
      // Draw Phase
      this.phase = "draw"; await this.emit({ type: "phase", phase: "draw", p });
      if (pl.flags.skipDraw) pl.flags.skipDraw = false;
      else if (pl.flags.skipDraws > 0) pl.flags.skipDraws--;
      else { await this.drawCards(p, 1, true); await this.event({ type: "drew", p, card: pl.hand[pl.hand.length - 1], drawPhase: true }); }
      if (this.over) return;
      // Standby Phase: its upkeep (maintenance costs and standby effects)
      this.phase = "standby"; await this.emit({ type: "phase", phase: "standby", p });
      if (pl.flags.skipStandby) pl.flags.skipStandby = false;
      else {
        for (const q of [p, 1 - p]) for (const z of this.allZones(q).slice()) {
          const e = this.live(z);
          if (e && e.standby && this.locate(z)) await e.standby(this, z, q);
          if (this.over) return;
        }
        for (const q of [p, 1 - p]) for (const c of this.players[q].grave.slice()) {
          const e = effectOf(c.no);
          if (e && e.graveStandby && this.players[q].grave.includes(c)) await e.graveStandby(this, c, q);
        }
      }
      await this.event({ type: "standby", p });
      if (this.over) return;
      // Main Phase 1, Battle Phase, Main Phase 2
      this.phase = "main1"; await this.emit({ type: "phase", phase: "main1", p });
      const next = await this.mainPhase(p);
      if (this.over) return;
      const noBattle = pl.flags.skipBattle || pl.flags.noBattleThisTurn === this.turn || [0, 1].some((q) => this.allZones(q).some((z) => { const e = this.live(z); return e && e.noBattlePhase && e.noBattlePhase(this, z, q); }));
      if (pl.flags.skipBattle) pl.flags.skipBattle = false;
      this.flags.endBattle = false;
      if (next === "battle" && this.turn > 0 && !noBattle) {
        this.phase = "battle"; await this.emit({ type: "phase", phase: "battle", p });
        await this.battlePhase(p);
        if (this.over) return;
        this.phase = "main2"; await this.emit({ type: "phase", phase: "main2", p });
        await this.mainPhase(p);
        if (this.over) return;
      }
      // End Phase: end-of-turn effects, then the hand down to six
      this.phase = "end"; await this.emit({ type: "phase", phase: "end", p });
      for (const q of [p, 1 - p]) for (const z of this.allZones(q).slice()) {
        const e = effectOf(z.card.no);
        if (e && e.endPhase && z.faceUp && !z.negated && this.locate(z)) await e.endPhase(this, z, q);
        if (this.over) return;
      }
      for (const q of [0, 1]) for (const z of this.monsters(q).slice()) {
        const e = effectOf(z.card.no);
        // (Spirit monsters back to the hand on the turn they came; Karate Man and Limiter Removal; Change of Heart; Power Bond)
        if (e && e.spirit && z.placedTurn === this.turn && z.faceUp) { await this.toHand(z.card, "spirit"); continue; }
        if (z.data.destroyAtEnd === this.turn) { await this.destroy(z, "effect"); continue; }
        if (z.data.toExtraAtEnd === this.turn) { await this.toDeck(z.card, true, "effect"); continue; }
        if (z.data.banishAtEnd === this.turn) { await this.banish(z.card, "effect"); continue; }
        z.links = z.links.filter((l) => l.until == null || l.until > this.turn);
        if (z.data.returnAtEnd && z.data.returnAtEnd.turn === this.turn) { const to = z.data.returnAtEnd.to; z.data.returnAtEnd = null; await this.takeControl(z, to); }
        if (z.data.powerBond && z.data.powerBond.turn === this.turn) { await this.damage(z.data.powerBond.p, CardInfo.atk(z.card.no), "effect"); z.data.powerBond = null; }
        if (z.data.toDefenseAtEnd) { z.data.toDefenseAtEnd = false; await this.changePosition(z, true); z.changedTurn = this.turn + 1; }
      }
      for (const q of [0, 1]) if (this.players[q].flags.countdown && this.turn >= this.players[q].flags.countdown) { this.players[q].flags.specialWin = "countdown"; this.checkWin(); }
      this.temp = this.temp.filter((t) => t.until === "permanent");
      for (const k of ["spellsNegatedThisTurn"]) delete this.flags[k];
      while (pl.hand.length > HAND_LIMIT && !this.over && !this.liveWith("noHandLimit")) {
        const c = await this.pickCard(p, "Discard down to " + HAND_LIMIT + " cards.", pl.hand);
        await this.discard(p, c || pl.hand[0], "hand-limit");
      }
      for (const q of [0, 1]) for (const z of this.allZones(q)) if (z.data.untilEnd) z.data.untilEnd = null;
    },
    // ---------- Main Phase ----------
    async mainPhase(p) {
      for (;;) {
        if (this.over) return "end";
        const acts = this.mainActions(p);
        const r = await this.ask(p, { type: "main", phase: this.phase, prompt: "What will you do?", options: acts });
        const a = acts[r] || acts[acts.length - 1];
        if (a.act === "battle" || a.act === "end") return a.act;
        await this.doAction(p, a);
      }
    },
    // Everything p may do now (CardMenu_GetAvailableCommands, for each card).
    mainActions(p) {
      const pl = this.players[p], acts = [];
      const noSummon = pl.flags.noSummonTurn === this.turn || this.players[1 - p].flags.noSummonFor === this.turn;
      const canNormal = !pl.normalSummoned && !pl.flags.noNormalSummon && !noSummon;
      for (const c of pl.hand) {
        const no = c.no;
        if (CardInfo.isMonster(no) && !CardInfo.isExtra(no)) {
          const e = effectOf(no);
          const special = e && e.specialOnly;
          const fieldOk = !(e && e.needsField) || this.countOnField(numberOf(e.needsField)) > 0;
          if (canNormal && !special && CardInfo.kind(no) !== "ritual" && fieldOk && !(e && e.normalIf && !e.normalIf(this, p))) {
            const t = e && e.noTributeIfOnly && pl.hand.length === 1 ? 0 : tributesFor(no, e);
            if (this.tributable(p).length >= t && (t > 0 || this.freeMonsterZone(p) >= 0)) {
              acts.push({ act: "summon", card: c, tributes: t, label: "Summon " + CardInfo.name(no) });
              acts.push({ act: "set-monster", card: c, tributes: t, label: "Set " + CardInfo.name(no) });
            }
          }
          if (e && e.handActivate && this.canActivate(p, c, e.handActivate, { fromHand: true })) acts.push({ act: "hand-effect", card: c, label: "Use " + CardInfo.name(no) });
          if (e && e.specialFromHand && !noSummon && this.freeMonsterZone(e.specialSide ? 1 - p : p) >= 0 && e.specialFromHand(this, p, c)) acts.push({ act: "special-hand", card: c, label: "Special Summon " + CardInfo.name(no) });
        } else if (CardInfo.isSpell(no) || CardInfo.isTrap(no)) {
          const e = effectOf(no), field = CardInfo.icon(no) === ICON.FIELD;
          const room = field || this.freeSpellZone(p) >= 0;
          if (room && CardInfo.isSpell(no) && e && e.activate && this.canActivate(p, c, e.activate, { fromHand: true }))
            acts.push({ act: "activate", card: c, from: "hand", label: "Activate " + CardInfo.name(no) });
          if (room && !field) acts.push({ act: "set-spell", card: c, label: "Set " + CardInfo.name(no) });
        }
      }
      for (let i = 0; i < 5; i++) {
        const z = pl.zones[i];
        if (!z) continue;
        const fresh = z.placedTurn === this.turn;
        const bound = z.data.boundBy && this.locate(z.data.boundBy);
        if (bound || (noSummon && !z.faceUp)) { /* (Spellbinding Circle; Scapegoat's turn) */ }
        else if (!z.faceUp && !fresh && z.changedTurn !== this.turn && !pl.flags.noPositionChange && !z.card.token) acts.push({ act: "flip-summon", zone: z, label: "Flip Summon " + CardInfo.name(z.card.no) });
        else if (z.faceUp && !fresh && z.changedTurn !== this.turn && !z.attackedThisTurn && !pl.flags.noPositionChange && !z.data.positionLocked)
          acts.push({ act: "position", zone: z, label: (z.defense ? "Attack Position: " : "Defense Position: ") + CardInfo.name(z.card.no) });
        const e = effectOf(z.card.no);
        if (e && e.ignition && z.faceUp && !z.negated && this.canActivate(p, z.card, e.ignition, { zone: z }))
          acts.push({ act: "ignition", zone: z, label: "Use " + CardInfo.name(z.card.no) });
      }
      for (let i = 5; i < 11; i++) {
        const z = pl.zones[i];
        if (!z) continue;
        const no = z.card.no, e = effectOf(no);
        if (!z.faceUp && CardInfo.isSpell(no) && e && e.activate && this.canActivate(p, z.card, e.activate, { zone: z }))
          acts.push({ act: "activate", card: z.card, zone: z, from: "field", label: "Activate " + CardInfo.name(no) });
        if (!z.faceUp && CardInfo.isTrap(no) && z.placedTurn !== this.turn && !this.negated("trap") && e && e.activate && this.canActivate(p, z.card, e.activate, { zone: z }))
          acts.push({ act: "activate", card: z.card, zone: z, from: "field", label: "Activate " + CardInfo.name(no) });
        if (z.faceUp && e && e.ignition && !z.negated && this.canActivate(p, z.card, e.ignition, { zone: z }))
          acts.push({ act: "ignition", zone: z, label: "Use " + CardInfo.name(no) });
      }
      if (this.phase === "main1" && this.turn > 0 && !pl.flags.skipBattle && pl.flags.noBattleThisTurn !== this.turn) acts.push({ act: "battle", label: "Battle Phase" });
      acts.push({ act: "end", label: "End Turn" });
      return acts;
    },
    tributable(p) { return this.liveWith("noTributes") ? [] : this.monsters(p).filter((z) => !z.data.cannotTribute); },
    // (Chain Energy: 500 LP a card played or Set from the hand)
    async handCost(p) {
      const n = [0, 1].reduce((k, q) => k + this.allZones(q).filter((z) => { const e = this.live(z); return e && e.handCost; }).length, 0) * 500;
      if (!n) return true;
      if (this.players[p].lp <= n) return false;
      await this.payLp(p, n);
      return true;
    },
    async doAction(p, a) {
      const pl = this.players[p];
      switch (a.act) {
        case "summon": case "set-monster": {
          // (Light of Intervention: a monster Set is summoned face up in Defense Position)
          const lit = a.act === "set-monster" && this.liveWith("noSetMonsters");
          const set = a.act === "set-monster" && !lit, e = effectOf(a.card.no);
          const tribs = a.tributes ? await this.pickZones(p, "Tribute " + a.tributes + " monster" + (a.tributes > 1 ? "s" : "") + ".", (z, q) => q === p && !z.data.cannotTribute, { sides: [p], area: "monster", count: a.tributes, cancel: true }) : [];
          if (tribs === null) return;
          if (!(await this.handCost(p))) return;
          for (const z of tribs) await this.sendToGrave(z.card, "tribute");
          pl.normalSummoned = true;
          const z = await this.placeMonster(p, a.card, { faceUp: !set, defense: set || lit, how: set ? "set" : "normal" });
          if (!z) return;
          if (tribs.length) z.data.tributes = tribs.length;
          if (set) await this.event({ type: "set", p, zone: z, card: z.card });
          else await this.summoned(p, z, "normal");
          if (e && e.afterTribute && tribs.length) await e.afterTribute(this, z, p, tribs);
          return;
        }
        case "flip-summon": {
          a.zone.changedTurn = this.turn; a.zone.defense = false;
          await this.flipUp(a.zone, "flip-summon");
          await this.summoned(p, a.zone, "flip");
          return;
        }
        case "special-hand": {
          const e = effectOf(a.card.no), side = e.specialSide ? 1 - p : p;
          if (e.specialCost && (await e.specialCost(this, p, a.card)) === false) return;
          if (!(await this.handCost(p))) return;
          const z = await this.specialSummon(side, a.card, { how: e.specialHow || "special", position: e.specialPosition || "choose", byRule: true });
          if (z && e.afterSpecial) await e.afterSpecial(this, z, side, p);
          return;
        }
        case "position":
          a.zone.changedTurn = this.turn;
          await this.changePosition(a.zone, !a.zone.defense);
          await this.event({ type: "position", p, zone: a.zone });
          return;
        case "set-spell": {
          const i = this.freeSpellZone(p);
          if (i < 0) return;
          if (!(await this.handCost(p))) return;
          this.take(a.card);
          const z = newZone(a.card, { faceUp: false, placedTurn: this.turn });
          pl.zones[i] = z;
          await this.emit({ type: "set-spell", p, i, zone: z, card: a.card });
          return;
        }
        case "activate": case "ignition": case "hand-effect": {
          const e = effectOf((a.card || a.zone.card).no);
          if (a.act === "activate" && a.from === "hand" && !(await this.handCost(p))) return;
          const eff = a.act === "ignition" ? e.ignition : a.act === "hand-effect" ? e.handActivate : null;
          const o = { card: a.card || a.zone.card, zone: a.zone, from: a.act === "activate" ? a.from : a.act === "hand-effect" ? "hand-effect" : "monster", eff };
          if (a.act === "ignition" && a.zone.card && a.zone.data) a.zone.data.usedTurn = this.turn;
          const link = await this.activate(p, o, null, null);
          if (!link) return;
          link.fromMonster = a.act !== "activate";
          await this.buildChain([link], null);
          return;
        }
      }
    },
    // ---------- Battle Phase (BattlePhase_Run's stages) ----------
    async battlePhase(p) {
      const q = 1 - p;
      for (;;) {
        if (this.over || this.flags.endBattle) return;
        const attackers = this.monsters(p).filter((z) => this.canAttack(z, p));
        const opts = attackers.map((z) => ({ label: CardInfo.name(z.card.no) + " attacks", zone: z })).concat([{ label: "End Battle Phase", end: true }]);
        const r = await this.ask(p, { type: "battle", prompt: "Which monster will attack?", options: opts });
        const o = opts[r];
        if (!o || o.end) return;
        const att = o.zone;
        const targets = this.monsters(q).filter((z) => this.canBeAttacked(z, q, att));
        let target = null;
        const ae = effectOf(att.card.no), direct = att.data.directTurn === this.turn || (ae && ae.directAttack && !att.negated && (typeof ae.directAttack !== "function" || ae.directAttack(this, att, p)));
        if (this.monsters(q).length) {
          const opts2 = targets.map((z) => ({ label: z.faceUp ? CardInfo.name(z.card.no) : "Face-down monster", zone: z }));
          if (direct) opts2.push({ label: "Attack directly", direct: true });
          if (!opts2.length) { att.attacks = 99; continue; }
          const r2 = await this.ask(p, { type: "attack-target", prompt: "Attack which monster?", attacker: att, cancel: true, options: opts2 });
          const o2 = opts2[r2];
          if (!o2) continue;
          target = o2.direct ? null : o2.zone;
        }
        await this.attackWith(p, att, target);
      }
    },
    canBeAttacked(z, q, att) {
      if (z.data.cannotBeAttacked) return false;
      for (const s of this.allZones(q)) {
        const e = effectOf(s.card.no);
        if (e && e.protectsFromAttack && s.faceUp && !s.negated && e.protectsFromAttack(this, s, q, z, att)) return false;
      }
      return true;
    },
    canAttack(z, p) {
      const e = effectOf(z.card.no);
      if (!z.faceUp || z.data.cannotAttack || this.players[p].flags.noAttack) return false;
      if (z.defense && !(e && e.attacksFromDefense)) return false;
      if (z.data.cannotAttackTurn === this.turn || this.players[p].flags.noAttackTurn === this.turn) return false;
      if (z.data.cannotAttackUntil > this.turn || this.liveWith("noAttacksAtAll")) return false;
      if (z.data.boundBy && this.locate(z.data.boundBy) && this.live(z.data.boundBy)) return false;
      if (e && e.noAttackOnSummonTurn && z.placedTurn === this.turn) return false;
      if (e && e.cannotAttack && !z.negated && e.cannotAttack(this, z, p)) return false;
      if (e && e.attackTribute && !z.negated && this.monsters(p).length < 2) return false;
      for (const q of [0, 1]) for (const s of this.allZones(q)) {
        const se = this.live(s);
        if (se && se.noAttack && se.noAttack(this, s, q, p, z)) return false;
        if (se && se.oneAttacker && this.monsters(p).some((x) => x !== z && x.attacks > 0)) return false;
      }
      if (!this.monsters(1 - p).length && ((e && e.noDirect && !z.negated) || z.data.noDirect)) return false;
      const n = e && !z.negated && e.attacks ? (typeof e.attacks === "function" ? e.attacks(this, z, p) : e.attacks) : 1;
      return z.attacks < (z.data.twiceTurn === this.turn ? Math.max(2, n) : n);
    },
    async attackWith(p, att, target) {
      const q = 1 - p;
      const ae0 = effectOf(att.card.no);
      // (its costs: Toll, Dark Elf, the Toons; Panther Warrior's Tribute; Jirai Gumo's coin)
      let cost = ae0 && !att.negated && ae0.attackCost || 0;
      for (const r of [0, 1]) for (const s of this.allZones(r)) { const se = this.live(s); if (se && se.attackCost && s.card.no !== att.card.no && CardInfo.isSpell(s.card.no)) cost += se.attackCost; }
      if (cost) { if (this.players[p].lp <= cost) return; await this.payLp(p, cost); }
      if (ae0 && ae0.attackTribute && !att.negated) {
        const t = await this.pickZone(p, "Tribute a monster to attack.", (x, r) => r === p && x !== att, { sides: [p], area: "monster" });
        if (!t) return; await this.sendToGrave(t.card, "tribute");
      }
      if (ae0 && ae0.beforeAttack && !att.negated) await ae0.beforeAttack(this, att, p, target);
      if (this.over || !this.locate(att)) return;
      att.attacks++; att.attackedThisTurn = true;
      this.attack = { attacker: att, target, p, negated: false };
      await this.emit({ type: "attack", attacker: att, target, p });
      // (the declaration: the window for Mirror Force, Negate Attack and the rest)
      await this.event({ type: "attack", attacker: att, target, p, card: att.card });
      const A = this.attack; this.attack = null;
      if (this.flags.endBattle) return;
      if (this.over || A.negated || !this.locate(att) || !att.faceUp || (att.defense && !(ae0 && ae0.attacksFromDefense))) return;
      if (A.target && !this.locate(A.target)) return;   // (its target gone: the attack stops, as EDS's replay check)
      target = A.target;
      if (target && target.data && this.controllerOf(target) !== q) return;
      // (a face-down defender is turned face up: its flip effect)
      if (target && !target.faceUp) { target.data.attackedFaceDown = this.turn; await this.flipUp(target, "attacked", !!(ae0 && ae0.noFlipInBattle && !att.negated)); if (this.over || !this.locate(att) || !this.locate(target)) return; }
      const ae = att.negated ? null : effectOf(att.card.no);
      if (ae && ae.beforeDamage && (await ae.beforeDamage(this, att, p, target)) === "stop") return;
      if (target && !this.locate(target)) return;
      // (the Damage Step, before damage calculation: a window for the effects used then, Kuriboh's from the hand; only
      // those whose `when` says "before-damage" answer it)
      this.attack = A;
      await this.event({ type: "before-damage", damageStep: true, attacker: att, target, p, card: att.card });
      this.attack = null;
      if (this.over || A.negated || !this.locate(att) || (target && !this.locate(target))) return;
      if (!target) {
        const dealt = await this.battleDamage(q, this.atkOf(att), att, null, A);
        if (dealt > 0 && ae && ae.onBattleDamage) await ae.onBattleDamage(this, att, p, null, dealt);
        if (dealt > 0) await this.event({ type: "battle-damage", p: q, attacker: att, dealer: att, amount: dealt, direct: true });
        if (ae && ae.afterAttack) await ae.afterAttack(this, att, p, null);
        return;
      }
      // Damage calculation (BattleStage_DamageCalc)
      const te = target.negated ? null : effectOf(target.card.no);
      if (ae && ae.onBattle) { await ae.onBattle(this, att, p, target); if (!this.locate(att) || !this.locate(target)) return; }
      if (te && te.onBattle) { await te.onBattle(this, target, q, att); if (!this.locate(att) || !this.locate(target)) return; }
      // (the Damage Step's own changes: Kinetic Soldier, Steamroid, Metalmorph, Injection Fairy Lily...)
      const bt = [];
      for (const [z, r, o, attacking] of [[att, p, target, true], [target, q, att, false]]) {
        const ze = z.negated ? null : effectOf(z.card.no);
        const mods = [ze && ze.battleStats && ze.battleStats(this, z, r, o, attacking)];
        for (const l of z.links) if (l.kind === "equip" && l.from) { const le = effectOf(l.from.card.no); if (le && le.equipBattleStats) mods.push(le.equipBattleStats(this, z, r, o, attacking)); }
        for (const m of mods) if (m) { const t = { zone: z, stats: m }; this.temp.push(t); bt.push(t); }
        if (ze && ze.battleAsk && !z.negated) { const m = await ze.battleAsk(this, z, r, o, attacking); if (m) { const t = { zone: z, stats: m }; this.temp.push(t); bt.push(t); } }
      }
      let a = this.atkOf(att);
      if (A.atkBonus) a += A.atkBonus;
      const res = { attackerDies: false, targetDies: false, damageTo: null, amount: 0 };
      if (!target.defense) {
        const t = this.atkOf(target);
        if (a > t) { res.targetDies = true; res.damageTo = q; res.amount = a - t; }
        else if (a < t) { res.attackerDies = true; res.damageTo = p; res.amount = t - a; }
        else if (a > 0) { res.attackerDies = res.targetDies = true; }
      } else {
        const t = this.defOf(target);
        if (a > t) { res.targetDies = true; if (this.pierces(att, p)) { res.damageTo = q; res.amount = a - t; } }
        else if (a < t) { res.damageTo = p; res.amount = t - a; }
      }
      if (te && te.battleImmune && !target.negated && te.battleImmune(this, target, q, att)) res.targetDies = false;
      if (ae && ae.battleImmune && !att.negated && ae.battleImmune(this, att, p, target)) res.attackerDies = false;
      for (const [z, k] of [[target, "targetDies"], [att, "attackerDies"]]) { const sh = z.data.shield; if (sh && this.locate(sh) && this.live(sh)) res[k] = false; }
      for (const [z, o] of [[att, target], [target, att]]) if (z.data.killsInBattle === this.turn) o.data.destroyAfterBattle = true;
      await this.emit({ type: "damage-calc", attacker: att, target, atk: a, value: this.battleValue(target), res });
      if (te && te.onAttacked && !target.negated) await te.onAttacked(this, target, q, att, res);
      if (ae && ae.destroysAttribute && this.stats(target).attribute === ae.destroysAttribute) res.targetDies = true;
      // (Continuous Destruction Punch and the like: the field's cards on a battle's result)
      for (const r of [0, 1]) for (const s of this.allZones(r)) { const se = this.live(s); if (se && se.battleResult) se.battleResult(this, s, r, att, target, res, p); }
      this.temp = this.temp.filter((t) => !bt.includes(t));
      if (res.damageTo != null && res.amount > 0) {
        const dealer = res.damageTo === q ? att : target;
        const dealt = await this.battleDamage(res.damageTo, res.amount, dealer, res.damageTo === q ? target : att, A);
        const de = dealer.negated ? null : effectOf(dealer.card.no);
        if (dealt > 0 && de && de.onBattleDamage) await de.onBattleDamage(this, dealer, res.damageTo === q ? p : q, res.damageTo === q ? target : att, dealt);
        if (dealt > 0) await this.event({ type: "battle-damage", p: res.damageTo, attacker: att, dealer, amount: dealt });
      }
      if (this.over) return;
      // (Kishido Spirit: equal ATK doesn't destroy)
      if (res.attackerDies && res.targetDies) for (const [z, r] of [[att, p], [target, q]]) if (this.allZones(r).some((s) => this.live(s) && effectOf(s.card.no).kishido)) { if (z === att) res.attackerDies = false; else res.targetDies = false; }
      const tDied = res.targetDies && this.locate(target) && (await this.destroy(target, "battle", att));
      const aDied = res.attackerDies && this.locate(att) && (await this.destroy(att, "battle", target));
      // (a monster that destroyed the other in battle: its effect, and its equips')
      for (const [z, r, victim, won] of [[att, p, target, tDied], [target, q, att, aDied]]) {
        if (!won || !this.locate(z)) continue;
        const ze = z.negated ? null : effectOf(z.card.no);
        if (ze && ze.onDestroyByBattle) await ze.onDestroyByBattle(this, z, r, victim);
        for (const l of z.links.slice()) if (l.kind === "equip" && l.from && this.locate(l.from)) { const le = effectOf(l.from.card.no); if (le && le.equipDestroyByBattle) await le.equipDestroyByBattle(this, z, r, victim, l.from); }
      }
      if (this.over) return;
      if (att.data.bounce && this.locate(att)) { att.data.bounce = false; await this.toHand(att.card, "effect"); }
      for (const z of [target, att]) if (z.data.destroyAfterBattle && this.locate(z)) { z.data.destroyAfterBattle = false; await this.destroy(z, "effect"); }
      // (after the Damage Step: Big Core's counters, Kangaroo Champ, D. D. Warrior Lady, Marshmallon...)
      for (const [z, r, o] of [[att, p, target], [target, q, att]]) {
        const ze = z.negated ? null : effectOf(z.card.no);
        if (ze && ze.afterBattle && this.locate(z)) await ze.afterBattle(this, z, r, o, z === att);
        if (this.over) return;
      }
      if (ae && ae.afterAttack && this.locate(att)) await ae.afterAttack(this, att, p, target);
    },
    // Battle damage to player r from monster `dealer`: 0 under Waboku, Kuriboh, Spirit Barrier; halved (Susa Soldier).
    async battleDamage(r, n, dealer, other, A) {
      const pl = this.players[r];
      if (pl.flags.waboku === this.turn || (A && A.noDamageTo === r)) return 0;
      for (const s of this.allZones(r)) { const se = this.live(s); if (se && se.noBattleDamageFor && se.noBattleDamageFor(this, s, r)) return 0; }
      const de = dealer && !dealer.negated ? effectOf(dealer.card.no) : null;
      if (de && de.halfDamage) n = Math.floor(n / 2);
      // (the monsters in the battle: Amazoness Fighter, Stone Statue of the Aztecs, Piranha Army, Rod of the Mind's Eye...)
      let why = "battle";
      for (const z of [dealer, other]) {
        if (!z || z.negated) continue;
        const ze = effectOf(z.card.no), zp = this.controllerOf(z) >= 0 ? this.controllerOf(z) : z.card.owner;
        const mods = [ze && ze.battleDamage];
        for (const l of z.links) if (l.kind === "equip" && l.from) { const le = effectOf(l.from.card.no); if (le && le.equipBattleDamage) mods.push(le.equipBattleDamage); }
        for (const f of mods) if (f) { const m = f(this, z, zp, r, n, z === dealer, other); if (m) { if (m.to != null) r = m.to; if (m.n != null) n = m.n; if (m.why) why = m.why; } }
      }
      if (n <= 0) return 0;
      await this.damage(r, n, why);
      return why === "battle" ? n : 0;
    },
    // Does this attacker deal piercing damage: its own effect, an equip's (Fairy Meteor Crush, a Union), the field's (Dragon's Rage, Meteorain)?
    pierces(att, p) {
      const ae = att.negated ? null : effectOf(att.card.no);
      if (ae && ae.piercing && (typeof ae.piercing !== "function" || ae.piercing(this, att, p))) return true;
      for (const l of att.links) if (l.kind === "equip" && l.from) { const le = effectOf(l.from.card.no); if (le && le.givesPiercing && (typeof le.givesPiercing !== "function" || le.givesPiercing(this, att, p))) return true; }
      if (this.players[p].flags.meteorain === this.turn) return true;
      for (const r of [0, 1]) for (const s of this.allZones(r)) { const se = this.live(s); if (se && se.piercingFor && se.piercingFor(this, s, r, att, p)) return true; }
      return false;
    }
  };
  Object.assign(API, TURN);
  function tributesFor(no, e) {
    if (e && e.tributes != null) return e.tributes;
    const lv = CardInfo.level(no);
    return lv >= 7 ? 2 : lv >= 5 ? 1 : 0;
  }

  window.DuelMonsters = { create, define, effectOf, EFFECTS, card: CardInfo, numberOf, ICON, STOP, newCard, newZone, shuffle, tributesFor };
})();

// ---------- Duel Monsters: the cards' effects ----------
//
// The cards' effects for the duel engine above, by card (DuelMonsters.define). Those The Eternal Duelist Soul has
// follow its handlers (include/effect_handlers.h: what each needs, costs, targets and does); the rest of GX Duel
// Academy's cards follow their text. Families of cards that say the same thing (equips, Field Spells, burns,
// heals and draws, the Trap Hole traps, the monsters that bring one from the deck when destroyed in battle,
// direct attackers, the attribute auras) are made from their text (TEMPLATES below); the others one by one
// (CARDS, next). A monster with no effect here plays with its stats alone; a Spell or Trap with none can't be
// activated (DuelMonsters.playable says which have one).
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, ICON = DM.ICON, define = DM.define, N = DM.numberOf;
  const TYPES = window.YUGIOH_CARDS.types;
  const typeNo = (name) => TYPES.findIndex((t) => t.toUpperCase() === String(name).trim().toUpperCase().replace(/-TYPE$/, ""));
  const ATTR = { LIGHT: 1, DARK: 2, WATER: 3, FIRE: 4, EARTH: 5, WIND: 6 };
  // (its text on one line, GX's colour codes out, and the TCG's short "GY" and "LP" written out, as the effects read them)
  const text = (no) => (window.YUGIOH_CARDS.cards[no] || ["", ""])[1].replace(/@\d/g, "").replace(/\s+/g, " ").trim()
    .replace(/\bGY\b/g, "Graveyard").replace(/\bLP\b/g, "Life Points");
  const nameIs = (c, names) => [].concat(names).some((n) => c && !c.token && C.name(c.no) === n);
  const zoneName = (d, z) => d.name(z.card);

  // ---------- Helpers for effects ----------
  const H = {
    opp: (l) => 1 - l.p,
    up: (d, p) => (p == null ? d.monsters(0).concat(d.monsters(1)) : d.monsters(p)).filter((z) => z.faceUp),
    mons: (d, p) => (p == null ? d.monsters(0).concat(d.monsters(1)) : d.monsters(p)),
    isMon: (d, z) => { const l = d.locate(z); return !!l && l.i < 5; },
    isST: (d, z) => { const l = d.locate(z); return !!l && l.i >= 5; },
    st: (d, p) => (p == null ? H.st(d, 0).concat(H.st(d, 1)) : [5, 6, 7, 8, 9, 10].map((i) => d.players[p].zones[i]).filter(Boolean)),
    on: (d, z) => !!d.locate(z),
    async destroyAll(d, zones, why) { let n = 0; for (const z of zones.slice()) if (d.locate(z) && (await d.destroy(z, why || "effect"))) n++; return n; },
    // Pick a target zone for link (its chainB): stored in link.targets; false if there's none.
    async target(d, link, prompt, filter, opts) {
      const z = await d.pickZone(link.p, prompt, filter, opts);
      if (!z) return false;
      link.targets = [z];
      return true;
    },
    any: (d, filter, opts) => {
      for (const q of (opts && opts.sides) || [0, 1]) for (let i = 0; i < 11; i++) {
        const z = d.players[q].zones[i];
        if (z && (!opts || !opts.area || (opts.area === "monster" ? i < 5 : i >= 5)) && filter(z, q, i)) return true;
      }
      return false;
    },
    // The link's target, if still where it was.
    t: (d, link, k) => { const z = link.targets[k || 0]; return z && d.locate(z) ? z : null; },
    stat: (d, z) => d.stats(z),
    typeOf: (d, z) => d.stats(z).type,
    attrOf: (d, z) => d.stats(z).attribute,
    lvl: (d, z) => d.stats(z).level,
    isType: (d, z, t) => z.faceUp && d.stats(z).type === (typeof t === "number" ? t : typeNo(t)),
    isAttr: (d, z, a) => z.faceUp && d.stats(z).attribute === (typeof a === "number" ? a : ATTR[a]),
    // A monster card from a pile to the field.
    async summonFrom(d, p, c, opts) { return d.specialSummon(p, c, opts); },
    async searchDeck(d, p, filter, prompt) {
      const c = await d.pickCard(p, prompt || "Take which card?", d.players[p].deck, filter);
      if (c) { await d.toHand(c, "search"); await d.emit({ type: "reveal", p, card: c }); }
      DM.shuffle(d, d.players[p].deck);
      return c;
    },
    deckMon: (d, p, filter) => d.players[p].deck.filter((c) => C.isMonster(c.no) && !C.isExtra(c.no) && (!filter || filter(c))),
    graveMon: (d, p, filter) => d.players[p].grave.filter((c) => C.isMonster(c.no) && (!filter || filter(c))),
    canSummonHere: (d, p) => d.freeMonsterZone(p) >= 0 && !d.players[p].flags.noSpecialSummon,
    async coinCall(d, p) {
      const call = await d.choose(p, "Call it: heads or tails?", [{ label: "Heads", value: true }, { label: "Tails", value: false }]);
      const r = d.coin();
      await d.emit({ type: "coin", p, heads: r });
      return !!call && call.value === r;
    },
    async die(d, p) { const r = d.die(); await d.emit({ type: "die", p, value: r }); return r; },
    negateAttack(d) { if (d.attack) d.attack.negated = true; },
    endBattle(d) { d.flags.endBattle = true; },
    async discardOne(d, p, prompt, filter) {
      const c = await d.pickCard(p, prompt || "Discard which card?", d.players[p].hand, filter);
      if (c) await d.discard(p, c);
      return c;
    },
    async discardRandom(d, p) {
      const h = d.players[p].hand;
      if (!h.length) return null;
      const c = h[Math.floor(d.rng() * h.length)];
      await d.discard(p, c, "random");
      return c;
    },
    // A ritual: the monster in the hand, and Tributes from the hand or the field whose levels add up.
    async ritual(d, link, monsterFilter, need) {
      const p = link.p;
      const m = await d.pickCard(p, "Ritual Summon which monster?", d.players[p].hand, (c) => C.kind(c.no) === "ritual" && monsterFilter(c));
      if (!m) return false;
      const level = typeof need === "function" ? need(m) : need;
      const pool = d.players[p].hand.filter((c) => c !== m && C.isMonster(c.no)).concat(d.monsters(p).map((z) => z.card));
      let total = 0; const picked = [];
      while (total < level) {
        const c = await d.pickCard(p, "Tribute monsters with " + level + " or more Levels in all (" + total + " so far).", pool, (x) => !picked.includes(x));
        if (!c) return false;
        picked.push(c); total += x_level(d, c);
      }
      for (const c of picked) await d.sendToGrave(c, "tribute");
      const z = await d.specialSummon(p, m, { how: "ritual", position: "choose" });
      return !!z;
    }
  };
  function x_level(d, c) { const l = d.zoneOf(c); return l ? d.stats(l.z).level : C.level(c.no); }
  H.ritualPossible = (d, p, monsterFilter, need) => d.players[p].hand.some((m) => {
    if (C.kind(m.no) !== "ritual" || !monsterFilter(m)) return false;
    const level = typeof need === "function" ? need(m) : need;
    const pool = d.players[p].hand.filter((c) => c !== m && C.isMonster(c.no)).map((c) => C.level(c.no)).concat(d.monsters(p).map((z) => d.stats(z).level));
    return pool.reduce((a, b) => a + b, 0) >= level && d.freeMonsterZone(p) + d.monsters(p).length >= 0;
  });
  DM.H = H; DM.ATTR = ATTR; DM.typeNo = typeNo; DM.text = text;

  // ---------- Templates: families of cards, from their text ----------
  // Each: [pattern, (match, cardNumber) => definition]. Tried in order on the cards nothing else defines.
  const typesIn = (s) => s.replace(/-Type/g, "").split(/,\s*|\s+and\s+|,\s*and\s+/).map((t) => typeNo(t.trim())).filter((t) => t > 0);
  const attrsIn = (s) => s.split(/,\s*|\s+and\s+|\s+or\s+/).map((a) => ATTR[a.trim()]).filter(Boolean);
  const equip = (filter, stats) => ({
    equip: true,
    activate: {
      can: (d, ctx) => H.any(d, (z) => H.isMon(d, z) && z.faceUp && filter(d, z, ctx.p), { area: "monster" }),
      target: (d, link) => H.target(d, link, "Equip " + d.name(link.card) + " to which monster?", (z) => z.faceUp && filter(d, z, link.p), { area: "monster" }),
      resolve: async (d, link) => {
        const t = H.t(d, link);
        if (!t || !t.faceUp || !link.zone || !d.locate(link.zone)) { if (link.zone) link.zone.data.discard = true; return; }
        d.equip(link.zone, t, stats);
        await d.emit({ type: "equip", card: link.card, to: t });
        await d.event({ type: "equipped", p: link.p, card: link.card, zone: t });
      }
    }
  });
  DM.equip = equip;
  const field = (fn) => ({ activate: { resolve: async () => {} }, aura: (d, src, sp, z) => (z.faceUp && H.isMon(d, z) ? fn(d, d.stats(z) && baseOf(d, z), z, sp) : null) });
  // (the type and attribute a monster has before field effects: its own and its links')
  function baseOf(d, z) { const no = z.card.no, tk = z.card.token; return tk ? { type: tk.type, attribute: tk.attribute } : { type: C.type(no), attribute: C.attribute(no) }; }
  const burn = (n) => ({ activate: { resolve: async (d, link) => d.damage(1 - link.p, n, "effect") } });
  const heal = (n) => ({ activate: { resolve: async (d, link) => d.heal(link.p, n, "effect") } });
  const draw = (n) => ({ activate: { resolve: async (d, link) => d.drawCards(link.p, n) } });
  const NUMS = { one: 1, two: 2, three: 3, "1": 1, "2": 2, "3": 3 };
  const TEMPLATES = [
    // ----- Equip Spells -----
    [/^An? ([A-Za-z -]+?)-Type monster equipped with this card increases its ATK and DEF by (\d+) points?\.?$/, (m) => {
      const t = typeNo(m[1]), n = +m[2]; return equip((d, z) => d.stats(z).type === t, { atk: n, def: n }); }],
    [/^An? ([A-Za-z -]+?)-Type monster equipped with this card increases its ATK by (\d+) points?\.?$/, (m) => {
      const t = typeNo(m[1]), n = +m[2]; return equip((d, z) => d.stats(z).type === t, { atk: n }); }],
    [/^An? (LIGHT|DARK|WATER|FIRE|EARTH|WIND) monster equipped with this card increases its ATK by (\d+) points and decreases its DEF by (\d+) points\.?$/, (m) => {
      const a = ATTR[m[1]]; return equip((d, z) => d.stats(z).attribute === a, { atk: +m[2], def: -m[3] }); }],
    [/^An? (LIGHT|DARK|WATER|FIRE|EARTH|WIND) monster equipped with this card increases its ATK by (\d+) points\.?$/, (m) => {
      const a = ATTR[m[1]]; return equip((d, z) => d.stats(z).attribute === a, { atk: +m[2] }); }],
    [/^A (?:monster|Monster Card) equipped with this card increases its ATK and DEF by (\d+) points\.?$/, (m) => equip(() => true, { atk: +m[1], def: +m[1] })],
    [/^A monster equipped with this card increases its ATK by (\d+) points\.?$/, (m) => equip(() => true, { atk: +m[1] })],
    [/^A monster equipped with this card increases its DEF by (\d+) points\.?$/, (m) => equip(() => true, { def: +m[1] })],
    [/^A monster equipped with this card increases its ATK by (\d+) points and decreases its DEF by (\d+) points\.?$/, (m) => equip(() => true, { atk: +m[1], def: -m[2] })],
    // ----- Field Spells -----
    [/^Increases? the ATK and DEF of all ([A-Za-z ,-]+?)-Type monsters by (\d+) points\.(?: Also decreases? the ATK and DEF of all ([A-Za-z ,-]+?)-Type monsters by (\d+) points\.)?$/, (m) => {
      const up = typesIn(m[1]), n = +m[2], down = m[3] ? typesIn(m[3]) : [], k = m[4] ? +m[4] : 0;
      return field((d, b) => (up.includes(b.type) ? { atk: n, def: n } : down.includes(b.type) ? { atk: -k, def: -k } : null)); }],
    [/^Increases? the ATK of all (LIGHT|DARK|WATER|FIRE|EARTH|WIND) monsters by (\d+) points and decreases? their DEF by (\d+) points\.?$/, (m) => {
      const a = ATTR[m[1]], n = +m[2], k = +m[3]; return field((d, b) => (b.attribute === a ? { atk: n, def: -k } : null)); }],
    // ----- Burns, heals, draws -----
    [/^Inflicts? (\d+) points of (?:Direct )?Damage to your opponent's Life Points\.?$/, (m) => burn(+m[1])],
    [/^Inflict (\d+) points of damage to your opponent's Life Points\.?$/, (m) => burn(+m[1])],
    [/^Decrease your opponent's Life Points by (\d+) points\.?$/, (m) => burn(+m[1])],
    [/^Increases? your Life Points by (\d+) points\.?$/, (m) => heal(+m[1])],
    [/^Draw (\d|one|two|three) cards? from your Deck\.?$/i, (m) => draw(NUMS[m[1].toLowerCase()])],
    // ----- Destroy all of a type -----
    [/^Destroys? all (face-up )?([A-Za-z -]+?)-Type monsters on the field\.?$/, (m) => {
      const t = typeNo(m[2]), up = !!m[1];
      return { activate: {
        can: (d) => H.any(d, (z) => H.isMon(d, z) && z.faceUp && d.stats(z).type === t, { area: "monster" }) || (!up && H.mons(d).some((z) => !z.faceUp && C.type(z.card.no) === t)),
        resolve: async (d, link) => H.destroyAll(d, H.mons(d, 1 - link.p).concat(H.mons(d, link.p)).filter((z) => (z.faceUp ? d.stats(z).type : (up ? -1 : C.type(z.card.no))) === t)) } }; }],
    // ----- The Trap Hole family (EffectTrapHolePrepare / Resolve) -----
    [/^If the (ATK|DEF) of a monster summoned by your opponent \(excluding Special Summon\) is (\d+) points or (more|less), the monster is destroyed\.?$/, (m) => {
      const stat = m[1].toLowerCase(), n = +m[2], more = m[3] === "more";
      const ok = (d, ev, p) => ev.p !== p && ev.zone && d.locate(ev.zone) && ev.zone.faceUp && (more ? d.stats(ev.zone)[stat] >= n : d.stats(ev.zone)[stat] <= n);
      return { activate: { when: ["summoned", "flip-summoned"], can: (d, ctx) => ok(d, ctx.event, ctx.p),
        resolve: async (d, link) => { if (ok(d, link.event, link.p)) await d.destroy(link.event.zone, "effect"); } } }; }],
    // ----- Monsters -----
    [/(?:^|\. )This (?:monster|card) (?:may|can) attack (?:your opponent's Life Points directly|your opponent directly|directly)/, () => ({ directAttack: true })],
    [/^This monster attacks your opponent's Life Points directly/, () => ({ directAttack: true })],
    [/^(?:When|If) this card attacks with an ATK that is higher than the DEF of your opponent's Defense Position monster, inflict the difference as Battle Damage to your opponent's Life Points\.?$/, () => ({ piercing: true })],
    [/^This (?:monster|card) can attack twice during the same Battle Phase\.?$/, () => ({ attacks: 2 })],
    [/^FLIP: Inflicts? (\d+) points of Direct Damage to your opponent's Life Points\.?$/, (m) => ({ flip: async (d, link) => d.damage(1 - link.p, +m[1], "effect") })],
    [/^As long as this card remains face-up on the field, increase the ATK of all (LIGHT|DARK|WATER|FIRE|EARTH|WIND) monsters by (\d+) points and decrease the ATK of all (LIGHT|DARK|WATER|FIRE|EARTH|WIND) monsters by (\d+) points\.?$/, (m) => {
      const a = ATTR[m[1]], n = +m[2], b = ATTR[m[3]], k = +m[4];
      return { auraSelf: true, aura: (d, src, sp, z) => (H.isMon(d, z) && z.faceUp ? (baseOf(d, z).attribute === a ? { atk: n } : baseOf(d, z).attribute === b ? { atk: -k } : null) : null) }; }],
    // (EffectSpecialSummonFromDeckResolve: Giant Rat, UFO Turtle, Mother Grizzly, Flying Kamakiri #1, Mystic Tomato, Shining Angel)
    [/^When this card is sent to the Graveyard as a result of battle, you (?:can|may) (?:select 1|Special Summon 1) (LIGHT|DARK|WATER|FIRE|EARTH|WIND) monster with an ATK of (\d+) or less/, (m) => {
      const a = ATTR[m[1]], n = +m[2];
      return { onDestroyed: async (d, z, p, why) => {
        if (why !== "battle" || !H.canSummonHere(d, p)) return;
        const pool = H.deckMon(d, p, (c) => C.attribute(c.no) === a && C.atk(c.no) <= n);
        if (!pool.length || !(await d.yesNo(p, "Special Summon a monster from your Deck with " + C.name(z.card.no) + "?"))) return;
        const c = await d.pickCard(p, "Special Summon which monster?", pool);
        if (c) await d.specialSummon(p, c, { how: "special" });
        DM.shuffle(d, d.players[p].deck);
      } }; }],
    [/^During your Standby Phase, if a "([^"]+)" exists in your Graveyard, you can return/, () => ({})],
    // ----- The same families in the TCG's text now (the cards take their current text) -----
    [/^Equip only to an? ([A-Za-z -]+?)(?:-Type)? monster\. It gains (\d+) ATK(?:\/DEF| and DEF)\.$/, (m) => equip(kindIs(m[1]), { atk: +m[2], def: +m[2] })],
    [/^Equip only to an? ([A-Za-z -]+?)(?:-Type)? monster\. It gains (\d+) ATK and loses (\d+) DEF\.$/, (m) => equip(kindIs(m[1]), { atk: +m[2], def: -m[3] })],
    [/^Equip only to an? ([A-Za-z -]+?)(?:-Type)? monster\. It gains (\d+) ATK\.$/, (m) => equip(kindIs(m[1]), { atk: +m[2] })],
    [/^Increase the ATK and DEF of an? ([A-Za-z -]+?)-Type monster equipped with this card by (\d+) points\.$/, (m) => equip(kindIs(m[1]), { atk: +m[2], def: +m[2] })],
    [/^All ([A-Za-z ,-]+?) monsters on the field gain (\d+) ATK\/DEF(?:, also all ([A-Za-z ,-]+?) monsters on the field lose (\d+) ATK\/DEF)?\.$/, (m) => {
      const up = typeList(m[1]), n = +m[2], down = m[3] ? typeList(m[3]) : [], k = m[4] ? +m[4] : 0;
      return field((d, b) => (up.includes(b.type) ? { atk: n, def: n } : down.includes(b.type) ? { atk: -k, def: -k } : null)); }],
    [/^All (LIGHT|DARK|WATER|FIRE|EARTH|WIND) monsters gain (\d+) ATK and lose (\d+) DEF\.$/, (m) => {
      const a = ATTR[m[1]], n = +m[2], k = +m[3]; return field((d, b) => (b.attribute === a ? { atk: n, def: -k } : null)); }],
    [/^All (LIGHT|DARK|WATER|FIRE|EARTH|WIND) monsters on the field gain (\d+) ATK(?:, also all|\. All) (LIGHT|DARK|WATER|FIRE|EARTH|WIND) monsters on the field lose (\d+) ATK\.$/, (m) => {
      const a = ATTR[m[1]], n = +m[2], b = ATTR[m[3]], k = +m[4];
      return { auraSelf: true, aura: (d, src, sp, z) => (H.isMon(d, z) && z.faceUp ? (baseOf(d, z).attribute === a ? { atk: n } : baseOf(d, z).attribute === b ? { atk: -k } : null) : null) }; }],
    [/^Inflict (\d+) damage to your opponent\.$/, (m) => burn(+m[1])],
    [/^Draw (\d|one|two|three) cards?\.$/i, (m) => draw(NUMS[m[1].toLowerCase()])],
    [/^Choose 1 player; that player gains (\d+) Life Points\.$/, (m) => ({ activate: { resolve: async (d, link) => {
      const o = await d.choose(link.p, "Which player gains " + m[1] + " Life Points?", [{ label: "You", value: link.p }, { label: "Your opponent", value: 1 - link.p }]);
      await d.heal(o ? o.value : link.p, +m[1], "effect"); } } })],
    [/^Destroy all (face-up )?([A-Za-z -]+?) monsters on the field\.$/, (m) => TEMPLATES.find((t) => t[0].source.startsWith("^Destroys? all"))[1]([m[0], m[1], m[2]])],
    [/^When your opponent Normal or Flip Summons (?:1|a) monster with (\d+) or (more|less) (ATK|DEF): Target that monster; destroy that target\.$/, (m) =>
      TEMPLATES.find((t) => t[0].source.startsWith("^If the (ATK|DEF)"))[1]([m[0], m[3], m[1], m[2]])],
    [/^When this card is destroyed by battle and sent to the (?:Graveyard|GY): You can Special Summon 1 (LIGHT|DARK|WATER|FIRE|EARTH|WIND) monster with (\d+) or less ATK from your Deck/, (m) =>
      TEMPLATES.find((t) => t[0].source.startsWith("^When this card is sent to the Graveyard as a result of battle"))[1](m)],
    [/^This card can make a second attack during each Battle Phase\.$/, () => ({ attacks: 2 })],
    [/^If this card attacks a Defense Position monster, inflict piercing [Bb]attle [Dd]amage(?: to your opponent)?\.$/, () => ({ piercing: true })],
    [/^This card can attack (?:your opponent )?directly\.$/, () => ({ directAttack: true })]
  ];
  // (a monster of a type or an attribute, by its name in the text; the types in a list, "A, B, and C")
  function kindIs(word) {
    const a = ATTR[word.trim()], t = typeNo(word);
    return (d, z) => (a ? d.stats(z).attribute === a : d.stats(z).type === t);
  }
  function typeList(s) { return s.split(/,\s*(?:and\s+)?|\s+and\s+/).map((t) => typeNo(t.trim())).filter((t) => t > 0); }
  DM.TEMPLATES = TEMPLATES;
  DM.applyTemplates = function () {
    let n = 0;
    window.YUGIOH_CARDS.cards.forEach((c, no) => {
      // (a Spell or Trap defined only for what it does later, Black Pendant's burn, still gets its activation here)
      const had = DM.EFFECTS[no];
      if (!c || (had && (had.activate || !(C.isSpell(no) || C.isTrap(no))))) return;
      // (a note in brackets before the effect, "(This card is not treated as ...)", aside)
      const t = text(no).replace(/^\([^)]*\)\s*/, "");
      for (const [re, make] of TEMPLATES) {
        const m = re.exec(t);
        if (m) { const def = make(m, no); if (def) { define(no, def); n++; } break; }
      }
    });
    return n;
  };
})();

// (Spells: The Eternal Duelist Soul's handlers, by card, and GX Duel Academy's others.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo;
  const isName = (c, names) => !!c && !c.token && [].concat(names).includes(C.name(c.no));
  const up = H.up, mons = H.mons, any = H.any, isMon = H.isMon, t0 = H.t;
  const oppMon = (d, l) => d.monsters(1 - l.p);
  const pickMon = (d, link, prompt, filter, sides) => H.target(d, link, prompt, (z, q) => (!sides || sides.includes(q)) && (!filter || filter(z, q)), { area: "monster" });
  const pickST = (d, link, prompt, filter, sides) => H.target(d, link, prompt, (z, q, i) => i >= 5 && (!sides || sides.includes(q)) && (!filter || filter(z, q)), { area: "spell" });
  const hasMon = (d, p, filter) => d.monsters(p).some((z) => !filter || filter(z));
  const graveMonsters = (d, p, f) => H.graveMon(d, p, f);

  // ----- Equips with a condition the templates don't read -----
  define("Cyber Shield", DM.equip((d, z) => isName(z.card, ["Harpie Lady", "Harpie Lady Sisters", "Cyber Harpie Lady"]), { atk: 500 }));
  define("Shine Palace", DM.equip((d, z) => d.stats(z).attribute === ATTR.LIGHT, { atk: 700 }));
  define("Megamorph", DM.equip(() => true, (d, z) => {
    const p = d.controllerOf(z), mine = d.players[p].lp, theirs = d.players[1 - p].lp, base = C.atk(z.card.no);
    // (its ATK becomes double its original ATK, or half: set, in the order it applies)
    return mine < theirs ? { setAtk: base * 2 } : mine > theirs ? { setAtk: Math.floor(base / 2) } : null;
  }));
  define("United We Stand", DM.equip(() => true, (d, z) => { const n = up(d, d.controllerOf(z)).length * 800; return { atk: n, def: n }; }));
  define("Mage Power", DM.equip(() => true, (d, z) => { const n = H.st(d, d.controllerOf(z)).filter((s) => s.card.no && (C.isSpell(s.card.no) || C.isTrap(s.card.no))).length * 500; return { atk: n, def: n }; }));
  define("Lightning Blade", DM.equip((d, z) => d.stats(z).type === typeNo("Warrior"), { atk: 800 }));
  define("Magic Formula", Object.assign(DM.equip((d, z) => isName(z.card, ["Dark Magician", "Dark Magician Girl"]), { atk: 700 }),
    { onToGrave: async (d, c, p) => d.heal(p, 1000, "effect") }));
  define("Fusion Weapon", DM.equip((d, z) => C.kind(z.card.no) === "fusion" && d.stats(z).level <= 6, { atk: 1500, def: 1500 }));
  define("Ritual Weapon", DM.equip((d, z) => C.kind(z.card.no) === "ritual" && d.stats(z).level <= 6, { atk: 1500, def: 1500 }));
  define("Fuhma Shuriken", Object.assign(DM.equip((d, z) => /Ninja/.test(C.name(z.card.no)), { atk: 700 }),
    { onToGrave: async (d, c, p, from) => { if (from && from.zone != null) await d.damage(1 - p, 700, "effect"); } }));
  define("Cestus of Dagla", DM.equip((d, z) => d.stats(z).type === typeNo("Fairy"), { atk: 500 }));
  define("Big Bang Shot", DM.equip(() => true, { atk: 400 }));
  define("Mask of Brutality", Object.assign(DM.equip(() => true, { atk: 1000, def: -1000 }),
    { standby: async (d, z, p) => { if (p !== d.turnPlayer) return; if (d.players[p].lp >= 1000 && (await d.yesNo(p, "Pay 1000 LP to keep Mask of Brutality?"))) await d.payLp(p, 1000); else await d.destroy(z, "cost"); } }));
  define("Demotion", DM.equip(() => true, { level: -2 }));
  // Black Pendant, Axe of Despair, Horn of Light, Horn of the Unicorn, Malevolent Nuzzler, Sword of Deep-Seated: their "sent to the
  // Graveyard" (EffectBlackPendantResolve and the rest, the equip's second step).
  define("Black Pendant", { onToGrave: async (d, c, p, from) => { if (from && from.zone != null) await d.damage(1 - p, 500, "effect"); } });
  define("Horn of the Unicorn", { onToGrave: async (d, c, p, from) => { if (from && from.zone != null) await d.toDeck(c, true, "effect"); } });
  define("Sword of Deep-Seated", { onToGrave: async (d, c, p) => d.toDeck(c, true, "effect") });
  for (const n of ["Horn of Light", "Malevolent Nuzzler"]) define(n, { onToGrave: async (d, c, p, from) => {
    if (from && from.zone != null && d.players[p].lp > 500 && (await d.yesNo(p, "Pay 500 LP to put " + C.name(c.no) + " on top of your Deck?"))) { await d.payLp(p, 500); await d.toDeck(c, true, "effect"); }
  } });
  define("Axe of Despair", { onToGrave: async (d, c, p, from) => {
    if (!from || from.zone == null || !d.monsters(p).length || !(await d.yesNo(p, "Tribute a monster to put Axe of Despair on top of your Deck?"))) return;
    const z = await d.pickZone(p, "Tribute which monster?", (x, q) => q === p, { sides: [p], area: "monster" });
    if (z) { await d.sendToGrave(z.card, "tribute"); await d.toDeck(c, true, "effect"); }
  } });

  // ----- Stat changes for the turn -----
  const quickBoost = (stats, prompt, filter) => ({ activate: {
    can: (d) => any(d, (z) => isMon(d, z) && z.faceUp && (!filter || filter(d, z)), { area: "monster" }),
    target: (d, link) => pickMon(d, link, prompt, (z) => z.faceUp && (!filter || filter(d, z))),
    resolve: async (d, link) => { const z = t0(d, link); if (z && z.faceUp) d.addTemp(z, stats, link.card); } } });
  define("Rush Recklessly", quickBoost({ atk: 700 }, "Give which monster +700 ATK?"));
  define("The Reliable Guardian", quickBoost({ def: 700 }, "Give which monster +700 DEF?"));
  define("Reinforcements", quickBoost({ atk: 500 }, "Give which monster +500 ATK?"));
  define("Castle Walls", quickBoost({ def: 500 }, "Give which monster +500 DEF?"));
  define("Snake Fang", quickBoost({ def: -500 }, "Give which monster -500 DEF?"));
  define("Rising Energy", Object.assign(quickBoost({ atk: 1500 }, "Give which monster +1500 ATK?"), { }));
  DM.EFFECTS[N("Rising Energy")].activate.cost = async (d, link) => !!(await H.discardOne(d, link.p, "Discard a card for Rising Energy."));
  DM.EFFECTS[N("Rising Energy")].activate.can = (d, ctx) => d.players[ctx.p].hand.length > (ctx.fromHand ? 1 : 0) && any(d, (z) => isMon(d, z) && z.faceUp, { area: "monster" });
  for (const [n, sign] of [["Graceful Dice", 1], ["Skull Dice", -1]]) define(n, { activate: { resolve: async (d, link) => {
    const v = (await H.die(d, link.p)) * 100 * sign, q = sign > 0 ? link.p : 1 - link.p;
    for (const z of up(d, q)) d.addTemp(z, { atk: v, def: v }, link.card);
  } } });
  define("Curse of Aging", { activate: { can: (d, ctx) => d.players[ctx.p].hand.length > 0, cost: async (d, link) => !!(await H.discardOne(d, link.p)),
    resolve: async (d, link) => { for (const z of up(d, 1 - link.p)) d.addTemp(z, { atk: -500, def: -500 }, link.card); } } });
  define("The Big March of Animals", { activate: { resolve: async (d, link) => {
    const beasts = up(d, link.p).filter((z) => H.isType(d, z, "Beast")); for (const z of beasts) d.addTemp(z, { atk: 200 * beasts.length }, link.card); } } });
  define("Limiter Removal", { activate: { resolve: async (d, link) => {
    for (const z of up(d, link.p).filter((z) => H.isType(d, z, "Machine"))) { d.addTemp(z, { atkMult: 2 }, link.card); z.data.destroyAtEnd = d.turn; } } } });

  // ----- Destruction -----
  define("Dark Hole", { activate: { can: (d) => mons(d).length > 0, resolve: async (d, link) => H.destroyAll(d, oppMon(d, link).concat(d.monsters(link.p))) } });
  define("Raigeki", { activate: { can: (d, ctx) => d.monsters(1 - ctx.p).length > 0, resolve: async (d, link) => H.destroyAll(d, oppMon(d, link)) } });
  define("Harpie's Feather Duster", { activate: { can: (d, ctx) => H.st(d, 1 - ctx.p).length > 0, resolve: async (d, link) => H.destroyAll(d, H.st(d, 1 - link.p)) } });
  define("Heavy Storm", { activate: { can: (d, ctx) => H.st(d).filter((z) => z !== ctx.zone).length > 0, resolve: async (d, link) => H.destroyAll(d, H.st(d).filter((z) => z !== link.zone)) } });
  define("Eternal Rest", { activate: { can: (d) => mons(d).some((z) => z.links.some((l) => l.kind === "equip")),
    resolve: async (d, link) => H.destroyAll(d, mons(d).filter((z) => z.links.some((l) => l.kind === "equip"))) } });
  define("Really Eternal Rest", DM.EFFECTS[N("Eternal Rest")]);
  define("Fissure", { activate: { can: (d, ctx) => up(d, 1 - ctx.p).length > 0, resolve: async (d, link) => {
    const zs = up(d, 1 - link.p); if (!zs.length) return;
    const low = Math.min(...zs.map((z) => d.atkOf(z)));
    const z = zs.length > 1 ? await d.pickZone(link.p, "Destroy which monster with the lowest ATK?", (x) => zs.includes(x) && d.atkOf(x) === low, { area: "monster" }) : zs[0];
    if (z) await d.destroy(z, "effect"); } } });
  define("Smashing Ground", { activate: { can: (d, ctx) => d.monsters(1 - ctx.p).length > 0, resolve: async (d, link) => {
    const zs = d.monsters(1 - link.p); if (!zs.length) return; const hi = Math.max(...zs.map((z) => d.defOf(z)));
    await d.destroy(zs.find((z) => d.defOf(z) === hi), "effect"); } } });
  define("Hammer Shot", { activate: { can: (d) => mons(d).some((z) => z.faceUp && !z.defense), resolve: async (d, link) => {
    const zs = mons(d).filter((z) => z.faceUp && !z.defense); if (!zs.length) return; const hi = Math.max(...zs.map((z) => d.atkOf(z)));
    await d.destroy(zs.find((z) => d.atkOf(z) === hi), "effect"); } } });
  const destroyTarget = (prompt, filter, sides, area) => ({ activate: {
    can: (d, ctx) => any(d, (z, q, i) => (!sides || sides(ctx.p).includes(q)) && z !== ctx.zone && (!filter || filter(d, z, q, i)), { area }),
    target: (d, link) => H.target(d, link, prompt, (z, q, i) => (!sides || sides(link.p).includes(q)) && z !== link.zone && (!filter || filter(d, z, q, i)), { area }),
    resolve: async (d, link) => { const z = t0(d, link); if (z) await d.destroy(z, "effect"); } } });
  const OPP = (p) => [1 - p], BOTH = () => [0, 1];
  define("Mystical Space Typhoon", destroyTarget("Destroy which Spell or Trap Card?", (d, z, q, i) => i >= 5, BOTH, "spell"));
  define("Dust Tornado", destroyTarget("Destroy which Spell or Trap Card?", (d, z, q, i) => i >= 5, OPP, "spell"));
  define("Remove Trap", destroyTarget("Destroy which face-up Trap Card?", (d, z, q, i) => i >= 5 && z.faceUp && C.isTrap(z.card.no), BOTH, "spell"));
  define("Shield Crush", destroyTarget("Destroy which Defense Position monster?", (d, z) => z.defense, BOTH, "monster"));
  define("Thousand Knives", Object.assign(destroyTarget("Destroy which monster?", null, OPP, "monster"), {}));
  DM.EFFECTS[N("Thousand Knives")].activate.can = (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Dark Magician")) && d.monsters(1 - ctx.p).length > 0;
  define("Offerings to the Doomed", destroyTarget("Destroy which face-up monster?", (d, z) => z.faceUp, BOTH, "monster"));
  DM.EFFECTS[N("Offerings to the Doomed")].activate.resolve = async (d, link) => { const z = t0(d, link); if (z) await d.destroy(z, "effect"); d.players[link.p].flags.skipDraw = true; };
  define("Tribute to the Doomed", destroyTarget("Destroy which monster?", null, BOTH, "monster"));
  Object.assign(DM.EFFECTS[N("Tribute to the Doomed")].activate, { cost: async (d, link) => !!(await H.discardOne(d, link.p, "Discard a card for Tribute to the Doomed.")) });
  const baseCanTTD = DM.EFFECTS[N("Tribute to the Doomed")].activate.can;
  DM.EFFECTS[N("Tribute to the Doomed")].activate.can = (d, ctx) => d.players[ctx.p].hand.length > (ctx.fromHand ? 1 : 0) && baseCanTTD(d, ctx);
  define("Lightning Vortex", { activate: { can: (d, ctx) => d.players[ctx.p].hand.length > (ctx.fromHand ? 1 : 0) && up(d, 1 - ctx.p).length > 0,
    cost: async (d, link) => !!(await H.discardOne(d, link.p, "Discard a card for Lightning Vortex.")), resolve: async (d, link) => H.destroyAll(d, up(d, 1 - link.p)) } });
  define("Final Destiny", { activate: { can: (d, ctx) => d.players[ctx.p].hand.length >= 5 + (ctx.fromHand ? 1 : 0),
    cost: async (d, link) => { for (let k = 0; k < 5; k++) if (!(await H.discardOne(d, link.p, "Discard 5 cards for Final Destiny."))) return false; return true; },
    resolve: async (d, link) => H.destroyAll(d, mons(d).concat(H.st(d)).filter((z) => z !== link.zone)) } });
  define("Warrior Elimination", { activate: { can: (d) => mons(d).some((z) => H.isType(d, z, "Warrior")), resolve: async (d, link) => H.destroyAll(d, mons(d).filter((z) => H.isType(d, z, "Warrior"))) } });
  define("Last Day of Witch", { activate: { can: (d) => mons(d).some((z) => H.isType(d, z, "Spellcaster")), resolve: async (d, link) => H.destroyAll(d, mons(d).filter((z) => H.isType(d, z, "Spellcaster"))) } });
  define("Exile of the Wicked", { activate: { can: (d) => mons(d).some((z) => H.isType(d, z, "Fiend")), resolve: async (d, link) => H.destroyAll(d, mons(d).filter((z) => H.isType(d, z, "Fiend"))) } });
  define("Disarmament", { activate: { can: (d) => H.st(d).some((z) => z.faceUp && C.icon(z.card.no) === DM.ICON.EQUIP), resolve: async (d, link) => H.destroyAll(d, H.st(d).filter((z) => z.faceUp && C.icon(z.card.no) === DM.ICON.EQUIP)) } });
  define("Thunder Crash", { activate: { can: (d, ctx) => d.monsters(ctx.p).length > 0, resolve: async (d, link) => { const n = await H.destroyAll(d, d.monsters(link.p)); await d.damage(1 - link.p, n * 300, "effect"); } } });
  define("Burst Stream of Destruction", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Blue-Eyes White Dragon")) && d.monsters(1 - ctx.p).length > 0,
    resolve: async (d, link) => { for (const z of up(d, link.p).filter((z) => isName(z.card, "Blue-Eyes White Dragon"))) z.data.cannotAttackTurn = d.turn; await H.destroyAll(d, oppMon(d, link)); } } });
  define("Dark Magic Attack", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Dark Magician")) && H.st(d, 1 - ctx.p).length > 0,
    resolve: async (d, link) => H.destroyAll(d, H.st(d, 1 - link.p)) } });
  define("Chaos End", { activate: { can: (d, ctx) => d.players[ctx.p].banished.length >= 7 && mons(d).length > 0, resolve: async (d) => H.destroyAll(d, mons(d)) } });
  define("Special Hurricane", { activate: { can: (d, ctx) => d.players[ctx.p].hand.length > (ctx.fromHand ? 1 : 0), cost: async (d, link) => !!(await H.discardOne(d, link.p)),
    resolve: async (d) => H.destroyAll(d, mons(d).filter((z) => z.summonedBy && z.summonedBy !== "normal" && z.summonedBy !== "set")) } });
  define("Makiu, the Magical Mist", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Summoned Skull") || H.isType(d, z, "Thunder")),
    resolve: async (d, link) => { const src = up(d, link.p).filter((z) => isName(z.card, "Summoned Skull") || H.isType(d, z, "Thunder"));
      if (!src.length) return; const a = Math.max(...src.map((z) => d.atkOf(z)));
      await H.destroyAll(d, d.monsters(1 - link.p).filter((z) => d.defOf(z) < a)); d.players[link.p].flags.noBattleThisTurn = d.turn; } } });

  // ----- Life points -----
  define("Blue Medicine", { activate: { resolve: async (d, link) => { await d.heal(link.p, 400); await d.heal(1 - link.p, 400); } } });
  define("Rain of Mercy", { activate: { resolve: async (d, link) => { await d.heal(link.p, 1000); await d.heal(1 - link.p, 1000); } } });
  define("Tremendous Fire", { activate: { resolve: async (d, link) => { await d.damage(1 - link.p, 1000, "effect"); await d.damage(link.p, 500, "effect"); } } });
  define("Restructer Revolution", { activate: { can: (d, ctx) => d.players[1 - ctx.p].hand.length > 0, resolve: async (d, link) => d.damage(1 - link.p, 200 * d.players[1 - link.p].hand.length, "effect") } });
  define("Upstart Goblin", { activate: { resolve: async (d, link) => { await d.drawCards(link.p, 1); await d.heal(1 - link.p, 1000); } } });
  define("Goblin Thief", { activate: { resolve: async (d, link) => { await d.damage(1 - link.p, 500, "effect"); await d.heal(link.p, 500); } } });
  define("Meteor of Destruction", { activate: { can: (d, ctx) => d.players[1 - ctx.p].lp > 3000, resolve: async (d, link) => d.damage(1 - link.p, 1000, "effect") } });
  define("Poison of the Old Man", { activate: { resolve: async (d, link) => {
    const o = await d.choose(link.p, "Poison of the Old Man:", [{ label: "Gain 1200 LP", v: 0 }, { label: "Inflict 800 damage", v: 1 }]);
    if (o && o.v) await d.damage(1 - link.p, 800, "effect"); else await d.heal(link.p, 1200); } } });
  define("Mystik Wok", { activate: { can: (d, ctx) => d.monsters(ctx.p).length > 0, cost: async (d, link) => {
    const z = await d.pickZone(link.p, "Tribute which monster?", (x, q) => q === link.p, { sides: [link.p], area: "monster" });
    if (!z) return false; link.data.v = [d.atkOf(z), d.defOf(z)]; await d.sendToGrave(z.card, "tribute"); return true; },
    resolve: async (d, link) => { const o = await d.choose(link.p, "Gain its ATK or its DEF?", [{ label: "ATK (" + link.data.v[0] + ")", v: 0 }, { label: "DEF (" + link.data.v[1] + ")", v: 1 }]); await d.heal(link.p, link.data.v[o ? o.v : 0]); } } });
  define("Emergency Provisions", { activate: { can: (d, ctx) => H.st(d, ctx.p).some((z) => z !== ctx.zone), resolve: async (d, link) => {
    let n = 0;
    for (;;) { const z = await d.pickZone(link.p, "Send a card to the Graveyard for 1000 LP (or stop).", (x, q, i) => q === link.p && i >= 5 && x !== link.zone, { sides: [link.p], area: "spell", min: 0, cancel: true });
      if (!z) break; await d.sendToGrave(z.card, "cost"); n++; }
    await d.heal(link.p, n * 1000); } } });
  define("Solar Ray", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => H.isAttr(d, z, "LIGHT")), resolve: async (d, link) => d.damage(1 - link.p, 600 * up(d, link.p).filter((z) => H.isAttr(d, z, "LIGHT")).length, "effect") } });
  define("Cemetary Bomb", { activate: { resolve: async (d, link) => d.damage(1 - link.p, 100 * d.players[1 - link.p].grave.length, "effect") } });
  define("D.D. Dynamite", { activate: { resolve: async (d, link) => d.damage(1 - link.p, 300 * d.players[1 - link.p].banished.length, "effect") } });
  define("Magical Explosion", { activate: { can: (d, ctx) => d.players[ctx.p].hand.length <= (ctx.fromHand ? 1 : 0), resolve: async (d, link) => d.damage(1 - link.p, 200 * d.players[link.p].grave.filter((c) => C.isSpell(c.no)).length, "effect") } });
  define("Fire Darts", { activate: { can: (d, ctx) => d.players[ctx.p].hand.length <= (ctx.fromHand ? 1 : 0), resolve: async (d, link) => {
    let t = 0; for (let k = 0; k < 3; k++) t += await H.die(d, link.p); await d.damage(1 - link.p, t * 100, "effect"); } } });
  define("Secret Barrel", { activate: { resolve: async (d, link) => d.damage(1 - link.p, 200 * (d.players[1 - link.p].hand.length + d.allZones(1 - link.p).length), "effect") } });
  define("Just Desserts", { activate: { can: (d, ctx) => d.monsters(1 - ctx.p).length > 0, resolve: async (d, link) => d.damage(1 - link.p, 500 * d.monsters(1 - link.p).length, "effect") } });
  define("Gift of The Mystical Elf", { activate: { resolve: async (d, link) => d.heal(link.p, 300 * mons(d).length) } });
  define("Blasting the Ruins", { activate: { can: (d, ctx) => d.players[ctx.p].grave.length >= 30, resolve: async (d, link) => d.damage(1 - link.p, 3000, "effect") } });

  // ----- Cards: drawing, searching, the graveyard -----
  define("Graceful Charity", { activate: { resolve: async (d, link) => { await d.drawCards(link.p, 3); for (let k = 0; k < 2; k++) await H.discardOne(d, link.p, "Discard 2 cards (Graceful Charity)."); } } });
  define("Card Destruction", { activate: { resolve: async (d, link) => {
    for (const p of [link.p, 1 - link.p]) { const n = d.players[p].hand.length; for (const c of d.players[p].hand.slice()) await d.discard(p, c); await d.drawCards(p, n); } } } });
  define("Card of Sanctity", { activate: { resolve: async (d, link) => { for (const p of [link.p, 1 - link.p]) { const n = 6 - d.players[p].hand.length; if (n > 0) await d.drawCards(p, n); } } } });
  define("Reload", { activate: { resolve: async (d, link) => { const pl = d.players[link.p], n = pl.hand.length; for (const c of pl.hand.slice()) await d.toDeck(c, "shuffle"); DM.shuffle(d, pl.deck); await d.drawCards(link.p, n); } } });
  define("Fusion Sage", { activate: { can: (d, ctx) => d.players[ctx.p].deck.some((c) => isName(c, "Polymerization")), resolve: async (d, link) => H.searchDeck(d, link.p, (c) => isName(c, "Polymerization")) } });
  define("Reinforcement of the Army", { activate: { can: (d, ctx) => H.deckMon(d, ctx.p, (c) => C.type(c.no) === typeNo("Warrior") && C.level(c.no) <= 4).length > 0,
    resolve: async (d, link) => H.searchDeck(d, link.p, (c) => C.isMonster(c.no) && C.type(c.no) === typeNo("Warrior") && C.level(c.no) <= 4) } });
  define("Terraforming", { activate: { can: (d, ctx) => d.players[ctx.p].deck.some((c) => C.icon(c.no) === DM.ICON.FIELD && C.isSpell(c.no)),
    resolve: async (d, link) => H.searchDeck(d, link.p, (c) => C.isSpell(c.no) && C.icon(c.no) === DM.ICON.FIELD) } });
  define("Toon Table of Contents", { activate: { can: (d, ctx) => d.players[ctx.p].deck.some((c) => /Toon/.test(C.name(c.no)) || isName(c, "Manga Ryu-Ran")),
    resolve: async (d, link) => H.searchDeck(d, link.p, (c) => /Toon/.test(C.name(c.no)) || isName(c, "Manga Ryu-Ran")) } });
  define("Emblem of Dragon Destroyer", { activate: { can: (d, ctx) => d.players[ctx.p].deck.concat(d.players[ctx.p].grave).some((c) => isName(c, "Buster Blader")),
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Take which Buster Blader?", d.players[link.p].deck.concat(d.players[link.p].grave), (c) => isName(c, "Buster Blader")); if (c) await d.toHand(c); DM.shuffle(d, d.players[link.p].deck); } } });
  define("Foolish Burial", { activate: { can: (d, ctx) => H.deckMon(d, ctx.p).length > 0, resolve: async (d, link) => {
    const c = await d.pickCard(link.p, "Send which monster to the Graveyard?", H.deckMon(d, link.p)); if (c) await d.sendToGrave(c, "effect"); DM.shuffle(d, d.players[link.p].deck); } } });
  define("The Warrior Returning Alive", { activate: { can: (d, ctx) => graveMonsters(d, ctx.p, (c) => C.type(c.no) === typeNo("Warrior")).length > 0,
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Return which Warrior?", graveMonsters(d, link.p, (c) => C.type(c.no) === typeNo("Warrior"))); if (c) await d.toHand(c); } } });
  define("Monster Reincarnation", { activate: { can: (d, ctx) => d.players[ctx.p].hand.length > (ctx.fromHand ? 1 : 0) && graveMonsters(d, ctx.p).length > 0,
    cost: async (d, link) => !!(await H.discardOne(d, link.p)), resolve: async (d, link) => { const c = await d.pickCard(link.p, "Add which monster to your hand?", graveMonsters(d, link.p)); if (c) await d.toHand(c); } } });
  define("Dark Factory of Mass Production", { activate: { can: (d, ctx) => graveMonsters(d, ctx.p, (c) => C.kind(c.no) === "normal").length >= 2,
    resolve: async (d, link) => { const cs = await d.pickCards(link.p, "Add which 2 Normal Monsters to your hand?", graveMonsters(d, link.p, (c) => C.kind(c.no) === "normal"), null, { count: 2 }); for (const c of cs || []) await d.toHand(c); } } });
  define("Salvage", { activate: { can: (d, ctx) => graveMonsters(d, ctx.p, (c) => C.attribute(c.no) === ATTR.WATER && C.atk(c.no) <= 1500).length >= 2,
    resolve: async (d, link) => { const cs = await d.pickCards(link.p, "Add which 2 WATER monsters to your hand?", graveMonsters(d, link.p, (c) => C.attribute(c.no) === ATTR.WATER && C.atk(c.no) <= 1500), null, { count: 2 }); for (const c of cs || []) await d.toHand(c); } } });
  define("Gravedigger Ghoul", { activate: { can: (d, ctx) => graveMonsters(d, 1 - ctx.p).length > 0, resolve: async (d, link) => {
    const cs = await d.pickCards(link.p, "Remove which monsters from play?", graveMonsters(d, 1 - link.p), null, { count: 2 }); for (const c of cs || []) await d.banish(c); } } });
  define("Soul Release", { activate: { can: (d) => d.players[0].grave.length + d.players[1].grave.length > 0, resolve: async (d, link) => {
    const cs = await d.pickCards(link.p, "Remove up to 5 cards from play.", d.players[1 - link.p].grave.concat(d.players[link.p].grave), null, { count: 5, min: 0 }); for (const c of cs || []) await d.banish(c); } } });
  define("The Cheerful Coffin", { activate: { can: (d, ctx) => d.players[ctx.p].hand.some((c) => C.isMonster(c.no)), resolve: async (d, link) => {
    const cs = await d.pickCards(link.p, "Discard up to 3 monsters.", d.players[link.p].hand, (c) => C.isMonster(c.no), { count: 3, min: 0 }); for (const c of cs || []) await d.discard(link.p, c); } } });
  define("Painful Choice", { activate: { can: (d, ctx) => d.players[ctx.p].deck.length >= 5, resolve: async (d, link) => {
    const cs = await d.pickCards(link.p, "Pick 5 cards from your Deck.", d.players[link.p].deck, null, { count: 5 }); if (!cs || !cs.length) return;
    const keep = await d.pickCard(1 - link.p, "Pick the card " + d.players[link.p].name + " adds to their hand.", cs);
    for (const c of cs) if (c === keep) await d.toHand(c); else await d.sendToGrave(c, "effect");
    DM.shuffle(d, d.players[link.p].deck); } } });
  define("Ancient Telescope", { activate: { resolve: async (d, link) => { await d.emit({ type: "look", p: link.p, cards: d.players[1 - link.p].deck.slice(0, 5) }); } } });
  define("Pot of Generosity", { activate: { can: (d, ctx) => d.players[ctx.p].hand.length >= 2 + (ctx.fromHand ? 1 : 0), resolve: async (d, link) => {
    const cs = await d.pickCards(link.p, "Return 2 cards to your Deck.", d.players[link.p].hand, null, { count: 2 }); for (const c of cs || []) await d.toDeck(c, "shuffle"); } } });
  define("A Feather of the Phoenix", { activate: { can: (d, ctx) => d.players[ctx.p].hand.length > (ctx.fromHand ? 1 : 0) && d.players[ctx.p].grave.length > 0,
    cost: async (d, link) => !!(await H.discardOne(d, link.p)), resolve: async (d, link) => { const c = await d.pickCard(link.p, "Return which card to the top of your Deck?", d.players[link.p].grave); if (c) await d.toDeck(c, true); } } });

  // ----- Hands -----
  define("Confiscation", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 1000 && d.players[1 - ctx.p].hand.length > 0, cost: async (d, link) => { await d.payLp(link.p, 1000); return true; },
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Discard which card from their hand?", d.players[1 - link.p].hand); if (c) await d.discard(1 - link.p, c); } } });
  define("Delinquent Duo", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 1000 && d.players[1 - ctx.p].hand.length > 0, cost: async (d, link) => { await d.payLp(link.p, 1000); return true; },
    resolve: async (d, link) => { await H.discardRandom(d, 1 - link.p); await H.discardOne(d, 1 - link.p, "Discard a card (Delinquent Duo)."); } } });
  define("The Forceful Sentry", { activate: { can: (d, ctx) => d.players[1 - ctx.p].hand.length > 0, resolve: async (d, link) => {
    const c = await d.pickCard(link.p, "Return which card to their Deck?", d.players[1 - link.p].hand); if (c) { await d.toDeck(c, "shuffle"); DM.shuffle(d, d.players[1 - link.p].deck); } } } });
  define("Mind Wipe", { activate: { can: (d, ctx) => d.players[1 - ctx.p].hand.length <= 3 && d.players[1 - ctx.p].hand.length > 0, resolve: async (d, link) => {
    const q = 1 - link.p, n = d.players[q].hand.length; for (const c of d.players[q].hand.slice()) await d.toDeck(c, "shuffle"); await d.drawCards(q, n); } } });
  define("Heavy Slump", { activate: { can: (d, ctx) => d.players[1 - ctx.p].hand.length >= 8, resolve: async (d, link) => {
    const q = 1 - link.p; for (const c of d.players[q].hand.slice()) await d.toDeck(c, "shuffle"); await d.drawCards(q, 2); } } });

  // ----- Monsters back, and control -----
  const reviveFrom = (prompt, sources, filter, opts) => ({ activate: {
    can: (d, ctx) => H.canSummonHere(d, ctx.p) && sources(d, ctx.p).some((c) => C.isMonster(c.no) && !C.isExtra(c.no) || (opts && opts.extra && C.isMonster(c.no)) ) && sources(d, ctx.p).some((c) => !filter || filter(c)),
    cost: opts && opts.lp ? async (d, link) => { if (d.players[link.p].lp <= opts.lp) return false; await d.payLp(link.p, opts.lp); return true; } : undefined,
    resolve: async (d, link) => {
      const c = await d.pickCard(link.p, prompt, sources(d, link.p), (c) => C.isMonster(c.no) && (!filter || filter(c)));
      if (!c) return;
      const z = await d.specialSummon(link.p, c, { how: "special", position: opts && opts.position || "choose", faceUp: !(opts && opts.faceDown), defense: opts && opts.faceDown });
      if (z && opts && opts.equip && link.zone && d.locate(link.zone)) { d.equip(link.zone, z, null); link.zone.data.bound = z; }
      if (z && opts && opts.mark) z.data[opts.mark] = true;
    } } });
  define("Monster Reborn", reviveFrom("Revive which monster?", (d) => d.players[0].grave.concat(d.players[1].grave), null, { mark: "monsterReborn" }));
  DM.EFFECTS[N("Monster Reborn")].activate.can = (d, ctx) => H.canSummonHere(d, ctx.p) && d.players[0].grave.concat(d.players[1].grave).some((c) => C.isMonster(c.no)) && !d.countOnField(N("Call of the Dark"));
  define("Premature Burial", Object.assign(reviveFrom("Revive which monster?", (d, p) => d.players[p].grave, null, { lp: 800, position: false, equip: true }), {
    onLeave: async (d, z) => { const m = z.data.bound; if (m && d.locate(m)) await d.destroy(m, "effect"); } }));
  DM.EFFECTS[N("Premature Burial")].activate.stays = true;
  define("Call of the Haunted", Object.assign(reviveFrom("Revive which monster?", (d, p) => d.players[p].grave, null, { position: false }), {
    onLeave: async (d, z) => { const m = z.data.bound; if (m && d.locate(m)) await d.destroy(m, "effect"); } }));
  DM.EFFECTS[N("Call of the Haunted")].activate.resolve = async (d, link) => {
    const c = await d.pickCard(link.p, "Revive which monster?", d.players[link.p].grave, (c) => C.isMonster(c.no));
    if (!c) return; const z = await d.specialSummon(link.p, c, { how: "special" });
    if (z && link.zone && d.locate(link.zone)) { link.zone.data.bound = z; z.data.boundTo = link.zone; } };
  define("Soul Resurrection", DM.EFFECTS[N("Call of the Haunted")]);
  define("The Shallow Grave", { activate: { resolve: async (d, link) => {
    for (const p of [link.p, 1 - link.p]) { if (d.freeMonsterZone(p) < 0) continue; const c = await d.pickCard(p, "Set which monster from your Graveyard?", graveMonsters(d, p, (c) => !C.isExtra(c.no)));
      if (c) await d.specialSummon(p, c, { faceUp: false, defense: true }); } } } });
  define("Dimension Distortion", reviveFrom("Special Summon which removed monster?", (d, p) => d.players[p].banished, null));
  DM.EFFECTS[N("Dimension Distortion")].activate.can = (d, ctx) => !d.players[ctx.p].grave.length && H.canSummonHere(d, ctx.p) && d.players[ctx.p].banished.some((c) => C.isMonster(c.no));
  define("Battery Charger", reviveFrom("Revive which Batteryman?", (d, p) => d.players[p].grave, (c) => /Batteryman/.test(C.name(c.no)), { lp: 500 }));
  define("Change of Heart", { activate: { can: (d, ctx) => d.monsters(1 - ctx.p).length > 0 && d.freeMonsterZone(ctx.p) >= 0,
    target: (d, link) => pickMon(d, link, "Take control of which monster?", null, [1 - link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z && (await d.takeControl(z, link.p))) z.data.returnAtEnd = { to: 1 - link.p, turn: d.turn }; } } });
  define("Snatch Steal", { equip: true, activate: { can: (d, ctx) => up(d, 1 - ctx.p).length > 0 && d.freeMonsterZone(ctx.p) >= 0,
    target: (d, link) => pickMon(d, link, "Take control of which monster?", (z) => z.faceUp, [1 - link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (!z || !link.zone || !d.locate(link.zone)) { if (link.zone) link.zone.data.discard = true; return; }
      if (await d.takeControl(z, link.p)) { d.equip(link.zone, z, null); z.data.stolenBy = link.zone; z.data.returnTo = 1 - link.p; } else link.zone.data.discard = true; } },
    standby: async (d, z, p) => { if (d.turnPlayer !== p) await d.heal(1 - p, 1000); },
    onLeave: async (d, z) => { const m = z.equippedTo; if (m && d.locate(m) && m.data.returnTo != null) await d.takeControl(m, m.data.returnTo); } });

  // ----- Positions -----
  define("Stop Defense", { activate: { can: (d, ctx) => d.monsters(1 - ctx.p).some((z) => z.defense),
    target: (d, link) => pickMon(d, link, "Switch which monster to Attack Position?", (z) => z.defense, [1 - link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z) await d.changePosition(z, false); } } });
  define("Block Attack", { activate: { can: (d, ctx) => d.monsters(1 - ctx.p).some((z) => z.faceUp && !z.defense),
    target: (d, link) => pickMon(d, link, "Switch which monster to Defense Position?", (z) => z.faceUp && !z.defense, [1 - link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z) await d.changePosition(z, true); } } });
  define("Earthquake", { activate: { can: (d) => mons(d).some((z) => z.faceUp && !z.defense), resolve: async (d) => { for (const z of mons(d).filter((z) => z.faceUp)) await d.changePosition(z, true); } } });
  define("Zero Gravity", { activate: { resolve: async (d) => { for (const z of mons(d).filter((z) => z.faceUp)) await d.changePosition(z, !z.defense); } } });
  define("Desert Sunlight", { activate: { resolve: async (d, link) => { for (const z of d.monsters(link.p)) await d.changePosition(z, true); } } });
  define("Book of Taiyou", { activate: { can: (d) => mons(d).some((z) => !z.faceUp),
    target: (d, link) => pickMon(d, link, "Flip which monster face-up?", (z) => !z.faceUp),
    resolve: async (d, link) => { const z = t0(d, link); if (z && !z.faceUp) { z.defense = false; await d.flipUp(z, "effect"); } } } });
  define("Book of Moon", { activate: { can: (d) => mons(d).some((z) => z.faceUp),
    target: (d, link) => pickMon(d, link, "Turn which monster face-down?", (z) => z.faceUp),
    resolve: async (d, link) => { const z = t0(d, link); if (z && z.faceUp) { z.faceUp = false; z.defense = true; d.temp = d.temp.filter((t) => t.zone !== z); await d.emit({ type: "position", zone: z, p: d.controllerOf(z), defense: true, faceDown: true }); } } } });
  define("Swords of Revealing Light", { activate: { resolve: async (d, link) => {
    for (const z of d.monsters(1 - link.p).filter((z) => !z.faceUp)) await d.flipUp(z, "effect");
    if (link.zone) link.zone.data.turnsLeft = 3; } },
    endPhase: async (d, z, p) => { if (d.turnPlayer !== p) { z.data.turnsLeft = (z.data.turnsLeft || 3) - 1; if (z.data.turnsLeft <= 0) await d.destroy(z, "expired"); } },
    noAttack: (d, z, p, attackerP) => attackerP !== p });
  define("Dark-Piercing Light", { activate: { can: (d, ctx) => d.monsters(1 - ctx.p).some((z) => !z.faceUp), resolve: async (d, link) => { for (const z of d.monsters(1 - link.p).filter((z) => !z.faceUp)) await d.flipUp(z, "effect"); } } });

  // ----- Fusion -----
  // A Fusion Monster's materials, from its text: "A" + "B" (+ "C" ...).
  const FUSIONS = {};
  window.YUGIOH_CARDS.cards.forEach((c, no) => {
    if (!c || c[2] !== "fusion") return;
    const t = DM.text(no), names = [];
    const m = /^((?:"[^"]+"\s*\+\s*)+"[^"]+")/.exec(t);
    if (m) for (const x of m[1].matchAll(/"([^"]+)"/g)) names.push(x[1]);
    // (one whose materials aren't all in the game can't be made: Amphibious Bugroth's "Defender of the Sea")
    const nos = names.map((n) => N(n));
    if (names.length && nos.every(Boolean)) FUSIONS[no] = nos;
  });
  DM.FUSIONS = FUSIONS;
  // The fusions p can make from these cards: [{ fusion, materials: [cards] }].
  function fusionsFrom(d, p, pool, filter) {
    const out = [];
    for (const f of d.players[p].fusion) {
      const need = FUSIONS[f.no];
      if (!need || (filter && !filter(f))) continue;
      const used = [];
      const ok = need.every((no) => { const c = pool.find((x) => !used.includes(x) && x.no === no); if (c) used.push(c); return !!c; });
      if (ok) out.push({ fusion: f, materials: used });
    }
    return out;
  }
  // (the Fusion Spells ask DM.fusionsFrom, so a later section can widen what makes a Fusion: Five-Headed Dragon's five Dragons)
  DM.fusionsFrom = fusionsFrom;
  // (a Fusion's materials: those it names; or, for one made from "any" of a kind (Five-Headed Dragon's five Dragons),
  // the ones the player picks from those that can be, x.choose: { from, count })
  DM.fusionMaterials = async (d, p, x) => {
    if (!x.choose) return x.materials;
    const picked = await d.pickCards(p, "Choose " + x.choose.count + " Fusion Materials to send away for " + d.name(x.fusion) + ".", x.choose.from, null, { count: x.choose.count, min: x.choose.count });
    return picked && picked.length === x.choose.count ? picked : x.materials;
  };
  const fusionPool = (d, p) => d.players[p].hand.concat(d.monsters(p).filter((z) => z.faceUp || true).map((z) => z.card));
  const fusion = (poolFn, filter, banish) => ({ activate: {
    can: (d, ctx) => DM.fusionsFrom(d, ctx.p, poolFn(d, ctx.p).filter((c) => c !== ctx.card), filter).length > 0 && (d.freeMonsterZone(ctx.p) >= 0 || d.monsters(ctx.p).length > 0),
    resolve: async (d, link) => {
      const opts = DM.fusionsFrom(d, link.p, poolFn(d, link.p).filter((c) => c !== link.card), filter);
      const o = await d.choose(link.p, "Fusion Summon which monster?", opts.map((x) => ({ label: d.name(x.fusion), x })));
      if (!o) return;
      for (const m of await DM.fusionMaterials(d, link.p, o.x)) { if (banish) await d.banish(m, "fusion"); else await d.sendToGrave(m, "fusion"); }
      const z = await d.specialSummon(link.p, o.x.fusion, { how: "fusion", position: "choose" });
      if (z && link.data.onFused) await link.data.onFused(d, z);
    } } });
  define("Polymerization", fusion(fusionPool));
  define("Miracle Fusion", fusion((d, p) => d.players[p].grave.concat(d.monsters(p).map((z) => z.card)), (f) => /Elemental Hero/.test(C.name(f.no)), true));
  define("Dragon's Mirror", fusion((d, p) => d.players[p].grave.concat(d.monsters(p).map((z) => z.card)), (f) => C.type(f.no) === typeNo("Dragon"), true));
  define("Power Bond", fusion(fusionPool, (f) => C.type(f.no) === typeNo("Machine")));
  DM.EFFECTS[N("Power Bond")].activate.target = async (d, link) => { link.data.onFused = async (d2, z) => { d2.addTemp(z, { atk: C.atk(z.card.no) }, link.card); z.data.powerBond = { p: link.p, turn: d2.turn }; }; return true; };
  define("Fusion Gate", { activate: { resolve: async () => {} }, ignition: { repeatable: true, can: (d, ctx) => DM.fusionsFrom(d, ctx.p, fusionPool(d, ctx.p)).length > 0, resolve: async (d, link) => {
    const opts = DM.fusionsFrom(d, link.p, fusionPool(d, link.p)); const o = await d.choose(link.p, "Fusion Summon which monster?", opts.map((x) => ({ label: d.name(x.fusion), x })));
    if (!o) return; for (const m of await DM.fusionMaterials(d, link.p, o.x)) await d.banish(m, "fusion"); await d.specialSummon(link.p, o.x.fusion, { how: "fusion", position: "choose" }); } } });
  define("Cyber-Stein", { ignition: { can: (d, ctx) => d.players[ctx.p].lp > 5000 && d.players[ctx.p].fusion.length > 0 && d.freeMonsterZone(ctx.p) >= 0,
    cost: async (d, link) => { await d.payLp(link.p, 5000); return true; },
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Fusion Monster?", d.players[link.p].fusion); if (c) await d.specialSummon(link.p, c, { how: "special" }); } } });
  define("Metamorphosis", { activate: { can: (d, ctx) => d.monsters(ctx.p).some((z) => d.players[ctx.p].fusion.some((f) => C.level(f.no) === d.stats(z).level)),
    resolve: async (d, link) => {
      const z = await d.pickZone(link.p, "Tribute which monster?", (x, q) => q === link.p && d.players[link.p].fusion.some((f) => C.level(f.no) === d.stats(x).level), { sides: [link.p], area: "monster" });
      if (!z) return; const lv = d.stats(z).level; await d.sendToGrave(z.card, "tribute");
      const f = await d.pickCard(link.p, "Special Summon which Fusion Monster?", d.players[link.p].fusion, (c) => C.level(c.no) === lv); if (f) await d.specialSummon(link.p, f, { how: "special", position: "choose" }); } } });

  // ----- Ritual Spells: the monster their text names (or any of an attribute), and the levels it needs -----
  window.YUGIOH_CARDS.cards.forEach((c, no) => {
    if (!c || c[2] !== "spell" || c[8] !== DM.ICON.RITUAL) return;
    const t = DM.text(no);
    const named = /Ritual Summon "([^"]+)"|summon "([^"]+)"/.exec(t);
    const anyAttr = /Ritual Summon any (LIGHT|DARK|WATER|FIRE|EARTH|WIND) (?:Ritual )?[Mm]onster/.exec(t);
    const lv = /equals? (\d+) or more/.exec(t);
    let filter, need;
    if (named) { const n = N(named[1] || named[2]); filter = (m) => m.no === n; need = lv ? +lv[1] : (m) => C.level(m.no); }
    else if (anyAttr) { const a = ATTR[anyAttr[1]]; filter = (m) => C.attribute(m.no) === a; need = (m) => C.level(m.no); }
    else return;
    define(no, { activate: { can: (d, ctx) => H.canSummonHere(d, ctx.p) || d.monsters(ctx.p).length > 0 ? H.ritualPossible(d, ctx.p, filter, need) : false,
      resolve: async (d, link) => { await H.ritual(d, link, filter, need); } } });
  });

  // ----- Tokens -----
  define("Scapegoat", { activate: { can: (d, ctx) => d.freeMonsterZone(ctx.p) >= 0, resolve: async (d, link) => {
    for (let k = 0; k < 4; k++) await d.summonToken(link.p, { name: "Sheep Token", type: typeNo("Beast"), attribute: ATTR.EARTH, level: 1 }, { defense: true, noTribute: true });
    d.players[link.p].flags.noSummonTurn = d.turn; } } });
  define("Stray Lambs", { activate: { can: (d, ctx) => d.freeMonsterZone(ctx.p) >= 0, resolve: async (d, link) => {
    for (let k = 0; k < 2; k++) await d.summonToken(link.p, { name: "Lamb Token", type: typeNo("Beast"), attribute: ATTR.EARTH, level: 1 }, { defense: true });
    d.players[link.p].flags.noSummonTurn = d.turn; } } });
  define("Multiply", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Kuriboh")), cost: async (d, link) => {
    const z = await d.pickZone(link.p, "Tribute which Kuriboh?", (x, q) => q === link.p && x.faceUp && isName(x.card, "Kuriboh"), { sides: [link.p], area: "monster" });
    if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; },
    resolve: async (d, link) => { while (d.freeMonsterZone(link.p) >= 0) await d.summonToken(link.p, { name: "Kuriboh Token", atk: 300, def: 200, type: typeNo("Fiend"), attribute: ATTR.DARK, level: 1 }, { defense: true, noTribute: true }); } } });
  define("Multiplication of Ants", { activate: { can: (d, ctx) => d.monsters(ctx.p).some((z) => H.isType(d, z, "Insect")), cost: async (d, link) => {
    const z = await d.pickZone(link.p, "Tribute which Insect?", (x, q) => q === link.p && H.isType(d, x, "Insect"), { sides: [link.p], area: "monster" });
    if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; },
    resolve: async (d, link) => { for (let k = 0; k < 2; k++) await d.summonToken(link.p, { name: "Army Ant Token", atk: 500, def: 1200, type: typeNo("Insect"), attribute: ATTR.EARTH, level: 4 }, { noTribute: true }); } } });
  define("Ojama Trio", { activate: { can: (d, ctx) => d.freeMonsterZone(1 - ctx.p) >= 0, resolve: async (d, link) => {
    for (let k = 0; k < 3; k++) { const z = await d.summonToken(1 - link.p, { name: "Ojama Token", atk: 0, def: 1000, type: typeNo("Beast"), attribute: ATTR.LIGHT, level: 2 }, { defense: true, noTribute: true }); if (z) z.data.ojama = true; } } } });

  // ----- Continuous Spells -----
  define("Toon World", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 1000, cost: async (d, link) => { await d.payLp(link.p, 1000); return true; }, resolve: async () => {} } });
  define("Insect Barrier", { activate: { resolve: async () => {} }, noAttack: (d, z, p, ap, att) => ap !== p && H.isType(d, att, "Insect") });
  define("Messenger of Peace", { activate: { resolve: async () => {} }, noAttack: (d, z, p, ap, att) => d.atkOf(att) >= 1500,
    standby: async (d, z, p) => { if (d.turnPlayer !== p) return; if (d.players[p].lp > 100 && (await d.yesNo(p, "Pay 100 LP to keep Messenger of Peace?"))) await d.payLp(p, 100); else await d.destroy(z, "cost"); } });
  define("Gravity Bind", { activate: { resolve: async () => {} }, noAttack: (d, z, p, ap, att) => d.stats(att).level >= 4 });
  define("The Dark Door", { activate: { resolve: async () => {} }, oneAttacker: true });
  define("Toll", { activate: { resolve: async () => {} }, attackCost: 500 });
  define("Banner of Courage", { activate: { resolve: async () => {} }, aura: (d, src, sp, z, zp) => (d.phase === "battle" && d.turnPlayer === sp && zp === sp && isMon(d, z) ? { atk: 200 } : null) });
  define("Yellow Luster Shield", { activate: { resolve: async () => {} }, aura: (d, src, sp, z, zp) => (zp === sp && isMon(d, z) ? { def: 300 } : null) });
  define("Chorus of Sanctuary", { activate: { resolve: async () => {} }, aura: (d, src, sp, z) => (isMon(d, z) && z.defense ? { def: 500 } : null) });
  define("Gravekeeper's Servant", { activate: { resolve: async () => {} }, onEvent: async (d, z, p, ev) => {
    if (ev.type === "attack" && ev.p !== p && d.players[ev.p].deck.length) await d.sendToGrave(d.players[ev.p].deck[0], "effect"); } });
  define("Burning Land", { activate: { resolve: async (d, link) => H.destroyAll(d, [0, 1].map((p) => d.players[p].zones[10]).filter(Boolean)) },
    standby: async (d, z, p) => d.damage(d.turnPlayer, 500, "effect") });
  define("Solemn Wishes", { activate: { resolve: async () => {} }, onEvent: async (d, z, p, ev) => { if (ev.type === "drew" && ev.p === p) await d.heal(p, 500); } });
  define("Wave-Motion Cannon", { activate: { resolve: async (d, link) => { if (link.zone) link.zone.data.count = 0; } },
    standby: async (d, z, p) => { if (d.turnPlayer === p) z.data.count = (z.data.count || 0) + 1; },
    ignition: { can: (d, ctx) => ctx.zone && (ctx.zone.data.count || 0) > 0, resolve: async (d, link) => { const n = link.zone.data.count || 0; await d.sendToGrave(link.card, "effect"); await d.damage(1 - link.p, n * 1000, "effect"); } } });
  define("Dark Snake Syndrome", { activate: { resolve: async (d, link) => { if (link.zone) link.zone.data.dmg = 200; } },
    standby: async (d, z, p) => { if (d.turnPlayer !== p) return; const n = z.data.dmg || 200; await d.damage(p, n, "effect"); await d.damage(1 - p, n, "effect"); z.data.dmg = n * 2; } });
  define("Mass Driver", { activate: { resolve: async () => {} }, ignition: { repeatable: true, can: (d, ctx) => d.monsters(ctx.p).length > 0, cost: async (d, link) => {
    const z = await d.pickZone(link.p, "Tribute which monster?", (x, q) => q === link.p, { sides: [link.p], area: "monster", cancel: true }); if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; },
    resolve: async (d, link) => d.damage(1 - link.p, 400, "effect") } });
  define("Kishido Spirit", { activate: { resolve: async () => {} }, kishido: true });

  // ----- Field Spells this game's own templates don't read -----
  define("The Sanctuary in the Sky", { activate: { resolve: async () => {} } });
  define("A Legendary Ocean", { activate: { resolve: async () => {} }, aura: (d, src, sp, z) => (isMon(d, z) && z.faceUp && d.stats(z) && C.attribute(z.card.no) === ATTR.WATER ? { atk: 200, def: 200, level: -1 } : null) });
  define("Harpies' Hunting Ground", { activate: { resolve: async () => {} }, aura: (d, src, sp, z) => (isMon(d, z) && z.faceUp && C.type(z.card.no) === typeNo("Winged Beast") ? { atk: 200, def: 200 } : null) });
  define("Skyscraper", { activate: { resolve: async () => {} } });

  // ----- Others -----
  define("Elegant Egotist", { activate: { can: (d, ctx) => H.canSummonHere(d, ctx.p) && up(d).some((z) => isName(z.card, ["Harpie Lady", "Cyber Harpie Lady"])) && d.players[ctx.p].hand.concat(d.players[ctx.p].deck).some((c) => isName(c, ["Harpie Lady", "Harpie Lady Sisters"])),
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Harpie?", d.players[link.p].hand.concat(d.players[link.p].deck), (c) => isName(c, ["Harpie Lady", "Harpie Lady Sisters"]));
      if (c) await d.specialSummon(link.p, c, { how: "special", position: "choose" }); DM.shuffle(d, d.players[link.p].deck); } } });
  define("Dark Magic Curtain", { activate: { can: (d, ctx) => H.canSummonHere(d, ctx.p) && d.players[ctx.p].deck.some((c) => isName(c, "Dark Magician")), cost: async (d, link) => { await d.payLp(link.p, Math.floor(d.players[link.p].lp / 2)); return true; },
    resolve: async (d, link) => { const c = d.players[link.p].deck.find((c) => isName(c, "Dark Magician")); if (c) await d.specialSummon(link.p, c, { how: "special", position: "choose" }); DM.shuffle(d, d.players[link.p].deck); d.players[link.p].flags.noSummonTurn = d.turn; } } });
  define("Sage's Stone", { activate: { can: (d, ctx) => H.canSummonHere(d, ctx.p) && up(d, ctx.p).some((z) => isName(z.card, "Dark Magician Girl")) && d.players[ctx.p].hand.concat(d.players[ctx.p].deck).some((c) => isName(c, "Dark Magician")),
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Dark Magician?", d.players[link.p].hand.concat(d.players[link.p].deck), (c) => isName(c, "Dark Magician")); if (c) await d.specialSummon(link.p, c, { how: "special", position: "choose" }); DM.shuffle(d, d.players[link.p].deck); } } });
  define("Giant Trunade", { activate: { can: (d, ctx) => H.st(d).some((z) => z !== ctx.zone), resolve: async (d, link) => { for (const z of H.st(d).filter((z) => z !== link.zone)) await d.toHand(z.card, "effect"); } } });
  define("Nobleman of Crossout", { activate: { can: (d) => mons(d).some((z) => !z.faceUp), target: (d, link) => pickMon(d, link, "Destroy which face-down monster?", (z) => !z.faceUp),
    resolve: async (d, link) => { const z = t0(d, link); if (z && (await d.destroy(z, "effect"))) { const c = z.card; if (d.players[c.owner].grave.includes(c)) await d.banish(c); } } } });
  define("Nobleman of Extermination", { activate: { can: (d, ctx) => H.st(d).some((z) => !z.faceUp && z !== ctx.zone), target: (d, link) => pickST(d, link, "Destroy which face-down card?", (z) => !z.faceUp && z !== link.zone),
    resolve: async (d, link) => { const z = t0(d, link); if (z && (await d.destroy(z, "effect"))) { const c = z.card; if (d.players[c.owner].grave.includes(c)) await d.banish(c); } } } });
  define("De-Spell", { activate: { can: (d, ctx) => H.st(d).some((z) => z !== ctx.zone && (!z.faceUp || C.isSpell(z.card.no))), target: (d, link) => pickST(d, link, "Destroy which Spell Card?", (z) => z !== link.zone && (!z.faceUp || C.isSpell(z.card.no))),
    resolve: async (d, link) => { const z = t0(d, link); if (!z) return; if (C.isSpell(z.card.no)) await d.destroy(z, "effect"); else await d.emit({ type: "reveal", p: d.controllerOf(z), card: z.card }); } } });
  define("Sebek's Blessing", { activate: { when: "battle-damage", can: (d, ctx) => ctx.event && ctx.event.p !== ctx.p && ctx.event.direct !== false, resolve: async (d, link) => d.heal(link.p, link.event.amount) } });
  define("Order to Charge", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => C.kind(z.card.no) === "normal") && d.monsters(1 - ctx.p).length > 0,
    target: (d, link) => pickMon(d, link, "Tribute which Normal Monster?", (z) => z.faceUp && C.kind(z.card.no) === "normal", [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (!z) return; await d.sendToGrave(z.card, "tribute"); const t = await d.pickZone(link.p, "Destroy which monster?", (x, q) => q !== link.p, { sides: [1 - link.p], area: "monster" }); if (t) await d.destroy(t, "effect"); } } });
  define("Back to Square One", { activate: { can: (d, ctx) => d.players[ctx.p].hand.length > (ctx.fromHand ? 1 : 0) && mons(d).length > 0, cost: async (d, link) => !!(await H.discardOne(d, link.p)),
    target: (d, link) => pickMon(d, link, "Return which monster to the top of its owner's Deck?"), resolve: async (d, link) => { const z = t0(d, link); if (z) await d.toDeck(z.card, true); } } });
  define("Monster Gate", { activate: { can: (d, ctx) => d.monsters(ctx.p).length > 0, cost: async (d, link) => {
    const z = await d.pickZone(link.p, "Tribute which monster?", (x, q) => q === link.p, { sides: [link.p], area: "monster" }); if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; },
    resolve: async (d, link) => { const pl = d.players[link.p];
      while (pl.deck.length) { const c = pl.deck.shift(); await d.emit({ type: "reveal", p: link.p, card: c });
        if (C.isMonster(c.no) && !C.isExtra(c.no) && C.kind(c.no) !== "ritual") { pl.hand.push(c); await d.specialSummon(link.p, c, { how: "special", position: "choose" }); return; }
        pl.grave.push(c); } } } });
  define("Ultra Evolution Pill", { activate: { can: (d, ctx) => d.monsters(ctx.p).some((z) => H.isType(d, z, "Reptile")) && d.players[ctx.p].hand.some((c) => C.type(c.no) === typeNo("Dinosaur")),
    cost: async (d, link) => { const z = await d.pickZone(link.p, "Tribute which Reptile?", (x, q) => q === link.p && H.isType(d, x, "Reptile"), { sides: [link.p], area: "monster" }); if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; },
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Dinosaur?", d.players[link.p].hand, (c) => C.type(c.no) === typeNo("Dinosaur")); if (c) await d.specialSummon(link.p, c, { how: "special", position: "choose" }); } } });
  define("Contract with Exodia", { activate: { can: (d, ctx) => H.canSummonHere(d, ctx.p) && d.players[ctx.p].hand.some((c) => isName(c, "Exodia Necross")) && ["Exodia the Forbidden One", "Right Arm of the Forbidden One", "Left Arm of the Forbidden One", "Right Leg of the Forbidden One", "Left Leg of the Forbidden One"].every((n) => d.players[ctx.p].grave.some((c) => isName(c, n))),
    resolve: async (d, link) => { const c = d.players[link.p].hand.find((c) => isName(c, "Exodia Necross")); if (c) await d.specialSummon(link.p, c, { how: "special", position: "choose" }); } } });
  define("Final Countdown", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 2000, cost: async (d, link) => { await d.payLp(link.p, 2000); return true; },
    resolve: async (d, link) => { d.players[link.p].flags.countdown = d.turn + 19; } } });
})();

// (Traps and monsters: The Eternal Duelist Soul's handlers, by card, and GX Duel Academy's others.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo;
  const isName = (c, names) => !!c && !c.token && [].concat(names).includes(C.name(c.no));
  const up = H.up, mons = H.mons, any = H.any, isMon = H.isMon, t0 = H.t;
  const pickMon = (d, link, prompt, filter, sides) => H.target(d, link, prompt, (z, q) => (!sides || sides.includes(q)) && (!filter || filter(z, q)), { area: "monster" });
  const theirs = (ctx) => ctx.event && ctx.event.p !== ctx.p;

  // ----- Answering an attack (EffectAttackResponsePrepare / Resolve) -----
  const onAttack = (resolve, extra) => ({ activate: Object.assign({ when: "attack", can: (d, ctx) => theirs(ctx) && !!d.attack, resolve }, extra) });
  define("Mirror Force", onAttack(async (d, link) => { H.negateAttack(d); await H.destroyAll(d, d.monsters(1 - link.p).filter((z) => !z.defense)); }));
  define("Negate Attack", onAttack(async (d) => { H.negateAttack(d); H.endBattle(d); }));
  define("Magic Cylinder", onAttack(async (d, link) => { const a = d.attack && d.attack.attacker; H.negateAttack(d); if (a && d.locate(a)) await d.damage(1 - link.p, d.atkOf(a), "effect"); }));
  define("Draining Shield", onAttack(async (d, link) => { const a = d.attack && d.attack.attacker; H.negateAttack(d); if (a && d.locate(a)) await d.heal(link.p, d.atkOf(a)); }));
  define("Enchanted Javelin", onAttack(async (d, link) => { const a = d.attack && d.attack.attacker; if (a && d.locate(a)) await d.heal(link.p, d.atkOf(a)); }));
  define("Sakuretsu Armor", onAttack(async (d) => { const a = d.attack && d.attack.attacker; if (a && d.locate(a)) await d.destroy(a, "effect"); }));
  define("Widespread Ruin", onAttack(async (d, link) => { const zs = d.monsters(1 - link.p).filter((z) => z.faceUp && !z.defense); if (!zs.length) return;
    const hi = Math.max(...zs.map((z) => d.atkOf(z))); await d.destroy(zs.find((z) => d.atkOf(z) === hi), "effect"); }));
  define("Dark Mirror Force", onAttack(async (d, link) => { H.negateAttack(d); for (const z of d.monsters(1 - link.p).filter((z) => z.defense)) await d.banish(z.card, "effect"); }));
  define("Malevolent Catastrophe", onAttack(async (d, link) => H.destroyAll(d, H.st(d).filter((z) => z !== link.zone))));
  define("Waboku", { activate: { resolve: async (d, link) => { d.players[link.p].flags.waboku = d.turn; } } });
  define("Threatening Roar", { activate: { resolve: async (d, link) => { d.players[1 - link.p].flags.noAttackTurn = d.turn; if (d.attack && d.attack.p !== link.p) H.negateAttack(d); } } });
  define("Mask of Weakness", { activate: { when: "attack", can: (d, ctx) => theirs(ctx) && !!d.attack, resolve: async (d) => { const a = d.attack && d.attack.attacker; if (a && d.locate(a)) d.addTemp(a, { atk: -700 }); } } });
  define("A Hero Emerges", onAttack(async (d, link) => { const h = d.players[link.p].hand; if (!h.length) return; const c = h[Math.floor(d.rng() * h.length)];
    if (C.isMonster(c.no) && !C.isExtra(c.no) && H.canSummonHere(d, link.p)) await d.specialSummon(link.p, c, { how: "special", position: "choose" }); else await d.sendToGrave(c, "effect"); }));

  // ----- Answering a summon -----
  const onSummon = (cond, resolve, events) => ({ activate: { when: events || ["summoned", "flip-summoned", "special-summoned"], can: (d, ctx) => !!ctx.event.zone && d.locate(ctx.event.zone) && cond(d, ctx.event, ctx.p), resolve: async (d, link) => { if (link.event.zone && d.locate(link.event.zone) && cond(d, link.event, link.p)) await resolve(d, link, link.event.zone); } } });
  define("Bottomless Trap Hole", onSummon((d, ev, p) => ev.p !== p && ev.zone.faceUp && d.atkOf(ev.zone) >= 1500, async (d, link, z) => { if (await d.destroy(z, "effect")) { const c = z.card; if (d.players[c.owner].grave.includes(c)) await d.banish(c); } }));
  define("Torrential Tribute", onSummon(() => true, async (d) => H.destroyAll(d, mons(d))));
  define("Chain Destruction", onSummon((d, ev) => ev.zone.faceUp && d.atkOf(ev.zone) <= 2000, async (d, link, z) => {
    const q = d.controllerOf(z), no = z.card.no; for (const c of d.players[q].hand.concat(d.players[q].deck).filter((c) => c.no === no)) await d.sendToGrave(c, "effect"); DM.shuffle(d, d.players[q].deck); }));
  define("Chain Disappearance", onSummon((d, ev) => ev.zone.faceUp && d.atkOf(ev.zone) <= 1000, async (d, link, z) => {
    const q = d.controllerOf(z), no = z.card.no; await d.banish(z.card, "effect"); for (const c of d.players[q].hand.concat(d.players[q].deck).filter((c) => c.no === no)) await d.banish(c, "effect"); DM.shuffle(d, d.players[q].deck); }));
  define("Shadow of Eyes", onSummon((d, ev, p) => ev.p !== p, async (d, link, z) => { z.faceUp = true; z.defense = false; await d.emit({ type: "position", zone: z, p: d.controllerOf(z), defense: false }); }, ["set"]));
  define("Hidden Soldiers", onSummon((d, ev, p) => ev.p !== p && d.players[p].hand.some((c) => C.attribute(c.no) === ATTR.DARK && C.level(c.no) <= 4 && C.isMonster(c.no)),
    async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which DARK monster?", d.players[link.p].hand, (c) => C.isMonster(c.no) && C.attribute(c.no) === ATTR.DARK && C.level(c.no) <= 4); if (c) await d.specialSummon(link.p, c, { how: "special", position: "choose" }); }, ["summoned", "flip-summoned"]));
  define("D.D. Trap Hole", onSummon((d, ev, p) => ev.p !== p, async (d, link, z) => { await d.banish(z.card, "effect"); }, ["set"]));

  // ----- Counter Traps (EffectNegateChainedCardResolve) -----
  const counter = (test, cost) => ({ activate: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && test(d, ctx.last, ctx) && (!cost || cost.can(d, ctx)),
    cost: cost && cost.pay, resolve: async (d, link) => { const v = link.prev; if (!v) return; v.negated = true; if (v.zone && d.locate(v.zone)) await d.destroy(v.zone, "negated"); else if (v.card && C.isSpell(v.card.no)) { /* (from the hand: to the graveyard) */ } } } });
  const discardCost = { can: (d, ctx) => d.players[ctx.p].hand.length > 0, pay: async (d, link) => !!(await H.discardOne(d, link.p, "Discard a card.")) };
  define("Magic Jammer", counter((d, l) => C.isSpell(l.card.no), discardCost));
  define("Seven Tools of the Bandit", counter((d, l) => C.isTrap(l.card.no), { can: (d, ctx) => d.players[ctx.p].lp > 1000, pay: async (d, link) => { await d.payLp(link.p, 1000); return true; } }));
  define("Trap Jammer", counter((d, l) => C.isTrap(l.card.no) && d.phase === "battle"));
  define("Armor Break", counter((d, l) => C.isSpell(l.card.no) && C.icon(l.card.no) === DM.ICON.EQUIP));
  define("Spell-Stopping Statute", counter((d, l) => C.isSpell(l.card.no) && C.icon(l.card.no) === DM.ICON.CONTINUOUS));
  define("Royal Surrender", counter((d, l) => C.isTrap(l.card.no) && C.icon(l.card.no) === DM.ICON.CONTINUOUS));
  define("Divine Wrath", counter((d, l) => C.isMonster(l.card.no), discardCost));
  // (Answering one card by name: White Hole, Call of the Grave, Anti Raigeki, Gryphon Wing, Jar Robber; EffectSpellResponsePrepare)
  const answers = (name, resolve) => ({ activate: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && isName(ctx.last.card, name), resolve } });
  define("Call of the Grave", answers("Monster Reborn", async (d, link) => { if (link.prev) link.prev.negated = true; }));
  define("White Hole", answers("Dark Hole", async (d, link) => { if (link.prev) { const v = link.prev; v.resolve = async (d2) => H.destroyAll(d2, d2.monsters(v.p)); } }));
  define("Anti Raigeki", answers("Raigeki", async (d, link) => { if (link.prev) { const v = link.prev; v.resolve = async (d2) => H.destroyAll(d2, d2.monsters(v.p)); } }));
  define("Gryphon Wing", answers("Harpie's Feather Duster", async (d, link) => { if (link.prev) { const v = link.prev; v.resolve = async (d2) => H.destroyAll(d2, H.st(d2, v.p).filter((z) => z !== v.zone)); } }));
  define("Jar Robber", answers("Pot of Greed", async (d, link) => { if (link.prev) link.prev.negated = true; await d.drawCards(link.p, 1); }));
  define("Maryokutai", {});

  // ----- Other Traps -----

  define("Spellbinding Circle", { activate: { can: (d, ctx) => d.monsters(1 - ctx.p).length > 0, target: (d, link) => pickMon(d, link, "Bind which monster?", null, [1 - link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z && link.zone) { link.zone.data.bound = z; z.data.boundBy = link.zone; } } },
    onLeave: async (d, z) => { const m = z.data.bound; if (m) m.data.boundBy = null; } });
  define("Shadow Spell", { activate: { can: (d, ctx) => up(d, 1 - ctx.p).length > 0, target: (d, link) => pickMon(d, link, "Bind which monster?", (z) => z.faceUp, [1 - link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z && link.zone) { link.zone.data.bound = z; z.data.boundBy = link.zone; z.links.push({ from: link.zone, kind: "continuous", stats: { atk: -700 } }); } } },
    onLeave: async (d, z) => { const m = z.data.bound; if (m) m.data.boundBy = null; } });
  define("Nightmare Wheel", { activate: { can: (d, ctx) => d.monsters(1 - ctx.p).length > 0, target: (d, link) => pickMon(d, link, "Bind which monster?", null, [1 - link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z && link.zone) { link.zone.data.bound = z; z.data.boundBy = link.zone; } } },
    standby: async (d, z, p) => { if (d.turnPlayer === p) await d.damage(1 - p, 500, "effect"); },
    onLeave: async (d, z) => { const m = z.data.bound; if (m) m.data.boundBy = null; } });
  define("Time Seal", { activate: { resolve: async (d, link) => { d.players[1 - link.p].flags.skipDraw = true; } } });
  define("Reckless Greed", { activate: { resolve: async (d, link) => { await d.drawCards(link.p, 2); d.players[link.p].flags.skipDraws = 2; } } });
  define("Jar of Greed", { activate: { resolve: async (d, link) => d.drawCards(link.p, 1) } });
  define("Solomon's Lawbook", { activate: { resolve: async (d, link) => { d.players[link.p].flags.skipStandby = true; } } });
  define("Numinous Healer", { activate: { when: "lp-damage", can: (d, ctx) => ctx.event.p === ctx.p, resolve: async (d, link) => d.heal(link.p, 1000 + 500 * d.players[link.p].grave.filter((c) => isName(c, "Numinous Healer")).length) } });
  define("Attack and Receive", { activate: { when: "lp-damage", can: (d, ctx) => ctx.event.p === ctx.p, resolve: async (d, link) => d.damage(1 - link.p, 700 + 300 * d.players[link.p].grave.filter((c) => isName(c, "Attack and Receive")).length, "effect") } });
  define("Ceasefire", { activate: { resolve: async (d, link) => { for (const z of mons(d).filter((z) => !z.faceUp)) { z.faceUp = true; await d.emit({ type: "flip", zone: z, p: d.controllerOf(z), how: "no-effect" }); }
    await d.damage(1 - link.p, 500 * mons(d).filter((z) => C.kind(z.card.no) === "effect").length, "effect"); } } });
  define("The Spell Absorbing Life", { activate: { resolve: async (d, link) => { for (const z of mons(d).filter((z) => !z.faceUp)) { z.faceUp = true; await d.emit({ type: "flip", zone: z, p: d.controllerOf(z), how: "no-effect" }); }
    await d.heal(link.p, 400 * mons(d).filter((z) => C.kind(z.card.no) === "effect").length); } } });
  define("Backup Soldier", { activate: { can: (d, ctx) => H.graveMon(d, ctx.p).length >= 5, resolve: async (d, link) => {
    const cs = await d.pickCards(link.p, "Add up to 3 monsters to your hand.", H.graveMon(d, link.p, (c) => C.kind(c.no) === "normal" && C.atk(c.no) <= 1500), null, { count: 3, min: 0 }); for (const c of cs || []) await d.toHand(c); } } });
  define("Raigeki Break", { activate: { can: (d, ctx) => d.players[ctx.p].hand.length > 0 && any(d, (z) => z !== ctx.zone), cost: async (d, link) => !!(await H.discardOne(d, link.p)),
    target: (d, link) => H.target(d, link, "Destroy which card?", (z) => z !== link.zone), resolve: async (d, link) => { const z = t0(d, link); if (z) await d.destroy(z, "effect"); } } });
  define("Compulsory Evacuation Device", { activate: { can: (d) => mons(d).length > 0, target: (d, link) => pickMon(d, link, "Return which monster to its owner's hand?"), resolve: async (d, link) => { const z = t0(d, link); if (z) await d.toHand(z.card); } } });
  define("Ring of Destruction", { activate: { can: (d) => up(d).length > 0, target: (d, link) => pickMon(d, link, "Destroy which monster?", (z) => z.faceUp),
    resolve: async (d, link) => { const z = t0(d, link); if (!z) return; const a = d.atkOf(z); if (await d.destroy(z, "effect")) { await d.damage(0, a, "effect"); await d.damage(1, a, "effect"); } } } });
  define("Destruction Ring", { activate: { can: (d, ctx) => up(d, ctx.p).length > 0, target: (d, link) => pickMon(d, link, "Destroy which of your monsters?", (z) => z.faceUp, [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z && (await d.destroy(z, "effect"))) await d.together(async () => { await d.damage(0, 1000, "effect"); await d.damage(1, 1000, "effect"); }); } } });
  define("Altar for Tribute", { activate: { can: (d, ctx) => d.monsters(ctx.p).length > 0, target: (d, link) => pickMon(d, link, "Send which monster to the Graveyard?", null, [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z) { const a = C.atk(z.card.no); await d.sendToGrave(z.card, "effect"); await d.heal(link.p, a); } } } });
  define("Michizure", { activate: { when: "monster-to-grave", can: (d, ctx) => ctx.event.p === ctx.p && mons(d).length > 0, target: (d, link) => pickMon(d, link, "Destroy which monster?"), resolve: async (d, link) => { const z = t0(d, link); if (z) await d.destroy(z, "effect"); } } });
  define("Self-Destruct Button", { activate: { can: (d, ctx) => d.players[1 - ctx.p].lp - d.players[ctx.p].lp >= 7000, resolve: async (d) => { d.players[0].lp = 0; d.players[1].lp = 0; d.checkWin(); } } });
  define("Frozen Soul", { activate: { can: (d, ctx) => d.players[1 - ctx.p].lp - d.players[ctx.p].lp >= 2000, resolve: async (d, link) => { d.players[1 - link.p].flags.skipBattle = true; } } });
  define("DNA Surgery", { activate: { resolve: async (d, link) => { const o = await d.choose(link.p, "Declare a Type.", DM.TYPESLIST()); if (o && link.zone) link.zone.data.type = o.value; } },
    aura: (d, src, sp, z) => (isMon(d, z) && z.faceUp && src.data.type ? { type: src.data.type } : null) });
  define("DNA Transplant", { activate: { resolve: async (d, link) => { const o = await d.choose(link.p, "Declare an Attribute.", ["LIGHT", "DARK", "WATER", "FIRE", "EARTH", "WIND"].map((a) => ({ label: a, value: ATTR[a] }))); if (o && link.zone) link.zone.data.attr = o.value; } },
    aura: (d, src, sp, z) => (isMon(d, z) && z.faceUp && src.data.attr ? { attribute: src.data.attr } : null) });
  define("Royal Decree", { activate: { resolve: async () => {} }, negatesTraps: true });
  define("Imperial Order", { activate: { resolve: async () => {} }, negatesSpells: true,
    standby: async (d, z, p) => { if (d.turnPlayer !== p) return; if (d.players[p].lp > 700 && (await d.yesNo(p, "Pay 700 LP to keep Imperial Order?"))) await d.payLp(p, 700); else await d.destroy(z, "cost"); } });
  define("Aqua Chorus", { activate: { resolve: async () => {} }, aura: (d, src, sp, z) => (isMon(d, z) && z.faceUp && mons(d).filter((x) => x.faceUp && x.card.no === z.card.no && !z.card.token).length > 1 ? { atk: 500, def: 500 } : null) });
  define("Minor Goblin Official", { activate: { can: (d, ctx) => d.players[1 - ctx.p].lp <= 3000, resolve: async () => {} }, standby: async (d, z, p) => { if (d.turnPlayer !== p) await d.damage(d.turnPlayer, 500, "effect"); } });
  define("Coffin Seller", { activate: { resolve: async () => {} }, onEvent: async (d, z, p, ev) => { if (ev.type === "monster-to-grave" && ev.card.owner !== p) await d.damage(1 - p, 300, "effect"); } });
  define("Fatal Abacus", { activate: { resolve: async () => {} }, onEvent: async (d, z, p, ev) => { if (ev.type === "monster-to-grave") await d.damage(ev.card.owner, 500, "effect"); } });
  define("Spirit Barrier", { activate: { resolve: async () => {} }, noBattleDamageFor: (d, z, p) => d.monsters(p).length > 0 });
  define("Embodiment of Apophis", { activate: { can: (d, ctx) => d.freeMonsterZone(ctx.p) >= 0, resolve: async (d, link) => {
    const c = link.card; const from = d.take(c);
    const z = await d.summonToken(link.p, { name: "Embodiment of Apophis", atk: 1600, def: 1800, level: 4, type: typeNo("Reptile"), attribute: ATTR.EARTH });
    if (z) { z.card = c; c.trapMonster = true; } } } });
  define("Metal Reflect Slime", { activate: { can: (d, ctx) => d.freeMonsterZone(ctx.p) >= 0, resolve: async (d, link) => {
    const c = link.card; d.take(c);
    const z = await d.summonToken(link.p, { name: "Metal Reflect Slime", atk: 0, def: 3000, level: 10, type: typeNo("Aqua"), attribute: ATTR.WATER }, { defense: true });
    if (z) { z.card = c; z.data.cannotAttack = true; z.data.base = { atk: 0, def: 3000, level: 10, type: typeNo("Aqua"), attribute: ATTR.WATER }; } } } });
  DM.EFFECTS[N("Embodiment of Apophis")].activate.resolve = async (d, link) => {
    const c = link.card; d.take(c);
    const z = await d.placeMonster(link.p, c, { how: "special" });
    if (z) z.data.base = { atk: 1600, def: 1800, level: 4, type: typeNo("Reptile"), attribute: ATTR.EARTH };
  };
  DM.EFFECTS[N("Metal Reflect Slime")].activate.resolve = async (d, link) => {
    const c = link.card; d.take(c);
    const z = await d.placeMonster(link.p, c, { how: "special", defense: true });
    if (z) { z.data.base = { atk: 0, def: 3000, level: 10, type: typeNo("Aqua"), attribute: ATTR.WATER }; z.data.cannotAttack = true; }
  };

  // ===== Monsters =====
  // ----- Flip effects -----
  const flipDestroy = (prompt, filter, area, sides) => async (d, link) => {
    const z = await d.pickZone(link.p, prompt, (x, q, i) => x !== link.zone && (!sides || sides(link.p).includes(q)) && (!filter || filter(d, x, q, i)), { area });
    if (z) await d.destroy(z, "effect");
  };
  define("Man-Eater Bug", { flip: flipDestroy("Destroy which monster?", null, "monster") });
  define("Hane-Hane", { flip: async (d, link) => { const z = await d.pickZone(link.p, "Return which monster to its owner's hand?", (x) => x !== link.zone, { area: "monster" }); if (z) await d.toHand(z.card); } });
  define("Penguin Soldier", { flip: async (d, link) => { const zs = await d.pickZones(link.p, "Return up to 2 monsters to their owners' hands.", (x) => x !== link.zone, { area: "monster", count: 2, min: 0 }); for (const z of zs || []) if (d.locate(z)) await d.toHand(z.card); } });
  define("Mask of Darkness", { flip: async (d, link) => { const c = await d.pickCard(link.p, "Return which Trap Card to your hand?", d.players[link.p].grave, (c) => C.isTrap(c.no)); if (c) await d.toHand(c); } });
  define("Magician of Faith", { flip: async (d, link) => { const c = await d.pickCard(link.p, "Return which Spell Card to your hand?", d.players[link.p].grave, (c) => C.isSpell(c.no)); if (c) await d.toHand(c); } });
  define("Skelengel", { flip: async (d, link) => d.drawCards(link.p, 1) });
  define("Needle Worm", { flip: async (d, link) => { for (const c of d.players[1 - link.p].deck.slice(0, 5)) await d.sendToGrave(c, "effect"); } });
  define("Morphing Jar", { flip: async (d, link) => { for (const p of [link.p, 1 - link.p]) { for (const c of d.players[p].hand.slice()) await d.discard(p, c); await d.drawCards(p, 5); } } });
  define("Princess of Tsurugi", { flip: async (d, link) => d.damage(1 - link.p, 500 * H.st(d, 1 - link.p).length, "effect") });
  define("Needle Ball", { flip: async (d, link) => { if (d.players[link.p].lp > 2000 && (await d.yesNo(link.p, "Pay 2000 LP to inflict 1000 damage?"))) { await d.payLp(link.p, 2000); await d.damage(1 - link.p, 1000, "effect"); } } });
  define("Trap Master", { flip: async (d, link) => { const z = await d.pickZone(link.p, "Destroy which Trap Card?", (x, q, i) => i >= 5 && (!x.faceUp || C.isTrap(x.card.no)), { area: "spell" }); if (z && C.isTrap(z.card.no)) await d.destroy(z, "effect"); } });
  define("Armed Ninja", { flip: async (d, link) => { const z = await d.pickZone(link.p, "Destroy which Spell Card?", (x, q, i) => i >= 5 && (!x.faceUp || C.isSpell(x.card.no)), { area: "spell" }); if (z && C.isSpell(z.card.no)) await d.destroy(z, "effect"); } });
  define("Big Eye", { flip: async (d, link) => { await d.emit({ type: "look", p: link.p, cards: d.players[link.p].deck.slice(0, 5) }); } });
  define("Cyber Jar", { flip: async (d, link) => {
    await H.destroyAll(d, mons(d));
    for (const p of [link.p, 1 - link.p]) { const cs = d.players[p].deck.splice(0, 5);
      for (const c of cs) { d.players[p].hand.push(c); if (C.isMonster(c.no) && !C.isExtra(c.no) && C.level(c.no) <= 4 && d.freeMonsterZone(p) >= 0) await d.specialSummon(p, c, { how: "special", position: "choose" }); } } } });
  define("Fiber Jar", { flip: async (d) => {
    for (const p of [0, 1]) { const pl = d.players[p];
      for (const z of d.allZones(p).slice()) { const c = z.card; d.take(c); if (!c.token) d.toPile(c, "deck", c.owner, "shuffle"); }
      for (const c of pl.hand.splice(0).concat(pl.grave.splice(0))) d.toPile(c, "deck", c.owner, "shuffle"); }
    for (const p of [0, 1]) { DM.shuffle(d, d.players[p].deck); await d.drawCards(p, 5); } } });
  define("Poison Mummy", { flip: async (d, link) => d.damage(1 - link.p, 500, "effect") });
  define("4-Starred Ladybug of Doom", { flip: async (d, link) => H.destroyAll(d, up(d, 1 - link.p).filter((z) => d.stats(z).level === 4)) });
  define("Des Feral Imp", { flip: async (d, link) => { const c = await d.pickCard(link.p, "Return which card to your Deck?", d.players[link.p].grave); if (c) await d.toDeck(c, "shuffle"); } });
  define("Dice Jar", { flip: async (d, link) => { let a, b; do { a = await H.die(d, link.p); b = await H.die(d, 1 - link.p); } while (a === b);
    const loser = a < b ? link.p : 1 - link.p, w = Math.max(a, b); await d.damage(loser, w === 6 ? 6000 : w * 500, "effect"); } });
  define("Lady Assailant of Flames", { flip: async (d, link) => { const pl = d.players[link.p]; if (pl.deck.length < 3) return; for (const c of pl.deck.slice(0, 3)) await d.banish(c, "cost"); await d.damage(1 - link.p, 800, "effect"); } });
  define("Fire Sorcerer", { flip: async (d, link) => { const h = d.players[link.p].hand; if (h.length < 2) return; for (let k = 0; k < 2; k++) await d.banish(h[Math.floor(d.rng() * h.length)], "cost"); await d.damage(1 - link.p, 800, "effect"); } });
  define("Slate Warrior", { flip: async (d, link) => { if (link.zone && d.locate(link.zone)) link.zone.links.push({ kind: "self", stats: { atk: 500, def: 500 } }); } });
  define("Bubonic Vermin", { flip: async (d, link) => { const c = d.players[link.p].deck.find((c) => isName(c, "Bubonic Vermin")); if (c && H.canSummonHere(d, link.p)) await d.specialSummon(link.p, c, { faceUp: false, defense: true }); DM.shuffle(d, d.players[link.p].deck); } });
  define("Morphing Jar #2", { flip: async (d) => {
    const n = [0, 0];
    for (const p of [0, 1]) for (const z of d.monsters(p).slice()) { n[p]++; await d.toDeck(z.card, "shuffle"); }
    for (const p of [0, 1]) { const pl = d.players[p]; DM.shuffle(d, pl.deck); let got = 0;
      while (got < n[p] && pl.deck.length) { const c = pl.deck.shift(); if (C.isMonster(c.no) && !C.isExtra(c.no)) { got++; pl.hand.push(c); if (C.level(c.no) <= 4 && d.freeMonsterZone(p) >= 0) await d.specialSummon(p, c, { faceUp: false, defense: true }); } else pl.grave.push(c); } } } });

  // ----- Ignition and quick effects -----
  const once = (z, d) => z.data.usedTurn !== d.turn;
  define("Time Wizard", { ignition: { can: (d, ctx) => once(ctx.zone, d) && ctx.p === d.turnPlayer && d.monsters(1 - ctx.p).length > 0, resolve: async (d, link) => {
    if (await H.coinCall(d, link.p)) await H.destroyAll(d, d.monsters(1 - link.p));
    else { const zs = d.monsters(link.p); const half = Math.floor(zs.reduce((a, z) => a + d.atkOf(z), 0) / 2); await H.destroyAll(d, zs); await d.damage(link.p, half, "effect"); } } } });
  define("Barrel Dragon", { ignition: { can: (d, ctx) => once(ctx.zone, d) && ctx.p === d.turnPlayer && d.monsters(1 - ctx.p).length > 0, resolve: async (d, link) => {
    let h = 0; for (let k = 0; k < 3; k++) { const r = d.coin(); await d.emit({ type: "coin", p: link.p, heads: r }); if (r) h++; }
    if (h >= 2) { const z = await d.pickZone(link.p, "Destroy which monster?", (x, q) => q !== link.p, { sides: [1 - link.p], area: "monster" }); if (z) await d.destroy(z, "effect"); } } } });
  const tributeCost = (filter, prompt) => async (d, link) => {
    const z = await d.pickZone(link.p, prompt || "Tribute which monster?", (x, q) => q === link.p && x !== link.zone && (!filter || filter(d, x)), { sides: [link.p], area: "monster", cancel: true });
    if (!z) return false; link.data.tributed = { atk: d.atkOf(z), card: z.card }; await d.sendToGrave(z.card, "tribute"); return true;
  };
  define("Catapult Turtle", { ignition: { repeatable: true, can: (d, ctx) => d.monsters(ctx.p).length > 1, cost: tributeCost(), resolve: async (d, link) => d.damage(1 - link.p, Math.floor(link.data.tributed.atk / 2), "effect") } });
  define("Cannon Soldier", { ignition: { repeatable: true, can: (d, ctx) => d.monsters(ctx.p).length > 1, cost: tributeCost(), resolve: async (d, link) => d.damage(1 - link.p, 500, "effect") } });
  define("Amazoness Archer", { ignition: { repeatable: true, can: (d, ctx) => d.monsters(ctx.p).length > 2, cost: async (d, link) => (await tributeCost()(d, link)) && (await tributeCost()(d, link)), resolve: async (d, link) => d.damage(1 - link.p, 1200, "effect") } });
  define("Hysteric Fairy", { ignition: { repeatable: true, can: (d, ctx) => d.monsters(ctx.p).length > 2, cost: async (d, link) => (await tributeCost()(d, link)) && (await tributeCost()(d, link)), resolve: async (d, link) => d.heal(link.p, 1000) } });
  define("Exiled Force", { ignition: { can: (d) => mons(d).length > 1, cost: async (d, link) => { await d.sendToGrave(link.card, "tribute"); return true; },
    resolve: async (d, link) => { const z = await d.pickZone(link.p, "Destroy which monster?", () => true, { area: "monster" }); if (z) await d.destroy(z, "effect"); } } });
  define("Throwstone Unit", { ignition: { can: (d, ctx) => d.monsters(ctx.p).some((z) => z !== ctx.zone && H.isType(d, z, "Warrior")), cost: tributeCost((d, z) => H.isType(d, z, "Warrior"), "Tribute which Warrior?"),
    resolve: async (d, link) => { const a = link.zone && d.locate(link.zone) ? d.atkOf(link.zone) : 0; const z = await d.pickZone(link.p, "Destroy which monster?", (x) => x.faceUp && d.defOf(x) <= a, { area: "monster" }); if (z) await d.destroy(z, "effect"); } } });
  define("Monster Eye", { ignition: { repeatable: true, can: (d, ctx) => d.players[ctx.p].lp > 1000 && d.players[ctx.p].grave.some((c) => isName(c, "Polymerization")), cost: async (d, link) => { await d.payLp(link.p, 1000); return true; },
    resolve: async (d, link) => { const c = d.players[link.p].grave.find((c) => isName(c, "Polymerization")); if (c) await d.toHand(c); } } });
  define("Gale Dogra", { ignition: { repeatable: true, can: (d, ctx) => d.players[ctx.p].lp > 3000 && d.players[ctx.p].fusion.length > 0, cost: async (d, link) => { await d.payLp(link.p, 3000); return true; },
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Send which Fusion Monster to the Graveyard?", d.players[link.p].fusion); if (c) await d.sendToGrave(c, "effect"); } } });
  define("Karate Man", { ignition: { can: (d, ctx) => once(ctx.zone, d), resolve: async (d, link) => { if (link.zone && d.locate(link.zone)) { d.addTemp(link.zone, { atk: C.atk(link.card.no) }); link.zone.data.destroyAtEnd = d.turn; } } } });
  define("Blast Juggler", { ignition: { can: (d, ctx) => d.phase !== "battle" && up(d, 1 - ctx.p).filter((z) => d.atkOf(z) <= 1000).length > 0, cost: async (d, link) => { await d.sendToGrave(link.card, "tribute"); return true; },
    resolve: async (d, link) => { const zs = await d.pickZones(link.p, "Destroy up to 2 monsters with 1000 ATK or less.", (x) => x.faceUp && d.atkOf(x) <= 1000, { area: "monster", count: 2, min: 1 }); for (const z of zs || []) if (d.locate(z)) await d.destroy(z, "effect"); } } });
  define("Woodland Sprite", { ignition: { repeatable: true, can: (d, ctx) => ctx.zone.links.some((l) => l.kind === "equip"), resolve: async (d, link) => {
    const eqs = link.zone.links.filter((l) => l.kind === "equip").map((l) => l.from).filter((z) => d.locate(z)); for (const e of eqs) await d.sendToGrave(e.card, "cost"); await d.damage(1 - link.p, 500 * eqs.length, "effect"); } } });
  define("Swarm of Scarabs", { ignition: { can: (d, ctx) => once(ctx.zone, d) && ctx.zone.placedTurn !== d.turn, resolve: async (d, link) => { if (link.zone && d.locate(link.zone)) { link.zone.faceUp = false; link.zone.defense = true; } } },
    onSummon: async (d, z, p, how) => { if (how === "flip") { const t = await d.pickZone(p, "Destroy which monster?", (x, q) => q !== p, { sides: [1 - p], area: "monster" }); if (t) await d.destroy(t, "effect"); } } });
  define("Swarm of Locusts", { ignition: DM.EFFECTS[N("Swarm of Scarabs")].ignition,
    onSummon: async (d, z, p, how) => { if (how === "flip") { const t = await d.pickZone(p, "Destroy which Spell or Trap Card?", (x, q, i) => q !== p && i >= 5, { sides: [1 - p], area: "spell" }); if (t) await d.destroy(t, "effect"); } } });
  define("Des Lacooda", { ignition: DM.EFFECTS[N("Swarm of Scarabs")].ignition, onSummon: async (d, z, p, how) => { if (how === "flip") await d.drawCards(p, 1); } });
  define("Guardian Sphinx", { ignition: DM.EFFECTS[N("Swarm of Scarabs")].ignition, onSummon: async (d, z, p, how) => { if (how === "flip") for (const x of d.monsters(1 - p).slice()) await d.toHand(x.card); } });
  define("Giant Axe Mummy", { ignition: DM.EFFECTS[N("Swarm of Scarabs")].ignition });
  define("8-Claws Scorpion", { ignition: DM.EFFECTS[N("Swarm of Scarabs")].ignition });

  // ----- From the hand -----
  define("Thunder Dragon", { handActivate: { can: (d, ctx) => d.isMain() && d.players[ctx.p].deck.some((c) => isName(c, "Thunder Dragon")), cost: async (d, link) => { await d.discard(link.p, link.card, "cost"); return true; },
    resolve: async (d, link) => { const cs = await d.pickCards(link.p, "Add up to 2 Thunder Dragons to your hand.", d.players[link.p].deck, (c) => isName(c, "Thunder Dragon"), { count: 2, min: 1 }); for (const c of cs || []) await d.toHand(c); DM.shuffle(d, d.players[link.p].deck); } } });
  define("Kuriboh", { handQuick: { when: "attack", can: (d, ctx) => theirs(ctx) && !!d.attack, resolve: async (d, link) => { if (d.attack) d.attack.noDamageTo = link.p; } } });
  define("The Fiend Megacyber", { specialFromHand: (d, p) => d.monsters(1 - p).length - d.monsters(p).length >= 2 });

  // ----- On summon -----
  define("Dragon Seeker", { onSummon: async (d, z, p, how) => { if (how === "special") return; const t = await d.pickZone(p, "Destroy which Dragon?", (x) => x !== z && x.faceUp && H.isType(d, x, "Dragon"), { area: "monster" }); if (t) await d.destroy(t, "effect"); } });
  define("Senju of the Thousand Hands", { onSummon: async (d, z, p, how) => { if (how === "special" || !d.players[p].deck.some((c) => C.kind(c.no) === "ritual")) return; if (await d.yesNo(p, "Add a Ritual Monster from your Deck to your hand?")) await H.searchDeck(d, p, (c) => C.kind(c.no) === "ritual"); } });
  define("Sonic Bird", { onSummon: async (d, z, p, how) => { if (how === "special" || !d.players[p].deck.some((c) => C.isSpell(c.no) && C.icon(c.no) === DM.ICON.RITUAL)) return; if (await d.yesNo(p, "Add a Ritual Spell from your Deck to your hand?")) await H.searchDeck(d, p, (c) => C.isSpell(c.no) && C.icon(c.no) === DM.ICON.RITUAL); } });
  define("Berfomet", { onSummon: async (d, z, p, how) => { if (how !== "special" && d.players[p].deck.some((c) => isName(c, "Gazelle the King of Mythical Beasts")) && (await d.yesNo(p, "Add Gazelle to your hand?"))) await H.searchDeck(d, p, (c) => isName(c, "Gazelle the King of Mythical Beasts")); } });
  define("Marauding Captain", { onSummon: async (d, z, p, how) => { if (how !== "normal") return; const c = await d.pickCard(p, "Special Summon a Level 4 or lower monster from your hand?", d.players[p].hand, (c) => C.isMonster(c.no) && !C.isExtra(c.no) && C.level(c.no) <= 4, { min: 0, cancel: true }); if (c && H.canSummonHere(d, p)) await d.specialSummon(p, c, { how: "special" }); },
    protectsFromAttack: (d, s, q, z) => z !== s && H.isType(d, z, "Warrior") });
  define("Ryu-Kishin Clown", { onSummon: async (d, z, p) => { const t = await d.pickZone(p, "Change the position of which monster?", (x) => x.faceUp, { area: "monster" }); if (t) await d.changePosition(t, !t.defense); } });
  define("Byser Shock", { onSummon: async (d) => { for (const p of [0, 1]) for (const z of d.allZones(p).filter((z) => !z.faceUp)) await d.toHand(z.card); } });
  define("Copycat", { onSummon: async (d, z, p) => { const t = await d.pickZone(p, "Copy which monster's ATK and DEF?", (x, q) => q !== p && x.faceUp, { sides: [1 - p], area: "monster" }); if (t) z.data.base = { atk: C.atk(t.card.no), def: C.def(t.card.no) }; } });
  define("Total Defense Shogun", { onSummon: async (d, z, p, how) => { if (how === "normal") z.defense = true; }, attacksFromDefense: true });
  define("Dark Dust Spirit", { onSummon: async (d, z, p, how) => { if (how !== "special") await H.destroyAll(d, up(d).filter((x) => x !== z)); }, spirit: true, noSpecial: true });
  define("Mysterious Puppeteer", { onEvent: async (d, z, p, ev) => { if (["summoned", "flip-summoned"].includes(ev.type) && ev.zone !== z) await d.heal(p, 500); } });

  // ----- In battle -----
  define("White Magical Hat", { onBattleDamage: async (d, z, p) => { await H.discardRandom(d, 1 - p); } });
  define("The Bistro Butcher", { onBattleDamage: async (d, z, p) => d.drawCards(1 - p, 2) });
  define("Airknight Parshath", { piercing: true, onBattleDamage: async (d, z, p) => d.drawCards(p, 1) });
  define("Don Zaloog", { onBattleDamage: async (d, z, p) => { const o = await d.choose(p, "Don Zaloog's effect:", [{ label: "Discard a random card from their hand", v: 0 }, { label: "Send their top 2 cards to the Graveyard", v: 1 }]);
    if (!o || o.v === 0) await H.discardRandom(d, 1 - p); else for (const c of d.players[1 - p].deck.slice(0, 2)) await d.sendToGrave(c, "effect"); } });
  define("Mechanical Spider", { onAttacked: null, destroysAttribute: ATTR.DARK });
  define("D.D. Warrior", { onBattle: async (d, z, p, other) => { if (d.locate(other)) await d.banish(other.card, "effect"); if (d.locate(z)) await d.banish(z.card, "effect"); } });
  define("Wall of Illusion", { onAttacked: async (d, z, p, att) => { att.data.bounce = true; } });
  define("Kelbek", { onAttacked: async (d, z, p, att) => { att.data.bounce = true; } });
  define("Reflect Bounder", { onAttacked: async (d, z, p, att) => { if (!z.defense) { await d.damage(1 - p, d.atkOf(att), "effect"); z.data.destroyAfterBattle = true; } } });
  define("The Unhappy Maiden", { onDestroyed: async (d, z, p, why) => { if (why === "battle") H.endBattle(d); } });
  define("Obnoxious Celtic Guard", { battleImmune: (d, z, p, other) => d.atkOf(other) >= 1900 });
  define("Kaiser Glider", { battleImmune: (d, z, p, other) => d.atkOf(other) === d.atkOf(z), onDestroyed: async (d, z, p) => { const t = await d.pickZone(p, "Return which monster to its owner's hand?", () => true, { area: "monster" }); if (t) await d.toHand(t.card); } });
  define("Spear Dragon", { piercing: true, afterAttack: async (d, z) => { if (d.locate(z)) await d.changePosition(z, true); } });
  define("Goblin Attack Force", { afterAttack: async (d, z) => { z.data.toDefenseAtEnd = true; } });
  define("Sasuke Samurai", { beforeDamage: async (d, z, p, target) => { if (target && !target.faceUp) { await d.destroy(target, "effect"); return "stop"; } } });
  define("Jirai Gumo", { beforeAttack: async (d, z, p) => { if (!(await H.coinCall(d, p))) await d.payLp(p, Math.floor(d.players[p].lp / 2)); } });
  define("Dark Elf", { attackCost: 1000 });
  define("Panther Warrior", { attackTribute: true });
  define("Insect Queen", { attackTribute: true, selfStats: (d) => ({ atk: 200 * H.up(d, 0).concat(H.up(d, 1)).filter((x) => H.isType(d, x, "Insect")).length }) });
  define("Zombyra the Dark", { noDirect: true, onDestroyByBattle: async (d, z) => { z.links.push({ kind: "self", stats: { atk: -200 } }); } });
  define("Mystical Beast of Serket", { onDestroyByBattle: async (d, z, p, victim) => { z.links.push({ kind: "self", stats: { atk: 500 } }); if (d.players[victim.card.owner].grave.includes(victim.card)) await d.banish(victim.card); } });
  define("Lesser Fiend", { onDestroyByBattle: async (d, z, p, victim) => { if (d.players[victim.card.owner].grave.includes(victim.card)) await d.banish(victim.card); } });
  define("Legendary Black Belt", {});

  // ----- When it goes to the graveyard -----
  define("Sangan", { onToGrave: async (d, c, p, from) => { if (!from || from.zone == null || !H.deckMon(d, p, (x) => C.atk(x.no) <= 1500).length) return; await H.searchDeck(d, p, (x) => C.isMonster(x.no) && !C.isExtra(x.no) && C.atk(x.no) <= 1500, "Add which monster with 1500 or less ATK to your hand?"); } });
  define("Witch of the Black Forest", { onToGrave: async (d, c, p, from) => { if (!from || from.zone == null || !H.deckMon(d, p, (x) => C.def(x.no) <= 1500).length) return; await H.searchDeck(d, p, (x) => C.isMonster(x.no) && !C.isExtra(x.no) && C.def(x.no) <= 1500, "Add which monster with 1500 or less DEF to your hand?"); } });
  define("Cockroach Knight", { onToGrave: async (d, c) => d.toDeck(c, true, "effect") });
  define("Skull-Mark Ladybug", { onToGrave: async (d, c, p) => d.heal(p, 1000) });
  define("Giant Germ", { onDestroyed: async (d, z, p, why) => { if (why !== "battle") return; await d.damage(1 - p, 500, "effect");
    for (const c of d.players[p].deck.filter((c) => c.no === z.card.no)) { if (!H.canSummonHere(d, p)) break; await d.specialSummon(p, c, { how: "special" }); } DM.shuffle(d, d.players[p].deck); } });
  define("Nimble Momonga", { onDestroyed: async (d, z, p, why) => { if (why !== "battle") return; await d.heal(p, 1000);
    for (const c of d.players[p].deck.filter((c) => c.no === z.card.no)) { if (!H.canSummonHere(d, p)) break; await d.specialSummon(p, c, { faceUp: false, defense: true }); } DM.shuffle(d, d.players[p].deck); } });
  define("Troop Dragon", { onDestroyed: async (d, z, p) => { const c = d.players[p].deck.find((c) => isName(c, "Troop Dragon")); if (c && H.canSummonHere(d, p)) await d.specialSummon(p, c, { how: "special", position: "choose" }); DM.shuffle(d, d.players[p].deck); } });
  define("Pyramid Turtle", { onDestroyed: async (d, z, p, why) => { if (why !== "battle" || !H.canSummonHere(d, p)) return; const pool = H.deckMon(d, p, (c) => C.type(c.no) === typeNo("Zombie") && C.def(c.no) <= 2000); if (!pool.length || !(await d.yesNo(p, "Special Summon a Zombie from your Deck?"))) return;
    const c = await d.pickCard(p, "Special Summon which Zombie?", pool); if (c) await d.specialSummon(p, c, { how: "special", position: "choose" }); DM.shuffle(d, d.players[p].deck); } });
  define("Birdface", { onDestroyed: async (d, z, p, why) => { if (why === "battle" && d.players[p].deck.some((c) => isName(c, "Harpie Lady"))) await H.searchDeck(d, p, (c) => isName(c, "Harpie Lady")); } });
  define("Kryuel", { onDestroyed: async (d, z, p, why) => { if (why === "battle" && d.monsters(1 - p).length && (await H.coinCall(d, p))) { const t = await d.pickZone(p, "Destroy which monster?", (x, q) => q !== p, { sides: [1 - p], area: "monster" }); if (t) await d.destroy(t, "effect"); } } });
  define("Pinch Hopper", { onToGrave: async (d, c, p, from) => { if (!from || from.zone == null || !H.canSummonHere(d, p)) return; const x = await d.pickCard(p, "Special Summon an Insect from your hand?", d.players[p].hand, (x) => C.type(x.no) === typeNo("Insect") && C.isMonster(x.no), { min: 0, cancel: true }); if (x) await d.specialSummon(p, x, { how: "special" }); } });
  define("Zolga", { onToGrave: async (d, c, p, from, why) => { if (why === "tribute") await d.heal(p, 2000); } });
  define("Agido", {});
  define("Keldo", { onDestroyed: async (d, z, p, why) => { if (why !== "battle") return; const cs = await d.pickCards(p, "Return 2 cards from their Graveyard to their Deck.", d.players[1 - p].grave, null, { count: 2 }); for (const c of cs || []) await d.toDeck(c, "shuffle"); } });

  // ----- Standby and End Phases -----
  define("Sinister Serpent", { graveStandby: async (d, c, p) => { if (d.turnPlayer === p && (await d.yesNo(p, "Return Sinister Serpent to your hand?"))) await d.toHand(c); } });
  define("Marie the Fallen One", { graveStandby: async (d, c, p) => { if (d.turnPlayer === p) await d.heal(p, 200); } });
  define("Spirit of the Breeze", { standby: async (d, z, p) => { if (d.turnPlayer === p && !z.defense) await d.heal(p, 1000); } });
  define("Dancing Fairy", { standby: async (d, z, p) => { if (d.turnPlayer === p && z.defense) await d.heal(p, 1000); } });
  define("Cure Mermaid", { standby: async (d, z, p) => { if (d.turnPlayer === p) await d.heal(p, 800); } });
  define("Legendary Fiend", { standby: async (d, z, p) => { if (d.turnPlayer === p) z.links.push({ kind: "self", stats: { atk: 700 } }); } });
  define("The Unfriendly Amazon", { standby: async (d, z, p) => { if (d.turnPlayer !== p) return; const others = d.monsters(p).filter((x) => x !== z);
    if (!others.length) { await d.destroy(z, "cost"); return; } const t = await d.pickZone(p, "Tribute a monster to keep The Unfriendly Amazon.", (x, q) => q === p && x !== z, { sides: [p], area: "monster" }); if (t) await d.sendToGrave(t.card, "tribute"); else await d.destroy(z, "cost"); } });
  for (const n of ["Inaba White Rabbit", "Yata-Garasu", "Susa Soldier", "Yamata Dragon", "Great Long Nose", "Hino-Kagu-Tsuchi", "Fushi No Tori", "Dark Dust Spirit"]) {
    define(n, { spirit: true, noSpecial: true });
  }
  Object.assign(DM.EFFECTS[N("Inaba White Rabbit")], { directAttack: true });
  Object.assign(DM.EFFECTS[N("Yata-Garasu")], { onBattleDamage: async (d, z, p) => { d.players[1 - p].flags.skipDraw = true; } });
  Object.assign(DM.EFFECTS[N("Yamata Dragon")], { onBattleDamage: async (d, z, p) => { const n = 5 - d.players[p].hand.length; if (n > 0) await d.drawCards(p, n); } });
  Object.assign(DM.EFFECTS[N("Great Long Nose")], { onBattleDamage: async (d, z, p) => { d.players[1 - p].flags.skipBattle = true; } });
  Object.assign(DM.EFFECTS[N("Fushi No Tori")], { onBattleDamage: async (d, z, p, other, amount) => d.heal(p, amount || 0) });
  Object.assign(DM.EFFECTS[N("Susa Soldier")], { halfDamage: true });

  // ----- Stats: their own (GetZoneCardStats's card cases) -----
  const self = (fn) => ({ selfStats: fn });
  const count = (d, filter, sides) => (sides || [0, 1]).reduce((n, q) => n + d.monsters(q).filter((z) => z.faceUp && filter(z)).length, 0);
  define("Swamp Battleguard", self((d, z) => ({ atk: 500 * count(d, (x) => isName(x.card, "Lava Battleguard"), [d.controllerOf(z)]) })));
  define("Lava Battleguard", self((d, z) => ({ atk: 500 * count(d, (x) => isName(x.card, "Swamp Battleguard"), [d.controllerOf(z)]) })));
  define("Wodan the Resident of the Forest", self((d) => ({ atk: 100 * count(d, (x) => C.type(x.card.no) === typeNo("Plant")) })));
  define("Shadow Ghoul", self((d, z) => ({ atk: 100 * H.graveMon(d, d.controllerOf(z)).length })));
  define("Harpie's Pet Dragon", self((d) => { const n = 300 * count(d, (x) => isName(x.card, ["Harpie Lady", "Cyber Harpie Lady"])); return { atk: n, def: n }; }));
  define("Machine King", self((d) => ({ atk: 100 * count(d, (x) => C.type(x.card.no) === typeNo("Machine")) })));
  define("Muka Muka", self((d, z) => { const n = 300 * d.players[d.controllerOf(z)].hand.length; return { atk: n, def: n }; }));
  define("Flash Assailant", self((d, z) => { const n = -400 * d.players[d.controllerOf(z)].hand.length; return { atk: n, def: n }; }));
  define("Maha Vailo", self((d, z) => ({ atk: 500 * z.links.filter((l) => l.kind === "equip").length })));
  define("Dark Magician Girl", self((d) => ({ atk: 300 * [0, 1].reduce((n, q) => n + d.players[q].grave.filter((c) => isName(c, ["Dark Magician", "Magician of Black Chaos"])).length, 0) })));
  define("Buster Blader", self((d, z) => { const q = 1 - d.controllerOf(z); return { atk: 500 * (count(d, (x) => C.type(x.card.no) === typeNo("Dragon"), [q]) + d.players[q].grave.filter((c) => C.type(c.no) === typeNo("Dragon") && C.isMonster(c.no)).length) }; }));
  define("Mudora", self((d, z) => ({ atk: 200 * d.players[d.controllerOf(z)].grave.filter((c) => C.type(c.no) === typeNo("Fairy") && C.isMonster(c.no)).length })));
  define("Arsenal Bug", self((d, z) => (count(d, (x) => x !== z && C.type(x.card.no) === typeNo("Insect"), [d.controllerOf(z)]) ? null : { setAtk: 1000, setDef: 1000 })));
  define("Spirit of Flames", self((d, z) => (d.phase === "battle" && d.turnPlayer === d.controllerOf(z) ? { atk: 300 } : null)));
  define("The Rock Spirit", self((d, z) => (d.phase === "battle" && d.turnPlayer !== d.controllerOf(z) ? { atk: 300 } : null)));
  define("Fairy King Truesdale", { aura: (d, src, sp, z, zp) => (zp === sp && isMon(d, z) && z.faceUp && C.type(z.card.no) === typeNo("Plant") ? { atk: 500, def: 500 } : null) });
  define("Jinzo", { negatesTraps: true });
  define("Banisher of the Light", { graveToBanish: true });
  define("Gora Turtle", { noAttack: (d, z, p, ap, att) => d.atkOf(att) >= 1900 });

  // ----- Special Summons only / summoning conditions -----
  for (const n of ["Harpie Lady Sisters", "Metalzoa", "Red-Eyes Black Metal Dragon", "Valkyrion the Magna Warrior", "Dark Sage", "Gradius' Option",
    "Soul of Purity and Light", "Spirit of Flames", "Aqua Spirit", "The Rock Spirit", "Garuda the Wind Spirit", "Dark Magician Knight", "Dark Magician of Chaos", "Exodia Necross",
    "Gearfried the Swordmaster", "Winged Kuriboh LV10", "Spirit of the Pharaoh"]) if (N(n)) define(n, Object.assign({}, DM.EFFECTS[N(n)], { specialOnly: true }));
  for (const n of ["Manga Ryu-Ran", "Toon Mermaid", "Toon Summoned Skull", "Blue-Eyes Toon Dragon", "Toon Dark Magician Girl", "Toon Gemini Elf", "Toon Goblin Attack Force", "Toon Masked Sorcerer", "Toon Alligator", "Toon Cannon Soldier", "Toon Defense"]) {
    if (!N(n)) continue;
    define(n, { toon: true, needsField: "Toon World", attackCost: 500, directAttack: (d, z, p) => !d.monsters(1 - p).some((x) => x.faceUp && DM.EFFECTS[x.card.no] && DM.EFFECTS[x.card.no].toon), noAttackOnSummonTurn: true });
  }
  Object.assign(DM.EFFECTS[N("Toon Dark Magician Girl")] || {}, { selfStats: DM.EFFECTS[N("Dark Magician Girl")].selfStats });
  Object.assign(DM.EFFECTS[N("Swift Gaia the Fierce Knight")] = DM.EFFECTS[N("Swift Gaia the Fierce Knight")] || {}, { noTributeIfOnly: true });
  DM.TYPESLIST = () => window.YUGIOH_CARDS.types.slice(1).map((t, i) => ({ label: t, value: i + 1 }));
})();

// (The rest of GX Duel Academy's cards, from their text: Spell Counters, Union monsters, the monsters summoned by
// removing others from play, and the Spells, Traps and monsters EDS has no handler for.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo, ICON = DM.ICON;
  const ALIAS = { "Cyber Harpie Lady": "Harpie Lady", "Harpie Lady 1": "Harpie Lady", "Harpie Lady 2": "Harpie Lady", "Harpie Lady 3": "Harpie Lady" };
  const nameOf = (c) => (c && !c.token ? C.name(c.no) : "");
  const isName = (c, names) => !!c && !c.token && [].concat(names).some((n) => nameOf(c) === n || ALIAS[nameOf(c)] === n);
  const has = (c, part) => !!c && !c.token && nameOf(c).includes(part);
  const up = H.up, mons = H.mons, t0 = H.t, isMon = H.isMon;
  const isT = (no, t) => C.type(no) === typeNo(t);
  const isMonCard = (c) => C.isMonster(c.no) && !C.isExtra(c.no);
  const once = (z, d) => !!z && z.data.usedTurn !== d.turn;
  const mine = (d, ctx) => ctx.p === d.turnPlayer && d.isMain();
  const noop = { resolve: async () => {} };
  const ss = (d, p, c, opts) => d.specialSummon(p, c, Object.assign({ how: "special", position: "choose" }, opts));
  const yes = (d, p, prompt) => d.yesNo(p, prompt);
  const piles = (d, p, list) => list.reduce((a, k) => a.concat(d.players[p][k]), []);
  const others = (d, p, z) => d.allZones(p).filter((x) => x !== z);
  // (an effect that shows cards to one player: the card list, as a choice with nothing to choose)
  async function show(d, p, prompt, cards) { if (cards.length) await d.ask(p, { type: "cards", prompt, min: 1, max: 1, options: cards.map((c) => ({ label: d.name(c), card: c })) }); }
  const tributeCost = (filter, prompt) => async (d, link) => {
    const z = await d.pickZone(link.p, prompt || "Tribute which monster?", (x, q) => q === link.p && x !== link.zone && (!filter || filter(d, x)), { sides: [link.p], area: "monster", cancel: true });
    if (!z) return false;
    link.data.tributed = { atk: d.atkOf(z), def: d.defOf(z), level: d.stats(z).level, card: z.card, base: C.atk(z.card.no) };
    await d.sendToGrave(z.card, "tribute");
    return true;
  };
  const canTribute = (d, p, filter, except) => d.monsters(p).some((x) => x !== except && (!filter || filter(d, x)));
  const discardCost = (filter, prompt) => async (d, link) => !!(await H.discardOne(d, link.p, prompt || "Discard which card?", filter));
  const handCount = (d, ctx, filter) => d.players[ctx.p].hand.filter((c) => c !== ctx.card && (!filter || filter(c))).length;
  const destroyOne = async (d, p, prompt, filter, area, sides) => { const z = await d.pickZone(p, prompt, (x, q, i) => (!sides || sides.includes(q)) && (!filter || filter(x, q, i)), { area }); if (z) await d.destroy(z, "effect"); return z; };
  const searchDeck = (d, p, filter, prompt) => H.searchDeck(d, p, filter, prompt);
  const summonFromDeck = async (d, p, filter, prompt, opts) => {
    if (!H.canSummonHere(d, p)) return null;
    const pool = d.players[p].deck.filter((c) => isMonCard(c) && filter(c));
    if (!pool.length || !(await yes(d, p, prompt))) return null;
    const c = await d.pickCard(p, "Special Summon which monster?", pool);
    const z = c ? await ss(d, p, c, opts) : null;
    DM.shuffle(d, d.players[p].deck);
    return z;
  };
  const umi = (d) => d.countOnField(N("Umi")) > 0 || (![0, 1].some((q) => d.fieldZone(q)) && [0, 1].some((q) => up(d, q).some((z) => isName(z.card, "Maiden of the Aqua") && d.live(z))));
  const coins = async (d, p, n) => { let h = 0; for (let k = 0; k < n; k++) { const r = d.coin(); await d.emit({ type: "coin", p, heads: r }); if (r) h++; } return h; };

  // ---------- Spell Counters ----------
  // A card that can hold them says so (spellCounter: its most, or true for any number).
  const SC = {
    n: (z) => (z && z.counters.spell) || 0,
    can: (d, z) => { const e = DM.effectOf(z.card.no); if (!z.faceUp || !e || !e.spellCounter) return false; return e.spellCounter === true || SC.n(z) < e.spellCounter; },
    async add(d, z, k) { if (!d.locate(z)) return; const e = DM.effectOf(z.card.no), max = e && e.spellCounter !== true ? e.spellCounter : Infinity; z.counters.spell = Math.min(max, SC.n(z) + (k || 1)); await d.emit({ type: "counter", zone: z, n: z.counters.spell }); },
    total: (d, p) => d.allZones(p).reduce((a, z) => a + SC.n(z), 0),
    // (remove k from p's cards, from those p picks)
    async remove(d, p, k) {
      for (let j = 0; j < k; j++) {
        const z = await d.pickZone(p, "Remove a Spell Counter from which card?", (x, q) => q === p && SC.n(x) > 0, { sides: [p] });
        if (!z) return false;
        z.counters.spell--;
      }
      return true;
    },
    // (put one on a face-up card p picks that can hold one)
    async place(d, p, except) {
      const z = await d.pickZone(p, "Put a Spell Counter on which card?", (x) => x !== except && SC.can(d, x));
      if (z) await SC.add(d, z, 1);
    },
    // (each Spell activated: one more)
    watch: (max, extra) => Object.assign({ spellCounter: max, onEvent: async (d, z, p, ev) => { if (ev.type === "activated" && C.isSpell(ev.card.no) && ev.from !== "monster" && SC.can(d, z)) await SC.add(d, z, 1); } }, extra)
  };
  DM.SC = SC;

  // ---------- Union monsters ----------
  // Once a turn in your Main Phase: equip it to one of its monsters (an Equip Card in a Spell & Trap Zone), or
  // back as a monster in Attack Position. One Union to a monster; if the monster would be destroyed in battle,
  // the Union is destroyed instead (the engine's destroy).
  const unionOf = (z) => z.links.find((l) => l.kind === "equip" && l.from && l.from.data.union);
  function union(targets, stats, extra) {
    const okTarget = (d, x, p) => x.faceUp && isName(x.card, targets) && !unionOf(x);
    return Object.assign({
      ignition: {
        can: (d, ctx) => {
          if (!mine(d, ctx) || !once(ctx.zone, d)) return false;
          const l = d.locate(ctx.zone);
          if (l.i < 5) return d.freeSpellZone(ctx.p) >= 0 && d.monsters(ctx.p).some((x) => x !== ctx.zone && okTarget(d, x, ctx.p));
          return H.canSummonHere(d, ctx.p);
        },
        resolve: async (d, link) => {
          const z = link.zone, l = z && d.locate(z);
          if (!l) return;
          if (l.i < 5) {
            const t = await d.pickZone(link.p, "Equip " + d.name(link.card) + " to which monster?", (x, q) => q === link.p && x !== z && okTarget(d, x, q), { sides: [link.p], area: "monster" });
            if (!t) return;
            const i = d.freeSpellZone(link.p);
            if (i < 0) return;
            d.take(link.card);
            const nz = DM.newZone(link.card, { faceUp: true, placedTurn: d.turn });
            nz.data.union = true; nz.data.usedTurn = d.turn;
            d.players[link.p].zones[i] = nz;
            d.equip(nz, t, stats);
            await d.emit({ type: "equip", card: link.card, to: t });
            await d.event({ type: "equipped", p: link.p, card: link.card, zone: t });
          } else {
            const nz = await d.specialSummon(link.p, link.card, { how: "special", defense: false });
            if (nz) nz.data.usedTurn = d.turn;
          }
        }
      }
    }, extra);
  }
  define("Y-Dragon Head", union(["X-Head Cannon"], { atk: 400, def: 400 }));
  define("Z-Metal Tank", union(["X-Head Cannon", "Y-Dragon Head"], { atk: 600, def: 600 }));
  define("Pitch-Dark Dragon", union(["Dark Blade"], { atk: 400, def: 400 }, { givesPiercing: true }));
  define("Koitsu", union(["Aitsu"], { atk: 3000, def: 3000 }, { givesPiercing: true }));
  define("Doitsu", union(["Soitsu"], { atk: 2500 }));
  define("Protective Soul Ailin", union(["Indomitable Fighter Lei Lei"], null, { freesPosition: true }));
  define("Zombie Tiger", union(["Decayed Commander"], { atk: 500, def: 500 }, { equipDestroyByBattle: async (d, z, p) => { await H.discardRandom(d, 1 - p); } }));
  define("Des Dendle", union(["Vampiric Orchis"], null, { equipDestroyByBattle: async (d, z, p) => {
    await d.summonToken(p, { name: "Wicked Plant Token", atk: 800, def: 800, level: 1, type: typeNo("Plant"), attribute: ATTR.EARTH }); } }));

  // ---------- Summoned by removing monsters in the Graveyard from play ----------
  // (Inferno, Fenrir, Gigantes, Silpheed, Chaos Sorcerer, the Envoys, Megarock Dragon)
  const graveAttr = (d, p, a) => d.players[p].grave.filter((c) => C.isMonster(c.no) && C.attribute(c.no) === ATTR[a]);
  const banishFromGrave = (need) => ({
    specialOnly: true,
    specialFromHand: (d, p) => need.every(([a, n]) => graveAttr(d, p, a).length >= n),
    specialCost: async (d, p) => {
      for (const [a, n] of need) {
        const cs = await d.pickCards(p, "Remove " + n + " " + a + " monster" + (n > 1 ? "s" : "") + " in your Graveyard from play.", d.players[p].grave, (c) => C.isMonster(c.no) && C.attribute(c.no) === ATTR[a], { count: n, cancel: true });
        if (!cs || cs.length < n) return false;
        for (const c of cs) await d.banish(c, "cost");
      }
      return true;
    }
  });
  define("Inferno", Object.assign(banishFromGrave([["FIRE", 1]]), { onDestroyByBattle: async (d, z, p, v) => { if (d.players[v.card.owner].grave.includes(v.card)) await d.damage(1 - p, 1500, "effect"); } }));
  define("Fenrir", Object.assign(banishFromGrave([["WATER", 2]]), { onDestroyByBattle: async (d, z, p) => { d.players[1 - p].flags.skipDraw = true; } }));
  define("Gigantes", Object.assign(banishFromGrave([["EARTH", 1]]), { onDestroyed: async (d, z, p, why) => { if (why === "battle") await H.destroyAll(d, H.st(d)); } }));
  define("Silpheed", Object.assign(banishFromGrave([["WIND", 1]]), { onDestroyed: async (d, z, p, why) => { if (why === "battle") await H.discardRandom(d, 1 - p); } }));
  const banishOne = { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && !ctx.zone.attackedThisTurn && up(d).some((x) => x !== ctx.zone),
    resolve: async (d, link) => { const z = await d.pickZone(link.p, "Remove which face-up monster from play?", (x) => x.faceUp && x !== link.zone, { area: "monster" });
      if (z) await d.banish(z.card, "effect"); if (link.zone && d.locate(link.zone)) link.zone.data.cannotAttackTurn = d.turn; } };
  define("Chaos Sorcerer", Object.assign(banishFromGrave([["LIGHT", 1], ["DARK", 1]]), { ignition: banishOne }));
  define("Black Luster Soldier - Envoy of the Beginning", Object.assign(banishFromGrave([["LIGHT", 1], ["DARK", 1]]), {
    ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d), resolve: async (d, link) => {
      const o = await d.choose(link.p, "Envoy of the Beginning's effect:", [{ label: "Remove a monster from play", v: 0 }, { label: "Attack again if it destroys a monster", v: 1 }]);
      if (o && o.v === 1) { if (link.zone) link.zone.data.again = d.turn; return; }
      if (!link.zone.attackedThisTurn) await banishOne.resolve(d, link); } },
    onDestroyByBattle: async (d, z) => { if (z.data.again === d.turn) { z.data.again = null; z.attacks = Math.max(0, z.attacks - 1); } } }));
  define("Chaos Emperor Dragon - Envoy of the End", Object.assign(banishFromGrave([["LIGHT", 1], ["DARK", 1]]), {
    ignition: { can: (d, ctx) => mine(d, ctx) && d.players[ctx.p].lp > 1000, cost: async (d, link) => { await d.payLp(link.p, 1000); return true; }, resolve: async (d, link) => {
      let n = 0;
      for (const q of [0, 1]) { for (const c of d.players[q].hand.slice()) { await d.sendToGrave(c, "effect"); n++; } for (const z of d.allZones(q).slice()) if (d.locate(z)) { await d.sendToGrave(z.card, "effect"); n++; } }
      await d.damage(1 - link.p, 300 * n, "effect"); } } }));
  define("Megarock Dragon", { specialOnly: true, specialFromHand: (d, p) => d.players[p].grave.some((c) => C.isMonster(c.no) && isT(c.no, "Rock")),
    specialCost: async (d, p, c) => { const cs = await d.pickCards(p, "Remove Rock monsters in your Graveyard from play.", d.players[p].grave, (x) => C.isMonster(x.no) && isT(x.no, "Rock"), { count: 99, min: 1, cancel: true });
      if (!cs || !cs.length) return false; for (const x of cs) await d.banish(x, "cost"); c.megarock = cs.length; return true; },
    afterSpecial: async (d, z) => { const n = 700 * (z.card.megarock || 0); z.data.base = { atk: n, def: n }; } });

  // ---------- Summoned by a Tribute of a monster of their own ----------
  const tributeFor = (names, extra) => Object.assign({ specialOnly: true,
    specialFromHand: (d, p) => d.monsters(p).some((z) => z.faceUp && isName(z.card, names)) && (!extra || !extra.cond || extra.cond(d, p)),
    specialCost: async (d, p) => { const z = await d.pickZone(p, "Tribute which monster?", (x, q) => q === p && x.faceUp && isName(x.card, names), { sides: [p], area: "monster", cancel: true }); if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; } }, extra);
  define("Red-Eyes Darkness Dragon", tributeFor(["Red-Eyes Black Dragon"], { selfStats: (d, z) => ({ atk: 300 * d.players[d.controllerOf(z)].grave.filter((c) => C.isMonster(c.no) && isT(c.no, "Dragon")).length }) }));
  define("Master Monk", tributeFor(["Monk Fighter"], { attacks: 2 }));
  define("Ocean Dragon Lord - Neo-Daedalus", tributeFor(["Levia-Dragon - Daedalus"], {
    ignition: { can: (d, ctx) => mine(d, ctx) && H.st(d, ctx.p).some((z) => z.faceUp && isName(z.card, "Umi")), cost: async (d, link) => { const z = H.st(d, link.p).find((x) => x.faceUp && isName(x.card, "Umi")); if (!z) return false; await d.sendToGrave(z.card, "cost"); return true; },
      resolve: async (d, link) => { for (const q of [0, 1]) { for (const c of d.players[q].hand.slice()) await d.sendToGrave(c, "effect"); for (const z of d.allZones(q).slice()) if (z !== link.zone && d.locate(z)) await d.sendToGrave(z.card, "effect"); } } } }));
  define("Archlord Zerato", tributeFor(["Warrior of Zera"], { cond: (d) => d.countOnField(N("The Sanctuary in the Sky")) > 0,
    ignition: { repeatable: true, can: (d, ctx) => mine(d, ctx) && d.countOnField(N("The Sanctuary in the Sky"), ctx.p) > 0 && d.players[ctx.p].hand.some((c) => C.isMonster(c.no) && C.attribute(c.no) === ATTR.LIGHT) && d.monsters(1 - ctx.p).length > 0,
      cost: discardCost((c) => C.isMonster(c.no) && C.attribute(c.no) === ATTR.LIGHT, "Discard which LIGHT monster?"), resolve: async (d, link) => H.destroyAll(d, d.monsters(1 - link.p)) } }));
  define("Rare Metal Dragon", { specialOnly: true });
  define("Mirage Knight", { specialOnly: true, battleStats: (d, z, p, o) => ({ atk: C.atk(o.card.no) }), afterBattle: async (d, z) => { z.data.banishAtEnd = d.turn; } });
  define("Lava Golem", { specialOnly: true, specialSide: true, specialPosition: "attack",
    specialFromHand: (d, p) => d.monsters(1 - p).length >= 2,
    specialCost: async (d, p) => { const zs = await d.pickZones(p, "Tribute which 2 of your opponent's monsters?", (x, q) => q !== p, { sides: [1 - p], area: "monster", count: 2, cancel: true }); if (!zs || zs.length < 2) return false; for (const z of zs) await d.sendToGrave(z.card, "tribute"); return true; },
    afterSpecial: async (d, z, side, p) => { d.players[p].normalSummoned = true; },
    standby: async (d, z, p) => { if (d.turnPlayer === p) await d.damage(p, 1000, "effect"); } });
  // (Special Summons from the hand on a condition)
  define("Cyber Dragon", { specialFromHand: (d, p) => d.monsters(1 - p).length > 0 && d.monsters(p).length === 0 });
  define("Elemental Hero Bubbleman", { specialFromHand: (d, p) => d.players[p].hand.length === 1,
    onSummon: async (d, z, p) => { if (!d.players[p].hand.length && !others(d, p, z).length && (await yes(d, p, "Draw 2 cards with Elemental Hero Bubbleman?"))) await d.drawCards(p, 2); } });
  define("The Tricky", { specialFromHand: (d, p, c) => d.players[p].hand.length > 1, specialCost: async (d, p, c) => !!(await H.discardOne(d, p, "Discard a card to Special Summon Tricky.", (x) => x !== c)) });
  for (const [n, stat] of [["Andro Sphinx", "atk"], ["Sphinx Teleia", "def"]]) define(n, { noGraveSpecial: true, noAttackOnSummonTurn: true,
    specialFromHand: (d, p) => d.countOnField(N("Pyramid of Light")) > 0 && d.players[p].lp > 500, specialCost: async (d, p) => { await d.payLp(p, 500); return true; },
    onDestroyByBattle: async (d, z, p, v) => { if (v.defense) await d.damage(1 - p, Math.floor((stat === "atk" ? C.atk(v.card.no) : C.def(v.card.no)) / 2), "effect"); } });
  define("Theinen the Great Sphinx", { specialOnly: true,
    specialFromHand: (d, p) => d.players[p].lp > 500 && ["Andro Sphinx", "Sphinx Teleia"].every((n) => d.players[p].grave.some((c) => isName(c, n) && c.destroyedTurn === d.turn)),
    specialCost: async (d, p) => { await d.payLp(p, 500); return true; },
    afterSpecial: async (d, z, s, p) => { if (d.players[p].lp > 500 && (await yes(d, p, "Pay 500 LP to give Theinen 3000 more ATK this turn?"))) { await d.payLp(p, 500); d.addTemp(z, { atk: 3000 }); } } });
  define("Ancient Gear Golem", { noSpecial: true, piercing: true, gearLock: true });
  define("Ancient Gear Beast", { noSpecial: true, gearLock: true });
  define("Ancient Gear Soldier", { gearLock: true });
  define("The Creator", { noGraveSpecial: true, ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.players[ctx.p].hand.length > 0 && H.graveMon(d, ctx.p).length > 0 && H.canSummonHere(d, ctx.p),
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which monster from your Graveyard?", H.graveMon(d, link.p, (x) => !C.isExtra(x.no)));
      if (!c || !(await H.discardOne(d, link.p, "Discard a card for The Creator."))) return; await ss(d, link.p, c); } } });
  // (Tribute itself to bring another from the hand)
  const tributeSelfFor = (name, piles2) => ({ ignition: { can: (d, ctx) => mine(d, ctx) && piles(d, ctx.p, piles2 || ["hand"]).some((c) => isName(c, name)),
    cost: async (d, link) => { await d.sendToGrave(link.card, "tribute"); return true; },
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon " + name + ".", piles(d, link.p, piles2 || ["hand"]), (x) => isName(x, name)); if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } } });
  define("The Creator Incarnate", tributeSelfFor("The Creator"));
  define("Kaibaman", tributeSelfFor("Blue-Eyes White Dragon"));
  define("Black Dragon's Chick", tributeSelfFor("Red-Eyes Black Dragon"));
  define("Skilled White Magician", SC.watch(3, { ignition: { can: (d, ctx) => SC.n(ctx.zone) >= 3 && piles(d, ctx.p, ["hand", "deck", "grave"]).some((c) => isName(c, "Buster Blader")), cost: async (d, link) => { await d.sendToGrave(link.card, "tribute"); return true; },
    resolve: tributeSelfFor("Buster Blader", ["hand", "deck", "grave"]).ignition.resolve } }));
  define("Skilled Dark Magician", SC.watch(3, { ignition: { can: (d, ctx) => SC.n(ctx.zone) >= 3 && piles(d, ctx.p, ["hand", "deck", "grave"]).some((c) => isName(c, "Dark Magician")), cost: async (d, link) => { await d.sendToGrave(link.card, "tribute"); return true; },
    resolve: tributeSelfFor("Dark Magician", ["hand", "deck", "grave"]).ignition.resolve } }));
  define("Royal Magical Library", SC.watch(3, { ignition: { repeatable: true, can: (d, ctx) => SC.n(ctx.zone) >= 3, cost: async (d, link) => { link.zone.counters.spell -= 3; return true; }, resolve: async (d, link) => d.drawCards(link.p, 1) } }));
  define("Magical Marionette", SC.watch(true, { selfStats: (d, z) => ({ atk: 200 * SC.n(z) }),
    ignition: { repeatable: true, can: (d, ctx) => SC.n(ctx.zone) >= 2 && mons(d).length > 0, cost: async (d, link) => { link.zone.counters.spell -= 2; return true; }, resolve: async (d, link) => { await destroyOne(d, link.p, "Destroy which monster?", null, "monster"); } } }));
  define("Blast Magician", SC.watch(true, { ignition: { repeatable: true, can: (d, ctx) => SC.n(ctx.zone) > 0 && up(d).some((z) => d.atkOf(z) <= 700 * SC.n(ctx.zone)),
    resolve: async (d, link) => { const z = await d.pickZone(link.p, "Destroy which face-up monster?", (x) => x.faceUp && d.atkOf(x) <= 700 * SC.n(link.zone), { area: "monster" }); if (!z) return;
      const k = Math.max(1, Math.ceil(d.atkOf(z) / 700)); link.zone.counters.spell -= k; await d.destroy(z, "effect"); } } }));
  define("Breaker the Magical Warrior", { spellCounter: 1, onSummon: async (d, z, p, how) => { if (how === "normal") await SC.add(d, z, 1); }, selfStats: (d, z) => ({ atk: 300 * SC.n(z) }),
    ignition: { repeatable: true, can: (d, ctx) => SC.n(ctx.zone) > 0 && H.st(d).length > 0, cost: async (d, link) => { link.zone.counters.spell--; return true; },
      resolve: async (d, link) => { await destroyOne(d, link.p, "Destroy which Spell or Trap Card?", (x, q, i) => i >= 5, "spell"); } } });
  define("Hannibal Necromancer", { spellCounter: 1, onSummon: async (d, z) => SC.add(d, z, 1),
    ignition: { repeatable: true, can: (d, ctx) => SC.n(ctx.zone) > 0 && H.st(d).some((z) => z.faceUp && C.isTrap(z.card.no)), cost: async (d, link) => { link.zone.counters.spell--; return true; },
      resolve: async (d, link) => { await destroyOne(d, link.p, "Destroy which face-up Trap Card?", (x, q, i) => i >= 5 && x.faceUp && C.isTrap(x.card.no), "spell"); } } });
  define("Apprentice Magician", { spellCounter: 1, onSummon: async (d, z, p) => SC.place(d, p),
    onDestroyed: async (d, z, p, why) => { if (why === "battle") await summonFromDeck(d, p, (c) => isT(c.no, "Spellcaster") && C.level(c.no) <= 2, "Special Summon a Level 2 or lower Spellcaster from your Deck?", { faceUp: false, defense: true, position: null }); } });
  define("Magical Plant Mandragola", { flip: async (d) => { for (const q of [0, 1]) for (const z of d.allZones(q)) if (SC.can(d, z)) await SC.add(d, z, 1); } });
  define("Armor Exe", { noAttackOnSummonTurn: true, standby: async (d, z, p) => { if (SC.total(d, p) > 0 && (await yes(d, p, "Remove a Spell Counter to keep Armor Exe?"))) await SC.remove(d, p, 1); else await d.destroy(z, "cost"); } });
  define("Pitch-Black Power Stone", { spellCounter: true, activate: { stays: true, resolve: async (d, link) => { if (link.zone) { link.zone.counters.spell = 3; } } },
    ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && SC.n(ctx.zone) > 0 && [0, 1].some((q) => d.allZones(q).some((x) => x !== ctx.zone && SC.can(d, x))),
      resolve: async (d, link) => { const z = link.zone; if (!d.locate(z)) return; z.counters.spell--; await SC.place(d, link.p, z); if (!SC.n(z)) await d.destroy(z, "effect"); } } });
  define("Mega Ton Magical Cannon", { activate: { can: (d, ctx) => SC.total(d, ctx.p) >= 10, cost: async (d, link) => SC.remove(d, link.p, 10), resolve: async (d, link) => H.destroyAll(d, d.allZones(1 - link.p)) } });
  define("Exhausting Spell", { activate: { resolve: async (d) => { for (const q of [0, 1]) for (const z of d.allZones(q)) z.counters.spell = 0; } } });
  define("Miracle Restoring", { activate: { can: (d, ctx) => SC.total(d, ctx.p) >= 2 && H.canSummonHere(d, ctx.p) && d.players[ctx.p].grave.some((c) => isName(c, ["Dark Magician", "Buster Blader"])),
    cost: async (d, link) => SC.remove(d, link.p, 2), resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which monster?", d.players[link.p].grave, (c) => isName(c, ["Dark Magician", "Buster Blader"])); if (c) await ss(d, link.p, c); } } });
  define("Anti-Spell", { activate: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && C.isSpell(ctx.last.card.no) && SC.total(d, ctx.p) >= 2,
    cost: async (d, link) => SC.remove(d, link.p, 2), resolve: async (d, link) => { const v = link.prev; if (!v) return; v.negated = true; if (v.zone && d.locate(v.zone)) await d.destroy(v.zone, "negated"); } } });

  DM.REST = { isName, show, tributeCost, canTribute, discardCost, handCount, destroyOne, summonFromDeck, umi, coins, once, mine, noop, ss, piles, union, unionOf, others };
})();

// (The rest: Spells and Traps.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo, ICON = DM.ICON, SC = DM.SC;
  const { isName, show, tributeCost, canTribute, discardCost, handCount, destroyOne, umi, coins, once, mine, noop, ss, piles, others } = DM.REST;
  const up = H.up, mons = H.mons, t0 = H.t, isMon = H.isMon;
  const isT = (no, t) => C.type(no) === typeNo(t);
  const isMonCard = (c) => C.isMonster(c.no) && !C.isExtra(c.no);
  const pickMon = (d, link, prompt, filter, sides) => H.target(d, link, prompt, (z, q) => (!sides || sides.includes(q)) && (!filter || filter(z, q)), { area: "monster" });
  const theirs = (d, sp, ev) => ev.p !== sp;
  const stays = (extra) => Object.assign({ activate: Object.assign({ stays: true }, noop) }, extra);
  const icon = (z) => C.icon(z.card.no);
  // (an Equip Spell that takes a monster from a Graveyard: Autonomous Action Unit, Re-Fusion, Fulfillment of the Contract)
  const reviveEquip = (lp, side, filter, banishOnLeave) => ({ activate: {
    can: (d, ctx) => d.players[ctx.p].lp > lp && H.canSummonHere(d, ctx.p) && H.graveMon(d, side(ctx.p), filter).length > 0,
    cost: async (d, link) => { await d.payLp(link.p, lp); return true; },
    target: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which monster?", H.graveMon(d, side(link.p), filter)); if (!c) return false; link.data.c = c; return true; },
    resolve: async (d, link) => {
      const c = link.data.c;
      if (!c || !d.players[c.owner].grave.includes(c) || !link.zone || !d.locate(link.zone)) { if (link.zone) link.zone.data.discard = true; return; }
      const z = await d.specialSummon(link.p, c, { how: "special", defense: false });
      if (!z) { link.zone.data.discard = true; return; }
      d.equip(link.zone, z, null);
      link.zone.data.revived = z;
      if (!banishOnLeave) link.zone.data.boundTo = z;
      await d.event({ type: "equipped", p: link.p, card: link.card, zone: z });
    } },
    onLeave: banishOnLeave ? async (d, z) => { const m = z.data.revived; if (m && d.locate(m)) await d.banish(m.card, "effect"); } : undefined });

  // ===== Spells =====
  // (the equips whose "sent to the Graveyard" EDS handles: their boosts)
  for (const [n, st] of [["Axe of Despair", { atk: 1000 }], ["Black Pendant", { atk: 500 }], ["Horn of Light", { def: 800 }], ["Horn of the Unicorn", { atk: 700, def: 700 }],
    ["Malevolent Nuzzler", { atk: 700 }], ["Sword of Deep-Seated", { atk: 500, def: 500 }]]) define(n, DM.equip(() => true, st));
  define("Chain Energy", stays({ handCost: true }));
  define("Infinite Cards", stays({ noHandLimit: true }));
  define("Inspection", stays({ standby: async (d, z, p) => {
    const h = d.players[1 - p].hand;
    if (d.turnPlayer === p || !h.length || d.players[p].lp <= 500 || !(await d.yesNo(p, "Pay 500 LP to look at a random card in your opponent's hand?"))) return;
    await d.payLp(p, 500); await show(d, p, "A card in your opponent's hand:", [h[Math.floor(d.rng() * h.length)]]); } }));
  define("Senri Eye", stays({ standby: async (d, z, p) => {
    const top = d.players[1 - p].deck[0];
    if (d.turnPlayer !== p || !top || d.players[p].lp <= 100 || !(await d.yesNo(p, "Pay 100 LP to look at the top card of your opponent's Deck?"))) return;
    await d.payLp(p, 100); await show(d, p, "The top card of your opponent's Deck:", [top]); } }));
  define("Mask of Dispel", { activate: { stays: true, can: (d) => H.st(d).some((z) => z.faceUp && C.isSpell(z.card.no)), target: (d, link) => H.target(d, link, "Choose which face-up Spell Card?", (z, q, i) => i >= 5 && z.faceUp && C.isSpell(z.card.no) && z !== link.zone, { area: "spell" }),
    resolve: async (d, link) => { const z = t0(d, link); if (z && link.zone) { link.zone.data.bound = z; z.data.boundBy = link.zone; } else if (link.zone) link.zone.data.discard = true; } },
    standby: async (d, z, p) => { const t = z.data.bound; if (d.turnPlayer === p && t && d.locate(t)) await d.damage(d.controllerOf(t), 500, "effect"); } });
  define("Mask of the Accursed", Object.assign(DM.equip(() => true, null), { noAttack: (d, s, q, p, z) => s.equippedTo === z,
    standby: async (d, z, p) => { const t = z.equippedTo; if (d.turnPlayer === p && t && d.locate(t)) await d.damage(d.controllerOf(t), 500, "effect"); } }));
  define("Nightmare's Steelcage", stays({ noAttacksAtAll: true, endPhase: async (d, z, q) => { if (d.turnPlayer === q) return; z.data.n = (z.data.n || 0) + 1; if (z.data.n >= 2) await d.destroy(z, "effect"); } }));
  define("Card of Safe Return", stays({ onEvent: async (d, z, p, ev) => { if (ev.type === "special-summoned" && ev.p === p && ev.zone && ev.zone.data.fromPile === "grave" && ev.zone.card.owner === p) await d.drawCards(p, 1); } }));
  define("Fairy Meteor Crush", Object.assign(DM.equip(() => true, null), { givesPiercing: true }));
  define("Cyclon Laser", Object.assign(DM.equip((d, z) => isName(z.card, "Gradius"), { atk: 300 }), { givesPiercing: true }));
  define("Rod of the Mind's Eye", Object.assign(DM.equip(() => true, null), { equipBattleDamage: (d, z, zp, r, n, dealer) => (dealer && r !== zp ? { n: 1000 } : null) }));
  define("Legendary Black Belt", Object.assign(DM.equip((d, z) => isName(z.card, ["Chu-Ske the Mouse Fighter", "Monk Fighter", "Master Monk"]), null),
    { equipDestroyByBattle: async (d, z, p, v) => { if (d.players[v.card.owner].grave.includes(v.card)) await d.damage(1 - p, C.def(v.card.no), "effect"); } }));
  define("Spring of Rebirth", stays({ onEvent: async (d, z, p, ev) => { if (ev.type === "returned") await d.heal(p, 500); } }));
  define("Ground Collapse", { activate: { stays: true, can: (d) => [0, 1].reduce((n, q) => n + [0, 1, 2, 3, 4].filter((i) => !d.players[q].zones[i] && !d.closed(q, i)).length, 0) >= 2,
    resolve: async (d, link) => {
      for (let k = 0; k < 2; k++) {
        const opts = [];
        for (const q of [1 - link.p, link.p]) for (let i = 0; i < 5; i++) if (!d.players[q].zones[i] && !d.closed(q, i)) opts.push({ label: (q === link.p ? "Your" : "Their") + " Monster Zone " + (i + 1), value: { p: q, i } });
        const o = await d.choose(link.p, "Close which Monster Card Zone?", opts);
        if (o) (d.flags.closed = d.flags.closed || []).push({ src: link.zone, p: o.value.p, i: o.value.i });
      } } } });
  define("Scroll of Bewitchment", { equip: true, activate: { can: (d) => up(d).length > 0, target: (d, link) => pickMon(d, link, "Equip Scroll of Bewitchment to which monster?", (z) => z.faceUp),
    resolve: async (d, link) => { const t = t0(d, link); if (!t || !link.zone || !d.locate(link.zone)) { if (link.zone) link.zone.data.discard = true; return; }
      const o = await d.choose(link.p, "Declare an Attribute.", [1, 2, 3, 4, 5, 6].map((a) => ({ label: window.YUGIOH_CARDS.attributes[a], value: a })));
      d.equip(link.zone, t, { attribute: o ? o.value : ATTR.DARK }); await d.event({ type: "equipped", p: link.p, card: link.card, zone: t }); } } });
  define("Temple of the Kings", stays({ trapsSameTurn: true, ignition: { can: (d, ctx) => mine(d, ctx) && up(d, ctx.p).some((z) => isName(z.card, "Mystical Beast of Serket")),
    resolve: async (d, link) => { const s = up(d, link.p).find((z) => isName(z.card, "Mystical Beast of Serket")); if (!s) return; await d.sendToGrave(s.card, "cost"); if (link.zone && d.locate(link.zone)) await d.sendToGrave(link.card, "cost");
      const c = await d.pickCard(link.p, "Special Summon which monster?", piles(d, link.p, ["hand", "deck", "fusion"]), (c) => C.isMonster(c.no)); if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } } }));
  // (placed only by another card: the Spirit Messages, the Sarcophagi)
  for (const n of ['Spirit Message "I"', 'Spirit Message "N"', 'Spirit Message "A"', 'Spirit Message "L"', "The Second Sarcophagus", "The Third Sarcophagus"])
    define(n, { activate: { can: () => false, resolve: async () => {} }, placedOnly: true });
  define("Miracle Dig", { activate: { can: (d, ctx) => d.players[ctx.p].banished.filter((c) => C.isMonster(c.no)).length >= 5,
    resolve: async (d, link) => { const cs = await d.pickCards(link.p, "Return which 3 to the Graveyard?", d.players[link.p].banished, (c) => C.isMonster(c.no), { count: 3 }); for (const c of cs || []) { d.take(c); d.toPile(c, "grave"); } } } });
  define("Enchanted Arrow", { activate: { can: (d, ctx) => H.st(d, 1 - ctx.p).some((z) => z.faceUp && C.isSpell(z.card.no)),
    resolve: async (d, link) => { const n = await H.destroyAll(d, H.st(d, 1 - link.p).filter((z) => z.faceUp && C.isSpell(z.card.no))); await d.damage(1 - link.p, 500 * n, "effect"); } } });
  define("Spell Reproduction", { activate: { can: (d, ctx) => handCount(d, ctx, (c) => C.isSpell(c.no)) >= 2 && d.players[ctx.p].grave.some((c) => C.isSpell(c.no)),
    cost: async (d, link) => { for (let k = 0; k < 2; k++) if (!(await H.discardOne(d, link.p, "Send which Spell Card to the Graveyard?", (c) => C.isSpell(c.no)))) return false; return true; },
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Add which Spell Card to your hand?", d.players[link.p].grave, (c) => C.isSpell(c.no)); if (c) await d.toHand(c); } } });
  define("Dark Room of Nightmare", stays({ onEvent: async (d, z, p, ev) => { if (ev.type === "effect-damage" && ev.p === 1 - p && ev.why !== "dark-room") await d.damage(1 - p, 300, "dark-room"); } }));
  define("Autonomous Action Unit", reviveEquip(1500, (p) => 1 - p, null, false));
  define("Re-Fusion", reviveEquip(800, (p) => p, (c) => C.kind(c.no) === "fusion", true));
  define("Fulfillment of the Contract", reviveEquip(800, (p) => p, (c) => C.kind(c.no) === "ritual", true));
  define("Continuous Destruction Punch", stays({ battleResult: (d, s, sp, att, target, res, p) => { if (p !== sp && d.controllerOf(target) === sp && target.defense && d.atkOf(att) < d.defOf(target)) res.attackerDies = true; } }));
  define("Precious Cards from Beyond", stays({ onEvent: async (d, z, p, ev) => { if ((ev.type === "summoned" || ev.type === "set") && ev.p === p && ev.zone && (ev.zone.data.tributes || 0) >= 2) await d.drawCards(p, 2); } }));
  define("Token Thanksgiving", { activate: { can: (d) => mons(d).some((z) => z.card.token), resolve: async (d, link) => { const n = await H.destroyAll(d, mons(d).filter((z) => z.card.token)); await d.heal(link.p, 800 * n); } } });
  define("Morale Boost", stays({ onEvent: async (d, z, p, ev) => {
    if (ev.type === "equipped") await d.heal(ev.p, 1000);
    if ((ev.type === "sent-to-grave" || ev.type === "banished") && ev.from && ev.from.zone >= 5 && C.isSpell(ev.card.no) && C.icon(ev.card.no) === ICON.EQUIP && ev.from.z && ev.from.z.faceUp) await d.damage(ev.from.p, 1000, "effect"); } }));
  const tributeInto = (from, into, piles2) => ({ activate: {
    can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, from)) && piles(d, ctx.p, piles2).some((c) => isName(c, into)),
    cost: tributeCost((d, z) => z.faceUp && isName(z.card, from), "Tribute which " + from + "?"),
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon " + into + ".", piles(d, link.p, piles2), (c) => isName(c, into)); if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } } });
  define("Knight's Title", tributeInto("Dark Magician", "Dark Magician Knight", ["hand", "deck", "grave"]));
  define("Dedication through Light and Darkness", tributeInto("Dark Magician", "Dark Magician of Chaos", ["hand", "deck", "grave"]));
  define("Release Restraint", tributeInto("Gearfried the Iron Knight", "Gearfried the Swordmaster", ["hand", "deck"]));
  define("Heart of the Underdog", stays({ onEvent: async (d, z, p, ev) => {
    if (ev.type === "drew" && ev.p === p && ev.drawPhase && ev.card && C.kind(ev.card.no) === "normal" && (await d.yesNo(p, "Show " + d.name(ev.card) + " to draw 1 more card?"))) { await d.emit({ type: "reveal", p, card: ev.card }); await d.drawCards(p, 1, true); } } }));
  const nukeTheirs = (cond) => ({ activate: { can: (d, ctx) => cond(d, ctx.p) && d.allZones(1 - ctx.p).length > 0, resolve: async (d, link) => H.destroyAll(d, d.allZones(1 - link.p)) } });
  define("Ojama Delta Hurricane!!", nukeTheirs((d, p) => ["Ojama Green", "Ojama Yellow", "Ojama Black"].every((n) => up(d, p).some((z) => isName(z.card, n)))));
  define("Des Croaking", nukeTheirs((d, p) => up(d, p).filter((z) => isName(z.card, "Des Frog")).length >= 3));
  define("Chaos Greed", { activate: { can: (d, ctx) => d.players[ctx.p].banished.length >= 4 && !d.players[ctx.p].grave.length, resolve: async (d, link) => d.drawCards(link.p, 2) } });
  define("D. D. Borderline", stays({ noBattlePhase: (d, z, q) => !d.players[q].grave.some((c) => C.isSpell(c.no)) }));
  define("Recycle", stays({ standby: async (d, z, p) => {
    if (d.turnPlayer !== p || d.players[p].lp <= 300 || !d.players[p].grave.some((c) => !C.isMonster(c.no)) || !(await d.yesNo(p, "Pay 300 LP to put a card from your Graveyard at the bottom of your Deck?"))) return;
    await d.payLp(p, 300); const c = await d.pickCard(p, "Return which card to the bottom of your Deck?", d.players[p].grave, (c) => !C.isMonster(c.no)); if (c) await d.toDeck(c, false); } }));
  define("Primal Seed", { activate: { can: (d, ctx) => d.players[ctx.p].banished.length > 0 && up(d).some((z) => isName(z.card, ["Black Luster Soldier - Envoy of the Beginning", "Chaos Emperor Dragon - Envoy of the End"])),
    resolve: async (d, link) => { const cs = await d.pickCards(link.p, "Add which 2 cards to your hand?", d.players[link.p].banished, null, { count: 2 }); for (const c of cs || []) await d.toHand(c); } } });
  define("Soul Absorption", stays({ onEvent: async (d, z, p, ev) => { if (ev.type === "banished") await d.heal(p, 500); } }));
  define("Gryphon's Feather Duster", { activate: { can: (d, ctx) => H.st(d, ctx.p).some((z) => z !== ctx.zone), resolve: async (d, link) => { const n = await H.destroyAll(d, H.st(d, link.p).filter((z) => z !== link.zone)); await d.heal(link.p, 500 * n); } } });
  define("Dangerous Machine TYPE-6", stays({ standby: async (d, z, p) => {
    if (d.turnPlayer !== p) return;
    const r = await H.die(d, p);
    if (r === 1) await H.discardOne(d, p); else if (r === 2) await H.discardOne(d, 1 - p); else if (r === 3) await d.drawCards(p, 1); else if (r === 4) await d.drawCards(1 - p, 1);
    else if (r === 5) await destroyOne(d, p, "Destroy which of your opponent's cards?", null, undefined, [1 - p]); else await d.destroy(z, "effect"); } }));
  define("Soul Reversal", { activate: { can: (d, ctx) => d.players[ctx.p].grave.some((c) => DM.effectOf(c.no) && DM.effectOf(c.no).flip),
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Return which Flip Effect Monster to the top of your Deck?", d.players[link.p].grave, (c) => DM.effectOf(c.no) && DM.effectOf(c.no).flip); if (c) await d.toDeck(c, true); } } });
  define("7", { activate: { stays: true, resolve: async (d, link) => {
    const sevens = H.st(d, link.p).filter((z) => z.faceUp && isName(z.card, "7"));
    if (sevens.length >= 3) { await d.drawCards(link.p, 3); await H.destroyAll(d, sevens); } } },
    onToGrave: async (d, c, p, from) => { if (from && from.zone != null) await d.heal(p, 700); } });
  define("The Law of the Normal", { activate: { can: (d, ctx) => up(d, ctx.p).filter((z) => C.kind(z.card.no) === "normal" && d.stats(z).level <= 2).length >= 5,
    resolve: async (d, link) => { for (const q of [0, 1]) for (const c of d.players[q].hand.slice()) await d.discard(q, c, "effect");
      await H.destroyAll(d, [0, 1].reduce((a, q) => a.concat(d.allZones(q)), []).filter((z) => z !== link.zone && !(H.isMon(d, z) && z.faceUp && C.kind(z.card.no) === "normal" && d.stats(z).level <= 2))); } } });
  define("Inferno Tempest", { activate: { when: "battle-damage", can: (d, ctx) => ctx.event.p === ctx.p && ctx.event.amount >= 4000,
    resolve: async (d) => { for (const q of [0, 1]) for (const c of d.players[q].deck.concat(d.players[q].grave).filter((c) => C.isMonster(c.no))) await d.banish(c, "effect"); } } });
  define("Inferno Fire Blast", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Red-Eyes Black Dragon")), target: (d, link) => pickMon(d, link, "Choose which Red-Eyes B. Dragon?", (z) => z.faceUp && isName(z.card, "Red-Eyes Black Dragon"), [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (!z) return; z.data.cannotAttackTurn = d.turn; await d.damage(1 - link.p, C.atk(z.card.no), "effect"); } } });
  define("Tricky Spell 4", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "The Tricky")) && d.monsters(1 - ctx.p).length > 0,
    cost: async (d, link) => { const z = await d.pickZone(link.p, "Send which Tricky to the Graveyard?", (x, q) => q === link.p && x.faceUp && isName(x.card, "The Tricky"), { sides: [link.p], area: "monster" }); if (!z) return false; await d.sendToGrave(z.card, "cost"); return true; },
    resolve: async (d, link) => { for (let k = d.monsters(1 - link.p).length; k > 0; k--) { const z = await d.summonToken(link.p, { name: "Tricky Token", atk: 2000, def: 1200, level: 5, type: typeNo("Spellcaster"), attribute: ATTR.WIND }, { defense: true }); if (!z) break; z.data.cannotAttack = true; } } } });
  define("Mokey Mokey Smackdown", stays({ onEvent: async (d, z, p, ev) => {
    if ((ev.type === "destroyed" || ev.type === "battle-destroyed") && ev.p === p && ev.card && isT(ev.card.no, "Fairy")) for (const m of up(d, p).filter((x) => isName(x.card, "Mokey Mokey"))) d.addTemp(m, { setAtk: 3000 }); } }));
  const purge = (kind, ic) => ({ activate: { can: (d, ctx) => handCount(d, ctx) > 0 && H.st(d).some((z) => z.faceUp && C["is" + kind](z.card.no) && icon(z) === ic && z !== ctx.zone), cost: discardCost(),
    resolve: async (d, link) => H.destroyAll(d, H.st(d).filter((z) => z.faceUp && C["is" + kind](z.card.no) && icon(z) === ic && z !== link.zone)) } });
  define("Malice Dispersion", purge("Trap", ICON.CONTINUOUS));
  define("Spell Purification", purge("Spell", ICON.CONTINUOUS));
  define("Poison Fangs", stays({ onEvent: async (d, z, p, ev) => { if (ev.type === "battle-damage" && ev.p === 1 - p && ev.dealer && d.controllerOf(ev.dealer) === p && isT(ev.dealer.card.no, "Beast")) await d.damage(1 - p, 500, "effect"); } }));
  const GAIA = ["Gaia The Fierce Knight", "Swift Gaia the Fierce Knight", "Gaia the Dragon Champion"];
  define("Spiral Spear Strike", stays({ piercingFor: (d, s, sp, att, p) => p === sp && isName(att.card, GAIA),
    onEvent: async (d, z, p, ev) => { if (ev.type === "battle-damage" && ev.p === 1 - p && ev.dealer && isName(ev.dealer.card, "Gaia the Dragon Champion") && d.controllerOf(ev.dealer) === p) { await d.drawCards(p, 2); await H.discardOne(d, p); } } }));
  define("Overpowering Eye", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isT(z.card.no, "Zombie") && d.atkOf(z) <= 2000),
    target: (d, link) => pickMon(d, link, "Choose which Zombie?", (z) => z.faceUp && H.isType(d, z, "Zombie") && d.atkOf(z) <= 2000, [link.p]), resolve: async (d, link) => { const z = t0(d, link); if (z) z.data.directTurn = d.turn; } } });
  const MONKS = ["Chu-Ske the Mouse Fighter", "Monk Fighter", "Master Monk"];
  define("Kaminote Blow", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, MONKS)), resolve: async (d, link) => { for (const z of up(d, link.p).filter((x) => isName(x.card, MONKS))) z.data.killsInBattle = d.turn; } } });
  define("Transcendent Wings", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Winged Kuriboh")) && handCount(d, ctx) >= 2 && piles(d, ctx.p, ["hand", "deck"]).some((c) => isName(c, "Winged Kuriboh LV10")),
    cost: async (d, link) => { const z = up(d, link.p).find((x) => isName(x.card, "Winged Kuriboh")); if (!z) return false; await d.sendToGrave(z.card, "cost"); for (let k = 0; k < 2; k++) if (!(await H.discardOne(d, link.p, "Send which card to the Graveyard?", (c) => !isName(c, "Winged Kuriboh LV10")))) return false; return true; },
    resolve: async (d, link) => { const c = piles(d, link.p, ["hand", "deck"]).find((c) => isName(c, "Winged Kuriboh LV10")); if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } } });
  define("Bubble Shuffle", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Elemental Hero Bubbleman") && !z.defense) && up(d, 1 - ctx.p).some((z) => !z.defense),
    resolve: async (d, link) => {
      const b = await d.pickZone(link.p, "Which Elemental Hero Bubbleman?", (z, q) => q === link.p && z.faceUp && !z.defense && isName(z.card, "Elemental Hero Bubbleman"), { sides: [link.p], area: "monster" });
      const o = await d.pickZone(link.p, "Change which of their monsters to Defense Position?", (z, q) => q !== link.p && z.faceUp && !z.defense, { sides: [1 - link.p], area: "monster" });
      if (!b || !o) return; await d.changePosition(b, true); await d.changePosition(o, true); await d.sendToGrave(b.card, "tribute");
      const c = await d.pickCard(link.p, "Special Summon which Elemental Hero?", d.players[link.p].hand, (c) => isMonCard(c) && C.name(c.no).includes("Elemental Hero")); if (c) await ss(d, link.p, c); } } });
  define("Spark Blaster", Object.assign(DM.equip((d, z) => isName(z.card, "Elemental Hero Sparkman"), null), { ignition: { can: (d, ctx) => mine(d, ctx) && up(d).length > 0 && ctx.zone.equippedTo,
    resolve: async (d, link) => { const z = await d.pickZone(link.p, "Change the position of which monster?", (x) => x.faceUp, { area: "monster" }); if (z) await d.changePosition(z, !z.defense);
      if (link.zone && d.locate(link.zone)) { link.zone.data.uses = (link.zone.data.uses || 0) + 1; if (link.zone.data.uses >= 3) await d.destroy(link.zone, "effect"); } } } }));
  define("Fusion Recovery", { activate: { can: (d, ctx) => d.players[ctx.p].grave.some((c) => isName(c, "Polymerization")) && d.players[ctx.p].grave.some((c) => c.fusionMaterial && C.isMonster(c.no)),
    resolve: async (d, link) => { const g = d.players[link.p].grave; const pol = g.find((c) => isName(c, "Polymerization")); const m = await d.pickCard(link.p, "Add which Fusion Material Monster to your hand?", g, (c) => c.fusionMaterial && C.isMonster(c.no)); if (pol) await d.toHand(pol); if (m) await d.toHand(m); } } });
  define("System Down", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 1000, cost: async (d, link) => { await d.payLp(link.p, 1000); return true; },
    resolve: async (d, link) => { const q = 1 - link.p; for (const z of d.monsters(q).filter((z) => H.isType(d, z, "Machine") || (!z.faceUp && isT(z.card.no, "Machine")))) await d.banish(z.card, "effect");
      for (const c of d.players[q].grave.filter((c) => C.isMonster(c.no) && isT(c.no, "Machine"))) await d.banish(c, "effect"); } } });

  // ===== Traps =====
  define("Metalmorph", { activate: { stays: true, can: (d, ctx) => up(d).length > 0, target: (d, link) => pickMon(d, link, "Equip Metalmorph to which monster?", (z) => z.faceUp),
    resolve: async (d, link) => { const t = t0(d, link); if (!t || !t.faceUp || !link.zone || !d.locate(link.zone)) { if (link.zone) link.zone.data.discard = true; return; } d.equip(link.zone, t, { atk: 300, def: 300 }); await d.event({ type: "equipped", p: link.p, card: link.card, zone: t }); } },
    equipBattleStats: (d, z, p, o, attacking) => (attacking && o ? { atk: Math.floor(d.atkOf(o) / 2) } : null) });
  define("Tragedy", { activate: { when: "position", can: (d, ctx) => ctx.event.p !== ctx.p && ctx.event.zone && ctx.event.zone.faceUp && ctx.event.zone.defense, resolve: async (d, link) => H.destroyAll(d, d.monsters(1 - link.p).filter((z) => z.defense)) } });
  define("Call of the Dark", stays({ forbids: (d, z, r, p, c) => isName(c, "Monster Reborn") }));
  define("Magical Thorn", stays({ onEvent: async (d, z, p, ev) => { if (ev.type === "discarded" && ev.p === 1 - p && ev.why !== "hand-limit") await d.damage(1 - p, 500, "effect"); } }));
  define("Robbin' Goblin", stays({ onEvent: async (d, z, p, ev) => { if (ev.type === "battle-damage" && ev.p === 1 - p && ev.dealer && d.controllerOf(ev.dealer) === p) await H.discardRandom(d, 1 - p); } }));
  define("Robbin' Zombie", stays({ onEvent: async (d, z, p, ev) => { const c = d.players[1 - p].deck[0]; if (ev.type === "battle-damage" && ev.p === 1 - p && ev.dealer && d.controllerOf(ev.dealer) === p && c) await d.sendToGrave(c, "effect"); } }));
  define("Gamble", { activate: { can: (d, ctx) => d.players[1 - ctx.p].hand.length >= 6 && d.players[ctx.p].hand.length <= 2,
    resolve: async (d, link) => { if (await H.coinCall(d, link.p)) { const n = 5 - d.players[link.p].hand.length; if (n > 0) await d.drawCards(link.p, n); } else d.players[link.p].flags.skipTurn = true; } } });
  define("Light of Intervention", stays({ noSetMonsters: true }));
  define("Respect Play", stays({ revealsHands: "both" }));
  define("Skull Invitation", stays({ onEvent: async (d, z, p, ev) => { if (ev.type === "sent-to-grave" && ev.card && !ev.card.token) await d.damage(ev.card.owner, 300, "effect"); } }));
  define("Mask of Restrict", stays({ noTributes: true }));
  define("Fairy Box", stays({ onEvent: async (d, z, p, ev) => { if (ev.type === "attack" && ev.p === 1 - p && ev.attacker && d.locate(ev.attacker) && (await H.coinCall(d, p))) d.addTemp(ev.attacker, { setAtk: 0 }); },
    standby: async (d, z, p) => { if (d.turnPlayer !== p) return; if (d.players[p].lp > 500 && (await d.yesNo(p, "Pay 500 LP to keep Fairy Box?"))) await d.payLp(p, 500); else await d.destroy(z, "cost"); } }));
  // Destiny Board: a Spirit Message at the end of each of the other player's turns, I, N, A and L, and the duel won.
  const LETTERS = ['Spirit Message "I"', 'Spirit Message "N"', 'Spirit Message "A"', 'Spirit Message "L"'];
  async function clearBoard(d, p) {
    if (d.flags.clearingBoard) return; d.flags.clearingBoard = true;
    try { for (const z of H.st(d, p).filter((z) => isName(z.card, LETTERS.concat(["Destiny Board"])))) if (d.locate(z)) await d.sendToGrave(z.card, "effect"); } finally { d.flags.clearingBoard = false; }
  }
  define("Destiny Board", stays({
    endPhase: async (d, z, p) => {
      if (d.turnPlayer === p) return;
      const next = LETTERS.find((n) => !H.st(d, p).some((x) => isName(x.card, n)));
      const i = d.freeSpellZone(p);
      if (!next || i < 0) return;
      const c = d.players[p].hand.find((x) => isName(x, next)) || d.players[p].deck.find((x) => isName(x, next));
      if (!c) return;
      const fromDeck = d.players[p].deck.includes(c);
      d.take(c); d.players[p].zones[i] = DM.newZone(c, { faceUp: true, placedTurn: d.turn });
      await d.emit({ type: "set-spell", p, i, zone: d.players[p].zones[i], card: c });
      if (fromDeck) DM.shuffle(d, d.players[p].deck);
      if (LETTERS.every((n) => H.st(d, p).some((x) => isName(x.card, n)))) { d.players[p].flags.specialWin = "destiny"; d.checkWin(); }
    },
    onLeave: async (d, z, p) => clearBoard(d, p) }));
  for (const n of LETTERS) Object.assign(DM.EFFECTS[N(n)], { onLeave: async (d, z, p) => { if (H.st(d, p).some((x) => isName(x.card, "Destiny Board"))) await clearBoard(d, p); } });
  // The First Sarcophagus: the Second and the Third at the ends of the other player's turns, then Spirit of the Pharaoh.
  const SARC = ["The First Sarcophagus", "The Second Sarcophagus", "The Third Sarcophagus"];
  async function clearSarc(d, p) {
    if (d.flags.clearingSarc) return; d.flags.clearingSarc = true;
    try { for (const z of H.st(d, p).filter((z) => isName(z.card, SARC))) if (d.locate(z)) await d.sendToGrave(z.card, "effect"); } finally { d.flags.clearingSarc = false; }
  }
  define("The First Sarcophagus", stays({
    endPhase: async (d, z, p) => {
      if (d.turnPlayer === p) return;
      const next = SARC.find((n) => !H.st(d, p).some((x) => isName(x.card, n)));
      const i = d.freeSpellZone(p);
      if (next && i >= 0) {
        const c = d.players[p].hand.find((x) => isName(x, next)) || d.players[p].deck.find((x) => isName(x, next));
        if (c) { d.take(c); d.players[p].zones[i] = DM.newZone(c, { faceUp: true, placedTurn: d.turn }); await d.emit({ type: "set-spell", p, i, zone: d.players[p].zones[i], card: c }); DM.shuffle(d, d.players[p].deck); }
      }
      if (SARC.every((n) => H.st(d, p).some((x) => isName(x.card, n)))) {
        d.flags.clearingSarc = true;
        try { for (const x of H.st(d, p).filter((x) => isName(x.card, SARC))) await d.sendToGrave(x.card, "cost"); } finally { d.flags.clearingSarc = false; }
        const ph = piles(d, p, ["hand", "deck"]).find((c) => isName(c, "Spirit of the Pharaoh"));
        if (ph) await ss(d, p, ph); DM.shuffle(d, d.players[p].deck);
      }
    },
    onLeave: async (d, z, p) => clearSarc(d, p) }));
  for (const n of SARC.slice(1)) Object.assign(DM.EFFECTS[N(n)], { onLeave: async (d, z, p) => clearSarc(d, p) });
  define("Royal Command", stays({ negatesFlips: true }));
  define("Graverobber's Retribution", stays({ standby: async (d, z, p) => { if (d.turnPlayer === p) await d.damage(1 - p, 100 * d.players[1 - p].banished.filter((c) => C.isMonster(c.no)).length, "effect"); } }));
  define("Deal of Phantom", { activate: { can: (d) => up(d).length > 0, target: (d, link) => pickMon(d, link, "Give which monster more ATK?", (z) => z.faceUp),
    resolve: async (d, link) => { const z = t0(d, link); if (z) d.addTemp(z, { atk: 100 * H.graveMon(d, link.p).length }); } } });
  define("Blind Destruction", stays({ standby: async (d, z, p) => { if (d.turnPlayer !== p) return; const r = await H.die(d, p);
    await H.destroyAll(d, mons(d).filter((x) => x.faceUp && (r === 6 ? d.stats(x).level >= 6 : d.stats(x).level === r))); } }));
  define("Dragon's Rage", stays({ piercingFor: (d, s, sp, att, p) => p === sp && H.isType(d, att, "Dragon") }));
  define("Burst Breath", { activate: { can: (d, ctx) => d.monsters(ctx.p).some((z) => z.faceUp && H.isType(d, z, "Dragon")), cost: tributeCost((d, z) => z.faceUp && H.isType(d, z, "Dragon"), "Tribute which Dragon?"),
    resolve: async (d, link) => H.destroyAll(d, up(d).filter((z) => d.defOf(z) <= link.data.tributed.atk)) } });
  define("Exchange of the Spirit", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 1000 && d.players[ctx.p].grave.length >= 15, cost: async (d, link) => { await d.payLp(link.p, 1000); return true; },
    resolve: async (d) => { for (const q of [0, 1]) { const pl = d.players[q]; const g = pl.grave.splice(0), k = pl.deck.splice(0); pl.deck.push(...g); pl.grave.push(...k); DM.shuffle(d, pl.deck); await d.emit({ type: "shuffle", p: q }); } } } });
  define("Disappear", { activate: { can: (d, ctx) => d.players[1 - ctx.p].grave.length > 0, resolve: async (d, link) => { const c = await d.pickCard(link.p, "Remove which card from play?", d.players[1 - link.p].grave); if (c) await d.banish(c, "effect"); } } });
  define("Fiend Comedian", { activate: { resolve: async (d, link) => {
    const q = 1 - link.p;
    if (await H.coinCall(d, link.p)) { for (const c of d.players[q].grave.slice()) await d.banish(c, "effect"); }
    else for (const c of d.players[link.p].deck.slice(0, d.players[q].grave.length)) await d.sendToGrave(c, "effect"); } } });
  define("Bottomless Shifting Sand", stays({
    endPhase: async (d, z, p) => { if (d.turnPlayer === p) return; const zs = up(d); if (!zs.length) return; const hi = Math.max(...zs.map((x) => d.atkOf(x))); await H.destroyAll(d, zs.filter((x) => d.atkOf(x) === hi)); },
    standby: async (d, z, p) => { if (d.turnPlayer === p && d.players[p].hand.length <= 4) await d.destroy(z, "effect"); } }));
  // (Set to be destroyed: Statue of the Wicked, Kozaky's Self-Destruct Button)
  const whenDestroyedSet = (fn) => ({ activate: { can: () => false, resolve: async () => {} }, onToGrave: async (d, c, p, from, why) => { if (from && from.z && !from.z.faceUp && why === "destroyed") await fn(d, c, p); } });
  define("Statue of the Wicked", whenDestroyedSet(async (d, c, p) => { if (d.freeMonsterZone(p) >= 0) {
    const o = await d.choose(p, "Summon the Wicked Token in which position?", [{ label: "Attack Position", value: false }, { label: "Defense Position", value: true }]);
    await d.summonToken(p, { name: "Wicked Token", atk: 1000, def: 1000, level: 4, type: typeNo("Fiend"), attribute: ATTR.DARK }, { defense: !!(o && o.value) }); } }));
  // (whoever destroyed it: the player whose turn it is, most likely)
  define("Kozaky's Self-Destruct Button", whenDestroyedSet(async (d) => d.damage(d.turnPlayer, 1000, "effect")));
  define("Needle Wall", stays({ standby: async (d, z, p) => { if (d.turnPlayer !== p) return; let r; do r = await H.die(d, p); while (r === 6);
    const t = d.players[1 - p].zones[r - 1]; if (t) await d.destroy(t, "effect"); } }));
  define("Non Aggression Area", { activate: { when: "standby", can: (d, ctx) => ctx.event.p === ctx.p && handCount(d, ctx) > 0, cost: discardCost(),
    resolve: async (d, link) => { d.players[link.p].flags.noSummonFor = d.turn + 1; } } });
  define("Huge Revolution", { activate: { can: (d, ctx) => mine(d, ctx) && ["People Running About", "Oppressed People", "United Resistance"].every((n) => up(d, ctx.p).some((z) => isName(z.card, n))),
    resolve: async (d, link) => { const q = 1 - link.p; for (const c of d.players[q].hand.slice()) await d.sendToGrave(c, "effect"); await H.destroyAll(d, d.allZones(q)); } } });
  define("Thunder of Ruler", { activate: { when: "standby", can: (d, ctx) => ctx.event.p !== ctx.p, resolve: async (d, link) => { d.players[1 - link.p].flags.noBattleThisTurn = d.turn; } } });
  define("Meteorain", { activate: { resolve: async (d, link) => { d.players[link.p].flags.meteorain = d.turn; } } });
  define("Hidden Spellbook", { activate: { can: (d, ctx) => ctx.p === d.turnPlayer && d.players[ctx.p].grave.filter((c) => C.isSpell(c.no)).length >= 2,
    resolve: async (d, link) => { const cs = await d.pickCards(link.p, "Return which 2 Spell Cards to your Deck?", d.players[link.p].grave, (c) => C.isSpell(c.no), { count: 2 }); for (const c of cs || []) await d.toDeck(c, "shuffle"); DM.shuffle(d, d.players[link.p].deck); } } });
  define("Ray of Hope", { activate: { can: (d, ctx) => H.graveMon(d, ctx.p, (c) => C.attribute(c.no) === ATTR.LIGHT).length >= 2,
    resolve: async (d, link) => { const cs = await d.pickCards(link.p, "Return which 2 LIGHT monsters to your Deck?", H.graveMon(d, link.p, (c) => C.attribute(c.no) === ATTR.LIGHT), null, { count: 2 }); for (const c of cs || []) await d.toDeck(c, "shuffle"); DM.shuffle(d, d.players[link.p].deck); } } });
  define("Tower of Babel", stays({ spellCounter: 4, onEvent: async (d, z, p, ev) => {
    if (ev.type !== "activated" || !C.isSpell(ev.card.no) || ev.from === "monster") return;
    z.counters.spell = SC.n(z) + 1; await d.emit({ type: "counter", zone: z, n: z.counters.spell });
    if (z.counters.spell >= 4) { await d.destroy(z, "effect"); await d.damage(ev.p, 3000, "effect"); } } }));
  define("Curse of Darkness", stays({ onEvent: async (d, z, p, ev) => { if (ev.type === "activated" && C.isSpell(ev.card.no) && ev.from !== "monster") await d.damage(ev.p, 1000, "effect"); } }));
  define("Chain Burst", stays({ onEvent: async (d, z, p, ev) => { if (ev.type === "activated" && C.isTrap(ev.card.no) && ev.card !== z.card) await d.damage(ev.p, 1000, "effect"); } }));
  define("Begone, Knave!", stays({ onEvent: async (d, z, p, ev) => { if (ev.type === "battle-damage" && ev.dealer && d.locate(ev.dealer)) await d.toHand(ev.dealer.card, "effect"); } }));
  define("Des Counterblow", stays({ onEvent: async (d, z, p, ev) => { if (ev.type === "battle-damage" && ev.direct && ev.dealer && d.locate(ev.dealer)) await d.destroy(ev.dealer, "effect"); } }));
  define("Backfire", stays({ onEvent: async (d, z, p, ev) => { if ((ev.type === "destroyed" || ev.type === "battle-destroyed") && ev.p === p && ev.card && C.attribute(ev.card.no) === ATTR.FIRE && d.players[ev.card.owner].grave.includes(ev.card)) await d.damage(1 - p, 500, "effect"); } }));
  define("Light of Judgment", { activate: { can: (d, ctx) => d.countOnField(N("The Sanctuary in the Sky")) > 0 && handCount(d, ctx, (c) => C.isMonster(c.no) && C.attribute(c.no) === ATTR.LIGHT) > 0 && (d.allZones(1 - ctx.p).length || d.players[1 - ctx.p].hand.length),
    cost: discardCost((c) => C.isMonster(c.no) && C.attribute(c.no) === ATTR.LIGHT, "Discard which LIGHT monster?"),
    resolve: async (d, link) => { const q = 1 - link.p;
      const o = await d.choose(link.p, "Light of Judgment:", [d.allZones(q).length && { label: "A card on their field", v: 0 }, d.players[q].hand.length && { label: "A card in their hand", v: 1 }].filter(Boolean));
      if (o && o.v === 1) { const c = await d.pickCard(link.p, "Send which card to the Graveyard?", d.players[q].hand); if (c) await d.sendToGrave(c, "effect"); }
      else { const z = await d.pickZone(link.p, "Send which card to the Graveyard?", (x, r) => r === q, { sides: [q] }); if (z) await d.sendToGrave(z.card, "effect"); } } } });
  define("Ninjitsu Art of Transformation", { activate: { stays: true, can: (d, ctx) => up(d, ctx.p).some((z) => C.name(z.card.no).includes("Ninja")),
    cost: tributeCost((d, z) => z.faceUp && C.name(z.card.no).includes("Ninja"), "Tribute which Ninja?"),
    resolve: async (d, link) => { const lv = link.data.tributed.level + 3;
      const c = await d.pickCard(link.p, "Special Summon which monster?", piles(d, link.p, ["hand", "deck"]), (c) => isMonCard(c) && ["Beast", "Winged Beast", "Insect"].some((t) => isT(c.no, t)) && C.level(c.no) <= lv);
      DM.shuffle(d, d.players[link.p].deck);
      const z = c ? await ss(d, link.p, c) : null;
      if (z && link.zone) link.zone.data.boundTo = z; else if (link.zone) link.zone.data.discard = true; } } });
  define("Beckoning Light", { activate: { can: (d, ctx) => handCount(d, ctx) > 0 && H.graveMon(d, ctx.p, (c) => C.attribute(c.no) === ATTR.LIGHT).length > 0,
    resolve: async (d, link) => { const n = d.players[link.p].hand.length; for (const c of d.players[link.p].hand.slice()) await d.discard(link.p, c, "effect");
      const cs = await d.pickCards(link.p, "Add which LIGHT monsters to your hand?", H.graveMon(d, link.p, (c) => C.attribute(c.no) === ATTR.LIGHT), null, { count: n }); for (const c of cs || []) await d.toHand(c); } } });
  define("Legacy of Yata-Garasu", { activate: { resolve: async (d, link) => {
    const spirit = up(d, 1 - link.p).some((z) => DM.effectOf(z.card.no) && DM.effectOf(z.card.no).spirit);
    const o = spirit ? await d.choose(link.p, "Draw how many cards?", [{ label: "Draw 1 card", v: 1 }, { label: "Draw 2 cards", v: 2 }]) : null;
    await d.drawCards(link.p, o ? o.v : 1); } } });
  define("Labyrinth of Nightmare", stays({ endPhase: async (d) => { for (const z of up(d, d.turnPlayer)) await d.changePosition(z, !z.defense); } }));
  define("Pyramid of Light", stays({ onLeave: async (d, z, p) => { for (const m of up(d, p).filter((x) => isName(x.card, ["Andro Sphinx", "Sphinx Teleia"]))) { if (await d.destroy(m, "effect")) { const c = m.card; if (d.players[c.owner].grave.includes(c)) await d.banish(c, "effect"); } } } }));
  define("Ninjitsu Art of Decoy", { activate: { stays: true, can: (d, ctx) => up(d, ctx.p).some((z) => C.name(z.card.no).includes("Ninja")),
    target: (d, link) => pickMon(d, link, "Choose which Ninja?", (z) => z.faceUp && C.name(z.card.no).includes("Ninja"), [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z && link.zone) { z.data.shield = link.zone; link.zone.data.bound = z; z.data.boundBy = link.zone; } else if (link.zone) link.zone.data.discard = true; } } });
  // (A Trap that becomes a monster)
  define("Stronghold the Moving Fortress", { activate: { stays: true, can: (d, ctx) => d.freeMonsterZone(ctx.p) >= 0, resolve: async (d, link) => {
    if (!link.zone || !d.locate(link.zone) || d.freeMonsterZone(link.p) < 0) return;
    const c = link.card; d.take(c);
    const z = await d.placeMonster(link.p, c, { defense: true, how: "special" });
    if (z) { z.data.base = { atk: 0, def: 2000, level: 4, type: typeNo("Machine"), attribute: ATTR.EARTH }; await d.summoned(link.p, z, "special"); } } },
    selfStats: (d, z) => (H.isMon(d, z) && ["Green Gadget", "Red Gadget", "Yellow Gadget"].every((n) => up(d, d.controllerOf(z)).some((x) => isName(x.card, n))) ? { setAtk: 3000 } : null) });
  define("Fruits of Kozaky's Studies", { activate: { can: (d, ctx) => d.players[ctx.p].deck.length > 1, resolve: async (d, link) => {
    const pl = d.players[link.p], top = pl.deck.splice(0, 3), order = [];
    while (top.length) { const c = top.length > 1 ? await d.pickCard(link.p, "Which card goes on top" + (order.length ? " of these" : "") + "?", top) : top[0]; const k = top.indexOf(c || top[0]); order.push(top.splice(k, 1)[0]); }
    pl.deck.unshift(...order); } } });
  define("Fuh-Rin-Ka-Zan", { activate: { can: (d) => ["WIND", "WATER", "FIRE", "EARTH"].every((a) => up(d).some((z) => H.attrOf(d, z) === ATTR[a])), resolve: async (d, link) => {
    const q = 1 - link.p;
    const o = await d.choose(link.p, "Fuh-Rin-Ka-Zan's effect:", [{ label: "Destroy all their monsters", v: 0 }, { label: "Destroy all their Spells and Traps", v: 1 }, { label: "Discard 2 random cards from their hand", v: 2 }, { label: "Draw 2 cards", v: 3 }]);
    const v = o ? o.v : 0;
    if (v === 0) await H.destroyAll(d, d.monsters(q)); else if (v === 1) await H.destroyAll(d, H.st(d, q)); else if (v === 2) { await H.discardRandom(d, q); await H.discardRandom(d, q); } else await d.drawCards(link.p, 2); } } });
  define("Phoenix Wing Wind Blast", { activate: { can: (d, ctx) => handCount(d, ctx) > 0 && d.allZones(1 - ctx.p).length > 0, cost: discardCost(),
    target: (d, link) => H.target(d, link, "Return which card to the top of its owner's Deck?", (z, q) => q !== link.p, { sides: [1 - link.p] }), resolve: async (d, link) => { const z = t0(d, link); if (z) await d.toDeck(z.card, true, "effect"); } } });
  define("Good Goblin Housekeeping", { activate: { resolve: async (d, link) => {
    await d.drawCards(link.p, 1 + d.players[link.p].grave.filter((c) => isName(c, "Good Goblin Housekeeping")).length);
    const c = await d.pickCard(link.p, "Return which card to the bottom of your Deck?", d.players[link.p].hand); if (c) await d.toDeck(c, false); } } });
  define("Assault on GHQ", { activate: { can: (d, ctx) => d.monsters(ctx.p).length > 0, target: (d, link) => pickMon(d, link, "Destroy which of your monsters?", null, [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z) await d.destroy(z, "effect"); for (const c of d.players[1 - link.p].deck.slice(0, 2)) await d.sendToGrave(c, "effect"); } } });
  define("Elemental Burst", { activate: { can: (d, ctx) => ["WIND", "WATER", "FIRE", "EARTH"].every((a) => d.monsters(ctx.p).some((z) => H.attrOf(d, z) === ATTR[a])),
    cost: async (d, link) => { for (const a of ["WIND", "WATER", "FIRE", "EARTH"]) { const z = await d.pickZone(link.p, "Tribute which " + a + " monster?", (x, q) => q === link.p && H.attrOf(d, x) === ATTR[a], { sides: [link.p], area: "monster" }); if (!z) return false; await d.sendToGrave(z.card, "tribute"); } return true; },
    resolve: async (d, link) => H.destroyAll(d, d.allZones(1 - link.p)) } });
  define("Hero Signal", { activate: { when: "battle-destroyed", can: (d, ctx) => ctx.event.p === ctx.p && H.canSummonHere(d, ctx.p) && piles(d, ctx.p, ["hand", "deck"]).some((c) => isMonCard(c) && C.name(c.no).includes("Elemental Hero") && C.level(c.no) <= 4),
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Elemental Hero?", piles(d, link.p, ["hand", "deck"]), (c) => isMonCard(c) && C.name(c.no).includes("Elemental Hero") && C.level(c.no) <= 4); if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } } });
  define("Minefield Eruption", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Mine Golem")), resolve: async (d, link) => {
    const zs = up(d, link.p).filter((z) => isName(z.card, "Mine Golem")); await d.damage(1 - link.p, 1000 * zs.length, "effect"); await H.destroyAll(d, zs); } } });
  define("Mispolymerization", { activate: { when: "special-summoned", can: (d, ctx) => ctx.event.zone && C.kind(ctx.event.zone.card.no) === "fusion",
    resolve: async (d) => { for (const z of up(d).filter((z) => C.kind(z.card.no) === "fusion")) await d.toDeck(z.card, true, "effect"); } } });
  define("Rock Bombardment", { activate: { can: (d, ctx) => d.players[ctx.p].deck.some((c) => C.isMonster(c.no) && isT(c.no, "Rock")), resolve: async (d, link) => {
    const c = await d.pickCard(link.p, "Send which Rock monster to the Graveyard?", d.players[link.p].deck, (c) => C.isMonster(c.no) && isT(c.no, "Rock")); if (c) await d.sendToGrave(c, "effect"); DM.shuffle(d, d.players[link.p].deck); await d.damage(1 - link.p, 500, "effect"); } } });
  define("Token Feastevil", { activate: { when: "special-summoned", can: (d, ctx) => !!ctx.event.token, resolve: async (d, link) => { const n = await H.destroyAll(d, mons(d).filter((z) => z.card.token)); await d.damage(1 - link.p, 300 * n, "effect"); } } });
  const art = (attr, can, resolve) => ({ activate: { can: (d, ctx) => d.monsters(ctx.p).some((z) => H.attrOf(d, z) === ATTR[attr]) && (!can || can(d, ctx)), cost: tributeCost((d, z) => H.attrOf(d, z) === ATTR[attr], "Tribute which " + attr + " monster?"), resolve } });
  define("Spiritual Earth Art - Kurogane", art("EARTH", (d, ctx) => H.graveMon(d, ctx.p, (c) => C.attribute(c.no) === ATTR.EARTH && C.level(c.no) <= 4).length > 0, async (d, link) => {
    const c = await d.pickCard(link.p, "Special Summon which EARTH monster?", H.graveMon(d, link.p, (c) => c !== link.data.tributed.card && C.attribute(c.no) === ATTR.EARTH && C.level(c.no) <= 4 && !C.isExtra(c.no))); if (c) await ss(d, link.p, c); }));
  define("Spiritual Water Art - Aoi", art("WATER", (d, ctx) => d.players[1 - ctx.p].hand.length > 0, async (d, link) => {
    const c = await d.pickCard(link.p, "Send which card in their hand to the Graveyard?", d.players[1 - link.p].hand); if (c) await d.sendToGrave(c, "effect"); }));
  define("Spiritual Fire Art - Kurenai", art("FIRE", null, async (d, link) => d.damage(1 - link.p, link.data.tributed.base, "effect")));
  define("Spiritual Wind Art - Miyabi", art("WIND", (d, ctx) => d.allZones(1 - ctx.p).length > 0, async (d, link) => {
    const z = await d.pickZone(link.p, "Return which card to the bottom of its owner's Deck?", (x, q) => q !== link.p, { sides: [1 - link.p] }); if (z) await d.toDeck(z.card, false, "effect"); }));
  define("A Rival Appears!", { activate: { can: (d, ctx) => H.canSummonHere(d, ctx.p) && up(d, 1 - ctx.p).some((z) => d.players[ctx.p].hand.some((c) => isMonCard(c) && C.level(c.no) === d.stats(z).level)),
    target: (d, link) => pickMon(d, link, "Choose which of their monsters?", (z) => z.faceUp, [1 - link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (!z) return; const lv = d.stats(z).level; const c = await d.pickCard(link.p, "Special Summon which monster?", d.players[link.p].hand, (c) => isMonCard(c) && C.level(c.no) === lv); if (c) await ss(d, link.p, c); } } });
  define("Conscription", { activate: { can: (d, ctx) => d.players[1 - ctx.p].deck.length > 0, resolve: async (d, link) => {
    const c = d.players[1 - link.p].deck[0]; if (!c) return; await d.emit({ type: "reveal", p: 1 - link.p, card: c });
    const e = DM.effectOf(c.no);
    if (isMonCard(c) && C.kind(c.no) !== "ritual" && !(e && (e.specialOnly || e.noSpecial)) && H.canSummonHere(d, link.p)) await ss(d, link.p, c); else await d.toHand(c); } } });
})();

// (The rest: monsters.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo, SC = DM.SC;
  const { isName, show, tributeCost, canTribute, discardCost, handCount, destroyOne, summonFromDeck, umi, coins, once, mine, ss, piles, others, unionOf } = DM.REST;
  const up = H.up, mons = H.mons, isMon = H.isMon;
  const isT = (no, t) => C.type(no) === typeNo(t);
  const isMonCard = (c) => C.isMonster(c.no) && !C.isExtra(c.no);
  const inGrave = (d, c) => !!c && !c.token && d.players[c.owner].grave.includes(c);
  const ctl = (d, z) => d.controllerOf(z);
  const scarab = () => DM.EFFECTS[N("Swarm of Scarabs")].ignition;
  const flipped = (fn) => async (d, z, p, how) => { if (how === "flip") await fn(d, z, p); };
  const returnOpp = async (d, p) => { const t = await d.pickZone(p, "Return which monster to its owner's hand?", (x, q) => q !== p, { sides: [1 - p], area: "monster" }); if (t) await d.toHand(t.card, "effect"); };
  const destroyOpp = async (d, p) => { const t = await d.pickZone(p, "Destroy which monster?", (x, q) => q !== p, { sides: [1 - p], area: "monster" }); if (t) await d.destroy(t, "effect"); };
  const repeatTribute = (filter, prompt, resolve) => ({ ignition: { repeatable: true, can: (d, ctx) => canTribute(d, ctx.p, filter, ctx.zone), cost: tributeCost(filter, prompt), resolve } });
  const burnStandby = (fn) => ({ standby: async (d, z, p) => { if (d.turnPlayer === p) await fn(d, z, p); } });
  const coinIgnition = (fn) => ({ ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d), resolve: async (d, link) => fn(d, link) } });

  define("Exodia the Forbidden One", { exodia: true });
  for (const n of ["Cyber Harpie Lady"]) define(n, { alias: "Harpie Lady" });

  // ----- Changed position -----
  const onPosition = (test, fn) => ({ onEvent: async (d, z, p, ev) => { if (ev.type === "position-changed" && ev.zone === z && test(ev)) await fn(d, z, p); } });
  define("Crass Clown", onPosition((ev) => ev.from.faceUp && ev.from.defense && !ev.defense, (d, z, p) => returnOpp(d, p)));
  define("Dream Clown", onPosition((ev) => ev.from.faceUp && !ev.from.defense && ev.defense, (d, z, p) => destroyOpp(d, p)));
  define("Blade Rabbit", onPosition((ev) => ev.from.faceUp && !ev.from.defense && ev.defense, (d, z, p) => destroyOpp(d, p)));
  define("Tainted Wisdom", onPosition((ev) => ev.from.faceUp && !ev.from.defense && ev.defense, async (d, z, p) => DM.shuffle(d, d.players[p].deck)));

  // ----- In the Damage Step -----
  const vs = (test, stats) => ({ battleStats: (d, z, p, o, attacking) => (o && test(d, o, attacking) ? stats : null) });
  define("Dark Artist", vs((d, o, a) => !a && H.attrOf(d, o) === ATTR.LIGHT, { defMult: 0.5 }));
  define("Insect Soldiers of the Sky", vs((d, o, a) => a && H.attrOf(d, o) === ATTR.WIND, { atk: 1000 }));
  define("Luminous Soldier", vs((d, o) => H.attrOf(d, o) === ATTR.DARK, { atk: 500 }));
  define("Penumbral Soldier Lady", vs((d, o) => H.attrOf(d, o) === ATTR.LIGHT, { atk: 1000 }));
  define("Cipher Soldier", vs((d, o) => H.typeOf(d, o) === typeNo("Warrior"), { atk: 2000, def: 2000 }));
  define("Steamroid", { battleStats: (d, z, p, o, attacking) => (o ? { atk: attacking ? 500 : -500 } : null) });
  define("Injection Fairy Lily", { battleAsk: async (d, z, p) => { if (d.players[p].lp > 2000 && (await d.yesNo(p, "Pay 2000 LP to give Injection Fairy Lily 3000 more ATK?"))) { await d.payLp(p, 2000); return { atk: 3000 }; } return null; } });
  define("The Hunter with 7 Weapons", { onSummon: async (d, z, p, how) => { if (how !== "normal") return; const o = await d.choose(p, "Declare a Type.", DM.TYPESLIST()); z.data.hunted = o ? o.value : 0; },
    battleStats: (d, z, p, o) => (o && z.data.hunted && H.typeOf(d, o) === z.data.hunted ? { atk: 1000 } : null) });
  const killAfter = (types) => ({ onBattle: async (d, z, p, o) => { if (o && types.some((t) => H.typeOf(d, o) === typeNo(t))) o.data.destroyAfterBattle = true; } });
  define("Getsu Fuhma", killAfter(["Fiend", "Zombie"]));
  define("Ryu Kokki", killAfter(["Warrior", "Spellcaster"]));
  // (destroyed without damage calculation)
  const strike = (test) => ({ beforeDamage: async (d, z, p, t) => { if (t && test(d, t) && d.locate(t)) { await d.destroy(t, "effect"); return "stop"; } } });
  define("Disc Fighter", strike((d, t) => t.defense && d.defOf(t) >= 2000));
  define("Ninja Grandmaster Sasuke", strike((d, t) => t.defense && t.data.attackedFaceDown !== d.turn));
  define("Drillroid", strike((d, t) => t.defense));
  define("Sasuke Samurai #4", { onBattle: async (d, z, p, o) => { if (o && d.locate(o) && (await H.coinCall(d, p))) await d.destroy(o, "effect"); } });
  // (after damage calculation)
  const needles = { onAttacked: async (d, z, p, att, res) => { if (z.defense && d.atkOf(att) < d.defOf(z)) res.attackerDies = true; } };
  define("Thousand Needles", needles);
  define("Two Thousand Needles", needles);
  define("Des Kangaroo", { onAttacked: async (d, z, p, att, res) => { if (d.atkOf(att) < d.defOf(z)) res.attackerDies = true; } });
  define("Kangaroo Champ", { afterBattle: async (d, z, p, o) => { if (o && d.locate(o) && o.faceUp) await d.changePosition(o, true); } });
  define("D. D. Warrior Lady", { afterBattle: async (d, z, p, o) => { if (o && d.locate(o) && d.locate(z) && (await d.yesNo(p, "Remove D. D. Warrior Lady and the other monster from play?"))) { await d.banish(o.card, "effect"); await d.banish(z.card, "effect"); } } });
  define("Marshmallon", { battleImmune: () => true, afterBattle: async (d, z, p, o, attacking) => { if (!attacking && z.data.attackedFaceDown === d.turn) await d.damage(1 - p, 1000, "effect"); } });
  define("Castle Gate", { battleImmune: () => true, ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && !ctx.zone.defense && canTribute(d, ctx.p, (d2, x) => d2.stats(x).level <= 5, ctx.zone),
    cost: tributeCost((d, x) => d.stats(x).level <= 5, "Tribute which Level 5 or lower monster?"), resolve: async (d, link) => d.damage(1 - link.p, link.data.tributed.base, "effect") } });
  define("Gyroid", { cannotBeDestroyed: (d, z, p, why) => { if (why !== "battle" || z.data.gyroid === d.turn) return false; z.data.gyroid = d.turn; return true; } });
  const core = (extra) => Object.assign({ battleImmune: () => true, onSummon: async (d, z, p, how) => { if (how === "normal") z.counters.core = 3; },
    afterBattle: async (d, z) => { if (!d.locate(z)) return; if ((z.counters.core || 0) > 0) z.counters.core--; else await d.destroy(z, "effect"); } }, extra);
  define("B.E.S. Big Core", core());
  define("B.E.S. Crystal Core", core({ ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && up(d, 1 - ctx.p).some((x) => !x.defense),
    resolve: async (d, link) => { const t = await d.pickZone(link.p, "Change which monster to Defense Position?", (x, q) => q !== link.p && x.faceUp && !x.defense, { sides: [1 - link.p], area: "monster" }); if (t) await d.changePosition(t, true); } } }));
  define("Satellite Cannon", { battleImmune: (d, z, p, o) => d.stats(o).level <= 7, selfStats: (d, z) => ({ atk: z.data.charge || 0 }),
    endPhase: async (d, z, p) => { if (d.turnPlayer === p) z.data.charge = (z.data.charge || 0) + 1000; }, afterAttack: async (d, z) => { z.data.charge = 0; } });
  define("Harpie Lady 2", { alias: "Harpie Lady", noFlipInBattle: true });
  define("Harpie Lady 3", { alias: "Harpie Lady", afterBattle: async (d, z, p, o) => { if (o && d.locate(o)) o.data.cannotAttackUntil = d.turn + (d.turnPlayer === p ? 4 : 5); } });
  define("Harpie Lady 1", { alias: "Harpie Lady", auraSelf: true, aura: (d, src, sp, z) => (isMon(d, z) && z.faceUp && C.attribute(z.card.no) === ATTR.WIND ? { atk: 300 } : null) });

  // ----- Battle damage -----
  define("Stone Statue of the Aztecs", { battleDamage: (d, z, zp, r, n, dealer) => (dealer && r !== zp && d.turnPlayer !== zp ? { n: n * 2 } : null) });
  define("Amazoness Swords Woman", { battleDamage: (d, z, zp, r) => (r === zp ? { to: 1 - zp } : null) });
  for (const n of ["Amazoness Fighter", "Monk Fighter"]) define(n, { battleDamage: (d, z, zp, r) => (r === zp ? { n: 0 } : null) });
  define("Piranha Army", { battleDamage: (d, z, zp, r, n, dealer, other) => (dealer && !other ? { n: n * 2 } : null) });
  define("Gravekeeper's Vassal", { battleDamage: (d, z, zp, r, n, dealer) => (dealer ? { why: "effect" } : null) });
  define("Mefist the Infernal General", { piercing: true, onBattleDamage: async (d, z, p) => { await H.discardRandom(d, 1 - p); } });
  define("Sasuke Samurai #3", { onBattleDamage: async (d, z, p) => { const n = 7 - d.players[1 - p].hand.length; if (n > 0) await d.drawCards(1 - p, n); } });
  define("Blood Sucker", { onBattleDamage: async (d, z, p) => { const c = d.players[1 - p].deck[0]; if (c) await d.sendToGrave(c, "effect"); } });
  define("Kycoo the Ghost Destroyer", { onBattleDamage: async (d, z, p) => { const cs = await d.pickCards(p, "Remove up to 2 monsters in their Graveyard from play.", H.graveMon(d, 1 - p), null, { count: 2, min: 0 }); for (const c of cs || []) await d.banish(c, "effect"); } });
  define("Aswan Apparition", { onBattleDamage: async (d, z, p) => { const c = await d.pickCard(p, "Return which Trap Card to the top of your Deck?", d.players[p].grave, (c) => C.isTrap(c.no), { min: 0 }); if (c) await d.toDeck(c, true); } });
  define("Nubian Guard", { onBattleDamage: async (d, z, p) => { const c = await d.pickCard(p, "Return which Continuous Spell Card to the top of your Deck?", d.players[p].grave, (c) => C.isSpell(c.no) && C.icon(c.no) === DM.ICON.CONTINUOUS, { min: 0 }); if (c) await d.toDeck(c, true); } });
  define("Decayed Commander", { onSummon: async (d, z, p, how) => { const c = how === "normal" && H.canSummonHere(d, p) && d.players[p].hand.find((x) => isName(x, "Zombie Tiger")); if (c && (await d.yesNo(p, "Special Summon Zombie Tiger from your hand?"))) await ss(d, p, c); },
    onBattleDamage: async (d, z, p, other) => { if (!other) await H.discardRandom(d, 1 - p); } });
  define("Vampiric Orchis", { onSummon: async (d, z, p, how) => { const c = how === "normal" && H.canSummonHere(d, p) && d.players[p].hand.find((x) => isName(x, "Des Dendle")); if (c && (await d.yesNo(p, "Special Summon Des Dendle from your hand?"))) await ss(d, p, c); } });

  // ----- Destroying a monster in battle -----
  const onKill = (fn) => ({ onDestroyByBattle: async (d, z, p, v) => { if (inGrave(d, v.card)) await fn(d, z, p, v); } });
  define("D.D. Crazy Beast", { onDestroyByBattle: async (d, z, p, v) => { if (inGrave(d, v.card)) await d.banish(v.card, "effect"); } });
  define("Divine Knight Ishzark", DM.EFFECTS[N("D.D. Crazy Beast")]);
  define("Guardian Angel Joan", onKill(async (d, z, p, v) => d.heal(p, C.atk(v.card.no))));
  define("Inferno Hammer", onKill(async (d, z, p) => { const t = await d.pickZone(p, "Flip which monster face down?", (x, q) => q !== p && x.faceUp, { sides: [1 - p], area: "monster" }); if (t) await d.flipDown(t); }));
  define("Emes the Infinity", onKill(async (d, z) => { z.links.push({ kind: "self", stats: { atk: 700 } }); }));
  define("Millennium Scorpion", onKill(async (d, z) => { z.links.push({ kind: "self", stats: { atk: 500 } }); }));
  for (const n of ["KA-2 Des Scissors", "Needle Burrower"]) define(n, onKill(async (d, z, p, v) => d.damage(1 - p, 500 * C.level(v.card.no), "effect")));
  define("Absorbing Kid from the Sky", onKill(async (d, z, p, v) => d.heal(p, 300 * C.level(v.card.no))));
  define("Element Dragon", { selfStats: (d) => (up(d).some((x) => H.attrOf(d, x) === ATTR.FIRE) ? { atk: 500 } : null),
    onDestroyByBattle: async (d, z) => { if (up(d).some((x) => H.attrOf(d, x) === ATTR.WIND) && z.data.again !== d.turn) { z.data.again = d.turn; z.attacks = Math.max(0, z.attacks - 1); } } });

  // ----- Destroyed -----
  const inBattle = (fn) => ({ onDestroyed: async (d, z, p, why, by) => { if (why === "battle") await fn(d, z, p, by); } });
  define("Newdoria", inBattle(async (d, z, p) => { await destroyOne(d, p, "Destroy which monster?", null, "monster"); }));
  define("Yomi Ship", inBattle(async (d, z, p, by) => { if (by && d.locate(by)) await d.destroy(by, "effect"); }));
  define("D. D. Assailant", inBattle(async (d, z, p, by) => { if (inGrave(d, z.card)) await d.banish(z.card, "effect"); if (by && d.locate(by)) await d.banish(by.card, "effect"); }));
  define("Atomic Firefly", inBattle(async (d, z, p, by) => d.damage(by && d.locate(by) ? ctl(d, by) : 1 - p, 1000, "effect")));
  define("Mine Golem", inBattle(async (d, z, p) => d.damage(1 - p, 500, "effect")));
  define("Agido", inBattle(async (d, z, p) => {
    if (!H.canSummonHere(d, p)) return; const r = await H.die(d, p);
    const c = await d.pickCard(p, "Special Summon which monster?", H.graveMon(d, p, (c) => !C.isExtra(c.no) && c !== z.card && (r === 6 ? C.level(c.no) >= 6 : isT(c.no, "Fairy") && C.level(c.no) === r)), null, { min: 0 });
    if (c) await ss(d, p, c); }));
  const fromDeckOnBattle = (filter, prompt, opts) => inBattle(async (d, z, p) => { await summonFromDeck(d, p, filter, prompt, opts); });
  define("Howling Insect", fromDeckOnBattle((c) => isT(c.no, "Insect") && C.atk(c.no) <= 1500, "Special Summon an Insect with 1500 ATK or less from your Deck?"));
  define("Masked Dragon", fromDeckOnBattle((c) => isT(c.no, "Dragon") && C.atk(c.no) <= 1500, "Special Summon a Dragon with 1500 ATK or less from your Deck?"));
  define("UFOroid", fromDeckOnBattle((c) => isT(c.no, "Machine") && C.atk(c.no) <= 1500, "Special Summon a Machine with 1500 ATK or less from your Deck?", { position: null, defense: false }));
  define("Wasteland Amazon", fromDeckOnBattle((c) => isT(c.no, "Warrior") && C.attribute(c.no) === ATTR.EARTH && C.atk(c.no) <= 1500, "Special Summon an EARTH Warrior with 1500 ATK or less from your Deck?", { position: null, defense: false }));
  define("Hyena", inBattle(async (d, z, p) => { for (const c of d.players[p].deck.filter((c) => isName(c, "Hyena"))) { if (!H.canSummonHere(d, p)) break; await ss(d, p, c); } DM.shuffle(d, d.players[p].deck); }));
  define("T.A.D.P.O.L.E.", inBattle(async (d, z, p) => { for (const c of d.players[p].deck.filter((c) => isName(c, "T.A.D.P.O.L.E."))) await d.toHand(c, "search"); DM.shuffle(d, d.players[p].deck); }));
  define("Wroughtweiler", inBattle(async (d, z, p) => { const g = d.players[p].grave; const h = await d.pickCard(p, "Add which Elemental Hero to your hand?", g, (c) => C.name(c.no).includes("Elemental Hero"), { min: 0 });
    if (h) await d.toHand(h); const pol = g.find((c) => isName(c, "Polymerization")); if (pol) await d.toHand(pol); }));
  define("Mecha-Dog Marron", { onDestroyed: async (d, z, p, why) => { if (why === "battle") { await d.damage(p, 1000, "effect"); await d.damage(1 - p, 1000, "effect"); } else await d.damage(1 - p, 1000, "effect"); } });
  define("Balloon Lizard", { standby: async (d, z, p) => { if (d.turnPlayer === p) z.counters.balloon = (z.counters.balloon || 0) + 1; },
    onDestroyed: async (d, z, p, why, by) => { const n = 400 * (z.counters.balloon || 0); if (n) await d.damage(by && d.locate(by) ? ctl(d, by) : d.turnPlayer, n, "effect"); } });
  define("Granadora", { onSummon: async (d, z, p) => d.heal(p, 1000), onDestroyed: async (d, z, p) => d.damage(p, 2000, "effect") });
  define("The Thing in the Crater", { onDestroyed: async (d, z, p) => { if (!H.canSummonHere(d, p)) return; const c = await d.pickCard(p, "Special Summon a Pyro from your hand?", d.players[p].hand, (c) => isMonCard(c) && isT(c.no, "Pyro"), { min: 0 }); if (c) await ss(d, p, c); } });
  define("Winged Kuriboh", { onDestroyed: async (d, z, p) => { d.players[p].flags.waboku = d.turn; } });
  define("Giant Kozaky", { onDestroyed: async (d, z, p) => d.damage(p, C.atk(z.card.no), "effect"),
    onEvent: async (d, z, p) => { if (!up(d).some((x) => isName(x.card, "Kozaky")) && d.locate(z)) await d.destroy(z, "effect"); } });
  define("King of the Skull Servants", { selfStats: (d, z) => ({ setAtk: 1000 * d.players[ctl(d, z)].grave.filter((c) => isName(c, ["King of the Skull Servants", "Skull Servant"])).length }),
    onDestroyed: async (d, z, p, why) => { const g = d.players[p].grave; if (why !== "battle" || !g.includes(z.card) || !H.canSummonHere(d, p)) return;
      const o = g.find((c) => c !== z.card && isName(c, ["King of the Skull Servants", "Skull Servant"])); if (!o || !(await d.yesNo(p, "Remove a Skull Servant from play to Special Summon King of the Skull Servants?"))) return;
      await d.banish(o, "cost"); await ss(d, p, z.card); } });
  define("Maji-Gire Panda", { onEvent: async (d, z, p, ev) => { if ((ev.type === "destroyed" || ev.type === "battle-destroyed") && ev.card && !ev.card.token && isT(ev.card.no, "Beast") && ev.card !== z.card) z.links.push({ kind: "self", stats: { atk: 500 } }); } });

  // ----- To the Graveyard -----
  define("Outstanding Dog Marron", { onToGrave: async (d, c) => d.toDeck(c, "shuffle") });
  define("Burning Algae", { onToGrave: async (d, c, p) => d.heal(1 - p, 1000) });
  define("Roc from the Valley of Haze", { onToGrave: async (d, c, p, from) => { if (from && from.pile === "hand") await d.toDeck(c, "shuffle"); } });
  define("Poison Draw Frog", { onToGrave: async (d, c, p, from, why) => { if (from && from.z && from.z.faceUp && !(why === "battle" && from.z.data.attackedFaceDown === d.turn)) await d.drawCards(p, 1); } });
  define("Peten the Dark Clown", { onToGrave: async (d, c, p) => {
    const o = piles(d, p, ["hand", "deck"]).find((x) => isName(x, "Peten the Dark Clown"));
    if (!o || !H.canSummonHere(d, p) || !(await d.yesNo(p, "Remove Peten from play to Special Summon another?"))) return;
    await d.banish(c, "cost"); await ss(d, p, o); DM.shuffle(d, d.players[p].deck); } });
  define("Return Zombie", { graveStandby: async (d, c, p) => { if (d.turnPlayer === p && !d.players[p].hand.length && d.players[p].lp > 500 && (await d.yesNo(p, "Pay 500 LP to return Return Zombie to your hand?"))) { await d.payLp(p, 500); await d.toHand(c); } } });

  // ----- Flip effects -----
  define("Old Vindictive Magician", { flip: async (d, link) => { await destroyOne(d, link.p, "Destroy which monster?", (x) => x !== link.zone, "monster"); } });
  define("White Ninja", { flip: async (d, link) => { await destroyOne(d, link.p, "Destroy which Defense Position monster?", (x) => x.defense, "monster"); } });
  define("Gravekeeper's Guard", { flip: async (d, link) => returnOpp(d, link.p) });
  define("Gale Lizard", { flip: async (d, link) => returnOpp(d, link.p) });
  define("Hade-Hane", { flip: async (d, link) => { const zs = await d.pickZones(link.p, "Return up to 3 monsters to their owners' hands.", (x) => x !== link.zone, { area: "monster", count: 3, min: 0 }); for (const z of zs || []) if (d.locate(z)) await d.toHand(z.card, "effect"); } });
  define("Gravekeeper's Spy", { flip: async (d, link) => { await summonFromDeck(d, link.p, (c) => C.name(c.no).includes("Gravekeeper's") && C.atk(c.no) <= 1500, "Special Summon a Gravekeeper's with 1500 ATK or less from your Deck?"); } });
  define("Cobra Jar", { flip: async (d, link) => { if (d.freeMonsterZone(link.p) < 0) return; const o = await d.choose(link.p, "Summon the Poisonous Snake Token in which position?", [{ label: "Attack Position", value: false }, { label: "Defense Position", value: true }]);
    await d.summonToken(link.p, { name: "Poisonous Snake Token", atk: 1200, def: 1200, level: 3, type: typeNo("Reptile"), attribute: ATTR.EARTH, burn: 500 }, { defense: !!(o && o.value) }); } });
  define("Summoner of Illusions", { flip: async (d, link) => {
    const t = await d.pickZone(link.p, "Tribute which monster?", (x, q) => q === link.p && x !== link.zone, { sides: [link.p], area: "monster" }); if (!t) return;
    await d.sendToGrave(t.card, "tribute"); const c = await d.pickCard(link.p, "Special Summon which Fusion Monster?", d.players[link.p].fusion);
    const z = c ? await ss(d, link.p, c) : null; if (z) z.data.destroyAtEnd = d.turn; } });
  define("Supply", { flip: async (d, link) => { const cs = await d.pickCards(link.p, "Return which 2 Fusion Material Monsters to your hand?", d.players[link.p].grave, (c) => c.fusionMaterial && C.isMonster(c.no), { count: 2 }); for (const c of cs || []) await d.toHand(c); } });
  define("Iron Blacksmith Kotetsu", { flip: async (d, link) => { if (d.players[link.p].deck.some((c) => C.isSpell(c.no) && C.icon(c.no) === DM.ICON.EQUIP)) await H.searchDeck(d, link.p, (c) => C.isSpell(c.no) && C.icon(c.no) === DM.ICON.EQUIP, "Add which Equip Spell Card to your hand?"); } });
  define("Des Koala", { flip: async (d, link) => d.damage(1 - link.p, 400 * d.players[1 - link.p].hand.length, "effect") });
  define("Crimson Ninja", { flip: async (d, link) => { const z = await d.pickZone(link.p, "Choose which card?", (x, q, i) => i >= 5 && (!x.faceUp || C.isTrap(x.card.no)), { area: "spell" }); if (z && C.isTrap(z.card.no)) await d.destroy(z, "effect"); } });
  define("Witch Doctor of Chaos", { flip: async (d, link) => { const c = await d.pickCard(link.p, "Remove which monster in a Graveyard from play?", H.graveMon(d, 1 - link.p).concat(H.graveMon(d, link.p))); if (c) await d.banish(c, "effect"); } });
  define("Desertapir", { flip: async (d, link) => { const t = await d.pickZone(link.p, "Flip which monster face down?", (x) => x.faceUp && !isName(x.card, "Desertapir"), { area: "monster" }); if (t) await d.flipDown(t); } });
  define("Spirit Caller", { flip: async (d, link) => { if (!H.canSummonHere(d, link.p)) return; const c = await d.pickCard(link.p, "Special Summon which Normal Monster?", H.graveMon(d, link.p, (c) => C.kind(c.no) === "normal" && C.level(c.no) <= 3), null, { min: 0 }); if (c) await ss(d, link.p, c); } });
  define("Dekoichi the Battlechanted Locomotive", { flip: async (d, link) => d.drawCards(link.p, 1 + up(d, link.p).filter((z) => isName(z.card, "Bokoichi the Freightening Car")).length) });

  // ----- Flip back face down, and their Flip Summons -----
  define("Stealth Bird", { ignition: scarab(), onSummon: flipped(async (d, z, p) => d.damage(1 - p, 1000, "effect")) });
  define("Moai Interceptor Cannons", { ignition: scarab() });
  for (const n of ["Golem Sentry", "Guardian Statue"]) define(n, { ignition: scarab(), onSummon: flipped(async (d, z, p) => returnOpp(d, p)) });
  define("Medusa Worm", { ignition: scarab(), onSummon: flipped(async (d, z, p) => destroyOpp(d, p)) });
  define("Tsukuyomi", { spirit: true, noSpecial: true, onSummon: async (d, z, p, how) => { if (how === "special") return; const t = await d.pickZone(p, "Flip which monster face down?", (x) => x.faceUp && x !== z, { area: "monster" }); if (t) await d.flipDown(t); },
    flip: async (d, link) => { const t = await d.pickZone(link.p, "Flip which monster face down?", (x) => x.faceUp && x !== link.zone, { area: "monster" }); if (t) await d.flipDown(t); } });

  // ----- On summon -----
  define("Gravekeeper's Curse", { onSummon: async (d, z, p) => d.damage(1 - p, 500, "effect") });
  define("King's Knight", { onSummon: async (d, z, p, how) => { if (how === "special" || !up(d, p).some((x) => isName(x.card, "Queen's Knight"))) return; await summonFromDeck(d, p, (c) => isName(c, "Jack's Knight"), "Special Summon Jack's Knight from your Deck?"); } });
  define("Molten Zombie", { onSummon: async (d, z, p, how) => { if (how === "special" && z.data.fromPile === "grave") await d.drawCards(p, 1); } });
  define("Sacred Crane", { onSummon: async (d, z, p, how) => { if (how === "special") await d.drawCards(p, 1); } });
  define("Don Turtle", { onSummon: async (d, z, p, how) => { if (how === "special") return; for (const c of d.players[p].hand.filter((c) => isName(c, "Don Turtle"))) { if (!H.canSummonHere(d, p) || !(await d.yesNo(p, "Special Summon another Don Turtle from your hand?"))) break; await ss(d, p, c); } } });
  define("Manju of the Ten Thousand Hands", { onSummon: async (d, z, p, how) => { const f = (c) => C.kind(c.no) === "ritual" || (C.isSpell(c.no) && C.icon(c.no) === DM.ICON.RITUAL);
    if (how !== "special" && d.players[p].deck.some(f) && (await d.yesNo(p, "Add a Ritual Monster or Ritual Spell from your Deck to your hand?"))) await H.searchDeck(d, p, f); } });
  for (const [n, next] of [["Green Gadget", "Red Gadget"], ["Red Gadget", "Yellow Gadget"], ["Yellow Gadget", "Green Gadget"]])
    define(n, { onSummon: async (d, z, p) => { if (d.players[p].deck.some((c) => isName(c, next)) && (await d.yesNo(p, "Add " + next + " from your Deck to your hand?"))) await H.searchDeck(d, p, (c) => isName(c, next)); } });
  define("Gilasaurus", { onSummon: async (d, z, p, how) => {
    if (how !== "normal" || !(await d.yesNo(p, "Treat Gilasaurus's summon as a Special Summon?"))) return;
    z.summonedBy = "special"; const q = 1 - p;
    if (H.canSummonHere(d, q) && H.graveMon(d, q, (c) => !C.isExtra(c.no)).length) { const c = await d.pickCard(q, "Special Summon a monster from your Graveyard?", H.graveMon(d, q, (c) => !C.isExtra(c.no)), null, { min: 0 }); if (c) await ss(d, q, c); } } });
  const monarch = (fn) => ({ afterTribute: async (d, z, p) => { if (z.faceUp) await fn(d, z, p); } });
  define("Zaborg the Thunder Monarch", monarch(async (d, z, p) => { await destroyOne(d, p, "Destroy which monster?", null, "monster"); }));
  define("Mobius the Frost Monarch", monarch(async (d, z, p) => { const zs = await d.pickZones(p, "Destroy up to 2 Spell or Trap Cards.", (x, q, i) => i >= 5, { area: "spell", count: 2, min: 0 }); for (const x of zs || []) if (d.locate(x)) await d.destroy(x, "effect"); }));
  define("Thestalos the Firestorm Monarch", monarch(async (d, z, p) => { const c = await H.discardRandom(d, 1 - p); if (c && C.isMonster(c.no)) await d.damage(1 - p, 100 * C.level(c.no), "effect"); }));
  define("Granmarg the Rock Monarch", monarch(async (d, z, p) => { await destroyOne(d, p, "Destroy which face-down card?", (x) => !x.faceUp); }));
  define("Des Frog", { afterTribute: async (d, z, p) => { let n = d.players[p].grave.filter((c) => isName(c, "T.A.D.P.O.L.E.")).length;
    for (const c of piles(d, p, ["hand", "deck"]).filter((c) => isName(c, "Des Frog"))) { if (n-- <= 0 || !H.canSummonHere(d, p)) break; await ss(d, p, c); } DM.shuffle(d, d.players[p].deck); } });
  for (const n of ["Eagle Eye", "Tactical Espionage Expert", "Invasion of Flames", "Creeping Doom Manta"]) define(n, { noTrapsOnSummon: true });

  // ----- Ignition effects -----
  define("Gravekeeper's Cannonholder", repeatTribute((d, x) => C.name(x.card.no).includes("Gravekeeper's") && !isName(x.card, "Gravekeeper's Cannonholder"), "Tribute which Gravekeeper's?", async (d, link) => d.damage(1 - link.p, 700, "effect")));
  define("Anti-Aircraft Flower", repeatTribute((d, x) => H.isType(d, x, "Insect"), "Tribute which Insect?", async (d, link) => d.damage(1 - link.p, 800, "effect")));
  define("Man-Thro' Tro'", repeatTribute((d, x) => !x.card.token && C.kind(x.card.no) === "normal", "Tribute which Normal Monster?", async (d, link) => d.damage(1 - link.p, 800, "effect")));
  define("Ultimate Baseball Kid", Object.assign(repeatTribute((d, x) => H.attrOf(d, x) === ATTR.FIRE, "Send which FIRE monster to the Graveyard?", async (d, link) => d.damage(1 - link.p, 500, "effect")),
    { selfStats: (d, z) => ({ atk: 1000 * up(d).filter((x) => x !== z && C.attribute(x.card.no) === ATTR.FIRE).length }) }));
  define("The Forgiving Maiden", { ignition: { can: (d, ctx) => d.players[ctx.p].grave.some((c) => c.battleDestroyedTurn === d.turn && C.isMonster(c.no)), cost: async (d, link) => { await d.sendToGrave(link.card, "tribute"); return true; },
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Return which monster to your hand?", d.players[link.p].grave, (c) => c.battleDestroyedTurn === d.turn && C.isMonster(c.no)); if (c) await d.toHand(c); } } });
  define("Jowgen the Spiritualist", { noSpecials: true, ignition: { repeatable: true, can: (d, ctx) => d.players[ctx.p].hand.length > 0 && mons(d).some((z) => z.summonedBy && !["normal", "set", "flip"].includes(z.summonedBy)),
    cost: async (d, link) => !!(await H.discardRandom(d, link.p)), resolve: async (d) => H.destroyAll(d, mons(d).filter((z) => z.summonedBy && !["normal", "set", "flip"].includes(z.summonedBy))) } });
  define("Bazoo the Soul-Eater", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && H.graveMon(d, ctx.p).length > 0, resolve: async (d, link) => {
    const cs = await d.pickCards(link.p, "Remove up to 3 monsters in your Graveyard from play.", H.graveMon(d, link.p), null, { count: 3, min: 1 });
    for (const c of cs || []) await d.banish(c, "cost"); if (cs && cs.length && link.zone && d.locate(link.zone)) link.zone.links.push({ kind: "self", stats: { atk: 300 * cs.length }, until: d.turn + 1 }); } } });
  define("Gray Wing", { ignition: { can: (d, ctx) => d.phase === "main1" && ctx.p === d.turnPlayer && once(ctx.zone, d) && d.players[ctx.p].hand.length > 0, cost: discardCost(), resolve: async (d, link) => { if (link.zone) link.zone.data.twiceTurn = d.turn; } } });
  define("Tribe-Infecting Virus", { ignition: { repeatable: true, can: (d, ctx) => d.players[ctx.p].hand.length > 0 && up(d).length > 0, cost: discardCost(), resolve: async (d, link) => {
    const o = await d.choose(link.p, "Declare a Type.", DM.TYPESLIST()); if (o) await H.destroyAll(d, up(d).filter((z) => H.typeOf(d, z) === o.value)); } } });
  define("Magical Scientist", { ignition: { repeatable: true, can: (d, ctx) => d.players[ctx.p].lp > 1000 && H.canSummonHere(d, ctx.p) && d.players[ctx.p].fusion.some((c) => C.level(c.no) <= 6),
    cost: async (d, link) => { await d.payLp(link.p, 1000); return true; },
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Fusion Monster?", d.players[link.p].fusion, (c) => C.level(c.no) <= 6); const z = c ? await ss(d, link.p, c) : null; if (z) { z.data.noDirect = true; z.data.toExtraAtEnd = d.turn; } } } });
  define("Lady Ninja Yae", { ignition: { repeatable: true, can: (d, ctx) => d.players[ctx.p].hand.some((c) => C.isMonster(c.no) && C.attribute(c.no) === ATTR.WIND) && H.st(d, 1 - ctx.p).length > 0,
    cost: discardCost((c) => C.isMonster(c.no) && C.attribute(c.no) === ATTR.WIND, "Discard which WIND monster?"), resolve: async (d, link) => { for (const z of H.st(d, 1 - link.p)) if (d.locate(z)) await d.toHand(z.card, "effect"); } } });
  define("Levia-Dragon - Daedalus", { ignition: { can: (d, ctx) => mine(d, ctx) && H.st(d, ctx.p).some((z) => z.faceUp && isName(z.card, "Umi")),
    cost: async (d, link) => { const z = H.st(d, link.p).find((x) => x.faceUp && isName(x.card, "Umi")); if (!z) return false; await d.sendToGrave(z.card, "cost"); return true; },
    resolve: async (d, link) => H.destroyAll(d, [0, 1].reduce((a, q) => a.concat(d.allZones(q)), []).filter((z) => z !== link.zone)) } });
  define("Blowback Dragon", coinIgnition(async (d, link) => { if ((await coins(d, link.p, 3)) >= 2) await destroyOne(d, link.p, "Destroy which card?", null, undefined, [1 - link.p]); }));
  define("Sand Gambler", coinIgnition(async (d, link) => { const h = await coins(d, link.p, 3); if (h === 3) await H.destroyAll(d, d.monsters(1 - link.p)); else if (h === 0) await H.destroyAll(d, d.monsters(link.p)); }));
  define("Abare Ushioni", coinIgnition(async (d, link) => { if (await H.coinCall(d, link.p)) await d.damage(1 - link.p, 1000, "effect"); else await d.damage(link.p, 1000, "effect"); }));
  define("Homunculus the Alchemic Being", { ignition: { can: (d, ctx) => once(ctx.zone, d), resolve: async (d, link) => {
    const o = await d.choose(link.p, "Declare an Attribute.", [1, 2, 3, 4, 5, 6].map((a) => ({ label: window.YUGIOH_CARDS.attributes[a], value: a })));
    if (o && link.zone) { link.zone.links = link.zone.links.filter((l) => l.kind !== "homunculus"); link.zone.links.push({ kind: "homunculus", stats: { attribute: o.value } }); } } } });
  define("Patroid", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.allZones(1 - ctx.p).some((z) => !z.faceUp), resolve: async (d, link) => {
    const z = await d.pickZone(link.p, "Look at which Set card?", (x, q) => q !== link.p && !x.faceUp, { sides: [1 - link.p] }); if (z) await show(d, link.p, "Their Set card:", [z.card]); } } });
  define("D.D.M. - Different Dimension Master", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.players[ctx.p].hand.some((c) => C.isSpell(c.no)) && d.players[ctx.p].banished.some((c) => C.isMonster(c.no) && !C.isExtra(c.no)) && H.canSummonHere(d, ctx.p),
    cost: discardCost((c) => C.isSpell(c.no), "Discard which Spell Card?"), resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which monster?", d.players[link.p].banished, (c) => C.isMonster(c.no) && !C.isExtra(c.no)); if (c) await ss(d, link.p, c); } } });
  // (quick effects: Tributed to negate)
  const negator = (kind, onlyTheirTurn) => ({ quick: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && C["is" + kind](ctx.last.card.no) && (!onlyTheirTurn || d.turnPlayer !== ctx.p),
    cost: async (d, link) => { await d.sendToGrave(link.card, "tribute"); return true; },
    resolve: async (d, link) => { const v = link.prev; if (!v) return; v.negated = true; if (v.zone && d.locate(v.zone)) await d.destroy(v.zone, "negated"); } } });
  define("Maryokutai", negator("Spell", true));
  define("A-Team: Trap Disposal Unit", negator("Trap", false));

  // ----- Standby Phases -----
  define("Bowganian", burnStandby(async (d, z, p) => d.damage(1 - p, 600, "effect")));
  define("Ebon Magician Curran", burnStandby(async (d, z, p) => d.damage(1 - p, 300 * d.monsters(1 - p).length, "effect")));
  define("White Magician Pikeru", burnStandby(async (d, z, p) => d.heal(p, 400 * d.monsters(p).length)));

  // ----- Their own stats -----
  const self = (fn) => ({ selfStats: fn });
  define("Amazoness Paladin", self((d, z) => ({ atk: 100 * up(d, ctl(d, z)).filter((x) => C.name(x.card.no).includes("Amazoness") || isName(x.card, "Amazoness Archer")).length })));
  define("Chaos Necromancer", self((d, z) => ({ setAtk: 300 * H.graveMon(d, ctl(d, z)).length })));
  define("Gren Maju Da Eiza", self((d, z) => { const n = 400 * d.players[ctl(d, z)].banished.length; return { setAtk: n, setDef: n }; }));
  define("Gyaku-Gire Panda", Object.assign(self((d, z) => ({ atk: 500 * d.monsters(1 - ctl(d, z)).length })), { piercing: true }));
  define("Enraged Muka Muka", self((d, z) => { const n = 400 * d.players[ctl(d, z)].hand.length; return { atk: n, def: n }; }));
  define("Theban Nightmare", self((d, z) => { const p = ctl(d, z); return !d.players[p].hand.length && !H.st(d, p).length ? { atk: 1500 } : null; }));
  define("Cybernetic Cyclopean", self((d, z) => (!d.players[ctl(d, z)].hand.length ? { atk: 1000 } : null)));
  define("Lost Guardian", self((d, z) => ({ setDef: 700 * d.players[ctl(d, z)].banished.filter((c) => C.isMonster(c.no) && isT(c.no, "Rock")).length })));
  define("Tyranno Infinity", self((d, z) => ({ setAtk: 1000 * d.players[ctl(d, z)].banished.filter((c) => C.isMonster(c.no) && isT(c.no, "Dinosaur")).length })));
  define("Batteryman AA", self((d, z) => { const aa = up(d, ctl(d, z)).filter((x) => isName(x.card, "Batteryman AA")), n = aa.length * 1000;
    return aa.every((x) => !x.defense) ? { atk: n } : aa.every((x) => x.defense) ? { def: n } : null; }));
  define("Batteryman C", { aura: (d, src, sp, z, zp) => { if (zp !== sp || !isMon(d, z) || !z.faceUp || C.type(z.card.no) !== typeNo("Machine")) return null;
    const cs = up(d, sp).filter((x) => isName(x.card, "Batteryman C")), n = cs.length * 500; return cs.every((x) => !x.defense) ? { atk: n } : cs.every((x) => x.defense) ? { def: n } : null; }, auraSelf: true });

  // ----- On the field -----
  define("Spell Canceller", { negatesSpells: true });
  define("Des Wombat", { noEffectDamage: true });
  define("Protector of the Sanctuary", { noOtherDraws: true });
  define("Invader of Darkness", { noQuickPlay: true });
  define("Mechanical Hound", { noSpellsIfEmpty: true });
  for (const n of ["Pitch-Black Warwolf", "Mirage Dragon"]) define(n, { noBattleTraps: true });
  for (const n of ["Ceremonial Bell", "Mind on Air"]) define(n, { revealsHands: n === "Mind on Air" ? "theirs" : "both" });
  define("Maiden of the Aqua", { umi: true });
  define("Fire Princess", { onEvent: async (d, z, p, ev) => { if (ev.type === "healed" && ev.p === p) await d.damage(1 - p, 500, "effect"); } });
  define("Gearfried the Iron Knight", { onEvent: async (d, z, p, ev) => { if (ev.type === "equipped" && ev.zone === z) { const l = d.zoneOf(ev.card); if (l) await d.destroy(l.z, "effect"); } } });
  define("Spirit of the Pot of Greed", { onEvent: async (d, z, p, ev) => { if (ev.type === "activated" && !z.defense && isName(ev.card, "Pot of Greed")) await d.drawCards(ev.p, 1); } });
  define("Cave Dragon", { normalIf: (d, p) => !d.monsters(p).length, cannotAttack: (d, z, p) => !up(d, p).some((x) => x !== z && H.isType(d, x, "Dragon")) });
  define("Drillago", { directAttack: (d, z, p) => d.monsters(1 - p).length > 0 && d.monsters(1 - p).every((x) => x.faceUp && d.atkOf(x) >= 1600) });
  define("Black Tyranno", { directAttack: (d, z, p) => d.monsters(1 - p).length > 0 && d.monsters(1 - p).every((x) => x.defense) && !H.st(d, 1 - p).length });
  define("Shadowslayer", { directAttack: (d, z, p) => d.monsters(1 - p).length > 0 && d.monsters(1 - p).every((x) => x.defense) });
  define("Amphibious Bugroth MK-3", { directAttack: (d) => umi(d) });
  define("Mermaid Knight", { attacks: (d) => (umi(d) ? 2 : 1) });
  define("Mataza the Zapper", { attacks: 2, noControlChange: true });
  define("Enraged Battle Ox", { piercingFor: (d, s, sp, att, p) => p === sp && ["Beast", "Beast-Warrior", "Winged Beast"].some((t) => H.isType(d, att, t)) });
  const oneTurnDefense = { afterAttack: async (d, z) => { z.data.toDefenseAtEnd = true; } };
  for (const n of ["Giant Orc", "Goblin Elite Attack Force", "Indomitable Fighter Lei Lei"]) define(n, oneTurnDefense);
  // (attacked while face down: it becomes an Equip Card on the attacker)
  async function becomeEquip(d, z, p, att) {
    const i = d.freeSpellZone(p);
    if (i < 0 || !d.locate(att)) return null;
    d.take(z.card);
    const nz = DM.newZone(z.card, { faceUp: true, placedTurn: d.turn });
    nz.data.parasite = true;
    d.players[p].zones[i] = nz;
    d.equip(nz, att, null);
    await d.emit({ type: "equip", card: z.card, to: att });
    return nz;
  }
  define("Blast Sphere", { onBattle: async (d, z, p, att) => { if (z.data.attackedFaceDown === d.turn) await becomeEquip(d, z, p, att); },
    standby: async (d, z, p) => { if (!z.data.parasite || d.turnPlayer === p) return; const t = z.equippedTo; if (!t || !d.locate(t)) return; const a = d.atkOf(t), q = ctl(d, t);
      await d.destroy(t, "effect"); if (d.locate(z)) await d.destroy(z, "effect"); await d.damage(q, a, "effect"); } });
  define("Kiseitai", { onBattle: async (d, z, p, att) => { if (z.data.attackedFaceDown === d.turn) await becomeEquip(d, z, p, att); },
    standby: async (d, z, p) => { if (!z.data.parasite || d.turnPlayer === p) return; const t = z.equippedTo; if (t && d.locate(t)) await d.heal(p, Math.floor(d.atkOf(t) / 2)); } });
  // (a monster attacked by it is destroyed at the End Phase of the fifth turn after)
  for (const n of ["Zone Eater", "Swordsman from a Distant Land"]) define(n, { beforeDamage: async (d, z, p, t) => { if (t) t.data.destroyAtEnd = d.turn + 5; } });
})();

// (Cards beyond GX's: effect monsters, the first half.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo;
  const { isName, show, tributeCost, canTribute, destroyOne, summonFromDeck, umi, once, mine, ss } = DM.REST;
  const up = H.up, mons = H.mons, isMon = H.isMon;
  const isT = (no, t) => C.type(no) === typeNo(t);
  const isMonCard = (c) => C.isMonster(c.no) && !C.isExtra(c.no);
  const inGrave = (d, c) => !!c && !c.token && d.players[c.owner].grave.includes(c);
  const ctl = (d, z) => d.controllerOf(z);
  const flipOrNormal = (how) => how === "normal" || how === "flip";
  const lose = (d, p, n) => d.payLp(p, Math.min(n, d.players[p].lp));
  // (an opponent's card effect resolving now: the discards and mills that say "by your opponent's card")
  const byOpp = (d, p) => !!d.resolvingLink && d.resolvingLink.p !== p;
  const lock = { noAttack: (d, s, q, ap, att) => s.data.locked === att };
  const weaken = async (d, by) => { if (by && d.locate(by)) by.links.push({ kind: "self", stats: { atk: -500, def: -500 } }); };
  // (a card in a pile put in a Spell & Trap Zone as an Equip Card on z; a monster card there does nothing but its stats)
  async function equipCard(d, p, c, z, stats, quiet) {
    const i = d.freeSpellZone(p);
    if (i < 0 || !d.locate(z)) return null;
    d.take(c);
    const nz = DM.newZone(c, { faceUp: true, placedTurn: d.turn });
    if (C.isMonster(c.no) && !quiet) nz.negated = true;
    d.players[p].zones[i] = nz;
    d.equip(nz, z, stats);
    await d.emit({ type: "equip", card: c, to: z });
    return nz;
  }
  async function toMyHand(d, p, c) { const from = d.take(c); d.players[p].hand.push(c); await d.emit({ type: "to-hand", card: c, from, why: "effect" }); }

  // ---------- What the engine doesn't do on its own (each duel's emit, ask, runEffect, specialSummon) ----------
  // Effects' own hooks: onControl(d, z, from, to), onDrawn(d, c, p), drawPhase(d, z, p), battleEnd(d, z, p),
  // graveEnd(d, c, p), graveSpecialTribute (a Type to Tribute to bring it back from the Graveyard), chooseTargets
  // (its controller picks the other side's attack targets). d.resolvingLink: the effect resolving now.
  const live = (d, z) => d.live(z);
  const create0 = DM.create;
  DM.create = function (opts) {
    const d = create0.call(this, opts);
    const emit0 = d.emit, ask0 = d.ask, run0 = d.runEffect, ss0 = d.specialSummon;
    d.runEffect = async function (link) {
      if (link.kind === "flip" && link.zone && link.zone.data.noFlipTurn === this.turn) return;
      const prev = this.resolvingLink;
      this.resolvingLink = link;
      try { return await run0.call(this, link); } finally { this.resolvingLink = prev; }
    };
    d.emit = async function (ev) {
      await emit0.call(this, ev);
      if (this.over) return;
      switch (ev.type) {
        case "attack": this.lastAttack = this.attack; break;
        case "flip": if (ev.zone) await this.notify({ type: "flipped", zone: ev.zone, p: ev.p }); break;
        case "control": { const e = live(this, ev.zone); if (e && e.onControl) await e.onControl(this, ev.zone, ev.from, ev.to); break; }
        case "draw": { const e = DM.effectOf(ev.card.no); if (e && e.onDrawn) await e.onDrawn(this, ev.card, ev.p); break; }
        case "to-grave": {
          const c = ev.card;
          if (C.isSpell(c.no) && ev.why !== "used" && byOpp(this, c.owner)) c.oppSentTurn = this.turn;
          if (ev.why === "tribute" && ev.from && ev.from.zone < 5 && isName(c, "Skull Knight #2")) this.skullKnight = { turn: this.turn, at: this.log.length, p: ev.from.p };
          break;
        }
        case "summon": {
          const k = this.skullKnight;
          if (k && ev.how === "normal" && k.p === ev.p && k.turn === this.turn && this.log.slice(k.at).filter((e) => e.type === "summon").length === 1) {
            this.skullKnight = null;
            if (isT(ev.card.no, "Fiend")) await summonFromDeck(this, ev.p, (c) => isName(c, "Skull Knight #2"), "Special Summon Skull Knight #2 from your Deck?");
          }
          break;
        }
        case "phase": {
          const p = ev.p, pl = this.players[p];
          if (ev.phase === "draw") {
            if (pl.flags.maharaghiPeek) {
              pl.flags.maharaghiPeek = false;
              const c = pl.deck[0];
              if (c) { await show(this, p, "The top card of your Deck:", [c]); const o = await this.choose(p, "Put it back where?", [{ label: "Top of the Deck", v: 0 }, { label: "Bottom of the Deck", v: 1 }]); if (o && o.v === 1) pl.deck.push(pl.deck.shift()); }
            }
            for (const z of this.allZones(p).slice()) { const e = live(this, z); if (e && e.drawPhase && this.locate(z)) await e.drawPhase(this, z, p); }
          } else if (ev.phase === "battle" && pl.flags.weatherReport === this.turn) {
            for (const z of this.monsters(p)) z.data.twiceTurn = this.turn;
          } else if (ev.phase === "main2") {
            for (const z of this.monsters(p).slice()) { const e = live(this, z); if (e && e.battleEnd && this.locate(z)) await e.battleEnd(this, z, p); }
          } else if (ev.phase === "end") {
            for (const q of [p, 1 - p]) for (const c of this.players[q].grave.slice()) { const e = DM.effectOf(c.no); if (e && e.graveEnd && this.players[q].grave.includes(c)) await e.graveEnd(this, c, q); }
          }
          break;
        }
      }
    };
    // (Patrician of Darkness: the other side picks the target, unless the attacker could go direct)
    d.ask = async function (p, req) {
      if (req.type === "attack-target" && this.liveWith("chooseTargets", 1 - p) && !req.options.some((o) => o.direct)) {
        const z = await this.pickZone(1 - p, "Choose which of your monsters " + this.name(req.attacker.card) + " attacks.", (x) => req.options.some((o) => o.zone === x), { sides: [1 - p], area: "monster" });
        const i = req.options.findIndex((o) => o.zone === z);
        if (i >= 0) return i;
      }
      return ask0.call(this, p, req);
    };
    d.specialSummon = async function (p, c, o) {
      const e = DM.effectOf(c.no);
      if (e && e.graveSpecialTribute && this.players[c.owner].grave.includes(c)) {
        const t = await this.pickZone(p, "Tribute a " + e.graveSpecialTribute + " to Special Summon " + this.name(c) + ".", (x, q) => q === p && H.isType(this, x, e.graveSpecialTribute), { sides: [p], area: "monster" });
        if (!t) return null;
        await this.sendToGrave(t.card, "tribute");
      }
      return ss0.call(this, p, c, o);
    };
    return d;
  };

  // ---------- Targets: who can't be targeted, and who negates what targets them ----------
  // (Lord of D.: Dragons; Deepsea Warrior, The Legendary Fisherman: Spells, with Umi; Big Shield Gardna, Freed the
  // Matchless General, Frontier Wiseman: Spells that target them; Tyrant Dragon: Traps)
  const untargetable = (d, link, z) => {
    if (!isMon(d, z) || !z.faceUp) return false;
    if (d.liveWith("noTargetDragons") && H.isType(d, z, "Dragon")) return true;
    const e = live(d, z);
    return !!(e && e.spellImmune && link.card && C.isSpell(link.card.no) && e.spellImmune(d, z));
  };
  const target0 = H.target;
  H.target = async function (d, link, prompt, filter, opts) {
    if (!(await target0.call(this, d, link, prompt, (z, q, i) => (!filter || filter(z, q, i)) && !untargetable(d, link, z), opts))) return false;
    const z = link.targets[0], l = d.locate(z), no = link.card && link.card.no;
    if (!l || l.i >= 5 || !no) return true;
    const e = DM.effectOf(z.card.no), spell = C.isSpell(no), trap = C.isTrap(no);
    if (spell && !z.faceUp && e && e.spellShield && !z.negated) { z.faceUp = true; await d.emit({ type: "flip", zone: z, p: l.p, how: "no-effect" }); return false; }
    const le = live(d, z);
    const wise = H.isType(d, z, "Warrior") && d.allZones(l.p).some((x) => { const xe = live(d, x); return xe && xe.guardsWarriors; });
    if ((spell && ((le && le.negateSpellTarget) || wise)) || (trap && le && le.negateTrapTarget)) {
      await d.emit({ type: "negate", card: link.card });
      if (link.zone && d.locate(link.zone)) await d.destroy(link.zone, "negated");
      return false;
    }
    return true;
  };
  const spellProof = (cond) => ({ spellImmune: cond, cannotBeDestroyed: (d, z, p, why) => why !== "battle" && !!d.resolvingLink && C.isSpell(d.resolvingLink.card.no) && cond(d, z) });

  // ---------- Fusion substitutes ----------
  // (any one material but the others, for Polymerization and Power Bond)
  function fusionsWithSubs(d, p, pool, filter) {
    const out = DM.fusionsFrom(d, p, pool, filter);
    const subs = pool.filter((c) => { const e = DM.effectOf(c.no); return e && e.fusionSub; });
    for (const f of d.players[p].fusion) {
      const need = DM.FUSIONS[f.no];
      if (!subs.length || !need || (filter && !filter(f)) || out.some((o) => o.fusion === f)) continue;
      search: for (const s of subs) for (let k = 0; k < need.length; k++) {
        const used = [s];
        if (need.every((no, j) => { if (j === k) return true; const c = pool.find((x) => !used.includes(x) && x.no === no); if (c) used.push(c); return !!c; })) { out.push({ fusion: f, materials: used }); break search; }
      }
    }
    return out;
  }
  const fusePool = (d, p) => d.players[p].hand.concat(d.monsters(p).map((z) => z.card));
  for (const [name, filter] of [["Polymerization", null], ["Power Bond", (f) => isT(f.no, "Machine")]]) {
    const a = DM.EFFECTS[N(name)] && DM.EFFECTS[N(name)].activate;
    if (!a) continue;
    const can0 = a.can;
    a.can = (d, ctx) => can0(d, ctx) || (fusionsWithSubs(d, ctx.p, fusePool(d, ctx.p).filter((c) => c !== ctx.card), filter).length > 0 && (d.freeMonsterZone(ctx.p) >= 0 || d.monsters(ctx.p).length > 0));
    a.resolve = async (d, link) => {
      const opts = fusionsWithSubs(d, link.p, fusePool(d, link.p).filter((c) => c !== link.card), filter);
      const o = await d.choose(link.p, "Fusion Summon which monster?", opts.map((x) => ({ label: d.name(x.fusion), x })));
      if (!o) return;
      for (const m of await DM.fusionMaterials(d, link.p, o.x)) await d.sendToGrave(m, "fusion");
      const z = await d.specialSummon(link.p, o.x.fusion, { how: "fusion", position: "choose" });
      if (z && link.data.onFused) await link.data.onFused(d, z);
    };
  }
  for (const n of ["Beastking of the Swamps", "Goddess with the Third Eye", "Mystical Sheep #1", "Versago the Destroyer"]) define(n, { fusionSub: true });

  // ----- Summoned by Tributes: Gate Guardian, the Moths, Masked Beast Des Gardius, Dark Necrofear, Wall Shadow -----
  define("Gate Guardian", { specialOnly: true,
    specialFromHand: (d, p) => ["Sanga of the Thunder", "Kazejin", "Suijin"].every((n) => d.monsters(p).some((z) => z.faceUp && isName(z.card, n))),
    specialCost: async (d, p) => {
      for (const n of ["Sanga of the Thunder", "Kazejin", "Suijin"]) {
        const z = await d.pickZone(p, "Tribute " + n + ".", (x, q) => q === p && x.faceUp && isName(x.card, n), { sides: [p], area: "monster" });
        if (!z) return false; await d.sendToGrave(z.card, "tribute");
      }
      return true; } });
  // (Cocoon of Evolution equipped to Petit Moth counts its controller's turns since)
  const cocoonOf = (d, z) => { const l = z.links.find((k) => k.kind === "equip" && k.from && k.from.data.cocoon && d.locate(k.from)); return l ? l.from : null; };
  define("Cocoon of Evolution", {
    handActivate: { can: (d, ctx) => mine(d, ctx) && d.freeSpellZone(ctx.p) >= 0 && up(d, ctx.p).some((z) => isName(z.card, "Petit Moth") && !cocoonOf(d, z)),
      resolve: async (d, link) => {
        const t = await d.pickZone(link.p, "Equip Cocoon of Evolution to which Petit Moth?", (x, q) => q === link.p && x.faceUp && isName(x.card, "Petit Moth") && !cocoonOf(d, x), { sides: [link.p], area: "monster" });
        if (!t || !d.players[link.p].hand.includes(link.card)) return;
        const nz = await equipCard(d, link.p, link.card, t, (d2, z) => ({ atk: C.atk(link.card.no) - C.atk(z.card.no), def: C.def(link.card.no) - C.def(z.card.no) }), true);
        if (nz) { nz.data.cocoon = true; nz.data.turns = 0; } } },
    standby: async (d, z, p) => { if (z.data.cocoon && d.turnPlayer === p) z.data.turns++; } });
  const moth = (ok) => ({ specialOnly: true,
    specialFromHand: (d, p) => up(d, p).some((z) => isName(z.card, "Petit Moth") && cocoonOf(d, z) && ok(cocoonOf(d, z).data.turns)),
    specialCost: async (d, p) => { const z = await d.pickZone(p, "Tribute which Petit Moth?", (x, q) => q === p && x.faceUp && isName(x.card, "Petit Moth") && cocoonOf(d, x) && ok(cocoonOf(d, x).data.turns), { sides: [p], area: "monster", cancel: true });
      if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; } });
  define("Larvae Moth", moth((n) => n === 2));
  define("Great Moth", moth((n) => n === 4));
  define("Perfectly Ultimate Great Moth", moth((n) => n >= 6));
  define("Wall Shadow", { specialOnly: true });
  define("Masked Beast Des Gardius", { specialOnly: true,
    specialFromHand: (d, p) => d.monsters(p).length >= 2 && d.monsters(p).some((z) => z.faceUp && isName(z.card, ["Grand Tiki Elder", "Melchid the Four-Face Beast"])),
    specialCost: async (d, p) => {
      const a = await d.pickZone(p, "Tribute which Grand Tiki Elder or Melchid?", (x, q) => q === p && x.faceUp && isName(x.card, ["Grand Tiki Elder", "Melchid the Four-Face Beast"]), { sides: [p], area: "monster", cancel: true });
      const b = a && (await d.pickZone(p, "Tribute which other monster?", (x, q) => q === p && x !== a, { sides: [p], area: "monster", cancel: true }));
      if (!b) return false; await d.sendToGrave(a.card, "tribute"); await d.sendToGrave(b.card, "tribute"); return true; },
    onToGrave: async (d, c, p, from) => {
      if (!from || from.zone == null || from.zone >= 5) return;
      const mask = d.players[p].deck.find((x) => isName(x, "The Mask of Remnants"));
      if (!mask || d.freeSpellZone(p) < 0 || !d.monsters(1 - p).length) return;
      const t = await d.pickZone(p, "Equip The Mask of Remnants to which monster?", (x, q) => q !== p, { sides: [1 - p], area: "monster" });
      const nz = t && (await equipCard(d, p, mask, t, null));
      DM.shuffle(d, d.players[p].deck);
      if (nz) { nz.data.gardius = true; if (await d.takeControl(t, p)) t.data.maskReturn = 1 - p; } } });
  define("The Mask of Remnants", { onLeave: async (d, z) => { const m = z.equippedTo; if (z.data.gardius && m && d.locate(m) && m.data.maskReturn != null) { const to = m.data.maskReturn; m.data.maskReturn = null; await d.takeControl(m, to); } } });
  define("Dark Necrofear", { specialOnly: true,
    specialFromHand: (d, p) => H.graveMon(d, p, (c) => isT(c.no, "Fiend")).length >= 3,
    specialCost: async (d, p) => { const cs = await d.pickCards(p, "Remove 3 Fiends in your Graveyard from play.", d.players[p].grave, (c) => C.isMonster(c.no) && isT(c.no, "Fiend"), { count: 3, cancel: true });
      if (!cs || cs.length < 3) return false; for (const c of cs) await d.banish(c, "cost"); return true; },
    onDestroyed: async (d, z, p, why, by) => { if (!z.data.necroEquip && (why === "battle" ? by && ctl(d, by) === 1 - p : byOpp(d, p))) z.card.necroTurn = d.turn; },
    graveEnd: async (d, c, p) => {
      if (c.necroTurn !== d.turn || d.freeSpellZone(p) < 0 || d.freeMonsterZone(p) < 0 || !up(d, 1 - p).length) return;
      c.necroTurn = null;
      const t = await d.pickZone(p, "Equip Dark Necrofear to which monster?", (x, q) => q !== p && x.faceUp, { sides: [1 - p], area: "monster" });
      const nz = t && (await equipCard(d, p, c, t, null, true));
      if (nz) { nz.data.necroEquip = true; if (await d.takeControl(t, p)) t.data.necroReturn = 1 - p; } },
    onLeave: async (d, z) => { const m = z.equippedTo; if (z.data.necroEquip && m && d.locate(m) && m.data.necroReturn != null) { const to = m.data.necroReturn; m.data.necroReturn = null; await d.takeControl(m, to); } } });

  // ----- Flip effects -----
  define("Reaper of the Cards", DM.EFFECTS[N("Trap Master")]);
  define("Greenkappa", { flip: async (d, link) => { const zs = await d.pickZones(link.p, "Destroy which 2 Set Spell or Trap Cards?", (x, q, i) => i >= 5 && !x.faceUp, { area: "spell", count: 2 }); for (const z of zs || []) if (d.locate(z)) await d.destroy(z, "effect"); } });
  define("Tornado Bird", { flip: async (d, link) => { const zs = await d.pickZones(link.p, "Return which 2 Spell or Trap Cards to their owners' hands?", (x, q, i) => i >= 5, { area: "spell", count: 2 }); for (const z of zs || []) if (d.locate(z)) await d.toHand(z.card, "effect"); } });
  define("Bite Shoes", { flip: async (d, link) => { const t = await d.pickZone(link.p, "Change the position of which monster?", (x) => x.faceUp, { area: "monster" }); if (t) await d.changePosition(t, !t.defense); } });
  define("Dragon Piper", { flip: async (d) => {
    if (await H.destroyAll(d, H.st(d).filter((z) => z.faceUp && isName(z.card, "Dragon Capture Jar")))) for (const z of up(d).filter((x) => H.isType(d, x, "Dragon"))) await d.changePosition(z, false); } });
  define("The Stern Mystic", { flip: async (d, link) => { const cs = [0, 1].reduce((a, q) => a.concat(d.allZones(q).filter((z) => !z.faceUp).map((z) => z.card)), []); for (const p of [link.p, 1 - link.p]) await show(d, p, "The face-down cards:", cs); } });
  define("Bombardment Beetle", { flip: async (d, link) => {
    const z = await d.pickZone(link.p, "Look at which face-down monster?", (x, q) => q !== link.p && !x.faceUp, { sides: [1 - link.p], area: "monster" });
    if (!z) return; await show(d, link.p, "Their face-down monster:", [z.card]); if (!z.card.token && C.kind(z.card.no) === "effect") await d.destroy(z, "effect"); } });
  define("Hiro's Shadow Scout", { flip: async (d, link) => {
    const q = 1 - link.p, n = await d.drawCards(q, 3), cs = n > 0 ? d.players[q].hand.slice(-n) : [];
    for (const p of [link.p, q]) await show(d, p, "The cards drawn:", cs);
    for (const c of cs.filter((c) => C.isSpell(c.no))) if (d.players[q].hand.includes(c)) await d.discard(q, c, "effect"); } });
  define("Rigorous Reaver", { flip: async (d, link) => { for (const p of [link.p, 1 - link.p]) await H.discardOne(d, p, "Discard a card (Rigorous Reaver)."); },
    onDestroyed: async (d, z, p, why, by) => { if (why === "battle") await weaken(d, by); } });
  define("Electromagnetic Bagworm", { flip: async (d, link) => {
    const t = await d.pickZone(link.p, "Take control of which Machine?", (x, q) => q !== link.p && H.isType(d, x, "Machine"), { sides: [1 - link.p], area: "monster" });
    if (t && (await d.takeControl(t, link.p))) t.data.returnAtEnd = { to: 1 - link.p, turn: d.turnPlayer === link.p ? d.turn : d.turn + 1 }; },
    onDestroyed: async (d, z, p, why, by) => { if (why === "battle") await weaken(d, by); } });
  const borrow = (type, prompt) => ({ flip: async (d, link) => {
    const t = await d.pickZone(link.p, prompt, (x, q) => q !== link.p && H.isType(d, x, type), { sides: [1 - link.p], area: "monster" });
    if (t && (await d.takeControl(t, link.p))) t.data.returnAtEnd = { to: 1 - link.p, turn: d.turn }; } });
  define("Dragon Manipulator", borrow("Dragon", "Take control of which Dragon?"));
  define("Shadow Tamer", borrow("Fiend", "Take control of which Fiend?"));
  define("Invader of the Throne", { flip: async (d, link) => {
    const me = link.zone;
    if (d.phase === "battle" || !me || !d.locate(me) || !d.monsters(1 - link.p).length) return;
    const t = await d.pickZone(link.p, "Switch control with which monster?", (x, q) => q !== link.p, { sides: [1 - link.p], area: "monster" });
    if (t && (await d.takeControl(me, 1 - link.p))) await d.takeControl(t, link.p); } });
  define("Mysterious Guard", { flip: async (d, link) => {
    const a = await d.pickZone(link.p, "Return which face-up monster to the top of its owner's Deck?", (x) => x.faceUp, { area: "monster" });
    const warrior = () => up(d, link.p).some((x) => H.isType(d, x, "Warrior"));
    const b = a && warrior() ? await d.pickZone(link.p, "Return another face-up monster to its owner's hand?", (x) => x.faceUp && x !== a, { area: "monster", min: 0, cancel: true }) : null;
    if (a && d.locate(a)) await d.toDeck(a.card, true, "effect");
    if (b && d.locate(b) && warrior()) await d.toHand(b.card, "effect"); } });
  define("Dark-Eyes Illusionist", Object.assign({ flip: async (d, link) => { const t = await d.pickZone(link.p, "Which monster can't attack?", (x) => x !== link.zone, { area: "monster" }); if (t && link.zone) link.zone.data.locked = t; } }, lock));
  define("The Immortal of Thunder", { flip: async (d, link) => d.heal(link.p, 3000),
    onToGrave: async (d, c, p, from) => { if (from && from.zone != null && from.zone < 5) await lose(d, from.p, 5000); } });
  define("Castle of Dark Illusions", { flip: async (d, link) => { if (link.zone) link.zone.data.castle = 1; },
    standby: async (d, z, p) => { if (d.turnPlayer === p && z.data.castle && z.data.castle < 5) z.data.castle++; },
    aura: (d, src, sp, z) => (src.data.castle && isMon(d, z) && z.faceUp && !z.card.token && isT(z.card.no, "Zombie") ? { atk: 200 * src.data.castle, def: 200 * src.data.castle } : null) });
  define("Jigen Bakudan", { flip: async (d, link) => { if (link.zone) link.zone.data.armed = true; },
    standby: async (d, z, p) => {
      if (d.turnPlayer !== p || !z.data.armed || !(await d.yesNo(p, "Tribute Jigen Bakudan to destroy all your monsters?"))) return;
      await d.sendToGrave(z.card, "tribute");
      const zs = d.monsters(p), atk = zs.reduce((n, x) => n + d.atkOf(x), 0);
      await H.destroyAll(d, zs); await d.damage(1 - p, Math.floor(atk / 2), "effect"); } });
  define("Spear Cretin", { flip: async (d, link) => { if (link.zone) link.zone.data.cretin = true; },
    onToGrave: async (d, c, p, from) => {
      if (!from || !from.z || !from.z.data.cretin) return;
      for (const q of [p, 1 - p]) {
        if (!H.canSummonHere(d, q)) continue;
        const m = await d.pickCard(q, "Special Summon which monster from your Graveyard?", H.graveMon(d, q, (x) => !C.isExtra(x.no)), null, { min: 0 });
        if (!m) continue;
        const o = await d.choose(q, "Summon " + d.name(m) + " how?", [{ label: "Face-up Attack Position", v: 0 }, { label: "Face-down Defense Position", v: 1 }]);
        await ss(d, q, m, o && o.v === 1 ? { position: null, faceUp: false, defense: true } : { position: null, defense: false });
      } } });
  define("Parasite Paracide", { flip: async (d, link) => {
    const c = link.card, q = 1 - link.p;
    if (!link.zone || !d.locate(link.zone)) return;
    d.take(c); c.paracide = true; d.players[q].deck.push(c); DM.shuffle(d, d.players[q].deck);
    await d.emit({ type: "to-deck", card: c, why: "effect" }); },
    onDrawn: async (d, c, p) => {
      if (!c.paracide) return; c.paracide = false;
      const z = d.freeMonsterZone(p) >= 0 ? await d.specialSummon(p, c, { how: "special", defense: true }) : null;
      if (z) z.data.paracide = true;
      await d.damage(p, 1000, "effect"); },
    aura: (d, src, sp, z, zp) => (src.data.paracide && zp === sp && isMon(d, z) && z.faceUp ? { type: typeNo("Insect") } : null) });

  // ----- On summon, and flipped face up -----
  define("Hourglass of Courage", { onSummon: async (d, z, p, how) => { if (flipOrNormal(how)) z.links.push({ kind: "self", stats: { atkMult: 0.5, defMult: 0.5 }, until: d.turn + 2 }); } });
  const selfDestructs = (perOpp) => ({ onSummon: async (d, z, p, how) => { if (how === "normal") await d.destroy(z, "effect"); },
    selfStats: (d, z) => { const p = ctl(d, z), n = p < 0 ? 0 : d.monsters(1 - p).length; return n ? { atk: perOpp ? -perOpp * n : -1000 } : null; } });
  define("Boar Soldier", selfDestructs(0));
  define("Nuvia the Wicked", selfDestructs(200));
  define("Invitation to a Dark Sleep", Object.assign({ onSummon: async (d, z, p, how) => {
    if (how === "special") return; const t = await d.pickZone(p, "Which of their monsters can't attack?", (x, q) => q !== p, { sides: [1 - p], area: "monster" }); if (t) z.data.locked = t; } }, lock));
  define("Kotodama", { onSummon: async (d) => { for (const z of up(d).filter((x) => !x.card.token && up(d).some((y) => y !== x && !y.card.token && y.card.no === x.card.no))) if (d.locate(z)) await d.destroy(z, "effect"); },
    onEvent: async (d, z, p, ev) => {
      if (!["summoned", "flip-summoned", "special-summoned", "flipped", "position-changed"].includes(ev.type) || !ev.zone || ev.zone === z || !d.locate(ev.zone) || !ev.zone.faceUp || ev.zone.card.token) return;
      if (up(d).some((y) => y !== ev.zone && !y.card.token && y.card.no === ev.zone.card.no)) await d.destroy(ev.zone, "effect"); } });
  define("Thunder Nyan Nyan", { onEvent: async (d, z, p) => { if (d.locate(z) && up(d, p).some((x) => x !== z && H.attrOf(d, x) !== ATTR.LIGHT)) await d.destroy(z, "effect"); } });
  DM.EFFECTS[N("Thunder Nyan Nyan")].onSummon = DM.EFFECTS[N("Thunder Nyan Nyan")].onEvent;
  for (const n of ["Asura Priest", "Maharaghi", "Otohime"]) define(n, { spirit: true, noSpecial: true });
  Object.assign(DM.EFFECTS[N("Asura Priest")], {
    onEvent: async (d, z, p, ev) => { if (ev.type === "attack" && ev.attacker === z && ev.target) { if (!z.data.asura || z.data.asura.turn !== d.turn) z.data.asura = { turn: d.turn, hit: [] }; z.data.asura.hit.push(ev.target); } },
    attacks: (d, z, p) => { const hit = z.data.asura && z.data.asura.turn === d.turn ? z.data.asura.hit : []; return Math.max(1, z.attacks + (d.monsters(1 - p).some((x) => !hit.includes(x)) ? 1 : 0)); } });
  Object.assign(DM.EFFECTS[N("Maharaghi")], { onSummon: async (d, z, p, how) => { if (flipOrNormal(how)) d.players[p].flags.maharaghiPeek = true; } });
  Object.assign(DM.EFFECTS[N("Otohime")], { onSummon: async (d, z, p, how) => {
    if (!flipOrNormal(how)) return; const t = await d.pickZone(p, "Change the position of which monster?", (x, q) => q !== p && x.faceUp, { sides: [1 - p], area: "monster" }); if (t) await d.changePosition(t, !t.defense); } });
  // (Tributed for a Fiend's Tribute Summon: each duel's emit, above)
  define("Skull Knight #2", { tributeForFiend: true });

  // ----- Ignition effects -----
  define("Goddess of Whim", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d), resolve: async (d, link) => {
    const ok = await H.coinCall(d, link.p); if (link.zone && d.locate(link.zone)) d.addTemp(link.zone, ok ? { atkMult: 2 } : { atkMult: 0.5 }); } } });
  define("The Little Swordsman of Aile", { ignition: { can: (d, ctx) => mine(d, ctx) && canTribute(d, ctx.p, null, ctx.zone), cost: tributeCost(),
    resolve: async (d, link) => { if (link.zone && d.locate(link.zone)) d.addTemp(link.zone, { atk: 700 }); } } });
  const tributeSelf = { cost: async (d, link) => { await d.sendToGrave(link.card, "tribute"); return true; } };
  const backToDeck = (top) => Object.assign({ can: (d, ctx) => mine(d, ctx) && d.players[ctx.p].grave.some((c) => c.battleDestroyedTurn === d.turn && C.isMonster(c.no)),
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Return which monster to your Deck?", d.players[link.p].grave, (c) => c.battleDestroyedTurn === d.turn && C.isMonster(c.no)); if (c) await d.toDeck(c, top, "effect"); } }, tributeSelf);
  define("Crimson Sentry", { ignition: backToDeck(false) });
  define("Lady Panther", { ignition: backToDeck(true) });
  define("Fairy Guardian", { ignition: Object.assign({ can: (d, ctx) => mine(d, ctx) && d.players[ctx.p].grave.some((c) => c.oppSentTurn === d.turn),
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Return which Spell Card to the bottom of your Deck?", d.players[link.p].grave, (c) => c.oppSentTurn === d.turn); if (c) await d.toDeck(c, false, "effect"); } }, tributeSelf) });
  define("Possessed Dark Soul", { ignition: Object.assign({ can: (d, ctx) => mine(d, ctx) && up(d, 1 - ctx.p).some((z) => H.lvl(d, z) <= 3),
    resolve: async (d, link) => { for (const z of up(d, 1 - link.p).filter((x) => H.lvl(d, x) <= 3)) await d.takeControl(z, link.p); } }, tributeSelf) });
  define("Winged Minion", { ignition: Object.assign({ can: (d, ctx) => mine(d, ctx) && up(d).some((z) => z !== ctx.zone && H.isType(d, z, "Fiend")),
    resolve: async (d, link) => { const t = await d.pickZone(link.p, "Give which Fiend 700 ATK and DEF?", (x) => x.faceUp && H.isType(d, x, "Fiend"), { area: "monster" }); if (t) t.links.push({ kind: "self", stats: { atk: 700, def: 700 } }); } }, tributeSelf) });
  define("Ancient Lamp", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && H.canSummonHere(d, ctx.p) && d.players[ctx.p].hand.some((c) => isName(c, "La Jinn the Mystical Genie of the Lamp")),
    resolve: async (d, link) => { const c = d.players[link.p].hand.find((c) => isName(c, "La Jinn the Mystical Genie of the Lamp")); if (c && link.zone && d.locate(link.zone)) await ss(d, link.p, c); } } });

  // ----- Standby, Draw and End Phases -----
  define("Patrol Robo", { standby: async (d, z, p) => {
    if (d.turnPlayer !== p || !d.allZones(1 - p).some((x) => !x.faceUp)) return;
    const t = await d.pickZone(p, "Look at which Set card?", (x, q) => q !== p && !x.faceUp, { sides: [1 - p] }); if (t) await show(d, p, "Their Set card:", [t.card]); } });
  define("Darklord Marie", DM.EFFECTS[N("Marie the Fallen One")]);
  define("Mushroom Man #2", { standby: async (d, z, p) => { if (d.turnPlayer === p) await lose(d, p, 300); },
    endPhase: async (d, z, p) => { if (d.turnPlayer === p && d.players[p].lp > 500 && d.freeMonsterZone(1 - p) >= 0 && (await d.yesNo(p, "Pay 500 LP to give Mushroom Man #2 to your opponent?"))) { await d.payLp(p, 500); await d.takeControl(z, 1 - p); } } });
  define("Dark Zebra", { standby: async (d, z, p) => { if (d.turnPlayer === p && d.monsters(p).length === 1 && !z.defense) { await d.changePosition(z, true); z.changedTurn = d.turn; } } });
  define("Pumpking the King of Ghosts", {
    selfStats: (d, z) => { if (!d.countOnField(N("Castle of Dark Illusions"))) return null; const n = 100 * (1 + (z.data.pump || 0)); return { atk: n, def: n }; },
    standby: async (d, z, p) => { if (d.turnPlayer === p) z.data.pump = d.countOnField(N("Castle of Dark Illusions")) ? Math.min(4, (z.data.pump || 0) + 1) : 0; } });
  define("The Wicked Worm Beast", { endPhase: async (d, z, p) => { if (d.turnPlayer === p && H.isMon(d, z)) await d.toHand(z.card, "effect"); } });
  define("Freed the Matchless General", { negateSpellTarget: true,
    drawPhase: async (d, z, p) => {
      const pl = d.players[p], f = (c) => isMonCard(c) && isT(c.no, "Warrior") && C.level(c.no) <= 4;
      if (pl.flags.skipDraw || pl.flags.skipDraws > 0 || !pl.deck.some(f) || !(await d.yesNo(p, "Add a Level 4 or lower Warrior from your Deck instead of drawing?"))) return;
      pl.flags.skipDraw = true; await H.searchDeck(d, p, f, "Add which Warrior to your hand?"); } });
  define("Twin-Headed Behemoth", { graveEnd: async (d, c, p) => {
    if (c.destroyedTurn !== d.turn || d.players[p].flags.behemoth || !H.canSummonHere(d, p) || !(await d.yesNo(p, "Special Summon Twin-Headed Behemoth with 1000 ATK and DEF?"))) return;
    d.players[p].flags.behemoth = true; const z = await ss(d, p, c); if (z) z.data.base = { atk: 1000, def: 1000 }; } });
  define("Revival Jam", { onDestroyed: async (d, z, p, why) => {
    if (why === "battle" && inGrave(d, z.card) && d.players[p].lp > 1000 && (await d.yesNo(p, "Pay 1000 LP to bring Revival Jam back next Standby Phase?"))) { await d.payLp(p, 1000); z.card.jamTurn = d.turn; } },
    graveStandby: async (d, c, p) => { if (c.jamTurn == null || d.turnPlayer !== p || d.turn <= c.jamTurn) return; c.jamTurn = null; if (H.canSummonHere(d, p)) await ss(d, p, c, { position: null, defense: true }); } });

  // ----- In battle -----
  define("Electric Lizard", { onAttacked: async (d, z, p, att) => { if (!H.isType(d, att, "Zombie")) att.data.cannotAttackUntil = d.turn + 3; } });
  define("Steel Scorpion", { onAttacked: async (d, z, p, att) => { if (!H.isType(d, att, "Machine")) att.data.destroyAtEnd = d.turn + 4; } });
  define("Karakuri Spider", { onBattle: async (d, z, p, o) => { if (d.turnPlayer === p && o && H.attrOf(d, o) === ATTR.DARK) o.data.destroyAfterBattle = true; } });
  // (once while face up, when attacked in the other's turn: the attacker's ATK 0 for the calculation)
  const zeroAttacker = { battleAsk: async (d, z, p, o, attacking) => {
    const A = d.lastAttack;
    if (attacking || d.turnPlayer === p || z.data.zeroed || !A || A.attacker !== o || !(await d.yesNo(p, "Make " + d.name(o.card) + "'s ATK 0 for this battle?"))) return null;
    z.data.zeroed = true; A.atkBonus = (A.atkBonus || 0) - d.atkOf(o); return null; } };
  for (const n of ["Kazejin", "Sanga of the Thunder", "Suijin"]) define(n, zeroAttacker);
  define("Masked Sorcerer", { onBattleDamage: async (d, z, p) => d.drawCards(p, 1) });
  define("Drill Bug", { onBattleDamage: async (d, z, p) => {
    const pl = d.players[p], c = pl.deck.find((x) => isName(x, "Parasite Paracide"));
    if (!c || !(await d.yesNo(p, "Put Parasite Paracide on top of your Deck?"))) return;
    pl.deck.splice(pl.deck.indexOf(c), 1); DM.shuffle(d, pl.deck); pl.deck.unshift(c); } });
  define("Rocket Warrior", { battleImmune: (d, z, p) => d.turnPlayer === p, battleDamage: (d, z, zp, r) => (d.turnPlayer === zp && r === zp ? { n: 0 } : null),
    afterAttack: async (d, z, p, t) => { if (t && d.locate(t)) d.addTemp(t, { atk: -500 }); } });
  define("Big Shield Gardna", { spellShield: true, afterBattle: async (d, z, p, o, attacking) => { if (!attacking && d.locate(z) && z.defense) await d.changePosition(z, false); } });
  define("Dreamsprite", { onEvent: async (d, z, p, ev) => {
    if (ev.type !== "attack" || ev.target !== z || !d.attack || d.attack.target !== z || !d.monsters(p).some((x) => x !== z)) return;
    const t = await d.pickZone(p, "Redirect the attack to which of your monsters?", (x, q) => q === p && x !== z, { sides: [p], area: "monster" }); if (t) d.attack.target = t; } });
  define("Spirit Ryu", { battleAsk: async (d, z, p) => {
    const f = (c) => C.isMonster(c.no) && isT(c.no, "Dragon");
    if (d.turnPlayer === p && d.players[p].hand.some(f) && (await d.yesNo(p, "Discard a Dragon to give Spirit Ryu 1000 ATK and DEF?")) && (await H.discardOne(d, p, "Discard which Dragon?", f))) d.addTemp(z, { atk: 1000, def: 1000 });
    return null; } });
  define("Tyrant Dragon", { negateTrapTarget: true, graveSpecialTribute: "Dragon", attacks: (d, z, p) => (z.attacks >= 1 && d.monsters(1 - p).length ? 2 : 1) });
  // (Flip monsters attacked face down: their flip effect negated)
  const fiend = (d, z) => H.isType(d, z, "Fiend");
  define("Twin-Headed Wolf", { onEvent: async (d, z, p, ev) => { if (ev.type === "attack" && ev.attacker === z && ev.target && !ev.target.faceUp && d.monsters(p).some((x) => x !== z && fiend(d, x))) ev.target.data.noFlipTurn = d.turn; } });
  define("Dark Ruler Ha Des", { noGraveSpecial: true,
    onEvent: async (d, z, p, ev) => { if (ev.type === "attack" && ev.p === p && ev.target && !ev.target.faceUp && fiend(d, ev.attacker)) ev.target.data.noFlipTurn = d.turn; },
    battleResult: (d, s, r, att, target, res, p) => { if (res.targetDies && p === r && fiend(d, att)) target.negated = true; if (res.attackerDies && p !== r && fiend(d, target)) att.negated = true; } });
  // (at the end of the Battle Phase: the monsters it destroyed this turn)
  const victims = { onDestroyByBattle: async (d, z, p, v) => { if (!z.data.victims || z.data.victims.turn !== d.turn) z.data.victims = { turn: d.turn, cards: [] }; z.data.victims.cards.push(v.card); } };
  const victimsOf = (d, z) => (z.data.victims && z.data.victims.turn === d.turn ? z.data.victims.cards.filter((c) => inGrave(d, c)) : []);
  define("Sword Hunter", Object.assign({ battleEnd: async (d, z, p) => { for (const c of victimsOf(d, z)) if (!(await equipCard(d, p, c, z, { atk: 200 }))) break; z.data.victims = null; } }, victims));
  define("Vampire Baby", Object.assign({ battleEnd: async (d, z, p) => {
    const cs = victimsOf(d, z).filter((c) => !C.isExtra(c.no)); z.data.victims = null;
    if (!cs.length || !H.canSummonHere(d, p) || !(await d.yesNo(p, "Special Summon a monster Vampire Baby destroyed?"))) return;
    const c = await d.pickCard(p, "Special Summon which monster?", cs); if (c) await ss(d, p, c); } }, victims));
  define("Des Volstgalph", { onDestroyByBattle: async (d, z, p, v) => { if (inGrave(d, v.card)) await d.damage(1 - p, 500, "effect"); },
    onEvent: async (d, z, p, ev) => { if (ev.type === "activated" && ev.from !== "monster" && C.isSpell(ev.card.no) && [DM.ICON.NORMAL, DM.ICON.QUICK].includes(C.icon(ev.card.no))) d.addTemp(z, { atk: 200 }); } });
  define("Command Knight", { auraSelf: true, aura: (d, src, sp, z, zp) => (zp === sp && isMon(d, z) && z.faceUp && !z.card.token && isT(z.card.no, "Warrior") ? { atk: 400 } : null),
    protectsFromAttack: (d, s, q, z) => z === s && d.monsters(q).length > 1 });
  define("Patrician of Darkness", { chooseTargets: true });

  // ----- Leaving the field, and from the hand or Deck to the Graveyard -----
  define("Archfiend of Gilfer", { onToGrave: async (d, c, p) => {
    if (d.freeSpellZone(p) < 0 || !up(d).length || !(await d.yesNo(p, "Equip Archfiend of Gilfer to a monster (500 ATK less)?"))) return;
    const t = await d.pickZone(p, "Equip Archfiend of Gilfer to which monster?", (x) => x.faceUp, { area: "monster" }); if (t && inGrave(d, c)) await equipCard(d, p, c, t, { atk: -500 }); } });
  define("Amazoness Chain Master", { onDestroyed: async (d, z, p, why) => {
    const q = 1 - p, h = d.players[q].hand;
    if (why !== "battle" || !inGrave(d, z.card) || d.players[p].lp <= 1500 || !h.length || !(await d.yesNo(p, "Pay 1500 LP to look at their hand and take a monster?"))) return;
    await d.payLp(p, 1500); await show(d, p, "Their hand:", h.slice());
    const c = await d.pickCard(p, "Add which of their monsters to your hand?", h, (x) => C.isMonster(x.no)); if (c) await toMyHand(d, p, c); } });
  define("Serpentine Princess", { onLeave: async (d, z, p) => { if (d.players[z.card.owner].deck.includes(z.card)) await summonFromDeck(d, p, (c) => C.level(c.no) <= 3, "Special Summon a Level 3 or lower monster from your Deck?"); } });
  const discardedByOpp = (fn) => ({ onToGrave: async (d, c, p, from, why) => { if (from && from.pile === "hand" && !["cost", "hand-limit", "tribute", "fusion"].includes(why) && byOpp(d, p)) await fn(d, c, p); } });
  define("Electric Snake", discardedByOpp(async (d, c, p) => d.drawCards(p, 2)));
  define("Minar", discardedByOpp(async (d, c, p) => d.damage(1 - p, 1000, "effect")));
  define("Penguin Knight", { onToGrave: async (d, c, p, from) => {
    if (!from || from.pile !== "deck" || !byOpp(d, p)) return;
    const pl = d.players[p]; for (const x of pl.grave.splice(0)) pl.deck.push(x); DM.shuffle(d, pl.deck); await d.emit({ type: "shuffle", p }); } });
  define("Yado Karu", { onEvent: async (d, z, p, ev) => {
    if (ev.type !== "position-changed" || ev.zone !== z || !ev.from.faceUp || ev.from.defense || !ev.defense || !d.players[p].hand.length) return;
    const cs = await d.pickCards(p, "Put which cards from your hand on the bottom of your Deck?", d.players[p].hand, null, { count: d.players[p].hand.length, min: 0 });
    for (const c of cs || []) await d.toDeck(c, false, "effect"); } });
  define("Ameba", { onControl: async (d, z, from, to) => { if (!z.data.ameba) { z.data.ameba = true; await d.damage(to, 2000, "effect"); } } });
  define("Griggle", { onControl: async (d, z, from) => { if (!z.data.griggle) { z.data.griggle = true; await d.heal(from, 3000); } } });

  // ----- On the field -----
  define("Lord of D.", { noTargetDragons: true });
  define("Deepsea Warrior", spellProof((d) => d.countOnField(N("Umi")) > 0));
  define("The Legendary Fisherman", Object.assign(spellProof((d) => umi(d)), {
    protectsFromAttack: (d, s, q, z) => z === s && umi(d),
    // (no other monster to attack: a direct attack instead)
    noAttack: (d, s, q, ap, att) => { if (ap !== q && umi(d) && d.monsters(q).length && d.monsters(q).every((x) => !d.canBeAttacked(x, q, att))) att.data.directTurn = d.turn; return false; } }));
  define("Frontier Wiseman", { guardsWarriors: true });
  define("Weather Report", { flip: async (d, link) => {
    if (await H.destroyAll(d, H.st(d, 1 - link.p).filter((z) => z.faceUp && isName(z.card, "Swords of Revealing Light")))) d.players[link.p].flags.weatherReport = d.turnPlayer === link.p ? d.turn : d.turn + 1; } });
})();

// (Cards beyond GX's: effect monsters, part 2, and their six Fusion Monsters.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo, ICON = DM.ICON;
  const { isName, show, tributeCost, canTribute, destroyOne, summonFromDeck, once, mine, ss, piles, others, union, unionOf } = DM.REST;
  const up = H.up, mons = H.mons, isMon = H.isMon, t0 = H.t, effectOf = DM.effectOf;
  const isT = (no, t) => C.type(no) === typeNo(t);
  const isMonCard = (c) => C.isMonster(c.no) && !C.isExtra(c.no);
  const isST = (c) => !!c && (C.isSpell(c.no) || C.isTrap(c.no));
  const has = (c, part) => !!c && !c.token && C.name(c.no).includes(part);
  const inGrave = (d, c) => !!c && !c.token && d.players[c.owner].grave.includes(c);
  const ctl = (d, z) => d.controllerOf(z);
  const scarab = () => DM.EFFECTS[N("Swarm of Scarabs")].ignition;
  const necro = (d) => d.countOnField(N("Necrovalley")) > 0;
  const isArch = (c) => has(c, "Archfiend") || isName(c, "Fiend Skull Dragon");
  const graveOf = (d, p, f) => d.players[p].grave.filter((c) => C.isMonster(c.no) && f(c));
  // (the link resolving now, and whether what sends p's card away is the opponent's: its link's, or, from a
  // trigger outside a chain, the turn player's when that's the opponent)
  const cur = (d) => (d.fxStack && d.fxStack.length ? d.fxStack[d.fxStack.length - 1] : null);
  const OWN = ["cost", "tribute", "fusion", "hand-limit", "discard", "used", "replaced", "equip-lost"];
  const byOpp = (d, p, why) => { const l = cur(d); return l ? l.p !== p : d.turnPlayer !== p && !OWN.includes(why); };
  const negateLink = async (d, l, destroy) => { l.negated = true; if (destroy && l.zone && d.locate(l.zone)) await d.destroy(l.zone, "effect"); return "negate"; };

  // ---------- Engine hooks these cards need ----------
  // Effect properties read here: onTargeted(d, z, p, link) -> "negate", whenTargeted, afterTargeted, guardsTarget (a
  // card guarding its side's monsters), immuneTo / equipImmuneTo (unaffected by that link), guardsFromDestroy,
  // altTributes (a Tribute Summon with more Tributes), tributeFilter, flipIf, summonIf (Special Summons too),
  // canTarget (the attacker's targets), notAttackTarget (and direct attacks past it), noDiscardCosts, graveBattleEnd,
  // banishedEnd. Player and duel flags: battleSafe, skipMain1, toEnd, noSTTurn.
  const immune = (d, z, p, link) => {
    const e = d.live(z);
    if (e && e.immuneTo && e.immuneTo(d, z, p, link)) return true;
    return z.links.some((l) => { if (l.kind !== "equip" || !l.from || !d.locate(l.from)) return false; const le = effectOf(l.from.card.no); return !!(le && le.equipImmuneTo && le.equipImmuneTo(d, l.from, z, p, link)); });
  };
  // (an effect's targets, picked with H.target: what watches being targeted, when it's picked and when it resolves)
  const target0 = H.target;
  H.target = async function (d, link, prompt, filter, opts) {
    const ok = await target0.call(this, d, link, prompt, filter, opts);
    if (!ok || !link || !link.targets || !link.targets.length || link.watched || typeof link.resolve !== "function") return ok;
    link.watched = true;
    for (const z of link.targets) { const e = d.live(z); if (e && e.whenTargeted && d.locate(z)) await e.whenTargeted(d, z, ctl(d, z), link); }
    const r0 = link.resolve;
    link.resolve = async (d2, l) => {
      const ts = l.targets.filter((z) => d2.locate(z));
      if (ts.length && ts.every((z) => immune(d2, z, ctl(d2, z), l))) { l.negated = true; return; }
      for (const z of ts) {
        const q = ctl(d2, z), e = d2.live(z);
        if (e && e.onTargeted && (await e.onTargeted(d2, z, q, l)) === "negate") return;
        for (const s of d2.allZones(q)) { const es = d2.live(s); if (es && es.guardsTarget && d2.locate(z) && (await es.guardsTarget(d2, s, q, z, l)) === "negate") return; }
        if (l.negated) return;
      }
      await r0(d2, l);
      for (const z of ts) { const e = d2.live(z); if (e && e.afterTargeted && d2.locate(z)) await e.afterTargeted(d2, z, ctl(d2, z), l); }
    };
    return ok;
  };
  const normalOk = (d, p, c, e) => {
    const pl = d.players[p], noSummon = pl.flags.noSummonTurn === d.turn || d.players[1 - p].flags.noSummonFor === d.turn;
    return !pl.normalSummoned && !pl.flags.noNormalSummon && !noSummon && !(e && e.specialOnly) && C.kind(c.no) !== "ritual"
      && !(e && e.needsField && !d.countOnField(N(e.needsField))) && !(e && e.normalIf && !e.normalIf(d, p));
  };
  const kaiserOf = (d, p) => d.monsters(p).find((z) => isName(z.card, "Kaiser Sea Horse") && !z.negated && !z.data.cannotTribute);
  function patch(d) {
    d.fxStack = [];
    const re0 = d.runEffect, ds0 = d.destroy, ma0 = d.mainActions, da0 = d.doAction, sp0 = d.specialSummon, cb0 = d.canBeAttacked,
      ca0 = d.canActivate, mp0 = d.mainPhase, bp0 = d.battlePhase, em0 = d.emit;
    d.runEffect = async function (link) { this.fxStack.push(link); try { return await re0.call(this, link); } finally { this.fxStack.pop(); } };
    d.destroy = async function (z, why, by) {
      const l = this.locate(z);
      if (!l) return false;
      if (why === "battle") { const f = this.players[l.p].flags.battleSafe; if (f && f.turn === this.turn && f.test(this, z)) return false; }
      else { const link = cur(this); if (link && link.zone !== z && immune(this, z, l.p, link)) return false; }
      for (const s of this.allZones(l.p)) { const e = this.live(s); if (e && e.guardsFromDestroy && e.guardsFromDestroy(this, s, l.p, z, why)) return false; }
      // (a monster whose effects are negated if it's destroyed in this battle: Dark Balter, Guardian Baou...)
      if (why === "battle" && z.data.negateIfDies === this.turn && !unionOf(z)) {
        const e = effectOf(z.card.no);
        if (!(e && e.cannotBeDestroyed && z.faceUp && !z.negated && e.cannotBeDestroyed(this, z, l.p, why))) z.negated = true;
      }
      return ds0.call(this, z, why, by);
    };
    d.mainActions = function (p) {
      if (this.flags.toEnd === this.turn) return [{ act: "end", label: "End Turn" }];
      const acts = ma0.call(this, p).filter((a) => {
        const e = (a.card || (a.zone && a.zone.card)) && effectOf((a.card || a.zone.card).no);
        if ((a.act === "summon" || a.act === "set-monster") && a.tributes && e && e.tributeFilter) return this.tributable(p).filter((z) => e.tributeFilter(this, z)).length >= a.tributes;
        if (a.act === "flip-summon" && e && e.flipIf) return e.flipIf(this, p);
        return true;
      });
      const extra = [], k = kaiserOf(this, p);
      for (const c of this.players[p].hand) {
        if (!isMonCard(c)) continue;
        const e = effectOf(c.no);
        if (!normalOk(this, p, c, e)) continue;
        if (e && e.altTributes && this.tributable(p).length >= e.altTributes) extra.push({ act: "summon", card: c, tributes: e.altTributes, label: "Summon " + C.name(c.no) + " (" + e.altTributes + " Tributes)" });
        if (k && C.attribute(c.no) === ATTR.LIGHT && DM.tributesFor(c.no, e) === 2 && !(e && e.tributeFilter))
          for (const act of ["summon", "set-monster"]) extra.push({ act, card: c, tributes: 1, kaiser: k, label: (act === "summon" ? "Summon " : "Set ") + C.name(c.no) + " (Kaiser Sea Horse as 2 Tributes)" });
      }
      const at = acts.findIndex((a) => a.act === "battle" || a.act === "end");
      acts.splice(at < 0 ? acts.length : at, 0, ...extra);
      return acts;
    };
    d.doAction = async function (p, a) {
      const e = a.card && effectOf(a.card.no);
      if ((a.act === "summon" || a.act === "set-monster") && a.tributes && (a.kaiser || (e && e.tributeFilter))) {
        const saved = this.monsters(p).map((z) => [z, z.data.cannotTribute]);
        for (const [z] of saved) if (a.kaiser ? z !== a.kaiser : !e.tributeFilter(this, z)) z.data.cannotTribute = true;
        try { return await da0.call(this, p, a); } finally { for (const [z, v] of saved) z.data.cannotTribute = v; }
      }
      return da0.call(this, p, a);
    };
    d.specialSummon = async function (p, c, opts) { const e = effectOf(c.no); if (e && e.summonIf && !e.summonIf(this, p)) return null; return sp0.call(this, p, c, opts); };
    d.canBeAttacked = function (z, q, att) {
      const ae = att && !att.negated ? effectOf(att.card.no) : null;
      if (ae && ae.canTarget && !ae.canTarget(this, att, 1 - q, z)) return false;
      const te = this.live(z);
      if (te && te.notAttackTarget) {
        if (att && this.monsters(q).every((x) => { const xe = this.live(x); return xe && xe.notAttackTarget; })) att.data.directTurn = this.turn;
        return false;
      }
      return cb0.call(this, z, q, att);
    };
    d.canActivate = function (p, c, a, ctx) {
      if (isST(c) && this.flags.noSTTurn === this.turn) return false;
      if (this.liveWith("noDiscardCosts")) { const e = effectOf(c.no); if ((e && a === e.handQuick) || (a.cost && /discard/i.test(String(a.cost)))) return false; }
      return ca0.call(this, p, c, a, ctx);
    };
    d.mainPhase = async function (p) {
      if (this.flags.toEnd === this.turn) return "end";
      if (this.phase === "main1" && this.players[p].flags.skipMain1) { this.players[p].flags.skipMain1 = false; await this.emit({ type: "skip", p, phase: "main1" }); return "battle"; }
      return mp0.call(this, p);
    };
    d.battlePhase = async function (p) {
      await bp0.call(this, p);
      for (const q of [0, 1]) for (const c of this.players[q].grave.slice()) {
        const e = effectOf(c.no);
        if (e && e.graveBattleEnd && !this.over && this.players[q].grave.includes(c)) await e.graveBattleEnd(this, c, q, p);
      }
    };
    d.emit = async function (ev) {
      if (ev.type === "banish" && ev.card) ev.card.banishedTurn = this.turn;
      await em0.call(this, ev);
      if (ev.type === "phase" && ev.phase === "end") for (const q of [0, 1]) for (const c of this.players[q].banished.slice()) {
        const e = effectOf(c.no);
        if (e && e.banishedEnd && !this.over && this.players[q].banished.includes(c)) await e.banishedEnd(this, c, q);
      }
    };
  }
  const create0 = DM.create;
  DM.create = function (opts) { const d = create0.apply(this, arguments); patch(d); return d; };

  // ---------- Helpers ----------
  // (a monster's battle partner's effects negated if this one destroys it; its flip effect too, if it would be)
  const negatesVictims = (extra) => Object.assign({
    battleResult: (d, s, r, att, target, res) => { if (s === att && res.targetDies) target.data.negateIfDies = d.turn; else if (s === target && res.attackerDies) att.data.negateIfDies = d.turn; },
    beforeAttack: async (d, z, p, t) => { DM.EFFECTS[z.card.no].noFlipInBattle = !!(t && !t.faceUp && d.atkOf(z) > d.defOf(t)); }
  }, extra);
  // (Spells and Traps that target it: negated, and destroyed)
  const stGuard = (test, destroy) => async (d, z, p, l) => { if (test(d, z, p, l)) return negateLink(d, l, destroy); };
  const fromST = (d, z, p, l) => isST(l.card);
  // (the Archfiends: their cost each Standby Phase, and the die against an opponent's effect that targets them)
  const dieGuard = (rolls) => async (d, z, p, l) => { if (l.p === p) return; const r = await H.die(d, p); if (rolls.includes(r)) return negateLink(d, l, true); };
  const archfiend = (cost, rolls, extra) => Object.assign({}, extra, {
    standby: async (d, z, p) => {
      if (d.turnPlayer === p) { if (d.players[p].lp > cost) await d.payLp(p, cost); else { await d.destroy(z, "cost"); return; } }
      if (extra && extra.standby && d.locate(z)) await extra.standby(d, z, p);
    },
    onTargeted: rolls ? dieGuard(rolls) : undefined
  });
  // (destroyed and sent to the GY by the opponent's effect: back at its controller's next Standby Phase)
  const revive = (extra) => Object.assign({
    onToGrave: async (d, c) => { c.reviveFrom = null; },
    onDestroyed: async (d, z, p, why) => { if (why !== "battle" && inGrave(d, z.card) && byOpp(d, p, why)) z.card.reviveFrom = d.turn; },
    graveStandby: async (d, c, p) => { if (c.reviveFrom == null || d.turnPlayer !== p || d.turn <= c.reviveFrom) return; c.reviveFrom = null; if (H.canSummonHere(d, p)) await ss(d, p, c); }
  }, extra);
  // (sent from the hand or Deck to the GY by the opponent's effect: Special Summoned)
  const fromTheDark = { onToGrave: async (d, c, p, from, why) => { if (from && (from.pile === "hand" || from.pile === "deck") && byOpp(d, p, why) && inGrave(d, c) && H.canSummonHere(d, p)) await ss(d, p, c); } };
  // (an Equip Spell from the GY onto this monster, with the equip's own effect)
  async function equipFromGrave(d, z, p) {
    const c = await d.pickCard(p, "Equip which Equip Spell Card from your Graveyard?", d.players[p].grave, (x) => C.isSpell(x.no) && C.icon(x.no) === ICON.EQUIP && effectOf(x.no) && effectOf(x.no).activate, { min: 0 });
    const i = d.freeSpellZone(p);
    if (!c || i < 0 || !d.locate(z) || !z.faceUp) return;
    d.take(c);
    const nz = DM.newZone(c, { faceUp: true, placedTurn: d.turn });
    d.players[p].zones[i] = nz;
    try { await effectOf(c.no).activate.resolve(d, { p, card: c, zone: nz, targets: [z], data: {}, event: null }); } catch (err) { if (err !== DM.STOP) throw err; }
    if (d.locate(nz) && !nz.equippedTo) await d.sendToGrave(c, "used");
  }
  const look = async (d, p) => { const z = await d.pickZone(p, "Look at which Set card?", (x, q, i) => q !== p && i >= 5 && !x.faceUp, { sides: [1 - p], area: "spell" }); if (z) await show(d, p, "Their Set card:", [z.card]); };
  const fromDeckToTop = (filter, prompt) => async (d, link) => {
    const p = link.p, c = await d.pickCard(p, prompt, d.players[p].deck, filter);
    if (!c) return;
    if (necro(d) && (await d.yesNo(p, "Add " + d.name(c) + " to your hand instead (Necrovalley)?"))) { await d.toHand(c, "search"); await d.emit({ type: "reveal", p, card: c }); DM.shuffle(d, d.players[p].deck); return; }
    DM.shuffle(d, d.players[p].deck); await d.toDeck(c, true, "effect");
  };
  // (choose 1 of a Dark Scorpion's effects, or none)
  const scorpion = (opts) => ({ onBattleDamage: async (d, z, p) => {
    const o = await d.choose(p, d.name(z.card) + "'s effect:", opts.map(([label, fn], v) => ({ label, v })).concat([{ label: "None", v: -1 }]));
    if (o && o.v >= 0) await opts[o.v][1](d, z, p); } });
  const mill = (n) => async (d, z, p) => { for (const c of d.players[1 - p].deck.slice(0, n)) await d.sendToGrave(c, "effect"); };
  const guardian = (equipName, extra) => Object.assign({ normalIf: (d, p) => d.countOnField(N(equipName), p) > 0, summonIf: (d, p) => d.countOnField(N(equipName), p) > 0 }, extra);
  const onlyOne = (name) => (d, p) => !up(d, p).some((x) => isName(x.card, name));
  const unionPlus = (base, label, extraCan, act) => Object.assign({}, base, { ignition: {
    can: (d, ctx) => base.ignition.can(d, ctx) || (d.locate(ctx.zone).i >= 5 && !!ctx.zone.equippedTo && extraCan(d, ctx)),
    resolve: async (d, link) => {
      const l = link.zone && d.locate(link.zone);
      if (!l) return;
      if (l.i >= 5 && link.zone.equippedTo && extraCan(d, link)) {
        const o = await d.choose(link.p, d.name(link.card) + ":", [{ label, v: 1 }, { label: "Special Summon it again", v: 0 }]);
        if (o && o.v === 1) return act(d, link, link.zone.equippedTo);
        if (!H.canSummonHere(d, link.p)) return;
      }
      await base.ignition.resolve(d, link);
    } } });
  // (a Union that equips to any monster you control: the union() helper's, for any target)
  function unionAny(stats, extra) {
    return Object.assign({ ignition: {
      can: (d, ctx) => {
        if (!mine(d, ctx) || !once(ctx.zone, d)) return false;
        return d.locate(ctx.zone).i < 5 ? d.freeSpellZone(ctx.p) >= 0 && up(d, ctx.p).some((x) => x !== ctx.zone && !unionOf(x)) : H.canSummonHere(d, ctx.p);
      },
      resolve: async (d, link) => {
        const z = link.zone, l = z && d.locate(z);
        if (!l) return;
        if (l.i >= 5) { const nz = await d.specialSummon(link.p, link.card, { how: "special", defense: false }); if (nz) nz.data.usedTurn = d.turn; return; }
        const t = await d.pickZone(link.p, "Equip " + d.name(link.card) + " to which monster?", (x, q) => q === link.p && x !== z && x.faceUp && !unionOf(x), { sides: [link.p], area: "monster" });
        const i = d.freeSpellZone(link.p);
        if (!t || i < 0) return;
        d.take(link.card);
        const nz = DM.newZone(link.card, { faceUp: true, placedTurn: d.turn });
        nz.data.union = true; nz.data.usedTurn = d.turn;
        d.players[link.p].zones[i] = nz;
        d.equip(nz, t, stats);
        await d.emit({ type: "equip", card: link.card, to: t });
        await d.event({ type: "equipped", p: link.p, card: link.card, zone: t });
      } } }, extra);
  }
  const isUnionCard = (c) => !!c && !c.token && /unequip the Union equipment|Union Monster|Unequip this card and Special Summon it/.test(DM.text(c.no)) && !!(effectOf(c.no) && effectOf(c.no).ignition);
  const tokenStats = (z) => (z.card.token ? z.card.token.atk : C.atk(z.card.no));

  // ----- Tribute Summons -----
  define("Gilford the Lightning", { altTributes: 3, afterTribute: async (d, z, p, tribs) => { if (tribs.length >= 3 && z.faceUp) await H.destroyAll(d, d.monsters(1 - p)); } });
  define("Moisture Creature", { altTributes: 3, afterTribute: async (d, z, p, tribs) => { if (tribs.length >= 3 && z.faceUp) await H.destroyAll(d, H.st(d, 1 - p)); } });
  define("Kaiser Sea Horse", { tributesAsTwo: true });
  define("Victory Dragon", { noSpecial: true, tributes: 3, tributeFilter: (d, z) => d.stats(z).type === typeNo("Dragon") });
  define("Maju Garzett", { afterTribute: async (d, z, p, tribs) => { z.data.base = { atk: tribs.reduce((a, t) => a + tokenStats(t), 0) }; } });
  define("Great Maju Garzett", { afterTribute: async (d, z, p, tribs) => { z.data.base = { atk: 2 * tokenStats(tribs[0]) }; } });
  define("Puppet Master", { afterTribute: async (d, z, p) => {
    const fiends = () => graveOf(d, p, (c) => isT(c.no, "Fiend") && !C.isExtra(c.no));
    if (!z.faceUp || d.players[p].lp <= 2000 || fiends().length < 2 || !H.canSummonHere(d, p) || !(await d.yesNo(p, "Pay 2000 LP to Special Summon 2 Fiends from your Graveyard?"))) return;
    await d.payLp(p, 2000);
    const cs = await d.pickCards(p, "Special Summon which 2 Fiends?", fiends(), null, { count: 2 });
    for (const c of cs || []) { const nz = H.canSummonHere(d, p) ? await ss(d, p, c) : null; if (nz) nz.data.cannotAttackTurn = d.turn; } } });
  define("Gravekeeper's Chief", { normalIf: onlyOne("Gravekeeper's Chief"), necroImmune: true, afterTribute: async (d, z, p) => {
    if (!z.faceUp || !H.canSummonHere(d, p)) return;
    const c = await d.pickCard(p, "Special Summon which Gravekeeper's monster from your Graveyard?", graveOf(d, p, (c) => has(c, "Gravekeeper's") && !C.isExtra(c.no)), null, { min: 0 });
    if (c) await ss(d, p, c); } });

  // ----- Flip effects -----
  define("Jowls of Dark Demise", { flip: async (d, link) => {
    const t = await d.pickZone(link.p, "Take control of which monster?", (x, q) => q !== link.p, { sides: [1 - link.p], area: "monster" });
    if (t && (await d.takeControl(t, link.p))) { t.data.returnAtEnd = { turn: d.turn, to: 1 - link.p }; t.data.directTurn = d.turn; } } });
  define("A Cat of Ill Omen", { flip: fromDeckToTop((c) => C.isTrap(c.no), "Put which Trap on top of your Deck?") });
  define("An Owl of Luck", { flip: fromDeckToTop((c) => C.isSpell(c.no) && C.icon(c.no) === ICON.FIELD, "Put which Field Spell on top of your Deck?") });
  define("Dimension Jar", { flip: async (d, link) => { for (const q of [link.p, 1 - link.p]) {
    const cs = await d.pickCards(q, "Banish up to 3 monsters from your opponent's Graveyard.", H.graveMon(d, 1 - q), null, { count: 3, min: 0 }); for (const c of cs || []) await d.banish(c, "effect"); } } });
  define("Dark Cat with White Tail", { flip: async (d, link) => {
    const theirs = await d.pickZones(link.p, "Return 2 of your opponent's monsters to the hand.", (x, q) => q !== link.p, { sides: [1 - link.p], area: "monster", count: 2 });
    const mine1 = await d.pickZone(link.p, "Return 1 of your monsters to the hand.", (x, q) => q === link.p, { sides: [link.p], area: "monster" });
    for (const z of (theirs || []).concat(mine1 ? [mine1] : [])) if (d.locate(z)) await d.toHand(z.card, "effect"); } });
  define("Magical Merchant", { flip: async (d, link) => { const pl = d.players[link.p];
    const k = pl.deck.findIndex((c) => isST(c)); if (k < 0) return;
    const dig = pl.deck.slice(0, k + 1); await show(d, link.p, "Excavated:", dig);
    await d.toHand(dig[k], "search"); for (const c of dig.slice(0, k)) await d.sendToGrave(c, "effect"); } });
  define("Arsenal Summoner", { flip: async (d, link) => {
    const not = ["Celtic Guardian", "Winged Dragon, Guardian of the Fortress #1", "Winged Dragon, Guardian of the Fortress #2", "Guardian of the Labyrinth", "The Reliable Guardian"];
    const f = (c) => has(c, "Guardian") && !isName(c, not);
    if (d.players[link.p].deck.some(f)) await H.searchDeck(d, link.p, f, "Add which \"Guardian\" card to your hand?"); } });
  define("Cobraman Sakuzy", { ignition: scarab(), flip: async (d, link) => show(d, link.p, "Their Set Spells and Traps:", H.st(d, 1 - link.p).filter((z) => !z.faceUp).map((z) => z.card)) });
  define("Royal Keeper", { ignition: scarab(), flip: async (d, link) => { if (link.zone && d.locate(link.zone)) d.addTemp(link.zone, { atk: 300, def: 300 }, link.card); } });
  define("Wandering Mummy", { ignition: { can: (d, ctx) => scarab().can(d, ctx), resolve: async (d, link) => {
    await scarab().resolve(d, link);
    const zs = d.players[link.p].zones, at = [0, 1, 2, 3, 4].filter((i) => zs[i] && !zs[i].faceUp), set = at.map((i) => zs[i]);
    DM.shuffle(d, set); at.forEach((i, k) => { zs[i] = set[k]; }); } } });

  // ----- On summon -----
  define("Viser Des", { onSummon: async (d, z, p, how) => {
    if (how !== "normal") return;
    const t = await d.pickZone(p, "Target which monster?", (x, q) => q !== p, { sides: [1 - p], area: "monster" }); if (t) z.data.viser = { t, n: 0 }; },
    standby: async (d, z, p) => { const v = z.data.viser; if (!v || d.turnPlayer !== p) return; if (++v.n >= 3) { z.data.viser = null; if (d.locate(v.t)) await d.destroy(v.t, "effect"); } },
    battleImmune: (d, z) => !!(z.data.viser && d.locate(z.data.viser.t)) });
  define("Dark Jeroid", { onSummon: async (d, z, p) => { const t = await d.pickZone(p, "Which face-up monster loses 800 ATK?", (x) => x.faceUp, { area: "monster" }); if (t) t.links.push({ kind: "jeroid", stats: { atk: -800 } }); } });
  define("A Man with Wdjat", { onSummon: async (d, z, p, how) => { if (how === "normal") await look(d, p); }, standby: async (d, z, p) => { if (d.turnPlayer === p) await look(d, p); } });
  define("Cyber Raider", { onSummon: async (d, z, p) => {
    const eqs = H.st(d).filter((x) => x.equippedTo && d.locate(x.equippedTo));
    if (!eqs.length) return;
    const o = await d.choose(p, "Cyber Raider's effect:", [{ label: "Destroy an Equip Card", v: 0 }, { label: "Equip an Equip Card to Cyber Raider", v: 1 }]);
    const eq = await d.pickZone(p, "Which Equip Card?", (x) => eqs.includes(x), { area: "spell" });
    if (!eq) return;
    if (!o || o.v === 0) { await d.destroy(eq, "effect"); return; }
    if (!d.locate(z) || eq.equippedTo === z) return;
    const old = eq.equippedTo, l = old.links.find((k) => k.from === eq);
    old.links = old.links.filter((k) => k !== l);
    eq.equippedTo = z; z.links.push(l || { from: eq, kind: "equip", stats: null });
    await d.emit({ type: "equip", card: eq.card, to: z }); } });
  define("King Tiger Wanghu", { onEvent: async (d, z, p, ev) => {
    if ((ev.type === "summoned" || ev.type === "special-summoned") && ev.zone && ev.zone !== z && d.locate(ev.zone) && ev.zone.faceUp && d.atkOf(ev.zone) <= 1400) await d.destroy(ev.zone, "effect"); } });
  define("Guardian Elma", guardian("Butterfly Dagger - Elma", { onSummon: async (d, z, p, how) => { if (how !== "flip") await equipFromGrave(d, z, p); } }));
  define("Chopman the Desperate Outlaw", { onSummon: async (d, z, p, how) => { if (how === "flip") await equipFromGrave(d, z, p); } });

  // ----- In battle -----
  define("Exarion Universe", { piercing: (d, z) => z.data.pierceTurn === d.turn,
    beforeDamage: async (d, z, p, t) => { if (t && t.defense && d.atkOf(z) >= 400 && (await d.yesNo(p, "Make Exarion Universe lose 400 ATK to inflict piercing damage?"))) { d.addTemp(z, { atk: -400 }); z.data.pierceTurn = d.turn; } } });
  define("Timeater", { onDestroyByBattle: async (d, z, p) => { d.players[1 - p].flags.skipMain1 = true; } });
  define("Mystical Knight of Jackal", { onDestroyByBattle: async (d, z, p, v) => { if (v.card.owner !== p && inGrave(d, v.card) && (await d.yesNo(p, "Return " + d.name(v.card) + " to the top of their Deck?"))) await d.toDeck(v.card, true, "effect"); } });
  define("Winged Sage Falcos", { onDestroyByBattle: async (d, z, p, v) => { if (v.faceUp && !v.defense && inGrave(d, v.card) && (await d.yesNo(p, "Put " + d.name(v.card) + " on top of their Deck?"))) await d.toDeck(v.card, true, "effect"); } });
  define("Helping Robo for Combat", { onDestroyByBattle: async (d, z, p) => { await d.drawCards(p, 1); const c = await d.pickCard(p, "Put which card on the bottom of your Deck?", d.players[p].hand); if (c) await d.toDeck(c, false, "effect"); } });
  define("Great Dezard", { onDestroyByBattle: async (d, z) => { z.data.kills = (z.data.kills || 0) + 1; },
    onTargeted: stGuard((d, z, p, l) => (z.data.kills || 0) >= 1 && isST(l.card), true),
    ignition: { can: (d, ctx) => mine(d, ctx) && (ctx.zone.data.kills || 0) >= 2 && piles(d, ctx.p, ["hand", "deck"]).some((c) => isName(c, "Fushioh Richie")),
      cost: async (d, link) => { await d.sendToGrave(link.card, "tribute"); return true; },
      resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon Fushioh Richie.", piles(d, link.p, ["hand", "deck"]), (x) => isName(x, "Fushioh Richie")); if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } } });
  define("Fushioh Richie", { specialOnly: true, ignition: scarab(), onTargeted: stGuard(fromST, true),
    flip: async (d, link) => { if (!H.canSummonHere(d, link.p)) return; const c = await d.pickCard(link.p, "Special Summon a Zombie from your Graveyard?", graveOf(d, link.p, (c) => isT(c.no, "Zombie") && !C.isExtra(c.no)), null, { min: 0 }); if (c) await ss(d, link.p, c); } });
  define("Spirit Reaper", { battleImmune: () => true, afterTargeted: async (d, z) => { if (z.faceUp) await d.destroy(z, "effect"); },
    onBattleDamage: async (d, z, p, other) => { if (!other) await H.discardRandom(d, 1 - p); } });
  define("Blade Knight", { selfStats: (d, z) => (d.players[ctl(d, z)].hand.length <= 1 ? { atk: 400 } : null),
    beforeAttack: async (d, z, p, t) => { DM.EFFECTS[z.card.no].noFlipInBattle = !!(t && !t.faceUp && !others(d, p, z).some((x) => isMon(d, x)) && d.atkOf(z) > d.defOf(t)); } });
  define("Cat's Ear Tribe", {
    onBattle: async (d, z, p, o) => { if (d.turnPlayer === p || !o || !d.locate(o)) return; const t = { zone: o, stats: { atk: 200 - tokenStats(o) } }; d.temp.push(t); z.data.catTemp = t; },
    afterBattle: async (d, z) => { const t = z.data.catTemp; if (t) { d.temp = d.temp.filter((x) => x !== t); z.data.catTemp = null; } },
    onDestroyed: async (d, z) => { const t = z.data.catTemp; if (t) { d.temp = d.temp.filter((x) => x !== t); z.data.catTemp = null; } } });
  define("Ultimate Obedient Fiend", negatesVictims({ cannotAttack: (d, z, p) => others(d, p, z).length > 0 || d.players[p].hand.length > 0 }));
  define("Berserk Dragon", { specialOnly: true,
    attacks: (d, z, p) => { const hit = z.data.hit && z.data.hit.turn === d.turn ? z.data.hit.list : []; return z.attacks + d.monsters(1 - p).filter((x) => !hit.includes(x)).length || 1; },
    canTarget: (d, z, p, t) => !(z.data.hit && z.data.hit.turn === d.turn && z.data.hit.list.includes(t)),
    beforeAttack: async (d, z, p, t) => { if (!z.data.hit || z.data.hit.turn !== d.turn) z.data.hit = { turn: d.turn, list: [] }; if (t) z.data.hit.list.push(t); },
    endPhase: async (d, z, p) => { if (d.turnPlayer === p) z.links.push({ kind: "self", stats: { atk: -500 } }); } });
  define("Different Dimension Dragon", { battleImmune: (d, z, p, o) => d.atkOf(o) <= 1900,
    cannotBeDestroyed: (d, z, p, why) => { const l = cur(d); return why !== "battle" && !!l && isST(l.card) && !l.targets.includes(z); } });
  define("Guardian Baou", guardian("Wicked-Breaking Flamberge - Baou", negatesVictims({ onDestroyByBattle: async (d, z, p, v) => { if (inGrave(d, v.card)) z.links.push({ kind: "self", stats: { atk: 1000 } }); } })));
  define("Gravekeeper's Assailant", { onEvent: async (d, z, p, ev) => {
    if (ev.type !== "attack" || ev.attacker !== z || !necro(d)) return;
    const t = await d.pickZone(p, "Change the battle position of which monster?", (x, q) => q !== p && x.faceUp, { sides: [1 - p], area: "monster", min: 0, cancel: true });
    if (t && d.locate(t)) await d.changePosition(t, !t.defense); } });
  define("Shadowknight Archfiend", archfiend(900, [3], { halfDamage: true }));
  define("Berserk Gorilla", { onEvent: async (d, z) => { if (z.faceUp && z.defense && d.locate(z)) await d.destroy(z, "effect"); } });

  // ----- Battle damage -----
  define("Vampire Lord", revive({ onBattleDamage: async (d, z, p) => {
    const o = await d.choose(p, "Declare a card type.", [{ label: "Monster", f: C.isMonster }, { label: "Spell", f: C.isSpell }, { label: "Trap", f: C.isTrap }]);
    const q = 1 - p, c = o && (await d.pickCard(q, "Send which " + o.label + " from your Deck to the Graveyard?", d.players[q].deck, (x) => o.f(x.no)));
    if (c) await d.sendToGrave(c, "effect"); DM.shuffle(d, d.players[q].deck); } }));
  define("Dark Scorpion Burglars", { onBattleDamage: async (d, z, p) => { const q = 1 - p, c = await d.pickCard(q, "Send which Spell from your Deck to the Graveyard?", d.players[q].deck, (x) => C.isSpell(x.no)); if (c) await d.sendToGrave(c, "effect"); DM.shuffle(d, d.players[q].deck); } });
  define("Great Phantom Thief", { onBattleDamage: async (d, z, p) => {
    const q = 1 - p, names = [...new Set(piles(d, q, ["hand", "deck"]).map((c) => c.no))].map((no) => ({ label: C.name(no), no }));
    const o = await d.choose(p, "Declare a card name.", names); if (!o) return;
    await show(d, p, "Their hand:", d.players[q].hand);
    for (const c of d.players[q].hand.filter((c) => c.no === o.no)) await d.discard(q, c, "effect"); } });
  define("Dark Scorpion - Cliff the Trap Remover", scorpion([
    ["Destroy a Spell or Trap Card", async (d, z, p) => { await destroyOne(d, p, "Destroy which Spell or Trap Card?", (x, q, i) => i >= 5, "spell"); }],
    ["Send the top 2 cards of their Deck to the Graveyard", mill(2)]]));
  define("Dark Scorpion - Chick the Yellow", scorpion([
    ["Return a card on the field to the hand", async (d, z, p) => { const t = await d.pickZone(p, "Return which card to the hand?", () => true); if (t) await d.toHand(t.card, "effect"); }],
    ["Look at the top card of their Deck", async (d, z, p) => { const c = d.players[1 - p].deck[0]; if (!c) return; await show(d, p, "Their top card:", [c]);
      if (!(await d.yesNo(p, "Leave " + d.name(c) + " on top (or put it on the bottom)?"))) await d.toDeck(c, false, "effect"); }]]));
  define("Dark Scorpion - Gorg the Strong", scorpion([
    ["Return a monster to the top of their Deck", async (d, z, p) => { const t = await d.pickZone(p, "Return which monster to the top of the Deck?", (x, q) => q !== p, { sides: [1 - p], area: "monster" }); if (t) await d.toDeck(t.card, true, "effect"); }],
    ["Send the top card of their Deck to the Graveyard", mill(1)]]));
  define("Dark Scorpion - Meanae the Thorn", scorpion([
    ["Add a \"Dark Scorpion\" card from your Deck", async (d, z, p) => { if (d.players[p].deck.some((c) => has(c, "Dark Scorpion"))) await H.searchDeck(d, p, (c) => has(c, "Dark Scorpion")); }],
    ["Add a \"Dark Scorpion\" card from your Graveyard", async (d, z, p) => { const c = await d.pickCard(p, "Add which Dark Scorpion card?", d.players[p].grave, (c) => has(c, "Dark Scorpion")); if (c) await d.toHand(c); }]]));
  define("Goblin Zombie", { onBattleDamage: async (d, z, p) => mill(1)(d, z, p),
    onToGrave: async (d, c, p, from) => { const f = (x) => isMonCard(x) && isT(x.no, "Zombie") && C.def(x.no) <= 1200; if (from && from.zone != null && from.zone < 5 && d.players[p].deck.some(f)) await H.searchDeck(d, p, f, "Add which Zombie with 1200 or less DEF to your hand?"); } });

  // ----- Destroyed, and to the Graveyard -----
  define("Gernia", revive());
  define("Despair from the Dark", fromTheDark);
  define("Fear from the Dark", fromTheDark);
  define("Makyura the Destructor", { onToGrave: async (d, c, p, from) => {
    const pl = d.players[p];
    if (!from || from.zone == null || from.zone >= 5 || pl.flags.makyura === d.turn || d.freeSpellZone(p) < 0 || !pl.hand.some((x) => C.isTrap(x.no))) return;
    const t = await d.pickCard(p, "Set a Trap from your hand to activate this turn?", pl.hand, (x) => C.isTrap(x.no), { min: 0 });
    if (!t) return;
    pl.flags.makyura = d.turn; d.take(t);
    const i = d.freeSpellZone(p); pl.zones[i] = DM.newZone(t, { faceUp: false, placedTurn: -1 });
    await d.emit({ type: "set-spell", p, i, zone: pl.zones[i], card: t }); } });
  define("Neko Mane King", { onToGrave: async (d, c, p, from, why) => {
    if (d.turnPlayer === p || why === "battle" || !byOpp(d, p, why)) return;
    d.flags.toEnd = d.turn; H.endBattle(d); H.negateAttack(d); await d.emit({ type: "skip", p: d.turnPlayer, phase: "to-end" }); } });
  define("Pixie Knight", { onToGrave: async (d, c, p, from, why) => { if (why !== "battle") return; const s = await d.pickCard(1 - p, "Put which of their Spells on top of their Deck?", d.players[p].grave, (x) => C.isSpell(x.no)); if (s) await d.toDeck(s, true, "effect"); } });
  define("Helpoemer", { noGraveSpecial: true, onToGrave: async (d, c, p, from, why) => { c.helpoemer = why === "battle"; },
    graveBattleEnd: async (d, c, p, tp) => { if (tp !== p && c.helpoemer) await H.discardRandom(d, tp); } });
  define("Lord Poison", { onDestroyed: async (d, z, p, why) => {
    if (why !== "battle" || !inGrave(d, z.card) || !H.canSummonHere(d, p)) return;
    const c = await d.pickCard(p, "Special Summon which Plant from your Graveyard?", graveOf(d, p, (c) => isT(c.no, "Plant") && !C.isExtra(c.no) && !isName(c, "Lord Poison"))); if (c) await ss(d, p, c); } });
  define("Guardian Tryce", guardian("Twin Swords of Flashing Light - Tryce", { afterTribute: async (d, z, p, tribs) => { const t = tribs.find((x) => !x.card.token); if (t) z.data.tryce = t.card; },
    onDestroyed: async (d, z, p) => { const c = z.data.tryce; if (c && inGrave(d, c) && inGrave(d, z.card) && H.canSummonHere(d, p)) await ss(d, p, c); } }));
  define("D.D. Scout Plane", { banishedEnd: async (d, c, p) => { if (c.banishedTurn === d.turn && c.scoutTurn !== d.turn && H.canSummonHere(d, p)) { c.scoutTurn = d.turn; await d.specialSummon(p, c, { how: "special", defense: false }); } } });

  // ----- Ignition and quick effects -----
  define("Roulette Barrel", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d), resolve: async (d, link) => {
    const a = await H.die(d, link.p), b = await H.die(d, link.p);
    const o = a === b ? { v: a } : await d.choose(link.p, "Choose a result.", [{ label: String(a), v: a }, { label: String(b), v: b }]);
    if (o) await destroyOne(d, link.p, "Destroy which Level " + o.v + " monster?", (x) => d.stats(x).level === o.v, "monster"); } } });
  define("Sasuke Samurai #2", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.players[ctx.p].lp > 800, cost: async (d, link) => { await d.payLp(link.p, 800); return true; },
    resolve: async (d) => { d.flags.noSTTurn = d.turn; } } });
  define("Chaosrider Gustaph", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.players[ctx.p].grave.some((c) => C.isSpell(c.no)), resolve: async (d, link) => {
    const cs = await d.pickCards(link.p, "Banish up to 2 Spell Cards from your Graveyard.", d.players[link.p].grave, (c) => C.isSpell(c.no), { count: 2, min: 1 });
    for (const c of cs || []) await d.banish(c, "cost");
    if (cs && cs.length && link.zone && d.locate(link.zone)) link.zone.links.push({ kind: "self", stats: { atk: 300 * cs.length }, until: d.turn + 1 }); } } });
  define("Freed the Brave Wanderer", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && graveOf(d, ctx.p, (c) => C.attribute(c.no) === ATTR.LIGHT).length >= 2 && up(d).some((x) => d.atkOf(x) > d.atkOf(ctx.zone)),
    cost: async (d, link) => { const cs = await d.pickCards(link.p, "Banish 2 LIGHT monsters from your Graveyard.", graveOf(d, link.p, (c) => C.attribute(c.no) === ATTR.LIGHT), null, { count: 2, cancel: true }); if (!cs || cs.length < 2) return false; for (const c of cs) await d.banish(c, "cost"); return true; },
    target: (d, link) => H.target(d, link, "Destroy which monster with higher ATK?", (x) => x.faceUp && d.atkOf(x) > d.atkOf(link.zone), { area: "monster" }),
    resolve: async (d, link) => { const t = t0(d, link); if (t && link.zone && d.locate(link.zone) && t.faceUp && d.atkOf(t) > d.atkOf(link.zone)) await d.destroy(t, "effect"); } } });
  define("Lekunga", { ignition: { repeatable: true, can: (d, ctx) => graveOf(d, ctx.p, (c) => C.attribute(c.no) === ATTR.WATER).length >= 2 && d.freeMonsterZone(ctx.p) >= 0,
    cost: async (d, link) => { const cs = await d.pickCards(link.p, "Banish 2 WATER monsters from your Graveyard.", graveOf(d, link.p, (c) => C.attribute(c.no) === ATTR.WATER), null, { count: 2, cancel: true }); if (!cs || cs.length < 2) return false; for (const c of cs) await d.banish(c, "cost"); return true; },
    resolve: async (d, link) => { await d.summonToken(link.p, { name: "Lekunga Token", atk: 700, def: 700, level: 2, type: typeNo("Plant"), attribute: ATTR.WATER }); } } });
  const strike = { when: ["main", "any"], can: (d, ctx) => d.players[ctx.p].flags.strikeNinja !== d.turn && graveOf(d, ctx.p, (c) => C.attribute(c.no) === ATTR.DARK).length >= 2,
    cost: async (d, link) => { const cs = await d.pickCards(link.p, "Banish 2 DARK monsters from your Graveyard.", graveOf(d, link.p, (c) => C.attribute(c.no) === ATTR.DARK), null, { count: 2, cancel: true }); if (!cs || cs.length < 2) return false; d.players[link.p].flags.strikeNinja = d.turn; for (const c of cs) await d.banish(c, "cost"); return true; },
    resolve: async (d, link) => { if (!link.zone || !d.locate(link.zone) || !link.zone.faceUp) return; link.card.strikeBack = d.turn; await d.banish(link.card, "effect"); } };
  define("Strike Ninja", { quick: strike, ignition: Object.assign({}, strike, { when: undefined }),
    banishedEnd: async (d, c, p) => { if (c.strikeBack !== d.turn) return; c.strikeBack = null; if (d.freeMonsterZone(p) >= 0) await d.placeMonster(p, c, { how: "special" }); } });
  define("Guardian Ceal", guardian("Shooting Star Bow - Ceal", { ignition: { repeatable: true,
    can: (d, ctx) => ctx.zone.links.some((l) => l.kind === "equip" && l.from && d.locate(l.from) && C.isSpell(l.from.card.no)) && d.monsters(1 - ctx.p).length > 0,
    cost: async (d, link) => { const eq = await d.pickZone(link.p, "Send which Equip Spell to the Graveyard?", (x) => x.equippedTo === link.zone && C.isSpell(x.card.no), { area: "spell", cancel: true }); if (!eq) return false; await d.sendToGrave(eq.card, "cost"); return true; },
    target: (d, link) => H.target(d, link, "Destroy which monster?", (x, q) => q !== link.p, { area: "monster", sides: [1 - link.p] }),
    resolve: async (d, link) => { const t = t0(d, link); if (t) await d.destroy(t, "effect"); } } }));
  define("Guardian Grarl", guardian("Gravity Axe - Grarl", { specialFromHand: (d, p) => d.players[p].hand.length === 1 && d.countOnField(N("Gravity Axe - Grarl"), p) > 0 }));
  define("Super Robolady", { ignition: { can: (d, ctx) => mine(d, ctx) && ctx.zone.placedTurn !== d.turn && d.players[ctx.p].fusion.some((c) => isName(c, "Super Roboyarou")),
    resolve: async (d, link) => { if (!link.zone || !d.locate(link.zone)) return; await d.toDeck(link.card, true, "effect"); const c = d.players[link.p].fusion.find((x) => isName(x, "Super Roboyarou")); if (c) await ss(d, link.p, c); } },
    battleDamage: (d, z, zp, r, n, dealer, other) => (dealer && !other && r !== zp ? { n: n + 1000 } : null) });
  define("Super Roboyarou", { ignition: { can: (d, ctx) => mine(d, ctx) && ctx.zone.placedTurn !== d.turn && d.players[ctx.p].fusion.some((c) => isName(c, "Super Robolady")),
    resolve: async (d, link) => { if (!link.zone || !d.locate(link.zone)) return; await d.toDeck(link.card, true, "effect"); const c = d.players[link.p].fusion.find((x) => isName(x, "Super Robolady")); if (c) await ss(d, link.p, c); } },
    battleStats: (d, z, p, o) => (o ? { atk: 1000 } : null) });
  // (negating a Normal Spell or Trap for 1000 LP)
  const lpNegator = (test) => ({ when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && test(ctx.last.card.no) && d.players[ctx.p].lp > 1000,
    cost: async (d, link) => { await d.payLp(link.p, 1000); return true; }, resolve: async (d, link) => { if (link.prev) link.prev.negated = true; } });
  define("Dark Balter the Terrible", negatesVictims({ quick: lpNegator((no) => C.isSpell(no) && C.icon(no) === ICON.NORMAL) }));
  define("Ryu Senshi", { quick: lpNegator((no) => C.isTrap(no) && C.icon(no) === ICON.NORMAL), onTargeted: stGuard((d, z, p, l) => C.isSpell(l.card.no), true) });
  define("Fiend Skull Dragon", { negatesFlips: true, onTargeted: stGuard((d, z, p, l) => C.isTrap(l.card.no), true) });
  define("Chaos Command Magician", { onTargeted: stGuard((d, z, p, l) => C.isMonster(l.card.no), false) });
  define("Reaper on the Nightmare", { battleImmune: () => true, directAttack: true, whenTargeted: async (d, z) => { await d.destroy(z, "effect"); },
    onBattleDamage: async (d, z, p, other) => { if (!other) await H.discardRandom(d, 1 - p); } });

  // ----- From the hand -----
  define("Charm of Shabti", { handQuick: { when: "attack", can: (d, ctx) => up(d, ctx.p).some((z) => has(z.card, "Gravekeeper's")),
    resolve: async (d, link) => { d.players[link.p].flags.battleSafe = { turn: d.turn, test: (d2, z) => has(z.card, "Gravekeeper's") }; } } });
  define("Gravekeeper's Watcher", { handQuick: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && /discard/i.test(DM.text(ctx.last.card.no)),
    resolve: async (d, link) => { const v = link.prev; if (!v) return; v.negated = true; if (v.zone && d.locate(v.zone)) await d.destroy(v.zone, "negated"); } } });
  define("Desrook Archfiend", archfiend(500, [3], { handQuick: { when: ["destroyed", "battle-destroyed"],
    can: (d, ctx) => ctx.event.p === ctx.p && isName(ctx.event.card, "Terrorking Archfiend") && inGrave(d, ctx.event.card) && H.canSummonHere(d, ctx.p),
    resolve: async (d, link) => { const c = link.event && link.event.card; if (c && inGrave(d, c) && H.canSummonHere(d, link.p)) await ss(d, link.p, c); } } }));

  // ----- Unions -----
  const beastOnDamage = (faceUp) => ({ onEvent: async (d, z, p, ev) => {
    if (ev.type !== "battle-damage" || !z.data.union || !z.equippedTo || ev.dealer !== z.equippedTo || ev.p === p) return;
    await destroyOne(d, p, "Destroy which face-" + (faceUp ? "up" : "down") + " Spell or Trap Card?", (x, q, i) => i >= 5 && x.faceUp === faceUp, "spell"); } });
  define("Burning Beast", union(["Freezing Beast"], null, beastOnDamage(true)));
  define("Freezing Beast", union(["Burning Beast"], null, beastOnDamage(false)));
  define("Kiryu", unionPlus(union(["Dark Blade"], { atk: 900, def: 900 }), "Tribute Kiryu: it attacks directly this turn", (d, ctx) => mine(d, ctx) && d.phase === "main1",
    async (d, link, t) => { await d.sendToGrave(link.card, "tribute"); if (d.locate(t)) t.data.directTurn = d.turn; }));
  define("Second Goblin", unionPlus(union(["Giant Orc"]), "Change the equipped monster's battle position", (d, ctx) => mine(d, ctx),
    async (d, link, t) => { if (d.locate(t)) await d.changePosition(t, !t.defense); }));
  define("Metallizing Parasite - Lunatite", unionAny(null, { equipImmuneTo: (d, eq, z, p, l) => !!eq.data.union && C.isSpell(l.card.no) && l.p !== p }));
  define("Union Rider", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.freeSpellZone(ctx.p) >= 0 && up(d, 1 - ctx.p).some((x) => isUnionCard(x.card)),
    resolve: async (d, link) => {
      const t = await d.pickZone(link.p, "Take which Union monster?", (x, q) => q !== link.p && x.faceUp && isUnionCard(x.card), { sides: [1 - link.p], area: "monster" });
      const i = d.freeSpellZone(link.p);
      if (!t || i < 0 || !link.zone || !d.locate(link.zone)) return;
      d.take(t.card);
      const nz = DM.newZone(t.card, { faceUp: true, placedTurn: d.turn, negated: true });
      d.players[link.p].zones[i] = nz; d.equip(nz, link.zone, null);
      await d.emit({ type: "equip", card: t.card, to: link.zone }); } } });

  // ----- Standby and End Phases -----
  define("Amazoness Blowpiper", { standby: async (d, z, p) => { if (d.turnPlayer !== p) return; const t = await d.pickZone(p, "Which monster loses 500 ATK?", (x, q) => q !== p && x.faceUp, { sides: [1 - p], area: "monster" }); if (t) d.addTemp(t, { atk: -500 }, z.card); } });
  define("Little-Winguard", { endPhase: async (d, z, p) => { if (d.turnPlayer === p && (await d.yesNo(p, "Change Little-Winguard's battle position?"))) await d.changePosition(z, !z.defense); } });
  define("Coach Goblin", { endPhase: async (d, z, p) => {
    const f = (c) => C.kind(c.no) === "normal";
    if (d.turnPlayer !== p || !d.players[p].hand.some(f)) return;
    const c = await d.pickCard(p, "Return a Normal Monster to the bottom of your Deck to draw 1?", d.players[p].hand, f, { min: 0 });
    if (c) { await d.toDeck(c, false, "effect"); await d.drawCards(p, 1); } } });
  for (const [n, cost, rolls] of [["Darkbishop Archfiend", 500, null], ["Vilepawn Archfiend", 500, [3]], ["Terrorking Archfiend", 800, [2, 5]], ["Skull Archfiend of Lightning", 500, [1, 3, 6]]]) define(n, archfiend(cost, rolls));
  Object.assign(DM.EFFECTS[N("Darkbishop Archfiend")], { guardsTarget: async (d, s, q, z, l) => { if (l.p !== q && isArch(z.card) && z.faceUp) return dieGuard([1, 3, 6])(d, z, q, l); } });
  Object.assign(DM.EFFECTS[N("Vilepawn Archfiend")], { protectsFromAttack: (d, s, q, z) => z !== s && z.faceUp && isArch(z.card) });
  Object.assign(DM.EFFECTS[N("Terrorking Archfiend")], negatesVictims({ normalIf: (d, p) => d.monsters(p).some((x) => x.faceUp && isArch(x.card)), flipIf: (d, p) => d.monsters(p).some((x) => x.faceUp && isArch(x.card)) }));
  define("Infernalqueen Archfiend", archfiend(500, [2, 5], { standby: async (d, z, p) => {
    const t = await d.pickZone(p, "Give which Archfiend 1000 ATK this turn?", (x) => x.faceUp && isArch(x.card), { area: "monster" }); if (t) d.addTemp(t, { atk: 1000 }, z.card); } }));

  // ----- On the field -----
  define("Amazoness Tiger", { normalIf: onlyOne("Amazoness Tiger"), selfStats: (d, z) => ({ atk: 400 * up(d, ctl(d, z)).filter((x) => has(x.card, "Amazoness")).length }),
    protectsFromAttack: (d, s, q, z) => z !== s && z.faceUp && has(z.card, "Amazoness") });
  define("Magician's Valkyria", { protectsFromAttack: (d, s, q, z) => z !== s && z.faceUp && H.isType(d, z, "Spellcaster") });
  define("Blindly Loyal Goblin", { noControlChange: true });
  define("Goblin of Greed", { noDiscardCosts: true });
  define("Pandemonium Watchbear", { guardsFromDestroy: (d, s, sp, z, why) => isName(z.card, "Pandemonium") && byOpp(d, sp, why) });
  define("Guardian Kay'est", guardian("Rod of Silence - Kay'est", { notAttackTarget: true, immuneTo: (d, z, p, l) => C.isSpell(l.card.no) }));
})();

// (Cards beyond GX's: their Spells, Normal, Quick-Play, Continuous, Equip and Field.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo, ICON = DM.ICON;
  const { isName, show, tributeCost, canTribute, discardCost, handCount, destroyOne, once, mine, noop, ss, piles, unionOf } = DM.REST;
  const up = H.up, mons = H.mons, t0 = H.t, isMon = H.isMon;
  const isT = (no, t) => C.type(no) === typeNo(t);
  const isMonCard = (c) => C.isMonster(c.no) && !C.isExtra(c.no);
  const has = (c, part) => !!c && !c.token && C.name(c.no).includes(part);
  const archfiend = (c) => has(c, "Archfiend") && C.isMonster(c.no);
  const isSpirit = (c) => !!c && !c.token && !!(DM.effectOf(c.no) || {}).spirit;
  const pickMon = (d, link, prompt, filter, sides) => H.target(d, link, prompt, (z, q) => (!sides || sides.includes(q)) && (!filter || filter(z, q)), { area: "monster" });
  const stays = (extra) => Object.assign({ activate: Object.assign({ stays: true }, noop) }, extra);
  const inGrave = (d, c) => !!c && !c.token && [0, 1].some((q) => d.players[q].grave.includes(c));
  // (Normal Summonable: not a Ritual, nor one only Special Summoned)
  const summonable = (c) => isMonCard(c) && C.kind(c.no) !== "ritual" && !(DM.effectOf(c.no) || {}).specialOnly;
  const orig = (z) => { const tk = z.card.token, b = z.data.base || {}; return { atk: b.atk != null ? b.atk : tk ? tk.atk : C.atk(z.card.no), def: b.def != null ? b.def : tk ? tk.def : C.def(z.card.no) }; };
  const setLp = async (d, p, v) => { const n = v - d.players[p].lp; d.players[p].lp = v; await d.emit({ type: "lp", p, amount: n, lp: v, why: "effect" }); d.checkWin(); };
  // (a card into a player's hand, whoever owns it: Exchange)
  const giveTo = async (d, c, p) => { d.take(c); d.players[p].hand.push(c); await d.emit({ type: "to-hand", card: c, why: "effect" }); };
  // Declaring a card name: every card's (a filter for the kind).
  const NAMES = {};
  const names = (key, filter) => NAMES[key] || (NAMES[key] = window.YUGIOH_CARDS.cards.map((c, no) => (c && (!filter || filter(no)) ? { label: c[0], value: no } : null)).filter(Boolean)
    .filter((o, k, a) => a.findIndex((x) => x.label === o.label) === k).sort((a, b) => (a.label < b.label ? -1 : 1)));
  const declare = async (d, p, prompt, monsters) => { const o = await d.choose(p, prompt, monsters ? names("mon", (no) => C.isMonster(no)) : names("all")); return o ? o.value : 0; };

  // ---------- What the duel keeps for these cards: this turn's record, tasks for later, and its rules ----------
  // (each duel's own: d.spx; the duel's functions wrapped once, at its creation)
  const X = (d) => d.spx || (d.spx = { tasks: [], closed: [], t: -1 });
  const cur = (d) => { const x = X(d); if (x.t !== d.turn) { x.t = d.turn; x.c = { monGone: [false, false], bigGone: [false, false], dragons: [0, 0] }; } return x.c; };
  // (something to do later: at this turn's End Phase, or at p's next Standby Phase)
  const atEnd = (d, fn) => X(d).tasks.push({ at: "end", turn: d.turn, fn });
  const atStandby = (d, p, fn) => X(d).tasks.push({ at: "standby", p, after: d.turn, fn });
  async function runTasks(d, at, p) {
    const x = X(d), due = x.tasks.filter((t) => t.at === at && (at === "end" ? t.turn === d.turn : t.p === p && d.turn > t.after));
    x.tasks = x.tasks.filter((t) => !due.includes(t));
    for (const t of due) { if (d.over) return; await t.fn(d); }
  }
  const summonedNow = (d, z) => z.placedTurn === d.turn || z.data.flipTurn === d.turn;
  const spellLink = (l) => !!l && !!l.card && !l.fromMonster && C.isSpell(l.card.no);
  // (Non-Spellcasting Area: a face-up monster that isn't an Effect Monster, against another Spell's effect)
  const nsaImmune = (d, z, l) => !!z && H.isMon(d, z) && z.faceUp && spellLink(l) && !isName(l.card, "Non-Spellcasting Area") && (z.card.token || C.kind(z.card.no) === "normal" || !DM.effectOf(z.card.no)) && !!d.liveWith("nonSpellcasting");
  const nsaCard = (d, c) => { const l = d.zoneOf(c); return !!l && nsaImmune(d, l.z, d.curLink); };
  // (Gravekeeper's Chief: its controller's Graveyard out of Necrovalley's reach)
  const necro = (d, c) => inGrave(d, c) && !!d.liveWith("necrovalley") && !up(d, c.owner).some((z) => (DM.effectOf(z.card.no) || {}).necroImmune && !z.negated);
  const kaiserBlocks = (d, p, add) => d.allZones(1 - p).some((s) => { const e = d.live(s); return e && e.kaiser && d.monsters(1 - p).length >= 1 && d.monsters(p).length + add > d.monsters(1 - p).length; });
  const jam = (d, p) => !!d.liveWith("jamBreeding", p);
  const coldWave = (d) => X(d).coldUntil > d.turn;
  const prohibited = (d, c, z) => !!c && !c.token && !(z && z.data.preProhib) && [0, 1].some((q) => d.allZones(q).some((s) => d.live(s) && s.data.prohibit === c.no));
  const positionsFrozen = (d, p) => (X(d).mesmeric && X(d).mesmeric.p === p && X(d).mesmeric.turn === d.turn) || d.allZones(1 - p).some((s) => { const e = d.live(s); return e && e.freezesOpp && s.equippedTo && d.locate(s.equippedTo); });
  const levelAfterCostDown = (c, e) => { const lv = C.level(c.no) - 2; return e && e.tributes != null ? e.tributes : lv >= 7 ? 2 : lv >= 5 ? 1 : 0; };

  // What the duel notices for these cards (before the field's cards hear of it).
  function track(d, ev) {
    const c = cur(d);
    if (ev.type === "monster-to-grave" && ev.card && !ev.card.token) { if (ev.card.owner === ev.p) c.monGone[ev.p] = true; if (C.level(ev.card.no) >= 8) c.bigGone[ev.p] = true; }
    if (ev.type === "discarded" && ev.card && C.isMonster(ev.card.no) && isT(ev.card.no, "Dragon")) c.dragons[ev.p]++;
    if (ev.type === "sent-to-grave" && ev.why === "tribute" && ev.card && C.isMonster(ev.card.no) && isT(ev.card.no, "Dragon") && ev.from) c.dragons[ev.from.p]++;
    if (ev.type === "flip-summoned" && ev.zone) ev.zone.data.flipTurn = d.turn;
    if (/^(summoned|flip-summoned|special-summoned)$/.test(ev.type) && ev.zone && ev.card && ev.card.costDown === d.turn && !ev.zone.data.costDown) { ev.zone.data.costDown = true; d.addTemp(ev.zone, { level: -2 }); }
    const w = X(d).wave;
    if (ev.type === "attack" && w && w.turn === d.turn && ev.attacker === w.z && ev.target) { w.hit.push(ev.target); if (!ev.target.negated) { ev.target.negated = true; w.neg.push(ev.target); } }
  }
  // ...and what it does about it, after.
  async function react(d, ev) {
    if (ev.type === "battle-damage" && ev.dealer && ev.dealer.data.banditTurn === d.turn && d.controllerOf(ev.dealer) !== ev.p) await H.discardRandom(d, ev.p);
    if (ev.type === "standby") {
      await runTasks(d, "standby", ev.p);
      for (const z of d.monsters(ev.p).filter((z) => z.data.metalFiend)) {
        if (d.players[ev.p].lp > 1000 && (await d.yesNo(ev.p, "Pay 1000 LP to keep the Metal Fiend Token?"))) await d.payLp(ev.p, 1000); else await d.destroy(z, "cost");
      }
    }
    // (the states that destroy a card: Heart of Clear Water on a strong monster, Falling Down without an Archfiend)
    const x = X(d);
    if (x.checking || d.over) return;
    x.checking = true;
    try {
      for (const q of [0, 1]) for (const s of H.st(d, q)) {
        if (!d.live(s) || !d.locate(s)) continue;
        const m = s.equippedTo && d.locate(s.equippedTo) ? s.equippedTo : null;
        if (isName(s.card, "Heart of Clear Water") && m && d.atkOf(m) >= 1300) await d.destroy(s, "effect");
        else if (isName(s.card, "Falling Down") && m && !d.allZones(q).some((o) => o.faceUp && (has(o.card, "Archfiend") || isName(o.card, "A Deal with Dark Ruler")))) await d.destroy(s, "effect");
      }
    } finally { x.checking = false; }
  }
  // (Pandemonium: the Archfiends' Standby Phase costs, free while it's face up)
  let upkeep = false;
  function wrapUpkeep() {
    if (upkeep) return; upkeep = true;
    for (const [no, e] of Object.entries(DM.EFFECTS)) {
      if (!e.standby || !C.isMonster(+no) || !C.name(+no).includes("Archfiend")) continue;
      const s0 = e.standby;
      e.standby = async (d, z, p) => { const x = X(d), was = x.freeUpkeep; if (d.liveWith("noArchfiendUpkeep")) x.freeUpkeep = true; try { await s0(d, z, p); } finally { x.freeUpkeep = was; } };
    }
  }
  // The duel's functions, with these cards' rules (each calls the one it wraps).
  const create0 = DM.create;
  DM.create = function (opts) {
    const d = create0.apply(this, arguments);
    wrapUpkeep();
    const f = {};
    for (const k of ["notify", "emit", "runEffect", "damage", "battleDamage", "destroy", "banish", "toHand", "toDeck", "specialSummon", "placeMonster", "summonToken", "takeControl",
      "canActivate", "mainActions", "liveWith", "closed", "canAttack", "canBeAttacked", "responses", "payLp"]) f[k] = d[k];
    Object.assign(d, {
      async notify(ev) { if (this.over) return; track(this, ev); await f.notify.call(this, ev); if (!this.over) await react(this, ev); },
      async emit(ev) {
        await f.emit.call(this, ev);
        if (ev.type === "damage-calc") { ev.attacker.data.dcTurn = this.turn; if (ev.target) ev.target.data.dcTurn = this.turn; }
        else if (ev.type === "phase" && ev.phase === "battle") {
          // (Shooting Star Bow - Ceal, Twin Swords of Flashing Light - Tryce: what the equipped monster may do this Battle Phase)
          for (const m of this.monsters(this.turnPlayer)) for (const l of m.links) {
            const e = l.kind === "equip" && l.from && this.locate(l.from) ? this.live(l.from) : null;
            if (e && e.givesDirect) m.data.directTurn = this.turn;
            if (e && e.givesTwice) m.data.twiceTurn = this.turn;
          }
        } else if (ev.type === "phase" && ev.phase === "end") await runTasks(this, "end");
      },
      async runEffect(link) {
        // (Rod of Silence - Kay'est: another Spell that targets its monster, negated and destroyed)
        if (!link.negated && spellLink(link) && link.targets.some((z) => z && this.locate(z) && z.links.some((l) => l.kind === "equip" && l.from && l.from !== link.zone && this.locate(l.from) && (this.live(l.from) || {}).rodOfSilence))) {
          link.negated = true; if (link.zone && this.locate(link.zone)) await this.destroy(link.zone, "effect"); return;
        }
        const prev = this.curLink; this.curLink = link;
        try { return await f.runEffect.call(this, link); } finally { this.curLink = prev; }
      },
      async damage(p, n, why) {
        const pain = X(this).pain;
        if (why !== "battle" && pain && this.curLink === pain.link && p === pain.victim) p = pain.to;
        return f.damage.call(this, p, n, why);
      },
      async battleDamage(r, n, dealer, other, A) {
        // (Fiend's Sanctuary: the battle damage its Token's controller would take, to the other player)
        const tk = [dealer, other].find((z) => z && z.data.metalFiend && this.locate(z));
        if (tk && this.controllerOf(tk) === r) r = 1 - r;
        return f.battleDamage.call(this, r, n, dealer, other, A);
      },
      async destroy(z, why, by) {
        const l = this.locate(z);
        if (!l) return false;
        if (z.counters.reflector > 0) { z.counters.reflector--; await this.emit({ type: "counter", zone: z, n: z.counters.reflector }); return false; }
        if (l.i >= 5 && !z.faceUp && X(this).timidUntil >= this.turn) return false;
        if (why !== "battle" && l.i < 5 && z.data.shield && this.locate(z.data.shield) && this.live(z.data.shield) && this.curLink && this.curLink.targets.includes(z)) return false;
        if (why !== "battle" && nsaImmune(this, z, this.curLink)) return false;
        if (why === "battle" && z.data.baouNeg === this.turn && !z.negated) {
          const e = DM.effectOf(z.card.no);
          if (!(e && e.cannotBeDestroyed && z.faceUp && e.cannotBeDestroyed(this, z, l.p, why))) { z.negated = true; const r = await f.destroy.call(this, z, why, by); if (!r) z.negated = false; return r; }
        }
        return f.destroy.call(this, z, why, by);
      },
      async banish(c, why) {
        if (necro(this, c) || nsaCard(this, c)) return;
        // (Spirit Elimination: a monster of yours on the field removed from play in its place)
        const se = X(this).spiritElim;
        if (se && se.turn === this.turn && C.isMonster(c.no) && this.players[se.p].grave.includes(c) && this.monsters(se.p).length) {
          const z = await this.pickZone(se.p, "Remove which of your monsters from play instead (Spirit Elimination)?", (x, q) => q === se.p, { sides: [se.p], area: "monster" });
          if (z) return f.banish.call(this, z.card, why);
        }
        return f.banish.call(this, c, why);
      },
      async toHand(c, why) { if (necro(this, c) || nsaCard(this, c)) return; return f.toHand.call(this, c, why); },
      async toDeck(c, top, why) { if (necro(this, c) || nsaCard(this, c)) return; return f.toDeck.call(this, c, top, why); },
      async specialSummon(p, c, opts) { if (necro(this, c) || jam(this, p)) return null; return f.specialSummon.call(this, p, c, opts); },
      async placeMonster(p, c, opts) { if (kaiserBlocks(this, p, 1)) return null; return f.placeMonster.call(this, p, c, opts); },
      async summonToken(p, stats, opts) { if (kaiserBlocks(this, p, 1) || (jam(this, p) && stats.name !== "Slime Token")) return null; return f.summonToken.call(this, p, stats, opts); },
      async takeControl(z, p) { if (kaiserBlocks(this, p, 1) || nsaImmune(this, z, this.curLink)) return false; return f.takeControl.call(this, z, p); },
      canActivate(p, c, a, ctx) {
        if (c.noActivateTurn === this.turn) return false;
        if ((C.isSpell(c.no) || C.isTrap(c.no)) && coldWave(this)) return false;
        if (prohibited(this, c, ctx && ctx.zone)) return false;
        return f.canActivate.call(this, p, c, a, ctx);
      },
      mainActions(p) {
        const acts = f.mainActions.call(this, p), pl = this.players[p];
        // (Cost Down: the monsters in the hand two Levels lower, their Tributes too)
        const noSummon = pl.flags.noSummonTurn === this.turn || this.players[1 - p].flags.noSummonFor === this.turn;
        if (!pl.normalSummoned && !pl.flags.noNormalSummon && !noSummon) for (const c of pl.hand.filter((c) => c.costDown === this.turn && summonable(c))) {
          const e = DM.effectOf(c.no), t = levelAfterCostDown(c, e);
          if ((e && e.needsField && !this.countOnField(N(e.needsField))) || (e && e.normalIf && !e.normalIf(this, p))) continue;
          const known = acts.filter((a) => a.card === c && (a.act === "summon" || a.act === "set-monster"));
          for (const a of known) a.tributes = Math.min(a.tributes, t);
          if (!known.length && this.tributable(p).length >= t && (t > 0 || this.freeMonsterZone(p) >= 0)) {
            const at = acts.findIndex((a) => a.act === "battle" || a.act === "end");
            acts.splice(at, 0, { act: "summon", card: c, tributes: t, label: "Summon " + C.name(c.no) }, { act: "set-monster", card: c, tributes: t, label: "Set " + C.name(c.no) });
          }
        }
        return acts.filter((a) => {
          const c = a.card || (a.zone && a.zone.card);
          switch (a.act) {
            case "set-spell": return !coldWave(this) && !prohibited(this, c);
            case "summon": case "set-monster": return !prohibited(this, c) && !(a.act === "summon" && jam(this, p)) && !kaiserBlocks(this, p, 1 - (a.tributes || 0));
            case "special-hand": return !prohibited(this, c) && !jam(this, p) && !kaiserBlocks(this, p, 1);
            case "flip-summon": return !jam(this, p) && !prohibited(this, c, a.zone);
            case "position": return !positionsFrozen(this, p);
            default: return true;
          }
        });
      },
      // (Hieroglyph Lithograph: a hand of seven kept at the End Phase)
      liveWith(prop, q) {
        const r = f.liveWith.call(this, prop, q);
        if (r || prop !== "noHandLimit" || this.phase !== "end") return r;
        const pl = this.players[this.turnPlayer];
        return pl.flags.handLimit7 && pl.hand.length <= 7 ? {} : null;
      },
      closed(p, i) { return f.closed.call(this, p, i) || X(this).closed.some((c) => c.p === p && c.i === i); },
      // (Diffusion Wave-Motion: its monster attacks each of theirs once, and no other attacks)
      canAttack(z, p) {
        const w = X(this).wave;
        if (!w || w.turn !== this.turn || w.p !== p) return f.canAttack.call(this, z, p);
        if (z !== w.z) return false;
        const n = z.attacks; z.attacks = 0;
        try { return f.canAttack.call(this, z, p) && this.monsters(1 - p).some((t) => !w.hit.includes(t)); } finally { z.attacks = n; }
      },
      canBeAttacked(z, q, att) { const w = X(this).wave; if (w && w.turn === this.turn && att === w.z && w.hit.includes(z)) return false; return f.canBeAttacked.call(this, z, q, att); },
      // (a Normal Spell activated in your Standby Phase: Curse of Fiend)
      responses(p, ev, chain) {
        const out = f.responses.call(this, p, ev, chain);
        if (!ev || ev.type !== "standby" || ev.p !== p || p !== this.turnPlayer || (chain && chain.length)) return out;
        const room = this.freeSpellZone(p) >= 0;
        for (const c of this.players[p].hand) { const e = DM.effectOf(c.no); if (room && e && e.standbySpell && this.canActivate(p, c, e.activate, { event: ev, chain, fromHand: true })) out.push({ label: this.name(c), card: c, from: "hand" }); }
        for (let i = 5; i < 10; i++) { const z = this.players[p].zones[i], e = z && DM.effectOf(z.card.no); if (e && e.standbySpell && !z.faceUp && this.canActivate(p, z.card, e.activate, { zone: z, event: ev, chain })) out.push({ label: this.name(z.card), card: z.card, zone: z, from: "field" }); }
        return out;
      },
      async payLp(p, n) { if (X(this).freeUpkeep) return; return f.payLp.call(this, p, n); }
    });
    return d;
  };
  // (Metalsilver Armor, Non-Spellcasting Area: monsters the other side's effects can't target)
  const target0 = H.target;
  H.target = (d, link, prompt, filter, opts) => target0(d, link, prompt, (z, q, i) => filter(z, q, i) && !(i < 5 && (nsaImmune(d, z, link) || (link.p !== q && d.allZones(q).some((s) => {
    const e = d.live(s), m = s.equippedTo; return e && e.metalsilver && m && m !== z && d.locate(m) && d.controllerOf(m) === q; })))), opts);
  // (Second Coin Toss: a lost call tossed again, once a turn)
  const coinCall0 = H.coinCall;
  H.coinCall = async (d, p) => {
    const r = await coinCall0(d, p), s = !r && d.liveWith("secondCoinToss", p);
    if (!s || s.data.usedTurn === d.turn || !(await d.yesNo(p, "Toss the coin again with Second Coin Toss?"))) return r;
    s.data.usedTurn = d.turn;
    return coinCall0(d, p);
  };

  // ---------- Equip Spells ----------
  // (an equip whose boost reads the Equip Card itself: its counters, its choice)
  async function attach(d, link, t, stats) {
    const eq = link.zone;
    if (!t || !t.faceUp || !eq || !d.locate(eq)) { if (eq) eq.data.discard = true; return false; }
    d.equip(eq, t, typeof stats === "function" ? (d2, z) => stats(d2, eq, z) : stats);
    await d.emit({ type: "equip", card: link.card, to: t });
    await d.event({ type: "equipped", p: link.p, card: link.card, zone: t });
    return true;
  }
  const equipX = (filter, stats, extra) => Object.assign({ equip: true, equipOk: filter, activate: {
    can: (d, ctx) => H.any(d, (z) => z.faceUp && filter(d, z, ctx.p), { area: "monster" }),
    target: (d, link) => H.target(d, link, "Equip " + d.name(link.card) + " to which monster?", (z) => z.faceUp && filter(d, z, link.p), { area: "monster" }),
    resolve: async (d, link) => { await attach(d, link, t0(d, link), stats); } } }, extra);
  const anyMon = () => true, nonMachine = (d, z) => !H.isType(d, z, "Machine"), warrior = (d, z) => H.isType(d, z, "Warrior");
  const equipped = (s, z) => s.equippedTo === z;
  const yourStandby = (fn) => async (d, z, p) => { const m = z.equippedTo; if (m && d.locate(m)) await fn(d, z, p, m); };
  define("Germ Infection", equipX(nonMachine, (d, eq) => ({ atk: -300 * (eq.data.n || 0) }),
    { standby: yourStandby(async (d, z, p, m) => { if (d.turnPlayer === d.controllerOf(m)) z.data.n = (z.data.n || 0) + 1; }) }));
  define("Paralyzing Potion", equipX(nonMachine, null, { noAttack: (d, s, q, p, z) => equipped(s, z) }));
  define("Ring of Magnetism", equipX((d, z, p) => d.controllerOf(z) === p, { atk: -500, def: -500 },
    { protectsFromAttack: (d, s, q, z) => { const m = s.equippedTo; return !!m && !!d.locate(m) && d.controllerOf(m) === q && z !== m; } }));
  define("Raregold Armor", equipX(anyMon, null, { protectsFromAttack: DM.EFFECTS[N("Ring of Magnetism")].protectsFromAttack }));
  define("Stim-Pack", equipX(anyMon, (d, eq) => ({ atk: 700 - 200 * (eq.data.n || 0) }), { standby: yourStandby(async (d, z, p) => { if (d.turnPlayer === p) z.data.n = (z.data.n || 0) + 1; }) }));
  define("Magical Labyrinth", equipX((d, z) => isName(z.card, "Labyrinth Wall"), null, { ignition: {
    can: (d, ctx) => mine(d, ctx) && ctx.zone.equippedTo && d.locate(ctx.zone.equippedTo) && d.controllerOf(ctx.zone.equippedTo) === ctx.p && d.players[ctx.p].deck.some((c) => isName(c, "Wall Shadow")),
    cost: async (d, link) => { const m = link.zone.equippedTo; if (!m || !d.locate(m)) return false; await d.sendToGrave(m.card, "tribute"); return true; },
    resolve: async (d, link) => { const c = d.players[link.p].deck.find((c) => isName(c, "Wall Shadow")); if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } } }));
  define("7 Completed", equipX((d, z) => H.isType(d, z, "Machine"), (d, eq) => ({ [eq.data.stat || "atk"]: 700 })));
  Object.assign(DM.EFFECTS[N("7 Completed")].activate, { cost: async (d, link) => {
    const o = await d.choose(link.p, "7 Completed: which does it raise?", [{ label: "ATK +700", v: "atk" }, { label: "DEF +700", v: "def" }]);
    if (link.zone) link.zone.data.stat = o ? o.v : "atk"; return true; } });
  define("Sword of Dragon's Soul", equipX(warrior, { atk: 700 }, { equipBattleStats: (d, z, r, o) => { if (o && H.isType(d, o, "Dragon")) o.data.destroyAfterBattle = true; return null; } }));
  define("Dragonic Attack", equipX(warrior, { type: typeNo("Dragon"), atk: 500, def: 500 }));
  define("Ekibyo Drakmord", equipX(anyMon, null, { noAttack: (d, s, q, p, z) => equipped(s, z),
    endPhase: async (d, z) => {
      const m = z.equippedTo;
      if (!m || !d.locate(m) || d.turnPlayer !== d.controllerOf(m) || d.turn <= z.placedTurn) return;
      z.data.n = (z.data.n || 0) + 1;
      if (z.data.n < 2) return;
      const c = z.card;
      await d.destroy(m, "effect");
      if (d.locate(z)) await d.toHand(c, "effect"); else if (inGrave(d, c)) await d.toHand(c, "effect");
    } }));
  define("Fusion Sword Murasame Blade", equipX(warrior, { atk: 800 }, { cannotBeDestroyed: (d, z, p, why) => why !== "battle" && !!z.equippedTo && !!d.locate(z.equippedTo) }));
  define("Heart of Clear Water", equipX((d, z) => d.atkOf(z) < 1300, null));
  DM.EFFECTS[N("Heart of Clear Water")].activate.resolve = async (d, link) => { const t = t0(d, link); if (await attach(d, link, t, null)) t.data.shield = link.zone; };
  const smokeLike = (fn) => async (d, c, p, from, why) => { if (why === "destroyed" && from && from.zone >= 5 && from.z && from.z.equippedTo) await fn(d, c, p); };
  define("Smoke Grenade of the Thief", equipX(anyMon, null, { onToGrave: smokeLike(async (d, c, p) => {
    const h = d.players[1 - p].hand; if (!h.length) return; await show(d, p, "Your opponent's hand:", h.slice());
    const x = await d.pickCard(p, "Discard which card from their hand?", h); if (x) await d.discard(1 - p, x, "effect"); }) }));
  define("Butterfly Dagger - Elma", equipX(anyMon, { atk: 300 }, { onToGrave: smokeLike(async (d, c, p) => { if (inGrave(d, c) && (await d.yesNo(p, "Return Butterfly Dagger - Elma to your hand?"))) await d.toHand(c, "effect"); }) }));
  define("Buster Rancher", equipX((d, z) => d.atkOf(z) <= 1000, null, { equipBattleStats: (d, z, r, o) => (o && (o.defense ? d.defOf(o) : d.atkOf(o)) >= 2500 ? { atk: 2500 } : null) }));
  define("Metalsilver Armor", equipX(anyMon, null, { metalsilver: true }));
  define("Gravity Axe - Grarl", equipX(anyMon, { atk: 500 }, { freezesOpp: true }));
  define("Rod of Silence - Kay'est", equipX(anyMon, { def: 500 }, { rodOfSilence: true }));
  define("Shooting Star Bow - Ceal", equipX(anyMon, { atk: -1000 }, { givesDirect: true }));
  define("Twin Swords of Flashing Light - Tryce", equipX(anyMon, { atk: -500 }, { givesTwice: true }));
  Object.assign(DM.EFFECTS[N("Twin Swords of Flashing Light - Tryce")].activate, { cost: discardCost(null, "Send which card from your hand to the Graveyard?") });
  define("Wicked-Breaking Flamberge - Baou", equipX(anyMon, { atk: 500 }, { equipBattleStats: (d, z, r, o) => { if (o && d.controllerOf(o) !== r) o.data.baouNeg = d.turn; return null; } }));
  Object.assign(DM.EFFECTS[N("Wicked-Breaking Flamberge - Baou")].activate, { cost: discardCost(null, "Send which card from your hand to the Graveyard?") });
  for (const n of ["Twin Swords of Flashing Light - Tryce", "Wicked-Breaking Flamberge - Baou"]) { const a = DM.EFFECTS[N(n)].activate, can0 = a.can; a.can = (d, ctx) => handCount(d, ctx) > 0 && can0(d, ctx); }
  // (control of the equipped monster, while it's equipped: Falling Down; The Mask of Remnants, by Masked Beast Des Gardius)
  const steal = { standby: async (d, z, p) => { if (d.turnPlayer !== p && isName(z.card, "Falling Down")) await d.damage(p, 800, "effect"); },
    onLeave: async (d, z) => { const m = z.equippedTo; if (m && d.locate(m) && m.data.returnTo != null) { const to = m.data.returnTo; m.data.returnTo = null; await d.takeControl(m, to); } } };
  define("Falling Down", Object.assign(equipX((d, z, p) => d.controllerOf(z) !== p, null), steal));
  Object.assign(DM.EFFECTS[N("Falling Down")].activate, { can: (d, ctx) => up(d, 1 - ctx.p).length > 0 && d.freeMonsterZone(ctx.p) >= 0,
    resolve: async (d, link) => { const z = t0(d, link); if (!z || !link.zone || !d.locate(link.zone) || !(await d.takeControl(z, link.p))) { if (link.zone) link.zone.data.discard = true; return; }
      z.data.returnTo = 1 - link.p; await attach(d, link, z, null); } });
  define("The Mask of Remnants", Object.assign({ activate: { resolve: async (d, link) => { if (link.zone && d.locate(link.zone) && !link.zone.equippedTo) await d.toDeck(link.card, "shuffle", "effect"); } } }, { onLeave: steal.onLeave }));
  // (an Equip Card to another monster: Tailor of the Fickle)
  const movable = (d, s) => { const e = DM.effectOf(s.card.no) || {}; return s.faceUp && C.isSpell(s.card.no) && C.icon(s.card.no) === ICON.EQUIP && s.equippedTo && d.locate(s.equippedTo) && !s.data.union && !s.data.revived && !s.data.bound && !e.onLeave; };
  const newHome = (d, s, z, p) => z.faceUp && z !== s.equippedTo && (!(DM.effectOf(s.card.no) || {}).equipOk || DM.effectOf(s.card.no).equipOk(d, z, p));
  define("Tailor of the Fickle", { activate: { can: (d, ctx) => H.st(d).some((s) => movable(d, s) && up(d).some((z) => newHome(d, s, z, ctx.p))),
    target: (d, link) => H.target(d, link, "Move which Equip Card?", (s, q, i) => i >= 5 && movable(d, s) && up(d).some((z) => newHome(d, s, z, link.p)), { area: "spell" }),
    resolve: async (d, link) => {
      const s = t0(d, link); if (!s || !movable(d, s)) return;
      const to = await d.pickZone(link.p, "Equip it to which monster?", (z) => newHome(d, s, z, link.p), { area: "monster" }); if (!to) return;
      const from = s.equippedTo, l = from.links.find((k) => k.from === s);
      from.links = from.links.filter((k) => k !== l); s.equippedTo = to; if (l) to.links.push(l);
      if (from.data.shield === s) { from.data.shield = null; to.data.shield = s; }
      await d.emit({ type: "equip", card: s.card, to }); await d.event({ type: "equipped", p: link.p, card: s.card, zone: to }); } } });

  // ----- Stats for the turn -----
  define("Shield & Sword", { activate: { can: (d) => up(d).length > 0, resolve: async (d, link) => {
    for (const z of up(d)) { const o = orig(z); d.addTemp(z, { atk: o.def - o.atk, def: o.atk - o.def }, link.card); } } } });
  define("Riryoku", { activate: { can: (d) => up(d).length >= 2, target: async (d, link) => {
    const a = await d.pickZone(link.p, "Halve the ATK of which monster?", (z) => z.faceUp, { area: "monster" }); if (!a) return false;
    const b = await d.pickZone(link.p, "Give the lost ATK to which monster?", (z) => z.faceUp && z !== a, { area: "monster" }); if (!b) return false;
    link.targets = [a, b]; return true; },
    resolve: async (d, link) => { const a = t0(d, link, 0), b = t0(d, link, 1); if (!a || !b || !a.faceUp || !b.faceUp) return; const n = Math.floor(d.atkOf(a) / 2); d.addTemp(a, { atk: -n }, link.card); d.addTemp(b, { atk: n }, link.card); } } });
  define("Pyramid Energy", { activate: { can: (d, ctx) => up(d, ctx.p).length > 0, resolve: async (d, link) => {
    const o = await d.choose(link.p, "Pyramid Energy:", [{ label: "+200 ATK to your monsters", v: { atk: 200 } }, { label: "+500 DEF to your monsters", v: { def: 500 } }]);
    for (const z of up(d, link.p)) d.addTemp(z, o ? o.v : { atk: 200 }, link.card); } } });
  define("Unity", { activate: { can: (d, ctx) => up(d, ctx.p).length > 0, resolve: async (d, link) => {
    const z = await d.pickZone(link.p, "Which monster's DEF becomes their total?", (x, q) => q === link.p && x.faceUp, { sides: [link.p], area: "monster" }); if (!z) return;
    d.addTemp(z, { setDef: up(d, link.p).reduce((n, x) => n + orig(x).def, 0) }, link.card); } } });
  define("Amazoness Spellcaster", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => has(z.card, "Amazoness")) && up(d, 1 - ctx.p).length > 0, target: async (d, link) => {
    const a = await d.pickZone(link.p, "Which Amazoness monster?", (z, q) => q === link.p && z.faceUp && has(z.card, "Amazoness"), { sides: [link.p], area: "monster" });
    const b = a && (await d.pickZone(link.p, "Switch original ATK with which of their monsters?", (z, q) => q !== link.p && z.faceUp, { sides: [1 - link.p], area: "monster" }));
    if (!a || !b) return false; link.targets = [a, b]; return true; },
    resolve: async (d, link) => { const a = t0(d, link, 0), b = t0(d, link, 1); if (!a || !b || !a.faceUp || !b.faceUp) return; const x = orig(a).atk, y = orig(b).atk; d.addTemp(a, { atk: y - x }, link.card); d.addTemp(b, { atk: x - y }, link.card); } } });
  define("Wild Nature's Release", { activate: { can: (d) => up(d).some((z) => H.isType(d, z, "Beast") || H.isType(d, z, "Beast-Warrior")),
    target: (d, link) => pickMon(d, link, "Give which Beast or Beast-Warrior its DEF in ATK?", (z) => z.faceUp && (H.isType(d, z, "Beast") || H.isType(d, z, "Beast-Warrior"))),
    resolve: async (d, link) => { const z = t0(d, link); if (!z || !z.faceUp) return; d.addTemp(z, { atk: d.defOf(z) }, link.card); z.data.destroyAtEnd = d.turn; } } });
  define("Secret Pass to the Treasures", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => d.atkOf(z) <= 1000),
    target: (d, link) => pickMon(d, link, "Which monster attacks directly this turn?", (z) => z.faceUp && d.atkOf(z) <= 1000, [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z) z.data.directTurn = d.turn; } } });
  define("Checkmate", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Terrorking Archfiend")) && d.monsters(ctx.p).filter((z) => z.faceUp && archfiend(z.card)).length >= 2,
    cost: tributeCost((d, z) => z.faceUp && archfiend(z.card) && up(d, d.controllerOf(z)).some((x) => x !== z && isName(x.card, "Terrorking Archfiend")), "Tribute which Archfiend?"),
    resolve: async (d, link) => { const z = await d.pickZone(link.p, "Which Terrorking Archfiend attacks directly?", (x, q) => q === link.p && x.faceUp && isName(x.card, "Terrorking Archfiend"), { sides: [link.p], area: "monster" }); if (z) z.data.directTurn = d.turn; } } });

  // ----- Destruction -----
  define("Darkness Approaches", { activate: { can: (d, ctx) => handCount(d, ctx) >= 2 && up(d).length > 0,
    cost: async (d, link) => { for (let k = 0; k < 2; k++) if (!(await H.discardOne(d, link.p, "Discard 2 cards (Darkness Approaches)."))) return false; return true; },
    target: (d, link) => pickMon(d, link, "Turn which monster face-down?", (z) => z.faceUp),
    resolve: async (d, link) => { const z = t0(d, link); if (z && z.faceUp) { d.temp = d.temp.filter((t) => t.zone !== z); await d.flipDown(z); } } } });
  define("Mystic Box", { activate: { can: (d, ctx) => d.monsters(0).length && d.monsters(1).length, target: async (d, link) => {
    const a = await d.pickZone(link.p, "Destroy which of their monsters?", (z, q) => q !== link.p, { sides: [1 - link.p], area: "monster" });
    const b = a && (await d.pickZone(link.p, "Give which of your monsters to your opponent?", (z, q) => q === link.p, { sides: [link.p], area: "monster" }));
    if (!a || !b) return false; link.targets = [a, b]; return true; },
    resolve: async (d, link) => { const a = t0(d, link, 0), b = t0(d, link, 1); if (a) await d.destroy(a, "effect"); if (b && d.controllerOf(b) === link.p) await d.takeControl(b, 1 - link.p); } } });
  define("A Wingbeat of Giant Dragon", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => H.isType(d, z, "Dragon") && H.lvl(d, z) >= 5), resolve: async (d, link) => {
    const z = await d.pickZone(link.p, "Return which Dragon to your hand?", (x, q) => q === link.p && x.faceUp && H.isType(d, x, "Dragon") && H.lvl(d, x) >= 5, { sides: [link.p], area: "monster" });
    if (!z) return; await d.toHand(z.card, "effect"); if (!d.locate(z)) await H.destroyAll(d, H.st(d).filter((s) => s !== link.zone)); } } });
  const negatesTraps = (d, z) => { const e = DM.effectOf(z.card.no) || {}; return z.faceUp && !z.card.token && (e.negatesTraps || e.noBattleTraps || e.noTrapsOnSummon || /negate[^.]*Trap/i.test(DM.text(z.card.no))); };
  define("Double Snare", { activate: { can: (d, ctx) => [0, 1].some((q) => d.allZones(q).some((z) => z !== ctx.zone && negatesTraps(d, z))),
    target: (d, link) => H.target(d, link, "Destroy which card that negates Traps?", (z) => z !== link.zone && negatesTraps(d, z)),
    resolve: async (d, link) => { const z = t0(d, link); if (z) await d.destroy(z, "effect"); } } });
  const dragonHere = (d, p) => up(d, p).some((z) => H.isType(d, z, "Dragon"));
  define("Dragon's Gunfire", { activate: { can: (d, ctx) => dragonHere(d, ctx.p), target: async (d, link) => {
    const opts = [{ label: "Inflict 800 damage", v: 0 }];
    if (up(d).some((z) => d.defOf(z) <= 800)) opts.push({ label: "Destroy a monster with 800 or less DEF", v: 1 });
    const o = await d.choose(link.p, "Dragon's Gunfire:", opts);
    link.data.v = o ? o.v : 0;
    return link.data.v === 0 || H.target(d, link, "Destroy which monster?", (z) => z.faceUp && d.defOf(z) <= 800, { area: "monster" }); },
    resolve: async (d, link) => { if (!link.data.v) return d.damage(1 - link.p, 800, "effect"); const z = t0(d, link); if (z && d.defOf(z) <= 800) await d.destroy(z, "effect"); } } });
  define("Stamping Destruction", { activate: { can: (d, ctx) => dragonHere(d, ctx.p) && H.st(d).some((z) => z !== ctx.zone),
    target: (d, link) => H.target(d, link, "Destroy which Spell or Trap Card?", (z, q, i) => i >= 5 && z !== link.zone, { area: "spell" }),
    resolve: async (d, link) => { const z = t0(d, link); if (!z) return; const q = d.controllerOf(z); if (await d.destroy(z, "effect")) await d.damage(q, 500, "effect"); } } });
  define("Soul Taker", { activate: { can: (d, ctx) => up(d, 1 - ctx.p).length > 0, target: (d, link) => pickMon(d, link, "Destroy which of their monsters?", (z) => z.faceUp, [1 - link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z) await d.destroy(z, "effect"); await d.heal(1 - link.p, 1000); } } });
  define("Spell Shattering Arrow", DM.EFFECTS[N("Enchanted Arrow")]);
  define("Dark Core", { activate: { can: (d, ctx) => handCount(d, ctx) > 0 && up(d).length > 0, cost: discardCost(),
    target: (d, link) => pickMon(d, link, "Remove which face-up monster from play?", (z) => z.faceUp), resolve: async (d, link) => { const z = t0(d, link); if (z) await d.banish(z.card, "effect"); } } });
  define("Share the Pain", { activate: { can: (d, ctx) => d.monsters(ctx.p).length > 0 && d.monsters(1 - ctx.p).length > 0, cost: tributeCost(),
    resolve: async (d, link) => { const q = 1 - link.p, z = await d.pickZone(q, "Tribute which of your monsters?", (x, r) => r === q, { sides: [q], area: "monster" }); if (z) await d.sendToGrave(z.card, "tribute"); } } });
  define("After the Struggle", { activate: { can: (d) => d.phase === "main1", resolve: async (d) => { atEnd(d, (d2) => H.destroyAll(d2, mons(d2).filter((z) => z.data.dcTurn === d2.turn))); } } });

  // ----- Positions -----
  const lockPositions = (d, zs) => { for (const z of zs) z.data.positionLocked = true; atEnd(d, () => { for (const z of zs) z.data.positionLocked = false; }); };
  define("Curse of Fiend", { standbySpell: true, activate: { when: "standby", can: (d, ctx) => ctx.event.p === ctx.p && mons(d).some((z) => z.faceUp || z.defense), resolve: async (d) => {
    const zs = mons(d).filter((z) => z.faceUp || z.defense);
    for (const z of zs) if (d.locate(z)) await d.changePosition(z, z.faceUp ? !z.defense : false);
    lockPositions(d, zs); } } });
  define("Mesmeric Control", { activate: { resolve: async (d, link) => { X(d).mesmeric = { p: 1 - link.p, turn: d.turn + 1 }; } } });
  define("Creature Swap", { activate: { can: (d) => d.monsters(0).length > 0 && d.monsters(1).length > 0, resolve: async (d, link) => {
    const za = await d.pickZone(link.p, "Give which of your monsters?", (x, q) => q === link.p, { sides: [link.p], area: "monster" });
    const zb = await d.pickZone(1 - link.p, "Give which of your monsters?", (x, q) => q !== link.p, { sides: [1 - link.p], area: "monster" });
    if (!za || !zb || [za, zb].some((z) => (DM.effectOf(z.card.no) || {}).noControlChange && z.faceUp && !z.negated)) return;
    const la = d.locate(za), lb = d.locate(zb);
    d.players[la.p].zones[la.i] = zb; d.players[lb.p].zones[lb.i] = za;
    await d.emit({ type: "control", zone: za, from: la.p, to: lb.p }); await d.emit({ type: "control", zone: zb, from: lb.p, to: la.p });
    lockPositions(d, [za, zb]); } } });
  define("Stumbling", stays({ onEvent: async (d, z, p, ev) => { if (/^(summoned|flip-summoned|special-summoned)$/.test(ev.type) && ev.zone && d.locate(ev.zone) && ev.zone.faceUp && !ev.zone.defense) await d.changePosition(ev.zone, true); } }));

  // ----- Attacks -----
  define("Vengeful Bog Spirit", stays({ noAttack: (d, s, q, p, z) => summonedNow(d, z) }));
  define("Array of Revealing Light", { activate: { resolve: async (d, link) => { const o = await d.choose(link.p, "Declare a Type.", DM.TYPESLIST()); if (link.zone) link.zone.data.type = o ? o.value : 0; } },
    noAttack: (d, s, q, p, z) => !!s.data.type && H.typeOf(d, z) === s.data.type && summonedNow(d, z) });
  define("Diffusion Wave-Motion", { activate: { can: (d, ctx) => d.monsters(1 - ctx.p).length > 0 && d.players[ctx.p].lp > 1000 && up(d, ctx.p).some((z) => H.isType(d, z, "Spellcaster") && H.lvl(d, z) >= 7),
    cost: async (d, link) => { await d.payLp(link.p, 1000); return true; },
    target: (d, link) => pickMon(d, link, "Which Spellcaster attacks each of their monsters?", (z) => z.faceUp && H.isType(d, z, "Spellcaster") && H.lvl(d, z) >= 7, [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (!z) return; const w = X(d).wave = { p: link.p, z, turn: d.turn, hit: [], neg: [] };
      atEnd(d, () => { for (const m of w.neg) m.negated = false; }); } } });
  define("Combination Attack", { activate: { can: (d, ctx) => d.phase === "battle" && ctx.p === d.turnPlayer && d.monsters(ctx.p).some((z) => z.attackedThisTurn && unionOf(z)),
    target: (d, link) => pickMon(d, link, "Which monster attacks again?", (z) => z.attackedThisTurn && !!unionOf(z), [link.p]),
    resolve: async (d, link) => { const z = t0(d, link), u = z && unionOf(z); if (!u || !d.locate(u.from)) return; await ss(d, link.p, u.from.card); z.attacks = Math.max(0, z.attacks - 1); } } });

  // ----- Hands and Decks -----
  define("The Inexperienced Spy", { activate: { can: (d, ctx) => d.players[1 - ctx.p].hand.length > 0, resolve: async (d, link) => {
    const c = await d.pickCard(link.p, "See which card in their hand?", d.players[1 - link.p].hand, null, { hidden: true }); if (c) await show(d, link.p, "A card in your opponent's hand:", [c]); } } });
  define("Seal of the Ancients", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 1000 && d.allZones(1 - ctx.p).some((z) => !z.faceUp), cost: async (d, link) => { await d.payLp(link.p, 1000); return true; },
    resolve: async (d, link) => show(d, link.p, "Their face-down cards:", d.allZones(1 - link.p).filter((z) => !z.faceUp).map((z) => z.card)) } });
  define("Fengsheng Mirror", { activate: { can: (d, ctx) => d.players[1 - ctx.p].hand.length > 0, resolve: async (d, link) => {
    const h = d.players[1 - link.p].hand; await show(d, link.p, "Your opponent's hand:", h.slice());
    const c = await d.pickCard(link.p, "Discard which Spirit monster?", h, isSpirit); if (c) await d.discard(1 - link.p, c, "effect"); } } });
  define("Exchange", { activate: { can: (d, ctx) => handCount(d, ctx) > 0 && d.players[1 - ctx.p].hand.length > 0, resolve: async (d, link) => {
    const p = link.p, q = 1 - p, ha = d.players[p].hand.slice(), hb = d.players[q].hand.slice();
    if (!ha.length || !hb.length) return;
    const a = await d.pickCard(p, "Add which card from their hand to yours?", hb), b = await d.pickCard(q, "Add which card from their hand to yours?", ha);
    if (a) await giveTo(d, a, p); if (b) await giveTo(d, b, q); } } });
  define("Dragged Down into the Grave", { activate: { can: (d, ctx) => handCount(d, ctx) > 0 && d.players[1 - ctx.p].hand.length > 0, resolve: async (d, link) => {
    const p = link.p, q = 1 - p, ha = d.players[p].hand.slice(), hb = d.players[q].hand.slice();
    const a = await d.pickCard(p, "Discard which card from their hand?", hb), b = await d.pickCard(q, "Discard which card from their hand?", ha);
    if (a) await d.discard(q, a, "effect"); if (b) await d.discard(p, b, "effect");
    await d.drawCards(p, 1); await d.drawCards(q, 1); } } });
  define("Ante", { activate: { can: (d, ctx) => handCount(d, ctx) > 0 && d.players[1 - ctx.p].hand.length > 0, resolve: async (d, link) => {
    const p = link.p, q = 1 - p, a = await d.pickCard(p, "Reveal which card from your hand?", d.players[p].hand), b = await d.pickCard(q, "Reveal which card from your hand?", d.players[q].hand);
    if (!a || !b) return; await d.emit({ type: "reveal", p, card: a }); await d.emit({ type: "reveal", p: q, card: b });
    const lv = (c) => (C.isMonster(c.no) ? C.level(c.no) : 0), la = lv(a), lb = lv(b);
    if (la === lb) return; const [loser, c] = la < lb ? [p, a] : [q, b];
    await d.sendToGrave(c, "effect"); await d.damage(loser, 1000, "effect"); } } });
  define("Chosen One", { activate: { can: (d, ctx) => H.canSummonHere(d, ctx.p) && d.players[ctx.p].hand.some((c) => isMonCard(c)) && d.players[ctx.p].hand.filter((c) => c !== ctx.card && !C.isMonster(c.no)).length >= 2, resolve: async (d, link) => {
    const h = d.players[link.p].hand, m = await d.pickCard(link.p, "Show which monster?", h, isMonCard), o = await d.pickCards(link.p, "Show which 2 non-monster cards?", h, (c) => !C.isMonster(c.no), { count: 2 });
    if (!m || !o || o.length < 2) return;
    const cs = [m].concat(o); DM.shuffle(d, cs);
    const pick = await d.pickCard(1 - link.p, "Pick one of their cards at random.", cs, null, { hidden: true });
    if (pick === m) await ss(d, link.p, m);
    for (const c of cs) if (c !== m || pick !== m) if (d.players[link.p].hand.includes(c)) await d.sendToGrave(c, "effect"); } } });
  define("Monster Recovery", { activate: { can: (d, ctx) => d.monsters(ctx.p).some((z) => z.card.owner === ctx.p && !z.card.token) && d.players[ctx.p].hand.every((c) => c.owner === ctx.p),
    target: (d, link) => pickMon(d, link, "Shuffle which monster into your Deck?", (z) => z.card.owner === link.p && !z.card.token, [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (!z) return; const pl = d.players[link.p], n = pl.hand.length;
      await d.toDeck(z.card, "shuffle", "effect"); for (const c of pl.hand.slice()) await d.toDeck(c, "shuffle", "effect"); DM.shuffle(d, pl.deck); await d.drawCards(link.p, n); } } });
  define("Spellbook Organization", { activate: { can: (d, ctx) => d.players[ctx.p].deck.length > 1, resolve: DM.EFFECTS[N("Fruits of Kozaky's Studies")].activate.resolve } });
  define("Card Shuffle", stays({ ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.players[ctx.p].lp > 300, cost: async (d, link) => { await d.payLp(link.p, 300); return true; },
    resolve: async (d, link) => { const o = await d.choose(link.p, "Shuffle whose Deck?", [{ label: "Your opponent's Deck", v: 1 - link.p }, { label: "Your Deck", v: link.p }]); const q = o ? o.v : 1 - link.p;
      DM.shuffle(d, d.players[q].deck); await d.emit({ type: "shuffle", p: q }); } } }));
  define("Gather Your Mind", { activate: { can: (d, ctx) => d.players[ctx.p].flags.gatherTurn !== d.turn && d.players[ctx.p].deck.some((c) => isName(c, "Gather Your Mind")),
    cost: async (d, link) => { d.players[link.p].flags.gatherTurn = d.turn; return true; }, resolve: async (d, link) => H.searchDeck(d, link.p, (c) => isName(c, "Gather Your Mind")) } });
  define("Dark Designator", { activate: { resolve: async (d, link) => {
    const no = await declare(d, link.p, "Declare a Monster Card name.", true), c = d.players[1 - link.p].deck.find((x) => x.no === no);
    if (c) { await d.toHand(c, "search"); await d.emit({ type: "reveal", p: 1 - link.p, card: c }); } DM.shuffle(d, d.players[1 - link.p].deck); } } });
  define("D.D. Designator", { activate: { can: (d, ctx) => d.players[1 - ctx.p].hand.length > 0, resolve: async (d, link) => {
    const no = await declare(d, link.p, "Declare a card name."), h = d.players[1 - link.p].hand;
    await show(d, link.p, "Your opponent's hand:", h.slice());
    const c = h.find((x) => x.no === no), mine2 = d.players[link.p].hand;
    if (c) await d.banish(c, "effect"); else if (mine2.length) await d.banish(mine2[Math.floor(d.rng() * mine2.length)], "effect"); } } });
  define("Mirage of Nightmare", stays({ standby: async (d, z, p) => {
    if (d.turnPlayer !== p) { const n = 4 - d.players[p].hand.length; if (n > 0 && z.data.turn !== d.turn) { z.data.turn = d.turn; z.data.owe = await d.drawCards(p, n); } return; }
    for (let k = z.data.owe || 0; k > 0; k--) await H.discardRandom(d, p); z.data.owe = 0; } }));
  define("Different Dimension Capsule", { activate: { stays: true, can: (d, ctx) => d.players[ctx.p].deck.length > 0, resolve: async (d, link) => {
    const c = await d.pickCard(link.p, "Remove which card from play face-down?", d.players[link.p].deck);
    if (c) { await d.banish(c, "effect"); c.faceDown = true; if (link.zone) link.zone.data.capsule = c; } DM.shuffle(d, d.players[link.p].deck); } },
    standby: async (d, z, p) => { if (d.turnPlayer !== p || !z.data.capsule) return; z.data.n = (z.data.n || 0) + 1; if (z.data.n < 2) return;
      const c = z.data.capsule; z.data.capsule = null; await d.destroy(z, "effect"); if (d.players[p].banished.includes(c)) { c.faceDown = false; await d.toHand(c, "effect"); } } });
  define("Hieroglyph Lithograph", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 1000 && !d.players[ctx.p].flags.handLimit7, cost: async (d, link) => { await d.payLp(link.p, 1000); return true; },
    resolve: async (d, link) => { d.players[link.p].flags.handLimit7 = true; } } });
  define("Archfiend's Oath", stays({ ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.players[ctx.p].lp > 500 && d.players[ctx.p].deck.length > 0,
    cost: async (d, link) => { await d.payLp(link.p, 500); return true; }, resolve: async (d, link) => {
      const no = await declare(d, link.p, "Declare a card name."), c = d.players[link.p].deck[0]; if (!c) return;
      await d.emit({ type: "reveal", p: link.p, card: c }); if (c.no === no) await d.toHand(c, "effect"); else await d.sendToGrave(c, "effect"); } } }));
  define("Reversal Quiz", { activate: { can: (d, ctx) => d.players[ctx.p].deck.length > 0, resolve: async (d, link) => {
    const p = link.p; for (const c of d.players[p].hand.slice()) await d.sendToGrave(c, "effect"); for (const z of d.allZones(p).filter((z) => z !== link.zone)) if (d.locate(z)) await d.sendToGrave(z.card, "effect");
    const o = await d.choose(p, "What is the top card of your Deck?", [{ label: "A Monster Card", v: "m" }, { label: "A Spell Card", v: "s" }, { label: "A Trap Card", v: "t" }]);
    const c = d.players[p].deck[0]; if (!c || !o) return; await d.emit({ type: "reveal", p, card: c });
    if (o.v === (C.isMonster(c.no) ? "m" : C.isSpell(c.no) ? "s" : "t")) { const a = d.players[p].lp, b = d.players[1 - p].lp; await setLp(d, p, b); await setLp(d, 1 - p, a); } } } });
  define("Yu-Jo Friendship", { activate: { resolve: async (d, link) => {
    const p = link.p, q = 1 - p, u = d.players[p].hand.find((c) => isName(c, "Unity"));
    const shown = u && (await d.yesNo(p, "Show Unity so they must accept the handshake?"));
    if (shown) await d.emit({ type: "reveal", p, card: u });
    if (!shown && !(await d.yesNo(q, "Accept the handshake (both players' LP become half the total)?"))) return;
    const v = Math.floor((d.players[p].lp + d.players[q].lp) / 2); await setLp(d, p, v); await setLp(d, q, v); } } });
  define("Royal Tribute", { activate: { can: (d, ctx) => H.st(d, ctx.p).some((z) => z.faceUp && isName(z.card, "Necrovalley")), resolve: async (d) => {
    for (const q of [0, 1]) for (const c of d.players[q].hand.filter((c) => C.isMonster(c.no))) await d.discard(q, c, "effect"); } } });

  // ----- Summons -----
  define("Last Will", { activate: { can: (d, ctx) => cur(d).monGone[ctx.p] && H.canSummonHere(d, ctx.p) && H.deckMon(d, ctx.p, (c) => C.atk(c.no) <= 1500).length > 0, resolve: async (d, link) => {
    const c = await d.pickCard(link.p, "Special Summon which monster with 1500 or less ATK?", H.deckMon(d, link.p, (c) => C.atk(c.no) <= 1500)); if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } } });
  const lordOfD = (d) => up(d).some((z) => isName(z.card, "Lord of D."));
  define("The Flute of Summoning Dragon", { activate: { can: (d, ctx) => lordOfD(d) && H.canSummonHere(d, ctx.p) && d.players[ctx.p].hand.some((c) => isMonCard(c) && isT(c.no, "Dragon")), resolve: async (d, link) => {
    if (!lordOfD(d)) return;
    const cs = await d.pickCards(link.p, "Special Summon up to 2 Dragons from your hand.", d.players[link.p].hand, (c) => isMonCard(c) && isT(c.no, "Dragon"), { count: 2, min: 1 });
    for (const c of cs || []) await ss(d, link.p, c); } } });
  define("Cost Down", { activate: { can: (d, ctx) => handCount(d, ctx) > 0, cost: discardCost(),
    resolve: async (d, link) => { for (const c of d.players[link.p].hand) if (C.isMonster(c.no)) c.costDown = d.turn; } } });
  define("Insect Imitation", { activate: { can: (d, ctx) => d.monsters(ctx.p).some((z) => H.deckMon(d, ctx.p, (c) => isT(c.no, "Insect") && C.level(c.no) === H.lvl(d, z) + 1).length > 0),
    cost: tributeCost((d, z) => H.deckMon(d, d.controllerOf(z), (c) => isT(c.no, "Insect") && C.level(c.no) === H.lvl(d, z) + 1).length > 0),
    resolve: async (d, link) => { const lv = link.data.tributed.level + 1;
      const c = await d.pickCard(link.p, "Special Summon which Insect?", H.deckMon(d, link.p, (c) => isT(c.no, "Insect") && C.level(c.no) === lv)); if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } } });
  define("Tribute Doll", { activate: { can: (d, ctx) => d.monsters(ctx.p).length > 0 && d.players[ctx.p].hand.some((c) => summonable(c) && C.level(c.no) === 7), cost: tributeCost(),
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Level 7 monster?", d.players[link.p].hand, (c) => summonable(c) && C.level(c.no) === 7);
      const z = c && (await ss(d, link.p, c)); if (z) z.data.cannotAttackTurn = d.turn; } } });
  define("Magical Dimension", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => H.isType(d, z, "Spellcaster")) && d.players[ctx.p].hand.some((c) => isMonCard(c) && isT(c.no, "Spellcaster")),
    target: (d, link) => pickMon(d, link, "Tribute which of your monsters?", null, [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (!z) return; await d.sendToGrave(z.card, "tribute");
      const c = await d.pickCard(link.p, "Special Summon which Spellcaster?", d.players[link.p].hand, (c) => isMonCard(c) && isT(c.no, "Spellcaster")); if (!c || !(await ss(d, link.p, c))) return;
      if (mons(d).length && (await d.yesNo(link.p, "Destroy a monster on the field?"))) await destroyOne(d, link.p, "Destroy which monster?", null, "monster"); } } });
  define("Book of Life", { activate: { can: (d, ctx) => H.canSummonHere(d, ctx.p) && H.graveMon(d, ctx.p, (c) => isT(c.no, "Zombie") && !C.isExtra(c.no)).length > 0 && H.graveMon(d, 1 - ctx.p).length > 0,
    target: async (d, link) => { const a = await d.pickCard(link.p, "Special Summon which Zombie?", H.graveMon(d, link.p, (c) => isT(c.no, "Zombie") && !C.isExtra(c.no)));
      const b = await d.pickCard(link.p, "Remove which of their monsters from play?", H.graveMon(d, 1 - link.p)); if (!a || !b) return false; link.data.cs = [a, b]; return true; },
    resolve: async (d, link) => { const [a, b] = link.data.cs; if (d.players[link.p].grave.includes(a)) await ss(d, link.p, a); if (d.players[1 - link.p].grave.includes(b)) await d.banish(b, "effect"); } } });
  define("Silent Doom", { activate: { can: (d, ctx) => H.canSummonHere(d, ctx.p) && H.graveMon(d, ctx.p, (c) => C.kind(c.no) === "normal").length > 0,
    target: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Normal Monster?", H.graveMon(d, link.p, (c) => C.kind(c.no) === "normal")); if (!c) return false; link.data.c = c; return true; },
    resolve: async (d, link) => { const c = link.data.c; if (!d.players[link.p].grave.includes(c)) return; const z = await d.specialSummon(link.p, c, { how: "special", defense: true }); if (z) z.data.cannotAttack = true; } } });
  define("The Puppet Magic of Dark Ruler", { activate: { can: (d, ctx) => H.canSummonHere(d, ctx.p) || d.monsters(ctx.p).length ? H.graveMon(d, ctx.p, (c) => isT(c.no, "Fiend") && !C.isExtra(c.no)).some((c) => sets(d, ctx.p, C.level(c.no)).length) : false,
    resolve: async (d, link) => {
      const c = await d.pickCard(link.p, "Special Summon which Fiend?", H.graveMon(d, link.p, (c) => isT(c.no, "Fiend") && !C.isExtra(c.no) && sets(d, link.p, C.level(c.no)).length > 0)); if (!c) return;
      const o = await d.choose(link.p, "Remove which monsters from play (Levels " + C.level(c.no) + " in all)?", sets(d, link.p, C.level(c.no)).map((s) => ({ label: s.map((z) => d.name(z.card)).join(" + "), s })));
      if (!o) return; for (const z of o.s) await d.banish(z.card, "effect"); await ss(d, link.p, c); } } });
  // (the sets of p's monsters whose Levels add up to n)
  function sets(d, p, n) {
    const zs = d.monsters(p), out = [];
    for (let m = 1; m < 1 << zs.length; m++) { const s = zs.filter((z, k) => m & (1 << k)); if (s.reduce((a, z) => a + H.lvl(d, z), 0) === n) out.push(s); }
    return out;
  }
  define("A Deal with Dark Ruler", { activate: { can: (d, ctx) => cur(d).bigGone[ctx.p] && H.canSummonHere(d, ctx.p) && piles(d, ctx.p, ["hand", "deck"]).some((c) => isName(c, "Berserk Dragon")),
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon Berserk Dragon.", piles(d, link.p, ["hand", "deck"]), (c) => isName(c, "Berserk Dragon")); if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } } });
  const scorpions = (d, p) => d.players[p].hand.filter((c) => isMonCard(c) && has(c, "Dark Scorpion"));
  define("Mustering of the Dark Scorpions", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Don Zaloog")) && H.canSummonHere(d, ctx.p) && scorpions(d, ctx.p).length > 0, resolve: async (d, link) => {
    const cs = await d.pickCards(link.p, "Special Summon which Dark Scorpions (1 of each)?", scorpions(d, link.p), null, { count: 5, min: 0 });
    for (const c of (cs || []).filter((c, k, a) => a.findIndex((x) => x.no === c.no) === k)) await ss(d, link.p, c); } } });
  define("Jam Breeding Machine", stays({ jamBreeding: true, standby: async (d, z, p) => {
    if (d.turnPlayer === p) await d.summonToken(p, { name: "Slime Token", atk: 500, def: 500, level: 1, type: typeNo("Aqua"), attribute: ATTR.WATER }); } }));
  define("Fiend's Sanctuary", { activate: { can: (d, ctx) => d.freeMonsterZone(ctx.p) >= 0, resolve: async (d, link) => {
    const z = await d.summonToken(link.p, { name: "Metal Fiend Token", atk: 0, def: 0, level: 1, type: typeNo("Fiend"), attribute: ATTR.DARK });
    if (z) { z.data.cannotAttack = true; z.data.metalFiend = true; } } } });
  define("Call of the Mummy", stays({ ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && !d.monsters(ctx.p).length && H.canSummonHere(d, ctx.p) && d.players[ctx.p].hand.some((c) => isMonCard(c) && isT(c.no, "Zombie")),
    resolve: async (d, link) => { if (d.monsters(link.p).length) return; const c = await d.pickCard(link.p, "Special Summon which Zombie?", d.players[link.p].hand, (c) => isMonCard(c) && isT(c.no, "Zombie")); if (c) await ss(d, link.p, c); } } }));
  const unionCard = (c) => isMonCard(c) && /Union Monster|Unequip this card and Special Summon it/.test(DM.text(c.no)) && C.level(c.no) <= 4;
  define("Frontline Base", stays({ ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && H.canSummonHere(d, ctx.p) && d.players[ctx.p].hand.some(unionCard),
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Union monster?", d.players[link.p].hand, unionCard); if (c) await ss(d, link.p, c); } } }));
  define("Soul Exchange", { activate: { can: (d, ctx) => d.monsters(1 - ctx.p).length > 0 && d.freeMonsterZone(ctx.p) >= 0,
    target: (d, link) => pickMon(d, link, "Which of their monsters may you Tribute?", null, [1 - link.p]),
    resolve: async (d, link) => { d.players[link.p].flags.noBattleThisTurn = d.turn; const z = t0(d, link);
      if (z && (await d.takeControl(z, link.p))) { z.data.returnAtEnd = { to: 1 - link.p, turn: d.turn }; z.data.cannotAttackTurn = d.turn; } } } });
  define("Dimensionhole", { activate: { can: (d, ctx) => d.monsters(ctx.p).length > 0, resolve: async (d, link) => {
    const z = await d.pickZone(link.p, "Remove which of your monsters from play until your next Standby Phase?", (x, q) => q === link.p, { sides: [link.p], area: "monster" }); if (!z) return;
    const l = d.locate(z), c = z.card, p = link.p, hole = { p, i: l.i }; await d.banish(c, "effect");
    if (!d.players[c.owner].banished.includes(c)) return;
    X(d).closed.push(hole);
    atStandby(d, p, async (d2) => { X(d2).closed = X(d2).closed.filter((h) => h !== hole); if (d2.players[c.owner].banished.includes(c) && !d2.players[p].zones[hole.i]) await d2.placeMonster(p, c, { zone: hole.i, how: "return" }); }); } } });
  define("Different Dimension Gate", { activate: { stays: true, can: (d) => d.monsters(0).length > 0 && d.monsters(1).length > 0, target: async (d, link) => {
    const a = await d.pickZone(link.p, "Remove which of your monsters from play?", (z, q) => q === link.p, { sides: [link.p], area: "monster" });
    const b = a && (await d.pickZone(link.p, "Remove which of their monsters from play?", (z, q) => q !== link.p, { sides: [1 - link.p], area: "monster" }));
    if (!a || !b) return false; link.targets = [a, b]; return true; },
    resolve: async (d, link) => {
      const gone = [];
      for (const z of [t0(d, link, 0), t0(d, link, 1)].filter(Boolean)) { const p = d.controllerOf(z); gone.push({ c: z.card, p, faceUp: z.faceUp, defense: z.defense }); await d.banish(z.card, "effect"); }
      if (link.zone) link.zone.data.gate = gone.filter((g) => !g.c.token && d.players[g.c.owner].banished.includes(g.c)); } },
    onToGrave: async (d, c, p, from, why) => {
      if (why !== "destroyed" || !from || !from.z || !from.z.data.gate) return;
      for (const g of from.z.data.gate) if (d.players[g.c.owner].banished.includes(g.c)) await d.placeMonster(g.p, g.c, { faceUp: g.faceUp, defense: g.defense, how: "return" }); } });
  // (Fusion Materials back: De-Fusion)
  define("De-Fusion", { activate: { can: (d) => mons(d).some((z) => z.faceUp && C.kind(z.card.no) === "fusion"), target: (d, link) => pickMon(d, link, "Return which Fusion Monster?", (z) => z.faceUp && C.kind(z.card.no) === "fusion"),
    resolve: async (d, link) => {
      const z = t0(d, link); if (!z) return; const no = z.card.no, fused = z.summonedBy === "fusion";
      await d.toHand(z.card, "effect");   // (toHand puts a Fusion Monster in the Fusion Deck; toDeck would put it in the Deck)
      if (!fused || d.locate(z)) return;
      const g = d.players[link.p].grave, used = [];
      for (const n of DM.FUSIONS[no] || []) { const c = g.find((x) => x.no === n && !used.includes(x) && x.fusionMaterial) || g.find((x) => x.no === n && !used.includes(x)); if (c) used.push(c); }
      if (!used.length || used.length < (DM.FUSIONS[no] || []).length || [0, 1, 2, 3, 4].filter((i) => !d.players[link.p].zones[i] && !d.closed(link.p, i)).length < used.length) return;
      if (await d.yesNo(link.p, "Special Summon its Fusion Materials from your Graveyard?")) for (const c of used) await ss(d, link.p, c); } } });

  // ----- Graveyards -----
  define("Return of the Doomed", { activate: { can: (d, ctx) => handCount(d, ctx, (c) => C.isMonster(c.no)) > 0, cost: discardCost((c) => C.isMonster(c.no), "Discard which monster?"),
    resolve: async (d, link) => { const p = link.p; atEnd(d, async (d2) => {
      const c = await d2.pickCard(p, "Return which monster destroyed in battle to your hand?", d2.players[p].grave, (c) => C.isMonster(c.no) && c.battleDestroyedTurn === d2.turn); if (c) await d2.toHand(c, "effect"); }); } } });
  define("Fairy of the Spring", { activate: { can: (d, ctx) => d.players[ctx.p].grave.some((c) => C.isSpell(c.no) && C.icon(c.no) === ICON.EQUIP),
    target: async (d, link) => { const c = await d.pickCard(link.p, "Add which Equip Spell Card to your hand?", d.players[link.p].grave, (c) => C.isSpell(c.no) && C.icon(c.no) === ICON.EQUIP); if (!c) return false; link.data.c = c; return true; },
    resolve: async (d, link) => { const c = link.data.c; if (!d.players[link.p].grave.includes(c)) return; await d.toHand(c, "effect"); c.noActivateTurn = d.turn; } } });
  define("Question", { activate: { can: (d, ctx) => H.graveMon(d, ctx.p).length > 0, resolve: async (d, link) => {
    const g = H.graveMon(d, link.p); if (!g.length) return; const bottom = g[0];
    const o = await d.choose(1 - link.p, "Call the name of the monster at the bottom of their Graveyard.", g.filter((c, k) => g.findIndex((x) => x.no === c.no) === k).map((c) => ({ label: d.name(c), value: c.no })));
    await d.emit({ type: "reveal", p: link.p, card: bottom });
    if (o && o.value === bottom.no) await d.banish(bottom, "effect"); else if (H.canSummonHere(d, link.p)) await ss(d, link.p, bottom); } } });
  define("Reasoning", { activate: { can: (d, ctx) => d.players[ctx.p].deck.some(summonable), resolve: async (d, link) => {
    const o = await d.choose(1 - link.p, "Declare a Level.", [...Array(12).keys()].map((k) => ({ label: "Level " + (k + 1), v: k + 1 }))), lv = o ? o.v : 1, pl = d.players[link.p], dug = [];
    while (pl.deck.length) { const c = pl.deck.shift(); dug.push(c); await d.emit({ type: "reveal", p: link.p, card: c }); if (summonable(c)) break; }
    const m = dug[dug.length - 1];
    if (m && summonable(m) && C.level(m.no) !== lv && H.canSummonHere(d, link.p)) { pl.hand.push(m); dug.pop(); await ss(d, link.p, m); }
    for (const c of dug) pl.grave.push(c); } } });
  define("Double Spell", { activate: {
    can: (d, ctx) => handCount(d, ctx, (c) => C.isSpell(c.no)) > 0 && d.freeSpellZone(ctx.p) >= 0 && d.players[1 - ctx.p].grave.some((c) => copyable(d, ctx.p, c)),
    cost: discardCost((c) => C.isSpell(c.no), "Discard which Spell Card?"),
    target: async (d, link) => { const c = await d.pickCard(link.p, "Use which Spell Card from their Graveyard?", d.players[1 - link.p].grave, (c) => copyable(d, link.p, c)); if (!c) return false; link.data.c = c; return true; },
    resolve: async (d, link) => {
      const c = link.data.c, p = link.p, e = DM.effectOf(c.no); if (!d.players[1 - p].grave.includes(c) || !copyable(d, p, c)) return;
      const i = C.icon(c.no) === ICON.FIELD ? 10 : d.freeSpellZone(p); if (i < 0) return;
      if (i === 10 && d.players[p].zones[10]) await d.sendToGrave(d.players[p].zones[10].card, "replaced");
      d.take(c); const z = DM.newZone(c, { faceUp: true, placedTurn: d.turn }); d.players[p].zones[i] = z;
      const a = e.activate, l = { p, card: c, zone: z, prev: null, speed: 1, resolve: a.resolve, targets: [], data: {}, label: d.name(c),
        stays: !!(a.stays || [ICON.CONTINUOUS, ICON.FIELD, ICON.EQUIP].includes(C.icon(c.no))) };
      await d.emit({ type: "activate", p, card: c, zone: z, link: l });
      if (a.target && (await a.target(d, l)) === false) l.negated = true;
      await d.resolveChain([l]); } } });
  // (a Spell in the other Graveyard whose effect could be used now)
  function copyable(d, p, c) { const e = DM.effectOf(c.no); if (!C.isSpell(c.no) || !e || !e.activate || e.placedOnly || e.standbySpell || isName(c, "Double Spell")) return false;
    try { return !e.activate.can || !!e.activate.can(d, { p, card: c }); } catch (err) { return false; } }

  // ----- Answering a chain -----
  define("Spell of Pain", { activate: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && /damage/i.test(DM.text(ctx.last.card.no)) && !/battle damage/i.test(DM.text(ctx.last.card.no)),
    resolve: async (d, link) => { if (link.prev) X(d).pain = { link: link.prev, to: link.prev.p, victim: link.p }; } } });
  define("My Body as a Shield", { activate: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && d.players[ctx.p].lp > 1500 && mons(d).length > 0 && /destroy[^.]*monster|monster[^.]*destroy/i.test(DM.text(ctx.last.card.no)),
    cost: async (d, link) => { await d.payLp(link.p, 1500); return true; },
    resolve: async (d, link) => { const v = link.prev; if (!v) return; v.negated = true; if (v.zone && d.locate(v.zone)) await d.destroy(v.zone, "negated"); } } });
  define("Spiritualism", { activate: { can: (d, ctx) => H.st(d, 1 - ctx.p).length > 0,
    target: async (d, link) => { Object.defineProperty(link, "negated", { get: () => false, set: () => {} }); return H.target(d, link, "Return which Spell or Trap Card to the hand?", (z, q, i) => q !== link.p && i >= 5, { sides: [1 - link.p], area: "spell" }); },
    resolve: async (d, link) => { const z = t0(d, link); if (z) await d.toHand(z.card, "effect"); } } });
  define("Bait Doll", { activate: { can: (d, ctx) => H.st(d).some((z) => !z.faceUp && z !== ctx.zone),
    target: (d, link) => H.target(d, link, "Reveal which Set card?", (z, q, i) => i >= 5 && !z.faceUp && z !== link.zone, { area: "spell" }),
    resolve: async (d, link) => {
      const z = t0(d, link);
      if (z && !z.faceUp) {
        const q = d.controllerOf(z), a = (DM.effectOf(z.card.no) || {}).activate;
        await d.emit({ type: "reveal", p: q, card: z.card });
        if (C.isTrap(z.card.no)) {
          if (a && d.canActivate(q, z.card, a, { zone: z })) { const l2 = await d.activate(q, { card: z.card, zone: z, from: "field" }, null, null); if (l2) await d.resolveChain([l2]); }
          else { z.faceUp = true; await d.destroy(z, "effect"); }
        }
      }
      if (link.zone && d.locate(link.zone)) await d.toDeck(link.card, "shuffle", "effect"); } } });
  define("Super Rejuvenation", { activate: { resolve: async (d, link) => { const p = link.p; atEnd(d, async (d2) => { const n = cur(d2).dragons[p]; if (n) await d2.drawCards(p, n); }); } } });

  // ----- Continuous Spells -----
  define("Prohibition", { activate: { resolve: async (d, link) => {
    const no = await declare(d, link.p, "Declare a card name."); if (!no || !link.zone) return;
    for (const q of [0, 1]) for (const z of d.allZones(q)) if (z.card.no === no) z.data.preProhib = true;
    link.zone.data.prohibit = no; } } });
  define("Cold Wave", { activate: { can: (d, ctx) => d.phase === "main1" && !d.players[ctx.p].normalSummoned && !d.players[ctx.p].flags.spellThisTurn,
    resolve: async (d) => { X(d).coldUntil = d.turn + 2; } } });
  define("Timidity", { activate: { resolve: async (d) => { X(d).timidUntil = d.turn + 1; } } });
  define("Spirit Elimination", { activate: { resolve: async (d, link) => { X(d).spiritElim = { p: link.p, turn: d.turn }; } } });
  define("The Secret of the Bandit", { activate: { can: (d) => d.phase === "main1" && up(d).length > 0, resolve: async (d, link) => {
    const z = await d.pickZone(link.p, "Which monster makes them discard?", (x) => x.faceUp, { area: "monster" }); if (z) z.data.banditTurn = d.turn; } } });
  define("Magic Reflector", { activate: { can: (d, ctx) => H.st(d, ctx.p).some((z) => z !== ctx.zone && z.faceUp && C.isSpell(z.card.no)),
    target: (d, link) => H.target(d, link, "Put a counter on which Spell Card?", (z, q, i) => q === link.p && i >= 5 && z !== link.zone && z.faceUp && C.isSpell(z.card.no), { sides: [link.p], area: "spell" }),
    resolve: async (d, link) => { const z = t0(d, link); if (z) { z.counters.reflector = (z.counters.reflector || 0) + 1; await d.emit({ type: "counter", zone: z, n: z.counters.reflector }); } } } });
  define("The A. Forces", stays({ aura: (d, src, sp, z, zp) => (zp === sp && isMon(d, z) && z.faceUp && H.isType(d, z, "Warrior")
    ? { atk: 200 * up(d, sp).filter((x) => H.isType(d, x, "Warrior") || H.isType(d, x, "Spellcaster")).length } : null) }));
  define("Convulsion of Nature", stays({ revealsDecks: true }));
  define("Second Coin Toss", stays({ secondCoinToss: true }));
  define("Kaiser Colosseum", stays({ kaiser: true }));
  define("Non-Spellcasting Area", stays({ nonSpellcasting: true }));
  define("Spiritual Energy Settle Machine", stays({
    endPhase: async (d, z, q) => {
      for (const m of up(d)) if (isSpirit(m.card) && m.placedTurn === d.turn) m.placedTurn = d.turn - 1;
      if (d.turnPlayer !== q) return;
      if (d.players[q].hand.length && (await d.yesNo(q, "Discard a card to keep Spiritual Energy Settle Machine?"))) await H.discardOne(d, q, "Discard which card?"); else await d.destroy(z, "cost"); },
    onLeave: async (d) => { for (const m of up(d).filter((m) => isSpirit(m.card))) if (d.locate(m)) await d.toHand(m.card, "spirit"); } }));

  // ----- Field Spells -----
  define("Necrovalley", { activate: { resolve: async () => {} }, necrovalley: true,
    aura: (d, src, sp, z) => (isMon(d, z) && z.faceUp && !z.card.token && C.name(z.card.no).startsWith("Gravekeeper's") ? { atk: 500, def: 500 } : null) });
  define("Pandemonium", { activate: { resolve: async () => {} }, noArchfiendUpkeep: true, onEvent: async (d, z, p, ev) => {
    if (ev.type !== "destroyed" || !archfiend(ev.card) || !d.players[ev.card.owner].grave.includes(ev.card)) return;
    const q = ev.card.owner, lv = C.level(ev.card.no);
    if (H.deckMon(d, q, (c) => archfiend(c) && C.level(c.no) < lv).length && (await d.yesNo(q, "Add a lower-Level Archfiend from your Deck to your hand (Pandemonium)?")))
      await H.searchDeck(d, q, (c) => archfiend(c) && C.level(c.no) < lv, "Add which Archfiend?"); } });
})();

// (Cards beyond GX's: their Traps, Normal, Continuous and Counter.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo, ICON = DM.ICON;
  const { isName, show, discardCost, handCount, umi, mine, noop, ss, unionOf } = DM.REST;
  const up = H.up, mons = H.mons, t0 = H.t, isMon = H.isMon;
  const isMonCard = (c) => C.isMonster(c.no) && !C.isExtra(c.no);
  const has = (c, part) => !!c && !c.token && C.name(c.no).includes(part);
  const inGrave = (d, c) => !!c && !c.token && d.players[c.owner].grave.includes(c);
  const pickMon = (d, link, prompt, filter, sides) => H.target(d, link, prompt, (z, q) => (!sides || sides.includes(q)) && (!filter || filter(z, q)), { area: "monster" });
  const theirs = (ctx) => !!ctx.event && ctx.event.p !== ctx.p;
  const stays = (extra) => Object.assign({ activate: Object.assign({ stays: true }, noop) }, extra);
  const pay = (n) => async (d, link) => { await d.payLp(link.p, n); return true; };
  const payOrDestroy = (n) => async (d, z, p) => {
    if (d.turnPlayer !== p) return;
    if (d.players[p].lp > n && (await d.yesNo(p, "Pay " + n + " LP to keep " + d.name(z.card) + "?"))) await d.payLp(p, n); else await d.destroy(z, "cost");
  };
  const text = (c) => (c && !c.token ? DM.text(c.no) : "");
  // (a link that is a Spell's or a Trap's activation, not a face-up one's effect)
  const isAct = (l, kind) => !!l && !l.fromMonster && !!l.card && !l.card.token && C["is" + kind](l.card.no);
  const isST = (l) => isAct(l, "Spell") || isAct(l, "Trap");
  const oneMon = (d, l) => (l && l.targets.length === 1 && isMon(d, l.targets[0]) ? l.targets[0] : null);
  const SUMMONS = ["summoned", "flip-summoned", "special-summoned"];
  const summonOf = (d, ev) => (ev && SUMMONS.includes(ev.type) && ev.zone && d.locate(ev.zone) ? ev.zone : null);
  const KINDS = [{ label: "Monster", v: "monster" }, { label: "Spell", v: "spell" }, { label: "Trap", v: "trap" }];
  const kindOf = (c) => (C.isMonster(c.no) ? "monster" : C.isSpell(c.no) ? "spell" : "trap");
  const ATTRS = () => [1, 2, 3, 4, 5, 6].map((a) => ({ label: window.YUGIOH_CARDS.attributes[a], v: a }));
  const top = (d) => (d.xLinks || [])[(d.xLinks || []).length - 1];
  const watch = (d, fn) => d.xWatch.push(fn);
  const atPhase = (d, phases, fn, turn) => watch(d, async (d2, ev) => { if (ev.type === "phase" && [].concat(phases).includes(ev.phase) && (turn == null || d2.turn === turn)) { await fn(d2); return true; } });
  // (negated until the next turn begins)
  const negateTurn = (d, zones) => { for (const z of zones) if (z && !z.negated) { z.negated = true; d.xNeg.push(z); } };
  const negateLink = async (d, v) => { if (!v) return; v.negated = true; if (v.zone && d.locate(v.zone)) await d.destroy(v.zone, "negated"); };
  // (a face-down Trap waiting for this kind of event: then it gets a window)
  const awaits = (d, type) => [0, 1].some((q) => H.st(d, q).some((z) => { const e = DM.effectOf(z.card.no); return !z.faceUp && e && e.activate && [].concat(e.activate.when || []).includes(type); }));
  // (what a Spell's target could be instead: its target's own filter, kept by H.target)
  const retargets = (d, l, sides) => {
    const k = l && l.xPick, out = [];
    if (!k) return out;
    const a = k.opts && k.opts.area;
    for (const q of (k.opts && k.opts.sides) || [0, 1]) if (!sides || sides.includes(q)) for (let i = 0; i < 11; i++) {
      const z = d.players[q].zones[i];
      if (!z || z === l.targets[0] || z === l.zone || (a && (a === "monster" ? i >= 5 : a === "spell" ? i < 5 : false))) continue;
      try { if (k.filter(z, q, i)) out.push(z); } catch (e) { /* (a filter that no longer applies) */ }
    }
    return out;
  };

  // ---------- The engine's hooks these Traps need ----------
  // Each duel's API, wrapped where a card here needs it; with none of them in play, it does what it did.
  const target0 = H.target;
  H.target = async function (d, link, prompt, filter, opts) { const r = await target0.call(this, d, link, prompt, filter, opts); if (r) link.xPick = { filter, opts }; return r; };
  // (Dice Re-Roll)
  const die0 = H.die;
  H.die = async function (d, p) {
    const R = d.flags.xReroll;
    if (!R || R.turn !== d.turn || R.used) return die0.call(this, d, p);
    let r = await die0.call(this, d, p);
    if (await d.yesNo(R.p, "The die shows " + r + ". Re-roll it (Dice Re-Roll)?")) { R.used = true; r = await die0.call(this, d, p); }
    return r;
  };
  const equipsOff = (d) => d.flags.xEquipsOff === d.turn || (!!d.flags.xHoliday && !!d.liveWith("negatesEquips"));
  // (the engine's fullStats, with Reverse Trap's additions reversed and the Equip Cards' effects negated)
  function fullStatsX(z, base, raw) {
    const no = z.card.no, rev = this.flags.xReverse === this.turn ? -1 : 1, eqOff = equipsOff(this);
    const s = Object.assign({}, base), mult = { atk: 1, def: 1 };
    const apply = (m) => {
      if (!m) return;
      if (m.type != null) s.type = m.type;
      if (m.attribute != null) s.attribute = m.attribute;
      if (m.setAtk != null) s.atk = m.setAtk;   // (in order, as the engine's)
      if (m.setDef != null) s.def = m.setDef;
      s.atk += rev * (m.atk || 0); s.def += rev * (m.def || 0);
      if (m.atkMult) mult.atk *= m.atkMult;
      if (m.defMult) mult.def *= m.defMult;
      if (m.level) s.level += m.level;
    };
    const self = this.locate(z), own = DM.effectOf(no);
    if (!raw && own && own.selfStats && !z.negated) apply(own.selfStats(this, z, self ? self.p : 0));
    if (!raw) for (const p of [0, 1]) for (const src of this.allZones(p)) {
      if (!src.faceUp || src.negated) continue;
      const e = DM.effectOf(src.card.no);
      if (!e || !e.aura || (src === z && !e.auraSelf) || !this.live(src)) continue;
      apply(e.aura(this, src, p, z, self ? self.p : 0, s));
    }
    for (const l of z.links) if (l.stats && !(eqOff && l.kind === "equip")) apply(typeof l.stats === "function" ? l.stats(this, z) : l.stats);
    for (const t of this.temp) if (t.zone === z && t.stats) apply(t.stats);
    s.atk = Math.max(0, Math.round(s.atk * mult.atk)); s.def = Math.max(0, Math.round(s.def * mult.def));
    if (this.flags.swapAtkDef) [s.atk, s.def] = [s.def, s.atk];
    return s;
  }
  // (Skill Drain: the face-up monsters' effects negated)
  function drain(d) {
    const s = d.liveWith("xSkillDrain");
    if (!s) return;
    for (const z of up(d)) if (!z.negated) { z.negated = true; (s.data.drained = s.data.drained || []).push(z); }
  }
  const full = (d, p) => !!d.liveWith("xSpatial") && d.allZones(p).length >= 5;
  // (a Trap that answers the damage about to be dealt in battle: Nutrient Z)
  async function damageStep(d, p, n) {
    for (const z of H.st(d, p)) {
      const e = DM.effectOf(z.card.no), a = e && e.activate, ev = { type: "damage-step", p, amount: n };
      if (!a || z.faceUp || ![].concat(a.when || []).includes("damage-step") || z.placedTurn === d.turn || d.negated("trap") || !d.canActivate(p, z.card, a, { zone: z, event: ev })) continue;
      if (!(await d.yesNo(p, "Activate " + d.name(z.card) + "?"))) continue;
      const link = await d.activate(p, { card: z.card, zone: z, from: "field" }, null, ev);
      if (link) await d.buildChain([link], ev);
    }
  }
  // (Pharaoh's Treasure drawn)
  async function treasure(d, p, c) {
    c.xTreasure = false;
    await d.emit({ type: "reveal", p, card: c });
    await d.sendToGrave(c, "effect");
    const t = await d.pickCard(p, "Add which card from your Graveyard to your hand?", d.players[p].grave, (x) => x !== c);
    if (t) await d.toHand(t, "effect");
  }
  function patch(d) {
    if (d.xLinks) return d;
    d.xLinks = []; d.xWatch = []; d.xGuards = []; d.xNeg = []; d.xNegRules = []; d.xAfter = []; d.xQueue = [];
    const o = {};
    for (const k of ["runEffect", "damage", "heal", "payLp", "drawCards", "toHand", "destroy", "flipUp", "fullStats", "canBeAttacked", "attackWith", "battleDamage", "emit",
      "takeControl", "summoned", "canActivate", "mainActions", "specialSummon", "summonToken"]) o[k] = d[k];
    // (the link resolving now: whose effect it is)
    d.runEffect = async function (link) { this.xLinks.push(link); try { return await o.runEffect.call(this, link); } finally { this.xLinks.pop(); } };
    d.damage = async function (p, n, why) {
      if (n > 0 && !this.over) {
        if ((this.players[p].flags.xNoDamage == null ? -1 : this.players[p].flags.xNoDamage) >= this.turn) return;
        const L = top(this);
        // (Barrel Behind the Door, Trap of Board Eraser: the damage of the effect they answered)
        if (why !== "battle" && L && L.xRedirect && L.xRedirect.from === p) { if (L.xRedirect.to == null) return; p = L.xRedirect.to; }
        if (why === "battle" && n >= 2000) await damageStep(this, p, n);
      }
      return o.damage.call(this, p, n, why);
    };
    // (Bad Reaction to Simochi)
    d.heal = async function (p, n, why) { if (n > 0 && this.liveWith("xSimochi", 1 - p)) return this.damage(p, n, "effect"); return o.heal.call(this, p, n, why); };
    // (Life Absorbing Machine: what each player pays, by turn)
    d.payLp = async function (p, n) { const pl = this.players[p]; pl.xPaid = pl.xPaid || {}; pl.xPaid[this.turn] = (pl.xPaid[this.turn] || 0) + n; return o.payLp.call(this, p, n); };
    d.drawCards = async function (p, n, drawPhase) {
      const h = this.players[p].hand, k0 = h.length;
      const got = await o.drawCards.call(this, p, n, drawPhase);
      for (const c of h.slice(k0)) if (c.xTreasure && h.includes(c)) await treasure(this, p, c);
      if (!drawPhase && got > 0 && !this.over) { const ev = { type: "drew-outside", p, n: got }; await (awaits(this, ev.type) ? this.event(ev) : this.notify(ev)); }
      return got;
    };
    d.toHand = async function (c, why) {
      const l = this.zoneOf(c), L = top(this);
      await o.toHand.call(this, c, why);
      if (l && l.i < 5 && L && L.p !== l.p && !this.over) { const ev = { type: "monster-returned", p: l.p, card: c, by: L.p }; await (awaits(this, ev.type) ? this.event(ev) : this.notify(ev)); }
    };
    d.destroy = async function (z, why, by) {
      const l = this.locate(z);
      if (!l) return false;
      for (const g of this.xGuards.slice()) if (g.test(this, z, l)) { await g.instead(this, z); return false; }
      const L = top(this);
      z.card.xBy = L ? L.p : null; z.card.xDied = { p: l.p, defense: z.defense, faceUp: z.faceUp };
      const ok = await o.destroy.call(this, z, why, by);
      // (Cloning's token, with its original)
      if (ok && z.data.xClone && this.locate(z.data.xClone) && inGrave(this, z.card)) await this.destroy(z.data.xClone, "effect");
      return ok;
    };
    // (Goblin Fan: a Level 2 or lower monster Flip Summoned, without its effects)
    d.flipUp = async function (z, how, noEffect) {
      if (!z.faceUp && how === "flip-summon" && this.liveWith("xGoblinFan") && this.stats(z).level <= 2) { z.data.xFanned = this.turn; noEffect = true; }
      await o.flipUp.call(this, z, how, noEffect);
      drain(this);
    };
    // (a negated monster (Skill Drain) summoned without its summon effect)
    d.summoned = async function (p, z, how) {
      if (how === "flip") { z.data.xFlipTurn = this.turn; if (z.data.xFanned === this.turn) { z.data.xFanned = null; await this.destroy(z, "effect"); return; } }
      drain(this);
      if (!z.negated) return o.summoned.call(this, p, z, how);
      await this.event({ type: how === "flip" ? "flip-summoned" : how === "special" ? "special-summoned" : "summoned", p, zone: z, card: z.card });
    };
    d.fullStats = function (z, base, raw) { return this.flags.xReverse === this.turn || equipsOff(this) ? fullStatsX.call(this, z, base, raw) : o.fullStats.call(this, z, base, raw); };
    // (A Feint Plan, Staunch Defender)
    d.canBeAttacked = function (z, q, att) {
      const f = this.flags, s = f.xStaunch;
      if (f.xFeint === this.turn && !z.faceUp) return false;
      if (s && s.turn === this.turn && s.p === q && this.locate(s.zone) && this.controllerOf(s.zone) === q && z !== s.zone) return false;
      return o.canBeAttacked.call(this, z, q, att);
    };
    // (after an attack: what waited for its end (Destruction Punch), and the attacks that come instead (Dark Spirit of the Silent, Last Turn))
    d.attackWith = async function (p, att, target) {
      await o.attackWith.call(this, p, att, target);
      for (const f of this.xAfter.splice(0)) await f(this);
      while (this.xQueue.length && !this.over) {
        const x = this.xQueue.shift(), q = 1 - x.p;
        if (!this.locate(x.att) || this.controllerOf(x.att) !== x.p) continue;
        if (x.target ? !this.locate(x.target) || this.controllerOf(x.target) !== q : this.monsters(q).length > 0) continue;
        await this.attackWith(x.p, x.att, x.target);
      }
    };
    // (Dark Scorpion Combination)
    d.battleDamage = async function (r, n, dealer, other, A) { if (dealer && !other && dealer.data.xScorpion === this.turn) n = 400; return o.battleDamage.call(this, r, n, dealer, other, A); };
    d.emit = async function (ev) {
      await o.emit.call(this, ev);
      if (ev.type === "turn") { for (const z of this.xNeg.splice(0)) z.negated = false; this.xNegRules = this.xNegRules.filter((r) => r.turn >= this.turn); }
      if (ev.type === "activate" && ev.zone && ev.link && this.xNegRules.some((r) => r.turn === this.turn && r.test(ev.card))) { ev.link.resolve = async () => {}; negateTurn(this, [ev.zone]); }
      if (this.xWatch.length) for (const w of this.xWatch.slice()) if (this.xWatch.includes(w) && (await w(this, ev))) this.xWatch.splice(this.xWatch.indexOf(w), 1);
    };
    // (Remove Brainwashing)
    d.takeControl = async function (z, p) { if (this.liveWith("xNoSteal") && p !== z.card.owner) return false; return o.takeControl.call(this, z, p); };
    // (Judgment of the Pharaoh, Cursed Seal of the Forbidden Spell)
    d.canActivate = function (p, c, a, ctx) {
      const f = this.players[p].flags;
      if (f.xNoMonEff === this.turn && C.isMonster(c.no)) return false;
      if (f.xNoST === this.turn && (C.isSpell(c.no) || C.isTrap(c.no))) return false;
      if (f.xSealed && C.isSpell(c.no) && f.xSealed.includes(c.no)) return false;
      return o.canActivate.call(this, p, c, a, ctx);
    };
    // (Judgment of the Pharaoh: no Sets; Spatial Collapse: five cards on the field at most)
    d.mainActions = function (p) {
      let acts = o.mainActions.call(this, p);
      if (this.players[p].flags.xNoST === this.turn) acts = acts.filter((a) => a.act !== "set-spell");
      if (full(this, p)) acts = acts.filter((a) => !(a.act === "set-spell" || a.act === "special-hand" || ((a.act === "summon" || a.act === "set-monster") && !a.tributes)
        || (a.act === "activate" && a.from === "hand" && !(C.icon(a.card.no) === ICON.FIELD && this.players[p].zones[10]))));
      return acts;
    };
    d.specialSummon = async function (p, c, opts) { if (this.players[p].flags.xNoSummon === this.turn || full(this, p)) return null; return o.specialSummon.call(this, p, c, opts); };
    d.summonToken = async function (p, stats, opts) { if (this.players[p].flags.xNoSummon === this.turn || full(this, p)) return null; return o.summonToken.call(this, p, stats, opts); };
    return d;
  }
  const create0 = DM.create;
  DM.create = function (opts) { return patch(create0.apply(this, arguments)); };

  // ---------- Helpers for the Traps ----------
  const onAttack = (cond, resolve, extra) => ({ activate: Object.assign({ when: "attack", can: (d, ctx) => theirs(ctx) && !!d.attack && d.locate(d.attack.attacker) && (!cond || cond(d, ctx, d.attack)), resolve }, extra) });
  const onSummon = (cond, resolve, events) => ({ activate: { when: events || SUMMONS, can: (d, ctx) => !!summonOf(d, ctx.event) && cond(d, ctx.event, ctx.p),
    resolve: async (d, link) => { const z = summonOf(d, link.event); if (z && cond(d, link.event, link.p)) await resolve(d, link, z); } } });
  const counter = (test, cost, after) => ({ activate: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && test(d, ctx.last, ctx) && (!cost || cost.can(d, ctx)),
    cost: cost && cost.pay, resolve: async (d, link) => { const v = link.prev; if (!v) return; await negateLink(d, v); if (after) await after(d, link, v); } } });
  const discardOne = (filter) => ({ can: (d, ctx) => handCount(d, ctx, filter) > 0, pay: discardCost(filter) });
  const burnText = (l) => /inflict|damage/i.test(text(l.card));
  // (a Continuous Trap whose effect is used while it's face up: its first activation only turns it face up, later ones use it)
  const reuse = (use, extra) => Object.assign({ activate: { stays: true, repeatable: true,
    can: (d, ctx) => (ctx.zone && ctx.zone.data.on ? use.can(d, ctx) : !use.first || use.first(d, ctx)),
    cost: async (d, link) => { link.data.use = !!(link.zone && link.zone.data.on); return link.data.use && use.cost ? use.cost(d, link) : true; },
    resolve: async (d, link) => { if (link.data.use) return use.resolve(d, link); if (link.zone) link.zone.data.on = true; } } }, extra);
  // (a monster from the hand Normal Summoned or Set besides the turn's own)
  const normalable = (d, p) => d.players[p].hand.filter((c) => {
    const no = c.no, e = DM.effectOf(no);
    if (!C.isMonster(no) || C.isExtra(no) || C.kind(no) === "ritual" || (e && e.specialOnly)) return false;
    const t = DM.tributesFor(no, e);
    return d.tributable(p).length >= t && (t > 0 || d.freeMonsterZone(p) >= 0);
  });
  async function extraNormal(d, p) {
    const acts = [];
    for (const c of normalable(d, p)) { const t = DM.tributesFor(c.no, DM.effectOf(c.no)); acts.push({ act: "summon", card: c, tributes: t, label: "Summon " + d.name(c) }, { act: "set-monster", card: c, tributes: t, label: "Set " + d.name(c) }); }
    const a = await d.choose(p, "Normal Summon or Set which monster?", acts);
    if (!a) return;
    const pl = d.players[p], was = pl.normalSummoned;
    await d.doAction(p, a);
    pl.normalSummoned = was;
  }
  // (Union monsters: the monsters their text lets them equip to, or true for any)
  // (its partners, from its text: "equip it to "X" as an Equip", or the TCG's now, "Target 1 "X" you control; equip this card")
  const unionTargets = (c) => { const m = /equip it to (.*?) as an Equip/i.exec(text(c)) || /Target 1 (.*?) you control; equip this card/i.exec(text(c)); if (!m) return null; const ns = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]); return ns.length ? ns : true; };
  const unionFits = (d, c, x) => { const t = unionTargets(c); return !!t && x.faceUp && !x.card.token && (t === true || isName(x.card, t)) && !unionOf(x); };

  // ----- Answering an attack -----
  define("Kunai with Chain", { activate: { stays: true, can: (d, ctx) => (theirs(ctx) && ctx.event.type === "attack" && !!d.attack) || up(d, ctx.p).length > 0,
    target: async (d, link) => {
      const a = link.event && link.event.type === "attack" && d.attack && d.attack.p !== link.p && d.locate(d.attack.attacker) ? d.attack.attacker : null, mine2 = up(d, link.p).length > 0;
      const o = await d.choose(link.p, "Kunai with Chain:", [a && { label: "Change the attacker to Defense Position", v: 1 }, mine2 && { label: "Equip it to your monster (+500 ATK)", v: 2 }, a && mine2 && { label: "Both", v: 3 }].filter(Boolean));
      if (!o) return false;
      link.data.att = o.v & 1 ? a : null;
      link.data.eq = o.v & 2 ? await d.pickZone(link.p, "Equip Kunai with Chain to which monster?", (x, q) => q === link.p && x.faceUp, { sides: [link.p], area: "monster" }) : null;
      link.targets = [link.data.att, link.data.eq].filter(Boolean);
      return link.targets.length > 0; },
    resolve: async (d, link) => {
      const a = link.data.att, z = link.data.eq;
      if (a && d.locate(a) && !a.defense) await d.changePosition(a, true);
      if (z && d.locate(z) && z.faceUp && link.zone && d.locate(link.zone)) { d.equip(link.zone, z, { atk: 500 }); await d.event({ type: "equipped", p: link.p, card: link.card, zone: z }); }
      else if (link.zone) link.zone.data.discard = true; } } });
  define("Magical Arm Shield", onAttack((d, ctx, A) => d.monsters(ctx.p).length > 0 && d.freeMonsterZone(ctx.p) >= 0 && up(d, 1 - ctx.p).some((z) => z !== A.attacker),
    async (d, link) => {
      const z = t0(d, link), A = d.attack;
      if (!z || !A || !(await d.takeControl(z, link.p))) return;
      A.target = z;
      atPhase(d, ["main2", "end"], async (d2) => { if (d2.locate(z) && d2.controllerOf(z) === link.p) await d2.takeControl(z, 1 - link.p); }, d.turn);
    }, { target: (d, link) => pickMon(d, link, "Take control of which monster?", (z) => z.faceUp && (!d.attack || z !== d.attack.attacker), [1 - link.p]) }));
  define("Dark Spirit of the Silent", onAttack((d, ctx, A) => up(d, 1 - ctx.p).some((z) => z !== A.attacker), async (d, link) => {
    const A = d.attack;
    if (!A) return;
    const att = A.attacker, tgt = A.target;
    H.negateAttack(d);
    const z = await d.pickZone(link.p, "Which of their monsters attacks instead?", (x, q) => q !== link.p && x.faceUp && x !== att, { sides: [1 - link.p], area: "monster" });
    if (!z) return;
    if (z.defense) await d.changePosition(z, false);
    d.xQueue.push({ p: 1 - link.p, att: z, target: tgt });
  }));
  define("Destruction Punch", { activate: { stays: true, when: "attack", can: (d, ctx) => theirs(ctx) && !!d.attack && !!d.attack.target && d.controllerOf(d.attack.target) === ctx.p && d.attack.target.defense,
    resolve: async (d, link) => {
      const z = link.zone;
      if (!z || !d.attack) { if (z) z.data.discard = true; return; }
      z.data.punch = d.attack.attacker;
      d.xAfter.push(async (d2) => { if (d2.locate(z)) await d2.sendToGrave(z.card, "used"); }); } },
    battleResult: (d, s, sp, att, target) => { if (s.data.punch === att && d.controllerOf(target) === sp && target.defense && d.atkOf(att) < d.defOf(target)) att.data.destroyAfterBattle = true; } });
  const barkPair = (d, p) => {
    const A = d.attack;
    if (!A || !A.target) return null;
    const [m, o] = d.controllerOf(A.attacker) === p ? [A.attacker, A.target] : [A.target, A.attacker];
    return d.controllerOf(m) === p && d.controllerOf(o) === 1 - p && H.isType(d, m, "Fiend") ? o : null;
  };
  define("Bark of Dark Ruler", { activate: { when: "attack", can: (d, ctx) => !!barkPair(d, ctx.p) && d.players[ctx.p].lp > 100,
    cost: async (d, link) => {
      const o = barkPair(d, link.p), lp = d.players[link.p].lp;
      if (!o) return false;
      const most = Math.min(Math.floor((lp - 1) / 100) * 100, Math.max(100, Math.ceil(Math.max(d.atkOf(o), d.defOf(o)) / 100) * 100)), opts = [];
      for (let n = 100; n <= most; n += 100) opts.push({ label: "Pay " + n + " LP", v: n });
      const c = await d.choose(link.p, "Pay how many LP?", opts);
      if (!c) return false;
      await d.payLp(link.p, c.v); link.data.n = c.v; link.targets = [o]; return true; },
    resolve: async (d, link) => { const z = t0(d, link); if (z) d.addTemp(z, { atk: -link.data.n, def: -link.data.n }, link.card); } } });
  define("Relieve Monster", onAttack((d, ctx) => d.monsters(ctx.p).length > 0, async (d, link) => {
    const z = t0(d, link);
    if (!z) return;
    await d.toHand(z.card, "effect");
    const c = await d.pickCard(link.p, "Special Summon a Level 4 monster from your hand?", d.players[link.p].hand, (x) => isMonCard(x) && C.level(x.no) === 4);
    if (c && H.canSummonHere(d, link.p)) await ss(d, link.p, c);
  }, { target: (d, link) => pickMon(d, link, "Return which of your monsters to your hand?", null, [link.p]) }));
  define("Staunch Defender", onAttack((d, ctx) => up(d, ctx.p).length > 0, async (d, link) => { const z = t0(d, link); if (z) d.flags.xStaunch = { turn: d.turn, zone: z, p: link.p }; },
    { target: (d, link) => pickMon(d, link, "Which monster must they attack?", (z) => z.faceUp, [link.p]) }));
  define("Amazoness Archers", onAttack((d, ctx) => up(d, ctx.p).some((z) => has(z.card, "Amazoness")), async (d, link) => {
    for (const z of d.monsters(1 - link.p)) {
      if (!z.faceUp) { z.defense = false; await d.flipUp(z, "effect", true); } else if (z.defense) await d.changePosition(z, false);
      if (d.locate(z)) d.addTemp(z, { atk: -500 }, link.card);
    } }));
  define("Blast Held by a Tribute", onAttack((d, ctx, A) => (A.attacker.data.tributes || 0) > 0, async (d, link) => {
    if (await H.destroyAll(d, d.monsters(1 - link.p).filter((z) => z.faceUp && !z.defense))) await d.damage(1 - link.p, 1000, "effect"); }));
  define("Shift", { activate: { when: ["attack", "chain"],
    can: (d, ctx) => {
      if (ctx.last) { const z = oneMon(d, ctx.last); return ctx.last.p !== ctx.p && isST(ctx.last) && !!z && d.controllerOf(z) === ctx.p && retargets(d, ctx.last, [ctx.p]).length > 0; }
      const A = d.attack;
      return theirs(ctx) && !!A && !!A.target && d.controllerOf(A.target) === ctx.p && d.monsters(ctx.p).some((x) => x !== A.target && d.canBeAttacked(x, ctx.p, A.attacker)); },
    resolve: async (d, link) => {
      if (link.event && link.event.type === "attack") {
        const A = d.attack;
        if (!A || !A.target) return;
        const z = await d.pickZone(link.p, "Which monster do they attack instead?", (x, q) => q === link.p && x !== A.target && d.canBeAttacked(x, q, A.attacker), { sides: [link.p], area: "monster" });
        if (z) A.target = z;
        return;
      }
      const v = link.prev, opts = retargets(d, v, [link.p]);
      const z = opts.length ? await d.pickZone(link.p, "Which monster does " + d.name(v.card) + " target now?", (x) => opts.includes(x), { sides: [link.p] }) : null;
      if (z) v.targets = [z]; } } });
  // (continuous: an attack declared)
  const onDeclared = (fn) => async (d, z, p, ev) => { if (ev.type === "attack" && ev.p !== p && d.attack && d.locate(ev.attacker)) await fn(d, z, p, d.attack); };
  define("Jam Defender", stays({ onEvent: onDeclared(async (d, z, p, A) => {
    if (!A.target || d.controllerOf(A.target) !== p) return;
    const jams = d.monsters(p).filter((x) => isName(x.card, "Revival Jam") && x !== A.target);
    if (!jams.length || !(await d.yesNo(p, "Switch the attack to Revival Jam (Jam Defender)?"))) return;
    A.target = (jams.length > 1 && (await d.pickZone(p, "Which Revival Jam?", (x) => jams.includes(x), { sides: [p], area: "monster" }))) || jams[0]; }) }));
  // (not the Toon monsters' effect it was given with them: a Trap's)
  DM.EFFECTS[N("Toon Defense")] = stays({ onEvent: onDeclared(async (d, z, p, A) => {
    const t = A.target, e = t && DM.effectOf(t.card.no);
    if (!t || d.controllerOf(t) !== p || !t.faceUp || !e || !e.toon || d.stats(t).level > 4) return;
    if (await d.yesNo(p, "Make it a direct attack (Toon Defense)?")) A.target = null; }) });
  define("Ordeal of a Traveler", stays({ onEvent: onDeclared(async (d, z, p, A) => {
    const h = d.players[p].hand, q = 1 - p;
    if (!h.length) return;
    const c = h[Math.floor(d.rng() * h.length)];
    const o = await d.choose(q, "Call the type of a random card in their hand.", KINDS);
    await d.emit({ type: "reveal", p, card: c });
    if (!o || o.v !== kindOf(c)) { H.negateAttack(d); if (d.locate(A.attacker)) await d.toHand(A.attacker.card, "effect"); } }) }));
  define("Mirror Wall", stays({ aura: (d, src, sp, z) => ((src.data.walled || []).includes(z) ? { atkMult: 0.5 } : null),
    onEvent: onDeclared(async (d, z, p, A) => { (z.data.walled = z.data.walled || []).push(A.attacker); }), standby: payOrDestroy(2000) }));

  // ----- Answering a summon -----
  define("Horn of Heaven", { activate: { when: SUMMONS, can: (d, ctx) => { const z = summonOf(d, ctx.event); return !!z && d.monsters(ctx.p).some((x) => x !== z && !x.data.cannotTribute); },
    cost: async (d, link) => { const s = link.event && link.event.zone; const z = await d.pickZone(link.p, "Tribute which monster?", (x, q) => q === link.p && x !== s && !x.data.cannotTribute, { sides: [link.p], area: "monster", cancel: true });
      if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; },
    resolve: async (d, link) => { const z = summonOf(d, link.event); if (z) await d.destroy(z, "negated"); } } });
  define("Solemn Judgment", { activate: { when: SUMMONS.concat(["chain"]),
    can: (d, ctx) => d.players[ctx.p].lp > 1 && (ctx.last ? ctx.last.p !== ctx.p && isST(ctx.last) : !!summonOf(d, ctx.event)),
    cost: async (d, link) => { await d.payLp(link.p, Math.floor(d.players[link.p].lp / 2)); return true; },
    resolve: async (d, link) => { if (link.prev) return negateLink(d, link.prev); const z = summonOf(d, link.event); if (z) await d.destroy(z, "negated"); } } });
  define("Adhesion Trap Hole", onSummon((d, ev, p) => ev.p !== p && ev.zone.faceUp, async (d, link, z) => {
    const b = z.data.base && z.data.base.atk != null ? z.data.base.atk : z.card.token ? z.card.token.atk : C.atk(z.card.no);
    z.data.base = Object.assign({}, z.data.base, { atk: Math.floor(b / 2) }); }));
  define("Cloning", onSummon((d, ev, p) => ev.p !== p && ev.zone.faceUp && d.freeMonsterZone(p) >= 0, async (d, link, z) => {
    const tk = z.card.token, st = tk ? { atk: tk.atk, def: tk.def, level: tk.level, type: tk.type, attribute: tk.attribute }
      : { atk: C.atk(z.card.no), def: C.def(z.card.no), level: C.level(z.card.no), type: C.type(z.card.no), attribute: C.attribute(z.card.no) };
    const t = await d.summonToken(link.p, Object.assign({ name: "Clone Token" }, st));
    if (t) z.data.xClone = t; }, ["summoned", "flip-summoned"]));
  define("Pineapple Blast", { activate: { when: "summoned", can: (d, ctx) => ctx.event.p === ctx.p && d.monsters(1 - ctx.p).length > d.monsters(ctx.p).length,
    resolve: async (d, link) => {
      const q = 1 - link.p, k = d.monsters(q).length - d.monsters(link.p).length;
      if (k <= 0) return;
      await H.destroyAll(d, (await d.pickZones(q, "Destroy " + k + " of your monsters (Pineapple Blast).", (x, r) => r === q, { sides: [q], area: "monster", count: k })) || []); } } });

  // ----- Counter Traps -----
  define("Riryoku Field", counter((d, l) => isAct(l, "Spell") && !!oneMon(d, l)));
  define("Tutan Mask", counter((d, l) => { const z = oneMon(d, l); return isST(l) && !!z && H.isType(d, z, "Zombie"); }));
  define("Curse of Royal", counter((d, l) => isST(l) && /destroy/i.test(text(l.card)) && /\b(?:1|one)\b[^.;]*\b(?:Spell|Trap)/i.test(text(l.card))));
  define("Spell Shield Type-8", { activate: { when: "chain",
    can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && isAct(ctx.last, "Spell") && (!!oneMon(d, ctx.last) || handCount(d, ctx, (c) => C.isSpell(c.no)) > 0),
    cost: async (d, link) => !!oneMon(d, link.prev) || !!(await H.discardOne(d, link.p, "Send which Spell Card to the Graveyard?", (c) => C.isSpell(c.no))),
    resolve: async (d, link) => negateLink(d, link.prev) } });
  define("Magic Drain", { activate: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && isAct(ctx.last, "Spell"),
    resolve: async (d, link) => {
      const v = link.prev, q = v && v.p;
      if (!v) return;
      if (d.players[q].hand.some((c) => C.isSpell(c.no)) && (await d.yesNo(q, "Discard a Spell Card to negate Magic Drain?")) && (await H.discardOne(d, q, "Discard which Spell Card?", (c) => C.isSpell(c.no)))) return;
      await negateLink(d, v); } } });
  define("Judgment of Anubis", counter((d, l) => isAct(l, "Spell") && /destroy[^.]*?(?:Spell|Trap)/i.test(text(l.card)), discardOne(), async (d, link) => {
    const q = 1 - link.p;
    const z = up(d, q).length ? await d.pickZone(link.p, "Destroy a face-up monster of theirs (Judgment of Anubis)?", (x, r) => r === q && x.faceUp, { sides: [q], area: "monster", min: 0, cancel: true }) : null;
    if (!z) return;
    const a = d.atkOf(z);
    if (await d.destroy(z, "effect")) await d.damage(q, a, "effect"); }));
  define("Spell Vanishing", counter((d, l) => isAct(l, "Spell"), { can: (d, ctx) => handCount(d, ctx) >= 2,
    pay: async (d, link) => { for (let k = 0; k < 2; k++) if (!(await H.discardOne(d, link.p, "Discard 2 cards (Spell Vanishing)."))) return false; return true; } },
    async (d, link, v) => {
      const q = v.p, pl = d.players[q];
      await show(d, link.p, "Their hand:", pl.hand);
      for (const c of pl.hand.concat(pl.deck).filter((c) => c.no === v.card.no)) await d.sendToGrave(c, "effect");
      DM.shuffle(d, pl.deck); }));
  define("Cursed Seal of the Forbidden Spell", counter((d, l) => isAct(l, "Spell"), discardOne((c) => C.isSpell(c.no)), async (d, link, v) => {
    const f = d.players[v.p].flags; (f.xSealed = f.xSealed || []).push(v.card.no); }));
  define("Barrel Behind the Door", { activate: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && burnText(ctx.last),
    resolve: async (d, link) => { if (link.prev) link.prev.xRedirect = { from: link.p, to: 1 - link.p }; } } });
  define("Trap of Board Eraser", { activate: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && burnText(ctx.last),
    resolve: async (d, link) => { if (link.prev) link.prev.xRedirect = { from: link.p, to: null }; if (d.players[1 - link.p].hand.length) await H.discardOne(d, 1 - link.p, "Discard a card (Trap of Board Eraser)."); } } });

  // ----- Answering an activation -----
  define("Fairy's Hand Mirror", { activate: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && isAct(ctx.last, "Spell") && !!oneMon(d, ctx.last) && retargets(d, ctx.last).length > 0,
    resolve: async (d, link) => {
      const v = link.prev, opts = retargets(d, v);
      const z = opts.length ? await d.pickZone(link.p, "Which card does " + d.name(v.card) + " target now?", (x) => opts.includes(x)) : null;
      if (z) v.targets = [z]; } } });
  define("Mystical Refpanel", { activate: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && isAct(ctx.last, "Spell") && !ctx.last.targets.length && /inflict|damage|life points|\bLP\b|draw|discard|hand/i.test(text(ctx.last.card)),
    resolve: async (d, link) => { if (link.prev) link.prev.p = 1 - link.prev.p; } } });
  define("Dramatic Rescue", { activate: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.targets.some((z) => isMon(d, z) && z.faceUp && d.controllerOf(z) === ctx.p && has(z.card, "Amazoness")),
    resolve: async (d, link) => {
      const z = (link.prev ? link.prev.targets : []).find((x) => isMon(d, x) && x.faceUp && d.controllerOf(x) === link.p && has(x.card, "Amazoness"));
      if (!z) return;
      await d.toHand(z.card, "effect");
      const c = await d.pickCard(link.p, "Special Summon which monster from your hand?", d.players[link.p].hand, (x) => x !== z.card && isMonCard(x));
      if (c && H.canSummonHere(d, link.p)) await ss(d, link.p, c); } } });
  define("Big Burn", { activate: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && /(?:select|target|choose)[^.]*monster[^.]*graveyard|monster[^.]*(?:in|from) (?:your|either|their|the|both)[^.]*graveyard/i.test(text(ctx.last.card)),
    resolve: async (d) => { for (const q of [0, 1]) for (const c of d.players[q].grave.filter((c) => C.isMonster(c.no))) await d.banish(c, "effect"); } } });
  // (Fake Trap: kept on the field while the effect it answered resolves, destroyed in place of the Traps)
  define("Fake Trap", { activate: { when: "chain",
    can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && /destroy/i.test(text(ctx.last.card)) && H.st(d, ctx.p).some((z) => z !== ctx.zone && C.isTrap(z.card.no)),
    resolve: async (d, link) => {
      const v = link.prev, fz = link.zone;
      if (!v || !fz || !d.locate(fz)) return;
      link.stays = true;
      const g = { test: (d2, z, l) => !v.negated && d2.xLinks.includes(v) && l.p === link.p && l.i >= 5 && z !== fz && C.isTrap(z.card.no),
        instead: async (d2) => { if (d2.locate(fz)) await d2.destroy(fz, "effect"); } };
      d.xGuards.push(g);
      const done = async (d2) => { const k = d2.xGuards.indexOf(g); if (k >= 0) d2.xGuards.splice(k, 1); if (d2.locate(fz)) await d2.sendToGrave(fz.card, "used"); };
      const r0 = v.resolve;
      v.resolve = async (d2, l2) => { try { await r0(d2, l2); } finally { await done(d2); } };
      watch(d, async (d2, ev) => { if ((ev.type === "resolve" && ev.link !== v && ev.link !== link) || ev.type === "phase") { await done(d2); return true; } }); } } });
  // (negated for the turn: Metal Detector, Mystic Probe, World Suppression)
  const negateKind = (test, all) => ({ activate: { when: "chain", can: (d, ctx) => !!ctx.last && isST(ctx.last) && test(ctx.last.card.no),
    resolve: async (d, link) => {
      const v = link.prev;
      if (!v) return;
      v.resolve = async () => {};
      negateTurn(d, all ? H.st(d).filter((z) => z.faceUp && test(z.card.no)).concat([v.zone]) : [v.zone]);
      if (all) d.xNegRules.push({ turn: d.turn, test: (c) => !!c && !c.token && test(c.no) }); } } });
  define("Metal Detector", negateKind((no) => C.isTrap(no) && C.icon(no) === ICON.CONTINUOUS, true));
  define("Mystic Probe", negateKind((no) => C.isSpell(no) && C.icon(no) === ICON.CONTINUOUS, true));
  define("World Suppression", negateKind((no) => C.isSpell(no) && C.icon(no) === ICON.FIELD, false));
  define("Armored Glass", { activate: { when: "equipped", resolve: async (d) => { d.flags.xEquipsOff = d.turn; negateTurn(d, H.st(d).filter((z) => z.equippedTo)); } } });

  // ----- When a card leaves the field -----
  define("Time Machine", { activate: { when: "battle-destroyed", can: (d, ctx) => inGrave(d, ctx.event.card) && H.canSummonHere(d, ctx.event.p),
    resolve: async (d, link) => { const ev = link.event, c = ev.card, w = c.xDied || {}; if (inGrave(d, c) && H.canSummonHere(d, ev.p)) await d.specialSummon(ev.p, c, { how: "special", defense: !!w.defense }); } } });
  define("Rope of Life", { activate: { when: "battle-destroyed", can: (d, ctx) => ctx.event.card.owner === ctx.p && inGrave(d, ctx.event.card) && d.players[ctx.p].hand.length > 0 && H.canSummonHere(d, ctx.p),
    cost: async (d, link) => { for (const c of d.players[link.p].hand.slice()) await d.discard(link.p, c, "cost"); return true; },
    resolve: async (d, link) => { const c = link.event.card; if (!inGrave(d, c)) return; const z = await ss(d, link.p, c); if (z) z.links.push({ kind: "self", stats: { atk: 800 } }); } } });
  const lostST = (kind) => ({ activate: { when: "destroyed",
    can: (d, ctx) => { const c = ctx.event.card; return ctx.event.p === ctx.p && !!c && !c.token && C["is" + kind](c.no) && c.xBy === 1 - ctx.p && inGrave(d, c) && H.st(d).some((z) => z !== ctx.zone); },
    target: (d, link) => H.target(d, link, "Destroy which Spell or Trap Card?", (z, q, i) => i >= 5 && z !== link.zone, { area: "spell" }),
    resolve: async (d, link) => { const z = t0(d, link); if (z) await d.destroy(z, "effect"); } } });
  define("Driving Snow", lostST("Trap"));
  define("Gust", lostST("Spell"));
  define("Major Riot", { activate: { when: "monster-returned", can: (d, ctx) => ctx.event.p === ctx.p && ctx.event.by !== ctx.p, resolve: async (d) => {
    const n = [0, 0];
    for (const q of [0, 1]) for (const z of d.monsters(q).slice()) if (d.locate(z)) { n[q]++; await d.toHand(z.card, "effect"); }
    for (const q of [0, 1]) {
      if (!n[q]) continue;
      const cs = await d.pickCards(q, "Special Summon " + n[q] + " monster(s) from your hand face-down.", d.players[q].hand, isMonCard, { count: n[q] });
      for (const c of cs || []) { if (d.freeMonsterZone(q) < 0) break; await d.specialSummon(q, c, { faceUp: false, defense: true }); }
    } } } });
  define("Dark Coffin", { activate: { can: () => false, resolve: async () => {} }, onToGrave: async (d, c, p, from, why) => {
    if (!from || !from.z || from.z.faceUp || why !== "destroyed") return;
    const q = 1 - p;
    const o = await d.choose(q, "Dark Coffin:", [d.players[q].hand.length && { label: "Discard 1 random card", v: 0 }, d.monsters(q).length && { label: "Destroy 1 of your monsters", v: 1 }].filter(Boolean));
    if (!o) return;
    if (o.v === 0) await H.discardRandom(d, q);
    else { const z = await d.pickZone(q, "Destroy which of your monsters?", (x, r) => r === q, { sides: [q], area: "monster" }); if (z) await d.destroy(z, "effect"); } } });

  // ----- Hands and draws -----
  define("Appropriate", { activate: { when: "drew-outside", can: (d, ctx) => ctx.event.p !== ctx.p, resolve: async () => {} },
    onEvent: async (d, z, p, ev) => { if (ev.type === "drew-outside" && ev.p !== p) await d.drawCards(p, 2); } });
  define("Forced Requisition", { activate: { when: "discarded", can: (d, ctx) => ctx.event.p === ctx.p, resolve: async () => {} },
    onEvent: async (d, z, p, ev) => { if (ev.type === "discarded" && ev.p === p && d.players[1 - p].hand.length) await H.discardOne(d, 1 - p, "Discard a card (Forced Requisition)."); } });
  define("Drop Off", { activate: { when: "drew", can: (d, ctx) => ctx.event.p !== ctx.p && ctx.event.drawPhase && d.players[ctx.event.p].hand.includes(ctx.event.card),
    resolve: async (d, link) => { const c = link.event.card, q = link.event.p; if (d.players[q].hand.includes(c)) await d.discard(q, c, "effect"); } } });
  define("Graverobber", { activate: { can: (d, ctx) => d.players[1 - ctx.p].grave.some((c) => C.isSpell(c.no)), resolve: async (d, link) => {
    const p = link.p, t = d.turn, c = await d.pickCard(p, "Take which Spell Card from their Graveyard?", d.players[1 - p].grave, (x) => C.isSpell(x.no));
    if (!c) return;
    d.take(c); d.players[p].hand.push(c);
    await d.emit({ type: "to-hand", card: c, from: { pile: "grave", p: 1 - p }, why: "effect" });
    watch(d, async (d2, ev) => {
      if (ev.type === "activate" && ev.card === c) { await d2.damage(p, 2000, "effect"); return true; }
      if (ev.type === "phase" && ev.phase === "end" && d2.turn === t && d2.players[p].hand.includes(c)) { d2.take(c); d2.toPile(c, "grave"); await d2.emit({ type: "to-grave", card: c, why: "effect" }); return true; } }); } } });
  define("Lightforce Sword", { activate: { can: (d, ctx) => d.players[1 - ctx.p].hand.length > 0, resolve: async (d, link) => {
    const q = 1 - link.p, h = d.players[q].hand;
    if (!h.length) return;
    const c = h[Math.floor(d.rng() * h.length)], clock = d.flags.xClock || 0;
    await d.banish(c, "effect");
    let n = 0;
    watch(d, async (d2, ev) => {
      if (ev.type !== "phase" || ev.phase !== "standby" || d2.turnPlayer !== q || ++n + (d2.flags.xClock || 0) - clock < 4) return;
      if (d2.players[c.owner].banished.includes(c)) await d2.toHand(c, "effect");
      return true; }); } } });
  define("Trap Dustshoot", { activate: { can: (d, ctx) => d.players[1 - ctx.p].hand.length >= 4, resolve: async (d, link) => {
    const h = d.players[1 - link.p].hand;
    if (!h.some(isMonCard)) return show(d, link.p, "Their hand:", h);
    const c = await d.pickCard(link.p, "Return which Monster Card to their Deck?", h, (x) => C.isMonster(x.no));
    if (c) { await d.toDeck(c, "shuffle"); DM.shuffle(d, d.players[1 - link.p].deck); } } } });
  define("Disturbance Strategy", { activate: { can: (d, ctx) => d.players[1 - ctx.p].hand.length > 0, resolve: async (d, link) => {
    const q = 1 - link.p, n = d.players[q].hand.length;
    for (const c of d.players[q].hand.slice()) await d.toDeck(c, "shuffle");
    DM.shuffle(d, d.players[q].deck); await d.drawCards(q, n); } } });
  define("Bubble Crash", { activate: { can: (d) => [0, 1].some((q) => d.players[q].hand.length + d.allZones(q).length >= 6), resolve: async (d) => {
    for (const q of [d.turnPlayer, 1 - d.turnPlayer]) {
      const cards = d.players[q].hand.concat(d.allZones(q).map((z) => z.card)), k = cards.length - 5;
      if (k <= 0) continue;
      const cs = await d.pickCards(q, "Send " + k + " cards from your hand and field to the Graveyard.", cards, null, { count: k });
      for (const c of cs || []) if (d.players[q].hand.includes(c) || d.zoneOf(c)) await d.sendToGrave(c, "effect");
    } } } });
  define("Pharaoh's Treasure", { activate: { resolve: async (d, link) => { if (!link.zone || !d.locate(link.zone)) return; link.card.xTreasure = true; await d.toDeck(link.card, "shuffle"); } } });
  define("Crush Card Virus", { activate: { can: (d, ctx) => d.monsters(ctx.p).some((z) => H.attrOf(d, z) === ATTR.DARK && d.atkOf(z) <= 1000),
    cost: async (d, link) => {
      const z = await d.pickZone(link.p, "Tribute which DARK monster with 1000 or less ATK?", (x, q) => q === link.p && H.attrOf(d, x) === ATTR.DARK && d.atkOf(x) <= 1000, { sides: [link.p], area: "monster", cancel: true });
      if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; },
    resolve: async (d, link) => {
      const q = 1 - link.p, pl = d.players[q];
      pl.flags.xNoDamage = d.turn + 1;
      await show(d, link.p, "Their hand and monsters:", pl.hand.concat(d.monsters(q).map((z) => z.card)));
      for (const c of pl.hand.filter((c) => C.isMonster(c.no) && C.atk(c.no) >= 1500)) await d.sendToGrave(c, "destroyed");
      await H.destroyAll(d, d.monsters(q).filter((z) => d.atkOf(z) >= 1500));
      const cs = await d.pickCards(q, "Destroy up to 3 monsters with 1500 or more ATK in your Deck?", pl.deck, (c) => C.isMonster(c.no) && C.atk(c.no) >= 1500, { count: 3, min: 0 });
      for (const c of cs || []) await d.sendToGrave(c, "destroyed");
      DM.shuffle(d, pl.deck); } } });
  define("Arsenal Robber", { activate: { resolve: async (d, link) => {
    const q = 1 - link.p, c = await d.pickCard(q, "Send which Equip Spell Card from your Deck to the Graveyard?", d.players[q].deck, (x) => C.isSpell(x.no) && C.icon(x.no) === ICON.EQUIP);
    if (c) await d.sendToGrave(c, "effect"); DM.shuffle(d, d.players[q].deck); } } });
  define("Virus Cannon", { activate: { can: (d, ctx) => d.monsters(ctx.p).some((z) => !z.card.token && !z.data.cannotTribute),
    cost: async (d, link) => {
      const zs = await d.pickZones(link.p, "Tribute any number of monsters.", (x, q) => q === link.p && !x.card.token && !x.data.cannotTribute, { sides: [link.p], area: "monster", count: 5, min: 1, cancel: true });
      if (!zs || !zs.length) return false;
      for (const z of zs) await d.sendToGrave(z.card, "tribute");
      link.data.n = zs.length; return true; },
    resolve: async (d, link) => {
      const q = 1 - link.p, cs = await d.pickCards(q, "Send " + link.data.n + " Spell Cards from your Deck to the Graveyard.", d.players[q].deck, (c) => C.isSpell(c.no), { count: link.data.n });
      for (const c of cs || []) await d.sendToGrave(c, "effect"); DM.shuffle(d, d.players[q].deck); } } });

  // ----- Destruction -----
  define("Two-Pronged Attack", { activate: { can: (d, ctx) => d.monsters(ctx.p).length >= 2 && d.monsters(1 - ctx.p).length > 0,
    target: async (d, link) => {
      const mine2 = await d.pickZones(link.p, "Destroy which 2 of your monsters?", (z, q) => q === link.p, { sides: [link.p], area: "monster", count: 2 });
      const t = await d.pickZone(link.p, "Destroy which of their monsters?", (z, q) => q !== link.p, { sides: [1 - link.p], area: "monster" });
      if (!mine2 || mine2.length < 2 || !t) return false;
      link.targets = mine2.concat([t]); return true; },
    resolve: async (d, link) => H.destroyAll(d, link.targets.filter((z) => d.locate(z))) } });
  define("Acid Trap Hole", { activate: { can: (d) => mons(d).some((z) => !z.faceUp && z.defense), target: (d, link) => pickMon(d, link, "Flip which face-down monster?", (z) => !z.faceUp && z.defense),
    resolve: async (d, link) => {
      const z = t0(d, link);
      if (!z || z.faceUp) return;
      await d.flipUp(z, "effect");
      if (!d.locate(z)) return;
      if (d.defOf(z) <= 2000) await d.destroy(z, "effect"); else await d.flipDown(z); } } });
  define("Earthshaker", { activate: { can: (d) => up(d).length > 0, resolve: async (d, link) => {
    const a = await d.choose(link.p, "Select an Attribute.", ATTRS());
    const b = a && (await d.choose(link.p, "Select a second Attribute.", ATTRS().filter((x) => x.v !== a.v)));
    if (!a || !b) return;
    const o = (await d.choose(1 - link.p, "Destroy all face-up monsters of which Attribute?", [a, b])) || a;
    await H.destroyAll(d, up(d).filter((z) => H.attrOf(d, z) === o.v)); } } });
  define("Needle Ceiling", { activate: { can: (d) => mons(d).length >= 4, resolve: async (d) => H.destroyAll(d, up(d)) } });
  define("Blast with Chain", { activate: { stays: true, can: (d, ctx) => up(d, ctx.p).length > 0, target: (d, link) => pickMon(d, link, "Equip Blast with Chain to which monster?", (z) => z.faceUp, [link.p]),
    resolve: async (d, link) => {
      const t = t0(d, link);
      if (!t || !t.faceUp || !link.zone || !d.locate(link.zone)) { if (link.zone) link.zone.data.discard = true; return; }
      d.equip(link.zone, t, { atk: 500 }); await d.event({ type: "equipped", p: link.p, card: link.card, zone: t }); } },
    onDestroyed: async (d, z, p, why) => {
      if (why === "battle" || !z.equippedTo) return;
      const t = await d.pickZone(p, "Destroy which card (Blast with Chain)?", () => true);
      if (t) await d.destroy(t, "effect"); } });
  define("Skull Lair", stays({ ignition: { repeatable: true,
    can: (d, ctx) => up(d).some((z) => d.stats(z).level > 0 && H.graveMon(d, ctx.p).length >= d.stats(z).level),
    target: async (d, link) => {
      if (!(await pickMon(d, link, "Destroy which face-up monster?", (z) => z.faceUp && d.stats(z).level > 0 && H.graveMon(d, link.p).length >= d.stats(z).level))) return false;
      const n = d.stats(link.targets[0]).level;
      const cs = await d.pickCards(link.p, "Remove " + n + " monsters in your Graveyard from play.", H.graveMon(d, link.p), null, { count: n });
      if (!cs || cs.length < n) return false;
      for (const c of cs) await d.banish(c, "cost");
      return true; },
    resolve: async (d, link) => { const z = t0(d, link); if (z && z.faceUp) await d.destroy(z, "effect"); } } }));
  define("Type Zero Magic Crusher", stays({ ignition: { repeatable: true, can: (d, ctx) => d.players[ctx.p].hand.some((c) => C.isSpell(c.no)),
    cost: discardCost((c) => C.isSpell(c.no), "Discard which Spell Card?"), resolve: async (d, link) => d.damage(1 - link.p, 500, "effect") } }));
  define("Infinite Dismissal", stays({ endPhase: async (d) => H.destroyAll(d, up(d).filter((z) => d.stats(z).level <= 3 && ((z.summonedBy === "normal" && z.placedTurn === d.turn) || z.data.xFlipTurn === d.turn))) }));
  define("Goblin Fan", stays({ xGoblinFan: true }));

  // ----- Positions -----
  const jar = async (d, src) => { for (const z of up(d).filter((x) => H.isType(d, x, "Dragon"))) { if (!z.defense) await d.changePosition(z, true); if (d.locate(z)) z.data.positionLocked = src; } };
  define("Dragon Capture Jar", { activate: { resolve: async (d, link) => jar(d, link.zone) },
    onEvent: async (d, z, p, ev) => { if (/summoned|position|flip|attack/.test(ev.type)) await jar(d, z); },
    onLeave: async (d, z) => { for (const m of mons(d)) if (m.data.positionLocked === z) m.data.positionLocked = null; } });
  define("Windstorm of Etaqua", { activate: { can: (d, ctx) => up(d, 1 - ctx.p).length > 0, resolve: async (d, link) => { for (const z of up(d, 1 - link.p)) await d.changePosition(z, !z.defense); } } });
  define("Ready for Intercepting", { activate: { can: (d) => up(d).some((z) => H.isType(d, z, "Warrior") || H.isType(d, z, "Spellcaster")),
    target: (d, link) => pickMon(d, link, "Turn which Warrior or Spellcaster face-down?", (z) => H.isType(d, z, "Warrior") || H.isType(d, z, "Spellcaster")),
    resolve: async (d, link) => { const z = t0(d, link); if (z && z.faceUp) { d.temp = d.temp.filter((t) => t.zone !== z); await d.flipDown(z); } } } });

  // ----- Stats and monsters -----
  define("Reverse Trap", { activate: { resolve: async (d) => { d.flags.xReverse = d.turn; } } });
  define("Energy Drain", { activate: { can: (d, ctx) => up(d, ctx.p).length > 0, target: (d, link) => pickMon(d, link, "Give which of your monsters more ATK and DEF?", (z) => z.faceUp, [link.p]),
    resolve: async (d, link) => { const z = t0(d, link), n = 200 * d.players[1 - link.p].hand.length; if (z && z.faceUp && n) d.addTemp(z, { atk: n, def: n }, link.card); } } });
  define("D. Tribe", { activate: { can: (d, ctx) => d.monsters(ctx.p).length > 0, resolve: async (d, link) => { for (const z of d.monsters(link.p)) d.addTemp(z, { type: typeNo("Dragon") }, link.card); } } });
  define("Collected Power", { activate: { can: (d) => up(d).length > 0 && H.st(d).some((z) => z.equippedTo), target: (d, link) => pickMon(d, link, "Equip all the Equip Cards to which monster?", (z) => z.faceUp),
    resolve: async (d, link) => {
      const t = t0(d, link);
      if (!t || !t.faceUp) return;
      for (const eq of H.st(d).filter((z) => z.equippedTo && z.equippedTo !== t)) {
        const old = eq.equippedTo, l = old.links.find((k) => k.from === eq);
        if (eq.data.union && (!unionFits(d, eq.card, t) || d.controllerOf(t) !== d.controllerOf(eq))) { await d.destroy(eq, "effect"); continue; }
        old.links = old.links.filter((k) => k.from !== eq);
        eq.equippedTo = t; t.links.push(l || { from: eq, kind: "equip" });
        await d.emit({ type: "equip", card: eq.card, to: t });
      } } } });
  const unions = (d, p) => ({ on: d.monsters(p).filter((z) => z.faceUp && unionTargets(z.card) && DM.effectOf(z.card.no) && DM.effectOf(z.card.no).ignition && d.freeSpellZone(p) >= 0 && d.monsters(p).some((x) => x !== z && unionFits(d, z.card, x))),
    off: H.st(d, p).filter((z) => z.data.union && z.equippedTo && DM.effectOf(z.card.no) && DM.effectOf(z.card.no).ignition) });
  define("Formation Union", { activate: {
    can: (d, ctx) => unions(d, ctx.p).on.length > 0 || (unions(d, ctx.p).off.length > 0 && H.canSummonHere(d, ctx.p)),
    resolve: async (d, link) => {
      const u = unions(d, link.p);
      const o = await d.choose(link.p, "Formation Union:", [u.on.length && { label: "Equip a Union Monster to a monster", v: "on" }, u.off.length && H.canSummonHere(d, link.p) && { label: "Unequip a Union Monster and Special Summon it", v: "off" }].filter(Boolean));
      if (!o) return;
      const z = await d.pickZone(link.p, "Which Union Monster?", (x) => u[o.v].includes(x), { sides: [link.p] });
      const e = z && DM.effectOf(z.card.no);
      if (e && e.ignition) await e.ignition.resolve(d, { p: link.p, card: z.card, zone: z, data: {}, targets: [] }); } } });
  define("Physical Double", { activate: { can: (d, ctx) => d.turnPlayer !== ctx.p && up(d, 1 - ctx.p).length > 0 && d.freeMonsterZone(ctx.p) >= 0,
    target: (d, link) => pickMon(d, link, "Copy which of their monsters?", (z) => z.faceUp, [1 - link.p]),
    resolve: async (d, link) => {
      const z = t0(d, link);
      if (!z || !z.faceUp) return;
      const s = d.stats(z), t = await d.summonToken(link.p, { name: "Mirage Token", atk: s.atk, def: s.def, level: s.level, type: s.type, attribute: s.attribute });
      if (t) t.data.destroyAtEnd = d.turn; } } });
  define("Interdimensional Matter Transporter", { activate: { can: (d, ctx) => up(d, ctx.p).length > 0, target: (d, link) => pickMon(d, link, "Remove which of your monsters from play?", (z) => z.faceUp, [link.p]),
    resolve: async (d, link) => {
      const z = t0(d, link);
      if (!z) return;
      const c = z.card, def = z.defense, p = link.p;
      await d.banish(c, "effect");
      if (c.token) return;
      atPhase(d, "end", async (d2) => {
        if (!d2.players[c.owner].banished.includes(c)) return;
        if (d2.freeMonsterZone(p) >= 0) await d2.placeMonster(p, c, { how: "special", defense: def }); else await d2.sendToGrave(c, "effect"); }, d.turn); } } });
  const arch = (c) => has(c, "Archfiend");
  define("Archfiend's Roar", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 500 && H.canSummonHere(d, ctx.p) && H.graveMon(d, ctx.p, arch).length > 0, cost: pay(500),
    target: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Archfiend?", H.graveMon(d, link.p, arch)); if (!c) return false; link.data.c = c; return true; },
    resolve: async (d, link) => { const c = link.data.c; if (!c || !inGrave(d, c)) return; const z = await ss(d, link.p, c); if (z) { z.data.cannotTribute = true; z.data.destroyAtEnd = d.turn; } } } });
  define("Rite of Spirit", { activate: { can: (d, ctx) => H.canSummonHere(d, ctx.p) && H.graveMon(d, ctx.p, (c) => has(c, "Gravekeeper's")).length > 0,
    target: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Gravekeeper's monster?", H.graveMon(d, link.p, (c) => has(c, "Gravekeeper's"))); if (!c) return false; link.data.c = c; return true; },
    resolve: async (d, link) => { const c = link.data.c; if (c && inGrave(d, c)) await ss(d, link.p, c); } } });
  define("Dark Scorpion Combination", { activate: {
    can: (d, ctx) => ["Don Zaloog", "Dark Scorpion - Cliff the Trap Remover", "Dark Scorpion - Chick the Yellow", "Dark Scorpion - Gorg the Strong", "Dark Scorpion - Meanae the Thorn"].every((n) => up(d, ctx.p).some((z) => isName(z.card, n))),
    resolve: async (d, link) => { for (const z of up(d, link.p).filter((x) => isName(x.card, "Don Zaloog") || has(x.card, "Dark Scorpion - "))) { z.data.directTurn = d.turn; z.data.xScorpion = d.turn; } } } });
  define("A Feint Plan", { activate: { resolve: async (d) => { d.flags.xFeint = d.turn; } } });
  define("Dice Re-Roll", { activate: { can: (d) => !(d.flags.xReroll && d.flags.xReroll.turn === d.turn), resolve: async (d, link) => { d.flags.xReroll = { p: link.p, turn: d.turn, used: false }; } } });
  // (the turn count forward: what counts turns, a turn on)
  define("Pyro Clock of Destiny", { activate: { resolve: async (d) => {
    d.flags.xClock = (d.flags.xClock || 0) + 1;
    for (const pl of d.players) if (pl.flags.countdown) pl.flags.countdown--;
    for (const z of H.st(d)) { if (z.data.turnsLeft) z.data.turnsLeft--; if (isName(z.card, "Nightmare's Steelcage")) z.data.n = (z.data.n || 0) + 1; } } } });
  define("Judgment of the Pharaoh", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 1 && d.players[ctx.p].grave.some((c) => isName(c, ["Yu-Jo Friendship", "Unity"])),
    cost: async (d, link) => { await d.payLp(link.p, Math.floor(d.players[link.p].lp / 2)); return true; },
    resolve: async (d, link) => {
      const g = d.players[link.p].grave, q = 1 - link.p, f = d.players[q].flags;
      const o = await d.choose(link.p, "Judgment of the Pharaoh:", [g.some((c) => isName(c, "Yu-Jo Friendship")) && { label: "No summons or monster effects for them this turn", v: 0 },
        g.some((c) => isName(c, "Unity")) && { label: "Their Spells and Traps negated this turn", v: 1 }].filter(Boolean));
      if (!o) return;
      if (o.v === 0) { f.noSummonTurn = f.xNoSummon = f.xNoMonEff = d.turn; } else { negateTurn(d, H.st(d, q).filter((z) => z.faceUp)); f.xNoST = d.turn; } } } });
  define("Last Turn", { activate: { can: (d, ctx) => d.turnPlayer !== ctx.p && d.players[ctx.p].lp <= 1000 && d.monsters(ctx.p).length > 0,
    target: (d, link) => pickMon(d, link, "Keep which of your monsters?", null, [link.p]),
    resolve: async (d, link) => {
      const m = t0(d, link), p = link.p, q = 1 - p;
      if (!m) return;
      for (const r of [0, 1]) {
        for (const z of d.allZones(r).slice()) if (z !== m && z !== link.zone && d.locate(z)) await d.sendToGrave(z.card, "effect");
        for (const c of d.players[r].hand.slice()) await d.sendToGrave(c, "effect");
      }
      if (!d.locate(m)) return;
      const c = await d.pickCard(q, "Special Summon which monster from your Deck?", H.deckMon(d, q));
      const z = c ? await d.specialSummon(q, c, { how: "special", defense: false }) : null;
      DM.shuffle(d, d.players[q].deck);
      d.players[0].flags.waboku = d.players[1].flags.waboku = d.turn;
      atPhase(d, "end", async (d2) => {
        const all = mons(d2), w = all.length === 1 ? d2.controllerOf(all[0]) : -1;
        if (w >= 0) d2.players[w].flags.specialWin = "last-turn"; else for (const r of [0, 1]) d2.players[r].flags.specialWin = "draw";
        d2.checkWin(); }, d.turn);
      if (z && d.locate(m)) { if (d.attack) d.xQueue.push({ p: q, att: z, target: m }); else await d.attackWith(q, z, m); } } } });
  define("Nutrient Z", { activate: { when: "damage-step", can: (d, ctx) => ctx.event.p === ctx.p && ctx.event.amount >= 2000, resolve: async (d, link) => d.heal(link.p, 4000) } });

  // ----- Continuous Traps -----
  define("Call of Darkness", stays({ forbids: (d, z, r, p, c) => isName(c, "Monster Reborn"),
    onEvent: async (d) => { for (const m of mons(d).filter((x) => x.data.monsterReborn)) if (d.locate(m)) await d.sendToGrave(m.card, "effect"); } }));
  define("Ultimate Offering", reuse({ can: (d, ctx) => d.phase === "battle" && d.turnPlayer !== ctx.p && d.players[ctx.p].lp > 500 && normalable(d, ctx.p).length > 0, cost: pay(500), resolve: (d, link) => extraNormal(d, link.p) },
    { ignition: { repeatable: true, can: (d, ctx) => mine(d, ctx) && !!ctx.zone.data.on && d.players[ctx.p].lp > 500 && normalable(d, ctx.p).length > 0, cost: pay(500), resolve: (d, link) => extraNormal(d, link.p) } }));
  define("Royal Oppression", reuse({
    can: (d, ctx) => d.players[ctx.p].lp > 800 && (ctx.last ? ctx.last.zone !== ctx.zone && /special summon/i.test(text(ctx.last.card)) : !!summonOf(d, ctx.event) && ctx.event.type === "special-summoned"),
    cost: pay(800), resolve: async (d, link) => { if (link.prev) return negateLink(d, link.prev); const z = summonOf(d, link.event); if (z) await d.destroy(z, "negated"); } }));
  define("The Dragon's Bead", reuse({ can: (d, ctx) => { const z = oneMon(d, ctx.last); return !!ctx.last && isAct(ctx.last, "Trap") && !!z && z.faceUp && H.isType(d, z, "Dragon") && handCount(d, ctx) > 0; },
    cost: discardCost(), resolve: async (d, link) => negateLink(d, link.prev) }));
  define("The Eye of Truth", stays({ revealsHands: "theirs", standby: async (d, z, p) => { const q = 1 - p; if (d.turnPlayer === q && d.players[q].hand.some((c) => C.isSpell(c.no))) await d.heal(q, 1000); } }));
  define("The Regulation of Tribe", { activate: { resolve: async (d, link) => { const o = await d.choose(link.p, "Declare a Type.", DM.TYPESLIST()); if (o && link.zone) link.zone.data.type = o.value; } },
    noAttack: (d, s, q, ap, att) => !!s.data.type && H.isType(d, att, s.data.type),
    standby: async (d, z, p) => {
      if (d.turnPlayer !== p) return;
      const t = d.monsters(p).some((x) => !x.data.cannotTribute) ? await d.pickZone(p, "Tribute a monster to keep The Regulation of Tribe?", (x, q) => q === p && !x.data.cannotTribute, { sides: [p], area: "monster", min: 0, cancel: true }) : null;
      if (t) await d.sendToGrave(t.card, "tribute"); else await d.destroy(z, "cost"); } });
  define("Anti-Spell Fragrance", stays({ forbids: (d, z, r, p, c) => { if (!C.isSpell(c.no)) return false; const l = d.zoneOf(c); return !l || (!l.z.faceUp && d.turn - l.z.placedTurn < 2); } }));
  define("Tornado Wall", { activate: { can: (d) => umi(d), resolve: async () => {} }, noBattleDamageFor: (d, s, r) => d.turnPlayer !== r && umi(d),
    onEvent: async (d, z) => { if (!umi(d) && d.locate(z)) await d.destroy(z, "effect"); } });
  define("The Emperor's Holiday", { activate: { resolve: async (d) => { d.flags.xHoliday = true; } }, negatesEquips: true });
  define("Life Absorbing Machine", stays({ standby: async (d, z, p) => { if (d.turnPlayer !== p) return; const n = Math.floor(((d.players[p].xPaid || {})[d.turn - 2] || 0) / 2); if (n) await d.heal(p, n); } }));
  define("Soul Demolition", stays({ ignition: { repeatable: true,
    can: (d, ctx) => up(d, ctx.p).some((z) => H.isType(d, z, "Fiend")) && d.players[ctx.p].lp > 500 && (H.graveMon(d, 0).length + H.graveMon(d, 1).length) > 0, cost: pay(500),
    resolve: async (d, link) => {
      for (const [r, q] of [[link.p, 1 - link.p], [1 - link.p, link.p]]) { const c = await d.pickCard(r, "Remove which monster in your opponent's Graveyard from play?", H.graveMon(d, q)); if (c) await d.banish(c, "effect"); } } } }));
  define("Bad Reaction to Simochi", stays({ xSimochi: true }));
  define("Ominous Fortunetelling", stays({ standby: async (d, z, p) => {
    const h = d.players[1 - p].hand;
    if (d.turnPlayer !== p || !h.length) return;
    const c = h[Math.floor(d.rng() * h.length)], o = await d.choose(p, "Call the type of a random card in their hand.", KINDS);
    await d.emit({ type: "reveal", p: 1 - p, card: c });
    if (o && o.v === kindOf(c)) await d.damage(1 - p, 700, "effect"); } }));
  define("Spirit's Invitation", stays({ standby: payOrDestroy(500), onEvent: async (d, z, p, ev) => {
    const e = ev.type === "returned" && ev.p === p && ev.card && DM.effectOf(ev.card.no);
    if (!e || !e.spirit || !d.monsters(1 - p).length) return;
    const t = await d.pickZone(p, "Return which of their monsters to its owner's hand?", (x, q) => q !== p, { sides: [1 - p], area: "monster" });
    if (t) await d.toHand(t.card, "effect"); } }));
  define("Narrow Pass", { activate: { can: (d) => d.monsters(0).length <= 2 && d.monsters(1).length <= 2, resolve: async (d, link) => { if (link.zone) link.zone.data.np = [0, 0]; } },
    onEvent: async (d, z, p, ev) => {
      const n = z.data.np;
      if (!n || !(ev.type === "summoned" || ev.type === "set") || !ev.zone) return;
      if (++n[ev.p] >= 2 && !d.players[ev.p].flags.noNormalSummon) { d.players[ev.p].flags.noNormalSummon = true; (z.data.npSet = z.data.npSet || []).push(ev.p); } },
    onLeave: async (d, z) => { for (const q of z.data.npSet || []) d.players[q].flags.noNormalSummon = false; } });
  async function warlords(d, q, keep) {
    const zs = up(d, q), types = [...new Set(zs.map((z) => d.stats(z).type))];
    if (types.length < 2) return;
    let t = keep;
    if (t == null || !types.includes(t)) { const o = await d.choose(q, "Keep which Type of monster?", types.map((x) => ({ label: window.YUGIOH_CARDS.types[x] || "?", v: x }))); t = o ? o.v : types[0]; }
    for (const z of zs) if (d.stats(z).type !== t && d.locate(z)) await d.sendToGrave(z.card, "effect");
  }
  define("Rivalry of Warlords", { activate: { resolve: async (d) => { for (const q of [d.turnPlayer, 1 - d.turnPlayer]) await warlords(d, q); } },
    onEvent: async (d, z, p, ev) => {
      const s = summonOf(d, ev);
      if (!s || !s.faceUp) return;
      const q = d.controllerOf(s), rest = up(d, q).filter((x) => x !== s);
      if (rest.length) await warlords(d, q, d.stats(rest[0]).type); } });
  async function brainwash(d) { for (const q of [0, 1]) for (const z of d.monsters(q).slice()) if (d.locate(z) && z.card.owner !== q) { z.data.returnAtEnd = null; await d.takeControl(z, z.card.owner); } }
  define("Remove Brainwashing", { activate: { resolve: async (d) => brainwash(d) }, xNoSteal: true, onEvent: async (d) => brainwash(d) });
  define("Skill Drain", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 1000, cost: pay(1000), resolve: async (d) => drain(d) }, xSkillDrain: true, negatesFlips: true,
    onEvent: async (d) => drain(d), onLeave: async (d, z) => { for (const m of z.data.drained || []) if (d.locate(m)) m.negated = false; } });
  define("Battle-Scarred", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => arch(z.card)), target: (d, link) => pickMon(d, link, "Choose which Archfiend?", (z) => z.faceUp && arch(z.card), [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (!z || !link.zone) { if (link.zone) link.zone.data.discard = true; return; } link.zone.data.boundTo = z; link.zone.data.scarred = z; } },
    standby: async (d, z, p) => {
      const m = z.data.scarred, k = m && /pays? (\d+) Life Points during each of/i.exec(text(m.card));
      if (d.turnPlayer === p && m && d.locate(m) && k) await d.payLp(1 - p, +k[1]); },
    onEvent: async (d, z) => { if (z.data.scarred && !d.locate(z.data.scarred) && d.locate(z)) await d.destroy(z, "effect"); } });
  define("Spatial Collapse", { activate: { can: (d) => d.allZones(0).length <= 5 && d.allZones(1).length <= 5, resolve: async () => {} }, xSpatial: true });

  // ----- Magical Hats: two cards from the Deck hide a monster -----
  define("Magical Hats", { activate: {
    can: (d, ctx) => d.phase === "battle" && d.turnPlayer !== ctx.p && d.monsters(ctx.p).length > 0 && [0, 1, 2, 3, 4].filter((i) => !d.players[ctx.p].zones[i]).length >= 2
      && d.players[ctx.p].deck.filter((c) => !C.isMonster(c.no)).length >= 2,
    resolve: async (d, link) => {
      const p = link.p, pl = d.players[p];
      const m = await d.pickZone(p, "Hide which monster?", (z, q) => q === p, { sides: [p], area: "monster" });
      const cs = m && (await d.pickCards(p, "Choose 2 Spell or Trap Cards from your Deck.", pl.deck, (c) => !C.isMonster(c.no), { count: 2 }));
      if (!m || !cs) return;
      if (m.faceUp) await d.flipDown(m);
      const hats = [];
      for (const c of cs) { if (d.freeMonsterZone(p) < 0) break; const z = await d.placeMonster(p, c, { faceUp: false, defense: true, how: "special" }); if (z) { z.data.base = { atk: 0, def: 0, level: 1, type: 0, attribute: 0 }; hats.push(z); } }
      DM.shuffle(d, pl.deck);
      const zs = [m].concat(hats).filter((z) => d.locate(z)), idx = zs.map((z) => d.locate(z).i);
      DM.shuffle(d, idx);
      zs.forEach((z, k) => { pl.zones[idx[k]] = z; });
      atPhase(d, ["main2", "end"], async (d2) => H.destroyAll(d2, hats.filter((z) => d2.locate(z))), d.turn); } } });
})();

// (Errata: the current TCG text, part 1.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, define = DM.define, N = DM.numberOf;
  const { isName, once, mine } = DM.REST;
  const up = H.up, mons = H.mons;
  const effectOf = DM.effectOf;

  // ---------- What these cards need of the engine ----------
  // A name lock: "you cannot activate cards, or the effects of cards, with that name for the rest of this turn"
  // (Sangan, Witch of the Black Forest): players[p].flags.er1Lock = { turn, nos }.
  const lockName = (d, p, c) => {
    const f = d.players[p].flags;
    if (!f.er1Lock || f.er1Lock.turn !== d.turn) f.er1Lock = { turn: d.turn, nos: [] };
    f.er1Lock.nos.push(c.no);
  };
  const nameLocked = (d, p, c) => { const l = d.players[p].flags.er1Lock; return !!c && !!l && l.turn === d.turn && l.nos.includes(c.no); };
  const create0 = DM.create;
  DM.create = function (opts) {
    const d = create0.apply(this, arguments);
    const ca0 = d.canActivate, re0 = d.runEffect, em0 = d.emit;
    d.canActivate = function (p, c, a, ctx) { if (nameLocked(this, p, c)) return false; return ca0.call(this, p, c, a, ctx); };
    d.runEffect = async function (link) {
      if (link.kind === "flip" && link.card && link.zone && nameLocked(this, this.controllerOf(link.zone), link.card)) return;
      return re0.call(this, link);
    };
    // (Sinister Serpent: 1 banished from the Graveyard in the opponent's next End Phase)
    d.emit = async function (ev) {
      await em0.call(this, ev);
      if (this.over || ev.type !== "phase" || ev.phase !== "end") return;
      for (const q of [0, 1]) {
        const f = this.players[q].flags;
        if (!f.er1Serpent || f.er1Serpent.turn !== this.turn) continue;
        const k = f.er1Serpent.n; f.er1Serpent = null;
        for (let i = 0; i < k; i++) {
          const c = this.players[q].grave.find((x) => isName(x, "Sinister Serpent"));
          if (c) await this.banish(c, "effect");
        }
      }
    };
    return d;
  };

  // ---------- The cards ----------
  // Time Wizard: on a wrong call, destroy your monsters and take half the ATK the destroyed ones had face-up.
  define("Time Wizard", { ignition: { can: (d, ctx) => once(ctx.zone, d) && mine(d, ctx) && d.monsters(1 - ctx.p).length > 0, resolve: async (d, link) => {
    if (await H.coinCall(d, link.p)) { await H.destroyAll(d, d.monsters(1 - link.p)); return; }
    let total = 0;
    for (const z of d.monsters(link.p).slice()) {
      const atk = z.faceUp ? d.atkOf(z) : 0;
      if (d.locate(z) && (await d.destroy(z, "effect"))) total += atk;
    }
    await d.damage(link.p, Math.floor(total / 2), "effect");
  } } });

  // Sangan, Witch of the Black Forest: once per turn, and the card added is name-locked for the turn.
  const searcher = (key, stat, prompt) => async (d, c, p, from) => {
    const f = d.players[p].flags;
    if (!from || from.zone == null || f[key] === d.turn) return;
    const ok = (x) => C.isMonster(x.no) && !C.isExtra(x.no) && C[stat](x.no) <= 1500;
    if (!H.deckMon(d, p, ok).length) return;
    f[key] = d.turn;
    const got = await H.searchDeck(d, p, ok, prompt);
    if (got) lockName(d, p, got);
  };
  define("Sangan", { onToGrave: searcher("er1Sangan", "atk", "Add which monster with 1500 or less ATK to your hand?") });
  define("Witch of the Black Forest", { onToGrave: searcher("er1Witch", "def", "Add which monster with 1500 or less DEF to your hand?") });

  // Kuriboh: during damage calculation now (d.battleDamage above), not at the attack's declaration.
  // (Kuriboh: a Quick Effect from the hand during damage calculation, when your opponent's monster attacks: discard it,
  // and you take no battle damage from that battle; chainable, in the Damage Step's window)
  define("Kuriboh", { handQuick: { when: "before-damage", can: (d, ctx) => !!d.attack && d.attack.p !== ctx.p,
    resolve: async (d, link) => { if (d.attack) d.attack.noDamageTo = link.p; } } });

  // Catapult Turtle: once per turn.
  { const e = DM.EFFECTS[N("Catapult Turtle")]; define("Catapult Turtle", { ignition: Object.assign({}, e.ignition, { repeatable: undefined,
    can: (d, ctx) => once(ctx.zone, d) && d.monsters(ctx.p).length > 1 }) }); }

  // Big Eye: look at the top 5 and put them back in any order.
  define("Big Eye", { flip: async (d, link) => {
    const deck = d.players[link.p].deck, top = deck.slice(0, 5);
    if (!top.length) return;
    await d.emit({ type: "look", p: link.p, cards: top.slice() });
    const order = [];
    while (top.length > 1) {
      const c = await d.pickCard(link.p, "Place which card on top of your Deck next (" + (order.length + 1) + " of " + (order.length + top.length) + ")?", top);
      const x = c || top[0];
      order.push(x); top.splice(top.indexOf(x), 1);
    }
    order.push(top[0]);
    deck.splice(0, order.length, ...order);
  } });

  // D.D. Warrior: after damage calculation, banish the monster it battled and itself (they're not destroyed by that battle).
  define("D.D. Warrior", { onBattle: undefined,
    battleResult: (d, s, r, att, target, res) => {
      if (s !== att && s !== target) return;
      res.attackerDies = false; res.targetDies = false;
      s.data.er1Banish = { turn: d.turn, other: s === att ? target : att };
    },
    afterBattle: async (d, z, p, o) => {
      const b = z.data.er1Banish; z.data.er1Banish = null;
      if (!b || b.turn !== d.turn || b.other !== o) return;
      if (o && d.locate(o)) await d.banish(o.card, "effect");
      if (d.locate(z)) await d.banish(z.card, "effect");
    } });

  // "Harpie Lady": the cards whose name is treated as it (Cyber Harpie Lady, Harpie Lady 1, 2 and 3) count.
  define("Cyber Shield", DM.equip((d, z) => isName(z.card, ["Harpie Lady", "Harpie Lady Sisters"]), { atk: 500 }));
  define("Elegant Egotist", { activate: {
    can: (d, ctx) => H.canSummonHere(d, ctx.p) && up(d).some((z) => isName(z.card, "Harpie Lady")) && d.players[ctx.p].hand.concat(d.players[ctx.p].deck).some((c) => isName(c, ["Harpie Lady", "Harpie Lady Sisters"])),
    resolve: async (d, link) => {
      if (!up(d).some((z) => isName(z.card, "Harpie Lady"))) return;
      const pl = d.players[link.p];
      const c = await d.pickCard(link.p, "Special Summon which Harpie?", pl.hand.concat(pl.deck), (x) => isName(x, ["Harpie Lady", "Harpie Lady Sisters"]));
      const fromDeck = c && pl.deck.includes(c);
      if (c) await d.specialSummon(link.p, c, { how: "special", position: "choose" });
      if (fromDeck) DM.shuffle(d, pl.deck);
    } } });
  define("Harpie's Pet Dragon", { selfStats: (d) => { const n = 300 * up(d).filter((x) => isName(x.card, "Harpie Lady")).length; return { atk: n, def: n }; } });

  // Metalzoa: Special Summoned from the Deck by Tributing "Zoa" equipped with "Metalmorph" (Zoa's side of it).
  const metalmorphed = (d, z) => z.faceUp && z.links.some((l) => l.kind === "equip" && l.from && d.locate(l.from) && isName(l.from.card, "Metalmorph"));
  define("Zoa", { ignition: {
    can: (d, ctx) => mine(d, ctx) && metalmorphed(d, ctx.zone) && !d.players[ctx.p].flags.noSpecialSummon && d.players[ctx.p].deck.some((c) => isName(c, "Metalzoa")),
    cost: async (d, link) => { if (!link.zone || !d.locate(link.zone)) return false; await d.sendToGrave(link.card, "tribute"); return true; },
    resolve: async (d, link) => {
      const pl = d.players[link.p], c = pl.deck.find((x) => isName(x, "Metalzoa"));
      if (c) await d.specialSummon(link.p, c, { how: "special", position: "choose", byRule: true });
      DM.shuffle(d, pl.deck);
    } } });

  // Swordsman from a Distant Land: destroyed in the 5th End Phase after the attack (this turn's is the 1st).
  define("Swordsman from a Distant Land", { beforeDamage: async (d, z, p, t) => { if (t) t.data.destroyAtEnd = d.turn + 4; } });

  // Blast Juggler: only in your Standby Phase; Tribute it to destroy 2 face-up monsters with 1000 or less ATK.
  define("Blast Juggler", { ignition: undefined, standby: async (d, z, p) => {
    if (d.turnPlayer !== p || !z.faceUp) return;
    const ok = (x) => x !== z && x.faceUp && d.atkOf(x) <= 1000;
    if (!up(d).some(ok)) return;
    const ctl = d.opts.controllers[p];
    if (ctl && ctl.ai && !up(d, 1 - p).some(ok)) return;
    if (!(await d.yesNo(p, "Tribute Blast Juggler to destroy 2 face-up monsters with 1000 or less ATK?"))) return;
    await d.sendToGrave(z.card, "tribute");
    const zs = await d.pickZones(p, "Destroy which 2 face-up monsters with 1000 or less ATK?", (x) => x.faceUp && d.atkOf(x) <= 1000, { area: "monster", count: 2 });
    for (const t of zs || []) if (d.locate(t)) await d.destroy(t, "effect");
  } });

  // Sinister Serpent: once per turn; 1 "Sinister Serpent" is banished from the GY in the opponent's next End Phase.
  define("Sinister Serpent", { graveStandby: async (d, c, p) => {
    const f = d.players[p].flags;
    if (d.turnPlayer !== p || f.er1SerpentUsed === d.turn || !(await d.yesNo(p, "Add Sinister Serpent to your hand?"))) return;
    f.er1SerpentUsed = d.turn;
    await d.toHand(c, "effect");
    const s = f.er1Serpent;
    f.er1Serpent = { turn: d.turn + 1, n: s && s.turn === d.turn + 1 ? s.n + 1 : 1 };
  } });

  // Man-Eater Bug: targets now.
  define("Man-Eater Bug", { flip: async (d, link) => {
    if (!(await H.target(d, link, "Destroy which monster?", (x) => x !== link.zone, { area: "monster" }))) return;
    const z = H.t(d, link);
    if (z) await d.destroy(z, "effect");
  } });

  // Penguin Soldier: up to 2 targets (Lord of D. keeps Dragons out of them).
  define("Penguin Soldier", { flip: async (d, link) => {
    const zs = await d.pickZones(link.p, "Return up to 2 monsters to their owners' hands.", (x) => x !== link.zone && !(d.liveWith("noTargetDragons") && H.isType(d, x, "Dragon")), { area: "monster", count: 2, min: 0 });
    for (const z of zs || []) if (d.locate(z)) await d.toHand(z.card, "effect");
  } });

  // Morphing Jar: both players discard their hands, then each draws 5.
  define("Morphing Jar", { flip: async (d, link) => {
    for (const p of [link.p, 1 - link.p]) for (const c of d.players[p].hand.slice()) await d.discard(p, c);
    for (const p of [link.p, 1 - link.p]) { if (d.over) return; await d.drawCards(p, 5); }
  } });
})();

// (Errata: the current TCG text, part 2.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo;
  const { isName, once, mine, ss } = DM.REST;
  const up = H.up, mons = H.mons, t0 = H.t;
  const E = (name) => DM.EFFECTS[N(name)] || {};
  const act = (name, extra) => Object.assign({}, E(name).activate, extra);
  const isToon = (z) => !!z && z.faceUp && !z.card.token && !!(DM.effectOf(z.card.no) || {}).toon;
  const freeZones = (d, p) => [0, 1, 2, 3, 4].filter((i) => !d.players[p].zones[i] && !d.closed(p, i)).length;
  const summonedNow = (d, p) => d.players[p].flags.xSummonedTurn === d.turn;

  // ---------- What these cards need of each duel ----------
  // Player flags: xSummonedTurn (p Summoned a monster this turn), xSetOk (this turn's "you cannot Summon" lets p
  // Normal Set). Effect properties: xNoSummons (neither player can Summon), xFreeze (other monsters can't change
  // their battle positions); Light of Intervention's noSetMonsters keeps monsters from being flipped face-down.
  const SUMMONS = ["summoned", "flip-summoned", "special-summoned"];
  const REBD = N("Red-Eyes Black Dragon"), METAL = N("Metalmorph"), REBMD = N("Red-Eyes Black Metal Dragon");
  const metalReds = (d, p) => up(d, p).filter((z) => z.card.no === REBD && z.links.some((l) => l.kind === "equip" && l.from && d.locate(l.from) && l.from.card.no === METAL));
  function patch(d) {
    const ma0 = d.mainActions, da0 = d.doAction, nt0 = d.notify, fd0 = d.flipDown;
    d.notify = async function (ev) {
      if (ev && SUMMONS.includes(ev.type) && ev.p != null) this.players[ev.p].flags.xSummonedTurn = this.turn;
      return nt0.call(this, ev);
    };
    d.mainActions = function (p) {
      const f = this.players[p].flags;
      let acts;
      if (f.xSetOk === this.turn && f.noSummonTurn === this.turn) {
        f.noSummonTurn = -1;
        try { acts = ma0.call(this, p).filter((a) => !["summon", "flip-summon", "special-hand"].includes(a.act)); } finally { f.noSummonTurn = this.turn; }
      } else acts = ma0.call(this, p);
      if (this.liveWith("xNoSummons")) acts = acts.filter((a) => !["summon", "flip-summon", "special-hand"].includes(a.act));
      const freeze = [0, 1].reduce((a, q) => a.concat(this.allZones(q).filter((z) => { const e = this.live(z); return e && e.xFreeze; })), []);
      if (freeze.length) acts = acts.filter((a) => !((a.act === "position" || a.act === "flip-summon") && freeze.some((s) => s !== a.zone)));
      // (Red-Eyes Black Metal Dragon: from the Deck, by Tributing Red-Eyes Black Dragon equipped with Metalmorph)
      const pl = this.players[p], c = pl.deck.find((x) => x.no === REBMD);
      const noSummon = pl.flags.noSummonTurn === this.turn || this.players[1 - p].flags.noSummonFor === this.turn || this.liveWith("xNoSummons");
      if (c && !noSummon && !pl.flags.noSpecialSummon && !this.liveWith("noSpecials")) {
        const z = metalReds(this, p)[0];
        if (z) {
          const at = acts.findIndex((a) => a.act === "battle" || a.act === "end");
          acts.splice(at < 0 ? acts.length : at, 0, { act: "special-hand", card: c, xMetal: z, label: "Special Summon " + C.name(REBMD) + " (Tribute Red-Eyes Black Dragon)" });
        }
      }
      return acts;
    };
    d.doAction = async function (p, a) {
      if (a && a.xMetal) {
        const z = a.xMetal;
        if (!this.locate(z) || !this.players[p].deck.includes(a.card)) return;
        await this.sendToGrave(z.card, "tribute");
        await this.specialSummon(p, a.card, { how: "special", position: "choose", byRule: true });
        DM.shuffle(this, this.players[p].deck);
        return;
      }
      return da0.call(this, p, a);
    };
    d.flipDown = async function (z) { if (this.liveWith("noSetMonsters")) return; return fd0.call(this, z); };
  }
  const create0 = DM.create;
  DM.create = function (opts) { const d = create0.apply(this, arguments); patch(d); return d; };

  // ---------- Spells ----------
  // Blue Medicine: only you gain 400 LP.
  define("Blue Medicine", { activate: { resolve: async (d, link) => d.heal(link.p, 400) } });
  // Exile of the Wicked: all Fiend monsters, face-down ones too.
  const fiend = (d, z) => (z.faceUp ? H.isType(d, z, "Fiend") : !z.card.token && C.type(z.card.no) === typeNo("Fiend"));
  define("Exile of the Wicked", { activate: { can: (d) => mons(d).some((z) => fiend(d, z)), resolve: async (d) => H.destroyAll(d, mons(d).filter((z) => fiend(d, z))) } });
  // Gravedigger Ghoul: up to 2.
  define("Gravedigger Ghoul", { activate: act("Gravedigger Ghoul", { resolve: async (d, link) => {
    const cs = await d.pickCards(link.p, "Remove up to 2 monsters from play.", H.graveMon(d, 1 - link.p), null, { count: 2, min: 1 }); for (const c of cs || []) await d.banish(c); } }) });
  // Scapegoat: all 4 Tokens (4 free zones); no Summon this turn before or after, but a Normal Set.
  define("Scapegoat", { activate: act("Scapegoat", {
    can: (d, ctx) => freeZones(d, ctx.p) >= 4 && !summonedNow(d, ctx.p),
    resolve: async (d, link) => {
      if (freeZones(d, link.p) >= 4) for (let k = 0; k < 4; k++) await d.summonToken(link.p, { name: "Sheep Token", type: typeNo("Beast"), attribute: ATTR.EARTH, level: 1 }, { defense: true, noTribute: true });
      const f = d.players[link.p].flags; f.noSummonTurn = d.turn; f.xSetOk = d.turn; } }) });
  // Dark Magic Curtain: no other Summon this turn, before or after (a Set is allowed).
  const curtain0 = E("Dark Magic Curtain").activate;
  define("Dark Magic Curtain", { activate: act("Dark Magic Curtain", {
    can: (d, ctx) => curtain0.can(d, ctx) && !summonedNow(d, ctx.p),
    resolve: async (d, link) => { await curtain0.resolve(d, link); d.players[link.p].flags.xSetOk = d.turn; } }) });
  // Gravekeeper's Servant: the top card of the Deck is the attack's cost; none, no attack.
  define("Gravekeeper's Servant", { noAttack: (d, s, q, ap) => ap !== q && !d.players[ap].deck.length });

  // ---------- Traps ----------
  // Mirror Force: destroys the Attack Position monsters; the attack itself isn't negated.
  define("Mirror Force", { activate: act("Mirror Force", { resolve: async (d, link) => H.destroyAll(d, d.monsters(1 - link.p).filter((z) => !z.defense)) }) });
  // Waboku: no battle damage, and your monsters can't be destroyed by battle, this turn.
  define("Waboku", { activate: act("Waboku", { resolve: async (d, link) => { const f = d.players[link.p].flags; f.waboku = d.turn; f.battleSafe = { turn: d.turn, test: () => true }; } }) });
  // Imperial Order: 700 LP each Standby Phase, either player's, not optional.
  define("Imperial Order", { standby: async (d, z, p) => { if (d.players[p].lp > 700) await d.payLp(p, 700); else await d.destroy(z, "cost"); } });
  // Magical Thorn: any discard from their hand, the hand size limit's too.
  define("Magical Thorn", { onEvent: async (d, z, p, ev) => { if (ev.type === "discarded" && ev.p === 1 - p) await d.damage(1 - p, 500, "effect"); } });
  // Ceasefire: only with a face-down monster or an Effect Monster on the field.
  define("Ceasefire", { activate: act("Ceasefire", { can: (d) => mons(d).some((z) => !z.faceUp || (!z.card.token && C.kind(z.card.no) === "effect")) }) });
  // Michizure: a monster sent from the field to your GY (the card's owner's).
  define("Michizure", { activate: act("Michizure", { can: (d, ctx) => !!ctx.event.card && ctx.event.card.owner === ctx.p && d.players[ctx.p].grave.includes(ctx.event.card) && mons(d).length > 0 }) });

  // ---------- Monsters ----------
  // The Toons: Special Summoned from the hand (Tributes by Level) while you control Toon World; they must attack a Toon if the other side has one.
  for (const [n, k] of [["Manga Ryu-Ran", 2], ["Toon Mermaid", 0], ["Toon Summoned Skull", 1], ["Blue-Eyes Toon Dragon", 2]]) {
    const pool = (d, p) => (d.liveWith("noTributes") ? [] : d.monsters(p));
    define(n, { toon: true, specialOnly: true, needsField: undefined, attackCost: 500, noAttackOnSummonTurn: true,
      specialFromHand: (d, p) => d.countOnField(N("Toon World"), p) > 0 && pool(d, p).length >= k,
      specialCost: async (d, p) => {
        if (!k) return true;
        const zs = await d.pickZones(p, "Tribute " + k + " monster" + (k > 1 ? "s" : "") + " to Special Summon " + n + ".", (z, q) => q === p, { sides: [p], area: "monster", count: k, cancel: true });
        if (!zs || zs.length < k) return false;
        for (const z of zs) await d.sendToGrave(z.card, "tribute");
        return true; },
      directAttack: (d, z, p) => !d.monsters(1 - p).some(isToon),
      canTarget: (d, z, p, t) => !d.monsters(1 - p).some(isToon) || isToon(t) });
  }
  // Relinquished, Thousand-Eyes Restrict: once per turn, a target the opponent controls becomes an Equip Card on it (max. 1).
  const absorbed = (d, z) => { const l = z.links.find((x) => x.kind === "equip" && x.from && x.from.data.absorbedBy === z && d.locate(x.from)); return l ? l.from : null; };
  async function absorb(d, p, z, t) {
    const c = t.card, i = d.freeSpellZone(p);
    if (i < 0 || !d.locate(t) || !d.locate(z)) return null;
    if (c.token) { await d.sendToGrave(c, "effect"); return null; }
    const from = d.take(c);
    const nz = DM.newZone(c, { faceUp: true, placedTurn: d.turn });
    nz.negated = true; nz.data.absorbedBy = z;
    d.players[p].zones[i] = nz;
    d.equip(nz, z, null);
    await d.emit({ type: "equip", card: c, to: z });
    await d.afterLeave(c, from, "effect");
    return nz;
  }
  const relinquish = (name, extra) => Object.assign({
    selfStats: (d, z) => { const s = absorbed(d, z); return s ? { setAtk: C.atk(s.card.no), setDef: C.def(s.card.no) } : null; },
    ignition: {
      can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && !absorbed(d, ctx.zone) && d.monsters(1 - ctx.p).length > 0 && d.freeSpellZone(ctx.p) >= 0,
      target: (d, link) => H.target(d, link, "Equip which monster to " + name + "?", (z, q) => q !== link.p, { area: "monster", sides: [1 - link.p] }),
      resolve: async (d, link) => {
        const t = t0(d, link), z = link.zone;
        if (!t || !z || !d.locate(z) || !z.faceUp || d.controllerOf(t) === link.p || absorbed(d, z)) return;
        await absorb(d, link.p, z, t); } },
    // (destroyed by battle: the equipped monster instead)
    battleResult: (d, s, r, att, target, res) => {
      if (s !== att && s !== target) return;
      const k = s === att ? "attackerDies" : "targetDies", eq = absorbed(d, s);
      s.data.battleWith = s === att ? target : att; s.data.battleTurn = d.turn;
      if (res[k] && eq) { res[k] = false; s.data.sacrifice = eq; } },
    afterBattle: async (d, z) => { const eq = z.data.sacrifice; z.data.sacrifice = null; z.data.battleWith = null; if (eq && d.locate(eq)) await d.destroy(eq, "effect"); }
  }, extra);
  define("Relinquished", relinquish("Relinquished", {
    // (battle damage you take from its battles: the same to your opponent, while it's equipped)
    onEvent: async (d, z, p, ev) => {
      if (ev.type !== "battle-damage" || ev.p !== p || !absorbed(d, z)) return;
      if (ev.attacker === z || (z.data.battleTurn === d.turn && z.data.battleWith && z.data.battleWith === ev.attacker)) await d.damage(1 - p, ev.amount, "effect"); } }));
  define("Thousand-Eyes Restrict", relinquish("Thousand-Eyes Restrict", { xFreeze: true, noAttack: (d, s, q, ap, att) => att !== s }));
  // Chimera the Flying Mythical Beast: when destroyed, you can bring back Berfomet or Gazelle.
  define("Chimera the Flying Mythical Beast", { onDestroyed: async (d, z, p) => {
    const f = (c) => isName(c, ["Berfomet", "Gazelle the King of Mythical Beasts"]);
    if (!H.canSummonHere(d, p) || !d.players[p].grave.some(f) || !(await d.yesNo(p, "Special Summon Berfomet or Gazelle from your Graveyard?"))) return;
    const c = await d.pickCard(p, "Special Summon which monster?", d.players[p].grave, f); if (c) await ss(d, p, c); } });
  // The Last Warrior from Another Planet: Special Summoned, destroys your other monsters; neither player can Summon.
  define("The Last Warrior from Another Planet", { noSpecials: true, xNoSummons: true,
    onSummon: async (d, z, p, how) => { if (how === "special") await H.destroyAll(d, d.monsters(p).filter((x) => x !== z)); } });
  // Insect Queen: its Token at the End Phase, if it destroyed an opponent's monster by battle this turn.
  define("Insect Queen", { onDestroyByBattle: async (d, z) => { z.data.queenTurn = d.turn; },
    endPhase: async (d, z, p) => { if (z.data.queenTurn !== d.turn) return; z.data.queenTurn = -1;
      await d.summonToken(p, { name: "Insect Monster Token", atk: 100, def: 100, level: 1, type: typeNo("Insect"), attribute: ATTR.EARTH }); } });
  // Hannibal Necromancer: its Spell Counter only when Normal Summoned.
  const hannibal0 = E("Hannibal Necromancer").onSummon;
  define("Hannibal Necromancer", { onSummon: async (d, z, p, how) => { if (how === "normal") await hannibal0(d, z, p, how); } });
  // Total Defense Shogun: to Defense Position when Normal or Flip Summoned.
  define("Total Defense Shogun", { onSummon: async (d, z, p, how) => { if ((how === "normal" || how === "flip") && !z.defense) await d.changePosition(z, true); } });
  // Barrel Dragon: targets, then the coins.
  define("Barrel Dragon", { ignition: { can: (d, ctx) => once(ctx.zone, d) && ctx.p === d.turnPlayer && d.monsters(1 - ctx.p).length > 0,
    target: (d, link) => H.target(d, link, "Target which monster?", (z, q) => q !== link.p, { area: "monster", sides: [1 - link.p] }),
    resolve: async (d, link) => {
      let h = 0; for (let k = 0; k < 3; k++) { const r = d.coin(); await d.emit({ type: "coin", p: link.p, heads: r }); if (r) h++; }
      const z = t0(d, link); if (h >= 2 && z) await d.destroy(z, "effect"); } } });
  // Giant Germ, Nimble Momonga: the copies from the Deck are optional.
  define("Giant Germ", { onDestroyed: async (d, z, p, why) => { if (why !== "battle") return; await d.damage(1 - p, 500, "effect");
    for (const c of d.players[p].deck.filter((c) => c.no === z.card.no)) { if (!H.canSummonHere(d, p) || !(await d.yesNo(p, "Special Summon a Giant Germ from your Deck?"))) break; await d.specialSummon(p, c, { how: "special" }); }
    DM.shuffle(d, d.players[p].deck); } });
  define("Nimble Momonga", { onDestroyed: async (d, z, p, why) => { if (why !== "battle") return; await d.heal(p, 1000);
    for (const c of d.players[p].deck.filter((c) => c.no === z.card.no)) { if (!H.canSummonHere(d, p) || !(await d.yesNo(p, "Special Summon a Nimble Momonga from your Deck?"))) break; await d.specialSummon(p, c, { faceUp: false, defense: true }); }
    DM.shuffle(d, d.players[p].deck); } });
})();

// (Errata: the current TCG text, part 3.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, ICON = DM.ICON;
  const { isName, once, ss } = DM.REST;
  const up = H.up, mons = H.mons, isMon = H.isMon, t0 = H.t;
  const E = (n) => DM.EFFECTS[N(n)] || {};
  // (a card by its name, as numberOf reads it: "Gamma the Magnet Warrior" too)
  const is = (c, n) => !!c && !c.token && (c.no === N(n) || isName(c, n));
  const text = (no) => (DM.text ? DM.text(no) : "");
  const isFlipMon = (c) => !!c && !c.token && C.isMonster(c.no) && /FLIP:/.test(text(c.no));
  const freeZones = (d, p) => [0, 1, 2, 3, 4].filter((i) => !d.players[p].zones[i] && !d.closed(p, i)).length;
  const origAtk = (z) => { const b = z.data.base || {}, tk = z.card.token; return b.atk != null ? b.atk : tk ? tk.atk : C.atk(z.card.no); };
  const graveAttr = (d, p, a) => d.players[p].grave.filter((c) => C.isMonster(c.no) && C.attribute(c.no) === ATTR[a]);
  // (Kycoo the Ghost Destroyer: p's opponent controls one face up)
  const kycoo = (d, p) => !!d.liveWith("e3Kycoo", 1 - p);
  const banishesFromGrave = (no) => /(banish|remov\w* from play)[^.]*(Graveyard|GY)|(Graveyard|GY)[^.]*(banish|remov\w* from play)/i.test(text(no));

  // ---------- Spells ----------
  // Nobleman of Crossout: a Flip monster's name banished from both Main Decks.
  define("Nobleman of Crossout", { activate: Object.assign({}, E("Nobleman of Crossout").activate, { resolve: async (d, link) => {
    const z = t0(d, link); if (!z) return;
    const c = z.card, flip = isFlipMon(c);
    if (!(await d.destroy(z, "effect"))) return;
    if (d.players[c.owner].grave.includes(c)) await d.banish(c, "effect");
    if (flip) for (const q of [0, 1]) for (const x of d.players[q].deck.filter((x) => x.no === c.no)) await d.banish(x, "effect");
  } }) });
  // Nobleman of Extermination: a Trap's copies banished from both Decks.
  define("Nobleman of Extermination", { activate: Object.assign({}, E("Nobleman of Extermination").activate, { resolve: async (d, link) => {
    const z = t0(d, link); if (!z) return;
    const c = z.card, trap = !c.token && C.isTrap(c.no);
    if (!(await d.destroy(z, "effect"))) return;
    if (d.players[c.owner].grave.includes(c)) await d.banish(c, "effect");
    if (trap) for (const q of [0, 1]) for (const x of d.players[q].deck.filter((x) => x.no === c.no)) await d.banish(x, "effect");
  } }) });
  // Dust Tornado: then you can Set 1 Spell/Trap from your hand.
  define("Dust Tornado", { activate: Object.assign({}, E("Dust Tornado").activate, { resolve: async (d, link) => {
    const z = t0(d, link);
    if (!z || !(await d.destroy(z, "effect"))) return;
    const p = link.p, pl = d.players[p], i = d.freeSpellZone(p);
    const ok = (c) => (C.isSpell(c.no) || C.isTrap(c.no)) && C.icon(c.no) !== ICON.FIELD;
    if (i < 0 || !pl.hand.some(ok)) return;
    const c = await d.pickCard(p, "Set a Spell or Trap Card from your hand?", pl.hand, ok, { min: 0, cancel: true });
    if (!c) return;
    d.take(c);
    const s = DM.newZone(c, { faceUp: false, placedTurn: d.turn });
    pl.zones[i] = s;
    await d.emit({ type: "set-spell", p, i, zone: s, card: c });
  } }) });
  // Makiu, the Magical Mist: targets its monster; DEF less than or equal; no Battle Phase the turn it's activated.
  const makiuSrc = (d, z) => z.faceUp && (is(z.card, "Summoned Skull") || H.isType(d, z, "Thunder"));
  define("Makiu, the Magical Mist", { activate: {
    can: (d, ctx) => d.phase !== "main2" && d.phase !== "battle" && up(d, ctx.p).some((z) => makiuSrc(d, z)),
    cost: async (d, link) => { d.players[link.p].flags.noBattleThisTurn = d.turn; return true; },
    target: (d, link) => H.target(d, link, "Which Summoned Skull or Thunder monster?", (z, q) => q === link.p && makiuSrc(d, z), { area: "monster" }),
    resolve: async (d, link) => {
      const s = t0(d, link); if (!s || !s.faceUp) return;
      const a = d.atkOf(s);
      await H.destroyAll(d, d.monsters(1 - link.p).filter((z) => d.defOf(z) <= a));
    } } });
  // Magic Formula: the LP only when it goes from the field to the GY.
  define("Magic Formula", { onToGrave: async (d, c, p, from) => { if (from && from.zone != null) await d.heal(p, 1000, "effect"); } });
  // Lightning Blade: all WATER monsters lose 500 ATK.
  define("Lightning Blade", { aura: (d, src, sp, z, zp, s) => (src.equippedTo && d.locate(src.equippedTo) && isMon(d, z) && z.faceUp && (s ? s.attribute : C.attribute(z.card.no)) === ATTR.WATER ? { atk: -500 } : null) });
  // Card of Safe Return: a monster from your GY, whoever summons it; "you can".
  define("Card of Safe Return", { onEvent: async (d, z, p, ev) => {
    if (ev.type === "special-summoned" && ev.zone && ev.zone.data.fromPile === "grave" && ev.zone.card.owner === p && (await d.yesNo(p, "Draw 1 card with Card of Safe Return?"))) await d.drawCards(p, 1);
  } });
  // Temple of the Kings: 1 Trap a turn the turn it was Set (from the Main Phase too); its other effect once per turn.
  {
    const ig = E("Temple of the Kings").ignition;
    define("Temple of the Kings", {
      onEvent: async (d, z, p, ev) => { if (ev.type === "activated" && ev.p === p && ev.card && C.isTrap(ev.card.no) && ev.zone && ev.zone.placedTurn === d.turn && ev.zone !== z) d.players[p].flags.e3Temple = d.turn; },
      ignition: ig ? Object.assign({}, ig, { can: (d, ctx) => once(ctx.zone, d) && ig.can(d, ctx) }) : undefined
    });
  }
  // Fusion Gate: the turn player's, whoever controls it.
  // (in the create wrapper below)

  // ---------- Traps ----------
  // Ring of Destruction: the opponent's monster in their turn, ATK up to their LP; its original ATK to you, then the same to them; 1 a turn.
  define("Ring of Destruction", { activate: { when: ["main", "any"],
    can: (d, ctx) => d.turnPlayer !== ctx.p && d.players[ctx.p].flags.e3Ring !== d.turn && up(d, 1 - ctx.p).some((z) => d.atkOf(z) <= d.players[1 - ctx.p].lp),
    cost: async (d, link) => { d.players[link.p].flags.e3Ring = d.turn; return true; },
    target: (d, link) => H.target(d, link, "Destroy which monster?", (z, q) => q === 1 - link.p && z.faceUp && d.atkOf(z) <= d.players[1 - link.p].lp, { area: "monster" }),
    resolve: async (d, link) => {
      const z = t0(d, link); if (!z || !z.faceUp) return;
      const a = origAtk(z);
      if (!(await d.destroy(z, "effect"))) return;
      // (you take its original ATK, then your opponent the damage you took; the duel's end checked after both)
      await d.together(async () => {
        const lp = d.players[link.p].lp;
        await d.damage(link.p, a, "effect");
        const took = d.players[link.p].lp < lp ? a : 0;
        if (took > 0) await d.damage(1 - link.p, took, "effect");
      });
    } } });
  // Embodiment of Apophis: in either player's Main Phase only.
  { const a = E("Embodiment of Apophis").activate; if (a) define("Embodiment of Apophis", { activate: Object.assign({}, a, { can: (d, ctx) => d.isMain() && (!a.can || a.can(d, ctx)) }) }); }
  // Exchange of the Spirit: both players 15 or more in the GY; 1 per Duel.
  { const a = E("Exchange of the Spirit").activate; if (a) define("Exchange of the Spirit", { activate: Object.assign({}, a, {
    can: (d, ctx) => !d.players[ctx.p].flags.e3Exchange && d.players[ctx.p].lp > 1000 && d.players[0].grave.length >= 15 && d.players[1].grave.length >= 15,
    cost: async (d, link) => { d.players[link.p].flags.e3Exchange = true; await d.payLp(link.p, 1000); return true; } }) }); }

  // ---------- Monsters ----------
  // Morphing Jar #2: the excavated Level 4 or lower monsters Set, the rest to the GY.
  define("Morphing Jar #2", { flip: async (d) => {
    const n = [0, 0];
    for (const p of [0, 1]) for (const z of d.monsters(p).slice()) { const c = z.card; if (!c.token && !C.isExtra(c.no)) n[c.owner]++; await d.toDeck(c, "shuffle"); }
    for (const p of [0, 1]) {
      const pl = d.players[p]; DM.shuffle(d, pl.deck);
      let k = 0, got = 0;
      while (got < n[p] && k < pl.deck.length) { if (C.isMonster(pl.deck[k].no)) got++; k++; }
      for (const c of pl.deck.slice(0, k)) {
        let z = null;
        if (C.isMonster(c.no) && C.level(c.no) <= 4 && d.freeMonsterZone(p) >= 0) z = await d.specialSummon(p, c, { faceUp: false, defense: true });
        if (!z && pl.deck.includes(c)) await d.sendToGrave(c, "effect");
        if (d.over) return;
      }
    }
  } });
  // Valkyrion the Magna Warrior: Special Summoned by Tributing Alpha, Beta and Gamma from the hand and/or field; Tributed to bring them back.
  const MAGNETS = ["Alpha The Magnet Warrior", "Beta The Magnet Warrior", "Gamma The Magnet Warrior"];
  const magnetPool = (d, p) => d.players[p].hand.concat(d.monsters(p).filter((z) => !z.data.cannotTribute).map((z) => z.card));
  define("Valkyrion the Magna Warrior", { specialOnly: true,
    specialFromHand: (d, p) => !d.liveWith("noTributes") && MAGNETS.every((n) => magnetPool(d, p).some((c) => is(c, n))),
    specialCost: async (d, p) => {
      const picked = [];
      for (const n of MAGNETS) {
        const c = await d.pickCard(p, "Tribute " + n + ".", magnetPool(d, p), (x) => is(x, n) && !picked.includes(x), { cancel: true });
        if (!c) return false;
        picked.push(c);
      }
      for (const c of picked) await d.sendToGrave(c, "tribute");
      return true;
    },
    ignition: {
      can: (d, ctx) => !d.liveWith("noTributes") && !d.players[ctx.p].flags.noSpecialSummon && freeZones(d, ctx.p) >= 2 && MAGNETS.every((n) => d.players[ctx.p].grave.some((c) => is(c, n))),
      cost: async (d, link) => { await d.sendToGrave(link.card, "tribute"); return true; },
      target: async (d, link) => {
        const cs = [];
        for (const n of MAGNETS) { const c = d.players[link.p].grave.find((x) => is(x, n)); if (!c) return false; cs.push(c); }
        link.data.magnets = cs; return true;
      },
      resolve: async (d, link) => {
        const cs = (link.data.magnets || []).filter((c) => d.players[link.p].grave.includes(c));
        if (cs.length < 3 || freeZones(d, link.p) < 3) return;
        for (const c of cs) await ss(d, link.p, c);
      } } });
  // Alligator's Sword Dragon: directly, if the only face-up monsters they control are EARTH, WATER or FIRE.
  define("Alligator's Sword Dragon", { directAttack: (d, z, p) => { const fu = up(d, 1 - p); return fu.length > 0 && fu.every((x) => [ATTR.EARTH, ATTR.WATER, ATTR.FIRE].includes(H.attrOf(d, x))); } });
  // Birdface: "you can".
  define("Birdface", { onDestroyed: async (d, z, p, why) => {
    if (why !== "battle" || !d.players[p].deck.some((c) => is(c, "Harpie Lady")) || !(await d.yesNo(p, "Add a Harpie Lady from your Deck to your hand?"))) return;
    await H.searchDeck(d, p, (c) => is(c, "Harpie Lady"), "Add which Harpie Lady to your hand?");
  } });
  // Fairy King Truesdale: while it's in Defense Position.
  { const au = E("Fairy King Truesdale").aura; if (au) define("Fairy King Truesdale", { aura: (d, src, sp, z, zp, s) => (src.defense ? au(d, src, sp, z, zp, s) : null) }); }
  // Woodland Sprite: 1 Equip Card, 500 damage.
  const spriteEquips = (d, z) => z.links.filter((l) => l.kind === "equip" && l.from && d.locate(l.from)).map((l) => l.from);
  define("Woodland Sprite", { ignition: { repeatable: true, can: (d, ctx) => spriteEquips(d, ctx.zone).length > 0,
    cost: async (d, link) => {
      const eqs = spriteEquips(d, link.zone);
      const z = eqs.length > 1 ? await d.pickZone(link.p, "Send which Equip Card to the Graveyard?", (x) => eqs.includes(x), { cancel: true }) : eqs[0];
      if (!z) return false;
      await d.sendToGrave(z.card, "cost"); return true;
    },
    resolve: async (d, link) => d.damage(1 - link.p, 500, "effect") } });
  // Slate Warrior: the monster that destroys it by battle loses 500 ATK and DEF.
  define("Slate Warrior", { onDestroyed: async (d, z, p, why, by) => { if (why === "battle" && by && d.locate(by)) by.links.push({ kind: "self", stats: { atk: -500, def: -500 } }); } });
  // Goblin Attack Force: in Defense Position after it attacks, and locked until the End Phase of your next turn.
  define("Goblin Attack Force", { afterAttack: undefined,
    beforeAttack: async (d, z) => { z.data.e3Gaf = d.turn; },
    endPhase: async (d, z) => { if (z.data.e3Gaf !== d.turn || !d.locate(z)) return; z.data.e3Gaf = null; if (z.faceUp) await d.changePosition(z, true); z.changedTurn = d.turn + 2; } });
  // Amazoness Archer, Hysteric Fairy: any 2 monsters, itself too.
  const tribute2 = async (d, link) => {
    const zs = await d.pickZones(link.p, "Tribute 2 monsters.", (x, q) => q === link.p && !x.data.cannotTribute, { sides: [link.p], area: "monster", count: 2, cancel: true });
    if (!zs || zs.length < 2) return false;
    for (const z of zs) await d.sendToGrave(z.card, "tribute");
    return true;
  };
  define("Amazoness Archer", { ignition: { repeatable: true, can: (d, ctx) => d.tributable(ctx.p).length >= 2, cost: tribute2, resolve: async (d, link) => d.damage(1 - link.p, 1200, "effect") } });
  define("Hysteric Fairy", { ignition: { repeatable: true, can: (d, ctx) => d.tributable(ctx.p).length >= 2, cost: tribute2, resolve: async (d, link) => d.heal(link.p, 1000, "effect") } });
  // Mystical Beast of Serket: destroyed while you control no Temple of the Kings.
  define("Mystical Beast of Serket", { onEvent: async (d, z, p) => {
    if (z.data.e3Dying || !z.faceUp || d.countOnField(N("Temple of the Kings"), p) > 0) return;
    z.data.e3Dying = true;
    if (!(await d.destroy(z, "effect"))) z.data.e3Dying = false;
  } });
  // Dark Sage: Special Summoned (from the hand or Deck) by Tributing Dark Magician right after Time Wizard's right call; a Spell from the Deck.
  async function darkSage(d, p) {
    const pl = d.players[p];
    const sages = pl.hand.concat(pl.deck).filter((c) => is(c, "Dark Sage"));
    const dms = d.monsters(p).filter((z) => is(z.card, "Dark Magician") && !z.data.cannotTribute);
    if (!sages.length || !dms.length || d.liveWith("noTributes") || pl.flags.noSpecialSummon) return;
    if (!(await d.yesNo(p, "Tribute Dark Magician to Special Summon Dark Sage?"))) return;
    const t = dms.length > 1 ? await d.pickZone(p, "Tribute which Dark Magician?", (x) => dms.includes(x), { sides: [p], area: "monster" }) : dms[0];
    if (!t) return;
    const c = sages.length > 1 ? await d.pickCard(p, "Special Summon which Dark Sage?", sages) : sages[0];
    if (!c) return;
    await d.sendToGrave(t.card, "tribute");
    const z = await d.specialSummon(p, c, { how: "special", position: "choose", byRule: true });
    DM.shuffle(d, pl.deck);
    if (z && pl.deck.some((x) => C.isSpell(x.no))) await H.searchDeck(d, p, (x) => C.isSpell(x.no), "Add which Spell Card to your hand?");
  }
  define("Dark Sage", { specialOnly: true });
  if (!H.e3Coin) {
    const cc = H.coinCall;
    H.coinCall = async function (d, p) { const r = await cc.apply(this, arguments); if (d) d.e3Call = { p, right: !!r, turn: d.turn }; return r; };
    H.e3Coin = true;
  }
  // The Spirits summoned by banishing a monster of an Attribute from the GY: Soul of Purity and Light, Spirit of Flames, Aqua Spirit, The Rock Spirit, Garuda.
  const fromGrave = (attr, n) => ({ specialOnly: true,
    specialFromHand: (d, p) => graveAttr(d, p, attr).length >= n && !kycoo(d, p),
    specialCost: async (d, p) => {
      const cs = await d.pickCards(p, "Banish " + n + " " + attr + " monster" + (n > 1 ? "s" : "") + " from your Graveyard.", d.players[p].grave, (c) => C.isMonster(c.no) && C.attribute(c.no) === ATTR[attr], { count: n, cancel: true });
      if (!cs || cs.length < n) return false;
      for (const c of cs) await d.banish(c, "cost");
      return true;
    } });
  define("Soul of Purity and Light", Object.assign(fromGrave("LIGHT", 2), {
    aura: (d, src, sp, z, zp) => (zp !== sp && isMon(d, z) && z.faceUp && d.phase === "battle" && d.turnPlayer === zp ? { atk: -300 } : null) }));
  define("Spirit of Flames", fromGrave("FIRE", 1));
  define("The Rock Spirit", fromGrave("EARTH", 1));
  const swapOne = async (d, p, prompt) => {
    const t = await d.pickZone(p, prompt, (x, q) => q !== p && x.faceUp, { sides: [1 - p], area: "monster", min: 0, cancel: true });
    if (!t || !d.locate(t)) return;
    await d.changePosition(t, !t.defense);
    t.changedTurn = d.turn;
  };
  define("Aqua Spirit", Object.assign(fromGrave("WATER", 1), {
    standby: async (d, z, p) => { if (d.turnPlayer !== p && up(d, 1 - p).length) await swapOne(d, p, "Change the battle position of which of your opponent's monsters (Aqua Spirit)?"); } }));
  define("Garuda the Wind Spirit", Object.assign(fromGrave("WIND", 1), {
    endPhase: async (d, z, p) => { if (d.turnPlayer !== p && up(d, 1 - p).length) await swapOne(d, p, "Change the battle position of which of your opponent's monsters (Garuda)?"); } }));
  // Gradius' Option: Special Summoned by selecting a face-up Gradius; its ATK and DEF; destroyed when that Gradius leaves the field.
  define("Gradius' Option", { specialOnly: true,
    specialFromHand: (d, p) => up(d, p).some((z) => is(z.card, "Gradius")),
    specialCost: async (d, p, c) => {
      const g = await d.pickZone(p, "Select which Gradius?", (x, q) => q === p && x.faceUp && is(x.card, "Gradius"), { sides: [p], area: "monster", cancel: true });
      if (!g) return false; c.e3Gradius = g; return true;
    },
    afterSpecial: async (d, z) => { z.data.gradius = z.card.e3Gradius || null; z.card.e3Gradius = null; },
    selfStats: (d, z) => { const g = z.data.gradius; return g && d.locate(g) && g.faceUp ? { setAtk: d.atkOf(g), setDef: d.defOf(g) } : null; },
    onEvent: async (d, z) => { const g = z.data.gradius; if (g && !d.locate(g) && !z.data.e3Gone) { z.data.e3Gone = true; await d.destroy(z, "effect"); } } });
  // Gilasaurus: Special Summoned from the hand; then the opponent can Special Summon 1 monster from their GY.
  define("Gilasaurus", { onSummon: undefined, specialFromHand: () => true,
    afterSpecial: async (d, z, side, p) => {
      const q = 1 - p, pool = H.graveMon(d, q, (c) => !C.isExtra(c.no));
      if (!H.canSummonHere(d, q) || !pool.length) return;
      const c = await d.pickCard(q, "Special Summon a monster from your Graveyard (Gilasaurus)?", pool, null, { min: 0, cancel: true });
      if (c) await ss(d, q, c);
    } });
  // Kycoo the Ghost Destroyer: the opponent can't banish cards from either GY (in the create wrapper below).
  define("Kycoo the Ghost Destroyer", { e3Kycoo: true });
  // Troop Dragon: destroyed by battle only.
  { const od = E("Troop Dragon").onDestroyed; if (od) define("Troop Dragon", { onDestroyed: async (d, z, p, why, by) => { if (why === "battle") await od(d, z, p, why, by); } }); }
  // Zolga: Tributed for a Tribute Summon (not a Set).
  define("Zolga", { onToGrave: async (d, c, p, from, why) => { if (why === "tribute" && d.e3TribSummon) await d.heal(c.owner, 2000, "effect"); } });
  // Hino-Kagu-Tsuchi: the opponent discards their hand in their next Draw Phase, before they draw.
  define("Hino-Kagu-Tsuchi", { onBattleDamage: async (d, z, p) => { d.players[1 - p].flags.e3Hino = true; } });
  // Giant Axe Mummy: an attacker with less ATK than its DEF, attacking it face down, destroyed.
  define("Giant Axe Mummy", { onAttacked: async (d, z, q, att) => { if (z.data.attackedFaceDown === d.turn && d.locate(att) && d.atkOf(att) < d.defOf(z)) att.data.destroyAfterBattle = true; } });
  // Exiled Force: targets.
  define("Exiled Force", { ignition: {
    can: (d, ctx) => mons(d).some((z) => z !== ctx.zone),
    cost: async (d, link) => { await d.sendToGrave(link.card, "tribute"); return true; },
    target: (d, link) => H.target(d, link, "Destroy which monster?", (z) => z !== link.zone, { area: "monster" }),
    resolve: async (d, link) => { const z = t0(d, link); if (z) await d.destroy(z, "effect"); } } });
  // The Spirit monsters: back to the hand at the End Phase of the turn they're flipped face up, too; Dark Dust Spirit's destruction when flipped.
  const SPIRITS = ["Inaba White Rabbit", "Yata-Garasu", "Susa Soldier", "Yamata Dragon", "Great Long Nose", "Hino-Kagu-Tsuchi", "Fushi No Tori", "Dark Dust Spirit"];
  for (const n of SPIRITS) if (N(n)) define(n, { endPhase: async (d, z) => { if (z.data.e3FlipTurn === d.turn && z.placedTurn !== d.turn && z.faceUp && d.locate(z)) await d.toHand(z.card, "spirit"); } });

  // ---------- What these need of the duel ----------
  const create0 = DM.create;
  DM.create = function () {
    const d = create0.apply(this, arguments);
    const o = { emit: d.emit, runEffect: d.runEffect, doAction: d.doAction, activate: d.activate, banish: d.banish, liveWith: d.liveWith, mainActions: d.mainActions, canActivate: d.canActivate };
    // (who's acting: the link resolving, the action or the activation; Kycoo reads it)
    const acting = async (d0, p, fn) => { const prev = d0.e3Actor; d0.e3Actor = p; try { return await fn(); } finally { d0.e3Actor = prev; } };
    Object.assign(d, {
      async emit(ev) {
        await o.emit.call(this, ev);
        if (ev.type === "flip" && ev.zone) {
          ev.zone.data.e3FlipTurn = this.turn;
          if (ev.how !== "flip-summon" && is(ev.zone.card, "Dark Dust Spirit") && !ev.zone.negated && this.locate(ev.zone)) await H.destroyAll(this, up(this).filter((x) => x !== ev.zone));
        }
        if (ev.type === "phase" && ev.phase === "draw" && this.players[ev.p] && this.players[ev.p].flags.e3Hino) {
          this.players[ev.p].flags.e3Hino = false;
          for (const c of this.players[ev.p].hand.slice()) if (!this.over) await this.discard(ev.p, c, "effect");
        }
      },
      async runEffect(link) {
        const tw = link && link.card && is(link.card, "Time Wizard");
        if (tw) this.e3Call = null;
        await acting(this, link ? link.p : null, () => o.runEffect.call(this, link));
        if (tw && this.e3Call && this.e3Call.p === link.p && this.e3Call.right && !this.over) { this.e3Call = null; await darkSage(this, link.p); }
      },
      async doAction(p, a) {
        const prev = this.e3TribSummon;
        this.e3TribSummon = !!(a && a.act === "summon" && a.tributes > 0);
        try { return await acting(this, p, () => o.doAction.call(this, p, a)); } finally { this.e3TribSummon = prev; }
      },
      async activate(p, opt, prev, ev) { return acting(this, p, () => o.activate.call(this, p, opt, prev, ev)); },
      async banish(c, why) {
        const p = this.e3Actor;
        if (p != null && c && !c.token && [0, 1].some((q) => this.players[q].grave.includes(c)) && kycoo(this, p)) return;
        return o.banish.call(this, c, why);
      },
      // (Temple of the Kings: 1 Trap a turn)
      liveWith(prop, q) {
        if (prop === "trapsSameTurn" && q != null && this.players[q].flags.e3Temple === this.turn) return null;
        return o.liveWith.call(this, prop, q);
      },
      canActivate(p, c, a, ctx) {
        if (kycoo(this, p) && c && !c.token && banishesFromGrave(c.no) && (C.isMonster(c.no) || C.isSpell(c.no) || C.isTrap(c.no))) return false;
        return o.canActivate.call(this, p, c, a, ctx);
      },
      mainActions(p) {
        let acts = o.mainActions.call(this, p);
        const extra = [];
        // (Temple of the Kings: a Trap Set this turn, from the Main Phase too)
        if (!this.negated("trap") && this.liveWith("trapsSameTurn", p)) for (let i = 5; i < 10; i++) {
          const z = this.players[p].zones[i];
          if (!z || z.faceUp || z.placedTurn !== this.turn || !C.isTrap(z.card.no)) continue;
          const e = DM.effectOf(z.card.no);
          if (e && e.activate && !acts.some((a) => a.zone === z && a.act === "activate") && this.canActivate(p, z.card, e.activate, { zone: z }))
            extra.push({ act: "activate", card: z.card, zone: z, from: "field", label: "Activate " + C.name(z.card.no) });
        }
        // (Fusion Gate: the turn player's, on either side)
        const fg = this.players[1 - p].zones[10];
        if (fg && is(fg.card, "Fusion Gate") && this.live(fg) && !this.allZones(p).some((z) => is(z.card, "Fusion Gate") && this.live(z))) {
          const e = DM.effectOf(fg.card.no);
          if (e && e.ignition && this.canActivate(p, fg.card, e.ignition, { zone: fg })) extra.push({ act: "ignition", zone: fg, label: "Use Fusion Gate" });
        }
        // (Kycoo: no Special Summon whose cost banishes from the GY)
        if (kycoo(this, p)) acts = acts.filter((a) => !(a.act === "special-hand" && banishesFromGrave(a.card.no)));
        if (extra.length) { const k = acts.findIndex((a) => a.act === "battle" || a.act === "end"); acts.splice(k < 0 ? acts.length : k, 0, ...extra); }
        return acts;
      }
    });
    return d;
  };
})();

// (Errata: the current TCG text, part 4.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo, ICON = DM.ICON, SC = DM.SC;
  const { isName, once, mine, ss, piles, union, discardCost, handCount } = DM.REST;
  const up = H.up, mons = H.mons, t0 = H.t, effectOf = DM.effectOf;
  const ctl = (d, z) => d.controllerOf(z);
  const typeOfCard = (c) => (c.token ? c.token.type : C.type(c.no));
  const isDragon = (c) => !!c && typeOfCard(c) === typeNo("Dragon");
  const isToon = (z) => !!z && z.faceUp && !!(effectOf(z.card.no) || {}).toon;
  const isST = (c) => !!c && !c.token && (C.isSpell(c.no) || C.isTrap(c.no));
  const curLink = (d) => d.resolvingLink || (d.fxStack && d.fxStack.length ? d.fxStack[d.fxStack.length - 1] : null);
  const inGrave = (d, c) => !!c && !c.token && d.players[c.owner].grave.includes(c);
  const redefine = (name, def) => { delete DM.EFFECTS[N(name)]; define(name, def); };
  const EXODIA = ["Exodia the Forbidden One", "Right Arm of the Forbidden One", "Left Arm of the Forbidden One", "Right Leg of the Forbidden One", "Left Leg of the Forbidden One"];

  // ---------- Rules these cards need ----------
  // Effect properties read here: onlyBy (Special Summoned only by that card's effect), mustFusion (only by a Fusion
  // Summon), contact (Special Summoned from the Extra Deck by banishing its materials; not from the GY), unionAlsoEffect
  // (a Union destroyed instead of its monster by a card effect too). Player fields: xNoBewd (no Blue-Eyes attacks
  // this turn), xAct (the turn p last activated a card or effect), xLock (no activations this turn).
  const CONTACT = {};
  for (const n of ["XY-Dragon Cannon", "XYZ-Dragon Cannon", "XZ-Tank Cannon", "YZ-Tank Dragon"]) {
    const no = N(n);
    if (no && DM.FUSIONS[no]) { CONTACT[no] = DM.FUSIONS[no].slice(); delete DM.FUSIONS[no]; }
  }
  const contactZones = (d, p, no) => {
    const used = [];
    for (const m of CONTACT[no] || []) { const z = d.monsters(p).find((x) => !used.includes(x) && x.card.no === m && !x.card.token); if (!z) return null; used.push(z); }
    return used;
  };
  function patch(d) {
    const ss0 = d.specialSummon, ma0 = d.mainActions, ds0 = d.destroy, fu0 = d.flipUp, ca0 = d.canAttack, cact0 = d.canActivate, act0 = d.activate, aw0 = d.attackWith;
    d.specialSummon = async function (p, c, opts) {
      const e = effectOf(c.no);
      if (e && e.onlyBy) { const l = curLink(this); if (this.xBy !== e.onlyBy && !(l && l.card && !l.card.token && C.name(l.card.no) === e.onlyBy)) return null; }
      if (e && e.contact && !(opts && opts.byRule) && !c.xProper) return null;
      const z = await ss0.call(this, p, c, opts);
      if (z && e && e.contact && opts && opts.byRule) c.xProper = true;
      return z;
    };
    d.mainActions = function (p) {
      const acts = ma0.call(this, p);
      if (this.flags.toEnd === this.turn) return acts;
      const pl = this.players[p];
      if (pl.flags.noSummonTurn === this.turn || this.players[1 - p].flags.noSummonFor === this.turn || pl.flags.noSpecialSummon) return acts;
      const extra = [];
      for (const f of pl.fusion) { const e = effectOf(f.no); if (e && e.contact && contactZones(this, p, f.no) && !extra.some((a) => a.card.no === f.no)) extra.push({ act: "special-hand", card: f, label: "Special Summon " + C.name(f.no) }); }
      const at = acts.findIndex((a) => a.act === "battle" || a.act === "end");
      acts.splice(at < 0 ? acts.length : at, 0, ...extra);
      return acts;
    };
    d.destroy = async function (z, why, by) {
      const l = this.locate(z);
      if (l && l.i < 5 && why !== "battle") {
        const u = z.links.find((k) => k.kind === "equip" && k.from && k.from.data.union && this.locate(k.from) && (effectOf(k.from.card.no) || {}).unionAlsoEffect);
        if (u) { await this.destroy(u.from, "effect"); return false; }
      }
      return ds0.call(this, z, why, by);
    };
    d.attackWith = async function (p, att, target) { const was = this.xCurAtt; this.xCurAtt = att; try { return await aw0.call(this, p, att, target); } finally { this.xCurAtt = was; } };
    // (Paladin of White Dragon attacking a face-down monster: destroyed before it's flipped)
    d.flipUp = async function (z, how, noEffect) {
      const a = this.xCurAtt;
      if (how === "attacked" && a && this.locate(a) && a.faceUp && !a.negated && isName(a.card, "Paladin of White Dragon") && !z.faceUp && z.defense) { await this.destroy(z, "effect"); return; }
      return fu0.call(this, z, how, noEffect);
    };
    d.canAttack = function (z, p) {
      if (this.players[p].xNoBewd === this.turn && isName(z.card, "Blue-Eyes White Dragon")) return false;
      return ca0.call(this, z, p);
    };
    d.canActivate = function (p, c, a, ctx) { if (this.players[p].xLock === this.turn) return false; return cact0.call(this, p, c, a, ctx); };
    d.activate = async function (p, o, prev, ev) { const link = await act0.call(this, p, o, prev, ev); if (link) this.players[p].xAct = this.turn; return link; };
    return d;
  }
  const create0 = DM.create;
  DM.create = function () { return patch(create0.apply(this, arguments)); };

  // (Five-Headed Dragon: any 5 Dragon monsters)
  const FHD = N("Five-Headed Dragon");
  const ff0 = DM.fusionsFrom;
  DM.fusionsFrom = function (d, p, pool, filter) {
    const out = ff0.apply(this, arguments);
    for (const f of d.players[p].fusion) {
      if (f.no !== FHD || (filter && !filter(f)) || out.some((o) => o.fusion.no === FHD)) continue;
      const dr = pool.filter((c) => C.isMonster(c.no) && isDragon(c)).sort((a, b) => C.atk(a.no) - C.atk(b.no));
      if (dr.length >= 5) out.push({ fusion: f, materials: dr.slice(0, 5), choose: { from: dr, count: 5 } });
    }
    return out;
  };

  // Spell Counters placed when the Spell resolves (its activation negated: none).
  const onResolve = (after) => async (d, z, p, ev) => {
    if (ev.type !== "activated" || !ev.card || !C.isSpell(ev.card.no) || ev.from === "monster" || !ev.link || typeof ev.link.resolve !== "function") return;
    const l = ev.link, r0 = l.resolve;
    l.resolve = async (d2, l2) => {
      await r0(d2, l2);
      if (d2.locate(z) && SC.can(d2, z)) { await SC.add(d2, z, 1); if (after) await after(d2, z, ctl(d2, z), l2); }
    };
  };
  for (const n of ["Skilled White Magician", "Skilled Dark Magician", "Magical Marionette", "Royal Magical Library"]) define(n, { onEvent: onResolve() });
  redefine("Tower of Babel", { spellCounter: 4, activate: { stays: true, resolve: async () => {} },
    onEvent: onResolve(async (d, z, p, l) => { if (SC.n(z) >= 4 && (await d.destroy(z, "effect"))) await d.damage(l.p, 3000, "effect"); }) });

  // ---------- Monsters ----------
  define("8-Claws Scorpion", { battleStats: (d, z, p, o, attacking) => (attacking && o && o.defense && o.data.attackedFaceDown === d.turn ? { setAtk: 2400 } : null) });
  // (The Toons: no Life Points paid to attack, as their text has it now)
  for (const n of ["Toon Dark Magician Girl", "Toon Masked Sorcerer", "Toon Gemini Elf", "Toon Cannon Soldier", "Toon Goblin Attack Force"]) define(n, { attackCost: undefined });
  define("Toon Dark Magician Girl", { specialOnly: true, noAttackOnSummonTurn: undefined,
    specialFromHand: (d, p) => d.countOnField(N("Toon World"), p) > 0 && d.monsters(p).length > 0,
    specialCost: async (d, p) => { const z = await d.pickZone(p, "Tribute which monster?", (x, q) => q === p, { sides: [p], area: "monster", cancel: true }); if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; },
    canTarget: (d, att, p, z) => !d.monsters(1 - p).some(isToon) || isToon(z) });
  define("Toon Masked Sorcerer", { onBattleDamage: async (d, z, p) => { await d.drawCards(p, 1); } });
  define("Toon Gemini Elf", { onBattleDamage: async (d, z, p) => { await H.discardRandom(d, 1 - p); } });
  define("Toon Cannon Soldier", { ignition: { repeatable: true, can: (d, ctx) => d.monsters(ctx.p).length > 0,
    cost: async (d, link) => { const z = await d.pickZone(link.p, "Tribute which monster?", (x, q) => q === link.p, { sides: [link.p], area: "monster", cancel: true }); if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; },
    resolve: async (d, link) => d.damage(1 - link.p, 500, "effect") } });
  define("Toon Goblin Attack Force", { afterAttack: async (d, z) => { z.data.toDefenseAtEnd = true; } });
  define("Five-Headed Dragon", { mustFusion: true, battleImmune: (d, z, p, o) => !!o && [ATTR.DARK, ATTR.EARTH, ATTR.WATER, ATTR.FIRE, ATTR.WIND].includes(d.stats(o).attribute) });
  define("Dragon Master Knight", { mustFusion: true, selfStats: (d, z) => ({ atk: 500 * up(d, ctl(d, z)).filter((x) => x !== z && isDragon(x.card)).length }) });
  define("Gravekeeper's Spy", { flip: async (d, link) => {
    if (!H.canSummonHere(d, link.p)) return;
    const c = await d.pickCard(link.p, "Special Summon which Gravekeeper's monster?", H.deckMon(d, link.p, (x) => C.name(x.no).includes("Gravekeeper's") && C.atk(x.no) <= 1500));
    if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } });
  // (the Unions: Y-Dragon Head and Z-Metal Tank also take a card effect's destruction for their monster; Koitsu gives ATK only)
  define(["Y-Dragon Head", "Z-Metal Tank"], { unionAlsoEffect: true });
  define("Koitsu", union(["Aitsu"], { atk: 3000 }, { givesPiercing: true }));
  // (XY-Dragon Cannon and its kin: from the Extra Deck by banishing their materials you control)
  const contact = (prompt, filter, area) => ({ contact: true, noGraveSpecial: true,
    specialFromHand: (d, p, c) => !!contactZones(d, p, c.no),
    specialCost: async (d, p, c) => { const zs = contactZones(d, p, c.no); if (!zs) return false; for (const z of zs) await d.banish(z.card, "cost"); return true; },
    ignition: { repeatable: true, can: (d, ctx) => handCount(d, ctx) > 0 && H.any(d, (z, q) => filter(z, q, ctx.p), { sides: [1 - ctx.p], area }),
      cost: discardCost(),
      target: (d, link) => H.target(d, link, prompt, (z, q) => filter(z, q, link.p), { sides: [1 - link.p], area }),
      resolve: async (d, link) => { const z = t0(d, link); if (z && filter(z, ctl(d, z), link.p)) await d.destroy(z, "effect"); } } });
  define("XY-Dragon Cannon", contact("Destroy which face-up Spell/Trap?", (z, q, p) => q !== p && z.faceUp, "spell"));
  define("XYZ-Dragon Cannon", contact("Destroy which card?", (z, q, p) => q !== p, null));
  define("XZ-Tank Cannon", contact("Destroy which face-down Spell/Trap?", (z, q, p) => q !== p && !z.faceUp, "spell"));
  define("YZ-Tank Dragon", contact("Destroy which face-down monster?", (z, q, p) => q !== p && !z.faceUp, "monster"));
  define("King's Knight", { onSummon: async (d, z, p, how) => {
    if (how !== "normal" || !up(d, p).some((x) => isName(x.card, "Queen's Knight"))) return;
    await DM.REST.summonFromDeck(d, p, (c) => isName(c, "Jack's Knight"), "Special Summon Jack's Knight from your Deck?"); } });
  define("Drillago", { directAttack: (d, z, p) => d.monsters(1 - p).length > 0 && d.allZones(1 - p).every((x) => { const l = d.locate(x); return l.i < 5 && x.faceUp && d.atkOf(x) >= 1600; }) });
  define("Paladin of White Dragon", { ignition: { can: (d, ctx) => mine(d, ctx) && !d.players[ctx.p].flags.noSpecialSummon && piles(d, ctx.p, ["hand", "deck"]).some((x) => isName(x, "Blue-Eyes White Dragon")),
    cost: async (d, link) => { await d.sendToGrave(link.card, "tribute"); return true; },
    resolve: async (d, link) => {
      const c = await d.pickCard(link.p, "Special Summon which Blue-Eyes White Dragon?", piles(d, link.p, ["hand", "deck"]), (x) => isName(x, "Blue-Eyes White Dragon"));
      if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); d.players[link.p].xNoBewd = d.turn; } } });
  define("Dark Paladin", { mustFusion: true,
    selfStats: (d, z) => ({ atk: 500 * (up(d).filter((x) => isDragon(x.card)).length + [0, 1].reduce((n, q) => n + d.players[q].grave.filter((c) => C.isMonster(c.no) && isDragon(c)).length, 0)) }),
    quick: { when: "chain", speed: 2, can: (d, ctx) => !!ctx.last && !ctx.last.fromMonster && !!ctx.last.card && !ctx.last.card.token && C.isSpell(ctx.last.card.no) && !ctx.last.negated && handCount(d, ctx) > 0,
      cost: discardCost(),
      resolve: async (d, link) => { const z = link.zone, v = link.prev; if (!v || !z || !d.locate(z) || !z.faceUp) return; v.negated = true; if (v.zone && d.locate(v.zone)) await d.destroy(v.zone, "negated"); } } });
  define("Old Vindictive Magician", { flip: async (d, link) => {
    const z = await d.pickZone(link.p, "Destroy which of your opponent's monsters?", (x, q) => q !== link.p, { sides: [1 - link.p], area: "monster" }); if (z) await d.destroy(z, "effect"); } });
  define("Shinato, King of a Higher Plane", { onDestroyByBattle: async (d, z, p, v) => { if (v && v.defense && inGrave(d, v.card)) await d.damage(1 - p, C.atk(v.card.no), "effect"); } });
  define("Dark Flare Knight", { battleDamage: (d, z, zp, r) => (r === zp ? { n: 0 } : null),
    onDestroyed: async (d, z, p, why) => {
      if (why !== "battle" || !inGrave(d, z.card) || !H.canSummonHere(d, p)) return;
      const c = await d.pickCard(p, "Special Summon Mirage Knight from your hand or Deck.", piles(d, p, ["hand", "deck"]), (x) => isName(x, "Mirage Knight"));
      const was = d.xBy; d.xBy = "Dark Flare Knight";
      try { if (c) await ss(d, p, c); } finally { d.xBy = was; }
      DM.shuffle(d, d.players[p].deck); } });
  define("Mirage Knight", { onlyBy: "Dark Flare Knight" });
  define("Dark Magician Knight", { onlyBy: "Knight's Title", onSummon: async (d, z, p, how) => {
    if (how !== "special") return;
    const t = await d.pickZone(p, "Destroy which card?", () => true); if (t) await d.destroy(t, "effect"); } });
  // (Exodia Necross: by Contract with Exodia only; not destroyed by battle or Spells and Traps; 500 ATK more each of your
  // Standby Phases; destroyed when the 5 pieces aren't all in your GY)
  define("Exodia Necross", { onlyBy: "Contract with Exodia",
    cannotBeDestroyed: (d, z, p, why) => { if (z.data.necrossSelf) return false; if (why === "battle") return true; const l = curLink(d); return !!l && !l.fromMonster && isST(l.card); },
    selfStats: (d, z) => ({ atk: 500 * (z.counters.necross || 0) }),
    standby: async (d, z, p) => { if (d.turnPlayer === p) { z.counters.necross = (z.counters.necross || 0) + 1; await d.emit({ type: "counter", zone: z, n: z.counters.necross }); } },
    onEvent: async (d, z, p) => {
      if (z.data.necrossSelf || !d.locate(z) || EXODIA.every((n) => d.players[p].grave.some((c) => isName(c, n)))) return;
      z.data.necrossSelf = true; try { await d.destroy(z, "effect"); } finally { z.data.necrossSelf = false; } } });
  define("Tsukuyomi", { onSummon: async (d, z, p, how) => { if (how !== "normal") return; z.data.tsuTurn = d.turn; await tsukuyomi(d, p); },
    flip: async (d, link) => { if (link.zone) link.zone.data.tsuTurn = d.turn; await tsukuyomi(d, link.p); },
    endPhase: async (d, z) => { if (z.data.tsuTurn === d.turn && d.locate(z)) { z.data.tsuTurn = null; await d.toHand(z.card, "spirit"); } } });
  async function tsukuyomi(d, p) { const t = await d.pickZone(p, "Change which face-up monster to face-down Defense Position?", (x) => x.faceUp, { area: "monster" }); if (t) await d.flipDown(t); }
  define("Legendary Flame Lord", Object.assign({}, SC.watch(true), { ignition: { repeatable: true, can: (d, ctx) => SC.n(ctx.zone) >= 3 && mons(d).some((x) => x !== ctx.zone),
    cost: async (d, link) => { link.zone.counters.spell -= 3; return true; }, resolve: async (d, link) => H.destroyAll(d, mons(d).filter((x) => x !== link.zone)) } }));
  define("Dark Master - Zorc", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d), resolve: async (d, link) => {
    const r = await H.die(d, link.p), q = 1 - link.p;
    if (r <= 2) await H.destroyAll(d, d.monsters(q));
    else if (r <= 5) { const z = await d.pickZone(link.p, "Destroy which of your opponent's monsters?", (x, s) => s === q, { sides: [q], area: "monster" }); if (z) await d.destroy(z, "effect"); }
    else await H.destroyAll(d, d.monsters(link.p)); } } });
  define("Des Kangaroo", { onAttacked: async (d, z, p, att, res) => { if (z.defense && d.atkOf(att) < d.defOf(z)) res.attackerDies = true; } });
  define("Chaos Emperor Dragon - Envoy of the End", { ignition: {
    can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.players[ctx.p].lp > 1000 && d.players[ctx.p].xAct !== d.turn,
    cost: async (d, link) => { await d.payLp(link.p, 1000); d.players[link.p].xLock = d.turn; return true; },
    resolve: async (d, link) => {
      const q = 1 - link.p, sent = [];
      for (const r of [0, 1]) { for (const c of d.players[r].hand.slice()) { await d.sendToGrave(c, "effect"); sent.push(c); } for (const z of d.allZones(r).slice()) if (d.locate(z)) { const c = z.card; await d.sendToGrave(c, "effect"); sent.push(c); } }
      const n = sent.filter((c) => !c.token && c.owner === q && d.players[q].grave.includes(c)).length;
      await d.damage(q, 300 * n, "effect"); } } });

  // ---------- Spells and Traps ----------
  define("Precious Cards from Beyond", { onEvent: async (d, z, p, ev) => { if (ev.type === "summoned" && ev.p === p && ev.zone && (ev.zone.data.tributes || 0) >= 2) await d.drawCards(p, 2); } });
  const equipCards = (d) => H.st(d).filter((z) => z.faceUp && ((z.equippedTo && d.locate(z.equippedTo)) || (C.isSpell(z.card.no) && C.icon(z.card.no) === ICON.EQUIP)));
  define("Disarmament", { activate: { can: (d) => equipCards(d).length > 0, resolve: async (d) => H.destroyAll(d, equipCards(d)) } });
  // (Coffin Seller: once for the monsters an effect sends together, from anywhere, to the opponent's GY)
  define("Coffin Seller", { onEvent: async (d, z, p, ev) => {
    if (ev.type !== "sent-to-grave" || !ev.card || ev.card.token || !C.isMonster(ev.card.no) || ev.card.owner === p) return;
    const l = curLink(d);
    if (l && z.data.coffinLink === l) return;
    z.data.coffinLink = l;
    await d.damage(1 - p, 300, "effect"); } });
  const SUMMONS = ["summoned", "flip-summoned", "special-summoned"];
  const lowAtk = (d, ev) => !!ev && !!ev.zone && !!d.locate(ev.zone) && ev.zone.faceUp && d.atkOf(ev.zone) <= 1000;
  define("Chain Disappearance", { activate: { when: SUMMONS, can: (d, ctx) => lowAtk(d, ctx.event), resolve: async (d, link) => {
    const z = link.event.zone; if (!lowAtk(d, link.event)) return;
    const q = 1 - link.p, no = z.card.no, tk = !!z.card.token;
    await d.banish(z.card, "effect");
    if (!tk) for (const c of d.players[q].hand.concat(d.players[q].deck).filter((c) => c.no === no)) await d.banish(c, "effect");
    DM.shuffle(d, d.players[q].deck); } } });
  // (Contract with the Abyss: Tributes whose Levels add up exactly)
  const ritualLevel = (d, c) => { const l = d.zoneOf(c); return l ? d.stats(l.z).level : C.level(c.no); };
  const sumTo = (levels, n) => { let can = new Set([0]); for (const v of levels) { const nx = new Set(can); for (const s of can) if (s + v <= n) nx.add(s + v); can = nx; } return can.has(n); };
  const abyssPool = (d, p, m) => d.players[p].hand.filter((c) => c !== m && C.isMonster(c.no)).concat(d.monsters(p).map((z) => z.card));
  const abyssOk = (d, p, m) => C.kind(m.no) === "ritual" && C.attribute(m.no) === ATTR.DARK && sumTo(abyssPool(d, p, m).map((c) => ritualLevel(d, c)), C.level(m.no));
  define("Contract with the Abyss", { activate: {
    can: (d, ctx) => (H.canSummonHere(d, ctx.p) || d.monsters(ctx.p).length > 0) && d.players[ctx.p].hand.some((m) => abyssOk(d, ctx.p, m)),
    resolve: async (d, link) => {
      const p = link.p, m = await d.pickCard(p, "Ritual Summon which monster?", d.players[p].hand, (c) => abyssOk(d, p, c));
      if (!m) return;
      const need = C.level(m.no), pool = abyssPool(d, p, m), picked = [];
      let total = 0;
      while (total < need) {
        const rest = (x) => pool.filter((c) => c !== x && !picked.includes(c)).map((c) => ritualLevel(d, c));
        const c = await d.pickCard(p, "Tribute monsters whose Levels add up to exactly " + need + " (" + total + " so far).", pool, (x) => !picked.includes(x) && total + ritualLevel(d, x) <= need && sumTo(rest(x), need - total - ritualLevel(d, x)));
        if (!c) return;
        picked.push(c); total += ritualLevel(d, c);
      }
      for (const c of picked) await d.sendToGrave(c, "tribute");
      await d.specialSummon(p, m, { how: "ritual", position: "choose" }); } } });
})();

// (The OCG's cards beyond the others, from Yugipedia's set lists: the Egyptian Gods, the Second National Tournament's
// prize cards, Final Attack Orders.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, define = DM.define, N = DM.numberOf;
  const { isName, tributeCost, mine } = DM.REST;
  const up = H.up, ctl = (d, z) => d.controllerOf(z);
  const fx = (z) => (z && !z.card.token && DM.effectOf(z.card.no)) || {};

  // ----- The Egyptian Gods: three Tributes, never Set; their Normal Summon not negated, nothing activated in answer;
  // Special Summoned (Slifer, Obelisk), back to the Graveyard in the End Phase -----
  const god = (extra) => Object.assign({ tributes: 3, noNormalSet: true, noChainOnSummon: true,
    onSummon: async (d, z, p, how) => { if (how === "special") z.data.godSpecial = true; },
    endPhase: async (d, z) => { if (z.data.godSpecial && d.locate(z)) await d.sendToGrave(z.card, "effect"); } }, extra);
  // Slifer: 1000 ATK and DEF a card in your hand; a monster summoned to your opponent's field in Attack Position loses
  // 2000 ATK, and is destroyed if that brings it to 0
  define("Slifer the Sky Dragon", god({
    selfStats: (d, z) => { const n = 1000 * d.players[ctl(d, z)].hand.length; return { atk: n, def: n }; },
    onEvent: async (d, z, p, ev) => {
      if (!/^(summoned|flip-summoned|special-summoned)$/.test(ev.type) || ev.p === p || !ev.zone || !d.locate(ev.zone) || !ev.zone.faceUp || ev.zone.defense) return;
      const t = ev.zone, before = d.atkOf(t);
      t.links.push({ kind: "self", from: z, stats: { atk: -2000 } });
      await d.emit({ type: "stat", zone: t, atk: -2000 });
      if (before > 0 && d.atkOf(t) === 0 && d.locate(t)) await d.destroy(t, "effect");
    } }));
  // Obelisk: never targeted; Tribute 2 monsters: destroy all your opponent's monsters, and it can't attack that turn
  define("Obelisk the Tormentor", god({ noTarget: true,
    ignition: { repeatable: true, can: (d, ctx) => mine(d, ctx) && d.monsters(ctx.p).filter((x) => x !== ctx.zone).length >= 2 && d.monsters(1 - ctx.p).length > 0,
      cost: async (d, link) => (await tributeCost(null, "Tribute a monster (1 of 2).")(d, link)) && (await tributeCost(null, "Tribute a monster (2 of 2).")(d, link)),
      resolve: async (d, link) => {
        if (link.zone && d.locate(link.zone)) link.zone.data.cannotAttackTurn = d.turn;
        await H.destroyAll(d, d.monsters(1 - link.p).slice());
      } } }));
  // Ra: never Special Summoned; on its Normal Summon, pay all but 100 LP for that much ATK and DEF; pay 1000 LP to
  // destroy a monster
  define("The Winged Dragon of Ra", god({ noSpecial: true,
    onSummon: async (d, z, p, how) => {
      const lp = d.players[p].lp;
      if (how !== "normal" || lp <= 100 || !(await d.yesNo(p, "Pay " + (lp - 100) + " LP for The Winged Dragon of Ra to gain that much ATK and DEF?"))) return;
      await d.payLp(p, lp - 100);
      z.links.push({ kind: "self", stats: { atk: lp - 100, def: lp - 100 } });
    },
    ignition: { repeatable: true, can: (d, ctx) => mine(d, ctx) && d.players[ctx.p].lp > 1000 && up(d).some((x) => x !== ctx.zone),
      cost: async (d, link) => { await d.payLp(link.p, 1000); return true; },
      target: (d, link) => H.target(d, link, "Destroy which monster?", (z) => z !== link.zone, { area: "monster" }),
      resolve: async (d, link) => { const t = H.t(d, link); if (t) await d.destroy(t, "effect"); } } }));
  // (the rules they need: no Normal Set; nothing activated in answer to their Normal Summon; Obelisk not targeted)
  const create0 = DM.create;
  DM.create = function (opts) {
    const d = create0.call(this, opts), ma0 = d.mainActions, ev0 = d.event;
    d.mainActions = function (p) { return ma0.call(this, p).filter((a) => !(a.act === "set-monster" && a.card && fx({ card: a.card }).noNormalSet)); };
    d.event = async function (ev) {
      if (ev && ev.type === "summoned" && ev.zone && fx(ev.zone).noChainOnSummon && !this.over) return this.notify(ev);
      return ev0.call(this, ev);
    };
    return d;
  };
  const target0 = H.target;
  H.target = function (d, link, prompt, filter, opts) {
    return target0.call(this, d, link, prompt, (z, q, i) => (!filter || filter(z, q, i)) && !(i < 5 && z.faceUp && !z.negated && fx(z).noTarget), opts);
  };

  // ----- The Second National Tournament's prize cards -----
  // Masahiro the Dark Clown: FLIP: its effect becomes a Flip monster's in your Graveyard (that effect, resolved as it)
  define("Masahiro the Dark Clown", { flip: async (d, link) => {
    const pool = d.players[link.p].grave.filter((c) => C.isMonster(c.no) && fx({ card: c }).flip && !isName(c, "Masahiro the Dark Clown"));
    if (!pool.length || !(await d.yesNo(link.p, "Use the effect of a Flip monster in your Graveyard?"))) return;
    const c = await d.pickCard(link.p, "Which Flip monster's effect?", pool);
    if (c) await fx({ card: c }).flip(d, link);
  } });
  // Tomohiro the Mountain Warrior: Tribute 1 monster: 500 damage to your opponent
  define("Tomohiro the Mountain Warrior", { ignition: { repeatable: true, can: (d, ctx) => mine(d, ctx) && d.monsters(ctx.p).length > 0,
    cost: async (d, link) => { const z = await d.pickZone(link.p, "Tribute which monster?", (x, q) => q === link.p, { sides: [link.p], area: "monster", cancel: true }); if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; },
    resolve: async (d, link) => d.damage(1 - link.p, 500, "effect") } });

  // ----- Final Attack Orders: every face-up monster in Attack Position, and no battle position changes -----
  const fao = (d) => [0, 1].some((q) => d.allZones(q).some((z) => z.faceUp && !z.negated && d.live(z) && isName(z.card, "Final Attack Orders")));
  const allAttack = async (d) => { for (const z of up(d).filter((x) => x.defense)) await d.changePosition(z, false); };
  define("Final Attack Orders", { activate: { stays: true, resolve: async (d) => allAttack(d) },
    onEvent: async (d, z, p, ev) => { if (/summoned|flip|position/.test(ev.type) && d.live(z)) await allAttack(d); } });
  const create1 = DM.create;
  DM.create = function (opts) {
    const d = create1.call(this, opts), ma0 = d.mainActions, cp0 = d.changePosition;
    d.mainActions = function (p) { const a = ma0.call(this, p); return fao(this) ? a.filter((x) => x.act !== "position" && x.act !== "flip-summon") : a; };
    d.changePosition = async function (z, defense) { if (defense && z.faceUp && fao(this)) return; return cp0.call(this, z, defense); };
    return d;
  };
})();

// (Cards beyond GX's: 2003-2005's, part 1.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo, ICON = DM.ICON;
  const { isName, show, tributeCost, umi, mine, noop, ss, piles } = DM.REST;
  const up = H.up, mons = H.mons, t0 = H.t, isMon = H.isMon, effectOf = DM.effectOf;
  const isT = (no, t) => C.type(no) === typeNo(t);
  const isMonCard = (c) => C.isMonster(c.no) && !C.isExtra(c.no);
  const inGrave = (d, c) => !!c && !c.token && d.players[c.owner].grave.includes(c);
  const ctl = (d, z) => d.controllerOf(z);
  const typeOf = (c) => (c.token ? c.token.type : C.type(c.no));
  const normal = (c, lv) => !!c && !c.token && C.kind(c.no) === "normal" && (lv == null || C.level(c.no) <= lv);
  const upNormal = (z, lv) => !!z && z.faceUp && normal(z.card, lv);
  const orig = (z) => { const tk = z.card.token, b = z.data.base || {}; return { atk: b.atk != null ? b.atk : tk ? tk.atk : C.atk(z.card.no), def: b.def != null ? b.def : tk ? tk.def : C.def(z.card.no) }; };
  const sanctuary = (d, p) => d.countOnField(N("The Sanctuary in the Sky"), p) > 0;
  // (a Spell's own activation, or a Spell's effect resolving)
  const spellLink = (l) => !!l && !!l.card && !l.card.token && !l.fromMonster && C.isSpell(l.card.no);
  const resolving = (d) => d.resolvingLink || null;
  // (an opponent's card effect resolving now: the discards that say "by your opponent's card")
  const byOpp = (d, p) => !!resolving(d) && resolving(d).p !== p;
  const mill = async (d, q, n) => { for (const c of d.players[q].deck.slice(0, n)) await d.sendToGrave(c, "effect"); };
  const another = (type) => (d, s, q, z) => z === s && up(d, q).some((x) => x !== s && H.isType(d, x, type));
  // (Spells can't target it, destroy it or otherwise touch it while cond holds)
  const spellProof = (cond) => ({ spellImmune: cond, immuneTo: (d, z, p, l) => spellLink(l) && cond(d, z) });
  // (sent from the hand to the GY by the opponent's effect)
  const handToGraveByOpp = (fn) => ({ onToGrave: async (d, c, p, from, why) => { if (from && from.pile === "hand" && !["cost", "hand-limit", "tribute", "fusion"].includes(why) && byOpp(d, p)) await fn(d, c, p); } });
  // (an Equip Spell from the GY onto this monster, with the equip's own effect: that of part 2's Chopman)
  async function equipFromGrave(d, z, p) {
    const fits = (x) => { const e = effectOf(x.no); return C.isSpell(x.no) && C.icon(x.no) === ICON.EQUIP && e && e.activate && (!e.equipOk || e.equipOk(d, z, p)); };
    if (!d.players[p].grave.some(fits) || d.freeSpellZone(p) < 0) return;
    const c = await d.pickCard(p, "Equip which Equip Spell Card from your Graveyard?", d.players[p].grave, fits, { min: 0 });
    const i = d.freeSpellZone(p);
    if (!c || i < 0 || !d.locate(z) || !z.faceUp) return;
    d.take(c);
    const nz = DM.newZone(c, { faceUp: true, placedTurn: d.turn });
    d.players[p].zones[i] = nz;
    try { await effectOf(c.no).activate.resolve(d, { p, card: c, zone: nz, targets: [z], data: {}, event: null }); } catch (err) { if (err !== DM.STOP) throw err; }
    if (d.locate(nz) && !nz.equippedTo) await d.sendToGrave(c, "used");
  }
  // (what a Spell's target could be instead: its own filter, kept by the Traps' H.target as link.xPick)
  const retargets = (d, l, except) => {
    const k = l && l.xPick, out = [];
    if (!k) return out;
    const a = k.opts && k.opts.area;
    for (const q of (k.opts && k.opts.sides) || [0, 1]) for (let i = 0; i < 11; i++) {
      const z = d.players[q].zones[i];
      if (!z || z === l.targets[0] || z === l.zone || z === except || (a && (a === "monster" ? i >= 5 : a === "spell" ? i < 5 : false))) continue;
      try { if (k.filter(z, q, i)) out.push(z); } catch (e) { /* (a filter that no longer applies) */ }
    }
    return out;
  };
  const normalOk = (d, p, c, e) => {
    const pl = d.players[p], noSummon = pl.flags.noSummonTurn === d.turn || d.players[1 - p].flags.noSummonFor === d.turn;
    return !pl.normalSummoned && !pl.flags.noNormalSummon && !noSummon && !(e && e.specialOnly) && C.kind(c.no) !== "ritual"
      && !(e && e.needsField && !d.countOnField(N(e.needsField))) && !(e && e.normalIf && !e.normalIf(d, p));
  };

  // ---------- What these cards need of each duel ----------
  // Effect properties read here: e51GraveProtector (monsters destroyed by battle shuffled into the Deck), e51SpellEcon
  // (no LP paid to activate Spells), e51Anubis (the GY out of effects' reach), e51DustBarrier, e51Desert. Player
  // flags: e51Jam (no Spells until that turn's end), e51Dora (a Normal Summon a Level lower that burns). d.e51End:
  // what this turn's End Phase does (Thousand Energy, Triangle Power).
  const amplified = (d, z) => isName(z.card, "Jinzo") && z.links.some((l) => l.kind === "equip" && l.from && d.locate(l.from) && isName(l.from.card, "Amplifier"));
  const dustBarred = (d, z, l) => !!l && spellLink(l) && isMon(d, z) && upNormal(z) && [0, 1].some((q) => q !== l.p && d.allZones(q).some((s) => { const e = d.live(s); return e && e.e51DustBarrier; }));
  const posLocked = (d, z) => {
    const g = z.data.e51Unhappy, j = z.data.e51Desert;
    return (!!g && d.locate(g) && !!d.live(g) && !g.defense) || (!!j && d.locate(j) && !!d.live(j));
  };
  const create0 = DM.create;
  DM.create = function (opts) {
    const d = create0.apply(this, arguments);
    const o = {};
    for (const k of ["negated", "responses", "mainActions", "doAction", "canActivate", "activate", "payLp", "sendToGrave", "destroy", "summoned", "pickCards", "emit"]) o[k] = d[k];
    d.e51End = [];
    Object.assign(d, {
      // (Amplifier: Jinzo doesn't negate its controller's Traps; whose Trap it is: its zone's, or the player asking)
      negated(kind, except) {
        if (kind !== "trap") return o.negated.call(this, kind, except);
        const p = except && this.locate(except) ? this.controllerOf(except) : this.e51P;
        for (const q of [0, 1]) for (const z of this.allZones(q)) {
          if (!z.faceUp || z.negated || z === except) continue;
          const e = effectOf(z.card.no);
          if (e && e.negatesTraps && !(p != null && q === p && amplified(this, z))) return true;
        }
        return false;
      },
      responses(p, ev, chain) { const was = this.e51P; this.e51P = p; try { return o.responses.call(this, p, ev, chain); } finally { this.e51P = was; } },
      mainActions(p) {
        const was = this.e51P; this.e51P = p;
        let acts;
        try { acts = o.mainActions.call(this, p); } finally { this.e51P = was; }
        // (The Unhappy Girl, Judgment of the Desert: no change of battle position)
        acts = acts.filter((a) => !(a.act === "position" && posLocked(this, a.zone)));
        // (Double Coston: 2 Tributes for a DARK monster's Tribute Summon)
        const k = !this.liveWith("noTributes") && this.monsters(p).find((z) => isName(z.card, "Double Coston") && !z.data.cannotTribute);
        if (k) {
          const extra = [];
          for (const c of this.players[p].hand) {
            const e = effectOf(c.no);
            if (!isMonCard(c) || C.attribute(c.no) !== ATTR.DARK || DM.tributesFor(c.no, e) !== 2 || (e && e.tributeFilter) || !normalOk(this, p, c, e)) continue;
            extra.push({ act: "summon", card: c, tributes: 1, coston: k, label: "Summon " + C.name(c.no) + " (Double Coston as 2 Tributes)" });
            if (!(e && e.noNormalSet)) extra.push({ act: "set-monster", card: c, tributes: 1, coston: k, label: "Set " + C.name(c.no) + " (Double Coston as 2 Tributes)" });
          }
          const at = acts.findIndex((a) => a.act === "battle" || a.act === "end");
          acts.splice(at < 0 ? acts.length : at, 0, ...extra);
        }
        return acts;
      },
      async doAction(p, a) {
        if (!a || !a.coston) return o.doAction.call(this, p, a);
        const saved = this.monsters(p).map((z) => [z, z.data.cannotTribute]);
        for (const [z] of saved) if (z !== a.coston) z.data.cannotTribute = true;
        try { return await o.doAction.call(this, p, a); } finally { for (const [z, v] of saved) z.data.cannotTribute = v; }
      },
      // (Sonic Jammer)
      canActivate(p, c, a, ctx) { if (C.isSpell(c.no) && this.players[p].flags.e51Jam >= this.turn) return false; return o.canActivate.call(this, p, c, a, ctx); },
      // (Spell Economics: the LP a Spell's activation costs, not paid)
      async activate(p, opt, prev, ev) {
        const was = this.e51Act; this.e51Act = { p, spell: C.isSpell(opt.card.no) && opt.from !== "monster" && opt.from !== "hand-quick" && opt.from !== "hand-effect" };
        try { return await o.activate.call(this, p, opt, prev, ev); } finally { this.e51Act = was; }
      },
      async payLp(p, n) { const A = this.e51Act; if (A && A.spell && A.p === p && this.liveWith("e51SpellEcon", p)) return; return o.payLp.call(this, p, n); },
      // (Grave Protector)
      async sendToGrave(c, why) {
        if (why === "battle" && !c.token && this.zoneOf(c) && this.liveWith("e51GraveProtector")) { const l = this.zoneOf(c); await this.toDeck(c, "shuffle", "effect"); return { zone: l.i, p: l.p, z: l.z }; }
        return o.sendToGrave.call(this, c, why);
      },
      // (Dust Barrier)
      async destroy(z, why, by) { if (why !== "battle" && dustBarred(this, z, resolving(this))) return false; return o.destroy.call(this, z, why, by); },
      // (Dora of Fate: the Normal Summon a Level lower)
      async summoned(p, z, how) {
        await o.summoned.call(this, p, z, how);
        const f = this.players[p].flags;
        if (how !== "normal" || !f.e51Dora || this.over || !this.locate(z)) return;
        for (const x of f.e51Dora.filter((x) => x.turn === this.turn && x.level - 1 === this.stats(z).level)) {
          f.e51Dora.splice(f.e51Dora.indexOf(x), 1);
          await this.damage(1 - p, 500 * x.level, "effect");
        }
      },
      // (The End of Anubis: an effect resolving finds nothing in a Graveyard to pick)
      async pickCards(p, prompt, list, filter, opts2) {
        if (resolving(this) && list.length && list.every((c) => [0, 1].some((q) => this.players[q].grave.includes(c))) && this.liveWith("e51Anubis")) { await this.emit({ type: "negate", card: resolving(this).card }); return []; }
        return o.pickCards.call(this, p, prompt, list, filter, opts2);
      },
      async emit(ev) {
        await o.emit.call(this, ev);
        if (ev.type === "phase" && ev.phase === "end" && this.e51End.length) {
          const due = this.e51End.filter((t) => t.turn === this.turn);
          this.e51End = this.e51End.filter((t) => t.turn > this.turn);
          for (const t of due) if (!this.over) await t.fn(this);
        }
      }
    });
    return d;
  };
  // (Dust Barrier: the opponent's Spells can't target the Normal Monsters)
  const target0 = H.target;
  H.target = function (d, link, prompt, filter, opts) { return target0.call(this, d, link, prompt, (z, q, i) => (!filter || filter(z, q, i)) && !(i < 5 && dustBarred(d, z, link)), opts); };
  // (The End of Anubis: the effects that activate in the Graveyard)
  for (const e of Object.values(DM.EFFECTS)) for (const k of ["graveStandby", "graveEnd", "graveBattleEnd"]) {
    const f = e[k];
    if (typeof f === "function") e[k] = async function (d) { if (d.liveWith("e51Anubis")) return; return f.apply(this, arguments); };
  }

  // ---------- Spells ----------
  define("Dimension Fusion", { activate: {
    can: (d, ctx) => (d.players[ctx.p].lp > 2000 || !!d.liveWith("e51SpellEcon", ctx.p)) && [0, 1].some((q) => d.players[q].banished.some((c) => C.isMonster(c.no)) && H.canSummonHere(d, q)),
    cost: async (d, link) => { await d.payLp(link.p, 2000); return true; },
    resolve: async (d, link) => {
      for (const q of [link.p, 1 - link.p]) {
        const tried = [];
        while (H.canSummonHere(d, q) && !d.over) {
          const pool = d.players[q].banished.filter((c) => C.isMonster(c.no) && !tried.includes(c));
          if (!pool.length) break;
          const c = await d.pickCard(q, "Special Summon which of your removed monsters?", pool);
          if (!c) break;
          tried.push(c);
          await ss(d, q, c);
        }
      } } } });
  define("Jade Insect Whistle", { activate: { resolve: async (d, link) => {
    const q = 1 - link.p, pl = d.players[q];
    const c = await d.pickCard(q, "Put which Insect from your Deck on top of it?", pl.deck, (x) => isMonCard(x) && isT(x.no, "Insect"));
    DM.shuffle(d, pl.deck);
    if (c) { pl.deck.splice(pl.deck.indexOf(c), 1); pl.deck.unshift(c); await d.emit({ type: "to-deck", card: c, why: "effect" }); } } } });
  define("Amplifier", Object.assign(DM.equip((d, z) => isName(z.card, "Jinzo"), null), {
    onLeave: async (d, z) => { const m = z.equippedTo; if (m && d.locate(m)) await d.destroy(m, "effect"); } }));
  define("Opti-Camouflage Armor", Object.assign(DM.equip((d, z) => H.lvl(d, z) === 1, null), { givesDirect: true }));
  DM.EFFECTS[N("Opti-Camouflage Armor")].equipOk = (d, z) => H.lvl(d, z) === 1;
  DM.EFFECTS[N("Amplifier")].equipOk = (d, z) => isName(z.card, "Jinzo");
  define("Enemy Controller", { activate: {
    can: (d, ctx) => up(d, 1 - ctx.p).length > 0,
    cost: async (d, link) => {
      const opts = [{ label: "Change its battle position", v: 1 }];
      if (d.monsters(link.p).length) opts.push({ label: "Tribute 1 monster: take control of it until the End Phase", v: 2 });
      const o = opts.length > 1 ? await d.choose(link.p, "Enemy Controller:", opts) : opts[0];
      link.data.mode = o ? o.v : 1;
      return link.data.mode === 1 || tributeCost()(d, link);
    },
    target: (d, link) => H.target(d, link, "Which of your opponent's face-up monsters?", (z, q) => q !== link.p && z.faceUp, { sides: [1 - link.p], area: "monster" }),
    resolve: async (d, link) => {
      const t = t0(d, link);
      if (!t || !t.faceUp) return;
      if (link.data.mode !== 2) { await d.changePosition(t, !t.defense); return; }
      if (await d.takeControl(t, link.p)) t.data.returnAtEnd = { to: 1 - link.p, turn: d.turn }; } } });
  define("Weapon Change", { activate: Object.assign({ stays: true }, noop),
    standby: async (d, z, p) => {
      const f = (x) => H.isType(d, x, "Warrior") || H.isType(d, x, "Machine");
      if (d.turnPlayer !== p || d.players[p].lp <= 700 || !up(d, p).some(f) || !(await d.yesNo(p, "Pay 700 LP to switch a Warrior's or Machine's ATK and DEF (Weapon Change)?"))) return;
      await d.payLp(p, 700);
      const t = await d.pickZone(p, "Switch the ATK and DEF of which monster?", (x, q) => q === p && f(x), { sides: [p], area: "monster" });
      if (t) { const a = d.atkOf(t), b = d.defOf(t); t.links.push({ kind: "self", stats: { setAtk: b, setDef: a }, until: d.turn + 1 }); } } });
  define("Shrink", { activate: {
    target: (d, link) => H.target(d, link, "Halve the original ATK of which monster?", (z) => z.faceUp, { area: "monster" }),
    resolve: async (d, link) => { const t = t0(d, link); if (t && t.faceUp) d.addTemp(t, { atk: -Math.floor(orig(t).atk / 2) }, link.card); } } });
  define("Blessings of the Nile", { activate: Object.assign({ stays: true }, noop),
    onEvent: async (d, z, p, ev) => {
      if (ev.type !== "discarded" || ev.p !== p || ev.why === "hand-limit" || ev.why === "cost" || !byOpp(d, p)) return;
      const l = resolving(d);
      if (z.data.nileLink === l) return;
      z.data.nileLink = l;
      await d.heal(p, 1000, "effect"); } });
  define("Delta Attacker", (() => {
    const trio = (d, p) => { const zs = up(d, p).filter((z) => upNormal(z)); const no = zs.map((z) => z.card.no).find((n) => zs.filter((z) => z.card.no === n).length >= 3); return no ? zs.filter((z) => z.card.no === no) : null; };
    return { activate: { can: (d, ctx) => !!trio(d, ctx.p), resolve: async (d, link) => { for (const z of trio(d, link.p) || []) z.data.directTurn = d.turn; } } };
  })());
  define("Dust Barrier", { e51DustBarrier: true, activate: Object.assign({ stays: true }, noop),
    standby: async (d, z, p) => { if (d.turnPlayer === p && ++z.data.dust >= 2) await d.destroy(z, "effect"); } });
  DM.EFFECTS[N("Dust Barrier")].activate.resolve = async (d, link) => { if (link.zone) link.zone.data.dust = 0; };
  define("Enchanting Fitting Room", { activate: {
    can: (d, ctx) => (d.players[ctx.p].lp > 800 || !!d.liveWith("e51SpellEcon", ctx.p)) && d.players[ctx.p].deck.length > 0,
    cost: async (d, link) => { await d.payLp(link.p, 800); return true; },
    resolve: async (d, link) => {
      const pl = d.players[link.p], dig = pl.deck.slice(0, 4);
      for (const q of [link.p, 1 - link.p]) await show(d, q, "Excavated:", dig);
      for (const c of dig.filter((x) => normal(x, 3))) if (H.canSummonHere(d, link.p)) await ss(d, link.p, c);
      DM.shuffle(d, pl.deck); } } });
  define("Level Limit - Area B", (() => {
    const down = async (d, z) => {
      if (z.data.busy || !d.live(z)) return;
      z.data.busy = true;
      try { for (const x of up(d).filter((m) => !m.defense && H.lvl(d, m) >= 4)) if (d.locate(x)) await d.changePosition(x, true); } finally { z.data.busy = false; }
    };
    return { activate: { stays: true, resolve: async (d, link) => { if (link.zone) await down(d, link.zone); } }, onEvent: async (d, z) => down(d, z) };
  })());
  define("Spell Economics", { e51SpellEcon: true, activate: Object.assign({ stays: true }, noop) });
  define("Sword of the Soul-Eater", { equipOk: (d, z, p) => ctl(d, z) === p && upNormal(z, 3), activate: {
    can: (d, ctx) => up(d, ctx.p).some((z) => upNormal(z, 3)),
    target: (d, link) => H.target(d, link, "Equip Sword of the Soul-Eater to which Normal Monster?", (z, q) => q === link.p && upNormal(z, 3), { sides: [link.p], area: "monster" }),
    resolve: async (d, link) => {
      const t = t0(d, link), eq = link.zone;
      if (!t || !upNormal(t, 3) || !eq || !d.locate(eq)) { if (eq) eq.data.discard = true; return; }
      let n = 0;
      for (const z of d.monsters(link.p).filter((x) => x !== t && normal(x.card))) if (d.locate(z)) { await d.sendToGrave(z.card, "tribute"); n++; }
      if (!d.locate(t) || !d.locate(eq)) { eq.data.discard = true; return; }
      d.equip(eq, t, { atk: 1000 * n });
      await d.emit({ type: "equip", card: link.card, to: t });
      await d.event({ type: "equipped", p: link.p, card: link.card, zone: t }); } } });
  // (Thousand Energy, Triangle Power: the Normal Monsters of a Level stronger, then destroyed at the End Phase)
  const boostLevel = (lv, n) => ({ activate: {
    can: (d, ctx) => up(d, ctx.p).some((z) => upNormal(z) && H.lvl(d, z) === lv),
    resolve: async (d, link) => {
      for (const z of up(d, link.p).filter((x) => upNormal(x) && H.lvl(d, x) === lv)) d.addTemp(z, { atk: n, def: n }, link.card);
      const p = link.p;
      d.e51End.push({ turn: d.turn, fn: async (d2) => H.destroyAll(d2, d2.monsters(p).filter((x) => normal(x.card) && (x.faceUp ? H.lvl(d2, x) : C.level(x.card.no)) === lv)) }); } } });
  define("Thousand Energy", boostLevel(2, 1000));
  define("Triangle Power", boostLevel(1, 2000));

  // ---------- Traps ----------
  define("Fiend's Hand Mirror", { activate: { when: "chain",
    can: (d, ctx) => { const l = ctx.last; if (!l || l.p === ctx.p || !spellLink(l) || l.targets.length !== 1) return false; const t = d.locate(l.targets[0]); return !!t && t.i >= 5 && retargets(d, l, ctx.zone).length > 0; },
    resolve: async (d, link) => {
      const v = link.prev, opts = retargets(d, v, link.zone).filter((z) => { const l = d.locate(z); return l && l.i >= 5; });
      const z = opts.length ? await d.pickZone(link.p, "Which card does " + d.name(v.card) + " target now?", (x) => opts.includes(x)) : null;
      if (z) v.targets = [z]; } } });
  define("Sixth Sense", { activate: { resolve: async (d, link) => {
    const nums = [1, 2, 3, 4, 5, 6].map((v) => ({ label: String(v), v }));
    const a = await d.choose(link.p, "Declare a number (1 of 2).", nums), b = await d.choose(link.p, "Declare another number (2 of 2).", nums.filter((x) => !a || x.v !== a.v));
    const r = await H.die(d, 1 - link.p);
    if ([a, b].some((x) => x && x.v === r)) await d.drawCards(link.p, r); else await mill(d, link.p, r); } } });
  define("Micro Ray", { activate: {
    target: (d, link) => H.target(d, link, "Which face-up monster's DEF becomes 0?", (z) => z.faceUp, { area: "monster" }),
    resolve: async (d, link) => { const t = t0(d, link); if (t && t.faceUp) d.addTemp(t, { setDef: 0 }, link.card); } } });
  // (Talismans: while Sealmaster Meisei is face up on your side; gone with it)
  const meisei = (d, p) => up(d, p).some((z) => isName(z.card, "Sealmaster Meisei"));
  const talisman = (prop) => ({ [prop]: true, activate: { stays: true, can: (d, ctx) => meisei(d, ctx.p), resolve: async () => {} },
    onEvent: async (d, z, p) => { if (d.locate(z) && z.faceUp && !meisei(d, p)) await d.destroy(z, "effect"); } });
  define("Talisman of Spell Sealing", talisman("negatesSpells"));
  define("Talisman of Trap Sealing", talisman("negatesTraps"));
  define("Wall of Revealing Light", { activate: {
    can: (d, ctx) => d.players[ctx.p].lp > 1000,
    cost: async (d, link) => {
      const k = Math.floor((d.players[link.p].lp - 1) / 1000), opts = [];
      for (let i = 1; i <= k; i++) opts.push({ label: "Pay " + 1000 * i + " LP", v: 1000 * i });
      const o = await d.choose(link.p, "Wall of Revealing Light: pay how much?", opts);
      if (!o) return false;
      await d.payLp(link.p, o.v);
      if (link.zone) link.zone.data.paid = o.v;
      return true; },
    resolve: async () => {} },
    noAttack: (d, s, q, ap, att) => ap !== q && d.atkOf(att) <= (s.data.paid || 0) });
  define("Soul Rope", { activate: { when: "monster-to-grave",
    can: (d, ctx) => ctx.event.p === ctx.p && ctx.event.why === "destroyed" && d.players[ctx.p].lp > 1000 && H.canSummonHere(d, ctx.p) && H.deckMon(d, ctx.p, (c) => C.level(c.no) === 4).length > 0,
    cost: async (d, link) => { await d.payLp(link.p, 1000); return true; },
    resolve: async (d, link) => {
      if (!H.canSummonHere(d, link.p)) return;
      const c = await d.pickCard(link.p, "Special Summon which Level 4 monster?", H.deckMon(d, link.p, (x) => C.level(x.no) === 4));
      if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } } });
  define("Curse of Anubis", { activate: {
    can: (d) => mons(d).some((z) => !z.card.token && C.kind(z.card.no) === "effect"),
    resolve: async (d, link) => {
      for (const z of mons(d).filter((x) => !x.card.token && C.kind(x.card.no) === "effect")) {
        if (!d.locate(z)) continue;
        if (z.faceUp && !z.defense) await d.changePosition(z, true);
        if (!d.locate(z)) continue;
        d.addTemp(z, { def: -orig(z).def }, link.card); z.changedTurn = d.turn;
      } } } });
  define("Dora of Fate", { activate: {
    can: (d, ctx) => d.turnPlayer !== ctx.p,
    target: (d, link) => H.target(d, link, "Select which of your opponent's face-up monsters?", (z, q) => q !== link.p && z.faceUp, { sides: [1 - link.p], area: "monster" }),
    resolve: async (d, link) => {
      const t = t0(d, link), f = d.players[link.p].flags;
      if (t && t.faceUp) (f.e51Dora = f.e51Dora || []).push({ turn: d.turn + 1, level: H.lvl(d, t) }); } } });
  define("Human-Wave Tactics", { activate: Object.assign({ stays: true }, noop),
    onEvent: async (d, z, p, ev) => {
      if (ev.type !== "battle-destroyed" || ev.p !== p || !normal(ev.card, 2)) return;
      if (!z.data.wave || z.data.wave.turn !== d.turn) z.data.wave = { turn: d.turn, n: 0 };
      z.data.wave.n++; },
    endPhase: async (d, z, p) => {
      const w = z.data.wave;
      if (!w || w.turn !== d.turn || !d.live(z)) return;
      z.data.wave = null;
      const pool = d.players[p].deck.filter((c) => normal(c, 2));
      const cs = pool.length && H.canSummonHere(d, p) ? await d.pickCards(p, "Special Summon which Level 2 or lower Normal Monsters?", pool, null, { count: w.n }) : [];
      for (const c of cs || []) if (H.canSummonHere(d, p)) await ss(d, p, c);
      DM.shuffle(d, d.players[p].deck); } });
  define("Judgment of the Desert", { activate: Object.assign({ stays: true }, noop),
    onEvent: async (d, z, p, ev) => { if (ev.type === "flipped" && ev.zone && d.locate(ev.zone) && !ev.zone.data.e51Desert) ev.zone.data.e51Desert = z; } });
  define("Order to Smash", { activate: {
    can: (d, ctx) => H.st(d, 1 - ctx.p).length > 0,
    target: (d, link) => H.target(d, link, "Tribute which Level 2 or lower Normal Monster?", (z, q) => q === link.p && upNormal(z) && H.lvl(d, z) <= 2, { sides: [link.p], area: "monster" }),
    resolve: async (d, link) => {
      const t = t0(d, link);
      if (!t || !upNormal(t)) return;
      await d.sendToGrave(t.card, "tribute");
      const zs = await d.pickZones(link.p, "Destroy up to 2 of their Spells/Traps.", (x, q, i) => q !== link.p && i >= 5, { sides: [1 - link.p], area: "spell", count: 2, min: 1 });
      await H.destroyAll(d, zs || []); } } });

  // ---------- Monsters ----------
  // ----- On the field -----
  define(["Cannonball Spear Shellfish", "Torpedo Fish"], spellProof((d) => umi(d)));
  define("The Agent of Force - Mars", Object.assign(spellProof(() => true), {
    selfStats: (d, z) => { const p = ctl(d, z); if (p < 0 || !sanctuary(d, p)) return null; const n = d.players[p].lp - d.players[1 - p].lp; return n > 0 ? { atk: n, def: n } : null; } }));
  define("Gora Turtle of Illusion", { onTargeted: async (d, z, p, l) => { if (l.p !== p && !l.fromMonster && l.card && !l.card.token && (C.isSpell(l.card.no) || C.isTrap(l.card.no))) { l.negated = true; return "negate"; } } });
  define("Goblin King", { protectsFromAttack: another("Fiend"),
    selfStats: (d, z) => { const n = 1000 * up(d).filter((x) => x !== z && H.isType(d, x, "Fiend")).length; return { atk: n, def: n }; } });
  define("Solar Flare Dragon", { protectsFromAttack: another("Pyro"), endPhase: async (d, z, p) => { if (d.turnPlayer === p) await d.damage(1 - p, 500, "effect"); } });
  define("Soul-Absorbing Bone Tower", { protectsFromAttack: another("Zombie"),
    onEvent: async (d, z, p, ev) => { if (ev.type === "special-summoned" && ev.zone && d.locate(ev.zone) && ev.zone.faceUp && H.isType(d, ev.zone, "Zombie")) await mill(d, 1 - p, 2); } });
  define("Emissary of the Oasis", { protectsFromAttack: (d, s, q, z) => z === s && up(d, q).some((x) => upNormal(x, 3)),
    noBattleDamageFor: (d, s, r) => { const A = d.lastAttack; return !!A && [A.attacker, A.target].some((x) => x && d.locate(x) && upNormal(x, 3)); } });
  define("Insect Princess", {
    onEvent: async (d, z, p) => {
      if (z.data.busy || !d.locate(z)) return;
      z.data.busy = true;
      try { for (const x of d.monsters(1 - p).filter((m) => m.defense && (m.faceUp ? H.isType(d, m, "Insect") : !m.card.token && isT(m.card.no, "Insect")))) if (d.locate(x)) await d.changePosition(x, false); } finally { z.data.busy = false; }
    },
    onDestroyByBattle: async (d, z, p, v) => { if (typeOf(v.card) === typeNo("Insect")) z.links.push({ kind: "self", stats: { atk: 500 } }); } });
  DM.EFFECTS[N("Insect Princess")].onSummon = DM.EFFECTS[N("Insect Princess")].onEvent;
  define("Prickle Fairy", { protectsFromAttack: (d, s, q, z) => H.isType(d, z, "Insect"),
    afterBattle: async (d, z, p, o) => { if (o && d.locate(o) && o.faceUp && !o.defense) await d.changePosition(o, true); } });
  define("Rocket Jumper", { directAttack: (d, z, p) => d.allZones(1 - p).every((x) => isMon(d, x) && x.defense) });
  define("The Unhappy Girl", { battleImmune: (d, z) => z.faceUp && !z.defense,
    afterBattle: async (d, z, p, o) => { if (o && d.locate(o) && !z.defense) o.data.e51Unhappy = z; },
    noAttack: (d, s, q, ap, att) => att.data.e51Unhappy === s && !s.defense });
  define("Grave Protector", { e51GraveProtector: true });
  define("The End of Anubis", { e51Anubis: true });
  define("King of the Swamp", { fusionSub: true, handActivate: { can: (d, ctx) => d.isMain() && ctx.p === d.turnPlayer && d.players[ctx.p].deck.some((c) => isName(c, "Polymerization")),
    cost: async (d, link) => { await d.discard(link.p, link.card, "cost"); return true; },
    resolve: async (d, link) => { await H.searchDeck(d, link.p, (c) => isName(c, "Polymerization"), "Add Polymerization to your hand."); } } });

  // ----- Summons -----
  define("Mazera DeVille", { specialOnly: true,
    specialFromHand: (d, p) => d.countOnField(N("Pandemonium")) > 0 && up(d, p).some((z) => isName(z.card, "Warrior of Zera")),
    specialCost: async (d, p) => { const z = await d.pickZone(p, "Tribute which Warrior of Zera?", (x, q) => q === p && x.faceUp && isName(x.card, "Warrior of Zera"), { sides: [p], area: "monster", cancel: true }); if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; },
    afterSpecial: async (d, z, side, p) => { if (d.countOnField(N("Pandemonium"), p) > 0) for (let k = 0; k < 3; k++) await H.discardRandom(d, 1 - p); } });
  define("Maximum Six", { onSummon: async (d, z, p, how) => { if (how === "normal" && (z.data.tributes || 0) > 0) { const r = await H.die(d, p); z.links.push({ kind: "self", stats: { atk: 200 * r } }); } } });
  define("The Kick Man", { onSummon: async (d, z, p, how) => { if (how === "special") await equipFromGrave(d, z, p); } });
  define("Double Coston", { e51Coston: true });

  // ----- Ignition effects -----
  define("Orca Mega-Fortress of Darkness", { ignition: {
    can: (d, ctx) => mine(d, ctx) && ((d.monsters(ctx.p).some((z) => isName(z.card, "Torpedo Fish")) && mons(d).length > 1) || (d.monsters(ctx.p).some((z) => isName(z.card, "Cannonball Spear Shellfish")) && H.st(d).length > 0)),
    cost: async (d, link) => {
      const fish = d.monsters(link.p).some((z) => isName(z.card, "Torpedo Fish")) && mons(d).length > 1, shell = d.monsters(link.p).some((z) => isName(z.card, "Cannonball Spear Shellfish")) && H.st(d).length > 0;
      const opts = [fish && { label: "Tribute Torpedo Fish: destroy a monster", v: "monster", n: "Torpedo Fish" }, shell && { label: "Tribute Cannonball Spear Shellfish: destroy a Spell or Trap", v: "spell", n: "Cannonball Spear Shellfish" }].filter(Boolean);
      const o = opts.length > 1 ? await d.choose(link.p, "Orca Mega-Fortress of Darkness:", opts) : opts[0];
      if (!o) return false;
      const z = await d.pickZone(link.p, "Tribute which " + o.n + "?", (x, q) => q === link.p && isName(x.card, o.n), { sides: [link.p], area: "monster", cancel: true });
      if (!z) return false;
      link.data.area = o.v; await d.sendToGrave(z.card, "tribute"); return true; },
    target: (d, link) => H.target(d, link, "Destroy which card?", (z) => z !== link.zone, link.data.area ? { area: link.data.area } : {}),
    resolve: async (d, link) => { const t = t0(d, link); if (t) await d.destroy(t, "effect"); } } });
  define("Avatar of The Pot", { ignition: { can: (d, ctx) => mine(d, ctx) && d.players[ctx.p].hand.some((c) => isName(c, "Pot of Greed")),
    cost: async (d, link) => { const c = await d.pickCard(link.p, "Send which Pot of Greed to the Graveyard?", d.players[link.p].hand, (x) => isName(x, "Pot of Greed")); if (!c) return false; await d.discard(link.p, c, "cost"); return true; },
    resolve: async (d, link) => d.drawCards(link.p, 3) } });
  define("The Agent of Creation - Venus", { ignition: {
    can: (d, ctx) => mine(d, ctx) && d.players[ctx.p].lp > 500 && H.canSummonHere(d, ctx.p) && piles(d, ctx.p, ["hand", "deck"]).some((c) => isName(c, "Mystical Shine Ball")),
    cost: async (d, link) => { await d.payLp(link.p, 500); return true; },
    resolve: async (d, link) => {
      const c = H.canSummonHere(d, link.p) && (await d.pickCard(link.p, "Special Summon which Mystical Shine Ball?", piles(d, link.p, ["hand", "deck"]), (x) => isName(x, "Mystical Shine Ball")));
      if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } } });
  define("The Agent of Judgment - Saturn", { ignition: {
    can: (d, ctx) => mine(d, ctx) && d.phase === "main1" && sanctuary(d, ctx.p) && d.players[ctx.p].lp > d.players[1 - ctx.p].lp,
    cost: async (d, link) => { await d.sendToGrave(link.card, "tribute"); d.players[link.p].flags.noBattleThisTurn = d.turn; return true; },
    resolve: async (d, link) => { const n = d.players[link.p].lp - d.players[1 - link.p].lp; if (n > 0 && sanctuary(d, link.p)) await d.damage(1 - link.p, n, "effect"); } } });
  define("3-Hump Lacooda", { ignition: {
    can: (d, ctx) => mine(d, ctx) && up(d, ctx.p).filter((z) => isName(z.card, "3-Hump Lacooda")).length >= 3,
    cost: async (d, link) => {
      const zs = await d.pickZones(link.p, "Tribute which 2 3-Hump Lacooda?", (x, q) => q === link.p && x.faceUp && isName(x.card, "3-Hump Lacooda"), { sides: [link.p], area: "monster", count: 2, cancel: true });
      if (!zs || zs.length < 2) return false; for (const z of zs) await d.sendToGrave(z.card, "tribute"); return true; },
    resolve: async (d, link) => d.drawCards(link.p, 3) } });

  // ----- Flip effects -----
  define("Sonic Jammer", { flip: async (d, link) => { d.players[1 - link.p].flags.e51Jam = d.turn + 1; } });
  define("Night Assailant", { flip: async (d, link) => {
    const t = await d.pickZone(link.p, "Destroy which of your opponent's monsters?", (x, q) => q !== link.p, { sides: [1 - link.p], area: "monster" }); if (t) await d.destroy(t, "effect"); },
    onToGrave: async (d, c, p, from) => {
      if (!from || from.pile !== "hand") return;
      const t = await d.pickCard(p, "Return which Flip monster from your Graveyard to your hand?", d.players[p].grave, (x) => x !== c && C.isMonster(x.no) && /^FLIP:|\bFLIP:/.test(DM.text(x.no)));
      if (t) await d.toHand(t, "effect"); } });

  // ----- In battle -----
  define("Hyper Hammerhead", { afterBattle: async (d, z, p, o) => { if (o && d.locate(o) && ctl(d, o) !== p) await d.toHand(o.card, "effect"); } });
  define("Legendary Jujitsu Master", { afterBattle: async (d, z, p, o) => { if (z.defense && o && d.locate(o)) await d.toDeck(o.card, true, "effect"); } });
  define("Vampire Lady", { onBattleDamage: DM.EFFECTS[N("Vampire Lord")].onBattleDamage });
  define("Ghost Knight of Jackal", { onDestroyByBattle: async (d, z, p, v) => {
    if (v.card.owner === p || !inGrave(d, v.card) || C.isExtra(v.card.no) || !H.canSummonHere(d, p) || !(await d.yesNo(p, "Special Summon " + d.name(v.card) + " to your side in Defense Position?"))) return;
    await ss(d, p, v.card, { position: null, defense: true }); } });
  define("Legacy Hunter", { onDestroyByBattle: async (d, z, p, v) => {
    const h = d.players[1 - p].hand;
    if (d.turnPlayer !== p || v.data.attackedFaceDown !== d.turn || !inGrave(d, v.card) || !h.length) return;
    await d.toDeck(h[Math.floor(d.rng() * h.length)], "shuffle", "effect"); } });

  // ----- Standby and End Phases, and to the Graveyard -----
  define("The Agent of Wisdom - Mercury", {
    endPhase: async (d, z, p) => { if (d.turnPlayer !== p) z.data.mercury = d.players[p].hand.length === 0 ? d.turn : null; },
    standby: async (d, z, p) => { if (d.turnPlayer === p && z.data.mercury === d.turn - 1) { z.data.mercury = null; await d.drawCards(p, 1); } } });
  define("Manticore of Darkness", {
    onToGrave: async (d, c) => { c.e51Sent = d.turn; },
    graveEnd: async (d, c, p) => {
      if (c.e51Sent !== d.turn || d.players[p].flags.noSpecialSummon) return;
      const f = (x) => !!x && C.isMonster(x.no) && ["Beast", "Beast-Warrior", "Winged Beast"].some((t) => typeOf(x) === typeNo(t));
      const zs = up(d, p).filter((z) => f(z.card)), hs = d.players[p].hand.filter(f);
      if ((!hs.length || d.freeMonsterZone(p) < 0) && !zs.length) return;
      if (!(await d.yesNo(p, "Send a Beast, Beast-Warrior or Winged Beast to the Graveyard to Special Summon Manticore of Darkness?"))) return;
      const pool = zs.map((z) => z.card).concat(d.freeMonsterZone(p) >= 0 ? hs : []);
      const x = await d.pickCard(p, "Send which monster to the Graveyard?", pool);
      if (!x) return;
      c.e51Sent = null;
      await d.sendToGrave(x, "cost");
      if (inGrave(d, c) && H.canSummonHere(d, p)) await ss(d, p, c); } });
  define("Elephant Statue of Blessing", handToGraveByOpp(async (d, c, p) => d.heal(p, 2000, "effect")));
  define("Elephant Statue of Disaster", handToGraveByOpp(async (d, c, p) => d.damage(1 - p, 2000, "effect")));
  define("Regenerating Mummy", handToGraveByOpp(async (d, c) => { if (inGrave(d, c)) await d.toHand(c, "effect"); }));
  define("Emissary of the Afterlife", { onToGrave: async (d, c, p, from) => {
    if (!from || from.zone == null || from.zone >= 5) return;
    for (const q of [p, 1 - p]) if (d.players[q].deck.some((x) => normal(x, 3))) await H.searchDeck(d, q, (x) => normal(x, 3), "Add which Level 3 or lower Normal Monster to your hand?"); } });
})();

// (Cards beyond GX's, to Fury from the Deep: 2003-2005's, the second part: the LV monsters (Armed Dragon, Horus the
// Black Flame Dragon, Mystic Swordsman, Dark Mimic, Ultimate Insect LV1 and LV3, Silent Swordsman LV3), the Element
// monsters, and their Spells and Traps.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo, ICON = DM.ICON;
  const { isName, show, tributeCost, discardCost, handCount, once, mine, noop, ss, piles, unionOf } = DM.REST;
  const up = H.up, mons = H.mons, t0 = H.t, isMon = H.isMon;
  const isMonCard = (c) => C.isMonster(c.no) && !C.isExtra(c.no);
  const has = (c, part) => !!c && !c.token && C.name(c.no).includes(part);
  const isLv = (c) => !!c && !c.token && /\bLV\d+$/.test(C.name(c.no));
  const inGrave = (d, c) => !!c && !c.token && d.players[c.owner].grave.includes(c);
  const isT = (no, t) => C.type(no) === typeNo(t);
  const fieldHas = (d, a) => up(d).some((z) => H.attrOf(d, z) === ATTR[a]);
  const pickMon = (d, link, prompt, filter, sides) => H.target(d, link, prompt, (z, q) => (!sides || sides.includes(q)) && (!filter || filter(z, q)), { area: "monster" });
  const spellLink = (l) => !!l && !!l.card && !l.card.token && !l.fromMonster && C.isSpell(l.card.no);
  const negateLink = async (d, v) => { if (!v) return; v.negated = true; if (v.zone && d.locate(v.zone)) await d.destroy(v.zone, "negated"); };
  const orig = (z) => { const tk = z.card.token, b = z.data.base || {}; return b.atk != null ? b.atk : tk ? tk.atk : C.atk(z.card.no); };
  const ATTRS = () => [1, 2, 3, 4, 5, 6].map((a) => ({ label: window.YUGIOH_CARDS.attributes[a], value: a }));
  // (every card's name, to declare one)
  let NAMES = null;
  const names = () => NAMES || (NAMES = window.YUGIOH_CARDS.cards.map((c, no) => (c ? { label: c[0], value: no } : null)).filter(Boolean)
    .filter((o, k, a) => a.findIndex((x) => x.label === o.label) === k).sort((a, b) => (a.label < b.label ? -1 : 1)));
  // (a monster Normal Summoned or Set from the hand now, by the turn's rules)
  const normalOk = (d, p, c) => {
    const pl = d.players[p], e = DM.effectOf(c.no);
    return isMonCard(c) && !pl.normalSummoned && !pl.flags.noNormalSummon && pl.flags.noSummonTurn !== d.turn && d.players[1 - p].flags.noSummonFor !== d.turn
      && C.kind(c.no) !== "ritual" && !(e && e.specialOnly) && !(e && e.needsField && !d.countOnField(N(e.needsField))) && !(e && e.normalIf && !e.normalIf(d, p));
  };
  const X = (d) => d.x52 || (d.x52 = { neg: [], gorgon: [], ds: [] });

  // ---------- What these cards need of each duel ----------
  // Effect properties read here: setOnly (Normal Set, never Normal Summoned), noControlIf (control can't switch while
  // it holds), doubleTribute (an Attribute: 2 Tributes for a monster of it), noTributeHalf (Normal Summoned without
  // Tributes, its ATK and DEF halved). Duel flags: x52abs (Absolute End), x52gorgon (Gorgon's Eye), x52tri (Triangle
  // Ecstasy Spark); player flags: x52pikeru, x52hallowed. A drew-outside event carries the cards drawn (ev.cards).
  const halve = (z) => { z.data.base = { atk: Math.floor(C.atk(z.card.no) / 2), def: Math.floor(C.def(z.card.no) / 2) }; };
  // (Gorgon's Eye: the monsters in Defense Position negated, while it lasts)
  function gorgon(d) {
    const x = X(d);
    if (d.flags.x52gorgon !== d.turn) return;
    for (const z of mons(d)) if (z.defense && !z.negated) { z.negated = true; x.gorgon.push(z); }
    for (const z of x.gorgon.slice()) if (!z.defense || !d.locate(z)) { z.negated = false; x.gorgon.splice(x.gorgon.indexOf(z), 1); }
  }
  function patch(d) {
    const o = {};
    for (const k of ["emit", "notify", "drawCards", "damage", "takeControl", "canActivate", "mainActions", "doAction", "placeMonster", "attackWith", "destroy"]) o[k] = d[k];
    Object.assign(d, {
      async emit(ev) {
        const x = X(this);
        if (ev.type === "turn") { for (const z of x.neg.splice(0).concat(x.gorgon.splice(0))) z.negated = false; }
        if (ev.type === "draw" && x.batch && x.batch.p === ev.p) x.batch.cards.push(ev.card);
        // (Absolute End: the opponent's attacks this turn, direct attacks)
        const ab = this.flags.x52abs;
        if (ev.type === "attack" && ab && ab.turn === this.turn && ev.p === ab.q && this.attack && this.attack.target) { this.attack.target = null; ev.target = null; }
        await o.emit.call(this, ev);
        if (this.flags.x52gorgon === this.turn) gorgon(this);
      },
      async notify(ev) { if (ev && ev.type === "drew-outside" && X(this).batch) ev.cards = X(this).batch.cards.slice(); return o.notify.call(this, ev); },
      async drawCards(p, n, drawPhase) {
        const x = X(this), was = x.batch;
        x.batch = { p, cards: [] };
        try { return await o.drawCards.call(this, p, n, drawPhase); } finally { x.batch = was; }
      },
      async damage(p, n, why) {
        const f = this.players[p].flags;
        if (why !== "battle" && f.x52pikeru === this.turn) return;
        if (f.x52hallowed === this.turn) { const l = this.resolvingLink; if (why === "battle" || (l ? l.p !== p : this.turnPlayer !== p)) return; }
        return o.damage.call(this, p, n, why);
      },
      async takeControl(z, p) { const e = this.live(z); if (e && e.noControlIf && e.noControlIf(this, z)) return false; return o.takeControl.call(this, z, p); },
      canActivate(p, c, a, ctx) {
        const t = this.flags.x52tri;
        if (t && t.turn === this.turn && t.p !== p && C.isTrap(c.no)) return false;
        if (ctx && ctx.zone && [0, 1].some((q) => H.st(this, q).some((s) => s.data.xing && s.data.xing.includes(ctx.zone) && this.live(s)))) return false;
        return o.canActivate.call(this, p, c, a, ctx);
      },
      mainActions(p) {
        const acts = o.mainActions.call(this, p).filter((a) => {
          const c = a.card || (a.zone && a.zone.card), e = c && DM.effectOf(c.no);
          if (a.act === "summon" && e && e.setOnly) return false;
          // (Flint: its monster's position stays)
          if (a.act === "position" && a.zone.links.some((l) => l.kind === "equip" && l.from && this.locate(l.from) && (this.live(l.from) || {}).x52flint)) return false;
          return true;
        });
        const extra = [], pl = this.players[p];
        for (const c of pl.hand) {
          if (!normalOk(this, p, c)) continue;
          const e = DM.effectOf(c.no);
          if (e && e.noTributeHalf && this.freeMonsterZone(p) >= 0) for (const act of ["summon", "set-monster"]) if (!(act === "summon" && e.setOnly))
            extra.push({ act, card: c, tributes: 0, x52half: true, label: (act === "summon" ? "Summon " : "Set ") + C.name(c.no) + " (no Tributes, half ATK/DEF)" });
          if (DM.tributesFor(c.no, e) !== 2 || (e && e.tributeFilter)) continue;
          for (const z of this.tributable(p)) {
            const ze = this.live(z);
            if (!ze || !ze.doubleTribute || C.attribute(c.no) !== ATTR[ze.doubleTribute]) continue;
            for (const act of ["summon", "set-monster"]) if (!(act === "summon" && e && e.setOnly))
              extra.push({ act, card: c, tributes: 1, kaiser: z, label: (act === "summon" ? "Summon " : "Set ") + C.name(c.no) + " (" + C.name(z.card.no) + " as 2 Tributes)" });
          }
        }
        const at = acts.findIndex((a) => a.act === "battle" || a.act === "end");
        acts.splice(at < 0 ? acts.length : at, 0, ...extra);
        return acts;
      },
      async doAction(p, a) {
        if (!a || !a.x52half) return o.doAction.call(this, p, a);
        a.card.x52half = true;
        try { return await o.doAction.call(this, p, a); } finally { a.card.x52half = false; }
      },
      async placeMonster(p, c, opts) { const z = await o.placeMonster.call(this, p, c, opts); if (z && c.x52half) { c.x52half = false; halve(z); } return z; },
      // (Covering Fire: its ATK for the Damage Step only)
      async attackWith(p, att, target) {
        try { return await o.attackWith.call(this, p, att, target); } finally { const x = X(this); if (x.ds.length) { this.temp = this.temp.filter((t) => !x.ds.includes(t)); x.ds = []; } }
      },
      // (Heavy Mech Support Platform: destroyed by a card effect in its monster's place too)
      async destroy(z, why, by) {
        const l = this.locate(z);
        if (l && l.i < 5 && why !== "battle") {
          const u = z.links.find((k) => k.kind === "equip" && k.from && k.from.data.union && this.locate(k.from) && isName(k.from.card, "Heavy Mech Support Platform"));
          if (u) { await o.destroy.call(this, u.from, "effect"); return false; }
        }
        return o.destroy.call(this, z, why, by);
      }
    });
    return d;
  }
  const create0 = DM.create;
  DM.create = function () { return patch(create0.apply(this, arguments)); };
  // (Horus' Servant: the face-up Horus the Black Flame Dragons out of the opponent's targets)
  const horus = (d, z, q) => isMon(d, z) && z.faceUp && has(z.card, "Horus the Black Flame Dragon") && up(d, q).some((s) => isName(s.card, "Horus' Servant") && d.live(s));
  const target0 = H.target;
  H.target = function (d, link, prompt, filter, opts) {
    return target0.call(this, d, link, prompt, (z, q, i) => (!filter || filter(z, q, i)) && !(link && link.p !== q && horus(d, z, q)), opts);
  };

  // ---------- LV monsters ----------
  // (send this card to the Graveyard; Special Summon the next LV from the hand or Deck, as this card's effect: those
  // that must be Special Summoned by it can be. The new one knows what summoned it: data.lvFrom.)
  const nextLv = (d, p, next) => piles(d, p, ["hand", "deck"]).filter((c) => isName(c, next));
  async function levelUp(d, z, p, next) {
    if (!d.locate(z) || !z.faceUp || d.controllerOf(z) !== p || !nextLv(d, p, next).length) return;
    if (!(await d.yesNo(p, "Send " + d.name(z.card) + " to the Graveyard to Special Summon " + next + "?"))) return;
    const card = z.card;
    await d.runEffect({ p, card, zone: z, kind: "lv", targets: [], data: {}, label: d.name(card), resolve: async (d2) => {
      await d2.sendToGrave(card, "cost");
      const c = await d2.pickCard(p, "Special Summon " + next + ".", nextLv(d2, p, next));
      const nz = c ? await ss(d2, p, c) : null;
      if (nz) nz.data.lvFrom = C.name(card.no);
      DM.shuffle(d2, d2.players[p].deck);
    } });
  }
  // (not on the turn it was Summoned or flipped face up)
  const settled = (d, z) => z.placedTurn !== d.turn && z.data.x52up !== d.turn;
  const upWatch = { onEvent: async (d, z, p, ev) => { if (ev.type === "flipped" && ev.zone === z) z.data.x52up = d.turn; } };
  const lvStandby = (next, fresh) => Object.assign({}, fresh ? upWatch : null, { standby: async (d, z, p) => { if (d.turnPlayer === p && (!fresh || settled(d, z))) await levelUp(d, z, p, next); } });
  const lvEnd = (next) => ({ onDestroyByBattle: async (d, z) => { z.data.x52kill = d.turn; }, endPhase: async (d, z, p) => { if (z.data.x52kill === d.turn) await levelUp(d, z, p, next); } });
  // (Mystic Swordsman: a face-down Defense Position monster it attacks, destroyed at the start of the Damage Step)
  const mystic = (extra) => Object.assign({ beforeDamage: async (d, z, p, t) => {
    if (!t || !t.defense || t.data.attackedFaceDown !== d.turn || !d.locate(t)) return;
    if (extra && extra.toDeck && (await d.yesNo(p, "Place " + d.name(t.card) + " on top of your opponent's Deck instead?"))) await d.toDeck(t.card, true, "effect");
    else await d.destroy(t, "effect");
    return "stop";
  } }, extra && extra.next ? lvEnd(extra.next) : null, extra && extra.setOnly ? { setOnly: true } : null);

  // ----- Armed Dragon -----
  define("Armed Dragon LV3", lvStandby("Armed Dragon LV5"));
  const sendMon = (d, link) => d.players[link.p].hand.filter((c) => c !== link.card && C.isMonster(c.no));
  const minAtk = (d, p) => Math.min(...up(d, 1 - p).map((z) => d.atkOf(z)));
  const sendCost = async (d, link, filter) => {
    const c = await d.pickCard(link.p, "Send which monster from your hand to the Graveyard?", sendMon(d, link), filter, { cancel: true });
    if (!c) return false;
    link.data.sent = C.atk(c.no);
    await d.sendToGrave(c, "cost");
    return true;
  };
  define("Armed Dragon LV5", Object.assign(lvEnd("Armed Dragon LV7"), { ignition: {
    can: (d, ctx) => mine(d, ctx) && up(d, 1 - ctx.p).length > 0 && sendMon(d, ctx).some((c) => C.atk(c.no) >= minAtk(d, ctx.p)),
    cost: (d, link) => sendCost(d, link, (c) => C.atk(c.no) >= minAtk(d, link.p)),
    target: (d, link) => pickMon(d, link, "Destroy which monster?", (z) => z.faceUp && d.atkOf(z) <= (link.data.sent == null ? Infinity : link.data.sent), [1 - link.p]),
    resolve: async (d, link) => { const t = t0(d, link); if (t) await d.destroy(t, "effect"); } } }));
  define("Armed Dragon LV7", { specialOnly: true, ignition: {
    can: (d, ctx) => mine(d, ctx) && up(d, 1 - ctx.p).length > 0 && sendMon(d, ctx).length > 0,
    cost: (d, link) => sendCost(d, link),
    resolve: async (d, link) => H.destroyAll(d, up(d, 1 - link.p).filter((z) => d.atkOf(z) <= link.data.sent)) } });

  // ----- Horus the Black Flame Dragon -----
  define("Horus the Black Flame Dragon LV4", Object.assign(lvEnd("Horus the Black Flame Dragon LV6"), { noControlChange: true }));
  define("Horus the Black Flame Dragon LV6", Object.assign(lvEnd("Horus the Black Flame Dragon LV8"), { immuneTo: (d, z, p, l) => spellLink(l) }));
  define("Horus the Black Flame Dragon LV8", { specialOnly: true,
    quick: { when: "chain", speed: 2, can: (d, ctx) => spellLink(ctx.last) && ctx.last.p !== ctx.p && !ctx.last.negated,
      resolve: async (d, link) => { const z = link.zone; if (!z || !d.locate(z) || !z.faceUp || d.controllerOf(z) !== link.p) return; await negateLink(d, link.prev); } } });
  define("Horus' Servant", { x52servant: true });
  define("Level Up!", { activate: (() => {
    const listed = (c) => [...DM.text(c.no).matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((n) => n !== C.name(c.no));
    const pool = (d, p, z) => piles(d, p, ["hand", "deck"]).filter((c) => isMonCard(c) && listed(z.card).includes(C.name(c.no)));
    const lvMon = (d, p) => up(d, p).filter((z) => isLv(z.card) && pool(d, p, z).length);
    return {
      can: (d, ctx) => lvMon(d, ctx.p).length > 0,
      cost: async (d, link) => {
        const z = await d.pickZone(link.p, "Send which LV monster to the Graveyard?", (x) => lvMon(d, link.p).includes(x), { sides: [link.p], area: "monster", cancel: true });
        if (!z) return false;
        link.data.listed = listed(z.card);
        await d.sendToGrave(z.card, "cost");
        return true;
      },
      resolve: async (d, link) => {
        const c = await d.pickCard(link.p, "Special Summon which monster?", piles(d, link.p, ["hand", "deck"]), (x) => isMonCard(x) && (link.data.listed || []).includes(C.name(x.no)));
        if (c && H.canSummonHere(d, link.p)) await ss(d, link.p, c, { byRule: true });
        DM.shuffle(d, d.players[link.p].deck);
      } };
  })() });
  define("The Graveyard in the Fourth Dimension", { activate: {
    can: (d, ctx) => d.players[ctx.p].grave.filter((c) => C.isMonster(c.no) && isLv(c)).length >= 2,
    resolve: async (d, link) => {
      const cs = await d.pickCards(link.p, "Return which 2 LV monsters to your Deck?", d.players[link.p].grave, (c) => C.isMonster(c.no) && isLv(c), { count: 2 });
      for (const c of cs || []) await d.toDeck(c, "shuffle", "effect");
    } } });

  // ----- Mystic Swordsman, Dark Mimic, Ultimate Insect, Silent Swordsman -----
  define("Mystic Swordsman LV2", mystic({ next: "Mystic Swordsman LV4" }));
  define("Mystic Swordsman LV4", mystic({ next: "Mystic Swordsman LV6", setOnly: true }));
  define("Mystic Swordsman LV6", mystic({ toDeck: true, setOnly: true }));
  define("Dark Mimic LV1", Object.assign(lvStandby("Dark Mimic LV3"), { flip: async (d, link) => d.drawCards(link.p, 1) }));
  define("Dark Mimic LV3", { onDestroyed: async (d, z, p, why) => { if (why === "battle" && inGrave(d, z.card)) await d.drawCards(p, z.data.lvFrom === "Dark Mimic LV1" ? 2 : 1); } });
  define("Ultimate Insect LV1", Object.assign(lvStandby("Ultimate Insect LV3", true), { immuneTo: (d, z, p, l) => spellLink(l) }));
  define("Ultimate Insect LV3", Object.assign(lvStandby("Ultimate Insect LV5", true), {
    aura: (d, src, sp, z, zp) => (src.data.lvFrom === "Ultimate Insect LV1" && zp !== sp && isMon(d, z) && z.faceUp ? { atk: -300 } : null) }));
  define("Silent Swordsman LV3", Object.assign(lvStandby("Silent Swordsman LV5", true), {
    onTargeted: async (d, z, p, l) => { if (l.p !== p && spellLink(l)) { l.negated = true; await d.emit({ type: "negate", card: l.card }); return "negate"; } } }));

  // ---------- Monsters ----------
  // ----- The Element monsters: an effect for each Attribute on the field -----
  const victims = {
    battleResult: (d, s, r, att, target, res) => { if (!fieldHas(d, "EARTH")) return; if (s === att && res.targetDies) target.data.negateIfDies = d.turn; else if (s === target && res.attackerDies) att.data.negateIfDies = d.turn; },
    beforeAttack: async (d, z, p, t) => { DM.EFFECTS[z.card.no].noFlipInBattle = !!(t && !t.faceUp && fieldHas(d, "EARTH") && d.atkOf(z) > d.defOf(t)); }
  };
  const water = { noControlIf: (d) => fieldHas(d, "WATER") };
  define("Element Soldier", Object.assign({}, water, victims));
  define("Element Magician", Object.assign({}, water, { onDestroyByBattle: async (d, z) => { if (fieldHas(d, "WIND") && z.data.x52again !== d.turn) { z.data.x52again = d.turn; z.attacks = Math.max(0, z.attacks - 1); } } }));
  define("Element Saurus", Object.assign({ selfStats: (d) => (fieldHas(d, "FIRE") ? { atk: 500 } : null) }, victims));
  // ----- Tributes -----
  define("The Trojan Horse", { doubleTribute: "EARTH" });
  define("Unshaven Angler", { doubleTribute: "WATER" });
  define("Meteo the Matchless", { noSpecial: true, tributes: 3, tributeFilter: (d, z) => H.isType(d, z, "Beast-Warrior"),
    onBattleDamage: async (d, z, p, o) => { if (!o && d.players[1 - p].lp <= 0) { d.players[p].flags.specialWin = "match"; d.checkWin(); } } });
  define("Ulevo", { noSpecial: true, tributes: 3, tributeFilter: (d, z) => H.isType(d, z, "Winged Beast"),
    onBattleDamage: async (d, z, p, o) => { if (!o && d.players[1 - p].lp <= 0) { d.players[p].flags.specialWin = "match"; d.checkWin(); } } });
  define("Fusilier Dragon, the Dual-Mode Beast", { noTributeHalf: true });
  define("Teva", { onSummon: async (d, z, p, how) => { if (how === "normal" && z.data.tributes) d.players[1 - p].flags.noAttackTurn = d.turn + 1; } });
  // ----- Flip -----
  define("Nobleman-Eater Bug", { flip: async (d, link) => {
    const zs = await d.pickZones(link.p, "Destroy which 2 monsters?", () => true, { area: "monster", count: 2 });
    await H.destroyAll(d, zs || []); } });
  define("Rafflesia Seduction", { flip: async (d, link) => {
    const z = await d.pickZone(link.p, "Take control of which face-up monster?", (x) => x.faceUp, { sides: [1 - link.p], area: "monster" });
    if (z && (await d.takeControl(z, link.p))) z.data.returnAtEnd = { turn: d.turn, to: 1 - link.p }; } });
  define("Nightmare Penguin", { auraSelf: true, aura: (d, src, sp, z, zp) => (zp === sp && isMon(d, z) && z.faceUp && H.attrOf(d, z) === ATTR.WATER ? { atk: 200 } : null),
    flip: async (d, link) => {
      const z = await d.pickZone(link.p, "Return which of your opponent's cards to the hand?", () => true, { sides: [1 - link.p] });
      if (z) await d.toHand(z.card, "effect"); } });
  // ----- The rest -----
  define("Gemini Imps", { handQuick: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && !!ctx.last.card && !ctx.last.card.token && /discard/i.test(DM.text(ctx.last.card.no)),
    resolve: async (d, link) => { await negateLink(d, link.prev); await d.drawCards(link.p, 1); } } });
  define("Malice Doll of Demise", {
    onToGrave: async (d, c, p, from) => { const l = d.resolvingLink; if (from && from.zone != null && from.zone < 5 && l && l.card && !l.card.token && C.isSpell(l.card.no) && C.icon(l.card.no) === ICON.CONTINUOUS) c.x52malice = d.turn; },
    graveStandby: async (d, c, q) => { if (c.x52malice == null || c.x52malice >= d.turn || d.turnPlayer !== q) return; c.x52malice = null; if (H.canSummonHere(d, q)) await ss(d, q, c); } });
  define("Arcane Archer of the Forest", {
    protectsFromAttack: (d, s, q, z) => z === s && up(d, q).some((x) => H.isType(d, x, "Plant")),
    ignition: { repeatable: true, can: (d, ctx) => mine(d, ctx) && H.st(d).length > 0 && d.monsters(ctx.p).some((x) => H.isType(d, x, "Plant")),
      cost: tributeCost((d, x) => H.isType(d, x, "Plant"), "Tribute which Plant monster?"),
      resolve: async (d, link) => { const z = await d.pickZone(link.p, "Destroy which Spell or Trap Card?", (x, q, i) => i >= 5, { area: "spell" }); if (z) await d.destroy(z, "effect"); } } });
  define("Familiar Knight", { onDestroyed: async (d, z, p, why) => {
    if (why !== "battle" || !inGrave(d, z.card)) return;
    for (const q of [p, 1 - p]) {
      const pool = d.players[q].hand.filter((c) => isMonCard(c) && C.level(c.no) === 4);
      if (!pool.length || !H.canSummonHere(d, q) || !(await d.yesNo(q, "Special Summon a Level 4 monster from your hand (Familiar Knight)?"))) continue;
      const c = await d.pickCard(q, "Special Summon which monster?", pool);
      if (c) await ss(d, q, c);
    } } });
  define("Abyss Soldier", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && handCount(d, ctx, (c) => C.isMonster(c.no) && C.attribute(c.no) === ATTR.WATER) > 0,
    cost: discardCost((c) => C.isMonster(c.no) && C.attribute(c.no) === ATTR.WATER, "Discard which WATER monster?"),
    target: (d, link) => H.target(d, link, "Return which card to the hand?", () => true),
    resolve: async (d, link) => { const t = t0(d, link); if (t) await d.toHand(t.card, "effect"); } } });
  define("Fox Fire", {
    onSummon: async (d, z) => { z.data.cannotTribute = true; },
    onEvent: async (d, z, p, ev) => { if (ev.type === "flipped" && ev.zone === z) z.data.cannotTribute = true; },
    onDestroyed: async (d, z, p, why) => { if (why === "battle" && z.data.attackedFaceDown !== d.turn) z.card.x52fox = d.turn; },
    graveEnd: async (d, c, q) => { if (c.x52fox === d.turn && c.battleDestroyedTurn === d.turn && H.canSummonHere(d, q)) { c.x52fox = null; await ss(d, q, c); } } });
  define("Gaia Soul the Combustible Collective", { piercing: true,
    ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.monsters(ctx.p).some((x) => x !== ctx.zone && H.isType(d, x, "Pyro")),
      cost: async (d, link) => {
        const zs = await d.pickZones(link.p, "Tribute up to 2 Pyro monsters.", (x, q) => q === link.p && x !== link.zone && H.isType(d, x, "Pyro"), { sides: [link.p], area: "monster", count: 2, min: 1, cancel: true });
        if (!zs || !zs.length) return false;
        link.data.n = zs.length;
        for (const z of zs) await d.sendToGrave(z.card, "tribute");
        return true; },
      resolve: async (d, link) => { const z = link.zone; if (z && d.locate(z) && z.faceUp) z.links.push({ kind: "self", stats: { atk: 1000 * link.data.n } }); } },
    endPhase: async (d, z) => d.destroy(z, "effect") });
  define("Perfect Machine King", { selfStats: (d, z) => ({ atk: 500 * up(d).filter((x) => x !== z && H.isType(d, x, "Machine")).length }) });
  // (Heavy Mech Support Platform: a Union for any Machine)
  define("Heavy Mech Support Platform", { ignition: {
    can: (d, ctx) => {
      if (!mine(d, ctx) || !once(ctx.zone, d)) return false;
      const l = d.locate(ctx.zone);
      if (l.i < 5) return d.freeSpellZone(ctx.p) >= 0 && up(d, ctx.p).some((x) => x !== ctx.zone && H.isType(d, x, "Machine") && !unionOf(x));
      return H.canSummonHere(d, ctx.p);
    },
    resolve: async (d, link) => {
      const z = link.zone, l = z && d.locate(z);
      if (!l) return;
      if (l.i >= 5) { const nz = await d.specialSummon(link.p, link.card, { how: "special", defense: false }); if (nz) nz.data.usedTurn = d.turn; return; }
      const t = await d.pickZone(link.p, "Equip Heavy Mech Support Platform to which Machine?", (x, q) => q === link.p && x !== z && x.faceUp && H.isType(d, x, "Machine") && !unionOf(x), { sides: [link.p], area: "monster" });
      const i = d.freeSpellZone(link.p);
      if (!t || i < 0) return;
      d.take(link.card);
      const nz = DM.newZone(link.card, { faceUp: true, placedTurn: d.turn });
      nz.data.union = true; nz.data.usedTurn = d.turn;
      d.players[link.p].zones[i] = nz;
      d.equip(nz, t, { atk: 500, def: 500 });
      await d.emit({ type: "equip", card: link.card, to: t });
      await d.event({ type: "equipped", p: link.p, card: link.card, zone: t });
    } } });

  // ---------- Spells ----------
  define("Marshmallon Glasses", { activate: noop, protectsFromAttack: (d, s, q, z) => !!d.live(s) && !isName(z.card, "Marshmallon") && up(d, q).some((x) => isName(x.card, "Marshmallon")) });
  define("Magical Stone Excavation", { activate: {
    can: (d, ctx) => handCount(d, ctx) >= 2 && d.players[ctx.p].grave.some((c) => C.isSpell(c.no)),
    cost: async (d, link) => { for (let k = 0; k < 2; k++) if (!(await H.discardOne(d, link.p, "Discard which card?"))) return false; return true; },
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Add which Spell from your Graveyard to your hand?", d.players[link.p].grave, (x) => C.isSpell(x.no)); if (c) await d.toHand(c, "effect"); } } });
  define("Abyssal Designator", { activate: {
    can: (d, ctx) => d.players[ctx.p].lp > 1000,
    cost: async (d, link) => { await d.payLp(link.p, 1000); return true; },
    resolve: async (d, link) => {
      const t = await d.choose(link.p, "Declare a Type.", DM.TYPESLIST()), a = await d.choose(link.p, "Declare an Attribute.", ATTRS());
      if (!t || !a) return;
      const q = 1 - link.p;
      const c = await d.pickCard(q, "Send which monster to the Graveyard?", piles(d, q, ["hand", "deck"]), (x) => isMonCard(x) && C.type(x.no) === t.value && C.attribute(x.no) === a.value);
      if (c) await d.sendToGrave(c, "effect");
      DM.shuffle(d, d.players[q].deck);
    } } });
  define("Big Wave Small Wave", { activate: {
    can: (d, ctx) => up(d, ctx.p).some((z) => H.attrOf(d, z) === ATTR.WATER),
    resolve: async (d, link) => {
      const n = await H.destroyAll(d, up(d, link.p).filter((z) => H.attrOf(d, z) === ATTR.WATER));
      for (let k = 0; k < n && H.canSummonHere(d, link.p); k++) {
        const c = await d.pickCard(link.p, "Special Summon a WATER monster from your hand?", d.players[link.p].hand, (x) => isMonCard(x) && C.attribute(x.no) === ATTR.WATER, { min: 0, cancel: true });
        if (!c) break;
        await ss(d, link.p, c);
      } } } });
  define("Ectoplasmer", { activate: noop, endPhase: async (d, z) => {
    const q = d.turnPlayer;
    if (!d.live(z) || !up(d, q).length) return;
    await d.runEffect({ p: d.controllerOf(z), card: z.card, zone: z, kind: "ecto", targets: [], data: {}, label: d.name(z.card), resolve: async (d2) => {
      const m = await d2.pickZone(q, "Tribute which face-up monster (Ectoplasmer)?", (x, r) => r === q && x.faceUp, { sides: [q], area: "monster" });
      if (!m) return;
      const n = Math.floor(orig(m) / 2);
      await d2.sendToGrave(m.card, "tribute");
      await d2.damage(1 - q, n, "effect");
    } });
  } });
  define("Two-Man Cell Battle", { activate: noop, endPhase: async (d, z) => {
    const q = d.turnPlayer, pool = d.players[q].hand.filter((c) => C.kind(c.no) === "normal" && C.level(c.no) === 4);
    if (!d.live(z) || !pool.length || !H.canSummonHere(d, q) || !(await d.yesNo(q, "Special Summon a Level 4 Normal Monster from your hand (Two-Man Cell Battle)?"))) return;
    const c = await d.pickCard(q, "Special Summon which monster?", pool);
    if (c) await ss(d, q, c);
  } });
  define("Lighten the Load", { activate: noop, ignition: {
    can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.players[ctx.p].hand.some((c) => isMonCard(c) && C.level(c.no) >= 7),
    resolve: async (d, link) => {
      const c = await d.pickCard(link.p, "Return which Level 7 or higher monster to your Deck?", d.players[link.p].hand, (x) => isMonCard(x) && C.level(x.no) >= 7);
      if (!c) return;
      await d.toDeck(c, "shuffle", "effect");
      await d.drawCards(link.p, 1);
    } } });
  define("Machine Duplication", { activate: {
    target: (d, link) => pickMon(d, link, "Which Machine monster?", (z) => z.faceUp && H.isType(d, z, "Machine") && d.atkOf(z) <= 500 && !z.card.token, [link.p]),
    resolve: async (d, link) => {
      const t = t0(d, link);
      if (!t || !t.faceUp) return;
      const no = t.card.no, k = Math.min(2, [0, 1, 2, 3, 4].filter((i) => !d.players[link.p].zones[i] && !d.closed(link.p, i)).length);
      const cs = k ? await d.pickCards(link.p, "Special Summon which monsters?", d.players[link.p].deck, (c) => C.name(c.no) === C.name(no), { count: k, min: 0 }) : [];
      for (const c of cs || []) await ss(d, link.p, c);
      DM.shuffle(d, d.players[link.p].deck);
    } } });
  define("Serial Spell", { activate: { when: "chain",
    can: (d, ctx) => !!ctx.last && ctx.last.p === ctx.p && spellLink(ctx.last) && C.icon(ctx.last.card.no) === ICON.NORMAL && !ctx.last.negated && d.players[ctx.p].hand.some((c) => c !== ctx.card),
    cost: async (d, link) => { const h = d.players[link.p].hand; if (!h.length) return false; for (const c of h.slice()) await d.discard(link.p, c, "cost"); return true; },
    resolve: async (d, link) => {
      const v = link.prev;
      if (!v || !v.resolve) return;
      await d.runEffect(Object.assign({}, v, { p: link.p, zone: null, prev: link, negated: false, targets: v.targets.slice(), data: Object.assign({}, v.data) }));
    } } });
  define("Triangle Ecstasy Spark", { activate: { resolve: async (d, link) => {
    for (const z of up(d).filter((x) => isName(x.card, "Harpie Lady Sisters"))) d.addTemp(z, { setAtk: 2700 });
    d.flags.x52tri = { turn: d.turn, p: link.p };
    for (const z of H.st(d, 1 - link.p)) if (z.faceUp && C.isTrap(z.card.no) && !z.negated) { z.negated = true; X(d).neg.push(z); }
  } } });
  // ----- Equip Spells -----
  // (the equipped monster gone, and this card with it: its own effect then)
  const lostWith = (d, from, test) => from && from.z && from.z.equippedTo && test(from.z.equippedTo.card) ? from.z.equippedTo : null;
  define("Flint", Object.assign(DM.equip(() => true, { atk: -300 }), { x52flint: true,
    noAttack: (d, s, q, ap, z) => s.equippedTo === z,
    onToGrave: async (d, c, p, from, why) => {
      if (why !== "equip-lost" || !lostWith(d, from, (m) => m.destroyedTurn === d.turn)) return;
      const q = from.p, i = d.freeSpellZone(q);
      if (i < 0 || !inGrave(d, c)) return;
      const t = await d.pickZone(q, "Equip Flint to which monster?", (x) => x.faceUp, { area: "monster" });
      if (!t) return;
      d.take(c);
      const nz = DM.newZone(c, { faceUp: true, placedTurn: d.turn });
      d.players[q].zones[i] = nz;
      d.equip(nz, t, { atk: -300 });
      await d.emit({ type: "equip", card: c, to: t });
    } }));
  define("Necklace of Command", Object.assign(DM.equip(() => true, null), {
    onToGrave: async (d, c, p, from, why) => {
      const m = why === "equip-lost" && lostWith(d, from, (x) => x.battleDestroyedTurn === d.turn);
      if (!m) return;
      const q = from.p;
      const o = await d.choose(q, "Necklace of Command:", [{ label: "Draw 1 card", v: 0 }, { label: "Discard 1 random card from your opponent's hand", v: 1 }, { label: "Neither", v: 2 }]);
      if (o && o.v === 0) await d.drawCards(q, 1);
      else if (o && o.v === 1) await H.discardRandom(d, 1 - q);
    } }));

  // ---------- Traps ----------
  define("Absolute End", { activate: { can: (d, ctx) => d.turnPlayer !== ctx.p, resolve: async (d, link) => { d.flags.x52abs = { turn: d.turn, q: 1 - link.p }; } } });
  define("Enervating Mist", { activate: noop, endPhase: async (d, z, p) => {
    if (!d.live(z) || d.turnPlayer !== 1 - p) return;
    const h = d.players[1 - p].hand;
    while (h.length > 5 && !d.over) { const c = await d.pickCard(1 - p, "Discard down to 5 cards.", h); await d.discard(1 - p, c || h[0], "hand-limit"); }
  } });
  define("Gorgon's Eye", { activate: { resolve: async (d) => { d.flags.x52gorgon = d.turn; gorgon(d); } } });
  define("Greed", { activate: noop,
    onEvent: async (d, z, p, ev) => { if (ev.type !== "drew-outside") return; const g = z.data.greed && z.data.greed.turn === d.turn ? z.data.greed : (z.data.greed = { turn: d.turn, n: [0, 0] }); g.n[ev.p] += ev.n || 0; },
    endPhase: async (d, z) => {
      const g = z.data.greed;
      if (!d.live(z) || !g || g.turn !== d.turn) return;
      z.data.greed = null;
      await d.together(async () => { for (const q of [0, 1]) if (g.n[q]) await d.damage(q, 500 * g.n[q], "effect"); });
    } });
  define("Hallowed Life Barrier", { activate: { can: (d, ctx) => handCount(d, ctx) > 0, cost: discardCost(), resolve: async (d, link) => { d.players[link.p].flags.x52hallowed = d.turn; } } });
  define("Pikeru's Circle of Enchantment", { activate: { resolve: async (d, link) => { d.players[link.p].flags.x52pikeru = d.turn; } } });
  define("Mind Crush", { activate: { resolve: async (d, link) => {
    const o = await d.choose(link.p, "Declare a card name.", names());
    const q = 1 - link.p, hit = o ? d.players[q].hand.filter((c) => C.name(c.no) === o.label) : [];
    if (hit.length) { for (const c of hit) await d.discard(q, c, "effect"); }
    else await H.discardRandom(d, link.p);
  } } });
  define("Muko", { activate: { when: "drew-outside",
    can: (d, ctx) => !!ctx.event && (ctx.event.cards || []).some((c) => d.players[ctx.event.p].hand.includes(c)),
    resolve: async (d, link) => {
      const q = link.event.p, cs = (link.event.cards || []).filter((c) => d.players[q].hand.includes(c));
      await show(d, link.p, "The cards drawn:", cs);
      for (const c of cs) await d.discard(q, c, "effect");
    } } });
  define("Taunt", { activate: {
    can: (d, ctx) => d.phase === "main1" && d.turnPlayer !== ctx.p && d.monsters(ctx.p).length > 0,
    target: (d, link) => pickMon(d, link, "Which monster must they attack?", null, [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z) d.flags.xStaunch = { turn: d.turn, zone: z, p: link.p }; } } });
  define("Return from the Different Dimension", { activate: {
    can: (d, ctx) => d.players[ctx.p].lp > 1 && H.canSummonHere(d, ctx.p) && d.players[ctx.p].banished.some((c) => isMonCard(c)),
    cost: async (d, link) => { await d.payLp(link.p, Math.floor(d.players[link.p].lp / 2)); return true; },
    resolve: async (d, link) => {
      const tried = [];
      while (H.canSummonHere(d, link.p) && !d.over) {
        const c = await d.pickCard(link.p, "Special Summon which banished monster?", d.players[link.p].banished, (x) => C.isMonster(x.no) && !tried.includes(x));
        if (!c) break;
        tried.push(c);
        const z = await ss(d, link.p, c);
        if (z) z.data.banishAtEnd = d.turn;
      } } } });
  define("Astral Barrier", { activate: noop, onEvent: async (d, z, p, ev) => {
    const A = d.attack;
    if (ev.type !== "attack" || !A || A.p === p || !A.target || d.controllerOf(A.target) !== p) return;
    if (await d.yesNo(p, "Make " + d.name(A.attacker.card) + "'s attack a direct attack (Astral Barrier)?")) A.target = null;
  } });
  define("Covering Fire", { activate: { when: "before-damage",
    can: (d, ctx) => { const A = d.attack; return !!A && A.p !== ctx.p && !!A.target && d.controllerOf(A.target) === ctx.p && up(d, ctx.p).some((z) => z !== A.target); },
    target: (d, link) => { const A = d.attack; link.data.att = A && A.target; return pickMon(d, link, "Which other monster's ATK?", (z) => z.faceUp && z !== link.data.att, [link.p]); },
    resolve: async (d, link) => {
      const t = t0(d, link), m = link.data.att;
      if (!t || !m || !d.locate(m) || !t.faceUp) return;
      const e = { zone: m, stats: { atk: d.atkOf(t) } };
      d.temp.push(e); X(d).ds.push(e);
    } } });
  define("Mind Haxorz", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 500, cost: async (d, link) => { await d.payLp(link.p, 500); return true; },
    resolve: async (d, link) => { const q = 1 - link.p; await show(d, link.p, "Their hand and Set cards:", d.players[q].hand.concat(d.allZones(q).filter((z) => !z.faceUp).map((z) => z.card))); } } });
  define("Rare Metalmorph", { activate: {
    target: (d, link) => pickMon(d, link, "Which Machine monster?", (z) => z.faceUp && H.isType(d, z, "Machine")),
    resolve: async (d, link) => {
      const t = t0(d, link);
      if (!t || !t.faceUp || !link.zone || !d.locate(link.zone)) { if (link.zone) link.zone.data.discard = true; return; }
      d.addLink(t, { from: link.zone, kind: "rmm", stats: { atk: 500 } });
      t.data.boundTo = link.zone; link.zone.data.rmm = t;
    } },
    guardsTarget: async (d, s, q, z, l) => { if (s.data.rmm === z && !s.data.rmmUsed && spellLink(l)) { s.data.rmmUsed = true; l.negated = true; return "negate"; } } });
  define("Xing Zhen Hu", { activate: {
    can: (d, ctx) => [0, 1].reduce((n, q) => n + H.st(d, q).filter((z) => !z.faceUp && z !== ctx.zone).length, 0) >= 2,
    target: async (d, link) => {
      const zs = await d.pickZones(link.p, "Which 2 Set Spell or Trap Cards?", (z, q, i) => i >= 5 && !z.faceUp && z !== link.zone, { area: "spell", count: 2 });
      if (!zs || zs.length < 2) return false;
      link.targets = zs; return true; },
    resolve: async (d, link) => { const ts = link.targets.filter((z) => d.locate(z)); if (link.zone && ts.length) link.zone.data.xing = ts; } } });
})();

// (Cards beyond GX's: 2003-2005's, part 3: the Charmers, the Hex-Sealed Fusions, Silent Swordsman LV5 and LV7,
// Ultimate Insect LV5 and LV7, Sacred Phoenix of Nephthys, The Wicked Dreadroot and the others to Fury from the Deep.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo, ICON = DM.ICON;
  const { isName, show, discardCost, handCount, once, mine, noop, ss, piles } = DM.REST;
  const up = H.up, t0 = H.t, isMon = H.isMon, effectOf = DM.effectOf;
  const isT = (no, t) => C.type(no) === typeNo(t);
  const isMonCard = (c) => C.isMonster(c.no) && !C.isExtra(c.no);
  const inGrave = (d, c) => !!c && !c.token && d.players[c.owner].grave.includes(c);
  const ctl = (d, z) => d.controllerOf(z);
  const stays = (extra) => Object.assign({ activate: Object.assign({ stays: true }, noop) }, extra);
  const theirs = (ctx) => !!ctx.event && ctx.event.p !== ctx.p;
  const pickMon = (d, link, prompt, filter, sides) => H.target(d, link, prompt, (z, q) => (!sides || sides.includes(q)) && (!filter || filter(z, q)), { area: "monster" });
  // (the link resolving now; whether it's a Spell's activation, or a monster's effect)
  const curL = (d) => d.curLink || d.resolvingLink || (d.fxStack && d.fxStack[d.fxStack.length - 1]) || null;
  const spellLink = (l) => !!l && !!l.card && !l.card.token && !l.fromMonster && C.isSpell(l.card.no);
  const monLink = (l) => !!l && !!l.card && !l.card.token && (l.fromMonster || C.isMonster(l.card.no));
  const attrOnField = (d, a) => up(d).some((z) => H.attrOf(d, z) === a);
  const negateLink = async (d, l, destroy) => { l.negated = true; if (destroy && l.zone && d.locate(l.zone)) await d.destroy(l.zone, "negated"); return "negate"; };
  const self = (z, stats) => z.links.push({ kind: "self", stats });
  // (Special Summoned by that card's effect: the effect resolving, or that card just sent from the field)
  const byEffectOf = (d, name) => {
    const l = d.effectLink || curL(d);
    if (l && l.card && !l.card.token && C.name(l.card.no) === name) return true;
    for (let k = d.log.length - 2, n = 0; k >= 0 && n < 12; k--, n++) {
      const e = d.log[k];
      if (e.type === "summon") return false;
      if (e.type === "to-grave" && e.card && !e.card.token && C.name(e.card.no) === name && e.from && e.from.zone != null && e.from.zone < 5) return true;
    }
    return false;
  };
  // (a Normal Summon or Set of this card is allowed now, Tributes aside)
  const normalOk = (d, p, c) => {
    const pl = d.players[p], e = effectOf(c.no), noSummon = pl.flags.noSummonTurn === d.turn || d.players[1 - p].flags.noSummonFor === d.turn || d.liveWith("xNoSummons");
    return isMonCard(c) && !pl.normalSummoned && !pl.flags.noNormalSummon && !noSummon && !(e && e.specialOnly) && C.kind(c.no) !== "ritual"
      && !(e && e.needsField && !d.countOnField(N(e.needsField))) && !(e && e.normalIf && !e.normalIf(d, p));
  };
  // (the highest ATK face-up: Pole Position's)
  const tops = (d) => { const u = up(d); if (!u.length) return []; const m = Math.max(...u.map((z) => d.atkOf(z))); return u.filter((z) => d.atkOf(z) === m); };
  const poleImmune = (d, z, l) => spellLink(l) && !!d.liveWith("x5Pole") && isMon(d, z) && z.faceUp && tops(d).includes(z);
  // (Lone Wolf's monster: not destroyed by battle, unaffected by the opponent's monster effects)
  const wolfOf = (d, z) => [0, 1].some((q) => H.st(d, q).some((s) => s.data.x5Wolf === z && d.live(s) && ctl(d, z) === q));
  const wolfImmune = (d, z, l) => monLink(l) && wolfOf(d, z) && l.p !== ctl(d, z);
  // (a Fusion Monster's materials, from its text)
  const materials = (no) => DM.FUSIONS[no] || (((/^((?:"[^"]+"\s*\+\s*)+"[^"]+")/.exec(DM.text(no)) || [])[1] || "").match(/"[^"]+"/g) || []).map((s) => N(s.slice(1, -1))).filter(Boolean);

  // ---------- What the duel keeps for these cards, and the rules they add ----------
  // Effect properties read here: x5Double (an Attribute it counts as 2 Tributes for), x5OneTribute (its Normal
  // Summon or Set with 1 Tribute), x5NoSwitch (its control can't change), x5Pole (Pole Position), x5NoPos (the other
  // side's monsters keep their battle positions). Zone data: x5Charm (the Charmer whose monster this is while it's
  // face up), x5Watapon (Special Summoned when added from the Deck to the hand), x5Vandal (from the hand when its
  // controller's Counter Trap negates the opponent's activation), x5Sel (Impenetrable Formation's monster), x5Wolf (Lone Wolf's). Card fields: x5Lure (Grave Lure's), x5Lv
  // (Level Conversion Lab's Level this turn), x5Surv (D.D. Survivor banished this turn). Player flags: x5NoST (no
  // Spells or Traps this turn), x5Show (draws shown until then), x5Virus (draws checked until then).
  const X = (d) => d.x5 || (d.x5 = { tasks: [], busy: false });
  const atEnd = (d, fn) => X(d).tasks.push({ turn: d.turn, fn });
  async function settle(d) {
    const x = X(d);
    if (x.busy || d.over) return;
    x.busy = true;
    try {
      for (const q of [0, 1]) for (const z of d.monsters(q).slice()) {
        const s = z.data.x5Charm;
        if (!s || (d.locate(s) && s.faceUp && !s.negated)) continue;
        z.data.x5Charm = null;
        if (ctl(d, z) !== z.data.x5CharmTo) await d.takeControl(z, z.data.x5CharmTo);
      }
      for (const q of [0, 1]) for (const s of H.st(d, q)) if (s.data.x5Sel && !d.locate(s.data.x5Sel) && d.locate(s)) { s.data.x5Sel = null; await d.destroy(s, "effect"); }
    } finally { x.busy = false; }
  }
  // (cards a player draws, shown or checked: Pikeru's Second Sight, Deck Devastation Virus, Grave Lure)
  async function drawn(d, p, c) {
    const f = d.players[p].flags;
    if (c.x5Lure) { c.x5Lure = false; await d.emit({ type: "reveal", p, card: c }); await d.sendToGrave(c, "effect"); return; }
    if (f.x5Show && f.x5Show.left > 0) await show(d, 1 - p, "The card your opponent drew:", [c]);
    if (f.x5Virus && d.turn <= f.x5Virus.until) {
      await show(d, f.x5Virus.by, "The card your opponent drew:", [c]);
      if (C.isMonster(c.no) && C.atk(c.no) <= 1500 && d.players[p].hand.includes(c)) await d.sendToGrave(c, "destroyed");
    }
  }
  // (a Counter Trap that negated the opponent's activation: Van'Dalgyon from the hand)
  async function vandal(d, p, v) {
    const c = d.players[p].hand.find((x) => (effectOf(x.no) || {}).x5Vandal);
    if (!c || !H.canSummonHere(d, p) || (v.event && v.event.damageStep) || !(await d.yesNo(p, "Special Summon Van'Dalgyon the Dark Dragon Lord from your hand?"))) return;
    const z = await ss(d, p, c, { byRule: true });
    if (!z) return;
    const kind = monLink(v) ? "monster" : C.isSpell(v.card.no) ? "spell" : "trap";
    if (kind === "spell") await d.damage(1 - p, 1500, "effect");
    else if (kind === "trap") { const t = await d.pickZone(p, "Destroy which of your opponent's cards?", (x, q) => q !== p, { sides: [1 - p] }); if (t) await d.destroy(t, "effect"); }
    else if (H.canSummonHere(d, p)) { const m = await d.pickCard(p, "Special Summon which monster from your Graveyard?", d.players[p].grave, (x) => C.isMonster(x.no) && !C.isExtra(x.no)); if (m) await ss(d, p, m); }
  }
  function patch(d) {
    const o = {};
    for (const k of ["emit", "runEffect", "destroy", "takeControl", "battleDamage", "mainActions", "canActivate"]) o[k] = d[k];
    d.emit = async function (ev) {
      if (ev.type === "banish" && ev.card && !ev.card.token && ev.from && ev.from.zone != null && ev.from.zone < 5 && ev.from.z && ev.from.z.faceUp && ev.from.p === ev.card.owner) ev.card.x5Surv = this.turn;
      if (ev.card && ev.card.x5Lure && ev.type !== "draw" && ev.type !== "reveal") ev.card.x5Lure = false;
      // (Level Conversion Lab's monster summoned this turn: its Level)
      if (ev.type === "summon" && ev.zone && ev.card && ev.card.x5Lv && ev.card.x5Lv.turn === this.turn) { const lv = ev.card.x5Lv.lv; ev.card.x5Lv = null; this.addTemp(ev.zone, { level: lv - C.level(ev.card.no) }); }
      await o.emit.call(this, ev);
      if (this.over) return;
      if (ev.type === "draw" && ev.card) await drawn(this, ev.p, ev.card);
      else if (ev.type === "to-hand" && ev.card && !ev.card.token && (effectOf(ev.card.no) || {}).x5Watapon && ev.from && ev.from.pile === "deck" && ev.why !== "draw") {
        const p = ev.card.owner;
        if (this.players[p].hand.includes(ev.card) && H.canSummonHere(this, p) && (await this.yesNo(p, "Special Summon " + this.name(ev.card) + "?"))) await ss(this, p, ev.card);
      } else if (ev.type === "phase" && ev.phase === "end") {
        const x = X(this), due = x.tasks.filter((t) => t.turn === this.turn);
        x.tasks = x.tasks.filter((t) => !due.includes(t));
        for (const t of due) if (!this.over) await t.fn(this);
        const f = this.players[this.turnPlayer].flags;
        if (f.x5Show && --f.x5Show.left <= 0) f.x5Show = null;
      }
      await settle(this);
    };
    d.runEffect = async function (link) {
      const v = link && link.prev, before = !!(v && v.negated);
      await o.runEffect.call(this, link);
      if (v && !before && v.negated && v.p !== link.p && link.card && !link.card.token && C.isTrap(link.card.no) && C.icon(link.card.no) === ICON.COUNTER && !link.fromMonster && !this.over) await vandal(this, link.p, v);
    };
    d.destroy = async function (z, why, by) {
      const l = this.locate(z);
      if (!l) return false;
      const L = curL(this);
      if (l.i < 5 && why !== "battle" && L && L.zone !== z && (poleImmune(this, z, L) || wolfImmune(this, z, L))) return false;
      if (l.i < 5 && why === "battle" && wolfOf(this, z)) return false;
      // (Nitro Unit: its monster destroyed by battle, its ATK to that monster's controller)
      const nitro = why === "battle" && l.i < 5 && z.links.some((k) => k.kind === "equip" && k.from && this.locate(k.from) && isName(k.from.card, "Nitro Unit") && this.live(k.from));
      const atk = nitro ? this.atkOf(z) : 0;
      const ok = await o.destroy.call(this, z, why, by);
      if (ok && nitro && inGrave(this, z.card)) await this.damage(l.p, atk, "effect");
      return ok;
    };
    d.takeControl = async function (z, p) {
      const e = this.live(z), L = curL(this);
      if (e && e.x5NoSwitch && e.x5NoSwitch(this, z)) return false;
      if (L && (poleImmune(this, z, L) || wolfImmune(this, z, L))) return false;
      return o.takeControl.call(this, z, p);
    };
    d.battleDamage = async function (r, n, dealer, other, A) {
      // (Union Attack's monster: no battle damage to the opponent; Cross Counter: doubled, and the attacker destroyed)
      if (dealer && dealer.data.x5Union === this.turn && r !== ctl(this, dealer)) return 0;
      if (A && A.x5Cross && r === A.p && dealer === A.target) { n *= 2; if (this.locate(A.attacker)) A.attacker.data.destroyAfterBattle = true; }
      return o.battleDamage.call(this, r, n, dealer, other, A);
    };
    d.mainActions = function (p) {
      let acts = o.mainActions.call(this, p);
      const pl = this.players[p], extra = [];
      // (the other side's Swords of Concealing Light: no battle position changes)
      if (H.st(this, 1 - p).some((s) => { const e = this.live(s); return e && e.x5NoPos; })) acts = acts.filter((a) => a.act !== "position" && a.act !== "flip-summon");
      // (Level Conversion Lab: its Level this turn, and the Tributes it needs)
      for (const c of pl.hand) {
        if (!c.x5Lv || c.x5Lv.turn !== this.turn || !normalOk(this, p, c)) continue;
        const e = effectOf(c.no), lv = c.x5Lv.lv, t = e && e.tributes != null ? e.tributes : lv >= 7 ? 2 : lv >= 5 ? 1 : 0;
        const known = acts.filter((a) => a.card === c && (a.act === "summon" || a.act === "set-monster") && !a.kaiser);
        for (const a of known) a.tributes = t;
        if (!known.length && this.tributable(p).length >= t && (t > 0 || this.freeMonsterZone(p) >= 0))
          for (const act of ["summon", "set-monster"]) extra.push({ act, card: c, tributes: t, label: (act === "summon" ? "Summon " : "Set ") + C.name(c.no) });
      }
      for (const c of pl.hand) {
        if (!normalOk(this, p, c)) continue;
        const e = effectOf(c.no);
        // (Behemoth: with 1 Tribute)
        if (e && e.x5OneTribute && this.tributable(p).length >= 1) for (const act of ["summon", "set-monster"]) extra.push({ act, card: c, tributes: 1, label: (act === "summon" ? "Summon " : "Set ") + C.name(c.no) + " (1 Tribute)" });
        // (Flame Ruler, Whirlwind Prodigy: 2 Tributes for a monster of their Attribute)
        if (DM.tributesFor(c.no, e) !== 2 || (e && e.tributeFilter) || (c.x5Lv && c.x5Lv.turn === this.turn)) continue;
        for (const z of this.tributable(p)) {
          const ze = this.live(z);
          if (!ze || !ze.x5Double || ze.x5Double !== C.attribute(c.no)) continue;
          for (const act of ["summon", "set-monster"]) extra.push({ act, card: c, tributes: 1, kaiser: z, label: (act === "summon" ? "Summon " : "Set ") + C.name(c.no) + " (" + C.name(z.card.no) + " as 2 Tributes)" });
          break;
        }
      }
      if (extra.length) { const at = acts.findIndex((a) => a.act === "battle" || a.act === "end"); acts.splice(at < 0 ? acts.length : at, 0, ...extra); }
      return acts;
    };
    d.canActivate = function (p, c, a, ctx) {
      if (this.players[p].flags.x5NoST === this.turn && c && !c.token && (C.isSpell(c.no) || C.isTrap(c.no))) return false;
      return o.canActivate.call(this, p, c, a, ctx);
    };
    return d;
  }
  const create0 = DM.create;
  DM.create = function () { return patch(create0.apply(this, arguments)); };
  // (Pole Position's monsters: not the target of a Spell; Lone Wolf's: not of the opponent's monster effects)
  const target0 = H.target;
  H.target = function (d, link, prompt, filter, opts) {
    return target0.call(this, d, link, prompt, (z, q, i) => (!filter || filter(z, q, i)) && !(i < 5 && (poleImmune(d, z, link) || wolfImmune(d, z, link))), opts);
  };

  // ----- Summoned their own way -----
  const tributeOf = (names) => ({ specialOnly: true,
    specialFromHand: (d, p) => up(d, p).some((z) => isName(z.card, names) && !z.data.cannotTribute),
    specialCost: async (d, p) => { const z = await d.pickZone(p, "Tribute which monster?", (x, q) => q === p && x.faceUp && isName(x.card, names) && !x.data.cannotTribute, { sides: [p], area: "monster", cancel: true }); if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; } });
  define("Blue-Eyes Shining Dragon", Object.assign(tributeOf(["Blue-Eyes Ultimate Dragon"]), {
    selfStats: (d, z) => ({ atk: 300 * d.players[ctl(d, z) < 0 ? z.card.owner : ctl(d, z)].grave.filter((c) => C.isMonster(c.no) && isT(c.no, "Dragon")).length }),
    onTargeted: async (d, z, p, l) => { if (l.p !== p && (await d.yesNo(p, "Negate " + d.name(l.card) + "'s effect (Blue-Eyes Shining Dragon)?"))) return negateLink(d, l, false); } }));
  const caster6 = (d, x, p) => x.faceUp && H.isType(d, x, "Spellcaster") && H.lvl(d, x) >= 6 && !x.data.cannotTribute;
  define("Sorcerer of Dark Magic", { specialOnly: true,
    specialFromHand: (d, p) => d.monsters(p).filter((x) => caster6(d, x, p)).length >= 2,
    specialCost: async (d, p) => { const zs = await d.pickZones(p, "Tribute 2 Level 6 or higher Spellcasters.", (x, q) => q === p && caster6(d, x, p), { sides: [p], area: "monster", count: 2, cancel: true }); if (!zs || zs.length < 2) return false; for (const z of zs) await d.sendToGrave(z.card, "tribute"); return true; },
    quick: { when: "chain", can: (d, ctx) => !!ctx.last && ctx.last.p !== ctx.p && !ctx.last.fromMonster && !!ctx.last.card && !ctx.last.card.token && C.isTrap(ctx.last.card.no) && !ctx.last.negated,
      resolve: async (d, link) => { if (link.prev && link.zone && d.locate(link.zone) && link.zone.faceUp) await negateLink(d, link.prev, true); } } });
  define("Vampire Genesis", { specialOnly: true,
    specialFromHand: (d, p) => up(d, p).some((z) => isName(z.card, "Vampire Lord")),
    specialCost: async (d, p) => { const z = await d.pickZone(p, "Banish which Vampire Lord?", (x, q) => q === p && x.faceUp && isName(x.card, "Vampire Lord"), { sides: [p], area: "monster", cancel: true }); if (!z) return false; await d.banish(z.card, "cost"); return true; },
    ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && H.canSummonHere(d, ctx.p) && d.players[ctx.p].hand.some((c) => C.isMonster(c.no) && isT(c.no, "Zombie") && H.graveMon(d, ctx.p, (g) => isT(g.no, "Zombie") && C.level(g.no) < C.level(c.no)).length > 0),
      cost: async (d, link) => {
        const c = await d.pickCard(link.p, "Discard which Zombie monster?", d.players[link.p].hand, (x) => C.isMonster(x.no) && isT(x.no, "Zombie") && H.graveMon(d, link.p, (g) => isT(g.no, "Zombie") && C.level(g.no) < C.level(x.no)).length > 0);
        if (!c) return false; link.data.lv = C.level(c.no); await d.discard(link.p, c); return true; },
      resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Zombie from your Graveyard?", d.players[link.p].grave, (g) => C.isMonster(g.no) && isT(g.no, "Zombie") && C.level(g.no) < link.data.lv); if (c) await ss(d, link.p, c); } } });
  define("Infernal Flame Emperor", { noSpecial: true, afterTribute: async (d, z, p) => {
    const fire = H.graveMon(d, p, (c) => C.attribute(c.no) === ATTR.FIRE), k = Math.min(5, fire.length, H.st(d).length);
    if (!z.faceUp || !k || !(await d.yesNo(p, "Banish FIRE monsters from your Graveyard to destroy as many Spells and Traps?"))) return;
    const cs = await d.pickCards(p, "Banish up to " + k + " FIRE monsters from your Graveyard.", fire, null, { count: k, min: 1 });
    for (const c of cs || []) await d.banish(c, "effect");
    const n = Math.min((cs || []).length, H.st(d).length);
    const ts = n ? await d.pickZones(p, "Destroy " + n + " Spell or Trap Card" + (n > 1 ? "s" : "") + ".", (x, q, i) => i >= 5, { area: "spell", count: n }) : [];
    await H.destroyAll(d, ts || []);
  } });
  define("The Wicked Dreadroot", { noSpecial: true, tributes: 3, aura: (d, src, sp, z) => (z !== src && isMon(d, z) ? { atkMult: 0.5, defMult: 0.5 } : null) });
  define("Behemoth the King of All Animals", { x5OneTribute: true, afterTribute: async (d, z, p, tribs) => {
    if (tribs.length === 1) z.data.base = Object.assign({}, z.data.base, { atk: 2000 });
    const beasts = () => H.graveMon(d, p, (c) => isT(c.no, "Beast"));
    if (!z.faceUp || !beasts().length || !(await d.yesNo(p, "Return Beasts from your Graveyard to the hand?"))) return;
    const cs = await d.pickCards(p, "Return which Beast-Type monsters?", beasts(), null, { count: tribs.length });
    for (const c of cs || []) await d.toHand(c, "effect");
  } });
  define("Flame Ruler", { x5Double: ATTR.FIRE });
  define("Whirlwind Prodigy", { x5Double: ATTR.WIND });

  // ----- The LV monsters: sent from the field for the next LV, from the hand or Deck -----
  const lvUp = (next, cond) => async (d, z, p) => {
    if (d.turnPlayer !== p || !z.faceUp || (cond && !cond(d, z)) || !piles(d, p, ["hand", "deck"]).some((c) => isName(c, next))) return;
    if (!(await d.yesNo(p, "Send " + d.name(z.card) + " to the Graveyard to Special Summon " + next + "?"))) return;
    await d.runEffect({ card: z.card, zone: z, p, kind: "trigger", label: d.name(z.card), targets: [], data: {}, resolve: async (d2, link) => {
      if (!d2.locate(z)) return;
      await d2.sendToGrave(z.card, "cost");
      const c = await d2.pickCard(p, "Special Summon " + next + ".", piles(d2, p, ["hand", "deck"]), (x) => isName(x, next));
      if (c) await ss(d2, p, c);
      DM.shuffle(d2, d2.players[p].deck);
    } });
  };
  define("Silent Swordsman LV5", { immuneTo: (d, z, p, l) => l.p !== p && spellLink(l),
    onBattleDamage: async (d, z, p, other) => { if (!other) z.data.x5Direct = d.turn; },
    standby: async (d, z, p) => { if (z.data.x5Direct != null && d.turnPlayer === p && d.turn > z.data.x5Direct) { z.data.x5Direct = null; await lvUp("Silent Swordsman LV7")(d, z, p); } } });
  define("Silent Swordsman LV7", { specialOnly: true, negatesSpells: true });
  define("Ultimate Insect LV5", { onSummon: async (d, z, p, how) => { if (how === "special" && byEffectOf(d, "Ultimate Insect LV3")) z.data.x5ByLv = true; },
    aura: (d, src, sp, z, zp) => (src.data.x5ByLv && zp !== sp && isMon(d, z) ? { atk: -500 } : null),
    standby: lvUp("Ultimate Insect LV7", (d, z) => z.placedTurn !== d.turn && z.data.flipTurn !== d.turn) });
  define("Ultimate Insect LV7", { onSummon: async (d, z, p, how) => { if (how === "special" && byEffectOf(d, "Ultimate Insect LV5")) z.data.x5ByLv = true; },
    aura: (d, src, sp, z, zp) => (src.data.x5ByLv && zp !== sp && isMon(d, z) ? { atk: -700, def: -700 } : null) });

  // ----- The Charmers: FLIP: a monster of theirs of its Attribute, while this card is face up -----
  const charmer = (a, faceUp) => ({ flip: async (d, link) => {
    const me = link.zone, p = link.p;
    if (!me || !d.locate(me) || !me.faceUp) return;
    const t = await d.pickZone(p, "Take control of which " + window.YUGIOH_CARDS.attributes[ATTR[a]] + " monster?", (x, q) => q !== p && H.isAttr(d, x, a) && (!faceUp || x.faceUp), { sides: [1 - p], area: "monster" });
    if (t && (await d.takeControl(t, p))) { t.data.x5Charm = me; t.data.x5CharmTo = 1 - p; t.data.returnAtEnd = null; }
  } });
  define("Aussa the Earth Charmer", charmer("EARTH"));
  define("Eria the Water Charmer", charmer("WATER", true));
  define("Hiita the Fire Charmer", charmer("FIRE", true));
  define("Wynn the Wind Charmer", charmer("WIND"));

  // ----- Flip effects -----
  define("Brain Jacker", {
    flip: async (d, link) => {
      const me = link.zone, p = link.p, i = d.freeSpellZone(p);
      if (!me || !d.locate(me) || i < 0) return;
      const t = await d.pickZone(p, "Equip Brain Jacker to which of your opponent's monsters?", (x, q) => q !== p, { sides: [1 - p], area: "monster" });
      if (!t) return;
      d.take(link.card);
      const nz = DM.newZone(link.card, { faceUp: true, placedTurn: d.turn });
      nz.data.x5Jack = true;
      d.players[p].zones[i] = nz;
      d.equip(nz, t, null);
      await d.emit({ type: "equip", card: link.card, to: t });
      if (await d.takeControl(t, p)) t.data.x5JackTo = 1 - p;
    },
    standby: async (d, z, p) => { if (z.data.x5Jack && z.equippedTo && d.turnPlayer !== p) await d.heal(1 - p, 500); },
    onLeave: async (d, z) => { const m = z.equippedTo; if (z.data.x5Jack && m && d.locate(m) && m.data.x5JackTo != null) { const to = m.data.x5JackTo; m.data.x5JackTo = null; await d.takeControl(m, to); } } });
  define("Dummy Golem", { flip: async (d, link) => {
    const me = link.zone, p = link.p;
    if (!me || !d.locate(me) || !d.monsters(1 - p).length) return;
    const t = await d.pickZone(1 - p, "Choose a monster you control to switch with Dummy Golem.", (x, q) => q !== p, { sides: [1 - p], area: "monster" });
    if (t && (await d.takeControl(me, 1 - p))) await d.takeControl(t, p);
  } });

  // ----- Ignition effects -----
  define("Catnipped Kitty", { protectsFromAttack: (d, s, q, z) => z === s && d.monsters(q).some((x) => x !== s && H.isType(d, x, "Beast")),
    ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.monsters(1 - ctx.p).length > 0,
      target: (d, link) => pickMon(d, link, "Make which monster's DEF 0 this turn?", (z) => z.faceUp, [1 - link.p]),
      resolve: async (d, link) => { const t = t0(d, link); if (t) d.addTemp(t, { setDef: 0 }); } } });
  define("Chiron the Mage", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && handCount(d, ctx, (c) => C.isSpell(c.no)) > 0 && H.st(d, 1 - ctx.p).length > 0,
    cost: discardCost((c) => C.isSpell(c.no), "Discard which Spell Card?"),
    target: (d, link) => H.target(d, link, "Destroy which Spell or Trap Card?", (z, q, i) => q !== link.p && i >= 5, { area: "spell", sides: [1 - link.p] }),
    resolve: async (d, link) => { const t = t0(d, link); if (t) await d.destroy(t, "effect"); } } });
  define("Hand of Nephthys", { ignition: { can: (d, ctx) => mine(d, ctx) && d.monsters(ctx.p).some((x) => x !== ctx.zone && !x.data.cannotTribute) && piles(d, ctx.p, ["hand", "deck"]).some((c) => isName(c, "Sacred Phoenix of Nephthys")),
    cost: async (d, link) => {
      const z = await d.pickZone(link.p, "Tribute which other monster?", (x, q) => q === link.p && x !== link.zone && !x.data.cannotTribute, { sides: [link.p], area: "monster", cancel: true });
      if (!z || !link.zone || !d.locate(link.zone)) return false;
      await d.sendToGrave(link.card, "tribute"); await d.sendToGrave(z.card, "tribute"); return true; },
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon Sacred Phoenix of Nephthys.", piles(d, link.p, ["hand", "deck"]), (x) => isName(x, "Sacred Phoenix of Nephthys")); if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } } });
  const lowBeasts = (d, p) => H.deckMon(d, p, (c) => isT(c.no, "Beast") && C.level(c.no) <= 3);
  define("Rescue Cat", { ignition: { can: (d, ctx) => mine(d, ctx) && d.players[ctx.p].flags.x5Rescue !== d.turn && lowBeasts(d, ctx.p).length >= 2 && !d.players[ctx.p].flags.noSpecialSummon && [0, 1, 2, 3, 4].filter((i) => !d.players[ctx.p].zones[i] && !d.closed(ctx.p, i)).length >= 1,
    cost: async (d, link) => { d.players[link.p].flags.x5Rescue = d.turn; await d.sendToGrave(link.card, "cost"); return true; },
    resolve: async (d, link) => {
      const cs = await d.pickCards(link.p, "Special Summon 2 Level 3 or lower Beasts from your Deck.", lowBeasts(d, link.p), null, { count: 2 });
      for (const c of cs || []) { const z = await ss(d, link.p, c); if (z) { z.negated = true; z.data.destroyAtEnd = d.turn; } }
      DM.shuffle(d, d.players[link.p].deck);
    } } });
  define("Mid Shield Gardna", { spellShield: true, ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d), resolve: async (d, link) => { if (link.zone && d.locate(link.zone)) await d.flipDown(link.zone); } } });
  // (the Hex-Sealed Fusions: Tribute it and the other materials on the field for a Fusion Monster of its Attribute)
  const hexFusions = (d, p, z, a) => {
    const out = [], pool = up(d, p).filter((x) => x !== z && !x.card.token && !x.data.cannotTribute);
    if (z.data.cannotTribute) return out;
    for (const f of d.players[p].fusion) {
      const need = materials(f.no), e = effectOf(f.no);
      if (C.attribute(f.no) !== a || need.length < 2 || (e && (e.mustFusion || e.contact || e.onlyBy)) || /Must (?:first )?be Fusion Summoned|cannot be Special Summoned/i.test(DM.text(f.no))) continue;
      search: for (let k = 0; k < need.length; k++) {
        const used = [z];
        if (need.every((no, j) => { if (j === k) return true; const x = pool.find((y) => !used.includes(y) && y.card.no === no); if (x) used.push(x); return !!x; })) { out.push({ fusion: f, zones: used }); break search; }
      }
    }
    return out;
  };
  const hex = (a) => ({ fusionSub: true, ignition: { can: (d, ctx) => mine(d, ctx) && !d.players[ctx.p].flags.noSpecialSummon && hexFusions(d, ctx.p, ctx.zone, ATTR[a]).length > 0,
    cost: async (d, link) => {
      const opts = hexFusions(d, link.p, link.zone, ATTR[a]);
      const o = await d.choose(link.p, "Special Summon which Fusion Monster?", opts.map((x) => ({ label: d.name(x.fusion), x })));
      if (!o) return false;
      link.data.fusion = o.x.fusion;
      for (const z of o.x.zones) if (d.locate(z)) await d.sendToGrave(z.card, "tribute");
      return true; },
    resolve: async (d, link) => { const f = link.data.fusion; if (f && d.players[link.p].fusion.includes(f)) await ss(d, link.p, f); } } });
  define("The Dark - Hex-Sealed Fusion", hex("DARK"));
  define("The Earth - Hex-Sealed Fusion", hex("EARTH"));
  define("The Light - Hex-Sealed Fusion", hex("LIGHT"));

  // ----- In battle -----
  define("Armed Samurai - Ben Kei", { attacks: (d, z) => 1 + z.links.filter((l) => l.kind === "equip" && l.from && d.locate(l.from)).length });
  define("Big-Tusked Mammoth", { noAttack: (d, s, q, p, z) => p !== q && (z.placedTurn === d.turn || z.data.flipTurn === d.turn) });
  define("Element Doom", {
    battleResult: (d, s, r, att, target, res) => { if (!attrOnField(d, ATTR.EARTH)) return; if (s === att && res.targetDies) target.data.negateIfDies = d.turn; else if (s === target && res.attackerDies) att.data.negateIfDies = d.turn; },
    onDestroyByBattle: async (d, z, p) => { if (d.turnPlayer === p && attrOnField(d, ATTR.WIND) && z.data.x5Again !== d.turn) { z.data.x5Again = d.turn; z.attacks = Math.max(0, z.attacks - 1); } } });
  define("Element Valkyrie", { selfStats: (d) => (attrOnField(d, ATTR.FIRE) ? { atk: 500 } : null), x5NoSwitch: (d) => attrOnField(d, ATTR.WATER) });
  define("Grave Ohja", { protectsFromAttack: (d, s, q, z) => z === s && d.monsters(q).some((x) => !x.faceUp && x.defense),
    onEvent: async (d, z, p, ev) => { if (ev.type === "flip-summoned" && ev.p === p) await d.damage(1 - p, 300, "effect"); } });
  define("Hieracosphinx", { protectsFromAttack: (d, s, q, z) => !z.faceUp && z.defense });

  // ----- Destroyed, and from the Graveyard or banished -----
  define("Vampire's Curse", {
    onDestroyed: async (d, z, p, why) => { if (why === "battle" && inGrave(d, z.card) && d.players[p].lp > 500 && (await d.yesNo(p, "Pay 500 LP to Special Summon Vampire's Curse next Standby Phase?"))) { await d.payLp(p, 500); z.card.x5Curse = d.turn; } },
    graveStandby: async (d, c, p) => { if (c.x5Curse == null || d.turn !== c.x5Curse + 1) return; c.x5Curse = null; if (!H.canSummonHere(d, p)) return; const z = await ss(d, p, c); if (z) self(z, { atk: 500 }); } });
  define("Sacred Phoenix of Nephthys", {
    onDestroyed: async (d, z, p, why) => { if (why !== "battle" && inGrave(d, z.card)) z.card.x5Phoenix = d.turn; },
    graveStandby: async (d, c, p) => { if (c.x5Phoenix == null || d.turnPlayer !== p || d.turn <= c.x5Phoenix) return; c.x5Phoenix = null; if (!H.canSummonHere(d, p)) return; if (await ss(d, p, c)) await H.destroyAll(d, H.st(d)); } });
  define("D.D. Survivor", { banishedEnd: async (d, c, q) => { if (c.x5Surv !== d.turn) return; c.x5Surv = null; if (H.canSummonHere(d, q)) await ss(d, q, c); } });
  define("Firebird", { onEvent: async (d, z, p, ev) => { if ((ev.type === "destroyed" || ev.type === "battle-destroyed") && ev.p === p && ev.card && ev.card !== z.card && !ev.card.token && C.isMonster(ev.card.no) && isT(ev.card.no, "Winged Beast")) self(z, { atk: 500 }); } });
  define("Criosphinx", { onEvent: async (d, z, p, ev) => {
    if (ev.type !== "returned" || !ev.card || ev.card.token) return;
    const q = ev.card.owner;
    if (d.players[q].hand.length) await H.discardOne(d, q, "Send a card from your hand to the Graveyard (Criosphinx).");
  } });
  define("Watapon", { x5Watapon: true });
  define("Van'Dalgyon the Dark Dragon Lord", { x5Vandal: true });

  // ----- Spells -----
  define("Owner's Seal", { activate: { can: (d) => [0, 1].some((q) => d.monsters(q).some((z) => z.card.owner !== q && !z.card.token)), resolve: async (d) => {
    for (const q of [0, 1]) for (const z of d.monsters(q).slice()) if (d.locate(z) && !z.card.token && z.card.owner !== q) { z.data.returnAtEnd = null; z.data.x5Charm = null; await d.takeControl(z, z.card.owner); } } } });
  define("Union Attack", { activate: { can: (d, ctx) => d.phase === "main1" && d.turn > 0 && up(d, ctx.p).length > 0,
    target: (d, link) => pickMon(d, link, "Which monster gains the others' ATK?", (z) => z.faceUp, [link.p]),
    resolve: async (d, link) => {
      const t = t0(d, link);
      if (!t || !t.faceUp) return;
      const others = up(d, link.p).filter((z) => z !== t && !z.defense), n = others.reduce((a, z) => a + d.atkOf(z), 0), turn = d.turn;
      t.links.push({ kind: "self", until: turn, stats: (d2) => (d2.turn === turn && d2.phase === "battle" ? { atk: n } : null) });
      t.data.x5Union = turn;
      for (const z of others) z.data.cannotAttackTurn = turn;
    } } });
  define("Ballista of Rampart Smashing", Object.assign(DM.equip(() => true, null), { equipBattleStats: (d, z, r, o, attacking) => (attacking && o && o.defense && o.data.attackedFaceDown === d.turn ? { atk: 1500 } : null) }));
  define("Nitro Unit", DM.equip((d, z, p) => ctl(d, z) !== p, null));
  define("Centrifugal Field", stays({ onEvent: async (d, z, p, ev) => {
    if (ev.type !== "destroyed" || !ev.card || ev.card.token || C.kind(ev.card.no) !== "fusion" || !inGrave(d, ev.card)) return;
    const q = ev.card.owner, need = materials(ev.card.no), pool = d.players[q].grave.filter((c) => C.isMonster(c.no) && need.includes(c.no));
    if (!pool.length || !H.canSummonHere(d, q)) return;
    const c = await d.pickCard(q, "Special Summon which of its Fusion Material Monsters?", pool);
    if (c) await ss(d, q, c);
  } }));
  define("Mind Control", { activate: { can: (d, ctx) => d.monsters(1 - ctx.p).length > 0 && d.freeMonsterZone(ctx.p) >= 0,
    target: (d, link) => pickMon(d, link, "Take control of which monster?", null, [1 - link.p]),
    resolve: async (d, link) => {
      const z = t0(d, link);
      if (!z || !(await d.takeControl(z, link.p))) return;
      const was = z.data.cannotTribute;
      z.data.returnAtEnd = { to: 1 - link.p, turn: d.turn }; z.data.cannotAttackTurn = d.turn; z.data.cannotTribute = true;
      atEnd(d, () => { z.data.cannotTribute = was; });
    } } });
  const normalCard = (z) => !z.card.token && ["normal", "effect"].includes(C.kind(z.card.no)) && !(effectOf(z.card.no) || {}).specialOnly && !/Cannot be Normal Summoned/i.test(DM.text(z.card.no));
  define("Brain Control", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 800 && up(d, 1 - ctx.p).some(normalCard) && d.freeMonsterZone(ctx.p) >= 0,
    cost: async (d, link) => { await d.payLp(link.p, 800); return true; },
    target: (d, link) => pickMon(d, link, "Take control of which monster?", (z) => z.faceUp && normalCard(z), [1 - link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z && (await d.takeControl(z, link.p))) z.data.returnAtEnd = { to: 1 - link.p, turn: d.turn }; } } });
  const lowerThan = (d, p, lv) => d.monsters(p).some((z) => H.lvl(d, z) < lv);
  define("Double Attack", { activate: { can: (d, ctx) => d.players[ctx.p].hand.some((c) => c !== ctx.card && C.isMonster(c.no) && lowerThan(d, ctx.p, C.level(c.no))),
    cost: async (d, link) => {
      const c = await d.pickCard(link.p, "Discard which monster?", d.players[link.p].hand, (x) => x !== link.card && C.isMonster(x.no) && lowerThan(d, link.p, C.level(x.no)));
      if (!c) return false; link.data.lv = C.level(c.no); await d.discard(link.p, c); return true; },
    resolve: async (d, link) => { const z = await d.pickZone(link.p, "Which monster can attack twice this turn?", (x, q) => q === link.p && H.lvl(d, x) < link.data.lv, { sides: [link.p], area: "monster" }); if (z) z.data.twiceTurn = d.turn; } } });
  define("Gift of the Martyr", { activate: { can: (d, ctx) => d.monsters(ctx.p).length >= 2,
    cost: async (d, link) => {
      const z = await d.pickZone(link.p, "Send which monster to the Graveyard?", (x, q) => q === link.p, { sides: [link.p], area: "monster", cancel: true });
      if (!z) return false; link.data.atk = z.faceUp ? d.atkOf(z) : C.atk(z.card.no); await d.sendToGrave(z.card, "cost"); return true; },
    resolve: async (d, link) => { const z = await d.pickZone(link.p, "Which monster gains its ATK?", (x, q) => q === link.p && x.faceUp, { sides: [link.p], area: "monster" }); if (z) d.addTemp(z, { atk: link.data.atk || 0 }); } } });
  define("Spell Absorption", stays({ onEvent: async (d, z, p, ev) => {
    if (ev.type !== "activated" || !ev.card || ev.card === z.card || ev.card.token || !C.isSpell(ev.card.no) || ev.from === "monster" || !ev.link || typeof ev.link.resolve !== "function") return;
    const r0 = ev.link.resolve;
    ev.link.resolve = async (d2, l) => { await r0(d2, l); if (d2.locate(z) && d2.live(z)) await d2.heal(ctl(d2, z), 500, "effect"); };
  } }));
  define("Swords of Concealing Light", { x5NoPos: true,
    activate: { stays: true, resolve: async (d, link) => { for (const z of up(d, 1 - link.p).slice()) await d.flipDown(z); } },
    standby: async (d, z, p) => { if (d.turnPlayer !== p) return; z.data.x5Swords = (z.data.x5Swords || 0) + 1; if (z.data.x5Swords >= 2) await d.destroy(z, "effect"); } });
  define("Impenetrable Formation", { activate: { stays: true, can: (d, ctx) => d.monsters(ctx.p).length > 0, resolve: async (d, link) => {
    const z = await d.pickZone(link.p, "Select which monster?", (x, q) => q === link.p, { sides: [link.p], area: "monster" });
    if (z && link.zone && d.locate(link.zone)) link.zone.data.x5Sel = z; else if (link.zone) link.zone.data.discard = true; } },
    aura: (d, src, sp, z, zp) => (src.data.x5Sel === z && zp === sp && d.monsters(sp).length >= 2 && d.monsters(sp).every((x) => x.defense) ? { def: 700 } : null) });
  define("Shifting Shadows", stays({ ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.players[ctx.p].lp > 300 && d.monsters(ctx.p).filter((z) => !z.faceUp && z.defense).length >= 2,
    cost: async (d, link) => { await d.payLp(link.p, 300); return true; },
    resolve: async (d, link) => {
      const zs = d.players[link.p].zones, at = [0, 1, 2, 3, 4].filter((i) => zs[i] && !zs[i].faceUp && zs[i].defense), left = at.map((i) => zs[i]), order = [];
      for (const i of at) {
        const z = left.length > 1 ? await d.pickZone(link.p, "Which face-down monster goes in Monster Zone " + (i + 1) + "?", (x) => left.includes(x), { sides: [link.p], area: "monster" }) : left[0];
        const k = left.indexOf(z || left[0]); order.push(left.splice(k, 1)[0]);
      }
      at.forEach((i, k) => { zs[i] = order[k]; });
    } } }));

  // ----- Traps -----
  define("Call of the Earthbound", { activate: { when: "attack", can: (d, ctx) => theirs(ctx) && !!d.attack && d.monsters(ctx.p).some((z) => d.canBeAttacked(z, ctx.p, d.attack.attacker)),
    resolve: async (d, link) => {
      const A = d.attack;
      if (!A || !d.locate(A.attacker)) return;
      const z = await d.pickZone(link.p, "Which of your monsters does " + d.name(A.attacker.card) + " attack?", (x, q) => q === link.p && d.canBeAttacked(x, q, A.attacker), { sides: [link.p], area: "monster" });
      if (z) A.target = z;
    } } });
  define("Zoma the Spirit", { activate: { can: (d, ctx) => d.freeMonsterZone(ctx.p) >= 0 && !d.players[ctx.p].flags.noSpecialSummon, resolve: async (d, link) => {
    const c = link.card;
    if (link.zone && !d.locate(link.zone)) return;
    d.take(c);
    const z = await d.placeMonster(link.p, c, { how: "special", defense: true });
    if (!z) { d.toPile(c, "grave"); return; }
    z.data.base = { atk: 1800, def: 500, level: 4, type: typeNo("Zombie"), attribute: ATTR.DARK }; z.data.x5Zoma = true;
    await d.summoned(link.p, z, "special");
  } },
    onDestroyed: async (d, z, p, why, by) => { if (why === "battle" && z.data.x5Zoma && by) await d.damage(1 - p, d.locate(by) ? d.atkOf(by) : C.atk(by.card.no), "effect"); } });
  define("Beast Soul Swap", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => H.isType(d, z, "Beast")),
    target: (d, link) => pickMon(d, link, "Return which Beast-Type monster to the hand?", (z) => H.isType(d, z, "Beast"), [link.p]),
    resolve: async (d, link) => {
      const t = t0(d, link);
      if (!t || t.card.token) return;
      const lv = C.level(t.card.no), c0 = t.card;
      await d.toHand(c0, "effect");
      if (!d.players[link.p].hand.includes(c0) || !H.canSummonHere(d, link.p)) return;
      const c = await d.pickCard(link.p, "Special Summon which Level " + lv + " Beast from your hand?", d.players[link.p].hand, (x) => isMonCard(x) && isT(x.no, "Beast") && C.level(x.no) === lv);
      if (c) await ss(d, link.p, c);
    } } });
  define("Cross Counter", { activate: { when: "attack", can: (d, ctx) => theirs(ctx) && !!d.attack && !!d.attack.target && ctl(d, d.attack.target) === ctx.p && d.attack.target.defense,
    resolve: async (d) => { if (d.attack) d.attack.x5Cross = true; } } });
  define("Deck Devastation Virus", { activate: { can: (d, ctx) => d.monsters(ctx.p).some((z) => H.attrOf(d, z) === ATTR.DARK && d.atkOf(z) >= 2000 && z.faceUp && !z.data.cannotTribute),
    cost: async (d, link) => {
      const z = await d.pickZone(link.p, "Tribute which DARK monster with 2000 or more ATK?", (x, q) => q === link.p && x.faceUp && H.attrOf(d, x) === ATTR.DARK && d.atkOf(x) >= 2000 && !x.data.cannotTribute, { sides: [link.p], area: "monster", cancel: true });
      if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; },
    resolve: async (d, link) => {
      const q = 1 - link.p, pl = d.players[q];
      await show(d, link.p, "Their hand and monsters:", pl.hand.concat(d.monsters(q).map((z) => z.card)));
      for (const c of pl.hand.filter((c) => C.isMonster(c.no) && C.atk(c.no) <= 1500)) await d.sendToGrave(c, "destroyed");
      await H.destroyAll(d, d.monsters(q).filter((z) => (z.faceUp ? d.atkOf(z) : C.atk(z.card.no)) <= 1500));
      // (until the end of their 3rd turn after this one)
      pl.flags.x5Virus = { by: link.p, until: d.turn + (d.turnPlayer === link.p ? 5 : 6) };
    } } });
  define("Forced Ceasefire", { activate: { can: (d, ctx) => handCount(d, ctx) > 0, cost: discardCost(null, "Discard which card?"), resolve: async (d) => { d.flags.noTrapsTurn = d.turn; } } });
  define("Penalty Game!", { activate: { can: (d, ctx) => d.players[1 - ctx.p].hand.length === 4, resolve: async (d, link) => {
    const f = d.players[1 - link.p].flags;
    const o = await d.choose(link.p, "Penalty Game!:", [{ label: "They skip their next draw", v: 0 }, { label: "They can't activate Spells or Traps this turn", v: 1 }]);
    if (o && o.v === 1) f.x5NoST = d.turn; else f.skipDraw = true;
  } } });
  define("Pole Position", { x5Pole: true, activate: { stays: true, resolve: async () => {} },
    onLeave: async (d) => { await H.destroyAll(d, tops(d)); } });
  define("Grave Lure", { activate: { can: (d, ctx) => d.players[1 - ctx.p].deck.length > 0, resolve: async (d, link) => {
    const pl = d.players[1 - link.p], c = pl.deck[0];
    if (!c) return;
    await d.emit({ type: "reveal", p: 1 - link.p, card: c });
    c.x5Lure = true;
    DM.shuffle(d, pl.deck);
  } } });
  define("Level Conversion Lab", { activate: { can: (d, ctx) => d.players[ctx.p].hand.some((c) => c !== ctx.card && isMonCard(c)), resolve: async (d, link) => {
    const c = await d.pickCard(link.p, "Select which monster in your hand?", d.players[link.p].hand, isMonCard);
    if (!c) return;
    await show(d, 1 - link.p, "Their monster:", [c]);
    const r = await H.die(d, link.p);
    if (r === 1) await d.sendToGrave(c, "effect"); else c.x5Lv = { turn: d.turn, lv: r };
  } } });
  const WOLVES = ["Chu-Ske the Mouse Fighter", "Monk Fighter", "Master Monk"];
  define("Lone Wolf", { activate: { stays: true, can: (d, ctx) => d.monsters(ctx.p).length === 1 && d.monsters(ctx.p)[0].faceUp && isName(d.monsters(ctx.p)[0].card, WOLVES),
    resolve: async (d, link) => { const m = d.monsters(link.p); if (m.length === 1 && m[0].faceUp && isName(m[0].card, WOLVES) && link.zone && d.locate(link.zone)) link.zone.data.x5Wolf = m[0]; } } });
  define("Pikeru's Second Sight", { activate: { resolve: async (d, link) => { d.players[1 - link.p].flags.x5Show = { left: 2 }; } } });
})();

// (Errata: the current TCG text, part 5.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo;
  const { isName, once, mine, ss, handCount, destroyOne, coins } = DM.REST;
  const up = H.up, t0 = H.t, effectOf = DM.effectOf;
  const E = (n) => DM.EFFECTS[N(n)] || {};
  const inGrave = (d, c) => !!c && !c.token && d.players[c.owner].grave.includes(c);
  const curLink = (d) => d.resolvingLink || (d.fxStack && d.fxStack.length ? d.fxStack[d.fxStack.length - 1] : null);
  const freeZones = (d, p) => [0, 1, 2, 3, 4].filter((i) => !d.players[p].zones[i] && !d.closed(p, i)).length;
  const summonedNow = (d, p) => d.players[p].flags.xSummonedTurn === d.turn;
  const redefine = (name, def) => { delete DM.EFFECTS[N(name)]; define(name, def); };
  const DMOC = N("Dark Magician of Chaos");

  // ---------- What these cards need of each duel ----------
  // Card fields: xBanishNow (this card, destroyed by battle now, is banished instead of going to the GY: Dark Magician
  // of Chaos's victim), xUpAttr (the Attribute it had face-up on the field when last destroyed, or null: Backfire).
  // Zone field: xBanishBy = { turn, by } (destroyed by battle with `by` this turn: banished).
  // Dark Magician of Chaos face-up on the field goes to the banished pile wherever else it would go.
  const leavesBanished = (d, c) => {
    if (!c || c.token || c.no !== DMOC) return null;
    const l = d.zoneOf(c);
    return l && l.i < 5 && l.z.faceUp && !l.z.negated ? l : null;
  };
  function patch(d) {
    const ds0 = d.destroy, sg0 = d.sendToGrave, th0 = d.toHand, td0 = d.toDeck;
    d.destroy = async function (z, why, by) {
      const l = this.locate(z);
      if (!l) return ds0.call(this, z, why, by);
      if (l.i < 5) z.card.xUpAttr = z.faceUp ? this.stats(z).attribute : null;
      const f = z.data && z.data.xBanishBy;
      if (why === "battle" && f && f.turn === this.turn && f.by === by) { z.data.xBanishBy = null; z.card.xBanishNow = true; }
      try { return await ds0.call(this, z, why, by); } finally { z.card.xBanishNow = false; }
    };
    d.sendToGrave = async function (c, why) {
      const l = c && !c.token && (c.xBanishNow ? this.zoneOf(c) : leavesBanished(this, c));
      if (l) { c.xBanishNow = false; await this.banish(c, why); return { p: l.p, zone: l.i, z: l.z }; }
      return sg0.call(this, c, why);
    };
    d.toHand = async function (c, why) { if (leavesBanished(this, c)) return this.banish(c, why); return th0.call(this, c, why); };
    d.toDeck = async function (c, top, why) { if (leavesBanished(this, c)) return this.banish(c, why); return td0.call(this, c, top, why); };
    return d;
  }
  const create0 = DM.create;
  DM.create = function () { return patch(create0.apply(this, arguments)); };

  // ---------- Monsters ----------
  // Dark Magician of Chaos: Normal Summoned (no summoning condition); a Spell back in the End Phase of the turn it was
  // Normal or Special Summoned (once per turn); its battle victim banished; banished if it would leave the field.
  define("Dark Magician of Chaos", { specialOnly: undefined,
    onSummon: async (d, z, p, how) => { if (how !== "flip") z.data.xDmocSum = d.turn; },
    endPhase: async (d, z, p) => {
      const f = d.players[p].flags, sp = (c) => C.isSpell(c.no);
      if (z.data.xDmocSum !== d.turn || f.xDmocUsed === d.turn || !d.players[p].grave.some(sp)) return;
      if (!(await d.yesNo(p, "Dark Magician of Chaos: add a Spell from your Graveyard to your hand?"))) return;
      f.xDmocUsed = d.turn;
      const c = await d.pickCard(p, "Add which Spell to your hand?", d.players[p].grave, sp);
      if (c && inGrave(d, c)) await d.toHand(c, "effect");
    },
    battleResult: (d, s, r, att, target, res) => {
      if (s === att && target && res.targetDies) target.data.xBanishBy = { turn: d.turn, by: s };
      else if (s === target && res.attackerDies) att.data.xBanishBy = { turn: d.turn, by: s };
    } });

  // Gear Golem the Moving Fortress: once per turn, in Main Phase 1, 800 Life Points for a direct attack this turn.
  define("Gear Golem the Moving Fortress", { ignition: {
    can: (d, ctx) => ctx.p === d.turnPlayer && d.phase === "main1" && once(ctx.zone, d) && d.players[ctx.p].lp > 800,
    cost: async (d, link) => { await d.payLp(link.p, 800); return true; },
    resolve: async (d, link) => { if (link.zone && d.locate(link.zone) && link.zone.faceUp) link.zone.data.directTurn = d.turn; } } });

  // Spirit of the Pharaoh: up to 4 Level 2 or lower Zombie Normal Monsters from the GY when it's Special Summoned.
  define("Spirit of the Pharaoh", { onSummon: async (d, z, p, how) => {
    if (how !== "special") return;
    const f = (c) => C.kind(c.no) === "normal" && C.level(c.no) <= 2 && C.type(c.no) === typeNo("Zombie");
    const n = Math.min(4, freeZones(d, p));
    if (!n || !H.canSummonHere(d, p) || !H.graveMon(d, p, f).length) return;
    const cs = await d.pickCards(p, "Special Summon up to 4 Level 2 or lower Zombie Normal Monsters from your Graveyard.", H.graveMon(d, p, f), null, { count: n, min: 0 });
    for (const c of cs || []) if (inGrave(d, c) && H.canSummonHere(d, p)) await ss(d, p, c);
  } });
  // (The First Sarcophagus summons it by its own effect)
  const sarc0 = E("The First Sarcophagus").endPhase;
  if (sarc0) define("The First Sarcophagus", { endPhase: async (d, z, p) => { const was = d.xBy; d.xBy = "The First Sarcophagus"; try { return await sarc0(d, z, p); } finally { d.xBy = was; } } });

  // Blowback Dragon: targets the card when activated; the coins at resolution.
  define("Blowback Dragon", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.allZones(1 - ctx.p).length > 0,
    target: (d, link) => H.target(d, link, "Destroy which card?", (x, q) => q !== link.p, { sides: [1 - link.p] }),
    resolve: async (d, link) => { const t = t0(d, link); if ((await coins(d, link.p, 3)) >= 2 && t && d.locate(t)) await d.destroy(t, "effect"); } } });

  // Green, Red and Yellow Gadget: Normal or Special Summoned (not Flip Summoned).
  for (const n of ["Green Gadget", "Red Gadget", "Yellow Gadget"]) {
    const s0 = E(n).onSummon;
    if (s0) define(n, { onSummon: async (d, z, p, how) => { if (how !== "flip") await s0(d, z, p, how); } });
  }

  // Theban Nightmare: the Spell & Trap Zones (not the Field Zone).
  define("Theban Nightmare", { selfStats: (d, z) => { const p = d.controllerOf(z); return !d.players[p].hand.length && ![5, 6, 7, 8, 9].some((i) => d.players[p].zones[i]) ? { atk: 1500 } : null; } });

  // ---------- Spells ----------
  // Card of Sanctity: banish all your other cards on the field and in the hand (at least 1 of each); draw to 2.
  redefine("Card of Sanctity", { activate: {
    can: (d, ctx) => d.allZones(ctx.p).some((z) => z !== ctx.zone && z.card !== ctx.card) && handCount(d, ctx) > 0,
    resolve: async (d, link) => {
      const p = link.p;
      for (const z of d.allZones(p).slice()) if (z !== link.zone && d.locate(z)) await d.banish(z.card, "effect");
      for (const c of d.players[p].hand.slice()) await d.banish(c, "effect");
      const n = 2 - d.players[p].hand.length;
      if (n > 0) await d.drawCards(p, n);
    } } });

  // Salvage, Dark Factory of Mass Production: the 2 monsters are targeted.
  const twoFromGrave = (prompt, f) => ({ activate: {
    can: (d, ctx) => H.graveMon(d, ctx.p, f).length >= 2,
    target: async (d, link) => { const cs = await d.pickCards(link.p, prompt, H.graveMon(d, link.p, f), null, { count: 2 }); if (!cs || cs.length < 2) return false; link.data.cs = cs; return true; },
    resolve: async (d, link) => { for (const c of link.data.cs || []) if (inGrave(d, c)) await d.toHand(c, "effect"); } } });
  define("Salvage", twoFromGrave("Add which 2 WATER monsters to your hand?", (c) => C.attribute(c.no) === ATTR.WATER && C.atk(c.no) <= 1500));
  define("Dark Factory of Mass Production", twoFromGrave("Add which 2 Normal Monsters to your hand?", (c) => C.kind(c.no) === "normal"));

  // Smashing Ground: the face-up monster with the highest DEF (your choice if tied). Hammer Shot: a tie, your choice.
  const highest = (zs, v) => { const hi = Math.max(...zs.map(v)); return zs.filter((z) => v(z) === hi); };
  define("Smashing Ground", { activate: { can: (d, ctx) => up(d, 1 - ctx.p).length > 0, resolve: async (d, link) => {
    const zs = up(d, 1 - link.p); if (!zs.length) return;
    const hs = highest(zs, (z) => d.defOf(z));
    const z = hs.length > 1 ? await d.pickZone(link.p, "Destroy which monster?", (x) => hs.includes(x), { sides: [1 - link.p], area: "monster" }) : hs[0];
    if (z) await d.destroy(z, "effect"); } } });
  define("Hammer Shot", { activate: { can: (d) => up(d).some((z) => !z.defense), resolve: async (d, link) => {
    const zs = up(d).filter((z) => !z.defense); if (!zs.length) return;
    const hs = highest(zs, (z) => d.atkOf(z));
    const z = hs.length > 1 ? await d.pickZone(link.p, "Destroy which monster?", (x) => hs.includes(x), { area: "monster" }) : hs[0];
    if (z) await d.destroy(z, "effect"); } } });

  // Stray Lambs: 2 Tokens (2 free zones), no other Summon this turn before or after; a Set is allowed.
  define("Stray Lambs", { activate: {
    can: (d, ctx) => freeZones(d, ctx.p) >= 2 && !summonedNow(d, ctx.p),
    resolve: async (d, link) => {
      if (freeZones(d, link.p) >= 2) for (let k = 0; k < 2; k++) await d.summonToken(link.p, { name: "Lamb Token", type: typeNo("Beast"), attribute: ATTR.EARTH, level: 1 }, { defense: true });
      const f = d.players[link.p].flags; f.noSummonTurn = d.turn; f.xSetOk = d.turn; } } });

  // Monster Gate: a monster that can be Normal Summoned/Set (not a Ritual Monster or a Special-Summon-only one).
  const mg0 = E("Monster Gate").activate;
  if (mg0) define("Monster Gate", { activate: Object.assign({}, mg0, { resolve: async (d, link) => {
    const pl = d.players[link.p];
    const normalOk = (c) => { const e = effectOf(c.no); return C.isMonster(c.no) && !C.isExtra(c.no) && C.kind(c.no) !== "ritual" && !(e && e.specialOnly); };
    while (pl.deck.length) {
      const c = pl.deck.shift(); await d.emit({ type: "reveal", p: link.p, card: c });
      if (normalOk(c)) { pl.hand.push(c); const z = await d.specialSummon(link.p, c, { how: "special", position: "choose" }); if (!z && pl.hand.includes(c)) await d.sendToGrave(c, "effect"); return; }
      pl.grave.push(c);
    } } }) });

  // Dangerous Machine Type-6: a 5 destroys 1 monster the opponent controls.
  define("Dangerous Machine Type-6", { standby: async (d, z, p) => {
    if (d.turnPlayer !== p) return;
    const r = await H.die(d, p);
    if (r === 1) await H.discardOne(d, p); else if (r === 2) await H.discardOne(d, 1 - p); else if (r === 3) await d.drawCards(p, 1); else if (r === 4) await d.drawCards(1 - p, 1);
    else if (r === 5) await destroyOne(d, p, "Destroy which of your opponent's monsters?", null, "monster", [1 - p]); else await d.destroy(z, "effect");
  } });

  // Inferno Fire Blast: every Red-Eyes B. Dragon you control can't attack this turn.
  const ifb0 = E("Inferno Fire Blast").activate;
  if (ifb0) define("Inferno Fire Blast", { activate: Object.assign({}, ifb0, { resolve: async (d, link) => {
    await ifb0.resolve(d, link);
    for (const z of up(d, link.p)) if (isName(z.card, "Red-Eyes Black Dragon")) z.data.cannotAttackTurn = d.turn; } }) });

  // ---------- Traps ----------
  // A Hero Emerges: a monster that can't be Special Summoned goes to the GY too.
  const ahe0 = E("A Hero Emerges").activate;
  if (ahe0) define("A Hero Emerges", { activate: Object.assign({}, ahe0, { resolve: async (d, link) => {
    const h = d.players[link.p].hand; if (!h.length) return;
    const c = h[Math.floor(d.rng() * h.length)];
    const z = C.isMonster(c.no) && !C.isExtra(c.no) && H.canSummonHere(d, link.p) ? await d.specialSummon(link.p, c, { how: "special", position: "choose" }) : null;
    if (!z && d.players[link.p].hand.includes(c)) await d.sendToGrave(c, "effect"); } }) });

  // Curse of Darkness: the damage once the Spell has resolved, to the player that activated it.
  define("Curse of Darkness", { onEvent: async (d, z, p, ev) => {
    if (ev.type !== "activated" || !ev.card || !C.isSpell(ev.card.no) || ev.from === "monster" || !ev.link || typeof ev.link.resolve !== "function") return;
    const l = ev.link, r0 = l.resolve;
    l.resolve = async (d2, l2) => { await r0(d2, l2); if (d2.locate(z) && d2.live(z)) await d2.damage(l2.p, 1000, "effect"); };
  } });

  // Backfire: a face-up FIRE monster(s) you control destroyed and sent to the GY: once for those destroyed together.
  define("Backfire", { onEvent: async (d, z, p, ev) => {
    if ((ev.type !== "destroyed" && ev.type !== "battle-destroyed") || ev.p !== p || !ev.card || ev.card.xUpAttr !== ATTR.FIRE || !inGrave(d, ev.card)) return;
    const k = ev.type === "destroyed" ? curLink(d) : null;
    if (k && z.data.xBackKey === k) return;
    z.data.xBackKey = k;
    await d.damage(1 - p, 500, "effect");
  } });

  // Light of Judgment: a card from their hand is discarded (after looking at it).
  const loj0 = E("Light of Judgment").activate;
  if (loj0) define("Light of Judgment", { activate: Object.assign({}, loj0, { resolve: async (d, link) => {
    const q = 1 - link.p;
    const o = await d.choose(link.p, "Light of Judgment:", [d.players[q].hand.length && { label: "Discard 1 card from their hand", v: 1 }, d.allZones(q).length && { label: "Send 1 card they control to the Graveyard", v: 0 }].filter(Boolean));
    if (!o) return;
    if (o.v === 1) { const c = await d.pickCard(link.p, "Discard which card from their hand?", d.players[q].hand); if (c) await d.discard(q, c, "effect"); }
    else { const z = await d.pickZone(link.p, "Send which card to the Graveyard?", (x, r) => r === q, { sides: [q] }); if (z) await d.sendToGrave(z.card, "effect"); } } }) });

  // Soul Resurrection: a Normal Monster targeted in the GY, in Defense Position; this card destroyed when it is.
  const normal = (c) => C.kind(c.no) === "normal";
  redefine("Soul Resurrection", {
    activate: { stays: true,
      can: (d, ctx) => H.canSummonHere(d, ctx.p) && H.graveMon(d, ctx.p, normal).length > 0,
      target: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Normal Monster?", H.graveMon(d, link.p, normal)); if (!c) return false; link.data.c = c; return true; },
      resolve: async (d, link) => {
        const c = link.data.c;
        const z = c && inGrave(d, c) && link.zone && d.locate(link.zone) ? await d.specialSummon(link.p, c, { how: "special", defense: true }) : null;
        if (z) link.zone.data.bound = z; else if (link.zone) link.zone.data.discard = true; } },
    onLeave: async (d, z) => { const m = z.data.bound; if (m && d.locate(m)) await d.destroy(m, "effect"); },
    onEvent: async (d, z, p, ev) => {
      const m = z.data.bound;
      if ((ev.type === "destroyed" || ev.type === "battle-destroyed") && m && ev.card === m.card && !d.locate(m) && d.locate(z)) { z.data.bound = null; await d.destroy(z, "effect"); }
    } });
})();

// (Errata: the current TCG text, part 6.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, H = DM.H, ATTR = DM.ATTR, define = DM.define, N = DM.numberOf, typeNo = DM.typeNo, ICON = DM.ICON, SC = DM.SC;
  const { isName, once, mine, ss, piles, coins, handCount } = DM.REST;
  const up = H.up, t0 = H.t, effectOf = DM.effectOf;
  const ctl = (d, z) => d.controllerOf(z);
  const isT = (no, t) => C.type(no) === typeNo(t);
  const inGrave = (d, c) => !!c && !c.token && d.players[c.owner].grave.includes(c);
  const redefine = (name, def) => { delete DM.EFFECTS[N(name)]; define(name, def); };
  const act = (name) => (DM.EFFECTS[N(name)] || {}).activate || {};
  const origAtk = (z) => (z.data.base && z.data.base.atk != null ? z.data.base.atk : z.card.token ? z.card.token.atk || 0 : C.atk(z.card.no));
  const freeZones = (d, p) => [0, 1, 2, 3, 4].filter((i) => !d.players[p].zones[i] && !d.closed(p, i)).length;
  const ELEMENTS = [ATTR.WIND, ATTR.WATER, ATTR.FIRE, ATTR.EARTH];

  // (a triggered effect that targets: its target picked first, with H.target's watchers, then resolved as a link)
  async function trig(d, z, p, prompt, filter, opts, fn) {
    const link = { p, card: z.card, zone: z, kind: "trigger", targets: [], data: {}, label: d.name(z.card), resolve: async (d2, l) => { const t = t0(d2, l); if (t) await fn(d2, t, l); } };
    if (!(await H.target(d, link, prompt, filter, opts))) return;
    await d.runEffect(link);
  }

  // ---------- Elemental Mistress Doriado: also WIND, WATER, FIRE and EARTH while face up on the field ----------
  define("Elemental Mistress Doriado", { multiAttr: ELEMENTS });
  const hasAttr = (d, z, a) => {
    if (!z || !z.faceUp) return false;
    if (d.stats(z).attribute === a) return true;
    const e = d.locate(z) && d.locate(z).i < 5 ? d.live(z) : null;
    return !!(e && e.multiAttr && e.multiAttr.includes(a));
  };
  const isAttr0 = H.isAttr;
  H.isAttr = (d, z, a) => isAttr0(d, z, a) || hasAttr(d, z, typeof a === "number" ? a : ATTR[a]);
  // (distinct monsters, one for each Attribute)
  const covers = (d, zs, attrs) => {
    if (!attrs.length) return true;
    const [a, ...rest] = attrs;
    return zs.some((z) => hasAttr(d, z, a) && covers(d, zs.filter((x) => x !== z), rest));
  };
  define("Fuh-Rin-Ka-Zan", { activate: Object.assign({}, act("Fuh-Rin-Ka-Zan"), { can: (d) => ELEMENTS.every((a) => up(d).some((z) => hasAttr(d, z, a))) }) });
  define("Elemental Burst", { activate: Object.assign({}, act("Elemental Burst"), {
    can: (d, ctx) => covers(d, up(d, ctx.p), ELEMENTS),
    cost: async (d, link) => {
      const picked = [];
      for (let k = 0; k < ELEMENTS.length; k++) {
        const a = ELEMENTS[k], rest = ELEMENTS.slice(k + 1);
        const z = await d.pickZone(link.p, "Tribute which " + window.YUGIOH_CARDS.attributes[a] + " monster?", (x, q) => q === link.p && !picked.includes(x) && hasAttr(d, x, a) && covers(d, up(d, link.p).filter((y) => y !== x && !picked.includes(y)), rest), { sides: [link.p], area: "monster" });
        if (!z) return false;
        picked.push(z);
      }
      for (const z of picked) if (d.locate(z)) await d.sendToGrave(z.card, "tribute");
      return true;
    } }) });
  // Ultimate Baseball Kid: face-up FIRE monsters; the cost sends 1 other face-up FIRE monster (not a Tribute)
  define("Ultimate Baseball Kid", {
    selfStats: (d, z) => ({ atk: 1000 * up(d).filter((x) => x !== z && hasAttr(d, x, ATTR.FIRE)).length }),
    ignition: { repeatable: true, can: (d, ctx) => up(d, ctx.p).some((x) => x !== ctx.zone && hasAttr(d, x, ATTR.FIRE)),
      cost: async (d, link) => { const z = await d.pickZone(link.p, "Send which face-up FIRE monster to the Graveyard?", (x, q) => q === link.p && x !== link.zone && hasAttr(d, x, ATTR.FIRE), { sides: [link.p], area: "monster", cancel: true }); if (!z) return false; await d.sendToGrave(z.card, "cost"); return true; },
      resolve: async (d, link) => d.damage(1 - link.p, 500, "effect") } });

  // ---------- Fusion and Ritual Monsters with no effect before ----------
  // Ojama King: up to 3 of the opponent's unused Monster Zones can't be used while it's face up
  define("Ojama King", { onSummon: async (d, z, p) => {
    const q = 1 - p;
    for (let k = 0; k < 3; k++) {
      const opts = [0, 1, 2, 3, 4].filter((i) => !d.players[q].zones[i] && !d.closed(q, i)).map((i) => ({ label: "Their Monster Zone " + (i + 1), value: i }));
      if (!opts.length) break;
      const o = await d.choose(p, "Ojama King: select which of their Monster Zones (" + (k + 1) + " of up to 3)?", opts.concat([{ label: "No more", value: -1 }]));
      if (!o || o.value < 0) break;
      (d.flags.closed = d.flags.closed || []).push({ src: z, p: q, i: o.value });
    }
  } });
  // Dark Blade the Dragon Knight: banish up to 3 monsters from the opponent's GY when it deals battle damage
  define("Dark Blade the Dragon Knight", { onBattleDamage: async (d, z, p) => {
    const cs = await d.pickCards(p, "Banish up to 3 monsters from their Graveyard?", H.graveMon(d, 1 - p), null, { count: 3, min: 0 });
    for (const c of cs || []) if (inGrave(d, c)) await d.banish(c, "effect");
  } });
  // Mokey Mokey King: removed from the field: as many "Mokey Mokey" as possible from the GY
  define("Mokey Mokey King", { onLeave: async (d, z, p) => {
    const g = () => d.players[p].grave.filter((c) => isName(c, "Mokey Mokey"));
    if (!g().length || !H.canSummonHere(d, p) || !(await d.yesNo(p, "Special Summon Mokey Mokey from your Graveyard?"))) return;
    while (g().length && H.canSummonHere(d, p)) if (!(await ss(d, p, g()[0]))) break;
  } });
  // Gatling Dragon: once per turn, 3 coins; destroy as many monsters as possible, up to the heads
  define("Gatling Dragon", { ignition: { can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d),
    resolve: async (d, link) => {
      const h = await coins(d, link.p, 3), n = Math.min(h, H.mons(d).length);
      if (!n) return;
      const zs = await d.pickZones(link.p, "Destroy which " + n + " monster" + (n > 1 ? "s" : "") + "?", () => true, { area: "monster", count: n });
      await H.destroyAll(d, zs || []);
    } } });
  // Elemental HERO Flame Wingman: the ATK of the monster it destroys by battle and sends to the GY, as damage
  define("Elemental HERO Flame Wingman", { onDestroyByBattle: async (d, z, p, v) => { if (inGrave(d, v.card)) await d.damage(1 - p, C.atk(v.card.no), "effect"); } });
  // Elemental HERO Thunder Giant: once per turn, discard 1: destroy a face-up monster with less original ATK
  define("Elemental HERO Thunder Giant", { ignition: {
    can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.players[ctx.p].hand.length > 0 && up(d).some((x) => origAtk(x) < d.atkOf(ctx.zone)),
    cost: async (d, link) => !!(await H.discardOne(d, link.p, "Discard a card for Thunder Giant.")),
    target: (d, link) => H.target(d, link, "Destroy which face-up monster?", (x) => x.faceUp && origAtk(x) < d.atkOf(link.zone), { area: "monster" }),
    resolve: async (d, link) => { const t = t0(d, link); if (t && t.faceUp) await d.destroy(t, "effect"); } } });
  // Reshef the Dark Being: once per turn, discard 1 Spell: control of 1 opponent's monster until the end of the turn
  define("Reshef the Dark Being", { ignition: {
    can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.players[ctx.p].hand.some((c) => C.isSpell(c.no)) && d.monsters(1 - ctx.p).length > 0 && d.freeMonsterZone(ctx.p) >= 0,
    cost: async (d, link) => !!(await H.discardOne(d, link.p, "Discard which Spell Card?", (c) => C.isSpell(c.no))),
    resolve: async (d, link) => {
      const z = await d.pickZone(link.p, "Take control of which monster?", (x, q) => q !== link.p, { sides: [1 - link.p], area: "monster" });
      if (z && (await d.takeControl(z, link.p))) z.data.returnAtEnd = { to: 1 - link.p, turn: d.turn };
    } } });

  // ---------- Monsters ----------
  // Raging Flame Sprite: +1000 ATK when it deals battle damage by a direct attack
  define("Raging Flame Sprite", { onBattleDamage: async (d, z, p, other) => { if (!other && d.locate(z)) z.links.push({ kind: "self", stats: { atk: 1000 } }); } });
  // Gearfried the Swordmaster: each time an Equip Card is equipped to it, destroy 1 targeted opponent's monster
  define("Gearfried the Swordmaster", { onEvent: async (d, z, p, ev) => {
    if (ev.type !== "equipped" || ev.zone !== z || !d.monsters(1 - p).length) return;
    await trig(d, z, p, "Destroy which of their monsters?", (x, q) => q !== p, { sides: [1 - p], area: "monster" }, (d2, t) => d2.destroy(t, "effect"));
  } });
  // Ancient Gear Beast: the effects of the monster it destroys by battle negated
  define("Ancient Gear Beast", {
    battleResult: (d, s, r, att, target, res) => { if (s === att && res.targetDies) target.data.negateIfDies = d.turn; else if (s === target && res.attackerDies) att.data.negateIfDies = d.turn; },
    beforeAttack: async (d, z, p, t) => { DM.EFFECTS[z.card.no].noFlipInBattle = !!(t && !t.faceUp && d.atkOf(z) > d.defOf(t)); } });
  // Golem Sentry: Flip Summoned: target 1 opponent's monster; to the hand
  define("Golem Sentry", { onSummon: async (d, z, p, how) => {
    if (how !== "flip" || !d.monsters(1 - p).length) return;
    await trig(d, z, p, "Return which monster to its owner's hand?", (x, q) => q !== p, { sides: [1 - p], area: "monster" }, (d2, t) => d2.toHand(t.card, "effect"));
  } });
  // Granmarg the Rock Monarch: Tribute Summoned: target 1 Set card; destroy it
  define("Granmarg the Rock Monarch", { afterTribute: async (d, z, p) => {
    if (!z.faceUp || !H.any(d, (x) => !x.faceUp)) return;
    await trig(d, z, p, "Destroy which Set card?", (x) => !x.faceUp, {}, (d2, t) => d2.destroy(t, "effect"));
  } });
  // White Ninja: FLIP: target 1 Defense Position monster; destroy it
  define("White Ninja", { flip: async (d, link) => {
    const z = link.zone || d.monsters(link.p).find((x) => x.card === link.card);
    if (!z || !H.any(d, (x) => x.defense, { area: "monster" })) return;
    await trig(d, z, link.p, "Destroy which Defense Position monster?", (x) => x.defense, { area: "monster" }, (d2, t) => d2.destroy(t, "effect"));
  } });
  // Hyena: destroyed by battle and sent to the GY: any number of "Hyena" from the Deck (optional)
  define("Hyena", { onDestroyed: async (d, z, p, why) => {
    if (why !== "battle" || !inGrave(d, z.card)) return;
    const n = Math.min(freeZones(d, p), d.players[p].deck.filter((c) => isName(c, "Hyena")).length);
    if (!n || d.players[p].flags.noSpecialSummon) return;
    const cs = await d.pickCards(p, "Special Summon how many Hyena from your Deck?", d.players[p].deck, (c) => isName(c, "Hyena"), { count: n, min: 0 });
    for (const c of cs || []) { if (!H.canSummonHere(d, p)) break; await ss(d, p, c); }
    DM.shuffle(d, d.players[p].deck);
  } });
  // The Creator: once per turn, target 1 monster in the GY; send 1 card from the hand to the GY, and if you do, Special Summon it
  define("The Creator", { ignition: {
    can: (d, ctx) => mine(d, ctx) && once(ctx.zone, d) && d.players[ctx.p].hand.length > 0 && H.graveMon(d, ctx.p, (x) => !C.isExtra(x.no) || x.proper).length > 0 && H.canSummonHere(d, ctx.p),
    target: async (d, link) => { const c = await d.pickCard(link.p, "Target which monster in your Graveyard?", H.graveMon(d, link.p, (x) => !C.isExtra(x.no) || x.proper)); if (!c) return false; link.data.c = c; return true; },
    resolve: async (d, link) => {
      const c = link.data.c, h = await d.pickCard(link.p, "Send which card from your hand to the Graveyard?", d.players[link.p].hand);
      if (!h) return;
      await d.sendToGrave(h, "effect");
      if (inGrave(d, c)) await ss(d, link.p, c);
    } } });
  // Blast Magician: remove any number of Spell Counters, then target a face-up monster with ATK up to 700 x that number
  define("Blast Magician", { ignition: Object.assign({}, DM.EFFECTS[N("Blast Magician")].ignition, {
    cost: async (d, link) => {
      const max = SC.n(link.zone), opts = [];
      for (let n = 1; n <= max; n++) if (up(d).some((z) => d.atkOf(z) <= 700 * n)) opts.push({ label: "Remove " + n + " Spell Counter" + (n > 1 ? "s" : ""), value: n });
      if (!opts.length) return false;
      const o = await d.choose(link.p, "Remove how many Spell Counters?", opts);
      if (!o) return false;
      link.zone.counters.spell -= o.value; link.data.n = o.value;
      return true;
    },
    target: (d, link) => H.target(d, link, "Destroy which face-up monster?", (x) => x.faceUp && d.atkOf(x) <= 700 * (link.data.n || SC.n(link.zone)), { area: "monster" }),
    resolve: async (d, link) => { const t = t0(d, link); if (t && t.faceUp) await d.destroy(t, "effect"); } }) });
  // Red-Eyes Darkness Dragon, Master Monk, Neo-Daedalus: the monster to Tribute need not be face up
  for (const [n, from] of [["Red-Eyes Darkness Dragon", "Red-Eyes Black Dragon"], ["Master Monk", "Monk Fighter"], ["Ocean Dragon Lord - Neo-Daedalus", "Levia-Dragon - Daedalus"]]) define(n, {
    specialFromHand: (d, p) => d.monsters(p).some((z) => isName(z.card, from)),
    specialCost: async (d, p) => { const z = await d.pickZone(p, "Tribute which " + from + "?", (x, q) => q === p && isName(x.card, from), { sides: [p], area: "monster", cancel: true }); if (!z) return false; await d.sendToGrave(z.card, "tribute"); return true; } });
  // Theinen the Great Sphinx: only when Andro Sphinx and Sphinx Teleia you control are destroyed at the same time (patch, below)
  define("Theinen the Great Sphinx", { specialFromHand: undefined, specialCost: undefined });
  const SPHINXES = ["Andro Sphinx", "Sphinx Teleia"];
  const onLeave0 = (DM.EFFECTS[N("Pyramid of Light")] || {}).onLeave;
  if (onLeave0) define("Pyramid of Light", { onLeave: async (d, z, p, why) => {
    const prev = d.e52Key; d.e52Key = {};
    try { await onLeave0(d, z, p, why); } finally { d.e52Key = prev; }
    if (!d.e52Depth) await theinen(d);
  } });
  async function theinen(d) {
    const due = (d.e52Theinen || []).splice(0);
    for (const p of due) {
      if (d.over) return;
      const list = () => piles(d, p, ["hand", "deck"]).filter((c) => isName(c, "Theinen the Great Sphinx"));
      if (!list().length || d.players[p].lp <= 500 || !H.canSummonHere(d, p)) continue;
      if (!(await d.yesNo(p, "Pay 500 LP to Special Summon Theinen the Great Sphinx from your hand or Deck?"))) continue;
      await d.payLp(p, 500);
      const c = await d.pickCard(p, "Special Summon which Theinen?", list());
      const z = c ? await d.specialSummon(p, c, { how: "special", position: "choose", byRule: true }) : null;
      DM.shuffle(d, d.players[p].deck);
      const e = effectOf(N("Theinen the Great Sphinx"));
      if (z && e.afterSpecial) await e.afterSpecial(d, z, p, p);
    }
  }

  // ---------- Spells and Traps ----------
  define("Inferno Tempest", { activate: Object.assign({}, act("Inferno Tempest"), { can: (d, ctx) => ctx.event.p === ctx.p && ctx.event.amount >= 3000 }) });
  // Harpies' Hunting Ground: a "Harpie Lady" or "Harpie Lady Sisters" Normal or Special Summoned: its summoner targets and destroys 1 Spell/Trap
  define("Harpies' Hunting Ground", { onEvent: async (d, z, p, ev) => {
    if ((ev.type !== "summoned" && ev.type !== "special-summoned") || !ev.zone || !ev.zone.faceUp || !isName(ev.zone.card, ["Harpie Lady", "Harpie Lady Sisters"])) return;
    if (!H.any(d, () => true, { area: "spell" })) return;
    await trig(d, z, ev.p, "Destroy which Spell or Trap Card?", (x, q, i) => i >= 5, { area: "spell" }, (d2, t) => d2.destroy(t, "effect"));
  } });
  // Monster Reincarnation, A Feather of the Phoenix: discard 1, then target a card in the GY
  define("Monster Reincarnation", { activate: Object.assign({}, act("Monster Reincarnation"), {
    target: async (d, link) => { const c = await d.pickCard(link.p, "Add which monster to your hand?", H.graveMon(d, link.p)); if (!c) return false; link.data.c = c; return true; },
    resolve: async (d, link) => { if (inGrave(d, link.data.c)) await d.toHand(link.data.c, "effect"); } }) });
  define("A Feather of the Phoenix", { activate: Object.assign({}, act("A Feather of the Phoenix"), {
    target: async (d, link) => { const c = await d.pickCard(link.p, "Return which card to the top of your Deck?", d.players[link.p].grave); if (!c) return false; link.data.c = c; return true; },
    resolve: async (d, link) => { if (inGrave(d, link.data.c)) await d.toDeck(link.data.c, true); } }) });
  // Rock Bombardment: the Rock monster sent from the Deck is the cost
  define("Rock Bombardment", { activate: Object.assign({}, act("Rock Bombardment"), {
    cost: async (d, link) => { const c = await d.pickCard(link.p, "Send which Rock monster to the Graveyard?", d.players[link.p].deck, (c) => C.isMonster(c.no) && isT(c.no, "Rock")); if (!c) return false; await d.sendToGrave(c, "cost"); DM.shuffle(d, d.players[link.p].deck); return true; },
    resolve: async (d, link) => d.damage(1 - link.p, 500, "effect") }) });
  // Hero Signal: the TCG's "Elemental HERO"
  const hero4 = (c) => C.isMonster(c.no) && !C.isExtra(c.no) && /Elemental Hero/i.test(C.name(c.no)) && C.level(c.no) <= 4;
  define("Hero Signal", { activate: Object.assign({}, act("Hero Signal"), {
    can: (d, ctx) => ctx.event.p === ctx.p && H.canSummonHere(d, ctx.p) && piles(d, ctx.p, ["hand", "deck"]).some(hero4),
    resolve: async (d, link) => { const c = await d.pickCard(link.p, "Special Summon which Elemental HERO?", piles(d, link.p, ["hand", "deck"]), hero4); if (c) await ss(d, link.p, c); DM.shuffle(d, d.players[link.p].deck); } }) });
  // Chain Burst: the damage once the Trap has resolved (patch, below)
  define("Chain Burst", { onEvent: async (d, z, p, ev) => { if (ev.type === "activated" && ev.link && C.isTrap(ev.card.no) && ev.card !== z.card) (ev.link.e52Burst = ev.link.e52Burst || []).push(z); } });

  // ---------- Each duel: Theinen's moment, Chain Burst's damage ----------
  function patch(d) {
    const re0 = d.runEffect, ds0 = d.destroy;
    d.e52Depth = 0; d.e52Theinen = []; d.e52Sph = [];
    d.runEffect = async function (link) {
      this.e52Depth++;
      let r;
      try { r = await re0.call(this, link); } finally { this.e52Depth--; }
      if (link && link.e52Burst && !link.negated && !this.over) for (const z of link.e52Burst.splice(0)) if (this.locate(z) && this.live(z)) await this.damage(link.p, 1000, "effect");
      if (!this.e52Depth && this.e52Theinen.length && !this.over) await theinen(this);
      return r;
    };
    d.destroy = async function (z, why, by) {
      const l = this.locate(z), c = z && z.card;
      const r = await ds0.call(this, z, why, by);
      if (r && l && l.i < 5 && isName(c, SPHINXES)) {
        const key = this.effectLink || this.e52Key || null;
        if (key) {
          const other = this.e52Sph.find((s) => s.key === key && s.p === l.p && s.name !== C.name(c.no));
          if (other) { this.e52Sph = this.e52Sph.filter((s) => s !== other); this.e52Theinen.push(l.p); }
          else this.e52Sph = this.e52Sph.filter((s) => s.key === key).concat([{ key, p: l.p, name: C.name(c.no) }]);
        }
      }
      return r;
    };
    return d;
  }
  const create0 = DM.create;
  DM.create = function () { return patch(create0.apply(this, arguments)); };
})();

// (Last: the templates for the cards nothing above defines, and each Spell's and Trap's timing.)
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card;
  DM.applyTemplates();
  for (const [no, e] of Object.entries(DM.EFFECTS)) {
    const a = e.activate;
    if (!a) continue;
    // (Traps and Quick-Play Spells: in your Main Phase, or in answer to anything, unless they say when)
    if (!a.when && (C.isTrap(+no) || C.icon(+no) === DM.ICON.QUICK)) a.when = ["main", "any"];
  }
  // A card with something to do: a Spell or Trap that can be activated, or a monster with an effect.
  DM.playable = (no) => {
    // (not the six cards GX made up, out of the game: window.YUGIOH_RARITY's "-")
    if (window.YUGIOH_RARITY && window.YUGIOH_RARITY[no] === "-") return false;
    const e = DM.EFFECTS[no];
    if (C.isSpell(no) || C.isTrap(no)) return !!(e && e.activate);
    return C.kind(no) !== "effect" || !!(e && Object.keys(e).length);
  };
})();

// (The computer duelist: The Eternal Duelist Soul's, include/ai.h and src/ai_*.c.)
//
//   DuelMonsters.create({ ..., controllers: [you, DuelMonsters.ai()] })
//
// Its Main Phase goes as EDS's steps go (AiStep): the simple Spells first, those that draw or clear the field
// (AI_SPELL_DRAW_AND_CLEAR: Pot of Greed, Dark Hole, Raigeki...), then the summon (AI_MAIN_SUMMON: the strongest
// monster it can, tributing its weakest, in Attack Position if it beats the best the other side has and set
// otherwise, flip monsters set), its monsters' effects, the Spells that take or bring back a monster
// (TAKE_AND_REVIVE: Change of Heart, Monster Reborn...), the rest (LISTS: the others, then the equips), its
// positions (AI_STEP_CHANGE_POSITIONS), the Battle Phase, and in Main Phase 2 its Traps and Quick-Play Spells set
// (AI_STEP_SET_SPELL_TRAPS). Its attacks are planned as EDS's AttackPlan: each attacker against each target, the
// battle worked out (what it destroys, what it loses, the damage), the best first, none that loses. Like EDS it
// knows what the face-down cards are. It answers with a Trap when it's worth it: an attack it would lose to or a
// direct one, a strong monster summoned, a card the other side activates (Counter Traps).
(function () {
  "use strict";
  const DM = window.DuelMonsters, C = DM.card, ICON = DM.ICON;
  const text = (no) => DM.text(no);
  const kinds = {};
  // What a card does, from its text: hurts the other side (a target there), helps its own, draws, clears...
  function kind(no) {
    if (kinds[no]) return kinds[no];
    const t = text(no), k = {};
    k.draw = /\bdraw (\d|one|two|three|1|2|3)\b|draw cards/i.test(t) && !/opponent draws/i.test(t);
    k.clearAll = /destroy all (monsters|cards) on the field|destroy all monsters\b(?! your opponent)/i.test(t) && !/your opponent controls/i.test(t);
    k.clearTheirs = /destroy all (face-up |face-down )?(monsters|cards|spell|attack position monsters)[^.]*your opponent controls/i.test(t);
    k.clearST = /destroy all spell and trap cards/i.test(t);
    k.revive = /special summon[^.]*graveyard/i.test(t);
    k.take = /take control/i.test(t);
    k.boost = /(increase|gains?|up by|\+)\s*\d+|increase[^.]*atk/i.test(t) && !/decrease|loses?/i.test(t);
    k.harm = !k.boost && /destroy|decrease|loses?|take control|return[^.]*hand|remove[^.]*from play|cannot attack|negate|change[^.]*position|inflict/i.test(t);
    k.attack = /attack/i.test(t);
    k.summon = /summon/i.test(t);
    k.counter = C.icon(no) === ICON.COUNTER || /negate the activation|negate the summon/i.test(t);
    k.lpCost = /pay \d+ (life points|lp)/i.test(t);
    return (kinds[no] = k);
  }
  const effect = (no) => DM.effectOf(no) || {};
  function monValue(d, z) {
    const s = d.stats(z), e = effect(z.card.no);
    return Math.max(s.atk, s.def) + (z.card.token ? -300 : 0) + (Object.keys(e).length ? 300 : 0);
  }
  function cardValue(c) {
    const no = c.no;
    if (C.isMonster(no)) return Math.max(C.atk(no), C.def(no)) + C.level(no) * 50 + (Object.keys(effect(no)).length ? 300 : 0);
    return 1200;
  }
  function zoneValue(d, z, i) { return i < 5 ? monValue(d, z) : z.faceUp ? 800 : 1000; }
  const sum = (a) => a.reduce((n, x) => n + x, 0);
  // The best ATK the other side can bring against a monster (its face-up or face-down ones, all of them known).
  const bestAtk = (d, q) => Math.max(0, ...d.monsters(q).map((z) => d.atkOf(z)));
  const boardValue = (d, p) => sum(d.monsters(p).map((z) => monValue(d, z)));

  // A battle, as EDS's AttackPlan works it out: >0 is worth fighting.
  function battleScore(d, att, target, p) {
    const a = d.atkOf(att);
    if (!target) return 1000 + a;
    if (!target.defense) {
      const t = d.atkOf(target);
      if (a > t) return 1000 + monValue(d, target) + (a - t);
      if (a === t) return monValue(d, target) - monValue(d, att);
      return -1;
    }
    const def = d.defOf(target);
    if (a > def) return 800 + monValue(d, target);
    if (a === def && !target.faceUp) return 50;
    return -1;
  }

  function create(opts) {
    opts = opts || {};
    let turn = -1, tried = {}, plan = null, attacks = new Map();

    // The source of a question: the card most lately activated or flipped (for which side to target).
    function source(d) {
      for (let k = d.log.length - 1; k >= 0 && k > d.log.length - 40; k--) {
        const ev = d.log[k];
        if (ev.type === "activate" || ev.type === "flip") return ev.card || (ev.zone && ev.zone.card);
      }
      return null;
    }

    function spellScore(d, p, c) {
      const no = c.no, k = kind(no), q = 1 - p, mine = d.monsters(p), theirs = d.monsters(q);
      const theirST = d.allZones(q).filter((z, i) => z !== d.players[q].zones[10] && z.card && !C.isMonster(z.card.no)).length;
      if (k.draw) return 5000;
      if (k.clearAll) return boardValue(d, q) > boardValue(d, p) * 1.2 + 500 ? 4500 : -1;
      if (k.clearTheirs) return theirs.length ? 4500 : -1;
      if (k.clearST) return theirST > 0 ? 3500 : -1;
      if (C.icon(no) === ICON.FIELD) return d.players[p].zones[10] ? -1 : 700;
      if (C.icon(no) === ICON.EQUIP) return k.harm ? (theirs.length ? 900 : -1) : (mine.some((z) => z.faceUp) ? 900 : -1);
      if (k.take) return theirs.length && d.freeMonsterZone(p) >= 0 ? 3000 : -1;
      if (k.revive) return d.freeMonsterZone(p) >= 0 ? 3000 : -1;
      if (C.icon(no) === ICON.RITUAL || /fusion/i.test(text(no))) return 2500;
      if (k.harm) return theirs.length || !/monster/i.test(text(no)) ? 2000 : -1;
      if (C.isTrap(no)) return k.attack || k.summon ? -1 : 300;
      return 400;
    }

    function summonScore(d, p, a) {
      const no = a.card.no, q = 1 - p, e = effect(no);
      const tribs = d.tributable(p).map((z) => monValue(d, z)).sort((x, y) => x - y).slice(0, a.tributes);
      const cost = sum(tribs), atk = C.atk(no), def = C.def(no);
      const beats = !d.monsters(q).length || atk > bestAtk(d, q);
      const flip = !!e.flip;
      if (a.act === "summon") {
        if (flip || (!beats && def > atk)) return -1;
        const v = 1000 + atk - cost;
        return a.tributes && atk <= Math.max(0, ...tribs) + 300 ? -1 : v;
      }
      if (beats && !flip) return -1;
      const v = 800 + def + (flip ? 800 : 0) - cost;
      return a.tributes && def <= Math.max(0, ...tribs) + 300 ? -1 : v;
    }

    function mainScore(d, p, a) {
      const q = 1 - p;
      switch (a.act) {
        case "activate": return spellScore(d, p, a.card);
        case "summon": case "set-monster": return summonScore(d, p, a);
        case "special-hand": return 2800;
        case "ignition": case "hand-effect": return kind((a.card || a.zone.card).no).lpCost && d.players[p].lp < 2000 ? -1 : 1500;
        case "flip-summon": {
          const z = a.zone;
          return effect(z.card.no).flip || !d.monsters(q).length || d.atkOf(z) > bestAtk(d, q) ? 1200 : -1;
        }
        case "position": {
          const z = a.zone, atk = d.atkOf(z), def = d.defOf(z), best = bestAtk(d, q);
          if (z.defense) return d.phase === "main1" && (!d.monsters(q).length ? atk > 0 : atk > best) ? 1100 : -1;
          return d.monsters(q).length && atk < best && def > atk && (d.phase === "main2" || !d.monsters(q).some((t) => battleScore(d, z, t, p) > 0)) ? 150 : -1;
        }
        case "set-spell": {
          const no = a.card.no;
          if (d.phase === "main1" && d.turn > 0) return -1;
          return C.isTrap(no) || C.icon(no) === ICON.QUICK ? 100 : -1;
        }
        case "battle": return 0;
        default: return -0.5;
      }
    }

    function main(d, req, p) {
      if (turn !== d.turn) { turn = d.turn; tried = {}; }
      let best = -1, bestScore = -Infinity;
      req.options.forEach((a, i) => {
        let s = mainScore(d, p, a);
        const key = d.phase + ":" + a.label;
        if (a.act !== "battle" && a.act !== "end" && (tried[key] || 0) >= 2) s = -1;
        if (s > bestScore) { bestScore = s; best = i; }
      });
      const a = req.options[best];
      if (bestScore <= 0) {
        const b = req.options.findIndex((o) => o.act === "battle");
        return b >= 0 ? b : req.options.findIndex((o) => o.act === "end");
      }
      const key = d.phase + ":" + a.label;
      tried[key] = (tried[key] || 0) + 1;
      return best;
    }

    function battle(d, req, p) {
      const q = 1 - p;
      plan = null;
      if (turn !== d.turn) { turn = d.turn; tried = {}; }
      if (attacks.turn !== d.turn) { attacks = new Map(); attacks.turn = d.turn; }
      let bestScore = 0, best = req.options.findIndex((o) => o.end);
      req.options.forEach((o, i) => {
        // (an attacker it can't pay for, or that didn't get to attack, isn't tried a third time)
        if (o.end || (attacks.get(o.zone) || 0) >= 2) return;
        const att = o.zone, targets = d.monsters(q).filter((z) => d.canBeAttacked(z, q, att));
        const ae = effect(att.card.no);
        const options = d.monsters(q).length ? targets.slice() : [null];
        if (ae.directAttack && d.monsters(q).length) options.push(null);
        for (const t of options) {
          const s = battleScore(d, att, t, p);
          if (s > bestScore) { bestScore = s; best = i; plan = { att, target: t }; }
        }
      });
      if (plan) attacks.set(plan.att, (attacks.get(plan.att) || 0) + 1);
      return best;
    }

    function attackTarget(d, req, p) {
      let best = -1, bestScore = -Infinity;
      req.options.forEach((o, i) => {
        const t = o.direct ? null : o.zone;
        let s = battleScore(d, req.attacker, t, p);
        if (plan && plan.att === req.attacker && plan.target === t) s += 1e6;
        if (s > bestScore) { bestScore = s; best = i; }
      });
      return best;
    }

    // Which zones: a cost or a tribute its weakest own, a harmful effect the other side's best, a helpful one its own best.
    function zones(d, req, p) {
      const opts = req.options.map((o, i) => ({ i, own: o.p === p, v: zoneValue(d, o.zone, o.i) }));
      const src = source(d), k = src ? kind(src.no) : {};
      const cost = /tribute|send|discard|sacrifice|offer/i.test(req.prompt);
      let order;
      if (cost) order = opts.sort((a, b) => (b.own - a.own) || a.v - b.v);
      else if (k.harm || k.take) order = opts.sort((a, b) => (a.own - b.own) || b.v - a.v);
      else order = opts.sort((a, b) => (b.own - a.own) || (a.own ? b.v - a.v : a.v - b.v));
      const n = req.max > 1 ? (cost ? req.min : req.max) : 1;
      const picked = order.slice(0, Math.max(n, req.min || 0)).map((o) => o.i);
      return req.max > 1 ? picked : picked[0];
    }

    function cards(d, req, p) {
      if (req.hidden) { const r = req.options.map((_, i) => i).slice(0, Math.max(1, req.min)); return req.max > 1 ? r : r[0]; }
      const low = /discard|send|tribute|return|shuffle|banish|remove/i.test(req.prompt) && !/add|summon|to your hand/i.test(req.prompt);
      const order = req.options.map((o, i) => ({ i, v: cardValue(o.card) })).sort((a, b) => low ? a.v - b.v : b.v - a.v);
      const n = Math.max(req.min || 1, low ? req.min || 1 : req.max);
      const picked = order.slice(0, n).map((o) => o.i);
      return req.max > 1 ? picked : picked[0];
    }

    function choose(d, req, p) {
      const q = 1 - p;
      if (/in which position/i.test(req.prompt)) {
        const no = DM.numberOf(req.prompt.replace(/^Summon /, "").replace(/ in which position\?$/, ""));
        const atk = C.atk(no), def = C.def(no);
        return !d.monsters(q).length || atk > bestAtk(d, q) || atk >= def ? 0 : 1;
      }
      if (/Declare a Type|Declare an Attribute/i.test(req.prompt)) {
        const counts = req.options.map((o) => d.monsters(q).filter((z) => (/Type/.test(req.prompt) ? C.type(z.card.no) : C.attribute(z.card.no)) === o.value).length);
        return counts.indexOf(Math.max(...counts));
      }
      // (a card to make or bring: the strongest)
      const vals = req.options.map((o) => { const no = DM.numberOf(o.label); return no ? Math.max(C.atk(no), C.def(no)) : -1; });
      const m = Math.max(...vals);
      return m > 0 ? vals.indexOf(m) : 0;
    }

    function yesno(d, req, p) {
      const pay = /pay (\d+)/i.exec(req.prompt);
      return pay && d.players[p].lp <= +pay[1] + 1000 ? 1 : 0;
    }

    // Whether to answer: with each card it could, the first worth it, or none.
    function respond(d, req, p) {
      const q = 1 - p, ev = req.event, link = req.link;
      for (let i = 0; i < req.options.length; i++) {
        const o = req.options[i];
        if (o.pass) continue;
        const no = o.card.no, k = kind(no);
        if (link) { if (link.p === q && (k.counter || /negate/i.test(text(no)))) return i; continue; }
        if (!ev || ev.p === p) continue;
        if (ev.type === "attack") {
          const att = ev.attacker, t = ev.target;
          const hurts = !t || d.atkOf(att) > d.battleValue(t) || d.atkOf(att) >= 1500;
          if (hurts && (k.attack || k.harm)) return i;
        } else if (ev.type === "before-damage") {
          // (Kuriboh and the like: when the battle would cost it 1000 or more, or the duel)
          const att = ev.attacker, t = ev.target, a = d.atkOf(att);
          const dmg = !t ? a : !t.defense ? Math.max(0, a - d.atkOf(t)) : 0;
          if (dmg >= 1000 || dmg >= d.players[p].lp) return i;
        } else if (/summoned/.test(ev.type)) {
          if (ev.zone && d.atkOf(ev.zone) >= 1500 && (k.summon || k.harm) && !k.attack) return i;
        } else if (ev.type === "activate" || ev.type === "lp-damage") {
          if (k.counter) return i;
        }
      }
      return req.options.findIndex((o) => o.pass);
    }

    return {
      ai: true,
      choose(d, req) {
        const p = req.player;
        switch (req.type) {
          case "main": return main(d, req, p);
          case "battle": return battle(d, req, p);
          case "attack-target": return attackTarget(d, req, p);
          case "zones": return zones(d, req, p);
          case "cards": return cards(d, req, p);
          case "yesno": return yesno(d, req, p);
          case "respond": return respond(d, req, p);
          default: return choose(d, req, p);
        }
      }
    };
  }
  DM.ai = create;
})();
