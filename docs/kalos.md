# Kalos · X/Y opening

Speak to the **Kalos researcher in Sinnoh’s Fight Area**, beside the Unova researcher, and choose Pokémon X or Y. The opening starts at home in Vaniville. The travel guide in Vaniville returns to Fight Area; returning to Kalos restores its saved position and healing spot.

This first segment reaches **Viola’s Bug Badge**. It includes 16 connected maps: Vaniville/home, Route 1, Aquacorde/rest house/shop, Route 2, Santalune Forest, Route 3, Santalune/Center/school, the Gym gallery and spiderweb, an optional Route 22 grass area, and the Route 4 entrance. Outdoor tiles use the existing regional style; small interiors avoid oversized empty rooms. The Town Map shows this playable area.

Choose Chespin, Fennekin or Froakie from Tierno, battle Shauna’s weaker starter, deliver Sycamore’s letter to Mom, receive the Town Map, then learn about catching on Route 2. The catching demonstration is narrated; it does not create a captured Pokémon in your party or Pokédex. Austin guards progress into the forest. Shauna heals your team there; meet the friends by the northern exit to continue. Forest/Route 3 trainers can be encountered normally. Battle Rinka for Roller Skates, then follow the visible silk and dew through Viola’s Gym. Bug Badge raises the regional cap from 12 to 25; Viola awards Infestation, and Alexa awards Exp. Share (recognizing an already-owned copy). The school supplies X Attacks/X Defenses and status lessons. Centers support healing, storage and shopping; Aquacorde has a healing house rather than an invented Pokémon Center.

Roller Skates toggle from the Key Items pocket (or Select after registering them) and enable running-speed movement outdoors in Kalos. They use this engine’s grid movement and walking avatar; X/Y’s analog skating, tricks and character animation are not implemented. Indoors, surfing and other regions retain their normal movement rules.

Progress lives in `flags.kalos`, with `Kalos…` maps, `XY_…` trainer flags and `kalos-…` badges. Party, boxes, money, Bag and Pokédex remain shared, matching other regions. Other campaign flags and starters are retained. Starter and wild moves, battle level-up learning, and Rare Candy learning use X/Y level-up data while in Kalos. Existing regional learnsets are left intact. Kalos has its own blackout/healing destinations and field-move badge requirements.

## Data and rebuilding

- `tools/data/kalos-xy.json` is an offline snapshot of veekun/pokedex at `cc483e1877f22b8c19ac27ec0ff5fafd09c5cd5b`. It contains 721 X/Y level-up learnsets and X/Y walking encounter slots/levels/weights for the four opening areas. Kalos sampling uses this engine’s rate of 20, an adaptation rather than an imported XY encounter rate.
- `tools/import-kalos.py /path/to/csv-directory` regenerates the snapshot from `kalos-pokemon_species_names.csv`, `kalos-move_names.csv`, `kalos-pokemon_moves.csv`, `kalos-encounter_slots.csv` and `kalos-xy_encounters.csv` (the upstream `encounters.csv`). Download from the pinned repository’s `pokedex/data/csv/` directory. Source file hashes are retained.
- Trainer rosters, genders, levels, Shauna’s matchup, Viola’s explicit moves/abilities, gifts and opening order are curated from the linked Bulbapedia walkthrough/Gym references recorded in the generated data. Unspecified early trainer moves use the imported X/Y level-up learnset. Generic dialogue and trainer IVs use this project’s defaults; this is not an extracted XY script interpreter.
- `python tools/import-kalos-cries.py` imports the early Gen VI species’ cries from pinned PokeAPI/cries commit `b3a9044bb839b5e3152aaa536c7b463a0fcf0140`, with hashes. Existing older species retain the shared audio resources.
- `npm run build:kalos` rebuilds maps, the opening Town Map and `data/kalos.js` offline from the checked-in snapshots. Map geometry and the spiderweb are authored 2D adaptations, not extracted 3DS geometry. Existing FireRed tiles/music, B2/W2 overworld actors and generic trainer portraits are temporary stand-ins, not original X/Y character art or music.

## Next segment and limits

Route 4’s entrance clearly marks the current boundary. Lumiose, Sycamore’s lab/Kanto starter, the rest of Route 4 and Route 22, the remaining Gyms/League, Team Flare, Mega Evolution story unlocks, Pokémon-Amie, Super Training, PSS, clothes, cafés, rides, regional Vivillon patterns, and the Farfetch’d trade remain to be added. No complete X/Y source checkout was available; this opening does not claim a full game import.

## Validation

`npm test` includes all three starters in both versions through Viola, loss/reward retries, capacity/cancellation, save round trips, independent BW/BW2 progress, source encounters/learnsets, reciprocal unique warps, and reachability of every exit and NPC while treating standing people as obstacles. `tests/browser/kalos-opening.js` exercises native entry, choices, battles, rewards, Center healing, reload and return travel with keyboard input. `tests/browser/kalos-field.js` verifies a walking encounter/capture, a native Route 1 warp and the full spiderweb walk past standing trainers. `tests/browser/kalos-skates.js` verifies Bag Use, Select toggling and indoor/other-region suspension. Browser tests use the existing Playwright setup documented by the other regional tests.
