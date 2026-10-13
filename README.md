# Pokémon Game

A browser Pokémon game built on a Gen 6 singles battle engine. Plain JavaScript,
no build step and no dependencies.

## Running it

Open `index.html` in a browser and start a **New game**: enter your name, pick
boy or girl, and you wake up in your bedroom in Pallet Town. Head to PROF. OAK's
lab (south of your house) and pick Bulbasaur, Squirtle or Charmander from the
Poké Balls on his table. Your rival takes the one that beats yours and battles
you on the way out. Then Route 1's tall grass, north of town, has FireRed's wild
Pokémon. Mom heals your party, and the PC in your bedroom stores items (there's a
Potion in it to start).

North of Route 1 is **Viridian City**. The Poké Mart clerk hands you Oak's
Parcel; take it back to PROF. OAK for five Poké Balls, and after that the Mart
sells to you and the old man lying across the road north gets up and shows you
how to catch Pokémon. The Pokémon Center's nurse heals your party (and is where
you return if you black out), and its PC holds both Pokémon and items. There's
also a move tutor who teaches Dream Eater once, a school and the Nickname house.
Route 2, Route 22 and the Gym (locked until you have seven badges) aren't built yet.

**Controls**: arrow keys or WASD to walk, hold Shift (or X) to run (indoors too), Z / Space /
Enter to talk or read signs, Esc or M for the menu. On a phone, use the D-pad
and A / Run / Menu buttons under the text box.

The **menu** has your Pokémon (tap one for its summary: stats, EVs, nature,
moves; make it lead; use, give or take items), the Bag (medicine, evolution
stones, Rare Candy, vitamins, PP Ups, mints, TMs/HMs, held items), the Pokédex,
your trainer card (save, download or load a save file), and **Services**: the
Pokémon Center, Poké Mart, PC and practice battles (a wild Pokémon or a trainer
at your level), which move into real towns as the map grows.

In battle you can fight, use items from the Bag, switch, and in wild battles
throw balls or run. Pokémon gain experience and EVs, level up mid-battle, learn
moves and evolve afterwards. Click the text box (or press Space) to skip ahead.

**Saving**: the game saves automatically to this browser (including where you
are on the map) after every battle, story event and menu change, and
**Continue** picks up where you left off. Saves from before the overworld put
you outside your house in Pallet Town. Browser storage can be wiped (private windows, clearing site data), so
download a save file from the trainer card as a backup, or to move a game to
another browser.

To run the tests (needs Node.js):

```sh
npm test
```

## Overworld maps

The maps are FireRed's, converted from the [pret/pokefirered](https://github.com/pret/pokefirered)
decompilation: Pallet Town, the player's house (both floors), the rival's house,
PROF. OAK's lab, Route 1, and Viridian City with its Pokémon Center (both
floors), Poké Mart, school and Nickname house. Tiles, palettes and metatiles come from
`assets/tilesets/`; layouts, doors, signs, people, their text and wild Pokémon
come from a pokefirered checkout. `tools/build-maps.js` turns them into
`data/world-maps.js` and the images in `assets/world/`:

```sh
git clone --depth 1 --filter=blob:none --sparse https://github.com/pret/pokefirered
cd pokefirered && git sparse-checkout set --no-cone data/layouts/ data/maps/ data/text/ data/scripts/ \
  data/event_scripts.s src/data/object_events/ src/data/wild_encounters.json graphics/object_events/pics/ && cd ..
node tools/build-maps.js pokefirered     # or: POKEFIRERED=pokefirered npm run build:maps
```

To add maps, list them in `MAPS` at the top of `tools/build-maps.js` and rerun
it; doors and map edges connect themselves when both sides are built.
Walking off an edge toward a map that isn't built yet says so.

Rules follow Gen 3: collision and elevation per block, solid doors you walk
into, door mats you walk out through, stairs, ledges you can jump down,
connected maps you walk straight into, and tall grass encounters at the map's
rate (Random() % 2880 < rate × 16) using the 20/20/10/10/10/10/5/5/4/4/1/1
encounter slots. Signs and people say their FireRed text (with names in normal
case: "Viridian City", not "VIRIDIAN CITY"), and item balls give their item.
Scripted events (Mom healing, the PCs, the starter Poké Balls, OAK stopping you
at the edge of town, the rival battle, the Route 1 Potion, Oak's Parcel, the
Viridian old man, the nurse, the move tutor) are in `ui/game.js`; their FireRed
lines come from `window.WORLD_TEXT`, which the converter writes alongside the maps.

## Progression rules (Gen 6)

- **Experience**: the six growth curves, and base exp × level / 7 split between
  the Pokémon that battled, ×1.5 from trainers and with a Lucky Egg. Catching a
  Pokémon also gives experience. EVs come from the defeated species' yield.
- **Catching**: the Gen 6 formula (HP, catch rate, ball and status bonuses,
  four shake checks). Poké, Great, Ultra, Master, Net, Nest, Repeat, Timer,
  Quick and Dusk Balls have their bonuses. No critical captures yet.
- **Running**: always escapes if faster; otherwise speed × 128 / foe speed +
  30 per attempt, out of 256.
- **Evolution**: `data/evolutions.js`, generated from Pokémon Showdown's Gen 6
  data by `npm run build:evolutions` (needs `npm install` first). Level,
  friendship (220+), time of day, held item, known move, gender, party and
  stat conditions all work. Stone and trade evolutions are in the data but
  need the bag and trading, which come later. A few conditions this game can't
  model yet (Moss Rock, magnetic fields, rain, an upside-down console) are
  swapped for the nearest playable rule; each has a `note` explaining it.

