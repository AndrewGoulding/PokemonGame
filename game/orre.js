// Orre, from Pokémon Colosseum: so far the Outskirt Stand (data/orre-maps.js),
// where the game opens, reached from the debug menu. In Orre you're Wes,
// with his Espeon and Umbreon: going there puts your own name, look, party,
// Bag, money and trainer ID away (player.flags.orreStash) and brings out
// Wes's (player.flags.orreWes, kept from one visit to the next); leaving
// swaps them back.
// Depends on: window.WORLD_MAPS, window.Party.
//
//   Orre.inOrre(location)            // an Orre map
//   Orre.enter(player)               // become Wes, at the start of the opening (or where he was)
//   Orre.leave(player, location)     // back to yourself, where you were (or `location`)
//   Orre.visible(person, flags)      // ui/game.js's visible() for Orre's people (or undefined)
//   Orre.patches(map, flags)         // the Stand's patches on now (the truck parked)
//   Orre.willieTeam()                // Rider Willie's two Zigzagoon
//   Orre.SHOP                        // what the Stand's bar sells, once Willie's been beaten
//
// The opening's progress is player.flags.orre:
//   0 / undefined  Wes rides in from the desert
//   1              parked; Folly and Trudly's truck by the Stand
//   2              they've driven off with their sack
//   3              Willie's battled (he points Wes to Phenac City; the bar sells)
(function () {
  "use strict";

  // The south edge of the clearing, where Wes rides in; where he parks.
  const START = { map: "OutskirtStand", x: 18, y: 23, facing: "up" };
  const PARKED = { x: 17, y: 13 };
  const WES = { name: "Wes", look: "wes", money: 3000, trainerId: 10071 };
  // His partners at the start of Colosseum.
  const WES_TEAM = [
    ["Espeon", 25, ["Confusion", "Return", "Reflect", "Helping Hand"], "Synchronize"],
    ["Umbreon", 26, ["Bite", "Secret Power", "Taunt", "Snatch"], "Synchronize"]
  ];
  // (No Escape Rope: it would take Wes to Kanto.)
  const SHOP = ["poke-ball", "great-ball", "potion", "super-potion", "antidote", "paralyze-heal", "awakening", "repel"];

  const inOrre = (loc) => {
    const m = loc && window.WORLD_MAPS && window.WORLD_MAPS[loc.map];
    return !!(m && m.region === "orre");
  };
  const copy = (x) => JSON.parse(JSON.stringify(x));

  function wesParty() {
    return WES_TEAM.map(([species, level, moves, ability]) => {
      const r = window.Party.create(species, level, { moves });
      r.ability = ability;
      r.gender = "M";
      r.happiness = 255;
      return r;
    });
  }

  function enter(player) {
    if (inOrre(player.location)) return;
    const f = player.flags;
    f.orreStash = copy({ name: player.name, look: player.look, party: player.party, bag: player.bag,
      money: player.money, trainerId: player.trainerId, location: player.location, avatar: f.avatar });
    const wes = f.orreWes || { party: wesParty(), bag: {}, money: WES.money, location: START };
    player.name = WES.name;
    player.look = WES.look;
    player.trainerId = WES.trainerId;
    player.party = copy(wes.party);
    player.bag = copy(wes.bag);
    player.money = wes.money;
    player.location = Object.assign({}, wes.location);
    delete f.avatar;
  }

  function leave(player, location) {
    const f = player.flags, s = f.orreStash;
    if (!s) return;
    f.orreWes = copy({ party: player.party, bag: player.bag, money: player.money,
      location: inOrre(player.location) ? player.location : START });
    player.name = s.name;
    player.look = s.look;
    player.trainerId = s.trainerId;
    player.party = s.party;
    player.bag = s.bag;
    player.money = s.money;
    player.location = Object.assign({}, location || s.location);
    if (s.avatar) f.avatar = s.avatar; else delete f.avatar;
    delete f.orreStash;
  }

  const ID = (k) => "LOCALID_ORRE_" + k;
  function visible(person, flags) {
    const step = flags.orre | 0;
    switch (person.localId) {
      case ID("TRUCK"): return step < 2;
      case ID("BIKE"): return step >= 1;
      case ID("FOLLY"): case ID("TRUDLY"): case ID("WILLIE"): return false;   // (only in their scenes)
      case ID("DINER_WILLIE"): return step < 3;
      default: return undefined;
    }
  }
  const patches = (map, flags) => (map === "OutskirtStand" && (flags.orre | 0) < 2 ? ["truck"] : []);

  // Rider Willie's two Zigzagoon (Lv. 23 and 24).
  const willieTeam = () => [window.Party.create("Zigzagoon", 23), window.Party.create("Zigzagoon", 24)];

  window.Orre = { START, PARKED, WES, WES_TEAM, SHOP, inOrre, enter, leave, visible, patches, willieTeam, wesParty };
})();
