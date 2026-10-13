# Pokémon Game

A browser Pokémon game built on a Gen 6 singles battle engine. Plain JavaScript,
no build step and no dependencies.

## Running it

Open `index.html` in a browser. It loads all the data and engine scripts, shows
how much data was loaded, and plays a sample battle.

To run the smoke test (needs Node.js):

```sh
npm test
```

## Layout

| Path | Contents |
|---|---|
| `data/` | Pokédex, moves, abilities, items, learnsets, natures, type chart, plus the battle hooks for conditions and moves |
| `engine/` | Stat calculator, damage calculator and battle engine |
| `assets/sprites/` | Pokémon sprites (front, back, shiny) and item icons |
| `tests/` | Smoke test that loads every script and runs a battle |

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
8. `engine/stat-calculator.js` → `Stats`
9. `engine/damage-calculator.js` → `Damage`
10. `data/conditions.js` → `CONDITIONS`, `ITEM_EFFECTS`
11. `data/battle-moves.js` → `BATTLE_MOVE_EFFECTS`
12. `engine/battle.js` → `Battle`

`index.html` is the source of truth for this order, and the smoke test reads its
script list from there. If you add a script, add it to `index.html`.

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

See the header comment in `engine/battle.js` for the full API.
