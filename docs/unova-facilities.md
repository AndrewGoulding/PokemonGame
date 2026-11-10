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
