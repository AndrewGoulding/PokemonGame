# Pokémon Musical and daily sports

These are playable offline 2D activities using the BW2 reference checkout
`fuddlesworth/pokebw2` at `588c0b937229f5c5cb7abad9bf8070dd2c7d97eb`.
Rebuild with `POKEBW2=/tmp/pokebw2 npm run build:unova`.

## Pokémon Musical

Nimbasa's theater has a lobby, wardrobe collector and connected stage. Enter a
party Pokémon in Stardom, Forest Stroll, A Sweet Soirée or Exciting Nimbasa.
The dressing room previews the Pokémon and its props; it supports the source
nine equip positions, flag restrictions, unique props and eight-prop limit.
A performance never borrows or modifies the player's actual party records.

The importer reads all 100 prop names, textures, equip flags, kinds and effects
from `res/graphics/musical_item/101.bin` and `scrcmd_musical.txt`, the 15 initial
props from `musical_savedata.c`, and all four source programs and NPC pools.
Source theme points, random bonus distribution and integer shares per prop kind
follow `musical_program.c`. Eligible NPCs use the source minimum-photo thresholds,
with the local show count standing in for shots. Saved applause and the seven
source 40-prop gift lists drive audience gifts using `musical_event.c`.

The DS stage choreography is replaced by an eight-cue performance. Each hand
prop may be used once; spotlight cues double its theme share. Placement markers
are approximate on ordinary battle sprites, and the local performance is turn
based rather than a music/rhythm interpreter. Stage music currently reuses the
region's existing music. Source DS choreography, sound banks and wireless
performances are not emulated.

Shows, applause, best scores, top performances, wardrobe and twelve finale photos
persist in the save. Performances can pause and resume without double awards.
After playing all four programs, a daily collector shares a missing prop so the
entire case remains obtainable offline, including special-distribution props.
The collector is an authored replacement for unavailable distribution requirements.

## Stadium and court

All 132 trainer table entries from `res/field/stadium/trainers.json` compile to
source trainer teams, names, moves, items, abilities, portraits and overworld
sprites. Three athletic groups appear for each day's sport; later stages add
source Backers, and the Champion tier adds a rotating selection from the source
52-visitor pool. Four native progression tiers and the local day select rosters.

Talk to the athletes/visitors on the grounds to battle. Singles and the Backers'
doubles use native battles, EXP and prize money. A win is recorded once per
trainer per game day; losses remain retryable. The rosters rotate without
needing a new game and records survive reload. The sport schedule, local badge
tier mapping and visitor rotation are authored; source match-hour closures and
exact DS placement scripts are not reproduced. The earlier introductory practice
NPCs remain available as separate warmups.

## Validation

`tests/unova-activities-test.js` checks catalogs/assets, wardrobe restrictions,
source theme totals and NPC pools, repeat prevention, saved paused performances,
finales/awards/collection, all roster tiers and daily rematch records.
`tests/browser/unova-activities.js` drives native party entry, actual prop
selection and preview, all performance cues, a stadium battle and save/reload.
The complete regression suite checks other regions and Unova campaign progress.
