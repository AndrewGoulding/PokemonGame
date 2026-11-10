# Unova battle facilities

Black Tower and White Treehollow are playable offline 2D challenges. Each has ten
areas with the source floor counts `1,1,1,1,1,2,3,2,3,4`: 19 floors per facility.
The authored floors contain three trainer searches, a Gate Trainer, an area boss,
a nurse and a retirement attendant. Source random DS room generation is adapted
to these walkable layouts; it is not emulated.

Opponents use pokebw2’s `black_tower` sets and trainer pools, filtered by the source
rank and version table in `src/ov127/infinity_dungeon_rooms.c`. Level ranges rise
from 47–50 to 74–77. Each trainer brings two Pokémon, with source moves, natures,
held items and EV flags, and source zero IVs. Seeded rosters, Gate Trainer identity,
defeated trainers and the once-per-area nurse persist in the save. Gate and area
progression cannot be bypassed through the floor exits. Items and field moves are
restricted during the run; loss restores the party and returns to reception.

Area 10 ends with Benga’s source level-80 team: Latios/Garchomp/Volcarona in Black
Tower, Latias/Dragonite/Volcarona in White Treehollow. Clearing each facility unlocks
its separate level-1 Shiny Gible or Dratini gift at Alder’s home. A full party does
not consume the reward. Both facilities are accessible through the research gate.

The generator imports all six source facility set catalogs and their usable
trainer pools. The completion checklist tracks the remaining formats.

## Subway, PWT and Institute

Gear Station offers seven-battle Singles and Doubles lines with separate saved
streaks, the normal 21-win bosses and Super 49-win bosses. A normal line’s 21-win
record unlocks its corresponding Super line. The source boss sets are assigned to
Ingo’s singles and Emmet’s doubles roles; generic opponent scheduling is adapted.
The last facility battle can be replayed locally from the Subway desk.

PWT’s additional stage attendant offers Driftveil, five regional Leaders, World
Leaders, Champions, Type Expert, Rental/Rental Master and Mix/Mix Master. These
run three level-50 Singles or Doubles battles with source trainer metadata, sets,
portraits, IVs and special ace sets. World Leaders requires a win in each regional
Leaders tournament, Champions requires ten World Leaders wins, and the Master
rental/mix formats require three wins in their basic format. Rental teams come
from the source rental catalog; Mix exchanges affect only temporary Pokémon.
The original level-25 story tournament retains its original progression.

The Institute offers five-battle Singles and Doubles trials using the source
Subway catalog, with local scoring based on wins and turns. Trial scoring, generic
opponent scheduling and facility BP awards are offline adaptations. Facility BP stays separate from other
regions, and the exchange has all 60 source BP items/TMs and source prices. TM
numbers are translated to the shared engine’s machines by move, so, for example,
the source Ally Switch offer teaches Ally Switch rather than a later TM51 move.

Entry rules reject Eggs, restricted legendary/event species, later species/forms,
duplicate species and duplicate held items. Native party selection chooses three
for Singles or four for Doubles. Temporary level-50 copies battle without Bag
items, gimmicks, experience or cash prizes. The original party, including its HP,
PP, held items, experience, and special fields, is restored after win, loss or
cancellation. Loading an interrupted challenge restores it and ends that Subway
streak. Native browser tests exercise entry, consecutive matches, restoration and
saved records.

Triple/Rotation battles, full multi-partner facility ladders, online/download
opponents and the original DS Institute scoring remain outside these formats.
The existing source partner tag event is still playable separately.

## Multi Trains

The basic and Super Multi Lines are seven-match native tag battles. Enter two
Pokémon and choose Rosa or Nate with a balanced, offense or defense pool. The
six source pools are the imported Subway catalog's trainer records 300–305;
the visible partner portraits/names use the chosen protagonist. A compatible
pair is drawn after entry, excluding your selected species and held items.
The partner controls their own moves and replacements using the shared engine's
AI. Each opponent is a separate trainer with two Pokémon and their own bench.
Basic battle 21 pairs Ingo's Galvantula/Durant with Emmet's Garbodor/Klinklang;
Super battle 49 pairs Eelektross/Archeops with Excadrill/Haxorus. These use the
source sets, including the basic bosses' shared Occa Berries across trainers.
Ordinary generated pairs avoid duplicate species/items across the pair.

The source `src/ov033/bsubway_trainers.c` now drives Singles, Doubles and Multi
streak-dependent trainer ranges and IV bands: normal first-six ranges
0–49/30–69/50–109 and final-car ranges 50–69/70–89; Super first-six ranges
110–159/140–179/160–199/180–219, final-car ranges
160–179/180–199/200–219/220–239, then 200–299. This prevents protagonist
partner pools from appearing as ordinary Super opponents. Boss records retain
their source teams. Partner choices and trainer draw RNG are local adaptations;
the DS partner-selection UI and wireless pairing are not emulated.

