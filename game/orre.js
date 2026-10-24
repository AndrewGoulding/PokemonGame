// Orre, from Pokémon Colosseum: so far the Orre Air Strip, where Prof. Oak's
// plane sets you down, Team Snagem's hideout and the Outskirt Stand
// (data/orre-maps.js). As in Colosseum, you go from place to place on the map
// of Orre that comes up as you leave one.
// You're yourself there, with your own Pokémon (an older save made while you
// were Wes, as Orre had you be at first, still swaps back as you leave:
// player.flags.orreStash).
// Depends on: window.WORLD_MAPS, window.Party.
//
//   Orre.inOrre(location)            // an Orre map
//   Orre.enter(player, to)           // off to Orre: the Air Strip (or `to`); where you were is kept
//   Orre.leave(player, location)     // back from Orre, where you were (or `location`)
//   Orre.PLACES, Orre.openPlaces(flags)  // the places on Orre's map; those you can go to
//   Orre.unlock(flags, map)          // a place opens on the map
//   Orre.visible(person, flags)      // ui/game.js's visible() for Orre's people (or undefined)
//   Orre.patches(map, flags)         // the Stand's patches on now (the truck parked)
//   Orre.willieTeam()                // Rider Willie's two Zigzagoon
//   Orre.SHOP                        // what the Stand's bar sells, once Willie's been beaten
//
// The opening's progress is player.flags.orre:
//   0 / undefined  not yet at the Outskirt Stand (Folly and Trudly's truck by it)
//   1              arrived from the Air Strip, and they've come out of the diner
//   2              they've driven off with their sack
//   3              Willie's battled (he points you to Phenac City; the bar sells)
(function () {
  "use strict";

  // Where the plane sets you down: by its door at the Air Strip. (And the south edge of the Stand's clearing, where
  // Wes rode in, and where he parked: an older save's.)
  const START = { map: "OrreAirStrip", x: 17, y: 12, facing: "down" };
  const WES_START = { map: "OutskirtStand", x: 18, y: 23, facing: "up" };
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

  function enter(player, to) {
    if (inOrre(player.location)) return;
    player.flags.orreReturn = copy(player.location);
    player.location = Object.assign({}, to || START);
  }
  // (As Wes: an older save's way in, kept for its tests and saves.)
  function enterAsWes(player) {
    if (inOrre(player.location)) return;
    const f = player.flags;
    f.orreStash = copy({ name: player.name, look: player.look, party: player.party, bag: player.bag,
      money: player.money, trainerId: player.trainerId, location: player.location, avatar: f.avatar });
    const wes = f.orreWes || { party: wesParty(), bag: {}, money: WES.money, location: WES_START };
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
    if (!s) {
      if (inOrre(player.location) || location) player.location = Object.assign({}, location || f.orreReturn || { map: "PalletTown", x: 16, y: 14, facing: "down" });
      delete f.orreReturn;
      return;
    }
    f.orreWes = copy({ party: player.party, bag: player.bag, money: player.money,
      location: inOrre(player.location) ? player.location : WES_START });
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

  // Orre's map (ui/game.js's orreWorldMap): its places, where each is on the map (pixels of
  // assets/town-map/orre.png, 240 by 160) and where you come in (by its way out). At first only
  // the Air Strip and Team Snagem's hideout are open (player.flags.orreMap lists the rest as
  // they open); a save that's been to the Outskirt Stand has that too.
  const PLACES = [
    { map: "SnagemHideout", name: "Snagem Hideout", x: 196, y: 60, arrive: { x: 12, y: 18, facing: "up" } },
    { map: "OutskirtStand", name: "Outskirt Stand", x: 72, y: 110, arrive: { x: 18, y: 22, facing: "up" } },
    { map: "PhenacCity", name: "Phenac City", x: 108, y: 86, arrive: { x: 19, y: 34, facing: "up" } },
    { map: "OrreAirStrip", name: "Orre Air Strip", x: 96, y: 132, arrive: { x: 21, y: 2, facing: "down" } }
  ];
  const OPEN_AT_FIRST = ["OrreAirStrip", "SnagemHideout"];
  const isOpen = (flags, map) => OPEN_AT_FIRST.includes(map) || (flags.orreMap || []).includes(map) || (map === "OutskirtStand" && (flags.orre | 0) > 0);
  const openPlaces = (flags) => PLACES.filter((p) => isOpen(flags, p.map));
  function unlock(flags, map) {
    if (isOpen(flags, map)) return false;
    (flags.orreMap = flags.orreMap || []).push(map);
    return true;
  }

  const ID = (k) => "LOCALID_ORRE_" + k;
  function visible(person, flags) {
    const step = flags.orre | 0;
    switch (person.localId) {
      case ID("TRUCK"): return step < 2;
      case ID("BIKE"): return false;   // (Wes's, parked: you came on foot, from the Air Strip)
      case ID("FOLLY"): case ID("TRUDLY"): case ID("WILLIE"): return false;   // (only in their scenes)
      case ID("DINER_WILLIE"): return step < 3;
      default: return undefined;
    }
  }
  const patches = (map, flags) => (map === "OutskirtStand" && (flags.orre | 0) < 2 ? ["truck"] : []);

  // Rider Willie's two Zigzagoon (Lv. 23 and 24).
  const willieTeam = () => [window.Party.create("Zigzagoon", 23), window.Party.create("Zigzagoon", 24)];

  window.Orre = { PLACES, openPlaces, isOpen, unlock, START, WES_START, PARKED, WES, WES_TEAM, SHOP, inOrre, enter, enterAsWes, leave, visible, patches, willieTeam, wesParty };
})();
