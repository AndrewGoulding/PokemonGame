# Reversal Mountain and Giant Chasm variants

The importer keeps Reversal Mountain source zones 2–7 (Black 2) and 8–13
(White 2) as separate rooms. The existing entrance, exit and Heatran map names
remain valid for older saves. Three additional Black 2 rooms and six White 2
rooms expose their source doorway graph, encounters, field trainers and
pickups. The common entrance and Undella doors select the saved version.
Bianca's exploration guard and tag partnership cover every new room, and
both versions have the exit conversation and Heatran interaction.

Black 2 has water pools; White 2's solid lava pools use a downsampled original
`reversal_mountain_2/in81_magu01.png` texture. These are authored FireRed-style
2D projections, not exact DS room geometry or a 3D map renderer.

Giant Chasm now has its actual outer cave (zone 2), normal forest (zone 3)
and frozen forest (zone 4), followed by the existing inner cave and sanctum.
The frozen phase is active after the Shadow Triad is defeated and until
Ghetsis is beaten. Entrances follow that phase; an older save or a phase
change inside the forest moves the player to a safe square in its counterpart.
The normal forest retains its original map name and Hidden Grotto.

`game/unova-versioned.js` rewrites only entrances to marked alternative maps,
using immutable generated warp records. Repeated application restores the
correct version/phase without accumulating changes. `ui/unova-dungeons.js`
handles legacy saved locations before ordinary story guards. Source trainer
win flags and source item flags are shared across counterpart rooms; changing
version cannot farm another copy of a shared reward. Doctor Derek appears
in both calderas and uses the existing battle-once, heal-on-return service.

Totals after this pass: 352 maps, 689 trainer records, 131 encounter datasets,
355 visible and 182 hidden field placements (513 unique rewards). Twenty-seven
field banks remain unmapped, including the original Abyssal Ruins item layout,
four Frigate banks and parallel/legacy-world banks. Exact Frigate puzzles,
other version geometry and the original Black/White campaign remain separate
work in the completion checklist.

Validation: `tests/unova-versioned-test.js` exercises both versions and both
Chasm phases, the entire rewritten warp graph, all counterpart rooms, Bianca,
source bank bindings, shared rewards and saved-map recovery. The browser
scenario enters White 2 through an actual entrance warp, fights Doctor Derek,
collects a source pickup, changes to Black 2, restores the Chasm forest and
reloads the resulting save.
