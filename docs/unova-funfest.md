# Entralink, Funfest and Pass Powers

The six connected Entralink/Entree Forest/course maps are offline 2D adaptations
of Black 2 / White 2's wireless activities. Reach them from Aspertia or the
C-Gear after Cheren. Nothing requires an external server or another save.

## Imported source

Reference: `fuddlesworth/pokebw2` at
`588c0b937229f5c5cb7abad9bf8070dd2c7d97eb`.
`tools/lib/unova-funfest.js` imports all 55 mission records and four levels,
source goals/timers/rewards/flags, all 64 Pass Power records and descriptions,
80 mission shop offers, species lists and Lucky Power encounter weights.
The Pass Orb, mail and wing assets use source item art. Therian learnsets/cries
share their source species' data. Rebuild with `POKEBW2=/tmp/pokebw2 npm run build:unova`.

## Playable adaptation

The board runs saved timed missions for finding Pokémon, collecting items,
helping visitors, shopping/exchanging/giving items, fishing, hatching, trainer
battles, bells, rock-paper-scissors, memory and quizzes. Actual battles, catches,
items, money and Egg hatches resolve through the native game. Large cooperative
goals use local task bundles; hatching counts a cohort per actual hatch so three
practice Eggs can complete each level. Source goals remain visible. Local
missions finish at their target, including source missions whose multiplayer
session would continue. Placement, quiz content and task substitutions are authored.

Rewards are atomic and remain claimable with a full Bag. Wins grow the chosen
Black/White Entree tree, unlock subsequent levels and provide forest rescue
tickets. Both colors gate the source normal power unlocks. Ten clears across all
five families unlock special powers; all 55 missions unlock one charge of each
nonempty distribution power. This progression replaces wireless/distribution
requirements, and the local growth curve is adapted.

One paid timed Pass Power runs at a time. Source prices, durations and effect
values drive encounter frequency, rare encounter weights, EXP, prize money,
capture rate, mart discounts, friendship, hatching, rustling search and Grotto
regrowth. Instant HP/PP powers only charge on an actual effect. Timers use saved
real deadlines and continue while the game is closed. Normal play without an
active power keeps its prior behavior.

Forest tickets create deterministic, saved Hidden Ability rescues using the
source Grotto species pool. Befriend them in native battles with a supplied Dream
Ball; a full party and PC keep the waiting Pokémon. At 3/10/20 mission clears,
deep-forest research awards Therian Tornadus/Thundurus/Landorus at the source
badge-dependent Dream Radar levels. This is a local replacement for the external
3DS transfer, not a reproduction of Dream Radar. Landorus enables the existing
Reveal Glass quest and native form changes.

## Validation

`tests/unova-funfest-test.js` exercises all missions/four levels and action
families, source catalogs, reward capacity/reload, timers/unlocks, actual effect
math and deterministic rescue records. `tests/browser/unova-funfest.js` drives
the native C-Gear, board/tasks/rewards, Pass Powers and a forest capture/save.
The complete suite also checks the shared battle, breeding and other regions.
