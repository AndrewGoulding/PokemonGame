# Pokémon Game

A browser Pokémon game built on a Gen 6 singles battle engine. Plain JavaScript,
no build step and no dependencies.

## Running it

Open `index.html` in a browser. Pick Bulbasaur, Charmander or Squirtle, then
from the party screen:

- **Find a wild Pokémon**: battle it, throw balls from the **Bag** to catch it,
  or **Run**. Wild Pokémon are a little below your strongest Pokémon's level.
- **Battle a trainer**: 1–3 Pokémon around your level, using the opponent AI
  (`game/opponent-ai.js`). Trainer battles give 1.5× experience.
- **Pokémon Center**: heal everything.

Pokémon gain experience and EVs, level up mid-battle, learn level-up moves
(choosing one to forget when they already know four) and evolve after battle;
press **Stop** to cancel an evolution. Tap a party card to make that Pokémon
lead. Click the text box (or press Space) to skip ahead.

Progress isn't saved yet, so reloading starts a new game.

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

## Layout

| Path | Contents |
|---|---|
| `data/` | Pokédex, moves, abilities, items, learnsets, evolutions, natures, type chart, plus the battle hooks for conditions and moves |
| `engine/` | Stat, damage, experience and catch formulas, and the battle engine |
| `game/` | Game logic around the engine: party records (`party.js`), evolution, wild and trainer encounters, random teams and the opponent AI |
| `ui/` | Text box and menus (`screen.js`), the battle screen, and the game flow (`game.js`) |
| `tools/` | Data generators |
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
9. `engine/stat-calculator.js` → `Stats`
10. `engine/experience.js` → `Experience`
11. `engine/catching.js` → `Catching`
12. `engine/damage-calculator.js` → `Damage`
13. `data/conditions.js` → `CONDITIONS`, `ITEM_EFFECTS`
14. `data/battle-moves.js` → `BATTLE_MOVE_EFFECTS`
15. `engine/battle.js` → `Battle`
16. `game/random-team.js` → `RandomTeam`
17. `game/opponent-ai.js` → `OpponentAI`
18. `game/party.js` → `Party`
19. `game/evolution.js` → `Evolution`
20. `game/encounters.js` → `Encounters`
21. `ui/screen.js` → `Screen`
22. `ui/battle-screen.js` → `BattleScreen`
23. `ui/game.js` → `Game` (starts the game on load)

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
