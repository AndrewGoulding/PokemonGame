# Ball Capsules and Resort villa

`tools/build-platinum.js` imports the seal values from
`src/applications/capsule_menu/main.c`, names from `ball_seal_names.json`, all
seven Sunyshore Market stocks from `include/data/mart_items.h`, and source
trainer capsule layouts from `res/trainers/ball_capsules.json`. The catalog
retains all 80 non-dummy IDs, including normally unobtainable unused effects;
49 ordinary Seals are sold on their original weekdays. Showing different
Unown forms to the Solaceon boy grants up to ten matching letter/punctuation
Seals, stopping at the source inventory limit.

Use the Seal Case from the Bag to edit twelve capsules, with eight Seals per
capsule and at most 99 copies of a type across inventory and placed Seals.
Removing a Seal returns that copy. Drag placements or use the movement buttons,
preview a burst, and assign a capsule to a party Pokémon. Assignments follow
that Pokémon into PC storage and Day-Care; reassignment removes the previous
owner after confirmation. Boxing with a capsule is allowed as a convenience.
Source trainer capsule coordinates are normalized around the source (190,70)
center. Battle send-outs and the editor use the same 2D glyph particles; these
are an adaptation of the DS particle effects, not an SPA/3D renderer. Turning
battle scenes off suppresses the battle particles. Capsules have no combat
benefits.

The Resort Area owner gives the Champion a villa and a free table. All twenty
furniture pieces retain the source prices in `villa/scripts.s`. The 2D room
uses fixed, accessible furniture spaces and newly drawn furniture patches.
Purchases persist and cannot be repeated. The bed heals; the PC desk opens the
normal storage menu; the TV repeats swarm reports and the clock shows game
time. Other furniture is decorative. The source visitor roster and dialogue
are imported, including paired visits; visiting happens on the walking clock
and uses the source furniture tiers (under eight, eight, twelve), visitor pool
sizes and probability test. Daily selection is stable across reloads.

Furniture unlocks retain the source record thresholds: victories in all five
Sinnoh Frontier facilities for the bust, a Frontier print for the silver bust,
ten Hall of Fame entries for the piano, fifty Battleground battles for the
guest set, fifty Berry plantings for the clock, thirty Egg hatches for the
masterpiece, and 300,000 walking steps for the chandelier. Frontier records
use `flags.sinnoh.frontier.victories` and `.prints` (1 silver, 2 gold).
Hall of Fame/step totals already exist. Earlier saves did not record lifetime
Berry plantings, hatches or Battleground battle totals, so those three counters
begin with this update; the game does not invent a past total from farming XP.

Validation: model tests cover finite inventory, 12×8 limits, party/PC/Day-Care
assignment, trainer seals, battle-set propagation, all furniture gates and
prices, reachable room interactions and saved state. Native browser tests cover
Bag entry, arranging/previewing capsules, an actual battle send-out, the deed,
paid furniture purchase, its map patch, resting, and saved ownership.
