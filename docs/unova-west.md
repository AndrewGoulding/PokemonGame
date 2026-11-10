# Driftveil to Skyla

The BW2 campaign continues west from Nimbasa to Route 5, Driftveil Drawbridge,
Driftveil, Route 6, Chargestone Cave, Mistralton and Route 7/Celestial Tower.
Thirty new authored maps use the shared terrain/building renderer, with mine
rails, charged crystals, wind shelters, memorial stones and an airfield.

Clay’s Normal Mode team is Krokorok 31, Sandslash 31 and Excadrill 33. All seven
source Gym workers are playable across three adapted mine platforms; each
lift requires its workers. Clay awards the Quake Badge, Bulldoze and cap 39.
The Driftveil Tournament follows: bring three Pokémon, choose their order,
and win three singles rounds against Hugh, Cheren and Colress. Own teams are
set to level 25 and fully restored after winning, losing or cancelling;
interrupted saves recover the original party. Cheren/Colress use the source
Driftveil facility sets (`pwt_regular/trainers/trainer_58.json` and `59.json`).
Hugh uses his starter-dependent campaign team scaled to 25. This is the
opening tournament adaptation, not the full PWT catalog or native bracket.

Help Hugh and Cheren repel Plasma through two singles and two source tag battles at the dock after the tournament to continue along
Route 6. Cheren gives Surf; Bianca gives Fly on Route 5. N’s fixed-IV Hasty
Zorua (level 25) is available after Rood’s battle. The seasonal lab gives its
level-30 hidden-ability Deerling. Both gifts require an open party slot and
remain available on refusal or full capacity. Explore Mistralton Cave and
Guidance Chamber, the deeper Relic Passage and Volcarona’s sanctuary. Volcarona
is level 35 initially; defeating it unlocks a level-65 postgame retry.

Skyla’s Gym uses five source pilots and three adapted wind-shelter crossings.
Choose shelter to cross safely; running into the gust pushes you back. The
Normal Mode team is Swoobat 37, Skarmory 37 and Swanna 39. Skyla awards the Jet
Badge, Acrobatics and cap 48. Celestial Tower’s bell is optional in this BW2
path; ringing it rests the party. Juniper supplies the source Master Ball.

The chapter is an offline 2D projection of BW2 locations/events. Charles’s
rotation/triple encounter uses the existing singles battle engine. Mine lifts,
wind timing and cave layouts are authored tile-engine equivalents; this does
not execute the DS map/script VM. Music and battle AI use existing shared
systems. Full PWT formats, triple/rotation battle support and native facility
rules remain outside this chapter.

Rebuild with `node tools/build-unova.js /path/to/pokebw2`. See
`UNOVA_DATA.source` for the exact source revision and event/text/encounter
provenance. `tests/unova-west-test.js` covers source teams, gates, retry/cancel,
capacity, gifts, caps, save and tournament-party recovery.
`tests/browser/unova-west.js` plays the native Gym and tournament flows.
