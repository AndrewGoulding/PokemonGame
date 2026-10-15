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

  // 2: TMs and HMs renumbered (Flash and Rock Smash became HMs; see game/bag.js).
  // 3: FireRed's PC: 14 boxes of 30 fixed slots (null where empty), with names
  //    and wallpapers.
  const VERSION = 3;
  const PARTY_SIZE = 6;
  const BOX_COUNT = 14;
  const BOX_SIZE = 30;
  const STARTING_MONEY = 3000;
  // The Exp. Share (Gen 6, party-wide) is a key item you start with, switched on,
  // and so is the Explorer Kit (for digging in cave walls).
  // No Poké Balls: as in FireRed, the first ones come from Prof. Oak with the Pokédex.
  const STARTING_BAG = { "exp-share": 1, "explorer-kit": 1 };
  const MAX_MONEY = 9999999;
  const MAX_ITEM_COUNT = 999;
  // The item storage in your PC starts with a Potion, as in FireRed.
  const STARTING_PC_ITEMS = { "potion": 1 };
  // Where a new game starts (in Pallet Town, outside Red's house) and where old
  // saves from before the overworld appear (the same spot).
  const NEW_GAME_LOCATION = { map: "PalletTown", x: 6, y: 8, facing: "down" };
  const OLD_SAVE_LOCATION = { map: "PalletTown", x: 6, y: 8, facing: "down" };
  const HOME = { map: "PalletTown_PlayersHouse_1F", x: 8, y: 5, facing: "up" };
  // Where you come back after blacking out: in front of each Pokémon Center's counter.
  const CENTERS = {
    ViridianCity_PokemonCenter_1F: { map: "ViridianCity_PokemonCenter_1F", x: 7, y: 4, facing: "up" },
    PewterCity_PokemonCenter_1F: { map: "PewterCity_PokemonCenter_1F", x: 7, y: 4, facing: "up" },
    Route4_PokemonCenter_1F: { map: "Route4_PokemonCenter_1F", x: 7, y: 4, facing: "up" },
    CeruleanCity_PokemonCenter_1F: { map: "CeruleanCity_PokemonCenter_1F", x: 7, y: 4, facing: "up" },
    VermilionCity_PokemonCenter_1F: { map: "VermilionCity_PokemonCenter_1F", x: 7, y: 4, facing: "up" }
  };

  // Prize money per trainer class: base x the level of the trainer's last Pokémon.
  const PRIZE_BASE = {
    "Youngster": 16, "Lass": 16, "Bug Catcher": 16, "Picnicker": 16, "Camper": 16, "Swimmer": 16,
    "Psychic": 32, "Sailor": 32, "Fisherman": 40, "Hiker": 40, "Engineer": 48, "Ace Trainer": 60, "Gentleman": 72, "Leader": 100
  };
  // Money lost on blacking out: highest party level x this, by badge count (Gen 6).
  const BLACKOUT_BASE = [8, 16, 24, 36, 48, 64, 80, 100, 120];

  // The player character: the custom one (sprites recoloured to match
  // assets/sprites/trainers/back/player_character.png). Red and Leaf aren't
  // playable: they're rivals in this game. A look lists its battle back sprite
  // and trainer-card picture (assets/sprites/trainers/), Oak's-speech portrait
  // (assets/intro/), and overworld sprites (assets/world/sprites/player_<look>*.png);
  // `girl` would pick FireRed's lines for girls (Mom, the Magikarp salesman).
  const LOOKS = {
    custom: { label: "Custom", back: "player_character", front: "player_character", speech: "oak-speech-player-character" }
  };
  const PLAYER_LOOK = "custom";
  // Saves from when you could play as Red or Leaf become the custom character.
  const lookOf = (look) => (LOOKS[look] ? look : PLAYER_LOOK);
  // Your rival's name, no longer chosen in Oak's speech.
  const RIVAL_NAME = "Gary";

  const emptyBox = () => new Array(BOX_SIZE).fill(null);
  const boxCount = (box) => box.filter(Boolean).length;
  const firstEmpty = (box) => box.findIndex((r) => !r);
  // Every Pokémon in the PC.
  const boxed = (player) => [].concat(...player.boxes).filter(Boolean);

  function create(name, look) {
    return {
      version: VERSION,
      name: String(name || "Red").slice(0, 12),
      look: lookOf(look),
      rival: RIVAL_NAME,
      location: Object.assign({}, NEW_GAME_LOCATION),
      money: STARTING_MONEY,
      party: [],
      boxes: Array.from({ length: BOX_COUNT }, emptyBox),
      boxNames: Array.from({ length: BOX_COUNT }, (_, i) => "BOX" + (i + 1)),
      // (FireRed's: FOREST, CITY, DESERT, SAVANNA, round again.)
      boxWallpapers: Array.from({ length: BOX_COUNT }, (_, i) => i % 4),
      bag: Object.assign({}, STARTING_BAG),
      pcItems: Object.assign({}, STARTING_PC_ITEMS),
      pokedex: { seen: [], caught: [] },
      badges: [],
      flags: {},
      repelSteps: 0,
      playTimeMs: 0,
      createdAt: Date.now(),
      trainerId: Math.floor(Math.random() * 65536),   // the ID No. on your Pokémon's summaries
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
  // (A new Pokémon is yours, met here at its level: its summary says so.)
  function receive(player, record) {
    markCaught(player, record.species);
    if (!record.ot) record.ot = { name: player.name, id: player.trainerId };
    if (!record.met) record.met = { level: record.level, map: player.location ? player.location.map : null };
    if (player.party.length < PARTY_SIZE) {
      player.party.push(record);
      return "party";
    }
    const i = player.boxes.findIndex((box) => firstEmpty(box) >= 0);
    if (i < 0) return null;
    player.boxes[i][firstEmpty(player.boxes[i])] = window.Party.heal(record);
    return "box " + (i + 1);
  }

  const healthy = (party) => party.filter((r) => r.hp > 0).length;

  // PC: party -> box (its first empty slot, or `slot`). Refuses to leave the
  // party without a healthy Pokémon.
  function deposit(player, partyIndex, boxIndex, slot) {
    const record = player.party[partyIndex];
    if (!record) return "There's no Pokémon there.";
    if (player.party.length <= 1) return "That's your last Pokémon!";
    if (record.hp > 0 && healthy(player.party) <= 1) return "You'd have no Pokémon left that can battle!";
    const box = player.boxes[boxIndex];
    const at = slot != null ? slot : firstEmpty(box);
    if (at < 0 || box[at]) return "That box is full.";
    player.party.splice(partyIndex, 1);
    box[at] = window.Party.heal(record);
    return null;
  }

  // PC: box -> party.
  function withdraw(player, boxIndex, slot) {
    const box = player.boxes[boxIndex];
    if (!box || !box[slot]) return "There's no Pokémon there.";
    if (player.party.length >= PARTY_SIZE) return "Your party is full.";
    player.party.push(box[slot]);
    box[slot] = null;
    return null;
  }

  // PC: a party Pokémon and a box Pokémon trade places. Refuses to leave the
  // party without a healthy Pokémon.
  function swapWithBox(player, partyIndex, boxIndex, slot) {
    const box = player.boxes[boxIndex];
    const out = player.party[partyIndex], into = box && box[slot];
    if (!out || !into) return "There's no Pokémon there.";
    const after = player.party.map((r, i) => (i === partyIndex ? into : r));
    if (!healthy(after)) return "You'd have no Pokémon left that can battle!";
    player.party[partyIndex] = into;
    box[slot] = window.Party.heal(out);
    return null;
  }

  // Pokémon in the PC are fully healed (as from Gen 4 on): each as it goes in.
  // (healBoxes catches any left hurt, e.g. from a save before this.)
  function healBoxes(player) {
    for (const box of player.boxes) for (const r of box) if (r) window.Party.heal(r);
  }

  function release(player, boxIndex, slot) {
    const box = player.boxes[boxIndex];
    if (!box || !box[slot]) return null;
    const r = box[slot];
    box[slot] = null;
    return r;
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

  // PC item storage: moves items between the bag and the PC.
  function depositItem(player, item, n) {
    if (!removeItem(player, item, n)) return false;
    player.pcItems[item] = Math.min(MAX_ITEM_COUNT, (player.pcItems[item] || 0) + n);
    return true;
  }

  function withdrawItem(player, item, n) {
    if ((player.pcItems[item] || 0) < n) return false;
    player.pcItems[item] -= n;
    if (player.pcItems[item] <= 0) delete player.pcItems[item];
    addItem(player, item, n);
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
    if (raw.shiny) r.shiny = true; else delete r.shiny;   // (not the fresh record's roll)
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

  // Item ids that changed since a save's version: old id -> new id.
  function renamedItems(version) {
    const out = { "tm94-oras": "tm99" };
    if ((version || 1) < 2) {
      // Version 1 had X and Y's TM01-TM100, TM101 Secret Power, HM05 Waterfall and HM07 Dive.
      for (let n = 71; n <= 101; n++) if (n !== 94) out["tm" + n] = "tm" + String(n - (n > 94 ? 2 : 1)).padStart(2, "0");
      Object.assign(out, { tm70: "hm05", tm94: "hm08", hm05: "hm07", hm07: "hm09" });
    }
    return out;
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
    // (Saves before version 3 had 8 boxes, packed from the start.)
    player.boxes = player.boxes.map((_, i) => {
      const box = emptyBox();
      ((data.boxes && data.boxes[i]) || []).slice(0, BOX_SIZE).forEach((r, j) => { if (r) box[j] = cleanRecord(r, warnings); });
      return box;
    });
    player.boxNames = player.boxNames.map((n, i) => (data.boxNames && data.boxNames[i] != null ? String(data.boxNames[i]).slice(0, 8) : n));
    player.boxWallpapers = player.boxWallpapers.map((w, i) => {
      const v = data.boxWallpapers && data.boxWallpapers[i];
      return Number.isInteger(v) && v >= 0 && v < 16 ? v : w;
    });
    player.bag = {};
    const RENAMED = renamedItems(data.version);
    for (const r of player.party.concat(boxed(player))) if (r.item) r.item = RENAMED[r.item] || r.item;
    for (let [item, n] of Object.entries(data.bag || {})) {
      item = RENAMED[item] || item;
      if (window.ITEMS[item] && n > 0) player.bag[item] = Math.min(MAX_ITEM_COUNT, n | 0);
    }
    // Everyone has the Explorer Kit, saves from before it too.
    player.bag["explorer-kit"] = 1;
    // Saves from before PC item storage get its starting Potion.
    player.pcItems = {};
    for (let [item, n] of Object.entries(data.pcItems || STARTING_PC_ITEMS)) {
      item = RENAMED[item] || item;
      if (window.ITEMS[item] && n > 0) player.pcItems[item] = Math.min(MAX_ITEM_COUNT, n | 0);
    }
    const dex = data.pokedex || {};
    for (const s of dex.seen || []) markSeen(player, s);
    for (const s of dex.caught || []) markCaught(player, s);
    player.badges = Array.isArray(data.badges) ? data.badges.slice() : [];
    player.flags = Object.assign({}, data.flags);
    // Saves from before key items: the Exp. Share, and Oak's Parcel if it's still to deliver.
    if (!player.bag["exp-share"]) player.bag["exp-share"] = 1;
    if (player.flags.oaksParcel && !player.flags.parcelDelivered) player.bag["oaks-parcel"] = 1;
    // Saves from before the Pokédex scene: Oak gave it with the parcel.
    if (player.flags.parcelDelivered && player.flags.pokedex === undefined) player.flags.pokedex = true;
    player.look = lookOf(data.look);
    player.rival = String(data.rival || RIVAL_NAME).slice(0, 12);
    let loc = data.location;
    const known = (m) => !window.WORLD_MAPS || !!window.WORLD_MAPS[m];
    // Saves made upstairs in a Poké Mart (its 2F is gone: the Move Relearner and
    // Deleter are upstairs in the Pokémon Centers now): just inside its door.
    const mart1F = loc && /_Mart_2F$/.test(loc.map) && loc.map.replace(/_2F$/, "");
    if (mart1F && window.WORLD_MAPS && window.WORLD_MAPS[mart1F]) {
      const door = window.WORLD_MAPS[mart1F].warps[0];
      loc = { map: mart1F, x: door.x, y: door.y - 1, facing: "up" };
    }
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
    player.repelSteps = Math.max(0, data.repelSteps | 0);
    player.playTimeMs = Math.max(0, +data.playTimeMs || 0);
    player.createdAt = data.createdAt || Date.now();
    // (Saves from before trainer IDs get one from when the game was started.)
    player.trainerId = data.trainerId != null ? data.trainerId & 0xffff : player.createdAt % 65536;
    player.savedAt = data.savedAt || null;
    return { player, warnings };
  }

  window.Player = {
    VERSION, LOOKS, PLAYER_LOOK, RIVAL_NAME, PARTY_SIZE, BOX_COUNT, BOX_SIZE, STARTING_MONEY, STARTING_BAG, STARTING_PC_ITEMS, NEW_GAME_LOCATION, HOME, CENTERS,
    create, markSeen, markCaught, hasCaught, receive, deposit, withdraw, swapWithBox, healBoxes, release, boxCount, firstEmpty, boxed,
    itemCount, addItem, removeItem, depositItem, withdrawItem, addMoney, prizeMoney, blackoutLoss, serialize, load
  };
})();
