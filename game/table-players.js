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
    freeMonsterZone(p) { const zs = this.players[p].zones; for (let i = 0; i < MZ; i++) if (!zs[i]) return i; return -1; },
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
      // (a card removed from play instead, while something says so: Banisher of the Light, Macro Cosmos)
      const banishInstead = [0, 1].some((q) => this.allZones(q).some((z) => z.faceUp && !z.negated && effectOf(z.card.no) && effectOf(z.card.no).graveToBanish));
      this.toPile(c, banishInstead ? "banished" : "grave");
      await this.emit({ type: banishInstead ? "banish" : "to-grave", card: c, from, why });
      await this.afterLeave(c, from, why);
      const e = effectOf(c.no);
      if (!banishInstead && e && e.onToGrave) await e.onToGrave(this, c, c.owner, from, why);
      if (from && from.zone != null && from.zone < 5) await this.event({ type: "monster-to-grave", card: c, p: from.p, why });
      return from;
    },
    async banish(c, why) {
      const from = this.take(c);
      this.toPile(c, "banished");
      await this.emit({ type: "banish", card: c, from, why });
      await this.afterLeave(c, from, why);
    },
    async toHand(c, why) {
      const from = this.take(c);
      this.toPile(c, CardInfo.isExtra(c.no) ? "fusion" : "hand");
      await this.emit({ type: "to-hand", card: c, from, why });
      await this.afterLeave(c, from, why);
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
      await this.emit({ type: "destroy", zone: z, p: l.p, i: l.i, why });
      const c = z.card, wasUp = z.faceUp;
      await this.sendToGrave(c, why === "battle" ? "battle" : "destroyed");
      if (e && e.onDestroyed && (wasUp || why === "battle") && !z.negated) await e.onDestroyed(this, z, l.p, why, by);
      await this.event({ type: why === "battle" ? "battle-destroyed" : "destroyed", card: c, p: l.p, by });
      return true;
    },
    async drawCards(p, n) {
      const pl = this.players[p];
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
      pl.lp = Math.max(0, pl.lp - n);
      await this.emit({ type: "lp", p, amount: -n, lp: pl.lp, why });
      this.checkWin();
      await this.event({ type: "lp-damage", p, amount: n, why });
    },
    async heal(p, n, why) {
      if (n <= 0) return;
      const pl = this.players[p];
      pl.lp += n;
      await this.emit({ type: "lp", p, amount: n, lp: pl.lp, why });
    },
    async payLp(p, n) {
      this.players[p].lp = Math.max(0, this.players[p].lp - n);
      await this.emit({ type: "lp", p, amount: -n, lp: this.players[p].lp, why: "cost" });
      this.checkWin();
    },
    async discard(p, c, why) {
      await this.sendToGrave(c, why || "discard");
      await this.event({ type: "discarded", p, card: c });
    },
    // Put a monster on the field (a summon of any kind).
    async placeMonster(p, c, opts) {
      opts = opts || {};
      const i = opts.zone != null ? opts.zone : this.freeMonsterZone(p);
      if (i < 0) return null;
      const from = this.take(c);
      const z = newZone(c, { faceUp: opts.faceUp !== false, defense: !!opts.defense, placedTurn: this.turn, summonedBy: opts.how || "normal" });
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
    async flipUp(z, how) {
      if (z.faceUp) return;
      const l = this.locate(z);
      z.faceUp = true;
      await this.emit({ type: "flip", zone: z, p: l.p, how });
      const e = effectOf(z.card.no);
      if (e && e.flip) await this.runEffect({ card: z.card, zone: z, p: l.p, kind: "flip", resolve: e.flip, label: this.name(z.card) });
    },
    async changePosition(z, defense) {
      if (z.defense === !!defense && z.faceUp) return;
      if (!z.faceUp) await this.flipUp(z, "position");
      z.defense = !!defense;
      await this.emit({ type: "position", zone: z, p: this.controllerOf(z), defense: z.defense });
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
      for (const p of [0, 1]) for (const z of this.allZones(p).slice()) {
        const e = effectOf(z.card.no);
        if (e && e.onEvent && z.faceUp && !z.negated && this.locate(z)) await e.onEvent(this, z, p, ev);
      }
      // (while a chain resolves, the window waits until it's done, as EDS queues its triggers: Chain_AddPending)
      if (this.resolving) { this.pendingEvents.push(ev); return; }
      await this.respondWindow(ev);
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
        if (CardInfo.isTrap(no) && (z.placedTurn === this.turn || this.negated("trap"))) continue;
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
      for (const p of [0, 1]) await this.drawCards(p, HAND);
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
      // Draw Phase
      this.phase = "draw"; await this.emit({ type: "phase", phase: "draw", p });
      if (pl.flags.skipDraw) pl.flags.skipDraw = false;
      else if (pl.flags.skipDraws > 0) pl.flags.skipDraws--;
      else { await this.drawCards(p, 1); await this.event({ type: "drew", p }); }
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
      const noBattle = pl.flags.skipBattle || pl.flags.noBattleThisTurn === this.turn;
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
        if (z.data.returnAtEnd && z.data.returnAtEnd.turn === this.turn) { const to = z.data.returnAtEnd.to; z.data.returnAtEnd = null; await this.takeControl(z, to); }
        if (z.data.powerBond && z.data.powerBond.turn === this.turn) { await this.damage(z.data.powerBond.p, CardInfo.atk(z.card.no), "effect"); z.data.powerBond = null; }
        if (z.data.toDefenseAtEnd) { z.data.toDefenseAtEnd = false; await this.changePosition(z, true); z.changedTurn = this.turn + 1; }
      }
      for (const q of [0, 1]) if (this.players[q].flags.countdown && this.turn >= this.players[q].flags.countdown) { this.players[q].flags.specialWin = "countdown"; this.checkWin(); }
      this.temp = this.temp.filter((t) => t.until === "permanent");
      for (const k of ["spellsNegatedThisTurn"]) delete this.flags[k];
      while (pl.hand.length > HAND_LIMIT && !this.over) {
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
          if (canNormal && !special && CardInfo.kind(no) !== "ritual" && fieldOk) {
            const t = e && e.noTributeIfOnly && pl.hand.length === 1 ? 0 : tributesFor(no, e);
            if (this.tributable(p).length >= t && (t > 0 || this.freeMonsterZone(p) >= 0)) {
              acts.push({ act: "summon", card: c, tributes: t, label: "Summon " + CardInfo.name(no) });
              acts.push({ act: "set-monster", card: c, tributes: t, label: "Set " + CardInfo.name(no) });
            }
          }
          if (e && e.handActivate && this.canActivate(p, c, e.handActivate, { fromHand: true })) acts.push({ act: "hand-effect", card: c, label: "Use " + CardInfo.name(no) });
          if (e && e.specialFromHand && !noSummon && this.freeMonsterZone(p) >= 0 && e.specialFromHand(this, p)) acts.push({ act: "special-hand", card: c, label: "Special Summon " + CardInfo.name(no) });
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
    tributable(p) { return this.monsters(p).filter((z) => !z.data.cannotTribute); },
    async doAction(p, a) {
      const pl = this.players[p];
      switch (a.act) {
        case "summon": case "set-monster": {
          const set = a.act === "set-monster", e = effectOf(a.card.no);
          const tribs = a.tributes ? await this.pickZones(p, "Tribute " + a.tributes + " monster" + (a.tributes > 1 ? "s" : "") + ".", (z, q) => q === p && !z.data.cannotTribute, { sides: [p], area: "monster", count: a.tributes, cancel: true }) : [];
          if (tribs === null) return;
          for (const z of tribs) await this.sendToGrave(z.card, "tribute");
          pl.normalSummoned = true;
          const z = await this.placeMonster(p, a.card, { faceUp: !set, defense: set, how: set ? "set" : "normal" });
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
          const z = await this.specialSummon(p, a.card, { how: "special", position: "choose" });
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
          this.take(a.card);
          const z = newZone(a.card, { faceUp: false, placedTurn: this.turn });
          pl.zones[i] = z;
          await this.emit({ type: "set-spell", p, i, zone: z, card: a.card });
          return;
        }
        case "activate": case "ignition": case "hand-effect": {
          const e = effectOf((a.card || a.zone.card).no);
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
        const ae = effectOf(att.card.no), direct = ae && ae.directAttack && !att.negated && (typeof ae.directAttack !== "function" || ae.directAttack(this, att, p));
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
      if (z.data.boundBy && this.locate(z.data.boundBy) && this.live(z.data.boundBy)) return false;
      if (e && e.noAttackOnSummonTurn && z.placedTurn === this.turn) return false;
      if (e && e.cannotAttack && !z.negated && e.cannotAttack(this, z, p)) return false;
      if (e && e.attackTribute && !z.negated && this.monsters(p).length < 2) return false;
      for (const q of [0, 1]) for (const s of this.allZones(q)) {
        const se = this.live(s);
        if (se && se.noAttack && se.noAttack(this, s, q, p, z)) return false;
        if (se && se.oneAttacker && this.monsters(p).some((x) => x !== z && x.attacks > 0)) return false;
      }
      return z.attacks < ((e && !z.negated && e.attacks) || 1);
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
      if (target && !target.faceUp) { await this.flipUp(target, "attacked"); if (this.over || !this.locate(att) || !this.locate(target)) return; }
      const ae = att.negated ? null : effectOf(att.card.no);
      if (ae && ae.beforeDamage && (await ae.beforeDamage(this, att, p, target)) === "stop") return;
      if (target && !this.locate(target)) return;
      if (!target) {
        const dealt = await this.battleDamage(q, this.atkOf(att), att, null, A);
        if (dealt > 0 && ae && ae.onBattleDamage) await ae.onBattleDamage(this, att, p, null, dealt);
        if (dealt > 0) await this.event({ type: "battle-damage", p: q, attacker: att, amount: dealt, direct: true });
        if (ae && ae.afterAttack) await ae.afterAttack(this, att, p, null);
        return;
      }
      // Damage calculation (BattleStage_DamageCalc)
      const te = target.negated ? null : effectOf(target.card.no);
      if (ae && ae.onBattle) { await ae.onBattle(this, att, p, target); if (!this.locate(att) || !this.locate(target)) return; }
      if (te && te.onBattle) { await te.onBattle(this, target, q, att); if (!this.locate(att) || !this.locate(target)) return; }
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
        if (a > t) { res.targetDies = true; if (ae && ae.piercing) { res.damageTo = q; res.amount = a - t; } }
        else if (a < t) { res.damageTo = p; res.amount = t - a; }
      }
      if (te && te.battleImmune && !target.negated && te.battleImmune(this, target, q, att)) res.targetDies = false;
      if (ae && ae.battleImmune && !att.negated && ae.battleImmune(this, att, p, target)) res.attackerDies = false;
      await this.emit({ type: "damage-calc", attacker: att, target, atk: a, value: this.battleValue(target), res });
      if (te && te.onAttacked && !target.negated) await te.onAttacked(this, target, q, att, res);
      if (ae && ae.destroysAttribute && this.stats(target).attribute === ae.destroysAttribute) res.targetDies = true;
      if (res.damageTo != null && res.amount > 0) {
        const dealer = res.damageTo === q ? att : target;
        const dealt = await this.battleDamage(res.damageTo, res.amount, dealer, res.damageTo === q ? target : att, A);
        const de = dealer.negated ? null : effectOf(dealer.card.no);
        if (dealt > 0 && de && de.onBattleDamage) await de.onBattleDamage(this, dealer, res.damageTo === q ? p : q, res.damageTo === q ? target : att, dealt);
        if (dealt > 0) await this.event({ type: "battle-damage", p: res.damageTo, attacker: att, amount: dealt });
      }
      if (this.over) return;
      // (Kishido Spirit: equal ATK doesn't destroy)
      if (res.attackerDies && res.targetDies) for (const [z, r] of [[att, p], [target, q]]) if (this.allZones(r).some((s) => this.live(s) && effectOf(s.card.no).kishido)) { if (z === att) res.attackerDies = false; else res.targetDies = false; }
      if (res.targetDies && this.locate(target)) await this.destroy(target, "battle", att);
      if (res.attackerDies && this.locate(att)) await this.destroy(att, "battle", target);
      if (res.targetDies && ae && ae.onDestroyByBattle && this.locate(att)) await ae.onDestroyByBattle(this, att, p, target);
      if (att.data.bounce && this.locate(att)) { att.data.bounce = false; await this.toHand(att.card, "effect"); }
      if (target.data.destroyAfterBattle && this.locate(target)) await this.destroy(target, "effect");
      if (ae && ae.afterAttack && this.locate(att)) await ae.afterAttack(this, att, p, target);
    },
    // Battle damage to player r from monster `dealer`: 0 under Waboku, Kuriboh, Spirit Barrier; halved (Susa Soldier).
    async battleDamage(r, n, dealer, other, A) {
      const pl = this.players[r];
      if (pl.flags.waboku === this.turn || (A && A.noDamageTo === r)) return 0;
      for (const s of this.allZones(r)) { const se = this.live(s); if (se && se.noBattleDamageFor && se.noBattleDamageFor(this, s, r)) return 0; }
      const de = dealer && !dealer.negated ? effectOf(dealer.card.no) : null;
      if (de && de.halfDamage) n = Math.floor(n / 2);
      await this.damage(r, n, "battle");
      return n;
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
      if (!c || DM.EFFECTS[no]) return;
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
