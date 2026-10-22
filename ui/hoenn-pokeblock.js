// Pokéblocks (Emerald's src/pokeblock.c, pokeblock_feed.c and the arithmetic of berry_blender.c): the Berry
// Blender's blocks, the Pokéblock Case that holds them (40), and feeding them to a Pokémon for its contest
// conditions. The Blender's game itself is ui/berry-blender.js. For ui/game.js's Hoenn specials.
//
//   const PB = HoennPokeblock.create(env)
//   await PB.special(name, api)          // true if it's one of its specials (DoBerryBlending, GetFirstFreePokeblockSlot, ...)
//   await PB.menu()                      // the Pokéblock Case from the Bag: USE (feed one of your Pokémon) / TOSS
//   await PB.choose(title)               // one from the case: its index, or -1
//   PB.feed(record, block)               // -> "ate" | "happily" | "disdainfully" | "full" (sheen 255: it won't eat any more)
//   HoennPokeblock.blend(berryIds, maxRPM, rng) -> { color, spicy, dry, sweet, bitter, sour, feel }   (CalculatePokeblock)
//   HoennPokeblock.name(block), HoennPokeblock.level(block)
//
// env: player(), say(pages), confirm(question), pick(title, labels) -> index | -1, chooseBerry() -> item id | null,
//   choosePartyMon(prompt) -> party index | -1, blender(players) -> { maxRPM } (the game: players [{ name, berry }]),
//   flag(name), itemName(id), fanfare(song), sfx(name).
// player.flags.hoennPokeblocks: the case's blocks; player.flags.hoennBlenderRecords: [2, 3, 4 players' best RPM x100];
// a Pokémon's record.contest: { cool, beauty, cute, smart, tough, sheen }.
(function () {
  "use strict";

  // Emerald's berries (gBerries): spicy, dry, sweet, bitter, sour, and smoothness (the block's feel).
  const BERRIES = {
    cheri: [10, 0, 0, 0, 0, 25], chesto: [0, 10, 0, 0, 0, 25], pecha: [0, 0, 10, 0, 0, 25], rawst: [0, 0, 0, 10, 0, 25], aspear: [0, 0, 0, 0, 10, 25],
    leppa: [10, 0, 10, 10, 10, 20], oran: [10, 10, 10, 10, 10, 20], persim: [10, 10, 10, 10, 10, 20], lum: [10, 10, 10, 10, 10, 20], sitrus: [10, 10, 10, 10, 10, 20],
    figy: [10, 0, 0, 0, 0, 25], wiki: [0, 10, 0, 0, 0, 25], mago: [0, 0, 10, 0, 0, 25], aguav: [0, 0, 0, 10, 0, 25], iapapa: [0, 0, 0, 0, 10, 25],
    razz: [10, 10, 0, 0, 0, 20], bluk: [0, 10, 10, 0, 0, 20], nanab: [0, 0, 10, 10, 0, 20], wepear: [0, 0, 0, 10, 10, 20], pinap: [10, 0, 0, 0, 10, 20],
    pomeg: [10, 0, 10, 10, 0, 20], kelpsy: [0, 10, 0, 10, 10, 20], qualot: [10, 0, 10, 0, 10, 20], hondew: [10, 10, 0, 10, 0, 20], grepa: [0, 10, 10, 0, 10, 20],
    tamato: [20, 10, 0, 0, 0, 30], cornn: [0, 20, 10, 0, 0, 30], magost: [0, 0, 20, 10, 0, 30], rabuta: [0, 0, 0, 20, 10, 30], nomel: [10, 0, 0, 0, 20, 30],
    spelon: [40, 10, 0, 0, 0, 70], pamtre: [0, 40, 10, 0, 0, 70], watmel: [0, 0, 40, 10, 0, 70], durin: [0, 0, 0, 40, 10, 70], belue: [10, 0, 0, 0, 40, 70],
    liechi: [40, 0, 40, 0, 10, 80], ganlon: [0, 40, 0, 40, 0, 80], salac: [0, 0, 40, 0, 40, 80], petaya: [40, 0, 0, 40, 0, 80], apicot: [0, 40, 0, 0, 40, 80],
    lansat: [10, 10, 10, 10, 10, 30], starf: [10, 10, 10, 10, 10, 30], enigma: [40, 40, 40, 40, 40, 40]
  };
  const ORDER = Object.keys(BERRIES);   // (Emerald's order: ITEM_TO_BERRY - 1)
  const FLAVORS = ["spicy", "dry", "sweet", "bitter", "sour"];
  const CONDITIONS = ["cool", "beauty", "cute", "smart", "tough"];
  const COLORS = ["", "Red", "Blue", "Pink", "Green", "Yellow", "Purple", "Indigo", "Brown", "LiteBlue", "Olive", "Gray", "Black", "White", "Gold"];
  const CASE_SIZE = 40;
  // (The NPCs' berries by yours, sOpponentBerrySets: the first five sets for Cheri to Aspear, the rest by its number.)
  const NPC_SETS = [["aspear", "rawst", "pecha"], ["cheri", "aspear", "rawst"], ["chesto", "cheri", "aspear"], ["pecha", "chesto", "cheri"], ["rawst", "pecha", "chesto"],
    ["cheri", "pecha", "rawst"], ["chesto", "rawst", "aspear"], ["pecha", "aspear", "cheri"], ["rawst", "cheri", "chesto"], ["aspear", "chesto", "pecha"]];
  const MASTER_BERRIES = ["spelon", "pamtre", "watmel", "durin", "belue"];
  // A nature's taste for each flavour (gPokeblockFlavorCompatibilityTable): 1 likes it, -1 dislikes it.
  const TASTE = {
    Hardy: [0, 0, 0, 0, 0], Lonely: [1, 0, 0, 0, -1], Brave: [1, 0, -1, 0, 0], Adamant: [1, -1, 0, 0, 0], Naughty: [1, 0, 0, -1, 0],
    Bold: [-1, 0, 0, 0, 1], Docile: [0, 0, 0, 0, 0], Relaxed: [0, 0, -1, 0, 1], Impish: [0, -1, 0, 0, 1], Lax: [0, 0, 0, -1, 1],
    Timid: [-1, 0, 1, 0, 0], Hasty: [0, 0, 1, 0, -1], Serious: [0, 0, 0, 0, 0], Jolly: [0, -1, 1, 0, 0], Naive: [0, 0, 1, -1, 0],
    Modest: [-1, 1, 0, 0, 0], Mild: [0, 1, 0, 0, -1], Quiet: [0, 1, -1, 0, 0], Bashful: [0, 0, 0, 0, 0], Rash: [0, 1, 0, -1, 0],
    Calm: [-1, 0, 0, 1, 0], Gentle: [0, 0, 0, 1, -1], Sassy: [0, 0, -1, 1, 0], Careful: [0, -1, 0, 1, 0], Quirky: [0, 0, 0, 0, 0]
  };
  const BLACK_FLAVORS = [0b11100, 0b10110, 0b10011, 0b11010, 0b11001, 0b01110, 0b01101, 0b01011];   // (sBlackPokeblockFlavorFlags: bit 0 spicy)

  const berryKey = (id) => String(id).replace(/-berry$/, "");
  const flavorsOf = (id) => BERRIES[berryKey(id)] || [0, 0, 0, 0, 0, 0];

  // The block the Blender makes of the berries put in, at the best speed reached (RPM x 100): CalculatePokeblock.
  function blend(berryIds, maxRPM, rng) {
    rng = rng || Math.random;
    const n = berryIds.length, f = [0, 0, 0, 0, 0, 0];
    for (const id of berryIds) flavorsOf(id).forEach((v, i) => { f[i] += v; });
    // (Each flavour less the next: only the strongest stand.)
    const spicy0 = f[0];
    f[0] -= f[1]; f[1] -= f[2]; f[2] -= f[3]; f[3] -= f[4]; f[4] -= spicy0;
    let negatives = 0;
    for (let i = 0; i < 5; i++) if (f[i] < 0) { f[i] = 0; negatives++; }
    for (let i = 0; i < 5; i++) if (f[i] > 0) f[i] = f[i] < negatives ? 0 : f[i] - negatives;
    const mult = Math.floor(maxRPM / 333) + 100;
    for (let i = 0; i < 5; i++) { let v = Math.floor(f[i] * mult / 10); const r = v % 10; v = Math.floor(v / 10); if (r > 4) v++; f[i] = v; }
    // The colour (CalculatePokeblockColor).
    let color;
    const zeros = f.slice(0, 5).filter((v) => v === 0).length, present = 5 - zeros;
    const same = new Set(berryIds.map(berryKey)).size < n;
    if (zeros === 5 || negatives > 3 || same) color = 12;
    else if (present > 3) color = 13;
    else if (present === 3) color = 11;
    else if (f.slice(0, 5).some((v) => v > 50)) color = 14;
    else if (present === 1) color = 1 + f.slice(0, 5).findIndex((v) => v > 0);
    else {
      const a = f.slice(0, 5).findIndex((v) => v > 0), b = f.slice(0, 5).findIndex((v, i) => v > 0 && i > a);
      // (Two flavours: purple, indigo, brown, lite blue and olive, each a pair in turn.)
      color = [[0, 1, 6], [1, 2, 7], [2, 3, 8], [3, 4, 9], [0, 4, 10], [0, 2, 6], [1, 3, 7], [2, 4, 8], [0, 3, 9], [1, 4, 10]].find(([x, y]) => x === a && y === b)[2];
    }
    let feel = Math.floor(f[5] / n) - n;
    if (feel < 0) feel = 0;
    if (color === 12) { const bits = BLACK_FLAVORS[Math.floor(rng() * BLACK_FLAVORS.length)]; for (let i = 0; i < 5; i++) f[i] = (bits >> i) & 1 ? 2 : 0; }
    for (let i = 0; i < 5; i++) if (f[i] > 255) f[i] = 255;
    return { color, spicy: f[0], dry: f[1], sweet: f[2], bitter: f[3], sour: f[4], feel: Math.min(255, feel) };
  }
  const level = (b) => Math.max(b.spicy, b.dry, b.sweet, b.bitter, b.sour);
  const name = (b) => COLORS[b.color].toUpperCase() + " POKéBLOCK";
  // How a nature takes a block: the sum of its flavours it likes less those it dislikes (PokeblockGetGain).
  const gain = (nature, b) => { const t = TASTE[nature] || TASTE.Hardy; return FLAVORS.reduce((s, k, i) => s + (b[k] > 0 ? b[k] * t[i] : 0), 0); };
  // The NPCs' berries for yours (SetOpponentsBerryData), the Blend Master's own when he's blending.
  function npcBerries(berry, n, master) {
    const idx = ORDER.indexOf(berryKey(berry));
    let set = idx < 0 ? 5 : idx < 5 ? idx : (idx % 5) + 5;
    const out = [];
    for (let i = 0; i < n; i++) {
      if (master) { let m = MASTER_BERRIES[set % 5]; if (MASTER_BERRIES.includes(berryKey(berry))) m = ORDER[ORDER.indexOf(m) - 5]; out.push(m + "-berry"); }
      else out.push(NPC_SETS[set][i] + "-berry");
    }
    return out;
  }

  function create(env) {
    const P = () => env.player();
    const blocks = () => { const f = P().flags; return f.hoennPokeblocks || (f.hoennPokeblocks = []); };
    const records = () => { const f = P().flags; return f.hoennBlenderRecords || (f.hoennBlenderRecords = [0, 0, 0]); };
    const label = (b) => name(b) + "  Lv. " + level(b);
    const conditions = (r) => r.contest || (r.contest = { cool: 0, beauty: 0, cute: 0, smart: 0, tough: 0, sheen: 0 });
    // Feeding: each flavour raises its condition (spicy Cool, dry Beauty, sweet Cute, bitter Smart, sour Tough), the feel
    // its sheen; at 255 sheen it won't eat any more. The nature says how it took it.
    function feed(r, b) {
      const c = conditions(r);
      if (c.sheen >= 255) return "full";
      FLAVORS.forEach((k, i) => { c[CONDITIONS[i]] = Math.min(255, c[CONDITIONS[i]] + b[k]); });
      c.sheen = Math.min(255, c.sheen + b.feel);
      const g = gain(r.nature, b);
      return g > 0 ? "happily" : g < 0 ? "disdainfully" : "ate";
    }
    async function choose(title) {
      const list = blocks();
      if (!list.length) { await env.say("The POKéBLOCK CASE is empty."); return -1; }
      return env.pick(title || "Which POKéBLOCK?", list.map(label));
    }
    async function feedMenu(i) {
      const list = blocks(), b = list[i];
      const who = await env.choosePartyMon("Give the " + name(b) + " to which POKéMON?");
      if (who < 0) return false;
      const r = P().party[who], how = feed(r, b);
      const nick = window.Party.displayName(r);
      if (how === "full") { await env.say(nick + " won't eat anymore…"); return false; }
      list.splice(i, 1);
      await env.say(nick + (how === "ate" ? " ate the\n" : how === "happily" ? " happily ate the\n" : " disdainfully ate the\n") + name(b) + ".");
      return true;
    }
    // The Pokéblock Case, opened from the Bag.
    async function menu() {
      for (;;) {
        const list = blocks();
        if (!list.length) { await env.say("The POKéBLOCK CASE is empty."); return; }
        const i = await env.pick("POKéBLOCK CASE", list.map(label));
        if (i < 0) return;
        const b = list[i];
        await env.say(name(b) + ": spicy " + b.spicy + ", dry " + b.dry + ", sweet " + b.sweet + ",\nbitter " + b.bitter + ", sour " + b.sour + "; feel " + b.feel + ".");
        const a = await env.pick(null, ["USE", "TOSS", "CANCEL"]);
        if (a === 0) await feedMenu(i);
        else if (a === 1 && await env.confirm("Throw away this " + name(b) + "?")) { list.splice(i, 1); await env.say("The " + name(b) + " was thrown away."); }
      }
    }
    // The Blender (DoBerryBlending: VAR_0x8004 the number of others blending; with one, the Blend Master if he's there).
    async function blending(api) {
      const others = Math.max(1, Math.min(3, +api.getVar("VAR_0x8004") || 1));
      const master = others === 1 && !env.flag("FLAG_HIDE_LILYCOVE_CONTEST_HALL_BLEND_MASTER");
      await env.say(["Starting up the BERRY BLENDER.", "Please select a BERRY from your BAG\nto put in the BERRY BLENDER."]);
      const berry = await env.chooseBerry();
      if (!berry) return;
      window.Player.removeItem(P(), berry, 1);
      const names = master ? ["MASTER"] : others === 1 ? ["MISTER"] : others === 2 ? ["LADDIE", "LASSIE"] : ["MISTER", "LADDIE", "LASSIE"];
      const theirs = npcBerries(berry, others, master);
      const players = [{ name: P().name, berry }].concat(names.map((nm, i) => ({ name: nm, berry: theirs[i], master })));
      const result = await env.blender(players);
      const rec = records(), k = players.length - 2;
      if (result.maxRPM > rec[k]) rec[k] = result.maxRPM;
      const block = blend(players.map((p) => p.berry), result.maxRPM, env.rand);
      const rpm = (result.maxRPM / 100).toFixed(2);
      await env.say(["RESULTS OF BLENDING: " + players.map((p) => p.name + ", " + env.itemName(p.berry)).join("; ") + ".", "Maximum speed: " + rpm + " RPM."]);
      if (blocks().length >= CASE_SIZE) { await env.say("Your POKéBLOCK CASE is full."); return; }
      blocks().push(block);
      env.fanfare("mus_obtain_item");
      await env.say([name(block) + " was made!", "Its level is " + level(block) + ", and its feel " + block.feel + "."]);
    }
    async function special(nm, api) {
      switch (nm) {
        case "GetFirstFreePokeblockSlot": { const i = blocks().length < CASE_SIZE ? blocks().length : 65535; api.setVar("VAR_RESULT", i); api.set(i); return true; }
        case "PlayerHasBerries": { const has = Object.keys(P().bag || {}).some((id) => /-berry$/.test(id) && window.Player.itemCount(P(), id) > 0) ? 1 : 0; api.setVar("VAR_RESULT", has); api.set(has); return true; }
        case "DoBerryBlending": await api.flush(); await blending(api); return true;
        case "ShowBerryBlenderRecordWindow": { const r = records(); await env.say("BERRY BLENDER MAXIMUM SPEED RECORDS\n2 PLAYERS: " + (r[0] / 100).toFixed(2) + " RPM   3 PLAYERS: " + (r[1] / 100).toFixed(2) + " RPM\n4 PLAYERS: " + (r[2] / 100).toFixed(2) + " RPM"); return true; }
        // (The favourite kind of block of the Pokémon VAR_0x8004 names, by its nature: in buffer 1; VAR_RESULT 0 for a nature with none.)
        case "GetPokeblockNameByMonNature": {
          const r = P().party[+api.getVar("VAR_0x8004")], t = r ? TASTE[r.nature] || TASTE.Hardy : TASTE.Hardy, i = t.indexOf(1);
          api.setBuffer(1, i >= 0 ? COLORS[i + 1].toUpperCase() + " POKéBLOCK" : "POKéBLOCK");
          api.setVar("VAR_RESULT", i >= 0 ? 1 : 0); api.set(i >= 0 ? 1 : 0);
          return true;
        }
        // (Lilycove's Pokémon Center lady: one block for her Pokémon, who likes a flavour of her own; VAR_0x8004 1 if it was that.)
        case "HasPlayerGivenContestLadyPokeblock": { const v = P().flags.hoennLadyPokeblock ? 1 : 0; api.setVar("VAR_RESULT", v); api.set(v); return true; }
        case "OpenPokeblockCaseForContestLady": {
          await api.flush();
          const i = await choose("Give which POKéBLOCK?");
          api.setVar("VAR_RESULT", i < 0 ? 65535 : i);
          if (i >= 0) {
            const b = blocks().splice(i, 1)[0], f = P().flags, fav = f.hoennLadyFlavor == null ? (f.hoennLadyFlavor = Math.floor(Math.random() * 5)) : f.hoennLadyFlavor;
            const best = FLAVORS.map((k) => b[k]).indexOf(level(b));
            api.setVar("VAR_0x8004", best === fav ? 1 : 0);
            api.setBuffer(1, name(b));
          }
          return true;
        }
        case "SetContestLadyGivenPokeblock": P().flags.hoennLadyPokeblock = true; return true;
        // (The Safari Zone's feeders: ui/game.js's safari puts a block out with these.)
        case "GetPokeblockFeederInFront": { const v = env.feederInFront ? env.feederInFront() : 65535; api.setVar("VAR_RESULT", v); return true; }
        case "OpenPokeblockCaseOnFeeder": {
          await api.flush();
          const i = await choose("Place which POKéBLOCK?");
          api.setVar("VAR_RESULT", i < 0 ? 65535 : i);
          if (i >= 0) { const b = blocks().splice(i, 1)[0]; api.setBuffer(1, name(b)); if (env.placeOnFeeder) env.placeOnFeeder(b); }
          return true;
        }
      }
      return false;
    }
    return { special, menu, choose, feed, blocks, conditions };
  }

  window.HoennPokeblock = { create, blend, name, level, gain, npcBerries, BERRIES, FLAVORS, CONDITIONS, COLORS, CASE_SIZE };
})();
