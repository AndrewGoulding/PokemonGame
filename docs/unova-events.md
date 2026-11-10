# Memory Link and offline event research

The reference is `fuddlesworth/pokebw2` at
`588c0b937229f5c5cb7abad9bf8070dd2c7d97eb`.
Rebuild with `POKEBW2=/tmp/pokebw2 npm run build:unova`.

## Eight Memory Link conversations

Historians at the relevant locations and the C-Gear's Memory archive open the
source conversations. They cover the Striaton brothers, Brycen/Alder/Marshal,
Lenora/Burgh/Clay, Elesa/Skyla, the inherited Prop Case, former Plasma members/N,
Iris/Drayden and N releasing his Pokémon in Chargestone Cave.

The importer reads `ActorMsg` and `ActorMsgVersioned` entries in source script
order from `striaton_city_10`, `floccesy_town_5`, `nacrene_city_11`,
`undella_town_5`, `musical_theater_3`, `driftveil_city_17`, `opelucid_city_12` and
`chargestone_cave_5`. It imports both version texts and the source event actors.
The chosen earlier hero replaces Memory Link's name placeholder. Existing
Hilbert/Hilda and starter choices, N's released encounters and Bianca's old team
remain integrated.

This is a conversation-card adaptation with source character sprites, a 2D
location backdrop, speaker emphasis and a past-time tint. It does not run the DS
camera, movement or flashback field VM. Local Badge/Champion and visited-location
gates stand in for the linked-save event flags. The C-Gear archive recalls
unlocked conversations from anywhere. Page progress, completed memories and
replays persist; pausing does not mark an unread scene complete or change the
party.

## Liberty Garden

Castelia's westernmost pier reaches three connected authored maps: Liberty
Garden, its lighthouse and Victini's former sanctuary. They use the corresponding
BW2 banks and source lore/return-event text. The island has no wild encounters.
The native layout tests check entrances, room access and NPC approaches.

Three local research records restore the sanctuary. Bring Victini back to the
room for its source return dialogue; the local visit also rests it and grants
one friendship increase. This is separate from receiving a new Victini.

## Research partners replacing distributions

The external Mystery Gift distribution service is not reproduced. Four authored
postgame research quests provide fateful, non-shiny, Cherish Ball partners, with
normal local Trainer ownership and a saved archive-research origin. These are
local rewards, not claims to reproduce an official event card, OT, date or IV set.
A full party keeps each reward available; none can be claimed twice.

- Victini, level 15: restore all three Liberty records and enter the Hall of Fame.
- Keldeo, level 50: recall N's farewell, catch the three swordsmen and enter the Hall of Fame; meet the Grove researcher.
- Meloetta, level 50: recall the Prop Case memory, perform all four Musicals and enter the Hall of Fame; meet the café researcher.
- Genesect, level 15: recall the Driftveil memory, restore three P2 Laboratory terminals and enter the Hall of Fame.

Their existing native move/form quests remain available: Relic Song in Castelia,
Dudley's source battle and version-specific Drives at P2 Laboratory, and Secret
Sword at Pledge Grove. The Grove tutor now follows BW2's actual script: **only
Keldeo is required**, rather than bringing all three other swordsmen. Learning
and forgetting Secret Sword update Ordinary/Resolute Form through the existing
native teaching and form-sync paths.

## Validation

`tests/unova-events-test.js` checks all eight scripts/actors/texts/gates,
paused/replayed/saved pages, all four quest requirements and capacity-safe gifts,
Dex/OT reception, no wild island encounters and repeat-safe Victini visits.
`tests/unova-services-test.js` covers solo Keldeo teaching and form changes.
`tests/browser/unova-events.js` drives the actual C-Gear archive, pause/reload and
completion, fateful Keldeo gift, native party/move-forgetting/Resolute flow, three
Liberty research sites, Victini's gift/home event and saved quest/party records.
