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
    if (!Object.keys(byName).length) window.YUGIOH_CARDS.cards.forEach((c, i) => { if (c) byName[norm(c[0])] = i; });
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
      const set = { atk: null, def: null };
      let mult = { atk: 1, def: 1 };
      const apply = (m) => {
        if (!m) return;
        if (m.type != null) s.type = m.type;
        if (m.attribute != null) s.attribute = m.attribute;
        if (m.setAtk != null) set.atk = m.setAtk;
        if (m.setDef != null) set.def = m.setDef;
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
      if (set.atk != null) s.atk = set.atk;
      if (set.def != null) s.def = set.def;
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
      const pl = this.players[owner == null ? c.owner : owner];
      if (pile === "deck") { if (top === false) pl.deck.push(c); else if (top === "shuffle") { pl.deck.push(c); shuffle(this, pl.deck); } else pl.deck.unshift(c); }
      else if (pile === "fusion" || CardInfo.isExtra(c.no) && (pile === "hand" || pile === "deck")) pl.fusion.push(c);
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
      if (opts.position === "choose") {
        const r = await this.choose(p, "Summon " + this.name(c) + " in which position?", [{ label: "Attack Position", value: false }, { label: "Defense Position", value: true }]);
        opts.defense = !!(r && r.value);
      }
      const z = await this.placeMonster(p, c, opts);
      if (!z) return null;
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
      try { await link.resolve(this, link); } catch (e) { if (e !== STOP) throw e; }
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
          : w === "any" ? true
          : w === "chain" ? !!last
          : !!ev && !last && ev.type === w);
        if (!ok) return false;
      } else if (ctx.event || ctx.last) return false;
      try { return !a.can || !!a.can(this, Object.assign({ p, card: c }, ctx)); } catch (e) { return false; }
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
      const lose = [0, 1].map((p) => this.players[p].lp <= 0 || this.players[p].flags.deckOut);
      const win = [0, 1].map((p) => hasExodia(this, p) || this.players[p].flags.specialWin);
      let winner = null, reason = null;
      if (win[0] || win[1]) { winner = win[0] && win[1] ? -1 : win[0] ? 0 : 1; reason = this.players[winner >= 0 ? winner : 0].flags.specialWin || "exodia"; }
      else if (lose[0] || lose[1]) { winner = lose[0] && lose[1] ? -1 : lose[0] ? 1 : 0; reason = this.players[lose[0] ? 0 : 1].flags.deckOut ? "deck" : "lp"; }
      if (winner == null) return false;
      this.over = { winner, reason };
      return true;
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
          if (tribs.length) z.data.tributes = tribs.length;
          if (!z) return;
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
  const text = (no) => (window.YUGIOH_CARDS.cards[no] || ["", ""])[1].replace(/@\d/g, "").replace(/\s+/g, " ").trim();
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
    [/^During your Standby Phase, if a "([^"]+)" exists in your Graveyard, you can return/, () => ({})]
  ];
  DM.TEMPLATES = TEMPLATES;
  DM.applyTemplates = function () {
    let n = 0;
    window.YUGIOH_CARDS.cards.forEach((c, no) => {
      // (a Spell or Trap defined only for what it does later, Black Pendant's burn, still gets its activation here)
      const had = DM.EFFECTS[no];
      if (!c || (had && (had.activate || !(C.isSpell(no) || C.isTrap(no))))) return;
      const t = text(no);
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
  define("Bright Castle", DM.equip((d, z) => d.stats(z).attribute === ATTR.LIGHT, { atk: 700 }));
  define("Megamorph", DM.equip(() => true, (d, z) => {
    const p = d.controllerOf(z), mine = d.players[p].lp, theirs = d.players[1 - p].lp, base = C.atk(z.card.no);
    return mine < theirs ? { atk: base } : mine > theirs ? { atk: -Math.ceil(base / 2) } : null;
  }));
  define("United We Stand", DM.equip(() => true, (d, z) => { const n = up(d, d.controllerOf(z)).length * 800; return { atk: n, def: n }; }));
  define("Mage Power", DM.equip(() => true, (d, z) => { const n = H.st(d, d.controllerOf(z)).filter((s) => s.card.no && (C.isSpell(s.card.no) || C.isTrap(s.card.no))).length * 500; return { atk: n, def: n }; }));
  define("Lightning Blade", DM.equip((d, z) => d.stats(z).type === typeNo("Warrior"), { atk: 800 }));
  define("Dark Magician's Tome of Black Magic", Object.assign(DM.equip((d, z) => isName(z.card, ["Dark Magician", "Dark Magician Girl"]), { atk: 700 }),
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
  define("Shield Crash", destroyTarget("Destroy which Defense Position monster?", (d, z) => z.defense, BOTH, "monster"));
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
  define("Makiu", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Summoned Skull") || H.isType(d, z, "Thunder")),
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
    if (names.length) FUSIONS[no] = names.map((n) => N(n)).filter(Boolean);
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
  DM.fusionsFrom = fusionsFrom;
  const fusionPool = (d, p) => d.players[p].hand.concat(d.monsters(p).filter((z) => z.faceUp || true).map((z) => z.card));
  const fusion = (poolFn, filter, banish) => ({ activate: {
    can: (d, ctx) => fusionsFrom(d, ctx.p, poolFn(d, ctx.p).filter((c) => c !== ctx.card), filter).length > 0 && (d.freeMonsterZone(ctx.p) >= 0 || d.monsters(ctx.p).length > 0),
    resolve: async (d, link) => {
      const opts = fusionsFrom(d, link.p, poolFn(d, link.p).filter((c) => c !== link.card), filter);
      const o = await d.choose(link.p, "Fusion Summon which monster?", opts.map((x) => ({ label: d.name(x.fusion), x })));
      if (!o) return;
      for (const m of o.x.materials) { if (banish) await d.banish(m, "fusion"); else await d.sendToGrave(m, "fusion"); }
      const z = await d.specialSummon(link.p, o.x.fusion, { how: "fusion", position: "choose" });
      if (z && link.data.onFused) await link.data.onFused(d, z);
    } } });
  define("Polymerization", fusion(fusionPool));
  define("Miracle Fusion", fusion((d, p) => d.players[p].grave.concat(d.monsters(p).map((z) => z.card)), (f) => /Elemental Hero/.test(C.name(f.no)), true));
  define("Dragon's Mirror", fusion((d, p) => d.players[p].grave.concat(d.monsters(p).map((z) => z.card)), (f) => C.type(f.no) === typeNo("Dragon"), true));
  define("Power Bond", fusion(fusionPool, (f) => C.type(f.no) === typeNo("Machine")));
  DM.EFFECTS[N("Power Bond")].activate.target = async (d, link) => { link.data.onFused = async (d2, z) => { d2.addTemp(z, { atk: C.atk(z.card.no) }, link.card); z.data.powerBond = { p: link.p, turn: d2.turn }; }; return true; };
  define("Fusion Gate", { activate: { resolve: async () => {} }, ignition: { repeatable: true, can: (d, ctx) => fusionsFrom(d, ctx.p, fusionPool(d, ctx.p)).length > 0, resolve: async (d, link) => {
    const opts = fusionsFrom(d, link.p, fusionPool(d, link.p)); const o = await d.choose(link.p, "Fusion Summon which monster?", opts.map((x) => ({ label: d.name(x.fusion), x })));
    if (!o) return; for (const m of o.x.materials) await d.banish(m, "fusion"); await d.specialSummon(link.p, o.x.fusion, { how: "fusion", position: "choose" }); } } });
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
    const anyAttr = /Ritual Summon any (LIGHT|DARK|WATER|FIRE|EARTH|WIND) monster/.exec(t);
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
  define("Calamity of the Wicked", onAttack(async (d, link) => H.destroyAll(d, H.st(d).filter((z) => z !== link.zone))));
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
  define("Hidden Soldier", onSummon((d, ev, p) => ev.p !== p && d.players[p].hand.some((c) => C.attribute(c.no) === ATTR.DARK && C.level(c.no) <= 4 && C.isMonster(c.no)),
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
    resolve: async (d, link) => { const z = t0(d, link); if (z && (await d.destroy(z, "effect"))) { await d.damage(0, 1000, "effect"); await d.damage(1, 1000, "effect"); } } } });
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
  define("Amazon Archer", { ignition: { repeatable: true, can: (d, ctx) => d.monsters(ctx.p).length > 2, cost: async (d, link) => (await tributeCost()(d, link)) && (await tributeCost()(d, link)), resolve: async (d, link) => d.damage(1 - link.p, 1200, "effect") } });
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
  define("Dimensional Warrior", { onBattle: async (d, z, p, other) => { if (d.locate(other)) await d.banish(other.card, "effect"); if (d.locate(z)) await d.banish(z.card, "effect"); } });
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
  define("Mystical Beast Serket", { onDestroyByBattle: async (d, z, p, victim) => { z.links.push({ kind: "self", stats: { atk: 500 } }); if (d.players[victim.card.owner].grave.includes(victim.card)) await d.banish(victim.card); } });
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
  define("Des Dendle", union(["Vampire Orchis"], null, { equipDestroyByBattle: async (d, z, p) => {
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
  define("Red-Eyes Darkness Dragon", tributeFor(["Red-Eyes B. Dragon"], { selfStats: (d, z) => ({ atk: 300 * d.players[d.controllerOf(z)].grave.filter((c) => C.isMonster(c.no) && isT(c.no, "Dragon")).length }) }));
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
  define("Tricky", { specialFromHand: (d, p, c) => d.players[p].hand.length > 1, specialCost: async (d, p, c) => !!(await H.discardOne(d, p, "Discard a card to Special Summon Tricky.", (x) => x !== c)) });
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
  define("Red-Eyes B. Chick", tributeSelfFor("Red-Eyes B. Dragon"));
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
  define("Cathedral of Nobles", stays({ trapsSameTurn: true, ignition: { can: (d, ctx) => mine(d, ctx) && up(d, ctx.p).some((z) => isName(z.card, "Mystical Beast Serket")),
    resolve: async (d, link) => { const s = up(d, link.p).find((z) => isName(z.card, "Mystical Beast Serket")); if (!s) return; await d.sendToGrave(s.card, "cost"); if (link.zone && d.locate(link.zone)) await d.sendToGrave(link.card, "cost");
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
  define("Inferno Fire Blast", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Red-Eyes B. Dragon")), target: (d, link) => pickMon(d, link, "Choose which Red-Eyes B. Dragon?", (z) => z.faceUp && isName(z.card, "Red-Eyes B. Dragon"), [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (!z) return; z.data.cannotAttackTurn = d.turn; await d.damage(1 - link.p, C.atk(z.card.no), "effect"); } } });
  define("Tricky's Magic 4", { activate: { can: (d, ctx) => up(d, ctx.p).some((z) => isName(z.card, "Tricky")) && d.monsters(1 - ctx.p).length > 0,
    cost: async (d, link) => { const z = await d.pickZone(link.p, "Send which Tricky to the Graveyard?", (x, q) => q === link.p && x.faceUp && isName(x.card, "Tricky"), { sides: [link.p], area: "monster" }); if (!z) return false; await d.sendToGrave(z.card, "cost"); return true; },
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
  define("Spark Gun", Object.assign(DM.equip((d, z) => isName(z.card, "Elemental Hero Sparkman"), null), { ignition: { can: (d, ctx) => mine(d, ctx) && up(d).length > 0 && ctx.zone.equippedTo,
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
  define("Reversal of Graves", { activate: { can: (d, ctx) => d.players[ctx.p].lp > 1000 && d.players[ctx.p].grave.length >= 15, cost: async (d, link) => { await d.payLp(link.p, 1000); return true; },
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
  define("Hidden Book of Spell", { activate: { can: (d, ctx) => ctx.p === d.turnPlayer && d.players[ctx.p].grave.filter((c) => C.isSpell(c.no)).length >= 2,
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
  define("Corpse of Yata-Garasu", { activate: { resolve: async (d, link) => {
    const spirit = up(d, 1 - link.p).some((z) => DM.effectOf(z.card.no) && DM.effectOf(z.card.no).spirit);
    const o = spirit ? await d.choose(link.p, "Draw how many cards?", [{ label: "Draw 1 card", v: 1 }, { label: "Draw 2 cards", v: 2 }]) : null;
    await d.drawCards(link.p, o ? o.v : 1); } } });
  define("Labyrinth of Nightmare", stays({ endPhase: async (d) => { for (const z of up(d, d.turnPlayer)) await d.changePosition(z, !z.defense); } }));
  define("Pyramid of Light", stays({ onLeave: async (d, z, p) => { for (const m of up(d, p).filter((x) => isName(x.card, ["Andro Sphinx", "Sphinx Teleia"]))) { if (await d.destroy(m, "effect")) { const c = m.card; if (d.players[c.owner].grave.includes(c)) await d.banish(c, "effect"); } } } }));
  define("Ninjitsu Art of Decoy", { activate: { stays: true, can: (d, ctx) => up(d, ctx.p).some((z) => C.name(z.card.no).includes("Ninja")),
    target: (d, link) => pickMon(d, link, "Choose which Ninja?", (z) => z.faceUp && C.name(z.card.no).includes("Ninja"), [link.p]),
    resolve: async (d, link) => { const z = t0(d, link); if (z && link.zone) { z.data.shield = link.zone; link.zone.data.bound = z; z.data.boundBy = link.zone; } else if (link.zone) link.zone.data.discard = true; } } });
  // (A Trap that becomes a monster)
  define("Red Gadget - Stronghold", { activate: { stays: true, can: (d, ctx) => d.freeMonsterZone(ctx.p) >= 0, resolve: async (d, link) => {
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
  define("Kinetic Soldier", vs((d, o) => H.typeOf(d, o) === typeNo("Warrior"), { atk: 2000, def: 2000 }));
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
  define("Big Core", core());
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
  define("Vampire Orchis", { onSummon: async (d, z, p, how) => { const c = how === "normal" && H.canSummonHere(d, p) && d.players[p].hand.find((x) => isName(x, "Des Dendle")); if (c && (await d.yesNo(p, "Special Summon Des Dendle from your hand?"))) await ss(d, p, c); } });

  // ----- Destroying a monster in battle -----
  const onKill = (fn) => ({ onDestroyByBattle: async (d, z, p, v) => { if (inGrave(d, v.card)) await fn(d, z, p, v); } });
  define("D.D. Crazy Beast", { onDestroyByBattle: async (d, z, p, v) => { if (inGrave(d, v.card)) await d.banish(v.card, "effect"); } });
  define("Holy Knight Ishzark", DM.EFFECTS[N("D.D. Crazy Beast")]);
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
  define("Amazoness Paladin", self((d, z) => ({ atk: 100 * up(d, ctl(d, z)).filter((x) => C.name(x.card.no).includes("Amazoness") || isName(x.card, "Amazon Archer")).length })));
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
  for (const n of ["Zone Eater", "Swordsman from a Foreign Land"]) define(n, { beforeDamage: async (d, z, p, t) => { if (t) t.data.destroyAtEnd = d.turn + 5; } });
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
  const text = (no) => ((window.YUGIOH_CARDS.cards[no] || [])[1] || "").replace(/@\d/g, "");
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
