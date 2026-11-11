# Paired versions as unified regional campaigns

The game does not ask for an X/Y or Black/White edition at regional entry.
Unova retains the **original BW and BW2 story choice** because BW2 is a sequel,
not an alternate version of the same story. Each story still has separate save
flags and independent completion.

On first arrival/resume after this update, `mergedVersions` is recorded in
`flags.kalos`, `flags.unovaBW`, or `flags.unova`. Both edition encounter
tables are combined with positive weights for originally exclusive species.
Route 5 in Kalos also merges both source horde compositions. The old
`version` field is retained solely as a deterministic story/cutscene baseline
and to load older saves safely; players never choose it in the UI.

In Kalos, the main Flare climax retains the legacy save's Xerneas/Yveltal
storyline; the other legendary appears in Sea Spirit's Den after the Kalos
Championship. In original BW, the original Castle dragon remains the mandatory
story encounter; its counterpart can be encountered in Nuvema after defeating
Alder. Both original BW Black City and White Forest are accessible in unified
mode. Existing captures are retained, and the new bonus captures persist.

This is a functional content merge, not an attempt to merge contradictory
cinematic scripts into the same scene. Alternative BW2 geography/music, source
NPC behaviors and other versioned scripts keep a deterministic layout where
simultaneously displaying both would break navigation. Further audits can
surface additional edition-only NPC or location events without a version menu.

Tests: `node tests/merged-versions-test.js`. The existing source-version unit
tests still exercise legacy saves that have not used the unified travel guide.

Kalos's Charmander gift now supplies both Charizardite X and Charizardite Y
in unified mode. Later-route horde tables merge their X/Y-exclusive groups.
The Kiloude type quiz alternates the two species by the game clock day.
