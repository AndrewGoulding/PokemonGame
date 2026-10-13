// The player's save data: party, PC boxes, bag, money, Pokédex, badges, flags
// Depends on: window.DEX, window.MOVES, window.ITEMS, window.Party
//
//   const player = Player.create("Red");
//   Player.receive(player, record);          // party if there's room, else the PC
//   const text = Player.serialize(player);   // JSON string for saving
//   const { player, warnings } = Player.load(JSON.parse(text));
//
// Everything in here is plain JSON so it saves as-is. Load() fills in fields
// added by later versions and drops anything it can't make sense of, so an old
// or hand-edited save still loads.

(function () {
  "use strict";

  const VERSION = 1;
  const PARTY_SIZE = 6;
  const BOX_COUNT = 8;
  const BOX_SIZE = 30;
  const STARTING_MONEY = 3000;
  const STARTING_BAG = { "poke-ball": 5, "potion": 3 };
  const MAX_MONEY = 9999999;
  const MAX_ITEM_COUNT = 999;
  // Where a new game starts (your bedroom) and where old saves from before the
  // overworld appear (outside your house).
  const NEW_GAME_LOCATION = { map: "PalletTown_PlayersHouse_2F", x: 6, y: 6, facing: "down" };
  const OLD_SAVE_LOCATION = { map: "PalletTown", x: 6, y: 8, facing: "down" };
  const HOME = { map: "PalletTown_PlayersHouse_1F", x: 8, y: 5, facing: "up" };

  // Prize money per trainer class: base x the level of the trainer's last Pokémon.
  const PRIZE_BASE = {
    "Youngster": 16, "Lass": 16, "Bug Catcher": 16, "Picnicker": 16, "Camper": 16, "Swimmer": 16,
    "Psychic": 32, "Fisherman": 40, "Hiker": 40, "Ace Trainer": 60
  };
  // Money lost on blacking out: highest party level x this, by badge count (Gen 6).
  const BLACKOUT_BASE = [8, 16, 24, 36, 48, 64, 80, 100, 120];

  function create(name, look) {
    return {
      version: VERSION,
      name: String(name || "Red").slice(0, 12),
      look: look === "green" ? "green" : "red",
      rival: "Blue",
      location: Object.assign({}, NEW_GAME_LOCATION),
      money: STARTING_MONEY,
      party: [],
      boxes: Array.from({ length: BOX_COUNT }, () => []),
      bag: Object.assign({}, STARTING_BAG),
      pokedex: { seen: [], caught: [] },
      badges: [],
      flags: {},
      playTimeMs: 0,
      createdAt: Date.now(),
      savedAt: null
    };
  }

  // ---------- Pokémon ----------

  function markSeen(player, species) {
    if (window.DEX[species] && !player.pokedex.seen.includes(species)) player.pokedex.seen.push(species);
  }
  function markCaught(player, species) {
    markSeen(player, species);
    if (window.DEX[species] && !player.pokedex.caught.includes(species)) player.pokedex.caught.push(species);
  }
  const hasCaught = (player, species) => player.pokedex.caught.includes(species);

  // Adds a Pokémon to the party, or the first PC box with room.
  // Returns "party", "box N" (1-based) or null if everything is full.
  function receive(player, record) {
    markCaught(player, record.species);
    if (player.party.length < PARTY_SIZE) {
      player.party.push(record);
      return "party";
    }
    const i = player.boxes.findIndex((box) => box.length < BOX_SIZE);
    if (i < 0) return null;
    player.boxes[i].push(record);
    return "box " + (i + 1);
  }

  const healthy = (party) => party.filter((r) => r.hp > 0).length;

  // PC: party -> box. Refuses to leave the party without a healthy Pokémon.
  function deposit(player, partyIndex, boxIndex) {
    const record = player.party[partyIndex];
    if (!record) return "There's no Pokémon there.";
    if (player.party.length <= 1) return "That's your last Pokémon!";
    if (record.hp > 0 && healthy(player.party) <= 1) return "You'd have no Pokémon left that can battle!";
    if (player.boxes[boxIndex].length >= BOX_SIZE) return "That box is full.";
    player.party.splice(partyIndex, 1);
    player.boxes[boxIndex].push(record);
    return null;
  }

  // PC: box -> party.
  function withdraw(player, boxIndex, slot) {
    const box = player.boxes[boxIndex];
    if (!box || !box[slot]) return "There's no Pokémon there.";
    if (player.party.length >= PARTY_SIZE) return "Your party is full.";
    player.party.push(box.splice(slot, 1)[0]);
    return null;
  }

  function release(player, boxIndex, slot) {
    const box = player.boxes[boxIndex];
    if (!box || !box[slot]) return null;
    return box.splice(slot, 1)[0];
  }

  // ---------- Bag and money ----------

  const itemCount = (player, item) => player.bag[item] || 0;

  function addItem(player, item, n) {
    player.bag[item] = Math.min(MAX_ITEM_COUNT, itemCount(player, item) + (n == null ? 1 : n));
  }

  function removeItem(player, item, n) {
    n = n == null ? 1 : n;
    if (itemCount(player, item) < n) return false;
    player.bag[item] -= n;
    if (player.bag[item] <= 0) delete player.bag[item];
    return true;
  }

  function addMoney(player, amount) {
    player.money = Math.max(0, Math.min(MAX_MONEY, player.money + Math.floor(amount)));
  }

  function prizeMoney(trainerName, team) {
    const cls = String(trainerName).split(" ").slice(0, -1).join(" ");
    const last = team[team.length - 1];
    return (PRIZE_BASE[cls] || 16) * (last ? last.level : 1);
  }

  function blackoutLoss(player) {
    const highest = Math.max(1, ...player.party.map((r) => r.level));
    const base = BLACKOUT_BASE[Math.min(player.badges.length, BLACKOUT_BASE.length - 1)];
    return Math.min(player.money, highest * base);
  }

  // ---------- Saving ----------

  function serialize(player) {
    return JSON.stringify(player);
  }

  // A party record from a save: fix what can be fixed, or null if unusable.
  function cleanRecord(raw, warnings) {
    if (!raw || !window.DEX[raw.species]) {
      warnings.push("Dropped an unknown Pokémon (" + (raw && raw.species) + ").");
      return null;
    }
    const fresh = window.Party.create(raw.species, Math.max(1, Math.min(100, raw.level | 0 || 1)));
    const r = Object.assign(fresh, raw);
    r.level = Math.max(1, Math.min(100, r.level | 0 || 1));
    r.exp = Math.max(+r.exp || 0, window.Experience.expForLevel(window.Experience.growthRate(r.species), r.level));
    r.moves = (Array.isArray(raw.moves) ? raw.moves : [])
      .filter((m) => m && window.MOVES[m.name])
      .slice(0, 4)
      .map((m) => {
        const slot = { name: m.name, pp: 0 };
        const ups = Math.max(0, Math.min(3, m.ppUps | 0));
        if (ups) slot.ppUps = ups;
        slot.pp = Math.max(0, Math.min(window.Party.maxPp(slot), m.pp | 0));
        return slot;
      });
    if (!r.moves.length) r.moves = fresh.moves.length ? fresh.moves : [{ name: "Tackle", pp: 35 }];
    r.evs = Object.assign({}, raw.evs);
    r.ivs = Object.assign({}, fresh.ivs, raw.ivs);
    r.hp = Math.max(0, Math.min(window.Party.maxHp(r), r.hp | 0));
    if (r.item && !window.ITEMS[r.item]) r.item = "";
    // Saves from before mints replaced the nature kept it separately.
    if (r.mint) {
      if (window.NATURES[r.mint]) r.nature = r.mint;
      delete r.mint;
    }
    if (!window.NATURES[r.nature]) r.nature = fresh.nature;
    return r;
  }

  // Turns parsed save data into a player, upgrading older versions.
  // Returns { player, warnings }; throws if it isn't a save at all.
  function load(data) {
    if (!data || typeof data !== "object" || !Array.isArray(data.party)) throw new Error("This isn't a Pokémon save.");
    if (data.version > VERSION) throw new Error("This save is from a newer version of the game.");
    const warnings = [];
    const player = create(data.name);
    player.money = Math.max(0, Math.min(MAX_MONEY, data.money | 0));
    player.party = data.party.map((r) => cleanRecord(r, warnings)).filter(Boolean).slice(0, PARTY_SIZE);
    player.boxes = player.boxes.map((_, i) =>
      ((data.boxes && data.boxes[i]) || []).map((r) => cleanRecord(r, warnings)).filter(Boolean).slice(0, BOX_SIZE));
    player.bag = {};
    const RENAMED = { "tm94-oras": "tm101" };   // items whose ids changed
    for (let [item, n] of Object.entries(data.bag || {})) {
      item = RENAMED[item] || item;
      if (window.ITEMS[item] && n > 0) player.bag[item] = Math.min(MAX_ITEM_COUNT, n | 0);
    }
    const dex = data.pokedex || {};
    for (const s of dex.seen || []) markSeen(player, s);
    for (const s of dex.caught || []) markCaught(player, s);
    player.badges = Array.isArray(data.badges) ? data.badges.slice() : [];
    player.flags = Object.assign({}, data.flags);
    player.look = data.look === "green" ? "green" : "red";
    player.rival = String(data.rival || "Blue").slice(0, 12);
    const loc = data.location;
    const known = (m) => !window.WORLD_MAPS || !!window.WORLD_MAPS[m];
    if (loc && known(loc.map)) {
      player.location = { map: loc.map, x: loc.x | 0, y: loc.y | 0, facing: loc.facing || "down" };
    } else {
      // A save from before the overworld: the story so far is done.
      player.location = Object.assign({}, OLD_SAVE_LOCATION);
      if (player.party.length && !player.flags.starter) {
        player.flags.starter = player.party[0].species;
        player.flags.rivalLabBattle = true;
      }
    }
    player.playTimeMs = Math.max(0, +data.playTimeMs || 0);
    player.createdAt = data.createdAt || Date.now();
    player.savedAt = data.savedAt || null;
    return { player, warnings };
  }

  window.Player = {
    VERSION, PARTY_SIZE, BOX_COUNT, BOX_SIZE, STARTING_MONEY, STARTING_BAG, NEW_GAME_LOCATION, HOME,
    create, markSeen, markCaught, hasCaught, receive, deposit, withdraw, release,
    itemCount, addItem, removeItem, addMoney, prizeMoney, blackoutLoss, serialize, load
  };
})();
