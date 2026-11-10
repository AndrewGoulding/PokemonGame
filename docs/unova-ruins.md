# Abyssal Ruins source treasures

The existing four-floor Dive excursion now imports all 45 item-ball placements
from `abyssal_ruins_5`, `_6` and `_7`: 26 on 1F, 11 on 2F and eight on 3F.
Their source event IDs, pickup scripts, item constants, flags and original
coordinates are retained. As with other imported field items, the importer
projects them onto reachable tiles in the existing authored 2D maze.

The source contains 14 Plates and repeated quantities of the six lesser relic
items. The original adaptation instead offered one of each of 16 Plates and
six relic types. Its item balls on 1F–3F have been replaced, rather than left
as duplicate rewards. The 4F Relic Crown and its existing script remain.
Dive, the first-pillar time limit, Flash/Strength gates, the 500-step current
and treasure collector prices are unchanged.

Older saves migrate 20 previously awarded treasure types to a matching source
pickup flag, without adding or removing inventory or changing money. The
migration also recognizes items already sold to collectors and remains safe
to repeat. Previously awarded Splash and Draco Plates stay in the Bag or in
the old reward history; they have no matching source pickup in these three
banks, so unrelated source treasures are not marked collected on their behalf.
An old save that earned all 22 earlier non-Crown rewards has 25 remaining
source placements to explore, while a new save starts with all 45.

After this pass, the field importer covers 236 source event banks and produces
400 visible/182 hidden placements, representing 558 unique one-time rewards.
Twenty-four field banks remain: four Frigate banks and parallel/legacy-world
banks. Remaining source gifts and campaign differences still require their
own audit.

`tests/unova-ruins-test.js` checks source counts, all legacy transfers, retained
inventory, sold rewards, saves and the existing pillar/current behavior.
`tests/unova-field-test.js` checks item approaches and connected walkable tiles
across every imported item map. The browser scenario checks a migrated ball
is hidden, retries a full-Bag pickup, collects a deeper source relic, obtains
the retained Crown and reloads the save.
