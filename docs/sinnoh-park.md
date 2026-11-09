# Pal Park Catching Show

The Catching Show uses Platinum's `catching_show` data for all 493 species,
including habitat, encounter weight, catching points and original types. The
importer reads the scoring rules and Berry prize groups from `catching_show.c`
and `pal_park_lobby/scripts.s`. The playable 64×64 garden is an authored 2D map,
with the source four quadrants and separate grass/water areas. Surf is needed
for water habitats. Old Pal Park map saves and the old outdoor connections lead
to the new lobby.

This browser game has no GBA cartridge transfer interface. Its offline practice
show selects six eligible Pokémon already in the PC: non-Egg, non-Shadow species
from generations one through three, including their supported Gen 3 forms. The
selection screen explains the practice rules. It moves the original records
into a saved reserve, rather than manufacturing or permanently replacing any
Pokémon. The saved reserve resumes after a reload. Finishing, retiring, escaping the
area, or starting New Game+ restores those records. Their names, Trainer data,
language, held items, moves, training, forms and original Balls stay intact.
Original PC slots are preferred; if an unusual full-PC state prevents recovery,
unreturned records remain saved until space exists, including across New Game+. Capsule ownership also
includes Pokémon temporarily reserved for a show.

An encounter roll occurs every five to fourteen walking steps. Only uncaught
entrants in the current habitat are eligible; their source rarity weights share
a pool with the source no-encounter weight of twenty. The native battle screen
shows Park Balls and only Ball/Run choices. A Park Ball always catches and
running consumes no Ball; Pokémon do not attack. Existing Safari modes retain
their own Bait/Mud/Pokéblock actions and catching rules. The show never changes
the selected records through battle synchronization and awards no experience.

After all six catches, scoring adds source catching points, two time points per
remaining second out of 1,000, 200 for consecutive catches sharing no original
type, and 50 for each distinct type. The four source Berry prize tiers use
3,000/3,300/3,500 thresholds. Best score and completed shows persist. Full Bags
retain a pending prize; the next show waits for it to be collected. Entry and
captures checkpoint the reserve so a browser reload can resume safely. The
normal Safari Start menu's Retire option also works here.

The lobby's offline keepsake counter offers the source GBA-slot gifts without
pretending to detect a cartridge: Crown, Tiara, Underground, Seafloor and Sky
backdrops. Backdrops are unique; accessories use the shared collection limit.
The backdrops feed the Super Contest collection.

Validation covers every habitat, weighted encounters, Gen 3 eligibility,
selection atomicity, scoring, prize tiers, interruption/reload/full-PC recovery,
original record equality, capsule ownership, and native Park Ball/Run engine
rules. The browser test drives selection, a Run attempt, six native captures,
a reload after the second capture, score/prize presentation and exact saved PC
record restoration. Existing region and Safari regression suites also run.
