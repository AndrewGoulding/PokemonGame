# Sinnoh Battle Frontier

After the Sinnoh League, the new Frontier entrance in Fight Area connects a
plaza to the Battle Tower, Factory, Arcade, Castle and Hall. Receptionists explain
rules, register a team, resume a saved challenge or retire its current streak.

## Source content

The importer reads Platinum's 950 ordinary Pokémon sets, all 315 Frontier trainer
records, trainer portraits and messages, and all 477 Hall sets from the separate
Hall archive. Species, moves, nature, EV flags/spreads, items and Hall forms/types
come from those records. Trainer ranges, final-opponent ranges, IV tiers, Factory
rental pools/upgrades, BP payout tables and the 41 BP prize prices are imported.
TM prizes resolve the actual source move into this game's machine catalog.

Palmer, Thorton, Dahlia and Darach appear at single-battle wins 21 and 49. Argenta
appears at Hall wins 50 and 170. The source fixed sets or randomized Brain pools
are used as appropriate. Silver/Gold Prints persist independently of losing a
streak and unlock the villa's print requirement. Completing a set in each facility
unlocks its other Frontier-related furnishing. Tower winners also receive the
Ability/Great Ability ribbons; 50-win double/multi entrants receive their matching
ribbons. These count toward Ribbon Syndicate membership.

## Facilities

- **Tower:** seven battles per set. Singles use three Pokémon, doubles four;
  species and held-item clauses apply. Pokémon above level 50 are lowered for the
  challenge. Local multi battles use two of your Pokémon and two source-set
  Pokémon from Cheryl, Riley, Mira, Marley or Buck against two trainers.
- **Factory:** select three rentals from six at level 50 or 100, then optionally
  exchange one rental for a defeated opponent's Pokémon after each win. Doubles
  also use three rentals. New sets offer a fresh six; source swap thresholds
  improve the initial offers. Rentals never enter the player's permanent party
  or PC. Species/item conflicts prevent invalid swaps.
- **Arcade:** a saved 4×4 board supplies all 32 source effects, including status,
  HP, items, levels, weather/Fog, Trick Room, cursor speed/randomization, team
  swaps, BP and skipped battles. Source round/battle availability and category
  weights determine its cells; previous battle performance changes the weights.
  No-battle events cannot bypass a Brain. Borrowed teams and temporary changes
  reset after the fight. Fog lowers ordinary accuracy and Defog clears it.
- **Castle:** source Castle Point scoring rewards surviving/healthy Pokémon,
  limited PP use and raised enemy levels. Buy HP, PP or full restoration; rent
  source-priced held items/Berries; unlock service ranks; scout identities,
  stats/moves; raise (+5) or lower (-5) opposing levels. Healing/information/item
  ranks control availability. CP and rentals belong to this challenge; damage and
  PP persist between battles, with no automatic healing.
- **Hall:** choose one Pokémon, or two of the same species for doubles, at least
  level 30. Select among the 17 source types and raise each rank to ten. Opponent
  group/rank/IV/type tables and the source level formula determine the matchup.
  Argenta uses the player's species group for Silver and the strongest group for
  Gold. Ten battles make a set. A completed type grid can continue at rank ten.

The plaza exchanges BP for the source prizes, displays facility records/prints,
and replays the last local recorded battle. The Vs. Recorder also opens a saved
Sinnoh recording from the Bag, with the older Hoenn recording as fallback.

## Adaptations and recovery

Battle rules run on this project's shared battle engine, including its modern
species, abilities and move behavior. The source Generation IV restricted list
and Hall type selections are preserved; this does not switch the entire engine
back to Generation IV. Original trainer AI bytecode, DS roulette graphics/timing,
Wi-Fi matchmaking and another human player's wireless party are not emulated.
Hall uses the local Frontier trainer roster. The roulette is a keyboard/touch
10-second device with the imported event tables and local cursor timing. Tower's
five partners provide an offline multi-battle option; no remote connection is
implied. Rooms and plaza are explicit 2D adaptations, not copied DS matrices.

`flags.sinnoh.frontier` stores BP, mode-specific current/best streaks, Prints,
set wins, Hall species/type ranks, active team, prepared opponent and facility
state. Preparing an opponent or board checkpoints it before choices, so reloading
cannot reroll it. Pausing between battles retains the entry. A backup of the
original party is saved before temporarily installing a challenge team for a
battle. Reloading during a battle restores that original party and forfeits the
interrupted streak. New Game Plus recovers a backup first. Capsule ownership also
recognizes the backup party. No Bag items, Exp., EV rewards or battle gimmicks
are allowed during Frontier battles.

Model validation covers all source catalogs, seven/ten-battle sets, both Prints
for all five facilities, doubles and Tower multi setup, Factory swaps, all 32
Arcade effects, Castle services and CP, source Fog/Defog behavior, BP purchases,
and interrupted-battle recovery. Native browser validation plays a Tower battle,
verifies party/Bag preservation and replay recording, resumes a saved challenge,
opens the Arcade board, and restores an interrupted temporary party.
