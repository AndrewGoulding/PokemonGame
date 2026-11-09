# Pokétch, Poké Radar and roaming Pokémon

The importer reads Platinum's 25 app IDs, reconstructs its Pokétch border from
PNG/NSCR/palette data, and imports the coupon and Radar item icons. Three
Jubilife clowns ask the source campaign's Pokémon questions; the president
exchanges their coupons for a usable Bag key item. Apps unlock in bundles
with Sinnoh badges and National Dex certification, an explicit adaptation of
the original individual NPC distribution. All 25 are available after research,
including the originally unreleased Stopwatch and Alarm Clock.

The watch is a local keyboard/touch interface. Its apps include working
arithmetic, saved memo strokes/notes and dot art, step and manual counters,
party/friendship/Day-Care displays, hidden-item signals, ripe Berry locations,
recent acquisition history, saved map pins and roaming positions, coin toss,
dual-type effectiveness, a marked calendar, a customizable roulette wheel,
Radar chain records, countdown, color palettes, breeding compatibility,
stopwatch/laps and an alarm. The Link Searcher reports nearby local trainers;
it does not claim to connect to wireless players. Calendar months use 30 game
days. Watch/alarm/calendar/pedometer use the walking clock; countdown and
stopwatch use elapsed real time and retain their saved deadlines/timestamps.
The touchscreen exception is scoped to this device; other menus retain the
existing gamepad controls. Notes, marks, app choice and records survive saving.

The Poké Radar is awarded with regional research certification. On foot in
Sinnoh grass it samples one tile from each of the source's four concentric
rings. Only valid grass becomes a visible shaking patch. Stepping onto a
patch starts an ordinary capture battle; winning/catching can continue the
chain and automatically refreshes patches. The source continuation rates are
88/68/48/28 percent from outer to inner ring, with a ten-point capture bonus.
Flashing patches use `1 / max(200, 8200 - 200 * chain)` and guarantee a shiny;
ordinary patches retain this engine's normal Gen 6 shiny roll. Hard shakes
use mapped source Radar-exclusive slots. Radar records also use the shared
held-item and lead-ability rules. Reuse requires fifty walking steps.
Bike/Surf, changing maps, walking away, unrelated battles and fleeing break
chains. Active chains reset on reload, while charge and the top three records
remain. The Trainer Counter app shows those records.

Roaming uses Platinum's 29-node adjacency graph and its 50% encounter check
when a roamer shares the player's map. Mesprit, Cresselia and the three birds
have saved locations. Normal travel moves them to adjacent nodes, with the
source 1/16 random relocation; map jumps/warps use random relocation. The
original north/south and east/west nodes are preserved even where this game
combines them onto one physical map, an explicit geometry adaptation. The
Marking Map reports each active position. Legacy saves receive positions
without replacing an existing Pokémon record.

Records are initialized on release and retain personality, IVs, shiny state,
HP, status and PP. Roamers try to flee at normal move priority in speed order.
A faster Mean Look, Block or Spider Web, or a valid trapping ability, prevents
escape; Ball actions happen before fleeing. Escaping moves the roamer to a new
route. Another Sinnoh League victory revives defeated uncaught roamers and
preserves an undefeated roamer's injuries. The shared engine now implements
the three trapping moves rather than allowing their formerly missing effects
to fail silently.

Defog also clears the northern Route 210 map's visual fog, in addition to
Lost Tower. Fog clearing follows the same persistent-map adaptation.

Runtime tests cover source graph movement, migration, injury persistence,
trapping, speed/capture order, coupons, app unlocks, calculator safety, type
matchups, timers, Radar rings/rates/records/shiny forcing/recharge and reload.
Browser checks exercise native route fleeing, all 25 watch screens, interactive
apps and the Bag-to-Radar-to-shaking-grass battle flow.

This milestone replaces compressed legacy encounter tables with full Platinum
land/Surf/rod data in 52 map mappings from 50 source banks, including the main
routes and mapped early caves/lakes. Combined Route 204 uses north/south
coordinate zones, and Route 211 uses west/east zones. Both original Pastoria
Marsh door tiles now enter the new reception; legacy interior saves recover
there instead of reaching an obsolete facility.
