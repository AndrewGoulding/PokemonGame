# Pokéstar movie productions

The original opening film remains at its director. A second soundstage producer
opens the full catalog, and a theater producer releases those productions.
The catalog contains all 41 BW2 movie records, including the archived alternate
Brycen-Man screen test. Source rentals and the player's optional performer are
copied into isolated native battles: filming never replaces the party, spends
its PP, consumes its Bag or causes a real blackout.

## Source import

Reference: `fuddlesworth/pokebw2` at
`588c0b937229f5c5cb7abad9bf8070dd2c7d97eb`.
`tools/lib/unova-movies.js` reads all `res/pokewood/movies/*/{movie,cast}.json`,
source titles/plots/missions in `pokewood_lines.txt`, both dialogue variants,
briefings, scenes, choices and source score values. It imports all sixteen used
SFX prop species plus the additional displayed costumes, their base stats,
types, abilities, sprites, learnsets and cries. `render-unova-movie-prop.py`
assembles the displayed costumes from their Nitro multi-cell idle frames; the
source static-image slots contain internal placeholders and are not used. The source's intentionally blank
Red Fog trainer portrait is omitted; the prop opponent remains visible.

Rental levels, moves, IVs, EVs, nature, gender, items and abilities follow their
cast records. Raw IV values remain in the dataset; runtime IVs use the source
five-bit mask. This matters for Beartic's raw HP IV of 252 and Slaking's 255.
All props remain confined to the movie casts; they are not wild encounters or
part of regional/national research goals.

Rebuild with `POKEBW2=/tmp/pokebw2 npm run build:unova`.

## Playable goals and progression

Movie battles attach their own rules, following `CheckScriptedBattleRules` in
`btl_server_flow_sub.c`. They support all nine rule types: consecutive knockouts,
defeating all opponents, finishing a target with a specific move, defeating a
particular target, avoiding other targets, sparing a target, survival and
intentional defeat. Eight rule types occur in these 41 records. Turn limits
terminate unsuccessful takes. The same rules attach when recorded battles replay.
Normal battles retain their existing win conditions.

The catalog shows the source plot and mission, offers script reading, and plays
source dialogue and choices between battle turns. Productions save an unreleased
draft, records, ending collections, releases, box-office totals and the last
battle replay. A completed opening premiere migrates into these records.

After the first release, each series' first episode is available. Good endings
unlock sequels and the use of one's own Pokémon; completing the first 39 films
with good endings unlocks Brycen-Man Strikes Back Harder. The alternate screen
test is available as an archive. These catalog gates replace the DS field-event
unlock script. Premieres produce a local score/box-office result and once-daily,
capacity-safe fan gifts. No box-office money is added to the player's wallet.

The DS event VM, camera, cut-ins, costumes on the protagonist, authored opponent
move-control scripts and sound banks are not emulated. Opponents follow a local
deterministic move cycle. Scene conditions are simplified to turn-based dialogue;
endings combine the actual battle mission with the source dialogue choice points
(good, bad or strange). Scoring, box office and fan rewards are local adaptations,
not claims of exact DS movie grading. The native moves/battles use the project's
shared mechanics. Full source music and final fidelity audits remain separate.

## Validation

`tests/unova-movies-test.js` starts and terminates all 41 source casts in native
battles; checks every rule, required moves, protected targets, survival, deliberate
loss, props/art/cries, IV masks, sequels, premieres, capacity and saved drafts.
`tests/browser/unova-movies.js` drives catalog/script dialogue and the opening's
two knockouts, releases its premiere, then succeeds in Full Metal Cop by letting
the rental faint. It verifies migration, fan gifts, original-party preservation
and save/reload. `tests/browser/unova-movie-prop.js` also checks the actual UFO
render, displayed name, rental and Zap Cannon rule. The full regression suite
checks the shared UI and other regions.
