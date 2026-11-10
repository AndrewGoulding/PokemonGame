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

The generator also imports all six source facility set catalogs and their usable
trainer pools for subsequent PWT, Subway and Institute work. That data import does
not yet make those formats playable. Existing opening Driftveil PWT and Subway tag
event remain available. The completion checklist tracks the remaining work.