Multi and Super Multi retain separate saved streaks/bests/attempts. A basic
21-win record opens only Super Multi. The Multi Boss medal reads that record;
no Link Battle medal is awarded for playing with a local NPC. Rentals, level-50
copies, moves/PP, held items, HP and the exact original party continue through
the existing restoration and interrupted-save recovery. The last match remains
available for recorded playback. Triple/Rotation are described below. Online/download facilities remain pending.

`tests/unova-multi-test.js` runs 21 native model tag battles and checks all six
source partner pools, entry compatibility, exact boss teams, saved streaks,
unlocks and medals. `tests/browser/unova-multi.js` plays seven matches through
the native entry/battle UI with an AI partner and verifies saved records and
byte-for-byte restoration of the original party.

## Triple Battles

PWT tournaments now offer Singles, Doubles and Triples. Triple entry requires
six Pokémon and uses three active positions per side, with three decisions per
turn, ordinary bench replacements and the existing exact-party restoration.
All thirteen local tournament categories have playable six-member brackets.
Source rosters with fewer than six usable sets are excluded from Triple draws;
no invented Pokémon are appended to those undersized tables. Unrestricted
Driftveil/Mix rosters may repeat a species using distinct source sets, following
`WbtPartyFilter_Create`'s `allowSameSpecies` rule. Held items remain distinct.

Wing Pokémon reach the opposing center and nearby wing, plus their own center.
The center reaches every opponent and both allies. The source move `distance`
flag allows distant targets (Flying attacks and pulse moves, for example).
Spread attacks affect only adjacent Pokémon and retain native spread damage.
Redirection and Intimidate respect range; ally hooks and shared abilities can
see both neighbors of a center Pokémon. Two adjacent Friend Guards stack their
0.75× protection. The ordinary doubles/horde formats
retain their existing behavior.

SHIFT replaces the unusable RUN command on a Trainer battle's wing menu. It
uses that Pokémon's action to swap with the center, preserves PP, boosts,
Substitute and other state, and does not trigger entry hazards or switch-in
abilities. The last Pokémon of each side automatically moves to the center.
Ally Switch exchanges the two wings and fails from the center. The six sprites,
six readable healthboxes, target cursor and move previews use the same 2D style
as existing battles. The shared GBA animation player maps the participants of
an effect into its four animation slots and echoes additional spread targets;
it does not emulate the DS battle renderer.

The rental catalog now retains source file order. Normal rentals use files
1–132 and Master rentals use 209–558, matching the first source rental group.
Player rental IVs are 20 as in `WbtParty_CreateInitialParty`; opponents use their
trainer IVs, draw from the corresponding rental pool and exclude the player's
selected species. This corrects drawing rental teams from the trainer's
ordinary pool. The source's additional second/mixed rental-group selection UI
is not yet offered.

`tests/triples-test.js` verifies range/long-range/spread targeting, two adjacent
allies, invalid-target rejection, Shift state and action cost, final centering,
Ally support and Intimidate, exact seeded replay, 45 randomized/AI battles,
source rental pools/IVs/exclusions and six-member entry for every PWT category.
The browser test enters six Pokémon, renders all six, performs Shift, plays a
three-match bracket and checks recorded format and original-party/save recovery.
Online/download facilities remain pending.


## Rotation Battles

All thirteen PWT categories also offer four-member Rotation entry. Three Pokémon
are visible on each side, with one front Pokémon attacking and receiving attacks.
ROTATE selects either reserve and then opens that Pokémon’s move menu. The change
commits only with the attack and resolves before move priority. Rotating costs
no attack, preserves boosts, Substitute, status, PP and held items, and triggers
neither entry hazards nor entry abilities. Reserve status and volatile counters
pause while they are away from the front. The fourth Pokémon uses ordinary
switching. A reserve can move forward after the front faints without resetting
its state. Recorded playback retains the rotation choice and format.

Charles now uses his source Triple team in Black 2 and Rotation team in White 2,
with a short control lesson and a three-healthy-Pokémon requirement. Existing
Charles victory flags still open the drawbridge. Imported field trainer records
retain source Triple/Rotation formats rather than silently becoming Singles.

The engine tests cover planned rotations, pure move previews, invalid choices,
PP and state preservation, paused reserve poison, faint promotion, reserve move
reordering and 35 randomized/AI battles. The browser test exercises four-member
entry, six displayed roster members, ROTATE and move selection, a three-match
bracket, recorded format and original-party/save restoration.