- **Items**: Gen 6 effects for potions and drinks, status cures, Revives, PP
  restores, vitamins (10 EVs each, up to 100) and Rare Candy. In battle, using
  an item takes your turn and happens before moves.
- **TMs and HMs**: X and Y's TM01–TM100 and HM01–HM05, plus what Omega Ruby
  and Alpha Sapphire added: Secret Power as TM101 (it's ORAS's TM94, but X and
  Y's TM94 is Rock Smash) and HM07 Dive. ORAS's HM06 is Rock
  Smash again, so it's left out. Compatibility comes from the Gen 6
  learnsets. TMs are reusable (as in Gen 5+), can't be held, tossed or sold,
  and HM moves can be forgotten like any other (there are no field moves yet).
  The Poké Mart sells them: HMs ₽3,000 from level 10; TMs ₽10,000 / ₽20,000 /
  ₽30,000 by the move's power, from levels 15 / 25 / 40.
- **PP Up / PP Max**: +20% of a move's base PP per PP Up, three at most (PP
  Max goes straight to three). Tracked per move; a forgotten move loses them.
- **Mints** (from Sword and Shield): all 21. A mint changes the Pokémon's
  nature to the mint's, replacing the old one (unlike Sword and Shield, where
  only the stats change). ₽20,000 each from level 30.
- **Money**: trainers pay their class's base payout × their last Pokémon's
  level. Blacking out costs your highest level × 8 (more with badges). Buying
  10+ Poké Balls at once gets a free Premier Ball.

## Layout

| Path | Contents |
|---|---|
| `data/` | Pokédex, moves, abilities, items, item sprite paths, learnsets, evolutions, overworld maps, natures, type chart, plus the battle hooks for conditions and moves |
| `engine/` | Stat, damage, experience, catch and item formulas, and the battle engine |
| `game/` | Game logic around the engine: party records, the player and their save (`player.js`, `save.js`), bag and Poké Mart (`bag.js`), overworld rules (`world.js`), evolution, encounters, random teams and the opponent AI |
| `ui/` | Text box and menus (`screen.js`), the battle screen, the overworld (`overworld.js`), and the game flow, story events and menus (`game.js`) |
| `tools/` | Data generators (`npm run build:evolutions`, `npm run build:item-sprites`, `npm run build:maps`) |
| `assets/sprites/` | Pokémon sprites (front, back, shiny), item icons, trainer and overworld sprites |
| `assets/tilesets/` | FireRed's tilesets (tiles, palettes, metatiles), the source for the maps |
| `assets/world/` | Generated map images and transparent overworld sprites |
| `tests/` | Loads every non-UI script and checks formulas, engine regressions, progression rules and AI choices, plus 200 random battles |

## Script load order

Every file sets a global on `window` (for example `window.DEX` or `window.Battle`),
and later files read those globals, so scripts must load in this order:

1. `data/type-chart.js` → `TYPE_CHART`
2. `data/natures.js` → `NATURES`
3. `data/dex.js` → `DEX`
4. `data/moves.js` → `MOVES`
5. `data/abilities.js` → `ABILITIES`
6. `data/items.js` → `ITEMS`
7. `data/learnsets.js` → `LEARNSETS_GEN6`
8. `data/evolutions.js` → `EVOLUTIONS`
9. `data/item-sprites.js` → `ITEM_SPRITES`
10. `data/world-maps.js` → `WORLD_MAPS`
11. `engine/stat-calculator.js` → `Stats`
12. `engine/experience.js` → `Experience`
13. `engine/catching.js` → `Catching`
14. `engine/item-use.js` → `ItemUse`
15. `engine/damage-calculator.js` → `Damage`
16. `data/conditions.js` → `CONDITIONS`, `ITEM_EFFECTS`
17. `data/battle-moves.js` → `BATTLE_MOVE_EFFECTS`
18. `engine/battle.js` → `Battle`
19. `game/random-team.js` → `RandomTeam`
20. `game/opponent-ai.js` → `OpponentAI`
21. `game/party.js` → `Party`
22. `game/evolution.js` → `Evolution`
23. `game/encounters.js` → `Encounters`
24. `game/player.js` → `Player`
25. `game/bag.js` → `Bag`
26. `game/save.js` → `Save`
27. `game/world.js` → `World`
28. `ui/screen.js` → `Screen`
29. `ui/battle-screen.js` → `BattleScreen`
30. `ui/overworld.js` → `Overworld`
31. `ui/game.js` → `Game` (starts the game on load)

`index.html` is the source of truth for this order, and the smoke test reads its
script list from there (skipping `ui/`, which needs a real page). If you add a
script, add it to `index.html`.

## Using the battle engine

```js
const battle = new Battle({
  seed: 1234,
  p1: { name: "Ash", team: [{ species: "Garchomp", level: 50, nature: "Jolly",
                              moves: ["Earthquake", "Outrage"] }] },
  p2: { name: "Gary", team: [{ species: "Pikachu", level: 50, moves: ["Thunderbolt"] }] }
});
battle.start();
battle.getRequest("p1");                         // what p1 may do right now
battle.choose("p1", { type: "move", move: 0 });  // move slot index or move name
battle.choose("p2", { type: "switch", index: 1 });
battle.events.map(Battle.formatEvent);           // readable battle log
```

For progression, pass `exp: true` (p1 earns experience) and `wild: true` (p1 may
also choose `{ type: "ball", ball: "great-ball" }` or `{ type: "run" }`). Team sets
can carry saved `hp`, `status`, `pp` and `exp`. See the header comment in
`engine/battle.js` for the full API.
