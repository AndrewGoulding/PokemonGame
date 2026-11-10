# Unova source field pickups and Dowsing Machine

This pass imports the pickup entries from source `global_7000.s` and
`global_8000.s` and matches their script IDs against the 172 mapped source
event banks. The source script-entry order, item constants, quantities and
flags are retained, including the original grid/rail coordinates. There are
279 visible placements and 153 hidden placements, representing 424 unique
one-time rewards. Eight visible placements share flags across adjacent/source
version maps and cannot award the same reward twice. The five existing opening
supply caches remain available separately for save compatibility.

TMs and HMs are translated by the source `TM_MOVE_LIST` in
`src/system/pml_item.c`, then matched to this game's reusable machines by move.
Matching a source TM number to the same runtime number would teach incorrect
moves in several cases. All imported quantities are one. The native pickup
paths enforce Bag capacity and leave the flag unset on failure.

Positions are projections onto the existing authored 2D layouts. Visible balls
occupy safe connected land, preserve the walkable component, avoid NPCs/warps
and retain a reachable approach. Hidden items stay on connected land. The
painter reserves hidden positions when placing trees and furniture, just as it
reserves visible actors. Five Dragonspiral rail positions use local placement
while preserving source rail metadata. Original DS sub-map Surf/Strength and
version-dependent geometry barriers are not inferred from item coordinates;
these projections use the campaign/map gates already implemented. The geometry
and remaining field-content audits therefore remain open.

Bianca at Castelia's north gate gives the source Dowsing Machine after Burgh,
with the source gate dialogue and icon. It can be registered and uses the native
Itemfinder behavior: face a nearby hidden item or collect it underfoot. Facing a hidden spot and pressing
A also works. Only successful discovery increments the
hidden-item medals, through either path. The C-Gear field journal reports
current-area progress and counts for previously visited areas. Flags and the
key item survive ordinary saves.

`field.unmapped` records 71 source event banks with 191 additional placements
that this pass does not project. This includes the original Abyssal Ruins
pickup layout; the existing four-floor ruins have their own separately
adapted treasure/pillar/current flow. The audit is deliberately retained and
is not treated as completed content.

Validation: `tests/unova-field-test.js` checks all 432 positions, items, shared
flags, quantities, source TM mappings, connected land/approaches, source Dowsing
gift, native hidden-item full-Bag retry/medals, journal and save persistence.
The browser test covers Bianca, a visible full-Bag retry, registered Dowsing,
A-button discovery, C-Gear journal and reload through the native UI.
