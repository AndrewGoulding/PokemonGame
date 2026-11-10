# Unova dungeon alignment and remaining rooms

This pass adds 28 authored 2D rooms and aligns 54 primary zone references with
pokebw2 commit `588c0b937229f5c5cb7abad9bf8070dd2c7d97eb`. The source is
`res/field/zones`, `res/field/events`, `res/field/encounters` and each bank’s
script/text. `dungeons.bindings` records every zone and encounter archive;
`dungeons.edges` records added connections and their source bank pairs.
Entrances and existing save map names remain usable. The native room shapes
are projections; the existing coarse campaign routes remain alongside the
new source connections, rather than claiming to reproduce every DS tile,
cliff and conditional door.

Chargestone’s three active floors are zones 2/3/4. Celestial Tower’s first floor
is zone 2 with no encounters, its middle floors are 3/4/5, and the bell deck is
the base zone. Mistralton Cave now has its missing second floor, with Guidance
Chamber’s own third-floor bank and encounter archive. Source event-bank names
and encounter-archive names differ in these places; matching their numeric
suffixes alone placed parties/items on the wrong floor or omitted wild tables.
The bindings now use the zone header’s actual encounter reference.

The expansion includes the PWT branch of Relic Passage, five deeper Relic
Castle chambers, N’s playroom, Dragonspiral’s missing upper stair, four Twist
Mountain caverns, Clay Tunnel’s deep workings, seven Victory Road rooms and
seven Strange House rooms. Twist Mountain’s entrance/courtyard/Ice Rock have
no land encounter table; its four caverns do. The magnetic and Ice Rock
landmarks retain their existing evolution behavior. N’s entrance/corridor and
throne retain their old save names. Source doors connect the haunted house’s
wings and side rooms; the existing Lunar Wing/book event remains available.

BW2’s active Victory Road interior banks are 17–26, while 2–15 are empty older
rooms. The old four-map route now uses the proper active banks, with the
forest, eastern paths, caves and castle approach connected around it. The
first League path keeps its Ghetsis/Badge gates, and the castle approach keeps
its postgame gate. Source Trainer parties and field items are imported across
these active banks. The regional total is now 341 maps, 673 Trainer records,
and 120 seasonal/version encounter datasets.

Indoor areas with source wild tables now enable actual walking encounters,
including Celestial Tower and Strange House. A table in the dataset alone
was insufficient when every floor tile’s encounter bit was zero. Empty floors
stay quiet; warps are excluded from the added encounter mask. Changing to a
version with no land/water/fishing slots clears the old runtime table rather
than retaining the previously selected version’s encounters.

Five source healers now battle once and restore the entire party on later
visits: Doctor Kit, Nurse Dixie, Doctor Braid, Doctor Logan and Nurse Carol.
Losing or cancelling does not unlock care. Previously saved wins remain valid.
The four deferred Route 20 Rangers and sewer Janitor Brady are now available
after the Hall of Fame; they stay invisible during the opening campaign.
There are no remaining deferred entries from the original field-Trainer pass.
This does not assert that every optional Trainer’s scripted gift is imported.

The field dataset now contains 333 visible and 171 hidden placements, with
489 distinct one-time flags. Forty visible and sixteen hidden placements were
added by this pass. Existing collected flags survive the floor corrections.
Remaining work includes versioned Reversal Mountain/Giant Chasm/Frigate rooms,
the original Abyssal pickup layout, parallel-world banks, remaining gifts and
exact conditional/version geometry. These remain on the completion checklist.

Validation: the model test verifies all bindings, active/quiet floors, real
native encounter rolls, source doorway edges, evolution landmarks, late-Trainer
visibility, Doctor/Nurse loss/cancel/repeat/save behavior and stale-version
protection. The general map test checks the full 341-map graph and all NPC
approaches; the field test checks all 504 placements. The browser test defeats
and revisits Doctor Kit, battles a newly imported Victory Road Trainer, collects
a new source pickup, walks into an actual Celestial Tower wild battle, finishes
it, and verifies saved flags after reload. The full automated suite passes.
