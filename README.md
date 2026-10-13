# Pokémon Game

A browser Pokémon game built on a Gen 6 singles battle engine. Plain JavaScript,
no build step and no dependencies.

## Running it

Open `index.html` in a browser. Start a **New game**, enter your name and pick
Bulbasaur, Charmander or Squirtle. You start with ₽3,000, five Poké Balls and
three Potions. From the party screen:

- **Find a wild Pokémon**: battle it, catch it from the **Bag**, or **Run**.
- **Battle a trainer**: 1–3 Pokémon around your level, using the opponent AI.
  Winning pays prize money; blacking out costs some.
- **Pokémon Center**: heal everything.
- **Poké Mart**: buy and sell items. Stock grows as your strongest Pokémon
  levels up (standing in for gym badges until there's a map).
- **Bag**: items by pocket. Use medicine, evolution stones, Rare Candy and
  vitamins on your Pokémon, give them held items, or toss items.
- **PC**: 8 boxes of 30. Deposit, withdraw and release.
- **Pokédex**: every Pokémon you've seen or caught.
- **Trainer card**: money, Pokédex, play time; save, download a save file, or
  load one.

Tap a Pokémon on the party screen for its summary (stats, EVs, nature, moves),
to make it lead, or to use, give or take an item. In battle, the Bag also has
your medicine. Click the text box (or press Space) to skip ahead.

**Saving**: the game saves automatically to this browser after every battle
and every change on the party screen, and **Continue** picks up where you left
off. Browser storage can be wiped (private windows, clearing site data), so
download a save file from the trainer card as a backup, or to move a game to
another browser.

To run the tests (needs Node.js):

```sh
npm test
```

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
- **Money**: trainers pay their class's base payout × their last Pokémon's
  level. Blacking out costs your highest level × 8 (more with badges). Buying
  10+ Poké Balls at once gets a free Premier Ball.

## Layout

| Path | Contents |
|---|---|
| `data/` | Pokédex, moves, abilities, items, item sprite paths, learnsets, evolutions, natures, type chart, plus the battle hooks for conditions and moves |
| `engine/` | Stat, damage, experience, catch and item formulas, and the battle engine |
| `game/` | Game logic around the engine: party records, the player and their save (`player.js`, `save.js`), bag and Poké Mart (`bag.js`), evolution, encounters, random teams and the opponent AI |
| `ui/` | Text box and menus (`screen.js`), the battle screen, and the game flow and menus (`game.js`) |
| `tools/` | Data generators (`npm run build:evolutions`, `npm run build:item-sprites`) |
| `assets/sprites/` | Pokémon sprites (front, back, shiny) and item icons |
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
10. `engine/stat-calculator.js` → `Stats`
11. `engine/experience.js` → `Experience`
12. `engine/catching.js` → `Catching`
13. `engine/item-use.js` → `ItemUse`
14. `engine/damage-calculator.js` → `Damage`
15. `data/conditions.js` → `CONDITIONS`, `ITEM_EFFECTS`
16. `data/battle-moves.js` → `BATTLE_MOVE_EFFECTS`
17. `engine/battle.js` → `Battle`
18. `game/random-team.js` → `RandomTeam`
19. `game/opponent-ai.js` → `OpponentAI`
20. `game/party.js` → `Party`
21. `game/evolution.js` → `Evolution`
22. `game/encounters.js` → `Encounters`
23. `game/player.js` → `Player`
24. `game/bag.js` → `Bag`
25. `game/save.js` → `Save`
26. `ui/screen.js` → `Screen`
27. `ui/battle-screen.js` → `BattleScreen`
28. `ui/game.js` → `Game` (starts the game on load)

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
