# Route 4 to Elesa

The BW2 campaign continues north of Castelia through Colress, Route 4,
Desert Resort, the accessible Relic Castle halls, Join Avenue and Nimbasa.
This chapter adds 17 authored 16-pixel maps, using the shared FireRed terrain
and buildings with bespoke coaster, runway, wheel and ruin scenery.

## Playable progression

Earn the Insect Badge, leave Castelia through its north gate, and battle
Colress (Magnemite 21 / Klink 23) to open the road. His Protein remains
claimable if your Bag is full. Desert exploration is optional: source wild
encounters, field trainers, Nurse Mariah and a walking/running quicksand pit.
The deeper Relic Castle excavation remains closed.

Visit the old coaster Gym in Nimbasa’s amusement park. Change the first track,
ride, defeat Rolan, change the upper track, ride again and speak to the hostess.
Then clear Nikola, Fleming and Ampère in order at the new runway Gym.
Elesa uses her Normal Mode source team: Emolga 28, Flaaffy 28 and Zebstrika 30
with its Sitrus Berry. The Bolt Badge raises the regional cap to 33 and rewards
Volt Switch through the game’s reusable machine catalog.

Optional content includes the source Rosa/Nate tag battle against Ingo and
Emmet, choosing the partner independently of the player’s appearance. All
six starter-dependent partner teams and the source trainer art are imported.
The Vs. Recorder and Gear Station replay this local battle. The full Battle
Subway lines are not included here. There are two daily sports practice
battles and a daily Rolan/Colette amusement-park battle followed by an adapted
wheel-ride scene; these do not reproduce the full DS sports/visitor calendars.
The apartments award the source Sun Stone and Soothe Bell.

Black 2’s Thursday Mandibuzz and White 2’s Monday Braviary appear on Route 4
at level 25 with their hidden abilities. Days use the game’s saved walking
clock. A loss permits retry; catching, defeating or fleeing consumes that day.

Join Avenue is an **offline starter adaptation**, with four recruitable local
shopkeepers, daily visitor referrals and three shop ranks. The Market and
Florist use the shared mart; Salon grooming increases friendship and the Café
heals the party. Local service prices and this referral model are authored,
not imported DS shop ranks/prices. The eight native shop families, online
visitors and full avenue economy remain future work.

## Provenance and verification

Built from `fuddlesworth/pokebw2` at the commit recorded in `UNOVA_DATA.source`.
The source checkout is read only. Event/text/encounter bank paths are recorded
per bank in `UNOVA_DATA.source.events`; trainer files supply teams, moves,
abilities, held items and class art. Shared battle rules and AI still apply.
Maps project the source locations into this game’s tile engine; they do not
interpret DS 3D models or execute the original script VM.

Rebuild with `node tools/build-unova.js /path/to/pokebw2` (Python Pillow and the
source Nitro readers are required for composed trainer frames).
`tests/unova-nimbasa-test.js` covers progression, loss/cancel/save/capacity,
partner variants, daily birds and services. `tests/browser/unova-nimbasa.js`
drives the native battles, coaster, runway, partner selection and saved reload.
