# Unova music

Unova now uses original Black/White sequences, instruments and samples for its
shared music instead of asking other regions' themes to stand in for them.
The available reference is squiddonaut/pokeblack at commit
`67d91a78b16caccbd4fbecdddf8a74c823d208a6`,
`files/wb_sound_data.sdat`. The generated archive records its SHA-256 hash.
`node tools/build-unova-audio.js /path/to/pokeblack` reproduces the import.

The archive supplies 204 music/jingle entries, 203 sequences and 603 distinct
sample payloads. Playback-identical samples repeated in different song banks
are deduplicated while each instrument keeps its own envelope, tuning and
pan. This reduces the generated library from approximately 49 MB to 11.8 MB.
It loads only when Unova music is requested. The existing DS sound player
renders its PCM, ADPCM, PSG and noise instruments. Rendered score caching is
bounded to 128 MiB, retaining a single longer current score when necessary.

`tools/lib/unova-audio.js` binds all 369 imported maps to the BW2 zone headers'
requested music. Source-backed shared requests use the original BW archive;
seasonal route/Undella arrangements and versioned Opelucid music follow the
saved season and version. Synthetic annexes inherit their connected area's
music, with explicit Center, house and facility overrides. The binding keeps
its requested sequence, selected track and inheritance/substitution record.

The BW2 source checkout does not include its sound archive. BW2-exclusive
songs and revisions therefore have labeled BW1 substitutes, including the new
opening towns, Frigate, PWT and other new venues. An `exact` binding means the
requested sequence name exists in the available BW1 archive; it does not
claim a separate BW2 recording or exact hardware mixing. Dynamic musician
layers and every DS battle-music transition are still source-audit work.

The regional audio router now recognizes Unova for ordinary battle, victory,
cycling, Surf, healing and item/Badge jingle requests. Campaign Gym, Elite Four,
Champion, Plasma, N and rival battles choose the available corresponding Gen V
theme; Colress/Iris and other BW2-exclusive differences use declared shared
substitutes. Jingles play to their native end and restore the prior score.
Changing the field's season does not interrupt an active battle theme.
Kanto, Johto, Hoenn and Sinnoh keep their existing routing.

Validation: `tests/unova-audio-test.js` checks every map/season/version binding,
all score/bank references, source provenance, battle selection, isolated
regions and audible bounded DS rendering. The shared smoke test validates the
new song namespace. The browser scenario checks real WebAudio lazy loading,
summer/winter arrangements, battle aliases, full jingle playback/restoration,
White Opelucid, Kanto/Johto/Unova switching and mono/stereo operation.
